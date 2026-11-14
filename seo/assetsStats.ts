// Numbers behind the data hub (/research/...), the press page and the method document (14-nov-2026).
// Pure functions over the homes of public/data/rh-static.json and the country files in src/data, so every figure
// the site publishes for others to quote is computed, dated and testable (src/test/assets-stats.test.ts).
import { regionOf, slugify } from "../src/community/regions";
import { costRange, ruleFor, type CanBuyData, type Status } from "../src/community/seo2data";

export type Home = { slug: string; title?: string; title_es?: string; country?: string; location_name?: string; price_eur: number; sqm?: number | null; bedrooms?: number | null; nota?: number | null; dims?: Record<string, number> | null; source_domain?: string | null; publish_at?: string | null; approved_at?: string | null };

/** A country needs this many homes to be ranked; with fewer it is listed and marked as a small sample. */
export const MIN_RANK = 10;
/** Below this a figure is not published at all. */
export const MIN_SHOW = 3;
/** Tags that are not a country ("Scandinavia" came from an import). */
const NOT_COUNTRY = new Set(["scandinavia"]);

export const cKey = (c?: string | null) => String(c || "").toLowerCase().trim().replace(/\s+/g, "-");
/** The middle value. With an even count it is the upper of the two middle values: the same rule as the country
 * pages (seo/prerender.ts), so one country never shows two different medians on the site. */
export const median = (xs: number[]): number => { const a = xs.filter((x) => x > 0).sort((p, q) => p - q); return a.length ? a[Math.floor(a.length / 2)] : 0; };

export type CountryStat = { k: string; name: string; n: number; nSqm: number; medPrice: number; medPpsqm: number; medSqm: number; min: number; max: number; medScore: number; small: boolean; regions: string[] };
export function countryStats(rows: Home[]): CountryStat[] {
  const by = new Map<string, Home[]>();
  for (const r of rows) { const k = cKey(r.country); if (!k || NOT_COUNTRY.has(k) || !(r.price_eur > 0)) continue; (by.get(k) || by.set(k, []).get(k)!).push(r); }
  return [...by.entries()].map(([k, hs]) => {
    const sized = hs.filter((h) => Number(h.sqm) > 0);
    const pr = hs.map((h) => h.price_eur);
    return { k, name: String(hs[0].country), n: hs.length, nSqm: sized.length, medPrice: median(pr), medPpsqm: sized.length >= MIN_SHOW ? Math.round(median(sized.map((h) => h.price_eur / Number(h.sqm)))) : 0,
      medSqm: sized.length >= MIN_SHOW ? median(sized.map((h) => Number(h.sqm))) : 0, min: Math.min(...pr), max: Math.max(...pr), medScore: median(hs.map((h) => Number(h.nota) || 0)), small: hs.length < MIN_RANK, regions: [...new Set(hs.map((h) => regionOf(h)).filter(Boolean))] };
  }).filter((c) => c.n >= MIN_SHOW);
}

/** Price bands of the budget page: what up to 50k, 50-100k and 100-200k buy. Disjoint, so a home counts once. */
export const BANDS: { id: string; lo: number; hi: number }[] = [{ id: "50k", lo: 0, hi: 50000 }, { id: "100k", lo: 50000, hi: 100000 }, { id: "200k", lo: 100000, hi: 200000 }];
export type BandCell = { n: number; nSqm: number; medSqm: number; medPpsqm: number; medBeds: number; best: Home | null };
export type BudgetRow = { k: string; name: string; n: number; cells: Record<string, BandCell> };
export function budgetStats(rows: Home[]): BudgetRow[] {
  return countryStats(rows).map((c) => {
    const hs = rows.filter((r) => cKey(r.country) === c.k && r.price_eur > 0);
    const cells: Record<string, BandCell> = {};
    for (const b of BANDS) {
      const inb = hs.filter((h) => h.price_eur > b.lo && h.price_eur <= b.hi);
      const sized = inb.filter((h) => Number(h.sqm) > 0);
      const ok = sized.length >= MIN_SHOW;
      cells[b.id] = { n: inb.length, nSqm: sized.length, medSqm: ok ? median(sized.map((h) => Number(h.sqm))) : 0, medPpsqm: ok ? Math.round(median(sized.map((h) => h.price_eur / Number(h.sqm)))) : 0,
        medBeds: median(inb.map((h) => Number(h.bedrooms) || 0)), best: inb.slice().sort((x, y) => (Number(y.nota) || 0) - (Number(x.nota) || 0))[0] || null };
    }
    return { k: c.k, name: c.name, n: c.n, cells };
  });
}

