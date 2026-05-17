import type { Prediction } from "./adminPredictionsLogic";
import type { ModeloMeta } from "./adminPredictionsLogic";

/** Mismo umbral que `models/demand.py` → MIN_TRAIN_ROWS. */
export const MIN_TRAIN_ROWS_DEMAND = 30;

export type PredictionDemandPolicy = {
  demandMetricsAvailable: boolean;
  insufficientReason: string;
};

export function isPredictionDataSufficient(meta: ModeloMeta | null | undefined): boolean {
  if (!meta) return false;
  if (typeof meta.data_sufficient === "boolean") return meta.data_sufficient;
  return meta.model_type === "random_forest" && meta.n_samples >= MIN_TRAIN_ROWS_DEMAND;
}

export function predictionInsufficientMessage(meta: ModeloMeta | null | undefined): string {
  if (!meta) {
    return "No hay metadatos del modelo. Registra ventas en tienda y pedidos completados, luego pulsa Reintentar.";
  }
  if (meta.insufficient_reason?.trim()) return meta.insufficient_reason.trim();
  if (meta.model_type !== "random_forest") {
    return "Datos insuficientes: el servicio usa promedio móvil en lugar del modelo ML.";
  }
  return `Datos insuficientes: se requieren al menos ${meta.min_train_rows ?? MIN_TRAIN_ROWS_DEMAND} muestras de entrenamiento (producto × día).`;
}

export function buildPredictionDemandPolicy(meta: ModeloMeta | null | undefined): PredictionDemandPolicy {
  const sufficient = isPredictionDataSufficient(meta);
  return {
    demandMetricsAvailable: sufficient,
    insufficientReason: sufficient ? "" : predictionInsufficientMessage(meta),
  };
}

/** @deprecated Usar `isDemandMetricHidden(product)` tras `applyPredictionsDemandPolicy`. */
export function shouldMaskPredictionMetrics(
  dataSufficient: boolean,
  product: { sin_historial: boolean },
): boolean {
  return !dataSufficient && !product.sin_historial;
}

export function isDemandMetricHidden(product: Pick<Prediction, "demanda_ml_oculta" | "sin_historial">): boolean {
  return product.demanda_ml_oculta === true && !product.sin_historial;
}

function historicalDailyConsumption(p: Prediction): number {
  return Math.max(p.promedio_diario_historico, p.consumo_diario_30, p.consumo_diario_7, 0);
}

/** Tendencia solo con ventas históricas (7 vs 30 días). */
export function historicalSalesTrend(
  p: Pick<Prediction, "ventas_7_dias" | "ventas_30_dias">,
): Prediction["tendencia"] {
  const weeklyRate = p.ventas_7_dias / 7;
  const monthlyRate = p.ventas_30_dias > 0 ? p.ventas_30_dias / 30 : 0;
  if (weeklyRate <= 0 && monthlyRate <= 0) return "estable";
  if (monthlyRate <= 0) return weeklyRate > 0.2 ? "subiendo" : "estable";
  const ratio = weeklyRate / monthlyRate;
  if (ratio >= 1.12) return "subiendo";
  if (ratio <= 0.88) return "bajando";
  return "estable";
}

/** Nivel de riesgo operativo a partir de cobertura histórica (sin ML). */
export function historicalInventoryRiskLevel(
  diasHastaAgotarse: number,
  stockActual: number,
): Prediction["nivel_riesgo"] {
  if (stockActual <= 0) return "critico";
  if (diasHastaAgotarse <= 7) return "critico";
  if (diasHastaAgotarse <= 14) return "atencion";
  if (diasHastaAgotarse <= 35) return "vigilancia";
  return "estable";
}

function coverageDaysFromHistorical(p: Prediction): number {
  if (p.sin_historial) return 999;
  if (p.stock_actual <= 0) return 0;
  const daily = historicalDailyConsumption(p);
  if (daily <= 0) return 999;
  return Math.min(999, Math.ceil(p.stock_actual / daily));
}

/** Oculta proyecciones ML; conserva stock e historial de ventas para alertas operativas. */
export function maskPredictionDemandFields(p: Prediction): Prediction {
  if (p.sin_historial) {
    return { ...p, demanda_ml_oculta: true };
  }
  const daily = historicalDailyConsumption(p);
  const dias = coverageDaysFromHistorical(p);
  const tendencia = historicalSalesTrend(p);
  const nivel_riesgo = historicalInventoryRiskLevel(dias, p.stock_actual);
  const alta_demandaHistorica =
    daily >= 1.2 && p.ventas_30_dias >= 12 && tendencia !== "bajando";
  return {
    ...p,
    demanda_ml_oculta: true,
    prediccion_unidades: 0,
    prediccion_diaria: 0,
    prediccion_semanal: 0,
    consumo_estimado_diario: daily,
    dias_hasta_agotarse: dias,
    tendencia,
    nivel_riesgo,
    alta_demanda: alta_demandaHistorica,
    riesgo_agotamiento: false,
    confianza: 0,
    drift_score: undefined,
  };
}

export function applyPredictionsDemandPolicy(
  predictions: Prediction[],
  dataSufficient: boolean,
): Prediction[] {
  if (dataSufficient) {
    return predictions.map((p) => ({ ...p, demanda_ml_oculta: false }));
  }
  return predictions.map((p) => maskPredictionDemandFields(p));
}

export function canExportDemandProjections(policy: PredictionDemandPolicy): boolean {
  return policy.demandMetricsAvailable;
}

export const ASSISTANT_QUICK_ACTIONS_WHEN_INSUFFICIENT = [
  { label: "¿Por qué no hay predicciones?", prompt: "¿Por qué el panel no muestra proyecciones de demanda todavía?" },
  { label: "Alertas de stock", prompt: "Lista los productos en mayor riesgo de inventario según ventas históricas." },
  { label: "Sin historial", prompt: "¿Qué productos siguen sin historial suficiente y qué implica?" },
  { label: "Qué datos faltan", prompt: "¿Qué datos debo registrar para activar el modelo de demanda?" },
] as const;

export function filterAssistantQuickActionsWhenInsufficient<T extends { label: string; prompt: string }>(
  actions: T[],
  policy: PredictionDemandPolicy,
): T[] {
  if (policy.demandMetricsAvailable) return actions;
  return ASSISTANT_QUICK_ACTIONS_WHEN_INSUFFICIENT.map((a) => ({ ...a })) as T[];
}

export function assistantReplyWhenDemandUnavailable(reason: string): string {
  const detail = reason.trim() || "Datos históricos insuficientes para predicciones fiables.";
  return [
    "Las proyecciones de demanda e ingresos del modelo no están disponibles todavía.",
    "",
    detail,
    "",
    "Puedes seguir usando este panel para revisar stock actual, ventas históricas, IRE y alertas operativas.",
    "Cuando haya más ventas en tienda y pedidos completados, pulsa Reintentar en la cabecera del panel.",
  ].join("\n");
}
