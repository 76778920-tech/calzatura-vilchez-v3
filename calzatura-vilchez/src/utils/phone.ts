const PERU_PREFIX = "+51";
const BLOCKED_NUMBERS = new Set(["000000000", "999999999"]);

function groupMobileDigits(digits: string) {
  return digits
    .replace(/\D/g, "")
    .slice(0, 9)
    .replace(/(\d{3})(?=\d)/g, "$1 ")
    .trim();
}

export function normalizePeruPhoneInput(value: string) {
  const trimmed = value.trim();
  const wantsPrefix = trimmed.startsWith("+") || trimmed.startsWith("51") || trimmed.startsWith(PERU_PREFIX);
  let digits = trimmed.replace(/\D/g, "");

  if (digits.startsWith("51")) {
    digits = digits.slice(2);
  }

  digits = digits.slice(0, 9);
  return wantsPrefix ? formatPeruPhone(digits) : groupMobileDigits(digits);
}

export function peruPhoneDigits(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("51")) {
    digits = digits.slice(2);
  }
  return digits;
}

export function isValidPeruPhone(value: string) {
  const digits = peruPhoneDigits(value);
  return /^9\d{8}$/.test(digits) && !BLOCKED_NUMBERS.has(digits);
}

export function formatPeruPhone(value: string) {
  const digits = peruPhoneDigits(value).slice(0, 9);
  const grouped = groupMobileDigits(digits);
  return grouped ? `${PERU_PREFIX} ${grouped}` : PERU_PREFIX;
}

export function peruPhoneError(value: string) {
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
