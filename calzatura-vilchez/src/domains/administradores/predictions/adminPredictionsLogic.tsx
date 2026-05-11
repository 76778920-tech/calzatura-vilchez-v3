/* eslint-disable react-refresh/only-export-components */
import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import {
  AlertTriangle,
  CheckCircle,
  Minus,
  Package,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { motion, animate } from "framer-motion";

export interface Prediction {
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

export interface WeekPoint {
  semana: string;
  unidades: number;
}

export interface RevenuePoint {
  fecha: string;
  label: string;
  ingresos: number;
  tipo: "historico" | "proyectado";
}

export interface RevenueSummary {
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

export interface RevenueForecast {
  horizon_days: number;
  history_days: number;
  summary: RevenueSummary;
  history: RevenuePoint[];
  forecast: RevenuePoint[];
}

export interface IreDimensiones {
  riesgo_stock: number;
  riesgo_ingresos: number;
  riesgo_demanda: number;
}
export interface IrePesos {
  riesgo_stock: number;
  riesgo_ingresos: number;
  riesgo_demanda: number;
}
export interface IreDetalle {
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
export interface IreVariable {
  codigo: keyof IreDimensiones;
  nombre: string;
  peso: number;
  valor: number;
  contribucion_score: number;
  descripcion: string;
  fuente: string;
  indicadores: string[];
}
export interface IreData {
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

export interface IreHistorialPoint {
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

export interface FeatureImportance {
  feature: string;
  importance: number;
}

export interface ModeloMeta {
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

export interface ModelMetrics {
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

export type HorizonOption = 7 | 15 | 30;
export type HistoryOption = 30 | 60 | 90 | 120;
export type AlertOption  = 7 | 14 | 21 | 30;

export const HORIZON_OPTIONS:  HorizonOption[]  = [7, 15, 30];
export const HISTORY_OPTIONS:  HistoryOption[]  = [30, 60, 90, 120];
export const ALERT_OPTIONS:    AlertOption[]    = [7, 14, 21, 30];

export function loadPref<T extends number>(key: string, valid: T[], fallback: T): T {
  const v = Number(localStorage.getItem(key));
  return (valid as number[]).includes(v) ? (v as T) : fallback;
}
export type PredictionTab = "resumen" | "ire" | "ventas" | "finanzas" | "ranking" | "modelo" | "asistente" | "campanas";
export type RankingPeriod = 7 | 15 | 30;

export interface CampanaTopProducto {
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

export interface CampanaDetectada {
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

export interface CampanaActiveResponse {
  status: string;
  activa: CampanaDetectada | null;
  historial: CampanaDetectada[];
}

export interface LearningStatsScope {
  confirmadas: number;
  descartadas: number;
  total: number;
}
export interface LearningStatsUmbrales {
  uplift_alta: number;
  uplift_media: number;
  uplift_baja: number;
  uplift_focalizada: number;
}
export interface LearningStats {
  status: string;
  min_feedback_samples: number;
  conteos: { global: LearningStatsScope; focalizada: LearningStatsScope };
  precision_pct: { global: number | null; focalizada: number | null };
  umbrales_base: LearningStatsUmbrales;
  umbrales_activos: LearningStatsUmbrales;
  aprendizaje_activo: boolean;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export const TAB_SEQUENCE: PredictionTab[] = ["resumen", "ire", "ventas", "finanzas", "ranking", "modelo", "asistente", "campanas"];

export const IRE_NIVEL_LABELS: Record<string, string> = {
  bajo: "Bajo", moderado: "Moderado", alto: "Alto", critico: "Crítico",
};

export const IRE_DIM_CONFIG: { key: keyof IreDimensiones; label: string }[] = [
  { key: "riesgo_stock",    label: "Stock" },
  { key: "riesgo_ingresos", label: "Ingresos" },
  { key: "riesgo_demanda",  label: "Demanda" },
];

export const IRE_INDICATOR_LABELS: Record<string, string> = {
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

export interface Recomendación {
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

export function formatUnits(value: number) {
  if (!Number.isFinite(value)) return "0";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function formatCurrency(value: number | undefined | null) {
  if (value == null || !Number.isFinite(value)) return "S/ 0.00";
  return `S/ ${value.toFixed(2)}`;
}

export function formatPercent(value: number | undefined | null) {
  if (value == null || !Number.isFinite(value)) return "0.0%";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export function formatTrendLabel(value: "subiendo" | "bajando" | "estable") {
  if (value === "subiendo") return "Subiendo";
  if (value === "bajando") return "Bajando";
  return "Estable";
}

/** Confianza de la proyección financiera (%): un solo criterio para KPI, resúmenes y asistente (RN-07). */
const CONFIDENCE_ALTA_MIN = 70;
const CONFIDENCE_MEDIA_MIN = 50;

export function formatConfidenceLabel(value: number) {
  if (value >= CONFIDENCE_ALTA_MIN) return "Alta";
  if (value >= CONFIDENCE_MEDIA_MIN) return "Media";
  return "Inicial";
}

export function AnimatedKpi({
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

export function isOverstocked(product: Prediction) {
  if (product.sin_historial || product.stock_actual <= 0 || product.consumo_estimado_diario <= 0) return false;
  return (
    (product.dias_hasta_agotarse >= 120 && product.stock_actual >= 15) ||
    product.stock_actual >= Math.max(product.prediccion_unidades * 2.5, 25) ||
    (product.tendencia === "bajando" && product.stock_actual >= Math.max(product.prediccion_unidades * 2, 18))
  );
}

export function isSlowMoving(product: Prediction) {
  if (product.sin_historial || product.stock_actual <= 0) return false;
  return (
    product.consumo_estimado_diario <= 0.35 ||
    (product.tendencia === "bajando" && product.stock_actual >= Math.max(product.prediccion_unidades * 1.5, 12)) ||
    product.ventas_30_dias <= 6
  );
}

export function generarRecomendaciónes(predictions: Prediction[]): Recomendación[] {
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

export function normalizeChatTextV2(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function countIntentMatches(text: string, terms: string[]) {
  return terms.reduce((count, term) => count + (text.includes(term) ? 1 : 0), 0);
}

export function findMentionedProductsV2(message: string, predictions: Prediction[]) {
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

export type AssistantIntentV2 = "summary" | "recommendations" | "revenue" | "risk" | "demand" | "overstock" | "confidence" | "motor" | "noHistory" | null;

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

export function detectQuickPromptIntentV2(normalizedMessage: string): AssistantIntentV2 {
  return QUICK_PROMPT_INTENTS_V2.find((item) => item.prompt === normalizedMessage)?.intent ?? null;
}

export interface AssistantContextV2 {
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

export function buildAssistantContextV2(predictions: Prediction[]): AssistantContextV2 {
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

export function productDetailCoverageDescrV2(product: Prediction): string {
  if (product.stock_actual === 0) return "ya no tiene stock";
  if (product.dias_hasta_agotarse >= 999) return "tiene una cobertura amplia";
  return `tiene cobertura para unos ${product.dias_hasta_agotarse} días`;
}

export function productDetailRecommendationV2(product: Prediction): string {
  if (product.stock_actual === 0) return "Mi recomendación es reponerlo cuanto antes para no seguir perdiendo ventas.";
  if (product.alerta_stock || product.nivel_riesgo === "critico") {
    return "Mi recomendación es priorizarlo en el siguiente pedido.";
  }
  if (product.alta_demanda) return "Mi recomendación es seguirlo de cerca porque viene rotando bien.";
  return "Mi recomendación es mantener un seguimiento normal por ahora.";
}

export function productDetailTrendInterpretV2(t: Prediction["tendencia"]): string {
  if (t === "subiendo") {
    return "Eso significa que el producto viene acelerando su salida y conviene vigilarlo más de cerca.";
  }
  if (t === "bajando") {
    return "Eso significa que su salida se esta enfríando y no hace falta apresurar una compra grande.";
  }
  return "Eso significa que, por ahora, su ritmo de venta se mantiene bastante estable.";
}

export function buildProductDetailResponseV2(product: Prediction) {
  const label = `${product.nombre}${product.codigo ? ` (${product.codigo})` : ""}`;
  const coverage = productDetailCoverageDescrV2(product);

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

  const recommendation = productDetailRecommendationV2(product);

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
    productDetailTrendInterpretV2(product.tendencia),
    "",
    "Recomendación:",
    recommendation,
  ].join("\n");
}

const ASSISTANT_V2_RISK_TERMS = [
  "riesgo", "agota", "agotarse", "stock", "inventario", "sin stock", "se acaba", "quiebre", "cobertura", "faltando", "faltan unidades",
];
const ASSISTANT_V2_REVENUE_TERMS = [
  "ingreso", "ingresos", "ingresar", "dinero", "ganancia", "ganancias", "proyección", "proyecta", "proyectado", "financ", "recaudar", "cobrar",
  "facturacion", "facturar", "vender", "ventas", "proximo mes", "proxima semana", "contable", "contabilidad",
];
const ASSISTANT_V2_DEMAND_TERMS = [
  "demanda", "popular", "populares", "mas vendido", "mas vendidos", "mas se vende", "vende mas", "top", "estrella", "rotación", "rotan", "se venden", "alta demanda",
];
const ASSISTANT_V2_OVERSTOCK_TERMS = [
  "sobrestock", "sobre stock", "stock acumulado", "stock de sobra", "rotacion lenta", "rotación lenta", "lenta rotacion", "lenta rotación",
  "poca rotacion", "poca rotación", "inmovilizado",
];
const ASSISTANT_V2_CONFIDENCE_TERMS = [
  "confianza", "confiable", "precision", "precisión", "preciso", "certeza", "que tan seguro", "fiable", "margen de error",
];
const ASSISTANT_V2_MOTOR_TERMS = [
  "producto motor", "producto estrella", "motor", "lidera", "lider", "líder", "empuja", "sostiene la venta", "defenderias",
];
const ASSISTANT_V2_RECOMMENDATION_TERMS = [
  "recomend", "consejo", "que hacer", "que debo", "accion", "acción", "pedir", "comprar", "reponer", "proveedor", "priorizar",
];
const ASSISTANT_V2_TREND_TERMS = [
  "tendencia", "trend", "sube", "subiendo", "baja", "bajando", "comportamiento", "creciendo", "cae", "caida", "como va", "como van",
];
const ASSISTANT_V2_SUMMARY_TERMS = [
  "resumen", "estado", "general", "situacion", "situación", "panorama", "overview", "como estamos", "estado actual", "resumen general",
  "informe", "gerencia", "gerencial", "directiva", "junta directiva", "comite",
];
const ASSISTANT_V2_NO_HISTORY_TERMS = [
  "sin historial", "sin ventas", "no tiene ventas", "sin movimiento", "sin rotación", "sin datos",
];

const ASSISTANT_V2_FALLBACK_HELP = [
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

export type AssistantIntentScoresV2 = {
  product: number;
  risk: number;
  revenue: number;
  demand: number;
  overstock: number;
  confidence: number;
  motor: number;
  recommendations: number;
  trend: number;
  summary: number;
  noHistory: number;
};

export function buildAssistantIntentScoresV2(
  msg: string,
  forcedIntent: AssistantIntentV2,
  mentionedProductCount: number
): AssistantIntentScoresV2 {
  const productBoostTerms = [
    ...ASSISTANT_V2_RISK_TERMS,
    ...ASSISTANT_V2_DEMAND_TERMS,
    ...ASSISTANT_V2_TREND_TERMS,
    ...ASSISTANT_V2_RECOMMENDATION_TERMS,
  ];
  return {
    product: mentionedProductCount > 0 ? 3 + countIntentMatches(msg, productBoostTerms) : 0,
    risk: (forcedIntent === "risk" ? 100 : 0) + countIntentMatches(msg, ASSISTANT_V2_RISK_TERMS),
    revenue: (forcedIntent === "revenue" ? 100 : 0) + countIntentMatches(msg, ASSISTANT_V2_REVENUE_TERMS),
    demand: (forcedIntent === "demand" ? 100 : 0) + countIntentMatches(msg, ASSISTANT_V2_DEMAND_TERMS),
    overstock: (forcedIntent === "overstock" ? 100 : 0) + countIntentMatches(msg, ASSISTANT_V2_OVERSTOCK_TERMS),
    confidence: (forcedIntent === "confidence" ? 100 : 0) + countIntentMatches(msg, ASSISTANT_V2_CONFIDENCE_TERMS),
    motor: (forcedIntent === "motor" ? 100 : 0) + countIntentMatches(msg, ASSISTANT_V2_MOTOR_TERMS),
    recommendations: (forcedIntent === "recommendations" ? 100 : 0) + countIntentMatches(msg, ASSISTANT_V2_RECOMMENDATION_TERMS),
    trend: countIntentMatches(msg, ASSISTANT_V2_TREND_TERMS),
    summary: (forcedIntent === "summary" ? 100 : 0) + countIntentMatches(msg, ASSISTANT_V2_SUMMARY_TERMS) + (msg.includes("cuantos") ? 1 : 0),
    noHistory: (forcedIntent === "noHistory" ? 100 : 0) + countIntentMatches(msg, ASSISTANT_V2_NO_HISTORY_TERMS),
  };
}

export function computeAssistantV2AsksRevenue(msg: string, intentScores: AssistantIntentScoresV2): boolean {
  return (
    intentScores.revenue > 0 ||
    (((msg.includes("proximo mes") || msg.includes("proxima semana")) &&
      (msg.includes("ingresar") || msg.includes("ingresos") || msg.includes("vender") || msg.includes("ventas") || msg.includes("facturar"))) ||
      msg.includes("cuanto se proyecta"))
  );
}

export function assistantV2LabelOf(product: Prediction): string {
  return `${product.nombre}${product.codigo ? ` (${product.codigo})` : ""}`;
}

export function assistantV2JoinNatural(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} y ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

export function assistantV2CoverageText(product: Prediction): string {
  if (product.stock_actual === 0) return "sin stock";
  if (product.dias_hasta_agotarse >= 999) return "con cobertura amplia";
  return `con cobertura para unos ${product.dias_hasta_agotarse} dias`;
}

export function assistantV2TrendText(trend: Prediction["tendencia"]): string {
  if (trend === "subiendo") return "al alza";
  if (trend === "bajando") return "a la baja";
  return "estable";
}

export type AssistantV2Shared = {
  msg: string;
  predictions: Prediction[];
  revenueForecast: RevenueForecast | null;
  context: AssistantContextV2;
  intentScores: AssistantIntentScoresV2;
  asksRevenue: boolean;
  mentionedProducts: Prediction[];
};

export function assistantV2TrySingleProduct(shared: AssistantV2Shared): string | null {
  if (shared.intentScores.product >= 3 && shared.mentionedProducts.length === 1) {
    return buildProductDetailResponseV2(shared.mentionedProducts[0]);
  }
  return null;
}

export function assistantV2TryNoHistory(shared: AssistantV2Shared): string | null {
  if (shared.intentScores.noHistory <= 0) return null;
  const { noHistory } = shared.context;
  if (noHistory.length === 0) {
    return "Hoy todos los productos del catálogo ya tienen historial suficiente para analizarlos con normalidad. Eso ayuda a que las proyecciónes sean más útiles y más fáciles de interpretar.";
  }
  const lines = [
    `Todavía hay ${noHistory.length} producto(s) sin historial suficiente.`,
    "",
    "Listado actual:",
  ];
  noHistory.slice(0, 8).forEach((p, index) => {
    lines.push(`${index + 1}. ${assistantV2LabelOf(p)}: stock actual ${p.stock_actual} unidades.`);
  });
  lines.push("", "Interpretación:", "En la práctica, estos productos aún no tienen suficiente movimiento como para estimar si se venden rápido o lento.", "", "Implicancia para gerencia y contabilidad:", "Todavía no conviene tomar decisiones fuertes de compra o proyección basadas en ellos.", "", "Recomendación:", "En cuanto acumulen ventas reales, el panel podra calcular mejor su demanda, su nivel de reposición y su prioridad dentro del negocio.");
  return lines.join("\n");
}

export function assistantV2TryRisk(shared: AssistantV2Shared): string | null {
  if (shared.intentScores.risk <= 0) return null;
  const { withHistory, noHistory, inRisk, criticos, atencion, outOfStock, overstocked, slowMoving, urgentProducts } = shared.context;

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
    lines.push(`Lo más urgente ahora mismo es revisar ${assistantV2JoinNatural(urgentProducts.map((p) => assistantV2LabelOf(p)))}.`, "");
  }

  urgentProducts.forEach((p) => {
    lines.push(`- ${assistantV2LabelOf(p)}: stock ${p.stock_actual}, consumo estimado ${formatUnits(p.consumo_estimado_diario)} por día, ${assistantV2CoverageText(p)}.`);
  });

  lines.push("", "Interpretación:", "En términos simples: estos son los productos con más probabilidad de hacerte perder ventas si no actúas pronto.", "", "Recomendación:", "Mi recomendación es priorizar primero los productos sin stock y luego los que ya están cerca de agotarse.");
  return lines.join("\n");
}

export function assistantV2TryRevenue(shared: AssistantV2Shared): string | null {
  if (!shared.asksRevenue) return null;
  const { revenueForecast } = shared;
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

export function assistantV2TryDemand(shared: AssistantV2Shared): string | null {
  if (shared.intentScores.demand <= 0) return null;
  const { highDemand, topDemand } = shared.context;
  if (highDemand.length === 0) {
    return [
      "Ahora mismo no hay un grupo claro de productos con alta demanda.",
      "",
      "Las ventas se ven más repartidas o el volumen general todavía no marca diferencias fuertes entre productos.",
    ].join("\n");
  }

  const lines = [
    "Resumen ejecutivo:",
    `Los productos con mejor salida en este momento son ${assistantV2JoinNatural(topDemand.slice(0, 3).map((p) => assistantV2LabelOf(p)))}.`,
    "",
    "Datos exactos:",
  ];

  topDemand.forEach((p, index) => {
    lines.push(
      `${index + 1}. ${assistantV2LabelOf(p)}: ${formatUnits(p.consumo_estimado_diario)} unidades por día, ${formatUnits(p.prediccion_semanal)} proyectadas para la semana, ventas 30 días ${formatUnits(p.ventas_30_dias)} y ${assistantV2CoverageText(p)}.`,
    );
  });

  lines.push("", "Interpretación:", "En términos gerenciales, aqui esta el grupo que hoy te sostiene mejor la rotación del negocio.", "", "Recomendación:", "Si vas a priorizar compras, estos son los productos que más conviene vigilar.");
  return lines.join("\n");
}

export function assistantV2TryOverstock(shared: AssistantV2Shared): string | null {
  if (shared.intentScores.overstock <= 0) return null;
  const { overstocked, slowMoving } = shared.context;
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
      `${index + 1}. ${assistantV2LabelOf(p)}: stock ${p.stock_actual}, ventas 30 días ${formatUnits(p.ventas_30_dias)}, tendencia ${assistantV2TrendText(p.tendencia)} y ${assistantV2CoverageText(p)}.`,
    );
  });

  lines.push("", "Interpretación:", "Aquí no estás perdiendo ventas por falta de mercadería; más bien hay dinero detenido en productos que se mueven más lento de lo deseado.", "", "Recomendación:", "Frena reposición en esos pares, mueve salida comercial con descuentos o vitrinas y prioriza compra solo en los de demanda comprobada.");
  return lines.join("\n");
}

export function assistantV2TryConfidence(shared: AssistantV2Shared): string | null {
  if (shared.intentScores.confidence <= 0) return null;
  const { revenueForecast } = shared;
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
    `- Tendencia detectada: ${assistantV2TrendText(s.tendencia)}`,
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

export function assistantV2TryMotor(shared: AssistantV2Shared): string | null {
  if (shared.intentScores.motor <= 0) return null;
  const { topDemand } = shared.context;
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
    `${assistantV2LabelOf(lider)} es hoy el producto motor del panel.`,
    "",
    "Datos exactos:",
    `- Consumo estimado diario: ${formatUnits(lider.consumo_estimado_diario)} unidades`,
    `- Proyección semanal: ${formatUnits(lider.prediccion_semanal)} unidades`,
    `- Ventas últimos 30 días: ${formatUnits(lider.ventas_30_dias)} unidades`,
    `- Tendencia: ${assistantV2TrendText(lider.tendencia)}`,
    `- Cobertura actual: ${assistantV2CoverageText(lider)}`,
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

export function assistantV2TryRecommendations(shared: AssistantV2Shared): string | null {
  if (shared.intentScores.recommendations <= 0) return null;
  const { recomendaciones, topByRisk } = shared.context;
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
    lines.push("", "Soporte numerico:");
    topByRisk.slice(0, 3).forEach((p) => {
      lines.push(`- ${assistantV2LabelOf(p)}: stock ${p.stock_actual}, consumo ${formatUnits(p.consumo_estimado_diario)}/dia, riesgo ${p.nivel_riesgo}.`);
    });
  }

  return lines.join("\n");
}

export function assistantV2TryTrend(shared: AssistantV2Shared): string | null {
  if (shared.intentScores.trend <= 0) return null;
  const { subiendo, estables, bajando } = shared.context;
  const { revenueForecast } = shared;
  const lines = [
    "Resumen ejecutivo:",
    `En este momento tengo ${subiendo.length} producto(s) subiendo, ${estables.length} estables y ${bajando.length} bajando.`,
    "",
    "Datos exactos:",
  ];

  if (subiendo.length > 0) {
    lines.push(`Los que mejor vienen creciendo son ${assistantV2JoinNatural(subiendo.slice(0, 3).map((p) => assistantV2LabelOf(p)))}.`);
  }

  if (bajando.length > 0) {
    lines.push(`Los que muestran más enfríamiento son ${assistantV2JoinNatural(bajando.slice(0, 3).map((p) => assistantV2LabelOf(p)))}.`);
  }

  if (revenueForecast) {
    lines.push(`En ingresos, la tendencia general está ${assistantV2TrendText(revenueForecast.summary.tendencia)} y la proyección del horizonte actual (${revenueForecast.horizon_days} días) es ${formatCurrency(revenueForecast.summary.proximo_horizonte)}.`);
  }

  lines.push("", "Interpretación:", "En términos simples: la tendencia te ayuda a ver si conviene acelerar compras, mantenerte igual o ser más conservador.");
  return lines.join("\n");
}

export function assistantV2TrySummary(shared: AssistantV2Shared): string | null {
  if (shared.intentScores.summary <= 0) return null;
  const { predictions, revenueForecast, context } = shared;
  const { withHistory, noHistory, outOfStock, criticos, atencion, highDemand, subiendo, estables, bajando } = context;
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

  lines.push("", "Interpretación:");
  if (outOfStock.length > 0 || criticos.length > 0) {
    lines.push("La prioridad más clara es reponer los productos con riesgo alto para no perder ventas.");
  } else {
    lines.push("No veo alertas graves en este momento; el panorama general es bastante estable.");
  }

  lines.push("", "Recomendación:", "Si quieres, después de este resumen puedes preguntarme por ingresos, riesgo, tendencias o por un producto específico y te lo explico con más detalle.");
  return lines.join("\n\n");
}

export function assistantV2TryMentionedProduct(shared: AssistantV2Shared): string | null {
  if (shared.mentionedProducts.length === 0) return null;
  return buildProductDetailResponseV2(shared.mentionedProducts[0]);
}

export function generateAIResponseV2(
  message: string,
  predictions: Prediction[],
  revenueForecast: RevenueForecast | null,
  context: AssistantContextV2,
): string {
  const msg = normalizeChatTextV2(message);
  const forcedIntent = detectQuickPromptIntentV2(msg);
  const mentionedProducts = findMentionedProductsV2(message, predictions).slice(0, 3);
  const intentScores = buildAssistantIntentScoresV2(msg, forcedIntent, mentionedProducts.length);
  const asksRevenue = computeAssistantV2AsksRevenue(msg, intentScores);
  const shared: AssistantV2Shared = {
    msg,
    predictions,
    revenueForecast,
    context,
    intentScores,
    asksRevenue,
    mentionedProducts,
  };

  return (
    assistantV2TrySingleProduct(shared)
    ?? assistantV2TryNoHistory(shared)
    ?? assistantV2TryRisk(shared)
    ?? assistantV2TryRevenue(shared)
    ?? assistantV2TryDemand(shared)
    ?? assistantV2TryOverstock(shared)
    ?? assistantV2TryConfidence(shared)
    ?? assistantV2TryMotor(shared)
    ?? assistantV2TryRecommendations(shared)
    ?? assistantV2TryTrend(shared)
    ?? assistantV2TrySummary(shared)
    ?? assistantV2TryMentionedProduct(shared)
    ?? ASSISTANT_V2_FALLBACK_HELP
  );
}

export function TipoIcon({ tipo }: { tipo: Recomendación["tipo"] }) {
  if (tipo === "urgente") return <AlertTriangle size={18} />;
  if (tipo === "atencion") return <Zap size={18} />;
  if (tipo === "oportunidad") return <TrendingUp size={18} />;
  return <CheckCircle size={18} />;
}

export function EstadoBadge({ p }: { p: Prediction }) {
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

export function DuracionTexto({ p }: { p: Prediction }) {
  if (p.sin_historial) return <span className="pred-sub">Sin datos de venta</span>;
  if (p.stock_actual === 0) return <span className="pred-days-critical">Sin stock</span>;
  if (p.dias_hasta_agotarse >= 999) return <span className="pred-sub">Cobertura amplia</span>;
  if (p.dias_hasta_agotarse <= 7) return <span className="pred-days-critical">~{p.dias_hasta_agotarse} días</span>;
  if (p.dias_hasta_agotarse <= 14) return <span className="pred-days-warn">~{p.dias_hasta_agotarse} días</span>;
  return <span>~{p.dias_hasta_agotarse} días</span>;
}

export function TendenciaCell({ t }: { t: Prediction["tendencia"] }) {
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

export const FEATURE_LABELS: Record<string, string> = {
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

export function FeatureImportanceChart({ importances }: { importances: FeatureImportance[] }) {
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

export function DemandAccuracyChart({ predictions }: { predictions: Prediction[] }) {
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

export function IreSparkline({ data }: { data: IreHistorialPoint[] }) {
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

export function IreHistoryPanel({ data }: { data: IreHistorialPoint[] }) {
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

export function DriftBadge({ score }: { score: number | undefined }) {
  if (score === undefined) return null;
  if (score < 0.35) return null;
  if (score < 0.65) return <span className="pred-drift-badge medio" title={`Drift: ${score}`}>drift medio</span>;
  return <span className="pred-drift-badge alto" title={`Drift: ${score}`}>drift alto</span>;
}

export function WeeklyChart({ data }: { data: WeekPoint[] }) {
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

export function RevenueLineChart({ history, forecast }: { history: RevenuePoint[]; forecast: RevenuePoint[] }) {
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

export function RiskAlertCard({ prediction }: { prediction: Prediction }) {
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

export function exportPredictionsCSV(predictions: Prediction[], horizon: HorizonOption) {
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

export function mapPredictionsForViewDataset(predictions: Prediction[], alertDays: number): Prediction[] {
  return predictions.map((item) => {
    if (item.sin_historial || item.consumo_estimado_diario <= 0) {
      return { ...item, alerta_stock: false, riesgo_agotamiento: false };
    }
    const withinThreshold = item.stock_actual === 0 || item.dias_hasta_agotarse <= alertDays;
    return {
      ...item,
      alerta_stock: withinThreshold,
      riesgo_agotamiento: item.alta_demanda && withinThreshold,
    };
  });
}

export function normalizeRevenueForecastForHorizon(revenueForecast: RevenueForecast | null): RevenueForecast | null {
  const summary = revenueForecast?.summary;
  if (!summary || !revenueForecast) return null;

  const selectedHorizon = revenueForecast.horizon_days;
  const proximoHorizonte =
    summary.proximo_horizonte ?? (selectedHorizon <= 7 ? summary.proximo_7_dias : summary.proximo_30_dias);

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
}

export type ResumenEjecutivoArgs = {
  revenueSummary: RevenueSummary | null;
  horizon: number;
  riskAlerts: Prediction[];
  sobreStock: number;
  conHistorial: number;
  rotacionDebil: number;
  enRiesgo: number;
  altaDemanda: number;
  promedioCobertura: number;
  alertDays: number;
  productoMotor: Prediction | null;
};

export type ResumenEjecutivoCtx = ResumenEjecutivoArgs & {
  growth: number;
  tendencia: RevenueSummary["tendencia"];
  confianza: number;
  principalRiesgo: Prediction | null;
  inventarioPesado: boolean;
  negocioDebil: boolean;
};

export function buildResumenEjecutivoCtx(args: ResumenEjecutivoArgs): ResumenEjecutivoCtx {
  const growth = args.revenueSummary?.crecimiento_estimado_horizonte_pct ?? 0;
  const tendencia = args.revenueSummary?.tendencia ?? "estable";
  const confianza = args.revenueSummary?.confianza ?? 0;
  const principalRiesgo = args.riskAlerts[0] ?? null;
  const inventarioPesado = args.sobreStock >= Math.max(2, Math.ceil(args.conHistorial * 0.25));
  const negocioDebil =
    growth <= -8 ||
    ((growth < 3 || tendencia === "bajando") && inventarioPesado && args.altaDemanda <= 1);
  return {
    ...args,
    growth,
    tendencia,
    confianza,
    principalRiesgo,
    inventarioPesado,
    negocioDebil,
  };
}

export function resumenEjecutivoTitular(ctx: ResumenEjecutivoCtx): string {
  const { revenueSummary, negocioDebil, growth, enRiesgo, inventarioPesado } = ctx;
  if (revenueSummary && negocioDebil) {
    return "El negocio muestra señales de enfríamiento y stock acumulado; no conviene leer este escenario como una operación sana.";
  }
  if (revenueSummary && growth >= 8 && enRiesgo === 0 && !inventarioPesado) {
    return "La venta proyectada viene bien y el foco principal es sostener stock y margen.";
  }
  if (revenueSummary && growth >= 0 && enRiesgo > 0) {
    return "La venta puede sostenerse, pero ya hay productos que requieren reposición para no frenar el ritmo.";
  }
  if (revenueSummary && growth < 0 && enRiesgo === 0) {
    return "La proyección se enfría y conviene ajustar compras y seguimiento comercial antes de cerrar el periodo.";
  }
  if (revenueSummary && growth < 0 && enRiesgo > 0) {
    return "El negocio se desacelera y, al mismo tiempo, hay alertas de inventario que requieren reacción inmediata.";
  }
  if (enRiesgo > 0) {
    return "Hay alertas operativas activas y el panel recomienda priorizar inventario antes de comprar de nuevo.";
  }
  return "El negocio necesita una lectura más clara antes de tomar decisiones.";
}

export function resumenEjecutivoDetalle(ctx: ResumenEjecutivoCtx): string {
  const { revenueSummary, horizon, tendencia, confianza } = ctx;
  if (!revenueSummary) {
    return "Todavía no hay una proyección financiera disponible, pero ya se puede revisar el estado del inventario y la demanda.";
  }
  return `Para los próximos ${horizon} días se estiman ${formatCurrency(revenueSummary.proximo_horizonte)} con una tendencia ${formatTrendLabel(tendencia).toLowerCase()} y una confianza ${formatConfidenceLabel(confianza).toLowerCase()}.`;
}

export function resumenLecturaFinanciera(ctx: ResumenEjecutivoCtx): string {
  const { revenueSummary, negocioDebil, growth } = ctx;
  if (!revenueSummary) {
    return "Aún no se cuenta con una lectura financiera consolidada para este horizonte.";
  }
  if (negocioDebil) {
    return `Aunque no haya quiebres de stock, el ritmo proyectado luce flojo: se estiman ${formatCurrency(revenueSummary.proximo_horizonte)} y el crecimiento frente al último tramo es ${formatPercent(growth)}.`;
  }
  if (growth >= 0) {
    return `Si el ritmo actual se mantiene, el negocio podría cerrar el horizonte con ${formatCurrency(revenueSummary.proximo_horizonte)}, que representa ${formatPercent(growth)} frente al mismo tramo anterior.`;
  }
  return `Si no se corrige el ritmo actual, el negocio podría cerrar en ${formatCurrency(revenueSummary.proximo_horizonte)}, es decir ${formatPercent(growth)} frente al mismo tramo anterior.`;
}

export function resumenLecturaInventario(ctx: ResumenEjecutivoCtx): string {
  const { principalRiesgo, inventarioPesado, sobreStock, rotacionDebil, promedioCobertura, enRiesgo, alertDays } = ctx;
  if (principalRiesgo) {
    return `${principalRiesgo.nombre} es hoy el caso más sensible: tiene ${principalRiesgo.stock_actual} unidades y una cobertura aproximada de ${principalRiesgo.dias_hasta_agotarse} días.`;
  }
  if (inventarioPesado) {
    return `No faltan productos, pero hay ${sobreStock} con stock acumulado y ${rotacionDebil} con rotación débil. La cobertura promedio ronda ${Math.round(promedioCobertura || 0)} días.`;
  }
  if (enRiesgo === 0) {
    return "No hay productos en riesgo para este horizonte. La cobertura de stock luce controlada.";
  }
  return `Hay ${enRiesgo} productos que necesitan seguimiento de stock (umbral: ${alertDays} días).`;
}

export function resumenLecturaPortafolio(ctx: ResumenEjecutivoCtx): string {
  const { productoMotor, conHistorial } = ctx;
  if (productoMotor) {
    return `${productoMotor.nombre} lidera la rotación actual con un consumo estimado de ${formatUnits(productoMotor.consumo_estimado_diario)} unidades por día.`;
  }
  if (conHistorial > 0) {
    return `El portafolio ya cuenta con ${conHistorial} productos con historial suficiente para analizar comportamiento.`;
  }
  return "Aún no hay historial suficiente para identificar productos motores del negocio.";
}

export function resumenRecomendacion(ctx: ResumenEjecutivoCtx): string {
  const { principalRiesgo, inventarioPesado, altaDemanda } = ctx;
  if (principalRiesgo) {
    return `Reponer primero ${principalRiesgo.nombre}, vigilar los productos en riesgo y luego revisar el mix de compra según demanda real.`;
  }
  if (inventarioPesado) {
    return "Frenar compras en los productos de baja rotación, revisar descuentos o salida comercial y comprar solo lo que tenga demanda comprobada.";
  }
  if (altaDemanda > 0) {
    return "Asegurar inventario en los productos de mayor salida y evitar sobrecomprar en los que vienen bajando.";
  }
  return "Mantener seguimiento semanal y usar este panel como base para comparar lo proyectado contra lo real.";
}

export function buildResumenEjecutivoBloques(args: ResumenEjecutivoArgs): {
  titular: string;
  detalle: string;
  lecturaFinanciera: string;
  lecturaInventario: string;
  lecturaPortafolio: string;
  recomendacion: string;
} {
  const ctx = buildResumenEjecutivoCtx(args);
  return {
    titular: resumenEjecutivoTitular(ctx),
    detalle: resumenEjecutivoDetalle(ctx),
    lecturaFinanciera: resumenLecturaFinanciera(ctx),
    lecturaInventario: resumenLecturaInventario(ctx),
    lecturaPortafolio: resumenLecturaPortafolio(ctx),
    recomendacion: resumenRecomendacion(ctx),
  };
}

export function adminPredictionsSortPriority(item: Prediction): number {
  if (item.sin_historial) return 5;
  if (item.stock_actual === 0 && item.alta_demanda) return 0;
  if (item.alerta_stock) return 1;
  return 2 + riskPriority[item.nivel_riesgo];
}

export function filterPredictionsBySearchQuery(items: Prediction[], searchRaw: string): Prediction[] {
  const query = searchRaw.trim().toLowerCase();
  if (!query) return items;
  return items.filter((item) => {
    const haystack = [item.codigo, item.nombre, item.categoria].join(" ").toLowerCase();
    return haystack.includes(query);
  });
}

export function sortPredictionsByAdminPriority(items: Prediction[]): Prediction[] {
  return [...items].sort(
    (a, b) =>
      adminPredictionsSortPriority(a) - adminPredictionsSortPriority(b) ||
      b.consumo_estimado_diario - a.consumo_estimado_diario,
  );
}

export type PredictionWithAbc = Prediction & { abc: "A" | "B" | "C" };

export function buildAbcInventoryItems(predictionsForView: Prediction[]): PredictionWithAbc[] {
  const withH = predictionsForView.filter((p) => !p.sin_historial && p.total_vendido_historico > 0);
  const sorted = [...withH].sort(
    (a, b) => b.total_vendido_historico * b.precio - a.total_vendido_historico * a.precio,
  );
  const totalRev = sorted.reduce((s, p) => s + p.total_vendido_historico * p.precio, 0);
  return sorted.reduce<{ items: PredictionWithAbc[]; cum: number }>(
    ({ items, cum }, p) => {
      const newCum = cum + p.total_vendido_historico * p.precio;
      const pct = totalRev > 0 ? newCum / totalRev : 0;
      const abc = (pct <= 0.80 ? "A" : pct <= 0.95 ? "B" : "C") as "A" | "B" | "C";
      return { cum: newCum, items: [...items, { ...p, abc }] };
    },
    { items: [], cum: 0 },
  ).items;
}

export type TabPrefetchScheduleInput = {
  activeTab: PredictionTab;
  weeklyChartFetched: boolean;
  weeklyChartLoading: boolean;
  modelMetricsFetched: boolean;
  modelMetricsLoading: boolean;
  modeloMeta: ModeloMeta | null;
  ireHistorialFetched: boolean;
  campanaFetched: boolean;
  campanaLoading: boolean;
  learningStatsFetched: boolean;
  loadWeeklyChart: () => Promise<void>;
  loadModelMetrics: () => Promise<void>;
  loadIreHistorial: () => Promise<void>;
  loadCampana: () => Promise<void>;
  loadLearningStats: () => Promise<void>;
};

export function scheduleTabPrefetchTimeouts(p: TabPrefetchScheduleInput): () => void {
  const timers: ReturnType<typeof window.setTimeout>[] = [];
  if (p.activeTab === "ventas" && !p.weeklyChartFetched && !p.weeklyChartLoading) {
    timers.push(
      window.setTimeout(() => {
        void p.loadWeeklyChart().catch(() => undefined);
      }, 0),
    );
  }
  if (p.activeTab === "modelo" && !p.modelMetricsFetched && !p.modelMetricsLoading && p.modeloMeta) {
    timers.push(
      window.setTimeout(() => {
        void p.loadModelMetrics().catch(() => undefined);
      }, 0),
    );
  }
  if ((p.activeTab === "resumen" || p.activeTab === "ire") && !p.ireHistorialFetched) {
    timers.push(
      window.setTimeout(() => {
        void p.loadIreHistorial().catch(() => undefined);
      }, 0),
    );
  }
  if (p.activeTab === "campanas" && !p.campanaFetched && !p.campanaLoading) {
    timers.push(
      window.setTimeout(() => {
        void p.loadCampana().catch(() => undefined);
      }, 0),
    );
  }
  if (p.activeTab === "campanas" && !p.learningStatsFetched) {
    timers.push(
      window.setTimeout(() => {
        void p.loadLearningStats().catch(() => undefined);
      }, 0),
    );
  }
  return () => {
    timers.forEach((id) => window.clearTimeout(id));
  };
}

const CAMPANA_NIVEL_COLOR: Record<string, string> = {
  alta: "critico",
  media: "alto",
  baja: "moderado",
  normal: "bajo",
  observando: "moderado",
};

const CAMPANA_NIVEL_LABEL: Record<string, string> = {
  alta: "Alta demanda",
  media: "Campaña activa",
  baja: "Actividad elevada",
  normal: "Normal",
  observando: "En observación",
};

const CAMPANA_ESTADO_LABEL: Record<string, string> = {
  inicio: "Inicio",
  activa: "Activa",
  finalizando: "Finalizando",
  en_riesgo_stock: "Riesgo stock",
  finalizada: "Finalizada",
  descartada: "Descartada",
  observando: "En observación",
};

export function campanaHistorialImpactoSoles(h: CampanaDetectada): number {
  return h.scope === "focalizada" && (h.impacto_estimado_soles_focalizado ?? 0) > 0
    ? h.impacto_estimado_soles_focalizado ?? 0
    : h.impacto_estimado_soles ?? 0;
}

export function CampanaFeedbackActions({
  campana,
  feedbackLoading,
  onFeedback,
  onRefresh,
}: {
  campana: CampanaDetectada;
  feedbackLoading: boolean;
  onFeedback: (id: number, accion: "confirmar" | "descartar") => void;
  onRefresh: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", minWidth: "152px" }}>
      {campana.confirmada_por_admin == null ? (
        <>
          <button
            type="button"
            className="pred-btn"
            disabled={feedbackLoading}
            onClick={() => onFeedback(campana.id, "confirmar")}
            style={{ background: "#22c55e", color: "#fff", border: "none", fontWeight: 600, padding: "0.55rem 1rem" }}
          >
            {feedbackLoading ? "…" : "✓ Confirmar"}
          </button>
          <button
            type="button"
            className="pred-btn"
            disabled={feedbackLoading}
            onClick={() => onFeedback(campana.id, "descartar")}
            style={{
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.28)",
              fontWeight: 600,
              padding: "0.55rem 1rem",
            }}
          >
            {feedbackLoading ? "…" : "✗ Descartar"}
          </button>
        </>
      ) : (
        <div
          style={{
            padding: "0.6rem 0.9rem",
            borderRadius: "0.5rem",
            fontWeight: 600,
            fontSize: "0.85rem",
            background: campana.confirmada_por_admin ? "rgba(34,197,94,0.18)" : "rgba(239,68,68,0.18)",
          }}
        >
          {campana.confirmada_por_admin ? "✓ Confirmada" : "✗ Descartada"}
          {campana.admin_nota && (
            <p style={{ margin: "0.3rem 0 0", opacity: 0.8, fontSize: "0.78rem", fontWeight: 400 }}>{campana.admin_nota}</p>
          )}
        </div>
      )}
      <button type="button" className="pred-btn" style={{ fontSize: "0.8rem", padding: "0.35rem 0.75rem", opacity: 0.7 }} onClick={onRefresh}>
        Actualizar
      </button>
    </div>
  );
}

export function CampanaActivaPanel({
  campana: c,
  feedbackLoading,
  onFeedback,
  onRefresh,
}: {
  campana: CampanaDetectada;
  feedbackLoading: boolean;
  onFeedback: (id: number, accion: "confirmar" | "descartar") => void;
  onRefresh: () => void;
}) {
  const nc = CAMPANA_NIVEL_COLOR[c.nivel] ?? "moderado";
  const TIMELINE_STEPS: { key: string; label: string; side?: boolean }[] = [
    { key: "inicio", label: "Inicio" },
    { key: "activa", label: "Activa" },
    { key: "en_riesgo_stock", label: "Riesgo stock", side: true },
    { key: "finalizando", label: "Finalizando" },
    { key: "finalizada", label: "Finalizada" },
  ];
  const mainSteps = TIMELINE_STEPS.filter((s) => !s.side);
  const mainOrder = mainSteps.map((s) => s.key);
  const currentIdx = mainOrder.indexOf(c.estado === "en_riesgo_stock" ? "activa" : c.estado);

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 0, padding: "0.65rem 0.25rem", overflowX: "auto" }}>
        {mainSteps.map((step, i) => {
          const isDone = i < currentIdx;
          const isCurrent = i === currentIdx;
          const isRiesgo = c.estado === "en_riesgo_stock" && step.key === "activa";
          const color = isRiesgo ? "#f59e0b" : isCurrent ? "#6366f1" : isDone ? "#22c55e" : "rgba(255,255,255,0.18)";
          const labelColor = isCurrent || isRiesgo ? "#fff" : isDone ? "#22c55e" : "rgba(255,255,255,0.45)";
          return (
            <div
              key={step.key}
              style={{ display: "flex", alignItems: "center", flex: i < mainSteps.length - 1 ? 1 : undefined, minWidth: 0 }}
            >
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem", minWidth: "4.5rem" }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: color,
                    border: `2px solid ${color}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: "#fff",
                    flexShrink: 0,
                  }}
                >
                  {isDone ? "✓" : i + 1}
                </div>
                <span style={{ fontSize: "0.68rem", color: labelColor, textAlign: "center", whiteSpace: "nowrap" }}>
                  {isRiesgo ? "Riesgo stock" : step.label}
                </span>
              </div>
              {i < mainSteps.length - 1 && (
                <div
                  style={{
                    flex: 1,
                    height: 2,
                    margin: "0 0.15rem",
                    marginBottom: "1.1rem",
                    background: i < currentIdx ? "#22c55e" : "rgba(255,255,255,0.15)",
                    minWidth: "1.5rem",
                  }}
                />
              )}
            </div>
          );
        })}
        {c.estado === "descartada" && (
          <span style={{ fontSize: "0.8rem", color: "#ef4444", fontWeight: 600, marginLeft: "0.75rem" }}>✗ Descartada</span>
        )}
      </div>

      <div className={`ire-hero ire-hero-${nc}`} style={{ flexWrap: "wrap", gap: "1rem" }}>
        <div className="ire-left" style={{ flex: "1 1 280px" }}>
          <div className="ire-label" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
            <span>Campaña detectada</span>
            {c.scope && (
              <span
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  padding: "0.15rem 0.5rem",
                  borderRadius: "999px",
                  background: "rgba(255,255,255,0.2)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {c.scope === "focalizada" ? `Focalizada · ${c.foco_tipo ?? "segmento"}` : "Alcance global"}
              </span>
            )}
            {c.foco_nombre && <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>— {c.foco_nombre}</span>}
          </div>

          <div className="ire-score-row" style={{ gap: "0.75rem", flexWrap: "wrap" }}>
            <span className={`ire-nivel ire-nivel-${nc}`}>{CAMPANA_NIVEL_LABEL[c.nivel] ?? c.nivel}</span>
            {c.confidence_pct != null && (
              <span style={{ fontSize: "0.9rem", opacity: 0.8 }}>Confianza {c.confidence_pct}%</span>
            )}
          </div>

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
              <div style={{ fontWeight: 600 }}>{CAMPANA_ESTADO_LABEL[c.estado] ?? c.estado}</div>
            </div>
            {c.fecha_inicio && (
              <div>
                <div style={{ fontSize: "0.7rem", opacity: 0.7, marginBottom: "0.15rem" }}>Desde</div>
                <div style={{ fontWeight: 600 }}>{c.fecha_inicio}</div>
              </div>
            )}
          </div>
        </div>

        <CampanaFeedbackActions campana={c} feedbackLoading={feedbackLoading} onFeedback={onFeedback} onRefresh={onRefresh} />
      </div>

      {c.recomendacion && (
        <div
          className="pred-warning"
          style={{
            background: "rgba(234,179,8,0.07)",
            border: "1px solid rgba(234,179,8,0.28)",
            borderRadius: "0.75rem",
            padding: "0.85rem 1rem",
            fontSize: "0.9rem",
            lineHeight: 1.6,
          }}
        >
          <strong>Recomendación · </strong>
          {c.recomendacion}
        </div>
      )}

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
                  <tr key={p.producto_id} className={p.stock_actual === 0 ? "pred-row-alert" : ""}>
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
                    <td
                      style={{
                        fontWeight: 600,
                        color:
                          p.stock_actual === 0 ? "#ef4444" : (p.stock_actual ?? 999) < 5 ? "#f59e0b" : undefined,
                      }}
                    >
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
}

export function CampanasHistorialTable({ historial }: { historial: CampanaDetectada[] }) {
  const nivelBadge: Record<string, string> = {
    alta: "critico",
    media: "alerta",
    baja: "alerta",
  };
  return (
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
            {historial.map((h) => {
              const impacto = campanaHistorialImpactoSoles(h);
              return (
                <tr key={h.id}>
                  <td>{h.fecha_deteccion}</td>
                  <td>
                    <span className={`pred-estado-badge ${nivelBadge[h.nivel] ?? ""}`}>{h.nivel}</span>
                  </td>
                  <td>{h.scope ?? "—"}</td>
                  <td style={{ fontSize: "0.83rem" }}>{h.foco_nombre ? `${h.foco_tipo}: ${h.foco_nombre}` : "—"}</td>
                  <td>{h.uplift_ratio != null ? `${h.uplift_ratio.toFixed(2)}×` : "—"}</td>
                  <td>{impacto > 0 ? `S/ ${impacto.toLocaleString("es-PE", { minimumFractionDigits: 2 })}` : "—"}</td>
                  <td>{CAMPANA_ESTADO_LABEL[h.estado] ?? h.estado}</td>
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
  );
}

export function CampanasPanelBody({
  data,
  feedbackLoading,
  onFeedback,
  onRefresh,
}: {
  data: CampanaActiveResponse;
  feedbackLoading: boolean;
  onFeedback: (id: number, accion: "confirmar" | "descartar") => void;
  onRefresh: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {!data.activa && (
        <div className="ire-hero ire-hero-bajo" style={{ flexDirection: "column", alignItems: "flex-start", gap: "0.75rem" }}>
          <div className="ire-label">Estado de campañas</div>
          <p style={{ margin: 0, fontWeight: 600, fontSize: "1.05rem" }}>Sin campaña activa en este momento</p>
          <p style={{ margin: 0, opacity: 0.75, fontSize: "0.9rem" }}>
            El sistema monitorea ventas en tiempo real. Se registrará automáticamente cuando detecte actividad elevada o focalizada.
          </p>
          <button type="button" className="pred-btn" onClick={onRefresh} style={{ marginTop: "0.25rem" }}>
            Actualizar
          </button>
        </div>
      )}

      {data.activa && (
        <CampanaActivaPanel
          campana={data.activa}
          feedbackLoading={feedbackLoading}
          onFeedback={onFeedback}
          onRefresh={onRefresh}
        />
      )}

      {data.historial.length > 0 && <CampanasHistorialTable historial={data.historial} />}
    </div>
  );
}

export function IreProyectadoDeltaBadge({ projectedScore, actualScore }: { projectedScore: number; actualScore: number }) {
  const delta = projectedScore - actualScore;
  if (delta === 0) {
    return <span className="ire-proy-delta ire-proy-delta-eq">sin cambio</span>;
  }
  const up = delta > 0;
  return (
    <span className={`ire-proy-delta ire-proy-delta-${up ? "up" : "down"}`}>
      {up ? "▲" : "▼"} {Math.abs(delta)} pts
    </span>
  );
}

export function FinanzasRiesgoPanel({
  predictionsForView,
  revenueSummary,
}: {
  predictionsForView: Prediction[];
  revenueSummary: RevenueSummary | null | undefined;
}) {
  const sobrestock = predictionsForView.filter(
    (p) => !p.sin_historial && p.dias_hasta_agotarse >= 60 && p.stock_actual > 5,
  );
  const capitalInmovilizado = sobrestock.reduce((s, p) => s + p.stock_actual * p.precio, 0);
  const enDescenso = predictionsForView.filter((p) => !p.sin_historial && p.tendencia === "bajando");
  const ingresosEnRiesgo = enDescenso.reduce((s, p) => s + p.consumo_estimado_diario * 30 * p.precio, 0);
  const diarioProyect = revenueSummary?.promedio_diario_proyectado ?? 0;
  const semanas = [1, 2, 3, 4].map((w) => ({
    label: `Semana ${w}`,
    valor: diarioProyect * 7,
    acumulado: diarioProyect * 7 * w,
  }));

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
          <span className="fin-risk-kpi-sub">
            {sobrestock.length} producto{sobrestock.length !== 1 ? "s" : ""} con más de 60 días de cobertura
          </span>
        </div>
        <div className={`fin-risk-kpi ${ingresosEnRiesgo > 0 ? "fin-risk-kpi-danger" : "fin-risk-kpi-ok"}`}>
          <span className="fin-risk-kpi-label">Ingresos en riesgo</span>
          <span className="fin-risk-kpi-val">{formatCurrency(ingresosEnRiesgo)}</span>
          <span className="fin-risk-kpi-sub">
            {enDescenso.length} producto{enDescenso.length !== 1 ? "s" : ""} con demanda bajando — proyección 30 d
          </span>
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
              .map((p) => {
                const cap = p.stock_actual * p.precio;
                const pct = capitalInmovilizado > 0 ? (cap / capitalInmovilizado) * 100 : 0;
                return (
                  <div key={p.productId} className="fin-risk-stock-row">
                    <div className="fin-risk-stock-info">
                      <span className="fin-risk-stock-name">{p.nombre}</span>
                      <span className="fin-risk-stock-meta">
                        Stock: {p.stock_actual} uds ·{" "}
                        {p.dias_hasta_agotarse >= 999 ? "sin consumo activo" : `~${p.dias_hasta_agotarse} días de cobertura`}
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
          <p className="ranking-section-note">
            Proyección lineal basada en el promedio diario del modelo. No contempla estacionalidad ni eventos extraordinarios.
          </p>
        </div>
      )}
    </div>
  );
}

export function rankingSalesKey(period: RankingPeriod): keyof Prediction {
  if (period === 7) return "ventas_7_dias";
  if (period === 15) return "ventas_15_dias";
  return "ventas_30_dias";
}

export function rankingRecomendacionTexto(
  p: Prediction,
  periodKey: keyof Prediction,
): { texto: string; nivel: "critico" | "advertencia" | "sugerencia" } {
  const v = (p[periodKey] as number) ?? 0;
  if (p.sin_historial && p.stock_actual === 0) {
    return { texto: "Sin stock y sin ventas. Evalúa si el producto sigue vigente en el catálogo.", nivel: "sugerencia" };
  }
  if (p.sin_historial) {
    return { texto: "Sin ventas registradas. Verifica visibilidad en tienda y precio competitivo.", nivel: "sugerencia" };
  }
  if (v === 0 && p.stock_actual > 20) {
    return {
      texto: "Sin movimiento con stock alto. Aplica descuento del 20–30% o liquida antes de que pierda valor.",
      nivel: "critico",
    };
  }
  if (v === 0 && p.stock_actual > 0) {
    return { texto: "Sin ventas en este período. Revisa precio, ubicación en tienda o visibilidad en web.", nivel: "advertencia" };
  }
  if (v < 2 && p.stock_actual > 15) {
    return {
      texto: "Rotación muy baja con sobrestock. Combínalo en kit con producto estrella o reubica en zona de mayor tráfico.",
      nivel: "advertencia",
    };
  }
  if (p.tendencia === "bajando" && p.stock_actual > 20) {
    return {
      texto: "Demanda en descenso con inventario alto. Reduce precio ahora antes de que el stock siga acumulando.",
      nivel: "advertencia",
    };
  }
  if (p.dias_hasta_agotarse > 90) {
    return {
      texto: "Cobertura mayor a 3 meses: capital inmovilizado. Prioriza liquidar con descuento promocional.",
      nivel: "advertencia",
    };
  }
  return { texto: "Rotación baja pero estable. Monitorea semanalmente y considera una promoción puntual.", nivel: "sugerencia" };
}

export function RankingAbcBlock({ abcData }: { abcData: PredictionWithAbc[] }) {
  if (abcData.length === 0) return null;
  const catA = abcData.filter((p) => p.abc === "A");
  const catB = abcData.filter((p) => p.abc === "B");
  const catC = abcData.filter((p) => p.abc === "C");
  const totalRev = abcData.reduce((s, p) => s + p.total_vendido_historico * p.precio, 0);
  const revA = catA.reduce((s, p) => s + p.total_vendido_historico * p.precio, 0);
  const revB = catB.reduce((s, p) => s + p.total_vendido_historico * p.precio, 0);
  const revC = catC.reduce((s, p) => s + p.total_vendido_historico * p.precio, 0);
  const pct = (v: number) => (totalRev > 0 ? ((v / totalRev) * 100).toFixed(1) : "0");
  return (
    <>
      <div className="ranking-section-title" style={{ marginTop: "2rem" }}>
        <Package size={16} /> Análisis ABC de inventario
      </div>
      <p className="ranking-section-note">
        Clasifica productos por su contribución a los ingresos históricos. A = 80% del ingreso, B = 15%, C = 5%.
      </p>
      <div className="abc-grid">
        <div className="abc-card abc-card-a">
          <div className="abc-letter abc-letter-a">A</div>
          <div className="abc-count">{catA.length} productos</div>
          <div className="abc-pct-rev">
            {pct(revA)}% del ingreso · S/ {revA.toLocaleString("es-PE", { maximumFractionDigits: 0 })}
          </div>
          <div className="abc-desc">Productos estrella. Mantén stock prioritario y reabastece antes de llegar al umbral crítico.</div>
        </div>
        <div className="abc-card abc-card-b">
          <div className="abc-letter abc-letter-b">B</div>
          <div className="abc-count">{catB.length} productos</div>
          <div className="abc-pct-rev">
            {pct(revB)}% del ingreso · S/ {revB.toLocaleString("es-PE", { maximumFractionDigits: 0 })}
          </div>
          <div className="abc-desc">Importancia media. Monitorea rotación y ajusta pedidos según tendencia.</div>
        </div>
        <div className="abc-card abc-card-c">
          <div className="abc-letter abc-letter-c">C</div>
          <div className="abc-count">{catC.length} productos</div>
          <div className="abc-pct-rev">
            {pct(revC)}% del ingreso · S/ {revC.toLocaleString("es-PE", { maximumFractionDigits: 0 })}
          </div>
          <div className="abc-desc">Baja contribución. Evalúa liquidar stock excedente o discontinuar si no hay demanda.</div>
        </div>
      </div>
      <div className="abc-list">
        {abcData.slice(0, 12).map((p) => (
          <div key={p.productId} className="abc-row">
            <span className={`abc-row-badge abc-row-badge-${p.abc}`}>{p.abc}</span>
            <span className="abc-row-name">{p.nombre}</span>
            <span className="abc-row-rev">
              S/ {(p.total_vendido_historico * p.precio).toLocaleString("es-PE", { maximumFractionDigits: 0 })}
            </span>
            <span className="abc-row-pct">{pct(p.total_vendido_historico * p.precio)}%</span>
          </div>
        ))}
        {abcData.length > 12 && (
          <p className="ranking-section-note" style={{ margin: "0.25rem 0 0" }}>
            + {abcData.length - 12} productos más no mostrados.
          </p>
        )}
      </div>
    </>
  );
}

export function PredictionsRankingTabPanel({
  predictions,
  rankingPeriod,
  setRankingPeriod,
  abcData,
  tabDirection,
}: {
  predictions: Prediction[];
  rankingPeriod: RankingPeriod;
  setRankingPeriod: Dispatch<SetStateAction<RankingPeriod>>;
  abcData: PredictionWithAbc[];
  tabDirection: number;
}) {
  const periodKey = rankingSalesKey(rankingPeriod);
  const periodLabel = rankingPeriod === 7 ? "7 días" : rankingPeriod === 15 ? "15 días" : "30 días";
  const withHistory = predictions.filter((p) => !p.sin_historial && ((p[periodKey] as number) ?? 0) > 0);
  const top3 = [...withHistory]
    .sort((a, b) => ((b[periodKey] as number) ?? 0) - ((a[periodKey] as number) ?? 0))
    .slice(0, 3);
  const bottomPool = predictions
    .filter((p) => p.stock_actual > 0)
    .sort((a, b) => ((a[periodKey] as number) ?? 0) - ((b[periodKey] as number) ?? 0));
  const bottom = bottomPool.slice(0, 6);
  const medals = ["🥇", "🥈", "🥉"];
  const medalColors = ["ranking-gold", "ranking-silver", "ranking-bronze"];

  return (
    <motion.div
      key="tab-ranking"
      initial={{ opacity: 0, x: tabDirection * 28 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -tabDirection * 28 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="ranking-period-bar">
        <span className="ranking-period-label">Período:</span>
        {([7, 15, 30] as RankingPeriod[]).map((p) => (
          <button
            key={p}
            type="button"
            className={`ranking-period-btn${rankingPeriod === p ? " active" : ""}`}
            onClick={() => setRankingPeriod(p)}
          >
            {p === 7 ? "Semana" : p === 15 ? "15 días" : "Mes"}
          </button>
        ))}
      </div>

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
                S/{" "}
                {(((p[periodKey] as number) ?? 0) * p.precio).toLocaleString("es-PE", { maximumFractionDigits: 0 })}
              </div>
              <div className={`ranking-trend-badge ${p.tendencia}`}>
                {p.tendencia === "subiendo" ? "↑ Subiendo" : p.tendencia === "bajando" ? "↓ Bajando" : "→ Estable"}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="ranking-section-title ranking-section-title-warn">
        <AlertTriangle size={16} /> Productos de baja rotación — {periodLabel}
      </div>
      <p className="ranking-section-note">
        Productos con stock disponible y pocas o ninguna venta en el período. Se incluyen recomendaciones de acción.
      </p>
      <div className="ranking-bottom-list">
        {bottom.map((p, i) => {
          const rec = rankingRecomendacionTexto(p, periodKey);
          const ventas = (p[periodKey] as number) ?? 0;
          return (
            <div key={p.productId} className={`ranking-bottom-card ranking-bottom-${rec.nivel}`}>
              <div className="ranking-bottom-left">
                <span className="ranking-bottom-pos">#{i + 1}</span>
                {p.imagen ? (
                  <img src={p.imagen} alt={p.nombre} className="ranking-bottom-img" loading="lazy" />
                ) : (
                  <div className="ranking-bottom-img-placeholder">
                    <Package size={18} />
                  </div>
                )}
                <div className="ranking-bottom-info">
                  <div className="ranking-bottom-name">{p.nombre}</div>
                  <div className="ranking-bottom-meta">
                    {p.categoria} · Stock: {p.stock_actual} uds · Vendido: {ventas.toFixed(0)} uds
                  </div>
                </div>
              </div>
              <div className={`ranking-rec ranking-rec-${rec.nivel}`}>
                <span className="ranking-rec-icon">
                  {rec.nivel === "critico" ? "🔴" : rec.nivel === "advertencia" ? "🟡" : "🔵"}
                </span>
                <span>{rec.texto}</span>
              </div>
            </div>
          );
        })}
      </div>

      <RankingAbcBlock abcData={abcData} />
    </motion.div>
  );
}

export function selectTopRiskAlertsForPanel(predictionsForView: Prediction[]): Prediction[] {
  return predictionsForView
    .filter((item) => !item.sin_historial && (item.alerta_stock || (item.stock_actual === 0 && item.alta_demanda)))
    .sort((a, b) => {
      if (a.stock_actual === 0 && b.stock_actual !== 0) return -1;
      if (a.stock_actual !== 0 && b.stock_actual === 0) return 1;
      return a.dias_hasta_agotarse - b.dias_hasta_agotarse;
    })
    .slice(0, 6);
}

export function buildDistribucionInventarioFromView(predictionsForView: Prediction[]) {
  const items = [
    {
      label: "Crítico",
      count: predictionsForView.filter(
        (item) => !item.sin_historial && (item.stock_actual === 0 || item.nivel_riesgo === "critico"),
      ).length,
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
}

export function computePredictionCountKpis(predictionsForView: Prediction[]) {
  const enRiesgo = predictionsForView.filter((item) => !item.sin_historial && item.alerta_stock).length;
  const sinStock = predictionsForView.filter((item) => !item.sin_historial && item.stock_actual === 0).length;
  const altaDemanda = predictionsForView.filter((item) => !item.sin_historial && item.alta_demanda).length;
  const conHistorial = predictionsForView.filter((item) => !item.sin_historial).length;
  const sinHistorial = predictionsForView.filter((item) => item.sin_historial).length;
  const sobreStock = predictionsForView.filter((item) => !item.sin_historial && isOverstocked(item)).length;
  const rotacionDebil = predictionsForView.filter((item) => !item.sin_historial && isSlowMoving(item)).length;
  const conCobertura = predictionsForView.filter((item) => !item.sin_historial && item.dias_hasta_agotarse < 999);
  const promedioCobertura = conCobertura.reduce(
    (acc, item, _, arr) => acc + (item.dias_hasta_agotarse / Math.max(arr.length, 1)),
    0,
  );
  return {
    enRiesgo,
    sinStock,
    altaDemanda,
    conHistorial,
    sinHistorial,
    sobreStock,
    rotacionDebil,
    promedioCobertura,
  };
}

export function selectProductoMotorPrediction(predictionsForView: Prediction[]): Prediction | null {
  const sorted = [...predictionsForView]
    .filter((item) => !item.sin_historial)
    .sort((a, b) => b.consumo_estimado_diario - a.consumo_estimado_diario);
  return sorted[0] ?? null;
}
