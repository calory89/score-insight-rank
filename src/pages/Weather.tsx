// realhunt.co/weather (v2, 11-oct-2026): "Nomad List, but for homes". Every place where RealHunt has good homes
// (score 80+), plus sunny places we don't cover yet, compared on what makes a place good to live in:
// good-weather days, winters and summers, rain, sunshine, air quality, safety, the sea, the airport and the homes.
// Data is computed offline and shipped as /weather/places.json:
//  · comfortable days: our estimate from CRU CL 2.0 climate normals (daily high 18–33 °C, dry, light wind)
//  · air: average PM2.5 over 2025 from the CAMS global model (Open-Meteo)
//  · safety: intentional homicides per 100,000 people, latest year (UNODC via World Bank), per country
//  · sea: distance to the nearest coastline (Natural Earth); airport: nearest with scheduled flights (OurAirports)
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Home = { k: "h" | "n"; s: string; dest?: string; n: number; p?: number | null; t: string; i?: string | null; sqm?: number | null; bd?: number | null; la: number; lo: number };
type Place = {
  id: string; name: string; region?: string | null; cc: string; la: number; lo: number; kind: "homes" | "spot" | "ebc";
  days: number; m: number[]; hi: number[]; lo2: number[]; rain: number; sun?: number | null; rh?: number | null; winter: number; summer: number;
  sea: number; air: number; iata: string; pm: number; hom?: number | null; homYear?: string | null;
  n: number; best?: number | null; from?: number | null; img?: string | null; homes: Home[];
};

// ---------------------------------------------------------------- scoring and labels
const cl = (x: number) => Math.max(0, Math.min(1, x));
const parts = (p: Place) => ({
  weather: cl(p.days / 270),
  air: cl((35 - p.pm) / 30),
  safety: p.hom == null ? 0.5 : cl(1 - Math.log10(p.hom + 0.3) / Math.log10(20)),
  sea: cl(1 - p.sea / 100),
  homes: p.best ? cl((p.best - 70) / 30) : 0.4,
  airport: cl(1 - (p.air - 20) / 130),
});
const overall = (p: Place) => { const s = parts(p); return Math.round(100 * (0.35 * s.weather + 0.18 * s.air + 0.18 * s.safety + 0.1 * s.sea + 0.12 * s.homes + 0.07 * s.airport)); };
const airLabel = (pm: number) => (pm < 5 ? "Excellent" : pm < 10 ? "Good" : pm < 15 ? "Fair" : pm < 25 ? "Poor" : "Bad");
const safeLabel = (h?: number | null) => (h == null ? "No data" : h < 1 ? "Very safe" : h < 2.5 ? "Safe" : h < 5 ? "Fair" : h < 10 ? "Take care" : "Risky");
const cigsYear = (pm: number) => Math.round((pm / 22) * 365);
const tone = (v: number) => (v >= 0.75 ? "#1E9E57" : v >= 0.55 ? "#7CC242" : v >= 0.4 ? "#F2B705" : v >= 0.25 ? "#F07A1A" : "#D93B2B");
const scoreBg = (s: number) => (s >= 80 ? "#0F6B34" : s >= 70 ? "#1E9E57" : s >= 60 ? "#7CB342" : s >= 50 ? "#E0A800" : "#E06A1A");
const RAMP = [[0, "#f6d4f4"], [40, "#ce96ec"], [80, "#7d78f0"], [115, "#3cafef"], [140, "#3ccd96"], [160, "#aade3c"], [175, "#ffd728"], [195, "#ff911e"], [220, "#e8371e"], [260, "#960023"]] as const;
const dayColor = (d: number) => { let c: string = RAMP[0][1]; for (const [v, col] of RAMP) if (d >= v) c = col; return c; };
const money = (n?: number | null) => (n == null ? "" : n >= 1e6 ? `€${(n / 1e6).toFixed(1)}M` : `€${Math.round(n / 1000)}k`);
const flag = (cc: string) => (cc && cc.length === 2 ? String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 127397 + c.charCodeAt(0))) : "🌍");
const homeUrl = (h: Home) => (h.k === "n" ? `/top/${h.dest}/${h.s}` : `/deal/${h.s}`);
const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const CONT: Record<string, string> = { ES: "eu", PT: "eu", IT: "eu", FR: "eu", GR: "eu", HR: "eu", MT: "eu", CY: "eu", BG: "eu", DK: "eu", SE: "eu", NO: "eu", GB: "eu", CH: "eu", GE: "eu", TR: "eu",
  US: "am", CA: "am", MX: "am", CR: "am", PA: "am", CO: "am", EC: "am", PE: "am", CL: "am", BR: "am",
  ID: "as", TH: "as", VN: "as", PH: "as", MY: "as", JP: "as", AU: "as", MA: "af", TN: "af", IL: "af", KE: "af", ZA: "af", MU: "af", CV: "af" };
