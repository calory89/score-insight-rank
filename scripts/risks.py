#!/usr/bin/env python3
"""Noise and flood risk for every approved home (8-nov-2026), stored in realhunt.community_deals.risks.

    python3 scripts/risks.py                 # every approved home with coordinates
    python3 scripts/risks.py --missing       # only homes without risks yet (or whose roads were never checked)
    python3 scripts/risks.py --slug a,b      # just these homes
    python3 scripts/risks.py --dry           # compute and print, write nothing (also writes --out if given)

Writing needs a Supabase personal access token in SUPABASE_ACCESS_TOKEN (or --token-file). It only ever sets the
`risks` column. After a write it clears realhunt.rh_cache so community_feed returns the new values at once.

Free public sources, no API keys:
  NOISE  roads and railways: OpenStreetMap through the Overpass API (one query per home, around:2000 m, polite
         pauses and retries). Airports: OurAirports open data (runway ends of large airports and of medium
         airports with scheduled flights), distance computed locally.
  FLOOD  United States: FEMA National Flood Hazard Layer (NFHL MapServer layer 28, query by point).
         Elsewhere there is no free per-point official service that works across countries, so we give a
         clearly labelled rough indicator: ground height (Open-Meteo elevation API, Copernicus 90 m DEM) and the
         distance to the coast and to rivers (Natural Earth 1:10m), plus a link to the official national map.

If Overpass cannot be reached, the airport part is still computed and roads/rail are kept from the previous run
(or left as null with roads_checked=false), so a later run from a network that reaches Overpass fills them in.
"""
from __future__ import annotations
import argparse, csv, io, json, math, os, sys, time, urllib.parse, urllib.request

UPDATED = "2026-11"
PROJECT = "oykcsmextclpdnugixqz"
UA = "realhunt-risks/1.0 (+https://realhunt.co; contact via site)"
OVERPASS = os.environ.get("RH_OVERPASS", "https://overpass-api.de/api/interpreter,https://overpass.kumi.systems/api/interpreter").split(",")
FEMA = "https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query"
ELEV = "https://api.open-meteo.com/v1/elevation"
RAW = "https://raw.githubusercontent.com"
DATA = {
    "runways.csv": f"{RAW}/davidmegginson/ourairports-data/main/runways.csv",
    "airports.csv": f"{RAW}/davidmegginson/ourairports-data/main/airports.csv",
    "coast.geojson": f"{RAW}/nvkelso/natural-earth-vector/master/geojson/ne_10m_coastline.geojson",
    "rivers.geojson": f"{RAW}/nvkelso/natural-earth-vector/master/geojson/ne_10m_rivers_lake_centerlines.geojson",
    "rivers_eu.geojson": f"{RAW}/nvkelso/natural-earth-vector/master/geojson/ne_10m_rivers_europe.geojson",
    "rivers_na.geojson": f"{RAW}/nvkelso/natural-earth-vector/master/geojson/ne_10m_rivers_north_america.geojson",
}

