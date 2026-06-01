import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/back_navigation_scope.dart';
import '../../data/orders_repository.dart';
import '../providers/orders_provider.dart';

// ─── Helpers ─────────────────────────────────────────────────────────────────

String _itemNombre(dynamic item) =>
    (item as Map?)?['product']?['nombre']?.toString() ?? 'Producto';

String _itemImagen(dynamic item) =>
    (item as Map?)?['product']?['imagen']?.toString() ?? '';

double _itemPrecio(dynamic item) =>
    ((item as Map?)?['product']?['precio'] as num?)?.toDouble() ?? 0;

int _itemQty(dynamic item) =>
    ((item as Map?)?['quantity'] as num?)?.toInt() ?? 1;

String? _itemTalla(dynamic item) =>
    (item as Map?)?['talla']?.toString();

String? _itemColor(dynamic item) =>
    (item as Map?)?['color']?.toString();

Color _statusColor(String estado) {
  switch (estado) {
    case 'entregado':
      return AppColors.success;
    case 'enviado':
      return const Color(0xFF0EA5E9);
    case 'pagado':
      return const Color(0xFF6366F1);
    case 'cancelado':
      return AppColors.error;
    default:
      return AppColors.warning;
  }
}

bool _isCancellable(String estado) =>
    estado == 'pendiente' || estado == 'pagado';

// ─── Page ─────────────────────────────────────────────────────────────────────

class OrdersPage extends ConsumerWidget {
  const OrdersPage({super.key});

  void _showDetail(BuildContext context, WidgetRef ref, Order order) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _OrderDetailSheet(
        order: order,
        onCancel: () async {
          await ref.read(ordersRepositoryProvider).cancelOrder(order.id);
          ref.invalidate(userOrdersProvider);
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ordersAsync = ref.watch(userOrdersProvider);

    return BackNavigationScope(
      fallbackRoute: '/profile',
      child: Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(
          title: const Text('Mis pedidos'),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios_new, size: 18),
            onPressed: () =>
                handleBackNavigation(context, fallbackRoute: '/profile'),
          ),
        ),
        body: ordersAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(
                  Icons.wifi_off_rounded,
                  size: 56,
                  color: AppColors.textSecondary,
                ),
                const SizedBox(height: 12),
                const Text('No se pudieron cargar los pedidos'),
                TextButton(
                  onPressed: () => ref.invalidate(userOrdersProvider),
                  child: const Text('Reintentar'),
                ),
              ],
            ),
          ),
          data: (orders) => orders.isEmpty
              ? _EmptyOrders()
              : RefreshIndicator(
                  color: AppColors.accent,
                  onRefresh: () async => ref.invalidate(userOrdersProvider),
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: orders.length,
                    separatorBuilder: (_, i) => const SizedBox(height: 12),
                    itemBuilder: (ctx, i) => _OrderCard(
                      order: orders[i],
                      onTap: () => _showDetail(ctx, ref, orders[i]),
                    ).animate(delay: (i * 70).ms).fadeIn().slideX(begin: 0.1),
                  ),
                ),
        ),
      ),
    );
  }
}

// ─── Order Card ───────────────────────────────────────────────────────────────

