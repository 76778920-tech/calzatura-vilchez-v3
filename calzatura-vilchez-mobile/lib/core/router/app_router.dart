import 'package:animations/animations.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/admin/presentation/pages/admin_dashboard_page.dart';
import '../../features/admin/presentation/pages/admin_manufacturers_page.dart';
import '../../features/admin/presentation/pages/admin_orders_page.dart';
import '../../features/admin/presentation/pages/admin_predictions_page.dart';
import '../../features/admin/presentation/pages/admin_products_page.dart';
import '../../features/admin/presentation/pages/admin_sales_page.dart';
import '../../features/admin/presentation/pages/admin_users_page.dart';
import '../../features/auth/presentation/pages/login_page.dart';
import '../../features/auth/presentation/pages/register_page.dart';
import '../../features/auth/presentation/pages/splash_page.dart';
import '../../features/auth/presentation/providers/auth_provider.dart';
import '../../features/cart/presentation/pages/cart_page.dart';
import '../../features/checkout/presentation/pages/checkout_page.dart';
import '../../features/catalog/presentation/pages/catalog_page.dart';
import '../../features/home/presentation/pages/home_page.dart';
import '../../features/orders/presentation/pages/orders_page.dart';
import '../../features/orders/presentation/pages/order_success_page.dart';
import '../../features/product/presentation/pages/product_detail_page.dart';
import '../../features/profile/presentation/pages/profile_page.dart';
import '../../features/shell/presentation/pages/shell_page.dart';
import '../../features/wishlist/presentation/pages/wishlist_page.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authStateProvider);
  final roleAsync = ref.watch(userRoleProvider);

  return GoRouter(
    initialLocation: '/splash',
    redirect: (context, state) {
      final isLoading = authState.isLoading;
      final isAuth = authState.valueOrNull != null;
      final loc = state.matchedLocation;
      final isOnAuth =
          loc == '/login' || loc == '/register' || loc == '/splash';

      if (isLoading) return '/splash';
      if (!isAuth && !isOnAuth) return '/login';

      if (isAuth && !isOnAuth) {
        final role = roleAsync.valueOrNull;
        if (role == 'admin' || role == 'trabajador') {
          const allowed = [
            '/admin',
            '/home',
            '/catalog',
            '/cart',
            '/checkout',
            '/order-success',
            '/wishlist',
            '/profile',
          ];
          if (!allowed.any((p) => loc.startsWith(p))) {
            return '/admin';
          }
        }
      }

      if (isAuth && isOnAuth && loc != '/splash') {
        final role = roleAsync.valueOrNull;
        if (role == 'admin' || role == 'trabajador') return '/admin';
        return '/home';
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/splash',
        pageBuilder: (ctx, s) => NoTransitionPage(child: SplashPage()),
      ),
      GoRoute(
        path: '/login',
        pageBuilder: (ctx, s) => _fadePage(const LoginPage()),
      ),
      GoRoute(
        path: '/register',
        pageBuilder: (ctx, s) => _sharedAxisPage(const RegisterPage()),
      ),
      GoRoute(
        path: '/checkout',
        pageBuilder: (ctx, s) => _sharedAxisPage(const CheckoutPage()),
      ),
      GoRoute(
        path: '/order-success/:id',
        pageBuilder: (ctx, state) => _sharedAxisPage(
          OrderSuccessPage(orderId: state.pathParameters['id']!),
        ),
      ),
      GoRoute(
        path: '/admin',
        pageBuilder: (ctx, s) => _fadePage(const AdminDashboardPage()),
        routes: [
          GoRoute(
            path: 'productos',
            pageBuilder: (ctx, s) => _sharedAxisPage(const AdminProductsPage()),
          ),
          GoRoute(
            path: 'pedidos',
            pageBuilder: (ctx, s) => _sharedAxisPage(const AdminOrdersPage()),
          ),
          GoRoute(
            path: 'ventas',
            pageBuilder: (ctx, s) => _sharedAxisPage(const AdminSalesPage()),
          ),
          GoRoute(
            path: 'usuarios',
            pageBuilder: (ctx, s) => _sharedAxisPage(const AdminUsersPage()),
          ),
          GoRoute(
            path: 'fabricantes',
            pageBuilder: (ctx, s) =>
                _sharedAxisPage(const AdminManufacturersPage()),
          ),
          GoRoute(
            path: 'predicciones',
            pageBuilder: (ctx, s) =>
                _sharedAxisPage(const AdminPredictionsPage()),
          ),
        ],
      ),
      ShellRoute(
        builder: (context, state, child) => ShellPage(child: child),
        routes: [
          GoRoute(
            path: '/home',
            pageBuilder: (ctx, s) => _fadePage(const HomePage()),
          ),
          GoRoute(
            path: '/catalog',
            pageBuilder: (ctx, s) => _fadePage(const CatalogPage()),
            routes: [
              GoRoute(
                path: ':id',
                pageBuilder: (ctx, state) {
                  final id = state.pathParameters['id']!;
                  final extra = state.extra as Map<String, dynamic>?;
                  return _fadePage(
                    ProductDetailPage(productId: id, heroData: extra),
                  );
                },
              ),
            ],
          ),
          GoRoute(
            path: '/wishlist',
            pageBuilder: (ctx, s) => _fadePage(const WishlistPage()),
          ),
          GoRoute(
            path: '/cart',
            pageBuilder: (ctx, s) => _sharedAxisPage(const CartPage()),
          ),
          GoRoute(
            path: '/profile',
            pageBuilder: (ctx, s) => _fadePage(const ProfilePage()),
            routes: [
              GoRoute(
                path: 'orders',
                pageBuilder: (ctx, s) => _sharedAxisPage(const OrdersPage()),
              ),
            ],
          ),
        ],
      ),
    ],
  );
});

CustomTransitionPage<T> _fadePage<T>(Widget child) {
  return CustomTransitionPage<T>(
    child: child,
    transitionDuration: const Duration(milliseconds: 250),
    transitionsBuilder: (ctx, animation, secondary, c) =>
        FadeTransition(opacity: animation, child: c),
  );
}

CustomTransitionPage<T> _sharedAxisPage<T>(Widget child) {
  return CustomTransitionPage<T>(
    child: child,
    transitionDuration: const Duration(milliseconds: 300),
    transitionsBuilder: (ctx, animation, secondaryAnimation, c) =>
        SharedAxisTransition(
          animation: animation,
          secondaryAnimation: secondaryAnimation,
          transitionType: SharedAxisTransitionType.horizontal,
          child: c,
        ),
  );
}
