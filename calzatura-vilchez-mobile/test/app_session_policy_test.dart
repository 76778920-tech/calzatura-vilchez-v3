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

    test('punto 2: cierra sesión al minimizar y cancela el timer', () async {
      policy.startInactivityTimer();

      policy.onLifecycleChanged(AppLifecycleState.paused);
      await Future<void>.delayed(Duration.zero);

      expect(signOutInvocations, 1);
      expect(fakeTimers.single.isActive, isFalse);
    });

    test('punto 4: reinicia timer al volver a primer plano', () async {
      policy.startInactivityTimer();
      policy.onLifecycleChanged(AppLifecycleState.paused);
      await Future<void>.delayed(Duration.zero);
      expect(signOutInvocations, 1);

      signOutInvocations = 0;
      policy.onLifecycleChanged(AppLifecycleState.resumed);

      expect(fakeTimers, hasLength(2));
      expect(fakeTimers.last.isActive, isTrue);

      fakeTimers.last.fire();
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
      fakeTimers.single.fire();
      await Future<void>.delayed(Duration.zero);

      expect(signOutInvocations, 0);
    });
  });
}
