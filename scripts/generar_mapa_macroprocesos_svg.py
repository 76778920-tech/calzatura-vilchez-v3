#!/usr/bin/env python3
"""
Genera mapa de macroprocesos SVG alineado a MP-01..MP-16 (Gobierno IA V3 / CU-T02).
Corregido vs mapa descargas: 42 procesos, 16 macroprocesos, web v1.9.0.

Uso: python scripts/generar_mapa_macroprocesos_svg.py
"""
from __future__ import annotations

from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "artifacts/diagramas/mapa_macroprocesos_calzatura_vilchez.svg"
OUT_DOCS = ROOT / "documentacion/diagramas/mapa_macroprocesos_calzatura_vilchez.svg"

WEB_VERSION = "1.9.0"
REVISION = "2"
EMISION = date.today().isoformat().replace("-", "/")
CODIGO = "CV-MP-001"

# MP-01..MP-16 — fuente: scripts/generar_gobierno_ia_v3.py
MACRO = [
    ("MP-01", "Estratégico", "Dirección comercial y alcance del sistema", "SRS · alcance · stakeholders"),
    ("MP-02", "Misional", "Experiencia pública y captación digital", "Home · tiendas · landings"),
    ("MP-03", "Misional", "Gestión del catálogo comercial", "Filtros · detalle · variantes · imágenes"),
    ("MP-04", "Misional", "Carrito y compra web", "Carrito · checkout · entrega · Stripe/COD"),
    ("MP-05", "Misional", "Pedidos y posventa", "Estados · historial · mapa admin · PKCS#7"),
    ("MP-06", "Misional", "Identidad, clientes y privacidad", "Registro · login · perfil · favoritos · DNI"),
    ("MP-07", "Misional", "Administración comercial", "Dashboard · productos · stock · finanzas"),
    ("MP-08", "Misional", "Ventas físicas y tienda", "Ventas diarias · devoluciones · panel staff"),
    ("MP-09", "Apoyo", "Datos Excel importación/exportación", "Plantillas xlsx · reglas · escenarios"),
    ("MP-10", "Apoyo", "Seguridad, auditoría y cumplimiento", "RLS · BFF · ZAP · App Check · rate limit"),
    ("MP-11", "Apoyo", "Base de datos Supabase", "Migraciones · RLS matrix · hardening"),
    ("MP-12", "Misional", "Analítica, IA e IRE", "Random Forest · IRE · campañas · backtest"),
    ("MP-13", "Apoyo", "DevOps, pruebas y continuidad", "CI/CD · Sonar · k6 · restore drill"),
    ("MP-14", "Misional", "Campañas y marketing digital", "Landings · detección IA · KPIs"),
    ("MP-15", "Apoyo", "Libro de reclamaciones", "Ley 29571 · virtual · notificaciones"),
    ("MP-16", "Apoyo", "Legal, cookies y privacidad", "Ley 29733 · términos · consentimiento"),
]

BANDS = [
    ("MACROPROCESOS ESTRATÉGICOS", "#1a3a5c", "#2e6da4", ["MP-01"]),
    (
        "MACROPROCESOS MISIONALES — Cadena de valor digital (cliente)",
        "#4a6741",
        "#607c57",
        ["MP-02", "MP-03", "MP-06", "MP-04", "MP-05", "MP-14"],
    ),
    (
        "MACROPROCESOS MISIONALES — Operación de tienda",
        "#4a6741",
        "#607c57",
        ["MP-08"],
    ),
    (
        "MACROPROCESOS DE APOYO",
        "#6b2737",
        "#8c3b4e",
        ["MP-07", "MP-09", "MP-15", "MP-16"],
    ),
    (
        "MACROPROCESOS TECNOLÓGICOS Y DE PLATAFORMA",
        "#8b5e00",
        "#b07800",
        ["MP-10", "MP-11", "MP-12", "MP-13"],
    ),
]


