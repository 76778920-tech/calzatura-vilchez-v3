"""
Campaign detection engine v3 — Calzatura Vilchez.

v3 improvements:
  - DOW uses sum (not per-day ratios) — immune to zero-days collapsing the signal.
  - Focused campaign: category/product spike triggers even when global is below threshold.
  - scope / foco_tipo / foco_nombre / foco_uplift in result for easy DB querying.
  - Economic impact per category and product (impacto_soles).
  - impacto_estimado_soles_focalizado for focused campaigns.
  - Encoding: "campana-focalizada" (no special chars) for safe JSON/SQL storage.
"""

from collections import defaultdict
from dataclasses import dataclass
from datetime import date, timedelta

import numpy as np


# ── Constants ────────────────────────────────────────────────────────────────

MIN_BASELINE_DAYS    = 14
MIN_CONSISTENT_DAYS  = 2
FINALIZANDO_COOLDOWN = 2
FINALIZADA_COOLDOWN  = 4

UPLIFT_ALTA   = 2.0
UPLIFT_MEDIA  = 1.5
UPLIFT_BAJA   = 1.25

Z_ALTA  = 2.0
Z_MEDIA = 1.5
Z_BAJA  = 1.0

# Texto de respaldo en recomendaciones (evita literal duplicado — Sonar).
CATEGORIAS_ACTIVAS_LABEL = "categorias activas"

# ── Feedback learning ─────────────────────────────────────────────────────────

MIN_FEEDBACK_SAMPLES = 5     # minimum cases before adjusting thresholds
THRESHOLD_STEP       = 0.15  # uplift delta per adjustment cycle
UPLIFT_FLOOR         = 1.10  # no threshold will ever go below this
UPLIFT_CEIL          = 3.00  # no threshold will ever exceed this


def _compute_feedback_adjustments(stats: dict) -> dict:
    """
    Pure function: given feedback counts by scope, returns adjusted uplift
    thresholds to pass as threshold_overrides to detect_campaign.

    stats keys (all optional, default 0):
      global_confirmadas, global_descartadas
      focalizada_confirmadas, focalizada_descartadas

    Adjustment rules (per scope):
      precision < 40%  (too many false positives) → raise thresholds by THRESHOLD_STEP
      precision > 75%  (high hit rate)            → lower thresholds by THRESHOLD_STEP
      < MIN_FEEDBACK_SAMPLES or 40-75%            → no change

    Returns:
      uplift_alta, uplift_media, uplift_baja  (global scope adjustments)
      uplift_focalizada                       (focalizada scope adjustment)
    """
    def _delta(confirmadas: int, descartadas: int) -> float:
        total = confirmadas + descartadas
        if total < MIN_FEEDBACK_SAMPLES:
            return 0.0
        precision = confirmadas / total
        if precision < 0.40:
            return +THRESHOLD_STEP
        if precision > 0.75:
            return -THRESHOLD_STEP
        return 0.0

    d_global = _delta(
        int(stats.get("global_confirmadas",     0)),
        int(stats.get("global_descartadas",     0)),
    )
    d_foc = _delta(
        int(stats.get("focalizada_confirmadas", 0)),
        int(stats.get("focalizada_descartadas", 0)),
    )

    def _clamp(base: float, delta: float) -> float:
        return round(max(UPLIFT_FLOOR, min(UPLIFT_CEIL, base + delta)), 2)

    return {
        "uplift_alta":       _clamp(UPLIFT_ALTA,  d_global),
        "uplift_media":      _clamp(UPLIFT_MEDIA, d_global),
        "uplift_baja":       _clamp(UPLIFT_BAJA,  d_global),
        "uplift_focalizada": _clamp(UPLIFT_MEDIA, d_foc),
    }


# ── Helpers ──────────────────────────────────────────────────────────────────

def _safe_float(v) -> float:
    try:
        return float(v or 0)
    except (TypeError, ValueError):
        return 0.0


def _norm_date(raw) -> str:
    """Normalizes any date representation to YYYY-MM-DD (truncates timestamps)."""
    return str(raw or "")[:10]


def _date_range(start: date, end: date) -> list[str]:
    """ISO date list from start to end inclusive.
    len(_date_range(d, d + timedelta(days=N-1))) == N exactly."""
    out, cur = [], start
    while cur <= end:
        out.append(cur.isoformat())
        cur += timedelta(days=1)
    return out


