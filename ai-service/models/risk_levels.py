"""IRE level labels and score contribution allocation."""
from __future__ import annotations

import math

from models.risk_metadata import PESO_DEMANDA, PESO_INGRESOS, PESO_STOCK


def ire_nivel_descripcion(ire: int) -> tuple[str, str]:
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


def score_contributions(dimension_values: dict[str, float], score: int) -> dict[str, int]:
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
