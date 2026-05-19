import type { UserRole } from "@/types";
import { isSuperAdminEmail } from "@/config/security";

export type AccessArea =
  | "publico"
  | "clientes"
  | "administradores"
  | "trabajadores"
  | "psicologos"
  | "rrhh"
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
  clientes: ["cliente", "trabajador", "admin"],
  pedidos: ["cliente", "trabajador", "admin"],
  administradores: ["admin"],
  trabajadores: ["trabajador", "admin"],
  psicologos: ["psicologo", "admin"],
  rrhh: ["rrhh", "admin"],
  fabricantes: ["admin"],
  ventas: ["admin", "trabajador"],
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
