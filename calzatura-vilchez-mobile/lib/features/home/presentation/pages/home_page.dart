import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../shared/models/product.dart';
import '../../../../shared/widgets/cv_refresh_wrapper.dart';
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
    label: 'Lo mejor en zapatillas',
    btnLabel: 'Ver zapatillas',
    btnCategory: 'juvenil',
  ),
  _Campaign(
    asset: 'assets/images/cyber-escolar-vertical-ai.png',
    label: 'Lo mejor en zapato escolar',
    btnLabel: 'Ver escolar',
    btnCategory: 'nino',
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
    required this.btnLabel,
    required this.btnCategory,
  });

  final String asset;
  final String label;
  final String btnLabel;
  final String btnCategory;
}

class HomePage extends ConsumerStatefulWidget {
  const HomePage({super.key});

  @override
  ConsumerState<HomePage> createState() => _HomePageState();
}

class _HomePageState extends ConsumerState<HomePage> {
  static const int _kInitialPage =
      600; // múltiplo de 6 slides → bucle infinito limpio
  late final PageController _bannerCtrl = PageController(
    initialPage: _kInitialPage,
  );
  int _bannerPage = _kInitialPage;
  int get _bannerIdx => _bannerPage % _heroSlides.length;
  Timer? _autoTimer;
  bool _heroPreloaded = false;

