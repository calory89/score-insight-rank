// Pure helpers for realhunt-live-search (8-nov-2026). No imports and no Deno or browser globals, so the edge
// function (Deno) and the unit tests (vitest, src/test/livesearch-core.test.ts) load the very same file.
//   parseLiveQuery   what a sentence asks for (buy or rent, place, bedrooms, budget), or why it is not a home search
//   liveKey          one key per search meaning, used for the 24 h cache ("3 bed house Miami under $300k" = "casas en Miami...")
//   cbSearchUrls / parseCbMatch / pickCb   the free Coldwell Banker fallback for US cities
//   liveScore        the provisional "AI estimate" score 0-100 (formula documented below)
//   parseClaudeListings   defensive reading of Claude's JSON answer; drops any URL that did not come from a search result

// ---------------------------------------------------------------- money
/** Rough rates to euros, only to compare and to show an approximate € price next to the original one. */
export const FX_TO_EUR: Record<string, number> = {
  EUR: 1, USD: 0.896, GBP: 1.17, CHF: 1.06, SEK: 0.087, DKK: 0.134, NOK: 0.085, PLN: 0.23, CZK: 0.04, HUF: 0.0025, RON: 0.2,
  MXN: 0.048, CAD: 0.65, AUD: 0.59, NZD: 0.54, JPY: 0.0059, THB: 0.026, IDR: 0.000056, BRL: 0.16, ARS: 0.0009, COP: 0.00022,
  TRY: 0.026, AED: 0.244, ZAR: 0.05, MAD: 0.092, CRC: 0.0018, DOP: 0.015, BGN: 0.51, ISK: 0.0066,
};
export function toEur(amount: number | null | undefined, currency: string | null | undefined): number | null {
  if (amount == null || !Number.isFinite(amount) || amount <= 0) return null;
  const r = FX_TO_EUR[String(currency || "EUR").toUpperCase()];
  return r ? Math.round(amount * r) : null;
}

const norm = (s: string) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// ---------------------------------------------------------------- places
const COUNTRIES: Record<string, string[]> = {
  "United States": ["united states", "usa", "us", "u.s.", "america", "estados unidos", "eeuu", "ee.uu."], Spain: ["spain", "espana"],
  Italy: ["italy", "italia"], France: ["france", "francia"], Portugal: ["portugal"], Germany: ["germany", "alemania"], Greece: ["greece", "grecia"],
  "United Kingdom": ["united kingdom", "uk", "england", "reino unido", "inglaterra"], Mexico: ["mexico"], Canada: ["canada"], Denmark: ["denmark", "dinamarca"],
  Sweden: ["sweden", "suecia"], Norway: ["norway", "noruega"], Poland: ["poland", "polonia"], Netherlands: ["netherlands", "holland", "holanda", "paises bajos"],
  Croatia: ["croatia", "croacia"], Cyprus: ["cyprus", "chipre"], Japan: ["japan", "japon"], Thailand: ["thailand", "tailandia"], Indonesia: ["indonesia"],
  "Costa Rica": ["costa rica"], Panama: ["panama"], "Dominican Republic": ["dominican republic", "republica dominicana"], Brazil: ["brazil", "brasil"],
  Argentina: ["argentina"], Colombia: ["colombia"], Turkey: ["turkey", "turquia"], Morocco: ["morocco", "marruecos"], Bulgaria: ["bulgaria"], Malta: ["malta"],
  Ireland: ["ireland", "irlanda"], Switzerland: ["switzerland", "suiza"], Austria: ["austria"], Belgium: ["belgium", "belgica"], Finland: ["finland", "finlandia"],
  Hungary: ["hungary", "hungria"], Romania: ["romania", "rumania"], Albania: ["albania"], Montenegro: ["montenegro"], Slovenia: ["slovenia", "eslovenia"],
};
const COUNTRY_ALIAS = new Map<string, string>();
for (const [en, list] of Object.entries(COUNTRIES)) for (const a of list) COUNTRY_ALIAS.set(a, en);
const COUNTRY_CURRENCY: Record<string, string> = { "United States": "USD", "United Kingdom": "GBP", Mexico: "MXN", Canada: "CAD", Denmark: "DKK", Sweden: "SEK", Norway: "NOK", Poland: "PLN", Japan: "JPY", Thailand: "THB", Switzerland: "CHF", Turkey: "TRY" };

