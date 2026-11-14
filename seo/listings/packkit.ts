// What the language packs added on 15-nov-2026 (German, Russian, French, Dutch, Polish) share: where the translated
// home titles and the translated buying rules live, how a place name is taken, and the gate that keeps English out.
//
// These languages have no texts in the database. A home's title in one of them is written by a person and kept in
// seo/listings/titles.<lang>.json: { "<slug>": { "en": "<English title it was translated from>", "t": "<title>" } }.
// When the English title of a home changes, its translation stops counting until somebody looks at it again
// (scripts/missing_titles.mjs lists them). A listing page is only published in a language when every home on it has
// a title in that language (seo/listings/page.ts, compose), so a new home simply takes its pages out until it is
// translated: a page that is half in English is worse than no page.
import fs from "fs";
import path from "path";
import type { Home } from "./facets";

export type NewLang = "de" | "ru" | "fr" | "nl" | "pl";
export const NEW_LANGS: NewLang[] = ["de", "ru", "fr", "nl", "pl"];
export const isNewLang = (l: string): l is NewLang => (NEW_LANGS as string[]).includes(l);

const read = (f: string): any => { const p = path.resolve(process.cwd(), f); try { return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : {}; } catch { return {}; } };
const cache = new Map<string, any>();
const load = (f: string) => { if (!cache.has(f)) cache.set(f, read(f)); return cache.get(f); };

export type TitleEntry = { en: string; t: string };
export const titlesOf = (lang: string): Record<string, TitleEntry> => load(`seo/listings/titles.${lang}.json`);
const norm = (s: unknown) => String(s ?? "").replace(/\s+/g, " ").trim();
/** The title of a home in `lang`, or null when there is none or it was translated from an older English title. */
export function titleIn(lang: string, h: Home): string | null {
  const e = titlesOf(lang)[String(h.slug)];
  return e && e.t && norm(e.en) === norm(h.title) ? e.t : null;
}

/** The texts of src/data/destinations.json that the listing pages print, in `lang`: seo/listings/dest.<lang>.json,
 * { "<country slug>": { can_foreigners_buy, purchase_costs_breakdown, annual_property_tax, holiday_rental_rules } }.
 * Numbers, dates and keys stay as they are in the English file; a text with no translation is left out, never shown
 * in English. A country with no entry has no pages in that language (seo/langs/build.ts). */
export const DEST_TEXTS = ["can_foreigners_buy", "purchase_costs_breakdown", "annual_property_tax", "rental_income_tax", "holiday_rental_yield_note", "holiday_rental_rules"];
export const destTexts = (lang: string): Record<string, Record<string, string>> => load(`seo/listings/dest.${lang}.json`);
export function destFor(dest: Record<string, any>, lang: string): Record<string, any> {
  const tr = destTexts(lang); const out: Record<string, any> = {};
  for (const [cc, d] of Object.entries(dest)) {
    if (!d || typeof d !== "object") { out[cc] = d; continue; }
    const o: Record<string, any> = { ...d };
    for (const k of DEST_TEXTS) { if (tr[cc]?.[k]) o[k] = tr[cc][k]; else delete o[k]; }
    out[cc] = o;
  }
  return out;
}
export const hasDest = (lang: string, cc: string) => !!destTexts(lang)[cc]?.can_foreigners_buy;

// ------------------------------------------------------------------------------------------------ place names
/** A word that only English uses inside a place name. A name that carries one and has no entry in the language's own
 * list is not vetted: the pack answers null and the page is not published. */
