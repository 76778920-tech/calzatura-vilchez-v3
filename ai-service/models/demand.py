"""
Demand prediction model — pure Python, no external ML libraries.
Uses weighted linear regression over daily sales history.
"""
from datetime import date, timedelta
from collections import defaultdict


# ─── Math helpers ────────────────────────────────────────────────────────────

def _linear_regression(x: list[float], y: list[float]) -> tuple[float, float]:
    """Returns (slope, intercept) via ordinary least squares."""
    n = len(x)
    if n < 2:
        return 0.0, (y[0] if y else 0.0)
    sum_x = sum(x)
    sum_y = sum(y)
    sum_xy = sum(xi * yi for xi, yi in zip(x, y))
    sum_xx = sum(xi * xi for xi in x)
    denom = n * sum_xx - sum_x ** 2
    if denom == 0:
        return 0.0, sum_y / n
    slope = (n * sum_xy - sum_x * sum_y) / denom
    intercept = (sum_y - slope * sum_x) / n
    return slope, intercept


def _moving_average(values: list[float], window: int = 7) -> float:
    """Weighted moving average — recent days have more weight."""
    if not values:
        return 0.0
    tail = values[-window:]
    weights = list(range(1, len(tail) + 1))
    total_w = sum(weights)
    return sum(v * w for v, w in zip(tail, weights)) / total_w


def _mae(actual: list[float], predicted: list[float]) -> float:
    if not actual:
        return 0.0
    return sum(abs(a - p) for a, p in zip(actual, predicted)) / len(actual)


# ─── Data aggregation ────────────────────────────────────────────────────────

def _iso_date(value) -> str | None:
    """Normalize a Firestore date field to YYYY-MM-DD string."""
    if isinstance(value, str) and len(value) >= 10:
        return value[:10]
    if hasattr(value, "date"):
        return value.date().isoformat()
    return None


def build_daily_sales_by_product(
    daily_sales: list[dict],
    completed_orders: list[dict],
) -> dict[str, dict[str, float]]:
    """
    Returns { productId: { "YYYY-MM-DD": units_sold } }
    combining manual sales and completed orders.
    """
    result: dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))

    # Manual sales from ventasDiarias
    for sale in daily_sales:
        pid = sale.get("productId", "")
        fecha = sale.get("fecha", "")
        qty = float(sale.get("cantidad", 0))
        if pid and fecha and qty > 0:
            result[pid][fecha] += qty

    # Sales from completed orders
    for order in completed_orders:
        raw_date = order.get("creadoEn")
        fecha = _iso_date(raw_date)
        if not fecha:
            continue
        for item in order.get("items", []):
            product = item.get("product", {})
            pid = product.get("id", "")
            qty = float(item.get("quantity", 0))
            if pid and qty > 0:
                result[pid][fecha] += qty

    return {k: dict(v) for k, v in result.items()}


# ─── Prediction ──────────────────────────────────────────────────────────────

