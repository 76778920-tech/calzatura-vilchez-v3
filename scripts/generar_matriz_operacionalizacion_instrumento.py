from pathlib import Path

from docx import Document
from docx.enum.section import WD_ORIENT
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt


OUT = Path("c:/Cazatura Vilchez V3/Matriz_Operacionalizacion_Instrumento_Calzatura_Vilchez_MEJORADA.docx")


def set_run_font(run, size: float, bold: bool = False) -> None:
    run.bold = bold
    run.font.name = "Arial"
    run.font.size = Pt(size)
    run._element.rPr.rFonts.set(qn("w:eastAsia"), "Arial")


def set_cell_text(cell, text: str, bold: bool = False, font_size: float = 6.0) -> None:
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
section.top_margin = Inches(0.3)
section.bottom_margin = Inches(0.3)
section.left_margin = Inches(0.28)
section.right_margin = Inches(0.28)

title = doc.add_paragraph()
title.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = title.add_run("MATRIZ DE OPERACIONALIZACIÓN DEL INSTRUMENTO")
set_run_font(run, 12, True)

subtitle = doc.add_paragraph()
subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = subtitle.add_run(
    "Instrumento: Cuestionario de percepción sobre predicción del riesgo empresarial y utilidad del sistema web con IA en Calzatura Vilchez"
)
set_run_font(run, 8)

note = doc.add_paragraph()
note.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
run = note.add_run(
    "Escala Likert de 5 puntos: 1 = Totalmente en desacuerdo, 2 = En desacuerdo, 3 = Ni de acuerdo ni en desacuerdo, 4 = De acuerdo, 5 = Totalmente de acuerdo. Para mantener equivalencia entre preprueba y posprueba, donde corresponda se interpreta [método actual / sistema implementado] según el momento de aplicación."
)
set_run_font(run, 7)

headers = [
    "Variable evaluada",
    "Dimensión",
    "Indicador del instrumento",
    "Ítem",
    "Redacción del ítem",
    "Escala",
    "Técnica",
    "Instrumento",
    "Momento",
    "Validación y sustento",
]

variable = "Predicción del riesgo empresarial mediante el Índice de Riesgo Empresarial (IRE)"
scale = "Ordinal Likert 1-5"
technique = "Encuesta estructurada"
instrument = "Cuestionario de 24 ítems"
moment = "Preprueba y posprueba"

