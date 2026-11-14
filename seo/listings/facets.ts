// Which listing pages exist (14-nov-2026). Pure functions over the homes snapshot, shared by the prerender
// (seo/listings/build.ts), the URL memory (seo/listings/record.ts) and the tests.
//
// A listing page is a set of homes with an address: a country, a budget, a region, a kind of home. The rules:
//  - MIN homes for the families that existed before this file (country, budget, region, setting, /cheap-houses),
//    MIN_NEW for the combinations added here (bedrooms, apartments/houses, towns, budget inside a region, pool).
//  - No near-copies: inside a country, a page whose homes overlap 90% or more (Jaccard) with a page already kept
//    is not generated; its address redirects to the page that won. Pages are tried in order of search demand:
//    country, budgets, regions, settings, type, bedrooms, features, towns, budget in region.
//  - One exception: the tightest budget that holds (nearly) every home of a country is kept next to the country
//    page, unless a smaller budget already holds three quarters of them ("everything we list in Bulgaria is under €80,000" is the answer to a budget search).
//  - Only homes in the snapshot count, and the snapshot only holds homes that are for sale. A page that falls
//    under its minimum is not generated and its address goes into the redirects.
//
// 15-nov-2026, new families through the same rules (3 homes, no near-copies, an address for every page that goes):
//  - traits read from the data or stated in the listing text (seo/listings/traits.ts): move-in ready, sea view,
//    within 500 m of the sea, land, fireplace, garage, island, mountains, airport, price per m², score 90+,
//    hand-picked, new this month, price cuts, single-storey, period features, good weather, quiet, low community
//    fee, cave houses, unusual buildings... at /cheap-houses/<trait>-in-<country> and /cheap-houses/<trait>;
//  - ranked lists (the 20 cheapest, the 20 with most space for the money), same addresses;
//  - a trait with a budget, for the pairs in COMBOS and only the COMBO_MAX with most homes;
//  - budgets in pounds and dollars at the ECB rate of the day (/cheap-houses/under-50000-pounds-in-<country>);
//  - named areas (/homes/spain/costa-blanca, /homes/japan/kansai) and homes within 100 km of a big city
//    (/cheap-houses/near-barcelona), from seo/listings/places.ts;
//  - regions get one name per region (places.ts), so "Alicante (about 25 min from Elche)" counts for Alicante.
// A family with no page today (fewer than 3 homes) needs nothing else: the page is generated the day the homes are there.
import { slugify } from "../../src/community/regions";
import { regionIndex, regionName, AREAS, inArea, CITIES, NEAR_KM, kmTo } from "./places";
import { TRAITS, COMBOS, COMBO_MAX, CCY_BANDS, RANK_N, bedsOf, ptypeOf, dayOfHome } from "./traits";
import { loadFx, type Fx } from "./fx";
export { ptypeOf, bedsOf };

export const MIN = 3;
export const MIN_NEW = 5;
export const PRIMARY_BANDS = [30000, 50000, 80000, 100000, 150000, 200000, 300000];
export const MINOR_BANDS = [10000, 15000, 20000, 40000, 60000]; // older addresses: kept only when they list something the others do not
export const GLOBAL_BANDS = [20000, 30000, 50000, 75000, 100000]; // 20000 (15-nov-2026): "casas por 20.000 euros", "maison 20 000 euros", the round figure people type
export const DUP = 0.9;

export type Home = Record<string, any>;
export type Kind = "country" | "band" | "region" | "setting" | "ptype" | "beds" | "feature" | "town" | "regionBand" | "gband" | "gfeature"
  | "combo" | "ccyBand" | "area" | "near";
export type Facet = {
  path: string; kind: Kind; homes: Home[]; parent: string; thin?: boolean;
  cc?: string; country?: string; cap?: number; region?: string; regionSlug?: string; town?: string; key?: string; beds?: number;
  /** ccyBand: `cap` is in this currency; capEur is the same budget in euros at `rate` (units of ccy per euro). */
  ccy?: "GBP" | "USD"; capEur?: number; rate?: number;
  /** area: slug in places.AREAS; near: slug in places.CITIES. */
  area?: string; city?: string;
  /** ranked list: `homes` is in the order of the ranking, not by score. */
  ranked?: boolean;
};
/** The budget of a page in euros, whatever currency its address names (0 when it has none). */
export const eurCap = (f: Pick<Facet, "kind" | "cap" | "capEur">) => (f.kind === "ccyBand" ? Math.floor(f.capEur || 0) : f.cap || 0);