export const US_STATES: Record<string, string> = {
  al: "alabama", az: "arizona", ar: "arkansas", ca: "california", co: "colorado", ct: "connecticut", de: "delaware", fl: "florida", ga: "georgia",
  hi: "hawaii", id: "idaho", il: "illinois", in: "indiana", ia: "iowa", ks: "kansas", ky: "kentucky", la: "louisiana", me: "maine", md: "maryland",
  ma: "massachusetts", mi: "michigan", mn: "minnesota", ms: "mississippi", mo: "missouri", mt: "montana", ne: "nebraska", nv: "nevada", nh: "new hampshire",
  nj: "new jersey", nm: "new mexico", ny: "new york", nc: "north carolina", nd: "north dakota", oh: "ohio", ok: "oklahoma", or: "oregon", pa: "pennsylvania",
  ri: "rhode island", sc: "south carolina", sd: "south dakota", tn: "tennessee", tx: "texas", ut: "utah", vt: "vermont", va: "virginia", wa: "washington",
  wv: "west virginia", wi: "wisconsin", wy: "wyoming", dc: "district of columbia",
};
const STATE_BY_NAME = new Map(Object.entries(US_STATES).map(([k, v]) => [v, k]));
/** US cities the free fallback knows, with their state. Florida first: most foreign buyers on RealHunt look there. */
const US_CITY_LIST = (
  "fl:miami,miami beach,boca raton,fort lauderdale,hollywood,orlando,tampa,naples,sarasota,west palm beach,palm beach,delray beach,boynton beach,pompano beach," +
  "coral springs,coral gables,doral,aventura,sunny isles beach,hallandale beach,kendall,homestead,miramar,pembroke pines,plantation,davie,weston,jupiter," +
  "fort myers,cape coral,clearwater,st petersburg,jacksonville,daytona beach,kissimmee,port st lucie,melbourne,tallahassee,gainesville,pensacola,key west," +
  "destin,ocala,lakeland,bradenton,venice,north miami,north miami beach,miami gardens,hialeah,deerfield beach,lauderdale lakes,sunrise,tamarac,palm bay|" +
  "ny:new york,brooklyn,queens,bronx,staten island,buffalo,rochester,albany|ca:los angeles,san diego,san francisco,san jose,sacramento,oakland,long beach,fresno," +
  "palm springs,santa monica,irvine,anaheim,santa barbara|tx:houston,dallas,austin,san antonio,fort worth,el paso,plano|az:phoenix,scottsdale,tucson,mesa|" +
  "nv:las vegas,henderson,reno|ga:atlanta,savannah|nc:charlotte,raleigh,asheville,wilmington|sc:charleston,myrtle beach,hilton head island|tn:nashville,memphis,knoxville|" +
  "il:chicago|ma:boston|pa:philadelphia,pittsburgh|wa:seattle,spokane|or:portland|co:denver,colorado springs,boulder|ut:salt lake city,park city|" +
  "mn:minneapolis|mi:detroit|oh:columbus,cleveland,cincinnati|mo:kansas city,st louis|la:new orleans|md:baltimore|dc:washington|hi:honolulu|nm:santa fe,albuquerque|" +
  "nj:jersey city,newark|va:virginia beach,richmond|ky:louisville|wi:milwaukee|in:indianapolis|al:birmingham|ok:oklahoma city"
).split("|").flatMap((g) => { const [st, list] = g.split(":"); return list.split(",").map((c) => [c, st] as const); });
const US_CITIES = new Map<string, string>(US_CITY_LIST);
export const citySlug = (c: string) => norm(c).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const title = (s: string) => s.replace(/\b[a-z]/g, (c) => c.toUpperCase());

// ---------------------------------------------------------------- the parser
export type LiveQuery = {
  ok: boolean;
  /** why it was refused: "empty", "too_long", "not_homes" */
  reason?: string;
  kind: "buy" | "rent";
  place: string | null;
  city: string | null;
  /** two-letter US state when the place is a known US city or "City, ST" */
  state: string | null;
  country: string | null;
  min_beds: number | null;
  max_price: number | null;
  min_price: number | null;
  /** the currency the person typed the budget in (or the country's) */
  currency: string;
  max_eur: number | null;
  min_eur: number | null;
  ptype: "house" | "apartment" | "any";
  good_score: boolean;
};

