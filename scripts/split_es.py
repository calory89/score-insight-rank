#!/usr/bin/env python3
"""Writes the two files visitors actually download, next to public/data/rh-static.json (9-nov-2026):

  rh-static-lite.json  the snapshot without the Spanish texts, flag "es":"split"  (about a quarter lighter)
  rh-static-es.json    { slug: [title_es, why_great_es, why_cheap_es] }            (Spanish visitors only)

rh-static.json itself is unchanged: other scripts read it. realhunt.co's worker serves the lite file at
/data/rh-static.json and src/lib/static-db.ts joins the Spanish texts back before any home is shown.
Run by scripts/build_static.py after every snapshot; safe to run by hand.
"""
import json, os, sys

def split(folder: str) -> int:
    snap = json.load(open(os.path.join(folder, "rh-static.json"), encoding="utf8"))
    es = {}
    for r in snap.get("rows", []):
        t = [r.pop("title_es", None), r.pop("why_great_es", None), r.pop("why_cheap_es", None)]
        if r.get("slug") and any(t): es[r["slug"]] = t
    snap["es"] = "split"
    for name, data in (("rh-static-lite.json", snap), ("rh-static-es.json", es)):
        tmp = os.path.join(folder, name + ".tmp")
        json.dump(data, open(tmp, "w", encoding="utf8"), separators=(",", ":"), ensure_ascii=False)
        os.replace(tmp, os.path.join(folder, name))
    return len(es)

if __name__ == "__main__":
    d = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "data")
    print(f"split_es: {split(d)} homes with Spanish texts")
