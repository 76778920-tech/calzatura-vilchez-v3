#!/usr/bin/env python3
"""
Genera estado_del_arte.pdf con tablas en formato del profesor:
 - Celdas fusionadas verticalmente para Variable, Dimensión e Instrumentos
 - Cada indicador en su propia fila
 - Encabezado azul claro para matrices individuales
 - Encabezado morado oscuro para la matriz fusionada
"""
import re
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer,
    Table, TableStyle, HRFlowable, PageBreak,
)
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# ─── Fuentes ──────────────────────────────────────────────────────────────────

def setup_fonts():
    base = 'C:/Windows/Fonts/'
    try:
        pdfmetrics.registerFont(TTFont('F',   base + 'arial.ttf'))
        pdfmetrics.registerFont(TTFont('FB',  base + 'arialbd.ttf'))
        pdfmetrics.registerFont(TTFont('FI',  base + 'ariali.ttf'))
        pdfmetrics.registerFont(TTFont('FBI', base + 'arialbi.ttf'))
        pdfmetrics.registerFontFamily('F', normal='F', bold='FB',
                                       italic='FI', boldItalic='FBI')
        return 'F', 'FB', 'FI'
    except Exception as e:
        print(f'Arial no disponible, usando Helvetica ({e})')
        return 'Helvetica', 'Helvetica-Bold', 'Helvetica-Oblique'


FN, FB, FI = setup_fonts()

# Paleta
C_DARK   = colors.HexColor('#1a1a2e')
C_BLUE   = colors.HexColor('#2c3e50')
C_GRID   = colors.HexColor('#aaaaaa')
C_GRID2  = colors.HexColor('#999999')
# Encabezados de matrices
C_MAT_IND  = colors.HexColor('#7aade0')   # azul claro — matrices individuales
C_MAT_FUSE = colors.HexColor('#4527a0')   # morado oscuro — matriz fusionada
C_ROW_ALT  = colors.HexColor('#f0f4f8')


# ─── Estilos de texto ─────────────────────────────────────────────────────────

def make_styles():
    def ps(name, **kw):
        return ParagraphStyle(name, **kw)
    return {
        'DocTitle': ps('DocTitle', fontName=FB, fontSize=18, alignment=TA_CENTER,
            spaceAfter=4, textColor=C_DARK, leading=22),
        'DocSub': ps('DocSub', fontName=FN, fontSize=10, alignment=TA_CENTER,
            spaceAfter=2, textColor=colors.HexColor('#555'), leading=14),
        'ArtHeader': ps('ArtHeader', fontName=FB, fontSize=14,
            textColor=colors.white, alignment=TA_LEFT, leading=18),
        'H3': ps('H3', fontName=FB, fontSize=11, spaceAfter=4, spaceBefore=10,
            textColor=C_BLUE, leading=14),
        'BibLine': ps('BibLine', fontName=FN, fontSize=10, spaceAfter=2,
            spaceBefore=1, textColor=colors.HexColor('#222'), leading=14),
        'SectionHead': ps('SectionHead', fontName=FB, fontSize=10,
            spaceAfter=3, spaceBefore=10, textColor=C_BLUE, leading=13),
        'Body': ps('Body', fontName=FN, fontSize=10, alignment=TA_JUSTIFY,
            spaceAfter=5, spaceBefore=1, leading=14, textColor=colors.HexColor('#333')),
        'Bullet': ps('Bullet', fontName=FN, fontSize=10, alignment=TA_LEFT,
            spaceAfter=2, spaceBefore=1, leading=14, leftIndent=14,
            textColor=colors.HexColor('#333')),
        'TH': ps('TH', fontName=FB, fontSize=9, alignment=TA_CENTER,
            textColor=colors.white, leading=12),
        'TC': ps('TC', fontName=FN, fontSize=8.5, alignment=TA_LEFT,
            leading=12, textColor=colors.HexColor('#222')),
    }


# ─── Helpers de texto ─────────────────────────────────────────────────────────

def esc(t):
    return t.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')

def inline(t):
    t = esc(t)
    t = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', t)
    t = re.sub(r'(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)', r'<i>\1</i>', t)
    return t


# ─── Tablas normales ──────────────────────────────────────────────────────────

