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

import math

IRE_VERSION = "1.1.0"

PESO_STOCK = 0.40
PESO_INGRESOS = 0.35
PESO_DEMANDA = 0.25

IRE_DEFINITION = (
    "Índice proxy de 0 a 100 que resume el riesgo empresarial comercial-operativo "
    "del e-commerce a partir de inventario, ingresos proyectados y demanda."
)

IRE_VARIABLES = [
    {
        "codigo": "riesgo_stock",
        "nombre": "Riesgo de stock",
        "peso": PESO_STOCK,
        "descripcion": (
            "Mide la presión del inventario según productos críticos, en atención, "
            "en vigilancia y productos sin stock con demanda estimada."
        ),
        "fuente": "Predicción de demanda e inventario actual de productos.",
        "indicadores": [
            "productos_criticos",
            "productos_atencion",
            "productos_vigilancia",
            "productos_sin_stock",
            "total_con_historial",
        ],
    },
    {
        "codigo": "riesgo_ingresos",
        "nombre": "Riesgo de ingresos",
        "peso": PESO_INGRESOS,
        "descripcion": (
            "Mide la probabilidad de presión financiera por tendencia negativa "
            "de ingresos, crecimiento proyectado y confianza del forecast."
        ),
        "fuente": "Proyección de ingresos del servicio de IA.",
        "indicadores": [
            "tendencia_ingresos",
            "crecimiento_estimado_pct",
            "confianza_ingresos",
        ],
    },
    {
        "codigo": "riesgo_demanda",
        "nombre": "Riesgo de demanda",
        "peso": PESO_DEMANDA,
        "descripcion": (
            "Mide cambios comerciales relevantes: productos con demanda bajando, "
            "alta demanda con bajo stock y drift del comportamiento reciente."
        ),
        "fuente": "Predicción por producto, consumo estimado y drift del modelo.",
        "indicadores": [
            "productos_bajando",
            "alta_demanda_bajo_stock",
            "drift_alto",
            "total_con_historial",
        ],
    },
]


def _format_weight(weight: float) -> str:
    return f"{weight:.2f}"


def _ire_formula() -> str:
    return (
        f"IRE = riesgo_stock * {_format_weight(PESO_STOCK)} + "
        f"riesgo_ingresos * {_format_weight(PESO_INGRESOS)} + "
        f"riesgo_demanda * {_format_weight(PESO_DEMANDA)}"
    )


def _score_contributions(dimension_values: dict[str, float], score: int) -> dict[str, int]:
    """
    Integer contribution points that add up exactly to the final IRE score.
    Uses largest remainder allocation, so the UI and audit trail do not show
    partial contributions whose rounded sum differs from the displayed score.
    """
    exact = {
        "riesgo_stock": dimension_values["riesgo_stock"] * PESO_STOCK,
        "riesgo_ingresos": dimension_values["riesgo_ingresos"] * PESO_INGRESOS,
        "riesgo_demanda": dimension_values["riesgo_demanda"] * PESO_DEMANDA,
    }
    result = {key: math.floor(value) for key, value in exact.items()}
    remaining = max(0, score - sum(result.values()))
    order = sorted(exact, key=lambda key: exact[key] - result[key], reverse=True)
    for key in order[:remaining]:
        result[key] += 1
    return result


def _clamp(value: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, value))


def _ire_stock_risk_and_counts(
    with_history: list[dict], total: int
) -> tuple[float, int, int, int, int]:
    criticos = sum(1 for p in with_history if p.get("nivel_riesgo") == "critico")
    atencion = sum(1 for p in with_history if p.get("nivel_riesgo") == "atencion")
    vigilancia = sum(1 for p in with_history if p.get("nivel_riesgo") == "vigilancia")
    sin_stock = sum(
        1
        for p in with_history
        if p.get("stock_actual", 0) == 0 and p.get("consumo_estimado_diario", 0) > 0
    )
    if total > 0:
        stock_risk = _clamp(
            (criticos / total) * 100 * 1.00
            + (atencion / total) * 100 * 0.55
            + (vigilancia / total) * 100 * 0.25
            + (sin_stock / total) * 100 * 0.20
        )
    else:
        stock_risk = 40.0
    return stock_risk, criticos, atencion, vigilancia, sin_stock


def _ire_revenue_risk(revenue: dict | None) -> float:
    if not revenue or not revenue.get("summary"):
        return 45.0
    summary = revenue["summary"]
    tendencia = summary.get("tendencia", "estable")
    crecimiento_pct = float(summary.get("crecimiento_estimado_pct", 0) or 0)
    confianza = float(summary.get("confianza", 50) or 50)

    if tendencia == "bajando":
        base_rev = _clamp(55 + min(35, abs(crecimiento_pct) * 1.5))
    elif tendencia == "estable":
        base_rev = 28.0
    else:
        base_rev = _clamp(max(5.0, 18.0 - crecimiento_pct * 0.4))

    confidence_penalty = (100.0 - confianza) * 0.18
    return _clamp(base_rev + confidence_penalty)


