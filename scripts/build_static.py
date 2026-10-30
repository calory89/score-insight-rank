#!/usr/bin/env python3
"""Regenerate public/data/* (the homes the public site reads, see src/lib/static-db.ts) from the live database.

Reads the RealHunt schema on the main Supabase project through the public proxy https://realhunt.co/__sb/realhunt
with the publishable (anon) key, so it needs no secret. Runs every day in .github/workflows/rh-og-cards.yml,
before the share cards (rh-og-cards) and the publish (rh-auto-publish). By hand: python3 scripts/build_static.py
"""
import json, os, re, time, datetime, urllib.request
from concurrent.futures import ThreadPoolExecutor
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUPA = os.environ.get("RH_SUPA_URL", "https://realhunt.co/__sb/realhunt")
KEY = os.environ.get("RH_ANON_KEY") or "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95a2NzbWV4dGNscGRudWdpeHF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzOTMzNjYsImV4cCI6MjEwNzk2OTM2Nn0.n4lmkzPgZe64B18altwRMYFiQrLQ2Quqg9uV9SoJhAw"
OUT = os.path.join(ROOT, "public", "data")

def rpc(fn, args):
    for i in range(8):
        try:
            req = urllib.request.Request(f"{SUPA}/rest/v1/rpc/{fn}", data=json.dumps(args).encode(),
                headers={"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json", "User-Agent": "realhunt-static/1.0"})
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
# The live database does not count views any more (the static site skips tracking), so its counters and the
# buyer-interest sub-score would sink to zero and move every grade. Keep, for homes already in the previous
# snapshot, the higher counters and, if the price did not change, the previous grade and sub-scores. New
# homes, price changes, sold/available reports and removals come straight from the database.
_prev_file = os.path.join(OUT, "rh-static.json")
_prev = {r["slug"]: r for r in json.load(open(_prev_file, encoding="utf8")).get("rows", [])} if os.path.exists(_prev_file) else {}
for r in rows:
    p = _prev.get(r["slug"])
    if not p: continue
    for k in ("views", "saves", "comments", "life_up", "life_down", "life_net", "week_up", "week_down", "week_net"):
        if isinstance(p.get(k), (int, float)) and (r.get(k) or 0) < p[k]: r[k] = p[k]
    if p.get("price_eur") == r.get("price_eur") and p.get("nota") is not None:
        r["nota"], r["dims"] = p["nota"], p.get("dims", r.get("dims"))
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
