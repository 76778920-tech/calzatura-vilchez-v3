"""Product-level demand prediction orchestration."""

from datetime import date, timedelta

from models.demand.constants import MIN_PRODUCTS_FOR_RELIABLE_PREDICTIONS, MIN_TRAIN_ROWS
from models.demand.features_ml import (
    _SalesHistoryPredictionInput,
    _apply_demand_risk_flags,
    _build_movements_by_product,
    _init_sale_meta_from_sources,
    _prediction_row_no_sales_history,
    _prediction_row_with_sales_history,
    _train_global_model,
)
from models.demand.helpers import _safe_float
from models.demand.sales import build_daily_sales_by_product
from models.safe_limits import (
    MAX_HISTORY_DAYS_FOR_LOOPS,
    MAX_HORIZON_DAYS_FOR_LOOPS,
    sanitize_int_for_range,
)

def predict_demand(
    daily_sales: list[dict],
    completed_orders: list[dict],
    products: list[dict],
    product_codes: dict[str, str] | None = None,
    horizon_days: int = 30,
    history_days: int = 90,
    stock_movements: list[dict] | None = None,
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
    movements_by_product = _build_movements_by_product(stock_movements or [])

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
                movements_by_product=movements_by_product,
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
        predictions.append(_prediction_row_no_sales_history(pid, product, codes_map, movements_by_product))

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
    training_meta = {
        **training_meta,
        **training_data_quality_meta(training_meta),
    }
    return predictions, training_meta


def training_data_quality_meta(training_meta: dict) -> dict:
    """
    Metadatos para API/UI: indica si hay historial suficiente para confiar
    en predicciones ML (misma lÃ³gica que _train_global_model).
    """
    n_samples = int(training_meta.get("n_samples") or 0)
    n_products = int(training_meta.get("n_products") or 0)
    model_type = str(training_meta.get("model_type") or "")
    ml_active = model_type == "random_forest"

    reasons: list[str] = []
    if n_samples < MIN_TRAIN_ROWS:
        reasons.append(
            f"Muestras de entrenamiento ({n_samples}) por debajo del mÃ­nimo ({MIN_TRAIN_ROWS})."
        )
    if not ml_active:
        reasons.append(
            "No se entrenÃ³ Random Forest; las predicciones usan promedio mÃ³vil (menos fiables)."
        )
    if n_products < MIN_PRODUCTS_FOR_RELIABLE_PREDICTIONS:
        reasons.append(
            f"Pocos productos con ventas en el historial ({n_products} "
            f"< {MIN_PRODUCTS_FOR_RELIABLE_PREDICTIONS})."
        )

    data_sufficient = (
        ml_active
        and n_samples >= MIN_TRAIN_ROWS
        and n_products >= MIN_PRODUCTS_FOR_RELIABLE_PREDICTIONS
    )
    return {
        "data_sufficient": data_sufficient,
        "ml_active": ml_active,
        "min_train_rows": MIN_TRAIN_ROWS,
        "min_products_reliable": MIN_PRODUCTS_FOR_RELIABLE_PREDICTIONS,
        "insufficient_reason": " ".join(reasons),
    }


# ---------------------------------------------------------------------------
# Auxiliary endpoints
# ---------------------------------------------------------------------------

