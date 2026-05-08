import 'package:badges/badges.dart' as badges;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/cv_logo.dart';
import '../../../cart/presentation/providers/cart_provider.dart';

class ShellPage extends ConsumerWidget {
  const ShellPage({super.key, required this.child});

  final Widget child;

  static const _tabs = ['/home', '/catalog', '/wishlist', '/cart'];

  int _currentIndex(String location) {
    for (int i = 0; i < _tabs.length; i++) {
      if (location.startsWith(_tabs[i])) return i;
    }
    return 0;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final location = GoRouterState.of(context).matchedLocation;
    final cartCount = ref.watch(cartItemCountProvider);
    final currentIdx = _currentIndex(location);

    return Scaffold(
      body: child,
      bottomNavigationBar: _FloatingNav(
        currentIdx: currentIdx,
        cartCount: cartCount,
        onTap: (i) {
          switch (i) {
            case 0:
              context.go('/home');
            case 1:
              context.go('/catalog');
            case 2:
              context.go('/wishlist');
            case 3:
              context.go('/cart');
          }
        },
      ),
    );
  }
}

class _FloatingNav extends StatelessWidget {
  const _FloatingNav({
    required this.currentIdx,
    required this.cartCount,
    required this.onTap,
  });

  final int currentIdx;
  final int cartCount;
  final ValueChanged<int> onTap;

  @override
  Widget build(BuildContext context) {
    final bottomPadding = MediaQuery.of(context).padding.bottom;
    return Container(
      decoration: BoxDecoration(
        color: AppColors.black,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.35),
            blurRadius: 24,
            offset: const Offset(0, -4),
          ),
          BoxShadow(
            color: AppColors.gold.withValues(alpha: 0.10),
            blurRadius: 12,
            offset: const Offset(0, -1),
          ),
        ],
      ),
      padding: EdgeInsets.only(bottom: bottomPadding),
      height: 60 + bottomPadding,
      child: Row(
        children: [
          _NavIcon(
            icon: Icons.home_outlined,
            activeIcon: Icons.home_rounded,
            selected: currentIdx == 0,
            onTap: () => onTap(0),
            customIcon: CVLogo(size: 26, opacity: currentIdx == 0 ? 1.0 : 0.35),
          ),
          _NavIcon(
            icon: Icons.storefront_outlined,
            activeIcon: Icons.storefront_rounded,
            selected: currentIdx == 1,
            onTap: () => onTap(1),
          ),
          _NavIcon(
            icon: Icons.favorite_border_rounded,
            activeIcon: Icons.favorite_rounded,
            selected: currentIdx == 2,
            onTap: () => onTap(2),
          ),
          _NavIcon(
            icon: Icons.shopping_bag_outlined,
            activeIcon: Icons.shopping_bag_rounded,
            selected: currentIdx == 3,
            badge: cartCount > 0 ? cartCount.toString() : null,
            onTap: () => onTap(3),
          ),
        ],
      ),
    );
  }
}

class _NavIcon extends StatelessWidget {
  const _NavIcon({
    required this.icon,
    required this.activeIcon,
    required this.selected,
    required this.onTap,
    this.badge,
    this.customIcon,
  });

  final IconData icon;
  final IconData activeIcon;
  final bool selected;
  final VoidCallback onTap;
  final String? badge;
  final Widget? customIcon;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeInOut,
          margin: const EdgeInsets.all(7),
          decoration: BoxDecoration(
            color: selected
                ? AppColors.gold.withValues(alpha: 0.18)
                : Colors.transparent,
            borderRadius: BorderRadius.circular(24),
          ),
          child: Center(child: _buildIcon()),
        ),
      ),
    );
  }

  Widget _buildIcon() {
    if (customIcon != null) return customIcon!;
    final color = selected ? AppColors.gold : Colors.white38;
    final iconWidget = Icon(
      selected ? activeIcon : icon,
      color: color,
      size: 24,
    );

    if (badge != null) {
      return badges.Badge(
        badgeContent: Text(
          badge!,
          style: const TextStyle(
            color: AppColors.black,
            fontSize: 9,
            fontWeight: FontWeight.w800,
          ),
        ),
        badgeStyle: const badges.BadgeStyle(
          badgeColor: AppColors.gold,
          padding: EdgeInsets.all(3),
        ),
        child: iconWidget,
      );
    }
    return iconWidget;
  }
}
