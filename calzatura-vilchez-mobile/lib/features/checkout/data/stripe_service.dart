import 'dart:convert';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_stripe/flutter_stripe.dart';
import 'package:http/http.dart' as http;
import '../../../core/config/env.dart';

class StripeService {
  StripeService({http.Client? client, FirebaseAuth? auth})
      : _client = client ?? http.Client(),
        _auth = auth ?? FirebaseAuth.instance;

  final http.Client _client;
  final FirebaseAuth _auth;

  String get _base => Env.backendApiUrl.replaceAll(RegExp(r'/$'), '');

  /// Crea un PaymentIntent en el BFF y abre el Payment Sheet nativo.
  /// Lanza [Exception] si el pago falla o el usuario lo cancela.
  Future<void> payWithSheet(String orderId) async {
    final user = _auth.currentUser;
    if (user == null) throw Exception('Debes iniciar sesión para pagar');

    final idToken = await user.getIdToken();
    final response = await _client.post(
      Uri.parse('$_base/mobile/paymentIntent'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $idToken',
      },
      body: jsonEncode({'orderId': orderId}),
    );

    final payload = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode != 200) {
      throw Exception(payload['error']?.toString() ?? 'Error al iniciar el pago');
    }

    final clientSecret = payload['clientSecret'] as String?;
    if (clientSecret == null || clientSecret.isEmpty) {
      throw Exception('Respuesta de pago inválida del servidor');
    }

    await Stripe.instance.initPaymentSheet(
      paymentSheetParameters: SetupPaymentSheetParameters(
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'Calzatura Vílchez',
        style: ThemeMode.light,
      ),
    );

    await Stripe.instance.presentPaymentSheet();
  }
}
