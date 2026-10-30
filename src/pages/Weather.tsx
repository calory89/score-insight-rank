// realhunt.co/weather (v3, 11-oct-2026): "Nomad List, but for homes". Every place where RealHunt has good homes
// (score 80+), plus sunny places we don't cover yet, compared on what makes a place good to live in:
// good-weather days, winters and summers, rain, sunshine, air quality, safety, the sea, the airport and the homes.
// Data is computed offline and shipped as /weather/places.json:
//  · comfortable days: our estimate from CRU CL 2.0 climate normals (daily high 18–33 °C, dry, light wind)
//  · air: average PM2.5 over 2025 from the CAMS global model (Open-Meteo)
//  · safety: intentional homicides per 100,000 people, latest year (UNODC via World Bank), per country
//  · sea: distance to the nearest coastline (Natural Earth); airport: nearest with scheduled flights (OurAirports)
// v3: the prerendered first paint is this same layout (weather/shell.ts), so the link never flashes another page;
// English and Spanish built in; chip counts show what is left if you add that filter; the map loads on demand.
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { WX_CSS } from "./wx/css";
import { WX_TEXT, wxLang, FILTER_KEYS, REGION_KEYS, SORT_KEYS, type FilterKey } from "./wx/text";
import { type Place, type Home, cl, parts, overall, tone, scoreBg, dayColor, CONT } from "./wx/score";

const MapView = lazy(() => import("./wx/MapView"));
const LANG = wxLang();
const S = WX_TEXT[LANG];
const ES = LANG === "es";

// start downloading the data as soon as this file loads, not after the first render
let dataP: Promise<Place[]> | null = null;
const loadPlaces = () => (dataP ??= fetch("/weather/places.json").then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); }).catch(() => { dataP = null; return []; }));
if (typeof window !== "undefined") loadPlaces();

