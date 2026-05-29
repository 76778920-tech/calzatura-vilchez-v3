"""Campaign detection — signal_metrics.py."""

from collections import defaultdict
from dataclasses import dataclass
from datetime import date, timedelta

import numpy as np

from models.campaign.constants import (
    CATEGORIAS_ACTIVAS_LABEL,
    FINALIZADA_COOLDOWN,
    FINALIZANDO_COOLDOWN,
    MIN_BASELINE_DAYS,
    MIN_CONSISTENT_DAYS,
    UPLIFT_ALTA,
    UPLIFT_BAJA,
    UPLIFT_MEDIA,
    Z_ALTA,
    Z_BAJA,
    Z_MEDIA,
)
from models.campaign.helpers import (
    _consecutive_elevated_days,
    _consecutive_normal_days,
    _date_range,
    _fill_zeros,
    _norm_date,
    _safe_float,
    _stats,
)

def _classify_campaign_signal(
    uplift: float,
    z: float,
    consecutive_up: int,
    affected_cats: list[dict],
    top_productos: list[dict],
    *,
    uplift_alta: float,
    uplift_media: float,
    uplift_baja: float,
    uplift_focalizada: float,
) -> tuple[str, str | None, str | None, str]:
    """Devuelve (nivel, tipo_sugerido, scope, label) según umbrales globales y detección focalizada."""
    scope: str | None = None

    if uplift >= uplift_alta and z >= Z_ALTA and consecutive_up >= MIN_CONSISTENT_DAYS:
        return "alta", "cyber-wow", "global", "Campana de alta demanda"
    if uplift >= uplift_media and z >= Z_MEDIA and consecutive_up >= MIN_CONSISTENT_DAYS:
        return "media", "outlet", "global", "Posible campana activa"
    if uplift >= uplift_baja and z >= Z_BAJA and consecutive_up >= MIN_CONSISTENT_DAYS:
        return "baja", "nueva-temporada", "global", "Actividad elevada / posible inicio de temporada"
    if uplift >= uplift_baja and consecutive_up >= 1:
        return "observando", None, "global", "Senal emergente - en observacion"

    nivel, tipo_sugerido = "normal", None
    label = "Ventas dentro del rango historico normal"

    best_cat_u = affected_cats[0]["uplift_ratio"] if affected_cats else 0.0
    best_prod_u = top_productos[0]["uplift_ratio"] if top_productos else 0.0
    best_focused = max(best_cat_u, best_prod_u)

    if best_focused >= uplift_focalizada:
        focus_name = (
            affected_cats[0]["categoria"]
            if best_cat_u >= best_prod_u
            else top_productos[0]["nombre"]
        )
        return "baja", "campana-focalizada", "focalizada", f"Campana focalizada en '{focus_name}'"
    if best_focused >= uplift_baja:
        return "observando", None, "focalizada", "Senal focalizada emergente - en observacion"

    return nivel, tipo_sugerido, scope, label


def _build_baseline_by_weekday(
    raw_global: dict[str, float], dates_baseline: list[str]
) -> dict[int, list[float]]:
    baseline_by_weekday: dict[int, list[float]] = defaultdict(list)
    for d_iso in dates_baseline:
        baseline_by_weekday[date.fromisoformat(d_iso).weekday()].append(
            raw_global.get(d_iso, 0.0)
        )
    return baseline_by_weekday


def _sum_expected_dow(
    baseline_by_weekday: dict[int, list[float]],
    dates_recent: list[str],
    bs_mean: float | None,
) -> float:
    return sum(
        float(np.mean(baseline_by_weekday[date.fromisoformat(d).weekday()]))
        if baseline_by_weekday.get(date.fromisoformat(d).weekday())
        else (bs_mean or 0.0)
        for d in dates_recent
    )


