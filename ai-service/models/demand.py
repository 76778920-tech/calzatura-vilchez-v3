"""
Demand prediction model.
Uses simple business rules based on recent consumption velocity.
"""
from collections import defaultdict
from datetime import date, timedelta
import math


def _safe_float(value) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _iso_date(value) -> str | None:
    """Normalize a Firestore date field to YYYY-MM-DD string."""
    if isinstance(value, str) and len(value) >= 10:
        return value[:10]
    if hasattr(value, "date"):
        return value.date().isoformat()
    return None


def _percentile(values: list[float], quantile: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    if len(ordered) == 1:
        return ordered[0]
    pos = max(0.0, min(1.0, quantile)) * (len(ordered) - 1)
    lower = math.floor(pos)
    upper = math.ceil(pos)
    if lower == upper:
        return ordered[lower]
    weight = pos - lower
    return ordered[lower] * (1 - weight) + ordered[upper] * weight


def build_daily_sales_by_product(
    daily_sales: list[dict],
    completed_orders: list[dict],
) -> dict[str, dict[str, float]]:
    """
    Returns { productId: { "YYYY-MM-DD": units_sold } }
    combining manual sales and completed orders.
    """
    result: dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))

    # Manual sales from ventasDiarias.
    # Returned sales should not count as demand.
    for sale in daily_sales:
        pid = sale.get("productId", "")
        fecha = sale.get("fecha", "")
        qty = _safe_float(sale.get("cantidad", 0))
        if pid and fecha and qty > 0 and not sale.get("devuelto", False):
            result[pid][fecha] += qty

    # Sales from completed orders
    for order in completed_orders:
        fecha = _iso_date(order.get("creadoEn"))
        if not fecha:
            continue
        for item in order.get("items", []):
            product = item.get("product", {})
            pid = product.get("id", "")
            qty = _safe_float(item.get("quantity", 0))
            if pid and qty > 0:
                result[pid][fecha] += qty

    return {k: dict(v) for k, v in result.items()}


