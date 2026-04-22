import json
import os
import firebase_admin
from firebase_admin import credentials, firestore
from google.cloud.firestore_v1.base_query import FieldFilter

_app = None


def get_db():
    global _app
    if _app is None:
        json_env = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
        if json_env:
            cred = credentials.Certificate(json.loads(json_env))
        else:
            key_path = os.getenv("FIREBASE_KEY_PATH", "serviceAccountKey.json")
            cred = credentials.Certificate(key_path)
        _app = firebase_admin.initialize_app(cred)
    return firestore.client()


def fetch_daily_sales(db) -> list[dict]:
    """Fetch all manual sales from ventasDiarias."""
    docs = db.collection("ventasDiarias").stream()
    return [{"id": d.id, **d.to_dict()} for d in docs]


def fetch_completed_orders(db) -> list[dict]:
    """Fetch orders with estado pagado/enviado/entregado."""
    completed = ["pagado", "enviado", "entregado"]
    result = []
    for estado in completed:
        docs = (
            db.collection("pedidos")
            .where(filter=FieldFilter("estado", "==", estado))
            .stream()
        )
        for d in docs:
            result.append({"id": d.id, **d.to_dict()})
    return result


def fetch_products(db) -> list[dict]:
    """Fetch all products."""
    docs = db.collection("productos").stream()
    return [{"id": d.id, **d.to_dict()} for d in docs]


def fetch_product_codes(db) -> dict[str, str]:
    """Fetch productoCodigos → { productId: codigo }."""
    docs = db.collection("productoCodigos").stream()
    return {d.id: d.to_dict().get("codigo", "") for d in docs}
