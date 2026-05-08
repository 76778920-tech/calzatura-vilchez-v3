import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { motion, animate } from "framer-motion";
import { PromptInputBox, type PromptPanelQuickAction } from "@/components/ui/ai-prompt-box";
import { aiAdminFetch, wakeAIService } from "@/services/aiAdminClient";

// Render en plan gratuito puede tardar ~20-30 s en cold start.
const AI_FETCH_TIMEOUT_MS = 45_000;

/** `pathAndQuery` p. ej. `/api/predict/combined?horizon=30&history=120` (véase `aiAdminClient`). */
async function fetchAI(pathAndQuery: string, options?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), AI_FETCH_TIMEOUT_MS);
  try {
    return await aiAdminFetch(pathAndQuery, { ...options, signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

function describeAIError(cause: unknown): string {
  if (cause instanceof DOMException && cause.name === "AbortError") {
    return "El servicio tardó demasiado en responder. Si es la primera carga del día, espera unos segundos y pulsa Reintentar.";
  }
  if (cause instanceof Error && cause.message.includes("Sesión requerida")) {
    return "Debes iniciar sesión como administrador para usar el panel de IA.";
  }
  return cause instanceof Error ? cause.message : "Error desconocido al conectar con el servicio de IA.";
}

async function invalidateAICache() {
  try {
    await fetchAI("/api/cache/invalidate", { method: "POST" });
  } catch {
    // El panel puede seguir consultando aúnque el cache no se invalide.
  }
}

interface Prediction {
  productId: string;
  imagen?: string;
  codigo: string;
  nombre: string;
  categoria: string;
  campana?: string;
  precio: number;
  stock_actual: number;
  prediccion_unidades: number;
  prediccion_diaria: number;
  prediccion_semanal: number;
  total_vendido_historico: number;
  promedio_diario_historico: number;
  ventas_7_dias: number;
  ventas_15_dias?: number;
  ventas_30_dias: number;
  consumo_diario_7: number;
  consumo_diario_30: number;
  consumo_estimado_diario: number;
  dias_hasta_agotarse: number;
  fecha_quiebre_stock?: string | null;
  tendencia: "subiendo" | "bajando" | "estable";
  confianza: number;
  drift_score?: number;
  alta_demanda: boolean;
  riesgo_agotamiento: boolean;
  nivel_riesgo: "critico" | "atencion" | "vigilancia" | "estable" | "sin_historial";
  alerta_stock: boolean;
  sin_historial: boolean;
}

interface WeekPoint {
  semana: string;
  unidades: number;
}

interface RevenuePoint {
  fecha: string;
  label: string;
  ingresos: number;
  tipo: "historico" | "proyectado";
}

interface RevenueSummary {
  proximo_7_dias: number;
  proximo_30_dias: number;
  proximo_horizonte: number;
  promedio_diario_historico: number;
  promedio_diario_proyectado: number;
  ultimo_30_dias: number;
  ultimo_horizonte: number;
  crecimiento_estimado_pct: number;
  crecimiento_estimado_horizonte_pct: number;
  tendencia: "subiendo" | "bajando" | "estable";
  confianza: number;
  total_historico_tienda?: number;
  total_historico_web?: number;
}

interface RevenueForecast {
  horizon_days: number;
  history_days: number;
  summary: RevenueSummary;
  history: RevenuePoint[];
  forecast: RevenuePoint[];
}

interface IreDimensiones {
  riesgo_stock: number;
  riesgo_ingresos: number;
  riesgo_demanda: number;
}
interface IrePesos {
  riesgo_stock: number;
  riesgo_ingresos: number;
  riesgo_demanda: number;
}
interface IreDetalle {
  productos_criticos: number;
  productos_atencion: number;
  productos_vigilancia: number;
  productos_sin_stock: number;
  productos_bajando?: number;
  alta_demanda_bajo_stock?: number;
  productos_drift_alto?: number;
  total_con_historial: number;
  total_sin_historial: number;
}
interface IreVariable {
  codigo: keyof IreDimensiones;
  nombre: string;
  peso: number;
  valor: number;
  contribucion_score: number;
  descripcion: string;
  fuente: string;
  indicadores: string[];
}
interface IreData {
  score: number;
  nivel: "bajo" | "moderado" | "alto" | "critico";
  descripcion: string;
  version?: string;
  definicion?: string;
  formula?: string;
  horizonte_dias: number | null;
  dimensiones: IreDimensiones;
  pesos: IrePesos;
  variables?: IreVariable[];
  detalle: IreDetalle;
}

interface IreHistorialPoint {
  fecha: string;
  score: number;
  nivel: string;
  dimensiones?: IreDimensiones;
  pesos?: IrePesos;
  version?: string;
  formula?: string;
  variables?: IreVariable[];
  detalle?: IreDetalle;
}

interface FeatureImportance {
  feature: string;
  importance: number;
}

interface ModeloMeta {
  n_samples: number;
  n_products: number;
  date_range_start: string;
  date_range_end: string;
  random_state: number;
  sklearn_version: string;
  feature_cols: string[];
  feature_importances: FeatureImportance[];
  feature_stats: Record<string, { mean: number; std: number }>;
  seasonality_features?: string[];
  campaign_values?: string[];
  data_hash: string;
  model_type: string;
  cached_at?: string;
}

interface ModelMetrics {
  status: string;
  n_evaluaciones: number;
  mae_promedio?: number;
  mape_promedio_pct?: number;
  n_predicciones_en_cola?: number;
  mensaje?: string;
  evaluaciones?: Array<{
    period_start: string;
    period_end: string;
    n_products: number;
    mae: number;
    mape_pct: number;
    model_type: string;
  }>;
}

type HorizonOption = 7 | 15 | 30;
type HistoryOption = 30 | 60 | 90 | 120;
type AlertOption  = 7 | 14 | 21 | 30;

const HORIZON_OPTIONS:  HorizonOption[]  = [7, 15, 30];
const HISTORY_OPTIONS:  HistoryOption[]  = [30, 60, 90, 120];
const ALERT_OPTIONS:    AlertOption[]    = [7, 14, 21, 30];

function loadPref<T extends number>(key: string, valid: T[], fallback: T): T {
  const v = Number(localStorage.getItem(key));
  return (valid as number[]).includes(v) ? (v as T) : fallback;
}
type PredictionTab = "resumen" | "ire" | "ventas" | "finanzas" | "ranking" | "modelo" | "asistente" | "campanas";
type RankingPeriod = 7 | 15 | 30;

interface CampanaTopProducto {
  producto_id: string;
  nombre: string;
  categoria: string;
  uplift_ratio: number;
  uplift_pct: number;
  ventas_recientes: number;
  ventas_baseline: number;
  stock_actual: number | null;
  impacto_soles?: number;
}

interface CampanaDetectada {
  id: number;
  fecha_deteccion: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  nivel: string;
  scope: "global" | "focalizada" | null;
  foco_tipo: "global" | "categoria" | "producto" | null;
  foco_nombre: string | null;
  foco_uplift: number | null;
  tipo_sugerido: string | null;
  estado: string;
  uplift_ratio: number | null;
  confidence_pct: number | null;
  impacto_estimado_soles: number | null;
  impacto_estimado_soles_focalizado: number | null;
  recomendacion: string | null;
  confirmada_por_admin: boolean | null;
  admin_nota: string | null;
  top_productos_detalle?: CampanaTopProducto[];
}

interface CampanaActiveResponse {
  status: string;
  activa: CampanaDetectada | null;
  historial: CampanaDetectada[];
}

interface LearningStatsScope {
  confirmadas: number;
  descartadas: number;
  total: number;
}
interface LearningStatsUmbrales {
  uplift_alta: number;
  uplift_media: number;
  uplift_baja: number;
  uplift_focalizada: number;
}
interface LearningStats {
  status: string;
  min_feedback_samples: number;
  conteos: { global: LearningStatsScope; focalizada: LearningStatsScope };
  precision_pct: { global: number | null; focalizada: number | null };
  umbrales_base: LearningStatsUmbrales;
  umbrales_activos: LearningStatsUmbrales;
  aprendizaje_activo: boolean;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const TAB_SEQUENCE: PredictionTab[] = ["resumen", "ire", "ventas", "finanzas", "ranking", "modelo", "asistente", "campanas"];

const IRE_NIVEL_LABELS: Record<string, string> = {
  bajo: "Bajo", moderado: "Moderado", alto: "Alto", critico: "Crítico",
};

const IRE_DIM_CONFIG: { key: keyof IreDimensiones; label: string }[] = [
  { key: "riesgo_stock",    label: "Stock" },
  { key: "riesgo_ingresos", label: "Ingresos" },
  { key: "riesgo_demanda",  label: "Demanda" },
];

const IRE_INDICATOR_LABELS: Record<string, string> = {
  productos_criticos: "Productos críticos",
  productos_atencion: "Productos en atención",
  productos_vigilancia: "Productos en vigilancia",
  productos_sin_stock: "Productos sin stock",
  total_con_historial: "Productos con historial",
  tendencia_ingresos: "Tendencia de ingresos",
  crecimiento_estimado_pct: "Crecimiento proyectado",
  confianza_ingresos: "Confianza de ingresos",
  productos_bajando: "Productos bajando",
  alta_demanda_bajo_stock: "Alta demanda con bajo stock",
  drift_alto: "Drift alto",
};

interface Recomendación {
  tipo: "urgente" | "atencion" | "oportunidad" | "tranquilo";
  titulo: string;
  detalle: string;
  accion: string;
  producto: string;
  productId: string;
}

const riskPriority: Record<Prediction["nivel_riesgo"], number> = {
  critico: 0,
  atencion: 1,
  vigilancia: 2,
  estable: 3,
  sin_historial: 4,
};

function formatUnits(value: number) {
  if (!Number.isFinite(value)) return "0";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatCurrency(value: number | undefined | null) {
  if (value == null || !Number.isFinite(value)) return "S/ 0.00";
  return `S/ ${value.toFixed(2)}`;
}

function formatPercent(value: number | undefined | null) {
  if (value == null || !Number.isFinite(value)) return "0.0%";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function formatTrendLabel(value: "subiendo" | "bajando" | "estable") {
  if (value === "subiendo") return "Subiendo";
  if (value === "bajando") return "Bajando";
  return "Estable";
}

/** Confianza de la proyección financiera (%): un solo criterio para KPI, resúmenes y asistente (RN-07). */
const CONFIDENCE_ALTA_MIN = 70;
const CONFIDENCE_MEDIA_MIN = 50;

function formatConfidenceLabel(value: number) {
  if (value >= CONFIDENCE_ALTA_MIN) return "Alta";
  if (value >= CONFIDENCE_MEDIA_MIN) return "Media";
  return "Inicial";
}

function AnimatedKpi({
  value,
  format,
  className = "pred-kpi-value",
}: {
  value: number;
  format: (v: number) => string;
  className?: string;
}) {
  const nodeRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const node = nodeRef.current;
    if (!node || !Number.isFinite(value)) return;
    const controls = animate(0, value, {
      duration: 0.85,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => { node.textContent = format(v); },
    });
    return () => controls.stop();
  }, [value, format]);
  return <p className={className} ref={nodeRef}>{format(value)}</p>;
}

function isOverstocked(product: Prediction) {
  if (product.sin_historial || product.stock_actual <= 0 || product.consumo_estimado_diario <= 0) return false;
  return (
    (product.dias_hasta_agotarse >= 120 && product.stock_actual >= 15) ||
    product.stock_actual >= Math.max(product.prediccion_unidades * 2.5, 25) ||
    (product.tendencia === "bajando" && product.stock_actual >= Math.max(product.prediccion_unidades * 2, 18))
  );
}

function isSlowMoving(product: Prediction) {
  if (product.sin_historial || product.stock_actual <= 0) return false;
  return (
    product.consumo_estimado_diario <= 0.35 ||
    (product.tendencia === "bajando" && product.stock_actual >= Math.max(product.prediccion_unidades * 1.5, 12)) ||
    product.ventas_30_dias <= 6
  );
}

function generarRecomendaciónes(predictions: Prediction[]): Recomendación[] {
  const recs: Recomendación[] = [];

  for (const p of predictions.filter((item) => !item.sin_historial)) {
    if (p.stock_actual === 0 && p.alta_demanda) {
      recs.push({
        tipo: "urgente",
        titulo: "Producto estrella sin stock",
        detalle: `"${p.nombre}" ya no tiene unidades y mantiene alta rotación.`,
        accion: "Repone hoy mismo o reserva nuevo ingreso con el proveedor.",
        producto: p.nombre,
        productId: p.productId,
      });
      continue;
    }

    if (p.alerta_stock && p.nivel_riesgo === "critico") {
      recs.push({
        tipo: "urgente",
        titulo: "Riesgo alto de agotarse",
        detalle: `"${p.nombre}" tiene alta demanda y cobertura para solo ~${p.dias_hasta_agotarse} días.`,
        accion: "Prioriza este producto en el siguiente pedido.",
        producto: p.nombre,
        productId: p.productId,
      });
      continue;
    }

    if (p.alerta_stock || p.nivel_riesgo === "atencion") {
      recs.push({
        tipo: "atencion",
        titulo: "Planifica reabastecimiento",
        detalle: `"${p.nombre}" tiene consumo activo y podría agotarse en ~${p.dias_hasta_agotarse} días.`,
        accion: "Coordina reposición esta semana para no romper stock.",
        producto: p.nombre,
        productId: p.productId,
      });
      continue;
    }

    if (p.alta_demanda && p.tendencia === "subiendo") {
      recs.push({
        tipo: "oportunidad",
        titulo: "Demanda en alza",
        detalle: `"${p.nombre}" acelera ventas y consume ~${formatUnits(p.consumo_estimado_diario)} uds/dia.`,
        accion: "Asegura stock extra antes de la siguiente subida.",
        producto: p.nombre,
        productId: p.productId,
      });
      continue;
    }

    if (p.tendencia === "bajando" && p.stock_actual > p.prediccion_unidades * 2) {
      recs.push({
        tipo: "tranquilo",
        titulo: "No hace falta pedir más todavía",
        detalle: `"${p.nombre}" esta vendiendo por debajo de su ritmo reciente y aún tiene margen.`,
        accion: "Manten seguimiento, pero evita sobrecomprar por ahora.",
        producto: p.nombre,
        productId: p.productId,
      });
    }
  }

  const order = { urgente: 0, atencion: 1, oportunidad: 2, tranquilo: 3 };
  return recs.sort((a, b) => order[a.tipo] - order[b.tipo]);
}

function generateAIResponse(
  message: string,
  predictions: Prediction[],
  revenueForecast: RevenueForecast | null,
): string {
  const msg = message.toLowerCase();
  const withHistory = predictions.filter((p) => !p.sin_historial);
  const sinHistorial = predictions.filter((p) => p.sin_historial);
  const inRisk = withHistory.filter((p) => p.riesgo_agotamiento);
  const criticos = withHistory.filter((p) => p.nivel_riesgo === "critico");
  const atencion = withHistory.filter((p) => p.nivel_riesgo === "atencion");
  const outOfStock = withHistory.filter((p) => p.stock_actual === 0);
  const highDemand = withHistory.filter((p) => p.alta_demanda);
  const subiendo = withHistory.filter((p) => p.tendencia === "subiendo");
  const bajando = withHistory.filter((p) => p.tendencia === "bajando");
  const estables = withHistory.filter((p) => p.tendencia === "estable");

  // ── Riesgo / stock ──────────────────────────────────────────────────────────
  if (msg.includes("riesgo") || msg.includes("agota") || msg.includes("stock") || msg.includes("queda") || msg.includes("inventario") || msg.includes("sin stock") || msg.includes("se acaba")) {
    if (outOfStock.length === 0 && inRisk.length === 0 && criticos.length === 0) {
      return `El inventario se encuentra en buen estado en este momento.\n\nDe los ${withHistory.length} productos con historial de ventas, ninguno presenta riesgo crítico de agotamiento. Todos cuentan con cobertura de stock suficiente para los próximos días según el ritmo de ventas actual.\n\n${sinHistorial.length > 0 ? `Hay ${sinHistorial.length} producto(s) sin ventas registradas aún, por lo que no se puede proyectar su consumo todavía.` : ""}`;
    }

    const lines: string[] = [];

    if (outOfStock.length > 0) {
      lines.push(`PRODUCTOS SIN STOCK (${outOfStock.length}):`);
      outOfStock.forEach((p) => {
        lines.push(`  • ${p.nombre} (${p.codigo || "sin código"}) — Se vendían ~${formatUnits(p.consumo_estimado_diario)} unidades por día. Cada día sin stock representa ventas perdidas. Requiere reposición inmediata.`);
      });
    }

    if (criticos.length > 0) {
      lines.push(`\nRIESGO CRÍTICO — SE AGOTAN EN MENOS DE 7 DÍAS (${criticos.length}):`);
      criticos.forEach((p) => {
        lines.push(`  • ${p.nombre} — Stock actual: ${p.stock_actual} uds. Consumo estimado: ${formatUnits(p.consumo_estimado_diario)} uds/día. Le quedan aproximadamente ${p.dias_hasta_agotarse} días. Coordinar pedido urgente al proveedor.`);
      });
    }

    if (atencion.length > 0) {
      lines.push(`\nATENCIÓN — REPOSICIÓN EN LOS PRÓXIMOS DÍAS (${atencion.length}):`);
      atencion.slice(0, 4).forEach((p) => {
        lines.push(`  • ${p.nombre} — Stock: ${p.stock_actual} uds. Dura ~${p.dias_hasta_agotarse} días al ritmo actual de ${formatUnits(p.consumo_estimado_diario)} uds/día.`);
      });
    }

    lines.push(`\nRECOMENDACIÓN: Priorizar los pedidos en el orden indicado arriba. Los productos sin stock generan pérdida de ventas directa. Los críticos deben pedirse hoy mismo para evitar quiebre de stock.`);
    return lines.join("\n");
  }

  // ── Ingresos / proyección financiera ────────────────────────────────────────
  if (msg.includes("ingreso") || msg.includes("venta") || msg.includes("dinero") || msg.includes("ganancia") || msg.includes("proyecc") || msg.includes("financ") || msg.includes("cuánto") || msg.includes("cuanto") || msg.includes("factura") || msg.includes("recaudar") || msg.includes("cobrar")) {
    if (!revenueForecast) {
      return `La proyección de ingresos aún no está disponible en este momento.\n\nEsto puede deberse a que el módulo financiero está actualizándose. Puede reintentar recargando la página en unos segúndos.`;
    }
    const s = revenueForecast.summary;
    const dir = s.crecimiento_estimado_pct >= 0 ? "+" : "";
    const tendenciaTexto = s.tendencia === "subiendo"
      ? "Los ingresos muestran una tendencia positiva respecto al período anterior."
      : s.tendencia === "bajando"
      ? "Los ingresos muestran una tendencia a la baja. Se recomienda revisar estrategias de ventas."
      : "Los ingresos se mantienen estables sin variación significativa.";
    const confianzaTexto = s.confianza >= CONFIDENCE_ALTA_MIN
      ? "La proyección tiene alta confiabilidad basada en el historial disponible."
      : s.confianza >= CONFIDENCE_MEDIA_MIN
      ? "La proyección es moderada. A mayor historial de ventas, más precisa será."
      : "La proyección es estimada. Se necesita más historial de ventas para mayor precisión.";

    return `PROYECCIÓN DE INGRESOS — PRÓXIMOS 30 DÍAS\n\nResumen ejecutivo:\n  • Ingreso estimado próxima semana: S/ ${s.proximo_7_dias.toFixed(2)}\n  • Ingreso estimado próximo mes: S/ ${s.proximo_30_dias.toFixed(2)}\n  • Comparado con los últimos 30 días reales (S/ ${s.ultimo_30_dias.toFixed(2)}): ${dir}${s.crecimiento_estimado_pct.toFixed(1)}%\n\nPromedios:\n  • Ingreso diario histórico: S/ ${s.promedio_diario_historico.toFixed(2)}\n  • Ingreso diario proyectado: S/ ${s.promedio_diario_proyectado.toFixed(2)}\n\nTendencia: ${s.tendencia.toUpperCase()}\n${tendenciaTexto}\n\nConfianza del modelo: ${s.confianza}%\n${confianzaTexto}\n\nNOTA: Esta proyección se basa en el comportamiento histórico de ventas y ajusta el ritmo según la estacionalidad por día de semana. No incluye factores externos como campañas promocionales o cambios en el mercado.`;
  }

  // ── Alta demanda / mejores productos ────────────────────────────────────────
  if (msg.includes("demanda") || msg.includes("popular") || msg.includes("mejor") || msg.includes("mas vendido") || msg.includes("más vendido") || msg.includes("estrella") || msg.includes("top") || msg.includes("más se vende") || msg.includes("mas se vende") || msg.includes("más rotan") || msg.includes("rotan")) {
    if (highDemand.length === 0) {
      return `Actualmente no se detectan productos con alta demanda en el período analizado.\n\nEsto puede significar que las ventas están distribuidas uniformemente entre los productos, o que el volumen general de ventas es bajo. Se recomienda revisar si hay oportunidades de promoción para activar la rotación.`;
    }
    const lines = [`PRODUCTOS CON ALTA DEMANDA (${highDemand.length} identificados):\n`];
    highDemand.slice(0, 6).forEach((p, i) => {
      lines.push(`${i + 1}. ${p.nombre} (${p.codigo || "sin código"})`);
      lines.push(`   Consumo estimado: ${formatUnits(p.consumo_estimado_diario)} uds/día — ${formatUnits(p.prediccion_semanal)} uds/semana`);
      lines.push(`   Tendencia: ${p.tendencia} | Stock actual: ${p.stock_actual} uds | Cobertura: ${p.stock_actual === 0 ? "SIN STOCK" : p.dias_hasta_agotarse >= 999 ? "amplia" : `~${p.dias_hasta_agotarse} días`}`);
      lines.push(`   Ventas últimos 30 días: ${formatUnits(p.ventas_30_dias)} unidades\n`);
    });
    lines.push(`RECOMENDACIÓN: Asegúrese de mantener stock suficiente en estos productos, especialmente los que muestran tendencia al alza. Son los que generan la mayor parte de los ingresos y su quiebre de stock tendría el mayor impacto económico.`);
    return lines.join("\n");
  }

  // ── Recomendaciónes ─────────────────────────────────────────────────────────
  if (msg.includes("recomend") || msg.includes("consejo") || msg.includes("qué hacer") || msg.includes("que hacer") || msg.includes("que debo") || msg.includes("accion") || msg.includes("acción") || msg.includes("pedir") || msg.includes("comprar") || msg.includes("reponer") || msg.includes("proveed")) {
    const recs = generarRecomendaciónes(predictions);
    if (recs.length === 0) {
      return `En este momento no hay acciones urgentes requeridas.\n\nEl inventario se encuentra en un estado saludable: los productos con mayor demanda cuentan con stock suficiente y no se detectan quiebres inminentes. Se recomienda mantener el monitoreo regular y revisar el panel cada semana para anticipar cualquier cambio en el ritmo de ventas.`;
    }
    const urgent = recs.filter((r) => r.tipo === "urgente");
    const atenc = recs.filter((r) => r.tipo === "atencion");
    const oport = recs.filter((r) => r.tipo === "oportunidad");
    const calm = recs.filter((r) => r.tipo === "tranquilo");
    const lines: string[] = ["PLAN DE ACCIÓN RECOMENDADO:\n"];

    if (urgent.length > 0) {
      lines.push(`🔴 URGENTE — Hacer hoy mismo (${urgent.length}):`);
      urgent.forEach((r) => {
        lines.push(`  • ${r.producto}: ${r.detalle}`);
        lines.push(`    → ${r.accion}`);
      });
    }
    if (atenc.length > 0) {
      lines.push(`\n🟡 ESTA SEMANA — Coordinar con proveedor (${atenc.length}):`);
      atenc.forEach((r) => {
        lines.push(`  • ${r.producto}: ${r.detalle}`);
        lines.push(`    → ${r.accion}`);
      });
    }
    if (oport.length > 0) {
      lines.push(`\n🟢 OPORTUNIDAD — Aprovechar el momento (${oport.length}):`);
      oport.forEach((r) => {
        lines.push(`  • ${r.producto}: ${r.detalle}`);
        lines.push(`    → ${r.accion}`);
      });
    }
    if (calm.length > 0) {
      lines.push(`\n⚪ SIN URGENCIA — Mantener seguimiento (${calm.length}):`);
      calm.forEach((r) => {
        lines.push(`  • ${r.producto}: ${r.detalle}`);
      });
    }
    lines.push(`\nPRIORIDAD GENERAL: Atender primero los casos urgentes para evitar pérdida de ventas. Luego coordinar los pedidos de la semana de forma ordenada.`);
    return lines.join("\n");
  }

  // ── Tendencias ──────────────────────────────────────────────────────────────
  if (msg.includes("tendencia") || msg.includes("trend") || msg.includes("sube") || msg.includes("baja") || msg.includes("comportamiento") || msg.includes("creciendo") || msg.includes("decayendo") || msg.includes("subiendo") || msg.includes("bajando")) {
    const lines = [`ANÁLISIS DE TENDENCIAS DEL NEGOCIO:\n`];
    lines.push(`Comportamiento del inventario (${withHistory.length} productos con historial):\n`);
    if (subiendo.length > 0) {
      lines.push(`📈 SUBIENDO (${subiendo.length} productos) — Mayor demanda que el período anterior:`);
      subiendo.slice(0, 4).forEach((p) => lines.push(`   • ${p.nombre}: ${formatUnits(p.consumo_estimado_diario)} uds/día`));
    }
    if (estables.length > 0) {
      lines.push(`\n➡ ESTABLES (${estables.length} productos) — Demanda constante y predecible:`);
      estables.slice(0, 3).forEach((p) => lines.push(`   • ${p.nombre}: ${formatUnits(p.consumo_estimado_diario)} uds/día`));
    }
    if (bajando.length > 0) {
      lines.push(`\n📉 BAJANDO (${bajando.length} productos) — Menor demanda que el período anterior:`);
      bajando.slice(0, 3).forEach((p) => lines.push(`   • ${p.nombre}: consumo actual ${formatUnits(p.consumo_estimado_diario)} uds/día`));
      lines.push(`   → Evaluar si conviene hacer promociones para activar la rotación o evitar sobrestock.`);
    }
    if (revenueForecast) {
      const s = revenueForecast.summary;
      lines.push(`\nTendencia de ingresos: ${s.tendencia.toUpperCase()}`);
      lines.push(`Los ingresos proyectados para el próximo mes son ${formatCurrency(s.proximo_30_dias)}, con una variación de ${formatPercent(s.crecimiento_estimado_pct)} respecto a los últimos 30 días.`);
    }
    return lines.join("\n");
  }

  // ── Resumen general ─────────────────────────────────────────────────────────
  if (msg.includes("resumen") || msg.includes("total") || msg.includes("cuántos") || msg.includes("cuantos") || msg.includes("estado") || msg.includes("general") || msg.includes("situaci") || msg.includes("panorama") || msg.includes("overview") || msg.includes("cómo estamos") || msg.includes("como estamos")) {
    const s = revenueForecast?.summary;
    const nivelAlerta = outOfStock.length > 0 || criticos.length > 0 ? "REQUIERE ATENCIÓN INMEDIATA" : inRisk.length > 0 ? "ATENCIÓN ESTA SEMANA" : "SITUACIÓN SALUDABLE";
    const lines = [
      `RESUMEN EJECUTIVO — ESTADO ACTUAL DEL NEGOCIO\n`,
      `Nivel de alerta: ${nivelAlerta}\n`,
      `INVENTARIO:`,
      `  • Total de productos en catálogo: ${predictions.length}`,
      `  • Productos con historial de ventas: ${withHistory.length}`,
      `  • Sin ventas registradas aún: ${sinHistorial.length}`,
      `  • Sin stock (agotados): ${outOfStock.length}`,
      `  • Riesgo crítico (menos de 7 días): ${criticos.length}`,
      `  • Requieren atención esta semana: ${atencion.length}`,
      `  • Alta demanda activa: ${highDemand.length}`,
      `  • Tendencia subiendo: ${subiendo.length} | Bajando: ${bajando.length} | Estable: ${estables.length}`,
    ];
    if (s) {
      lines.push(`\nPROYECCIÓN FINANCIERA:`);
      lines.push(`  • Ingreso estimado próxima semana: ${formatCurrency(s.proximo_7_dias)}`);
      lines.push(`  • Ingreso estimado próximo mes: ${formatCurrency(s.proximo_30_dias)}`);
      lines.push(`  • Variación vs últimos 30 días: ${formatPercent(s.crecimiento_estimado_pct)}`);
      lines.push(`  • Tendencia de ingresos: ${s.tendencia}`);
    }
    if (outOfStock.length > 0 || criticos.length > 0) {
      lines.push(`\nACCIÓN PRIORITARIA: Hay ${outOfStock.length + criticos.length} producto(s) que requieren pedido urgente al proveedor para evitar pérdida de ventas.`);
    } else {
      lines.push(`\nSin alertas críticas por el momento. Se recomienda revisar el panel semanalmente.`);
    }
    return lines.join("\n");
  }

  // ── Ayuda / fallback ─────────────────────────────────────────────────────────
  return `Hola, soy el asistente de análisis de Calzatura Vilchez. Puedo ayudarle con información detallada sobre:\n\n• "¿Qué productos están en riesgo de agotarse?" — análisis completo del inventario crítico\n• "¿Cuánto vamos a ingresar el próximo mes?" — proyección financiera detallada\n• "¿Qué productos tienen más demanda?" — ranking de los más vendidos\n• "¿Qué debo hacer ahora?" — plan de acción priorizado\n• "¿Cómo están las tendenciasí" — análisis de comportamiento por producto\n• "Dame un resumen general" — estado ejecutivo completo del negocio\n\nEscriba su consulta y le respondo con el análisis correspondiente.`;
}

void generateAIResponse;

function normalizeChatTextV2(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function countIntentMatches(text: string, terms: string[]) {
  return terms.reduce((count, term) => count + (text.includes(term) ? 1 : 0), 0);
}

function findMentionedProductsV2(message: string, predictions: Prediction[]) {
  const normalized = normalizeChatTextV2(message);
  const tokens = new Set(normalized.split(" ").filter((token) => token.length >= 3));

  return predictions.filter((product) => {
    const code = normalizeChatTextV2(product.codigo ?? "");
    const name = normalizeChatTextV2(product.nombre);

    if (code && normalized.includes(code)) return true;
    if (name && normalized.includes(name)) return true;

    const nameTokens = name.split(" ").filter((token) => token.length >= 4);
    const matched = nameTokens.filter((token) => tokens.has(token)).length;
    return matched >= Math.min(2, nameTokens.length) && matched > 0;
  });
}

type AssistantIntentV2 = "summary" | "recommendations" | "revenue" | "risk" | "demand" | "overstock" | "confidence" | "motor" | "noHistory" | null;

const QUICK_PROMPT_INTENTS_V2: Array<{ prompt: string; intent: AssistantIntentV2 }> = [
  { prompt: normalizeChatTextV2("Dame un resumen ejecutivo para gerencia con las cifras clave del panel."), intent: "summary" },
  { prompt: normalizeChatTextV2("¿Qué producto debo reponer primero según riesgo y demanda?"), intent: "recommendations" },
  { prompt: normalizeChatTextV2("Compara el próximo horizonte proyectado con el último período real de ingresos."), intent: "revenue" },
  { prompt: normalizeChatTextV2("Lista los productos en mayor riesgo de inventario y qué harías."), intent: "risk" },
  { prompt: normalizeChatTextV2("¿Cuáles son los productos con más demanda ahora?"), intent: "demand" },
  { prompt: normalizeChatTextV2("¿Dónde estamos acumulando sobrestock o rotación lenta?"), intent: "overstock" },
  { prompt: normalizeChatTextV2("Explícame qué tan confiable es la proyección y por qué."), intent: "confidence" },
  { prompt: normalizeChatTextV2("¿Cuál es el producto motor y cómo lo defenderías?"), intent: "motor" },
  { prompt: normalizeChatTextV2("¿Qué productos siguen sin historial suficiente y qué implica?"), intent: "noHistory" },
];

function detectQuickPromptIntentV2(normalizedMessage: string): AssistantIntentV2 {
  return QUICK_PROMPT_INTENTS_V2.find((item) => item.prompt === normalizedMessage)?.intent ?? null;
}

interface AssistantContextV2 {
  withHistory: Prediction[];
  noHistory: Prediction[];
  inRisk: Prediction[];
  criticos: Prediction[];
  atencion: Prediction[];
  outOfStock: Prediction[];
  highDemand: Prediction[];
  subiendo: Prediction[];
  bajando: Prediction[];
  estables: Prediction[];
  overstocked: Prediction[];
  slowMoving: Prediction[];
  recomendaciones: Recomendación[];
  topByRisk: Prediction[];
  urgentProducts: Prediction[];
  topDemand: Prediction[];
}

function buildAssistantContextV2(predictions: Prediction[]): AssistantContextV2 {
  const withHistory = predictions.filter((p) => !p.sin_historial);
  const noHistory = predictions.filter((p) => p.sin_historial);
  const inRisk = withHistory.filter((p) => p.alerta_stock);
  const criticos = withHistory.filter((p) => p.nivel_riesgo === "critico");
  const atencion = withHistory.filter((p) => p.nivel_riesgo === "atencion");
  const outOfStock = withHistory.filter((p) => p.stock_actual === 0);
  const highDemand = withHistory.filter((p) => p.alta_demanda);
  const subiendo = withHistory.filter((p) => p.tendencia === "subiendo");
  const bajando = withHistory.filter((p) => p.tendencia === "bajando");
  const estables = withHistory.filter((p) => p.tendencia === "estable");
  const overstocked = withHistory.filter(isOverstocked);
  const slowMoving = withHistory.filter(isSlowMoving);
  const recomendaciones = generarRecomendaciónes(predictions);

  const topByRisk = [...withHistory]
    .filter((p) => p.stock_actual === 0 || p.alerta_stock || p.nivel_riesgo === "critico" || p.nivel_riesgo === "atencion")
    .sort((a, b) => {
      if (a.stock_actual === 0 && b.stock_actual !== 0) return -1;
      if (a.stock_actual !== 0 && b.stock_actual === 0) return 1;
      return a.dias_hasta_agotarse - b.dias_hasta_agotarse;
    });

  const urgentProducts = [...outOfStock, ...criticos.filter((p) => p.stock_actual > 0)]
    .sort((a, b) => a.dias_hasta_agotarse - b.dias_hasta_agotarse)
    .slice(0, 3);

  const topDemand = [...highDemand]
    .sort((a, b) => b.consumo_estimado_diario - a.consumo_estimado_diario)
    .slice(0, 5);

  return {
    withHistory,
    noHistory,
    inRisk,
    criticos,
    atencion,
    outOfStock,
    highDemand,
    subiendo,
    bajando,
    estables,
    overstocked,
    slowMoving,
    recomendaciones,
    topByRisk,
    urgentProducts,
    topDemand,
  };
}

function buildProductDetailResponseV2(product: Prediction) {
  const label = `${product.nombre}${product.codigo ? ` (${product.codigo})` : ""}`;
  const coverage =
    product.stock_actual === 0
      ? "ya no tiene stock"
      : product.dias_hasta_agotarse >= 999
      ? "tiene una cobertura amplia"
      : `tiene cobertura para unos ${product.dias_hasta_agotarse} días`;

  if (product.sin_historial) {
    return [
      `Sobre ${label}:`,
      "",
      `Todavía no tiene suficiente historial de ventas para hacer una proyección confiable.`,
      `Por ahora solo veo ${product.stock_actual} unidades en stock${product.categoria ? ` dentro de la categoría ${product.categoria}` : ""}.`,
      "En términos simples: aún no hay suficiente movimiento real para saber si este producto rota rápido, lento o de forma estable.",
      "En cuanto acumule más ventas, el panel podrá estimar mejor su demanda, su riesgo de agotarse y la urgencia de reponerlo.",
    ].join("\n");
  }

  const recommendation = product.stock_actual === 0
    ? "Mi recomendación es reponerlo cuanto antes para no seguir perdiendo ventas."
    : product.alerta_stock || product.nivel_riesgo === "critico"
    ? "Mi recomendación es priorizarlo en el siguiente pedido."
    : product.alta_demanda
    ? "Mi recomendación es seguirlo de cerca porque viene rotando bien."
    : "Mi recomendación es mantener un seguimiento normal por ahora.";

  return [
    `Producto analizado: ${label}`,
    "",
    "Resumen ejecutivo:",
    `Hoy tiene ${product.stock_actual} unidades en stock y ${coverage}.`,
    "",
    "Datos exactos:",
    `- Categoría: ${product.categoria || "Sin categoría"}`,
    `- Ventas últimos 7 días: ${formatUnits(product.ventas_7_dias)} unidades`,
    `- Ventas últimos 30 días: ${formatUnits(product.ventas_30_dias)} unidades`,
    `- Consumo estimado diario: ${formatUnits(product.consumo_estimado_diario)} unidades`,
    `- Proyección próxima semana: ${formatUnits(product.prediccion_semanal)} unidades`,
    `- Proyección del horizonte actual: ${formatUnits(product.prediccion_unidades)} unidades`,
    `- Tendencia: ${product.tendencia}`,
    `- Nivel de riesgo: ${product.nivel_riesgo}`,
    `- Confianza del cálculo: ${product.confianza}%`,
    "",
    "Interpretación:",
    product.tendencia === "subiendo"
      ? "Eso significa que el producto viene acelerando su salida y conviene vigilarlo más de cerca."
      : product.tendencia === "bajando"
      ? "Eso significa que su salida se esta enfríando y no hace falta apresurar una compra grande."
      : "Eso significa que, por ahora, su ritmo de venta se mantiene bastante estable.",
    "",
    "Recomendación:",
    recommendation,
  ].join("\n");
}

function generateAIResponseV2(
  message: string,
  predictions: Prediction[],
  revenueForecast: RevenueForecast | null,
  context: AssistantContextV2,
): string {
  const msg = normalizeChatTextV2(message);
  const forcedIntent = detectQuickPromptIntentV2(msg);
  const mentionedProducts = findMentionedProductsV2(message, predictions).slice(0, 3);
  const {
    withHistory,
    noHistory,
    inRisk,
    criticos,
    atencion,
    outOfStock,
    highDemand,
    subiendo,
    bajando,
    estables,
    overstocked,
    slowMoving,
    recomendaciones,
    topByRisk,
    urgentProducts,
    topDemand,
  } = context;

  const labelOf = (product: Prediction) => `${product.nombre}${product.codigo ? ` (${product.codigo})` : ""}`;
  const joinNatural = (items: string[]) => {
    if (items.length === 0) return "";
    if (items.length === 1) return items[0];
    if (items.length === 2) return `${items[0]} y ${items[1]}`;
    return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
  };
  const coverageText = (product: Prediction) => {
    if (product.stock_actual === 0) return "sin stock";
    if (product.dias_hasta_agotarse >= 999) return "con cobertura amplia";
    return `con cobertura para unos ${product.dias_hasta_agotarse} dias`;
  };
  const trendText = (trend: Prediction["tendencia"]) => {
    if (trend === "subiendo") return "al alza";
    if (trend === "bajando") return "a la baja";
    return "estable";
  };

  const riskTerms = [
    "riesgo",
    "agota",
    "agotarse",
    "stock",
    "inventario",
    "sin stock",
    "se acaba",
    "quiebre",
    "cobertura",
    "faltando",
    "faltan unidades",
  ];
  const revenueTerms = [
    "ingreso",
    "ingresos",
    "ingresar",
    "dinero",
    "ganancia",
    "ganancias",
    "proyección",
    "proyecta",
    "proyectado",
    "financ",
    "recaudar",
    "cobrar",
    "facturacion",
    "facturar",
    "vender",
    "ventas",
    "proximo mes",
    "proxima semana",
    "contable",
    "contabilidad",
  ];
  const demandTerms = [
    "demanda",
    "popular",
    "populares",
    "mas vendido",
    "mas vendidos",
    "mas se vende",
    "vende mas",
    "top",
    "estrella",
    "rotación",
    "rotan",
    "se venden",
    "alta demanda",
  ];
  const overstockTerms = [
    "sobrestock",
    "sobre stock",
    "stock acumulado",
    "stock de sobra",
    "rotacion lenta", "rotación lenta",
    "lenta rotacion", "lenta rotación",
    "poca rotacion",  "poca rotación",
    "inmovilizado",
  ];
  const confidenceTerms = [
    "confianza",
    "confiable",
    "precision", "precisión",
    "preciso",
    "certeza",
    "que tan seguro",
    "fiable",
    "margen de error",
  ];
  const motorTerms = [
    "producto motor",
    "producto estrella",
    "motor",
    "lidera",
    "lider", "líder",
    "empuja",
    "sostiene la venta",
    "defenderias",
  ];
  const recommendationTerms = ["recomend", "consejo", "que hacer", "que debo", "accion", "acción", "pedir", "comprar", "reponer", "proveedor", "priorizar"];
  const trendTerms = ["tendencia", "trend", "sube", "subiendo", "baja", "bajando", "comportamiento", "creciendo", "cae", "caida", "como va", "como van"];
  const summaryTerms = [
    "resumen",
    "estado",
    "general",
    "situacion", "situación",
    "panorama",
    "overview",
    "como estamos",
    "estado actual",
    "resumen general",
    "informe",
    "gerencia",
    "gerencial",
    "directiva",
    "junta directiva",
    "comite",
  ];
  const noHistoryTerms = ["sin historial", "sin ventas", "no tiene ventas", "sin movimiento", "sin rotación", "sin datos"];

  const intentScores = {
    product: mentionedProducts.length > 0 ? 3 + countIntentMatches(msg, [...riskTerms, ...demandTerms, ...trendTerms, ...recommendationTerms]) : 0,
    risk: (forcedIntent === "risk" ? 100 : 0) + countIntentMatches(msg, riskTerms),
    revenue: (forcedIntent === "revenue" ? 100 : 0) + countIntentMatches(msg, revenueTerms),
    demand: (forcedIntent === "demand" ? 100 : 0) + countIntentMatches(msg, demandTerms),
    overstock: (forcedIntent === "overstock" ? 100 : 0) + countIntentMatches(msg, overstockTerms),
    confidence: (forcedIntent === "confidence" ? 100 : 0) + countIntentMatches(msg, confidenceTerms),
    motor: (forcedIntent === "motor" ? 100 : 0) + countIntentMatches(msg, motorTerms),
    recommendations: (forcedIntent === "recommendations" ? 100 : 0) + countIntentMatches(msg, recommendationTerms),
    trend: countIntentMatches(msg, trendTerms),
    summary: (forcedIntent === "summary" ? 100 : 0) + countIntentMatches(msg, summaryTerms) + (msg.includes("cuantos") ? 1 : 0),
    noHistory: (forcedIntent === "noHistory" ? 100 : 0) + countIntentMatches(msg, noHistoryTerms),
  };

  if (intentScores.product >= 3 && mentionedProducts.length === 1) {
    return buildProductDetailResponseV2(mentionedProducts[0]);
  }

  const asksRevenue =
    intentScores.revenue > 0 ||
    (((msg.includes("proximo mes") || msg.includes("proxima semana")) &&
      (msg.includes("ingresar") || msg.includes("ingresos") || msg.includes("vender") || msg.includes("ventas") || msg.includes("facturar"))) ||
      msg.includes("cuanto se proyecta"));

  if (intentScores.noHistory > 0) {
    if (noHistory.length === 0) {
      return "Hoy todos los productos del catálogo ya tienen historial suficiente para analizarlos con normalidad. Eso ayuda a que las proyecciónes sean más útiles y más fáciles de interpretar.";
    }
    const lines = [
      `Todavía hay ${noHistory.length} producto(s) sin historial suficiente.`,
      "",
      "Listado actual:",
    ];
    noHistory.slice(0, 8).forEach((p, index) => {
      lines.push(`${index + 1}. ${labelOf(p)}: stock actual ${p.stock_actual} unidades.`);
    });
    lines.push("");
    lines.push("Interpretación:");
    lines.push("En la práctica, estos productos aún no tienen suficiente movimiento como para estimar si se venden rápido o lento.");
    lines.push("");
    lines.push("Implicancia para gerencia y contabilidad:");
    lines.push("Todavía no conviene tomar decisiones fuertes de compra o proyección basadas en ellos.");
    lines.push("");
    lines.push("Recomendación:");
    lines.push("En cuanto acumulen ventas reales, el panel podra calcular mejor su demanda, su nivel de reposición y su prioridad dentro del negocio.");
    return lines.join("\n");
  }

  if (intentScores.risk > 0) {
    if (outOfStock.length === 0 && inRisk.length === 0 && criticos.length === 0) {
      if (overstocked.length > 0 || slowMoving.length > 0) {
        return [
          "Hoy no veo riesgo fuerte de quiebre de stock, pero tampoco diria que el inventario este sano del todo.",
          "",
          `No hay productos criticos por agotarse, pero si hay ${overstocked.length} con stock acumulado y ${slowMoving.length} con rotación lenta.`,
          "",
          "Interpretación:",
          "Eso significa que el problema no es falta de mercadería, sino capital inmovilizado en productos que se están moviendo poco.",
          "",
          "Recomendación:",
          "Conviene frenar compras en esos productos, revisar descuentos o empuje comercial y concentrar reposición solo en los que sí tienen salida real.",
        ].join("\n");
      }
      return [
        "Por ahora no veo un riesgo fuerte de quiebre de stock.",
        "",
        `De los ${withHistory.length} productos con historial, ninguno está en una situación crítica. El inventario se ve estable según el ritmo de ventas actual.`,
        noHistory.length > 0
          ? `Eso sí, todavía hay ${noHistory.length} producto(s) sin historial suficiente, así que conviene revisarlos aparte.`
          : "No hay alertas graves en este momento.",
        "",
        "En términos gerenciales, eso significa que hoy no se ve una pérdida inmediata de ventas por falta de producto.",
      ].join("\n");
    }

    const lines = [
      "Resumen ejecutivo:",
      `Hoy veo ${outOfStock.length} producto(s) sin stock, ${criticos.length} en nivel crítico y ${atencion.length} en atención.`,
      "",
      "Datos exactos:",
      `- Productos con historial analizado: ${withHistory.length}`,
      `- Sin stock: ${outOfStock.length}`,
      `- Riesgo crítico: ${criticos.length}`,
      `- En atención: ${atencion.length}`,
      "",
    ];

    if (urgentProducts.length > 0) {
      lines.push("Productos más urgentes:");
      lines.push(`Lo más urgente ahora mismo es revisar ${joinNatural(urgentProducts.map((p) => labelOf(p)))}.`);
      lines.push("");
    }

    urgentProducts.forEach((p) => {
      lines.push(`- ${labelOf(p)}: stock ${p.stock_actual}, consumo estimado ${formatUnits(p.consumo_estimado_diario)} por día, ${coverageText(p)}.`);
    });

    lines.push("");
    lines.push("Interpretación:");
    lines.push("En términos simples: estos son los productos con más probabilidad de hacerte perder ventas si no actúas pronto.");
    lines.push("");
    lines.push("Recomendación:");
    lines.push("Mi recomendación es priorizar primero los productos sin stock y luego los que ya están cerca de agotarse.");
    return lines.join("\n");
  }

  if (asksRevenue) {
    if (!revenueForecast) {
      return [
        "Todavía no tengo una proyección de ingresos disponible.",
        "",
        "Puede pasar cuando el servicio aún se esta actualizando o cuando falta historial suficiente.",
        "Prueba con refrescar el panel y volver a consultarme en unos segúndos.",
      ].join("\n");
    }

    const s = revenueForecast.summary;
    const horizonLabel = revenueForecast.horizon_days;
    const change = formatPercent(s.crecimiento_estimado_horizonte_pct);
    const directionSentence =
      s.crecimiento_estimado_horizonte_pct >= 5
        ? `Eso apunta a un periodo de ${horizonLabel} días mejor que el anterior.`
        : s.crecimiento_estimado_horizonte_pct <= -5
        ? `Eso apunta a un periodo de ${horizonLabel} días más flojo que el anterior.`
        : `Eso apunta a un periodo de ${horizonLabel} días muy parecido al anterior.`;
    const decisionSentence =
      s.crecimiento_estimado_horizonte_pct >= 5
        ? "La lectura gerencial sería mantener el ritmo y cuidar que no falte stock en los productos que mejor rotan."
        : s.crecimiento_estimado_horizonte_pct <= -5
        ? "La lectura gerencial sería revisar promociones, stock y productos de mayor salida para no dejar caer las ventas."
        : "La lectura gerencial sería mantener el control actual y monitorear si aparece algún cambio importante.";
    const confidenceSentence =
      s.confianza >= CONFIDENCE_ALTA_MIN
        ? "La estimación se ve bastante confiable con los datos que ya tiene el sistema."
        : s.confianza >= CONFIDENCE_MEDIA_MIN
        ? "La estimación es útil como guía, aúnque conviene mirarla con algo de cautela."
        : "La estimación aún es preliminar, así que conviene usarla solo como orientación.";

    return [
      "Resumen ejecutivo:",
      `Si el negocio sigue comportándose como hasta ahora, el próximo horizonte de ${horizonLabel} días podría cerrar alrededor de ${formatCurrency(s.proximo_horizonte)} en ingresos.`,
      "",
      "Datos exactos:",
      `- Proyección próxima semana: ${formatCurrency(s.proximo_7_dias)}`,
      `- Proyección horizonte actual (${horizonLabel} días): ${formatCurrency(s.proximo_horizonte)}`,
      `- últimos ${horizonLabel} días reales: ${formatCurrency(s.ultimo_horizonte)}`,
      `- Variación proyectada: ${change}`,
      `- Promedio diario histórico: ${formatCurrency(s.promedio_diario_historico)}`,
      `- Promedio diario proyectado: ${formatCurrency(s.promedio_diario_proyectado)}`,
      `- Tendencia del ingreso: ${s.tendencia}`,
      `- Confianza del cálculo: ${s.confianza}%`,
      "",
      "Interpretación:",
      `En palabras simples: la próxima semana debería moverse cerca de ${formatCurrency(s.proximo_7_dias)} y, comparado con el último mes, hoy la proyección marca ${change}.`,
      directionSentence,
      "",
      "Implicancia para la junta y contabilidad:",
      `Como referencia, los últimos ${horizonLabel} días reales cerraron en ${formatCurrency(s.ultimo_horizonte)} y la proyección actual toma ese comportamiento como base para anticipar el siguiente periodo.`,
      "",
      "Recomendación:",
      decisionSentence,
      confidenceSentence,
    ].join("\n");
  }

  if (intentScores.demand > 0) {
    if (highDemand.length === 0) {
      return [
        "Ahora mismo no hay un grupo claro de productos con alta demanda.",
        "",
        "Las ventas se ven más repartidas o el volumen general todavía no marca diferencias fuertes entre productos.",
      ].join("\n");
    }

    const lines = [
      "Resumen ejecutivo:",
      `Los productos con mejor salida en este momento son ${joinNatural(topDemand.slice(0, 3).map((p) => labelOf(p)))}.`,
      "",
      "Datos exactos:",
    ];

    topDemand.forEach((p, index) => {
      lines.push(
        `${index + 1}. ${labelOf(p)}: ${formatUnits(p.consumo_estimado_diario)} unidades por día, ${formatUnits(p.prediccion_semanal)} proyectadas para la semana, ventas 30 días ${formatUnits(p.ventas_30_dias)} y ${coverageText(p)}.`,
      );
    });

    lines.push("");
    lines.push("Interpretación:");
    lines.push("En términos gerenciales, aqui esta el grupo que hoy te sostiene mejor la rotación del negocio.");
    lines.push("");
    lines.push("Recomendación:");
    lines.push("Si vas a priorizar compras, estos son los productos que más conviene vigilar.");
    return lines.join("\n");
  }

  if (intentScores.overstock > 0) {
    if (overstocked.length === 0 && slowMoving.length === 0) {
      return [
        "Hoy no veo una señal fuerte de sobrestock.",
        "",
        "No hay productos con capital claramente inmovilizado ni con una rotación tan baja como para frenar compras por ese motivo.",
        "",
        "Recomendación:",
        "Puedes seguir comprando según demanda real y vigilar solo los productos que vayan entrando a tendencia bajista.",
      ].join("\n");
    }

    const foco = [...new Set([...overstocked, ...slowMoving])].slice(0, 5);
    const lines = [
      "Resumen ejecutivo:",
      `Detecto ${overstocked.length} producto(s) con sobrestock y ${slowMoving.length} con rotación lenta.`,
      "",
      "Productos donde conviene poner atención:",
    ];

    foco.forEach((p, index) => {
      lines.push(
        `${index + 1}. ${labelOf(p)}: stock ${p.stock_actual}, ventas 30 días ${formatUnits(p.ventas_30_dias)}, tendencia ${trendText(p.tendencia)} y ${coverageText(p)}.`,
      );
    });

    lines.push("");
    lines.push("Interpretación:");
    lines.push("Aquí no estás perdiendo ventas por falta de mercadería; más bien hay dinero detenido en productos que se mueven más lento de lo deseado.");
    lines.push("");
    lines.push("Recomendación:");
    lines.push("Frena reposición en esos pares, mueve salida comercial con descuentos o vitrinas y prioriza compra solo en los de demanda comprobada.");
    return lines.join("\n");
  }

  if (intentScores.confidence > 0) {
    if (!revenueForecast) {
      return [
        "Aún no tengo una proyección financiera consolidada para medir confianza.",
        "",
        "Cuando el servicio termine de calcular ingresos para el horizonte activo, te podré decir qué tan estable es la lectura y qué tanto conviene usarla para decidir.",
      ].join("\n");
    }

    const s = revenueForecast.summary;
    const confidenceLabel = formatConfidenceLabel(s.confianza);
    const confidenceMeaning =
      s.confianza >= CONFIDENCE_ALTA_MIN
        ? "La señal es bastante sólida: el histórico y el comportamiento reciente van en una dirección consistente."
        : s.confianza >= CONFIDENCE_MEDIA_MIN
        ? "La señal sirve para decidir, pero todavía conviene contrastarla con criterio comercial y reposición semanal."
        : "La señal todavía es inicial: úsala como orientación y no como verdad cerrada.";

    return [
      "Resumen ejecutivo:",
      `La confianza actual de la proyección es ${confidenceLabel.toLowerCase()} (${s.confianza}%).`,
      "",
      "Qué significa eso:",
      confidenceMeaning,
      "",
      "Datos que acompañan la lectura:",
      `- Horizonte analizado: ${revenueForecast.horizon_days} días`,
      `- Tendencia detectada: ${trendText(s.tendencia)}`,
      `- Promedio diario histórico: ${formatCurrency(s.promedio_diario_historico)}`,
      `- Promedio diario proyectado: ${formatCurrency(s.promedio_diario_proyectado)}`,
      "",
      "Recomendación:",
      s.confianza >= CONFIDENCE_ALTA_MIN
        ? "Puedes usar esta proyección como base fuerte para comité, reposición y seguimiento comercial."
        : s.confianza >= CONFIDENCE_MEDIA_MIN
        ? "Úsala como guía principal, pero acompáñala con revisión semanal del inventario crítico."
        : "Úsala solo para orientar prioridades y espera más historial antes de tomar decisiones grandes.",
    ].join("\n");
  }

  if (intentScores.motor > 0) {
    if (!topDemand[0]) {
      return [
        "Todavía no puedo defender un producto motor claro.",
        "",
        "El historial disponible no marca un líder suficientemente fuerte en salida como para sostener una recomendación clara.",
      ].join("\n");
    }

    const lider = topDemand[0];
    return [
      "Resumen ejecutivo:",
      `${labelOf(lider)} es hoy el producto motor del panel.`,
      "",
      "Datos exactos:",
      `- Consumo estimado diario: ${formatUnits(lider.consumo_estimado_diario)} unidades`,
      `- Proyección semanal: ${formatUnits(lider.prediccion_semanal)} unidades`,
      `- Ventas últimos 30 días: ${formatUnits(lider.ventas_30_dias)} unidades`,
      `- Tendencia: ${trendText(lider.tendencia)}`,
      `- Cobertura actual: ${coverageText(lider)}`,
      "",
      "Cómo lo defendería:",
      "Es el par que mejor sostiene rotación y por eso conviene protegerle stock, visibilidad y margen antes que al resto.",
      "",
      "Recomendación:",
      lider.stock_actual === 0 || lider.alerta_stock
        ? "Asegura reposición inmediata porque este par no solo vende: también marca el ritmo del portafolio."
        : "Mantén cobertura sana y evita descuentos innecesarios; es un producto que ya se defiende bien por demanda.",
    ].join("\n");
  }

  if (intentScores.recommendations > 0) {
    if (recomendaciones.length === 0) {
      return [
        "Por ahora no veo acciones urgentes.",
        "",
        "El inventario esta relativamente sano y no hay señales fuertes de quiebre inmediato.",
        "Lo mejor seria seguir monitoreando el panel y revisar otra vez en cuanto entren nuevas ventas.",
      ].join("\n");
    }

    const topActions = recomendaciones.slice(0, 4);
    const lines = [
      "Resumen ejecutivo:",
      "Si tuviera que priorizar hoy, haria esto:",
      "",
      "Te lo ordeno desde lo más urgente hasta lo más conveniente para proteger ventas y evitar sobrestock.",
      "",
      "Plan recomendado:",
    ];

    topActions.forEach((rec, index) => {
      lines.push(`${index + 1}. ${rec.producto}: ${rec.accion}`);
      lines.push(`   Motivo: ${rec.detalle}`);
    });

    if (topByRisk.length > 0) {
      lines.push("");
      lines.push("Soporte numerico:");
      topByRisk.slice(0, 3).forEach((p) => {
        lines.push(`- ${labelOf(p)}: stock ${p.stock_actual}, consumo ${formatUnits(p.consumo_estimado_diario)}/dia, riesgo ${p.nivel_riesgo}.`);
      });
    }

    return lines.join("\n");
  }

  if (intentScores.trend > 0) {
    const lines = [
      "Resumen ejecutivo:",
      `En este momento tengo ${subiendo.length} producto(s) subiendo, ${estables.length} estables y ${bajando.length} bajando.`,
      "",
      "Datos exactos:",
    ];

    if (subiendo.length > 0) {
      lines.push(`Los que mejor vienen creciendo son ${joinNatural(subiendo.slice(0, 3).map((p) => labelOf(p)))}.`);
    }

    if (bajando.length > 0) {
      lines.push(`Los que muestran más enfríamiento son ${joinNatural(bajando.slice(0, 3).map((p) => labelOf(p)))}.`);
    }

    if (revenueForecast) {
      lines.push(`En ingresos, la tendencia general está ${trendText(revenueForecast.summary.tendencia)} y la proyección del horizonte actual (${revenueForecast.horizon_days} días) es ${formatCurrency(revenueForecast.summary.proximo_horizonte)}.`);
    }

    lines.push("");
    lines.push("Interpretación:");
    lines.push("En términos simples: la tendencia te ayuda a ver si conviene acelerar compras, mantenerte igual o ser más conservador.");
    return lines.join("\n");
  }

  if (intentScores.summary > 0) {
    const s = revenueForecast?.summary;
    const lines = [
      "Resumen ejecutivo:",
      `Ahora mismo el negocio tiene ${predictions.length} productos analizados: ${withHistory.length} con historial y ${noHistory.length} sin historial suficiente.`,
      "",
      "Datos exactos:",
      `- Productos sin stock: ${outOfStock.length}`,
      `- Riesgo crítico: ${criticos.length}`,
      `- En atención: ${atencion.length}`,
      `- Alta demanda: ${highDemand.length}`,
      `- Tendencia subiendo: ${subiendo.length}`,
      `- Tendencia estable: ${estables.length}`,
      `- Tendencia bajando: ${bajando.length}`,
    ];

    if (s) {
      lines.push(`- Proyección de ingresos horizonte actual (${revenueForecast?.horizon_days ?? 30} días): ${formatCurrency(s.proximo_horizonte)}`);
      lines.push(`- Variación estimada vs último horizonte: ${formatPercent(s.crecimiento_estimado_horizonte_pct)}`);
    }

    lines.push("");
    lines.push("Interpretación:");
    if (outOfStock.length > 0 || criticos.length > 0) {
      lines.push("La prioridad más clara es reponer los productos con riesgo alto para no perder ventas.");
    } else {
      lines.push("No veo alertas graves en este momento; el panorama general es bastante estable.");
    }

    lines.push("");
    lines.push("Recomendación:");
    lines.push("Si quieres, después de este resumen puedes preguntarme por ingresos, riesgo, tendencias o por un producto específico y te lo explico con más detalle.");
    return lines.join("\n\n");
  }

  if (mentionedProducts.length > 0) return buildProductDetailResponseV2(mentionedProducts[0]);

  return [
    "Puedo ayudarte a revisar ingresos, stock, demanda, tendencias y recomendaciones del negocio.",
    "",
    "Si el gerente necesita una explicación más clara, puedes preguntarme cualquiera de estas cosas y yo le respondo en lenguaje sencillo:",
    "",
    '- "Qué está pasando con el negocio este mes"',
    '- "Qué significa para el negocio la proyección del próximo mes"',
    '- "Qué recomiendas hacer ahora"',
    '- "Dame un resumen general del negocio y explícamelo fácil"',
    '- "Cuánto se proyecta ingresar el próximo mes y qué significa ese número"',
    '- "Cuánto se espera vender la próxima semana"',
    '- "Qué productos están en riesgo de agotarse y cuáles son los más urgentes"',
    '- "Qué productos tienen más demanda y por qué son importantes"',
    '- "Qué debo reponer primero y cuál sería el orden recomendado"',
    '- "Cómo están las tendencias y qué decisión debería tomar"',
    '- "Cuál es el producto más urgente para reponer esta semana"',
    '- "Cuántos productos están en estado crítico hoy"',
    '- "Compara el próximo mes contra el último mes real"',
    '- "Qué productos sostienen más los ingresos del negocio"',
    '- "Cómo va CV001"',
    '- "Dame detalle de Zapatilla Running Pro"',
    '- "Qué productos no tienen historial y qué implica eso"',
    "",
    "También puedo responder con cifras exactas, por ejemplo:",
    '- "Dame el resumen con números exactos"',
    '- "Qué productos están en riesgo con stock, consumo y días de cobertura"',
    '- "Dame la proyección para junta directiva y área contable"',
    '- "Dame un informe gerencial con cifras exactas"',
    '- "Dame un resumen para contabilidad"',
  ].join("\n");
}

function TipoIcon({ tipo }: { tipo: Recomendación["tipo"] }) {
  if (tipo === "urgente") return <AlertTriangle size={18} />;
  if (tipo === "atencion") return <Zap size={18} />;
  if (tipo === "oportunidad") return <TrendingUp size={18} />;
  return <CheckCircle size={18} />;
}

function EstadoBadge({ p }: { p: Prediction }) {
  if (p.sin_historial) return <span className="pred-estado-badge bajo">Sin historial</span>;
  if (p.stock_actual === 0) return <span className="pred-estado-badge critico">Sin stock</span>;
  if (p.alerta_stock) return <span className="pred-estado-badge critico">Riesgo alto</span>;
  if (p.nivel_riesgo === "critico") return <span className="pred-estado-badge critico">Crítico</span>;
  if (p.nivel_riesgo === "atencion") return <span className="pred-estado-badge alerta">Atención</span>;
  if (p.nivel_riesgo === "vigilancia") return <span className="pred-estado-badge alerta">Vigilancia</span>;
  if (p.alta_demanda) return <span className="pred-estado-badge bien">Alta demanda</span>;
  if (p.tendencia === "bajando") return <span className="pred-estado-badge bajo">Baja demanda</span>;
  return <span className="pred-estado-badge bien">Estable</span>;
}

function DuracionTexto({ p }: { p: Prediction }) {
  if (p.sin_historial) return <span className="pred-sub">Sin datos de venta</span>;
  if (p.stock_actual === 0) return <span className="pred-days-critical">Sin stock</span>;
  if (p.dias_hasta_agotarse >= 999) return <span className="pred-sub">Cobertura amplia</span>;
  if (p.dias_hasta_agotarse <= 7) return <span className="pred-days-critical">~{p.dias_hasta_agotarse} días</span>;
  if (p.dias_hasta_agotarse <= 14) return <span className="pred-days-warn">~{p.dias_hasta_agotarse} días</span>;
  return <span>~{p.dias_hasta_agotarse} días</span>;
}

function TendenciaCell({ t }: { t: Prediction["tendencia"] }) {
  if (t === "subiendo") {
    return (
      <span className="pred-trend-cell">
        <TrendingUp size={14} className="pred-trend-up" /> Subiendo
      </span>
    );
  }
  if (t === "bajando") {
    return (
      <span className="pred-trend-cell">
        <TrendingDown size={14} className="pred-trend-down" /> Bajando
      </span>
    );
  }
  return (
    <span className="pred-trend-cell">
      <Minus size={14} className="pred-trend-stable" /> Estable
    </span>
  );
}

const FEATURE_LABELS: Record<string, string> = {
  lag_7: "Media ventas últimos 7 días",
  lag_30: "Media ventas últimos 30 días",
  weekday: "Día de la semana",
  month: "Mes del año",
  day_of_month: "Día del mes",
  categoria: "Categoría del producto",
  campana: "Campaña comercial",
  temporada_verano: "Temporada verano",
  temporada_escolar: "Inicio escolar",
  temporada_fiestas_patrias: "Fiestas Patrias",
  temporada_navidad: "Navidad / fin de año",
};

function FeatureImportanceChart({ importances }: { importances: FeatureImportance[] }) {
  const max = Math.max(...importances.map((fi) => fi.importance), 0.001);
  return (
    <div className="pred-feature-chart">
      {importances.map((fi, index) => (
        <div key={fi.feature} className="pred-feature-row">
          <span className="pred-feature-label">{FEATURE_LABELS[fi.feature] ?? fi.feature}</span>
          <div className="pred-feature-bar-track">
            <div
              className="pred-feature-bar-fill"
              style={{
                "--target-w": `${(fi.importance / max) * 100}%`,
                animationDelay: `${index * 0.08}s`,
              } as React.CSSProperties}
            />
          </div>
          <span className="pred-feature-pct">{(fi.importance * 100).toFixed(1)}%</span>
        </div>
      ))}
    </div>
  );
}

function DemandAccuracyChart({ predictions }: { predictions: Prediction[] }) {
  const rows = predictions
    .filter(p => !p.sin_historial && p.ventas_30_dias > 0)
    .sort((a, b) => b.ventas_30_dias - a.ventas_30_dias)
    .slice(0, 12);

  if (rows.length === 0) return <p className="pred-sub">Sin datos suficientes para mostrar el gráfico.</p>;

  const max = Math.max(...rows.flatMap(p => [p.ventas_30_dias, p.consumo_estimado_diario * 30]), 1);

  const mape = rows.reduce((sum, p) => {
    const est = p.consumo_estimado_diario * 30;
    return sum + Math.abs(est - p.ventas_30_dias) / p.ventas_30_dias;
  }, 0) / rows.length * 100;

  const mapeColor = mape <= 15 ? "acc-mape-good" : mape <= 30 ? "acc-mape-warn" : "acc-mape-bad";

  return (
    <div className="acc-chart">
      <div className="acc-chart-header">
        <div className="acc-legend">
          <span className="acc-legend-item acc-legend-real">Real (últimos 30 d)</span>
          <span className="acc-legend-item acc-legend-est">Estimado modelo (×30 d)</span>
        </div>
        <span className={`acc-mape-badge ${mapeColor}`}>MAPE {mape.toFixed(1)}%</span>
      </div>
      {rows.map((p, i) => {
        const real = p.ventas_30_dias;
        const est  = p.consumo_estimado_diario * 30;
        return (
          <div key={p.productId} className="acc-row"
            style={{ animationDelay: `${i * 0.05}s` }}>
            <span className="acc-row-name" title={p.nombre}>{p.nombre}</span>
            <div className="acc-bars">
              <div className="acc-bar-wrap">
                <div className="acc-bar-track">
                  <div className="acc-bar-real acc-bar-fill"
                    style={{ "--target-w": `${(real / max) * 100}%` } as React.CSSProperties} />
                </div>
                <span className="acc-bar-val">{real.toFixed(0)}</span>
              </div>
              <div className="acc-bar-wrap">
                <div className="acc-bar-track">
                  <div className="acc-bar-est acc-bar-fill"
                    style={{ "--target-w": `${(est / max) * 100}%` } as React.CSSProperties} />
                </div>
                <span className="acc-bar-val">{est.toFixed(0)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function IreSparkline({ data }: { data: IreHistorialPoint[] }) {
  if (data.length < 2) return null;
  const W = 280, H = 60, PAD = 4;
  const scores = data.map((d) => d.score);
  const minS = Math.min(...scores);
  const maxS = Math.max(...scores);
  const range = maxS - minS || 1;
  const toX = (i: number) => PAD + (i / (data.length - 1)) * (W - PAD * 2);
  const toY = (s: number) => PAD + (1 - (s - minS) / range) * (H - PAD * 2);
  const pts = data.map((d, i) => `${toX(i)},${toY(d.score)}`).join(" ");
  const last = data[data.length - 1];
  const lx = toX(data.length - 1);
  const ly = toY(last.score);
  const colorMap: Record<string, string> = {
    bajo: "#22c55e", moderado: "#f59e0b", alto: "#ef4444", critico: "#7c3aed",
  };
  const stroke = colorMap[last.nivel] ?? "#94a3b8";
  return (
    <div className="ire-sparkline-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="ire-sparkline-svg" aria-label="Evolución IRE">
        <polyline points={pts} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" opacity="0.85" />
        <circle cx={lx} cy={ly} r="3.5" fill={stroke} />
      </svg>
      <span className="ire-sparkline-label">
        Últimos {data.length} días
        {last.version ? ` · IRE v${last.version}` : ""}
        {last.detalle?.total_con_historial != null ? ` · ${last.detalle.total_con_historial} con historial` : ""}
      </span>
    </div>
  );
}

function IreHistoryPanel({ data }: { data: IreHistorialPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="dash-card">
        <div className="dash-card-header">
          <div>
            <p className="dash-card-kicker">Evolución histórica</p>
            <h2 className="dash-card-title">Historial del riesgo empresarial</h2>
          </div>
        </div>
        <div className="pred-empty-card">
          <p className="pred-empty-title">Aún no hay historial IRE guardado</p>
          <p className="pred-empty-copy">
            El historial se registra automáticamente cuando el servicio calcula el IRE en una predicción combinada.
          </p>
        </div>
      </div>
    );
  }

  const first = data[0];
  const last = data[data.length - 1];
  const delta = last.score - first.score;
  const avg = data.reduce((sum, item) => sum + item.score, 0) / data.length;
  const max = data.reduce((best, item) => item.score > best.score ? item : best, data[0]);
  const min = data.reduce((best, item) => item.score < best.score ? item : best, data[0]);
  const rows = [...data].reverse().slice(0, 10);

  return (
    <div className="dash-card">
      <div className="dash-card-header">
        <div>
          <p className="dash-card-kicker">Evolución histórica</p>
          <h2 className="dash-card-title">Historial del riesgo empresarial</h2>
          <p className="pred-section-note">
            Cada registro conserva el score, nivel, dimensiones y snapshot de auditoría del IRE calculado por el servicio IA.
          </p>
        </div>
      </div>

      <div className="pred-model-meta-grid" style={{ marginBottom: "1rem" }}>
        <div className="pred-model-meta-item">
          <span className="pred-sub">Último registro</span>
          <strong>{last.fecha} · {last.score}/100</strong>
        </div>
        <div className="pred-model-meta-item">
          <span className="pred-sub">Cambio del período</span>
          <strong>{delta === 0 ? "sin cambio" : `${delta > 0 ? "+" : ""}${delta} pts`}</strong>
        </div>
        <div className="pred-model-meta-item">
          <span className="pred-sub">Promedio histórico</span>
          <strong>{avg.toFixed(1)}/100</strong>
        </div>
        <div className="pred-model-meta-item">
          <span className="pred-sub">Rango observado</span>
          <strong>{min.score}–{max.score} pts</strong>
        </div>
      </div>

      {data.length >= 2 && (
        <div style={{ marginBottom: "1rem" }}>
          <IreSparkline data={data} />
        </div>
      )}

      <div className="admin-table-wrap">
        <table className="admin-table" style={{ fontSize: "12px" }}>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Score</th>
              <th>Nivel</th>
              <th>Versión</th>
              <th>Stock</th>
              <th>Ingresos</th>
              <th>Demanda</th>
              <th>Productos con historial</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.fecha}>
                <td>{item.fecha}</td>
                <td><strong>{item.score}/100</strong></td>
                <td>
                  <span className={`ire-nivel ire-nivel-${item.nivel}`}>
                    {IRE_NIVEL_LABELS[item.nivel] ?? item.nivel}
                  </span>
                </td>
                <td>{item.version ? `v${item.version}` : "—"}</td>
                <td>{item.dimensiones?.riesgo_stock ?? "—"}</td>
                <td>{item.dimensiones?.riesgo_ingresos ?? "—"}</td>
                <td>{item.dimensiones?.riesgo_demanda ?? "—"}</td>
                <td>{item.detalle?.total_con_historial ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DriftBadge({ score }: { score: number | undefined }) {
  if (score === undefined) return null;
  if (score < 0.35) return null;
  if (score < 0.65) return <span className="pred-drift-badge medio" title={`Drift: ${score}`}>drift medio</span>;
  return <span className="pred-drift-badge alto" title={`Drift: ${score}`}>drift alto</span>;
}

function WeeklyChart({ data }: { data: WeekPoint[] }) {
  const max = Math.max(...data.map((item) => item.unidades), 1);
  return (
    <div className="pred-chart-bars">
      {data.map((item, index) => (
        <div key={item.semana} className="pred-chart-col">
          <span className="pred-chart-val">{item.unidades > 0 ? item.unidades : ""}</span>
          <div className="pred-chart-track">
            <div
              className="pred-chart-fill"
              style={{
                "--target-h": `${Math.max((item.unidades / max) * 100, item.unidades > 0 ? 4 : 0)}%`,
                animationDelay: `${index * 0.06}s`,
              } as React.CSSProperties}
            />
          </div>
          <span className="pred-chart-label">{item.semana}</span>
        </div>
      ))}
    </div>
  );
}

function RevenueLineChart({ history, forecast }: { history: RevenuePoint[]; forecast: RevenuePoint[] }) {
  const histRef = useRef<SVGPolylineElement>(null);

  useEffect(() => {
    const el = histRef.current;
    if (!el) return;
    const len = el.getTotalLength();
    el.style.strokeDasharray = String(len);
    el.style.strokeDashoffset = String(len);
    el.getBoundingClientRect(); // fuerza reflow para que el navegador registre el estado inicial
    el.style.transition = "stroke-dashoffset 1.1s cubic-bezier(0.16,1,0.3,1)";
    el.style.strokeDashoffset = "0";
  }, [history, forecast]);

  const points = [...history, ...forecast];
  if (points.length === 0) return null;

  const width = 920;
  const height = 250;
  const paddingLeft = 82;
  const paddingRight = 22;
  const paddingTop = 18;
  const paddingBottom = 36;
  const maxValue = Math.max(...points.map((point) => point.ingresos), 1);
  const innerWidth = width - paddingLeft - paddingRight;
  const innerHeight = height - paddingTop - paddingBottom;
  const step = points.length > 1 ? innerWidth / (points.length - 1) : 0;
  const xAt = (index: number) => paddingLeft + index * step;
  const yAt = (value: number) => paddingTop + innerHeight - (value / maxValue) * innerHeight;
  const toPolyline = (segment: RevenuePoint[], offset: number) =>
    segment.map((point, index) => `${xAt(offset + index)},${yAt(point.ingresos)}`).join(" ");
  const labelStep = Math.max(1, Math.floor(points.length / 6));
  const splitIndex = history.length;
  const splitX = splitIndex > 0 ? xAt(splitIndex - 1) : null;

  return (
    <div className="pred-revenue-chart-wrap">
      <div className="pred-revenue-legend">
        <span><i className="pred-legend-line hist" /> Histórico</span>
        <span><i className="pred-legend-line proj" /> Proyección</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="pred-revenue-chart" role="img" aria-label="Histórico y proyección de ingresos">
        <rect x="0" y="0" width={paddingLeft - 10} height={height} className="pred-revenue-label-bg" />

        {[0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = paddingTop + innerHeight - innerHeight * ratio;
          return (
            <line key={ratio} x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} className="pred-revenue-grid-line" />
          );
        })}

        {history.length > 1 && (
          <polyline ref={histRef} points={toPolyline(history, 0)} className="pred-revenue-line pred-revenue-line-hist" />
        )}
        {forecast.length > 0 && (
          <polyline points={toPolyline(forecast, splitIndex)} className="pred-revenue-line pred-revenue-line-proj" />
        )}
        {splitX !== null && (
          <line x1={splitX} y1={paddingTop} x2={splitX} y2={height - paddingBottom} className="pred-revenue-split-line" />
        )}

        {[0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = paddingTop + innerHeight - innerHeight * ratio;
          const label = formatCurrency(maxValue * ratio);
          return (
            <text
              key={`label-${ratio}`}
              x={paddingLeft - 12}
              y={y - 4}
              className="pred-revenue-grid-label"
              textAnchor="end"
            >
              {label}
            </text>
          );
        })}

        {points.map((point, index) => {
          const showLabel = index % labelStep === 0 || index === points.length - 1 || index === splitIndex - 1;
          return (
            <g key={`${point.fecha}-${point.tipo}`}>
              <circle
                cx={xAt(index)}
                cy={yAt(point.ingresos)}
                r={index === points.length - 1 ? 4 : 3}
                className={point.tipo === "historico" ? "pred-revenue-dot-hist" : "pred-revenue-dot-proj"}
              />
              {showLabel && (
                <text x={xAt(index)} y={height - 10} className="pred-revenue-axis-label" textAnchor="middle">
                  {point.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function RiskAlertCard({ prediction }: { prediction: Prediction }) {
  return (
    <article className="pred-alert-card">
      <div className="pred-alert-header">
        <AlertTriangle size={18} className="pred-trend-down" />
        <span className="pred-alert-days">
          {prediction.stock_actual === 0 ? "Sin stock" : `${prediction.dias_hasta_agotarse} días de cobertura`}
        </span>
      </div>
      {prediction.codigo && <p className="pred-product-code">{prediction.codigo}</p>}
      <p className="pred-alert-name">{prediction.nombre}</p>
      <p className="pred-alert-cat">{prediction.categoria || "Sin categoría"}</p>
      <div className="pred-alert-stats">
        <div>
          <span className="pred-sub">Stock</span>
          <p className="pred-alert-stat-val">{prediction.stock_actual}</p>
        </div>
        <div>
          <span className="pred-sub">Consumo</span>
          <p className="pred-alert-stat-val">{formatUnits(prediction.consumo_estimado_diario)}/dia</p>
        </div>
        <div>
          <span className="pred-sub">Ult. 30 días</span>
          <p className="pred-alert-stat-val">{formatUnits(prediction.ventas_30_dias)}</p>
        </div>
      </div>
    </article>
  );
}

function exportPredictionsCSV(predictions: Prediction[], horizon: HorizonOption) {
  const headers = [
    "Código", "Nombre", "Categoría", "Stock actual",
    `Proyección (${horizon} días)`, "Por día", "Por semana",
    "Días hasta agotarse", "Tendencia", "Nivel riesgo", "Confianza (%)",
  ];
  const rows = predictions
    .filter((p) => !p.sin_historial)
    .map((p) => [
      p.codigo,
      p.nombre,
      p.categoria,
      p.stock_actual,
      p.prediccion_unidades,
      p.prediccion_diaria,
      p.prediccion_semanal,
      p.dias_hasta_agotarse >= 999 ? "Indefinido" : p.dias_hasta_agotarse,
      p.tendencia,
      p.nivel_riesgo,
      p.confianza,
    ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `predicciones-${horizon}d-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function AdminPredictions() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [weeklyChart, setWeeklyChart] = useState<WeekPoint[]>([]);
  const [revenueForecast, setRevenueForecast] = useState<RevenueForecast | null>(null);
  const [revenueLoading, setRevenueLoading] = useState(false);
  const [ireData, setIreData] = useState<IreData | null>(null);
  const [ireProyectado, setIreProyectado] = useState<IreData | null>(null);
  const [ireHistorial, setIreHistorial] = useState<IreHistorialPoint[]>([]);
  const [modeloMeta, setModeloMeta] = useState<ModeloMeta | null>(null);
  const [modelMetrics, setModelMetrics] = useState<ModelMetrics | null>(null);
  const [horizon,    setHorizon]    = useState<HorizonOption>(() => loadPref("pred_horizon",    HORIZON_OPTIONS, 30));
  const [history,    setHistory]    = useState<HistoryOption>(() => loadPref("pred_history",    HISTORY_OPTIONS, 120));
  const [alertDays,  setAlertDays]  = useState<AlertOption>(()  => loadPref("pred_alert_days", ALERT_OPTIONS,   14));
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<PredictionTab>("resumen");
  const [tabDirection, setTabDirection] = useState(1);
  const [rankingPeriod, setRankingPeriod] = useState<RankingPeriod>(30);
  const [weeklyChartFetched, setWeeklyChartFetched] = useState(false);
  const [weeklyChartLoading, setWeeklyChartLoading] = useState(false);
  const [modelMetricsFetched, setModelMetricsFetched] = useState(false);
  const [modelMetricsLoading, setModelMetricsLoading] = useState(false);
  const [ireHistorialFetched, setIreHistorialFetched] = useState(false);
  const [aiWarnings, setAiWarnings] = useState<string[]>([]);
  const [campanaData, setCampanaData] = useState<CampanaActiveResponse | null>(null);
  const [campanaLoading, setCampanaLoading] = useState(false);
  const [campanaFetched, setCampanaFetched] = useState(false);
  const [campanaFeedbackLoading, setCampanaFeedbackLoading] = useState(false);
  const [learningStats, setLearningStats] = useState<LearningStats | null>(null);
  const [learningStatsFetched, setLearningStatsFetched] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const changeTab = useCallback((nextTab: PredictionTab) => {
    if (nextTab === activeTab) return;
    const currentIndex = TAB_SEQUENCE.indexOf(activeTab);
    const nextIndex = TAB_SEQUENCE.indexOf(nextTab);
    setTabDirection(nextIndex >= currentIndex ? 1 : -1);
    setActiveTab(nextTab);
  }, [activeTab]);

  useEffect(() => { localStorage.setItem("pred_horizon",    String(horizon));   }, [horizon]);
  useEffect(() => { localStorage.setItem("pred_history",    String(history));   }, [history]);
  useEffect(() => { localStorage.setItem("pred_alert_days", String(alertDays)); }, [alertDays]);

  // F-03: warm-up en mount para reducir cold-start de Render (ISO/IEC 25010 §5.2)
  useEffect(() => { wakeAIService(); }, []);

  const load = useCallback(async (selectedHorizon: HorizonOption, selectedHistory: HistoryOption) => {
    setLoading(true);
    setRevenueLoading(true);
    setError(null);
    setRevenueForecast(null);
    setAiWarnings([]);
    try {
      const res = await fetchAI(`/api/predict/combined?horizon=${selectedHorizon}&history=${selectedHistory}`);
      if (!res.ok) throw new Error("Error al conectar con el servicio de IA.");
      const data = await res.json();
      setPredictions(data.demand?.predictions ?? []);
      setModeloMeta(data.demand?.modelo_meta ?? null);
      setRevenueForecast(data.revenue ?? null);
      setIreData(data.ire ?? null);
      setIreProyectado(data.ire_proyectado ?? null);
      setAiWarnings(Array.isArray(data.warnings) ? data.warnings : []);
    } catch (cause) {
      setError(describeAIError(cause));
      setPredictions([]);
      setModeloMeta(null);
      setIreData(null);
      setIreProyectado(null);
      setRevenueForecast(null);
    } finally {
      setLoading(false);
      setRevenueLoading(false);
    }
  }, []);

  const loadWeeklyChart = useCallback(async () => {
    setWeeklyChartLoading(true);
    try {
      const res = await fetchAI("/api/sales/weekly-chart?weeks=8");
      if (res.ok) {
        const data = await res.json();
        setWeeklyChart(data.chart ?? []);
      }
    } catch { /* silencioso — gráfico semanal es complementario */ }
    setWeeklyChartFetched(true);
    setWeeklyChartLoading(false);
  }, []);

  const loadModelMetrics = useCallback(async () => {
    setModelMetricsLoading(true);
    try {
      const res = await fetchAI("/api/model/metrics");
      if (res.ok) setModelMetrics(await res.json());
    } catch { /* silencioso */ }
    setModelMetricsFetched(true);
    setModelMetricsLoading(false);
  }, []);

  const loadIreHistorial = useCallback(async () => {
    try {
      const res = await fetchAI("/api/ire/historial?days=60");
      if (res.ok) {
        const data = await res.json();
        setIreHistorial(data.historial ?? []);
      }
    } catch { /* silencioso — historial es complementario */ }
    setIreHistorialFetched(true);
  }, []);

  const loadCampana = useCallback(async () => {
    setCampanaLoading(true);
    try {
      const res = await fetchAI("/api/campaign/active");
      if (res.ok) setCampanaData(await res.json());
    } catch { /* silencioso */ }
    setCampanaFetched(true);
    setCampanaLoading(false);
  }, []);

  const loadLearningStats = useCallback(async () => {
    try {
      const res = await fetchAI("/api/campaign/learning-stats");
      if (res.ok) setLearningStats(await res.json());
    } catch { /* silencioso — panel complementario */ }
    setLearningStatsFetched(true);
  }, []);

  const submitCampanaFeedback = useCallback(async (
    campanaId: number,
    accion: "confirmar" | "descartar" | "nota",
    nota?: string,
  ) => {
    setCampanaFeedbackLoading(true);
    try {
      await fetchAI("/api/campaign/feedback", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ campana_id: campanaId, accion, nota }),
      });
      // Refrescar campaña y estadísticas de aprendizaje en paralelo
      await Promise.all([loadCampana(), loadLearningStats()]);
      setLearningStatsFetched(true);
    } catch { /* silencioso */ }
    setCampanaFeedbackLoading(false);
  }, [loadCampana, loadLearningStats]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(horizon, history), 0);
    return () => window.clearTimeout(timer);
  }, [horizon, history, load]);

  useEffect(() => {
    const timers: ReturnType<typeof window.setTimeout>[] = [];
    if (activeTab === "ventas" && !weeklyChartFetched && !weeklyChartLoading) {
      timers.push(window.setTimeout(() => void loadWeeklyChart(), 0));
    }
    if (activeTab === "modelo" && !modelMetricsFetched && !modelMetricsLoading && modeloMeta) {
      timers.push(window.setTimeout(() => void loadModelMetrics(), 0));
    }
    if ((activeTab === "resumen" || activeTab === "ire") && !ireHistorialFetched) {
      timers.push(window.setTimeout(() => void loadIreHistorial(), 0));
    }
    if (activeTab === "campanas" && !campanaFetched && !campanaLoading) {
      timers.push(window.setTimeout(() => void loadCampana(), 0));
    }
    if (activeTab === "campanas" && !learningStatsFetched) {
      timers.push(window.setTimeout(() => void loadLearningStats(), 0));
    }
    return () => {
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [activeTab, weeklyChartFetched, weeklyChartLoading, modelMetricsFetched, modelMetricsLoading, modeloMeta, loadWeeklyChart, loadModelMetrics, ireHistorialFetched, loadIreHistorial, campanaFetched, campanaLoading, loadCampana, learningStatsFetched, loadLearningStats]);

  const refreshPredictions = useCallback(async () => {
    setWeeklyChartFetched(false);
    setModelMetricsFetched(false);
    setIreHistorialFetched(false);
    setWeeklyChart([]);
    setModelMetrics(null);
    setIreHistorial([]);
    await invalidateAICache();
    await load(horizon, history);
  }, [horizon, history, load]);

  const predictionsForView = useMemo(
    () =>
      predictions.map((item) => {
        if (item.sin_historial || item.consumo_estimado_diario <= 0) {
          return { ...item, alerta_stock: false, riesgo_agotamiento: false };
        }

        const withinThreshold = item.stock_actual === 0 || item.dias_hasta_agotarse <= alertDays;
        return {
          ...item,
          alerta_stock: withinThreshold,
          riesgo_agotamiento: item.alta_demanda && withinThreshold,
        };
      }),
    [predictions, alertDays],
  );

  const recomendaciones = useMemo(() => generarRecomendaciónes(predictionsForView), [predictionsForView]);

  const riskAlerts = useMemo(
    () =>
      predictionsForView
        .filter((item) => !item.sin_historial && (item.alerta_stock || (item.stock_actual === 0 && item.alta_demanda)))
        .sort((a, b) => {
          if (a.stock_actual === 0 && b.stock_actual !== 0) return -1;
          if (a.stock_actual !== 0 && b.stock_actual === 0) return 1;
          return a.dias_hasta_agotarse - b.dias_hasta_agotarse;
        })
        .slice(0, 6),
    [predictionsForView]
  );

  const porOrden = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = query
      ? predictionsForView.filter((item) => {
          const haystack = [item.codigo, item.nombre, item.categoria].join(" ").toLowerCase();
          return haystack.includes(query);
        })
      : predictionsForView;

    return [...filtered].sort((a, b) => {
      const priority = (item: Prediction) => {
        if (item.sin_historial) return 5;
        if (item.stock_actual === 0 && item.alta_demanda) return 0;
        if (item.alerta_stock) return 1;
        return 2 + riskPriority[item.nivel_riesgo];
      };
      return priority(a) - priority(b) || b.consumo_estimado_diario - a.consumo_estimado_diario;
    });
  }, [predictionsForView, search]);

  const normalizedRevenueForecast = useMemo(() => {
    const summary = revenueForecast?.summary;
    if (!summary || !revenueForecast) return null;

    const selectedHorizon = revenueForecast.horizon_days;
    const proximoHorizonte =
      summary.proximo_horizonte
      ?? (selectedHorizon <= 7
        ? summary.proximo_7_dias
        : summary.proximo_30_dias);

    const historyWindowAvailable = revenueForecast.history.length >= selectedHorizon;
    const ultimoHorizonte =
      summary.ultimo_horizonte
      ?? (selectedHorizon >= 30
        ? summary.ultimo_30_dias
        : historyWindowAvailable
        ? Number(
            revenueForecast.history
              .slice(-selectedHorizon)
              .reduce((total, point) => total + point.ingresos, 0)
              .toFixed(2),
          )
        : Number(((summary.promedio_diario_historico ?? 0) * selectedHorizon).toFixed(2)));

    const crecimientoHorizonte =
      summary.crecimiento_estimado_horizonte_pct
      ?? (selectedHorizon >= 30
        ? summary.crecimiento_estimado_pct
        : ultimoHorizonte > 0
        ? Number((((proximoHorizonte - ultimoHorizonte) / ultimoHorizonte) * 100).toFixed(1))
        : 0);

    return {
      ...revenueForecast,
      summary: {
        ...summary,
        proximo_horizonte: proximoHorizonte,
        ultimo_horizonte: ultimoHorizonte,
        crecimiento_estimado_horizonte_pct: crecimientoHorizonte,
      },
    };
  }, [revenueForecast]);

  const revenueSummary = normalizedRevenueForecast?.summary ?? null;
  // Análisis ABC por ingreso histórico (A = 80%, B = 15%, C = 5%)
  const abcData = useMemo(() => {
    const withH = predictionsForView.filter(p => !p.sin_historial && p.total_vendido_historico > 0);
    const sorted = [...withH].sort((a, b) => (b.total_vendido_historico * b.precio) - (a.total_vendido_historico * a.precio));
    const totalRev = sorted.reduce((s, p) => s + p.total_vendido_historico * p.precio, 0);
    type Entry = (typeof sorted)[0] & { abc: "A" | "B" | "C" };
    return sorted.reduce<{ items: Entry[]; cum: number }>(
      ({ items, cum }, p) => {
        const newCum = cum + p.total_vendido_historico * p.precio;
        const pct = totalRev > 0 ? newCum / totalRev : 0;
        const abc = (pct <= 0.80 ? "A" : pct <= 0.95 ? "B" : "C") as "A" | "B" | "C";
        return { cum: newCum, items: [...items, { ...p, abc }] };
      },
      { items: [], cum: 0 }
    ).items;
  }, [predictionsForView]);

  const enRiesgo = predictionsForView.filter((item) => !item.sin_historial && item.alerta_stock).length;
  const sinStock = predictionsForView.filter((item) => !item.sin_historial && item.stock_actual === 0).length;
  const altaDemanda = predictionsForView.filter((item) => !item.sin_historial && item.alta_demanda).length;
  const conHistorial = predictionsForView.filter((item) => !item.sin_historial).length;
  const sinHistorial = predictionsForView.filter((item) => item.sin_historial).length;
  const sobreStock = predictionsForView.filter((item) => !item.sin_historial && isOverstocked(item)).length;
  const rotacionDebil = predictionsForView.filter((item) => !item.sin_historial && isSlowMoving(item)).length;
  const promedioCobertura = predictionsForView
    .filter((item) => !item.sin_historial && item.dias_hasta_agotarse < 999)
    .reduce((acc, item, _, arr) => acc + (item.dias_hasta_agotarse / Math.max(arr.length, 1)), 0);

  const productoMotor = useMemo(
    () =>
      [...predictionsForView]
        .filter((item) => !item.sin_historial)
        .sort((a, b) => b.consumo_estimado_diario - a.consumo_estimado_diario)[0] ?? null,
    [predictionsForView],
  );

  const resumenEjecutivo = useMemo(() => {
    const growth = revenueSummary?.crecimiento_estimado_horizonte_pct ?? 0;
    const tendencia = revenueSummary?.tendencia ?? "estable";
    const confianza = revenueSummary?.confianza ?? 0;
    const principalRiesgo = riskAlerts[0] ?? null;
    const inventarioPesado = sobreStock >= Math.max(2, Math.ceil(conHistorial * 0.25));
    const negocioDebil = growth <= -8 || ((growth < 3 || tendencia === "bajando") && inventarioPesado && altaDemanda <= 1);

    let titular = "El negocio necesita una lectura más clara antes de tomar decisiones.";
    if (revenueSummary && negocioDebil) {
      titular = "El negocio muestra señales de enfríamiento y stock acumulado; no conviene leer este escenario como una operación sana.";
    } else if (revenueSummary && growth >= 8 && enRiesgo === 0 && !inventarioPesado) {
      titular = "La venta proyectada viene bien y el foco principal es sostener stock y margen.";
    } else if (revenueSummary && growth >= 0 && enRiesgo > 0) {
      titular = "La venta puede sostenerse, pero ya hay productos que requieren reposición para no frenar el ritmo.";
    } else if (revenueSummary && growth < 0 && enRiesgo === 0) {
      titular = "La proyección se enfría y conviene ajustar compras y seguimiento comercial antes de cerrar el periodo.";
    } else if (revenueSummary && growth < 0 && enRiesgo > 0) {
      titular = "El negocio se desacelera y, al mismo tiempo, hay alertas de inventario que requieren reacción inmediata.";
    } else if (enRiesgo > 0) {
      titular = "Hay alertas operativas activas y el panel recomienda priorizar inventario antes de comprar de nuevo.";
    }

    const detalle = revenueSummary
      ? `Para los próximos ${horizon} días se estiman ${formatCurrency(revenueSummary.proximo_horizonte)} con una tendencia ${formatTrendLabel(tendencia).toLowerCase()} y una confianza ${formatConfidenceLabel(confianza).toLowerCase()}.`
      : `Todavía no hay una proyección financiera disponible, pero ya se puede revisar el estado del inventario y la demanda.`;

    const lecturaFinanciera = revenueSummary
      ? negocioDebil
        ? `Aúnque no haya quiebres de stock, el ritmo proyectado luce flojo: se estiman ${formatCurrency(revenueSummary.proximo_horizonte)} y el crecimiento frente al último tramo es ${formatPercent(growth)}.`
        : growth >= 0
        ? `Si el ritmo actual se mantiene, el negocio podría cerrar el horizonte con ${formatCurrency(revenueSummary.proximo_horizonte)}, que representa ${formatPercent(growth)} frente al mismo tramo anterior.`
        : `Si no se corrige el ritmo actual, el negocio podría cerrar en ${formatCurrency(revenueSummary.proximo_horizonte)}, es decir ${formatPercent(growth)} frente al mismo tramo anterior.`
      : "Aún no se cuenta con una lectura financiera consolidada para este horizonte.";

    const lecturaInventario = principalRiesgo
      ? `${principalRiesgo.nombre} es hoy el caso más sensible: tiene ${principalRiesgo.stock_actual} unidades y una cobertura aproximada de ${principalRiesgo.dias_hasta_agotarse} días.`
      : inventarioPesado
      ? `No faltan productos, pero hay ${sobreStock} con stock acumulado y ${rotacionDebil} con rotación débil. La cobertura promedio ronda ${Math.round(promedioCobertura || 0)} días.`
      : enRiesgo === 0
      ? `No hay productos en riesgo para este horizonte. La cobertura de stock luce controlada.`
      : `Hay ${enRiesgo} productos que necesitan seguimiento de stock (umbral: ${alertDays} días).`;

    const lecturaPortafolio = productoMotor
      ? `${productoMotor.nombre} lidera la rotación actual con un consumo estimado de ${formatUnits(productoMotor.consumo_estimado_diario)} unidades por día.`
      : conHistorial > 0
      ? `El portafolio ya cuenta con ${conHistorial} productos con historial suficiente para analizar comportamiento.`
      : `Aún no hay historial suficiente para identificar productos motores del negocio.`;

    const recomendacion = principalRiesgo
      ? `Reponer primero ${principalRiesgo.nombre}, vigilar los productos en riesgo y luego revisar el mix de compra según demanda real.`
      : inventarioPesado
      ? `Frenar compras en los productos de baja rotación, revisar descuentos o salida comercial y comprar solo lo que tenga demanda comprobada.`
      : altaDemanda > 0
      ? `Asegurar inventario en los productos de mayor salida y evitar sobrecomprar en los que vienen bajando.`
      : `Mantener seguimiento semanal y usar este panel como base para comparar lo proyectado contra lo real.`;

    return {
      titular,
      detalle,
      lecturaFinanciera,
      lecturaInventario,
      lecturaPortafolio,
      recomendacion,
    };
  }, [alertDays, altaDemanda, conHistorial, enRiesgo, horizon, productoMotor, promedioCobertura, revenueSummary, riskAlerts, rotacionDebil, sobreStock]);

  const distribucionInventario = useMemo(() => {
    const items = [
      {
        label: "Crítico",
        count: predictionsForView.filter((item) => !item.sin_historial && (item.stock_actual === 0 || item.nivel_riesgo === "critico")).length,
        color: "#ef4444",
      },
      {
        label: "Atención",
        count: predictionsForView.filter((item) => !item.sin_historial && item.nivel_riesgo === "atencion").length,
        color: "#f59e0b",
      },
      {
        label: "Vigilancia",
        count: predictionsForView.filter((item) => !item.sin_historial && item.nivel_riesgo === "vigilancia").length,
        color: "#d97706",
      },
      {
        label: "Estable",
        count: predictionsForView.filter((item) => !item.sin_historial && item.nivel_riesgo === "estable").length,
        color: "#10b981",
      },
      {
        label: "Sin historial",
        count: predictionsForView.filter((item) => item.sin_historial).length,
        color: "var(--text-muted)",
      },
    ];

    const max = Math.max(1, ...items.map((item) => item.count));
    return items.map((item) => ({
      ...item,
      width: `${Math.max((item.count / max) * 100, item.count > 0 ? 12 : 0)}%`,
    }));
  }, [predictionsForView]);

  const assistantContext = useMemo(
    () => buildAssistantContextV2(predictionsForView),
    [predictionsForView],
  );

  const handleSend = useCallback((message: string) => {
    const trimmed = message.trim();
    if (!trimmed) return;
    const userMsg: ChatMessage = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setAiLoading(true);
    const reply = generateAIResponseV2(trimmed, predictionsForView, normalizedRevenueForecast, assistantContext);
    setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    setAiLoading(false);
  }, [assistantContext, normalizedRevenueForecast, predictionsForView]);

  const assistantQuickActions = useMemo<PromptPanelQuickAction[]>(
    () => [
      { label: "Resumen gerencia", prompt: "Dame un resumen ejecutivo para gerencia con las cifras clave del panel." },
      { label: "¿Qué reponer?", prompt: "¿Qué producto debo reponer primero según riesgo y demanda?" },
      { label: "Ingresos vs. periodo", prompt: "Compara el próximo horizonte proyectado con el último período real de ingresos." },
      { label: "Alertas de stock", prompt: "Lista los productos en mayor riesgo de inventario y qué harías." },
      { label: "Mayor demanda", prompt: "¿Cuáles son los productos con más demanda ahora?" },
      { label: "Sobrestock", prompt: "¿Dónde estamos acumulando sobrestock o rotación lenta?" },
      { label: "Confianza del modelo", prompt: "Explícame qué tan confiable es la proyección y por qué." },
      { label: "Producto motor", prompt: "¿Cuál es el producto motor y cómo lo defenderías?" },
      { label: "Sin historial", prompt: "¿Qué productos siguen sin historial suficiente y qué implica?" },
    ],
    [],
  );

  const assistantQuestionIdeas = useMemo(
    () => [
      "¿Qué combinación de productos debería comprar primero para no frenar ventas?",
      "Si mantengo este ritmo, ¿qué lectura le darías a la junta directiva?",
      "¿Dónde estoy inmovilizando capital en inventario con poca salida?",
      "¿Qué me preocupa más hoy: stock, ingresos o mezcla de portafolio?",
    ],
    [],
  );

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="success-spinner" />
        <p>Analizando ventas, ingresos e inventario...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pred-error-card">
        <AlertTriangle size={32} />
        <h3>No se pudo conectar con el servicio de IA</h3>
        <p>{error}</p>
        <button type="button" className="btn btn-primary" onClick={() => void refreshPredictions()}>
          <RefreshCw size={15} /> Reintentar
        </button>
      </div>
    );
  }

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
            <button type="button" className="btn btn-ghost pred-refresh" onClick={() => void refreshPredictions()}>
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

      {/* ── Pestaña: Resumen ─────────────────────────────────── */}
      {activeTab === "resumen" && (
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
              className={`ire-hero ire-hero-${ireData.nivel}`}
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              <div className="ire-left">
                <div className="ire-label">Índice de Riesgo Empresarial</div>
                <div className="ire-score-row">
                  <span className="ire-score">{ireData.score}</span>
                  <span className="ire-score-max">/100</span>
                  <span className={`ire-nivel ire-nivel-${ireData.nivel}`}>
                    {IRE_NIVEL_LABELS[ireData.nivel] ?? ireData.nivel}
                  </span>
                </div>
                <p className="ire-desc">{ireData.descripcion}</p>
              </div>
              <div className="ire-dims">
                {IRE_DIM_CONFIG.map(({ key, label }) => {
                  const val = ireData.dimensiones[key];
                  const peso = ireData.pesos[key];
                  const pesoLabel = `${label} ${Math.round(peso * 100)}%`;
                  return (
                  <div key={key} className="ire-dim">
                    <div className="ire-dim-label">{pesoLabel}</div>
                    <div className="ire-dim-bar-bg">
                      <div
                        className={`ire-dim-bar ire-dim-bar-${val >= 75 ? "critico" : val >= 50 ? "alto" : val >= 25 ? "moderado" : "bajo"}`}
                        style={{ width: `${val}%` }}
                      />
                    </div>
                    <div className="ire-dim-val">{val}</div>
                  </div>
                  );
                })}
              </div>
              {ireHistorial.length >= 2 && (
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
                {(() => {
                  const delta = ireProyectado.score - ireData.score;
                  if (delta === 0) return <span className="ire-proy-delta ire-proy-delta-eq">sin cambio</span>;
                  return (
                    <span className={`ire-proy-delta ire-proy-delta-${delta > 0 ? "up" : "down"}`}>
                      {delta > 0 ? "▲" : "▼"} {Math.abs(delta)} pts
                    </span>
                  );
                })()}
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
      )}

      {/* ── Pestaña: Detalle IRE ─────────────────────────── */}
      {activeTab === "ire" && (
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
      )}

      {/* ── Pestaña: Ventas e inventario ─────────────────── */}
      {activeTab === "ventas" && (
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
                          <DriftBadge score={prediction.drift_score} />
                        </td>
                        <td>
                          {prediction.sin_historial ? (
                            <span className="pred-sub">-</span>
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
      )}

      {/* ── Pestaña: Finanzas ────────────────────────────── */}
      {activeTab === "finanzas" && (
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
              <button type="button" className="btn btn-primary" onClick={() => void refreshPredictions()}>
                <RefreshCw size={15} /> Reintentar
              </button>
            </div>
          )}

          {/* ── Riesgo Financiero ─────────────────────────── */}
          {(() => {
            const sobrestock = predictionsForView.filter(
              p => !p.sin_historial && p.dias_hasta_agotarse >= 60 && p.stock_actual > 5
            );
            const capitalInmovilizado = sobrestock.reduce((s, p) => s + p.stock_actual * p.precio, 0);
            const enDescenso = predictionsForView.filter(p => !p.sin_historial && p.tendencia === "bajando");
            const ingresosEnRiesgo = enDescenso.reduce((s, p) => s + p.consumo_estimado_diario * 30 * p.precio, 0);
            const diarioProyect = revenueSummary?.promedio_diario_proyectado ?? 0;
            const semanas = [1, 2, 3, 4].map(w => ({ label: `Semana ${w}`, valor: diarioProyect * 7, acumulado: diarioProyect * 7 * w }));

            return (
              <div className="fin-risk-panel">
                <div className="fin-risk-header">
                  <p className="pred-sub">Diagnóstico financiero · basado en predicciones</p>
                  <h3 className="fin-risk-title">Riesgo Financiero</h3>
                </div>

                <div className="fin-risk-kpi-row">
                  <div className="fin-risk-kpi fin-risk-kpi-warn">
                    <span className="fin-risk-kpi-label">Capital inmovilizado</span>
                    <span className="fin-risk-kpi-val">{formatCurrency(capitalInmovilizado)}</span>
                    <span className="fin-risk-kpi-sub">{sobrestock.length} producto{sobrestock.length !== 1 ? "s" : ""} con más de 60 días de cobertura</span>
                  </div>
                  <div className={`fin-risk-kpi ${ingresosEnRiesgo > 0 ? "fin-risk-kpi-danger" : "fin-risk-kpi-ok"}`}>
                    <span className="fin-risk-kpi-label">Ingresos en riesgo</span>
                    <span className="fin-risk-kpi-val">{formatCurrency(ingresosEnRiesgo)}</span>
                    <span className="fin-risk-kpi-sub">{enDescenso.length} producto{enDescenso.length !== 1 ? "s" : ""} con demanda bajando — proyección 30 d</span>
                  </div>
                  <div className="fin-risk-kpi fin-risk-kpi-info">
                    <span className="fin-risk-kpi-label">Flujo est. / semana</span>
                    <span className="fin-risk-kpi-val">{formatCurrency(diarioProyect * 7)}</span>
                    <span className="fin-risk-kpi-sub">Basado en promedio diario del modelo</span>
                  </div>
                </div>

                {sobrestock.length > 0 && (
                  <div className="fin-risk-section">
                    <div className="ranking-section-title">
                      <Package size={14} /> Capital inmovilizado — productos con exceso de cobertura
                    </div>
                    <div className="fin-risk-stock-list">
                      {[...sobrestock]
                        .sort((a, b) => b.stock_actual * b.precio - a.stock_actual * a.precio)
                        .slice(0, 5)
                        .map(p => {
                          const cap = p.stock_actual * p.precio;
                          const pct = capitalInmovilizado > 0 ? (cap / capitalInmovilizado) * 100 : 0;
                          return (
                            <div key={p.productId} className="fin-risk-stock-row">
                              <div className="fin-risk-stock-info">
                                <span className="fin-risk-stock-name">{p.nombre}</span>
                                <span className="fin-risk-stock-meta">
                                  Stock: {p.stock_actual} uds · {p.dias_hasta_agotarse >= 999 ? "sin consumo activo" : `~${p.dias_hasta_agotarse} días de cobertura`}
                                </span>
                              </div>
                              <div className="fin-risk-stock-bar-wrap">
                                <div className="fin-risk-stock-bar-bg">
                                  <div className="fin-risk-stock-bar" style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                              <span className="fin-risk-stock-val">{formatCurrency(cap)}</span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {revenueSummary && (
                  <div className="fin-risk-section">
                    <div className="ranking-section-title">
                      <TrendingUp size={14} /> Flujo de caja proyectado — próximas 4 semanas
                    </div>
                    <div className="fin-risk-flux-grid">
                      {semanas.map((s, i) => (
                        <div key={i} className="fin-risk-flux-card">
                          <span className="fin-risk-flux-label">{s.label}</span>
                          <span className="fin-risk-flux-val">{formatCurrency(s.valor)}</span>
                          <span className="fin-risk-flux-acum">Acum.: {formatCurrency(s.acumulado)}</span>
                        </div>
                      ))}
                    </div>
                    <p className="ranking-section-note">Proyección lineal basada en el promedio diario del modelo. No contempla estacionalidad ni eventos extraordinarios.</p>
                  </div>
                )}
              </div>
            );
          })()}
        </motion.div>
      )}

      {/* ── Pestaña: Ranking ─────────────────────────────── */}
      {activeTab === "ranking" && (() => {
        const periodKey: keyof Prediction = rankingPeriod === 7 ? "ventas_7_dias" : rankingPeriod === 15 ? "ventas_15_dias" : "ventas_30_dias";
        const periodLabel = rankingPeriod === 7 ? "7 días" : rankingPeriod === 15 ? "15 días" : "30 días";
        const withHistory = predictions.filter(p => !p.sin_historial && (p[periodKey] as number ?? 0) > 0);
        const top3 = [...withHistory].sort((a, b) => ((b[periodKey] as number) ?? 0) - ((a[periodKey] as number) ?? 0)).slice(0, 3);
        const bottomPool = predictions
          .filter(p => p.stock_actual > 0)
          .sort((a, b) => ((a[periodKey] as number) ?? 0) - ((b[periodKey] as number) ?? 0));
        const bottom = bottomPool.slice(0, 6);

        const getRecomendacion = (p: Prediction): { texto: string; nivel: "critico" | "advertencia" | "sugerencia" } => {
          const v = (p[periodKey] as number) ?? 0;
          if (p.sin_historial && p.stock_actual === 0) return { texto: "Sin stock y sin ventas. Evalúa si el producto sigue vigente en el catálogo.", nivel: "sugerencia" };
          if (p.sin_historial) return { texto: "Sin ventas registradas. Verifica visibilidad en tienda y precio competitivo.", nivel: "sugerencia" };
          if (v === 0 && p.stock_actual > 20) return { texto: "Sin movimiento con stock alto. Aplica descuento del 20–30% o liquida antes de que pierda valor.", nivel: "critico" };
          if (v === 0 && p.stock_actual > 0) return { texto: "Sin ventas en este período. Revisa precio, ubicación en tienda o visibilidad en web.", nivel: "advertencia" };
          if (v < 2 && p.stock_actual > 15) return { texto: "Rotación muy baja con sobrestock. Combínalo en kit con producto estrella o reubica en zona de mayor tráfico.", nivel: "advertencia" };
          if (p.tendencia === "bajando" && p.stock_actual > 20) return { texto: "Demanda en descenso con inventario alto. Reduce precio ahora antes de que el stock siga acumulando.", nivel: "advertencia" };
          if (p.dias_hasta_agotarse > 90) return { texto: "Cobertura mayor a 3 meses: capital inmovilizado. Prioriza liquidar con descuento promocional.", nivel: "advertencia" };
          return { texto: "Rotación baja pero estable. Monitorea semanalmente y considera una promoción puntual.", nivel: "sugerencia" };
        };

        const medals = ["🥇", "🥈", "🥉"];
        const medalColors = ["ranking-gold", "ranking-silver", "ranking-bronze"];

        return (
          <motion.div key="tab-ranking" initial={{ opacity: 0, x: tabDirection * 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -tabDirection * 28 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
            {/* Selector de período */}
            <div className="ranking-period-bar">
              <span className="ranking-period-label">Período:</span>
              {([7, 15, 30] as RankingPeriod[]).map(p => (
                <button key={p} type="button" className={`ranking-period-btn${rankingPeriod === p ? " active" : ""}`} onClick={() => setRankingPeriod(p)}>
                  {p === 7 ? "Semana" : p === 15 ? "15 días" : "Mes"}
                </button>
              ))}
            </div>

            {/* Pódium top 3 */}
            <div className="ranking-section-title">
              <TrendingUp size={16} /> Top 3 más vendidos — {periodLabel}
            </div>
            {top3.length === 0 ? (
              <p className="ranking-empty">No hay datos de ventas para este período aún.</p>
            ) : (
              <div className="ranking-podium">
                {top3.map((p, i) => (
                  <div key={p.productId} className={`ranking-podium-card ${medalColors[i]}`}>
                    <div className="ranking-medal">{medals[i]}</div>
                    {p.imagen ? (
                      <img src={p.imagen} alt={p.nombre} className="ranking-product-img" loading="lazy" />
                    ) : (
                      <div className="ranking-product-img-placeholder">
                        <Package size={28} />
                      </div>
                    )}
                    <div className="ranking-podium-name">{p.nombre}</div>
                    <div className="ranking-podium-cat">{p.categoria}</div>
                    <div className="ranking-podium-units">
                      <strong>{((p[periodKey] as number) ?? 0).toFixed(0)}</strong>
                      <span> uds</span>
                    </div>
                    <div className="ranking-podium-rev">
                      S/ {((p[periodKey] as number ?? 0) * p.precio).toLocaleString("es-PE", { maximumFractionDigits: 0 })}
                    </div>
                    <div className={`ranking-trend-badge ${p.tendencia}`}>
                      {p.tendencia === "subiendo" ? "↑ Subiendo" : p.tendencia === "bajando" ? "↓ Bajando" : "→ Estable"}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Productos sin salida */}
            <div className="ranking-section-title ranking-section-title-warn">
              <AlertTriangle size={16} /> Productos de baja rotación — {periodLabel}
            </div>
            <p className="ranking-section-note">Productos con stock disponible y pocas o ninguna venta en el período. Se incluyen recomendaciones de acción.</p>
            <div className="ranking-bottom-list">
              {bottom.map((p, i) => {
                const rec = getRecomendacion(p);
                const ventas = (p[periodKey] as number) ?? 0;
                return (
                  <div key={p.productId} className={`ranking-bottom-card ranking-bottom-${rec.nivel}`}>
                    <div className="ranking-bottom-left">
                      <span className="ranking-bottom-pos">#{i + 1}</span>
                      {p.imagen ? (
                        <img src={p.imagen} alt={p.nombre} className="ranking-bottom-img" loading="lazy" />
                      ) : (
                        <div className="ranking-bottom-img-placeholder"><Package size={18} /></div>
                      )}
                      <div className="ranking-bottom-info">
                        <div className="ranking-bottom-name">{p.nombre}</div>
                        <div className="ranking-bottom-meta">{p.categoria} · Stock: {p.stock_actual} uds · Vendido: {ventas.toFixed(0)} uds</div>
                      </div>
                    </div>
                    <div className={`ranking-rec ranking-rec-${rec.nivel}`}>
                      <span className="ranking-rec-icon">{rec.nivel === "critico" ? "🔴" : rec.nivel === "advertencia" ? "🟡" : "🔵"}</span>
                      <span>{rec.texto}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Análisis ABC ─────────────────────────────── */}
            {abcData.length > 0 && (() => {
              const catA = abcData.filter(p => p.abc === "A");
              const catB = abcData.filter(p => p.abc === "B");
              const catC = abcData.filter(p => p.abc === "C");
              const totalRev = abcData.reduce((s, p) => s + p.total_vendido_historico * p.precio, 0);
              const revA = catA.reduce((s, p) => s + p.total_vendido_historico * p.precio, 0);
              const revB = catB.reduce((s, p) => s + p.total_vendido_historico * p.precio, 0);
              const revC = catC.reduce((s, p) => s + p.total_vendido_historico * p.precio, 0);
              const pct = (v: number) => totalRev > 0 ? ((v / totalRev) * 100).toFixed(1) : "0";
              return (
                <>
                  <div className="ranking-section-title" style={{ marginTop: "2rem" }}>
                    <Package size={16} /> Análisis ABC de inventario
                  </div>
                  <p className="ranking-section-note">Clasifica productos por su contribución a los ingresos históricos. A = 80% del ingreso, B = 15%, C = 5%.</p>
                  <div className="abc-grid">
                    <div className="abc-card abc-card-a">
                      <div className="abc-letter abc-letter-a">A</div>
                      <div className="abc-count">{catA.length} productos</div>
                      <div className="abc-pct-rev">{pct(revA)}% del ingreso · S/ {revA.toLocaleString("es-PE", { maximumFractionDigits: 0 })}</div>
                      <div className="abc-desc">Productos estrella. Mantén stock prioritario y reabastece antes de llegar al umbral crítico.</div>
                    </div>
                    <div className="abc-card abc-card-b">
                      <div className="abc-letter abc-letter-b">B</div>
                      <div className="abc-count">{catB.length} productos</div>
                      <div className="abc-pct-rev">{pct(revB)}% del ingreso · S/ {revB.toLocaleString("es-PE", { maximumFractionDigits: 0 })}</div>
                      <div className="abc-desc">Importancia media. Monitorea rotación y ajusta pedidos según tendencia.</div>
                    </div>
                    <div className="abc-card abc-card-c">
                      <div className="abc-letter abc-letter-c">C</div>
                      <div className="abc-count">{catC.length} productos</div>
                      <div className="abc-pct-rev">{pct(revC)}% del ingreso · S/ {revC.toLocaleString("es-PE", { maximumFractionDigits: 0 })}</div>
                      <div className="abc-desc">Baja contribución. Evalúa liquidar stock excedente o discontinuar si no hay demanda.</div>
                    </div>
                  </div>
                  <div className="abc-list">
                    {abcData.slice(0, 12).map(p => (
                      <div key={p.productId} className="abc-row">
                        <span className={`abc-row-badge abc-row-badge-${p.abc}`}>{p.abc}</span>
                        <span className="abc-row-name">{p.nombre}</span>
                        <span className="abc-row-rev">S/ {(p.total_vendido_historico * p.precio).toLocaleString("es-PE", { maximumFractionDigits: 0 })}</span>
                        <span className="abc-row-pct">{pct(p.total_vendido_historico * p.precio)}%</span>
                      </div>
                    ))}
                    {abcData.length > 12 && (
                      <p className="ranking-section-note" style={{ margin: "0.25rem 0 0" }}>+ {abcData.length - 12} productos más no mostrados.</p>
                    )}
                  </div>
                </>
              );
            })()}
          </motion.div>
        );
      })()}

      {/* ── Pestaña: Modelo IA ───────────────────────────── */}
      {activeTab === "modelo" && (
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
      )}

      {/* ── Pestaña: Asistente ───────────────────────────── */}
      {activeTab === "asistente" && (
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
                      onClick={() => void handleSend(question)}
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
      )}

      {/* ── Pestaña: Campañas IA ─────────────────────────────── */}
      {activeTab === "campanas" && (
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
              <button className="pred-btn" onClick={() => void loadCampana()}>
                Consultar campañas detectadas
              </button>
            </div>
          )}

          {!campanaLoading && campanaFetched && campanaData && (() => {
            const NIVEL_COLOR: Record<string, string> = {
              alta: "critico", media: "alto", baja: "moderado", normal: "bajo", observando: "moderado",
            };
            const NIVEL_LABEL: Record<string, string> = {
              alta: "Alta demanda", media: "Campaña activa", baja: "Actividad elevada",
              normal: "Normal", observando: "En observación",
            };
            const ESTADO_LABEL: Record<string, string> = {
              inicio: "Inicio", activa: "Activa", finalizando: "Finalizando",
              en_riesgo_stock: "Riesgo stock", finalizada: "Finalizada",
              descartada: "Descartada", observando: "En observación",
            };

            return (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

                {/* ── Sin campaña activa ── */}
                {!campanaData.activa && (
                  <div className="ire-hero ire-hero-bajo" style={{ flexDirection: "column", alignItems: "flex-start", gap: "0.75rem" }}>
                    <div className="ire-label">Estado de campañas</div>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: "1.05rem" }}>Sin campaña activa en este momento</p>
                    <p style={{ margin: 0, opacity: 0.75, fontSize: "0.9rem" }}>
                      El sistema monitorea ventas en tiempo real. Se registrará automáticamente cuando detecte actividad elevada o focalizada.
                    </p>
                    <button className="pred-btn" onClick={() => void loadCampana()} style={{ marginTop: "0.25rem" }}>
                      Actualizar
                    </button>
                  </div>
                )}

                {/* ── Campaña activa ── */}
                {campanaData.activa && (() => {
                  const c = campanaData.activa!;
                  const nc = NIVEL_COLOR[c.nivel] ?? "moderado";

                  // Timeline de estados del ciclo de vida
                  const TIMELINE_STEPS = [
                    { key: "inicio",          label: "Inicio" },
                    { key: "activa",          label: "Activa" },
                    { key: "en_riesgo_stock", label: "Riesgo stock", side: true },
                    { key: "finalizando",     label: "Finalizando" },
                    { key: "finalizada",      label: "Finalizada" },
                  ];
                  const mainSteps = TIMELINE_STEPS.filter((s) => !s.side);
                  const mainOrder = mainSteps.map((s) => s.key);
                  const currentIdx = mainOrder.indexOf(
                    c.estado === "en_riesgo_stock" ? "activa" : c.estado,
                  );

                  return (
                    <>
                      {/* Timeline de ciclo de vida */}
                      <div style={{ display: "flex", alignItems: "center", gap: 0, padding: "0.65rem 0.25rem", overflowX: "auto" }}>
                        {mainSteps.map((step, i) => {
                          const isDone    = i < currentIdx;
                          const isCurrent = i === currentIdx;
                          const isRiesgo  = c.estado === "en_riesgo_stock" && step.key === "activa";
                          const color = isRiesgo
                            ? "#f59e0b"
                            : isCurrent ? "#6366f1"
                            : isDone    ? "#22c55e"
                            : "rgba(255,255,255,0.18)";
                          const labelColor = (isCurrent || isRiesgo) ? "#fff" : isDone ? "#22c55e" : "rgba(255,255,255,0.45)";
                          return (
                            <div key={step.key} style={{ display: "flex", alignItems: "center", flex: i < mainSteps.length - 1 ? 1 : undefined, minWidth: 0 }}>
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem", minWidth: "4.5rem" }}>
                                <div style={{
                                  width: 28, height: 28, borderRadius: "50%",
                                  background: color, border: `2px solid ${color}`,
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  fontSize: "0.75rem", fontWeight: 700, color: "#fff",
                                  flexShrink: 0,
                                }}>
                                  {isDone ? "✓" : i + 1}
                                </div>
                                <span style={{ fontSize: "0.68rem", color: labelColor, textAlign: "center", whiteSpace: "nowrap" }}>
                                  {isRiesgo ? "Riesgo stock" : step.label}
                                </span>
                              </div>
                              {i < mainSteps.length - 1 && (
                                <div style={{
                                  flex: 1, height: 2, margin: "0 0.15rem", marginBottom: "1.1rem",
                                  background: i < currentIdx ? "#22c55e" : "rgba(255,255,255,0.15)",
                                  minWidth: "1.5rem",
                                }} />
                              )}
                            </div>
                          );
                        })}
                        {c.estado === "descartada" && (
                          <span style={{ fontSize: "0.8rem", color: "#ef4444", fontWeight: 600, marginLeft: "0.75rem" }}>
                            ✗ Descartada
                          </span>
                        )}
                      </div>

                      {/* Hero */}
                      <div className={`ire-hero ire-hero-${nc}`} style={{ flexWrap: "wrap", gap: "1rem" }}>
                        <div className="ire-left" style={{ flex: "1 1 280px" }}>
                          <div className="ire-label" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                            <span>Campaña detectada</span>
                            {c.scope && (
                              <span style={{
                                fontSize: "0.7rem", fontWeight: 700, padding: "0.15rem 0.5rem",
                                borderRadius: "999px", background: "rgba(255,255,255,0.2)",
                                textTransform: "uppercase", letterSpacing: "0.05em",
                              }}>
                                {c.scope === "focalizada"
                                  ? `Focalizada · ${c.foco_tipo ?? "segmento"}`
                                  : "Alcance global"}
                              </span>
                            )}
                            {c.foco_nombre && (
                              <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>— {c.foco_nombre}</span>
                            )}
                          </div>

                          <div className="ire-score-row" style={{ gap: "0.75rem", flexWrap: "wrap" }}>
                            <span className={`ire-nivel ire-nivel-${nc}`}>
                              {NIVEL_LABEL[c.nivel] ?? c.nivel}
                            </span>
                            {c.confidence_pct != null && (
                              <span style={{ fontSize: "0.9rem", opacity: 0.8 }}>
                                Confianza {c.confidence_pct}%
                              </span>
                            )}
                          </div>

                          {/* Metrics */}
                          <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", marginTop: "0.75rem" }}>
                            {c.uplift_ratio != null && (
                              <div>
                                <div style={{ fontSize: "0.7rem", opacity: 0.7, marginBottom: "0.15rem" }}>Uplift</div>
                                <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{c.uplift_ratio.toFixed(2)}×</div>
                              </div>
                            )}
                            {(c.impacto_estimado_soles ?? 0) > 0 && (
                              <div>
                                <div style={{ fontSize: "0.7rem", opacity: 0.7, marginBottom: "0.15rem" }}>Impacto global</div>
                                <div style={{ fontWeight: 700, fontSize: "1.05rem" }}>
                                  S/ {(c.impacto_estimado_soles ?? 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                                </div>
                              </div>
                            )}
                            {(c.impacto_estimado_soles_focalizado ?? 0) > 0 && (
                              <div>
                                <div style={{ fontSize: "0.7rem", opacity: 0.7, marginBottom: "0.15rem" }}>Impacto focalizado</div>
                                <div style={{ fontWeight: 700, fontSize: "1.05rem" }}>
                                  S/ {(c.impacto_estimado_soles_focalizado ?? 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                                </div>
                              </div>
                            )}
                            <div>
                              <div style={{ fontSize: "0.7rem", opacity: 0.7, marginBottom: "0.15rem" }}>Estado</div>
                              <div style={{ fontWeight: 600 }}>{ESTADO_LABEL[c.estado] ?? c.estado}</div>
                            </div>
                            {c.fecha_inicio && (
                              <div>
                                <div style={{ fontSize: "0.7rem", opacity: 0.7, marginBottom: "0.15rem" }}>Desde</div>
                                <div style={{ fontWeight: 600 }}>{c.fecha_inicio}</div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Confirm / Discard */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", minWidth: "152px" }}>
                          {c.confirmada_por_admin == null ? (
                            <>
                              <button
                                className="pred-btn"
                                disabled={campanaFeedbackLoading}
                                onClick={() => void submitCampanaFeedback(c.id, "confirmar")}
                                style={{ background: "#22c55e", color: "#fff", border: "none", fontWeight: 600, padding: "0.55rem 1rem" }}
                              >
                                {campanaFeedbackLoading ? "…" : "✓ Confirmar"}
                              </button>
                              <button
                                className="pred-btn"
                                disabled={campanaFeedbackLoading}
                                onClick={() => void submitCampanaFeedback(c.id, "descartar")}
                                style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.28)", fontWeight: 600, padding: "0.55rem 1rem" }}
                              >
                                {campanaFeedbackLoading ? "…" : "✗ Descartar"}
                              </button>
                            </>
                          ) : (
                            <div style={{
                              padding: "0.6rem 0.9rem", borderRadius: "0.5rem", fontWeight: 600, fontSize: "0.85rem",
                              background: c.confirmada_por_admin ? "rgba(34,197,94,0.18)" : "rgba(239,68,68,0.18)",
                            }}>
                              {c.confirmada_por_admin ? "✓ Confirmada" : "✗ Descartada"}
                              {c.admin_nota && (
                                <p style={{ margin: "0.3rem 0 0", opacity: 0.8, fontSize: "0.78rem", fontWeight: 400 }}>
                                  {c.admin_nota}
                                </p>
                              )}
                            </div>
                          )}
                          <button
                            className="pred-btn"
                            style={{ fontSize: "0.8rem", padding: "0.35rem 0.75rem", opacity: 0.7 }}
                            onClick={() => void loadCampana()}
                          >
                            Actualizar
                          </button>
                        </div>
                      </div>

                      {/* Recommendation */}
                      {c.recomendacion && (
                        <div className="pred-warning" style={{
                          background: "rgba(234,179,8,0.07)",
                          border: "1px solid rgba(234,179,8,0.28)",
                          borderRadius: "0.75rem", padding: "0.85rem 1rem",
                          fontSize: "0.9rem", lineHeight: 1.6,
                        }}>
                          <strong>Recomendación · </strong>{c.recomendacion}
                        </div>
                      )}

                      {/* Top products */}
                      {c.top_productos_detalle && c.top_productos_detalle.length > 0 && (
                        <section>
                          <h3 className="pred-section-title" style={{ marginBottom: "0.65rem" }}>
                            Top productos con mayor actividad
                          </h3>
                          <div className="pred-table-wrapper">
                            <table className="admin-table pred-table">
                              <thead>
                                <tr>
                                  <th>Producto</th>
                                  <th>Categoría</th>
                                  <th>Uplift</th>
                                  <th>Ventas recientes</th>
                                  <th>Ventas esperadas</th>
                                  <th>Impacto S/</th>
                                  <th>Stock</th>
                                </tr>
                              </thead>
                              <tbody>
                                {c.top_productos_detalle.map((p) => (
                                  <tr
                                    key={p.producto_id}
                                    className={p.stock_actual === 0 ? "pred-row-alert" : ""}
                                  >
                                    <td style={{ fontWeight: 600 }}>{p.nombre}</td>
                                    <td>{p.categoria}</td>
                                    <td>
                                      <span className={`pred-estado-badge ${p.uplift_ratio >= 2 ? "critico" : p.uplift_ratio >= 1.5 ? "alerta" : ""}`}>
                                        {p.uplift_ratio.toFixed(2)}×
                                      </span>
                                    </td>
                                    <td>{p.ventas_recientes.toFixed(1)} uds</td>
                                    <td>{p.ventas_baseline.toFixed(1)} uds</td>
                                    <td style={{ fontWeight: 600, color: (p.impacto_soles ?? 0) > 0 ? "#22c55e" : undefined }}>
                                      {(p.impacto_soles ?? 0) > 0
                                        ? `S/ ${(p.impacto_soles!).toLocaleString("es-PE", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                                        : "—"}
                                    </td>
                                    <td style={{
                                      fontWeight: 600,
                                      color: p.stock_actual === 0 ? "#ef4444"
                                        : (p.stock_actual ?? 999) < 5 ? "#f59e0b"
                                        : undefined,
                                    }}>
                                      {p.stock_actual ?? "—"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </section>
                      )}
                    </>
                  );
                })()}

                {/* ── Historial ── */}
                {campanaData.historial.length > 0 && (
                  <section>
                    <h3 className="pred-section-title" style={{ marginBottom: "0.65rem" }}>
                      Historial de campañas detectadas
                    </h3>
                    <div className="pred-table-wrapper">
                      <table className="admin-table pred-table">
                        <thead>
                          <tr>
                            <th>Fecha</th>
                            <th>Nivel</th>
                            <th>Scope</th>
                            <th>Foco</th>
                            <th>Uplift</th>
                            <th>Impacto S/</th>
                            <th>Estado</th>
                            <th>Admin</th>
                          </tr>
                        </thead>
                        <tbody>
                          {campanaData.historial.map((h) => {
                            const nivelBadge: Record<string, string> = {
                              alta: "critico", media: "alerta", baja: "alerta",
                            };
                            const impacto = h.scope === "focalizada" && (h.impacto_estimado_soles_focalizado ?? 0) > 0
                              ? h.impacto_estimado_soles_focalizado ?? 0
                              : h.impacto_estimado_soles ?? 0;
                            return (
                              <tr key={h.id}>
                                <td>{h.fecha_deteccion}</td>
                                <td>
                                  <span className={`pred-estado-badge ${nivelBadge[h.nivel] ?? ""}`}>
                                    {h.nivel}
                                  </span>
                                </td>
                                <td>{h.scope ?? "—"}</td>
                                <td style={{ fontSize: "0.83rem" }}>
                                  {h.foco_nombre ? `${h.foco_tipo}: ${h.foco_nombre}` : "—"}
                                </td>
                                <td>{h.uplift_ratio != null ? `${h.uplift_ratio.toFixed(2)}×` : "—"}</td>
                                <td>{impacto > 0 ? `S/ ${impacto.toLocaleString("es-PE", { minimumFractionDigits: 2 })}` : "—"}</td>
                                <td>{ESTADO_LABEL[h.estado] ?? h.estado}</td>
                                <td style={{ fontSize: "0.8rem", opacity: 0.85 }}>
                                  {h.confirmada_por_admin === true
                                    ? "✓ Confirmada"
                                    : h.confirmada_por_admin === false
                                    ? "✗ Descartada"
                                    : "Pendiente"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}
              </div>
            );
          })()}

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
      )}
    </div>
  );
}
