import 'dart:async';

import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart' as sb;
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/cv_logo.dart';
import '../../../../shared/widgets/back_navigation_scope.dart';
import '../../../auth/presentation/providers/auth_provider.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Modelo interno para datos del gráfico
// ─────────────────────────────────────────────────────────────────────────────

class _ChartData {
  const _ChartData({
    required this.web,
    required this.tienda,
    required this.labels,
  });
  final List<double> web;
  final List<double> tienda;
  final List<String> labels;

  double get totalWeb => web.fold(0.0, (a, b) => a + b);
  double get totalTienda => tienda.fold(0.0, (a, b) => a + b);
  double get todayWeb => web.isNotEmpty ? web.last : 0.0;
  double get todayTienda => tienda.isNotEmpty ? tienda.last : 0.0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Modelo de notificación de trabajador
// ─────────────────────────────────────────────────────────────────────────────

class _WorkerNotif {
  const _WorkerNotif({
    required this.id,
    required this.accion,
    required this.entidad,
    this.entidadNombre,
    this.usuarioEmail,
    required this.realizadoEn,
    this.leido = false,
  });

  final String id;
  final String accion;
  final String entidad;
  final String? entidadNombre;
  final String? usuarioEmail;
  final String realizadoEn;
  final bool leido;

  _WorkerNotif markRead() => _WorkerNotif(
        id: id,
        accion: accion,
        entidad: entidad,
        entidadNombre: entidadNombre,
        usuarioEmail: usuarioEmail,
        realizadoEn: realizadoEn,
        leido: true,
      );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

final _supabase = sb.Supabase.instance.client;

String _greeting() {
  final h = DateTime.now().hour;
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

String _greetingWithName(String? name) {
  final first = name?.trim().split(RegExp(r'\s+')).firstOrNull;
  return first != null && first.isNotEmpty ? '${_greeting()}, $first' : _greeting();
}

String _formatCurrency(double n) => 'S/ ${n.toStringAsFixed(2)}';

String _formatCurrencyShort(double n) {
  if (n >= 1000) {
    final k = n / 1000;
    return 'S/ ${k == k.truncateToDouble() ? k.toInt().toString() : k.toStringAsFixed(1)}k';
  }
  return 'S/ ${n.round()}';
}

String _weekdayShort(int weekday) {
  const labels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  return labels[(weekday - 1).clamp(0, 6)];
}

String _maskEmail(String? email) {
  if (email == null || !email.contains('@')) return '—';
  final parts = email.split('@');
  final local = parts[0];
  final domain = parts[1];
  if (local.length <= 2) return '$local***@$domain';
  return '${local.substring(0, 2)}***@$domain';
}

Color _statusColor(String status) {
  switch (status) {
    case 'pagado':
      return const Color(0xFF3B82F6);
    case 'enviado':
      return const Color(0xFF8B5CF6);
    case 'entregado':
      return const Color(0xFF10B981);
    case 'cancelado':
      return AppColors.error;
    default:
      return AppColors.warning;
  }
}

String _statusLabel(String status) {
  switch (status) {
    case 'pagado':
      return 'Pagado';
    case 'enviado':
      return 'Enviado';
    case 'entregado':
      return 'Entregado';
    case 'cancelado':
      return 'Cancelado';
    default:
      return 'Pendiente';
  }
}

double _chartScaleMax(List<double> values) {
  final maxVal = values.fold(0.0, (a, b) => a > b ? a : b);
  if (maxVal <= 0) return 100;
  if (maxVal <= 80) return (maxVal / 20).ceil() * 20.0;
  if (maxVal <= 200) return (maxVal / 50).ceil() * 50.0;
  if (maxVal <= 600) return (maxVal / 100).ceil() * 100.0;
  if (maxVal <= 1500) return (maxVal / 250).ceil() * 250.0;
  return (maxVal / 500).ceil() * 500.0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Providers
// ─────────────────────────────────────────────────────────────────────────────

final adminKpisProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final productos = await _supabase
      .from('productos')
      .select()
      .count(sb.CountOption.exact);
  final pedidosCnt = await _supabase
      .from('pedidos')
      .select()
      .count(sb.CountOption.exact);
  final usuarios = await _supabase
      .from('usuarios')
      .select()
      .count(sb.CountOption.exact);
  final pendientes = await _supabase
      .from('pedidos')
      .select()
      .eq('estado', 'pendiente')
      .count(sb.CountOption.exact);

  final pedidosActivos = await _supabase
      .from('pedidos')
      .select('total')
      .inFilter('estado', ['pagado', 'enviado', 'entregado']);
  double ingresosWeb = 0;
  for (final p in List<Map<String, dynamic>>.from(pedidosActivos as List)) {
    ingresosWeb += (p['total'] as num?)?.toDouble() ?? 0;
  }

  final ventasTienda = await _supabase
      .from('ventasDiarias')
      .select('total')
      .eq('devuelto', false);
  double ingresosTienda = 0;
  for (final v in List<Map<String, dynamic>>.from(ventasTienda as List)) {
    ingresosTienda += (v['total'] as num?)?.toDouble() ?? 0;
  }

  return {
    'productos': productos.count,
    'pedidos': pedidosCnt.count,
    'usuarios': usuarios.count,
    'pendientes': pendientes.count,
    'ingresosWeb': ingresosWeb,
    'ingresosTienda': ingresosTienda,
  };
});

final adminRecentOrdersProvider = FutureProvider<List<Map<String, dynamic>>>((
  ref,
) async {
  final data = await _supabase
      .from('pedidos')
      .select('id, estado, total, subtotal, envio, creadoEn, userEmail, direccion, items')
      .order('creadoEn', ascending: false)
      .limit(8);
  return List<Map<String, dynamic>>.from(data as List);
});

final adminAllOrdersProvider = FutureProvider<List<Map<String, dynamic>>>((
  ref,
) async {
  final data = await _supabase.from('pedidos').select('id, estado');
  return List<Map<String, dynamic>>.from(data as List);
});

final adminChartProvider = FutureProvider<_ChartData>((ref) async {
  final now = DateTime.now();
  final isoDates = List.generate(7, (i) {
    final d = now.subtract(Duration(days: 6 - i));
    return '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
  });
  final startDate = isoDates.first;

  final pedidosData = await _supabase
      .from('pedidos')
      .select('total, creadoEn')
      .inFilter('estado', ['pagado', 'enviado', 'entregado'])
      .gte('creadoEn', startDate);

  final ventasData = await _supabase
      .from('ventasDiarias')
      .select('total, fecha')
      .eq('devuelto', false)
      .gte('fecha', startDate);

  final pedidos = List<Map<String, dynamic>>.from(pedidosData as List);
  final ventas = List<Map<String, dynamic>>.from(ventasData as List);

  final webValues = <double>[];
  final tiendaValues = <double>[];
  final labels = <String>[];

  for (final isoDate in isoDates) {
    final date = DateTime.parse(isoDate);
    labels.add(_weekdayShort(date.weekday));

    double webTotal = 0;
    for (final p in pedidos) {
      final fecha = (p['creadoEn'] as String?)?.substring(0, 10) ?? '';
      if (fecha == isoDate) webTotal += (p['total'] as num?)?.toDouble() ?? 0;
    }
    webValues.add(webTotal);

    double tiendaTotal = 0;
    for (final v in ventas) {
      if (v['fecha'] == isoDate) {
        tiendaTotal += (v['total'] as num?)?.toDouble() ?? 0;
      }
    }
    tiendaValues.add(tiendaTotal);
  }

  return _ChartData(web: webValues, tienda: tiendaValues, labels: labels);
});

final adminAuditProvider = FutureProvider<List<Map<String, dynamic>>>((
  ref,
) async {
  final data = await _supabase
      .from('auditoria')
      .select('id, accion, entidad, entidadNombre, usuarioEmail, realizadoEn')
      .order('realizadoEn', ascending: false)
      .limit(10);
  return List<Map<String, dynamic>>.from(data as List);
});

// ─────────────────────────────────────────────────────────────────────────────
// Página principal
// ─────────────────────────────────────────────────────────────────────────────

class AdminDashboardPage extends ConsumerStatefulWidget {
  const AdminDashboardPage({super.key});

