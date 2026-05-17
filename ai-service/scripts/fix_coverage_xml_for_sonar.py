#!/usr/bin/env python3
"""
Cobertura.py escribe <source>.../ai-service</source> y filename="services/foo.py".
SonarScanner (projectBaseDir = raíz del monorepo, sonar.sources = ai-service/...) resuelve
la ruta como ai-service/services/foo.py al unir <source> + filename.

Formato alternativo (repo + filename=ai-service/...) también vale; este formato coincide
con la raíz ai-service que pytest-cov usa por defecto.
"""
from __future__ import annotations

import xml.etree.ElementTree as ET
from pathlib import Path


def main() -> None:
    ai_service_dir = Path(__file__).resolve().parent.parent
    repo_root = ai_service_dir.parent
    path = ai_service_dir / "coverage.xml"
    if not path.is_file():
        raise SystemExit(f"fix_coverage_xml_for_sonar: no existe {path}")

    tree = ET.parse(path)
    root = tree.getroot()
    ai_source = str(ai_service_dir).replace("\\", "/")
    for src in root.iter("source"):
        src.text = ai_source
    for el in root.iter():
        fn = el.get("filename")
        if not fn:
            continue
        norm = fn.replace("\\", "/").strip()
        if norm.startswith("ai-service/"):
            norm = norm[len("ai-service/") :]
        el.set("filename", norm)

    tree.write(path, encoding="utf-8", xml_declaration=True)
    print("fix_coverage_xml_for_sonar: <source>=ai-service y filename relativos en", path)


if __name__ == "__main__":
    main()
