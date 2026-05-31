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
    // Firmar también en Supabase para activar el rol `authenticated` en queries.
    // Si el usuario no tiene cuenta Supabase aún, se crea en este momento.
    await _signInSupabase(email: email, password: password);
    return cred;
  }

  /// Intenta signIn en Supabase; si la cuenta no existe la crea (usuarios migrados).
  Future<void> _signInSupabase({
    required String email,
    required String password,
  }) async {
    try {
      await _supabase.auth.signInWithPassword(
        email: email.trim().toLowerCase(),
        password: password,
      );
    } on sb.AuthException catch (e) {
      if (e.statusCode == '400' || e.message.contains('Invalid login')) {
        // La cuenta Supabase no existe todavía — la creamos automáticamente.
        try {
          await _supabase.auth.signUp(
            email: email.trim().toLowerCase(),
            password: password,
          );
        } catch (_) {
          debugPrint('[AuthRepository] Supabase signUp fallback failed');
        }
      } else {
        debugPrint('[AuthRepository] Supabase signIn error: $e');
      }
    } catch (e) {
      debugPrint('[AuthRepository] Supabase signIn unexpected: $e');
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
    // Verificar email duplicado en Supabase antes de crear cuenta Firebase
    final existing = await _supabase
        .from('usuarios')
        .select('uid')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();
    if (existing != null) {
      throw const EmailAlreadyInUseException();
    }

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
      await cred.user?.sendEmailVerification();
      // Crear cuenta Supabase Auth para que las queries usen rol `authenticated`.
      await _signInSupabase(email: email, password: password);
    } catch (e) {
      // Si Supabase falla, eliminar cuenta Firebase para evitar cuentas huérfanas
      debugPrint('[AuthRepository] post-register failed: $e');
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
