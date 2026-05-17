import { describe, expect, it } from "vitest";
import {
  isPredictionDataSufficient,
  predictionInsufficientMessage,
  shouldMaskPredictionMetrics,
} from "@/domains/administradores/predictions/predictionDataQuality";
import type { ModeloMeta } from "@/domains/administradores/predictions/adminPredictionsLogic";

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
});
