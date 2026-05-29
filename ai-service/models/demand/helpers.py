"""Demand helpers."""

import hashlib
import math
from datetime import date, timedelta


def _stockout_date(days_until: int) -> str | None:
    if days_until >= 999:
        return None
    return (date.today() + timedelta(days=days_until)).isoformat()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

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


def _normalize_campaign(value) -> str:
    """Normalize campaign names so model encoding is stable across sources."""
    if not isinstance(value, str):
        return ""
    return value.strip().lower()


def _season_flags(current_date: date) -> dict[str, int]:
    """
    Footwear-specific seasonality flags used by the demand model.
    They represent expected commercial peaks: summer, back-to-school,
    Peru's Fiestas Patrias, and Christmas / year-end.
    """
    month = current_date.month
    return {
        "temporada_verano": 1 if month in {12, 1, 2, 3} else 0,
        "temporada_escolar": 1 if month in {2, 3} else 0,
        "temporada_fiestas_patrias": 1 if month == 7 else 0,
        "temporada_navidad": 1 if month in {11, 12} else 0,
    }


# ---------------------------------------------------------------------------
# Reproducibility helpers
# ---------------------------------------------------------------------------

def _data_hash(sales_map: dict, sale_meta: dict | None = None) -> str:
    """Stable fingerprint of the training dataset and commercial context."""
    sale_meta = sale_meta or {}
    key = "|".join(
        f"{pid}:"
        f"{sum(day_sales.values()):.1f}:"
        f"{sale_meta.get(pid, {}).get('categoria') or ''}:"
        f"{_normalize_campaign(sale_meta.get(pid, {}).get('campana'))}"
        for pid, day_sales in sorted(sales_map.items())
    )
    return hashlib.sha256(key.encode()).hexdigest()[:16]


def _drift_score(lag_7: float, lag_30: float, feature_stats: dict) -> float:
    """
    Z-score-based drift: how far current lag features are from the training
    distribution. Returns 0.0 (no drift) … 1.0 (high drift, z ≥ 3).
    """
    if not feature_stats:
        return 0.0
    scores = []
    for feat, val in [("lag_7", lag_7), ("lag_30", lag_30)]:
        stats = feature_stats.get(feat, {})
        std = stats.get("std", 1.0) or 1.0
        z = abs(val - stats.get("mean", 0.0)) / std
        scores.append(min(z / 3.0, 1.0))
    return round(sum(scores) / len(scores), 2) if scores else 0.0


# ---------------------------------------------------------------------------
