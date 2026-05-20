/** Enmascaramiento PII pedidos para panel trabajador (también usado en tests). */

export function maskEmail(email: string): string {
  const s = String(email || "").trim();
  const at = s.indexOf("@");
  if (at <= 0) return "***";
  const local = s.slice(0, at);
  const domain = s.slice(at);
  if (!local) return `***${domain}`;
  return `${local[0]}***${domain}`;
}

export function maskPhone(phone: string): string {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length < 4) return "***";
  return `***${digits.slice(-4)}`;
}

export function maskPersonName(value: string): string {
  const s = String(value || "").trim();
  if (!s) return "";
  if (s.length <= 1) return s;
  return `${s[0]}${"*".repeat(Math.min(3, s.length - 1))}`;
}

export function redactOrderForStaff<T extends Record<string, unknown>>(order: T): T {
  if (!order || typeof order !== "object") {
    return order;
  }
  const dir =
    order.direccion && typeof order.direccion === "object"
      ? { ...(order.direccion as Record<string, unknown>) }
      : {};
  const distrito = String(dir.distrito || "").trim();
  const ciudad = String(dir.ciudad || "").trim();
  const locationHint = [distrito, ciudad].filter(Boolean).join(", ") || "ubicación reservada";

  const redacted = {
    ...order,
    userId: "",
    userEmail: maskEmail(String(order.userEmail || "")),
    direccion: {
      ...dir,
      nombre: maskPersonName(String(dir.nombre || "")) || "Cliente",
      apellido: maskPersonName(String(dir.apellido || "")),
      telefono: maskPhone(String(dir.telefono || "")),
      direccion: `Entrega: ${locationHint}`,
    },
  } as T & { stripeSessionId?: string; idempotencyKey?: string };

  delete redacted.stripeSessionId;
  delete redacted.idempotencyKey;
  if (redacted.direccion && typeof redacted.direccion === "object") {
    delete (redacted.direccion as Record<string, unknown>).referencia;
  }
  return redacted;
}
