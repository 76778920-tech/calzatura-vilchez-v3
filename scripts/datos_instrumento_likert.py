"""
Fuente unica: 24 items Likert — Calzatura Vilchez.
Alineacion estricta 1:1 con indicadores VD de CU-T10 (generar_matriz_operacionalizacion_variables.py).
"""
from __future__ import annotations

VD_VARIABLE = (
    "Predicción del riesgo empresarial mediante el Índice de Riesgo Empresarial (IRE)"
)

VD_CONCEPT = (
    "Capacidad de cuantificar y anticipar el riesgo empresarial comercial-operativo "
    "de Calzatura Vilchez mediante el IRE (0–100), como proxy de quiebre de stock, "
    "presión de ingresos y cambios de demanda (documentacion/07-modulo-ia-riesgo-empresarial.md)."
)

VD_OPER = (
    "Puntuación en escala Likert 1–5 sobre percepción del personal directivo y operativo "
    "respecto a modelos predictivos, exactitud del IRE, componentes del índice e impacto "
    "operativo; aplicación preprueba (O₁) y posprueba (O₂)."
)

INSTRUMENT_NAME = (
    "Cuestionario de percepción sobre la predicción del riesgo empresarial y utilidad "
    "del sistema web con Inteligencia Artificial en Calzatura Vilchez"
)

LIKERT_LABELS = [
    "Totalmente en desacuerdo",
    "En desacuerdo",
    "Ni de acuerdo ni en desacuerdo",
    "De acuerdo",
    "Totalmente de acuerdo",
]

PH = "[método actual / sistema implementado]"

