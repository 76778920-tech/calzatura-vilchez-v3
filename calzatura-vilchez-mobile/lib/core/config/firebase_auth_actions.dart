import 'package:firebase_auth/firebase_auth.dart';

import 'mobile_app_ids.dart';

/// Configuración de enlaces de verificación/reset para Android e iOS.
ActionCodeSettings firebaseActionCodeSettings({
  bool handleCodeInApp = false,
}) {
  return ActionCodeSettings(
    url: MobileAppIds.firebaseContinueUrl,
    handleCodeInApp: handleCodeInApp,
    androidPackageName: MobileAppIds.androidPackageName,
    androidInstallApp: false,
    iOSBundleId: MobileAppIds.iosBundleId,
  );
}
