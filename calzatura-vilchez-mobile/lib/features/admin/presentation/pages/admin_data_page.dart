import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/cv_app_bar.dart';
import '../../data/admin_data_service.dart';

// ─── Constantes ───────────────────────────────────────────────────────────────

const _kScenarios = ['crisis', 'normal', 'buenas', 'general'];

const _kExportCols = [
  _ExportCol('productos', Icons.inventory_2_outlined, AppColors.gold),
  _ExportCol('ventasDiarias', Icons.point_of_sale_outlined, Color(0xFF0EA5E9)),
  _ExportCol('pedidos', Icons.receipt_long_outlined, Color(0xFF10B981)),
  _ExportCol('usuarios', Icons.people_outline_rounded, Color(0xFF6366F1)),
  _ExportCol('fabricantes', Icons.factory_outlined, Color(0xFFF59E0B)),
];

class _ExportCol {
  const _ExportCol(this.name, this.icon, this.color);
  final String name;
  final IconData icon;
  final Color color;
}

// ─── Página principal ─────────────────────────────────────────────────────────

class AdminDataPage extends ConsumerStatefulWidget {
  const AdminDataPage({super.key});

  @override
  ConsumerState<AdminDataPage> createState() => _AdminDataPageState();
}

class _AdminDataPageState extends ConsumerState<AdminDataPage> {
  late final AdminDataService _service;

  String? _exportingCol;

  // null = error/no cargado, -1 = cargando, >=0 = count real
  final Map<String, int?> _scenarioCounts = {
    for (final s in _kScenarios) s: null,
  };
  final Set<String> _scenarioDeleting = {};

  List<String> _batches = [];
  bool _loadingBatches = true;
  final Set<String> _batchDeleting = {};

  DateTime _salesDate = DateTime.now();
  int? _salesCount;
  bool _countingSales = false;
  bool _deletingSales = false;

  @override
  void initState() {
    super.initState();
    _service = ref.read(adminDataServiceProvider);
    _loadScenarioCounts();
    _loadBatches();
  }

  Future<void> _loadScenarioCounts() async {
    setState(() {
      for (final s in _kScenarios) {
      _scenarioCounts[s] = -1;
    }
    });
    await Future.wait(_kScenarios.map((s) async {
      try {
        final count = await _service.countScenario(s);
        if (mounted) setState(() => _scenarioCounts[s] = count);
      } catch (_) {
        if (mounted) setState(() => _scenarioCounts[s] = null);
      }
    }));
  }

