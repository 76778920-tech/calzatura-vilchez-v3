"""IRE and model state persistence."""

import logging
from datetime import datetime, timezone

import requests

from services.supabase.http import (
    _AUDIT_FALLBACK_STATUS_CODES,
    _PREFER_RESOLUTION_MERGE_DUPLICATES_MINIMAL,
    _cutoff_iso,
    _get_headers,
    _query,
)

logger = logging.getLogger(__name__)

def save_ire_historial(ire: dict) -> None:
    """Upsert del IRE del dÃ­a. Un registro por fecha (UNIQUE en fecha)."""
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
                "Prefer": _PREFER_RESOLUTION_MERGE_DUPLICATES_MINIMAL,
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
    """Ãšltimos N dÃ­as de historial IRE, ordenado por fecha ascendente."""
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
        headers={**headers, "Prefer": _PREFER_RESOLUTION_MERGE_DUPLICATES_MINIMAL},
        json=payload,
        timeout=10,
    )


def load_modelo_estado() -> dict | None:
    """Carga el Ãºltimo training_meta guardado en BD (F-04). Retorna None si no existe."""
    try:
        rows = _query("modeloEstado", {"select": "trainingMeta,actualizadoEn", "id": "eq.singleton"})
        if rows:
            return rows[0].get("trainingMeta")
    except Exception:
        logger.debug("No se pudo cargar modeloEstado desde Supabase", exc_info=True)
    return None

