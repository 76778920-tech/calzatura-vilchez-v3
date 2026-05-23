#!/usr/bin/env python3
"""
Compatibilidad de ruta en ai-service/scripts.

El CI ejecuta scripts/fix-ai-service-coverage-xml-for-sonar.py en la raíz del monorepo.
"""
from __future__ import annotations

import runpy
from pathlib import Path

_CANONICAL = Path(__file__).resolve().parents[2] / "scripts" / "fix-ai-service-coverage-xml-for-sonar.py"


def main() -> None:
    if not _CANONICAL.is_file():
        raise SystemExit(f"fix_coverage_xml_for_sonar: no existe {_CANONICAL}")
    runpy.run_path(str(_CANONICAL), run_name="__main__")


if __name__ == "__main__":
    main()
