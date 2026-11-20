import { isUnconfirmed } from "../../src/community/n9/status";
// The numbers behind one listing page (14-nov-2026). Everything a page says comes from here, so the four language
// packs (seo/listings/pack.*.ts) only decide how to say it, never what is true.
import { costRange, buyingCosts } from "../../src/community/seo2data";
import { type Facet, type Home, bySea, ptypeOf, bedsOf, townOf, countrySlug } from "./facets";
import { regionName, islandOf, areaBySlug, cityBySlug, kmTo } from "./places";
import { plotOf, ppsqm as ppsqmHome, seaM, airportKm, goodDays, elevation, dropPct, feeOf } from "./traits";
import type { Fx } from "./fx";

export type Ref = { slug: string; home: Home; price: number; sqm: number; beds: number; nota: number; town: string; day: string | null };
export type Noun = "house" | "apartment" | "mixed";
export type Facts = {
  f: Facet; n: number; noun: Noun;
  min: number; max: number; median: number; ppsqm: number; sqmMedian: number; sqmMax: Ref | null;
  cheapest: Ref; best: Ref; newest: Ref | null; new30: number;
  parent: { kind: "site" | "country" | "region"; n: number; median: number; ppsqm: number; name: string; countries: number };
  isAll: boolean;
  beds: [number, number][];                 // [bedrooms (4 = four or more), homes]
  types: { apartment: number; house: number };
  settings: { sea: number; village: number; town: number };
  regions: { name: string; n: number; median: number; path?: string }[];
  towns: { name: string; n: number }[];
  countries: { name: string; cc: string; n: number; min: number; path: string; pct: string }[];
  prev: { cap: number; n: number; path: string } | null;
  next: { cap: number; n: number; path: string } | null;
  step: { from: number; n: number; best: Ref } | null;
  dest: Record<string, any> | null;
  cost: { pct: string; range: [number, number]; lo: number; hi: number; totalLo: number; totalHi: number; capLo: number; capHi: number; maxAsk: number; fit: number; examples: [price: number, lo: number, hi: number][] } | null;
  watch: {
    noSqm: number; hoa: { n: number; min: number; max: number; ccy: string } | null; hoaUnknown: number; whyCheap: { ref: Ref; text: string } | null;
    flood: number; noise: number; old: number; sold: number; approx: number; weak: [string, number] | null; strong: [string, number] | null;
  };
  scoreMin: number; scoreMax: number;
  /** Mean RealHunt score of the homes that have one, rounded (0 when none has). */
  scoreAvg: number;
  /** Numbers that only some families have (15-nov-2026): each is there only when the homes of the page carry it. */
  x: Extra;
  sources: [string, number][];
  updated: string; // day of the snapshot
};

export type Extra = {
  amen: [string, number][];
  airport?: { med: number; near: Ref; km: number; name: string; code: string; list: { name: string; n: number }[]; codes: { name: string; n: number }[] };
  sea?: { med: number; near: Ref; m: number; n: number };
  plot?: { med: number; max: Ref; m2: number };
  ppsqm?: { low: Ref; v: number; high: number };
  score?: { n95: number; pct: number };
  fee?: { n: number; min: number; max: number; ccy: string };
  drop?: { max: Ref; pct: number; amount: number; med: number };
  days?: { med: number; max: Ref; v: number };
  elev?: { n: number; med: number; max: Ref; v: number };
  islands?: { name: string; n: number }[];
  dist?: { med: number; near: Ref; km: number; far: number };
  rank?: { last: Ref; v: number; of: number };
  fx?: { ccy: string; cap: number; capEur: number; rate: number; date: string };
  vs?: { path: string; label: Pick<Facet, "kind" | "region" | "area" | "cc" | "country">; med: number; n: number; pct: number };
  areaRegions?: { name: string; n: number }[];
};

export const dayOf = (s?: string | null) => (s && /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null);
export const homeDay = (r: Home) => [r?.verified_at, r?.approved_at, r?.publish_at].map(dayOf).filter(Boolean).sort().pop() || null;
/** Same median as the rest of the site (seo/prerender.ts, /research/prices), so two pages never disagree. */
export const median = (xs: number[]) => { const a = xs.filter((x) => x > 0).sort((p, q) => p - q); return a.length ? a[Math.floor(a.length / 2)] : 0; };
const ppsqmOf = (hs: Home[]) => { const v = hs.filter((h) => h.sqm > 0).map((h) => h.price_eur / h.sqm); return v.length >= 3 ? Math.round(median(v)) : 0; };
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
export const ref = (h: Home): Ref => ({ slug: String(h.slug), home: h, price: h.price_eur, sqm: Number(h.sqm) || 0, beds: bedsOf(h), nota: Number(h.nota) || 0, town: townOf(h) || String(h.country || ""), day: homeDay(h) });
const DIM_KEYS = ["price", "value", "space", "condition", "extras", "water", "weather", "access", "costs"];