# cu10_short debe coincidir con el indicador N de la dimension VD en CU-T10
ITEMS: list[dict[str, str | int]] = [
    # --- VD-D1: Modelos de predicción (CU-T10 ítems 1–6) ---
    {
        "n": 1,
        "dim": "D1: Modelos de predicción del riesgo empresarial",
        "cu10": "VD-D1 ind. 1 — Tipo de modelo IRE (proxy 40/35/25 + RF demanda)",
        "ind": "Adecuación del modelo IRE compuesto y predicción de demanda",
        "text": (
            f"El {PH} integra adecuadamente la predicción de demanda (IA) y los indicadores "
            "de stock e ingresos para estimar el riesgo empresarial."
        ),
        "valid": "Validez de contenido; V de Aiken ≥ 0,70.",
        "refs": "Ozbayoglu 2020; Barboza 2017; Altman 1968; Beaver 1966.",
    },
    {
        "n": 2,
        "dim": "D1: Modelos de predicción del riesgo empresarial",
        "cu10": "VD-D1 ind. 2 — Número de variables operativas (stock, ingresos, demanda, productos)",
        "ind": "Cobertura de variables operativas en el modelo",
        "text": (
            f"El {PH} considera de forma adecuada las variables de stock, ingresos, demanda "
            "e inventario de productos."
        ),
        "valid": "Validez de contenido; V de Aiken ≥ 0,70.",
        "refs": "Kim 2020; Du Jardin 2021; Khalid 2022.",
    },
    {
        "n": 3,
        "dim": "D1: Modelos de predicción del riesgo empresarial",
        "cu10": "VD-D1 ind. 3 — Horizonte de predicción (7, 15 o 30 días)",
        "ind": "Utilidad del horizonte de predicción configurado",
        "text": (
            f"El {PH} permite planificar con horizontes de predicción útiles "
            "(7, 15 o 30 días) para la gestión del riesgo."
        ),
        "valid": "Validez de contenido; prueba piloto (10 % muestra).",
        "refs": "Makridakis 2018; Fildes 2022; Choi 2018.",
    },
    {
        "n": 4,
        "dim": "D1: Modelos de predicción del riesgo empresarial",
        "cu10": "VD-D1 ind. 4 — Técnica agregación IRE (ponderación fija + reglas)",
        "ind": "Claridad de la técnica de agregación del IRE",
        "text": (
            "La forma en que el IRE combina los componentes (stock, ingresos y demanda) "
            "es adecuada para interpretar el riesgo empresarial."
        ),
        "valid": "Validez de contenido; juicio de expertos.",
        "refs": "Amba 2017; Choi 2018; documentacion/07 §2.",
    },
    {
        "n": 5,
        "dim": "D1: Modelos de predicción del riesgo empresarial",
        "cu10": "VD-D1 ind. 5 — Método validación (consistencia interna + walk-forward)",
        "ind": "Confianza en los métodos de validación del modelo",
        "text": (
            f"Los métodos de validación del {PH} (consistencia interna y walk-forward) "
            "generan confianza en los resultados."
        ),
        "valid": "Validez de contenido; alfa de Cronbach ≥ 0,70 (dimensión).",
        "refs": "Paleyes 2022; Martinez-Fernandez 2022; Barboza 2017.",
    },
    {
        "n": 6,
        "dim": "D1: Modelos de predicción del riesgo empresarial",
        "cu10": "VD-D1 ind. 6 — Comparación vs método empírico baseline (% mejora MAE)",
        "ind": "Mejora percibida frente al método empírico anterior",
        "text": (
            f"El {PH} mejora la estimación del riesgo empresarial respecto al método "
            "empírico utilizado anteriormente."
        ),
        "valid": "Comparación pre/post; alfa de Cronbach ≥ 0,70.",
        "refs": "Fildes 2022; Makridakis 2018; Choi 2018.",
    },
    # --- VD-D2: Exactitud y validación (CU-T10 ítems 7–12) ---
    {
        "n": 7,
        "dim": "D2: Exactitud y validación del IRE y modelos predictivos",
        "cu10": "VD-D2 ind. 1 — Tests consistencia interna IRE (invariantes, monotonía)",
        "ind": "Consistencia interna percibida del IRE",
        "text": (
            "Las estimaciones del IRE son internamente consistentes (coherentes entre "
            "sus componentes y el valor global)."
        ),
        "valid": "Validez de contenido; contraste con test_risk.py.",
        "refs": "Barboza 2017; Kim 2020; Du Jardin 2021.",
    },
    {
        "n": 8,
        "dim": "D2: Exactitud y validación del IRE y modelos predictivos",
        "cu10": "VD-D2 ind. 2 — MAE pronóstico demanda RF vs baseline (unidades)",
        "ind": "Aceptabilidad del error medio de pronóstico (MAE)",
        "text": (
            f"El error medio de pronóstico de demanda (MAE) del {PH} es aceptable "
            "para la gestión de inventario."
        ),
        "valid": "Validez de criterio con evaluate.py.",
        "refs": "Makridakis 2018; Fildes 2022; Barboza 2017.",
    },
    {
        "n": 9,
        "dim": "D2: Exactitud y validación del IRE y modelos predictivos",
        "cu10": "VD-D2 ind. 3 — RMSE pronóstico demanda (unidades)",
        "ind": "Aceptabilidad de la variabilidad del error (RMSE)",
        "text": (
            f"La variabilidad del error de pronóstico (RMSE) del {PH} es aceptable "
            "para la planificación comercial."
        ),
        "valid": "Validez de contenido; V de Aiken ≥ 0,70.",
        "refs": "Altman 1968; Beaver 1966; Khalid 2022.",
    },
    {
        "n": 10,
        "dim": "D2: Exactitud y validación del IRE y modelos predictivos",
        "cu10": "VD-D2 ind. 4 — Estabilidad suma contribuciones IRE (= score mostrado)",
        "ind": "Transparencia de la suma de contribuciones del IRE",
        "text": (
            "La suma de las contribuciones del IRE coincide con el valor mostrado en el "
            "dashboard (es estable y transparente)."
        ),
        "valid": "Validez de contenido; alfa de Cronbach ≥ 0,70.",
        "refs": "Lepenioti 2020; Melville 2004; Paleyes 2022.",
    },
    {
        "n": 11,
        "dim": "D2: Exactitud y validación del IRE y modelos predictivos",
        "cu10": "VD-D2 ind. 5 — Variación desempeño por data drift mensual (%)",
        "ind": "Estabilidad del desempeño ante cambios en los datos",
        "text": (
            f"El desempeño del {PH} se mantiene estable ante cambios en los datos de "
            "ventas e inventario (poca degradación por drift)."
        ),
        "valid": "Validez de contenido; prueba piloto.",
        "refs": "Lepenioti 2020; Choi 2018; Khalid 2022.",
    },
    {
        "n": 12,
        "dim": "D2: Exactitud y validación del IRE y modelos predictivos",
        "cu10": "VD-D2 ind. 6 — AUC-ROC clasificador (condicional a eventos etiquetados)",
        "ind": "Utilidad de clasificación en situaciones de alto riesgo",
        "text": (
            f"Cuando existen eventos de crisis identificados, el {PH} clasifica "
            "adecuadamente las situaciones de alto riesgo empresarial."
        ),
        "valid": "Condicional (doc 07); comparación pre/post.",
        "refs": "Barboza 2017; Du Jardin 2021; Khalid 2022.",
    },
    # --- VD-D3: Componentes IRE (CU-T10 ítems 13–18) ---
    {
        "n": 13,
        "dim": "D3: Componentes del Índice de Riesgo Empresarial (IRE)",
        "cu10": "VD-D3 ind. 1 — Valor compuesto IRE (0–100)",
        "ind": "Representatividad del valor compuesto IRE global",
        "text": (
            "El valor compuesto del IRE (escala 0–100) representa adecuadamente el nivel "
            "de riesgo empresarial global."
        ),
        "valid": "Validez de contenido; contraste ireHistorial (Supabase).",
        "refs": "Altman 1968; Beaver 1966; Barboza 2017; doc 07.",
    },
    {
        "n": 14,
        "dim": "D3: Componentes del Índice de Riesgo Empresarial (IRE)",
        "cu10": "VD-D3 ind. 2 — Componente riesgo_stock (subíndice)",
        "ind": "Representatividad del componente riesgo_stock",
        "text": (
            "El subíndice riesgo_stock representa adecuadamente los problemas de "
            "inventario de la empresa."
        ),
        "valid": "Validez de contenido; contraste registros Supabase.",
        "refs": "Choi 2018; Fildes 2022; doc 07.",
    },
    {
        "n": 15,
        "dim": "D3: Componentes del Índice de Riesgo Empresarial (IRE)",
        "cu10": "VD-D3 ind. 3 — Componente riesgo_ingresos (subíndice)",
        "ind": "Representatividad del componente riesgo_ingresos",
        "text": (
            "El subíndice riesgo_ingresos ayuda a anticipar problemas relacionados "
            "con el flujo comercial de la empresa."
        ),
        "valid": "Validez de contenido; juicio de expertos.",
        "refs": "Altman 1968; Beaver 1966; Melville 2004.",
    },
    {
        "n": 16,
        "dim": "D3: Componentes del Índice de Riesgo Empresarial (IRE)",
        "cu10": "VD-D3 ind. 4 — Componente riesgo_demanda (subíndice)",
        "ind": "Representatividad del componente riesgo_demanda",
        "text": (
            "El subíndice riesgo_demanda ayuda a planificar oportunamente las compras "
            "de calzado."
        ),
        "valid": "Validez de contenido; contraste ventas históricas.",
        "refs": "Makridakis 2018; Fildes 2022.",
    },
    {
        "n": 17,
        "dim": "D3: Componentes del Índice de Riesgo Empresarial (IRE)",
        "cu10": "VD-D3 ind. 5 — Alerta temprana: IRE ≥ 51 (alto) o ≥ 76 (crítico)",
        "ind": "Utilidad de alertas tempranas del IRE",
        "text": (
            "Las alertas del IRE (≥ 51 riesgo alto, ≥ 76 riesgo crítico) son útiles "
            "y oportunas para la gestión preventiva."
        ),
        "valid": "Prueba piloto; contraste panel AdminPredictions.",
        "refs": "Paleyes 2022; Martinez-Fernandez 2022; doc 07.",
    },
    {
        "n": 18,
        "dim": "D3: Componentes del Índice de Riesgo Empresarial (IRE)",
        "cu10": "VD-D3 ind. 6 — Frecuencia actualización automática IRE",
        "ind": "Adecuación de la frecuencia de actualización del IRE",
        "text": (
            "La frecuencia de actualización del IRE es suficiente para la gestión "
            "operativa de la empresa."
        ),
        "valid": "Validez de contenido; validación operativa.",
        "refs": "Choi 2018; Lepenioti 2020; Paleyes 2022.",
    },
    # --- VD-D4: Impacto operativo (CU-T10 ítems 19–24) ---
    {
        "n": 19,
        "dim": "D4: Impacto del sistema en la gestión operativa de la PYME",
        "cu10": "VD-D4 ind. 1 — Reducción riesgo operativo percibido (Likert)",
        "ind": "Percepción de reducción del riesgo operativo",
        "text": (
            f"Percibo que el riesgo operativo de la empresa ha disminuido gracias al {PH}."
        ),
        "valid": "Comparación pre/post (O₁ vs O₂).",
        "refs": "Melville 2004; Choi 2018; Lepenioti 2020.",
    },
    {
        "n": 20,
        "dim": "D4: Impacto del sistema en la gestión operativa de la PYME",
        "cu10": "VD-D4 ind. 2 — Mejora tasa cumplimiento de pedidos (%)",
        "ind": "Percepción de mejora en cumplimiento de pedidos",
        "text": (
            f"La tasa de cumplimiento de pedidos ha mejorado con el uso del {PH}."
        ),
        "valid": "Validez de contenido; contraste logs Supabase.",
        "refs": "Fildes 2022; Choi 2018; Reinartz 2019.",
    },
    {
        "n": 21,
        "dim": "D4: Impacto del sistema en la gestión operativa de la PYME",
        "cu10": "VD-D4 ind. 3 — Reducción quiebres de stock (conteo O₁ vs O₂)",
        "ind": "Percepción de reducción de quiebres de stock",
        "text": (
            "Los quiebres de stock han disminuido con la gestión basada en predicción "
            "de riesgo."
        ),
        "valid": "Contraste registros pre/post; CU-T09 ES3.",
        "refs": "Choi 2018; Reinartz 2019; Melville 2004.",
    },
    {
        "n": 22,
        "dim": "D4: Impacto del sistema en la gestión operativa de la PYME",
        "cu10": "VD-D4 ind. 4 — Ahorro estimado gestión inventario (S/.)",
        "ind": "Percepción de ahorro en gestión de inventario",
        "text": (
            f"La gestión de inventario genera ahorro gracias a la información del {PH}."
        ),
        "valid": "Contraste registros inventario; alfa ≥ 0,70.",
        "refs": "Choi 2018; Melville 2004.",
    },
    {
        "n": 23,
        "dim": "D4: Impacto del sistema en la gestión operativa de la PYME",
        "cu10": "VD-D4 ind. 5 — Tasa adopción dashboard IRE (% sesiones admin)",
        "ind": "Frecuencia de uso del dashboard IRE",
        "text": (
            "El personal utiliza con frecuencia el dashboard del IRE para apoyar "
            "decisiones operativas."
        ),
        "valid": "Validez de contenido; logs sesiones admin.",
        "refs": "Paleyes 2022; Verhoef 2021; Soto-Acosta 2020.",
    },
    {
        "n": 24,
        "dim": "D4: Impacto del sistema en la gestión operativa de la PYME",
        "cu10": "VD-D4 ind. 6 — Percepción mejora gestión riesgo (ítem 24)",
        "ind": "Mejora global de la gestión del riesgo empresarial",
        "text": (
            f"En general, el {PH} mejora la gestión del riesgo empresarial "
            "en Calzatura Vilchez."
        ),
        "valid": "Consistencia interna total; alfa de Cronbach ≥ 0,70.",
        "refs": "Melville 2004; Verhoef 2021; Lepenioti 2020.",
    },
]

