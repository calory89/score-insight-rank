// FIND layer (7-nov-2026): natural-language search, typo-tolerant place suggestions, lifestyle chips and
// saved searches. Pure logic only (no React), so it is unit tested in src/test/smartsearch.test.ts.
// Everything maps onto the feed's existing URL params (country, type, price, min, beds, need, vibe, q,
// order, dmin), so the feed, the map and the Filters bar keep working exactly as before.

export const FX_TO_EUR = { usd: 0.896, gbp: 1.17, eur: 1 } as const;

// ---------------------------------------------------------------- text helpers
export const norm = (s: string) =>
  String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[øØ]/g, "o").replace(/æ/g, "ae").replace(/ß/g, "ss").replace(/ł/g, "l");

/** Optimal-string-alignment edit distance (insert, delete, substitute, swap two neighbours). */
export function editDistance(a: string, b: string, max = 3): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const m = a.length, n = b.length;
  let prev2: number[] = [], prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur[j] = v;
      if (v < best) best = v;
    }
    if (best > max) return max + 1;
    prev2 = prev; prev = cur;
  }
  return prev[n];
}
/** How many typos a word of this length may have and still match. */
export const typoBudget = (len: number) => (len >= 8 ? 2 : len >= 4 ? 1 : 0);

// ---------------------------------------------------------------- countries
// English names as stored in the data, plus the ways people type them (EN, ES, short forms).
const COUNTRY_NAMES: Record<string, string[]> = {
  Spain: ["spain", "espana"], Italy: ["italy", "italia"], "United States": ["united states", "usa", "us", "u.s.", "america", "estados unidos", "eeuu", "ee.uu."],
  Denmark: ["denmark", "dinamarca"], Sweden: ["sweden", "suecia"], France: ["france", "francia"], Japan: ["japan", "japon"],
  Poland: ["poland", "polonia"], Germany: ["germany", "alemania"], Netherlands: ["netherlands", "holland", "the netherlands", "paises bajos", "holanda"],
  Greece: ["greece", "grecia"], Switzerland: ["switzerland", "suiza"], Mexico: ["mexico"], Canada: ["canada"], Bulgaria: ["bulgaria"],
  "Dominican Republic": ["dominican republic", "republica dominicana"], Cyprus: ["cyprus", "chipre"], Portugal: ["portugal"],
  "United Kingdom": ["united kingdom", "uk", "england", "britain", "great britain", "reino unido", "inglaterra"], Scandinavia: ["scandinavia", "escandinavia"],
  Norway: ["norway", "noruega"], Croatia: ["croatia", "croacia"], Ireland: ["ireland", "irlanda"], Finland: ["finland", "finlandia"],
  Austria: ["austria"], Belgium: ["belgium", "belgica"], Hungary: ["hungary", "hungria"], Romania: ["romania", "rumania"], Turkey: ["turkey", "turquia"],
  Morocco: ["morocco", "marruecos"], Thailand: ["thailand", "tailandia"], Indonesia: ["indonesia"], "Costa Rica": ["costa rica"], Panama: ["panama"],
  Brazil: ["brazil", "brasil"], Argentina: ["argentina"], Malta: ["malta"], Albania: ["albania"], Montenegro: ["montenegro"], Slovenia: ["slovenia", "eslovenia"],
};
const COUNTRY_ALIAS = new Map<string, string>();
for (const [en, list] of Object.entries(COUNTRY_NAMES)) for (const a of list) COUNTRY_ALIAS.set(a, en);
// Short aliases must never be guessed through typo tolerance ("us" would match "is", "uk" "un"...).
const FUZZY_COUNTRY = Array.from(COUNTRY_ALIAS.entries()).filter(([a]) => a.length >= 5 && !a.includes("."));

export function countryOf(word: string): string | null {
  const w = norm(word).trim();
  if (!w) return null;
  const hit = COUNTRY_ALIAS.get(w);
  if (hit) return hit;
  const budget = typoBudget(w.length);
  if (!budget || /\d/.test(w)) return null;
  let best: [string, number] | null = null;
  for (const [alias, en] of FUZZY_COUNTRY) {
    if (alias.includes(" ") !== w.includes(" ")) continue;
    const d = editDistance(w, alias, budget);
    if (d <= budget && (!best || d < best[1])) best = [en, d];
  }
  return best ? best[0] : null;
}

// ---------------------------------------------------------------- places from the data (autocomplete + parser)
export type Place = { name: string; country: string; kind: "country" | "region" | "town"; n: number; key: string };
type RowLike = { country?: string | null; location_name?: string | null; approved_at?: string | null };