export type Ctx = { all: Home[]; byCountry: Map<string, Home[]>; pages: Facet[]; dest: Record<string, any>; updated: string; fx?: Fx };
// 20-nov-2026: homes whose advert the nightly check could not confirm for 30 days go after the others (status.ts isUnconfirmed).
const unconf = (h: Home) => (isUnconfirmed(h as any) ? 1 : 0);
const byScore = (a: Home, b: Home) => unconf(a) - unconf(b) || (b.nota ?? 0) - (a.nota ?? 0) || (a.rank ?? 1e9) - (b.rank ?? 1e9) || String(a.slug).localeCompare(String(b.slug));
const count = (xs: string[]) => { const m = new Map<string, number>(); for (const x of xs) if (x) m.set(x, (m.get(x) || 0) + 1); return [...m.entries()].map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n || a.name.localeCompare(b.name)); };
const BAND_KINDS = ["band", "regionBand", "gband"];
/** The three prices the country pages work the buying costs out for. */
export const COST_EXAMPLES = [40000, 80000, 150000];

/** The numbers of the families that have their own (airport, sea, land, score...). */
function extras(f: Facet, hs: Home[], parentHomes: Home[], ctx: Ctx): Extra {
  const is = (...keys: string[]) => !!f.key && keys.includes(f.key) && f.kind !== "combo";
  const x: Extra = { amen: [] };
  for (const a of ["garden", "terrace", "garage", "pool", "fireplace", "sauna"]) {
    const own = { garden: "with-garden", terrace: "with-a-terrace", garage: "with-garage", pool: "with-pool", fireplace: "with-fireplace", sauna: "with-sauna" }[a];
    const n = hs.filter((h) => Array.isArray(h.amen) && h.amen.includes(a)).length;
    if (n > 0 && f.key !== own) x.amen.push([a, n]);
  }
  const with_ = <T,>(get: (h: Home) => T | null) => hs.map((h) => [h, get(h)] as const).filter((p): p is readonly [Home, T] => p[1] != null);
  if (is("near-an-airport")) {
    const l = with_(airportKm).sort((a, b) => a[1] - b[1]);
    if (l.length >= 3) x.airport = { med: Math.round(median(l.map((p) => p[1] || 0.1))), near: ref(l[0][0]), km: Math.round(l[0][1]), name: String(l[0][0].nearby?.airport?.name || ""), code: String(l[0][0].nearby?.airport?.code || ""), list: count(l.map((p) => String(p[0].nearby?.airport?.name || ""))).slice(0, 4), codes: count(l.map((p) => String(p[0].nearby?.airport?.code || ""))).slice(0, 4) };
  }
  if (is("near-the-beach", "with-sea-view", "by-the-sea") || f.area && areaBySlug(f.cc || "", f.area)?.sea) {
    const l = with_(seaM).sort((a, b) => a[1] - b[1]);
    if (l.length >= 3) x.sea = { med: median(l.map((p) => p[1] || 1)), near: ref(l[0][0]), m: l[0][1], n: l.length };
  }
  if (is("with-land", "with-olive-trees-or-vines")) {
    const l = with_((h) => plotOf(h) || null).sort((a, b) => b[1] - a[1]);
    if (l.length >= 3) x.plot = { med: median(l.map((p) => p[1])), max: ref(l[0][0]), m2: l[0][1] };
  }
  if (is("under-500-per-sqm", "most-space-for-the-money", "over-100-sqm-under-50000")) {
    const l = with_((h) => ppsqmHome(h) || null).sort((a, b) => a[1] - b[1]);
    if (l.length >= 3) x.ppsqm = { low: ref(l[0][0]), v: Math.round(l[0][1]), high: Math.round(l[l.length - 1][1]) };
  }
  if (is("score-90-plus")) x.score = { n95: hs.filter((h) => Number(h.nota) >= 95).length, pct: Math.round((hs.length / Math.max(1, parentHomes.length)) * 100) };
  if (is("low-community-fee")) {
    const l = hs.map(feeOf).filter(Boolean) as { amount: number; ccy: string }[];
    const ccy = l[0]?.ccy; const same = l.filter((v) => v.ccy === ccy).map((v) => v.amount);
    if (same.length >= 3) x.fee = { n: same.length, min: Math.min(...same), max: Math.max(...same), ccy: ccy! };
  }
  if (is("price-drops")) {
    const l = with_((h) => dropPct(h) || null).sort((a, b) => b[1] - a[1]);
    if (l.length >= 3) x.drop = { max: ref(l[0][0]), pct: l[0][1], amount: Number(l[0][0].price_drop), med: median(l.map((p) => p[1])) };
  }
  if (is("good-weather")) {
    const l = with_(goodDays).sort((a, b) => b[1] - a[1]);
    if (l.length >= 3) x.days = { med: median(l.map((p) => p[1])), max: ref(l[0][0]), v: l[0][1] };
  }
  if (is("in-the-mountains")) {
    const l = with_(elevation).filter((p) => p[1] > 0).sort((a, b) => b[1] - a[1]);
    if (l.length >= 3) x.elev = { n: l.length, med: Math.round(median(l.map((p) => p[1]))), max: ref(l[0][0]), v: Math.round(l[0][1]) };
  }
  if (is("on-an-island") || f.area === "canary-islands" || f.area === "balearic-islands") { const l = count(hs.map(islandOf)); if (l.length) x.islands = l.slice(0, 8); }
  if (f.kind === "near") {
    const c = cityBySlug(f.city || "");
    const l = c ? with_((h) => kmTo(h, c[3], c[4])).sort((a, b) => a[1] - b[1]) : [];
    if (l.length >= 3) x.dist = { med: Math.round(median(l.map((p) => p[1] || 0.1))), near: ref(l[0][0]), km: Math.round(l[0][1]), far: Math.round(l[l.length - 1][1]) };
  }
  if (f.ranked && hs.length) { const last = hs[hs.length - 1]; x.rank = { last: ref(last), v: f.key === "cheapest" ? last.price_eur : f.key === "best-rated" ? Number(last.nota) || 0 : Math.round(ppsqmHome(last)), of: f.key === "cheapest" || f.key === "best-rated" ? parentHomes.length : parentHomes.filter((h) => ppsqmHome(h) > 0).length }; }
  if (f.kind === "ccyBand" && f.ccy && f.rate) x.fx = { ccy: f.ccy, cap: f.cap!, capEur: Math.floor((f.capEur || 0) / 100) * 100, rate: f.rate, date: ctx.fx?.date || "" };
  if (f.kind === "area") {
    const a = areaBySlug(f.cc || "", f.area || "");
    x.areaRegions = count(hs.map(a?.hoods ? townOf : regionName));
    const other = a?.vs ? ctx.pages.find((p) => !p.thin && p.cc === f.cc && (p.area === a.vs || (p.kind === "region" && p.regionSlug === a.vs))) : undefined;
    const med = median(hs.map((h) => h.price_eur));
    if (other && other.homes.length >= 3) { const om = median(other.homes.map((h) => h.price_eur)); if (om > 0 && med < om) x.vs = { path: other.path, label: other, med: om, n: other.homes.length, pct: Math.round((1 - med / om) * 100) }; }
  }
  return x;
}

