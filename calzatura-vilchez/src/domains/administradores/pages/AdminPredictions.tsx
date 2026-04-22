import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Brain, TrendingUp, TrendingDown, Minus, AlertTriangle,
  Package, RefreshCw, CheckCircle, ShoppingCart, Zap, Search,
} from "lucide-react";

const AI_BASE = import.meta.env.VITE_AI_SERVICE_URL ?? "http://localhost:8000";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Prediction {
  productId: string;
  codigo: string;
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
  sin_historial: boolean;
}

interface WeekPoint {
  semana: string;
  unidades: number;
}

type HorizonOption = 7 | 15 | 30;

interface Recomendacion {
  tipo: "urgente" | "atencion" | "oportunidad" | "tranquilo";
  titulo: string;
  detalle: string;
  accion: string;
  producto: string;
  productId: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generarRecomendaciones(predictions: Prediction[]): Recomendacion[] {
  const recs: Recomendacion[] = [];

  for (const p of predictions.filter((p) => !p.sin_historial)) {
    if (p.stock_actual === 0) {
      recs.push({
        tipo: "urgente",
        titulo: "Sin stock — pedido inmediato",
        detalle: `"${p.nombre}" no tiene unidades disponibles y se sigue buscando.`,
        accion: "Haz un pedido al proveedor hoy mismo.",
        producto: p.nombre,
        productId: p.productId,
      });
    } else if (p.dias_hasta_agotarse < 7 && p.dias_hasta_agotarse > 0) {
      recs.push({
        tipo: "urgente",
        titulo: "Se agota esta semana",
        detalle: `"${p.nombre}" tiene stock para solo ~${p.dias_hasta_agotarse} días.`,
        accion: "Contáctate con el proveedor esta semana para reponer.",
        producto: p.nombre,
        productId: p.productId,
      });
    } else if (p.dias_hasta_agotarse < 21 && p.dias_hasta_agotarse >= 7) {
      recs.push({
        tipo: "atencion",
        titulo: "Empieza a planificar el reabastecimiento",
        detalle: `"${p.nombre}" le quedan ~${p.dias_hasta_agotarse} días de stock.`,
        accion: "Coordina el próximo pedido antes de que se acabe.",
        producto: p.nombre,
        productId: p.productId,
      });
    } else if (p.tendencia === "subiendo" && p.confianza >= 50) {
      recs.push({
        tipo: "oportunidad",
        titulo: "Producto en alza — asegura stock",
        detalle: `"${p.nombre}" está vendiendo cada vez más. La demanda sube.`,
        accion: "Considera pedir más unidades para no quedarte corto.",
        producto: p.nombre,
        productId: p.productId,
      });
    } else if (p.tendencia === "bajando" && p.stock_actual > p.prediccion_unidades * 2) {
      recs.push({
        tipo: "tranquilo",
        titulo: "No hagas pedidos grandes por ahora",
        detalle: `"${p.nombre}" vende menos que antes y tienes stock de sobra.`,
        accion: "Espera antes de reponer este producto.",
        producto: p.nombre,
        productId: p.productId,
      });
    }
  }

  const orden = { urgente: 0, atencion: 1, oportunidad: 2, tranquilo: 3 };
  return recs.sort((a, b) => orden[a.tipo] - orden[b.tipo]);
}

function TipoIcon({ tipo }: { tipo: Recomendacion["tipo"] }) {
  if (tipo === "urgente") return <AlertTriangle size={18} />;
  if (tipo === "atencion") return <Zap size={18} />;
  if (tipo === "oportunidad") return <TrendingUp size={18} />;
  return <CheckCircle size={18} />;
}

function EstadoBadge({ p }: { p: Prediction }) {
  if (p.sin_historial) return <span className="pred-estado-badge bajo">Sin ventas aún</span>;
  if (p.stock_actual === 0) return <span className="pred-estado-badge critico">Sin stock</span>;
  if (p.dias_hasta_agotarse < 7) return <span className="pred-estado-badge critico">Crítico</span>;
  if (p.dias_hasta_agotarse < 21) return <span className="pred-estado-badge alerta">Atención</span>;
  if (p.tendencia === "subiendo") return <span className="pred-estado-badge bien">En alza</span>;
  if (p.tendencia === "bajando") return <span className="pred-estado-badge bajo">Baja demanda</span>;
  return <span className="pred-estado-badge bien">Bien</span>;
}

function DuracionTexto({ p }: { p: Prediction }) {
  if (p.sin_historial) return <span className="pred-sub">Sin datos de ventas</span>;
  if (p.stock_actual === 0) return <span className="pred-days-critical">Sin stock</span>;
  if (p.dias_hasta_agotarse >= 999) return <span className="pred-sub">Más de 3 meses</span>;
  if (p.dias_hasta_agotarse < 7) return <span className="pred-days-critical">~{p.dias_hasta_agotarse} días</span>;
  if (p.dias_hasta_agotarse < 21) return <span className="pred-days-warn">~{p.dias_hasta_agotarse} días</span>;
  return <span>~{p.dias_hasta_agotarse} días</span>;
}

function TendenciaCell({ t }: { t: Prediction["tendencia"] }) {
  if (t === "subiendo") return <span className="pred-trend-cell"><TrendingUp size={14} className="pred-trend-up" /> Subiendo</span>;
  if (t === "bajando") return <span className="pred-trend-cell"><TrendingDown size={14} className="pred-trend-down" /> Bajando</span>;
  return <span className="pred-trend-cell"><Minus size={14} className="pred-trend-stable" /> Estable</span>;
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

export default function AdminPredictions() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [weeklyChart, setWeeklyChart] = useState<WeekPoint[]>([]);
  const [horizon, setHorizon] = useState<HorizonOption>(30);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (h: HorizonOption) => {
    setLoading(true);
    setError(null);
    try {
      const [predRes, chartRes] = await Promise.all([
        fetch(`${AI_BASE}/api/predict/demand?horizon=${h}`),
        fetch(`${AI_BASE}/api/sales/weekly-chart?weeks=8`),
      ]);
      if (!predRes.ok || !chartRes.ok) throw new Error("Error al conectar con el servicio de IA.");
      const [predData, chartData] = await Promise.all([predRes.json(), chartRes.json()]);
      setPredictions(predData.predictions ?? []);
      setWeeklyChart(chartData.chart ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => void load(horizon), 0);
    return () => window.clearTimeout(t);
  }, [horizon, load]);

  const recomendaciones = useMemo(() => generarRecomendaciones(predictions), [predictions]);

  const porOrden = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? predictions.filter((p) => p.codigo.toLowerCase().includes(q))
      : predictions;
    return [...filtered].sort((a, b) => {
      const prioridad = (p: Prediction) => {
        if (p.sin_historial) return 4;
        if (p.stock_actual === 0) return 0;
        if (p.dias_hasta_agotarse < 7) return 1;
        if (p.dias_hasta_agotarse < 21) return 2;
        return 3;
      };
      return prioridad(a) - prioridad(b);
    });
  }, [predictions, search]);

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="success-spinner" />
        <p>Analizando ventas e inventario...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pred-error-card">
        <AlertTriangle size={32} />
        <h3>No se pudo conectar al servicio de IA</h3>
        <p>{error}</p>
        <button type="button" className="btn btn-primary" onClick={() => load(horizon)}>
          <RefreshCw size={15} /> Reintentar
        </button>
      </div>
    );
  }

  const urgentes = recomendaciones.filter((r) => r.tipo === "urgente").length;
  const enAlza = predictions.filter((p) => !p.sin_historial && p.tendencia === "subiendo").length;
  const sinStock = predictions.filter((p) => p.stock_actual === 0).length;

  return (
    <div className="pred-root">

      {/* Header */}
      <div className="dash-header">
        <div>
          <p className="dash-greeting">Panel de decisiones</p>
          <h1 className="dash-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Brain size={26} /> Inteligencia Artificial
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>Proyectar:</span>
          {([7, 15, 30] as HorizonOption[]).map((h) => (
            <button
              key={h}
              type="button"
              className={`pred-horizon-btn ${horizon === h ? "active" : ""}`}
              onClick={() => setHorizon(h)}
            >
              {h} días
            </button>
          ))}
          <button type="button" className="btn btn-ghost pred-refresh" onClick={() => load(horizon)}>
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Resumen ejecutivo */}
      <div className="pred-kpi-row">
        <div className={`pred-kpi-card ${urgentes > 0 ? "pred-kpi-alert" : ""}`}>
          <ShoppingCart size={20} />
          <div>
            <p className="pred-kpi-label">Pedidos urgentes</p>
            <p className="pred-kpi-value">{urgentes}</p>
            <p className="pred-kpi-sub">{urgentes === 0 ? "Todo en orden" : "requieren atención"}</p>
          </div>
        </div>
        <div className={`pred-kpi-card ${sinStock > 0 ? "pred-kpi-alert" : ""}`}>
          <Package size={20} />
          <div>
            <p className="pred-kpi-label">Productos sin stock</p>
            <p className="pred-kpi-value">{sinStock}</p>
            <p className="pred-kpi-sub">{sinStock === 0 ? "Todos disponibles" : "no disponibles"}</p>
          </div>
        </div>
        <div className="pred-kpi-card pred-kpi-gold">
          <TrendingUp size={20} />
          <div>
            <p className="pred-kpi-label">Productos en alza</p>
            <p className="pred-kpi-value">{enAlza}</p>
            <p className="pred-kpi-sub">ventas creciendo</p>
          </div>
        </div>
        <div className="pred-kpi-card">
          <Package size={20} />
          <div>
            <p className="pred-kpi-label">Total productos</p>
            <p className="pred-kpi-value">{predictions.length}</p>
            <p className="pred-kpi-sub">en el catálogo</p>
          </div>
        </div>
      </div>

      {/* Recomendaciones */}
      {recomendaciones.length > 0 && (
        <div className="dash-card">
          <div className="dash-card-header">
            <div>
              <p className="dash-card-kicker">Lo que debes hacer ahora</p>
              <h2 className="dash-card-title">Recomendaciones</h2>
            </div>
          </div>
          <div className="pred-recs-list">
            {recomendaciones.map((r) => (
              <div key={r.productId + r.tipo} className={`pred-rec-item pred-rec-${r.tipo}`}>
                <div className={`pred-rec-icon pred-rec-icon-${r.tipo}`}>
                  <TipoIcon tipo={r.tipo} />
                </div>
                <div className="pred-rec-body">
                  <p className="pred-rec-titulo">{r.titulo}</p>
                  <p className="pred-rec-detalle">{r.detalle}</p>
                  <p className="pred-rec-accion">→ {r.accion}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {recomendaciones.length === 0 && predictions.length > 0 && (
        <div className="pred-no-alerts" style={{ marginBottom: "1.5rem" }}>
          <CheckCircle size={32} className="pred-trend-up" />
          <p style={{ fontWeight: 600 }}>Todo en orden por ahora</p>
          <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
            No hay acciones urgentes. Revisa el inventario regularmente.
          </p>
        </div>
      )}

      {/* Gráfico semanal */}
      {weeklyChart.length > 0 && (
        <div className="dash-card">
          <div className="dash-card-header">
            <div>
              <p className="dash-card-kicker">Ventas semanales</p>
              <h2 className="dash-card-title">¿Cuánto se ha vendido últimamente?</h2>
            </div>
          </div>
          <WeeklyChart data={weeklyChart} />
        </div>
      )}

      {/* Tabla de productos */}
      {predictions.length > 0 && (
        <div className="dash-card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="dash-card-header" style={{ padding: "1.25rem 1.5rem 0.75rem" }}>
            <div>
              <p className="dash-card-kicker">Estado del inventario</p>
              <h2 className="dash-card-title">¿Cómo está cada producto?</h2>
            </div>
            <div className="pred-search-wrap">
              <Search size={15} className="pred-search-icon" />
              <input
                type="text"
                className="pred-search-input"
                placeholder="Buscar por código..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          {porOrden.length === 0 ? (
            <p className="admin-empty" style={{ padding: "2rem" }}>
              No hay productos que coincidan con "{search}".
            </p>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table pred-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Proyección ({horizon} días)</th>
                    <th>Por semana</th>
                    <th>Stock actual</th>
                    <th>Stock dura aprox.</th>
                    <th>Demanda</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {porOrden.map((p) => (
                    <tr key={p.productId} className={!p.sin_historial && (p.stock_actual === 0 || p.dias_hasta_agotarse < 7) ? "pred-row-alert" : ""}>
                      <td>
                        {p.codigo && <p className="pred-product-code">{p.codigo}</p>}
                        <p className="pred-product-name">{p.nombre}</p>
                        <p className="pred-product-cat">{p.categoria}</p>
                      </td>
                      <td>
                        {p.sin_historial ? (
                          <span className="pred-sub">—</span>
                        ) : (
                          <>
                            <strong className="pred-value">{p.prediccion_unidades}</strong>
                            <span className="pred-sub"> uds.</span>
                          </>
                        )}
                      </td>
                      <td>
                        {p.sin_historial ? (
                          <span className="pred-sub">—</span>
                        ) : (
                          <>
                            <strong>{p.prediccion_semanal}</strong>
                            <span className="pred-sub"> uds./sem</span>
                          </>
                        )}
                      </td>
                      <td>
                        <span className={`pred-stock-badge ${p.stock_actual === 0 ? "out" : p.alerta_stock ? "low" : "ok"}`}>
                          {p.stock_actual} uds.
                        </span>
                      </td>
                      <td>
                        <DuracionTexto p={p} />
                      </td>
                      <td>
                        {p.sin_historial ? (
                          <span className="pred-sub">—</span>
                        ) : (
                          <TendenciaCell t={p.tendencia} />
                        )}
                      </td>
                      <td>
                        <EstadoBadge p={p} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {predictions.length === 0 && (
        <div className="pred-no-alerts">
          <Package size={32} />
          <p>Aún no hay productos registrados para analizar.</p>
        </div>
      )}
    </div>
  );
}