export function buildPlaces(rows: RowLike[]): Place[] {
  const map = new Map<string, Place>();
  const add = (name: string, country: string, kind: Place["kind"]) => {
    const key = norm(name) + "|" + country;
    const e = map.get(key);
    if (e) { e.n++; if (kind === "region" && e.kind === "town") e.kind = "region"; }
    else map.set(key, { name, country, kind, n: 1, key: norm(name) });
  };
  for (const r of rows) {
    const country = String(r.country || "").trim();
    if (!country) continue;
    add(country, country, "country");
    const parts = String(r.location_name || "").replace(/\s*\([^)]*\)/g, "").split(",").map((p) => p.trim()).filter((p) => p && norm(p) !== norm(country));
    const seen = new Set<string>();
    parts.forEach((p, i) => {
      const k = norm(p); if (seen.has(k) || /\d/.test(p) || p.length < 3) return; seen.add(k);
      add(p, country, i === parts.length - 1 && parts.length > 1 ? "region" : "town");
    });
  }
  return Array.from(map.values());
}

export type Suggestion = Place & { score: number };
/** Places whose name starts with, contains, or is a small typo away from the query. */
export function suggestPlaces(query: string, places: Place[], limit = 6): Suggestion[] {
  const q = norm(query).trim().replace(/\s+/g, " ");
  if (q.length < 2) return [];
  const budget = typoBudget(q.length);
  const out: Suggestion[] = [];
  for (const p of places) {
    const name = p.key;
    let score = -1;
    if (name === q) score = 0;
    else if (name.startsWith(q)) score = 1;
    else if (name.split(/[\s-]+/).some((w) => w.startsWith(q))) score = 2;
    else if (q.length >= 3 && name.includes(q)) score = 3;
    else if (budget) {
      // typo against the whole name, or against its first q.length letters while still typing
      const d = Math.min(editDistance(q, name, budget), q.length >= 4 && name.length > q.length ? editDistance(q, name.slice(0, q.length), budget) : 9);
      if (d <= budget) score = 4 + d;
    }
    if (score >= 0) out.push({ ...p, score });
  }
  const kindRank = { country: 0, region: 1, town: 2 } as const;
  return out.sort((a, b) => a.score - b.score || kindRank[a.kind] - kindRank[b.kind] || b.n - a.n || a.name.localeCompare(b.name)).slice(0, limit);
}
export const placeLabel = (p: Place) => (p.kind === "country" ? p.name : `${p.name}, ${p.country}`);

// ---------------------------------------------------------------- the parser
export type Chip = { id: string; label: string; param: string; value: string };
export type Parsed = {
  country: string[];
  place: string | null;
  max_price: number | null;
  min_price: number | null;
  min_beds: number | null;
  category: string | null;
  need: string[];
  vibe: string[];
  dmin: Record<string, number>;
  words: string[];
  /** free words no listing contains (only when parseQuery gets a `known` check); left out of the search */
  ignored: string[];
  sort: string | null;
  /** style / condition words ("moderna", "renovated", "luxury"): understood as wishes, never a place and never a text filter */
  style?: string[];
  /** true when anything beyond free words was understood */
  structured: boolean;
};

const NUM_WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6 };
const BED_RE = /(\d+|one|two|three|four|five|six|uno|una|un|dos|tres|cuatro|cinco|seis)\s*\+?\s*-?\s*(bedrooms?|beds?|bdrms?|bd|br|dormitorios?|dorms?|habitaciones|habitacion|habs?|cuartos?|recamaras?)\b(\s*(or more|o mas|\+))?/g;
const AMT = String.raw`([$£€])?\s*(\d+(?:[.,]\d+)*)\s*(k|m|mil|millones|millon|million|thousand)?(?![\w²])\s*(?:(€|euros?|eur|\$|usd|us\$|dollars?|dolares|£|gbp|pounds?|libras?)(?!\w))?`;
const MAX_KW = String.raw`(?:under|below|less than|max(?:imum)?|up to|upto|at most|cheaper than|no more than|budget(?: of)?|hasta|menos de|por debajo de|maximo(?: de)?|como maximo|<)`;
const MIN_KW = String.raw`(?:over|above|more than|from|at least|min(?:imum)?|starting at|mas de|desde|minimo(?: de)?|a partir de|>)`;

function amount(sym: string | undefined, digits: string, suffix: string | undefined, cur: string | undefined): number | null {
  let s = digits;
  const mult = !suffix ? 1 : /^(k|mil|thousand)$/.test(suffix) ? 1e3 : 1e6;
  // "100.000" / "100,000" / "1.250.000": groups of three after the separator are thousands;
  // otherwise the separator is a decimal point ("1.5m", "1,5 millones").
  if (/^\d{1,3}([.,]\d{3})+$/.test(s)) s = s.replace(/[.,]/g, "");
  else s = s.replace(",", ".");
  let n = Number(s);
  if (!Number.isFinite(n)) return null;
  n *= mult;
  const c = (sym || cur || "").toLowerCase();
  if (c === "$" || /usd|dollar|dolar|us\$/.test(c)) n *= FX_TO_EUR.usd;
  else if (c === "£" || /gbp|pound|libra/.test(c)) n *= FX_TO_EUR.gbp;
  return Math.round(n);
}

