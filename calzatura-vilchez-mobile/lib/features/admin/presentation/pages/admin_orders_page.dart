import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart' as sb;
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/back_navigation_scope.dart';

final _supabase = sb.Supabase.instance.client;

// Transiciones válidas por estado
const _validTransitions = <String, List<String>>{
  'pendiente': ['pagado', 'cancelado'],
  'pagado': ['enviado', 'cancelado'],
  'enviado': ['entregado', 'cancelado'],
  'entregado': [],
  'cancelado': [],
};

Future<Map<String, Map<String, dynamic>>> _fetchUsersByUid() async {
  final data = await _supabase
      .from('usuarios')
      .select('uid, nombre, nombres, apellidos, email, telefono');

  return List<Map<String, dynamic>>.from(data as List)
      .fold<Map<String, Map<String, dynamic>>>({}, (acc, row) {
        final uid = row['uid']?.toString();
        if (uid != null && uid.isNotEmpty) acc[uid] = row;
        return acc;
      });
}

final adminOrdersProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
      final ordersData = await _supabase
          .from('pedidos')
          .select(
            'id, total, subtotal, envio, estado, metodoPago, stripeSessionId, notas, creadoEn, userId, userEmail, direccion, items',
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

String _estadoLabel(String e) =>
    e.isEmpty ? e : e[0].toUpperCase() + e.substring(1);

class AdminOrdersPage extends ConsumerStatefulWidget {
  const AdminOrdersPage({super.key});
  @override
  ConsumerState<AdminOrdersPage> createState() => _AdminOrdersPageState();
}

class _AdminOrdersPageState extends ConsumerState<AdminOrdersPage> {
  String _estadoFilter = 'todos';
  String _searchQuery = '';
  final _searchCtrl = TextEditingController();

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final ordersAsync = ref.watch(adminOrdersProvider);

    return BackNavigationScope(
      fallbackRoute: '/admin',
      child: Scaffold(
        backgroundColor: AppColors.beige,
        appBar: AppBar(
          backgroundColor: AppColors.black,
          foregroundColor: Colors.white,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios_new, size: 18),
            onPressed: () =>
                handleBackNavigation(context, fallbackRoute: '/admin'),
          ),
          title: ordersAsync
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
            final counts = <String, int>{};
            for (final e in _estados) {
              counts[e] = orders.where((o) => o['estado'] == e).length;
            }

            // Filtro por estado
            var filtered = _estadoFilter == 'todos'
                ? orders
                : orders.where((o) => o['estado'] == _estadoFilter).toList();

            // Filtro por búsqueda
            final q = _searchQuery.trim().toLowerCase();
            if (q.isNotEmpty) {
              filtered = filtered.where((o) {
                final id = (o['id'] as String? ?? '').toLowerCase();
                final usuario =
                    o['usuario'] as Map<String, dynamic>? ??
                    const <String, dynamic>{};
                final nombre =
                    [
                      usuario['nombres']?.toString() ?? '',
                      usuario['apellidos']?.toString() ?? '',
                      usuario['nombre']?.toString() ?? '',
                    ].join(' ').toLowerCase();
                final email = [
                  usuario['email']?.toString() ?? '',
                  o['userEmail']?.toString() ?? '',
                ].join(' ').toLowerCase();
                return id.contains(q) ||
                    nombre.contains(q) ||
                    email.contains(q);
              }).toList();
            }

            return RefreshIndicator(
              color: AppColors.gold,
              onRefresh: () async => ref.invalidate(adminOrdersProvider),
              child: CustomScrollView(
                slivers: [
                  // ── Chips de estado ──────────────────────────────────────
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
                                label: _estadoLabel(e),
                                count: counts[e] ?? 0,
                                selected: _estadoFilter == e,
                                color: _estadoColor(e),
                                onTap: () => setState(
                                  () => _estadoFilter = e,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),

                  // ── Barra de búsqueda ────────────────────────────────────
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(12, 12, 12, 4),
                      child: TextField(
                        controller: _searchCtrl,
                        onChanged: (v) => setState(() => _searchQuery = v),
                        decoration: InputDecoration(
                          hintText: 'Buscar por N.° pedido, cliente o email',
                          hintStyle: const TextStyle(
                            fontSize: 13,
                            color: AppColors.textSecondary,
                          ),
                          prefixIcon: const Icon(
                            Icons.search_rounded,
                            size: 20,
                            color: AppColors.textSecondary,
                          ),
                          suffixIcon: _searchQuery.isNotEmpty
                              ? IconButton(
                                  icon: const Icon(Icons.close, size: 18),
                                  onPressed: () {
                                    _searchCtrl.clear();
                                    setState(() => _searchQuery = '');
                                  },
                                )
                              : null,
                          filled: true,
                          fillColor: Colors.white,
                          contentPadding: const EdgeInsets.symmetric(
                            vertical: 10,
                          ),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(
                              color: AppColors.shimmerBase,
                            ),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(
                              color: AppColors.shimmerBase,
                            ),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(
                              color: AppColors.gold,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),

                  // ── Lista de pedidos ─────────────────────────────────────
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
                          padding: const EdgeInsets.fromLTRB(12, 8, 12, 80),
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
        .update({'estado': newStatus}).eq('id', orderId);
    ref.invalidate(adminOrdersProvider);
  }
}

Color _estadoColor(String estado) => switch (estado) {
  'entregado' => AppColors.success,
  'enviado' => const Color(0xFF6366F1),
  'pagado' => const Color(0xFF0EA5E9),
  'cancelado' => AppColors.error,
  _ => AppColors.warning,
};

// ── Chip de estado ───────────────────────────────────────────────────────────
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

// ── Tarjeta de pedido ────────────────────────────────────────────────────────
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

  Future<void> _handleStatusChange(
    String currentState,
    String newState,
  ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text(
          'Cambiar estado',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
        ),
        content: RichText(
          text: TextSpan(
            style: const TextStyle(
              color: AppColors.textPrimary,
              fontSize: 14,
              height: 1.5,
            ),
            children: [
              const TextSpan(text: '¿Cambiar el estado de '),
              TextSpan(
                text: _estadoLabel(currentState),
                style: TextStyle(
                  color: _estadoColor(currentState),
                  fontWeight: FontWeight.w700,
                ),
              ),
              const TextSpan(text: ' a '),
              TextSpan(
                text: _estadoLabel(newState),
                style: TextStyle(
                  color: _estadoColor(newState),
                  fontWeight: FontWeight.w700,
                ),
              ),
              const TextSpan(text: '?'),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: _estadoColor(newState),
              foregroundColor: Colors.white,
            ),
            child: const Text('Confirmar'),
          ),
        ],
      ),
    );
    if (confirmed == true) widget.onStatusChanged(newState);
  }

  @override
  Widget build(BuildContext context) {
    final order = widget.order;
    final estado = order['estado'] as String? ?? 'pendiente';
    final total = (order['total'] as num?)?.toDouble() ?? 0.0;
    final subtotal = (order['subtotal'] as num?)?.toDouble() ?? 0.0;
    final envio = (order['envio'] as num?)?.toDouble() ?? 0.0;
    final notas = order['notas'] as String? ?? '';
    final stripeId = order['stripeSessionId'] as String? ?? '';
    final usuario =
        order['usuario'] as Map<String, dynamic>? ?? const <String, dynamic>{};

    final clienteNombre = [
      usuario['nombres']?.toString().trim() ?? '',
      usuario['apellidos']?.toString().trim() ?? '',
    ].where((p) => p.isNotEmpty).join(' ').trim().let((n) =>
        n.isNotEmpty
            ? n
            : usuario['nombre'] as String? ??
                  usuario['email'] as String? ??
                  order['userEmail'] as String? ??
                  'Cliente');

    final clienteEmail =
        usuario['email'] as String? ?? order['userEmail'] as String? ?? '';
    final clienteTel = usuario['telefono'] as String? ?? '';

    final fecha = order['creadoEn'] as String? ?? '';
    final fechaCorta = fecha.length >= 10 ? fecha.substring(0, 10) : fecha;
    final orderId = order['id'] as String? ?? '';
    final shortId = orderId.split('-').first.toUpperCase();

    final items = order['items'];
    final itemsList = items is List
        ? List<Map<String, dynamic>>.from(items)
        : <Map<String, dynamic>>[];

    final direccion = order['direccion'];
    final dirMap = direccion is Map ? direccion : null;

    // Solo los estados válidos para transición desde el estado actual
    final validNext = _validTransitions[estado] ?? [];
    final canChange = validNext.isNotEmpty;

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
          // ── Cabecera ──────────────────────────────────────────────────────
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
                      // Estado con dropdown de transiciones válidas
                      if (canChange)
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
                              isExpanded: false,
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
                              items: [estado, ...validNext]
                                  .map(
                                    (e) => DropdownMenuItem(
                                      value: e,
                                      child: Text(_estadoLabel(e)),
                                    ),
                                  )
                                  .toList(),
                              onChanged: (v) {
                                if (v != null && v != estado) {
                                  _handleStatusChange(estado, v);
                                }
                              },
                            ),
                          ),
                        )
                      else
                        // Estado final: solo badge, sin dropdown
                        Container(
                          height: 28,
                          padding: const EdgeInsets.symmetric(horizontal: 10),
                          decoration: BoxDecoration(
                            color: _estadoColor(estado).withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Center(
                            child: Text(
                              _estadoLabel(estado),
                              style: TextStyle(
                                color: _estadoColor(estado),
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                              ),
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

          // ── Detalle expandido ─────────────────────────────────────────────
          if (_expanded) ...[
            const Divider(height: 1, color: AppColors.shimmerBase),
            Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // ID completo
                  _SectionLabel('N.° PEDIDO'),
                  const SizedBox(height: 4),
                  SelectableText(
                    orderId,
                    style: const TextStyle(
                      fontSize: 11,
                      color: AppColors.textSecondary,
                      fontFamily: 'monospace',
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Productos
                  if (itemsList.isNotEmpty) ...[
                    _SectionLabel('PRODUCTOS'),
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
                                        errorBuilder: (_, _, _) => Container(
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
                                      [
                                        if (color.isNotEmpty) color,
                                        if (talla.isNotEmpty) 'T:$talla',
                                      ].join(' · '),
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

                  // Dirección de entrega
                  if (dirMap != null) ...[
                    const SizedBox(height: 4),
                    _SectionLabel('DIRECCIÓN DE ENTREGA'),
                    const SizedBox(height: 6),
                    _InfoRow(
                      Icons.person_outline_rounded,
                      '${dirMap['nombre'] ?? ''} ${dirMap['apellido'] ?? ''}'
                          .trim(),
                    ),
                    _InfoRow(
                      Icons.location_on_outlined,
                      [
                        dirMap['direccion'],
                        dirMap['distrito'],
                        dirMap['ciudad'],
                      ].whereType<String>().where((s) => s.isNotEmpty).join(', '),
                    ),
                    if ((dirMap['telefono'] ?? '').toString().isNotEmpty)
                      _InfoRow(
                        Icons.phone_outlined,
                        dirMap['telefono'].toString(),
                      ),
                  ],

                  // Teléfono del cliente (de su perfil si no está en dirección)
                  if (clienteTel.isNotEmpty &&
                      (dirMap == null ||
                          (dirMap['telefono'] ?? '').toString().isEmpty)) ...[
                    const SizedBox(height: 4),
                    _InfoRow(Icons.phone_outlined, clienteTel),
                  ],

                  // Pago
                  const SizedBox(height: 8),
                  _SectionLabel('PAGO'),
                  const SizedBox(height: 6),
                  _InfoRow(
                    Icons.payment_outlined,
                    order['metodoPago']?.toString() ?? 'N/A',
                  ),
                  if (stripeId.isNotEmpty)
                    _InfoRow(
                      Icons.receipt_long_outlined,
                      'Stripe: $stripeId',
                      mono: true,
                    ),

                  // Desglose de precio
                  const SizedBox(height: 8),
                  if (subtotal > 0) ...[
                    _PriceRow('Subtotal', subtotal),
                    _PriceRow('Envío', envio),
                    const Divider(height: 12, color: AppColors.shimmerBase),
                  ],
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

                  // Notas
                  if (notas.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    _SectionLabel('NOTAS'),
                    const SizedBox(height: 4),
                    Text(
                      notas,
                      style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 12,
                        height: 1.5,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ],
      ),
    ).animate(
      delay: Duration(milliseconds: widget.index * 40),
    ).fadeIn(duration: 300.ms);
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────
class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.text);
  final String text;
  @override
  Widget build(BuildContext context) => Text(
    text,
    style: const TextStyle(
      color: AppColors.textSecondary,
      fontSize: 10,
      fontWeight: FontWeight.w700,
      letterSpacing: 1,
    ),
  );
}

class _InfoRow extends StatelessWidget {
  const _InfoRow(this.icon, this.text, {this.mono = false});
  final IconData icon;
  final String text;
  final bool mono;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 4),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 14, color: AppColors.textSecondary),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            text,
            style: TextStyle(
              color: AppColors.textPrimary,
              fontSize: 12,
              fontFamily: mono ? 'monospace' : null,
            ),
          ),
        ),
      ],
    ),
  );
}

class _PriceRow extends StatelessWidget {
  const _PriceRow(this.label, this.amount);
  final String label;
  final double amount;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 2),
    child: Row(
      mainAxisAlignment: MainAxisAlignment.end,
      children: [
        Text(
          '$label: ',
          style: const TextStyle(
            color: AppColors.textSecondary,
            fontSize: 12,
          ),
        ),
        Text(
          'S/ ${amount.toStringAsFixed(2)}',
          style: const TextStyle(
            fontWeight: FontWeight.w600,
            fontSize: 12,
            color: AppColors.textPrimary,
          ),
        ),
      ],
    ),
  );
}

extension _Let<T> on T {
  R let<R>(R Function(T) block) => block(this);
}
