import sys
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

# 8-nov-2026 (Carlos: "nunca mezclados, todo bien traducido"): every approved home gets its Spanish title and texts
# (title_es, why_great_es, why_cheap_es) before the snapshot is built. The function only translates homes that have
# none, 12 a call, so this costs cents a day at most and nothing once they are done.
def translate_missing():
    url = os.environ.get("RH_FN_URL", "https://oykcsmextclpdnugixqz.supabase.co/functions/v1/realhunt-live-search")
    for _ in range(10):
        try:
            req = urllib.request.Request(url, data=json.dumps({"action": "translate", "limit": 12}).encode(),
                headers={"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json", "User-Agent": "realhunt-static/1.0"})
            d = json.load(urllib.request.urlopen(req, timeout=120))
            print("spanish texts:", d)
            if not d.get("translated") or not d.get("left"): return
        except Exception as e:
            print("spanish texts: skipped", e); return
translate_missing()

meta, rows = pages("all")
# 20-nov-2026 (Carlos chose "aviso visible"): when each home's original advert was last confirmed online by the nightly
# check (realhunt.community_source_checks). Homes on portals that block the check get a visible notice on their page and
# go after the others in lists (src/community/n9/status.ts isUnconfirmed). If the call fails, nothing is marked.
try:
    _chk = {c["slug"]: c for c in rpc("community_source_checks", {}) if c.get("slug")}
    for _r in rows:
        _c = _chk.get(_r.get("slug"))
        if _c: _r["src_ok_at"] = _c.get("ok_at"); _r["src_last"] = _c.get("last")
except Exception as _e:
    print("source checks skipped:", _e)
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
# 21-nov-2026 (list 2 ideas 70 and 85): the kind of home (property_type) and the bathrooms stored in the database.
# A stored kind is kept only when it is one the site knows (src/community/homeLead.ts KIND_BY_NAME); without one the
# build and the app read the kind from the title (homeKind falls back to kindFromTitle). Bathrooms only when a whole
# number above 0. If the database does not return the columns yet, yesterday's values are kept.
KINDS = {"studio", "penthouse", "duplex", "flat", "loft", "townhouse", "villa", "bungalow", "farmhouse", "cottage", "chalet", "cabin", "house", "home"}
for r in rows:
    p = _prev.get(r["slug"]) or {}
    k = str(r.get("property_type") if "property_type" in r else p.get("property_type") or "").strip().lower()
    if k in KINDS: r["property_type"] = k
    else: r.pop("property_type", None)
    b = r.get("bathrooms") if "bathrooms" in r else p.get("bathrooms")
    if isinstance(b, (int, float)) and b > 0 and int(b) == b: r["bathrooms"] = int(b)
    else: r.pop("bathrooms", None)
_, week = pages("week")
wr = {r["id"]: r["rank"] for r in week}
nb = dict(ThreadPoolExecutor(6).map(lambda r: (r["slug"], rpc("community_nearby", {"p_slug": r["slug"]})), rows))
for r in rows:
    r["wrank"] = wr.get(r["id"], r["rank"]); r["nearby"] = nb.get(r["slug"])
# 21-nov-2026: which photo copies exist on realhunt-media (scripts/make_thumbs.py writes t/index.txt at every publish).
# Each row gets th (all its 480 px card copies exist) and tm (its main photo has the 800 px copy); the app asks only for
# copies a row is marked with (src/lib/thumbs.ts learnThumbs), so a home newer than its copies shows its own photo
# instead of a 404. If the list cannot be read, a home keeps yesterday's marks when its photos did not change.
thumbs_mark = False
try:
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import make_thumbs
    _req = urllib.request.Request(make_thumbs.MEDIA + "/t/index.txt", headers={"User-Agent": "realhunt-static/1.0", "Cache-Control": "no-cache"})
    _have = set(urllib.request.urlopen(_req, timeout=60).read().decode().split())
    if len(_have) < 100: raise RuntimeError(f"only {len(_have)} lines")
    make_thumbs.mark_rows(rows, _have)
    thumbs_mark = True
    print("photo copies:", sum(r["th"] for r in rows), "homes with card copies,", sum(r["tm"] for r in rows), "with the mid-size main photo, of", len(rows))
except Exception as _e:
    print("photo copy list skipped:", _e)
    if _prev and any("th" in p for p in _prev.values()):
        for r in rows:
            p = _prev.get(r["slug"])
            same = p is not None and p.get("image_urls") == r.get("image_urls")
            r["th"], r["tm"] = (p.get("th", 0), p.get("tm", 0)) if same else (0, 0)
        thumbs_mark = True
live = (rpc("rh_live_stats", {}) or [{"live": 0, "today": 0}])[0]
flags = {"referral_bonus": True, "ai_suggestions": True, "price_alerts": False, "weekly_digest": False, "onboarding_tour": False}
meta.pop("total", None)
os.makedirs(os.path.join(OUT, "top"), exist_ok=True)
_snap = {"v": 1, "generated": datetime.datetime.now(datetime.timezone.utc).isoformat(), "meta": meta, "live": live, "flags": flags, "rows": rows}
if thumbs_mark: _snap["thumbs"] = 1
json.dump(_snap,
          open(os.path.join(OUT, "rh-static.json"), "w", encoding="utf8"), separators=(",", ":"), ensure_ascii=False)
# the lighter copies visitors download (see scripts/split_es.py)
try:
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import split_es
    print("split_es:", split_es.split(OUT), "homes with Spanish texts")
except Exception as e:
    print("split_es failed (the site keeps serving the full snapshot):", e)
lists = {d: rpc("top_list", {"p_dest": d}) for d in ["bali", "phuket", "tulum", "batumi", "samui"]}
json.dump(lists, open(os.path.join(OUT, "top-lists.json"), "w", encoding="utf8"), separators=(",", ":"), ensure_ascii=False)
slugs = sorted({x["slug"] for v in lists.values() for x in (v or []) if re.match(r"^[a-z0-9-]+$", x["slug"])})
for s, v in ThreadPoolExecutor(6).map(lambda s: (s, rpc("top_project", {"p_slug": s})), slugs):
    json.dump(v, open(os.path.join(OUT, "top", s + ".json"), "w", encoding="utf8"), separators=(",", ":"), ensure_ascii=False)
tok = rpc("community_api", {"p_action": "session", "p_token": None, "p_payload": {}})["token"]
json.dump(rpc("community_api", {"p_action": "winners", "p_token": tok, "p_payload": {}}), open(os.path.join(OUT, "winners.json"), "w", encoding="utf8"), separators=(",", ":"), ensure_ascii=False)
print("homes", len(rows), "top projects", len(slugs))
