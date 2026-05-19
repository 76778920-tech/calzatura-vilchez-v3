import type { UserRole } from "@/types";
import { isAdminRole } from "../security/accessControl";
import { ADMIN_ROUTES, HR_ROUTES, PSYCHOLOGY_ROUTES, PUBLIC_ROUTES, STAFF_ROUTES } from "./paths";

function hasAsciiControlChars(path: string): boolean {
  for (let i = 0; i < path.length; i++) {
    const c = path.codePointAt(i) ?? 0;
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

export function isStaffPath(path: string) {
  return path === STAFF_ROUTES.home || path.startsWith(`${STAFF_ROUTES.home}/`);
}

export function isPsychologyPath(path: string) {
  return path === PSYCHOLOGY_ROUTES.home || path.startsWith(`${PSYCHOLOGY_ROUTES.home}/`);
}

export function isHrPath(path: string) {
  return path === HR_ROUTES.home || path.startsWith(`${HR_ROUTES.home}/`);
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

  if (role === "trabajador") {
    return safeRedirect && isStaffPath(safeRedirect)
      ? safeRedirect
      : STAFF_ROUTES.home;
  }

  if (role === "psicologo") {
    return safeRedirect && isPsychologyPath(safeRedirect)
      ? safeRedirect
      : PSYCHOLOGY_ROUTES.home;
  }

  if (role === "rrhh") {
    return safeRedirect && isHrPath(safeRedirect)
      ? safeRedirect
      : HR_ROUTES.home;
  }

  if (safeRedirect && !isAdminPath(safeRedirect)) {
    return safeRedirect;
  }

  return PUBLIC_ROUTES.home;
}
