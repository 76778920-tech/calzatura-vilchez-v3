import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/auth_background.dart';

class VerifyEmailPage extends StatefulWidget {
  const VerifyEmailPage({super.key});

  @override
  State<VerifyEmailPage> createState() => _VerifyEmailPageState();
}

class _VerifyEmailPageState extends State<VerifyEmailPage> {
  bool _checking = false;
  bool _resending = false;
  String? _message;
  bool _messageIsError = false;

  String get _email =>
      FirebaseAuth.instance.currentUser?.email ?? 'tu correo';

  Future<void> _checkVerification() async {
    setState(() {
      _checking = true;
      _message = null;
    });
    try {
      await FirebaseAuth.instance.currentUser?.reload();
      if (!mounted) return;
      final verified =
          FirebaseAuth.instance.currentUser?.emailVerified ?? false;
      if (verified) {
        context.go('/home');
      } else {
        setState(() {
          _message = 'Correo aún no verificado. Revisa tu bandeja de entrada.';
          _messageIsError = true;
        });
      }
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _message = 'No se pudo verificar. Intenta de nuevo.';
        _messageIsError = true;
      });
    } finally {
      if (mounted) setState(() => _checking = false);
    }
  }

  Future<void> _resend() async {
    setState(() {
      _resending = true;
      _message = null;
    });
    try {
      await FirebaseAuth.instance.currentUser?.sendEmailVerification(
        ActionCodeSettings(
          url: 'https://calzaturavilchez-ab17f.firebaseapp.com',
          handleCodeInApp: false,
          androidPackageName: 'com.calzaturavilchez.calzatura_vilchez_mobile',
          androidInstallApp: false,
        ),
      );
      if (!mounted) return;
      setState(() {
        _message = 'Correo de verificación reenviado.';
        _messageIsError = false;
      });
    } catch (e) {
      if (!mounted) return;
      final msg = e.toString().toLowerCase();
      setState(() {
        _message = msg.contains('too-many-requests') || msg.contains('too many')
            ? 'Espera unos minutos antes de reenviar.'
            : 'No se pudo reenviar. Intenta más tarde.';
        _messageIsError = true;
      });
    } finally {
      if (mounted) setState(() => _resending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.black,
      body: Stack(
        fit: StackFit.expand,
        children: [
          const AuthBackground(),
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 28),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      width: 72,
                      height: 72,
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [AppColors.gold, AppColors.goldDark],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.gold.withValues(alpha: 0.35),
                            blurRadius: 24,
                            offset: const Offset(0, 6),
                          ),
                        ],
                      ),
                      child: const Icon(
                        Icons.mark_email_unread_outlined,
                        color: AppColors.black,
                        size: 34,
                      ),
                    ).animate().scale(
                          delay: 100.ms,
                          duration: 500.ms,
                          curve: Curves.elasticOut,
                        ),
                    const SizedBox(height: 24),
                    const Text(
                      'Verifica tu correo',
                      style: TextStyle(
                        fontSize: 26,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ).animate().fadeIn(delay: 200.ms),
                    const SizedBox(height: 10),
                    Text(
                      'Enviamos un enlace de verificación a:',
                      style: const TextStyle(
                        color: Colors.white60,
                        fontSize: 14,
                      ),
                      textAlign: TextAlign.center,
                    ).animate().fadeIn(delay: 300.ms),
                    const SizedBox(height: 6),
                    Text(
                      _email,
                      style: const TextStyle(
                        color: AppColors.gold,
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                      ),
                      textAlign: TextAlign.center,
                    ).animate().fadeIn(delay: 350.ms),
                    const SizedBox(height: 8),
                    const Text(
                      'Ábrelo y pulsa el enlace, luego vuelve aquí.',
                      style: TextStyle(color: Colors.white38, fontSize: 13),
                      textAlign: TextAlign.center,
                    ).animate().fadeIn(delay: 400.ms),
                    const SizedBox(height: 32),

                    // Feedback message
                    if (_message != null) ...[
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 10,
                        ),
                        decoration: BoxDecoration(
                          color: (_messageIsError
                                  ? AppColors.error
                                  : Colors.green.shade700)
                              .withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: (_messageIsError
                                    ? AppColors.error
                                    : Colors.green.shade700)
                                .withValues(alpha: 0.5),
                          ),
                        ),
                        child: Text(
                          _message!,
                          style: TextStyle(
                            color: _messageIsError
                                ? AppColors.error
                                : Colors.green.shade300,
                            fontSize: 13,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ),
                      const SizedBox(height: 20),
                    ],

                    // Primary: check verification
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton(
                        onPressed: _checking ? null : _checkVerification,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.gold,
                          foregroundColor: AppColors.black,
                          disabledBackgroundColor:
                              AppColors.gold.withValues(alpha: 0.5),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                          elevation: 0,
                        ),
                        child: _checking
                            ? const SizedBox(
                                width: 22,
                                height: 22,
                                child: CircularProgressIndicator(
                                  color: AppColors.black,
                                  strokeWidth: 2.5,
                                ),
                              )
                            : const Text(
                                'Ya verifiqué mi correo',
                                style: TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                      ),
                    ).animate().fadeIn(delay: 450.ms),
                    const SizedBox(height: 12),

                    // Secondary: resend
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: OutlinedButton(
                        onPressed: _resending ? null : _resend,
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.gold,
                          side: BorderSide(
                            color: AppColors.gold.withValues(alpha: 0.5),
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        child: _resending
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  color: AppColors.gold,
                                  strokeWidth: 2,
                                ),
                              )
                            : const Text(
                                'Reenviar correo',
                                style: TextStyle(fontSize: 15),
                              ),
                      ),
                    ).animate().fadeIn(delay: 500.ms),
                    const SizedBox(height: 20),

                    // Skip link
                    TextButton(
                      onPressed: () => context.go('/home'),
                      child: const Text(
                        'Continuar sin verificar',
                        style: TextStyle(color: Colors.white38, fontSize: 13),
                      ),
                    ).animate().fadeIn(delay: 550.ms),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
