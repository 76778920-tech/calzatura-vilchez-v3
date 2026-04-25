import os
from datetime import datetime, timedelta, timezone

import requests

_SUPABASE_URL: str | None = None
_HEADERS: dict | None = None


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


def fetch_daily_sales(days: int | None = None) -> list[dict]:
    params = {"select": "*"}
    if days and days > 0:
        params["fecha"] = f"gte.{_cutoff_iso(days)}"
    return _query("ventasDiarias", params)


def fetch_completed_orders(days: int | None = None) -> list[dict]:
    params = {
        "select": "*",
        "estado": "in.(pagado,enviado,entregado)",
    }
    if days and days > 0:
        cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
        params["creadoEn"] = f"gte.{cutoff}"
    return _query("pedidos", params)


def fetch_products() -> list[dict]:
    return _query("productos", {"select": "*"})


def fetch_product_codes() -> dict[str, str]:
    rows = _query("productoCodigos", {"select": "productoId,codigo"})
    return {r["productoId"]: r["codigo"] for r in rows if r.get("codigo")}
