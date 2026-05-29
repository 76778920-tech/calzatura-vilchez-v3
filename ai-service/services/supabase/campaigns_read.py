"""Campaign queries (read / aggregate)."""

from services.supabase.http import _ORDER_FECHA_DETECCION_DESC, _query

_CAMPANAS_TABLE = "campanas_detectadas"
_CAMP_PRODUCTOS_TABLE = "campana_productos"

_ACTIVE_STATES = "in.(inicio,activa,finalizando,en_riesgo_stock,observando)"


def get_last_campana_activa() -> dict | None:
    try:
        rows = _query(_CAMPANAS_TABLE, {
            "select": "id,fecha_deteccion,fecha_inicio,nivel,tipo_sugerido,estado,uplift_ratio",
            "estado": _ACTIVE_STATES,
            "order": _ORDER_FECHA_DETECCION_DESC,
            "limit": "1",
        })
        return rows[0] if rows else None
    except Exception:
        return None


def fetch_campanas_recientes(limit: int = 10) -> list[dict]:
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


def _aggregate_feedback_stats(rows: list[dict]) -> dict:
    stats: dict = {
        "global_confirmadas": 0,
        "global_descartadas": 0,
        "focalizada_confirmadas": 0,
        "focalizada_descartadas": 0,
    }
    for row in rows:
        scope = row.get("scope") or "global"
        key = scope if scope in ("global", "focalizada") else "global"
        if row.get("confirmada_por_admin") is True:
            stats[f"{key}_confirmadas"] += 1
        elif row.get("confirmada_por_admin") is False:
            stats[f"{key}_descartadas"] += 1
    return stats


def fetch_campana_feedback_stats() -> dict:
    try:
        rows = _query(_CAMPANAS_TABLE, {
            "select": "scope,confirmada_por_admin",
            "confirmada_por_admin": "not.is.null",
            "order": _ORDER_FECHA_DETECCION_DESC,
            "limit": "100",
        })
        return _aggregate_feedback_stats(rows)
    except Exception:
        return {}


def _fetch_campana_top_products(campana_id: int) -> list[dict]:
    return _query(_CAMP_PRODUCTOS_TABLE, {
        "select": (
            "producto_id,nombre,categoria,uplift_ratio,ventas_recientes,"
            "ventas_baseline,stock_actual,impacto_soles"
        ),
        "campana_id": f"eq.{campana_id}",
        "order": "uplift_ratio.desc",
        "limit": "10",
    })


def fetch_campana_detail(campana_id: int) -> dict | None:
    try:
        rows = _query(_CAMPANAS_TABLE, {
            "select": "*",
            "id": f"eq.{campana_id}",
            "limit": "1",
        })
        if not rows:
            return None
        campana = rows[0]
        campana["top_productos_detalle"] = _fetch_campana_top_products(campana_id)
        return campana
    except Exception:
        return None
