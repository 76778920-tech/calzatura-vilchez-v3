"""
Tests unitarios de la máquina de estados del ciclo de vida de campaña.

Testa decide_next_state como función pura (sin mocks) y
_advance_state / apply_state_transition con mocks de
save_campana_detectada y update_campana_estado.
Sin FastAPI TestClient, sin auth, sin rate limiter — solo la lógica de transición.

Transiciones cubiertas:
  nueva campaña sin riesgo_stock    → estado "inicio"
  nueva campaña con riesgo_stock    → estado "en_riesgo_stock"
  observando/inicio + sin riesgo    → "activa"
  observando/inicio + riesgo        → "en_riesgo_stock"
  activa + riesgo                   → "en_riesgo_stock"
  activa + sin riesgo               → sin cambio (update no llamado)
  en_riesgo_stock + sin riesgo      → "activa" (stock repuesto)
  en_riesgo_stock + riesgo          → sin cambio
  finalizando (rebote) + sin riesgo → "activa"
  finalizando (rebote) + riesgo     → "en_riesgo_stock"
  descartada + campaña detectada    → sin cambio (terminal)
  no detectada + last activa        → "finalizando"
  no detectada + last finalizando   → "finalizada"
  no detectada + cierre=finalizada  → "finalizada"
  no detectada + sin last           → nada persiste
"""

import os
from unittest.mock import MagicMock, patch

import pytest

os.environ.setdefault("SUPABASE_URL",          "https://fake.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_KEY",  "fake-key")
os.environ.setdefault("AI_SERVICE_BEARER_TOKEN", "test-token")

import main  # noqa: E402

TODAY_ISO = "2026-05-08"


# ── Factories ─────────────────────────────────────────────────────────────────

def _result(
    detected: bool = True,
    nivel: str = "alta",
    riesgo: bool = False,
    cierre: str | None = None,
) -> dict:
    return {
        "campaign_detected":  detected,
        "nivel":              nivel,
        "scope":              "global" if detected else None,
        "foco_tipo":          "global" if detected else None,
        "foco_nombre":        None,
        "foco_uplift":        1.8,
        "cierre_estado":      cierre,
        "riesgo_stock":       riesgo,
        "tipo_sugerido":      "cyber-wow",
        "confidence_pct":     75.0,
        "mensaje":            "test",
        "categorias_afectadas": [],
        "top_productos":      [],
        "recomendacion":      "ok.",
        "impacto_estimado_soles": 500.0,
        "impacto_estimado_soles_focalizado": 0.0,
    }


def _last(estado: str = "activa", campana_id: int = 1) -> dict:
    return {
        "id":              campana_id,
        "estado":          estado,
        "fecha_deteccion": "2026-05-01",
        "nivel":           "alta",
        "tipo_sugerido":   "cyber-wow",
        "uplift_ratio":    2.1,
    }


def _metricas() -> dict:
    return {"uplift_ratio": 2.1, "z_score": 2.5, "actual_sum": 42,
            "ventas_soles_recientes": 1800}


def _run(result: dict, last, save_ret: dict | None = None):
    """
    Llama a _advance_state con mocks de save/update.
    Devuelve (campana_id, mock_save, mock_update, result_mutado).
    """
    mock_save   = MagicMock(return_value=save_ret or {"id": 99})
    mock_update = MagicMock()
    with (
        patch("main.save_campana_detectada", mock_save),
        patch("main.update_campana_estado",  mock_update),
    ):
        cid = main._advance_state(result, last, TODAY_ISO, _metricas())
    return cid, mock_save, mock_update


# ══════════════════════════════════════════════════════════════════════════════
# 1. NUEVAS CAMPAÑAS (last=None)
# ══════════════════════════════════════════════════════════════════════════════

class TestNuevaCampana:

    def test_sin_riesgo_crea_con_estado_inicio(self):
        result = _result(detected=True, riesgo=False)
        cid, mock_save, _ = _run(result, last=None)
        mock_save.assert_called_once()
        assert mock_save.call_args[0][0]["estado"] == "inicio"
        assert result["evento_estado"] == "inicio"
        assert cid == 99

    def test_con_riesgo_crea_con_estado_en_riesgo_stock(self):
        result = _result(detected=True, riesgo=True)
        cid, mock_save, _ = _run(result, last=None)
        mock_save.assert_called_once()
        assert mock_save.call_args[0][0]["estado"] == "en_riesgo_stock"
        assert result["evento_estado"] == "en_riesgo_stock"

    def test_sin_deteccion_no_persiste_nada(self):
        result = _result(detected=False, nivel="normal")
        cid, mock_save, mock_update = _run(result, last=None)
        mock_save.assert_not_called()
        mock_update.assert_not_called()
        assert cid is None
        assert "evento_estado" not in result

    def test_evento_contiene_campos_obligatorios(self):
        result = _result(detected=True, riesgo=False)
        _run(result, last=None)
        # Verificar que el evento enviado a save tiene todos los campos clave
        # que la BD necesita para crear la fila correctamente
        evento = MagicMock()
        with patch("main.save_campana_detectada", return_value={"id": 1}) as ms:
            main._advance_state(result, None, TODAY_ISO, _metricas())
            evento = ms.call_args[0][0]
        for campo in ("fecha_deteccion", "nivel", "estado", "metricas", "tipo_sugerido"):
            assert campo in evento, f"Falta '{campo}' en el evento guardado"


