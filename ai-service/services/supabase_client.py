import os
from datetime import datetime, timedelta, timezone

from supabase import create_client, Client

_client: Client | None = None


def get_client() -> Client:
    global _client
    if _client is None:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_KEY")
        if not url or not key:
            raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_KEY env vars are required")
        _client = create_client(url, key)
    return _client


def _cutoff_iso(days: int) -> str:
    return (datetime.now(timezone.utc).date() - timedelta(days=days)).isoformat()


def fetch_daily_sales(days: int | None = None) -> list[dict]:
    sb = get_client()
    query = sb.table("ventasDiarias").select("*")
    if days and days > 0:
        query = query.gte("fecha", _cutoff_iso(days))
    return query.execute().data or []


def fetch_completed_orders(days: int | None = None) -> list[dict]:
    sb = get_client()
    completed = ["pagado", "enviado", "entregado"]
    query = sb.table("pedidos").select("*").in_("estado", completed)
    if days and days > 0:
        cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
        query = query.gte("creadoEn", cutoff)
    return query.execute().data or []


def fetch_products() -> list[dict]:
    sb = get_client()
    return sb.table("productos").select("*").execute().data or []


def fetch_product_codes() -> dict[str, str]:
    sb = get_client()
    rows = sb.table("productoCodigos").select("productoId, codigo").execute().data or []
    return {r["productoId"]: r["codigo"] for r in rows if r.get("codigo")}
