"""Backward compatibility — use services.supabase instead."""
import requests  # noqa: F401 — tests monkeypatch supabase_client.requests

from services.supabase import *  # noqa: F403
from services.supabase import http as _http

_SUPABASE_URL = _http._SUPABASE_URL
_HEADERS = _http._HEADERS
logger = _http.logger


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
