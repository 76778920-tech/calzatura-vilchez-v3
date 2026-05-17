"""
TC-DEMAND — Tests para models/demand.py (funciones puras y sin dependencias de BD)

Semáforo:
  🟢 _drift_score con std=0 usa fallback 1.0 (no ZeroDivisionError) — VERIFICADO
  🟢 _percentile con lista vacía devuelve 0.0 (no IndexError) — VERIFICADO
  🟢 _data_hash es determinista y diferencia datasets distintos — VERIFICADO
  🟢 build_daily_sales_by_product maneja sales vacías y devueltas (devuelto=True) — VERIFICADO
  🟢 _safe_float maneja None, "", strings y números — VERIFICADO
  🟢 _iso_date reconoce str y datetime; date nativo → None (comportamiento documentado)
"""
import pytest
from datetime import date, datetime, timedelta
from models.demand import (
    FEATURE_COLS,
    _safe_float,
    _iso_date,
    _percentile,
    _data_hash,
    _drift_score,
    _lag_features,
    _normalize_campaign,
    _season_flags,
    build_daily_sales_by_product,
    predict_demand,
    training_data_quality_meta,
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
        # _iso_date reconoce datetime (tiene .date()), no date nativo — date → None
        d = date(2026, 5, 4)
        assert _iso_date(d) is None

    def test_objeto_datetime_python(self):
        dt = datetime(2026, 5, 4, 12, 0, 0)
        assert _iso_date(dt) == "2026-05-04"


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

    def test_campana_cambia_hash_del_contexto_de_entrenamiento(self):
        data = {"p1": {"2026-01-01": 3.0}}
        meta_a = {"p1": {"categoria": "escolar", "campana": "nueva-temporada"}}
        meta_b = {"p1": {"categoria": "escolar", "campana": "outlet"}}
        assert _data_hash(data, meta_a) != _data_hash(data, meta_b)


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
        result = build_daily_sales_by_product([], [])
        assert result == {}

    def test_acumula_ventas_por_producto_y_dia(self):
        sales = [
            {"productId": "p1", "fecha": self._today(-1), "cantidad": 2, "devuelto": False,
             "nombre": "Test", "categoria": "hombre", "precioVenta": 100, "codigo": "C1"},
            {"productId": "p1", "fecha": self._today(-1), "cantidad": 1, "devuelto": False,
             "nombre": "Test", "categoria": "hombre", "precioVenta": 100, "codigo": "C1"},
        ]
        result = build_daily_sales_by_product(sales, [])
        assert result.get("p1", {}).get(self._today(-1), 0) == 3

    def test_ignora_ventas_devueltas(self):
        sales = [
            {"productId": "p1", "fecha": self._today(-1), "cantidad": 5, "devuelto": True,
             "nombre": "Test", "categoria": "hombre", "precioVenta": 100, "codigo": "C1"},
        ]
        result = build_daily_sales_by_product(sales, [])
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
        result = build_daily_sales_by_product([], orders)
        assert result.get("p2", {}).get(self._today(-2), 0) == 3

    def test_pedidos_usan_pagadoEn_si_existe(self):
        orders = [
            {
                "creadoEn": self._today(-10),
                "pagadoEn": self._today(-1),
                "items": [
                    {"product": {"id": "p3", "nombre": "C", "categoria": "hombre", "precio": 90},
                     "quantity": 1, "size": "40"}
                ],
            }
        ]
        result = build_daily_sales_by_product([], orders)
        assert result.get("p3", {}).get(self._today(-1), 0) == 1
        assert result.get("p3", {}).get(self._today(-10), 0) == 0

    def test_no_cuenta_ventas_sin_product_id(self):
        sales = [
            {"productId": None, "fecha": self._today(-1), "cantidad": 2, "devuelto": False,
             "nombre": "Test", "categoria": "hombre", "precioVenta": 100, "codigo": ""},
        ]
        result = build_daily_sales_by_product(sales, [])
        assert None not in result
        assert "" not in result

    def test_fecha_none_es_ignorada(self):
        sales = [
            {"productId": "p1", "fecha": None, "cantidad": 5, "devuelto": False,
             "nombre": "X", "categoria": "hombre", "precioVenta": 80, "codigo": ""},
        ]
        result = build_daily_sales_by_product(sales, [])
        assert result.get("p1") is None or len(result.get("p1", {})) == 0


class TestSeasonalityAndCampaignFeatures:
    def test_normaliza_campana_para_codificacion_estable(self):
        assert _normalize_campaign(None) == ""
        assert _normalize_campaign(" Cyber-Wow ") == "cyber-wow"

    def test_banderas_temporada_inicio_escolar_y_verano(self):
        flags = _season_flags(date(2026, 2, 15))
        assert flags["temporada_verano"] == 1
        assert flags["temporada_escolar"] == 1
        assert flags["temporada_fiestas_patrias"] == 0
        assert flags["temporada_navidad"] == 0

    def test_banderas_temporada_fiestas_patrias(self):
        flags = _season_flags(date(2026, 7, 10))
        assert flags["temporada_fiestas_patrias"] == 1
        assert flags["temporada_verano"] == 0

    def test_banderas_temporada_navidad_y_verano(self):
        flags = _season_flags(date(2026, 12, 20))
        assert flags["temporada_navidad"] == 1
        assert flags["temporada_verano"] == 1

    def test_lag_features_incluye_campana_y_temporadas(self):
        current = date(2026, 12, 20)
        day_sales = {
            (current - timedelta(days=1)).isoformat(): 7,
            (current - timedelta(days=8)).isoformat(): 3,
        }
        features = _lag_features(current, day_sales, cat_enc=2, campaign_enc=3)

        assert features["campana"] == 3
        assert features["categoria"] == 2
        assert features["temporada_navidad"] == 1
        assert set(FEATURE_COLS).issubset(features.keys())

    def test_predict_demand_expone_campana_y_features_estacionales_en_meta(self):
        today = date.today()
        products = [
            {
                "id": f"p{i}",
                "nombre": f"Zapato {i}",
                "categoria": "escolar",
                "precio": 120,
                "stock": 20,
                "imagen": "",
                "campana": "nueva-temporada" if i == 1 else "",
            }
            for i in range(1, 6)
        ]
        sales = []
        for product in products:
            for day in range(0, 31):
                sales.append({
                    "productId": product["id"],
                    "fecha": (today - timedelta(days=day)).isoformat(),
                    "cantidad": 1 + (day % 3),
                    "devuelto": False,
                    "nombre": product["nombre"],
                    "categoria": product["categoria"],
                    "precioVenta": product["precio"],
                    "codigo": f"ESC-{product['id']}",
                })

        predictions, meta = predict_demand(
            sales,
            [],
            products,
            horizon_days=7,
            history_days=30,
        )
        product = products[0]

        assert "campana" in meta["feature_cols"]
        assert "temporada_escolar" in meta["seasonality_features"]
        assert "temporada_navidad" in meta["seasonality_features"]
        assert "nueva-temporada" in meta["campaign_values"]
        p1 = next(p for p in predictions if p["productId"] == "p1")
        assert p1["campana"] == "nueva-temporada"
        assert p1["modelo"] == "random_forest"
        assert meta["data_sufficient"] is True
        assert meta["ml_active"] is True


class TestTrainingDataQualityMeta:
    def test_insuficiente_con_promedio_movil(self):
        meta = training_data_quality_meta({
            "n_samples": 10,
            "n_products": 2,
            "model_type": "promedio_movil",
        })
        assert meta["data_sufficient"] is False
        assert meta["ml_active"] is False
        assert "promedio móvil" in meta["insufficient_reason"].lower() or "promedio movil" in meta["insufficient_reason"].lower()

    def test_suficiente_con_random_forest(self):
        meta = training_data_quality_meta({
            "n_samples": 120,
            "n_products": 8,
            "model_type": "random_forest",
        })
        assert meta["data_sufficient"] is True
        assert meta["ml_active"] is True

    def test_insuficiente_con_pocos_productos_aunque_haya_rf(self):
        meta = training_data_quality_meta({
            "n_samples": 240,
            "n_products": 2,
            "model_type": "random_forest",
        })
        assert meta["data_sufficient"] is False
        assert "Pocos productos" in meta["insufficient_reason"]
