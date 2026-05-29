import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { supabase } from "@/supabase/client";
import { fetchRecentAudit } from "@/services/audit";

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
const TRACKED_ENTITIES = new Set(["producto", "venta"]);

export function useWorkerNotifications(enabled: boolean) {
  const [notifs, setNotifs] = useState<WorkerNotif[]>([]);
  const workerUids = useRef<Set<string>>(new Set());
  const baseline = useRef<string | null>(null);
  const initialized = useRef(false);

  // Carga los UIDs de todos los trabajadores una sola vez
  useEffect(() => {
    if (!enabled) return;
    supabase
      .from("usuarios")
      .select("uid")
      .eq("rol", "trabajador")
      .then(({ data }) => {
        if (data) {
          workerUids.current = new Set(
            (data as { uid: string }[])
              .map((u) => u.uid)
              .filter(Boolean),
          );
        }
      })
      .catch(() => {});
  }, [enabled]);

  const poll = useCallback(async () => {
    if (!enabled) return;
    try {
      const entries = await fetchRecentAudit(20);
      if (!entries.length) return;

      if (!initialized.current) {
        // Primera llamada: establece el punto de corte sin generar notificaciones
        baseline.current = entries[0].realizadoEn;
        initialized.current = true;
        return;
      }

      const cutoff = baseline.current ?? "";
      const fresh = entries.filter(
        (e) =>
          e.realizadoEn > cutoff &&
          TRACKED_ENTITIES.has(e.entidad) &&
          e.usuarioUid != null &&
          workerUids.current.has(e.usuarioUid),
      );

      // Actualiza el baseline siempre (con o sin actividad de trabajadores)
      baseline.current = entries[0].realizadoEn;

      if (fresh.length === 0) return;

      setNotifs((prev) =>
        [
          ...fresh.map<WorkerNotif>((e) => ({ ...e, leido: false })),
          ...prev,
        ].slice(0, MAX_NOTIFS),
      );

      // Toasts — máximo 3 para no saturar la pantalla
      fresh.slice(0, 3).forEach((e) => {
        const tipoLabel = e.entidad === "producto" ? "Producto" : "Venta";
        toast(
          `✏️ Trabajador ${e.accion} un ${tipoLabel}${e.entidadNombre ? `: ${e.entidadNombre}` : ""}`,
          {
            duration: 5000,
            style: {
              background: "#1c1c1c",
              color: "#fff",
              fontSize: "13px",
              border: "1px solid rgba(201,162,39,0.5)",
            },
          },
        );
      });
    } catch {
      // Falla silenciosa — las notificaciones no son críticas
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
