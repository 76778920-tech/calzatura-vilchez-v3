"""Campaign event persistence — re-exports write/read modules."""

from services.supabase.campaigns_read import (
    fetch_campana_detail,
    fetch_campana_feedback_stats,
    fetch_campanas_recientes,
    get_last_campana_activa,
)
from services.supabase.campaigns_write import (
    save_campana_detectada,
    save_campana_feedback,
    save_campana_metrica_diaria,
    save_campana_productos,
    update_campana_admin_feedback,
    update_campana_estado,
)

__all__ = [
    "save_campana_detectada",
    "update_campana_estado",
    "get_last_campana_activa",
    "save_campana_metrica_diaria",
    "save_campana_productos",
    "save_campana_feedback",
    "update_campana_admin_feedback",
    "fetch_campanas_recientes",
    "fetch_campana_feedback_stats",
    "fetch_campana_detail",
]
