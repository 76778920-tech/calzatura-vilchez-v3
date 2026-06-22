#!/usr/bin/env python3
"""
Coherencia cruzada: CU-T09 (consistencia) ↔ CU-T10 (operacionalización) ↔ instrumento Likert.
"""
from __future__ import annotations

import importlib.util
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# Palabras clave mínimas que CU-T09 ES exige y deben aparecer en CU-T10
ES_CHECKS = {
    "Específico 1": {
        "dims": ["D1", "D3"],
        "keywords": ["digitalización", "madurez digital", "conversión", "Disponibilidad"],
    },
    "Específico 2": {
        "dims": ["D2"],
        "keywords": ["MAE", "RMSE", "sMAPE", "RandomForest", "7, 15 o 30"],
    },
    "Específico 3": {
        "dims": ["D3", "D4"],
        "keywords": ["IRE", "riesgo_stock", "riesgo_ingresos", "51", "76", "quiebres"],
    },
}

LIKERT_DIMS = {
    "D1: Modelos": (1, 6),
    "D2: Exactitud": (7, 12),
    "D3: Componentes": (13, 18),
    "D4: Impacto": (19, 24),
}


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def main() -> int:
    errors: list[str] = []
    oks: list[str] = []

    gen_mc = load_module("mc", ROOT / "scripts/generar_matriz_consistencia_mejorada.py")
    gen_mo = load_module("mo", ROOT / "scripts/generar_matriz_operacionalizacion_variables.py")

    mo_blob = "\n".join(str(r.values()) for r in gen_mo.ROWS)

    for es_name, check in ES_CHECKS.items():
        row = next(r for r in gen_mc.ROWS if r["nivel"] == es_name)
        for kw in check["keywords"]:
            if kw.lower() not in mo_blob.lower() and kw not in mo_blob:
                errors.append(f"CU-T10 no contiene keyword CU-T09 {es_name}: «{kw}»")
            else:
                oks.append(f"{es_name} <-> CU-T10: «{kw}»")

    # IRE formula weights
    if "0,40" in mo_blob or "40/35/25" in mo_blob:
        oks.append("Pesos IRE 40/35/25 en CU-T10")
    else:
        errors.append("Faltan pesos IRE en CU-T10")

    if "Firestore" in mo_blob:
        errors.append("CU-T10 menciona Firestore")
    else:
        oks.append("Sin Firestore en CU-T10")

    if re.search(r"Umbral.*0[,.]70|>= 0\.70", mo_blob):
        errors.append("Umbral IRE 0.70 incorrecto en CU-T10")
    else:
        oks.append("Sin umbral IRE 0.70")

    # Instrumento: fuente unica datos_instrumento_likert.py
    spec_datos = importlib.util.spec_from_file_location(
        "datos", ROOT / "scripts/datos_instrumento_likert.py"
    )
    mod_datos = importlib.util.module_from_spec(spec_datos)
    spec_datos.loader.exec_module(mod_datos)
    if len(mod_datos.ITEMS) == 24:
        oks.append("Instrumento: 24 items Likert (datos_instrumento_likert.py)")
    else:
        errors.append(f"Instrumento: {len(mod_datos.ITEMS)} items (esperado 24)")

    for label, (a, b) in LIKERT_DIMS.items():
        if f"ítems {a}–{b}" in mo_blob or f"ítems {a}-{b}" in mo_blob or f"ítem {b}" in mo_blob:
            oks.append(f"CU-T10 referencia Likert {a}–{b} ({label})")
        elif a <= 6 and f"ítems 1–6" in mo_blob:
            continue
        elif f"ítems {a}–{b}" not in mo_blob and label.startswith("D1"):
            if "1–6" in mo_blob:
                oks.append("CU-T10 Likert VD-D1 (1–6)")
            else:
                errors.append(f"Falta referencia Likert {a}–{b}")

    # ES1: disponibilidad en VI-D1 (no SUS como indicador principal)
    vi_d1 = next(r for r in gen_mo.ROWS if r["dim"].startswith("D1: E-commerce"))
    if "Disponibilidad" in vi_d1["indicators"]:
        oks.append("VI-D1 indicador 6 = Disponibilidad (alineado CU-T09 ES1)")
    else:
        errors.append("VI-D1 debe incluir Disponibilidad (CU-T09 ES1-6)")
    if "SUS" in vi_d1["indicators"]:
        errors.append("VI-D1 no debe usar SUS como indicador 6 (SUS = anexo ISO usuarios finales)")

    bad_cu10 = [i["n"] for i in mod_datos.ITEMS if "VD-D" not in i["cu10"]]
    if bad_cu10:
        errors.append(f"CU-T11 items sin trazabilidad CU-T10: {bad_cu10}")
    else:
        oks.append("CU-T11: 1 item por indicador VD (trazabilidad CU-T10)")

    print("=== Coherencia CU-T09 <-> CU-T10 <-> Instrumento ===\n")
    for m in oks:
        print(f"OK: {m}")
    for m in errors:
        print(f"FAIL: {m}")

    if errors:
        print(f"\nROJO — {len(errors)} incoherencia(s)")
        return 1
    print(f"\nVERDE — {len(oks)} chequeos cruzados")
    return 0


if __name__ == "__main__":
    sys.exit(main())
