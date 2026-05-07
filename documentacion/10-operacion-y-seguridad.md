# 10 — Operación, seguridad y continuidad del servicio

## 1. Objetivo

Documentar **cómo** se opera el sistema en producción: accesos, monitoreo, respaldos, respuesta a incidentes, política de seguridad y proceso de control de cambios, sin exponer secretos. Alineado con ISO/IEC 27001:2022 y ISO 9001:2015 §8.5.6.

---

## 2. Política de seguridad de la información (ISO 27001 A.5.1) — F-06

### 2.1 Declaración de política

El sistema Calzatura Vilchez gestiona datos personales (nombre, DNI, dirección, correo electrónico) y datos financieros (costos, márgenes, pagos). La política de seguridad establece:

1. **Confidencialidad:** Solo personal autorizado (roles `trabajador` y `admin`) accede a datos de clientes y finanzas. La tienda pública solo expone datos sin PII.
2. **Integridad:** Toda modificación de datos queda registrada en la tabla `auditoria` con usuario, timestamp y campos afectados.
3. **Disponibilidad:** El sistema tolera la caída del servicio de IA (predicciones) sin afectar el comercio electrónico. El fallback heurístico garantiza que nunca se retorne un error sin respuesta al administrador.
4. **Mínimo privilegio:** Las RPCs de PostgreSQL usan `REVOKE ALL FROM PUBLIC; GRANT EXECUTE TO authenticated`. La anon key de Supabase no tiene acceso a tablas de auditoría ni finanzas.
5. **Cifrado en tránsito:** Todas las comunicaciones usan HTTPS (Firebase Hosting, Supabase, Render, Cloudinary, Stripe).
6. **Protección de PII:** Los DNI se almacenan como hash SHA-256 (`dni_hash`). La columna `dni` en texto claro está en proceso de eliminación (ver migración `20260504230000`).

### 2.2 Responsabilidades

| Rol | Responsabilidades de seguridad |
|-----|-------------------------------|
| Owner / Desarrollador | Rotar secretos, aprobar migraciones, revisar `npm audit` mensualmente |
| Admin del sistema | No compartir credenciales, reportar anomalías en acceso |
| Trabajador | Usar solo las funciones asignadas al rol, no acceder a rutas de admin |

### 2.3 Gestión de secretos (F-01)

- **Regla obligatoria:** ninguna clave, token o anon key va hardcodeada en el código fuente. Usar exclusivamente variables de entorno (`VITE_*` para frontend, variables de Railway/Render para backend).
- **Almacenamiento local:** `.env.local` en la máquina del desarrollador (archivo ignorado por `.gitignore`).
- **Almacenamiento en producción:** Firebase Hosting → variables de entorno en `firebase.json`; Railway → panel de variables de entorno.
- **Rotación:** cada 6 meses o inmediatamente ante sospecha de fuga.
- **Prohibido:** subir `serviceAccountKey.json`, `SUPABASE_SERVICE_KEY`, `AI_SERVICE_BEARER_TOKEN` a cualquier repositorio o sistema de chat.

---

## 3. Proceso de control de cambios (ISO 9001 §8.5.6) — F-07

Todo cambio al sistema que afecte la base de datos, la lógica de negocio o la seguridad sigue este proceso:

### 3.1 Tipos de cambio y nivel de aprobación

| Tipo | Ejemplos | Aprobación requerida |
|------|----------|----------------------|
| **Estándar** | Corrección de texto, ajuste de estilos CSS | Desarrollador (merge directo a `main`) |
| **Normal** | Nueva feature, nueva migración SQL, cambio de dependencia | Desarrollador + revisión de la migración en entorno local |
| **Mayor** | Cambio de esquema con datos existentes, rotación de claves, cambio de proveedor | Desarrollador + validación en Supabase staging + backup previo |
| **Emergencia** | Vulnerabilidad activa, fallo de producción crítico | Acción inmediata + registro post-incidente en `PL-04` |

### 3.2 Flujo obligatorio para migraciones SQL

```
1. Escribir migración en /supabase/migrations/ con timestamp prefijo (YYYYMMDDHHMMSS_descripcion.sql)
2. Ejecutar en entorno local / Supabase branch (nunca directo a producción sin respaldo)
3. Verificar con SELECT de validación que los datos y constraints son correctos
4. Commitear en Git (mensaje de commit descriptivo)
5. Aplicar en producción vía Supabase Dashboard > SQL Editor o CLI
6. Registrar en la tabla de historial de este documento (sección 9)
```

### 3.3 Flujo para cambios en el servicio de IA

```
1. Cambiar código en ai-service/
2. Probar localmente: uvicorn main:app --reload
3. Verificar /api/health y /api/predict/combined responden correctamente
4. Commitear y pushear a GitHub
5. Railway detecta el push y redespliega automáticamente
6. Verificar logs de Railway que startup completa sin errores
```

