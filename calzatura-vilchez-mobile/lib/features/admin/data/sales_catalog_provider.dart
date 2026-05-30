import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/services/panel_bff_api.dart';
import '../domain/sales_register_logic.dart';
import 'panel_scope_provider.dart';

final salesSelectedDateProvider = StateProvider<DateTime>((ref) => DateTime.now());

final panelDaySalesProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
      final date = ref.watch(salesSelectedDateProvider);
      final scope = ref.watch(panelScopeProvider);
      final dateStr =
          '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
      final sales = await PanelBffApi().fetchDailySales(scope, fecha: dateStr);
      sales.sort(
        (a, b) => (b['creadoEn'] as String? ?? '').compareTo(
          a['creadoEn'] as String? ?? '',
        ),
      );
      return sales;
    });

/// Catálogo fusionado: productos + códigos + finanzas/rangos según alcance BFF.
final panelSalesCatalogProvider = FutureProvider.autoDispose
    .family<List<Map<String, dynamic>>, PanelScope>((ref, scope) async {
      final api = PanelBffApi();
      final products = await api.fetchProducts(scope);
      final codes = await api.fetchProductCodes(scope);
      Map<String, Map<String, dynamic>> finanzasRows = {};
      try {
        finanzasRows = scope == PanelScope.staff
            ? await api.fetchProductPriceRanges()
            : await api.fetchAdminProductFinanzas();
      } catch (_) {
        finanzasRows = {};
      }

      return products
          .where((p) => p['activo'] != false && ((p['stock'] as num?) ?? 0) > 0)
          .map((p) {
            final id = p['id']?.toString() ?? '';
            final row = finanzasRows[id];
            ProductFinanzas? finanzas;
            if (row != null) finanzas = ProductFinanzas.fromRow(row);
            return {
              ...p,
              'codigo': codes[id] ?? p['codigo']?.toString() ?? '',
              if (finanzas != null) 'finanzas': finanzas.toCatalogMap(),
            };
          })
          .toList();
    });

/// Alias staff (compatibilidad con `staff_sales_page`).
final staffSalesCatalogProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
      return ref.watch(panelSalesCatalogProvider(PanelScope.staff).future);
    });