const REGIONS: [string, string][] = [["all", "Everywhere"], ["eu", "Europe & Med"], ["am", "Americas"], ["as", "Asia & Pacific"], ["af", "Africa & Middle East"]];

type FilterKey = "sunny" | "mild" | "noheat" | "air" | "safe" | "sea" | "airport" | "homes" | "cheap" | "dry";
const FILTERS: { k: FilterKey; label: string; test: (p: Place) => boolean; tip: string }[] = [
  { k: "sunny", label: "☀ Sunny most of the year", test: (p) => p.days >= 180, tip: "180+ comfortable days a year" },
  { k: "mild", label: "🌤 Mild winters", test: (p) => p.winter >= 17, tip: "Coldest month's daily high 17 °C or more" },
  { k: "noheat", label: "🧊 No extreme heat", test: (p) => p.summer <= 32, tip: "Hottest month's daily high 32 °C or less" },
  { k: "air", label: "🫁 Clean air", test: (p) => p.pm < 10, tip: "PM2.5 under 10 µg/m³ on average" },
  { k: "safe", label: "🛡 Safe", test: (p) => p.hom != null && p.hom < 2.5, tip: "Under 2.5 homicides per 100,000 people a year (country)" },
  { k: "sea", label: "🌊 By the sea", test: (p) => p.sea <= 5, tip: "Coast within 5 km" },
  { k: "airport", label: "✈ Near an airport", test: (p) => p.air <= 60, tip: "Airport with scheduled flights within 60 km" },
  { k: "homes", label: "🏠 Homes for sale now", test: (p) => p.n > 0, tip: "RealHunt homes scoring 80+ here today" },
  { k: "cheap", label: "💶 Under €100k", test: (p) => !!p.from && p.from <= 100000, tip: "Good homes from €100,000 or less" },
  { k: "dry", label: "🌧 Little rain", test: (p) => p.rain <= 60, tip: "60 rainy days a year or fewer" },
];
const SORTS: [string, string, (a: Place, b: Place) => number][] = [
  ["best", "Best overall", (a, b) => overall(b) - overall(a)],
  ["weather", "Most good-weather days", (a, b) => b.days - a.days],
  ["air", "Cleanest air", (a, b) => a.pm - b.pm],
  ["safe", "Safest", (a, b) => (a.hom ?? 99) - (b.hom ?? 99)],
  ["cheap", "Cheapest homes", (a, b) => (a.from ?? 1e12) - (b.from ?? 1e12)],
  ["sea", "Closest to the sea", (a, b) => a.sea - b.sea],
];

function setMeta(title: string, desc: string, url: string) {
  document.title = title;
  const m = (sel: string, attr: string, val: string) => { const e = document.querySelector(sel); if (e) e.setAttribute(attr, val); };
  m('meta[name="description"]', "content", desc); m('meta[property="og:title"]', "content", title); m('meta[property="og:description"]', "content", desc);
  m('meta[property="og:url"]', "content", url); m('meta[property="og:image"]', "content", "https://realhunt.co/weather/og.jpg"); m('meta[name="twitter:image"]', "content", "https://realhunt.co/weather/og.jpg");
}
const readQS = () => { try { return new URLSearchParams(location.search); } catch { return new URLSearchParams(); } };

