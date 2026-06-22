import 'dart:async';

import 'package:calzatura_vilchez_mobile/core/session/app_session_policy.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

class _FakeTimer implements Timer {
  _FakeTimer(this._onTimeout);

  final void Function() _onTimeout;
  bool _cancelled = false;

  void fire() {
    if (!_cancelled) _onTimeout();
  }

  @override
  void cancel() => _cancelled = true;

  @override
  bool get isActive => !_cancelled;

  @override
  int get tick => 0;

  bool get isPeriodic => false;
}

void main() {
  group('AppSessionPolicy (Guías Prácticas PDF)', () {
    late int signOutInvocations;
    late List<_FakeTimer> fakeTimers;
    late AppSessionPolicy policy;

    Future<void> fakeSignOut() async {
      signOutInvocations += 1;
    }

    Timer fakeTimerFactory(Duration duration, void Function() onTimeout) {
      final timer = _FakeTimer(onTimeout);
      fakeTimers.add(timer);
      return timer;
    }

    setUp(() {
      signOutInvocations = 0;
      fakeTimers = [];
      policy = AppSessionPolicy(
        signOut: fakeSignOut,
        inactivityTimeout: const Duration(minutes: 5),
        backgroundGrace: const Duration(seconds: 30),
        timerFactory: fakeTimerFactory,
      );
    });

    tearDown(() {
      policy.dispose();
    });

    test('punto 4: inicia timer en initState aunque no haya sesión', () {
      policy.startInactivityTimer();

      expect(fakeTimers, hasLength(1));
      expect(signOutInvocations, 0);
    });

    test('punto 4: cierra sesión tras 5 minutos de inactividad', () async {
      policy.startInactivityTimer();

      fakeTimers.single.fire();
      await Future<void>.delayed(Duration.zero);

      expect(signOutInvocations, 1);
      expect(policy.signOutCalls, 1);
    });

    test('punto 2: NO cierra sesión de inmediato al minimizar (período de gracia)', () async {
      policy.startInactivityTimer();

      policy.onLifecycleChanged(AppLifecycleState.paused);
      await Future<void>.delayed(Duration.zero);

      // Aún no hay cierre de sesión — el timer de gracia aún no disparó.
      expect(signOutInvocations, 0);
      // Dos timers: inactividad (cancelado) + gracia en background (activo).
      expect(fakeTimers, hasLength(2));
      expect(fakeTimers.last.isActive, isTrue);
    });

    test('punto 2: cierra sesión tras el período de gracia en background', () async {
      policy.startInactivityTimer();

      policy.onLifecycleChanged(AppLifecycleState.paused);
      await Future<void>.delayed(Duration.zero);
      expect(signOutInvocations, 0);

      // Simula que pasaron los 30 s de gracia.
      fakeTimers.last.fire();
      await Future<void>.delayed(Duration.zero);

      expect(signOutInvocations, 1);
    });

    test('punto 2 gracia: NO cierra sesión si la app vuelve antes del período', () async {
      policy.startInactivityTimer();

      policy.onLifecycleChanged(AppLifecycleState.paused);
      // Vuelve a primer plano antes de que expire el timer de gracia.
      policy.onLifecycleChanged(AppLifecycleState.resumed);
      await Future<void>.delayed(Duration.zero);

      expect(signOutInvocations, 0);
    });

    test('punto 4: reinicia timer al volver a primer plano', () async {
      policy.startInactivityTimer();
      policy.onLifecycleChanged(AppLifecycleState.paused);
      await Future<void>.delayed(Duration.zero);
      expect(signOutInvocations, 0);

      policy.onLifecycleChanged(AppLifecycleState.resumed);

      // Exactamente un timer activo: el de inactividad recién creado.
      final activeTimers = fakeTimers.where((t) => t.isActive).toList();
      expect(activeTimers, hasLength(1));

      activeTimers.single.fire();
      await Future<void>.delayed(Duration.zero);

      expect(signOutInvocations, 1);
    });

    test('estados inactive y hidden no alteran la sesión', () {
      policy.startInactivityTimer();

      policy.onLifecycleChanged(AppLifecycleState.inactive);
      policy.onLifecycleChanged(AppLifecycleState.hidden);

      expect(signOutInvocations, 0);
      expect(fakeTimers.single.isActive, isTrue);
    });

    test('dispose bloquea nuevas acciones', () async {
      policy.startInactivityTimer();
      policy.dispose();

      policy.onLifecycleChanged(AppLifecycleState.paused);
      if (fakeTimers.isNotEmpty) fakeTimers.last.fire();
      await Future<void>.delayed(Duration.zero);

      expect(signOutInvocations, 0);
    });
  });
}
