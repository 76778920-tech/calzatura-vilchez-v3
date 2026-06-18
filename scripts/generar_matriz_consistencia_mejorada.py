from pathlib import Path

from docx import Document
from docx.enum.section import WD_ORIENT
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt


OUT = Path("c:/Cazatura Vilchez V3/Matriz_Consistencia_Calzatura_Vilchez_MEJORADA.docx")


def set_cell_text(cell, text: str, bold: bool = False, font_size: float = 7.2) -> None:
    cell.text = ""
    paragraph = cell.paragraphs[0]
    paragraph.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    run = paragraph.add_run(text)
    run.bold = bold
    run.font.name = "Arial"
    run.font.size = Pt(font_size)
    run._element.rPr.rFonts.set(qn("w:eastAsia"), "Arial")
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
section.top_margin = Inches(0.35)
section.bottom_margin = Inches(0.35)
section.left_margin = Inches(0.35)
section.right_margin = Inches(0.35)

title = doc.add_paragraph()
title.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = title.add_run("MATRIZ DE CONSISTENCIA")
run.bold = True
run.font.name = "Arial"
run.font.size = Pt(12)
run._element.rPr.rFonts.set(qn("w:eastAsia"), "Arial")

subtitle = doc.add_paragraph()
subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = subtitle.add_run(
    "Sistema web de comercio electrónico con modelo de Inteligencia Artificial para la predicción del riesgo empresarial en la empresa Calzatura Vilchez, Huancayo, 2026"
)
run.font.name = "Arial"
run.font.size = Pt(8)
run._element.rPr.rFonts.set(qn("w:eastAsia"), "Arial")

headers = [
    "Problemas",
    "Objetivos",
    "Hipótesis",
    "Variables",
    "Dimensiones",
    "Indicadores",
    "Metodología",
]