def _compute_uplift_and_z_metrics(
    raw_global: dict[str, float],
    dates_baseline: list[str],
    dates_recent: list[str],
    recent_vals: list[float],
    bs: dict,
    n_recent: int,
    uplift_baja: float,
) -> tuple[float, float, float, float, float, float, float, float]:
    """Devuelve expected_dow_sum, actual_sum, expected_sum, sum_uplift, uplift, std_floor, z, threshold_units."""
    baseline_by_weekday = _build_baseline_by_weekday(raw_global, dates_baseline)
    expected_dow_sum = _sum_expected_dow(baseline_by_weekday, dates_recent, bs["mean"])
    actual_sum = sum(recent_vals)
    expected_sum = (bs["mean"] or 0.0) * n_recent
    sum_uplift = actual_sum / expected_sum if expected_sum > 0 else 0.0
    uplift = actual_sum / expected_dow_sum if expected_dow_sum > 0 else sum_uplift
    std_floor = max(bs["std"], bs["mean"] * 0.1, 0.5)
    z = (actual_sum - expected_dow_sum) / (std_floor * (n_recent ** 0.5))
    threshold_units = max(bs["mean"] * uplift_baja, 0.01)
    return expected_dow_sum, actual_sum, expected_sum, sum_uplift, uplift, std_floor, z, threshold_units


def _compute_cierre_estado(nivel: str, consecutive_down: int) -> str | None:
    if nivel != "normal":
        return None
    if consecutive_down >= FINALIZADA_COOLDOWN:
        return "finalizada"
    if consecutive_down >= FINALIZANDO_COOLDOWN:
        return "finalizando"
    return None


def _stock_lists_from_top_productos(top_productos: list[dict]) -> tuple[list[str], list[str]]:
    sin_stock = [p["nombre"] for p in top_productos if (p.get("stock_actual") or 0) == 0]
    criticos = [
        p["nombre"]
        for p in top_productos
        if p.get("stock_actual") is not None
        and p["stock_actual"] > 0
        and p.get("ventas_recientes", 0) > 0
        and p["stock_actual"] < p["ventas_recientes"]
    ]
    return sin_stock, criticos


def _confidence_pct_for_campaign(
    uplift: float,
    z: float,
    consecutive_up: int,
    scope: str | None,
    affected_cats: list[dict],
    top_productos: list[dict],
    uplift_alta: float,
) -> float:
    c_uplift = min(max((uplift - 1.0) / (uplift_alta - 1.0), 0.0), 1.0)
    c_z = min(max(z / (Z_ALTA * 2.0), 0.0), 1.0)
    c_cons = min(consecutive_up / max(MIN_CONSISTENT_DAYS * 3, 1), 1.0)
    if scope == "focalizada":
        best_focused = max(
            affected_cats[0]["uplift_ratio"] if affected_cats else 0.0,
            top_productos[0]["uplift_ratio"] if top_productos else 0.0,
        )
        c_uplift = max(c_uplift, min((best_focused - 1.0) / (uplift_alta - 1.0), 1.0))
    return round((0.40 * c_uplift + 0.35 * c_z + 0.25 * c_cons) * 100, 1)


def _resolve_focus_and_impacto(
    scope: str | None,
    uplift: float,
    affected_cats: list[dict],
    top_productos: list[dict],
) -> tuple[str | None, str | None, float | None, float]:
    foco_tipo: str | None = None
    foco_nombre: str | None = None
    foco_uplift: float | None = None
    impacto_focalizado = 0.0

    if scope == "focalizada" and (affected_cats or top_productos):
        best_cat_u = affected_cats[0]["uplift_ratio"] if affected_cats else 0.0
        best_prod_u = top_productos[0]["uplift_ratio"] if top_productos else 0.0
        if best_cat_u >= best_prod_u and affected_cats:
            foco_tipo = "categoria"
            foco_nombre = affected_cats[0]["categoria"]
            foco_uplift = affected_cats[0]["uplift_ratio"]
            impacto_focalizado = float(affected_cats[0].get("impacto_soles", 0.0))
        elif top_productos:
            foco_tipo = "producto"
            foco_nombre = top_productos[0]["nombre"]
            foco_uplift = top_productos[0]["uplift_ratio"]
            impacto_focalizado = float(top_productos[0].get("impacto_soles", 0.0))
    elif scope == "global":
        foco_tipo = "global"
        foco_nombre = None
        foco_uplift = round(uplift, 3)

    return foco_tipo, foco_nombre, foco_uplift, impacto_focalizado


