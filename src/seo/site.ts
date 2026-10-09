/**
 * Server-rendered SEO layer for Top3Hotels (v2).
 *
 * Real catalogue (src/generated/catalogue-packed.json) + enrichment:
 *  - hotel-extras.json: guest pros/cons, facility tags, location score (Booking.com, keyed by hotel path)
 *  - city-extras.json:  city hero photo (Wikimedia Commons) and best-known sights (Wikipedia)
 * Six languages with hreflang, themed lists, event lists, real map (MapLibre + OpenFreeMap), dark mode.
 * No framework: plain HTML + inline CSS, a few lines of JS for the map.
 */
import { LANGS, T, isLang, type Lang } from "./i18n";
import { X } from "./i18n-extra";
import { Y, CSS_PLUS, JS_PLUS, Z, CSS_TRUST, consentScript } from "./plus";
import GUIDES from "../generated/guides.json";

type Packed = { dictionary: [string[], string[][]]; cities: Record<string, unknown> };
type IndexCity = {
  id: string;
  slug: string;
  city: string;
  country: string;
  cslug: string;
  cc?: string;
  lat: number;
  lng: number;
  near: string[];
  alias?: string; // previous slug, 301-redirected
  pop?: number; // sum of review counts: popularity proxy
};
type Sight = { name: string; lat: number; lng: number };
type CityExtra = {
  hero?: { img: string; thumb?: string; orig?: string; page?: string };
  sights?: Sight[];
};
type HotelExtra = {
  pros?: string[];
  cons?: string[];
  tags?: string[];
  loc?: number | null;
  bf?: string | null;
};

export interface Hotel {
  id: number;
  name: string;
  category: "Budget" | "Best Value" | "Luxury";
  area?: string;
  address?: string;
  url?: string | null;
  coordinates?: { latitude: number; longitude: number };
  gallery?: { src?: string; credit?: string }[];
  booking?: { score?: number; count?: number; stars?: number; url?: string; checked?: string };
  offer?: {
    nightly?: number;
    total?: number;
    currency?: string;
    checkin?: string;
    checkout?: string;
    adults?: number;
  };
  candidateCount?: number;
  reason?: string;
  attributes?: string[];
  evidence?: { shortReason?: string; reasons?: string[]; highlights?: string[] };
  extras?: HotelExtra;
}

export const SITE = "https://www.top3hotels.com";
const SNAPSHOT_DATE = "2026-10-08";
export const BRAND = {
  entity: "Equinox Investment Group LLC",
  place: "Wyoming, United States",
  email: "carlos@equinoxinvestmentgroup.com",
  founder: "Carlos de Ory",
};
const fmtDate = (iso: string, L: Lang) => {
  try {
    return new Intl.DateTimeFormat(L, { day: "numeric", month: "long", year: "numeric" }).format(
      new Date(iso),
    );
  } catch {
    return iso;
  }
};

/* ───────────────────────── data ───────────────────────── */

let loaded:
  | Promise<{
      packed: Packed;
      index: IndexCity[];
      hx: Record<string, HotelExtra>;
      cx: Record<string, CityExtra>;
    }>
  | undefined;
function load() {
  if (!loaded) {
    loaded = Promise.all([
      import("../generated/catalogue-packed.json").then(
        (m) => (m.default ?? m) as unknown as Packed,
      ),
      import("../generated/seo-data.json").then(
        (m) => ((m.default ?? m) as unknown as { cities: IndexCity[] }).cities,
      ),
      import("../generated/hotel-extras.json").then(
        (m) => (m.default ?? m) as unknown as Record<string, HotelExtra>,
      ),
      import("../generated/city-extras.json").then(
        (m) => (m.default ?? m) as unknown as Record<string, CityExtra>,
      ),
    ]).then(([packed, index, hx, cx]) => ({ packed, index, hx, cx }));
  }
  return loaded;
}

let maps:
  | {
      bySlug: Map<string, IndexCity>;
      byId: Map<string, IndexCity>;
      byCountry: Map<string, IndexCity[]>;
    }
  | undefined;
async function data() {
  const d = await load();
  if (!maps) {
    const bySlug = new Map(d.index.map((c) => [c.slug, c]));
    const byId = new Map(d.index.map((c) => [c.id, c]));
    const byCountry = new Map<string, IndexCity[]>();
    for (const c of d.index) {
      const list = byCountry.get(c.cslug) ?? [];
      list.push(c);
      byCountry.set(c.cslug, list);
    }
    for (const list of byCountry.values()) list.sort((a, b) => a.city.localeCompare(b.city));
    maps = { bySlug, byId, byCountry };
  }
  return { ...d, ...maps };
}

function unpack(packed: Packed, value: unknown): unknown {
  const [strings, schemas] = packed.dictionary;
  const walk = (v: unknown): unknown => {
    if (Array.isArray(v)) {
      if (v[0] === -1) return v.slice(1).map(walk);
      if (v[0] === -2) {
        const keys = schemas[v[1] as number] ?? [];
        const out: Record<string, unknown> = {};
        keys.forEach((k, i) => (out[k] = walk(v[i + 2])));
        return out;
      }
      return v.map(walk);
    }
    if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      if ("s" in o && Object.keys(o).length === 1) return strings[o["s"] as number];
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(o)) out[k] = walk(o[k]);
      return out;
    }
    return v;
  };
  return walk(value);
}

const BLOCKED_IMG = /onthebeach\.co\.uk/;
const hotelKey = (h: Hotel) => {
  try {
    return new URL(h.booking?.url ?? "").pathname;
  } catch {
    return "";
  }
};

/** One destination, unpacked and enriched (used by the pages and by /api/catalogue/<id>). */
export async function cityData(id: string) {
  const { packed, hx, cx, byId } = await data();
  const raw = packed.cities[id];
  if (!raw) return null;
  const city = unpack(packed, raw) as {
    id: string;
    city: string;
    country: string;
    hotels: Hotel[];
    extras?: CityExtra;
    slug?: string;
  };
  for (const h of city.hotels ?? []) {
    if (h.gallery) h.gallery = h.gallery.filter((g) => !BLOCKED_IMG.test(g.src ?? ""));
    const e = hx[hotelKey(h)];
    if (e) h.extras = e;
  }
  const extra = cx[id];
  city.extras = extra ?? {};
  city.slug = byId.get(id)?.slug ?? id;
  return city;
}

/* ───────────────────────── helpers ───────────────────────── */

const esc = (s: unknown) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
const money = (n?: number) =>
  n == null
    ? ""
    : new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 0,
      }).format(n);
const fmtInt = (n?: number) => (n == null ? "" : n.toLocaleString("en-US"));
const range = (a?: string, b?: string) => {
  if (!a || !b) return "";
  const da = new Date(a + "T12:00:00Z"),
    db = new Date(b + "T12:00:00Z");
  const m = db.toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
  return `${da.getUTCDate()}–${db.getUTCDate()} ${m}`;
};
const json = (o: unknown) => JSON.stringify(o).replace(/</g, "\\u003c");
const catKey = (h: Hotel) =>
  h.category === "Budget" ? "budget" : h.category === "Best Value" ? "value" : "lux";
const label = (h: Hotel, L: Lang) =>
  h.category === "Luxury" && (h.booking?.stars ?? 5) < 5 ? T[L].cat.Upscale : T[L].cat[h.category];
const daysSince = (s?: string) => {
  const t = Date.parse(s ?? "");
  return Number.isFinite(t) ? Math.max(0, Math.floor((Date.now() - t) / 86400000)) : 0;
};
const km = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const r = (x: number) => (x * Math.PI) / 180;
  const x =
    Math.sin(r(b.lat - a.lat) / 2) ** 2 +
    Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(x));
};
function walkText(h: Hotel, sights: Sight[] | undefined, L: Lang) {
  if (!h.coordinates || !sights?.length) return "";
  const pos = { lat: h.coordinates.latitude, lng: h.coordinates.longitude };
  const best = sights.map((s) => ({ s, d: km(pos, s) })).sort((a, b) => a.d - b.d)[0]!;
  const walkKm = best.d * 1.25; // straight line → typical walking route
  if (walkKm <= 3) return T[L].walk(Math.max(1, Math.round((walkKm / 4.8) * 60)), best.s.name);
  return T[L].km(best.d.toFixed(1), best.s.name);
}
function walkMinutes(h: Hotel, sights: Sight[] | undefined) {
  if (!h.coordinates || !sights?.length) return null;
  const pos = { lat: h.coordinates.latitude, lng: h.coordinates.longitude };
  const best = sights.map((s) => ({ s, d: km(pos, s) })).sort((a, b) => a.d - b.d)[0]!;
  return { name: best.s.name, min: Math.max(1, Math.round(((best.d * 1.25) / 4.8) * 60)) };
}
function bestFor(h: Hotel, i: number, L: Lang, sights: Sight[] | undefined) {
  const f = X[L].forTypes;
  const tags = h.extras?.tags ?? [];
  const out = [f[["budget", "value", "lux"][i]!]!];
  for (const k of ["family", "spa", "beach", "pool", "pets"]) if (tags.includes(k)) out.push(f[k]!);
  const w = walkMinutes(h, sights);
  if (w && w.min <= 15) out.push(f["central"]!);
  return [...new Set(out)].slice(0, 3);
}
const countryName = (c: IndexCity, L: Lang) => {
  if (L === "en" || !c.cc) return c.country;
  try {
    return new Intl.DisplayNames([L], { type: "region" }).of(c.cc) ?? c.country;
  } catch {
    return c.country;
  }
};
const P = (L: Lang, path: string) => (L === "en" ? path : `/${L}${path === "/" ? "" : path}`);

