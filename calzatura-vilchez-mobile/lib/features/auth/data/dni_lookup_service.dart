import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../../shared/utils/dni.dart';

enum DniLookupError {
  invalid,
  notConfigured,
  notFound,
  failed,
}

extension DniLookupErrorX on DniLookupError {
  String get userMessage => switch (this) {
        DniLookupError.invalid => 'Ingresa un DNI válido de 8 dígitos',
        DniLookupError.notConfigured =>
          'La búsqueda por DNI aún no está configurada en la app',
        DniLookupError.notFound => 'No se encontraron datos para este DNI',
        DniLookupError.failed => 'No se pudo consultar el DNI',
      };
}

/// POST JSON `{ "dni": "12345678" }` — misma API que la web (`VITE_DNI_LOOKUP_URL`).
class DniLookupService {
  DniLookupResult parsePayload(Map<String, dynamic> json, String requestedDni) {
    final rawDni = json['dni'];
    final dni = normalizeDni(
      rawDni is String ? rawDni : (requestedDni),
    );
    final nombres = (json['nombres'] as String?)?.trim().toUpperCase() ?? '';
    final apellidos = (json['apellidos'] as String?)?.trim().toUpperCase() ?? '';

    if (dni != requestedDni || nombres.isEmpty || apellidos.isEmpty) {
      throw DniLookupError.notFound;
    }
    return DniLookupResult(dni: dni, nombres: nombres, apellidos: apellidos);
  }

  Future<DniLookupResult> lookup(String dniInput, String? lookupUrl) async {
    final normalized = normalizeDni(dniInput);
    if (!isValidDni(normalized)) {
      throw DniLookupError.invalid;
    }
    if (lookupUrl == null || lookupUrl.trim().isEmpty) {
      throw DniLookupError.notConfigured;
    }

    final uri = Uri.parse(lookupUrl.trim());
    final response = await http
        .post(
          uri,
          headers: const {'Content-Type': 'application/json'},
          body: jsonEncode({'dni': normalized}),
        )
        .timeout(const Duration(seconds: 20));

    Map<String, dynamic> payload = {};
    try {
      if (response.body.isNotEmpty) {
        final decoded = jsonDecode(response.body);
        if (decoded is Map<String, dynamic>) payload = decoded;
      }
    } catch (_) {}

    final ok = response.statusCode >= 200 && response.statusCode < 300;
    if (!ok) {
      if (response.statusCode == 404) throw DniLookupError.notFound;
      throw DniLookupError.failed;
    }

    return parsePayload(payload, normalized);
  }
}
