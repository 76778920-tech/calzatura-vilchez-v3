/** Enmascara correo para UI (hombro ajeno / capturas); no sustituye protección ante XSS. */
export function maskEmailForDisplay(email: string): string {
  const trimmed = email.trim();
  const at = trimmed.indexOf("@");
  if (at <= 0) return "tu correo";
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  if (!domain) return "tu correo";
  const visible = local.length <= 2 ? local.slice(0, 1) : local.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(1, local.length - visible.length))}@${domain}`;
}

export function maskDniForDisplay(dni: string | undefined | null): string {
  const digits = String(dni || "").replace(/\D/g, "");
  if (digits.length >= 4) return `****${digits.slice(-4)}`;
  const visibleSuffix = String(dni || "").trim().slice(-4);
  return visibleSuffix ? `****${visibleSuffix}` : "Sin DNI";
}
