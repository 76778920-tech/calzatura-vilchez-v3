import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart' as sb;
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/back_navigation_scope.dart';

final _supabase = sb.Supabase.instance.client;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const _docLabels = <String, String>{
  'ninguno': 'Sin comprobante',
  'nota_venta': 'Nota de venta',
  'guia_remision': 'Guía de remisión',
};

String _maskDni(String? dni) {
  if (dni == null || dni.isEmpty) return '–';
  if (dni.length < 5) return '****';
  return '${dni.substring(0, 3)}****${dni.substring(dni.length - 2)}';
}

String _maskName(String? name) {
  if (name == null || name.isEmpty) return '';
  return '${name[0].toUpperCase()}***';
}

String _fmtDt(String? iso) {
  if (iso == null) return '–';
  final dt = DateTime.tryParse(iso)?.toLocal();
  if (dt == null) return '–';
  const months = [
    'ene', 'feb', 'mar', 'abr', 'may', 'jun',
    'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
  ];
  return '${dt.day} ${months[dt.month - 1]} ${dt.year}, '
      '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
}

// ─── Providers ───────────────────────────────────────────────────────────────

final _selectedDateProvider = StateProvider<DateTime>((ref) => DateTime.now());

final adminDaySalesProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
      final date = ref.watch(_selectedDateProvider);
      final dateStr =
          '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
      final data = await _supabase
          .from('ventasDiarias')
          .select(
            'id, productId, codigo, nombre, color, talla, fecha, cantidad, '
            'precioVenta, total, ganancia, documentoTipo, documentoNumero, '
            'encargadoNombre, cliente, devuelto, motivoDevolucion, devueltoEn, creadoEn, canal',
          )
          .eq('fecha', dateStr)
          .order('creadoEn', ascending: false);
      return List<Map<String, dynamic>>.from(data as List);
    });

final adminProductsCatalogProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
      final data = await _supabase
          .from('productos')
          .select(
            'id, codigo, nombre, marca, precio, stock, color, tallaStock, tallas, categoria',
          )
          .eq('activo', true)
          .gt('stock', 0)
          .order('marca');
      return List<Map<String, dynamic>>.from(data as List);
    });

// ─── Cart item model ──────────────────────────────────────────────────────────

class _CartItem {
  final String productId, codigo, nombre, color, talla;
  final double precio;
  int cantidad;

  _CartItem({
    required this.productId,
    required this.codigo,
    required this.nombre,
    required this.color,
    required this.talla,
    required this.precio,
    required this.cantidad,
  });

  double get total => precio * cantidad;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

class AdminSalesPage extends ConsumerStatefulWidget {
  const AdminSalesPage({super.key});
  @override
  ConsumerState<AdminSalesPage> createState() => _AdminSalesPageState();
}

class _AdminSalesPageState extends ConsumerState<AdminSalesPage> {
  final List<_CartItem> _cart = [];

  Map<String, dynamic>? _selectedProduct;
  String? _selectedColor;
  String? _selectedTalla;
  final _cantCtrl = TextEditingController(text: '1');
  final _precioCtrl = TextEditingController();
  bool _saving = false;

  @override
  void dispose() {
    _cantCtrl.dispose();
    _precioCtrl.dispose();
    super.dispose();
  }

  List<String> get _coloresDisponibles {
    if (_selectedProduct == null) return [];
    final color = _selectedProduct!['color'] as String? ?? '';
    return color.isNotEmpty ? [color] : [];
  }

  List<String> get _tallasDisponibles {
    if (_selectedProduct == null) return [];
    final ts = _selectedProduct!['tallaStock'];
    if (ts is Map) {
      return ts.entries
          .where((e) => (e.value as int? ?? 0) > 0)
          .map((e) => e.key.toString())
          .toList();
    }
    final tallas = _selectedProduct!['tallas'];
    if (tallas is List) return tallas.map((e) => e.toString()).toList();
    return [];
  }

  int get _stockTalla {
    if (_selectedProduct == null || _selectedTalla == null) return 0;
    final ts = _selectedProduct!['tallaStock'];
    if (ts is Map) return (ts[_selectedTalla] as int? ?? 0);
    return _selectedProduct!['stock'] as int? ?? 0;
  }

