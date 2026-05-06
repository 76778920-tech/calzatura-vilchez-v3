import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/cv_logo.dart';
import '../../domain/cart_item.dart';
import '../providers/cart_provider.dart';

class CartPage extends ConsumerWidget {
  const CartPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final items = ref.watch(cartProvider);
    final total = ref.watch(cartTotalProvider);
    final fmt = NumberFormat('#,##0.00', 'es_PE');

    return Scaffold(
      backgroundColor: AppColors.beige,
      body: items.isEmpty
          ? _EmptyCart()
          : Column(
              children: [
                // ── Header ──────────────────────────────────────────────
                _CartHeader(
                  itemCount: items.length,
                  onClear: () => ref.read(cartProvider.notifier).clear(),
                ),
                // ── Lista ────────────────────────────────────────────────
                Expanded(
                  child: ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                    itemCount: items.length,
                    physics: const BouncingScrollPhysics(),
                    separatorBuilder: (_, i) => const SizedBox(height: 10),
                    itemBuilder: (ctx, i) => _CartTile(
                      item: items[i],
                      index: i,
                      ref: ref,
                    ).animate(delay: (i * 60).ms).fadeIn().slideX(begin: -0.08),
                  ),
                ),
                // ── Resumen + checkout ──────────────────────────────────
                _OrderSummary(total: total, fmt: fmt, items: items),
              ],
            ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Header del carrito
// ─────────────────────────────────────────────────────────────────────────────

class _CartHeader extends StatelessWidget {
  const _CartHeader({required this.itemCount, required this.onClear});
  final int itemCount;
  final VoidCallback onClear;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.black,
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 12, 16, 14),
          child: Row(
            children: [
              const CVLogo(size: 38, dark: true),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Mi carrito',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 17,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  Text(
                    '$itemCount ${itemCount == 1 ? 'producto' : 'productos'}',
                    style: const TextStyle(color: AppColors.gold, fontSize: 11),
                  ),
                ],
              ),
              const Spacer(),
              if (itemCount > 0)
                GestureDetector(
                  onTap: onClear,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 7,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: Colors.white.withValues(alpha: 0.15),
                      ),
                    ),
                    child: const Row(
                      children: [
                        Icon(
                          Icons.delete_sweep_outlined,
                          color: Colors.white54,
                          size: 15,
                        ),
                        SizedBox(width: 4),
                        Text(
                          'Vaciar',
                          style: TextStyle(color: Colors.white54, fontSize: 12),
                        ),
                      ],
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
// Carrito vacío
// ─────────────────────────────────────────────────────────────────────────────

class _EmptyCart extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          color: AppColors.black,
          child: SafeArea(
            bottom: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 16, 14),
              child: Row(
                children: const [
                  CVLogo(size: 38, dark: true),
                  SizedBox(width: 12),
                  Text(
                    'Mi carrito',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 17,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        Expanded(
          child: Center(
            child:
                Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          width: 110,
                          height: 110,
                          decoration: BoxDecoration(
                            color: AppColors.gold.withValues(alpha: 0.1),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.shopping_bag_outlined,
                            size: 52,
                            color: AppColors.gold,
                          ),
                        ),
                        const SizedBox(height: 20),
                        const Text(
                          'Tu carrito está vacío',
                          style: TextStyle(
                            fontSize: 19,
                            fontWeight: FontWeight.w800,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Agrega productos para continuar\ncon tu compra',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: AppColors.textSecondary,
                            fontSize: 14,
                            height: 1.5,
                          ),
                        ),
                        const SizedBox(height: 32),
                        ElevatedButton.icon(
                          onPressed: () => context.go('/catalog'),
                          icon: const Icon(Icons.storefront_rounded),
                          label: const Text('Explorar catálogo'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.gold,
                            foregroundColor: AppColors.black,
                            padding: const EdgeInsets.symmetric(
                              horizontal: 28,
                              vertical: 14,
                            ),
                            textStyle: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      ],
                    )
                    .animate()
                    .fadeIn(duration: 400.ms)
                    .scale(begin: const Offset(0.9, 0.9)),
          ),
        ),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tile de producto en carrito
// ─────────────────────────────────────────────────────────────────────────────

class _CartTile extends StatelessWidget {
  const _CartTile({required this.item, required this.index, required this.ref});
  final CartItem item;
  final int index;
  final WidgetRef ref;

  @override
  Widget build(BuildContext context) {
    final imageUrl = item.product.allImages.isNotEmpty
        ? item.product.allImages.first
        : '';

    return Dismissible(
      key: ValueKey('${item.product.id}-${item.talla}'),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 22),
        decoration: BoxDecoration(
          color: AppColors.error,
          borderRadius: BorderRadius.circular(18),
        ),
        child: const Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.delete_rounded, color: Colors.white, size: 26),
            SizedBox(height: 4),
            Text(
              'Eliminar',
              style: TextStyle(
                color: Colors.white,
                fontSize: 10,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
      onDismissed: (_) => ref.read(cartProvider.notifier).removeItem(index),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 10,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Row(
          children: [
            // Imagen
            Stack(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: imageUrl.isNotEmpty
                      ? CachedNetworkImage(
                          imageUrl: imageUrl,
                          width: 80,
                          height: 80,
                          fit: BoxFit.cover,
                        )
                      : Container(
                          width: 80,
                          height: 80,
                          color: AppColors.shimmerBase,
                          child: const Icon(
                            Icons.storefront_rounded,
                            color: AppColors.textSecondary,
                          ),
                        ),
                ),
                if (item.product.hasDescuento)
                  Positioned(
                    top: 0,
                    left: 0,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 5,
                        vertical: 3,
                      ),
                      decoration: const BoxDecoration(
                        color: Color(0xFFE53935),
                        borderRadius: BorderRadius.only(
                          topLeft: Radius.circular(12),
                          bottomRight: Radius.circular(8),
                        ),
                      ),
                      child: Text(
                        '${item.product.descuento}%',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 9,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(width: 12),
            // Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (item.product.marca != null)
                    Text(
                      item.product.marca!.toUpperCase(),
                      style: const TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 9,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.8,
                      ),
                    ),
                  Text(
                    item.product.nombre,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 13,
                      color: AppColors.textPrimary,
                      height: 1.3,
                    ),
                  ),
                  const SizedBox(height: 4),
                  // Tags talla + color
                  if (item.talla != null || item.color != null)
                    Wrap(
                      spacing: 6,
                      children: [
                        if (item.talla != null) _Tag(label: 'T. ${item.talla}'),
                        if (item.color != null) _Tag(label: item.color!),
                      ],
                    ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      if (item.product.hasDescuento)
                        Text(
                          item.product.precioOriginalFormatted,
                          style: const TextStyle(
                            fontSize: 11,
                            color: AppColors.textSecondary,
                            decoration: TextDecoration.lineThrough,
                          ),
                        ),
                      Text(
                        item.product.precioFormatted,
                        style: TextStyle(
                          color: item.product.hasDescuento
                              ? const Color(0xFFE53935)
                              : AppColors.gold,
                          fontWeight: FontWeight.w800,
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            // Controles cantidad
            Column(
              children: [
                _QtyBtn(
                  icon: Icons.add,
                  onTap: () => ref
                      .read(cartProvider.notifier)
                      .updateQuantity(index, item.quantity + 1),
                ),
                Container(
                  width: 32,
                  alignment: Alignment.center,
                  child: Text(
                    '${item.quantity}',
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 15,
                    ),
                  ),
                ),
                _QtyBtn(
                  icon: Icons.remove,
                  onTap: () => ref
                      .read(cartProvider.notifier)
                      .updateQuantity(index, item.quantity - 1),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _Tag extends StatelessWidget {
  const _Tag({required this.label});
  final String label;
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(
        color: AppColors.shimmerBase,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        label,
        style: const TextStyle(
          color: AppColors.textSecondary,
          fontSize: 10,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _QtyBtn extends StatelessWidget {
  const _QtyBtn({required this.icon, required this.onTap});
  final IconData icon;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 30,
        height: 30,
        decoration: BoxDecoration(
          color: AppColors.beige,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: AppColors.shimmerBase),
        ),
        child: Icon(icon, size: 16, color: AppColors.textPrimary),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Resumen del pedido + checkout
// ─────────────────────────────────────────────────────────────────────────────

class _OrderSummary extends StatelessWidget {
  const _OrderSummary({
    required this.total,
    required this.fmt,
    required this.items,
  });
  final double total;
  final NumberFormat fmt;
  final List<CartItem> items;

  @override
  Widget build(BuildContext context) {
    final itemCount = items.fold<int>(0, (sum, item) => sum + item.quantity);
    const shipping = 0.0; // Gratis

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 20,
            offset: const Offset(0, -6),
          ),
        ],
      ),
      padding: EdgeInsets.fromLTRB(
        20,
        20,
        20,
        MediaQuery.of(context).padding.bottom + 100,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text(
            'Resumen del pedido',
            style: TextStyle(
              fontWeight: FontWeight.w800,
              fontSize: 16,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 14),
          _Row(
            label: 'Subtotal ($itemCount artículos)',
            value: 'S/ ${fmt.format(total)}',
          ),
          const SizedBox(height: 6),
          _Row(
            label: 'Envío a Huancayo',
            value: shipping == 0 ? 'Gratis' : 'S/ ${fmt.format(shipping)}',
            valueColor: AppColors.success,
          ),
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 12),
            child: Divider(color: AppColors.shimmerBase),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Total',
                style: TextStyle(
                  fontWeight: FontWeight.w900,
                  fontSize: 17,
                  color: AppColors.textPrimary,
                ),
              ),
              Text(
                'S/ ${fmt.format(total + shipping)}',
                style: const TextStyle(
                  fontWeight: FontWeight.w900,
                  fontSize: 20,
                  color: AppColors.gold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          // CTA Checkout
          SizedBox(
            width: double.infinity,
            height: 56,
            child: ElevatedButton(
              onPressed: () => context.push('/checkout'),
              /*
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                  content: Text('Módulo de pago próximamente'),
                  behavior: SnackBarBehavior.floating,
                ));
              },
              */
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.black,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                elevation: 0,
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.lock_rounded, size: 18),
                  const SizedBox(width: 10),
                  Text(
                    'Proceder al pago · S/ ${fmt.format(total + shipping)}',
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 8),
          // Garantías
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: const [
              Icon(
                Icons.verified_user_outlined,
                size: 13,
                color: AppColors.textSecondary,
              ),
              SizedBox(width: 4),
              Text(
                'Compra 100% segura · Datos encriptados',
                style: TextStyle(color: AppColors.textSecondary, fontSize: 11),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({required this.label, required this.value, this.valueColor});
  final String label, value;
  final Color? valueColor;
  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
        ),
        Text(
          value,
          style: TextStyle(
            color: valueColor ?? AppColors.textPrimary,
            fontSize: 13,
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }
}
