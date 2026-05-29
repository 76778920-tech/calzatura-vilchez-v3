"""Backward compatibility — use services.supabase instead."""
from services.supabase import (
    fetch_campana_detail,
    fetch_campana_feedback_stats,
    fetch_campanas_recientes,
    fetch_completed_orders,
    fetch_daily_sales,
    fetch_ire_historial,
    fetch_product_codes,
    fetch_products,
    fetch_stock_movements,
    get_client,
    get_last_campana_activa,
    load_modelo_estado,
    save_campana_detectada,
    save_campana_feedback,
    save_campana_metrica_diaria,
    save_campana_productos,
    save_ire_historial,
    save_modelo_estado,
    update_campana_admin_feedback,
    update_campana_estado,
)
from services.supabase import http as _http

# Tests monkeypatch supabase_client.requests (same module used by supabase.http).
requests = _http.requests

_SUPABASE_URL = _http._SUPABASE_URL
_HEADERS = _http._HEADERS
logger = _http.logger

__all__ = [
    "requests",
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
    "_get_headers",
    "_query",
    "_cutoff_iso",
]


def _get_headers():
    """Delegate to http module; sync cache attrs so tests can monkeypatch this module."""
    global _SUPABASE_URL, _HEADERS
    _http._SUPABASE_URL = _SUPABASE_URL
    _http._HEADERS = _HEADERS
    url, headers = _http._get_headers()
    _SUPABASE_URL = _http._SUPABASE_URL
    _HEADERS = _http._HEADERS
    return url, headers


def _query(table: str, params=None):
    return _http._query(table, params)


def _cutoff_iso(days: int) -> str:
    return _http._cutoff_iso(days)