export const countrySlug = (c: string) => String(c || "").toLowerCase().trim().replace(/\s+/g, "-");
// Imports tagged with a region instead of a country: home pages only.
const NOT_COUNTRY = new Set(["scandinavia"]);

// ---------------------------------------------------------------- what a home is (always from the English texts)
const text = (r: Home) => `${r.title || ""} ${r.why_great || ""} ${r.location_name || ""}`;
const amen = (r: Home, a: string) => Array.isArray(r.amen) && r.amen.includes(a);
/** By the sea: the measured distance to the shore when we have it (5 km or less), else the category a person gave it. */
export const bySea = (r: Home) => (typeof r.nearby?.sea_km === "number" ? r.nearby.sea_km <= 5 : r.category === "beach");
export const townOf = (r: Home) => String(r.location_name || "").split(",")[0].replace(/\([^)]*\)/g, "").trim();

/** Settings live under /homes/<country>/<key>; features under /cheap-houses/<key>-in-<country>. Both also have a
 * page for all countries at /cheap-houses/<key> (except in-town). */
export const SETTINGS: [string, (r: Home) => boolean][] = [
  ["by-the-sea", bySea],
  ["village-houses", (r) => r.category === "village"],
  ["in-town", (r) => r.category === "city"],
];
export const FEATURES: [string, (r: Home) => boolean, number][] = [
  ["near-a-lake", (r) => (typeof r.nearby?.lake?.km === "number" && r.nearby.lake.km <= 3) || /\blake\b|lakeside|lakefront/i.test(`${r.title || ""} ${r.location_name || ""}`), MIN],
  ["with-garden", (r) => amen(r, "garden") || /\bgarden\b|\borchard\b/i.test(String(r.title || "")), MIN],
  ["with-pool", (r) => amen(r, "pool"), MIN_NEW],
  ["with-sauna", (r) => amen(r, "sauna") || /\bsauna\b/i.test(text(r)), MIN],
  ["stone-houses", (r) => /\bstone\b/i.test(text(r)), MIN],
  ["cabins-and-cottages", (r) => /\b(cabin|cottage|stuga|log house|chalet)s?\b/i.test(text(r)), MIN],
  ["with-a-terrace", (r) => amen(r, "terrace") || /\b(terrace|balcony|patio|veranda)\b/i.test(String(r.title || "")), MIN],
];
const RESERVED = new Set(["apartments", "houses", ...SETTINGS.map(([k]) => k), ...FEATURES.map(([k]) => k), ...AREAS.map((a) => a.slug)]);
/** Which homes a key of a combination names: a setting, a feature, a trait or a kind of home. */
function testOf(key: string, today: string): ((r: Home) => boolean) | null {
  if (key === "apartments" || key === "houses") return (r) => ptypeOf(r) === (key === "apartments" ? "apartment" : "house");
  const s = SETTINGS.find(([k]) => k === key) || FEATURES.find(([k]) => k === key); if (s) return s[1];
  const t = TRAITS.find((x) => x.key === key && !x.rank); return t ? (r) => t.test(r, { today }) : null;
}
const reserved = (slug: string) => RESERVED.has(slug) || /^under-\d+$/.test(slug) || /^\d-bedroom$/.test(slug);

export const jaccard = (a: Set<string>, b: Set<string>) => {
  let inter = 0; for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union ? inter / union : 0;
};
const byScore = (a: Home, b: Home) => (b.nota ?? 0) - (a.nota ?? 0) || (a.rank ?? 1e9) - (b.rank ?? 1e9) || String(a.slug).localeCompare(String(b.slug));

export type Plan = { pages: Facet[]; redirects: Record<string, string> };
export type Opts = { fx?: Fx; today?: string };