// ---------------------------------------------------------------- small pieces
function Bar({ v, label, value }: { v: number; label: string; value: string }) {
  return (
    <div className="wx-bar">
      <span className="wx-bar-l">{label}</span>
      <span className="wx-bar-t"><i style={{ width: `${Math.max(6, v * 100)}%`, background: tone(v) }} /></span>
      <span className="wx-bar-v">{value}</span>
    </div>
  );
}
function Months({ p, big = false }: { p: Place; big?: boolean }) {
  const mx = 31;
  return (
    <div className={big ? "wx-months big" : "wx-months"} aria-label="Comfortable days per month">
      {p.m.map((d, i) => (
        <div key={i} className="wx-mo" title={`${MONTHS[i]}: ${d} comfortable days · high ${p.hi[i]}°C, low ${p.lo2[i]}°C`}>
          <i style={{ height: `${Math.max(4, (d / mx) * 100)}%`, background: dayColor(d * 11.8) }} />
          {big && <small>{MONTHS[i]}</small>}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- the page
export default function Weather() {
  const qs0 = readQS();
  const [all, setAll] = useState<Place[] | null>(null);
  const [q, setQ] = useState(qs0.get("q") || "");
  const [on, setOn] = useState<Set<FilterKey>>(new Set((qs0.get("f") || "sunny").split(",").filter(Boolean) as FilterKey[]));
  const [region, setRegion] = useState(qs0.get("r") || "all");
  const [sort, setSort] = useState(qs0.get("sort") || "best");
  const [view, setView] = useState<"cards" | "map">((qs0.get("view") as any) === "map" ? "map" : "cards");
  const [openId, setOpenId] = useState<string | null>(qs0.get("place"));
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMeta("Best places to live with good weather all year, and good homes there · RealHunt", "Compare places by good-weather days, mild winters, clean air, safety, the sea and the airport, then see the homes that score 80+ there. Mediterranean, Canaries, Mexico, Bali, Sumba and more.", "https://realhunt.co/weather");
    fetch("/weather/places.json").then((r) => r.json()).then(setAll).catch(() => setAll([]));
  }, []);
  // keep the address in sync so any view can be shared
  useEffect(() => {
    const u = new URLSearchParams();
    if (q) u.set("q", q); const f = [...on].join(","); if (f !== "sunny") u.set("f", f || "none");
    if (region !== "all") u.set("r", region); if (sort !== "best") u.set("sort", sort); if (view !== "cards") u.set("view", view); if (openId) u.set("place", openId);
    const s = u.toString(); history.replaceState(history.state, "", location.pathname + (s ? "?" + s : ""));
  }, [q, on, region, sort, view, openId]);

  const list = useMemo(() => {
    if (!all) return [];
    const ql = q.trim().toLowerCase();
    const fs = FILTERS.filter((f) => on.has(f.k));
    const by = (SORTS.find((s) => s[0] === sort) || SORTS[0])[2];
    return all.filter((p) => (region === "all" || CONT[p.cc] === region) && fs.every((f) => f.test(p)) && (!ql || `${p.name} ${p.region || ""} ${p.cc}`.toLowerCase().includes(ql))).sort((a, b) => by(a, b) || overall(b) - overall(a));
  }, [all, q, on, region, sort]);
  const open = useMemo(() => all?.find((p) => p.id === openId) || null, [all, openId]);
  const counts = useMemo(() => { const c: Record<string, number> = {}; if (all) for (const f of FILTERS) c[f.k] = all.filter(f.test).length; return c; }, [all]);
  const toggle = (k: FilterKey) => setOn((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });

  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") setOpenId(null); }; addEventListener("keydown", k); return () => removeEventListener("keydown", k); }, []);
  useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [open]);

  return (
    <main className="wx">
      <style>{CSS}</style>
      <header className="wx-hero">
        <nav className="wx-crumb"><Link to="/">RealHunt</Link> › Good weather</nav>
        <h1>Live where the weather is good. Buy where the homes are good.</h1>
        <p>{all ? all.length : "…"} places compared on good-weather days, winters, rain, air, safety, the sea and the airport, with the homes that score 80+ there today. Pick what matters to you.</p>
        <div className="wx-search">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a place or country…" aria-label="Search a place" />
          <div className="wx-seg" role="tablist">
            <button className={view === "cards" ? "on" : ""} onClick={() => setView("cards")}>▦ Places</button>
            <button className={view === "map" ? "on" : ""} onClick={() => setView("map")}>🗺 Map</button>
          </div>
        </div>
      </header>

      <div className="wx-tools">
        <div className="wx-chips">
          {FILTERS.map((f) => (
            <button key={f.k} className={on.has(f.k) ? "wx-chip on" : "wx-chip"} onClick={() => toggle(f.k)} title={f.tip} aria-pressed={on.has(f.k)}>
              {f.label}<small>{counts[f.k] ?? ""}</small>
            </button>
          ))}
          {on.size > 0 && <button className="wx-chip clear" onClick={() => setOn(new Set())}>✕ Clear</button>}
        </div>
        <div className="wx-row2">
          <div className="wx-regions">{REGIONS.map(([k, l]) => <button key={k} className={region === k ? "on" : ""} onClick={() => setRegion(k)}>{l}</button>)}</div>
          <label className="wx-sort">Sort <select value={sort} onChange={(e) => setSort(e.target.value)}>{SORTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        </div>
        <div className="wx-count"><b>{list.length}</b> places · <b>{list.reduce((a, p) => a + p.n, 0)}</b> good homes</div>
      </div>

      {view === "map" ? (
        <MapView list={list} onOpen={setOpenId} />
      ) : (
        <section className="wx-grid">
          {list.map((p, i) => <Card key={p.id} p={p} rank={i + 1} onOpen={() => setOpenId(p.id)} />)}
          {all && !list.length && (
            <div className="wx-empty">No place has all of that. <button onClick={() => setOn(new Set())}>Clear the filters</button></div>
          )}
          {!all && Array.from({ length: 8 }).map((_, i) => <div key={i} className="wx-card skel" />)}
        </section>
      )}

      <section className="wx-how">
        <h2>How we compare places</h2>
        <p><b>Good-weather days</b>: a day counts when the high is 18–33 °C, it stays dry (under 1 mm) and the wind is light (under 20 km/h). Our estimate from long-term climate normals (CRU CL 2.0, University of East Anglia, ~18 km grid), month by month.</p>
        <p><b>Air</b>: average fine dust (PM2.5) over 2025 from the CAMS global model. The WHO guideline is 5 µg/m³. 22 µg/m³ breathed for a day is roughly one cigarette.</p>
        <p><b>Safety</b>: intentional homicides per 100,000 people in the country, latest year (UNODC, via the World Bank). It's a country average: cities and neighbourhoods differ.</p>
        <p><b>Sea</b>: distance to the nearest coast. <b>Airport</b>: nearest airport with scheduled flights. <b>Homes</b>: RealHunt homes and new builds scoring 80+ out of 100. The overall score weighs weather 35%, air 18%, safety 18%, homes 12%, sea 10% and airport 7%.</p>
      </section>

      {open && <Sheet p={open} onClose={() => setOpenId(null)} copied={copied} onShare={() => { const u = `${location.origin}/weather?place=${open.id}`; (navigator.share ? navigator.share({ title: `${open.name} · RealHunt`, url: u }).catch(() => {}) : navigator.clipboard.writeText(u).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); })); }} />}
    </main>
  );
}

