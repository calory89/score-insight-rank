// What a language has to be able to say for the listing pages (14-nov-2026). One file per language implements this
// (pack.en.ts, pack.es.ts, pack.de.ts, pack.ru.ts); seo/listings/compose.ts decides which sentences a page gets.
// A sentence only exists to carry a number or a fact of that page: there is no slot for filler.
import type { Facts, Ref, Noun } from "./facts";
import type { Home } from "./facets";

export type Lang = "en" | "es" | "de" | "ru" | "fr" | "nl" | "pl";
export type Beds = [number, number][];
export type Named = { name: string; n: number };
export type Form = "many" | "one" | "cheap" | "cheapest";

export type Pack = {
  lang: Lang;
  money(n: number): string;
  perSqm(n: number): string;
  /** A date inside a sentence ("13 November 2026") and in a table cell ("13 Nov 2026"). */
  date(day: string): string;
  dateShort(day: string): string;
  country(en: string): string;
  /** "in the Netherlands", "en los Países Bajos", "in den Niederlanden", "в Болгарии" */
  inC(en: string): string;
  /** A region or town name as this language writes it; null when the language has no vetted name for it. */
  place(name: string, cc?: string, where?: "card"): string | null;
  /** Title and one-line reason of a home in this language; null when there is none (the page is then not published). */
  homeTitle(h: Home): string | null;
  homeWhy(h: Home): string;
  // ---- names of the page
  h1(F: Facts): string;
  /** The same thing as a lower-case phrase inside a sentence, in four forms: "homes for sale in Italy under
   * €80,000" (many), "home for sale in Italy under €80,000" (one), "cheap homes for sale..." (cheap) and "cheapest
   * home for sale..." (cheapest). The pack places the adjective where its language wants it. */
  what(F: Facts, form?: Form): string;
  title(h1: string, n: number, min: string): string;
  desc(F: Facts, what: string): string;
  crumbRoot: string; crumbCheap: string;
  crumbCountry(c: string): string;
  /** Short label of this page among its siblings: "Under €80,000", "Tuscany", "By the sea", "2 bedrooms". */
  label(F: Pick<Facts["f"], "kind" | "cap" | "region" | "town" | "key" | "beds" | "country" | "cc" | "ccy" | "area" | "city">): string;
  // ---- families of 15-nov-2026 (traits, ranked lists, budgets in pounds and dollars, areas, near a city)
  /** An amount in pounds or dollars: "£50,000". */
  ccy(n: number, ccy: string): string;
  /** The name of a city of places.CITIES in this language. */
  city(slug: string): string;
  /** One or two sentences on how a home gets on this list and what that does not prove; "" for the families whose
   * name says it all. `v` carries what the sentence needs (already in this language). */
  how(F: Facts, v: { regions: string; total: number; parent: string; cap: string; eur: string; rate: string; date: string }): string;
  /** First sentence of a ranked list ("The 20 cheapest ... cost from X to Y"). */
  l1rank(what: string, min: string, max: string): string;
  gridTitleRank(key: string, n: number): string;
  x: {
    amen(list: [string, number][]): string;
    /** `name`/`list` are the airports' English names, `code`/`codes` their IATA codes (for the languages that would otherwise print English). */
    airport(med: number, title: string, km: number, name: string, list: Named[], code: string, codes: Named[]): string;
    sea(n: number, med: number, title: string, m: number): string;
    plot(med: number, title: string, m2: number): string;
    ppsqm(title: string, low: string, high: string): string;
    score(n: number, pct: number, parent: string, n95: number): string;
    fee(n: number, min: string, max: string, yearMin: string, yearMax: string): string;
    drop(title: string, pct: number, amount: string, med: number): string;
    days(med: number, title: string, v: number): string;
    elev(n: number, med: number, title: string, v: number): string;
    islands(list: Named[]): string;
    dist(city: string, med: number, title: string, km: number, far: number): string;
    rank(key: string, n: number, title: string, v: string, of: number): string;
    vs(other: string, med: string, n: number, oMed: string, on: number, pct: number): string;
  };
  /** The note blocks with a source (seo/listings/notes.ts). */
  noteSource: string; noteAsOf(asOf: string): string;
  season: { title: string; winter: string; summer: string };
  // ---- top of the page
  updated(date: string, newest: string | null): string;
  l1(n: number, what: string, min: string, max: string): string;
  l2(title: string, town: string, price: string, sqm: number, beds: number): string;
  l3(med: string, ppsqm: string, pMed: string, pPpsqm: string, parent: string): string;
  l3all(med: string, ppsqm: string, max: string, parent: string): string;
  parent(kind: "site" | "country" | "region", n: number, name: string, countries: number): string;
  kpi: { homes: string; from: string; median: string; ppsqm: string; size: string; score: string };
  // ---- the homes
  gridTitle(n: number, shown: number): string;
  gridMore(shown: number, n: number): string;
  card: { isNew: string; drop(pct: number): string; score: string; beds(n: number): string; noPhoto: string; /** "12 days on RealHunt" (idea 22) */ days(n: number): string };
  tableTitle(n: number, shown: number): string;
  th: { home: string; place: string; price: string; size: string; ppsqm: string; beds: string; score: string; added: string };
  // ---- facts
  factsTitle(F: Facts): string;
  fSize(med: number, max: number, title: string): string;
  fBeds(b: Beds, unknown: number): string;
  fType(apartments: number, houses: number): string;
  fSetting(sea: number, village: number, town: number): string;
  fWhere(list: Named[]): string;
  fTowns(list: Named[]): string;
  fCountries(list: Named[], more: number): string;
  fStep(from: string, to: string, n: number, title: string, nota: number, price: string): string;
  fNext(next: string, add: number): string;
  fRegions(low: Named & { median: string }, high: Named & { median: string }): string;
  fScore(min: number, max: number, title: string): string;
  fNew(n30: number, title: string, date: string): string;
  // ---- costs
  costsTitle(inC: string): string;
  cForeign(text: string): string;
  cCosts(pct: string, breakdown: string, med: string, lo: string, hi: string, totalLo: string, totalHi: string): string;
  cAllIn(cap: string, maxAsk: string, fit: number, n: number): string;
  cTax(text: string): string;
  /** The same percentage worked out on three round prices (country pages). */
  cExamples(rows: [price: string, lo: string, hi: string][]): string;
  /** The box above the homes in countries where not everybody can buy freely (src/data/buyrules.json). */
  firstTitle: string;
  cNote(asOf: string): string;
  cLinks: { calc(inC: string): string; detail: string; guide: string; nat: string };
  costTableTitle: string; costTh: { country: string; homes: string; from: string; costs: string };
  // ---- what to watch out for
  watchTitle: string;
  wNoSqm(k: number, n: number): string;
  wHoa(k: number, min: string, max: string): string;
  wHoaUnknown(k: number): string;
  wWhyCheap(title: string, text: string): string;
  wFlood(k: number, n: number): string;
  wNoise(k: number, n: number): string;
  wOld(k: number, n: number): string;
  wSold(k: number): string;
  wApprox(k: number, n: number): string;
  wDims(weak: string, weakAvg: number, strong: string, strongAvg: number): string;
  wRental(text: string): string;
  dim(key: string): string;
  // ---- questions
  faqTitle: string;
  qCheapest(cheapest: string): string; aCheapest(title: string, town: string, price: string, sqm: number, beds: number, nota: number): string;
  qCount(what: string): string; aCount(n: number, date: string, parent: string, new30: number): string;
  qSize(what: string): string; aSize(med: number, beds: number, max: number, town: string): string;
  qAllIn(cap: string, inC: string): string; aAllIn(cap: string, pct: string, lo: string, hi: string, maxAsk: string, fit: number): string;
  qWhere(what: string): string; aWhere(list: Named[]): string;
  qPrice(one: string): string; aPrice(min: string, med: string, ppsqm: string, max: string, n: number): string;
  qForeign(inC: string): string;
  qCosts(inC: string): string; aCosts(pct: string, breakdown: string, med: string, lo: string, hi: string): string;
  qRegion(inC: string): string; aRegion(low: Named & { median: string }, high: Named & { median: string }): string;
  qVs(place: string, wider: string): string; aVs(place: string, wider: string, med: string, pMed: string, pct: number, n: number, pn: number): string;
  qCountries(what: string): string; aCountries(list: Named[]): string;
  // ---- other searches
  moreTitle(F: Facts): string;
  more: { budget: string; region: string; setting: string; type: string; beds: string; feature: string; town: string; elsewhere(label: string): string; countries: string; all: string;
    area: string; combo: string; ccy: string; near: string; ranked: string };
  allIn(inC: string, n: number): string;
  // ---- foot
  sources(list: [string, number][]): string;
  notAgent: string;
  alert(inC: string): string;
  filter: string;
  method: string;
  /** Text of the page that redirects from an older address. */
  moved: string;
};

export type { Facts, Ref, Noun, Home };