function withDates(u: URL, ci?: string, co?: string) {
  if (ci && co) {
    u.searchParams.set("checkin", ci);
    u.searchParams.set("checkout", co);
  }
  return u;
}
function bookingLink(h: Hotel, ci?: string, co?: string) {
  if (!h.booking?.url) return null;
  try {
    const u = new URL(h.booking.url);
    u.searchParams.delete("checkin");
    u.searchParams.delete("checkout");
    u.searchParams.set("group_adults", "2");
    u.searchParams.set("no_rooms", "1");
    u.searchParams.set("label", "top3hotels-seo");
    return withDates(u, ci, co).toString();
  } catch {
    return null;
  }
}
function compareLinks(h: Hotel, city: IndexCity, ci?: string, co?: string) {
  const q = `${h.name}, ${city.city}`;
  const links: [string, string][] = [];
  const b = bookingLink(h, ci, co);
  if (b) links.push(["Booking.com", b]);
  const ex = new URL("https://www.expedia.com/Hotel-Search");
  ex.searchParams.set("destination", q);
  ex.searchParams.set("adults", "2");
  if (ci && co) {
    ex.searchParams.set("startDate", ci);
    ex.searchParams.set("endDate", co);
  }
  links.push(["Expedia", ex.toString()]);
  const ag = new URL("https://www.agoda.com/search");
  ag.searchParams.set("textToSearch", q);
  ag.searchParams.set("adults", "2");
  ag.searchParams.set("rooms", "1");
  if (ci && co) {
    ag.searchParams.set("checkIn", ci);
    ag.searchParams.set(
      "los",
      String(Math.max(1, Math.round((Date.parse(co) - Date.parse(ci)) / 86400000))),
    );
  }
  links.push(["Agoda", ag.toString()]);
  links.push(["Google Hotels", `https://www.google.com/travel/search?q=${encodeURIComponent(q)}`]);
  if (h.url && /^https?:\/\//.test(h.url)) links.push(["Hotel website", h.url]);
  return links;
}
const mapLink = (h: Hotel, city: IndexCity) =>
  "https://www.google.com/maps/search/?api=1&query=" +
  encodeURIComponent(`${h.name}, ${h.address ?? ""}, ${city.city}, ${city.country}`);

/* ───────────────────────── layout ───────────────────────── */

const LOGO = `<svg width="28" height="24" viewBox="0 0 28 24" aria-hidden="true"><rect x="0" y="11" width="7.5" height="13" rx="2.2" fill="#1f7a5a"/><rect x="10.25" y="0" width="7.5" height="24" rx="2.2" fill="#d83b51"/><rect x="20.5" y="5.5" width="7.5" height="18.5" rx="2.2" fill="#c9971c"/></svg>`;

const CSS = `@font-face{font-family:Fraunces;font-style:normal;font-weight:300 700;font-display:swap;src:url(/fonts/fraunces-latin.woff2) format("woff2");unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:Fraunces;font-style:normal;font-weight:300 700;font-display:swap;src:url(/fonts/fraunces-latin-ext.woff2) format("woff2");unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C4,U+2113,U+2C60-2C7F,U+A720-A7FF}
@font-face{font-family:Inter;font-style:normal;font-weight:400 700;font-display:swap;src:url(/fonts/inter-latin.woff2) format("woff2");unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:Inter;font-style:normal;font-weight:400 700;font-display:swap;src:url(/fonts/inter-latin-ext.woff2) format("woff2");unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C4,U+2113,U+2C60-2C7F,U+A720-A7FF}
@font-face{font-family:"Inter Fallback";src:local("Arial"),local("Liberation Sans"),local("Arimo"),local("Helvetica");ascent-override:90.8%;descent-override:22.61%;line-gap-override:0%;size-adjust:106.69%}@font-face{font-family:"Fraunces Fallback";src:local("Times New Roman"),local("Liberation Serif"),local("Tinos"),local("Times");ascent-override:83.81%;descent-override:21.85%;line-gap-override:0%;size-adjust:116.69%}
:root{--paper:#faf8f4;--ink:#10213a;--muted:#525d6b;--blue:#13417a;--coral:#d83b51;--line:#e6e1d8;--card:#fff;--soft:#f2eee7;--budget:#1f7a5a;--value:#d83b51;--lux:#9a6b00;--shadow:0 1px 2px #10213a0d,0 14px 40px #10213a12;--serif:Fraunces,"Fraunces Fallback",Georgia,serif;--sans:Inter,"Inter Fallback",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
@media (prefers-color-scheme:dark){.card.lux .btn,.card.lux .badge span:first-child,.tile.lux:before{color:#10213a}}
@media (prefers-color-scheme:dark){:root{--paper:#0c121b;--ink:#ecf1f7;--muted:#a8b3c1;--blue:#8db8ff;--line:#233041;--card:#131b27;--soft:#1a2432;--shadow:0 14px 40px #0008;--lux:#e0b441}}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}body{margin:0;background:var(--paper);color:var(--ink);font:15.5px/1.62 var(--sans);-webkit-font-smoothing:antialiased}
a{color:var(--blue)}a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible,summary:focus-visible{outline:3px solid var(--coral);outline-offset:3px}
.wrap{width:min(1180px,calc(100% - 32px));margin:0 auto}
.top{position:sticky;top:0;z-index:40;display:flex;align-items:center;justify-content:space-between;gap:12px;height:66px;border-bottom:1px solid var(--line);background:color-mix(in srgb,var(--paper) 88%,transparent);backdrop-filter:saturate(1.4) blur(12px);-webkit-backdrop-filter:saturate(1.4) blur(12px);margin:0 -16px;padding:0 16px}
.logo{display:inline-flex;align-items:center;gap:9px;font:600 23px/1 var(--serif);letter-spacing:-.6px;color:var(--ink);text-decoration:none}.logo em{color:var(--coral);font-style:normal}
.top nav{display:flex;gap:18px;font-size:13.5px;align-items:center;min-width:0}
.top nav a{color:var(--ink);text-decoration:none;min-height:44px;display:inline-flex;align-items:center}.top nav a:hover{color:var(--coral)}
.top nav a.cta{border:1px solid var(--line);border-radius:999px;padding:0 14px;min-height:38px;background:var(--card);font-weight:600}
.lang select{font:inherit;font-size:13px;background:var(--card);color:var(--ink);border:1px solid var(--line);border-radius:999px;padding:6px 10px;min-height:38px}
@media (max-width:480px){.top{gap:8px}.top .logo{font-size:20px}.top nav{gap:10px}.top nav>a:first-child{max-width:96px;line-height:1.15}.lang select{max-width:92px;padding:6px 4px}.top nav a.cta{display:none}}
.find{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;background:var(--card);border:1px solid var(--line);border-radius:18px;padding:14px;margin:18px 0 8px;box-shadow:var(--shadow)}.find label{display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:600;color:var(--muted);flex:1 1 260px}.find input{font:inherit;font-size:16px;min-height:50px;border:1px solid var(--line);border-radius:12px;padding:0 14px;background:var(--paper);color:var(--ink)}.find .btn{min-height:50px}
.crumbs{font-size:12px;color:var(--muted);margin:18px 0 0}.crumbs a{color:var(--muted)}
h1,h2,h3.serif{font-family:var(--serif);font-weight:500;letter-spacing:-.025em;line-height:1.06;font-optical-sizing:auto}
h1{font-size:clamp(36px,5.4vw,62px);margin:8px 0 12px}h1 em{color:var(--coral);font-style:normal}
h2{font-size:clamp(26px,3.2vw,38px);margin:0 0 14px}
.lead{max-width:720px;color:var(--muted);font-size:17px;margin:0}
.eyebrow{font-size:11px;font-weight:600;letter-spacing:2.2px;text-transform:uppercase;color:var(--muted);display:flex;align-items:center;gap:8px;margin:0}.eyebrow:before{content:"";width:6px;height:6px;border-radius:50%;background:var(--coral)}
.hero{position:relative;margin:16px 0 0;border-radius:26px;overflow:hidden;min-height:clamp(300px,42vw,440px);display:flex;align-items:flex-end;background:#10213a;box-shadow:var(--shadow)}
.hero img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;animation:kb 18s ease-out both}
@keyframes kb{from{transform:scale(1.06)}to{transform:scale(1)}}
.hero:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,#0000 25%,#08111ecc 100%)}
.hero .in{position:relative;z-index:1;padding:30px 32px;color:#fff;width:100%}.hero .in .eyebrow{color:#e8eef6}.hero .in .lead{color:#e8eef6}
.hero h1{color:#fff;text-shadow:0 2px 24px #0006}.hero small{position:absolute;right:14px;bottom:10px;z-index:1;font-size:10px;color:#dfe7f1}.hero small a{color:#dfe7f1}
.noimg{background:linear-gradient(120deg,#13417a,#10213a)}
.byline{display:flex;flex-wrap:wrap;align-items:center;gap:8px 16px;margin:14px 2px 0;font-size:12.5px;color:var(--muted)}
.byline .ok{display:inline-flex;align-items:center;gap:6px}.byline .ok:before{content:"✓";display:inline-grid;place-items:center;width:16px;height:16px;border-radius:50%;background:#1f7a5a;color:#fff;font-size:10px;font-weight:700}
.plan{display:flex;flex-wrap:wrap;gap:10px;align-items:end;margin:18px 0 0;background:var(--card);border:1px solid var(--line);border-radius:18px;padding:14px 16px;box-shadow:var(--shadow)}
.plan label{display:flex;flex-direction:column;font-size:11px;font-weight:600;color:var(--muted);gap:4px}
.plan input{font:inherit;border:1px solid var(--line);border-radius:12px;padding:9px 10px;min-height:46px;color:var(--ink);background:var(--paper)}
.quick{display:flex;flex-wrap:wrap;gap:6px;align-items:center;width:100%;font-size:12px;color:var(--muted)}
.quick button{font:inherit;font-size:12.5px;border:1px solid var(--line);background:var(--paper);color:var(--ink);border-radius:999px;padding:6px 12px;min-height:34px;cursor:pointer}.quick button:hover{border-color:var(--ink)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:48px;padding:0 20px;border-radius:12px;background:var(--ink);color:var(--paper);text-decoration:none;border:0;font:inherit;font-weight:600;cursor:pointer;transition:transform .15s ease,filter .15s ease}.btn:hover{filter:brightness(1.12);transform:translateY(-1px)}
.btn.coral{background:var(--coral);color:#fff}.btn.ghost{background:var(--card);color:var(--ink);border:1px solid var(--line)}
.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;margin:26px 0 8px}
.card{background:var(--card);border:1px solid var(--line);border-radius:22px;overflow:hidden;display:flex;flex-direction:column;box-shadow:var(--shadow);transition:transform .25s ease,box-shadow .25s ease;position:relative}
.card:before{content:"";position:absolute;left:0;right:0;top:0;height:4px;background:var(--c);z-index:2}
.card:hover{transform:translateY(-3px);box-shadow:0 2px 4px #10213a12,0 24px 50px #10213a1f}
.card.budget{--c:var(--budget)}.card.value{--c:var(--value)}.card.lux{--c:var(--lux)}
.media{position:relative;aspect-ratio:3/2;background:var(--soft);cursor:zoom-in;overflow:hidden}
.media img{width:100%;height:100%;object-fit:cover;display:block;animation:fade .6s ease both;transition:transform .6s ease}.card:hover .media img{transform:scale(1.03)}
@keyframes fade{from{opacity:0}to{opacity:1}}
.badge{position:absolute;left:12px;top:14px;display:flex;gap:6px;flex-wrap:wrap;z-index:2}
.badge span{font-size:10.5px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;padding:6px 10px;border-radius:999px;background:var(--c);color:#fff;box-shadow:0 2px 10px #0003}
.badge .pick{background:#fff;color:var(--value)}
.over{position:absolute;left:12px;right:12px;bottom:12px;display:flex;justify-content:space-between;align-items:flex-end;z-index:2;pointer-events:none}
.score{background:#13417a;color:#fff;font-weight:700;font-size:16px;border-radius:10px 10px 10px 3px;padding:7px 10px;box-shadow:0 4px 14px #0004}
.pricetag{background:#fffffff2;color:#10213a;border-radius:12px;padding:7px 12px;font:600 22px/1 var(--serif);letter-spacing:-.3px;box-shadow:0 4px 14px #0003}.pricetag small{font:500 12px var(--sans);color:#525d6b}
.cityphoto{position:absolute;right:10px;top:14px;z-index:2;font-size:10px;background:#000a;color:#fff;border-radius:6px;padding:3px 6px}
.nophoto{display:flex;align-items:center;justify-content:center;height:100%;font:400 34px var(--serif);color:var(--muted)}
.body{padding:18px 20px 20px;display:flex;flex-direction:column;gap:10px;flex:1}
.hname{font:600 21px/1.2 var(--serif);letter-spacing:-.3px;margin:0}
.meta{font-size:13px;color:var(--muted);display:flex;flex-wrap:wrap;gap:4px 10px}.stars{color:#b87737;letter-spacing:1px}
.trust{font-size:12px;color:var(--muted);display:flex;flex-wrap:wrap;gap:4px 12px}.trust b{color:var(--ink)}
.bestfor{font-size:13px;margin:0;color:var(--ink)}.bestfor b{font-size:10.5px;letter-spacing:.8px;text-transform:uppercase;color:var(--muted);margin-right:6px}
.pc{list-style:none;padding:0;margin:0;display:grid;gap:6px;font-size:13.5px}
.pc li{padding-left:22px;position:relative}.pc li:before{position:absolute;left:0;top:0;font-weight:800}
.pc .pro:before{content:"+";color:var(--budget)}.pc .con:before{content:"–";color:var(--coral)}
.pc small{display:block;color:var(--muted);font-size:10.5px;letter-spacing:.8px;text-transform:uppercase;margin-bottom:2px}
.chips{display:flex;flex-wrap:wrap;gap:6px;padding:0;margin:0;list-style:none}.chips li{font-size:12px;background:var(--soft);border-radius:999px;padding:4px 10px;color:var(--ink)}
.price{display:flex;justify-content:space-between;align-items:baseline;border-top:1px solid var(--line);padding-top:12px;margin-top:auto;font-size:12px;color:var(--muted)}
.card .btn{width:100%;background:var(--c);color:#fff}
.cmp{display:flex;flex-wrap:wrap;gap:6px 10px;font-size:12.5px}.cmp span{color:var(--muted)}
details{border-top:1px solid var(--line);padding-top:8px;font-size:13px}summary{cursor:pointer;font-weight:600;min-height:32px}
details ul{padding-left:18px;color:var(--muted);margin:6px 0 0}
.note{font-size:12px;color:var(--muted);margin:6px 0 0}
section{margin:52px 0}
.sharebar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:18px 0 0;font-size:13px;color:var(--muted)}
.sharebar a,.sharebar button{font:inherit;font-size:13px;display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);background:var(--card);color:var(--ink);border-radius:999px;padding:7px 14px;min-height:38px;text-decoration:none;cursor:pointer}
.areas{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.area{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:18px;border-left:4px solid var(--c)}.area h3{font:600 19px/1.2 var(--serif);margin:4px 0 6px}.area p{margin:0;font-size:13.5px;color:var(--muted)}
.area.budget{--c:var(--budget)}.area.value{--c:var(--value)}.area.lux{--c:var(--lux)}
.sources{font-size:12.5px;color:var(--muted);border:1px dashed var(--line);border-radius:14px;padding:14px 16px}
.forhotels{background:var(--soft);border-radius:18px;padding:18px 20px}.forhotels code{display:block;white-space:pre-wrap;word-break:break-all;font-size:11.5px;background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px;margin:8px 0 14px;color:var(--ink)}
#map{height:400px;border-radius:20px;border:1px solid var(--line);background:var(--soft)}
.legend{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--muted);margin-top:8px}.legend i{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:5px;vertical-align:-1px}
table{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--line);border-radius:16px;overflow:hidden;font-size:14px}
th,td{padding:12px 14px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}th{background:var(--soft);font-size:11.5px;letter-spacing:.6px;text-transform:uppercase}
.tablewrap{overflow-x:auto;border-radius:16px}
.faq dt{font-weight:600;margin:18px 0 4px;font-family:var(--serif);font-size:18px}.faq dd{margin:0;color:var(--muted)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px 18px;padding:0;margin:0;list-style:none}
.grid a{display:flex;justify-content:space-between;gap:8px;padding:10px 0;border-bottom:1px solid var(--line);text-decoration:none;color:var(--ink)}.grid a:hover{color:var(--coral)}.grid a span{color:var(--muted);font-size:13px}
.countries h2{font:600 15px/1.3 var(--sans);margin:22px 0 6px;letter-spacing:0}
.tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:18px;margin-top:20px}
.tile{display:flex;flex-direction:column;background:var(--card);border:1px solid var(--line);border-radius:18px;overflow:hidden;text-decoration:none;color:var(--ink);position:relative;box-shadow:var(--shadow);transition:transform .25s ease}.tile:hover{transform:translateY(-3px)}
.tile:before{content:"";position:absolute;left:0;right:0;top:0;height:4px;background:var(--c)}
.tile.budget{--c:var(--budget)}.tile.value{--c:var(--value)}.tile.lux{--c:var(--lux)}
.tile img{width:100%;aspect-ratio:16/10;object-fit:cover;background:var(--soft)}.tile div{padding:13px 15px;font-size:13px;color:var(--muted)}.tile strong{display:block;color:var(--ink);font:600 17px/1.25 var(--serif);margin-bottom:3px}
.prose{max-width:760px}.prose h2{font-size:28px;margin:34px 0 10px}.prose p,.prose li{color:var(--ink);font-size:16px}.prose .muted{color:var(--muted)}
.pillars{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin:24px 0}.pillar{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:20px;box-shadow:var(--shadow)}.pillar b{display:block;font:600 30px/1 var(--serif);color:var(--coral);margin-bottom:6px}.pillar span{font-size:14px;color:var(--muted)}
footer{border-top:1px solid var(--line);margin-top:64px;padding:34px 0 44px;font-size:13px;color:var(--muted)}
footer .cols{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:24px}footer h3{font:600 12px/1 var(--sans);letter-spacing:1.2px;text-transform:uppercase;color:var(--ink);margin:4px 0 12px}footer ul{list-style:none;padding:0;margin:0;display:grid;gap:7px}
footer a{color:var(--muted);text-decoration:none}footer a:hover{color:var(--coral)}footer .fine{margin-top:26px;padding-top:16px;border-top:1px solid var(--line);font-size:12px;display:flex;flex-wrap:wrap;gap:8px 20px;justify-content:space-between}
@media (max-width:760px){footer .cols{grid-template-columns:1fr 1fr}footer .cols>div:first-child{grid-column:1/-1}.areas{grid-template-columns:1fr}}
.reveal{opacity:0;transform:translateY(14px);transition:opacity .7s ease,transform .7s ease}.reveal.in{opacity:1;transform:none}
.lb{position:fixed;inset:0;z-index:100;background:#05090fe6;display:flex;align-items:center;justify-content:center;padding:20px;cursor:zoom-out}.lb img{max-width:100%;max-height:100%;border-radius:12px;box-shadow:0 20px 60px #000}
.sticky{display:none}
@media (max-width:900px){.cards{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;gap:14px;padding-bottom:6px;margin-right:-16px;scrollbar-width:none}.cards::-webkit-scrollbar{display:none}.card{flex:0 0 86%;scroll-snap-align:start}.top nav a.hide-sm{display:none}
.sticky{display:flex;position:fixed;left:12px;right:12px;bottom:12px;z-index:50;gap:8px}.sticky a{flex:1;min-height:50px;font-size:14px;border-radius:14px;box-shadow:0 8px 24px #0004}.hero .in{padding:22px 20px}}
@media print{.top,.sticky,.sharebar,footer,.plan{display:none!important}body{background:#fff;color:#000}}
@media (prefers-reduced-motion:reduce){*{animation:none!important;scroll-behavior:auto!important;transition:none!important}.reveal{opacity:1;transform:none}}`;

const GLOBAL_JS = `(function(){var io='IntersectionObserver' in window?new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{rootMargin:'0px 0px -8% 0px'}):null;document.querySelectorAll('main>section,.tiles,.areas').forEach(function(el){if(io){el.classList.add('reveal');io.observe(el)}});
document.addEventListener('click',function(ev){
var c=ev.target.closest&&ev.target.closest('[data-copy]');if(c){ev.preventDefault();var u=c.getAttribute('data-copy');(navigator.share&&matchMedia('(pointer:coarse)').matches?navigator.share({url:u,title:document.title}).catch(function(){}):navigator.clipboard.writeText(u).then(function(){c.textContent=c.getAttribute('data-done')}))}
var q=ev.target.closest&&ev.target.closest('[data-quick]');if(q){ev.preventDefault();var f=q.closest('form'),n=+q.getAttribute('data-quick'),d0=new Date(),a,b;if(n<0){var add=(5-d0.getDay()+7)%7+(n===-2?7:0);a=new Date(d0.getTime()+add*864e5);b=new Date(a.getTime()+2*864e5)}else{a=new Date(d0.getTime()+n*864e5);b=new Date(a.getTime()+2*864e5)}var iso=function(x){return x.toISOString().slice(0,10)};f.querySelector('[name=checkin]').value=iso(a);f.querySelector('[name=checkout]').value=iso(b)}})})();`;

function page(o: {
  L: Lang;
  title: string;
  description: string;
  path: string; // language-neutral path, e.g. "/rome"
  body: string;
  ld?: unknown[];
  noindex?: boolean;
  image?: string;
  langs?: boolean; // page exists in every language
  scripts?: string;
}) {
  const t = T[o.L];
  const url = SITE + P(o.L, o.path);
  const image = o.image ?? `${SITE}/og.png`;
  const alt = o.langs
    ? LANGS.map((l) => `<link rel="alternate" hreflang="${l}" href="${SITE}${P(l, o.path)}">`).join(
        "",
      ) + `<link rel="alternate" hreflang="x-default" href="${SITE}${o.path}">`
    : "";
  const langSel = o.langs
    ? `<label class="lang"><span class="sr" hidden>Language</span><select aria-label="Language" onchange="location.href=this.value">${LANGS.map(
        (l) =>
          `<option value="${P(l, o.path)}"${l === o.L ? " selected" : ""}>${T[l].name}</option>`,
      ).join("")}</select></label>`
    : "";
  return `<!doctype html><html lang="${t.htmlLang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(o.title)}</title><meta name="description" content="${esc(o.description)}">
${o.noindex ? '<meta name="robots" content="noindex,follow">' : `<link rel="canonical" href="${esc(url)}"><meta name="robots" content="index,follow,max-image-preview:large">`}${alt}
<meta property="og:site_name" content="Top3Hotels"><meta property="og:type" content="website"><meta property="og:url" content="${esc(url)}"><meta property="og:title" content="${esc(o.title)}"><meta property="og:description" content="${esc(o.description)}"><meta property="og:image" content="${esc(image)}"><meta property="og:locale" content="${t.htmlLang}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(o.title)}"><meta name="twitter:description" content="${esc(o.description)}"><meta name="twitter:image" content="${esc(image)}">
<meta name="theme-color" content="#f7f8fa" media="(prefers-color-scheme: light)"><meta name="theme-color" content="#0e1520" media="(prefers-color-scheme: dark)"><meta name="color-scheme" content="light dark"><link rel="icon" href="/favicon.ico" sizes="any"><link rel="icon" href="/icon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/apple-touch-icon.png">
<style>${CSS}
${CSS_PLUS}
${CSS_TRUST}</style>
${(o.ld ?? []).map((x) => `<script type="application/ld+json">${json(x)}</script>`).join("")}
<script>window.t3track=function(e,p){try{(window.dataLayer=window.dataLayer||[]).push(Object.assign({event:e},p||{}));if(window.gtag)gtag('event',e,p||{});if(window.plausible)plausible(e,{props:p||{}})}catch(_){}};document.addEventListener('click',function(ev){var a=ev.target.closest&&ev.target.closest('[data-t]');if(a)t3track(a.dataset.t,{city:a.dataset.city,category:a.dataset.cat,provider:a.dataset.p})});</script>
${consentScript(Z[o.L])}</head><body><div class="wrap">
<header class="top"><a class="logo" href="${P(o.L, "/")}">${LOGO}<span>top3hotels<em>.</em></span></a><nav aria-label="Main"><a href="${P(o.L, "/destinations")}">${t.allDest}</a><a class="hide-sm" href="${P(o.L, "/lists")}">${t.lists}</a><a class="hide-sm" href="/how-we-choose">${t.how}</a><a class="cta" href="/partners">${X[o.L].forHotels}</a><button type="button" class="tbtn" data-pal aria-label="${esc(Y[o.L].js["search"]!)}">🔍 <span class="lbl">${esc(Y[o.L].js["search"]!)}</span> <kbd>/</kbd></button><a class="tbtn" href="${P(o.L, "/saved")}" aria-label="${esc(Y[o.L].js["saved"]!)}">♡<span class="n" data-savedn hidden></span></a>${langSel}</nav></header>
<main>${o.body}</main>
<footer><div class="cols"><div><a class="logo" href="${P(o.L, "/")}" style="font-size:20px">${LOGO}<span>top3hotels<em>.</em></span></a><p style="max-width:340px;margin:12px 0 0">${t.footer} ${X[o.L].independent} · ${X[o.L].noPaid}.</p></div>
<div><h3>${X[o.L].explore}</h3><ul><li><a href="${P(o.L, "/destinations")}">${t.allDest}</a></li><li><a href="${P(o.L, "/lists")}">${t.lists}</a></li><li><a href="${P(o.L, "/from/billund")}">✈ Billund</a></li><li><a href="${P(o.L, "/from/aalborg")}">✈ Aalborg</a></li><li><a href="${P(o.L, "/from/aarhus")}">✈ Aarhus</a></li><li><a href="${P(o.L, "/cheap-cities")}">${esc(Y[o.L].cheapNav)}</a></li><li><a href="/random">🎲 ${esc(Y[o.L].js["surprise"]!)}</a></li></ul></div>
<div><h3>${X[o.L].company}</h3><ul><li><a href="/about">${X[o.L].about}</a></li><li><a href="/how-we-choose">${t.how}</a></li><li><a href="/partners">${X[o.L].forHotels}</a></li><li><a href="/contact">${X[o.L].contact}</a></li></ul></div>
<div><h3>${X[o.L].legal}</h3><ul><li><a href="/privacy">${X[o.L].privacy}</a></li><li><a href="/cookies">${X[o.L].cookies}</a></li><li><a href="/terms">${X[o.L].terms}</a></li><li><a href="/imprint">${X[o.L].imprint}</a></li><li><a href="/affiliate-disclosure">Affiliate disclosure</a></li><li><a href="/sitemap.xml">Sitemap</a></li></ul></div></div>
<div class="fine"><span>© 2026 Top3Hotels · ${BRAND.entity} (${BRAND.place})</span><span>${t.disclaimer}</span></div></footer>
</div>${o.scripts ?? ""}<script>window.T3L=${json(o.L)};window.T3S=${json(Y[o.L].js)};${GLOBAL_JS}
${JS_PLUS}</script></body></html>`;
}

const html = (body: string, status = 200, cache = "public, max-age=600, s-maxage=86400") =>
  new Response(body, {
    status,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": cache },
  });

/* ───────────────────────── city page ───────────────────────── */

function card(
  h: Hotel,
  city: IndexCity,
  i: number,
  L: Lang,
  sights: Sight[] | undefined,
  cityImg?: string,
) {
  const t = T[L];
  const b = h.booking ?? {},
    o = h.offer ?? {},
    ex = h.extras ?? {};
  const img = h.gallery?.find((g) => g.src)?.src;
  const k = catKey(h);
  const link = bookingLink(h);
  const walk = walkText(h, sights, L);
  const tags = (ex.tags ?? []).filter((x) => x !== "ac" && x !== "gym").slice(0, 5);
  const cmp = compareLinks(h, city).slice(1);
  const gal = (h.gallery ?? []).map((g) => g.src).filter(Boolean).slice(0, 10);
  const fav = {
    k: `${city.slug}/${k}`,
    s: city.slug,
    c: city.city,
    cat: k,
    n: h.name,
    lbl: label(h, L),
    img: img ?? "",
    p: `${b.score ? b.score.toFixed(1) + "/10 · " : ""}${money(o.nightly)} ${t.perNight}`,
  };
  const y = Y[L];
  const why = [
    b.score && b.count ? y.whyScore(b.score.toFixed(1), fmtInt(b.count)) : "",
    walk,
    h.candidateCount ? y.whyFrom(h.candidateCount) : "",
  ].filter(Boolean);
  return `<article class="card ${k}" id="${k}">
<div class="media"${gal.length ? ` data-gallery="${esc(JSON.stringify(gal))}"` : ""}><div class="acts"><button type="button" data-fav="${esc(JSON.stringify(fav))}" aria-pressed="false" aria-label="${esc(y.js["save"]!)}">♡</button><button type="button" data-sharecard="${esc(`${SITE}${P(L, "/" + city.slug)}#${k}`)}" data-title="${esc(`${label(h, L)}: ${h.name} · ${city.city}`)}" aria-label="${esc(y.js["share"]!)}">↗</button></div>${img ? `<img src="${esc(img)}" alt="${esc(h.name)}, ${esc(city.city)}" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.remove()">` : cityImg ? `<img src="${esc(cityImg)}" alt="${esc(city.city)}" loading="lazy"><span class="cityphoto">${esc(t.cityPhoto)}</span>` : `<div class="nophoto">${esc(h.name.slice(0, 1))}</div>`}
<div class="badge"><span>${esc(label(h, L))}</span>${i === 1 ? `<span class="pick">★ ${esc(t.ourPick)}</span>` : ""}</div>
<div class="over">${b.score ? `<span class="ring" style="--p:${Math.round(b.score * 10)}" title="Booking.com ${b.score.toFixed(1)}/10"><b>${b.score.toFixed(1)}</b></span>` : "<span></span>"}<span class="pricetag" data-eur="${o.nightly ?? ""}" title="${esc(y.priceRef(fmtDate(SNAPSHOT_DATE, L)))}"><span class="v">${money(o.nightly)}</span><small> ${esc(t.perNight)}</small></span></div></div>
<div class="body"><h2 class="hname">${esc(h.name)}</h2>
<div class="meta">${b.stars ? `<span class="stars" aria-label="${b.stars} stars">${"★".repeat(b.stars)}</span>` : ""}<span>${esc(h.area ?? city.city)}</span></div>
<p class="bestfor"><b>${esc(X[L].bestFor)}</b>${esc(bestFor(h, i, L, sights).join(" · "))}</p>
${why.length ? `<ul class="why">${why.map((w) => `<li>${esc(w)}</li>`).join("")}</ul>` : ""}
<div class="trust"><span><b>${fmtInt(b.count)}</b> Booking.com ${esc(t.reviews)}</span>${ex.loc ? `<span>${esc(t.location)} <b>${ex.loc}</b></span>` : ""}<span>${esc(t.checked(daysSince(b.checked)))}</span></div>
${ex.pros?.length ? `<ul class="pc"><li class="pro"><small>${esc(t.guestsSay)}</small>${esc(ex.pros[0])}</li>${ex.cons?.[0] ? `<li class="con">${esc(ex.cons[0])}</li>` : ""}</ul>` : `<p style="margin:0;font-size:14px">${esc(h.evidence?.shortReason ?? h.reason ?? "")}</p>`}
${tags.length ? `<ul class="chips">${tags.map((x) => `<li>${esc(t.tags[x] ?? x)}</li>`).join("")}</ul>` : ""}
<div class="price"><span>${esc(t.refRate)} · ${esc(range(o.checkin, o.checkout))} · 2 adults</span><span class="total" data-total="${o.nightly ?? ""}" hidden></span></div>
${link ? `<a class="btn" href="${esc(link)}" rel="sponsored nofollow noopener" target="_blank" data-t="check_availability" data-city="${esc(city.slug)}" data-cat="${k}" data-p="booking">${esc(t.checkPrice)} ↗</a><p class="disc">${esc(Z[L].disc)}</p>` : ""}
<div class="cmp"><span>${esc(t.compare)}:</span>${cmp.map(([n, u]) => `<a href="${esc(u)}" rel="nofollow noopener" target="_blank" data-t="compare_click" data-city="${esc(city.slug)}" data-cat="${k}" data-p="${esc(n)}">${esc(n)}</a>`).join("")}<a href="${esc(mapLink(h, city))}" rel="noopener nofollow" target="_blank">${esc(t.map)} ↗</a></div>
${
  h.evidence?.reasons?.length
    ? `<details><summary>${esc(t.why(label(h, L)))}</summary><ul>${h.evidence.reasons
        .slice(0, 4)
        .map((r) => `<li>${esc(r)}</li>`)
        .join("")}</ul></details>`
    : ""
}
</div></article>`;
}

function mapScript(hs: Hotel[], sights: Sight[] | undefined) {
  const pts = hs
    .filter((h) => h.coordinates)
    .map((h, i) => ({
      n: i + 1,
      name: h.name,
      lat: h.coordinates!.latitude,
      lng: h.coordinates!.longitude,
      c: ["#1f7a5a", "#d83b51", "#b8860b"][i],
    }));
  const ss = (sights ?? []).map((s) => ({ name: s.name, lat: s.lat, lng: s.lng }));
  return `<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.css" media="print" onload="this.media='all'">
<script>(function(){var P=${json(pts)},S=${json(ss)},el=document.getElementById('map');if(!el)return;var go=function(){var s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.js';s.onload=function(){var dark=matchMedia('(prefers-color-scheme: dark)').matches;var m=new maplibregl.Map({container:el,style:'https://tiles.openfreemap.org/styles/'+(dark?'dark':'positron'),center:[P[0].lng,P[0].lat],zoom:12,attributionControl:{compact:true},cooperativeGestures:true});m.addControl(new maplibregl.NavigationControl({showCompass:false}));var b=new maplibregl.LngLatBounds();P.forEach(function(p){var d=document.createElement('div');d.style.cssText='width:30px;height:30px;border-radius:50%;background:'+p.c+';color:#fff;font:700 14px system-ui;display:flex;align-items:center;justify-content:center;border:3px solid #fff;box-shadow:0 3px 10px #0005';d.textContent=p.n;new maplibregl.Marker({element:d}).setLngLat([p.lng,p.lat]).setPopup(new maplibregl.Popup({offset:18}).setText(p.name)).addTo(m);b.extend([p.lng,p.lat])});var cx=P.reduce(function(t,p){return t+p.lng},0)/P.length,cy=P.reduce(function(t,p){return t+p.lat},0)/P.length;S.forEach(function(p){var d=document.createElement('div');d.style.cssText='width:12px;height:12px;border-radius:50%;background:#46566a;border:2px solid #fff';new maplibregl.Marker({element:d}).setLngLat([p.lng,p.lat]).setPopup(new maplibregl.Popup({offset:10}).setText(p.name)).addTo(m);var dk=Math.hypot((p.lng-cx)*Math.cos(cy*Math.PI/180),p.lat-cy)*111;if(dk<=3)b.extend([p.lng,p.lat])});m.fitBounds(b,{padding:50,maxZoom:15,duration:0})};document.head.appendChild(s)};if('IntersectionObserver' in window){var io=new IntersectionObserver(function(e){if(e[0].isIntersecting){io.disconnect();go()}},{rootMargin:'300px'});io.observe(el)}else go()})();</script>`;
}

async function cityPage(city: IndexCity, L: Lang) {
  const cd = await cityData(city.id);
  if (!cd || cd.hotels?.length !== 3) return null;
  const t = T[L];
  const hs = cd.hotels as [Hotel, Hotel, Hotel];
  const [budget, value, lux] = hs;
  const sights = cd.extras?.sights;
  const hero = cd.extras?.hero;
  const { bySlug, byCountry } = await data();
  const o0 = budget.offer ?? {};
  const sample = budget.candidateCount;
  const cname = countryName(city, L);
  const title = t.title(city.city);
  const description = t.desc(city.city, cname, budget.name, value.name, lux.name);
  const areas = [...new Set(hs.map((h) => h.area).filter(Boolean))].join(", ");
  const dates = range(o0.checkin, o0.checkout);
  const checked = t.checked(daysSince(budget.booking?.checked)).toLowerCase();
  const ans = (h: Hotel) =>
    `${h.name}${h.area ? ` (${h.area})` : ""}: ${h.booking?.score ?? "–"}/10 · ${fmtInt(h.booking?.count)} ${t.reviews} · ${money(h.offer?.nightly)} ${t.perNight}${h.extras?.pros?.[0] ? ` · ${t.guestsSay}: “${h.extras.pros[0]}”` : ""}`;
  const faq: [string, string][] = [
    [t.faq.budget(city.city), ans(budget)],
    [t.faq.value(city.city), ans(value)],
    [t.faq.lux(city.city), ans(lux)],
    [t.faq.where(city.city), t.faq.whereA(areas || city.city)],
    [t.faq.live, t.faq.liveA(dates, `${({ en: "on", es: "el", de: "am", fr: "le", it: "il", pt: "em", da: "den" } as Record<Lang, string>)[L]} ${fmtDate(budget.booking?.checked || SNAPSHOT_DATE, L)}`)],
  ];
  const xt = X[L];
  const updated = fmtDate(SNAPSHOT_DATE, L);
  const areaBlock = `<section aria-labelledby="where"><h2 id="where">${esc(xt.whereStay(city.city))}</h2><p class="lead" style="margin-bottom:18px">${esc(new Set(hs.map((h) => h.area)).size === 1 && hs[0]!.area ? xt.whereSame(hs[0]!.area) : xt.whereLead)}</p><div class="areas">${hs
    .map((h, i) => {
      const w = walkMinutes(h, sights);
      const wt = walkText(h, sights, L);
      return `<div class="area ${catKey(h)}"><p class="eyebrow">${esc(label(h, L))}</p><h3>${esc(h.area || city.city)}</h3><p><a href="#${catKey(h)}">${esc(h.name)}</a>${wt ? ` · ${esc(wt)}` : ""}</p><p style="margin-top:6px">${esc(xt.bestFor)}: ${esc(bestFor(h, i, L, sights).join(", "))}${w ? "" : ""}</p></div>`;
    })
    .join("")}</div></section>`;
  const near = city.near.map((s) => bySlug.get(s)).filter(Boolean) as IndexCity[];
  const y = Y[L];
  const aps = Object.entries(await airports()).filter(([, a]) => a.dest.some(([id]) => id === city.id));
  const flights = aps.length
    ? `<p class="flights"><span>✈ ${esc(y.flights)}</span>${aps.map(([k, a]) => `<a href="${P(L, `/from/${k}`)}">${esc(a.name)} (${esc(a.iata)})</a>`).join("")}</p>`
    : "";
  const in1 = `<p class="in1h">${esc(y.in1)}</p><div class="in1">${hs.map((h) => `<a class="${catKey(h)}" href="#${catKey(h)}"><small>${esc(label(h, L))}</small><strong>${esc(h.name)}</strong><span>${h.booking?.score ? h.booking.score.toFixed(1) + "/10 · " : ""}<span data-eur="${h.offer?.nightly ?? ""}"><span class="v">${money(h.offer?.nightly)}</span></span> ${esc(t.perNight)}</span></a>`).join("")}</div>`;
  const jump = `<nav class="jump" aria-label="${esc(y.jHotels)}"><a href="#hotels">${esc(y.jHotels)}</a><a href="#where">${esc(y.jWhere)}</a><a href="#maph">${esc(y.jMap)}</a><a href="#cmp">${esc(y.jCompare)}</a><a href="#faq">${esc(y.jFaq)}</a></nav>`;
  const curSel = `<label>${esc(y.currency)}<select data-cur aria-label="${esc(y.currency)}">${["EUR", "GBP", "USD", "DKK", "SEK", "NOK", "CHF"].map((c) => `<option>${c}</option>`).join("")}</select></label>`;
  const guestSel = `<label>${esc(y.guests)}<select name="adults">${[1, 2, 3, 4, 5, 6].map((n) => `<option${n === 2 ? " selected" : ""}>${n}</option>`).join("")}</select></label><label>${esc(y.rooms)}<select name="rooms">${[1, 2, 3, 4].map((n) => `<option>${n}</option>`).join("")}</select></label>`;
  const embed = `<iframe src="${SITE}/embed/${city.slug}" width="100%" height="420" style="border:0;border-radius:16px;max-width:720px" loading="lazy" title="Top 3 hotels in ${city.city} · Top3Hotels"></iframe>`;
  const same = (byCountry.get(city.cslug) ?? []).filter((c) => c.slug !== city.slug).slice(0, 24);
  const path = `/${city.slug}`;
  const image = hero?.img ?? hs.find((h) => h.gallery?.[0]?.src)?.gallery?.[0]?.src;
  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Top3Hotels", item: SITE + P(L, "/") },
        {
          "@type": "ListItem",
          position: 2,
          name: cname,
          item: `${SITE}${P(L, `/country/${city.cslug}`)}`,
        },
        { "@type": "ListItem", position: 3, name: city.city, item: SITE + P(L, path) },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: t.h1(city.city),
      dateModified: SNAPSHOT_DATE,
      author: { "@type": "Organization", name: "Top3Hotels", url: SITE },
      numberOfItems: 3,
      itemListElement: hs.map((h, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: `${label(h, L)}: ${h.name}`,
        item: {
          "@type": "Hotel",
          name: h.name,
          address: {
            "@type": "PostalAddress",
            streetAddress: h.address,
            addressLocality: city.city,
            addressCountry: city.cc || city.country,
          },
          ...(h.coordinates
            ? {
                geo: {
                  "@type": "GeoCoordinates",
                  latitude: h.coordinates.latitude,
                  longitude: h.coordinates.longitude,
                },
              }
            : {}),
          ...(h.booking?.stars
            ? { starRating: { "@type": "Rating", ratingValue: h.booking.stars } }
            : {}),
          ...(h.offer?.nightly
            ? { priceRange: `from ${money(h.offer.nightly)} per night (reference)` }
            : {}),
          ...(h.gallery?.[0]?.src ? { image: h.gallery[0].src } : {}),
        },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map(([q, a]) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
      })),
    },
  ];
  const body = `<p class="crumbs"><a href="${P(L, "/")}">${esc(t.home)}</a> › <a href="${P(L, `/country/${city.cslug}`)}">${esc(cname)}</a> › ${esc(city.city)}</p>
<div class="hero${hero?.img ? "" : " noimg"}">${hero?.img ? `<img src="/api/img/${esc(city.id)}/big" srcset="/api/img/${esc(city.id)}/small 500w, /api/img/${esc(city.id)}/mid 960w, /api/img/${esc(city.id)}/big 1280w" sizes="(max-width: 960px) 100vw, 1180px" alt="${esc(city.city)}" fetchpriority="high" onerror="this.onerror=null;this.src='/api/img/${esc(city.id)}/orig'">` : ""}
<div class="in"><p class="eyebrow">${esc(cname)} · 3 · ${esc(t.ourPick)}</p><h1>${esc(t.h1(city.city))}<em>.</em></h1><p class="lead">${esc(t.lead(sample))}</p></div>${hero?.page ? `<small>${esc(t.photo)}: <a href="${esc(hero.page)}" rel="nofollow noopener" target="_blank">Wikimedia Commons</a></small>` : ""}</div>
<p class="byline"><span class="ok">${esc(xt.reviewed(updated))}</span><span class="ok">${esc(xt.independent)}</span><span class="ok">${esc(xt.noPaid)}</span></p>${flights}${in1}${jump}<span hidden data-track="${esc(JSON.stringify({ s: city.slug, c: city.city }))}"></span>
<form class="plan" action="/" method="get"><input type="hidden" name="city" value="${esc(city.slug)}"><label>${esc(t.checkIn)}<input type="date" name="checkin"></label><label>${esc(t.checkOut)}<input type="date" name="checkout"></label>${guestSel}${curSel}<button class="btn" type="submit" data-t="dates_submit" data-city="${esc(city.slug)}">${esc(t.seeDates)}</button><div class="quick"><span>${esc(xt.quick)}:</span><button type="button" data-quick="-1">${esc(xt.thisWeekend)}</button><button type="button" data-quick="-2">${esc(xt.nextWeekend)}</button><button type="button" data-quick="30">${esc(xt.inAMonth)}</button></div></form>
<div class="cards" id="hotels">${hs.map((h, i) => card(h, city, i, L, sights, hero?.img ? `/api/img/${city.id}/big` : undefined)).join("")}</div>
<p class="note">${esc(t.refRate)}: ${esc(dates)}, 2 adults, 1 room · Booking.com · ${esc(checked)}.</p>
<div class="sharebar"><span>${esc(xt.share)}:</span><a href="https://wa.me/?text=${encodeURIComponent(t.h1(city.city) + " " + SITE + P(L, path))}" target="_blank" rel="noopener" data-t="share" data-p="whatsapp">WhatsApp</a><a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(SITE + P(L, path))}" target="_blank" rel="noopener" data-t="share" data-p="facebook">Facebook</a><a href="https://x.com/intent/post?url=${encodeURIComponent(SITE + P(L, path))}&amp;text=${encodeURIComponent(t.h1(city.city))}" target="_blank" rel="noopener" data-t="share" data-p="x">X</a><button type="button" data-copy="${esc(SITE + P(L, path))}" data-done="${esc(xt.copied)}">${esc(xt.copyLink)}</button><a href="mailto:?subject=${encodeURIComponent(t.h1(city.city))}&amp;body=${encodeURIComponent(hs.map((h) => `${label(h, L)}: ${h.name} (${h.booking?.score?.toFixed(1) ?? "–"}/10, ${money(h.offer?.nightly)} ${t.perNight})`).join("\n") + "\n\n" + SITE + P(L, path))}" data-t="share" data-p="email">✉ ${esc(xt.emailMe)}</a></div>
${filmingBlock(city, L)}
${guideBlock(city, L)}
${areaBlock}
<section aria-labelledby="maph"><h2 id="maph">${esc(t.map)}</h2><div id="map" role="img" aria-label="${esc(t.mapHint)}"></div><div class="legend"><span><i style="background:#1f7a5a"></i>${esc(t.cat.Budget)}</span><span><i style="background:#d83b51"></i>${esc(t.cat["Best Value"])}</span><span><i style="background:#b8860b"></i>${esc(label(lux, L))}</span>${sights?.length ? `<span><i style="background:#46566a"></i>${esc(sights.map((s) => s.name).join(" · "))}</span>` : ""}</div></section>
<section aria-labelledby="cmp"><h2 id="cmp">${esc(t.compared(city.city))}</h2><div class="tablewrap"><table><thead><tr>${t.cols.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>
${hs.map((h) => `<tr><td>${esc(label(h, L))}</td><td>${esc(h.name)}</td><td>${esc(h.area ?? "")}</td><td>${h.booking?.stars ?? "–"}</td><td>${h.booking?.score?.toFixed(1) ?? "–"} (${fmtInt(h.booking?.count)})</td><td>${money(h.offer?.nightly)}</td></tr>`).join("")}
</tbody></table></div></section>
<section aria-labelledby="faq"><h2 id="faq">${esc(t.faqTitle(city.city))}</h2><dl class="faq">${faq.map(([q, a]) => `<dt>${esc(q)}</dt><dd>${esc(a)}</dd>`).join("")}</dl></section>
<section aria-labelledby="how"><h2 id="how">${esc(t.howTitle)}</h2><p class="lead">${esc(t.howText)} <a href="/how-we-choose">${esc(t.how)} →</a></p></section>
<section aria-labelledby="src"><h2 id="src">${esc(xt.sources)}</h2><p class="sources">${esc(xt.sourcesText)} ${esc(t.checked(daysSince(budget.booking?.checked)))}.</p>
<div class="forhotels"><h3 class="serif" style="font-size:22px;margin:0 0 6px">${esc(xt.badgeQ)}</h3><p style="margin:0;font-size:14px;color:var(--muted)">${esc(xt.badgeHow)}</p>${hs.map((h) => `<p style="margin:12px 0 0;font-weight:600">${esc(h.name)}</p><code>${esc(`<a href="${SITE}/${city.slug}" target="_blank" rel="noopener" title="Top3Hotels ${label(h, "en")} pick in ${city.city}"><img src="${SITE}/badge/${city.slug}/${catKey(h)}.svg" width="180" height="60" alt="Top 3 ${label(h, "en")} pick in ${city.city} 2026 · Top3Hotels"></a>`)}</code>`).join("")}<p style="margin:0;font-size:13px"><a href="/partners">${esc(xt.forHotels)} →</a></p><h3 class="serif" style="font-size:22px;margin:22px 0 6px">${esc(y.embedTitle)}</h3><p style="margin:0;font-size:14px;color:var(--muted)">${esc(y.embedHow)} <a href="/embed/${esc(city.slug)}" target="_blank" rel="noopener">Preview ↗</a></p><code>${esc(embed)}</code></div></section>
${near.length ? `<section aria-labelledby="near"><h2 id="near">${esc(t.near(city.city))}</h2><ul class="grid">${near.map((c) => `<li><a href="${P(L, "/" + c.slug)}">${esc(c.city)} <span>${esc(countryName(c, L))}</span></a></li>`).join("")}</ul><p class="note" style="margin-top:14px">${esc(y.compareWith(city.city))}: ${POPULAR.filter((s) => s !== city.slug).slice(0, 6).map((s) => bySlug.get(s)).filter((c): c is IndexCity => Boolean(c)).map((c) => `<a href="${P(L, `/compare/${city.slug}/${c.slug}`)}" rel="nofollow">${esc(c.city)}</a>`).join(" · ")}</p></section>` : ""}
${hotelsBlock(city, L)}
<section hidden data-recent><h2>${esc(y.js["recent"]!)}</h2><div class="chipsrow"></div></section>
${newsBlock(L)}
${same.length ? `<section aria-labelledby="more"><h2 id="more">${esc(t.moreIn(cname))}</h2><ul class="grid">${same.map((c) => `<li><a href="${P(L, "/" + c.slug)}">${esc(c.city)}</a></li>`).join("")}</ul><p class="note"><a href="${P(L, `/country/${city.cslug}`)}">${esc(t.allIn(cname))}</a></p></section>` : ""}
<div class="sticky">${bookingLink(value) ? `<a class="btn coral" href="${esc(bookingLink(value)!)}" rel="sponsored nofollow noopener" target="_blank" data-t="check_availability" data-city="${esc(city.slug)}" data-cat="value" data-p="booking-sticky">★ ${esc(t.checkPrice)}</a>` : ""}</div>`;
  return page({
    L,
    title,
    description,
    path,
    body,
    ld,
    ...(image ? { image } : {}),
    langs: true,
    scripts: mapScript(hs, sights),
  });
}

/* ───────────────────────── hubs ───────────────────────── */

async function tileFor(c: IndexCity, h: Hotel, L: Lang, extra = "") {
  const { cx } = await data();
  const img =
    h.gallery?.find((g) => g.src)?.src ??
    (cx[c.id]?.hero?.img ? `/api/img/${c.id}/small` : undefined);
  return `<a class="tile ${catKey(h)}" href="${P(L, "/" + c.slug)}">${img ? `<img src="${esc(img)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ""}<div><strong>${esc(h.name)}</strong>${esc(c.city)}, ${esc(countryName(c, L))} · ${esc(label(h, L))} · ${h.booking?.score?.toFixed(1) ?? "–"}/10 · ${money(h.offer?.nightly)}${extra}</div></a>`;
}

async function countryPage(cslug: string, L: Lang) {
  const { byCountry } = await data();
  const list = byCountry.get(cslug);
  if (!list?.length) return null;
  const t = T[L];
  const cname = countryName(list[0]!, L);
  const rows = await Promise.all(list.map(async (c) => ({ c, d: await cityData(c.id) })));
  const path = `/country/${cslug}`;
  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Top3Hotels", item: SITE + P(L, "/") },
        { "@type": "ListItem", position: 2, name: cname, item: SITE + P(L, path) },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: t.countryH1(cname),
      itemListElement: list.map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: t.h1(c.city),
        url: `${SITE}${P(L, "/" + c.slug)}`,
      })),
    },
  ];
  const tiles = await Promise.all(
    rows.filter((r) => r.d).map(({ c, d }) => tileFor(c, d!.hotels[1]!, L)),
  );
  const body = `<p class="crumbs"><a href="${P(L, "/")}">${esc(t.home)}</a> › <a href="${P(L, "/destinations")}">${esc(t.allDest)}</a> › ${esc(cname)}</p>
<h1>${esc(t.countryH1(cname))}<em>.</em></h1><p class="lead">${esc(t.countryLead(list.length))}</p>
<div class="tiles">${tiles.join("")}</div>
<section><div class="tablewrap"><table><thead><tr><th>${esc(t.allDest)}</th><th>${esc(t.cat.Budget)}</th><th>${esc(t.cat["Best Value"])}</th><th>${esc(t.cat.Luxury)}</th></tr></thead><tbody>
${rows
  .filter((r) => r.d)
  .map(
    ({ c, d }) =>
      `<tr><td><a href="${P(L, "/" + c.slug)}"><strong>${esc(c.city)}</strong></a></td>${d!.hotels.map((h) => `<td>${esc(h.name)}<br><small>${h.booking?.score?.toFixed(1) ?? "–"}/10 · ${money(h.offer?.nightly)}</small></td>`).join("")}</tr>`,
  )
  .join("")}
</tbody></table></div></section>`;
  const img = rows.find((r) => r.d?.extras?.hero?.img)?.d?.extras?.hero?.img;
  return page({
    L,
    title: t.countryTitle(cname, list.length),
    description: `${t.countryLead(list.length)} ${list
      .slice(0, 5)
      .map((c) => c.city)
      .join(", ")}…`,
    path,
    body,
    ld,
    langs: true,
    ...(img ? { image: img } : {}),
  });
}

