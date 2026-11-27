"""Data-quality checks on the daily snapshot (public/data/rh-static.json), list of 1,000, batch 19 (ideas 901-950).

Each check is a plain function `check_<name>(ctx) -> list[dict]`: one dict per home (or per country/portal) that needs a
look, with `slug` (when it is a home), `why` (one short line in plain English) and the values that prove it. Nothing here
changes data: the checks only read the snapshot (and, when given, yesterday's snapshot, the build output dist/ and the
translated titles). Hard checks (HARD below) make `audit.py --strict` exit 1; the others are review lists.

Python standard library only, so it runs in rh-og-cards and in quality.yml without installing anything.
"""
from __future__ import annotations

import json, os, re, statistics, unicodedata
from collections import Counter, defaultdict
from datetime import datetime, timezone
from urllib.parse import urlparse

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# The closed list of kinds the site knows (same as scripts/build_static.py KINDS and the database check constraint of
# 20261121150000_property_type.sql). Idea 909.
KINDS = ("studio", "penthouse", "duplex", "flat", "loft", "townhouse", "villa", "bungalow", "farmhouse", "cottage", "chalet", "cabin", "house", "home")
FLAT_KINDS = {"studio", "penthouse", "duplex", "flat", "loft"}
# Other names a portal or an old import may use, mapped onto the closed list.
KIND_ALIASES = {
    "apartment": "flat", "apartamento": "flat", "piso": "flat", "appartamento": "flat", "appartement": "flat", "wohnung": "flat",
    "condo": "flat", "condominium": "flat", "estudio": "studio", "monolocale": "studio", "atico": "penthouse", "ático": "penthouse",
    "attico": "penthouse", "duplex": "duplex", "dúplex": "duplex", "maisonette": "duplex", "casa": "house", "maison": "house",
    "haus": "house", "detached": "house", "semi-detached": "house", "single family": "house", "single-family": "house",
    "terraced": "townhouse", "town house": "townhouse", "adosado": "townhouse", "adosada": "townhouse", "rowhouse": "townhouse",
    "row house": "townhouse", "chalé": "chalet", "chale": "chalet", "cortijo": "farmhouse", "masía": "farmhouse", "masia": "farmhouse",
    "finca": "farmhouse", "farm": "farmhouse", "rustico": "farmhouse", "casale": "farmhouse", "stuga": "cottage", "sommerhus": "cottage",
    "cabaña": "cabin", "hut": "cabin", "log cabin": "cabin", "bungalow": "bungalow", "minka": "house", "akiya": "house",
    # ronda 19: house types named in titles (US, France, Japan, Greece) and Sardinian and US farm names
    "kominka": "house", "longère": "house", "longere": "house", "ranch": "house", "colonial": "house", "victorian": "house",
    "a-frame": "cabin", "mansion": "house", "homestead": "farmhouse", "stazzo": "farmhouse",
}

# Idea 922: words that promise money, in the 7 languages of the site (seo/tech/rules.ts RETURNS covers en and es).
# A title or text may *deny* a promise ("no guaranteed returns"); NEGATED skips those.
SALES_WORDS = {
    "en": r"guaranteed (returns?|yields?|income|rent(al income)?|profits?)|risk[- ]free investment|will (double|appreciate|rise in value)|rental yield|high yield|passive income|roi\b",
    "es": r"rentabilidad(es)?( garantizada)?|rentas? garantizadas?|inversión sin riesgo|se revalorizará|beneficios? asegurados?|ingresos pasivos",
    "de": r"rendite|garantierte (miete|einnahmen|rendite)|risikolose (anlage|investition)|passives einkommen|mietrendite",
    "fr": r"rendement( locatif)?|rentabilité|revenus? garantis?|investissement sans risque|revenu passif",
    "nl": r"rendement|gegarandeerde (huur|inkomsten)|risicoloze investering|passief inkomen|huurrendement",
    "pl": r"rentowność|stopa zwrotu|gwarantowany (dochód|zysk)|inwestycja bez ryzyka|dochód pasywny",
    "ru": r"доходность|гарантированн(ый|ая) (доход|прибыль)|пассивный доход|без риска",
}
NEGATED = re.compile(r"\b(no|not|without|sin|ohne|sans|zonder|bez|без|нет)\b[^.]{0,30}$", re.I)

