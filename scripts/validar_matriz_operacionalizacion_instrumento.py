#!/usr/bin/env python3
"""Valida Matriz Operacionalizacion del Instrumento (CU-T11) vs CU-T10 e instrumento."""
from __future__ import annotations

import importlib.util
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load_items():
    spec = importlib.util.spec_from_file_location(
        "datos", ROOT / "scripts/datos_instrumento_likert.py"
    )
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.ITEMS, mod.DIM_RANGES, mod.CU10_KEYWORDS


def load_cu10_rows():
    spec = importlib.util.spec_from_file_location(
        "mo", ROOT / "scripts/generar_matriz_operacionalizacion_variables.py"
    )
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return [r for r in mod.ROWS if r["var"] == "VD"]


def main() -> int:
    items, dim_ranges, cu10_kw = load_items()
    vd_rows = load_cu10_rows()
    errors: list[str] = []
    oks: list[str] = []

    if len(items) != 24:
        errors.append(f"Esperado 24 items, hay {len(items)}")
    else:
        oks.append("24 items Likert")

    nums = [i["n"] for i in items]
    if nums == list(range(1, 25)):
        oks.append("Numeracion secuencial 1-24")
    else:
        errors.append("Numeracion items incorrecta")

    for dim, (a, b) in dim_ranges.items():
        dim_items = [i for i in items if a <= i["n"] <= b]
        if len(dim_items) != 6:
            errors.append(f"{dim}: {len(dim_items)}/6 items")
        else:
            oks.append(f"{dim}: items {a}-{b}")

    if len(vd_rows) != 4:
        errors.append(f"CU-T10 debe tener 4 filas VD, hay {len(vd_rows)}")
    else:
        oks.append("CU-T10: 4 dimensiones VD")

    for item in items:
        cu10 = item["cu10"]
        if not re.match(r"VD-D[1-4] ind\. \d", cu10):
            errors.append(f"Item {item['n']}: trazabilidad CU-T10 invalida")
        dim_code = cu10.split()[0].replace("VD-", "")
        a, b = dim_ranges[dim_code]
        if not (a <= item["n"] <= b):
            errors.append(f"Item {item['n']} no coincide rango {dim_code} ({a}-{b})")

    if not any("indicadores" in e for e in errors):
        oks.append("Trazabilidad item <-> dimension VD")

    blob = "\n".join(i["text"] for i in items)
    item17 = next(i for i in items if i["n"] == 17)
    if "51" in item17["text"] and "76" in item17["text"]:
        oks.append("Item 17: alertas IRE >= 51 / >= 76 en redaccion")
    else:
        errors.append("Item 17 debe mencionar umbrales 51 y 76")

    item13 = next(i for i in items if i["n"] == 13)
    if "0" in item13["text"] and "100" in item13["text"]:
        oks.append("Item 13: escala IRE 0-100 en redaccion")
    else:
        errors.append("Item 13 debe mencionar IRE 0-100")

    item3 = next(i for i in items if i["n"] == 3)
    if "7" in item3["text"] and "15" in item3["text"] and "30" in item3["text"]:
        oks.append("Item 3: horizonte 7/15/30 dias")
    else:
        errors.append("Item 3 debe mencionar horizontes 7, 15 y 30")

    for n, kws in cu10_kw.items():
        text = next(i["text"] for i in items if i["n"] == n).lower()
        cu10 = next(i["cu10"] for i in items if i["n"] == n).lower()
        missing = [k for k in kws if k.lower() not in text and k.lower() not in cu10]
        if missing:
            errors.append(f"Item {n}: falta alineacion semantica ({', '.join(missing)})")

    if not any("alineacion semantica" in e for e in errors):
        oks.append("24 items alineados semanticamente con CU-T10")

    if "Firestore" in blob:
        errors.append("Mencion Firestore en items")
    else:
        oks.append("Sin Firestore")

    if re.search(r"0[,.]70.*IRE|IRE.*0[,.]70", blob):
        errors.append("Umbral IRE 0.70 incorrecto en items")
    else:
        oks.append("Sin umbral IRE 0.70 en redaccion")

    paths = [
        "scripts/datos_instrumento_likert.py",
        "scripts/generar_instrumento_investigacion.py",
        "documentacion/cuadros-excel/CU-T10-matriz-operacionalizacion-variables.csv",
        "Instrumento_Investigacion_Calzatura_Vilchez_MEJORADO.docx",
    ]
    for p in paths:
        if (ROOT / p).exists():
            oks.append(f"Evidencia: {p}")
        else:
            errors.append(f"Falta: {p}")

    # CU-T10 Likert ranges in instrument column
    cu10_blob = "\n".join(str(r.values()) for r in vd_rows)
    for a, b in [(1, 6), (7, 12), (13, 18), (19, 24)]:
        if f"items {a}" in cu10_blob or f"items {a}–{b}" in cu10_blob or f"items {a}-{b}" in cu10_blob:
            oks.append(f"CU-T10 referencia Likert {a}-{b}")
        elif f"ítems {a}" in cu10_blob or f"ítems {a}–{b}" in cu10_blob:
            oks.append(f"CU-T10 referencia Likert {a}-{b}")

    print("=== Validacion Operacionalizacion Instrumento (CU-T11) ===\n")
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
