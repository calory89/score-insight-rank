// Spanish twins of the prerendered pages (10-nov-2026): https://realhunt.co/es/<same path>.
//
// seo/prerender.ts builds every page twice. The second run gets this "pass": the data files come back with their
// Spanish texts swapped in (home titles and descriptions, buying rules, guides, blog posts: the same Spanish the app
// shows), the generators that have a Spanish version use it (homeArticleEs, the can-I-buy texts), and what is left,
// the sentences written inside the templates, goes through the dictionaries of the Spanish site
// (public/i18n/*.json) plus seo/es-templates.json, text node by text node, with the translator of src/lib/lang.ts.
//
// The owner's rule is "no se puede mezclar": a page that is half in English is worse than no page. So every Spanish
// page is measured (words that are still English / all words, see englishLeft) and it is only written, linked with
// hreflang and listed in the sitemap when it passes MAX_ENGLISH. The rest have no Spanish URL at all.
import path from "path";
import fs from "fs";
import { buildTranslator, esPlace } from "../src/lib/lang";
import { localizeRows, localizeCanBuy, theEs } from "../src/community/seo2data";
import { withEs } from "../src/lib/esPath";

export const SITE = "https://realhunt.co";
/** A Spanish page may keep at most this share of English words (names of portals, "Top 100", a brand)... */
export const MAX_ENGLISH = 0.004;
/** ...and never more than this many, however long the page is. */
export const MAX_ENGLISH_WORDS = 0;

export type PageOpts = { noindex?: boolean; lastmod?: string | null; group?: string; head?: string; images?: string[]; lang?: "es"; alt?: { en: string; es: string } };
export type PageRec = { url: string; title: string; desc: string; image: string; body?: string; ld?: object[]; o: PageOpts };
export type Cover = { words: number; english: number; hits: string[] };
export type Twin = { en: string; es: string; lastmod: string | null; group: string; images?: string[] };

const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const unesc = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#(\d+);/g, (_m, n) => String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi, (_m, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");

// ------------------------------------------------------------------------------------------ Spanish URLs
/** https://realhunt.co/deal/x -> https://realhunt.co/es/deal/x ; https://realhunt.co/ -> https://realhunt.co/es */
export const esUrl = (url: string) => (url === SITE || url === SITE + "/" ? SITE + "/es" : SITE + "/es" + url.slice(SITE.length));
/** The three alternate links every page with a twin carries, in both versions. English is the default. */
export const hreflangTags = (en: string) =>
  `<link rel="alternate" hreflang="en" href="${esc(en)}" /><link rel="alternate" hreflang="es" href="${esc(esUrl(en))}" /><link rel="alternate" hreflang="x-default" href="${esc(en)}" />`;

// ------------------------------------------------------------------------------------------ is it Spanish?
// English words that are not Spanish words. Left out on purpose because Spanish uses them too: no, a, me, has, sea,
// come, sale, son, sin, real, final, legal, local, total, rural, general, hospital, hotel, plan, portal, original,
// per (per cápita), top, email, chalet, villa, loft, golf.
const EN_WORDS = new Set(("the and of for with from in on at by to is are was were be been this that these those it its you your we our they their or not but if than then there here how what which who when where why can could will would should may must have had does did get got all any each every more most less least other others some new best good cheap cheaper cheapest home homes house houses apartment apartments bedroom bedrooms bed beds bathroom buy buying buyer buyers sell seller sellers tax taxes fee fees year years yearly month months monthly day days week weeks near nearby score scores scored ranked checked about above under over up down out into after before between added updated listed listing listings price prices cost costs size country countries question questions sources features steps guide guides rules map research alerts examples contact calculator median foreigner foreigners foreign abroad living compare free see read know first also only just right now today builds follow need needs yes none biggest went gone since asking agencies behind directly takes opens own furnished worked goes whether starts starting sorted square metre metres chosen choose picked unsubscribe much many little few same next previous back found looking wanted write partnership privacy terms takedown requests nobody higher through still passed passes passing graded compares against weather valuation flatter lawyer notary turned renovated made").split(/\s+/));

