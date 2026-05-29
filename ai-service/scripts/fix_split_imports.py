"""Fix imports after package split."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# --- supabase catalog ---
(ROOT / "services/supabase/catalog.py").write_text(
    '''"""Catalog and sales queries."""

from services.supabase.http import _cutoff_iso, _query


def fetch_daily_sales(days: int | None = None) -> list[dict]:
    params = {
        "select": "productId,fecha,cantidad,total,devuelto,nombre,precioVenta,codigo,canal",
    }
    if days and days > 0:
        params["fecha"] = f"gte.{_cutoff_iso(days)}"
    return _query("ventasDiarias", params)


def fetch_completed_orders(days: int | None = None) -> list[dict]:
    params = {
        "select": "creadoEn,pagadoEn,items,total",
        "estado": "in.(pagado,enviado,entregado)",
    }
    if days and days > 0:
        cutoff = _cutoff_iso(days)
        params["or"] = f"(creadoEn.gte.{cutoff},pagadoEn.gte.{cutoff})"
    return _query("pedidos", params)


def fetch_products() -> list[dict]:
    return _query("productos", {"select": "id,nombre,categoria,precio,stock,imagen,campana,tallaStock,tallas"})


def fetch_stock_movements(days: int | None = None) -> list[dict]:
    params = {
        "select": "productId,tipo,fecha,tallaStock,cantidad,costoUnitario",
        "tipo": "eq.ingreso",
        "order": "fecha.asc",
    }
    if days and days > 0:
        params["fecha"] = f"gte.{_cutoff_iso(days)}"
    return _query("movimientosStock", params)


def fetch_product_codes() -> dict[str, str]:
    rows = _query("productoCodigos", {"select": "productoId,codigo"})
    return {r["productoId"]: r["codigo"] for r in rows if r.get("codigo")}
''',
    encoding="utf-8",
)

campaign_preamble = """from collections import defaultdict
from dataclasses import dataclass
from datetime import date, timedelta

import numpy as np