def parse_table(lines):
    rows = []
    for ln in lines:
        s = ln.strip()
        if not s.startswith('|'):
            continue
        if re.match(r'^\|[\s\-|:]+\|$', s):
            continue
        cells = [c.strip() for c in s.strip('|').split('|')]
        rows.append(cells)
    return rows


def build_regular_table(rows, st):
    if not rows:
        return None
    n = max(len(r) for r in rows)
    rows = [r + [''] * (n - len(r)) for r in rows]
    data = []
    for idx, row in enumerate(rows):
        if idx == 0:
            data.append([Paragraph(inline(c), st['TH']) for c in row])
        else:
            data.append([Paragraph(inline(c), st['TC']) for c in row])
    aw = 15.6 * cm
    if n == 4:
        ws = [3.7*cm, 3.2*cm, 5.2*cm, 3.5*cm]
    elif n == 5:
        ws = [2.8*cm, 2.8*cm, 3.8*cm, 3.4*cm, 2.8*cm]
    else:
        ws = [aw / n] * n
    total = sum(ws)
    if total > aw:
        ws = [w * aw / total for w in ws]
    t = Table(data, colWidths=ws, repeatRows=1, hAlign='LEFT')
    ts = [
        ('BACKGROUND', (0, 0), (-1, 0), C_BLUE),
        ('TEXTCOLOR',  (0, 0), (-1, 0), colors.white),
        ('LINEBELOW',  (0, 0), (-1, 0), 1.5, C_DARK),
        ('GRID',       (0, 0), (-1, -1), 0.4, C_GRID),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]
    for r in range(1, len(data)):
        if r % 2 == 0:
            ts.append(('BACKGROUND', (0, r), (-1, r), C_ROW_ALT))
    t.setStyle(TableStyle(ts))
    return t


# ─── Tablas de operacionalización (formato profesor) ──────────────────────────

def is_op_table(rows):
    """Detecta tabla Variable | Dimensiones | Indicadores | Instrumentos."""
    if not rows:
        return False
    h = [c.lower() for c in rows[0]]
    return (any('variable' in x for x in h) and
            any('indicador' in x for x in h) and
            any('instrumento' in x for x in h))


def parse_var_type(raw):
    """Devuelve (tipo_label, nombre) según (VI), (VD), (VM) en el texto."""
    raw = raw.strip()
    if '(VI)' in raw:
        return 'Variable independiente:', raw.replace('(VI)', '').strip().strip(',').strip()
    if '(VD)' in raw:
        return 'Variable dependiente:', raw.replace('(VD)', '').strip().strip(',').strip()
    if '(VM)' in raw:
        return 'Variable moderadora:', raw.replace('(VM)', '').strip().strip(',').strip()
    # If no tag but has keywords
    rl = raw.lower()
    if 'independiente' in rl:
        name = re.sub(r'variable\s+independiente\s*:?\s*', '', raw, flags=re.I).strip()
        return 'Variable independiente:', name
    if 'dependiente' in rl:
        name = re.sub(r'variable\s+dependiente\s*:?\s*', '', raw, flags=re.I).strip()
        return 'Variable dependiente:', name
    return '', raw


def split_indicators(text):
    """
    Divide indicadores separados por punto y coma ';' o por coma + mayúscula
    al inicio de un nuevo concepto independiente.
    Devuelve lista de strings.
    """
    # Primero intentar split por ;
    if ';' in text:
        parts = [p.strip() for p in text.split(';') if p.strip()]
        if len(parts) > 1:
            return parts
    # Split por coma + mayúscula solo si la parte resultante es corta (<=6 palabras)
    # y la parte anterior también es corta
    candidates = re.split(r',\s+', text)
    if len(candidates) <= 1:
        return [text]
    # Agrupar candidatos: si un candidato empieza con minúscula o es muy corto
    # y el anterior no terminó como concepto completo → concatenar
    result = []
    current = candidates[0]
    for c in candidates[1:]:
        # Si empieza con minúscula → es continuación del anterior
        if c and c[0].islower():
            current = current + ', ' + c
        # Si el acumulado actual ya tiene >= 4 palabras y el candidato empieza mayúscula
        # y tiene >= 2 palabras → nuevo indicador
        elif len(current.split()) >= 3 and c and c[0].isupper() and len(c.split()) >= 2:
            result.append(current.strip())
            current = c
        else:
            current = current + ', ' + c
    result.append(current.strip())
    return [r for r in result if r]


