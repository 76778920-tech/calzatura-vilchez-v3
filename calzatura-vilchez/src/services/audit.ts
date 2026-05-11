import { supabase } from "@/supabase/client";
import { auth } from "@/firebase/config";

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
  if (k === "authorization" || k === "cookie" || k === "jwt") return true;
  if (k.includes("password") || k.includes("passwd") || k.includes("contrase")) return true;
  if (/(^|_)api[_-]?key($|_)/.test(k) || k.endsWith("apikey")) return true;
  if (/(^|_)(access|refresh|id|bearer|session)?token($|_)/.test(k) || k.endsWith("token")) return true;
  if (k.includes("secret") || k.includes("bearer")) return true;
  return false;
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
  return value;
}

/** `detalle` no debe incluir secretos; las claves sensibles se redactan al persistir. */
export async function logAudit(
  accion: AuditAction,
  entidad: AuditEntity,
  entidadId: string,
  entidadNombre: string,
  detalle?: Record<string, unknown>,
): Promise<void> {
  try {
    const user = auth.currentUser;
    const safeDetalle = detalle == null ? null : (sanitizeAuditValue(detalle) as Record<string, unknown>);
    const { error: dbError } = await supabase.from("auditoria").insert({
      accion,
      entidad,
      entidadId,
      entidadNombre,
      detalle: safeDetalle,
      usuarioUid: user?.uid ?? null,
      usuarioEmail: user?.email ?? null,
      realizadoEn: new Date().toISOString(),
    });
    if (dbError) {
      console.error("[audit] logAudit falló silenciosamente:", dbError);
    }
  } catch (err) {
    console.error("[audit] logAudit falló silenciosamente:", err);
  }
}

export async function fetchRecentAudit(limit = 20): Promise<AuditEntry[]> {
  const { data, error } = await supabase
    .from("auditoria")
    .select("*")
    .order("realizadoEn", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as AuditEntry[];
}