async function destinationsPage(L: Lang) {
  const { byCountry, index } = await data();
  const t = T[L];
  const countries = [...byCountry.entries()].sort((a, b) =>
    countryName(a[1][0]!, L).localeCompare(countryName(b[1][0]!, L), L),
  );
  const body = `<p class="crumbs"><a href="${P(L, "/")}">${esc(t.home)}</a> › ${esc(t.allDest)}</p><h1>${esc(t.destH1(index.length))}<em>.</em></h1>
<p class="lead">${esc(t.destLead(countries.length))}</p>
<section class="countries">${countries
    .map(
      ([cs, list]) =>
        `<h2><a href="${P(L, `/country/${cs}`)}">${esc(countryName(list[0]!, L))}</a> <small>${list.length}</small></h2><ul class="grid">${list.map((c) => `<li><a href="${P(L, "/" + c.slug)}">${esc(c.city)}</a></li>`).join("")}</ul>`,
    )
    .join("")}</section>`;
  return page({
    L,
    title: t.destTitle(index.length),
    description: t.destLead(countries.length),
    path: "/destinations",
    body,
    langs: true,
  });
}

/* ───────────────────────── lists ───────────────────────── */

const THEMES = ["beach", "pool", "pets", "family", "spa", "budget", "luxury"] as const;
type Theme = (typeof THEMES)[number];
const EVENTS: { slug: string; city: string; name: string; when: string }[] = [
  {
    slug: "oktoberfest",
    city: "munich",
    name: "Oktoberfest",
    when: "late September – early October",
  },
  { slug: "rio-carnival", city: "rio-de-janeiro", name: "Rio Carnival", when: "February / March" },
  { slug: "venice-carnival", city: "venice", name: "Venice Carnival", when: "February" },
  {
    slug: "christmas-markets-vienna",
    city: "vienna",
    name: "Vienna Christmas markets",
    when: "mid-November – December",
  },
  {
    slug: "christmas-markets-prague",
    city: "prague",
    name: "Prague Christmas markets",
    when: "late November – early January",
  },
  {
    slug: "christmas-markets-strasbourg",
    city: "strasbourg",
    name: "Strasbourg Christmas market",
    when: "late November – December",
  },
  {
    slug: "christkindlesmarkt-nuremberg",
    city: "nuremberg",
    name: "Nuremberg Christkindlesmarkt",
    when: "late November – December",
  },
  { slug: "cologne-carnival", city: "cologne", name: "Cologne Carnival", when: "February" },
  {
    slug: "cherry-blossom-tokyo",
    city: "tokyo",
    name: "Cherry blossom in Tokyo",
    when: "late March – early April",
  },
  {
    slug: "cherry-blossom-kyoto",
    city: "kyoto",
    name: "Cherry blossom in Kyoto",
    when: "early April",
  },
  { slug: "las-fallas", city: "valencia-spain", name: "Las Fallas", when: "15–19 March" },
  { slug: "feria-de-abril", city: "seville", name: "Seville April Fair", when: "April" },
  {
    slug: "edinburgh-fringe",
    city: "edinburgh",
    name: "Edinburgh Festival Fringe",
    when: "August",
  },
  {
    slug: "new-years-eve-sydney",
    city: "sydney",
    name: "New Year's Eve in Sydney",
    when: "31 December",
  },
  {
    slug: "new-years-eve-new-york",
    city: "new-york",
    name: "New Year's Eve in New York",
    when: "31 December",
  },
  { slug: "san-fermin", city: "pamplona", name: "San Fermín", when: "6–14 July" },
  { slug: "cannes-film-festival", city: "cannes", name: "Cannes Film Festival", when: "May" },
  {
    slug: "salzburg-festival",
    city: "salzburg",
    name: "Salzburg Festival",
    when: "late July – August",
  },
  { slug: "legoland-billund", city: "billund", name: "LEGOLAND season", when: "April – October" },
  {
    slug: "tivoli-christmas",
    city: "copenhagen",
    name: "Christmas at Tivoli",
    when: "mid-November – December",
  },
  {
    slug: "aarhus-festuge",
    city: "aarhus",
    name: "Aarhus Festuge",
    when: "late August – early September",
  },
  { slug: "aalborg-carnival", city: "aalborg", name: "Aalborg Carnival", when: "late May" },
  {
    slug: "northern-lights-tromso",
    city: "tromso",
    name: "Northern lights season",
    when: "October – March",
  },
  { slug: "ski-salen", city: "salen", name: "Ski season in Sälen", when: "December – April" },
];

