import { getBackendApiBaseUrl } from "@/config/apiBackend";
import type { ComplaintFormData } from "@/domains/publico/utils/complaintBook";

export type ComplaintRecord = ComplaintFormData & {
  codigo: string;
  canal: string;
  estado: string;
  creadoEn: string;
  actualizadoEn: string;
  notasInternas?: string | null;
};

export type SubmitComplaintResponse = {
  codigo: string;
  submittedAt: string;
  complaint: ComplaintRecord;
};

export type ComplaintLookupRecord = Pick<ComplaintRecord, "codigo" | "tipo" | "estado" | "creadoEn">;

export async function submitComplaintToServer(
  data: ComplaintFormData,
  aceptaPrivacidad: boolean,
): Promise<SubmitComplaintResponse> {
  const base = getBackendApiBaseUrl();
  if (!base) {
    throw new Error("El registro en línea no está disponible en este momento. Usa tienda o WhatsApp.");
  }

  let response: Response;
  try {
    response = await fetch(`${base}/libro-reclamaciones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        canal: "web",
        aceptaPrivacidad,
      }),
    });
  } catch {
    throw new Error("No se pudo conectar con el servidor. Intenta de nuevo o usa WhatsApp.");
  }

  const payload = (await response.json().catch(() => ({}))) as SubmitComplaintResponse & {
    error?: string;
    fields?: Record<string, string>;
  };

  if (!response.ok) {
    const fieldMsg = payload.fields ? Object.values(payload.fields)[0] : undefined;
    throw new Error(fieldMsg || payload.error || "No se pudo registrar la hoja");
  }

  return payload;
}

export async function lookupComplaintByCode(codigo: string, dni: string): Promise<ComplaintLookupRecord> {
  const base = getBackendApiBaseUrl();
  if (!base) {
    throw new Error("La consulta en línea no está disponible en este momento.");
  }

  let response: Response;
  try {
    const query = new URLSearchParams({
      codigo: codigo.trim().toUpperCase(),
      dni: dni.trim(),
    });
    response = await fetch(`${base}/libro-reclamaciones/consulta-codigo?${query.toString()}`, {
      method: "GET",
    });
  } catch {
    throw new Error("No se pudo conectar con el servidor. Intenta de nuevo en unos segundos.");
  }

  const payload = (await response.json().catch(() => ({}))) as {
    complaint?: ComplaintLookupRecord;
    error?: string;
    fields?: Record<string, string>;
  };
  if (!response.ok || !payload.complaint) {
    const fieldMsg = payload.fields ? Object.values(payload.fields)[0] : undefined;
    throw new Error(fieldMsg || payload.error || "No se pudo consultar la hoja");
  }
  return payload.complaint;
}
