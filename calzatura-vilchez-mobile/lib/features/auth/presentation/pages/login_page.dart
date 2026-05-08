import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/auth_field.dart';
import '../../../../shared/widgets/cv_logo.dart';
import '../providers/auth_provider.dart';

class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key});

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage> {
  final _formKey = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  bool _showPass = false;

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passCtrl.dispose();
    super.dispose();
  }

  Future<void> _forgotPassword() async {
    final emailCtrl = TextEditingController(text: _emailCtrl.text.trim());
    final formKey = GlobalKey<FormState>();

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1A1A1A),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text(
          'Recuperar contraseña',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
        ),
        content: Form(
          key: formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Te enviaremos un enlace para restablecer tu contraseña.',
                style: TextStyle(
                  color: Colors.white60,
                  fontSize: 13,
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: emailCtrl,
                keyboardType: TextInputType.emailAddress,
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  labelText: 'Correo electrónico',
                  labelStyle: const TextStyle(color: Colors.white54),
                  prefixIcon: const Icon(
                    Icons.email_outlined,
                    color: Colors.white54,
                    size: 20,
                  ),
                  filled: true,
                  fillColor: Colors.white.withValues(alpha: 0.07),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none,
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(
                      color: AppColors.gold,
                      width: 1.5,
                    ),
                  ),
                ),
                validator: (v) {
                  if (v == null || v.trim().isEmpty) return 'Ingresa tu correo';
                  final valid = RegExp(
                    r'^[^@\s]+@[^@\s]+\.[^@\s]+$',
                  ).hasMatch(v.trim());
                  if (!valid) return 'Correo inválido';
                  return null;
                },
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text(
              'Cancelar',
              style: TextStyle(color: Colors.white54),
            ),
          ),
          ElevatedButton(
            onPressed: () {
              if (formKey.currentState!.validate()) Navigator.pop(ctx, true);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.gold,
              foregroundColor: AppColors.black,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
              elevation: 0,
            ),
            child: const Text(
              'Enviar',
              style: TextStyle(fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;

    final ok = await ref
        .read(authNotifierProvider.notifier)
        .resetPassword(emailCtrl.text);

    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          ok
              ? 'Correo enviado. Revisa tu bandeja de entrada.'
              : ref.read(authNotifierProvider).error?.toString() ??
                    'Error al enviar',
        ),
        backgroundColor: ok ? Colors.green.shade800 : AppColors.error,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final ok = await ref
        .read(authNotifierProvider.notifier)
        .signIn(_emailCtrl.text.trim(), _passCtrl.text);
    if (!ok || !mounted) return;
    // El router redirige automáticamente según el rol
    context.go('/catalog');
  }

  @override
  Widget build(BuildContext context) {
    final isLoading = ref.watch(authNotifierProvider).isLoading;

    ref.listen<AsyncValue<void>>(authNotifierProvider, (_, next) {
      if (next is AsyncError) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(next.error.toString()),
            backgroundColor: AppColors.error,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
            ),
          ),
        );
      }
    });

    return Scaffold(
      backgroundColor: AppColors.black,
      body: Stack(
        children: [
          // Efecto decorativo dorado superior
          Positioned(
            top: -100,
            right: -100,
            child: Container(
              width: 280,
              height: 280,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.gold.withValues(alpha: 0.08),
              ),
            ),
          ),
          Positioned(
            bottom: -120,
            left: -80,
            child: Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.gold.withValues(alpha: 0.05),
              ),
            ),
          ),
          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 28),
              child: Column(
                children: [
                  const SizedBox(height: 52),
                  // Logo CV
                  const CVLogo(size: 88, dark: true).animate().scale(
                    delay: 100.ms,
                    duration: 600.ms,
                    curve: Curves.elasticOut,
                  ),
                  const SizedBox(height: 20),
                  const Text(
                    'Calzatura Vilchez',
                    style: TextStyle(
                      fontSize: 26,
                      fontWeight: FontWeight.w800,
                      color: Colors.white,
                      letterSpacing: 0.5,
                    ),
                  ).animate().fadeIn(delay: 300.ms),
                  const SizedBox(height: 4),
                  const Text(
                    'Moda y confort en cada paso',
                    style: TextStyle(
                      color: AppColors.gold,
                      fontSize: 13,
                      letterSpacing: 0.3,
                    ),
                  ).animate().fadeIn(delay: 400.ms),
                  const SizedBox(height: 48),

                  // Card formulario
                  Container(
                        padding: const EdgeInsets.all(28),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.06),
                          borderRadius: BorderRadius.circular(24),
                          border: Border.all(
                            color: AppColors.gold.withValues(alpha: 0.2),
                          ),
                        ),
                        child: Form(
                          key: _formKey,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Iniciar sesión',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 22,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              const SizedBox(height: 4),
                              const Text(
                                'Ingresa con tu cuenta',
                                style: TextStyle(
                                  color: Colors.white54,
                                  fontSize: 13,
                                ),
                              ),
                              const SizedBox(height: 28),
                              AuthField(
                                controller: _emailCtrl,
                                label: 'Correo electrónico',
                                icon: Icons.email_outlined,
                                keyboardType: TextInputType.emailAddress,
                                validator: (v) {
                                  if (v == null || v.isEmpty) {
                                    return 'Ingresa tu correo';
                                  }
                                  if (!v.contains('@')) {
                                    return 'Correo inválido';
                                  }
                                  return null;
                                },
                              ),
                              const SizedBox(height: 16),
                              AuthField(
                                controller: _passCtrl,
                                label: 'Contraseña',
                                icon: Icons.lock_outline,
                                obscureText: !_showPass,
                                suffix: IconButton(
                                  icon: Icon(
                                    _showPass
                                        ? Icons.visibility_off
                                        : Icons.visibility,
                                    color: Colors.white54,
                                    size: 20,
                                  ),
                                  onPressed: () =>
                                      setState(() => _showPass = !_showPass),
                                ),
                                validator: (v) {
                                  if (v == null || v.isEmpty) {
                                    return 'Ingresa tu contraseña';
                                  }
                                  return null;
                                },
                              ),
                              const SizedBox(height: 12),
                              Align(
                                alignment: Alignment.centerRight,
                                child: GestureDetector(
                                  onTap: _forgotPassword,
                                  child: const Text(
                                    '¿Olvidaste tu contraseña?',
                                    style: TextStyle(
                                      color: AppColors.gold,
                                      fontSize: 13,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(height: 20),
                              SizedBox(
                                width: double.infinity,
                                height: 52,
                                child: ElevatedButton(
                                  onPressed: isLoading ? null : _submit,
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppColors.gold,
                                    foregroundColor: AppColors.black,
                                    disabledBackgroundColor: AppColors.gold
                                        .withValues(alpha: 0.5),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(14),
                                    ),
                                    elevation: 0,
                                  ),
                                  child: isLoading
                                      ? const SizedBox(
                                          width: 22,
                                          height: 22,
                                          child: CircularProgressIndicator(
                                            color: AppColors.black,
                                            strokeWidth: 2.5,
                                          ),
                                        )
                                      : const Text(
                                          'Ingresar',
                                          style: TextStyle(
                                            fontSize: 16,
                                            fontWeight: FontWeight.w700,
                                          ),
                                        ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      )
                      .animate()
                      .slideY(
                        begin: 0.3,
                        delay: 500.ms,
                        duration: 500.ms,
                        curve: Curves.easeOutCubic,
                      )
                      .fadeIn(delay: 500.ms),

                  const SizedBox(height: 28),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Text(
                        '¿No tienes cuenta? ',
                        style: TextStyle(color: Colors.white60, fontSize: 14),
                      ),
                      GestureDetector(
                        onTap: () => context.push('/register'),
                        child: const Text(
                          'Regístrate',
                          style: TextStyle(
                            color: AppColors.gold,
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ).animate().fadeIn(delay: 700.ms),
                  const SizedBox(height: 32),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