function Card({ p, rank, onOpen }: { p: Place; rank: number; onOpen: () => void }) {
  const s = overall(p), pt = parts(p);
  return (
    <button className={`wx-card ${p.kind}`} onClick={onOpen} aria-label={`${p.name}, score ${s}`}>
      <div className="wx-ph" style={p.img ? { backgroundImage: `url(${p.img})` } : { background: `linear-gradient(135deg, ${dayColor(p.days)}, #1d2b3a)` }}>
        <span className="wx-rank">#{rank}</span>
        <span className="wx-score" style={{ background: scoreBg(s) }}>{s}</span>
        {p.kind === "ebc" && <span className="wx-ebc">★ Our project</span>}
        <div className="wx-name"><b>{flag(p.cc)} {p.name}</b><small>{p.region || ""}</small></div>
        <div className="wx-hover">
          <Bar v={pt.weather} label="☀ Weather" value={`${p.days} d`} />
          <Bar v={pt.air} label="🫁 Air" value={airLabel(p.pm)} />
          <Bar v={pt.safety} label="🛡 Safety" value={safeLabel(p.hom)} />
          <Bar v={pt.sea} label="🌊 Sea" value={p.sea < 1 ? "on it" : `${Math.round(p.sea)} km`} />
          <Bar v={pt.airport} label="✈ Airport" value={`${p.air} km`} />
          <Bar v={pt.homes} label="🏠 Homes" value={p.n ? `${p.n} · ${p.best}` : "none yet"} />
        </div>
      </div>
      <div className="wx-meta">
        <span title="Good-weather days a year">☀ <b style={{ color: dayColor(p.days) }}>{p.days}</b></span>
        <span title={`PM2.5 ${p.pm} µg/m³`}>🫁 {airLabel(p.pm)}</span>
        <span title="Homicides per 100k (country)">🛡 {safeLabel(p.hom)}</span>
        <span>🌡 {p.winter}–{p.summer}°</span>
      </div>
      <Months p={p} />
      <div className="wx-foot">{p.kind === "ebc" ? <span className="wx-cta">See Eco Beach City →</span> : p.n ? <><b>{p.n} good home{p.n > 1 ? "s" : ""}</b> from {money(p.from)}</> : <span className="wx-cta">No homes yet · Find me one →</span>}</div>
    </button>
  );
}

