"""Campaign helpers."""

from collections import defaultdict
from datetime import date, timedelta

import numpy as np

# ── Helpers ──────────────────────────────────────────────────────────────────

def _safe_float(v) -> float:
    try:
        return float(v or 0)
    except (TypeError, ValueError):
        return 0.0


def _norm_date(raw) -> str:
    """Normalizes any date representation to YYYY-MM-DD (truncates timestamps)."""
    return str(raw or "")[:10]


def _date_range(start: date, end: date) -> list[str]:
    """ISO date list from start to end inclusive.
    len(_date_range(d, d + timedelta(days=N-1))) == N exactly."""
    out, cur = [], start
    while cur <= end:
        out.append(cur.isoformat())
        cur += timedelta(days=1)
    return out


def _fill_zeros(raw: dict[str, float], dates: list[str]) -> list[float]:
    return [raw.get(d, 0.0) for d in dates]


def _stats(values: list[float]) -> dict:
    if not values:
        return {"mean": 0, "median": 0, "std": 0, "p75": 0, "p90": 0, "n": 0}
    arr = np.array(values, dtype=float)
    return {
        "mean":   round(float(np.mean(arr)), 2),
        "median": round(float(np.median(arr)), 2),
        "std":    round(float(np.std(arr)), 2),
        "p75":    round(float(np.percentile(arr, 75)), 2),
        "p90":    round(float(np.percentile(arr, 90)), 2),
        "n":      len(values),
    }


def _consecutive_elevated_days(
    raw: dict[str, float],
    dates_recent: list[str],
    threshold: float,
) -> int:
    count = 0
    for d in reversed(dates_recent):
        if raw.get(d, 0.0) > threshold:
            count += 1
        else:
            break
    return count


def _consecutive_normal_days(
    raw: dict[str, float],
    dates_recent: list[str],
    threshold: float,
) -> int:
    count = 0
    for d in reversed(dates_recent):
        if raw.get(d, 0.0) <= threshold:
            count += 1
        else:
            break
    return count


def _aggregate_sales_for_campaign(
    daily_sales: list[dict],
    product_category: dict[str, str],
) -> tuple[
    dict[str, float],
    dict[str, float],
    dict[str, dict[str, float]],
    dict[str, dict[str, float]],
    dict[str, dict[str, float]],
    dict[str, dict[str, float]],
    dict[str, dict],
]:
    """Acumula ventas por dimensión para la detección de campaña."""
    raw_global: dict[str, float] = defaultdict(float)
    raw_global_soles: dict[str, float] = defaultdict(float)
    raw_by_cat: dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))
    raw_by_cat_soles: dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))
    raw_by_product: dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))
    raw_by_prod_soles: dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))
    product_meta: dict[str, dict] = {}

    for sale in daily_sales:
        if sale.get("devuelto"):
            continue
        fecha = _norm_date(sale.get("fecha", ""))
        qty = _safe_float(sale.get("cantidad", 0))
        precio = _safe_float(sale.get("precioVenta", 0))
        pid = str(sale.get("productId", ""))
        nombre = str(sale.get("nombre", ""))
        if not fecha or qty <= 0:
            continue
        soles = qty * precio
        raw_global[fecha] += qty
        raw_global_soles[fecha] += soles
        cat = product_category.get(pid, "sin_categoria")
        raw_by_cat[cat][fecha] += qty
        raw_by_cat_soles[cat][fecha] += soles
        raw_by_product[pid][fecha] += qty
        raw_by_prod_soles[pid][fecha] += soles
        if pid not in product_meta:
            product_meta[pid] = {"nombre": nombre, "categoria": cat}

    return (
        raw_global,
        raw_global_soles,
        raw_by_cat,
        raw_by_cat_soles,
        raw_by_product,
        raw_by_prod_soles,
        product_meta,
    )


