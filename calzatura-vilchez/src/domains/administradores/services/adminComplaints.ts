import { bffFetch } from "@/utils/bffClient";
import type { ComplaintRecord } from "@/domains/publico/services/libroReclamaciones";
import type { ComplaintFormData } from "@/domains/publico/utils/complaintBook";
import type { PanelFetchScope } from "@/security/panelScope";

export type ComplaintEstado = "recibido" | "en_tramite" | "respondido" | "cerrado";

const ESTADO_PATH: Record<ComplaintEstado, string> = {
  recibido: "recibido",
  en_tramite: "en_tramite",
  respondido: "respondido",
  cerrado: "cerrado",
};

export function complaintsListPath(scope: PanelFetchScope, estado?: ComplaintEstado): string {
  const base = scope === "admin" ? "/admin/libro-reclamaciones" : "/staff/libro-reclamaciones";
  if (!estado) return base;
  return `${base}?estado=${encodeURIComponent(ESTADO_PATH[estado])}`;
}

export function complaintPatchPath(scope: PanelFetchScope, codigo: string): string {
  const base = scope === "admin" ? "/admin/libro-reclamaciones" : "/staff/libro-reclamaciones";
  return `${base}/${encodeURIComponent(codigo)}`;
}

export async function fetchComplaints(
  scope: PanelFetchScope,
  estado?: ComplaintEstado,
): Promise<ComplaintRecord[]> {
  const { complaints } = await bffFetch<{ complaints: ComplaintRecord[] }>(
    complaintsListPath(scope, estado),
  );
  return complaints ?? [];
}

export async function updateComplaintStatus(
  scope: PanelFetchScope,
  codigo: string,
  patch: { estado?: ComplaintEstado; notasInternas?: string | null },
): Promise<ComplaintRecord> {
  const { complaint } = await bffFetch<{ complaint: ComplaintRecord }>(
    complaintPatchPath(scope, codigo),
    {
      method: "PATCH",
      body: JSON.stringify(patch),
    },
  );
  return complaint;
}

export type PanelComplaintCreateInput = ComplaintFormData & {
  canal: "tienda" | "whatsapp";
};

export async function createComplaintFromPanel(
  scope: PanelFetchScope,
  payload: PanelComplaintCreateInput,
): Promise<ComplaintRecord> {
  const base = scope === "admin" ? "/admin/libro-reclamaciones" : "/staff/libro-reclamaciones";
  const { complaint } = await bffFetch<{ complaint: ComplaintRecord }>(base, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return complaint;
}
