"""Per-dimension IRE risk scoring."""
from __future__ import annotations

from models.risk_metadata import PESO_DEMANDA, PESO_INGRESOS, PESO_STOCK


def clamp(value: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, value))


def ire_stock_risk_and_counts(
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
        stock_risk = clamp(
            (criticos / total) * 100 * 1.00
            + (atencion / total) * 100 * 0.55
            + (vigilancia / total) * 100 * 0.25
            + (sin_stock / total) * 100 * 0.20
        )
    else:
        stock_risk = 40.0
    return stock_risk, criticos, atencion, vigilancia, sin_stock


def ire_revenue_risk(revenue: dict | None) -> float:
    if not revenue or not revenue.get("summary"):
        return 45.0
    summary = revenue["summary"]
    tendencia = summary.get("tendencia", "estable")
    crecimiento_pct = float(summary.get("crecimiento_estimado_pct", 0) or 0)
    confianza = float(summary.get("confianza", 50) or 50)

    if tendencia == "bajando":
        base_rev = clamp(55 + min(35, abs(crecimiento_pct) * 1.5))
    elif tendencia == "estable":
        base_rev = 28.0
    else:
        base_rev = clamp(max(5.0, 18.0 - crecimiento_pct * 0.4))

    confidence_penalty = (100.0 - confianza) * 0.18
    return clamp(base_rev + confidence_penalty)


def ire_demand_risk_and_counts(
    with_history: list[dict], total: int
) -> tuple[float, int, int, int]:
    bajando = sum(1 for p in with_history if p.get("tendencia") == "bajando")
    alta_sin_stock = sum(
        1 for p in with_history if p.get("alta_demanda") and p.get("stock_actual", 0) < 5
    )
    drift_alto = sum(1 for p in with_history if (p.get("drift_score") or 0) > 0.6)
    if total > 0:
        demand_risk = clamp(
            (bajando / total) * 65 + (alta_sin_stock / total) * 80 + (drift_alto / total) * 30
        )
    else:
        demand_risk = 25.0
    return demand_risk, bajando, alta_sin_stock, drift_alto


def weighted_ire_score(stock_risk: float, revenue_risk: float, demand_risk: float) -> int:
    return round(
        clamp(stock_risk * PESO_STOCK + revenue_risk * PESO_INGRESOS + demand_risk * PESO_DEMANDA)
    )
