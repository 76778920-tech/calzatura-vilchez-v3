import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../../core/config/env.dart';

class DeliveryQuote {
  final double distanceKm;
  final double cost;
  final bool isFreeDelivery;
  final bool isOutOfRange;

  const DeliveryQuote({
    required this.distanceKm,
    required this.cost,
    required this.isFreeDelivery,
    required this.isOutOfRange,
  });

  factory DeliveryQuote.fromJson(Map<String, dynamic> json) => DeliveryQuote(
        distanceKm: (json['distanceKm'] as num?)?.toDouble() ?? 0,
        cost: (json['cost'] as num?)?.toDouble() ?? 0,
        isFreeDelivery: json['isFreeDelivery'] as bool? ?? false,
        isOutOfRange: json['isOutOfRange'] as bool? ?? false,
      );
}

class GeoCandidate {
  final double lat;
  final double lng;
  final String label;
  final String city;
  final String district;

  const GeoCandidate({
    required this.lat,
    required this.lng,
    required this.label,
    this.city = '',
    this.district = '',
  });

  factory GeoCandidate.fromJson(Map<String, dynamic> json) => GeoCandidate(
        lat: (json['lat'] as num).toDouble(),
        lng: (json['lng'] as num).toDouble(),
        label: json['label'] as String? ?? '',
        city: json['city'] as String? ?? '',
        district: json['district'] as String? ?? '',
      );
}

class DeliveryQuoteService {
  DeliveryQuoteService({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  String get _base => Env.backendApiUrl.replaceAll(RegExp(r'/$'), '');

  Future<List<GeoCandidate>> geocode(String query) async {
    if (query.trim().length < 3) return [];
    final uri = Uri.parse('$_base/delivery/geocode')
        .replace(queryParameters: {'q': query.trim(), 'limit': '5'});
    final response = await _client.get(uri);
    if (response.statusCode != 200) return [];
    final body = jsonDecode(response.body) as Map<String, dynamic>;
    final list = body['candidates'] as List<dynamic>? ?? [];
    return list.map((e) => GeoCandidate.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<List<double>>> getRoute(double destLat, double destLng) async {
    final uri = Uri.parse('$_base/delivery/route').replace(queryParameters: {
      'destLat': destLat.toString(),
      'destLng': destLng.toString(),
      'storeLat': '-12.071951',
      'storeLng': '-75.205281',
    });
    try {
      final response = await _client.get(uri);
      if (response.statusCode != 200) return [];
      final body = jsonDecode(response.body) as Map<String, dynamic>;
      final positions = body['positions'] as List<dynamic>? ?? [];
      return positions
          .map((p) => [(p as List)[0] as double, p[1] as double])
          .toList();
    } catch (_) {
      return [];
    }
  }

  Future<DeliveryQuote?> getQuote(double destLat, double destLng) async {
    final uri = Uri.parse('$_base/delivery/quote').replace(queryParameters: {
      'destLat': destLat.toString(),
      'destLng': destLng.toString(),
    });
    final response = await _client.get(uri);
    if (response.statusCode != 200) return null;
    final body = jsonDecode(response.body) as Map<String, dynamic>;
    if (body['distanceKm'] == null) return null;
    return DeliveryQuote.fromJson(body);
  }
}
