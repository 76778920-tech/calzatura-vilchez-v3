"""
Demand prediction model.
Uses a RandomForestRegressor (scikit-learn) trained on all products' aggregated
historical daily sales. Features: weekday, month, day-of-month, 7-day lag
average, 30-day lag average, category, campaign (label-encoded), and
seasonal flags for footwear sales peaks.

Falls back to weighted moving average (70 % last-7d + 30 % last-30d) only when
there are fewer than MIN_TRAIN_ROWS training samples across all products.
"""
from collections import defaultdict
from dataclasses import dataclass
from datetime import date, timedelta
import hashlib
import math
from typing import Any

def _stockout_date(days_until: int) -> str | None:
    if days_until >= 999:
        return None
    return (date.today() + timedelta(days=days_until)).isoformat()

import numpy as np
import pandas as pd
import sklearn
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder

from models.safe_limits import (
    MAX_HISTORY_DAYS_FOR_LOOPS,
    MAX_HORIZON_DAYS_FOR_LOOPS,
    MAX_WEEKS_FOR_CHART,
    sanitize_int_for_range,
)

# Minimum training rows (product × day pairs) to use the ML model.
MIN_TRAIN_ROWS = 30
SEASONAL_FEATURES = [
    "temporada_verano",
    "temporada_escolar",
    "temporada_fiestas_patrias",
    "temporada_navidad",
]
FEATURE_COLS = [
    "weekday",
    "month",
    "day_of_month",
    "lag_7",
    "lag_30",
    "categoria",
    "campana",
    *SEASONAL_FEATURES,
]


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
        f"{sum(v for v in day_sales.values()):.1f}:"
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
# Sales aggregation
# ---------------------------------------------------------------------------

def build_daily_sales_by_product(
    daily_sales: list[dict],
    completed_orders: list[dict],
) -> dict[str, dict[str, float]]:
    """Returns {productId: {"YYYY-MM-DD": units_sold}} from all sales sources."""
    result: dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))

    for sale in daily_sales:
        # canal='web' ya está en pedidos → excluir para evitar doble conteo de unidades
        if sale.get("canal") == "web":
            continue
        pid = sale.get("productId", "")
        fecha = sale.get("fecha", "")
        qty = _safe_float(sale.get("cantidad", 0))
        if pid and fecha and qty > 0 and not sale.get("devuelto", False):
            result[pid][fecha] += qty

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


# ---------------------------------------------------------------------------
# Feature engineering
# ---------------------------------------------------------------------------

def _lag_features(current_date: date, day_sales: dict, cat_enc: int, campaign_enc: int = 0) -> dict:
    """Compute temporal and lag features for a single date."""
    lag_7 = sum(
        day_sales.get((current_date - timedelta(days=d)).isoformat(), 0.0)
        for d in range(1, 8)
    ) / 7.0
    lag_30 = sum(
        day_sales.get((current_date - timedelta(days=d)).isoformat(), 0.0)
        for d in range(1, 31)
    ) / 30.0
    return {
        "weekday": current_date.weekday(),       # 0=Mon … 6=Sun
        "month": current_date.month,
        "day_of_month": current_date.day,
        "lag_7": lag_7,                          # mean daily units last 7 days
        "lag_30": lag_30,                        # mean daily units last 30 days
        "categoria": cat_enc,
        "campana": campaign_enc,
        **_season_flags(current_date),
    }


# ---------------------------------------------------------------------------
# Model training
# ---------------------------------------------------------------------------

