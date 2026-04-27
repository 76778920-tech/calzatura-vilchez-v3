const SUPERADMIN_EMAILS = (import.meta.env.VITE_SUPERADMIN_EMAILS as string | undefined)
  ?.split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean) ?? [];

export function isSuperAdminEmail(email?: string | null) {
  const normalizedEmail = (email ?? "").trim().toLowerCase();
  const isMatch = SUPERADMIN_EMAILS.includes(normalizedEmail);

  return isMatch;
}
