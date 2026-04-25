import json
import os
from pathlib import Path
from datetime import datetime, timedelta, timezone
import firebase_admin
from firebase_admin import credentials, firestore
from google.cloud.firestore_v1.base_query import FieldFilter

_app = None
_DEFAULT_KEY_PATH = Path(__file__).resolve().parent.parent / "serviceAccountKey.json"


def _cutoff_iso(days: int) -> str:
    return (datetime.now(timezone.utc).date() - timedelta(days=days)).isoformat()


def _cutoff_timestamp(days: int) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=days)


def get_db():
    global _app
    if _app is None:
        json_env = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
        if json_env:
            cred_dict = json.loads(json_env)
            # Render/Railway sometimes stores literal \n instead of newlines in private_key
            if "private_key" in cred_dict:
                cred_dict["private_key"] = cred_dict["private_key"].replace("\\n", "\n")
            cred = credentials.Certificate(cred_dict)
        else:
            key_path = Path(os.getenv("FIREBASE_KEY_PATH", str(_DEFAULT_KEY_PATH))).expanduser()
            cred = credentials.Certificate(str(key_path))
        _app = firebase_admin.initialize_app(cred)
    return firestore.client()


def fetch_daily_sales(db, days: int | None = None) -> list[dict]:
    """Fetch manual sales from ventasDiarias, optionally limited to recent days."""
    query = db.collection("ventasDiarias")
    if days and days > 0:
        query = query.where(filter=FieldFilter("fecha", ">=", _cutoff_iso(days)))
    docs = query.stream()
    return [{"id": d.id, **d.to_dict()} for d in docs]


def fetch_completed_orders(db, days: int | None = None) -> list[dict]:
    """Fetch recent orders with estado pagado/enviado/entregado."""
    completed = ["pagado", "enviado", "entregado"]
    result = []
    query = db.collection("pedidos")
    if days and days > 0:
        query = query.where(filter=FieldFilter("creadoEn", ">=", _cutoff_timestamp(days)))

    for d in query.stream():
        data = d.to_dict()
        if data.get("estado") in completed:
            result.append({"id": d.id, **data})
    return result


def fetch_products(db) -> list[dict]:
    """Fetch all products."""
    docs = db.collection("productos").stream()
    return [{"id": d.id, **d.to_dict()} for d in docs]


def fetch_product_codes(db) -> dict[str, str]:
    """Fetch productoCodigos → { productId: codigo }."""
    docs = db.collection("productoCodigos").stream()
    return {d.id: d.to_dict().get("codigo", "") for d in docs}
