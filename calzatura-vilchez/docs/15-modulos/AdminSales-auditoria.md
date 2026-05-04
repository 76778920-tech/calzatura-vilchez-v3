# Auditoría del módulo AdminSales

| Campo | Valor |
|---|---|
| Módulo | AdminSales (`src/domains/ventas/pages/AdminSales.tsx`) |
| Requisito relacionado | RF ventas — IN-20 Registro de venta diaria, IN-21 Devoluciones, IN-22 Stock por talla en venta |
| Fecha de auditoría | 2026-05-02 |
| Commit base | `4f6ce4c` (rama `main`) |
| Auditado por | Revisión interna + análisis estático + E2E |

---

## Alcance del módulo

Formulario de registro de ventas con búsqueda de producto por marca y código, selección de color y talla, control de stock disponible en el cliente, líneas pendientes por registrar, emisión de nota de venta / guía de remisión, consulta de ventas del día y devoluciones con restauración de stock.

---

## Hallazgos y estado

### S-01 — Race condition en escritura de stock (integridad de datos)

**Severidad:** Alta — riesgo directo de oversell y stock negativo en escenarios de concurrencia.

**Antes:** `registerPendingLines` calculaba el nuevo valor absoluto de stock y tallaStock usando el estado React del cliente (`product.stock`, `product.tallaStock`) y llamaba a `updateProduct` con ese valor calculado. Si dos sesiones de AdminSales vendían el mismo par de tallas simultáneamente, ambas leían el mismo stock inicial y calculaban el mismo decremento; la segunda escritura pisaba la primera sin saberlo.

Lo mismo ocurría en `handleReturn`: `buildStockRestore` sumaba `product.stock + sale.cantidad` con el valor en memoria del cliente antes de llamar a `updateProduct`.

**Después:**

- Migración `20260502130000_atomic_stock_rpc.sql` con dos funciones PostgreSQL:

| Función | Propósito |
|---|---|
| `decrement_product_stock(p_product_id, p_lines jsonb)` | Descuenta stock y tallaStock para un array de líneas de venta. Usa `SELECT … FOR UPDATE` para bloquear la fila durante la transacción. |
| `restore_product_stock(p_product_id, p_talla, p_cantidad)` | Restaura stock de una talla individual en una devolución. También usa `FOR UPDATE`. |

- Migración `20260502140000_grant_stock_rpc_to_anon.sql`: `GRANT EXECUTE` a `anon` para ambas RPC. El cliente usa la clave **anon** de PostgREST (Firebase Auth, no Supabase Auth); sin esto, `supabase.rpc()` falla en producción. Son **SECURITY DEFINER**; conviene un proxy con `service_role` si se requiere endurecer permisos.

- Ambas funciones recalculan `stock`, `tallaStock` y `tallas` dentro de la misma transacción de BD; nunca leen datos del cliente.
- Nuevas funciones de servicio `decrementProductStock` y `restoreProductStock` en `finance.ts` usando `supabase.rpc()`.
- `AdminSales.tsx`: eliminados los helpers de cálculo en cliente `buildProductUpdate` y `buildStockRestore`; eliminado el import de `updateProduct`; ambos sitios de llamada reemplazados con las RPCs atómicas.

**Estado:** ✅ Cerrado

---

### S-02 — Sin cobertura E2E

**Severidad:** Media (cobertura) — módulo con lógica financiera crítica sin tests automatizados.

**Antes:** No existía ningún spec E2E bajo `e2e/` para AdminSales. Los flujos de registro, validación de stock y devolución solo estaban cubiertos por prueba manual.

**Después:**

Nuevo spec `e2e/admin-sales.spec.ts` (4 tests):

| ID | Descripción | Trazabilidad formato-09 | Estado |
|---|---|---|---|
| TC-SALE-001 | Flujo completo de venta — se emite POST a `decrement_product_stock` (assert vía `waitForRequest`) | IN-20 + IN-22 | ✅ |
| TC-SALE-002 | Cantidad mayor al stock disponible bloquea agregar la línea | IN-22 | ✅ |
| TC-SALE-003 | Devolución sin motivo muestra toast y no llama `restore_product_stock` | IN-21 | ✅ |
| TC-SALE-004 | Devolución con motivo llama `restore_product_stock` y muestra confirmación | IN-21 + IN-22 | ✅ |

**Estado:** ✅ Cerrado

---

### S-03 — Política A3: ausencia de logAudit en ventas y devoluciones

**Severidad:** Media (ISO 9001 — trazabilidad)

**Contexto:** `registerPendingLines` y `handleReturn` no llaman a `logAudit`. A diferencia de productos y pedidos, las ventas en `ventasDiarias` no quedan en el historial de auditoría del dashboard.

**Decisión (sprint actual):** Riesgo aceptado. Los registros en `ventasDiarias` ya son auditables directamente (contienen `userId`, `fecha`, `talla`, `cantidad`). La fila de venta es el propio log. Agregar `logAudit("registrar_venta", ...)` elevaría el volumen de la tabla `auditoria` sin añadir información nueva para los casos de uso actuales del negocio.

**Recomendación futura:** Si el negocio exige historial de quién anuló o devolvió una venta (p. ej. para detectar fraude interno), implementar `logAudit("devolver_venta", "venta", saleId, motivo)` en `handleReturn`.

**Estado:** ⚠️ Riesgo documentado y aceptado conscientemente.

---

## Riesgos aceptados (no corregidos en este sprint)

| Riesgo | Descripción | Recomendación |
|---|---|---|
| Mantenibilidad (ISO 25010) | `AdminSales.tsx` tiene ~990 líneas. Concentra búsqueda, selección de variante, detalle de líneas, documentos de venta y devoluciones. | Extraer `SaleDetailModal` cuando el equipo tenga capacidad. No es urgente mientras los tests cubran las rutas críticas. |
| Validación de precio fuera de rango | El frontend valida que `salePrice` esté entre `precioMinimo` y `precioMaximo`, pero no hay trigger de BD que lo rechace si la llamada llega directamente a la API de Supabase. | Agregar trigger `cv_guard_venta_precio` en `ventasDiarias` en un sprint posterior. |
| Documento impreso (popup bloqueado) | `openSaleDocumentWindow` abre una ventana emergente; si el navegador la bloquea, la venta ya se registró pero el documento no se genera. No hay retry. | Considerar generación de PDF en servidor (Cloud Function) para evitar dependencia del popup. |
| Transacción ventas + stock | `registerPendingLines` inserta todas las filas en `ventasDiarias` y luego llama a `decrementProductStock` por producto. No hay una sola transacción DB que englobe inserción + decremento; si el RPC falla a mitad, puede quedar desalineación (menos frecuente que la carrera de escritura ya resuelta). | Roadmap: RPC única “registrar ventas con stock” o compensación / rollback explícito. |

---

## Validación manual recomendada (QA en hardware)

- Abrir dos pestañas de AdminSales en el mismo navegador y registrar ventas del mismo producto simultáneamente — verificar que el stock final en BD sea coherente.
- Probar flujo de devolución desde móvil (Safari iOS) — confirmar que el modal de detalle de venta es desplazable y el textarea es usable con teclado virtual.