# Idea 924: words in the advert text that change what the buyer gets.
LEGAL_FLAGS = {
    "auction": r"\b(auction|subasta|asta giudiziaria|vente aux enchères|zwangsversteigerung|veiling|licytacja)\b",
    "occupied": r"(?<!owner-)(?<!owner )\b(tenant-occupied|occupied by (a )?tenants?|tenant in place|sitting tenant|ocupada|okupada|con inquilino|occupato|occupé|vermietet)\b",
    "bare_ownership": r"\b(bare ownership|nuda propiedad|nuda proprietà|nue[- ]propriété|viager|life interest|usufruct|usufructo)\b",
    "share": r"\b(shared ownership|share of|cuota indivisa|pro indiviso|part of a (house|building) owned)\b",
}
# "not marked as occupied, rented or at auction", "sin okupas": the text says the opposite.
LEGAL_DENIED = re.compile(r"\b(not|no|never|without|sin|non|nicht|pas|geen|nie|не)\b[^.;]{0,55}$", re.I)
# Idea 925: homes only for older buyers (United States 55+ communities).
AGE_LIMIT = re.compile(r"\b(55\s*\+|55 and (over|older)|age[- ]restricted|active adult|senior (community|living)|62\s*\+|over[- ]55s?)(?!\w)", re.I)

# Idea 912: portals whose large photos carry an agency watermark (memory 18-nov and 8-nov: bienici, pisos.com).
WATERMARK_PORTALS = {"bienici.com": "agency logo on most photos", "pisos.com": "large photos carry the portal watermark"}

# Idea 927: English words that must not appear in a Spanish title (whole words, lower case).
EN_WORDS = {"with", "and", "the", "house", "home", "flat", "apartment", "bedroom", "bedrooms", "garden", "sea", "view", "views",
            "near", "for", "sale", "village", "cottage", "town", "pool", "terrace", "bathroom", "studio", "of", "in"}
# Words that are the same in Spanish or are proper names often kept.
ES_OK = {"loft", "bungalow", "chalet", "duplex", "dúplex", "golf", "resort", "spa", "town", "cottage"}  # cottage: used as is in Spanish (ronda 20)

# Idea 926: a link to the advert that lands on a list or a home page of the portal, not on one home.
SEARCH_PATH = re.compile(r"(/search|/buscar|/busqueda|/results?|/listings?/?$|/comprar/(viviendas|casas)/[^/]+/?$|/venta/[^/]+/?$|\?q=|[?&](page|sort)=)", re.I)

EURO = {"Austria", "Belgium", "Cyprus", "France", "Germany", "Greece", "Ireland", "Italy", "Montenegro", "Netherlands", "Portugal", "Slovenia", "Spain"}
HARD = {"snapshot_counts", "status_approved", "slug_stable", "snapshot_fresh"}


def load_json(path, default=None):
    try:
        with open(path, encoding="utf8") as f: return json.load(f)
    except (OSError, ValueError):
        return default


def norm(s):
    return unicodedata.normalize("NFKC", str(s or "")).strip()


def fold(s):
    s = unicodedata.normalize("NFKD", norm(s).lower())
    return "".join(c for c in s if not unicodedata.combining(c))


def parse_ts(s):
    if not s: return None
    try: return datetime.fromisoformat(str(s).replace("Z", "+00:00"))
    except ValueError: return None


class Ctx:
    """Everything a check reads. `prev` (yesterday's snapshot), `dist` and `titles` are optional."""

    def __init__(self, snap, prev=None, dist=None, titles=None, now=None, hashes=None, sizes=None):
        self.hashes, self.sizes = hashes or {}, sizes or {}
        self.snap = snap or {}
        self.rows = list(self.snap.get("rows") or [])
        self.meta = self.snap.get("meta") or {}
        self.prev = prev
        self.dist = dist
        self.titles = titles or {}
        self.now = now or datetime.now(timezone.utc)
        self._ppsqm = None

    def ppsqm_median(self):
        """Median price per m² by country, from homes that have both numbers."""
        if self._ppsqm is None:
            by = defaultdict(list)
            for r in self.rows:
                if r.get("sqm") and r.get("price_eur") and r["sqm"] >= 10: by[r.get("country")].append(r["price_eur"] / r["sqm"])
            self._ppsqm = {c: statistics.median(v) for c, v in by.items() if len(v) >= 3}
        return self._ppsqm


def _home(r, why, **kw):
    d = {"slug": r.get("slug"), "country": r.get("country"), "why": why}
    d.update(kw)
    return d


# ---- 921 / 940 / 947 / 943 / 944: hard checks ----------------------------------------------------------------

