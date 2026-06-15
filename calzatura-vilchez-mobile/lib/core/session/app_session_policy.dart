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
    TimerFactory? timerFactory,
  }) : _timerFactory = timerFactory ?? Timer.new;

  final SignOutCallback signOut;
  final Duration inactivityTimeout;
  final TimerFactory _timerFactory;

  Timer? _inactivityTimer;
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
    _inactivityTimer = null;
  }

  /// Puntos 2 y 4 del PDF en `didChangeAppLifecycleState`.
  void onLifecycleChanged(AppLifecycleState state) {
    if (_disposed) return;
    if (state == AppLifecycleState.resumed) {
      startInactivityTimer();
    } else if (state == AppLifecycleState.paused) {
      _inactivityTimer?.cancel();
      unawaited(_invokeSignOut());
    }
  }

  Future<void> _invokeSignOut() async {
    if (_disposed) return;
    _signOutCalls += 1;
    await signOut();
  }
}
