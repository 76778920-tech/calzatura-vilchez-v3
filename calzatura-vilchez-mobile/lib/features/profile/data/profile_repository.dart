import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/services/panel_bff_api.dart';

class ProfileRepository {
  Future<Map<String, dynamic>?> fetchProfile(String uid) =>
      PanelBffApi().fetchMyProfile();

  Future<void> updateTelefono(String uid, String telefono) =>
      PanelBffApi().patchMyTelefono(telefono);

  Future<void> updateFotoBase64(String uid, String? base64) =>
      PanelBffApi().patchMyFotoBase64(base64);
}

final profileRepositoryProvider = Provider<ProfileRepository>(
  (_) => ProfileRepository(),
);
