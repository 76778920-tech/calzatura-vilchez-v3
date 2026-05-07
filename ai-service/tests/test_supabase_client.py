import pytest

from services import supabase_client


class FakeResponse:
    def __init__(self, status_code=200, payload=None):
        self.status_code = status_code
        self._payload = payload if payload is not None else []
        self.raised = False

    def json(self):
        return self._payload

    def raise_for_status(self):
        self.raised = True
        if self.status_code >= 400:
            raise RuntimeError(f"HTTP {self.status_code}")


@pytest.fixture(autouse=True)
def supabase_env(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_KEY", "service-key")
    monkeypatch.setattr(supabase_client, "_SUPABASE_URL", None)
    monkeypatch.setattr(supabase_client, "_HEADERS", None)


def make_ire():
    return {
        "score": 42,
        "nivel": "moderado",
        "version": "1.1.0",
        "definicion": "Indice proxy",
        "formula": "IRE = ...",
        "dimensiones": {"riesgo_stock": 40},
        "pesos": {"riesgo_stock": 0.4},
        "variables": [{"codigo": "riesgo_stock", "valor": 40}],
        "detalle": {"total_con_historial": 8},
    }


def test_save_ire_historial_envia_snapshot_extendido(monkeypatch):
    calls = []

    def fake_post(url, headers, json, timeout):
        calls.append({"url": url, "headers": headers, "json": json, "timeout": timeout})
        return FakeResponse(201)

    monkeypatch.setattr(supabase_client.requests, "post", fake_post)

    supabase_client.save_ire_historial(make_ire())

    assert len(calls) == 1
    payload = calls[0]["json"]
    assert payload["score"] == 42
    assert payload["version"] == "1.1.0"
    assert payload["formula"] == "IRE = ..."
    assert payload["variables"] == [{"codigo": "riesgo_stock", "valor": 40}]
    assert payload["detalle"] == {"total_con_historial": 8}


@pytest.mark.parametrize("status_code", [400, 404, 406, 409, 422])
def test_save_ire_historial_fallback_payload_minimo(monkeypatch, status_code):
    calls = []

    def fake_post(url, headers, json, timeout):
        calls.append(json)
        return FakeResponse(status_code if len(calls) == 1 else 201)

    monkeypatch.setattr(supabase_client.requests, "post", fake_post)

    supabase_client.save_ire_historial(make_ire())

    assert len(calls) == 2
    assert "version" in calls[0]
    assert "version" not in calls[1]
    assert calls[1] == {
        "fecha": calls[1]["fecha"],
        "score": 42,
        "nivel": "moderado",
        "dimensiones": {"riesgo_stock": 40},
        "pesos": {"riesgo_stock": 0.4},
    }


def test_fetch_ire_historial_solicita_campos_de_auditoria(monkeypatch):
    captured = {}

    def fake_get(url, headers, params, timeout):
        captured["params"] = params
        return FakeResponse(200, [{"fecha": "2026-05-06", "score": 42}])

    monkeypatch.setattr(supabase_client.requests, "get", fake_get)

    rows = supabase_client.fetch_ire_historial(60)

    assert rows == [{"fecha": "2026-05-06", "score": 42}]
    select = captured["params"]["select"]
    assert "version" in select
    assert "formula" in select
    assert "variables" in select
    assert "detalle" in select
