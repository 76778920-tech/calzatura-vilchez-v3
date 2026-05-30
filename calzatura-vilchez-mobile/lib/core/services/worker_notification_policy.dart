import 'package:flutter/material.dart';

/// Política alineada con `calzatura-vilchez/.../workerNotificationPolicy.ts` (web).
const trackedWorkerEntities = <String>{
  'producto',
  'pedido',
  'venta',
  'venta_diaria',
};

const actionLabels = <String, String>{
  'crear': 'creó',
  'editar': 'editó',
  'eliminar': 'eliminó',
  'cambiar_estado': 'actualizó',
  'importar': 'importó',
  'registrar_venta': 'registró',
  'devolver_venta': 'devolvió',
};

String entityLabelForWorkerNotif(String entidad) {
  if (entidad == 'producto') return 'Producto';
  if (entidad == 'pedido') return 'Pedido';
  return 'Venta';
}

String actionLabelForWorkerNotif(String accion) =>
    actionLabels[accion] ?? accion;

bool isWorkerAuditEntry({
  required String? usuarioUid,
  required String entidad,
  required Set<String> workerUids,
}) {
  if (usuarioUid == null || usuarioUid.isEmpty) return false;
  if (!workerUids.contains(usuarioUid)) return false;
  return trackedWorkerEntities.contains(entidad);
}

String formatWorkerNotifToast({
  required String accion,
  required String entidad,
  String? entidadNombre,
}) {
  final tipo = entityLabelForWorkerNotif(entidad);
  final verbo = actionLabelForWorkerNotif(accion);
  final nombre = entidadNombre != null && entidadNombre.isNotEmpty
      ? ': $entidadNombre'
      : '';
  return 'Trabajador $verbo $tipo$nombre';
}

/// Colores de pill alineados con web `WorkerNotificationsBell` (`ACCION_COLORS`).
Color accionColorForWorkerNotif(String accion) {
  switch (accion) {
    case 'crear':
      return const Color(0xFF22C55E);
    case 'editar':
      return const Color(0xFF6366F1);
    case 'eliminar':
      return const Color(0xFFEF4444);
    case 'cambiar_estado':
      return const Color(0xFFF59E0B);
    case 'importar':
      return const Color(0xFF0EA5E9);
    default:
      return const Color(0xFF888888);
  }
}
