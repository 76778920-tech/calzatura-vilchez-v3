import 'dart:convert';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:http/http.dart' as http;

import '../config/env.dart';

/// Alcance de API del panel (alineado con web `PanelFetchScope`).
enum PanelScope { admin, staff }

/// Entrada de auditoría (`GET /admin/audit`).
class AdminAuditEntry {
  const AdminAuditEntry({
    required this.id,
    required this.accion,
    required this.entidad,
    this.entidadId,
    this.entidadNombre,
    this.usuarioUid,
    this.usuarioEmail,
    required this.realizadoEn,
  });

  final String id;
  final String accion;
  final String entidad;
  final String? entidadId;
  final String? entidadNombre;
  final String? usuarioUid;
  final String? usuarioEmail;
  final String realizadoEn;

  factory AdminAuditEntry.fromJson(Map<String, dynamic> json) {
    return AdminAuditEntry(
      id: json['id']?.toString() ?? '',
      accion: json['accion']?.toString() ?? '',
      entidad: json['entidad']?.toString() ?? '',
      entidadId: json['entidadId'] as String?,
      entidadNombre: json['entidadNombre'] as String?,
      usuarioUid: json['usuarioUid'] as String?,
      usuarioEmail: json['usuarioEmail'] as String?,
      realizadoEn:
          json['realizadoEn']?.toString() ?? DateTime.now().toIso8601String(),
    );
  }

  Map<String, dynamic> toDashboardMap() => {
    'id': id,
    'accion': accion,
    'entidad': entidad,
    'entidadNombre': entidadNombre,
    'usuarioEmail': usuarioEmail,
    'realizadoEn': realizadoEn,
  };
}

/// Cliente BFF para panel admin y tienda (trabajador).
class PanelBffApi {
  PanelBffApi({http.Client? client, FirebaseAuth? auth})
    : _client = client ?? http.Client(),
      _auth = auth ?? FirebaseAuth.instance;

  final http.Client _client;
  final FirebaseAuth _auth;

  Uri _uri(String path, [Map<String, String>? query]) {
    final base = Env.backendApiUrl.replaceAll(RegExp(r'/$'), '');
    return Uri.parse('$base$path').replace(queryParameters: query);
  }

  Future<String?> _token() async {
    final user = _auth.currentUser;
    if (user == null) return null;
    return user.getIdToken();
  }

  Future<Map<String, dynamic>> _decodeResponse(http.Response response) async {
    final payload = jsonDecode(response.body);
    if (payload is Map<String, dynamic>) return payload;
    if (payload is Map) return Map<String, dynamic>.from(payload);
    return {};
  }

  void _throwIfFailed(http.Response response, Map<String, dynamic> payload, String fallback) {
    if (response.statusCode >= 200 && response.statusCode < 300) return;
    throw Exception(payload['error']?.toString() ?? fallback);
  }

  static PanelScope scopeForRole(String? role) =>
      role == 'trabajador' ? PanelScope.staff : PanelScope.admin;

  // ── Perfil ────────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>?> fetchMyProfile() async {
    final token = await _token();
    if (token == null) throw Exception('Debes iniciar sesión');

