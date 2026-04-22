import { useCallback, useEffect, useState } from "react";
import {
  Brain, TrendingUp, TrendingDown, Minus, AlertTriangle,
  Package, RefreshCw, ChevronUp, ChevronDown,
} from "lucide-react";

const AI_BASE = import.meta.env.VITE_AI_SERVICE_URL ?? "http://localhost:8000";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Prediction {
  productId: string;
  nombre: string;
  categoria: string;
  precio: number;
  stock_actual: number;
  prediccion_unidades: number;
  prediccion_diaria: number;
  prediccion_semanal: number;
  total_vendido_historico: number;
  promedio_diario_historico: number;
  dias_hasta_agotarse: number;
  tendencia: "subiendo" | "bajando" | "estable";
  confianza: number;
  alerta_stock: boolean;
}

interface WeekPoint {
  semana: string;
  unidades: number;
}

type HorizonOption = 7 | 15 | 30;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function TrendIcon({ trend }: { trend: Prediction["tendencia"] }) {
  if (trend === "subiendo") return <TrendingUp size={14} className="pred-trend-up" />;
  if (trend === "bajando") return <TrendingDown size={14} className="pred-trend-down" />;
  return <Minus size={14} className="pred-trend-stable" />;
}

function ConfidenceBar({ value }: { value: number }) {
  const color = value >= 70 ? "#10b981" : value >= 45 ? "#f59e0b" : "#ef4444";
  return (
    <div className="pred-conf-track" title={`Confianza: ${value}%`}>
      <div className="pred-conf-fill" style={{ width: `${value}%`, background: color }} />
    </div>
  );
}

