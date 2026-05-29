"""
Campaign detection engine v3 — Calzatura Vilchez.

Constants and thresholds for campaign signal classification.
"""

MIN_BASELINE_DAYS = 14
MIN_CONSISTENT_DAYS = 2
FINALIZANDO_COOLDOWN = 2
FINALIZADA_COOLDOWN = 4

UPLIFT_ALTA = 2.0
UPLIFT_MEDIA = 1.5
UPLIFT_BAJA = 1.25

Z_ALTA = 2.0
Z_MEDIA = 1.5
Z_BAJA = 1.0

CATEGORIAS_ACTIVAS_LABEL = "categorias activas"

MIN_FEEDBACK_SAMPLES = 5
THRESHOLD_STEP = 0.15
UPLIFT_FLOOR = 1.10
UPLIFT_CEIL = 3.00
