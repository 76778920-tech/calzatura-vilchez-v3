#!/usr/bin/env python3
"""
Valida coherencia vertical de CU-T09 / Matriz de Consistencia.
Sale 0 si pasa; 1 si hay incoherencias detectadas.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# Evidencia repo (rutas deben existir)
REPO_EVIDENCE = [
    "calzatura-vilchez/package.json",
    "calzatura-vilchez/supabase/migrations",
    "ai-service/models/demand/features_ml.py",
    "ai-service/evaluate.py",
    "documentacion/07-modulo-ia-riesgo-empresarial.md",
    "documentacion/plantillas/guia-entrevista-empleadores-PLANTILLA.md",
    "Instrumento_Investigacion_Calzatura_Vilchez_MEJORADO.docx",
    "Matriz_Operacionalizacion_Variables_Calzatura_Vilchez_MEJORADA.docx",
]

# Palabras clave que deben aparecer en filas específicas (coherencia P-O-H)
ROW_CHECKS = {
    "Específico 1": {
        "problema_kw": ["digitalización", "venta", "inventario"],
        "objetivo_kw": ["Digitalizar", "Supabase"],
        "hipotesis_kw": ["digitalización", "70"],
        "indicador_kw": ["digitalización", "conversión"],
        "must_not": ["Firestore", "RandomForest"],
    },
    "Específico 2": {
        "problema_kw": ["RandomForestRegressor", "MAE", "RMSE", "demanda"],
        "objetivo_kw": ["RandomForestRegressor", "ai-service"],
        "hipotesis_kw": ["MAE", "30"],
        "indicador_kw": ["MAE", "RMSE", "sMAPE"],
        "must_not": ["Firestore", "≥ 0,70"],
    },
    "Específico 3": {
        "problema_kw": ["IRE", "riesgo operativo", "alerta"],
        "objetivo_kw": ["0,40", "0,35", "0,25", "0–100"],
        "hipotesis_kw": ["quiebres", "40"],
        "indicador_kw": ["IRE", "51", "76", "riesgo_stock"],
        "must_not": ["Firestore", "≥ 0,70", "0.70"],
    },
}


def load_rows_from_generator() -> list[dict[str, str]]:
    # Import ROWS from generator to avoid drift
    import importlib.util

    spec = importlib.util.spec_from_file_location(
        "gen_mc", ROOT / "scripts/generar_matriz_consistencia_mejorada.py"
    )
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.ROWS


def main() -> int:
    rows = load_rows_from_generator()
    errors: list[str] = []
    oks: list[str] = []

    for rel in REPO_EVIDENCE:
        path = ROOT / rel
        if path.exists():
            oks.append(f"Evidencia repo: {rel}")
        else:
            errors.append(f"Falta evidencia en repo: {rel}")

    general = rows[0]
    if "comercial-operativo" not in general["problemas"]:
        errors.append("Problema general debe acotar riesgo comercial-operativo (doc 07)")
    else:
        oks.append("Problema general acota riesgo comercial-operativo")

    if "Supabase" not in general["variables"] and "Supabase" not in rows[1]["objetivos"]:
        errors.append("Stack debe mencionar Supabase (no Firestore como BD)")
    else:
        oks.append("Stack Supabase declarado")

    if re.search(r"Firestore", "\n".join(str(r.values()) for r in rows)):
        errors.append("Mención incorrecta a Firestore como persistencia")
    else:
        oks.append("Sin Firestore como BD principal")

    if re.search(r"≥\s*0[,.]70|>= 0\.70", "\n".join(str(r.values()) for r in rows)):
        errors.append("Umbral IRE 0,70 (escala incorrecta 0-1)")
    else:
        oks.append("IRE sin umbral erróneo 0,70")

    if "51" in rows[3]["indicadores"] and "76" in rows[3]["indicadores"]:
        oks.append("Umbrales IRE 51/76 alineados a doc 07")
    else:
        errors.append("Faltan umbrales IRE 51 y 76")

    for row in rows:
        nivel = row["nivel"]
        if nivel not in ROW_CHECKS:
            continue
        checks = ROW_CHECKS[nivel]
        blob = " ".join(row.values())
        for kw in checks["problema_kw"]:
            if kw.lower() not in row["problemas"].lower() and kw not in row["problemas"]:
                errors.append(f"{nivel}: problema sin keyword «{kw}»")
        for kw in checks["objetivo_kw"]:
            if kw not in row["objetivos"]:
                errors.append(f"{nivel}: objetivo sin «{kw}»")
        for kw in checks["hipotesis_kw"]:
            if kw not in row["hipotesis"]:
                errors.append(f"{nivel}: hipótesis sin «{kw}»")
        for kw in checks["indicador_kw"]:
            if kw not in row["indicadores"]:
                errors.append(f"{nivel}: indicadores sin «{kw}»")
        for bad in checks["must_not"]:
            if bad in blob:
                errors.append(f"{nivel}: contiene término prohibido «{bad}»")

    # Coherencia vertical: cada ES debe tener las 7 columnas no vacías
    for row in rows:
        for key in ("problemas", "objetivos", "hipotesis", "variables", "dimensiones", "indicadores", "metodologia"):
            if len(row[key].strip()) < 20:
                errors.append(f"{row['nivel']}: columna «{key}» demasiado corta")

    print("=== Validación Matriz de Consistencia ===\n")
    for msg in oks:
        print(f"OK: {msg}")
    for msg in errors:
        print(f"FAIL: {msg}")

    if errors:
        print(f"\nRESULT: ROJO — {len(errors)} incoherencia(s)")
        return 1
    print(f"\nRESULT: VERDE — {len(oks)} chequeos pasados")
    return 0


if __name__ == "__main__":
    sys.exit(main())
