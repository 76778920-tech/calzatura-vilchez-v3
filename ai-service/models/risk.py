"""
Índice de Riesgo Empresarial (IRE).
Combina tres dimensiones para producir un score 0-100 y una clasificación
Bajo / Moderado / Alto / Crítico que resume el estado de riesgo del negocio.

Pesos:
  - Riesgo de stock    40 %  (productos en nivel crítico / atención / vigilancia)
  - Riesgo de ingresos 35 %  (tendencia de ingresos + confianza del modelo)
  - Riesgo de demanda  25 %  (productos bajando + alta demanda sin stock)
"""
from __future__ import annotations


def _clamp(value: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, value))


def compute_ire(predictions: list[dict], revenue: dict | None) -> dict:
    """
    Returns an IRE dict:
      score        int  0–100
      nivel        str  "bajo" | "moderado" | "alto" | "critico"
      descripcion  str  human-readable summary
      dimensiones  dict {riesgo_stock, riesgo_ingresos, riesgo_demanda}
      detalle      dict raw counts used for the score
    """
    with_history = [p for p in predictions if not p.get("sin_historial")]
    total = len(with_history)

    # ── Dimensión 1: Riesgo de stock (40 %) ─────────────────────────────────
    criticos   = sum(1 for p in with_history if p.get("nivel_riesgo") == "critico")
    atencion   = sum(1 for p in with_history if p.get("nivel_riesgo") == "atencion")
    vigilancia = sum(1 for p in with_history if p.get("nivel_riesgo") == "vigilancia")
    sin_stock  = sum(1 for p in with_history if p.get("stock_actual", 0) == 0 and p.get("consumo_estimado_diario", 0) > 0)

    if total > 0:
        stock_risk = _clamp(
            (criticos   / total) * 100 * 1.00 +
            (atencion   / total) * 100 * 0.55 +
            (vigilancia / total) * 100 * 0.25 +
            (sin_stock  / total) * 100 * 0.20
        )
    else:
        stock_risk = 40.0

    # ── Dimensión 2: Riesgo de ingresos (35 %) ──────────────────────────────
    if revenue and revenue.get("summary"):
        summary    = revenue["summary"]
        tendencia  = summary.get("tendencia", "estable")
        crecimiento_pct = float(summary.get("crecimiento_estimado_pct", 0) or 0)
        confianza  = float(summary.get("confianza", 50) or 50)

        if tendencia == "bajando":
            base_rev = _clamp(55 + min(35, abs(crecimiento_pct) * 1.5))
        elif tendencia == "estable":
            base_rev = 28.0
        else:
            base_rev = _clamp(max(5.0, 18.0 - crecimiento_pct * 0.4))

        # Low confidence raises risk
        confidence_penalty = (100.0 - confianza) * 0.18
        revenue_risk = _clamp(base_rev + confidence_penalty)
    else:
        revenue_risk = 45.0

    # ── Dimensión 3: Riesgo de demanda (25 %) ───────────────────────────────
    bajando             = sum(1 for p in with_history if p.get("tendencia") == "bajando")
    alta_sin_stock      = sum(1 for p in with_history if p.get("alta_demanda") and p.get("stock_actual", 0) < 5)
    drift_alto          = sum(1 for p in with_history if (p.get("drift_score") or 0) > 0.6)

    if total > 0:
        demand_risk = _clamp(
            (bajando        / total) * 65 +
            (alta_sin_stock / total) * 80 +
            (drift_alto     / total) * 30
        )
    else:
        demand_risk = 25.0

    # ── Score compuesto ──────────────────────────────────────────────────────
    PESO_STOCK    = 0.40
    PESO_INGRESOS = 0.35
    PESO_DEMANDA  = 0.25

    ire = round(_clamp(
        stock_risk   * PESO_STOCK +
        revenue_risk * PESO_INGRESOS +
        demand_risk  * PESO_DEMANDA
    ))

    if ire <= 25:
        nivel = "bajo"
        descripcion = (
            "El negocio opera con riesgo controlado. "
            "Los indicadores de stock, ingresos y demanda se encuentran dentro de parámetros normales."
        )
    elif ire <= 50:
        nivel = "moderado"
        descripcion = (
            "Existen señales de riesgo que requieren monitoreo activo. "
            "Tome acciones preventivas en los productos con alertas de stock o demanda en descenso."
        )
    elif ire <= 75:
        nivel = "alto"
        descripcion = (
            "Riesgo empresarial elevado. Se recomienda intervención inmediata en el inventario crítico "
            "y revisión de la estrategia de precios para frenar la caída de ingresos."
        )
    else:
        nivel = "critico"
        descripcion = (
            "Estado crítico. El negocio enfrenta riesgo severo de pérdida de ingresos y agotamiento "
            "de productos clave. Requiere decisiones urgentes de reposición y estrategia comercial."
        )

    return {
        "score": ire,
        "nivel": nivel,
        "descripcion": descripcion,
        "dimensiones": {
            "riesgo_stock":    round(stock_risk),
            "riesgo_ingresos": round(revenue_risk),
            "riesgo_demanda":  round(demand_risk),
        },
        "pesos": {
            "riesgo_stock":    PESO_STOCK,
            "riesgo_ingresos": PESO_INGRESOS,
            "riesgo_demanda":  PESO_DEMANDA,
        },
        "detalle": {
            "productos_criticos":    criticos,
            "productos_atencion":    atencion,
            "productos_vigilancia":  vigilancia,
            "productos_sin_stock":   sin_stock,
            "total_con_historial":   total,
            "total_sin_historial":   len(predictions) - total,
        },
    }
