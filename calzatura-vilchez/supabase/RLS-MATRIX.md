# Matriz RLS — Supabase (fuente de verdad en `migrations/`)

La **anon key** del cliente web está en el bundle: cualquier atacante puede invocar **PostgREST** sin pasar por Vue/React ni por el BFF. Los tests de CI **no sustituyen** RLS; solo comprueban que *nuestro* código no muta por error.

## Defensa en profundidad (solo web)

| Capa | Qué garantiza | Cómo se valida en CI |
|------|----------------|----------------------|
| **1 — Código** | `src/` no llama `insert` / `update` / `upsert` / `delete` ni RPC mutantes contra Supabase | Vitest `src/__tests__/supabaseDirectAccessGuard.test.js` |
| **2 — Base de datos** | `anon` y `authenticated` no leen ni escriben tablas sensibles; catálogo `productos` solo activos | `node scripts/validate-supabase-rls-matrix.mjs` contra `rls-matrix.contract.json` + migraciones acumuladas |
| **3 — Operación** | Mutaciones de negocio solo vía BFF (`service_role`) | Revisión de rutas en `bff/server.cjs`; despliegue con secretos solo en servidor |

Contrato machine-readable: [`rls-matrix.contract.json`](./rls-matrix.contract.json).

Migración de cierre de huecos (FORCE RLS, REVOKE faltantes): `20260529140000_harden_anon_authenticated_data_plane.sql`.

---

## Tablas y roles

| Tabla | RLS + FORCE | Acceso anon (navegador) | Escritura / lectura sensible |
|-------|-------------|-------------------------|------------------------------|
| `productos` | Sí | SELECT solo `activo IS TRUE` | Admin: RPC `create_product_variants_atomic`, `update_product_atomic`, … |
| `productoCodigos` | Sí | **Sin SELECT** (REVOKE) | Metadatos vía BFF / RPC admin |
| `productoFinanzas` | Sí | **Sin SELECT** (REVOKE) | BFF `GET /admin/productFinanzas`, `GET /staff/productPriceRanges` |
| `pedidos` | Sí + FORCE | **Denegado** (REVOKE ALL) | BFF `/myOrders`, `/admin/orders`, `createOrder` |
| `usuarios` | Sí + FORCE | **Denegado** | BFF `/users/me`, `/admin/users` |
| `favoritos` | Sí + FORCE | **Denegado** | BFF `/favorites` |
| `auditoria` | Sí + FORCE | **Denegado** | BFF / RPC `insert_auditoria_event`, `list_auditoria_events` |
| `ventasDiarias` | Sí + FORCE | **Denegado** | BFF `/admin/dailySales*`, `/staff/dailySales*` |
| `libro_reclamaciones` | Sí + FORCE | **Denegado** | BFF reclamaciones |
| `movimientosStock` | Sí + FORCE | **Denegado** (sin política anon) | Staff/admin vía RPC SECURITY DEFINER + BFF |
| `ireHistorial` | Sí + FORCE | **Denegado** | BFF / service_role |
| `fabricantes` | Sí + FORCE | **Denegado** | BFF / admin |
| `modeloEstado` | Sí + FORCE | **Denegado** | IA / BFF |
| `campanasDetectadas` + v2 | Sí | SELECT según políticas de campaña | IA / service role |

---

## Comandos locales

```bash
# Orden y sintaxis de migraciones
node scripts/validate-supabase-migrations.mjs

# Contrato RLS (capa 2)
node scripts/validate-supabase-rls-matrix.mjs
```

Aplicar en remoto (según vuestro runbook): `supabase db push` o pipeline de migraciones acordado.