def check_snapshot_counts(ctx):
    """921: global_deals equals the number of rows and countries_count adds up to it, country by country."""
    out, m = [], ctx.meta
    n = len(ctx.rows)
    if m.get("global_deals") is not None and m["global_deals"] != n:
        out.append({"why": f"meta.global_deals says {m['global_deals']}, the snapshot has {n} homes"})
    cc = m.get("countries_count") or {}
    real = Counter(r.get("country") for r in ctx.rows)
    if cc and sum(cc.values()) != n:
        out.append({"why": f"countries_count adds up to {sum(cc.values())}, not {n}"})
    for c in sorted(set(cc) | set(real), key=str):
        if cc and cc.get(c, 0) != real.get(c, 0):
            out.append({"country": c, "why": f"countries_count says {cc.get(c, 0)}, rows say {real.get(c, 0)}"})
    if m.get("countries") and sorted(m["countries"]) != sorted(c for c in real if c):
        out.append({"why": "meta.countries is not the list of countries in the rows"})
    return out


def check_status_approved(ctx):
    """940: every published row is approved. The snapshot only holds approved homes; a row that carries a status (or
    a reject reason) other than approved, or that has no approval and no publish date, should not be there."""
    out = []
    for r in ctx.rows:
        st = r.get("status")
        if st is not None and st != "approved": out.append(_home(r, f"status is {st!r}"))
        elif r.get("reject_reason"): out.append(_home(r, "has a reject reason"))
        elif not r.get("approved_at") and not r.get("publish_at") and r.get("rank") is None: out.append(_home(r, "no approval date, no publish date and no rank"))
    return out


def check_snapshot_fresh(ctx, max_hours=30):
    """947: the snapshot was generated within the last 30 hours (rh-og-cards runs daily)."""
    g = parse_ts(ctx.snap.get("generated"))
    if not g: return [{"why": "snapshot has no generated date"}]
    h = (ctx.now - g).total_seconds() / 3600
    return [{"why": f"snapshot is {h:.0f} hours old (generated {ctx.snap['generated']})", "hours": round(h, 1)}] if h > max_hours else []


def check_slug_stable(ctx):
    """943: a home that was in yesterday's snapshot keeps its slug (same id, same slug), or links break."""
    if not ctx.prev: return []
    before = {r.get("id"): r.get("slug") for r in ctx.prev.get("rows") or [] if r.get("id")}
    out = []
    for r in ctx.rows:
        old = before.get(r.get("id"))
        if old and old != r.get("slug"): out.append(_home(r, f"slug changed from {old}", old=old))
    return out


def check_slug_price(ctx):
    """944: slugs that carry a price (…-85000, …-38k-…). Not an error while slugs never change (943 guards that), but a
    price change must not lead to a new slug; if one ever does, a 301 from the old slug goes in seo/redirects-seed.json."""
    out = []
    for r in ctx.rows:
        s = str(r.get("slug") or "")
        m = re.search(r"-(\d{1,4})k(?:-|$)", s)
        if not m or r.get("country") not in EURO: continue
        num = int(m.group(1)) * 1000
        p = r.get("price_eur") or 0
        if p and abs(num - p) / p > 0.15:
            out.append(_home(r, f"slug says {num:,} but the price is {p:,} €", slug_price=num, price_eur=p))
    return out


# ---- 901-905, 914, 916-918, 928: missing data ------------------------------------------------------------------

def check_missing(ctx):
    """Counts and lists of homes missing each field (901 m²/bedrooms, 902 coordinates, 903 tax, 904 fee, 905 why
    cheap, 914 approved_at, 916 risks, 917 airport, 918 nearby, 928 verified_at)."""
    fields = {"sqm": "901", "bedrooms": "901", "lat": "902", "tax_annual": "903", "why_cheap": "905", "why_cheap_es": "905",
              "approved_at": "914", "risks": "916", "airport_km": "917", "nearby": "918", "verified_at": "928"}
    out = []
    for f, idea in fields.items():
        miss = [r for r in ctx.rows if r.get(f) in (None, "", [], {})]
        if f == "bedrooms": miss = [r for r in miss if r.get("property_type") != "studio"]
        out.append({"field": f, "idea": idea, "missing": len(miss), "of": len(ctx.rows), "slugs": [r.get("slug") for r in miss][:400]})
    flats_no_fee = [r for r in ctx.rows if r.get("property_type") in FLAT_KINDS and r.get("hoa_monthly") is None and not r.get("hoa_unknown")]
    out.append({"field": "hoa (flats without fee and not marked unknown)", "idea": "904", "missing": len(flats_no_fee), "of": len(ctx.rows), "slugs": [r.get("slug") for r in flats_no_fee][:400]})
    return out


# ---- 906, 923: numbers out of range -------------------------------------------------------------------------------

