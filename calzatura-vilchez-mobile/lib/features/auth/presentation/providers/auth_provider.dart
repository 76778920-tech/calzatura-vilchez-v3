import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/config/env.dart';
import '../../../admin/data/panel_scope_provider.dart';
import '../../data/auth_repository.dart';

final authStateProvider = StreamProvider<User?>((ref) {
  return FirebaseAuth.instance.authStateChanges();
});

final currentUserProvider = Provider<User?>((ref) {
  return ref.watch(authStateProvider).valueOrNull;
});

/// Rol del usuario actual: 'cliente' | 'trabajador' | 'admin' (vía BFF `/users/me`).
final userRoleProvider = FutureProvider<String>((ref) async {
  final user = ref.watch(currentUserProvider);
  if (user == null) return 'cliente';
  if (user.email == Env.superadminEmail) return 'admin';
  final profile = await ref.watch(userProfileBffProvider.future);
  return (profile?['rol'] as String?) ?? 'cliente';
});

/// Acceso al shell `/admin` (admin o trabajador de tienda).
final isAdminProvider = Provider<bool>((ref) {
  final role = ref.watch(userRoleProvider).valueOrNull;
  return role == 'admin' || role == 'trabajador';
});

/// Nombre para mostrar del usuario actual, leído desde Supabase.
/// Prioridad: nombres+apellidos → nombre → displayName de Firebase → ''.
final userDisplayNameProvider = FutureProvider<String>((ref) async {
  final user = ref.watch(currentUserProvider);
  if (user == null) return '';

  final data = await ref.watch(userProfileBffProvider.future);
  if (data != null) {
    final nombres = (data['nombres'] as String?)?.trim() ?? '';
    final apellidos = (data['apellidos'] as String?)?.trim() ?? '';
    if (nombres.isNotEmpty) {
      final first = _capFirst(nombres);
      final last = _capFirst(apellidos);
      return [first, last].where((p) => p.isNotEmpty).join(' ');
    }

    final nombre = (data['nombre'] as String?)?.trim() ?? '';
    if (nombre.isNotEmpty) {
      final parts = nombre.split(RegExp(r'\s+'));
      return parts.take(2).map(_capWord).join(' ');
    }
  }

  final display = user.displayName?.trim() ?? '';
  if (display.isNotEmpty) {
    final parts = display.split(RegExp(r'\s+'));
    return parts.take(2).map(_capWord).join(' ');
  }
  return '';
});

String _capWord(String s) =>
    s.isEmpty ? s : s[0].toUpperCase() + s.substring(1).toLowerCase();

String _capFirst(String s) {
  final parts = s.trim().split(RegExp(r'\s+'));
  return parts.isNotEmpty ? _capWord(parts.first) : '';
}

class AuthNotifier extends StateNotifier<AsyncValue<void>> {
  AuthNotifier(this._repo) : super(const AsyncData(null));

  final AuthRepository _repo;

  Future<bool> signIn(String email, String password) async {
    state = const AsyncLoading();
    try {
      await _repo.signIn(email, password);
      state = const AsyncData(null);
      return true;
    } on FirebaseAuthException catch (e) {
      state = AsyncError(_mapError(e), StackTrace.current);
      return false;
    }
  }

  Future<bool> register({
    required String email,
    required String password,
    required String dni,
    required String nombres,
    required String apellidos,
    required String nombre,
    required String telefonoFormatted,
  }) async {
    state = const AsyncLoading();
    try {
      await _repo.register(
        email: email,
        password: password,
        dni: dni,
        nombres: nombres,
        apellidos: apellidos,
        nombre: nombre,
        telefonoFormatted: telefonoFormatted,
      );
      state = const AsyncData(null);
      return true;
    } on FirebaseAuthException catch (e) {
      state = AsyncError(_mapError(e), StackTrace.current);
      return false;
    } on EmailAlreadyInUseException {
      state = AsyncError('El correo ya está registrado.', StackTrace.current);
      return false;
    } catch (_) {
      state = AsyncError('Error al crear la cuenta. Intenta nuevamente.', StackTrace.current);
      return false;
    }
  }

  Future<void> signOut() => _repo.signOut();

  Future<bool> resetPassword(String email) async {
    try {
      await _repo.resetPassword(email.trim());
      return true;
    } on FirebaseAuthException catch (e) {
      state = AsyncError(_mapResetError(e), StackTrace.current);
      return false;
    }
  }

  String _mapResetError(FirebaseAuthException e) {
    switch (e.code) {
      case 'user-not-found':
        return 'No existe una cuenta con ese correo.';
      case 'invalid-email':
        return 'Correo electrónico inválido.';
      case 'too-many-requests':
        return 'Demasiados intentos. Intenta más tarde.';
      default:
        return e.message ?? 'No se pudo enviar el correo.';
    }
  }

  String _mapError(FirebaseAuthException e) {
    switch (e.code) {
      case 'user-not-found':
        return 'Usuario no encontrado.';
      case 'wrong-password':
        return 'Contraseña incorrecta.';
      case 'invalid-credential':
        return 'Credenciales incorrectas.';
      case 'email-already-in-use':
        return 'El correo ya está registrado.';
      case 'weak-password':
        return 'La contraseña debe tener al menos 6 caracteres.';
      case 'invalid-email':
        return 'Correo electrónico inválido.';
      case 'too-many-requests':
        return 'Demasiados intentos. Intenta más tarde.';
      default:
        return e.message ?? 'Error de autenticación.';
    }
  }
}

final authNotifierProvider =
    StateNotifierProvider<AuthNotifier, AsyncValue<void>>(
      (ref) => AuthNotifier(ref.watch(authRepositoryProvider)),
    );
