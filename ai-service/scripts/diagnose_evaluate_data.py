#!/usr/bin/env python3
"""Diagnóstico de datos para evaluate.py (sin imprimir secretos)."""
from __future__ import annotations

import os
import sys
from collections import Counter
from pathlib import Path
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


def _fetch_window_data(days: int | None) -> tuple[list, list]:
    if days:
        return sc.fetch_daily_sales(days=days), sc.fetch_completed_orders(days=days)
    vd = sc._query(
        "ventasDiarias",
        {"select": "productId,fecha,cantidad,devuelto,nombre,precioVenta,codigo"},
    )
    po = sc._query(
        "pedidos",
        {
            "select": "creadoEn,pagadoEn,items,total,estado",
            "estado": "in.(pagado,enviado,entregado)",
        },
    )
    return vd, po


def _print_daily_sales_summary(vd: list, label: str, cutoff: str) -> None:
    print(f"\n--- ventasDiarias ({label}, cutoff={cutoff}) ---")
    print(f"  filas devueltas por API: {len(vd)}")
    if not vd:
        return
    fechas = sorted({str(r.get("fecha", ""))[:10] for r in vd})
    pids = {r.get("productId") for r in vd}
    devueltos = sum(1 for r in vd if r.get("devuelto"))
    print(f"  productos únicos     : {len(pids)}")
    print(f"  fechas únicas        : {len(fechas)}  ({fechas[0]} .. {fechas[-1]})")
    print(f"  marcadas devuelto    : {devueltos}")


def _print_orders_summary(po: list, label: str) -> None:
    print(f"\n--- pedidos pagado/enviado/entregado ({label}) ---")
    print(f"  filas devueltas por API: {len(po)}")
    if not po:
        return
    estados = Counter(str(r.get("estado", "?")) for r in po)
    print(f"  estados              : {dict(estados)}")
    for field in ("pagadoEn", "creadoEn"):
        vals = [str(r.get(field, ""))[:10] for r in po if r.get(field)]
        if vals:
            print(f"  {field} rango        : {min(vals)} .. {max(vals)}")


def _diagnose_time_windows() -> None:
    for days in (None, 30, 180):
        label = "sin filtro fecha" if days is None else f"últimos {days} días"
        cutoff = sc._cutoff_iso(days) if days else "(ninguno)"
        try:
            vd, po = _fetch_window_data(days)
        except Exception as exc:
            print(f"\n[{label}] ERROR: {exc}")
            continue
        _print_daily_sales_summary(vd, label, cutoff)
        _print_orders_summary(po, label)


def _print_table_counts() -> None:
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


def _print_order_states_sample() -> None:
    try:
        all_orders = sc._query("pedidos", {"select": "estado", "limit": "500"})
        est = Counter(str(r.get("estado")) for r in all_orders)
        print("\n--- pedidos (muestra hasta 500) por estado ---")
        for k, v in est.most_common():
            print(f"  {k}: {v}")
    except Exception as exc:
        print(f"  pedidos estados: {exc}")


def _print_vite_coherence(ai_url: str) -> None:
    vite_env = os.path.join(
        os.path.dirname(sc.__file__), "..", "..", "calzatura-vilchez", ".env.local"
    )
    vite_path = os.path.normpath(vite_env)
    if not os.path.isfile(vite_path):
        return
    vite_url = ""
    with open(vite_path, encoding="utf-8") as fh:
        for line in fh:
            if line.startswith("VITE_SUPABASE_URL="):
                vite_url = line.split("=", 1)[1].strip().strip('"').strip("'")
                break
    same = _host(ai_url) == _host(vite_url)
    print("\n--- coherencia con calzatura-vilchez/.env.local ---")
    print(f"  VITE host : {_host(vite_url)}")
    print(f"  AI host   : {_host(ai_url)}")
    print(f"  mismo proyecto: {'sí' if same else 'NO — revisar .env'}")


def main() -> int:
    url = os.getenv("SUPABASE_URL", "")
    key_set = bool(os.getenv("SUPABASE_SERVICE_KEY", "").strip())
    print("=== Diagnóstico evaluate.py / Supabase ===")
    print(f"SUPABASE_URL host : {_host(url)}")
    print(f"SERVICE_KEY set   : {key_set}")
    if not url or not key_set:
        print("ERROR: faltan SUPABASE_URL o SUPABASE_SERVICE_KEY en ai-service/.env")
        return 1

    _diagnose_time_windows()
    _print_table_counts()
    _print_order_states_sample()
    _print_vite_coherence(url)
    print("\n=== Fin ===")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