  Future<void> _loadBatches() async {
    if (!mounted) return;
    setState(() => _loadingBatches = true);
    try {
      final batches = await _service.listBatches();
      if (mounted) {
        setState(() {
          _batches = batches;
          _loadingBatches = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loadingBatches = false);
    }
  }

  Future<void> _exportCol(String col) async {
    if (_exportingCol != null) return;
    setState(() => _exportingCol = col);
    try {
      await _service.exportAndShare(col);
    } catch (e) {
      if (!mounted) return;
      _showErr('No se pudo exportar "$col":\n$e');
    } finally {
      if (mounted) setState(() => _exportingCol = null);
    }
  }

  Future<void> _deleteScenario(String s) async {
    final count = _scenarioCounts[s] ?? 0;
    if (count <= 0) return;
    final ok = await _confirm(
      'Eliminar escenario ${_scenarioLabel(s)}',
      'Se eliminarán $count registros del escenario "$s" en todas las tablas.\n\nEsta acción no se puede deshacer.',
    );
    if (!ok || !mounted) return;
    setState(() => _scenarioDeleting.add(s));
    try {
      await _service.deleteScenario(s);
      if (!mounted) return;
      setState(() => _scenarioCounts[s] = 0);
      _showOk('Escenario "$s" eliminado ($count registros).');
    } catch (e) {
      if (!mounted) return;
      _showErr('Error: $e');
    } finally {
      if (mounted) setState(() => _scenarioDeleting.remove(s));
    }
  }

  Future<void> _deleteBatch(String lote) async {
    setState(() => _batchDeleting.add(lote));
    int count = 0;
    try {
      count = await _service.countBatch(lote);
    } catch (_) {}
    if (!mounted) {
      setState(() => _batchDeleting.remove(lote));
      return;
    }
    final ok = await _confirm(
      'Eliminar lote de importación',
      'Lote: $lote\n\n$count registros serán eliminados de todas las tablas.\n\nEsta acción no se puede deshacer.',
    );
    if (!ok || !mounted) {
      setState(() => _batchDeleting.remove(lote));
      return;
    }
    try {
      await _service.deleteBatch(lote);
      if (!mounted) return;
      setState(() {
        _batches.remove(lote);
        _batchDeleting.remove(lote);
      });
      _showOk('Lote eliminado.');
    } catch (e) {
      if (!mounted) return;
      setState(() => _batchDeleting.remove(lote));
      _showErr('Error: $e');
    }
  }

  Future<void> _countSales() async {
    setState(() {
      _countingSales = true;
      _salesCount = null;
    });
    try {
      final count = await _service.countSalesUntil(_isoDate(_salesDate));
      if (mounted) {
        setState(() {
          _salesCount = count;
          _countingSales = false;
        });
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _countingSales = false);
      _showErr('Error al contar: $e');
    }
  }

  Future<void> _deleteSales() async {
    final count = _salesCount ?? 0;
    if (count <= 0) return;
    final ok = await _confirm(
      'Eliminar ventas diarias',
      'Se eliminarán $count ventas hasta el ${_fmtDate(_salesDate)}.\n\nEsta acción no se puede deshacer.',
    );
    if (!ok || !mounted) return;
    setState(() => _deletingSales = true);
    try {
      await _service.deleteSalesUntil(_isoDate(_salesDate));
      if (!mounted) return;
      setState(() {
        _salesCount = 0;
        _deletingSales = false;
      });
      _showOk('$count ventas eliminadas.');
    } catch (e) {
      if (!mounted) return;
      setState(() => _deletingSales = false);
      _showErr('Error: $e');
    }
  }

  Future<bool> _confirm(String title, String body) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: Text(
          title,
          style: const TextStyle(
            fontWeight: FontWeight.w700,
            fontSize: 16,
            color: AppColors.textPrimary,
          ),
        ),
        content: Text(
          body,
          style: const TextStyle(
            fontSize: 13,
            color: AppColors.textSecondary,
            height: 1.5,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.error,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            child: const Text('Eliminar'),
          ),
        ],
      ),
    );
    return result ?? false;
  }

  void _showErr(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: AppColors.error),
    );
  }

  void _showOk(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: const Color(0xFF10B981),
      ),
    );
  }

  static String _scenarioLabel(String s) => switch (s) {
        'crisis' => 'Crisis',
        'normal' => 'Normal',
        'buenas' => 'Buenas Ventas',
        'general' => 'General',
        _ => s,
      };

  static Color _scenarioColor(String s) => switch (s) {
        'crisis' => AppColors.error,
        'normal' => const Color(0xFF6366F1),
        'buenas' => const Color(0xFF10B981),
        'general' => const Color(0xFFF59E0B),
        _ => AppColors.gold,
      };

  static String _fmtDate(DateTime d) =>
      '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';

  static String _isoDate(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.beige,
      appBar: CVAppBar(
        leading: CVBackButton(onPressed: () => context.pop()),
      ),
      body: RefreshIndicator(
        color: AppColors.gold,
        onRefresh: () async {
          await Future.wait([_loadScenarioCounts(), _loadBatches()]);
        },
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 20, 16, 40),
          children: [
            // ── Exportar CSV ──────────────────────────────────────────────
            _SectionCard(
              title: 'Exportar CSV',
              icon: Icons.download_outlined,
              iconColor: AppColors.gold,
              child: _ExportGrid(
                exportingCol: _exportingCol,
                onExport: _exportCol,
              ),
            ).animate().fadeIn(duration: 300.ms),
            const SizedBox(height: 20),

            // ── Datos de prueba por escenario ─────────────────────────────
            _SectionCard(
              title: 'Datos de prueba — Escenarios',
              icon: Icons.science_outlined,
              iconColor: const Color(0xFF6366F1),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Elimina registros generados por escenario en productos, finanzas, fabricantes y ventas.',
                    style: TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 12,
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 14),
                  ..._kScenarios.map(
                    (s) => _ScenarioRow(
                      label: _scenarioLabel(s),
                      count: _scenarioCounts[s],
                      color: _scenarioColor(s),
                      isDeleting: _scenarioDeleting.contains(s),
                      onDelete: _scenarioCounts[s] != null &&
                              _scenarioCounts[s]! > 0 &&
                              !_scenarioDeleting.contains(s)
                          ? () => _deleteScenario(s)
                          : null,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton.icon(
                      onPressed: _loadScenarioCounts,
                      icon: const Icon(Icons.refresh, size: 14),
                      label: const Text(
                        'Actualizar conteos',
                        style: TextStyle(fontSize: 12),
                      ),
                      style: TextButton.styleFrom(
                        foregroundColor: AppColors.textSecondary,
                      ),
                    ),
                  ),
                ],
              ),
            ).animate().fadeIn(delay: 100.ms, duration: 300.ms),
            const SizedBox(height: 20),

            // ── Historial de lotes ────────────────────────────────────────
            _SectionCard(
              title: 'Historial de lotes',
              icon: Icons.folder_open_outlined,
              iconColor: const Color(0xFFF59E0B),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Lotes de importación de datos de prueba. Elimina un lote completo de todas las tablas.',
                    style: TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 12,
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 14),
                  if (_loadingBatches)
                    const Center(
                      child: Padding(
                        padding: EdgeInsets.symmetric(vertical: 16),
                        child: CircularProgressIndicator(color: AppColors.gold),
                      ),
                    )
                  else if (_batches.isEmpty)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 8),
                      child: Text(
                        'Sin lotes de prueba registrados.',
                        style: TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 13,
                        ),
                      ),
                    )
                  else
                    ..._batches.map(
                      (lote) => _BatchRow(
                        lote: lote,
                        isDeleting: _batchDeleting.contains(lote),
                        onDelete: _batchDeleting.contains(lote)
                            ? null
                            : () => _deleteBatch(lote),
                      ),
                    ),
                  const SizedBox(height: 4),
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton.icon(
                      onPressed: _loadBatches,
                      icon: const Icon(Icons.refresh, size: 14),
                      label: const Text(
                        'Recargar lotes',
                        style: TextStyle(fontSize: 12),
                      ),
                      style: TextButton.styleFrom(
                        foregroundColor: AppColors.textSecondary,
                      ),
                    ),
                  ),
                ],
              ),
            ).animate().fadeIn(delay: 200.ms, duration: 300.ms),
            const SizedBox(height: 20),

            // ── Limpiar ventas por fecha ───────────────────────────────────
            _SectionCard(
              title: 'Limpiar ventas por fecha',
              icon: Icons.delete_sweep_outlined,
              iconColor: const Color(0xFF0EA5E9),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Elimina registros de ventasDiarias hasta la fecha seleccionada (inclusive).',
                    style: TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 12,
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 14),
                  GestureDetector(
                    onTap: () async {
                      final picked = await showDatePicker(
                        context: context,
                        initialDate: _salesDate,
                        firstDate: DateTime(2020),
                        lastDate: DateTime.now(),
                        builder: (ctx, child) => Theme(
                          data: Theme.of(ctx).copyWith(
                            colorScheme: const ColorScheme.light(
                              primary: AppColors.gold,
                            ),
                          ),
                          child: child!,
                        ),
                      );
                      if (picked != null && mounted) {
                        setState(() {
                          _salesDate = picked;
                          _salesCount = null;
                        });
                      }
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 12,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0EA5E9).withValues(alpha: 0.06),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: const Color(0xFF0EA5E9).withValues(alpha: 0.35),
                        ),
                      ),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.calendar_today_outlined,
                            size: 16,
                            color: Color(0xFF0EA5E9),
                          ),
                          const SizedBox(width: 10),
                          Text(
                            'Hasta: ${_fmtDate(_salesDate)}',
                            style: const TextStyle(
                              fontWeight: FontWeight.w600,
                              fontSize: 14,
                              color: Color(0xFF0EA5E9),
                            ),
                          ),
                          const Spacer(),
                          const Text(
                            'Cambiar',
                            style: TextStyle(
                              fontSize: 11,
                              color: Color(0xFF0EA5E9),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),
                  if (_countingSales)
                    const Row(
                      children: [
                        SizedBox(
                          width: 14,
                          height: 14,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Color(0xFF0EA5E9),
                          ),
                        ),
                        SizedBox(width: 8),
                        Text(
                          'Contando registros...',
                          style: TextStyle(
                            fontSize: 12,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    )
                  else if (_salesCount != null)
                    RichText(
                      text: TextSpan(
                        style: const TextStyle(fontSize: 13),
                        children: [
                          const TextSpan(
                            text: 'Registros encontrados: ',
                            style: TextStyle(color: AppColors.textSecondary),
                          ),
                          TextSpan(
                            text: _salesCount!.toString(),
                            style: TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 16,
                              color: _salesCount! > 0
                                  ? AppColors.error
                                  : AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    )
                  else
                    const Text(
                      'Presiona "Contar" para ver cuántos registros se eliminarán.',
                      style: TextStyle(
                        fontSize: 12,
                        color: AppColors.textSecondary,
                        fontStyle: FontStyle.italic,
                      ),
                    ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _countingSales ? null : _countSales,
                          icon: const Icon(Icons.search, size: 16),
                          label: const Text('Contar'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: const Color(0xFF0EA5E9),
                            side:
                                const BorderSide(color: Color(0xFF0EA5E9)),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: _salesCount != null &&
                                  _salesCount! > 0 &&
                                  !_deletingSales
                              ? _deleteSales
                              : null,
                          icon: _deletingSales
                              ? const SizedBox(
                                  width: 14,
                                  height: 14,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                )
                              : const Icon(
                                  Icons.delete_sweep_outlined,
                                  size: 16,
                                ),
                          label: const Text('Eliminar'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.error,
                            foregroundColor: Colors.white,
                            disabledBackgroundColor:
                                AppColors.error.withValues(alpha: 0.35),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ).animate().fadeIn(delay: 300.ms, duration: 300.ms),
          ],
        ),
      ),
    );
  }
}

// ─── Export grid ──────────────────────────────────────────────────────────────

class _ExportGrid extends StatelessWidget {
  const _ExportGrid({required this.exportingCol, required this.onExport});

  final String? exportingCol;
  final void Function(String) onExport;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Descarga cualquier colección completa en formato CSV listo para Excel.',
          style: TextStyle(
            color: AppColors.textSecondary,
            fontSize: 12,
            height: 1.4,
          ),
        ),
        const SizedBox(height: 14),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: _kExportCols.map((col) {
            final isLoading = exportingCol == col.name;
            final isDisabled = exportingCol != null && !isLoading;
            return ActionChip(
              avatar: isLoading
                  ? SizedBox(
                      width: 14,
                      height: 14,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: col.color,
                      ),
                    )
                  : Icon(
                      col.icon,
                      size: 16,
                      color: isDisabled
                          ? col.color.withValues(alpha: 0.4)
                          : col.color,
                    ),
              label: Text(col.name),
              backgroundColor:
                  col.color.withValues(alpha: isDisabled ? 0.04 : 0.08),
              side: BorderSide(
                color: col.color.withValues(alpha: isDisabled ? 0.15 : 0.3),
              ),
              labelStyle: TextStyle(
                color: isDisabled
                    ? col.color.withValues(alpha: 0.5)
                    : col.color,
                fontWeight: FontWeight.w600,
                fontSize: 12,
              ),
              onPressed:
                  isDisabled || isLoading ? null : () => onExport(col.name),
            );
          }).toList(),
        ),
      ],
    );
  }
}

