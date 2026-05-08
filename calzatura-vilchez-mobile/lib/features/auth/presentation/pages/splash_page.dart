import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_theme.dart';
import '../providers/auth_provider.dart';

class SplashPage extends ConsumerStatefulWidget {
  const SplashPage({super.key});

  @override
  ConsumerState<SplashPage> createState() => _SplashPageState();
}

class _SplashPageState extends ConsumerState<SplashPage>
    with SingleTickerProviderStateMixin {
  late final AnimationController _spin;
  bool _minDelayDone = false;
  bool _navigated = false;

  @override
  void initState() {
    super.initState();
    _spin = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 4),
    )..repeat();

    // Mostrar splash mínimo 2 segundos, luego navegar en cuanto auth esté listo
    Future.delayed(const Duration(milliseconds: 2000), () {
      if (!mounted) return;
      _minDelayDone = true;
      _tryNavigate();
    });
  }

  void _tryNavigate() {
    if (!mounted || _navigated || !_minDelayDone) return;
    final auth = ref.read(authStateProvider);
    if (auth.isLoading) return; // el listener en build llamará de nuevo
    _navigated = true;
    final user = auth.valueOrNull;
    context.go(user != null ? '/home' : '/login');
  }

  @override
  void dispose() {
    _spin.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Reacciona cuando el stream de auth emite su primer valor
    ref.listen(authStateProvider, (prev, next) => _tryNavigate());

    return Scaffold(
      backgroundColor: AppColors.primary,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            RotationTransition(
              turns: _spin,
              child: SvgPicture.asset(
                'assets/images/sunflower.svg',
                width: 120,
                height: 120,
              ),
            ),
            const SizedBox(height: 36),
            const Text(
              'Calzatura Vilchez',
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.bold,
                color: Colors.white,
                letterSpacing: 0.8,
              ),
            ).animate().fadeIn(delay: 400.ms, duration: 500.ms),
            const SizedBox(height: 6),
            const Text(
              'Moda y confort en cada paso',
              style: TextStyle(color: Colors.white54, fontSize: 14),
            ).animate().fadeIn(delay: 650.ms),
          ],
        ),
      ),
    );
  }
}
