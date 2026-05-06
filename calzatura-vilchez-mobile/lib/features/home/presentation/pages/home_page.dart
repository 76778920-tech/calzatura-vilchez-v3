import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../shared/models/product.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../catalog/presentation/providers/catalog_provider.dart';
import '../../../catalog/presentation/widgets/product_card.dart';

const _heroSlides = [
  _Slide(
    asset: 'assets/images/hero-mujer-ai.png',
    kicker: 'COLECCION MUJER',
    title: 'Botines para caminar con estilo.',
    subtitle:
        'Disenos comodos, versatiles y listos para acompanarte en cada salida.',
    ctaLabel: 'Ver dama',
    category: 'dama',
    badges: ['Elegancia diaria', 'Paso ligero', 'Looks urbanos'],
    tagColor: Color(0xFFE06C9F),
  ),
  _Slide(
    asset: 'assets/images/hero-hombre-botin-ai.png',
    kicker: 'BOTIN HOMBRE',
    title: 'Botines con caracter urbano.',
    subtitle:
        'Disenos resistentes para caminar seguro y mantener presencia todos los dias.',
    ctaLabel: 'Ver hombre',
    category: 'hombre',
    badges: ['Textura premium', 'Base firme', 'Perfil sobrio'],
    tagColor: Color(0xFF6C9FE0),
  ),
  _Slide(
    asset: 'assets/images/hero-ninos-ai.png',
    kicker: 'INFANTIL',
    title: 'Resistencia para jugar, caminar y volver.',
    subtitle:
        'Modelos practicos con tallas claras y comodidad real para la semana.',
    ctaLabel: 'Ver ninos',
    category: 'nino',
    badges: ['Mas juego', 'Ajuste practico', 'Uso diario'],
    tagColor: Color(0xFFFFD166),
  ),
  _Slide(
    asset: 'assets/images/hero-zapatillas-ai.png',
    kicker: 'ZAPATILLAS',
    title: 'Movimiento con comodidad desde el primer paso.',
    subtitle:
        'Zapatillas urbanas, deportivas y casuales para renovar tu rotacion.',
    ctaLabel: 'Ver juvenil',
    category: 'juvenil',
    badges: ['Ciudad activa', 'Comodidad real', 'Cambio de ritmo'],
    tagColor: Color(0xFF4ECDC4),
  ),
  _Slide(
    asset: 'assets/images/hero-formal-ai.png',
    kicker: 'CALZADO FORMAL',
    title: 'Presencia para oficina y eventos.',
    subtitle:
        'Pares pensados para verse bien sin perder comodidad durante el dia.',
    ctaLabel: 'Ver formales',
    category: 'hombre',
    badges: ['Linea limpia', 'Impacto sobrio', 'Comodidad extendida'],
    tagColor: AppColors.gold,
  ),
  _Slide(
    asset: 'assets/images/hero-ofertas-ai.png',
    kicker: 'SELECCION DESTACADA',
    title: 'Descuentos activos en calzado seleccionado.',
    subtitle:
        'Precios claros, stock visible y pares listos para decidir sin dudas.',
    ctaLabel: 'Ver catalogo',
    category: 'todos',
    badges: ['Precios claros', 'Tallas visibles', 'Stock real'],
    tagColor: Color(0xFFFF6B35),
  ),
];

const _promoTicker = [
  'Envio gratis a Huancayo en 24-48 hrs',
  'Nueva coleccion lista para explorar',
  'Cyber Wow con descuentos activos',
  'Compra segura y stock en tiempo real',
  'Cambios disponibles durante 7 dias',
];

