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
  total_vendido_historico: number;
  promedio_diario_historico: number;
  ventas_7_dias: number;
  ventas_30_dias: number;
  consumo_diario_7: number;
  consumo_diario_30: number;
  consumo_estimado_diario: number;
  dias_hasta_agotarse: number;
  tendencia: "subiendo" | "bajando" | "estable";
  confianza: number;
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
  tipo: "historico" | "proyectado";
}

interface RevenueSummary {
  proximo_7_dias: number;
  proximo_30_dias: number;
  promedio_diario_historico: number;
  promedio_diario_proyectado: number;
  ultimo_30_dias: number;
  crecimiento_estimado_pct: number;
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

type HorizonOption = 7 | 15 | 30;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface Recomendacion {
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

function formatCurrency(value: number) {
  return `S/ ${value.toFixed(2)}`;
}

function formatPercent(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function generarRecomendaciones(predictions: Prediction[]): Recomendacion[] {
  const recs: Recomendacion[] = [];

  for (const p of predictions.filter((item) => !item.sin_historial)) {
    if (p.stock_actual === 0 && p.alta_demanda) {
      recs.push({
        tipo: "urgente",
        titulo: "Producto estrella sin stock",
        detalle: `"${p.nombre}" ya no tiene unidades y mantiene alta rotacion.`,
        accion: "Repone hoy mismo o reserva nuevo ingreso con el proveedor.",
        producto: p.nombre,
        productId: p.productId,
      });
      continue;
    }

    if (p.riesgo_agotamiento && p.nivel_riesgo === "critico") {
      recs.push({
        tipo: "urgente",
        titulo: "Riesgo alto de agotarse",
        detalle: `"${p.nombre}" tiene alta demanda y cobertura para solo ~${p.dias_hasta_agotarse} dias.`,
        accion: "Prioriza este producto en el siguiente pedido.",
        producto: p.nombre,
        productId: p.productId,
      });
      continue;
    }

    if (p.riesgo_agotamiento || p.nivel_riesgo === "atencion") {
      recs.push({
        tipo: "atencion",
        titulo: "Planifica reabastecimiento",
        detalle: `"${p.nombre}" tiene consumo activo y podria agotarse en ~${p.dias_hasta_agotarse} dias.`,
        accion: "Coordina reposicion esta semana para no romper stock.",
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
        titulo: "No hace falta pedir mas todavia",
        detalle: `"${p.nombre}" esta vendiendo por debajo de su ritmo reciente y aun tiene margen.`,
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
      return `La proyección de ingresos aún no está disponible en este momento.\n\nEsto puede deberse a que el módulo financiero está actualizándose. Puede reintentar recargando la página en unos segundos.`;
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

    return `PROYECCIÓN DE INGRESOS — PRÓXIMOS 30 DÍAS\n\nResumen ejecutivo:\n  • Ingreso estimado próxima semana: S/ ${s.proximo_7_dias.toFixed(2)}\n  • Ingreso estimado próximo mes: S/ ${s.proximo_30_dias.toFixed(2)}\n  • Comparado con los últimos 30 días reales (S/ ${s.ultimo_30_dias.toFixed(2)}): ${dir}${s.crecimiento_estimado_pct.toFixed(1)}%\n\nPromedios:\n  • Ingreso diario histórico: S/ ${s.promedio_diario_historico.toFixed(2)}\n  • Ingreso diario proyectado: S/ ${s.promedio_diario_proyectado.toFixed(2)}\n\nTendencia: ${s.tendencia.toUpperCase()}\n${tendenciaTexto}\n\nConfianza del modelo: ${s.confianza}%\n${confianzaTexto}\n\nNOTA: Esta proyección se basa en el comportamiento histórico de ventas y ajusta el ritmo según la estacionalidad por día de semana. No incluye factores externos como campañas promocionales o cambios en el mercado.`;
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

  // ── Recomendaciones ─────────────────────────────────────────────────────────
  if (msg.includes("recomend") || msg.includes("consejo") || msg.includes("qué hacer") || msg.includes("que hacer") || msg.includes("que debo") || msg.includes("accion") || msg.includes("acción") || msg.includes("pedir") || msg.includes("comprar") || msg.includes("reponer") || msg.includes("proveed")) {
    const recs = generarRecomendaciones(predictions);
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
      lines.push(`Los ingresos proyectados para el próximo mes son S/ ${s.proximo_30_dias.toFixed(2)}, con una variación de ${s.crecimiento_estimado_pct >= 0 ? "+" : ""}${s.crecimiento_estimado_pct.toFixed(1)}% respecto a los últimos 30 días.`);
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
      lines.push(`  • Ingreso estimado próxima semana: S/ ${s.proximo_7_dias.toFixed(2)}`);
      lines.push(`  • Ingreso estimado próximo mes: S/ ${s.proximo_30_dias.toFixed(2)}`);
      lines.push(`  • Variación vs últimos 30 días: ${s.crecimiento_estimado_pct >= 0 ? "+" : ""}${s.crecimiento_estimado_pct.toFixed(1)}%`);
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
  return `Hola, soy el asistente de análisis de Calzatura Vilchez. Puedo ayudarle con información detallada sobre:\n\n• "¿Qué productos están en riesgo de agotarse?" — análisis completo del inventario crítico\n• "¿Cuánto vamos a ingresar el próximo mes?" — proyección financiera detallada\n• "¿Qué productos tienen más demanda?" — ranking de los más vendidos\n• "¿Qué debo hacer ahora?" — plan de acción priorizado\n• "¿Cómo están las tendencias?" — análisis de comportamiento por producto\n• "Dame un resumen general" — estado ejecutivo completo del negocio\n\nEscriba su consulta y le respondo con el análisis correspondiente.`;
}

function TipoIcon({ tipo }: { tipo: Recomendacion["tipo"] }) {
  if (tipo === "urgente") return <AlertTriangle size={18} />;
  if (tipo === "atencion") return <Zap size={18} />;
  if (tipo === "oportunidad") return <TrendingUp size={18} />;
  return <CheckCircle size={18} />;
}

function EstadoBadge({ p }: { p: Prediction }) {
  if (p.sin_historial) return <span className="pred-estado-badge bajo">Sin historial</span>;
  if (p.stock_actual === 0) return <span className="pred-estado-badge critico">Sin stock</span>;
  if (p.riesgo_agotamiento) return <span className="pred-estado-badge critico">Riesgo alto</span>;
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
  if (p.dias_hasta_agotarse <= 7) return <span className="pred-days-critical">~{p.dias_hasta_agotarse} dias</span>;
  if (p.dias_hasta_agotarse <= 14) return <span className="pred-days-warn">~{p.dias_hasta_agotarse} dias</span>;
  return <span>~{p.dias_hasta_agotarse} dias</span>;
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

  const width = 880;
  const height = 250;
  const paddingX = 28;
  const paddingTop = 18;
  const paddingBottom = 36;
  const maxValue = Math.max(...points.map((point) => point.ingresos), 1);
  const innerWidth = width - paddingX * 2;
  const innerHeight = height - paddingTop - paddingBottom;
  const step = points.length > 1 ? innerWidth / (points.length - 1) : 0;
  const xAt = (index: number) => paddingX + index * step;
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
      <svg viewBox={`0 0 ${width} ${height}`} className="pred-revenue-chart" role="img" aria-label="Historico y proyeccion de ingresos">
        {[0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = paddingTop + innerHeight - innerHeight * ratio;
          const label = formatCurrency(maxValue * ratio);
          return (
            <g key={ratio}>
              <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} className="pred-revenue-grid-line" />
              <text x={paddingX} y={y - 4} className="pred-revenue-grid-label">{label}</text>
            </g>
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

function RiskAlertCard({ prediction }: { prediction: Prediction }) {
  return (
    <article className="pred-alert-card">
      <div className="pred-alert-header">
        <AlertTriangle size={18} className="pred-trend-down" />
        <span className="pred-alert-days">
          {prediction.stock_actual === 0 ? "Sin stock" : `${prediction.dias_hasta_agotarse} dias de cobertura`}
        </span>
      </div>
      {prediction.codigo && <p className="pred-product-code">{prediction.codigo}</p>}
      <p className="pred-alert-name">{prediction.nombre}</p>
      <p className="pred-alert-cat">{prediction.categoria || "Sin categoria"}</p>
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
          <span className="pred-sub">Ult. 30 dias</span>
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
  const [horizon, setHorizon] = useState<HorizonOption>(30);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (selectedHorizon: HorizonOption) => {
    setLoading(true);
    setError(null);
    try {
      const [predRes, chartRes] = await Promise.all([
        fetch(`${AI_BASE}/api/predict/demand?horizon=${selectedHorizon}`),
        fetch(`${AI_BASE}/api/sales/weekly-chart?weeks=8`),
      ]);
      if (!predRes.ok || !chartRes.ok) {
        throw new Error("Error al conectar con el servicio de IA.");
      }
      const [predData, chartData] = await Promise.all([
        predRes.json(),
        chartRes.json(),
      ]);
      setPredictions(predData.predictions ?? []);
      setWeeklyChart(chartData.chart ?? []);

      // Endpoint de ingresos opcional — no bloquea si falla
      try {
        const revenueRes = await fetch(`${AI_BASE}/api/predict/revenue?horizon=30&history=120`);
        if (revenueRes.ok) {
          setRevenueForecast(await revenueRes.json());
        }
      } catch {
        setRevenueForecast(null);
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

  const recomendaciones = useMemo(() => generarRecomendaciones(predictions), [predictions]);

  const riskAlerts = useMemo(
    () =>
      predictions
        .filter((item) => !item.sin_historial && (item.riesgo_agotamiento || (item.stock_actual === 0 && item.alta_demanda)))
        .sort((a, b) => {
          if (a.stock_actual === 0 && b.stock_actual !== 0) return -1;
          if (a.stock_actual !== 0 && b.stock_actual === 0) return 1;
          return a.dias_hasta_agotarse - b.dias_hasta_agotarse;
        })
        .slice(0, 6),
    [predictions]
  );

  const porOrden = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = query
      ? predictions.filter((item) => {
          const haystack = [item.codigo, item.nombre, item.categoria].join(" ").toLowerCase();
          return haystack.includes(query);
        })
      : predictions;

    return [...filtered].sort((a, b) => {
      const priority = (item: Prediction) => {
        if (item.sin_historial) return 5;
        if (item.stock_actual === 0 && item.alta_demanda) return 0;
        if (item.riesgo_agotamiento) return 1;
        return 2 + riskPriority[item.nivel_riesgo];
      };
      return priority(a) - priority(b) || b.consumo_estimado_diario - a.consumo_estimado_diario;
    });
  }, [predictions, search]);

  const handleSend = useCallback(async (message: string) => {
    const trimmed = message.trim();
    if (!trimmed) return;
    const userMsg: ChatMessage = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setAiLoading(true);
    await new Promise((res) => setTimeout(res, 600));
    const reply = generateAIResponse(trimmed, predictions, revenueForecast);
    setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    setAiLoading(false);
  }, [predictions, revenueForecast]);

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
        <button type="button" className="btn btn-primary" onClick={() => load(horizon)}>
          <RefreshCw size={15} /> Reintentar
        </button>
      </div>
    );
  }

  const enRiesgo = predictions.filter((item) => !item.sin_historial && item.riesgo_agotamiento).length;
  const sinStock = predictions.filter((item) => !item.sin_historial && item.stock_actual === 0).length;
  const altaDemanda = predictions.filter((item) => !item.sin_historial && item.alta_demanda).length;
  const revenueSummary = revenueForecast?.summary ?? null;

  return (
    <div className="pred-root">
      <div className="dash-header">
        <div>
          <p className="dash-greeting">Panel de decisiones</p>
          <h1 className="dash-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Brain size={26} /> Inteligencia Artificial
          </h1>
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
              {option} dias
            </button>
          ))}
          <button type="button" className="btn btn-ghost pred-refresh" onClick={() => load(horizon)}>
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {revenueSummary && revenueForecast && (
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
              <span>{revenueSummary.tendencia}</span>
            </div>
          </div>

          <div className="pred-revenue-grid">
            <div className="pred-revenue-card pred-revenue-primary">
              <CircleDollarSign size={20} />
              <div>
                <p className="pred-kpi-label">Proxima semana</p>
                <p className="pred-kpi-value">{formatCurrency(revenueSummary.proximo_7_dias)}</p>
                <p className="pred-kpi-sub">ingreso estimado en 7 dias</p>
              </div>
            </div>
            <div className="pred-revenue-card">
              <CircleDollarSign size={20} />
              <div>
                <p className="pred-kpi-label">Proximo mes</p>
                <p className="pred-kpi-value">{formatCurrency(revenueSummary.proximo_30_dias)}</p>
                <p className="pred-kpi-sub">ingreso estimado en 30 dias</p>
              </div>
            </div>
            <div className={`pred-revenue-card ${revenueSummary.crecimiento_estimado_pct >= 0 ? "pred-revenue-positive" : "pred-revenue-negative"}`}>
              <TrendingUp size={20} />
              <div>
                <p className="pred-kpi-label">Vs ultimos 30 dias</p>
                <p className="pred-kpi-value">{formatPercent(revenueSummary.crecimiento_estimado_pct)}</p>
                <p className="pred-kpi-sub">comparado con lo ya vendido</p>
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
              <span className="pred-sub">Promedio diario historico</span>
              <strong>{formatCurrency(revenueSummary.promedio_diario_historico)}</strong>
            </div>
            <div>
              <span className="pred-sub">Promedio diario proyectado</span>
              <strong>{formatCurrency(revenueSummary.promedio_diario_proyectado)}</strong>
            </div>
            <div>
              <span className="pred-sub">Ultimos 30 dias</span>
              <strong>{formatCurrency(revenueSummary.ultimo_30_dias)}</strong>
            </div>
          </div>

          <RevenueLineChart history={revenueForecast.history} forecast={revenueForecast.forecast} />
        </div>
      )}

      <div className="pred-kpi-row">
        <div className={`pred-kpi-card ${enRiesgo > 0 ? "pred-kpi-alert" : ""}`}>
          <AlertTriangle size={20} />
          <div>
            <p className="pred-kpi-label">En riesgo de agotarse</p>
            <p className="pred-kpi-value">{enRiesgo}</p>
            <p className="pred-kpi-sub">{enRiesgo === 0 ? "Sin alertas fuertes" : "alta demanda + poco stock"}</p>
          </div>
        </div>
        <div className={`pred-kpi-card ${sinStock > 0 ? "pred-kpi-alert" : ""}`}>
          <Package size={20} />
          <div>
            <p className="pred-kpi-label">Productos sin stock</p>
            <p className="pred-kpi-value">{sinStock}</p>
            <p className="pred-kpi-sub">{sinStock === 0 ? "Catalogo disponible" : "ya agotados"}</p>
          </div>
        </div>
        <div className="pred-kpi-card pred-kpi-gold">
          <TrendingUp size={20} />
          <div>
            <p className="pred-kpi-label">Alta demanda</p>
            <p className="pred-kpi-value">{altaDemanda}</p>
            <p className="pred-kpi-sub">productos con rotacion fuerte</p>
          </div>
        </div>
        <div className="pred-kpi-card">
          <Package size={20} />
          <div>
            <p className="pred-kpi-label">Total productos</p>
            <p className="pred-kpi-value">{predictions.length}</p>
            <p className="pred-kpi-sub">analizados en catalogo</p>
          </div>
        </div>
      </div>

      {riskAlerts.length > 0 && (
        <div className="dash-card">
          <div className="dash-card-header">
            <div>
              <p className="dash-card-kicker">Prioridad inmediata</p>
              <h2 className="dash-card-title">Productos en riesgo de agotarse</h2>
            </div>
          </div>
          <div className="pred-alerts-grid">
            {riskAlerts.map((prediction) => (
              <RiskAlertCard key={prediction.productId} prediction={prediction} />
            ))}
          </div>
        </div>
      )}

      {recomendaciones.length > 0 && (
        <div className="dash-card">
          <div className="dash-card-header">
            <div>
              <p className="dash-card-kicker">Lo que debes hacer ahora</p>
              <h2 className="dash-card-title">Recomendaciones</h2>
            </div>
          </div>
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
        </div>
      )}

      {recomendaciones.length === 0 && predictions.length > 0 && riskAlerts.length === 0 && (
        <div className="pred-no-alerts" style={{ marginBottom: "1.5rem" }}>
          <CheckCircle size={32} className="pred-trend-up" />
          <p style={{ fontWeight: 600 }}>Todo en orden por ahora</p>
          <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
            No hay productos con alta demanda y cobertura corta en este momento.
          </p>
        </div>
      )}

      {weeklyChart.length > 0 && (
        <div className="dash-card">
          <div className="dash-card-header">
            <div>
              <p className="dash-card-kicker">Ventas semanales</p>
              <h2 className="dash-card-title">Como se esta moviendo la venta</h2>
            </div>
          </div>
          <WeeklyChart data={weeklyChart} />
        </div>
      )}

      {predictions.length > 0 && (
        <div className="dash-card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="dash-card-header" style={{ padding: "1.25rem 1.5rem 0.75rem" }}>
            <div>
              <p className="dash-card-kicker">Estado del inventario</p>
              <h2 className="dash-card-title">Como esta cada producto</h2>
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
                    <th>Proyeccion ({horizon} dias)</th>
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
                      : prediction.riesgo_agotamiento || prediction.nivel_riesgo !== "estable"
                        ? "low"
                        : "ok";

                    return (
                      <tr
                        key={prediction.productId}
                        className={!prediction.sin_historial && (prediction.riesgo_agotamiento || prediction.nivel_riesgo === "critico") ? "pred-row-alert" : ""}
                      >
                        <td>
                          {prediction.codigo && <p className="pred-product-code">{prediction.codigo}</p>}
                          <p className="pred-product-name">{prediction.nombre}</p>
                          <p className="pred-product-cat">{prediction.categoria}</p>
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
          <p>Aun no hay productos registrados para analizar.</p>
        </div>
      )}

      <div className="dash-card" style={{ padding: "1.25rem 1.5rem" }}>
        <div className="dash-card-header" style={{ padding: 0, marginBottom: "1rem" }}>
          <div>
            <p className="dash-card-kicker">Asistente inteligente</p>
            <h2 className="dash-card-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Brain size={20} /> Consulta a la IA
            </h2>
          </div>
        </div>

        {messages.length > 0 && (
          <div style={{ maxHeight: "320px", overflowY: "auto", marginBottom: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    maxWidth: "80%",
                    padding: "0.625rem 0.875rem",
                    borderRadius: msg.role === "user" ? "1rem 1rem 0.25rem 1rem" : "1rem 1rem 1rem 0.25rem",
                    background: msg.role === "user" ? "var(--gold)" : "var(--dark-alt)",
                    color: msg.role === "user" ? "#1a1a1a" : "var(--text-main)",
                    fontSize: "13.5px",
                    lineHeight: "1.55",
                    whiteSpace: "pre-wrap",
                    border: msg.role === "assistant" ? "1px solid var(--border)" : "none",
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {aiLoading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{ padding: "0.625rem 0.875rem", borderRadius: "1rem 1rem 1rem 0.25rem", background: "var(--dark-alt)", border: "1px solid var(--border)", display: "flex", gap: "4px", alignItems: "center" }}>
                  {[0, 1, 2].map((i) => (
                    <span key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--text-muted)", display: "inline-block", animation: "pred-dot-blink 1.2s infinite", animationDelay: `${i * 0.2}s` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}

        {messages.length === 0 && (
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "0.875rem" }}>
            Pregunta sobre el inventario, las predicciones de demanda o la proyección de ingresos.
          </p>
        )}

        <PromptInputBox
          onSend={handleSend}
          isLoading={aiLoading}
          placeholder="Ej: ¿Qué productos están en riesgo? ¿Cuánto ingresará el próximo mes?"
        />
      </div>
    </div>
  );
}
