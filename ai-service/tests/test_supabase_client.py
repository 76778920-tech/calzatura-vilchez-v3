import pytest

from services import supabase_client


class FakeResponse:
    def __init__(self, status_code=200, payload=None):
        self.status_code = status_code
        self._payload = payload if payload is not None else []
        self.raised = False

    @property
    def ok(self):
        return self.status_code < 400

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


# ── fetch helpers ─────────────────────────────────────────────────────────────

def test_get_headers_lanza_error_sin_credenciales(monkeypatch):
    monkeypatch.setattr(supabase_client, "_SUPABASE_URL", None)
    monkeypatch.setattr(supabase_client, "_HEADERS", None)
    monkeypatch.setenv("SUPABASE_URL", "")
    monkeypatch.setenv("SUPABASE_SERVICE_KEY", "")
    with pytest.raises(RuntimeError, match="SUPABASE_URL"):
        supabase_client._get_headers()


def test_get_client_devuelve_url_y_headers(monkeypatch):
    url, headers = supabase_client.get_client()
    assert url == "https://example.supabase.co"
    assert "apikey" in headers


def test_get_headers_reutiliza_valores_cacheados():
    """Segunda llamada no reconstruye URL ni headers (rama del if omitida)."""
    u1, h1 = supabase_client._get_headers()
    u2, h2 = supabase_client._get_headers()
    assert u1 is u2
    assert h1 is h2


def test_fetch_daily_sales_sin_days(monkeypatch):
    def fake_get(url, headers, params, timeout):
        return FakeResponse(200, [{"productId": "p1", "fecha": "2026-05-01"}])

    monkeypatch.setattr(supabase_client.requests, "get", fake_get)
    rows = supabase_client.fetch_daily_sales()
    assert rows == [{"productId": "p1", "fecha": "2026-05-01"}]


def test_fetch_daily_sales_con_days(monkeypatch):
    captured = {}

    def fake_get(url, headers, params, timeout):
        captured["params"] = params
        return FakeResponse(200, [])

    monkeypatch.setattr(supabase_client.requests, "get", fake_get)
    supabase_client.fetch_daily_sales(days=7)
    assert "fecha" in captured["params"]
    assert captured["params"]["fecha"].startswith("gte.")


def test_fetch_completed_orders_sin_days(monkeypatch):
    def fake_get(url, headers, params, timeout):
        return FakeResponse(200, [{"total": 100}])

    monkeypatch.setattr(supabase_client.requests, "get", fake_get)
    rows = supabase_client.fetch_completed_orders()
    assert rows == [{"total": 100}]


def test_fetch_completed_orders_con_days(monkeypatch):
    captured = {}

    def fake_get(url, headers, params, timeout):
        captured["params"] = params
        return FakeResponse(200, [])

    monkeypatch.setattr(supabase_client.requests, "get", fake_get)
    supabase_client.fetch_completed_orders(days=30)
    assert "or" in captured["params"]


def test_fetch_products(monkeypatch):
    def fake_get(url, headers, params, timeout):
        return FakeResponse(200, [{"id": "p1", "nombre": "Zapatilla"}])

    monkeypatch.setattr(supabase_client.requests, "get", fake_get)
    rows = supabase_client.fetch_products()
    assert rows == [{"id": "p1", "nombre": "Zapatilla"}]


def test_fetch_stock_movements_sin_days(monkeypatch):
    def fake_get(url, headers, params, timeout):
        assert "movimientosStock" in url
        assert "fecha" not in (params or {})
        return FakeResponse(200, [{"productId": "p1", "tipo": "ingreso"}])

    monkeypatch.setattr(supabase_client.requests, "get", fake_get)
    rows = supabase_client.fetch_stock_movements()
    assert rows == [{"productId": "p1", "tipo": "ingreso"}]


def test_fetch_stock_movements_con_days(monkeypatch):
    captured = {}

    def fake_get(url, headers, params, timeout):
        captured["params"] = params
        return FakeResponse(200, [])

    monkeypatch.setattr(supabase_client.requests, "get", fake_get)
    supabase_client.fetch_stock_movements(days=14)
    assert captured["params"]["fecha"].startswith("gte.")


def test_fetch_stock_movements_days_cero_no_anade_fecha(monkeypatch):
    captured = {}

    def fake_get(url, headers, params, timeout):
        captured["params"] = params or {}
        return FakeResponse(200, [])

    monkeypatch.setattr(supabase_client.requests, "get", fake_get)
    supabase_client.fetch_stock_movements(days=0)
    assert "fecha" not in captured["params"]


def test_fetch_product_codes(monkeypatch):
    def fake_get(url, headers, params, timeout):
        return FakeResponse(200, [{"productoId": "p1", "codigo": "CV-001"}])

    monkeypatch.setattr(supabase_client.requests, "get", fake_get)
    result = supabase_client.fetch_product_codes()
    assert result == {"p1": "CV-001"}


