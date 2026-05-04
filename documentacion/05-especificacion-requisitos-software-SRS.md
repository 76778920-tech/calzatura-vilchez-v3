# 05 — Especificación de requisitos del software (SRS)

**Norma de referencia:** IEEE 830-1998 (Recommended Practice for Software Requirements Specifications), adaptada.  
**Estado:** documento vivo — toda modificación debe actualizar versión y `cuadros-excel/CU-T05-requisitos.csv`.

## 1. Introducción

### 1.1 Propósito

Este SRS define los **requisitos** del sistema web Calzatura Vilchez y del **módulo de inteligencia artificial** asociado a la **predicción del riesgo empresarial**, para permitir diseño, implementación, pruebas y evaluación objetiva, alineados con el **título de tesis**.

### 1.2 Alcance del software

El sistema comprende:

- **Frontend** web (React, TypeScript, Vite) con módulos de dominio bajo `calzatura-vilchez/src/domains/`.  
- **Persistencia** principal en **Supabase (PostgreSQL)** con políticas de acceso según configuración del proyecto.  
- **Autenticación** con **Firebase Auth**; **despliegue estático** típico en **Firebase Hosting**.  
- **Pagos** con **Stripe** (según integración vigente en código).  
- **Servicio de IA** (repositorio `ai-service/` u homólogo) para predicción / analítica según `07-modulo-ia-riesgo-empresarial.md`.

**Nota de sincronización:** el documento `calzatura-vilchez/docs/formato-09-alcance-proyecto-software.md` lista aún **Cloud Firestore** como base principal; **esta especificación prevalece** para el estado arquitectónico basado en código y migraciones Supabase.

### 1.3 Definiciones y siglas

| Término | Definición |
|---------|------------|
| SRS | Software Requirements Specification (este documento) |
| EDA | Estado del arte (`estado_del_arte.md`) |
| RF / RNF | Requisito funcional / no funcional |
| RPC | Función remota en PostgreSQL invocada vía Supabase |
| JWT | Token de autenticación |

### 1.4 Referencias

- `estado_del_arte.md`  
- `documentacion/INTEGRACION-DOCS-EXISTENTES.md`  
- `calzatura-vilchez/supabase/migrations/*.sql`  
- `calzatura-vilchez/docs/formato-09-alcance-proyecto-software.md` (alcance funcional; corregir persistencia)  
- BPMN bajo `calzatura-vilchez/docs/procesos/bpmn/`

### 1.5 Visión general del documento

Secciones 2–4: descripción general. Sección 5: requisitos específicos. Anexos: trazabilidad y reglas.

---

## 2. Descripción general

### 2.1 Perspectiva del producto

Sistema **cliente-servidor**: navegador ejecuta SPA; servicios externos (Supabase, Firebase, Stripe, IA) proveen capacidades. No es un monolito servidor único clásico.

### 2.1.1 Diagrama de contexto (interfaces externas)

Ver `01-marco-y-tesis.md` sección 8.

### 2.2 Funciones del producto (resumen)

- Catálogo y comercio electrónico (navegación, detalle, carrito, checkout, pedidos).  
- Administración (productos, stock/tallas, códigos, finanzas de producto, ventas, pedidos, usuarios, fabricantes, datos de prueba).  
- Cliente (perfil, favoritos).  
- **Analítica / IA** (predicción demanda, alertas, **riesgo empresarial** — detallar en sección 5 y en `07`).

### 2.3 Características de los usuarios

| Rol | Conocimiento técnico | Frecuencia de uso |
|-----|----------------------|-------------------|
| Visitante | Bajo | Esporádica |
| Cliente | Bajo–medio | Media |
| Administrador | Medio | Alta |
| Superadmin | Medio–alto | Baja |

### 2.4 Restricciones generales

- Cumplimiento de ley de protección de datos personales (Perú: Ley N.° 29733 y normativa aplicable — **completar con asesoría legal**).  
- No almacenar secretos en el repositorio.  
- Compatibilidad con navegadores modernos (últimas dos versiones mayor de Chrome/Edge/Firefox).

### 2.5 Supuestos y dependencias

- Disponibilidad de proyectos Supabase y Firebase configurados.  
- Servicio IA accesible desde el entorno donde se despliegue el front (CORS, URL).  
- Stripe en modo correcto (test/prod) según entorno.

