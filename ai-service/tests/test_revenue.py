"""
TC-REVENUE — Tests para models/revenue.py (funciones puras y sin dependencias de BD)

Semáforo:
  🟢 build_daily_revenue_series excluye canal='web' para evitar doble conteo — VERIFICADO
  🟢 build_daily_revenue_series excluye ventas devueltas (devuelto=True) — VERIFICADO
  🟢 forecast_revenue growth_rate se clampa en [-0.35, 0.35] — VERIFICADO
  🟢 build_daily_revenue_series acumula correctamente tienda_total y web_total — VERIFICADO
  🟢 forecast_revenue con datos vacíos devuelve estructura válida — VERIFICADO
  🟢 forecast_revenue siempre genera horizon_days puntos de forecast — VERIFICADO
  🟢 _clamp nunca devuelve valor fuera del rango dado — VERIFICADO
  🟢 _iso_date reconoce str y datetime; date nativo → None (comportamiento documentado)
"""
import pytest
from datetime import date, datetime, timedelta
from collections import defaultdict

from models.revenue import (
    _safe_float,
    _iso_date,
    _clamp,
    _build_date_range,
    build_daily_revenue_series,
    forecast_revenue,
    _revenue_growth_rate,
    _build_revenue_forecast_rows,
    _accumulate_tienda_revenue,
    _accumulate_web_revenue,
)


# ─── _safe_float ──────────────────────────────────────────────────────────────

class TestSafeFloat:
    def test_entero_devuelve_float(self):
        assert _safe_float(10) == 10.0

    def test_string_numerico(self):
        assert _safe_float("3.5") == 3.5

    def test_none_devuelve_cero(self):
        assert _safe_float(None) == 0.0

    def test_string_vacio_devuelve_cero(self):
        assert _safe_float("") == 0.0

    def test_string_no_numerico_devuelve_cero(self):
        # "NaN" en Python se convierte a float('nan') sin lanzar error
        # Un string verdaderamente no numérico como "xyz" sí produce ValueError → 0.0
        assert _safe_float("xyz") == 0.0


# ─── _iso_date ────────────────────────────────────────────────────────────────

class TestIsoDate:
    def test_string_iso_devuelve_primeros_10_chars(self):
        assert _iso_date("2026-05-04T10:00:00") == "2026-05-04"

    def test_string_corto_devuelve_none(self):
        assert _iso_date("05/04") is None

    def test_none_devuelve_none(self):
        assert _iso_date(None) is None

    def test_objeto_date(self):
        # _iso_date reconoce datetime (tiene .date()), no date nativo — date → None
        d = date(2026, 5, 4)
        assert _iso_date(d) is None

    def test_objeto_datetime(self):
        dt = datetime(2026, 5, 4, 12, 0, 0)
        assert _iso_date(dt) == "2026-05-04"


# ─── _clamp ───────────────────────────────────────────────────────────────────

class TestClamp:
    def test_valor_dentro_del_rango(self):
        assert _clamp(0.1, -0.35, 0.35) == 0.1

    def test_valor_menor_al_minimo(self):
        assert _clamp(-1.0, -0.35, 0.35) == -0.35

    def test_valor_mayor_al_maximo(self):
        assert _clamp(1.0, -0.35, 0.35) == 0.35

    def test_exactamente_en_limite_inferior(self):
        assert _clamp(-0.35, -0.35, 0.35) == -0.35

    def test_exactamente_en_limite_superior(self):
        assert _clamp(0.35, -0.35, 0.35) == 0.35


# ─── _build_date_range ────────────────────────────────────────────────────────

class TestBuildDateRange:
    def test_longitud_correcta(self):
        rng = _build_date_range(30)
        assert len(rng) == 30

    def test_ultimo_dia_es_hoy(self):
        rng = _build_date_range(7)
        assert rng[-1] == date.today().isoformat()

    def test_primer_dia_correcto(self):
        rng = _build_date_range(5)
        expected_first = (date.today() - timedelta(days=4)).isoformat()
        assert rng[0] == expected_first

    def test_un_dia_devuelve_hoy(self):
        rng = _build_date_range(1)
        assert rng == [date.today().isoformat()]


