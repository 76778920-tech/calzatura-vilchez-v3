import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/config/env.dart';
import '../../../../core/services/panel_bff_api.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/utils/dni.dart';
import '../../../../shared/widgets/back_navigation_scope.dart';
import '../../../auth/data/dni_lookup_service.dart';
import '../../data/panel_scope_provider.dart';
import '../../data/sales_catalog_provider.dart';
import '../../data/sales_product_utils.dart';
import '../../domain/sales_register_logic.dart';
import '../widgets/sale_detail_sheet.dart';
import 'panel_sales_config.dart';

/// Ventas del panel (admin o staff) — paridad web `AdminSalesLoadedView`.
class PanelSalesPage extends ConsumerStatefulWidget {
  const PanelSalesPage({super.key, required this.config});

  final PanelSalesUiConfig config;

  @override
  ConsumerState<PanelSalesPage> createState() => _PanelSalesPageState();
}

class _PanelSalesPageState extends ConsumerState<PanelSalesPage> {
  PanelSalesUiConfig get _cfg => widget.config;
  final _brandCtrl = TextEditingController();
  final _codeCtrl = TextEditingController();
  final _cantCtrl = TextEditingController(text: '1');
  final _precioCtrl = TextEditingController();
  final _dniCtrl = TextEditingController();
  final _nombresCtrl = TextEditingController();
  final _apellidosCtrl = TextEditingController();
  final _historialCtrl = TextEditingController();

  bool _brandFocused = false;
  bool _codeFocused = false;
  String? _productId;
  String _selectedColor = '';
  String _selectedTalla = '';
  String _documentType = 'ninguno';
  String _validatedDni = '';
  bool _saving = false;
  bool _lookingUpDni = false;
  final List<PendingSaleLine> _pending = [];

  @override
  void dispose() {
    _brandCtrl.dispose();
    _codeCtrl.dispose();
    _cantCtrl.dispose();
    _precioCtrl.dispose();
    _dniCtrl.dispose();
    _nombresCtrl.dispose();
    _apellidosCtrl.dispose();
    _historialCtrl.dispose();
    super.dispose();
  }

  Map<String, dynamic>? get _selectedProduct {
    final products =
        ref.read(panelSalesCatalogProvider(_cfg.scope)).valueOrNull ?? [];
    if (_productId == null) return null;
    for (final p in products) {
      if (p['id']?.toString() == _productId) return p;
    }
    return null;
  }

  List<String> get _brandSuggestions {
    final products =
        ref.read(panelSalesCatalogProvider(_cfg.scope)).valueOrNull ?? [];
    final term = _brandCtrl.text.trim().toLowerCase();
    final unique = <String, String>{};
    for (final p in products) {
      final brand = (p['marca'] as String?)?.trim();
      if (brand == null || brand.isEmpty) continue;
      if (term.isNotEmpty && !brand.toLowerCase().contains(term)) continue;
      unique[brand.toLowerCase()] = brand;
    }
    return unique.values.toList()..sort();
  }

  List<Map<String, dynamic>> get _codeSuggestions {
    final products =
        ref.read(panelSalesCatalogProvider(_cfg.scope)).valueOrNull ?? [];
    final brandTerm = _brandCtrl.text.trim().toLowerCase();
    final codeTerm = _codeCtrl.text.trim().toLowerCase();
    return products
        .where((p) {
          if (brandTerm.isNotEmpty &&
              !(p['marca'] as String? ?? '').toLowerCase().contains(brandTerm)) {
            return false;
          }
          if (codeTerm.isEmpty) return true;
          final haystack = [
            p['codigo'],
            p['nombre'],
            p['marca'],
            p['color'],
          ].whereType<String>().join(' ').toLowerCase();
          return haystack.contains(codeTerm);
        })
        .take(10)
        .toList();
  }

  void _resetProductSelection() {
    setState(() {
      _productId = null;
      _selectedColor = '';
      _selectedTalla = '';
      _cantCtrl.text = '1';
      _precioCtrl.clear();
    });
  }

  void _selectBrand(String brand) {
    setState(() {
      _brandCtrl.text = brand;
      _codeCtrl.clear();
      _resetProductSelection();
      _brandFocused = false;
      _codeFocused = true;
    });
  }

  void _selectProduct(Map<String, dynamic> product) {
    final label =
        '${product['codigo'] ?? 'SIN-CODIGO'} - ${product['nombre'] ?? ''}';
    final colors = getProductColors(product);
    final fin = finanzasFromProduct(product);
    setState(() {
      _productId = product['id']?.toString();
      _brandCtrl.text = product['marca'] as String? ?? '';
      _codeCtrl.text = label;
      _selectedColor = colors.isNotEmpty ? colors.first : '';
      _selectedTalla = '';
      _cantCtrl.text = '1';
      _precioCtrl.text = fin != null
          ? fin.precioSugerido.toStringAsFixed(2)
          : '${(product['precio'] as num?)?.toDouble() ?? ''}';
      _codeFocused = false;
    });
  }