export type RegionStat = { k: string; cc: string; country: string; name: string; slug: string; n: number; medScore: number; medPrice: number; medPpsqm: number; top: number };
/** Regions with at least `min` homes, best median score first (ties: more homes first). */
export function regionStats(rows: Home[], min = 5): RegionStat[] {
  const by = new Map<string, Home[]>();
  for (const r of rows) { const rg = regionOf(r); const cc = cKey(r.country); if (!rg || !cc || NOT_COUNTRY.has(cc)) continue; const k = `${cc}/${slugify(rg)}`; (by.get(k) || by.set(k, []).get(k)!).push(r); }
  return [...by.entries()].filter(([, hs]) => hs.length >= min).map(([k, hs]) => {
    const sized = hs.filter((h) => Number(h.sqm) > 0);
    return { k, cc: k.split("/")[0], country: String(hs[0].country), name: regionOf(hs[0]), slug: k.split("/")[1], n: hs.length, medScore: median(hs.map((h) => Number(h.nota) || 0)), medPrice: median(hs.map((h) => h.price_eur)),
      medPpsqm: sized.length >= MIN_SHOW ? Math.round(median(sized.map((h) => h.price_eur / Number(h.sqm)))) : 0, top: Math.max(...hs.map((h) => Number(h.nota) || 0)) };
  }).sort((a, b) => b.medScore - a.medScore || b.n - a.n || a.name.localeCompare(b.name));
}

export type CostStat = { k: string; lo: number; hi: number; mid: number; asOf: string; tax: string; breakdown: string; sources: string[] };
/** Purchase costs on top of the price, lowest midpoint first. Only countries whose range could be read. */
export function costStats(dest: Record<string, any>): CostStat[] {
  return Object.keys(dest).filter((k) => k !== "_meta").map((k) => { const r = costRange(dest[k]?.purchase_costs_pct); return r ? { k, lo: r[0], hi: r[1], mid: (r[0] + r[1]) / 2, asOf: String(dest[k].as_of ?? ""), tax: String(dest[k].annual_property_tax || ""), breakdown: String(dest[k].purchase_costs_breakdown || ""), sources: dest[k].sources || [] } : null; })
    .filter(Boolean).sort((a, b) => a!.mid - b!.mid || a!.k.localeCompare(b!.k)) as CostStat[];
}

export type RuleRow = { k: string; eu: Status; other: Status; byNat: Record<string, Status | "home">; exceptions: string[] };
/** Who can buy where: the status for EU citizens, for everyone else, and for each nationality the site covers. */
export function ruleStats(cb: CanBuyData, countries: string[]): RuleRow[] {
  return countries.filter((c) => cb.countries[c]).map((c) => {
    const rule = cb.countries[c] as Record<string, { s: Status } | string>;
    const st = (x: unknown): Status | null => (x && typeof x === "object" && "s" in (x as object) ? (x as { s: Status }).s : null);
    const other = st(rule.other) || st(rule.all) || "conditions";
    const eu = st(rule.eu) || st(rule.all) || other;
    const byNat: RuleRow["byNat"] = {};
    const exceptions: string[] = [];
    for (const [nk, nv] of Object.entries(cb.nationalities)) {
      if (nv.home === c) { byNat[nk] = "home"; continue; }
      const s = ruleFor(cb, nk, c)?.s || other;
      byNat[nk] = s;
      const bloc = nv.bloc === "eu" || nv.bloc === "eea" ? eu : other;
      if (s !== bloc) exceptions.push(nk);
    }
    return { k: c, eu, other, byNat, exceptions };
  });
}

