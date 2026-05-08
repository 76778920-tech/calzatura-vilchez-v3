import 'dart:async';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart' as sb;

import '../../../../core/config/env.dart';
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
const _materialPresets = [
  'Cuero',
  'Gamuza',
  'Charol',
  'Nubuk',
  'Sintético',
  'Textil',
];
const _styleOptions = [
  'Urbanas',
  'Deportivas',
  'Casuales',
  'Outdoor',
  'Ejecutivo',
  'Weekend',
];
const _styleAllowedTypes = {
  'Urbanas': ['Zapatillas'],
  'Deportivas': ['Zapatillas'],
  'Casuales': [
    'Zapatillas',
    'Zapatos Casuales',
    'Zapatos',
    'Sandalias',
    'Botines',
  ],
  'Outdoor': ['Zapatillas', 'Botines'],
  'Ejecutivo': ['Zapatos de Vestir', 'Mocasines', 'Zapatos', 'Escolar'],
  'Weekend': [
    'Zapatillas',
    'Zapatos Casuales',
    'Botines',
    'Sandalias',
    'Mocasines',
  ],
};
const _colorPalette = [
  ('Negro', Color(0xFF111111)),
  ('Blanco', Color(0xFFF4F1E8)),
  ('Nude', Color(0xFFD9D4AD)),
  ('Camel', Color(0xFFC77B18)),
  ('Multicolor', Color(0xFF9C27B0)),
  ('Gris', Color(0xFF8D8D8D)),
  ('Dorado', Color(0xFFC9A227)),
  ('Plata', Color(0xFFC7C7C7)),
  ('Morado', Color(0xFFA349C4)),
  ('Azul Claro', Color(0xFFA7CBDD)),
  ('Azul', Color(0xFF3F46C9)),
  ('Verde', Color(0xFF189C1F)),
  ('Chocolate', Color(0xFFA87012)),
  ('Marrón', Color(0xFF915D38)),
  ('Rojo', Color(0xFFFF2F1F)),
  ('Rosa', Color(0xFFE5B0B2)),
  ('Café Claro', Color(0xFFD2B254)),
  ('Guinda', Color(0xFF7B2432)),
  ('Petróleo Oscuro', Color(0xFF2F535D)),
  ('Rose Gold', Color(0xFFD9C2B2)),
];

const _variantSlotCount = 5;
const _imageSlotCount = 2;

String _normalizeAdminCategory(String category) {
  if (category == 'mujer') return 'dama';
  return _categorias.contains(category) ? category : 'hombre';
}

List<String> _sizesForCategory(String category) {
  if (category.trim().isEmpty) return [];
  return _tallasPorCategoria[_normalizeAdminCategory(category)] ??
      _tallasPorCategoria['hombre']!;
}

List<String> _typesForCategory(String category) {
  if (category.trim().isEmpty) return [];
  return _tiposCalzado[_normalizeAdminCategory(category)] ??
      _tiposCalzado['hombre']!;
}

String _normalizeVariantCode(String value) {
  final normalized = value
      .toUpperCase()
      .replaceAll(RegExp(r'[^A-Z0-9-]'), '')
      .trim();
  return normalized.length > 40 ? normalized.substring(0, 40) : normalized;
}

bool _isValidVariantCode(String value) {
  return RegExp(r'^[A-Z0-9-]{3,40}$').hasMatch(value);
}

String _capitalizeWords(String value) => value
    .trim()
    .split(RegExp(r'\s+'))
    .where((part) => part.isNotEmpty)
    .map(
      (part) =>
          part[0].toUpperCase() +
          (part.length > 1 ? part.substring(1).toLowerCase() : ''),
    )
    .join(' ');

Color _colorSwatch(String colorName) {
  final normalized = colorName.toLowerCase();
  for (final item in _colorPalette) {
    if (item.$1.toLowerCase() == normalized) return item.$2;
  }
  return AppColors.textSecondary;
}

bool _isValidUrl(String value) {
  final uri = Uri.tryParse(value.trim());
  return uri != null && uri.hasScheme && uri.host.isNotEmpty;
}