def calc_spans(keys):
    """Calcula {índice_inicio: cantidad} para grupos de claves consecutivas iguales."""
    spans = {}
    n = len(keys)
    if n == 0:
        return spans
    start = 0
    prev = keys[0]
    for i in range(1, n):
        if keys[i] != prev:
            spans[start] = i - start
            prev = keys[i]
            start = i
    spans[start] = n - start
    return spans


def build_op_table(rows, header_color, white_header_text=True):
    """
    Construye tabla con celdas fusionadas en el formato del profesor:
    Variable (fusionada) | Dimensión (fusionada) | Indicador (1 por fila) | Instrumento (fusionado)
    """
    if not rows or len(rows) < 2:
        return None

    header = rows[0]
    data_raw = rows[1:]

    # Estilos internos de la tabla
    h_color = colors.white if white_header_text else colors.black
    th_s = ParagraphStyle('OTH', fontName=FB, fontSize=9.5,
        alignment=TA_CENTER, textColor=h_color, leading=13)
    var_s = ParagraphStyle('OVar', fontName=FN, fontSize=9.5,
        alignment=TA_LEFT, leading=14, textColor=colors.HexColor('#111'))
    dim_s = ParagraphStyle('ODim', fontName=FN, fontSize=9.5,
        alignment=TA_LEFT, leading=14, textColor=colors.HexColor('#333'))
    ind_s = ParagraphStyle('OInd', fontName=FN, fontSize=9,
        alignment=TA_LEFT, leading=13, textColor=colors.HexColor('#333'))
    inst_s = ParagraphStyle('OInst', fontName=FN, fontSize=9,
        alignment=TA_LEFT, leading=13, textColor=colors.HexColor('#333'))
    emp_s = ParagraphStyle('OEmp', fontName=FN, fontSize=9, leading=13)

    # ── Expandir filas: 1 indicador por fila ──────────────────────────────────
    expanded = []  # lista de dict con: vtype, vname, var_key, dim, ind, inst
    for row in data_raw:
        if len(row) < 4:
            continue
        vtype, vname = parse_var_type(row[0])
        dim  = row[1].strip()
        inds = split_indicators(row[2].strip())
        inst = row[3].strip()
        var_key = (vtype, vname)
        for ind in inds:
            expanded.append({
                'vtype': vtype, 'vname': vname, 'var_key': var_key,
                'dim': dim, 'ind': ind, 'inst': inst,
            })

    if not expanded:
        return None

    n = len(expanded)

    # ── Calcular fusiones ─────────────────────────────────────────────────────
    # Variable: fusionar filas consecutivas con mismo (vtype, vname)
    var_keys  = [p['var_key'] for p in expanded]
    # Dimensión: fusionar filas consecutivas con mismo (var_key, dim)
    dim_keys  = [(p['var_key'], p['dim']) for p in expanded]
    # Instrumento: fusionar filas consecutivas con mismo inst
    inst_keys = [p['inst'] for p in expanded]

    var_spans  = calc_spans(var_keys)
    dim_spans  = calc_spans(dim_keys)
    inst_spans = calc_spans(inst_keys)

    # ── Construir datos de la tabla ───────────────────────────────────────────
    tdata = [[Paragraph(inline(h), th_s) for h in header]]

    for i, p in enumerate(expanded):
        # Columna 0 — Variable
        if i in var_spans:
            if p['vtype']:
                vc = Paragraph(
                    f'<b>{esc(p["vtype"])}</b><br/><br/>{esc(p["vname"])}',
                    var_s)
            else:
                vc = Paragraph(esc(p['vname']), var_s)
        else:
            vc = Paragraph('', emp_s)

        # Columna 1 — Dimensión
        dc = Paragraph(esc(p['dim']), dim_s) if i in dim_spans else Paragraph('', emp_s)

        # Columna 2 — Indicador (siempre visible)
        ic = Paragraph(inline(p['ind']), ind_s)

        # Columna 3 — Instrumento
        instc = Paragraph(inline(p['inst']), inst_s) if i in inst_spans else Paragraph('', emp_s)

        tdata.append([vc, dc, ic, instc])

    # ── Crear tabla reportlab ─────────────────────────────────────────────────
    # Total ≤ 15.6 cm (page 21cm – 2×2.5cm margins = 16cm, menos buffer)
    col_widths = [3.9*cm, 3.3*cm, 5.1*cm, 3.3*cm]
    t = Table(tdata, colWidths=col_widths, repeatRows=1, hAlign='LEFT')

    ts_cmds = [
        # Encabezado
        ('BACKGROUND',    (0, 0), (-1, 0), header_color),
        ('TEXTCOLOR',     (0, 0), (-1, 0), h_color),
        ('ALIGN',         (0, 0), (-1, 0), 'CENTER'),
        ('FONTNAME',      (0, 0), (-1, 0), FB),
        ('FONTSIZE',      (0, 0), (-1, 0), 9.5),
        # Cuerpo
        ('BACKGROUND',    (0, 1), (-1, -1), colors.white),
        # Grilla
        ('GRID',          (0, 0), (-1, -1), 0.5, colors.HexColor('#999')),
        ('LINEBELOW',     (0, 0), (-1, 0),  2.0, colors.HexColor('#444')),
        # Alineación y padding
        ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING',    (0, 0), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
        ('LEFTPADDING',   (0, 0), (-1, -1), 7),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 7),
    ]

    # SPANs columna Variable (col 0)
    for start, count in var_spans.items():
        r0 = start + 1   # offset por encabezado
        r1 = start + count  # inclusive en reportlab SPAN
        if count > 1:
            ts_cmds.append(('SPAN', (0, r0), (0, r1)))
            ts_cmds.append(('VALIGN', (0, r0), (0, r1), 'MIDDLE'))
        # Línea gruesa al final del grupo de variable
        if start + count < n:
            border_r = start + count  # fila siguiente al grupo (0-idx en datos)
            ts_cmds.append(('LINEBELOW', (0, border_r), (-1, border_r),
                            2.0, colors.HexColor('#333')))

    # SPANs columna Dimensión (col 1)
    for start, count in dim_spans.items():
        if count > 1:
            ts_cmds.append(('SPAN', (1, start+1), (1, start+count)))
            ts_cmds.append(('VALIGN', (1, start+1), (1, start+count), 'MIDDLE'))

    # SPANs columna Instrumento (col 3)
    for start, count in inst_spans.items():
        if count > 1:
            ts_cmds.append(('SPAN', (3, start+1), (3, start+count)))
            ts_cmds.append(('VALIGN', (3, start+1), (3, start+count), 'MIDDLE'))

    t.setStyle(TableStyle(ts_cmds))
    return t