const EN_MARK = /\b(North|South|East|West|Northern|Southern|Eastern|Western|Central|Greater|Lower|Upper|Lake|Island|Islands|Coast|County|Sea|Mountains|region|area|near|between|about|from|min)\b/;
export type PlaceWords = {
  /** English name -> name in this language (regions, islands, notes in brackets). */
  map: Record<string, string>;
  /** "near Ringsted": in a sentence ("the area of Ringsted") and on a card ("near Ringsted"). */
  near: (name: string, card: boolean) => string;
  /** "Central Eslöv" */
  central: (name: string) => string;
  /** "Como area" */
  area: (name: string) => string;
};
/** Town names stay as the country writes them; regions and islands that this language has its own name for take it. */
export function placeIn(W: PlaceWords, n: string, where?: "card"): string | null {
  const name = String(n || "").trim();
  if (!name) return name;
  if (W.map[name]) return W.map[name];
  let m = /^near (.+)$/.exec(name); if (m) { const x = placeIn(W, m[1]); return x == null ? null : W.near(x, where === "card"); }
  m = /^Central (.+)$/.exec(name); if (m && !W.map[name]) { const x = placeIn(W, m[1]); return x == null ? null : W.central(x); }
  m = /^(.+) area$/.exec(name); if (m) { const x = placeIn(W, m[1]); return x == null ? null : W.area(x); }
  m = /^(.+?) \(([^()]+)\)$/.exec(name);
  if (m) { const a = placeIn(W, m[1]), b = placeIn(W, m[2]); return a == null || b == null ? null : `${a} (${b})`; }
  return EN_MARK.test(name) ? null : name;
}

// ------------------------------------------------------------------------------------------------ the gate
// English words that do not exist in the language (per language, the homographs are taken out below). The check
// runs over the finished page: a title that slipped through, a rule left in English or a place note in English keeps
// the page from being published.
const EN = "the and of for with from by to is are was were this that these those it its you your we our they their or not but if than then there here how what which who when where why can could will would should may must have had does did get all any each every more most less other some new best good cheap cheaper cheapest home homes house houses apartment apartments flat flats bedroom bedrooms bathroom buy buying buyer buyers sell seller tax taxes fee fees year years month months day days week near nearby score ranked checked about above under over into after before between added updated listed listing listings price prices cost costs size country countries question questions guide rules foreigner foreigners abroad compare free see read first also only today need yes none since asking whether view views sea garden pool terrace village town room rooms ready renovated furnished beach walk minutes close plot land stone cottage farmhouse townhouse detached bright sunny quiet large small big two three four".split(" ");
const SAME: Record<NewLang, string> = {
  de: "was also will see land pool",
  ru: "",
  fr: "or but four village minutes large question questions guide score compare cottage close",
  nl: "of is was we over week best had are land flat score room pool",
  pl: "to by we",
};
const sets = new Map<NewLang, Set<string>>();
const enSet = (lang: NewLang) => { if (!sets.has(lang)) { const same = new Set(SAME[lang].split(" ")); sets.set(lang, new Set(EN.filter((w) => !same.has(w)))); } return sets.get(lang)!; };
const WORD = /[A-Za-zÀ-ÖØ-öø-ÿ]+(?:['’][A-Za-z]+)?/g;
/** English words left in a text of `lang`. A word inside a name ("Sunny Beach", "Kavarna Hills", "Lake Superior") does
 * not count: capitalised, away from the start of the sentence, or followed or preceded by another capitalised word. */
export function englishIn(lang: NewLang, text: string): string[] {
  const en = enSet(lang); const hits: string[] = [];
  // a short aside in brackets is the original name of a tax or a procedure: "(closing costs)", "(property tax)"
  const clean = String(text || "").replace(/\(([^()\d]*)\)/g, (m, x: string) => (x.trim().split(/\s+/).length <= 3 ? " " : m));
  for (const unit of clean.split(/(?<=[.!?:;·›|()])\s+|\s+[·›|]\s+|\n+/)) {
    const toks: string[] = [];
    for (const chunk of unit.split(/\s+/)) { if (!chunk || /[A-Za-z0-9][./@][A-Za-z0-9]/.test(chunk) || /^https?:/i.test(chunk)) continue; const m = chunk.match(WORD); if (m) toks.push(...m); }
    const cap = (w?: string) => !!w && /^[A-ZÀ-ÖØ-Þ]/.test(w);
    for (let i = 0; i < toks.length; i++) {
      const w = toks[i];
      if (!en.has(w.toLowerCase())) continue;
      if (cap(w) && (i > 0 || cap(toks[i + 1]))) continue;                  // part of a name
      if (!cap(w) && cap(toks[i - 1]) && cap(toks[i + 1])) continue;       // "Isle of Man"
      hits.push(w);
    }
  }
  return hits;
}

// ------------------------------------------------------------------------------------------------ small tools
export const grouped = (n: number, sep: string) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, sep);
export const NB = "\u00a0";
