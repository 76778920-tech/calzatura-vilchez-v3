from pathlib import Path

from docx import Document
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt


OUT = Path("c:/Cazatura Vilchez V3/Instrumento_Investigacion_Calzatura_Vilchez_MEJORADO.docx")


def set_run_font(run, size: float, bold: bool = False) -> None:
    run.bold = bold
    run.font.name = "Arial"
    run.font.size = Pt(size)
    run._element.rPr.rFonts.set(qn("w:eastAsia"), "Arial")


def add_paragraph(doc: Document, text: str, size: float = 10, bold: bool = False, align=None):
    paragraph = doc.add_paragraph()
    if align is not None:
        paragraph.alignment = align
    run = paragraph.add_run(text)
    set_run_font(run, size, bold)
    return paragraph


def set_cell_text(cell, text: str, bold: bool = False, font_size: float = 8.0, align=None) -> None:
    cell.text = ""
    paragraph = cell.paragraphs[0]
    paragraph.alignment = align if align is not None else WD_ALIGN_PARAGRAPH.JUSTIFY
    run = paragraph.add_run(text)
    set_run_font(run, font_size, bold)
    cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER


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
            if index < len(row.cells):
                row.cells[index].width = Inches(width)


doc = Document()
section = doc.sections[0]
section.top_margin = Inches(0.55)
section.bottom_margin = Inches(0.55)
section.left_margin = Inches(0.6)
section.right_margin = Inches(0.6)

add_paragraph(doc, "ANEXO 04. INSTRUMENTO DE INVESTIGACION", 12, True, WD_ALIGN_PARAGRAPH.CENTER)
add_paragraph(
    doc,
    "Cuestionario de percepcion sobre la prediccion del riesgo empresarial y utilidad del sistema web con Inteligencia Artificial en Calzatura Vilchez",
    10,
    True,
    WD_ALIGN_PARAGRAPH.CENTER,
)

add_paragraph(doc, "I. Ficha tecnica del instrumento", 10, True)
tech_rows = [
    ("Nombre del instrumento", "Cuestionario de percepcion sobre la prediccion del riesgo empresarial y utilidad del sistema web con IA."),
    ("Variable evaluada", "Prediccion del riesgo empresarial mediante el Indice de Riesgo Empresarial (IRE)."),
    ("Objetivo", "Recolectar la percepcion del personal de Calzatura Vilchez sobre la capacidad de anticipar, validar y gestionar el riesgo empresarial antes y despues de la implementacion del sistema."),
    ("Tecnica", "Encuesta estructurada."),
    ("Tipo de escala", "Escala ordinal tipo Likert de 5 puntos."),
    ("Numero de items", "24 items distribuidos en 4 dimensiones, con 6 items por dimension."),
    ("Poblacion de aplicacion", "Personal directivo y operativo de Calzatura Vilchez."),
    ("Momento de aplicacion", "Preprueba y posprueba. El mismo instrumento se aplica antes y despues de la implementacion para permitir comparacion estadistica."),
    ("Validez", "Juicio de expertos en Ingenieria de Sistemas, metodologia de investigacion y gestion empresarial. Criterio sugerido: V de Aiken >= 0.70."),
    ("Confiabilidad", "Alfa de Cronbach por dimension y total del instrumento. Criterio minimo aceptable: alfa >= 0.70."),
    ("Sustento academico", "Instrumento alineado con la matriz de operacionalizacion y con los 42 articulos cientificos Q1 revisados en el estado del arte."),
]
tech_table = doc.add_table(rows=len(tech_rows), cols=2)
tech_table.style = "Table Grid"
tech_table.alignment = WD_TABLE_ALIGNMENT.CENTER
set_widths(tech_table, [2.2, 4.8])
for row_index, (label, value) in enumerate(tech_rows):
    set_cell_text(tech_table.cell(row_index, 0), label, True, 8)
    set_cell_text(tech_table.cell(row_index, 1), value, False, 8)
    shade(tech_table.cell(row_index, 0), "D9EAF7")

