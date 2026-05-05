"""
TC-DEMAND — Tests para models/demand.py (funciones puras y sin dependencias de BD)

Semáforo:
  🔴 _drift_score con std=0 usa fallback 1.0 (no ZeroDivisionError)
  🔴 _percentile con lista vacía devuelve 0.0 (no IndexError)
  🔴 _data_hash es determinista y diferencia datasets distintos
  🟡 build_daily_sales_by_product maneja sales vacías y devueltas (devuelto=True)
  🟢 _safe_float maneja None, "", strings y números
"""
import pytest
from datetime import date, timedelta
from models.demand import (
    _safe_float,
    _iso_date,
    _percentile,
    _data_hash,
    _drift_score,
    build_daily_sales_by_product,
)


# ─── _safe_float ──────────────────────────────────────────────────────────────

class TestSafeFloat:
    def test_numero_entero(self):
        assert _safe_float(5) == 5.0

    def test_numero_float(self):
        assert _safe_float(3.14) == 3.14

    def test_string_numerico(self):
        assert _safe_float("2.5") == 2.5

    def test_none_devuelve_cero(self):
        assert _safe_float(None) == 0.0

    def test_string_vacio_devuelve_cero(self):
        assert _safe_float("") == 0.0

    def test_string_no_numerico_devuelve_cero(self):
        assert _safe_float("abc") == 0.0

    def test_cero_devuelve_cero(self):
        assert _safe_float(0) == 0.0


# ─── _iso_date ────────────────────────────────────────────────────────────────

class TestIsoDate:
    def test_string_iso_devuelve_primeros_10_chars(self):
        assert _iso_date("2026-05-04T12:00:00") == "2026-05-04"

    def test_string_corto_devuelve_none(self):
        assert _iso_date("2026") is None

    def test_none_devuelve_none(self):
        assert _iso_date(None) is None

    def test_objeto_date_python(self):
        d = date(2026, 5, 4)
        assert _iso_date(d) == "2026-05-04"


# ─── _percentile ─────────────────────────────────────────────────────────────

class TestPercentile:
    def test_lista_vacia_devuelve_cero(self):
        assert _percentile([], 0.5) == 0.0

    def test_un_elemento(self):
        assert _percentile([42.0], 0.5) == 42.0
        assert _percentile([42.0], 0.0) == 42.0
        assert _percentile([42.0], 1.0) == 42.0

    def test_mediana(self):
        assert _percentile([1.0, 2.0, 3.0, 4.0, 5.0], 0.5) == 3.0

    def test_percentil_0_es_minimo(self):
        assert _percentile([3.0, 1.0, 5.0], 0.0) == 1.0

    def test_percentil_1_es_maximo(self):
        assert _percentile([3.0, 1.0, 5.0], 1.0) == 5.0

    def test_cuantil_fuera_de_rango_clampea(self):
        # quantile > 1 → clampea a 1.0
        result = _percentile([1.0, 2.0, 3.0], 1.5)
        assert result == 3.0

    def test_interpolacion_correcta(self):
        # p75 de [1,2,3,4] ≈ 3.25
        result = _percentile([1.0, 2.0, 3.0, 4.0], 0.75)
        assert abs(result - 3.25) < 0.01


# ─── _data_hash ───────────────────────────────────────────────────────────────

class TestDataHash:
    def test_hash_es_determinista(self):
        data = {"p1": {"2026-01-01": 3.0, "2026-01-02": 5.0}}
        h1 = _data_hash(data)
        h2 = _data_hash(data)
        assert h1 == h2

    def test_datos_distintos_producen_hashes_distintos(self):
        data_a = {"p1": {"2026-01-01": 3.0}}
        data_b = {"p1": {"2026-01-01": 4.0}}
        assert _data_hash(data_a) != _data_hash(data_b)

    def test_diccionario_vacio_no_lanza(self):
        h = _data_hash({})
        assert isinstance(h, str)
        assert len(h) == 16  # MD5 truncado a 16 chars

    def test_longitud_siempre_16(self):
        for data in [{}, {"p1": {}}, {"p1": {"d1": 1.0, "d2": 2.0}}]:
            assert len(_data_hash(data)) == 16

    def test_orden_de_productos_no_importa(self):
        d1 = {"a": {"d": 1.0}, "b": {"d": 2.0}}
        d2 = {"b": {"d": 2.0}, "a": {"d": 1.0}}
        assert _data_hash(d1) == _data_hash(d2)


# ─── _drift_score ─────────────────────────────────────────────────────────────