# ─── Encabezado/pie de página ────────────────────────────────────────────────

def on_page(canvas, doc):
    canvas.saveState()
    w, h = A4
    canvas.setStrokeColor(C_BLUE)
    canvas.setLineWidth(0.8)
    canvas.line(2.5*cm, h - 1.8*cm, w - 2.5*cm, h - 1.8*cm)
    canvas.setFont(FN, 8)
    canvas.setFillColor(colors.HexColor('#666'))
    pg = canvas.getPageNumber()
    canvas.drawCentredString(w / 2, 1.2*cm,
        f'Estado del Arte — Calzatura Vilchez   |   Página {pg}')
    canvas.setStrokeColor(C_GRID)
    canvas.setLineWidth(0.4)
    canvas.line(2.5*cm, 1.8*cm, w - 2.5*cm, 1.8*cm)
    canvas.restoreState()


# ─── Parser de markdown ───────────────────────────────────────────────────────

def parse(content, st):
    story = []
    lines = content.split('\n')
    i = 0
    in_fused = False  # flag: estamos en la sección de matriz fusionada

    while i < len(lines):
        raw = lines[i]
        ln  = raw.strip()

        # H1
        if ln.startswith('# ') and not ln.startswith('## '):
            story.append(Spacer(1, 0.3*cm))
            story.append(Paragraph(inline(ln[2:]), st['DocTitle']))
            story.append(HRFlowable(width='100%', thickness=2, color=C_DARK, spaceAfter=4))
            i += 1
            continue

        # H2 — artículo o sección
        if ln.startswith('## ') and not ln.startswith('### '):
            txt = inline(ln[3:])
            # Detectar si entramos a la sección de matriz fusionada
            if 'FUSIONADA' in ln.upper() or 'FUSIONADO' in ln.upper():
                in_fused = True
            story.append(PageBreak())
            hd = [[Paragraph(txt, st['ArtHeader'])]]
            ht = Table(hd, colWidths=[16.5*cm])
            ht.setStyle(TableStyle([
                ('BACKGROUND',    (0,0), (-1,-1), C_BLUE),
                ('TOPPADDING',    (0,0), (-1,-1), 9),
                ('BOTTOMPADDING', (0,0), (-1,-1), 9),
                ('LEFTPADDING',   (0,0), (-1,-1), 12),
                ('RIGHTPADDING',  (0,0), (-1,-1), 12),
            ]))
            story.append(ht)
            story.append(Spacer(1, 0.35*cm))
            i += 1
            continue

        # H3
        if ln.startswith('### '):
            story.append(Spacer(1, 0.4*cm))
            story.append(Paragraph(inline(ln[4:]), st['H3']))
            story.append(HRFlowable(width='100%', thickness=0.5, color=C_GRID, spaceAfter=4))
            i += 1
            continue

        # Regla horizontal ---
        if re.match(r'^-{3,}$', ln):
            story.append(HRFlowable(width='100%', thickness=0.5, color=C_GRID,
                                    spaceBefore=4, spaceAfter=4))
            i += 1
            continue

        # ── Tabla markdown ──────────────────────────────────────────────────
        if ln.startswith('|'):
            tbl_lines = []
            while i < len(lines) and lines[i].strip().startswith('|'):
                tbl_lines.append(lines[i])
                i += 1
            rows = parse_table(tbl_lines)
            if rows:
                story.append(Spacer(1, 0.15*cm))
                if is_op_table(rows):
                    # Tabla de operacionalización → formato profesor
                    h_color = C_MAT_FUSE if in_fused else C_MAT_IND
                    white_txt = True  # ambos colores usan texto blanco
                    t = build_op_table(rows, h_color, white_txt)
                else:
                    # Tabla regular (índice, etc.)
                    t = build_regular_table(rows, st)
                if t:
                    story.append(t)
                    story.append(Spacer(1, 0.3*cm))
            continue

        # Lista con viñeta
        if ln.startswith('- '):
            story.append(Paragraph(f'• {inline(ln[2:])}', st['Bullet']))
            i += 1
            continue

        # Lista numerada
        m = re.match(r'^(\d+)\.\s+(.+)', ln)
        if m:
            story.append(Paragraph(f'{m.group(1)}. {inline(m.group(2))}', st['Bullet']))
            i += 1
            continue

        # Línea completamente en **negrita** (cabecera de sección numerada)
        if re.match(r'^\*\*.+\*\*$', ln) and not re.search(r'\*\*[^*]+\*\*[^*]+\*\*', ln):
            clean = re.sub(r'\*\*(.+?)\*\*', r'\1', ln)
            # Matriz de operacionalización → mini-header azul destacado
            if 'Matriz' in clean or 'MATRIZ' in clean or 'EJE' in clean:
                story.append(Spacer(1, 0.4*cm))
                lbl = [[Paragraph(esc(clean),
                    ParagraphStyle('MatLbl', fontName=FB, fontSize=10,
                        textColor=colors.white, leading=14))]]
                lt = Table(lbl, colWidths=[15.6*cm])
                lt.setStyle(TableStyle([
                    ('BACKGROUND',    (0,0),(-1,-1), colors.HexColor('#34495e')),
                    ('TOPPADDING',    (0,0),(-1,-1), 6),
                    ('BOTTOMPADDING', (0,0),(-1,-1), 6),
                    ('LEFTPADDING',   (0,0),(-1,-1), 10),
                    ('RIGHTPADDING',  (0,0),(-1,-1), 10),
                ]))
                story.append(lt)
            else:
                story.append(Spacer(1, 0.15*cm))
                story.append(Paragraph(inline(ln), st['SectionHead']))
            i += 1
            continue

        # Línea bibliográfica **Campo:** valor
        if re.match(r'^\*\*[^*]+:\*\*', ln):
            story.append(Paragraph(inline(ln), st['BibLine']))
            i += 1
            continue

        # Línea vacía
        if ln == '':
            story.append(Spacer(1, 0.08*cm))
            i += 1
            continue

        # Párrafo normal
        txt = inline(ln)
        if txt:
            story.append(Paragraph(txt, st['Body']))
        i += 1

    return story


