"use strict";

const BLOCKED_NUMBERS = new Set(["000000000", "999999999"]);

function peruPhoneDigits(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("51")) {
    digits = digits.slice(2);
  }
  return digits;
}

function isValidPeruPhone(value) {
  const digits = peruPhoneDigits(value);
  return /^9\d{8}$/.test(digits) && !BLOCKED_NUMBERS.has(digits);
}

function peruPhoneError(value) {
  const digits = peruPhoneDigits(value);

  if (digits.length !== 9) {
    return "El teléfono debe tener 9 dígitos.";
  }
  if (!digits.startsWith("9")) {
    return "El teléfono debe empezar con 9.";
  }
  if (BLOCKED_NUMBERS.has(digits)) {
    return "Ingresa un teléfono real.";
  }
  return null;
}

module.exports = {
  peruPhoneDigits,
  isValidPeruPhone,
  peruPhoneError,
};
