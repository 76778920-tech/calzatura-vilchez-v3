"""
Revenue forecasting model.
Builds a daily income series and projects future revenue using
recent trend plus weekday seasonality.
"""
from models.revenue_forecast import (
    build_revenue_forecast_rows,
    revenue_growth_rate,
    weekday_value_buckets,
)
from models.revenue_helpers import (
    accumulate_tienda_revenue,
    accumulate_web_revenue,
    build_daily_revenue_series,
    build_date_range,
    clamp,
    iso_date,
    safe_float,
)
from models.revenue_summary import assemble_revenue_response, build_revenue_summary
from models.safe_limits import (
    MAX_CHART_FORECAST_DAYS,
    MAX_CHART_HISTORY_DAYS,
    MAX_HISTORY_DAYS_FOR_LOOPS,
    MAX_HORIZON_DAYS_FOR_LOOPS,
    sanitize_int_for_range,
)

# Backward-compatible aliases for tests and internal callers
_safe_float = safe_float
_iso_date = iso_date
_clamp = clamp
_build_date_range = build_date_range
_accumulate_tienda_revenue = accumulate_tienda_revenue
_accumulate_web_revenue = accumulate_web_revenue
_revenue_growth_rate = revenue_growth_rate
_build_revenue_forecast_rows = build_revenue_forecast_rows


def forecast_revenue(
    daily_sales: list[dict],
    completed_orders: list[dict],
    horizon_days: int = 30,
    history_days: int = 120,
    chart_history_days: int = 21,
    chart_forecast_days: int = 14,
) -> dict:
    history_days = sanitize_int_for_range(
        history_days, default=120, min_v=1, max_v=MAX_HISTORY_DAYS_FOR_LOOPS
    )
    horizon_days = sanitize_int_for_range(
        horizon_days, default=30, min_v=1, max_v=MAX_HORIZON_DAYS_FOR_LOOPS
    )
    chart_history_days = sanitize_int_for_range(
        chart_history_days, default=21, min_v=1, max_v=MAX_CHART_HISTORY_DAYS
    )
    chart_forecast_days = sanitize_int_for_range(
        chart_forecast_days, default=14, min_v=1, max_v=MAX_CHART_FORECAST_DAYS
    )

    series, tienda_total, web_total = build_daily_revenue_series(
        daily_sales=daily_sales,
        completed_orders=completed_orders,
        history_days=history_days,
    )
    values = [point["ingresos"] for point in series]
    overall_avg = sum(values) / history_days if history_days > 0 else 0.0

    recent_window = min(28, len(values))
    prior_window = min(28, max(0, len(values) - recent_window))
    recent_values = values[-recent_window:] if recent_window else []
    prior_values = values[-(recent_window + prior_window):-recent_window] if prior_window else []
    recent_avg = sum(recent_values) / recent_window if recent_window else overall_avg

    growth_rate = revenue_growth_rate(
        recent_values, prior_values, recent_window, prior_window, overall_avg
    )
    weekday_recent, weekday_all = weekday_value_buckets(series)
    forecast = build_revenue_forecast_rows(
        horizon_days,
        weekday_recent,
        weekday_all,
        overall_avg,
        recent_avg,
        growth_rate,
    )
    forecast_values = [point["ingresos"] for point in forecast]
    summary = build_revenue_summary(
        horizon_days=horizon_days,
        history_days=history_days,
        forecast_values=forecast_values,
        values=values,
        overall_avg=overall_avg,
        growth_rate=growth_rate,
        tienda_total=tienda_total,
        web_total=web_total,
    )
    return assemble_revenue_response(
        horizon_days=horizon_days,
        history_days=history_days,
        series=series,
        forecast=forecast,
        summary=summary,
        chart_history_days=chart_history_days,
        chart_forecast_days=chart_forecast_days,
    )