add_paragraph(doc, "II. Datos generales del participante", 10, True)
data_rows = [
    ("Codigo del participante", "____________________________"),
    ("Cargo o area", "____________________________"),
    ("Fecha de aplicacion", "____ / ____ / ______"),
    ("Momento de aplicacion", "[  ] Preprueba     [  ] Posprueba"),
]
data_table = doc.add_table(rows=len(data_rows), cols=2)
data_table.style = "Table Grid"
data_table.alignment = WD_TABLE_ALIGNMENT.CENTER
set_widths(data_table, [2.2, 4.8])
for row_index, (label, value) in enumerate(data_rows):
    set_cell_text(data_table.cell(row_index, 0), label, True, 8)
    set_cell_text(data_table.cell(row_index, 1), value, False, 8)
    shade(data_table.cell(row_index, 0), "F4F9FD")

add_paragraph(doc, "III. Instrucciones", 10, True)
add_paragraph(
    doc,
    "Estimado(a) participante: marque con una X la alternativa que mejor represente su percepcion. Si el cuestionario se aplica como preprueba, responda considerando la forma actual de gestion antes de implementar el sistema. Si se aplica como posprueba, responda considerando el sistema web con modelo de Inteligencia Artificial ya implementado. La informacion sera utilizada solo con fines academicos.",
    9,
)

scale_table = doc.add_table(rows=2, cols=5)
scale_table.style = "Table Grid"
scale_table.alignment = WD_TABLE_ALIGNMENT.CENTER
set_widths(scale_table, [1.3, 1.3, 1.3, 1.3, 1.3])
scale_numbers = ["1", "2", "3", "4", "5"]
scale_labels = [
    "Totalmente en desacuerdo",
    "En desacuerdo",
    "Ni de acuerdo ni en desacuerdo",
    "De acuerdo",
    "Totalmente de acuerdo",
]
for index, value in enumerate(scale_numbers):
    set_cell_text(scale_table.cell(0, index), value, True, 8, WD_ALIGN_PARAGRAPH.CENTER)
    shade(scale_table.cell(0, index), "D9EAF7")
for index, value in enumerate(scale_labels):
    set_cell_text(scale_table.cell(1, index), value, False, 7.5, WD_ALIGN_PARAGRAPH.CENTER)

add_paragraph(doc, "IV. Cuestionario", 10, True)

