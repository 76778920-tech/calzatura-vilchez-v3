import type { UserRole } from "@/types";
import { isAdminRole } from "../security/accessControl";
import { ADMIN_ROUTES, PUBLIC_ROUTES } from "./paths";

function hasAsciiControlChars(path: string): boolean {
  for (let i = 0; i < path.length; i++) {
    const c = path.charCodeAt(i);
    if (c < 32 || c === 127) return true;
  }
  return false;
}

export function isSafeInternalRedirect(path: string | null): path is string {
  if (!path) return false;
  if (!path.startsWith("/") || path.startsWith("//")) return false;
  if (path.includes("\\") || path.includes("\n") || path.includes("\r")) return false;
  if (hasAsciiControlChars(path)) return false;
  if (/https?:\/\//i.test(path)) return false;
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
