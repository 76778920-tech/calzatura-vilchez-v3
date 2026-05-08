import os
from datetime import datetime, timedelta, timezone

import requests

_SUPABASE_URL: str | None = None
_HEADERS: dict | None = None

_AUDIT_FALLBACK_STATUS_CODES = {400, 404, 406, 409, 422}


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
    # Contrato de campos para demand.py: id, nombre, categoria, precio, stock, imagen, campana.
    return _query("productos", {"select": "id,nombre,categoria,precio,stock,imagen,campana"})


def fetch_product_codes() -> dict[str, str]:
    rows = _query("productoCodigos", {"select": "productoId,codigo"})
    return {r["productoId"]: r["codigo"] for r in rows if r.get("codigo")}


def save_ire_historial(ire: dict) -> None:
    """Upsert del IRE del día. Un registro por fecha (UNIQUE en fecha)."""
    url, headers = _get_headers()
    base_payload = {
        "fecha":       datetime.now(timezone.utc).date().isoformat(),
        "score":       ire["score"],
        "nivel":       ire["nivel"],
        "dimensiones": ire.get("dimensiones", {}),
        "pesos":       ire.get("pesos", {}),
    }
    audit_payload = {
        **base_payload,
        "version":    ire.get("version"),
        "definicion": ire.get("definicion"),
        "formula":    ire.get("formula"),
        "variables":  ire.get("variables", []),
        "detalle":    ire.get("detalle", {}),
    }

    def _post(payload: dict):
        return requests.post(
            f"{url}/rest/v1/ireHistorial?on_conflict=fecha",
            headers={
                **headers,
                "Prefer": "resolution=merge-duplicates,return=minimal",
            },
            json=payload,
            timeout=10,
        )

    resp = _post(audit_payload)
    if resp.status_code in _AUDIT_FALLBACK_STATUS_CODES:
        # Compatibilidad con instalaciones donde ireHistorial aun no tiene
        # columnas de auditoria; se conserva el comportamiento previo.
        resp = _post(base_payload)
    resp.raise_for_status()


def fetch_ire_historial(days: int = 30) -> list[dict]:
    """Últimos N días de historial IRE, ordenado por fecha ascendente."""
    return _query("ireHistorial", {
        "select": "fecha,score,nivel,dimensiones,pesos,version,definicion,formula,variables,detalle",
        "fecha":  f"gte.{_cutoff_iso(days)}",
        "order":  "fecha.asc",
    })


def save_modelo_estado(training_meta: dict) -> None:
    """Persiste el training_meta del modelo en BD para sobrevivir reinicios (F-04)."""
    url, headers = _get_headers()
    payload = {
        "id":           "singleton",
        "trainingMeta": training_meta,
        "actualizadoEn": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z",
    }
    requests.post(
        f"{url}/rest/v1/modeloEstado?on_conflict=id",
        headers={**headers, "Prefer": "resolution=merge-duplicates,return=minimal"},
        json=payload,
        timeout=10,
    )


def load_modelo_estado() -> dict | None:
    """Carga el último training_meta guardado en BD (F-04). Retorna None si no existe."""
    try:
        rows = _query("modeloEstado", {"select": "trainingMeta,actualizadoEn", "id": "eq.singleton"})
        if rows:
            return rows[0].get("trainingMeta")
    except Exception:
        pass
    return None


# ── Campaign event persistence ────────────────────────────────────────────────

_CAMPANAS_TABLE         = "campanas_detectadas"
_CAMP_METRICAS_TABLE    = "campana_metricas_diarias"
_CAMP_PRODUCTOS_TABLE   = "campana_productos"
_CAMP_FEEDBACK_TABLE    = "campana_feedback"


def save_campana_detectada(evento: dict) -> dict | None:
    """Inserta un nuevo evento de campaña en campanas_detectadas."""
    url, headers = _get_headers()
    resp = requests.post(
        f"{url}/rest/v1/{_CAMPANAS_TABLE}",
        headers={**headers, "Prefer": "return=representation"},
        json=evento,
        timeout=10,
    )
    if resp.ok:
        rows = resp.json()
        return rows[0] if rows else None
    return None


def update_campana_estado(
    campana_id: int,
    estado: str,
    fecha_fin: str | None = None,
    impacto_estimado_soles: float | None = None,
) -> None:
    """Actualiza estado (y opcionalmente fecha_fin e impacto) de una campaña."""
    url, headers = _get_headers()
    payload: dict = {"estado": estado}
    if fecha_fin:
        payload["fecha_fin"] = fecha_fin
    if impacto_estimado_soles is not None:
        payload["impacto_estimado_soles"] = impacto_estimado_soles
    requests.patch(
        f"{url}/rest/v1/{_CAMPANAS_TABLE}?id=eq.{campana_id}",
        headers={**headers, "Prefer": "return=minimal"},
        json=payload,
        timeout=10,
    )


