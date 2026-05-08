// Alineado con `calzatura-vilchez/src/domains/usuarios/services/dni.ts`

String normalizeDni(String value) {
  final digits = value.replaceAll(RegExp(r'\D'), '');
  return digits.length > 8 ? digits.substring(0, 8) : digits;
}

bool isValidDni(String value) {
  return RegExp(r'^\d{8}$').hasMatch(normalizeDni(value));
}

class DniLookupResult {
  const DniLookupResult({
    required this.dni,
    required this.nombres,
    required this.apellidos,
  });

  final String dni;
  final String nombres;
  final String apellidos;
}
