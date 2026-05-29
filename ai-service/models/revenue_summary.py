"""Summary, charts and response assembly for revenue forecasts."""
from datetime import date

from models.revenue_helpers import clamp


def revenue_trend_label(growth_rate: float) -> str:
    if growth_rate > 0.05:
        return "subiendo"
    if growth_rate < -0.05:
        return "bajando"
    return "estable"


def revenue_confidence(history_days: int, active_days: int, growth_rate: float) -> int:
    return round(
        clamp(
            35
            + (min(history_days, 120) / 120) * 20
            + (min(active_days, 60) / 60) * 25
            + (1 - min(abs(growth_rate), 0.35) / 0.35) * 20,
            30,
            95,
        )
    )


def growth_pct(projected: float, actual: float) -> float:
    if actual <= 0:
        return 0.0
    return round(((projected - actual) / actual) * 100, 1)


def chart_points(series_slice: list[dict], tipo: str) -> list[dict]:
    return [
        {
            "fecha": point["fecha"],
            "label": date.fromisoformat(point["fecha"]).strftime("%d/%m"),
            "ingresos": point["ingresos"],
            "tipo": tipo,
        }
        for point in series_slice
    ]


def build_revenue_summary(
    *,
    horizon_days: int,
    history_days: int,
    forecast_values: list[float],
    values: list[float],
    overall_avg: float,
    growth_rate: float,
    tienda_total: float,
    web_total: float,
) -> dict:
    next_7_days = round(sum(forecast_values[:7]), 2)
    next_30_days = round(sum(forecast_values[:30]), 2)
    next_horizon_days = round(sum(forecast_values[:horizon_days]), 2)
    forecast_avg = sum(forecast_values) / len(forecast_values) if forecast_values else 0.0
    last_30_actual = round(sum(values[-30:]), 2) if values else 0.0
    last_horizon_actual = round(sum(values[-horizon_days:]), 2) if values else 0.0
    active_days = sum(1 for value in values if value > 0)

    return {
        "proximo_7_dias": next_7_days,
        "proximo_30_dias": next_30_days,
        "proximo_horizonte": next_horizon_days,
        "promedio_diario_historico": round(overall_avg, 2),
        "promedio_diario_proyectado": round(forecast_avg, 2),
        "ultimo_30_dias": last_30_actual,
        "ultimo_horizonte": last_horizon_actual,
        "crecimiento_estimado_pct": growth_pct(next_30_days, last_30_actual),
        "crecimiento_estimado_horizonte_pct": growth_pct(next_horizon_days, last_horizon_actual),
        "tendencia": revenue_trend_label(growth_rate),
        "confianza": revenue_confidence(history_days, active_days, growth_rate),
        "total_historico_tienda": tienda_total,
        "total_historico_web": web_total,
    }


def assemble_revenue_response(
    *,
    horizon_days: int,
    history_days: int,
    series: list[dict],
    forecast: list[dict],
    summary: dict,
    chart_history_days: int,
    chart_forecast_days: int,
) -> dict:
    return {
        "horizon_days": horizon_days,
        "history_days": history_days,
        "summary": summary,
        "history": chart_points(series[-chart_history_days:], "historico"),
        "forecast": chart_points(forecast[:chart_forecast_days], "proyectado"),
    }
