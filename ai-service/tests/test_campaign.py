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
    UPLIFT_ALTA,
    UPLIFT_BAJA,
    UPLIFT_MEDIA,
    _build_recommendation,
    _compute_feedback_adjustments,
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

    def test_riesgo_stock_en_resultado(self):
        """El campo riesgo_stock siempre existe en el resultado."""
        result = detect_campaign(_make_sales({}), PRODUCTS)
        assert "riesgo_stock" in result
        assert isinstance(result["riesgo_stock"], bool)
        assert "productos_sin_stock" in result
        assert "productos_stock_critico" in result


# ── 11. Estado en_riesgo_stock automático ─────────────────────────────────────

class TestRiesgoStock:
    """
    Verifica que detect_campaign marque riesgo_stock=True cuando la campaña
    está activa y hay productos sin stock o con stock < ventas_recientes.
    """

    def _spike_products(self, stock_p1: int) -> list[dict]:
        return [
            {"id": "P1", "categoria": "deportivos", "nombre": "Runner Pro", "stock": stock_p1},
            {"id": "P2", "categoria": "casual",     "nombre": "Casual Base", "stock": 50},
        ]

    def _spike_sales(self, baseline_qty=5.0, spike_qty=20.0, precio=90.0):
        """Genera pico de 3 días que activa campaña global."""
        overrides = {
            TODAY.isoformat():                       spike_qty,
            (TODAY - timedelta(days=1)).isoformat(): spike_qty,
            (TODAY - timedelta(days=2)).isoformat(): spike_qty,
        }
        return _make_sales(overrides, baseline_qty=baseline_qty, precio=precio, pid="P1")

    # ── riesgo_stock=False cuando no hay campaña ──────────────────────────────

    def test_sin_campana_riesgo_stock_false(self):
        result = detect_campaign(_make_sales({}), PRODUCTS)
        assert result["riesgo_stock"] is False

    # ── riesgo_stock=False cuando campaña activa con stock OK ─────────────────

    def test_campana_activa_stock_ok_no_riesgo(self):
        # stock=50, ventas_rec≈60 (3 días × 20) → stock < ventas_rec → critico en realidad
        # Usamos spike pequeño para que stock sea suficiente: baseline=5, spike=10, stock=100
        overrides = {
            TODAY.isoformat():                       10.0,
            (TODAY - timedelta(days=1)).isoformat(): 10.0,
            (TODAY - timedelta(days=2)).isoformat(): 10.0,
        }
        sales = _make_sales(overrides, baseline_qty=2.0, precio=50.0, pid="P1")
        prods = [
            {"id": "P1", "categoria": "deportivos", "nombre": "Runner Pro", "stock": 200},
            {"id": "P2", "categoria": "casual",     "nombre": "Casual Base", "stock": 50},
        ]
        result = detect_campaign(sales, prods)
        if result["campaign_detected"]:
            assert result["riesgo_stock"] is False, (
                f"Con stock=200 y ventas_rec≈30, no debe haber riesgo. "
                f"productos_criticos={result['productos_stock_critico']}"
            )

    # ── riesgo_stock=True cuando stock=0 y campaña activa ────────────────────

    def test_sin_stock_con_campana_activa_es_riesgo(self):
        # _make_sales pone nombre="Zapato test" en las ventas, que es lo que
        # product_meta registra. El catálogo products[] solo da stock y categoría.
        sales = self._spike_sales()
        prods = self._spike_products(stock_p1=0)  # sin stock
        result = detect_campaign(sales, prods)
        if result["campaign_detected"]:
            assert result["riesgo_stock"] is True, (
                "Stock=0 durante campaña activa debe marcar riesgo_stock=True"
            )
            assert len(result["productos_sin_stock"]) > 0, (
                "productos_sin_stock debe tener al menos un elemento"
            )

    # ── riesgo_stock=True cuando stock < ventas_recientes ────────────────────

    def test_stock_critico_con_campana_activa_es_riesgo(self):
        # spike de 20/día × 3 días → ventas_recientes≈60; stock=5 < 60 → critico
        sales = self._spike_sales(spike_qty=20.0)
        prods = self._spike_products(stock_p1=5)
        result = detect_campaign(sales, prods)
        if result["campaign_detected"]:
            assert result["riesgo_stock"] is True, (
                f"stock=5 < ventas_rec≈60 debe ser critico. "
                f"top_productos={result['top_productos'][:1]}"
            )
            assert len(result["productos_stock_critico"]) > 0, (
                "productos_stock_critico debe tener al menos un elemento"
            )

    # ── productos_sin_stock y productos_stock_critico son listas ─────────────

    def test_campos_riesgo_son_listas(self):
        result = detect_campaign(_make_sales({}), PRODUCTS)
        assert isinstance(result["productos_sin_stock"], list)
        assert isinstance(result["productos_stock_critico"], list)

    # ── datos insuficientes → riesgo_stock=False ──────────────────────────────

    def test_datos_insuficientes_riesgo_false(self):
        result = detect_campaign([], PRODUCTS)
        assert result["riesgo_stock"] is False
        assert result["productos_sin_stock"] == []
        assert result["productos_stock_critico"] == []