/** Every listing page for these homes and where the addresses that are not generated should go. */
export function buildFacets(all: Home[], opts: Opts = {}): Plan {
  const rows = all.filter((r) => r?.slug && r.price_eur > 0).slice().sort(byScore);
  const pages: Facet[] = [];
  const redirects: Record<string, string> = {};
  regionIndex(rows);
  const fx = opts.fx || loadFx();
  const today = opts.today || rows.map(dayOfHome).filter(Boolean).sort().pop() || new Date().toISOString().slice(0, 10);
  const scopes: { kept: { f: Facet; set: Set<string> }[] }[] = [];

  // One scope = pages that must not copy each other (a country, or the pages for all countries).
  const scope = () => {
    const kept: { f: Facet; set: Set<string> }[] = [];
    scopes.push({ kept });
    return {
      kept,
      /** Adds the page unless it is too small or a near-copy; returns the page that stands at this address. */
      add(f: Facet, min: number, allowCopyOf?: string, cross = false): Facet | null {
        // too small: budgets always had an address (the old build wrote one per country and price), the rest are
        // covered by the URL memory (seo/listings/known-urls.json) when they existed before
        if (f.homes.length < min) { if (f.kind === "band") redirects[f.path] = f.parent; return null; }
        const set = new Set(f.homes.map((h) => String(h.slug)));
        let twin: Facet | null = null, best = 0;
        // `cross`: the page must not copy a page of any scope (a page for all countries against one of a country)
        for (const k of cross ? scopes.flatMap((sc) => sc.kept) : kept) { if (k.f.path === allowCopyOf) continue; const j = jaccard(set, k.set); if (j >= DUP && j > best) { best = j; twin = k.f; } }
        if (twin) { redirects[f.path] = twin.path; return twin; }
        kept.push({ f, set }); pages.push(f);
        return f;
      },
      /** The same for a page that crosses countries: it must not copy a page of any country either. */
      addCross(f: Facet, min: number): Facet | null { return this.add(f, min, undefined, true); },
    };
  };
  const ranked = (list: Home[], order: (a: Home, b: Home) => number) => list.slice().sort(order).slice(0, RANK_N);
  const combos: { S: ReturnType<typeof scope>; f: Facet; order: number }[] = [];

  const byCountry = new Map<string, Home[]>();
  for (const r of rows) { const cc = countrySlug(r.country); if (cc) (byCountry.get(cc) || byCountry.set(cc, []).get(cc)!).push(r); }

  for (const [cc, homes] of byCountry) {
    const country = String(homes[0].country);
    const hub = `/homes/${cc}`;
    if (homes.length < MIN || NOT_COUNTRY.has(cc)) {
      // one or two homes: the page keeps the links from those homes working, but it is not for search engines
      pages.push({ path: hub, kind: "country", cc, country, homes, parent: "/cheap-houses", thin: true });
      for (const p of [...PRIMARY_BANDS, ...MINOR_BANDS]) redirects[`${hub}/under-${p}`] = hub;
      continue;
    }
    const S = scope();
    S.add({ path: hub, kind: "country", cc, country, homes, parent: "/cheap-houses" }, MIN);

    // budgets: the round numbers people search first, then the older in-between ones
    // The exception applies once, and only while no budget already kept holds three quarters of the country.
    let covered = 0;
    for (const p of [...PRIMARY_BANDS, ...MINOR_BANDS]) {
      const list = homes.filter((h) => h.price_eur <= p);
      const f: Facet = { path: `${hub}/under-${p}`, kind: "band", cc, country, cap: p, homes: list, parent: hub };
      const share = list.length / homes.length;
      if (S.add(f, MIN, share >= DUP && covered < 0.75 ? hub : undefined) === f) covered = Math.max(covered, share);
    }

    for (const [key, test] of SETTINGS) S.add({ path: `${hub}/${key}`, kind: "setting", cc, country, key, homes: homes.filter(test), parent: hub }, MIN);
    // regions
    const regs = new Map<string, { name: string; homes: Home[] }>();
    for (const h of homes) { const name = regionName(h); const s = slugify(name); if (!s || reserved(s)) continue; (regs.get(s) || regs.set(s, { name, homes: [] }).get(s)!).homes.push(h); }
    const regList = [...regs.entries()].sort((a, b) => b[1].homes.length - a[1].homes.length || a[0].localeCompare(b[0]));
    const regionPages = new Map<string, Facet>();
    for (const [s, g] of regList) {
      const f: Facet = { path: `${hub}/${s}`, kind: "region", cc, country, region: g.name, regionSlug: s, homes: g.homes, parent: hub };
      if (S.add(f, MIN) === f) regionPages.set(s, f);
    }

    for (const [key, t] of [["apartments", "apartment"], ["houses", "house"]] as const)
      S.add({ path: `${hub}/${key}`, kind: "ptype", cc, country, key, homes: homes.filter((h) => ptypeOf(h) === t), parent: hub }, MIN_NEW);
    for (const b of [1, 2, 3, 4])
      S.add({ path: `${hub}/${b}-bedroom`, kind: "beds", cc, country, beds: b, homes: homes.filter((h) => (b === 4 ? bedsOf(h) >= 4 : bedsOf(h) === b)), parent: hub }, MIN_NEW);
    for (const [key, test, min] of FEATURES)
      S.add({ path: `/cheap-houses/${key}-in-${cc}`, kind: "feature", cc, country, key, homes: homes.filter(test), parent: hub }, min);

    // towns and budgets inside the regions that have a page
    for (const [s, rf] of regionPages) {
      const towns = new Map<string, { name: string; homes: Home[] }>();
      for (const h of rf.homes) { const name = townOf(h); const ts = slugify(name); if (!ts || ts === s || reserved(ts)) continue; (towns.get(ts) || towns.set(ts, { name, homes: [] }).get(ts)!).homes.push(h); }
      for (const [ts, g] of [...towns.entries()].sort((a, b) => b[1].homes.length - a[1].homes.length || a[0].localeCompare(b[0])))
        S.add({ path: `${rf.path}/${ts}`, kind: "town", cc, country, region: rf.region, regionSlug: s, town: g.name, homes: g.homes, parent: rf.path }, MIN_NEW);
      if (rf.homes.length >= MIN_NEW * 2) for (const p of PRIMARY_BANDS)
        S.add({ path: `${rf.path}/under-${p}`, kind: "regionBand", cc, country, region: rf.region, regionSlug: s, cap: p, homes: rf.homes.filter((h) => h.price_eur <= p), parent: rf.path }, MIN_NEW);
    }

    // ---- 15-nov-2026: traits, ranked lists, named areas, budgets in pounds and dollars, trait + budget
    for (const a of AREAS) if (a.cc === cc) {
      const path = `${hub}/${a.slug}`;
      if (pages.some((p) => p.path === path)) continue; // a region already has this name
      const af: Facet = { path, kind: "area", cc, country, area: a.slug, homes: homes.filter((h) => inArea(a, h, bySea)), parent: hub };
      // budgets inside an area with enough homes, like the budgets inside a region
      if (S.add(af, MIN) === af && af.homes.length >= MIN_NEW * 2) for (const p of PRIMARY_BANDS)
        S.add({ path: `${path}/under-${p}`, kind: "regionBand", cc, country, area: a.slug, cap: p, homes: af.homes.filter((h) => h.price_eur <= p), parent: path }, MIN_NEW);
    }
    for (const t of TRAITS) {
      const list = homes.filter((h) => t.test(h, { today }));
      S.add({ path: `/cheap-houses/${t.key}-in-${cc}`, kind: "feature", cc, country, key: t.key, homes: t.rank ? ranked(list, t.rank) : list, parent: hub, ...(t.rank ? { ranked: true } : {}) }, t.min ?? MIN);
    }
    for (const [ccy, word, caps] of CCY_BANDS) { const rate = fx.rates[ccy]; if (!(rate > 0)) continue;
      for (const cap of caps) { const capEur = cap / rate;
        S.add({ path: `/cheap-houses/under-${cap}-${word}-in-${cc}`, kind: "ccyBand", cc, country, cap, ccy, capEur, rate, homes: homes.filter((h) => h.price_eur <= capEur), parent: hub }, MIN_NEW);
      }
    }
    COMBOS.forEach(([key, cap, global], order) => {
      if (global && COMBOS.findIndex(([k, c]) => k === key && c === cap) !== order) return; // the pair is listed twice: once is enough
      const test = testOf(key, today); if (!test) return;
      const list = homes.filter((h) => h.price_eur <= cap && test(h));
      if (list.length >= MIN) combos.push({ S, order, f: { path: `/cheap-houses/${key}-under-${cap}-in-${cc}`, kind: "combo", cc, country, key, cap, homes: list, parent: hub } });
    });

    // Older /cheap-houses addresses that named the same search as a /homes page: they follow that page.
    const where = (p: string): string => (pages.some((f) => f.path === p) ? p : redirects[p] ? where(redirects[p]) : hub);
    for (const p of [30000, 50000, 75000]) redirects[`/cheap-houses/under-${p}-in-${cc}`] = where(`${hub}/under-${p === 75000 ? 80000 : p}`);
    redirects[`/cheap-houses/by-the-sea-in-${cc}`] = where(`${hub}/by-the-sea`);
    redirects[`/cheap-houses/village-houses-in-${cc}`] = where(`${hub}/village-houses`);
  }

  // Pages for all countries
  const G = scope();
  for (const p of GLOBAL_BANDS) G.add({ path: `/cheap-houses/under-${p}`, kind: "gband", cap: p, homes: rows.filter((h) => h.price_eur <= p), parent: "/cheap-houses" }, MIN);
  for (const [key, test] of [...SETTINGS.filter(([k]) => k !== "in-town"), ...FEATURES.map(([k, t]) => [k, t] as [string, (r: Home) => boolean])])
    G.add({ path: `/cheap-houses/${key}`, kind: "gfeature", key, homes: rows.filter(test), parent: "/cheap-houses" }, MIN);
  for (const t of TRAITS) if (t.global !== false) {
    const list = rows.filter((h) => t.test(h, { today }));
    G.addCross({ path: `/cheap-houses/${t.key}`, kind: "gfeature", key: t.key, homes: t.rank ? ranked(list, t.rank) : list, parent: "/cheap-houses", ...(t.rank ? { ranked: true } : {}) }, t.min ?? MIN);
  }
  for (const [ccy, word, caps] of CCY_BANDS) { const rate = fx.rates[ccy]; if (!(rate > 0)) continue;
    for (const cap of caps) { const capEur = cap / rate;
      G.add({ path: `/cheap-houses/under-${cap}-${word}`, kind: "ccyBand", cap, ccy, capEur, rate, homes: rows.filter((h) => h.price_eur <= capEur), parent: "/cheap-houses" }, MIN_NEW);
    }
  }
  for (const [slug, , , lat, lng] of CITIES)
    G.addCross({ path: `/cheap-houses/near-${slug}`, kind: "near", city: slug, homes: rows.filter((h) => { const d = kmTo(h, lat, lng); return d != null && d <= NEAR_KM; }), parent: "/cheap-houses" }, MIN_NEW);
  // Trait + budget: the COMBO_MAX with most homes, in the order of COMBOS when two have the same number.
  COMBOS.forEach(([key, cap, global], order) => {
    const test = global ? testOf(key, today) : null; if (!test) return;
    const list = rows.filter((h) => h.price_eur <= cap && test(h));
    if (list.length >= MIN) combos.push({ S: G, order, f: { path: `/cheap-houses/${key}-under-${cap}`, kind: "combo", key, cap, homes: list, parent: "/cheap-houses" } });
  });
  let kept = 0;
  for (const c of combos.sort((a, b) => b.f.homes.length - a.f.homes.length || Number(!a.f.cc) - Number(!b.f.cc) || a.order - b.order || a.f.path.localeCompare(b.f.path))) {
    if (kept >= COMBO_MAX) break;
    if (c.S.add(c.f, MIN, undefined, true) === c.f) kept++;
  }

  // A redirect never points at another redirect or at itself.
  const live = new Set(pages.map((f) => f.path));
  const end = (p: string, n = 0): string => (live.has(p) || p === "/cheap-houses" || n > 8 || !redirects[p] ? p : end(redirects[p], n + 1));
  for (const k of Object.keys(redirects)) { if (live.has(k)) { delete redirects[k]; continue; } redirects[k] = end(redirects[k]); if (redirects[k] === k) delete redirects[k]; }
  return { pages, redirects };
}