# ══════════════════════════════════════════════════════════════════════════════
# 2. CAMPAÑA EXISTENTE — transiciones riesgo_stock
# ══════════════════════════════════════════════════════════════════════════════

class TestTransicionesConRiesgo:

    @pytest.mark.parametrize("prev", ["observando", "inicio", "finalizando"])
    def test_prev_sin_riesgo_pasa_a_activa(self, prev):
        result = _result(detected=True, riesgo=False)
        _, _, mock_update = _run(result, last=_last(estado=prev))
        mock_update.assert_called_once_with(1, "activa")
        assert result["evento_estado"] == "activa"

    @pytest.mark.parametrize("prev", ["observando", "inicio", "finalizando"])
    def test_prev_con_riesgo_pasa_a_en_riesgo_stock(self, prev):
        result = _result(detected=True, riesgo=True)
        _, _, mock_update = _run(result, last=_last(estado=prev))
        mock_update.assert_called_once_with(1, "en_riesgo_stock")
        assert result["evento_estado"] == "en_riesgo_stock"

    def test_activa_con_riesgo_pasa_a_en_riesgo_stock(self):
        result = _result(detected=True, riesgo=True)
        _, _, mock_update = _run(result, last=_last(estado="activa"))
        mock_update.assert_called_once_with(1, "en_riesgo_stock")
        assert result["evento_estado"] == "en_riesgo_stock"

    def test_activa_sin_riesgo_no_llama_update(self):
        result = _result(detected=True, riesgo=False)
        _, _, mock_update = _run(result, last=_last(estado="activa"))
        mock_update.assert_not_called()
        assert result["evento_estado"] == "activa"

    def test_en_riesgo_sin_riesgo_vuelve_a_activa(self):
        result = _result(detected=True, riesgo=False)
        _, _, mock_update = _run(result, last=_last(estado="en_riesgo_stock"))
        mock_update.assert_called_once_with(1, "activa")
        assert result["evento_estado"] == "activa"

    def test_en_riesgo_con_riesgo_no_llama_update(self):
        result = _result(detected=True, riesgo=True)
        _, _, mock_update = _run(result, last=_last(estado="en_riesgo_stock"))
        mock_update.assert_not_called()
        assert result["evento_estado"] == "en_riesgo_stock"

    def test_descartada_es_terminal_no_se_toca(self):
        result = _result(detected=True, riesgo=False)
        _, _, mock_update = _run(result, last=_last(estado="descartada"))
        mock_update.assert_not_called()
        assert result["evento_estado"] == "descartada"

    def test_fecha_inicio_campana_propagada_en_result(self):
        result = _result(detected=True, riesgo=False)
        _run(result, last=_last(estado="activa"))
        assert result.get("fecha_inicio_campaña") == "2026-05-01"


# ══════════════════════════════════════════════════════════════════════════════
# 3. SIN DETECCIÓN — cierre de campaña existente
# ══════════════════════════════════════════════════════════════════════════════

class TestCierreCampana:

    def test_no_detectada_activa_pasa_a_finalizando(self):
        result = _result(detected=False, nivel="normal")
        _, _, mock_update = _run(result, last=_last(estado="activa"))
        mock_update.assert_called_once_with(1, "finalizando")
        assert result["evento_estado"] == "finalizando"

    def test_no_detectada_finalizando_cierra_definitivamente(self):
        result = _result(detected=False, nivel="normal")
        _, _, mock_update = _run(result, last=_last(estado="finalizando"))
        args, kwargs = mock_update.call_args
        assert args[0] == 1
        assert args[1] == "finalizada"
        assert result["evento_estado"] == "finalizada"

    def test_no_detectada_cierre_finalizada_cierra_definitivamente(self):
        result = _result(detected=False, nivel="normal", cierre="finalizada")
        _, _, mock_update = _run(result, last=_last(estado="activa"))
        args, _ = mock_update.call_args
        assert args[1] == "finalizada"
        assert result["evento_estado"] == "finalizada"

    def test_no_detectada_sin_last_devuelve_none(self):
        result = _result(detected=False, nivel="normal")
        cid, mock_save, mock_update = _run(result, last=None)
        mock_save.assert_not_called()
        mock_update.assert_not_called()
        assert cid is None

    def test_mensaje_finalizada_incluye_fecha_inicio(self):
        result = _result(detected=False, nivel="normal")
        _run(result, last=_last(estado="finalizando"))
        assert "2026-05-01" in result["mensaje"]


# ══════════════════════════════════════════════════════════════════════════════
# 4. decide_next_state — función verdaderamente pura (sin mocks)
# ══════════════════════════════════════════════════════════════════════════════

