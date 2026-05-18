import 'dart:convert';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:http/http.dart' as http;

import '../config/env.dart';

/// Cliente del BFF `/favorites` (misma API que la web).
class FavoritesApi {
  FavoritesApi({http.Client? client, FirebaseAuth? auth})
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

  Future<Set<String>> fetchProductIds() async {
    final token = await _token();
    if (token == null) return {};

    final response = await _client.get(
      _uri('/favorites'),
      headers: {'Authorization': 'Bearer $token'},
    );

    final payload = jsonDecode(response.body) as Map<String, dynamic>? ?? {};
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(payload['error']?.toString() ?? 'No se pudieron cargar favoritos');
    }

    final ids = payload['productIds'];
    if (ids is! List) return {};
    return ids.whereType<String>().toSet();
  }

  Future<bool> isFavorite(String productId) async {
    final token = await _token();
    if (token == null) return false;

    final response = await _client.get(
      _uri('/favorites', {'productId': productId}),
      headers: {'Authorization': 'Bearer $token'},
    );

    final payload = jsonDecode(response.body) as Map<String, dynamic>? ?? {};
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(payload['error']?.toString() ?? 'No se pudo consultar favorito');
    }
    return payload['isFavorite'] == true;
  }

  Future<void> add(String productId) async {
    final token = await _token();
    if (token == null) throw Exception('Debes iniciar sesión');

    final response = await _client.post(
      _uri('/favorites'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({'productId': productId}),
    );

    final payload = jsonDecode(response.body) as Map<String, dynamic>? ?? {};
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(payload['error']?.toString() ?? 'No se pudo guardar favorito');
    }
  }

  Future<void> remove(String productId) async {
    final token = await _token();
    if (token == null) throw Exception('Debes iniciar sesión');

    final response = await _client.post(
      _uri('/favorites'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({'productId': productId, 'action': 'remove'}),
    );

    final payload = jsonDecode(response.body) as Map<String, dynamic>? ?? {};
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(payload['error']?.toString() ?? 'No se pudo eliminar favorito');
    }
  }
}
