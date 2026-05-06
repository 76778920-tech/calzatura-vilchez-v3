import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../domain/cart_item.dart';
import '../../../../shared/models/product.dart';

class CartNotifier extends StateNotifier<List<CartItem>> {
  CartNotifier() : super([]);

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
  }

  void removeItem(int index) {
    state = [...state.sublist(0, index), ...state.sublist(index + 1)];
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
  }

  void clear() => state = [];

  double get total => state.fold(0.0, (sum, item) => sum + item.subtotal);
  int get itemCount => state.fold(0, (sum, item) => sum + item.quantity);
}

final cartProvider =
    StateNotifierProvider<CartNotifier, List<CartItem>>(
  (ref) => CartNotifier(),
);

final cartTotalProvider = Provider<double>((ref) {
  return ref.watch(cartProvider.notifier).total;
});

final cartItemCountProvider = Provider<int>((ref) {
  return ref.watch(cartProvider.notifier).itemCount;
});