// ─── Scenario row ─────────────────────────────────────────────────────────────

class _ScenarioRow extends StatelessWidget {
  const _ScenarioRow({
    required this.label,
    required this.count,
    required this.color,
    required this.isDeleting,
    required this.onDelete,
  });

  final String label;
  final int? count; // null = error, -1 = loading, >=0 = count
  final Color color;
  final bool isDeleting;
  final VoidCallback? onDelete;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Row(
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              label,
              style: const TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 13,
                color: AppColors.textPrimary,
              ),
            ),
          ),
          _CountWidget(count: count, color: color),
          const SizedBox(width: 12),
          if (isDeleting)
            SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: AppColors.error,
              ),
            )
          else
            GestureDetector(
              onTap: onDelete,
              child: Icon(
                Icons.delete_outline_rounded,
                size: 20,
                color: onDelete != null
                    ? AppColors.error
                    : AppColors.textSecondary.withValues(alpha: 0.3),
              ),
            ),
        ],
      ),
    );
  }
}

class _CountWidget extends StatelessWidget {
  const _CountWidget({required this.count, required this.color});
  final int? count;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final c = count;
    if (c == -1) {
      return SizedBox(
        width: 12,
        height: 12,
        child: CircularProgressIndicator(strokeWidth: 2, color: color),
      );
    }
    if (c == null) {
      return const Text(
        '—',
        style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
      );
    }
    return Text(
      c.toString(),
      style: TextStyle(
        fontSize: 15,
        fontWeight: FontWeight.w700,
        color: c > 0 ? color : AppColors.textSecondary,
      ),
    );
  }
}