def check_ppsqm_outliers(ctx):
    """906: price per m² below 10 % or above 300 % of the country median of our homes."""
    med, out = ctx.ppsqm_median(), []
    for r in ctx.rows:
        m = med.get(r.get("country"))
        if not m or not r.get("sqm") or not r.get("price_eur") or r["sqm"] < 10: continue
        v = r["price_eur"] / r["sqm"]
        if v < 0.10 * m or v > 3.0 * m:
            out.append(_home(r, f"{v:,.0f} €/m² against a country median of {m:,.0f} €/m²", eur_m2=round(v), median=round(m)))
    return out


def check_surface(ctx):
    """923: surface under 15 m², over 2,000 m², or bedrooms that do not fit in it (more than one per 12 m²)."""
    out = []
    for r in ctx.rows:
        s, b = r.get("sqm"), r.get("bedrooms")
        if s and s < 15: out.append(_home(r, f"{s} m² is too small for a home", sqm=s))
        elif s and s > 2000: out.append(_home(r, f"{s} m² looks like the plot, not the home", sqm=s))
        elif s and b and b > 0 and s / b < 12: out.append(_home(r, f"{b} bedrooms in {s} m²", sqm=s, bedrooms=b))
    return out


# ---- 907, 908: duplicates -----------------------------------------------------------------------------------------

def _photo_key(u):
    """The photo file without size suffixes or query (…-0.webp, ?width=1280)."""
    p = urlparse(str(u)).path.lower()
    return re.sub(r"(-\d{2,4}w|_\d{2,4}x\d{2,4}|-thumb|@2x)(?=\.\w+$)", "", p)


def check_photo_dupes(ctx, hashes=None):
    """907: the same photo used by two different homes. Compares photo addresses outside our own /finds/<slug>-n files
    (those are named after the home); with `hashes` ({url: 64-bit dHash int}, from scripts/quality/photo_hash.py),
    also near-identical photos (Hamming distance <= 6)."""
    hashes = hashes or ctx.hashes
    by = defaultdict(set)
    for r in ctx.rows:
        for u in r.get("image_urls") or []:
            k = _photo_key(u)
            if re.search(r"/finds/[a-z0-9-]+-\d+\.\w+$", k) and r.get("slug", "") in k: continue
            by[k].add(r.get("slug"))
    out = [{"slugs": sorted(s), "photo": k, "why": "same photo address in different homes"} for k, s in by.items() if len(s) > 1]
    if hashes:
        owner = {}
        for r in ctx.rows:
            for u in r.get("image_urls") or []:
                if u in hashes: owner.setdefault(u, r.get("slug"))
        items = [(u, h, owner.get(u)) for u, h in hashes.items() if owner.get(u)]
        buckets = defaultdict(list)
        for u, h, s in items: buckets[h >> 48].append((u, h, s))  # coarse bucket by the top 16 bits
        seen = set()
        for b in buckets.values():
            for i in range(len(b)):
                for j in range(i + 1, len(b)):
                    (u1, h1, s1), (u2, h2, s2) = b[i], b[j]
                    if s1 != s2 and bin(h1 ^ h2).count("1") <= 6 and (s1, s2) not in seen:
                        seen.add((s1, s2)); out.append({"slugs": sorted([s1, s2]), "photo": u1, "photo2": u2, "why": "near-identical photos in different homes"})
    return out


def check_same_home(ctx):
    """908: the same home twice: same advert address (or source key), or same country, same title and a price within 3 %,
    or coordinates within 30 m with the same price and size. Same rules as sameHomeOnce in live search."""
    out, by_src, by_title = [], defaultdict(list), defaultdict(list)
    for r in ctx.rows:
        if r.get("source_url"):
            u = urlparse(r["source_url"]); by_src[(u.netloc.lower().removeprefix("www."), u.path.rstrip("/").lower())].append(r)
        by_title[(r.get("country"), fold(r.get("title")))].append(r)
    for k, rs in by_src.items():
        if len(rs) > 1: out.append({"slugs": sorted(x["slug"] for x in rs), "why": "same advert address", "source": "/".join(k)})
    for k, rs in by_title.items():
        if len(rs) < 2: continue
        rs = sorted(rs, key=lambda x: x.get("price_eur") or 0)
        for a, b in zip(rs, rs[1:]):
            pa, pb = a.get("price_eur") or 0, b.get("price_eur") or 0
            if pa and pb and abs(pa - pb) / max(pa, pb) <= 0.03:
                out.append({"slugs": sorted([a["slug"], b["slug"]]), "why": "same title and nearly the same price"})
    pts = [r for r in ctx.rows if r.get("lat") and r.get("lng")]
    grid = defaultdict(list)
    for r in pts: grid[(round(r["lat"], 3), round(r["lng"], 3))].append(r)
    for rs in grid.values():
        for i in range(len(rs)):
            for j in range(i + 1, len(rs)):
                a, b = rs[i], rs[j]
                if a.get("price_eur") == b.get("price_eur") and a.get("sqm") == b.get("sqm") and a.get("price_eur"):
                    out.append({"slugs": sorted([a["slug"], b["slug"]]), "why": "same place, same price and same size"})
    uniq, keyset = [], set()
    for o in out:
        k = tuple(o["slugs"])
        if k not in keyset: keyset.add(k); uniq.append(o)
    return uniq


