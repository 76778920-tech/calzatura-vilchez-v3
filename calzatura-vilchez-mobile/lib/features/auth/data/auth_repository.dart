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

  Future<UserCredential> signIn(String email, String password) =>
      _auth.signInWithEmailAndPassword(email: email, password: password);

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
    } catch (e) {
      // Si Supabase falla, eliminar cuenta Firebase para evitar cuentas huérfanas
      debugPrint('[AuthRepository] post-register failed: $e');
      await cred.user?.delete().catchError((_) {});
      rethrow;
    }

    return cred;
  }

  Future<void> signOut() => _auth.signOut();

  Future<void> resetPassword(String email) =>
      _auth.sendPasswordResetEmail(email: email);

  User? get currentUser => _auth.currentUser;
}

final authRepositoryProvider = Provider<AuthRepository>(
  (ref) => AuthRepository(),
);
