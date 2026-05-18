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
    if norm.startswith("ai-service/"):
        return norm
    return f"ai-service/{norm}"


def _should_omit_class(cls: ET.Element) -> bool:
    fn = cls.get("filename")
    if not fn:
        return False
    return _normalize_filename(fn) in OMIT_COVERAGE_FILENAMES


def _apply_filename(cls: ET.Element) -> None:
    fn = cls.get("filename")
    if fn:
        cls.set("filename", _normalize_filename(fn))


def _omit_classes(classes_el: ET.Element) -> int:
    to_remove = [cls for cls in classes_el.findall("class") if _should_omit_class(cls)]
    for cls in to_remove:
        classes_el.remove(cls)
    return len(to_remove)


def _normalize_remaining(classes_el: ET.Element) -> None:
    for cls in classes_el.findall("class"):
        _apply_filename(cls)


def _strip_package(package: ET.Element) -> int:
    classes_el = package.find("classes")
    if classes_el is None:
        return 0
    removed = _omit_classes(classes_el)
    _normalize_remaining(classes_el)
    return removed


def _strip_excluded_classes(root: ET.Element) -> int:
    return sum(_strip_package(pkg) for pkg in root.iter("package"))


def _coverage_path() -> Path:
    ai_service_dir = Path(__file__).resolve().parent.parent
    return ai_service_dir / "coverage.xml"


def _repo_source() -> str:
    ai_service_dir = Path(__file__).resolve().parent.parent
    return str(ai_service_dir.parent).replace("\\", "/")


def main() -> None:
    path = _coverage_path()
    if not path.is_file():
        raise SystemExit(f"fix_coverage_xml_for_sonar: no existe {path}")

    tree = ET.parse(path)
    root = tree.getroot()
    _set_repo_source(root, _repo_source())
    removed = _strip_excluded_classes(root)
    tree.write(path, encoding="utf-8", xml_declaration=True)
    print(
        f"fix_coverage_xml_for_sonar: 1 source, rutas ai-service/, "
        f"{removed} clases omitidas (exclusiones Sonar)",
    )


if __name__ == "__main__":
    main()
