#!/usr/bin/env python3
"""Normaliza ai-service/coverage.xml para SonarCloud (rutas bajo ai-service/)."""
from __future__ import annotations

import xml.etree.ElementTree as ET
from pathlib import Path

_AI_SERVICE_DIR = Path(__file__).resolve().parent.parent
_COVERAGE_XML = _AI_SERVICE_DIR / "coverage.xml"
_REPO_ROOT = _AI_SERVICE_DIR.parent
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


def _normalized_class_filename(cls: ET.Element) -> str | None:
    fn = cls.get("filename")
    if not fn:
        return None
    return _normalize_filename(fn)


def _should_omit_class(cls: ET.Element) -> bool:
    norm = _normalized_class_filename(cls)
    return norm in _OMIT if norm else False


def _apply_class_filename(cls: ET.Element) -> None:
    norm = _normalized_class_filename(cls)
    if norm:
        cls.set("filename", norm)


def _strip_package(package: ET.Element) -> int:
    classes_el = package.find("classes")
    if classes_el is None:
        return 0

    removed = 0
    for cls in reversed(tuple(classes_el.findall("class"))):
        if _should_omit_class(cls):
            classes_el.remove(cls)
            removed += 1
        else:
            _apply_class_filename(cls)
    return removed


def _strip_excluded(root: ET.Element) -> int:
    removed = 0
    for package in root.iter("package"):
        removed += _strip_package(package)
    return removed


def main() -> None:
    if not _COVERAGE_XML.is_file():
        raise SystemExit(f"fix_coverage_xml_for_sonar: no existe {_COVERAGE_XML}")

    tree = ET.parse(_COVERAGE_XML)
    root = tree.getroot()
    _set_repo_source(root)
    removed = _strip_excluded(root)
    tree.write(_COVERAGE_XML, encoding="utf-8", xml_declaration=True)
    print(f"fix_coverage_xml_for_sonar: {removed} clases omitidas")


if __name__ == "__main__":
    main()