function WeeklyChart({ data }: { data: WeekPoint[] }) {
  const max = Math.max(...data.map((d) => d.unidades), 1);
  return (
    <div className="pred-chart-bars">
      {data.map((d) => (
        <div key={d.semana} className="pred-chart-col">
          <span className="pred-chart-val">{d.unidades > 0 ? d.unidades : ""}</span>
          <div className="pred-chart-track">
            <div
              className="pred-chart-fill"
              style={{ height: `${Math.max((d.unidades / max) * 100, d.unidades > 0 ? 4 : 0)}%` }}
            />
          </div>
          <span className="pred-chart-label">{d.semana}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

function SortIcon({ active, asc }: { active: boolean; asc: boolean }) {
  if (!active) return null;
  return asc ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
}

export default function AdminPredictions() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [alerts, setAlerts] = useState<Prediction[]>([]);
  const [weeklyChart, setWeeklyChart] = useState<WeekPoint[]>([]);
  const [horizon, setHorizon] = useState<HorizonOption>(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<keyof Prediction>("prediccion_unidades");
  const [sortAsc, setSortAsc] = useState(false);
  const [tab, setTab] = useState<"predicciones" | "alertas">("predicciones");

  const load = useCallback(async (h: HorizonOption) => {
    setLoading(true);
    setError(null);
    try {
      const [predRes, alertRes, chartRes] = await Promise.all([
        fetch(`${AI_BASE}/api/predict/demand?horizon=${h}`),
        fetch(`${AI_BASE}/api/predict/stock-alert?days_threshold=14`),
        fetch(`${AI_BASE}/api/sales/weekly-chart?weeks=8`),
      ]);
      if (!predRes.ok || !alertRes.ok || !chartRes.ok) {
        throw new Error("Error al conectar con el servicio de IA.");
      }
      const [predData, alertData, chartData] = await Promise.all([
        predRes.json(),
        alertRes.json(),
        chartRes.json(),
      ]);
      setPredictions(predData.predictions ?? []);
      setAlerts(alertData.alerts ?? []);
      setWeeklyChart(chartData.chart ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load(horizon);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [horizon, load]);

  const handleSort = (key: keyof Prediction) => {
    if (sortKey === key) {
      setSortAsc((v) => !v);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const sorted = [...predictions].sort((a, b) => {
    const va = a[sortKey] as number | string;
    const vb = b[sortKey] as number | string;
    if (typeof va === "number" && typeof vb === "number") {
      return sortAsc ? va - vb : vb - va;
    }
    return sortAsc
      ? String(va).localeCompare(String(vb))
      : String(vb).localeCompare(String(va));
  });

  // ─── Loading / Error ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="success-spinner" />
        <p>Cargando modelo predictivo...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pred-error-card">
        <AlertTriangle size={32} />
        <h3>No se pudo conectar al servicio de IA</h3>
        <p>{error}</p>
        <p className="pred-error-hint">
          Asegúrate de que el servicio Python esté corriendo:<br />
          <code>cd ai-service → run.bat</code>
        </p>
        <button type="button" className="btn btn-primary" onClick={() => load(horizon)}>
          <RefreshCw size={15} /> Reintentar
        </button>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="pred-root">
      {/* Header */}
      <div className="dash-header">
        <div>
          <p className="dash-greeting">Inteligencia Artificial</p>
          <h1 className="dash-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Brain size={26} /> Modelo Predictivo
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>Horizonte:</span>
          {([7, 15, 30] as HorizonOption[]).map((h) => (
            <button
              key={h}
              type="button"
              className={`pred-horizon-btn ${horizon === h ? "active" : ""}`}
              onClick={() => setHorizon(h)}
            >
              {h}d
            </button>
          ))}
          <button type="button" className="btn btn-ghost pred-refresh" onClick={() => load(horizon)}>
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* KPI summary */}
      <div className="pred-kpi-row">
        <div className="pred-kpi-card">
          <Package size={20} />
          <div>
            <p className="pred-kpi-label">Productos analizados</p>
            <p className="pred-kpi-value">{predictions.length}</p>
          </div>
        </div>
        <div className="pred-kpi-card pred-kpi-gold">
          <TrendingUp size={20} />
          <div>
            <p className="pred-kpi-label">Unidades proyectadas ({horizon}d)</p>
            <p className="pred-kpi-value">
              {Math.round(predictions.reduce((a, p) => a + p.prediccion_unidades, 0))}
            </p>
          </div>
        </div>
        <div className={`pred-kpi-card ${alerts.length > 0 ? "pred-kpi-alert" : ""}`}>
          <AlertTriangle size={20} />
          <div>
            <p className="pred-kpi-label">Alertas de stock</p>
            <p className="pred-kpi-value">{alerts.length}</p>
          </div>
        </div>
        <div className="pred-kpi-card">
          <TrendingUp size={20} />
          <div>
            <p className="pred-kpi-label">Tendencia positiva</p>
            <p className="pred-kpi-value">
              {predictions.filter((p) => p.tendencia === "subiendo").length}
            </p>
          </div>
        </div>
      </div>

      {/* Weekly chart */}
      {weeklyChart.length > 0 && (
        <div className="dash-card">
          <div className="dash-card-header">
            <div>
              <p className="dash-card-kicker">Histórico de ventas</p>
              <h2 className="dash-card-title">Unidades vendidas por semana</h2>
            </div>
          </div>
          <WeeklyChart data={weeklyChart} />
        </div>
      )}

      {/* Tabs */}
      <div className="pred-tabs">
        <button
          type="button"
          className={`pred-tab ${tab === "predicciones" ? "active" : ""}`}
          onClick={() => setTab("predicciones")}
        >
          Predicciones de demanda
          <span className="pred-tab-count">{predictions.length}</span>
        </button>
        <button
          type="button"
          className={`pred-tab ${tab === "alertas" ? "active" : ""}`}
          onClick={() => setTab("alertas")}
        >
          Alertas de stock
          {alerts.length > 0 && (
            <span className="pred-tab-count pred-tab-count-alert">{alerts.length}</span>
          )}
        </button>
      </div>

      {/* Predictions table */}
      {tab === "predicciones" && (
        <div className="dash-card" style={{ padding: 0, overflow: "hidden" }}>
          {sorted.length === 0 ? (
            <p className="admin-empty" style={{ padding: "2rem" }}>
              No hay datos de ventas suficientes para generar predicciones aún.
            </p>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table pred-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th className="pred-th-sort" onClick={() => handleSort("prediccion_unidades")}>
                      <span>Pred. {horizon}d <SortIcon active={sortKey === "prediccion_unidades"} asc={sortAsc} /></span>
                    </th>
                    <th className="pred-th-sort" onClick={() => handleSort("prediccion_semanal")}>
                      <span>Por semana <SortIcon active={sortKey === "prediccion_semanal"} asc={sortAsc} /></span>
                    </th>
                    <th className="pred-th-sort" onClick={() => handleSort("stock_actual")}>
                      <span>Stock actual <SortIcon active={sortKey === "stock_actual"} asc={sortAsc} /></span>
                    </th>
                    <th className="pred-th-sort" onClick={() => handleSort("dias_hasta_agotarse")}>
                      <span>Días restantes <SortIcon active={sortKey === "dias_hasta_agotarse"} asc={sortAsc} /></span>
                    </th>
                    <th>Tendencia</th>
                    <th>Confianza</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((p) => (
                    <tr key={p.productId} className={p.alerta_stock ? "pred-row-alert" : ""}>
                      <td>
                        <p className="pred-product-name">{p.nombre}</p>
                        <p className="pred-product-cat">{p.categoria}</p>
                      </td>
                      <td>
                        <strong className="pred-value">{p.prediccion_unidades}</strong>
                        <span className="pred-sub"> uds.</span>
                      </td>
                      <td>
                        <strong>{p.prediccion_semanal}</strong>
                        <span className="pred-sub"> uds./sem</span>
                      </td>
                      <td>
                        <span className={`pred-stock-badge ${p.stock_actual === 0 ? "out" : p.alerta_stock ? "low" : "ok"}`}>
                          {p.stock_actual} uds.
                        </span>
                      </td>
                      <td>
                        {p.dias_hasta_agotarse >= 999 ? (
                          <span className="pred-sub">Sin proyección</span>
                        ) : p.dias_hasta_agotarse === 0 ? (
                          <span className="pred-days-critical">Sin stock</span>
                        ) : (
                          <span className={p.dias_hasta_agotarse < 7 ? "pred-days-critical" : p.dias_hasta_agotarse < 14 ? "pred-days-warn" : ""}>
                            ~{p.dias_hasta_agotarse} días
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="pred-trend-cell">
                          <TrendIcon trend={p.tendencia} />
                          {p.tendencia}
                        </span>
                      </td>
                      <td>
                        <ConfidenceBar value={p.confianza} />
                        <span className="pred-conf-pct">{p.confianza}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Alerts tab */}
      {tab === "alertas" && (
        <div className="pred-alerts-grid">
          {alerts.length === 0 ? (
            <div className="pred-no-alerts">
              <Package size={32} />
              <p>No hay productos en riesgo de agotarse en los próximos 14 días.</p>
            </div>
          ) : (
            alerts.map((a) => (
              <div key={a.productId} className="pred-alert-card">
                <div className="pred-alert-header">
                  <AlertTriangle size={16} className={a.dias_hasta_agotarse < 7 ? "pred-trend-down" : "pred-trend-warn"} />
                  <span className="pred-alert-days">
                    {a.dias_hasta_agotarse < 7 ? "CRÍTICO" : "ALERTA"} — ~{a.dias_hasta_agotarse} días
                  </span>
                </div>
                <p className="pred-alert-name">{a.nombre}</p>
                <p className="pred-alert-cat">{a.categoria}</p>
                <div className="pred-alert-stats">
                  <div>
                    <p className="pred-kpi-label">Stock actual</p>
                    <p className="pred-alert-stat-val">{a.stock_actual} uds.</p>
                  </div>
                  <div>
                    <p className="pred-kpi-label">Demanda diaria</p>
                    <p className="pred-alert-stat-val">{a.prediccion_diaria} uds./día</p>
                  </div>
                  <div>
                    <p className="pred-kpi-label">Pred. {horizon}d</p>
                    <p className="pred-alert-stat-val">{a.prediccion_unidades} uds.</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Disclaimer */}
      <p className="pred-disclaimer">
        Las predicciones se calculan con regresión lineal ponderada sobre el historial de ventas. La confianza aumenta con más datos históricos.
      </p>
    </div>
  );
}