/** Where an address that is no longer generated should go: the closest page above it that exists. */
export function nearestLive(path: string, live: Set<string>, redirects: Record<string, string> = {}): string {
  if (redirects[path] && live.has(redirects[path])) return redirects[path];
  const m = /^\/cheap-houses\/.+-in-([a-z-]+)$/.exec(path);
  if (m) {
    // "stone-houses-under-50000-in-italy": first the same trait without the budget
    const c = /^\/cheap-houses\/(.+)-under-\d+-in-([a-z-]+)$/.exec(path);
    if (c) for (const p of [`/cheap-houses/${c[1]}-in-${c[2]}`, `/homes/${c[2]}/${c[1]}`]) if (live.has(p)) return p;
    // "by-the-sea-in-united-states": the country is the longest tail that has a page
    const parts = m[1].split("-");
    for (let i = 0; i < parts.length; i++) { const hub = `/homes/${parts.slice(i).join("-")}`; if (live.has(hub)) return hub; }
    return "/cheap-houses";
  }
  const seg = path.split("/").filter(Boolean);
  while (seg.length > 1) { seg.pop(); const p = "/" + seg.join("/"); if (live.has(p)) return p; }
  // a country that lost all its homes goes to the hub of all listings, which exists in every language (15-nov-2026)
  return path.startsWith("/cheap-houses") || path.startsWith("/homes/") ? "/cheap-houses" : "/";
}
