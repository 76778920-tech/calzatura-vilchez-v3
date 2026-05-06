import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart' as sb;
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/back_navigation_scope.dart';

final _supabase = sb.Supabase.instance.client;

final adminManufacturersProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
      final data = await _supabase
          .from('fabricantes')
          .select()
          .order('nombres');
      return List<Map<String, dynamic>>.from(data as List);
    });

class AdminManufacturersPage extends ConsumerStatefulWidget {
  const AdminManufacturersPage({super.key});
  @override
  ConsumerState<AdminManufacturersPage> createState() =>
      _AdminManufacturersPageState();
}

class _AdminManufacturersPageState
    extends ConsumerState<AdminManufacturersPage> {
  final _searchCtrl = TextEditingController();
  bool _searching = false;
  bool _soloActivos = false;

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  List<Map<String, dynamic>> _filter(List<Map<String, dynamic>> list) {
    var result = list;
    if (_soloActivos) {
      result = result.where((m) => m['activo'] == true).toList();
    }
    final q = _searchCtrl.text.trim().toLowerCase();
    if (q.isNotEmpty) {
      result = result.where((m) {
        final n = '${m['nombres'] ?? ''} ${m['apellidos'] ?? ''}'.toLowerCase();
        final marca = (m['marca'] as String? ?? '').toLowerCase();
        final dni = (m['dni'] as String? ?? '').toLowerCase();
        final tel = (m['telefono'] as String? ?? '').toLowerCase();
        return n.contains(q) ||
            marca.contains(q) ||
            dni.contains(q) ||
            tel.contains(q);
      }).toList();
    }
    return result;
  }

  @override
  Widget build(BuildContext context) {
    final manAsync = ref.watch(adminManufacturersProvider);

    return BackNavigationScope(
      fallbackRoute: '/admin',
      child: Scaffold(
        backgroundColor: AppColors.beige,
        appBar: AppBar(
          backgroundColor: AppColors.black,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios_new, size: 18),
            onPressed: () =>
                handleBackNavigation(context, fallbackRoute: '/admin'),
          ),
          title: _searching
              ? TextField(
                  controller: _searchCtrl,
                  autofocus: true,
                  style: const TextStyle(color: Colors.white, fontSize: 14),
                  cursorColor: AppColors.gold,
                  decoration: const InputDecoration(
                    hintText: 'Buscar fabricante...',
                    hintStyle: TextStyle(color: Colors.white38),
                    border: InputBorder.none,
                  ),
                  onChanged: (_) => setState(() {}),
                )
              : const Text(
                  'Fabricantes',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                ),
          actions: [
            IconButton(
              icon: Icon(
                _searching ? Icons.close : Icons.search_rounded,
                color: Colors.white70,
              ),
              onPressed: () => setState(() {
                _searching = !_searching;
                if (!_searching) _searchCtrl.clear();
              }),
            ),
            IconButton(
              icon: const Icon(
                Icons.add_rounded,
                color: AppColors.gold,
                size: 26,
              ),
              onPressed: () => _openForm(context, null),
            ),
          ],
        ),
        body: manAsync.when(
          loading: () => const Center(
            child: CircularProgressIndicator(color: AppColors.gold),
          ),
          error: (e, _) => Center(child: Text('Error: $e')),
          data: (manufacturers) {
            final filtered = _filter(manufacturers);
            final activos = manufacturers
                .where((m) => m['activo'] == true)
                .length;

            return RefreshIndicator(
              color: AppColors.gold,
              onRefresh: () async => ref.invalidate(adminManufacturersProvider),
              child: CustomScrollView(
                slivers: [
                  SliverToBoxAdapter(
                    child: Container(
                      color: AppColors.black,
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 14),
                      child: Row(
                        children: [
                          _StatPill(
                            'Total',
                            manufacturers.length,
                            Colors.white70,
                          ),
                          const SizedBox(width: 8),
                          _StatPill('Activos', activos, AppColors.success),
                          const SizedBox(width: 8),
                          _StatPill(
                            'Inactivos',
                            manufacturers.length - activos,
                            AppColors.error,
                          ),
                          const Spacer(),
                          GestureDetector(
                            onTap: () =>
                                setState(() => _soloActivos = !_soloActivos),
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 10,
                                vertical: 6,
                              ),
                              decoration: BoxDecoration(
                                color: _soloActivos
                                    ? AppColors.success.withValues(alpha: 0.2)
                                    : Colors.white.withValues(alpha: 0.08),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: _soloActivos
                                      ? AppColors.success
                                      : Colors.transparent,
                                ),
                              ),
                              child: Text(
                                'Solo activos',
                                style: TextStyle(
                                  color: _soloActivos
                                      ? AppColors.success
                                      : Colors.white54,
                                  fontSize: 11,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  filtered.isEmpty
                      ? const SliverFillRemaining(
                          child: Center(
                            child: Text(
                              'Sin fabricantes',
                              style: TextStyle(color: AppColors.textSecondary),
                            ),
                          ),
                        )
                      : SliverPadding(
                          padding: const EdgeInsets.fromLTRB(12, 12, 12, 80),
                          sliver: SliverList(
                            delegate: SliverChildBuilderDelegate(
                              (ctx, i) => _ManufacturerTile(
                                man: filtered[i],
                                index: i,
                                onEdit: () => _openForm(context, filtered[i]),
                                onDelete: () =>
                                    _confirmDelete(context, filtered[i]),
                              ),
                              childCount: filtered.length,
                            ),
                          ),
                        ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  void _openForm(BuildContext context, Map<String, dynamic>? man) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _ManufacturerForm(
        man: man,
        onSaved: () => ref.invalidate(adminManufacturersProvider),
      ),
    );
  }

  void _confirmDelete(BuildContext context, Map<String, dynamic> man) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Eliminar fabricante'),
        content: Text('¿Eliminar a ${man['nombres']} ${man['apellidos']}?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancelar'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(ctx);
              await _supabase.from('fabricantes').delete().eq('id', man['id']);
              ref.invalidate(adminManufacturersProvider);
            },
            child: const Text(
              'Eliminar',
              style: TextStyle(color: AppColors.error),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatPill extends StatelessWidget {
  const _StatPill(this.label, this.count, this.color);
  final String label;
  final int count;
  final Color color;
  @override
  Widget build(BuildContext context) => Row(
    children: [
      Text(
        '$count',
        style: TextStyle(
          color: color,
          fontWeight: FontWeight.w800,
          fontSize: 16,
        ),
      ),
      const SizedBox(width: 4),
      Text(label, style: const TextStyle(color: Colors.white54, fontSize: 10)),
    ],
  );
}

class _ManufacturerTile extends StatelessWidget {
  const _ManufacturerTile({
    required this.man,
    required this.index,
    required this.onEdit,
    required this.onDelete,
  });
  final Map<String, dynamic> man;
  final int index;
  final VoidCallback onEdit, onDelete;

  @override
  Widget build(BuildContext context) {
    final nombre = '${man['nombres'] ?? ''} ${man['apellidos'] ?? ''}'.trim();
    final marca = man['marca'] as String? ?? '';
    final dni = man['dni'] as String? ?? '';
    final telefono = man['telefono'] as String? ?? '';
    final activo = man['activo'] as bool? ?? true;
    final ingresoFecha = man['ultimoIngresoFecha'] as String? ?? '';
    final ingresoMonto = (man['ultimoIngresoMonto'] as num?)?.toDouble();
    final obs = man['observaciones'] as String? ?? '';

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: activo ? null : Border.all(color: AppColors.shimmerBase),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: activo
                  ? AppColors.gold.withValues(alpha: 0.12)
                  : AppColors.shimmerBase,
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Icon(
                Icons.factory_outlined,
                color: activo ? AppColors.gold : AppColors.textSecondary,
                size: 22,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        nombre,
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 13,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 3,
                      ),
                      decoration: BoxDecoration(
                        color: activo
                            ? AppColors.success.withValues(alpha: 0.1)
                            : AppColors.error.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        activo ? 'Activo' : 'Inactivo',
                        style: TextStyle(
                          color: activo ? AppColors.success : AppColors.error,
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
                if (marca.isNotEmpty)
                  Text(
                    'Marca: $marca',
                    style: const TextStyle(
                      color: AppColors.gold,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                if (dni.isNotEmpty)
                  Text(
                    'DNI: $dni',
                    style: const TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 11,
                    ),
                  ),
                if (telefono.isNotEmpty)
                  Text(
                    'Tel: $telefono',
                    style: const TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 11,
                    ),
                  ),
                if (ingresoFecha.isNotEmpty)
                  Text(
                    'Último ingreso: ${ingresoFecha.length >= 10 ? ingresoFecha.substring(0, 10) : ingresoFecha}'
                    '${ingresoMonto != null ? '  S/ ${ingresoMonto.toStringAsFixed(2)}' : ''}',
                    style: const TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 11,
                    ),
                  ),
                if (obs.isNotEmpty)
                  Text(
                    obs,
                    style: const TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 11,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
              ],
            ),
          ),
          Column(
            children: [
              IconButton(
                icon: const Icon(
                  Icons.edit_outlined,
                  size: 18,
                  color: AppColors.gold,
                ),
                onPressed: onEdit,
                visualDensity: VisualDensity.compact,
              ),
              IconButton(
                icon: const Icon(
                  Icons.delete_outline_rounded,
                  size: 18,
                  color: AppColors.error,
                ),
                onPressed: onDelete,
                visualDensity: VisualDensity.compact,
              ),
            ],
          ),
        ],
      ),
    ).animate(delay: Duration(milliseconds: index * 30)).fadeIn(duration: 300.ms);
  }
}

class _ManufacturerForm extends StatefulWidget {
  const _ManufacturerForm({required this.man, required this.onSaved});
  final Map<String, dynamic>? man;
  final VoidCallback onSaved;
  @override
  State<_ManufacturerForm> createState() => _ManufacturerFormState();
}

class _ManufacturerFormState extends State<_ManufacturerForm> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _dniCtrl,
      _nombresCtrl,
      _apellidosCtrl,
      _marcaCtrl,
      _telCtrl,
      _obsCtrl,
      _montoCtrl;
  DateTime? _ingresoFecha;
  bool _activo = true;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final m = widget.man;
    _dniCtrl = TextEditingController(text: m?['dni'] ?? '');
    _nombresCtrl = TextEditingController(text: m?['nombres'] ?? '');
    _apellidosCtrl = TextEditingController(text: m?['apellidos'] ?? '');
    _marcaCtrl = TextEditingController(text: m?['marca'] ?? '');
    _telCtrl = TextEditingController(text: m?['telefono'] ?? '');
    _obsCtrl = TextEditingController(text: m?['observaciones'] ?? '');
    _montoCtrl = TextEditingController(
      text: m?['ultimoIngresoMonto']?.toString() ?? '',
    );
    _activo = m?['activo'] ?? true;
    final fechaStr = m?['ultimoIngresoFecha'] as String?;
    if (fechaStr != null && fechaStr.length >= 10) {
      _ingresoFecha = DateTime.tryParse(fechaStr);
    }
  }

  @override
  void dispose() {
    for (final c in [
      _dniCtrl,
      _nombresCtrl,
      _apellidosCtrl,
      _marcaCtrl,
      _telCtrl,
      _obsCtrl,
      _montoCtrl,
    ]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    final data = {
      'dni': _dniCtrl.text.trim(),
      'nombres': _nombresCtrl.text.trim(),
      'apellidos': _apellidosCtrl.text.trim(),
      'marca': _marcaCtrl.text.trim(),
      'telefono': _telCtrl.text.trim(),
      'observaciones': _obsCtrl.text.trim(),
      'activo': _activo,
      if (_ingresoFecha != null)
        'ultimoIngresoFecha': _ingresoFecha!.toIso8601String().substring(0, 10),
      if (_montoCtrl.text.isNotEmpty)
        'ultimoIngresoMonto': double.tryParse(_montoCtrl.text) ?? 0,
    };
    try {
      if (widget.man != null) {
        await _supabase
            .from('fabricantes')
            .update(data)
            .eq('id', widget.man!['id']);
      } else {
        await _supabase.from('fabricantes').insert(data);
      }
      widget.onSaved();
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
    setState(() => _saving = false);
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.85,
      maxChildSize: 0.95,
      minChildSize: 0.5,
      builder: (ctx, scrollCtrl) => Container(
        decoration: const BoxDecoration(
          color: AppColors.beige,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.only(top: 12, bottom: 4),
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.shimmerBase,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 12, 8),
              child: Row(
                children: [
                  Text(
                    widget.man != null
                        ? 'Editar fabricante'
                        : 'Nuevo fabricante',
                    style: const TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),
            Expanded(
              child: Form(
                key: _formKey,
                child: ListView(
                  controller: scrollCtrl,
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
                  children: [
                    _F(
                      _dniCtrl,
                      'DNI',
                      Icons.badge_outlined,
                      keyboard: TextInputType.number,
                    ),
                    _F(
                      _nombresCtrl,
                      'Nombres *',
                      Icons.person_outline,
                      required: true,
                    ),
                    _F(
                      _apellidosCtrl,
                      'Apellidos *',
                      Icons.person_outline,
                      required: true,
                    ),
                    _F(_marcaCtrl, 'Marca', Icons.branding_watermark_outlined),
                    _F(
                      _telCtrl,
                      'Teléfono',
                      Icons.phone_outlined,
                      keyboard: TextInputType.phone,
                    ),
                    const SizedBox(height: 12),
                    // Último ingreso
                    const Text(
                      'ÚLTIMO INGRESO',
                      style: TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 1,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: GestureDetector(
                            onTap: () async {
                              final picked = await showDatePicker(
                                context: context,
                                initialDate: _ingresoFecha ?? DateTime.now(),
                                firstDate: DateTime(2015),
                                lastDate: DateTime.now(),
                              );
                              if (picked != null) {
                                setState(() => _ingresoFecha = picked);
                              }
                            },
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 14,
                                vertical: 14,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: const Color(0xFFE5E0D8),
                                ),
                              ),
                              child: Row(
                                children: [
                                  const Icon(
                                    Icons.calendar_today_outlined,
                                    size: 18,
                                    color: AppColors.textSecondary,
                                  ),
                                  const SizedBox(width: 8),
                                  Text(
                                    _ingresoFecha != null
                                        ? '${_ingresoFecha!.day}/${_ingresoFecha!.month}/${_ingresoFecha!.year}'
                                        : 'Fecha ingreso',
                                    style: TextStyle(
                                      color: _ingresoFecha != null
                                          ? AppColors.textPrimary
                                          : AppColors.textSecondary,
                                      fontSize: 14,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _F(
                            _montoCtrl,
                            'Monto (S/)',
                            Icons.attach_money,
                            keyboard: TextInputType.number,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _obsCtrl,
                      maxLines: 3,
                      decoration: const InputDecoration(
                        labelText: 'Observaciones',
                      ),
                    ),
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.check_circle_outline,
                            size: 18,
                            color: AppColors.textSecondary,
                          ),
                          const SizedBox(width: 12),
                          const Expanded(
                            child: Text(
                              'Fabricante activo',
                              style: TextStyle(fontSize: 14),
                            ),
                          ),
                          Switch(
                            value: _activo,
                            onChanged: (v) => setState(() => _activo = v),
                            thumbColor: WidgetStateProperty.all(AppColors.gold),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),
                    SizedBox(
                      height: 52,
                      child: ElevatedButton(
                        onPressed: _saving ? null : _save,
                        child: _saving
                            ? const CircularProgressIndicator(
                                color: AppColors.black,
                                strokeWidth: 2.5,
                              )
                            : Text(
                                widget.man != null
                                    ? 'Guardar cambios'
                                    : 'Crear fabricante',
                              ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _F extends StatelessWidget {
  const _F(
    this.ctrl,
    this.label,
    this.icon, {
    this.keyboard,
    this.required = false,
  });
  final TextEditingController ctrl;
  final String label;
  final IconData icon;
  final TextInputType? keyboard;
  final bool required;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: TextFormField(
      controller: ctrl,
      keyboardType: keyboard,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon, size: 18),
      ),
      validator: required
          ? (v) => (v == null || v.isEmpty) ? 'Campo requerido' : null
          : null,
    ),
  );
}
