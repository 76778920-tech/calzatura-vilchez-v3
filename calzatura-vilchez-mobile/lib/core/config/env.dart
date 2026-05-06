import 'package:flutter_dotenv/flutter_dotenv.dart';

class Env {
  static String get supabaseUrl => dotenv.env['SUPABASE_URL']!;
  static String get supabaseAnonKey => dotenv.env['SUPABASE_ANON_KEY']!;
  static String get aiServiceUrl => dotenv.env['AI_SERVICE_URL']!;
  static String get aiServiceToken => dotenv.env['AI_SERVICE_BEARER_TOKEN']!;
  static String get superadminEmail => dotenv.env['SUPERADMIN_EMAIL']!;
}
