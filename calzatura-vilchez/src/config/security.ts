// En producción este set está vacío — el backend es la única fuente de verdad
// para privilegios de superadmin (variable de entorno SUPERADMIN_EMAILS en el BFF).
// En desarrollo se puede setear VITE_SUPERADMIN_EMAILS en .env.local para probar la UI.
const SUPERADMIN_EMAILS = new Set<string>(
  import.meta.env.DEV
    ? ((import.meta.env.VITE_SUPERADMIN_EMAILS as string | undefined) ?? "")
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean)
    : [],
);

export function isSuperAdminEmail(email?: string | null) {
  const normalizedEmail = (email ?? "").trim().toLowerCase();
  return SUPERADMIN_EMAILS.has(normalizedEmail);
}
