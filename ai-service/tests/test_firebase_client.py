import json
import sys
from datetime import date, datetime, timezone
from unittest.mock import MagicMock, patch

import pytest

# firebase_admin and google-cloud-firestore may not be installed in the test
# environment; stub them before importing firebase_client so the module-level
# imports don't raise ModuleNotFoundError.
if "firebase_admin" not in sys.modules:
    _fb_cred = MagicMock()
    _fb_fs = MagicMock()
    _fb = MagicMock()
    _fb.credentials = _fb_cred
    _fb.firestore = _fb_fs
    sys.modules["firebase_admin"] = _fb
    sys.modules["firebase_admin.credentials"] = _fb_cred
    sys.modules["firebase_admin.firestore"] = _fb_fs

if "google.cloud.firestore_v1.base_query" not in sys.modules:
    _base_query = MagicMock()
    _base_query.FieldFilter = MagicMock()
    sys.modules["google"] = MagicMock()
    sys.modules["google.cloud"] = MagicMock()
    sys.modules["google.cloud.firestore_v1"] = MagicMock()
    sys.modules["google.cloud.firestore_v1.base_query"] = _base_query

from services import firebase_client  # noqa: E402


# ── helpers ──────────────────────────────────────────────────────────────────

class FakeDoc:
    def __init__(self, doc_id, data):
        self.id = doc_id
        self._data = data

    def to_dict(self):
        return self._data


class FakeQuery:
    def __init__(self, docs):
        self._docs = docs

    def where(self, filter=None):  # noqa: A002
        return self

    def stream(self):
        return iter(self._docs)


class FakeCollection:
    def __init__(self, docs):
        self._docs = docs

    def stream(self):
        return iter(self._docs)

    def where(self, filter=None):  # noqa: A002
        return FakeQuery(self._docs)


class FakeDb:
    def __init__(self, **collections):
        self._cols = collections

    def collection(self, name):
        return self._cols.get(name, FakeCollection([]))


@pytest.fixture(autouse=True)
def reset_app(monkeypatch):
    monkeypatch.setattr(firebase_client, "_app", None)


# ── _cutoff_iso ───────────────────────────────────────────────────────────────

def test_cutoff_iso_returns_iso_date():
    result = firebase_client._cutoff_iso(0)
    assert result == date.today().isoformat()


def test_cutoff_iso_subtracts_days():
    result = firebase_client._cutoff_iso(1)
    from datetime import timedelta
    expected = (date.today() - timedelta(days=1)).isoformat()
    assert result == expected


# ── _cutoff_timestamp ─────────────────────────────────────────────────────────

def test_cutoff_timestamp_returns_utc_datetime():
    result = firebase_client._cutoff_timestamp(0)
    assert isinstance(result, datetime)
    assert result.tzinfo is not None


# ── get_db ────────────────────────────────────────────────────────────────────

def test_get_db_uses_json_env(monkeypatch):
    fake_cred_dict = {
        "type": "service_account",
        "project_id": "test",
        "private_key": "key\\ndata",
    }
    monkeypatch.setenv("FIREBASE_SERVICE_ACCOUNT_JSON", json.dumps(fake_cred_dict))

    fake_app = MagicMock()
    fake_db = MagicMock()

    with patch("firebase_admin.credentials.Certificate") as mock_cert, \
         patch("firebase_admin.initialize_app", return_value=fake_app), \
         patch("firebase_admin.firestore.client", return_value=fake_db):
        db = firebase_client.get_db()

    assert db is fake_db
    assert firebase_client._app is fake_app
    called_dict = mock_cert.call_args[0][0]
    assert called_dict["private_key"] == "key\ndata"


def test_get_db_reuses_existing_app(monkeypatch):
    existing_app = MagicMock()
    monkeypatch.setattr(firebase_client, "_app", existing_app)
    fake_db = MagicMock()

    with patch("firebase_admin.firestore.client", return_value=fake_db):
        db = firebase_client.get_db()

    assert db is fake_db
    assert firebase_client._app is existing_app


