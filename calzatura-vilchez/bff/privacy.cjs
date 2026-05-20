/** Enmascaramiento PII para panel trabajador (pedidos web). Mantener alineado con src/security/orderPrivacy.ts */

function maskEmail(email) {
  const s = String(email || "").trim();
  const at = s.indexOf("@");
  if (at <= 0) return "***";
  const local = s.slice(0, at);
  const domain = s.slice(at);
  if (!local) return `***${domain}`;
  return `${local[0]}***${domain}`;
}

function maskPhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length < 4) return "***";
  return `***${digits.slice(-4)}`;
}

function maskPersonName(value) {
  const s = String(value || "").trim();
  if (!s) return "";
  if (s.length <= 1) return s;
  return `${s[0]}${"*".repeat(Math.min(3, s.length - 1))}`;
}

function redactOrderForStaff(order) {
  if (!order || typeof order !== "object") {
    return order;
  }
  const dir =
    order.direccion && typeof order.direccion === "object"
      ? { ...order.direccion }
      : {};
  const distrito = String(dir.distrito || "").trim();
  const ciudad = String(dir.ciudad || "").trim();
  const locationHint = [distrito, ciudad].filter(Boolean).join(", ") || "ubicación reservada";

  const redacted = {
    ...order,
    userId: "",
    userEmail: maskEmail(order.userEmail),
    direccion: {
      ...dir,
      nombre: maskPersonName(dir.nombre) || "Cliente",
      apellido: maskPersonName(dir.apellido),
      telefono: maskPhone(dir.telefono),
      direccion: `Entrega: ${locationHint}`,
      referencia: undefined,
    },
  };
  delete redacted.stripeSessionId;
  delete redacted.idempotencyKey;
  if (redacted.direccion) {
    delete redacted.direccion.referencia;
  }
  return redacted;
}

module.exports = {
  maskEmail,
  maskPhone,
  maskPersonName,
  redactOrderForStaff,
};