// English names of countries and regions that Spanish writes differently: always English, wherever they appear.
const EN_PLACES = new Set("spain italy france germany sweden denmark japan greece poland netherlands switzerland kingdom states cyprus norway finland ireland turkey hungary croatia romania belgium morocco brazil thailand philippines latvia lithuania slovakia slovenia czechia tuscany sicily sardinia lombardy piedmont brittany normandy andalusia catalonia scandinavia dominican republic".split(" "));
// Foreign terms that Spanish texts keep as they are.
const KEPT = /\b(tiny houses?|club ?house|town ?house|council tax|walk-in|chill-out|check-in|sq ft|off-grid|open house|bed and breakfast|new york|new jersey|new hampshire|new brunswick|new england)\b/gi;
const WORD = /[A-Za-zÀ-ÖØ-öø-ÿ]+(?:['’][A-Za-z]+)?/g;
/** Counts the words of a text and how many of them are still English. Names are left alone: a marker word next to
 * a capitalised name ("New York", "Lake Como", "Isle of Man", "Montecatini in Val di Cecina") does not count, and
 * neither do web addresses and e-mail addresses. */
export function englishLeft(text: string): Cover {
  let words = 0, english = 0; const hits: string[] = [];
  // sentence-like units, so a capital that only starts a sentence is not read as a name
  // a short aside in brackets is the original name of a tax or a place: "(closing costs)", "(Black Sea)"
  const clean = String(text || "").replace(KEPT, " ").replace(/\(([^()\d]*)\)/g, (m, x: string) => (x.trim().split(/\s+/).length <= 4 ? " " : m));
  for (const unit of clean.split(/(?<=[.!?:;·›|()])\s+|\s+[·›|]\s+|\n+/)) {
    const toks: string[] = [];
    for (const chunk of unit.split(/\s+/)) {
      if (!chunk || /[A-Za-z0-9][./@][A-Za-z0-9]/.test(chunk) && !/\d[.,]\d/.test(chunk) || /^https?:/i.test(chunk)) continue; // gate-away.com, a@b.co
      const m = chunk.match(WORD); if (m) toks.push(...m);
    }
    const isCap = (w?: string) => !!w && /^[A-ZÀ-ÖØ-Þ]/.test(w);
    const isEn = (w?: string) => !!w && EN_WORDS.has(w.toLowerCase());
    for (let i = 0; i < toks.length; i++) {
      const w = toks[i]; words++;
      if (EN_PLACES.has(w.toLowerCase()) && isCap(w)) { english++; if (hits.length < 12) hits.push(w); continue; }
      if (!isEn(w)) continue;
      const prev = toks[i - 1], next = toks[i + 1];
      const nameNext = isCap(next) && !isEn(next), namePrev = isCap(prev) && !isEn(prev);
      if (isCap(w)) {
        if (i > 0 && (nameNext || namePrev)) continue;            // "in New York", "RealHunt Research"
        if (i === 0 && nameNext) continue;                        // a name: "Little River, South Carolina"
      } else if (isCap(prev) && isCap(next)) continue;                  // "Isle of Man", "Montecatini in Val di Cecina"
      english++; if (hits.length < 12) hits.push(w);
    }
  }
  return { words, english, hits };
}
/** The rule that decides whether a Spanish page is published. */
export const passes = (c: Cover) => c.words > 0 && c.english <= MAX_ENGLISH_WORDS && c.english / c.words <= MAX_ENGLISH;

// ------------------------------------------------------------------------------------------ translating HTML
const ATTR = /\s(alt|title|aria-label)="([^"]*)"/g;
/** Translates the text nodes (and alt/title/aria-label) of an HTML fragment. Scripts and styles are left as they are.
 * `seen` receives every visible string after translation, for the coverage count. */