async function themeRows(theme: Theme) {
  const { byId } = await data();
  const lists = ((await import("../generated/lists.json")).default ?? {}) as unknown as Record<
    string,
    [string, number][]
  >;
  const out: { c: IndexCity; h: Hotel }[] = [];
  for (const [id, i] of lists[theme] ?? []) {
    const c = byId.get(id);
    const d = c ? await cityData(id) : null;
    const h = d?.hotels[i];
    if (c && h) out.push({ c, h });
  }
  return out;
}

async function listsIndex(L: Lang) {
  const t = T[L];
  const body = `<p class="crumbs"><a href="${P(L, "/")}">${esc(t.home)}</a> › ${esc(t.lists)}</p><h1>${esc(t.listsTitle)}<em>.</em></h1><p class="lead">${esc(t.listsLead)}</p>
<section><ul class="grid">${THEMES.map((th) => `<li><a href="${P(L, `/lists/${th}`)}">${esc(t.themes[th]!.title)}</a></li>`).join("")}</ul></section>
<section><h2>${esc(t.fromNav)}</h2><ul class="grid">${["billund", "aalborg", "aarhus"].map((k) => `<li><a href="${P(L, `/from/${k}`)}">${esc(t.fromH1(k[0]!.toUpperCase() + k.slice(1)))}</a></li>`).join("")}</ul></section><section><h2>Events</h2><ul class="grid">${EVENTS.map((e) => `<li><a href="${P(L, `/lists/${e.slug}`)}">${esc(e.name)} <span>${esc(e.when)}</span></a></li>`).join("")}</ul></section>`;
  return page({
    L,
    title: `${t.listsTitle} | Top3Hotels`,
    description: t.listsLead,
    path: "/lists",
    body,
    langs: true,
  });
}