const TESTS: Record<FilterKey, (p: Place) => boolean> = {
  sunny: (p) => p.days >= 180,
  mild: (p) => p.winter >= 17,
  noheat: (p) => p.summer <= 32,
  air: (p) => p.pm < 10,
  safe: (p) => p.hom != null && p.hom < 2.5,
  sea: (p) => p.sea <= 5,
  airport: (p) => p.air <= 60,
  homes: (p) => p.n > 0,
  cheap: (p) => !!p.from && p.from <= 100000,
  dry: (p) => p.rain <= 60,
};
const SORTS: Record<string, (a: Place, b: Place) => number> = {
  best: (a, b) => overall(b) - overall(a),
  weather: (a, b) => b.days - a.days,
  air: (a, b) => a.pm - b.pm,
  safe: (a, b) => (a.hom ?? 99) - (b.hom ?? 99),
  cheap: (a, b) => (a.from ?? 1e12) - (b.from ?? 1e12),
  sea: (a, b) => a.sea - b.sea,
};
const airLabel = (pm: number) => S.air[pm < 5 ? 0 : pm < 10 ? 1 : pm < 15 ? 2 : pm < 25 ? 3 : 4];
const safeLabel = (h?: number | null) => (h == null ? S.noData : S.safe[h < 1 ? 0 : h < 2.5 ? 1 : h < 5 ? 2 : h < 10 ? 3 : 4]);
const cigsYear = (pm: number) => Math.round((pm / 22) * 365);
const num = (n: number | string) => (ES ? String(n).replace(".", ",") : String(n));
const money = (n?: number | null) => {
  if (n == null) return "";
  if (n >= 1e6) return ES ? `${num((n / 1e6).toFixed(1))} M€` : `€${(n / 1e6).toFixed(1)}M`;
  return ES ? `${Math.round(n / 1000)}.000\u00A0€` : `€${Math.round(n / 1000)}k`;
};
const EN_REGION = (() => { try { return new Intl.DisplayNames(["en"], { type: "region" }); } catch { return null; } })();
const LOC_REGION = (() => { try { return new Intl.DisplayNames([LANG], { type: "region" }); } catch { return null; } })();
// "Spain" -> "España" when the region shown is just the country
const regionName = (p: Place) => { const r = p.region || ""; if (!ES || !p.cc || !EN_REGION || !LOC_REGION) return r; try { return EN_REGION.of(p.cc) === r ? LOC_REGION.of(p.cc) || r : r; } catch { return r; } };
let esDict: Record<string, string> | null = null;
const loadEs = () => (ES ? fetch("/i18n/es-listings.json?v=2").then((r) => r.json()).then((d) => (esDict = d)).catch(() => null) : Promise.resolve(null));
const tt = (s: string) => (esDict && esDict[s]) || s;
const flag = (cc: string) => (cc && cc.length === 2 ? String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 127397 + c.charCodeAt(0))) : "🌍");
const homeUrl = (h: Home) => (h.k === "n" ? `/top/${h.dest}/${h.s}` : `/deal/${h.s}`);
const findUrl = (p: Place) => `/find-my-home/${encodeURIComponent(p.name.replace(/\s*\(.*?\)\s*/g, "").trim().toLowerCase().replace(/\s+/g, "-"))}?ref=weather`;

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
  return (
    <div className={big ? "wx-months big" : "wx-months"} aria-label={S.byMonth}>
      {p.m.map((d, i) => (
        <div key={i} className="wx-mo" title={`${S.monthsLong[i]}: ${d} · ${p.hi[i]}° / ${p.lo2[i]}°`}>
          <i style={{ height: `${Math.max(4, (d / 31) * 100)}%`, background: tone(d / 26) }} />
          {big && <small>{S.months[i]}</small>}
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
  const [on, setOn] = useState<Set<FilterKey>>(() => new Set((qs0.get("f") || "sunny").split(",").filter((k) => k in TESTS) as FilterKey[]));
  const [region, setRegion] = useState(REGION_KEYS.includes(qs0.get("r") as any) ? (qs0.get("r") as string) : "all");
  const [sort, setSort] = useState(qs0.get("sort") && SORTS[qs0.get("sort")!] ? qs0.get("sort")! : "best");
  const [view, setView] = useState<"cards" | "map">(qs0.get("view") === "map" ? "map" : "cards");
  const [openId, setOpenId] = useState<string | null>(qs0.get("place"));
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMeta(S.title, S.desc, "https://realhunt.co/weather");
    let alive = true;
    Promise.all([loadPlaces(), loadEs()]).then(([d]) => { if (alive) setAll(d); });
    return () => { alive = false; };
  }, []);
  // keep the address in sync so any view can be shared
  useEffect(() => {
    const u = new URLSearchParams();
    if (q) u.set("q", q); const f = [...on].join(","); if (f !== "sunny") u.set("f", f || "none");
    if (region !== "all") u.set("r", region); if (sort !== "best") u.set("sort", sort); if (view !== "cards") u.set("view", view); if (openId) u.set("place", openId);
    const s = u.toString().replace(/%2C/g, ","); history.replaceState(history.state, "", location.pathname + (s ? "?" + s : ""));
  }, [q, on, region, sort, view, openId]);

  const base = useMemo(() => {
    if (!all) return [];
    const ql = q.trim().toLowerCase();
    return all.filter((p) => (region === "all" || CONT[p.cc] === region) && (!ql || `${p.name} ${p.region || ""} ${p.cc}`.toLowerCase().includes(ql)));
  }, [all, q, region]);
  const list = useMemo(() => {
    const fs = [...on].map((k) => TESTS[k]);
    const by = SORTS[sort] || SORTS.best;
    return base.filter((p) => fs.every((f) => f(p))).sort((a, b) => by(a, b) || overall(b) - overall(a));
  }, [base, on, sort]);
  // each chip shows how many places you'd have with it switched on, on top of everything else you picked
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    if (!all) return c;
    for (const k of FILTER_KEYS) { const fs = [...on, k].map((x) => TESTS[x]); c[k] = base.filter((p) => fs.every((f) => f(p))).length; }
    return c;
  }, [all, base, on]);
  const open = useMemo(() => all?.find((p) => p.id === openId) || null, [all, openId]);
  const toggle = (k: FilterKey) => setOn((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const onOpen = useCallback((id: string) => setOpenId(id), []);

  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") setOpenId(null); }; addEventListener("keydown", k); return () => removeEventListener("keydown", k); }, []);
  useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [open]);
  // a place in the link that doesn't exist: drop it instead of keeping a dead ?place=
  useEffect(() => { if (all && openId && !open) setOpenId(null); }, [all, openId, open]);

  const share = () => {
    if (!open) return;
    const u = `${location.origin}/weather?place=${open.id}`;
    if (navigator.share) { navigator.share({ title: `${open.name} · RealHunt`, url: u }).catch(() => {}); return; }
    navigator.clipboard?.writeText(u).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); }).catch(() => {});
  };

  return (
    <main className="wx" translate="no">
      <style>{WX_CSS}</style>
      <header className="wx-hero">
        <nav className="wx-crumb"><Link to="/">RealHunt</Link> › {S.crumb}</nav>
        <h1>{S.h1}</h1>
        <p>{S.lead(all && all.length ? String(all.length) : "295")}</p>
        <div className="wx-search">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={S.search} aria-label={S.search} type="search" enterKeyHint="search" />
          <div className="wx-seg" role="tablist">
            <button role="tab" aria-selected={view === "cards"} className={view === "cards" ? "on" : ""} onClick={() => setView("cards")}>▦ {S.places}</button>
            <button role="tab" aria-selected={view === "map"} className={view === "map" ? "on" : ""} onClick={() => setView("map")}>🗺 {S.map}</button>
          </div>
        </div>
      </header>

      <div className="wx-tools">
        <div className="wx-chips">
          {FILTER_KEYS.map((k) => {
            const isOn = on.has(k), c = counts[k];
            return (
              <button key={k} className={`wx-chip${isOn ? " on" : ""}${!isOn && c === 0 ? " zero" : ""}`} onClick={() => toggle(k)} title={S.filters[k][1]} aria-pressed={isOn}>
                {S.filters[k][0]}<small>{c ?? ""}</small>
              </button>
            );
          })}
          {on.size > 0 && <button className="wx-chip clear" onClick={() => setOn(new Set())}>✕ {S.clear}</button>}
        </div>
        <div className="wx-row2">
          <div className="wx-regions">{REGION_KEYS.map((k) => <button key={k} className={region === k ? "on" : ""} onClick={() => setRegion(k)}>{S.regions[k]}</button>)}</div>
          <label className="wx-sort">{S.sort} <select value={sort} onChange={(e) => setSort(e.target.value)}>{SORT_KEYS.map((k) => <option key={k} value={k}>{S.sorts[k]}</option>)}</select></label>
        </div>
        <div className={all ? "wx-count" : "wx-count loading"}>{all ? S.count(list.length, list.reduce((a, p) => a + p.n, 0)) : S.loading}</div>
      </div>

      {view === "map" ? (
        <Suspense fallback={<div className="wx-mapload" />}><MapView list={list} onOpen={onOpen} S={S} /></Suspense>
      ) : (
        <section className="wx-grid">
          {list.map((p, i) => <Card key={p.id} p={p} rank={i + 1} onOpen={() => setOpenId(p.id)} />)}
          {all && !list.length && (
            <div className="wx-empty">{S.empty} <button onClick={() => { setOn(new Set()); setQ(""); setRegion("all"); }}>{S.clearAll}</button></div>
          )}
          {!all && Array.from({ length: 8 }).map((_, i) => <div key={i} className="wx-card skel" />)}
        </section>
      )}

      <section className="wx-how">
        <h2>{S.how}</h2>
        {S.howP.map(([b, t]) => <p key={b}><b>{b}</b>{t}</p>)}
      </section>

      {open && <Sheet p={open} onClose={() => setOpenId(null)} copied={copied} onShare={share} />}
    </main>
  );
}