def test_get_db_uses_key_path(monkeypatch, tmp_path):
    key_file = tmp_path / "key.json"
    key_file.write_text("{}")
    monkeypatch.delenv("FIREBASE_SERVICE_ACCOUNT_JSON", raising=False)
    monkeypatch.setenv("FIREBASE_KEY_PATH", str(key_file))

    fake_app = MagicMock()
    fake_db = MagicMock()

    with patch("firebase_admin.credentials.Certificate") as mock_cert, \
         patch("firebase_admin.initialize_app", return_value=fake_app), \
         patch("firebase_admin.firestore.client", return_value=fake_db):
        db = firebase_client.get_db()

    assert db is fake_db
    mock_cert.assert_called_once_with(str(key_file))


# ── fetch_daily_sales ─────────────────────────────────────────────────────────

def test_fetch_daily_sales_without_days():
    docs = [FakeDoc("d1", {"fecha": "2026-05-01", "total": 100})]
    db = FakeDb(ventasDiarias=FakeCollection(docs))

    result = firebase_client.fetch_daily_sales(db)

    assert result == [{"id": "d1", "fecha": "2026-05-01", "total": 100}]


def test_fetch_daily_sales_with_days():
    docs = [FakeDoc("d2", {"fecha": "2026-05-10", "total": 50})]
    db = FakeDb(ventasDiarias=FakeCollection(docs))

    result = firebase_client.fetch_daily_sales(db, days=7)

    assert len(result) == 1
    assert result[0]["id"] == "d2"


def test_fetch_daily_sales_days_zero_no_filter():
    docs = [FakeDoc("d3", {"fecha": "2026-01-01", "total": 20})]
    db = FakeDb(ventasDiarias=FakeCollection(docs))

    result = firebase_client.fetch_daily_sales(db, days=0)

    assert len(result) == 1


# ── fetch_completed_orders ────────────────────────────────────────────────────

def test_fetch_completed_orders_filters_by_estado():
    docs = [
        FakeDoc("o1", {"estado": "pagado", "total": 200}),
        FakeDoc("o2", {"estado": "pendiente", "total": 100}),
        FakeDoc("o3", {"estado": "entregado", "total": 150}),
    ]
    db = FakeDb(pedidos=FakeCollection(docs))

    result = firebase_client.fetch_completed_orders(db)

    ids = [r["id"] for r in result]
    assert "o1" in ids
    assert "o3" in ids
    assert "o2" not in ids


def test_fetch_completed_orders_with_days():
    docs = [FakeDoc("o4", {"estado": "enviado", "total": 80})]
    db = FakeDb(pedidos=FakeCollection(docs))

    result = firebase_client.fetch_completed_orders(db, days=30)

    assert result == [{"id": "o4", "estado": "enviado", "total": 80}]


# ── fetch_products ────────────────────────────────────────────────────────────

def test_fetch_products_returns_all():
    docs = [
        FakeDoc("p1", {"nombre": "Zapatilla", "precio": 120}),
        FakeDoc("p2", {"nombre": "Sandalia", "precio": 80}),
    ]
    db = FakeDb(productos=FakeCollection(docs))

    result = firebase_client.fetch_products(db)

    assert len(result) == 2
    assert result[0] == {"id": "p1", "nombre": "Zapatilla", "precio": 120}


# ── fetch_product_codes ───────────────────────────────────────────────────────

def test_fetch_product_codes_returns_id_to_code_map():
    docs = [
        FakeDoc("p1", {"codigo": "CV-001"}),
        FakeDoc("p2", {"codigo": "CV-002"}),
    ]
    db = FakeDb(productoCodigos=FakeCollection(docs))

    result = firebase_client.fetch_product_codes(db)

    assert result == {"p1": "CV-001", "p2": "CV-002"}


def test_fetch_product_codes_missing_codigo_uses_empty_string():
    docs = [FakeDoc("p3", {})]
    db = FakeDb(productoCodigos=FakeCollection(docs))

    result = firebase_client.fetch_product_codes(db)

    assert result == {"p3": ""}
