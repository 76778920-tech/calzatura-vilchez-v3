#!/usr/bin/env python3
"""Falla si docker_install_locked_deps.sh no coincide con requirements.lock."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LOCK = ROOT / "requirements.lock"
INSTALL = ROOT / "scripts" / "docker_install_locked_deps.sh"


def packages_from_lock() -> list[str]:
    pkgs: list[str] = []
    for ln in LOCK.read_text(encoding="utf-8").splitlines():
        if re.match(r"^[a-zA-Z0-9][a-zA-Z0-9_.-]*==", ln):
            pkgs.append(ln.split()[0])
    return pkgs


def packages_from_install_script() -> list[str]:
    return re.findall(r'"([a-zA-Z0-9][a-zA-Z0-9_.-]*==[^"]+)"', INSTALL.read_text(encoding="utf-8"))


def main() -> int:
    if not LOCK.is_file():
        print(f"verify_docker_install_sync: falta {LOCK}", file=sys.stderr)
        return 1
    if not INSTALL.is_file():
        print(f"verify_docker_install_sync: falta {INSTALL}", file=sys.stderr)
        return 1

    lock_pkgs = packages_from_lock()
    script_pkgs = packages_from_install_script()

    if not lock_pkgs:
        print("verify_docker_install_sync: requirements.lock sin paquetes", file=sys.stderr)
        return 1

    if lock_pkgs != script_pkgs:
        lock_set = set(lock_pkgs)
        script_set = set(script_pkgs)
        only_lock = sorted(lock_set - script_set)
        only_script = sorted(script_set - lock_set)
        print("verify_docker_install_sync: desincronizado", file=sys.stderr)
        if only_lock:
            print(f"  solo en lock: {only_lock}", file=sys.stderr)
        if only_script:
            print(f"  solo en script: {only_script}", file=sys.stderr)
        print("  Regenerar: python scripts/generate_docker_install_script.py", file=sys.stderr)
        return 1

    print(f"verify_docker_install_sync: OK ({len(lock_pkgs)} paquetes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
