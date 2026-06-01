import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart' as sb;

class EmailAlreadyInUseException implements Exception {
  const EmailAlreadyInUseException();
}

class AuthRepository {
  final _auth = FirebaseAuth.instance;
  final _supabase = sb.Supabase.instance.client;

  Future<UserCredential> signIn(String email, String password) async {
    final cred = await _auth.signInWithEmailAndPassword(
      email: email,
      password: password,
    );
    await _syncSupabaseSession(email: email, password: password);
    return cred;
  }

  /// Sincroniza la sesión de Supabase para activar el rol `authenticated`.
  ///
  /// Flujo:
  ///  1. signInWithPassword → ok → sesión establecida.
  ///  2. Falla 400 (credenciales inválidas) → la cuenta puede no existir:
  ///     a. signUp → ok → sesión establecida (si autoconfirm está activo).
  ///     b. signUp falla "User already registered" → la cuenta existe pero con
  ///        contraseña diferente (el usuario hizo reset en Firebase). Se continúa
  ///        como anon; las tablas públicas funcionan normalmente.
  ///  3. Cualquier otro error → log + continúa como anon.
  Future<void> _syncSupabaseSession({
    required String email,
    required String password,
  }) async {
    final normalizedEmail = email.trim().toLowerCase();
    try {
      await _supabase.auth.signInWithPassword(
        email: normalizedEmail,
        password: password,
      );
      return; // sesión establecida correctamente
    } on sb.AuthException catch (e) {
      final isInvalidCredentials =
          e.statusCode == '400' ||
          e.message.toLowerCase().contains('invalid login') ||
          e.message.toLowerCase().contains('invalid credentials');

      if (!isInvalidCredentials) {
        debugPrint('[Auth] Supabase signIn error inesperado: ${e.message}');
        return;
      }

      // Credenciales inválidas: intentar crear la cuenta Supabase.
      try {
        final res = await _supabase.auth.signUp(
          email: normalizedEmail,
          password: password,
        );
        // signUp exitoso pero sin sesión activa (email confirm requerido):
        // intentar signIn una vez más para obtener la sesión.
        if (res.session == null) {
          try {
            await _supabase.auth.signInWithPassword(
              email: normalizedEmail,
              password: password,
            );
          } catch (_) {}
        }
      } on sb.AuthException catch (signUpErr) {
        final alreadyExists =
            signUpErr.message.toLowerCase().contains('already registered') ||
            signUpErr.message.toLowerCase().contains('already been registered') ||
            signUpErr.statusCode == '422';
        if (alreadyExists) {
          // Cuenta Supabase existente con contraseña diferente (post-reset Firebase).
          // Continúa como anon — las tablas con grant anon funcionan normalmente.
          debugPrint(
            '[Auth] Supabase: cuenta existe con contraseña diferente. '
            'El usuario debe cerrar sesión y volver a entrar para sincronizar.',
          );
        } else {
          debugPrint('[Auth] Supabase signUp error: ${signUpErr.message}');
        }
      } catch (e) {
        debugPrint('[Auth] Supabase signUp inesperado: $e');
      }
    } catch (e) {
      debugPrint('[Auth] Supabase sync inesperado: $e');
    }
  }

  Future<UserCredential> register({
    required String email,
    required String password,
    required String dni,
    required String nombres,
    required String apellidos,
    required String nombre,
    required String telefonoFormatted,
  }) async {
    // Verificar email duplicado en Supabase antes de crear cuenta Firebase.
    final existing = await _supabase
        .from('usuarios')
        .select('uid')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();
    if (existing != null) throw const EmailAlreadyInUseException();

    final cred = await _auth.createUserWithEmailAndPassword(
      email: email,
      password: password,
    );

    try {
      await cred.user?.updateDisplayName(nombre);
      await _supabase.from('usuarios').insert({
        'uid': cred.user!.uid,
        'email': email.trim().toLowerCase(),
        'dni': dni,
        'nombres': nombres,
        'apellidos': apellidos,
        'nombre': nombre,
        'telefono': telefonoFormatted,
        'rol': 'cliente',
        'creadoEn': DateTime.now().toIso8601String(),
      });
      await cred.user?.sendEmailVerification(
        ActionCodeSettings(
          url: 'https://calzaturavilchez-ab17f.firebaseapp.com',
          handleCodeInApp: false,
          androidPackageName: 'com.calzaturavilchez.calzatura_vilchez_mobile',
          androidInstallApp: false,
        ),
      );
      // Crear cuenta Supabase Auth para activar rol `authenticated`.
      await _syncSupabaseSession(email: email, password: password);
    } catch (e) {
      debugPrint('[Auth] post-register failed: $e');
      await cred.user?.delete().catchError((_) {});
      rethrow;
    }

    return cred;
  }

  Future<void> signOut() async {
    await _supabase.auth.signOut().catchError((_) {});
    await _auth.signOut();
  }

  Future<void> resetPassword(String email) =>
      _auth.sendPasswordResetEmail(email: email);

  User? get currentUser => _auth.currentUser;
}

final authRepositoryProvider = Provider<AuthRepository>(
  (ref) => AuthRepository(),
);