async function themePage(theme: Theme, L: Lang) {
  const t = T[L];
  const th = t.themes[theme]!;
  const rows = (await themeRows(theme)).slice(0, 60);
  const tiles = await Promise.all(rows.map(({ c, h }) => tileFor(c, h, L)));
  const body = `<p class="crumbs"><a href="${P(L, "/")}">${esc(t.home)}</a> › <a href="${P(L, "/lists")}">${esc(t.lists)}</a> › ${esc(th.title)}</p>
<h1>${esc(th.h1)}<em>.</em></h1><p class="lead">${esc(th.lead)}</p><div class="tiles">${tiles.join("")}</div>`;
  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: th.h1,
      itemListElement: rows.map(({ c, h }, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: `${h.name}, ${c.city}`,
        url: `${SITE}${P(L, "/" + c.slug)}`,
      })),
    },
  ];
  const img = rows[0]?.h.gallery?.[0]?.src;
  return page({
    L,
    title: `${th.title} (2026) | Top3Hotels`,
    description: th.lead,
    path: `/lists/${theme}`,
    body,
    ld,
    langs: true,
    ...(img ? { image: img } : {}),
  });
}

async function eventPage(slug: string, L: Lang) {
  const ev = EVENTS.find((e) => e.slug === slug);
  if (!ev) return null;
  const { bySlug } = await data();
  const c = bySlug.get(ev.city);
  if (!c) return null;
  const d = await cityData(c.id);
  if (!d) return null;
  const t = T[L];
  const title = `Best hotels for ${ev.name} (2026): the 3 to book | Top3Hotels`;
  const tiles = await Promise.all(d.hotels.map((h) => tileFor(c, h, L)));
  const body = `<p class="crumbs"><a href="${P(L, "/")}">${esc(t.home)}</a> › <a href="${P(L, "/lists")}">${esc(t.lists)}</a> › ${esc(ev.name)}</p>
<div class="hero${d.extras?.hero?.img ? "" : " noimg"}">${d.extras?.hero?.img ? `<img src="/api/img/${esc(c.id)}/big" alt="${esc(c.city)}">` : ""}<div class="in"><p class="eyebrow">${esc(ev.when)}</p><h1>Best hotels for ${esc(ev.name)}<em>.</em></h1><p class="lead">Three hotels in ${esc(c.city)}: one Budget, one Best Value, one Luxury. Book early: prices rise fast around ${esc(ev.name)}.</p></div></div>
<div class="tiles">${tiles.join("")}</div><p style="margin-top:22px"><a class="btn" href="${P(L, "/" + c.slug)}">${esc(t.h1(c.city))} →</a></p>`;
  return page({
    L,
    title,
    description: `The three hotels to book in ${c.city} for ${ev.name} (${ev.when}): Budget, Best Value and Luxury, with sourced scores and reference prices.`,
    path: `/lists/${slug}`,
    body,
    langs: true,
    ...(d.extras?.hero?.img ? { image: d.extras.hero.img } : {}),
  });
}

function notFoundPage(path: string, L: Lang) {
  const t = T[L];
  return page({
    L,
    title: `${t.notFound} — Top3Hotels`,
    description: t.destLead(119),
    path,
    noindex: true,
    body: `<div style="text-align:center;padding:56px 0 10px"><p style="font:400 92px/1 var(--serif);margin:0;color:var(--coral)">4<span style="color:var(--budget)">0</span><span style="color:var(--lux)">4</span></p><h1 style="margin-top:12px">${esc(Y[L].nfTitle)}<em>.</em></h1><p class="lead" style="margin:0 auto">${esc(t.notFound)}. ${esc(Y[L].nfLead)}</p><p style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:22px"><button type="button" class="btn" data-pal>🔍 ${esc(Y[L].js["search"]!)}</button><a class="btn ghost" href="/random">🎲 ${esc(Y[L].js["surprise"]!)}</a><a class="btn ghost" href="${P(L, "/destinations")}">${esc(t.allDest)}</a></p><div class="chipsrow" style="justify-content:center;margin-top:26px">${POPULAR.map((s) => `<a href="${P(L, "/" + s)}">${esc(s.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()))}</a>`).join("")}</div></div>`,
  });
}

/* ───────────────────────── company, trust & legal pages (English) ───────────────────────── */

async function stats() {
  const { index, byCountry } = await data();
  return {
    cities: index.length,
    hotels: index.length * 3,
    countries: byCountry.size,
    langs: LANGS.length,
  };
}
const pillars = (n: Awaited<ReturnType<typeof stats>>) =>
  `<div class="pillars"><div class="pillar"><b>${n.cities.toLocaleString("en-US")}</b><span>destinations, three hotels each</span></div><div class="pillar"><b>${n.hotels.toLocaleString("en-US")}</b><span>picks — Budget, Best Value, Luxury — chosen by public rules</span></div><div class="pillar"><b>${n.countries}</b><span>countries</span></div><div class="pillar"><b>${n.langs}</b><span>languages: EN · ES · DE · FR · IT · PT · DA</span></div></div>`;
const mail = (subject: string, text = BRAND.email) =>
  `<a href="mailto:${BRAND.email}?subject=${encodeURIComponent(subject)}">${esc(text)}</a>`;
const crumbsEn = (name: string) => `<p class="crumbs"><a href="/">Home</a> › ${esc(name)}</p>`;

async function aboutPage() {
  const n = await stats();
  const body = `${crumbsEn("About us")}<h1>The best hotel. The right price. In 1 second<em>.</em></h1>
<p class="lead">Top3Hotels replaces endless hotel lists with three clear choices per city: one Budget, one Best Value and one Luxury hotel. Every pick shows where its data comes from and when we checked it.</p>
${pillars(n)}
<div class="prose">
<h2>Why we exist</h2><p>Booking a hotel should not take an evening. Big booking sites show hundreds of options, sponsored placements and filters. We do the shortlisting for you, with the same rules in every city, so you can decide in seconds and book with confidence.</p>
<h2>What makes us different</h2><ul><li><b>Three picks, not three hundred.</b> One per budget level, always in the same order.</li><li><b>No paid rankings.</b> A hotel cannot pay to be included, moved up or kept in a list.</li><li><b>Sourced and dated.</b> Guest scores, review counts and reference prices come from Booking.com and show the date we checked them.</li><li><b>Useful context.</b> Walking time to the best-known sights, what guests praise and what they criticise, and who each hotel suits best.</li></ul>
<h2>Who is behind Top3Hotels</h2><p>Top3Hotels is an independent project of ${esc(BRAND.entity)} (${esc(BRAND.place)}), founded by ${esc(BRAND.founder)}, a growth and travel-tech entrepreneur based between Denmark and Spain. The editorial rules are public on <a href="/how-we-choose">How we choose</a>.</p>
<h2>How we make money</h2><p>When you book through some of our links we may earn a commission from the booking site, at no extra cost to you. Commissions never influence which hotels we pick.</p>
<p><a class="btn" href="/how-we-choose">How we choose</a> <a class="btn ghost" href="/partners">For hotels &amp; partners</a></p></div>`;
  return page({
    L: "en",
    title: "About Top3Hotels — the best hotel in every city, picked in 1 second",
    description:
      "Who we are, why we show only three hotels per city, and how Top3Hotels stays independent.",
    path: "/about",
    body,
    ld: [orgLd()],
  });
}

