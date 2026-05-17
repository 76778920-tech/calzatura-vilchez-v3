#!/usr/bin/env python3
"""
Normaliza coverage.xml (Cobertura) para SonarCloud en monorepo.

- Un único <source> (raíz del repo); duplicados provocan "ambigüedad" en Sonar.
- filename=ai-service/... alineado con sonar.sources=ai-service (un solo módulo).
- Quita archivos en sonar.coverage.exclusions que no deben importarse.
"""
from __future__ import annotations

import xml.etree.ElementTree as ET
from pathlib import Path

# Debe coincidir con sonar.coverage.exclusions en sonar-project.properties
OMIT_COVERAGE_FILENAMES = {
    "ai-service/main.py",
    "ai-service/evaluate.py",
    "ai-service/models/campaign.py",
    "ai-service/models/demand.py",
    "ai-service/services/firebase_verifier.py",
}


def main() -> None:
    ai_service_dir = Path(__file__).resolve().parent.parent
    repo_root = ai_service_dir.parent
    path = ai_service_dir / "coverage.xml"
    if not path.is_file():
        raise SystemExit(f"fix_coverage_xml_for_sonar: no existe {path}")

    tree = ET.parse(path)
    root = tree.getroot()
    repo_source = str(repo_root).replace("\\", "/")

    sources_el = root.find("sources")
    if sources_el is None:
        sources_el = ET.SubElement(root, "sources")
    sources_el.clear()
    ET.SubElement(sources_el, "source").text = repo_source

    removed = 0
    for package in list(root.iter("package")):
        for cls in list(package.findall("classes/class")):
            fn = cls.get("filename")
            if not fn:
                continue
            norm = fn.replace("\\", "/").strip()
            if not norm.startswith("ai-service/"):
                norm = f"ai-service/{norm}"
            if norm in OMIT_COVERAGE_FILENAMES:
                classes_el = package.find("classes")
                if classes_el is not None:
                    classes_el.remove(cls)
                    removed += 1
                continue
            cls.set("filename", norm)

    tree.write(path, encoding="utf-8", xml_declaration=True)
    print(
        f"fix_coverage_xml_for_sonar: 1 source, rutas ai-service/, "
        f"{removed} clases omitidas (exclusiones Sonar)",
    )


if __name__ == "__main__":
    main()
