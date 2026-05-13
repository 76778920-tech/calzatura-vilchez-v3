import pytest
from models.safe_limits import sanitize_int_for_range


def test_valor_dentro_del_rango_sin_cambio():
    assert sanitize_int_for_range(50, default=10, min_v=0, max_v=100) == 50


def test_valor_por_encima_del_maximo_se_clampea():
    assert sanitize_int_for_range(500, default=10, min_v=0, max_v=100) == 100


def test_valor_por_debajo_del_minimo_se_clampea():
    assert sanitize_int_for_range(-5, default=10, min_v=0, max_v=100) == 0


def test_string_numerico_se_convierte():
    assert sanitize_int_for_range("30", default=10, min_v=0, max_v=100) == 30


def test_none_usa_default():
    assert sanitize_int_for_range(None, default=7, min_v=0, max_v=100) == 7


def test_string_no_numerico_usa_default():
    assert sanitize_int_for_range("abc", default=5, min_v=0, max_v=50) == 5


def test_default_tambien_se_clampea_si_esta_fuera_de_rango():
    assert sanitize_int_for_range("xyz", default=200, min_v=0, max_v=100) == 100


def test_exactamente_en_el_limite_superior():
    assert sanitize_int_for_range(100, default=0, min_v=0, max_v=100) == 100


def test_exactamente_en_el_limite_inferior():
    assert sanitize_int_for_range(0, default=5, min_v=0, max_v=100) == 0
