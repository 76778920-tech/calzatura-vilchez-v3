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
