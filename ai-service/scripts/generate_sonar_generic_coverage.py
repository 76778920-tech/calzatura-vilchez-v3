#!/usr/bin/env python3
"""
Genera cobertura genérica Sonar (sonar.coverageReportPaths) desde coverage.xml Cobertura.

Rutas explícitas ai-service/... coinciden con el índice del escáner en projectBaseDir.
"""
from __future__ import annotations

import xml.etree.ElementTree as ET
from pathlib import Path


def main() -> None:
    ai_service_dir = Path(__file__).resolve().parent.parent
    cobertura_path = ai_service_dir / "coverage.xml"
    out_path = ai_service_dir / "coverage-sonar-generic.xml"
    if not cobertura_path.is_file():
        raise SystemExit(f"generate_sonar_generic_coverage: no existe {cobertura_path}")

    root = ET.parse(cobertura_path).getroot()
    coverage = ET.Element("coverage", version="1")
    file_count = 0
    line_count = 0

    for cls in root.iter("class"):
        fn = cls.get("filename")
        if not fn or not fn.replace("\\", "/").startswith("ai-service/"):
            continue
        file_el = ET.SubElement(coverage, "file", path=fn.replace("\\", "/"))
        for line in cls.findall("lines/line"):
            num = line.get("number")
            if not num:
                continue
            hits = int(line.get("hits") or 0)
            ET.SubElement(
                file_el,
                "lineToCover",
                lineNumber=num,
                covered="true" if hits > 0 else "false",
            )
            line_count += 1
        file_count += 1

    tree = ET.ElementTree(coverage)
    ET.indent(tree, space="  ")
    tree.write(out_path, encoding="utf-8", xml_declaration=True)
    print(
        f"generate_sonar_generic_coverage: {file_count} archivos, {line_count} lineas -> {out_path}",
    )


if __name__ == "__main__":
    main()