function Card({ p, rank, onOpen }: { p: Place; rank: number; onOpen: () => void }) {
  const s = overall(p), pt = parts(p);
  const hf = S.homesFrom(p.n, money(p.from));
  return (
    <button className={`wx-card ${p.kind}`} onClick={onOpen} aria-label={`${p.name}, ${s}/100`}>
      <div className="wx-ph" style={p.img ? { backgroundImage: `url(${p.img})` } : { background: `linear-gradient(135deg, ${dayColor(p.days)}, #1d2b3a)` }}>
        <span className="wx-rank">#{rank}</span>
        <span className="wx-score" style={{ background: scoreBg(s) }}>{s}</span>
        {p.kind === "ebc" && <span className="wx-ebc">{S.ourProject}</span>}
        <div className="wx-name"><b>{flag(p.cc)} {p.name}</b><small>{regionName(p)}</small></div>
        <div className="wx-hover">
          <Bar v={pt.weather} label={S.b.weather} value={`${p.days} ${S.d}`} />
          <Bar v={pt.air} label={S.b.air} value={airLabel(p.pm)} />
          <Bar v={pt.safety} label={S.b.safety} value={safeLabel(p.hom)} />
          <Bar v={pt.sea} label={S.b.sea} value={p.sea < 1 ? S.onIt : `${Math.round(p.sea)} km`} />
          <Bar v={pt.airport} label={S.b.airport} value={`${p.air} km`} />
          <Bar v={pt.homes} label={S.b.homes} value={p.n ? `${p.n} · ${p.best}` : S.none} />
        </div>
      </div>
      <div className="wx-meta">
        <span title={S.filters.sunny[1]}>☀ <b style={{ color: tone(p.days / 250) }}>{p.days}</b></span>
        <span title={`PM2.5 ${num(p.pm)} µg/m³`}>🫁 {airLabel(p.pm)}</span>
        <span title={S.b.safety}>🛡 {safeLabel(p.hom)}</span>
        <span>🌡 {p.winter}–{p.summer}°</span>
      </div>
      <Months p={p} />
      <div className="wx-foot">{p.kind === "ebc" ? <span className="wx-cta">{S.seeEbc}</span> : p.n ? <><b>{hf[0]}</b>{hf[1]}</> : <span className="wx-cta">{S.noHomes}</span>}</div>
    </button>
  );
}

