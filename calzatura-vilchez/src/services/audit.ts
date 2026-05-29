import { bffFetch } from "@/utils/bffClient";

export type AuditAction =
  | "crear"
  | "editar"
  | "eliminar"
  | "cambiar_estado"
  | "importar";

export type AuditEntity =
  | "producto"
  | "pedido"
  | "fabricante"
  | "usuario"
  | "venta"
  | "importar";

export interface AuditEntry {
  id: string;
  accion: AuditAction;
  entidad: AuditEntity;
  entidadId: string | null;
  entidadNombre: string | null;
  detalle: Record<string, unknown> | null;
  usuarioUid: string | null;
  usuarioEmail: string | null;
  realizadoEn: string;
}

const REDACTED = "[redacted]";

function isSensitiveAuditKey(key: string): boolean {
  const k = key.toLowerCase();
  if (["authorization", "cookie", "jwt", "dni", "documento", "documentonumero", "email", "correo", "useremail", "usuarioemail"].includes(k)) return true;
  if (k.endsWith("email")) return true;
  if (k.includes("telefono") || k.includes("celular") || k.includes("direccion") || k.includes("referencia")) return true;
  if (k.includes("password") || k.includes("passwd") || k.includes("contrase")) return true;
  if (/(^|_)api[_-]?key($|_)/.test(k) || k.endsWith("apikey")) return true;
  if (/(^|_)(access|refresh|id|bearer|session)?token($|_)/.test(k) || k.endsWith("token")) return true;
  if (k.includes("secret") || k.includes("bearer")) return true;
  return false;
}

function sanitizeAuditLabel(value: string): string {
  const trimmed = value.trim();
  if (/^\d{8}$/.test(trimmed)) return REDACTED;
  const emailMatch = trimmed.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  if (!emailMatch) return trimmed;
  const [local, domain] = trimmed.split("@", 2);
  return `${local.slice(0, 2)}***@${domain}`;
}

function safeEntityRef(entidad: AuditEntity, entidadId: string): string {
  const id = entidadId.trim();
  const suffix = id.length > 8 ? id.slice(-8) : id || "sin-id";
  return `${entidad}:${suffix}`;
}

function sanitizeAuditEntityLabel(entidad: AuditEntity, entidadId: string, value: string): string {
  if (["usuario", "pedido", "venta", "fabricante", "importar"].includes(entidad)) {
    return safeEntityRef(entidad, entidadId);
  }
  return sanitizeAuditLabel(value);
}

function sanitizeAuditValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(sanitizeAuditValue);
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(obj)) {
      out[key] = isSensitiveAuditKey(key) ? REDACTED : sanitizeAuditValue(v);
    }
    return out;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return sanitizeAuditLabel(trimmed);
    if (/^\d{8}$/.test(trimmed)) return REDACTED;
  }
  return value;
}

/** `detalle` no debe incluir secretos ni PII; el BFF persiste con service_role. */
export async function logAudit(
  accion: AuditAction,
  entidad: AuditEntity,
  entidadId: string,
  entidadNombre: string,
  detalle?: Record<string, unknown>,
): Promise<void> {
  try {
    const safeDetalle = detalle == null ? null : (sanitizeAuditValue(detalle) as Record<string, unknown>);
    await bffFetch("/audit", {
      method: "POST",
      body: JSON.stringify({
        accion,
        entidad,
        entidadId,
        entidadNombre: sanitizeAuditEntityLabel(entidad, entidadId, entidadNombre),
        detalle: safeDetalle,
      }),
    });
  } catch (err) {
    console.error("[audit] logAudit fallo silenciosamente:", err);
  }
}

export async function fetchRecentAudit(limit = 20): Promise<AuditEntry[]> {
  const safeLimit = Math.min(Math.max(Math.trunc(limit) || 20, 1), 100);
  const { entries } = await bffFetch<{ entries: AuditEntry[] }>(`/admin/audit?limit=${safeLimit}`);
  return entries;
}
