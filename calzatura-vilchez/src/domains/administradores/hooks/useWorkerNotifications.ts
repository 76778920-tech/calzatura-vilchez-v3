import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { fetchAllUsers } from "@/domains/usuarios/services/users";
import { fetchRecentAudit } from "@/services/audit";
import {
  formatWorkerNotifToast,
} from "../utils/workerNotificationPolicy";
import {
  createWorkerNotificationsPollState,
  pollWorkerAuditEntries,
  WORKER_NOTIFS_REFRESH_EVENT,
  type WorkerNotificationsPollState,
} from "../utils/workerNotificationsPoll";

export type WorkerNotif = {
  id: string;
  accion: string;
  entidad: string;
  entidadNombre: string | null;
  usuarioEmail: string | null;
  realizadoEn: string;
  leido: boolean;
};

const POLL_MS = 30_000;
const MAX_NOTIFS = 50;

export function useWorkerNotifications(enabled: boolean) {
  const [notifs, setNotifs] = useState<WorkerNotif[]>([]);
  const [workersLoaded, setWorkersLoaded] = useState(false);
  const workerUids = useRef<Set<string>>(new Set());
  const pollState = useRef<WorkerNotificationsPollState>(createWorkerNotificationsPollState());
  const workersReady = enabled && workersLoaded;
  const visibleNotifs = enabled ? notifs : [];

  useEffect(() => {
    if (!enabled) {
      workerUids.current = new Set();
      pollState.current = createWorkerNotificationsPollState();
      return;
    }

    let cancelled = false;

    const load = async () => {
      setNotifs([]);
      setWorkersLoaded(false);
      try {
        const users = await fetchAllUsers();
        if (cancelled) return;
        workerUids.current = new Set(
          users.filter((u) => u.rol === "trabajador").map((u) => u.uid).filter(Boolean),
        );
        setWorkersLoaded(workerUids.current.size > 0);
      } catch (err) {
        if (cancelled) return;
        console.error("[worker-notifs] no se pudieron cargar UIDs de trabajadores:", err);
        setWorkersLoaded(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const poll = useCallback(async () => {
    if (!enabled || !workersReady || workerUids.current.size === 0) return;
    try {
      const entries = await fetchRecentAudit(30);
      if (!entries.length) return;

      const { fresh, isBootstrap, nextState } = pollWorkerAuditEntries(
        entries,
        workerUids.current,
        pollState.current,
      );
      pollState.current = nextState;

      if (fresh.length === 0) return;

      setNotifs((prev) =>
        [
          ...fresh.map<WorkerNotif>((e) => ({ ...e, leido: false })),
          ...prev,
        ].slice(0, MAX_NOTIFS),
      );

      if (!isBootstrap) {
        fresh.slice(0, 3).forEach((e) => {
          toast(formatWorkerNotifToast(e), {
            duration: 5000,
            style: {
              background: "#1c1c1c",
              color: "#fff",
              fontSize: "13px",
              border: "1px solid rgba(201,162,39,0.5)",
            },
          });
        });
      }
    } catch (err) {
      console.error("[worker-notifs] poll falló:", err);
    }
  }, [enabled, workersReady]);

  useEffect(() => {
    if (!enabled || !workersReady) return;
    void poll();
    const id = setInterval(poll, POLL_MS);
    return () => clearInterval(id);
  }, [enabled, workersReady, poll]);

  useEffect(() => {
    if (!enabled || !workersReady) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") void poll();
    };
    const onRefresh = () => void poll();
    document.addEventListener("visibilitychange", onVisible);
    globalThis.addEventListener(WORKER_NOTIFS_REFRESH_EVENT, onRefresh);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      globalThis.removeEventListener(WORKER_NOTIFS_REFRESH_EVENT, onRefresh);
    };
  }, [enabled, workersReady, poll]);

  const unread = visibleNotifs.filter((n) => !n.leido).length;

  const markAllRead = () =>
    setNotifs((prev) => prev.map((n) => ({ ...n, leido: true })));

  const dismiss = (id: string) =>
    setNotifs((prev) => prev.filter((n) => n.id !== id));

  return { notifs: visibleNotifs, unread, markAllRead, dismiss };
}
