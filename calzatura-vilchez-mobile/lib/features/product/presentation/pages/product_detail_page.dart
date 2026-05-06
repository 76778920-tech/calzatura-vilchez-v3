import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/models/product.dart';
import '../../../../shared/widgets/back_navigation_scope.dart';
import '../../../cart/presentation/providers/cart_provider.dart';
import '../../../catalog/presentation/providers/catalog_provider.dart';

class ProductDetailPage extends ConsumerStatefulWidget {
  const ProductDetailPage({super.key, required this.productId, this.heroData});

  final String productId;
  final Map<String, dynamic>? heroData;

  @override
  ConsumerState<ProductDetailPage> createState() => _ProductDetailPageState();
}

class _ProductDetailPageState extends ConsumerState<ProductDetailPage> {
  int _currentImage = 0;
  String? _selectedTalla;
  int _qty = 1;
  final _pageCtrl = PageController();

  @override
  void dispose() {
    _pageCtrl.dispose();
    super.dispose();
  }

  void _addToCart(Product product) {
    if (product.tallas != null &&
        product.tallas!.isNotEmpty &&
        _selectedTalla == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Selecciona una talla primero'),
          backgroundColor: AppColors.warning,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }
    for (int i = 0; i < _qty; i++) {
      ref.read(cartProvider.notifier).addItem(product, talla: _selectedTalla);
    }
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('$_qty × ${product.nombre} → carrito'),
        backgroundColor: AppColors.success,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        action: SnackBarAction(
          label: 'Ver',
          textColor: Colors.white,
          onPressed: () => context.go('/cart'),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final productAsync = ref.watch(productDetailProvider(widget.productId));
    final heroImageUrl = widget.heroData?['imagen'] as String? ?? '';

    return BackNavigationScope(
      fallbackRoute: '/catalog',
      child: productAsync.when(
        loading: () => Scaffold(
          backgroundColor: Colors.white,
          body: Stack(
            children: [
              if (heroImageUrl.isNotEmpty)
                Hero(
                  tag: 'product-${widget.productId}',
                  child: CachedNetworkImage(
                    imageUrl: heroImageUrl,
                    height: 380,
                    width: double.infinity,
                    fit: BoxFit.cover,
                  ),
                ),
              AppBar(backgroundColor: Colors.transparent, elevation: 0),
              const Center(
                child: CircularProgressIndicator(color: AppColors.gold),
              ),
            ],
          ),
        ),
        error: (err, st) => Scaffold(
          body: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(
                  Icons.error_outline,
                  size: 56,
                  color: AppColors.error,
                ),
                const SizedBox(height: 12),
                const Text('No se pudo cargar el producto'),
                TextButton(
                  onPressed: () =>
                      handleBackNavigation(context, fallbackRoute: '/catalog'),
                  child: const Text('Volver'),
                ),
              ],
            ),
          ),
        ),
        data: (product) {
          if (product == null) {
            return const Scaffold(
              body: Center(child: Text('Producto no encontrado')),
            );
          }
          return Scaffold(
            backgroundColor: Colors.white,
            bottomNavigationBar: _BottomBar(
              product: product,
              qty: _qty,
              onQtyChanged: (v) => setState(() => _qty = v),
              onAddToCart: () => _addToCart(product),
            ),
            body: _buildBody(product),
          );
        },
      ),
    );
  }

  Widget _buildBody(Product product) {
    final images = product.allImages;

    return CustomScrollView(
      slivers: [
        // ── Galería de imágenes ────────────────────────────────────────
        SliverAppBar(
          expandedHeight: 360,
          pinned: true,
          backgroundColor: Colors.white,
          foregroundColor: AppColors.black,
          leading: Container(
            margin: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.9),
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.1),
                  blurRadius: 8,
                ),
              ],
            ),
            child: IconButton(
              icon: const Icon(
                Icons.arrow_back_ios_new,
                size: 18,
                color: AppColors.black,
              ),
              onPressed: () =>
                  handleBackNavigation(context, fallbackRoute: '/catalog'),
            ),
          ),
          actions: [
            Container(
              margin: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.9),
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.1),
                    blurRadius: 8,
                  ),
                ],
              ),
              child: IconButton(
                icon: const Icon(
                  Icons.shopping_bag_outlined,
                  size: 20,
                  color: AppColors.black,
                ),
                onPressed: () => context.go('/cart'),
              ),
            ),
          ],
          flexibleSpace: FlexibleSpaceBar(
            background: Stack(
              children: [
                images.isNotEmpty
                    ? PageView.builder(
                        controller: _pageCtrl,
                        itemCount: images.length,
                        onPageChanged: (i) => setState(() => _currentImage = i),
                        itemBuilder: (ctx, i) => Hero(
                          tag: i == 0
                              ? 'product-${product.id}'
                              : 'product-${product.id}-$i',
                          child: CachedNetworkImage(
                            imageUrl: images[i],
                            fit: BoxFit.cover,
                            width: double.infinity,
                          ),
                        ),
                      )
                    : Hero(
                        tag: 'product-${product.id}',
                        child: Container(
                          color: AppColors.shimmerBase,
                          child: const Center(
                            child: Icon(
                              Icons.storefront_rounded,
                              size: 80,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ),
                      ),
                // Indicadores de imagen
                if (images.length > 1)
                  Positioned(
                    bottom: 16,
                    left: 0,
                    right: 0,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: List.generate(
                        images.length,
                        (i) => AnimatedContainer(
                          duration: const Duration(milliseconds: 250),
                          margin: const EdgeInsets.symmetric(horizontal: 3),
                          width: _currentImage == i ? 20 : 6,
                          height: 6,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(3),
                            color: _currentImage == i
                                ? AppColors.gold
                                : Colors.white.withValues(alpha: 0.6),
                          ),
                        ),
                      ),
                    ),
                  ),
                // Badge descuento
                if (product.hasDescuento)
                  Positioned(
                    top: 80,
                    right: 16,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFFE53935),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        '${product.descuento}% OFF',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w900,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),

        // ── Información del producto ───────────────────────────────────
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Marca + tipo
                Row(
                  children: [
                    if (product.marca != null)
                      Text(
                        product.marca!.toUpperCase(),
                        style: const TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 1.5,
                        ),
                      ),
                    if (product.marca != null && product.tipoCalzado != null)
                      const Text(
                        ' · ',
                        style: TextStyle(color: AppColors.textSecondary),
                      ),
                    if (product.tipoCalzado != null)
                      Text(
                        product.tipoCalzado!,
                        style: const TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 11,
                        ),
                      ),
                  ],
                ).animate().fadeIn(delay: 100.ms),
                const SizedBox(height: 6),

                // Nombre
                Text(
                  product.nombre,
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: AppColors.textPrimary,
                    height: 1.2,
                  ),
                ).animate().fadeIn(delay: 150.ms),

                const SizedBox(height: 14),

                // Precio
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (product.hasDescuento)
                          Text(
                            product.precioOriginalFormatted,
                            style: const TextStyle(
                              fontSize: 14,
                              color: AppColors.textSecondary,
                              decoration: TextDecoration.lineThrough,
                            ),
                          ),
                        Text(
                          product.precioFormatted,
                          style: TextStyle(
                            fontSize: 28,
                            fontWeight: FontWeight.w900,
                            color: product.hasDescuento
                                ? const Color(0xFFE53935)
                                : AppColors.gold,
                          ),
                        ),
                      ],
                    ),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: product.hasStock
                            ? AppColors.success.withValues(alpha: 0.1)
                            : AppColors.error.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            product.hasStock
                                ? Icons.check_circle_rounded
                                : Icons.cancel_rounded,
                            size: 14,
                            color: product.hasStock
                                ? AppColors.success
                                : AppColors.error,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            product.hasStock
                                ? '${product.stock} en stock'
                                : 'Agotado',
                            style: TextStyle(
                              color: product.hasStock
                                  ? AppColors.success
                                  : AppColors.error,
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ).animate().fadeIn(delay: 200.ms),

                const Divider(height: 32, color: AppColors.shimmerBase),

                // ── Selector de talla ──────────────────────────────────
                if (product.tallas != null && product.tallas!.isNotEmpty) ...[
                  Row(
                    children: [
                      const Text(
                        'Talla',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      if (_selectedTalla != null) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 3,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.gold.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            _selectedTalla!,
                            style: const TextStyle(
                              color: AppColors.gold,
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 10,
                    runSpacing: 10,
                    children: product.tallas!.map((t) {
                      final isSelected = _selectedTalla == t;
                      final stockT = product.stockDeTalla(t);
                      final available =
                          stockT > 0 ||
                          product.tallaStock ==
                              null; // si no hay tallaStock, asumir disponible
                      return GestureDetector(
                        onTap: available
                            ? () => setState(() => _selectedTalla = t)
                            : null,
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          width: 56,
                          height: 52,
                          decoration: BoxDecoration(
                            color: isSelected
                                ? AppColors.black
                                : available
                                ? Colors.white
                                : AppColors.shimmerBase,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: isSelected
                                  ? AppColors.gold
                                  : available
                                  ? const Color(0xFFDDD8CF)
                                  : AppColors.shimmerBase,
                              width: isSelected ? 2 : 1,
                            ),
                            boxShadow: isSelected
                                ? [
                                    BoxShadow(
                                      color: AppColors.gold.withValues(
                                        alpha: 0.3,
                                      ),
                                      blurRadius: 8,
                                      offset: const Offset(0, 3),
                                    ),
                                  ]
                                : null,
                          ),
                          alignment: Alignment.center,
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                t,
                                style: TextStyle(
                                  color: isSelected
                                      ? Colors.white
                                      : available
                                      ? AppColors.textPrimary
                                      : AppColors.textSecondary,
                                  fontWeight: isSelected
                                      ? FontWeight.w800
                                      : FontWeight.w500,
                                  fontSize: 13,
                                ),
                              ),
                              if (product.tallaStock != null && stockT > 0)
                                Text(
                                  '$stockT',
                                  style: TextStyle(
                                    fontSize: 9,
                                    color: isSelected
                                        ? AppColors.gold
                                        : AppColors.textSecondary,
                                  ),
                                ),
                            ],
                          ),
                        ),
                      );
                    }).toList(),
                  ).animate().fadeIn(delay: 300.ms),
                  const SizedBox(height: 20),
                ],

                // ── Color del producto ─────────────────────────────────
                if (product.color != null) ...[
                  Row(
                    children: [
                      const Text(
                        'Color',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 3,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.shimmerBase,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          product.color!,
                          style: const TextStyle(
                            color: AppColors.textPrimary,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                ],

                // ── Descripción ────────────────────────────────────────
                if (product.descripcion.isNotEmpty) ...[
                  const Text(
                    'Descripción',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    product.descripcion,
                    style: const TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 14,
                      height: 1.6,
                    ),
                  ).animate().fadeIn(delay: 350.ms),
                  const SizedBox(height: 20),
                ],

                // ── Detalles del producto ──────────────────────────────
                const _ProductDetailsCard(
                  icon: Icons.local_shipping_outlined,
                  text: 'Envío gratis a Huancayo · 24-48 hrs',
                ),
                const SizedBox(height: 8),
                const _ProductDetailsCard(
                  icon: Icons.verified_outlined,
                  text: 'Compra 100% segura y garantizada',
                ),
                const SizedBox(height: 8),
                const _ProductDetailsCard(
                  icon: Icons.cached_rounded,
                  text: 'Cambios y devoluciones en 7 días',
                ),

                const SizedBox(height: 40),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Barra inferior — precio + cantidad + botón
// ─────────────────────────────────────────────────────────────────────────────

class _BottomBar extends StatelessWidget {
  const _BottomBar({
    required this.product,
    required this.qty,
    required this.onQtyChanged,
    required this.onAddToCart,
  });

  final Product product;
  final int qty;
  final ValueChanged<int> onQtyChanged;
  final VoidCallback onAddToCart;

  @override
  Widget build(BuildContext context) {
    if (!product.hasStock) return const SizedBox();
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 10, 20, 28),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 16,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Fila de precios cuando hay descuento
          if (product.hasDescuento) ...[
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  product.precioOriginalFormatted,
                  style: const TextStyle(
                    fontSize: 13,
                    color: AppColors.textSecondary,
                    decoration: TextDecoration.lineThrough,
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  product.precioFormatted,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFFE53935),
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 7,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xFFE53935),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    '${product.descuento}% OFF',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
          ],
          Row(
            children: [
              // Selector de cantidad
              Container(
                decoration: BoxDecoration(
                  border: Border.all(color: AppColors.shimmerBase),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    _QtyBtn(
                      icon: Icons.remove,
                      onTap: qty > 1 ? () => onQtyChanged(qty - 1) : null,
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      child: Text(
                        '$qty',
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 15,
                        ),
                      ),
                    ),
                    _QtyBtn(
                      icon: Icons.add,
                      onTap: qty < product.stock
                          ? () => onQtyChanged(qty + 1)
                          : null,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 14),
              // Botón principal
              Expanded(
                child: ElevatedButton(
                  onPressed: onAddToCart,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.gold,
                    foregroundColor: AppColors.black,
                    minimumSize: const Size(double.infinity, 52),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                    elevation: 0,
                  ),
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.shopping_bag_outlined, size: 20),
                      SizedBox(width: 8),
                      Text(
                        'Agregar al carrito',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _QtyBtn extends StatelessWidget {
  const _QtyBtn({required this.icon, required this.onTap});
  final IconData icon;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 40,
        height: 40,
        alignment: Alignment.center,
        child: Icon(
          icon,
          size: 18,
          color: onTap != null
              ? AppColors.textPrimary
              : AppColors.textSecondary,
        ),
      ),
    );
  }
}

class _ProductDetailsCard extends StatelessWidget {
  const _ProductDetailsCard({required this.icon, required this.text});
  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.beige,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          Icon(icon, size: 18, color: AppColors.gold),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(
                color: AppColors.textSecondary,
                fontSize: 12,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
