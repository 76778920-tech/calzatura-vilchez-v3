import { describe, it, expect } from "vitest";
import {
  ALERT_OPTIONS,
  HORIZON_OPTIONS,
  TAB_SEQUENCE,
  loadPref,
  type HorizonOption,
} from "@/domains/administradores/predictions/adminPredictionsTypes";

describe("adminPredictionsTypes", () => {
  it("expone secuencia de pestañas y opciones de horizonte", () => {
    expect(TAB_SEQUENCE[0]).toBe("resumen");
    expect(HORIZON_OPTIONS).toEqual([7, 15, 30]);
    expect(ALERT_OPTIONS).toContain(14);
  });

  it("loadPref devuelve fallback si localStorage no es válido", () => {
    const key = "pred-test-pref-" + Date.now();
    localStorage.setItem(key, "999");
    expect(loadPref<HorizonOption>(key, HORIZON_OPTIONS, 7)).toBe(7);
    localStorage.removeItem(key);
  });
});