async function methodPage() {
  const body = `${crumbsEn("How we choose")}<h1>How we choose the three<em>.</em></h1>
<p class="lead">The same transparent rules in every city. No hotel can pay to be one of the three picks.</p>
<div class="prose">
<h2>1. The sample</h2><p>For each destination we take the hotels Booking.com returns for the same reference stay: two adults, one room, two mid-week nights in November 2026. For major destinations we use up to 40 hotels closest to the centre, so every pick is well located.</p>
<h2>2. Eligibility</h2><p>A hotel needs a real track record: at least 15 guest reviews and a guest score of 7.0 or more (8.0 for large samples). When a city has enough proper hotels, private apartments are left out.</p>
<h2>3. The three picks</h2><ul><li><b>Budget</b> — the lowest eligible reference price.</li><li><b>Best Value</b> — the strongest review-confidence score at or near the sample's median price. Review confidence weighs the score by the number of reviews, so a 9.4 from 4,000 guests beats a 9.8 from 12.</li><li><b>Luxury</b> — the best-reviewed five-star hotel. If no five-star qualifies, a four-star rated 8.5+ is shown and clearly labelled as an upscale alternative.</li></ul>
<h2>4. What we show for each hotel</h2><p>Guest score and review count, reference price, star classification, location score, what guests praise and criticise, facilities, walking time to the best-known sights (straight-line estimate) and who the hotel suits best.</p>
<h2>5. Freshness and corrections</h2><p>Every page shows when prices were checked. Prices are reference rates, not live quotes; the booking link always shows the current price for your dates. Spotted something wrong? ${mail("Correction request")}. We aim to review corrections within a few working days.</p>
<h2>6. Independence</h2><p>Some links earn us a commission. That never changes the selection, the order or the text. Hotels cannot buy a place in the three picks, our scores or reviews. A hotel can appear as a clearly labelled <em>Featured partner</em> (for example after a filmed stay); those features are always marked and kept separate from the picks. Read our <a href="/affiliate-disclosure">affiliate disclosure</a>.</p>
<h2>Sources</h2><p class="muted">Booking.com (scores, reviews, prices, hotel photos) · Wikimedia Commons (city photos) · Wikipedia (sights) · OpenStreetMap / OpenFreeMap (maps).</p></div>`;
  return page({
    L: "en",
    title: "How we choose the three hotels — Top3Hotels methodology",
    description:
      "The transparent rules behind every Budget, Best Value and Luxury pick on Top3Hotels.",
    path: "/how-we-choose",
    body,
  });
}

async function partnersPage() {
  const n = await stats();
  const body = `${crumbsEn("For hotels & partners")}<h1>Work with Top3Hotels<em>.</em></h1>
<p class="lead">We help travellers choose in one second. Hotels, destinations and travel brands work with us on content that travellers trust, because our picks can't be bought.</p>
${pillars(n)}
<div class="prose">
<h2>For selected hotels</h2><ul><li><b>The official Top 3 badge</b>, free, for your website and social channels. Find your code at the bottom of your city page.</li><li><b>Your hotel, correctly presented.</b> Send us better photos, facility updates or corrections.</li><li><b>On request:</b> a “Top 3 pick 2026” certificate for your reception and press materials.</li></ul>
<h2>For destinations, airports and airlines</h2><ul><li>Route pages like <a href="/from/billund">Direct flights from Billund</a>, <a href="/from/aalborg">Aalborg</a> and <a href="/from/aarhus">Aarhus</a>: the three best hotels in every destination you fly to.</li><li>Event and season guides (Christmas markets, LEGOLAND season, festivals) in seven languages.</li></ul>
<h2>For travel brands and creators</h2><ul><li>Co-branded city guides, newsletters and social content built on our shortlists.</li><li>On request: embeddable “3 best hotels” blocks for your city or event page.</li></ul>
<h2>Our principles</h2><p>Selection is editorial and rule-based (<a href="/how-we-choose">see how we choose</a>). Partnerships never change which hotels appear or their order. Sponsored content is always labelled.</p>
<p><a class="btn coral" href="mailto:${BRAND.email}?subject=${encodeURIComponent("Partnership with Top3Hotels")}">Contact partnerships</a> <a class="btn ghost" href="/top3hotels-media-kit.pdf" download>Download media kit (PDF)</a> <a class="btn ghost" href="/partners/media-kit">View media kit</a></p></div>`;
  return page({
    L: "en",
    title: "For hotels & partners — Top3Hotels",
    description:
      "Badges for selected hotels, destination and route guides, co-branded content. Independent picks that travellers trust.",
    path: "/partners",
    body,
    ld: [orgLd()],
  });
}

async function mediaKitPage() {
  const n = await stats();
  const body = `<p class="eyebrow" style="margin-top:28px">Media kit · ${fmtDate(SNAPSHOT_DATE, "en")}</p><h1>Top3Hotels<em>.</em></h1>
<p class="lead">The best hotel in every city, picked in 1 second. One Budget, one Best Value and one Luxury hotel per destination, with sourced scores and reference prices.</p>
${pillars(n)}
<div class="prose"><h2>The product</h2><ul><li>${n.cities.toLocaleString("en-US")} destination pages in ${n.langs} languages, each with three hotels, map, walking times to sights and guest feedback.</li><li>Country pages, themed lists (beach, pool, pets, family, spa, budget, luxury) and event guides.</li><li>Route pages for direct flights from Billund, Aalborg and Aarhus.</li></ul>
<h2>Why travellers trust it</h2><ul><li>Rule-based, public methodology. No paid rankings.</li><li>Every number shows its source and the date it was checked.</li><li>Fast and accessible: Lighthouse 100 for accessibility, best practices and SEO.</li></ul>
<h2>Partnership formats</h2><ul><li>Top 3 badge for selected hotels (free); certificate on request.</li><li>Destination, airport and airline route guides.</li><li>Co-branded city and event content, newsletters, social.</li></ul>
<h2>Company</h2><p>${esc(BRAND.entity)} · ${esc(BRAND.place)} · Founder: ${esc(BRAND.founder)} · ${mail("Top3Hotels media kit")} · www.top3hotels.com</p></div>`;
  return page({
    L: "en",
    title: "Top3Hotels media kit",
    description: "Top3Hotels in numbers, product, principles and partnership formats.",
    path: "/partners/media-kit",
    body,
    noindex: true,
  });
}

async function contactPage() {
  const body = `${crumbsEn("Contact")}<h1>Contact us<em>.</em></h1><p class="lead">We usually reply within two working days.</p>
<div class="pillars"><div class="pillar"><b>Partners</b><span>Hotels, destinations, travel brands.<br>${mail("Partnership with Top3Hotels", "Write to partnerships")}</span></div><div class="pillar"><b>Corrections</b><span>Wrong photo, price or detail?<br>${mail("Correction request", "Send a correction")}</span></div><div class="pillar"><b>Press</b><span>Interviews, data and quotes.<br>${mail("Press enquiry", "Press enquiries")}</span></div></div>
<section aria-labelledby="cform"><h2 id="cform">Write to us</h2><form class="plan" style="max-width:720px;flex-direction:column;align-items:stretch" onsubmit="event.preventDefault();var f=this;location.href='mailto:${BRAND.email}?subject='+encodeURIComponent('['+f.topic.value+'] '+f.name.value)+'&body='+encodeURIComponent(f.msg.value+'\n\n'+f.name.value+' · '+f.email.value)"><label>Your name<input name="name" required autocomplete="name"></label><label>Your email<input name="email" type="email" required autocomplete="email"></label><label>Topic<select name="topic"><option>Hotel partnership</option><option>Correction</option><option>Press</option><option>Other</option></select></label><label>Message<textarea name="msg" rows="5" required style="font:inherit;border:1px solid var(--line);border-radius:12px;padding:10px;background:var(--paper);color:var(--ink)"></textarea></label><button class="btn" type="submit">Send message</button></form></section>
<div class="prose"><h2>Company</h2><p><strong>${esc(BRAND.entity)}</strong><br>30 N Gould St, Ste N<br>Sheridan, WY 82801<br>United States<br>${mail("Hello Top3Hotels")}</p><p class="muted">Top3Hotels is operated by ${esc(BRAND.entity)}, founded by ${esc(BRAND.founder)}. We reply within two working days.</p></div>`;
  return page({
    L: "en",
    title: "Contact — Top3Hotels",
    description: "Contact Top3Hotels for partnerships, corrections and press.",
    path: "/contact",
    body,
  });
}

function legalPage(kind: "privacy" | "cookies" | "terms" | "imprint") {
  const upd = fmtDate(SNAPSHOT_DATE, "en");
  const who = `${esc(BRAND.entity)}, ${esc(BRAND.place)} (“Top3Hotels”, “we”). Contact: ${mail("Data protection")}`;
  const C: Record<typeof kind, [string, string]> = {
    privacy: [
      "Privacy policy",
      `<p class="muted">Last updated ${upd}</p><h2>Who is responsible</h2><p>${who}.</p>
<h2>What we collect</h2><ul><li><b>No account, no sign-up.</b> You can use Top3Hotels without giving us any personal data.</li><li><b>Technical data.</b> Our hosting provider processes IP address, browser and requested pages to deliver and secure the site (server logs, kept for a short period).</li><li><b>Price alerts (optional).</b> If you ask for a price alert we store your email address, city, category and price limit with our email provider (Resend) only to send that alert. Unsubscribe at any time.</li><li><b>Saved hotels.</b> Hotels you save are stored only in your own browser (local storage), not on our servers.</li></ul>
<h2>Links to booking sites and affiliate partners</h2><p>When you click a booking link (for example Booking.com, Expedia or Agoda) you leave our site; that site's privacy policy applies. Our affiliate partner Travelpayouts may process technical data to attribute bookings to us.</p>
<h2>Maps, images and fonts</h2><p>Maps are loaded from OpenFreeMap (OpenStreetMap data). Hotel photos are served by Booking.com's image servers. City photos are served from our own domain. Fonts are self-hosted.</p>
<h2>Legal basis and your rights</h2><p>We process data on the basis of legitimate interest (running a secure website) or your consent (price alerts). Under the GDPR and similar laws you can ask for access, correction, deletion, restriction or portability, and object to processing: ${mail("Privacy request")}. You can also complain to your data protection authority.</p>
<h2>International transfers</h2><p>Our providers may process data outside your country, including in the United States, under appropriate safeguards such as standard contractual clauses.</p>`,
    ],
    cookies: [
      "Cookie policy",
      `<p class="muted">Last updated ${upd}</p><h2>Our own cookies</h2><p>Top3Hotels does not set its own tracking or advertising cookies. We use your browser's local storage only to remember hotels you save and your language choice.</p>
<h2>Third parties</h2><ul><li><b>Travelpayouts</b> (affiliate attribution) may use cookies or similar technology when you click an affiliate link.</li><li><b>Booking sites</b> such as Booking.com set their own cookies after you leave our site.</li><li><b>Analytics</b>: if we enable privacy-friendly analytics, we will list the provider here before doing so.</li></ul>
<h2>Your choices</h2><p>You can block or delete cookies and local storage in your browser settings. The site keeps working without them.</p>`,
    ],
    terms: [
      "Terms of use",
      `<p class="muted">Last updated ${upd}</p><h2>What Top3Hotels is</h2><p>Top3Hotels is an independent information service operated by ${who}. We are not a travel agency and do not sell or book hotel rooms.</p>
<h2>Prices and information</h2><p>Prices are reference rates for a stated stay and date of checking. They are not offers. Availability, prices, taxes and conditions are set by the booking site and the hotel and can change at any time. Always check the final details before you book.</p>
<h2>Bookings</h2><p>Any booking is a contract between you and the booking site or hotel, under their terms. We are not a party to it.</p>
<h2>Affiliate links</h2><p>Some links are affiliate links. We may earn a commission at no extra cost to you. This never affects our selection.</p>
<h2>Intellectual property</h2><p>Texts, selections, design and logo belong to ${esc(BRAND.entity)}. Hotel photos belong to their owners and Booking.com; city photos come from Wikimedia Commons under their licences, credited on each page. Selected hotels may use the Top 3 badge as provided.</p>
<h2>Liability</h2><p>We take care to keep information accurate, but we provide it “as is”. To the extent permitted by law we are not liable for decisions made on the basis of the information on this site.</p>
<h2>Law</h2><p>These terms are governed by the laws of the State of Wyoming, United States, without prejudice to mandatory consumer protection in your country of residence.</p>`,
    ],
    imprint: [
      "Imprint",
      `<h2>Operator</h2><p>${esc(BRAND.entity)}<br>${esc(BRAND.place)}</p><h2>Responsible for content</h2><p>${esc(BRAND.founder)}, Founder</p><h2>Contact</h2><p>${mail("Top3Hotels")}<br>Website: www.top3hotels.com</p><h2>Editorial independence</h2><p>Hotel selections follow our <a href="/how-we-choose">public methodology</a>. Rankings cannot be bought.</p>`,
    ],
  };
  const [title, html2] = C[kind];
  const path = `/${kind}`;
  return page({
    L: "en",
    title: `${title} — Top3Hotels`,
    description: `${title} of Top3Hotels (${BRAND.entity}).`,
    path,
    body: `${crumbsEn(title)}<h1>${esc(title)}<em>.</em></h1><div class="prose">${html2}</div>`,
  });
}

function orgLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Top3Hotels",
    url: SITE,
    logo: `${SITE}/icon-512.png`,
    email: BRAND.email,
    parentOrganization: { "@type": "Organization", name: BRAND.entity, address: BRAND.place },
    founder: { "@type": "Person", name: BRAND.founder },
  };
}

