import '../../../shared/models/product.dart';

class CartItem {
  final Product product;
  final int quantity;
  final String? talla;
  final String? color;

  const CartItem({
    required this.product,
    required this.quantity,
    this.talla,
    this.color,
  });

  double get subtotal => product.precioConDescuento * quantity;

  CartItem copyWith({int? quantity, String? talla, String? color}) {
    return CartItem(
      product: product,
      quantity: quantity ?? this.quantity,
      talla: talla ?? this.talla,
      color: color ?? this.color,
    );
  }
}