def test_fetch_product_codes_filtra_sin_codigo(monkeypatch):
    def fake_get(url, headers, params, timeout):
        return FakeResponse(200, [{"productoId": "p1", "codigo": ""}, {"productoId": "p2", "codigo": "CV-002"}])

    monkeypatch.setattr(supabase_client.requests, "get", fake_get)
    result = supabase_client.fetch_product_codes()
    assert "p1" not in result
    assert result["p2"] == "CV-002"


# ── save_modelo_estado / load_modelo_estado ───────────────────────────────────

def test_save_modelo_estado(monkeypatch):
    calls = []

    def fake_post(url, headers, json, timeout):
        calls.append({"url": url, "json": json})
        return FakeResponse(200)

    monkeypatch.setattr(supabase_client.requests, "post", fake_post)
    supabase_client.save_modelo_estado({"epochs": 10})

    assert len(calls) == 1
    assert calls[0]["json"]["id"] == "singleton"
    assert calls[0]["json"]["trainingMeta"] == {"epochs": 10}


def test_load_modelo_estado_success(monkeypatch):
    def fake_get(url, headers, params, timeout):
        return FakeResponse(200, [{"trainingMeta": {"epochs": 5}, "actualizadoEn": "2026-05-01"}])

    monkeypatch.setattr(supabase_client.requests, "get", fake_get)
    result = supabase_client.load_modelo_estado()
    assert result == {"epochs": 5}


def test_load_modelo_estado_vacio(monkeypatch):
    def fake_get(url, headers, params, timeout):
        return FakeResponse(200, [])

    monkeypatch.setattr(supabase_client.requests, "get", fake_get)
    result = supabase_client.load_modelo_estado()
    assert result is None


def test_load_modelo_estado_exception(monkeypatch):
    def fake_get(url, headers, params, timeout):
        raise RuntimeError("network error")

    monkeypatch.setattr(supabase_client.requests, "get", fake_get)
    result = supabase_client.load_modelo_estado()
    assert result is None


# ── campana functions ─────────────────────────────────────────────────────────

def test_save_campana_detectada_ok(monkeypatch):
    calls = []

    def fake_post(url, headers, json, timeout):
        calls.append(json)
        return FakeResponse(201, [{"id": 1, **json}])

    monkeypatch.setattr(supabase_client.requests, "post", fake_post)
    evento = {"nivel": "alto", "tipo_sugerido": "promo"}
    result = supabase_client.save_campana_detectada(evento)

    assert result is not None
    assert result["nivel"] == "alto"


def test_save_campana_detectada_fallo(monkeypatch):
    def fake_post(url, headers, json, timeout):
        return FakeResponse(500)

    monkeypatch.setattr(supabase_client.requests, "post", fake_post)
    result = supabase_client.save_campana_detectada({"nivel": "bajo"})
    assert result is None


def test_update_campana_estado_sin_opcionales(monkeypatch):
    calls = []

    def fake_patch(url, headers, json, timeout):
        calls.append({"url": url, "json": json})
        return FakeResponse(200)

    monkeypatch.setattr(supabase_client.requests, "patch", fake_patch)
    supabase_client.update_campana_estado(42, "finalizada")

    assert len(calls) == 1
    assert calls[0]["json"] == {"estado": "finalizada"}
    assert "42" in calls[0]["url"]


def test_update_campana_estado_con_opcionales(monkeypatch):
    calls = []

    def fake_patch(url, headers, json, timeout):
        calls.append(json)
        return FakeResponse(200)

    monkeypatch.setattr(supabase_client.requests, "patch", fake_patch)
    supabase_client.update_campana_estado(7, "finalizada", fecha_fin="2026-05-20", impacto_estimado_soles=500.0)

    assert calls[0]["fecha_fin"] == "2026-05-20"
    assert calls[0]["impacto_estimado_soles"] == pytest.approx(500.0)


def test_get_last_campana_activa_ok(monkeypatch):
    def fake_get(url, headers, params, timeout):
        return FakeResponse(200, [{"id": 3, "estado": "activa"}])

    monkeypatch.setattr(supabase_client.requests, "get", fake_get)
    result = supabase_client.get_last_campana_activa()
    assert result == {"id": 3, "estado": "activa"}


def test_get_last_campana_activa_vacia(monkeypatch):
    def fake_get(url, headers, params, timeout):
        return FakeResponse(200, [])

    monkeypatch.setattr(supabase_client.requests, "get", fake_get)
    assert supabase_client.get_last_campana_activa() is None


def test_get_last_campana_activa_excepcion(monkeypatch):
    def fake_get(url, headers, params, timeout):
        raise RuntimeError("timeout")

    monkeypatch.setattr(supabase_client.requests, "get", fake_get)
    assert supabase_client.get_last_campana_activa() is None


def test_save_campana_metrica_diaria(monkeypatch):
    calls = []

    def fake_post(url, headers, json, timeout):
        calls.append(json)
        return FakeResponse(201)

    monkeypatch.setattr(supabase_client.requests, "post", fake_post)
    supabase_client.save_campana_metrica_diaria(5, {"ventas": 10, "fecha": "2026-05-13"})

    assert calls[0]["campana_id"] == 5
    assert calls[0]["ventas"] == 10


