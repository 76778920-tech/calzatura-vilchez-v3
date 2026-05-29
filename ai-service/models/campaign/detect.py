"""Campaign detection — detect.py."""

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
    _aggregate_sales_for_campaign,
    _consecutive_elevated_days,
    _consecutive_normal_days,
    _date_range,
    _fill_zeros,
    _safe_float,
    _stats,
)
from models.campaign.messaging import _build_message
from models.campaign.recommendations import _build_recommendation
from models.campaign.signal_metrics import (
    _CampaignSuccessPayloadInput,
    _classify_campaign_signal,
    _compute_cierre_estado,
    _compute_uplift_and_z_metrics,
    _confidence_pct_for_campaign,
    _detect_campaign_success_payload,
    _resolve_focus_and_impacto,
    _stock_lists_from_top_productos,
)
from models.campaign.uplift_entities import (
    _compute_category_uplift,
    _compute_product_uplift,
    _insufficient_data,
)

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