def predict_demand(
    daily_sales: list[dict],
    completed_orders: list[dict],
    products: list[dict],
    product_codes: dict[str, str] | None = None,
    horizon_days: int = 30,
    history_days: int = 90,
) -> list[dict]:
    """
    Predicts demand for each product for the next `horizon_days`.

    Forecast model:
    - avg last 7 days
    - avg last 30 days
    - weighted blend: 70% recent + 30% monthly
    """
    today = date.today()
    history_start = today - timedelta(days=history_days)
    date_range = [
        (history_start + timedelta(days=i)).isoformat()
        for i in range(history_days)
    ]

    sales_map = build_daily_sales_by_product(daily_sales, completed_orders)
    product_map = {p["id"]: p for p in products}
    codes_map: dict[str, str] = product_codes or {}

    sale_meta: dict[str, dict] = {}
    for sale in daily_sales:
        pid = sale.get("productId", "")
        if pid and pid not in sale_meta:
            sale_meta[pid] = {
                "nombre": sale.get("nombre", pid),
                "categoria": sale.get("categoria", ""),
                "precio": _safe_float(sale.get("precioVenta", 0)),
                "codigo": sale.get("codigo", ""),
            }

    for order in completed_orders:
        for item in order.get("items", []):
            product = item.get("product", {})
            pid = product.get("id", "")
            if pid and pid not in sale_meta:
                sale_meta[pid] = {
                    "nombre": product.get("nombre", pid),
                    "categoria": product.get("categoria", ""),
                    "precio": _safe_float(product.get("precio", 0)),
                }

    recent_predictions = []
    predicted_pids: set[str] = set()
    window_7 = min(7, history_days)
    window_30 = min(30, history_days)

    for pid, day_sales in sales_map.items():
        series = [day_sales.get(d, 0.0) for d in date_range]
        total_sold = sum(series)
        if total_sold <= 0:
            continue

        sales_7 = round(sum(series[-window_7:]), 1) if window_7 else 0.0
        sales_30 = round(sum(series[-window_30:]), 1) if window_30 else 0.0
        avg_7 = sales_7 / window_7 if window_7 else 0.0
        avg_30 = sales_30 / window_30 if window_30 else 0.0
        estimated_daily = round((avg_7 * 0.7) + (avg_30 * 0.3), 2)
        predicted_units = round(estimated_daily * horizon_days, 1)
        weekly = round(estimated_daily * 7, 1)
        avg_daily_hist = total_sold / history_days
        active_days = sum(1 for value in series if value > 0)

        product = product_map.get(pid, {})
        meta = sale_meta.get(pid, {})
        stock = int(product.get("stock", 0))
        nombre = product.get("nombre") or meta.get("nombre", pid)
        categoria = product.get("categoria") or meta.get("categoria", "")
        raw_precio = product.get("precio")
        precio = _safe_float(raw_precio) if raw_precio is not None else _safe_float(meta.get("precio", 0.0))
        codigo = codes_map.get(pid) or meta.get("codigo", "")

        if stock == 0 and estimated_daily > 0:
            days_until_stockout = 0
        elif estimated_daily > 0:
            days_until_stockout = math.ceil(stock / estimated_daily)
        else:
            days_until_stockout = 999

        confidence = min(
            100,
            round(
                35
                + (min(active_days, 30) / 30) * 30
                + (min(total_sold, 60) / 60) * 35
            ),
        )

        if avg_7 > 0 and (avg_30 == 0 or avg_7 >= avg_30 * 1.2):
            trend = "subiendo"
        elif avg_30 > 0 and avg_7 <= avg_30 * 0.85:
            trend = "bajando"
        else:
            trend = "estable"

        predicted_pids.add(pid)
        recent_predictions.append({
            "productId": pid,
            "codigo": codigo,
            "nombre": nombre,
            "categoria": categoria,
            "precio": precio,
            "stock_actual": stock,
            "prediccion_unidades": predicted_units,
            "prediccion_diaria": estimated_daily,
            "prediccion_semanal": weekly,
            "total_vendido_historico": round(total_sold, 1),
            "promedio_diario_historico": round(avg_daily_hist, 2),
            "ventas_7_dias": sales_7,
            "ventas_30_dias": sales_30,
            "consumo_diario_7": round(avg_7, 2),
            "consumo_diario_30": round(avg_30, 2),
            "consumo_estimado_diario": estimated_daily,
            "dias_hasta_agotarse": min(days_until_stockout, 999),
            "tendencia": trend,
            "confianza": confidence,
            "alta_demanda": False,
            "riesgo_agotamiento": False,
            "nivel_riesgo": "estable",
            "alerta_stock": False,
            "sin_historial": False,
        })

    demand_values = [
        p["consumo_estimado_diario"]
        for p in recent_predictions
        if p["consumo_estimado_diario"] > 0
    ]
    high_demand_threshold = _percentile(demand_values, 0.8)

    predictions = []
    for prediction in recent_predictions:
        stock = prediction["stock_actual"]
        daily_demand = prediction["consumo_estimado_diario"]
        days_until_stockout = prediction["dias_hasta_agotarse"]
        recent_acceleration = (
            prediction["consumo_diario_7"] > 0
            and (
                prediction["consumo_diario_30"] == 0
                or prediction["consumo_diario_7"] >= prediction["consumo_diario_30"] * 1.2
            )
        )
        sustained_rotation = prediction["ventas_30_dias"] >= 6
        high_demand = daily_demand > 0 and (
            (high_demand_threshold > 0 and daily_demand >= high_demand_threshold)
            or (recent_acceleration and sustained_rotation)
            or prediction["ventas_7_dias"] >= 5
        )

        if daily_demand <= 0:
            risk_level = "estable"
        elif stock == 0 or days_until_stockout <= 7:
            risk_level = "critico"
        elif days_until_stockout <= 14:
            risk_level = "atencion"
        elif days_until_stockout <= 21:
            risk_level = "vigilancia"
        else:
            risk_level = "estable"

        stockout_risk = high_demand and (
            (stock == 0 and daily_demand > 0)
            or (0 < days_until_stockout <= horizon_days)
        )

        prediction["alta_demanda"] = high_demand
        prediction["riesgo_agotamiento"] = stockout_risk
        prediction["nivel_riesgo"] = risk_level
        prediction["alerta_stock"] = daily_demand > 0 and (
            stock == 0 or (0 < days_until_stockout <= horizon_days)
        )
        predictions.append(prediction)

    for pid, product in product_map.items():
        if pid in predicted_pids:
            continue
        predictions.append({
            "productId": pid,
            "codigo": codes_map.get(pid, ""),
            "nombre": product.get("nombre", pid),
            "categoria": product.get("categoria", ""),
            "precio": _safe_float(product.get("precio", 0)),
            "stock_actual": int(product.get("stock", 0)),
            "prediccion_unidades": 0,
            "prediccion_diaria": 0,
            "prediccion_semanal": 0,
            "total_vendido_historico": 0,
            "promedio_diario_historico": 0,
            "ventas_7_dias": 0,
            "ventas_30_dias": 0,
            "consumo_diario_7": 0,
            "consumo_diario_30": 0,
            "consumo_estimado_diario": 0,
            "dias_hasta_agotarse": 999,
            "tendencia": "estable",
            "confianza": 0,
            "alta_demanda": False,
            "riesgo_agotamiento": False,
            "nivel_riesgo": "sin_historial",
            "alerta_stock": False,
            "sin_historial": True,
        })

    risk_order = {
        "critico": 0,
        "atencion": 1,
        "vigilancia": 2,
        "estable": 3,
        "sin_historial": 4,
    }
    predictions.sort(
        key=lambda item: (
            item["sin_historial"],
            0 if item["riesgo_agotamiento"] else 1,
            risk_order.get(item["nivel_riesgo"], 4),
            -item["consumo_estimado_diario"],
            -item["prediccion_unidades"],
        )
    )
    return predictions


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
    """Returns total sales per week for the last `weeks` weeks."""
    today = date.today()
    sales_map = build_daily_sales_by_product(daily_sales, completed_orders)

    date_totals: dict[str, float] = defaultdict(float)
    for day_sales in sales_map.values():
        for current_date, qty in day_sales.items():
            date_totals[current_date] += qty

    chart = []
    for w in range(weeks - 1, -1, -1):
        week_start = today - timedelta(days=(w + 1) * 7 - 1)
        week_end = today - timedelta(days=w * 7)
        week_dates = [
            (week_start + timedelta(days=i)).isoformat()
            for i in range(7)
        ]
        total = sum(date_totals.get(current_date, 0.0) for current_date in week_dates)
        label = f"Sem {week_start.strftime('%d/%m')}"
        chart.append({"semana": label, "unidades": round(total, 1)})

    return chart
