import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

/// Logo Calzatura Vilchez — emblema girasol (badge circular sin fondo).
class CVLogo extends StatelessWidget {
  const CVLogo({super.key, this.size = 80, this.dark = true, this.opacity = 1.0});

  final double size;
  final bool dark;
  final double opacity;

  @override
  Widget build(BuildContext context) {
    return Opacity(
      opacity: opacity,
      child: SvgPicture.asset(
        'assets/images/logo-badge.svg',
        width: size,
        height: size,
        semanticsLabel: 'Calzatura Vilchez',
      ),
    );
  }
}
