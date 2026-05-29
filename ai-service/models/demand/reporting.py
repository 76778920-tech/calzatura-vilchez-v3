"""Stock alerts and weekly chart."""

from datetime import date, timedelta

from models.demand.helpers import _safe_float
from models.safe_limits import MAX_WEEKS_FOR_CHART, sanitize_int_for_range

def get_stock_alerts(predictions: list[dict], days_threshold: int = 14) -> list[dict]:
    """Returns products in real stockout risk: high demand + low coverage."""
    alerts = [
        item
        for item in predictions
        if item["riesgo_agotamiento"]
        and (item["stock_actual"] == 0 or item["dias_hasta_agotarse"] <= days_threshold)
    ]
    alerts.sort(key=lambda item: (item["dias_hasta_agotarse"], -item["consumo_estimado_diario"]))
    return alerts


def get_weekly_chart(
    daily_sales: list[dict],
    completed_orders: list[dict],
    weeks: int = 8,
) -> list[dict]:
    """Returns total units sold per week for the last `weeks` weeks."""
    weeks = sanitize_int_for_range(weeks, default=8, min_v=1, max_v=MAX_WEEKS_FOR_CHART)
    today = date.today()
    sales_map = build_daily_sales_by_product(daily_sales, completed_orders)

    date_totals: dict[str, float] = defaultdict(float)
    for day_sales in sales_map.values():
        for current_date, qty in day_sales.items():
            date_totals[current_date] += qty

    chart = []
    for w in range(weeks - 1, -1, -1):
        week_start = today - timedelta(days=(w + 1) * 7 - 1)
        week_dates = [
            (week_start + timedelta(days=i)).isoformat()
            for i in range(7)
        ]
        total = sum(date_totals.get(d, 0.0) for d in week_dates)
        chart.append({"semana": f"Sem {week_start.strftime('%d/%m')}", "unidades": round(total, 1)})

    return chart