class _OrderCard extends StatelessWidget {
  const _OrderCard({required this.order, required this.onTap});
  final Order order;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final dateFmt = DateFormat('dd/MM/yyyy HH:mm');
    final currFmt = NumberFormat.currency(locale: 'es_PE', symbol: 'S/ ');
    final statusColor = _statusColor(order.estado);

    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.05),
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
                  Expanded(
                    child: Text(
                      'Pedido #${order.id.substring(0, order.id.length.clamp(0, 8)).toUpperCase()}',
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: statusColor.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      order.estadoLabel,
                      style: TextStyle(
                        color: statusColor,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const SizedBox(width: 6),
                  const Icon(
                    Icons.chevron_right,
                    size: 18,
                    color: AppColors.textSecondary,
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                dateFmt.format(order.creadoEn),
                style: const TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 13,
                ),
              ),
              const Divider(height: 20),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    '${order.items.length} '
                    '${order.items.length == 1 ? 'producto' : 'productos'}',
                    style: const TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 13,
                    ),
                  ),
                  Text(
                    currFmt.format(order.total),
                    style: const TextStyle(
                      color: AppColors.accent,
                      fontWeight: FontWeight.bold,
                      fontSize: 15,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ─── Order Detail Sheet ───────────────────────────────────────────────────────

class _OrderDetailSheet extends StatefulWidget {
  const _OrderDetailSheet({required this.order, required this.onCancel});
  final Order order;
  final Future<void> Function() onCancel;

  @override
  State<_OrderDetailSheet> createState() => _OrderDetailSheetState();
}

class _OrderDetailSheetState extends State<_OrderDetailSheet> {
  bool _cancelling = false;

  Color get _statusColor => _statusColor2(widget.order.estado);

  Color _statusColor2(String estado) {
    switch (estado) {
      case 'entregado':
        return AppColors.success;
      case 'enviado':
        return const Color(0xFF0EA5E9);
      case 'pagado':
        return const Color(0xFF6366F1);
      case 'cancelado':
        return AppColors.error;
      default:
        return AppColors.warning;
    }
  }

  Future<void> _handleCancel() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cancelar pedido'),
        content: const Text(
          '¿Estás seguro de que quieres cancelar este pedido? Esta acción no se puede deshacer.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('No, mantener'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text(
              'Sí, cancelar',
              style: TextStyle(color: AppColors.error),
            ),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    final navigator = Navigator.of(context);
    final messenger = ScaffoldMessenger.of(context);
    setState(() => _cancelling = true);
    try {
      await widget.onCancel();
      if (mounted) navigator.pop();
      messenger.showSnackBar(
        const SnackBar(
          content: Text('Pedido cancelado'),
          backgroundColor: AppColors.error,
        ),
      );
    } catch (e) {
      if (mounted) {
        setState(() => _cancelling = false);
        messenger.showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: AppColors.error),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final order = widget.order;
    final dateFmt = DateFormat("d 'de' MMMM yyyy, HH:mm", 'es_PE');
    final direccion = order.direccion;

    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.8,
      maxChildSize: 0.95,
      minChildSize: 0.5,
      builder: (ctx, scrollCtrl) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: ListView(
          controller: scrollCtrl,
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 32),
          children: [
            // Handle
            Center(
              child: Container(
                margin: const EdgeInsets.only(top: 12, bottom: 16),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),

            // Header
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Detalle del pedido',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 4),
                      SelectableText(
                        order.id,
                        style: const TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 11,
                          fontFamily: 'monospace',
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: _statusColor.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    order.estadoLabel,
                    style: TextStyle(
                      color: _statusColor,
                      fontWeight: FontWeight.w700,
                      fontSize: 13,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              dateFmt.format(order.creadoEn),
              style: const TextStyle(
                color: AppColors.textSecondary,
                fontSize: 13,
              ),
            ),
            const SizedBox(height: 20),

            // Items
            const _SectionLabel('Productos'),
            const SizedBox(height: 8),
            ...order.items.map((item) => _ItemRow(item: item)),

            const SizedBox(height: 16),

            // Price breakdown
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.beige,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                children: [
                  if (order.subtotal > 0) ...[
                    _PriceRow(label: 'Subtotal', value: order.subtotal),
                    const SizedBox(height: 6),
                    _PriceRow(
                      label: 'Envío',
                      value: order.envio,
                      zeroLabel: 'Gratis',
                    ),
                    const Divider(height: 16),
                  ],
                  _PriceRow(label: 'Total', value: order.total, bold: true),
                ],
              ),
            ),

            // Payment method
            if (order.metodoPago.isNotEmpty) ...[
              const SizedBox(height: 16),
              const _SectionLabel('Método de pago'),
              const SizedBox(height: 8),
              Row(
                children: [
                  const Icon(
                    Icons.payment_rounded,
                    size: 18,
                    color: AppColors.textSecondary,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    _metodoPagoLabel(order.metodoPago),
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                ],
              ),
            ],

            // Delivery address
            if (direccion != null) ...[
              const SizedBox(height: 16),
              const _SectionLabel('Dirección de entrega'),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey[200]!),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${direccion['nombre'] ?? ''} ${direccion['apellido'] ?? ''}'
                          .trim(),
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 4),
                    if ((direccion['direccion'] as String?)?.isNotEmpty == true)
                      Text(
                        direccion['direccion'] as String,
                        style: const TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 13,
                        ),
                      ),
                    Text(
                      [
                        direccion['distrito'],
                        direccion['ciudad'],
                      ].where((v) => v?.toString().isNotEmpty == true).join(', '),
                      style: const TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 13,
                      ),
                    ),
                    if ((direccion['referencia'] as String?)?.isNotEmpty == true)
                      Text(
                        'Ref: ${direccion['referencia']}',
                        style: const TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 12,
                        ),
                      ),
                    if ((direccion['telefono'] as String?)?.isNotEmpty == true)
                      Row(
                        children: [
                          const Icon(
                            Icons.phone_outlined,
                            size: 13,
                            color: AppColors.textSecondary,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            direccion['telefono'] as String,
                            style: const TextStyle(
                              color: AppColors.textSecondary,
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                  ],
                ),
              ),
            ],

            // Cancel button
            if (_isCancellable(order.estado)) ...[
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                height: 46,
                child: OutlinedButton(
                  onPressed: _cancelling ? null : _handleCancel,
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: AppColors.error),
                    foregroundColor: AppColors.error,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: _cancelling
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            color: AppColors.error,
                            strokeWidth: 2,
                          ),
                        )
                      : const Text(
                          'Cancelar pedido',
                          style: TextStyle(fontWeight: FontWeight.w700),
                        ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

// ─── Helper widgets ───────────────────────────────────────────────────────────

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => Text(
    text.toUpperCase(),
    style: const TextStyle(
      color: AppColors.textSecondary,
      fontSize: 10,
      fontWeight: FontWeight.w700,
      letterSpacing: 1,
    ),
  );
}

class _PriceRow extends StatelessWidget {
  const _PriceRow({
    required this.label,
    required this.value,
    this.bold = false,
    this.zeroLabel,
  });
  final String label;
  final double value;
  final bool bold;
  final String? zeroLabel;

  @override
  Widget build(BuildContext context) {
    final displayValue =
        (zeroLabel != null && value == 0) ? zeroLabel! : 'S/ ${value.toStringAsFixed(2)}';
    return Row(
      children: [
        Text(
          label,
          style: TextStyle(
            color: AppColors.textSecondary,
            fontSize: 13,
            fontWeight: bold ? FontWeight.w700 : FontWeight.w400,
          ),
        ),
        const Spacer(),
        Text(
          displayValue,
          style: TextStyle(
            fontWeight: bold ? FontWeight.w800 : FontWeight.w600,
            fontSize: 13,
            color: bold ? AppColors.textPrimary : AppColors.textSecondary,
          ),
        ),
      ],
    );
  }
}

class _ItemRow extends StatelessWidget {
  const _ItemRow({required this.item});
  final dynamic item;

  @override
  Widget build(BuildContext context) {
    final nombre = _itemNombre(item);
    final imagen = _itemImagen(item);
    final precio = _itemPrecio(item);
    final qty = _itemQty(item);
    final talla = _itemTalla(item);
    final color = _itemColor(item);

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: AppColors.beige,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          // Product image
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: imagen.isNotEmpty
                ? Image.network(
                    imagen,
                    width: 56,
                    height: 56,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stack) => _placeholder(),
                  )
                : _placeholder(),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  nombre,
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Row(
                  children: [
                    if (color?.isNotEmpty == true)
                      Text(
                        'Color: $color',
                        style: const TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 11,
                        ),
                      ),
                    if (color?.isNotEmpty == true && talla?.isNotEmpty == true)
                      const Text(
                        '  ·  ',
                        style: TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 11,
                        ),
                      ),
                    if (talla?.isNotEmpty == true)
                      Text(
                        'Talla: $talla',
                        style: const TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 11,
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  '×$qty  —  S/ ${(precio * qty).toStringAsFixed(2)}',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _placeholder() => Container(
    width: 56,
    height: 56,
    color: AppColors.shimmerBase,
    child: const Icon(
      Icons.shopping_bag_outlined,
      color: AppColors.textSecondary,
      size: 24,
    ),
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

class _EmptyOrders extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.receipt_long_outlined,
            size: 80,
            color: AppColors.textSecondary.withValues(alpha: 0.4),
          ),
          const SizedBox(height: 16),
          const Text(
            'Sin pedidos aún',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Tus pedidos aparecerán aquí',
            style: TextStyle(color: AppColors.textSecondary, fontSize: 14),
          ),
        ],
      ).animate().fadeIn(),
    );
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

String _metodoPagoLabel(String metodo) {
  switch (metodo) {
    case 'stripe':
    case 'tarjeta':
      return 'Tarjeta (Stripe)';
    case 'yape':
      return 'Yape';
    case 'plin':
      return 'Plin';
    case 'efectivo':
      return 'Efectivo';
    default:
      return metodo.isNotEmpty ? metodo : 'No especificado';
  }
}
