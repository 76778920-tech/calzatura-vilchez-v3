import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Brain,
  CheckCircle,
  CircleDollarSign,
  Minus,
  Package,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { PromptInputBox } from "@/components/ui/ai-prompt-box";

const AI_BASE = import.meta.env.VITE_AI_SERVICE_URL ?? "http://localhost:8000";
const AI_BEARER_TOKEN = (import.meta.env.VITE_AI_SERVICE_BEARER_TOKEN as string | undefined)?.trim();

function buildAIHeaders(): Record<string, string> {
  if (!AI_BEARER_TOKEN) return {};
  return { Authorization: `Bearer ${AI_BEARER_TOKEN}` };
}

async function invalidateAICache() {
  try {
    await fetch(`${AI_BASE}/api/cache/invalidate`, {
      method: "POST",
      headers: buildAIHeaders(),
    });
  } catch {
    // El panel puede seguir consultando aúnque el cache no se invalide.
  }
}

interface Prediction {
  productId: string;
  codigo: string;
  nombre: string;
  categoria: string;
  precio: number;
  stock_actual: number;
  prediccion_unidades: number;
  prediccion_diaria: number;
  prediccion_semanal: number;
  total_vendido_histórico: number;
  promedio_diario_histórico: number;
  ventas_7_dias: number;
  ventas_30_dias: number;
  consumo_diario_7: number;
  consumo_diario_30: number;
  consumo_estimado_diario: number;
  dias_hasta_agotarse: number;
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
  tipo: "histórico" | "proyectado";
}

interface RevenueSummary {
  proximo_7_dias: number;
  proximo_30_dias: number;
  proximo_horizonte: number;
  promedio_diario_histórico: number;
  promedio_diario_proyectado: number;
  ultimo_30_dias: number;
  ultimo_horizonte: number;
  crecimiento_estimado_pct: number;
  crecimiento_estimado_horizonte_pct: number;
  tendencia: "subiendo" | "bajando" | "estable";
  confianza: number;
}

interface RevenueForecast {
  horizon_days: number;
  history_days: number;
  summary: RevenueSummary;
  history: RevenuePoint[];
  forecast: RevenuePoint[];
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

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

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

function formatConfidenceLabel(value: number) {
  if (value >= 75) return "Alta";
  if (value >= 55) return "Media";
  return "Inicial";
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
    const confianzaTexto = s.confianza >= 70
      ? "La proyección tiene alta confiabilidad basada en el historial disponible."
      : s.confianza >= 50
      ? "La proyección es moderada. A mayor historial de ventas, más precisa será."
      : "La proyección es estimada. Se necesita más historial de ventas para mayor precisión.";

    return `PROYECCIÓN DE INGRESOS — PRÓXIMOS 30 DÍAS\n\nResumen ejecutivo:\n  • Ingreso estimado próxima semana: S/ ${s.proximo_7_dias.toFixed(2)}\n  • Ingreso estimado próximo mes: S/ ${s.proximo_30_dias.toFixed(2)}\n  • Comparado con los últimos 30 días reales (S/ ${s.ultimo_30_dias.toFixed(2)}): ${dir}${s.crecimiento_estimado_pct.toFixed(1)}%\n\nPromedios:\n  • Ingreso diario histórico: S/ ${s.promedio_diario_histórico.toFixed(2)}\n  • Ingreso diario proyectado: S/ ${s.promedio_diario_proyectado.toFixed(2)}\n\nTendencia: ${s.tendencia.toUpperCase()}\n${tendenciaTexto}\n\nConfianza del modelo: ${s.confianza}%\n${confianzaTexto}\n\nNOTA: Esta proyección se basa en el comportamiento histórico de ventas y ajusta el ritmo según la estacionalidad por día de semana. No incluye factores externos como campañas promocionales o cambios en el mercado.`;
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
): string {
  const msg = normalizeChatTextV2(message);
  const mentionedProducts = findMentionedProductsV2(message, predictions).slice(0, 3);
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
  const topByRisk = [...withHistory]
    .filter((p) => p.stock_actual === 0 || p.alerta_stock || p.nivel_riesgo === "critico" || p.nivel_riesgo === "atencion")
    .sort((a, b) => {
      if (a.stock_actual === 0 && b.stock_actual !== 0) return -1;
      if (a.stock_actual !== 0 && b.stock_actual === 0) return 1;
      return a.dias_hasta_agotarse - b.dias_hasta_agotarse;
    });

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
  const recommendationTerms = ["recomend", "consejo", "que hacer", "que debo", "accion", "pedir", "comprar", "reponer", "proveedor", "priorizar"];
  const trendTerms = ["tendencia", "trend", "sube", "subiendo", "baja", "bajando", "comportamiento", "creciendo", "cae", "caida", "como va", "como van"];
  const summaryTerms = [
    "resumen",
    "estado",
    "general",
    "situacion",
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
    risk: countIntentMatches(msg, riskTerms),
    revenue: countIntentMatches(msg, revenueTerms),
    demand: countIntentMatches(msg, demandTerms),
    recommendations: countIntentMatches(msg, recommendationTerms),
    trend: countIntentMatches(msg, trendTerms),
    summary: countIntentMatches(msg, summaryTerms) + (msg.includes("cuantos") ? 1 : 0),
    noHistory: countIntentMatches(msg, noHistoryTerms),
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
        `De los ${withHistory.length} productos con historial, ninguno esta en una situacion critica. El inventario se ve estable según el ritmo de ventas actual.`,
        noHistory.length > 0
          ? `Eso sí, todavía hay ${noHistory.length} producto(s) sin historial suficiente, así que conviene revisarlos aparte.`
          : "No hay alertas graves en este momento.",
        "",
        "En términos gerenciales, eso significa que hoy no se ve una perdida inmediata de ventas por falta de producto.",
      ].join("\n");
    }

