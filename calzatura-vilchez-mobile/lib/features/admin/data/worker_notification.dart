/// Notificación de actividad de trabajador (espejo de web `WorkerNotif`).
class WorkerNotif {
  const WorkerNotif({
    required this.id,
    required this.accion,
    required this.entidad,
    this.entidadNombre,
    this.usuarioEmail,
    required this.realizadoEn,
    this.leido = false,
  });

  final String id;
  final String accion;
  final String entidad;
  final String? entidadNombre;
  final String? usuarioEmail;
  final String realizadoEn;
  final bool leido;

  WorkerNotif markRead() => WorkerNotif(
    id: id,
    accion: accion,
    entidad: entidad,
    entidadNombre: entidadNombre,
    usuarioEmail: usuarioEmail,
    realizadoEn: realizadoEn,
    leido: true,
  );
}
