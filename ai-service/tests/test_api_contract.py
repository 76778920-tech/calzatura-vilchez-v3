from datetime import date, timedelta

from fastapi.testclient import TestClient

import main


def _sales_rows(days: int = 35) -> list[dict]:
    today = date.today()
    return [
        {
            "productId": "p-contract-1",
            "fecha": (today - timedelta(days=days - 1 - index)).isoformat(),
            "cantidad": 1,
            "total": 120.0,
            "devuelto": False,
            "nombre": "Zapatilla Contrato",
            "categoria": "hombre",
            "precioVenta": 120.0,
            "codigo": "CV-CONTRACT-1",
        }
        for index in range(days)
    ]


def _products() -> list[dict]:
    return [
        {
            "id": "p-contract-1",
            "nombre": "Zapatilla Contrato",
            "categoria": "hombre",
            "precio": 120.0,
            "stock": 20,
            "imagen": "",
        }
    ]


def _client(monkeypatch, save_ire=None) -> TestClient:
    monkeypatch.setattr(main, "_AI_SERVICE_BEARER_TOKEN", "test-token")
    monkeypatch.setattr(main, "_cache", {"data": None, "expires_at": 0.0, "lookback_days": 0})
    monkeypatch.setattr(main, "_prediction_log", [])
    monkeypatch.setattr(main, "_model_registry", {})
    monkeypatch.setattr(
        main,
        "_load_data",
        lambda force=False, lookback_days=180: (_sales_rows(), [], _products(), {"p-contract-1": "CV-CONTRACT-1"}),
    )
    monkeypatch.setattr(main, "save_ire_historial", save_ire or (lambda ire: None))
    return TestClient(main.app)


def test_predict_combined_expone_contrato_ire(monkeypatch):
    client = _client(monkeypatch)

    response = client.get(
        "/api/predict/combined?horizon=7&history=30",
        headers={"Authorization": "Bearer test-token"},
    )

    assert response.status_code == 200
    payload = response.json()
    ire = payload["ire"]
    assert ire["version"]
    assert ire["definicion"]
    assert ire["formula"].startswith("IRE =")
    assert set(ire["dimensiones"]) == {"riesgo_stock", "riesgo_ingresos", "riesgo_demanda"}
    assert set(ire["pesos"]) == {"riesgo_stock", "riesgo_ingresos", "riesgo_demanda"}
    assert [item["codigo"] for item in ire["variables"]] == [
        "riesgo_stock",
        "riesgo_ingresos",
        "riesgo_demanda",
    ]
    assert sum(item["contribucion_score"] for item in ire["variables"]) == ire["score"]
    assert {"productos_bajando", "alta_demanda_bajo_stock", "productos_drift_alto"} <= set(ire["detalle"])
    assert payload["ire_proyectado"]["version"] == ire["version"]
    assert payload["warnings"] == []


def test_predict_combined_no_falla_si_historial_ire_no_se_guarda(monkeypatch):
    def fail_save(_ire):
        raise RuntimeError("supabase 500")

    client = _client(monkeypatch, save_ire=fail_save)

    response = client.get(
        "/api/predict/combined?horizon=7&history=30",
        headers={"Authorization": "Bearer test-token"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["ire"]["score"] >= 0
    assert any("Historial IRE no guardado" in warning for warning in payload["warnings"])


def test_ire_historial_expone_contrato_http(monkeypatch):
    monkeypatch.setattr(main, "_AI_SERVICE_BEARER_TOKEN", "test-token")
    rows = [
        {
            "fecha": "2026-05-06",
            "score": 42,
            "nivel": "moderado",
            "dimensiones": {"riesgo_stock": 40, "riesgo_ingresos": 45, "riesgo_demanda": 35},
            "pesos": {"riesgo_stock": 0.4, "riesgo_ingresos": 0.35, "riesgo_demanda": 0.25},
            "version": "1.1.0",
            "definicion": "Índice proxy",
            "formula": "IRE = ...",
            "variables": [{"codigo": "riesgo_stock", "contribucion_score": 16}],
            "detalle": {"productos_bajando": 1},
        }
    ]
    calls = []

    def fake_fetch(days):
        calls.append(days)
        return rows

    monkeypatch.setattr(main, "fetch_ire_historial", fake_fetch)
    client = TestClient(main.app)

    response = client.get(
        "/api/ire/historial?days=45",
        headers={"Authorization": "Bearer test-token"},
    )

    assert response.status_code == 200
    assert response.json() == {"historial": rows, "days": 45}
    assert calls == [45]


def test_ire_historial_requiere_auth(monkeypatch):
    monkeypatch.setattr(main, "_AI_SERVICE_BEARER_TOKEN", "test-token")
    client = TestClient(main.app)

    response = client.get("/api/ire/historial?days=30")

    assert response.status_code == 401
    assert response.json()["detail"] == "Unauthorized"


def test_ire_historial_propaga_error_controlado(monkeypatch):
    monkeypatch.setattr(main, "_AI_SERVICE_BEARER_TOKEN", "test-token")

    def fail_fetch(_days):
        raise RuntimeError("supabase 500")

    monkeypatch.setattr(main, "fetch_ire_historial", fail_fetch)
    client = TestClient(main.app)

    response = client.get(
        "/api/ire/historial?days=30",
        headers={"Authorization": "Bearer test-token"},
    )

    assert response.status_code == 500
    assert response.json()["detail"] == "supabase 500"
