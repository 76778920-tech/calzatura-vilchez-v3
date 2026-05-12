import { validateRegisterPasswordLength } from "@/config/authCredentials";
import { isValidDni, normalizeDni } from "@/domains/usuarios/services/dni";
import { normalizeEmailInput, validateEmailFormat } from "@/utils/emailValidation";

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
  const passLen = validateRegisterPasswordLength(fields.password);
  if (passLen) return passLen;
  return validateEmailFormat(fields.email);
}

export function getNormalizedRegisterEmail(email: string): string {
  return normalizeEmailInput(email);
}
