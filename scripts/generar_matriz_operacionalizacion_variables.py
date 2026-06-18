from pathlib import Path

from docx import Document
from docx.enum.section import WD_ORIENT
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt


OUT = Path("c:/Cazatura Vilchez V3/Matriz_Operacionalizacion_Variables_Calzatura_Vilchez_MEJORADA.docx")


def set_run_font(run, size: float, bold: bool = False) -> None:
    run.bold = bold
    run.font.name = "Arial"
    run.font.size = Pt(size)
    run._element.rPr.rFonts.set(qn("w:eastAsia"), "Arial")


def set_cell_text(cell, text: str, bold: bool = False, font_size: float = 6.4) -> None:
    cell.text = ""
    paragraph = cell.paragraphs[0]
    paragraph.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    run = paragraph.add_run(text)
    set_run_font(run, font_size, bold)
    cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.TOP


def shade(cell, fill: str) -> None:
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:fill"), fill)


def set_widths(table, widths: list[float]) -> None:
    for row in table.rows:
        for index, width in enumerate(widths):
            row.cells[index].width = Inches(width)


doc = Document()
section = doc.sections[0]
section.orientation = WD_ORIENT.LANDSCAPE
section.page_width, section.page_height = section.page_height, section.page_width
section.top_margin = Inches(0.32)
section.bottom_margin = Inches(0.32)
section.left_margin = Inches(0.32)
section.right_margin = Inches(0.32)

title = doc.add_paragraph()
title.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = title.add_run("MATRIZ DE OPERACIONALIZACIÓN DE VARIABLES")
set_run_font(run, 12, True)

subtitle = doc.add_paragraph()
subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = subtitle.add_run(
    "Sistema web de comercio electrónico con modelo de Inteligencia Artificial para la predicción del riesgo empresarial en la empresa Calzatura Vilchez, Huancayo, 2026"
)
set_run_font(run, 8)

note = doc.add_paragraph()
note.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
run = note.add_run(
    "La matriz se deriva de la Tabla General del Estado del Arte y mantiene el alineamiento con los 42 artículos científicos Q1 revisados. La variable independiente y la variable dependiente se organizan en cuatro dimensiones cada una, con seis indicadores medibles por dimensión."
)
set_run_font(run, 7)

headers = [
    "Variable",
    "Definición conceptual",
    "Definición operacional",
    "Dimensión",
    "Indicadores",
    "Escala / unidad",
    "Técnica",
    "Instrumento",
    "Sustento científico",
]

vi_concept = (
    "Intervención tecnológica compuesta por un sistema web de comercio electrónico y un modelo de Inteligencia Artificial que digitaliza ventas, inventario y predicción de demanda."
)
vi_oper = (
    "Se mide mediante indicadores técnicos y operativos del sistema: digitalización, desempeño del modelo, arquitectura, despliegue y cumplimiento metodológico."
)
vd_concept = (
    "Capacidad de cuantificar y anticipar el riesgo empresarial de Calzatura Vilchez mediante el Índice de Riesgo Empresarial (IRE)."
)
vd_oper = (
    "Se mide con el IRE y sus componentes: riesgo_stock, riesgo_ingreso y riesgo_demanda, además de métricas de validación e impacto operativo antes y después de la implementación."
)

