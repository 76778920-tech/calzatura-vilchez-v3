import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shimmer/shimmer.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../shared/models/product.dart';
import '../../../cart/presentation/providers/cart_provider.dart';

final _wishlistProvider = StateProvider<Set<String>>((ref) => {});

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
    final imageUrl = product.allImages.isNotEmpty
        ? product.allImages.first
        : '';
    final wished = ref.watch(_wishlistProvider).contains(product.id);
    final imageFlex = compact ? 12 : 11;
    final infoFlex = compact ? 5 : 6;
    final cardRadius = compact ? 16.0 : 18.0;
    final titleFontSize = compact ? 11.0 : 12.0;
    final priceFontSize = compact ? 13.0 : 14.0;
    final infoPadding = compact
        ? const EdgeInsets.fromLTRB(10, 8, 10, 10)
        : const EdgeInsets.fromLTRB(10, 8, 8, 8);

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
                    Expanded(
                      flex: imageFlex,
                      child: Stack(
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.vertical(
                              top: Radius.circular(cardRadius),
                            ),
                            child: Hero(
                              tag: 'product-${product.id}',
                              child: imageUrl.isNotEmpty
                                  ? CachedNetworkImage(
                                      imageUrl: imageUrl,
                                      width: double.infinity,
                                      height: double.infinity,
                                      fit: BoxFit.cover,
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
                          if (!product.hasStock)
                            Positioned.fill(
                              child: ClipRRect(
                                borderRadius: BorderRadius.vertical(
                                  top: Radius.circular(cardRadius),
                                ),
                                child: Container(
                                  color: Colors.black.withValues(alpha: 0.55),
                                  child: const Center(
                                    child: Text(
                                      'AGOTADO',
                                      style: TextStyle(
                                        color: Colors.white,
                                        fontWeight: FontWeight.w900,
                                        fontSize: 13,
                                        letterSpacing: 2,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          if (product.hasDescuento)
                            Positioned(
                              top: 0,
                              left: 0,
                              child: Container(
                                padding: EdgeInsets.fromLTRB(
                                  compact ? 8 : 10,
                                  compact ? 5 : 6,
                                  compact ? 8 : 10,
                                  compact ? 5 : 6,
                                ),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFE53935),
                                  borderRadius: BorderRadius.only(
                                    topLeft: Radius.circular(cardRadius),
                                    bottomRight: const Radius.circular(12),
                                  ),
                                ),
                                child: Text(
                                  '${product.descuento}% OFF',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: compact ? 9 : 10,
                                    fontWeight: FontWeight.w900,
                                    letterSpacing: 0.5,
                                  ),
                                ),
                              ),
                            )
                          else if (product.destacado)
                            Positioned(
                              top: 0,
                              left: 0,
                              child: Container(
                                padding: EdgeInsets.fromLTRB(
                                  compact ? 8 : 10,
                                  compact ? 5 : 6,
                                  compact ? 8 : 10,
                                  compact ? 5 : 6,
                                ),
                                decoration: BoxDecoration(
                                  color: AppColors.gold,
                                  borderRadius: BorderRadius.only(
                                    topLeft: Radius.circular(cardRadius),
                                    bottomRight: const Radius.circular(12),
                                  ),
                                ),
                                child: Text(
                                  'DEST.',
                                  style: TextStyle(
                                    color: AppColors.black,
                                    fontSize: compact ? 8 : 9,
                                    fontWeight: FontWeight.w900,
                                    letterSpacing: 0.5,
                                  ),
                                ),
                              ),
                            ),
                          if (showWishlist)
                            Positioned(
                              top: 8,
                              right: 8,
                              child: GestureDetector(
                                onTap: () {
                                  final notifier = ref.read(
                                    _wishlistProvider.notifier,
                                  );
                                  final current = Set<String>.from(
                                    notifier.state,
                                  );
                                  if (current.contains(product.id)) {
                                    current.remove(product.id);
                                  } else {
                                    current.add(product.id);
                                  }
                                  notifier.state = current;
                                },
                                child: AnimatedContainer(
                                  duration: const Duration(milliseconds: 200),
                                  width: 32,
                                  height: 32,
                                  decoration: BoxDecoration(
                                    color: wished
                                        ? const Color(0xFFE53935)
                                        : Colors.white.withValues(alpha: 0.9),
                                    shape: BoxShape.circle,
                                    boxShadow: [
                                      BoxShadow(
                                        color: Colors.black.withValues(
                                          alpha: 0.12,
                                        ),
                                        blurRadius: 6,
                                      ),
                                    ],
                                  ),
                                  child: Icon(
                                    wished
                                        ? Icons.favorite_rounded
                                        : Icons.favorite_border_rounded,
                                    size: 16,
                                    color: wished
                                        ? Colors.white
                                        : AppColors.textSecondary,
                                  ),
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                    Expanded(
                      flex: infoFlex,
                      child: Padding(
                        padding: infoPadding,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                if (showTypeLabel &&
                                    product.tipoCalzado != null)
                                  Text(
                                    product.tipoCalzado!.toUpperCase(),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      color: AppColors.textSecondary,
                                      fontSize: 9,
                                      fontWeight: FontWeight.w600,
                                      letterSpacing: 0.8,
                                    ),
                                  ),
                                if (showTypeLabel) const SizedBox(height: 2),
                                Text(
                                  product.nombre,
                                  maxLines: compact ? 1 : 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    fontSize: titleFontSize,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.textPrimary,
                                    height: 1.25,
                                  ),
                                ),
                              ],
                            ),
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.end,
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
                                            fontSize: 10,
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
                                          fontSize: priceFontSize,
                                          fontWeight: FontWeight.w900,
                                          color: product.hasDescuento
                                              ? const Color(0xFFE53935)
                                              : AppColors.gold,
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

class _AddCartBtn extends ConsumerWidget {
  const _AddCartBtn({required this.product});

  final Product product;

  void _handle(BuildContext context, WidgetRef ref) {
    final tallas = product.tallas;
    if (tallas == null || tallas.isEmpty) {
      ref.read(cartProvider.notifier).addItem(product);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('${product.nombre} anadido'),
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
        width: 34,
        height: 34,
        decoration: BoxDecoration(
          color: AppColors.gold,
          borderRadius: BorderRadius.circular(10),
          boxShadow: [
            BoxShadow(
              color: AppColors.gold.withValues(alpha: 0.35),
              blurRadius: 8,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: const Icon(
          Icons.add_shopping_cart_rounded,
          color: AppColors.black,
          size: 16,
        ),
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
                        fit: BoxFit.cover,
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
                        color: AppColors.gold,
                        fontWeight: FontWeight.w800,
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
                            content: Text('${product.nombre} T.$talla anadido'),
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
