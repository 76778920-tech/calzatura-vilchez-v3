import { describe, expect, it } from "vitest";
import {
  applyPredictionsDemandPolicy,
  assistantReplyWhenDemandUnavailable,
  buildPredictionDemandPolicy,
  canExportDemandProjections,
  filterAssistantQuickActionsWhenInsufficient,
  historicalInventoryRiskLevel,
  historicalSalesTrend,
  isDemandMetricHidden,
  isPredictionDataSufficient,
  maskPredictionDemandFields,
  predictionInsufficientMessage,
  shouldMaskPredictionMetrics,
} from "@/domains/administradores/predictions/predictionDataQuality";
import type { ModeloMeta, Prediction } from "@/domains/administradores/predictions/adminPredictionsLogic";
import {
  buildAssistantContextV2,
  exportPredictionsCSV,
  generarRecomendaciónes,
  generateAIResponseV2,
  isOverstocked,
  isSlowMoving,
} from "@/domains/administradores/predictions/adminPredictionsLogic";

const sufficientMeta: ModeloMeta = {
  n_samples: 120,
  n_products: 8,
  date_range_start: "2026-01-01",
  date_range_end: "2026-05-01",
  random_state: 42,
  sklearn_version: "1.5.2",
  feature_cols: [],
  feature_importances: [],
  feature_stats: {},
  data_hash: "abc",
  model_type: "random_forest",
  data_sufficient: true,
  ml_active: true,
};

const basePrediction: Prediction = {
  productId: "p1",
  codigo: "CV-1",
  nombre: "Zapato test",
  categoria: "hombre",
  precio: 100,
  stock_actual: 10,
  prediccion_unidades: 30,
  prediccion_diaria: 2,
  prediccion_semanal: 14,
  total_vendido_historico: 50,
  promedio_diario_historico: 1.5,
  ventas_7_dias: 10,
  ventas_30_dias: 40,
  consumo_diario_7: 1.4,
  consumo_diario_30: 1.3,
  consumo_estimado_diario: 2.5,
  dias_hasta_agotarse: 4,
  tendencia: "subiendo",
  confianza: 80,
  alta_demanda: true,
  riesgo_agotamiento: true,
  nivel_riesgo: "critico",
  alerta_stock: true,
  sin_historial: false,
};

