import { BUSINESS_CONTACT } from "@/config/businessContact";

export { validateComplaintForm } from "@/domains/publico/utils/complaintBookValidation";

export type ComplaintType = "reclamo" | "queja";

export type ComplaintFormData = {
  tipo: ComplaintType;
  nombres: string;
  apellidos: string;
  dni: string;
  domicilio: string;
  telefono: string;
  email: string;
  bienContratado: string;
  monto: string;
  numeroPedido: string;
  detalle: string;
};

export type ComplaintFieldErrors = Partial<Record<keyof ComplaintFormData | "aceptaPrivacidad", string>>;

export type ComplaintSubmission = ComplaintFormData & {
  codigo: string;
  submittedAt: string;
};

/** Mensaje abierto para quien prefiere WhatsApp sin formulario web (uso habitual en Perú). */
export const COMPLAINT_WHATSAPP_SIMPLE_URL = `${BUSINESS_CONTACT.whatsappBaseUrl}?text=${encodeURIComponent(
  [
    "Hola Calzatura Vilchez, deseo presentar una hoja en el Libro de Reclamaciones.",
    "",
    "Tipo (reclamo o queja):",
    "Nombre y apellidos:",
    "DNI:",
    "Teléfono:",
    "Producto o servicio:",
    "Detalle:",
    "Solución que solicito:",
  ].join("\n"),
)}`;

const COMPLAINT_CODE_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function randomComplaintSuffix(length = 6): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => COMPLAINT_CODE_ALPHABET[byte % COMPLAINT_CODE_ALPHABET.length]).join("");
}

export function generateComplaintCode(date = new Date()): string {
  const ymd = date.toISOString().slice(0, 10).replaceAll("-", "");
  return `CV-LR-${ymd}-${randomComplaintSuffix()}`;
}

export function formatComplaintMessage(data: ComplaintFormData, codigo: string): string {
  const tipoLabel = data.tipo === "reclamo" ? "RECLAMO" : "QUEJA";
  const lines = [
    `*Libro de reclamaciones — ${BUSINESS_CONTACT.legalName}*`,
    `RUC: ${BUSINESS_CONTACT.rucDisplay}`,
    `Código: ${codigo}`,
    `Tipo: ${tipoLabel}`,
    `Consumidor: ${data.nombres.trim()} ${data.apellidos.trim()}`,
    `DNI: ${data.dni.trim()}`,
    `Domicilio: ${data.domicilio.trim()}`,
    `Teléfono: ${data.telefono.trim()}`,
    `Correo: ${data.email.trim()}`,
    `Bien contratado: ${data.bienContratado.trim()}`,
    data.monto.trim() ? `Monto: S/ ${data.monto.trim()}` : "",
    data.numeroPedido.trim() ? `N.° pedido: ${data.numeroPedido.trim()}` : "",
    `Detalle y pedido: ${data.detalle.trim()}`,
  ];
  return lines.filter(Boolean).join("\n");
}

export function buildComplaintWhatsAppUrl(data: ComplaintFormData, codigo: string): string {
  const text = encodeURIComponent(formatComplaintMessage(data, codigo));
  return `${BUSINESS_CONTACT.whatsappBaseUrl}?text=${text}`;
}
