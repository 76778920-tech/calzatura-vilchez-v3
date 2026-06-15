import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/auth_navigation.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/cv_refresh_wrapper.dart';
import '../../../../shared/widgets/cv_app_bar.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../catalog/presentation/widgets/product_card.dart';
import '../providers/wishlist_provider.dart';

class WishlistPage extends ConsumerWidget {
  const WishlistPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    final productsAsync = ref.watch(wishlistProductsProvider);

    return Scaffold(
      backgroundColor: AppColors.beige,
      body: CVRefreshWrapper(
        onRefresh: () async {
          ref.invalidate(wishlistProvider);
        },
        bubbleTop: 68,
        child: CustomScrollView(
          physics: const BouncingScrollPhysics(
            parent: AlwaysScrollableScrollPhysics(),
          ),
          slivers: [
            CVSliverAppBar(
              title: const CVAppBarTitle(
                heading: 'Mis Favoritos',
                subheading: 'Productos guardados',
              ),
            ),

            // ── Contenido ────────────────────────────────────────────
            if (user == null)
              const SliverFillRemaining(child: _NotLoggedIn())
            else
              productsAsync.when(
                loading: () => const SliverFillRemaining(
                  child: Center(
                    child: CircularProgressIndicator(color: AppColors.gold),
                  ),
                ),
                error: (e, _) => SliverFillRemaining(
                  child: _ErrorState(
                    onRetry: () => ref.invalidate(wishlistProductsProvider),
                  ),
                ),
                data: (products) => products.isEmpty
                    ? const SliverFillRemaining(child: _EmptyState())
                    : SliverPadding(
                        padding: const EdgeInsets.fromLTRB(16, 16, 16, 120),
                        sliver: SliverGrid(
                          delegate: SliverChildBuilderDelegate(
                            (ctx, i) => ProductCard(
                              product: products[i],
                              index: i,
                              showWishlist: true,
                              showAddToCart: true,
                              showTypeLabel: true,
                            ),
                            childCount: products.length,
                          ),
                          gridDelegate:
                              const SliverGridDelegateWithFixedCrossAxisCount(
                                crossAxisCount: 2,
                                childAspectRatio: 0.56,
                                crossAxisSpacing: 12,
                                mainAxisSpacing: 12,
                              ),
                        ),
                      ),
              ),
          ],
        ),
      ),
    );
  }
}

// ── Estados ───────────────────────────────────────────────────────────────────

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 96,
            height: 96,
            decoration: BoxDecoration(
              color: AppColors.gold.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.favorite_border_rounded,
              size: 48,
              color: AppColors.gold,
            ),
          ),
          const SizedBox(height: 20),
          const Text(
            'Sin favoritos aún',
            style: TextStyle(
              color: AppColors.textPrimary,
              fontSize: 18,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Toca el corazón en cualquier producto\npara guardarlo aquí.',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: AppColors.textSecondary,
              fontSize: 13,
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }
}

class _NotLoggedIn extends StatelessWidget {
  const _NotLoggedIn();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.lock_outline_rounded,
              size: 56,
              color: AppColors.textSecondary,
            ),
            const SizedBox(height: 16),
            const Text(
              'Inicia sesión para ver\ntus favoritos',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: AppColors.textSecondary,
                fontSize: 14,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () =>
                    context.go(loginPathWithRedirect('/wishlist')),
                child: const Text('Iniciar sesión'),
              ),
            ),
            TextButton(
              onPressed: () => context.go(
                '/register?redirect=${Uri.encodeComponent('/wishlist')}',
              ),
              child: const Text('Crear cuenta'),
            ),
          ],
        ),
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.onRetry});
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(
            Icons.wifi_off_rounded,
            size: 48,
            color: AppColors.textSecondary,
          ),
          const SizedBox(height: 16),
          const Text(
            'Error al cargar favoritos',
            style: TextStyle(color: AppColors.textSecondary),
          ),
          const SizedBox(height: 12),
          ElevatedButton(onPressed: onRetry, child: const Text('Reintentar')),
        ],
      ),
    );
  }
}
