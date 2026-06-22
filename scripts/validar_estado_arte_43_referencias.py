#!/usr/bin/env python3
"""Verifica referencias Estado del Arte 43 via CrossRef (busqueda por titulo)."""
from __future__ import annotations

import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
UA = "CalzaturaVilchez/1.0 (mailto:validacion@local)"


def load_articles() -> list[dict]:
    src = (ROOT / "scripts/generar_estado_arte_43_tablas.py").read_text(encoding="utf-8")
    start = src.index("ARTICLES = [")
    end = src.index("]  # end ARTICLES") + len("]")
    ns: dict = {}
    exec(src[start:end], ns)
    return ns["ARTICLES"]


def norm(s: str) -> str:
    return re.sub(r"[^a-z0-9 ]", "", s.lower()).strip()


def similarity(a: str, b: str) -> float:
    wa, wb = set(norm(a).split()), set(norm(b).split())
    if not wa or not wb:
        return 0.0
    return len(wa & wb) / len(wa | wb)


def crossref_search(title: str) -> list[dict]:
    params = urllib.parse.urlencode({"query.title": title, "rows": 5})
    url = f"https://api.crossref.org/works?{params}"
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=25) as resp:
        return json.loads(resp.read().decode()).get("message", {}).get("items", [])


def pick_best(title: str, items: list[dict]) -> tuple[dict | None, float]:
    best, score = None, 0.0
    for it in items:
        cr_t = (it.get("title") or [""])[0]
        s = similarity(title, cr_t)
        if s > score:
            score, best = s, it
    return best, score


def verify(art: dict) -> dict:
    title = art["title"]
    try:
        items = crossref_search(title)
    except Exception as e:
        return {"num": art["num"], "status": "ERROR_API", "error": str(e)}

    best, score = pick_best(title, items)
    if not best or score < 0.45:
        return {
            "num": art["num"],
            "status": "NO_ENCONTRADO",
            "score": round(score, 2),
            "doc_title": title,
            "authors_doc": art.get("authors", ""),
            "journal_doc": art.get("journal", ""),
        }

    doi = best.get("DOI", "")
    cr_title = (best.get("title") or [""])[0]
    journal = (best.get("container-title") or [""])[0]
    year = ""
    for key in ("published-print", "published-online", "created"):
        parts = (best.get(key) or {}).get("date-parts", [[]])
        if parts and parts[0]:
            year = str(parts[0][0])
            break

    pdf = ""
    for link in best.get("link", []) or []:
        u = link.get("URL", "")
        if "pdf" in u.lower() or link.get("content-type") == "application/pdf":
            pdf = u
            break

    status = "OK" if score >= 0.65 else "REVISAR"
    return {
        "num": art["num"],
        "status": status,
        "score": round(score, 2),
        "doi": doi,
        "url": f"https://doi.org/{doi}" if doi else "",
        "pdf": pdf or (f"https://doi.org/{doi}" if doi else ""),
        "cr_title": cr_title,
        "cr_journal": journal,
        "cr_year": year,
        "doc_title": title,
        "authors_doc": art.get("authors", ""),
        "journal_doc": art.get("journal", ""),
        "note": art.get("note", ""),
    }


def main() -> int:
    arts = load_articles()
    results = []
    print(f"Verificando {len(arts)} articulos en CrossRef...\n")
    for i, art in enumerate(arts):
        r = verify(art)
        results.append(r)
        st = r["status"]
        print(f"[{r['num']}] {st}  score={r.get('score','')}  DOI={r.get('doi','—')}")
        if r.get("url"):
            print(f"     {r['url']}")
        time.sleep(0.35)

    ok = sum(1 for r in results if r["status"] == "OK")
    rev = sum(1 for r in results if r["status"] == "REVISAR")
    bad = sum(1 for r in results if r["status"] in ("NO_ENCONTRADO", "ERROR_API"))
    print(f"\nOK={ok}  REVISAR={rev}  NO_ENCONTRADO/ERROR={bad}")

    out = ROOT / "documentacion/auditoria-estado-arte-43-verificacion.json"
    out.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"JSON: {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
