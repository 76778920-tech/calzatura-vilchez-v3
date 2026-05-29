"""Helpers for daily revenue series construction."""
from collections import defaultdict
from datetime import date, timedelta

from models.safe_limits import MAX_HISTORY_DAYS_FOR_LOOPS, sanitize_int_for_range


def safe_float(value) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def iso_date(value) -> str | None:
    if isinstance(value, str) and len(value) >= 10:
        return value[:10]
    if hasattr(value, "date"):
        return value.date().isoformat()
    return None


def clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def build_date_range(history_days: int) -> list[str]:
    history_days = sanitize_int_for_range(
        history_days, default=120, min_v=1, max_v=MAX_HISTORY_DAYS_FOR_LOOPS
    )
    today = date.today()
    start = today - timedelta(days=history_days - 1)
    return [(start + timedelta(days=i)).isoformat() for i in range(history_days)]


def accumulate_tienda_revenue(
    daily_sales: list[dict],
    revenue_by_date: dict[str, float],
    date_range_set: set[str],
) -> float:
    tienda_total = 0.0
    for sale in daily_sales:
        if sale.get("canal") == "web":
            continue
        fecha = sale.get("fecha", "")
        total = safe_float(sale.get("total", 0))
        if fecha and total > 0 and not sale.get("devuelto", False):
            revenue_by_date[fecha] += total
            if fecha in date_range_set:
                tienda_total += total
    return tienda_total


def accumulate_web_revenue(
    completed_orders: list[dict],
    revenue_by_date: dict[str, float],
    date_range_set: set[str],
) -> float:
    web_total = 0.0
    for order in completed_orders:
        fecha = iso_date(order.get("pagadoEn") or order.get("creadoEn"))
        total = safe_float(order.get("total", 0))
        if fecha and total > 0:
            revenue_by_date[fecha] += total
            if fecha in date_range_set:
                web_total += total
    return web_total


def build_daily_revenue_series(
    daily_sales: list[dict],
    completed_orders: list[dict],
    history_days: int = 120,
) -> tuple[list[dict], float, float]:
    """Returns (daily revenue series, tienda_total, web_total) for the requested history."""
    history_days = sanitize_int_for_range(
        history_days, default=120, min_v=1, max_v=MAX_HISTORY_DAYS_FOR_LOOPS
    )
    revenue_by_date: dict[str, float] = defaultdict(float)
    date_range = build_date_range(history_days)
    date_range_set = set(date_range)

    tienda_total = accumulate_tienda_revenue(daily_sales, revenue_by_date, date_range_set)
    web_total = accumulate_web_revenue(completed_orders, revenue_by_date, date_range_set)

    series = [
        {"fecha": d, "ingresos": round(revenue_by_date.get(d, 0.0), 2)}
        for d in date_range
    ]
    return series, round(tienda_total, 2), round(web_total, 2)
