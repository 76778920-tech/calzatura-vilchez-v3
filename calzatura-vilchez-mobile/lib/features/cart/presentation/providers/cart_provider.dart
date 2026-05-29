import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/services/local_cart_store.dart';
import '../../domain/cart_item.dart';
import '../../../../features/auth/presentation/providers/auth_provider.dart';
import '../../../../shared/models/product.dart';

class CartNotifier extends StateNotifier<List<CartItem>> {
  CartNotifier(this._userId) : super([]) {
    _load();
  }

  final String? _userId;

  Future<void> reload() => _load();

  Future<void> _load() async {
    final items = await LocalCartStore.read(_userId);
    if (!mounted) return;
    state = items;
  }

  Future<void> _persist() async {
    await LocalCartStore.write(_userId, state);
  }

  Future<void> addItem(Product product, {String? talla, String? color}) async {
    final idx = state.indexWhere(
      (item) =>
          item.product.id == product.id &&
          item.talla == talla &&
          item.color == color,
    );
    final stockLimit = _effectiveStock(product, talla);
    if (idx >= 0) {
      final current = state[idx];
      final newQty = current.quantity + 1;
      if (newQty > stockLimit) return;
      state = [
        ...state.sublist(0, idx),
        current.copyWith(quantity: newQty),
        ...state.sublist(idx + 1),
      ];
    } else {
      if (stockLimit <= 0) return;
      state = [
        ...state,
        CartItem(product: product, quantity: 1, talla: talla, color: color),
      ];
    }
    await _persist();
  }

  Future<void> removeItem(int index) async {
    state = [...state.sublist(0, index), ...state.sublist(index + 1)];
    await _persist();
  }

  // Per-talla stock when tallaStock has the key; falls back to product.stock.
  int _effectiveStock(Product product, String? talla) {
    if (talla != null && (product.tallaStock?.containsKey(talla) == true)) {
      return product.stockDeTalla(talla);
    }
    return product.stock;
  }

  Future<void> updateQuantity(int index, int qty) async {
    if (qty <= 0) {
      await removeItem(index);
      return;
    }
    final item = state[index];
    if (qty > _effectiveStock(item.product, item.talla)) return;
    state = [
      ...state.sublist(0, index),
      item.copyWith(quantity: qty),
      ...state.sublist(index + 1),
    ];
    await _persist();
  }

  Future<void> clear() async {
    state = [];
    await _persist();
  }

  double get total => state.fold(0.0, (acc, item) => acc + item.subtotal);
  int get itemCount => state.fold(0, (acc, item) => acc + item.quantity);
}

final cartProvider = StateNotifierProvider<CartNotifier, List<CartItem>>((ref) {
  final uid = ref.watch(currentUserProvider.select((u) => u?.uid));
  return CartNotifier(uid);
});

final cartTotalProvider = Provider<double>((ref) {
  final items = ref.watch(cartProvider);
  return items.fold(0.0, (acc, item) => acc + item.subtotal);
});

final cartItemCountProvider = Provider<int>((ref) {
  final items = ref.watch(cartProvider);
  return items.fold(0, (acc, item) => acc + item.quantity);
});
