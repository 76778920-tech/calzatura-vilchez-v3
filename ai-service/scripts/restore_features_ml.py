from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parent.parent
src = subprocess.check_output(
    ["git", "show", "HEAD:ai-service/models/demand.py"],
    cwd=ROOT.parent,
    text=True,
)
lines = src.splitlines(keepends=True)
body = "".join(lines[200:812])
header = '''"""Feature engineering, ML training, and per-product prediction rows."""

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
(ROOT / "models/demand/features_ml.py").write_text(header + body, encoding="utf-8")
print("restored", len(body))
