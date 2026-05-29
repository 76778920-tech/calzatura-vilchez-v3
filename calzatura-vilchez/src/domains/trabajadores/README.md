# Trabajadores — panel de tienda

Rol `trabajador` en `usuarios.rol`. Acceso vía Firebase Auth + perfil Supabase.

Cumplimiento interno ISO (27001 / 25010 / 9001): `docs/ISO-CUMPLIMIENTO-INTERNO.md`.

## Rutas UI

| Ruta | Pantalla |
|------|----------|
| `/staff` | Inicio |
| `/staff/pedidos` | Pedidos (`AdminOrders` con scope staff) |
| `/staff/ventas` | **StaffSales** — ventas diarias propias (`/staff/dailySales*`), sin costos ni ganancia en UI |

Login redirige a `/staff` (`redirects.ts`). Admin sigue en `/admin`.

## API BFF (trabajador)

- `GET /staff/orders` (PII enmascarado: email, teléfono, calle y referencia; se conserva distrito/ciudad para despacho)
- `POST /staff/dailySales/register`, `/staff/dailySales/return`
- `POST /updateOrderStatus` (admin o trabajador)

No usar rutas `/admin/*` desde el panel staff: el BFF responde 403. La pantalla **StaffSales** (`useStaffSalesPage`) llama solo a `/staff/*`; **AdminSales** en `/admin/ventas` usa solo `/admin/*` (alcance fijo por ruta, no por rol en runtime).

## Backend

- Supabase: `ventasDiarias` y `productoFinanzas` sin acceso directo desde cliente (migraciones `20260519140000`, `20260519140100`).
- Frontend: `PanelFetchScope` en `src/security/panelScope.ts`.