rows = [
    [
        "VI: Sistema web de comercio electrónico con modelo de Inteligencia Artificial",
        vi_concept,
        vi_oper,
        "D1: E-commerce y transformación digital del negocio",
        "1. Nivel de madurez digital de la empresa.\n2. Tasa de digitalización de procesos de venta y gestión.\n3. Número de canales de venta digitales activos.\n4. Tasa de conversión digital.\n5. Satisfacción del cliente en el canal web.\n6. Tiempo de ciclo de procesamiento de pedidos.",
        "Ordinal 1-5; razón (%); conteo; razón (%); ordinal/Likert; razón (horas).",
        "Análisis documental, observación sistemática y encuesta.",
        "Ficha de análisis documental, guía de observación y cuestionario Likert.",
        "Eje 1: Verhoef 2021; Soto-Acosta 2020; Nambisan 2017; Li 2020; Chatterjee 2020; Kannan 2017; Reinartz 2019; Hagberg 2016.",
    ],
    [
        "VI: Sistema web de comercio electrónico con modelo de Inteligencia Artificial",
        vi_concept,
        vi_oper,
        "D2: Inteligencia Artificial y analítica de datos empresariales",
        "1. MAE del pronóstico de demanda.\n2. RMSE del pronóstico de demanda.\n3. sMAPE del pronóstico de ventas.\n4. R2 del modelo predictivo.\n5. Número de variables predictoras relevantes.\n6. Tiempo de inferencia del microservicio de IA.",
        "Razón (unidades); razón (unidades); razón (%); intervalo 0-1; conteo; razón (ms).",
        "Análisis de datos históricos y evaluación de modelos de Machine Learning.",
        "Dataset de ventas, pipeline Python/scikit-learn, reporte de métricas ML.",
        "Eje 2: Yuan 2021; Davenport 2020; Shrestha 2019; Amba 2017; Makridakis 2018; Fildes 2022; Syam 2018; Haefner 2021; Paschen 2019.",
    ],
    [
        "VI: Sistema web de comercio electrónico con modelo de Inteligencia Artificial",
        vi_concept,
        vi_oper,
        "D3: Arquitectura de software y despliegue del modelo ML",
        "1. Latencia p95 de la API de predicción.\n2. Disponibilidad del sistema web y microservicio.\n3. Tiempo de despliegue de una nueva versión.\n4. Número de integraciones API activas.\n5. Cobertura de pruebas automatizadas.\n6. Tiempo medio de recuperación ante incidentes.",
        "Razón (ms); razón (%); razón (min); conteo; razón (%); razón (horas).",
        "Pruebas técnicas, monitoreo del sistema y revisión de repositorio.",
        "Reporte de pruebas, logs del sistema, checklist de despliegue y tablero de monitoreo.",
        "Eje 4: Jamshidi 2018; Swakatare 2019; Khalid 2022; Fischer 2018; Paleyes 2022; Martinez-Fernandez 2022; Li 2021.",
    ],
    [
        "VI: Sistema web de comercio electrónico con modelo de Inteligencia Artificial",
        vi_concept,
        vi_oper,
        "D4: Metodología de desarrollo ágil e híbrida del sistema",
        "1. Velocidad del equipo de desarrollo por sprint.\n2. Tasa de completitud de sprints.\n3. Número de fases CRISP-ML(Q) cubiertas.\n4. Nivel de madurez del proceso MLOps.\n5. Tiempo de entrega de incrementos funcionales.\n6. ROI de la inversión tecnológica.",
        "Razón (puntos/sprint); razón (%); conteo; ordinal 1-5; razón (días); razón (%).",
        "Revisión documental del proyecto, control de avance y análisis económico.",
        "Backlog, tablero Scrum/Kanban, checklist CRISP-ML(Q), registro de costos y beneficios.",
        "Eje 5: Breiman 2001; Dingsøyr 2012; Salgonde 2021; Kuhrmann 2019; Lepenioti 2020; Choi 2018; Haakman 2021; Melville 2004.",
    ],
    [
        "VD: Predicción del riesgo empresarial mediante el IRE",
        vd_concept,
        vd_oper,
        "D1: Modelos de predicción del riesgo empresarial con ML",
        "1. Tipo de modelo utilizado para riesgo empresarial.\n2. Número de variables financieras y operativas usadas.\n3. Horizonte de predicción anticipada.\n4. Técnica de selección de variables aplicada.\n5. Método de validación del modelo.\n6. Comparación frente a modelo de referencia.",
        "Nominal; conteo; razón (días); nominal; nominal; razón (% de mejora).",
        "Análisis documental y evaluación comparativa de modelos.",
        "Ficha de modelado, dataset histórico, registro de experimentos y reporte comparativo.",
        "Eje 3: Ozbayoglu 2020; Barboza 2017; Osaka 2021; Kim 2020; Du Jardin 2021; Jiang 2018; Cai 2021; Tian 2015; Altman 1968; Beaver 1966.",
    ],
    [
        "VD: Predicción del riesgo empresarial mediante el IRE",
        vd_concept,
        vd_oper,
        "D2: Exactitud y validación del modelo predictivo del IRE",
        "1. AUC-ROC del clasificador de riesgo.\n2. Accuracy del nivel de riesgo bajo/medio/alto.\n3. Recall de detección de situaciones de riesgo.\n4. F1-score del modelo.\n5. MAE de predicción del valor del IRE.\n6. Variación de desempeño por data drift mensual.",
        "Intervalo 0-1; razón (%); razón (%); intervalo 0-1; razón; razón (%).",
        "Validación de modelo, análisis estadístico y monitoreo mensual.",
        "Matriz de confusión, curva ROC, reporte scikit-learn, SHAP y reporte de data drift.",
        "Eje 3 y Eje 4: Barboza 2017; Kim 2020; Du Jardin 2021; Ozbayoglu 2020; Khalid 2022; Paleyes 2022.",
    ],
    [
        "VD: Predicción del riesgo empresarial mediante el IRE",
        vd_concept,
        vd_oper,
        "D3: Componentes del Índice de Riesgo Empresarial",
        "1. Valor compuesto del IRE.\n2. Componente riesgo_stock.\n3. Componente riesgo_ingreso.\n4. Componente riesgo_demanda.\n5. Umbral de alerta temprana IRE >= 0.70.\n6. Frecuencia de actualización automática del IRE.",
        "Intervalo 0-1; intervalo 0-1; intervalo 0-1; intervalo 0-1; nominal/intervalo; razón (días).",
        "Cálculo automatizado, análisis documental y juicio de expertos.",
        "Dashboard del IRE, ficha de cálculo, base de ventas/inventario y ficha de validación de expertos.",
        "Eje 3: Altman 1968; Beaver 1966; Barboza 2017; Fildes 2022; Khalid 2022; Choi 2018.",
    ],
    [
        "VD: Predicción del riesgo empresarial mediante el IRE",
        vd_concept,
        vd_oper,
        "D4: Impacto del sistema en la gestión operativa de la PYME",
        "1. Reducción del riesgo operativo percibido.\n2. Mejora en la tasa de cumplimiento de pedidos.\n3. Reducción de quiebres de stock.\n4. Ahorro estimado por mejor gestión de inventario.\n5. Tasa de adopción del dashboard del IRE.\n6. ROI del sistema completo.",
        "Razón (%); razón (%); conteo/razón (%); razón (S/.); razón (%); razón (%).",
        "Comparación preprueba-posprueba, encuesta y análisis de indicadores operativos.",
        "Cuestionario Likert, ficha documental, dashboard, reporte de KPIs y registro de costos.",
        "Eje 1 y Eje 5: Melville 2004; Choi 2018; Lepenioti 2020; Soto-Acosta 2020; Verhoef 2021.",
    ],
]

table = doc.add_table(rows=len(rows) + 1, cols=len(headers))
table.style = "Table Grid"
table.alignment = WD_TABLE_ALIGNMENT.CENTER
table.autofit = False
set_widths(table, [1.25, 1.55, 1.55, 1.55, 2.15, 1.3, 1.35, 1.45, 1.8])

for col_index, header in enumerate(headers):
    cell = table.cell(0, col_index)
    set_cell_text(cell, header, bold=True, font_size=6.9)
    shade(cell, "D9EAF7")

for row_index, row in enumerate(rows, start=1):
    for col_index, value in enumerate(row):
        cell = table.cell(row_index, col_index)
        set_cell_text(cell, value, font_size=6.15)
        if row_index <= 4:
            shade(cell, "F4F9FD")
        else:
            shade(cell, "FFF9EE")

doc.save(OUT)
print(OUT)