DIM_RANGES = {
    "D1": (1, 6),
    "D2": (7, 12),
    "D3": (13, 18),
    "D4": (19, 24),
}

# Palabras clave CU-T10 por item (validacion estricta)
CU10_KEYWORDS: dict[int, list[str]] = {
    1: ["modelo", "IRE"],
    2: ["variables", "stock"],
    3: ["7", "15", "30"],
    4: ["agregación", "combina", "componentes"],
    5: ["validación", "walk-forward"],
    6: ["empírico", "mejora"],
    7: ["consistentes", "componentes"],
    8: ["MAE"],
    9: ["RMSE"],
    10: ["contribuciones", "dashboard"],
    11: ["drift", "estable"],
    12: ["crisis", "clasifica"],
    13: ["0–100", "compuesto"],
    14: ["riesgo_stock", "stock"],
    15: ["riesgo_ingresos", "ingresos"],
    16: ["riesgo_demanda", "demanda"],
    17: ["51", "76", "alertas"],
    18: ["frecuencia", "actualización"],
    19: ["riesgo operativo", "disminuido"],
    20: ["cumplimiento", "pedidos"],
    21: ["quiebres", "stock"],
    22: ["ahorro", "inventario"],
    23: ["dashboard", "frecuencia"],
    24: ["general", "mejora"],
}
