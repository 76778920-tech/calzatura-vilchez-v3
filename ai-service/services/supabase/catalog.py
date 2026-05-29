"""Catalog and sales queries."""

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
