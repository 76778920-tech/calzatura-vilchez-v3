import 'package:calzatura_vilchez_mobile/core/config/firebase_auth_actions.dart';
import 'package:calzatura_vilchez_mobile/core/config/mobile_app_ids.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('firebaseActionCodeSettings genera enlace directo sin Dynamic Links', () {
    final settings = firebaseActionCodeSettings();

    expect(settings.url, MobileAppIds.firebaseContinueUrl);
    expect(settings.handleCodeInApp, isFalse);
    // androidPackageName e iOSBundleId eliminados: activan Dynamic Links
    // (dado de baja en agosto 2025), lo que rompía los enlaces del correo.
    expect(settings.iOSBundleId, isNull);
    expect(settings.androidPackageName, isNull);
  });
}