def _train_global_model(
    sales_map: dict[str, dict[str, float]],
    sale_meta: dict[str, dict],
    history_days: int,
) -> tuple:
    """
    Train a RandomForestRegressor on the combined historical data of all
    products. Returns (model, category_encoder, campaign_encoder, used_ml, training_meta).
    used_ml=False when data is insufficient; model is None in that case.
    training_meta always contains reproducibility and explainability fields.
    """
    history_days = sanitize_int_for_range(
        history_days, default=90, min_v=1, max_v=MAX_HISTORY_DAYS_FOR_LOOPS
    )
    today = date.today()
    date_range_start = (today - timedelta(days=history_days - 1)).isoformat()
    date_range_end = today.isoformat()
    data_hash = _data_hash(sales_map, sale_meta)

    categories = list({(sale_meta.get(pid, {}).get("categoria") or "") for pid in sales_map})
    le = LabelEncoder()
    le.fit(categories + [""])

    campaigns = list({
        _normalize_campaign(sale_meta.get(pid, {}).get("campana"))
        for pid in sales_map
    })
    campaign_le = LabelEncoder()
    campaign_le.fit(campaigns + [""])

    rows = []
    for pid, day_sales in sales_map.items():
        cat_raw = sale_meta.get(pid, {}).get("categoria") or ""
        try:
            cat_enc = int(le.transform([cat_raw])[0])
        except ValueError:
            cat_enc = 0
        campaign_raw = _normalize_campaign(sale_meta.get(pid, {}).get("campana"))
        try:
            campaign_enc = int(campaign_le.transform([campaign_raw])[0])
        except ValueError:
            campaign_enc = 0

        for i in range(history_days):
            current_date = today - timedelta(days=history_days - 1 - i)
            fecha = current_date.isoformat()
            feat = _lag_features(current_date, day_sales, cat_enc, campaign_enc)
            feat["y"] = day_sales.get(fecha, 0.0)
            rows.append(feat)

    base_meta = {
        "n_samples": len(rows),
        "n_products": len(sales_map),
        "date_range_start": date_range_start,
        "date_range_end": date_range_end,
        "random_state": 42,
        "sklearn_version": sklearn.__version__,
        "feature_cols": FEATURE_COLS,
        "seasonality_features": SEASONAL_FEATURES,
        "campaign_values": sorted(v for v in campaigns if v),
        "data_hash": data_hash,
    }

    if len(rows) < MIN_TRAIN_ROWS:
        return None, le, campaign_le, False, {
            **base_meta,
            "model_type": "promedio_movil",
            "feature_importances": [],
            "feature_stats": {},
        }

    df = pd.DataFrame(rows)
    X = df[FEATURE_COLS].values.astype(float)
    y = df["y"].values.astype(float)

    model = RandomForestRegressor(
        n_estimators=50,
        max_depth=8,
        min_samples_leaf=3,
        max_features=1.0,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X, y)

    # Explainability: feature importances sorted descending
    importances = sorted(
        [
            {"feature": feat, "importance": round(float(imp), 4)}
            for feat, imp in zip(FEATURE_COLS, model.feature_importances_)
        ],
        key=lambda x: x["importance"],
        reverse=True,
    )

    # Drift baseline: mean/std of lag features across training set
    feature_stats = {
        col: {
            "mean": round(float(df[col].mean()), 4),
            "std": round(float(df[col].std() or 1.0), 4),
        }
        for col in ["lag_7", "lag_30"]
    }

    return model, le, campaign_le, True, {
        **base_meta,
        "model_type": "random_forest",
        "max_features": 1.0,
        "feature_importances": importances,
        "feature_stats": feature_stats,
    }


# ---------------------------------------------------------------------------
# Prediction helpers
# ---------------------------------------------------------------------------

def _ml_predict_horizon(
    model: RandomForestRegressor,
    le: LabelEncoder,
    campaign_le: LabelEncoder,
    day_sales: dict[str, float],
    cat_raw: str,
    campaign_raw: str,
    horizon_days: int,
) -> tuple[float, float]:
    """
    Use the trained model to predict daily demand for the next horizon_days.
    Returns (estimated_daily_avg, total_predicted_units).
    """
    horizon_days = sanitize_int_for_range(
        horizon_days, default=30, min_v=1, max_v=MAX_HORIZON_DAYS_FOR_LOOPS
    )
    today = date.today()
    try:
        cat_enc = int(le.transform([cat_raw or ""])[0])
    except ValueError:
        cat_enc = 0
    try:
        campaign_enc = int(campaign_le.transform([_normalize_campaign(campaign_raw)])[0])
    except ValueError:
        campaign_enc = 0

    preds = []
    for step in range(1, horizon_days + 1):
        future_date = today + timedelta(days=step)
        feat = _lag_features(future_date, day_sales, cat_enc, campaign_enc)
        X = np.array([[feat[c] for c in FEATURE_COLS]], dtype=float)
        pred = max(0.0, float(model.predict(X)[0]))
        preds.append(pred)

    total = round(sum(preds), 1)
    avg_daily = round(total / horizon_days, 2) if horizon_days else 0.0
    return avg_daily, total