# ─── Portada ──────────────────────────────────────────────────────────────────

def cover_page():
    items = [Spacer(1, 5*cm)]
    box = [[Paragraph('ESTADO DEL ARTE',
        ParagraphStyle('CP', fontName=FB, fontSize=22, textColor=colors.white,
                       alignment=TA_CENTER, leading=26))]]
    bt = Table(box, colWidths=[16.5*cm])
    bt.setStyle(TableStyle([
        ('BACKGROUND',    (0,0), (-1,-1), C_DARK),
        ('TOPPADDING',    (0,0), (-1,-1), 18),
        ('BOTTOMPADDING', (0,0), (-1,-1), 18),
    ]))
    items.append(bt)
    items.append(Spacer(1, 0.5*cm))
    items.append(Paragraph('20 Artículos Científicos Q1',
        ParagraphStyle('CP2', fontName=FB, fontSize=15, textColor=C_BLUE,
                       alignment=TA_CENTER, leading=20)))
    items.append(Spacer(1, 0.4*cm))
    items.append(HRFlowable(width='100%', thickness=1.5, color=C_BLUE))
    items.append(Spacer(1, 0.6*cm))
    items.append(Paragraph(
        '<b>Tesis:</b> Sistema web de comercio electrónico con modelo de<br/>'
        'Inteligencia Artificial para la predicción del riesgo empresarial<br/>'
        'en la empresa Calzatura Vilchez',
        ParagraphStyle('CP3', fontName=FN, fontSize=12, textColor=C_DARK,
                       alignment=TA_CENTER, leading=18)))
    items.append(Spacer(1, 0.5*cm))
    items.append(Paragraph('<b>Asesor:</b> Dr. Maglioni Arana Caparachin',
        ParagraphStyle('CP4', fontName=FN, fontSize=11, textColor=colors.HexColor('#555'),
                       alignment=TA_CENTER, leading=16)))
    items.append(Spacer(1, 1.5*cm))
    items.append(HRFlowable(width='60%', thickness=0.5, color=C_GRID))
    items.append(Spacer(1, 0.4*cm))
    items.append(Paragraph('2026',
        ParagraphStyle('CP5', fontName=FN, fontSize=11, textColor=colors.HexColor('#555'),
                       alignment=TA_CENTER)))
    items.append(PageBreak())
    return items


