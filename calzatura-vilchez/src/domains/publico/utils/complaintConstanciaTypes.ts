import type { ComplaintFormData } from "@/domains/publico/utils/complaintBook";

export type ComplaintConstanciaSubmission = ComplaintFormData & {
  codigo: string;
  submittedAt: string;
};

export function formatConstanciaFecha(iso: string): { fecha: string; hora: string } {
  const date = new Date(iso);
  return {
    fecha: date.toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }),
    hora: date.toLocaleTimeString("es-PE", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }),
  };
}
