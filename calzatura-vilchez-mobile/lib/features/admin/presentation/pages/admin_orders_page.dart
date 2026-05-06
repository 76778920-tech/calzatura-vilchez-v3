import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart' as sb;
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/back_navigation_scope.dart';

final _supabase = sb.Supabase.instance.client;

Future<Map<String, Map<String, dynamic>>> _fetchUsersByUid() async {
  final data = await _supabase
      .from('usuarios')
      .select('uid, nombre, nombres, apellidos, email');

  return List<Map<String, dynamic>>.from(
    data as List,
  ).fold<Map<String, Map<String, dynamic>>>({}, (acc, row) {
    final uid = row['uid']?.toString();
    if (uid != null && uid.isNotEmpty) {
      acc[uid] = row;
    }
    return acc;
  });
}

final adminOrdersProvider = FutureProvider.autoDispose<List<Map<String, dynamic>>>((
  ref,
) async {
  final ordersData = await _supabase
      .from('pedidos')
      .select(
        'id, total, subtotal, envio, estado, metodoPago, notas, creadoEn, userId, userEmail, direccion, items',
      )
      .order('creadoEn', ascending: false);
  final usersByUid = await _fetchUsersByUid();
  final orders = List<Map<String, dynamic>>.from(ordersData as List);

  return orders.map((order) {
    final merged = Map<String, dynamic>.from(order);
    merged['usuario'] =
        usersByUid[order['userId']] ?? const <String, dynamic>{};
    return merged;
  }).toList();
});

const _estados = ['pendiente', 'pagado', 'enviado', 'entregado', 'cancelado'];

class AdminOrdersPage extends ConsumerStatefulWidget {
  const AdminOrdersPage({super.key});
  @override
  ConsumerState<AdminOrdersPage> createState() => _AdminOrdersPageState();
}

class _AdminOrdersPageState extends ConsumerState<AdminOrdersPage> {
  String _estadoFilter = 'todos';

