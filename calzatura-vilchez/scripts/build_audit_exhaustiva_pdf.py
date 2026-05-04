"""
Genera docs/AUDITORIA-EXHAUSTIVA-2026-05.pdf desde el markdown homónimo.
Usa solo Preformatted + Courier (sin mini-HTML en Paragraph) para maximizar compatibilidad con lectores PDF.

Requiere: pip install reportlab
Ejecutar desde la raíz del proyecto: python scripts/build_audit_exhaustiva_pdf.py
"""
from __future__ import annotations

import re
from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import Preformatted, SimpleDocTemplate, Spacer

ROOT = Path(__file__).resolve().parents[1]
MD_PATH = ROOT / "docs" / "AUDITORIA-EXHAUSTIVA-2026-05.md"
OUT_PATH = ROOT / "docs" / "AUDITORIA-EXHAUSTIVA-2026-05.pdf"


def strip_md(s: str) -> str:
    s = re.sub(r"\*\*(.+?)\*\*", r"\1", s)
    s = re.sub(r"`([^`]+)`", r"\1", s)
    s = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", s)
    return s


def main() -> None:
    text = MD_PATH.read_text(encoding="utf-8")
    # Courier + tamaño fijo: evita parsers XML de Paragraph que rompen algunos visores.
    mono = ParagraphStyle(
        name="Mono",
        fontName="Courier",
        fontSize=8,
        leading=10,
        spaceAfter=2,
    )
    title_style = ParagraphStyle(
        name="TitleMono",
        fontName="Courier-Bold",
        fontSize=11,
        leading=14,
        spaceAfter=8,
    )

    story: list = []
    story.append(Preformatted("AUDITORIA EXHAUSTIVA — Calzatura Vilchez (web)", title_style, maxLineLength=90))
    story.append(Spacer(1, 0.25 * cm))

    for raw_line in text.splitlines():
        line = raw_line.rstrip()
        if not line:
            story.append(Spacer(1, 0.12 * cm))
            continue
        if line.strip() == "---":
            story.append(Preformatted("-" * 72, mono, maxLineLength=90))
            continue
        plain = strip_md(line)
        if len(plain) > 500:
            plain = plain[:497] + "..."
        story.append(Preformatted(plain, mono, maxLineLength=96))

    doc = SimpleDocTemplate(
        str(OUT_PATH),
        pagesize=A4,
        leftMargin=1.8 * cm,
        rightMargin=1.8 * cm,
        topMargin=1.8 * cm,
        bottomMargin=1.8 * cm,
    )
    doc.build(story)
    print(f"OK: {OUT_PATH}")


if __name__ == "__main__":
    main()
