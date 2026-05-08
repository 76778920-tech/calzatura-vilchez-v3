"""
Tests específicos para el motor de detección de campañas v3.
Cada test está diseñado para fallar con los bugs anteriores y pasar con la v3.

Bugs cubiertos:
  - v1: uplift usaba max() → inflado artificial
  - v2: DOW blend 50/50 con ratios diarios → colapsaba a 0 con días sin venta
  - v2: elif cierre_estado nunca alcanzable
  - v3: DOW usa suma esperada por día → correcto con ventanas dispersas
  - v3: detección focalizada por categoría/producto
"""

from datetime import date, timedelta

import pytest

from models.campaign import (
    FINALIZADA_COOLDOWN,
    FINALIZANDO_COOLDOWN,
    MIN_BASELINE_DAYS,
    MIN_CONSISTENT_DAYS,
    UPLIFT_BAJA,
    UPLIFT_MEDIA,
    _date_range,
    detect_campaign,
)

TODAY = date.today()

PRODUCTS = [
    {"id": "P1", "categoria": "deportivos", "nombre": "Zapato Deportivo", "stock": 20},
    {"id": "P2", "categoria": "casual",     "nombre": "Zapato Casual",    "stock": 15},
]

# Para tests de campaña focalizada — muchos productos en categorías distintas
PRODUCTS_MULTI = [
    {"id": f"P{i}", "categoria": "masivo",   "nombre": f"Zapato masivo {i}", "stock": 30}
    for i in range(1, 10)
] + [
    {"id": "P10", "categoria": "escolar", "nombre": "Zapato Escolar", "stock": 50},
]


def _make_sales(
    overrides: dict[str, float],
    baseline_qty: float = 2.0,
    recent_days: int = 7,
    baseline_days: int = 60,
    precio: float = 50.0,
    pid: str = "P1",
) -> list[dict]:
    """Ventas sintéticas: baseline uniforme + overrides puntuales."""
    recent_start   = TODAY - timedelta(days=recent_days - 1)
    baseline_end   = recent_start - timedelta(days=1)
    baseline_start = baseline_end - timedelta(days=baseline_days - 1)
    all_dates      = _date_range(baseline_start, TODAY)

    sales = []
    for d in all_dates:
        qty = overrides.get(d, baseline_qty)
        if qty > 0:
            sales.append({
                "fecha":       d,
                "cantidad":    qty,
                "productId":   pid,
                "devuelto":    False,
                "precioVenta": precio,
                "nombre":      "Zapato test",
            })
    return sales


def _make_multi_sales(
    normal_products: list[str],
    spike_product: str,
    spike_qty: float,
    normal_qty: float = 2.0,
    recent_days: int = 7,
    baseline_days: int = 60,
    precio: float = 50.0,
) -> list[dict]:
    """
    Genera ventas donde normal_products tienen ventas uniformes y
    spike_product tiene spike_qty en los últimos recent_days.
    Permite testear campañas focalizadas donde el global no sube suficiente.
    """
    recent_start   = TODAY - timedelta(days=recent_days - 1)
    baseline_end   = recent_start - timedelta(days=1)
    baseline_start = baseline_end - timedelta(days=baseline_days - 1)
    all_dates      = _date_range(baseline_start, TODAY)
    recent_dates   = set(_date_range(recent_start, TODAY))

    sales = []
    for d in all_dates:
        for pid in normal_products:
            sales.append({
                "fecha": d, "cantidad": normal_qty,
                "productId": pid, "devuelto": False, "precioVenta": precio,
                "nombre": f"Producto {pid}",
            })
        spike = spike_qty if d in recent_dates else normal_qty
        if spike > 0:
            sales.append({
                "fecha": d, "cantidad": spike,
                "productId": spike_product, "devuelto": False, "precioVenta": precio,
                "nombre": f"Producto {spike_product}",
            })
    return sales


# ── 1. Ventanas exactas ───────────────────────────────────────────────────────