export function translateHtml(html: string, tr: (s: string) => string, seen?: (s: string) => void): string {
  let raw = 0; // inside <script> or <style>
  return html.split(/(<!--[\s\S]*?-->|<[^>]+>)/).map((part, i) => {
    if (i % 2) {
      if (/^<(script|style)\b/i.test(part)) raw++;
      else if (/^<\/(script|style)>/i.test(part)) raw = Math.max(0, raw - 1);
      else if (!raw && part[1] !== "!" && part[1] !== "/") return part.replace(ATTR, (_m, a: string, v: string) => { const t = tr(unesc(v)); seen?.(t); return ` ${a}="${esc(t)}"`; });
      return part;
    }
    if (raw || !/[A-Za-z€\d]/.test(part)) return part;
    const t = tr(unesc(part)); seen?.(t);
    return esc(t).replace(/ /g, "&nbsp;");
  }).join("");
}
const LD_TEXT = new Set(["name", "headline", "description", "text", "alternateName"]);
const LD_URL = new Set(["url", "item", "mainEntityOfPage", "@id"]);
/** JSON-LD: the texts in Spanish, and the links to pages that have a Spanish twin pointing at the twin. */
export function translateLd(x: unknown, tr: (s: string) => string, link: (u: string) => string, seen?: (s: string) => void, key = ""): unknown {
  if (typeof x === "string") {
    if (LD_URL.has(key)) return link(x);
    if (LD_TEXT.has(key) && /[A-Za-z]/.test(x)) { const t = tr(x); seen?.(t); return t; }
    return x;
  }
  if (Array.isArray(x)) return x.map((v) => translateLd(v, tr, link, seen, key));
  if (x && typeof x === "object") {
    const o: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(x)) o[k] = translateLd(v, tr, link, seen, k);
    if (o["@type"] === "Organization" || o["@type"] === "PostalAddress" || o["@type"] === "ImageObject") for (const k of ["name", "url"]) if (k in (x as object)) o[k] = (x as Record<string, unknown>)[k]; // company names and their own sites stay
    return o;
  }
  return x;
}

/** The site translator works on whole strings. The static pages also have breadcrumbs ("RealHunt › Guides"), text that
 * starts after a link or a label (": about 8% on top of the price", ", or"), labels that end in a colon ("Price:") and
 * decimals before a percent sign, which Spanish writes with a comma. */
// Sentences the site translator cannot take as one string: a label followed by a long Spanish text from the data
// (it only tries its patterns on strings under 400 characters), and one sentence its own counting rule gets to first.
const LEAD: [RegExp, string][] = [
  [/^Plan for about ([\d.,–-]+)% on top of the price: /, "Calcula alrededor de un $1% además del precio: "],
  [/^About ([\d.,–-]+)% on top of the price: /, "Alrededor de un $1% además del precio: "],
  [/^About ([\d.,–-]+)%: /, "Alrededor de un $1%: "],
  [/^Yearly property tax: /, "Impuesto anual sobre la propiedad: "],
  [/^Tax on rental income: /, "Impuesto sobre los ingresos por alquiler: "],
];
const IN_TOWN = /^(\d+) homes in town in (.+?), from (€[\d,]+)\. Checked by a person, scored from 70 to 98 and ranked best first\.$/;

