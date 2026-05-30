import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, CircleDollarSign, Package, X } from "lucide-react";
import { useAuth } from "@/domains/usuarios/context/AuthContext";
import {
  useWorkerNotifications,
  type WorkerNotif,
} from "../hooks/useWorkerNotifications";
import {
  actionLabelForWorkerNotif,
  entityLabelForWorkerNotif,
} from "../utils/workerNotificationPolicy";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
}

const ACCION_COLORS: Record<string, string> = {
  crear: "#22c55e",
  editar: "#6366f1",
  eliminar: "#ef4444",
  cambiar_estado: "#f59e0b",
  importar: "#0ea5e9",
  registrar_venta: "#22c55e",
  devolver_venta: "#f59e0b",
};

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function AccionPill({ accion, label }: { accion: string; label?: string }) {
  const color = ACCION_COLORS[accion] ?? "#888";
  return (
    <span
      style={{
        background: `${color}22`,
        color,
        border: `1px solid ${color}44`,
        borderRadius: 5,
        padding: "1px 7px",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 0.5,
        textTransform: "uppercase" as const,
        whiteSpace: "nowrap" as const,
        flexShrink: 0,
      }}
    >
      {label ?? accion}
    </span>
  );
}

function NotifItem({
  n,
  onDismiss,
}: {
  n: WorkerNotif;
  onDismiss: () => void;
}) {
  const Icon = n.entidad === "producto" ? Package : n.entidad === "pedido" ? Package : CircleDollarSign;
  return (
    <div
      className={`wnotif-item${n.leido ? " wnotif-item--read" : ""}`}
      role="listitem"
    >
      <span className="wnotif-item-icon" aria-hidden="true">
        <Icon size={14} />
      </span>
      <div className="wnotif-item-body">
        <div className="wnotif-item-top">
          <AccionPill accion={n.accion} label={actionLabelForWorkerNotif(n.accion)} />
          <span className="wnotif-item-name">
            {n.entidadNombre ?? entityLabelForWorkerNotif(n.entidad)}
          </span>
        </div>
        <span className="wnotif-item-meta">
          {n.usuarioEmail ?? "trabajador"}&nbsp;·&nbsp;
          {relativeTime(n.realizadoEn)}
        </span>
      </div>
      <button
        type="button"
        className="wnotif-dismiss"
        onClick={onDismiss}
        aria-label="Descartar notificación"
      >
        <X size={12} />
      </button>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function WorkerNotificationsBell() {
  const { isAdmin } = useAuth();
  const { notifs, unread, markAllRead, dismiss } = useWorkerNotifications(
    !!isAdmin,
  );
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Cierra al hacer clic fuera
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Cierra con Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next) markAllRead();
  };

  if (!isAdmin) return null;

  return (
    <div className="wnotif-wrap" ref={containerRef}>
      <button
        type="button"
        className={`wnotif-bell${open ? " wnotif-bell--active" : ""}`}
        onClick={handleToggle}
        aria-label={
          unread > 0
            ? `Notificaciones — ${unread} sin leer`
            : "Notificaciones de trabajadores"
        }
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="wnotif-badge" aria-hidden="true">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="wnotif-dropdown"
          role="dialog"
          aria-label="Actividad reciente de trabajadores"
        >
          <div className="wnotif-header">
            <span className="wnotif-header-title">
              Actividad de trabajadores
            </span>
            {notifs.length > 0 && (
              <button
                type="button"
                className="wnotif-mark-all"
                onClick={markAllRead}
                title="Marcar todo como leído"
              >
                <CheckCheck size={14} />
              </button>
            )}
          </div>

          <div className="wnotif-list" role="list">
            {notifs.length === 0 ? (
              <p className="wnotif-empty">
                Sin actividad reciente de trabajadores.
              </p>
            ) : (
              notifs.map((n) => (
                <NotifItem
                  key={n.id}
                  n={n}
                  onDismiss={() => dismiss(n.id)}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
