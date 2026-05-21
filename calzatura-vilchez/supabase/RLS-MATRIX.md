# Matriz RLS — Supabase (fuente de verdad en `migrations/`)

| Tabla | RLS | Acceso anon (navegador) | Escritura / lectura sensible |
|-------|-----|-------------------------|------------------------------|
| `productos` | Sí | SELECT solo `activo = true` | Admin: RPC `create_product_variants_atomic`, `update_product_atomic`, … |
| `productoCodigos` | Sí | SELECT (catálogo/admin) | Upsert vía RPC admin |
| `productoFinanzas` | Sí | **Sin SELECT** (revocado anon + authenticated) | BFF `GET /admin/productFinanzas` (admin), `GET /staff/productPriceRanges` (trabajador) |
| `pedidos` | Sí | **Denegado** | BFF `/myOrders`, `/admin/orders`, `createOrder` |
| `auditoria` | Sí | **Denegado** (REVOKE ALL) | BFF/service_role directo o RPC `insert_auditoria_event`, `list_auditoria_events` |
| `usuarios` | Sí | **Denegado** | BFF `/users/me`, `/admin/users` |
| `favoritos` | Sí | **Denegado** (REVOKE ALL) | BFF `/favorites` |
| `movimientosStock` | Sí | Sin políticas anon | Staff/admin vía RPC |
| `campanasDetectadas` + v2 | Sí | SELECT campañas (políticas en migraciones) | IA/service role |
| `ventasDiarias` | Sí | **Denegado** (REVOKE ALL) | BFF `/admin/dailySales*`, `/staff/dailySales*` (lectura, registro, devolución) |
| `productos` (panel staff) | Sí | Catálogo público activos | BFF `GET /staff/products` (solo activos); admin `GET /admin/products` (todos) |
| `pedidos` (panel staff) | Sí | **Denegado** directo | BFF `GET /staff/orders` (trabajador), `GET /admin/orders` (admin) |

Validar en CI: `node scripts/validate-supabase-migrations.mjs` (raíz del monorepo).