/** "houses", "apartments" or "homes": a page is named after one kind when at least `share` of its homes are of it.
 * The families of 15-nov-2026 ask for more (0.85) than the older ones: "apartments near an airport" with a third
 * of houses on the list is the wrong name. */
export function nounOf(hs: Home[], share = 0.6): Noun {
  let a = 0, h = 0; for (const r of hs) { const t = ptypeOf(r); if (t === "apartment") a++; else if (t === "house") h++; }
  return a >= hs.length * share ? "apartment" : h >= hs.length * share ? "house" : "mixed";
}
const OLD_FEATURES = new Set(["near-a-lake", "with-garden", "with-pool", "with-sauna", "stone-houses", "cabins-and-cottages", "with-a-terrace", "by-the-sea", "village-houses", "in-town"]);
const strictNoun = (f: Facet) => ["combo", "ccyBand", "area", "near"].includes(f.kind) || ((f.kind === "feature" || f.kind === "gfeature") && !OLD_FEATURES.has(f.key || ""));

export function factsFor(f: Facet, ctx: Ctx): Facts {
  const hs = f.homes;
  const prices = hs.map((h) => h.price_eur);
  const byPrice = hs.slice().sort((a, b) => a.price_eur - b.price_eur || String(a.slug).localeCompare(String(b.slug)));
  const withSqm = hs.filter((h) => h.sqm > 0);
  const countryHomes = f.cc ? ctx.byCountry.get(f.cc) || hs : ctx.all;
  const regionPage = f.regionSlug ? ctx.pages.find((p) => p.kind === "region" && p.cc === f.cc && p.regionSlug === f.regionSlug)
    : f.area && f.kind === "regionBand" ? ctx.pages.find((p) => p.kind === "area" && p.cc === f.cc && p.area === f.area) : undefined;
  const inRegion = f.kind === "town" || f.kind === "regionBand" || (f.kind === "ccyBand" && !!f.regionSlug);
  const parentHomes = f.kind === "country" || !f.cc ? ctx.all : inRegion && regionPage ? regionPage.homes : countryHomes;
  const parentKind = f.kind === "country" || !f.cc ? "site" as const : inRegion && regionPage ? "region" as const : "country" as const;
  const dated = hs.map((h) => [h, homeDay(h)] as const).filter(([, d]) => d).sort((a, b) => String(b[1]).localeCompare(String(a[1])));

  // regions (by homes), with their median, for pages that span a country
  const regs = new Map<string, Home[]>();
  for (const h of hs) { const r = regionName(h); if (r) (regs.get(r) || regs.set(r, []).get(r)!).push(h); }
  const regions = [...regs.entries()].map(([name, l]) => ({ name, n: l.length, median: median(l.map((h) => h.price_eur)), path: ctx.pages.find((p) => p.kind === "region" && p.cc === f.cc && p.region === name)?.path }))
    .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
  const tw = new Map<string, number>();
  for (const h of hs) { const t = townOf(h); if (t) tw.set(t, (tw.get(t) || 0) + 1); }
  const towns = [...tw.entries()].map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));

  // countries, for the pages that span all of them
  const cs = new Map<string, Home[]>();
  if (!f.cc) for (const h of hs) { const c = countrySlug(h.country); if (c) (cs.get(c) || cs.set(c, []).get(c)!).push(h); }
  const live = new Set(ctx.pages.filter((p) => !p.thin).map((p) => p.path));
  const countries = [...cs.entries()].map(([cc, l]) => {
    const band = f.kind === "ccyBand" ? [f.path + `-in-${cc}`] : f.kind === "combo" ? [`/cheap-houses/${f.key}-under-${f.cap}-in-${cc}`]
      : f.cap ? [`/homes/${cc}/under-${f.cap === 75000 ? 80000 : f.cap}`] : f.key ? [`/homes/${cc}/${f.key}`, `/cheap-houses/${f.key}-in-${cc}`] : [];
    return { name: String(l[0].country), cc, n: l.length, min: Math.min(...l.map((h) => h.price_eur)), path: band.find((p) => live.has(p)) || (live.has(`/homes/${cc}`) ? `/homes/${cc}` : ""), pct: String(ctx.dest[cc]?.purchase_costs_pct || "") };
  }).sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));

  // the budgets on each side (same country, or same region for a budget inside a region)
  let prev: Facts["prev"] = null, next: Facts["next"] = null, step: Facts["step"] = null;
  if (f.cap && BAND_KINDS.includes(f.kind)) {
    const sib = ctx.pages.filter((p) => p.kind === f.kind && p.cc === f.cc && p.regionSlug === f.regionSlug && p.area === f.area && p.cap).sort((a, b) => a.cap! - b.cap!);
    const i = sib.findIndex((p) => p.path === f.path);
    if (i > 0) prev = { cap: sib[i - 1].cap!, n: sib[i - 1].homes.length, path: sib[i - 1].path };
    if (i >= 0 && i < sib.length - 1) next = { cap: sib[i + 1].cap!, n: sib[i + 1].homes.length, path: sib[i + 1].path };
    if (prev) { const between = hs.filter((h) => h.price_eur > prev!.cap); if (between.length) step = { from: prev.cap, n: between.length, best: ref(between[0]) }; }
  }

  const dest = f.cc ? ctx.dest[f.cc] || null : null;
  const range = dest ? costRange(dest.purchase_costs_pct) : null;
  const med = median(prices);
  let cost: Facts["cost"] = null;
  if (dest && range) {
    const b = buyingCosts(med, range);
    const eur = f.cap && f.kind !== "ccyBand" ? f.cap : 0; // a budget in pounds or dollars moves with the rate: no all-in sum
    const cap = eur ? buyingCosts(eur, range) : null;
    const maxAsk = eur ? Math.floor(eur / (1 + range[1] / 100) / 100) * 100 : 0;
    cost = { pct: String(dest.purchase_costs_pct), range, lo: b.lo, hi: b.hi, totalLo: b.totalLo, totalHi: b.totalHi, capLo: cap?.totalLo || 0, capHi: cap?.totalHi || 0, maxAsk, fit: maxAsk ? hs.filter((h) => h.price_eur <= maxAsk).length : 0,
      examples: COST_EXAMPLES.map((p) => { const e = buyingCosts(p, range); return [p, e.lo, e.hi] as [number, number, number]; }) };
  }

  const hoa = hs.filter((h) => Number(h.hoa_monthly) > 0);
  const ccy = hoa.length ? String(hoa[0].hoa_currency || "EUR") : "EUR";
  const hoaSame = hoa.filter((h) => String(h.hoa_currency || "EUR") === ccy).map((h) => Number(h.hoa_monthly));
  const why = hs.find((h) => String(h.why_cheap || "").trim().length > 20);
  const avg = (k: string) => { const v = hs.map((h) => h.dims?.[k]).filter((x) => typeof x === "number") as number[]; return v.length >= Math.max(3, hs.length / 2) ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null; };
  const dims = DIM_KEYS.map((k) => [k, avg(k)] as [string, number | null]).filter((x): x is [string, number] => x[1] != null).sort((a, b) => a[1] - b[1]);
  const src = new Map<string, number>();
  for (const h of hs) if (h.source_domain) src.set(h.source_domain, (src.get(h.source_domain) || 0) + 1);
  const notas = hs.map((h) => Number(h.nota) || 0).filter(Boolean);
  const bedsCount = (b: number) => hs.filter((h) => (b === 4 ? bedsOf(h) >= 4 : bedsOf(h) === b)).length;
  const bigSqm = withSqm.slice().sort((a, b) => b.sqm - a.sqm)[0];

  return {
    f, n: hs.length, noun: nounOf(hs, strictNoun(f) ? 0.85 : 0.6),
    min: Math.min(...prices), max: Math.max(...prices), median: med, ppsqm: ppsqmOf(hs),
    sqmMedian: withSqm.length >= 3 ? Math.round(median(withSqm.map((h) => Number(h.sqm)))) : 0, sqmMax: withSqm.length >= 3 && bigSqm ? ref(bigSqm) : null,
    cheapest: ref(byPrice[0]), best: ref(f.ranked ? hs.slice().sort(byScore)[0] : hs[0]), newest: dated.length ? ref(dated[0][0]) : null,
    new30: dated.filter(([, d]) => daysBetween(d!, ctx.updated) <= 30).length,
    parent: { kind: parentKind, n: parentHomes.length, median: median(parentHomes.map((h) => h.price_eur)), ppsqm: ppsqmOf(parentHomes), name: parentKind === "region" ? String(f.region) : parentKind === "country" ? String(f.country) : "", countries: new Set(ctx.all.map((h) => countrySlug(h.country))).size },
    isAll: hs.length === parentHomes.length,
    beds: [1, 2, 3, 4].map((b) => [b, bedsCount(b)] as [number, number]).filter(([, n]) => n > 0),
    types: { apartment: hs.filter((h) => ptypeOf(h) === "apartment").length, house: hs.filter((h) => ptypeOf(h) === "house").length },
    settings: { sea: hs.filter(bySea).length, village: hs.filter((h) => h.category === "village").length, town: hs.filter((h) => h.category === "city").length },
    regions, towns, countries, prev, next, step, dest, cost,
    watch: {
      noSqm: hs.length - withSqm.length,
      hoa: hoaSame.length ? { n: hoa.length, min: Math.min(...hoaSame), max: Math.max(...hoaSame), ccy } : null,
      hoaUnknown: hs.filter((h) => h.hoa_unknown === true).length,
      whyCheap: why ? { ref: ref(why), text: String(why.why_cheap).trim() } : null,
      flood: hs.filter((h) => ["medium", "high"].includes(h.risks?.flood?.level)).length,
      noise: hs.filter((h) => h.risks?.noise?.level === "high").length,
      old: dated.filter(([, d]) => daysBetween(d!, ctx.updated) > 60).length,
      // same rule as the "Reported sold" tag in the app (src/community/extras.tsx)
      sold: hs.filter((h) => Number(h.sold_reports) >= 2 && Number(h.sold_reports) > Number(h.available_reports || 0)).length,
      approx: hs.filter((h) => h.nearby?.approx).length,
      weak: dims.length >= 4 ? dims[0] : null, strong: dims.length >= 4 ? dims[dims.length - 1] : null,
    },
    scoreMin: notas.length ? Math.min(...notas) : 0, scoreMax: notas.length ? Math.max(...notas) : 0,
    scoreAvg: notas.length ? Math.round(notas.reduce((a, b) => a + b, 0) / notas.length) : 0,
    x: extras(f, hs, parentHomes, ctx),
    sources: [...src.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 5),
    updated: ctx.updated,
  };
}
