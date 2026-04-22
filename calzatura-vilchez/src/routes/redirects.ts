import type { UserRole } from "@/types";
import { isAdminRole } from "../security/accessControl";
import { ADMIN_ROUTES, PUBLIC_ROUTES } from "./paths";

export function isSafeInternalRedirect(path: string | null): path is string {
  if (!path) return false;
  if (!path.startsWith("/") || path.startsWith("//")) return false;
  if (path.includes("\\") || path.includes("\n") || path.includes("\r")) return false;
  return true;
}

export function isAdminPath(path: string) {
  return path === ADMIN_ROUTES.dashboard || path.startsWith(`${ADMIN_ROUTES.dashboard}/`);
}

export function getPostLoginRedirect({
  redirect,
  role,
  email,
}: {
  redirect: string | null;
  role?: UserRole | null;
  email?: string | null;
}) {
  const safeRedirect = isSafeInternalRedirect(redirect) ? redirect : null;

  if (isAdminRole(role, email)) {
    return safeRedirect && isAdminPath(safeRedirect)
      ? safeRedirect
      : ADMIN_ROUTES.dashboard;
  }

  if (safeRedirect && !isAdminPath(safeRedirect)) {
    return safeRedirect;
  }

  return PUBLIC_ROUTES.home;
}
