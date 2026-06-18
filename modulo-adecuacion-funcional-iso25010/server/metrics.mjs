/**
 * Clasificación de porcentajes según escala ISO del proyecto.
 */
export function classifyPercent(value) {
  if (value == null || Number.isNaN(value)) {
    return { label: "Sin datos", level: "none", min: 0, max: 0 };
  }
  const p = Number(value);
  if (p >= 90) return { label: "Excelente", level: "excellent", min: 90, max: 100 };
  if (p >= 80) return { label: "Bueno", level: "good", min: 80, max: 89 };
  if (p >= 70) return { label: "Aceptable", level: "acceptable", min: 70, max: 79 };
  return { label: "Deficiente", level: "deficient", min: 0, max: 69 };
}

export function safePercent(numerator, denominator) {
  if (!denominator || denominator === 0) return null;
  return Math.round((10000 * numerator) / denominator) / 100;
}

/**
 * CF = (Funciones implementadas / Funciones requeridas) × 100
 */
export function calcCompletitudFuncional(funciones) {
  const requeridas = funciones.filter((f) => f.requerida);
  const implementadas = requeridas.filter((f) => f.implementada);
  const pct = safePercent(implementadas.length, requeridas.length);
  return {
    funciones_requeridas: requeridas.length,
    funciones_implementadas: implementadas.length,
    pct,
    classification: classifyPercent(pct),
  };
}

/**
 * COF = (Transacciones correctas / Transacciones evaluadas) × 100
 */
export function calcCorreccionFuncional(transacciones) {
  const evaluadas = transacciones.filter((t) => t.evaluada);
  const correctas = evaluadas.filter((t) => t.correcta);
  const pct = safePercent(correctas.length, evaluadas.length);
  return {
    transacciones_evaluadas: evaluadas.length,
    transacciones_correctas: correctas.length,
    pct,
    classification: classifyPercent(pct),
  };
}

/**
 * TECP = (Casos aprobados / Casos ejecutados) × 100
 */
export function calcTecp(casos) {
  const ejecutados = casos.filter((c) => c.ejecutado);
  const aprobados = ejecutados.filter((c) => c.aprobado);
  const pct = safePercent(aprobados.length, ejecutados.length);
  return {
    casos_ejecutados: ejecutados.length,
    casos_aprobados: aprobados.length,
    pct,
    classification: classifyPercent(pct),
  };
}

export function calcAllMetrics(evaluacion, funciones, transacciones, casos) {
  const cf = calcCompletitudFuncional(funciones);
  const cof = calcCorreccionFuncional(transacciones);
  const tecp = calcTecp(casos);
  const valores = [cf.pct, cof.pct, tecp.pct].filter((v) => v != null);
  const promedio =
    valores.length > 0 ? Math.round((valores.reduce((a, b) => a + b, 0) / valores.length) * 100) / 100 : null;
  return {
    evaluacion,
    completitud_funcional: cf,
    correccion_funcional: cof,
    tecp,
    promedio_adecuacion: promedio,
    promedio_classification: classifyPercent(promedio),
  };
}
