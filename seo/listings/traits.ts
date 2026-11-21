// What a home is, read from its data and, only where the listing says it in so many words, from its English title
// and description (15-nov-2026). Used by seo/listings/facets.ts to decide which homes a page lists.
//
// The rule for text: a home gets a trait only when the words state it ("on a 1,424 m² plot", "single-storey",
// "ready to move in"). Nothing is guessed from the kind of home, the country or the photos, and a home whose text
// is silent is simply not on that list. src/test/listings-traits.test.ts holds the cases.
import { islandOf } from "./places";
import { perSqm } from "../../src/community/sqmLogic";

export type Home = Record<string, any>;
const title = (r: Home) => String(r.title || "");
const body = (r: Home) => `${r.title || ""}. ${r.why_great || ""}`;
const amen = (r: Home, a: string) => Array.isArray(r.amen) && r.amen.includes(a);
const num = (s: string) => Number(s.replace(/[,\s]/g, ""));

// ---------------------------------------------------------------- bedrooms and kind of home, when the row lacks them
const WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };
/** Bedrooms: the listing's own field, else the number its text states ("three-bedroom", "2-bed", "3 bedrooms").
 * 0 when the text gives no number or gives two different ones. A studio has no bedroom and stays 0. */
export function bedsOf(r: Home): number {
  const b = Number(r.bedrooms); if (b > 0) return b;
  const found = new Set<number>();
  for (const m of body(r).matchAll(/\b(\d{1,2}|one|two|three|four|five|six)[- ](?:double |large |small |good |bright )?bed(?:room)?s?\b/gi)) {
    const n = WORDS[m[1].toLowerCase()] ?? Number(m[1]); if (n > 0 && n < 15) found.add(n);
  }
  return found.size === 1 ? [...found][0] : 0;
}

const APT = /\b(flat|apartment|studio|condo|penthouse|duplex|loft|maisonette)s?\b/i;
const HOUSE = /\b(house|villa|cottage|cabin|farmhouse|townhouse|bungalow|chalet|cortijo|finca|farm|mill|trullo|masseria|barn|lodge|long[èe]re|stazzo|a-frame|ranch|cape cod)s?\b/i;
/** Apartment or house: from the title; when the title names neither, from the first sentence of the description
 * (the one that says what is for sale) if it names only one of the two. */
export function ptypeOf(r: Home): "apartment" | "house" | "" {
  const t = title(r);
  const a = APT.exec(t), h = HOUSE.exec(t);
  if (a && (!h || a.index < h.index)) return "apartment";
  if (h) return "house";
  const d = String(r.why_great || "").split(/(?<=[.!?])\s/)[0];
  // "47 m² on the 3rd floor of a revitalised townhouse" is a flat, whatever the building is called
  const floor = /\bon the (?:ground|\d+(?:st|nd|rd|th)|first|second|third|fourth|fifth|top) floor\b/i.test(d);
  const da = APT.test(d), dh = HOUSE.test(d) && !floor;
  return da && !dh ? "apartment" : dh && !da ? "house" : "";
}

