"use strict";

/** Alineado con `src/utils/emailValidation.ts` y login del BFF. */
const CONSUMER_EMAIL_MAX_LENGTH = 100;
const NOTIFY_EMAIL_MAX_LENGTH = 254;

const EMAIL_RE =
  /^[A-Za-z0-9_+~-]+(?:\.[A-Za-z0-9_+~-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;

function hasEmailControlChars(value) {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.codePointAt(i) ?? 0;
    if (code < 32 || code === 127) return true;
  }
  return false;
}

function normalizeEmailInput(raw) {
  return String(raw ?? "").trim().toLowerCase();
}

function isValidEmail(value, maxLength = CONSUMER_EMAIL_MAX_LENGTH) {
  if (typeof value !== "string") return false;
  if (hasEmailControlChars(value)) return false;
  const normalized = normalizeEmailInput(value);
  if (!normalized || normalized.length > maxLength) return false;
  return EMAIL_RE.test(normalized);
}

function emailValidationError(value, maxLength = CONSUMER_EMAIL_MAX_LENGTH) {
  if (!String(value ?? "").trim()) return "Correo requerido";
  if (hasEmailControlChars(String(value))) return "Correo no válido";
  const normalized = normalizeEmailInput(value);
  if (normalized.length > maxLength) return "Correo no válido";
  if (!EMAIL_RE.test(normalized)) return "Correo no válido";
  return null;
}

module.exports = {
  CONSUMER_EMAIL_MAX_LENGTH,
  NOTIFY_EMAIL_MAX_LENGTH,
  normalizeEmailInput,
  isValidEmail,
  emailValidationError,
  hasEmailControlChars,
};
