// Utilidades de producto para ventas (alineado con web colors.ts / stock.ts).

String _capitalizeWords(String value) {
  final trimmed = value.trim().toLowerCase().replaceAll(RegExp(r'\s+'), ' ');
  if (trimmed.isEmpty) return '';
  return trimmed.split(' ').map((word) {
    if (word.isEmpty) return word;
    return word[0].toUpperCase() + word.substring(1);
  }).join(' ');
}

List<String> parseColorList(String value) {
  final unique = <String, String>{};
  for (final part in value.split(',')) {
    final color = _capitalizeWords(part);
    if (color.isEmpty) continue;
    unique[color.toLowerCase()] = color;
  }
  return unique.values.take(5).toList();
}

List<String> getProductColors(Map<String, dynamic> product) {
  final colores = product['colores'];
  if (colores is List && colores.isNotEmpty) {
    return colores
        .map((e) => _capitalizeWords(e.toString()))
        .where((c) => c.isNotEmpty)
        .take(5)
        .toList();
  }
  return parseColorList(product['color'] as String? ?? '');
}

List<String> getAvailableSizes(Map<String, dynamic> product) {
  final ts = product['tallaStock'];
  if (ts is Map) {
    return ts.entries
        .where((e) => (e.value as num? ?? 0) > 0)
        .map((e) => e.key.toString())
        .toList();
  }
  final tallas = product['tallas'];
  if (tallas is List) {
    return tallas.map((e) => e.toString()).toList();
  }
  return [];
}

int getSizeStock(Map<String, dynamic> product, String size) {
  final ts = product['tallaStock'];
  if (ts is Map) return (ts[size] as num? ?? 0).toInt();
  return (product['stock'] as num? ?? 0).toInt();
}

List<Map<String, dynamic>> filterDailySalesBySearch(
  List<Map<String, dynamic>> sales,
  String term,
) {
  final q = term.trim().toLowerCase();
  if (q.isEmpty) return sales;
  return sales.where((s) {
    final cliente = s['cliente'];
    final clienteMap = cliente is Map ? Map<String, dynamic>.from(cliente) : null;
    final fields = [
      s['codigo'],
      s['nombre'],
      s['color'],
      s['talla'],
      clienteMap?['dni'],
      clienteMap?['nombres'],
      clienteMap?['apellidos'],
      s['documentoNumero'],
      s['encargadoNombre'],
      s['encargadoEmail'],
    ];
    return fields.any((v) => v?.toString().toLowerCase().contains(q) ?? false);
  }).toList();
}

String formatSaleTime(String? iso) {
  if (iso == null) return '–';
  final dt = DateTime.tryParse(iso)?.toLocal();
  if (dt == null) return '–';
  final h = dt.hour > 12 ? dt.hour - 12 : (dt.hour == 0 ? 12 : dt.hour);
  final ampm = dt.hour >= 12 ? 'p. m.' : 'a. m.';
  final min = dt.minute.toString().padLeft(2, '0');
  return '$h:$min $ampm';
}
