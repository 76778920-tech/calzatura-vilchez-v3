import 'package:custom_refresh_indicator/custom_refresh_indicator.dart';
import 'package:flutter/material.dart';
import 'cv_logo.dart';

/// Pull-to-refresh con el girasol flotando encima.
/// El contenido NO se desplaza gracias a [containerBuilder].
class CVRefreshWrapper extends StatefulWidget {
  const CVRefreshWrapper({
    super.key,
    required this.child,
    required this.onRefresh,
    this.bubbleTop = 90.0,
  });

  final Widget child;
  final Future<void> Function() onRefresh;
  final double bubbleTop;

  @override
  State<CVRefreshWrapper> createState() => _CVRefreshWrapperState();
}

class _CVRefreshWrapperState extends State<CVRefreshWrapper>
    with SingleTickerProviderStateMixin {
  late final AnimationController _spin = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 900),
  );

  @override
  void dispose() {
    _spin.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final topPad = MediaQuery.of(context).padding.top;

    return CustomRefreshIndicator(
      onRefresh: widget.onRefresh,
      offsetToArmed: 70,
      durations: const RefreshIndicatorDurations(
        completeDuration: Duration(milliseconds: 300),
        finalizeDuration: Duration(milliseconds: 200),
      ),
      builder: (context, child, controller) {
        // Girar continuamente solo cuando está cargando
        if (controller.isLoading || controller.isSettling) {
          if (!_spin.isAnimating) _spin.repeat();
        } else {
          if (_spin.isAnimating) {
            _spin
              ..stop()
              ..reset();
          }
        }

        final opacity = (controller.isLoading ||
                controller.isSettling ||
                controller.isComplete ||
                controller.isFinalizing)
            ? 1.0
            : controller.value.clamp(0.0, 1.0);

        final visible = controller.value > 0.05 ||
            controller.isLoading ||
            controller.isSettling ||
            controller.isFinalizing;

        return Stack(
          children: [
            // Página completamente fija
            child,

            // Girasol flotando encima con fondo gris translúcido
            if (visible)
              Positioned(
                top: topPad + widget.bubbleTop,
                left: 0,
                right: 0,
                child: Center(
                  child: Opacity(
                    opacity: opacity,
                    child: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.4),
                        shape: BoxShape.circle,
                      ),
                      child: RotationTransition(
                        turns: controller.isLoading || controller.isSettling
                            ? _spin
                            : AlwaysStoppedAnimation(controller.value * 0.6),
                        // Recortar el SVG para mostrar solo el girasol central
                        child: ClipOval(
                          child: SizedBox(
                            width: 32,
                            height: 32,
                            child: OverflowBox(
                              maxWidth: 58,
                              maxHeight: 58,
                              child: const CVLogo(size: 58, dark: true),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
          ],
        );
      },
      child: widget.child,
    );
  }
}
