import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter_stripe/flutter_stripe.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'firebase_options.dart';
import 'core/config/env.dart';
import 'core/router/app_router.dart';
import 'core/session/app_session_policy.dart';
import 'core/theme/app_theme.dart';
import 'features/catalog/presentation/providers/catalog_provider.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: Colors.white,
      systemNavigationBarIconBrightness: Brightness.dark,
    ),
  );

  await initializeDateFormatting('es_PE', null);
  await dotenv.load(fileName: '.env');
  Stripe.publishableKey = Env.stripePublishableKey;
  assert(() {
    debugPrint('[Calzatura] BFF: ${Env.backendApiUrl}');
    debugPrint('[Calzatura] DNI lookup: ${Env.dniLookupUrl}');
    return true;
  }());

  try {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
  } catch (e) {
    debugPrint('[Firebase] init: $e');
  }

  await Supabase.initialize(url: Env.supabaseUrl, anonKey: Env.supabaseAnonKey);

  runApp(const ProviderScope(child: CalzaturaApp()));
}

class CalzaturaApp extends ConsumerStatefulWidget {
  const CalzaturaApp({super.key});

  @override
  ConsumerState<CalzaturaApp> createState() => _CalzaturaAppState();
}

class _CalzaturaAppState extends ConsumerState<CalzaturaApp>
    with WidgetsBindingObserver {
  late final AppSessionPolicy _sessionPolicy;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _sessionPolicy = AppSessionPolicy(signOut: _signOut);
    _startInactivityTimer();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _sessionPolicy.dispose();
    super.dispose();
  }

  /// Punto 4 del PDF.
  void _startInactivityTimer() {
    _sessionPolicy.startInactivityTimer();
  }

  /// Punto 2 del PDF (+ Supabase para consistencia de la app).
  Future<void> _signOut() async {
    await FirebaseAuth.instance.signOut();
    await Supabase.instance.client.auth.signOut().catchError((_) {});
    if (!mounted) return;
    ref.read(appRouterProvider).go('/login');
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _sessionPolicy.onLifecycleChanged(state);
  }

  @override
  Widget build(BuildContext context) {
    ref.watch(catalogLiveSyncProvider);
    final router = ref.watch(appRouterProvider);
    return MaterialApp.router(
      title: 'Calzatura Vilchez',
      theme: AppTheme.light,
      routerConfig: router,
      debugShowCheckedModeBanner: false,
    );
  }
}