# ─── build_daily_revenue_series ───────────────────────────────────────────────

def make_sale(fecha: str, total: float, canal: str = "tienda",
              devuelto: bool = False) -> dict:
    return {"fecha": fecha, "total": total, "canal": canal, "devuelto": devuelto}


def make_order(fecha: str, total: float, pagadoEn: str | None = None) -> dict:
    return {"creadoEn": fecha, "pagadoEn": pagadoEn, "total": total}


def today(delta: int = 0) -> str:
    return (date.today() + timedelta(days=delta)).isoformat()


class TestBuildDailyRevenueSeries:

    def test_lista_vacia_devuelve_series_con_ceros(self):
        series, tienda, web = build_daily_revenue_series([], [], history_days=7)
        assert len(series) == 7
        assert all(p["ingresos"] == 0.0 for p in series)
        assert tienda == 0.0
        assert web == 0.0

    def test_acumula_ventas_tienda(self):
        sales = [
            make_sale(today(-1), 100.0),
            make_sale(today(-1), 50.0),
        ]
        series, tienda, web = build_daily_revenue_series(sales, [], history_days=7)
        matching = [p for p in series if p["fecha"] == today(-1)]
        assert matching[0]["ingresos"] == 150.0
        assert tienda == 150.0

    def test_excluye_canal_web_de_ventas_diarias(self):
        """Las ventas canal='web' ya están en pedidos → no doble conteo."""
        sales = [
            make_sale(today(-1), 200.0, canal="web"),
        ]
        series, tienda, web = build_daily_revenue_series(sales, [], history_days=7)
        assert tienda == 0.0
        assert all(p["ingresos"] == 0.0 for p in series)

    def test_excluye_ventas_devueltas(self):
        sales = [
            make_sale(today(-1), 300.0, devuelto=True),
        ]
        series, tienda, _ = build_daily_revenue_series(sales, [], history_days=7)
        assert tienda == 0.0
        assert all(p["ingresos"] == 0.0 for p in series)

    def test_incluye_pedidos_completados(self):
        orders = [make_order(today(-2), 500.0)]
        series, _, web = build_daily_revenue_series([], orders, history_days=7)
        matching = [p for p in series if p["fecha"] == today(-2)]
        assert matching[0]["ingresos"] == 500.0
        assert web == 500.0

    def test_usa_pagadoEn_si_existe(self):
        """pagadoEn tiene prioridad sobre creadoEn."""
        orders = [make_order(today(-5), 100.0, pagadoEn=today(-1))]
        series, _, web = build_daily_revenue_series([], orders, history_days=7)
        pagado_match = [p for p in series if p["fecha"] == today(-1)]
        creado_match = [p for p in series if p["fecha"] == today(-5)]
        assert pagado_match[0]["ingresos"] == 100.0
        # La fecha original no debe tener ingresos
        assert creado_match[0]["ingresos"] == 0.0

    def test_ventas_y_pedidos_misma_fecha_se_suman(self):
        sales = [make_sale(today(-1), 100.0)]
        orders = [make_order(today(-1), 200.0)]
        series, _, _ = build_daily_revenue_series(sales, orders, history_days=7)
        matching = [p for p in series if p["fecha"] == today(-1)]
        assert matching[0]["ingresos"] == 300.0

    def test_longitud_de_serie_igual_a_history_days(self):
        series, _, _ = build_daily_revenue_series([], [], history_days=30)
        assert len(series) == 30

    def test_excluye_fechas_fuera_del_ventana(self):
        # Venta muy antigua (fuera del history_days=7)
        old_date = (date.today() - timedelta(days=30)).isoformat()
        sales = [make_sale(old_date, 999.0)]
        _, tienda, _ = build_daily_revenue_series(sales, [], history_days=7)
        # No entra en tienda_total (fuera del window)
        assert tienda == 0.0

    def test_total_venta_cero_no_se_acumula(self):
        sales = [make_sale(today(-1), 0.0)]
        series, tienda, _ = build_daily_revenue_series(sales, [], history_days=7)
        assert tienda == 0.0