def _heuristic_predict(
    series: list[float],
    window_7: int,
    window_30: int,
    horizon_days: int,
) -> tuple[float, float]:
    """Weighted moving average fallback: 70 % last-7d + 30 % last-30d."""
    window_7 = sanitize_int_for_range(window_7, default=7, min_v=1, max_v=90)
    window_30 = sanitize_int_for_range(window_30, default=30, min_v=1, max_v=MAX_HISTORY_DAYS_FOR_LOOPS)
    horizon_days = sanitize_int_for_range(
        horizon_days, default=30, min_v=1, max_v=MAX_HORIZON_DAYS_FOR_LOOPS
    )
    avg_7 = sum(series[-window_7:]) / window_7 if window_7 else 0.0
    avg_30 = sum(series[-window_30:]) / window_30 if window_30 else 0.0
    estimated_daily = round((avg_7 * 0.7) + (avg_30 * 0.3), 2)
    predicted_units = round(estimated_daily * horizon_days, 1)
    return estimated_daily, predicted_units


# ---------------------------------------------------------------------------
# Main prediction entry point
# ---------------------------------------------------------------------------


def _merge_daily_sales_into_sale_meta(
    daily_sales: list[dict], sale_meta: dict[str, dict]
) -> None:
    for sale in daily_sales:
        pid = sale.get("productId", "")
        if pid and pid not in sale_meta:
            sale_meta[pid] = {
                "nombre": sale.get("nombre", pid),
                "categoria": sale.get("categoria", ""),
                "precio": _safe_float(sale.get("precioVenta", 0)),
                "codigo": sale.get("codigo", ""),
                "campana": _normalize_campaign(sale.get("campana", "")),
            }


def _merge_order_items_into_sale_meta(
    completed_orders: list[dict], sale_meta: dict[str, dict]
) -> None:
    for order in completed_orders:
        for item in order.get("items", []):
            product = item.get("product", {})
            pid = product.get("id", "")
            if pid and pid not in sale_meta:
                sale_meta[pid] = {
                    "nombre": product.get("nombre", pid),
                    "categoria": product.get("categoria", ""),
                    "precio": _safe_float(product.get("precio", 0)),
                    "campana": _normalize_campaign(product.get("campana", "")),
                }


def _merge_product_map_defaults(product_map: dict[str, dict], sale_meta: dict[str, dict]) -> None:
    for pid, product in product_map.items():
        product_meta = sale_meta.setdefault(pid, {})
        product_meta.setdefault("nombre", product.get("nombre", pid))
        product_meta.setdefault("categoria", product.get("categoria", ""))
        product_meta.setdefault("precio", _safe_float(product.get("precio", 0)))
        product_meta["campana"] = _normalize_campaign(
            product.get("campana", product_meta.get("campana", ""))
        )


def _init_sale_meta_from_sources(
    daily_sales: list[dict],
    completed_orders: list[dict],
    product_map: dict[str, dict],
) -> dict[str, dict]:
    """Construye metadatos comerciales por productId a partir de ventas y pedidos."""
    sale_meta: dict[str, dict] = {}
    _merge_daily_sales_into_sale_meta(daily_sales, sale_meta)
    _merge_order_items_into_sale_meta(completed_orders, sale_meta)
    _merge_product_map_defaults(product_map, sale_meta)
    return sale_meta