class TestVentanasExactas:

    def test_reciente_exacta(self):
        recent_start = TODAY - timedelta(days=7 - 1)
        reciente = _date_range(recent_start, TODAY)
        assert len(reciente) == 7, f"Reciente debe ser 7 días, fue {len(reciente)}"

    def test_baseline_exacta(self):
        recent_start   = TODAY - timedelta(days=7 - 1)
        baseline_end   = recent_start - timedelta(days=1)
        baseline_start = baseline_end - timedelta(days=60 - 1)
        baseline = _date_range(baseline_start, baseline_end)
        assert len(baseline) == 60, f"Baseline debe ser 60 días, fue {len(baseline)}"

    def test_ventanas_no_se_solapan(self):
        recent_start   = TODAY - timedelta(days=6)
        baseline_end   = recent_start - timedelta(days=1)
        baseline_start = baseline_end - timedelta(days=59)
        reciente = set(_date_range(recent_start, TODAY))
        baseline = set(_date_range(baseline_start, baseline_end))
        assert reciente.isdisjoint(baseline)

    def test_ventanas_contiguas(self):
        recent_start   = TODAY - timedelta(days=6)
        baseline_end   = recent_start - timedelta(days=1)
        baseline_start = baseline_end - timedelta(days=59)
        reciente = _date_range(recent_start, TODAY)
        baseline = _date_range(baseline_start, baseline_end)
        day_after_baseline = (date.fromisoformat(baseline[-1]) + timedelta(days=1)).isoformat()
        assert reciente[0] == day_after_baseline

    def test_ventanas_en_resultado(self):
        sales  = _make_sales({})
        result = detect_campaign(sales, PRODUCTS, recent_days=7, baseline_days=60)
        assert "7 dias"  in result["ventanas"]["reciente"]
        assert "60 dias" in result["ventanas"]["baseline"]


# ── 2. Normalización de fechas ────────────────────────────────────────────────

class TestNormalizacionFechas:

    def test_timestamp_detecta_igual_que_fecha_plana(self):
        today_str = TODAY.isoformat()
        yesterday = (TODAY - timedelta(days=1)).isoformat()

        sales_plain = _make_sales({today_str: 10.0, yesterday: 10.0})
        sales_ts = []
        for s in sales_plain:
            d = s["fecha"]
            if d in (today_str, yesterday):
                s = {**s, "fecha": d + "T00:00:00+00:00"}
            sales_ts.append(s)

        r_plain = detect_campaign(sales_plain, PRODUCTS)
        r_ts    = detect_campaign(sales_ts,    PRODUCTS)

        assert r_plain["campaign_detected"] == r_ts["campaign_detected"], (
            f"Timestamp debe producir misma detección. plain={r_plain['campaign_detected']}, ts={r_ts['campaign_detected']}"
        )
        u_plain = r_plain["metricas"].get("uplift_ratio", 0)
        u_ts    = r_ts["metricas"].get("uplift_ratio", 0)
        assert abs(u_plain - u_ts) < 0.01

    def test_timestamp_con_espacio(self):
        today_str = TODAY.isoformat()
        sales = []
        for s in _make_sales({today_str: 10.0}):
            if s["fecha"] == today_str:
                s = {**s, "fecha": today_str + " 12:30:00"}
            sales.append(s)
        result = detect_campaign(sales, PRODUCTS)
        assert result["status"] in ("ok", "datos_insuficientes")


# ── 3. Detección de campaña global ────────────────────────────────────────────

