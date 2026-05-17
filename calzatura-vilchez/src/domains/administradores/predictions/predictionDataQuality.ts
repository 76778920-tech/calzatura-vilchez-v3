import type { ModeloMeta } from "./adminPredictionsLogic";

/** Mismo umbral que `models/demand.py` → MIN_TRAIN_ROWS. */
export const MIN_TRAIN_ROWS_DEMAND = 30;

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

export function shouldMaskPredictionMetrics(
  dataSufficient: boolean,
  product: { sin_historial: boolean },
): boolean {
  return !dataSufficient && !product.sin_historial;
}
