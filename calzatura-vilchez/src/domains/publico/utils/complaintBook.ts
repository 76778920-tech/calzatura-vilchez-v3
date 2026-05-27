import { BUSINESS_CONTACT } from "@/config/businessContact";
import { isValidPeruPhone, peruPhoneError } from "@/utils/phone";

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

export function generateComplaintCode(date = new Date()): string {
  const ymd = date.toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `CV-LR-${ymd}-${suffix}`;
}

export function validateComplaintForm(
  data: ComplaintFormData,
  aceptaPrivacidad: boolean,
): ComplaintFieldErrors {
  const errors: ComplaintFieldErrors = {};

  if (!data.nombres.trim()) errors.nombres = "Ingresa tus nombres";
  if (!data.apellidos.trim()) errors.apellidos = "Ingresa tus apellidos";
  if (!/^\d{8}$/.test(data.dni.trim())) errors.dni = "Ingresa un DNI válido de 8 dígitos";
  if (!data.domicilio.trim()) errors.domicilio = "Ingresa tu domicilio";
  if (!data.email.trim()) {
    errors.email = "Ingresa tu correo electrónico";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    errors.email = "Correo electrónico no válido";
  }
  if (!data.telefono.trim()) {
    errors.telefono = "Ingresa tu teléfono";
  } else {
    const phoneErr = peruPhoneError(data.telefono);
    if (phoneErr || !isValidPeruPhone(data.telefono)) errors.telefono = phoneErr ?? "Teléfono no válido";
  }
  if (!data.bienContratado.trim()) errors.bienContratado = "Describe el producto o servicio";
  if (data.tipo === "reclamo" && !data.monto.trim()) {
    errors.monto = "Indica el monto reclamado";
  } else if (data.monto.trim() && !/^\d+(\.\d{1,2})?$/.test(data.monto.trim())) {
    errors.monto = "Monto no válido";
  }
  if (!data.detalle.trim()) errors.detalle = "Describe el problema y qué solución solicitas";
  if (!aceptaPrivacidad) errors.aceptaPrivacidad = "Debes aceptar el tratamiento de datos";

  return errors;
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
