/**
 * Minimización de PII en auditoría (ISO 27001 / 27701).
 * Usado por BFF y Cloud Functions; la BD aplica el mismo contrato vía trigger.
 */

const AUDIT_REDACTED = "[redacted]";

const ENTITY_REF_ENTITIES = new Set(["usuario", "fabricante", "pedido", "venta", "importar"]);

function isSensitiveAuditKey(key) {
  const k = String(key || "").toLowerCase();
  if (["authorization", "cookie", "jwt", "dni", "documento", "documentonumero", "email", "correo"].includes(k)) {
    return true;
  }
  if (k === "useremail" || k === "usuarioemail" || k.endsWith("email")) return true;
  if (k.includes("telefono") || k.includes("celular") || k.includes("direccion") || k.includes("referencia")) {
    return true;
  }
  if (k.includes("password") || k.includes("passwd") || k.includes("contrase")) return true;
  if (/(^|_)api[_-]?key($|_)/.test(k) || k.endsWith("apikey")) return true;
  if (/(^|_)(access|refresh|id|bearer|session)?token($|_)/.test(k) || k.endsWith("token")) return true;
  if (k.includes("secret") || k.includes("bearer")) return true;
  return false;
}

function sanitizeAuditEmail(value) {
  const email = String(value || "").trim();
  if (!email) return null;
  if (/^[^@]+\*\*\*@[^@]+$/.test(email)) return email;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return email || null;
  const [local, domain] = email.split("@", 2);
  return `${local.slice(0, 2)}***@${domain}`;
}

function sanitizeAuditLabel(value) {
  const label = String(value || "").trim();
  if (/^\d{8}$/.test(label)) return AUDIT_REDACTED;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(label)) return sanitizeAuditEmail(label);
  return label;
}

function safeAuditEntityRef(entidad, entidadId) {
  const id = String(entidadId || "").trim();
  const suffix = id.length > 8 ? id.slice(-8) : id || "sin-id";
  return `${entidad}:${suffix}`;
}

function sanitizeAuditEntityLabel(entidad, entidadId, entidadNombre) {
  const entity = String(entidad || "").trim();
  if (ENTITY_REF_ENTITIES.has(entity)) {
    return safeAuditEntityRef(entity, entidadId);
  }
  return sanitizeAuditLabel(entidadNombre);
}

function sanitizeAuditValue(value) {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(sanitizeAuditValue);
  if (typeof value === "object") {
    const out = {};
    for (const [key, inner] of Object.entries(value)) {
      out[key] = isSensitiveAuditKey(key) ? AUDIT_REDACTED : sanitizeAuditValue(inner);
    }
    return out;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return sanitizeAuditEmail(trimmed);
    if (/^\d{8}$/.test(trimmed)) return AUDIT_REDACTED;
  }
  return value;
}

function sanitizeAuditEntryForResponse(entry) {
  if (!entry || typeof entry !== "object") return entry;
  return {
    ...entry,
    entidadNombre: sanitizeAuditEntityLabel(entry.entidad, entry.entidadId, entry.entidadNombre),
    detalle: entry.detalle == null ? null : sanitizeAuditValue(entry.detalle),
    usuarioEmail: entry.usuarioEmail == null ? null : sanitizeAuditEmail(entry.usuarioEmail),
  };
}

module.exports = {
  AUDIT_REDACTED,
  ENTITY_REF_ENTITIES,
  isSensitiveAuditKey,
  sanitizeAuditEmail,
  sanitizeAuditLabel,
  safeAuditEntityRef,
  sanitizeAuditEntityLabel,
  sanitizeAuditValue,
  sanitizeAuditEntryForResponse,
};