def get_last_campana_activa() -> dict | None:
    """Devuelve el último evento de campaña activa, en inicio, finalizando u observando."""
    try:
        rows = _query(_CAMPANAS_TABLE, {
            "select": "id,fecha_deteccion,fecha_inicio,nivel,tipo_sugerido,estado,uplift_ratio",
            "estado": "in.(inicio,activa,finalizando,en_riesgo_stock,observando)",
            "order": "fecha_deteccion.desc",
            "limit": "1",
        })
        return rows[0] if rows else None
    except Exception:
        return None


def save_campana_metrica_diaria(campana_id: int, metrica: dict) -> None:
    """Upsert de métrica diaria para una campaña (un registro por campana_id + fecha)."""
    url, headers = _get_headers()
    payload = {"campana_id": campana_id, **metrica}
    requests.post(
        f"{url}/rest/v1/{_CAMP_METRICAS_TABLE}?on_conflict=campana_id,fecha",
        headers={**headers, "Prefer": "resolution=merge-duplicates,return=minimal"},
        json=payload,
        timeout=10,
    )


def save_campana_productos(campana_id: int, productos: list[dict]) -> None:
    """Upsert de top productos afectados por la campaña."""
    if not productos:
        return
    url, headers = _get_headers()
    payload = [{"campana_id": campana_id, **p} for p in productos]
    requests.post(
        f"{url}/rest/v1/{_CAMP_PRODUCTOS_TABLE}?on_conflict=campana_id,producto_id",
        headers={**headers, "Prefer": "resolution=merge-duplicates,return=minimal"},
        json=payload,
        timeout=10,
    )


def save_campana_feedback(campana_id: int, accion: str, **kwargs) -> None:
    """Registra una acción de feedback del administrador sobre una campaña."""
    url, headers = _get_headers()
    payload = {"campana_id": campana_id, "accion": accion, **kwargs}
    requests.post(
        f"{url}/rest/v1/{_CAMP_FEEDBACK_TABLE}",
        headers={**headers, "Prefer": "return=minimal"},
        json=payload,
        timeout=10,
    )


def update_campana_admin_feedback(
    campana_id: int,
    confirmada: bool,
    nota: str | None = None,
) -> None:
    """Actualiza confirmada_por_admin y admin_nota en la campaña principal."""
    url, headers = _get_headers()
    payload: dict = {"confirmada_por_admin": confirmada}
    if nota:
        payload["admin_nota"] = nota
    requests.patch(
        f"{url}/rest/v1/{_CAMPANAS_TABLE}?id=eq.{campana_id}",
        headers={**headers, "Prefer": "return=minimal"},
        json=payload,
        timeout=10,
    )


def fetch_campanas_recientes(limit: int = 10) -> list[dict]:
    """Últimas N campañas detectadas (para historial en panel admin)."""
    try:
        return _query(_CAMPANAS_TABLE, {
            "select": (
                "id,fecha_deteccion,fecha_inicio,fecha_fin,nivel,scope,"
                "foco_tipo,foco_nombre,foco_uplift,tipo_sugerido,estado,"
                "uplift_ratio,confidence_pct,impacto_estimado_soles,"
                "impacto_estimado_soles_focalizado,recomendacion,"
                "confirmada_por_admin,admin_nota"
            ),
            "order": "fecha_deteccion.desc",
            "limit": str(limit),
        })
    except Exception:
        return []


def fetch_campana_detail(campana_id: int) -> dict | None:
    """Detalle completo de una campaña incluyendo top_productos y metricas."""
    try:
        rows = _query(_CAMPANAS_TABLE, {
            "select": "*",
            "id":     f"eq.{campana_id}",
            "limit":  "1",
        })
        if not rows:
            return None
        campana = rows[0]
        # Enrich with top products
        prods = _query(_CAMP_PRODUCTOS_TABLE, {
            "select":    "producto_id,nombre,categoria,uplift_ratio,ventas_recientes,ventas_baseline,stock_actual",
            "campana_id": f"eq.{campana_id}",
            "order":     "uplift_ratio.desc",
            "limit":     "10",
        })
        campana["top_productos_detalle"] = prods
        return campana
    except Exception:
        return None
