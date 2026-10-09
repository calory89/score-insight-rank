#!/usr/bin/env python3
"""RealHunt search landing pages (/cheap-houses/<slug>).

One page per search people actually type: "cheap houses by the sea in Italy", "houses under 50000",
"cabins in Sweden"... Built from the live, published homes, so every page lists real homes and only
exists when at least 3 homes match. Writes:
  src/data/search-pages.json   read by the app (grid, intro, FAQ)
  src/data/search-static.json  plain HTML per page, injected by vite.config.ts at build time so
                               search engines and link previews see the content without JavaScript
Runs every day from .github/workflows/rh-og-cards.yml, right after og_cards.py.
Local test: python3 scripts/search_pages.py --cache path/to/rows.json
"""
import json, os, re, sys, statistics, urllib.request, html
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUPA = "https://nylmhdtlshhtjkuvfbms.supabase.co"
KEY = os.environ.get("RH_ANON_KEY") or open(os.path.join(ROOT, "scripts", "anon.key")).read().strip()
SITE = "https://realhunt.co"
MIN_HOMES = 3

def rpc(fn, args):
    req = urllib.request.Request(f"{SUPA}/rest/v1/rpc/{fn}", data=json.dumps(args).encode(),
        headers={"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(req, timeout=60))

def load_rows():
    if "--cache" in sys.argv:
        return json.load(open(sys.argv[sys.argv.index("--cache") + 1]))
    rows, off = [], 0
    while True:
        d = rpc("community_feed", {"p": {"scope": "all", "limit": 100, "offset": off}})
        rows += d["rows"]; off += 100
        if off >= d["total"] or not d["rows"]: break
    for r in rows:
        try: r["nearby"] = rpc("community_nearby", {"p_slug": r["slug"]})
        except Exception: r["nearby"] = None
    return rows

def costs():
    src = open(os.path.join(ROOT, "src", "lib", "rh.ts"), encoding="utf8").read()
    block = re.search(r"export const COSTS[^=]*=\s*\{(.*?)\n\};", src, re.S).group(1)
    out = {}
    for m in re.finditer(r'^\s*"?([A-Za-z ]+?)"?\s*:\s*\{\s*pct:\s*([\d.]+),\s*fixed:\s*(\d+),\s*note:\s*"(.*?)"\s*\}', block, re.M):
        out[m.group(1)] = {"pct": float(m.group(2)), "fixed": int(m.group(3)), "note": m.group(4)}
    return out

def money(n): return "€" + f"{int(round(n)):,}"
def nice_title(d):
    t = re.sub(r"^\s*€\s?[\d.,]+\s*(k\b)?\s*[·\-–:|]\s*", "", d.get("title") or "", flags=re.I).strip()
    if not t or re.match(r"^property\s*[-–]?\s*\w*$", t, re.I):
        t = f"{str(d['sqm']) + ' m² home' if d.get('sqm') else 'Home'} in {d.get('location_name') or d.get('country')}"
    return t
def sea_text(d):
    t = text(d)
    m = re.search(r"(\d+)\s*(min|minutes|hour|hours|h)\b[^.]{0,12}?\b(to|from)\s+the\s+(beach|sea|coast)", t, re.I)
    if m: return m.group(2).lower().startswith("min") and int(m.group(1)) <= 15
    return bool(re.search(r"\b(sea|seaside|beach|coast|ocean)\b", t, re.I))
def sea_minutes(d):
    m = re.search(r"(\d+)\s*(min|minutes|hour|hours|h)\b[^.]{0,12}?\b(to|from)\s+the\s+(beach|sea|coast)", text(d), re.I)
    return None if not m else (int(m.group(1)) if m.group(2).lower().startswith("min") else 60 * int(m.group(1)))
def by_sea(d):
    mins = sea_minutes(d)
    if mins is not None: return mins <= 15
    if d.get("category") == "beach" and (near(d, "sea_km") is None or near(d, "sea_km") <= 15 or sea_text(d)): return True
    if near(d, "sea_km") is not None: return near(d, "sea_km") <= 5
    return sea_text(d)
def text(d): return f"{d.get('title') or ''} {d.get('why_great') or ''} {d.get('location_name') or ''}"
def near(d, k):
    n = d.get("nearby") or {}
    v = n.get(k)
    return v.get("km") if isinstance(v, dict) else v
def region(d):
    parts = [p.strip() for p in (d.get("location_name") or "").split(",") if p.strip()]
    return parts[-2] if len(parts) > 1 else None
def place(d):
    parts = [p.strip() for p in (d.get("location_name") or "").split(",") if p.strip()]
    if not parts: return d.get("country") or ""
    return ", ".join(parts[:1] + ([parts[-2]] if len(parts) > 2 else []))

VIBES = [
    ("by-the-sea", "by the sea", by_sea,
     "“By the sea” means the listing is on the coast, or its map point is within 5 km of the shoreline."),
    ("near-a-lake", "near a lake", lambda d: (near(d, "lake") is not None and near(d, "lake") <= 3) or re.search(r"\blake|lakeside|lakefront|sjö", text(d), re.I),
     "“Near a lake” means lakeside in the listing, or a named lake within 3 km of the map point."),
    ("with-garden", "with a garden", lambda d: re.search(r"garden|yard|orchard", text(d), re.I), None),
    ("with-sauna", "with a sauna", lambda d: re.search(r"sauna", text(d), re.I), None),
    ("stone-houses", "made of stone", lambda d: re.search(r"\bstone\b", text(d), re.I), None),
    ("cabins-and-cottages", "cabins and cottages", lambda d: re.search(r"cabin|cottage|stuga|log house|chalet", text(d), re.I), None),
    ("with-a-terrace", "with a terrace", lambda d: re.search(r"terrace|balcony|patio|veranda", text(d), re.I), None),
    ("village-houses", "in villages", lambda d: d.get("category") == "village", None),
]
PRICES = [30000, 50000, 75000]
COUNTRY_SLUG = lambda c: re.sub(r"[^a-z0-9]+", "-", c.lower()).strip("-")
THE = {"United States": "the United States"}

def title_for(kind, label, country, price):
    where = f" in {THE.get(country, country)}" if country else ""
    if kind == "price":
        return f"Houses for Sale Under {money(price)}{where}"
    if label == "cabins and cottages":
        return f"Cheap Cabins and Cottages for Sale{where}"
    if label == "in villages":
        return f"Cheap Village Houses for Sale{where}"
    if label == "made of stone":
        return f"Cheap Stone Houses for Sale{where}"
    small = {"a", "the", "by", "with", "in", "of"}
    return f"Cheap Houses {' '.join(w if w in small else w.capitalize() for w in label.split())}{where}"

def build():
    rows = [r for r in load_rows() if r.get("price_eur") and r.get("image_urls")]
    cost = costs()
    by_country = Counter(r["country"] for r in rows if r.get("country"))
    big = [c for c, n in by_country.most_common() if n >= 5 and c in cost]
    pages = []

    def add(slug, kind, label, country, price, homes, note):
        if len(homes) < MIN_HOMES: return
        homes = sorted(homes, key=lambda d: d["price_eur"])
        ps = [d["price_eur"] for d in homes]
        cheapest = homes[0]
        med = statistics.median(ps)
        h1 = title_for(kind, label, country, price)
        intro = []
        what = (f"homes {label}" if kind == "vibe" and label not in ("cabins and cottages",) else ("cabins and cottages" if kind == "vibe" else "homes"))
        if kind == "price":
            intro.append(f"{len(homes)} {what} for sale{' in ' + THE.get(country, country) if country else ''} cost {money(price)} or less right now. The cheapest is {money(cheapest['price_eur'])}, in {place(cheapest)}, and half of them are under {money(med)}.")
        else:
            intro.append(f"There are {len(homes)} {what}{' in ' + THE.get(country, country) if country else ''} on RealHunt today, each one scored and ranked. Prices start at {money(cheapest['price_eur'])} ({place(cheapest)}) and the middle of the list sits at {money(med)}.")
        if country:
            regs = Counter(region(d) for d in homes if region(d)).most_common(3)
            regs = [r for r, n in regs if n >= 2]
            if len(regs) >= 2: intro.append(f"Most of them are in {', '.join(regs[:-1])} and {regs[-1]}.")
            elif len(regs) == 1: intro.append(f"The biggest group is in {regs[0]}.")
        else:
            cs = Counter(d["country"] for d in homes).most_common(3)
            if len(cs) >= 2:
                intro.append(f"They are spread over {len(set(d['country'] for d in homes))} countries, with the most in {THE.get(cs[0][0], cs[0][0])} ({cs[0][1]}) and {THE.get(cs[1][0], cs[1][0])} ({cs[1][1]}).")
        if note: intro.append(note)
        intro.append("A person looked at every listing before it went up. Ruins, homes that need a new roof and listings with a single photo are left out.")
        faq = []
        if country and country in cost:
            c = cost[country]
            faq.append([f"Can foreigners buy a house in {THE.get(country, country)}?", c["note"]])
            faq.append([f"How much do buying costs add to the price in {THE.get(country, country)}?",
                        f"Plan for roughly {c['pct']:g}% of the price plus about {money(c['fixed'])} in fixed fees. On a {money(med)} home that is around {money(med * c['pct'] / 100 + c['fixed'])}. Each home page on RealHunt shows the estimate for that exact price."])
        else:
            faq.append(["Can foreigners buy these homes?", "In most of the countries here, yes. Italy, Sweden, Japan, the United States and Mexico let foreigners buy homes (in Mexico, within 50 km of the coast it is done through a bank trust). Canada bans most non-Canadians from buying homes in its cities until 1 January 2027. Each home page lists the rules and costs for its country."])
        faq.append(["Are these homes ready to live in?", "That is the rule for everything we publish: no ruins, no land, no homes that clearly need major work. Old houses are fine if they have been looked after. Always get a survey before you buy."])
        faq.append(["How often is this list updated?", "Every day. Homes that sell or get reported as gone are taken down, and new ones are added after a person checks them."])
        pages.append({
            "slug": slug, "kind": kind, "country": country, "price": price, "label": label,
            "h1": h1, "title": f"{h1} ({len(homes)} Listed) · RealHunt",
            "desc": f"{len(homes)} real {'homes' if kind == 'price' else what}{' in ' + THE.get(country, country) if country else ''}{(' under ' + money(price) + ',') if price else ','} from {money(cheapest['price_eur'])}. Checked by people, updated daily.",
            "intro": intro, "faq": faq, "count": len(homes), "min": ps[0], "median": med,
            "homes": [d["slug"] for d in homes[:60]],
        })

    for key, label, test, note in VIBES:
        add(key, "vibe", label, None, None, [d for d in rows if test(d)], note)
        for c in big:
            add(f"{key}-in-{COUNTRY_SLUG(c)}", "vibe", label, c, None, [d for d in rows if d.get("country") == c and test(d)], note)
    for p in PRICES:
        add(f"under-{p}", "price", None, None, p, [d for d in rows if d["price_eur"] <= p], None)
        for c in big:
            homes = [d for d in rows if d.get("country") == c and d["price_eur"] <= p]
            if len(homes) < by_country[c]: add(f"under-{p}-in-{COUNTRY_SLUG(c)}", "price", None, c, p, homes, None)
    # related links: same country first, then same vibe elsewhere
    for pg in pages:
        same_c = [p["slug"] for p in pages if p is not pg and p["country"] == pg["country"]]
        same_v = [p["slug"] for p in pages if p is not pg and p["label"] == pg["label"] and p["kind"] == pg["kind"] and p["price"] == pg["price"]]
        seen, rel = set(), []
        for s in same_c[:5] + same_v[:5]:
            if s not in seen: seen.add(s); rel.append(s)
        pg["related"] = rel[:8]

    used = {s for p in pages for s in p["homes"]}
    homes = {d["slug"]: {"t": nice_title(d), "p": d["price_eur"], "img": d["image_urls"][0], "place": place(d), "c": d.get("country"), "sqm": d.get("sqm"), "bd": d.get("bedrooms")} for d in rows if d["slug"] in used}
    static = {}
    titles = {p["slug"]: p["h1"] for p in pages}
    e = html.escape
    for p in pages:
        cards = "".join(f'<li><a href="/deal/{e(s)}"><img src="{e(homes[s]["img"])}" alt="{e(homes[s]["t"])}" loading="lazy" width="320" height="240"><strong>{e(money(homes[s]["p"]))}</strong> {e(homes[s]["t"])} <span>{e(homes[s]["place"])}</span></a></li>' for s in p["homes"])
        faq = "".join(f"<h3>{e(q)}</h3><p>{e(a)}</p>" for q, a in p["faq"])
        rel = "".join(f'<li><a href="/cheap-houses/{e(s)}">{e(titles[s])}</a></li>' for s in p["related"])
        static[p["slug"]] = (f'<main class="rh-static"><nav><a href="/">RealHunt</a> › <a href="/cheap-houses">Cheap houses</a></nav><h1>{e(p["h1"])}</h1>'
            + "".join(f"<p>{e(x)}</p>" for x in p["intro"]) + f'<ul class="rh-static-grid">{cards}</ul><h2>Questions people ask</h2>{faq}<h2>Related searches</h2><ul>{rel}</ul></main>')
    hub = "".join(f'<li><a href="/cheap-houses/{e(p["slug"])}">{e(p["h1"])}</a> ({p["count"]})</li>' for p in pages)
    static["__index__"] = f'<main class="rh-static"><h1>Cheap houses for sale, by what you are looking for</h1><p>Every page lists real homes, scored and ranked best first, that a person has checked. Updated daily.</p><ul>{hub}</ul></main>'

    os.makedirs(os.path.join(ROOT, "src", "data"), exist_ok=True)
    json.dump({"updated": __import__("datetime").date.today().isoformat(), "pages": pages, "homes": homes}, open(os.path.join(ROOT, "src", "data", "search-pages.json"), "w"), ensure_ascii=False, separators=(",", ":"))
    json.dump(static, open(os.path.join(ROOT, "src", "data", "search-static.json"), "w"), ensure_ascii=False, separators=(",", ":"))
    print(f"{len(pages)} search pages from {len(rows)} homes")

if __name__ == "__main__":
    build()
