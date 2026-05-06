import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart' as sb;
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
  if (user.email == '76778920@continental.edu.pe') return 'admin';
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
  return roleAsync.valueOrNull == 'admin' || roleAsync.valueOrNull == 'trabajador';
});

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

  Future<bool> register(String email, String password, String nombre) async {
    state = const AsyncLoading();
    try {
      await _repo.register(email, password, nombre);
      state = const AsyncData(null);
      return true;
    } on FirebaseAuthException catch (e) {
      state = AsyncError(_mapError(e), StackTrace.current);
      return false;
    }
  }

  Future<void> signOut() => _repo.signOut();

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