  int _availableForSize(String size) {
    final product = _selectedProduct;
    if (product == null) return 0;
    final stock = getSizeStock(product, size);
    final reserved = _pending
        .where(
          (l) =>
              l.productId == _productId &&
              l.color == _selectedColor &&
              l.talla == size,
        )
        .fold<int>(0, (s, l) => s + l.quantity);
    return (stock - reserved).clamp(0, stock);
  }

  int get _availableForSelected =>
      _selectedTalla.isEmpty ? 0 : _availableForSize(_selectedTalla);

  void _snack(String msg, {bool error = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: error ? AppColors.error : AppColors.success,
      ),
    );
  }

  void _addLine() {
    final product = _selectedProduct;
    final fin = product != null ? finanzasFromProduct(product) : null;
    final colors = product != null ? getProductColors(product) : <String>[];
    final sizes = product != null ? getAvailableSizes(product) : <String>[];
    final qty = int.tryParse(_cantCtrl.text) ?? 1;
    final price = double.tryParse(_precioCtrl.text) ?? 0;

    final err = messageForInvalidAddSaleLine(
      selectedProduct: product,
      finanzas: fin,
      availableColors: colors,
      selectedColor: _selectedColor,
      availableSizes: sizes,
      selectedTalla: _selectedTalla,
      quantity: qty,
      availableForSelected: _availableForSelected,
      salePrice: price,
      finanzasMissingMessage: _cfg.finanzasMissing,
    );
    if (err != null) {
      _snack(err, error: true);
      return;
    }

    setState(() {
      _pending.add(
        PendingSaleLine(
          id: newPendingLineId(),
          productId: _productId!,
          color: _selectedColor,
          talla: _selectedTalla,
          quantity: qty,
          salePrice: price,
        ),
      );
      _cantCtrl.text = '1';
    });
    _snack('Línea agregada al detalle');
  }

  Future<void> _validateDni() async {
    final dni = normalizeDni(_dniCtrl.text);
    if (!isValidDni(dni)) {
      _snack('Ingresa un DNI válido de 8 dígitos', error: true);
      return;
    }
    setState(() => _lookingUpDni = true);
    try {
      final person = await DniLookupService().lookup(dni, Env.dniLookupUrl);
      setState(() {
        _dniCtrl.text = person.dni;
        _nombresCtrl.text = person.nombres;
        _apellidosCtrl.text = person.apellidos;
        _validatedDni = person.dni;
      });
      _snack('Cliente validado por DNI');
    } on DniLookupError catch (e) {
      setState(() {
        _nombresCtrl.clear();
        _apellidosCtrl.clear();
        _validatedDni = '';
      });
      _snack(e.userMessage, error: true);
    } catch (e) {
      _snack('No se pudo consultar el DNI', error: true);
    }
    setState(() => _lookingUpDni = false);
  }

  Future<void> _registerSale() async {
    if (_pending.isEmpty) {
      _snack('Agrega al menos una línea de venta', error: true);
      return;
    }

    final requiresCustomer = _documentType != 'ninguno';
    final customer = SaleCustomer(
      dni: normalizeDni(_dniCtrl.text),
      nombres: _nombresCtrl.text.trim(),
      apellidos: _apellidosCtrl.text.trim(),
    );

    if (!isSaleCustomerReadyForDocument(
      requiresCustomer,
      customer,
      _validatedDni,
    )) {
      _snack(
        'Valida el DNI del cliente con el botón «Validar DNI» antes de registrar',
        error: true,
      );
      return;
    }

    final profile = await ref.read(userProfileBffProvider.future);
    final uid = profile?['uid']?.toString() ?? '';
    final nombre = _operatorName(profile);
    final email = profile?['email']?.toString() ?? '';
    if (uid.isEmpty || nombre.isEmpty) {
      _snack('No se pudo identificar al encargado de la venta', error: true);
      return;
    }

    final date = ref.read(salesSelectedDateProvider);
    final dateStr =
        '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';

    String? docNumber;
    if (_documentType == 'nota_venta' || _documentType == 'guia_remision') {
      docNumber = makeDocumentNumber(_documentType, dateStr);
    }

    setState(() => _saving = true);
    try {
      final products =
        ref.read(panelSalesCatalogProvider(_cfg.scope)).valueOrNull ?? [];
      final payload = _cfg.scope == PanelScope.admin
          ? buildAdminRegisterPayload(
              lines: _pending,
              products: products,
              dateIso: dateStr,
              documentType: _documentType,
              docNumber: docNumber,
              saleCustomer: requiresCustomer ? customer : null,
              encargadoUid: uid,
              encargadoNombre: nombre,
              encargadoEmail: email,
            )
          : buildStaffRegisterPayload(
              lines: _pending,
              products: products,
              dateIso: dateStr,
              documentType: _documentType,
              docNumber: docNumber,
              saleCustomer: requiresCustomer ? customer : null,
              encargadoUid: uid,
              encargadoNombre: nombre,
              encargadoEmail: email,
            );

      await PanelBffApi().registerDailySales(
        scope: _cfg.scope,
        sales: payload,
      );

      setState(() {
        _pending.clear();
        _documentType = 'ninguno';
        _dniCtrl.clear();
        _nombresCtrl.clear();
        _apellidosCtrl.clear();
        _validatedDni = '';
      });
      ref.invalidate(panelDaySalesProvider);
      ref.invalidate(panelSalesCatalogProvider(_cfg.scope));
      _snack('Ventas registradas');
    } catch (e) {
      _snack(e.toString(), error: true);
    }
    setState(() => _saving = false);
  }

  String _operatorName(Map<String, dynamic>? profile) {
    if (profile == null) return '';
    final nombres = (profile['nombres'] as String?)?.trim() ?? '';
    final apellidos = (profile['apellidos'] as String?)?.trim() ?? '';
    if (nombres.isNotEmpty) {
      return [nombres, apellidos].where((p) => p.isNotEmpty).join(' ');
    }
    return (profile['nombre'] as String?)?.trim() ?? '';
  }

  Future<void> _returnSale(Map<String, dynamic> sale, String motivo) async {
    final saleId = sale['id'] as String? ?? '';
    if (saleId.isEmpty) throw Exception('Venta sin identificador');
    await PanelBffApi().returnDailySale(
      saleId: saleId,
      motivo: motivo,
      scope: _cfg.scope,
    );
    ref.invalidate(panelDaySalesProvider);
    ref.invalidate(panelSalesCatalogProvider(_cfg.scope));
    _snack('Devolución registrada. Stock restaurado.');
  }

  void _showSaleDetail(Map<String, dynamic> sale) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => SaleDetailSheet(
        sale: sale,
        showFinancialDetails: _cfg.showFinancialDetails,
        onReturn: (motivo) => _returnSale(sale, motivo),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final date = ref.watch(salesSelectedDateProvider);
    final catalogAsync = ref.watch(panelSalesCatalogProvider(_cfg.scope));
    final salesAsync = ref.watch(panelDaySalesProvider);

    final products = catalogAsync.valueOrNull ?? [];
    final sales = salesAsync.valueOrNull ?? [];
    final filtered = filterDailySalesBySearch(sales, _historialCtrl.text);

    final dateStr =
        '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
    final totals = computeSalesTotals(
      sales: sales,
      pendingLines: _pending,
      products: products,
      dateIso: dateStr,
    );

    final pendingTotal = totals.pendingTotal;
    final theme = PanelSalesTheme.of(_cfg);
    final requiresCustomer = _documentType != 'ninguno';
    final customerReady = isSaleCustomerReadyForDocument(
      requiresCustomer,
      SaleCustomer(
        dni: normalizeDni(_dniCtrl.text),
        nombres: _nombresCtrl.text,
        apellidos: _apellidosCtrl.text,
      ),
      _validatedDni,
    );

    final selected = _selectedProduct;
    final colors = selected != null ? getProductColors(selected) : <String>[];
    final sizes = selected != null ? getAvailableSizes(selected) : <String>[];
    final fin = selected != null ? finanzasFromProduct(selected) : null;

    final monthShort = [
      'ene', 'feb', 'mar', 'abr', 'may', 'jun',
      'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
    ][date.month - 1];

    return BackNavigationScope(
      fallbackRoute: '/admin',
      child: Scaffold(
        backgroundColor: theme.scaffold,
        appBar: AppBar(
          backgroundColor: AppColors.black,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios_new, size: 18),
            onPressed: () =>
                handleBackNavigation(context, fallbackRoute: '/admin'),
          ),
          title: Text(
            _cfg.title,
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
          ),
          actions: [
            TextButton.icon(
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
                  ref.read(salesSelectedDateProvider.notifier).state = picked;
                }
              },
              icon: const Icon(Icons.calendar_today_outlined, size: 16),
              label: Text(
                '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}',
                style: const TextStyle(fontSize: 12, color: AppColors.gold),
              ),
            ),
          ],
        ),
        body: catalogAsync.when(
          loading: () => const Center(
            child: CircularProgressIndicator(color: AppColors.gold),
          ),
          error: (e, _) => Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Text(
                'Error al cargar catálogo: $e',
                style: TextStyle(color: theme.secondaryText),
                textAlign: TextAlign.center,
              ),
            ),
          ),
          data: (_) => RefreshIndicator(
            color: AppColors.gold,
            onRefresh: () async {
              ref.invalidate(panelDaySalesProvider);
              ref.invalidate(panelSalesCatalogProvider(_cfg.scope));
            },
            child: CustomScrollView(
              slivers: [
                SliverToBoxAdapter(
                  child: Container(
                    color: AppColors.black,
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _cfg.kicker.toUpperCase(),
                          style: const TextStyle(
                            color: AppColors.gold,
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 1,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _cfg.subtitle,
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.65),
                            fontSize: 12,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          _cfg.dateLabel,
                          style: const TextStyle(
                            color: Colors.white54,
                            fontSize: 10,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    child: Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        if (_cfg.showFinancialDetails) ...[
                          _StatChip(
                            theme: theme,
                            icon: Icons.payments_outlined,
                            label: 'Vendido — ${date.day} $monthShort',
                            value: 'S/ ${totals.total.toStringAsFixed(2)}',
                            valueColor: AppColors.success,
                          ),
                          _StatChip(
                            theme: theme,
                            icon: Icons.trending_up,
                            label: 'Ganancia',
                            value: 'S/ ${totals.ganancia.toStringAsFixed(2)}',
                            valueColor: const Color(0xFF6366F1),
                          ),
                        ],
                        _StatChip(
                          theme: theme,
                          icon: Icons.inventory_2_outlined,
                          label: 'Unidades',
                          value: '${totals.cantidad}',
                        ),
                        _StatChip(
                          theme: theme,
                          icon: Icons.calculate_outlined,
                          label: 'Catálogo cargado',
                          value: '${products.length}',
                        ),
                      ],
                    ),
                  ),
                ),
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: _Panel(
                      theme: theme,
                      title: 'Buscar producto',
                      subtitle: 'Primero marca, luego código o modelo.',
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          _DarkField(
                            theme: theme,
                            label: 'Marca',
                            controller: _brandCtrl,
                            hint: 'Escribe la marca',
                            onChanged: (_) {
                              _codeCtrl.clear();
                              _resetProductSelection();
                              setState(() {});
                            },
                            onTap: () => setState(() => _brandFocused = true),
                            onEditingComplete: () =>
                                setState(() => _brandFocused = false),
                          ),
                          if (_brandFocused && _brandSuggestions.isNotEmpty)
                            _SuggestionList(
                              items: _brandSuggestions
                                  .map(
                                    (b) => _SuggestionItem(
                                      title: b,
                                      onTap: () => _selectBrand(b),
                                    ),
                                  )
                                  .toList(),
                            ),
                          const SizedBox(height: 10),
                          _DarkField(
                            theme: theme,
                            label: 'Código o modelo',
                            controller: _codeCtrl,
                            hint: 'Escribe código o nombre',
                            onChanged: (_) {
                              _resetProductSelection();
                              setState(() {});
                            },
                            onTap: () => setState(() => _codeFocused = true),
                          ),
                          if (_codeFocused && _codeSuggestions.isNotEmpty)
                            _SuggestionList(
                              items: _codeSuggestions
                                  .map(
                                    (p) => _SuggestionItem(
                                      title: p['nombre'] as String? ?? '',
                                      badge: p['codigo'] as String? ?? 'SIN-CODIGO',
                                      subtitle: p['marca'] as String? ?? '',
                                      onTap: () => _selectProduct(p),
                                    ),
                                  )
                                  .toList(),
                            ),
                          const SizedBox(height: 12),
                          if (selected == null)
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: AppColors.surface,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Text(
                                'Busca y selecciona un producto para continuar con la venta',
                                style: TextStyle(
                                  color: Colors.white54,
                                  fontSize: 12,
                                ),
                              ),
                            )
                          else
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 4,
                                  ),
                                  decoration: BoxDecoration(
                                    color: AppColors.gold.withValues(alpha: 0.2),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    selected['codigo'] as String? ?? '',
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
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        selected['nombre'] as String? ?? '',
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontWeight: FontWeight.w700,
                                          fontSize: 13,
                                        ),
                                      ),
                                      Text(
                                        selected['marca'] as String? ?? '',
                                        style: const TextStyle(
                                          color: Colors.white54,
                                          fontSize: 11,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                        ],
                      ),
                    ),
                  ),
                ),
                if (selected != null) ...[
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
                      child: _Panel(
                        theme: theme,
                        title: 'Color y talla',
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            if (colors.isNotEmpty) ...[
                              const Text(
                                'Color',
                                style: TextStyle(
                                  color: Colors.white70,
                                  fontSize: 11,
                                ),
                              ),
                              const SizedBox(height: 6),
                              Wrap(
                                spacing: 6,
                                runSpacing: 6,
                                children: colors
                                    .map(
                                      (c) => ChoiceChip(
                                        label: Text(c),
                                        selected: _selectedColor == c,
                                        onSelected: (_) => setState(() {
                                          _selectedColor = c;
                                          _selectedTalla = '';
                                        }),
                                        selectedColor: AppColors.gold,
                                        labelStyle: TextStyle(
                                          color: _selectedColor == c
                                              ? AppColors.black
                                              : Colors.white,
                                          fontSize: 12,
                                        ),
                                        backgroundColor: AppColors.surface,
                                      ),
                                    )
                                    .toList(),
                              ),
                              const SizedBox(height: 12),
                            ],
                            if (colors.isNotEmpty && _selectedColor.isEmpty)
                              const Text(
                                'Selecciona un color para ver sus tallas.',
                                style: TextStyle(
                                  color: Colors.white54,
                                  fontSize: 12,
                                ),
                              )
                            else if (sizes.isEmpty)
                              const Text(
                                'No hay tallas disponibles para esta selección.',
                                style: TextStyle(
                                  color: Colors.white54,
                                  fontSize: 12,
                                ),
                              )
                            else ...[
                              const Text(
                                'Talla',
                                style: TextStyle(
                                  color: Colors.white70,
                                  fontSize: 11,
                                ),
                              ),
                              const SizedBox(height: 6),
                              Wrap(
                                spacing: 6,
                                runSpacing: 6,
                                children: sizes.map((size) {
                                  final stock = _availableForSize(size);
                                  return ChoiceChip(
                                    label: Text('$size ($stock disp.)'),
                                    selected: _selectedTalla == size,
                                    onSelected: stock <= 0
                                        ? null
                                        : (_) => setState(
                                            () => _selectedTalla = size,
                                          ),
                                    selectedColor: AppColors.gold,
                                    labelStyle: TextStyle(
                                      color: _selectedTalla == size
                                          ? AppColors.black
                                          : Colors.white,
                                      fontSize: 11,
                                    ),
                                    backgroundColor: AppColors.surface,
                                  );
                                }).toList(),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                  ),
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
                      child: _Panel(
                        theme: theme,
                        title: 'Precio y cantidad',
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            if (fin != null)
                              Text(
                                'Rango: S/ ${fin.precioMinimo.toStringAsFixed(2)} – '
                                '${fin.precioMaximo.toStringAsFixed(2)} · '
                                'Sugerido: S/ ${fin.precioSugerido.toStringAsFixed(2)}',
                                style: const TextStyle(
                                  color: AppColors.gold,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                ),
                              )
                            else
                              Text(
                                _cfg.finanzasMissing,
                                style: TextStyle(
                                  color: Colors.white54,
                                  fontSize: 12,
                                ),
                              ),
                            const SizedBox(height: 10),
                            Row(
                              children: [
                                Expanded(
                                  child: _DarkField(
                                    theme: theme,
                                    label: 'Cantidad',
                                    controller: _cantCtrl,
                                    keyboardType: TextInputType.number,
                                    hint: '1',
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: _DarkField(
                                    theme: theme,
                                    label: 'Precio de venta',
                                    controller: _precioCtrl,
                                    keyboardType: const TextInputType.numberWithOptions(
                                      decimal: true,
                                    ),
                                    hint: '0.00',
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Stock disponible: $_availableForSelected',
                              style: const TextStyle(
                                color: Colors.white54,
                                fontSize: 11,
                              ),
                            ),
                            const SizedBox(height: 10),
                            SizedBox(
                              height: 42,
                              child: OutlinedButton.icon(
                                onPressed: fin == null ? null : _addLine,
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: AppColors.gold,
                                  side: const BorderSide(color: AppColors.gold),
                                ),
                                icon: const Icon(Icons.add, size: 18),
                                label: const Text('Agregar al detalle'),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
                    child: _Panel(
                      theme: theme,
                      title: 'Detalle por registrar',
                      trailing: Text(
                        'S/ ${pendingTotal.toStringAsFixed(2)}',
                        style: const TextStyle(
                          color: AppColors.gold,
                          fontWeight: FontWeight.w800,
                          fontSize: 16,
                        ),
                      ),
                      child: _pending.isEmpty
                          ? const Text(
                              'Aún no agregaste productos a esta venta.',
                              style: TextStyle(
                                color: Colors.white54,
                                fontSize: 12,
                              ),
                            )
                          : Column(
                              children: _pending.map((line) {
                                final product = products.firstWhere(
                                  (p) => p['id']?.toString() == line.productId,
                                  orElse: () => <String, dynamic>{},
                                );
                                return Container(
                                  margin: const EdgeInsets.only(bottom: 8),
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(
                                    color: AppColors.surface,
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Row(
                                    children: [
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              product['nombre'] as String? ??
                                                  '',
                                              style: const TextStyle(
                                                color: Colors.white,
                                                fontWeight: FontWeight.w700,
                                                fontSize: 13,
                                              ),
                                            ),
                                            Text(
                                              '${line.color.isEmpty ? 'Sin color' : line.color} · '
                                              'Talla ${line.talla.isEmpty ? '-' : line.talla} · '
                                              '×${line.quantity}',
                                              style: const TextStyle(
                                                color: Colors.white54,
                                                fontSize: 11,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      Text(
                                        'S/ ${line.total.toStringAsFixed(2)}',
                                        style: const TextStyle(
                                          color: AppColors.gold,
                                          fontWeight: FontWeight.w800,
                                        ),
                                      ),
                                      IconButton(
                                        icon: const Icon(
                                          Icons.delete_outline,
                                          color: AppColors.error,
                                          size: 20,
                                        ),
                                        onPressed: () => setState(
                                          () => _pending.removeWhere(
                                            (l) => l.id == line.id,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                );
                              }).toList(),
                            ),
                    ),
                  ),
                ),
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
                    child: _Panel(
                      theme: theme,
                      title: 'Documento del cliente',
                      subtitle:
                          'Selecciona nota o guía solo si el cliente la solicita.',
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Row(
                            children: [
                              _DocOption(
                                label: 'Venta simple',
                                selected: _documentType == 'ninguno',
                                onTap: () => setState(() {
                                  _documentType = 'ninguno';
                                  _dniCtrl.clear();
                                  _nombresCtrl.clear();
                                  _apellidosCtrl.clear();
                                  _validatedDni = '';
                                }),
                              ),
                              const SizedBox(width: 6),
                              _DocOption(
                                label: 'Nota de venta',
                                selected: _documentType == 'nota_venta',
                                onTap: () =>
                                    setState(() => _documentType = 'nota_venta'),
                              ),
                              const SizedBox(width: 6),
                              _DocOption(
                                label: 'Guía',
                                selected: _documentType == 'guia_remision',
                                onTap: () => setState(
                                  () => _documentType = 'guia_remision',
                                ),
                              ),
                            ],
                          ),
                          if (requiresCustomer) ...[
                            const SizedBox(height: 12),
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Expanded(
                                  child: _DarkField(
                                    theme: theme,
                                    label: 'DNI del cliente',
                                    controller: _dniCtrl,
                                    hint: '12345678',
                                    keyboardType: TextInputType.number,
                                    maxLength: 8,
                                    inputFormatters: [
                                      FilteringTextInputFormatter.digitsOnly,
                                    ],
                                    onChanged: (v) {
                                      final dni = normalizeDni(v);
                                      if (dni != _validatedDni) {
                                        setState(() {
                                          _validatedDni = '';
                                          _nombresCtrl.clear();
                                          _apellidosCtrl.clear();
                                        });
                                      }
                                    },
                                  ),
                                ),
                                const SizedBox(width: 8),
                                SizedBox(
                                  height: 42,
                                  child: OutlinedButton(
                                    onPressed:
                                        _lookingUpDni ? null : _validateDni,
                                    style: OutlinedButton.styleFrom(
                                      foregroundColor: AppColors.gold,
                                      side: const BorderSide(
                                        color: AppColors.gold,
                                      ),
                                    ),
                                    child: Text(
                                      _lookingUpDni
                                          ? 'Validando…'
                                          : 'Validar DNI',
                                      style: const TextStyle(fontSize: 11),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            _DarkField(
                              theme: theme,
                              label: 'Nombres',
                              controller: _nombresCtrl,
                              readOnly: true,
                              hint: 'Se completa al validar',
                            ),
                            const SizedBox(height: 8),
                            _DarkField(
                              theme: theme,
                              label: 'Apellidos',
                              controller: _apellidosCtrl,
                              readOnly: true,
                              hint: 'Se completa al validar',
                            ),
                            if (customerReady)
                              const Padding(
                                padding: EdgeInsets.only(top: 6),
                                child: Text(
                                  'Cliente validado por DNI',
                                  style: TextStyle(
                                    color: AppColors.success,
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                          ],
                        ],
                      ),
                    ),
                  ),
                ),
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(12, 0, 12, 16),
                    child: SizedBox(
                      height: 48,
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        onPressed: (_saving ||
                                _pending.isEmpty ||
                                (requiresCustomer && !customerReady))
                            ? null
                            : _registerSale,
                        icon: _saving
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: AppColors.black,
                                ),
                              )
                            : const Icon(Icons.add, size: 20),
                        label: Text(
                          _saving
                              ? 'Registrando…'
                              : 'Registrar venta completa',
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.gold,
                          foregroundColor: AppColors.black,
                        ),
                      ),
                    ),
                  ),
                ),
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Historial de ventas',
                          style: TextStyle(
                            color: theme.primaryText,
                            fontWeight: FontWeight.w700,
                            fontSize: 13,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Toca una venta para ver el detalle o registrar una devolución',
                          style: TextStyle(
                            color: theme.secondaryText,
                            fontSize: 11,
                          ),
                        ),
                        const SizedBox(height: 8),
                        TextField(
                          controller: _historialCtrl,
                          onChanged: (_) => setState(() {}),
                          style: TextStyle(
                            color: theme.primaryText,
                            fontSize: 13,
                          ),
                          decoration: InputDecoration(
                            hintText:
                                'Buscar por código, producto, color, talla, DNI…',
                            hintStyle: TextStyle(
                              color: theme.secondaryText.withValues(alpha: 0.7),
                              fontSize: 12,
                            ),
                            filled: true,
                            fillColor: theme.panel,
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10),
                              borderSide: BorderSide(color: theme.border),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10),
                              borderSide: BorderSide(color: theme.border),
                            ),
                            prefixIcon: Icon(
                              Icons.search,
                              color: theme.secondaryText,
                              size: 20,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                salesAsync.when(
                  loading: () => const SliverToBoxAdapter(
                    child: Padding(
                      padding: EdgeInsets.all(24),
                      child: Center(
                        child: CircularProgressIndicator(color: AppColors.gold),
                      ),
                    ),
                  ),
                  error: (e, st) => const SliverToBoxAdapter(child: SizedBox()),
                  data: (_) => filtered.isEmpty
                      ? const SliverToBoxAdapter(
                          child: Padding(
                            padding: EdgeInsets.all(32),
                            child: Center(
                              child: Text(
                                'Sin ventas este día',
                                style: TextStyle(color: Colors.white54),
                              ),
                            ),
                          ),
                        )
                      : SliverPadding(
                          padding: const EdgeInsets.fromLTRB(12, 0, 12, 80),
                          sliver: SliverList(
                            delegate: SliverChildBuilderDelegate(
                              (ctx, i) {
                                final sale = filtered[i];
                                return _HistorialCard(
                                  theme: theme,
                                  sale: sale,
                                  showEncargado: _cfg.showEncargadoInHistorial,
                                  showFinancialDetails: _cfg.showFinancialDetails,
                                  onTap: () => _showSaleDetail(sale),
                                );
                              },
                              childCount: filtered.length,
                            ),
                          ),
                        ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class PanelSalesTheme {
  const PanelSalesTheme({
    required this.scaffold,
    required this.panel,
    required this.fieldFill,
    required this.primaryText,
    required this.secondaryText,
    required this.border,
  });

  final Color scaffold;
  final Color panel;
  final Color fieldFill;
  final Color primaryText;
  final Color secondaryText;
  final Color border;

  static PanelSalesTheme of(PanelSalesUiConfig cfg) =>
      cfg.useDarkTheme ? dark : light;

  static const dark = PanelSalesTheme(
    scaffold: AppColors.black,
    panel: AppColors.surface,
    fieldFill: AppColors.black,
    primaryText: Colors.white,
    secondaryText: Colors.white54,
    border: Color(0x1FFFFFFF),
  );

  static const light = PanelSalesTheme(
    scaffold: AppColors.beige,
    panel: Colors.white,
    fieldFill: Colors.white,
    primaryText: AppColors.textPrimary,
    secondaryText: AppColors.textSecondary,
    border: Color(0xFFE5E5E5),
  );
}

class _StatChip extends StatelessWidget {
  const _StatChip({
    required this.theme,
    required this.icon,
    required this.label,
    required this.value,
    this.valueColor,
  });

  final PanelSalesTheme theme;
  final IconData icon;
  final String label;
  final String value;
  final Color? valueColor;

  @override
  Widget build(BuildContext context) => Container(
    width: 160,
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
    decoration: BoxDecoration(
      color: theme.panel,
      borderRadius: BorderRadius.circular(10),
      border: Border.all(color: theme.border),
      boxShadow: theme.scaffold == AppColors.beige
          ? [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 6,
              ),
            ]
          : null,
    ),
    child: Row(
      children: [
        Icon(icon, color: AppColors.gold, size: 20),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(color: theme.secondaryText, fontSize: 10),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              Text(
                value,
                style: TextStyle(
                  color: valueColor ?? theme.primaryText,
                  fontWeight: FontWeight.w800,
                  fontSize: 14,
                ),
              ),
            ],
          ),
        ),
      ],
    ),
  );
}

class _Panel extends StatelessWidget {
  const _Panel({
    required this.theme,
    required this.title,
    required this.child,
    this.subtitle,
    this.trailing,
  });

  final PanelSalesTheme theme;
  final String title;
  final String? subtitle;
  final Widget child;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: theme.panel,
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: theme.border),
      boxShadow: theme.scaffold == AppColors.beige
          ? [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 8,
              ),
            ]
          : null,
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      color: theme.primaryText,
                      fontWeight: FontWeight.w700,
                      fontSize: 14,
                    ),
                  ),
                  if (subtitle case final s?)
                    Text(
                      s,
                      style: TextStyle(
                        color: theme.secondaryText,
                        fontSize: 11,
                      ),
                    ),
                ],
              ),
            ),
            ?trailing,
          ],
        ),
        const SizedBox(height: 12),
        child,
      ],
    ),
  );
}

