# Matriz RLS — Supabase (fuente de verdad en `migrations/`)

| Tabla | RLS | Acceso anon (navegador) | Escritura / lectura sensible |
|-------|-----|-------------------------|------------------------------|
| `productos` | Sí | SELECT solo `activo = true` | Admin: RPC `create_product_variants_atomic`, `update_product_atomic`, … |
| `productoCodigos` | Sí | SELECT (catálogo/admin) | Upsert vía RPC admin |
| `productoFinanzas` | Sí | **Sin SELECT** (revocado) | BFF `GET /admin/productFinanzas` + RPC |
| `pedidos` | Sí | **Denegado** | BFF `/myOrders`, `/admin/orders`, `createOrder` |
| `usuarios` | Sí | **Denegado** | BFF `/users/me`, `/admin/users` |
| `favoritos` | Sí | **Denegado** (REVOKE ALL) | BFF `/favorites` |
| `movimientosStock` | Sí | Sin políticas anon | Staff/admin vía RPC |
| `campanasDetectadas` + v2 | Sí | SELECT campañas (políticas en migraciones) | IA/service role |
| `ventasDiarias` | Parcial | INSERT/SELECT según grants | BFF `admin/dailySales` preferido |

Validar en CI: `node scripts/validate-supabase-migrations.mjs` (raíz del monorepo).