function Sheet({ p, onClose, onShare, copied }: { p: Place; onClose: () => void; onShare: () => void; copied: boolean }) {
  const s = overall(p), pt = parts(p);
  const findUrl = `/find-my-home/${encodeURIComponent(p.name.toLowerCase())}`;
  return (
    <div className="wx-sheet-bg" onClick={onClose}>
      <aside className="wx-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={p.name}>
        <div className="wx-sh-top" style={p.img ? { backgroundImage: `linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.65)),url(${p.img})` } : { background: `linear-gradient(135deg, ${dayColor(p.days)}, #1d2b3a)` }}>
          <button className="wx-x" onClick={onClose} aria-label="Close">✕</button>
          <div><small>{p.region || ""}</small><h2>{flag(p.cc)} {p.name}</h2></div>
          <span className="wx-score big" style={{ background: scoreBg(s) }}>{s}<small>/100</small></span>
        </div>
        <div className="wx-sh-body">
          <div className="wx-actions">
            {p.kind === "ebc" ? <Link className="wx-btn main" to="/ecobeachcity">See Eco Beach City</Link> : p.n ? <a className="wx-btn main" href="#homes">See the {p.n} homes</a> : <Link className="wx-btn main" to={findUrl}>Find me a home here</Link>}
            <button className="wx-btn" onClick={onShare}>{copied ? "✓ Link copied" : "↗ Share"}</button>
          </div>
          <h3>Good-weather days by month</h3>
          <Months p={p} big />
          <p className="wx-note"><b style={{ color: dayColor(p.days) }}>{p.days}</b> comfortable days a year, about {Math.round((p.days / 365) * 12)} months' worth. Daily highs from {p.winter} °C in the coolest month to {p.summer} °C in the warmest.</p>
          <h3>How it compares</h3>
          <div className="wx-bars">
            <Bar v={s / 100} label="Overall" value={`${s}/100`} />
            <Bar v={pt.weather} label="☀ Good days" value={`${p.days}/365`} />
            <Bar v={cl((p.winter - 5) / 15)} label="🌤 Winter highs" value={`${p.winter} °C`} />
            <Bar v={cl((38 - p.summer) / 10)} label="🧊 Summer highs" value={`${p.summer} °C`} />
            <Bar v={cl(1 - p.rain / 150)} label="🌧 Rainy days" value={`${p.rain} a year`} />
            {p.sun != null && <Bar v={cl((p.sun - 30) / 50)} label="🌞 Sunshine" value={`${p.sun}% of daylight`} />}
            {p.rh != null && <Bar v={cl((90 - p.rh) / 40)} label="💧 Humidity" value={`${p.rh}%`} />}
            <Bar v={pt.air} label="🫁 Air quality" value={`${airLabel(p.pm)} · ${p.pm} µg`} />
            <Bar v={pt.safety} label="🛡 Safety" value={p.hom == null ? "No data" : `${safeLabel(p.hom)} · ${p.hom}`} />
            <Bar v={pt.sea} label="🌊 Sea" value={p.sea < 1 ? "On the coast" : `${Math.round(p.sea)} km`} />
            <Bar v={pt.airport} label="✈ Airport" value={`${p.iata} · ${p.air} km`} />
            <Bar v={pt.homes} label="🏠 Good homes" value={p.n ? `${p.n} · best ${p.best}` : "None yet"} />
          </div>
          <p className="wx-note">Air: breathing it all year is like smoking about <b>{cigsYear(p.pm)}</b> cigarettes a year (<a href={`https://thecigaretteindex.com/?utm_source=realhunt&utm_medium=weather`} target="_blank" rel="noopener">The Cigarette Index</a>). Safety: {p.hom == null ? "no recent data for this country." : `${p.hom} homicides per 100,000 people in ${p.homYear}, country average.`}</p>
          {p.n > 0 && (
            <>
              <h3 id="homes">The best homes here</h3>
              <div className="wx-homes">
                {p.homes.map((h) => (
                  <Link key={h.s} to={homeUrl(h)} className="wx-home">
                    <div className="wx-hi" style={h.i ? { backgroundImage: `url(${h.i})` } : undefined}><span style={{ background: scoreBg(h.n) }}>{h.n}</span></div>
                    <b>{money(h.p)}</b><small>{h.t}</small>
                  </Link>
                ))}
              </div>
            </>
          )}
          <div className="wx-findbox">
            <b>Want something specific here?</b> Tell us your budget and must-haves and we'll look for you. <Link to={findUrl}>Find me a home in {p.name} →</Link>
          </div>
        </div>
      </aside>
    </div>
  );
}

