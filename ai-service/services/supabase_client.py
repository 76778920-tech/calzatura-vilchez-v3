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
    # Contrato de campos — no añadir select=* sin revisar demand.py y revenue.py:
    #   demand.py  → productId, fecha, cantidad, devuelto, nombre, categoria, precioVenta, codigo
    #   revenue.py → fecha, total, devuelto, canal
    params = {
        "select": "productId,fecha,cantidad,total,devuelto,nombre,precioVenta,codigo",
    }
    if days and days > 0:
        params["fecha"] = f"gte.{_cutoff_iso(days)}"
    return _query("ventasDiarias", params)


def fetch_completed_orders(days: int | None = None) -> list[dict]:
    # Contrato de campos:
    #   demand.py  → creadoEn, items (JSONB: items[].product.{id,nombre,categoria,precio}, items[].quantity)
    #   revenue.py → pagadoEn (fecha real de pago; fallback creadoEn), total
    params = {
        "select": "creadoEn,pagadoEn,items,total",
        "estado": "in.(pagado,enviado,entregado)",
    }
    if days and days > 0:
        cutoff = _cutoff_iso(days)  # date-only "YYYY-MM-DD" — avoids +00:00 in OR filter
        params["or"] = f"(creadoEn.gte.{cutoff},pagadoEn.gte.{cutoff})"
    return _query("pedidos", params)


def fetch_products() -> list[dict]:
    # Contrato de campos:
    #   demand.py → id, nombre, categoria, precio, stock, imagen
    return _query("productos", {"select": "id,nombre,categoria,precio,stock,imagen"})


def fetch_product_codes() -> dict[str, str]:
    rows = _query("productoCodigos", {"select": "productoId,codigo"})
    return {r["productoId"]: r["codigo"] for r in rows if r.get("codigo")}


def save_ire_historial(ire: dict) -> None:
    """Upsert del IRE del día. Un registro por fecha (UNIQUE en fecha)."""
    url, headers = _get_headers()
    payload = {
        "fecha":       datetime.now(timezone.utc).date().isoformat(),
        "score":       ire["score"],
        "nivel":       ire["nivel"],
        "dimensiones": ire.get("dimensiones", {}),
        "pesos":       ire.get("pesos", {}),
    }
    resp = requests.post(
        f"{url}/rest/v1/ireHistorial?on_conflict=fecha",
        headers={
            **headers,
            "Prefer": "resolution=merge-duplicates,return=minimal",
        },
        json=payload,
        timeout=10,
    )
    resp.raise_for_status()


def fetch_ire_historial(days: int = 30) -> list[dict]:
    """Últimos N días de historial IRE, ordenado por fecha ascendente."""
    return _query("ireHistorial", {
        "select": "fecha,score,nivel,dimensiones",
        "fecha":  f"gte.{_cutoff_iso(days)}",
        "order":  "fecha.asc",
    })
