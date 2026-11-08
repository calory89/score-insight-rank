// COMPARE logic (8-nov-2026): pure helpers for /compare?ids=a,b,c (2-4 homes), the compare tray and the saved
// page. Kept free of React so they are unit-tested in src/test/compare-logic.test.ts.
//  - parseIds(): clean, de-duplicated slugs from the URL, at most MAX_COMPARE
//  - bestIndexes(): which columns hold the best value of a row (ties all win, one known value wins nothing)
//  - yearBuilt(): a construction year stated in the listing text, if any
//  - savedPrices: the price a home had when it was saved on this device, to show the change since then
import { allIn, buyRule, redFlags, type CheckRow, type Group, type Light } from "./checkLogic";

export const MAX_COMPARE = 4;
export const COMPARE_KEY = "rh.compare.homes";

const SLUG = /^[a-z0-9][a-z0-9_-]{0,119}$/i;
/** "a,b,,a,<x>" -> ["a","b"]. Keeps order, drops junk, caps at MAX_COMPARE. */
export function parseIds(raw: string | null | undefined, max = MAX_COMPARE): string[] {
  const out: string[] = [];
  for (const part of String(raw || "").split(",")) {
    let s = part.trim();
    try { s = decodeURIComponent(s); } catch { /* keep as is */ }
    if (SLUG.test(s) && !out.includes(s)) out.push(s);
    if (out.length >= max) break;
  }
  return out;
}
export const compareHref = (ids: string[]) => `/compare?ids=${ids.map(encodeURIComponent).join(",")}`;
/** UUIDs belong to the older analysis comparison (src/pages/Compare.tsx), slugs to the homes comparison. */
export const isLegacyIds = (raw: string | null | undefined) => {
  const parts = String(raw || "").split(",").filter(Boolean);
  return parts.length > 0 && parts.every((p) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p.trim()));
};

export type Better = "min" | "max";
/** Indexes of the best values. Needs at least two known values that are not all equal. */
export function bestIndexes(values: (number | null | undefined)[], better: Better): number[] {
  const known = values.map((v, i) => [v, i] as const).filter(([v]) => v != null && Number.isFinite(v)) as [number, number][];
  if (known.length < 2) return [];
  const target = better === "min" ? Math.min(...known.map(([v]) => v)) : Math.max(...known.map(([v]) => v));
  if (known.every(([v]) => v === target)) return [];
  return known.filter(([v]) => v === target).map(([, i]) => i);
}

const YEAR = /\b(?:built|constructed|year built|construction year|construido|construida|construcci[oó]n|costruit[oa]|anno di costruzione|construit[e]?|baujahr|gebaut|bygget|byggår|bouwjaar)\D{0,14}?((?:18|19|20)\d{2})\b/i;
/** A construction year stated in the listing ("built in 1972", "Baujahr 1998"), or null. */
export function yearBuilt(d: { title?: string | null; why_great?: string | null; year_built?: number | null }): number | null {
  if (d.year_built && d.year_built > 1700) return d.year_built;
  const m = YEAR.exec(`${d.title || ""}. ${d.why_great || ""}`);
  if (!m) return null;
  const y = Number(m[1]);
  return y >= 1700 && y <= new Date().getFullYear() + 3 ? y : null;
}

const LIGHT_RANK: Record<Light, number> = { green: 2, amber: 1, red: 0 };
export type Place = { km: number; name?: string } | null;
export type CompareRow = CheckRow & {
  slug: string; id?: string; sqm?: number | null; bedrooms?: number | null; nota?: number | null; dims?: Record<string, number> | null;
  nearby?: any; image_urls?: string[] | null; year_built?: number | null; price_drop?: number | null;
};
const km = (v: any): Place => (v && Number.isFinite(Number(v.km)) ? { km: Number(v.km), name: v.name || v.code || undefined } : null);

/** Every number the comparison shows for one home, computed once. */
export function facts(d: CompareRow, g: Group) {
  const a = allIn(d);
  const n = d.nearby || {};
  const rule = buyRule(d.country, g);
  const flags = redFlags(d).filter((f) => f.id !== "hoa_unknown");
  return {
    price: a.price,
    perSqm: a.price && d.sqm ? Math.round(a.price / d.sqm) : null,
    allInLow: a.totalLow, allInHigh: a.totalHigh,
    monthly: a.monthly != null && a.monthly > 0 ? a.monthly : null,
    costPct: a.pct,
    sqm: d.sqm && d.sqm > 0 ? d.sqm : null,
    beds: d.bedrooms ?? null,
    score: d.nota ?? null,
    dims: d.dims || {},
    year: yearBuilt(d),
    sea: Number.isFinite(Number(n.sea_km)) && n.sea_km != null ? { km: Number(n.sea_km) } as Place : null,
    lake: km(n.lake), airport: km(n.airport), shop: km(n.shop), train: km(n.train), hospital: km(n.hospital),
    rule, ruleRank: rule ? LIGHT_RANK[rule.s] : null,
    flags, flagCount: flags.length,
  };
}
export type Facts = ReturnType<typeof facts>;

export { savedPrices, rememberSavedPrice, priceChange } from "./savedPrice";
