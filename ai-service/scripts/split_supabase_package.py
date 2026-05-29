"""One-off: split services/supabase_client.py into services/supabase/ package."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
src_path = ROOT / "services" / "supabase_client.py"
lines = src_path.read_text(encoding="utf-8").splitlines(keepends=True)
base = ROOT / "services" / "supabase"
base.mkdir(exist_ok=True)

chunks: dict[str, tuple[int, int]] = {
    "http.py": (0, 103),
    "catalog.py": (103, 179),
    "ire_model.py": (179, 177),  # fix below
}

# Correct ranges
chunks = {
    "http.py": (0, 103),
    "catalog.py": (55, 179),
    "ire_model.py": (105, 177),
    "campaigns.py": (179, len(lines)),
}

# http needs full header through fetch_product_codes start - rewrite http as 0-54 + _query
chunks = {
    "http.py": (0, 54),
    "catalog.py": (55, 103),
    "ire_model.py": (105, 177),
    "campaigns.py": (179, len(lines)),
}

for name, (start, end) in chunks.items():
    body = "".join(lines[start:end])
    (base / name).write_text('"""Supabase REST client submodule."""\n\n' + body, encoding="utf-8")

# Fix catalog.py - needs imports from http
catalog = (base / "catalog.py").read_text(encoding="utf-8")
if "def _query" not in catalog:
    catalog = (
        '"""Catalog and sales queries."""\n\n'
        "from services.supabase.http import _cutoff_iso, _query\n\n"
        + "".join(lines[56:103])
    )
    (base / "catalog.py").write_text(catalog, encoding="utf-8")

ire = (
    '"""IRE and model state persistence."""\n\n'
    "import logging\nfrom datetime import datetime, timezone\n\nimport requests\n\n"
    "from services.supabase.http import _get_headers, _cutoff_iso, _query\n\n"
    + "".join(lines[105:177])
)
(base / "ire_model.py").write_text(ire, encoding="utf-8")

campaigns = (
    '"""Campaign event persistence."""\n\n'
    "import logging\nfrom datetime import datetime, timezone\n\nimport requests\n\n"
    "from services.supabase.http import _get_headers, _query\n\n"
    + "".join(lines[179:])
)
(base / "campaigns.py").write_text(campaigns, encoding="utf-8")

http_body = "".join(lines[0:54])
(base / "http.py").write_text('"""Supabase HTTP primitives."""\n\n' + http_body, encoding="utf-8")

init = '''"""Supabase service client — public API unchanged."""

from services.supabase.http import get_client
from services.supabase.catalog import (
    fetch_daily_sales,
    fetch_completed_orders,
    fetch_products,
    fetch_stock_movements,
    fetch_product_codes,
)
from services.supabase.ire_model import (
    save_ire_historial,
    fetch_ire_historial,
    save_modelo_estado,
    load_modelo_estado,
)
from services.supabase.campaigns import (
    save_campana_detectada,
    update_campana_estado,
    get_last_campana_activa,
    save_campana_metrica_diaria,
    save_campana_productos,
    save_campana_feedback,
    update_campana_admin_feedback,
    fetch_campanas_recientes,
    fetch_campana_feedback_stats,
    fetch_campana_detail,
)

__all__ = [
    "get_client",
    "fetch_daily_sales",
    "fetch_completed_orders",
    "fetch_products",
    "fetch_stock_movements",
    "fetch_product_codes",
    "save_ire_historial",
    "fetch_ire_historial",
    "save_modelo_estado",
    "load_modelo_estado",
    "save_campana_detectada",
    "update_campana_estado",
    "get_last_campana_activa",
    "save_campana_metrica_diaria",
    "save_campana_productos",
    "save_campana_feedback",
    "update_campana_admin_feedback",
    "fetch_campanas_recientes",
    "fetch_campana_feedback_stats",
    "fetch_campana_detail",
]
'''

(base / "__init__.py").write_text(init, encoding="utf-8")

# Backward-compat shim for tests importing services.supabase_client
shim = '''"""Backward compatibility — use services.supabase instead."""
from services.supabase import *  # noqa: F403
from services.supabase import http as _http

_SUPABASE_URL = _http._SUPABASE_URL
_HEADERS = _http._HEADERS

def _get_headers():
    return _http._get_headers()

def _query(table: str, params=None):
    return _http._query(table, params)

def _cutoff_iso(days: int) -> str:
    return _http._cutoff_iso(days)
'''

(ROOT / "services" / "supabase_client.py").write_text(shim, encoding="utf-8")
print("OK: services/supabase/ + supabase_client shim")