// Place names inside a longer text ("Homes under €60,000 in Italy (6)", "Jarocin, Greater Poland"): the site
// translator only knows them at the start of a string or after a comma. Longest first.
const MORE_PLACES: Record<string, string> = { "Northern Ireland": "Irlanda del Norte", "County Down": "condado de Down", "County Fermanagh": "condado de Fermanagh", "County Leitrim": "condado de Leitrim", "Northern Sweden": "norte de Suecia", "Central Sweden": "centro de Suecia", "Southern Sweden": "sur de Suecia", "Greater Poland": "Gran Polonia", "Lesser Poland": "Pequeña Polonia", "New Mexico": "Nuevo México", "South Carolina": "Carolina del Sur", "North Carolina": "Carolina del Norte", "West Virginia": "Virginia Occidental", "Black Sea": "mar Negro", "Dominican Republic": "República Dominicana", "Czech Republic": "República Checa", Florence: "Florencia", Copenhagen: "Copenhague", London: "Londres", Lisbon: "Lisboa", Rome: "Roma", Milan: "Milán", "County Mayo": "condado de Mayo", "County Galway": "condado de Galway", "County Waterford": "condado de Waterford", "West Mani": "Mani Occidental", "Lake Balaton": "lago Balaton", "Karlovy Vary region": "región de Karlovy Vary", "Vysočina region": "región de Vysočina", "Ústí nad Labem region": "región de Ústí nad Labem", "Lower Austria": "Baja Austria", "Messinia": "Mesenia", "Crete": "Creta", "Newfoundland": "Terranova", "Prince Edward Island": "Isla del Príncipe Eduardo", "Genoa": "Génova" };
const PLACE_NAMES = ["United States", "United Kingdom", "Costa Rica", "Lake Como", "Nova Scotia", "New Brunswick", "North Jutland", "West Jutland", "East Jutland", "Central Jutland", "St. Gallen", "Spain", "Italy", "Sweden", "Japan", "Mexico", "Canada", "France", "Germany", "Greece", "Croatia", "Romania", "Hungary", "Finland", "Norway", "Denmark", "Scandinavia", "Ireland", "Thailand", "Turkey", "Morocco", "Brazil", "Panama", "Philippines", "Malaysia", "Slovakia", "Slovenia", "Poland", "Czechia", "Switzerland", "Belgium", "Netherlands", "Latvia", "Lithuania", "Cyprus", "Tuscany", "Lazio", "Sicily", "Sardinia", "Piedmont", "Lombardy", "Puglia", "Abruzzo", "Umbria", "Brittany", "Normandy", "Andalusia", "Catalonia", "Pennsylvania", "Bern", "Geneva", "Lucerne", "Grisons", "Ticino", "Funen"];
const PLACE_MAP: Record<string, string> = { ...Object.fromEntries(PLACE_NAMES.map((n) => [n, esPlace(n)])), ...MORE_PLACES };
const PLACE_ANY = new RegExp(`(?<![\\p{L}\\p{N}-])(${Object.keys(PLACE_MAP).sort((x, y) => y.length - x.length).map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})(?![\\p{L}\\p{N}-])`, "gu");
/** Spanish names for the places the site knows, wherever they stand in a text, and the notes some homes carry
 * after their town ("(35 min to Billund)"). */