  @override
  Widget build(BuildContext context) {
    final ordersAsync = ref.watch(adminOrdersProvider);

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
          title:
              ordersAsync
                  .whenData(
                    (o) => Text(
                      'Pedidos (${o.length})',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  )
                  .valueOrNull ??
              const Text(
                'Pedidos',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
              ),
        ),
        body: ordersAsync.when(
          loading: () => const Center(
            child: CircularProgressIndicator(color: AppColors.gold),
          ),
          error: (e, _) => Center(child: Text('Error: $e')),
          data: (orders) {
            // Stats por estado
            final counts = <String, int>{};
            for (final e in _estados) {
              counts[e] = orders.where((o) => o['estado'] == e).length;
            }

            final filtered = _estadoFilter == 'todos'
                ? orders
                : orders.where((o) => o['estado'] == _estadoFilter).toList();

            return RefreshIndicator(
              color: AppColors.gold,
              onRefresh: () async => ref.invalidate(adminOrdersProvider),
              child: CustomScrollView(
                slivers: [
                  // Estado chips con conteos
                  SliverToBoxAdapter(
                    child: Container(
                      color: AppColors.black,
                      padding: const EdgeInsets.fromLTRB(12, 0, 12, 14),
                      child: SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: Row(
                          children: [
                            _EstadoChip(
                              label: 'Todos',
                              count: orders.length,
                              selected: _estadoFilter == 'todos',
                              color: Colors.white38,
                              onTap: () =>
                                  setState(() => _estadoFilter = 'todos'),
                            ),
                            ..._estados.map(
                              (e) => _EstadoChip(
                                label: e[0].toUpperCase() + e.substring(1),
                                count: counts[e] ?? 0,
                                selected: _estadoFilter == e,
                                color: _estadoColor(e),
                                onTap: () => setState(() => _estadoFilter = e),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),

                  filtered.isEmpty
                      ? const SliverFillRemaining(
                          child: Center(
                            child: Text(
                              'Sin pedidos',
                              style: TextStyle(color: AppColors.textSecondary),
                            ),
                          ),
                        )
                      : SliverPadding(
                          padding: const EdgeInsets.fromLTRB(12, 12, 12, 80),
                          sliver: SliverList(
                            delegate: SliverChildBuilderDelegate(
                              (ctx, i) => _OrderCard(
                                order: filtered[i],
                                index: i,
                                onStatusChanged: (newStatus) =>
                                    _updateStatus(filtered[i]['id'], newStatus),
                              ),
                              childCount: filtered.length,
                            ),
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

  Future<void> _updateStatus(String orderId, String newStatus) async {
    await _supabase
        .from('pedidos')
        .update({'estado': newStatus})
        .eq('id', orderId);
    ref.invalidate(adminOrdersProvider);
  }
}

Color _estadoColor(String estado) {
  switch (estado) {
    case 'entregado':
      return AppColors.success;
    case 'enviado':
      return const Color(0xFF6366F1);
    case 'pagado':
      return const Color(0xFF0EA5E9);
    case 'cancelado':
      return AppColors.error;
    default:
      return AppColors.warning;
  }
}

class _EstadoChip extends StatelessWidget {
  const _EstadoChip({
    required this.label,
    required this.count,
    required this.selected,
    required this.color,
    required this.onTap,
  });
  final String label;
  final int count;
  final bool selected;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      margin: const EdgeInsets.only(right: 8),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: selected
            ? color.withValues(alpha: 0.25)
            : Colors.white.withValues(alpha: 0.07),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: selected ? color : Colors.transparent),
      ),
      child: Row(
        children: [
          Text(
            label,
            style: TextStyle(
              color: selected ? color : Colors.white54,
              fontSize: 12,
              fontWeight: selected ? FontWeight.w700 : FontWeight.normal,
            ),
          ),
          const SizedBox(width: 4),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.3),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              '$count',
              style: TextStyle(
                color: color,
                fontSize: 10,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
        ],
      ),
    ),
  );
}

class _OrderCard extends StatefulWidget {
  const _OrderCard({
    required this.order,
    required this.index,
    required this.onStatusChanged,
  });
  final Map<String, dynamic> order;
  final int index;
  final ValueChanged<String> onStatusChanged;

  @override
  State<_OrderCard> createState() => _OrderCardState();
}

class _OrderCardState extends State<_OrderCard> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final order = widget.order;
    final estado = order['estado'] as String? ?? 'pendiente';
    final total = (order['total'] as num?)?.toDouble() ?? 0.0;
    final usuario =
        order['usuario'] as Map<String, dynamic>? ?? const <String, dynamic>{};
    final clienteNombre =
        [
          usuario['nombres']?.toString().trim() ?? '',
          usuario['apellidos']?.toString().trim() ?? '',
        ].where((part) => part.isNotEmpty).join(' ').trim().isNotEmpty
        ? [
            usuario['nombres']?.toString().trim() ?? '',
            usuario['apellidos']?.toString().trim() ?? '',
          ].where((part) => part.isNotEmpty).join(' ').trim()
        : usuario['nombre'] as String? ??
              usuario['email'] as String? ??
              order['userEmail'] as String? ??
              'Cliente';
    final clienteEmail =
        usuario['email'] as String? ?? order['userEmail'] as String? ?? '';
    final fecha = order['creadoEn'] as String? ?? '';
    final fechaCorta = fecha.length >= 10 ? fecha.substring(0, 10) : fecha;
    final shortId = (order['id'] as String? ?? '')
        .split('-')
        .first
        .toUpperCase();

    final items = order['items'];
    final itemsList = items is List
        ? List<Map<String, dynamic>>.from(items)
        : <Map<String, dynamic>>[];

    final direccion = order['direccion'];
    final dirMap = direccion is Map ? direccion : null;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
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
          // Header
          InkWell(
            borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
            onTap: () => setState(() => _expanded = !_expanded),
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Row(
                children: [
                  // ID badge
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: _estadoColor(estado).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Center(
                      child: Text(
                        shortId.substring(0, shortId.length.clamp(0, 4)),
                        style: TextStyle(
                          color: _estadoColor(estado),
                          fontSize: 9,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          clienteNombre,
                          style: const TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 13,
                            color: AppColors.textPrimary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          clienteEmail,
                          style: const TextStyle(
                            color: AppColors.textSecondary,
                            fontSize: 10,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          fechaCorta,
                          style: const TextStyle(
                            color: AppColors.textSecondary,
                            fontSize: 10,
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
                          fontWeight: FontWeight.w800,
                          fontSize: 15,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 4),
                      // Status dropdown
                      Container(
                        height: 28,
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                        decoration: BoxDecoration(
                          color: _estadoColor(estado).withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: estado,
                            isDense: true,
                            style: TextStyle(
                              color: _estadoColor(estado),
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                            ),
                            icon: Icon(
                              Icons.arrow_drop_down,
                              size: 14,
                              color: _estadoColor(estado),
                            ),
                            items: _estados
                                .map(
                                  (e) => DropdownMenuItem(
                                    value: e,
                                    child: Text(
                                      e[0].toUpperCase() + e.substring(1),
                                    ),
                                  ),
                                )
                                .toList(),
                            onChanged: (v) {
                              if (v != null) widget.onStatusChanged(v);
                            },
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(width: 4),
                  Icon(
                    _expanded
                        ? Icons.keyboard_arrow_up
                        : Icons.keyboard_arrow_down,
                    color: AppColors.textSecondary,
                    size: 18,
                  ),
                ],
              ),
            ),
          ),

          // Expanded details
          if (_expanded) ...[
            const Divider(height: 1, color: AppColors.shimmerBase),
            Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Items
                  if (itemsList.isNotEmpty) ...[
                    const Text(
                      'PRODUCTOS',
                      style: TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 1,
                      ),
                    ),
                    const SizedBox(height: 8),
                    ...itemsList.map((item) {
                      final product =
                          item['product'] as Map<String, dynamic>? ?? {};
                      final pNombre =
                          product['nombre'] as String? ??
                          item['nombre'] as String? ??
                          'Producto';
                      final pImg = product['imagen'] as String? ?? '';
                      final color = item['color'] as String? ?? '';
                      final talla = item['talla'] as String? ?? '';
                      final qty = item['quantity'] as int? ?? 1;
                      final precioItem =
                          (product['precio'] as num?)?.toDouble() ?? 0;
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Row(
                          children: [
                            ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: SizedBox(
                                width: 44,
                                height: 44,
                                child: pImg.isNotEmpty
                                    ? Image.network(
                                        pImg,
                                        fit: BoxFit.cover,
                                        errorBuilder:
                                            (context, error, stackTrace) =>
                                                Container(
                                                  color: AppColors.shimmerBase,
                                                ),
                                      )
                                    : Container(
                                        color: AppColors.shimmerBase,
                                        child: const Icon(
                                          Icons.image_outlined,
                                          size: 20,
                                          color: AppColors.textSecondary,
                                        ),
                                      ),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    pNombre,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w600,
                                      fontSize: 12,
                                    ),
                                    maxLines: 2,
                                  ),
                                  if (color.isNotEmpty || talla.isNotEmpty)
                                    Text(
                                      '${color.isNotEmpty ? color : ''}${color.isNotEmpty && talla.isNotEmpty ? ' · T:' : ''}${talla.isNotEmpty ? talla : ''}',
                                      style: const TextStyle(
                                        color: AppColors.textSecondary,
                                        fontSize: 11,
                                      ),
                                    ),
                                ],
                              ),
                            ),
                            Text(
                              '$qty × S/ ${precioItem.toStringAsFixed(2)}',
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: AppColors.textPrimary,
                              ),
                            ),
                          ],
                        ),
                      );
                    }),
                  ],

                  // Dirección
                  if (dirMap != null) ...[
                    const SizedBox(height: 8),
                    const Text(
                      'DIRECCIÓN DE ENTREGA',
                      style: TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 1,
                      ),
                    ),
                    const SizedBox(height: 6),
                    _InfoRow(
                      Icons.person_outline_rounded,
                      '${dirMap['nombre'] ?? ''} ${dirMap['apellido'] ?? ''}',
                    ),
                    _InfoRow(
                      Icons.location_on_outlined,
                      '${dirMap['direccion'] ?? ''}, ${dirMap['distrito'] ?? ''}, ${dirMap['ciudad'] ?? ''}',
                    ),
                    if ((dirMap['telefono'] ?? '').toString().isNotEmpty)
                      _InfoRow(
                        Icons.phone_outlined,
                        dirMap['telefono'].toString(),
                      ),
                  ],

                  // Pago
                  const SizedBox(height: 8),
                  const Text(
                    'PAGO',
                    style: TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 1,
                    ),
                  ),
                  const SizedBox(height: 4),
                  _InfoRow(
                    Icons.payment_outlined,
                    order['metodoPago']?.toString() ?? 'N/A',
                  ),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      const Text(
                        'Total: ',
                        style: TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 13,
                        ),
                      ),
                      Text(
                        'S/ ${total.toStringAsFixed(2)}',
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 16,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    ).animate(delay: Duration(milliseconds: widget.index * 40)).fadeIn(duration: 300.ms);
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow(this.icon, this.text);
  final IconData icon;
  final String text;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 4),
    child: Row(
      children: [
        Icon(icon, size: 14, color: AppColors.textSecondary),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            text,
            style: const TextStyle(color: AppColors.textPrimary, fontSize: 12),
          ),
        ),
      ],
    ),
  );
}
