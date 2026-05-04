# Auditoría total del panel administrativo (`/admin`)

**Proyecto:** Calzatura Vilchez — aplicación web (Vite, React, Firebase Auth, Supabase, servicios auxiliares en Cloud Functions y servicio IA en Render).  
**Alcance de este documento:** rutas bajo `/admin`, layout compartido y criterios de calidad alineados con documentación ISO / tesis del repositorio.  
**Matriz de pruebas canónica (trazabilidad):** [CU-T07-LEEME.md](../CU-T07-LEEME.md).  
**Versión Word:** [AdminPanel-auditoria-total.docx](./AdminPanel-auditoria-total.docx) (regenerar: `python scripts/build_admin_panel_audit_docx.py`). Si el `.docx` está abierto en Word, el script crea [AdminPanel-auditoria-total-generado.docx](./AdminPanel-auditoria-total-generado.docx).

---

## 0. Por qué auditamos y bajo qué aspectos

No es una lista técnica suelta: cada bloque siguiente responde a **dimensiones** que el proyecto ya usa en tesis y en `docs/15-modulos` (calidad de software, gobierno de datos, operación).

| Aspecto | Qué miramos | Para qué sirve en este proyecto |
|-----------|-------------|----------------------------------|
| **A1 — Seguridad y acceso** | Quién entra al admin, con qué rol, qué datos sensibles se muestran (DNI, correos, tokens). | Evitar exposición de secretos en bundle, accesos no autorizados y fugas de PII. |
| **A2 — Integridad de datos** | Stock, pedidos, ventas, importaciones: consistencia entre UI, API y BD; condiciones de carrera. | Coherencia entre tienda física / web y registros contables. |
| **A3 — Trazabilidad y auditoría (ISO)** | `logAudit`, historial de acciones administrativas, recuperación de “quién hizo qué”. | Cumplimiento de requisitos de auditoría y defensa ante disputas. |
| **A4 — Confiabilidad y errores** | Manejo de fallos de red, timeouts (p. ej. Render), mensajes al usuario, recuperación. | Que el gerente y operación no vean fallos silenciosos o bloqueos sin explicación. |
| **A5 — Cobertura de pruebas** | E2E (Playwright), tests unitarios donde existan. | Regresiones en CI antes de desplegar. |
| **A6 — Mantenibilidad** | Tamaño de archivos, duplicación, separación de responsabilidades. | Coste de cambio y tiempo de incorporación de desarrolladores. |
| **A7 — Rendimiento y operación** | Carga del bundle, llamadas externas (IA), cold starts, migraciones Supabase. | Experiencia de uso y despliegue predecible. |
| **A8 — Documentación de módulo** | Informe `*-auditoria.md` en `docs/15-modulos` con alcance, riesgos y vínculo a CU-T07. | Continuidad del proyecto y auditorías externas (ISO, cliente, interno). |

Cada sección **1–9** aplica estos aspectos **solo donde aplica** al módulo concreto, en formato **qué está bien** / **qué falta o mejora**.

---

## 1. Envoltorio — `AdminLayout.tsx`

**Ruta:** todas las URLs bajo `/admin/*`. **Archivo:** `src/domains/administradores/components/AdminLayout.tsx`.

### Qué está bien

- **A1:** Tras Firebase, exige `isAdmin`; si no hay usuario, redirige a login con `redirect` en la URL.
- **A1:** `AreaRoute` ya filtró `administradores`; aquí hay **doble comprobación** (defensa en profundidad razonable).
- **A4:** Logout con feedback (`toast`) y manejo de error si falla el cierre de sesión.
- **A6:** Sidebar colapsable con preferencia en `localStorage`; botón de colapso con `aria-expanded`, `aria-controls`, `aria-label`.
- **A8:** `<aside id="admin-sidebar" aria-label="Menú de administración">`, `<nav aria-label="Módulos del panel">`, `NavLink` con `aria-current="page"` (React Router).
- **A5:** E2E `e2e/admin-layout.spec.ts` — TC-LAYOUT-001…007 (sidebar `aria-current`, navegación a ventas, tema, Ver tienda, Cerrar sesión, colapsar sidebar y persistencia). Los localizadores deben acotarse al `nav` del sidebar porque el **Dashboard** duplica enlaces en el contenido.
- **A8 (documentación):** [AdminLayout-auditoria.md](./AdminLayout-auditoria.md) con hallazgos L-01…L-03 cerrados o verificados.

