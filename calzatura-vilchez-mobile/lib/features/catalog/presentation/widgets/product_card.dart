import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shimmer/shimmer.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../shared/models/product.dart';
import '../../../cart/presentation/providers/cart_provider.dart';
import '../../../wishlist/presentation/providers/wishlist_provider.dart';

class ProductCard extends ConsumerWidget {
  const ProductCard({
    super.key,
    required this.product,
    required this.index,
    this.compact = false,
    this.showWishlist = true,
    this.showAddToCart = true,
    this.showTypeLabel = true,
  });

  final Product product;
  final int index;
  final bool compact;
  final bool showWishlist;
  final bool showAddToCart;
  final bool showTypeLabel;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final images = product.allImages;
    final imageUrl = images.isNotEmpty ? images.first : '';
    final extraImages = images.length > 1
        ? images.sublist(1, images.length.clamp(1, 4))
        : <String>[];
    final wished = ref.watch(isWishedProvider(product.id));
    final cardRadius = compact ? 14.0 : 16.0;

    return GestureDetector(
      onTap: () => context.push(
        '/catalog/${product.id}',
        extra: {
          'nombre': product.nombre,
          'imagen': imageUrl,
          'precio': product.precio,
        },
      ),
      child:
          Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(cardRadius),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.07),
                      blurRadius: 14,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // ── Image area ──────────────────────────────────────
                    Expanded(
                      flex: 13,
                      child: Stack(
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.vertical(
                              top: Radius.circular(cardRadius),
                            ),
                            child: Container(
                              color: const Color(0xFFF8F7F5),
                              child: Hero(
                                tag: 'product-${product.id}',
                                child: imageUrl.isNotEmpty
                                    ? CachedNetworkImage(
                                        imageUrl: imageUrl,
                                        width: double.infinity,
                                        height: double.infinity,
                                        fit: BoxFit.contain,
                                        placeholder: (ctx, url) =>
                                            Shimmer.fromColors(
                                              baseColor: AppColors.shimmerBase,
                                              highlightColor:
                                                  AppColors.shimmerHighlight,
                                              child: Container(
                                                color: Colors.white,
                                              ),
                                            ),
                                        errorWidget: (ctx, url, err) => Container(
                                          color: AppColors.shimmerBase,
                                          child: const Icon(
                                            Icons.image_not_supported_outlined,
                                            color: AppColors.textSecondary,
                                            size: 36,
                                          ),
                                        ),
                                      )
                                    : Container(
                                        color: AppColors.shimmerBase,
                                        child: const Center(
                                          child: Icon(
                                            Icons.storefront_rounded,
                                            color: AppColors.textSecondary,
                                            size: 44,
                                          ),
                                        ),
                                      ),
                              ),
                            ),
                          ),

                          // AGOTADO overlay
                          if (!product.hasStock)
                            Positioned.fill(
                              child: ClipRRect(
                                borderRadius: BorderRadius.vertical(
                                  top: Radius.circular(cardRadius),
                                ),
                                child: Container(
                                  color: Colors.black.withValues(alpha: 0.50),
                                  child: const Center(
                                    child: Text(
                                      'AGOTADO',
                                      style: TextStyle(
                                        color: Colors.white,
                                        fontWeight: FontWeight.w900,
                                        fontSize: 12,
                                        letterSpacing: 2,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ),

                          // Discount badge (top-left)
                          if (product.hasDescuento)
                            Positioned(
                              top: 8,
                              left: 8,
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 6,
                                  vertical: 3,
                                ),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFE53935),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  '-${product.descuento}%',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 9,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: 0.3,
                                  ),
                                ),
                              ),
                            ),

                          // Wishlist heart (top-right, no circle)
                          if (showWishlist)
                            Positioned(
                              top: 8,
                              right: 8,
                              child: GestureDetector(
                                onTap: () {
                                  ref
                                      .read(wishlistProvider.notifier)
                                      .toggle(product.id);
                                },
                                child: AnimatedSwitcher(
                                  duration: const Duration(milliseconds: 200),
                                  child: Icon(
                                    wished
                                        ? Icons.favorite_rounded
                                        : Icons.favorite_border_rounded,
                                    key: ValueKey(wished),
                                    size: 20,
                                    color: wished
                                        ? const Color(0xFFE53935)
                                        : AppColors.textSecondary,
                                  ),
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),

                    // ── Image thumbnails strip ───────────────────────────
                    if (extraImages.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.fromLTRB(10, 6, 10, 0),
                        child: Row(
                          children: [
                            _ThumbDot(imageUrl: imageUrl, selected: true),
                            ...extraImages.map(
                              (img) =>
                                  _ThumbDot(imageUrl: img, selected: false),
                            ),
                          ],
                        ),
                      ),

                    // ── Info section ─────────────────────────────────────
                    Expanded(
                      flex: 8,
                      child: Padding(
                        padding: EdgeInsets.fromLTRB(
                          10,
                          extraImages.isNotEmpty ? 4 : 8,
                          10,
                          10,
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            // Category badge + names
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Outlined category badge
                                if (showTypeLabel &&
                                    product.tipoCalzado != null)
                                  Container(
                                    margin: const EdgeInsets.only(bottom: 4),
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 5,
                                      vertical: 2,
                                    ),
                                    decoration: BoxDecoration(
                                      border: Border.all(
                                        color: const Color(0xFFCCBCA0),
                                        width: 1,
                                      ),
                                      borderRadius: BorderRadius.circular(3),
                                    ),
                                    child: Text(
                                      product.tipoCalzado!.toUpperCase(),
                                      style: const TextStyle(
                                        color: AppColors.textSecondary,
                                        fontSize: 8,
                                        fontWeight: FontWeight.w700,
                                        letterSpacing: 0.6,
                                      ),
                                    ),
                                  ),

                                // Brand name
                                if (product.marca != null &&
                                    product.marca!.isNotEmpty)
                                  Text(
                                    product.marca!.toUpperCase(),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      color: AppColors.textPrimary,
                                      fontSize: 9,
                                      fontWeight: FontWeight.w800,
                                      letterSpacing: 0.4,
                                    ),
                                  ),

                                // Product name
                                Text(
                                  product.nombre,
                                  maxLines: compact ? 1 : 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    fontSize: compact ? 10.0 : 11.0,
                                    fontWeight: FontWeight.w400,
                                    color: AppColors.textSecondary,
                                    height: 1.25,
                                  ),
                                ),
                              ],
                            ),

                            // Price + add-to-cart
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.center,
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      if (!compact && product.hasDescuento)
                                        Text(
                                          product.precioOriginalFormatted,
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: const TextStyle(
                                            fontSize: 9,
                                            color: AppColors.textSecondary,
                                            decoration:
                                                TextDecoration.lineThrough,
                                          ),
                                        ),
                                      Text(
                                        product.precioFormatted,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: TextStyle(
                                          fontSize: compact ? 14.0 : 15.0,
                                          fontWeight: FontWeight.w900,
                                          color: AppColors.textPrimary,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                if (showAddToCart && product.hasStock)
                                  _AddCartBtn(product: product),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              )
              .animate(delay: (index * 45).ms)
              .fadeIn(duration: 280.ms)
              .slideY(begin: 0.08, duration: 280.ms, curve: Curves.easeOut),
    );
  }
}