export type ScoreFit = { n: number; all11: number; fewer: number; slope: number; intercept: number; within1: number; within2: number; min: number; max: number; bands: [string, number][] };
/** How the published grade relates to the published sub-scores: a straight line through (average of the home's
 * sub-scores, grade), fitted on homes that show at least 8 of the 11 sub-scores. The method page prints this only
 * when the line really describes the data (see `within1`). */
export function scoreFit(rows: Home[]): ScoreFit {
  const graded = rows.filter((r) => r.nota != null);
  const pts = graded.filter((r) => Object.keys(r.dims || {}).length >= 8).map((r) => { const v = Object.values(r.dims!); return [v.reduce((a, b) => a + b, 0) / v.length, Number(r.nota)] as [number, number]; });
  const n = pts.length; const mx = pts.reduce((a, p) => a + p[0], 0) / (n || 1), my = pts.reduce((a, p) => a + p[1], 0) / (n || 1);
  const sxx = pts.reduce((a, p) => a + (p[0] - mx) ** 2, 0), sxy = pts.reduce((a, p) => a + (p[0] - mx) * (p[1] - my), 0);
  const slope = sxx ? sxy / sxx : 0, intercept = my - slope * mx;
  const err = pts.map((p) => Math.abs(slope * p[0] + intercept - p[1]));
  const notas = graded.map((r) => Number(r.nota));
  const count = (lo: number, hi: number) => notas.filter((x) => x >= lo && x <= hi).length;
  return { n, all11: graded.filter((r) => Object.keys(r.dims || {}).length >= 11).length, fewer: graded.length - n, slope, intercept, within1: n ? err.filter((e) => e <= 1).length / n : 0, within2: n ? err.filter((e) => e <= 2).length / n : 0,
    min: notas.length ? Math.min(...notas) : 0, max: notas.length ? Math.max(...notas) : 0, bands: [["90-98", count(90, 98)], ["80-89", count(80, 89)], ["70-79", count(70, 79)]] };
}