class _DarkField extends StatelessWidget {
  const _DarkField({
    required this.theme,
    required this.label,
    required this.controller,
    this.hint,
    this.onChanged,
    this.onTap,
    this.onEditingComplete,
    this.keyboardType,
    this.readOnly = false,
    this.maxLength,
    this.inputFormatters,
  });

  final PanelSalesTheme theme;
  final String label;
  final TextEditingController controller;
  final String? hint;
  final ValueChanged<String>? onChanged;
  final VoidCallback? onTap;
  final VoidCallback? onEditingComplete;
  final TextInputType? keyboardType;
  final bool readOnly;
  final int? maxLength;
  final List<TextInputFormatter>? inputFormatters;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(
        label,
        style: TextStyle(color: theme.secondaryText, fontSize: 11),
      ),
      const SizedBox(height: 4),
      TextField(
        controller: controller,
        readOnly: readOnly,
        onChanged: onChanged,
        onTap: onTap,
        onEditingComplete: onEditingComplete,
        keyboardType: keyboardType,
        maxLength: maxLength,
        inputFormatters: inputFormatters,
        style: TextStyle(color: theme.primaryText, fontSize: 13),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: TextStyle(
            color: theme.secondaryText.withValues(alpha: 0.7),
          ),
          filled: true,
          fillColor: theme.fieldFill,
          counterText: '',
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 12,
            vertical: 10,
          ),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: BorderSide(color: theme.border),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: BorderSide(color: theme.border),
          ),
          focusedBorder: const OutlineInputBorder(
            borderRadius: BorderRadius.all(Radius.circular(8)),
            borderSide: BorderSide(color: AppColors.gold),
          ),
        ),
      ),
    ],
  );
}