class TestDeteccionGlobal:

    def test_ventas_uniformes_no_detecta(self):
        result = detect_campaign(_make_sales({}), PRODUCTS)
        assert result["campaign_detected"] is False
        assert result["nivel"] == "normal"

    def test_pico_3_dias_detectado(self):
        overrides = {
            TODAY.isoformat():                       8.0,
            (TODAY - timedelta(days=1)).isoformat(): 8.0,
            (TODAY - timedelta(days=2)).isoformat(): 8.0,
        }
        result = detect_campaign(_make_sales(overrides, baseline_qty=2.0), PRODUCTS)
        assert result["campaign_detected"] is True
        assert result["scope"] == "global"

    def test_pico_1_dia_no_confirma_campana(self):
        overrides = {TODAY.isoformat(): 20.0}
        result = detect_campaign(_make_sales(overrides, baseline_qty=2.0), PRODUCTS)
        assert result["campaign_detected"] is False

    def test_uplift_positivo_con_pico(self):
        overrides = {
            TODAY.isoformat():                       10.0,
            (TODAY - timedelta(days=1)).isoformat(): 10.0,
        }
        result = detect_campaign(_make_sales(overrides, baseline_qty=2.0), PRODUCTS)
        assert result["metricas"]["uplift_ratio"] > 1.0

    def test_z_score_positivo_con_pico(self):
        overrides = {
            TODAY.isoformat():                       10.0,
            (TODAY - timedelta(days=1)).isoformat(): 10.0,
        }
        result = detect_campaign(_make_sales(overrides, baseline_qty=2.0), PRODUCTS)
        assert result["metricas"]["z_score"] > 0


# ── 4. Bug v2: DOW blend no hunde uplift con días en cero ────────────────────

class TestDOWNoHundeSumUplift:
    """
    Bug del DOW blend 50/50 en v2: median([0,0,0,0,0,5,5])=0 → uplift=0.71 → no detección.
    v3 usa suma esperada DOW, que no depende de ratios individuales por día.
    """

    def test_pico_2_dias_con_5_dias_cero_detecta(self):
        """
        Caso exacto del auditor: baseline 2/día, últimos 2 días con 10,
        los otros 5 días de la ventana reciente con 0 ventas.
        sum_uplift ≈ 1.43, z ≈ 4.5 → debe detectar como campaña.
        """
        overrides_recientes = {
            TODAY.isoformat():                       10.0,
            (TODAY - timedelta(days=1)).isoformat(): 10.0,
            # Los 5 días restantes de la ventana reciente → 0
            (TODAY - timedelta(days=2)).isoformat(): 0.0,
            (TODAY - timedelta(days=3)).isoformat(): 0.0,
            (TODAY - timedelta(days=4)).isoformat(): 0.0,
            (TODAY - timedelta(days=5)).isoformat(): 0.0,
            (TODAY - timedelta(days=6)).isoformat(): 0.0,
        }
        sales  = _make_sales(overrides_recientes, baseline_qty=2.0)
        result = detect_campaign(sales, PRODUCTS)

        uplift = result["metricas"].get("uplift_ratio", 0)
        z      = result["metricas"].get("z_score", 0)

        assert result["campaign_detected"] is True, (
            f"Pico 2/7 días con 5x no detectado. "
            f"uplift={uplift:.3f}, z={z:.2f}, nivel={result['nivel']}"
        )
        assert uplift > 1.0, f"Uplift debe ser >1, fue {uplift}"
        assert z > 0,        f"Z-score debe ser positivo, fue {z}"

    def test_dow_no_hunde_sum_uplift(self):
        """
        Verificación directa: con el fix DOW, uplift debe ser ≈ sum_uplift,
        no una mezcla degradada por ratios en cero.
        """
        overrides = {
            TODAY.isoformat():                       10.0,
            (TODAY - timedelta(days=1)).isoformat(): 10.0,
            (TODAY - timedelta(days=2)).isoformat(): 0.0,
            (TODAY - timedelta(days=3)).isoformat(): 0.0,
            (TODAY - timedelta(days=4)).isoformat(): 0.0,
            (TODAY - timedelta(days=5)).isoformat(): 0.0,
            (TODAY - timedelta(days=6)).isoformat(): 0.0,
        }
        result = detect_campaign(_make_sales(overrides, baseline_qty=2.0), PRODUCTS)
        m = result["metricas"]
        uplift     = m.get("uplift_ratio", 0)
        sum_uplift = m.get("sum_uplift",   0)

        # El uplift final no debe ser < 70% del sum_uplift
        # (en v2 era 0.714 por el blend; en v3 deben ser iguales o cercanos)
        assert uplift >= sum_uplift * 0.9, (
            f"DOW no debe hundir el uplift. uplift={uplift:.3f}, sum_uplift={sum_uplift:.3f}. "
            f"Diferencia: {(1 - uplift/sum_uplift)*100:.0f}%"
        )

    def test_4_dias_con_3_en_cero_detecta(self):
        """Campaña de 4 días con 3 ceros intermedios también debe detectar."""
        overrides = {
            TODAY.isoformat():                       8.0,
            (TODAY - timedelta(days=1)).isoformat(): 0.0,
            (TODAY - timedelta(days=2)).isoformat(): 8.0,
            (TODAY - timedelta(days=3)).isoformat(): 0.0,
            (TODAY - timedelta(days=4)).isoformat(): 8.0,
            (TODAY - timedelta(days=5)).isoformat(): 0.0,
            (TODAY - timedelta(days=6)).isoformat(): 8.0,
        }
        result = detect_campaign(_make_sales(overrides, baseline_qty=2.0), PRODUCTS)
        uplift = result["metricas"].get("uplift_ratio", 0)
        assert uplift > 1.0, f"Con pico alternado uplift debe ser >1, fue {uplift}"