describe("predictionDataQuality", () => {
  it("respeta data_sufficient del API", () => {
    expect(isPredictionDataSufficient({ ...sufficientMeta, data_sufficient: false })).toBe(false);
    expect(isPredictionDataSufficient(sufficientMeta)).toBe(true);
  });

  it("fallback legacy sin data_sufficient", () => {
    const legacy = { ...sufficientMeta } as ModeloMeta & { data_sufficient?: boolean };
    delete legacy.data_sufficient;
    expect(isPredictionDataSufficient(legacy)).toBe(true);
    expect(
      isPredictionDataSufficient({ ...legacy, model_type: "promedio_movil", n_samples: 10 } as ModeloMeta),
    ).toBe(false);
  });

  it("mensaje usa insufficient_reason si existe", () => {
    expect(
      predictionInsufficientMessage({
        ...sufficientMeta,
        data_sufficient: false,
        insufficient_reason: "Pocos productos con ventas.",
      }),
    ).toMatch(/Pocos productos/);
  });

  it("enmascara métricas solo cuando el dataset global es insuficiente", () => {
    expect(shouldMaskPredictionMetrics(false, { sin_historial: false })).toBe(true);
    expect(shouldMaskPredictionMetrics(false, { sin_historial: true })).toBe(false);
    expect(shouldMaskPredictionMetrics(true, { sin_historial: false })).toBe(false);
  });

  it("maskPredictionDemandFields oculta proyecciones ML y conserva historial", () => {
    const masked = maskPredictionDemandFields(basePrediction);
    expect(masked.demanda_ml_oculta).toBe(true);
    expect(masked.prediccion_unidades).toBe(0);
    expect(masked.confianza).toBe(0);
    expect(masked.consumo_estimado_diario).toBeGreaterThan(0);
    expect(masked.dias_hasta_agotarse).toBeLessThan(999);
    const weak = maskPredictionDemandFields({
      ...basePrediction,
      ventas_30_dias: 4,
      consumo_diario_30: 0.1,
      promedio_diario_historico: 0.1,
      consumo_diario_7: 0.1,
    });
    expect(weak.alta_demanda).toBe(false);
  });

  it("applyPredictionsDemandPolicy deja datos intactos si hay suficiente", () => {
    const out = applyPredictionsDemandPolicy([basePrediction], true);
    expect(out[0].prediccion_unidades).toBe(30);
    expect(out[0].demanda_ml_oculta).toBe(false);
  });

  it("canExportDemandProjections y quick actions dependen de la política", () => {
    const insufficient = buildPredictionDemandPolicy({
      ...sufficientMeta,
      data_sufficient: false,
      insufficient_reason: "Pocos productos",
    });
    expect(canExportDemandProjections(insufficient)).toBe(false);
    const filtered = filterAssistantQuickActionsWhenInsufficient(
      [{ label: "Mayor demanda", prompt: "demanda" }],
      insufficient,
    );
    expect(filtered.some((a) => a.label.includes("predicciones"))).toBe(true);
  });

  it("exportPredictionsCSV no exporta si includeDemandProjections es false", () => {
    const ok = exportPredictionsCSV([basePrediction], 30, { includeDemandProjections: false });
    expect(ok).toBe(false);
  });

  it("generateAIResponseV2 bloquea preguntas de demanda cuando no hay métricas", () => {
    const preds = applyPredictionsDemandPolicy([basePrediction], false);
    const reply = generateAIResponseV2(
      "¿Cuáles son los productos con más demanda ahora?",
      preds,
      null,
      buildAssistantContextV2(preds),
      { demandMetricsAvailable: false, insufficientReason: "Pocos productos" },
    );
    expect(reply).toMatch(/no están disponibles/i);
    expect(reply).not.toMatch(/30 unidades/);
  });

  it("generateAIResponseV2 permite alertas de stock sin ML", () => {
    const preds = applyPredictionsDemandPolicy([basePrediction], false);
    const reply = generateAIResponseV2(
      "Lista los productos en mayor riesgo de inventario",
      preds,
      null,
      buildAssistantContextV2(preds),
      { demandMetricsAvailable: false, insufficientReason: "Test" },
    );
    expect(reply).toMatch(/riesgo|stock|urgent/i);
  });

  it("isDemandMetricHidden alinea con bandera en producto", () => {
    expect(isDemandMetricHidden(maskPredictionDemandFields(basePrediction))).toBe(true);
    expect(isDemandMetricHidden(basePrediction)).toBe(false);
  });

  it("assistantReplyWhenDemandUnavailable es explícito", () => {
    expect(assistantReplyWhenDemandUnavailable("Pocos productos")).toMatch(/Pocos productos/);
  });

  it("maskPredictionDemandFields recalcula tendencia y riesgo sin ML", () => {
    const masked = maskPredictionDemandFields({
      ...basePrediction,
      prediccion_unidades: 80,
      tendencia: "subiendo",
      nivel_riesgo: "estable",
      ventas_7_dias: 4,
      ventas_30_dias: 40,
    });
    expect(masked.tendencia).toBe(historicalSalesTrend(masked));
    expect(masked.nivel_riesgo).toBe(historicalInventoryRiskLevel(masked.dias_hasta_agotarse, masked.stock_actual));
    expect(masked.alta_demanda).toBe(false);
  });

  it("isOverstocked no usa prediccion_unidades=0 como umbral falso", () => {
    const masked = maskPredictionDemandFields({
      ...basePrediction,
      prediccion_unidades: 0,
      stock_actual: 30,
      dias_hasta_agotarse: 45,
      ventas_30_dias: 20,
      consumo_estimado_diario: 1.2,
    });
    expect(isOverstocked(masked)).toBe(false);
    const slow = maskPredictionDemandFields({
      ...basePrediction,
      prediccion_unidades: 0,
      stock_actual: 30,
      tendencia: "bajando",
      ventas_30_dias: 4,
      consumo_estimado_diario: 0.2,
    });
    expect(isSlowMoving(slow)).toBe(true);
  });

  it("generarRecomendaciónes evita comparar stock con proyección cero", () => {
    const preds = applyPredictionsDemandPolicy([basePrediction], false);
    const recs = generarRecomendaciónes(preds, { demandMetricsAvailable: false });
    expect(recs.every((r) => !r.detalle.includes("proyectado"))).toBe(true);
  });
});