# ---- 909, 910: normalisation --------------------------------------------------------------------------------------

def normal_kind(value):
    """909: map any kind name onto the closed list, or None."""
    k = fold(value)
    if not k: return None
    if k in KINDS: return k
    if k in KIND_ALIASES: return KIND_ALIASES[k]
    for alias, kind in sorted(KIND_ALIASES.items(), key=lambda kv: -len(kv[0])):
        if re.search(r"\b" + re.escape(fold(alias)) + r"\b", k): return kind
    return None


def kind_from_title(title):
    """The kind the English title names (first match, longest names first), for homes without property_type."""
    t = fold(title)
    for name in sorted(set(KINDS) | set(KIND_ALIASES), key=len, reverse=True):
        if re.search(r"\b" + re.escape(fold(name)) + r"s?\b", t):
            return name if name in KINDS else KIND_ALIASES[name]
    return None


def check_kinds(ctx):
    """909: property_type outside the closed list, or missing (with the kind the title suggests)."""
    out = []
    for r in ctx.rows:
        k = r.get("property_type")
        if k is None:
            out.append(_home(r, "no property_type", suggest=kind_from_title(r.get("title"))))
        elif k not in KINDS:
            out.append(_home(r, f"property_type {k!r} is not in the list", suggest=normal_kind(k)))
    return out


def place_key(name):
    return re.sub(r"[^a-z0-9]+", " ", fold(name)).strip()


def check_places(ctx):
    """910: the same place written in different ways (case, accents, spaces). Spellings in another language (Seville and
    Sevilla) are joined through scripts/quality/places.json {"aliases": {"sevilla": "seville"}}."""
    out, by = [], defaultdict(set)
    table = load_json(os.path.join(ROOT, "scripts", "quality", "places.json"), {}) or {}
    for r in ctx.rows:
        name = norm(r.get("location_name"))
        if not name: out.append(_home(r, "no location_name")); continue
        if name != str(r.get("location_name")): out.append(_home(r, "location_name has extra spaces or odd characters"))
        if name.isupper() or name.islower(): out.append(_home(r, f"location_name {name!r} is all upper or lower case"))
        parts = [p.strip() for p in name.split(",")]
        alias = {place_key(a): a for a in table.get("aliases", {})}
        for p in parts: by[alias.get(place_key(p), place_key(p))].add(p)
    for k, spellings in by.items():
        if len(spellings) > 1: out.append({"place": k, "spellings": sorted(spellings), "why": "one place written in several ways"})
    return out


# ---- 911, 912: photos ---------------------------------------------------------------------------------------------

def check_photos(ctx, min_photos=5, sizes=None):
    """911: at least 5 photos; with `sizes` ({url: (w, h)}), the main photo at least 1,000 px wide.
    912: homes from portals whose photos carry a watermark."""
    sizes = sizes or ctx.sizes
    out = []
    for r in ctx.rows:
        n = len(r.get("image_urls") or [])
        if n < min_photos: out.append(_home(r, f"{n} photos (at least {min_photos} wanted)", photos=n, idea="911"))
        if sizes and r.get("image_urls"):
            w = (sizes.get(r["image_urls"][0]) or (0, 0))[0]
            if w and w < 1000: out.append(_home(r, f"main photo is {w} px wide", width=w, idea="911"))
        d = str(r.get("source_domain") or "").lower().removeprefix("www.")
        if d in WATERMARK_PORTALS: out.append(_home(r, f"{d}: {WATERMARK_PORTALS[d]}", idea="912"))
    return out


# ---- 915, 932, 939, 938, 930: review lists -------------------------------------------------------------------------

