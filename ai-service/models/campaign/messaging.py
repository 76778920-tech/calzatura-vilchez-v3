"""Campaign detection — messaging.py."""

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


