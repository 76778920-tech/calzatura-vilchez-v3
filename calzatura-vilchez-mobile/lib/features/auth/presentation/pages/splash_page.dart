import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/cv_logo.dart';
import '../providers/auth_provider.dart';

class SplashPage extends ConsumerStatefulWidget {
  const SplashPage({super.key});

  @override
  ConsumerState<SplashPage> createState() => _SplashPageState();
}

class _SplashPageState extends ConsumerState<SplashPage> {
  @override
  void initState() {
    super.initState();
    Future.delayed(const Duration(milliseconds: 2200), () {
      if (!mounted) return;
      final auth = ref.read(authStateProvider);
      auth.whenData((user) {
        if (!mounted) return;
        context.go(user != null ? '/home' : '/login');
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.primary,
      body: Stack(
        children: [
          Positioned(
            top: -80,
            right: -80,
            child: Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.accent.withValues(alpha: 0.12),
              ),
            ),
          ),
          Positioned(
            bottom: -100,
            left: -60,
            child: Container(
              width: 280,
              height: 280,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.surface.withValues(alpha: 0.35),
              ),
            ),
          ),
          Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const CVLogo(size: 110)
                    .animate()
                    .scale(
                      delay: 150.ms,
                      duration: 700.ms,
                      curve: Curves.elasticOut,
                    )
                    .then()
                    .shimmer(duration: 1200.ms, color: Colors.white30),
                const SizedBox(height: 28),
                const Text(
                  'Calzatura Vilchez',
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                    letterSpacing: 0.8,
                  ),
                ).animate().fadeIn(delay: 500.ms, duration: 500.ms),
                const SizedBox(height: 6),
                const Text(
                  'Moda y confort en cada paso',
                  style: TextStyle(color: Colors.white54, fontSize: 14),
                ).animate().fadeIn(delay: 700.ms),
                const SizedBox(height: 64),
                SizedBox(
                  width: 28,
                  height: 28,
                  child: CircularProgressIndicator(
                    color: AppColors.accent,
                    strokeWidth: 2.5,
                  ),
                ).animate().fadeIn(delay: 1000.ms),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
