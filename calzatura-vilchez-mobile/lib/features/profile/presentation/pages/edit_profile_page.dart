import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/cv_app_bar.dart';
import '../../../../shared/utils/peru_phone.dart';
import '../providers/profile_provider.dart';
import '../../data/profile_repository.dart';
import '../../../auth/presentation/providers/auth_provider.dart';

// ── Helpers ───────────────────────────────────────────────────────────────────

String _maskDni(String? dni) {
  final d = (dni ?? '').replaceAll(RegExp(r'\D'), '');
  if (d.length >= 4) return '****${d.substring(d.length - 4)}';
  return d.isEmpty ? '-' : d;
}

String _fmtDate(String? iso) {
  if (iso == null || iso.isEmpty) return '-';
  try {
    final dt = DateTime.parse(iso).toLocal();
    const months = [
      'ene', 'feb', 'mar', 'abr', 'may', 'jun',
      'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
    ];
    return '${dt.day} ${months[dt.month - 1]}. ${dt.year}';
  } catch (_) {
    return '-';
  }
}

String _roleLabel(String rol) {
  const map = {
    'admin': 'Administrador',
    'trabajador': 'Trabajador',
    'cliente': 'Cliente',
  };
  return map[rol] ?? rol;
}

// ── Page ─────────────────────────────────────────────────────────────────────

class EditProfilePage extends ConsumerStatefulWidget {
  const EditProfilePage({super.key});

  @override
  ConsumerState<EditProfilePage> createState() => _EditProfilePageState();
}

class _EditProfilePageState extends ConsumerState<EditProfilePage> {
  final _formKey = GlobalKey<FormState>();
  final _telefonoCtrl = TextEditingController();
  bool _saving = false;
  bool _savingFoto = false;
  bool _initialized = false;

  @override
  void dispose() {
    _telefonoCtrl.dispose();
    super.dispose();
  }

  void _mostrarOpcionesFoto() {
    showModalBottomSheet<void>(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 8),
            ListTile(
              leading: const Icon(Icons.camera_alt),
              title: const Text('Tomar foto con cámara'),
              onTap: () {
                Navigator.pop(context);
                _seleccionarImagen(desdeCamara: true);
              },
            ),
            ListTile(
              leading: const Icon(Icons.photo_library),
              title: const Text('Elegir desde galería'),
              onTap: () {
                Navigator.pop(context);
                _seleccionarImagen(desdeCamara: false);
              },
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  Future<void> _seleccionarImagen({required bool desdeCamara}) async {
    final picked = await ImagePicker().pickImage(
      source: desdeCamara ? ImageSource.camera : ImageSource.gallery,
      imageQuality: 70,
      maxWidth: 600,
    );
    if (picked == null || !mounted) return;

    setState(() => _savingFoto = true);
    try {
      final bytes = await File(picked.path).readAsBytes();
      final base64String = base64Encode(bytes);
      final user = ref.read(currentUserProvider);
      if (user == null) return;
      await ref.read(profileRepositoryProvider).updateFotoBase64(user.uid, base64String);
      ref.invalidate(profileDataProvider);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Foto actualizada'),
          backgroundColor: Colors.green.shade700,
          behavior: SnackBarBehavior.floating,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error al guardar foto: $e'),
          backgroundColor: AppColors.error,
          behavior: SnackBarBehavior.floating,
        ),
      );
    } finally {
      if (mounted) setState(() => _savingFoto = false);
    }
  }