// ---------------------------------------------------------------- figures stated in the text
/** Plot size in m² when the text states it: "on a 1,424 m² plot", "2,850 m² of land", "2.5 acres", "1.2 hectares". */
export function plotOf(r: Home): number {
  const t = body(r); let best = 0;
  for (const m of t.matchAll(/(\d[\d,]*(?:\.\d+)?)\s?(?:m²|m2|sqm|square met(?:re|er)s)\s+(?:of\s+)?(?:fenced |private |walled |own |flat |enclosed |wooded |landscaped )?(plot|land|grounds|garden|nature|olive grove|orchard|woodland|forest|meadow|pasture)/gi)) best = Math.max(best, num(m[1]));
  for (const m of t.matchAll(/\b(?:plot|land|grounds|garden) of (\d[\d,]*(?:\.\d+)?)\s?(?:m²|m2|sqm)/gi)) best = Math.max(best, num(m[1]));
  for (const m of t.matchAll(/(\d[\d,]*(?:\.\d+)?)[- ]?(?:hectares?|ha)\b/gi)) best = Math.max(best, num(m[1]) * 10000);
  for (const m of t.matchAll(/(\d[\d,]*(?:\.\d+)?)[- ]?acres?\b/gi)) best = Math.max(best, num(m[1]) * 4047);
  return Math.round(best);
}
/** Price per m² of living area only (idea 74, src/community/sqmLogic.ts): 0 when the size looks like a plot. */
export const ppsqm = (r: Home) => perSqm(r);
/** Metres to the sea when it was measured. */
export const seaM = (r: Home): number | null => (typeof r.nearby?.sea_km === "number" ? Math.round(r.nearby.sea_km * 1000) : null);
export const airportKm = (r: Home): number | null => (typeof r.nearby?.airport?.km === "number" ? r.nearby.airport.km : null);
export const goodDays = (r: Home): number | null => (typeof r.nearby?.good_days === "number" ? r.nearby.good_days : null);
export const elevation = (r: Home): number | null => (typeof r.risks?.flood?.elev_m === "number" ? r.risks.flood.elev_m : null);
export const dropPct = (r: Home) => (Number(r.price_drop) > 0 && r.price_eur > 0 ? Math.round((Number(r.price_drop) / (r.price_eur + Number(r.price_drop))) * 100) : 0);
/** The monthly community fee when the listing states it in euros, dollars or pounds. */
export const feeOf = (r: Home): { amount: number; ccy: string } | null => {
  const a = Number(r.hoa_monthly), c = String(r.hoa_currency || "EUR").toUpperCase();
  return a > 0 && ["EUR", "USD", "GBP"].includes(c) ? { amount: a, ccy: c } : null;
};
export const dayOfHome = (r: Home) => [r?.verified_at, r?.approved_at, r?.publish_at].map((s) => (s && /^\d{4}-\d{2}-\d{2}/.test(s) ? String(s).slice(0, 10) : null)).filter(Boolean).sort().pop() || null;

// ---------------------------------------------------------------- the traits
export const PLOT_MIN = 1000, BEACH_M = 500, AIRPORT_KM = 30, PPSQM_MAX = 500, SCORE_MIN = 90, FEE_MAX = 250, BIG_SQM = 100, BIG_CAP = 50000, GOOD_DAYS = 150, NEW_DAYS = 30, NEW_WEEK = 7, RANK_N = 20;

const NEEDS_WORK = /\b(needs? (?:some |a |full |complete |total |light |cosmetic )?(?:renovat\w+|refurbish\w+|restor\w+|modernis\w+|moderniz\w+|updating|work|tlc)|to renovate|to restore|to be renovated|for renovation|renovation project|restoration project|fixer[- ]upper|unfinished|shell condition)\b/i;
const READY = /\b(move[- ]in[- ]ready|ready to move in(?:to)?|ready to live in|turn[- ]?key|fully renovated|completely renovated|totally renovated|newly renovated|recently renovated|just[- ]renovated|renovated in (?:19|20)\d\d|fully remodelled|fully refurbished)\b/i;
const TREES = /\b(olive (?:trees?|grove)|olives|vines|vineyard|orchard|fruit trees?|almond trees?|citrus trees?|lemon trees?|orange trees?|fig trees?)\b/i;
const SEA_VIEW = /\b(sea[- ]views?|ocean[- ]views?|views? (?:of|over|to|across|onto|out to|out over) the (?:sea|ocean|mediterranean|bay|atlantic|adriatic|aegean|ionian|baltic|black sea|pacific|caribbean)|sea glimpse|looking (?:out )?over the (?:sea|ocean|bay))\b/i;
const MOUNTAIN = /\b(in the mountains|mountain (?:village|house|home|chalet|cabin|hamlet|town|air|setting|retreat)|mountain[- ]views?|views? (?:of|over|to|across) the (?:mountains?|sierra|alps|pyrenees|peaks)|ski (?:resort|lift|slopes?|area)|skiing|alpine|pyrenees|sierra nevada|dolomites)\b/i;
const PERIOD = /\b((?:1[0-9]|20)th[- ]century|built in 1[0-8]\d\d|from 1[0-8]\d\d|dating from|period (?:features?|building|property|house)|original (?:beams|floors?|tiles|features|fireplace|woodwork|shutters)|exposed beams|wooden beams|vaulted|art nouveau|half[- ]timbered|thatched|historic (?:centre|center|house|building|home|village house)|listed building)\b/i;
const ONE_FLOOR = /\b(single[- ]stor(?:e)?y|one[- ]stor(?:e)?y|bungalow|all on one (?:floor|level)|on one level|single[- ]level|on a single floor|no stairs)\b/i;
const FIBRE = /\b(fibre|fiber)(?:[- ]optic)?\b(?! cement)|\bhigh[- ]speed (?:internet|broadband)\b/i;
const TOURIST = /\b(tourist (?:rental )?licen[cs]e|holiday[- ](?:let|rental) licen[cs]e|licen[cs]ed for (?:holiday|tourist) (?:lets?|rentals?)|vivienda tur[ií]stica)\b/i;
const CAVE = /\bcave (?:house|home|dwelling)s?\b/i;
const TRULLO = /\btrull[oi]\b/i;
const UNUSUAL = /\b(castle|ch[âa]teau|manor(?: house)?|water ?mill|windmill|former (?:mill|church|chapel|school|station|presbytery|convent|monastery|inn|post office|bakery|forge|dairy)|converted (?:mill|church|chapel|school|station|barn)|tower house|lighthouse|palazzo|presbytery)\b/i;

