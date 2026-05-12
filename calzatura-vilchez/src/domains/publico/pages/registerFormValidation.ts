import { isValidDni, normalizeDni } from "@/domains/usuarios/services/dni";
import { normalizeEmailInput, validateEmailFormat } from "@/utils/emailValidation";

const MIN_PASSWORD_LENGTH = 8;

export type RegisterFormFields = {
  dni: string;
  validatedDni: string;
  nombres: string;
  apellidos: string;
  password: string;
  confirmPass: string;
  email: string;
};

/** Mensaje de error para mostrar con toast, o null si el formulario puede enviarse. */
export function getRegisterBlockingMessage(fields: RegisterFormFields): string | null {
  const normalizedDni = normalizeDni(fields.dni);
  if (!isValidDni(normalizedDni)) {
    return "El DNI debe tener 8 digitos";
  }
  if (!fields.validatedDni || !fields.nombres || !fields.apellidos) {
    return "Primero busca tu DNI con el boton de busqueda";
  }
  if (fields.password !== fields.confirmPass) {
    return "Las contraseñas no coinciden";
  }
  if (fields.password.length < MIN_PASSWORD_LENGTH) {
    return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`;
  }
  return validateEmailFormat(fields.email);
}

export function getNormalizedRegisterEmail(email: string): string {
  return normalizeEmailInput(email);
}
