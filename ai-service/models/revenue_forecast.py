"""Revenue projection math (trend, seasonality, forecast rows)."""
from datetime import date, timedelta

from models.revenue_helpers import clamp


def revenue_growth_rate(
    recent_values: list[float],
    prior_values: list[float],
    recent_window: int,
    prior_window: int,
    overall_avg: float,
) -> float:
    recent_avg = sum(recent_values) / recent_window if recent_window else overall_avg
    prior_avg = sum(prior_values) / prior_window if prior_window else recent_avg
    if prior_avg > 0:
        growth_rate = (recent_avg - prior_avg) / prior_avg
    elif recent_avg > 0:
        growth_rate = 0.12
    else:
        growth_rate = 0.0
    return clamp(growth_rate, -0.35, 0.35)


def weekday_value_buckets(series: list[dict]) -> tuple[dict[int, list[float]], dict[int, list[float]]]:
    weekday_values_recent: dict[int, list[float]] = {}
    weekday_values_all: dict[int, list[float]] = {}
    for point in series:
        weekday = date.fromisoformat(point["fecha"]).weekday()
        weekday_values_all.setdefault(weekday, []).append(point["ingresos"])
    for point in series[-56:]:
        weekday = date.fromisoformat(point["fecha"]).weekday()
        weekday_values_recent.setdefault(weekday, []).append(point["ingresos"])
    return weekday_values_recent, weekday_values_all


def build_revenue_forecast_rows(
    horizon_days: int,
    weekday_values_recent: dict[int, list[float]],
    weekday_values_all: dict[int, list[float]],
    overall_avg: float,
    recent_avg: float,
    growth_rate: float,
) -> list[dict]:
    forecast: list[dict] = []
    today = date.today()
    for step in range(1, horizon_days + 1):
        current_date = today + timedelta(days=step)
        weekday = current_date.weekday()
        weekday_recent = weekday_values_recent.get(weekday, [])
        weekday_all = weekday_values_all.get(weekday, [])
        weekday_recent_avg = sum(weekday_recent) / len(weekday_recent) if weekday_recent else 0.0
        weekday_all_avg = sum(weekday_all) / len(weekday_all) if weekday_all else 0.0
        seasonal_base = weekday_recent_avg * 0.65 + weekday_all_avg * 0.2 + overall_avg * 0.15
        if seasonal_base <= 0:
            seasonal_base = recent_avg if recent_avg > 0 else overall_avg
        trend_multiplier = 1 + (growth_rate * min(step, 30) / 30)
        projected = round(max(0.0, seasonal_base * trend_multiplier), 2)
        forecast.append({"fecha": current_date.isoformat(), "ingresos": projected})
    return forecast
