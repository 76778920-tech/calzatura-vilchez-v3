import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/cart_item.dart';
import '../../../../features/auth/presentation/providers/auth_provider.dart';
import '../../../../shared/models/product.dart';

class CartNotifier extends StateNotifier<List<CartItem>> {
  CartNotifier(this._userId) : super([]) {
    _subscribe();
  }

  final String? _userId;
  StreamSubscription<DocumentSnapshot>? _sub;
  bool _ignoreNextSnapshot = false;

  void _subscribe() {
    if (_userId == null) return;
    _sub = FirebaseFirestore.instance
        .collection('carts')
        .doc(_userId)
        .snapshots()
        .listen((snap) {
      if (_ignoreNextSnapshot) {
        _ignoreNextSnapshot = false;
        return;
      }
      if (snap.exists) {
        final raw = snap.data()?['items'] as List<dynamic>? ?? [];
        state = raw
            .map((e) => CartItem.fromMap(e as Map<String, dynamic>))
            .toList();
      }
    });
  }

  Future<void> _save() async {
    if (_userId == null) return;
    _ignoreNextSnapshot = true;
    await FirebaseFirestore.instance.collection('carts').doc(_userId).set({
      'items': state.map((item) => item.toMap()).toList(),
    });
  }

  void addItem(Product product, {String? talla, String? color}) {
    final idx = state.indexWhere(
      (item) =>
          item.product.id == product.id &&
          item.talla == talla &&
          item.color == color,
    );
    if (idx >= 0) {
      final current = state[idx];
      final newQty = current.quantity + 1;
      if (newQty > product.stock) return;
      state = [
        ...state.sublist(0, idx),
        current.copyWith(quantity: newQty),
        ...state.sublist(idx + 1),
      ];
    } else {
      state = [...state, CartItem(product: product, quantity: 1, talla: talla, color: color)];
    }
    _save();
  }

  void removeItem(int index) {
    state = [...state.sublist(0, index), ...state.sublist(index + 1)];
    _save();
  }

  void updateQuantity(int index, int qty) {
    if (qty <= 0) {
      removeItem(index);
      return;
    }
    final item = state[index];
    if (qty > item.product.stock) return;
    state = [
      ...state.sublist(0, index),
      item.copyWith(quantity: qty),
      ...state.sublist(index + 1),
    ];
    _save();
  }

  void clear() {
    state = [];
    _save();
  }

  double get total => state.fold(0.0, (acc, item) => acc + item.subtotal);
  int get itemCount => state.fold(0, (acc, item) => acc + item.quantity);

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }
}

final cartProvider = StateNotifierProvider<CartNotifier, List<CartItem>>(
  (ref) => CartNotifier(ref.watch(currentUserProvider)?.uid),
);

final cartTotalProvider = Provider<double>((ref) {
  return ref.watch(cartProvider.notifier).total;
});

final cartItemCountProvider = Provider<int>((ref) {
  return ref.watch(cartProvider.notifier).itemCount;
});
