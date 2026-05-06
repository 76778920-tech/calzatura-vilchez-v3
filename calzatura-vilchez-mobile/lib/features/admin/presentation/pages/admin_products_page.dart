import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart' as sb;

import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/back_navigation_scope.dart';

final _supabase = sb.Supabase.instance.client;

String _generateId() {
  final random = Random.secure();
  final bytes = List<int>.generate(16, (_) => random.nextInt(256));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  String hex(int n) => n.toRadixString(16).padLeft(2, '0');
  return '${bytes.sublist(0, 4).map(hex).join()}-${bytes.sublist(4, 6).map(hex).join()}-${bytes.sublist(6, 8).map(hex).join()}-${bytes.sublist(8, 10).map(hex).join()}-${bytes.sublist(10, 16).map(hex).join()}';
}

const _categorias = ['hombre', 'dama', 'juvenil', 'nino', 'bebe'];
const _tiposCalzado = {
  'dama': [
    'Zapatillas',
    'Sandalias',
    'Zapatos Casuales',
    'Zapatos de Vestir',
    'Mocasines',
    'Botas y Botines',
    'Ballerinas',
    'Pantuflas',
    'Flip Flops',
  ],
  'hombre': [
    'Zapatillas',
    'Zapatos de Vestir',
    'Zapatos Casuales',
    'Sandalias',
    'Botines',
    'Zapatos de Seguridad',
    'Pantuflas',
  ],
  'nino': ['Escolar', 'Sandalias', 'Zapatillas', 'Zapatos'],
  'juvenil': ['Escolar', 'Zapatillas', 'Sandalias', 'Zapatos', 'Botines'],
  'bebe': ['Zapatos', 'Sandalias', 'Zapatillas', 'Pantuflas'],
};
const _tallasPorCategoria = {
  'hombre': ['37', '38', '39', '40', '41', '42', '43', '44', '45'],
  'dama': ['32', '33', '34', '35', '36', '37', '38', '39', '40'],
  'juvenil': ['33', '34', '35', '36', '37', '38'],
  'nino': ['24', '25', '26', '27', '28', '29', '30', '31', '32'],
  'bebe': ['18', '19', '20', '21', '22'],
};

String _normalizeAdminCategory(String category) {
  if (category == 'mujer') return 'dama';
  return _categorias.contains(category) ? category : 'hombre';
}

List<String> _sizesForCategory(String category) {
  return _tallasPorCategoria[_normalizeAdminCategory(category)] ??
      _tallasPorCategoria['hombre']!;
}

List<String> _typesForCategory(String category) {
  return _tiposCalzado[_normalizeAdminCategory(category)] ??
      _tiposCalzado['hombre']!;
}

String _normalizeVariantCode(String value) {
  return value.toUpperCase().replaceAll(RegExp(r'[^A-Z0-9-]'), '').trim();
}

bool _isValidVariantCode(String value) {
  return RegExp(r'^[A-Z0-9-]{3,40}$').hasMatch(value);
}

double _parseDouble(String value) {
  return double.tryParse(value.replaceAll(',', '.').trim()) ?? 0;
}

double _roundMoney(double value) {
  return (value * 100).roundToDouble() / 100;
}

Map<String, double> _calculatePriceRange({
  required double cost,
  required double minMargin,
  required double targetMargin,
  required double maxMargin,
}) {
  final safeCost = max(0, cost);
  final safeMin = max(0, minMargin);
  final safeTarget = max(safeMin, targetMargin);
  final safeMax = max(safeTarget, maxMargin);

  return {
    'margenMinimo': safeMin.toDouble(),
    'margenObjetivo': safeTarget.toDouble(),
    'margenMaximo': safeMax.toDouble(),
    'precioMinimo': _roundMoney(safeCost * (1 + safeMin / 100)),
    'precioSugerido': _roundMoney(safeCost * (1 + safeTarget / 100)),
    'precioMaximo': _roundMoney(safeCost * (1 + safeMax / 100)),
  };
}

Future<Map<String, String>> _fetchProductCodesMap() async {
  final data = await _supabase
      .from('productoCodigos')
      .select('productoId, codigo');
  return List<Map<String, dynamic>>.from(
    data as List,
  ).fold<Map<String, String>>({}, (acc, row) {
    final productId = row['productoId']?.toString();
    final code = row['codigo']?.toString().trim() ?? '';
    if (productId != null && code.isNotEmpty) {
      acc[productId] = code;
    }
    return acc;
  });
}

Future<Map<String, Map<String, dynamic>>> _fetchProductFinancialsMap() async {
  final data = await _supabase
      .from('productoFinanzas')
      .select(
        'productId, costoCompra, margenMinimo, margenObjetivo, margenMaximo, precioMinimo, precioSugerido, precioMaximo',
      );
  return List<Map<String, dynamic>>.from(
    data as List,
  ).fold<Map<String, Map<String, dynamic>>>({}, (acc, row) {
    final productId = row['productId']?.toString();
    if (productId != null && productId.isNotEmpty) {
      acc[productId] = Map<String, dynamic>.from(row);
    }
    return acc;
  });
}

final adminProductsProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
      final productsData = await _supabase
          .from('productos')
          .select(
            'id, nombre, marca, categoria, tipoCalzado, precio, stock, color, imagen, imagenes, activo, destacado, tallaStock, tallas, descuento, campana, material, estilo, descripcion, familiaId',
          )
          .order('nombre');
      final products = List<Map<String, dynamic>>.from(productsData as List);
      final codesByProduct = await _fetchProductCodesMap();
      final financialsByProduct = await _fetchProductFinancialsMap();

      return products.map((product) {
        final merged = Map<String, dynamic>.from(product);
        merged['categoria'] = _normalizeAdminCategory(
          merged['categoria']?.toString() ?? '',
        );
        merged['codigo'] = codesByProduct[product['id']] ?? '';
        merged['finanzas'] = financialsByProduct[product['id']] ?? {};
        return merged;
      }).toList();
    });

class AdminProductsPage extends ConsumerStatefulWidget {
  const AdminProductsPage({super.key});

  @override
  ConsumerState<AdminProductsPage> createState() => _AdminProductsPageState();
}

class _AdminProductsPageState extends ConsumerState<AdminProductsPage> {
  final _searchCtrl = TextEditingController();
  bool _searching = false;
  String _categoryFilter = 'todos';
  String _stockFilter = 'todos';

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  List<Map<String, dynamic>> _filterProducts(
    List<Map<String, dynamic>> products,
  ) {
    var list = products;

    if (_categoryFilter != 'todos') {
      list = list.where((p) => p['categoria'] == _categoryFilter).toList();
    }

    if (_stockFilter == 'bajo') {
      list = list.where((p) {
        final stock = (p['stock'] as num?)?.toInt() ?? 0;
        return stock > 0 && stock <= 5;
      }).toList();
    } else if (_stockFilter == 'sin') {
      list = list
          .where((p) => ((p['stock'] as num?)?.toInt() ?? 0) == 0)
          .toList();
    }

    final query = _searchCtrl.text.trim().toLowerCase();
    if (query.isNotEmpty) {
      list = list.where((p) {
        final haystack = [
          p['codigo'],
          p['nombre'],
          p['marca'],
          p['color'],
          p['categoria'],
          p['tipoCalzado'],
          p['descripcion'],
        ].map((value) => value?.toString() ?? '').join(' ').toLowerCase();
        return haystack.contains(query);
      }).toList();
    }

    return list;
  }

  Future<void> _toggleActive(Map<String, dynamic> product) async {
    final current = product['activo'] == true;
    await _supabase
        .from('productos')
        .update({'activo': !current})
        .eq('id', product['id']);
    ref.invalidate(adminProductsProvider);
  }