  @override
  ConsumerState<AdminDashboardPage> createState() => _AdminDashboardPageState();
}

class _AdminDashboardPageState extends ConsumerState<AdminDashboardPage>
    with WidgetsBindingObserver, TickerProviderStateMixin {
  sb.RealtimeChannel? _realtimeChannel;
  sb.RealtimeChannel? _notifChannel;
  Timer? _debounce;
  late final TabController _tabController;

  // ── Notificaciones de trabajadores ────────────────────────────────────────
  final Set<String> _workerUids = {};
  final List<_WorkerNotif> _workerNotifs = [];
  int get _unreadCount => _workerNotifs.where((n) => !n.leido).length;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    WidgetsBinding.instance.addObserver(this);
    _subscribeRealtime();
    _loadWorkerUids();
  }

  @override
  void dispose() {
    _tabController.dispose();
    WidgetsBinding.instance.removeObserver(this);
    _debounce?.cancel();
    if (_realtimeChannel != null) {
      _supabase.removeChannel(_realtimeChannel!);
    }
    if (_notifChannel != null) {
      _supabase.removeChannel(_notifChannel!);
    }
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _invalidateAll();
    }
  }

  void _subscribeRealtime() {
    _realtimeChannel = _supabase
        .channel('admin-dashboard')
        .onPostgresChanges(
          event: sb.PostgresChangeEvent.all,
          schema: 'public',
          table: 'pedidos',
          callback: (_) => _debouncedInvalidate(),
        )
        .onPostgresChanges(
          event: sb.PostgresChangeEvent.all,
          schema: 'public',
          table: 'ventasDiarias',
          callback: (_) => _debouncedInvalidate(),
        )
        .onPostgresChanges(
          event: sb.PostgresChangeEvent.all,
          schema: 'public',
          table: 'auditoria',
          callback: (_) => _debouncedInvalidate(),
        )
        .subscribe();
  }