const _categoryCards = [
  _CatCard(
    asset: 'assets/images/category-men-editorial.png',
    label: 'Hombre',
    copy: 'Botines, casuales y urbanos',
    category: 'hombre',
  ),
  _CatCard(
    asset: 'assets/images/category-women-editorial.png',
    label: 'Dama',
    copy: 'Modelos comodos con presencia',
    category: 'dama',
  ),
  _CatCard(
    asset: 'assets/images/category-children-editorial.png',
    label: 'Ninos',
    copy: 'Resistentes para el dia a dia',
    category: 'nino',
  ),
  _CatCard(
    asset: 'assets/images/category-sneakers-editorial.png',
    label: 'Zapatillas',
    copy: 'Urbanas, deportivas y casuales',
    category: 'juvenil',
  ),
];

const _campaignCards = [
  _Campaign(
    asset: 'assets/images/cyber-zapatillas-vertical-ai.png',
    label: 'Zapatillas',
    tag: '-30%',
    category: 'juvenil',
  ),
  _Campaign(
    asset: 'assets/images/cyber-escolar-vertical-ai.png',
    label: 'Escolar',
    tag: 'NUEVO',
    category: 'nino',
  ),
];

@immutable
class _Slide {
  const _Slide({
    required this.asset,
    required this.kicker,
    required this.title,
    required this.subtitle,
    required this.ctaLabel,
    required this.category,
    required this.badges,
    required this.tagColor,
  });

  final String asset;
  final String kicker;
  final String title;
  final String subtitle;
  final String ctaLabel;
  final String category;
  final List<String> badges;
  final Color tagColor;
}

@immutable
class _CatCard {
  const _CatCard({
    required this.asset,
    required this.label,
    required this.copy,
    required this.category,
  });

  final String asset;
  final String label;
  final String copy;
  final String category;
}

@immutable
class _Campaign {
  const _Campaign({
    required this.asset,
    required this.label,
    required this.tag,
    required this.category,
  });

  final String asset;
  final String label;
  final String tag;
  final String category;
}

class HomePage extends ConsumerStatefulWidget {
  const HomePage({super.key});

  @override
  ConsumerState<HomePage> createState() => _HomePageState();
}

class _HomePageState extends ConsumerState<HomePage> {
  final _bannerCtrl = PageController();
  int _bannerIdx = 0;
  Timer? _autoTimer;

  @override
  void initState() {
    super.initState();
    _startAutoScroll();
  }

  void _startAutoScroll() {
    _autoTimer?.cancel();
    _autoTimer = Timer.periodic(const Duration(seconds: 6), (_) {
      if (!mounted || !_bannerCtrl.hasClients) return;
      final next = (_bannerIdx + 1) % _heroSlides.length;
      _bannerCtrl.animateToPage(
        next,
        duration: const Duration(milliseconds: 550),
        curve: Curves.easeInOut,
      );
    });
  }

  @override
  void dispose() {
    _autoTimer?.cancel();
    _bannerCtrl.dispose();
    super.dispose();
  }

  Future<void> _refreshHome() async {
    ref.invalidate(productsProvider);
    ref.invalidate(featuredProductsProvider);
    await Future<void>.delayed(const Duration(milliseconds: 100));
  }

  void _goToCatalog([String category = 'todos']) {
    ref.read(selectedCategoryProvider.notifier).state = category;
    context.go('/catalog');
  }

  String _greeting() {
    final displayName = ref.read(currentUserProvider)?.displayName ?? '';
    final parts = displayName.trim().split(RegExp(r'\s+'));
    String cap(String text) {
      if (text.isEmpty) return text;
      return text[0].toUpperCase() + text.substring(1).toLowerCase();
    }

    if (parts.length >= 2) return 'Hola, ${cap(parts[0])} ${cap(parts[1])}';
    if (parts.length == 1 && parts[0].isNotEmpty) {
      return 'Hola, ${cap(parts[0])}';
    }
    return 'Hola';
  }