def _high_demand_for_product(
    prediction: dict, high_demand_threshold: float
) -> bool:
    daily_demand = prediction["consumo_estimado_diario"]
    if daily_demand <= 0:
        return False
    recent_acceleration = (
        prediction["consumo_diario_7"] > 0
        and (
            prediction["consumo_diario_30"] == 0
            or prediction["consumo_diario_7"] >= prediction["consumo_diario_30"] * 1.2
        )
    )
    sustained_rotation = prediction["ventas_30_dias"] >= 6
    return bool(
        (high_demand_threshold > 0 and daily_demand >= high_demand_threshold)
        or (recent_acceleration and sustained_rotation)
        or prediction["ventas_7_dias"] >= 5
    )


def _risk_level_for_stockout(stock: int, daily_demand: float, days_until_stockout: int) -> str:
    if daily_demand <= 0:
        return "estable"
    if stock == 0 or days_until_stockout <= 7:
        return "critico"
    if days_until_stockout <= 14:
        return "atencion"
    if days_until_stockout <= 21:
        return "vigilancia"
    return "estable"


def _apply_demand_risk_flags(
    recent_predictions: list[dict], horizon_days: int
) -> list[dict]:
    """Clasifica riesgo de stock / demanda sobre predicciones recientes."""
    demand_values = [
        p["consumo_estimado_diario"]
        for p in recent_predictions
        if p["consumo_estimado_diario"] > 0
    ]
    high_demand_threshold = _percentile(demand_values, 0.8)

    predictions: list[dict] = []
    for prediction in recent_predictions:
        stock = prediction["stock_actual"]
        daily_demand = prediction["consumo_estimado_diario"]
        days_until_stockout = prediction["dias_hasta_agotarse"]

        high_demand = _high_demand_for_product(prediction, high_demand_threshold)
        risk_level = _risk_level_for_stockout(stock, daily_demand, days_until_stockout)

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
    return predictions


def _days_until_stockout_for_demand(stock: int, estimated_daily: float) -> int:
    if stock == 0 and estimated_daily > 0:
        return 0
    if estimated_daily > 0:
        return math.ceil(stock / estimated_daily)
    return 999


def _demand_trend_from_averages(avg_7: float, avg_30: float) -> str:
    if avg_7 > 0 and (avg_30 == 0 or avg_7 >= avg_30 * 1.2):
        return "subiendo"
    if avg_30 > 0 and avg_7 <= avg_30 * 0.85:
        return "bajando"
    return "estable"


def _demand_confidence_score(used_ml: bool, active_days: int, total_sold: float) -> int:
    base_conf = 60 if used_ml else 35
    return min(
        100,
        round(
            base_conf
            + (min(active_days, 30) / 30) * 25
            + (min(total_sold, 60) / 60) * 15
        ),
    )


def _prediction_row_no_sales_history(
    pid: str,
    product: dict,
    codes_map: dict[str, str],
) -> dict:
    return {
        "productId": pid,
        "imagen": product.get("imagen") or "",
        "codigo": codes_map.get(pid, ""),
        "nombre": product.get("nombre", pid),
        "categoria": product.get("categoria", ""),
        "campana": _normalize_campaign(product.get("campana", "")),
        "precio": _safe_float(product.get("precio", 0)),
        "stock_actual": int(product.get("stock", 0)),
        "prediccion_unidades": 0,
        "prediccion_diaria": 0,
        "prediccion_semanal": 0,
        "total_vendido_historico": 0,
        "promedio_diario_historico": 0,
        "ventas_7_dias": 0,
        "ventas_15_dias": 0,
        "ventas_30_dias": 0,
        "consumo_diario_7": 0,
        "consumo_diario_30": 0,
        "consumo_estimado_diario": 0,
        "dias_hasta_agotarse": 999,
        "fecha_quiebre_stock": None,
        "tendencia": "estable",
        "confianza": 0,
        "modelo": "sin_datos",
        "alta_demanda": False,
        "riesgo_agotamiento": False,
        "nivel_riesgo": "sin_historial",
        "alerta_stock": False,
        "sin_historial": True,
    }


