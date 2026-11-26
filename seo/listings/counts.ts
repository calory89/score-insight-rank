// The one count of the whole site (26-nov-2026, list 1000, idea 52). llms.txt and the home page say "N homes in C
// countries" from seo/prerender.ts: every home of the snapshot, and the countries with at least 3 of them (a few
// imports tagged with a region instead of a country, "Scandinavia", are not a country). The listing pages said
// "654 homes in 30 countries" from their own rule (homes still for sale, every country). They now say the same as
// the rest of the site, and src/test/listings-t2.test.ts compares the three.
import { median } from "./facts";
import { ppsqm } from "./traits";

/** Same as MIN_LIST in seo/prerender.ts. */
export const COUNT_MIN = 3;
const NOT_COUNTRY = new Set(["scandinavia"]);
const slug = (c: unknown) => String(c || "").toLowerCase().trim().replace(/\s+/g, "-");

export type SiteCounts = { homes: number; countries: number; median: number; ppsqm: number };
/** `rows`: the snapshot as it is (public/data/rh-static.json rows), not only the homes listed on listing pages. */
export function siteCounts(rows: Record<string, any>[]): SiteCounts {
  const all = rows.filter((r) => r?.slug);
  const per = new Map<string, number>();
  for (const r of all) { const k = slug(r.country); if (k) per.set(k, (per.get(k) || 0) + 1); }
  const countries = [...per.entries()].filter(([k, n]) => !NOT_COUNTRY.has(k) && n >= COUNT_MIN).length;
  const pp = all.map(ppsqm).filter((x) => x > 0);
  return { homes: all.length, countries, median: median(all.map((r) => Number(r.price_eur) || 0)), ppsqm: pp.length >= 3 ? Math.round(median(pp)) : 0 };
}
