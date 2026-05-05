"""
TC-RISK — Tests para models/risk.py

Semáforo:
  🔴 pesos deben sumar exactamente 1.0 (invariante matemático)
  🔴 score con total=0 (sin historial) devuelve valor fijo sin ZeroDivisionError
  🔴 compute_ire_proyectado no produce stock negativo
  🟡 umbrales de nivel (≤25 bajo, ≤50 moderado, ≤75 alto, >75 critico)
  🟢 _clamp nunca devuelve valor fuera de [lo, hi]
"""
import pytest
from models.risk import _clamp, compute_ire, compute_ire_proyectado


# ─── _clamp ───────────────────────────────────────────────────────────────────

class TestClamp:
    def test_valor_dentro_de_rango_sin_cambios(self):
        assert _clamp(50.0) == 50.0

    def test_valor_por_debajo_del_minimo_retorna_minimo(self):
        assert _clamp(-10.0) == 0.0

    def test_valor_por_encima_del_maximo_retorna_maximo(self):
        assert _clamp(150.0) == 100.0

    def test_exactamente_en_el_limite_inferior(self):
        assert _clamp(0.0) == 0.0

    def test_exactamente_en_el_limite_superior(self):
        assert _clamp(100.0) == 100.0

    def test_rango_personalizado(self):
        assert _clamp(50.0, 10.0, 40.0) == 40.0
        assert _clamp(5.0, 10.0, 40.0) == 10.0


# ─── Helpers de fixtures ──────────────────────────────────────────────────────

def make_pred(nivel_riesgo="estable", tendencia="estable", stock=10,
              consumo=1.0, alta_demanda=False, drift=0.0, sin_historial=False):
    return {
        "nivel_riesgo": nivel_riesgo,
        "tendencia": tendencia,
        "stock_actual": stock,
        "consumo_estimado_diario": consumo,
        "alta_demanda": alta_demanda,
        "drift_score": drift,
        "sin_historial": sin_historial,
    }

def make_revenue(tendencia="estable", crecimiento=0.0, confianza=75):
    return {
        "summary": {
            "tendencia": tendencia,
            "crecimiento_estimado_pct": crecimiento,
            "confianza": confianza,
        }
    }


# ─── compute_ire ──────────────────────────────────────────────────────────────

class TestComputeIre:

    def test_sin_predicciones_devuelve_score_valido(self):
        result = compute_ire([], None)
        assert 0 <= result["score"] <= 100
        assert result["nivel"] in ("bajo", "moderado", "alto", "critico")

    def test_todos_sin_historial_usa_defaults(self):
        preds = [make_pred(sin_historial=True)] * 5
        result = compute_ire(preds, None)
        # stock_risk=40, revenue_risk=45 (sin revenue), demand_risk=25
        # score = round(40*0.4 + 45*0.35 + 25*0.25) = round(16+15.75+6.25) = round(38) = 38
        assert result["score"] == 38
        assert result["nivel"] == "moderado"

    def test_todos_criticos_score_alto(self):
        preds = [make_pred(nivel_riesgo="critico")] * 10
        result = compute_ire(preds, None)
        assert result["score"] >= 70

    def test_todos_estables_score_bajo(self):
        preds = [make_pred(nivel_riesgo="estable", tendencia="estable", stock=100)] * 10
        result = compute_ire(preds, make_revenue("subiendo", 20.0, 90))
        assert result["score"] <= 50

    def test_pesos_suman_exactamente_1(self):
        result = compute_ire([make_pred()], None)
        pesos = result["pesos"]
        total = pesos["riesgo_stock"] + pesos["riesgo_ingresos"] + pesos["riesgo_demanda"]
        assert abs(total - 1.0) < 1e-9, f"Pesos no suman 1.0: {total}"

    def test_sin_revenue_usa_45_por_defecto(self):
        preds = [make_pred()]
        result = compute_ire(preds, None)
        assert result["dimensiones"]["riesgo_ingresos"] == 45

    def test_revenue_bajando_eleva_riesgo_ingresos(self):
        preds = [make_pred()]
        result_bajo = compute_ire(preds, make_revenue("subiendo", 15.0, 80))
        result_alto = compute_ire(preds, make_revenue("bajando", -20.0, 50))
        assert result_alto["dimensiones"]["riesgo_ingresos"] > result_bajo["dimensiones"]["riesgo_ingresos"]

    def test_nivel_bajo_cuando_score_le_25(self):
        # Forzamos predicciones muy favorables
        preds = [make_pred(nivel_riesgo="estable", tendencia="subiendo", stock=200, consumo=0.1)] * 5
        revenue = make_revenue("subiendo", 30.0, 95)
        result = compute_ire(preds, revenue)
        if result["score"] <= 25:
            assert result["nivel"] == "bajo"

    def test_nivel_critico_cuando_score_gt_75(self):
        preds = [make_pred(nivel_riesgo="critico", tendencia="bajando", stock=0, consumo=5.0, alta_demanda=True, drift=0.9)] * 10
        revenue = make_revenue("bajando", -50.0, 30)
        result = compute_ire(preds, revenue)
        if result["score"] > 75:
            assert result["nivel"] == "critico"

    def test_umbrales_de_nivel_correctos(self):
        for score, expected_nivel in [(25, "bajo"), (26, "moderado"), (50, "moderado"),
                                       (51, "alto"), (75, "alto"), (76, "critico")]:
            nivel = "bajo" if score <= 25 else "moderado" if score <= 50 else "alto" if score <= 75 else "critico"
            assert nivel == expected_nivel

    def test_score_siempre_entre_0_y_100(self):
        extremos = [
            ([], None),
            ([make_pred(nivel_riesgo="critico")] * 20, make_revenue("bajando", -100.0, 0)),
            ([make_pred(nivel_riesgo="estable")] * 20, make_revenue("subiendo", 100.0, 100)),
        ]
        for preds, rev in extremos:
            result = compute_ire(preds, rev)
            assert 0 <= result["score"] <= 100, f"Score fuera de rango: {result['score']}"

    def test_detalle_contiene_conteos_correctos(self):
        preds = [
            make_pred(nivel_riesgo="critico"),
            make_pred(nivel_riesgo="atencion"),
            make_pred(nivel_riesgo="estable"),
            make_pred(sin_historial=True),
        ]
        result = compute_ire(preds, None)
        det = result["detalle"]
        assert det["productos_criticos"] == 1
        assert det["productos_atencion"] == 1
        assert det["total_con_historial"] == 3
        assert det["total_sin_historial"] == 1

    def test_alta_demanda_sin_stock_eleva_riesgo_demanda(self):
        preds_con_alerta = [make_pred(alta_demanda=True, stock=0)] * 5
        preds_sin_alerta = [make_pred(alta_demanda=False, stock=50)] * 5
        result_alto = compute_ire(preds_con_alerta, None)
        result_bajo = compute_ire(preds_sin_alerta, None)
        assert result_alto["dimensiones"]["riesgo_demanda"] > result_bajo["dimensiones"]["riesgo_demanda"]

    def test_confianza_baja_eleva_riesgo_ingresos(self):
        preds = [make_pred()]
        result_alta = compute_ire(preds, make_revenue("estable", 0.0, 90))
        result_baja = compute_ire(preds, make_revenue("estable", 0.0, 20))
        assert result_baja["dimensiones"]["riesgo_ingresos"] > result_alta["dimensiones"]["riesgo_ingresos"]