# Official flood maps per country (where to check for real). Keys are community_deals.country values.
FLOOD_MAPS = {
    "United States": ("FEMA Flood Map Service Center", "https://msc.fema.gov/portal/home"),
    "Spain": ("SNCZI, Ministerio para la Transición Ecológica", "https://sig.miteco.gob.es/snczi/"),
    "Italy": ("ISPRA IdroGEO", "https://idrogeo.isprambiente.it/app/"),
    "France": ("Géorisques", "https://www.georisques.gouv.fr/"),
    "Portugal": ("SNIAmb, Agência Portuguesa do Ambiente", "https://sniamb.apambiente.pt/"),
    "Germany": ("BfG flood risk maps (HWRM)", "https://geoportal.bafg.de/karten/HWRM/"),
    "Netherlands": ("Overstroom ik?", "https://www.overstroomik.nl/"),
    "Denmark": ("Kystdirektoratet flood maps", "https://oversvommelse.kyst.dk/"),
    "Sweden": ("MSB översvämningsportal", "https://gisapp.msb.se/apps/oversvamningsportal/"),
    "Norway": ("NVE flood zone maps", "https://temakart.nve.no/tema/flomsoner"),
    "Poland": ("ISOK Hydroportal", "https://wody.isok.gov.pl/imap_kzgw/"),
    "Greece": ("Floods Directive maps, Ministry of Environment", "https://floods.ypeka.gr/"),
    "Cyprus": ("Water Development Department, flood risk maps", "https://www.moa.gov.cy/moa/wdd/"),
    "Bulgaria": ("Flood hazard maps, Ministry of Environment and Water", "https://moew.government.bg/en/the-moew-published-for-public-consultation-the-maps-of-areas-under-flood-threat-and-hazard"),
    "Switzerland": ("map.geo.admin.ch, natural hazards (BAFU)", "https://map.geo.admin.ch/?topic=bafu"),
    "United Kingdom": ("GOV.UK long term flood risk", "https://check-long-term-flood-risk.service.gov.uk/"),
    "Japan": ("GSI hazard map portal", "https://disaportal.gsi.go.jp/"),
    "Mexico": ("Atlas Nacional de Riesgos, CENAPRED", "http://www.atlasnacionalderiesgos.gob.mx/"),
    "Canada": ("Canada flood mapping (geo.ca)", "https://geo.ca/flood-mapping"),
}
FALLBACK_MAP = ("Copernicus Global Flood Awareness System", "https://global-flood.emergency.copernicus.eu/")


# ------------------------------------------------------------------------------------------- geometry
R_EARTH = 6371008.8

def haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    p1, p2 = math.radians(lat1), math.radians(lat2)
    a = math.sin((p2 - p1) / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(math.radians(lng2 - lng1) / 2) ** 2
    return 2 * R_EARTH * math.asin(min(1.0, math.sqrt(a)))

def seg_dist_m(lat: float, lng: float, a: tuple[float, float], b: tuple[float, float]) -> float:
    """Distance in metres from a point to the segment a-b (each (lat, lng)); local flat projection, fine under ~50 km."""
    k = math.cos(math.radians(lat))
    ax, ay = (a[1] - lng) * k, a[0] - lat
    bx, by = (b[1] - lng) * k, b[0] - lat
    dx, dy = bx - ax, by - ay
    L2 = dx * dx + dy * dy
    t = 0.0 if L2 == 0 else max(0.0, min(1.0, -(ax * dx + ay * dy) / L2))
    x, y = ax + t * dx, ay + t * dy
    return math.hypot(x, y) * math.pi / 180 * R_EARTH

def line_dist_m(lat: float, lng: float, pts: list[tuple[float, float]]) -> float:
    if not pts: return math.inf
    if len(pts) == 1: return haversine_m(lat, lng, *pts[0])
    return min(seg_dist_m(lat, lng, pts[i], pts[i + 1]) for i in range(len(pts) - 1))


# ------------------------------------------------------------------------------------- classification
def noise_level(motorway_m: float | None, rail_m: float | None, airport_km: float | None, roads_checked: bool = True) -> str | None:
    """high: < 150 m from a motorway/trunk road or railway, or < 2 km from a runway; medium: < 400 m / < 5 km.
    None when roads/rail were not checked and the airport alone does not make it medium or high."""
    def lt(v, lim): return v is not None and v < lim
    if lt(motorway_m, 150) or lt(rail_m, 150) or lt(airport_km, 2): return "high"
    if lt(motorway_m, 400) or lt(rail_m, 400) or lt(airport_km, 5): return "medium"
    return "low" if roads_checked else None

def fema_level(zone: str | None, subtype: str | None) -> str | None:
    """FEMA NFHL zone to level. A*/V* = high (1% annual chance), shaded X (0.2%) = medium, X = low, D/none = None."""
    z = (zone or "").strip().upper()
    if not z: return None
    if z.startswith("A") or z.startswith("V"): return "high"
    if z == "X":
        s = (subtype or "").upper()
        if "0.2" in s or "LEVEE" in s or "SHADED" in s: return "medium"
        return "low"
    if z.startswith("B"): return "medium"   # older maps: B = moderate
    if z.startswith("C"): return "low"      # older maps: C = minimal
    return None                             # D (undetermined), open water, area not studied

def rough_flood_level(elev_m: float | None, coast_km: float | None, river_km: float | None) -> str | None:
    """Rough indicator outside the US: 'medium' (low-lying and near water: check the official map) or 'low'.
    Never 'high': that needs an official flood map. None when the height is unknown."""
    if elev_m is None: return None
    if coast_km is not None and ((elev_m <= 5 and coast_km <= 2) or (elev_m <= 10 and coast_km <= 0.5)): return "medium"
    if river_km is not None and ((elev_m <= 10 and river_km <= 1) or (elev_m <= 20 and river_km <= 0.3)): return "medium"
    return "low"


# ------------------------------------------------------------------------------------------------ http
def get(url: str, timeout: int = 60, tries: int = 4, pause: float = 4.0) -> bytes:
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json,text/csv,*/*"})
            return urllib.request.urlopen(req, timeout=timeout).read()
        except Exception as e:  # noqa: BLE001
            last = e; time.sleep(pause * (i + 1))
    raise RuntimeError(f"{url[:90]}: {last}")

def cache_dir() -> str:
    d = os.environ.get("RH_RISK_CACHE") or os.path.join(os.environ.get("TMPDIR", "/tmp"), "rh-risk-cache")
    os.makedirs(d, exist_ok=True); return d

def dataset(name: str) -> str:
    p = os.path.join(cache_dir(), name)
    if not os.path.exists(p) or os.path.getsize(p) < 1000:
        open(p, "wb").write(get(DATA[name], timeout=180))
    return p


# --------------------------------------------------------------------------------------------- airports
def load_runways() -> list[dict]:
    ap = {}
    for r in csv.DictReader(open(dataset("airports.csv"), encoding="utf8")):
        if r["type"] == "large_airport" or (r["type"] == "medium_airport" and r["scheduled_service"] == "yes"):
            ap[r["ident"]] = r
    out = []
    for r in csv.DictReader(open(dataset("runways.csv"), encoding="utf8")):
        a = ap.get(r["airport_ident"])
        if not a or r["closed"] == "1": continue
        if (r.get("surface") or "").upper().startswith(("WATER", "GRS", "GRASS", "TURF")): continue
        try:
            ends = [(float(r["le_latitude_deg"]), float(r["le_longitude_deg"])), (float(r["he_latitude_deg"]), float(r["he_longitude_deg"]))]
        except ValueError:
            ends = [(float(a["latitude_deg"]), float(a["longitude_deg"]))]
        name = a["name"] + (f" ({a['iata_code']})" if a.get("iata_code") else "")
        out.append({"name": name, "pts": ends})
    # Airports with no usable runway rows: use the airport point.
    have = {r["name"] for r in out}
    for a in ap.values():
        name = a["name"] + (f" ({a['iata_code']})" if a.get("iata_code") else "")
        if name not in have: out.append({"name": name, "pts": [(float(a["latitude_deg"]), float(a["longitude_deg"]))]})
    return out

def nearest_airport(lat: float, lng: float, runways: list[dict]) -> tuple[float | None, str | None]:
    best, nm = math.inf, None
    for r in runways:
        p = r["pts"][0]
        if abs(p[0] - lat) > 1.0 or abs(p[1] - lng) > 1.5: continue  # > ~100 km: skip quickly
        d = line_dist_m(lat, lng, r["pts"])
        if d < best: best, nm = d, r["name"]
    return (round(best / 1000, 1), nm) if nm else (None, None)


# ------------------------------------------------------------------------------------------ roads/rail
def overpass_roads(lat: float, lng: float) -> tuple[int | None, int | None]:
    """Nearest motorway/trunk and railway in metres within 2 km (None = none within 2 km). Raises if unreachable."""
    q = (f'[out:json][timeout:25];(way(around:2000,{lat},{lng})[highway~"^(motorway|trunk)$"];'
         f'way(around:2000,{lat},{lng})[railway=rail][!service];);out geom qt;')
    last = None
    for ep in OVERPASS:
        for i in range(3):
            try:
                req = urllib.request.Request(ep, data=urllib.parse.urlencode({"data": q}).encode(), headers={"User-Agent": UA})
                d = json.load(urllib.request.urlopen(req, timeout=60))
                mw = rl = math.inf
                for el in d.get("elements", []):
                    pts = [(g["lat"], g["lon"]) for g in el.get("geometry") or []]
                    dist = line_dist_m(lat, lng, pts); tg = el.get("tags", {})
                    if tg.get("highway") in ("motorway", "trunk"): mw = min(mw, dist)
                    if tg.get("railway") == "rail": rl = min(rl, dist)
                fin = lambda v: None if v == math.inf or v > 2000 else int(round(v))
                return fin(mw), fin(rl)
            except Exception as e:  # noqa: BLE001
                last = e; time.sleep(5 * (i + 1))
    raise RuntimeError(f"overpass: {last}")


# ------------------------------------------------------------------------------------------------ flood
def fema(lat: float, lng: float) -> dict | None:
    qs = urllib.parse.urlencode({"geometry": f"{lng},{lat}", "geometryType": "esriGeometryPoint", "inSR": "4326",
                                 "spatialRel": "esriSpatialRelIntersects", "outFields": "FLD_ZONE,ZONE_SUBTY,SFHA_TF",
                                 "returnGeometry": "false", "f": "json"})
    d = json.loads(get(f"{FEMA}?{qs}", timeout=60))
    if "error" in d: raise RuntimeError(str(d["error"])[:200])
    f = d.get("features") or []
    if not f: return None
    a = f[0]["attributes"]
    return {"zone": a.get("FLD_ZONE"), "subtype": a.get("ZONE_SUBTY")}

def elevations(pts: list[tuple[float, float]]) -> list[float | None]:
    out: list[float | None] = []
    for i in range(0, len(pts), 100):
        ch = pts[i:i + 100]
        qs = urllib.parse.urlencode({"latitude": ",".join(f"{p[0]:.5f}" for p in ch), "longitude": ",".join(f"{p[1]:.5f}" for p in ch)})
        d = json.loads(get(f"{ELEV}?{qs}"))
        out += [None if v is None or (isinstance(v, float) and math.isnan(v)) else float(v) for v in d.get("elevation", [None] * len(ch))]
        time.sleep(1)
    return out

class Lines:
    """Line features bucketed on a 0.5 degree grid for quick nearest-distance queries."""
    def __init__(self, files: list[str], rivers: bool = False):
        self.cells: dict[tuple[int, int], list[list[tuple[float, float]]]] = {}
        for fn in files:
            for f in json.load(open(fn, encoding="utf8"))["features"]:
                p = f.get("properties") or {}
                if rivers and p.get("featurecla") not in ("River", "Lake Centerline", "River (Intermittent)", "Lake Centerline (Intermittent)"): continue
                if rivers and "Intermittent" in str(p.get("featurecla")): continue
                g = f.get("geometry") or {}
                lines = [g["coordinates"]] if g.get("type") == "LineString" else g.get("coordinates", []) if g.get("type") == "MultiLineString" else []
                for ln in lines:
                    pts = [(c[1], c[0]) for c in ln]
                    for j in range(0, len(pts) - 1, 20):  # chunk long lines so each chunk lands in few cells
                        ch = pts[j:j + 21]
                        for key in {(int(math.floor(a / 0.5)), int(math.floor(b / 0.5))) for a, b in ch}:
                            self.cells.setdefault(key, []).append(ch)
    def nearest_km(self, lat: float, lng: float, reach: int = 1) -> float | None:
        ci, cj = int(math.floor(lat / 0.5)), int(math.floor(lng / 0.5))
        best = math.inf
        for di in range(-reach, reach + 1):
            for dj in range(-reach, reach + 1):
                for ch in self.cells.get((ci + di, cj + dj), []):
                    best = min(best, line_dist_m(lat, lng, ch))
        return None if best == math.inf else round(best / 1000, 2)


# ------------------------------------------------------------------------------------------------- db
def sql(q: str, token: str) -> list:
    req = urllib.request.Request(f"https://api.supabase.com/v1/projects/{PROJECT}/database/query", data=json.dumps({"query": q}).encode(),
                                 headers={"Authorization": "Bearer " + token, "Content-Type": "application/json", "User-Agent": "rh-ops"})
    return json.load(urllib.request.urlopen(req, timeout=180))

def lit(s: str) -> str: return "'" + s.replace("'", "''") + "'"


# ----------------------------------------------------------------------------------------------- main
def compute(homes: list[dict], prev: dict[str, dict], log=print, sink=None) -> tuple[dict[str, dict], list[str]]:
    runways = load_runways()
    coast = Lines([dataset("coast.geojson")])
    rivers = Lines([dataset("rivers.geojson"), dataset("rivers_eu.geojson"), dataset("rivers_na.geojson")], rivers=True)
    elev = elevations([(h["lat"], h["lng"]) for h in homes])
    out, failed = {}, []
    overpass_ok = True
    fema_cache: dict[tuple[float, float], dict | None] = {}
    for i, h in enumerate(homes):
        lat, lng, slug = float(h["lat"]), float(h["lng"]), h["slug"]
        old = (prev.get(slug) or {}).get("noise") or {}
        try:
            akm, aname = nearest_airport(lat, lng, runways)
            mw = rl = None; checked = False
            if overpass_ok:
                try:
                    mw, rl = overpass_roads(lat, lng); checked = True; time.sleep(1.5)
                except RuntimeError as e:
                    log(f"  overpass unreachable ({e}); roads/rail skipped for the rest of this run"); overpass_ok = False
            if not checked and old.get("roads_checked"):
                mw, rl, checked = old.get("motorway_m"), old.get("rail_m"), True
            noise = {"level": noise_level(mw, rl, akm, checked), "motorway_m": mw, "rail_m": rl, "airport_km": akm, "airport": aname,
                     "roads_checked": checked, "source": "OpenStreetMap, OurAirports"}
            name, url = FLOOD_MAPS.get(h.get("country") or "", FALLBACK_MAP)
            flood = None
            if h.get("country") == "United States":
                key = (round(lat, 5), round(lng, 5))
                if key not in fema_cache: fema_cache[key] = fema(lat, lng); time.sleep(0.5)
                z = fema_cache[key]
                lv = fema_level(z["zone"], z["subtype"]) if z else None
                if lv:
                    flood = {"level": lv, "source": "FEMA NFHL", "zone": z["zone"] + (f" ({z['subtype'].lower()})" if z.get("subtype") else ""), "map": url, "map_name": name,
                             "note": {"high": "Special flood hazard area (1% chance a year). Flood insurance is usually required with a mortgage.",
                                      "medium": "Moderate flood hazard (0.2% chance a year).", "low": "Minimal flood hazard on the FEMA map."}[lv]}
            if not flood:
                e = elev[i]; ckm = coast.nearest_km(lat, lng); rkm = rivers.nearest_km(lat, lng)
                lv = rough_flood_level(e, ckm, rkm)
                flood = {"level": lv, "source": "rough", "elev_m": None if e is None else round(e), "coast_km": ckm, "river_km": rkm, "map": url, "map_name": name,
                         "note": "Low-lying, near water: check the official flood map." if lv == "medium" else
                                 "Not low-lying near the sea or a big river. Rough indicator, not an official flood map." if lv == "low" else
                                 "Ground height unknown: check the official flood map."}
            out[slug] = {"noise": noise, "flood": flood, "updated": UPDATED}
            if sink: sink(slug, out[slug])
        except Exception as e:  # noqa: BLE001
            failed.append(f"{slug}: {e}"); log(f"  FAILED {slug}: {e}")
        if (i + 1) % 50 == 0: log(f"  {i + 1}/{len(homes)}")
    return out, failed

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--slug"); ap.add_argument("--missing", action="store_true"); ap.add_argument("--dry", action="store_true")
    ap.add_argument("--out"); ap.add_argument("--token-file")
    ap.add_argument("--apply", help="write a JSON file made earlier with --out instead of computing")
    ap.add_argument("--shard", help="i/n: only every n-th home starting at i (parallel runs)")
    ap.add_argument("--homes-url", help="read homes from the public snapshot (no token; use with --out, e.g. in GitHub Actions)")
    a = ap.parse_args()
    if a.homes_url:
        rows = json.load(urllib.request.urlopen(urllib.request.Request(a.homes_url, headers={"User-Agent": "rh-ops"}), timeout=120))["rows"]
        homes = [{"slug": r["slug"], "lat": r["lat"], "lng": r["lng"], "country": r.get("country"), "risks": r.get("risks")} for r in rows if r.get("lat") is not None and r.get("lng") is not None]
        if a.missing: homes = [h for h in homes if not ((h.get("risks") or {}).get("noise") or {}).get("roads_checked")]
        if a.shard:
            i, n = (int(x) for x in a.shard.split("/")); homes = homes[i::n]
        print(f"{len(homes)} homes (public snapshot)", flush=True)
        out_path = a.out or "risks.json"
        partial: dict = {}
        def log(msg: str) -> None:
            print(msg, flush=True)
        res, failed = compute(homes, {h["slug"]: h.get("risks") for h in homes if h.get("risks")}, log=log, sink=lambda k, v: (partial.__setitem__(k, v), json.dump(partial, open(out_path, "w", encoding="utf8"), ensure_ascii=False)))
        json.dump(res, open(a.out or "risks.json", "w", encoding="utf8"), ensure_ascii=False, indent=0)
        print("roads checked:", sum(1 for r in res.values() if r["noise"]["roads_checked"]), "of", len(res), "failed:", len(failed))
        return
    token = os.environ.get("SUPABASE_ACCESS_TOKEN") or (open(a.token_file).read().strip() if a.token_file else "")
    if not token: sys.exit("Set SUPABASE_ACCESS_TOKEN or pass --token-file (reads homes and writes the risks column).")
    if a.apply:
        write(json.load(open(a.apply, encoding="utf8")), token); return
    where = "status='approved' and lat is not null and lng is not null"
    if a.slug: where += " and slug in (" + ",".join(lit(s) for s in a.slug.split(",")) + ")"
    if a.missing: where += " and (risks is null or not coalesce((risks->'noise'->>'roads_checked')::boolean,false))"
    homes = sql(f"select slug, lat, lng, country, risks from realhunt.community_deals where {where} order by slug", token)
    print(f"{len(homes)} homes")
    prev = {h["slug"]: h.get("risks") for h in homes if h.get("risks")}
    res, failed = compute(homes, prev)
    if a.out: json.dump(res, open(a.out, "w", encoding="utf8"), ensure_ascii=False, indent=0)
    cnt: dict[str, int] = {}
    for r in res.values():
        for k in ("noise", "flood"): cnt[f"{k}:{r[k]['level']}"] = cnt.get(f"{k}:{r[k]['level']}", 0) + 1
    print("levels", json.dumps(dict(sorted(cnt.items()))), "failed", len(failed))
    for f in failed: print("  ", f)
    if not a.dry: write(res, token)

def write(res: dict[str, dict], token: str) -> None:
    """Sets only the risks column of the given homes, then clears the feed cache."""
    items = list(res.items())
    for i in range(0, len(items), 80):
        vals = ",".join(f"({lit(s)},{lit(json.dumps(r, ensure_ascii=False))}::jsonb)" for s, r in items[i:i + 80])
        sql(f"update realhunt.community_deals d set risks=v.r from (values {vals}) v(s,r) where d.slug=v.s", token)
    sql("delete from realhunt.rh_cache", token)
    print("written", len(items))

if __name__ == "__main__":
    main()
