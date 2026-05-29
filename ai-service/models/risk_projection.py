"""Forward-looking stock projection for IRE."""
from __future__ import annotations


def projected_stock_nivel(stock_proy: float, dias_proy: float) -> str:
    if stock_proy == 0 or dias_proy <= 7:
        return "critico"
    if dias_proy <= 14:
        return "atencion"
    if dias_proy <= 30:
        return "vigilancia"
    return "estable"


def project_predictions_for_horizon(predictions: list[dict], horizon: int) -> list[dict]:
    projected: list[dict] = []
    for product in predictions:
        if product.get("sin_historial"):
            projected.append({**product})
            continue

        stock_actual = float(product.get("stock_actual", 0))
        consumo = float(product.get("consumo_estimado_diario", 0))
        stock_proy = max(0.0, stock_actual - consumo * horizon)
        dias_proy = (stock_proy / consumo) if consumo > 0 else 999

        projected.append({
            **product,
            "stock_actual": round(stock_proy, 1),
            "nivel_riesgo": projected_stock_nivel(stock_proy, dias_proy),
            "dias_hasta_agotarse": min(round(dias_proy), 999),
            "alta_demanda": product.get("alta_demanda") and stock_proy < 5,
        })
    return projected
