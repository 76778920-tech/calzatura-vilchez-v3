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

  Map<String, dynamic> toMap() => {
    'product': product.toMap(),
    'quantity': quantity,
    'talla': talla,
    'color': color,
  };

  factory CartItem.fromMap(Map<String, dynamic> map) => CartItem(
    product: Product.fromJson(map['product'] as Map<String, dynamic>),
    quantity: (map['quantity'] as num).toInt(),
    talla: map['talla'] as String?,
    color: map['color'] as String?,
  );
}
