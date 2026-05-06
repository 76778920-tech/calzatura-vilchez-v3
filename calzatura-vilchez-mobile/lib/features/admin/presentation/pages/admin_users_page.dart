import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart' as sb;
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/back_navigation_scope.dart';
import '../../../auth/presentation/providers/auth_provider.dart';

final _supabase = sb.Supabase.instance.client;

final adminUsersProvider = FutureProvider.autoDispose<List<Map<String, dynamic>>>((
  ref,
) async {
  final data = await _supabase
      .from('usuarios')
      .select(
        'uid, email, nombre, nombres, apellidos, dni, telefono, rol, creadoEn',
      )
      .order('creadoEn', ascending: false);
  return List<Map<String, dynamic>>.from(data as List);
});

const _roles = ['cliente', 'trabajador', 'admin'];

String _displayUserName(Map<String, dynamic> user) {
  final fullName = [
    user['nombres']?.toString().trim() ?? '',
    user['apellidos']?.toString().trim() ?? '',
  ].where((part) => part.isNotEmpty).join(' ');

  if (fullName.isNotEmpty) return fullName;

  final nombre = user['nombre']?.toString().trim() ?? '';
  if (nombre.isNotEmpty) return nombre;

  return user['email']?.toString().trim() ?? 'Usuario';
}

class AdminUsersPage extends ConsumerStatefulWidget {
  const AdminUsersPage({super.key});
  @override
  ConsumerState<AdminUsersPage> createState() => _AdminUsersPageState();
}

class _AdminUsersPageState extends ConsumerState<AdminUsersPage> {
  String _roleFilter = 'todos';
  final _searchCtrl = TextEditingController();
  bool _searching = false;

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  List<Map<String, dynamic>> _filter(List<Map<String, dynamic>> users) {
    var list = users;
    if (_roleFilter != 'todos') {
      list = list.where((u) => u['rol'] == _roleFilter).toList();
    }
    final q = _searchCtrl.text.trim().toLowerCase();
    if (q.isNotEmpty) {
      list = list.where((u) {
        final n = _displayUserName(u).toLowerCase();
        final e = (u['email'] as String? ?? '').toLowerCase();
        final d = (u['dni'] as String? ?? '').toLowerCase();
        return n.contains(q) || e.contains(q) || d.contains(q);
      }).toList();
    }
    return list;
  }