  void _addToCart() {
    if (_selectedProduct == null) return;
    final cant = int.tryParse(_cantCtrl.text) ?? 1;
    final precio =
        double.tryParse(_precioCtrl.text) ??
        (_selectedProduct!['precio'] as num?)?.toDouble() ??
        0;

    if (cant <= 0 || cant > _stockTalla) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Cantidad inválida o excede el stock disponible'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    setState(() {
      _cart.add(
        _CartItem(
          productId: _selectedProduct!['id'],
          codigo: _selectedProduct!['codigo'] ?? '',
          nombre: _selectedProduct!['nombre'] ?? '',
          color: _selectedColor ?? '',
          talla: _selectedTalla ?? '',
          precio: precio,
          cantidad: cant,
        ),
      );
      _selectedProduct = null;
      _selectedColor = null;
      _selectedTalla = null;
      _cantCtrl.text = '1';
      _precioCtrl.clear();
    });
  }

  Future<void> _saveVenta() async {
    if (_cart.isEmpty) return;
    setState(() => _saving = true);
    final date = ref.read(_selectedDateProvider);
    final dateStr =
        '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';

    try {
      for (final item in _cart) {
        await _supabase.from('ventasDiarias').insert({
          'productId': item.productId,
          'codigo': item.codigo,
          'nombre': item.nombre,
          'color': item.color,
          'talla': item.talla,
          'fecha': dateStr,
          'cantidad': item.cantidad,
          'precioVenta': item.precio,
          'total': item.total,
          'devuelto': false,
          'creadoEn': DateTime.now().toIso8601String(),
        });
        final Map<String, dynamic> ts = await _supabase
            .from('productos')
            .select('stock, tallaStock')
            .eq('id', item.productId)
            .single();
        final currentStock = ts['stock'] as int? ?? 0;
        final tallaStock = ts['tallaStock'] as Map<String, dynamic>?;
        final updateData = <String, dynamic>{
          'stock': (currentStock - item.cantidad).clamp(0, 99999),
        };
        if (tallaStock != null && item.talla.isNotEmpty) {
          final curr = (tallaStock[item.talla] as int? ?? 0);
          tallaStock[item.talla] = (curr - item.cantidad).clamp(0, 99999);
          updateData['tallaStock'] = tallaStock;
        }
        await _supabase
            .from('productos')
            .update(updateData)
            .eq('id', item.productId);
      }
      setState(() => _cart.clear());
      ref.invalidate(adminDaySalesProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Venta registrada correctamente'),
            backgroundColor: AppColors.success,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
    setState(() => _saving = false);
  }

  Future<void> _returnSale(Map<String, dynamic> sale, String motivo) async {
    await _supabase.from('ventasDiarias').update({
      'devuelto': true,
      'motivoDevolucion': motivo,
      'devueltoEn': DateTime.now().toIso8601String(),
    }).eq('id', sale['id']);

    // Restore stock
    final productId = sale['productId'] as String? ?? '';
    final cantidad = sale['cantidad'] as int? ?? 0;
    final talla = sale['talla'] as String? ?? '';
    if (productId.isNotEmpty && cantidad > 0) {
      final ts = await _supabase
          .from('productos')
          .select('stock, tallaStock')
          .eq('id', productId)
          .single();
      final currentStock = ts['stock'] as int? ?? 0;
      final tallaStock = ts['tallaStock'] as Map<String, dynamic>?;
      final updateData = <String, dynamic>{
        'stock': currentStock + cantidad,
      };
      if (tallaStock != null && talla.isNotEmpty) {
        final curr = (tallaStock[talla] as int? ?? 0);
        tallaStock[talla] = curr + cantidad;
        updateData['tallaStock'] = tallaStock;
      }
      await _supabase.from('productos').update(updateData).eq('id', productId);
    }

    ref.invalidate(adminDaySalesProvider);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Devolución registrada. Stock restaurado.'),
          backgroundColor: AppColors.success,
        ),
      );
    }
  }

  void _showSaleDetail(BuildContext context, Map<String, dynamic> sale) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _SaleDetailSheet(
        sale: sale,
        onReturn: (motivo) => _returnSale(sale, motivo),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final date = ref.watch(_selectedDateProvider);
    final salesAsync = ref.watch(adminDaySalesProvider);
    final productsAsync = ref.watch(adminProductsCatalogProvider);

    final salesList = salesAsync.valueOrNull ?? [];
    final totalDia = salesList
        .where((v) => v['devuelto'] != true)
        .fold(0.0, (s, v) => s + ((v['total'] as num?)?.toDouble() ?? 0));
    final articulosDia = salesList
        .where((v) => v['devuelto'] != true)
        .fold(0, (s, v) => s + ((v['cantidad'] as int?) ?? 0));

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
          title: const Text(
            'Registro de Ventas',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
          ),
          actions: [
            IconButton(
              icon: const Icon(
                Icons.calendar_today_outlined,
                color: Colors.white70,
                size: 20,
              ),
              onPressed: () async {
                final picked = await showDatePicker(
                  context: context,
                  initialDate: date,
                  firstDate: DateTime(2020),
                  lastDate: DateTime.now(),
                  builder: (ctx, child) => Theme(
                    data: ThemeData.dark().copyWith(
                      colorScheme: const ColorScheme.dark(
                        primary: AppColors.gold,
                      ),
                    ),
                    child: child!,
                  ),
                );
                if (picked != null) {
                  ref.read(_selectedDateProvider.notifier).state = picked;
                }
              },
            ),
          ],
        ),
        body: RefreshIndicator(
          color: AppColors.gold,
          onRefresh: () async => ref.invalidate(adminDaySalesProvider),
          child: CustomScrollView(
            slivers: [
              // Fecha y stats
              SliverToBoxAdapter(
                child: Container(
                  color: AppColors.black,
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}',
                        style: const TextStyle(
                          color: AppColors.gold,
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          _DayStat(
                            label: 'Total vendido',
                            value: 'S/ ${totalDia.toStringAsFixed(2)}',
                            color: AppColors.success,
                          ),
                          const SizedBox(width: 10),
                          _DayStat(
                            label: 'Artículos',
                            value: '$articulosDia',
                            color: AppColors.gold,
                          ),
                          const SizedBox(width: 10),
                          _DayStat(
                            label: 'Transacciones',
                            value:
                                '${salesList.where((v) => v['devuelto'] != true).length}',
                            color: const Color(0xFF6366F1),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),

              // Formulario agregar producto
              SliverToBoxAdapter(
                child: productsAsync.when(
                  loading: () => const Padding(
                    padding: EdgeInsets.all(20),
                    child: Center(
                      child: CircularProgressIndicator(color: AppColors.gold),
                    ),
                  ),
                  error: (e, _) => const SizedBox(),
                  data: (products) => Padding(
                    padding: const EdgeInsets.all(12),
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.04),
                            blurRadius: 8,
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'AGREGAR PRODUCTO',
                            style: TextStyle(
                              color: AppColors.textSecondary,
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 1,
                            ),
                          ),
                          const SizedBox(height: 12),
                          DropdownButtonFormField<Map<String, dynamic>>(
                            // ignore: deprecated_member_use
                            value: _selectedProduct,
                            decoration: const InputDecoration(
                              labelText: 'Seleccionar producto',
                              prefixIcon: Icon(
                                Icons.inventory_2_outlined,
                                size: 18,
                              ),
                            ),
                            isExpanded: true,
                            items: products
                                .map(
                                  (p) => DropdownMenuItem(
                                    value: p,
                                    child: Text(
                                      '${p['marca'] ?? ''} - ${p['nombre'] ?? ''}',
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(fontSize: 13),
                                    ),
                                  ),
                                )
                                .toList(),
                            onChanged: (v) => setState(() {
                              _selectedProduct = v;
                              _selectedColor = _coloresDisponibles.isNotEmpty
                                  ? _coloresDisponibles.first
                                  : null;
                              _selectedTalla = null;
                              _precioCtrl.text =
                                  '${(v?['precio'] as num?)?.toDouble() ?? ''}';
                            }),
                          ),
                          if (_selectedProduct != null) ...[
                            const SizedBox(height: 10),
                            Row(
                              children: [
                                if (_coloresDisponibles.isNotEmpty)
                                  Expanded(
                                    child: DropdownButtonFormField<String>(
                                      // ignore: deprecated_member_use
                                      value: _selectedColor,
                                      decoration: const InputDecoration(
                                        labelText: 'Color',
                                      ),
                                      items: _coloresDisponibles
                                          .map(
                                            (c) => DropdownMenuItem(
                                              value: c,
                                              child: Text(c),
                                            ),
                                          )
                                          .toList(),
                                      onChanged: (v) =>
                                          setState(() => _selectedColor = v),
                                    ),
                                  ),
                                if (_coloresDisponibles.isNotEmpty)
                                  const SizedBox(width: 10),
                                Expanded(
                                  child: DropdownButtonFormField<String>(
                                    // ignore: deprecated_member_use
                                    value: _selectedTalla,
                                    decoration: const InputDecoration(
                                      labelText: 'Talla',
                                    ),
                                    items: _tallasDisponibles
                                        .map(
                                          (t) => DropdownMenuItem(
                                            value: t,
                                            child: Text(t),
                                          ),
                                        )
                                        .toList(),
                                    onChanged: (v) =>
                                        setState(() => _selectedTalla = v),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            Row(
                              children: [
                                Expanded(
                                  child: TextFormField(
                                    controller: _precioCtrl,
                                    keyboardType: TextInputType.number,
                                    decoration: const InputDecoration(
                                      labelText: 'Precio (S/)',
                                      prefixIcon: Icon(
                                        Icons.attach_money,
                                        size: 18,
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: TextFormField(
                                    controller: _cantCtrl,
                                    keyboardType: TextInputType.number,
                                    decoration: InputDecoration(
                                      labelText: 'Cantidad',
                                      helperText: 'Disponible: $_stockTalla',
                                      prefixIcon: const Icon(
                                        Icons.format_list_numbered,
                                        size: 18,
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                          const SizedBox(height: 12),
                          SizedBox(
                            width: double.infinity,
                            height: 44,
                            child: ElevatedButton.icon(
                              onPressed: _selectedProduct != null
                                  ? _addToCart
                                  : null,
                              icon: const Icon(
                                Icons.add_shopping_cart_rounded,
                                size: 18,
                              ),
                              label: const Text('Agregar al carrito'),
                              style: ElevatedButton.styleFrom(
                                minimumSize: Size.zero,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),

              // Carrito
              if (_cart.isNotEmpty) ...[
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
                    child: Row(
                      children: [
                        const Text(
                          'CARRITO',
                          style: TextStyle(
                            color: AppColors.textSecondary,
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 1,
                          ),
                        ),
                        const Spacer(),
                        Text(
                          'Total: S/ ${_cart.fold(0.0, (s, i) => s + i.total).toStringAsFixed(2)}',
                          style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            color: AppColors.textPrimary,
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                SliverPadding(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  sliver: SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (ctx, i) => _CartTile(
                        item: _cart[i],
                        onRemove: () => setState(() => _cart.removeAt(i)),
                      ),
                      childCount: _cart.length,
                    ),
                  ),
                ),
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
                    child: Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () => setState(() => _cart.clear()),
                            style: OutlinedButton.styleFrom(
                              side: const BorderSide(color: AppColors.error),
                              foregroundColor: AppColors.error,
                              minimumSize: const Size(0, 44),
                            ),
                            child: const Text('Limpiar'),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          flex: 2,
                          child: SizedBox(
                            height: 44,
                            child: ElevatedButton.icon(
                              onPressed: _saving ? null : _saveVenta,
                              icon: _saving
                                  ? const SizedBox(
                                      width: 16,
                                      height: 16,
                                      child: CircularProgressIndicator(
                                        color: AppColors.black,
                                        strokeWidth: 2,
                                      ),
                                    )
                                  : const Icon(Icons.save_rounded, size: 18),
                              label: const Text('Guardar venta'),
                              style: ElevatedButton.styleFrom(
                                minimumSize: Size.zero,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],

              // Historial del día
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 20, 16, 8),
                  child: Row(
                    children: [
                      const Text(
                        'HISTORIAL DEL DÍA',
                        style: TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 1,
                        ),
                      ),
                      const Spacer(),
                      const Text(
                        'Toca una venta para ver detalles',
                        style: TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 10,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              salesAsync.when(
                loading: () => const SliverToBoxAdapter(
                  child: Padding(
                    padding: EdgeInsets.all(20),
                    child: Center(
                      child: CircularProgressIndicator(color: AppColors.gold),
                    ),
                  ),
                ),
                error: (e, _) => const SliverToBoxAdapter(child: SizedBox()),
                data: (sales) => sales.isEmpty
                    ? const SliverToBoxAdapter(
                        child: Padding(
                          padding: EdgeInsets.all(30),
                          child: Center(
                            child: Text(
                              'Sin ventas este día',
                              style:
                                  TextStyle(color: AppColors.textSecondary),
                            ),
                          ),
                        ),
                      )
                    : SliverPadding(
                        padding: const EdgeInsets.fromLTRB(12, 0, 12, 80),
                        sliver: SliverList(
                          delegate: SliverChildBuilderDelegate(
                            (ctx, i) => _SaleTile(
                              sale: sales[i],
                              index: i,
                              onTap: () => _showSaleDetail(ctx, sales[i]),
                            ),
                            childCount: sales.length,
                          ),
                        ),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ─── Widgets ──────────────────────────────────────────────────────────────────

class _DayStat extends StatelessWidget {
  const _DayStat({
    required this.label,
    required this.value,
    required this.color,
  });
  final String label, value;
  final Color color;
  @override
  Widget build(BuildContext context) => Expanded(
    child: Container(
      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 10),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        children: [
          Text(
            value,
            style: TextStyle(
              color: color,
              fontWeight: FontWeight.w800,
              fontSize: 13,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: const TextStyle(color: Colors.white54, fontSize: 9),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    ),
  );
}

class _CartTile extends StatelessWidget {
  const _CartTile({required this.item, required this.onRemove});
  final _CartItem item;
  final VoidCallback onRemove;
  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.only(bottom: 6),
    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
    decoration: BoxDecoration(
      color: AppColors.gold.withValues(alpha: 0.06),
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: AppColors.gold.withValues(alpha: 0.2)),
    ),
    child: Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                item.nombre,
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 13,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              Text(
                '${item.color.isNotEmpty ? item.color : ''}${item.color.isNotEmpty && item.talla.isNotEmpty ? ' · T:' : ''}${item.talla}  ×${item.cantidad}',
                style: const TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 11,
                ),
              ),
            ],
          ),
        ),
        Text(
          'S/ ${item.total.toStringAsFixed(2)}',
          style: const TextStyle(
            fontWeight: FontWeight.w800,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(width: 8),
        GestureDetector(
          onTap: onRemove,
          child: const Icon(Icons.close, size: 18, color: AppColors.error),
        ),
      ],
    ),
  );
}

class _SaleTile extends StatelessWidget {
  const _SaleTile({
    required this.sale,
    required this.index,
    required this.onTap,
  });
  final Map<String, dynamic> sale;
  final int index;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) {
    final nombre = sale['nombre'] as String? ?? '';
    final talla = sale['talla'] as String? ?? '';
    final color = sale['color'] as String? ?? '';
    final cant = sale['cantidad'] as int? ?? 1;
    final total = (sale['total'] as num?)?.toDouble() ?? 0;
    final devuelto = sale['devuelto'] as bool? ?? false;
    final ganancia = (sale['ganancia'] as num?)?.toDouble();

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        margin: const EdgeInsets.only(bottom: 6),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: devuelto ? AppColors.shimmerBase : Colors.white,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    nombre,
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 13,
                      color: devuelto
                          ? AppColors.textSecondary
                          : AppColors.textPrimary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(
                    '${color.isNotEmpty ? color : ''}${color.isNotEmpty && talla.isNotEmpty ? ' · T:' : ''}$talla  ×$cant',
                    style: const TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 11,
                    ),
                  ),
                  if (ganancia != null && !devuelto)
                    Text(
                      'Ganancia: S/ ${ganancia.toStringAsFixed(2)}',
                      style: const TextStyle(
                        color: AppColors.success,
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  'S/ ${total.toStringAsFixed(2)}',
                  style: TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 13,
                    color: devuelto
                        ? AppColors.textSecondary
                        : AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                if (devuelto)
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppColors.shimmerBase,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Text(
                      'Devuelto',
                      style: TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 9,
                      ),
                    ),
                  )
                else
                  const Icon(
                    Icons.chevron_right,
                    size: 16,
                    color: AppColors.textSecondary,
                  ),
              ],
            ),
          ],
        ),
      ),
    ).animate(delay: Duration(milliseconds: index * 30)).fadeIn(duration: 250.ms);
  }
}

// ─── Sale Detail Bottom Sheet ─────────────────────────────────────────────────

class _SaleDetailSheet extends StatefulWidget {
  const _SaleDetailSheet({required this.sale, required this.onReturn});
  final Map<String, dynamic> sale;
  final Future<void> Function(String motivo) onReturn;

  @override
  State<_SaleDetailSheet> createState() => _SaleDetailSheetState();
}

class _SaleDetailSheetState extends State<_SaleDetailSheet> {
  final _motivoCtrl = TextEditingController();
  bool _returning = false;

  @override
  void dispose() {
    _motivoCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final sale = widget.sale;
    final devuelto = sale['devuelto'] as bool? ?? false;
    final ganancia = (sale['ganancia'] as num?)?.toDouble();
    final docTipo = sale['documentoTipo'] as String? ?? 'ninguno';
    final encargado = sale['encargadoNombre'] as String?;
    final clienteRaw = sale['cliente'];
    final cliente = clienteRaw is Map
        ? Map<String, dynamic>.from(clienteRaw)
        : null;
    final creadoEn = sale['creadoEn'] as String?;
    final motivoDev = sale['motivoDevolucion'] as String?;
    final devueltoEn = sale['devueltoEn'] as String?;
    final canal = sale['canal'] as String?;

    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.75,
      maxChildSize: 0.95,
      minChildSize: 0.4,
      builder: (ctx, scrollCtrl) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: ListView(
          controller: scrollCtrl,
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 32),
          children: [
            // Handle
            Center(
              child: Container(
                margin: const EdgeInsets.only(top: 12, bottom: 16),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),

            // Header
            Row(
              children: [
                const Text(
                  'Detalle de venta',
                  style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
                ),
                const Spacer(),
                if (devuelto)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.textSecondary.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Text(
                      'Devuelto',
                      style: TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 16),

            // Product info card
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.beige,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.gold.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      sale['codigo'] as String? ?? '',
                      style: const TextStyle(
                        color: AppColors.gold,
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          sale['nombre'] as String? ?? '',
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                        if ((sale['color'] as String?)?.isNotEmpty == true ||
                            (sale['talla'] as String?)?.isNotEmpty == true)
                          Text(
                            [
                              if ((sale['color'] as String?)?.isNotEmpty ==
                                  true)
                                'Color: ${sale['color']}',
                              if ((sale['talla'] as String?)?.isNotEmpty ==
                                  true)
                                'Talla: ${sale['talla']}',
                            ].join(' · '),
                            style: const TextStyle(
                              color: AppColors.textSecondary,
                              fontSize: 12,
                            ),
                          ),
                        if (canal != null)
                          Text(
                            canal == 'web' ? 'Canal: Tienda online' : 'Canal: Tienda física',
                            style: const TextStyle(
                              color: AppColors.textSecondary,
                              fontSize: 11,
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),

            // Info grid: fecha, comprobante
            Row(
              children: [
                Expanded(
                  child: _InfoCell(
                    label: 'Fecha y hora',
                    value: _fmtDt(creadoEn),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _InfoCell(
                    label: 'Comprobante',
                    value: _docLabels[docTipo] ?? 'Sin comprobante',
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            _InfoCell(
              label: 'Encargado',
              value: (encargado?.isNotEmpty == true)
                  ? encargado!
                  : 'Sin encargado',
            ),
            const SizedBox(height: 16),

            // Amounts
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.beige,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                children: [
                  _AmountRow(
                    label: 'Cantidad',
                    value: '${sale['cantidad'] ?? 1} ud.',
                  ),
                  const SizedBox(height: 6),
                  _AmountRow(
                    label: 'Precio unitario',
                    value:
                        'S/ ${((sale['precioVenta'] as num?)?.toDouble() ?? 0).toStringAsFixed(2)}',
                  ),
                  const Divider(height: 16),
                  _AmountRow(
                    label: 'Total vendido',
                    value:
                        'S/ ${((sale['total'] as num?)?.toDouble() ?? 0).toStringAsFixed(2)}',
                    bold: true,
                  ),
                  if (ganancia != null) ...[
                    const SizedBox(height: 6),
                    _AmountRow(
                      label: 'Ganancia',
                      value: 'S/ ${ganancia.toStringAsFixed(2)}',
                      color: AppColors.success,
                    ),
                  ],
                ],
              ),
            ),

            // Cliente (with privacy masking)
            if (cliente != null) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey[200]!),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'CLIENTE',
                      style: TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      '${_maskName(cliente['nombres'] as String?)} ${_maskName(cliente['apellidos'] as String?)}',
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                    Text(
                      'DNI: ${_maskDni(cliente['dni'] as String?)}',
                      style: const TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
            ],

            // Devolucion info (when already returned)
            if (devuelto) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.error.withValues(alpha: 0.06),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: AppColors.error.withValues(alpha: 0.2),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Devolución registrada',
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        color: AppColors.error,
                      ),
                    ),
                    if (devueltoEn != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        _fmtDt(devueltoEn),
                        style: const TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 12,
                        ),
                      ),
                    ],
                    if (motivoDev?.isNotEmpty == true) ...[
                      const SizedBox(height: 4),
                      Text(
                        'Motivo: $motivoDev',
                        style: const TextStyle(fontSize: 13),
                      ),
                    ],
                  ],
                ),
              ),
            ],

            // Return form (when not yet returned)
            if (!devuelto) ...[
              const SizedBox(height: 24),
              const Text(
                'Devolución o corrección',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 4),
              const Text(
                'Indica el motivo. El stock será restaurado automáticamente.',
                style: TextStyle(color: AppColors.textSecondary, fontSize: 12),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: _motivoCtrl,
                maxLines: 3,
                decoration: InputDecoration(
                  hintText:
                      'Ej: Talla equivocada, venta duplicada, cliente desistió...',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(color: AppColors.gold),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                height: 46,
                child: ElevatedButton(
                  onPressed: _returning
                      ? null
                      : () async {
                          final motivo = _motivoCtrl.text.trim();
                          if (motivo.isEmpty) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Escribe un motivo de devolución'),
                                backgroundColor: AppColors.error,
                              ),
                            );
                            return;
                          }
                          // Capture before any async gap
                          final navigator = Navigator.of(context);
                          final messenger = ScaffoldMessenger.of(context);
                          final confirmed = await showDialog<bool>(
                            context: context,
                            builder: (dlgCtx) => AlertDialog(
                              title: const Text('Confirmar devolución'),
                              content: Text(
                                'Motivo: "$motivo"\n\nEl stock del producto será restaurado.',
                              ),
                              actions: [
                                TextButton(
                                  onPressed: () =>
                                      Navigator.pop(dlgCtx, false),
                                  child: const Text('Cancelar'),
                                ),
                                TextButton(
                                  onPressed: () => Navigator.pop(dlgCtx, true),
                                  child: const Text(
                                    'Confirmar',
                                    style: TextStyle(color: AppColors.error),
                                  ),
                                ),
                              ],
                            ),
                          );
                          if (confirmed != true || !mounted) return;
                          setState(() => _returning = true);
                          try {
                            await widget.onReturn(motivo);
                            if (mounted) navigator.pop();
                          } catch (e) {
                            if (mounted) {
                              setState(() => _returning = false);
                              messenger.showSnackBar(
                                SnackBar(
                                  content: Text('Error: $e'),
                                  backgroundColor: AppColors.error,
                                ),
                              );
                            }
                          }
                        },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.error,
                    foregroundColor: Colors.white,
                    minimumSize: Size.zero,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  child: _returning
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            color: Colors.white,
                            strokeWidth: 2,
                          ),
                        )
                      : const Text(
                          'Confirmar devolución',
                          style: TextStyle(fontWeight: FontWeight.w700),
                        ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

// ─── Helper widgets ───────────────────────────────────────────────────────────

class _InfoCell extends StatelessWidget {
  const _InfoCell({required this.label, required this.value});
  final String label, value;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(10),
    decoration: BoxDecoration(
      color: AppColors.beige,
      borderRadius: BorderRadius.circular(10),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            color: AppColors.textSecondary,
            fontSize: 10,
            fontWeight: FontWeight.w600,
            letterSpacing: 0.3,
          ),
        ),
        const SizedBox(height: 3),
        Text(
          value,
          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
        ),
      ],
    ),
  );
}

class _AmountRow extends StatelessWidget {
  const _AmountRow({
    required this.label,
    required this.value,
    this.bold = false,
    this.color,
  });
  final String label, value;
  final bool bold;
  final Color? color;

  @override
  Widget build(BuildContext context) => Row(
    children: [
      Text(
        label,
        style: TextStyle(
          color: AppColors.textSecondary,
          fontSize: 13,
          fontWeight: bold ? FontWeight.w700 : FontWeight.w400,
        ),
      ),
      const Spacer(),
      Text(
        value,
        style: TextStyle(
          fontWeight: bold ? FontWeight.w800 : FontWeight.w600,
          fontSize: 13,
          color: color ?? AppColors.textPrimary,
        ),
      ),
    ],
  );
}