export const placesEs = (s: string) => s.replace(PLACE_ANY, (m) => PLACE_MAP[m] || m)
  .replace(/(^|, |· |\()near (?=\p{Lu})/gu, "$1cerca de ") // "Lundby, near Skælskør" (14-nov-2026)
  .replace(/\((\d+) min to ([^()]+)\)/g, "(a $1 min de $2)").replace(/\(about (\d+) min from ([^()]+)\)/g, "(a unos $1 min de $2)").replace(/\(between ([^()]+) and ([^()]+)\)/g, "(entre $1 y $2)");

export function pageTranslator(tr: (s: string) => string): (s: string) => string {
  const left = (s: string) => englishLeft(s).english;
  const one = (s: string, depth = 0): string => {
    const m = /^(\s*[:;,.]?\s*)([\s\S]*?)(\s*)$/.exec(s)!;
    const core = m[2];
    if (!core) return s;
    const wrap = (t: string) => m[1] + t + m[3];
    for (const [re, es] of LEAD) { const x = re.exec(core); if (x) return wrap(x[0].replace(re, es) + one(core.slice(x[0].length), depth)); }
    const it = IN_TOWN.exec(core);
    if (it) return wrap(`${it[1]} casas en ciudad en ${placesEs(tr(it[2]))}, desde ${tr(it[3])}. Revisadas por una persona, con nota de 70 a 98 y ordenadas de mejor a peor.`);
    let t = placesEs(tr(core));
    if (t === core && /:$/.test(core)) { const u = tr(core.slice(0, -1)); if (u !== core.slice(0, -1)) t = u + ":"; }       // "Price:"
    // Still some English: translate the parts on their own ("A · B", "Tuscany (12)") and keep the better result.
    if (depth < 3 && left(t)) {
      const tries: string[] = [];
      if (core.includes(" · ")) tries.push(core.split(" · ").map((x) => one(x, depth + 1)).join(" · "));
      const par = /^([^()]*\S) \(([^()]*)\)$/.exec(core);
      if (par) tries.push(`${one(par[1], depth + 1)} (${one(par[2], depth + 1)})`);
      for (const x of tries) if (left(x) < left(t)) t = x;
    }
    return wrap(t);
  };
  return (s: string) => String(s ?? "").split(/(\s*›\s*)/).map((x, i) => (i % 2 ? x : one(x))).join("")
    .replace(/(\d)\.(\d{1,2})(?=(?:\s?[-–]\s?\d+(?:[.,]\d+)?)?\s?%)/g, "$1,$2")
    .replace(/(?<!\.)\.\.(?!\.)/g, "."); // a data text that ends in a full stop inside a sentence that adds its own
}

// ------------------------------------------------------------------------------------------ the Spanish pass
export function createEsPass(cwd = process.cwd()) {
  const read = (f: string, d: any = {}) => { const p = path.resolve(cwd, f); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : d; };
  const snap = read("public/data/rh-static.json", { rows: [] });
  const rows: any[] = (snap.rows || []).filter((r: any) => r?.slug);
  const homeTexts: Record<string, string> = {};
  for (const r of rows) for (const k of ["title", "why_great", "why_cheap"]) { const en = String(r[k] || "").trim(), es = String(r[k + "_es"] || "").trim(); if (en && es && en !== es) homeTexts[en] = es; }
  // The site's own dictionaries, then the home texts, then the sentences of the prerender templates (which only
  // define what the site dictionaries do not have).
  const tpl = read("seo/es-templates.json"); delete tpl._note;
  const tr = pageTranslator(buildTranslator([read("public/i18n/es-core.json"), read("public/i18n/es-listings.json"), read("public/i18n/es-extra.json"), read("public/i18n/es-data.json"), homeTexts, tpl]));
  const recs: PageRec[] = [];
  const num = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const placeEs = (s: string) => String(s || "").split(", ").map((x) => esPlace(x.trim())).join(", ");
  const bySlug = new Map<string, any>(rows.map((r) => [r.slug, r]));
  return {
    lang: "es" as const,
    tr, recs,
    /** "the Netherlands" -> "los Países Bajos": country name in Spanish with its article, as written after "en". */
    the: (n: string) => theEs(PLACE_MAP[n] || esPlace(n)),
    /** A data file as the Spanish pass must see it. Keys, slugs, countries and numbers never change: only texts. */
    data(file: string, v: any): any {
      const name = file.replace(/^.*\//, "");
      if (name === "rh-static.json") return { ...v, rows: (v.rows || []).map((r: any) => ({ ...r, title: r.title_es || r.title, why_great: r.why_great_es || r.why_great, why_cheap: r.why_cheap_es || r.why_cheap })) };
      if (name === "deal-meta.json") return (v as any[]).map((d) => {
        const r = bySlug.get(d.slug); if (!r?.title_es) return d;
        return { ...d, title: `${num(r.price_eur)} € · ${r.title_es}`, desc: `${r.title_es} por ${num(r.price_eur)} €. ${placeEs(r.location_name || r.country)}. Con nota y puesto en RealHunt: las mejores casas de cada país.` };
      });
      if (name === "destinations.json") return localizeRows(v, read("src/data/destinations-es.json"));
      if (name === "guides.json") return localizeRows(v, read("src/data/guides-es.json"));
      if (name === "canbuy.json") return localizeCanBuy(v, read("src/data/canbuy-es.json"));
      if (name === "blog.json") { const es = new Map<string, any>((read("src/data/blog-es.json", []) as any[]).map((p) => [p.slug, p])); return (v as any[]).map((p) => (es.has(p.slug) ? { ...p, ...es.get(p.slug), slug: p.slug, image: p.image, date: p.date } : p)); }
      return v;
    },
    add(url: string, title: string, desc: string, image: string, body?: string, ld?: object[], o: PageOpts = {}) { recs.push({ url, title, desc, image, body, ld, o }); },
  };
}
export type EsPass = ReturnType<typeof createEsPass>;

// /sitemap lists the English URLs written by the English run; sitemap-es.xml is the Spanish list.
const NO_TWIN = new Set([SITE + "/sitemap"]);
/** A Spanish page that seo/prerender.ts writes by hand is kept as it is (another session owns those templates), even
 * though the twin built here from the English template carries more (links by price, type and region, questions,
 * the article). false = the twin replaces the hand-written file whenever it passes the check. */
export const BY_HAND_WINS = true;
export type Render = (r: PageRec) => string;
export type TwinReport = { thin?: number; byHand?: { pages: number; words: number; english: number; failed: { url: string; english: number; words: number; hits: string[] }[] }; twins: Twin[]; groups: Record<string, { pages: number; twins: number; words: number; english: number; by_hand?: number }>; failed: { url: string; english: number; words: number; hits: string[] }[] };

/** Translates, measures and decides every recorded page; nothing is written. `render` is prerender's page -> HTML. */
export function planTwins(pass: EsPass) {
  // RH_ES_DEBUG=1: dist/es-missing.json lists the strings that still have English words, most frequent first
  const missing: Map<string, number> | null = process.env.RH_ES_DEBUG ? new Map() : null;
  const planned = pass.recs.map((r) => {
    const seen: string[] = [];
    const note = (s: string) => { seen.push(s); };
    const title = pass.tr(r.title), desc = pass.tr(r.desc);
    note(title); note(desc);
    const body = r.body ? translateHtml(r.body, pass.tr, note) : undefined;
    const head = r.o.head ? translateHtml(r.o.head, pass.tr) : undefined;
    const ldText: string[] = [];
    (r.ld || []).forEach((x) => translateLd(x, pass.tr, (u) => u, (s) => ldText.push(s)));
    const cover = englishLeft(seen.concat(ldText).join("\n"));
    if (missing) for (const t of seen.concat(ldText)) if (englishLeft(t).english) { const g = r.o.group || "pages"; const k = g + "\t" + t.replace(/\d[\d.,]*/g, "N").slice(0, 400); missing.set(k, (missing.get(k) || 0) + 1); }
    // A page with no content of its own in the HTML (the app draws it) is not a Spanish page for a crawler.
    const ok = !!r.body && !NO_TWIN.has(r.url) && passes(cover);
    return { r, title, desc, body, head, cover, ok };
  });
  if (missing) fs.writeFileSync(path.resolve(process.cwd(), "dist/es-missing.json"), JSON.stringify([...missing.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => [n, ...k.split("\t")]), null, 0).replace(/\],\[/g, "],\n["));
  return planned;
}

/** Writes dist/es/<path>/index.html for every page that passed, adds hreflang to both versions and returns the twins
 * (for the sitemap) and the numbers by group. */
export function writeEsTwins(root: string, pass: EsPass, render: Render, written = new Map<string, string>()): TwinReport {
  // `written`: English URL -> Spanish URL of the pages whose Spanish copy seo/prerender.ts writes by hand (the front
  // page and the homes). Those stay as they are; they count as Spanish pages for the links of the others.
  const planned = planTwins(pass).map((p) => (BY_HAND_WINS && written.has(p.r.url) ? { ...p, mine: p.ok, ok: false, by_hand: true } : { ...p, mine: p.ok, by_hand: false }));
  const has = new Set([...planned.filter((p) => p.ok).map((p) => p.r.url), ...written.keys()]);
  // internal links: to the Spanish twin when the target has one, otherwise the English page stays linked
  const link = (u: string) => (u.startsWith(SITE) && has.has(u === SITE ? SITE + "/" : u) ? esUrl(u) : u);
  const href = (html: string) => html.replace(/(<a\b[^>]*?\shref=")(\/[^"]*)"/g, (m, pre: string, h: string) => {
    const p = h.replace(/[?#].*$/, "");
    return has.has(SITE + (p === "/" ? "/" : p)) ? `${pre}${withEs(h)}"` : m;
  });
  const groups: TwinReport["groups"] = {};
  const twins: Twin[] = []; const failed: TwinReport["failed"] = [];
  let thin = 0;
  const write = (es: string, h: string) => {
    const dir = path.join(root, es.slice(SITE.length + 1));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "index.html"), baseLdEs(h, pass.tr)); // + the two JSON-LD blocks every page inherits from index.html
  };
  for (const p of planned) {
    const g = p.r.o.group || "pages";
    const G = (groups[g] ||= { pages: 0, twins: 0, words: 0, english: 0 });
    if (p.r.o.noindex) {
      // A thin page (noindex, not in the sitemap, no hreflang) still gets its Spanish copy when it is fully Spanish,
      // so a visitor or a crawler that follows a link from a Spanish page stays in Spanish.
      if (p.ok && !p.by_hand) { write(esUrl(p.r.url), render({ url: esUrl(p.r.url), title: p.title, desc: p.desc, image: p.r.image, body: p.body ? href(p.body) : undefined, ld: (p.r.ld || []).map((x) => translateLd(x, pass.tr, link) as object), o: { ...p.r.o, head: p.head, lang: "es" } })); thin++; }
      continue;
    }
    if (p.by_hand) { G.pages++; G.twins++; G.by_hand = (G.by_hand || 0) + 1; continue; }
    G.pages++; G.words += p.cover.words; G.english += p.cover.english;
    if (!p.ok) { failed.push({ url: p.r.url, english: p.cover.english, words: p.cover.words, hits: p.r.body ? p.cover.hits : ["(no static body)"] }); continue; }
    G.twins++;
    const en = p.r.url, es = esUrl(en);
    const ld = (p.r.ld || []).map((x) => translateLd(x, pass.tr, link) as object);
    let h = render({ url: es, title: p.title, desc: p.desc, image: p.r.image, body: p.body ? href(p.body) : undefined, ld, o: { ...p.r.o, head: p.head, lang: "es", alt: { en, es } } });
    write(es, h);
    // the English page gets the same three links
    const enFile = path.join(root, en.slice(SITE.length + 1), "index.html");
    if (fs.existsSync(enFile)) { const eh = fs.readFileSync(enFile, "utf8"); if (!eh.includes('hreflang="es"')) fs.writeFileSync(enFile, eh.replace("</head>", () => hreflangTags(en) + "</head>")); }
    twins.push({ en, es, lastmod: p.r.o.lastmod ?? null, group: g, images: p.r.o.images });
  }
  // The pages written by hand: same check, the inherited JSON-LD in Spanish, place names in Spanish, and a link to
  // the Spanish country page when there is one.
  const byHand = { pages: 0, words: 0, english: 0, failed: [] as TwinReport["failed"] };
  const country = new Map<string, string>(((JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "public/data/rh-static.json"), "utf8")).rows || []) as any[]).map((r) => [String(r.slug), String(r.country || "")]));
  for (const [en, es] of written) {
    const file = path.join(root, es.slice(SITE.length + 1), "index.html");
    if (!fs.existsSync(file)) continue;
    let h = baseLdEs(fs.readFileSync(file, "utf8"), pass.tr);
    h = h.replace(/(<div id="root">)([\s\S]*)(<\/div>\s*<script)/, (_m, a: string, b: string, c: string) => a + translateHtml(b, placesEs) + c);
    const slug = /\/deal\/([^/]+)$/.exec(en)?.[1];
    const c = slug ? country.get(slug) : "";
    const cUrl = c ? `${SITE}/homes/${c.toLowerCase().trim().replace(/\s+/g, "-")}` : "";
    // a country page written by hand: the links to its Spanish price, type and region pages and its questions,
    // taken from the twin of the same page, so those pages are reachable from it
    const twin = planned.find((p) => p.r.url === en && p.mine && p.body);
    if (twin && /\/homes\/[^/]+$/.test(en) && !h.includes("Por precio:") && !h.includes("Por región:")) {
      const b = href(twin.body!);
      const nav = (b.match(/<p>Por (?:precio|tipo|región): [\s\S]*?<\/p>/g) || []).join("");
      const faq = /<h2>Preguntas sobre comprar en [\s\S]*?(?=<h2>Otros países<\/h2>)/.exec(b)?.[0] || "";
      if (nav || faq) h = h.replace("<h2>Otros países</h2>", () => nav + faq + "<h2>Otros países</h2>");
    }
    if (cUrl && has.has(cUrl)) h = h.replace('<p><a href="/es">Las mejores casas</a>', () => `<p><a href="${esUrl(cUrl).slice(SITE.length)}">Todas las casas en ${esc(pass.the(c!))}</a> · <a href="/es">Las mejores casas</a>`);
    fs.writeFileSync(file, h);
    const cover = measureHtml(h);
    byHand.pages++; byHand.words += cover.words; byHand.english += cover.english;
    if (!passes(cover)) byHand.failed.push({ url: es, english: cover.english, words: cover.words, hits: cover.hits });
  }
  return { twins, groups, failed, byHand, thin };
}