---

## 3. Requisitos específicos — interfaces externas

| ID | Sistema externo | Datos intercambiados | Protocolo |
|----|-----------------|----------------------|-----------|
| IE-01 | Supabase | Productos, pedidos, usuarios, RPC | HTTPS REST |
| IE-02 | Firebase Auth | Identidad, tokens | HTTPS |
| IE-03 | Stripe | Sesión de pago, confirmación | HTTPS |
| IE-04 | Servicio IA | Features, predicción | HTTPS |
| IE-05 | API DNI (si aplica) | Validación documento | HTTPS |

---

## 4. Requisitos no funcionales (ISO/IEC 25010)

Lista maestra extendida en `documentacion/02-normas-metodologia-y-roles.md` y CSV `CU-T05-requisitos.csv`.

| ID | Descripción | Categoría 25010 | Métrica / criterio |
|----|-------------|-----------------|---------------------|
| RNF-SEG-01 | Las rutas administrativas exigen sesión válida y rol | Seguridad | 100 % rutas bloqueadas sin auth en E2E |
| RNF-SEG-02 | Credenciales solo en variables de entorno | Seguridad | 0 secretos en Git |
| RNF-PER-01 | Tiempo de respuesta percibido catálogo | Rendimiento | *(definir p95)* |
| RNF-USA-01 | Flujo checkout comprensible | Usabilidad | Prueba con usuario no técnico |
| RNF-MAN-01 | Código modular por dominios | Mantenibilidad | Convención carpetas `src/domains` |
| RNF-REL-01 | Migraciones reproducibles | Confiabilidad | `supabase db` / SQL aplicable |

---

## 5. Requisitos funcionales

### 5.1 Convenciones

- Prioridad: **Must** (M), **Should** (S), **Could** (C).  
- Cada RF debe tener fila en `CU-T05-requisitos.csv` y, cuando aplique, casos en `CU-T07-matriz-pruebas-requisitos.csv`.

### 5.2 Módulo público y catálogo

| ID | Enunciado | Prioridad | Fuente EDA / notas |
|----|-------------|-----------|---------------------|
| RF-CAT-01 | El sistema permite listar productos con filtros de taxonomía (categoría, tipo, marca, precio, campaña comercial cuando aplique). | M | Catálogo + literatura adopción |
| RF-CAT-02 | El sistema muestra ficha de producto con imágenes, precio, tallas, color y stock disponible. | M | IN-03 |
| RF-CAT-03 | El sistema permite agrupar o relacionar variantes por familia de producto (`familiaId`) cuando esté configurado. | S | Diseño multi-variante |

### 5.3 Autenticación y usuarios

| ID | Enunciado | Prioridad | Notas |
|----|-------------|-----------|-------|
| RF-AUT-01 | Registro de usuario con datos personales y validación de identidad según política vigente. | M | IN-05 |
| RF-AUT-02 | Inicio y cierre de sesión mediante Firebase Auth. | M | IN-06 |
| RF-AUT-03 | Perfil: consulta y actualización de teléfono y direcciones. | M | IN-07 |
| RF-AUT-04 | Sincronización o registro de perfil en tabla `usuarios` de Supabase según flujo implementado. | M | Revisar `users.ts` |

### 5.4 Carrito, pedidos y pagos

| ID | Enunciado | Prioridad | Notas |
|----|-------------|-----------|-------|
| RF-CAR-01 | Agregar, modificar y eliminar ítems del carrito con talla/color cuando corresponda. | M | IN-04 |
| RF-CHK-01 | Checkout captura dirección, método de pago y notas. | M | IN-09 |
| RF-PED-01 | Creación de pedido persistida en **Supabase** (`pedidos`) con estado inicial acorde al flujo. | M | Sustituye IN-10 Firestore |
| RF-PAG-01 | Pago con tarjeta mediante integración Stripe (sesión o flujo vigente en código). | M | IN-11 |
| RF-PED-02 | Opción de pedido contraentrega si está implementada. | S | IN-12 |
| RF-PED-03 | Cliente puede listar su historial de pedidos. | M | IN-13 |

### 5.5 Administración comercial

