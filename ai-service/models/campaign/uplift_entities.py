"""Campaign detection — uplift_entities.py."""

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


