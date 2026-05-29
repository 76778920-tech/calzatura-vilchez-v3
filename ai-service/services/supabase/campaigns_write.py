"""Campaign persistence (create / update)."""

import requests

from services.supabase.http import (
    _PREFER_RESOLUTION_MERGE_DUPLICATES_MINIMAL,
    _PREFER_RETURN_MINIMAL,
    _get_headers,
)

_CAMPANAS_TABLE = "campanas_detectadas"
_CAMP_METRICAS_TABLE = "campana_metricas_diarias"
_CAMP_PRODUCTOS_TABLE = "campana_productos"
_CAMP_FEEDBACK_TABLE = "campana_feedback"


def save_campana_detectada(evento: dict) -> dict | None:
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


def save_campana_metrica_diaria(campana_id: int, metrica: dict) -> None:
    url, headers = _get_headers()
    payload = {"campana_id": campana_id, **metrica}
    requests.post(
        f"{url}/rest/v1/{_CAMP_METRICAS_TABLE}?on_conflict=campana_id,fecha",
        headers={**headers, "Prefer": _PREFER_RESOLUTION_MERGE_DUPLICATES_MINIMAL},
        json=payload,
        timeout=10,
    )


def save_campana_productos(campana_id: int, productos: list[dict]) -> None:
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
