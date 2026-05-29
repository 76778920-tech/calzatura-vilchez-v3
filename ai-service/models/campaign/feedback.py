"""Feedback-driven threshold adjustments for campaign detection."""

from models.campaign.constants import (
    MIN_FEEDBACK_SAMPLES,
    THRESHOLD_STEP,
    UPLIFT_ALTA,
    UPLIFT_BAJA,
    UPLIFT_CEIL,
    UPLIFT_FLOOR,
    UPLIFT_MEDIA,
)


def _compute_feedback_adjustments(stats: dict) -> dict:
    """
    Pure function: given feedback counts by scope, returns adjusted uplift
    thresholds to pass as threshold_overrides to detect_campaign.
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
        int(stats.get("global_confirmadas", 0)),
        int(stats.get("global_descartadas", 0)),
    )
    d_foc = _delta(
        int(stats.get("focalizada_confirmadas", 0)),
        int(stats.get("focalizada_descartadas", 0)),
    )

    def _clamp(base: float, delta: float) -> float:
        return round(max(UPLIFT_FLOOR, min(UPLIFT_CEIL, base + delta)), 2)

    return {
        "uplift_alta": _clamp(UPLIFT_ALTA, d_global),
        "uplift_media": _clamp(UPLIFT_MEDIA, d_global),
        "uplift_baja": _clamp(UPLIFT_BAJA, d_global),
        "uplift_focalizada": _clamp(UPLIFT_MEDIA, d_foc),
    }
