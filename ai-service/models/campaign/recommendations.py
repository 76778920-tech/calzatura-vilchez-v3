"""Campaign detection — recommendations.py."""

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
