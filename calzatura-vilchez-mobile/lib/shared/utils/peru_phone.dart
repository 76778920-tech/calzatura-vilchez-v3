const _peruPrefix = '+51';
const _blockedNumbers = {'000000000', '999999999'};

String _groupMobileDigits(String digits) {
  final normalized = digits.replaceAll(RegExp(r'\D'), '');
  final buffer = StringBuffer();
  for (var i = 0; i < normalized.length && i < 9; i++) {
    if (i > 0 && i % 3 == 0) buffer.write(' ');
    buffer.write(normalized[i]);
  }
  return buffer.toString().trim();
}

String peruPhoneDigits(String value) {
  var digits = value.replaceAll(RegExp(r'\D'), '');
  if (digits.startsWith('51')) {
    digits = digits.substring(2);
  }
  return digits;
}

String normalizePeruPhoneInput(String value) {
  final trimmed = value.trim();
  final wantsPrefix =
      trimmed.startsWith('+') ||
      trimmed.startsWith('51') ||
      trimmed.startsWith(_peruPrefix);
  var digits = peruPhoneDigits(trimmed);
  if (digits.length > 9) digits = digits.substring(0, 9);
  return wantsPrefix ? formatPeruPhone(digits) : _groupMobileDigits(digits);
}

bool isValidPeruPhone(String value) {
  final digits = peruPhoneDigits(value);
  final validFormat = RegExp(r'^9\d{8}$').hasMatch(digits);
  return validFormat && !_blockedNumbers.contains(digits);
}

String formatPeruPhone(String value) {
  final digits = peruPhoneDigits(value);
  final limited = digits.length > 9 ? digits.substring(0, 9) : digits;
  final grouped = _groupMobileDigits(limited);
  return grouped.isEmpty ? _peruPrefix : '$_peruPrefix $grouped';
}

String? peruPhoneError(String value) {
  final digits = peruPhoneDigits(value);
  if (digits.length != 9) return 'El teléfono debe tener 9 dígitos.';
  if (!digits.startsWith('9')) return 'El teléfono debe empezar con 9.';
  if (_blockedNumbers.contains(digits)) return 'Ingresa un teléfono real.';
  return null;
}