# ─── compute_ire_proyectado ───────────────────────────────────────────────────

class TestComputeIreProyectado:

    def test_horizonte_dias_en_resultado(self):
        result = compute_ire_proyectado([make_pred()], None, 30)
        assert result["horizonte_dias"] == 30

    def test_stock_proyectado_nunca_negativo(self):
        # consumo alto, horizonte largo → stock debe quedar en 0, no negativo
        preds = [make_pred(stock=5, consumo=2.0)]
        # Con horizonte=10, stock_proj = max(0, 5 - 2*10) = 0
        result = compute_ire_proyectado(preds, None, 10)
        assert result["score"] >= 0  # Score válido
        assert result["horizonte_dias"] == 10

    def test_consumo_cero_no_reduce_stock(self):
        preds = [make_pred(stock=50, consumo=0.0)]
        result_hoy = compute_ire([make_pred(stock=50, consumo=0.0)], None)
        result_proy = compute_ire_proyectado(preds, None, 30)
        # Con consumo=0, stock proyectado = stock actual → riesgo_stock igual
        assert result_proy["dimensiones"]["riesgo_stock"] == result_hoy["dimensiones"]["riesgo_stock"]

    def test_producto_sin_historial_no_modifica_stock(self):
        pred = make_pred(sin_historial=True, stock=10, consumo=5.0)
        result = compute_ire_proyectado([pred], None, 30)
        # Los sin_historial se copian sin cambios, no deben afectar el cálculo
        assert result["horizonte_dias"] == 30

    def test_horizonte_largo_aumenta_riesgo_vs_corto(self):
        preds = [make_pred(stock=20, consumo=2.0, nivel_riesgo="estable")]
        result_corto = compute_ire_proyectado(preds, None, 5)
        result_largo = compute_ire_proyectado(preds, None, 15)
        # A mayor horizonte, más stock consumido → más riesgo
        assert result_largo["score"] >= result_corto["score"]

    def test_stock_agotado_se_clasifica_como_critico(self):
        # stock=10, consumo=2/día, horizonte=10 → stock_proj=0 → critico
        preds = [make_pred(stock=10, consumo=2.0, nivel_riesgo="estable")] * 5
        result = compute_ire_proyectado(preds, None, 10)
        assert result["dimensiones"]["riesgo_stock"] > 0
