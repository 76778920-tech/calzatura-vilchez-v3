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

  /// Debe ser la misma URL que el secret `VITE_DNI_LOOKUP_URL` (GitHub / web).
  /// Proyecto Vercel con tokens DNI (LATINFO, PERUAPI, etc.), no calzatura-vilchez-v3.
  static String get dniLookupUrl {
    final fromEnv =
        dotenv.env['DNI_LOOKUP_URL']?.trim() ??
        dotenv.env['VITE_DNI_LOOKUP_URL']?.trim();
    if (fromEnv != null && fromEnv.isNotEmpty) return fromEnv;
    return 'https://calzatura-vilchez-bff.onrender.com/lookup-dni';
  }

  /// Clave pública de Stripe (pk_test_... / pk_live_...).
  /// No tiene valor por defecto — falla rápido si falta.
  static String get stripePublishableKey =>
      dotenv.env['STRIPE_PUBLISHABLE_KEY']!;
}