# ── 5. Detección focalizada por categoría ────────────────────────────────────

class TestDeteccionFocalizada:
    """
    Caso del auditor: una categoría/producto explota pero el global no sube suficiente.
    El sistema debe detectar como 'campaña focalizada' (nivel=baja, scope=focalizada).
    """

    def test_categoria_con_uplift_detecta_campana_focalizada(self):
        """
        9 productos con ventas normales + 1 producto 'escolar' con 3x en toda la ventana.
        Global uplift ≈ 1.09 (bajo umbral), pero 'escolar' uplift ≈ 3.0 → focalizada.
        """
        normal_pids   = [f"P{i}" for i in range(1, 10)]
        spike_pid     = "P10"
        normal_qty    = 2.0
        spike_qty     = 6.0  # 3× el baseline para el producto escolar

        sales = _make_multi_sales(
            normal_products=normal_pids,
            spike_product=spike_pid,
            spike_qty=spike_qty,
            normal_qty=normal_qty,
        )
        result = detect_campaign(sales, PRODUCTS_MULTI)

        # Verificar que el global no detectó solo por el global uplift
        m = result["metricas"]
        global_up = m.get("uplift_ratio", 0)

        # La campaña debe detectarse (focalizada o global)
        assert result["campaign_detected"] is True, (
            f"Campaña focalizada no detectada. global_uplift={global_up:.3f}, "
            f"top_productos={result['top_productos'][:1]}, "
            f"categorias={result['categorias_afectadas'][:1]}"
        )
        # Si el global no detectó, debe ser focalizada
        if global_up < UPLIFT_BAJA:
            assert result["scope"] == "focalizada", (
                f"Con global_uplift={global_up:.3f} < {UPLIFT_BAJA}, scope debe ser focalizada"
            )
            assert result["tipo_sugerido"] == "campana-focalizada"

    def test_top_productos_influye_en_deteccion(self):
        """
        Un solo producto con uplift muy alto debe activar la detección focalizada
        aunque el nivel global sea 'normal'.
        """
        # Producto P2 vende 10× en los últimos 7 días, P1 vende normal
        recent_start = TODAY - timedelta(days=6)
        recent_dates = set(_date_range(recent_start, TODAY))

        recent_end_b   = recent_start - timedelta(days=1)
        baseline_start = recent_end_b - timedelta(days=59)
        all_dates      = _date_range(baseline_start, TODAY)

        sales = []
        for d in all_dates:
            # P1 normal siempre (10 unidades/día → domina el global)
            sales.append({"fecha": d, "cantidad": 10.0, "productId": "P1",
                          "devuelto": False, "precioVenta": 50, "nombre": "Zapato masivo"})
            # P2 "casual" solo en baseline 1/día, en reciente 10/día
            qty = 10.0 if d in recent_dates else 1.0
            sales.append({"fecha": d, "cantidad": qty, "productId": "P2",
                          "devuelto": False, "precioVenta": 80, "nombre": "Zapato Casual"})

        result = detect_campaign(sales, PRODUCTS)

        top = result["top_productos"]
        p2  = next((p for p in top if p["producto_id"] == "P2"), None)

        assert p2 is not None, "P2 debe aparecer en top_productos"
        assert p2["uplift_ratio"] > UPLIFT_MEDIA, (
            f"Uplift de P2 debe ser > {UPLIFT_MEDIA}, fue {p2['uplift_ratio']}"
        )
        # Si el global no detectó, la focalizada debe haber tomado el relevo
        m = result["metricas"]
        if m.get("uplift_ratio", 0) < UPLIFT_BAJA:
            assert result["campaign_detected"] is True, (
                "top_productos con uplift alto debe activar detección focalizada"
            )
            assert result["scope"] == "focalizada"

    def test_scope_es_global_cuando_global_detecta(self):
        """Cuando el global supera el umbral, scope debe ser 'global'."""
        overrides = {
            TODAY.isoformat():                       8.0,
            (TODAY - timedelta(days=1)).isoformat(): 8.0,
            (TODAY - timedelta(days=2)).isoformat(): 8.0,
        }
        result = detect_campaign(_make_sales(overrides, baseline_qty=2.0), PRODUCTS)
        if result["campaign_detected"]:
            assert result["scope"] == "global"

    def test_scope_none_cuando_no_hay_campana(self):
        result = detect_campaign(_make_sales({}), PRODUCTS)
        if result["nivel"] == "normal":
            assert result["scope"] in (None, "focalizada")


