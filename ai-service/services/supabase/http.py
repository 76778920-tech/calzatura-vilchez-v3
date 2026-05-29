"""Supabase HTTP primitives."""

import os
import logging
from datetime import datetime, timedelta, timezone

import requests

logger = logging.getLogger(__name__)

_SUPABASE_URL: str | None = None
_HEADERS: dict | None = None

_AUDIT_FALLBACK_STATUS_CODES = {400, 404, 406, 409, 422}

# Prefer headers (PostgREST) â€” constantes para evitar literales duplicados (Sonar).
_PREFER_RESOLUTION_MERGE_DUPLICATES_MINIMAL = "resolution=merge-duplicates,return=minimal"
_PREFER_RETURN_MINIMAL = "return=minimal"
_ORDER_FECHA_DETECCION_DESC = "fecha_deteccion.desc"


def _get_headers() -> tuple[str, dict]:
    global _SUPABASE_URL, _HEADERS
    if _SUPABASE_URL is None or _HEADERS is None:
        url = os.getenv("SUPABASE_URL", "").rstrip("/")
        key = os.getenv("SUPABASE_SERVICE_KEY", "")
        if not url or not key:
            raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_KEY env vars are required")
        _SUPABASE_URL = url
        _HEADERS = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        }
    return _SUPABASE_URL, _HEADERS


def get_client():
    return _get_headers()


def _cutoff_iso(days: int) -> str:
    return (datetime.now(timezone.utc).date() - timedelta(days=days)).isoformat()


def _query(table: str, params: dict | None = None) -> list[dict]:
    url, headers = _get_headers()
    resp = requests.get(
        f"{url}/rest/v1/{table}",
        headers={**headers, "Prefer": "return=representation"},
        params=params or {},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()