/** CSV with a header row; every cell quoted when it needs it. */
export const toCsv = (head: string[], lines: (string | number | null | undefined)[][]) =>
  [head, ...lines].map((l) => l.map((c) => { const s = c == null ? "" : String(c); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(",")).join("\n") + "\n";

// ------------------------------------------------------------------------------------------------------------
// Studies added on 15-nov-2026 (seo/assetsStudies.ts). Same rules: computed, dated, small samples marked or left out.

/** A figure about a country is published from this many homes; under MIN_RANK it is marked as a small sample. */
export const MIN_STUDY = 5;
type Extra = Home & { airport_km?: number | null; risks?: { flood?: { level?: string | null; source?: string | null } | null } | null };

export type CheapStat = { k: string; name: string; n: number; under: number; share: number; under30: number; cheapest: number; medSqm: number };
/** Homes at or under `cap` euros, by country (countries with at least MIN_SHOW of them), most homes first. */
export function cheapStats(rows: Home[], cap = 50000, low = 30000): CheapStat[] {
  return countryStats(rows).map((c) => {
    const hs = rows.filter((r) => cKey(r.country) === c.k && r.price_eur > 0 && r.price_eur <= cap);
    const sized = hs.filter((h) => Number(h.sqm) > 0);
    return { k: c.k, name: c.name, n: c.n, under: hs.length, share: c.n ? Math.round((hs.length / c.n) * 100) : 0, under30: hs.filter((h) => h.price_eur <= low).length, cheapest: hs.length ? Math.min(...hs.map((h) => h.price_eur)) : 0, medSqm: sized.length >= MIN_SHOW ? median(sized.map((h) => Number(h.sqm))) : 0 };
  }).filter((c) => c.under >= MIN_SHOW).sort((a, b) => b.under - a.under || a.name.localeCompare(b.name));
}
/** Regions with at least MIN_SHOW homes at or under `cap`, most homes first. */
export function cheapRegions(rows: Home[], cap = 50000): RegionStat[] {
  return regionStats(rows.filter((r) => r.price_eur > 0 && r.price_eur <= cap), MIN_SHOW).sort((a, b) => b.n - a.n || a.medPrice - b.medPrice || a.name.localeCompare(b.name));
}

export type FloodStat = { k: string; name: string; n: number; low: number; medium: number; high: number; share: number; official: number };
/** The site's flood indicator (low, medium, high) by country, for countries with at least MIN_STUDY homes that have
 * it. `share` = medium or high, in %. `official` = homes whose level comes from an official flood map (FEMA). */
export function floodStats(rows: Extra[]): FloodStat[] {
  const by = new Map<string, Extra[]>();
  for (const r of rows) { const k = cKey(r.country); const lv = r.risks?.flood?.level; if (!k || k === "scandinavia" || !lv) continue; (by.get(k) || by.set(k, []).get(k)!).push(r); }
  return [...by.entries()].filter(([, hs]) => hs.length >= MIN_STUDY).map(([k, hs]) => {
    const cnt = (l: string) => hs.filter((h) => h.risks!.flood!.level === l).length;
    const medium = cnt("medium"), high = cnt("high");
    return { k, name: String(hs[0].country), n: hs.length, low: cnt("low"), medium, high, share: Math.round(((medium + high) / hs.length) * 100), official: hs.filter((h) => h.risks!.flood!.source && h.risks!.flood!.source !== "rough").length };
  }).sort((a, b) => b.share - a.share || b.n - a.n || a.name.localeCompare(b.name));
}

export const AIRPORT_BANDS: { id: string; lo: number; hi: number }[] = [{ id: "0-30", lo: 0, hi: 30 }, { id: "30-60", lo: 30, hi: 60 }, { id: "60-100", lo: 60, hi: 100 }, { id: "100+", lo: 100, hi: Infinity }];
export type AirportBand = { id: string; lo: number; hi: number; n: number; nSqm: number; medPrice: number; medPpsqm: number; medScore: number };
/** Price by distance to the nearest airport, in bands of kilometres in a straight line (lower bound included). */
export function airportStats(rows: Extra[]): AirportBand[] {
  const hs = rows.filter((r) => r.price_eur > 0 && r.airport_km != null && Number(r.airport_km) >= 0);
  return AIRPORT_BANDS.map((b) => {
    const inb = hs.filter((h) => Number(h.airport_km) >= b.lo && Number(h.airport_km) < b.hi);
    const sized = inb.filter((h) => Number(h.sqm) > 0);
    return { ...b, n: inb.length, nSqm: sized.length, medPrice: median(inb.map((h) => h.price_eur)), medPpsqm: sized.length >= MIN_STUDY ? Math.round(median(sized.map((h) => h.price_eur / Number(h.sqm)))) : 0, medScore: median(inb.map((h) => Number(h.nota) || 0)) };
  });
}
export type AirportCountry = { k: string; name: string; n: number; medKm: number; within60: number };
/** Median distance to the nearest airport by country (at least MIN_STUDY homes with a distance), nearest first. */
export function airportByCountry(rows: Extra[]): AirportCountry[] {
  const by = new Map<string, Extra[]>();
  for (const r of rows) { const k = cKey(r.country); if (!k || k === "scandinavia" || r.airport_km == null || !(r.price_eur > 0)) continue; (by.get(k) || by.set(k, []).get(k)!).push(r); }
  return [...by.entries()].filter(([, hs]) => hs.length >= MIN_STUDY).map(([k, hs]) => ({ k, name: String(hs[0].country), n: hs.length, medKm: median(hs.map((h) => Math.max(1, Math.round(Number(h.airport_km))))), within60: Math.round((hs.filter((h) => Number(h.airport_km) < 60).length / hs.length) * 100) }))
    .sort((a, b) => a.medKm - b.medKm || a.name.localeCompare(b.name));
}

export type SalaryStat = { k: string; name: string; n: number; medPrice: number; earnings: number; years: number; small: boolean };
/** Years of average net earnings (Eurostat, src/data/earnings.json) that the median home on RealHunt costs, for the
 * countries Eurostat covers and where the site has at least MIN_STUDY homes. Fewest years first. */
export function salaryStats(rows: Home[], earnings: Record<string, unknown>): SalaryStat[] {
  return countryStats(rows).filter((c) => c.n >= MIN_STUDY && Number(earnings[c.k]) > 0).map((c) => ({ k: c.k, name: c.name, n: c.n, medPrice: c.medPrice, earnings: Math.round(Number(earnings[c.k])), years: Math.round((c.medPrice / Number(earnings[c.k])) * 10) / 10, small: c.n < MIN_RANK }))
    .sort((a, b) => a.years - b.years || a.name.localeCompare(b.name));
}

export type Project = { slug: string; name?: string; locality?: string; price_eur?: number; ptype?: string; blurb?: string };
export type NewBuildStat = { k: string; n: number; nPp: number; medPrice: number; medPpsqm: number; minPpsqm: number; maxPpsqm: number; cheapest: number };
/** "about €1,111 per m²" in a project's description (src/data/top-<city>.json) -> 1111; nothing usable -> 0. */
export const projectPpsqm = (p: Project): number => { const m = /about €([\d,]+) per m²/.exec(String(p.blurb || "")); return m ? Number(m[1].replace(/,/g, "")) : 0; };
/** New-build rankings: median starting price and median price per m² of the projects of each destination. */
export function newBuildStats(lists: Record<string, Project[]>): NewBuildStat[] {
  return Object.entries(lists).map(([k, ps]) => {
    const priced = ps.filter((p) => Number(p.price_eur) > 0), pp = ps.map(projectPpsqm).filter((x) => x > 0);
    return { k, n: ps.length, nPp: pp.length, medPrice: median(priced.map((p) => Number(p.price_eur))), medPpsqm: pp.length >= MIN_STUDY ? median(pp) : 0, minPpsqm: pp.length ? Math.min(...pp) : 0, maxPpsqm: pp.length ? Math.max(...pp) : 0, cheapest: priced.length ? Math.min(...priced.map((p) => Number(p.price_eur))) : 0 };
  }).filter((x) => x.n >= MIN_STUDY).sort((a, b) => (a.medPpsqm || 1e9) - (b.medPpsqm || 1e9) || a.k.localeCompare(b.k));
}

export type SeriesPoint = { month: string; date: string; homes: number; countries: number; median_price_eur: number; median_eur_per_sqm: number; by_country: Record<string, { homes: number; median_price_eur: number }> };
/** This month's point of the price series: medians of the homes listed on the day of the build. */
export function seriesPoint(rows: Home[], today: string): SeriesPoint {
  const hs = rows.filter((r) => r.price_eur > 0), sized = hs.filter((h) => Number(h.sqm) > 0), cs = countryStats(hs);
  return { month: today.slice(0, 7), date: today, homes: hs.length, countries: cs.length, median_price_eur: median(hs.map((h) => h.price_eur)), median_eur_per_sqm: Math.round(median(sized.map((h) => h.price_eur / Number(h.sqm)))),
    by_country: Object.fromEntries(cs.filter((c) => !c.small).sort((a, b) => a.k.localeCompare(b.k)).map((c) => [c.k, { homes: c.n, median_price_eur: c.medPrice }])) };
}
/** Earlier points plus this month's (which replaces any point of the same month), oldest first. Bad rows are dropped. */
export function mergeSeries(point: SeriesPoint, ...earlier: unknown[]): SeriesPoint[] {
  const by = new Map<string, SeriesPoint>();
  for (const list of earlier) if (Array.isArray(list)) for (const p of list) if (p && /^\d{4}-\d{2}$/.test(String(p.month)) && Number(p.homes) > 0 && Number(p.median_price_eur) > 0 && p.month < point.month) by.set(p.month, p as SeriesPoint);
  by.set(point.month, point);
  return [...by.values()].sort((a, b) => a.month.localeCompare(b.month));
}
