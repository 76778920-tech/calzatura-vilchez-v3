import { AlertTriangle, Brain, RefreshCw } from "lucide-react";
import type { AdminPredictionsModelState } from "./useAdminPredictionsModel";
import { ALERT_OPTIONS, HISTORY_OPTIONS, HORIZON_OPTIONS } from "./adminPredictionsLogic";
import { predictionTabPanels } from "./predictionTabRegistry";

export function AdminPredictionsDashboard(props: AdminPredictionsModelState) {
  const {
    aiWarnings,
    activeTab,
    alertDays,
    campanaData,
    changeTab,
    enRiesgo,
    history,
    horizon,
    refreshPredictions,
    setAlertDays,
    setHistory,
    setHorizon,
  } = props;

  const TabPanel = predictionTabPanels[activeTab];

  return (
    <div className="pred-root">

      {/* ── Advertencias del modelo ─────────────────────────── */}
      {aiWarnings.length > 0 && (
        <div className="pred-warnings-banner" role="alert">
          <AlertTriangle size={16} aria-hidden="true" />
          <ul className="pred-warnings-list">
            {aiWarnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      {/* ── Cabecera ────────────────────────────────────────── */}
      <div className="dash-header">
        <div>
          <p className="dash-greeting">Panel de decisiones</p>
          <h1 className="dash-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Brain size={26} /> Inteligencia Artificial
          </h1>
          <p className="pred-header-note">
            El horizonte define la proyección financiera y de demanda. El umbral de alerta controla qué productos se marcan en riesgo, independientemente del horizonte.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.4rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>Horizonte:</span>
            {HORIZON_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                className={`pred-horizon-btn ${horizon === option ? "active" : ""}`}
                onClick={() => setHorizon(option)}
              >
                {option} días
              </button>
            ))}
            <button type="button" className="btn btn-ghost pred-refresh" onClick={() => {
              refreshPredictions().catch(() => undefined);
            }}>
              <RefreshCw size={15} />
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Historial modelo:</span>
            {HISTORY_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                className={`pred-horizon-btn pred-horizon-btn-sm ${history === option ? "active" : ""}`}
                onClick={() => setHistory(option)}
              >
                {option}d
              </button>
            ))}
            <span style={{ fontSize: "12px", color: "var(--text-muted)", marginLeft: "0.5rem" }}>Alerta stock:</span>
            {ALERT_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                className={`pred-horizon-btn pred-horizon-btn-sm ${alertDays === option ? "active" : ""}`}
                onClick={() => setAlertDays(option)}
              >
                {option}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Navegación por pestañas ────────────────────────── */}
      <nav className="pred-tabs" role="tablist" aria-label="Secciones del panel">
        <button type="button" role="tab" aria-selected={activeTab === "resumen"} className={`pred-tab ${activeTab === "resumen" ? "active" : ""}`} onClick={() => changeTab("resumen")}>
          Resumen
          {enRiesgo > 0 && <span className="pred-tab-count pred-tab-count-alert">{enRiesgo}</span>}
        </button>
        <button type="button" role="tab" aria-selected={activeTab === "ire"} className={`pred-tab ${activeTab === "ire" ? "active" : ""}`} onClick={() => changeTab("ire")}>
          Detalle IRE
        </button>
        <button type="button" role="tab" aria-selected={activeTab === "ventas"} className={`pred-tab ${activeTab === "ventas" ? "active" : ""}`} onClick={() => changeTab("ventas")}>
          Ventas e inventario
        </button>
        <button type="button" role="tab" aria-selected={activeTab === "finanzas"} className={`pred-tab ${activeTab === "finanzas" ? "active" : ""}`} onClick={() => changeTab("finanzas")}>
          Finanzas
        </button>
        <button type="button" role="tab" aria-selected={activeTab === "ranking"} className={`pred-tab ${activeTab === "ranking" ? "active" : ""}`} onClick={() => changeTab("ranking")}>
          Ranking
        </button>
        <button type="button" role="tab" aria-selected={activeTab === "modelo"} className={`pred-tab ${activeTab === "modelo" ? "active" : ""}`} onClick={() => changeTab("modelo")}>
          Modelo IA
        </button>
        <button type="button" role="tab" aria-selected={activeTab === "asistente"} className={`pred-tab ${activeTab === "asistente" ? "active" : ""}`} onClick={() => changeTab("asistente")}>
          Asistente
        </button>
        <button type="button" role="tab" aria-selected={activeTab === "campanas"} className={`pred-tab ${activeTab === "campanas" ? "active" : ""}`} onClick={() => changeTab("campanas")}>
          Campañas IA
          {campanaData?.activa && (
            <span className="pred-tab-count pred-tab-count-alert">!</span>
          )}
        </button>
      </nav>

      {TabPanel ? <TabPanel {...props} /> : null}
    </div>
  );
}
