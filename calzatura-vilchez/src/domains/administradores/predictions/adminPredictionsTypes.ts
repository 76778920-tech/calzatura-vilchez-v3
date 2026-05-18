/** Tipos y constantes compartidos por AdminPredictions (fase 1 del refactor). */

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
  /** true cuando el dataset global no alcanza para ML: la UI no debe mostrar proyecciones de demanda. */
  demanda_ml_oculta?: boolean;
  talla_stock?: Record<string, number> | null;
  talla_residual?: boolean | null;
  stock_inicial_estimado?: number | null;
  sell_through_pct?: number | null;
  dias_en_catalogo?: number | null;
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
  sin_datos?: boolean;
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
  data_sufficient?: boolean;
  ml_active?: boolean;
  min_train_rows?: number;
  min_products_reliable?: number;
  insufficient_reason?: string;
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
export type AlertOption = 7 | 14 | 21 | 30;

export const HORIZON_OPTIONS: HorizonOption[] = [7, 15, 30];
export const HISTORY_OPTIONS: HistoryOption[] = [30, 60, 90, 120];
export const ALERT_OPTIONS: AlertOption[] = [7, 14, 21, 30];

export function loadPref<T extends number>(key: string, valid: T[], fallback: T): T {
  const v = Number(localStorage.getItem(key));
  return (valid as number[]).includes(v) ? (v as T) : fallback;
}

export type PredictionTab =
  | "resumen"
  | "ire"
  | "ventas"
  | "finanzas"
  | "ranking"
  | "modelo"
  | "asistente"
  | "campanas";
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

export const TAB_SEQUENCE: PredictionTab[] = [
  "resumen",
  "ire",
  "ventas",
  "finanzas",
  "ranking",
  "modelo",
  "asistente",
  "campanas",
];

export const IRE_NIVEL_LABELS: Record<string, string> = {
  bajo: "Bajo",
  moderado: "Moderado",
  alto: "Alto",
  critico: "Crítico",
};

export const IRE_DIM_CONFIG: { key: keyof IreDimensiones; label: string }[] = [
  { key: "riesgo_stock", label: "Stock" },
  { key: "riesgo_ingresos", label: "Ingresos" },
  { key: "riesgo_demanda", label: "Demanda" },
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