const BUSINESS = /\b(?:with|and|plus) (?:a |an |its own )?(?:former |old |ground[- ]floor )?(?:shop|bar|restaurant|caf[ée]|bakery|B&B|bed and breakfast|hostel|commercial (?:unit|premises|space)|business premises)\b/i;

export type Trait = {
  key: string;
  test: (r: Home, ctx: { today: string }) => boolean;
  min?: number;
  /** A page for all countries too (default true). */
  global?: boolean;
  /** Ranked lists keep only the first RANK_N homes of this order. */
  rank?: (a: Home, b: Home) => number;
  /** Ranked lists: how many homes (default RANK_N). */
  n?: number;
  /** Only in the countries with most homes (the N first): a weekly list of a country with two new homes a month is empty most weeks. */
  top?: number;
};
const days = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
const quiet = (r: Home) => { const n = r.risks?.noise; return !!n && n.level === "low" && n.roads_checked === true && n.rail_m == null && n.motorway_m == null; };

/** New families of 15-nov-2026, in order of search demand (earlier ones win when two would list the same homes). */
export const TRAITS: Trait[] = [
  { key: "turnkey", test: (r) => READY.test(body(r)) && !NEEDS_WORK.test(body(r)) },
  { key: "to-renovate", test: (r) => NEEDS_WORK.test(body(r)) },
  { key: "with-sea-view", test: (r) => SEA_VIEW.test(body(r)) },
  { key: "near-the-beach", test: (r) => { const m = seaM(r); return m != null && m <= BEACH_M; } },
  { key: "with-land", test: (r) => plotOf(r) >= PLOT_MIN },
  { key: "with-fireplace", test: (r) => amen(r, "fireplace") },
  { key: "with-garage", test: (r) => amen(r, "garage") },
  { key: "on-an-island", test: (r) => !!islandOf(r) && String(r.country) !== "Cyprus" },
  { key: "in-the-mountains", test: (r) => MOUNTAIN.test(body(r)) },
  { key: "with-olive-trees-or-vines", test: (r) => TREES.test(body(r)) },
  { key: "near-an-airport", test: (r) => { const k = airportKm(r); return k != null && k <= AIRPORT_KM; } },
  { key: "under-500-per-sqm", test: (r) => ppsqm(r) > 0 && ppsqm(r) < PPSQM_MAX },
  { key: "over-100-sqm-under-50000", test: (r) => Number(r.sqm) >= BIG_SQM && r.price_eur <= BIG_CAP },
  { key: "score-90-plus", test: (r) => Number(r.nota) >= SCORE_MIN },
  { key: "editors-picks", test: (r) => r.is_editorial_pick === true },
  { key: "new-this-month", test: (r, c) => { const d = dayOfHome(r); return !!d && days(d, c.today) <= NEW_DAYS && days(d, c.today) >= 0; } },
  // 20-nov-2026: the week, in the countries with most homes (idea 32)
  { key: "new-this-week", test: (r, c) => { const d = dayOfHome(r); return !!d && days(d, c.today) <= NEW_WEEK && days(d, c.today) >= 0; }, top: 12 },
  { key: "price-drops", test: (r) => dropPct(r) >= 1 },
  { key: "single-storey", test: (r) => ONE_FLOOR.test(body(r)) },
  { key: "with-period-features", test: (r) => PERIOD.test(body(r)) },
  { key: "good-weather", test: (r) => (goodDays(r) ?? 0) >= GOOD_DAYS },
  { key: "quiet-location", test: quiet },
  { key: "low-community-fee", test: (r) => { const f = feeOf(r); return !!f && f.amount <= FEE_MAX; } },
  { key: "cave-houses", test: (r) => CAVE.test(body(r)) },
  { key: "trulli", test: (r) => TRULLO.test(body(r)) },
  { key: "unusual-buildings", test: (r) => UNUSUAL.test(title(r)) },
  { key: "with-business-premises", test: (r) => BUSINESS.test(title(r)) },
  { key: "with-fibre-internet", test: (r) => FIBRE.test(body(r)) },
  { key: "with-tourist-licence", test: (r) => TOURIST.test(body(r)) },
  // 20-nov-2026: floor area stated in the listing (idea 38; bathrooms are not in the data yet)
  { key: "over-80-sqm", test: (r) => Number(r.sqm) > 80 },
  { key: "over-120-sqm", test: (r) => Number(r.sqm) > 120 },
  // ranked lists: the first RANK_N of an order
  { key: "cheapest", test: () => true, rank: (a, b) => a.price_eur - b.price_eur || String(a.slug).localeCompare(String(b.slug)) },
  { key: "most-space-for-the-money", test: (r) => ppsqm(r) > 0, rank: (a, b) => ppsqm(a) - ppsqm(b) || String(a.slug).localeCompare(String(b.slug)) },
  // 20-nov-2026: the ten best scores of a country, each card with the reason it scores (idea 33). English and Spanish only (seo/langs/config.ts).
  { key: "best-rated", test: (r) => Number(r.nota) > 0, n: 10, rank: (a, b) => (Number(b.nota) || 0) - (Number(a.nota) || 0) || (a.rank ?? 1e9) - (b.rank ?? 1e9) || String(a.slug).localeCompare(String(b.slug)) },
];
export const TRAIT_KEYS = new Set(TRAITS.map((t) => t.key));
export const isRanked = (key?: string) => !!key && TRAITS.some((t) => t.key === key && t.rank);

