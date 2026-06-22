import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class ProfileRepository {
  final _supabase = Supabase.instance.client;

  Future<Map<String, dynamic>?> fetchProfile(String uid) =>
      _supabase
          .from('usuarios')
          .select('uid, email, dni, nombres, apellidos, nombre, telefono, rol, creadoEn, fotoBase64')
          .eq('uid', uid)
          .maybeSingle();

  Future<void> updateTelefono(String uid, String telefono) =>
      _supabase.from('usuarios').update({'telefono': telefono}).eq('uid', uid);

  Future<void> updateFotoBase64(String uid, String? base64) =>
      _supabase.from('usuarios').update({'fotoBase64': base64}).eq('uid', uid);
}

final profileRepositoryProvider = Provider<ProfileRepository>(
  (_) => ProfileRepository(),
);
