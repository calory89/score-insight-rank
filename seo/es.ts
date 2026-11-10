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
export const MAX_ENGLISH_WORDS = 3;

export type PageOpts = { noindex?: boolean; lastmod?: string | null; group?: string; head?: string; images?: string[] };
export type PageRec = { url: string; title: string; desc: string; image: string; body?: string; ld?: object[]; o: PageOpts };
export type Cover = { words: number; english: number; hits: string[] };
export type Twin = { en: string; es: string; lastmod: string | null; group: string; images?: string[] };

const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const unesc = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");

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
const EN_WORDS = new Set(("the and of for with from in on at by to is are was were be been this that these those it its you your we our they their or not but if as than then there here how what which who when where why can could will would should may must have had does did get got all any each every more most less least other others some new best good cheap cheaper cheapest home homes house houses flat flats apartment apartments bedroom bedrooms bed beds bath baths bathroom price prices cost costs buy buying buyer buyers sell seller sellers rent rental rentals tax taxes fee fees year years yearly month months monthly day days week weeks country countries region regions town towns village villages city lake near nearby score scores scored ranked rank checked check person people about above under over up down out into after before between size space garden terrace pool view views land garage cellar attic water airport shop train added updated listed listing listings source sources guide guides step steps question questions answer answers rule rules foreigner foreigners foreign abroad live living work works compare map alert alerts free see read know first also only just right now today side short full build builds ranking rankings developer developers project projects beach feed reader follow median research report quote page site need needs made list yes none biggest cut drop drops went gone since asking agent agents estate commission agencies behind deal deals directly takes opens own plot cabin furnished worked example examples enter pay paid money goes where whether calculator income yield holiday long term start starts starting sorted cheapest square metre metres meter meters describe chosen chose choose pick picked popular unsubscribe click one two three ten most least much many little few same next previous back show shows found find finds finder look looks looking want wants wanted love save saved saves share shared sign open close closed contact write team press partnership policy privacy terms cookie cookies takedown request requests photo photos picture pictures run runs founder company makes make earns earn pays nobody higher sponsored cards marked through still link links pass passed passes passing hand start grade grades graded compares against home's condition extras weather detail interest survey valuation flatter date inspection lawyer notary sold wrong button turned ruins bare major minor needs renovated ready move features nearby made minutes hours away walk drive station school schools").split(/\s+/));

