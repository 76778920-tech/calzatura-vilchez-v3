import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/cv_logo.dart';
import '../../../auth/presentation/providers/auth_provider.dart';

class ProfilePage extends ConsumerWidget {
  const ProfilePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    final roleAsync = ref.watch(userRoleProvider);
    final isAdmin = ref.watch(isAdminProvider);

    final nombre =
        user?.displayName ?? user?.email?.split('@').first ?? 'Usuario';
    final email = user?.email ?? '';
    final initial =
        nombre.isNotEmpty ? nombre[0].toUpperCase() : 'U';

    return Scaffold(
      backgroundColor: AppColors.beige,
      body: CustomScrollView(
        slivers: [
          // ── Header negro con avatar dorado ──────────────────────────────
          SliverAppBar(
            expandedHeight: 210,
            pinned: true,
            automaticallyImplyLeading: false,
            backgroundColor: AppColors.black,
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                color: AppColors.black,
                child: SafeArea(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const SizedBox(height: 12),
                      // Avatar con inicial
                      Container(
                        width: 80,
                        height: 80,
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [AppColors.gold, AppColors.goldDark],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.gold.withValues(alpha: 0.4),
                              blurRadius: 20,
                              offset: const Offset(0, 6),
                            ),
                          ],
                        ),
                        child: Center(
                          child: Text(
                            initial,
                            style: const TextStyle(
                              color: AppColors.black,
                              fontSize: 32,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      )
                          .animate()
                          .scale(
                              delay: 100.ms,
                              duration: 500.ms,
                              curve: Curves.elasticOut),
                      const SizedBox(height: 12),
                      Text(
                        nombre,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                        ),
                      ).animate().fadeIn(delay: 300.ms),
                      const SizedBox(height: 3),
                      Text(
                        email,
                        style: const TextStyle(
                            color: Colors.white54, fontSize: 12),
                      ).animate().fadeIn(delay: 400.ms),
                      const SizedBox(height: 8),
                      roleAsync.whenData(
                        (role) => Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppColors.gold.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                                color: AppColors.gold.withValues(alpha: 0.4)),
                          ),
                          child: Text(
                            role.toUpperCase(),
                            style: const TextStyle(
                              color: AppColors.gold,
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 1.2,
                            ),
                          ),
                        ),
                      ).valueOrNull ??
                          const SizedBox(),
                    ],
                  ),
                ),
              ),
            ),
          ),

          SliverPadding(
            padding: const EdgeInsets.all(16),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                const SizedBox(height: 8),

                // ── Banner panel admin (solo si es admin/trabajador) ──────
                if (isAdmin) ...[
                  GestureDetector(
                    onTap: () => context.go('/admin'),
                    child: Container(
                      padding: const EdgeInsets.all(18),
                      decoration: BoxDecoration(
                        color: AppColors.black,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                            color: AppColors.gold.withValues(alpha: 0.4)),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.gold.withValues(alpha: 0.15),
                            blurRadius: 16,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Row(
                        children: [
                          const CVLogo(size: 44, dark: true),
                          const SizedBox(width: 14),
                          const Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Panel Administrativo',
                                  style: TextStyle(
                                    color: AppColors.gold,
                                    fontSize: 15,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                SizedBox(height: 3),
                                Text(
                                  'Gestionar productos, pedidos y usuarios',
                                  style: TextStyle(
                                      color: Colors.white54, fontSize: 11),
                                ),
                              ],
                            ),
                          ),
                          const Icon(Icons.arrow_forward_ios,
                              color: AppColors.gold, size: 14),
                        ],
                      ),
                    ),
                  ).animate(delay: 50.ms).fadeIn().slideY(begin: 0.1),
                  const SizedBox(height: 20),
                ],

                const _SectionTitle(title: 'Mi cuenta'),
                const SizedBox(height: 8),
                _ProfileTile(
                  icon: Icons.receipt_long_outlined,
                  label: 'Mis pedidos',
                  onTap: () => context.push('/profile/orders'),
                ).animate(delay: 100.ms).fadeIn().slideX(begin: -0.1),
                _ProfileTile(
                  icon: Icons.favorite_border_rounded,
                  label: 'Favoritos',
                  onTap: () {},
                ).animate(delay: 150.ms).fadeIn().slideX(begin: -0.1),
                const SizedBox(height: 16),

                const _SectionTitle(title: 'Configuración'),
                const SizedBox(height: 8),
                _ProfileTile(
                  icon: Icons.notifications_none_rounded,
                  label: 'Notificaciones',
                  onTap: () {},
                ).animate(delay: 200.ms).fadeIn().slideX(begin: -0.1),
                _ProfileTile(
                  icon: Icons.help_outline_rounded,
                  label: 'Ayuda y soporte',
                  onTap: () {},
                ).animate(delay: 250.ms).fadeIn().slideX(begin: -0.1),
                _ProfileTile(
                  icon: Icons.info_outline_rounded,
                  label: 'Acerca de',
                  subtitle: 'Versión 1.0.0',
                  onTap: () {},
                ).animate(delay: 300.ms).fadeIn().slideX(begin: -0.1),
                const SizedBox(height: 24),

                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  child: OutlinedButton.icon(
                    onPressed: () async {
                      await ref
                          .read(authNotifierProvider.notifier)
                          .signOut();
                      if (context.mounted) context.go('/login');
                    },
                    icon: const Icon(Icons.logout_rounded,
                        color: AppColors.error),
                    label: const Text('Cerrar sesión',
                        style: TextStyle(color: AppColors.error)),
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size(double.infinity, 50),
                      side: const BorderSide(color: AppColors.error),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14)),
                    ),
                  ),
                ).animate(delay: 350.ms).fadeIn(),
                const SizedBox(height: 32),
              ]),
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.title});
  final String title;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 4, bottom: 4),
      child: Text(
        title.toUpperCase(),
        style: const TextStyle(
          color: AppColors.textSecondary,
          fontSize: 11,
          fontWeight: FontWeight.w700,
          letterSpacing: 1.2,
        ),
      ),
    );
  }
}

class _ProfileTile extends StatelessWidget {
  const _ProfileTile({
    required this.icon,
    required this.label,
    required this.onTap,
    this.subtitle,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: ListTile(
        leading: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: AppColors.gold.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, color: AppColors.gold, size: 20),
        ),
        title: Text(
          label,
          style: const TextStyle(
            fontWeight: FontWeight.w500,
            fontSize: 14,
            color: AppColors.textPrimary,
          ),
        ),
        subtitle: subtitle != null
            ? Text(subtitle!,
                style: const TextStyle(
                    color: AppColors.textSecondary, fontSize: 12))
            : null,
        trailing: const Icon(Icons.arrow_forward_ios,
            size: 14, color: AppColors.textSecondary),
        onTap: onTap,
        shape:
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
    );
  }
}