def test_save_campana_productos_vacia(monkeypatch):
    calls = []
    monkeypatch.setattr(supabase_client.requests, "post", lambda *a, **kw: calls.append(1))
    supabase_client.save_campana_productos(1, [])
    assert calls == []


def test_save_campana_productos_con_datos(monkeypatch):
    calls = []

    def fake_post(url, headers, json, timeout):
        calls.append(json)
        return FakeResponse(201)

    monkeypatch.setattr(supabase_client.requests, "post", fake_post)
    supabase_client.save_campana_productos(2, [{"producto_id": "p1"}, {"producto_id": "p2"}])

    assert len(calls) == 1
    assert all(p["campana_id"] == 2 for p in calls[0])


def test_save_campana_feedback(monkeypatch):
    calls = []

    def fake_post(url, headers, json, timeout):
        calls.append(json)
        return FakeResponse(201)

    monkeypatch.setattr(supabase_client.requests, "post", fake_post)
    supabase_client.save_campana_feedback(9, "confirmar", nota="ok")

    assert calls[0]["campana_id"] == 9
    assert calls[0]["accion"] == "confirmar"
    assert calls[0]["nota"] == "ok"


def test_update_campana_admin_feedback_sin_nota(monkeypatch):
    calls = []

    def fake_patch(url, headers, json, timeout):
        calls.append(json)
        return FakeResponse(200)

    monkeypatch.setattr(supabase_client.requests, "patch", fake_patch)
    supabase_client.update_campana_admin_feedback(3, True)

    assert calls[0] == {"confirmada_por_admin": True}


def test_update_campana_admin_feedback_con_nota(monkeypatch):
    calls = []

    def fake_patch(url, headers, json, timeout):
        calls.append(json)
        return FakeResponse(200)

    monkeypatch.setattr(supabase_client.requests, "patch", fake_patch)
    supabase_client.update_campana_admin_feedback(3, False, nota="descartada por stock bajo")

    assert calls[0]["admin_nota"] == "descartada por stock bajo"
    assert calls[0]["confirmada_por_admin"] is False


def test_fetch_campanas_recientes_ok(monkeypatch):
    def fake_get(url, headers, params, timeout):
        return FakeResponse(200, [{"id": 1}, {"id": 2}])

    monkeypatch.setattr(supabase_client.requests, "get", fake_get)
    rows = supabase_client.fetch_campanas_recientes(limit=5)
    assert len(rows) == 2


def test_fetch_campanas_recientes_excepcion(monkeypatch):
    def fake_get(url, headers, params, timeout):
        raise RuntimeError("error de red")

    monkeypatch.setattr(supabase_client.requests, "get", fake_get)
    assert supabase_client.fetch_campanas_recientes() == []


def test_fetch_campana_feedback_stats_conteo(monkeypatch):
    rows = [
        {"scope": "global",     "confirmada_por_admin": True},
        {"scope": "global",     "confirmada_por_admin": False},
        {"scope": "focalizada", "confirmada_por_admin": True},
        {"scope": None,         "confirmada_por_admin": True},
    ]

    def fake_get(url, headers, params, timeout):
        return FakeResponse(200, rows)

    monkeypatch.setattr(supabase_client.requests, "get", fake_get)
    stats = supabase_client.fetch_campana_feedback_stats()

    assert stats["global_confirmadas"] == 2   # global + None → global
    assert stats["global_descartadas"] == 1
    assert stats["focalizada_confirmadas"] == 1
    assert stats["focalizada_descartadas"] == 0


def test_fetch_campana_feedback_stats_excepcion(monkeypatch):
    def fake_get(url, headers, params, timeout):
        raise RuntimeError("fallo")

    monkeypatch.setattr(supabase_client.requests, "get", fake_get)
    assert supabase_client.fetch_campana_feedback_stats() == {}


def test_fetch_campana_detail_ok(monkeypatch):
    campana = {"id": 10, "nivel": "alto"}
    prods = [{"producto_id": "p1", "uplift_ratio": 1.5}]
    call_count = [0]

    def fake_get(url, headers, params, timeout):
        call_count[0] += 1
        if "campanas_detectadas" in url and call_count[0] == 1:
            return FakeResponse(200, [campana])
        return FakeResponse(200, prods)

    monkeypatch.setattr(supabase_client.requests, "get", fake_get)
    result = supabase_client.fetch_campana_detail(10)

    assert result is not None
    assert result["nivel"] == "alto"
    assert result["top_productos_detalle"] == prods


def test_fetch_campana_detail_no_encontrada(monkeypatch):
    def fake_get(url, headers, params, timeout):
        return FakeResponse(200, [])

    monkeypatch.setattr(supabase_client.requests, "get", fake_get)
    assert supabase_client.fetch_campana_detail(99) is None


def test_fetch_campana_detail_excepcion(monkeypatch):
    def fake_get(url, headers, params, timeout):
        raise RuntimeError("timeout")

    monkeypatch.setattr(supabase_client.requests, "get", fake_get)
    assert supabase_client.fetch_campana_detail(1) is None
