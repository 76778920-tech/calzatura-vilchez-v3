"""Sales aggregation for demand model."""

from collections import defaultdict

from models.demand.helpers import _iso_date, _safe_float

# Sales aggregation
# ---------------------------------------------------------------------------

def _accumulate_daily_sale_row(
    result: dict[str, dict[str, float]],
    sale: dict,
) -> None:
    # canal='web' ya está en pedidos → excluir para evitar doble conteo de unidades
    if sale.get("canal") == "web":
        return
    pid = sale.get("productId", "")
    fecha = sale.get("fecha", "")
    qty = _safe_float(sale.get("cantidad", 0))
    if pid and fecha and qty > 0 and not sale.get("devuelto", False):
        result[pid][fecha] += qty


def _accumulate_completed_order_row(
    result: dict[str, dict[str, float]],
    order: dict,
) -> None:
    fecha = _iso_date(order.get("pagadoEn") or order.get("creadoEn"))
    if not fecha:
        return
    for item in order.get("items", []):
        product = item.get("product", {})
        pid = product.get("id", "")
        qty = _safe_float(item.get("quantity", 0))
        if pid and qty > 0:
            result[pid][fecha] += qty


def build_daily_sales_by_product(
    daily_sales: list[dict],
    completed_orders: list[dict],
) -> dict[str, dict[str, float]]:
    """Returns {productId: {"YYYY-MM-DD": units_sold}} from all sales sources."""
    result: dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))

    for sale in daily_sales:
        _accumulate_daily_sale_row(result, sale)

    for order in completed_orders:
        _accumulate_completed_order_row(result, order)

    return {k: dict(v) for k, v in result.items()}


# ---------------------------------------------------------------------------
# Feature engineering
# ---------------------------------------------------------------------------