@dataclass(slots=True)
class _SalesHistoryPredictionInput:
    """Grouped arguments for demand row construction (keeps arity low for maintainability)."""

    pid: str
    day_sales: dict
    date_range: list[str]
    history_days: int
    horizon_days: int
    window_7: int
    window_15: int
    window_30: int
    used_ml: bool
    ml_model: Any
    label_enc: Any
    campaign_enc: Any
    product: dict
    meta: dict
    codes_map: dict[str, str]
    feature_stats: dict


def _prediction_row_with_sales_history(inp: _SalesHistoryPredictionInput) -> dict | None:
    pid = inp.pid
    day_sales = inp.day_sales
    date_range = inp.date_range
    history_days = inp.history_days
    horizon_days = inp.horizon_days
    window_7 = inp.window_7
    window_15 = inp.window_15
    window_30 = inp.window_30
    used_ml = inp.used_ml
    ml_model = inp.ml_model
    label_enc = inp.label_enc
    campaign_enc = inp.campaign_enc
    product = inp.product
    meta = inp.meta
    codes_map = inp.codes_map
    feature_stats = inp.feature_stats

    series = [day_sales.get(d, 0.0) for d in date_range]
    total_sold = sum(series)
    if total_sold <= 0:
        return None

    cat_raw = product.get("categoria") or meta.get("categoria") or ""
    campaign_raw = _normalize_campaign(product.get("campana", meta.get("campana", "")))

    if used_ml:
        estimated_daily, predicted_units = _ml_predict_horizon(
            ml_model, label_enc, campaign_enc, day_sales, cat_raw, campaign_raw, horizon_days
        )
    else:
        estimated_daily, predicted_units = _heuristic_predict(
            series, window_7, window_30, horizon_days
        )

    weekly = round(estimated_daily * 7, 1)
    sales_7 = round(sum(series[-window_7:]), 1) if window_7 else 0.0
    sales_15 = round(sum(series[-window_15:]), 1) if window_15 else 0.0
    sales_30 = round(sum(series[-window_30:]), 1) if window_30 else 0.0
    avg_7 = sales_7 / window_7 if window_7 else 0.0
    avg_30 = sales_30 / window_30 if window_30 else 0.0
    avg_daily_hist = total_sold / history_days
    active_days = sum(1 for v in series if v > 0)

    stock = int(product.get("stock", 0))
    nombre = product.get("nombre") or meta.get("nombre", pid)
    categoria = product.get("categoria") or meta.get("categoria", "")
    imagen = product.get("imagen") or ""
    raw_precio = product.get("precio")
    precio = (
        _safe_float(raw_precio)
        if raw_precio is not None
        else _safe_float(meta.get("precio", 0.0))
    )
    codigo = codes_map.get(pid) or meta.get("codigo", "")

    days_until_stockout = _days_until_stockout_for_demand(stock, estimated_daily)
    confidence = _demand_confidence_score(used_ml, active_days, total_sold)
    trend = _demand_trend_from_averages(avg_7, avg_30)
    drift = _drift_score(avg_7, avg_30, feature_stats)

    return {
        "productId": pid,
        "imagen": imagen,
        "codigo": codigo,
        "nombre": nombre,
        "categoria": categoria,
        "campana": campaign_raw,
        "precio": precio,
        "stock_actual": stock,
        "prediccion_unidades": predicted_units,
        "prediccion_diaria": estimated_daily,
        "prediccion_semanal": weekly,
        "total_vendido_historico": round(total_sold, 1),
        "promedio_diario_historico": round(avg_daily_hist, 2),
        "ventas_7_dias": sales_7,
        "ventas_15_dias": sales_15,
        "ventas_30_dias": sales_30,
        "consumo_diario_7": round(avg_7, 2),
        "consumo_diario_30": round(avg_30, 2),
        "consumo_estimado_diario": estimated_daily,
        "dias_hasta_agotarse": min(days_until_stockout, 999),
        "fecha_quiebre_stock": _stockout_date(days_until_stockout),
        "tendencia": trend,
        "confianza": confidence,
        "modelo": "random_forest" if used_ml else "promedio_movil",
        "drift_score": drift,
        "alta_demanda": False,
        "riesgo_agotamiento": False,
        "nivel_riesgo": "estable",
        "alerta_stock": False,
        "sin_historial": False,
    }


