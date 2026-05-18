#!/usr/bin/env python3
"""Normaliza ai-service/coverage.xml para SonarCloud (monorepo)."""
from __future__ import annotations

import xml.etree.ElementTree as ET
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parent.parent
_COVERAGE_XML = _REPO_ROOT / "ai-service" / "coverage.xml"
_REPO_SOURCE = str(_REPO_ROOT).replace("\\", "/")

_OMIT = frozenset({
    "ai-service/main.py",
    "ai-service/evaluate.py",
    "ai-service/models/campaign.py",
    "ai-service/models/demand.py",
    "ai-service/services/firebase_verifier.py",
})


def _normalize_filename(fn: str) -> str:
    norm = fn.replace("\\", "/").strip()
    return norm if norm.startswith("ai-service/") else f"ai-service/{norm}"


def _set_repo_source(root: ET.Element) -> None:
    sources_el = root.find("sources")
    if sources_el is None:
        sources_el = ET.SubElement(root, "sources")
    sources_el.clear()
    ET.SubElement(sources_el, "source").text = _REPO_SOURCE


def _update_class(cls: ET.Element) -> bool:
    """Devuelve True si la clase debe eliminarse del informe."""
    fn = cls.get("filename")
    if not fn:
        return False
    norm = _normalize_filename(fn)
    if norm in _OMIT:
        return True
    cls.set("filename", norm)
    return False


def _strip_package(package: ET.Element) -> int:
    classes_el = package.find("classes")
    if classes_el is None:
        return 0
    omit = [cls for cls in classes_el.findall("class") if _update_class(cls)]
    for cls in omit:
        classes_el.remove(cls)
    return len(omit)


def _strip_excluded(root: ET.Element) -> int:
    removed = 0
    for package in root.iter("package"):
        removed += _strip_package(package)
    return removed


def main() -> None:
    if not _COVERAGE_XML.is_file():
        raise SystemExit(f"no existe {_COVERAGE_XML}")

    tree = ET.parse(_COVERAGE_XML)
    root = tree.getroot()
    _set_repo_source(root)
    removed = _strip_excluded(root)
    tree.write(_COVERAGE_XML, encoding="utf-8", xml_declaration=True)
    print(f"fix-ai-service-coverage-xml-for-sonar: {removed} clases omitidas")


if __name__ == "__main__":
    main()
