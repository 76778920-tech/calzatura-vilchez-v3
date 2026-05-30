import type { AuditEntry } from "@/services/audit";

/** Entidades que generan notificación al admin cuando las ejecuta un trabajador. */
export const TRACKED_WORKER_ENTITIES = new Set([
  "producto",
  "pedido",
  "venta",
  "venta_diaria",
]);

const ACTION_LABELS: Record<string, string> = {
  crear: "creó",
  editar: "editó",
  eliminar: "eliminó",
  cambiar_estado: "actualizó",
  importar: "importó",
  registrar_venta: "registró",
  devolver_venta: "devolvió",
};

export function entityLabelForWorkerNotif(entidad: string): string {
  if (entidad === "producto") return "Producto";
  if (entidad === "pedido") return "Pedido";
  return "Venta";
}

export function actionLabelForWorkerNotif(accion: string): string {
  return ACTION_LABELS[accion] ?? accion;
}

export function isWorkerAuditEntry(
  entry: Pick<AuditEntry, "entidad" | "usuarioUid">,
  workerUids: ReadonlySet<string>,
): boolean {
  if (!entry.usuarioUid || !workerUids.has(entry.usuarioUid)) return false;
  return TRACKED_WORKER_ENTITIES.has(entry.entidad);
}

export function formatWorkerNotifToast(
  entry: Pick<AuditEntry, "accion" | "entidad" | "entidadNombre">,
): string {
  const tipo = entityLabelForWorkerNotif(entry.entidad);
  const verbo = actionLabelForWorkerNotif(entry.accion);
  const nombre = entry.entidadNombre ? `: ${entry.entidadNombre}` : "";
  return `Trabajador ${verbo} ${tipo}${nombre}`;
}