  @override
  void initState() {
    super.initState();
    _startAutoScroll();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_heroPreloaded) {
      _heroPreloaded = true;
      for (final slide in _heroSlides) {
        precacheImage(AssetImage(slide.asset), context);
      }
    }
  }

  void _startAutoScroll() {
    _autoTimer?.cancel();
    _autoTimer = Timer.periodic(const Duration(seconds: 6), (_) {
      if (!mounted || !_bannerCtrl.hasClients) return;
      _bannerCtrl.animateToPage(
        _bannerPage + 1,
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
    await Future<void>.delayed(const Duration(milliseconds: 800));
  }

  void _goToCatalog([String category = 'todos']) {
    ref.read(selectedCategoryProvider.notifier).state = category;
    context.go('/catalog');
  }

  String _greeting(String name) {
    if (name.isEmpty) return 'Hola';
    return 'Hola, $name';
  }

  @override
  Widget build(BuildContext context) {
    final featuredAsync = ref.watch(featuredProductsProvider);

    return Scaffold(
      backgroundColor: AppColors.beige,
      body: CVRefreshWrapper(
        onRefresh: _refreshHome,
        bubbleTop: 68,
        child: CustomScrollView(
          physics: const BouncingScrollPhysics(
            parent: AlwaysScrollableScrollPhysics(),
          ),
          slivers: [
            _buildAppBar(),
            SliverToBoxAdapter(child: _PromoTicker(messages: _promoTicker)),
            SliverToBoxAdapter(
              child: _HeroCarousel(
                slides: _heroSlides,
                controller: _bannerCtrl,
                currentIndex: _bannerIdx,
                onPageChanged: (page) => setState(() => _bannerPage = page),
                onCategoryTap: _goToCatalog,
              ),
            ),
            const SliverToBoxAdapter(child: _TrustStrip()),
            SliverToBoxAdapter(
              child: _CyberWowBanner(
                onTapHombre: () => _goToCatalog('hombre'),
                onTapMujer: () => _goToCatalog('dama'),
              ),
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
            SliverToBoxAdapter(
              child: _EditorialCategoryGrid(
                cards: _categoryCards,
                onTap: _goToCatalog,
              ),
            ),
            const SliverToBoxAdapter(child: SizedBox(height: 100)),
          ],
        ),
      ),
    );
  }

  Widget _buildAppBar() {
    final name = ref.watch(userDisplayNameProvider).valueOrNull ?? '';
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
        _greeting(name),
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
            onPageChanged: onPageChanged,
            itemBuilder: (ctx, index) {
              final slide = slides[index % slides.length];
              return _HeroSlide(
                slide: slide,
                onTap: () => onCategoryTap(slide.category),
              );
            },
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
              child: Wrap(
                spacing: 8,
                runSpacing: 8,
                children: active.badges
                    .map((badge) => _HeroBadge(label: badge))
                    .toList(),
              ),
            ),
          ),
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: _HeroProgressBar(
              currentIndex: currentIndex,
              totalDuration: const Duration(seconds: 6),
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

class _HeroProgressBar extends StatefulWidget {
  const _HeroProgressBar({
    required this.currentIndex,
    required this.totalDuration,
  });

  final int currentIndex;
  final Duration totalDuration;

  @override
  State<_HeroProgressBar> createState() => _HeroProgressBarState();
}

class _HeroProgressBarState extends State<_HeroProgressBar>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: widget.totalDuration);
    _ctrl.forward();
  }

  @override
  void didUpdateWidget(_HeroProgressBar old) {
    super.didUpdateWidget(old);
    if (old.currentIndex != widget.currentIndex) {
      _ctrl
        ..reset()
        ..forward();
    }
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 4,
      child: AnimatedBuilder(
        animation: _ctrl,
        builder: (ctx, _) => Stack(
          fit: StackFit.expand,
          children: [
            Container(color: Colors.white.withValues(alpha: 0.15)),
            FractionallySizedBox(
              alignment: Alignment.centerLeft,
              widthFactor: _ctrl.value,
              child: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      Color(0xFFC9A227),
                      AppColors.gold,
                      Color(0xFFF6DC72),
                    ],
                  ),
                  boxShadow: [
                    BoxShadow(color: Color(0x55C9A227), blurRadius: 8),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TrustStrip extends StatefulWidget {
  const _TrustStrip();

  @override
  State<_TrustStrip> createState() => _TrustStripState();
}

class _TrustStripState extends State<_TrustStrip> {
  late final ScrollController _scroll;
  Timer? _timer;

  static const _items = [
    (Icons.local_shipping_outlined, 'Envio a domicilio'),
    (Icons.shield_outlined, 'Pago seguro'),
    (Icons.inventory_2_outlined, 'Stock en tiempo real'),
    (Icons.support_agent_rounded, 'Asesoria por WhatsApp'),
  ];

  @override
  void initState() {
    super.initState();
    _scroll = ScrollController();
    // 16ms ≈ 60fps; 0.75px por frame ≈ 45px/s
    _timer = Timer.periodic(const Duration(milliseconds: 16), (_) {
      if (!mounted || !_scroll.hasClients) return;
      final max = _scroll.position.maxScrollExtent;
      if (max <= 0) return;
      final half = max / 2;
      var next = _scroll.offset + 0.75;
      if (next >= half) next -= half;
      _scroll.jumpTo(next);
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _scroll.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    Widget item((IconData, String) d) => Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: _TrustItem(icon: d.$1, label: d.$2),
    );

    return Container(
      height: 44,
      color: Colors.white,
      child: SingleChildScrollView(
        controller: _scroll,
        scrollDirection: Axis.horizontal,
        physics: const NeverScrollableScrollPhysics(),
        child: Row(
          children: [
            // Dos copias idénticas para el loop continuo sin salto visible
            ..._items.map(item),
            ..._items.map(item),
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
    // cards[0]=Hombre  cards[1]=Dama  cards[2]=Ninos  cards[3]=Zapatillas
    // Layout: Hombre (full) / Dama+Zapatillas (row) / Ninos (full)
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 24, 16, 14),
          child: _SectionHeader(
            title: 'Categorias',
            actionLabel: 'Ver todo',
            onAction: () => onTap('todos'),
          ),
        ),
        Column(
          children: [
            // ── Fila 1: HOMBRE ancho completo ─────────────────
            SizedBox(
              height: 210,
              width: double.infinity,
              child: _CategoryTile(
                card: cards[0],
                fontSize: 18,
                onTap: onTap,
                borderRadius: BorderRadius.zero,
              ),
            ),
            // ── Fila 2: DAMA + ZAPATILLAS ─────────────────────
            SizedBox(
              height: 165,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Expanded(
                    child: _CategoryTile(
                      card: cards[1],
                      fontSize: 14,
                      onTap: onTap,
                      borderRadius: BorderRadius.zero,
                    ),
                  ),
                  Expanded(
                    child: _CategoryTile(
                      card: cards[3],
                      fontSize: 14,
                      onTap: onTap,
                      borderRadius: BorderRadius.zero,
                    ),
                  ),
                ],
              ),
            ),
            // ── Fila 3: NIÑOS ancho completo ──────────────────
            SizedBox(
              height: 155,
              width: double.infinity,
              child: _CategoryTile(
                card: cards[2],
                fontSize: 16,
                onTap: onTap,
                borderRadius: BorderRadius.zero,
              ),
            ),
          ],
        ),
      ],
    ).animate().fadeIn(delay: 50.ms);
  }
}

class _CategoryTile extends StatelessWidget {
  const _CategoryTile({
    required this.card,
    required this.fontSize,
    required this.onTap,
    this.borderRadius = const BorderRadius.all(Radius.circular(12)),
  });

  final _CatCard card;
  final double fontSize;
  final ValueChanged<String> onTap;
  final BorderRadius borderRadius;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => onTap(card.category),
      child: ClipRRect(
        borderRadius: borderRadius,
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
              height: 110,
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
              left: 14,
              right: 14,
              bottom: 14,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
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
                  const SizedBox(height: 3),
                  Text(
                    card.copy,
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.82),
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
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
  const _CyberWowBanner({required this.onTapHombre, required this.onTapMujer});

  final VoidCallback onTapHombre;
  final VoidCallback onTapMujer;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 200,
      width: double.infinity,
      child: Stack(
        fit: StackFit.expand,
        children: [
          Container(color: AppColors.black),
          Image.asset(
            'assets/images/cyber-wow-campaign-ai.png',
            fit: BoxFit.cover,
            alignment: Alignment.center,
            errorBuilder: (ctx, error, stackTrace) =>
                Container(color: AppColors.black),
          ),
          // Overlay oscuro uniforme para legibilidad sin tapar la imagen
          Container(color: Colors.black.withValues(alpha: 0.46)),
          // Glow dorado sutil centrado-abajo (igual que la web)
          Positioned(
            bottom: 20,
            left: 0,
            right: 0,
            child: Center(
              child: Container(
                width: 260,
                height: 100,
                decoration: BoxDecoration(
                  gradient: RadialGradient(
                    colors: [
                      const Color(0xFFC9A227).withValues(alpha: 0.28),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
            ),
          ),
          // Contenido centrado: título + dos botones
          Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text(
                'CYBER WOW',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 44,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 5,
                  height: 0.9,
                ),
              ),
              const SizedBox(height: 28),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Row(
                  children: [
                    Expanded(
                      child: _CyberCtaButton(
                        label: 'CYBER HOMBRE',
                        onTap: onTapHombre,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _CyberCtaButton(
                        label: 'CYBER MUJER',
                        onTap: onTapMujer,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    ).animate().fadeIn(delay: 100.ms);
  }
}

class _CyberCtaButton extends StatelessWidget {
  const _CyberCtaButton({required this.label, required this.onTap});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 52,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: Colors.black.withValues(alpha: 0.62),
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: Colors.white.withValues(alpha: 0.20)),
        ),
        child: Text(
          label,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 11,
            fontWeight: FontWeight.w900,
            letterSpacing: 1.0,
          ),
        ),
      ),
    );
  }
}

class _VerticalCampaigns extends StatelessWidget {
  const _VerticalCampaigns({required this.campaigns, required this.onTap});

  final List<_Campaign> campaigns;
  final ValueChanged<String> onTap;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        _CampaignCard(campaign: campaigns[0], onTap: onTap),
        _CampaignCard(campaign: campaigns[1], onTap: onTap),
      ],
    ).animate().fadeIn(delay: 150.ms);
  }
}

class _CampaignCard extends StatelessWidget {
  const _CampaignCard({required this.campaign, required this.onTap});

  final _Campaign campaign;
  final ValueChanged<String> onTap;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 620,
      child: Stack(
        fit: StackFit.expand,
        children: [
          Image.asset(
            campaign.asset,
            fit: BoxFit.cover,
            alignment: Alignment.center,
            errorBuilder: (ctx, error, stackTrace) =>
                Container(color: AppColors.black),
          ),
          // Gradiente de abajo hacia arriba para legibilidad del texto
          Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Colors.black87, Colors.black38, Colors.transparent],
                begin: Alignment.bottomCenter,
                end: Alignment.topCenter,
                stops: [0.0, 0.45, 1.0],
              ),
            ),
          ),
          // Contenido centrado vertical y horizontalmente
          Positioned.fill(
            child: Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 40),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      campaign.label.toUpperCase(),
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 34,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 1.0,
                        height: 1.1,
                      ),
                    ),
                    const SizedBox(height: 24),
                    SizedBox(
                      width: 200,
                      child: _CampaignButton(
                        label: campaign.btnLabel.toUpperCase(),
                        onTap: () => onTap(campaign.btnCategory),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _CampaignButton extends StatelessWidget {
  const _CampaignButton({required this.label, required this.onTap});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: double.infinity,
        height: 50,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(4),
          border: Border.all(color: Colors.white.withValues(alpha: 0.70)),
        ),
        child: Text(
          label,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 13,
            fontWeight: FontWeight.w800,
            letterSpacing: 2.0,
          ),
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
            height: 300,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: products.length,
              separatorBuilder: (ctx, index) => const SizedBox(width: 12),
              itemBuilder: (ctx, index) => SizedBox(
                width: 185,
                child: ProductCard(
                  product: products[index],
                  index: index,
                  compact: true,
                  showWishlist: true,
                  showAddToCart: true,
                  showTypeLabel: true,
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