def check_unconfirmed(ctx, days=30):
    """915: homes the nightly check has not confirmed in 30 days (same rule as src/community/n9/status.ts isUnconfirmed:
    not gone and listed 4+ days), with the portal, so a person can look for a second source."""
    out = []
    for r in ctx.rows:
        if r.get("src_last") == "gone": continue
        ok = parse_ts(r.get("src_ok_at"))
        pub = parse_ts(r.get("publish_at") or r.get("approved_at"))
        if pub and (ctx.now - pub).days < 4: continue
        if not ok or (ctx.now - ok).days >= days:
            out.append(_home(r, "not confirmed online in 30 days", portal=r.get("source_domain"), last=r.get("src_last")))
    return out


def check_top_scores(ctx, over=95):
    """932: homes graded above 95, to look at by hand once a month (they are the ones shown most)."""
    return [_home(r, f"grade {r.get('nota')}", nota=r.get("nota")) for r in ctx.rows if (r.get("nota") or 0) > over]


def check_gone_by_portal(ctx):
    """939: which portals give most homes reported gone, and how many of those went within 30 days of publishing."""
    tot, gone, fast = Counter(), Counter(), Counter()
    for r in ctx.rows:
        d = str(r.get("source_domain") or "?").lower()
        tot[d] += 1
        if r.get("src_last") == "gone":
            gone[d] += 1
            pub, ok = parse_ts(r.get("publish_at") or r.get("approved_at")), parse_ts(r.get("src_ok_at"))
            if pub and ok and (ok - pub).days < 30: fast[d] += 1
    return [{"portal": d, "homes": tot[d], "gone": gone[d], "gone_within_30_days": fast[d], "share": round(gone[d] / tot[d], 2), "why": f"{gone[d]} of {tot[d]} homes reported gone"}
            for d in sorted(gone, key=lambda d: (-gone[d], d))]


def _region(r):
    parts = [p.strip() for p in str(r.get("location_name") or "").split(",") if p.strip()]
    return parts[-2] if len(parts) >= 2 else (parts[0] if parts else "?")


def check_agency_bias(ctx, share=0.6, min_homes=5):
    """938: one source (portal or Instagram account) gives 60 % or more of a region's homes, in regions with 5+ homes."""
    by = defaultdict(Counter)
    for r in ctx.rows: by[(r.get("country"), _region(r))][r.get("hunter_handle") or r.get("source_domain") or "?"] += 1
    out = []
    for (c, reg), cnt in sorted(by.items(), key=lambda kv: str(kv[0])):
        n = sum(cnt.values())
        src, k = cnt.most_common(1)[0]
        if n >= min_homes and k / n >= share:
            out.append({"country": c, "region": reg, "source": src, "homes": n, "from_source": k, "why": f"{k} of {n} homes in {reg} come from {src}"})
    return out


def check_thin_countries(ctx, floor=3):
    """930: countries with fewer than 3 homes (listing pages and data tests need 3)."""
    cnt = Counter(r.get("country") for r in ctx.rows)
    return [{"country": c, "homes": n, "why": f"only {n} home{'s' if n != 1 else ''}"} for c, n in sorted(cnt.items(), key=lambda kv: (kv[1], str(kv[0]))) if n < floor]


# ---- 922, 924, 925, 926, 927, 941, 945: texts --------------------------------------------------------------------

def _sales_hits(text, lang):
    hits = []
    for m in re.finditer(r"\b(" + SALES_WORDS[lang] + r")", text or "", re.I):
        if not NEGATED.search((text or "")[max(0, m.start() - 40):m.start()]): hits.append(m.group(0))
    return hits


def check_sales_words(ctx):
    """922: titles and texts in the 7 languages without words that promise money (rentas, rentabilidad, Rendite...)."""
    out = []
    for r in ctx.rows:
        for f, lang in (("title", "en"), ("why_great", "en"), ("pick_note", "en"), ("title_es", "es"), ("why_great_es", "es"), ("why_cheap_es", "es")):
            h = _sales_hits(r.get(f), lang)
            if h: out.append(_home(r, f"{f}: {', '.join(h)}", field=f))
    for lang, t in ctx.titles.items():
        for slug, v in t.items():
            h = _sales_hits(v.get("t") if isinstance(v, dict) else v, lang)
            if h: out.append({"slug": slug, "why": f"title in {lang}: {', '.join(h)}", "field": f"titles.{lang}"})
    return out