### 3.4 Verificacion real de `ireHistorial` en Supabase

Despues de aplicar la migracion `20260506180000_extend_ire_historial_audit.sql`, ejecutar desde `ai-service/`:

```powershell
$env:SUPABASE_URL="https://<proyecto>.supabase.co"
$env:SUPABASE_SERVICE_KEY="<service-role-key>"
python scripts/verify_ire_historial_schema.py
python scripts/verify_ire_historial_schema.py --write-probe
```

La primera corrida valida lectura de columnas extendidas: `version`, `definicion`, `formula`, `variables` y `detalle`. La segunda hace un upsert temporal con `on_conflict=fecha`, valida tipos JSON y borra la fila de prueba. Si falla, no desplegar el servicio IA hasta aplicar o reparar la migracion.

---

## 4. Roles operativos

| Rol | Permisos | Contacto |
|-----|----------|----------|
| Owner Supabase | DDL, billing, RLS | 76778920@continental.edu.pe |
| Owner Firebase | Hosting, Auth, Cloud Functions | 76778920@continental.edu.pe |
| Owner Railway | Deploy ai-service | 76778920@continental.edu.pe |
| Desarrollador | Git push, migraciones, redeploy | 76778920@continental.edu.pe |

---

## 5. Monitoreo y logs

| Fuente | Qué observar | Frecuencia |
|--------|--------------|------------|
| Supabase Dashboard | Errores API, uso DB, RLS denials | Semanal |
| Firebase Console | Auth anomalías, errores de hosting | Semanal |
| Stripe Dashboard | Pagos fallidos, disputas | Diario |
| Railway Logs | Cold-start, errores Python, timeouts | Ante reporte de usuario |
| Tabla `auditoria` | Acciones inusuales (eliminar masivo, rol cambiado) | Mensual |

### 5.1 Consulta rápida de auditoría

```sql
-- Últimas 50 acciones de eliminación
SELECT * FROM auditoria
WHERE accion = 'eliminar'
ORDER BY "realizadoEn" DESC
LIMIT 50;
```

---

## 6. Respaldos y recuperación (RPO/RTO)

| Activo | Método de respaldo | Frecuencia | RPO | RTO |
|--------|-------------------|------------|-----|-----|
| Base de datos Supabase | Point-in-time recovery (Supabase Pro) / export SQL manual | Diario | 24 h | < 4 h |
| Código fuente | Git remoto (GitHub) | Continuo | 0 | Minutos |
| Imágenes producto | Cloudinary (redundancia del proveedor) | Según proveedor | — | — |
| Estado modelo IA | Tabla `modeloEstado` en Supabase | Cada predicción | 1 predicción | Automático al reiniciar |

**Procedimiento de restauración Supabase:**
1. Dashboard → Settings → Backups → seleccionar punto de restauración.
2. Verificar integridad con `SELECT count(*) FROM productos`.
3. Notificar a usuarios si hay downtime > 30 min.

---

## 7. Retención de datos (ISO 27001 A.5.33) — F-08

| Tabla | Retención | Método |
|-------|-----------|--------|
| `auditoria` | 2 años | `purge_old_audit_records(2)` |
| `ventasDiarias` (esDePrueba=true) | 90 días | `purge_test_sales(90)` |
| `ireHistorial` | Sin límite (dataset de tesis) | Manual si necesario |
| `pedidos` | Sin límite (obligación comercial Perú) | — |

**Ejecución manual (plan gratuito Supabase):**
```sql
SELECT run_data_retention_policy();
```
Ejecutar el primer día de cada mes desde Supabase SQL Editor.

---

## 8. Gestión de incidentes

1. Detección (monitor automático, reporte de usuario).
2. Clasificación de severidad (ver documento `08` sección 7).
3. Mitigación inmediata (rollback de migración, invalidar caché de IA, deshabilitar feature).
4. Análisis de causa raíz.
5. Registro en `PL-04` (plantilla disponible en `documentacion/plantillas/`).

---

## 9. Parches y actualizaciones de dependencias

- Revisión mensual: `npm audit` + `pip list --outdated`.
- Cambios de versión mayor (React, FastAPI, scikit-learn): rama dedicada + suite completa de pruebas.
- Dependencias de seguridad crítica: parche en 72 h máximo tras CVE publicado.

---

## 10. Cumplimiento legal

- Ley N.° 29733 (Perú) — Protección de datos personales: datos de clientes solo usados para gestión de pedidos y análisis interno.
- Consentimiento informado para datos usados en investigación de tesis.
- Datos de ventas anonimizados para entrenamiento del modelo de IA (no se expone PII al servicio Python).

---

## 11. Historial de versiones

| Versión | Fecha | Descripción |
|---------|-------|-------------|
| 1.0 | 2026-05-01 | Versión inicial. |
| 1.1 | 2026-05-04 | F-06: política de seguridad. F-07: proceso de control de cambios. F-08: retención de datos. Roles completados. |
