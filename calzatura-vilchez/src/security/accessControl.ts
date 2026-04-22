import type { UserRole } from "@/types";
import { isSuperAdminEmail } from "@/config/security";

export type AccessArea =
  | "publico"
  | "clientes"
  | "administradores"
  | "trabajadores"
  | "carrito"
  | "productos"
  | "fabricantes"
  | "ventas"
  | "pedidos"
  | "usuarios";

export const AREA_ALLOWED_ROLES: Record<AccessArea, UserRole[] | "public"> = {
  publico: "public",
  productos: "public",
  carrito: "public",
  clientes: ["usuario", "cliente", "trabajador", "admin"],
  pedidos: ["usuario", "cliente", "trabajador", "admin"],
  administradores: ["admin"],
  trabajadores: ["trabajador", "admin"],
  fabricantes: ["admin"],
  ventas: ["admin"],
  usuarios: ["admin"],
};

export function canAccessArea(
  area: AccessArea,
  role?: UserRole | null,
  email?: string | null
) {
  const allowedRoles = AREA_ALLOWED_ROLES[area];
  if (allowedRoles === "public") return true;
  if (isSuperAdminEmail(email)) return true;
  return Boolean(role && allowedRoles.includes(role));
}

export function isAdminRole(role?: UserRole | null, email?: string | null) {
  return isSuperAdminEmail(email) || role === "admin";
}
