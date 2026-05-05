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

export async function logAudit(
  accion: AuditAction,
  entidad: AuditEntity,
  entidadId: string,
  entidadNombre: string,
  detalle?: Record<string, unknown>,
): Promise<void> {
  try {
    const user = auth.currentUser;
    await supabase.from("auditoria").insert({
      accion,
      entidad,
      entidadId,
      entidadNombre,
      detalle: detalle ?? null,
      usuarioUid: user?.uid ?? null,
      usuarioEmail: user?.email ?? null,
      realizadoEn: new Date().toISOString(),
    });
  } catch (err) {
    // La auditoría nunca debe interrumpir la operación principal, pero sí registrar el fallo
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