    const urgentProducts = [...outOfStock, ...criticos.filter((p) => p.stock_actual > 0)]
      .sort((a, b) => a.dias_hasta_agotarse - b.dias_hasta_agotarse)
      .slice(0, 3);

    const lines = [
      "Resumen ejecutivo:",
      `Hoy veo ${outOfStock.length} producto(s) sin stock, ${criticos.length} en nivel critico y ${atencion.length} en atencion.`,
      "",
      "Datos exactos:",
      `- Productos con historial analizado: ${withHistory.length}`,
      `- Sin stock: ${outOfStock.length}`,
      `- Riesgo critico: ${criticos.length}`,
      `- En atencion: ${atencion.length}`,
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
      s.confianza >= 70
        ? "La estimación se ve bastante confiable con los datos que ya tiene el sistema."
        : s.confianza >= 50
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
      `- Promedio diario histórico: ${formatCurrency(s.promedio_diario_histórico)}`,
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

    const topDemand = [...highDemand]
      .sort((a, b) => b.consumo_estimado_diario - a.consumo_estimado_diario)
      .slice(0, 5);

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
      `- Riesgo critico: ${criticos.length}`,
      `- En atencion: ${atencion.length}`,
      `- Alta demanda: ${highDemand.length}`,
      `- Tendencia subiendo: ${subiendo.length}`,
      `- Tendencia estable: ${estables.length}`,
      `- Tendencia bajando: ${bajando.length}`,
    ];