# ── 10. Recomendación inteligente ─────────────────────────────────────────────

class TestRecomendacionInteligente:
    """
    Valida que _build_recommendation use datos reales de stock, uplift e impacto.
    Los tests llaman directamente a _build_recommendation para control total.
    """

    # Helpers de datos de prueba
    _CAT_ALTA = [{"categoria": "deportivos", "uplift_ratio": 2.5, "impacto_soles": 900}]
    _CAT_MEDIA = [{"categoria": "casual", "uplift_ratio": 1.6, "impacto_soles": 300}]

    def _prod(self, nombre, uplift, stock, ventas_rec=10.0, impacto=500.0):
        return {
            "nombre": nombre,
            "uplift_ratio": uplift,
            "stock_actual": stock,
            "ventas_recientes": ventas_rec,
            "ventas_baseline": ventas_rec / uplift,
            "impacto_soles": impacto,
        }

    # ── normal/observando nunca genera recomendación ──────────────────────────

    def test_normal_sin_recomendacion(self):
        rec = _build_recommendation("normal", 1.0, [], [], None)
        assert rec is None

    def test_observando_sin_recomendacion(self):
        rec = _build_recommendation("observando", 1.3, self._CAT_MEDIA, [], None)
        assert rec is None

    # ── stock_actual=0 → alerta "sin stock" ───────────────────────────────────

    def test_sin_stock_aparece_en_recomendacion(self):
        productos = [self._prod("Runner Pro", 2.8, stock=0, ventas_rec=15)]
        rec = _build_recommendation("alta", 2.8, self._CAT_ALTA, productos, "cyber-wow")
        assert rec is not None
        assert "Sin stock" in rec or "sin stock" in rec.lower()
        assert "Runner Pro" in rec

    # ── stock < ventas_recientes → stock critico → Reponer urgente ────────────

    def test_stock_critico_genera_reponer_urgente(self):
        # ventas_rec=20, stock=5 < 20 → critico
        productos = [self._prod("Runner Pro", 2.8, stock=5, ventas_rec=20, impacto=780)]
        rec = _build_recommendation("alta", 2.8, self._CAT_ALTA, productos, "cyber-wow")
        assert rec is not None
        assert "Runner Pro" in rec
        assert "urgente" in rec.lower() or "Reponer" in rec
        assert "780" in rec or "S/" in rec  # impacto económico mencionado

    # ── stock < ventas_recientes*2 → stock bajo → Reponer (sin urgente) ───────

    def test_stock_bajo_genera_reponer_sin_urgente(self):
        # ventas_rec=10, stock=15 → bajo (1.5x, < 2x)
        productos = [self._prod("Clásico Cuero", 1.8, stock=15, ventas_rec=10, impacto=400)]
        rec = _build_recommendation("media", 1.8, self._CAT_MEDIA, productos, "outlet")
        assert rec is not None
        assert "Clásico Cuero" in rec
        assert "Reponer" in rec
        assert "bajo" in rec.lower()

    # ── nivel=alta + stock OK → NO aplicar descuento ─────────────────────────

    def test_alta_rotacion_nivel_alta_no_descuento(self):
        # ventas_rec=10, stock=50 → ok (5x >= 2x); uplift=UPLIFT_ALTA+
        productos = [self._prod("Sport Max", UPLIFT_ALTA, stock=50, ventas_rec=10)]
        rec = _build_recommendation("alta", UPLIFT_ALTA, self._CAT_ALTA, productos, "cyber-wow")
        assert rec is not None
        assert "no aplicar descuento" in rec.lower() or "organica" in rec.lower()

    # ── nivel=media + stock OK → evaluar promocion ────────────────────────────

    def test_alta_rotacion_nivel_media_sugiere_promocion(self):
        productos = [self._prod("Casual Plus", UPLIFT_MEDIA, stock=40, ventas_rec=8)]
        rec = _build_recommendation("media", UPLIFT_MEDIA, self._CAT_MEDIA, productos, "outlet")
        assert rec is not None
        assert "promocion" in rec.lower() or "momentum" in rec.lower()

    # ── campaña focalizada → menciona la categoría ────────────────────────────

    def test_focalizada_menciona_categoria(self):
        cats = [{"categoria": "escolar", "uplift_ratio": 3.0, "impacto_soles": 600}]
        productos = [self._prod("Escolar Pro", 3.0, stock=20, ventas_rec=12, impacto=600)]
        rec = _build_recommendation("baja", 1.1, cats, productos, "campana-focalizada")
        assert rec is not None
        assert "escolar" in rec.lower()

    # ── focalizada sin affected_cats → usa top_productos ─────────────────────

    def test_focalizada_sin_cats_usa_producto(self):
        productos = [self._prod("Escolar Pro", 3.0, stock=20, ventas_rec=12)]
        rec = _build_recommendation("baja", 1.1, [], productos, "campana-focalizada")
        assert rec is not None
        assert "Escolar Pro" in rec or "focaliz" in rec.lower()

    # ── tipo cyber-wow + nivel alta → coordinar fabricantes ──────────────────

    def test_cyber_wow_menciona_fabricantes(self):
        productos = [self._prod("Max Runner", UPLIFT_ALTA, stock=5, ventas_rec=20)]
        rec = _build_recommendation("alta", UPLIFT_ALTA, self._CAT_ALTA, productos, "cyber-wow")
        assert rec is not None
        assert "fabricante" in rec.lower() or "banner" in rec.lower() or "urgente" in rec.lower()

    # ── tipo outlet → menciona liquidacion/descuento ─────────────────────────

    def test_outlet_menciona_descuento(self):
        # stock OK: ventas_rec=5, stock=30 → ok
        productos = [self._prod("Clásico Suela", UPLIFT_MEDIA, stock=30, ventas_rec=5)]
        rec = _build_recommendation("media", UPLIFT_MEDIA, self._CAT_MEDIA, productos, "outlet")
        assert rec is not None
        assert "descuento" in rec.lower() or "liquidar" in rec.lower() or "outlet" in rec.lower()

    # ── integración end-to-end: recomendación con datos reales de detect_campaign ─

    def test_e2e_recomendacion_con_stock_critico(self):
        """
        Stock bajo en el producto que genera el pico →
        detect_campaign debe retornar recomendación con nombre real y stock.
        El nombre del producto en la recomendación proviene del campo 'nombre'
        de las ventas (product_meta), no del catálogo products[].
        """
        productos_e2e = [
            {"id": "P1", "categoria": "deportivos", "nombre": "Runner Pro", "stock": 3},
            {"id": "P2", "categoria": "casual",     "nombre": "Casual Base", "stock": 50},
        ]
        recent_start    = TODAY - timedelta(days=6)
        baseline_end_e  = recent_start - timedelta(days=1)
        baseline_start_e = baseline_end_e - timedelta(days=59)
        all_dates = _date_range(baseline_start_e, TODAY)
        recent_set = set(_date_range(recent_start, TODAY))

        sales = []
        for d in all_dates:
            # P1 "Runner Pro": baseline 5/día, pico 20/día en últimos 3 días
            qty_p1 = 20.0 if d in {
                TODAY.isoformat(),
                (TODAY - timedelta(days=1)).isoformat(),
                (TODAY - timedelta(days=2)).isoformat(),
            } else 5.0
            sales.append({"fecha": d, "cantidad": qty_p1, "productId": "P1",
                          "devuelto": False, "precioVenta": 90, "nombre": "Runner Pro"})
            # P2 "Casual Base": ventas uniformes
            sales.append({"fecha": d, "cantidad": 3.0, "productId": "P2",
                          "devuelto": False, "precioVenta": 60, "nombre": "Casual Base"})

        result = detect_campaign(sales, productos_e2e)
        if result["campaign_detected"]:
            rec = result["recomendacion"]
            assert rec is not None, "Campaña detectada debe tener recomendación"
            assert "Runner Pro" in rec, f"Recomendación debe mencionar el producto afectado: {rec}"
            assert any(kw in rec.lower() for kw in ("reponer", "stock", "urgente")), (
                f"Con stock crítico debe mencionar reposición: {rec}"
            )


