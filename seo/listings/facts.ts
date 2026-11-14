// The numbers behind one listing page (14-nov-2026). Everything a page says comes from here, so the four language
// packs (seo/listings/pack.*.ts) only decide how to say it, never what is true.
import { regionOf } from "../../src/community/regions";
import { costRange, buyingCosts } from "../../src/community/seo2data";
import { type Facet, type Home, bySea, ptypeOf, townOf, countrySlug } from "./facets";

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
  cost: { pct: string; range: [number, number]; lo: number; hi: number; totalLo: number; totalHi: number; capLo: number; capHi: number; maxAsk: number; fit: number } | null;
  watch: {
    noSqm: number; hoa: { n: number; min: number; max: number; ccy: string } | null; hoaUnknown: number; whyCheap: { ref: Ref; text: string } | null;
    flood: number; noise: number; old: number; sold: number; approx: number; weak: [string, number] | null; strong: [string, number] | null;
  };
  scoreMin: number; scoreMax: number;
  sources: [string, number][];
  updated: string; // day of the snapshot
};

export const dayOf = (s?: string | null) => (s && /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null);
export const homeDay = (r: Home) => [r?.verified_at, r?.approved_at, r?.publish_at].map(dayOf).filter(Boolean).sort().pop() || null;
/** Same median as the rest of the site (seo/prerender.ts, /research/prices), so two pages never disagree. */
export const median = (xs: number[]) => { const a = xs.filter((x) => x > 0).sort((p, q) => p - q); return a.length ? a[Math.floor(a.length / 2)] : 0; };
const ppsqmOf = (hs: Home[]) => { const v = hs.filter((h) => h.sqm > 0).map((h) => h.price_eur / h.sqm); return v.length >= 3 ? Math.round(median(v)) : 0; };
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
export const ref = (h: Home): Ref => ({ slug: String(h.slug), home: h, price: h.price_eur, sqm: Number(h.sqm) || 0, beds: Number(h.bedrooms) || 0, nota: Number(h.nota) || 0, town: townOf(h) || String(h.country || ""), day: homeDay(h) });
const DIM_KEYS = ["price", "value", "space", "condition", "extras", "water", "weather", "access", "costs"];

export type Ctx = { all: Home[]; byCountry: Map<string, Home[]>; pages: Facet[]; dest: Record<string, any>; updated: string };

export function nounOf(hs: Home[]): Noun {
  let a = 0, h = 0; for (const r of hs) { const t = ptypeOf(r); if (t === "apartment") a++; else if (t === "house") h++; }
  return a >= hs.length * 0.6 ? "apartment" : h >= hs.length * 0.6 ? "house" : "mixed";
}

export function factsFor(f: Facet, ctx: Ctx): Facts {
  const hs = f.homes;
  const prices = hs.map((h) => h.price_eur);
  const byPrice = hs.slice().sort((a, b) => a.price_eur - b.price_eur || String(a.slug).localeCompare(String(b.slug)));
  const withSqm = hs.filter((h) => h.sqm > 0);
  const countryHomes = f.cc ? ctx.byCountry.get(f.cc) || hs : ctx.all;
  const regionPage = f.regionSlug ? ctx.pages.find((p) => p.kind === "region" && p.cc === f.cc && p.regionSlug === f.regionSlug) : undefined;
  const parentHomes = f.kind === "country" || !f.cc ? ctx.all : (f.kind === "town" || f.kind === "regionBand") && regionPage ? regionPage.homes : countryHomes;
  const parentKind = f.kind === "country" || !f.cc ? "site" as const : (f.kind === "town" || f.kind === "regionBand") && regionPage ? "region" as const : "country" as const;
  const dated = hs.map((h) => [h, homeDay(h)] as const).filter(([, d]) => d).sort((a, b) => String(b[1]).localeCompare(String(a[1])));

  // regions (by homes), with their median, for pages that span a country
  const regs = new Map<string, Home[]>();
  for (const h of hs) { const r = regionOf(h); if (r) (regs.get(r) || regs.set(r, []).get(r)!).push(h); }
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
    const band = f.cap ? [`/homes/${cc}/under-${f.cap === 75000 ? 80000 : f.cap}`] : f.key ? [`/homes/${cc}/${f.key}`, `/cheap-houses/${f.key}-in-${cc}`] : [];
    return { name: String(l[0].country), cc, n: l.length, min: Math.min(...l.map((h) => h.price_eur)), path: band.find((p) => live.has(p)) || (live.has(`/homes/${cc}`) ? `/homes/${cc}` : ""), pct: String(ctx.dest[cc]?.purchase_costs_pct || "") };
  }).sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));

  // the budgets on each side (same country, or same region for a budget inside a region)
  let prev: Facts["prev"] = null, next: Facts["next"] = null, step: Facts["step"] = null;
  if (f.cap) {
    const sib = ctx.pages.filter((p) => p.kind === f.kind && p.cc === f.cc && p.regionSlug === f.regionSlug && p.cap).sort((a, b) => a.cap! - b.cap!);
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
    const cap = f.cap ? buyingCosts(f.cap, range) : null;
    const maxAsk = f.cap ? Math.floor(f.cap / (1 + range[1] / 100) / 100) * 100 : 0;
    cost = { pct: String(dest.purchase_costs_pct), range, lo: b.lo, hi: b.hi, totalLo: b.totalLo, totalHi: b.totalHi, capLo: cap?.totalLo || 0, capHi: cap?.totalHi || 0, maxAsk, fit: maxAsk ? hs.filter((h) => h.price_eur <= maxAsk).length : 0 };
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
  const bedsCount = (b: number) => hs.filter((h) => (b === 4 ? Number(h.bedrooms) >= 4 : Number(h.bedrooms) === b)).length;
  const bigSqm = withSqm.slice().sort((a, b) => b.sqm - a.sqm)[0];

  return {
    f, n: hs.length, noun: nounOf(hs),
    min: Math.min(...prices), max: Math.max(...prices), median: med, ppsqm: ppsqmOf(hs),
    sqmMedian: withSqm.length >= 3 ? Math.round(median(withSqm.map((h) => Number(h.sqm)))) : 0, sqmMax: withSqm.length >= 3 && bigSqm ? ref(bigSqm) : null,
    cheapest: ref(byPrice[0]), best: ref(hs[0]), newest: dated.length ? ref(dated[0][0]) : null,
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
    sources: [...src.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 5),
    updated: ctx.updated,
  };
}