def check_legal_flags(ctx):
    """924 and 925: auction, occupied, bare ownership, share of a home, 55+ only; the home page must say it."""
    out = []
    for r in ctx.rows:
        text = " ".join(str(r.get(f) or "") for f in ("title", "why_great", "why_cheap", "costs_note", "pick_note", "verified_note"))
        for flag, rx in LEGAL_FLAGS.items():
            ms = [m for m in re.finditer(rx, text, re.I) if not LEGAL_DENIED.search(text[max(0, m.start() - 60):m.start()])]
            if ms: out.append(_home(r, f"text mentions {flag.replace('_', ' ')}", flag=flag, idea="924"))
        if r.get("country") in ("United States", "Canada") and AGE_LIMIT.search(text):
            out.append(_home(r, "55+ community", flag="age_55", idea="925"))
    return out


def check_source_links(ctx):
    """926: the link to the original advert points at one home, not at the portal's home page or a search page."""
    out = []
    for r in ctx.rows:
        u = r.get("source_url")
        if not u: continue
        p = urlparse(u)
        if p.scheme not in ("http", "https") or not p.netloc: out.append(_home(r, "advert link is not a web address", url=u)); continue
        if p.path in ("", "/") and not p.query: out.append(_home(r, "advert link is the portal's home page", url=u)); continue
        if SEARCH_PATH.search(p.path + ("?" + p.query if p.query else "")) and not re.search(r"\d{5,}", p.path):
            out.append(_home(r, "advert link looks like a search page", url=u))
    return out


def check_es_titles(ctx):
    """927: Spanish titles without English words."""
    out = []
    for r in ctx.rows:
        t = r.get("title_es")
        if not t: continue
        # ronda 20: a capitalised word after the first is part of a name ("Leitrim Village", "Savage House")
        t = re.sub(r"\btiny houses?\b", "", t, flags=re.I)  # a loan phrase in Spanish too
        names = {w.lower() for w in re.findall(r"(?<=\s)[A-ZÁÉÍÓÚÑ][a-záéíóúñü]+", t)}
        words = {w for w in re.findall(r"[a-záéíóúñü]+", t.lower())} - names
        bad = sorted((words & EN_WORDS) - ES_OK)
        bad = [w for w in bad if not (w in {"of", "in", "for"} and len(words) > 8)]  # short words inside proper names
        if bad: out.append(_home(r, f"Spanish title has English words: {', '.join(bad)}", title_es=t))
    return out


ZERO_BED = re.compile(r"\b0[- ]?(?:bed|bedroom|br)s?\b|\bde 0 dormitorios?\b|\bnull\b|\bundefined\b|\bNaN\b", re.I)


def check_title_junk(ctx):
    """Ronda 18 of RealHunt 100/100: a title with "0-bed", "de 0 dormitorios", null, undefined or NaN in it."""
    out = []
    for r in ctx.rows:
        for k in ("title", "title_es"):
            t = r.get(k) or ""
            if ZERO_BED.search(t): out.append(_home(r, f"{k} has a zero bedroom count or an empty value in it", **{k: t}))
    return out


def check_why_great_numbers(ctx):
    """941: the price, m² and bedrooms written in why_great match the home's data. A € amount that differs by more than
    5 % from the price goes to review, unless the words before it say it is an old price, a median or a budget."""
    out = []
    for r in ctx.rows:
        t = str(r.get("why_great") or "")
        p = r.get("price_eur")
        for m in re.finditer(r"€\s?(\d{1,3}(?:,\d{3})+|\d+)(k)?\b", t):
            v = float(m.group(1).replace(",", "")) * (1000 if m.group(2) else 1)
            if p and v >= 10000 and abs(v - p) / p > 0.05 and v < p * 3 and not re.search(r"(was|from|down|reduced|less|under|below|median|budget|cut)\W{0,20}$", t[max(0, m.start() - 25):m.start()], re.I):
                out.append(_home(r, f"text says €{v:,.0f}, price is €{p:,}", said=v, price_eur=p))
        b = r.get("bedrooms")
        for m in re.finditer(r"\b(\d{1,2})[- ]bed(room)?s?\b", t, re.I):
            if b is not None and int(m.group(1)) != b: out.append(_home(r, f"text says {m.group(1)} bedrooms, data says {b}", said=int(m.group(1)), bedrooms=b))
    return out


def check_translations(ctx):
    """945: homes without a title in a language (Spanish in the snapshot; de, fr, nl, pl, ru in titles.<lang>.json)."""
    out = []
    for r in ctx.rows:
        miss = []
        if not r.get("title_es"): miss.append("es")
        if not r.get("why_great_es") and r.get("why_great"): miss.append("es text")
        for lang, t in ctx.titles.items():
            if r.get("slug") not in t: miss.append(lang)
        if miss: out.append(_home(r, "no " + ", ".join(miss), missing=miss))
    return out


