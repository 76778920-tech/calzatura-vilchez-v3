/**
 * Validación de correo para formularios web (uso típico Perú / Latam: Gmail, Hotmail, .pe, .gob.pe, etc.).
 * No intenta cubrir el RFC completo; prioriza formatos reales y dominios con varios segmentos.
 */

/** Normaliza para guardar o comparar: sin espacios laterales y en minúsculas. */
export function normalizeEmailInput(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * Patrón: parte local + @ + dominio con al menos un punto y TLD final de 2+ letras (.com.pe, .gob.pe, etc.).
 */
const EMAIL_PATTERN =
  /^[A-Za-z0-9_+~-]+(?:\.[A-Za-z0-9_+~-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;

/**
 * @returns mensaje de error en español, o `null` si el formato es aceptable.
 */
export function validateEmailFormat(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return "Ingrese un correo electrónico";
  const normalized = normalizeEmailInput(raw);
  if (!EMAIL_PATTERN.test(normalized)) return "Formato de correo no válido";
  return null;
}

export function isValidEmailFormat(raw: string): boolean {
  return validateEmailFormat(raw) === null;
}