# ── 6. Ciclo de vida: cierre_estado ──────────────────────────────────────────

class TestCierreEstado:

    def test_finalizada_con_todos_dias_normales(self):
        """Con 7 días recientes al baseline (todos normales) → finalizada."""
        result = detect_campaign(_make_sales({}, baseline_qty=2.0), PRODUCTS)
        assert result["nivel"] == "normal"
        cons = result["consistencia"]
        if cons["dias_consecutivos_normales"] >= FINALIZADA_COOLDOWN:
            assert result["cierre_estado"] == "finalizada", (
                f"Con {cons['dias_consecutivos_normales']} días normales debe ser 'finalizada'"
            )

    def test_finalizando_con_exactamente_2_dias_normales(self):
        """Últimos 2 días normales, primeros 5 levemente sobre el umbral → finalizando."""
        # threshold = 2 * 1.25 = 2.5; days de 2.6 son > 2.5 (elevados), 2.0 son <=2.5 (normales)
        # uplift global ≈ (5*2.6 + 2*2.0) / 14 = 17/14 = 1.21 < 1.25 → nivel 'normal'
        recent_start = TODAY - timedelta(days=6)
        overrides = {
            (recent_start + timedelta(days=i)).isoformat(): 2.6
            for i in range(5)
        }
        overrides[TODAY.isoformat()]                       = 2.0
        overrides[(TODAY - timedelta(days=1)).isoformat()] = 2.0

        result = detect_campaign(_make_sales(overrides, baseline_qty=2.0), PRODUCTS)
        assert result["nivel"] == "normal", (
            f"Nivel esperado 'normal', fue '{result['nivel']}'. "
            f"uplift={result['metricas'].get('uplift_ratio')}"
        )
        cons = result["consistencia"]
        assert cons["dias_consecutivos_normales"] == 2
        assert result["cierre_estado"] == "finalizando"

    def test_finalizada_tiene_prioridad_sobre_finalizando(self):
        """Si consecutive_down >= 4 y nivel == 'normal', cierre_estado no puede ser 'finalizando'."""
        result = detect_campaign(_make_sales({}, baseline_qty=2.0), PRODUCTS)
        cons = result["consistencia"]
        if cons["dias_consecutivos_normales"] >= FINALIZADA_COOLDOWN and result["nivel"] == "normal":
            assert result["cierre_estado"] == "finalizada", (
                "Con >= 4 días normales no debe quedar en 'finalizando'"
            )


# ── 7. Datos insuficientes ────────────────────────────────────────────────────