### Qué falta o mejora (opcional / baja prioridad)

- **A8:** No hay prueba automática de **contraste** WCAG en modo oscuro ni de **orden de foco** completo (teclado); puede quedar en checklist QA manual o herramienta externa (axe, Lighthouse).
- **A1 (mantenimiento):** Seguir evitando comentarios obsoletos que mencionen Firestore para datos de negocio (verificado en L-03 del informe de módulo).

### Documentación específica

- **Hecho:** [AdminLayout-auditoria.md](./AdminLayout-auditoria.md).

---

## 2. Dashboard — `AdminDashboard.tsx`

**Ruta:** `/admin`. **Archivo:** `src/domains/administradores/pages/AdminDashboard.tsx`.

### Qué está bien

- **A4 / A8:** Existe informe dedicado con flujo de errores y botón Reintentar (no enmascarar fallo como “vacío”).
- **A2:** Agrega visión agregada (métricas) sin ser el punto de escritura crítica de stock.
- **A5:** E2E `e2e/admin-dashboard.spec.ts` — error/reintento en carga principal, error aislado en auditoría, teclado en filas de pedidos, KPIs + tabla de auditoría con mocks, vacíos correctos (TC-DASH-001…005).

### Qué falta o mejora

- **A6:** Tamaño moderado (~560 líneas); si crece, conviene trocear widgets (sin refactor obligatorio en este sprint).

### Documentación específica

- **Hecho:** [AdminDashboard-auditoria.md](./AdminDashboard-auditoria.md) (incluye E2E `e2e/admin-dashboard.spec.ts`, TC-DASH-001…005).

---

## 3. Productos — `AdminProducts.tsx`

**Ruta:** `/admin/productos`. **Archivo:** `src/domains/productos/pages/AdminProducts.tsx`.

### Qué está bien

- **A2 / A3:** CRUD y variantes pasan por `products.ts` con **`logAudit`** en crear/editar/eliminar.
- **A5:** Cobertura E2E amplia: filtros, chips de variantes, guardas de código comercial, stock/tallas, campaña, humo de redirección admin; borrado con `window.confirm()` en `e2e/admin-product-delete.spec.ts` (TC-PROD-DEL01 / TC-PROD-DEL02 en CU-T07, incluida aserción de estado vacío como fila en `<tbody>`).
- **A8:** Informe de auditoría del módulo con trazabilidad a CU-T07.

### Qué falta o mejora

- **A6:** Archivo grande (~1600+ líneas); conviene extraer modales o secciones en componentes dedicados cuando haya capacidad.

### Documentación específica

- **Hecho:** [AdminProducts-auditoria.md](./AdminProducts-auditoria.md).

---

## 4. Pedidos — `AdminOrders.tsx`

**Ruta:** `/admin/pedidos`. **Archivo:** `src/domains/pedidos/pages/AdminOrders.tsx`.

### Qué está bien

- **A2:** Listado y cambio de estado vía `orders.ts`; **`logAudit`** al cambiar estado del pedido.
- **A4:** Toasts de éxito/error en actualización de estado.
- **A6:** Módulo acotado (~160 líneas), más fácil de mantener que otros.
- **A5:** E2E `e2e/admin-orders.spec.ts` — TC-ORD-001…003 (filtro por estado, expand/collapse de tarjeta, PATCH + toast).
- **A8:** [AdminOrders-auditoria.md](./AdminOrders-auditoria.md) (PII, riesgos aceptados, trazabilidad CU-T07).

### Qué falta o mejora

- **A2:** La UI permite **cualquier transición** entre estados desde el `<select>`; no hay máquina de estados visible (riesgo de saltos poco realistas, p. ej. `pendiente` → `entregado` sin pasos intermedios). Ver riesgo aceptado en el informe de módulo; pendiente reglas en `orders.ts` o RPC si negocio lo exige.
- **A1:** Se muestra **correo del cliente** (`userEmail`); correcto para operación, pero implica **PII** en pantalla de mostrador — conviene mencionarlo en política de privacidad / acceso al terminal.

### Documentación específica

- **Hecho:** [AdminOrders-auditoria.md](./AdminOrders-auditoria.md).

---

## 5. Ventas diarias — `AdminSales.tsx`

**Ruta:** `/admin/ventas`. **Archivo:** `src/domains/ventas/pages/AdminSales.tsx`.

