import 'dart:async';

import 'package:flutter/widgets.dart';

typedef SignOutCallback = Future<void> Function();
typedef TimerFactory = Timer Function(Duration duration, void Function() onTimeout);

/// Política de sesión según Guías Prácticas (puntos 2 y 4):
/// - Cierre de sesión al minimizar (`paused`).
/// - Cierre de sesión tras 5 minutos de inactividad.
class AppSessionPolicy {
  AppSessionPolicy({
    required this.signOut,
    this.inactivityTimeout = const Duration(minutes: 5),
    this.backgroundGrace = const Duration(seconds: 30),
    TimerFactory? timerFactory,
  }) : _timerFactory = timerFactory ?? Timer.new;

  final SignOutCallback signOut;
  final Duration inactivityTimeout;

  /// Tiempo en background antes de cerrar sesión.
  /// Un período de gracia evita cerrar sesión cuando el sistema mueve
  /// brevemente la app a segundo plano (p. ej. ImagePicker, permisos,
  /// notificaciones). 30 s es suficiente para esas transiciones.
  final Duration backgroundGrace;

  final TimerFactory _timerFactory;

  Timer? _inactivityTimer;
  Timer? _backgroundTimer;
  bool _disposed = false;
  int _signOutCalls = 0;

  /// Solo para pruebas.
  int get signOutCalls => _signOutCalls;

  /// Punto 4 del PDF: iniciar timer en `initState`.
  void startInactivityTimer() {
    if (_disposed) return;
    _inactivityTimer?.cancel();
    _inactivityTimer = _timerFactory(inactivityTimeout, () {
      unawaited(_invokeSignOut());
    });
  }

  void dispose() {
    _disposed = true;
    _inactivityTimer?.cancel();
    _backgroundTimer?.cancel();
    _inactivityTimer = null;
    _backgroundTimer = null;
  }

  /// Puntos 2 y 4 del PDF en `didChangeAppLifecycleState`.
  void onLifecycleChanged(AppLifecycleState state) {
    if (_disposed) return;
    if (state == AppLifecycleState.resumed) {
      // Volvió a primer plano: cancelar cualquier cierre de sesión pendiente.
      _backgroundTimer?.cancel();
      _backgroundTimer = null;
      startInactivityTimer();
    } else if (state == AppLifecycleState.paused) {
      _inactivityTimer?.cancel();
      // Cerrar sesión solo si sigue en background después del período de gracia.
      // Así no se cierra sesión por transiciones breves (ImagePicker, cámara…).
      _backgroundTimer?.cancel();
      _backgroundTimer = _timerFactory(backgroundGrace, () {
        _backgroundTimer = null;
        unawaited(_invokeSignOut());
      });
    }
  }

  Future<void> _invokeSignOut() async {
    if (_disposed) return;
    _signOutCalls += 1;
    await signOut();
  }
}