  Future<void> _confirmDelete(
    BuildContext context,
    Map<String, dynamic> product,
  ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Eliminar producto'),
        content: Text(
          '¿Eliminar "${product['nombre']}"? Esta acción no se puede deshacer.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancelar'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text(
              'Eliminar',
              style: TextStyle(color: AppColors.error),
            ),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    await _supabase
        .from('productoCodigos')
        .delete()
        .eq('productoId', product['id']);
    await _supabase
        .from('productoFinanzas')
        .delete()
        .eq('productId', product['id']);
    await _supabase.from('productos').delete().eq('id', product['id']);
    ref.invalidate(adminProductsProvider);
  }

  void _openProductForm(BuildContext context, Map<String, dynamic>? product) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _ProductFormSheet(
        product: product,
        onSaved: () => ref.invalidate(adminProductsProvider),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final productsAsync = ref.watch(adminProductsProvider);

    return BackNavigationScope(
      fallbackRoute: '/admin',
      child: Scaffold(
        backgroundColor: AppColors.beige,
        appBar: AppBar(
          backgroundColor: AppColors.black,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios_new, size: 18),
            onPressed: () =>
                handleBackNavigation(context, fallbackRoute: '/admin'),
          ),
          title: _searching
              ? TextField(
                  controller: _searchCtrl,
                  autofocus: true,
                  style: const TextStyle(color: Colors.white, fontSize: 14),
                  cursorColor: AppColors.gold,
                  decoration: const InputDecoration(
                    hintText: 'Buscar por código, nombre, marca...',
                    hintStyle: TextStyle(color: Colors.white38, fontSize: 13),
                    border: InputBorder.none,
                  ),
                  onChanged: (_) => setState(() {}),
                )
              : const Text(
                  'Productos',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                ),
          actions: [
            IconButton(
              icon: Icon(
                _searching ? Icons.close : Icons.search_rounded,
                color: Colors.white70,
              ),
              onPressed: () => setState(() {
                _searching = !_searching;
                if (!_searching) _searchCtrl.clear();
              }),
            ),
            IconButton(
              icon: const Icon(
                Icons.add_rounded,
                color: AppColors.gold,
                size: 26,
              ),
              onPressed: () => _openProductForm(context, null),
            ),
          ],
        ),
        body: productsAsync.when(
          loading: () => const Center(
            child: CircularProgressIndicator(color: AppColors.gold),
          ),
          error: (error, _) => Center(child: Text('Error: $error')),
          data: (products) {
            final filtered = _filterProducts(products);
            final lowStock = products.where((p) {
              final stock = (p['stock'] as num?)?.toInt() ?? 0;
              return stock > 0 && stock <= 5;
            }).length;
            final outOfStock = products
                .where((p) => ((p['stock'] as num?)?.toInt() ?? 0) == 0)
                .length;
            final featured = products
                .where((p) => p['destacado'] == true)
                .length;

            return RefreshIndicator(
              color: AppColors.gold,
              onRefresh: () async => ref.invalidate(adminProductsProvider),
              child: CustomScrollView(
                slivers: [
                  SliverToBoxAdapter(
                    child: Container(
                      color: AppColors.black,
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                      child: Row(
                        children: [
                          _StatChip(
                            label: 'Total',
                            value: '${products.length}',
                            color: AppColors.gold,
                          ),
                          const SizedBox(width: 8),
                          _StatChip(
                            label: 'Stock bajo',
                            value: '$lowStock',
                            color: AppColors.warning,
                          ),
                          const SizedBox(width: 8),
                          _StatChip(
                            label: 'Sin stock',
                            value: '$outOfStock',
                            color: AppColors.error,
                          ),
                          const SizedBox(width: 8),
                          _StatChip(
                            label: 'Destacados',
                            value: '$featured',
                            color: AppColors.success,
                          ),
                        ],
                      ),
                    ),
                  ),
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(12, 12, 12, 4),
                      child: _FilterChips(
                        items: {
                          'todos': 'Todos',
                          'hombre': 'Hombre',
                          'dama': 'Dama',
                          'juvenil': 'Juvenil',
                          'nino': 'Niños',
                          'bebe': 'Bebé',
                        },
                        selected: _categoryFilter,
                        onSelect: (value) =>
                            setState(() => _categoryFilter = value),
                      ),
                    ),
                  ),
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
                      child: _FilterChips(
                        items: {
                          'todos': 'Todo stock',
                          'bajo': 'Stock bajo ≤5',
                          'sin': 'Sin stock',
                        },
                        selected: _stockFilter,
                        onSelect: (value) =>
                            setState(() => _stockFilter = value),
                      ),
                    ),
                  ),
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                      child: Text(
                        '${filtered.length} productos',
                        style: const TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ),
                  if (filtered.isEmpty)
                    const SliverFillRemaining(
                      child: Center(
                        child: Text(
                          'Sin productos',
                          style: TextStyle(color: AppColors.textSecondary),
                        ),
                      ),
                    )
                  else
                    SliverPadding(
                      padding: const EdgeInsets.fromLTRB(12, 0, 12, 80),
                      sliver: SliverList(
                        delegate: SliverChildBuilderDelegate((ctx, index) {
                          final product = filtered[index];
                          return _ProductTile(
                            product: product,
                            index: index,
                            onEdit: () => _openProductForm(context, product),
                            onDelete: () => _confirmDelete(context, product),
                            onToggleActive: () => _toggleActive(product),
                          );
                        }, childCount: filtered.length),
                      ),
                    ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

class _ProductTile extends StatelessWidget {
  const _ProductTile({
    required this.product,
    required this.index,
    required this.onEdit,
    required this.onDelete,
    required this.onToggleActive,
  });

  final Map<String, dynamic> product;
  final int index;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  final VoidCallback onToggleActive;

  Color _stockColor(int stock) {
    if (stock == 0) return AppColors.error;
    if (stock <= 5) return AppColors.warning;
    return AppColors.success;
  }

  @override
  Widget build(BuildContext context) {
    final stock = (product['stock'] as num?)?.toInt() ?? 0;
    final activo = product['activo'] == true;
    final destacado = product['destacado'] == true;
    final finanzas = Map<String, dynamic>.from(
      product['finanzas'] as Map? ?? {},
    );
    final precioSugerido = (finanzas['precioSugerido'] as num?)?.toDouble();
    final imagen = product['imagen']?.toString() ?? '';

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: activo ? null : Border.all(color: AppColors.shimmerBase),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: const BorderRadius.horizontal(
              left: Radius.circular(14),
            ),
            child: SizedBox(
              width: 76,
              height: 96,
              child: imagen.isNotEmpty
                  ? Image.network(
                      imagen,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) =>
                          const _PlaceholderImg(),
                    )
                  : const _PlaceholderImg(),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          product['nombre']?.toString() ?? '',
                          style: const TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 13,
                            color: AppColors.textPrimary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (destacado)
                        Container(
                          margin: const EdgeInsets.only(left: 4),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.gold.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Text(
                            '★',
                            style: TextStyle(
                              color: AppColors.gold,
                              fontSize: 10,
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${product['marca'] ?? 'Sin marca'} · ${(product['categoria'] ?? '').toString().toUpperCase()}',
                    style: const TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 11,
                    ),
                  ),
                  if ((product['codigo']?.toString() ?? '').isNotEmpty)
                    Text(
                      product['codigo'].toString(),
                      style: const TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 10,
                      ),
                    ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Text(
                        'S/ ${((product['precio'] as num?)?.toDouble() ?? 0).toStringAsFixed(2)}',
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          color: AppColors.textPrimary,
                          fontSize: 13,
                        ),
                      ),
                      if (precioSugerido != null) ...[
                        const SizedBox(width: 8),
                        Text(
                          'Sug. S/ ${precioSugerido.toStringAsFixed(2)}',
                          style: const TextStyle(
                            color: AppColors.textSecondary,
                            fontSize: 10,
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 6),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: [
                      _TagPill(
                        label: 'Stock: $stock',
                        color: _stockColor(stock),
                      ),
                      _TagPill(
                        label: activo ? 'Activo' : 'Oculto',
                        color: activo ? AppColors.success : AppColors.error,
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              IconButton(
                icon: const Icon(
                  Icons.visibility_outlined,
                  size: 18,
                  color: AppColors.textSecondary,
                ),
                onPressed: onToggleActive,
                visualDensity: VisualDensity.compact,
              ),
              IconButton(
                icon: const Icon(
                  Icons.edit_outlined,
                  size: 18,
                  color: AppColors.gold,
                ),
                onPressed: onEdit,
                visualDensity: VisualDensity.compact,
              ),
              IconButton(
                icon: const Icon(
                  Icons.delete_outline_rounded,
                  size: 18,
                  color: AppColors.error,
                ),
                onPressed: onDelete,
                visualDensity: VisualDensity.compact,
              ),
            ],
          ),
          const SizedBox(width: 4),
        ],
      ),
    ).animate(delay: Duration(milliseconds: index * 30)).fadeIn(duration: 300.ms);
  }
}

class _ProductFormSheet extends StatefulWidget {
  const _ProductFormSheet({required this.product, required this.onSaved});

  final Map<String, dynamic>? product;
  final VoidCallback onSaved;

  @override
  State<_ProductFormSheet> createState() => _ProductFormSheetState();
}

class _ProductFormSheetState extends State<_ProductFormSheet> {
  final _formKey = GlobalKey<FormState>();

  late final TextEditingController _codeCtrl;
  late final TextEditingController _nameCtrl;
  late final TextEditingController _brandCtrl;
  late final TextEditingController _colorCtrl;
  late final TextEditingController _priceCtrl;
  late final TextEditingController _costCtrl;
  late final TextEditingController _minMarginCtrl;
  late final TextEditingController _targetMarginCtrl;
  late final TextEditingController _maxMarginCtrl;
  late final TextEditingController _imageCtrl;
  late final TextEditingController _descriptionCtrl;

  late String _category;
  late String _type;
  late bool _active;
  late bool _featured;
  Map<String, int> _sizeStock = {};
  bool _saving = false;

  Map<String, double> get _priceRange => _calculatePriceRange(
    cost: _parseDouble(_costCtrl.text),
    minMargin: _parseDouble(_minMarginCtrl.text),
    targetMargin: _parseDouble(_targetMarginCtrl.text),
    maxMargin: _parseDouble(_maxMarginCtrl.text),
  );

  @override
  void initState() {
    super.initState();
    final product = widget.product;
    final financials = Map<String, dynamic>.from(
      product?['finanzas'] as Map? ?? {},
    );

    _category = _normalizeAdminCategory(
      product?['categoria']?.toString() ?? 'hombre',
    );
    _type =
        product?['tipoCalzado']?.toString() ??
        _typesForCategory(_category).first;
    if (!_typesForCategory(_category).contains(_type)) {
      _type = _typesForCategory(_category).first;
    }

    _codeCtrl = TextEditingController(
      text: product?['codigo']?.toString() ?? '',
    );
    _nameCtrl = TextEditingController(
      text: product?['nombre']?.toString() ?? '',
    );
    _brandCtrl = TextEditingController(
      text: product?['marca']?.toString() ?? '',
    );
    _colorCtrl = TextEditingController(
      text: product?['color']?.toString() ?? '',
    );
    _priceCtrl = TextEditingController(
      text: product == null
          ? ''
          : ((product['precio'] as num?)?.toDouble() ?? 0).toStringAsFixed(2),
    );
    _costCtrl = TextEditingController(
      text: financials.isEmpty
          ? ''
          : ((financials['costoCompra'] as num?)?.toDouble() ?? 0)
                .toStringAsFixed(2),
    );
    _minMarginCtrl = TextEditingController(
      text: ((financials['margenMinimo'] as num?)?.toDouble() ?? 25)
          .toStringAsFixed(0),
    );
    _targetMarginCtrl = TextEditingController(
      text: ((financials['margenObjetivo'] as num?)?.toDouble() ?? 45)
          .toStringAsFixed(0),
    );
    _maxMarginCtrl = TextEditingController(
      text: ((financials['margenMaximo'] as num?)?.toDouble() ?? 75)
          .toStringAsFixed(0),
    );
    _imageCtrl = TextEditingController(
      text: product?['imagen']?.toString() ?? '',
    );
    _descriptionCtrl = TextEditingController(
      text: product?['descripcion']?.toString() ?? '',
    );
    _active = product?['activo'] != false;
    _featured = product?['destacado'] == true;

    final rawStock = product?['tallaStock'];
    if (rawStock is Map) {
      _sizeStock = rawStock.map(
        (key, value) => MapEntry(key.toString(), (value as num?)?.toInt() ?? 0),
      );
    } else {
      _sizeStock = {};
    }
  }

  @override
  void dispose() {
    for (final controller in [
      _codeCtrl,
      _nameCtrl,
      _brandCtrl,
      _colorCtrl,
      _priceCtrl,
      _costCtrl,
      _minMarginCtrl,
      _targetMarginCtrl,
      _maxMarginCtrl,
      _imageCtrl,
      _descriptionCtrl,
    ]) {
      controller.dispose();
    }
    super.dispose();
  }

  int get _totalStock => _sizeStock.values.fold(0, (sum, qty) => sum + qty);

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;

    final normalizedCode = _normalizeVariantCode(_codeCtrl.text);
    final price = _parseDouble(_priceCtrl.text);
    final cost = _parseDouble(_costCtrl.text);
    final color = _colorCtrl.text.trim();
    final image = _imageCtrl.text.trim();
    final minMargin = _parseDouble(_minMarginCtrl.text);
    final targetMargin = _parseDouble(_targetMarginCtrl.text);
    final maxMargin = _parseDouble(_maxMarginCtrl.text);
    final range = _calculatePriceRange(
      cost: cost,
      minMargin: minMargin,
      targetMargin: targetMargin,
      maxMargin: maxMargin,
    );

    if (!_isValidVariantCode(normalizedCode)) {
      _showError(
        'El código debe tener 3 a 40 caracteres y solo usar letras, números o guiones.',
      );
      return;
    }

    final existingCodes = await _fetchProductCodesMap();
    final currentId = widget.product?['id']?.toString();
    final duplicate = existingCodes.entries.any(
      (entry) =>
          entry.key != currentId &&
          _normalizeVariantCode(entry.value) == normalizedCode,
    );
    if (duplicate) {
      _showError('El código "$normalizedCode" ya existe en otro producto.');
      return;
    }

    if (_nameCtrl.text.trim().isEmpty || price <= 0) {
      _showError('Nombre y precio son requeridos.');
      return;
    }
    if (_brandCtrl.text.trim().isEmpty) {
      _showError('La marca es obligatoria.');
      return;
    }
    if (!_categorias.contains(_category)) {
      _showError('Selecciona una categoría comercial válida.');
      return;
    }
    if (!_typesForCategory(_category).contains(_type)) {
      _showError('Selecciona un tipo de calzado acorde a la categoría.');
      return;
    }
    if (cost <= 0) {
      _showError('Registra el costo real de compra.');
      return;
    }
    if (minMargin > targetMargin || targetMargin > maxMargin) {
      _showError('Ordena los márgenes: mínimo, objetivo y máximo.');
      return;
    }
    if (price < (range['precioMinimo'] ?? 0) ||
        price > (range['precioMaximo'] ?? double.infinity)) {
      _showError(
        'El precio público debe estar dentro del rango comercial calculado.',
      );
      return;
    }
    if (color.isEmpty) {
      _showError('Registra el color del producto.');
      return;
    }
    if (_totalStock <= 0) {
      _showError('Registra al menos una talla con stock.');
      return;
    }
    if (image.isEmpty || Uri.tryParse(image)?.hasAbsolutePath != true) {
      _showError('Ingresa una URL válida para la imagen principal.');
      return;
    }

    setState(() => _saving = true);

    final filteredStock = <String, int>{};
    for (final size in _sizesForCategory(_category)) {
      final qty = _sizeStock[size] ?? 0;
      if (qty > 0) filteredStock[size] = qty;
    }
    final sizes = filteredStock.keys.toList()
      ..sort((a, b) => int.parse(a).compareTo(int.parse(b)));
    final familyId =
        (widget.product?['familiaId']?.toString().trim().isNotEmpty ?? false)
        ? widget.product!['familiaId'].toString().trim()
        : (widget.product?['id']?.toString() ?? _generateId());

    final productPayload = {
      'nombre': _nameCtrl.text.trim(),
      'precio': price,
      'descripcion': _descriptionCtrl.text.trim(),
      'imagen': image,
      'imagenes': [image],
      'stock': _totalStock,
      'categoria': _category,
      'tipoCalzado': _type.trim(),
      'tallas': sizes,
      'tallaStock': filteredStock,
      'marca': _brandCtrl.text.trim(),
      'material': widget.product?['material']?.toString(),
      'estilo': widget.product?['estilo']?.toString(),
      'color': color,
      'familiaId': familyId,
      'destacado': _featured,
      'activo': _active,
      'descuento': widget.product?['descuento'],
      'campana': widget.product?['campana'],
    };

    final financialPayload = {
      'costoCompra': cost,
      'margenMinimo': range['margenMinimo'],
      'margenObjetivo': range['margenObjetivo'],
      'margenMaximo': range['margenMaximo'],
      'precioMinimo': range['precioMinimo'],
      'precioSugerido': range['precioSugerido'],
      'precioMaximo': range['precioMaximo'],
    };

    try {
      if (widget.product != null) {
        await _supabase.rpc(
          'update_product_atomic',
          params: {
            'p_id': widget.product!['id'],
            'product': productPayload,
            'codigo': normalizedCode,
            'finanzas': financialPayload,
          },
        );
      } else {
        await _supabase.rpc(
          'create_product_variants_atomic',
          params: {
            'variants': [
              {
                ...productPayload,
                'codigo': normalizedCode,
                'finanzas': financialPayload,
              },
            ],
          },
        );
      }

      widget.onSaved();
      if (mounted) Navigator.pop(context);
    } catch (error) {
      final message = error.toString().toLowerCase();
      if (message.contains('duplicate') || message.contains('unique')) {
        _showError('Código duplicado: usa un código único para este producto.');
      } else if (message.contains('cv_guard_producto_tipo')) {
        _showError('El tipo de calzado no corresponde a la categoría.');
      } else if (message.contains('cv_guard_producto_precio') ||
          message.contains('cv_guard_producto_finanzas')) {
        _showError('El precio quedó fuera del rango comercial permitido.');
      } else {
        _showError('Error al guardar: $error');
      }
    } finally {
      if (mounted) {
        setState(() => _saving = false);
      }
    }
  }

  void _showError(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: AppColors.error),
    );
  }

  @override
  Widget build(BuildContext context) {
    final sizes = _sizesForCategory(_category);
    final types = _typesForCategory(_category);
    if (!types.contains(_type)) {
      _type = types.first;
    }

    return DraggableScrollableSheet(
      initialChildSize: 0.94,
      maxChildSize: 0.98,
      minChildSize: 0.58,
      builder: (ctx, scrollCtrl) => Container(
        decoration: const BoxDecoration(
          color: AppColors.beige,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.only(top: 12, bottom: 8),
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.shimmerBase,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
              child: Row(
                children: [
                  Text(
                    widget.product != null
                        ? 'Editar producto'
                        : 'Nuevo producto',
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),
            Expanded(
              child: Form(
                key: _formKey,
                child: ListView(
                  controller: scrollCtrl,
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
                  children: [
                    const _FormSection('Información básica'),
                    _Field(
                      ctrl: _codeCtrl,
                      label: 'Código interno *',
                      icon: Icons.qr_code_2_outlined,
                      textCapitalization: TextCapitalization.characters,
                      onChanged: (value) {
                        final normalized = _normalizeVariantCode(value);
                        if (value != normalized) {
                          _codeCtrl.value = _codeCtrl.value.copyWith(
                            text: normalized,
                            selection: TextSelection.collapsed(
                              offset: normalized.length,
                            ),
                          );
                        }
                      },
                    ),
                    _Field(
                      ctrl: _nameCtrl,
                      label: 'Nombre *',
                      icon: Icons.label_outline,
                      required: true,
                    ),
                    _Field(
                      ctrl: _brandCtrl,
                      label: 'Marca *',
                      icon: Icons.sell_outlined,
                      required: true,
                    ),
                    _Field(
                      ctrl: _colorCtrl,
                      label: 'Color *',
                      icon: Icons.palette_outlined,
                      required: true,
                    ),
                    _Field(
                      ctrl: _imageCtrl,
                      label: 'Imagen principal (URL) *',
                      icon: Icons.image_outlined,
                      required: true,
                    ),

                    const _FormSection('Categoría y tipo'),
                    _DropdownField(
                      label: 'Categoría',
                      value: _category,
                      items: _categorias,
                      onChanged: (value) {
                        if (value == null) return;
                        setState(() {
                          _category = value;
                          _type = _typesForCategory(value).first;
                          _sizeStock = {
                            for (final size in _sizesForCategory(value))
                              size: _sizeStock[size] ?? 0,
                          };
                        });
                      },
                    ),
                    const SizedBox(height: 12),
                    _DropdownField(
                      label: 'Tipo de calzado',
                      value: _type,
                      items: types,
                      onChanged: (value) {
                        if (value == null) return;
                        setState(() => _type = value);
                      },
                    ),

                    const _FormSection('Precios'),
                    _Field(
                      ctrl: _priceCtrl,
                      label: 'Precio de venta (S/) *',
                      icon: Icons.attach_money,
                      keyboard: const TextInputType.numberWithOptions(
                        decimal: true,
                      ),
                      required: true,
                    ),
                    _Field(
                      ctrl: _costCtrl,
                      label: 'Costo de compra (S/) *',
                      icon: Icons.payments_outlined,
                      keyboard: const TextInputType.numberWithOptions(
                        decimal: true,
                      ),
                      required: true,
                      onChanged: (_) => setState(() {}),
                    ),

                    const _FormSection('Reglas comerciales'),
                    Row(
                      children: [
                        Expanded(
                          child: _Field(
                            ctrl: _minMarginCtrl,
                            label: 'Margen mín. %',
                            icon: Icons.trending_down_rounded,
                            keyboard: const TextInputType.numberWithOptions(
                              decimal: true,
                            ),
                            onChanged: (_) => setState(() {}),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _Field(
                            ctrl: _targetMarginCtrl,
                            label: 'Margen obj. %',
                            icon: Icons.adjust_rounded,
                            keyboard: const TextInputType.numberWithOptions(
                              decimal: true,
                            ),
                            onChanged: (_) => setState(() {}),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _Field(
                            ctrl: _maxMarginCtrl,
                            label: 'Margen máx. %',
                            icon: Icons.trending_up_rounded,
                            keyboard: const TextInputType.numberWithOptions(
                              decimal: true,
                            ),
                            onChanged: (_) => setState(() {}),
                          ),
                        ),
                      ],
                    ),
                    _PriceRangeCard(
                      minPrice: _priceRange['precioMinimo'] ?? 0,
                      targetPrice: _priceRange['precioSugerido'] ?? 0,
                      maxPrice: _priceRange['precioMaximo'] ?? 0,
                    ),

                    const _FormSection('Stock por talla'),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: sizes.map((size) {
                        final qty = _sizeStock[size] ?? 0;
                        return _SizeBox(
                          size: size,
                          qty: qty,
                          onChanged: (value) =>
                              setState(() => _sizeStock[size] = value),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Stock total: $_totalStock',
                      style: const TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 12,
                      ),
                    ),

                    const _FormSection('Descripción'),
                    TextFormField(
                      controller: _descriptionCtrl,
                      maxLines: 3,
                      decoration: const InputDecoration(
                        labelText: 'Descripción',
                      ),
                    ),

                    const _FormSection('Opciones'),
                    _SwitchRow(
                      label: 'Visible en tienda',
                      icon: Icons.visibility_outlined,
                      value: _active,
                      onChanged: (value) => setState(() => _active = value),
                    ),
                    _SwitchRow(
                      label: 'Producto destacado',
                      icon: Icons.star_outline_rounded,
                      value: _featured,
                      onChanged: (value) => setState(() => _featured = value),
                    ),

                    const SizedBox(height: 24),
                    SizedBox(
                      height: 52,
                      child: ElevatedButton(
                        onPressed: _saving ? null : _save,
                        child: _saving
                            ? const CircularProgressIndicator(
                                color: AppColors.black,
                                strokeWidth: 2.4,
                              )
                            : Text(
                                widget.product != null
                                    ? 'Guardar cambios'
                                    : 'Crear producto',
                              ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PriceRangeCard extends StatelessWidget {
  const _PriceRangeCard({
    required this.minPrice,
    required this.targetPrice,
    required this.maxPrice,
  });

  final double minPrice;
  final double targetPrice;
  final double maxPrice;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(top: 4, bottom: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.shimmerBase),
      ),
      child: Row(
        children: [
          Expanded(
            child: _RangeMetric(label: 'Mínimo', value: minPrice),
          ),
          Expanded(
            child: _RangeMetric(
              label: 'Sugerido',
              value: targetPrice,
              highlight: true,
            ),
          ),
          Expanded(
            child: _RangeMetric(label: 'Máximo', value: maxPrice),
          ),
        ],
      ),
    );
  }
}

class _RangeMetric extends StatelessWidget {
  const _RangeMetric({
    required this.label,
    required this.value,
    this.highlight = false,
  });

  final String label;
  final double value;
  final bool highlight;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          label,
          style: const TextStyle(color: AppColors.textSecondary, fontSize: 11),
        ),
        const SizedBox(height: 6),
        Text(
          'S/ ${value.toStringAsFixed(2)}',
          style: TextStyle(
            color: highlight ? AppColors.goldDark : AppColors.textPrimary,
            fontWeight: FontWeight.w800,
            fontSize: 13,
          ),
        ),
      ],
    );
  }
}

class _PlaceholderImg extends StatelessWidget {
  const _PlaceholderImg();

  @override
  Widget build(BuildContext context) => Container(
    color: AppColors.shimmerBase,
    child: const Icon(
      Icons.image_outlined,
      color: AppColors.textSecondary,
      size: 28,
    ),
  );
}

class _TagPill extends StatelessWidget {
  const _TagPill({required this.label, required this.color});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 10,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _StatChip extends StatelessWidget {
  const _StatChip({
    required this.label,
    required this.value,
    required this.color,
  });

  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
    decoration: BoxDecoration(
      color: color.withValues(alpha: 0.15),
      borderRadius: BorderRadius.circular(10),
    ),
    child: Column(
      children: [
        Text(
          value,
          style: TextStyle(
            color: color,
            fontWeight: FontWeight.w800,
            fontSize: 16,
          ),
        ),
        Text(label, style: const TextStyle(color: Colors.white54, fontSize: 9)),
      ],
    ),
  );
}

class _FilterChips extends StatelessWidget {
  const _FilterChips({
    required this.items,
    required this.selected,
    required this.onSelect,
  });

  final Map<String, String> items;
  final String selected;
  final ValueChanged<String> onSelect;

  @override
  Widget build(BuildContext context) => SingleChildScrollView(
    scrollDirection: Axis.horizontal,
    child: Row(
      children: items.entries.map((entry) {
        final isSelected = entry.key == selected;
        return Padding(
          padding: const EdgeInsets.only(right: 6),
          child: GestureDetector(
            onTap: () => onSelect(entry.key),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: isSelected ? AppColors.black : Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: isSelected ? AppColors.black : AppColors.shimmerBase,
                ),
              ),
              child: Text(
                entry.value,
                style: TextStyle(
                  color: isSelected ? Colors.white : AppColors.textSecondary,
                  fontSize: 12,
                  fontWeight: isSelected ? FontWeight.w700 : FontWeight.normal,
                ),
              ),
            ),
          ),
        );
      }).toList(),
    ),
  );
}

class _FormSection extends StatelessWidget {
  const _FormSection(this.title);

  final String title;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 20, bottom: 10),
    child: Text(
      title.toUpperCase(),
      style: const TextStyle(
        color: AppColors.textSecondary,
        fontSize: 10,
        fontWeight: FontWeight.w700,
        letterSpacing: 1,
      ),
    ),
  );
}

class _Field extends StatelessWidget {
  const _Field({
    required this.ctrl,
    required this.label,
    required this.icon,
    this.keyboard,
    this.required = false,
    this.onChanged,
    this.textCapitalization = TextCapitalization.none,
  });

  final TextEditingController ctrl;
  final String label;
  final IconData icon;
  final TextInputType? keyboard;
  final bool required;
  final ValueChanged<String>? onChanged;
  final TextCapitalization textCapitalization;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: TextFormField(
      controller: ctrl,
      keyboardType: keyboard,
      textCapitalization: textCapitalization,
      onChanged: onChanged,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon, size: 18),
      ),
      validator: required
          ? (value) => (value == null || value.trim().isEmpty)
                ? 'Campo requerido'
                : null
          : null,
    ),
  );
}

class _DropdownField extends StatelessWidget {
  const _DropdownField({
    required this.label,
    required this.value,
    required this.items,
    required this.onChanged,
  });

  final String label;
  final String value;
  final List<String> items;
  final ValueChanged<String?> onChanged;

  @override
  Widget build(BuildContext context) => DropdownButtonFormField<String>(
    initialValue: items.contains(value) ? value : items.first,
    decoration: InputDecoration(labelText: label),
    items: items
        .map((item) => DropdownMenuItem(value: item, child: Text(item)))
        .toList(),
    onChanged: onChanged,
  );
}

class _SizeBox extends StatelessWidget {
  const _SizeBox({
    required this.size,
    required this.qty,
    required this.onChanged,
  });

  final String size;
  final int qty;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) => Container(
    width: 64,
    padding: const EdgeInsets.all(8),
    decoration: BoxDecoration(
      color: qty > 0 ? AppColors.gold.withValues(alpha: 0.1) : Colors.white,
      border: Border.all(
        color: qty > 0 ? AppColors.gold : AppColors.shimmerBase,
      ),
      borderRadius: BorderRadius.circular(10),
    ),
    child: Column(
      children: [
        Text(
          size,
          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12),
        ),
        const SizedBox(height: 4),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            GestureDetector(
              onTap: () {
                if (qty > 0) onChanged(qty - 1);
              },
              child: const Icon(
                Icons.remove,
                size: 14,
                color: AppColors.textSecondary,
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4),
              child: Text(
                '$qty',
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            GestureDetector(
              onTap: () => onChanged(qty + 1),
              child: const Icon(Icons.add, size: 14, color: AppColors.gold),
            ),
          ],
        ),
      ],
    ),
  );
}

class _SwitchRow extends StatelessWidget {
  const _SwitchRow({
    required this.label,
    required this.icon,
    required this.value,
    required this.onChanged,
  });

  final String label;
  final IconData icon;
  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.only(bottom: 8),
    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(12),
    ),
    child: Row(
      children: [
        Icon(icon, size: 18, color: AppColors.textSecondary),
        const SizedBox(width: 12),
        Expanded(child: Text(label, style: const TextStyle(fontSize: 14))),
        Switch(
          value: value,
          onChanged: onChanged,
          activeThumbColor: AppColors.gold,
        ),
      ],
    ),
  );
}
