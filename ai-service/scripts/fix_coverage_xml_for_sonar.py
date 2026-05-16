#!/usr/bin/env python3
"""
Cobertura.py escribe <source>ruta-absoluta/ai-service</source> y filename="models/foo.py".
SonarScanner, con sonar.sources en la raíz del repo, espera rutas tipo ai-service/models/foo.py.

Sin este ajuste, SonarCloud no asocia el XML con los fuentes y marca ~0% de cobertura en Python.
"""
from __future__ import annotations

import xml.etree.ElementTree as ET
from pathlib import Path


def main() -> None:
    path = Path(__file__).resolve().parent.parent / "coverage.xml"
    if not path.is_file():
        raise SystemExit(f"fix_coverage_xml_for_sonar: no existe {path}")

    tree = ET.parse(path)
    root = tree.getroot()
    for src in root.iter("source"):
        src.text = "."
    for el in root.iter():
        fn = el.get("filename")
        if not fn:
            continue
        norm = fn.replace("\\", "/").strip()
        if norm.startswith("ai-service/"):
            el.set("filename", norm)
        else:
            el.set("filename", f"ai-service/{norm}")

    tree.write(path, encoding="utf-8", xml_declaration=True)
    print("fix_coverage_xml_for_sonar: filename= y <source> actualizados en", path)


if __name__ == "__main__":
    main()