/** Trait + budget (+ country): only these pairs, and only the COMBO_MAX with most homes. */
export const COMBOS: [key: string, cap: number, global?: true][] = [
  ["with-pool", 100000, true], ["with-sea-view", 100000, true], ["with-sea-view", 50000, true], ["apartments", 20000, true], ["apartments", 10000, true],
  ["by-the-sea", 50000], ["by-the-sea", 100000], ["with-pool", 100000], ["with-sea-view", 100000], ["with-sea-view", 50000], ["with-sea-view", 150000], ["with-sea-view", 200000], ["stone-houses", 50000], ["stone-houses", 100000],
  ["village-houses", 30000], ["village-houses", 50000], ["apartments", 50000], ["apartments", 100000], ["houses", 50000], ["houses", 100000],
  ["with-garden", 50000], ["with-garden", 100000], ["turnkey", 50000], ["turnkey", 100000], ["village-houses", 15000], ["apartments", 20000], ["apartments", 10000],
];
export const COMBO_MAX = 50;

/** Budgets in the currency of the searcher: [code, slug word, caps]. Converted with the dated rate in seo/listings/fx.json. */
export const CCY_BANDS: [ccy: "GBP" | "USD", word: string, caps: number[]][] = [["GBP", "pounds", [50000, 100000]], ["USD", "dollars", [50000, 100000]]];

/** Seasonal picks for the hub: each season's families go up two months before it starts and stay until it ends
 * (winter Dec-Feb is shown Oct-Feb, summer Jun-Aug is shown Apr-Aug; March and September show none). */
export function season(month: number): { name: "winter" | "summer"; keys: string[] } | null {
  if (month >= 10 || month <= 2) return { name: "winter", keys: ["with-fireplace", "with-sauna", "in-the-mountains", "cabins-and-cottages"] };
  if (month >= 4 && month <= 8) return { name: "summer", keys: ["by-the-sea", "near-the-beach", "with-sea-view", "with-pool", "on-an-island"] };
  return null;
}
