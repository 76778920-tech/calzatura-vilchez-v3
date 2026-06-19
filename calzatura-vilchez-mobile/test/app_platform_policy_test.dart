import 'package:calzatura_vilchez_mobile/core/config/app_platform.dart';
import 'package:calzatura_vilchez_mobile/core/utils/idempotency_key.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('AppPlatform iOS consumer policy', () {
    tearDown(() => AppPlatform.isIosOverride = null);

    test('iOS deshabilita panel admin', () {
      AppPlatform.isIosOverride = true;
      expect(AppPlatform.adminPanelsEnabled, isFalse);
      expect(AppPlatform.forceAdminDashboard, isFalse);
    });

    test('Android mantiene panel admin', () {
      AppPlatform.isIosOverride = false;
      expect(AppPlatform.adminPanelsEnabled, isTrue);
    });

    test('displayRole oculta admin/trabajador en iOS', () {
      AppPlatform.isIosOverride = true;
      expect(AppPlatform.displayRole('admin'), 'cliente');
      expect(AppPlatform.displayRole('trabajador'), 'cliente');
      expect(AppPlatform.displayRole('cliente'), 'cliente');
    });
  });

  group('newIdempotencyKey', () {
    test('genera UUID v4 válido', () {
      final key = newIdempotencyKey();
      expect(
        RegExp(
          r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
        ).hasMatch(key),
        isTrue,
      );
    });
  });
}
