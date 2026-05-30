import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/env.dart';
import '../../../core/services/panel_bff_api.dart';
import '../../auth/presentation/providers/auth_provider.dart';

/// Perfil vía BFF (`GET /users/me`), sin Supabase directo.
final userProfileBffProvider = FutureProvider<Map<String, dynamic>?>((ref) async {
  final user = ref.watch(currentUserProvider);
  if (user == null) return null;
  if (user.email == Env.superadminEmail) {
    return {
      'uid': user.uid,
      'email': user.email,
      'rol': 'admin',
      'nombre': 'Administrador',
      'nombres': 'Administrador',
      'apellidos': '',
    };
  }
  return PanelBffApi().fetchMyProfile();
});

final panelScopeProvider = Provider<PanelScope>((ref) {
  final profile = ref.watch(userProfileBffProvider).valueOrNull;
  final role = profile?['rol'] as String?;
  return PanelBffApi.scopeForRole(role);
});

final isTrabajadorPanelProvider = Provider<bool>((ref) {
  return ref.watch(panelScopeProvider) == PanelScope.staff;
});

final isAdminPanelProvider = Provider<bool>((ref) {
  final profile = ref.watch(userProfileBffProvider).valueOrNull;
  return profile?['rol'] == 'admin';
});
