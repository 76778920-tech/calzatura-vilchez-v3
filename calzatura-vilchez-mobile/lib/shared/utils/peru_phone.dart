/// Misma lógica que `calzatura-vilchez/src/utils/phone.ts` (Perú móvil 9 dígitos, empieza en 9).
const String _peruPrefix = '+51';

final Set<String> _blockedNumbers = {'000000000', '999999999'};

String peruPhoneDigits(String value) {
  var digits = value.replaceAll(RegExp(r'\D'), '');
  if (digits.startsWith('51')) {
    digits = digits.substring(2);
  }
  return digits;
}

String _groupMobileDigits(String nineDigits) {
  final slice = nineDigits.length > 9 ? nineDigits.substring(0, 9) : nineDigits;
  return slice
      .replaceAllMapped(RegExp(r'(\d{3})(?=\d)'), (m) => '${m[0]} ')
      .trim();
}

/// Formato guardado en Supabase / alineado con la web: `+51 9xx xxx xxx`
String formatPeruPhone(String value) {
  final digits = peruPhoneDigits(value);
  final slice = digits.length > 9 ? digits.substring(0, 9) : digits;
  final grouped = _groupMobileDigits(slice);
  return grouped.isEmpty ? _peruPrefix : '$_peruPrefix $grouped';
}

bool isValidPeruPhone(String value) {
  final digits = peruPhoneDigits(value);
  return RegExp(r'^9\d{8}$').hasMatch(digits) &&
      !_blockedNumbers.contains(digits);
}

/// Normaliza la entrada del usuario a solo dígitos (máx 9).
/// Para usar en `onChanged` del campo de teléfono.
String normalizePeruPhoneInput(String value) {
  final digits = peruPhoneDigits(value);
  return digits.length > 9 ? digits.substring(0, 9) : digits;
}

/// Mensaje de error para validador de formulario, o `null` si es válido.
String? peruPhoneError(String? value) {
  if (value == null || value.trim().isEmpty) {
    return 'Ingresa tu celular';
  }
  final digits = peruPhoneDigits(value);
  if (digits.length != 9) {
    return 'El teléfono debe tener 9 dígitos.';
  }
  if (!digits.startsWith('9')) {
    return 'El teléfono debe empezar con 9.';
  }
  if (_blockedNumbers.contains(digits)) {
    return 'Ingresa un teléfono real.';
  }
  return null;
}
