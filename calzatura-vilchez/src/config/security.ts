// En producción este set está vacío — el backend es la única fuente de verdad
// para privilegios de superadmin (variable de entorno SUPERADMIN_EMAILS en el BFF).
// En desarrollo se puede setear VITE_SUPERADMIN_EMAILS en .env.local para probar la UI.
export function isSuperAdminEmail(email?: string | null): boolean {
  const normalizedEmail = (email ?? "").trim().toLowerCase();
  if (!normalizedEmail) return false;
  if (import.meta.env.PROD) return false;
  const emails = ((import.meta.env.VITE_SUPERADMIN_EMAILS as string | undefined) ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return emails.includes(normalizedEmail);
}