function Sheet({ p, onClose, onShare, copied }: { p: Place; onClose: () => void; onShare: () => void; copied: boolean }) {
  const s = overall(p), pt = parts(p);
  const sheet = useRef<HTMLElement>(null), homesRef = useRef<HTMLHeadingElement>(null);
  const drag = useRef<{ y: number; dy: number } | null>(null);
  useEffect(() => { sheet.current?.scrollTo(0, 0); sheet.current?.focus(); }, [p.id]);
  // phones: pull the sheet down from the top to close it
  const onTouchStart = (e: React.TouchEvent) => { if ((sheet.current?.scrollTop || 0) <= 0) drag.current = { y: e.touches[0].clientY, dy: 0 }; };
  const onTouchMove = (e: React.TouchEvent) => {
    const d = drag.current; if (!d || !sheet.current) return;
    d.dy = Math.max(0, e.touches[0].clientY - d.y);
    if (d.dy > 0 && sheet.current.scrollTop <= 0) sheet.current.style.transform = `translateY(${d.dy}px)`;
  };
  const onTouchEnd = () => {
    const d = drag.current; drag.current = null; if (!sheet.current) return;
    sheet.current.style.transform = "";
    if (d && d.dy > 110) onClose();
  };
  const days = S.daysNote(p.days, Math.round((p.days / 365) * 12), p.winter, p.summer);
  return (
    <div className="wx-sheet-bg" onClick={onClose}>
      <aside ref={sheet} tabIndex={-1} className="wx-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={p.name}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        <div className="wx-sh-top" style={p.img ? { backgroundImage: `linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.65)),url(${p.img})` } : { background: `linear-gradient(135deg, ${dayColor(p.days)}, #1d2b3a)` }}>
          <span className="wx-sh-grab" aria-hidden="true" />
          <button className="wx-x" onClick={onClose} aria-label={S.close}>✕</button>
          <div><small>{regionName(p)}</small><h2>{flag(p.cc)} {p.name}</h2></div>
          <span className="wx-score big" style={{ background: scoreBg(s) }}>{s}<small>/100</small></span>
        </div>
        <div className="wx-sh-body">
          <div className="wx-actions">
            {p.kind === "ebc" ? <Link className="wx-btn main" to="/ecobeachcity">{S.seeEbcBtn}</Link>
              : p.n ? <button className="wx-btn main" onClick={() => homesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>{S.seeHomes(p.n)}</button>
              : <Link className="wx-btn main" to={findUrl(p)}>{S.findHere}</Link>}
            <button className="wx-btn" onClick={onShare}>{copied ? S.copied : S.share}</button>
          </div>
          <h3>{S.byMonth}</h3>
          <Months p={p} big />
          <p className="wx-note"><b style={{ color: tone(p.days / 250) }}>{days[0]}</b>{days[1]}</p>
          <h3>{S.compares}</h3>
          <div className="wx-bars">
            <Bar v={s / 100} label={S.bars.overall} value={`${s}/100`} />
            <Bar v={pt.weather} label={S.bars.days} value={`${p.days}/365`} />
            <Bar v={cl((p.winter - 5) / 15)} label={S.bars.winter} value={`${p.winter} °C`} />
            <Bar v={cl((38 - p.summer) / 10)} label={S.bars.summer} value={`${p.summer} °C`} />
            <Bar v={cl(1 - p.rain / 150)} label={S.bars.rain} value={`${p.rain} ${S.perYear}`} />
            {p.sun != null && <Bar v={cl((p.sun - 30) / 50)} label={S.bars.sun} value={`${p.sun}% ${S.ofDaylight}`} />}
            {p.rh != null && <Bar v={cl((90 - p.rh) / 40)} label={S.bars.rh} value={`${p.rh}%`} />}
            <Bar v={pt.air} label={S.bars.air} value={`${airLabel(p.pm)} · ${num(p.pm)} µg/m³`} />
            <Bar v={pt.safety} label={S.bars.safety} value={p.hom == null ? S.noData : `${safeLabel(p.hom)} · ${num(p.hom)}${S.per100k}`} />
            <Bar v={pt.sea} label={S.bars.sea} value={p.sea < 1 ? S.onCoast : `${Math.round(p.sea)} km`} />
            <Bar v={pt.airport} label={S.bars.airport} value={`${p.iata} · ${p.air} km`} />
            <Bar v={pt.homes} label={S.bars.homes} value={p.n ? `${p.n} · ${S.best} ${p.best}` : S.none} />
          </div>
          <p className="wx-note">{S.airNote(cigsYear(p.pm))} (<a href="https://thecigaretteindex.com/?utm_source=realhunt&utm_medium=weather" target="_blank" rel="noopener">The Cigarette Index</a>). {S.safeNote(p.hom, p.homYear)}</p>
          {p.n > 0 && (
            <>
              <h3 ref={homesRef} style={{ scrollMarginTop: 12 }}>{S.bestHomes}</h3>
              <div className="wx-homes">
                {p.homes.map((h) => (
                  <Link key={h.s} to={homeUrl(h)} className="wx-home">
                    <div className="wx-hi" style={h.i ? { backgroundImage: `url(${h.i})` } : undefined}><span style={{ background: scoreBg(h.n) }}>{h.n}</span></div>
                    <b>{money(h.p)}</b><small>{tt(h.t)}</small>
                  </Link>
                ))}
              </div>
            </>
          )}
          <div className="wx-findbox">
            <b>{S.findBox}</b>{S.findBoxText}<Link to={findUrl(p)}>{S.findIn(p.name)}</Link>
          </div>
        </div>
      </aside>
    </div>
  );
}