### Qué está bien

- **A2:** Stock por talla con RPC atómica (`decrement_product_stock` / `restore_product_stock`) y `FOR UPDATE`; documentado en migraciones y en informe del módulo.
- **A5:** E2E `admin-sales.spec.ts` (flujo de venta, stock insuficiente, devolución con/sin motivo).
- **A4:** Validaciones de cliente (DNI, documentos) con mensajes explícitos en varios flujos.
- **A8:** [AdminSales-auditoria.md](./AdminSales-auditoria.md) con riesgos aceptados (transacción insert + RPC, popup de documento, etc.).

### Qué falta o mejora

- **A3 (riesgo aceptado):** No hay `logAudit` en registro de venta diaria ni en devolución. **Decisión tomada en S-03 de [AdminSales-auditoria.md](./AdminSales-auditoria.md):** los registros en `ventasDiarias` ya son auditables directamente (contienen `userId`, `fecha`, `talla`, `cantidad`). Se acepta conscientemente hasta que el negocio/ISO exija eventos explícitos como `registrar_venta` o `devolver_venta`.
- **A2 (residual):** Inserciones en `ventasDiarias` y RPC de stock **no están en una única transacción** de base de datos; riesgo acotado pero documentado.
- **A1:** Uso de DNI y datos de persona en documentos — coherente con negocio; revisar retención y acceso según política interna.

### Documentación específica

- **Hecho:** [AdminSales-auditoria.md](./AdminSales-auditoria.md).

---

## 6. Usuarios — `AdminUsers.tsx`

**Ruta:** `/admin/usuarios`. **Archivo:** `src/domains/usuarios/pages/AdminUsers.tsx`.

### Qué está bien

- **A3:** Cambio de rol pasa por `users.ts` y dispara **`logAudit`** (`cambiar_estado` / usuario).
- **A2:** Perfiles alineados con tabla `usuarios` en Supabase (coherente con `AdminLayout` y proxy IA admin).
- **A5:** E2E `e2e/admin-users.spec.ts` — TC-USR-001…004 (KPIs, filtro por rol, autoprotección de rol admin, error RLS sin filtrar código técnico).
- **A8:** [AdminUsers-auditoria.md](./AdminUsers-auditoria.md) (roles, superadmin por email, CU-T07).

### Qué falta o mejora

- **A1:** Cualquier pantalla que liste correos o datos personales debe quedar referenciada en política de tratamiento de datos.

### Documentación específica

- **Hecho:** [AdminUsers-auditoria.md](./AdminUsers-auditoria.md).

---

## 7. Fabricantes — `AdminManufacturers.tsx`

**Ruta:** `/admin/fabricantes`. **Archivo:** `src/domains/fabricantes/pages/AdminManufacturers.tsx`.

### Qué está bien

- **A3:** CRUD en `manufacturers.ts` con **`logAudit`** en crear/editar/eliminar.
- **A2:** Relación con catálogo de productos gestionada desde el dominio de fabricantes.
- **A5:** E2E `e2e/admin-manufacturers.spec.ts` — TC-MFR-001…003 (lista/stats, filtro inactivos, borrado con confirmación).
- **A8:** [AdminManufacturers-auditoria.md](./AdminManufacturers-auditoria.md) (impacto en productos, CU-T07).

### Qué falta o mejora

- **A6:** Tamaño intermedio (~760 líneas); revisar si hay duplicación con formularios de otros módulos.

### Documentación específica

- **Hecho:** [AdminManufacturers-auditoria.md](./AdminManufacturers-auditoria.md).

---

## 8. Predicciones IA — `AdminPredictions.tsx`

**Ruta:** `/admin/predicciones`. **Archivo:** `src/domains/administradores/pages/AdminPredictions.tsx`.

### Qué está bien

- **A4:** Timeouts en cliente (`fetchAI`), mensaje específico ante cold start de Render, endpoint combinado y `warnings` si falla solo la parte de ingresos.
- **A7:** Optimizaciones en servicio IA (payload Supabase acotado, `combined`, paralelismo de lecturas donde aplica).
- **A1 (en curso):** Camino **BFF** documentado: Cloud Function `aiAdminProxy` + `VITE_AI_ADMIN_PROXY_URL`; token de servicio fuera del bundle cuando se despliegue.
- **A6:** Ruta cargada con `lazy()` en `App.tsx` (no infla el bundle inicial de la tienda pública).
- **A5:** E2E `e2e/admin-predictions.spec.ts` — TC-PRED-001 / TC-PRED-002 (timeout/cold start + respuesta exitosa mockeada).
- **A8:** [AdminPredictions-auditoria.md](./AdminPredictions-auditoria.md) (proxy, token, CU-T07).

