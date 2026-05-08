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


# ── /api/campaign/learning-stats ─────────────────────────────────────────────

def _learning_client(monkeypatch, fake_stats: dict) -> TestClient:
    monkeypatch.setattr(main, "_AI_SERVICE_BEARER_TOKEN", "test-token")
    monkeypatch.setattr(main, "fetch_campana_feedback_stats", lambda: fake_stats)
    return TestClient(main.app)


def test_learning_stats_contrato_http(monkeypatch):
    """El endpoint devuelve todos los campos del contrato cuando hay datos."""
    client = _learning_client(monkeypatch, {
        "global_confirmadas": 8, "global_descartadas": 2,
        "focalizada_confirmadas": 3, "focalizada_descartadas": 7,
    })

    response = client.get(
        "/api/campaign/learning-stats",
        headers={"Authorization": "Bearer test-token"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert isinstance(body["min_feedback_samples"], int)
    assert set(body["conteos"]) == {"global", "focalizada"}
    assert set(body["conteos"]["global"]) == {"confirmadas", "descartadas", "total"}
    assert set(body["precision_pct"]) == {"global", "focalizada"}
    assert set(body["umbrales_base"]) == {"uplift_alta", "uplift_media", "uplift_baja", "uplift_focalizada"}
    assert set(body["umbrales_activos"]) == {"uplift_alta", "uplift_media", "uplift_baja", "uplift_focalizada"}
    assert isinstance(body["aprendizaje_activo"], bool)


def test_learning_stats_requiere_auth(monkeypatch):
    """Sin token devuelve 401."""
    monkeypatch.setattr(main, "_AI_SERVICE_BEARER_TOKEN", "test-token")
    client = TestClient(main.app)

    response = client.get("/api/campaign/learning-stats")

    assert response.status_code == 401
    assert response.json()["detail"] == "Unauthorized"


def test_learning_stats_sin_feedback_aprendizaje_inactivo(monkeypatch):
    """Sin feedback registrado, aprendizaje_activo=False y umbrales_activos == umbrales_base."""
    client = _learning_client(monkeypatch, {})

    body = client.get(
        "/api/campaign/learning-stats",
        headers={"Authorization": "Bearer test-token"},
    ).json()

    assert body["aprendizaje_activo"] is False
    assert body["umbrales_activos"] == body["umbrales_base"]
    assert body["precision_pct"]["global"] is None
    assert body["precision_pct"]["focalizada"] is None


def test_learning_stats_solo_focalizada_activa_aprendizaje_activo(monkeypatch):
    """
    Solo feedback focalizado con baja precision → uplift_focalizada sube.
    aprendizaje_activo debe ser True aunque los umbrales globales no cambien.
    """
    client = _learning_client(monkeypatch, {
        "global_confirmadas": 0,   "global_descartadas": 0,
        "focalizada_confirmadas": 1, "focalizada_descartadas": 9,
    })

    body = client.get(
        "/api/campaign/learning-stats",
        headers={"Authorization": "Bearer test-token"},
    ).json()

    assert body["umbrales_activos"]["uplift_alta"]  == body["umbrales_base"]["uplift_alta"],  "global no cambia"
    assert body["umbrales_activos"]["uplift_media"] == body["umbrales_base"]["uplift_media"], "global no cambia"
    assert body["umbrales_activos"]["uplift_baja"]  == body["umbrales_base"]["uplift_baja"],  "global no cambia"
    assert body["umbrales_activos"]["uplift_focalizada"] > body["umbrales_base"]["uplift_focalizada"], \
        "baja precision focalizada debe subir el umbral"
    assert body["aprendizaje_activo"] is True, \
        "aprendizaje_activo debe ser True cuando solo cambia uplift_focalizada"


def test_learning_stats_precision_global_correcta(monkeypatch):
    """8 confirm + 2 desc → precision global = 80.0%."""
    client = _learning_client(monkeypatch, {
        "global_confirmadas": 8, "global_descartadas": 2,
    })

    body = client.get(
        "/api/campaign/learning-stats",
        headers={"Authorization": "Bearer test-token"},
    ).json()

    assert body["precision_pct"]["global"] == 80.0
    assert body["conteos"]["global"]["total"] == 10


def test_learning_stats_supabase_error_devuelve_500(monkeypatch):
    """Si fetch_campana_feedback_stats lanza excepcion, el endpoint devuelve 500."""
    monkeypatch.setattr(main, "_AI_SERVICE_BEARER_TOKEN", "test-token")
    monkeypatch.setattr(main, "fetch_campana_feedback_stats", lambda: (_ for _ in ()).throw(RuntimeError("db down")))
    client = TestClient(main.app)

    response = client.get(
        "/api/campaign/learning-stats",
        headers={"Authorization": "Bearer test-token"},
    )

    assert response.status_code == 500
