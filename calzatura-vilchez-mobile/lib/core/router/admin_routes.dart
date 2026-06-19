import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/admin/data/panel_scope_provider.dart';
import '../../features/admin/presentation/pages/admin_dashboard_page.dart';
import '../../features/admin/presentation/pages/admin_data_page.dart';
import '../../features/admin/presentation/pages/admin_manufacturers_page.dart';
import '../../features/admin/presentation/pages/admin_orders_page.dart';
import '../../features/admin/presentation/pages/admin_products_page.dart';
import '../../features/admin/presentation/pages/admin_sales_page.dart';
import '../../features/admin/presentation/pages/admin_users_page.dart';
import '../../features/admin/presentation/pages/staff_sales_page.dart';
import 'app_router_transitions.dart';

/// Rutas del panel admin/trabajador — solo registradas en Android.
GoRoute buildAdminRoute() {
  return GoRoute(
    path: '/admin',
    pageBuilder: (ctx, s) => fadePage(const AdminDashboardPage()),
    routes: [
      GoRoute(
        path: 'productos',
        pageBuilder: (ctx, s) => sharedAxisPage(const AdminProductsPage()),
      ),
      GoRoute(
        path: 'pedidos',
        pageBuilder: (ctx, s) => sharedAxisPage(const AdminOrdersPage()),
      ),
      GoRoute(
        path: 'ventas',
        pageBuilder: (ctx, s) => sharedAxisPage(
          Consumer(
            builder: (context, ref, _) {
              final profile = ref.watch(userProfileBffProvider).valueOrNull;
              final isStaff = profile?['rol'] == 'trabajador';
              return isStaff ? const StaffSalesPage() : const AdminSalesPage();
            },
          ),
        ),
      ),
      GoRoute(
        path: 'usuarios',
        pageBuilder: (ctx, s) => sharedAxisPage(const AdminUsersPage()),
      ),
      GoRoute(
        path: 'fabricantes',
        pageBuilder: (ctx, s) => sharedAxisPage(const AdminManufacturersPage()),
      ),
      GoRoute(
        path: 'datos',
        pageBuilder: (ctx, s) => sharedAxisPage(const AdminDataPage()),
      ),
    ],
  );
}
