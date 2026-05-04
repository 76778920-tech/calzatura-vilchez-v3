# 10 — Operación, seguridad y continuidad del servicio

## 1. Objetivo

Documentar **cómo** se opera el sistema en producción o staging: accesos, monitoreo, respaldos, respuesta a incidentes y continuidad, sin exponer secretos.

## 2. Roles operativos

| Rol | Permisos | Contacto |
|-----|----------|----------|
| Owner Supabase | DDL, billing | *(completar)* |
| Owner Firebase | Hosting, auth | *(completar)* |
| Desarrollador | Deploy CI | *(completar)* |

## 3. Gestión de secretos

- Almacenamiento: variables en plataforma CI / secret manager / `.env.local` local ignorado.  
- Rotación: cada *N* meses o ante fuga.  
- **Prohibido:** subir `serviceAccountKey.json` o anon keys a repositorio público.

## 4. Monitoreo y logs

| Fuente | Qué observar |
|--------|----------------|
| Supabase Dashboard | Errores API, uso DB |
| Firebase Console | Auth anomalías, hosting |
| Stripe Dashboard | Pagos fallidos |

## 5. Respaldos y recuperación (RPO/RTO)

| Activo | Método de respaldo | Frecuencia | RPO orientativo | RTO orientativo |
|--------|-------------------|------------|-----------------|-----------------|
| Base Supabase | Puntos de restauración / export SQL | Diario/semanal *(definir)* | *(h)* | *(h)* |
| Código | Git remoto | Continuo | 0 | Minutos |
| Imágenes producto | Cloudinary u origen | Según proveedor | — | — |

**Procedimiento de restauración:** *(pasos numerados — completar con capturas en anexo tesis).*

## 6. Gestión de incidentes

1. Detección (monitor, usuario).  
2. Clasificación severidad (`08` sección 7).  
3. Mitigación inmediata (rollback, feature flag).  
4. Análisis causa raíz (opcional breve).  
5. Registro en `PL-04`.

## 7. Parches y actualizaciones de dependencias

- Política: revisión mensual `npm audit`.  
- Cambios mayores (React, Vite): rama dedicada + suite completa.

## 8. Cumplimiento legal (recordatorio)

- Ley de protección de datos personales del Perú y políticas de privacidad publicadas en el sitio.  
- Consentimiento para datos usados en investigación (tesis).

## 9. Historial de versiones

| Versión | Fecha | Descripción |
|---------|-------|-------------|
| 1.0 | 2026-05-01 | Versión inicial. |
