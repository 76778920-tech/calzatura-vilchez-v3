"""Campaign event persistence."""

import logging
from datetime import datetime, timezone

import requests

from services.supabase.http import (
    _ORDER_FECHA_DETECCION_DESC,
    _PREFER_RESOLUTION_MERGE_DUPLICATES_MINIMAL,
    _PREFER_RETURN_MINIMAL,
    _get_headers,
    _query,
)

# â”€â”€ Campaign event persistence â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

_CAMPANAS_TABLE         = "campanas_detectadas"
_CAMP_METRICAS_TABLE    = "campana_metricas_diarias"
_CAMP_PRODUCTOS_TABLE   = "campana_productos"
_CAMP_FEEDBACK_TABLE    = "campana_feedback"


def save_campana_detectada(evento: dict) -> dict | None:
    """Inserta un nuevo evento de campaÃ±a en campanas_detectadas."""
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
    """Actualiza estado (y opcionalmente fecha_fin e impacto) de una campaÃ±a."""
    url, headers = _get_headers()
    payload: dict = {"estado": estado}
    if fecha_fin:
        payload["fecha_fin"] = fecha_fin
    if impacto_estimado_soles is not None:
        payload["impacto_estimado_soles"] = impacto_estimado_soles
    requests.patch(
        f"{url}/rest/v1/{_CAMPANAS_TABLE}?id=eq.{campana_id}",
        headers={**headers, "Prefer": _PREFER_RETURN_MINIMAL},
        json=payload,
        timeout=10,
    )


def get_last_campana_activa() -> dict | None:
    """Devuelve el Ãºltimo evento de campaÃ±a activa, en inicio, finalizando u observando."""
    try:
        rows = _query(_CAMPANAS_TABLE, {
            "select": "id,fecha_deteccion,fecha_inicio,nivel,tipo_sugerido,estado,uplift_ratio",
            "estado": "in.(inicio,activa,finalizando,en_riesgo_stock,observando)",
            "order": _ORDER_FECHA_DETECCION_DESC,
            "limit": "1",
        })
        return rows[0] if rows else None
    except Exception:
        return None


def save_campana_metrica_diaria(campana_id: int, metrica: dict) -> None:
    """Upsert de mÃ©trica diaria para una campaÃ±a (un registro por campana_id + fecha)."""
    url, headers = _get_headers()
    payload = {"campana_id": campana_id, **metrica}
    requests.post(
        f"{url}/rest/v1/{_CAMP_METRICAS_TABLE}?on_conflict=campana_id,fecha",
        headers={**headers, "Prefer": _PREFER_RESOLUTION_MERGE_DUPLICATES_MINIMAL},
        json=payload,
        timeout=10,
    )


def save_campana_productos(campana_id: int, productos: list[dict]) -> None:
    """Upsert de top productos afectados por la campaÃ±a."""
    if not productos:
        return
    url, headers = _get_headers()
    payload = [{"campana_id": campana_id, **p} for p in productos]
    requests.post(
        f"{url}/rest/v1/{_CAMP_PRODUCTOS_TABLE}?on_conflict=campana_id,producto_id",
        headers={**headers, "Prefer": _PREFER_RESOLUTION_MERGE_DUPLICATES_MINIMAL},
        json=payload,
        timeout=10,
    )


def save_campana_feedback(campana_id: int, accion: str, **kwargs) -> None:
    """Registra una acciÃ³n de feedback del administrador sobre una campaÃ±a."""
    url, headers = _get_headers()
    payload = {"campana_id": campana_id, "accion": accion, **kwargs}
    requests.post(
        f"{url}/rest/v1/{_CAMP_FEEDBACK_TABLE}",
        headers={**headers, "Prefer": _PREFER_RETURN_MINIMAL},
        json=payload,
        timeout=10,
    )


def update_campana_admin_feedback(
    campana_id: int,
    confirmada: bool,
    nota: str | None = None,
) -> None:
    """Actualiza confirmada_por_admin y admin_nota en la campaÃ±a principal."""
    url, headers = _get_headers()
    payload: dict = {"confirmada_por_admin": confirmada}
    if nota:
        payload["admin_nota"] = nota
    requests.patch(
        f"{url}/rest/v1/{_CAMPANAS_TABLE}?id=eq.{campana_id}",
        headers={**headers, "Prefer": _PREFER_RETURN_MINIMAL},
        json=payload,
        timeout=10,
    )


def fetch_campanas_recientes(limit: int = 10) -> list[dict]:
    """Ãšltimas N campaÃ±as detectadas (para historial en panel admin)."""
    try:
        return _query(_CAMPANAS_TABLE, {
            "select": (
                "id,fecha_deteccion,fecha_inicio,fecha_fin,nivel,scope,"
                "foco_tipo,foco_nombre,foco_uplift,tipo_sugerido,estado,"
                "uplift_ratio,confidence_pct,impacto_estimado_soles,"
                "impacto_estimado_soles_focalizado,recomendacion,"
                "confirmada_por_admin,admin_nota"
            ),
            "order": _ORDER_FECHA_DETECCION_DESC,
            "limit": str(limit),
        })
    except Exception:
        return []


def fetch_campana_feedback_stats() -> dict:
    """
    Agrega conteos de confirmaciones y descartes por scope (Ãºltimas 100 con feedback).
    Devuelve dict con claves global_confirmadas, global_descartadas,
    focalizada_confirmadas, focalizada_descartadas.
    """
    try:
        rows = _query(_CAMPANAS_TABLE, {
            "select":                "scope,confirmada_por_admin",
            "confirmada_por_admin":  "not.is.null",
            "order":                 _ORDER_FECHA_DETECCION_DESC,
            "limit":                 "100",
        })
        stats: dict = {
            "global_confirmadas":     0,
            "global_descartadas":     0,
            "focalizada_confirmadas": 0,
            "focalizada_descartadas": 0,
        }
        for row in rows:
            scope = row.get("scope") or "global"
            key   = scope if scope in ("global", "focalizada") else "global"
            if row.get("confirmada_por_admin") is True:
                stats[f"{key}_confirmadas"] += 1
            elif row.get("confirmada_por_admin") is False:
                stats[f"{key}_descartadas"] += 1
        return stats
    except Exception:
        return {}


def fetch_campana_detail(campana_id: int) -> dict | None:
    """Detalle completo de una campaÃ±a incluyendo top_productos y metricas."""
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
            "select":    "producto_id,nombre,categoria,uplift_ratio,ventas_recientes,ventas_baseline,stock_actual,impacto_soles",
            "campana_id": f"eq.{campana_id}",
            "order":     "uplift_ratio.desc",
            "limit":     "10",
        })
        campana["top_productos_detalle"] = prods
        return campana
    except Exception:
        return None