# ─── Índice ───────────────────────────────────────────────────────────────────

ARTICLES = [
    ("1",  "Gefen, Karahanna & Straub (2003)",             "Trust and TAM in Online Shopping",                         "MIS Quarterly"),
    ("2",  "Pavlou & Fygenson (2006)",                     "Understanding and Predicting E-Commerce Adoption",         "MIS Quarterly"),
    ("3",  "Liang & Turban (2011)",                        "Social Commerce: A Research Framework",                    "Int. J. Electronic Commerce"),
    ("4",  "Hajli (2015)",                                 "Social Commerce Constructs and Consumer's Intention",      "Int. J. Information Management"),
    ("5",  "Chen, Chiang & Storey (2012)",                 "Business Intelligence and Analytics",                      "MIS Quarterly"),
    ("6",  "Makridakis, Spiliotis & Assimakopoulos (2018)","Statistical and ML Forecasting Methods",                  "PLOS ONE"),
    ("7",  "Fischer & Krauss (2018)",                      "Deep Learning with LSTM for Financial Time Series",        "European J. Operational Research"),
    ("8",  "Hochreiter & Schmidhuber (1997)",              "Long Short-Term Memory",                                   "Neural Computation"),
    ("9",  "Breiman (2001)",                               "Random Forests",                                           "Machine Learning"),
    ("10", "LeCun, Bengio & Hinton (2015)",                "Deep Learning",                                            "Nature"),
    ("11", "Ozbayoglu, Gudelek & Sezer (2020)",            "Deep Learning for Financial Applications: A Survey",       "Applied Soft Computing"),
    ("12", "Fildes, Ma & Kolassa (2022)",                  "Retail Forecasting: Research and Practice",                "Int. J. Forecasting"),
    ("13", "Altman (1968)",                                "Financial Ratios and Prediction of Bankruptcy",            "Journal of Finance"),
    ("14", "Ohlson (1980)",                                "Financial Ratios and Probabilistic Prediction of Bankruptcy","J. Accounting Research"),
    ("15", "Beaver (1966)",                                "Financial Ratios as Predictors of Failure",                "J. Accounting Research"),
    ("16", "Tian, Yu & Guo (2015)",                       "Variable Selection and Corporate Bankruptcy Forecasts",    "J. Banking & Finance"),
    ("17", "Wang, Ma, Huang & Xu (2012)",                  "Two Credit Scoring Models Based on Dual Strategy Ensemble","Knowledge-Based Systems"),
    ("18", "Vial (2019)",                                  "Understanding Digital Transformation",                     "J. Strategic Information Systems"),
    ("19", "Nambisan (2017)",                              "Digital Entrepreneurship",                                 "Entrepreneurship Theory and Practice"),
    ("20", "Bharadwaj, El Sawy, Pavlou & Venkatraman (2013)","Digital Business Strategy",                             "MIS Quarterly"),
]