// ─── Batch row ────────────────────────────────────────────────────────────────

class _BatchRow extends StatelessWidget {
  const _BatchRow({
    required this.lote,
    required this.isDeleting,
    required this.onDelete,
  });

  final String lote;
  final bool isDeleting;
  final VoidCallback? onDelete;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: const Color(0xFFF59E0B).withValues(alpha: 0.25),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 4,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Row(
        children: [
          const Icon(
            Icons.label_outline_rounded,
            size: 16,
            color: Color(0xFFF59E0B),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              lote,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
          if (isDeleting)
            const SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: AppColors.error,
              ),
            )
          else
            GestureDetector(
              onTap: onDelete,
              child: const Icon(
                Icons.delete_outline_rounded,
                size: 20,
                color: AppColors.error,
              ),
            ),
        ],
      ),
    );
  }
}

// ─── Section card ─────────────────────────────────────────────────────────────

class _SectionCard extends StatelessWidget {
  const _SectionCard({
    required this.title,
    required this.icon,
    required this.iconColor,
    required this.child,
  });

  final String title;
  final IconData icon;
  final Color iconColor;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: iconColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, size: 18, color: iconColor),
              ),
              const SizedBox(width: 12),
              Text(
                title,
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 15,
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          child,
        ],
      ),
    );
  }
}
