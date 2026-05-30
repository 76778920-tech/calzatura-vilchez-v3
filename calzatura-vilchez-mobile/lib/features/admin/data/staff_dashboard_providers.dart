import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/services/panel_bff_api.dart';
import 'panel_scope_provider.dart';

String _todayIso() {
  final d = DateTime.now();
  return '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
}

/// KPIs operativos de tienda vía BFF (`/staff/*`).
final staffKpisProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  ref.watch(panelScopeProvider);
  final api = PanelBffApi();
  final today = _todayIso();
  final orders = await api.fetchOrders(PanelScope.staff);
  final sales = await api.fetchDailySales(PanelScope.staff, fecha: today);
  final activas = orders
      .where((o) => o['estado'] == 'pendiente' || o['estado'] == 'pagado')
      .length;
  final ventasHoy = sales.where((s) => s['devuelto'] != true).toList();
  final totalHoy = ventasHoy.fold<double>(
    0,
    (sum, s) => sum + ((s['total'] as num?)?.toDouble() ?? 0),
  );
  final pares = ventasHoy.fold<int>(
    0,
    (sum, s) => sum + ((s['cantidad'] as num?)?.toInt() ?? 0),
  );

  return {
    'pedidos': orders.length,
    'pendientes': orders.where((o) => o['estado'] == 'pendiente').length,
    'activas': activas,
    'ventasHoy': ventasHoy.length,
    'totalHoy': totalHoy,
    'pares': pares,
  };
});

final staffRecentOrdersProvider =
    FutureProvider<List<Map<String, dynamic>>>((ref) async {
      final orders = await PanelBffApi().fetchOrders(PanelScope.staff);
      orders.sort(
        (a, b) => (b['creadoEn'] as String? ?? '').compareTo(
          a['creadoEn'] as String? ?? '',
        ),
      );
      return orders.take(6).toList();
    });