const WORD = /[A-Za-zÀ-ÖØ-öø-ÿ]+(?:['’][A-Za-z]+)?/g;
/** Counts the words of a text and how many of them are still English. Names are left alone: a marker word next to
 * a capitalised name ("New York", "Lake Como", "Isle of Man", "Montecatini in Val di Cecina") does not count, and
 * neither do web addresses and e-mail addresses. */
export function englishLeft(text: string): Cover {
  let words = 0, english = 0; const hits: string[] = [];
  // sentence-like units, so a capital that only starts a sentence is not read as a name
  for (const unit of String(text || "").split(/(?<=[.!?:;·›|()])\s+|\s+[·›|]\s+|\n+/)) {
    const toks: string[] = [];
    for (const chunk of unit.split(/\s+/)) {
      if (!chunk || /[A-Za-z0-9][./@][A-Za-z0-9]/.test(chunk) && !/\d[.,]\d/.test(chunk) || /^https?:/i.test(chunk)) continue; // gate-away.com, a@b.co
      const m = chunk.match(WORD); if (m) toks.push(...m);
    }
    const isCap = (w?: string) => !!w && /^[A-ZÀ-ÖØ-Þ]/.test(w);
    const isEn = (w?: string) => !!w && EN_WORDS.has(w.toLowerCase());
    for (let i = 0; i < toks.length; i++) {
      const w = toks[i]; words++;
      if (!isEn(w)) continue;
      const prev = toks[i - 1], next = toks[i + 1];
      const nameNext = isCap(next) && !isEn(next), namePrev = isCap(prev) && !isEn(prev);
      if (isCap(w)) {
        if (i > 0 && (nameNext || namePrev)) continue;            // "in New York", "RealHunt Research"
        if (i === 0 && nameNext && toks.length <= 3) continue;    // a bare name: "New York", "Lake Como"
      } else if (namePrev && nameNext) continue;                  // "Isle of Man", "Montecatini in Val di Cecina"
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

// ------------------------------------------------------------------------------------------ the Spanish pass
export function createEsPass(cwd = process.cwd()) {
  const read = (f: string, d: any = {}) => { const p = path.resolve(cwd, f); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : d; };
  const snap = read("public/data/rh-static.json", { rows: [] });
  const rows: any[] = (snap.rows || []).filter((r: any) => r?.slug);
  const homeTexts: Record<string, string> = {};
  for (const r of rows) for (const k of ["title", "why_great", "why_cheap"]) { const en = String(r[k] || "").trim(), es = String(r[k + "_es"] || "").trim(); if (en && es && en !== es) homeTexts[en] = es; }
  // Site dictionaries last, so a sentence the Spanish site already shows reads the same here.
  const tr = buildTranslator([read("seo/es-templates.json"), read("public/i18n/es-core.json"), read("public/i18n/es-listings.json"), read("public/i18n/es-extra.json"), read("public/i18n/es-data.json"), homeTexts]);
  const recs: PageRec[] = [];
  const num = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const placeEs = (s: string) => String(s || "").split(", ").map((x) => esPlace(x.trim())).join(", ");
  const bySlug = new Map<string, any>(rows.map((r) => [r.slug, r]));
  return {
    lang: "es" as const,
    tr, recs,
    /** "the Netherlands" -> "los Países Bajos": country name in Spanish with its article, as written after "en". */
    the: (n: string) => theEs(esPlace(n)),
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
export type Render = (r: PageRec) => string;
export type TwinReport = { twins: Twin[]; groups: Record<string, { pages: number; twins: number; words: number; english: number }>; failed: { url: string; english: number; words: number; hits: string[] }[] };

/** Translates, measures and decides every recorded page; nothing is written. `render` is prerender's page -> HTML. */
export function planTwins(pass: EsPass) {
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
    // A page with no content of its own in the HTML (the app draws it) is not a Spanish page for a crawler.
    const ok = !r.o.noindex && !!r.body && !NO_TWIN.has(r.url) && passes(cover);
    return { r, title, desc, body, head, cover, ok };
  });
  return planned;
}

/** Writes dist/es/<path>/index.html for every page that passed, adds hreflang to both versions and returns the twins
 * (for the sitemap) and the numbers by group. */
export function writeEsTwins(root: string, pass: EsPass, render: Render): TwinReport {
  const planned = planTwins(pass);
  const has = new Set(planned.filter((p) => p.ok).map((p) => p.r.url));
  // internal links: to the Spanish twin when the target has one, otherwise the English page stays linked
  const link = (u: string) => (u.startsWith(SITE) && has.has(u === SITE ? SITE + "/" : u) ? esUrl(u) : u);
  const href = (html: string) => html.replace(/(<a\b[^>]*?\shref=")(\/[^"]*)"/g, (m, pre: string, h: string) => {
    const p = h.replace(/[?#].*$/, "");
    return has.has(SITE + (p === "/" ? "/" : p)) ? `${pre}${withEs(h)}"` : m;
  });
  const groups: TwinReport["groups"] = {};
  const twins: Twin[] = []; const failed: TwinReport["failed"] = [];
  for (const p of planned) {
    const g = p.r.o.group || "pages";
    const G = (groups[g] ||= { pages: 0, twins: 0, words: 0, english: 0 });
    if (p.r.o.noindex) continue;
    G.pages++; G.words += p.cover.words; G.english += p.cover.english;
    if (!p.ok) { failed.push({ url: p.r.url, english: p.cover.english, words: p.cover.words, hits: p.r.body ? p.cover.hits : ["(no static body)"] }); continue; }
    G.twins++;
    const en = p.r.url, es = esUrl(en);
    const ld = (p.r.ld || []).map((x) => translateLd(x, pass.tr, link) as object);
    let h = render({ url: es, title: p.title, desc: p.desc, image: p.r.image, body: p.body ? href(p.body) : undefined, ld, o: { ...p.r.o, head: (p.head || "") + hreflangTags(en) } });
    h = h.replace(/<html lang="en"/, '<html lang="es"').replace(/(<meta property="og:locale" content=")en_US"/, '$1es_ES"');
    // the two JSON-LD blocks every page inherits from index.html (Organization, WebSite)
    h = h.replace(/(<script type="application\/ld\+json">)\s*(\{[\s\S]*?\})\s*(<\/script>)/g, (m, a: string, j: string, b: string) => {
      try { const o = JSON.parse(j); if (o["@type"] !== "Organization" && o["@type"] !== "WebSite") return m; if (typeof o.description === "string") o.description = pass.tr(o.description); return a + JSON.stringify(o).replace(/</g, "\\u003c") + b; } catch { return m; }
    });
    const dir = path.join(root, es.slice(SITE.length + 1));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "index.html"), h);
    // the English page gets the same three links
    const enFile = path.join(root, en.slice(SITE.length + 1), "index.html");
    if (fs.existsSync(enFile)) { const eh = fs.readFileSync(enFile, "utf8"); if (!eh.includes('hreflang="es"')) fs.writeFileSync(enFile, eh.replace("</head>", () => hreflangTags(en) + "</head>")); }
    twins.push({ en, es, lastmod: p.r.o.lastmod ?? null, group: g, images: p.r.o.images });
  }
  return { twins, groups, failed };
}

/** Lines for the build log and for dist/es-coverage.json. */
export function coverageSummary(rep: TwinReport) {
  const groups = Object.fromEntries(Object.entries(rep.groups).map(([g, v]) => [g, { ...v, spanish_pct: v.words ? Math.round((1 - v.english / v.words) * 10000) / 100 : 0 }]));
  return { max_english_share: MAX_ENGLISH, max_english_words: MAX_ENGLISH_WORDS, twins: rep.twins.length, groups, not_published: rep.failed.length, not_published_sample: rep.failed.slice(0, 400) };
}
