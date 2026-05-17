#!/usr/bin/env python3
"""
Normaliza coverage.xml (Cobertura) para SonarCloud en monorepo.

Sonar indexa archivos como ai-service/services/foo.py (desde projectBaseDir).
El informe debe usar <source>=raíz del repo y filename con prefijo ai-service/.
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
    repo_source = str(repo_root).replace("\\", "/")
    for src in root.iter("source"):
        src.text = repo_source
    for el in root.iter():
        fn = el.get("filename")
        if not fn:
            continue
        norm = fn.replace("\\", "/").strip()
        if not norm.startswith("ai-service/"):
            norm = f"ai-service/{norm}"
        el.set("filename", norm)

    tree.write(path, encoding="utf-8", xml_declaration=True)
    print("fix_coverage_xml_for_sonar: <source>=repo y filename=ai-service/... en", path)


if __name__ == "__main__":
    main()
