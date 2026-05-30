import '../../../shared/utils/dni.dart';

class ProductFinanzas {
  const ProductFinanzas({
    required this.precioMinimo,
    required this.precioSugerido,
    required this.precioMaximo,
    this.costoCompra,
  });

  final double precioMinimo;
  final double precioSugerido;
  final double precioMaximo;
  final double? costoCompra;

  factory ProductFinanzas.fromRow(Map<String, dynamic> row) {
    double n(String key) => (row[key] as num?)?.toDouble() ?? 0;
    final costo = row['costoCompra'];
    return ProductFinanzas(
      precioMinimo: n('precioMinimo'),
      precioSugerido: n('precioSugerido'),
      precioMaximo: n('precioMaximo'),
      costoCompra: costo is num ? costo.toDouble() : null,
    );
  }

  Map<String, dynamic> toCatalogMap() => {
    'precioMinimo': precioMinimo,
    'precioSugerido': precioSugerido,
    'precioMaximo': precioMaximo,
    if (costoCompra != null) 'costoCompra': costoCompra,
  };
}

class PendingSaleLine {
  PendingSaleLine({
    required this.id,
    required this.productId,
    required this.color,
    required this.talla,
    required this.quantity,
    required this.salePrice,
  });

  final String id;
  final String productId;
  final String color;
  final String talla;
  final int quantity;
  final double salePrice;

  double get total => salePrice * quantity;
}

class SaleCustomer {
  const SaleCustomer({this.dni = '', this.nombres = '', this.apellidos = ''});

  final String dni;
  final String nombres;
  final String apellidos;

  Map<String, String> toJson() => {
    'dni': dni,
    'nombres': nombres,
    'apellidos': apellidos,
  };

  SaleCustomer copyWith({String? dni, String? nombres, String? apellidos}) {
    return SaleCustomer(
      dni: dni ?? this.dni,
      nombres: nombres ?? this.nombres,
      apellidos: apellidos ?? this.apellidos,
    );
  }
}

const emptySaleCustomer = SaleCustomer();

String newPendingLineId() =>
    '${DateTime.now().millisecondsSinceEpoch}-${DateTime.now().microsecond % 10000}';

String makeDocumentNumber(String type, String dateIso) {
  final prefix = type == 'nota_venta' ? 'NV' : 'GR';
  final stamp = dateIso.replaceAll('-', '');
  final ms = DateTime.now().millisecondsSinceEpoch.toString();
  final suffix = (ms.length >= 5 ? ms.substring(ms.length - 5) : ms)
      .toUpperCase();
  return '$prefix-$stamp-$suffix';
}

bool isSaleCustomerReadyForDocument(
  bool requiresCustomer,
  SaleCustomer customer,
  String validatedDni,
) {
  if (!requiresCustomer) return true;
  final dni = normalizeDni(customer.dni);
  return isValidDni(dni) &&
      validatedDni == dni &&
      customer.nombres.trim().isNotEmpty &&
      customer.apellidos.trim().isNotEmpty;
}

class SalesTotalsSnapshot {
  const SalesTotalsSnapshot({
    required this.cantidad,
    required this.total,
    required this.ganancia,
    required this.pendingCantidad,
    required this.pendingTotal,
    required this.pendingGanancia,
  });

  final int cantidad;
  final double total;
  final double ganancia;
  final int pendingCantidad;
  final double pendingTotal;
  final double pendingGanancia;
}

double saleLineProfit(
  PendingSaleLine line,
  Map<String, dynamic>? product,
) {
  final fin = product != null ? finanzasFromProduct(product) : null;
  final cost = fin?.costoCompra ?? line.salePrice;
  return (line.salePrice - cost) * line.quantity;
}

ProductFinanzas? finanzasFromProduct(Map<String, dynamic> product) {
  final raw = product['finanzas'];
  if (raw is! Map) return null;
  return ProductFinanzas.fromRow(Map<String, dynamic>.from(raw));
}

SalesTotalsSnapshot computeSalesTotals({
  required List<Map<String, dynamic>> sales,
  required List<PendingSaleLine> pendingLines,
  required List<Map<String, dynamic>> products,
  required String dateIso,
}) {
  var cantidad = 0;
  var total = 0.0;
  var ganancia = 0.0;

  for (final sale in sales) {
    if (sale['devuelto'] == true) continue;
    if (sale['fecha']?.toString() != dateIso) continue;
    cantidad += (sale['cantidad'] as int?) ?? 0;
    total += (sale['total'] as num?)?.toDouble() ?? 0;
    ganancia += (sale['ganancia'] as num?)?.toDouble() ?? 0;
  }

  var pCant = 0;
  var pTotal = 0.0;
  var pGan = 0.0;
  for (final line in pendingLines) {
    Map<String, dynamic>? product;
    for (final p in products) {
      if (p['id']?.toString() == line.productId) {
        product = p;
        break;
      }
    }
    pCant += line.quantity;
    pTotal += line.total;
    pGan += saleLineProfit(line, product);
  }

  return SalesTotalsSnapshot(
    cantidad: cantidad + pCant,
    total: total + pTotal,
    ganancia: ganancia + pGan,
    pendingCantidad: pCant,
    pendingTotal: pTotal,
    pendingGanancia: pGan,
  );
}