const NUMW: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6 };
const BED_RE = /\b(\d{1,2}|one|two|three|four|five|six|uno|una|un|dos|tres|cuatro|cinco|seis)\s*\+?\s*-?\s*(bedrooms?|beds?|bdrms?|bd|br|dormitorios?|dorms?|habitaciones|habitacion|habs?|cuartos?|recamaras?|rooms?)\b/;
const AMT = String.raw`([$£€])?\s*(\d+(?:[.,]\d+)*)\s*(k|m|mil|millones|millon|million|thousand)?(?![\w²])\s*(?:(€|euros?|eur|\$|usd|us\$|dollars?|dolares|£|gbp|pounds?|libras?)(?![\w]))?`;
const MAX_KW = String.raw`(?:under|below|less than|max(?:imum)?|up to|at most|cheaper than|no more than|budget(?: of)?|hasta|menos de|por menos de|por debajo de|maximo(?: de)?|<)`;
const MIN_KW = String.raw`(?:over|above|more than|at least|min(?:imum)?|starting at|mas de|desde|minimo(?: de)?|a partir de|>)`;
const RENT_RE = /\b(rent|rental|rentals|renting|to let|for lease|lease|alquiler|alquilar|alquila|alquilo|arriendo|arrendar|renta|rentar|per month|al mes|por mes|mensual|\/mes|\/month|monthly)\b/;
const HOME_RE = /\b(house|houses|home|homes|property|properties|apartment|apartments|flat|flats|condo|condos|villa|villas|townhouse|townhouses|cottage|cabin|chalet|penthouse|studio|duplex|loft|real estate|bedrooms?|beds?|casa|casas|piso|pisos|apartamento|apartamentos|departamento|departamentos|vivienda|viviendas|chalet|adosado|atico|estudio|finca|inmueble|inmuebles|propiedad|propiedades|habitaciones|dormitorios|comprar|buy|buying|for sale|venta|en venta|rent|alquiler|alquilar)\b/;
const OFF_RE = /\b(hotel|hotels|hostel|airbnb|car|cars|coche|job|jobs|trabajo|flight|flights|vuelo|vuelos|restaurant|restaurante|pizza|weather|tiempo|recipe|receta)\b/;
const APT_RE = /\b(apartment|apartments|flat|flats|condo|condos|penthouse|studio|loft|piso|pisos|apartamento|apartamentos|departamento|departamentos|atico|estudio)\b/;
// "house" (one) means a house; "houses", "homes", "casas" are any home
const HOUSE_RE = /\b(house|houses|casa|casas|bungalow|bungalows|villa|villas|townhouse|townhouses|cottage|cabin|chalet|adosado|single family)\b/;
const SCORE_RE = /\b(good score|high score|well rated|top rated|best rated|buena puntuacion|alta puntuacion|bien puntuad[ao]s?|buena nota|mejor puntuad[ao]s?|best|mejores)\b/;

function amount(sym: string | undefined, digits: string, suffix: string | undefined, cur: string | undefined): { v: number; c: string | null } | null {
  let s = digits;
  const mult = !suffix ? 1 : /^(k|mil|thousand)$/.test(suffix) ? 1e3 : 1e6;
  if (/^\d{1,3}([.,]\d{3})+$/.test(s)) s = s.replace(/[.,]/g, ""); else s = s.replace(",", ".");
  const n = Number(s) * mult;
  if (!Number.isFinite(n) || n <= 0) return null;
  const c = (sym || cur || "").toLowerCase();
  const code = !c ? null : c === "$" || /usd|dollar|dolar|us\$/.test(c) ? "USD" : c === "£" || /gbp|pound|libra/.test(c) ? "GBP" : "EUR";
  return { v: Math.round(n), c: code };
}