def _ire_demand_risk_and_counts(
    with_history: list[dict], total: int
) -> tuple[float, int, int, int]:
    bajando = sum(1 for p in with_history if p.get("tendencia") == "bajando")
    alta_sin_stock = sum(
        1 for p in with_history if p.get("alta_demanda") and p.get("stock_actual", 0) < 5
    )
    drift_alto = sum(1 for p in with_history if (p.get("drift_score") or 0) > 0.6)
    if total > 0:
        demand_risk = _clamp(
            (bajando / total) * 65 + (alta_sin_stock / total) * 80 + (drift_alto / total) * 30
        )
    else:
        demand_risk = 25.0
    return demand_risk, bajando, alta_sin_stock, drift_alto


def _ire_nivel_descripcion(ire: int) -> tuple[str, str]:
    if ire <= 25:
        return (
            "bajo",
            (
                "El negocio opera con riesgo controlado. "
                "Los indicadores de stock, ingresos y demanda se encuentran dentro de parámetros normales."
            ),
        )
    if ire <= 50:
        return (
            "moderado",
            (
                "Existen señales de riesgo que requieren monitoreo activo. "
                "Tome acciones preventivas en los productos con alertas de stock o demanda en descenso."
            ),
        )
    if ire <= 75:
        return (
            "alto",
            (
                "Riesgo empresarial elevado. Se recomienda intervención inmediata en el inventario crítico "
                "y revisión de la estrategia de precios para frenar la caída de ingresos."
            ),
        )
    return (
        "critico",
        (
            "Estado crítico. El negocio enfrenta riesgo severo de pérdida de ingresos y agotamiento "
            "de productos clave. Requiere decisiones urgentes de reposición y estrategia comercial."
        ),
    )


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

    stock_risk, criticos, atencion, vigilancia, sin_stock = _ire_stock_risk_and_counts(
        with_history, total
    )
    revenue_risk = _ire_revenue_risk(revenue)
    demand_risk, bajando, alta_sin_stock, drift_alto = _ire_demand_risk_and_counts(
        with_history, total
    )

    ire = round(
        _clamp(
            stock_risk * PESO_STOCK + revenue_risk * PESO_INGRESOS + demand_risk * PESO_DEMANDA
        )
    )
    nivel, descripcion = _ire_nivel_descripcion(ire)

    raw_dimension_values = {
        "riesgo_stock": stock_risk,
        "riesgo_ingresos": revenue_risk,
        "riesgo_demanda": demand_risk,
    }
    dimension_values = {
        key: round(value)
        for key, value in raw_dimension_values.items()
    }
    contribution_values = _score_contributions(raw_dimension_values, ire)

    return {
        "score":          ire,
        "nivel":          nivel,
        "descripcion":    descripcion,
        "version":        IRE_VERSION,
        "definicion":     IRE_DEFINITION,
        "formula":        _ire_formula(),
        "horizonte_dias": None,   # None = estado actual; int = proyectado a N días
        "dimensiones": dimension_values,
        "pesos": {
            "riesgo_stock":    PESO_STOCK,
            "riesgo_ingresos": PESO_INGRESOS,
            "riesgo_demanda":  PESO_DEMANDA,
        },
        "variables": [
            {
                **variable,
                "valor": dimension_values[variable["codigo"]],
                "contribucion_score": contribution_values[variable["codigo"]],
            }
            for variable in IRE_VARIABLES
        ],
        "detalle": {
            "productos_criticos":    criticos,
            "productos_atencion":    atencion,
            "productos_vigilancia":  vigilancia,
            "productos_sin_stock":   sin_stock,
            "productos_bajando":     bajando,
            "alta_demanda_bajo_stock": alta_sin_stock,
            "productos_drift_alto":  drift_alto,
            "total_con_historial":   total,
            "total_sin_historial":   len(predictions) - total,
        },
    }


def compute_ire_proyectado(
    predictions: list[dict], revenue: dict | None, horizon: int
) -> dict:
    """
    Proyecta el IRE a `horizon` días en el futuro descontando el consumo estimado
    del stock actual. El riesgo de ingresos y demanda se toman del forecast
    existente (ya son forward-looking). Solo el riesgo de stock se recalcula
    con el stock proyectado.
    """
    projected: list[dict] = []
    for p in predictions:
        if p.get("sin_historial"):
            projected.append({**p})
            continue

        stock_actual = float(p.get("stock_actual", 0))
        consumo      = float(p.get("consumo_estimado_diario", 0))
        stock_proy   = max(0.0, stock_actual - consumo * horizon)

        dias_proy = (stock_proy / consumo) if consumo > 0 else 999

        if stock_proy == 0:
            nivel_proy = "critico"
        elif dias_proy <= 7:
            nivel_proy = "critico"
        elif dias_proy <= 14:
            nivel_proy = "atencion"
        elif dias_proy <= 30:
            nivel_proy = "vigilancia"
        else:
            nivel_proy = "estable"

        projected.append({
            **p,
            "stock_actual":      round(stock_proy, 1),
            "nivel_riesgo":      nivel_proy,
            "dias_hasta_agotarse": min(round(dias_proy), 999),
            "alta_demanda":      p.get("alta_demanda") and stock_proy < 5,
        })

    result = compute_ire(projected, revenue)
    result["horizonte_dias"] = horizon
    return result
