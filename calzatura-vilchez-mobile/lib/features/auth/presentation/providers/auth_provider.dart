import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart' as sb;
import '../../../../core/config/env.dart';
import '../../data/auth_repository.dart';

final authStateProvider = StreamProvider<User?>((ref) {
  return FirebaseAuth.instance.authStateChanges();
});

final currentUserProvider = Provider<User?>((ref) {
  return ref.watch(authStateProvider).valueOrNull;
});

/// Rol del usuario actual: 'cliente' | 'trabajador' | 'admin'
/// Superadmin email recibe 'admin' directamente.
final userRoleProvider = FutureProvider<String>((ref) async {
  final user = ref.watch(currentUserProvider);
  if (user == null) return 'cliente';
  // Superadmin hardcoded igual que la web
  if (user.email == Env.superadminEmail) return 'admin';
  try {
    final data = await sb.Supabase.instance.client
        .from('usuarios')
        .select('rol')
        .eq('uid', user.uid)
        .maybeSingle();
    return (data?['rol'] as String?) ?? 'cliente';
  } catch (_) {
    return 'cliente';
  }
});

final isAdminProvider = Provider<bool>((ref) {
  final roleAsync = ref.watch(userRoleProvider);
  return roleAsync.valueOrNull == 'admin' ||
      roleAsync.valueOrNull == 'trabajador';
});

/// Nombre para mostrar del usuario actual, leído desde Supabase.
/// Prioridad: nombres+apellidos → nombre → displayName de Firebase → ''.
final userDisplayNameProvider = FutureProvider<String>((ref) async {
  final user = ref.watch(currentUserProvider);
  if (user == null) return '';

  try {
    final data = await sb.Supabase.instance.client
        .from('usuarios')
        .select('nombre, nombres, apellidos')
        .eq('uid', user.uid)
        .maybeSingle();

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
  } catch (_) {}

  // Fallback: displayName de Firebase
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
