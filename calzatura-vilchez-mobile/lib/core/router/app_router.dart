import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../config/app_platform.dart';
import '../../features/auth/presentation/pages/login_page.dart';
import '../../features/auth/presentation/pages/register_page.dart';
import '../../features/auth/presentation/pages/splash_page.dart';
import '../../features/auth/presentation/pages/verify_email_page.dart';
import '../../features/auth/presentation/providers/auth_provider.dart';
import '../../features/cart/presentation/pages/cart_page.dart';
import '../../features/checkout/presentation/pages/checkout_page.dart';
import '../../features/catalog/presentation/pages/catalog_page.dart';
import '../../features/home/presentation/pages/home_page.dart';
import '../../features/orders/presentation/pages/orders_page.dart';
import '../../features/orders/presentation/pages/order_success_page.dart';
import '../../features/product/presentation/pages/product_detail_page.dart';
import '../../features/profile/presentation/pages/edit_profile_page.dart';
import '../../features/profile/presentation/pages/profile_page.dart';
import '../../features/recommendation/presentation/pages/teachable_machine_page.dart';
import '../../features/sensors/presentation/pages/device_sensors_page.dart';
import '../../features/shell/presentation/pages/shell_page.dart';
import '../../features/wishlist/presentation/pages/wishlist_page.dart';
import 'admin_routes.dart';
import 'app_router_transitions.dart';
import 'auth_navigation.dart';

/// Notifica al GoRouter cuando cambia el estado de auth o el rol.
/// Permite usar refreshListenable en lugar de recrear el GoRouter completo,
/// preservando el stack de navegación entre cambios de estado.
class _RouterRefreshNotifier extends ChangeNotifier {
  _RouterRefreshNotifier(Ref ref) {
    ref.listen(authStateProvider, (_, _) => notifyListeners());
    ref.listen(userRoleProvider, (_, _) => notifyListeners());
  }
}

