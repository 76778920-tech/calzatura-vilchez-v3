import type { ComplaintFieldErrors, ComplaintFormData } from "@/domains/publico/utils/complaintBook";
import {
  COMPLAINT_DETALLE_MIN_LENGTH,
  COMPLAINT_VALIDATION_MESSAGES,
} from "@/domains/publico/utils/complaintLegalPlazos";
import { isValidEmailFormat } from "@/utils/emailValidation";
import { isValidPeruPhone, peruPhoneError } from "@/utils/phone";

export function validateComplaintConsumerFields(
  data: ComplaintFormData,
  errors: ComplaintFieldErrors,
): void {
  if (!data.nombres.trim()) errors.nombres = "Ingresa tus nombres";
  if (!data.apellidos.trim()) errors.apellidos = "Ingresa tus apellidos";
  if (!/^\d{8}$/.test(data.dni.trim())) errors.dni = "Ingresa un DNI válido de 8 dígitos";
  if (!data.domicilio.trim()) errors.domicilio = "Ingresa tu domicilio";
}

export function validateComplaintContactFields(
  data: ComplaintFormData,
  errors: ComplaintFieldErrors,
): void {
  if (!data.email.trim()) {
    errors.email = "Ingresa tu correo electrónico";
    return;
  }
  if (!isValidEmailFormat(data.email)) {
    errors.email = "Correo electrónico no válido";
  }
}

export function validateComplaintPhoneField(
  data: ComplaintFormData,
  errors: ComplaintFieldErrors,
): void {
  if (!data.telefono.trim()) {
    errors.telefono = "Ingresa tu teléfono";
    return;
  }
  const phoneErr = peruPhoneError(data.telefono);
  if (phoneErr || !isValidPeruPhone(data.telefono)) {
    errors.telefono = phoneErr ?? "Teléfono no válido";
  }
}

export function validateComplaintMontoField(
  data: ComplaintFormData,
  errors: ComplaintFieldErrors,
): void {
  if (data.tipo === "reclamo" && !data.monto.trim()) {
    errors.monto = "Indica el monto reclamado";
    return;
  }
  if (data.monto.trim() && !/^\d+(\.\d{1,2})?$/.test(data.monto.trim())) {
    errors.monto = "Monto no válido";
  }
}

export function validateComplaintForm(
  data: ComplaintFormData,
  aceptaPrivacidad: boolean,
): ComplaintFieldErrors {
  const errors: ComplaintFieldErrors = {};
  validateComplaintConsumerFields(data, errors);
  validateComplaintContactFields(data, errors);
  validateComplaintPhoneField(data, errors);
  if (!data.bienContratado.trim()) errors.bienContratado = "Describe el producto o servicio";
  validateComplaintMontoField(data, errors);
  const detalle = data.detalle.trim();
  if (!detalle) {
    errors.detalle = COMPLAINT_VALIDATION_MESSAGES.detalleRequired;
  } else if (detalle.length < COMPLAINT_DETALLE_MIN_LENGTH) {
    errors.detalle = COMPLAINT_VALIDATION_MESSAGES.detalleMinLength();
  }
  if (!aceptaPrivacidad) errors.aceptaPrivacidad = "Debes aceptar el tratamiento de datos";
  return errors;
}