  void _debouncedInvalidate() {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 800), _invalidateAll);
  }

  void _showOrderDetail(Map<String, dynamic> order) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _OrderDetailSheet(order: order),
    );
  }

  void _invalidateAll() {
    if (!mounted) return;
    ref.invalidate(adminKpisProvider);
    ref.invalidate(adminRecentOrdersProvider);
    ref.invalidate(adminAllOrdersProvider);
    ref.invalidate(adminChartProvider);
    ref.invalidate(adminAuditProvider);
  }

  // ── Notificaciones de trabajadores ────────────────────────────────────────

  Future<void> _loadWorkerUids() async {
    try {
      final data = await _supabase
          .from('usuarios')
          .select('uid')
          .eq('rol', 'trabajador');
      if (!mounted) return;
      final uids = List<Map<String, dynamic>>.from(data as List)
          .map((u) => u['uid'] as String?)
          .whereType<String>()
          .toSet();
      _workerUids.addAll(uids);
      _subscribeWorkerNotifs();
    } catch (_) {}
  }

  void _subscribeWorkerNotifs() {
    _notifChannel = _supabase
        .channel('worker-notifs')
        .onPostgresChanges(
          event: sb.PostgresChangeEvent.insert,
          schema: 'public',
          table: 'auditoria',
          callback: (payload) {
            final row = payload.newRecord;
            final uid = row['usuarioUid'] as String?;
            final entidad = row['entidad'] as String?;
            if (uid != null &&
                _workerUids.contains(uid) &&
                (entidad == 'producto' || entidad == 'venta')) {
              _onWorkerAction(row);
            }
          },
        )
        .subscribe();
  }

  void _onWorkerAction(Map<String, dynamic> row) {
    if (!mounted) return;
    final notif = _WorkerNotif(
      id: row['id'] as String? ?? DateTime.now().toIso8601String(),
      accion: row['accion'] as String? ?? '',
      entidad: row['entidad'] as String? ?? '',
      entidadNombre: row['entidadNombre'] as String?,
      usuarioEmail: row['usuarioEmail'] as String?,
      realizadoEn: row['realizadoEn'] as String? ??
          DateTime.now().toIso8601String(),
    );
    setState(() {
      _workerNotifs.insert(0, notif);
      if (_workerNotifs.length > 50) _workerNotifs.removeLast();
    });
    final label = notif.entidad == 'producto' ? 'Producto' : 'Venta';
    final nombre =
        notif.entidadNombre != null ? ': ${notif.entidadNombre}' : '';
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('✏️ Trabajador ${notif.accion} un $label$nombre'),
        backgroundColor: AppColors.black,
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 5),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(10),
          side: BorderSide(color: AppColors.gold.withValues(alpha: 0.5)),
        ),
      ),
    );
  }

  void _markAllNotifsRead() {
    setState(() {
      for (var i = 0; i < _workerNotifs.length; i++) {
        _workerNotifs[i] = _workerNotifs[i].markRead();
      }
    });
  }

  void _showNotifSheet() {
    _markAllNotifsRead();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _WorkerNotifsSheet(notifs: List.unmodifiable(_workerNotifs)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final displayName = ref.watch(userDisplayNameProvider).valueOrNull ?? '';
    final roleAsync = ref.watch(userRoleProvider);
    final role = roleAsync.valueOrNull ?? 'admin';
    final kpisAsync = ref.watch(adminKpisProvider);
    final ordersAsync = ref.watch(adminRecentOrdersProvider);
    final allOrdersAsync = ref.watch(adminAllOrdersProvider);
    final chartAsync = ref.watch(adminChartProvider);
    final auditAsync = ref.watch(adminAuditProvider);

    return BackNavigationScope(
      fallbackRoute: '/home',
      child: Scaffold(
        backgroundColor: AppColors.beige,
        body: NestedScrollView(
          headerSliverBuilder: (ctx, _) => [
            SliverAppBar(
              expandedHeight: 140,
              pinned: true,
              backgroundColor: AppColors.black,
              automaticallyImplyLeading: false,
              flexibleSpace: FlexibleSpaceBar(
                background: Container(
                  color: AppColors.black,
                  child: SafeArea(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(20, 12, 20, 12),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          const CVLogo(size: 48),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  _greetingWithName(
                                    displayName.isEmpty ? null : displayName,
                                  ),
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 16,
                                    fontWeight: FontWeight.w700,
                                    letterSpacing: 0.3,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const SizedBox(height: 3),
                                Text(
                                  _todayLabel(),
                                  style: const TextStyle(
                                    color: Colors.white54,
                                    fontSize: 11,
                                  ),
                                ),
                                const SizedBox(height: 5),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 3,
                                  ),
                                  decoration: BoxDecoration(
                                    color: AppColors.gold.withValues(alpha: 0.15),
                                    borderRadius: BorderRadius.circular(20),
                                    border: Border.all(
                                      color: AppColors.gold.withValues(alpha: 0.4),
                                    ),
                                  ),
                                  child: Text(
                                    role == 'trabajador'
                                        ? 'TRABAJADOR'
                                        : 'ADMINISTRADOR',
                                    style: const TextStyle(
                                      color: AppColors.gold,
                                      fontSize: 10,
                                      fontWeight: FontWeight.w700,
                                      letterSpacing: 1.2,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Stack(
                            alignment: Alignment.center,
                            children: [
                              IconButton(
                                icon: const Icon(
                                  Icons.notifications_outlined,
                                  color: Colors.white70,
                                ),
                                tooltip: 'Actividad de trabajadores',
                                onPressed: _showNotifSheet,
                              ),
                              if (_unreadCount > 0)
                                Positioned(
                                  right: 6,
                                  top: 6,
                                  child: Container(
                                    width: 16,
                                    height: 16,
                                    decoration: const BoxDecoration(
                                      color: Color(0xFFB91C1C),
                                      shape: BoxShape.circle,
                                    ),
                                    child: Center(
                                      child: Text(
                                        _unreadCount > 9
                                            ? '9+'
                                            : '$_unreadCount',
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontSize: 9,
                                          fontWeight: FontWeight.w800,
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                            ],
                          ),
                          IconButton(
                            icon: const Icon(
                              Icons.storefront_outlined,
                              color: Colors.white70,
                            ),
                            tooltip: 'Ver tienda',
                            onPressed: () => context.go('/home'),
                          ),
                          IconButton(
                            icon: const Icon(
                              Icons.logout_rounded,
                              color: Colors.white54,
                            ),
                            tooltip: 'Cerrar sesión',
                            onPressed: () async {
                              await ref
                                  .read(authNotifierProvider.notifier)
                                  .signOut();
                              if (context.mounted) context.go('/login');
                            },
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
              bottom: TabBar(
                controller: _tabController,
                indicatorColor: AppColors.gold,
                indicatorWeight: 2,
                labelColor: AppColors.gold,
                unselectedLabelColor: Colors.white54,
                labelStyle: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
                unselectedLabelStyle: const TextStyle(fontSize: 13),
                tabs: const [
                  Tab(text: 'Inicio'),
                  Tab(text: 'Dashboard'),
                ],
              ),
            ),
          ],
          body: TabBarView(
            controller: _tabController,
            children: [
              // ── Tab Inicio ────────────────────────────────────────────────
              RefreshIndicator(
                color: AppColors.gold,
                onRefresh: () async => _invalidateAll(),
                child: CustomScrollView(
                  slivers: [
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
                        child: kpisAsync.when(
                          loading: () => _KpiShimmer(),
                          error: (_, _) => const SizedBox.shrink(),
                          data: (kpis) => Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const _SectionTitle('Resumen del negocio'),
                              const SizedBox(height: 12),
                              GridView.count(
                                crossAxisCount: 2,
                                shrinkWrap: true,
                                physics: const NeverScrollableScrollPhysics(),
                                crossAxisSpacing: 12,
                                mainAxisSpacing: 12,
                                childAspectRatio: 1.5,
                                children: [
                                  _KpiCard(
                                    label: 'Productos',
                                    value: kpis['productos'].toString(),
                                    icon: Icons.inventory_2_outlined,
                                    color: AppColors.gold,
                                    delay: 0,
                                  ),
                                  _KpiCard(
                                    label: 'Pedidos web',
                                    value: kpis['pedidos'].toString(),
                                    icon: Icons.receipt_long_outlined,
                                    color: const Color(0xFF10B981),
                                    delay: 100,
                                  ),
                                  _KpiCard(
                                    label: 'Usuarios',
                                    value: kpis['usuarios'].toString(),
                                    icon: Icons.people_outline_rounded,
                                    color: const Color(0xFF6366F1),
                                    delay: 200,
                                  ),
                                  _KpiCard(
                                    label: 'Pendientes',
                                    value: kpis['pendientes'].toString(),
                                    icon: Icons.pending_actions_outlined,
                                    color: const Color(0xFFF59E0B),
                                    delay: 300,
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(16, 24, 16, 80),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const _SectionTitle('Módulos'),
                            const SizedBox(height: 12),
                            GridView.count(
                              crossAxisCount: 3,
                              shrinkWrap: true,
                              physics: const NeverScrollableScrollPhysics(),
                              crossAxisSpacing: 10,
                              mainAxisSpacing: 10,
                              childAspectRatio: 1.0,
                              children: [
                                _ModuleCard(
                                  icon: Icons.inventory_2_outlined,
                                  label: 'Productos',
                                  color: AppColors.gold,
                                  onTap: () => context.push('/admin/productos'),
                                  delay: 0,
                                ),
                                _ModuleCard(
                                  icon: Icons.receipt_long_outlined,
                                  label: 'Pedidos',
                                  color: const Color(0xFF10B981),
                                  onTap: () => context.push('/admin/pedidos'),
                                  delay: 60,
                                ),
                                _ModuleCard(
                                  icon: Icons.point_of_sale_outlined,
                                  label: 'Ventas',
                                  color: const Color(0xFF0EA5E9),
                                  onTap: () => context.push('/admin/ventas'),
                                  delay: 120,
                                ),
                                _ModuleCard(
                                  icon: Icons.people_alt_outlined,
                                  label: 'Usuarios',
                                  color: const Color(0xFF6366F1),
                                  onTap: () => context.push('/admin/usuarios'),
                                  delay: 180,
                                ),
                                _ModuleCard(
                                  icon: Icons.factory_outlined,
                                  label: 'Fabricantes',
                                  color: const Color(0xFFF59E0B),
                                  onTap: () =>
                                      context.push('/admin/fabricantes'),
                                  delay: 240,
                                ),
                                _ModuleCard(
                                  icon: Icons.insights_rounded,
                                  label: 'Predicciones',
                                  color: const Color(0xFFEC4899),
                                  onTap: () =>
                                      context.push('/admin/predicciones'),
                                  delay: 300,
                                ),
                                _ModuleCard(
                                  icon: Icons.table_chart_outlined,
                                  label: 'Datos',
                                  color: const Color(0xFF06B6D4),
                                  onTap: () => context.push('/admin/datos'),
                                  delay: 360,
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // ── Tab Dashboard ─────────────────────────────────────────────
              RefreshIndicator(
                color: AppColors.gold,
                onRefresh: () async => _invalidateAll(),
                child: CustomScrollView(
                  slivers: [
                    // Panel ejecutivo
                    SliverToBoxAdapter(
                      child: kpisAsync.when(
                        loading: () => const SizedBox.shrink(),
                        error: (_, _) => const SizedBox.shrink(),
                        data: (kpis) => _ExecutiveBand(
                          kpis: kpis,
                          onPredictions: () =>
                              context.push('/admin/predicciones'),
                          onData: () => context.push('/admin/datos'),
                          onSales: () => context.push('/admin/ventas'),
                        ),
                      ),
                    ),

                    // Canal: Tienda web
                    SliverToBoxAdapter(
                      child: chartAsync.when(
                        loading: () => const _ChartShimmer(),
                        error: (_, _) => const SizedBox.shrink(),
                        data: (chart) => _ChannelPanel(
                          isWeb: true,
                          total7Days: chart.totalWeb,
                          todaySales: chart.todayWeb,
                          values: chart.web,
                          labels: chart.labels,
                          pendientes: kpisAsync.valueOrNull?['pendientes']
                                  as int? ??
                              0,
                          onPendingsTap: () => context.push('/admin/pedidos'),
                        ),
                      ),
                    ),

                    // Canal: Tienda física
                    SliverToBoxAdapter(
                      child: chartAsync.when(
                        loading: () => const _ChartShimmer(),
                        error: (_, _) => const SizedBox.shrink(),
                        data: (chart) => _ChannelPanel(
                          isWeb: false,
                          total7Days: chart.totalTienda,
                          todaySales: chart.todayTienda,
                          values: chart.tienda,
                          labels: chart.labels,
                          pendientes: 0,
                          onPendingsTap: null,
                        ),
                      ),
                    ),

                    // Pedidos recientes
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(16, 24, 16, 12),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const _SectionTitle('Pedidos recientes'),
                            GestureDetector(
                              onTap: () => context.push('/admin/pedidos'),
                              child: const Text(
                                'Ver todos',
                                style: TextStyle(
                                  color: AppColors.gold,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    ordersAsync.when(
                      loading: () => const SliverToBoxAdapter(
                        child: Padding(
                          padding: EdgeInsets.all(16),
                          child: Center(
                            child: CircularProgressIndicator(
                              color: AppColors.gold,
                            ),
                          ),
                        ),
                      ),
                      error: (_, _) =>
                          const SliverToBoxAdapter(child: SizedBox.shrink()),
                      data: (orders) => SliverPadding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        sliver: SliverList(
                          delegate: SliverChildBuilderDelegate(
                            (ctx, i) => _OrderRow(
                              order: orders[i],
                              index: i,
                              onTap: () => _showOrderDetail(orders[i]),
                            ),
                            childCount: orders.length,
                          ),
                        ),
                      ),
                    ),

                    // Estado de pedidos
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(16, 24, 16, 12),
                        child: const _SectionTitle('Estado de pedidos'),
                      ),
                    ),
                    SliverToBoxAdapter(
                      child: allOrdersAsync.when(
                        loading: () => const Padding(
                          padding: EdgeInsets.all(16),
                          child: Center(
                            child: CircularProgressIndicator(
                              color: AppColors.gold,
                            ),
                          ),
                        ),
                        error: (_, _) => const SizedBox.shrink(),
                        data: (orders) => _OrderStatusSummary(orders: orders),
                      ),
                    ),

                    // Historial de auditoría ISO 9001
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(16, 24, 16, 4),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const _SectionTitle('Trazabilidad ISO 9001'),
                            const SizedBox(height: 4),
                            const Text(
                              'Actividad reciente',
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w700,
                                color: AppColors.textPrimary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    SliverToBoxAdapter(
                      child: auditAsync.when(
                        loading: () => const Padding(
                          padding: EdgeInsets.all(16),
                          child: Center(
                            child: CircularProgressIndicator(
                              color: AppColors.gold,
                            ),
                          ),
                        ),
                        error: (_, _) => const Padding(
                          padding: EdgeInsets.fromLTRB(16, 0, 16, 100),
                          child: Text(
                            'No se pudo cargar el historial de actividad.',
                            style: TextStyle(
                              color: AppColors.textSecondary,
                              fontSize: 13,
                            ),
                          ),
                        ),
                        data: (entries) => _AuditLog(entries: entries),
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

  String _todayLabel() {
    final now = DateTime.now();
    const weekdays = [
      'lunes',
      'martes',
      'miércoles',
      'jueves',
      'viernes',
      'sábado',
      'domingo',
    ];
    const months = [
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre',
    ];
    final weekday = weekdays[now.weekday - 1];
    final month = months[now.month - 1];
    return '${weekday[0].toUpperCase()}${weekday.substring(1)}, ${now.day} de $month de ${now.year}';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Panel ejecutivo con shortcuts
// ─────────────────────────────────────────────────────────────────────────────

class _ExecutiveBand extends StatelessWidget {
  const _ExecutiveBand({
    required this.kpis,
    required this.onPredictions,
    required this.onData,
    required this.onSales,
  });

  final Map<String, dynamic> kpis;
  final VoidCallback onPredictions;
  final VoidCallback onData;
  final VoidCallback onSales;

  @override
  Widget build(BuildContext context) {
    final ingresosWeb = (kpis['ingresosWeb'] as double?) ?? 0;
    final ingresosTienda = (kpis['ingresosTienda'] as double?) ?? 0;
    final pendientes = (kpis['pendientes'] as int?) ?? 0;

    return Container(
          margin: const EdgeInsets.fromLTRB(16, 20, 16, 0),
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF0D0D0D), Color(0xFF1C1C1C)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'OPERACIÓN OMNICANAL',
                style: TextStyle(
                  color: AppColors.gold,
                  fontSize: 9,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1.5,
                ),
              ),
              const SizedBox(height: 6),
              const Text(
                'Ventas, inventario, pedidos y predicción en una sola vista',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  height: 1.3,
                ),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _MetricPill(
                    Icons.language_rounded,
                    'Web: ${_formatCurrency(ingresosWeb)}',
                    const Color(0xFF6366F1),
                  ),
                  _MetricPill(
                    Icons.store_rounded,
                    'Física: ${_formatCurrency(ingresosTienda)}',
                    AppColors.gold,
                  ),
                  _MetricPill(
                    Icons.warning_amber_rounded,
                    'Pendientes: $pendientes',
                    AppColors.warning,
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: _ExecutiveAction(
                      icon: Icons.insights_outlined,
                      label: 'Predicciones IA',
                      color: const Color(0xFFEC4899),
                      onTap: onPredictions,
                      isPrimary: true,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _ExecutiveAction(
                      icon: Icons.table_chart_outlined,
                      label: 'Datos Excel',
                      color: Colors.white70,
                      onTap: onData,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _ExecutiveAction(
                      icon: Icons.point_of_sale_outlined,
                      label: 'Registrar venta',
                      color: Colors.white70,
                      onTap: onSales,
                    ),
                  ),
                ],
              ),
            ],
          ),
        )
        .animate()
        .fadeIn(duration: 400.ms)
        .slideY(begin: 0.15, curve: Curves.easeOut);
  }
}

class _MetricPill extends StatelessWidget {
  const _MetricPill(this.icon, this.text, this.color);
  final IconData icon;
  final String text;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.35)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: color),
          const SizedBox(width: 5),
          Text(
            text,
            style: TextStyle(
              color: color,
              fontSize: 11,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _ExecutiveAction extends StatelessWidget {
  const _ExecutiveAction({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
    this.isPrimary = false,
  });
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;
  final bool isPrimary;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
        decoration: BoxDecoration(
          color: isPrimary
              ? const Color(0xFFEC4899).withValues(alpha: 0.15)
              : Colors.white.withValues(alpha: 0.07),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: color.withValues(alpha: isPrimary ? 0.4 : 0.2),
          ),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: color, size: 18),
            const SizedBox(height: 4),
            Text(
              label,
              textAlign: TextAlign.center,
              style: TextStyle(
                color: color,
                fontSize: 10,
                fontWeight: FontWeight.w600,
                height: 1.2,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Panel por canal (web / tienda física) con métricas y gráfico
// ─────────────────────────────────────────────────────────────────────────────

class _ChannelPanel extends StatelessWidget {
  const _ChannelPanel({
    required this.isWeb,
    required this.total7Days,
    required this.todaySales,
    required this.values,
    required this.labels,
    required this.pendientes,
    required this.onPendingsTap,
  });

  final bool isWeb;
  final double total7Days;
  final double todaySales;
  final List<double> values;
  final List<String> labels;
  final int pendientes;
  final VoidCallback? onPendingsTap;

  @override
  Widget build(BuildContext context) {
    final channelColor = isWeb ? const Color(0xFF6366F1) : AppColors.gold;
    final title = isWeb ? 'Tienda web' : 'Tienda física';
    final subtitle = isWeb
        ? 'Pedidos online (pagado, enviado o entregado)'
        : 'Ventas registradas en Admin → Ventas';

    return Container(
          margin: const EdgeInsets.fromLTRB(16, 20, 16, 0),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: channelColor.withValues(alpha: 0.15)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 12,
                offset: const Offset(0, 4),
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
                      color: channelColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(
                      isWeb ? Icons.language_rounded : Icons.store_rounded,
                      color: channelColor,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        Text(
                          subtitle,
                          style: const TextStyle(
                            fontSize: 11,
                            color: AppColors.textSecondary,
                          ),
                          maxLines: 2,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: _ChannelMetric(
                      '7 días',
                      _formatCurrency(total7Days),
                      channelColor,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _ChannelMetric(
                      'Hoy',
                      _formatCurrency(todaySales),
                      channelColor,
                    ),
                  ),
                  if (isWeb && onPendingsTap != null) ...[
                    const SizedBox(width: 10),
                    Expanded(
                      child: GestureDetector(
                        onTap: onPendingsTap,
                        child: _ChannelMetric(
                          'Pendientes',
                          pendientes.toString(),
                          pendientes > 0
                              ? AppColors.warning
                              : AppColors.textSecondary,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
              const SizedBox(height: 16),
              Text(
                'Últimos 7 días',
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textSecondary,
                ),
              ),
              const SizedBox(height: 8),
              SizedBox(
                height: 160,
                child: _SalesBarChart(
                  values: values,
                  labels: labels,
                  color: channelColor,
                ),
              ),
            ],
          ),
        )
        .animate()
        .fadeIn(duration: 400.ms)
        .slideY(begin: 0.12, curve: Curves.easeOut);
  }
}

class _ChannelMetric extends StatelessWidget {
  const _ChannelMetric(this.label, this.value, this.color);
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.07),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              color: AppColors.textSecondary,
              fontSize: 10,
            ),
          ),
          const SizedBox(height: 3),
          Text(
            value,
            style: const TextStyle(
              fontWeight: FontWeight.w700,
              fontSize: 13,
              color: AppColors.textPrimary,
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Gráfico de barras (últimos 7 días)
// ─────────────────────────────────────────────────────────────────────────────

class _SalesBarChart extends StatelessWidget {
  const _SalesBarChart({
    required this.values,
    required this.labels,
    required this.color,
  });
  final List<double> values;
  final List<String> labels;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final hasData = values.any((v) => v > 0);
    if (!hasData) {
      return const Center(
        child: Text(
          'Sin ventas en los últimos 7 días',
          style: TextStyle(color: AppColors.textSecondary, fontSize: 12),
        ),
      );
    }

    final scaleMax = _chartScaleMax(values);

    return BarChart(
      BarChartData(
        alignment: BarChartAlignment.spaceAround,
        maxY: scaleMax,
        minY: 0,
        barTouchData: BarTouchData(
          enabled: true,
          touchTooltipData: BarTouchTooltipData(
            getTooltipColor: (_) => Colors.black87,
            tooltipRoundedRadius: 8,
            getTooltipItem: (group, _, rod, _) => BarTooltipItem(
              '${labels[group.x]}\n',
              const TextStyle(color: Colors.white70, fontSize: 10),
              children: [
                TextSpan(
                  text: _formatCurrencyShort(rod.toY),
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
        ),
        titlesData: FlTitlesData(
          show: true,
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 24,
              getTitlesWidget: (value, _) {
                final i = value.toInt();
                if (i < 0 || i >= labels.length) return const SizedBox.shrink();
                return Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(
                    labels[i],
                    style: const TextStyle(
                      fontSize: 9,
                      color: AppColors.textSecondary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                );
              },
            ),
          ),
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 44,
              getTitlesWidget: (value, meta) {
                if (value == meta.min || value <= 0) {
                  return const SizedBox.shrink();
                }
                return Text(
                  _formatCurrencyShort(value),
                  style: const TextStyle(
                    fontSize: 8,
                    color: AppColors.textSecondary,
                  ),
                );
              },
            ),
          ),
          topTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
          rightTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
        ),
        borderData: FlBorderData(show: false),
        gridData: FlGridData(
          show: true,
          drawVerticalLine: false,
          getDrawingHorizontalLine: (_) => FlLine(
            color: AppColors.textSecondary.withValues(alpha: 0.1),
            strokeWidth: 1,
          ),
        ),
        barGroups: List.generate(values.length, (i) {
          return BarChartGroupData(
            x: i,
            barRods: [
              BarChartRodData(
                toY: values[i],
                color: color,
                width: 20,
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(5),
                ),
                backDrawRodData: BackgroundBarChartRodData(
                  show: true,
                  toY: scaleMax,
                  color: color.withValues(alpha: 0.07),
                ),
              ),
            ],
          );
        }),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Resumen visual de estados de pedidos
// ─────────────────────────────────────────────────────────────────────────────

class _OrderStatusSummary extends StatelessWidget {
  const _OrderStatusSummary({required this.orders});
  final List<Map<String, dynamic>> orders;

  @override
  Widget build(BuildContext context) {
    const statuses = ['pendiente', 'pagado', 'enviado', 'entregado', 'cancelado'];
    final total = orders.isEmpty ? 1 : orders.length;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          ...statuses.map((status) {
            final count = orders.where((o) => o['estado'] == status).length;
            final pct = count / total;
            return Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Row(
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    margin: const EdgeInsets.only(right: 8),
                    decoration: BoxDecoration(
                      color: _statusColor(status),
                      shape: BoxShape.circle,
                    ),
                  ),
                  SizedBox(
                    width: 72,
                    child: Text(
                      _statusLabel(status),
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ),
                  Expanded(
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: pct,
                        backgroundColor: _statusColor(status).withValues(
                          alpha: 0.1,
                        ),
                        valueColor: AlwaysStoppedAnimation(_statusColor(status)),
                        minHeight: 8,
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  SizedBox(
                    width: 28,
                    child: Text(
                      '$count',
                      textAlign: TextAlign.right,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ),
                ],
              ),
            );
          }),
          const Divider(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Total registrados',
                style: TextStyle(color: AppColors.textSecondary, fontSize: 12),
              ),
              Text(
                '${orders.length} pedidos',
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 13,
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal de detalle de pedido
// ─────────────────────────────────────────────────────────────────────────────

class _OrderDetailSheet extends StatelessWidget {
  const _OrderDetailSheet({required this.order});
  final Map<String, dynamic> order;

  @override
  Widget build(BuildContext context) {
    final estado = order['estado'] as String? ?? 'pendiente';
    final total = (order['total'] as num?)?.toDouble() ?? 0.0;
    final subtotal = (order['subtotal'] as num?)?.toDouble() ?? 0.0;
    final envio = (order['envio'] as num?)?.toDouble() ?? 0.0;
    final email = order['userEmail'] as String? ?? '';
    final creadoEn = order['creadoEn'] as String? ?? '';
    final fechaCorta = creadoEn.length >= 10 ? creadoEn.substring(0, 10) : creadoEn;
    final rawId = order['id'] as String? ?? '';
    final orderId = rawId.length > 8
        ? rawId.substring(rawId.length - 8).toUpperCase()
        : rawId.toUpperCase();

    final direccionRaw = order['direccion'];
    Map<String, dynamic>? direccion;
    if (direccionRaw is Map) {
      direccion = Map<String, dynamic>.from(direccionRaw);
    }

    final itemsRaw = order['items'];
    final List<Map<String, dynamic>> items = itemsRaw is List
        ? itemsRaw
              .map((e) => Map<String, dynamic>.from(e as Map))
              .toList()
        : [];

    return DraggableScrollableSheet(
      initialChildSize: 0.75,
      maxChildSize: 0.95,
      minChildSize: 0.3,
      builder: (context, scrollController) {
        return Container(
          decoration: const BoxDecoration(
            color: AppColors.beige,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            children: [
              // Drag handle
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.textSecondary.withValues(alpha: 0.3),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              // Header
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 12, 0),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Detalle del Pedido',
                            style: TextStyle(
                              color: AppColors.textSecondary,
                              fontSize: 11,
                            ),
                          ),
                          Text(
                            '#$orderId',
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w800,
                              color: AppColors.textPrimary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: _statusColor(estado).withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        _statusLabel(estado).toUpperCase(),
                        style: TextStyle(
                          color: _statusColor(estado),
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    const SizedBox(width: 4),
                    IconButton(
                      icon: const Icon(Icons.close, size: 20),
                      onPressed: () => Navigator.of(context).pop(),
                    ),
                  ],
                ),
              ),
              const Divider(height: 16),
              Expanded(
                child: ListView(
                  controller: scrollController,
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 32),
                  children: [
                    // Cliente
                    _SheetSection(
                      title: 'Cliente',
                      children: [
                        _InfoRow(Icons.calendar_today_outlined, fechaCorta),
                        _InfoRow(Icons.email_outlined, _maskEmail(email)),
                        if (direccion?['telefono'] != null)
                          _InfoRow(
                            Icons.phone_outlined,
                            direccion!['telefono'].toString(),
                          ),
                        if (direccion != null)
                          _InfoRow(
                            Icons.location_on_outlined,
                            [
                              '${direccion['nombre'] ?? ''} ${direccion['apellido'] ?? ''}'.trim(),
                              direccion['direccion']?.toString() ?? '',
                              '${direccion['distrito'] ?? ''}, ${direccion['ciudad'] ?? ''}',
                            ].where((s) => s.isNotEmpty).join(' — '),
                          ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    // Productos
                    _SheetSection(
                      title: 'Productos (${items.length})',
                      children: items.map((item) {
                        final product =
                            item['product'] as Map<String, dynamic>? ??
                            item['producto'] as Map<String, dynamic>? ??
                            {};
                        final nombre =
                            product['nombre'] as String? ?? 'Producto';
                        final precio =
                            (product['precio'] as num?)?.toDouble() ?? 0.0;
                        final qty = (item['quantity'] as num?)?.toInt() ?? 1;
                        final color = item['color'] as String?;
                        final talla = item['talla'] as String?;

                        return Padding(
                          padding: const EdgeInsets.symmetric(vertical: 6),
                          child: Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      nombre,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w600,
                                        fontSize: 13,
                                      ),
                                    ),
                                    if (color != null || talla != null)
                                      Text(
                                        [
                                          if (color != null) 'Color: $color',
                                          if (talla != null) 'Talla: $talla',
                                        ].join(' · '),
                                        style: const TextStyle(
                                          color: AppColors.textSecondary,
                                          fontSize: 11,
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Text(
                                    '×$qty',
                                    style: const TextStyle(
                                      color: AppColors.textSecondary,
                                      fontSize: 12,
                                    ),
                                  ),
                                  Text(
                                    _formatCurrency(precio * qty),
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w700,
                                      fontSize: 13,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 12),
                    // Totales
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Column(
                        children: [
                          _TotalRow('Subtotal', subtotal),
                          _TotalRow(
                            'Envío',
                            envio,
                            freeLabel: envio <= 0,
                          ),
                          const Divider(height: 16),
                          _TotalRow('Total', total, isBold: true),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _SheetSection extends StatelessWidget {
  const _SheetSection({required this.title, required this.children});
  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title.toUpperCase(),
            style: const TextStyle(
              color: AppColors.textSecondary,
              fontSize: 10,
              fontWeight: FontWeight.w700,
              letterSpacing: 1.2,
            ),
          ),
          const SizedBox(height: 10),
          ...children,
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow(this.icon, this.text);
  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 1),
            child: Icon(icon, size: 14, color: AppColors.textSecondary),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(
                fontSize: 13,
                color: AppColors.textPrimary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _TotalRow extends StatelessWidget {
  const _TotalRow(
    this.label,
    this.amount, {
    this.freeLabel = false,
    this.isBold = false,
  });
  final String label;
  final double amount;
  final bool freeLabel;
  final bool isBold;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: isBold ? 15 : 13,
              fontWeight: isBold ? FontWeight.w700 : FontWeight.normal,
              color: AppColors.textPrimary,
            ),
          ),
          Text(
            freeLabel ? 'Gratis' : _formatCurrency(amount),
            style: TextStyle(
              fontSize: isBold ? 15 : 13,
              fontWeight: isBold ? FontWeight.w800 : FontWeight.w600,
              color: isBold ? AppColors.gold : AppColors.textPrimary,
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Historial de auditoría ISO 9001
// ─────────────────────────────────────────────────────────────────────────────

class _AuditLog extends StatelessWidget {
  const _AuditLog({required this.entries});
  final List<Map<String, dynamic>> entries;

  Color _actionColor(String action) {
    switch (action) {
      case 'crear':
        return const Color(0xFF10B981);
      case 'editar':
        return const Color(0xFF6366F1);
      case 'eliminar':
        return AppColors.error;
      case 'cambiar_estado':
        return AppColors.warning;
      case 'importar':
        return const Color(0xFF0EA5E9);
      default:
        return AppColors.textSecondary;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (entries.isEmpty) {
      return const Padding(
        padding: EdgeInsets.fromLTRB(16, 0, 16, 100),
        child: Text(
          'Sin actividad registrada aún.',
          style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 100),
      child: Column(
        children: entries.map((entry) {
          final accion = entry['accion'] as String? ?? '—';
          final entidad = entry['entidad'] as String? ?? '—';
          final entidadNombre = entry['entidadNombre'] as String? ?? '—';
          final usuarioEmail = entry['usuarioEmail'] as String?;
          final realizadoEn = entry['realizadoEn'] as String?;

          String fechaStr = '—';
          if (realizadoEn != null) {
            try {
              final fecha = DateTime.parse(realizadoEn).toLocal();
              final d = fecha.day.toString().padLeft(2, '0');
              final mo = fecha.month.toString().padLeft(2, '0');
              final h = fecha.hour.toString().padLeft(2, '0');
              final mi = fecha.minute.toString().padLeft(2, '0');
              fechaStr = '$d/$mo/${fecha.year} $h:$mi';
            } catch (_) {
              fechaStr = realizadoEn.length > 16
                  ? realizadoEn.substring(0, 16)
                  : realizadoEn;
            }
          }

          return Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.03),
                  blurRadius: 6,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: _actionColor(accion).withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    accion.toUpperCase(),
                    style: TextStyle(
                      color: _actionColor(accion),
                      fontSize: 9,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.8,
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '$entidad · $entidadNombre',
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textPrimary,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (usuarioEmail != null)
                        Text(
                          _maskEmail(usuarioEmail),
                          style: const TextStyle(
                            fontSize: 11,
                            color: AppColors.textSecondary,
                          ),
                        ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  fechaStr,
                  style: const TextStyle(
                    fontSize: 10,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Widgets auxiliares
// ─────────────────────────────────────────────────────────────────────────────

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.text);
  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text.toUpperCase(),
      style: const TextStyle(
        color: AppColors.textSecondary,
        fontSize: 11,
        fontWeight: FontWeight.w700,
        letterSpacing: 1.2,
      ),
    );
  }
}

class _KpiCard extends StatelessWidget {
  const _KpiCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
    required this.delay,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color color;
  final int delay;

  @override
  Widget build(BuildContext context) {
    return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.05),
                blurRadius: 10,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: color, size: 20),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    value,
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textPrimary,
                      height: 1,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    label,
                    style: const TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
            ],
          ),
        )
        .animate(delay: Duration(milliseconds: delay))
        .fadeIn(duration: 400.ms)
        .slideY(begin: 0.2, curve: Curves.easeOut);
  }
}

class _ModuleCard extends StatelessWidget {
  const _ModuleCard({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
    required this.delay,
  });

  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;
  final int delay;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: color.withValues(alpha: 0.25)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.04),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(icon, color: color, size: 22),
                ),
                const SizedBox(height: 8),
                Text(
                  label,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                    height: 1.2,
                  ),
                ),
              ],
            ),
          ),
        )
        .animate(delay: Duration(milliseconds: delay))
        .fadeIn(duration: 350.ms)
        .scale(begin: const Offset(0.88, 0.88), curve: Curves.easeOut);
  }
}

class _OrderRow extends StatelessWidget {
  const _OrderRow({
    required this.order,
    required this.index,
    required this.onTap,
  });
  final Map<String, dynamic> order;
  final int index;
  final VoidCallback onTap;

  Color _statusColor(String status) {
    switch (status) {
      case 'completado':
      case 'entregado':
        return const Color(0xFF10B981);
      case 'pagado':
        return const Color(0xFF3B82F6);
      case 'enviado':
        return const Color(0xFF8B5CF6);
      case 'cancelado':
        return AppColors.error;
      default:
        return const Color(0xFFF59E0B);
    }
  }

  @override
  Widget build(BuildContext context) {
    final estado = order['estado'] as String? ?? 'pendiente';
    final total = (order['total'] as num?)?.toDouble() ?? 0.0;
    final email = order['userEmail'] as String?;
    final fecha = order['creadoEn'] as String? ?? '';
    final fechaCorta = fecha.length >= 10 ? fecha.substring(0, 10) : fecha;

    return GestureDetector(
          onTap: onTap,
          child: Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
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
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: AppColors.gold.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(
                    Icons.receipt_outlined,
                    color: AppColors.gold,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        email != null ? _maskEmail(email) : 'Cliente',
                        style: const TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 13,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        fechaCorta,
                        style: const TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 11,
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
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 14,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 3,
                      ),
                      decoration: BoxDecoration(
                        color: _statusColor(estado).withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        estado.toUpperCase(),
                        style: TextStyle(
                          color: _statusColor(estado),
                          fontSize: 9,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.8,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(width: 4),
                Icon(
                  Icons.chevron_right,
                  size: 16,
                  color: AppColors.textSecondary.withValues(alpha: 0.5),
                ),
              ],
            ),
          ),
        )
        .animate(delay: Duration(milliseconds: index * 50))
        .fadeIn(duration: 300.ms)
        .slideX(begin: 0.05, curve: Curves.easeOut);
  }
}

class _KpiShimmer extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 12,
      mainAxisSpacing: 12,
      childAspectRatio: 1.5,
      children: List.generate(
        4,
        (_) => Container(
          decoration: BoxDecoration(
            color: AppColors.shimmerBase,
            borderRadius: BorderRadius.circular(16),
          ),
        ),
      ),
    );
  }
}

class _ChartShimmer extends StatelessWidget {
  const _ChartShimmer();

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 20, 16, 0),
      height: 240,
      decoration: BoxDecoration(
        color: AppColors.shimmerBase,
        borderRadius: BorderRadius.circular(20),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sheet de notificaciones de trabajadores
// ─────────────────────────────────────────────────────────────────────────────

class _WorkerNotifsSheet extends StatelessWidget {
  const _WorkerNotifsSheet({required this.notifs});
  final List<_WorkerNotif> notifs;

  static String _relTime(String iso) {
    final diff =
        DateTime.now().difference(DateTime.tryParse(iso) ?? DateTime.now());
    if (diff.inMinutes < 1) return 'ahora';
    if (diff.inMinutes < 60) return 'hace ${diff.inMinutes} min';
    if (diff.inHours < 24) return 'hace ${diff.inHours}h';
    return 'hace ${diff.inDays}d';
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.55,
      maxChildSize: 0.9,
      minChildSize: 0.3,
      builder: (context, scrollController) {
        return Container(
          decoration: const BoxDecoration(
            color: AppColors.beige,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            children: [
              // Drag handle
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.textSecondary.withValues(alpha: 0.3),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              // Header
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
                child: Row(
                  children: [
                    const Icon(
                      Icons.notifications_outlined,
                      size: 18,
                      color: AppColors.gold,
                    ),
                    const SizedBox(width: 8),
                    const Text(
                      'ACTIVIDAD DE TRABAJADORES',
                      style: TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 1.2,
                      ),
                    ),
                    const Spacer(),
                    IconButton(
                      icon: const Icon(Icons.close, size: 18),
                      onPressed: () => Navigator.of(context).pop(),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1),
              // Lista
              Expanded(
                child: notifs.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.notifications_none_rounded,
                              size: 48,
                              color: AppColors.textSecondary.withValues(
                                alpha: 0.4,
                              ),
                            ),
                            const SizedBox(height: 12),
                            const Text(
                              'Sin actividad reciente\nde trabajadores',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                color: AppColors.textSecondary,
                                fontSize: 13,
                                height: 1.5,
                              ),
                            ),
                          ],
                        ),
                      )
                    : ListView.separated(
                        controller: scrollController,
                        padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
                        itemCount: notifs.length,
                        separatorBuilder: (_, _) =>
                            const SizedBox(height: 8),
                        itemBuilder: (_, i) =>
                            _WorkerNotifItem(notif: notifs[i]),
                      ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _WorkerNotifItem extends StatelessWidget {
  const _WorkerNotifItem({required this.notif});
  final _WorkerNotif notif;

  static Color _accionColor(String a) => switch (a) {
        'crear' => const Color(0xFF22C55E),
        'editar' => const Color(0xFF6366F1),
        'eliminar' => AppColors.error,
        'cambiar_estado' => const Color(0xFFF59E0B),
        'importar' => const Color(0xFF0EA5E9),
        _ => AppColors.textSecondary,
      };

  @override
  Widget build(BuildContext context) {
    final color = _accionColor(notif.accion);
    final isUnread = !notif.leido;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isUnread
            ? AppColors.gold.withValues(alpha: 0.06)
            : Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isUnread
              ? AppColors.gold.withValues(alpha: 0.25)
              : const Color(0xFFE5E0D8),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(6),
              border: Border.all(color: color.withValues(alpha: 0.3)),
            ),
            child: Text(
              notif.accion.toUpperCase(),
              style: TextStyle(
                color: color,
                fontSize: 9,
                fontWeight: FontWeight.w800,
                letterSpacing: 0.5,
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${notif.entidad == 'producto' ? 'Producto' : 'Venta'}: ${notif.entidadNombre ?? '—'}',
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 3),
                Text(
                  '${notif.usuarioEmail ?? 'trabajador'} · ${_WorkerNotifsSheet._relTime(notif.realizadoEn)}',
                  style: const TextStyle(
                    fontSize: 11,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