/* Official “Top 3 pick” badge for selected hotels: /badge/<city-slug>/<budget|value|lux>.svg */
async function badgeSvg(slug: string, cat: string) {
  const { bySlug } = await data();
  const c = bySlug.get(slug);
  if (!c || !["budget", "value", "lux"].includes(cat)) return null;
  const lab = { budget: "Budget", value: "Best Value", lux: "Luxury" }[cat as "budget"]!;
  const col = { budget: "#1f7a5a", value: "#d83b51", lux: "#9a6b00" }[cat as "budget"]!;
  const city = c.city.length > 18 ? c.city.slice(0, 17) + "…" : c.city;
  const e = (x: string) => x.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="60" viewBox="0 0 180 60" role="img" aria-label="Top 3 ${e(lab)} pick in ${e(c.city)} 2026, Top3Hotels"><rect x=".5" y=".5" width="179" height="59" rx="12" fill="#fff" stroke="#e6e1d8"/><rect x="0" y="0" width="6" height="60" rx="3" fill="${col}"/><g transform="translate(16 16)"><rect x="0" y="11" width="7" height="13" rx="2" fill="#1f7a5a"/><rect x="9.5" y="0" width="7" height="24" rx="2" fill="#d83b51"/><rect x="19" y="5.5" width="7" height="18.5" rx="2" fill="#c9971c"/></g><text x="54" y="22" font-family="Georgia,serif" font-size="10" letter-spacing="1.2" fill="#525d6b">TOP 3 PICK · 2026</text><text x="54" y="38" font-family="Georgia,serif" font-size="15" font-weight="600" fill="${col}">${e(lab)}</text><text x="54" y="51" font-family="Arial,sans-serif" font-size="10" fill="#10213a">${e(city)} · top3hotels.com</text></svg>`;
}

/* Nearby destinations for the visitor (Cloudflare geo), used by the homepage “Near you” chips. */
async function geo(request: Request) {
  const { index } = await data();
  const cf =
    (request as unknown as { cf?: { latitude?: string; longitude?: string; country?: string } })
      .cf ?? {};
  const country = cf.country ?? request.headers.get("cf-ipcountry") ?? "";
  const lat = Number(cf.latitude),
    lng = Number(cf.longitude);
  let near: IndexCity[];
  if (Number.isFinite(lat) && Number.isFinite(lng) && (lat || lng))
    near = [...index].sort((a, b) => km({ lat, lng }, a) - km({ lat, lng }, b)).slice(0, 6);
  else {
    const TOP = [
      "london",
      "manchester",
      "edinburgh",
      "madrid",
      "barcelona",
      "seville",
      "malaga",
      "valencia",
      "paris",
      "nice",
      "lyon",
      "rome",
      "milan",
      "venice",
      "florence",
      "naples",
      "berlin",
      "munich",
      "hamburg",
      "amsterdam",
      "copenhagen",
      "aarhus",
      "aalborg",
      "billund",
      "stockholm",
      "oslo",
      "helsinki",
      "new-york",
      "los-angeles",
      "chicago",
      "san-francisco",
      "miami",
      "las-vegas",
      "lisbon",
      "porto",
      "athens",
      "vienna",
      "prague",
      "budapest",
      "dublin",
      "brussels",
      "zurich",
      "istanbul",
      "dubai",
      "tokyo",
      "bangkok",
      "singapore",
      "sydney",
      "toronto",
      "mexico-city",
    ];
    const rank = (c: IndexCity) => (TOP.includes(c.slug) ? TOP.indexOf(c.slug) : 999);
    near = index
      .filter((c) => c.cc === country)
      .sort((a, b) => rank(a) - rank(b) || (b.pop ?? 0) - (a.pop ?? 0))
      .slice(0, 6);
  }
  return new Response(
    JSON.stringify({
      country,
      near: near.map((c) => ({ id: c.id, slug: c.slug, city: c.city, country: c.country })),
    }),
    { headers: { "content-type": "application/json", "cache-control": "private, max-age=3600" } },
  );
}

/* ───────────────────────── airports & landing ───────────────────────── */

type Airport = { name: string; iata: string; dest: [string, string][] };
async function airports() {
  return ((await import("../generated/airports.json")).default ?? {}) as unknown as Record<
    string,
    Airport
  >;
}

async function fromPage(key: string, L: Lang) {
  const ap = (await airports())[key];
  if (!ap) return null;
  const { byId } = await data();
  const t = T[L];
  const rows = (
    await Promise.all(
      ap.dest.map(async ([id, code]) => {
        const c = byId.get(id);
        const d = c ? await cityData(id) : null;
        return c && d ? { c, d, code } : null;
      }),
    )
  ).filter(
    (
      r,
    ): r is { c: IndexCity; d: NonNullable<Awaited<ReturnType<typeof cityData>>>; code: string } =>
      Boolean(r),
  );
  const tiles = await Promise.all(
    rows
      .slice(0, 12)
      .map(({ c, d, code }) => tileFor(c, d.hotels[1]!, L, ` · ✈ ${esc(ap.iata)}–${esc(code)}`)),
  );
  const path = `/from/${key}`;
  const others = Object.entries(await airports()).filter(([k]) => k !== key);
  const body = `<p class="crumbs"><a href="${P(L, "/")}">${esc(t.home)}</a> › ${esc(t.fromNav)} › ${esc(ap.name)}</p>
<h1>${esc(t.fromH1(ap.name))} <small style="font-size:.45em;color:var(--muted)">${esc(ap.iata)}</small><em>.</em></h1><p class="lead">${esc(t.fromLead(ap.name, rows.length))}</p>
<div class="tiles">${tiles.join("")}</div>
<section><div class="tablewrap"><table><thead><tr><th>${esc(t.allDest)}</th><th>${esc(t.cat.Budget)}</th><th>${esc(t.cat["Best Value"])}</th><th>${esc(t.cat.Luxury)}</th></tr></thead><tbody>
${rows
  .map(
    ({ c, d, code }) =>
      `<tr><td><a href="${P(L, "/" + c.slug)}"><strong>${esc(c.city)}</strong></a><br><small>${esc(countryName(c, L))} · ✈ ${esc(code)}</small></td>${d.hotels.map((h) => `<td>${esc(h.name)}<br><small>${h.booking?.score?.toFixed(1) ?? "–"}/10 · ${money(h.offer?.nightly)}</small></td>`).join("")}</tr>`,
  )
  .join("")}
</tbody></table></div></section>
<section><h2>${esc(t.fromNav)}</h2><ul class="grid">${others.map(([k, a]) => `<li><a href="${P(L, `/from/${k}`)}">${esc(t.fromH1(a.name))} <span>${esc(a.iata)}</span></a></li>`).join("")}</ul></section>`;
  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: t.fromH1(ap.name),
      itemListElement: rows.map(({ c }, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: t.h1(c.city),
        url: `${SITE}${P(L, "/" + c.slug)}`,
      })),
    },
  ];
  const img = rows.find((r) => r.d.extras?.hero?.img)?.d.extras?.hero?.img;
  return page({
    L,
    title: t.fromTitle(ap.name),
    description: t.fromLead(ap.name, rows.length),
    path,
    body,
    ld,
    langs: true,
    ...(img ? { image: img } : {}),
  });
}

const POPULAR = [
  "london",
  "paris",
  "rome",
  "barcelona",
  "amsterdam",
  "new-york",
  "lisbon",
  "copenhagen",
  "dubai",
  "tokyo",
  "malaga",
  "prague",
];
async function landingPage(L: Lang) {
  const { bySlug, byCountry } = await data();
  const t = T[L];
  const tiles = await Promise.all(
    POPULAR.map(async (s) => {
      const c = bySlug.get(s);
      const d = c ? await cityData(c.id) : null;
      return c && d ? tileFor(c, d.hotels[1]!, L) : "";
    }),
  );
  const aps = Object.entries(await airports());
  const body = `<h1 style="margin-top:28px">${esc(t.homeH1)}<em>.</em></h1><p class="lead">${esc(t.lead())}</p>
<form class="find" action="/" method="get" role="search"><label><span>${esc(t.search)}</span><input name="city" required autocomplete="off" placeholder="London, Paris, Billund…"></label><button class="btn" type="submit">${esc(t.seeDates)}</button></form>
<section><h2>${esc(t.popular)}</h2><div class="tiles">${tiles.join("")}</div></section>
<section><h2>${esc(t.fromNav)}</h2><ul class="grid">${aps.map(([k, a]) => `<li><a href="${P(L, `/from/${k}`)}">${esc(t.fromH1(a.name))} <span>${esc(a.iata)}</span></a></li>`).join("")}</ul></section>
<section><h2>${esc(t.lists)}</h2><ul class="grid">${THEMES.map((th) => `<li><a href="${P(L, `/lists/${th}`)}">${esc(t.themes[th]!.title)}</a></li>`).join("")}</ul><p class="note"><a href="${P(L, "/destinations")}">${esc(t.destH1(byCountry.size))} →</a></p></section>`;
  return page({
    L,
    title: `Top3Hotels — ${t.footer}`,
    description: t.lead(),
    path: "/",
    body,
    langs: true,
  });
}



type Guide = {
  title: string; intro: string; areasTitle: string; areas: [string, string, string][];
  airTitle: string; air: [string, string][]; whenTitle: string; when: string;
  aroundTitle: string; around: string; tipsTitle: string; tips: string[];
};
function guideBlock(city: IndexCity, L: Lang) {
  const g = (GUIDES as unknown as Record<string, Record<string, Guide | boolean>>)[city.slug];
  const d = g?.[L] as Guide | undefined;
  if (!d || typeof d !== "object") return "";
  return `<section aria-labelledby="guide"><h2 id="guide">${esc(d.title)}</h2><p class="lead" style="margin-bottom:18px">${esc(d.intro)}</p>
<div><h3 class="serif" style="font-size:21px;margin:0 0 10px">${esc(d.areasTitle)}</h3><div class="hoods">${d.areas.map(([n, s, t]) => `<div class="hood"><b>${esc(n)}</b><small>${esc(s)}</small><p>${esc(t)}</p></div>`).join("")}</div></div>
<div class="guide"><div class="box"><h3>✈ ${esc(d.airTitle)}</h3><dl>${d.air.map(([a, b]) => `<div><dt>${esc(a)}</dt><dd>${esc(b)}</dd></div>`).join("")}</dl></div>
<div class="box"><h3>☀ ${esc(d.whenTitle)}</h3><p>${esc(d.when)}</p><h3>🚇 ${esc(d.aroundTitle)}</h3><p>${esc(d.around)}</p></div>
<div class="box"><h3>💡 ${esc(d.tipsTitle)}</h3><ul>${d.tips.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div></div></section>`;
}
function filmingBlock(city: IndexCity, L: Lang) {
  const z = Z[L];
  const g = (GUIDES as unknown as Record<string, { filming?: boolean }>)[city.slug];
  if (!g?.filming) return "";
  return `<section><div class="collab"><div><h2>🎬 ${esc(z.filming(city.city))}</h2><p>${esc(z.filmingLead)}</p></div><a class="btn" href="mailto:${BRAND.email}?subject=${encodeURIComponent(`Top3Hotels ${city.city} filming — partnership`)}" data-t="collab_cta" data-city="${esc(city.slug)}">${esc(z.hotelsCta)} →</a></div></section>`;
}
function hotelsBlock(city: IndexCity, L: Lang) {
  const z = Z[L];
  return `<section><div class="forh"><div><h3>${esc(z.hotelsTitle(city.city))}</h3><p>${esc(z.hotelsLead)}</p></div><a class="btn ghost" href="/partners" data-t="collab_cta" data-city="${esc(city.slug)}">${esc(z.hotelsCta)} →</a></div></section>`;
}

function disclosurePage() {
  const body = `${crumbsEn("Affiliate disclosure")}<h1>Affiliate disclosure<em>.</em></h1><div class="prose">
<p>Top3Hotels is free to use. We earn money in three transparent ways:</p>
<ul><li><strong>Booking links.</strong> When you book through a link on our site (for example Booking.com, Hotels.com, Expedia, Agoda or Trip.com), we may receive a commission from that partner. You pay the same price.</li>
<li><strong>Labelled partner features.</strong> Hotels can pay or offer stays to be filmed and shown as a <em>Featured partner</em>. These features are always labelled and kept separate from our three picks.</li>
<li><strong>Badges and widgets.</strong> Hotels and blogs can embed our free badge or widget; this never affects the picks.</li></ul>
<h2>What never changes</h2><p>Our Budget, Best Value and Luxury picks are chosen by public rules: verified guest scores, number of reviews, location and reference price. No hotel can pay to become one of the three picks, and commissions have no influence on which hotel we choose. See <a href="/how-we-choose">how we choose</a>.</p>
<h2>Prices</h2><p>Prices shown are reference rates for 2 adults, 1 room, checked on the date shown on each page. They are not live quotes; always confirm the final price with the booking partner.</p>
<p class="muted">Operated by ${esc(BRAND.entity)} (${esc(BRAND.place)}). Questions: ${mail("Affiliate disclosure question")}.</p></div>`;
  return page({ L: "en", title: "Affiliate disclosure — Top3Hotels", description: "How Top3Hotels earns money: booking-partner commissions and labelled partner features. Our picks are never for sale.", path: "/affiliate-disclosure", body });
}

/* ───────────────────────── top-100 pass: extra pages ───────────────────────── */

function newsBlock(L: Lang) {
  const y = Y[L];
  return `<section aria-labelledby="newsh"><div class="news"><div><h2 id="newsh">${esc(y.newsTitle)}</h2><p>${esc(y.newsLead)}</p></div><form data-news><input type="email" required autocomplete="email" placeholder="${esc(y.emailPh)}" aria-label="${esc(y.emailPh)}"><button class="btn" type="submit">${esc(y.newsBtn)}</button><p class="msg" role="status" style="width:100%;margin:4px 0 0;font-size:13px"></p></form></div></section>`;
}

function savedPage(L: Lang) {
  const y = Y[L];
  return page({
    L,
    title: `${y.savedTitle} — Top3Hotels`,
    description: y.savedLead,
    path: "/saved",
    noindex: true,
    langs: true,
    body: `<p class="crumbs"><a href="${P(L, "/")}">${esc(T[L].home)}</a> › ${esc(y.js["saved"]!)}</p><h1>${esc(y.savedTitle)}<em>.</em></h1><p class="lead">${esc(y.savedLead)}</p><section style="margin-top:26px"><div class="saved" data-savedpage></div></section><section hidden data-recent><h2>${esc(y.js["recent"]!)}</h2><div class="chipsrow"></div></section>`,
  });
}

async function citiesJson() {
  const { index } = await data();
  const rows = index.map((c) => [c.slug, c.city, c.country, c.pop ?? 0]);
  return new Response(JSON.stringify(rows), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=86400",
    },
  });
}

async function randomCity() {
  const { index } = await data();
  const top = [...index].sort((a, b) => (b.pop ?? 0) - (a.pop ?? 0)).slice(0, 300);
  const c = top[Math.floor(Math.random() * top.length)]!;
  return new Response(null, {
    status: 302,
    headers: { location: `/${c.slug}`, "cache-control": "no-store" },
  });
}

let cheapCache: { c: IndexCity; b: Hotel; v: Hotel }[] | undefined;
async function cheapRows() {
  if (cheapCache) return cheapCache;
  const { index } = await data();
  const out: { c: IndexCity; b: Hotel; v: Hotel }[] = [];
  for (const c of index) {
    const d = await cityData(c.id);
    const b = d?.hotels?.[0];
    if (d && b?.offer?.nightly && (b.booking?.score ?? 0) >= 7.5 && (b.booking?.count ?? 0) >= 50)
      out.push({ c, b, v: d.hotels[1]! });
  }
  out.sort((a, b) => a.b.offer!.nightly! - b.b.offer!.nightly!);
  cheapCache = out;
  return out;
}
async function cheapPage(L: Lang) {
  const y = Y[L],
    t = T[L];
  const rows = (await cheapRows()).slice(0, 250);
  const body = `<p class="crumbs"><a href="${P(L, "/")}">${esc(t.home)}</a> › ${esc(y.cheapNav)}</p><h1>${esc(y.cheapTitle)}<em>.</em></h1><p class="lead">${esc(y.cheapLead(rows.length))}</p>
<div class="filters" role="group"><button type="button" data-max="0" aria-pressed="true">${esc(y.all)}</button>${[25, 35, 45].map((n) => `<button type="button" data-max="${n}" aria-pressed="false">${esc(y.under)} €${n}</button>`).join("")}</div>
<div class="tablewrap"><table class="rank"><thead><tr><th>#</th><th>${esc(t.allDest)}</th><th>${esc(t.cat.Budget)}</th><th>${esc(t.cat["Best Value"])}</th></tr></thead><tbody>
${rows.map(({ c, b, v }, i) => `<tr data-price="${b.offer!.nightly}"><td>${i + 1}</td><td><a href="${P(L, "/" + c.slug)}"><strong>${esc(c.city)}</strong></a><br><small>${esc(countryName(c, L))}</small></td><td>${esc(b.name)}<br><small>${b.booking?.score?.toFixed(1) ?? "–"}/10 · <b data-eur="${b.offer!.nightly}"><span class="v">${money(b.offer!.nightly)}</span></b> ${esc(t.perNight)}</small></td><td>${esc(v.name)}<br><small>${v.booking?.score?.toFixed(1) ?? "–"}/10 · <span data-eur="${v.offer?.nightly ?? ""}"><span class="v">${money(v.offer?.nightly)}</span></span></small></td></tr>`).join("")}
</tbody></table></div>${newsBlock(L)}`;
  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: y.cheapTitle,
      dateModified: SNAPSHOT_DATE,
      itemListElement: rows.slice(0, 50).map(({ c }, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: c.city,
        url: `${SITE}${P(L, "/" + c.slug)}`,
      })),
    },
  ];
  return page({ L, title: `${y.cheapTitle} (2026) — Top3Hotels`, description: y.cheapLead(rows.length), path: "/cheap-cities", body, ld, langs: true });
}

async function comparePage(a: string, b: string, L: Lang) {
  const { bySlug } = await data();
  const ca = bySlug.get(a),
    cb = bySlug.get(b);
  if (!ca || !cb || a === b) return null;
  const [da, db] = await Promise.all([cityData(ca.id), cityData(cb.id)]);
  if (!da || !db) return null;
  const y = Y[L],
    t = T[L];
  const col = (c: IndexCity, d: NonNullable<typeof da>) =>
    `<div><p class="eyebrow">${esc(countryName(c, L))}</p><h2><a href="${P(L, "/" + c.slug)}" style="color:inherit;text-decoration:none">${esc(c.city)}</a></h2>${d.hotels
      .map(
        (h) =>
          `<div class="row"><div><small>${esc(label(h, L))}</small><b>${esc(h.name)}</b><small>${esc(h.area ?? "")}</small></div><div class="pr"><b data-eur="${h.offer?.nightly ?? ""}"><span class="v">${money(h.offer?.nightly)}</span></b><small>${h.booking?.score?.toFixed(1) ?? "–"}/10 · ${fmtInt(h.booking?.count)}</small></div></div>`,
      )
      .join("")}<a class="btn ghost" style="width:100%;margin-top:10px" href="${P(L, "/" + c.slug)}">${esc(t.h1(c.city))} →</a></div>`;
  const body = `<p class="crumbs"><a href="${P(L, "/")}">${esc(t.home)}</a> › ${esc(y.jCompare)}</p><h1>${esc(y.vsTitle(ca.city, cb.city))}<em>.</em></h1><p class="lead">${esc(y.vsLead(ca.city, cb.city))}</p><section style="margin-top:26px"><div class="vs">${col(ca, da)}${col(cb, db)}</div></section>`;
  return page({ L, title: `${y.vsTitle(ca.city, cb.city)} — Top3Hotels`, description: y.vsLead(ca.city, cb.city), path: `/compare/${a}/${b}`, body, noindex: true, langs: true });
}

async function embedPage(slug: string) {
  const { bySlug } = await data();
  const c = bySlug.get(slug);
  const d = c ? await cityData(c.id) : null;
  if (!c || !d) return null;
  const t = T.en;
  const items = d.hotels
    .map((h) => {
      const img = h.gallery?.find((g) => g.src)?.src;
      return `<a class="h ${catKey(h)}" href="${SITE}/${c.slug}#${catKey(h)}" target="_blank" rel="noopener">${img ? `<img src="${esc(img)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ""}<span class="t">${esc(label(h, "en"))}</span><strong>${esc(h.name)}</strong><small>${h.booking?.score?.toFixed(1) ?? "–"}/10 · ${money(h.offer?.nightly)} ${esc(t.perNight)}</small></a>`;
    })
    .join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Top 3 hotels in ${esc(c.city)} · Top3Hotels</title><style>body{margin:0;font:14px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;color:#10213a;background:#faf8f4}.w{padding:14px}.hd{display:flex;justify-content:space-between;align-items:baseline;margin:0 0 10px}.hd b{font:600 18px Georgia,serif}.hd a{color:#d83b51;font-size:12px;text-decoration:none;font-weight:600}.g{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}.h{display:flex;flex-direction:column;gap:3px;background:#fff;border:1px solid #e6e1d8;border-top:4px solid var(--c);border-radius:14px;overflow:hidden;color:#10213a;text-decoration:none;padding-bottom:10px}.h img{width:100%;aspect-ratio:3/2;object-fit:cover;background:#f2eee7}.h .t,.h strong,.h small{padding:0 10px}.h .t{font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--c);margin-top:6px}.h strong{font:600 15px/1.25 Georgia,serif}.h small{color:#525d6b}.budget{--c:#1f7a5a}.value{--c:#d83b51}.lux{--c:#9a6b00}</style></head><body><div class="w"><div class="hd"><b>The 3 best hotels in ${esc(c.city)}</b><a href="${SITE}/${c.slug}" target="_blank" rel="noopener">top3hotels.com ↗</a></div><div class="g">${items}</div></div></body></html>`;
}

async function feedJson() {
  const { index } = await data();
  const top = [...index].sort((a, b) => (b.pop ?? 0) - (a.pop ?? 0)).slice(0, 100);
  const items = await Promise.all(
    top.map(async (c) => {
      const d = await cityData(c.id);
      return d
        ? {
            id: `${SITE}/${c.slug}`,
            url: `${SITE}/${c.slug}`,
            title: `The 3 best hotels in ${c.city}`,
            content_text: d.hotels
              .map((h) => `${label(h, "en")}: ${h.name} (${h.booking?.score ?? "–"}/10, ${money(h.offer?.nightly)} / night)`)
              .join(" · "),
            date_modified: `${SNAPSHOT_DATE}T00:00:00Z`,
            ...(d.extras?.hero?.img ? { image: d.extras.hero.img } : {}),
          }
        : null;
    }),
  );
  return new Response(
    JSON.stringify({ version: "https://jsonfeed.org/version/1.1", title: "Top3Hotels", home_page_url: SITE, feed_url: `${SITE}/feed.json`, items: items.filter(Boolean) }),
    { headers: { "content-type": "application/feed+json; charset=utf-8", "cache-control": "public, max-age=3600" } },
  );
}

/* ───────────────────────── sitemaps ───────────────────────── */

async function sitemapFor(L: Lang) {
  const { index, byCountry } = await data();
  const paths = [
    "/",
    "/destinations",
    "/lists",
    "/cheap-cities",
    ...Object.keys(await airports()).map((k) => `/from/${k}`),
    ...THEMES.map((t) => `/lists/${t}`),
    ...EVENTS.map((e) => `/lists/${e.slug}`),
    ...[...byCountry.keys()].map((c) => `/country/${c}`),
    ...index.map((c) => `/${c.slug}`),
  ];
  const extra =
    L === "en"
      ? [
          "/about",
          "/how-we-choose",
          "/partners",
          "/contact",
          "/privacy",
          "/cookies",
          "/terms",
          "/imprint",
          "/affiliate-disclosure",
        ]
          .map((p) => `<url><loc>${SITE}${p}</loc><lastmod>${SNAPSHOT_DATE}</lastmod></url>`)
          .join("\n") + "\n"
      : "";
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${paths
    .map(
      (p) =>
        `<url><loc>${SITE}${P(L, p)}</loc><lastmod>${SNAPSHOT_DATE}</lastmod>${LANGS.map((l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${SITE}${P(l, p)}"/>`).join("")}</url>`,
    )
    .join("\n")}\n${extra}</urlset>\n`;
}
const sitemapIndex = () =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${LANGS.map((l) => `<sitemap><loc>${SITE}/sitemap-${l}.xml</loc><lastmod>${SNAPSHOT_DATE}</lastmod></sitemap>`).join("\n")}\n</sitemapindex>\n`;
const ROBOTS = `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${SITE}/sitemap.xml\n`;

/* ───────────────────────── alerts ───────────────────────── */

type Env = Record<string, unknown> | undefined;
function envVar(env: Env, k: string): string | undefined {
  const v =
    (env && (env[k] as string)) ||
    (globalThis as { process?: { env?: Record<string, string> } }).process?.env?.[k];
  return typeof v === "string" && v ? v : undefined;
}
async function alerts(request: Request, env: Env): Promise<Response> {
  const key = envVar(env, "RESEND_API_KEY");
  const audience = envVar(env, "RESEND_AUDIENCE_ID");
  const res = (o: unknown, s = 200) =>
    new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json" } });
  if (request.method === "GET") return res({ enabled: Boolean(key && audience) });
  if (!key || !audience) return res({ error: "alerts_not_configured" }, 503);
  let body: { email?: string; city?: string; category?: string; max?: number };
  try {
    body = await request.json();
  } catch {
    return res({ error: "bad_json" }, 400);
  }
  const email = String(body.email ?? "")
    .trim()
    .toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 200)
    return res({ error: "bad_email" }, 400);
  const city = String(body.city ?? "").slice(0, 80);
  const category = String(body.category ?? "").slice(0, 20);
  const max = Math.max(1, Math.min(100000, Math.round(Number(body.max) || 0)));
  const r = await fetch(`https://api.resend.com/audiences/${audience}/contacts`, {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ email, unsubscribed: false, first_name: `${city}|${category}|${max}` }),
  });
  return r.ok ? res({ ok: true }) : res({ error: "provider_error" }, 502);
}

