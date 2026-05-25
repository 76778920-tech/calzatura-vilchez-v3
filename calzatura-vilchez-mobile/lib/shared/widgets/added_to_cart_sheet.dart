import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_theme.dart';
import '../models/product.dart';

void showAddedToCartSheet(
  BuildContext context,
  Product product, {
  String? talla,
}) {
  showModalBottomSheet(
    context: context,
    backgroundColor: Colors.white,
    isScrollControlled: true,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (_) => _AddedToCartSheet(product: product, talla: talla),
  );
}

class _AddedToCartSheet extends StatelessWidget {
  const _AddedToCartSheet({required this.product, this.talla});
  final Product product;
  final String? talla;

  @override
  Widget build(BuildContext context) {
    final imageUrl =
        product.allImages.isNotEmpty ? product.allImages.first : '';

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // ── Header ──────────────────────────────────────────────────────
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 8, 14),
          child: Row(
            children: [
              const Expanded(
                child: Text(
                  'AGREGADO AL CARRITO',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontWeight: FontWeight.w900,
                    fontSize: 13,
                    letterSpacing: 0.8,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
              GestureDetector(
                onTap: () => Navigator.pop(context),
                child: Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: AppColors.shimmerBase,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.close_rounded, size: 18, color: AppColors.textSecondary),
                ),
              ),
            ],
          ),
        ),
        const Divider(height: 1, color: AppColors.shimmerBase),

        // ── Aviso de stock ───────────────────────────────────────────────
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 11),
          color: AppColors.black,
          child: const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '🔒 LOS ARTÍCULOS DE TU CARRITO NO ESTÁN RESERVADOS 🔒',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w800,
                  fontSize: 11,
                  letterSpacing: 0.2,
                ),
              ),
              SizedBox(height: 2),
              Text(
                'ASEGÚRALOS ANTES QUE SE AGOTEN',
                style: TextStyle(
                  color: Colors.white60,
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 0.3,
                ),
              ),
            ],
          ),
        ),

        // ── Info del producto ────────────────────────────────────────────
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: imageUrl.isNotEmpty
                    ? Image.network(
                        imageUrl,
                        width: 90,
                        height: 90,
                        fit: BoxFit.cover,
                        errorBuilder: (_, _, _) => _imgFallback(),
                      )
                    : _imgFallback(),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Chip precio
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: AppColors.black,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        product.precioFormatted,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w800,
                          fontSize: 13,
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      product.nombre,
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 14,
                        color: AppColors.textPrimary,
                        height: 1.3,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (talla != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        'Talla: $talla',
                        style: const TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),

        // ── Botón VER CARRITO ────────────────────────────────────────────
        Padding(
          padding: EdgeInsets.fromLTRB(
            16,
            0,
            16,
            MediaQuery.of(context).padding.bottom + 16,
          ),
          child: SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton(
              onPressed: () {
                Navigator.pop(context);
                context.go('/cart');
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.black,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                elevation: 0,
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    'VER CARRITO',
                    style: TextStyle(
                      fontWeight: FontWeight.w900,
                      fontSize: 14,
                      letterSpacing: 1.2,
                    ),
                  ),
                  SizedBox(width: 10),
                  Icon(Icons.arrow_forward_rounded, size: 20),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _imgFallback() => Container(
        width: 90,
        height: 90,
        decoration: BoxDecoration(
          color: AppColors.shimmerBase,
          borderRadius: BorderRadius.circular(12),
        ),
        child: const Icon(Icons.storefront_rounded, color: AppColors.textSecondary),
      );
}