# ══════════════════════════════════════════════════════════════════════════════
# Feedback learning — _compute_feedback_adjustments (función pura)
# ══════════════════════════════════════════════════════════════════════════════

class TestFeedbackAjuste:
    """
    Prueba _compute_feedback_adjustments directamente.
    Sin mocks: es una función pura que recibe conteos y devuelve umbrales.
    """

    def test_sin_datos_devuelve_constantes_base(self):
        d = _compute_feedback_adjustments({})
        assert d["uplift_alta"]       == UPLIFT_ALTA
        assert d["uplift_media"]      == UPLIFT_MEDIA
        assert d["uplift_baja"]       == UPLIFT_BAJA
        assert d["uplift_focalizada"] == UPLIFT_MEDIA

    def test_pocos_casos_no_ajusta(self):
        # 4 casos < MIN_FEEDBACK_SAMPLES (5) → sin cambio
        d = _compute_feedback_adjustments({"global_confirmadas": 1, "global_descartadas": 3})
        assert d["uplift_alta"]  == UPLIFT_ALTA
        assert d["uplift_media"] == UPLIFT_MEDIA

    def test_muchos_descartes_sube_umbral_global(self):
        # 2 confirmadas, 8 descartadas → precision 20% < 40% → sube
        d = _compute_feedback_adjustments({"global_confirmadas": 2, "global_descartadas": 8})
        assert d["uplift_alta"]  > UPLIFT_ALTA
        assert d["uplift_media"] > UPLIFT_MEDIA
        assert d["uplift_baja"]  > UPLIFT_BAJA

    def test_alta_precision_baja_umbral_global(self):
        # 9 confirmadas, 1 descartada → precision 90% > 75% → baja
        d = _compute_feedback_adjustments({"global_confirmadas": 9, "global_descartadas": 1})
        assert d["uplift_alta"]  < UPLIFT_ALTA
        assert d["uplift_media"] < UPLIFT_MEDIA

    def test_precision_intermedia_no_ajusta(self):
        # 6 confirmadas, 4 descartadas → precision 60% (entre 40% y 75%) → sin cambio
        d = _compute_feedback_adjustments({"global_confirmadas": 6, "global_descartadas": 4})
        assert d["uplift_alta"]  == UPLIFT_ALTA
        assert d["uplift_media"] == UPLIFT_MEDIA

    def test_ajuste_focalizada_independiente_del_global(self):
        # global OK, focalizada con muchos descartes
        d = _compute_feedback_adjustments({
            "global_confirmadas":     9, "global_descartadas": 1,
            "focalizada_confirmadas": 1, "focalizada_descartadas": 9,
        })
        assert d["uplift_alta"]       < UPLIFT_ALTA       # global bajó
        assert d["uplift_focalizada"] > UPLIFT_MEDIA      # focalizada subió

    def test_thresholds_nunca_superan_ceil(self):
        # Aunque hubiera infinitos descartes, tope en UPLIFT_CEIL
        from models.campaign import UPLIFT_CEIL
        d = _compute_feedback_adjustments({"global_confirmadas": 0, "global_descartadas": 100})
        assert d["uplift_alta"]  <= UPLIFT_CEIL
        assert d["uplift_media"] <= UPLIFT_CEIL

    def test_thresholds_nunca_bajan_del_floor(self):
        # Con infinitas confirmaciones, no baja del UPLIFT_FLOOR
        from models.campaign import UPLIFT_FLOOR
        d = _compute_feedback_adjustments({"global_confirmadas": 100, "global_descartadas": 0})
        assert d["uplift_alta"]  >= UPLIFT_FLOOR
        assert d["uplift_media"] >= UPLIFT_FLOOR
        assert d["uplift_baja"]  >= UPLIFT_FLOOR

    def test_detect_campaign_acepta_threshold_overrides(self):
        # Smoke test: detect_campaign no falla con overrides inyectados
        overrides = {"uplift_alta": 2.5, "uplift_media": 1.8, "uplift_baja": 1.4, "uplift_focalizada": 1.8}
        result = detect_campaign([], [], threshold_overrides=overrides)
        assert result["status"] in ("ok", "datos_insuficientes")