class TestDecideNextState:
    """
    Prueba decide_next_state directamente — ningún mock necesario.
    Solo verifica el dict de decisión; no toca BD ni muta result.
    """

    def test_nueva_sin_riesgo_action_save_new_inicio(self):
        d = main.decide_next_state(_result(detected=True, riesgo=False), None, TODAY_ISO, _metricas())
        assert d["action"] == "save_new"
        assert d["estado_inicial"] == "inicio"
        assert d["evento"]["estado"] == "inicio"

    def test_nueva_con_riesgo_action_save_new_en_riesgo(self):
        d = main.decide_next_state(_result(detected=True, riesgo=True), None, TODAY_ISO, _metricas())
        assert d["action"] == "save_new"
        assert d["estado_inicial"] == "en_riesgo_stock"
        assert d["evento"]["estado"] == "en_riesgo_stock"

    def test_no_detectada_sin_last_es_noop(self):
        d = main.decide_next_state(_result(detected=False), None, TODAY_ISO, _metricas())
        assert d["action"] == "noop"
        assert d["campana_id"] is None

    def test_activa_con_riesgo_new_estado_en_riesgo(self):
        d = main.decide_next_state(
            _result(detected=True, riesgo=True), _last(estado="activa"), TODAY_ISO, _metricas()
        )
        assert d["action"] == "update_estado"
        assert d["new_estado"] == "en_riesgo_stock"
        assert d["prev_estado"] == "activa"

    def test_activa_sin_riesgo_new_estado_igual_prev(self):
        d = main.decide_next_state(
            _result(detected=True, riesgo=False), _last(estado="activa"), TODAY_ISO, _metricas()
        )
        assert d["new_estado"] == "activa"
        assert d["prev_estado"] == "activa"

    def test_en_riesgo_sin_riesgo_new_estado_activa(self):
        d = main.decide_next_state(
            _result(detected=True, riesgo=False), _last(estado="en_riesgo_stock"), TODAY_ISO, _metricas()
        )
        assert d["new_estado"] == "activa"
        assert d["prev_estado"] == "en_riesgo_stock"

    def test_en_riesgo_con_riesgo_new_estado_igual_prev(self):
        d = main.decide_next_state(
            _result(detected=True, riesgo=True), _last(estado="en_riesgo_stock"), TODAY_ISO, _metricas()
        )
        assert d["new_estado"] == "en_riesgo_stock"
        assert d["prev_estado"] == "en_riesgo_stock"

    def test_descartada_new_estado_igual_prev(self):
        d = main.decide_next_state(
            _result(detected=True, riesgo=False), _last(estado="descartada"), TODAY_ISO, _metricas()
        )
        assert d["new_estado"] == "descartada"
        assert d["prev_estado"] == "descartada"

    def test_no_detectada_activa_new_estado_finalizando(self):
        d = main.decide_next_state(
            _result(detected=False), _last(estado="activa"), TODAY_ISO, _metricas()
        )
        assert d["new_estado"] == "finalizando"
        assert d["mensaje_suffix"] is None

    def test_no_detectada_finalizando_new_estado_finalizada_con_fecha_fin(self):
        d = main.decide_next_state(
            _result(detected=False), _last(estado="finalizando"), TODAY_ISO, _metricas()
        )
        assert d["new_estado"] == "finalizada"
        assert "fecha_fin" in d["update_kwargs"]
        assert d["update_kwargs"]["fecha_fin"] == TODAY_ISO

    def test_no_detectada_cierre_finalizada_new_estado_finalizada(self):
        d = main.decide_next_state(
            _result(detected=False, cierre="finalizada"), _last(estado="activa"), TODAY_ISO, _metricas()
        )
        assert d["new_estado"] == "finalizada"

    def test_evento_nuevo_contiene_campos_requeridos(self):
        d = main.decide_next_state(_result(detected=True, riesgo=False), None, TODAY_ISO, _metricas())
        for campo in ("fecha_deteccion", "nivel", "estado", "metricas", "tipo_sugerido"):
            assert campo in d["evento"], f"Falta '{campo}' en evento"

    def test_finalizando_mensaje_suffix_contiene_fecha(self):
        d = main.decide_next_state(
            _result(detected=False), _last(estado="finalizando"), TODAY_ISO, _metricas()
        )
        assert d["mensaje_suffix"] is not None
        assert "2026-05-01" in d["mensaje_suffix"]

    @pytest.mark.parametrize("prev", ["observando", "inicio", "finalizando"])
    def test_prev_sin_riesgo_new_estado_activa(self, prev):
        d = main.decide_next_state(
            _result(detected=True, riesgo=False), _last(estado=prev), TODAY_ISO, _metricas()
        )
        assert d["new_estado"] == "activa"

    @pytest.mark.parametrize("prev", ["observando", "inicio", "finalizando"])
    def test_prev_con_riesgo_new_estado_en_riesgo(self, prev):
        d = main.decide_next_state(
            _result(detected=True, riesgo=True), _last(estado=prev), TODAY_ISO, _metricas()
        )
        assert d["new_estado"] == "en_riesgo_stock"