# ---- 948, 949: against the build output (dist/) ------------------------------------------------------------------

def check_gone_out_of_build(ctx):
    """948: homes reported gone are not in listing pages, feeds or sitemaps of the same build. Needs `dist`."""
    if not ctx.dist or not os.path.isdir(ctx.dist): return []
    gone = {r["slug"] for r in ctx.rows if r.get("src_last") == "gone" and r.get("slug")}
    if not gone: return []
    out, hits = [], defaultdict(set)
    targets = []
    for name in os.listdir(ctx.dist):
        if name.startswith("sitemap") and name.endswith(".xml") or name in ("feed.xml", "rss.xml"): targets.append(os.path.join(ctx.dist, name))
    for sub in ("homes", "es/homes"):
        base = os.path.join(ctx.dist, sub)
        for dp, _, fs in os.walk(base):
            targets += [os.path.join(dp, f) for f in fs if f.endswith(".html")]
    rx = re.compile(r"/deal/([A-Za-z0-9_-]+)")
    for path in targets:
        try: txt = open(path, encoding="utf8", errors="replace").read()
        except OSError: continue
        for s in set(rx.findall(txt)) & gone: hits[s].add(os.path.relpath(path, ctx.dist))
    for s, where in sorted(hits.items()):
        out.append({"slug": s, "why": f"reported gone but still in {len(where)} file(s)", "files": sorted(where)[:6]})
    return out


def check_research_medians(ctx):
    """949: the median price per country in /research (dist/research/*.csv with country and median columns) equals the
    median of our homes in that country (the listing pages compute it from the same rows). Needs `dist`."""
    if not ctx.dist: return []
    import csv
    ours = defaultdict(list)
    for r in ctx.rows:
        if r.get("price_eur"): ours[r.get("country")].append(r["price_eur"])
    med = {c: statistics.median(v) for c, v in ours.items()}
    out, base = [], os.path.join(ctx.dist, "research")
    if not os.path.isdir(base): return []
    for f in sorted(os.listdir(base)):
        if not f.endswith(".csv"): continue
        try: rows = list(csv.DictReader(open(os.path.join(base, f), encoding="utf8")))
        except (OSError, csv.Error): continue
        if not rows: continue
        cols = {k.lower(): k for k in rows[0]}
        ck = cols.get("country"); mk = next((cols[k] for k in cols if k in ("median_price_eur", "median_eur", "median_price")), None)
        if not ck or not mk: continue
        for row in rows:
            try: v = float(row[mk])
            except (TypeError, ValueError): continue
            m = med.get(row[ck])
            if m and abs(v - m) / m > 0.01: out.append({"country": row[ck], "file": f, "why": f"{f} says {v:,.0f} €, homes give {m:,.0f} €", "research": v, "homes": m})
    return out


CHECKS = [
    ("snapshot_counts", "921", check_snapshot_counts), ("status_approved", "940", check_status_approved),
    ("snapshot_fresh", "947", check_snapshot_fresh), ("slug_stable", "943", check_slug_stable), ("slug_price", "944", check_slug_price),
    ("missing", "901-905, 914, 916-918, 928", check_missing), ("ppsqm_outliers", "906", check_ppsqm_outliers),
    ("photo_dupes", "907", check_photo_dupes), ("same_home", "908", check_same_home), ("kinds", "909", check_kinds),
    ("places", "910", check_places), ("photos", "911, 912", check_photos), ("unconfirmed", "915", check_unconfirmed),
    ("sales_words", "922", check_sales_words), ("surface", "923", check_surface), ("legal_flags", "924, 925", check_legal_flags),
    ("source_links", "926", check_source_links), ("es_titles", "927", check_es_titles), ("title_junk", "r18", check_title_junk), ("thin_countries", "930", check_thin_countries),
    ("top_scores", "932", check_top_scores), ("agency_bias", "938", check_agency_bias), ("gone_by_portal", "939", check_gone_by_portal),
    ("why_great_numbers", "941", check_why_great_numbers), ("translations", "945", check_translations),
    ("gone_out_of_build", "948", check_gone_out_of_build), ("research_medians", "949", check_research_medians),
]


def run_all(ctx, only=None):
    res = {}
    for name, idea, fn in CHECKS:
        if only and name not in only: continue
        try: items = fn(ctx)
        except Exception as e:  # one broken check must not hide the others
            items = [{"why": f"check failed: {type(e).__name__}: {e}"}]
        res[name] = {"idea": idea, "hard": name in HARD, "count": len(items) if name != "missing" else sum(i["missing"] for i in items), "items": items}
    return res
