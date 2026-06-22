import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Ruta interna segura tras login (solo paths que empiezan con `/`).
String? safeRedirectFrom(GoRouterState state) {
  final raw = state.uri.queryParameters['redirect'];
  if (raw == null || raw.isEmpty) return null;
  if (!raw.startsWith('/') || raw.startsWith('//')) return null;
  return raw;
}

void navigateAfterAuth(BuildContext context, {String fallback = '/home'}) {
  final redirect = safeRedirectFrom(GoRouterState.of(context));
  context.go(redirect ?? fallback);
}

String loginPathWithRedirect(String returnTo) =>
    '/login?redirect=${Uri.encodeComponent(returnTo)}';

bool isGuestBrowsableLocation(String loc) {
  if (loc == '/splash' ||
      loc == '/login' ||
      loc == '/register' ||
      loc == '/home' ||
      loc == '/cart' ||
      loc == '/teachable' ||
      loc == '/wishlist' ||
      loc == '/checkout' ||
      loc == '/profile') {
    return true;
  }
  if (loc.startsWith('/catalog')) return true;
  return false;
}
