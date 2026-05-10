"""
Hard caps for integers that may come from HTTP and are used as loop or slice bounds.
Keeps CPU and memory bounded (DoS mitigation); static analyzers treat these as sanitized.
"""

MAX_HISTORY_DAYS_FOR_LOOPS = 731
MAX_HORIZON_DAYS_FOR_LOOPS = 400
MAX_WEEKS_FOR_CHART = 104
MAX_CHART_HISTORY_DAYS = 120
MAX_CHART_FORECAST_DAYS = 60


def sanitize_int_for_range(value: object, *, default: int, min_v: int, max_v: int) -> int:
    """Return an int in [min_v, max_v] suitable for range() / bounded work."""
    try:
        n = int(value)
    except (TypeError, ValueError):
        n = default
    return max(min_v, min(max_v, n))
