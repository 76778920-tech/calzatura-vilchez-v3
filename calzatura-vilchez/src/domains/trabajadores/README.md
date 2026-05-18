# Trabajadores — panel de tienda

Rol `trabajador` en `usuarios.rol`. Acceso vía Firebase Auth + perfil Supabase.

## Rutas

| Ruta | Pantalla |
|------|----------|
| `/staff` | Inicio |
| `/staff/pedidos` | Pedidos (`AdminOrders` compartido) |
| `/staff/ventas` | Ventas diarias (`AdminSales` compartido) |

Login redirige a `/staff` (`redirects.ts`). Admin sigue en `/admin`.

## Backend

- BFF: `assertStaffRole` en pedidos, ventas, productos admin.
- Supabase: mismas políticas RLS que admin para datos sensibles (vía BFF).