// Words that carry no filter meaning on their own.
const STOP = new Set([
  "a", "an", "the", "in", "on", "at", "of", "for", "to", "with", "and", "or", "near", "by", "close", "next", "around", "i", "want", "looking", "look", "find", "me", "show", "buy", "sale", "for sale", "some", "any", "my", "that", "which", "has", "have", "is", "are", "than", "less", "more", "price", "priced", "euro", "euros", "eur", "€", "$", "£",
  "house", "houses", "home", "homes", "property", "properties", "place", "real", "estate", "listing", "listings", "bedroom", "bedrooms", "bed", "beds",
  "casa", "casas", "vivienda", "viviendas", "inmueble", "propiedad", "propiedades", "en", "la", "el", "los", "las", "de", "del", "con", "y", "o", "al", "por", "para", "un", "una", "cerca", "junto", "venta", "comprar", "busco", "quiero", "menos", "mas", "que", "precio",
]);

type Act = { category?: string; need?: string; vibe?: string; word?: string; dmin?: [string, number]; sort?: string };
// Multi-word phrases first, then single words. "word" values are canonical search words (see SYNONYMS).
const PHRASES: [string, Act][] = [
  ["near the sea", { category: "beach" }], ["by the sea", { category: "beach" }], ["close to the sea", { category: "beach" }], ["near the beach", { category: "beach" }], ["on the beach", { category: "beach" }],
  ["sea view", { category: "beach" }], ["sea views", { category: "beach" }], ["cerca del mar", { category: "beach" }], ["junto al mar", { category: "beach" }], ["cerca de la playa", { category: "beach" }], ["vistas al mar", { category: "beach" }],
  ["ready to move in", { dmin: ["condition", 88] }], ["move in ready", { dmin: ["condition", 88] }], ["move-in ready", { dmin: ["condition", 88] }], ["turnkey", { dmin: ["condition", 88] }], ["para entrar a vivir", { dmin: ["condition", 88] }], ["lista para entrar", { dmin: ["condition", 88] }], ["listo para entrar", { dmin: ["condition", 88] }],
  ["new build", { category: "new_build" }], ["obra nueva", { category: "new_build" }], ["to renovate", { category: "renovation" }], ["a reformar", { category: "renovation" }], ["para reformar", { category: "renovation" }],
  ["swimming pool", { need: "pool" }], ["city centre", { category: "city" }], ["city center", { category: "city" }],
];
const WORDS: Record<string, Act> = {
  sea: { category: "beach" }, beach: { category: "beach" }, coast: { category: "beach" }, coastal: { category: "beach" }, seaside: { category: "beach" }, ocean: { category: "beach" }, beachfront: { category: "beach" }, seafront: { category: "beach" },
  mar: { category: "beach" }, playa: { category: "beach" }, costa: { category: "beach" },
  lake: { vibe: "lake" }, lakeside: { vibe: "lake" }, lago: { vibe: "lake" },
  mountain: { word: "mountain" }, mountains: { word: "mountain" }, montana: { word: "mountain" }, montanas: { word: "mountain" }, sierra: { word: "mountain" }, alps: { word: "mountain" }, ski: { word: "mountain" },
  garden: { need: "garden" }, gardens: { need: "garden" }, yard: { need: "garden" }, jardin: { need: "garden" },
  pool: { need: "pool" }, piscina: { need: "pool" }, sauna: { need: "sauna" }, terrace: { need: "terrace" }, terraza: { need: "terrace" },
  view: { need: "views" }, views: { need: "views" }, vistas: { need: "views" }, fireplace: { need: "fireplace" }, chimenea: { need: "fireplace" }, garage: { need: "garage" }, garaje: { need: "garage" },
  village: { category: "village" }, countryside: { category: "village" }, rural: { category: "village" }, campo: { category: "village" }, pueblo: { category: "village" }, aldea: { category: "village" },
  city: { category: "city" }, urban: { category: "city" }, ciudad: { category: "city" }, downtown: { category: "city" },
  land: { category: "land" }, plot: { category: "land" }, terreno: { category: "land" }, solar: { category: "land" },
  renovation: { category: "renovation" }, renovate: { category: "renovation" }, fixer: { category: "renovation" }, ruin: { category: "renovation" }, ruina: { category: "renovation" }, reformar: { category: "renovation" },
  apartment: { word: "apartment" }, apartments: { word: "apartment" }, flat: { word: "apartment" }, condo: { word: "apartment" }, piso: { word: "apartment" }, apartamento: { word: "apartment" }, departamento: { word: "apartment" },
  farmhouse: { word: "farm" }, farm: { word: "farm" }, finca: { word: "farm" }, cortijo: { word: "farm" }, masseria: { word: "farm" }, granja: { word: "farm" }, masia: { word: "farm" },
  cabin: { word: "cabin" }, cabana: { word: "cabin" }, cottage: { word: "cabin" }, chalet: { word: "chalet" }, villa: { word: "villa" }, townhouse: { word: "townhouse" }, studio: { word: "studio" }, estudio: { word: "studio" },
  stone: { word: "stone" }, piedra: { word: "stone" }, castle: { word: "castle" }, castillo: { word: "castle" }, island: { word: "island" }, isla: { word: "island" },
  cheap: { sort: "price_asc" }, cheapest: { sort: "price_asc" }, affordable: { sort: "price_asc" }, budget: { sort: "price_asc" }, barata: { sort: "price_asc" }, barato: { sort: "price_asc" }, baratas: { sort: "price_asc" }, baratos: { sort: "price_asc" }, economica: { sort: "price_asc" }, economico: { sort: "price_asc" },
};
// Style and condition words (8-nov-2026, owner: "casas en madrid moderna" must find Madrid, not "Madrid Moderna" or Modena).
// They are kept as wishes (Parsed.style) and never become a place, a typo-tolerant place or a must-contain word.
const STYLE_GROUPS: Record<string, string[]> = {
  modern: ["modern", "moderna", "moderno", "modernas", "modernos", "contemporary", "contemporanea", "contemporaneo"],
  new: ["new", "nueva", "nuevo", "nuevas", "nuevos", "brand", "estrenar"],
  renovated: ["renovated", "reformada", "reformado", "reformadas", "reformados", "renovada", "renovado", "refurbished", "remodeled", "remodelled", "updated"],
  luxury: ["luxury", "luxurious", "lujo", "lujosa", "lujoso"],
  central: ["central", "centrally", "centrica", "centrico", "centricas", "centricos"],
  beautiful: ["beautiful", "pretty", "lovely", "bonita", "bonito", "bonitas", "bonitos", "preciosa", "precioso"],
  cozy: ["cozy", "cosy", "acogedora", "acogedor"], spacious: ["spacious", "amplia", "amplio"], bright: ["bright", "luminosa", "luminoso"],
  sunny: ["sunny", "soleada", "soleado"], furnished: ["furnished", "amueblada", "amueblado"], detached: ["detached", "independiente"],
};
/** typed word -> the English word listings use */
export const STYLE_WORDS = new Map<string, string>(Object.entries(STYLE_GROUPS).flatMap(([en, l]) => l.map((w) => [w, en] as const)));
import { SYNONYMS, wordMatches } from "@/lib/synonyms";
import { fixBedWords } from "../../supabase/functions/realhunt-live-search/words";
export { SYNONYMS, wordMatches };

