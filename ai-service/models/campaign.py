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


# ── Core detection ───────────────────────────────────────────────────────────

def detect_campaign(
    daily_sales: list[dict],
    products: list[dict],
    recent_days: int = 7,
    baseline_days: int = 60,
) -> dict:
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
    raw_global:        dict[str, float] = defaultdict(float)
    raw_global_soles:  dict[str, float] = defaultdict(float)
    raw_by_cat:        dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))
    raw_by_cat_soles:  dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))
    raw_by_product:    dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))
    raw_by_prod_soles: dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))
    product_meta:      dict[str, dict]  = {}

    for sale in daily_sales:
        if sale.get("devuelto"):
            continue
        fecha  = _norm_date(sale.get("fecha", ""))
        qty    = _safe_float(sale.get("cantidad", 0))
        precio = _safe_float(sale.get("precioVenta", 0))
        pid    = str(sale.get("productId", ""))
        nombre = str(sale.get("nombre", ""))
        if not fecha or qty <= 0:
            continue
        soles = qty * precio
        raw_global[fecha]          += qty
        raw_global_soles[fecha]    += soles
        cat = product_category.get(pid, "sin_categoria")
        raw_by_cat[cat][fecha]       += qty
        raw_by_cat_soles[cat][fecha] += soles
        raw_by_product[pid][fecha]   += qty
        raw_by_prod_soles[pid][fecha] += soles
        if pid not in product_meta:
            product_meta[pid] = {"nombre": nombre, "categoria": cat}

    baseline_vals = _fill_zeros(raw_global, dates_baseline)
    recent_vals   = _fill_zeros(raw_global, dates_recent)

    days_with_sales = sum(1 for v in baseline_vals if v > 0)
    if days_with_sales < MIN_BASELINE_DAYS:
        return _insufficient_data(
            days_with_sales, recent_start, today,
            baseline_start, baseline_end, n_recent, len(dates_baseline),
        )

    # ── Baseline stats ───────────────────────────────────────────────────────
    bs  = _stats(baseline_vals)
    rec = _stats(recent_vals)

    # DOW table (baseline mean per weekday)
    baseline_by_weekday: dict[int, list[float]] = defaultdict(list)
    for d_iso in dates_baseline:
        baseline_by_weekday[date.fromisoformat(d_iso).weekday()].append(
            raw_global.get(d_iso, 0.0)
        )

    # ── DOW-adjusted expected sum (Fix: no per-day ratios) ───────────────────
    # For each recent day we use the historical mean for that weekday as
    # expected value, then sum. This avoids collapsing to 0 when several
    # recent days have no sales.
    expected_dow_sum = sum(
        float(np.mean(baseline_by_weekday[date.fromisoformat(d).weekday()]))
        if baseline_by_weekday.get(date.fromisoformat(d).weekday())
        else (bs["mean"] or 0.0)
        for d in dates_recent
    )

    actual_sum   = sum(recent_vals)
    expected_sum = (bs["mean"] or 0.0) * n_recent
    sum_uplift   = actual_sum / expected_sum       if expected_sum > 0 else 0.0
    uplift       = actual_sum / expected_dow_sum   if expected_dow_sum > 0 else sum_uplift

    # ── Z-score (sum-based, DOW-adjusted) ────────────────────────────────────
    std_floor = max(bs["std"], bs["mean"] * 0.1, 0.5)
    z = (actual_sum - expected_dow_sum) / (std_floor * (n_recent ** 0.5))

    # ── Consistency ──────────────────────────────────────────────────────────
    threshold_units  = max(bs["mean"] * UPLIFT_BAJA, 0.01)
    consecutive_up   = _consecutive_elevated_days(raw_global, dates_recent, threshold_units)
    consecutive_down = _consecutive_normal_days(raw_global, dates_recent, threshold_units)

    # ── Categories & products (before nivel — needed for focused detection) ──
    affected_cats = _compute_category_uplift(
        raw_by_cat, raw_by_cat_soles, dates_baseline, dates_recent,
    )
    top_productos = _compute_product_uplift(
        raw_by_product, raw_by_prod_soles, product_meta, product_stock,
        dates_baseline, dates_recent,
    )

    # ── Campaign level (global → focused fallback) ────────────────────────────
    scope: str | None = None

    if uplift >= UPLIFT_ALTA and z >= Z_ALTA and consecutive_up >= MIN_CONSISTENT_DAYS:
        nivel, tipo_sugerido, scope = "alta",  "cyber-wow",     "global"
        label = "Campana de alta demanda"
    elif uplift >= UPLIFT_MEDIA and z >= Z_MEDIA and consecutive_up >= MIN_CONSISTENT_DAYS:
        nivel, tipo_sugerido, scope = "media", "outlet",         "global"
        label = "Posible campana activa"
    elif uplift >= UPLIFT_BAJA and z >= Z_BAJA and consecutive_up >= MIN_CONSISTENT_DAYS:
        nivel, tipo_sugerido, scope = "baja",  "nueva-temporada", "global"
        label = "Actividad elevada / posible inicio de temporada"
    elif uplift >= UPLIFT_BAJA and consecutive_up >= 1:
        nivel, tipo_sugerido, scope = "observando", None, "global"
        label = "Senal emergente - en observacion"
    else:
        nivel, tipo_sugerido = "normal", None
        label = "Ventas dentro del rango historico normal"

        # Focused detection: one category or product is spiking
        best_cat_u  = affected_cats[0]["uplift_ratio"]  if affected_cats  else 0.0
        best_prod_u = top_productos[0]["uplift_ratio"] if top_productos else 0.0
        best_focused = max(best_cat_u, best_prod_u)

        if best_focused >= UPLIFT_MEDIA:
            nivel, tipo_sugerido, scope = "baja", "campana-focalizada", "focalizada"
            focus_name = (
                affected_cats[0]["categoria"] if best_cat_u >= best_prod_u
                else top_productos[0]["nombre"]
            )
            label = f"Campana focalizada en '{focus_name}'"
        elif best_focused >= UPLIFT_BAJA:
            nivel, tipo_sugerido, scope = "observando", None, "focalizada"
            label = "Senal focalizada emergente - en observacion"

    # ── Close state (check finalizada before finalizando) ────────────────────
    cierre_estado = None
    if nivel == "normal":
        if consecutive_down >= FINALIZADA_COOLDOWN:
            cierre_estado = "finalizada"
        elif consecutive_down >= FINALIZANDO_COOLDOWN:
            cierre_estado = "finalizando"

    campaign_detected = nivel not in ("normal", "observando")

    # ── Composite confidence ──────────────────────────────────────────────────
    c_uplift = min(max((uplift - 1.0) / (UPLIFT_ALTA - 1.0), 0.0), 1.0)
    c_z      = min(max(z / (Z_ALTA * 2.0), 0.0), 1.0)
    c_cons   = min(consecutive_up / max(MIN_CONSISTENT_DAYS * 3, 1), 1.0)
    if scope == "focalizada":
        best_focused = max(
            affected_cats[0]["uplift_ratio"]  if affected_cats  else 0.0,
            top_productos[0]["uplift_ratio"] if top_productos else 0.0,
        )
        c_uplift = max(c_uplift, min((best_focused - 1.0) / (UPLIFT_ALTA - 1.0), 1.0))
    confidence = round((0.40 * c_uplift + 0.35 * c_z + 0.25 * c_cons) * 100, 1)

    # ── Global economic impact ────────────────────────────────────────────────
    bs_soles           = _stats(_fill_zeros(raw_global_soles, dates_baseline))
    actual_soles_sum   = sum(_fill_zeros(raw_global_soles, dates_recent))
    expected_soles_sum = (bs_soles["mean"] or 0.0) * n_recent
    impacto_soles      = round(max(actual_soles_sum - expected_soles_sum, 0.0), 2)

    # ── Focused economic impact + focus fields ────────────────────────────────
    foco_tipo: str | None    = None
    foco_nombre: str | None  = None
    foco_uplift: float | None = None
    impacto_focalizado        = 0.0

    if scope == "focalizada" and (affected_cats or top_productos):
        best_cat_u  = affected_cats[0]["uplift_ratio"]  if affected_cats  else 0.0
        best_prod_u = top_productos[0]["uplift_ratio"] if top_productos else 0.0
        if best_cat_u >= best_prod_u and affected_cats:
            foco_tipo     = "categoria"
            foco_nombre   = affected_cats[0]["categoria"]
            foco_uplift   = affected_cats[0]["uplift_ratio"]
            impacto_focalizado = float(affected_cats[0].get("impacto_soles", 0.0))
        elif top_productos:
            foco_tipo     = "producto"
            foco_nombre   = top_productos[0]["nombre"]
            foco_uplift   = top_productos[0]["uplift_ratio"]
            impacto_focalizado = float(top_productos[0].get("impacto_soles", 0.0))
    elif scope == "global":
        foco_tipo   = "global"
        foco_nombre = None
        foco_uplift = round(uplift, 3)

    # ── Messages ──────────────────────────────────────────────────────────────
    recomendacion = _build_recommendation(nivel, uplift, affected_cats, top_productos, tipo_sugerido, scope, n_recent)
    mensaje       = _build_message(nivel, label, uplift, z, confidence, affected_cats, consecutive_up, scope)

    return {
        "status":             "ok",
        "campaign_detected":  campaign_detected,
        "nivel":              nivel,
        "scope":              scope,
        "foco_tipo":          foco_tipo,
        "foco_nombre":        foco_nombre,
        "foco_uplift":        foco_uplift,
        "cierre_estado":      cierre_estado,
        "tipo_sugerido":      tipo_sugerido,
        "confidence_pct":     confidence,
        "mensaje":            mensaje,
        "consistencia": {
            "dias_consecutivos_elevados": consecutive_up,
            "dias_consecutivos_normales": consecutive_down,
            "minimo_requerido":          MIN_CONSISTENT_DAYS,
        },
        "metricas": {
            "baseline":              bs,
            "reciente":              rec,
            "uplift_ratio":          round(uplift, 3),
            "uplift_pct":            round((uplift - 1) * 100, 1),
            "sum_uplift":            round(sum_uplift, 3),
            "uplift_dow_ajustado":   round(uplift, 3),
            "z_score":               round(z, 2),
            "actual_sum":            round(actual_sum, 2),
            "expected_sum":          round(expected_sum, 2),
            "expected_dow_sum":      round(expected_dow_sum, 2),
            "ventas_soles_recientes": round(actual_soles_sum, 2),
            "ventas_soles_esperadas": round(expected_soles_sum, 2),
        },
        "impacto_estimado_soles":           impacto_soles,
        "impacto_estimado_soles_focalizado": round(impacto_focalizado, 2),
        "categorias_afectadas":             affected_cats,
        "top_productos":                    top_productos,
        "recomendacion":                    recomendacion,
        "ventanas": {
            "reciente": f"{recent_start.isoformat()} -> {today.isoformat()} ({n_recent} dias)",
            "baseline": f"{baseline_start.isoformat()} -> {baseline_end.isoformat()} ({len(dates_baseline)} dias)",
        },
    }


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
        if cat_uplift < UPLIFT_BAJA:
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
        if prod_uplift < UPLIFT_BAJA:
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
    nivel, label, uplift, z, confidence, affected_cats, consecutive_up, scope
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
            f"Uplift actual: {uplift:.2f}x (umbral: {UPLIFT_BAJA}x). "
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


