import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { fetchAllUsers } from "@/domains/usuarios/services/users";
import { fetchRecentAudit } from "@/services/audit";
import {
  formatWorkerNotifToast,
  isWorkerAuditEntry,
} from "../utils/workerNotificationPolicy";

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
  const workerUids = useRef<Set<string>>(new Set());
  const baseline = useRef<string | null>(null);
  const initialized = useRef(false);
  const workersLoaded = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    const load = async () => {
      try {
        const users = await fetchAllUsers();
        workerUids.current = new Set(
          users.filter((u) => u.rol === "trabajador").map((u) => u.uid).filter(Boolean),
        );
        workersLoaded.current = true;
      } catch (err) {
        console.error("[worker-notifs] no se pudieron cargar UIDs de trabajadores:", err);
        workersLoaded.current = false;
      }
    };
    void load();
  }, [enabled]);

  const poll = useCallback(async () => {
    if (!enabled || !workersLoaded.current || workerUids.current.size === 0) return;
    try {
      const entries = await fetchRecentAudit(30);
      if (!entries.length) return;

      if (!initialized.current) {
        baseline.current = entries[0].realizadoEn;
        initialized.current = true;
        return;
      }

      const cutoff = baseline.current ?? "";
      const fresh = entries.filter(
        (e) => e.realizadoEn > cutoff && isWorkerAuditEntry(e, workerUids.current),
      );

      baseline.current = entries[0].realizadoEn;

      if (fresh.length === 0) return;

      setNotifs((prev) =>
        [
          ...fresh.map<WorkerNotif>((e) => ({ ...e, leido: false })),
          ...prev,
        ].slice(0, MAX_NOTIFS),
      );

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
    } catch (err) {
      console.error("[worker-notifs] poll falló:", err);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => clearInterval(id);
  }, [enabled, poll]);

  const unread = notifs.filter((n) => !n.leido).length;

  const markAllRead = () =>
    setNotifs((prev) => prev.map((n) => ({ ...n, leido: true })));

  const dismiss = (id: string) =>
    setNotifs((prev) => prev.filter((n) => n.id !== id));

  return { notifs, unread, markAllRead, dismiss };
}
