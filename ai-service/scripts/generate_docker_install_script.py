#!/usr/bin/env python3
"""Regenera scripts/docker_install_locked_deps.sh desde requirements.lock."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LOCK = ROOT / "requirements.lock"
OUT = ROOT / "scripts" / "docker_install_locked_deps.sh"


def main() -> None:
    pkgs = [
        ln.split()[0]
        for ln in LOCK.read_text(encoding="utf-8").splitlines()
        if re.match(r"^[a-zA-Z0-9][a-zA-Z0-9_.-]*==", ln)
    ]
    if not pkgs:
        raise SystemExit("generate_docker_install_script: sin paquetes en requirements.lock")
    lines = [
        "#!/bin/sh",
        "# Auto-generado desde requirements.lock. Regenerar: python scripts/generate_docker_install_script.py",
        "# Sin pip install -r (Sonar: versiones resueltas explícitas en la línea de comando).",
        "set -eu",
        "pip install --no-cache-dir --only-binary :all: \\",
    ]
    for i, pkg in enumerate(pkgs):
        suffix = " \\" if i < len(pkgs) - 1 else ""
        lines.append(f'  "{pkg}"{suffix}')
    OUT.write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")
    print(f"generate_docker_install_script: {len(pkgs)} paquetes -> {OUT}")


if __name__ == "__main__":
    main()