### Qué falta o mejora

- **A1:** Hasta activar el proxy en **todos** los entornos de producción, el token `VITE_*` puede seguir en el build — **riesgo de seguridad** explícito en operaciones.
- **A6:** Archivo muy grande (~2400+ líneas); principal deuda de mantenibilidad del admin.
- **A7:** Latencia y cold start de Render siguen siendo **factores externos**; monitorización en Render recomendable.

### Documentación específica

- **Hecho:** [AdminPredictions-auditoria.md](./AdminPredictions-auditoria.md) (complementa `operaciones-credenciales.md` donde aplica).

---

## 9. Datos Excel — `AdminData.tsx`

**Ruta:** `/admin/datos`. **Archivo:** `src/domains/administradores/pages/AdminData.tsx`.

### Qué está bien

- **A3:** Importaciones registran **`logAudit`** con contexto de lote y escenario.
- **A2:** Import/export masivo es un punto crítico; está concentrado y acoplado a definiciones de colección en el mismo archivo (trazabilidad de columnas en código).
- **A4:** Uso de `aiAdminClient` para invalidar caché IA alineado con el resto del admin.
- **A5:** E2E mínimo `e2e/admin-data.spec.ts` — TC-DATA-001 / TC-DATA-002 (título de pantalla, botón Plantilla). Ampliar con error de validación simulado si el negocio lo prioriza.
- **A8:** [AdminData-auditoria.md](./AdminData-auditoria.md) con riesgos y CU-T07.

### Qué falta o mejora

- **A2:** Un import malicioso o mal formado puede afectar muchas filas — conviene checklist QA manual y, si el negocio lo pide, validación server-side o cuarentena de datos.
- **A6:** Archivo grande (~1200+ líneas); valorar extraer configuración de colecciones a módulo o JSON versionado.

### Documentación específica

- **Hecho:** [AdminData-auditoria.md](./AdminData-auditoria.md).

---

## A3 — Trazabilidad (ISO): cobertura transversal de `logAudit`

Resumen consolidado del aspecto A3 a través de todos los módulos del panel.