class _SuggestionList extends StatelessWidget {
  const _SuggestionList({required this.items});
  final List<_SuggestionItem> items;

  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.only(top: 4),
    constraints: const BoxConstraints(maxHeight: 200),
    decoration: BoxDecoration(
      color: AppColors.black,
      borderRadius: BorderRadius.circular(8),
      border: Border.all(color: AppColors.gold.withValues(alpha: 0.3)),
    ),
    child: ListView(
      shrinkWrap: true,
      padding: EdgeInsets.zero,
      children: items,
    ),
  );
}

class _SuggestionItem extends StatelessWidget {
  const _SuggestionItem({
    required this.title,
    required this.onTap,
    this.badge,
    this.subtitle,
  });

  final String title;
  final String? badge;
  final String? subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => InkWell(
    onTap: onTap,
    child: Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      child: Row(
        children: [
          if (badge != null) ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: AppColors.gold.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(
                badge!,
                style: const TextStyle(
                  color: AppColors.gold,
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            const SizedBox(width: 8),
          ],
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                if (subtitle != null && subtitle!.isNotEmpty)
                  Text(
                    subtitle!,
                    style: const TextStyle(
                      color: Colors.white54,
                      fontSize: 11,
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    ),
  );
}

class _DocOption extends StatelessWidget {
  const _DocOption({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Expanded(
    child: GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
        decoration: BoxDecoration(
          color: selected
              ? AppColors.gold.withValues(alpha: 0.2)
              : AppColors.black,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: selected ? AppColors.gold : Colors.white24,
          ),
        ),
        child: Text(
          label,
          textAlign: TextAlign.center,
          style: TextStyle(
            color: selected ? AppColors.gold : Colors.white70,
            fontSize: 10,
            fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
          ),
        ),
      ),
    ),
  );
}

class _HistorialCard extends StatelessWidget {
  const _HistorialCard({
    required this.theme,
    required this.sale,
    required this.onTap,
    this.showEncargado = false,
    this.showFinancialDetails = false,
  });

  final PanelSalesTheme theme;
  final Map<String, dynamic> sale;
  final VoidCallback onTap;
  final bool showEncargado;
  final bool showFinancialDetails;

  @override
  Widget build(BuildContext context) {
    final devuelto = sale['devuelto'] as bool? ?? false;
    final docTipo = sale['documentoTipo'] as String? ?? 'ninguno';
    final docLabel = saleDocLabels[docTipo] ?? docTipo;
    final encargado = sale['encargadoNombre'] as String?;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: devuelto ? theme.border.withValues(alpha: 0.3) : theme.panel,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: theme.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  sale['codigo'] as String? ?? '',
                  style: const TextStyle(
                    color: AppColors.gold,
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const Spacer(),
                Text(
                  formatSaleTime(sale['creadoEn'] as String?),
                  style: TextStyle(color: theme.secondaryText, fontSize: 11),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              sale['nombre'] as String? ?? '',
              style: TextStyle(
                color: devuelto ? theme.secondaryText : theme.primaryText,
                fontWeight: FontWeight.w700,
                fontSize: 13,
              ),
            ),
            Text(
              [
                if ((sale['color'] as String?)?.isNotEmpty == true)
                  sale['color'],
                if ((sale['talla'] as String?)?.isNotEmpty == true)
                  'Talla ${sale['talla']}',
                '×${sale['cantidad'] ?? 1}',
              ].join(' · '),
              style: TextStyle(color: theme.secondaryText, fontSize: 11),
            ),
            if (showEncargado && (encargado?.isNotEmpty == true)) ...[
              const SizedBox(height: 4),
              Text(
                encargado!,
                style: TextStyle(color: theme.secondaryText, fontSize: 10),
              ),
            ],
            const SizedBox(height: 8),
            Row(
              children: [
                Text(
                  'S/ ${((sale['total'] as num?)?.toDouble() ?? 0).toStringAsFixed(2)}',
                  style: TextStyle(
                    color: devuelto ? theme.secondaryText : AppColors.gold,
                    fontWeight: FontWeight.w800,
                    fontSize: 14,
                  ),
                ),
                if (showFinancialDetails && !devuelto) ...[
                  const SizedBox(width: 10),
                  Text(
                    'Gan. S/ ${((sale['ganancia'] as num?)?.toDouble() ?? 0).toStringAsFixed(2)}',
                    style: const TextStyle(
                      color: AppColors.success,
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
                const Spacer(),
                if (docTipo != 'ninguno')
                  Text(
                    docLabel,
                    style: TextStyle(
                      color: theme.secondaryText,
                      fontSize: 10,
                    ),
                  ),
                if (devuelto) ...[
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 6,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: theme.border,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      'DEVUELTO',
                      style: TextStyle(
                        color: theme.secondaryText,
                        fontSize: 9,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }
}
