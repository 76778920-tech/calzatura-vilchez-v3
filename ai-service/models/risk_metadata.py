"""IRE constants and documentation metadata."""
from __future__ import annotations

IRE_VERSION = "1.1.0"

PESO_STOCK = 0.40
PESO_INGRESOS = 0.35
PESO_DEMANDA = 0.25

IRE_DEFINITION = (
    "Índice proxy de 0 a 100 que resume el riesgo empresarial comercial-operativo "
    "del e-commerce a partir de inventario, ingresos proyectados y demanda."
)

IRE_VARIABLES = [
    {
        "codigo": "riesgo_stock",
        "nombre": "Riesgo de stock",
        "peso": PESO_STOCK,
        "descripcion": (
            "Mide la presión del inventario según productos críticos, en atención, "
            "en vigilancia y productos sin stock con demanda estimada."
        ),
        "fuente": "Predicción de demanda e inventario actual de productos.",
        "indicadores": [
            "productos_criticos",
            "productos_atencion",
            "productos_vigilancia",
            "productos_sin_stock",
            "total_con_historial",
        ],
    },
    {
        "codigo": "riesgo_ingresos",
        "nombre": "Riesgo de ingresos",
        "peso": PESO_INGRESOS,
        "descripcion": (
            "Mide la probabilidad de presión financiera por tendencia negativa "
            "de ingresos, crecimiento proyectado y confianza del forecast."
        ),
        "fuente": "Proyección de ingresos del servicio de IA.",
        "indicadores": [
            "tendencia_ingresos",
            "crecimiento_estimado_pct",
            "confianza_ingresos",
        ],
    },
    {
        "codigo": "riesgo_demanda",
        "nombre": "Riesgo de demanda",
        "peso": PESO_DEMANDA,
        "descripcion": (
            "Mide cambios comerciales relevantes: productos con demanda bajando, "
            "alta demanda con bajo stock y drift del comportamiento reciente."
        ),
        "fuente": "Predicción por producto, consumo estimado y drift del modelo.",
        "indicadores": [
            "productos_bajando",
            "alta_demanda_bajo_stock",
            "drift_alto",
            "total_con_historial",
        ],
    },
]


def format_weight(weight: float) -> str:
    return f"{weight:.2f}"


def ire_formula() -> str:
    return (
        f"IRE = riesgo_stock * {format_weight(PESO_STOCK)} + "
        f"riesgo_ingresos * {format_weight(PESO_INGRESOS)} + "
        f"riesgo_demanda * {format_weight(PESO_DEMANDA)}"
    )
