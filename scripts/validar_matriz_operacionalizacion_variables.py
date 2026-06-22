#!/usr/bin/env python3
"""Valida Matriz de Operacionalización vs repo y CU-T09."""
from __future__ import annotations

import importlib.util
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load_rows():
    spec = importlib.util.spec_from_file_location(
        "gen_mo", ROOT / "scripts/generar_matriz_operacionalizacion_variables.py"
    )
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.ROWS


def main() -> int:
    rows = load_rows()
    errors: list[str] = []
    oks: list[str] = []

    if len(rows) != 8:
        errors.append(f"Debe haber 8 filas (4 VI + 4 VD), hay {len(rows)}")
    else:
        oks.append("8 filas = 4 dimensiones VI + 4 VD")

    vi = [r for r in rows if r["var"] == "VI"]
    vd = [r for r in rows if r["var"] == "VD"]
    if len(vi) == 4 and len(vd) == 4:
        oks.append("Balance VI/VD correcto")
    else:
        errors.append(f"VI={len(vi)} VD={len(vd)}")

    blob = "\n".join(str(r.values()) for r in rows)
    if "Firestore" in blob:
        errors.append("Mención incorrecta Firestore")
    else:
        oks.append("Sin Firestore")

    if re.search(r"≥\s*0[,.]70|>= 0\.70|intervalo 0-1.*IRE", blob, re.I):
        if "≥ 51" not in blob:
            errors.append("IRE mal escalado")
        elif "0.70" in blob or ">= 0.70" in blob:
            errors.append("Umbral 0.70 incorrecto")
    if "≥ 51" in blob and "≥ 76" in blob:
        oks.append("Umbrales IRE 51/76")
    if "0–100" in blob or "0-100" in blob:
        oks.append("IRE escala 0–100 declarada")

    for r in rows:
        ind = r["indicators"]
        count = len(re.findall(r"^\d+\.", ind, re.M))
        if count != 6:
            errors.append(f"{r['dim']}: {count}/6 indicadores")

    if not any("indicadores" in e for e in errors):
        oks.append("6 indicadores por dimensión")

    vi_d1 = next((r for r in rows if r["dim"].startswith("D1: E-commerce")), None)
    if vi_d1:
        if "Disponibilidad" in vi_d1["indicators"]:
            oks.append("VI-D1: Disponibilidad alineada CU-T09 ES1-6")
        else:
            errors.append("VI-D1 debe incluir Disponibilidad (CU-T09 ES1-6)")
        if re.search(r"^\s*6\..*SUS", vi_d1["indicators"], re.M | re.I):
            errors.append("VI-D1 indicador 6 no debe ser SUS (anexo ISO aparte)")

    if "48 = 24 Likert + 24 técnicos" in blob or "24 Likert + 24 técnicos" in blob:
        errors.append("Texto erróneo: 48 ≠ 24+24 Likert/técnicos")
    else:
        oks.append("Sin claim erróneo 48=24+24")

    for r in rows:
        if "Likert" in r["instrument"] or "Likert" in r["technique"] or "evaluate.py" in r["instrument"]:
            continue
        if r["var"] == "VI" and r["dim"].startswith("D2"):
            if "evaluate.py" not in r["instrument"]:
                errors.append("VI-D2 debe citar evaluate.py")
        if r["var"] == "VD" and "Likert" not in r["instrument"] and "Likert" not in r["technique"]:
            errors.append(f"{r['dim']}: falta referencia Likert o técnica")

    paths = [
        "ai-service/evaluate.py",
        "ai-service/models/demand/features_ml.py",
        "ai-service/tests/test_risk.py",
        "documentacion/07-modulo-ia-riesgo-empresarial.md",
        "scripts/generar_instrumento_investigacion.py",
        "documentacion/cuadros-excel/CU-T09-matriz-consistencia.csv",
    ]
    for p in paths:
        if (ROOT / p).exists():
            oks.append(f"Evidencia: {p}")
        else:
            errors.append(f"Falta: {p}")

    print("=== Validación Operacionalización ===\n")
    for m in oks:
        print(f"OK: {m}")
    for m in errors:
        print(f"FAIL: {m}")
    if errors:
        print(f"\nROJO — {len(errors)} error(es)")
        return 1
    print(f"\nVERDE — {len(oks)} chequeos")
    return 0


if __name__ == "__main__":
    sys.exit(main())