@dataclass(slots=True, kw_only=True)
class _CampaignSuccessPayloadInput:
    """Snapshot of detection outputs for JSON payload (keeps arity low for Sonar)."""

    today: date
    recent_start: date
    baseline_start: date
    baseline_end: date
    n_recent: int
    dates_baseline: list[str]
    bs: dict
    rec: dict
    consecutive_up: int
    consecutive_down: int
    nivel: str
    tipo_sugerido: str | None
    scope: str | None
    campaign_detected: bool
    cierre_estado: str | None
    prods_sin_stock: list[str]
    prods_criticos: list[str]
    riesgo_stock: bool
    confidence: float
    mensaje: str
    recomendacion: str | None
    affected_cats: list[dict]
    top_productos: list[dict]
    uplift: float
    sum_uplift: float
    z: float
    actual_sum: float
    expected_sum: float
    expected_dow_sum: float
    actual_soles_sum: float
    expected_soles_sum: float
    impacto_soles: float
    impacto_focalizado: float
    foco_tipo: str | None
    foco_nombre: str | None
    foco_uplift: float | None


def _detect_campaign_success_payload(inp: _CampaignSuccessPayloadInput) -> dict:
    p = inp
    return {
        "status": "ok",
        "campaign_detected": p.campaign_detected,
        "nivel": p.nivel,
        "scope": p.scope,
        "foco_tipo": p.foco_tipo,
        "foco_nombre": p.foco_nombre,
        "foco_uplift": p.foco_uplift,
        "cierre_estado": p.cierre_estado,
        "riesgo_stock": p.riesgo_stock,
        "productos_sin_stock": p.prods_sin_stock,
        "productos_stock_critico": p.prods_criticos,
        "tipo_sugerido": p.tipo_sugerido,
        "confidence_pct": p.confidence,
        "mensaje": p.mensaje,
        "consistencia": {
            "dias_consecutivos_elevados": p.consecutive_up,
            "dias_consecutivos_normales": p.consecutive_down,
            "minimo_requerido": MIN_CONSISTENT_DAYS,
        },
        "metricas": {
            "baseline": p.bs,
            "reciente": p.rec,
            "uplift_ratio": round(p.uplift, 3),
            "uplift_pct": round((p.uplift - 1) * 100, 1),
            "sum_uplift": round(p.sum_uplift, 3),
            "uplift_dow_ajustado": round(p.uplift, 3),
            "z_score": round(p.z, 2),
            "actual_sum": round(p.actual_sum, 2),
            "expected_sum": round(p.expected_sum, 2),
            "expected_dow_sum": round(p.expected_dow_sum, 2),
            "ventas_soles_recientes": round(p.actual_soles_sum, 2),
            "ventas_soles_esperadas": round(p.expected_soles_sum, 2),
        },
        "impacto_estimado_soles": p.impacto_soles,
        "impacto_estimado_soles_focalizado": round(p.impacto_focalizado, 2),
        "categorias_afectadas": p.affected_cats,
        "top_productos": p.top_productos,
        "recomendacion": p.recomendacion,
        "ventanas": {
            "reciente": f"{p.recent_start.isoformat()} -> {p.today.isoformat()} ({p.n_recent} dias)",
            "baseline": (
                f"{p.baseline_start.isoformat()} -> {p.baseline_end.isoformat()} "
                f"({len(p.dates_baseline)} dias)"
            ),
        },
    }