export function parseLiveQuery(input: string): LiveQuery {
  const raw = String(input || "").trim();
  const out: LiveQuery = { ok: false, kind: "buy", place: null, city: null, state: null, country: null, min_beds: null, max_price: null, min_price: null, currency: "EUR", max_eur: null, min_eur: null, ptype: "any", good_score: false };
  if (raw.length < 3) return { ...out, reason: "empty" };
  if (raw.length > 200) return { ...out, reason: "too_long" };
  let s = " " + norm(raw).replace(/[“”"¿?¡!;()]/g, " ").replace(/\s+/g, " ") + " ";
  const homeish = HOME_RE.test(s);
  if (RENT_RE.test(s)) out.kind = "rent";
  if (APT_RE.test(s)) out.ptype = "apartment";
  else if (HOUSE_RE.test(s)) out.ptype = "house";
  if (SCORE_RE.test(s)) out.good_score = true;
  const bm = s.match(BED_RE);
  if (bm) { const v = NUMW[bm[1]] ?? Number(bm[1]); if (v > 0 && v < 20) out.min_beds = v; s = s.replace(BED_RE, " "); }

  let cur: string | null = null;
  const take = (a: { v: number; c: string | null } | null, which: "max" | "min") => {
    if (!a) return false;
    if (a.v < (out.kind === "rent" ? 100 : 1000)) return false;
    if (which === "max") out.max_price = a.v; else out.min_price = a.v;
    cur = cur || a.c;
    return true;
  };
  s = s.replace(new RegExp(String.raw`(?:between|entre)\s*${AMT}\s*(?:-|to|and|y|a)\s*${AMT}`), (m, s1, d1, x1, c1, s2, d2, x2, c2) => {
    const a = amount(s1 || s2, d1, x1 || x2, c1 || c2), b = amount(s2 || s1, d2, x2 || x1, c2 || c1);
    if (!a || !b) return m;
    take({ v: Math.min(a.v, b.v), c: a.c }, "min"); take({ v: Math.max(a.v, b.v), c: b.c }, "max"); return " ";
  });
  s = s.replace(new RegExp(MAX_KW + String.raw`\s*` + AMT), (m, s1, d, x, c) => (take(amount(s1, d, x, c), "max") ? " " : m));
  s = s.replace(new RegExp(MIN_KW + String.raw`\s*` + AMT), (m, s1, d, x, c) => (take(amount(s1, d, x, c), "min") ? " " : m));
  if (out.max_price == null) s = s.replace(new RegExp(AMT), (m, s1, d, x, c) => {
    if (!s1 && !x && !c && !/^\d{1,3}([.,]\d{3})+$/.test(d) && Number(d) < 10000) return m;
    return take(amount(s1, d, x, c), "max") ? " " : m;
  });

  // place: "in X", "en X", "near X", or a known city / country anywhere
  const STOPW = /\s(under|below|less|max|up|for|with|al|per|por|a month|monthly|mensual|that|which|and|y|con|por|de|del|para|que|menos|hasta|desde|from|over|above|between|entre|cheap|barat[ao]s?|good|buena|best|mejor|in|en|to|a)\s.*$/;
  let placeTxt: string | null = null;
  // the first "in X" whose X is not a home word ("piso en alquiler en Madrid" -> Madrid)
  for (const pm of s.matchAll(/\s(?:in|en|near|around|cerca de|alrededor de|at)\s+(?=([a-z][a-z .'-]{1,60}))/g)) {
    const cand = (" " + pm[1] + " ").replace(STOPW, " ").replace(/\s+/g, " ").trim();
    if (cand && !HOME_RE.test(" " + cand + " ") && !RENT_RE.test(" " + cand + " ")) { placeTxt = cand; break; }
  }
  const hay = s.replace(/[,]/g, " , ");
  // known US cities (longest first) win over the free text
  let city: string | null = null;
  for (const [c] of [...US_CITIES.entries()].sort((a, b) => b[0].length - a[0].length)) {
    if (new RegExp(`(^|\\s)${c.replace(/\./g, "\\.")}(?=\\s|,|$)`).test(hay)) { city = c; break; }
  }
  // "Some Town, FL" / "Some Town, Florida"
  const stm = raw.match(/([A-Za-zÀ-ÿ .'-]{2,40}),\s*([A-Za-z]{2}|[A-Za-z ]{4,20})\b/);
  if (stm) {
    const st = norm(stm[2]).trim();
    const code = US_STATES[st] ? st : STATE_BY_NAME.get(st) || null;
    if (code) { out.state = code; out.country = "United States"; if (!city) city = norm(stm[1]).trim().replace(/^.*\s(?:in|en|near|cerca de)\s+/, "").trim(); }
  }
  if (city) { out.city = city; out.state = out.state || US_CITIES.get(city) || null; out.country = "United States"; out.place = title(city); }
  // countries
  for (const [alias, en] of [...COUNTRY_ALIAS.entries()].sort((a, b) => b[0].length - a[0].length)) {
    if (alias.length < 3 && !/\b(us|uk)\b/.test(norm(raw).replace(/\s+/g, " "))) continue; // "us"/"uk" only when typed as such (not "en us...")
    if (new RegExp(`(^|\\s)${alias.replace(/\./g, "\\.")}(?=\\s|,|$)`).test(hay)) { if (!out.country) out.country = en; break; }
  }
  if (!out.place && placeTxt) {
    const ct = COUNTRY_ALIAS.get(placeTxt);
    if (ct) out.country = out.country || ct;
    else if (!HOME_RE.test(" " + placeTxt + " ")) out.place = title(placeTxt);
  }
  out.currency = cur || (out.country && COUNTRY_CURRENCY[out.country]) || "EUR";
  out.max_eur = toEur(out.max_price, out.currency);
  out.min_eur = toEur(out.min_price, out.currency);

  const about = homeish || out.min_beds != null || (!!(out.place || out.country) && (out.max_price != null || out.min_price != null));
  if (!about || (OFF_RE.test(s) && !homeish)) return { ...out, reason: "not_homes" };
  if (!out.place && !out.country) return { ...out, reason: "no_place" };
  return { ...out, ok: true };
}

/** One key per meaning: same kind, place, bedrooms, budget (rounded to €1,000) and type. */
export function liveKey(p: LiveQuery): string {
  const r = (n: number | null) => (n == null ? "" : String(Math.round(n / 1000)));
  return [p.kind, norm(p.country || ""), norm(p.city || p.place || ""), p.state || "", "b" + (p.min_beds ?? ""), "x" + r(p.max_eur), "n" + r(p.min_eur), p.ptype, p.good_score ? "g" : ""].join("|");
}

// ---------------------------------------------------------------- Coldwell Banker (free fallback, US only)
export const CB_RX = "(listingMasterId.{0,5000}?hidePrice.{0,6})";
export type CbRow = { id: string; address: string; price: number; beds: number | null; baths: number | null; sqft: number | null; type: string; status: string; lat: number | null; lng: number | null; path: string; photo: string | null; url: string };
const usd = (p: LiveQuery, eur: number | null) => (eur == null ? null : Math.round(eur / FX_TO_EUR.USD));

export function cbSearchUrls(p: LiveQuery, pages = 5): string[] {
  if (!p.city || !p.state) return [];
  const base = `https://www.coldwellbanker.com/city/${p.state}/${citySlug(p.city)}`;
  const qs = new URLSearchParams();
  const max = usd(p, p.max_eur), min = usd(p, p.min_eur);
  if (p.kind === "rent") qs.set("maxPrice", String(Math.min(max || 15000, 15000)));
  else { if (max) qs.set("maxPrice", String(max)); if (min && min >= 20000) qs.set("minPrice", String(min)); }
  if (p.min_beds) qs.set("minBedrooms", String(p.min_beds));
  return Array.from({ length: pages }, (_, i) => { const q = new URLSearchParams(qs); if (i) q.set("page", String(i + 1)); const t = q.toString(); return base + (t ? "?" + t : ""); });
}

export function parseCbMatch(m: string): CbRow | null {
  const s = '"' + m;
  const g = (k: string) => s.match(new RegExp(`"${k}":"([^"]*)"`))?.[1] ?? null;
  const n = (k: string) => { const v = s.match(new RegExp(`"${k}":"?(-?[\\d.,]+)"?`))?.[1]; if (v == null) return null; const x = Number(v.replace(/,/g, "")); return Number.isFinite(x) ? x : null; };
  const id = g("listingMasterId") || s.match(/^"listingMasterId":"([^"]+)"/)?.[1] || s.match(/listingMasterId":"([^"]+)"/)?.[1];
  const path = g("propertyDetailsRoutePath");
  const price = n("markerPrice");
  if (!id || !path || !price) return null;
  const photo = s.match(/"mediaUrl":"(https:\/\/[^"]+)"/)?.[1] || null;
  return {
    id, address: g("propertyAddress") || "", price, beds: n("beds"), baths: n("baths"), sqft: n("squareFeet"), type: g("propertyTypeValue") || "",
    status: g("standardStatus") || "", lat: n("latitude"), lng: n("longitude"), path, photo: photo ? photo.split("?")[0] + "?width=1280" : null,
    url: "https://www.coldwellbanker.com" + path,
  };
}

/** ACTIVE listings that fit the search, cheapest per sq ft first (rows without a size go last). */
export function pickCb(rows: CbRow[], p: LiveQuery, limit = 16): CbRow[] {
  const max = usd(p, p.max_eur), min = usd(p, p.min_eur);
  const seen = new Set<string>();
  const ok = rows.filter((r) => {
    if (seen.has(r.id)) return false; seen.add(r.id);
    // land, and manufactured or mobile homes (usually on rented land) are not what people mean by a house or flat
    if (r.status !== "ACTIVE" || /land|lot|manufactured|mobile/i.test(r.type) || /withheld/i.test(r.address)) return false;
    const rent = r.price < 20000;
    if (p.kind === "rent" ? !rent : rent) return false;
    if (max && r.price > max) return false;
    if (min && r.price < min) return false;
    if (p.min_beds && (r.beds == null || r.beds < p.min_beds)) return false;
    if (p.ptype === "apartment" && !/condo|co-?op|apartment/i.test(r.type)) return false;
    if (p.ptype === "house" && /condo|co-?op|apartment/i.test(r.type)) return false;
    return true;
  });
  const pp = (r: CbRow) => (r.sqft && r.sqft > 150 ? r.price / r.sqft : Infinity);
  return ok.sort((a, b) => pp(a) - pp(b) || a.price - b.price).slice(0, limit);
}

/** Photos of this listing only (CB pages also show photos of other homes), at 1280 px. */
export function cbPhotos(images: string[], firstPhoto: string | null): string[] {
  const key = firstPhoto?.match(/\/_P\/([A-Za-z0-9]+)_P\d+/)?.[1];
  const out: string[] = [];
  for (const u of [firstPhoto || "", ...images]) {
    if (!/images-listings\.coldwellbanker\.com/.test(u)) continue;
    if (key && !u.includes(key)) continue;
    const b = u.split("?")[0] + "?width=1280";
    if (!out.includes(b)) out.push(b);
  }
  return out;
}

// ---------------------------------------------------------------- the provisional score ("AI estimate")
/** Only listings at or above this provisional score are shown; the rest are saved but not shown. */
export const SHOW_MIN = 80;
/**
 * liveScore: a first estimate before a person checks the home. 0-100, four parts:
 *  - value (max 45): price per m² in € against a median: for homes to buy, the median of approved RealHunt homes in
 *    the same country; for rentals (or a country we have no homes in), the median of comparable listings found by
 *    live searches in the same place (at least 4). ratio r = price_per_m2 / median; 45 * (1.6 - r) / 1.1, clamped
 *    0-45: half the median = 45, the median = 24.5, 1.6 x the median or more = 0.
 *    No size or no median to compare with: 22.5 (the middle, neither good nor bad). Under 0.3 x the median is
 *    also 22.5: a price that low usually means something unusual (a share, rented land, an auction, a typo).
 *  - photos (max 15): 15 * min(photos, 12) / 12. When the page could not be read (the portal blocks robots) the
 *    number is unknown and counts 7.5 (the middle).
 *  - bedrooms (max 15): 15 when it has at least the bedrooms asked for, 10 when none were asked, 0 otherwise
 *    (also 0 when the listing does not say).
 *  - completeness (max 25): 5 each for price, size, bedrooms, map position and a description of 80+ characters.
 * So a home reaches 80 only when it is complete, well photographed, fits the bedrooms asked for and costs about
 * the median per m² or less.
 */
export type ScoreIn = { price_eur: number | null; sqm: number | null; photos: number | null; beds: number | null; lat: number | null; lng: number | null; desc_len: number; kind: "buy" | "rent" };
export function liveScore(x: ScoreIn, ctx: { median_ppm: number | null; min_beds: number | null }) {
  const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
  let value = 22.5;
  if (x.price_eur && x.sqm && x.sqm >= 15 && ctx.median_ppm && ctx.median_ppm > 0) {
    const r = x.price_eur / x.sqm / ctx.median_ppm;
    value = r < 0.3 ? 22.5 : clamp((45 * (1.6 - r)) / 1.1, 0, 45);
  }
  const photos = x.photos == null ? 7.5 : (15 * Math.min(Math.max(x.photos, 0), 12)) / 12;
  const beds = ctx.min_beds ? ((x.beds ?? 0) >= ctx.min_beds ? 15 : 0) : 10;
  const complete = 5 * [x.price_eur, x.sqm, x.beds, x.lat != null && x.lng != null ? 1 : null, x.desc_len >= 80 ? 1 : null].filter((v) => v != null && v !== 0).length;
  const score = Math.round(clamp(value + photos + beds + complete, 0, 100));
  return { score, parts: { value: Math.round(value * 10) / 10, photos: Math.round(photos * 10) / 10, beds, complete } };
}
export function median(nums: number[]): number | null {
  const a = nums.filter((n) => Number.isFinite(n) && n > 0).sort((x, y) => x - y);
  if (!a.length) return null;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

// ---------------------------------------------------------------- what a search costs (Claude API)
/** US$ per million tokens. Cache writes cost 1.25 x input, cache reads 0.1 x input. */
export const MODEL_PRICES: Record<string, { in: number; out: number }> = {
  "claude-haiku-4-5": { in: 1, out: 5 }, "claude-sonnet-4-5": { in: 3, out: 15 }, "claude-sonnet-4-6": { in: 3, out: 15 }, "claude-opus-4-5": { in: 5, out: 25 },
};
export const WEB_SEARCH_USD = 10 / 1000;
export type Usage = { input_tokens?: number; output_tokens?: number; cache_creation_input_tokens?: number; cache_read_input_tokens?: number; server_tool_use?: { web_search_requests?: number } };
export function jobCost(model: string, u: Usage | null | undefined): number {
  if (!u) return 0;
  const key = Object.keys(MODEL_PRICES).find((k) => model.startsWith(k)) || "claude-sonnet-4-5"; // unknown model: price it high
  const p = MODEL_PRICES[key];
  const usd = ((u.input_tokens || 0) * p.in + (u.cache_creation_input_tokens || 0) * p.in * 1.25 + (u.cache_read_input_tokens || 0) * p.in * 0.1 + (u.output_tokens || 0) * p.out) / 1e6
    + (u.server_tool_use?.web_search_requests || 0) * WEB_SEARCH_USD;
  return Math.round(usd * 1e5) / 1e5;
}

// ---------------------------------------------------------------- answering from our own data
export type Have = { kind: "buy" | "rent"; country: string | null; place: string | null; price_eur: number | null; beds: number | null; sqm?: number | null };
/** Does a home we already have (approved or found by an earlier live search) fit the search? */
export function fits(h: Have, p: LiveQuery): boolean {
  if (h.kind !== p.kind) return false;
  if (p.country && h.country && norm(h.country) !== norm(p.country)) return false;
  const want = norm(p.city || p.place || "");
  if (want && !norm(h.place || "").includes(want)) return false;
  if (!want && !p.country) return false;
  if (p.max_eur && (h.price_eur == null || h.price_eur > p.max_eur)) return false;
  if (p.min_eur && (h.price_eur == null || h.price_eur < p.min_eur)) return false;
  if (p.min_beds && (h.beds == null || h.beds < p.min_beds)) return false;
  return true;
}

/** Age-restricted (55+) communities are cheap per m² but not open to most buyers: they are never shown as a top pick. */
// Also the best-known 55+ communities in South Florida by name (Century Village, Kings Point) and the MLS flag.
export const AGE_RESTRICTED = /\b55\s?\+|\b(55 and (over|older)|over 55|age[- ]restricted|age[- ]qualified|senior (community|living)|adult community|century village|kings point)\b|seniorCommunityYN"\s*:\s*true/i;
export const CB_FACTS_RX = '"((?:subdivisionName|seniorCommunityYN|buildingName)"\\s*:\\s*(?:"[^"]{0,120}"|true|false))';

/** Drops web results that clearly do not match what was asked (Claude sometimes adds near misses). */
export function withinAsk(it: { kind: "buy" | "rent"; price: number | null; currency: string; beds: number | null }, p: LiveQuery): boolean {
  if (it.kind !== p.kind) return false;
  const eur = toEur(it.price, it.currency);
  if (p.max_eur && eur && eur > p.max_eur * 1.02) return false;
  if (p.min_eur && eur && eur < p.min_eur * 0.98) return false;
  if (p.min_beds && it.beds != null && it.beds < p.min_beds) return false;
  return true;
}

// ---------------------------------------------------------------- Claude's answer
export type LiveItem = { url: string; title: string; price: number | null; currency: string; beds: number | null; sqm: number | null; location: string; kind: "buy" | "rent"; image_url: string | null; country: string | null };
const keyUrl = (u: string) => { try { const x = new URL(u); return (x.hostname.replace(/^www\./, "") + x.pathname.replace(/\/+$/, "")).toLowerCase(); } catch { return ""; } };
/**
 * Reads the JSON list out of Claude's text (it may be wrapped in prose or ```json fences). Keeps only listings whose
 * URL is one of the web search results (same host and path), so nothing invented gets through.
 */
export function parseClaudeListings(text: string, resultUrls: string[], fallbackKind: "buy" | "rent" = "buy"): LiveItem[] {
  const a = text.indexOf("["), b = text.lastIndexOf("]");
  if (a < 0 || b <= a) return [];
  let arr: any[] = [];
  try { arr = JSON.parse(text.slice(a, b + 1)); } catch { return []; }
  if (!Array.isArray(arr)) return [];
  const allowed = new Set(resultUrls.map(keyUrl).filter(Boolean));
  const num = (v: any) => {
    if (typeof v === "number") return Number.isFinite(v) && v > 0 ? v : null;
    let t = String(v ?? "").replace(/[^\d.,]/g, "");
    t = /^\d{1,3}([.,]\d{3})+$/.test(t) ? t.replace(/[.,]/g, "") : t.replace(/,/g, "");
    const n = Number(t); return Number.isFinite(n) && n > 0 ? n : null;
  };
  const out: LiveItem[] = [];
  for (const r of arr.slice(0, 12)) {
    if (!r || typeof r !== "object") continue;
    const url = String(r.url || "");
    if (!/^https:\/\//.test(url) || !allowed.has(keyUrl(url)) || out.some((o) => keyUrl(o.url) === keyUrl(url))) continue;
    const cur = String(r.currency || "").toUpperCase().slice(0, 3);
    const img = typeof r.image_url === "string" && /^https:\/\//.test(r.image_url) ? r.image_url : null;
    out.push({
      url, title: String(r.title || "").slice(0, 160), price: num(r.price), currency: FX_TO_EUR[cur] ? cur : "EUR", beds: num(r.beds), sqm: num(r.sqm),
      location: String(r.location || "").slice(0, 160), kind: r.kind === "rent" ? "rent" : r.kind === "buy" ? "buy" : fallbackKind, image_url: img,
      country: typeof r.country === "string" ? r.country.slice(0, 60) : null,
    });
  }
  return out.slice(0, 8);
}

/** A slug for the review queue: us-<city>-<street number>-<price>k for US homes, live-<site>-<hash> otherwise. */
export function slugFor(url: string, opts: { city?: string | null; address?: string; price?: number | null } = {}): string {
  if (opts.city && opts.address && opts.price) {
    const num = (opts.address.split(/\s+/)[0] || "").replace(/\W/g, "").toLowerCase();
    const unit = (opts.address.match(/#\s*([\w-]+)/)?.[1] || "").replace(/\W/g, "").toLowerCase();
    const s = `us-${citySlug(opts.city)}-${num}${unit && unit !== num ? "-" + unit : ""}-${Math.round(opts.price / 1000)}k`;
    if (/^[a-z0-9-]{6,80}$/.test(s) && num) return s;
  }
  let h = 0; for (let i = 0; i < url.length; i++) h = (h * 31 + url.charCodeAt(i)) | 0;
  const host = (() => { try { return new URL(url).hostname.replace(/^www\./, "").split(".")[0].replace(/[^a-z0-9]/g, ""); } catch { return "web"; } })();
  return `live-${host.slice(0, 20) || "web"}-${Math.abs(h).toString(36)}`;
}