from models.campaign.constants import (
    CATEGORIAS_ACTIVAS_LABEL,
    FINALIZADA_COOLDOWN,
    FINALIZANDO_COOLDOWN,
    MIN_BASELINE_DAYS,
    MIN_CONSISTENT_DAYS,
    UPLIFT_ALTA,
    UPLIFT_BAJA,
    UPLIFT_MEDIA,
    Z_ALTA,
    Z_BAJA,
    Z_MEDIA,
)
from models.campaign.helpers import (
    _consecutive_elevated_days,
    _consecutive_normal_days,
    _date_range,
    _fill_zeros,
    _norm_date,
    _safe_float,
    _stats,
)
"""

# helpers.py - strip duplicate header, add imports
helpers_path = ROOT / "models/campaign/helpers.py"
helpers_body = helpers_path.read_text(encoding="utf-8")
if "from datetime import date" not in helpers_body:
    helpers_body = (
        '"""Campaign helpers."""\n\n'
        "from datetime import date, timedelta\n\n"
        "import numpy as np\n\n"
        + helpers_body.split('"""Campaign detection submodule."""\n\n', 1)[-1]
    )
    helpers_path.write_text(helpers_body, encoding="utf-8")

for name in ("signal_metrics.py", "detect.py", "uplift_entities.py", "messaging.py", "recommendations.py"):
    path = ROOT / "models/campaign" / name
    body = path.read_text(encoding="utf-8")
    if "from models.campaign.constants" not in body:
        body = body.replace(
            '"""Campaign detection submodule."""\n\n',
            f'"""Campaign detection — {name}."""\n\n{campaign_preamble}\n',
            1,
        )
        path.write_text(body, encoding="utf-8")

# signal_metrics needs aggregation function used in detect - _aggregate_sales is in helpers? 
# It's in helpers.py lines 165+ - check helpers file length

# detect.py imports from signal_metrics
detect_path = ROOT / "models/campaign/detect.py"
detect_body = detect_path.read_text(encoding="utf-8")
extra_detect = """
from models.campaign.signal_metrics import (
    _aggregate_sales_for_campaign,
    _classify_campaign_signal,
    _compute_category_uplift,
    _compute_cierre_estado,
    _compute_product_uplift,
    _compute_uplift_and_z_metrics,
    _confidence_pct_for_campaign,
    _detect_campaign_success_payload,
    _CampaignSuccessPayloadInput,
    _resolve_focus_and_impacto,
    _stock_lists_from_top_productos,
)
from models.campaign.uplift_entities import _insufficient_data
from models.campaign.messaging import _build_message
from models.campaign.recommendations import _build_recommendation
"""
if "_aggregate_sales_for_campaign" not in detect_body:
    detect_body = detect_body.replace(campaign_preamble, campaign_preamble + extra_detect, 1)
    detect_path.write_text(detect_body, encoding="utf-8")

# recommendations may need uplift_entities functions - check

# demand fixes
demand_helpers = ROOT / "models/demand/helpers.py"
dh = demand_helpers.read_text(encoding="utf-8")
if "from datetime import date" not in dh:
    demand_helpers.write_text(
        '"""Demand helpers."""\n\n'
        "import hashlib\n"
        "import math\n"
        "from datetime import date\n\n"
        + dh.split('"""Demand helpers."""\n\n', 1)[-1],
        encoding="utf-8",
    )

sales_path = ROOT / "models/demand/sales.py"
sp = sales_path.read_text(encoding="utf-8")
if "from models.demand.helpers" not in sp:
    sales_path.write_text(
        sp.replace(
            "from collections import defaultdict\n\n",
            "from collections import defaultdict\n\n"
            "from models.demand.helpers import _accumulate_completed_order_row, _accumulate_daily_sale_row, _iso_date, _safe_float\n\n",
            1,
        ),
        encoding="utf-8",
    )

features_path = ROOT / "models/demand/features_ml.py"
fp = features_path.read_text(encoding="utf-8")
if "from models.demand.constants import" not in fp:
    features_path.write_text(
        '"""Feature engineering and ML."""\n\n'
        + fp.split('"""Feature engineering and ML training/prediction."""\n\n', 1)[-1],
        encoding="utf-8",
    )

# constants.py should only have constants - move _stockout_date to helpers
const_path = ROOT / "models/demand/constants.py"
const_text = const_path.read_text(encoding="utf-8")
# Keep full constants file as-is but ensure helpers has date - constants already imports date

predict_path = ROOT / "models/demand/predict.py"
pp = predict_path.read_text(encoding="utf-8")
predict_imports = '''from datetime import date, timedelta

from models.demand.constants import FEATURE_COLS, MIN_TRAIN_ROWS
from models.demand.features_ml import (
    _apply_demand_risk_flags,
    _build_movements_by_product,
    _init_sale_meta_from_sources,
    _prediction_row_no_sales_history,
    _prediction_row_with_sales_history,
    _SalesHistoryPredictionInput,
    _train_global_model,
)
from models.demand.helpers import _safe_float
from models.demand.sales import build_daily_sales_by_product
from models.safe_limits import MAX_HISTORY_DAYS_FOR_LOOPS, MAX_HORIZON_DAYS_FOR_LOOPS, sanitize_int_for_range

'''
if "from models.demand.features_ml" not in pp:
    pp = predict_imports + pp.split('"""Product-level demand prediction orchestration."""\n\n', 1)[-1]
    predict_path.write_text(pp, encoding="utf-8")

reporting_path = ROOT / "models/demand/reporting.py"
rp = reporting_path.read_text(encoding="utf-8")
if "from models.demand.helpers" not in rp:
    reporting_path.write_text(
        '"""Stock alerts and weekly chart."""\n\n'
        "from datetime import date, timedelta\n\n"
        "from models.demand.helpers import _safe_float\n"
        "from models.safe_limits import MAX_WEEKS_FOR_CHART, sanitize_int_for_range\n\n"
        + rp.split('"""Stock alerts and weekly chart."""\n\n', 1)[-1],
        encoding="utf-8",
    )

print("imports patched")
