import { useEffect, useMemo, useState } from "react";
import { Award, CircleDollarSign, ClipboardCheck, Target, TrendingUp } from "lucide-react";
import { fetchStaffPerformance } from "@/domains/rrhh/services/humanResources";
import type { WorkerPerformanceMetrics } from "@/types";

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

export default function StaffPerformancePage() {
  const [period, setPeriod] = useState(currentPeriod);
  const [performance, setPerformance] = useState<WorkerPerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetchStaffPerformance(period)
      .then((data) => {
        if (!active) return;
        setPerformance(data);
        setError("");
      })
      .catch(() => {
        if (!active) return;
        setPerformance(null);
        setError("No se pudo cargar tu desempeño.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [period]);

  const cards = useMemo(() => {
    if (!performance) return [];
    return [
      {
        label: "Ventas registradas",
        value: currency(performance.ventasTotal),
        detail: `${performance.ventasCantidad} ventas · ${performance.unidadesVendidas} unidades`,
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

  return (
    <div className="staff-home-page">
      <section className="staff-hero">
        <div>
          <span className="staff-hero-kicker"><Target size={16} /> Desempeño personal</span>
          <h1>Mis métricas del periodo</h1>
          <p>
            Consulta tus ventas, pedidos gestionados, metas cumplidas y un feedback operativo básico.
          </p>
        </div>
        <div className="hr-period-control">
          <label htmlFor="staff-period">Periodo</label>
          <input
            id="staff-period"
            className="form-input"
            type="month"
            value={period}
            onChange={(event) => {
              setLoading(true);
              setPeriod(event.target.value || currentPeriod());
            }}
          />
        </div>
      </section>

      {error && <p className="staff-inline-warning">{error}</p>}

      <section className="staff-ops-grid" aria-label="Métricas de desempeño">
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
        <section className="hr-panel-grid">
          <article className="hr-panel-card">
            <div className="staff-section-heading">
              <div>
                <p>Metas del periodo</p>
                <h2>Avance individual</h2>
              </div>
              <span><TrendingUp size={14} /> {period}</span>
            </div>
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
          </article>

          <article className="hr-panel-card hr-feedback-card">
            <p>Feedback básico</p>
            <h2>{performance.feedback}</h2>
            <span>
              Esta vista es personal y operativa. Las evaluaciones profesionales o decisiones de RR.HH. no se muestran aquí.
            </span>
          </article>
        </section>
      )}
    </div>
  );
}
