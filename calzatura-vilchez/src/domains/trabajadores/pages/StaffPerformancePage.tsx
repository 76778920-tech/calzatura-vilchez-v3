import { useCallback, useEffect, useMemo, useState } from "react";
import { Award, Bell, CalendarClock, CircleDollarSign, ClipboardCheck, Footprints, Target, TrendingUp } from "lucide-react";
import toast from "react-hot-toast";
import DailySalesHistoryTable from "@/domains/rrhh/components/DailySalesHistoryTable";
import {
  fetchStaffPerformance,
  markAllStaffNotificationsRead,
  markStaffNotificationRead,
} from "@/domains/rrhh/services/humanResources";
import type { StaffNotification, StaffPerformancePayload, WorkerPerformanceMetrics } from "@/types";

function currentPeriod() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function currency(value: number) {
  return `S/ ${Number(value || 0).toFixed(2)}`;
}

function percent(value: number) {
  return `${Math.round(Number(value || 0))}%`;
}

function formatCita(fechaCita: string) {
  const value = new Date(fechaCita);
  if (Number.isNaN(value.getTime())) return fechaCita;
  return value.toLocaleString("es-PE", { dateStyle: "full", timeStyle: "short" });
}

export default function StaffPerformancePage() {
  const [period, setPeriod] = useState(currentPeriod);
  const [payload, setPayload] = useState<StaffPerformancePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    fetchStaffPerformance(period)
      .then((data) => {
        setPayload(data);
        setError("");
      })
      .catch(() => {
        setPayload(null);
        setError("No se pudo cargar tu desempeño.");
      })
      .finally(() => setLoading(false));
  }, [period]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const performance = payload?.performance ?? null;
  const unreadCount = (payload?.notificaciones ?? []).filter((item) => !item.leida).length;

  const cards = useMemo(() => {
    if (!performance) return [];
    return [
      {
        label: "Pares vendidos",
        value: String(performance.unidadesVendidas),
        detail: `${performance.ventasCantidad} transacciones en el mes`,
        icon: Footprints,
      },
      {
        label: "Ventas registradas",
        value: currency(performance.ventasTotal),
        detail: `Ganancia estimada ${currency(performance.gananciaTotal)}`,
        icon: CircleDollarSign,
      },
      {
        label: "Pedidos gestionados",
        value: String(performance.pedidosGestionados),
        detail: `Meta mensual: ${performance.metaPedidos} pedidos`,
        icon: ClipboardCheck,
      },
      {
        label: "Cumplimiento general",
        value: percent(performance.cumplimientoGeneral),
        detail: "Promedio entre ventas y pedidos",
        icon: Award,
      },
    ];
  }, [performance]);

  const handleMarkRead = async (notification: StaffNotification) => {
    if (notification.leida) return;
    try {
      await markStaffNotificationRead(notification.id);
      setPayload((current) => {
        if (!current) return current;
        return {
          ...current,
          notificaciones: current.notificaciones.map((item) =>
            item.id === notification.id ? { ...item, leida: true } : item,
          ),
        };
      });
    } catch {
      toast.error("No se pudo marcar la notificación");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllStaffNotificationsRead();
      setPayload((current) => {
        if (!current) return current;
        return {
          ...current,
          notificaciones: current.notificaciones.map((item) => ({ ...item, leida: true })),
        };
      });
      toast.success("Notificaciones marcadas como leídas");
    } catch {
      toast.error("No se pudieron actualizar las notificaciones");
    }
  };

  return (
    <div className="staff-home-page">
      <section className="staff-hero">
        <div>
          <span className="staff-hero-kicker"><Target size={16} /> Desempeño personal</span>
          <h1>Mis métricas y ventas del periodo</h1>
          <p>
            Consulta tus pares vendidos por fecha, metas del mes, citas de evaluación y avisos de RR.HH.
          </p>
        </div>
        <div className="hr-period-control">
          <label htmlFor="staff-period">Periodo</label>
          <input
            id="staff-period"
            className="form-input"
            type="month"
            value={period}
            onChange={(event) => setPeriod(event.target.value || currentPeriod())}
          />
        </div>
      </section>

      {error && <p className="staff-inline-warning">{error}</p>}

      <section className="staff-ops-grid staff-ops-grid-4" aria-label="Métricas de desempeño">
        {loading && !performance ? (
          <article className="staff-ops-card"><p>Cargando métricas...</p></article>
        ) : cards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.label} className="staff-ops-card">
              <span className="staff-ops-icon"><Icon size={22} /></span>
              <div>
                <small>{card.label}</small>
                <strong>{card.value}</strong>
                <p>{card.detail}</p>
              </div>
            </article>
          );
        })}
      </section>

      {performance && (
        <>
          <section className="hr-panel-grid">
            <article className="hr-panel-card">
              <div className="staff-section-heading">
                <div>
                  <p>Metas del periodo</p>
                  <h2>Avance individual</h2>
                </div>
                <span><TrendingUp size={14} /> {period}</span>
              </div>
              <ProgressBlock performance={performance} />
            </article>

            <article className="hr-panel-card hr-feedback-card">
              <p>Feedback operativo</p>
              <h2>{performance.feedback}</h2>
              <span>
                Las decisiones finales de RR.HH. te llegarán por notificación cuando correspondan.
              </span>
            </article>
          </section>

          {(payload?.workflow?.proximaCita || payload?.workflow?.alertaActiva) && (
            <section className="hr-panel-card hr-workflow-banner">
              <div className="staff-section-heading">
                <div>
                  <p>Seguimiento profesional</p>
                  <h2>Evaluación en curso</h2>
                </div>
                <CalendarClock size={18} />
              </div>
              {payload.workflow.proximaCita ? (
                <p>
                  <strong>Cita programada:</strong>{" "}
                  {formatCita(payload.workflow.proximaCita.fechaCita)} — {payload.workflow.proximaCita.lugar}
                </p>
              ) : (
                <p>RR.HH. ha solicitado una evaluación. El psicólogo coordinará contigo la fecha de la cita.</p>
              )}
            </section>
          )}

          <section className="hr-panel-card">
            <div className="staff-section-heading">
              <div>
                <p>Historial diario</p>
                <h2>Pares vendidos por fecha</h2>
              </div>
              <span>{payload?.historialDiario.length ?? 0} día(s) con ventas</span>
            </div>
            <DailySalesHistoryTable rows={payload?.historialDiario ?? []} />
          </section>

          <section className="hr-panel-card">
            <div className="staff-section-heading">
              <div>
                <p>Bandeja de avisos</p>
                <h2>Notificaciones</h2>
              </div>
              <div className="hr-inline-actions">
                {unreadCount > 0 && <span className="hr-badge">{unreadCount} sin leer</span>}
                <button type="button" className="btn-secondary btn-sm" onClick={handleMarkAllRead}>
                  Marcar todas leídas
                </button>
              </div>
            </div>
            <div className="hr-notification-list">
              {(payload?.notificaciones ?? []).length === 0 ? (
                <p className="staff-empty-state">No tienes notificaciones.</p>
              ) : (payload?.notificaciones ?? []).map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  className={`hr-notification-item ${notification.leida ? "" : "unread"}`}
                  onClick={() => handleMarkRead(notification)}
                >
                  <span><Bell size={14} /> {notification.titulo}</span>
                  <p>{notification.mensaje}</p>
                  <small>{new Date(notification.creadoEn).toLocaleString("es-PE")}</small>
                </button>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function ProgressBlock({ performance }: { performance: WorkerPerformanceMetrics }) {
  return (
    <div className="hr-progress-list">
      <div>
        <span>Ventas</span>
        <strong>{percent(performance.cumplimientoVentas)}</strong>
        <div className="hr-progress-bar"><span style={{ width: `${Math.min(100, performance.cumplimientoVentas)}%` }} /></div>
        <small>{currency(performance.ventasTotal)} de {currency(performance.metaVentas)}</small>
      </div>
      <div>
        <span>Pedidos</span>
        <strong>{percent(performance.cumplimientoPedidos)}</strong>
        <div className="hr-progress-bar"><span style={{ width: `${Math.min(100, performance.cumplimientoPedidos)}%` }} /></div>
        <small>{performance.pedidosGestionados} de {performance.metaPedidos} pedidos</small>
      </div>
    </div>
  );
}