def esc(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def box(x: float, y: float, w: float, h: float, fill: str, lines: list[str], title: str) -> str:
    parts = [
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="6" fill="{fill}" stroke="#333" stroke-width="0.6"/>',
        f'<text x="{x + w/2}" y="{y + 14}" text-anchor="middle" fill="white" font-size="9" font-weight="bold">{esc(title)}</text>',
    ]
    ty = y + 28
    for line in lines:
        parts.append(
            f'<text x="{x + w/2}" y="{ty}" text-anchor="middle" fill="#f5f5f5" font-size="7.5">{esc(line)}</text>'
        )
        ty += 11
    return "\n".join(parts)


def build_svg() -> str:
    w, h = 1200, 920
    mp_by_id = {m[0]: m for m in MACRO}
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" role="img" font-family="Arial, sans-serif">',
        f"<title>Mapa de Macroprocesos — Calzatura Vilchez (MP-01..MP-16)</title>",
        f"<desc>16 macroprocesos, 42 procesos funcionales, sistema web e-commerce + IA v{WEB_VERSION}</desc>",
        f'<rect width="{w}" height="{h}" fill="#f4f6f9"/>',
        # Header
        f'<rect x="0" y="0" width="{w}" height="54" fill="#1a2e4a"/>',
        f'<text x="{w/2}" y="34" text-anchor="middle" fill="white" font-size="22" font-weight="bold">Mapa de Macroprocesos</text>',
        f'<text x="{w/2}" y="48" text-anchor="middle" fill="#90b8d8" font-size="11">Sistema Web E-Commerce + IA · Calzatura Vilchez · Web {WEB_VERSION}</text>',
        # Ficha
        f'<rect x="30" y="62" width="{w-60}" height="38" fill="white" stroke="#ccc"/>',
        f'<text x="200" y="77" text-anchor="middle" font-size="10" font-weight="bold" fill="#1a2e4a">MAPA DE MACROPROCESOS — CALZATURA VILCHEZ</text>',
        f'<text x="200" y="91" text-anchor="middle" font-size="9" fill="#555">42 procesos (P-001..P-042) · 16 macroprocesos (MP-01..MP-16)</text>',
        f'<text x="500" y="77" text-anchor="middle" font-size="9" font-weight="bold" fill="#333">Emisión: {EMISION}</text>',
        f'<text x="500" y="91" text-anchor="middle" font-size="9" fill="#333">Rev. {REVISION}</text>',
        f'<text x="720" y="77" text-anchor="middle" font-size="9" font-weight="bold" fill="#333">Código: {CODIGO}</text>',
        f'<text x="720" y="91" text-anchor="middle" font-size="9" fill="#333">Fuente: generar_gobierno_ia_v3.py</text>',
        f'<text x="980" y="84" text-anchor="middle" font-size="9" fill="#333">Página 1 de 1</text>',
        # Side labels
        f'<text x="22" y="480" text-anchor="middle" fill="#2e6da4" font-size="10" font-weight="bold" transform="rotate(-90 22 480)">NECESIDADES DEL CLIENTE Y DEL NEGOCIO</text>',
        f'<text x="{w-22}" y="480" text-anchor="middle" fill="#2e6da4" font-size="10" font-weight="bold" transform="rotate(90 {w-22} 480)">SATISFACCIÓN Y RESULTADOS (IRE · KPIs · ISO 25000)</text>',
    ]

    y = 108
    box_w = 175
    gap = 8
    margin_x = 58

    for band_title, head_fill, box_fill, mp_ids in BANDS:
        band_h = 28 + 16 + (72 if len(mp_ids) <= 6 else 88) + 12
        lines.append(f'<rect x="{margin_x}" y="{y}" width="{w - 2*margin_x}" height="28" fill="{head_fill}" rx="3"/>')
        lines.append(
            f'<text x="{w/2}" y="{y+18}" text-anchor="middle" fill="white" font-size="11" font-weight="bold">{esc(band_title)}</text>'
        )
        lines.append(f'<rect x="{margin_x}" y="{y+28}" width="{w - 2*margin_x}" height="16" fill="{head_fill}" opacity="0.85"/>')
        y += 44
        n = len(mp_ids)
        total_w = n * box_w + (n - 1) * gap
        start_x = margin_x + ((w - 2 * margin_x) - total_w) / 2
        for i, mp_id in enumerate(mp_ids):
            _, tipo, nombre, detalle = mp_by_id[mp_id]
            bx = start_x + i * (box_w + gap)
            lines.append(
                box(
                    bx,
                    y,
                    box_w,
                    68,
                    box_fill,
                    [tipo, detalle[:48] + ("…" if len(detalle) > 48 else "")],
                    f"{mp_id}: {nombre[:38]}{'…' if len(nombre) > 38 else ''}",
                )
            )
        y += 80
        if band_title.startswith("MACROPROCESOS MISIONALES — Cadena"):
            lines.append(
                f'<text x="{w/2}" y="{y-4}" text-anchor="middle" font-size="8" fill="#4a6741">'
                f"Flujo lógico: MP-02 → MP-03 → MP-06 (auth) → MP-04 → MP-05 → MP-14</text>"
            )
        y += 8

    # Evaluación
    lines.append(f'<rect x="{margin_x}" y="{y}" width="{w-2*margin_x}" height="44" fill="#3d5166" rx="4"/>')
    lines.append(
        f'<text x="{w/2}" y="{y+18}" text-anchor="middle" fill="white" font-size="10" font-weight="bold">'
        f"EVALUACIÓN Y SEGUIMIENTO — ISO/IEC 25000 · Gates verify-* · Dashboard calidad · Gobierno IA ISO 42001</text>"
    )
    lines.append(
        f'<text x="{w/2}" y="{y+34}" text-anchor="middle" fill="#b0c8e0" font-size="8">'
        f"MP-13 DevOps + MP-12 backtest + MP-10 ZAP + trazabilidad CU-T05/CU-T07</text>"
    )
    y += 52
    lines.append(f'<rect x="{margin_x}" y="{y}" width="{w-2*margin_x}" height="26" fill="#1a2e4a" rx="4"/>')
    lines.append(
        f'<text x="{w/2}" y="{y+17}" text-anchor="middle" fill="white" font-size="11" font-weight="bold" letter-spacing="1.5">MEJORAMIENTO CONTINUO</text>'
    )
    y += 32
    lines.append(f'<rect x="{margin_x}" y="{y}" width="{w-2*margin_x}" height="22" fill="#e8eef4" rx="2"/>')
    lines.append(
        f'<text x="{w/2}" y="{y+14}" text-anchor="middle" fill="#1a3a5c" font-size="8.5">'
        f"42 procesos funcionales · 16 macroprocesos · Web {WEB_VERSION} · IRE comercial-operativo (no quiebra Altman) · Regenerar: python scripts/generar_mapa_macroprocesos_svg.py</text>"
    )
    lines.append("</svg>")
    return "\n".join(lines)


def main() -> None:
    svg = build_svg()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(svg, encoding="utf-8")
    OUT_DOCS.parent.mkdir(parents=True, exist_ok=True)
    OUT_DOCS.write_text(svg, encoding="utf-8")
    print(f"OK: {OUT}")
    print(f"OK: {OUT_DOCS}")


if __name__ == "__main__":
    main()
