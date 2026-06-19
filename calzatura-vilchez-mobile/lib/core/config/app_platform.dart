import 'dart:io' show Platform;

import 'package:flutter/foundation.dart';

/// Política de plataforma: iOS = app de cliente (sin panel admin/trabajador).
class AppPlatform {
  AppPlatform._();

  @visibleForTesting
  static bool? isIosOverride;

  static bool get isIOS =>
      isIosOverride ?? (!kIsWeb && !kIsWasm && Platform.isIOS);

  /// Panel `/admin` y rol trabajador solo en Android (APK operativo de tienda).
  static bool get adminPanelsEnabled => !isIOS;

  static bool get forceAdminDashboard =>
      adminPanelsEnabled &&
      const bool.fromEnvironment('CV_FORCE_ADMIN_DASHBOARD');

  /// Rol visible en UI: en iOS no exponemos admin/trabajador (solo experiencia cliente).
  static String displayRole(String role) {
    if (adminPanelsEnabled) return role;
    if (role == 'admin' || role == 'trabajador') return 'cliente';
    return role;
  }
}
