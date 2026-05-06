import 'dart:convert';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../cart/domain/cart_item.dart';

const _ordersTable = 'pedidos';
const _functionsBaseUrl =
    'https://us-central1-calzaturavilchez-ab17f.cloudfunctions.net';

class OrderAddress {
  const OrderAddress({
    required this.nombre,
    required this.apellido,
    required this.direccion,
    required this.ciudad,
    required this.distrito,
    required this.telefono,
    this.referencia = '',
  });

  final String nombre;
  final String apellido;
  final String direccion;
  final String ciudad;
  final String distrito;
  final String telefono;
  final String referencia;

  Map<String, dynamic> toJson() => {
    'nombre': nombre,
    'apellido': apellido,
    'direccion': direccion,
    'ciudad': ciudad,
    'distrito': distrito,
    'telefono': telefono,
    'referencia': referencia,
  };
}

class Order {
  const Order({
    required this.id,
    required this.estado,
    required this.total,
    required this.creadoEn,
    required this.items,
    this.subtotal = 0,
    this.envio = 0,
    this.userEmail = '',
    this.metodoPago = '',
    this.stripeSessionId,
    this.direccion,
  });

  final String id;
  final String estado;
  final double subtotal;
  final double envio;
  final double total;
  final String userEmail;
  final String metodoPago;
  final String? stripeSessionId;
  final DateTime creadoEn;
  final List<dynamic> items;
  final Map<String, dynamic>? direccion;

  factory Order.fromJson(Map<String, dynamic> json) {
    return Order(
      id: json['id'] as String,
      estado: json['estado'] as String? ?? 'pendiente',
      subtotal: (json['subtotal'] as num?)?.toDouble() ?? 0.0,
      envio: (json['envio'] as num?)?.toDouble() ?? 0.0,
      total: (json['total'] as num?)?.toDouble() ?? 0.0,
      userEmail: json['userEmail'] as String? ?? '',
      metodoPago: json['metodoPago'] as String? ?? '',
      stripeSessionId: json['stripeSessionId'] as String?,
      creadoEn:
          DateTime.tryParse(json['creadoEn'] as String? ?? '') ??
          DateTime.now(),
      items: json['items'] as List<dynamic>? ?? const [],
      direccion: json['direccion'] as Map<String, dynamic>?,
    );
  }

  String get estadoLabel {
    switch (estado) {
      case 'pendiente':
        return 'Pendiente';
      case 'pagado':
        return 'Pagado';
      case 'enviado':
        return 'Enviado';
      case 'entregado':
        return 'Entregado';
      case 'cancelado':
        return 'Cancelado';
      default:
        return estado;
    }
  }
}

class OrdersRepository {
  OrdersRepository({
    SupabaseClient? supabase,
    FirebaseAuth? auth,
    http.Client? client,
  }) : _supabase = supabase ?? Supabase.instance.client,
       _auth = auth ?? FirebaseAuth.instance,
       _client = client ?? http.Client();

  final SupabaseClient _supabase;
  final FirebaseAuth _auth;
  final http.Client _client;

  Future<List<Order>> getUserOrders(String uid) async {
    final data = await _supabase
        .from(_ordersTable)
        .select('*')
        .eq('userId', uid)
        .order('creadoEn', ascending: false);
    return (data as List).map((e) => Order.fromJson(e)).toList();
  }

  Future<Order?> getOrderById(String id) async {
    final data = await _supabase
        .from(_ordersTable)
        .select('*')
        .eq('id', id)
        .maybeSingle();
    if (data == null) return null;
    return Order.fromJson(data);
  }

  Future<String> createOrder({
    required List<CartItem> items,
    required OrderAddress direccion,
    required String metodoPago,
    String notas = '',
  }) async {
    final user = _auth.currentUser;
    if (user == null) {
      throw Exception('Debes iniciar sesión para crear un pedido');
    }

    final idToken = await user.getIdToken();
    final response = await _client.post(
      Uri.parse('$_functionsBaseUrl/createOrder'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $idToken',
      },
      body: jsonEncode({
        'items': items
            .map(
              (item) => {
                'productId': item.product.id,
                'quantity': item.quantity,
                'talla': item.talla,
                'color': item.color,
              },
            )
            .toList(),
        'direccion': direccion.toJson(),
        'metodoPago': metodoPago,
        'notas': notas,
      }),
    );

    final payload = jsonDecode(response.body) as Map<String, dynamic>? ?? {};
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(
        payload['error']?.toString() ?? 'No se pudo crear el pedido',
      );
    }

    final orderId = payload['orderId']?.toString();
    if (orderId == null || orderId.isEmpty) {
      throw Exception('La respuesta del servidor no incluyó un pedido válido');
    }

    return orderId;
  }
}

final ordersRepositoryProvider = Provider<OrdersRepository>(
  (ref) => OrdersRepository(),
);
