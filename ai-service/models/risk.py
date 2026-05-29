"""
Índice de Riesgo Empresarial (IRE).
Combina tres dimensiones para producir un score 0-100 y una clasificación
Bajo / Moderado / Alto / Crítico que resume el estado de riesgo del negocio.
"""
from __future__ import annotations

from models.risk_dimensions import (
    clamp,
    ire_demand_risk_and_counts,
    ire_revenue_risk,
    ire_stock_risk_and_counts,
    weighted_ire_score,
)
from models.risk_levels import ire_nivel_descripcion, score_contributions
from models.risk_metadata import (
    IRE_DEFINITION,
    IRE_VARIABLES,
    IRE_VERSION,
    PESO_DEMANDA,
    PESO_INGRESOS,
    PESO_STOCK,
    format_weight,
    ire_formula,
)
from models.risk_projection import project_predictions_for_horizon

# Backward-compatible aliases for tests
_clamp = clamp
_format_weight = format_weight
_ire_formula = ire_formula
_ire_nivel_descripcion = ire_nivel_descripcion
_score_contributions = score_contributions
_ire_revenue_risk = ire_revenue_risk
_ire_stock_risk_and_counts = ire_stock_risk_and_counts
_ire_demand_risk_and_counts = ire_demand_risk_and_counts


def compute_ire(predictions: list[dict], revenue: dict | None) -> dict:
    with_history = [p for p in predictions if not p.get("sin_historial")]
    total = len(with_history)

    stock_risk, criticos, atencion, vigilancia, sin_stock = ire_stock_risk_and_counts(
        with_history, total
    )
    revenue_risk = ire_revenue_risk(revenue)
    demand_risk, bajando, alta_sin_stock, drift_alto = ire_demand_risk_and_counts(
        with_history, total
    )

    ire = weighted_ire_score(stock_risk, revenue_risk, demand_risk)
    nivel, descripcion = ire_nivel_descripcion(ire)

    raw_dimension_values = {
        "riesgo_stock": stock_risk,
        "riesgo_ingresos": revenue_risk,
        "riesgo_demanda": demand_risk,
    }
    dimension_values = {key: round(value) for key, value in raw_dimension_values.items()}
    contribution_values = score_contributions(raw_dimension_values, ire)

    return {
        "score": ire,
        "nivel": nivel,
        "descripcion": descripcion,
        "sin_datos": total == 0,
        "version": IRE_VERSION,
        "definicion": IRE_DEFINITION,
        "formula": ire_formula(),
        "horizonte_dias": None,
        "dimensiones": dimension_values,
        "pesos": {
            "riesgo_stock": PESO_STOCK,
            "riesgo_ingresos": PESO_INGRESOS,
            "riesgo_demanda": PESO_DEMANDA,
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
            "productos_criticos": criticos,
            "productos_atencion": atencion,
            "productos_vigilancia": vigilancia,
            "productos_sin_stock": sin_stock,
            "productos_bajando": bajando,
            "alta_demanda_bajo_stock": alta_sin_stock,
            "productos_drift_alto": drift_alto,
            "total_con_historial": total,
            "total_sin_historial": len(predictions) - total,
        },
    }


def compute_ire_proyectado(
    predictions: list[dict], revenue: dict | None, horizon: int
) -> dict:
    result = compute_ire(project_predictions_for_horizon(predictions, horizon), revenue)
    result["horizonte_dias"] = horizon
    return result


__all__ = [
    "IRE_VERSION",
    "PESO_STOCK",
    "PESO_INGRESOS",
    "PESO_DEMANDA",
    "IRE_DEFINITION",
    "IRE_VARIABLES",
    "compute_ire",
    "compute_ire_proyectado",
]