    if (s) {
      lines.push(`- Proyección de ingresos horizonte actual (${revenueForecast?.horizon_days ?? 30} días): ${formatCurrency(s.proximo_horizonte)}`);
      lines.push(`- Variación estimada vs ultimo horizonte: ${formatPercent(s.crecimiento_estimado_horizonte_pct)}`);
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
  if (p.nivel_riesgo === "critico") return <span className="pred-estado-badge critico">Critico</span>;
  if (p.nivel_riesgo === "atencion") return <span className="pred-estado-badge alerta">Atencion</span>;
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
};

function FeatureImportanceChart({ importances }: { importances: FeatureImportance[] }) {
  const max = Math.max(...importances.map((fi) => fi.importance), 0.001);
  return (
    <div className="pred-feature-chart">
      {importances.map((fi) => (
        <div key={fi.feature} className="pred-feature-row">
          <span className="pred-feature-label">{FEATURE_LABELS[fi.feature] ?? fi.feature}</span>
          <div className="pred-feature-bar-track">
            <div
              className="pred-feature-bar-fill"
              style={{ width: `${(fi.importance / max) * 100}%` }}
            />
          </div>
          <span className="pred-feature-pct">{(fi.importance * 100).toFixed(1)}%</span>
        </div>
      ))}
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
      {data.map((item) => (
        <div key={item.semana} className="pred-chart-col">
          <span className="pred-chart-val">{item.unidades > 0 ? item.unidades : ""}</span>
          <div className="pred-chart-track">
            <div
              className="pred-chart-fill"
              style={{ height: `${Math.max((item.unidades / max) * 100, item.unidades > 0 ? 4 : 0)}%` }}
            />
          </div>
          <span className="pred-chart-label">{item.semana}</span>
        </div>
      ))}
    </div>
  );
}

function RevenueLineChart({ history, forecast }: { history: RevenuePoint[]; forecast: RevenuePoint[] }) {
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
        <span><i className="pred-legend-line hist" /> Historico</span>
        <span><i className="pred-legend-line proj" /> Proyeccion</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="pred-revenue-chart" role="img" aria-label="Historico y proyección de ingresos">
        <rect x="0" y="0" width={paddingLeft - 10} height={height} className="pred-revenue-label-bg" />

        {[0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = paddingTop + innerHeight - innerHeight * ratio;
          return (
            <line key={ratio} x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} className="pred-revenue-grid-line" />
          );
        })}

        {history.length > 1 && (
          <polyline points={toPolyline(history, 0)} className="pred-revenue-line pred-revenue-line-hist" />
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
                className={point.tipo === "histórico" ? "pred-revenue-dot-hist" : "pred-revenue-dot-proj"}
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

export default function AdminPredictions() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [weeklyChart, setWeeklyChart] = useState<WeekPoint[]>([]);
  const [revenueForecast, setRevenueForecast] = useState<RevenueForecast | null>(null);
  const [modeloMeta, setModeloMeta] = useState<ModeloMeta | null>(null);
  const [modelMetrics, setModelMetrics] = useState<ModelMetrics | null>(null);
  const [horizon, setHorizon] = useState<HorizonOption>(30);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [showModelPanel, setShowModelPanel] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (selectedHorizon: HorizonOption) => {
    setLoading(true);
    setError(null);
    try {
      const [predRes, chartRes] = await Promise.all([
        fetch(`${AI_BASE}/api/predict/demand?horizon=${selectedHorizon}`, { headers: buildAIHeaders() }),
        fetch(`${AI_BASE}/api/sales/weekly-chart?weeks=8`, { headers: buildAIHeaders() }),
      ]);
      if (!predRes.ok || !chartRes.ok) {
        throw new Error("Error al conectar con el servicio de IA.");
      }
      const [predData, chartData] = await Promise.all([
        predRes.json(),
        chartRes.json(),
      ]);
      setPredictions(predData.predictions ?? []);
      setModeloMeta(predData.modelo_meta ?? null);
      setWeeklyChart(chartData.chart ?? []);

      // Endpoint de ingresos opcional — no bloquea si falla
      try {
        const revenueRes = await fetch(`${AI_BASE}/api/predict/revenue?horizon=${selectedHorizon}&history=120`, {
          headers: buildAIHeaders(),
        });
        if (revenueRes.ok) {
          setRevenueForecast(await revenueRes.json());
        }
      } catch {
        setRevenueForecast(null);
      }

      // Métricas de monitoreo — no bloquea si falla
      try {
        const metricsRes = await fetch(`${AI_BASE}/api/model/metrics`, { headers: buildAIHeaders() });
        if (metricsRes.ok) {
          setModelMetrics(await metricsRes.json());
        }
      } catch {
        setModelMetrics(null);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(horizon), 0);
    return () => window.clearTimeout(timer);
  }, [horizon, load]);

  const refreshPredictions = useCallback(async () => {
    await invalidateAICache();
    await load(horizon);
  }, [horizon, load]);

  const predictionsForView = useMemo(
    () =>
      predictions.map((item) => {
        if (item.sin_historial || item.consumo_estimado_diario <= 0) {
          return { ...item, alerta_stock: false, riesgo_agotamiento: false };
        }

        const withinHorizon = item.stock_actual === 0 || item.dias_hasta_agotarse <= horizon;
        return {
          ...item,
          alerta_stock: withinHorizon,
          riesgo_agotamiento: item.alta_demanda && withinHorizon,
        };
      }),
    [predictions, horizon],
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
        : Number((summary.promedio_diario_histórico * selectedHorizon).toFixed(2)));

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
        ? `Si el ritmo actual se mantiene, el negocio podría cerrar el horizonte con ${formatCurrency(revenueSummary.proximo_horizonte)}, que representa ${formatPercent(growth)} frente a los últimos ${horizon} días.`
        : `Si no se corrige el ritmo actual, el negocio podría cerrar en ${formatCurrency(revenueSummary.proximo_horizonte)}, es decir ${formatPercent(growth)} frente a los últimos ${horizon} días.`
      : "Aún no se cuenta con una lectura financiera consolidada para este horizonte.";

    const lecturaInventario = principalRiesgo
      ? `${principalRiesgo.nombre} es hoy el caso más sensible: tiene ${principalRiesgo.stock_actual} unidades y una cobertura aproximada de ${principalRiesgo.dias_hasta_agotarse} días.`
      : inventarioPesado
      ? `No faltan productos, pero hay ${sobreStock} con stock acumulado y ${rotacionDebil} con rotación débil. La cobertura promedio ronda ${Math.round(promedioCobertura || 0)} días.`
      : enRiesgo === 0
      ? `No hay productos en riesgo para este horizonte. La cobertura de stock luce controlada.`
      : `Hay ${enRiesgo} productos que necesitan seguimiento de stock dentro de los próximos ${horizon} días.`;

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
  }, [altaDemanda, conHistorial, enRiesgo, horizon, productoMotor, promedioCobertura, revenueSummary, riskAlerts, rotacionDebil, sobreStock]);

  const distribucionInventario = useMemo(() => {
    const items = [
      {
        label: "Critico",
        count: predictionsForView.filter((item) => !item.sin_historial && (item.stock_actual === 0 || item.nivel_riesgo === "critico")).length,
        color: "#ef4444",
      },
      {
        label: "Atencion",
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

  const handleSend = useCallback(async (message: string) => {
    const trimmed = message.trim();
    if (!trimmed) return;
    const userMsg: ChatMessage = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setAiLoading(true);
    await new Promise((res) => setTimeout(res, 600));
    const reply = generateAIResponseV2(trimmed, predictionsForView, normalizedRevenueForecast);
    setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    setAiLoading(false);
  }, [predictionsForView, normalizedRevenueForecast]);

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
      <div className="dash-header">
        <div>
          <p className="dash-greeting">Panel de decisiones</p>
          <h1 className="dash-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Brain size={26} /> Inteligencia Artificial
          </h1>
          <p className="pred-header-note">
            El horizonte seleccionado cambia la proyección financiera, el riesgo de inventario y la prioridad de accion del panel.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>Proyectar demanda:</span>
          {([7, 15, 30] as HorizonOption[]).map((option) => (
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
      </div>

      <div className="pred-summary-grid">
        <article className="pred-summary-card pred-summary-hero">
          <p className="pred-summary-kicker">Resumen ejecutivo</p>
          <h2 className="pred-summary-title">{resumenEjecutivo.titular}</h2>
          <p className="pred-summary-body">{resumenEjecutivo.detalle}</p>
          <div className="pred-summary-badges">
            <span className="pred-summary-badge">Horizonte: {horizon} días</span>
            <span className="pred-summary-badge">Con historial: {conHistorial}</span>
            <span className="pred-summary-badge">Sin historial: {sinHistorial}</span>
          </div>
        </article>

        <article className="pred-summary-card">
          <p className="pred-summary-label">Ingreso esperado</p>
          <strong className="pred-summary-number">
            {revenueSummary ? formatCurrency(revenueSummary.proximo_horizonte) : "Pendiente"}
          </strong>
          <p className="pred-summary-copy">{resumenEjecutivo.lecturaFinanciera}</p>
        </article>

        <article className="pred-summary-card">
          <p className="pred-summary-label">Foco de inventario</p>
          <strong className="pred-summary-number">{enRiesgo} en riesgo</strong>
          <p className="pred-summary-copy">{resumenEjecutivo.lecturaInventario}</p>
        </article>

        <article className="pred-summary-card">
          <p className="pred-summary-label">Producto motor</p>
          <strong className="pred-summary-number">{productoMotor?.codigo || productoMotor?.nombre || "Sin definir"}</strong>
          <p className="pred-summary-copy">{resumenEjecutivo.lecturaPortafolio}</p>
        </article>
      </div>

      <div className={`pred-section-grid pred-section-grid-main ${!revenueSummary ? "pred-section-grid-single" : ""}`}>
        {revenueSummary && normalizedRevenueForecast && (
          <div className="dash-card">
            <div className="dash-card-header">
              <div>
                <p className="dash-card-kicker">Planificacion financiera</p>
                <h2 className="dash-card-title">Prediccion de ingresos futuros</h2>
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
                  <p className="pred-kpi-label">Proxima semana</p>
                  <p className="pred-kpi-value">{formatCurrency(revenueSummary.proximo_7_dias)}</p>
                  <p className="pred-kpi-sub">ingreso estimado en 7 días</p>
                </div>
              </div>
              <div className="pred-revenue-card">
                <CircleDollarSign size={20} />
                <div>
                  <p className="pred-kpi-label">Horizonte actual</p>
                  <p className="pred-kpi-value">{formatCurrency(revenueSummary.proximo_horizonte)}</p>
                  <p className="pred-kpi-sub">ingreso estimado en {normalizedRevenueForecast.horizon_days} días</p>
                </div>
              </div>
              <div className={`pred-revenue-card ${revenueSummary.crecimiento_estimado_horizonte_pct >= 0 ? "pred-revenue-positive" : "pred-revenue-negative"}`}>
                <TrendingUp size={20} />
                <div>
                  <p className="pred-kpi-label">Vs ultimo horizonte</p>
                  <p className="pred-kpi-value">{formatPercent(revenueSummary.crecimiento_estimado_horizonte_pct)}</p>
                  <p className="pred-kpi-sub">comparado con los últimos {normalizedRevenueForecast.horizon_days} días</p>
                </div>
              </div>
              <div className="pred-revenue-card">
                <Brain size={20} />
                <div>
                  <p className="pred-kpi-label">Confianza</p>
                  <p className="pred-kpi-value">{revenueSummary.confianza}%</p>
                  <p className="pred-kpi-sub">basada en historial y estabilidad</p>
                </div>
              </div>
            </div>

            <div className="pred-revenue-metrics">
              <div>
                <span className="pred-sub">Promedio diario histórico</span>
                <strong>{formatCurrency(revenueSummary.promedio_diario_histórico)}</strong>
              </div>
              <div>
                <span className="pred-sub">Promedio diario proyectado</span>
                <strong>{formatCurrency(revenueSummary.promedio_diario_proyectado)}</strong>
              </div>
              <div>
                <span className="pred-sub">últimos {normalizedRevenueForecast.horizon_days} días</span>
                <strong>{formatCurrency(revenueSummary.ultimo_horizonte)}</strong>
              </div>
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
        )}

        <div className="dash-card pred-insight-card">
          <div className="dash-card-header">
            <div>
              <p className="dash-card-kicker">Lectura gerencial</p>
              <h2 className="dash-card-title">Interpretación del horizonte actual</h2>
            </div>
          </div>

          <div className="pred-insight-list">
            <article className="pred-insight-item">
              <p className="pred-insight-label">Qué está pasando</p>
              <p className="pred-insight-copy">{resumenEjecutivo.detalle}</p>
            </article>
            <article className="pred-insight-item">
              <p className="pred-insight-label">Qué significa para el negocio</p>
              <p className="pred-insight-copy">
                {enRiesgo > 0
                  ? `Hay ${enRiesgo} producto(s) que pueden afectar la venta si no se reponen dentro del horizonte actual.`
                  : "No hay alertas fuertes de inventario en este horizonte y eso le da estabilidad a la venta proyectada."}
              </p>
            </article>
            <article className="pred-insight-item">
              <p className="pred-insight-label">Qué debería revisar la gerencia</p>
              <p className="pred-insight-copy">
                {revenueSummary
                  ? `Comparar ${formatCurrency(revenueSummary.proximo_horizonte)} proyectados contra ${formatCurrency(revenueSummary.ultimo_horizonte)} reales del último tramo para validar si el ritmo esperado se está cumpliendo.`
                  : "Revisar primero ventas, stock y productos con historial antes de sacar conclusiones financieras."}
              </p>
            </article>
            <article className="pred-insight-item">
              <p className="pred-insight-label">Qué recomiendo hacer ahora</p>
              <p className="pred-insight-copy">{resumenEjecutivo.recomendacion}</p>
            </article>
          </div>
        </div>
      </div>

      <div className="pred-kpi-row">
        <div className={`pred-kpi-card ${enRiesgo > 0 ? "pred-kpi-alert" : ""}`}>
          <AlertTriangle size={20} />
          <div>
            <p className="pred-kpi-label">En riesgo en {horizon} días</p>
            <p className="pred-kpi-value">{enRiesgo}</p>
            <p className="pred-kpi-sub">{enRiesgo === 0 ? "Sin alertas fuertes" : "stock corto para el horizonte actual"}</p>
          </div>
        </div>
        <div className={`pred-kpi-card ${sinStock > 0 ? "pred-kpi-alert" : ""}`}>
          <Package size={20} />
          <div>
            <p className="pred-kpi-label">Productos sin stock</p>
            <p className="pred-kpi-value">{sinStock}</p>
            <p className="pred-kpi-sub">{sinStock === 0 ? "Catálogo disponible" : "ya agotados"}</p>
          </div>
        </div>
        <div className="pred-kpi-card pred-kpi-gold">
          <TrendingUp size={20} />
          <div>
            <p className="pred-kpi-label">Alta demanda</p>
            <p className="pred-kpi-value">{altaDemanda}</p>
            <p className="pred-kpi-sub">productos con rotación fuerte</p>
          </div>
        </div>
        <div className="pred-kpi-card">
          <Package size={20} />
          <div>
            <p className="pred-kpi-label">Total productos</p>
            <p className="pred-kpi-value">{predictions.length}</p>
            <p className="pred-kpi-sub">analizados en catálogo</p>
          </div>
        </div>
      </div>

      <div className="pred-section-grid">
        <div className="dash-card">
          <div className="dash-card-header">
            <div>
              <p className="dash-card-kicker">Prioridad inmediata</p>
              <h2 className="dash-card-title">Productos en riesgo en los próximos {horizon} días</h2>
            </div>
          </div>
          {riskAlerts.length > 0 ? (
            <div className="pred-alerts-grid">
              {riskAlerts.map((prediction) => (
                <RiskAlertCard key={prediction.productId} prediction={prediction} />
              ))}
            </div>
          ) : (
            <div className="pred-empty-card">
              <CheckCircle size={28} className="pred-trend-up" />
              <p className="pred-empty-title">Sin alertas fuertes por ahora</p>
              <p className="pred-empty-copy">
                No hay productos con cobertura corta dentro del horizonte actual de {horizon} días.
              </p>
            </div>
          )}
        </div>

        <div className="dash-card">
          <div className="dash-card-header">
            <div>
              <p className="dash-card-kicker">Lo que debes hacer ahora</p>
              <h2 className="dash-card-title">Recomendaciónes priorizadas</h2>
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
                    <p className="pred-rec-accion">-&gt; {recommendation.accion}</p>
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

      <div className="pred-section-grid">
        {weeklyChart.length > 0 && (
          <div className="dash-card">
            <div className="dash-card-header">
              <div>
                <p className="dash-card-kicker">Ventas semanales</p>
                <h2 className="dash-card-title">Cómo se está moviendo la venta</h2>
              </div>
            </div>
            <WeeklyChart data={weeklyChart} />
          </div>
        )}

        <div className="dash-card">
          <div className="dash-card-header">
            <div>
              <p className="dash-card-kicker">Lectura operativa</p>
              <h2 className="dash-card-title">Distribucion del inventario analizado</h2>
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
            Esta lectura ayuda a gerencia, contabilidad y junta directiva a ver cuanta presion real existe en el inventario antes de revisar producto por producto.
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
                Esta tabla cambia con el horizonte seleccionado: en 7, 15 o 30 días cambian la proyección, el riesgo y la prioridad de seguimiento.
              </p>
            </div>
            <div className="pred-search-wrap">
              <Search size={15} className="pred-search-icon" />
              <input
                type="text"
                className="pred-search-input"
                placeholder="Buscar por codigo o nombre..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
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
                    <th>Stock dura aprox.</th>
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

      {modeloMeta && (
        <div className="dash-card">
          <button
            type="button"
            className="pred-model-panel-toggle"
            onClick={() => setShowModelPanel((prev) => !prev)}
          >
            <Brain size={16} />
            <span>Modelo IA — Reproducibilidad, Explicabilidad y Monitoreo</span>
            <span className="pred-model-toggle-arrow">{showModelPanel ? "▲" : "▼"}</span>
          </button>

          {showModelPanel && (
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

              {modeloMeta.feature_importances.length > 0 && (
                <div className="pred-model-section">
                  <h3 className="pred-model-section-title">Importancia de variables (Feature Importance)</h3>
                  <p className="pred-sub" style={{ marginBottom: "0.75rem" }}>
                    Cuánto contribuye cada variable a las predicciones del modelo. Mayor porcentaje → mayor influencia.
                  </p>
                  <FeatureImportanceChart importances={modeloMeta.feature_importances} />
                </div>
              )}

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
                <h3 className="pred-model-section-title">Monitoreo retrospectivo (MAE / MAPE)</h3>
                {modelMetrics === null && (
                  <p className="pred-sub">Cargando métricas...</p>
                )}
                {modelMetrics?.status === "sin_datos" && (
                  <p className="pred-sub">{modelMetrics.mensaje}</p>
                )}
                {modelMetrics?.status === "pendiente" && (
                  <p className="pred-sub">
                    {modelMetrics.mensaje} ({modelMetrics.n_predicciones_en_cola} en cola)
                  </p>
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
          )}
        </div>
      )}

      <div className="dash-card" style={{ padding: "1.25rem 1.5rem" }}>
        <div className="dash-card-header" style={{ padding: 0, marginBottom: "1rem" }}>
          <div>
            <p className="dash-card-kicker">Asistente inteligente</p>
            <h2 className="dash-card-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Brain size={20} /> Consulta a la IA
            </h2>
            <p className="pred-section-note">
              Puedes pedir una explicacion para gerencia, un resumen con cifras exactas para contabilidad o una lectura ejecutiva para junta directiva.
            </p>
          </div>
        </div>

        {messages.length > 0 && (
          <div className="pred-chat-stream">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`pred-chat-row ${msg.role === "user" ? "pred-chat-row-user" : "pred-chat-row-assistant"}`}
              >
                <div className={`pred-chat-bubble ${msg.role === "user" ? "pred-chat-bubble-user" : "pred-chat-bubble-assistant"}`}>
                  {msg.content}
                </div>
              </div>
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
            <p>Puedes preguntar por inventario, ingresos, productos urgentes o pedir un informe más explicativo.</p>
            <p>
              Ejemplos: "Dame un resumen para gerencia", "Qué producto debo reponer primero", "Compara el próximo horizonte con el último periodo real".
            </p>
          </div>
        )}

        <PromptInputBox
          onSend={handleSend}
          isLoading={aiLoading}
          placeholder="Ej: Qué producto debo reponer primero o dame un resumen para gerencia"
        />
      </div>
    </div>
  );
}