export function parseQuery(input: string, places: Place[] = [], known?: (word: string) => boolean): Parsed {
  const out: Parsed = { country: [], place: null, max_price: null, min_price: null, min_beds: null, category: null, need: [], vibe: [], dmin: {}, words: [], ignored: [], sort: null, structured: false };
  // 8-nov-2026: a misspelt bedroom word after a number ("3 habtiacioens", "2 bedromms") counts too
  let s = " " + fixBedWords(norm(input).replace(/[“”"¿?¡!;]/g, " ").replace(/\s+/g, " ")) + " ";

  // 1. bedrooms ("3 bedroom", "2 bed", "3-bed", "tres dormitorios")
  s = s.replace(BED_RE, (_m, n) => { const v = NUM_WORDS[n] ?? Number(n); if (v > 0 && v < 20) out.min_beds = Math.max(out.min_beds || 0, v); return " "; });

  // 2. price ranges, then max, then min, then a bare amount with a currency or k/m (read as a budget)
  const range = new RegExp(String.raw`(?:between|entre|from|de|desde)?\s*${AMT}\s*(?:-|to|and|y|a|hasta)\s*${AMT}`, "g");
  s = s.replace(range, (m, s1, d1, x1, c1, s2, d2, x2, c2) => {
    // "100-200k": the suffix and currency of the second amount apply to the first one too
    const a = amount(s1 || s2, d1, x1 || x2, c1 || c2), b = amount(s2 || s1, d2, x2 || x1, c2 || c1);
    if (a == null || b == null || Math.max(a, b) < 1000) return m;
    out.min_price = Math.min(a, b); out.max_price = Math.max(a, b); return " ";
  });
  s = s.replace(new RegExp(MAX_KW + String.raw`\s*` + AMT, "g"), (m, s1, d, x, c) => { const v = amount(s1, d, x, c); if (v == null || v < 1000) return m; out.max_price = v; return " "; });
  s = s.replace(new RegExp(MIN_KW + String.raw`\s*` + AMT, "g"), (m, s1, d, x, c) => { const v = amount(s1, d, x, c); if (v == null || v < 1000) return m; out.min_price = v; return " "; });
  s = s.replace(new RegExp(AMT + String.raw`\s*(\+|or more|o mas|and up|plus)`, "g"), (m, s1, d, x, c) => { const v = amount(s1, d, x, c); if (v == null || v < 1000) return m; out.min_price = v; return " "; });
  s = s.replace(new RegExp(AMT, "g"), (m, s1, d, x, c) => {
    if (!s1 && !x && !c && !/^\d{1,3}([.,]\d{3})+$/.test(d) && Number(d) < 10000) return m;
    const v = amount(s1, d, x, c); if (v == null || v < 1000) return m;
    if (out.max_price == null) out.max_price = v; return " ";
  });

  // 3. phrases
  const apply = (a: Act) => {
    if (a.category && !out.category) out.category = a.category;
    if (a.need && !out.need.includes(a.need)) out.need.push(a.need);
    if (a.vibe && !out.vibe.includes(a.vibe)) out.vibe.push(a.vibe);
    if (a.word && !out.words.includes(a.word)) out.words.push(a.word);
    if (a.dmin) out.dmin[a.dmin[0]] = a.dmin[1];
    if (a.sort) out.sort = a.sort;
  };
  for (const [p, a] of PHRASES) { const re = new RegExp(`(^|\\s)${p.replace(/[-]/g, "\\-")}(?=\\s|$)`, "g"); if (re.test(s)) { apply(a); s = s.replace(re, " "); } }

  // 4. word by word: multi-word countries and places first (longest n-gram wins)
  const toks = s.split(/[\s,./]+/).filter(Boolean).filter((w) => !/^[$£€]+$/.test(w));
  const placeByKey = new Map<string, Place>();
  for (const p of places) if (p.kind !== "country") { const e = placeByKey.get(p.key); if (!e || p.n > e.n) placeByKey.set(p.key, p); }
  const GENERIC = new Set(["north", "south", "east", "west", "central", "county", "park", "valley", "hills", "golf", "resort", "island", "santa", "saint", "city", "town", "upper", "lower", "great", "little", "grand", "port", "lake", "beach", "costa", "mount", "green", "river", "harbour", "harbor", "garden", "gardens", "tower", "towers", "plaza", "creek", "point", "heights", "village", "nuevo", "nueva", "real", "alto", "alta", "bajo", "baja", "playa", "puerto"]);
  const placeWords = new Map<string, string>();
  for (const p of placeByKey.values()) p.name.split(/[\s-]+/).forEach((part) => { const k = norm(part); if (k.length >= 4 && !STOP.has(k) && !WORDS[k] && !GENERIC.has(k) && !placeWords.has(k)) placeWords.set(k, part); });
  const fuzzyPlace = (w: string): Place | null => {
    const budget = typoBudget(w.length);
    // only regions, and only longer words: a typo-tolerant match against every small town would turn
    // ordinary words into places ("quiet" -> "Quint")
    if (budget < 1 || w.length < 6) return null;
    let best: [Place, number] | null = null;
    for (const p of placeByKey.values()) { if ((p.kind !== "region" && p.n < 3) || p.key.includes(" ") !== w.includes(" ")) continue; const d = editDistance(w, p.key, budget); if (d <= budget && (!best || d < best[1] || (d === best[1] && p.n > best[0].n))) best = [p, d]; }
    return best ? best[0] : null;
  };
  for (let i = 0; i < toks.length; ) {
    let used = 0;
    for (let n = Math.min(3, toks.length - i); n >= 1 && !used; n--) {
      const g = toks.slice(i, i + n).join(" ");
      if (n === 1 && (STOP.has(g) || WORDS[g] || STYLE_WORDS.has(g))) break;
      const c = COUNTRY_ALIAS.get(g);
      if (c) { if (!out.country.includes(c)) out.country.push(c); used = n; break; }
      const p = placeByKey.get(g);
      if (p && !out.place) { out.place = p.name; used = n; break; }
    }
    if (used) { i += used; continue; }
    const w = toks[i];
    if (WORDS[w]) { apply(WORDS[w]); i++; continue; }
    if (STYLE_WORDS.has(w)) {
      const en = STYLE_WORDS.get(w)!;
      if (!(out.style ||= []).includes(w)) out.style.push(w);
      // a wish, never a place: kept as an English search word only when some listing says it
      if (known && !known(en)) { if (!out.ignored.includes(w)) out.ignored.push(w); } else if (known && !out.words.includes(en)) out.words.push(en);
      i++; continue;
    }
    if (STOP.has(w) || /^\d+$/.test(w) || w.length < 2) { i++; continue; }
    const c = countryOf(w);
    if (c) { if (!out.country.includes(c)) out.country.push(c); i++; continue; }
    // a word that is part of place names ("Miami" in "Miami-Dade" and "Miami Beach") is a place too
    if (!out.place && w.length >= 4 && placeWords.has(w)) { out.place = placeWords.get(w)!; i++; continue; }
    const fp = !out.place ? fuzzyPlace(w) : null;
    if (fp) { out.place = fp.name; i++; continue; }
    if (known && !known(w)) { if (!out.ignored.includes(w)) out.ignored.push(w); }
    else if (!out.words.includes(w)) out.words.push(w);
    i++;
  }
  out.structured = !!(out.country.length || out.place || out.max_price || out.min_price || out.min_beds || out.category || out.need.length || out.vibe.length || Object.keys(out.dmin).length || out.sort || out.ignored.length ||
    out.words.some((w) => SYNONYMS[w]));
  return out;
}

// ---------------------------------------------------------------- URL params
/** The feed keys a search may set. Anything else in the URL (tabs, utm...) is left alone. */
export const FILTER_KEYS = ["country", "type", "price", "min", "beds", "need", "vibe", "q", "order", "dmin", "score", "sqm", "drop", "costs", "fresh", "fee", "sea", "air", "quiet", "ptype"] as const;
const list = (v: string | null) => (v || "").split(",").map((x) => x.trim()).filter(Boolean);

/** Applies a parsed search onto the current URL: the new search replaces the old words, and every filter it
 * understood replaces that filter. Filters it did not mention (e.g. a country chip) stay on. */
export function applyParsed(base: URLSearchParams, p: Parsed): URLSearchParams {
  const next = new URLSearchParams(base);
  next.delete("search");
  const q = [p.place, ...p.words].filter(Boolean).join(" ");
  q ? next.set("q", q) : next.delete("q");
  if (p.country.length) next.set("country", p.country.join(","));
  if (p.category) next.set("type", p.category);
  if (p.max_price) next.set("price", String(p.max_price));
  if (p.min_price) next.set("min", String(p.min_price));
  if (p.max_price && !p.min_price && Number(next.get("min")) >= p.max_price) next.delete("min");
  if (p.min_beds) next.set("beds", String(p.min_beds));
  if (p.need.length) next.set("need", Array.from(new Set([...list(next.get("need")), ...p.need])).join(","));
  if (p.vibe.length) next.set("vibe", Array.from(new Set([...list(next.get("vibe")), ...p.vibe])).join(","));
  if (Object.keys(p.dmin).length) {
    const d = Object.fromEntries(list(next.get("dmin")).map((x) => x.split(":")).map(([k, v]) => [k, Number(v) || 0]));
    Object.assign(d, p.dmin);
    next.set("dmin", Object.entries(d).map(([k, v]) => `${k}:${v}`).join(","));
  }
  if (p.sort) next.set("order", p.sort);
  return next;
}

const eur = (n: number) => "€" + Math.round(n).toLocaleString("en-GB");
const CAT_LABEL: Record<string, string> = { beach: "near the sea", village: "countryside and villages", city: "in a city", land: "land", renovation: "to renovate", new_build: "new build", other: "other" };
const NEED_LABEL: Record<string, string> = { garden: "with a garden", pool: "with a pool", sauna: "with a sauna", terrace: "with a terrace", views: "with views", fireplace: "with a fireplace", garage: "with a garage", water: "near water", land: "with land", cellar: "with a cellar", outbuildings: "with outbuildings" };
const VIBE_LABEL: Record<string, string> = { lake: "by a lake", stone: "stone", sauna: "with a sauna", terrace: "big terrace" };
const ORDER_LABEL: Record<string, string> = { price_asc: "cheapest first", new: "newest first", ppsqm: "lowest price per m²", sqm: "biggest first", airport: "nearest airport" };
const DMIN_LABEL: Record<string, string> = { condition: "ready to move in", water: "sea and lakes", access: "near an airport", space: "big", costs: "low buying costs" };
const WORD_LABEL: Record<string, string> = { mountain: "mountains", apartment: "apartments", farm: "farmhouses", cabin: "cabins and cottages" };

/** Human chips for the filters in a URL, in reading order. Each can be removed on its own (removeChip). */
export function describeParams(sp: URLSearchParams): Chip[] {
  const chips: Chip[] = [];
  for (const c of list(sp.get("country"))) chips.push({ id: "country:" + c, label: c, param: "country", value: c });
  const min = Number(sp.get("min")) || 0, max = Number(sp.get("price")) || 0;
  if (min && max) chips.push({ id: "range", label: `${eur(min)} to ${eur(max)}`, param: "min,price", value: "" });
  else if (max) chips.push({ id: "price", label: `under ${eur(max)}`, param: "price", value: "" });
  else if (min) chips.push({ id: "min", label: `over ${eur(min)}`, param: "min", value: "" });
  const beds = Number(sp.get("beds")) || 0;
  if (beds) chips.push({ id: "beds", label: `${beds}+ ${beds === 1 ? "bedroom" : "bedrooms"}`, param: "beds", value: "" });
  const type = sp.get("type");
  if (type) chips.push({ id: "type", label: CAT_LABEL[type] || type, param: "type", value: "" });
  for (const n of list(sp.get("need"))) chips.push({ id: "need:" + n, label: NEED_LABEL[n] || n, param: "need", value: n });
  for (const v of list(sp.get("vibe"))) chips.push({ id: "vibe:" + v, label: VIBE_LABEL[v] || v, param: "vibe", value: v });
  for (const d of list(sp.get("dmin"))) { const k = d.split(":")[0]; chips.push({ id: "dmin:" + k, label: DMIN_LABEL[k] || k, param: "dmin", value: d }); }
  const q = (sp.get("q") || "").trim();
  if (q) for (const w of q.split(/\s+/)) chips.push({ id: "q:" + w, label: WORD_LABEL[w.toLowerCase()] || w.replace(/^./, (c) => c.toUpperCase()), param: "q", value: w });
  const score = Number(sp.get("score")) || 0;
  if (score) chips.push({ id: "score", label: `score ${score}+`, param: "score", value: "" });
  const sqm = Number(sp.get("sqm")) || 0;
  if (sqm) chips.push({ id: "sqm", label: `${sqm} m²+`, param: "sqm", value: "" });
  if (sp.get("drop") === "1") chips.push({ id: "drop", label: "price dropped", param: "drop", value: "" });
  const costs = sp.get("costs");
  if (costs === "known" || costs === "nofee") chips.push({ id: "costs", label: costs === "known" ? "fee or tax stated" : "no community fee", param: "costs", value: "" });
  if (sp.get("fresh") === "1") chips.push({ id: "fresh", label: "confirmed in the last 30 days", param: "fresh", value: "" });
  const order = sp.get("order");
  if (order && ORDER_LABEL[order]) chips.push({ id: "order", label: ORDER_LABEL[order], param: "order", value: "" });
  return chips;
}
/** Places in a q text are kept together as one chip ("Lake Como"), so they are removed as one. */
export function describeParamsWithPlaces(sp: URLSearchParams, places: Place[]): Chip[] {
  const chips = describeParams(sp);
  const q = (sp.get("q") || "").trim();
  if (!q) return chips;
  const keys = new Set(places.filter((p) => p.kind !== "country").map((p) => p.key));
  const words = q.split(/\s+/);
  for (let n = Math.min(3, words.length); n >= 2; n--) for (let i = 0; i + n <= words.length; i++) {
    const g = words.slice(i, i + n).join(" ");
    if (keys.has(norm(g))) {
      const first = chips.findIndex((c) => c.id === "q:" + words[i]);
      const rest = words.slice(i + 1, i + n).map((w) => "q:" + w);
      if (first < 0) continue;
      const name = places.find((p) => p.key === norm(g))?.name || g;
      chips.splice(first, 1, { id: "q:" + g, label: name, param: "q", value: g });
      for (const id of rest) { const k = chips.findIndex((c) => c.id === id); if (k >= 0) chips.splice(k, 1); }
      return chips;
    }
  }
  return chips;
}

export function removeChip(sp: URLSearchParams, chip: Chip): URLSearchParams {
  const next = new URLSearchParams(sp);
  next.delete("search");
  for (const param of chip.param.split(",")) {
    if (!chip.value) { next.delete(param); continue; }
    if (param === "q") {
      const q = (next.get("q") || "").replace(new RegExp(`(^|\\s)${chip.value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=\\s|$)`, "i"), " ").replace(/\s+/g, " ").trim();
      q ? next.set("q", q) : next.delete("q");
      continue;
    }
    const l = list(next.get(param)).filter((x) => x !== chip.value);
    l.length ? next.set(param, l.join(",")) : next.delete(param);
  }
  return next;
}

/** Only the filter part of a URL, with keys in a fixed order, so the same search always has the same key. */
export function canonicalSearch(sp: URLSearchParams): string {
  const out = new URLSearchParams();
  for (const k of [...FILTER_KEYS].sort()) { const v = sp.get(k); if (v && !(k === "order" && v === "score")) out.set(k, v); }
  return out.toString();
}

/** URL params -> the feed() params the home page sends (same rules as Home in Community.tsx). */
export function paramsToFeed(sp: URLSearchParams, vibeTerms: Record<string, string> = {}) {
  const n = (k: string) => Number(sp.get(k)) || null;
  return {
    scope: "all", country: sp.get("country") || "", category: sp.get("type") || "", max_price: n("price"), min_price: n("min"), min_beds: n("beds"),
    price_drop: sp.get("drop") === "1", min_sqm: n("sqm"), sort: sp.get("order") || "score", min_score: n("score"), q: sp.get("q") || "",
    need: list(sp.get("need")), terms: list(sp.get("vibe")).map((k) => vibeTerms[k]).filter(Boolean),
    dim_min: Object.fromEntries(list(sp.get("dmin")).map((x) => { const [k, v] = x.split(":"); return [k, Number(v) || 0]; })),
    costs: sp.get("costs") === "known" || sp.get("costs") === "nofee" ? sp.get("costs")! : "", fresh: sp.get("fresh") === "1",
  };
}

// ---------------------------------------------------------------- lifestyle chips
export type Lifestyle = { k: string; label: string; param: string; value: string };
export const LIFESTYLES: Lifestyle[] = [
  { k: "beach", label: "Beach", param: "type", value: "beach" },
  { k: "country", label: "Countryside", param: "type", value: "village" },
  { k: "mountain", label: "Mountains", param: "q", value: "mountain" },
  { k: "lake", label: "Lake", param: "vibe", value: "lake" },
  { k: "city", label: "City", param: "type", value: "city" },
  // "Remote work" needs an internet-speed field; the data has none yet, so that chip is left out.
  { k: "u100", label: "Under €100k", param: "price", value: "100000" },
  { k: "ready", label: "Ready to move in", param: "dmin", value: "condition:88" },
];
export function lifestyleOn(sp: URLSearchParams, l: Lifestyle): boolean {
  if (l.param === "q") return (sp.get("q") || "").toLowerCase().split(/\s+/).includes(l.value);
  if (l.param === "vibe" || l.param === "dmin") return list(sp.get(l.param)).includes(l.value);
  if (l.param === "price") return sp.get("price") === l.value && !sp.get("min");
  return sp.get(l.param) === l.value;
}
export function toggleLifestyle(sp: URLSearchParams, l: Lifestyle): URLSearchParams {
  const next = new URLSearchParams(sp);
  next.delete("search");
  const on = lifestyleOn(sp, l);
  if (l.param === "q") {
    const words = (next.get("q") || "").split(/\s+/).filter(Boolean).filter((w) => w.toLowerCase() !== l.value);
    if (!on) words.push(l.value);
    words.length ? next.set("q", words.join(" ")) : next.delete("q");
  } else if (l.param === "vibe" || l.param === "dmin") {
    const key = (x: string) => (l.param === "dmin" ? x.split(":")[0] : x);
    const cur = list(next.get(l.param)).filter((x) => key(x) !== key(l.value));
    if (!on) cur.push(l.value);
    cur.length ? next.set(l.param, cur.join(",")) : next.delete(l.param);
  } else if (l.param === "price") {
    if (on) next.delete("price"); else { next.set("price", l.value); next.delete("min"); }
  } else on ? next.delete(l.param) : next.set(l.param, l.value);
  return next;
}

// ---------------------------------------------------------------- saved searches (this device only)
export type SavedSearch = { id: string; qs: string; label: string; created: string; opened: string };
export const SAVED_KEY = "rh.savedSearches.v1";
export function loadSaved(store: Pick<Storage, "getItem"> | null = safeStore()): SavedSearch[] {
  try { const v = JSON.parse(store?.getItem(SAVED_KEY) || "[]"); return Array.isArray(v) ? v.filter((x) => x && typeof x.qs === "string") : []; } catch { return []; }
}
export function storeSaved(list: SavedSearch[], store: Pick<Storage, "setItem"> | null = safeStore()) {
  try { store?.setItem(SAVED_KEY, JSON.stringify(list.slice(0, 30))); } catch { /* private mode or full */ }
}
function safeStore(): Storage | null { try { return typeof localStorage !== "undefined" ? localStorage : null; } catch { return null; } }
export function addSaved(list: SavedSearch[], qs: string, label: string, now = new Date()): SavedSearch[] {
  if (!qs || list.some((s) => s.qs === qs)) return list;
  const at = now.toISOString();
  return [{ id: Math.abs(hash(qs)).toString(36), qs, label, created: at, opened: at }, ...list];
}
export const markOpened = (list: SavedSearch[], qs: string, now = new Date()) => list.map((s) => (s.qs === qs ? { ...s, opened: now.toISOString() } : s));
export const removeSaved = (list: SavedSearch[], qs: string) => list.filter((s) => s.qs !== qs);
/** Homes approved after the search was last opened. */
export function countNew(rows: RowLike[], since: string): number {
  const t = Date.parse(since) || 0;
  return rows.filter((r) => (Date.parse(r.approved_at || "") || 0) > t).length;
}
function hash(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }
/** A link to the email alerts page with what it can take from the search (one country, a max price). */
export function alertsLink(sp: URLSearchParams): string {
  const out = new URLSearchParams();
  const c = list(sp.get("country"));
  if (c.length === 1) out.set("country", c[0]);
  if (sp.get("price")) out.set("max", sp.get("price")!);
  const qs = out.toString();
  return "/alerts" + (qs ? "?" + qs : "");
}
