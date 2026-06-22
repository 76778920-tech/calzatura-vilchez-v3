import 'package:firebase_auth/firebase_auth.dart';

import 'mobile_app_ids.dart';

/// ActionCodeSettings mínimas para verificación y reset de contraseña.
/// NO se incluyen androidPackageName ni iOSBundleId: esos campos hacen que
/// Firebase enrute el enlace a través de Firebase Dynamic Links, que fue
/// dado de baja en agosto 2025. Sin esos campos, Firebase genera un enlace
/// directo (/__/auth/action?...) que funciona en cualquier plan.
ActionCodeSettings firebaseActionCodeSettings() {
  return ActionCodeSettings(
    url: MobileAppIds.firebaseContinueUrl,
    handleCodeInApp: false,
  );
}
