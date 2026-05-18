import 'package:flutter_dotenv/flutter_dotenv.dart';

class Env {
  static String get supabaseUrl => dotenv.env['SUPABASE_URL']!;
  static String get supabaseAnonKey => dotenv.env['SUPABASE_ANON_KEY']!;
  static String get aiServiceUrl => dotenv.env['AI_SERVICE_URL']!;
  static String get aiServiceToken => dotenv.env['AI_SERVICE_BEARER_TOKEN']!;
  static String get superadminEmail => dotenv.env['SUPERADMIN_EMAIL']!;
  static String get cloudinaryCloudName =>
      dotenv.env['CLOUDINARY_CLOUD_NAME']?.trim().isNotEmpty == true
      ? dotenv.env['CLOUDINARY_CLOUD_NAME']!.trim()
      : 'dnenqnvbg';
  static String get cloudinaryUploadPreset =>
      dotenv.env['CLOUDINARY_UPLOAD_PRESET']?.trim().isNotEmpty == true
      ? dotenv.env['CLOUDINARY_UPLOAD_PRESET']!.trim()
      : 'calzatura_uploads';

  /// BFF Express (misma base que `VITE_BACKEND_API_URL` en la web).
  static String get backendApiUrl {
    final raw =
        dotenv.env['BACKEND_API_URL']?.trim() ??
        dotenv.env['VITE_BACKEND_API_URL']?.trim();
    if (raw != null && raw.isNotEmpty) return raw;
    return 'https://calzatura-vilchez-bff.onrender.com';
  }

  /// Misma URL que `VITE_DNI_LOOKUP_URL` en la web (opcional).
  static String? get dniLookupUrl {
    final u = dotenv.env['DNI_LOOKUP_URL']?.trim();
    if (u == null || u.isEmpty) return null;
    return u;
  }
}
