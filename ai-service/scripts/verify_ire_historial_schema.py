"""
Verifica el esquema real de Supabase para ireHistorial.

Uso:
  python scripts/verify_ire_historial_schema.py
  python scripts/verify_ire_historial_schema.py --write-probe

Requiere SUPABASE_URL y SUPABASE_SERVICE_KEY. Por defecto es solo lectura:
consulta las columnas extendidas. Con --write-probe hace un upsert temporal
y luego borra la fila de prueba para validar on_conflict=fecha y tipos JSON.
"""
from __future__ import annotations

import argparse
import os
import sys

import requests


REQUIRED_COLUMNS = [
    "fecha",
    "score",
    "nivel",
    "dimensiones",
    "pesos",
    "version",
    "definicion",
    "formula",
    "variables",
    "detalle",
]


def _env() -> tuple[str, dict[str, str]]:
    url = os.getenv("SUPABASE_URL", "").rstrip("/")
    key = os.getenv("SUPABASE_SERVICE_KEY", "")
    if not url or not key:
        raise RuntimeError("Faltan SUPABASE_URL y/o SUPABASE_SERVICE_KEY")
    return url, {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }


def _raise(resp: requests.Response, action: str) -> None:
    if resp.ok:
        return
    body = resp.text[:500]
    raise RuntimeError(f"{action} fallo con HTTP {resp.status_code}: {body}")


def verify_read(url: str, headers: dict[str, str]) -> None:
    resp = requests.get(
        f"{url}/rest/v1/ireHistorial",
        headers=headers,
        params={
            "select": ",".join(REQUIRED_COLUMNS),
            "limit": "1",
        },
        timeout=20,
    )
    _raise(resp, "Lectura de columnas extendidas")


def verify_write_probe(url: str, headers: dict[str, str]) -> None:
    # La tabla historica puede tener `fecha` como text o date segun migraciones
    # previas del proyecto. Usamos una fecha valida y lejana para cubrir ambos.
    fecha = "2099-12-31"
    payload = {
        "fecha": fecha,
        "score": 1,
        "nivel": "bajo",
        "dimensiones": {"riesgo_stock": 0, "riesgo_ingresos": 0, "riesgo_demanda": 0},
        "pesos": {"riesgo_stock": 0.4, "riesgo_ingresos": 0.35, "riesgo_demanda": 0.25},
        "version": "probe",
        "definicion": "probe",
        "formula": "probe",
        "variables": [{"codigo": "riesgo_stock", "valor": 0}],
        "detalle": {"probe": True},
    }
    upsert = requests.post(
        f"{url}/rest/v1/ireHistorial?on_conflict=fecha",
        headers={**headers, "Prefer": "resolution=merge-duplicates,return=minimal"},
        json=payload,
        timeout=20,
    )
    _raise(upsert, "Upsert de prueba")

    delete = requests.delete(
        f"{url}/rest/v1/ireHistorial",
        headers={**headers, "Prefer": "return=minimal"},
        params={"fecha": f"eq.{fecha}"},
        timeout=20,
    )
    _raise(delete, "Limpieza de fila de prueba")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--write-probe",
        action="store_true",
        help="Valida upsert/delete temporal ademas de lectura de columnas.",
    )
    args = parser.parse_args()

    try:
        url, headers = _env()
        verify_read(url, headers)
        print("OK lectura: ireHistorial expone columnas extendidas.")
        if args.write_probe:
            verify_write_probe(url, headers)
            print("OK escritura: upsert on_conflict=fecha y JSONB extendido funcionan.")
        else:
            print("Nota: usa --write-probe para validar on_conflict y tipos JSON en vivo.")
        return 0
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
