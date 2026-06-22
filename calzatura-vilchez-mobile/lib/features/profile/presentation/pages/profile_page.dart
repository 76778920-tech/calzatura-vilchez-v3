import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:package_info_plus/package_info_plus.dart';
import '../../../../core/config/app_platform.dart';
import '../../../../core/config/web_app_links.dart';
import '../../../../core/router/auth_navigation.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/utils/open_external_url.dart';
import '../../../../shared/widgets/cv_app_bar.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../providers/profile_provider.dart';

final _appVersionProvider = FutureProvider<String>((ref) async {
  final info = await PackageInfo.fromPlatform();
  return info.version;
});

class ProfilePage extends ConsumerWidget {
  const ProfilePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);

    // Mientras Firebase Auth no confirmó el estado, evitar flicker al guest
    if (authState.isLoading) {
      return Scaffold(
        backgroundColor: AppColors.beige,
        appBar: const CVAppBar(),
        body: const Center(
          child: CircularProgressIndicator(color: AppColors.gold),
        ),
      );
    }

    final user = authState.valueOrNull;
    if (user == null) {
      return const _ProfileGuestPrompt();
    }

    final roleAsync = ref.watch(userRoleProvider);
    final isAdmin = ref.watch(isAdminProvider);

    final nombre =
        user.displayName ?? user.email?.split('@').first ?? 'Usuario';
    final email = user.email ?? '';
    final initial = nombre.isNotEmpty ? nombre[0].toUpperCase() : 'U';
    final fotoBase64 = ref.watch(profileDataProvider).valueOrNull?.fotoBase64;

    return Scaffold(
      backgroundColor: AppColors.beige,
      body: CustomScrollView(
        slivers: [
          // ── Header negro con avatar dorado ──────────────────────────────
          CVSliverAppBar(
            expandedHeight: 210,
            pinned: true,
            floating: false,
            snap: false,
            centerTitle: true,
            logoSize: 34,
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                color: AppColors.black,
                child: SafeArea(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const SizedBox(height: 12),
                      // Avatar con foto o inicial
                      GestureDetector(
                        onTap: () => context.push('/profile/edit'),
                        child: fotoBase64 != null
                            ? CircleAvatar(
                                radius: 40,
                                backgroundImage: MemoryImage(
                                  base64Decode(fotoBase64),
                                ),
                              )
                            : Container(
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
                              ),
                      ).animate().scale(
                        delay: 100.ms,
                        duration: 500.ms,
                        curve: Curves.elasticOut,
                      ),
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
                          color: Colors.white54,
                          fontSize: 12,
                        ),
                      ).animate().fadeIn(delay: 400.ms),
                      const SizedBox(height: 8),
                      roleAsync
                              .whenData(
                                (role) => Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 10,
                                    vertical: 4,
                                  ),
                                  decoration: BoxDecoration(
                                    color: AppColors.gold.withValues(
                                      alpha: 0.15,
                                    ),
                                    borderRadius: BorderRadius.circular(20),
                                    border: Border.all(
                                      color: AppColors.gold.withValues(
                                        alpha: 0.4,
                                      ),
                                    ),
                                  ),
                                  child: Text(
                                    AppPlatform.displayRole(role).toUpperCase(),
                                    style: const TextStyle(
                                      color: AppColors.gold,
                                      fontSize: 10,
                                      fontWeight: FontWeight.w700,
                                      letterSpacing: 1.2,
                                    ),
                                  ),
                                ),
                              )
                              .valueOrNull ??
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
                          color: AppColors.gold.withValues(alpha: 0.4),
                        ),
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
                          cvAppBarLogo(size: 44),
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
                                    color: Colors.white54,
                                    fontSize: 11,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const Icon(
                            Icons.arrow_forward_ios,
                            color: AppColors.gold,
                            size: 14,
                          ),
                        ],
                      ),
                    ),
                  ).animate(delay: 50.ms).fadeIn().slideY(begin: 0.1),
                  const SizedBox(height: 20),
                ],

                const _SectionTitle(title: 'Mi cuenta'),
                const SizedBox(height: 8),
                _ProfileTile(
                  icon: Icons.edit_outlined,
                  label: 'Editar perfil',
                  onTap: () => context.push('/profile/edit'),
                ).animate(delay: 100.ms).fadeIn().slideX(begin: -0.1),
                _ProfileTile(
                  icon: Icons.receipt_long_outlined,
                  label: 'Mis pedidos',
                  onTap: () => context.push('/profile/orders'),
                ).animate(delay: 150.ms).fadeIn().slideX(begin: -0.1),
                _ProfileTile(
                  icon: Icons.favorite_border_rounded,
                  label: 'Favoritos',
                  onTap: () => context.push('/wishlist'),
                ).animate(delay: 200.ms).fadeIn().slideX(begin: -0.1),
                const SizedBox(height: 16),

                const _SectionTitle(title: 'Configuración'),
                const SizedBox(height: 8),
                _ProfileTile(
                  icon: Icons.notifications_none_rounded,
                  label: 'Notificaciones',
                  onTap: () {},
                ).animate(delay: 250.ms).fadeIn().slideX(begin: -0.1),
                _ProfileTile(
                  icon: Icons.help_outline_rounded,
                  label: 'Ayuda y soporte',
                  onTap: () => openExternalUrl(WebAppLinks.helpFaq),
                ).animate(delay: 300.ms).fadeIn().slideX(begin: -0.1),
                _ProfileTile(
                  icon: Icons.storefront_outlined,
                  label: 'Nuestras tiendas',
                  onTap: () => openExternalUrl(WebAppLinks.stores),
                ).animate(delay: 310.ms).fadeIn().slideX(begin: -0.1),
                _ProfileTile(
                  icon: Icons.sensors_rounded,
                  label: 'Sensores del dispositivo',
                  subtitle: 'Acelerómetro, giroscopio y más',
                  onTap: () => context.push('/profile/sensors'),
                ).animate(delay: 275.ms).fadeIn().slideX(begin: -0.1),
                const SizedBox(height: 16),

                const _SectionTitle(title: 'Legal'),
                const SizedBox(height: 8),
                _ProfileTile(
                  icon: Icons.privacy_tip_outlined,
                  label: 'Política de privacidad',
                  onTap: () => openExternalUrl(WebAppLinks.privacy),
                ).animate(delay: 320.ms).fadeIn().slideX(begin: -0.1),
                _ProfileTile(
                  icon: Icons.description_outlined,
                  label: 'Términos y condiciones',
                  onTap: () => openExternalUrl(WebAppLinks.terms),
                ).animate(delay: 330.ms).fadeIn().slideX(begin: -0.1),
                _ProfileTile(
                  icon: Icons.gavel_outlined,
                  label: 'Libro de reclamaciones',
                  onTap: () => openExternalUrl(WebAppLinks.complaints),
                ).animate(delay: 340.ms).fadeIn().slideX(begin: -0.1),
                _ProfileTile(
                  icon: Icons.info_outline_rounded,
                  label: 'Acerca de',
                  subtitle: 'Versión ${ref.watch(_appVersionProvider).valueOrNull ?? '...'}',
                  onTap: () => openExternalUrl(WebAppLinks.helpContact),
                ).animate(delay: 350.ms).fadeIn().slideX(begin: -0.1),
                const SizedBox(height: 24),

                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  child: OutlinedButton.icon(
                    onPressed: () async {
                      await ref.read(authNotifierProvider.notifier).signOut();
                      if (context.mounted) context.go('/home');
                    },
                    icon: const Icon(
                      Icons.logout_rounded,
                      color: AppColors.error,
                    ),
                    label: const Text(
                      'Cerrar sesión',
                      style: TextStyle(color: AppColors.error),
                    ),
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size(double.infinity, 50),
                      side: const BorderSide(color: AppColors.error),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                  ),
                ).animate(delay: 400.ms).fadeIn(),
                const SizedBox(height: 32),
              ]),
            ),
          ),
        ],
      ),
    );
  }
}

class _ProfileGuestPrompt extends StatelessWidget {
  const _ProfileGuestPrompt();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.beige,
      appBar: const CVAppBar(),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.person_outline_rounded,
                size: 56,
                color: AppColors.gold,
              ),
              const SizedBox(height: 16),
              const Text(
                'Inicia sesión para ver tu perfil,\npedidos y favoritos',
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
                      context.go(loginPathWithRedirect('/profile')),
                  child: const Text('Iniciar sesión'),
                ),
              ),
              TextButton(
                onPressed: () => context.go(
                  '/register?redirect=${Uri.encodeComponent('/profile')}',
                ),
                child: const Text('Crear cuenta'),
              ),
            ],
          ),
        ),
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
            ? Text(
                subtitle!,
                style: const TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 12,
                ),
              )
            : null,
        trailing: const Icon(
          Icons.arrow_forward_ios,
          size: 14,
          color: AppColors.textSecondary,
        ),
        onTap: onTap,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
    );
  }
}
