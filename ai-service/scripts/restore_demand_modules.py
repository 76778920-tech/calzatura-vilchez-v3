from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parent.parent
src = subprocess.check_output(
    ["git", "show", "HEAD:ai-service/models/demand.py"],
    cwd=ROOT.parent,
    text=True,
)
lines = src.splitlines(keepends=True)

features_header = '''"""Feature engineering, ML training, and per-product prediction rows."""

from collections import defaultdict
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Any

import numpy as np
import pandas as pd
import sklearn
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder

from models.demand.constants import FEATURE_COLS, MIN_TRAIN_ROWS
from models.demand.helpers import (
    _data_hash,
    _drift_score,
    _iso_date,
    _normalize_campaign,
    _percentile,
    _safe_float,
    _season_flags,
)

'''

predict_header = '''"""Product-level demand prediction orchestration."""

from datetime import date, timedelta

from models.demand.constants import MIN_TRAIN_ROWS
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

'''

reporting_header = '''"""Stock alerts and weekly chart."""

from datetime import date, timedelta

from models.demand.helpers import _safe_float
from models.safe_limits import MAX_WEEKS_FOR_CHART, sanitize_int_for_range

'''

(ROOT / "models/demand/features_ml.py").write_text(
    features_header + "".join(lines[200:811]), encoding="utf-8"
)
(ROOT / "models/demand/predict.py").write_text(
    predict_header + "".join(lines[811:967]), encoding="utf-8"
)
(ROOT / "models/demand/reporting.py").write_text(
    reporting_header + "".join(lines[967:]), encoding="utf-8"
)
print("demand modules restored")
