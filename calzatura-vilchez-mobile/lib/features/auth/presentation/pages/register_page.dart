import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/auth_field.dart';
import '../../../../shared/widgets/back_navigation_scope.dart';
import '../providers/auth_provider.dart';

class RegisterPage extends ConsumerStatefulWidget {
  const RegisterPage({super.key});

  @override
  ConsumerState<RegisterPage> createState() => _RegisterPageState();
}

class _RegisterPageState extends ConsumerState<RegisterPage> {
  final _formKey = GlobalKey<FormState>();
  final _nombreCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();
  bool _showPass = false;

  @override
  void dispose() {
    _nombreCtrl.dispose();
    _emailCtrl.dispose();
    _passCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final ok = await ref
        .read(authNotifierProvider.notifier)
        .register(
          _emailCtrl.text.trim(),
          _passCtrl.text,
          _nombreCtrl.text.trim(),
        );
    if (ok && mounted) context.go('/catalog');
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

    return BackNavigationScope(
      fallbackRoute: '/login',
      child: Scaffold(
        backgroundColor: AppColors.black,
        body: Stack(
          children: [
            Positioned(
              top: -60,
              left: -80,
              child: Container(
                width: 280,
                height: 280,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.gold.withValues(alpha: 0.08),
                ),
              ),
            ),
            SafeArea(
              child: Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    child: Row(
                      children: [
                        IconButton(
                          icon: const Icon(
                            Icons.arrow_back_ios_new,
                            color: Colors.white70,
                            size: 20,
                          ),
                          onPressed: () => handleBackNavigation(
                            context,
                            fallbackRoute: '/login',
                          ),
                        ),
                      ],
                    ),
                  ),
                  Expanded(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.symmetric(horizontal: 24),
                      child: Column(
                        children: [
                          const SizedBox(height: 8),
                          const Text(
                            'Crear cuenta',
                            style: TextStyle(
                              fontSize: 28,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ).animate().fadeIn(delay: 100.ms),
                          const SizedBox(height: 4),
                          const Text(
                            'Únete a Calzatura Vilchez',
                            style: TextStyle(
                              color: Colors.white54,
                              fontSize: 14,
                            ),
                          ).animate().fadeIn(delay: 200.ms),
                          const SizedBox(height: 32),
                          Container(
                            padding: const EdgeInsets.all(24),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.07),
                              borderRadius: BorderRadius.circular(24),
                              border: Border.all(
                                color: AppColors.gold.withValues(alpha: 0.2),
                              ),
                            ),
                            child: Form(
                              key: _formKey,
                              child: Column(
                                children: [
                                  AuthField(
                                    controller: _nombreCtrl,
                                    label: 'Nombre completo',
                                    icon: Icons.person_outline,
                                    validator: (v) {
                                      if (v == null || v.isEmpty) {
                                        return 'Ingresa tu nombre';
                                      }
                                      return null;
                                    },
                                  ),
                                  const SizedBox(height: 14),
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
                                  const SizedBox(height: 14),
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
                                      onPressed: () => setState(
                                        () => _showPass = !_showPass,
                                      ),
                                    ),
                                    validator: (v) {
                                      if (v == null || v.length < 6) {
                                        return 'Mínimo 6 caracteres';
                                      }
                                      return null;
                                    },
                                  ),
                                  const SizedBox(height: 14),
                                  AuthField(
                                    controller: _confirmCtrl,
                                    label: 'Confirmar contraseña',
                                    icon: Icons.lock_outline,
                                    obscureText: !_showPass,
                                    validator: (v) {
                                      if (v != _passCtrl.text) {
                                        return 'Las contraseñas no coinciden';
                                      }
                                      return null;
                                    },
                                  ),
                                  const SizedBox(height: 28),
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
                                          borderRadius: BorderRadius.circular(
                                            14,
                                          ),
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
                                              'Crear cuenta',
                                              style: TextStyle(
                                                fontSize: 16,
                                                fontWeight: FontWeight.w600,
                                              ),
                                            ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ).animate().slideY(
                            begin: 0.2,
                            delay: 300.ms,
                            duration: 400.ms,
                            curve: Curves.easeOutCubic,
                          ),
                          const SizedBox(height: 24),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Text(
                                '¿Ya tienes cuenta? ',
                                style: TextStyle(
                                  color: Colors.white60,
                                  fontSize: 14,
                                ),
                              ),
                              GestureDetector(
                                onTap: () => handleBackNavigation(
                                  context,
                                  fallbackRoute: '/login',
                                ),
                                child: const Text(
                                  'Inicia sesión',
                                  style: TextStyle(
                                    color: AppColors.gold,
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            ],
                          ).animate().fadeIn(delay: 500.ms),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
