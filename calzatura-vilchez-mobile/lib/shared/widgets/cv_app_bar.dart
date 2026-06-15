import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import 'cv_logo.dart';

/// AppBar con logo Calzatura Vilchez (Guías Prácticas — `CustomAppBar`).
class CVAppBar extends StatelessWidget implements PreferredSizeWidget {
  const CVAppBar({
    super.key,
    this.actions,
    this.leading,
    this.title,
    this.centerTitle = true,
    this.backgroundColor = AppColors.black,
    this.foregroundColor = AppColors.textLight,
    this.logoSize = 38,
    this.elevation = 0,
    this.automaticallyImplyLeading = true,
  });

  final List<Widget>? actions;
  final Widget? leading;
  final Widget? title;
  final bool centerTitle;
  final Color backgroundColor;
  final Color foregroundColor;
  final double logoSize;
  final double elevation;
  final bool automaticallyImplyLeading;

  @override
  Widget build(BuildContext context) {
    return AppBar(
      backgroundColor: backgroundColor,
      foregroundColor: foregroundColor,
      elevation: elevation,
      centerTitle: centerTitle,
      automaticallyImplyLeading:
          automaticallyImplyLeading && leading != null,
      leading: leading,
      title: title ?? cvAppBarLogo(size: logoSize),
      actions: actions,
    );
  }

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);
}

/// Logo por defecto del AppBar (evita repetir `CVLogo` en cada pantalla).
Widget cvAppBarLogo({double size = 38}) => CVLogo(size: size, dark: true);

/// Título con logo + encabezado (catálogo, favoritos, carrito).
class CVAppBarTitle extends StatelessWidget {
  const CVAppBarTitle({
    super.key,
    required this.heading,
    this.subheading,
    this.logoSize = 38,
  });

  final String heading;
  final String? subheading;
  final double logoSize;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        cvAppBarLogo(size: logoSize),
        const SizedBox(width: 10),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              heading,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 16,
                fontWeight: FontWeight.w800,
                letterSpacing: 0.3,
              ),
            ),
            if (subheading != null)
              Text(
                subheading!,
                style: const TextStyle(
                  color: AppColors.gold,
                  fontSize: 10,
                  letterSpacing: 0.2,
                ),
              ),
          ],
        ),
      ],
    );
  }
}

/// Variante `SliverAppBar` con logo por defecto.
class CVSliverAppBar extends StatelessWidget {
  const CVSliverAppBar({
    super.key,
    this.actions,
    this.leading,
    this.title,
    this.centerTitle = false,
    this.backgroundColor = AppColors.black,
    this.foregroundColor = AppColors.textLight,
    this.logoSize = 38,
    this.floating = true,
    this.snap = true,
    this.pinned = false,
    this.toolbarHeight = 60,
    this.automaticallyImplyLeading = false,
    this.expandedHeight,
    this.flexibleSpace,
  });

  final List<Widget>? actions;
  final Widget? leading;
  final Widget? title;
  final bool centerTitle;
  final Color backgroundColor;
  final Color foregroundColor;
  final double logoSize;
  final bool floating;
  final bool snap;
  final bool pinned;
  final double toolbarHeight;
  final bool automaticallyImplyLeading;
  final double? expandedHeight;
  final Widget? flexibleSpace;

  @override
  Widget build(BuildContext context) {
    return SliverAppBar(
      floating: floating,
      snap: snap,
      pinned: pinned,
      toolbarHeight: toolbarHeight,
      expandedHeight: expandedHeight,
      backgroundColor: backgroundColor,
      foregroundColor: foregroundColor,
      automaticallyImplyLeading: automaticallyImplyLeading,
      leading: leading,
      centerTitle: centerTitle,
      title: title ?? cvAppBarLogo(size: logoSize),
      actions: actions,
      flexibleSpace: flexibleSpace,
    );
  }
}

/// Botón de retroceso estándar para `CVAppBar`.
class CVBackButton extends StatelessWidget {
  const CVBackButton({super.key, required this.onPressed});

  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return IconButton(
      icon: const Icon(Icons.arrow_back_ios_new, size: 18),
      onPressed: onPressed,
    );
  }
}