  @override
  Widget build(BuildContext context) {
    final featuredAsync = ref.watch(featuredProductsProvider);

    return Scaffold(
      backgroundColor: AppColors.beige,
      body: RefreshIndicator(
        color: AppColors.gold,
        displacement: 80,
        onRefresh: _refreshHome,
        child: CustomScrollView(
          physics: const BouncingScrollPhysics(),
          slivers: [
            _buildAppBar(),
            SliverToBoxAdapter(child: _PromoTicker(messages: _promoTicker)),
            SliverToBoxAdapter(
              child: _HeroCarousel(
                slides: _heroSlides,
                controller: _bannerCtrl,
                currentIndex: _bannerIdx,
                onPageChanged: (index) => setState(() => _bannerIdx = index),
                onCategoryTap: _goToCatalog,
              ),
            ),
            const SliverToBoxAdapter(child: _TrustStrip()),
            SliverToBoxAdapter(
              child: _EditorialCategoryGrid(
                cards: _categoryCards,
                onTap: _goToCatalog,
              ),
            ),
            SliverToBoxAdapter(
              child: _CyberWowBanner(onTap: () => _goToCatalog('todos')),
            ),
            SliverToBoxAdapter(
              child: _VerticalCampaigns(
                campaigns: _campaignCards,
                onTap: _goToCatalog,
              ),
            ),
            featuredAsync.when(
              loading: () =>
                  const SliverToBoxAdapter(child: SizedBox(height: 12)),
              error: (error, stackTrace) => SliverToBoxAdapter(
                child: _InlineErrorCard(
                  message: 'No se pudieron cargar los destacados.',
                  onTap: _refreshHome,
                ),
              ),
              data: (featured) => featured.isEmpty
                  ? const SliverToBoxAdapter(child: SizedBox.shrink())
                  : SliverToBoxAdapter(
                      child: _FeaturedSection(
                        products: featured,
                        onViewAll: () => _goToCatalog('todos'),
                      ),
                    ),
            ),
            const SliverToBoxAdapter(child: SizedBox(height: 100)),
          ],
        ),
      ),
    );
  }

  Widget _buildAppBar() {
    return SliverAppBar(
      floating: true,
      snap: true,
      pinned: false,
      toolbarHeight: 60,
      backgroundColor: AppColors.black,
      automaticallyImplyLeading: false,
      centerTitle: false,
      titleSpacing: 16,
      title: Text(
        _greeting(),
        style: const TextStyle(
          color: Colors.white,
          fontSize: 17,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.2,
        ),
      ),
      actions: [
        IconButton(
          icon: const Icon(
            Icons.search_rounded,
            color: Colors.white70,
            size: 22,
          ),
          onPressed: () => _goToCatalog('todos'),
        ),
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

class _PromoTicker extends StatefulWidget {
  const _PromoTicker({required this.messages});

  final List<String> messages;

  @override
  State<_PromoTicker> createState() => _PromoTickerState();
}

class _PromoTickerState extends State<_PromoTicker> {
  int _idx = 0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 3), (_) {
      if (mounted) {
        setState(() => _idx = (_idx + 1) % widget.messages.length);
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 36,
      color: AppColors.gold,
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            color: AppColors.goldDark,
            child: const Text(
              'OFERTA',
              style: TextStyle(
                color: AppColors.black,
                fontSize: 10,
                fontWeight: FontWeight.w900,
                letterSpacing: 1.2,
              ),
            ),
          ),
          Expanded(
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 350),
              child: Padding(
                key: ValueKey(_idx),
                padding: const EdgeInsets.symmetric(horizontal: 12),
                child: Text(
                  widget.messages[_idx],
                  style: const TextStyle(
                    color: AppColors.black,
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ),
          ),
          const Padding(
            padding: EdgeInsets.only(right: 12),
            child: Icon(
              Icons.arrow_forward_ios,
              size: 11,
              color: AppColors.black,
            ),
          ),
        ],
      ),
    );
  }
}

class _HeroCarousel extends StatelessWidget {
  const _HeroCarousel({
    required this.slides,
    required this.controller,
    required this.currentIndex,
    required this.onPageChanged,
    required this.onCategoryTap,
  });

  final List<_Slide> slides;
  final PageController controller;
  final int currentIndex;
  final ValueChanged<int> onPageChanged;
  final ValueChanged<String> onCategoryTap;

