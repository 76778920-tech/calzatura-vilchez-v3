"""Supabase service client — public API unchanged."""

from services.supabase.http import get_client
from services.supabase.catalog import (
    fetch_daily_sales,
    fetch_completed_orders,
    fetch_products,
    fetch_stock_movements,
    fetch_product_codes,
)
from services.supabase.ire_model import (
    save_ire_historial,
    fetch_ire_historial,
    save_modelo_estado,
    load_modelo_estado,
)
from services.supabase.campaigns import (
    save_campana_detectada,
    update_campana_estado,
    get_last_campana_activa,
    save_campana_metrica_diaria,
    save_campana_productos,
    save_campana_feedback,
    update_campana_admin_feedback,
    fetch_campanas_recientes,
    fetch_campana_feedback_stats,
    fetch_campana_detail,
)

__all__ = [
    "get_client",
    "fetch_daily_sales",
    "fetch_completed_orders",
    "fetch_products",
    "fetch_stock_movements",
    "fetch_product_codes",
    "save_ire_historial",
    "fetch_ire_historial",
    "save_modelo_estado",
    "load_modelo_estado",
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
