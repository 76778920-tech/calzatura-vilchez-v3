"""
Campaign detection engine v3 — Calzatura Vilchez.
Public API preserved for main.py and tests.
"""

from models.campaign.constants import *  # noqa: F403
from models.campaign.feedback import _compute_feedback_adjustments
from models.campaign.helpers import _date_range, _fill_zeros, _safe_float
from models.campaign.recommendations import _build_recommendation
from models.campaign.detect import detect_campaign

__all__ = [
    "MIN_BASELINE_DAYS",
    "MIN_CONSISTENT_DAYS",
    "FINALIZANDO_COOLDOWN",
    "FINALIZADA_COOLDOWN",
    "UPLIFT_ALTA",
    "UPLIFT_MEDIA",
    "UPLIFT_BAJA",
    "UPLIFT_FLOOR",
    "UPLIFT_CEIL",
    "THRESHOLD_STEP",
    "MIN_FEEDBACK_SAMPLES",
    "Z_ALTA",
    "Z_MEDIA",
    "Z_BAJA",
    "CATEGORIAS_ACTIVAS_LABEL",
    "_compute_feedback_adjustments",
    "_date_range",
    "_build_recommendation",
    "detect_campaign",
]
