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
// Providers de KPIs
// ─────────────────────────────────────────────────────────────────────────────

final _supabase = sb.Supabase.instance.client;

final adminKpisProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final productos = await _supabase
      .from('productos')
      .select()
      .count(sb.CountOption.exact);
  final pedidos = await _supabase
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
  return {
    'productos': productos.count,
    'pedidos': pedidos.count,
    'usuarios': usuarios.count,
    'pendientes': pendientes.count,
  };
});

final adminRecentOrdersProvider = FutureProvider<List<Map<String, dynamic>>>((
  ref,
) async {
  final data = await _supabase
      .from('pedidos')
      .select('id, estado, total, creadoEn, usuarios(nombre, email)')
      .order('creadoEn', ascending: false)
      .limit(8);
  return List<Map<String, dynamic>>.from(data as List);
});

// ─────────────────────────────────────────────────────────────────────────────
// Página principal
// ─────────────────────────────────────────────────────────────────────────────

class AdminDashboardPage extends ConsumerWidget {
  const AdminDashboardPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    final kpisAsync = ref.watch(adminKpisProvider);
    final ordersAsync = ref.watch(adminRecentOrdersProvider);

    return BackNavigationScope(
      fallbackRoute: '/home',
      child: Scaffold(
        backgroundColor: AppColors.beige,
        body: RefreshIndicator(
          color: AppColors.gold,
          onRefresh: () async {
            ref.invalidate(adminKpisProvider);
            ref.invalidate(adminRecentOrdersProvider);
          },
          child: CustomScrollView(
            slivers: [
              // ── Header negro con logo ──────────────────────────────────────
              SliverAppBar(
                expandedHeight: 160,
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
                            const CVLogo(size: 56),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  const Text(
                                    'Panel Administrativo',
                                    style: TextStyle(
                                      color: AppColors.gold,
                                      fontSize: 18,
                                      fontWeight: FontWeight.w700,
                                      letterSpacing: 0.3,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    user?.email ?? '',
                                    style: const TextStyle(
                                      color: Colors.white54,
                                      fontSize: 12,
                                    ),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  const SizedBox(height: 6),
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 8,
                                      vertical: 3,
                                    ),
                                    decoration: BoxDecoration(
                                      color: AppColors.gold.withValues(
                                        alpha: 0.15,
                                      ),
                                      borderRadius: BorderRadius.circular(20),
                                      border: Border.all(
                                        color: AppColors.gold.withValues(
                                          alpha: 0.4,
                                        ),
                                      ),
                                    ),
                                    child: const Text(
                                      'ADMINISTRADOR',
                                      style: TextStyle(
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
                            // Botón salir a la tienda
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
              ),

              // ── KPIs ──────────────────────────────────────────────────────
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
                  child: kpisAsync.when(
                    loading: () => _KpiShimmer(),
                    error: (e, s) => const SizedBox(),
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
                              label: 'Pedidos totales',
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
                              label: 'Pedidos pendientes',
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

              // ── Módulos ───────────────────────────────────────────────────
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 24, 16, 0),
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
                            onTap: () => context.push('/admin/fabricantes'),
                            delay: 240,
                          ),
                          _ModuleCard(
                            icon: Icons.insights_rounded,
                            label: 'Predicciones',
                            color: const Color(0xFFEC4899),
                            onTap: () => context.push('/admin/predicciones'),
                            delay: 300,
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),

              // ── Pedidos recientes ─────────────────────────────────────────
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 24, 16, 0),
                  child: const _SectionTitle('Pedidos recientes'),
                ),
              ),
              ordersAsync.when(
                loading: () => const SliverToBoxAdapter(
                  child: Padding(
                    padding: EdgeInsets.all(16),
                    child: Center(
                      child: CircularProgressIndicator(color: AppColors.gold),
                    ),
                  ),
                ),
                error: (e, s) => const SliverToBoxAdapter(child: SizedBox()),
                data: (orders) => SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
                  sliver: SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (ctx, i) => _OrderRow(order: orders[i], index: i),
                      childCount: orders.length,
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
  const _OrderRow({required this.order, required this.index});
  final Map<String, dynamic> order;
  final int index;

  Color _statusColor(String status) {
    switch (status) {
      case 'completado':
      case 'entregado':
        return const Color(0xFF10B981);
      case 'enviado':
        return const Color(0xFF6366F1);
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
    final usuario = order['usuarios'] as Map<String, dynamic>?;
    final nombre =
        usuario?['nombre'] as String? ??
        usuario?['email'] as String? ??
        'Cliente';
    final fecha = order['creadoEn'] as String? ?? '';
    final fechaCorta = fecha.length >= 10 ? fecha.substring(0, 10) : fecha;

    return Container(
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
                      nombre,
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
            ],
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
