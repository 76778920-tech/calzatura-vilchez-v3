import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calcAllMetrics,
  calcCompletitudFuncional,
  calcCorreccionFuncional,
  calcTecp,
  classifyPercent,
  safePercent,
} from "./metrics.mjs";
import { buildSeedDb } from "./seed.mjs";
import { MUST_RF_COUNT } from "./mustRfCatalog.mjs";

describe("Indicadores ISO 25010 — métricas", () => {
  it("CF = implementadas / requeridas × 100", () => {
    const cf = calcCompletitudFuncional([
      { requerida: true, implementada: true },
      { requerida: true, implementada: false },
      { requerida: false, implementada: false },
    ]);
    assert.equal(cf.funciones_requeridas, 2);
    assert.equal(cf.funciones_implementadas, 1);
    assert.equal(cf.pct, 50);
  });

  it("COF = correctas / evaluadas × 100", () => {
    const cof = calcCorreccionFuncional([
      { evaluada: true, correcta: true },
      { evaluada: true, correcta: false },
      { evaluada: false, correcta: null },
    ]);
    assert.equal(cof.transacciones_evaluadas, 2);
    assert.equal(cof.transacciones_correctas, 1);
    assert.equal(cof.pct, 50);
  });

  it("TECP = aprobados / ejecutados × 100", () => {
    const tecp = calcTecp([
      { ejecutado: true, aprobado: true },
      { ejecutado: true, aprobado: false },
      { ejecutado: false, aprobado: null },
    ]);
    assert.equal(tecp.casos_ejecutados, 2);
    assert.equal(tecp.casos_aprobados, 1);
    assert.equal(tecp.pct, 50);
  });

  it("escala 90/80/70 sin errores en límites", () => {
    assert.equal(classifyPercent(90).label, "Excelente");
    assert.equal(classifyPercent(89.99).label, "Bueno");
    assert.equal(classifyPercent(80).label, "Bueno");
    assert.equal(classifyPercent(70).label, "Aceptable");
    assert.equal(classifyPercent(69.99).label, "Deficiente");
    assert.equal(classifyPercent(null).label, "Sin datos");
  });

  it("safePercent evita división por cero", () => {
    assert.equal(safePercent(0, 0), null);
    assert.equal(safePercent(3, 4), 75);
  });

  it("seed Calzatura Vilchez — 25 RF Must, CF/COF/TECP al 100%", () => {
    const db = buildSeedDb();
    assert.equal(db.funciones.length, MUST_RF_COUNT);
    const m = calcAllMetrics(
      db.evaluaciones[0],
      db.funciones,
      db.transacciones,
      db.casos_prueba,
    );
    assert.equal(m.completitud_funcional.pct, 100);
    assert.equal(m.correccion_funcional.pct, 100);
    assert.equal(m.tecp.pct, 100);
    assert.equal(m.completitud_funcional.classification.label, "Excelente");
    assert.equal(m.correccion_funcional.classification.label, "Excelente");
    assert.equal(m.tecp.classification.label, "Excelente");
  });
});