# ══════════════════════════════════════════════════════════════════════════════
# Feedback learning — integracion (cambio real de decision)
# ══════════════════════════════════════════════════════════════════════════════

class TestFeedbackIntegracion:
    """
    Prueba que threshold_overrides modifique decisiones reales de detect_campaign.
    Escenario: uplift 1.12x, entre UPLIFT_FLOOR (1.10) y UPLIFT_BAJA (1.25).
      - Con umbral base (1.25): ventas en rango normal → nivel "normal"
      - Con umbral aprendido (1.10): ventas elevadas → nivel "observando"
    Tambien verifica que top_productos y categorias_afectadas cambian con el umbral.
    """

    # baseline=10 unidades/dia, recientes=11.2/dia → uplift≈1.12x
    _BASELINE_QTY = 10.0
    _RECENT_QTY   = 11.2

    def _make_edge_sales(self, pid: str = "P1", precio: float = 50.0) -> list[dict]:
        overrides = {
            (TODAY - timedelta(days=i)).isoformat(): self._RECENT_QTY
            for i in range(7)
        }
        return _make_sales(overrides, baseline_qty=self._BASELINE_QTY, precio=precio, pid=pid)

    def test_sin_override_nivel_es_normal(self):
        """Uplift 1.12x con umbral base 1.25 → nivel 'normal' o 'observando' con 0 dias consecutivos."""
        result = detect_campaign(self._make_edge_sales(), PRODUCTS)
        assert result["status"] == "ok"
        # Con threshold 1.25, daily_val=11.2 < threshold_units=12.5 → consecutive_up=0
        # Solo puede ser "observando" si uplift >= 1.25 (no es el caso con 1.12)
        assert result["nivel"] in ("normal", "observando"), (
            f"Con uplift~1.12x y umbral 1.25 se esperaba normal/observando, got {result['nivel']}"
        )
        if result["nivel"] == "observando":
            # Si es observando, no debe detectar campana
            assert result["campaign_detected"] is False

    def test_con_override_bajo_nivel_sube_a_observando(self):
        """Con umbral aprendido 1.10 y uplift 1.12x → nivel 'observando' (o superior)."""
        # Alta precision del admin → umbral baja de 1.25 a 1.10
        overrides = _compute_feedback_adjustments({
            "global_confirmadas": 9,
            "global_descartadas": 1,
        })
        assert overrides["uplift_baja"] < UPLIFT_BAJA, (
            "El ajuste debe haber bajado el umbral baja antes del test"
        )
        result = detect_campaign(
            self._make_edge_sales(), PRODUCTS,
            threshold_overrides=overrides,
        )
        assert result["status"] == "ok"
        # Con threshold 1.10, daily_val=11.2 >= threshold_units=11.0 → consecutive_up=7
        # Y uplift 1.12 >= 1.10 → "observando" al menos
        assert result["nivel"] != "normal", (
            f"Con umbral aprendido {overrides['uplift_baja']:.2f} y uplift~1.12x "
            f"se esperaba observando o superior, got '{result['nivel']}'"
        )

    def test_override_cambia_top_productos(self):
        """Producto uplift 1.12x: filtrado con umbral 1.25 (base=0), visible con umbral 1.10."""
        sales = self._make_edge_sales(pid="P1", precio=80.0)
        result_base = detect_campaign(sales, PRODUCTS)
        result_learned = detect_campaign(
            sales, PRODUCTS,
            threshold_overrides={"uplift_baja": 1.10, "uplift_media": UPLIFT_MEDIA,
                                  "uplift_alta": UPLIFT_ALTA, "uplift_focalizada": UPLIFT_MEDIA},
        )
        n_base    = len(result_base["top_productos"])
        n_learned = len(result_learned["top_productos"])
        # El cambio debe ser real: con umbral base el producto queda fuera (0),
        # con umbral aprendido entra (>0)
        assert n_base == 0, (
            f"Con umbral base {UPLIFT_BAJA} y uplift~1.12x se esperaban 0 top_productos, "
            f"got {n_base}: {result_base['top_productos']}"
        )
        assert n_learned > 0, (
            f"Con umbral aprendido 1.10 y uplift~1.12x se esperaba >=1 top_productos, "
            f"got {n_learned}"
        )

    def test_override_cambia_categorias_afectadas(self):
        """Categoria uplift 1.12x: filtrada con umbral 1.25 (base=0), visible con umbral 1.10."""
        sales = self._make_edge_sales(pid="P1", precio=80.0)
        result_base = detect_campaign(sales, PRODUCTS)
        result_learned = detect_campaign(
            sales, PRODUCTS,
            threshold_overrides={"uplift_baja": 1.10, "uplift_media": UPLIFT_MEDIA,
                                  "uplift_alta": UPLIFT_ALTA, "uplift_focalizada": UPLIFT_MEDIA},
        )
        n_base    = len(result_base["categorias_afectadas"])
        n_learned = len(result_learned["categorias_afectadas"])
        assert n_base == 0, (
            f"Con umbral base {UPLIFT_BAJA} y uplift~1.12x se esperaban 0 categorias, "
            f"got {n_base}: {result_base['categorias_afectadas']}"
        )
        assert n_learned > 0, (
            f"Con umbral aprendido 1.10 y uplift~1.12x se esperaba >=1 categoria, "
            f"got {n_learned}"
        )

    def test_aprendizaje_activo_solo_focalizado(self):
        """
        Cuando solo cambia uplift_focalizada (globales sin cambio), aprendizaje_activo
        debe ser True. Prueba el bug donde la comparacion omitia uplift_focalizada.
        """
        from models.campaign import UPLIFT_CEIL, UPLIFT_FLOOR
        # Solo descartes focalizados → sube uplift_focalizada, globales sin cambio
        overrides = _compute_feedback_adjustments({
            "global_confirmadas":     0,
            "global_descartadas":     0,
            "focalizada_confirmadas": 1,
            "focalizada_descartadas": 9,  # 10% precision → sube umbral focalizado
        })
        assert overrides["uplift_focalizada"] > UPLIFT_MEDIA, (
            "Con 10% precision focalizada, el umbral focalizado debe subir"
        )
        assert overrides["uplift_alta"]  == UPLIFT_ALTA,  "Sin feedback global, uplift_alta no cambia"
        assert overrides["uplift_media"] == UPLIFT_MEDIA, "Sin feedback global, uplift_media no cambia"
        assert overrides["uplift_baja"]  == UPLIFT_BAJA,  "Sin feedback global, uplift_baja no cambia"

        # Simular lo que hace el endpoint: comparar todos los keys incluyendo focalizada
        base_map = {
            "uplift_alta":       UPLIFT_ALTA,
            "uplift_media":      UPLIFT_MEDIA,
            "uplift_baja":       UPLIFT_BAJA,
            "uplift_focalizada": UPLIFT_MEDIA,
        }
        aprendizaje_activo = any(
            overrides.get(k) != base for k, base in base_map.items()
        )
        assert aprendizaje_activo is True, (
            "Con umbral focalizado distinto del base, aprendizaje_activo debe ser True. "
            "Bug: la comparacion omitia uplift_focalizada."
        )

    def test_mensaje_refleja_umbral_aprendido(self):
        """El mensaje del nivel normal muestra el umbral activo (aprendido), no el hardcoded."""
        overrides = {"uplift_baja": 1.10, "uplift_media": UPLIFT_MEDIA,
                     "uplift_alta": UPLIFT_ALTA, "uplift_focalizada": UPLIFT_MEDIA}
        # Ventas muy bajas → siempre "normal" incluso con umbral 1.10
        result = detect_campaign(
            _make_sales({}, baseline_qty=5.0), PRODUCTS,
            threshold_overrides=overrides,
        )
        if result["nivel"] == "normal":
            assert "1.1" in result["mensaje"], (
                f"El mensaje debe mostrar el umbral aprendido 1.10, no el hardcoded {UPLIFT_BAJA}: "
                f"'{result['mensaje']}'"
            )
