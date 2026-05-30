import 'dart:async';

import 'package:flutter/foundation.dart';

import '../../../core/services/panel_bff_api.dart';
import '../../../core/services/worker_notification_policy.dart';
import 'worker_notification.dart';

/// Polling de notificaciones de trabajadores (espejo de web `useWorkerNotifications`).
class WorkerNotificationsController extends ChangeNotifier {
  WorkerNotificationsController({
    PanelBffApi? api,
    this.onToast,
    this.onPollComplete,
  }) : _api = api ?? PanelBffApi();

  static const pollInterval = Duration(seconds: 30);
  static const maxNotifs = 50;
  static const auditPollLimit = 30;

  final PanelBffApi _api;
  final void Function(String message)? onToast;
  final VoidCallback? onPollComplete;

  final Set<String> _workerUids = {};
  final Set<String> _seenAuditIds = {};
  final List<WorkerNotif> _notifs = [];
  bool _initialized = false;
  bool _workersLoaded = false;
  Timer? _timer;
  bool _disposed = false;

  List<WorkerNotif> get notifs => List.unmodifiable(_notifs);
  int get unreadCount => _notifs.where((n) => !n.leido).length;

  Future<void> start() async {
    await _loadWorkers();
    await poll();
    _timer?.cancel();
    _timer = Timer.periodic(pollInterval, (_) => poll());
  }

  Future<void> _loadWorkers() async {
    try {
      final users = await _api.fetchAdminUsers();
      _workerUids
        ..clear()
        ..addAll(
          users
              .where((u) => u['rol'] == 'trabajador')
              .map((u) => u['uid']?.toString() ?? '')
              .where((uid) => uid.isNotEmpty),
        );
      _workersLoaded = true;
    } catch (err) {
      debugPrint('[worker-notifs] no se pudieron cargar UIDs: $err');
      _workersLoaded = false;
    }
    if (!_disposed) notifyListeners();
    if (_workersLoaded && _workerUids.isNotEmpty) {
      await poll();
    }
  }

  List<AdminAuditEntry> _freshWorkerEntries(List<AdminAuditEntry> entries) {
    return entries
        .where(
          (e) =>
              e.id.isNotEmpty &&
              !_seenAuditIds.contains(e.id) &&
              isWorkerAuditEntry(
                usuarioUid: e.usuarioUid,
                entidad: e.entidad,
                workerUids: _workerUids,
              ),
        )
        .toList();
  }

  void _prependNotifs(List<AdminAuditEntry> fresh, {required bool showToast}) {
    if (fresh.isEmpty) return;

    for (final e in fresh) {
      _seenAuditIds.add(e.id);
    }

    final mapped = fresh
        .map(
          (e) => WorkerNotif(
            id: e.id,
            accion: e.accion,
            entidad: e.entidad,
            entidadNombre: e.entidadNombre,
            usuarioEmail: e.usuarioEmail,
            realizadoEn: e.realizadoEn,
          ),
        )
        .toList();

    _notifs.insertAll(0, mapped);
    if (_notifs.length > maxNotifs) {
      _notifs.removeRange(maxNotifs, _notifs.length);
    }

    if (showToast) {
      for (final e in fresh.take(3)) {
        onToast?.call(
          formatWorkerNotifToast(
            accion: e.accion,
            entidad: e.entidad,
            entidadNombre: e.entidadNombre,
          ),
        );
      }
    }
  }

  Future<void> poll() async {
    if (_disposed || !_workersLoaded || _workerUids.isEmpty) return;
    try {
      final entries = await _api.fetchRecentAudit(limit: auditPollLimit);
      if (entries.isEmpty) return;

      final fresh = _freshWorkerEntries(entries);
      final isBootstrap = !_initialized;
      _initialized = true;

      _prependNotifs(fresh, showToast: !isBootstrap);

      onPollComplete?.call();
      if (!_disposed && fresh.isNotEmpty) notifyListeners();
    } catch (err) {
      debugPrint('[worker-notifs] poll falló: $err');
    }
  }

  void markAllRead() {
    for (var i = 0; i < _notifs.length; i++) {
      _notifs[i] = _notifs[i].markRead();
    }
    if (!_disposed) notifyListeners();
  }

  void dismiss(String id) {
    _notifs.removeWhere((n) => n.id == id);
    if (!_disposed) notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    _timer?.cancel();
    super.dispose();
  }
}
