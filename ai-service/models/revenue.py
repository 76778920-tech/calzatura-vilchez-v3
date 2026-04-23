"""
Revenue forecasting model.
Builds a daily income series and projects future revenue using
recent trend plus weekday seasonality.
"""
from collections import defaultdict
from datetime import date, timedelta


def _safe_float(value) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _iso_date(value) -> str | None:
    if isinstance(value, str) and len(value) >= 10:
        return value[:10]
    if hasattr(value, "date"):
        return value.date().isoformat()
    return None


def _clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def _build_date_range(history_days: int) -> list[str]:
    today = date.today()
    start = today - timedelta(days=history_days - 1)
    return [(start + timedelta(days=i)).isoformat() for i in range(history_days)]


def build_daily_revenue_series(
    daily_sales: list[dict],
    completed_orders: list[dict],
    history_days: int = 120,
) -> list[dict]:
    """Returns a complete daily revenue series for the requested history."""
    revenue_by_date: dict[str, float] = defaultdict(float)

    for sale in daily_sales:
        fecha = sale.get("fecha", "")
        total = _safe_float(sale.get("total", 0))
        if fecha and total > 0 and not sale.get("devuelto", False):
            revenue_by_date[fecha] += total

    for order in completed_orders:
        fecha = _iso_date(order.get("creadoEn"))
        total = _safe_float(order.get("total", 0))
        if fecha and total > 0:
            revenue_by_date[fecha] += total

    series = []
    for current_date in _build_date_range(history_days):
        series.append({
            "fecha": current_date,
            "ingresos": round(revenue_by_date.get(current_date, 0.0), 2),
        })
    return series


def forecast_revenue(
    daily_sales: list[dict],
    completed_orders: list[dict],
    horizon_days: int = 30,
    history_days: int = 120,
    chart_history_days: int = 21,
    chart_forecast_days: int = 14,
) -> dict:
    series = build_daily_revenue_series(
        daily_sales=daily_sales,
        completed_orders=completed_orders,
        history_days=history_days,
    )
    values = [point["ingresos"] for point in series]
    total_historical = round(sum(values), 2)
    active_days = sum(1 for value in values if value > 0)
    overall_avg = total_historical / history_days if history_days > 0 else 0.0

    recent_window = min(28, len(values))
    prior_window = min(28, max(0, len(values) - recent_window))
    recent_values = values[-recent_window:] if recent_window else []
    prior_values = values[-(recent_window + prior_window):-recent_window] if prior_window else []

    recent_avg = sum(recent_values) / recent_window if recent_window else overall_avg
    prior_avg = sum(prior_values) / prior_window if prior_window else recent_avg

    if prior_avg > 0:
      growth_rate = (recent_avg - prior_avg) / prior_avg
    elif recent_avg > 0:
      growth_rate = 0.12
    else:
      growth_rate = 0.0
    growth_rate = _clamp(growth_rate, -0.35, 0.35)

    weekday_values_recent: dict[int, list[float]] = defaultdict(list)
    weekday_values_all: dict[int, list[float]] = defaultdict(list)
    for point in series:
        weekday = date.fromisoformat(point["fecha"]).weekday()
        weekday_values_all[weekday].append(point["ingresos"])
    for point in series[-56:]:
        weekday = date.fromisoformat(point["fecha"]).weekday()
        weekday_values_recent[weekday].append(point["ingresos"])

    forecast = []
    today = date.today()
    for step in range(1, horizon_days + 1):
        current_date = today + timedelta(days=step)
        weekday = current_date.weekday()
        weekday_recent = weekday_values_recent.get(weekday, [])
        weekday_all = weekday_values_all.get(weekday, [])
        weekday_recent_avg = sum(weekday_recent) / len(weekday_recent) if weekday_recent else 0.0
        weekday_all_avg = sum(weekday_all) / len(weekday_all) if weekday_all else 0.0
        seasonal_base = (
            weekday_recent_avg * 0.65
            + weekday_all_avg * 0.2
            + overall_avg * 0.15
        )
        if seasonal_base <= 0:
            seasonal_base = recent_avg if recent_avg > 0 else overall_avg
        trend_multiplier = 1 + (growth_rate * min(step, 30) / 30)
        projected = round(max(0.0, seasonal_base * trend_multiplier), 2)
        forecast.append({
            "fecha": current_date.isoformat(),
            "ingresos": projected,
        })

    forecast_values = [point["ingresos"] for point in forecast]
    next_7_days = round(sum(forecast_values[:7]), 2)
    next_30_days = round(sum(forecast_values[:30]), 2)
    forecast_avg = sum(forecast_values) / len(forecast_values) if forecast_values else 0.0

    if growth_rate > 0.05:
        trend = "subiendo"
    elif growth_rate < -0.05:
        trend = "bajando"
    else:
        trend = "estable"

    confidence = round(_clamp(
        35
        + (min(history_days, 120) / 120) * 20
        + (min(active_days, 60) / 60) * 25
        + (1 - min(abs(growth_rate), 0.35) / 0.35) * 20,
        30,
        95,
    ))

    last_30_actual = round(sum(values[-30:]), 2) if values else 0.0
    growth_vs_last_30 = (
        round(((next_30_days - last_30_actual) / last_30_actual) * 100, 1)
        if last_30_actual > 0
        else 0.0
    )

    history_chart = [
        {
            "fecha": point["fecha"],
            "label": date.fromisoformat(point["fecha"]).strftime("%d/%m"),
            "ingresos": point["ingresos"],
            "tipo": "historico",
        }
        for point in series[-chart_history_days:]
    ]
    forecast_chart = [
        {
            "fecha": point["fecha"],
            "label": date.fromisoformat(point["fecha"]).strftime("%d/%m"),
            "ingresos": point["ingresos"],
            "tipo": "proyectado",
        }
        for point in forecast[:chart_forecast_days]
    ]

    return {
        "horizon_days": horizon_days,
        "history_days": history_days,
        "summary": {
            "proximo_7_dias": next_7_days,
            "proximo_30_dias": next_30_days,
            "promedio_diario_historico": round(overall_avg, 2),
            "promedio_diario_proyectado": round(forecast_avg, 2),
            "ultimo_30_dias": last_30_actual,
            "crecimiento_estimado_pct": growth_vs_last_30,
            "tendencia": trend,
            "confianza": confidence,
        },
        "history": history_chart,
        "forecast": forecast_chart,
    }