def index_page(st):
    items = []
    items.append(Paragraph('ÍNDICE DE ARTÍCULOS',
        ParagraphStyle('IdxT', fontName=FB, fontSize=14, textColor=C_DARK,
                       alignment=TA_CENTER, spaceAfter=12, leading=18)))
    items.append(HRFlowable(width='100%', thickness=1.5, color=C_BLUE, spaceAfter=10))
    hdr = [Paragraph(h, st['TH']) for h in ['#', 'Autores', 'Título', 'Revista']]
    rows = [hdr]
    for num, authors, title, journal in ARTICLES:
        rows.append([Paragraph(x, st['TC']) for x in [num, authors, title, journal]])
    t = Table(rows, colWidths=[0.8*cm, 4.5*cm, 7.0*cm, 4.2*cm], repeatRows=1)
    ts = [
        ('BACKGROUND',    (0, 0), (-1, 0), C_BLUE),
        ('TEXTCOLOR',     (0, 0), (-1, 0), colors.white),
        ('LINEBELOW',     (0, 0), (-1, 0), 1.5, C_DARK),
        ('GRID',          (0, 0), (-1, -1), 0.4, C_GRID),
        ('TOPPADDING',    (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING',   (0, 0), (-1, -1), 5),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 5),
        ('VALIGN',        (0, 0), (-1, -1), 'TOP'),
    ]
    for r in range(1, len(rows)):
        if r % 2 == 0:
            ts.append(('BACKGROUND', (0, r), (-1, r), C_ROW_ALT))
    t.setStyle(TableStyle(ts))
    items.append(t)
    items.append(PageBreak())
    return items


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    inp = r'c:\Cazatura Vilchez V3\estado_del_arte.md'
    out = r'c:\Cazatura Vilchez V3\estado_del_arte.pdf'

    print('Leyendo markdown...')
    with open(inp, 'r', encoding='utf-8') as f:
        content = f.read()

    print('Configurando estilos...')
    st = make_styles()

    print('Construyendo documento...')
    story = []
    story += cover_page()
    story += index_page(st)
    story += parse(content, st)

    print('Generando PDF...')
    doc = SimpleDocTemplate(
        out, pagesize=A4,
        rightMargin=2.5*cm, leftMargin=2.5*cm,
        topMargin=2.4*cm,   bottomMargin=2.4*cm,
        title='Estado del Arte — 20 Artículos Q1',
        author='Calzatura Vilchez',
        subject='Sistema web e-commerce con IA — Predicción del riesgo empresarial',
    )
    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
    print(f'\nPDF listo: {out}')


if __name__ == '__main__':
    main()
