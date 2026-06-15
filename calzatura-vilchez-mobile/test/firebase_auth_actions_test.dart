import 'package:calzatura_vilchez_mobile/core/config/firebase_auth_actions.dart';
import 'package:calzatura_vilchez_mobile/core/config/mobile_app_ids.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('firebaseActionCodeSettings incluye bundle iOS', () {
    final settings = firebaseActionCodeSettings();

    expect(settings.url, MobileAppIds.firebaseContinueUrl);
    expect(settings.iOSBundleId, MobileAppIds.iosBundleId);
    expect(settings.androidPackageName, MobileAppIds.androidPackageName);
    expect(settings.handleCodeInApp, isFalse);
  });
}
