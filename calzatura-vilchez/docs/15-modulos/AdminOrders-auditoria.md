# Auditoría del módulo AdminOrders

| Campo | Valor |
|---|---|
| Módulo | AdminOrders (`src/domains/pedidos/pages/AdminOrders.tsx`) |
| Requisito relacionado | RF administración — pedidos y cambio de estado |
| Fecha de auditoría | 2026-05-03 |
| Commit base | `4f6ce4c` (rama `main`) |
| Auditado por | Revisión interna + análisis estático + E2E |

---

## Alcance del módulo

Listado de pedidos con filtro por estado (`pendiente`, `pagado`, `enviado`, `entregado`, `cancelado`), tarjetas expandibles con detalle de ítems, dirección y método de pago, selector inline de cambio de estado con toast de éxito/error, modal de imagen (`ImagePreviewModal`), y `logAudit("cambiar_estado", "pedido", ...)` en `updateOrderStatus`.

---

## Fuentes de datos

| Fetch | Tabla Supabase | Fallo si cae |
|---|---|---|
| `fetchAllOrders()` | `pedidos` | Lista vacía silenciosa (loading → false) |
| `updateOrderStatus()` | `pedidos` (PATCH) | Toast de error; estado local no cambia |

---

## Hallazgos y estado

### O-01 — Filtro de estado y expansión de tarjeta sin cobertura E2E

**Severidad:** Baja (cobertura)

**Antes:** Ningún test E2E cubría el filtro por estado, la expansión de tarjeta ni el cambio de estado con reflejo en UI.

**Después:**
- Nuevo spec `e2e/admin-orders.spec.ts`:

| ID | Descripción | Estado |
|---|---|---|
| TC-ORD-001 | Filtro por estado "pendiente" reduce la lista al subconjunto correcto | ✅ |
| TC-ORD-002 | Click en cabecera de tarjeta expande el detalle; segundo click lo colapsa | ✅ |
| TC-ORD-003 | Cambio de estado en select llama PATCH y muestra toast "Estado actualizado" | ✅ |

**Estado:** ✅ Cerrado

---

### O-02 — Sin informe de módulo (A8)

**Severidad:** Baja (documentación)

**Antes:** No existía `AdminOrders-auditoria.md`.

**Después:** Este documento.

**Estado:** ✅ Cerrado

---

### O-03 — Límite de alcance: `logAudit` no cubre el flujo Stripe / Cloud Functions

**Severidad:** Media (límite de arquitectura; no es un olvido)

**Descripción:**

`updateOrderStatus` en `orders.ts` registra `logAudit("cambiar_estado", "pedido", ...)` cuando el admin cambia el estado manualmente desde la UI. Sin embargo, el flujo principal de creación y pago de pedidos ocurre en Cloud Functions (`functions/index.js` — `createOrder` + webhook Stripe). Ese código no llama a `logAudit` porque la sesión Firebase del cliente React no está disponible en ese contexto (Firebase Admin SDK corre en servidor, sin `auth.currentUser`).

Funciones sin cobertura en tabla `auditoria`:

| Función | Dónde corre | Motivo de la brecha |
|---|---|---|
| `createOrder` | `functions/index.js` (Cloud Function) | Crea fila en `pedidos` y llama a Stripe; no hay `logAudit` en el contexto servidor |
| Webhook Stripe | `functions/index.js` | Confirma pago y actualiza estado; igualmente sin `logAudit` |
| `updateOrderStripeSession` | `orders.ts` (cliente) | Sin callers en el repo cliente; el flujo real pasa por functions/ |

**Compensación documentada:**

La fila en `pedidos` contiene `userId`, `estado`, `metodoPago`, `items`, `creadoEn` y `stripeSessionId` — es la fuente de verdad del pago. Los logs de Stripe (dashboard Stripe, webhooks) complementan la trazabilidad para el flujo de cobro. Si ISO/negocio exige eventos explícitos (`crear_pedido`, `pago_confirmado`) en `auditoria`, la implementación requiere inyectar `logAudit` desde Cloud Functions mediante inserción directa en Supabase con service account.

**Solución implementada (2026-05-03):**

| Evento | Mecanismo | Detalle en `auditoria` |
|---|---|---|
| Creación de pedido (`createOrder`) | Trigger PostgreSQL `trg_audit_pedido_insert` (`AFTER INSERT ON pedidos`) | `source: "db_trigger"`, `userId`, `userEmail`, `total`, `metodoPago` |
| Pago confirmado (webhook Stripe) | `logAuditFn()` en `functions/index.js` tras `updateOrder` | `source: "stripe_webhook"`, `estado: "pagado"`, `userId` (de `session.metadata`), `userEmail` (de la fila del pedido) |

El trigger cubre también cualquier INSERT directo en BD que pudiera saltarse `createOrder`. El trigger está en `supabase/migrations/20260503100000_audit_pedidos_trigger.sql`.

**Estado:** ✅ Cerrado — cobertura completa sin duplicados.

---

## Riesgos aceptados (no corregidos en este sprint)

| Riesgo | Descripción | Recomendación |
|---|---|---|
| Máquina de estados (A2) | El `<select>` permite cualquier transición de estado (p. ej. `pendiente → entregado` sin pasos intermedios). No hay validación en `updateOrderStatus` ni en la BD. | Implementar reglas de transición en `orders.ts` o en un trigger PostgreSQL cuando el negocio lo exija. |
| PII en pantalla (A1) | Se muestra `userEmail` y dirección completa del cliente. Correcto para operación, pero implica PII visible en terminal de mostrador. | Documentar en política de privacidad interna; restringir acceso al terminal según operación. |
| Sin paginación (A7) | `fetchAllOrders()` carga todos los pedidos sin límite. | Implementar paginación o filtro por fecha cuando el volumen lo exija. |
| logAudit en functions/ (A3) | Flujo Stripe / createOrder no deja rastro en `auditoria` (ver O-03). | Inserción directa a Supabase desde Cloud Functions si negocio/ISO lo exige. |

---

## Trazabilidad CU-T07

Matriz canónica: `documentacion/cuadros-excel/CU-T07-matriz-pruebas-requisitos.csv` (TC-ORD-001…003).