| Módulo | Eventos auditados | Archivo fuente |
|--------|-------------------|----------------|
| Productos | `crear`, `editar`, `eliminar` (CRUD directo y `create_product_variants_atomic`) | `src/domains/productos/services/products.ts` |
| Pedidos | `cambiar_estado` (cambio de estado por admin) | `src/domains/pedidos/services/orders.ts` |
| Fabricantes | `crear`, `editar`, `eliminar` | `src/domains/fabricantes/services/manufacturers.ts` |
| Usuarios | `crear` (registro), `eliminar` (baja propia), `cambiar_estado` (cambio de rol) | `src/domains/usuarios/services/auth.ts` + `users.ts` |
| Importaciones (Datos Excel) | `importar` con contexto de lote, filas OK/errores y escenario | `src/domains/administradores/pages/AdminData.tsx` |
| Ventas diarias | **Riesgo aceptado (S-03)** — sin evento explícito; los registros en `ventasDiarias` ya contienen `userId`, `fecha`, `talla`, `cantidad` y son directamente auditables. Eventos explícitos (`registrar_venta`, `devolver_venta`) quedan opcionales a futuro según criterio negocio/ISO. | Decisión documentada en [AdminSales-auditoria.md](./AdminSales-auditoria.md#s-03) |

**Función central:** `logAudit(accion, entidad, entidadId, entidadNombre, detalle?)` en `src/services/audit.ts` — inserta en tabla `auditoria` de Supabase con `usuarioUid`, `usuarioEmail` y `realizadoEn`. Los fallos de auditoría se silencian (no interrumpen la operación principal).

### Límites arquitectónicos explícitos

**1 — `functions/` — implementado (2026-05-03)**

El flujo de pedidos/pago ahora está completamente cubierto sin duplicados:

| Evento | Mecanismo | Archivo |
|---|---|---|
| `createOrder` (INSERT de pedido) | Trigger `trg_audit_pedido_insert` (`AFTER INSERT ON pedidos`) | `supabase/migrations/20260503100000_audit_pedidos_trigger.sql` |
| Webhook Stripe (pago confirmado) | `logAuditFn()` en `stripeWebhook` tras `updateOrder` | `functions/index.js` |
| Cambio de estado admin (React) | `logAudit()` en `updateOrderStatus` | `src/domains/pedidos/services/orders.ts` |

El trigger es `SECURITY DEFINER` y corre solo en INSERT (no en UPDATE), lo que evita duplicados con los logs de aplicación en cambios de estado.

**2 — Sin triggers PostgreSQL para otras tablas**

Solo `pedidos` tiene trigger. El resto de entidades (productos, fabricantes, usuarios, ventas) usa logAudit a nivel de aplicación. Extensión a BD posible si el negocio lo exige.

**3 — Código sin ruta activa en el cliente**

`updateOrderStripeSession` (`orders.ts`) no tiene callers en el repo cliente; el flujo Stripe real corre en `functions/`. No es un hueco operativo actual.

---

## 10. Resumen ejecutivo (sin sustituir el detalle anterior)

**Smoke transversal:** `e2e/admin-smoke.spec.ts` — TC-SMOKE-001…008: con sesión admin simulada y mocks genéricos, cada ruta `/admin`, `/admin/productos`, … `/admin/datos` debe mostrar su `heading` principal (landmark de módulo).

| Módulo | Documento `15-modulos` | E2E dedicado | Hueco principal bajo aspectos A1–A8 |
|--------|------------------------|--------------|-------------------------------------|
| Layout | Hecho | Sí (`admin-layout.spec.ts` + smoke) | A8 residual (contraste/foco no automatizado) |
| Dashboard | Hecho | Sí (`admin-dashboard.spec.ts` + smoke) | A6 (tamaño del archivo) |
| Productos | Hecho | Sí (varios specs + borrado + smoke) | A6 |
| Pedidos | Hecho | Sí (`admin-orders.spec.ts` + smoke) | A2 (máquina de estados / transiciones) |
| Ventas | Hecho | Sí (`admin-sales.spec.ts` + smoke) | A3 (riesgo aceptado S-03), A2 (transacción) |
| Usuarios | Hecho | Sí (`admin-users.spec.ts` + smoke) | A1 (política de datos / PII) |
| Fabricantes | Hecho | Sí (`admin-manufacturers.spec.ts` + smoke) | A6 |
| Predicciones | Hecho | Sí (`admin-predictions.spec.ts` + smoke) | A1 (token en build hasta proxy pleno), A6, A7 |
| Datos Excel | Hecho | Sí (`admin-data.spec.ts` mínimo + smoke) | A2 (import masivo), A6 |

---

## 11. Checklist de cierre (acciones concretas)

1. **Informes por módulo:** Completado — todos los módulos de las secciones 1–9 tienen `*-auditoria.md` en `docs/15-modulos` con alcance, datos, riesgos y vínculo a CU-T07 donde aplica.
2. **Smoke E2E:** Completado — `e2e/admin-smoke.spec.ts` (TC-SMOKE-001…008).
3. **Ventas y A3:** Documentado — decisión registrada en **S-03** de [AdminSales-auditoria.md](./AdminSales-auditoria.md) como **riesgo aceptado conscientemente**: los registros en `ventasDiarias` ya son auditables directamente (contienen `userId`, `fecha`, `talla`, `cantidad`). Si en el futuro negocio / ISO exige eventos explícitos (`registrar_venta`, `devolver_venta`), se implementarán en `finance.ts` o mediante RPC.
4. **Pedidos y A2:** Pendiente si el negocio exige flujo estricto: reglas de transición de estado en `orders.ts` o en RPC/trigger en BD (hoy riesgo aceptado en `AdminOrders-auditoria.md`).
5. **Operación:** Migraciones Supabase aplicadas en producción; desplegar proxy IA y retirar token `VITE_*` del frontend cuando corresponda.

> **Sobre PDFs exportados a mano:** si un archivo como `ULTIMA AUDITORIA.pdf` se generó antes de estos cierres, puede contradecir el repositorio. La referencia viva es este `.md`, la matriz `documentacion/cuadros-excel/CU-T07-matriz-pruebas-requisitos.csv` y los specs en `e2e/`. Regenerar Word/PDF: `python scripts/build_admin_panel_audit_docx.py` desde la raíz del proyecto `calzatura-vilchez`.
