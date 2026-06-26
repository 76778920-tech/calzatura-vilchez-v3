"""Feature engineering, ML training, and per-product prediction rows."""

import math
from collections import defaultdict
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Any

import numpy as np
import pandas as pd
import sklearn
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder

from models.demand.constants import FEATURE_COLS, MIN_TRAIN_ROWS, SEASONAL_FEATURES
from models.safe_limits import (
    MAX_HISTORY_DAYS_FOR_LOOPS,
    MAX_HORIZON_DAYS_FOR_LOOPS,
    sanitize_int_for_range,
)
from models.demand.helpers import (
    _data_hash,
    _drift_score,
    _iso_date,
    _normalize_campaign,
    _percentile,
    _safe_float,
    _season_flags,
    _stockout_date,
)

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
        "weekday": current_date.weekday(),       # 0=Mon â€¦ 6=Sun
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
        n_estimators=20,
        max_depth=6,
        min_samples_leaf=3,
        max_features=1.0,
        random_state=42,
        n_jobs=1,
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
    if days_until_stockout <= 30:
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
    movements_by_product: dict[str, list[dict]] | None = None,
) -> dict:
    inventory = _inventory_enrichment(pid, product, movements_by_product or {}, total_sold=0.0)
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
        "talla_stock":            inventory["talla_stock"],
        "talla_residual":         inventory["talla_residual"],
        "stock_inicial_estimado": inventory["stock_inicial_estimado"],
        "sell_through_pct":       inventory["sell_through_pct"],
        "dias_en_catalogo":       inventory["dias_en_catalogo"],
    }


# Tallas de mayor rotaciÃ³n por categorÃ­a para detectar stock residual.
# Si solo quedan tallas fuera de este rango, el producto estÃ¡ estancado por surtido,
# no por falta de demanda.
_POPULAR_SIZES: dict[str, set[str]] = {
    "hombre":  {"39", "40", "41", "42"},
    "dama":    {"35", "36", "37", "38", "39"},
    "juvenil": {"34", "35", "36", "37", "38"},
    "nino":    {"27", "28", "29", "30", "31", "32"},
    "bebe":    {"18", "19", "20", "21"},
}


def _build_movements_by_product(stock_movements: list[dict]) -> dict[str, list[dict]]:
    result: dict[str, list[dict]] = {}
    for m in stock_movements or []:
        pid = m.get("productId") or m.get("product_id", "")
        if not pid:
            continue
        result.setdefault(pid, []).append(m)
    return result


def _sell_through_metrics(
    pid: str,
    total_sold: float,
    movements_by_product: dict[str, list[dict]],
) -> dict:
    movements = movements_by_product.get(pid, [])
    if not movements:
        return {}
    stock_inicial = sum(int(m.get("cantidad") or 0) for m in movements)
    if stock_inicial <= 0:
        return {}
    sell_through_pct = round(min(total_sold / stock_inicial * 100, 100), 1)
    fechas = [m.get("fecha", "") for m in movements if m.get("fecha")]
    if fechas:
        first_date = min(fechas)
        try:
            dias_en_catalogo = (date.today() - date.fromisoformat(first_date)).days
        except ValueError:
            dias_en_catalogo = None
    else:
        dias_en_catalogo = None
    return {
        "stock_inicial_estimado": stock_inicial,
        "sell_through_pct":       sell_through_pct,
        "dias_en_catalogo":       dias_en_catalogo,
    }


def _inventory_enrichment(
    pid: str,
    product: dict,
    movements_by_product: dict[str, list[dict]],
    total_sold: float,
) -> dict:
    """Calcula mÃ©tricas de inventario: sell-through, talla residual y stock por talla."""
    talla_stock = {k: v for k, v in (product.get("tallaStock") or {}).items() if (v or 0) > 0}
    sell_through = _sell_through_metrics(pid, total_sold, movements_by_product)
    categoria = product.get("categoria", "")
    talla_residual = _detect_talla_residual(categoria, talla_stock) if talla_stock else False
    return {
        "talla_stock":            talla_stock,
        "talla_residual":         talla_residual,
        "stock_inicial_estimado": sell_through.get("stock_inicial_estimado"),
        "sell_through_pct":       sell_through.get("sell_through_pct"),
        "dias_en_catalogo":       sell_through.get("dias_en_catalogo"),
    }


def _detect_talla_residual(categoria: str, talla_stock: dict) -> bool:
    """True si solo quedan tallas de baja rotaciÃ³n (extremos del rango para esa categorÃ­a)."""
    if not talla_stock:
        return False
    sizes_with_stock = {k for k, v in talla_stock.items() if (v or 0) > 0}
    if not sizes_with_stock:
        return False
    popular = _POPULAR_SIZES.get(categoria.lower(), set())
    if not popular:
        return False
    return sizes_with_stock.isdisjoint(popular)


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
    movements_by_product: dict[str, list[dict]]


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
    movements_by_product = inp.movements_by_product

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

    inventory = _inventory_enrichment(pid, product, movements_by_product, total_sold)

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
        "talla_stock":            inventory["talla_stock"],
        "talla_residual":         inventory["talla_residual"],
        "stock_inicial_estimado": inventory["stock_inicial_estimado"],
        "sell_through_pct":       inventory["sell_through_pct"],
        "dias_en_catalogo":       inventory["dias_en_catalogo"],
    }