class _ThumbDot extends StatelessWidget {
  const _ThumbDot({required this.imageUrl, required this.selected});

  final String imageUrl;
  final bool selected;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 22,
      height: 22,
      margin: const EdgeInsets.only(right: 4),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(4),
        border: Border.all(
          color: selected ? AppColors.gold : const Color(0xFFE0D8CC),
          width: selected ? 1.5 : 1,
        ),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(3),
        child: CachedNetworkImage(
          imageUrl: imageUrl,
          fit: BoxFit.cover,
          errorWidget: (ctx, url, err) =>
              Container(color: AppColors.shimmerBase),
        ),
      ),
    );
  }
}

class _AddCartBtn extends ConsumerWidget {
  const _AddCartBtn({required this.product});

  final Product product;

  void _handle(BuildContext context, WidgetRef ref) {
    final tallas = product.tallas;
    if (tallas == null || tallas.isEmpty) {
      ref.read(cartProvider.notifier).addItem(product);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('${product.nombre} añadido'),
          backgroundColor: AppColors.success,
          behavior: SnackBarBehavior.floating,
          duration: const Duration(seconds: 2),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
        ),
      );
      return;
    }

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => _SizeSheet(product: product, widgetRef: ref),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return GestureDetector(
      onTap: () => _handle(context, ref),
      child: Container(
        width: 30,
        height: 30,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(color: AppColors.gold, width: 1.5),
        ),
        child: const Icon(Icons.add_rounded, color: AppColors.gold, size: 18),
      ),
    );
  }
}

class _SizeSheet extends ConsumerWidget {
  const _SizeSheet({required this.product, required this.widgetRef});

  final Product product;
  final WidgetRef widgetRef;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tallas = product.tallas ?? [];
    final imageUrl = product.allImages.isNotEmpty
        ? product.allImages.first
        : '';

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 36),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: AppColors.shimmerBase,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          Row(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: imageUrl.isNotEmpty
                    ? CachedNetworkImage(
                        imageUrl: imageUrl,
                        width: 56,
                        height: 56,
                        fit: BoxFit.contain,
                      )
                    : Container(
                        width: 56,
                        height: 56,
                        color: AppColors.shimmerBase,
                        child: const Icon(
                          Icons.storefront_rounded,
                          color: AppColors.textSecondary,
                        ),
                      ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      product.nombre,
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 14,
                        color: AppColors.textPrimary,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      product.precioFormatted,
                      style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontWeight: FontWeight.w900,
                        fontSize: 15,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(
                  Icons.close_rounded,
                  color: AppColors.textSecondary,
                ),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
          const SizedBox(height: 18),
          const Text(
            'Selecciona tu talla',
            style: TextStyle(
              fontWeight: FontWeight.w700,
              fontSize: 14,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: tallas.map((talla) {
              final stockT = product.stockDeTalla(talla);
              final available = stockT > 0 || product.tallaStock == null;
              return GestureDetector(
                onTap: available
                    ? () {
                        ref
                            .read(cartProvider.notifier)
                            .addItem(product, talla: talla);
                        Navigator.pop(context);
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text('${product.nombre} T.$talla añadido'),
                            backgroundColor: AppColors.success,
                            behavior: SnackBarBehavior.floating,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                        );
                      }
                    : null,
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 150),
                  width: 58,
                  height: 48,
                  decoration: BoxDecoration(
                    color: available ? Colors.white : AppColors.shimmerBase,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: available
                          ? const Color(0xFFE0D8CC)
                          : AppColors.shimmerBase,
                      width: 1.5,
                    ),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        talla,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: available
                              ? AppColors.textPrimary
                              : AppColors.textSecondary,
                        ),
                      ),
                      if (product.tallaStock != null)
                        Text(
                          available ? '$stockT uds' : 'S/N',
                          style: const TextStyle(
                            fontSize: 8,
                            color: AppColors.textSecondary,
                          ),
                        ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }
}