rows = [
    [
        "Problema general: ¿De qué manera el sistema web de comercio electrónico con modelo de Inteligencia Artificial influye en la predicción del riesgo empresarial en la empresa Calzatura Vilchez, Huancayo, 2026?",
        "Objetivo general: Implementar un sistema web de comercio electrónico con modelo de Inteligencia Artificial para mejorar la predicción del riesgo empresarial en la empresa Calzatura Vilchez, Huancayo, 2026.",
        "Hipótesis general: El sistema web de comercio electrónico con modelo de Inteligencia Artificial mejora significativamente la predicción del riesgo empresarial en la empresa Calzatura Vilchez, Huancayo, 2026.",
        "Variable independiente: Sistema web de comercio electrónico con modelo de Inteligencia Artificial.\n\nVariable dependiente: Predicción del riesgo empresarial mediante el Índice de Riesgo Empresarial (IRE).",
        "VI: D1 e-commerce y transformación digital; D2 IA y analítica de datos empresariales; D3 arquitectura de software y despliegue ML; D4 metodología de desarrollo ágil e híbrida.\n\nVD: D1 modelos de predicción de riesgo; D2 exactitud y validación del IRE; D3 componentes del IRE; D4 impacto en la gestión operativa.",
        "Indicadores generales: tasa de digitalización de procesos, canales digitales activos, MAE, RMSE, sMAPE, latencia API, disponibilidad del sistema, cobertura de pruebas, valor del IRE, AUC-ROC, accuracy, recall, F1-score, reducción de quiebres de stock, ahorro por gestión de inventario y adopción del dashboard.",
        "Método: científico y tecnológico-sistémico.\nTipo: aplicada.\nEnfoque: cuantitativo.\nNivel: explicativo-causal.\nDiseño: pre-experimental con un solo grupo y medición antes-después: O1 -> X -> O2.\nPoblación: registros de ventas e inventario y personal de Calzatura Vilchez.\nMuestra: registros enero 2023-diciembre 2025 y censo del personal.",
    ],
    [
        "Problema específico 1: ¿En qué medida la implementación del sistema web de comercio electrónico mejora la digitalización de los procesos de venta y gestión de inventario en la empresa Calzatura Vilchez?",
        "Objetivo específico 1: Digitalizar los procesos de venta y gestión de inventario mediante el desarrollo e implementación del sistema web de comercio electrónico con React, TypeScript y Firebase Firestore.",
        "Hipótesis específica 1: La implementación del sistema web de comercio electrónico mejora significativamente la digitalización de los procesos de venta y gestión de inventario, incrementando la tasa de digitalización en al menos 70 %.",
        "Variable independiente: Sistema web de comercio electrónico con modelo de Inteligencia Artificial.",
        "D1: e-commerce y transformación digital del negocio.\nD3: arquitectura de software y despliegue del sistema.",
        "Tasa de digitalización de procesos de venta y gestión (%); número de procesos automatizados; número de canales digitales activos; tasa de conversión digital; tiempo de procesamiento de pedidos; disponibilidad del sistema web.",
        "Técnicas: análisis documental, observación sistemática y encuesta.\nInstrumentos: ficha de análisis documental, guía de observación estructurada y cuestionario Likert.\nAnálisis: comparación preprueba-posprueba de indicadores de digitalización y eficiencia operativa.",
    ],
    [
        "Problema específico 2: ¿Cómo el modelo de Inteligencia Artificial basado en RandomForestRegressor mejora la precisión del pronóstico de demanda de calzado en la empresa Calzatura Vilchez, medida a través del MAE y el RMSE?",
        "Objetivo específico 2: Desarrollar e implementar un modelo de Machine Learning basado en RandomForestRegressor para el pronóstico de demanda de calzado con horizontes de 14 a 30 días, utilizando datos históricos de ventas de la empresa.",
        "Hipótesis específica 2: El modelo de Inteligencia Artificial basado en RandomForestRegressor mejora significativamente la precisión del pronóstico de demanda de calzado, reduciendo el MAE en al menos 30 % respecto al método actual de estimación empírica.",
        "Variable independiente: Sistema web de comercio electrónico con modelo de Inteligencia Artificial.\n\nVariable dependiente: Predicción del riesgo empresarial mediante el componente de demanda del IRE.",
        "VI-D2: IA y analítica de datos empresariales.\nVD-D2: exactitud y validación del modelo predictivo del IRE.\nVD-D3: componente riesgo_demanda del IRE.",
        "MAE del pronóstico; RMSE del pronóstico; sMAPE; R2; horizonte de predicción; número de variables predictoras relevantes; error relativo de demanda; estabilidad del modelo ante data drift.",
        "Técnicas: análisis documental de ventas históricas y evaluación de modelos ML.\nInstrumentos: ficha de extracción de datos, dataset de ventas e inventario, pipeline Python/scikit-learn.\nAnálisis: validación temporal walk-forward, comparación con método empírico, métricas MAE, RMSE, sMAPE y R2.",
    ],
    [
        "Problema específico 3: ¿En qué grado el Índice de Riesgo Empresarial (IRE) calculado por el sistema permite reducir el riesgo operativo y anticipar situaciones de alerta en la empresa Calzatura Vilchez?",
        "Objetivo específico 3: Calcular y monitorear el Índice de Riesgo Empresarial (IRE) de manera automatizada para alertar oportunamente al equipo de gestión sobre situaciones de riesgo operativo.",
        "Hipótesis específica 3: El Índice de Riesgo Empresarial calculado por el sistema reduce significativamente el riesgo operativo de Calzatura Vilchez, disminuyendo el número de quiebres de stock en al menos 40 % durante el período posprueba.",
        "Variable dependiente: Predicción del riesgo empresarial mediante el Índice de Riesgo Empresarial (IRE).",
        "VD-D1: modelos de predicción del riesgo empresarial con ML.\nVD-D2: exactitud y validación del IRE.\nVD-D3: componentes del IRE.\nVD-D4: impacto del sistema en la gestión operativa.",
        "IRE = 0.40 riesgo_stock + 0.35 riesgo_ingreso + 0.25 riesgo_demanda; riesgo_stock; riesgo_ingreso; riesgo_demanda; umbral de alerta IRE >= 0.70; AUC-ROC; accuracy; recall; F1-score; reducción de quiebres de stock; tasa de alertas atendidas.",
        "Técnicas: análisis documental, observación sistemática, encuesta y validación del modelo.\nInstrumentos: ficha documental, guía de observación, cuestionario Likert, matriz de confusión, curva ROC y dashboard del IRE.\nAnálisis: Shapiro-Wilk; t de Student para muestras relacionadas o Wilcoxon; alfa = 0.05; análisis de sensibilidad del IRE.",
    ],
]

table = doc.add_table(rows=len(rows) + 1, cols=len(headers))
table.style = "Table Grid"
table.alignment = WD_TABLE_ALIGNMENT.CENTER
table.autofit = False
set_widths(table, [1.45, 1.45, 1.45, 1.4, 1.75, 2.15, 2.05])

for col_index, header in enumerate(headers):
    cell = table.cell(0, col_index)
    set_cell_text(cell, header, bold=True, font_size=7.6)
    shade(cell, "D9EAF7")

for row_index, row in enumerate(rows, start=1):
    for col_index, value in enumerate(row):
        set_cell_text(table.cell(row_index, col_index), value, font_size=6.7)

doc.save(OUT)
print(OUT)