Future<String> _pickAndUploadCloudinaryImage() async {
  final picked = await ImagePicker().pickImage(
    source: ImageSource.gallery,
    maxWidth: 1200,
    imageQuality: 78,
  );
  if (picked == null) return '';
  final length = await picked.length();
  if (length > 4 * 1024 * 1024) {
    throw Exception('La imagen supera 4 MB despues de comprimir.');
  }

  final request =
      http.MultipartRequest(
          'POST',
          Uri.parse(
            'https://api.cloudinary.com/v1_1/${Env.cloudinaryCloudName}/image/upload',
          ),
        )
        ..fields['upload_preset'] = Env.cloudinaryUploadPreset
        ..files.add(await http.MultipartFile.fromPath('file', picked.path));

  final response = await request.send();
  final body = await response.stream.bytesToString();
  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw Exception('No se pudo subir la imagen a Cloudinary.');
  }
  final secureUrlMatch = RegExp(
    r'"secure_url"\s*:\s*"([^"]+)"',
  ).firstMatch(body);
  final url = secureUrlMatch?.group(1)?.replaceAll(r'\/', '/');
  if (url == null || url.isEmpty) {
    throw Exception('Cloudinary no devolvio URL segura.');
  }
  return url;
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

String? _validateCommercialDraft({
  required String category,
  required String type,
  required String material,
  required Set<String> styles,
}) {
  if (category.isEmpty || !_categorias.contains(category)) {
    return 'Selecciona una categoria comercial valida.';
  }
  if (type.trim().isEmpty) {
    return 'Selecciona el tipo de calzado.';
  }
  if (!_typesForCategory(category).contains(type.trim())) {
    return 'El tipo de calzado no corresponde a la categoria seleccionada.';
  }
  if (material.trim().isNotEmpty &&
      !_materialPresets.contains(material.trim())) {
    return 'Selecciona un material permitido en la paleta comercial.';
  }
  for (final style in styles) {
    if (!_styleOptions.contains(style)) {
      return 'El estilo "$style" no es un valor comercial permitido.';
    }
    final allowedTypes = _styleAllowedTypes[style] ?? const <String>[];
    if (!allowedTypes.contains(type.trim())) {
      return 'El estilo "$style" no corresponde al tipo de calzado seleccionado.';
    }
  }
  return null;
}

class _VariantDraft {
  _VariantDraft(String category)
    : imageCtrls = List.generate(
        _imageSlotCount,
        (_) => TextEditingController(),
      ),
      descriptionCtrl = TextEditingController(),
      sizeStock = {for (final size in _sizesForCategory(category)) size: 0};

  String color = '';
  final List<TextEditingController> imageCtrls;
  final TextEditingController descriptionCtrl;
  Map<String, int> sizeStock;
  bool active = true;

  int get totalStock => sizeStock.values.fold(0, (sum, qty) => sum + qty);

  List<String> get images => imageCtrls
      .map((ctrl) => ctrl.text.trim())
      .where((url) => url.isNotEmpty)
      .toList();

  void syncCategory(String category) {
    sizeStock = {
      for (final size in _sizesForCategory(category))
        size: sizeStock[size] ?? 0,
    };
  }

  void clear(String category) {
    color = '';
    for (final ctrl in imageCtrls) {
      ctrl.clear();
    }
    descriptionCtrl.clear();
    sizeStock = {for (final size in _sizesForCategory(category)) size: 0};
    active = true;
  }

