export const SUPERADMIN_EMAIL = "76778920@continental.edu.pe";

export function isSuperAdminEmail(email?: string | null) {
  return email === SUPERADMIN_EMAIL;
}
