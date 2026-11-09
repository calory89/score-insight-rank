// Pure helpers for realhunt-live-search (8-nov-2026). No Deno or browser globals and only one local import (./flags.ts,
// also used by the site's cards), so the edge function (Deno) and the unit tests (vitest, src/test/livesearch-core.test.ts)
// load the very same file.
import { FLAG_LABEL } from "./flags.ts";
import { CENTRAL_RE, fixBedWords } from "./words.ts";
import { findKnownPlace, isKnownPlace, pickPlace, placeOptions, type PlaceOpt } from "./places.ts";
export { FLAG_LABEL, placeOptions, pickPlace, type PlaceOpt };
//   parseLiveQuery   what a sentence asks for (buy or rent, place, bedrooms, budget), or why it is not a home search
//   liveKey          one key per search meaning, used for the 24 h cache ("3 bed house Miami under $300k" = "casas en Miami...")
//   cbSearchUrls / parseCbMatch / pickCb   the free Coldwell Banker fallback for US cities
//   liveScore        the provisional "AI estimate" score 0-100 (formula documented below)
//   textFlags / parseReview / gateDecision / orderPhotos / reviewPrompt   the quality gate (Claude vision) of v2
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
  Venezuela: ["venezuela"], Nicaragua: ["nicaragua"], Chile: ["chile"], Bolivia: ["bolivia"], "Puerto Rico": ["puerto rico"], "Czech Republic": ["czech republic", "czechia", "republica checa", "chequia"],
};
const COUNTRY_ALIAS = new Map<string, string>();
for (const [en, list] of Object.entries(COUNTRIES)) for (const a of list) COUNTRY_ALIAS.set(a, en);
export const COUNTRY_CURRENCY: Record<string, string> = { "Puerto Rico": "USD", "United States": "USD", "United Kingdom": "GBP", Mexico: "MXN", Canada: "CAD", Denmark: "DKK", Sweden: "SEK", Norway: "NOK", Poland: "PLN", Japan: "JPY", Thailand: "THB", Switzerland: "CHF", Turkey: "TRY", Australia: "AUD", "New Zealand": "NZD", Indonesia: "IDR", Brazil: "BRL", Argentina: "USD", Colombia: "COP", "Costa Rica": "USD", "Dominican Republic": "USD", Ecuador: "USD", Panama: "USD", "El Salvador": "USD", Peru: "USD", Uruguay: "USD", Chile: "USD", "United Arab Emirates": "AED", "South Africa": "ZAR", Morocco: "MAD", Bulgaria: "EUR", Iceland: "ISK", "Czech Republic": "CZK", Czechia: "CZK", Hungary: "HUF", Romania: "RON", Vietnam: "USD", Georgia: "USD", Philippines: "USD", Malaysia: "USD", Ghana: "USD", Kenya: "USD", Egypt: "USD", Albania: "EUR", Montenegro: "EUR", Serbia: "EUR", "Bosnia and Herzegovina": "EUR", "North Macedonia": "EUR", Turkiye: "TRY", Cambodia: "USD", "Sri Lanka": "USD", India: "USD", Nigeria: "USD", Guatemala: "USD", Honduras: "USD", Nicaragua: "USD", Belize: "USD", Bahamas: "USD", Jamaica: "USD", Barbados: "USD", Paraguay: "USD", Bolivia: "USD", Venezuela: "USD", Cuba: "USD" };

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
  /** style / condition words the person typed ("moderna", "renovated", "con vistas"): features, never part of the place */
  features?: string[];
  /** v3: "en el centro", "downtown", "casco antiguo": wants the centre (ranking and the web search), never part of the place */
  central?: boolean;
  /** v3: the only house word was the Spanish "casa(s)", which in Spanish usually means any home: flats count too */
  ptype_soft?: boolean;
  /** v3: the text is only a place name ("Sevilla"): a search for homes to buy there */
  bare?: boolean;
  /** v3: where the country came from: typed by the person, our US city list (a guess), the built-in gazetteer, a choice */
  geo?: "said" | "us_list" | "gazetteer" | "chosen" | null;
  /** v3: the currency was typed ("200k €", "$300k"), so a chosen country does not change it */
  cur_typed?: boolean;
  /** 9-nov-2026: the place's point and size from a geocoder (any town in the world), for the centre */
  lat?: number | null;
  lng?: number | null;
  pop?: number | null;
  /** 9-nov-2026: region / state / province of the place, when known */
  region?: string | null;
};

