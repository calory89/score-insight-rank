#!/usr/bin/env python3
"""STATIC MODE (17-oct-2026): regenerate public/data/* from the database.

The public site reads every home from these files (src/lib/static-db.ts), so the Lovable Cloud
database can stay paused and cost nothing. Run this ONLY after adding/changing homes, while the
Cloud backend is awake, then commit public/data and deploy:  python3 scripts/build_static.py
"""
import json, os, re, time, datetime, urllib.request
from concurrent.futures import ThreadPoolExecutor
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUPA = "https://nylmhdtlshhtjkuvfbms.supabase.co"
KEY = os.environ.get("RH_ANON_KEY") or open(os.path.join(ROOT, "scripts", "anon.key")).read().strip()
OUT = os.path.join(ROOT, "public", "data")

def rpc(fn, args):
    for i in range(8):
        try:
            req = urllib.request.Request(f"{SUPA}/rest/v1/rpc/{fn}", data=json.dumps(args).encode(),
                headers={"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"})
            return json.load(urllib.request.urlopen(req, timeout=60))
        except Exception:
            time.sleep(3)
    raise RuntimeError(fn)

def pages(scope):
    rows, off, meta = [], 0, None
    while True:
        d = rpc("community_feed", {"p": {"scope": scope, "sort": "rank", "limit": 100, "offset": off}})
        meta = meta or {k: v for k, v in d.items() if k != "rows"}
        rows += d["rows"]; off += 100
        if off >= d["total"] or not d["rows"]: return meta, rows

meta, rows = pages("all")
_, week = pages("week")
wr = {r["id"]: r["rank"] for r in week}
nb = dict(ThreadPoolExecutor(6).map(lambda r: (r["slug"], rpc("community_nearby", {"p_slug": r["slug"]})), rows))
for r in rows:
    r["wrank"] = wr.get(r["id"], r["rank"]); r["nearby"] = nb.get(r["slug"])
live = (rpc("rh_live_stats", {}) or [{"live": 0, "today": 0}])[0]
flags = {"referral_bonus": True, "ai_suggestions": True, "price_alerts": False, "weekly_digest": False, "onboarding_tour": False}
meta.pop("total", None)
os.makedirs(os.path.join(OUT, "top"), exist_ok=True)
json.dump({"v": 1, "generated": datetime.datetime.now(datetime.timezone.utc).isoformat(), "meta": meta, "live": live, "flags": flags, "rows": rows},
          open(os.path.join(OUT, "rh-static.json"), "w", encoding="utf8"), separators=(",", ":"), ensure_ascii=False)
lists = {d: rpc("top_list", {"p_dest": d}) for d in ["bali", "phuket", "tulum", "batumi", "samui"]}
json.dump(lists, open(os.path.join(OUT, "top-lists.json"), "w", encoding="utf8"), separators=(",", ":"), ensure_ascii=False)
slugs = sorted({x["slug"] for v in lists.values() for x in (v or []) if re.match(r"^[a-z0-9-]+$", x["slug"])})
for s, v in ThreadPoolExecutor(6).map(lambda s: (s, rpc("top_project", {"p_slug": s})), slugs):
    json.dump(v, open(os.path.join(OUT, "top", s + ".json"), "w", encoding="utf8"), separators=(",", ":"), ensure_ascii=False)
tok = rpc("community_api", {"p_action": "session", "p_token": None, "p_payload": {}})["token"]
json.dump(rpc("community_api", {"p_action": "winners", "p_token": tok, "p_payload": {}}), open(os.path.join(OUT, "winners.json"), "w", encoding="utf8"), separators=(",", ":"), ensure_ascii=False)
print("homes", len(rows), "top projects", len(slugs))
