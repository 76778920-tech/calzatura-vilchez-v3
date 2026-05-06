import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart' as sb;

class AuthRepository {
  final _auth = FirebaseAuth.instance;
  final _supabase = sb.Supabase.instance.client;

  Future<UserCredential> signIn(String email, String password) =>
      _auth.signInWithEmailAndPassword(email: email, password: password);

  Future<UserCredential> register(
      String email, String password, String nombre) async {
    final cred = await _auth.createUserWithEmailAndPassword(
        email: email, password: password);
    await cred.user?.updateDisplayName(nombre);
    try {
      await _supabase.from('usuarios').upsert({
        'uid': cred.user!.uid,
        'email': email,
        'nombre': nombre,
        'rol': 'cliente',
        'creadoEn': DateTime.now().toIso8601String(),
      }, onConflict: 'uid');
    } catch (_) {}
    return cred;
  }

  Future<void> signOut() => _auth.signOut();

  Future<void> resetPassword(String email) =>
      _auth.sendPasswordResetEmail(email: email);

  User? get currentUser => _auth.currentUser;
}

final authRepositoryProvider =
    Provider<AuthRepository>((ref) => AuthRepository());