/* ───────────────────────── router ───────────────────────── */

export async function handleSeo(request: Request, env?: Env): Promise<Response | null> {
  const url = new URL(request.url);
  let p = url.pathname;
  if (p === "/api/alerts") return alerts(request, env);
  if (request.method !== "GET" && request.method !== "HEAD") return null;

  if (p === "/sitemap.xml")
    return new Response(sitemapIndex(), {
      headers: {
        "content-type": "application/xml; charset=utf-8",
        "cache-control": "public, max-age=3600",
      },
    });
  const sm = p.match(/^\/sitemap-([a-z]{2})\.xml$/);
  if (sm && isLang(sm[1]!))
    return new Response(await sitemapFor(sm[1]), {
      headers: {
        "content-type": "application/xml; charset=utf-8",
        "cache-control": "public, max-age=3600",
      },
    });
  if (p === "/robots.txt")
    return new Response(ROBOTS, {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "public, max-age=3600",
      },
    });

  // City photos are proxied so the page sets no third-party (Wikimedia) cookies and gets long cache lifetimes.
  const im = p.match(/^\/api\/(?:thumb\/([^/]+)|img\/([^/]+)\/(big|mid|small|thumb|orig))$/);
  if (im) {
    const { cx } = await data();
    const id = decodeURIComponent((im[1] ?? im[2])!);
    const size = im[1] ? "thumb" : im[3]!;
    const h = cx[id]?.hero;
    const src = h
      ? size === "thumb"
        ? h.thumb
        : size === "orig"
          ? (h.orig ?? h.img)
          : size === "mid" || size === "small"
            ? h.img.replace("/1280px-", size === "mid" ? "/960px-" : "/500px-")
            : h.img
      : undefined;
    const up = src
      ? await fetch(src, {
          headers: { "user-agent": "Top3HotelsBot/1.1 (https://www.top3hotels.com)" },
          cf: { cacheEverything: true, cacheTtl: 2592000 },
        } as RequestInit).catch(() => null)
      : null;
    if (up && up.ok && (up.headers.get("content-type") ?? "").startsWith("image/"))
      return new Response(up.body, {
        headers: {
          "content-type": up.headers.get("content-type")!,
          "cache-control": "public, max-age=2592000, immutable",
        },
      });
    if (size === "thumb")
      return new Response(
        '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="30"><rect width="40" height="30" rx="6" fill="#dfe8f2"/><path d="M8 24l8-9 6 6 4-4 6 7z" fill="#9fb3c8"/></svg>',
        { headers: { "content-type": "image/svg+xml", "cache-control": "public, max-age=86400" } },
      );
    return new Response(null, {
      status: 404,
      headers: { "cache-control": "public, max-age=3600" },
    });
  }
  if (p === "/api/geo") return geo(request);
  if (p === "/api/cities.json") return citiesJson();
  if (p === "/api/rates") {
    const FALLBACK = { GBP: 0.86, USD: 1.08, DKK: 7.46, SEK: 11.4, NOK: 11.6, CHF: 0.94 };
    let rates: Record<string, number> = FALLBACK;
    try {
      const r = await fetch("https://api.frankfurter.dev/v1/latest?base=EUR&symbols=GBP,USD,DKK,SEK,NOK,CHF", {
        cf: { cacheEverything: true, cacheTtl: 43200 },
      } as RequestInit);
      if (r.ok) rates = ((await r.json()) as { rates?: Record<string, number> }).rates ?? FALLBACK;
    } catch {
      /* keep fallback */
    }
    return new Response(JSON.stringify({ rates }), {
      headers: { "content-type": "application/json", "cache-control": "public, max-age=43200" },
    });
  }
  if (p === "/random") return randomCity();
  if (p === "/feed.json") return feedJson();
  const em = p.match(/^\/embed\/([a-z0-9-]+)\/?$/);
  if (em) {
    const out = await embedPage(em[1]!);
    return out
      ? new Response(out, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=3600, s-maxage=86400" } })
      : new Response("not found", { status: 404 });
  }
  const bd = p.match(/^\/badge\/([a-z0-9-]+)\/(budget|value|lux)\.svg$/);
  if (bd) {
    const svg = await badgeSvg(bd[1]!, bd[2]!);
    return svg
      ? new Response(svg, {
          headers: {
            "content-type": "image/svg+xml; charset=utf-8",
            "cache-control": "public, max-age=86400",
            "access-control-allow-origin": "*",
          },
        })
      : new Response("not found", { status: 404 });
  }
  if (p.startsWith("/api/catalogue/")) {
    const id = decodeURIComponent(p.slice("/api/catalogue/".length));
    const d = await cityData(id);
    if (!d)
      return new Response('{"error":"not_found"}', {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    return new Response(JSON.stringify(d), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, max-age=3600, s-maxage=86400",
      },
    });
  }

  // Language prefix
  let L: Lang = "en";
  const lm = p.match(/^\/(es|de|fr|it|pt|da)(\/.*)?$/);
  if (lm) {
    L = lm[1] as Lang;
    p = lm[2] || "/";
    if (p === "/") return html(await landingPage(L));
  }

  const EN_PAGES: Record<string, () => Promise<string> | string> = {
    "/about": aboutPage,
    "/how-we-choose": methodPage,
    "/partners": partnersPage,
    "/partners/media-kit": mediaKitPage,
    "/contact": contactPage,
    "/privacy": () => legalPage("privacy"),
    "/cookies": () => legalPage("cookies"),
    "/terms": () => legalPage("terms"),
    "/imprint": () => legalPage("imprint"),
    "/affiliate-disclosure": disclosurePage,
  };
  const enp = EN_PAGES[p.replace(/\/$/, "") || "/"];
  if (enp) {
    if (L !== "en" || (p.endsWith("/") && p !== "/"))
      return Response.redirect(SITE + p.replace(/\/$/, ""), 301);
    return html(await enp());
  }
  if (p === "/destinations" || p === "/destinations/") {
    if (p.endsWith("/")) return Response.redirect(SITE + P(L, "/destinations"), 301);
    return html(await destinationsPage(L));
  }
  if (p === "/lists" || p === "/lists/") return html(await listsIndex(L));
  if (p === "/saved") return html(savedPage(L), 200, "public, max-age=3600");
  if (p === "/cheap-cities") return html(await cheapPage(L));
  const vs = p.match(/^\/compare\/([a-z0-9-]+)\/([a-z0-9-]+)\/?$/);
  if (vs) {
    const out = await comparePage(vs[1]!, vs[2]!, L);
    return out ? html(out) : html(notFoundPage(p, L), 404, "no-store");
  }
  const fr = p.match(/^\/from\/([a-z]+)\/?$/);
  if (fr) {
    const out = await fromPage(fr[1]!, L);
    return out ? html(out) : html(notFoundPage(p, L), 404, "no-store");
  }
  const lst = p.match(/^\/lists\/([a-z0-9-]+)\/?$/);
  if (lst) {
    const k = lst[1]!;
    if ((THEMES as readonly string[]).includes(k)) return html(await themePage(k as Theme, L));
    const ev = await eventPage(k, L);
    return ev ? html(ev) : html(notFoundPage(p, L), 404, "no-store");
  }
  const country = p.match(/^\/country\/([a-z0-9-]+)\/?$/);
  if (country) {
    const out = await countryPage(country[1]!, L);
    return out ? html(out) : html(notFoundPage(p, L), 404, "no-store");
  }

  const m = p.match(/^\/([^/.]+)\/?$/);
  if (!m) return null;
  const raw = decodeURIComponent(m[1]!);
  const slug = raw.toLowerCase();
  const { bySlug, byId } = await data();
  const city = bySlug.get(slug);
  if (city && (raw !== slug || p.endsWith("/")))
    return Response.redirect(`${SITE}${P(L, "/" + slug)}${url.search}`, 301);
  if (!city) {
    const legacy = byId.get(slug) ?? (await data()).index.find((c) => c.alias === slug);
    if (legacy) return Response.redirect(`${SITE}${P(L, "/" + legacy.slug)}${url.search}`, 301);
    return html(notFoundPage(p, L), 404, "no-store");
  }
  const out = await cityPage(city, L);
  return out ? html(out) : html(notFoundPage(p, L), 404, "no-store");
}
