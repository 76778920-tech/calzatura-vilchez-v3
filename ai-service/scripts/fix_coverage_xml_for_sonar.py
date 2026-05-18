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


def _set_repo_source(root: ET.Element, repo_source: str) -> None:
    sources_el = root.find("sources")
    if sources_el is None:
        sources_el = ET.SubElement(root, "sources")
    sources_el.clear()
    ET.SubElement(sources_el, "source").text = repo_source


def _normalize_filename(fn: str) -> str:
    norm = fn.replace("\\", "/").strip()
    if not norm.startswith("ai-service/"):
        norm = f"ai-service/{norm}"
    return norm


def _process_class(cls: ET.Element) -> bool:
    """Normaliza filename; devuelve True si la clase debe omitirse del XML."""
    fn = cls.get("filename")
    if not fn:
        return False
    norm = _normalize_filename(fn)
    if norm in OMIT_COVERAGE_FILENAMES:
        return True
    cls.set("filename", norm)
    return False


def _strip_excluded_classes(root: ET.Element) -> int:
    removed = 0
    for package in root.iter("package"):
        classes_el = package.find("classes")
        if classes_el is None:
            continue
        for cls in classes_el.findall("class")[:]:
            if _process_class(cls):
                classes_el.remove(cls)
                removed += 1
    return removed


def main() -> None:
    ai_service_dir = Path(__file__).resolve().parent.parent
    repo_root = ai_service_dir.parent
    path = ai_service_dir / "coverage.xml"
    if not path.is_file():
        raise SystemExit(f"fix_coverage_xml_for_sonar: no existe {path}")

    tree = ET.parse(path)
    root = tree.getroot()
    repo_source = str(repo_root).replace("\\", "/")

    _set_repo_source(root, repo_source)
    removed = _strip_excluded_classes(root)

    tree.write(path, encoding="utf-8", xml_declaration=True)
    print(
        f"fix_coverage_xml_for_sonar: 1 source, rutas ai-service/, "
        f"{removed} clases omitidas (exclusiones Sonar)",
    )


if __name__ == "__main__":
    main()