items = [
    ("D1: Modelos de prediccion del riesgo empresarial", "La herramienta o procedimiento utilizado proporciona informacion suficiente para anticipar riesgos operativos en la empresa."),
    ("D1: Modelos de prediccion del riesgo empresarial", "La herramienta o procedimiento utilizado permite identificar riesgos antes de que afecten las ventas, el inventario o los ingresos."),
    ("D1: Modelos de prediccion del riesgo empresarial", "Los resultados de prediccion disponibles son confiables para la toma de decisiones."),
    ("D1: Modelos de prediccion del riesgo empresarial", "La informacion de ventas e inventario se analiza oportunamente para apoyar la gestion del riesgo empresarial."),
    ("D1: Modelos de prediccion del riesgo empresarial", "El procesamiento de los datos de ventas e inventario se realiza con rapidez y precision."),
    ("D1: Modelos de prediccion del riesgo empresarial", "Las predicciones disponibles ayudan a planificar compras, ventas e inventario en la empresa."),
    ("D2: Exactitud y validacion del modelo predictivo del IRE", "Las estimaciones de riesgo reflejan adecuadamente la situacion real de la empresa."),
    ("D2: Exactitud y validacion del modelo predictivo del IRE", "Las estimaciones de riesgo permiten anticipar problemas de inventario, ingresos o demanda."),
    ("D2: Exactitud y validacion del modelo predictivo del IRE", "Las alertas de riesgo se generan con la anticipacion necesaria para tomar decisiones preventivas."),
    ("D2: Exactitud y validacion del modelo predictivo del IRE", "Las alertas de riesgo permiten definir acciones preventivas claras para la gestion de la empresa."),
    ("D2: Exactitud y validacion del modelo predictivo del IRE", "El error del pronostico de demanda es aceptable para apoyar la gestion del inventario."),
    ("D2: Exactitud y validacion del modelo predictivo del IRE", "La precision de la herramienta o procedimiento utilizado mejora la estimacion empirica del riesgo empresarial."),
    ("D3: Componentes del Indice de Riesgo Empresarial", "El indicador de riesgo de stock representa adecuadamente los problemas de inventario de la empresa."),
    ("D3: Componentes del Indice de Riesgo Empresarial", "El indicador de riesgo de ingresos ayuda a anticipar problemas relacionados con el flujo comercial de la empresa."),
    ("D3: Componentes del Indice de Riesgo Empresarial", "El indicador de riesgo de demanda ayuda a planificar oportunamente las compras de calzado."),
    ("D3: Componentes del Indice de Riesgo Empresarial", "La ponderacion de los componentes del IRE: stock 40 %, ingresos 35 % y demanda 25 %, es adecuada para Calzatura Vilchez."),
    ("D3: Componentes del Indice de Riesgo Empresarial", "El reporte o dashboard del IRE muestra el nivel de riesgo y sus componentes de forma clara."),
    ("D3: Componentes del Indice de Riesgo Empresarial", "La frecuencia de actualizacion del IRE es suficiente para la gestion operativa de la empresa."),
    ("D4: Impacto del sistema en la gestion operativa", "La gestion basada en prediccion de riesgo contribuye a reducir los quiebres de stock."),
    ("D4: Impacto del sistema en la gestion operativa", "La informacion de riesgo disponible mejora la planificacion de pedidos a proveedores."),
    ("D4: Impacto del sistema en la gestion operativa", "La digitalizacion de los procesos de venta mejora la eficiencia operativa de la empresa."),
    ("D4: Impacto del sistema en la gestion operativa", "La informacion generada ayuda a reducir inventario inmovilizado u obsoleto."),
    ("D4: Impacto del sistema en la gestion operativa", "La mejora en ventas, inventario y atencion contribuye a elevar la satisfaccion de los clientes."),
    ("D4: Impacto del sistema en la gestion operativa", "En general, la herramienta o procedimiento utilizado mejora la gestion del riesgo empresarial en Calzatura Vilchez."),
]

questionnaire = doc.add_table(rows=len(items) + 1, cols=8)
questionnaire.style = "Table Grid"
questionnaire.alignment = WD_TABLE_ALIGNMENT.CENTER
set_widths(questionnaire, [0.35, 1.6, 3.35, 0.35, 0.35, 0.35, 0.35, 0.35])
headers = ["N", "Dimension", "Item", "1", "2", "3", "4", "5"]
for col_index, header in enumerate(headers):
    set_cell_text(questionnaire.cell(0, col_index), header, True, 7.3, WD_ALIGN_PARAGRAPH.CENTER)
    shade(questionnaire.cell(0, col_index), "D9EAF7")

for row_index, (dimension, item) in enumerate(items, start=1):
    values = [str(row_index), dimension, item, "[  ]", "[  ]", "[  ]", "[  ]", "[  ]"]
    for col_index, value in enumerate(values):
        align = WD_ALIGN_PARAGRAPH.CENTER if col_index in [0, 3, 4, 5, 6, 7] else WD_ALIGN_PARAGRAPH.JUSTIFY
        set_cell_text(questionnaire.cell(row_index, col_index), value, False, 6.7, align)
        if row_index <= 6:
            shade(questionnaire.cell(row_index, col_index), "F4F9FD")
        elif row_index <= 12:
            shade(questionnaire.cell(row_index, col_index), "FFF9EE")
        elif row_index <= 18:
            shade(questionnaire.cell(row_index, col_index), "F6F7F2")
        else:
            shade(questionnaire.cell(row_index, col_index), "FDF4F4")

add_paragraph(doc, "V. Observaciones", 10, True)
for _ in range(3):
    add_paragraph(doc, "______________________________________________________________________________________________", 9)

add_paragraph(doc, "Gracias por su colaboracion.", 9, True, WD_ALIGN_PARAGRAPH.CENTER)

doc.save(OUT)
print(OUT)
