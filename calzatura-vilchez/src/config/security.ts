const DEFAULT_SUPERADMIN_EMAILS = ["76778920@continental.edu.pe"];

const SUPERADMIN_EMAILS = new Set<string>([
  ...DEFAULT_SUPERADMIN_EMAILS.map((email) => email.trim().toLowerCase()),
  ...((import.meta.env.VITE_SUPERADMIN_EMAILS as string | undefined)
    ?.split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean) ?? []),
]);

export function isSuperAdminEmail(email?: string | null) {
  const normalizedEmail = (email ?? "").trim().toLowerCase();
  return SUPERADMIN_EMAILS.has(normalizedEmail);
}
