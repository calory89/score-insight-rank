// Price per m² only when the size is a living area (21-nov-2026, list 2 idea 74). Some adverts give the plot instead
// of the house ("1,200 m² plot"), and a price per m² of land next to houses priced per m² of floor misleads. A size is
// kept for €/m² when it is under 1,000 m² and the advert's own text does not call that same figure a plot or land.
// Pure, tested in src/test/sqm-logic.test.ts. Used by the key facts row, the price block, the answer paragraph,
// the article of each home page, the country medians and the listing pages (seo/listings/traits.ts ppsqm).
type R = { sqm?: number | string | null; price_eur?: number | string | null; title?: string | null; why_great?: string | null; why_cheap?: string | null; costs_note?: string | null };

/** Above this, a "size" is nearly always land or a whole building, not a home's floor area. */
export const LIVING_MAX = 1000;
const UNIT = "(?:m²|m2|sqm|sq\\.? ?m|square met(?:re|er)s?)";
const LAND = "(?:plot|land|lot|parcel|grounds|garden plot|terrain|estate)";
const num = (s: string) => Number(s.replace(/[,.](?=\d{3}\b)/g, "").replace(",", "."));

/** True when the text calls this exact number of m² a plot: "1,200 m² plot", "a plot of 850 m²", "land: 900 m²". */
export function sqmIsPlot(sqm: number, text: string): boolean {
  if (!(sqm > 0) || !text) return false;
  const after = new RegExp(`(\\d[\\d,.]*)\\s?${UNIT}\\s+(?:of\\s+)?(?:fenced |private |walled |own |flat |enclosed |wooded |building )?${LAND}\\b`, "gi");
  const before = new RegExp(`\\b${LAND}(?:\\s+size)?(?:\\s+of|:)?\\s+(?:about |around |approx\\.? |nearly )?(\\d[\\d,.]*)\\s?${UNIT}`, "gi");
  for (const re of [after, before]) for (const m of text.matchAll(re)) if (Math.round(num(m[1])) === Math.round(sqm)) return true;
  return false;
}

/** The size to use for a price per m², or null when it does not look like a living area. */
export function livingSqm(d: R): number | null {
  const s = Number(d.sqm);
  if (!(s > 0) || s >= LIVING_MAX) return null;
  const text = [d.title, d.why_great, d.why_cheap].filter(Boolean).join(" ");
  return sqmIsPlot(s, text) ? null : s;
}

/** Price per m² of living area, or 0 when there is no reliable size. */
export function perSqm(d: R): number {
  const s = livingSqm(d); const p = Number(d.price_eur);
  return s && p > 0 ? p / s : 0;
}
