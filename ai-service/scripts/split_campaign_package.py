"""One-off: split models/campaign.py into models/campaign/ package."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
src_path = ROOT / "models" / "campaign.py"
lines = src_path.read_text(encoding="utf-8").splitlines(keepends=True)
base = ROOT / "models" / "campaign"
base.mkdir(exist_ok=True)

chunks: dict[str, tuple[int, int]] = {
    "constants.py": (0, 44),
    "feedback.py": (44, 94),
    "helpers.py": (94, 217),
    "signal_metrics.py": (217, 476),
    "detect.py": (476, 646),
    "uplift_entities.py": (646, 778),
    "messaging.py": (778, 819),
    "recommendations.py": (819, len(lines)),
}

for name, (start, end) in chunks.items():
    body = "".join(lines[start:end])
    if name != "constants.py":
        body = '"""Campaign detection submodule."""\n\n' + body
    (base / name).write_text(body, encoding="utf-8")

init = '''"""
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
'''

(base / "__init__.py").write_text(init, encoding="utf-8")
src_path.unlink()
print("OK: models/campaign/ package created, campaign.py removed")
