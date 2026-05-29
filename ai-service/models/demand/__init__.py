"""
Demand prediction model — public API.
"""

from models.demand.constants import (
    FEATURE_COLS,
    MIN_TRAIN_ROWS,
    MIN_PRODUCTS_FOR_RELIABLE_PREDICTIONS,
    SEASONAL_FEATURES,
)
from models.demand.helpers import (
    _safe_float,
    _iso_date,
    _percentile,
    _data_hash,
    _drift_score,
    _normalize_campaign,
    _season_flags,
)
from models.demand.features_ml import _init_sale_meta_from_sources, _lag_features
from models.demand.sales import build_daily_sales_by_product
from models.demand.predict import predict_demand, training_data_quality_meta
from models.demand.reporting import get_stock_alerts, get_weekly_chart

__all__ = [
    "FEATURE_COLS",
    "MIN_TRAIN_ROWS",
    "MIN_PRODUCTS_FOR_RELIABLE_PREDICTIONS",
    "SEASONAL_FEATURES",
    "_safe_float",
    "_iso_date",
    "_percentile",
    "_data_hash",
    "_drift_score",
    "_normalize_campaign",
    "_season_flags",
    "_lag_features",
    "_init_sale_meta_from_sources",
    "build_daily_sales_by_product",
    "predict_demand",
    "training_data_quality_meta",
    "get_stock_alerts",
    "get_weekly_chart",
]
