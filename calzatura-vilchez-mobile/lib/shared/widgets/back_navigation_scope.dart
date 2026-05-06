import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

void handleBackNavigation(
  BuildContext context, {
  required String fallbackRoute,
}) {
  final router = GoRouter.of(context);
  if (router.canPop()) {
    context.pop();
    return;
  }
  context.go(fallbackRoute);
}

class BackNavigationScope extends StatelessWidget {
  const BackNavigationScope({
    super.key,
    required this.fallbackRoute,
    required this.child,
  });

  final String fallbackRoute;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final router = GoRouter.of(context);
    return PopScope(
      canPop: router.canPop(),
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop) {
          context.go(fallbackRoute);
        }
      },
      child: child,
    );
  }
}