def _build_recommendation(
    nivel: str,
    uplift: float,
    affected_cats: list[dict],
    top_productos: list[dict],
    tipo: str | None,
    scope: str | None,
    n_recent: int = 7,
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

    sin_stock: list[str] = []
    critico:   list[dict] = []
    bajo:      list[dict] = []
    ok_alta:   list[dict] = []

    for prod in top_productos[:6]:
        nombre     = prod.get("nombre", "Producto")
        prod_up    = prod.get("uplift_ratio", 0.0)
        stock      = prod.get("stock_actual")
        impacto    = prod.get("impacto_soles", 0.0) or 0.0
        ventas_rec = prod.get("ventas_recientes", 0.0) or 0.0

        if stock is None or stock == 0:
            sin_stock.append(nombre)
        elif ventas_rec > 0 and stock < ventas_rec:
            critico.append({"nombre": nombre, "uplift": prod_up, "impacto": impacto, "stock": stock})
        elif ventas_rec > 0 and stock < ventas_rec * 2:
            bajo.append({"nombre": nombre, "uplift": prod_up, "impacto": impacto, "stock": stock})
        elif prod_up >= UPLIFT_MEDIA:
            ok_alta.append({"nombre": nombre, "uplift": prod_up, "impacto": impacto, "stock": stock})

    parts: list[str] = []

    # ── 1. Sin stock → alerta de ventas perdidas ──────────────────────────────
    if sin_stock:
        names = " y ".join(sin_stock[:2]) + (" y otros" if len(sin_stock) > 2 else "")
        parts.append(f"Sin stock: {names} — ventas perdidas activas, reponer de inmediato")

    # ── 2. Stock critico → reposicion urgente con detalle ────────────────────
    for p in critico[:2]:
        imp_str = f", impacto S/ {p['impacto']:.0f}" if p["impacto"] > 0 else ""
        parts.append(
            f"Reponer urgente {p['nombre']}: "
            f"stock {p['stock']} u., uplift {p['uplift']:.1f}x{imp_str}"
        )

    # ── 3. Stock bajo → reposicion preventiva ────────────────────────────────
    for p in bajo[:2]:
        imp_str = f", impacto S/ {p['impacto']:.0f}" if p["impacto"] > 0 else ""
        parts.append(
            f"Reponer {p['nombre']}: stock bajo ({p['stock']} u.), "
            f"uplift {p['uplift']:.1f}x{imp_str}"
        )

    # ── 4. Alta rotacion con stock OK → consejo de descuento ─────────────────
    if ok_alta:
        p = ok_alta[0]
        if nivel == "alta":
            parts.append(
                f"{p['nombre']} rota {p['uplift']:.1f}x — "
                "no aplicar descuento adicional, la demanda es organica y el margen no lo necesita"
            )
        elif nivel in ("media", "baja"):
            imp_str = f" (S/ {p['impacto']:.0f} sobre lo esperado)" if p["impacto"] > 0 else ""
            parts.append(
                f"{p['nombre']} con uplift {p['uplift']:.1f}x{imp_str} — "
                "evaluar promocion activa para sostener el momentum"
            )

    # ── 5. Consejo estrategico segun tipo de campana ──────────────────────────
    if tipo == "campana-focalizada":
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

    elif tipo in ("cyber-wow", None) and nivel == "alta":
        cats = [c["categoria"] for c in affected_cats[:2]]
        cat_str = " y ".join(cats) if cats else "los productos mas vendidos"
        parts.append(
            f"Demanda alta en {cat_str}: coordinar reposicion con fabricantes "
            "y activar banner promocional antes de que se agote el stock"
        )

    elif tipo == "outlet":
        cats = [c["categoria"] for c in affected_cats[:2]]
        cat_str = " y ".join(cats) if cats else "categorias activas"
        parts.append(
            f"Contexto outlet activo en {cat_str}: "
            "aprovechar para liquidar modelos de temporada anterior con descuento controlado"
        )

    elif tipo == "nueva-temporada":
        cats = [c["categoria"] for c in affected_cats[:2]]
        cat_str = " y ".join(cats) if cats else "categorias activas"
        parts.append(
            f"Inicio de temporada en {cat_str}: "
            "asegurar stock de modelos nuevos y actualizar el catalogo visible en tienda"
        )

    elif nivel == "media" and not parts:
        cats = [c["categoria"] for c in affected_cats[:2]]
        cat_str = " y ".join(cats) if cats else "categorias activas"
        parts.append(
            f"Actividad elevada en {cat_str} ({uplift:.1f}x): "
            "verificar stock y monitorear evolucion los proximos 3 dias"
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
