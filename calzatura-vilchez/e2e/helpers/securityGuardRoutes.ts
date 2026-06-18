/**
 * Rutas que deben exigir sesión — fuente única para E2E Seguridad (RNF-SEG-01).
 * Mantener alineado con src/routes/paths.ts y App.tsx.
 */
export const ADMIN_GUARD_PATHS = [
  "/admin",
  "/admin/productos",
  "/admin/pedidos",
  "/admin/ventas",
  "/admin/usuarios",
  "/admin/fabricantes",
  "/admin/predicciones",
  "/admin/datos",
  "/admin/libro-reclamaciones",
] as const;

export const STAFF_GUARD_PATHS = [
  "/staff",
  "/staff/pedidos",
  "/staff/ventas",
  "/staff/libro-reclamaciones",
] as const;

export const CLIENT_GUARD_PATHS = [
  "/checkout",
  "/mis-pedidos",
  "/perfil",
  "/favoritos",
] as const;