  String? _validatePhone(String? value) {
    if (value == null || value.trim().isEmpty) return null; // teléfono opcional
    final digits = peruPhoneDigits(value);
    if (digits.length != 9) return 'El teléfono debe tener 9 dígitos.';
    if (!digits.startsWith('9')) return 'Debe empezar con 9.';
    return null;
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;

    final messenger = ScaffoldMessenger.of(context);
    final navigator = GoRouter.of(context);

    setState(() => _saving = true);
    try {
      final user = ref.read(currentUserProvider);
      if (user == null) return;

      final digits = peruPhoneDigits(_telefonoCtrl.text);
      final formatted = digits.isEmpty ? '' : formatPeruPhone(digits);
      await ref.read(profileRepositoryProvider).updateTelefono(user.uid, formatted);

      ref.invalidate(profileDataProvider);

      if (!mounted) return;
      messenger.showSnackBar(
        SnackBar(
          content: const Text('Perfil actualizado'),
          backgroundColor: Colors.green.shade700,
          behavior: SnackBarBehavior.floating,
        ),
      );
      navigator.pop();
    } catch (e) {
      if (!mounted) return;
      messenger.showSnackBar(
        SnackBar(
          content: Text('Error al guardar: $e'),
          backgroundColor: AppColors.error,
          behavior: SnackBarBehavior.floating,
        ),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final profileAsync = ref.watch(profileDataProvider);

    // Populate telefono field once data loads
    ref.listen<AsyncValue<ProfileData?>>(profileDataProvider, (_, next) {
      final data = next.valueOrNull;
      if (!_initialized && data != null) {
        _initialized = true;
        _telefonoCtrl.text = peruPhoneDigits(data.telefono ?? '');
      }
    });

    return Scaffold(
      backgroundColor: AppColors.beige,
      appBar: CVAppBar(
        leading: CVBackButton(onPressed: () => context.pop()),
      ),
      body: profileAsync.when(
        loading: () => const Center(
          child: CircularProgressIndicator(color: AppColors.gold),
        ),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.error_outline, color: AppColors.error, size: 40),
                const SizedBox(height: 12),
                Text(
                  'Error al cargar el perfil',
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 8),
                TextButton(
                  onPressed: () => ref.invalidate(profileDataProvider),
                  child: const Text('Reintentar'),
                ),
              ],
            ),
          ),
        ),
        data: (profile) {
          if (profile == null) {
            return const Center(child: Text('No se encontró el perfil.'));
          }
          return _buildBody(profile);
        },
      ),
    );
  }

  Widget _buildBody(ProfileData profile) {
    final inicial = (profile.nombres?.isNotEmpty == true
            ? profile.nombres![0]
            : profile.nombre?.isNotEmpty == true
                ? profile.nombre![0]
                : profile.email.isNotEmpty
                    ? profile.email[0]
                    : 'U')
        .toUpperCase();

    final nombreCompleto = [
      profile.nombres?.trim() ?? '',
      profile.apellidos?.trim() ?? '',
    ].where((s) => s.isNotEmpty).join(' ');

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Form(
        key: _formKey,
        child: Column(
          children: [
            const SizedBox(height: 8),

            // ── Avatar + nombre ────────────────────────────────────────────
            _Card(
              child: Row(
                children: [
                  Stack(
                    children: [
                      profile.fotoBase64 != null
                          ? CircleAvatar(
                              radius: 28,
                              backgroundImage: MemoryImage(
                                base64Decode(profile.fotoBase64!),
                              ),
                            )
                          : Container(
                              width: 56,
                              height: 56,
                              decoration: const BoxDecoration(
                                gradient: LinearGradient(
                                  colors: [AppColors.gold, AppColors.goldDark],
                                  begin: Alignment.topLeft,
                                  end: Alignment.bottomRight,
                                ),
                                shape: BoxShape.circle,
                              ),
                              child: Center(
                                child: Text(
                                  inicial,
                                  style: const TextStyle(
                                    color: AppColors.black,
                                    fontSize: 22,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ),
                            ),
                      if (_savingFoto)
                        const Positioned.fill(
                          child: CircleAvatar(
                            backgroundColor: Colors.black45,
                            child: SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                color: Colors.white,
                                strokeWidth: 2,
                              ),
                            ),
                          ),
                        ),
                      Positioned(
                        bottom: 0,
                        right: 0,
                        child: GestureDetector(
                          onTap: _savingFoto
                              ? null
                              : () => _mostrarOpcionesFoto(),
                          child: Container(
                            width: 22,
                            height: 22,
                            decoration: const BoxDecoration(
                              color: AppColors.gold,
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.camera_alt,
                              size: 13,
                              color: AppColors.black,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          nombreCompleto.isNotEmpty
                              ? nombreCompleto
                              : profile.email,
                          style: const TextStyle(
                            color: AppColors.textPrimary,
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          profile.email,
                          style: const TextStyle(
                            color: AppColors.textSecondary,
                            fontSize: 12,
                          ),
                        ),
                        const SizedBox(height: 5),
                        _RoleBadge(rol: profile.rol),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),

            // ── Información personal ───────────────────────────────────────
            _Card(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const _SectionHeader(title: 'INFORMACIÓN PERSONAL'),
                  const SizedBox(height: 16),

                  _ProfileField(
                    label: 'DNI',
                    value: _maskDni(profile.dni),
                    icon: Icons.badge_outlined,
                    hint: 'Verificado con RENIEC',
                  ),
                  const SizedBox(height: 12),

                  _ProfileField(
                    label: 'Nombres',
                    value: profile.nombres ?? '-',
                    icon: Icons.person_outline,
                  ),
                  const SizedBox(height: 12),

                  _ProfileField(
                    label: 'Apellidos',
                    value: profile.apellidos ?? '-',
                    icon: Icons.person_outline,
                  ),
                  const SizedBox(height: 12),

                  _ProfileField(
                    label: 'Correo electrónico',
                    value: profile.email,
                    icon: Icons.email_outlined,
                    hint: 'El correo no se puede cambiar',
                  ),
                  const SizedBox(height: 12),

                  // Teléfono — editable
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const _FieldLabel(text: 'Celular (Perú)'),
                      const SizedBox(height: 6),
                      TextFormField(
                        controller: _telefonoCtrl,
                        keyboardType: TextInputType.phone,
                        style: const TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 15,
                        ),
                        inputFormatters: [
                          FilteringTextInputFormatter.digitsOnly,
                          LengthLimitingTextInputFormatter(9),
                        ],
                        validator: _validatePhone,
                        decoration: _fieldDecoration(
                          label: 'Celular',
                          icon: Icons.phone_android_outlined,
                          enabled: true,
                          hint: '+51 9xx xxx xxx',
                        ),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        '9 dígitos, empieza con 9 (ej. 987 654 321)',
                        style: TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Save button
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton.icon(
                      onPressed: _saving ? null : _save,
                      icon: _saving
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                color: AppColors.black,
                                strokeWidth: 2,
                              ),
                            )
                          : const Icon(Icons.save_outlined, size: 18),
                      label: Text(_saving ? 'Guardando...' : 'Guardar cambios'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.gold,
                        foregroundColor: AppColors.black,
                        disabledBackgroundColor:
                            AppColors.gold.withValues(alpha: 0.5),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                        elevation: 0,
                        textStyle: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),

            // ── Información de cuenta ──────────────────────────────────────
            _Card(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const _SectionHeader(title: 'INFORMACIÓN DE CUENTA'),
                  const SizedBox(height: 12),
                  _InfoRow(
                    label: 'Miembro desde',
                    value: _fmtDate(profile.creadoEn),
                  ),
                  const Divider(height: 20, color: Color(0xFFE5E0D8)),
                  _InfoRow(
                    label: 'Rol',
                    value: _roleLabel(profile.rol),
                    valueColor: profile.rol == 'admin' || profile.rol == 'trabajador'
                        ? AppColors.gold
                        : null,
                  ),
                  const Divider(height: 20, color: Color(0xFFE5E0D8)),
                  _InfoRow(
                    label: 'UID',
                    value: '${profile.uid.substring(0, profile.uid.length.clamp(0, 12))}…',
                    valueStyle: const TextStyle(
                      fontFamily: 'monospace',
                      fontSize: 12,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}

// ── Widget helpers ────────────────────────────────────────────────────────────

class _Card extends StatelessWidget {
  const _Card({required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: child,
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title});
  final String title;

  @override
  Widget build(BuildContext context) {
    return Text(
      title,
      style: const TextStyle(
        color: AppColors.textSecondary,
        fontSize: 11,
        fontWeight: FontWeight.w700,
        letterSpacing: 1.2,
      ),
    );
  }
}

class _FieldLabel extends StatelessWidget {
  const _FieldLabel({required this.text});
  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: const TextStyle(
        color: AppColors.textSecondary,
        fontSize: 12,
        fontWeight: FontWeight.w500,
      ),
    );
  }
}

class _ProfileField extends StatelessWidget {
  const _ProfileField({
    required this.label,
    required this.value,
    required this.icon,
    this.hint,
  });

  final String label;
  final String value;
  final IconData icon;
  final String? hint;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _FieldLabel(text: label),
        const SizedBox(height: 6),
        TextFormField(
          initialValue: value,
          enabled: false,
          style: const TextStyle(
            color: AppColors.textSecondary,
            fontSize: 15,
          ),
          decoration: _fieldDecoration(
            label: label,
            icon: icon,
            enabled: false,
          ),
        ),
        if (hint != null) ...[
          const SizedBox(height: 4),
          Text(
            hint!,
            style: const TextStyle(
              color: AppColors.textSecondary,
              fontSize: 11,
            ),
          ),
        ],
      ],
    );
  }
}

InputDecoration _fieldDecoration({
  required String label,
  required IconData icon,
  required bool enabled,
  String? hint,
}) {
  return InputDecoration(
    labelText: label,
    hintText: hint,
    labelStyle: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
    hintStyle: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
    prefixIcon: Icon(icon, color: AppColors.textSecondary, size: 20),
    filled: true,
    fillColor: enabled ? Colors.white : const Color(0xFFF5F3EF),
    border: OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: BorderSide(color: Colors.black.withValues(alpha: 0.12)),
    ),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: BorderSide(color: Colors.black.withValues(alpha: 0.12)),
    ),
    disabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: BorderSide(color: Colors.black.withValues(alpha: 0.07)),
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: const BorderSide(color: AppColors.gold, width: 1.5),
    ),
    errorBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: const BorderSide(color: AppColors.error),
    ),
    focusedErrorBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: const BorderSide(color: AppColors.error),
    ),
    errorStyle: const TextStyle(color: AppColors.error, fontSize: 11),
    isDense: true,
    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
  );
}

class _RoleBadge extends StatelessWidget {
  const _RoleBadge({required this.rol});
  final String rol;

  @override
  Widget build(BuildContext context) {
    final isPrivileged = rol == 'admin' || rol == 'trabajador';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: isPrivileged
            ? AppColors.gold.withValues(alpha: 0.12)
            : Colors.black.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isPrivileged
              ? AppColors.gold.withValues(alpha: 0.4)
              : Colors.black.withValues(alpha: 0.12),
        ),
      ),
      child: Text(
        _roleLabel(rol).toUpperCase(),
        style: TextStyle(
          color: isPrivileged ? AppColors.gold : AppColors.textSecondary,
          fontSize: 9,
          fontWeight: FontWeight.w700,
          letterSpacing: 1.0,
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value, this.valueColor, this.valueStyle});

  final String label;
  final String value;
  final Color? valueColor;
  final TextStyle? valueStyle;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(
            color: AppColors.textSecondary,
            fontSize: 13,
          ),
        ),
        Text(
          value,
          style: valueStyle ??
              TextStyle(
                color: valueColor ?? AppColors.textPrimary,
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
        ),
      ],
    );
  }
}