class TestDriftScore:
    def test_feature_stats_vacio_devuelve_cero(self):
        assert _drift_score(5.0, 3.0, {}) == 0.0

    def test_sin_desviacion_std_cero_usa_fallback_1(self):
        # std = 0.0 → el código hace `std = stats.get("std", 1.0) or 1.0`
        # Esto devuelve 1.0 porque 0.0 es falsy en Python
        stats = {
            "lag_7":  {"mean": 5.0, "std": 0.0},
            "lag_30": {"mean": 3.0, "std": 0.0},
        }
        score = _drift_score(5.0, 3.0, stats)
        # Con std=1 (fallback), z = |5-5|/1 = 0 → drift_lag7=0
        # z = |3-3|/1 = 0 → drift_lag30=0
        assert score == 0.0

    def test_valores_en_la_media_devuelven_drift_cero(self):
        stats = {
            "lag_7":  {"mean": 5.0, "std": 2.0},
            "lag_30": {"mean": 3.0, "std": 1.0},
        }
        assert _drift_score(5.0, 3.0, stats) == 0.0

    def test_deriva_extrema_clampea_a_1(self):
        # z = 9/1 = 9 → min(9/3, 1) = 1.0
        stats = {
            "lag_7":  {"mean": 0.0, "std": 1.0},
            "lag_30": {"mean": 0.0, "std": 1.0},
        }
        score = _drift_score(9.0, 9.0, stats)
        assert score == 1.0

    def test_resultado_entre_0_y_1(self):
        stats = {
            "lag_7":  {"mean": 5.0, "std": 2.0},
            "lag_30": {"mean": 3.0, "std": 1.5},
        }
        for lag7, lag30 in [(0, 0), (5, 3), (20, 15), (100, 100)]:
            score = _drift_score(float(lag7), float(lag30), stats)
            assert 0.0 <= score <= 1.0, f"Drift fuera de rango: {score} para lag7={lag7}, lag30={lag30}"


# ─── build_daily_sales_by_product ─────────────────────────────────────────────

class TestBuildDailySalesByProduct:
    def _today(self, delta=0):
        return (date.today() + timedelta(days=delta)).isoformat()

    def test_lista_vacia_devuelve_dict_vacio(self):
        result = build_daily_sales_by_product([], [], [])
        assert result == {}

    def test_acumula_ventas_por_producto_y_dia(self):
        sales = [
            {"productId": "p1", "fecha": self._today(-1), "cantidad": 2, "devuelto": False,
             "nombre": "Test", "categoria": "hombre", "precioVenta": 100, "codigo": "C1"},
            {"productId": "p1", "fecha": self._today(-1), "cantidad": 1, "devuelto": False,
             "nombre": "Test", "categoria": "hombre", "precioVenta": 100, "codigo": "C1"},
        ]
        result = build_daily_sales_by_product(sales, [], [])
        assert result.get("p1", {}).get(self._today(-1), 0) == 3

    def test_ignora_ventas_devueltas(self):
        sales = [
            {"productId": "p1", "fecha": self._today(-1), "cantidad": 5, "devuelto": True,
             "nombre": "Test", "categoria": "hombre", "precioVenta": 100, "codigo": "C1"},
        ]
        result = build_daily_sales_by_product(sales, [], [])
        assert result.get("p1", {}).get(self._today(-1), 0) == 0

    def test_incluye_ventas_desde_pedidos_completados(self):
        orders = [
            {
                "creadoEn": self._today(-2),
                "pagadoEn": None,
                "items": [
                    {"product": {"id": "p2", "nombre": "B", "categoria": "dama", "precio": 150},
                     "quantity": 3, "size": "37"}
                ]
            }
        ]
        result = build_daily_sales_by_product([], orders, [])
        assert result.get("p2", {}).get(self._today(-2), 0) == 3

    def test_no_cuenta_ventas_sin_product_id(self):
        sales = [
            {"productId": None, "fecha": self._today(-1), "cantidad": 2, "devuelto": False,
             "nombre": "Test", "categoria": "hombre", "precioVenta": 100, "codigo": ""},
        ]
        result = build_daily_sales_by_product(sales, [], [])
        assert None not in result
        assert "" not in result

    def test_fecha_none_es_ignorada(self):
        sales = [
            {"productId": "p1", "fecha": None, "cantidad": 5, "devuelto": False,
             "nombre": "X", "categoria": "hombre", "precioVenta": 80, "codigo": ""},
        ]
        result = build_daily_sales_by_product(sales, [], [])
        assert result.get("p1") is None or len(result.get("p1", {})) == 0