String? messageForInvalidAddSaleLine({
  required Map<String, dynamic>? selectedProduct,
  required ProductFinanzas? finanzas,
  required List<String> availableColors,
  required String selectedColor,
  required List<String> availableSizes,
  required String selectedTalla,
  required int quantity,
  required int availableForSelected,
  required double salePrice,
  String finanzasMissingMessage =
      'Este producto no tiene rango de precio configurado. Avisa a administración.',
}) {
  if (selectedProduct == null) return 'Selecciona un producto';
  if (finanzas == null) return finanzasMissingMessage;
  if (availableColors.isNotEmpty && selectedColor.isEmpty) {
    return 'Selecciona un color';
  }
  if (availableSizes.isNotEmpty && selectedTalla.isEmpty) {
    return 'Selecciona una talla';
  }
  if (quantity <= 0) return 'La cantidad debe ser mayor a cero';
  if (quantity > availableForSelected) {
    return 'La cantidad supera el stock disponible para esa talla';
  }
  if (salePrice < finanzas.precioMinimo || salePrice > finanzas.precioMaximo) {
    return 'El precio debe estar dentro del rango mínimo y máximo';
  }
  return null;
}

List<Map<String, dynamic>> buildAdminRegisterPayload({
  required List<PendingSaleLine> lines,
  required List<Map<String, dynamic>> products,
  required String dateIso,
  required String documentType,
  String? docNumber,
  SaleCustomer? saleCustomer,
  required String encargadoUid,
  required String encargadoNombre,
  required String encargadoEmail,
}) {
  return lines.map((line) {
    final product = products.firstWhere(
      (p) => p['id']?.toString() == line.productId,
      orElse: () => <String, dynamic>{},
    );
    if (product.isEmpty) throw Exception('Producto no encontrado');
    final fin = finanzasFromProduct(product);
    if (fin == null) throw Exception('Producto sin finanzas');
    final total = line.total;
    final costoCompra = fin.costoCompra ?? 0;
    final costoTotal = costoCompra * line.quantity;
    return {
      'productId': line.productId,
      'codigo': product['codigo']?.toString() ?? 'SIN-CODIGO',
      'nombre': product['nombre']?.toString() ?? '',
      'color': line.color.isNotEmpty
          ? line.color
          : (product['color'] as String? ?? ''),
      if (line.talla.isNotEmpty) 'talla': line.talla,
      'fecha': dateIso,
      'cantidad': line.quantity,
      'precioVenta': line.salePrice,
      'total': total,
      'costoUnitario': costoCompra,
      'costoTotal': costoTotal,
      'ganancia': total - costoTotal,
      'documentoTipo': documentType,
      if (docNumber != null && docNumber.isNotEmpty) 'documentoNumero': docNumber,
      if (saleCustomer != null) 'cliente': saleCustomer.toJson(),
      'encargadoUid': encargadoUid,
      'encargadoNombre': encargadoNombre,
      'encargadoEmail': encargadoEmail,
    };
  }).toList();
}

List<Map<String, dynamic>> buildStaffRegisterPayload({
  required List<PendingSaleLine> lines,
  required List<Map<String, dynamic>> products,
  required String dateIso,
  required String documentType,
  String? docNumber,
  SaleCustomer? saleCustomer,
  required String encargadoUid,
  required String encargadoNombre,
  required String encargadoEmail,
}) {
  return lines.map((line) {
    final product = products.firstWhere(
      (p) => p['id']?.toString() == line.productId,
      orElse: () => <String, dynamic>{},
    );
    if (product.isEmpty) throw Exception('Producto no encontrado');
    final total = line.total;
    return {
      'productId': line.productId,
      'codigo': product['codigo']?.toString() ?? 'SIN-CODIGO',
      'nombre': product['nombre']?.toString() ?? '',
      'color': line.color.isNotEmpty
          ? line.color
          : (product['color'] as String? ?? ''),
      if (line.talla.isNotEmpty) 'talla': line.talla,
      'fecha': dateIso,
      'cantidad': line.quantity,
      'precioVenta': line.salePrice,
      'total': total,
      'documentoTipo': documentType,
      if (docNumber != null && docNumber.isNotEmpty) 'documentoNumero': docNumber,
      if (saleCustomer != null) 'cliente': saleCustomer.toJson(),
      'encargadoUid': encargadoUid,
      'encargadoNombre': encargadoNombre,
      'encargadoEmail': encargadoEmail,
    };
  }).toList();
}
