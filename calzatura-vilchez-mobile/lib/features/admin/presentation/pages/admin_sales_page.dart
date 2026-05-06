import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart' as sb;
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/back_navigation_scope.dart';

final _supabase = sb.Supabase.instance.client;

// ─── Providers ───────────────────────────────────────────────────────────────

final _selectedDateProvider = StateProvider<DateTime>((ref) => DateTime.now());

final adminDaySalesProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
      final date = ref.watch(_selectedDateProvider);
      final dateStr =
          '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
      final data = await _supabase
          .from('ventasDiarias')
          .select()
          .eq('fecha', dateStr)
          .eq('devuelto', false)
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

  // Form state
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
        // Reducir stock
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

  @override
  Widget build(BuildContext context) {
    final date = ref.watch(_selectedDateProvider);
    final salesAsync = ref.watch(adminDaySalesProvider);
    final productsAsync = ref.watch(adminProductsCatalogProvider);

    final totalDia =
        salesAsync.valueOrNull?.fold(
          0.0,
          (s, v) => s + ((v['total'] as num?)?.toDouble() ?? 0),
        ) ??
        0;
    final articulosDia =
        salesAsync.valueOrNull?.fold(
          0,
          (s, v) => s + ((v['cantidad'] as int?) ?? 0),
        ) ??
        0;

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
                            value: '${salesAsync.valueOrNull?.length ?? 0}',
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
                          // Producto dropdown
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
                  child: const Text(
                    'HISTORIAL DEL DÍA',
                    style: TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 1,
                    ),
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
                              style: TextStyle(color: AppColors.textSecondary),
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
                              onReturn: () => _returnSale(sales[i]),
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

  Future<void> _returnSale(Map<String, dynamic> sale) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Marcar como devuelto'),
        content: const Text(
          '¿Marcar esta venta como devuelta? Se restaurará el stock.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancelar'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text(
              'Confirmar',
              style: TextStyle(color: AppColors.error),
            ),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    await _supabase
        .from('ventasDiarias')
        .update({'devuelto': true})
        .eq('id', sale['id']);
    ref.invalidate(adminDaySalesProvider);
  }
}

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
    required this.onReturn,
  });
  final Map<String, dynamic> sale;
  final int index;
  final VoidCallback onReturn;
  @override
  Widget build(BuildContext context) {
    final nombre = sale['nombre'] as String? ?? '';
    final talla = sale['talla'] as String? ?? '';
    final color = sale['color'] as String? ?? '';
    final cant = sale['cantidad'] as int? ?? 1;
    final total = (sale['total'] as num?)?.toDouble() ?? 0;
    final devuelto = sale['devuelto'] as bool? ?? false;
    return Container(
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
              ],
            ),
          ),
          Text(
            'S/ ${total.toStringAsFixed(2)}',
            style: TextStyle(
              fontWeight: FontWeight.w800,
              fontSize: 13,
              color: devuelto ? AppColors.textSecondary : AppColors.textPrimary,
            ),
          ),
          const SizedBox(width: 8),
          if (!devuelto)
            GestureDetector(
              onTap: onReturn,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.error.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Text(
                  'Dev.',
                  style: TextStyle(
                    color: AppColors.error,
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            )
          else
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.shimmerBase,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Text(
                'Devuelto',
                style: TextStyle(color: AppColors.textSecondary, fontSize: 10),
              ),
            ),
        ],
      ),
    ).animate(delay: Duration(milliseconds: index * 30)).fadeIn(duration: 250.ms);
  }
}
