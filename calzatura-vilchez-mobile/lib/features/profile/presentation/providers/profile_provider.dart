import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../data/profile_repository.dart';

class ProfileData {
  const ProfileData({
    required this.uid,
    required this.email,
    this.dni,
    this.nombres,
    this.apellidos,
    this.nombre,
    this.telefono,
    required this.rol,
    this.creadoEn,
    this.fotoBase64,
  });

  final String uid;
  final String email;
  final String? dni;
  final String? nombres;
  final String? apellidos;
  final String? nombre;
  final String? telefono;
  final String rol;
  final String? creadoEn;
  final String? fotoBase64;
}

final profileDataProvider = FutureProvider.autoDispose<ProfileData?>((ref) async {
  final user = ref.watch(currentUserProvider);
  if (user == null) return null;
  final repo = ref.read(profileRepositoryProvider);
  final data = await repo.fetchProfile(user.uid);
  if (data == null) return null;
  return ProfileData(
    uid: user.uid,
    email: user.email ?? '',
    dni: data['dni'] as String?,
    nombres: data['nombres'] as String?,
    apellidos: data['apellidos'] as String?,
    nombre: data['nombre'] as String?,
    telefono: data['telefono'] as String?,
    rol: (data['rol'] as String?) ?? 'cliente',
    creadoEn: data['creadoEn'] as String?,
    fotoBase64: data['fotoBase64'] as String?,
  );
});
