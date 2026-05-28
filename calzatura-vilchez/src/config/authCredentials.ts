/**
 * Límites de correo y contraseña para autenticación (UI + cliente).
 * - Correo: tope razonable para UX y mitigación de payloads anómalos (RFC permite hasta 254 en transporte).
 * - Contraseña: compatible con gestores (1Password, etc.); tope contra DoS (NIST / práctica común 128).
 */
export const MIN_AUTH_PASSWORD_LENGTH = 8;
export const MAX_AUTH_PASSWORD_LENGTH = 128;
export const MAX_AUTH_EMAIL_INPUT_LENGTH = 100;

/** Tipo de input HTML estándar para campo enmascarado (no es un secreto almacenado). */
export const LOGIN_PASSWORD_INPUT_TYPE = "password" as const;

/** Valor estándar de autocomplete para contraseña actual (no es un secreto). */
export const LOGIN_CURRENT_PASSWORD_AUTOCOMPLETE = "current-password" as const;

// ISO/IEC 27002:2022 8.2.3 — composición mínima requerida
const HAS_UPPERCASE = /[A-Z]/;
const HAS_DIGIT = /\d/;

/** Validación de longitud de contraseña para registro (mínimo fuerte de la app). */
export function validateRegisterPasswordLength(raw: string): string | null {
  if (raw.length < MIN_AUTH_PASSWORD_LENGTH) {
    return `La contraseña debe tener al menos ${MIN_AUTH_PASSWORD_LENGTH} caracteres`;
  }
  if (raw.length > MAX_AUTH_PASSWORD_LENGTH) {
    return `La contraseña no puede superar ${MAX_AUTH_PASSWORD_LENGTH} caracteres`;
  }
  return null;
}

/**
 * Validación de complejidad para registro.
 * ISO/IEC 27002:2022 8.2.3 + NIST SP 800-63B: variedad mínima de caracteres.
 */
export function validateRegisterPasswordComplexity(raw: string): string | null {
  if (!HAS_UPPERCASE.test(raw)) {
    return "La contraseña debe incluir al menos una letra mayúscula";
  }
  if (!HAS_DIGIT.test(raw)) {
    return "La contraseña debe incluir al menos un número";
  }
  return null;
}

/**
 * Solo tope superior en inicio de sesión (no alteramos el mínimo de Firebase aquí).
 * No se hace trim de la contraseña para no cambiar el valor enviado al proveedor.
 */
export function validateLoginPasswordLength(raw: string): string | null {
  if (raw.length > MAX_AUTH_PASSWORD_LENGTH) {
    return `La contraseña no puede superar ${MAX_AUTH_PASSWORD_LENGTH} caracteres`;
  }
  return null;
}
