import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/config/env.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/utils/dni.dart';
import '../../../../shared/utils/peru_phone.dart';
import '../../../../shared/widgets/auth_field.dart';
import '../../../../shared/widgets/back_navigation_scope.dart';
import '../../data/dni_lookup_service.dart';
import '../providers/auth_provider.dart';

const int _minPasswordLength = 8;

class RegisterPage extends ConsumerStatefulWidget {
  const RegisterPage({super.key});

  @override
  ConsumerState<RegisterPage> createState() => _RegisterPageState();
}

class _RegisterPageState extends ConsumerState<RegisterPage> {
  final _formKey = GlobalKey<FormState>();
  final _dniCtrl = TextEditingController();
  final _nombresCtrl = TextEditingController();
  final _apellidosCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _telefonoCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();
  final _dniLookup = DniLookupService();

  bool _showPass = false;
  bool _lookingUpDni = false;
  String _validatedDni = '';

  @override
  void dispose() {
    _dniCtrl.dispose();
    _nombresCtrl.dispose();
    _apellidosCtrl.dispose();
    _emailCtrl.dispose();
    _telefonoCtrl.dispose();
    _passCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }

  void _onDniInputChanged(String _) {
    final n = normalizeDni(_dniCtrl.text);
    if (_validatedDni.isNotEmpty && n != _validatedDni) {
      setState(() {
        _validatedDni = '';
        _nombresCtrl.clear();
        _apellidosCtrl.clear();
      });
    }
  }

  Future<void> _lookupDni() async {
    final normalized = normalizeDni(_dniCtrl.text);
    if (_dniCtrl.text != normalized) {
      _dniCtrl.value = TextEditingValue(
        text: normalized,
        selection: TextSelection.collapsed(offset: normalized.length),
      );
    }
    if (!isValidDni(normalized)) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Ingresa un DNI válido de 8 dígitos'),
          backgroundColor: AppColors.error,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    setState(() => _lookingUpDni = true);
    try {
      final person = await _dniLookup.lookup(normalized, Env.dniLookupUrl);
      if (!mounted) return;
      setState(() {
        _nombresCtrl.text = person.nombres;
        _apellidosCtrl.text = person.apellidos;
        _validatedDni = person.dni;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Datos encontrados'),
          backgroundColor: Colors.green.shade800,
          behavior: SnackBarBehavior.floating,
        ),
      );
    } on DniLookupError catch (e) {
      if (!mounted) return;
      setState(() {
        _validatedDni = '';
        _nombresCtrl.clear();
        _apellidosCtrl.clear();
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.userMessage),
          backgroundColor: AppColors.error,
          behavior: SnackBarBehavior.floating,
        ),
      );
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _validatedDni = '';
        _nombresCtrl.clear();
        _apellidosCtrl.clear();
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('No se pudo consultar el DNI'),
          backgroundColor: AppColors.error,
          behavior: SnackBarBehavior.floating,
        ),
      );
    } finally {
      if (mounted) setState(() => _lookingUpDni = false);
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final dni = normalizeDni(_dniCtrl.text);
    if (!isValidDni(dni)) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('El DNI debe tener 8 dígitos'),
          backgroundColor: AppColors.error,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }
    if (_validatedDni.isEmpty ||
        _nombresCtrl.text.trim().isEmpty ||
        _apellidosCtrl.text.trim().isEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Primero busca tu DNI con el ícono de búsqueda'),
          backgroundColor: AppColors.error,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }
    if (dni != _validatedDni) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Vuelve a validar el DNI tras editarlo'),
          backgroundColor: AppColors.error,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    final nombre = '${_nombresCtrl.text.trim()} ${_apellidosCtrl.text.trim()}'
        .trim();

    final ok = await ref
        .read(authNotifierProvider.notifier)
        .register(
          email: _emailCtrl.text.trim(),
          password: _passCtrl.text,
          dni: _validatedDni,
          nombres: _nombresCtrl.text.trim(),
          apellidos: _apellidosCtrl.text.trim(),
          nombre: nombre,
          telefonoFormatted: formatPeruPhone(_telefonoCtrl.text),
        );
    if (ok && mounted) context.go('/catalog');
  }

  @override
  Widget build(BuildContext context) {
    final isLoading = ref.watch(authNotifierProvider).isLoading;
    final dniDigits = normalizeDni(_dniCtrl.text);

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
                                    controller: _dniCtrl,
                                    label: 'DNI',
                                    icon: Icons.badge_outlined,
                                    keyboardType: TextInputType.number,
                                    inputFormatters: [
                                      FilteringTextInputFormatter.digitsOnly,
                                      LengthLimitingTextInputFormatter(8),
                                    ],
                                    onChanged: _onDniInputChanged,
                                    validator: (v) {
                                      if (v == null || v.isEmpty) {
                                        return 'Ingresa tu DNI';
                                      }
                                      if (!isValidDni(v)) {
                                        return 'El DNI debe tener 8 dígitos';
                                      }
                                      return null;
                                    },
                                    suffix: IconButton(
                                      tooltip: 'Buscar datos por DNI',
                                      icon: _lookingUpDni
                                          ? const SizedBox(
                                              width: 22,
                                              height: 22,
                                              child: CircularProgressIndicator(
                                                strokeWidth: 2,
                                                color: AppColors.gold,
                                              ),
                                            )
                                          : const Icon(
                                              Icons.search,
                                              color: Colors.white54,
                                            ),
                                      onPressed:
                                          _lookingUpDni || dniDigits.length != 8
                                          ? null
                                          : _lookupDni,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  const Align(
                                    alignment: Alignment.centerLeft,
                                    child: Text(
                                      '8 dígitos. Pulsa la lupa para validar con RENIEC.',
                                      style: TextStyle(
                                        color: Colors.white38,
                                        fontSize: 11,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(height: 14),
                                  AuthField(
                                    controller: _nombresCtrl,
                                    label: 'Nombres',
                                    icon: Icons.person_outline,
                                    readOnly: true,
                                    validator: (v) {
                                      if (v == null || v.trim().isEmpty) {
                                        return 'Valida el DNI con la lupa';
                                      }
                                      return null;
                                    },
                                  ),
                                  const SizedBox(height: 14),
                                  AuthField(
                                    controller: _apellidosCtrl,
                                    label: 'Apellidos',
                                    icon: Icons.person_outline,
                                    readOnly: true,
                                    validator: (v) {
                                      if (v == null || v.trim().isEmpty) {
                                        return 'Valida el DNI con la lupa';
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
                                      if (v == null || v.trim().isEmpty) {
                                        return 'Ingresa tu correo';
                                      }
                                      final valid = RegExp(
                                        r'^[^@\s]+@[^@\s]+\.[^@\s]+$',
                                      ).hasMatch(v.trim());
                                      if (!valid) return 'Correo inválido';
                                      return null;
                                    },
                                  ),
                                  const SizedBox(height: 14),
                                  AuthField(
                                    controller: _telefonoCtrl,
                                    label: 'Celular (Perú)',
                                    icon: Icons.phone_android_outlined,
                                    keyboardType: TextInputType.phone,
                                    validator: (v) => peruPhoneError(v),
                                  ),
                                  const SizedBox(height: 8),
                                  const Align(
                                    alignment: Alignment.centerLeft,
                                    child: Text(
                                      '9 dígitos, empieza con 9 (ej. 987 654 321)',
                                      style: TextStyle(
                                        color: Colors.white38,
                                        fontSize: 11,
                                      ),
                                    ),
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
                                      if (v == null ||
                                          v.length < _minPasswordLength) {
                                        return 'Mínimo $_minPasswordLength caracteres';
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