def predict_demand(
    daily_sales: list[dict],
    completed_orders: list[dict],
    products: list[dict],
    horizon_days: int = 30,
    history_days: int = 90,
) -> list[dict]:
    """
    Predicts demand for each product for the next `horizon_days`.

    Returns a list of prediction objects sorted by predicted_units desc.
    """
    today = date.today()
    history_start = today - timedelta(days=history_days)

    # Build complete date range for history
    date_range = [
        (history_start + timedelta(days=i)).isoformat()
        for i in range(history_days)
    ]

    sales_map = build_daily_sales_by_product(daily_sales, completed_orders)
    product_map = {p["id"]: p for p in products}

    # Fallback names/prices from daily sales when product not in product_map
    sale_meta: dict[str, dict] = {}
    for sale in daily_sales:
        pid = sale.get("productId", "")
        if pid and pid not in sale_meta:
            sale_meta[pid] = {
                "nombre": sale.get("nombre", pid),
                "categoria": sale.get("categoria", ""),
                "precio": float(sale.get("precioVenta", 0)),
            }

    # Fallback names from order items
    for order in completed_orders:
        for item in order.get("items", []):
            p = item.get("product", {})
            pid = p.get("id", "")
            if pid and pid not in sale_meta:
                sale_meta[pid] = {
                    "nombre": p.get("nombre", pid),
                    "categoria": p.get("categoria", ""),
                    "precio": float(p.get("precio", 0)),
                }

    predictions = []

    for pid, day_sales in sales_map.items():
        # Daily series aligned to date_range
        series = [day_sales.get(d, 0.0) for d in date_range]

        # Only use recent non-zero window
        non_zero = [v for v in series if v > 0]
        if not non_zero:
            continue

        # Linear regression over last history_days
        x = list(range(len(series)))
        slope, intercept = _linear_regression(x, series)

        # Weighted moving average baseline
        wma = _moving_average(series, window=14)

        # Predicted total for next horizon_days
        future_x_start = len(series)
        lr_preds = [
            max(0.0, slope * (future_x_start + i) + intercept)
            for i in range(horizon_days)
        ]
        lr_total = sum(lr_preds)

        # Blend: 60% linear regression + 40% moving average * horizon
        blended = 0.6 * lr_total + 0.4 * (wma * horizon_days)
        predicted_units = max(0.0, round(blended, 1))

        # Daily average prediction
        daily_avg = predicted_units / horizon_days if horizon_days > 0 else 0

        # Per-week projection
        weekly = round(daily_avg * 7, 1)

        # Historical stats
        total_sold = sum(non_zero)
        avg_daily_hist = total_sold / history_days

        # Stock info — prefer products collection, fallback to sale metadata
        product = product_map.get(pid, {})
        meta = sale_meta.get(pid, {})
        stock = int(product.get("stock", 0))
        # Use explicit None checks so a real value of 0 or "" is not skipped
        nombre = product.get("nombre") if product.get("nombre") else meta.get("nombre", pid)
        categoria = product.get("categoria") if product.get("categoria") else meta.get("categoria", "")
        _raw_precio = product.get("precio")
        precio = float(_raw_precio) if _raw_precio is not None else float(meta.get("precio", 0.0))

        # Days until stockout
        # - stock=0 and demand>0  → already out of stock (0 days)
        # - stock=0 and demand=0  → no stock, no demand → not applicable (999)
        # - stock>0 and demand=0  → stock exists but no predicted demand → 999 (no risk)
        # - stock>0 and demand>0  → normal calculation
        if stock == 0 and daily_avg > 0:
            days_until_stockout = 0
        elif daily_avg > 0:
            days_until_stockout = round(stock / daily_avg)
        else:
            days_until_stockout = 999

        # Confidence: higher when more historical data
        data_points = len(non_zero)
        confidence = min(100, round(40 + (data_points / history_days) * 60))

        # Trend direction
        if slope > 0.02:
            trend = "subiendo"
        elif slope < -0.02:
            trend = "bajando"
        else:
            trend = "estable"

        predictions.append({
            "productId": pid,
            "nombre": nombre,
            "categoria": categoria,
            "precio": precio,
            "stock_actual": stock,
            "prediccion_unidades": predicted_units,
            "prediccion_diaria": round(daily_avg, 2),
            "prediccion_semanal": weekly,
            "total_vendido_historico": round(total_sold, 1),
            "promedio_diario_historico": round(avg_daily_hist, 2),
            "dias_hasta_agotarse": min(days_until_stockout, 999),
            "tendencia": trend,
            "confianza": confidence,
            "alerta_stock": days_until_stockout < horizon_days and stock > 0,
        })

    # Sort by predicted demand descending
    predictions.sort(key=lambda p: p["prediccion_unidades"], reverse=True)
    return predictions


def get_stock_alerts(predictions: list[dict], days_threshold: int = 14) -> list[dict]:
    """Returns products predicted to run out within days_threshold."""
    alerts = [
        p for p in predictions
        if p["alerta_stock"] and p["dias_hasta_agotarse"] <= days_threshold
    ]
    alerts.sort(key=lambda p: p["dias_hasta_agotarse"])
    return alerts


def get_weekly_chart(
    daily_sales: list[dict],
    completed_orders: list[dict],
    weeks: int = 8,
) -> list[dict]:
    """Returns total sales per week for the last `weeks` weeks."""
    today = date.today()
    sales_map = build_daily_sales_by_product(daily_sales, completed_orders)

    # Flatten to date → total units
    date_totals: dict[str, float] = defaultdict(float)
    for pid, day_sales in sales_map.items():
        for d, qty in day_sales.items():
            date_totals[d] += qty

    chart = []
    for w in range(weeks - 1, -1, -1):
        week_start = today - timedelta(days=(w + 1) * 7 - 1)
        week_end = today - timedelta(days=w * 7)
        week_dates = [
            (week_start + timedelta(days=i)).isoformat()
            for i in range(7)
        ]
        total = sum(date_totals.get(d, 0.0) for d in week_dates)
        label = f"Sem {week_start.strftime('%d/%m')}"
        chart.append({"semana": label, "unidades": round(total, 1)})

    return chart