/** Style and condition words (accents already removed). "new" is kept when it starts a place name (New York, Nueva Zelanda). */
export const STYLE_RE = /\s(modern[ao]s?|modern|contemporane[ao]s?|contemporary|nuev[ao]s?(?! (?:york|jersey|mexico|orleans|zelanda|leon|delhi|gales|caledonia|hampshire|brunswick|escocia))|new(?! (?:york|jersey|mexico|orleans|hampshire|zealand|haven|brunswick|smyrna|braunfels|port|castle|london|delhi|england|caledonia|south wales|rochelle|bern|albany|westminster|iberia))|brand new|newly built|new build|a estrenar|obra nueva|reformad[ao]s?|renovad[ao]s?|renovated|refurbished|remodeled|remodelled|updated|lujo|de lujo|lujos[ao]s?|luxury|luxurious|centric[ao]s?|central|centrally located|bonit[ao]s?(?! springs)|preciosa?s?|precioso|beautiful|pretty|lovely|cozy|cosy|acogedor[ao]?s?|amplia?s?|amplio|spacious|large|small|pequen[ao]s?|barat[ao]s?|cheap|cheapest|affordable|economic[ao]s?|asequibles?|luminos[ao]s?|bright|sunny(?! isles)|soleada?s?|tranquil[ao]s?|quiet|peaceful|con vistas(?: al mar| a la montana)?|vistas al mar|with (?:a )?views?|sea views?|ocean views?|con piscina|with (?:a )?pool|con jardin|with (?:a )?garden|con terraza|with (?:a )?terrace|amueblad[ao]s?|furnished|independientes?|detached)(?=\s)/g;

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
  let s = " " + fixBedWords(norm(raw).replace(/[“”"¿?¡!;()]/g, " ").replace(/\s+/g, " ")) + " ";
  if (CENTRAL_RE.test(s)) { out.central = true; s = s.replace(CENTRAL_RE, " ").replace(/\s+/g, " "); }
  CENTRAL_RE.lastIndex = 0;
  const homeish = HOME_RE.test(s);
  if (RENT_RE.test(s)) out.kind = "rent";
  if (APT_RE.test(s)) out.ptype = "apartment";
  else if (HOUSE_RE.test(s)) { out.ptype = "house"; if (!HOUSE_RE.test(s.replace(/\b(casas?|houses)\b/g, " "))) out.ptype_soft = true; }
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
  let saidCountry: string | null = null;
  // the first "in X" whose X is not a home word ("piso en alquiler en Madrid" -> Madrid)
  for (const pm of s.matchAll(/\s(?:in|en|near|around|cerca de|alrededor de|at)\s+(?=([a-z][a-z .'-]{1,60}))/g)) {
    const cand = (" " + pm[1] + " ").replace(STYLE_RE, " ").replace(/\s+/g, " ").replace(STOPW, " ").replace(/\s+/g, " ").trim();
    if (cand && !HOME_RE.test(" " + cand + " ") && !RENT_RE.test(" " + cand + " ")) { placeTxt = cand; break; }
  }
  const feats = [...s.matchAll(STYLE_RE)].map((m) => m[1].trim());
  if (feats.length) out.features = [...new Set(feats)];
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
    if (code) { out.state = code; out.country = "United States"; out.geo = "said"; if (!city) city = norm(stm[1]).trim().replace(/^.*\s(?:in|en|near|cerca de)\s+/, "").trim(); }
  }
  if (city) { out.city = city; out.state = out.state || US_CITIES.get(city) || null; out.country = "United States"; out.place = title(city); out.geo = out.geo || "us_list"; }
  // countries
  for (const [alias, en] of [...COUNTRY_ALIAS.entries()].sort((a, b) => b[0].length - a[0].length)) {
    if (alias.length < 3 && !/\b(us|uk)\b/.test(norm(raw).replace(/\s+/g, " "))) continue; // "us"/"uk" only when typed as such (not "en us...")
    if (new RegExp(`(^|\\s)${alias.replace(/\./g, "\\.")}(?=\\s|,|$)`).test(hay)) {
      if (!out.country) { out.country = en; out.geo = "said"; }
      // "Seville, Spain" after a US list guess: the person said the country
      else if (out.geo === "us_list" && en !== "United States") { out.country = en; out.geo = "said"; out.state = null; out.city = null; }
      saidCountry = alias;
      break;
    }
  }
  // the place left once the country is taken out ("Sevilla, Spain" -> "Sevilla")
  const dropCountry = (t: string) => (saidCountry ? (" " + t + " ").replace(new RegExp(`[\\s,]${saidCountry.replace(/\./g, "\\.")}(?=\\s|,|$)`), " ").replace(/[,\s]+/g, " ").trim() : t.trim());
  if (placeTxt) placeTxt = dropCountry(placeTxt) || null;
  if (!out.place && placeTxt) {
    const ct = COUNTRY_ALIAS.get(placeTxt);
    if (ct) { if (!out.country) { out.country = ct; out.geo = "said"; } }
    else if (!HOME_RE.test(" " + placeTxt + " ")) out.place = title(placeTxt);
  }
  // no "in X": a place we know anywhere in the sentence ("piso Valencia 2 habitaciones"), or the whole text ("Sevilla")
  if (!out.place && !out.city) {
    const rest = dropCountry(s.replace(STYLE_RE, " ").replace(/[,]/g, " ").replace(/\s+/g, " "));
    if (rest && isKnownPlace(rest)) { out.place = title(rest); if (!homeish && out.min_beds == null && out.max_price == null) out.bare = true; }
    else { const k = findKnownPlace(rest); if (k) out.place = title(k); }
  }
  // the country of a place we know by name (one country only); places with several are resolved by resolveLive
  if (out.place && (!out.country || out.geo === "us_list")) {
    const opts = placeOptions(out.city || out.place);
    if (opts.length === 1 && !out.country) { applyOpt(out, opts[0], false); out.geo = "gazetteer"; }
  }
  out.cur_typed = !!cur;
  out.currency = cur || (out.country && COUNTRY_CURRENCY[out.country]) || "EUR";
  out.max_eur = toEur(out.max_price, out.currency);
  out.min_eur = toEur(out.min_price, out.currency);

  const about = homeish || out.min_beds != null || !!out.bare || (!!(out.place || out.country) && (out.max_price != null || out.min_price != null));
  if (!about || (OFF_RE.test(s) && !homeish)) return { ...out, reason: "not_homes" };
  if (!out.place && !out.country) return { ...out, reason: "no_place" };
  return { ...out, ok: true };
}

/** One key per meaning: same kind, place, bedrooms, budget (rounded to €1,000) and type. */
export function liveKey(p: LiveQuery): string {
  const r = (n: number | null) => (n == null ? "" : String(Math.round(n / 1000)));
  return [p.kind, norm(p.country || ""), norm(p.city || p.place || ""), p.state || "", "b" + (p.min_beds ?? ""), "x" + r(p.max_eur), "n" + r(p.min_eur), p.ptype_soft ? "any" : p.ptype, p.good_score ? "g" : "", p.central ? "c3" : ""].join("|"); // c2 (8-nov-2026): the centre became real geography; c3: values against central comparables; older "centre" answers are not reused
}

/** Puts a chosen (or the only) place into a parsed search: its name, country and, for US places, city and state. */
function applyOpt(p: LiveQuery, o: PlaceOpt, recurrency = true) {
  p.place = o.name;
  p.country = o.country;
  p.state = o.state || null;
  p.city = o.country === "United States" ? norm(o.name) : null;
  if (recurrency && !p.cur_typed) {
    p.currency = COUNTRY_CURRENCY[o.country] || "EUR";
    p.max_eur = toEur(p.max_price, p.currency);
    p.min_eur = toEur(p.min_price, p.currency);
  }
}

/** Sets the country of a parsed search found some other way (e.g. a town only RealHunt's own homes know). */
export function placeInto(p: LiveQuery, country: string) {
  if (!p.place || p.country) return;
  applyOpt(p, { id: "x", name: p.place, country, major: true });
  p.geo = "gazetteer";
}

export type Resolved = { p: LiveQuery; ask: PlaceOpt[] | null };
/**
 * v3: a place name found in several countries ("Sevilla": Spain, Colombia, Ohio). `choice` is an option id the
 * person picked (?in=es); without one, pickPlace decides from what they typed and their time zone, or we ask.
 * Never spends anything: the page shows the question and the search starts once a place is chosen.
 */
export function resolveLive(p0: LiveQuery, ctx: { tz?: string | null; choice?: string | null } = {}): Resolved {
  const p: LiveQuery = { ...p0 };
  if (!p.ok || !p.place || p.geo === "said" || p.geo === "chosen") return { p, ask: null };
  const opts = placeOptions(p.city || p.place);
  if (opts.length < 2) return { p, ask: null };
  const chosen = ctx.choice ? opts.find((o) => o.id === ctx.choice) : null;
  const pick = chosen || pickPlace(opts, {}, { tz: ctx.tz, bare: p.bare });
  if (pick) { applyOpt(p, pick); p.geo = chosen ? "chosen" : p.geo === "us_list" && pick.country === "United States" ? "us_list" : "gazetteer"; return { p, ask: null }; }
  return { p: { ...p, country: null, state: null, city: null }, ask: opts };
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

/** Price per m² in € of the scanned rows that have a size: the same-city comparables for the value score. */
export function cbPpm(rows: CbRow[]): number[] {
  return rows.filter((r) => r.sqft && r.sqft > 150 && r.price >= 20000).map((r) => (toEur(r.price, "USD") || 0) / (r.sqft! * 0.092903)).filter((v) => v > 0);
}
/** Flats, townhouses and houses are compared with their own kind (a townhouse always looks cheap next to houses). */
export const cbGroup = (type: string) => (/condo|co-?op|apartment/i.test(type) ? "condo" : /town/i.test(type) ? "townhouse" : "house");
/** Median € per m² of each kind among the scanned rows (8 or more of that kind), plus "all". */
export function cbGroupMedians(rows: CbRow[]): Record<string, number | null> {
  const out: Record<string, number | null> = { all: rows.length ? median(cbPpm(rows)) : null };
  for (const g of ["condo", "townhouse", "house"]) { const v = cbPpm(rows.filter((r) => cbGroup(r.type) === g)); out[g] = v.length >= 8 ? median(v) : null; }
  return out;
}
/**
 * ACTIVE listings that fit the search, best value per sq ft first (rows without a size go last). 8-nov-2026: rows
 * under half the city's median per sq ft are left out (with 8+ rows to compare): that cheap is nearly always a
 * mobile home, a 55+ community, a share or a typo, which the owner does not want at the top.
 */
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
  const sized = ok.filter((r) => Number.isFinite(pp(r)));
  const all = sized.length >= 8 ? median(sized.map(pp)) : null;
  const gm: Record<string, number | null> = {};
  for (const g of ["condo", "townhouse", "house"]) { const v = sized.filter((r) => cbGroup(r.type) === g).map(pp); gm[g] = v.length >= 8 ? median(v) : all; }
  // value against its own kind; rows without a size go last
  const rel = (r: CbRow) => { const m = gm[cbGroup(r.type)]; return Number.isFinite(pp(r)) ? (m ? pp(r) / m : pp(r) / 1e6) : Infinity; };
  return ok.filter((r) => !Number.isFinite(rel(r)) || !gm[cbGroup(r.type)] || rel(r) >= 0.5).sort((a, b) => rel(a) - rel(b) || a.price - b.price).slice(0, limit);
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
/** Only listings at or above this provisional score (and through the quality gate below) are shown. */
export const SHOW_MIN = 80;
/** The photo set must be at least this good (1-10, judged by Claude vision) to be shown. */
export const PHOTO_MIN = 7;
/**
 * liveScore v2 (8-nov-2026): a first estimate before a person checks the home. 0-100, four parts and two rules:
 *  - value (max 40): price per m² in € against a median of comparable homes. The median is, in this order:
 *    the listings of the same city scanned for this search (at least 8), earlier live finds in the same place
 *    (at least 4), approved RealHunt homes in the same country. ratio r = price_per_m2 / median;
 *    value = 40 * (1.6 - r) / 1.1, clamped 0-40: half the median = 40, the median = 21.8, 1.6 x the median = 0.
 *    No size or no median: 20 (the middle).
 *  - photos (max 20): 5 * min(photos, 12) / 12 for how many there are, plus 15 * (quality - 1) / 9 for how good
 *    they are (quality 1-10 from the AI check; before the check it counts 7.5, the middle). Could not read the
 *    page: 2.5 + 7.5.
 *  - bedrooms (max 15): 15 when it has at least the bedrooms asked for, 10 when none were asked, 0 otherwise.
 *  - completeness (max 25): 5 each for price, size, bedrooms, map position and a description of 80+ characters.
 *  - caveats: each non-blocking flag the check found takes points off (FLAG_PENALTY: 55+ community -6,
 *    needs renovation -10, tenant occupied -5, co-op -4, cash only -3). A blocking flag (BLOCKING_FLAGS) caps it at 60.
 *  - too cheap to be true: a price under half the median caps the score at 79 unless the check explains why it is
 *    cheap (why_cheap). Under 0.3 x the median the value part also counts at most 30.
 * So a home reaches 80 only when it is complete, has good photos, fits the bedrooms asked for, costs about the
 * median per m² or less, and anything unusually cheap is explained.
 */
export type ScoreIn = {
  price_eur: number | null; sqm: number | null; photos: number | null; beds: number | null; lat: number | null; lng: number | null; desc_len: number; kind: "buy" | "rent";
  photo_quality?: number | null; flags?: string[]; why_cheap?: string | null;
};
export const BLOCKING_FLAGS = ["manufactured_home", "land_lease", "timeshare", "fractional_share", "auction", "inconsistent_data", "not_a_home", "off_market", "squatted"] as const;
export const SOFT_FLAGS = ["age_restricted", "needs_renovation", "tenant_occupied", "co_op", "cash_only", "hoa_assessment", "flood_zone"] as const;
export const ALL_FLAGS: readonly string[] = [...BLOCKING_FLAGS, ...SOFT_FLAGS];
export const FLAG_PENALTY: Record<string, number> = { age_restricted: 6, needs_renovation: 10, tenant_occupied: 5, co_op: 4, cash_only: 3, hoa_assessment: 5, flood_zone: 3 };
export function liveScore(x: ScoreIn, ctx: { median_ppm: number | null; min_beds: number | null }) {
  const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
  let value = 20;
  let ratio: number | null = null;
  if (x.price_eur && x.sqm && x.sqm >= 15 && ctx.median_ppm && ctx.median_ppm > 0) {
    ratio = x.price_eur / x.sqm / ctx.median_ppm;
    value = clamp((40 * (1.6 - ratio)) / 1.1, 0, 40);
    if (ratio < 0.3) value = Math.min(value, 30);
  }
  const q = x.photo_quality != null && Number.isFinite(x.photo_quality) ? clamp(x.photo_quality, 1, 10) : null;
  const photos = (x.photos == null ? 2.5 : (5 * Math.min(Math.max(x.photos, 0), 12)) / 12) + (q == null ? 7.5 : (15 * (q - 1)) / 9);
  const beds = ctx.min_beds ? ((x.beds ?? 0) >= ctx.min_beds ? 15 : 0) : 10;
  const complete = 5 * [x.price_eur, x.sqm, x.beds, x.lat != null && x.lng != null ? 1 : null, x.desc_len >= 80 ? 1 : null].filter((v) => v != null && v !== 0).length;
  const flags = [...new Set(x.flags || [])];
  const penalty = flags.reduce((s, f) => s + (FLAG_PENALTY[f] || 0), 0);
  let score = Math.round(clamp(value + photos + beds + complete - penalty, 0, 100));
  const caps: string[] = [];
  if (flags.some((f) => (BLOCKING_FLAGS as readonly string[]).includes(f))) { score = Math.min(score, 60); caps.push("blocking_flag"); }
  if (ratio != null && ratio < 0.5 && !String(x.why_cheap || "").trim()) { score = Math.min(score, SHOW_MIN - 1); caps.push("cheap_unexplained"); }
  const r1 = (v: number) => Math.round(v * 10) / 10;
  return { score, parts: { value: r1(value), photos: r1(photos), beds, complete, penalty, ratio: ratio == null ? null : Math.round(ratio * 100) / 100 }, caps };
}
export function median(nums: number[]): number | null {
  const a = nums.filter((n) => Number.isFinite(n) && n > 0).sort((x, y) => x - y);
  if (!a.length) return null;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}
/** The median to compare with: same-city scan (8+), earlier finds in the place (4+), then the country's RealHunt homes. */
export function pickMedian(scan: number[], local: number[], country: number | null): { ppm: number | null; from: "scan" | "local" | "country" | null } {
  const s = scan.filter((v) => v > 0), l = local.filter((v) => v > 0);
  if (s.length >= 8) return { ppm: median(s), from: "scan" };
  if (l.length + s.length >= 4) return { ppm: median([...s, ...l]), from: "local" };
  if (country && country > 0) return { ppm: country, from: "country" };
  return { ppm: null, from: null };
}

// ---------------------------------------------------------------- the quality gate (Claude vision)
/** Flags anyone can read in the listing text or the portal's facts, before (and besides) the AI check. */
export function textFlags(text: string, x: { beds?: number | null; baths?: number | null; sqm?: number | null } = {}): string[] {
  const t = " " + String(text || "").toLowerCase().replace(/\s+/g, " ") + " ";
  const out = new Set<string>();
  if (/\b(mobile home|manufactured home|manufactured housing|double ?wide|single ?wide|park model|trailer home|mobile home park)\b/.test(t)) out.add("manufactured_home");
  if (/\b(land lease|leased land|lot rent|lot fee|ground lease|rented land)\b/.test(t)) out.add("land_lease");
  if (AGE_RESTRICTED.test(text || "")) out.add("age_restricted");
  if (/\b(timeshare|time share|interval ownership)\b/.test(t)) out.add("timeshare");
  if (/\b(fractional ownership|undivided interest|1\/\d+ share|share of the property|cuota parte|nuda propiedad|bare ownership)\b/.test(t)) out.add("fractional_share");
  if (/\b(auction|subasta|foreclosure auction|bid deadline|starting bid)\b/.test(t)) out.add("auction");
  if (/\b(co-?op|cooperative apartment|cooperative building)\b/.test(t)) out.add("co_op");
  if (/\b(tenant[- ]occupied|tenant in place|currently rented|leased until|sold with tenant|inquilino|okupad[oa]|ocupad[oa] ilegalmente)\b/.test(t)) out.add("tenant_occupied");
  if (/\b(fixer[- ]upper|handyman special|needs (major |a full |full |some )?(work|tlc|renovation|repairs|updating)|to renovate|a reformar|para reformar|sold as[- ]is|tear ?down|investor special)\b/.test(t)) out.add("needs_renovation");
  if (/\b(cash only|cash buyers only|solo contado)\b/.test(t)) out.add("cash_only");
  // Spain (v3): squatted homes and homes sold without possession cannot be visited or lived in
  if (/(okupad[ao]s?|ocupad[ao] ilegalmente|ocupad[ao] sin titulo|vivienda ocupada|inmueble ocupado|sin posesi[oó]n|no se puede visitar|squatters?)/.test(t)) out.add("squatted");
  if (/\b(special assessment|assessment due|assessments? pending)\b/.test(t)) out.add("hoa_assessment");
  if (inconsistent(x)) out.add("inconsistent_data");
  return [...out];
}
/** 5 bedrooms in 93 m² is not a real 5-bedroom home: about 12 m² a bedroom, 6 a bathroom and 20 for the rest. */
export function inconsistent(x: { beds?: number | null; baths?: number | null; sqm?: number | null }): boolean {
  const b = Number(x.beds) || 0, ba = Number(x.baths) || 0, m = Number(x.sqm) || 0;
  if (!m || !b) return false;
  return m < 12 * b + 6 * ba + 20;
}

export type Review = {
  photo_quality: number; order: number[]; flags: string[]; title: string; why_great: string; why_cheap: string | null;
  hoa_monthly: number | null; tax_annual: number | null; note: string;
  /** the same texts in Spanish (8-nov-2026): the Spanish site never shows a home's English text */
  title_es: string | null; why_great_es: string | null; why_cheap_es: string | null;
};
/** Reads Claude's review JSON defensively: numbers clamped, only known flags, photo indexes in range, no em dashes. */
export function parseReview(text: string, nPhotos: number): Review | null {
  const a = String(text || "").indexOf("{"), b = String(text || "").lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  let o: any;
  try { o = JSON.parse(text.slice(a, b + 1)); } catch { return null; }
  if (!o || typeof o !== "object") return null;
  const q = Number(o.photo_quality);
  if (!Number.isFinite(q)) return null;
  const clean = (s: unknown, n: number) => String(s ?? "").replace(/\s*[—–]\s*/g, ", ").replace(/\s+/g, " ").trim().slice(0, n);
  const order: number[] = [];
  for (const v of Array.isArray(o.order) ? o.order : []) { const i = Number(v); if (Number.isInteger(i) && i >= 0 && i < nPhotos && !order.includes(i)) order.push(i); }
  const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? Math.round(n) : null; };
  const cheap = cleanCheap(clean(o.why_cheap, 260));
  return {
    photo_quality: Math.max(1, Math.min(10, Math.round(q))), order,
    flags: [...new Set((Array.isArray(o.flags) ? o.flags : []).map((f: unknown) => String(f).toLowerCase().trim()).filter((f: string) => ALL_FLAGS.includes(f)))] as string[],
    title: clean(o.title, 120), why_great: clean(o.why_great, 700), why_cheap: cheap && !/^(null|none|n\/a)$/i.test(cheap) ? cheap : null,
    hoa_monthly: num(o.hoa_monthly), tax_annual: num(o.tax_annual), note: clean(o.note, 200),
    title_es: clean(o.title_es, 140) || null, why_great_es: clean(o.why_great_es, 800) || null,
    why_cheap_es: cheap && !/^(null|none|n\/a|ninguno|ninguna)$/i.test(clean(o.why_cheap_es, 260)) ? clean(o.why_cheap_es, 260) || null : null,
  };
}

/** Spanish of a home's texts, for the translate action (homes published before the gate wrote Spanish). */
export function translatePrompt(items: { id: string; title: string; why_great?: string | null; why_cheap?: string | null }[]): string {
  return [
    "Translate these home listings of RealHunt from English into natural Spanish (Spain). Keep place names, numbers and units as they are; " +
      "keep the meaning exact, add nothing, no em dashes. Sentence case for titles.",
    'Return ONLY a JSON array, one object per home, in the same order: [{"id": "", "title_es": "", "why_great_es": "", "why_cheap_es": null}]. ' +
      "why_great_es / why_cheap_es are null when the English text is empty.",
    JSON.stringify(items.map((x) => ({ id: x.id, title: x.title, why_great: x.why_great || "", why_cheap: x.why_cheap || "" }))),
  ].join("\n");
}
export type EsTexts = { id: string; title_es: string | null; why_great_es: string | null; why_cheap_es: string | null };
export function parseTranslations(text: string, ids: string[]): EsTexts[] {
  const a = String(text || "").indexOf("["), b = String(text || "").lastIndexOf("]");
  if (a < 0 || b <= a) return [];
  let arr: any;
  try { arr = JSON.parse(text.slice(a, b + 1)); } catch { return []; }
  if (!Array.isArray(arr)) return [];
  const clean = (s: unknown, n: number) => { const v = String(s ?? "").replace(/\s*[—–]\s*/g, ", ").replace(/\s+/g, " ").trim().slice(0, n); return v && !/^(null|none)$/i.test(v) ? v : null; };
  return arr.filter((o) => o && ids.includes(String(o.id)) && clean(o.title_es, 140))
    .map((o) => ({ id: String(o.id), title_es: clean(o.title_es, 140), why_great_es: clean(o.why_great_es, 800), why_cheap_es: clean(o.why_cheap_es, 260) }));
}

/** why_cheap must be a reason, not the price comparison again: clauses about medians or percentages are dropped. */
export function cleanCheap(s: string | null | undefined): string | null {
  const parts = String(s || "").split(/(?<=[.;])\s+|;\s*/).map((x) => x.replace(/[.;]\s*$/, "").trim()).filter(Boolean);
  const keep = parts.filter((x) => !/median|\d+\s?%|per cent|percent|comparable|below (the )?(area|market|average)|priced (at|below|under)|good value|great value|strong (buyer )?value|bargain|suggest/i.test(x));
  if (!keep.length || /^(null|none|n\/a)$/i.test(keep[0])) return null;
  const out = keep.join("; ");
  return (out.charAt(0).toUpperCase() + out.slice(1)).slice(0, 220).replace(/[,;:\s]+$/, "") + ".";
}

/** The gate: shown only with score >= 80, photos >= 7/10, at least 4 good photos and no blocking flag. */
export function gateDecision(score: number, review: Review | null, goodPhotos: number): { show: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!review) return { show: false, reasons: ["not_reviewed"] };
  if (score < SHOW_MIN) reasons.push("score");
  if (review.photo_quality < PHOTO_MIN) reasons.push("photos");
  if (goodPhotos < 4) reasons.push("few_photos");
  for (const f of review.flags) if ((BLOCKING_FLAGS as readonly string[]).includes(f)) reasons.push("flag:" + f);
  if (!review.title) reasons.push("no_title");
  return { show: reasons.length === 0, reasons };
}

/** Photos in the order to publish: the reviewed ones the AI kept, best first, then the ones it did not see. */
export function orderPhotos(photos: string[], review: Pick<Review, "order"> | null, reviewed: number, max = 10): string[] {
  if (!review) return photos.slice(0, max);
  const kept = review.order.filter((i) => i < reviewed).map((i) => photos[i]).filter(Boolean);
  return [...kept, ...photos.slice(reviewed)].slice(0, max);
}

/** RealHunt's own titles, so the AI writes in the same voice. */
export const TITLE_EXAMPLES = [
  "Lakefront three-bedroom house with a screened patio in Country Park, Boca Raton",
  "Corner three-bed condo with three balconies in Downtown Hollywood",
  "Top-floor two-bed condo in a gated resort-style community in Doral",
  "Blue 1907 cottage with 9-foot ceilings and a new kitchen",
  "Renovated house with a two-car garage and a 2024 roof in Greenbriar (55+ community), Boca Raton",
];
export function reviewPrompt(x: {
  kind: "buy" | "rent"; price: number | null; currency: string; price_eur: number | null; beds: number | null; baths?: number | null; sqm: number | null; ptype: string;
  location: string; country: string | null; ratio: number | null; text: string; facts: string; nPhotos: number;
}): string {
  const pct = x.ratio != null ? Math.round(x.ratio * 100) : null;
  return [
    "You are the listing editor of RealHunt, a site of the best-value homes for foreign buyers. Check this listing and its photos honestly.",
    `Listing: ${x.kind === "rent" ? "for rent (monthly)" : "for sale"}, ${x.price != null ? x.price + " " + x.currency : "price unknown"}${x.price_eur && x.currency !== "EUR" ? ` (about EUR ${x.price_eur})` : ""}, ` +
      `${x.beds ?? "?"} bedrooms, ${x.baths ?? "?"} bathrooms, ${x.sqm ?? "?"} m², type: ${x.ptype || "?"}, place: ${[x.location, x.country].filter(Boolean).join(", ")}.`,
    pct != null ? `Its price per m² is ${pct}% of the median of comparable homes in the area.` : "We have no area median to compare the price with.",
    `Portal facts: ${x.facts || "none"}`,
    `Listing text: ${String(x.text || "").slice(0, 2500) || "none"}`,
    `The ${x.nPhotos} photos are numbered 0 to ${x.nPhotos - 1} in the order given.`,
    "Return ONLY this JSON, no prose:",
    '{"photo_quality": 1-10, "order": [photo indexes, best first], "flags": [], "title": "", "why_great": "", "why_cheap": null, "title_es": "", "why_great_es": "", "why_cheap_es": null, "hoa_monthly": null, "tax_annual": null, "note": ""}',
    "photo_quality: the photos as a set for a premium home feed. 9-10 bright professional photos of an attractive home; 7-8 good clear photos; 5-6 dated, dark, cluttered, " +
      "small or with a big watermark; 1-4 not real photos of the home (parking lots, maps, logos, street views only, renderings) or a run-down home.",
    "order: the photos worth publishing, best first: an attractive exterior or the living room first. Leave out floor plans, maps, logos, text banners, " +
      "photos with a watermark or MLS logo where others exist, blurry, dark or near-duplicate photos, and photos that are not of this home.",
    `flags: any that apply, only from this list: ${ALL_FLAGS.join(", ")}. manufactured_home = mobile, manufactured or park home; land_lease = on rented land or with a lot fee; ` +
      "age_restricted = 55+ or senior community; inconsistent_data = only when the stated facts clearly cannot all be true (e.g. 5 bedrooms in 93 m²) or the photos clearly show a different kind of property than described; small differences or missing details are not inconsistent; " +
      "squatted = occupied by squatters, sold without possession or cannot be visited (Spanish: okupada, sin posesión); not_a_home = land, a parking space, a commercial unit; off_market = sold, under contract or no longer listed; needs_renovation = the text or photos show it needs major work; " +
      "hoa_assessment = only when an extra one-off special assessment is stated (a normal monthly HOA or community fee is NOT a flag).",
    "title: a polished title in RealHunt's style, 6 to 14 words, sentence case, no price, no emoji, no address number, no em dashes; the best true feature first, then the type and the area. Examples: " +
      TITLE_EXAMPLES.map((t) => `"${t}"`).join("; ") + ".",
    "why_great: 2 to 4 short sentences in plain English about what is good about this home, using only facts from the listing text, the portal facts and what the photos clearly show. " +
      "No invented facts, no superlatives you cannot back, no promises about value or returns, no em dashes.",
    "why_cheap: if the price per m² is under 70% of the median, or a flag explains a low price, one plain sentence with the concrete reason a buyer pays less, " +
      "as the listing states it or the photos show it: the kind of home, its age or condition, the location (e.g. next to a main road), high monthly fees, restrictions, a tenant " +
      '(e.g. "Mobile home on rented land: you pay a monthly lot fee.", "Only for buyers aged 55 or more.", "Needs a full renovation.", "Small 1960s building far from the beach."). ' +
      "Never just repeat that the price is below the area, never praise the value. If you cannot see a concrete reason, null. If the price is not unusually low, null.",
    "hoa_monthly / tax_annual: the monthly community (HOA) fee and the yearly property tax in the listing currency, only if stated; else null. note: one short internal note.",
    "title_es / why_great_es / why_cheap_es: the same title, why_great and why_cheap in natural Spanish (Spain), same facts, place names unchanged, no em dashes; why_cheap_es is null when why_cheap is null.",
  ].join("\n");
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

/**
 * v3: the closest listings that did not pass the gate, for an honest "closest we found" list when nothing passed:
 * checked by the AI, no blocking flag (no squat, no mobile home...), score 60 or more, best first, at most 4.
 * They keep only what the card needs and why each one missed (photos, score).
 */
export type Miss = { id: string; url: string; title: string; title_es?: string | null; price: number | null; currency: string; price_eur: number | null; beds: number | null; sqm: number | null; location: string; image: string | null; score: number; photo_quality: number | null; why: string[]; central?: boolean | null; distance_to_centre_km?: number | null; centre_fact?: string | null; centre_fact_es?: string | null };
export function closestMisses(all: any[], n = 4): Miss[] {
  return (all || [])
    // 9-nov-2026 (owner): a home that needs work is never offered, not even as "closest"
    .filter((r) => r && r.show !== true && r.source === "web" && r.photo_quality != null && r.score >= 60 && !(r.reasons || []).some((x: string) => /^flag:|^skip:/.test(x)) && !(r.flags || []).includes("needs_renovation"))
    .sort((a, b) => b.score - a.score).slice(0, n)
    .map((r) => ({
      id: r.id, url: r.url, title: r.title, title_es: r.title_es || null, price: r.price, currency: r.currency, price_eur: r.price_eur, beds: r.beds, sqm: r.sqm, location: r.location,
      image: r.image, score: r.score, photo_quality: r.photo_quality, central: r.central ?? null,
      distance_to_centre_km: r.distance_to_centre_km ?? null, centre_fact: r.centre_fact ?? null, centre_fact_es: r.centre_fact_es ?? null,
      why: (r.reasons || []).filter((x: string) => x === "photos" || x === "score" || x === "few_photos"),
    }));
}

// ---------------------------------------------------------------- the daily spending caps (v3)
/**
 * US$ of Claude per UTC day. A person (account) gets USER; one IP address gets IP in total, summed over every account
 * and anonymous use from it, so a new account from the same address does not start over; one network address (the
 * address Cloudflare sees, which a caller cannot fake) gets NET, a little more than IP because offices, universities
 * and phone networks share one. Everyone who is not an admin shares GLOBAL. Admins have their own ADMIN each and
 * ADMIN_POOL together, and none of the per-address caps.
 */
export const CAPS = { USER: 2, IP: 2, NET: 6, GLOBAL: 30, ADMIN: 15, ADMIN_POOL: 30 };
export type Spent = { admin: boolean; user: number; ip: number; net: number; all: number };
export function dayBudget(x: Spent, caps = CAPS): { budget: number; why: "user_budget" | "global_budget" | null; left: Record<string, number> } {
  const left: Record<string, number> = x.admin
    ? { user: caps.ADMIN - x.user, all: caps.ADMIN_POOL - x.all }
    : { user: caps.USER - x.user, ip: caps.IP - x.ip, net: caps.NET - x.net, all: caps.GLOBAL - x.all };
  const budget = Math.max(0, Math.min(...Object.values(left)));
  const tightest = Object.entries(left).sort((a, b) => a[1] - b[1])[0][0];
  // the person's own limit (their account, address or network) or everyone's: the page says which
  return { budget: Math.round(budget * 1e5) / 1e5, why: tightest === "all" ? "global_budget" : "user_budget", left };
}

// ---------------------------------------------------------------- answering from our own data
export type Have = { kind: "buy" | "rent"; country: string | null; place: string | null; price_eur: number | null; beds: number | null; sqm?: number | null; title?: string | null };
/** v3: what kind of home a title describes, when it says so ("Hillside chalet..." is a house, "Top-floor flat..." a flat). */
export function titleType(t: string | null | undefined): "house" | "apartment" | null {
  const x = norm(t || "");
  const flat = /\b(apartment|flat|condo|penthouse|studio|duplex|loft|piso|apartamento|atico)\b/.test(x);
  const house = /\b(house|chalet|villa|cottage|farmhouse|finca|townhouse|bungalow|cabin|casa|masia|cortijo)\b/.test(x);
  return flat && !house ? "apartment" : house && !flat ? "house" : null;
}
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
  // a flat was asked for: not a chalet (and a house, said in so many words, is not a flat)
  const tt = titleType(h.title);
  if (p.ptype === "apartment" && tt === "house") return false;
  if (p.ptype === "house" && !p.ptype_soft && tt === "apartment") return false;
  return true;
}

/** Age-restricted (55+) communities are cheap per m² but not open to most buyers: they are never shown as a top pick. */
// Also the best-known 55+ communities in South Florida by name (Century Village, Kings Point) and the MLS flag.
export const AGE_RESTRICTED = /\b55\s?\+|\b(55 and (over|older)|over 55|age[- ]restricted|age[- ]qualified|senior (community|living)|adult community|century village|kings point)\b|seniorCommunity(YN)?"\s*:\s*true/i;
// 8-nov-2026: also the remarks, style, fee and tax, so the AI check and the cost badge have the portal's own facts
export const CB_FACTS_RX = '"((?:subdivisionName|seniorCommunityYN|seniorCommunity|buildingName|publicRemarks|architectureStyle|bodyType|ownershipType|associationFee|associationFeeFrequency|taxAnnualAmount|yearBuilt|bathsTotal|bathroomsTotalInteger)"\\s*:\\s*(?:"[^"]{0,1500}"|-?[\\d.]+|true|false))';
export type CbFacts = { remarks: string; subdivision: string; senior: boolean; style: string; body: string; hoa: number | null; hoa_freq: string; tax: number | null; year: number | null; baths: number | null; text: string };
/** "DORSET AT CENTURY VILLAGE CONDO SEC 2" -> "Dorset at Century Village": an MLS subdivision as a place name. */
export function niceArea(s: string): string {
  const t = String(s || "").replace(/\btwnhms?\b|\btwnhs\b|\btwnhses\b/gi, "Townhomes").replace(/\bhts\b/gi, "Heights").replace(/\bests?\b/gi, "Estates").replace(/\bvlg\b/gi, "Village").replace(/\b(condo(minium)?s?|unit|units|sec(tion)?|phase|ph|addn?|addition|replat|resub|rev|revised|sub(div(ision)?)?|amd|amended|plat|pb|pg|no|bldg|blk|lot|tract|[ivx]{1,4}|\d+\w*)\b\.?/gi, " ")
    .replace(/[#,;:()]/g, " ").replace(/\s+/g, " ").trim();
  if (t.length < 3 || /^(none|unknown|n\/a|na|other|not in subdivision|no subdivision)$/i.test(t)) return "";
  return t.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase()).replace(/\b(At|Of|The|And|On|In)\b/g, (w) => w.toLowerCase()).replace(/^./, (c) => c.toUpperCase());
}
/** Reads the facts CB_FACTS_RX matched on a Coldwell Banker listing page. */
export function parseCbFacts(matches: string[] | null | undefined): CbFacts {
  const m = Array.isArray(matches) ? matches : [];
  const g = (k: string) => { for (const x of m) { const r = x.match(new RegExp(`^${k}"\\s*:\\s*(?:"([^"]*)"|([^,}]+))`)); if (r) return (r[1] ?? r[2] ?? "").trim(); } return ""; };
  const n = (k: string) => { const v = Number(g(k)); return Number.isFinite(v) && v > 0 ? v : null; };
  const freq = g("associationFeeFrequency").toLowerCase();
  let hoa = n("associationFee");
  if (hoa && /quarter/.test(freq)) hoa = Math.round(hoa / 3); else if (hoa && /annual|year/.test(freq)) hoa = Math.round(hoa / 12);
  const remarks = g("publicRemarks").replace(/\\r\\n|\\n|\\r/g, " ").replace(/\s+/g, " ").trim();
  return {
    remarks, subdivision: niceArea(g("subdivisionName")), senior: /seniorCommunity(YN)?"\s*:\s*true/.test(m.join(" ")), style: g("architectureStyle"), body: g("bodyType"), hoa, hoa_freq: freq, tax: n("taxAnnualAmount"),
    year: n("yearBuilt"), baths: n("bathsTotal") ?? n("bathroomsTotalInteger"), text: m.filter((x) => !/^publicRemarks/.test(x)).join("; ").slice(0, 900),
  };
}

/** Drops web results that clearly do not match what was asked (Claude sometimes adds near misses). */
export function withinAsk(it: { kind: "buy" | "rent"; price: number | null; currency: string; beds: number | null }, p: LiveQuery): boolean {
  if (it.kind !== p.kind) return false;
  const eur = toEur(it.price, it.currency);
  if (p.max_eur && eur && eur > p.max_eur * 1.02) return false;
  if (p.min_eur && eur && eur < p.min_eur * 0.98) return false;
  if (p.min_beds && it.beds != null && it.beds < p.min_beds) return false;
  return true;
}

// ---------------------------------------------------------------- which portals can be read
/** Portals our reader (realhunt-candidates "extract") can open, tested 8-nov-2026: Claude is asked to prefer them. */
export const READABLE_PORTALS = ["coldwellbanker.com", "pisos.com", "habitaclia.com", "thinkspain.com", "imovirtual.com", "bienici.com", "immowelt.de", "gate-away.com"];
/** Portals that block automatic reading: their listings can never pass the AI check, so they are not even tried. */
export const BLOCKED_PORTALS = /(^|\.)(idealista\.(com|pt|it)|fotocasa\.es|yaencontre\.com|zillow\.com|redfin\.com|homes\.com|realtor\.com|trulia\.com|casa\.sapo\.pt|supercasa\.pt|kyero\.com|green-acres\.\w+|spainhouses\.net|engelvoelkers\.com|rightmove\.co\.uk|zoopla\.co\.uk|immobiliare\.it|casa\.it|subito\.it|leboncoin\.fr|otodom\.pl|properstar\.\w+|immonet\.de)$/i;
export const blockedUrl = (u: string) => { try { return BLOCKED_PORTALS.test(new URL(u).hostname.replace(/^www\./, "")); } catch { return true; } };

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


// ---------------------------------------------------------------- 9-nov-2026: any query, any town in the world
// Owner: "tiene que aparecer cualquier ciudad o pueblo del mundo, como si fuera Google, que acepte todo; solo si no se
// encuentra nada se dice". The rule parser above knows a gazetteer; anything it cannot place (or cuts short, or
// refuses in another language) is read by a small model, then the place is found with a free geocoder.

export type Understood = {
  home: boolean; kind: "buy" | "rent" | null; place: string | null; region: string | null; country: string | null;
  country_code: string | null; central: boolean; min_beds: number | null; max_price: number | null; currency: string | null;
  ptype: "house" | "apartment" | "any" | null;
};

const CUT_RE = /^(de|del|de la|de las|de los|la|las|los|el|di|da|do|dos|das|del mar|sur|norte|on|upon|by|sur mer|am|an der|im|bei|al|al-|el-|beach|springs|city|bay|island|islands|mar|grande|nova|novo|nuevo|nueva|vieja|viejo|real|alta|alto)\b/;

/** Does the rule parser need help? Not understood, no country, or a place name it cut short ("Vejer" of "Vejer de la Frontera"). */
export function needsUnderstanding(p: LiveQuery, q: string): boolean {
  if (!p.ok) return p.reason === "not_homes" || p.reason === "no_place";
  if (!p.place) return !p.country;
  if (!p.country) return true;
  const n = norm(q), pl = norm(p.place);
  const i = n.indexOf(pl);
  if (i < 0) return true;
  const after = n.slice(i + pl.length).trim();
  return CUT_RE.test(after);
}

export function understandPrompt(q: string, tz: string | null): string {
  return [
    "A person typed this into a property search box (any language):",
    JSON.stringify(q),
    tz ? `Their time zone: ${tz} (use it only to pick between places with the same name).` : "",
    "Return only JSON, no prose:",
    '{"home":true|false,"kind":"buy"|"rent"|null,"place":"the town, city, district or area exactly as a map knows it, in its usual English or local spelling, without the country","region":"state/province/island or null","country":"country in English or null","country_code":"ISO 3166-1 alpha-2 or null","central":true|false,"min_beds":number|null,"max_price":number|null,"currency":"ISO 4217 of the budget or null","ptype":"house"|"apartment"|"any"|null}',
    "home: false only when it is clearly not about buying or renting homes, flats, land or property.",
    "central: true only when they explicitly ask for the city centre, old town or downtown (words like centro, centre, downtown, casco antiguo); a named neighbourhood is not central.",
    "If the place exists in several countries, pick the most likely from the words and time zone. Keep full names (\"Vejer de la Frontera\", \"Playa del Carmen\", \"Cangas de Onís\").",
  ].filter(Boolean).join("\n");
}

export function parseUnderstood(text: string): Understood | null {
  const m = String(text || "").match(/\{[\s\S]*\}/);
  if (!m) return null;
  let o: any; try { o = JSON.parse(m[0]); } catch { return null; }
  const str = (v: unknown) => (typeof v === "string" && v.trim() && v.trim().toLowerCase() !== "null" ? v.trim().slice(0, 80) : null);
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null);
  const cc = str(o.country_code);
  return {
    home: o.home !== false, kind: o.kind === "rent" ? "rent" : o.kind === "buy" ? "buy" : null,
    place: str(o.place), region: str(o.region), country: str(o.country), country_code: cc && /^[A-Za-z]{2}$/.test(cc) ? cc.toUpperCase() : null,
    central: o.central === true, min_beds: num(o.min_beds) && o.min_beds < 20 ? Math.round(o.min_beds) : null,
    max_price: num(o.max_price), currency: str(o.currency)?.toUpperCase() || null,
    ptype: o.ptype === "house" || o.ptype === "apartment" ? o.ptype : o.ptype === "any" ? "any" : null,
  };
}

export type GeoHit = { name: string; country: string; country_code: string; region: string | null; lat: number; lng: number; pop: number | null };
/** The best Open-Meteo result for what the model understood: same country, then same region, then the largest. */
export function pickGeo(results: any[], u: Pick<Understood, "country_code" | "region"> & { place?: string | null }): GeoHit | null {
  // the geocoder matches loosely ("Sumba" -> "Sumbar"): keep only the same name (accents and case aside)
  const want = u.place ? norm(u.place).replace(/[^a-z0-9]+/g, " ").trim() : "";
  const same = (n: unknown) => !want || norm(String(n || "")).replace(/[^a-z0-9]+/g, " ").trim() === want;
  const list = (Array.isArray(results) ? results : []).filter((r) => r && Number.isFinite(r.latitude) && Number.isFinite(r.longitude) && same(r.name));
  const inC = u.country_code ? list.filter((r) => String(r.country_code || "").toUpperCase() === u.country_code) : list;
  const pool = inC.length ? inC : u.country_code ? [] : list;
  if (!pool.length) return null;
  const reg = u.region ? norm(u.region) : "";
  const inR = reg ? pool.filter((r) => [r.admin1, r.admin2, r.admin3].some((a) => a && (norm(a).includes(reg) || reg.includes(norm(a))))) : [];
  const best = (inR.length ? inR : pool).slice().sort((a, b) => (b.population || 0) - (a.population || 0))[0];
  return { name: best.name, country: best.country, country_code: String(best.country_code || "").toUpperCase(), region: best.admin1 || null, lat: best.latitude, lng: best.longitude, pop: best.population || null };
}

const COUNTRY_FIX: Record<string, string> = { "United States of America": "United States", USA: "United States", UK: "United Kingdom", "Czech Republic": "Czechia", "Türkiye": "Turkey", Turkiye: "Turkey" };
/** Merges what the model understood (and where the geocoder put it) into the rule parse; numbers the rules read win. */
export function mergeUnderstood(p0: LiveQuery, u: Understood, g: GeoHit | null): LiveQuery {
  const p: LiveQuery = { ...p0 };
  // the rules already saw a home search ("casas en Qwertyland"): a place nobody can find is "no_place", not "not homes"
  if (!u.home) return { ...p, ok: false, reason: p0.ok || p0.reason === "no_place" ? "no_place" : "not_homes" };
  const place = g?.name || u.place || p.place;
  const country0 = g?.country || u.country || p.country;
  const country = country0 ? COUNTRY_FIX[country0] || country0 : null;
  // nowhere on the map: say so instead of searching the whole world
  if (!country) return { ...p, ok: false, reason: "no_place" };
  p.ok = true; delete p.reason;
  p.place = place; p.country = country; p.region = g?.region || u.region || null;
  p.state = null; p.city = null;
  if (country === "United States") {
    const st = Object.entries(US_STATES).find(([, n]) => p.region && norm(p.region) === n)?.[0] || null;
    p.state = st; p.city = place ? norm(place) : null;
  }
  if (g) { p.lat = g.lat; p.lng = g.lng; p.pop = g.pop; }
  if (u.kind && p.kind === "buy" && u.kind === "rent") p.kind = "rent";
  if (p.min_beds == null && u.min_beds != null) p.min_beds = u.min_beds;
  if (u.central) p.central = true;
  // 9-nov-2026 (owner: "3 bed home in madrid city centre" searched only "casas" and read 2 homes): the rules saw no
  // house word, so a "house" from the model ("home", "vivienda") is soft: flats count too
  if (p.ptype === "any" && u.ptype && u.ptype !== "any") { p.ptype = u.ptype; if (u.ptype === "house") p.ptype_soft = true; }
  if (p.max_price == null && u.max_price != null) p.max_price = u.max_price;
  if (!p.cur_typed) {
    const typed = u.currency && FX_TO_EUR[u.currency] && p0.max_price == null && u.max_price != null ? u.currency : null;
    p.currency = typed || (country && COUNTRY_CURRENCY[country]) || (country && EURO_LIKE.test(country) ? "EUR" : country ? "USD" : "EUR");
  }
  p.max_eur = toEur(p.max_price, p.currency);
  p.min_eur = toEur(p.min_price, p.currency);
  p.geo = "said";
  return p;
}
const EURO_LIKE = /^(Spain|Portugal|France|Italy|Germany|Greece|Ireland|Netherlands|Belgium|Austria|Finland|Croatia|Cyprus|Malta|Slovenia|Slovakia|Estonia|Latvia|Lithuania|Luxembourg|Andorra|Monaco|San Marino|Montenegro|Kosovo)$/;

/** One card per real home: listings with the same price, bedrooms, size and place are the same flat sold by two agencies. */
export function sameHomeOnce<T extends { price?: number | null; beds?: number | null; sqm?: number | null; location?: string | null; score?: number | null }>(rows: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const r of rows.slice().sort((a, b) => (b.score ?? 0) - (a.score ?? 0))) {
    const k = r.price && (r.sqm || r.beds) ? [r.price, r.beds ?? "", r.sqm ?? "", norm(r.location || "")].join("|") : null;
    if (k && seen.has(k)) continue;
    if (k) seen.add(k);
    out.push(r);
  }
  return rows.filter((r) => out.includes(r));
}