  void dispose() {
    for (final ctrl in imageCtrls) {
      ctrl.dispose();
    }
    descriptionCtrl.dispose();
  }
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
      ref.watch(_adminProductsRealtimeProvider);
      ref.watch(_adminProductsVersionProvider);
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

final _adminProductsVersionProvider = StateProvider<int>((ref) => 0);

final _adminProductsRealtimeProvider = Provider<void>((ref) {
  Timer? debounce;

  void refresh(_) {
    debounce?.cancel();
    debounce = Timer(const Duration(milliseconds: 300), () {
      ref
          .read(_adminProductsVersionProvider.notifier)
          .update((value) => value + 1);
    });
  }

  final channel = sb.Supabase.instance.client
      .channel('cv-admin-productos')
      .onPostgresChanges(
        event: sb.PostgresChangeEvent.all,
        schema: 'public',
        table: 'productos',
        callback: refresh,
      )
      .onPostgresChanges(
        event: sb.PostgresChangeEvent.all,
        schema: 'public',
        table: 'productoCodigos',
        callback: refresh,
      )
      .onPostgresChanges(
        event: sb.PostgresChangeEvent.all,
        schema: 'public',
        table: 'productoFinanzas',
        callback: refresh,
      )
      .subscribe();

  ref.onDispose(() {
    debounce?.cancel();
    channel.unsubscribe();
  });
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
  String _featuredFilter = 'todos';

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
    } else if (_stockFilter == 'con') {
      list = list
          .where((p) => ((p['stock'] as num?)?.toInt() ?? 0) > 5)
          .toList();
    } else if (_stockFilter == 'sin') {
      list = list
          .where((p) => ((p['stock'] as num?)?.toInt() ?? 0) == 0)
          .toList();
    }

    if (_featuredFilter == 'destacados') {
      list = list.where((p) => p['destacado'] == true).toList();
    } else if (_featuredFilter == 'normales') {
      list = list.where((p) => p['destacado'] != true).toList();
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
                          'con': 'Con stock',
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
                      padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
                      child: _FilterChips(
                        items: const {
                          'todos': 'Todos',
                          'destacados': 'Destacados',
                          'normales': 'Normales',
                        },
                        selected: _featuredFilter,
                        onSelect: (value) =>
                            setState(() => _featuredFilter = value),
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
  String _material = '';
  final Set<String> _styles = {};
  String _campaign = '';
  int? _discount;
  late bool _active;
  late bool _featured;
  Map<String, int> _sizeStock = {};
  late final List<_VariantDraft> _variantSlots;
  bool _saving = false;
  bool _uploadingImage = false;

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

    _category = product == null
        ? ''
        : _normalizeAdminCategory(product['categoria']?.toString() ?? '');
    final initialTypes = _typesForCategory(_category);
    _type = product == null ? '' : product['tipoCalzado']?.toString() ?? '';
    if (initialTypes.isEmpty) {
      _type = '';
    } else if (!initialTypes.contains(_type)) {
      _type = initialTypes.first;
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
    _material = product?['material']?.toString() ?? '';
    final rawStyles = product?['estilo']?.toString() ?? '';
    _styles
      ..clear()
      ..addAll(
        rawStyles
            .split(',')
            .map((style) => style.trim())
            .where(_styleOptions.contains),
      );
    _campaign = product?['campana']?.toString() ?? '';
    _discount = (product?['descuento'] as num?)?.toInt();
    _active = product?['activo'] != false;
    _featured = product?['destacado'] == true;
    _variantSlots = List.generate(
      _variantSlotCount,
      (_) => _VariantDraft(_category),
    );

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
    for (final slot in _variantSlots) {
      slot.dispose();
    }
    super.dispose();
  }

  bool get _isEditing => widget.product != null;

  List<_VariantDraft> get _activeVariantSlots =>
      _variantSlots.where((slot) => slot.color.trim().isNotEmpty).toList();

  int get _variantTotalStock =>
      _variantSlots.fold(0, (sum, slot) => sum + slot.totalStock);

  int get _totalStock => _isEditing
      ? _sizeStock.values.fold(0, (sum, qty) => sum + qty)
      : _variantTotalStock;

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;

    final normalizedCode = _normalizeVariantCode(_codeCtrl.text);
    final price = _parseDouble(_priceCtrl.text);
    final cost = _parseDouble(_costCtrl.text);
    final color = _capitalizeWords(_colorCtrl.text);
    final image = _imageCtrl.text.trim();
    final minMargin = _parseDouble(_minMarginCtrl.text);
    final targetMargin = _parseDouble(_targetMarginCtrl.text);
    final maxMargin = _parseDouble(_maxMarginCtrl.text);
    final material = _material.trim();
    final styleCsv = _styleOptions
        .where((style) => _styles.contains(style))
        .join(',');
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
    final duplicate =
        _isEditing &&
        existingCodes.entries.any(
          (entry) =>
              entry.key != currentId &&
              _normalizeVariantCode(entry.value) == normalizedCode,
        );
    if (duplicate) {
      _showError('El código "$normalizedCode" ya existe en otro producto.');
      return;
    }

    final duplicateBaseOnCreate =
        !_isEditing &&
        existingCodes.values.any(
          (existingCode) =>
              _normalizeVariantCode(existingCode) == normalizedCode,
        );
    if (duplicateBaseOnCreate) {
      _showError('El codigo base ya existe en otro producto.');
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
    if (_type.trim().isEmpty) {
      _showError('Selecciona el tipo de calzado.');
      return;
    }
    if (!_typesForCategory(_category).contains(_type)) {
      _showError('Selecciona un tipo de calzado acorde a la categoría.');
      return;
    }
    final commercialError = _validateCommercialDraft(
      category: _category,
      type: _type,
      material: material,
      styles: _styles,
    );
    if (commercialError != null) {
      _showError(commercialError);
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
    if (_isEditing) {
      if (color.isEmpty) {
        _showError('Registra el color del producto.');
        return;
      }
      if (_totalStock <= 0) {
        _showError('Registra al menos una talla con stock.');
        return;
      }
      if (image.isEmpty || !_isValidUrl(image)) {
        _showError('Ingresa una URL valida para la imagen principal.');
        return;
      }
    } else {
      final activeSlots = _activeVariantSlots;
      if (activeSlots.isEmpty) {
        _showError('Completa al menos un color del producto.');
        return;
      }
      final colorNames = activeSlots.map((slot) => slot.color.toLowerCase());
      if (colorNames.toSet().length != colorNames.length) {
        _showError('No repitas colores entre variantes.');
        return;
      }
      for (final slot in activeSlots) {
        if (slot.totalStock <= 0) {
          _showError('${slot.color}: registra al menos una talla con stock.');
          return;
        }
        if (slot.images.isEmpty) {
          _showError('${slot.color}: agrega al menos una imagen.');
          return;
        }
        if (slot.images.any((url) => !_isValidUrl(url))) {
          _showError('${slot.color}: revisa las URL de imagen.');
          return;
        }
      }
      final generatedCodes = activeSlots.map(
        (slot) => _normalizeVariantCode(
          '$normalizedCode-${_variantSlots.indexOf(slot) + 1}',
        ),
      );
      final invalidGenerated = generatedCodes.where(
        (code) => !_isValidVariantCode(code),
      );
      if (invalidGenerated.isNotEmpty) {
        _showError('Reduce el codigo base para poder generar las variantes.');
        return;
      }
      final duplicatedGenerated = generatedCodes.where(
        (code) => existingCodes.values.any(
          (existingCode) => _normalizeVariantCode(existingCode) == code,
        ),
      );
      if (duplicatedGenerated.isNotEmpty) {
        _showError(
          'El codigo generado "${duplicatedGenerated.first}" ya existe. Cambia el codigo base.',
        );
        return;
      }
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
      'material': material.isEmpty ? null : material,
      'estilo': styleCsv.isEmpty ? null : styleCsv,
      'color': color,
      'familiaId': familyId,
      'destacado': _featured,
      'activo': _active,
      'descuento': _discount,
      'campana': _campaign.isEmpty ? null : _campaign,
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
        final variants = _activeVariantSlots.map((slot) {
          final slotIndex = _variantSlots.indexOf(slot);
          final slotStock = <String, int>{};
          for (final size in _sizesForCategory(_category)) {
            final qty = slot.sizeStock[size] ?? 0;
            if (qty > 0) slotStock[size] = qty;
          }
          final slotSizes = slotStock.keys.toList()
            ..sort((a, b) => int.parse(a).compareTo(int.parse(b)));
          final images = slot.images;
          return {
            ...productPayload,
            'descripcion': slot.descriptionCtrl.text.trim().isEmpty
                ? _descriptionCtrl.text.trim()
                : slot.descriptionCtrl.text.trim(),
            'imagen': images.first,
            'imagenes': images,
            'stock': slot.totalStock,
            'tallas': slotSizes,
            'tallaStock': slotStock,
            'color': slot.color,
            'activo': slot.active,
            'codigo': _normalizeVariantCode('$normalizedCode-${slotIndex + 1}'),
            'finanzas': financialPayload,
          };
        }).toList();
        await _supabase.rpc(
          'create_product_variants_atomic',
          params: {'variants': variants},
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
      } else if (message.contains('cv_guard_producto_estilo')) {
        _showError('El estilo seleccionado no corresponde al tipo de calzado.');
      } else if (message.contains('cv_guard_producto_material')) {
        _showError(
          'El material seleccionado no pertenece a la paleta comercial permitida.',
        );
      } else if (message.contains('cv_guard_producto_precio')) {
        _showError('El precio quedó fuera del rango comercial permitido.');
      } else if (message.contains('cv_guard_producto_finanzas')) {
        _showError(
          'Los márgenes o el rango de precio no coinciden con la regla comercial del producto.',
        );
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

  Future<void> _uploadInto(TextEditingController controller) async {
    if (_uploadingImage) return;
    setState(() => _uploadingImage = true);
    try {
      final url = await _pickAndUploadCloudinaryImage();
      if (url.isNotEmpty) {
        controller.text = url;
        setState(() {});
      }
    } catch (error) {
      _showError(error.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _uploadingImage = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final sizes = _category.isEmpty ? <String>[] : _sizesForCategory(_category);
    final types = _category.isEmpty ? <String>[] : _typesForCategory(_category);

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
                    _DropdownField(
                      label: 'Material',
                      value: _material,
                      items: const ['', ..._materialPresets],
                      itemLabels: const {'': 'Sin material'},
                      onChanged: (value) {
                        setState(() => _material = value ?? '');
                      },
                    ),
                    if (_isEditing) ...[
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
                      _UploadImageButton(
                        busy: _uploadingImage,
                        onPressed: () => _uploadInto(_imageCtrl),
                      ),
                    ],

                    const _FormSection('Categoría y tipo'),
                    _DropdownField(
                      label: 'Categoría',
                      value: _category,
                      items: const ['', ..._categorias],
                      itemLabels: const {
                        '': 'Selecciona la categoría',
                        'hombre': 'Hombre',
                        'dama': 'Dama',
                        'juvenil': 'Juvenil',
                        'nino': 'Niños',
                        'bebe': 'Bebé',
                      },
                      onChanged: (value) {
                        if (value == null) return;
                        setState(() {
                          _category = value;
                          final nextTypes = _typesForCategory(value);
                          _type = nextTypes.contains(_type) ? _type : '';
                          _sizeStock = {
                            for (final size in _sizesForCategory(value))
                              size: _sizeStock[size] ?? 0,
                          };
                          for (final slot in _variantSlots) {
                            slot.syncCategory(value);
                          }
                        });
                      },
                    ),
                    const SizedBox(height: 12),
                    _DropdownField(
                      label: 'Tipo de calzado',
                      value: _type,
                      items: ['', ...types],
                      itemLabels: const {'': 'Selecciona un tipo'},
                      onChanged: (value) {
                        if (value == null) return;
                        setState(() => _type = value);
                      },
                    ),
                    const SizedBox(height: 12),
                    _StyleSelector(
                      selected: _styles,
                      onToggle: (style) {
                        setState(() {
                          if (_styles.contains(style)) {
                            _styles.remove(style);
                          } else {
                            _styles.add(style);
                          }
                        });
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

                    if (_isEditing) ...[
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
                    ] else ...[
                      const _FormSection('Variantes'),
                      _VariantColorPicker(
                        slots: _variantSlots,
                        onSelectColor: (index, color) {
                          setState(() {
                            if (color.isEmpty) {
                              _variantSlots[index].clear(_category);
                              for (
                                var i = index + 1;
                                i < _variantSlots.length;
                                i++
                              ) {
                                _variantSlots[i].clear(_category);
                              }
                            } else if (_variantSlots.any(
                              (slot) =>
                                  slot != _variantSlots[index] &&
                                  slot.color.toLowerCase() ==
                                      color.toLowerCase(),
                            )) {
                              _showError('Ese color ya esta seleccionado.');
                            } else {
                              _variantSlots[index].color = color;
                            }
                          });
                        },
                      ),
                      if (_category.isEmpty)
                        const Padding(
                          padding: EdgeInsets.only(top: 8),
                          child: Text(
                            'Selecciona la categoría para habilitar las tallas.',
                            style: TextStyle(
                              color: AppColors.textSecondary,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      const SizedBox(height: 10),
                      if (_activeVariantSlots.isEmpty)
                        const _VariantEmptyState()
                      else
                        ..._variantSlots.indexed
                            .where((item) => item.$2.color.isNotEmpty)
                            .map(
                              (item) => _VariantCard(
                                index: item.$1,
                                slot: item.$2,
                                sizes: sizes,
                                uploading: _uploadingImage,
                                onUpload: _uploadInto,
                                onChanged: () => setState(() {}),
                                onClear: () => setState(() {
                                  item.$2.clear(_category);
                                  for (
                                    var i = item.$1 + 1;
                                    i < _variantSlots.length;
                                    i++
                                  ) {
                                    _variantSlots[i].clear(_category);
                                  }
                                }),
                              ),
                            ),
                      Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: Text(
                          'Stock total: $_variantTotalStock',
                          style: const TextStyle(
                            color: AppColors.textSecondary,
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ],

                    const _FormSection('Descripción'),
                    TextFormField(
                      controller: _descriptionCtrl,
                      maxLines: 3,
                      decoration: const InputDecoration(
                        labelText: 'Descripción',
                      ),
                    ),

                    const _FormSection('Opciones'),
                    _DropdownField(
                      label: 'Campaña',
                      value: _campaign,
                      items: const [
                        '',
                        'lanzamiento',
                        'nueva-temporada',
                        'cyber-wow',
                        'club-calzado',
                        'outlet',
                      ],
                      itemLabels: const {
                        '': 'Sin campaña',
                        'lanzamiento': 'Lanzamiento',
                        'nueva-temporada': 'Nueva Temporada',
                        'cyber-wow': 'Cyber Wow',
                        'club-calzado': 'Club Calzado',
                        'outlet': 'Outlet',
                      },
                      onChanged: (value) =>
                          setState(() => _campaign = value ?? ''),
                    ),
                    const SizedBox(height: 12),
                    _DropdownField(
                      label: 'Descuento Cyber Wow',
                      value: _discount?.toString() ?? '',
                      items: const ['', '10', '20', '30'],
                      itemLabels: const {
                        '': 'Sin descuento',
                        '10': '10%',
                        '20': '20%',
                        '30': '30%',
                      },
                      onChanged: (value) => setState(
                        () => _discount = (value == null || value.isEmpty)
                            ? null
                            : int.parse(value),
                      ),
                    ),
                    const SizedBox(height: 12),
                    if (_isEditing)
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
                        onPressed: (_saving || _uploadingImage) ? null : _save,
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
    this.itemLabels = const {},
  });

  final String label;
  final String value;
  final List<String> items;
  final ValueChanged<String?> onChanged;
  final Map<String, String> itemLabels;

  @override
  Widget build(BuildContext context) => DropdownButtonFormField<String>(
    initialValue: items.contains(value) ? value : items.first,
    decoration: InputDecoration(labelText: label),
    items: items
        .map(
          (item) => DropdownMenuItem(
            value: item,
            child: Text(itemLabels[item] ?? item),
          ),
        )
        .toList(),
    onChanged: onChanged,
  );
}

class _StyleSelector extends StatelessWidget {
  const _StyleSelector({required this.selected, required this.onToggle});

  final Set<String> selected;
  final ValueChanged<String> onToggle;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      const Text(
        'Estilo',
        style: TextStyle(color: AppColors.textSecondary, fontSize: 12),
      ),
      const SizedBox(height: 8),
      Wrap(
        spacing: 8,
        runSpacing: 8,
        children: _styleOptions.map((style) {
          final active = selected.contains(style);
          return FilterChip(
            selected: active,
            label: Text(style),
            selectedColor: AppColors.gold.withValues(alpha: 0.16),
            checkmarkColor: AppColors.goldDark,
            side: BorderSide(
              color: active ? AppColors.gold : AppColors.shimmerBase,
            ),
            onSelected: (_) => onToggle(style),
          );
        }).toList(),
      ),
    ],
  );
}

class _VariantColorPicker extends StatelessWidget {
  const _VariantColorPicker({required this.slots, required this.onSelectColor});

  final List<_VariantDraft> slots;
  final void Function(int index, String color) onSelectColor;

  @override
  Widget build(BuildContext context) => SingleChildScrollView(
    scrollDirection: Axis.horizontal,
    child: Row(
      children: List.generate(slots.length, (index) {
        final slot = slots[index];
        final available = index == 0 || slots[index - 1].color.isNotEmpty;
        return Padding(
          padding: const EdgeInsets.only(right: 8),
          child: GestureDetector(
            onTap: available
                ? () => _openColorSheet(context, index, slot.color)
                : null,
            child: AnimatedOpacity(
              duration: const Duration(milliseconds: 160),
              opacity: available ? 1 : 0.38,
              child: Container(
                width: 96,
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: slot.color.isEmpty
                      ? Colors.white
                      : AppColors.gold.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: slot.color.isEmpty
                        ? AppColors.shimmerBase
                        : AppColors.gold,
                  ),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 20,
                      height: 20,
                      decoration: BoxDecoration(
                        color: slot.color.isEmpty
                            ? Colors.transparent
                            : _colorSwatch(slot.color),
                        shape: BoxShape.circle,
                        border: Border.all(color: AppColors.shimmerBase),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Color ${index + 1}',
                      style: const TextStyle(
                        fontSize: 10,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    Text(
                      slot.color.isEmpty ? 'Elegir' : slot.color,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      }),
    ),
  );

  void _openColorSheet(BuildContext context, int index, String current) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 14, 16, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Selecciona un color',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 12),
              Flexible(
                child: GridView.count(
                  crossAxisCount: 2,
                  shrinkWrap: true,
                  mainAxisSpacing: 8,
                  crossAxisSpacing: 8,
                  childAspectRatio: 3.6,
                  children: [
                    _ColorOption(
                      name: 'Sin color',
                      color: Colors.transparent,
                      selected: current.isEmpty,
                      onTap: () {
                        Navigator.pop(ctx);
                        onSelectColor(index, '');
                      },
                    ),
                    ..._colorPalette.map(
                      (item) => _ColorOption(
                        name: item.$1,
                        color: item.$2,
                        selected:
                            current.toLowerCase() == item.$1.toLowerCase(),
                        onTap: () {
                          Navigator.pop(ctx);
                          onSelectColor(index, item.$1);
                        },
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ColorOption extends StatelessWidget {
  const _ColorOption({
    required this.name,
    required this.color,
    required this.selected,
    required this.onTap,
  });

  final String name;
  final Color color;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => InkWell(
    onTap: onTap,
    borderRadius: BorderRadius.circular(12),
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 10),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: selected ? AppColors.gold : AppColors.shimmerBase,
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 18,
            height: 18,
            decoration: BoxDecoration(
              color: color,
              shape: BoxShape.circle,
              border: Border.all(color: AppColors.shimmerBase),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              name,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    ),
  );
}

class _VariantEmptyState extends StatelessWidget {
  const _VariantEmptyState();

  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(14),
      border: Border.all(color: AppColors.shimmerBase),
    ),
    child: const Text(
      'Selecciona un color para ver aqui las imagenes, tallas, stock y visibilidad de cada variante.',
      textAlign: TextAlign.center,
      style: TextStyle(color: AppColors.textSecondary, fontSize: 12),
    ),
  );
}

class _VariantCard extends StatelessWidget {
  const _VariantCard({
    required this.index,
    required this.slot,
    required this.sizes,
    required this.uploading,
    required this.onUpload,
    required this.onChanged,
    required this.onClear,
  });

  final int index;
  final _VariantDraft slot;
  final List<String> sizes;
  final bool uploading;
  final ValueChanged<TextEditingController> onUpload;
  final VoidCallback onChanged;
  final VoidCallback onClear;

  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.only(bottom: 10),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      border: Border.all(color: AppColors.gold.withValues(alpha: 0.28)),
    ),
    child: ExpansionTile(
      initiallyExpanded: index == 0,
      tilePadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
      childrenPadding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
      leading: Container(
        width: 28,
        height: 28,
        decoration: BoxDecoration(
          color: _colorSwatch(slot.color),
          shape: BoxShape.circle,
          border: Border.all(color: AppColors.shimmerBase),
        ),
      ),
      title: Text(
        slot.color,
        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
      ),
      subtitle: Text(
        'Stock: ${slot.totalStock}',
        style: const TextStyle(color: AppColors.textSecondary, fontSize: 11),
      ),
      trailing: IconButton(
        icon: const Icon(Icons.close_rounded, size: 18),
        onPressed: onClear,
      ),
      children: [
        Row(
          children: [
            Expanded(
              child: _SwitchRow(
                label: 'Visible en tienda',
                icon: Icons.visibility_outlined,
                value: slot.active,
                onChanged: (value) {
                  slot.active = value;
                  onChanged();
                },
              ),
            ),
          ],
        ),
        for (var i = 0; i < slot.imageCtrls.length; i++)
          _Field(
            ctrl: slot.imageCtrls[i],
            label: 'URL imagen ${i + 1}',
            icon: Icons.image_outlined,
            onChanged: (_) => onChanged(),
          ),
        Align(
          alignment: Alignment.centerLeft,
          child: _UploadImageButton(
            busy: uploading,
            onPressed: () => onUpload(
              slot.imageCtrls.firstWhere(
                (ctrl) => ctrl.text.trim().isEmpty,
                orElse: () => slot.imageCtrls.last,
              ),
            ),
          ),
        ),
        const SizedBox(height: 2),
        const Align(
          alignment: Alignment.centerLeft,
          child: Text(
            'Tallas y stock',
            style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
          ),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: sizes.map((size) {
            final qty = slot.sizeStock[size] ?? 0;
            return _SizeBox(
              size: size,
              qty: qty,
              onChanged: (value) {
                slot.sizeStock[size] = value;
                onChanged();
              },
            );
          }).toList(),
        ),
        const SizedBox(height: 12),
        TextFormField(
          controller: slot.descriptionCtrl,
          maxLines: 2,
          decoration: const InputDecoration(
            labelText: 'Descripcion del color',
            hintText: 'Si lo dejas vacio usa la descripcion comun',
          ),
        ),
      ],
    ),
  );
}

class _UploadImageButton extends StatelessWidget {
  const _UploadImageButton({required this.busy, required this.onPressed});

  final bool busy;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: OutlinedButton.icon(
      onPressed: busy ? null : onPressed,
      icon: busy
          ? const SizedBox(
              width: 16,
              height: 16,
              child: CircularProgressIndicator(strokeWidth: 2),
            )
          : const Icon(Icons.upload_rounded, size: 18),
      label: Text(busy ? 'Subiendo imagen...' : 'Subir imagen'),
      style: OutlinedButton.styleFrom(
        foregroundColor: AppColors.goldDark,
        side: const BorderSide(color: AppColors.gold),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    ),
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
