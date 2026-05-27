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
  celular: string;
};

export type RegisterFieldErrors = {
  dni?: string;
  celular?: string;
  password?: string;
  confirmPass?: string;
  email?: string;
};

/** Mensaje de error para mostrar con toast, o null si el formulario puede enviarse. */
export function getRegisterBlockingMessage(fields: RegisterFormFields): string | null {
  const errors = getRegisterFieldErrors(fields);
  return errors.dni ?? errors.celular ?? errors.password ?? errors.confirmPass ?? errors.email ?? null;
}

export function getRegisterFieldErrors(fields: RegisterFormFields): RegisterFieldErrors {
  const errors: RegisterFieldErrors = {};
  const normalizedDni = normalizeDni(fields.dni);
  if (!isValidDni(normalizedDni)) {
    errors.dni = "El DNI debe tener 8 dígitos";
  } else if (!fields.validatedDni || !fields.nombres || !fields.apellidos) {
    errors.dni = "Primero busca tu DNI con el botón de búsqueda";
  }
  if (!/^9\d{8}$/.test(fields.celular)) {
    errors.celular = "Ingresa un celular válido de 9 dígitos (empieza con 9)";
  }
  const passLen = validateRegisterPasswordLength(fields.password);
  if (passLen) {
    errors.password = passLen;
  }
  if (fields.password !== fields.confirmPass) {
    errors.confirmPass = "Las contraseñas no coinciden";
  }
  const emailErr = validateEmailFormat(fields.email);
  if (emailErr) {
    errors.email = emailErr;
  }
  return errors;
}

export function getNormalizedRegisterEmail(email: string): string {
  return normalizeEmailInput(email);
}
