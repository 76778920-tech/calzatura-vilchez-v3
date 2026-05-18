import 'dart:ui';

import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

/// Fondo decorativo para pantallas de autenticación (login / registro).
class AuthBackground extends StatelessWidget {
  const AuthBackground({super.key});

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.sizeOf(context);
    final topBlob = size.width * 0.62;
    final bottomBlob = size.width * 0.68;

    return IgnorePointer(
      child: ColoredBox(
        color: AppColors.black,
        child: Stack(
          fit: StackFit.expand,
          clipBehavior: Clip.hardEdge,
          children: [
            Positioned(
              top: -topBlob * 0.42,
              right: -topBlob * 0.38,
              child: _AuthGlowBlob(diameter: topBlob, opacity: 0.14),
            ),
            Positioned(
              bottom: -bottomBlob * 0.48,
              left: -bottomBlob * 0.42,
              child: _AuthGlowBlob(diameter: bottomBlob, opacity: 0.09),
            ),
          ],
        ),
      ),
    );
  }
}

class _AuthGlowBlob extends StatelessWidget {
  const _AuthGlowBlob({required this.diameter, required this.opacity});

  final double diameter;
  final double opacity;

  @override
  Widget build(BuildContext context) {
    return ImageFiltered(
      imageFilter: ImageFilter.blur(sigmaX: 48, sigmaY: 48),
      child: Container(
        width: diameter,
        height: diameter,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: RadialGradient(
            colors: [
              AppColors.gold.withValues(alpha: opacity),
              AppColors.gold.withValues(alpha: opacity * 0.35),
              Colors.transparent,
            ],
            stops: const [0.0, 0.45, 1.0],
          ),
        ),
      ),
    );
  }
}
