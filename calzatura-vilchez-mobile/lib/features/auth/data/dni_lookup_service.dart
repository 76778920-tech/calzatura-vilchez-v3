import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

import '../../../shared/utils/dni.dart';

enum DniLookupError {
  invalid,
  notConfigured,
  notFound,
  rateLimited,
  serviceUnavailable,
  failed,
}

extension DniLookupErrorX on DniLookupError {
  String get userMessage => switch (this) {
    DniLookupError.invalid => 'Ingresa un DNI válido de 8 dígitos',
    DniLookupError.notConfigured =>
      'La búsqueda por DNI aún no está configurada en la app',
    DniLookupError.notFound => 'No se encontraron datos para este DNI',
    DniLookupError.rateLimited =>
      'Demasiados intentos. Espera unos minutos y vuelve a intentar.',
    DniLookupError.serviceUnavailable =>
      'RENIEC no respondió. Completa nombre y apellidos manualmente.',
    DniLookupError.failed => 'No se pudo consultar el DNI',
  };
}

/// POST JSON `{ "dni": "12345678" }` — misma API que la web (`VITE_DNI_LOOKUP_URL`).
class DniLookupService {
  DniLookupResult parsePayload(Map<String, dynamic> json, String requestedDni) {
    final data = json['data'];
    final merged = data is Map<String, dynamic>
        ? {...json, ...data}
        : json;

    final rawDni = merged['dni'];
    final dni = normalizeDni(rawDni is String ? rawDni : requestedDni);
    final nombres =
        (merged['nombres'] as String?)?.trim().toUpperCase() ?? '';
    final apellidos =
        (merged['apellidos'] as String?)?.trim().toUpperCase() ?? '';

    if (dni != requestedDni || nombres.isEmpty || apellidos.isEmpty) {
      throw DniLookupError.notFound;
    }
    return DniLookupResult(dni: dni, nombres: nombres, apellidos: apellidos);
  }

  static const _mobileClientHeader = 'calzatura-mobile';

  DniLookupError _errorFromResponse(int status, Map<String, dynamic> payload) {
    final msg = (payload['error'] as String?)?.trim();
    if (status == 404) return DniLookupError.notFound;
    if (status == 429) return DniLookupError.rateLimited;
    if (status == 502 || status == 503) return DniLookupError.serviceUnavailable;
    if (status == 400) return DniLookupError.invalid;
    if (msg != null && msg.isNotEmpty) {
      if (msg.toLowerCase().contains('no encontrado')) {
        return DniLookupError.notFound;
      }
      if (msg.toLowerCase().contains('demasiadas')) {
        return DniLookupError.rateLimited;
      }
    }
    return DniLookupError.failed;
  }

  Future<DniLookupResult> lookup(String dniInput, String lookupUrl) async {
    final normalized = normalizeDni(dniInput);
    if (!isValidDni(normalized)) {
      throw DniLookupError.invalid;
    }
    if (lookupUrl.trim().isEmpty) {
      throw DniLookupError.notConfigured;
    }

    final uri = Uri.parse(lookupUrl.trim());
    http.Response response;
    try {
      response = await http
          .post(
            uri,
            headers: const {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'X-Calzatura-Client': _mobileClientHeader,
              'Origin': 'https://calzaturavilchez-ab17f.web.app',
            },
            body: jsonEncode({'dni': normalized}),
          )
          .timeout(const Duration(seconds: 25));
    } catch (e, st) {
      if (kDebugMode) {
        debugPrint('[DniLookup] red: $e\n$st');
      }
      throw DniLookupError.failed;
    }

    Map<String, dynamic> payload = {};
    try {
      if (response.body.isNotEmpty) {
        final decoded = jsonDecode(response.body);
        if (decoded is Map<String, dynamic>) payload = decoded;
      }
    } catch (_) {}

    if (kDebugMode) {
      debugPrint(
        '[DniLookup] ${response.statusCode} ${uri.host}${uri.path} '
        'body=${response.body.length > 200 ? '${response.body.substring(0, 200)}…' : response.body}',
      );
    }

    final ok = response.statusCode >= 200 && response.statusCode < 300;
    if (!ok) {
      throw _errorFromResponse(response.statusCode, payload);
    }

    try {
      return parsePayload(payload, normalized);
    } on DniLookupError {
      rethrow;
    } catch (e, st) {
      if (kDebugMode) {
        debugPrint('[DniLookup] parse: $e\n$st');
      }
      throw DniLookupError.notFound;
    }
  }
}