    final response = await _client.get(
      _uri('/users/me'),
      headers: {'Authorization': 'Bearer $token'},
    );
    final payload = await _decodeResponse(response);
    _throwIfFailed(response, payload, 'No se pudo cargar el perfil');
    final profile = payload['profile'];
    if (profile is Map) return Map<String, dynamic>.from(profile);
    return null;
  }

  // ── Pedidos ───────────────────────────────────────────────────────────────

  Future<List<Map<String, dynamic>>> fetchOrders(PanelScope scope) async {
    final token = await _token();
    if (token == null) throw Exception('Debes iniciar sesión');

    final path = scope == PanelScope.staff ? '/staff/orders' : '/admin/orders';
    final response = await _client.get(
      _uri(path),
      headers: {'Authorization': 'Bearer $token'},
    );
    final payload = await _decodeResponse(response);
    _throwIfFailed(response, payload, 'No se pudieron cargar pedidos');

    final orders = payload['orders'];
    if (orders is! List) return [];
    return orders
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();
  }

  Future<void> updateOrderStatus({
    required String orderId,
    required String estado,
  }) async {
    final token = await _token();
    if (token == null) throw Exception('Debes iniciar sesión');

    final response = await _client.post(
      _uri('/updateOrderStatus'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({'orderId': orderId, 'estado': estado}),
    );
    final payload = await _decodeResponse(response);
    _throwIfFailed(response, payload, 'No se pudo actualizar el estado');
  }

  // ── Ventas diarias ────────────────────────────────────────────────────────

  Future<List<Map<String, dynamic>>> fetchDailySales(
    PanelScope scope, {
    String? fecha,
  }) async {
    final token = await _token();
    if (token == null) throw Exception('Debes iniciar sesión');

    final path =
        scope == PanelScope.staff ? '/staff/dailySales' : '/admin/dailySales';
    final query = <String, String>{};
    if (fecha != null && fecha.isNotEmpty) {
      query['fecha'] = fecha;
    } else {
      query['sinceDays'] = '90';
    }

    final response = await _client.get(
      _uri(path, query),
      headers: {'Authorization': 'Bearer $token'},
    );
    final payload = await _decodeResponse(response);
    _throwIfFailed(response, payload, 'No se pudieron cargar ventas');

    final sales = payload['sales'];
    if (sales is! List) return [];
    return sales
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();
  }

  Future<List<String>> registerDailySales({
    required PanelScope scope,
    required List<Map<String, dynamic>> sales,
  }) async {
    final token = await _token();
    if (token == null) throw Exception('Debes iniciar sesión');

    final path = scope == PanelScope.staff
        ? '/staff/dailySales/register'
        : '/admin/dailySales/register';

    final response = await _client.post(
      _uri(path),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({'sales': sales}),
    );
    final payload = await _decodeResponse(response);
    _throwIfFailed(response, payload, 'No se pudo registrar la venta');

    final ids = payload['ids'];
    if (ids is! List) return [];
    return ids.map((e) => e.toString()).toList();
  }

  Future<void> returnDailySale({
    required String saleId,
    required String motivo,
    required PanelScope scope,
  }) async {
    final token = await _token();
    if (token == null) throw Exception('Debes iniciar sesión');

    final path = scope == PanelScope.staff
        ? '/staff/dailySales/return'
        : '/admin/dailySales/return';

    final response = await _client.post(
      _uri(path),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({'saleId': saleId, 'motivo': motivo}),
    );
    final payload = await _decodeResponse(response);
    _throwIfFailed(response, payload, 'No se pudo registrar la devolución');
  }

  // ── Productos ─────────────────────────────────────────────────────────────

  Future<Map<String, String>> fetchProductCodes(PanelScope scope) async {
    final token = await _token();
    if (token == null) throw Exception('Debes iniciar sesión');

    final path = scope == PanelScope.staff
        ? '/staff/productCodes'
        : '/admin/productCodes';
    final response = await _client.get(
      _uri(path),
      headers: {'Authorization': 'Bearer $token'},
    );
    final payload = await _decodeResponse(response);
    _throwIfFailed(response, payload, 'No se pudieron cargar códigos');

    final codes = payload['codes'];
    if (codes is Map) {
      return codes.map(
        (k, v) => MapEntry(k.toString(), v?.toString() ?? ''),
      );
    }
    return {};
  }

  /// Rangos de precio para trabajador (`/staff/productPriceRanges`).
  Future<Map<String, Map<String, dynamic>>> fetchProductPriceRanges() async {
    final token = await _token();
    if (token == null) throw Exception('Debes iniciar sesión');

    final response = await _client.get(
      _uri('/staff/productPriceRanges'),
      headers: {'Authorization': 'Bearer $token'},
    );
    final payload = await _decodeResponse(response);
    _throwIfFailed(response, payload, 'No se pudo cargar rangos de precio');

    final rows = payload['rows'];
    final out = <String, Map<String, dynamic>>{};
    if (rows is List) {
      for (final row in rows) {
        if (row is! Map) continue;
        final map = Map<String, dynamic>.from(row);
        final id = map['productId']?.toString();
        if (id != null && id.isNotEmpty) out[id] = map;
      }
    }
    return out;
  }

  /// Finanzas completas para admin (`/admin/productFinanzas`).
  Future<Map<String, Map<String, dynamic>>> fetchAdminProductFinanzas() async {
    final token = await _token();
    if (token == null) throw Exception('Debes iniciar sesión');

    final response = await _client.get(
      _uri('/admin/productFinanzas'),
      headers: {'Authorization': 'Bearer $token'},
    );
    final payload = await _decodeResponse(response);
    _throwIfFailed(response, payload, 'No se pudieron cargar finanzas');

    final rows = payload['rows'];
    final out = <String, Map<String, dynamic>>{};
    if (rows is List) {
      for (final row in rows) {
        if (row is! Map) continue;
        final map = Map<String, dynamic>.from(row);
        final id = map['productId']?.toString();
        if (id != null && id.isNotEmpty) out[id] = map;
      }
    }
    return out;
  }

  Future<List<Map<String, dynamic>>> fetchProducts(PanelScope scope) async {
    final token = await _token();
    if (token == null) throw Exception('Debes iniciar sesión');

    final path =
        scope == PanelScope.staff ? '/staff/products' : '/admin/products';
    final response = await _client.get(
      _uri(path),
      headers: {'Authorization': 'Bearer $token'},
    );
    final payload = await _decodeResponse(response);
    _throwIfFailed(response, payload, 'No se pudieron cargar productos');

    final products = payload['products'];
    if (products is! List) return [];
    return products
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();
  }

  // ── Admin: fabricantes ──────────────────────────────────────────────────────

  Future<List<Map<String, dynamic>>> fetchManufacturers() async {
    final token = await _token();
    if (token == null) throw Exception('Debes iniciar sesión');

    final response = await _client.get(
      _uri('/admin/manufacturers'),
      headers: {'Authorization': 'Bearer $token'},
    );
    final payload = await _decodeResponse(response);
    _throwIfFailed(response, payload, 'No se pudieron cargar fabricantes');

    final manufacturers = payload['manufacturers'];
    if (manufacturers is! List) return [];
    return manufacturers
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();
  }

  Future<String> createManufacturer(Map<String, dynamic> manufacturer) async {
    final token = await _token();
    if (token == null) throw Exception('Debes iniciar sesión');

    final response = await _client.post(
      _uri('/admin/manufacturers'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({'manufacturer': manufacturer}),
    );
    final payload = await _decodeResponse(response);
    _throwIfFailed(response, payload, 'No se pudo crear el fabricante');
    return payload['id']?.toString() ?? '';
  }

  Future<void> updateManufacturer(
    String manufacturerId,
    Map<String, dynamic> manufacturer,
  ) async {
    final token = await _token();
    if (token == null) throw Exception('Debes iniciar sesión');

    final response = await _client.patch(
      _uri('/admin/manufacturers/${Uri.encodeComponent(manufacturerId)}'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({'manufacturer': manufacturer}),
    );
    final payload = await _decodeResponse(response);
    _throwIfFailed(response, payload, 'No se pudo actualizar el fabricante');
  }

  Future<void> deleteManufacturer(String manufacturerId) async {
    final token = await _token();
    if (token == null) throw Exception('Debes iniciar sesión');

    final response = await _client.delete(
      _uri('/admin/manufacturers/${Uri.encodeComponent(manufacturerId)}'),
      headers: {'Authorization': 'Bearer $token'},
    );
    final payload = await _decodeResponse(response);
    _throwIfFailed(response, payload, 'No se pudo eliminar el fabricante');
  }

  // ── Admin: usuarios y auditoría ───────────────────────────────────────────

  Future<List<Map<String, dynamic>>> fetchAdminUsers() async {
    final token = await _token();
    if (token == null) throw Exception('Debes iniciar sesión');

    final response = await _client.get(
      _uri('/admin/users'),
      headers: {'Authorization': 'Bearer $token'},
    );
    final payload = await _decodeResponse(response);
    _throwIfFailed(response, payload, 'No se pudieron cargar usuarios');

    final users = payload['users'];
    if (users is! List) return [];
    return users
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();
  }

  Future<List<AdminAuditEntry>> fetchRecentAudit({int limit = 20}) async {
    final safeLimit = limit.clamp(1, 100);
    final token = await _token();
    if (token == null) throw Exception('Debes iniciar sesión');

    final response = await _client.get(
      _uri('/admin/audit', {'limit': '$safeLimit'}),
      headers: {'Authorization': 'Bearer $token'},
    );
    final payload = await _decodeResponse(response);
    _throwIfFailed(response, payload, 'No se pudo cargar auditoría');

    final entries = payload['entries'];
    if (entries is! List) return [];
    return entries
        .whereType<Map>()
        .map((e) => AdminAuditEntry.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }
}

/// Alias histórico — usar [PanelBffApi].
typedef AdminBffApi = PanelBffApi;
