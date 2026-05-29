"""One-off: split models/demand.py into models/demand/ package."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
src_path = ROOT / "models" / "demand.py"
lines = src_path.read_text(encoding="utf-8").splitlines(keepends=True)
base = ROOT / "models" / "demand"
base.mkdir(exist_ok=True)

# Line ranges from section comments in demand.py
chunks: dict[str, tuple[int, int]] = {
    "constants.py": (0, 57),
    "helpers.py": (57, 148),
    "sales.py": (148, 200),
    "features_ml.py": (200, 812),
    "predict.py": (812, 968),
    "reporting.py": (968, len(lines)),
}

for name, (start, end) in chunks.items():
    body = "".join(lines[start:end])
    if name == "constants.py":
        pass
    elif name == "helpers.py":
        body = (
            '"""Demand helpers."""\n\n'
            + body
        )
    elif name == "sales.py":
        body = (
            '"""Sales aggregation for demand model."""\n\n'
            "from collections import defaultdict\n\n"
            + body
        )
    elif name == "features_ml.py":
        body = (
            '"""Feature engineering and ML training/prediction."""\n\n'
            + body
        )
    elif name == "predict.py":
        body = (
            '"""Product-level demand prediction orchestration."""\n\n'
            + body
        )
    else:
        body = '"""Stock alerts and weekly chart."""\n\n' + body
    (base / name).write_text(body, encoding="utf-8")

init = '''"""
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
    _lag_features,
)
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
    "build_daily_sales_by_product",
    "predict_demand",
    "training_data_quality_meta",
    "get_stock_alerts",
    "get_weekly_chart",
]
'''

(base / "__init__.py").write_text(init, encoding="utf-8")
src_path.unlink()
print("OK: models/demand/ package created")
