import {
  AlertTriangle,
  Brain,
  CheckCircle,
  CircleDollarSign,
  Download,
  Minus,
  Package,
  RefreshCw,
  Search,
  Store,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import { PromptInputBox } from "@/components/ui/ai-prompt-box";
import type { AdminPredictionsModelState } from "./useAdminPredictionsModel";
import { shouldMaskPredictionMetrics } from "./predictionDataQuality";
import type { LearningStatsUmbrales } from "./adminPredictionsLogic";
import {
  AnimatedKpi,
  CampanasPanelBody,
  DemandAccuracyChart,
  DriftBadge,
  DuracionTexto,
  EstadoBadge,
  FEATURE_LABELS,
  FeatureImportanceChart,
  FinanzasRiesgoPanel,
  IRE_DIM_CONFIG,
  IRE_INDICATOR_LABELS,
  IRE_NIVEL_LABELS,
  IreHistoryPanel,
  IreProyectadoDeltaBadge,
  IreSparkline,
  PredictionsRankingTabPanel,
  RevenueLineChart,
  RiskAlertCard,
  TendenciaCell,
  TipoIcon,
  WeeklyChart,
  exportPredictionsCSV,
  formatConfidenceLabel,
  formatCurrency,
  formatPercent,
  formatTrendLabel,
  formatUnits,
} from "./adminPredictionsLogic";

export function PredictionsResumenTabPanel(props: AdminPredictionsModelState) {
  const {
    tabDirection,
    ireData,
    ireHistorial,
    ireProyectado,
    horizon,
    resumenEjecutivo,
    revenueSummary,
    enRiesgo,
    conHistorial,
    sinHistorial,
    productoMotor,
    altaDemanda,
    predictions,
    sinStock,
    alertDays,
    riskAlerts,
    changeTab,
    recomendaciones,
    tallaResidual,
  } = props;
  return (
        <motion.div
          key="tab-resumen"
          className="pred-tab-panel"
          initial={{ opacity: 0, x: tabDirection >= 0 ? 54 : -54, y: 18, filter: "blur(8px)" }}
          animate={{ opacity: 1, x: 0, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.38, ease: "easeOut" }}
        >
          {/* IRE hero */}
          {ireData && (
            <motion.div
              className={`ire-hero ire-hero-${ireData.sin_datos ? "bajo" : ireData.nivel}`}
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              <div className="ire-left">
                <div className="ire-label">Índice de Riesgo Empresarial</div>
                {ireData.sin_datos ? (
                  <>
                    <div className="ire-score-row">
                      <span className="ire-score" style={{ opacity: 0.35 }}>—</span>
                      <span className="ire-nivel ire-nivel-bajo" style={{ marginLeft: "0.5rem" }}>Sin datos</span>
                    </div>
                    <p className="ire-desc">
                      No hay productos con historial de ventas suficiente para calcular el IRE.
                      El índice se activará automáticamente cuando existan registros de demanda.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="ire-score-row">
                      <span className="ire-score">{ireData.score}</span>
                      <span className="ire-score-max">/100</span>
                      <span className={`ire-nivel ire-nivel-${ireData.nivel}`}>
                        {IRE_NIVEL_LABELS[ireData.nivel] ?? ireData.nivel}
                      </span>
                    </div>
                    <p className="ire-desc">{ireData.descripcion}</p>
                  </>
                )}
              </div>
              {!ireData.sin_datos && (
                <div className="ire-dims">
                  {IRE_DIM_CONFIG.map(({ key, label }) => {
                    const val = ireData.dimensiones[key];
                    const peso = ireData.pesos[key];
                    const pesoLabel = `${label} ${Math.round(peso * 100)}%`;
                    let dimLevel = "bajo";
                    if (val >= 75) dimLevel = "critico";
                    else if (val >= 50) dimLevel = "alto";
                    else if (val >= 25) dimLevel = "moderado";
                    return (
                    <div key={key} className="ire-dim">
                      <div className="ire-dim-label">{pesoLabel}</div>
                      <div className="ire-dim-bar-bg">
                        <div
                          className={`ire-dim-bar ire-dim-bar-${dimLevel}`}
                          style={{ width: `${val}%` }}
                        />
                      </div>
                      <div className="ire-dim-val">{val}</div>
                    </div>
                    );
                  })}
                </div>
              )}
              {!ireData.sin_datos && ireHistorial.length >= 2 && (
                <IreSparkline data={ireHistorial} />
              )}
            </motion.div>
          )}

          {/* IRE proyectado */}
          {ireProyectado && ireData && (
            <motion.div
              className={`ire-proyectado-card ire-proyectado-${ireProyectado.nivel}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.12 }}
            >
              <div className="ire-proy-header">
                <span className="ire-proy-label">IRE proyectado a {horizon} días</span>
                <span className={`ire-proy-nivel ire-nivel-${ireProyectado.nivel}`}>
                  {IRE_NIVEL_LABELS[ireProyectado.nivel] ?? ireProyectado.nivel}
                </span>
              </div>
              <div className="ire-proy-body">
                <span className="ire-proy-score">{ireProyectado.score}</span>
                <span className="ire-proy-score-max">/100</span>
                <IreProyectadoDeltaBadge projectedScore={ireProyectado.score} actualScore={ireData.score} />
              </div>
              <p className="ire-proy-desc">{ireProyectado.descripcion}</p>
            </motion.div>
          )}

          <div className="pred-summary-grid">
        <motion.article className="pred-summary-card pred-summary-hero" initial={{ opacity: 0, y: 20, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.34, delay: 0, ease: "easeOut" } }} whileHover={{ y: -10, scale: 1.01 }}>
          <p className="pred-summary-kicker">Resumen ejecutivo</p>
          <h2 className="pred-summary-title">{resumenEjecutivo.titular}</h2>
          <p className="pred-summary-body">{resumenEjecutivo.detalle}</p>
          <div className="pred-summary-badges">
            <span className="pred-summary-badge">Horizonte: {horizon} días</span>
            <span className="pred-summary-badge">Con historial: {conHistorial}</span>
            <span className="pred-summary-badge">Sin historial: {sinHistorial}</span>
          </div>
        </motion.article>

        <motion.article className="pred-summary-card" initial={{ opacity: 0, y: 20, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.34, delay: 0.045, ease: "easeOut" } }} whileHover={{ y: -10, scale: 1.01 }}>
          <p className="pred-summary-label">Ingreso esperado</p>
          <strong className="pred-summary-number">
            {revenueSummary ? formatCurrency(revenueSummary.proximo_horizonte) : "Pendiente"}
          </strong>
          <p className="pred-summary-copy">{resumenEjecutivo.lecturaFinanciera}</p>
        </motion.article>

        <motion.article className="pred-summary-card" initial={{ opacity: 0, y: 20, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.34, delay: 0.09, ease: "easeOut" } }} whileHover={{ y: -10, scale: 1.01 }}>
          <p className="pred-summary-label">Foco de inventario</p>
          <strong className="pred-summary-number">{enRiesgo} en riesgo</strong>
          <p className="pred-summary-copy">{resumenEjecutivo.lecturaInventario}</p>
        </motion.article>

        <motion.article className="pred-summary-card" initial={{ opacity: 0, y: 20, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.34, delay: 0.135, ease: "easeOut" } }} whileHover={{ y: -10, scale: 1.01 }}>
          <p className="pred-summary-label">Producto motor</p>
          <strong className="pred-summary-number">{productoMotor?.codigo || productoMotor?.nombre || "Sin definir"}</strong>
          <p className="pred-summary-copy">{resumenEjecutivo.lecturaPortafolio}</p>
        </motion.article>
      </div>


          <div className="pred-kpi-row">
            <motion.div className={`pred-kpi-card ${enRiesgo > 0 ? "pred-kpi-alert" : ""}`} initial={{ opacity: 0, y: 20, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.34, delay: 0.18, ease: "easeOut" } }} whileHover={{ y: -8, scale: 1.015 }}>
          <AlertTriangle size={20} />
          <div>
            <p className="pred-kpi-label">En riesgo (≤ {alertDays} días)</p>
            <p className="pred-kpi-value">{enRiesgo}</p>
            <p className="pred-kpi-sub">{enRiesgo === 0 ? "Sin alertas fuertes" : `stock corto (umbral ${alertDays} días)`}</p>
          </div>
        </motion.div>
        <motion.div className={`pred-kpi-card ${sinStock > 0 ? "pred-kpi-alert" : ""}`} initial={{ opacity: 0, y: 20, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.34, delay: 0.225, ease: "easeOut" } }} whileHover={{ y: -8, scale: 1.015 }}>
          <Package size={20} />
          <div>
            <p className="pred-kpi-label">Productos sin stock</p>
            <p className="pred-kpi-value">{sinStock}</p>
            <p className="pred-kpi-sub">{sinStock === 0 ? "Catálogo disponible" : "ya agotados"}</p>
          </div>
        </motion.div>
        <motion.div className="pred-kpi-card pred-kpi-gold" initial={{ opacity: 0, y: 20, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.34, delay: 0.27, ease: "easeOut" } }} whileHover={{ y: -8, scale: 1.015 }}>
          <TrendingUp size={20} />
          <div>
            <p className="pred-kpi-label">Alta demanda</p>
            <p className="pred-kpi-value">{altaDemanda}</p>
            <p className="pred-kpi-sub">productos con rotación fuerte</p>
          </div>
        </motion.div>
        <motion.div className="pred-kpi-card" initial={{ opacity: 0, y: 20, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.34, delay: 0.315, ease: "easeOut" } }} whileHover={{ y: -8, scale: 1.015 }}>
          <Package size={20} />
          <div>
            <p className="pred-kpi-label">Total productos</p>
            <p className="pred-kpi-value">{predictions.length}</p>
            <p className="pred-kpi-sub">analizados en catálogo</p>
          </div>
        </motion.div>
        {tallaResidual > 0 && (
          <motion.div className="pred-kpi-card pred-kpi-alert" initial={{ opacity: 0, y: 20, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.34, delay: 0.36, ease: "easeOut" } }} whileHover={{ y: -8, scale: 1.015 }}>
            <AlertTriangle size={20} />
            <div>
              <p className="pred-kpi-label">Talla residual</p>
              <p className="pred-kpi-value">{tallaResidual}</p>
              <p className="pred-kpi-sub">solo tallas extremas en stock</p>
            </div>
          </motion.div>
        )}
      </div>

      <div className="pred-section-grid">
        <div className="dash-card">
          <div className="dash-card-header">
            <div>
              <p className="dash-card-kicker">Prioridad inmediata</p>
              <h2 className="dash-card-title">Productos en riesgo — umbral {alertDays} días</h2>
            </div>
          </div>
          {riskAlerts.length > 0 ? (
            <>
              <div className="pred-alerts-grid">
                {riskAlerts.map((prediction) => (
                  <RiskAlertCard key={prediction.productId} prediction={prediction} />
                ))}
              </div>
              {enRiesgo > riskAlerts.length && (
                <button
                  type="button"
                  className="pred-ver-todos-btn"
                  onClick={() => changeTab("ventas")}
                >
                  Ver todos los productos en alerta ({enRiesgo}) →
                </button>
              )}
            </>
          ) : (
            <div className="pred-empty-card">
              <CheckCircle size={28} className="pred-trend-up" />
              <p className="pred-empty-title">Sin alertas fuertes por ahora</p>
              <p className="pred-empty-copy">
                No hay productos con cobertura corta dentro del umbral de alerta de {alertDays} días.
              </p>
            </div>
          )}
        </div>

        <div className="dash-card">
          <div className="dash-card-header">
            <div>
              <p className="dash-card-kicker">Lo que debes hacer ahora</p>
              <h2 className="dash-card-title">Recomendaciones automáticas priorizadas</h2>
              <p className="pred-sub" style={{ marginTop: "0.35rem" }}>
                Generadas por reglas de decisión sobre stock, demanda, tendencia y horizonte de agotamiento para apoyar compras, reposición y control de sobrestock.
              </p>
            </div>
          </div>
          {recomendaciones.length > 0 ? (
            <div className="pred-recs-list">
              {recomendaciones.map((recommendation) => (
                <div key={recommendation.productId + recommendation.tipo} className={`pred-rec-item pred-rec-${recommendation.tipo}`}>
                  <div className={`pred-rec-icon pred-rec-icon-${recommendation.tipo}`}>
                    <TipoIcon tipo={recommendation.tipo} />
                  </div>
                  <div className="pred-rec-body">
                    <p className="pred-rec-titulo">{recommendation.titulo}</p>
                    <p className="pred-rec-detalle">{recommendation.detalle}</p>
                    <p className="pred-rec-accion">→ {recommendation.accion}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="pred-empty-card">
              <CheckCircle size={28} className="pred-trend-up" />
              <p className="pred-empty-title">No hay acciones urgentes</p>
              <p className="pred-empty-copy">
                El panel no detecta decisiones de reposición inmediatas para este horizonte. Conviene seguir comparando lo proyectado con lo real.
              </p>
            </div>
          )}
        </div>
      </div>

          {/* Lectura ejecutiva condensada */}
          <div className="dash-card">
            <div className="pred-reading-cols">
              <div>
                <p className="pred-summary-kicker">Situación del inventario</p>
                <p className="pred-reading-text">{resumenEjecutivo.lecturaInventario}</p>
              </div>
              {revenueSummary && (
                <div>
                  <p className="pred-summary-kicker">Proyección financiera</p>
                  <p className="pred-reading-text">{resumenEjecutivo.lecturaFinanciera}</p>
                </div>
              )}
              <div>
                <p className="pred-summary-kicker">Qué hacer ahora</p>
                <p className="pred-reading-text">{resumenEjecutivo.recomendacion}</p>
              </div>
            </div>
          </div>
        </motion.div>
  );
}

export function PredictionsIreTabPanel(props: AdminPredictionsModelState) {
  const {
    tabDirection,
    ireData,
    ireHistorial,
  } = props;
  return (
        <motion.div
          key="tab-ire"
          className="pred-tab-panel"
          initial={{ opacity: 0, x: tabDirection >= 0 ? 54 : -54, y: 18, filter: "blur(8px)" }}
          animate={{ opacity: 1, x: 0, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.38, ease: "easeOut" }}
        >
          {ireData?.variables?.length ? (
            <>
              <motion.section
                className="ire-variable-panel"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.08 }}
              >
                <div className="ire-variable-head">
                  <div>
                    <p className="ire-variable-kicker">Definición del IRE</p>
                    <h3 className="ire-variable-title">Variables del riesgo empresarial</h3>
                  </div>
                  <div className="ire-formula-wrap">
                    {ireData.version && <span className="ire-version">v{ireData.version}</span>}
                    {ireData.formula && <code className="ire-formula">{ireData.formula}</code>}
                  </div>
                </div>
                {ireData.definicion && <p className="ire-variable-def">{ireData.definicion}</p>}
                <div className="ire-variable-grid">
                  {ireData.variables.map((variable) => (
                    <article key={variable.codigo} className="ire-variable-card">
                      <div className="ire-variable-top">
                        <span className="ire-variable-name">{variable.nombre}</span>
                        <span className="ire-variable-weight">{Math.round(variable.peso * 100)}%</span>
                      </div>
                      <div className="ire-variable-score-row">
                        <span className="ire-variable-score">{variable.valor}</span>
                        <span className="ire-variable-impact">aporta {variable.contribucion_score} pts</span>
                      </div>
                      <p className="ire-variable-copy">{variable.descripcion}</p>
                      <p className="ire-variable-source">{variable.fuente}</p>
                      <div className="ire-variable-tags">
                        {variable.indicadores.map((indicador) => (
                          <span key={indicador}>{IRE_INDICATOR_LABELS[indicador] ?? indicador}</span>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              </motion.section>
              <IreHistoryPanel data={ireHistorial} />
            </>
          ) : (
            <div className="pred-empty-card">
              <Brain size={28} />
              <p className="pred-empty-title">Sin detalle del IRE todavía</p>
              <p className="pred-empty-copy">
                Ejecuta una predicción para ver la definición, fórmula, variables y aportes del Índice de Riesgo Empresarial.
              </p>
            </div>
          )}
        </motion.div>
  );
}

export function PredictionsVentasTabPanel(props: AdminPredictionsModelState) {
  const {
    tabDirection,
    weeklyChartLoading,
    weeklyChart,
    distribucionInventario,
    predictions,
    horizon,
    alertDays,
    search,
    setSearch,
    porOrden,
    predictionDataSufficient,
  } = props;
  return (
        <motion.div
          key="tab-ventas"
          className="pred-tab-panel"
          initial={{ opacity: 0, x: tabDirection >= 0 ? 54 : -54, y: 18, filter: "blur(8px)" }}
          animate={{ opacity: 1, x: 0, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.38, ease: "easeOut" }}
        >
          <div className="pred-section-grid">
            <div className="dash-card">
              <div className="dash-card-header">
                <div>
                  <p className="dash-card-kicker">Ventas semanales</p>
                  <h2 className="dash-card-title">Cómo se está moviendo la venta</h2>
                </div>
              </div>
              {weeklyChartLoading ? (
                <div className="pred-lazy-loading">
                  <div className="success-spinner" />
                  <span>Cargando historial de ventas...</span>
                </div>
              ) : weeklyChart.length > 0 ? (
                <WeeklyChart data={weeklyChart} />
              ) : (
                <div className="pred-empty-card">
                  <p className="pred-empty-copy">No hay datos de ventas semanales disponibles.</p>
                </div>
              )}
            </div>

            <div className="dash-card">
              <div className="dash-card-header">
                <div>
                  <p className="dash-card-kicker">Lectura operativa</p>
                  <h2 className="dash-card-title">Distribución del inventario analizado</h2>
                </div>
              </div>
              <div className="dash-status-list">
                {distribucionInventario.map((item) => (
                  <div key={item.label} className="dash-status-row">
                    <span className="dash-status-dot" style={{ background: item.color }} />
                    <span className="dash-status-name">{item.label}</span>
                    <div className="dash-status-bar-track">
                      <div className="dash-status-bar-fill" style={{ width: item.width, background: item.color }} />
                    </div>
                    <span className="dash-status-count">{item.count}</span>
                  </div>
                ))}
              </div>
              <p className="pred-side-note">
                Esta lectura ayuda a gerencia, contabilidad y junta directiva a ver cuánta presión real existe en el inventario antes de revisar producto por producto.
              </p>
            </div>
          </div>

      {predictions.length > 0 && (
        <div className="dash-card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="dash-card-header" style={{ padding: "1.25rem 1.5rem 0.75rem" }}>
            <div>
              <p className="dash-card-kicker">Estado del inventario</p>
              <h2 className="dash-card-title">Cómo está cada producto</h2>
              <p className="pred-section-note">
                La proyección ({horizon} días) y el umbral de alerta ({alertDays} días) se configuran en la parte superior del panel.
              </p>
            </div>
            <div className="pred-table-controls">
              <div className="pred-search-wrap">
                <Search size={15} className="pred-search-icon" />
                <input
                  type="text"
                  className="pred-search-input"
                  placeholder="Buscar por código o nombre..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <button
                type="button"
                className="pred-export-btn"
                onClick={() => exportPredictionsCSV(porOrden, horizon)}
                title="Descargar tabla como CSV (compatible con Excel)"
              >
                <Download size={14} />
                CSV
              </button>
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
                    <th>Cobertura / Quiebre</th>
                    <th>Demanda</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {porOrden.map((prediction) => {
                    const stockBadgeClass = prediction.stock_actual === 0
                      ? "out"
                      : prediction.alerta_stock || prediction.nivel_riesgo !== "estable"
                        ? "low"
                        : "ok";

                    return (
                      <tr
                        key={prediction.productId}
                        className={!prediction.sin_historial && (prediction.alerta_stock || prediction.nivel_riesgo === "critico") ? "pred-row-alert" : ""}
                      >
                        <td>
                          {prediction.codigo && <p className="pred-product-code">{prediction.codigo}</p>}
                          <p className="pred-product-name">{prediction.nombre}</p>
                          <p className="pred-product-cat">{prediction.categoria}</p>
                          {prediction.talla_residual && (
                            <span className="pred-talla-residual-badge">talla residual</span>
                          )}
                          <DriftBadge score={prediction.drift_score} />
                        </td>
                        <td>
                          {prediction.sin_historial ? (
                            <span className="pred-sub">-</span>
                          ) : shouldMaskPredictionMetrics(predictionDataSufficient, prediction) ? (
                            <span className="pred-sub" title="Datos históricos insuficientes">—</span>
                          ) : (
                            <>
                              <strong className="pred-value">{formatUnits(prediction.prediccion_unidades)}</strong>
                              <span className="pred-sub"> uds.</span>
                            </>
                          )}
                        </td>
                        <td>
                          {prediction.sin_historial ? (
                            <span className="pred-sub">-</span>
                          ) : shouldMaskPredictionMetrics(predictionDataSufficient, prediction) ? (
                            <span className="pred-sub" title="Datos históricos insuficientes">—</span>
                          ) : (
                            <>
                              <strong>{formatUnits(prediction.prediccion_semanal)}</strong>
                              <span className="pred-sub"> uds./sem</span>
                            </>
                          )}
                        </td>
                        <td>
                          <span className={`pred-stock-badge ${stockBadgeClass}`}>
                            {prediction.stock_actual} uds.
                          </span>
                          {prediction.sell_through_pct != null && (
                            <p className="pred-sub">{prediction.sell_through_pct.toFixed(0)}% vendido</p>
                          )}
                        </td>
                        <td>
                          <DuracionTexto p={prediction} />
                          {!prediction.sin_historial && prediction.fecha_quiebre_stock && (
                            <div className={`quiebre-date${prediction.dias_hasta_agotarse <= 7 ? "" : " quiebre-date-warn"}`}>
                              📅 {prediction.fecha_quiebre_stock}
                            </div>
                          )}
                        </td>
                        <td>
                          {prediction.sin_historial ? (
                            <span className="pred-sub">-</span>
                          ) : shouldMaskPredictionMetrics(predictionDataSufficient, prediction) ? (
                            <span className="pred-sub">Datos insuficientes</span>
                          ) : (
                            <div className="pred-cell-stack">
                              <TendenciaCell t={prediction.tendencia} />
                              <span className="pred-sub">
                                {formatUnits(prediction.consumo_estimado_diario)} uds./dia
                                {prediction.alta_demanda ? " · alta demanda" : ""}
                              </span>
                            </div>
                          )}
                        </td>
                        <td>
                          <EstadoBadge p={prediction} />
                        </td>
                      </tr>
                    );
                  })}
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
        </motion.div>
  );
}

export function PredictionsFinanzasTabPanel(props: AdminPredictionsModelState) {
  const {
    tabDirection,
    revenueLoading,
    normalizedRevenueForecast,
    revenueSummary,
    resumenEjecutivo,
    refreshPredictions,
    predictionsForView,
  } = props;
  return (
        <motion.div
          key="tab-finanzas"
          className="pred-tab-panel"
          initial={{ opacity: 0, x: tabDirection >= 0 ? 54 : -54, y: 18, filter: "blur(8px)" }}
          animate={{ opacity: 1, x: 0, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.38, ease: "easeOut" }}
        >
          {revenueLoading && !normalizedRevenueForecast ? (
            <div className="pred-lazy-loading">
              <div className="success-spinner" />
              <span>Calculando proyección de ingresos...</span>
            </div>
          ) : revenueSummary && normalizedRevenueForecast ? (
            <div className="dash-card">
              <div className="dash-card-header">
                <div>
                  <p className="dash-card-kicker">Planificación financiera</p>
                  <h2 className="dash-card-title">Predicción de ingresos futuros</h2>
                </div>
                <div className="pred-revenue-trend">
                  {revenueSummary.tendencia === "subiendo" && <TrendingUp size={16} className="pred-trend-up" />}
                  {revenueSummary.tendencia === "bajando" && <TrendingDown size={16} className="pred-trend-down" />}
                  {revenueSummary.tendencia === "estable" && <Minus size={16} className="pred-trend-stable" />}
                  <span>{formatTrendLabel(revenueSummary.tendencia)}</span>
                </div>
              </div>
              <div className="pred-revenue-grid">
                <div className="pred-revenue-card pred-revenue-primary">
                  <CircleDollarSign size={20} />
                  <div>
                    <p className="pred-kpi-label">Próxima semana</p>
                    <AnimatedKpi value={revenueSummary.proximo_7_dias} format={formatCurrency} />
                    <p className="pred-kpi-sub">ingreso estimado en 7 días</p>
                  </div>
                </div>
                <div className="pred-revenue-card">
                  <CircleDollarSign size={20} />
                  <div>
                    <p className="pred-kpi-label">Horizonte actual</p>
                    <AnimatedKpi value={revenueSummary.proximo_horizonte} format={formatCurrency} />
                    <p className="pred-kpi-sub">ingreso estimado en {normalizedRevenueForecast.horizon_days} días</p>
                  </div>
                </div>
                <div className={`pred-revenue-card ${revenueSummary.crecimiento_estimado_horizonte_pct >= 0 ? "pred-revenue-positive" : "pred-revenue-negative"}`}>
                  <TrendingUp size={20} />
                  <div>
                    <p className="pred-kpi-label">Vs. último horizonte</p>
                    <AnimatedKpi value={revenueSummary.crecimiento_estimado_horizonte_pct} format={formatPercent} />
                    <p className="pred-kpi-sub">comparado con los últimos {normalizedRevenueForecast.horizon_days} días</p>
                  </div>
                </div>
                <div className="pred-revenue-card">
                  <Brain size={20} />
                  <div>
                    <p className="pred-kpi-label">Confianza</p>
                    <AnimatedKpi value={revenueSummary.confianza} format={(v) => `${Math.round(v)}%`} />
                    <p className="pred-kpi-sub">basada en historial y estabilidad</p>
                  </div>
                </div>
              </div>
              <div className="pred-revenue-metrics">
                <div>
                  <span className="pred-sub">Promedio diario histórico</span>
                  <strong>{formatCurrency(revenueSummary.promedio_diario_historico)}</strong>
                </div>
                <div>
                  <span className="pred-sub">Promedio diario proyectado</span>
                  <strong>{formatCurrency(revenueSummary.promedio_diario_proyectado)}</strong>
                </div>
                <div>
                  <span className="pred-sub">Últimos {normalizedRevenueForecast.horizon_days} días</span>
                  <strong>{formatCurrency(revenueSummary.ultimo_horizonte)}</strong>
                </div>
                {revenueSummary.total_historico_tienda != null && (
                  <div>
                    <span className="pred-sub" style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <Store size={12} /> Tienda ({normalizedRevenueForecast.history_days} días)
                    </span>
                    <strong>{formatCurrency(revenueSummary.total_historico_tienda)}</strong>
                  </div>
                )}
                {revenueSummary.total_historico_web != null && (
                  <div>
                    <span className="pred-sub">Web / Stripe ({normalizedRevenueForecast.history_days} días)</span>
                    <strong>{formatCurrency(revenueSummary.total_historico_web)}</strong>
                  </div>
                )}
              </div>
              <div className="pred-explainer-grid">
                <article className="pred-explainer-card">
                  <p className="pred-explainer-label">Qué está pasando</p>
                  <p className="pred-explainer-copy">{resumenEjecutivo.lecturaFinanciera}</p>
                </article>
                <article className="pred-explainer-card">
                  <p className="pred-explainer-label">Qué significa</p>
                  <p className="pred-explainer-copy">
                    El promedio proyectado es {formatCurrency(revenueSummary.promedio_diario_proyectado)} por día y la confianza del modelo es {formatConfidenceLabel(revenueSummary.confianza).toLowerCase()}.
                  </p>
                </article>
                <article className="pred-explainer-card">
                  <p className="pred-explainer-label">Qué recomiendo hacer</p>
                  <p className="pred-explainer-copy">{resumenEjecutivo.recomendacion}</p>
                </article>
              </div>
              <RevenueLineChart history={normalizedRevenueForecast.history} forecast={normalizedRevenueForecast.forecast} />
            </div>
          ) : (
            <div className="pred-error-card">
              <CircleDollarSign size={32} />
              <h3>Proyección financiera no disponible</h3>
              <p>No hay datos de ingresos para este horizonte. El servicio de IA podría estar actualizándose o falta historial suficiente.</p>
              <button type="button" className="btn btn-primary" onClick={() => {
          refreshPredictions().catch(() => undefined);
        }}>
                <RefreshCw size={15} /> Reintentar
              </button>
            </div>
          )}

          {/* ── Riesgo Financiero ─────────────────────────── */}
          <FinanzasRiesgoPanel predictionsForView={predictionsForView} revenueSummary={revenueSummary} />
        </motion.div>
  );
}

export function PredictionsRankingTabPanelWrapper(props: AdminPredictionsModelState) {
  const {
    predictions,
    rankingPeriod,
    setRankingPeriod,
    abcData,
    tabDirection,
  } = props;
  return (
        <PredictionsRankingTabPanel
          predictions={predictions}
          rankingPeriod={rankingPeriod}
          setRankingPeriod={setRankingPeriod}
          abcData={abcData}
          tabDirection={tabDirection}
        />
  );
}

export function PredictionsModeloTabPanel(props: AdminPredictionsModelState) {
  const {
    tabDirection,
    modeloMeta,
    predictionsForView,
    modelMetricsFetched,
    modelMetricsLoading,
    modelMetrics,
  } = props;
  return (
        <motion.div
          key="tab-modelo"
          className="pred-tab-panel"
          initial={{ opacity: 0, x: tabDirection >= 0 ? 54 : -54, y: 18, filter: "blur(8px)" }}
          animate={{ opacity: 1, x: 0, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.38, ease: "easeOut" }}
        >
          {modeloMeta ? (
            <div className="dash-card">
              <div className="dash-card-header">
                <div>
                  <p className="dash-card-kicker">Reproducibilidad · Explicabilidad · Monitoreo</p>
                  <h2 className="dash-card-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Brain size={20} /> Modelo IA — Detalles técnicos
                  </h2>
                </div>
              </div>
              <div className="pred-model-panel">
                <div className="pred-model-meta-grid">
                  <div className="pred-model-meta-item">
                    <span className="pred-sub">Tipo de modelo</span>
                    <strong>{modeloMeta.model_type === "random_forest" ? "RandomForestRegressor" : "Promedio Móvil (fallback)"}</strong>
                  </div>
                  <div className="pred-model-meta-item">
                    <span className="pred-sub">Muestras de entrenamiento</span>
                    <strong>{modeloMeta.n_samples.toLocaleString()}</strong>
                  </div>
                  <div className="pred-model-meta-item">
                    <span className="pred-sub">Productos en entrenamiento</span>
                    <strong>{modeloMeta.n_products}</strong>
                  </div>
                  <div className="pred-model-meta-item">
                    <span className="pred-sub">Período de datos</span>
                    <strong>{modeloMeta.date_range_start} → {modeloMeta.date_range_end}</strong>
                  </div>
                  <div className="pred-model-meta-item">
                    <span className="pred-sub">random_state</span>
                    <strong>{modeloMeta.random_state}</strong>
                  </div>
                  <div className="pred-model-meta-item">
                    <span className="pred-sub">scikit-learn</span>
                    <strong>v{modeloMeta.sklearn_version}</strong>
                  </div>
                  <div className="pred-model-meta-item pred-model-meta-hash">
                    <span className="pred-sub">Data fingerprint (MD5)</span>
                    <code>{modeloMeta.data_hash}</code>
                  </div>
                </div>
                {((modeloMeta.seasonality_features?.length ?? 0) > 0 || (modeloMeta.campaign_values?.length ?? 0) > 0) && (
                  <div className="pred-model-section">
                    <h3 className="pred-model-section-title">Temporadas y campañas incorporadas</h3>
                    <p className="pred-sub" style={{ marginBottom: "0.75rem" }}>
                      El modelo considera picos comerciales propios del calzado, como verano, inicio escolar, Fiestas Patrias y Navidad, además de la campaña asignada al producto.
                    </p>
                    <div className="ire-variable-tags">
                      {modeloMeta.seasonality_features?.map((feature) => (
                        <span key={feature}>{FEATURE_LABELS[feature] ?? feature}</span>
                      ))}
                      {modeloMeta.campaign_values?.map((campaign) => (
                        <span key={campaign}>Campaña: {campaign}</span>
                      ))}
                    </div>
                  </div>
                )}
                {modeloMeta.feature_importances.length > 0 && (
                  <div className="pred-model-section">
                    <h3 className="pred-model-section-title">Importancia de variables (Feature Importance)</h3>
                    <p className="pred-sub" style={{ marginBottom: "0.75rem" }}>
                      Cuánto contribuye cada variable a las predicciones del modelo. Mayor porcentaje → mayor influencia.
                    </p>
                    <FeatureImportanceChart importances={modeloMeta.feature_importances} />
                  </div>
                )}
                <div className="pred-model-section">
                  <h3 className="pred-model-section-title">Métricas de precisión visual: predicción vs. ventas reales</h3>
                  <p className="pred-sub" style={{ marginBottom: "0.75rem" }}>
                    Compara las unidades vendidas realmente en los últimos 30 días con la estimación diaria del modelo escalada al mismo período. Esta lectura muestra si la predicción se acerca al comportamiento real observado. El MAPE mide el error porcentual medio absoluto.
                  </p>
                  <DemandAccuracyChart predictions={predictionsForView} />
                </div>

                {Object.keys(modeloMeta.feature_stats).length > 0 && (
                  <div className="pred-model-section">
                    <h3 className="pred-model-section-title">Baseline de drift (distribución de entrenamiento)</h3>
                    <p className="pred-sub" style={{ marginBottom: "0.75rem" }}>
                      Valores medios y desviación estándar de las features de lag durante el entrenamiento. Los productos con drift alto están fuera de este rango.
                    </p>
                    <div className="pred-model-meta-grid">
                      {Object.entries(modeloMeta.feature_stats).map(([feat, stats]) => (
                        <div key={feat} className="pred-model-meta-item">
                          <span className="pred-sub">{FEATURE_LABELS[feat] ?? feat}</span>
                          <strong>μ = {stats.mean.toFixed(3)} · σ = {stats.std.toFixed(3)}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="pred-model-section">
                  <h3 className="pred-model-section-title">Métricas de precisión del modelo (MAE / MAPE)</h3>
                  <p className="pred-sub" style={{ marginBottom: "0.75rem" }}>
                    Evaluación retrospectiva: compara predicciones registradas contra ventas reales cuando el horizonte ya transcurrió. Sirve como evidencia de que el modelo fue evaluado y no solo implementado.
                  </p>
                  {(!modelMetricsFetched || modelMetricsLoading) && (
                    <div className="pred-lazy-loading">
                      <div className="success-spinner" />
                      <span>
                        {modelMetricsLoading ? "Cargando métricas de evaluación…" : "Preparando métricas…"}
                      </span>
                    </div>
                  )}
                  {modelMetricsFetched && modelMetrics === null && (
                    <p className="pred-sub">No se pudieron cargar las métricas de evaluación.</p>
                  )}
                  {modelMetrics?.status === "sin_datos" && (
                    <p className="pred-sub">{modelMetrics.mensaje}</p>
                  )}
                  {modelMetrics?.status === "pendiente" && (
                    <p className="pred-sub">{modelMetrics.mensaje} ({modelMetrics.n_predicciones_en_cola} en cola)</p>
                  )}
                  {modelMetrics?.status === "ok" && (
                    <>
                      <div className="pred-model-meta-grid" style={{ marginBottom: "0.75rem" }}>
                        <div className="pred-model-meta-item">
                          <span className="pred-sub">MAE promedio (uds./día)</span>
                          <strong>{modelMetrics.mae_promedio?.toFixed(3)}</strong>
                        </div>
                        <div className="pred-model-meta-item">
                          <span className="pred-sub">MAPE promedio</span>
                          <strong>{modelMetrics.mape_promedio_pct?.toFixed(1)}%</strong>
                        </div>
                        <div className="pred-model-meta-item">
                          <span className="pred-sub">Períodos evaluados</span>
                          <strong>{modelMetrics.n_evaluaciones}</strong>
                        </div>
                      </div>
                      {modelMetrics.evaluaciones && modelMetrics.evaluaciones.length > 0 && (
                        <table className="admin-table" style={{ fontSize: "12px" }}>
                          <thead>
                            <tr>
                              <th>Período</th>
                              <th>Productos</th>
                              <th>MAE</th>
                              <th>MAPE</th>
                              <th>Modelo</th>
                            </tr>
                          </thead>
                          <tbody>
                            {modelMetrics.evaluaciones.map((ev) => (
                              <tr key={ev.period_start}>
                                <td>{ev.period_start} → {ev.period_end}</td>
                                <td>{ev.n_products}</td>
                                <td>{ev.mae.toFixed(3)}</td>
                                <td>{ev.mape_pct.toFixed(1)}%</td>
                                <td>{ev.model_type}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="pred-error-card">
              <Brain size={32} />
              <h3>Modelo IA no disponible</h3>
              <p>Los metadatos del modelo aún no están disponibles. El servicio de IA podría estar inicializándose.</p>
            </div>
          )}
        </motion.div>
  );
}

export function PredictionsAsistenteTabPanel(props: AdminPredictionsModelState) {
  const {
    tabDirection,
    horizon,
    assistantQuickActions,
    messages,
    assistantQuestionIdeas,
    handleSend,
    aiLoading,
    chatEndRef,
  } = props;
  return (
        <motion.div
          key="tab-asistente"
          className="pred-tab-panel"
          initial={{ opacity: 0, x: tabDirection >= 0 ? 54 : -54, y: 18, filter: "blur(8px)" }}
          animate={{ opacity: 1, x: 0, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.38, ease: "easeOut" }}
        >
          <div className="pred-ai-shell">
            <section className="pred-ai-hero">
              <div className="pred-ai-copy">
                <p className="pred-ai-kicker">Asistente inteligente</p>
                <h2 className="pred-ai-title">
                  <Brain size={22} /> Inteligencia artificial guiada por el panel
                </h2>
                <p className="pred-ai-lead">
                  Consulta inventario, ingresos y prioridades sin salir de esta vista. El asistente toma solo los datos de demanda, riesgo y finanzas que ya ves cargados aquí.
                </p>
                <div className="pred-ai-flags">
                  <span className="pred-ai-flag">Sin búsqueda web</span>
                  <span className="pred-ai-flag">Horizonte activo: {horizon} días</span>
                  <span className="pred-ai-flag">Respuestas para gerencia y operaciones</span>
                </div>
              </div>
              <div className="pred-ai-stats">
                <motion.article className="pred-ai-stat" initial={{ opacity: 0, y: 20, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.34, delay: 0, ease: "easeOut" } }} whileHover={{ y: -10, scale: 1.02, rotateX: -2 }}>
                  <span className="pred-ai-stat-label">Horizonte activo</span>
                  <strong className="pred-ai-stat-value">{horizon} días</strong>
                  <span className="pred-ai-stat-copy">La lectura financiera y de riesgo se ajusta a este tramo.</span>
                </motion.article>
                <motion.article className="pred-ai-stat" initial={{ opacity: 0, y: 20, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.34, delay: 0.045, ease: "easeOut" } }} whileHover={{ y: -10, scale: 1.02, rotateX: -2 }}>
                  <span className="pred-ai-stat-label">Atajos listos</span>
                  <strong className="pred-ai-stat-value">{assistantQuickActions.length}</strong>
                  <span className="pred-ai-stat-copy">Prompts rápidos para reponer, resumir y priorizar.</span>
                </motion.article>
                <motion.article className="pred-ai-stat" initial={{ opacity: 0, y: 20, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.34, delay: 0.09, ease: "easeOut" } }} whileHover={{ y: -10, scale: 1.02, rotateX: -2 }}>
                  <span className="pred-ai-stat-label">Sesión</span>
                  <strong className="pred-ai-stat-value">{messages.length > 0 ? `${messages.length} mensajes` : "Lista para consultar"}</strong>
                  <span className="pred-ai-stat-copy">
                    {messages.length > 0
                      ? "La conversación se mantiene dentro del contexto actual del panel."
                      : "Empieza con una pregunta libre o usa uno de los atajos sugeridos."}
                  </span>
                </motion.article>
              </div>
            </section>

            <section className="pred-ai-card">
              <div className="pred-ai-card-head">
                <div>
                  <p className="pred-ai-card-kicker">Consulta al panel</p>
                  <h3 className="pred-ai-card-title">
                    {messages.length > 0 ? "Conversación activa" : "Haz tu primera pregunta"}
                  </h3>
                </div>
                <span className="pred-ai-card-badge">
                  {messages.length > 0 ? `${messages.length} mensajes` : "Datos listos"}
                </span>
              </div>
              <p className="pred-ai-card-note">
                Puedes pedir una explicación para gerencia, un resumen con cifras exactas para contabilidad o una lectura ejecutiva para junta directiva.
                Las respuestas se generan a partir de los datos de predicción e inventario cargados en este panel.
              </p>
              <div className="pred-ai-question-board">
                <p className="pred-ai-question-kicker">También puedes preguntar</p>
                <div className="pred-ai-question-list">
                  {assistantQuestionIdeas.map((question, index) => (
                    <motion.button
                      key={question}
                      type="button"
                      className="pred-ai-question-pill"
                      initial={{ opacity: 0, y: 20, scale: 0.985 }}
                      animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.28, delay: index * 0.035, ease: "easeOut" } }}
                      whileHover={{ y: -4, scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        handleSend(question);
                      }}
                    >
                      {question}
                    </motion.button>
                  ))}
                </div>
              </div>

              <div className="pred-ai-chat-shell">
            {messages.length > 0 && (
              <div className="pred-chat-stream">
                {messages.map((msg, idx) => (
                  <motion.div
                    key={`${msg.role}-${idx}`}
                    className={`pred-chat-row ${msg.role === "user" ? "pred-chat-row-user" : "pred-chat-row-assistant"}`}
                    initial={{ opacity: 0, x: msg.role === "user" ? 32 : -32, y: 12, scale: 0.97 }}
                    animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                    transition={{ duration: 0.28, ease: "easeOut" }}
                  >
                    <motion.div
                      className={`pred-chat-bubble ${msg.role === "user" ? "pred-chat-bubble-user" : "pred-chat-bubble-assistant"} ${idx === messages.length - 1 ? "pred-chat-bubble-latest" : ""}`}
                      whileHover={{ y: -2, scale: 1.01 }}
                    >
                      {msg.content}
                    </motion.div>
                  </motion.div>
                ))}
                {aiLoading && (
                  <div className="pred-chat-row pred-chat-row-assistant">
                    <div className="pred-chat-loading">
                      {[0, 1, 2].map((i) => (
                        <span key={i} className="pred-chat-dot" style={{ animationDelay: `${i * 0.2}s` }} />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            )}
            {messages.length === 0 && (
              <div className="pred-empty-chat">
                <div className="pred-empty-chat-mark">
                  <Zap size={18} />
                </div>
                <div className="pred-empty-chat-copy">
                  <strong className="pred-empty-chat-title">Todo listo para consultar</strong>
                  <p>
                    Toca un atajo de abajo para una respuesta al instante, escribe tu propia pregunta o usa el micrófono.
                    Inventario, ingresos y prioridades salen de lo que ya ves en las otras pestañas.
                  </p>
                </div>
              </div>
            )}
              </div>
            <PromptInputBox
              variant="panel"
              quickActions={assistantQuickActions}
              onSend={handleSend}
              isLoading={aiLoading}
              placeholder="Pregunta por inventario, ingresos o predicciones de este panel…"
            />
            </section>
          </div>
        </motion.div>
  );
}

export function PredictionsCampanasTabPanel(props: AdminPredictionsModelState) {
  const {
    tabDirection,
    campanaLoading,
    campanaFetched,
    refreshCampanaData,
    campanaData,
    campanaFeedbackLoading,
    runCampanaFeedback,
    learningStats,
  } = props;
  return (
        <motion.div
          key="tab-campanas"
          className="pred-tab-panel"
          initial={{ opacity: 0, x: tabDirection >= 0 ? 54 : -54, y: 18, filter: "blur(8px)" }}
          animate={{ opacity: 1, x: 0, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.38, ease: "easeOut" }}
        >
          {campanaLoading && (
            <div style={{ textAlign: "center", padding: "2.5rem 0", opacity: 0.7 }}>
              Consultando inteligencia comercial…
            </div>
          )}

          {!campanaLoading && !campanaFetched && (
            <div style={{ textAlign: "center", padding: "2rem" }}>
              <button type="button" className="pred-btn" onClick={refreshCampanaData}>
                Consultar campañas detectadas
              </button>
            </div>
          )}

          {!campanaLoading && campanaFetched && campanaData && (
            <CampanasPanelBody
              data={campanaData}
              feedbackLoading={campanaFeedbackLoading}
              onFeedback={runCampanaFeedback}
              onRefresh={refreshCampanaData}
            />
          )}

          {/* ── Panel de aprendizaje por feedback (independiente de campanaData) ── */}
          {learningStats && (
            <section className="dash-card" style={{ padding: "1.25rem 1.5rem", marginTop: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>
                  Aprendizaje por feedback del admin
                </h3>
                <span
                  style={{
                    padding: "0.2rem 0.65rem",
                    borderRadius: "1rem",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    background: learningStats.aprendizaje_activo ? "var(--color-exito, #22c55e)" : "var(--color-borde, #334155)",
                    color: learningStats.aprendizaje_activo ? "#fff" : "var(--color-texto-suave, #94a3b8)",
                  }}
                >
                  {learningStats.aprendizaje_activo ? "Activo" : "Sin ajuste aún"}
                </span>
              </div>

              {/* Conteos y precisión por scope */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.1rem" }}>
                {(["global", "focalizada"] as const).map((scope) => {
                  const cnt  = learningStats.conteos[scope];
                  const prec = learningStats.precision_pct[scope];
                  const lbl  = scope === "global" ? "Campañas globales" : "Campañas focalizadas";
                  const precColor = prec == null
                    ? "var(--color-texto-suave, #94a3b8)"
                    : prec >= 75 ? "var(--color-exito, #22c55e)"
                    : prec <  40 ? "var(--color-critico, #ef4444)"
                    :              "var(--color-alerta, #f59e0b)";
                  return (
                    <div key={scope} style={{ background: "var(--color-fondo-card, #1e293b)", borderRadius: "0.6rem", padding: "0.75rem 1rem" }}>
                      <div style={{ fontSize: "0.78rem", opacity: 0.7, marginBottom: "0.3rem" }}>{lbl}</div>
                      <div style={{ display: "flex", gap: "1.25rem", alignItems: "baseline" }}>
                        <span style={{ fontSize: "0.88rem" }}>
                          <strong style={{ color: "var(--color-exito, #22c55e)" }}>{cnt.confirmadas}</strong> confirm.
                          {" / "}
                          <strong style={{ color: "var(--color-critico, #ef4444)" }}>{cnt.descartadas}</strong> desc.
                        </span>
                        <span style={{ fontSize: "1rem", fontWeight: 700, color: precColor }}>
                          {prec != null ? `${prec}%` : `<${learningStats.min_feedback_samples} muestras`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Comparativa de umbrales base vs activos */}
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--color-borde, #334155)", opacity: 0.7 }}>
                      <th style={{ textAlign: "left",   padding: "0.35rem 0.5rem", fontWeight: 600 }}>Umbral</th>
                      <th style={{ textAlign: "center", padding: "0.35rem 0.5rem", fontWeight: 600 }}>Base</th>
                      <th style={{ textAlign: "center", padding: "0.35rem 0.5rem", fontWeight: 600 }}>Activo</th>
                      <th style={{ textAlign: "center", padding: "0.35rem 0.5rem", fontWeight: 600 }}>Cambio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(
                      [
                        ["uplift_alta",       "Alta demanda"],
                        ["uplift_media",      "Campaña media"],
                        ["uplift_baja",       "Señal baja"],
                        ["uplift_focalizada", "Focalizada"],
                      ] as [keyof LearningStatsUmbrales, string][]
                    ).map(([key, lbl]) => {
                      const base   = learningStats.umbrales_base[key];
                      const activo = learningStats.umbrales_activos[key];
                      const diff   = activo - base;
                      const diffColor = diff < -0.001
                        ? "var(--color-exito, #22c55e)"
                        : diff > 0.001
                        ? "var(--color-alerta, #f59e0b)"
                        : "var(--color-texto-suave, #94a3b8)";
                      return (
                        <tr key={key} style={{ borderBottom: "1px solid var(--color-borde, #334155)" }}>
                          <td style={{ padding: "0.4rem 0.5rem" }}>{lbl}</td>
                          <td style={{ textAlign: "center", padding: "0.4rem 0.5rem", opacity: 0.65 }}>{base.toFixed(2)}×</td>
                          <td style={{ textAlign: "center", padding: "0.4rem 0.5rem", fontWeight: activo !== base ? 700 : 400 }}>
                            {activo.toFixed(2)}×
                          </td>
                          <td style={{ textAlign: "center", padding: "0.4rem 0.5rem", color: diffColor, fontWeight: 600 }}>
                            {Math.abs(diff) < 0.001
                              ? "—"
                              : `${diff > 0 ? "+" : ""}${diff.toFixed(2)}`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {!learningStats.aprendizaje_activo && (
                <p style={{ margin: "0.85rem 0 0", fontSize: "0.82rem", opacity: 0.65 }}>
                  Se necesitan al menos {learningStats.min_feedback_samples} acciones de feedback por scope para activar el ajuste de umbrales.
                </p>
              )}
            </section>
          )}
        </motion.div>
  );
}