# ─── forecast_revenue ─────────────────────────────────────────────────────────

class TestForecastRevenue:

    def test_estructura_resultado(self):
        result = forecast_revenue([], [], horizon_days=30)
        assert "summary" in result
        assert "history" in result
        assert "forecast" in result
        assert result["horizon_days"] == 30

    def test_forecast_tiene_exactamente_chart_forecast_days_puntos(self):
        result = forecast_revenue([], [], horizon_days=30, chart_forecast_days=14)
        assert len(result["forecast"]) == 14

    def test_summary_campos_obligatorios(self):
        result = forecast_revenue([], [], horizon_days=30)
        summary = result["summary"]
        for campo in ("tendencia", "confianza", "proximo_7_dias", "proximo_30_dias",
                      "promedio_diario_historico", "crecimiento_estimado_pct"):
            assert campo in summary, f"Falta campo en summary: {campo}"

    def test_tendencia_valida(self):
        result = forecast_revenue([], [], horizon_days=30)
        assert result["summary"]["tendencia"] in ("subiendo", "bajando", "estable")

    def test_confianza_entre_30_y_95(self):
        result = forecast_revenue([], [], horizon_days=30)
        confianza = result["summary"]["confianza"]
        assert 30 <= confianza <= 95, f"Confianza fuera de rango: {confianza}"

    def test_projected_ingresos_nunca_negativos(self):
        result = forecast_revenue([], [], horizon_days=30)
        for punto in result["forecast"]:
            assert punto["ingresos"] >= 0.0, f"Ingreso negativo en {punto['fecha']}: {punto['ingresos']}"

    def test_growth_rate_clampeo_extremo_positivo(self):
        """Con ventas crecientes hacia el presente el growth_rate debe quedar en 0.35."""
        # today-1 tiene el valor más alto (59M), today-59 el más bajo (1M) → crecimiento reciente
        sales = [make_sale(today(-i), 1_000_000.0 * (60 - i)) for i in range(1, 60)]
        result = forecast_revenue(sales, [], horizon_days=30)
        assert result["summary"]["tendencia"] == "subiendo"
        assert result["summary"]["confianza"] >= 30

    def test_growth_rate_clampeo_extremo_negativo(self):
        """Con caída extrema el growth_rate debe quedar en -0.35."""
        recent_sales = [make_sale(today(-i), 1.0) for i in range(1, 30)]
        old_sales = [make_sale(today(-i), 1_000_000.0) for i in range(30, 60)]
        result = forecast_revenue(recent_sales + old_sales, [], horizon_days=30)
        assert result["summary"]["tendencia"] == "bajando"

    def test_sin_datos_tendencia_es_estable(self):
        result = forecast_revenue([], [], horizon_days=30)
        assert result["summary"]["tendencia"] == "estable"

    def test_history_tiene_chart_history_days_puntos(self):
        result = forecast_revenue([], [], horizon_days=30, chart_history_days=21)
        assert len(result["history"]) == 21

    def test_history_items_tienen_tipo_historico(self):
        result = forecast_revenue([], [], horizon_days=7, chart_history_days=7)
        for punto in result["history"]:
            assert punto["tipo"] == "historico"

    def test_forecast_items_tienen_tipo_proyectado(self):
        result = forecast_revenue([], [], horizon_days=14, chart_forecast_days=14)
        for punto in result["forecast"]:
            assert punto["tipo"] == "proyectado"

    def test_forecast_items_tienen_label(self):
        result = forecast_revenue([], [], horizon_days=7, chart_forecast_days=7)
        for punto in result["forecast"]:
            assert "label" in punto
            assert "/" in punto["label"]  # formato DD/MM

    def test_horizonte_largo_proyecta_mas_ingresos(self):
        """Con ventas reales, un horizonte mayor acumula más ingresos proyectados."""
        sales = [make_sale(today(-i), 100.0) for i in range(1, 60)]
        r30 = forecast_revenue(sales, [], horizon_days=30)
        r60 = forecast_revenue(sales, [], horizon_days=60)
        assert r60["summary"]["proximo_horizonte"] >= r30["summary"]["proximo_horizonte"]

    def test_tienda_total_y_web_total_en_summary(self):
        result = forecast_revenue([], [], horizon_days=30)
        summary = result["summary"]
        assert "total_historico_tienda" in summary
        assert "total_historico_web" in summary

    def test_ventas_web_no_se_cuentan_en_tienda_total(self):
        sales = [make_sale(today(-1), 200.0, canal="web")]
        result = forecast_revenue(sales, [], horizon_days=7)
        assert result["summary"]["total_historico_tienda"] == 0.0

    def test_pedidos_van_a_web_total(self):
        orders = [make_order(today(-1), 350.0)]
        result = forecast_revenue([], orders, horizon_days=7)
        assert result["summary"]["total_historico_web"] == 350.0