  @override
  Widget build(BuildContext context) {
    final active = slides[currentIndex];

    return SizedBox(
      height: 330,
      child: Stack(
        children: [
          PageView.builder(
            controller: controller,
            itemCount: slides.length,
            onPageChanged: onPageChanged,
            itemBuilder: (ctx, index) => _HeroSlide(
              slide: slides[index],
              onTap: () => onCategoryTap(slides[index].category),
            ),
          ),
          Positioned(
            bottom: 18,
            left: 16,
            right: 16,
            child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.40),
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: active.badges
                        .map((badge) => _HeroBadge(label: badge))
                        .toList(),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      ...List.generate(
                        slides.length,
                        (index) => AnimatedContainer(
                          duration: const Duration(milliseconds: 220),
                          margin: const EdgeInsets.only(right: 6),
                          width: index == currentIndex ? 22 : 6,
                          height: 6,
                          decoration: BoxDecoration(
                            color: index == currentIndex
                                ? Colors.white
                                : Colors.white.withValues(alpha: 0.38),
                            borderRadius: BorderRadius.circular(999),
                          ),
                        ),
                      ),
                      const Spacer(),
                      Text(
                        '${currentIndex + 1} / ${slides.length}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _HeroSlide extends StatelessWidget {
  const _HeroSlide({required this.slide, required this.onTap});

  final _Slide slide;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        Image.asset(
          slide.asset,
          fit: BoxFit.cover,
          errorBuilder: (ctx, error, stackTrace) =>
              Container(color: AppColors.black),
        ),
        Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                Colors.black.withValues(alpha: 0.82),
                Colors.black.withValues(alpha: 0.34),
                Colors.transparent,
              ],
              begin: Alignment.bottomCenter,
              end: Alignment.topCenter,
              stops: const [0.0, 0.55, 1.0],
            ),
          ),
        ),
        Positioned(
          left: 20,
          right: 20,
          top: 30,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: slide.tagColor,
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  slide.kicker,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.1,
                  ),
                ),
              ),
              const SizedBox(height: 14),
              Text(
                slide.title,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 30,
                  fontWeight: FontWeight.w900,
                  height: 1.0,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                slide.subtitle,
                style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.78),
                  fontSize: 13,
                  height: 1.35,
                ),
              ),
              const SizedBox(height: 14),
              GestureDetector(
                onTap: onTap,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 10,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(24),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        slide.ctaLabel,
                        style: const TextStyle(
                          color: AppColors.black,
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(width: 4),
                      const Icon(
                        Icons.arrow_forward_rounded,
                        size: 13,
                        color: AppColors.black,
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _HeroBadge extends StatelessWidget {
  const _HeroBadge({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 11,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _TrustStrip extends StatelessWidget {
  const _TrustStrip();

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: const [
            _TrustItem(
              icon: Icons.local_shipping_outlined,
              label: 'Envio a domicilio',
            ),
            SizedBox(width: 18),
            _TrustItem(icon: Icons.shield_outlined, label: 'Pago seguro'),
            SizedBox(width: 18),
            _TrustItem(
              icon: Icons.inventory_2_outlined,
              label: 'Stock en tiempo real',
            ),
            SizedBox(width: 18),
            _TrustItem(
              icon: Icons.support_agent_rounded,
              label: 'Asesoria por WhatsApp',
            ),
          ],
        ),
      ),
    );
  }
}

class _TrustItem extends StatelessWidget {
  const _TrustItem({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 18, color: AppColors.black),
        const SizedBox(width: 8),
        Text(
          label,
          style: const TextStyle(
            color: AppColors.textPrimary,
            fontSize: 12,
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }
}

class _EditorialCategoryGrid extends StatelessWidget {
  const _EditorialCategoryGrid({required this.cards, required this.onTap});

  final List<_CatCard> cards;
  final ValueChanged<String> onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _SectionHeader(
            title: 'Categorias',
            actionLabel: 'Ver todo',
            onAction: () => onTap('todos'),
          ),
          const SizedBox(height: 12),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                flex: 5,
                child: _CategoryTile(
                  card: cards[0],
                  height: 220,
                  onTap: onTap,
                  fontSize: 14,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                flex: 4,
                child: Column(
                  children: [
                    _CategoryTile(
                      card: cards[1],
                      height: 104,
                      onTap: onTap,
                      fontSize: 12,
                    ),
                    const SizedBox(height: 10),
                    _CategoryTile(
                      card: cards[2],
                      height: 104,
                      onTap: onTap,
                      fontSize: 12,
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          _WideCategoryTile(card: cards[3], onTap: onTap),
        ],
      ),
    ).animate().fadeIn(delay: 50.ms);
  }
}

class _CategoryTile extends StatelessWidget {
  const _CategoryTile({
    required this.card,
    required this.height,
    required this.onTap,
    required this.fontSize,
  });

  final _CatCard card;
  final double height;
  final ValueChanged<String> onTap;
  final double fontSize;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => onTap(card.category),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(14),
        child: SizedBox(
          height: height,
          child: Stack(
            fit: StackFit.expand,
            children: [
              Image.asset(
                card.asset,
                fit: BoxFit.cover,
                errorBuilder: (ctx, error, stackTrace) =>
                    Container(color: AppColors.shimmerBase),
              ),
              Positioned(
                bottom: 0,
                left: 0,
                right: 0,
                height: height * 0.52,
                child: Container(
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      colors: [Colors.black87, Colors.transparent],
                      begin: Alignment.bottomCenter,
                      end: Alignment.topCenter,
                    ),
                  ),
                ),
              ),
              Positioned(
                left: 10,
                right: 10,
                bottom: 12,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      card.label.toUpperCase(),
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: fontSize,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.8,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      card.copy,
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.82),
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _WideCategoryTile extends StatelessWidget {
  const _WideCategoryTile({required this.card, required this.onTap});

  final _CatCard card;
  final ValueChanged<String> onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => onTap(card.category),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(14),
        child: Stack(
          children: [
            SizedBox(
              height: 92,
              width: double.infinity,
              child: Image.asset(
                card.asset,
                fit: BoxFit.cover,
                alignment: Alignment.topCenter,
                errorBuilder: (ctx, error, stackTrace) =>
                    Container(color: AppColors.shimmerBase),
              ),
            ),
            Container(
              height: 92,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    AppColors.black.withValues(alpha: 0.68),
                    Colors.transparent,
                  ],
                  begin: Alignment.centerLeft,
                  end: Alignment.centerRight,
                ),
              ),
            ),
            Positioned(
              left: 16,
              top: 0,
              bottom: 0,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'ZAPATILLAS',
                    style: TextStyle(
                      color: AppColors.gold,
                      fontSize: 11,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 1.8,
                    ),
                  ),
                  Text(
                    card.copy,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CyberWowBanner extends StatelessWidget {
  const _CyberWowBanner({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      child: GestureDetector(
        onTap: onTap,
        child: ClipRRect(
          borderRadius: BorderRadius.circular(18),
          child: Stack(
            children: [
              SizedBox(
                height: 152,
                width: double.infinity,
                child: Image.asset(
                  'assets/images/cyber-wow-campaign-mobile-ai.png',
                  fit: BoxFit.cover,
                  errorBuilder: (ctx, error, stackTrace) => Container(
                    color: AppColors.black,
                    child: const Center(
                      child: Text(
                        'CYBER WOW',
                        style: TextStyle(
                          color: AppColors.gold,
                          fontSize: 32,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 3,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              Container(
                height: 152,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      Colors.black.withValues(alpha: 0.10),
                      Colors.black.withValues(alpha: 0.62),
                    ],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                  ),
                ),
              ),
              const Positioned(
                left: 16,
                bottom: 18,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'CYBER WOW',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 24,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 1.4,
                      ),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'Descuentos activos con stock real',
                      style: TextStyle(
                        color: Colors.white70,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
              Positioned(
                right: 16,
                top: 0,
                bottom: 0,
                child: Center(
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.gold,
                      borderRadius: BorderRadius.circular(22),
                    ),
                    child: const Text(
                      'Ver ofertas',
                      style: TextStyle(
                        color: AppColors.black,
                        fontSize: 12,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    ).animate().fadeIn(delay: 100.ms);
  }
}

class _VerticalCampaigns extends StatelessWidget {
  const _VerticalCampaigns({required this.campaigns, required this.onTap});

  final List<_Campaign> campaigns;
  final ValueChanged<String> onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      child: Row(
        children: [
          Expanded(
            child: _CampaignCard(
              campaign: campaigns[0],
              onTap: () => onTap(campaigns[0].category),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _CampaignCard(
              campaign: campaigns[1],
              onTap: () => onTap(campaigns[1].category),
            ),
          ),
        ],
      ),
    ).animate().fadeIn(delay: 150.ms);
  }
}

class _CampaignCard extends StatelessWidget {
  const _CampaignCard({required this.campaign, required this.onTap});

  final _Campaign campaign;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: Stack(
          children: [
            AspectRatio(
              aspectRatio: 0.7,
              child: Image.asset(
                campaign.asset,
                fit: BoxFit.cover,
                errorBuilder: (ctx, error, stackTrace) =>
                    Container(color: AppColors.black),
              ),
            ),
            Positioned(
              top: 10,
              right: 10,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.gold,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  campaign.tag,
                  style: const TextStyle(
                    color: AppColors.black,
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ),
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 10,
                ),
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Colors.black87, Colors.transparent],
                    begin: Alignment.bottomCenter,
                    end: Alignment.topCenter,
                  ),
                ),
                child: Text(
                  campaign.label,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
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

class _FeaturedSection extends StatelessWidget {
  const _FeaturedSection({required this.products, required this.onViewAll});

  final List<Product> products;
  final VoidCallback onViewAll;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(0, 20, 0, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: _SectionHeader(
              title: 'Destacados',
              actionLabel: 'Ver todos',
              onAction: onViewAll,
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 220,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: products.length,
              separatorBuilder: (ctx, index) => const SizedBox(width: 12),
              itemBuilder: (ctx, index) => SizedBox(
                width: 150,
                child: ProductCard(
                  product: products[index],
                  index: index,
                  compact: true,
                  showWishlist: false,
                  showAddToCart: false,
                  showTypeLabel: false,
                ),
              ),
            ),
          ),
        ],
      ),
    ).animate().fadeIn(delay: 200.ms);
  }
}

class _InlineErrorCard extends StatelessWidget {
  const _InlineErrorCard({required this.message, required this.onTap});

  final String message;
  final Future<void> Function() onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 18, 16, 0),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.error.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Row(
          children: [
            const Icon(Icons.error_outline, color: AppColors.error),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                message,
                style: const TextStyle(color: AppColors.error, fontSize: 12),
              ),
            ),
            TextButton(onPressed: onTap, child: const Text('Reintentar')),
          ],
        ),
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({
    required this.title,
    required this.actionLabel,
    required this.onAction,
  });

  final String title;
  final String actionLabel;
  final VoidCallback onAction;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Text(
          title.toUpperCase(),
          style: const TextStyle(
            color: AppColors.textPrimary,
            fontSize: 13,
            fontWeight: FontWeight.w900,
            letterSpacing: 0.8,
          ),
        ),
        const Spacer(),
        GestureDetector(
          onTap: onAction,
          child: Row(
            children: [
              Text(
                actionLabel,
                style: const TextStyle(
                  color: AppColors.gold,
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(width: 2),
              const Icon(
                Icons.arrow_forward_ios,
                size: 11,
                color: AppColors.gold,
              ),
            ],
          ),
        ),
      ],
    );
  }
}