function MapView({ list, onOpen }: { list: Place[]; onOpen: (id: string) => void }) {
  const box = useRef<HTMLDivElement>(null), map = useRef<L.Map | null>(null), layer = useRef<L.LayerGroup | null>(null), ov = useRef<L.ImageOverlay | null>(null);
  const [opacity, setOpacity] = useState(0.65);
  useEffect(() => {
    if (!box.current) return;
    const small = innerWidth < 640;
    const m = L.map(box.current, { center: [36, 12], zoom: small ? 3 : 4, minZoom: 2, maxZoom: 12, worldCopyJump: true, scrollWheelZoom: false });
    m.on("click", () => m.scrollWheelZoom.enable());
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}", { attribution: "Tiles © Esri · climate: CRU CL 2.0", maxZoom: 16 }).addTo(m);
    m.createPane("heat"); m.getPane("heat")!.style.zIndex = "350";
    ov.current = L.imageOverlay("/weather/overlay.webp", [[-56, -180], [72, 180]], { opacity: 0.65, pane: "heat", interactive: false }).addTo(m);
    m.createPane("labels"); m.getPane("labels")!.style.zIndex = "450"; m.getPane("labels")!.style.pointerEvents = "none";
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}", { pane: "labels", maxZoom: 16 }).addTo(m);
    layer.current = L.layerGroup().addTo(m); map.current = m;
    return () => { m.remove(); map.current = null; };
  }, []);
  useEffect(() => { ov.current?.setOpacity(opacity); }, [opacity]);
  useEffect(() => {
    const g = layer.current; if (!g) return; g.clearLayers();
    for (const p of list) {
      const s = overall(p);
      const html = p.kind === "ebc"
        ? `<div class="wx-pin ebc">★ Eco Beach City</div>`
        : `<div class="wx-pin${p.n ? "" : " empty"}" style="--c:${scoreBg(s)}"><b>${s}</b>${p.n ? "" : ""}</div>`;
      const icon = L.divIcon({ className: "", html, iconSize: p.kind === "ebc" ? [130, 28] : [34, 24], iconAnchor: p.kind === "ebc" ? [14, 14] : [17, 12] });
      L.marker([p.la, p.lo], { icon, zIndexOffset: p.kind === "ebc" ? 1000 : p.n ? 100 : 0 })
        .bindTooltip(`${p.name} · ☀ ${p.days} · ${p.n ? p.n + " homes" : "no homes yet"}`, { direction: "top", offset: [0, -10] })
        .on("click", () => onOpen(p.id)).addTo(g);
    }
  }, [list, onOpen]);
  return (
    <section className="wx-mapwrap">
      <div ref={box} className="wx-map" />
      <div className="wx-legend">
        <b>Good-weather days a year</b>
        <div className="wx-ramp" style={{ background: `linear-gradient(90deg,${RAMP.map(([v, c]) => `${c} ${(v / 300) * 100}%`).join(",")})` }} />
        <div className="wx-ticks"><span>0</span><span>100</span><span>200</span><span>300</span></div>
        <label>Colours <input type="range" min={0} max={1} step={0.05} value={opacity} onChange={(e) => setOpacity(+e.target.value)} /></label>
      </div>
    </section>
  );
}