final appRouterProvider = Provider<GoRouter>((ref) {
  final notifier = _RouterRefreshNotifier(ref);
  ref.onDispose(notifier.dispose);

  return GoRouter(
    initialLocation: AppPlatform.forceAdminDashboard ? '/admin' : '/splash',
    refreshListenable: notifier,
    redirect: (context, state) {
      if (AppPlatform.forceAdminDashboard) {
        return state.matchedLocation.startsWith('/admin') ? null : '/admin';
      }

      final authState = ref.read(authStateProvider);
      final roleAsync = ref.read(userRoleProvider);

      final isLoading = authState.isLoading;
      final isAuth = authState.valueOrNull != null;
      final loc = state.matchedLocation;
      final isOnAuth =
          loc == '/login' || loc == '/register' || loc == '/splash';

      if (isLoading && loc != '/splash') return '/splash';

      // iOS: sin panel admin/trabajador — cualquier /admin → home
      if (!AppPlatform.adminPanelsEnabled && loc.startsWith('/admin')) {
        return '/home';
      }

      if (!isAuth) {
        if (loc.startsWith('/admin')) return '/home';
        if (loc.startsWith('/profile/')) {
          return loginPathWithRedirect(loc);
        }
        if (loc.startsWith('/order-success')) return '/home';
        if (!isGuestBrowsableLocation(loc)) return '/home';
        return null;
      }

      // Verificación de correo: NO bloqueamos la app si el correo no está verificado.
      // El register_page.dart navega explícitamente a /verify-email al crear la cuenta.
      // El usuario puede elegir "Continuar sin verificar" y acceder a la app normalmente.
      // Así se evita bloquear a usuarios cuyo correo de verificación fue a spam.

      if (isAuth && !isOnAuth && AppPlatform.adminPanelsEnabled) {
        final role = roleAsync.valueOrNull;
        if (role == 'admin' || role == 'trabajador') {
          const allowed = [
            '/admin',
            '/home',
            '/catalog',
            '/cart',
            '/checkout',
            '/order-success',
            '/teachable',
            '/wishlist',
            '/profile',
            '/verify-email',
          ];
          if (!allowed.any((p) => loc.startsWith(p))) {
            return '/admin';
          }
          if (role == 'trabajador') {
            const staffOnly = ['/admin', '/admin/ventas', '/admin/pedidos'];
            const blocked = [
              '/admin/usuarios',
              '/admin/datos',
              '/admin/predicciones',
              '/admin/fabricantes',
              '/admin/productos',
            ];
            if (blocked.any((p) => loc.startsWith(p))) {
              return '/admin';
            }
            if (loc.startsWith('/admin') &&
                !staffOnly.any((p) => loc == p || loc.startsWith('$p/'))) {
              return '/admin';
            }
          }
        }
      }

      if (isAuth && isOnAuth && loc != '/splash') {
        final role = roleAsync.valueOrNull;
        final redirect = safeRedirectFrom(state);
        if (redirect != null) return redirect;
        if (AppPlatform.adminPanelsEnabled &&
            (role == 'admin' || role == 'trabajador')) {
          return '/admin';
        }
        return '/home';
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/splash',
        pageBuilder: (ctx, s) => noTransitionPage(SplashPage()),
      ),
      GoRoute(
        path: '/login',
        pageBuilder: (ctx, s) => fadePage(const LoginPage()),
      ),
      GoRoute(
        path: '/register',
        pageBuilder: (ctx, s) => sharedAxisPage(const RegisterPage()),
      ),
      GoRoute(
        path: '/verify-email',
        pageBuilder: (ctx, s) => sharedAxisPage(const VerifyEmailPage()),
      ),
      GoRoute(
        path: '/checkout',
        pageBuilder: (ctx, s) => sharedAxisPage(const CheckoutPage()),
      ),
      GoRoute(
        path: '/order-success/:id',
        pageBuilder: (ctx, state) => sharedAxisPage(
          OrderSuccessPage(orderId: state.pathParameters['id']!),
        ),
      ),
      if (AppPlatform.adminPanelsEnabled) buildAdminRoute(),
      ShellRoute(
        builder: (context, state, child) => ShellPage(child: child),
        routes: [
          GoRoute(
            path: '/home',
            pageBuilder: (ctx, s) => fadePage(const HomePage()),
          ),
          GoRoute(
            path: '/catalog',
            pageBuilder: (ctx, s) => fadePage(const CatalogPage()),
            routes: [
              GoRoute(
                path: ':id',
                pageBuilder: (ctx, state) {
                  final id = state.pathParameters['id']!;
                  final extra = state.extra as Map<String, dynamic>?;
                  return fadePage(
                    ProductDetailPage(productId: id, heroData: extra),
                  );
                },
              ),
            ],
          ),
          GoRoute(
            path: '/wishlist',
            pageBuilder: (ctx, s) => fadePage(const WishlistPage()),
          ),
          GoRoute(
            path: '/cart',
            pageBuilder: (ctx, s) => sharedAxisPage(const CartPage()),
          ),
          GoRoute(
            path: '/teachable',
            pageBuilder: (ctx, s) =>
                sharedAxisPage(const TeachableMachinePage()),
          ),
          GoRoute(
            path: '/profile',
            pageBuilder: (ctx, s) => fadePage(const ProfilePage()),
            routes: [
              GoRoute(
                path: 'orders',
                pageBuilder: (ctx, s) => sharedAxisPage(const OrdersPage()),
              ),
              GoRoute(
                path: 'edit',
                pageBuilder: (ctx, s) =>
                    sharedAxisPage(const EditProfilePage()),
              ),
              GoRoute(
                path: 'sensors',
                pageBuilder: (ctx, s) =>
                    sharedAxisPage(const DeviceSensorsPage()),
              ),
            ],
          ),
        ],
      ),
    ],
  );
});
