#!/usr/bin/env python3
"""Daily data-quality audit of the RealHunt snapshot (list of 1,000, batch 19, ideas 901-950).

  python3 scripts/quality/audit.py                         # reads public/data/rh-static.json, prints a summary
  python3 scripts/quality/audit.py --prev-git HEAD~1       # also compares with the snapshot of an older commit (943)
  python3 scripts/quality/audit.py --dist dist             # also checks the build output (948, 949)
  python3 scripts/quality/audit.py --md quality.md --json quality-full.json --public public/data/quality.json
  python3 scripts/quality/audit.py --strict                # exit 1 when a hard check fails (921, 940, 943, 947)

Changes no data. `--public` writes only counts (no slugs, no addresses) for the weekly public quality line (920).
"""
import argparse, json, os, subprocess, sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import checks  # noqa: E402

ROOT = checks.ROOT
LANGS = ("de", "fr", "nl", "pl", "ru")


def load_titles():
    out = {}
    for lang in LANGS:
        t = checks.load_json(os.path.join(ROOT, "seo", "listings", f"titles.{lang}.json"))
        if isinstance(t, dict): out[lang] = t
    return out


def git_snapshot(ref):
    try:
        raw = subprocess.run(["git", "-C", ROOT, "show", f"{ref}:public/data/rh-static.json"], capture_output=True, check=True, timeout=60).stdout
        return json.loads(raw)
    except (subprocess.SubprocessError, ValueError, OSError):
        return None


def complete_share(rows):
    """Share of homes with every key field (920): m², bedrooms (or a studio), coordinates, risks, airport, 5+ photos,
    and the yearly tax or the monthly fee known."""
    def full(r):
        return bool((r.get("sqm")) and (r.get("bedrooms") is not None or r.get("property_type") == "studio") and r.get("lat") and r.get("risks")
                    and r.get("airport_km") and len(r.get("image_urls") or []) >= 5 and (r.get("tax_annual") is not None or r.get("hoa_monthly") is not None))
    n = len(rows)
    k = sum(1 for r in rows if full(r))
    return k, n


def public_summary(snap, res):
    k, n = complete_share(snap.get("rows") or [])
    miss = {i["field"]: i["missing"] for i in res.get("missing", {}).get("items", [])}
    return {
        "generated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "snapshot": snap.get("generated"),
        "homes": n,
        "complete": k,
        "complete_pct": round(100 * k / n, 1) if n else 0,
        "missing": miss,
        "review": {name: r["count"] for name, r in res.items() if name != "missing"},
        "note": "Counts only. Fields we could not read from the advert stay empty; estimates are marked as estimates.",
        "license": "CC BY 4.0, https://realhunt.co",
    }


def markdown(snap, res):
    k, n = complete_share(snap.get("rows") or [])
    lines = [f"# Data quality, {snap.get('generated', '?')[:10]}", "", f"Homes with every key field: **{k} of {n}** ({100 * k / max(n, 1):.1f} %).", "",
             "| Check | Ideas | Hard | Count |", "|---|---|---|---|"]
    for name, r in res.items(): lines.append(f"| {name} | {r['idea']} | {'yes' if r['hard'] else ''} | {r['count']} |")
    lines += ["", "## Missing fields", "", "| Field | Ideas | Missing |", "|---|---|---|"]
    for i in res.get("missing", {}).get("items", []): lines.append(f"| {i['field']} | {i['idea']} | {i['missing']} of {i['of']} |")
    for name, r in res.items():
        if name == "missing" or not r["items"]: continue
        lines += ["", f"## {name} ({r['idea']})", ""]
        for it in r["items"][:40]:
            who = it.get("slug") or ", ".join(it.get("slugs", [])[:4]) or it.get("country") or it.get("portal") or it.get("place") or ""
            lines.append(f"- {who}: {it.get('why', '')}")
        if len(r["items"]) > 40: lines.append(f"- … and {len(r['items']) - 40} more")
    return "\n".join(lines) + "\n"


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--snapshot", default=os.path.join(ROOT, "public", "data", "rh-static.json"))
    ap.add_argument("--prev", help="yesterday's snapshot file")
    ap.add_argument("--prev-git", help="git ref whose public/data/rh-static.json is yesterday's snapshot")
    ap.add_argument("--dist", help="build output folder (checks 948, 949)")
    ap.add_argument("--hashes", help="photo-hash.json ({hash: {url: int}, size: {url: [w, h]}}) for checks 907 and 911")
    ap.add_argument("--only", help="comma-separated check names")
    ap.add_argument("--json"); ap.add_argument("--md"); ap.add_argument("--public")
    ap.add_argument("--strict", action="store_true")
    a = ap.parse_args(argv)
    snap = checks.load_json(a.snapshot)
    if not snap: print("no snapshot at", a.snapshot); return 2
    prev = checks.load_json(a.prev) if a.prev else (git_snapshot(a.prev_git) if a.prev_git else None)
    ph = checks.load_json(a.hashes, {}) if a.hashes else {}
    ctx = checks.Ctx(snap, prev=prev, dist=a.dist, titles=load_titles(), hashes=ph.get("hash"), sizes={k: tuple(v) for k, v in (ph.get("size") or {}).items()})
    res = checks.run_all(ctx, only=set(a.only.split(",")) if a.only else None)
    k, n = complete_share(snap.get("rows") or [])
    print(f"data quality: {k} of {n} homes complete")
    for name, r in res.items(): print(f"  {'!' if r['hard'] and r['count'] else ' '} {name:<20} {r['idea']:<26} {r['count']}")
    if a.json:
        with open(a.json, "w", encoding="utf8") as f: json.dump(res, f, ensure_ascii=False, indent=1)
    if a.md:
        with open(a.md, "w", encoding="utf8") as f: f.write(markdown(snap, res))
    if a.public:
        with open(a.public, "w", encoding="utf8") as f: json.dump(public_summary(snap, res), f, ensure_ascii=False, separators=(",", ":"))
    failed = [name for name, r in res.items() if r["hard"] and r["count"]]
    for name in failed:
        for it in res[name]["items"][:10]: print(f"::error::{name}: {it.get('slug') or ''} {it.get('why')}")
    return 1 if (a.strict and failed) else 0


if __name__ == "__main__":
    sys.exit(main())