| ID | Enunciado | Prioridad | Notas |
|----|-------------|-----------|-------|
| RF-ADM-01 | Panel administrativo con indicadores de negocio. | M | IN-14 |
| RF-ADM-02 | CRUD de productos con validaciones comerciales (categoría, tipo, descuentos, precios). | M | IN-15 + triggers SQL |
| RF-ADM-03 | Gestión de stock por talla y color (`tallaStock`, tallas). | M | IN-16 |
| RF-ADM-04 | Gestión de imágenes de producto (origen Cloudinary u otro según implementación). | S | IN-17 |
| RF-ADM-05 | Códigos de producto únicos y asociación en `productoCodigos`. | M | IN-18 + migración unicidad |
| RF-ADM-06 | Finanzas de producto (costos, márgenes, rangos de precio). | M | IN-19 |
| RF-ADM-07 | Cambio de estado de pedidos desde admin. | M | IN-20 |
| RF-ADM-08 | Registro de ventas diarias y cálculo de ganancias. | M | IN-21 |
| RF-ADM-09 | Emisión o registro de documento de venta (nota/guía) según implementación. | S | IN-22 |
| RF-ADM-10 | Devoluciones con impacto en stock y flags en ventas. | S | IN-23 |
| RF-ADM-11 | Gestión de usuarios y roles. | M | IN-24 |
| RF-ADM-12 | Gestión de fabricantes y documentos asociados. | S | IN-25 |
| RF-ADM-13 | Campaña comercial (`campana`) en producto para trazabilidad comercial y catálogo. | S | RPC + admin |
| RF-ADM-14 | Importación/exportación de datos de prueba (escenarios) desde panel Admin Data. | S | Supabase columnas `esDePrueba`, etc. |

### 5.6 Favoritos y cliente

| ID | Enunciado | Prioridad | Notas |
|----|-------------|-----------|-------|
| RF-FAV-01 | Usuario autenticado gestiona favoritos persistidos en Supabase. | M | IN-08 |

### 5.7 Inteligencia artificial — **riesgo empresarial y predicción** (título de tesis)

> **Obligatorio para la tesis:** estos requisitos deben completarse con definiciones cuantitativas en `07-modulo-ia-riesgo-empresarial.md`.

| ID | Enunciado | Prioridad | Notas |
|----|-------------|-----------|-------|
| RF-IA-01 | El sistema define formalmente la variable objetivo de **riesgo empresarial** *R* (ej. probabilidad de quiebra técnica, caída de margen, stockout crítico — **elegir una** y justificar). | M | Tesis |
| RF-IA-02 | El modelo de IA consume un conjunto de **atributos** documentados (ventas, stock, estacionalidad, financieros agregados, etc.). | M | Ingeniería de datos |
| RF-IA-03 | El sistema expone la predicción al usuario autorizado (panel o API) con **explicación mínima** (ej. top features, SHAP opcional). | S | Interpretabilidad |
| RF-IA-04 | Se documentan límites, sesgos y riesgos de uso incorrecto del modelo. | M | Ética / validez |
| RF-IA-05 | Versionado del modelo y reproducibilidad (semilla, datos hasta fecha *t*). | S | MLOps ligero |

### 5.8 Reglas de negocio y validación en servidor

| ID | Enunciado | Prioridad | Evidencia |
|----|-------------|-----------|-----------|
| RF-RN-01 | Restriciones comerciales críticas reforzadas en base de datos (CHECK, triggers) además de UI. | M | Migración `add_commercial_guardrails` |
| RF-RN-02 | Operaciones multi-tabla atómicas vía RPC `create_product_variants_atomic` / `update_product_atomic` cuando aplique. | M | Migraciones SQL |

---

## 6. Modelo de datos lógico (referencia)

Detalle tablas/columnas en `06-diseno-arquitectura-y-datos.md` y en migraciones Supabase.

---

## 7. Criterios de aceptación global del SRS

- [ ] 100 % RF **Must** tienen al menos un caso de prueba o procedimiento.  
- [ ] Todos los RF-IA tienen definición matemática/estadística en `07`.  
- [ ] Matriz `CU-T06` liga artículos EDA a RF prioritarios.  
- [ ] Formato 09 actualizado o referenciado como anexo consistente.

---

## 8. Historial de versiones del SRS

| Versión | Fecha | Descripción |
|---------|-------|-------------|
| 1.0 | 2026-05-01 | Versión inicial exhaustiva; corrige persistencia Firestore→Supabase respecto docs legado. |