def predict_demand(
    daily_sales: list[dict],
    completed_orders: list[dict],
    products: list[dict],
    product_codes: dict[str, str] | None = None,
    horizon_days: int = 30,
    history_days: int = 90,
) -> tuple[list[dict], dict]:
    """
    Predict demand for each product over the next horizon_days.

    Primary model: RandomForestRegressor trained on all products' combined
    historical daily sales (cross-product model). Each product contributes
    (history_days) training rows with temporal and lag features.

    Fallback: weighted moving average when total training data < MIN_TRAIN_ROWS.

    Returns (predictions, training_meta) where training_meta contains
    reproducibility fields (data_hash, random_state, sklearn_version),
    explainability fields (feature_importances), and drift baseline
    (feature_stats) for production monitoring.
    """
    history_days = sanitize_int_for_range(
        history_days, default=90, min_v=1, max_v=MAX_HISTORY_DAYS_FOR_LOOPS
    )
    horizon_days = sanitize_int_for_range(
        horizon_days, default=30, min_v=1, max_v=MAX_HORIZON_DAYS_FOR_LOOPS
    )
    today = date.today()
    history_start = today - timedelta(days=history_days)
    date_range = [
        (history_start + timedelta(days=i)).isoformat()
        for i in range(history_days)
    ]

    sales_map = build_daily_sales_by_product(daily_sales, completed_orders)
    product_map = {p["id"]: p for p in products}
    codes_map: dict[str, str] = product_codes or {}

    sale_meta = _init_sale_meta_from_sources(daily_sales, completed_orders, product_map)

    # Train global ML model once for all products
    ml_model, label_enc, campaign_enc, used_ml, training_meta = _train_global_model(
        sales_map, sale_meta, history_days
    )
    feature_stats = training_meta.get("feature_stats", {})

    window_7 = min(7, history_days)
    window_15 = min(15, history_days)
    window_30 = min(30, history_days)

    recent_predictions = []
    predicted_pids: set[str] = set()

    for pid, day_sales in sales_map.items():
        product = product_map.get(pid, {})
        meta = sale_meta.get(pid, {})
        row = _prediction_row_with_sales_history(
            _SalesHistoryPredictionInput(
                pid=pid,
                day_sales=day_sales,
                date_range=date_range,
                history_days=history_days,
                horizon_days=horizon_days,
                window_7=window_7,
                window_15=window_15,
                window_30=window_30,
                used_ml=used_ml,
                ml_model=ml_model,
                label_enc=label_enc,
                campaign_enc=campaign_enc,
                product=product,
                meta=meta,
                codes_map=codes_map,
                feature_stats=feature_stats,
            )
        )
        if row is None:
            continue
        predicted_pids.add(pid)
        recent_predictions.append(row)

    # ---------------------------------------------------------------------------
    # Risk classification (unchanged)
    # ---------------------------------------------------------------------------
    predictions = _apply_demand_risk_flags(recent_predictions, horizon_days)

    # Products with no sales history
    for pid, product in product_map.items():
        if pid in predicted_pids:
            continue
        predictions.append(_prediction_row_no_sales_history(pid, product, codes_map))

    risk_order = {"critico": 0, "atencion": 1, "vigilancia": 2, "estable": 3, "sin_historial": 4}
    predictions.sort(
        key=lambda item: (
            item["sin_historial"],
            0 if item["riesgo_agotamiento"] else 1,
            risk_order.get(item["nivel_riesgo"], 4),
            -item["consumo_estimado_diario"],
            -item["prediccion_unidades"],
        )
    )
    return predictions, training_meta


# ---------------------------------------------------------------------------
# Auxiliary endpoints
# ---------------------------------------------------------------------------

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