class TestDatosInsuficientes:

    def test_sin_ventas(self):
        result = detect_campaign([], PRODUCTS)
        assert result["status"] == "datos_insuficientes"
        assert result["campaign_detected"] is False

    def test_menos_de_min_baseline_days(self):
        sales = []
        for i in range(MIN_BASELINE_DAYS - 1):
            d = (TODAY - timedelta(days=i + 15)).isoformat()
            sales.append({"fecha": d, "cantidad": 5, "productId": "P1",
                          "devuelto": False, "precioVenta": 50})
        result = detect_campaign(sales, PRODUCTS)
        assert result["status"] == "datos_insuficientes"

    def test_con_exactamente_min_baseline_days_procesa(self):
        recent_start   = TODAY - timedelta(days=6)
        baseline_end   = recent_start - timedelta(days=1)
        baseline_start = baseline_end - timedelta(days=59)
        sales = []
        for i in range(MIN_BASELINE_DAYS):
            d = (baseline_start + timedelta(days=i)).isoformat()
            sales.append({"fecha": d, "cantidad": 2, "productId": "P1",
                          "devuelto": False, "precioVenta": 50})
        result = detect_campaign(sales, PRODUCTS)
        assert result["status"] == "ok"


# ── 8. Devoluciones excluidas ──────────────────────────────────────────────────

class TestDevoluciones:

    def test_devuelto_no_suma_al_uplift(self):
        today_str  = TODAY.isoformat()
        sales_base = _make_sales({today_str: 5.0})
        sales_dev  = list(sales_base) + [{
            "fecha": today_str, "cantidad": 100.0,
            "productId": "P1", "devuelto": True, "precioVenta": 50,
        }]
        r_base = detect_campaign(sales_base, PRODUCTS)
        r_dev  = detect_campaign(sales_dev,  PRODUCTS)
        u_base = r_base["metricas"].get("uplift_ratio", 0)
        u_dev  = r_dev["metricas"].get("uplift_ratio", 0)
        assert abs(u_base - u_dev) < 0.01, (
            f"Devoluciones no deben cambiar uplift. base={u_base}, con_dev={u_dev}"
        )


# ── 9. Campos nuevos v3 ───────────────────────────────────────────────────────

class TestCamposV3:

    def test_tiene_scope(self):
        result = detect_campaign(_make_sales({}), PRODUCTS)
        assert "scope" in result

    def test_tiene_top_productos(self):
        result = detect_campaign(_make_sales({}), PRODUCTS)
        assert isinstance(result["top_productos"], list)

    def test_tiene_impacto_estimado_soles(self):
        result = detect_campaign(_make_sales({}), PRODUCTS)
        assert isinstance(result["impacto_estimado_soles"], float)

    def test_top_productos_campos_completos(self):
        overrides = {
            TODAY.isoformat():                       20.0,
            (TODAY - timedelta(days=1)).isoformat(): 20.0,
        }
        result = detect_campaign(_make_sales(overrides, baseline_qty=2.0), PRODUCTS)
        for p in result["top_productos"]:
            for campo in ("producto_id", "nombre", "categoria", "uplift_ratio",
                          "ventas_recientes", "ventas_baseline"):
                assert campo in p, f"Falta '{campo}' en top_productos"

    def test_impacto_soles_positivo_en_campana_con_precio(self):
        overrides = {
            TODAY.isoformat():                       20.0,
            (TODAY - timedelta(days=1)).isoformat(): 20.0,
        }
        result = detect_campaign(_make_sales(overrides, baseline_qty=2.0, precio=80.0), PRODUCTS)
        if result["campaign_detected"]:
            assert result["impacto_estimado_soles"] > 0

    def test_expected_dow_sum_en_metricas(self):
        result = detect_campaign(_make_sales({}), PRODUCTS)
        if result["status"] == "ok":
            assert "expected_dow_sum" in result["metricas"]
            assert "actual_sum"       in result["metricas"]
            assert "sum_uplift"       in result["metricas"]

    def test_confidence_baja_sin_campana(self):
        result = detect_campaign(_make_sales({}, baseline_qty=2.0), PRODUCTS)
        assert result["confidence_pct"] < 20.0
