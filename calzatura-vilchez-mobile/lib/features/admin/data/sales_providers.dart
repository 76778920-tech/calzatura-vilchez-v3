import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/services/panel_bff_api.dart';
import 'panel_scope_provider.dart';

final salesSelectedDateProvider = StateProvider<DateTime>((ref) => DateTime.now());

final daySalesProvider =
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