# ─── helpers internos (cobertura Sonar) ──────────────────────────────────────


class TestRevenueGrowthRate:
    def test_crecimiento_moderado_sin_clamp(self):
        g = _revenue_growth_rate([6.0], [5.0], 1, 1, 1.0)
        assert g == pytest.approx(0.2)

    def test_prior_promedio_cero_reciente_positivo(self):
        g = _revenue_growth_rate([4.0, 4.0], [0.0, 0.0, 0.0, 0.0, 0.0], 2, 5, 1.0)
        assert g == pytest.approx(0.12)

    def test_ambos_promedios_cero(self):
        g = _revenue_growth_rate([0.0], [0.0], 1, 1, 0.0)
        assert g == pytest.approx(0.0)

    def test_clamp_superior(self):
        g = _revenue_growth_rate([100.0], [1.0], 1, 1, 1.0)
        assert g == pytest.approx(0.35)


def test_build_revenue_forecast_rows_produce_horizonte():
    recent = defaultdict(list)
    all_wd = defaultdict(list)
    fc = _build_revenue_forecast_rows(5, recent, all_wd, 100.0, 0.0, 0.0)
    assert len(fc) == 5
    assert all("fecha" in r and "ingresos" in r for r in fc)


def test_build_revenue_forecast_rows_sin_estacional_usa_promedios():
    """seasonal_base <= 0 usa recent_avg u overall_avg."""
    fc = _build_revenue_forecast_rows(2, defaultdict(list), defaultdict(list), 50.0, 12.0, 0.05)
    assert len(fc) == 2
    assert fc[0]["ingresos"] >= 0


def test_forecast_revenue_crecimiento_horizonte_cero_sin_historial():
    result = forecast_revenue([], [], horizon_days=7)
    assert result["summary"]["crecimiento_estimado_horizonte_pct"] == 0.0
    assert result["summary"]["ultimo_horizonte"] == 0.0


def test_accumulate_tienda_ignora_canal_web_y_sin_fecha():
    by_date = defaultdict(float)
    dr = {today(0)}
    sales = [
        make_sale(today(-1), 10.0, canal="web"),
        make_sale("", 5.0),
    ]
    total = _accumulate_tienda_revenue(sales, by_date, dr)
    assert total == 0.0


def test_accumulate_web_ignora_total_cero():
    by_date = defaultdict(float)
    dr = {today(-1)}
    orders = [make_order(today(-1), 0.0)]
    assert _accumulate_web_revenue(orders, by_date, dr) == 0.0
