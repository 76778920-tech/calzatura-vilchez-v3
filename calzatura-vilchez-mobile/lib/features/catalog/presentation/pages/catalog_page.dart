import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/cv_refresh_wrapper.dart';
import '../../../../shared/widgets/cv_app_bar.dart';
import '../../../../shared/widgets/shimmer_grid.dart';
import '../providers/catalog_provider.dart';
import '../widgets/product_card.dart';

class CatalogPage extends ConsumerStatefulWidget {
  const CatalogPage({super.key});

  @override
  ConsumerState<CatalogPage> createState() => _CatalogPageState();
}

class _CatalogPageState extends ConsumerState<CatalogPage> {
  final _searchCtrl = TextEditingController();
  bool _searchActive = false;

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  void _selectCategory(String cat) {
    ref.read(selectedCategoryProvider.notifier).state = cat;
    ref.read(searchQueryProvider.notifier).state = '';
    if (_searchActive) setState(() => _searchActive = false);
    _searchCtrl.clear();
  }

  @override
  Widget build(BuildContext context) {
    final categories = ref.watch(categoriesProvider);
    final selected = ref.watch(selectedCategoryProvider);
    final productsAsync = ref.watch(productsProvider);

    return Scaffold(
      backgroundColor: AppColors.beige,
      body: CVRefreshWrapper(
        onRefresh: () async => ref.invalidate(productsProvider),
        bubbleTop: 68,
        child: CustomScrollView(
          physics: const BouncingScrollPhysics(
            parent: AlwaysScrollableScrollPhysics(),
          ),
          slivers: [
            _buildAppBar(),
            SliverPersistentHeader(
              pinned: true,
              delegate: _CategoryDelegate(
                categories: categories,
                selected: selected,
                onSelect: _selectCategory,
              ),
            ),
            productsAsync.when(
              loading: () =>
                  const SliverToBoxAdapter(child: ShimmerGrid(count: 6)),
              error: (err, s) => SliverToBoxAdapter(
                child: _ErrorState(
                  onRetry: () => ref.invalidate(productsProvider),
                  message: err.toString(),
                ),
              ),
              data: (products) => products.isEmpty
                  ? SliverToBoxAdapter(child: _EmptyState())
                  : SliverPadding(
                      padding: const EdgeInsets.fromLTRB(16, 4, 16, 120),
                      sliver: SliverGrid(
                        delegate: SliverChildBuilderDelegate(
                          (ctx, i) =>
                              ProductCard(product: products[i], index: i),
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

  Widget _buildAppBar() {
    return CVSliverAppBar(
      title: _searchActive
          ? TextField(
              controller: _searchCtrl,
              autofocus: true,
              style: const TextStyle(color: Colors.white, fontSize: 14),
              cursorColor: AppColors.gold,
              decoration: InputDecoration(
                hintText: 'Buscar productos, marcas...',
                hintStyle: const TextStyle(color: Colors.white38, fontSize: 13),
                filled: true,
                fillColor: Colors.white.withValues(alpha: 0.1),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 8,
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: BorderSide.none,
                ),
                prefixIcon: const Icon(
                  Icons.search,
                  color: Colors.white38,
                  size: 18,
                ),
              ),
              onChanged: (v) =>
                  ref.read(searchQueryProvider.notifier).state = v.trim(),
            )
          : const CVAppBarTitle(
              heading: 'Tienda',
              subheading: 'Todos los productos',
            ),
      actions: [
        IconButton(
          icon: Icon(
            _searchActive ? Icons.close : Icons.search_rounded,
            color: Colors.white70,
            size: 22,
          ),
          onPressed: () {
            setState(() {
              _searchActive = !_searchActive;
              if (!_searchActive) {
                _searchCtrl.clear();
                ref.read(searchQueryProvider.notifier).state = '';
              }
            });
          },
        ),
        if (!_searchActive)
          IconButton(
            tooltip: 'Teachable Machine',
            icon: const Icon(
              Icons.image_search_rounded,
              color: Colors.white70,
              size: 22,
            ),
            onPressed: () => context.push('/teachable'),
          ),
        if (!_searchActive)
          IconButton(
            icon: const Icon(
              Icons.person_outline_rounded,
              color: Colors.white70,
              size: 22,
            ),
            onPressed: () => context.go('/profile'),
          ),
        const SizedBox(width: 4),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Encabezado del catálogo
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Category chips delegate
// ─────────────────────────────────────────────────────────────────────────────

class _CategoryDelegate extends SliverPersistentHeaderDelegate {
  _CategoryDelegate({
    required this.categories,
    required this.selected,
    required this.onSelect,
  });
  final List<Map<String, String>> categories;
  final String selected;
  final ValueChanged<String> onSelect;

  @override
  double get minExtent => 52;
  @override
  double get maxExtent => 52;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlaps) {
    return Container(
      color: AppColors.beige,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        itemCount: categories.length,
        separatorBuilder: (ctx, i) => const SizedBox(width: 8),
        itemBuilder: (ctx, i) {
          final cat = categories[i];
          final isSelected = cat['id'] == selected;
          return FilterChip(
            label: Text(cat['label']!),
            selected: isSelected,
            onSelected: (_) => onSelect(cat['id']!),
            backgroundColor: Colors.white,
            selectedColor: AppColors.black,
            checkmarkColor: AppColors.gold,
            labelStyle: TextStyle(
              color: isSelected ? Colors.white : AppColors.textSecondary,
              fontWeight: isSelected ? FontWeight.w700 : FontWeight.normal,
              fontSize: 13,
            ),
            side: BorderSide(
              color: isSelected ? AppColors.black : AppColors.shimmerBase,
            ),
            elevation: isSelected ? 3 : 0,
            shadowColor: AppColors.black.withValues(alpha: 0.2),
          );
        },
      ),
    );
  }

  @override
  bool shouldRebuild(_CategoryDelegate old) => old.selected != selected;
}

// ─────────────────────────────────────────────────────────────────────────────
// Estados
// ─────────────────────────────────────────────────────────────────────────────

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.onRetry, this.message});
  final VoidCallback onRetry;
  final String? message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          children: [
            const Icon(
              Icons.wifi_off_rounded,
              size: 56,
              color: AppColors.textSecondary,
            ),
            const SizedBox(height: 16),
            const Text(
              'Error al cargar productos',
              style: TextStyle(color: AppColors.textSecondary),
            ),
            if (message != null) ...[
              const SizedBox(height: 6),
              Text(
                message!,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 12,
                ),
              ),
            ],
            const SizedBox(height: 12),
            ElevatedButton(onPressed: onRetry, child: const Text('Reintentar')),
          ],
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(60),
        child: Column(
          children: [
            Icon(
              Icons.search_off_rounded,
              size: 64,
              color: AppColors.textSecondary.withValues(alpha: 0.4),
            ),
            const SizedBox(height: 16),
            const Text(
              'No se encontraron productos',
              style: TextStyle(color: AppColors.textSecondary, fontSize: 15),
            ),
          ],
        ),
      ),
    );
  }
}