  @override
  Widget build(BuildContext context) {
    final usersAsync = ref.watch(adminUsersProvider);
    final currentUser = ref.watch(currentUserProvider);
    final isSuperAdmin = currentUser?.email == '76778920@continental.edu.pe';

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
                    hintText: 'Buscar por nombre, email, DNI...',
                    hintStyle: TextStyle(color: Colors.white38, fontSize: 13),
                    border: InputBorder.none,
                  ),
                  onChanged: (_) => setState(() {}),
                )
              : const Text(
                  'Usuarios',
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
          ],
        ),
        body: usersAsync.when(
          loading: () => const Center(
            child: CircularProgressIndicator(color: AppColors.gold),
          ),
          error: (e, _) => Center(child: Text('Error: $e')),
          data: (users) {
            final filtered = _filter(users);
            final clientes = users.where((u) => u['rol'] == 'cliente').length;
            final trabajadores = users
                .where((u) => u['rol'] == 'trabajador')
                .length;
            final admins = users.where((u) => u['rol'] == 'admin').length;

            return RefreshIndicator(
              color: AppColors.gold,
              onRefresh: () async => ref.invalidate(adminUsersProvider),
              child: CustomScrollView(
                slivers: [
                  // Stats
                  SliverToBoxAdapter(
                    child: Container(
                      color: AppColors.black,
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 14),
                      child: Row(
                        children: [
                          _StatBadge('Total', users.length, Colors.white70),
                          const SizedBox(width: 8),
                          _StatBadge('Clientes', clientes, AppColors.success),
                          const SizedBox(width: 8),
                          _StatBadge(
                            'Trabajadores',
                            trabajadores,
                            AppColors.gold,
                          ),
                          const SizedBox(width: 8),
                          _StatBadge('Admins', admins, AppColors.error),
                        ],
                      ),
                    ),
                  ),

                  // Filtro por rol
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(12, 12, 12, 4),
                      child: SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: Row(
                          children: [
                            _RoleChip(
                              'todos',
                              'Todos',
                              _roleFilter == 'todos',
                              Colors.white,
                              () => setState(() => _roleFilter = 'todos'),
                            ),
                            _RoleChip(
                              'cliente',
                              'Clientes',
                              _roleFilter == 'cliente',
                              AppColors.success,
                              () => setState(() => _roleFilter = 'cliente'),
                            ),
                            _RoleChip(
                              'trabajador',
                              'Trabajadores',
                              _roleFilter == 'trabajador',
                              AppColors.gold,
                              () => setState(() => _roleFilter = 'trabajador'),
                            ),
                            _RoleChip(
                              'admin',
                              'Admins',
                              _roleFilter == 'admin',
                              AppColors.error,
                              () => setState(() => _roleFilter = 'admin'),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),

                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
                      child: Text(
                        '${filtered.length} usuarios',
                        style: const TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ),

                  filtered.isEmpty
                      ? const SliverFillRemaining(
                          child: Center(
                            child: Text(
                              'Sin resultados',
                              style: TextStyle(color: AppColors.textSecondary),
                            ),
                          ),
                        )
                      : SliverPadding(
                          padding: const EdgeInsets.fromLTRB(12, 0, 12, 80),
                          sliver: SliverList(
                            delegate: SliverChildBuilderDelegate(
                              (ctx, i) => _UserTile(
                                user: filtered[i],
                                index: i,
                                isSuperAdmin: isSuperAdmin,
                                onRoleChanged: (newRole) =>
                                    _changeRole(filtered[i], newRole),
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

  Future<void> _changeRole(Map<String, dynamic> user, String newRole) async {
    final currentUser = ref.read(currentUserProvider);
    final isSuperAdmin = currentUser?.email == '76778920@continental.edu.pe';
    final userRole = user['rol'] as String? ?? 'cliente';

    // Solo superadmin puede asignar/quitar admin
    if ((newRole == 'admin' || userRole == 'admin') && !isSuperAdmin) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Solo el superadministrador puede modificar roles admin',
          ),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    await _supabase
        .from('usuarios')
        .update({'rol': newRole})
        .eq('uid', user['uid']);
    ref.invalidate(adminUsersProvider);
  }
}

class _StatBadge extends StatelessWidget {
  const _StatBadge(this.label, this.count, this.color);
  final String label;
  final int count;
  final Color color;
  @override
  Widget build(BuildContext context) => Expanded(
    child: Container(
      padding: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        children: [
          Text(
            '$count',
            style: TextStyle(
              color: color,
              fontWeight: FontWeight.w800,
              fontSize: 18,
            ),
          ),
          Text(
            label,
            style: const TextStyle(color: Colors.white54, fontSize: 9),
          ),
        ],
      ),
    ),
  );
}

class _RoleChip extends StatelessWidget {
  const _RoleChip(
    this.value,
    this.label,
    this.selected,
    this.color,
    this.onTap,
  );
  final String value, label;
  final bool selected;
  final Color color;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      margin: const EdgeInsets.only(right: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
      decoration: BoxDecoration(
        color: selected ? color.withValues(alpha: 0.15) : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: selected ? color : AppColors.shimmerBase),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: selected ? color : AppColors.textSecondary,
          fontSize: 12,
          fontWeight: selected ? FontWeight.w700 : FontWeight.normal,
        ),
      ),
    ),
  );
}

class _UserTile extends StatelessWidget {
  const _UserTile({
    required this.user,
    required this.index,
    required this.isSuperAdmin,
    required this.onRoleChanged,
  });
  final Map<String, dynamic> user;
  final int index;
  final bool isSuperAdmin;
  final ValueChanged<String> onRoleChanged;

  Color _roleColor(String role) {
    switch (role) {
      case 'admin':
        return AppColors.error;
      case 'trabajador':
        return AppColors.gold;
      default:
        return AppColors.success;
    }
  }

  @override
  Widget build(BuildContext context) {
    final nombre = _displayUserName(user);
    final email = user['email'] as String? ?? '';
    final dni = user['dni'] as String? ?? '';
    final telefono = user['telefono'] as String? ?? '';
    final rol = user['rol'] as String? ?? 'cliente';
    final fecha = user['creadoEn'] as String? ?? '';
    final fechaCorta = fecha.length >= 10 ? fecha.substring(0, 10) : fecha;
    final initials = nombre.isNotEmpty
        ? nombre
              .trim()
              .split(' ')
              .take(2)
              .map((w) => w.isNotEmpty ? w[0].toUpperCase() : '')
              .join()
        : email.isNotEmpty
        ? email[0].toUpperCase()
        : '?';

    final canChangeRole = isSuperAdmin || rol != 'admin';
    final availableRoles = isSuperAdmin
        ? _roles
        : _roles.where((r) => r != 'admin').toList();

    return Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Row(
            children: [
              // Avatar
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: _roleColor(rol).withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: Text(
                    initials,
                    style: TextStyle(
                      color: _roleColor(rol),
                      fontWeight: FontWeight.w800,
                      fontSize: 14,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      nombre.isNotEmpty ? nombre : email,
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                        color: AppColors.textPrimary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      email,
                      style: const TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 11,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
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
                    Text(
                      'Desde $fechaCorta',
                      style: const TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 10,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              // Role selector
              canChangeRole
                  ? Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                      decoration: BoxDecoration(
                        color: _roleColor(rol).withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: _roleColor(rol).withValues(alpha: 0.3),
                        ),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: rol,
                          isDense: true,
                          style: TextStyle(
                            color: _roleColor(rol),
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                          ),
                          icon: Icon(
                            Icons.arrow_drop_down,
                            size: 14,
                            color: _roleColor(rol),
                          ),
                          items: availableRoles
                              .map(
                                (r) => DropdownMenuItem(
                                  value: r,
                                  child: Text(
                                    r[0].toUpperCase() + r.substring(1),
                                  ),
                                ),
                              )
                              .toList(),
                          onChanged: (v) {
                            if (v != null && v != rol) onRoleChanged(v);
                          },
                        ),
                      ),
                    )
                  : Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 5,
                      ),
                      decoration: BoxDecoration(
                        color: _roleColor(rol).withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        rol[0].toUpperCase() + rol.substring(1),
                        style: TextStyle(
                          color: _roleColor(rol),
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
            ],
          ),
        )
        .animate(delay: Duration(milliseconds: index * 30))
        .fadeIn(duration: 300.ms);
  }
}
