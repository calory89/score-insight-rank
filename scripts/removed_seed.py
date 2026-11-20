#!/usr/bin/env python3
"""The log of homes that left RealHunt or whose advert went offline, rebuilt from the git history of the snapshot.

Every daily data commit changes public/data/rh-static.json. Reading those versions in order gives, for each home:
  gone     the first day the snapshot marks it as no longer for sale (at least one "sold" report and more of them
           than "still available" reports: the nightly check of the advert or a visitor), the rule of
           src/community/n9/status.ts isGone;
  removed  the first day it is no longer in the snapshot at all (taken off the site);
  back     a home that came back after being removed or marked gone;
  price    the asking price on RealHunt changed (the nightly check read a new price in the advert, or a person
           corrected it), with the old price.
Writes seo/reach/removed-seed.json. The build (seo/reach/removed.ts) continues the log from the published copy, so
this script is only needed to rebuild the history by hand:  python3 scripts/removed_seed.py
"""
import json, os, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SNAP = "public/data/rh-static.json"
OUT = os.path.join(ROOT, "seo", "reach", "removed-seed.json")


def gone(r):
    sold = int(r.get("sold_reports") or 0)
    return sold >= 1 and sold > int(r.get("available_reports") or 0)


def brief(r):
    return {k: r.get(k) for k in ("slug", "title", "title_es", "country", "location_name", "price_eur", "sqm", "source_domain")}


def versions():
    log = subprocess.run(["git", "log", "--reverse", "--format=%H %cI", "--", SNAP], cwd=ROOT, capture_output=True, text=True, check=True).stdout.split("\n")
    by_day = {}
    for line in filter(None, log):
        sha, when = line.split(" ", 1)
        by_day[when[:10]] = sha  # the last version of each day
    return sorted(by_day.items())


def diff(day, prev, cur):
    """Events between two snapshots (dicts slug -> row)."""
    out = []
    for s, r in prev.items():
        if s not in cur:
            out.append({"date": day, "kind": "removed", "was_gone": gone(r), **brief(r)})
        elif gone(cur[s]) and not gone(r):
            out.append({"date": day, "kind": "gone", **brief(cur[s])})
        elif gone(r) and not gone(cur[s]):
            out.append({"date": day, "kind": "back", **brief(cur[s])})
        if s in cur and (r.get("price_eur") or 0) > 0 and (cur[s].get("price_eur") or 0) > 0 and round(r["price_eur"]) != round(cur[s]["price_eur"]):
            out.append({"date": day, "kind": "price", "old_price_eur": round(r["price_eur"]), **brief(cur[s])})
    for s, r in cur.items():
        if s not in prev and s in SEEN:
            out.append({"date": day, "kind": "back", **brief(r)})
    return out


SEEN = set()


def main():
    events, prev = [], None
    for day, sha in versions():
        try:
            rows = json.loads(subprocess.run(["git", "show", f"{sha}:{SNAP}"], cwd=ROOT, capture_output=True, text=True, check=True).stdout).get("rows") or []
        except Exception as e:  # a broken version is skipped, the next one is compared with the last good one
            print("skip", day, e, file=sys.stderr); continue
        cur = {r["slug"]: r for r in rows if r.get("slug")}
        if prev is not None:
            events += diff(day, prev, cur)
        SEEN.update(cur)
        prev = cur
    json.dump({"v": 1, "note": "Built by scripts/removed_seed.py from the git history of public/data/rh-static.json.", "events": events}, open(OUT, "w"), ensure_ascii=False, indent=0)
    open(OUT, "a").write("\n")
    print(len(events), "events:", {k: sum(1 for e in events if e["kind"] == k) for k in ("gone", "removed", "back", "price")})


if __name__ == "__main__":
    main()