/** The visible text, title, description and JSON-LD texts of a finished page, measured. For the Spanish pages that
 * seo/prerender.ts writes by hand. */
export function measureHtml(html: string): Cover {
  const seen: string[] = [];
  const t = /<title>([^<]*)<\/title>/.exec(html); if (t) seen.push(unesc(t[1]));
  const d = /<meta name="description" content="([^"]*)"/.exec(html); if (d) seen.push(unesc(d[1]));
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) { try { translateLd(JSON.parse(m[1]), (x) => x, (u) => u, (x) => seen.push(x)); } catch { /* not JSON */ } }
  const root = /<div id="root">([\s\S]*)<\/div>\s*<script/.exec(html);
  if (root) translateHtml(root[1], (x) => x, (x) => seen.push(x));
  return englishLeft(seen.join("\n"));
}
const baseLdEs = (h: string, tr: (s: string) => string) => h.replace(/(<script type="application\/ld\+json">)\s*(\{[\s\S]*?\})\s*(<\/script>)/g, (m, a: string, j: string, b: string) => {
  try { const o = JSON.parse(j); if (o["@type"] !== "Organization" && o["@type"] !== "WebSite") return m; if (typeof o.description === "string") o.description = tr(o.description); return a + JSON.stringify(o).replace(/</g, "\\u003c") + b; } catch { return m; }
});

/** Lines for the build log and for dist/es-coverage.json. */
export function coverageSummary(rep: TwinReport) {
  const groups = Object.fromEntries(Object.entries(rep.groups).map(([g, v]) => [g, { ...v, spanish_pct: v.words ? Math.round((1 - v.english / v.words) * 10000) / 100 : 0 }]));
  return { noindex_copies: rep.thin || 0, written_by_hand: rep.byHand, max_english_share: MAX_ENGLISH, max_english_words: MAX_ENGLISH_WORDS, twins: rep.twins.length, groups, not_published: rep.failed.length, not_published_sample: rep.failed.slice(0, 400) };
}
