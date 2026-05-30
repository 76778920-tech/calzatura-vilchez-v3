import type { AuditEntry } from "@/services/audit";
import { isWorkerAuditEntry } from "./workerNotificationPolicy";

export type WorkerNotifSeed = Pick<
  AuditEntry,
  "id" | "accion" | "entidad" | "entidadNombre" | "usuarioEmail" | "realizadoEn"
>;

export type WorkerNotificationsPollState = {
  initialized: boolean;
  seenAuditIds: Set<string>;
};

export type WorkerNotificationsPollResult = {
  nextState: WorkerNotificationsPollState;
  fresh: WorkerNotifSeed[];
  isBootstrap: boolean;
};

export function createWorkerNotificationsPollState(): WorkerNotificationsPollState {
  return { initialized: false, seenAuditIds: new Set() };
}

/** Detecta entradas nuevas de trabajadores (usado por el hook de la campana). */
export function pollWorkerAuditEntries(
  entries: AuditEntry[],
  workerUids: ReadonlySet<string>,
  state: WorkerNotificationsPollState,
): WorkerNotificationsPollResult {
  const fresh = entries.filter(
    (e) =>
      Boolean(e.id) &&
      !state.seenAuditIds.has(e.id) &&
      isWorkerAuditEntry(e, workerUids),
  );

  const isBootstrap = !state.initialized;
  const seenAuditIds = new Set(state.seenAuditIds);
  for (const e of fresh) {
    seenAuditIds.add(e.id);
  }

  return {
    fresh,
    isBootstrap,
    nextState: { initialized: true, seenAuditIds },
  };
}

export const WORKER_NOTIFS_REFRESH_EVENT = "cv:worker-notifs-refresh";

export function requestWorkerNotificationsRefresh(): void {
  if (typeof globalThis.dispatchEvent === "function") {
    globalThis.dispatchEvent(new Event(WORKER_NOTIFS_REFRESH_EVENT));
  }
}