def _fill_zeros(raw: dict[str, float], dates: list[str]) -> list[float]:
    return [raw.get(d, 0.0) for d in dates]


def _stats(values: list[float]) -> dict:
    if not values:
        return {"mean": 0, "median": 0, "std": 0, "p75": 0, "p90": 0, "n": 0}
    arr = np.array(values, dtype=float)
    return {
        "mean":   round(float(np.mean(arr)), 2),
        "median": round(float(np.median(arr)), 2),
        "std":    round(float(np.std(arr)), 2),
        "p75":    round(float(np.percentile(arr, 75)), 2),
        "p90":    round(float(np.percentile(arr, 90)), 2),
        "n":      len(values),
    }


def _consecutive_elevated_days(
    raw: dict[str, float],
    dates_recent: list[str],
    threshold: float,
) -> int:
    count = 0
    for d in reversed(dates_recent):
        if raw.get(d, 0.0) > threshold:
            count += 1
        else:
            break
    return count


def _consecutive_normal_days(
    raw: dict[str, float],
    dates_recent: list[str],
    threshold: float,
) -> int:
    count = 0
    for d in reversed(dates_recent):
        if raw.get(d, 0.0) <= threshold:
            count += 1
        else:
            break
    return count


def _aggregate_sales_for_campaign(
    daily_sales: list[dict],
    product_category: dict[str, str],
) -> tuple[
    dict[str, float],
    dict[str, float],
    dict[str, dict[str, float]],
    dict[str, dict[str, float]],
    dict[str, dict[str, float]],
    dict[str, dict[str, float]],
    dict[str, dict],
]:
    """Acumula ventas por dimensión para la detección de campaña."""
    raw_global: dict[str, float] = defaultdict(float)
    raw_global_soles: dict[str, float] = defaultdict(float)
    raw_by_cat: dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))
    raw_by_cat_soles: dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))
    raw_by_product: dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))
    raw_by_prod_soles: dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))
    product_meta: dict[str, dict] = {}

    for sale in daily_sales:
        if sale.get("devuelto"):
            continue
        fecha = _norm_date(sale.get("fecha", ""))
        qty = _safe_float(sale.get("cantidad", 0))
        precio = _safe_float(sale.get("precioVenta", 0))
        pid = str(sale.get("productId", ""))
        nombre = str(sale.get("nombre", ""))
        if not fecha or qty <= 0:
            continue
        soles = qty * precio
        raw_global[fecha] += qty
        raw_global_soles[fecha] += soles
        cat = product_category.get(pid, "sin_categoria")
        raw_by_cat[cat][fecha] += qty
        raw_by_cat_soles[cat][fecha] += soles
        raw_by_product[pid][fecha] += qty
        raw_by_prod_soles[pid][fecha] += soles
        if pid not in product_meta:
            product_meta[pid] = {"nombre": nombre, "categoria": cat}

    return (
        raw_global,
        raw_global_soles,
        raw_by_cat,
        raw_by_cat_soles,
        raw_by_product,
        raw_by_prod_soles,
        product_meta,
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


# ── Core detection ───────────────────────────────────────────────────────────

def detect_campaign(
    daily_sales: list[dict],
    products: list[dict],
    recent_days: int = 7,
    baseline_days: int = 60,
    threshold_overrides: dict | None = None,
) -> dict:
    # Apply feedback-learned thresholds; fall back to module constants.
    _uplift_alta  = (threshold_overrides or {}).get("uplift_alta",       UPLIFT_ALTA)
    _uplift_media = (threshold_overrides or {}).get("uplift_media",      UPLIFT_MEDIA)
    _uplift_baja  = (threshold_overrides or {}).get("uplift_baja",       UPLIFT_BAJA)
    _uplift_foc   = (threshold_overrides or {}).get("uplift_focalizada", UPLIFT_MEDIA)

    today = date.today()

    # Exact windows: N days means exactly N calendar days.
    recent_start   = today - timedelta(days=recent_days - 1)
    baseline_end   = recent_start - timedelta(days=1)
    baseline_start = baseline_end - timedelta(days=baseline_days - 1)

    dates_baseline = _date_range(baseline_start, baseline_end)
    dates_recent   = _date_range(recent_start, today)
    n_recent       = len(dates_recent)

    product_category: dict[str, str] = {
        str(p.get("id", "")): str(p.get("categoria", "sin_categoria"))
        for p in products
    }
    product_stock: dict[str, int] = {
        str(p.get("id", "")): int(p.get("stock") or 0)
        for p in products
    }

    # ── Accumulate sales ─────────────────────────────────────────────────────
    (
        raw_global,
        raw_global_soles,
        raw_by_cat,
        raw_by_cat_soles,
        raw_by_product,
        raw_by_prod_soles,
        product_meta,
    ) = _aggregate_sales_for_campaign(daily_sales, product_category)

    baseline_vals = _fill_zeros(raw_global, dates_baseline)
    recent_vals   = _fill_zeros(raw_global, dates_recent)

    days_with_sales = sum(1 for v in baseline_vals if v > 0)
    if days_with_sales < MIN_BASELINE_DAYS:
        return _insufficient_data(
            days_with_sales, recent_start, today,
            baseline_start, baseline_end, n_recent, len(dates_baseline),
        )

    # ── Baseline stats ───────────────────────────────────────────────────────
    bs = _stats(baseline_vals)
    rec = _stats(recent_vals)

    (
        expected_dow_sum,
        actual_sum,
        expected_sum,
        sum_uplift,
        uplift,
        _std_floor,
        z,
        threshold_units,
    ) = _compute_uplift_and_z_metrics(
        raw_global, dates_baseline, dates_recent, recent_vals, bs, n_recent, _uplift_baja
    )
    consecutive_up = _consecutive_elevated_days(raw_global, dates_recent, threshold_units)
    consecutive_down = _consecutive_normal_days(raw_global, dates_recent, threshold_units)

    # ── Categories & products (before nivel — needed for focused detection) ──
    affected_cats = _compute_category_uplift(
        raw_by_cat, raw_by_cat_soles, dates_baseline, dates_recent,
        uplift_threshold=_uplift_baja,
    )
    top_productos = _compute_product_uplift(
        raw_by_product, raw_by_prod_soles, product_meta, product_stock,
        dates_baseline, dates_recent,
        uplift_threshold=_uplift_baja,
    )

    # ── Campaign level (global → focused fallback) ────────────────────────────
    nivel, tipo_sugerido, scope, label = _classify_campaign_signal(
        uplift,
        z,
        consecutive_up,
        affected_cats,
        top_productos,
        uplift_alta=_uplift_alta,
        uplift_media=_uplift_media,
        uplift_baja=_uplift_baja,
        uplift_focalizada=_uplift_foc,
    )

    # ── Close state (check finalizada before finalizando) ────────────────────
    cierre_estado = _compute_cierre_estado(nivel, consecutive_down)

    campaign_detected = nivel not in ("normal", "observando")

    # ── Stock risk: active campaign with zero/critical stock products ─────────
    _prods_sin_stock, _prods_criticos = _stock_lists_from_top_productos(top_productos)
    riesgo_stock = campaign_detected and bool(_prods_sin_stock or _prods_criticos)

    # ── Composite confidence ──────────────────────────────────────────────────
    confidence = _confidence_pct_for_campaign(
        uplift, z, consecutive_up, scope, affected_cats, top_productos, _uplift_alta
    )

    # ── Global economic impact ────────────────────────────────────────────────
    bs_soles           = _stats(_fill_zeros(raw_global_soles, dates_baseline))
    actual_soles_sum   = sum(_fill_zeros(raw_global_soles, dates_recent))
    expected_soles_sum = (bs_soles["mean"] or 0.0) * n_recent
    impacto_soles = round(max(actual_soles_sum - expected_soles_sum, 0.0), 2)

    foco_tipo, foco_nombre, foco_uplift, impacto_focalizado = _resolve_focus_and_impacto(
        scope, uplift, affected_cats, top_productos
    )

    # ── Messages ──────────────────────────────────────────────────────────────
    recomendacion = _build_recommendation(nivel, uplift, affected_cats, top_productos, tipo_sugerido)
    mensaje       = _build_message(nivel, label, uplift, z, confidence, affected_cats, consecutive_up, scope, uplift_baja=_uplift_baja)

    return _detect_campaign_success_payload(
        _CampaignSuccessPayloadInput(
            today=today,
            recent_start=recent_start,
            baseline_start=baseline_start,
            baseline_end=baseline_end,
            n_recent=n_recent,
            dates_baseline=dates_baseline,
            bs=bs,
            rec=rec,
            consecutive_up=consecutive_up,
            consecutive_down=consecutive_down,
            nivel=nivel,
            tipo_sugerido=tipo_sugerido,
            scope=scope,
            campaign_detected=campaign_detected,
            cierre_estado=cierre_estado,
            prods_sin_stock=_prods_sin_stock,
            prods_criticos=_prods_criticos,
            riesgo_stock=riesgo_stock,
            confidence=confidence,
            mensaje=mensaje,
            recomendacion=recomendacion,
            affected_cats=affected_cats,
            top_productos=top_productos,
            uplift=uplift,
            sum_uplift=sum_uplift,
            z=z,
            actual_sum=actual_sum,
            expected_sum=expected_sum,
            expected_dow_sum=expected_dow_sum,
            actual_soles_sum=actual_soles_sum,
            expected_soles_sum=expected_soles_sum,
            impacto_soles=impacto_soles,
            impacto_focalizado=impacto_focalizado,
            foco_tipo=foco_tipo,
            foco_nombre=foco_nombre,
            foco_uplift=foco_uplift,
        )
    )


# ── Sub-functions ─────────────────────────────────────────────────────────────

def _insufficient_data(
    days_with_sales, recent_start, today,
    baseline_start, baseline_end,
    n_recent, n_baseline,
) -> dict:
    return {
        "status":             "datos_insuficientes",
        "campaign_detected":  False,
        "nivel":              "normal",
        "scope":              None,
        "foco_tipo":          None,
        "foco_nombre":        None,
        "foco_uplift":        None,
        "cierre_estado":      None,
        "riesgo_stock":       False,
        "productos_sin_stock":     [],
        "productos_stock_critico": [],
        "tipo_sugerido":      None,
        "confidence_pct":     0.0,
        "mensaje": (
            f"Se necesitan al menos {MIN_BASELINE_DAYS} dias con ventas registradas. "
            f"Actualmente hay {days_with_sales} dias con datos. "
            "El sistema comenzara a detectar patrones automaticamente conforme crezca el historial."
        ),
        "consistencia":                     {"dias_consecutivos_elevados": 0, "dias_consecutivos_normales": 0, "minimo_requerido": MIN_CONSISTENT_DAYS},
        "metricas":                         {},
        "impacto_estimado_soles":           0.0,
        "impacto_estimado_soles_focalizado": 0.0,
        "categorias_afectadas":             [],
        "top_productos":                    [],
        "recomendacion":                    None,
        "ventanas": {
            "reciente": f"{recent_start.isoformat()} -> {today.isoformat()} ({n_recent} dias)",
            "baseline": f"{baseline_start.isoformat()} -> {baseline_end.isoformat()} ({n_baseline} dias)",
        },
    }


def _compute_category_uplift(
    raw_by_cat: dict,
    raw_by_cat_soles: dict,
    dates_baseline: list[str],
    dates_recent: list[str],
    uplift_threshold: float = UPLIFT_BAJA,
) -> list[dict]:
    """Category uplift using sums (not medians). Includes per-category economic impact."""
    affected: list[dict] = []
    n_recent = len(dates_recent)
    for cat, by_date in raw_by_cat.items():
        cat_bs  = _fill_zeros(by_date, dates_baseline)
        cat_rec = _fill_zeros(by_date, dates_recent)
        if sum(1 for v in cat_bs if v > 0) < 5 or all(v == 0 for v in cat_rec):
            continue
        cat_bs_mean  = float(np.mean(cat_bs))
        cat_rec_sum  = sum(cat_rec)
        cat_exp_sum  = cat_bs_mean * n_recent
        if cat_exp_sum <= 0:
            continue
        cat_uplift = cat_rec_sum / cat_exp_sum
        if cat_uplift < uplift_threshold:
            continue

        # Economic impact for this category
        soles_bs   = _fill_zeros(raw_by_cat_soles.get(cat, {}), dates_baseline)
        soles_rec  = _fill_zeros(raw_by_cat_soles.get(cat, {}), dates_recent)
        soles_mean = float(np.mean(soles_bs))
        soles_sum  = sum(soles_rec)
        cat_impacto = round(max(soles_sum - soles_mean * n_recent, 0.0), 2)

        affected.append({
            "categoria":                cat,
            "uplift_ratio":             round(cat_uplift, 2),
            "uplift_pct":               round((cat_uplift - 1) * 100, 1),
            "ventas_recientes_sum":     round(cat_rec_sum, 2),
            "ventas_esperadas_sum":     round(cat_exp_sum, 2),
            "ventas_recientes_median":  round(float(np.median(cat_rec)), 2),
            "ventas_historicas_median": round(float(np.median(cat_bs)), 2),
            "impacto_soles":            cat_impacto,
        })
    affected.sort(key=lambda x: x["uplift_ratio"], reverse=True)
    return affected


def _compute_product_uplift(
    raw_by_product: dict,
    raw_by_prod_soles: dict,
    product_meta: dict,
    product_stock: dict,
    dates_baseline: list[str],
    dates_recent: list[str],
    uplift_threshold: float = UPLIFT_BAJA,
) -> list[dict]:
    """Top 10 real products with individual uplift, stock, and soles impact."""
    results: list[dict] = []
    n_recent = len(dates_recent)
    for pid, by_date in raw_by_product.items():
        prod_bs  = _fill_zeros(by_date, dates_baseline)
        prod_rec = _fill_zeros(by_date, dates_recent)
        if sum(1 for v in prod_bs if v > 0) < 3 or all(v == 0 for v in prod_rec):
            continue
        prod_bs_mean = float(np.mean(prod_bs))
        prod_rec_sum = sum(prod_rec)
        prod_exp_sum = prod_bs_mean * n_recent
        if prod_exp_sum <= 0:
            continue
        prod_uplift = prod_rec_sum / prod_exp_sum
        if prod_uplift < uplift_threshold:
            continue

        soles_bs    = _fill_zeros(raw_by_prod_soles.get(pid, {}), dates_baseline)
        soles_rec   = _fill_zeros(raw_by_prod_soles.get(pid, {}), dates_recent)
        soles_mean  = float(np.mean(soles_bs))
        soles_sum   = sum(soles_rec)
        prod_impacto = round(max(soles_sum - soles_mean * n_recent, 0.0), 2)

        meta = product_meta.get(pid, {})
        results.append({
            "producto_id":      pid,
            "nombre":           meta.get("nombre", pid),
            "categoria":        meta.get("categoria", "sin_categoria"),
            "uplift_ratio":     round(prod_uplift, 2),
            "uplift_pct":       round((prod_uplift - 1) * 100, 1),
            "ventas_recientes": round(prod_rec_sum, 2),
            "ventas_baseline":  round(prod_exp_sum, 2),
            "stock_actual":     product_stock.get(pid),
            "impacto_soles":    prod_impacto,
        })
    results.sort(key=lambda x: x["uplift_ratio"], reverse=True)
    return results[:10]


def _build_message(
    nivel, label, uplift, z, confidence, affected_cats, consecutive_up, scope,
    uplift_baja: float = UPLIFT_BAJA,
) -> str:
    if nivel in ("normal", "observando"):
        if nivel == "observando" and scope == "focalizada":
            best = affected_cats[0]["categoria"] if affected_cats else "un segmento"
            return (
                f"Senal focalizada emergente en '{best}' ({uplift:.2f}x el promedio global). "
                "Aun no cumple los criterios de campana completa. El sistema continuara monitoreando."
            )
        if nivel == "observando":
            return (
                f"Senal emergente detectada ({uplift:.2f}x el promedio, {consecutive_up} dia(s) elevado). "
                f"Aun no cumple los {MIN_CONSISTENT_DAYS} dias consecutivos requeridos. "
                "El sistema continuara monitoreando."
            )
        return (
            f"Ventas dentro del rango historico normal. "
            f"Uplift actual: {uplift:.2f}x (umbral: {uplift_baja}x). "
            "No se detecta campana activa."
        )
    if scope == "focalizada":
        focus = affected_cats[0]["categoria"] if affected_cats else "segmento especifico"
        cat_uplift = affected_cats[0]["uplift_ratio"] if affected_cats else uplift
        return (
            f"{label}. "
            f"La categoria '{focus}' registra {cat_uplift:.1f}x su promedio historico. "
            f"El total global no supera el umbral, pero el segmento muestra actividad significativa. "
            f"Confianza: {confidence}%."
        )
    cat_names = ", ".join(c["categoria"] for c in affected_cats[:3]) or "general"
    return (
        f"Posible campana detectada ({label}). "
        f"Ventas {uplift:.1f}x sobre el promedio ajustado por dia de semana "
        f"durante {consecutive_up} dia(s) consecutivo(s). "
        f"Categorias afectadas: {cat_names}. "
        f"Z-score: {z:.2f} | Confianza: {confidence}%."
    )


def _append_strategic_focalizada(
    parts: list[str],
    affected_cats: list[dict],
    top_productos: list[dict],
) -> None:
    if affected_cats:
        focus = f"categoria '{affected_cats[0]['categoria']}'"
        cat_up = affected_cats[0]["uplift_ratio"]
        parts.append(
            f"Campana focalizada en {focus} ({cat_up:.1f}x): "
            "monitorear si el pico se extiende a otras categorias en los proximos 3 dias"
        )
    elif top_productos:
        focus = top_productos[0]["nombre"]
        parts.append(
            f"Pico focalizado en '{focus}': verificar si hay campana externa activa "
            "en ese segmento (redes sociales, influencer, feria)"
        )


def _append_cyber_wow_high_demand_line(parts: list[str], affected_cats: list[dict]) -> None:
    cats = [c["categoria"] for c in affected_cats[:2]]
    cat_str = " y ".join(cats) if cats else "los productos mas vendidos"
    parts.append(
        f"Demanda alta en {cat_str}: coordinar reposicion con fabricantes "
        "y activar banner promocional antes de que se agote el stock"
    )


def _append_strategic_outlet(parts: list[str], affected_cats: list[dict]) -> None:
    cats = [c["categoria"] for c in affected_cats[:2]]
    cat_str = " y ".join(cats) if cats else CATEGORIAS_ACTIVAS_LABEL
    parts.append(
        f"Contexto outlet activo en {cat_str}: "
        "aprovechar para liquidar modelos de temporada anterior con descuento controlado"
    )


def _append_strategic_nueva_temporada(parts: list[str], affected_cats: list[dict]) -> None:
    cats = [c["categoria"] for c in affected_cats[:2]]
    cat_str = " y ".join(cats) if cats else CATEGORIAS_ACTIVAS_LABEL
    parts.append(
        f"Inicio de temporada en {cat_str}: "
        "asegurar stock de modelos nuevos y actualizar el catalogo visible en tienda"
    )


def _append_strategic_media_fallback(
    parts: list[str],
    nivel: str,
    uplift: float,
    affected_cats: list[dict],
) -> None:
    if nivel == "media" and not parts:
        cats = [c["categoria"] for c in affected_cats[:2]]
        cat_str = " y ".join(cats) if cats else CATEGORIAS_ACTIVAS_LABEL
        parts.append(
            f"Actividad elevada en {cat_str} ({uplift:.1f}x): "
            "verificar stock y monitorear evolucion los proximos 3 dias"
        )


def _append_recommendation_strategic_blocks(
    parts: list[str],
    tipo: str | None,
    nivel: str,
    uplift: float,
    affected_cats: list[dict],
    top_productos: list[dict],
) -> None:
    """Añade consejos según tipo de campaña (muta `parts` in-place)."""
    if tipo == "campana-focalizada":
        _append_strategic_focalizada(parts, affected_cats, top_productos)
        return

    if tipo in ("cyber-wow", None) and nivel == "alta":
        _append_cyber_wow_high_demand_line(parts, affected_cats)
        return

    if tipo == "outlet":
        _append_strategic_outlet(parts, affected_cats)
        return

    if tipo == "nueva-temporada":
        _append_strategic_nueva_temporada(parts, affected_cats)
        return

    _append_strategic_media_fallback(parts, nivel, uplift, affected_cats)


def _bucket_products_by_stock_health(
    top_productos: list[dict],
) -> tuple[list[str], list[dict], list[dict], list[dict]]:
    sin_stock: list[str] = []
    critico: list[dict] = []
    bajo: list[dict] = []
    ok_alta: list[dict] = []
    for prod in top_productos[:6]:
        nombre = prod.get("nombre", "Producto")
        prod_up = prod.get("uplift_ratio", 0.0)
        stock = prod.get("stock_actual")
        impacto = prod.get("impacto_soles", 0.0) or 0.0
        ventas_rec = prod.get("ventas_recientes", 0.0) or 0.0

        if stock is None or stock == 0:
            sin_stock.append(nombre)
        elif ventas_rec > 0 and stock < ventas_rec:
            critico.append({"nombre": nombre, "uplift": prod_up, "impacto": impacto, "stock": stock})
        elif ventas_rec > 0 and stock < ventas_rec * 2:
            bajo.append({"nombre": nombre, "uplift": prod_up, "impacto": impacto, "stock": stock})
        elif prod_up >= UPLIFT_MEDIA:
            ok_alta.append({"nombre": nombre, "uplift": prod_up, "impacto": impacto, "stock": stock})
    return sin_stock, critico, bajo, ok_alta


def _append_sin_stock_recommendation(parts: list[str], sin_stock: list[str]) -> None:
    if not sin_stock:
        return
    names = " y ".join(sin_stock[:2]) + (" y otros" if len(sin_stock) > 2 else "")
    parts.append(f"Sin stock: {names} - ventas perdidas activas, reponer de inmediato")


def _append_critico_stock_lines(parts: list[str], critico: list[dict]) -> None:
    for p in critico[:2]:
        imp_str = f", impacto S/ {p['impacto']:.0f}" if p["impacto"] > 0 else ""
        parts.append(
            f"Reponer urgente {p['nombre']}: "
            f"stock {p['stock']} u., uplift {p['uplift']:.1f}x{imp_str}"
        )


def _append_bajo_stock_lines(parts: list[str], bajo: list[dict]) -> None:
    for p in bajo[:2]:
        imp_str = f", impacto S/ {p['impacto']:.0f}" if p["impacto"] > 0 else ""
        parts.append(
            f"Reponer {p['nombre']}: stock bajo ({p['stock']} u.), "
            f"uplift {p['uplift']:.1f}x{imp_str}"
        )


def _append_ok_alta_rotacion_lines(
    parts: list[str], ok_alta: list[dict], nivel: str
) -> None:
    if not ok_alta:
        return
    p = ok_alta[0]
    if nivel == "alta":
        parts.append(
            f"{p['nombre']} rota {p['uplift']:.1f}x - "
            "no aplicar descuento adicional, la demanda es organica y el margen no lo necesita"
        )
        return
    if nivel in ("media", "baja"):
        imp_str = f" (S/ {p['impacto']:.0f} sobre lo esperado)" if p["impacto"] > 0 else ""
        parts.append(
            f"{p['nombre']} con uplift {p['uplift']:.1f}x{imp_str} - "
            "evaluar promocion activa para sostener el momentum"
        )


def _build_recommendation(
    nivel: str,
    uplift: float,
    affected_cats: list[dict],
    top_productos: list[dict],
    tipo: str | None,
) -> str | None:
    """
    Smart recommendation using real stock, uplift and economic impact per product.
    Priority order: sin_stock > critico > bajo > ok_alta_rotacion > strategic_advice.
    """
    if nivel in ("normal", "observando"):
        return None

    # ── Classify products by stock health ────────────────────────────────────
    # sin_stock  : stock == 0 or None  → ventas perdidas activas
    # critico    : stock < ventas_recientes  → no sobrevive otro periodo igual
    # bajo       : stock < ventas_recientes * 2  → agota en ~2 periodos
    # ok_alta    : stock OK + uplift >= UPLIFT_MEDIA  → rotan bien, cuidado con descuento

    sin_stock, critico, bajo, ok_alta = _bucket_products_by_stock_health(top_productos)

    parts: list[str] = []
    _append_sin_stock_recommendation(parts, sin_stock)
    _append_critico_stock_lines(parts, critico)
    _append_bajo_stock_lines(parts, bajo)
    _append_ok_alta_rotacion_lines(parts, ok_alta, nivel)

    _append_recommendation_strategic_blocks(
        parts, tipo, nivel, uplift, affected_cats, top_productos
    )

    # ── Fallback si no hay productos con datos suficientes ───────────────────
    if not parts:
        cats = [c["categoria"] for c in affected_cats[:2]]
        cat_str = " y ".join(cats) if cats else "general"
        return (
            f"Actividad {nivel} detectada en {cat_str} ({uplift:.1f}x el promedio historico). "
            "Revisar stock de los productos mas vendidos y mantener monitoreo activo."
        )

    return " | ".join(parts) + "."
