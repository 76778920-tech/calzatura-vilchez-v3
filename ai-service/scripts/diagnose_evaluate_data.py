#!/usr/bin/env python3
"""Diagnóstico de datos para evaluate.py (sin imprimir secretos)."""
from __future__ import annotations

import os
import sys
from collections import Counter
from pathlib import Path
from datetime import date, timedelta, timezone
from urllib.parse import urlparse

from dotenv import load_dotenv

_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

load_dotenv(_ROOT / ".env")

from services import supabase_client as sc  # noqa: E402


def _host(url: str) -> str:
    try:
        return urlparse(url).netloc or "(invalid)"
    except Exception:
        return "(invalid)"


def _count(table: str, params: dict | None = None) -> int:
    url, headers = sc._get_headers()
    import requests

    p = dict(params or {})
    p["select"] = "id" if table != "ventasDiarias" else "productId,fecha"
    p["limit"] = "1"
    headers_count = {**headers, "Prefer": "count=exact"}
    resp = requests.get(
        f"{url}/rest/v1/{table}",
        headers=headers_count,
        params={**p, "limit": "0"},
        timeout=30,
    )
    resp.raise_for_status()
    cr = resp.headers.get("Content-Range", "")
    # format: 0-0/123 or */0
    if "/" in cr:
        total = cr.split("/")[-1]
        return int(total) if total.isdigit() else -1
    return len(resp.json())


def main() -> int:
    url = os.getenv("SUPABASE_URL", "")
    key_set = bool(os.getenv("SUPABASE_SERVICE_KEY", "").strip())
    print("=== Diagnóstico evaluate.py / Supabase ===")
    print(f"SUPABASE_URL host : {_host(url)}")
    print(f"SERVICE_KEY set   : {key_set}")
    if not url or not key_set:
        print("ERROR: faltan SUPABASE_URL o SUPABASE_SERVICE_KEY en ai-service/.env")
        return 1

    today = date.today()
    for days in (None, 30, 180):
        label = "sin filtro fecha" if days is None else f"últimos {days} días"
        cutoff = sc._cutoff_iso(days) if days else "(ninguno)"
        try:
            vd = sc.fetch_daily_sales(days=days) if days else sc._query(
                "ventasDiarias",
                {"select": "productId,fecha,cantidad,devuelto,nombre,precioVenta,codigo"},
            )
            po = sc.fetch_completed_orders(days=days) if days else sc._query(
                "pedidos",
                {
                    "select": "creadoEn,pagadoEn,items,total,estado",
                    "estado": "in.(pagado,enviado,entregado)",
                },
            )
        except Exception as exc:
            print(f"\n[{label}] ERROR: {exc}")
            continue

        print(f"\n--- ventasDiarias ({label}, cutoff={cutoff}) ---")
        print(f"  filas devueltas por API: {len(vd)}")
        if vd:
            fechas = sorted({str(r.get("fecha", ""))[:10] for r in vd})
            pids = {r.get("productId") for r in vd}
            devueltos = sum(1 for r in vd if r.get("devuelto"))
            print(f"  productos únicos     : {len(pids)}")
            print(f"  fechas únicas        : {len(fechas)}  ({fechas[0]} .. {fechas[-1]})")
            print(f"  marcadas devuelto    : {devueltos}")

        print(f"\n--- pedidos pagado/enviado/entregado ({label}) ---")
        print(f"  filas devueltas por API: {len(po)}")
        if po:
            estados = Counter(str(r.get("estado", "?")) for r in po)
            print(f"  estados              : {dict(estados)}")
            for field in ("pagadoEn", "creadoEn"):
                vals = [str(r.get(field, ""))[:10] for r in po if r.get(field)]
                if vals:
                    print(f"  {field} rango        : {min(vals)} .. {max(vals)}")

    # Totales en tablas (HEAD count)
    print("\n--- conteos PostgREST (tabla completa) ---")
    for table, extra in (
        ("ventasDiarias", {}),
        ("pedidos", {}),
        ("productos", {}),
    ):
        try:
            n = _count(table, extra)
            print(f"  {table}: ~{n} filas")
        except Exception as exc:
            print(f"  {table}: error count — {exc}")

    # Pedidos por estado (muestra)
    try:
        all_orders = sc._query("pedidos", {"select": "estado", "limit": "500"})
        est = Counter(str(r.get("estado")) for r in all_orders)
        print(f"\n--- pedidos (muestra hasta 500) por estado ---")
        for k, v in est.most_common():
            print(f"  {k}: {v}")
    except Exception as exc:
        print(f"  pedidos estados: {exc}")

    # Comparar con Vite si existe
    vite_env = os.path.join(os.path.dirname(sc.__file__), "..", "..", "calzatura-vilchez", ".env.local")
    vite_path = os.path.normpath(vite_env)
    if os.path.isfile(vite_path):
        vite_url = ""
        for line in open(vite_path, encoding="utf-8"):
            if line.startswith("VITE_SUPABASE_URL="):
                vite_url = line.split("=", 1)[1].strip().strip('"').strip("'")
                break
        same = _host(url) == _host(vite_url)
        print(f"\n--- coherencia con calzatura-vilchez/.env.local ---")
        print(f"  VITE host : {_host(vite_url)}")
        print(f"  AI host   : {_host(url)}")
        print(f"  mismo proyecto: {'sí' if same else 'NO — revisar .env'}")

    print("\n=== Fin ===")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