rows = [
    [
        variable,
        "D1: Modelos de predicción del riesgo empresarial",
        "Disponibilidad de información para anticipar riesgos",
        "1",
        "El [método actual / sistema implementado] proporciona información suficiente para anticipar riesgos operativos en la empresa.",
        scale,
        technique,
        instrument,
        moment,
        "Juicio de expertos; V de Aiken >= 0.70. Sustento: Altman 1968; Beaver 1966; Barboza 2017; Khalid 2022.",
    ],
    [
        variable,
        "D1: Modelos de predicción del riesgo empresarial",
        "Identificación temprana de riesgos",
        "2",
        "El [método actual / sistema implementado] permite identificar riesgos antes de que afecten las ventas, inventario o ingresos.",
        scale,
        technique,
        instrument,
        moment,
        "Juicio de expertos; V de Aiken >= 0.70. Sustento: Kim 2020; Du Jardin 2021; Khalid 2022.",
    ],
    [
        variable,
        "D1: Modelos de predicción del riesgo empresarial",
        "Confiabilidad para la toma de decisiones",
        "3",
        "Los resultados de predicción generados por el [método actual / sistema implementado] son confiables para la toma de decisiones.",
        scale,
        technique,
        instrument,
        moment,
        "Juicio de expertos; alfa de Cronbach >= 0.70. Sustento: Yuan 2021; Shrestha 2019; Barboza 2017.",
    ],
    [
        variable,
        "D1: Modelos de predicción del riesgo empresarial",
        "Oportunidad del análisis de datos",
        "4",
        "La información de ventas e inventario se analiza oportunamente para apoyar la gestión del riesgo empresarial.",
        scale,
        technique,
        instrument,
        moment,
        "Juicio de expertos; alfa de Cronbach >= 0.70. Sustento: Amba 2017; Choi 2018; Fildes 2022.",
    ],
    [
        variable,
        "D1: Modelos de predicción del riesgo empresarial",
        "Rapidez y precisión del procesamiento",
        "5",
        "El procesamiento de los datos de ventas e inventario se realiza con rapidez y precisión.",
        scale,
        technique,
        instrument,
        moment,
        "Juicio de expertos; prueba piloto. Sustento: Paleyes 2022; Martinez-Fernandez 2022.",
    ],
    [
        variable,
        "D1: Modelos de predicción del riesgo empresarial",
        "Utilidad de las predicciones",
        "6",
        "Las predicciones disponibles ayudan a planificar compras, ventas e inventario en la empresa.",
        scale,
        technique,
        instrument,
        moment,
        "Juicio de expertos; alfa de Cronbach >= 0.70. Sustento: Makridakis 2018; Fildes 2022; Choi 2018.",
    ],
    [
        variable,
        "D2: Exactitud y validación del modelo predictivo del IRE",
        "Correspondencia con la situación real",
        "7",
        "Las estimaciones de riesgo reflejan adecuadamente la situación real de la empresa.",
        scale,
        technique,
        instrument,
        moment,
        "Validez de contenido; contraste con indicadores históricos. Sustento: Barboza 2017; Kim 2020; Du Jardin 2021.",
    ],
    [
        variable,
        "D2: Exactitud y validación del modelo predictivo del IRE",
        "Anticipación de problemas críticos",
        "8",
        "Las estimaciones de riesgo permiten anticipar problemas de inventario, ingresos o demanda.",
        scale,
        technique,
        instrument,
        moment,
        "Validez de contenido; V de Aiken >= 0.70. Sustento: Altman 1968; Beaver 1966; Khalid 2022.",
    ],
    [
        variable,
        "D2: Exactitud y validación del modelo predictivo del IRE",
        "Oportunidad de alertas",
        "9",
        "Las alertas de riesgo se generan con la anticipación necesaria para tomar decisiones preventivas.",
        scale,
        technique,
        instrument,
        moment,
        "Validez de contenido; prueba piloto. Sustento: Lepenioti 2020; Choi 2018; Paleyes 2022.",
    ],
    [
        variable,
        "D2: Exactitud y validación del modelo predictivo del IRE",
        "Accionabilidad de las alertas",
        "10",
        "Las alertas de riesgo permiten definir acciones preventivas claras para la gestión de la empresa.",
        scale,
        technique,
        instrument,
        moment,
        "Validez de contenido; alfa de Cronbach >= 0.70. Sustento: Lepenioti 2020; Melville 2004.",
    ],
    [
        variable,
        "D2: Exactitud y validación del modelo predictivo del IRE",
        "Aceptabilidad del error de pronóstico",
        "11",
        "El error del pronóstico de demanda es aceptable para apoyar la gestión del inventario.",
        scale,
        technique,
        instrument,
        moment,
        "Validez de criterio con MAE/RMSE. Sustento: Makridakis 2018; Fildes 2022; Barboza 2017.",
    ],
    [
        variable,
        "D2: Exactitud y validación del modelo predictivo del IRE",
        "Mejora frente al método empírico",
        "12",
        "La precisión del [método actual / sistema implementado] permite mejorar la estimación empírica del riesgo empresarial.",
        scale,
        technique,
        instrument,
        moment,
        "Comparación preprueba-posprueba; alfa de Cronbach >= 0.70. Sustento: Barboza 2017; Du Jardin 2021; Khalid 2022.",
    ],
    [
        variable,
        "D3: Componentes del Índice de Riesgo Empresarial",
        "Representatividad del riesgo_stock",
        "13",
        "El indicador de riesgo de stock representa adecuadamente los problemas de inventario de la empresa.",
        scale,
        technique,
        instrument,
        moment,
        "Juicio de expertos; validación con registros de inventario. Sustento: Choi 2018; Fildes 2022.",
    ],
    [
        variable,
        "D3: Componentes del Índice de Riesgo Empresarial",
        "Representatividad del riesgo_ingreso",
        "14",
        "El indicador de riesgo de ingresos ayuda a anticipar problemas relacionados con el flujo comercial de la empresa.",
        scale,
        technique,
        instrument,
        moment,
        "Juicio de expertos; validación documental. Sustento: Altman 1968; Beaver 1966; Melville 2004.",
    ],
    [
        variable,
        "D3: Componentes del Índice de Riesgo Empresarial",
        "Representatividad del riesgo_demanda",
        "15",
        "El indicador de riesgo de demanda ayuda a planificar oportunamente las compras de calzado.",
        scale,
        technique,
        instrument,
        moment,
        "Juicio de expertos; validación con ventas históricas. Sustento: Makridakis 2018; Fildes 2022.",
    ],
    [
        variable,
        "D3: Componentes del Índice de Riesgo Empresarial",
        "Adecuación de ponderaciones del IRE",
        "16",
        "La ponderación de los componentes del IRE (stock 40 %, ingresos 35 % y demanda 25 %) es adecuada para Calzatura Vilchez.",
        scale,
        technique,
        instrument,
        moment,
        "Juicio de expertos; análisis de sensibilidad. Sustento: Altman 1968; Beaver 1966; Lepenioti 2020.",
    ],
    [
        variable,
        "D3: Componentes del Índice de Riesgo Empresarial",
        "Claridad de visualización del IRE",
        "17",
        "El reporte o dashboard del IRE muestra el nivel de riesgo y sus componentes de forma clara.",
        scale,
        technique,
        instrument,
        moment,
        "Prueba piloto; consistencia interna. Sustento: Paleyes 2022; Martinez-Fernandez 2022; Melville 2004.",
    ],
    [
        variable,
        "D3: Componentes del Índice de Riesgo Empresarial",
        "Frecuencia de actualización del IRE",
        "18",
        "La frecuencia de actualización del IRE es suficiente para la gestión operativa de la empresa.",
        scale,
        technique,
        instrument,
        moment,
        "Juicio de expertos; validación operativa. Sustento: Choi 2018; Lepenioti 2020; Paleyes 2022.",
    ],
    [
        variable,
        "D4: Impacto del sistema en la gestión operativa",
        "Reducción de quiebres de stock",
        "19",
        "La gestión basada en predicción de riesgo contribuye a reducir los quiebres de stock.",
        scale,
        technique,
        instrument,
        moment,
        "Contraste con registros pre-posprueba. Sustento: Choi 2018; Reinartz 2019; Melville 2004.",
    ],
    [
        variable,
        "D4: Impacto del sistema en la gestión operativa",
        "Mejora en planificación de pedidos",
        "20",
        "La información de riesgo disponible mejora la planificación de pedidos a proveedores.",
        scale,
        technique,
        instrument,
        moment,
        "Validez de contenido; contraste documental. Sustento: Fildes 2022; Choi 2018; Lepenioti 2020.",
    ],
    [
        variable,
        "D4: Impacto del sistema en la gestión operativa",
        "Eficiencia de procesos de venta",
        "21",
        "La digitalización de los procesos de venta mejora la eficiencia operativa de la empresa.",
        scale,
        technique,
        instrument,
        moment,
        "Juicio de expertos; prueba piloto. Sustento: Verhoef 2021; Soto-Acosta 2020; Reinartz 2019.",
    ],
    [
        variable,
        "D4: Impacto del sistema en la gestión operativa",
        "Reducción de inventario obsoleto",
        "22",
        "La información generada por el [método actual / sistema implementado] ayuda a reducir inventario inmovilizado u obsoleto.",
        scale,
        technique,
        instrument,
        moment,
        "Contraste con registros de inventario; alfa de Cronbach >= 0.70. Sustento: Choi 2018; Melville 2004.",
    ],
    [
        variable,
        "D4: Impacto del sistema en la gestión operativa",
        "Mejora de satisfacción del cliente",
        "23",
        "La mejora en ventas, inventario y atención contribuye a elevar la satisfacción de los clientes.",
        scale,
        technique,
        instrument,
        moment,
        "Validez de contenido; prueba piloto. Sustento: Kannan 2017; Chatterjee 2020; Reinartz 2019.",
    ],
    [
        variable,
        "D4: Impacto del sistema en la gestión operativa",
        "Mejora global de gestión del riesgo",
        "24",
        "En general, el [método actual / sistema implementado] mejora la gestión del riesgo empresarial en Calzatura Vilchez.",
        scale,
        technique,
        instrument,
        moment,
        "Consistencia interna por dimensión y total; alfa de Cronbach >= 0.70. Sustento: Melville 2004; Verhoef 2021; Lepenioti 2020.",
    ],
]

table = doc.add_table(rows=len(rows) + 1, cols=len(headers))
table.style = "Table Grid"
table.alignment = WD_TABLE_ALIGNMENT.CENTER
table.autofit = False
set_widths(table, [1.2, 1.35, 1.35, 0.35, 2.45, 0.75, 0.9, 0.9, 0.75, 1.8])

for col_index, header in enumerate(headers):
    cell = table.cell(0, col_index)
    set_cell_text(cell, header, bold=True, font_size=6.3)
    shade(cell, "D9EAF7")

for row_index, row in enumerate(rows, start=1):
    for col_index, value in enumerate(row):
        cell = table.cell(row_index, col_index)
        set_cell_text(cell, value, font_size=5.45)
        if 1 <= row_index <= 6:
            shade(cell, "F4F9FD")
        elif 7 <= row_index <= 12:
            shade(cell, "FFF9EE")
        elif 13 <= row_index <= 18:
            shade(cell, "F6F7F2")
        else:
            shade(cell, "FDF4F4")

doc.save(OUT)
print(OUT)