const CSS = `
.wx{max-width:1240px;margin:0 auto;padding:18px 16px 70px;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#14181c}
.wx a{color:#D4420C}
.wx-crumb{font-size:13px;color:#6b737a;margin-bottom:8px}.wx-crumb a{color:#6b737a;text-decoration:none}
.wx-hero h1{font:800 clamp(28px,4.4vw,48px)/1.04 system-ui;letter-spacing:-.02em;margin:0;max-width:20ch}
.wx-hero p{font-size:16px;color:#3b4540;max-width:720px;margin:10px 0 14px}
.wx-search{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.wx-search input{flex:1;min-width:220px;border:1.5px solid #dfe3e6;border-radius:14px;padding:12px 14px;font:16px system-ui;outline:none;background:#fff}
.wx-search input:focus{border-color:#14181c}
.wx-seg{display:flex;background:#eef0f2;border-radius:12px;padding:3px}
.wx-seg button{border:0;background:none;padding:9px 14px;border-radius:10px;font:700 14px system-ui;cursor:pointer;color:#14181c}
.wx-seg button.on{background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.12)}
.wx-tools{position:sticky;top:0;z-index:600;background:rgba(255,255,255,.96);backdrop-filter:blur(8px);margin:14px -16px 12px;padding:10px 16px 8px;border-bottom:1px solid #eef0f2}
.wx-chips{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none}.wx-chips::-webkit-scrollbar{display:none}
.wx-chip{flex:0 0 auto;border:1.5px solid #e1e5e8;background:#fff;border-radius:999px;padding:8px 12px;font:600 13.5px system-ui;cursor:pointer;color:#14181c;display:flex;gap:6px;align-items:center;transition:all .15s}
.wx-chip small{font-size:11px;color:#8a9098;font-weight:700}
.wx-chip:hover{border-color:#14181c}
.wx-chip.on{background:#14181c;color:#fff;border-color:#14181c}.wx-chip.on small{color:#cfd5da}
.wx-chip.clear{border-style:dashed;color:#C2412D}
.wx-row2{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:8px;flex-wrap:wrap}
.wx-regions{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none}.wx-regions::-webkit-scrollbar{display:none}
.wx-regions button{flex:0 0 auto;border:0;background:#eef0f2;border-radius:999px;padding:6px 11px;font:700 12.5px system-ui;cursor:pointer;color:#14181c}
.wx-regions button.on{background:#D4420C;color:#fff}
.wx-sort{font-size:13px;color:#5b636b;display:flex;gap:6px;align-items:center}
.wx-sort select{border:1.5px solid #e1e5e8;border-radius:10px;padding:6px 8px;font:600 13px system-ui;background:#fff}
.wx-count{font-size:12.5px;color:#5b636b;margin-top:6px}
.wx-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:16px}
.wx-card{all:unset;box-sizing:border-box;cursor:pointer;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08),0 8px 24px rgba(0,0,0,.06);transition:transform .15s,box-shadow .15s;display:flex;flex-direction:column}
.wx-card:hover{transform:translateY(-3px);box-shadow:0 12px 32px rgba(0,0,0,.14)}
.wx-card:focus-visible{outline:3px solid #D4420C}
.wx-card.skel{height:330px;background:linear-gradient(90deg,#f1f3f4,#e7eaec,#f1f3f4);background-size:200% 100%;animation:wxs 1.2s infinite}
@keyframes wxs{to{background-position:-200% 0}}
.wx-card.ebc{box-shadow:0 0 0 3px #D4420C,0 8px 24px rgba(212,66,12,.2)}
.wx-ph{position:relative;height:190px;background-size:cover;background-position:center}
.wx-ph:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 40%,rgba(0,0,0,.65))}
.wx-rank{position:absolute;left:10px;top:10px;z-index:2;background:rgba(0,0,0,.55);color:#fff;font:800 12px system-ui;border-radius:8px;padding:3px 7px}
.wx-score{position:absolute;right:10px;top:10px;z-index:2;color:#fff;font:900 18px system-ui;border-radius:12px;padding:6px 9px;box-shadow:0 2px 8px rgba(0,0,0,.25)}
.wx-ebc{position:absolute;left:10px;top:40px;z-index:2;background:#D4420C;color:#fff;font:800 11.5px system-ui;border-radius:8px;padding:3px 7px}
.wx-name{position:absolute;left:12px;right:12px;bottom:10px;z-index:2;color:#fff}
.wx-name b{display:block;font:800 20px/1.15 system-ui;text-shadow:0 1px 6px rgba(0,0,0,.4)}
.wx-name small{font-size:12.5px;opacity:.9}
.wx-hover{position:absolute;inset:0;z-index:3;background:rgba(20,24,28,.88);padding:14px 14px;display:flex;flex-direction:column;justify-content:center;gap:7px;opacity:0;transition:opacity .15s;color:#fff}
@media (hover:hover){.wx-card:hover .wx-hover{opacity:1}}
.wx-bar{display:grid;grid-template-columns:110px 1fr auto;gap:8px;align-items:center;font-size:12.5px}
.wx-bar-l{white-space:nowrap}
.wx-bar-t{height:9px;border-radius:5px;background:rgba(128,128,128,.25);overflow:hidden}.wx-bar-t i{display:block;height:100%;border-radius:5px}
.wx-bar-v{font-weight:700;white-space:nowrap;font-size:12px}
.wx-meta{display:flex;flex-wrap:wrap;gap:4px 12px;padding:10px 12px 0;font-size:12.5px;color:#3b4540}
.wx-months{display:flex;gap:3px;align-items:flex-end;height:26px;padding:8px 12px 0}
.wx-mo{flex:1;height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center}
.wx-mo i{display:block;width:100%;border-radius:3px 3px 1px 1px}
.wx-months.big{height:90px;padding:4px 0 18px}.wx-months.big .wx-mo{position:relative}.wx-months.big small{position:absolute;bottom:-17px;font-size:11px;color:#6b737a}
.wx-foot{padding:10px 12px 12px;font-size:13.5px;color:#14181c;margin-top:auto}
.wx-cta{color:#D4420C;font-weight:800}
.wx-empty{grid-column:1/-1;text-align:center;padding:40px;color:#5b636b}.wx-empty button{margin-left:8px;border:0;background:#14181c;color:#fff;border-radius:999px;padding:8px 14px;font:700 13px system-ui;cursor:pointer}
.wx-how{margin-top:40px;background:#F6F8F7;border-radius:18px;padding:18px 20px;font-size:14px;color:#3b4540;line-height:1.55}.wx-how h2{font:800 20px system-ui;margin:0 0 8px;color:#14181c}.wx-how p{margin:6px 0}
.wx-sheet-bg{position:fixed;inset:0;z-index:2000;background:rgba(10,14,18,.45);display:flex;justify-content:flex-end;animation:wxf .15s}
@keyframes wxf{from{opacity:0}}
.wx-sheet{width:min(560px,100%);height:100%;background:#fff;overflow-y:auto;animation:wxi .22s cubic-bezier(.2,.9,.3,1)}
@keyframes wxi{from{transform:translateX(40px);opacity:.4}}
.wx-sh-top{position:relative;height:230px;background-size:cover;background-position:center;color:#fff;display:flex;align-items:flex-end;justify-content:space-between;padding:16px 18px}
.wx-sh-top h2{font:900 30px/1.05 system-ui;margin:2px 0 0;text-shadow:0 2px 10px rgba(0,0,0,.4)}
.wx-sh-top small{font-size:13px;opacity:.9}
.wx-x{position:absolute;right:14px;top:14px;border:0;background:rgba(0,0,0,.5);color:#fff;width:36px;height:36px;border-radius:50%;font:700 16px system-ui;cursor:pointer}
.wx-score.big{position:static;font-size:30px;padding:8px 12px;border-radius:16px}.wx-score.big small{font-size:12px;opacity:.85;margin-left:2px}
.wx-sh-body{padding:16px 18px 40px}
.wx-sh-body h3{font:800 16px system-ui;margin:20px 0 8px}
.wx-actions{display:flex;gap:8px;flex-wrap:wrap}
.wx-btn{border:0;border-radius:12px;padding:11px 16px;font:800 14px system-ui;cursor:pointer;background:#eef0f2;color:#14181c !important;text-decoration:none;display:inline-block}
.wx-btn.main{background:#D4420C;color:#fff !important}
.wx-bars{display:flex;flex-direction:column;gap:9px}.wx-bars .wx-bar{grid-template-columns:150px 1fr auto;font-size:13.5px}.wx-bars .wx-bar-v{font-size:13px}
.wx-note{font-size:13.5px;color:#3b4540;line-height:1.5;margin:10px 0 0}
.wx-homes{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
.wx-home{text-decoration:none;color:#14181c !important;font-size:13px}
.wx-hi{position:relative;height:110px;border-radius:12px;background:#eef0f2 center/cover;margin-bottom:5px}
.wx-hi span{position:absolute;right:6px;top:6px;color:#fff;font:800 12px system-ui;border-radius:8px;padding:2px 6px}
.wx-home b{display:block;font-size:14px}.wx-home small{display:block;color:#5b636b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wx-findbox{margin-top:22px;background:#FFF4EE;border:1px solid #F8D5C4;border-radius:14px;padding:12px 14px;font-size:13.5px;line-height:1.5}
.wx-mapwrap{position:relative}
.wx-map{height:min(74vh,700px);min-height:420px;border-radius:18px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.12)}
.wx-legend{position:absolute;left:12px;bottom:12px;z-index:500;background:rgba(255,255,255,.95);border-radius:12px;padding:8px 10px;font-size:11.5px;box-shadow:0 2px 8px rgba(0,0,0,.15);width:230px}
.wx-ramp{height:10px;border-radius:4px;margin:4px 0 2px}.wx-ticks{display:flex;justify-content:space-between}.wx-legend label{display:flex;gap:6px;align-items:center;margin-top:4px}.wx-legend input{width:110px}
.wx-pin{background:var(--c);color:#fff;font:800 12px system-ui;border-radius:999px;width:34px;height:24px;display:grid;place-items:center;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3);cursor:pointer}
.wx-pin.empty{opacity:.75;border-style:dashed}
.wx-pin.ebc{width:auto;padding:0 10px;background:#D4420C;white-space:nowrap;box-shadow:0 0 0 6px rgba(212,66,12,.25),0 4px 12px rgba(0,0,0,.35)}
@media (max-width:640px){
 .wx-grid{grid-template-columns:1fr 1fr;gap:10px}
 .wx-ph{height:140px}.wx-name b{font-size:16px}.wx-score{font-size:15px;padding:4px 7px}
 .wx-meta{font-size:11.5px;gap:2px 8px;padding:8px 9px 0}.wx-meta span:nth-child(4){display:none}
 .wx-foot{font-size:12px;padding:8px 9px 10px}.wx-months{padding:6px 9px 0;height:20px}
 .wx-sheet{width:100%;height:94%;margin-top:auto;border-radius:20px 20px 0 0;animation:wxu .25s cubic-bezier(.2,.9,.3,1)}
 .wx-sheet-bg{align-items:flex-end}
 .wx-bars .wx-bar{grid-template-columns:118px 1fr auto;font-size:12.5px}
 .wx-search input{font-size:16px}
}
@keyframes wxu{from{transform:translateY(60px)}}
@media (max-width:380px){.wx-grid{grid-template-columns:1fr}}
`;
