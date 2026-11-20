// Crawl quality and on-page signals (14-nov-2026). One pass over dist/ after seo/prerender.ts and seo/es.ts have
// written every page, so it also covers pages that other templates add later. Nothing here writes page content:
// it decides what search engines should index and how the pages point at each other.
//
//  1. Index or not: thin page types (a new-build project with 50 words, the city copies of the home finder, app-only
//     screens) get "noindex, follow", lose their hreflang and stay out of the sitemaps. A page with real text is kept.
//  2. Titles and descriptions: seo/polishMeta.ts.
//  3. One h1 on every indexable page; links to homes that are gone are unwrapped; a home listed twice keeps one URL.
//  4. Breadcrumbs: the same trail in the BreadcrumbList JSON-LD and on the page. A "related" block at the end of every
//     page (seo/polishRelated.ts), and an HTML site map per group that reaches every indexable page in two clicks.
//  5. Sitemaps: only indexable, canonical pages, split by importance, lastmod only when the text really changed.
//  6. dist/redirects.json for old and removed URLs (the worker that serves the site reads it; it is not in this repo).
//  7. JSON-LD checks per page type.
//  8. dist/seo-audit.json, and a failed build for the worst classes (seo/polishAudit.ts).
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { spawnSync } from "child_process";
import { regionOf, slugify, HOME_TYPES } from "../src/community/regions";
import { esPlace } from "../src/lib/lang";
import { theEs } from "../src/community/seo2data";
import { type Kind, type Lang, pickTitle, polishDesc, stripBrand } from "./polishMeta";
import { EXTRA_NOINDEX } from "./tech/indexPolicy";
import { type RelCtx, relatedRows, renderRelated, REL_HEAD, sitemapPages, GROUPS, groupOf, STR } from "./polishRelated";
import { audit, type Audit } from "./polishAudit";
import { techAudit, techHeal } from "./tech/audit";
import { hreflangTags, sitemapAlternates } from "./tech/locales";
import { withSiteHead } from "./tech/siteHead";
import { writeReport } from "./tech/report";

export const SITE = "https://realhunt.co";
/** A page type listed in NOINDEX_RULES is still indexed when its own text (in the HTML) has at least this many words. */
export const SUBSTANCE_WORDS = 250;
/** Pages that get impressions in Search Console today (brief of 14-nov-2026): never set to noindex here. */
// 15-nov-2026: /legal/terms left this list. Its 14 impressions help nobody who is looking for a home (idea 131).
export const HAS_IMPRESSIONS = new Set(["/", "/homes/bulgaria/under-80000", "/top/bali", "/blog/bali-phuket-tulum-batumi-400-new-builds-scored", "/homes/italy/under-80000", "/homes/france/under-80000", "/cheap-houses/under-50000-in-germany"]);
/** Page types that are noindex unless they pass SUBSTANCE_WORDS. Why, with the numbers of 14-nov-2026:
 *  - /top/<city>/<project>: 417 pages with 35 to 65 words each (a name, a price and one sentence).
 *  - /find-my-home/<city>, /new-builds/<country>: 12 + 8 pages with no text of their own, the same screen with one word changed.
 *  - /swipe, /leaderboard, /winners, /insider, /developers: screens of the app with no text to index.
 *  - /extension/privacy, /network/start|agreement|example: a form, a contract and a demo for developers.
 *  - /sources/<portal> under 150 words: a list of 3 or 4 homes that the country pages already carry. */
export const NOINDEX_RULES: [RegExp, number, string][] = [
  [/^\/top\/(?!how-we-rank$)[^/]+\/[^/]+$/, SUBSTANCE_WORDS, "new-build project page"],
  [/^\/find-my-home\/[^/]+$/, SUBSTANCE_WORDS, "home finder, city copy"],
  [/^\/new-builds\/[^/]+$/, SUBSTANCE_WORDS, "new builds, country copy"],
  [/^\/(swipe|leaderboard|winners|insider|developers)$/, SUBSTANCE_WORDS, "app screen"],
  [/^\/(extension\/privacy|network\/(start|agreement|example))$/, SUBSTANCE_WORDS, "form, contract or demo"],
  [/^\/sources\/[^/]+$/, 150, "portal list"],
  // terms, privacy, cookies, takedown: pages a visitor must be able to read and no search should land on
  [/^\/legal\/[^/]+$/, Infinity, "legal page"],
  ...EXTRA_NOINDEX,
];

/** The titles of the last build: [hash of the title, day it last changed, changes in the 28 days before that]. */
export type TitleState = Record<string, [string, string, number?]>;
export type Pg = {
  path: string; en: string; lang: Lang; file: string; html: string;
  title: string; title0: string; desc: string; canon: string; noindex: boolean; noindex0: boolean; why?: string;
  h1: string[]; alt: Record<string, string>; words: number; hash: string;
  kind: Kind; cc: string; trail: [string, string][]; label: string; links: Set<string>; dupOf?: string; made?: boolean;
};

const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const unesc = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
const text = (h: string) => unesc(h.replace(/<(script|style)\b[\s\S]*?<\/\1>/g, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const isEs = (p: string) => p === "/es" || p.startsWith("/es/");
export const stripEs = (p: string) => (isEs(p) ? p.slice(3) || "/" : p);
export const withEs = (p: string) => (p === "/" ? "/es" : "/es" + p);
const abs = (p: string) => SITE + (p === "/" ? "/" : p);
const toPath = (u: string) => { const p = u.startsWith(SITE) ? u.slice(SITE.length) : u; return (p.replace(/[?#].*$/, "").replace(/\/+$/, "")) || "/"; };
const theEn = (n: string) => (/^(United |Netherlands$|Dominican Republic$|Czech Republic$|Philippines$)/.test(n) ? "the " + n : n);

// ------------------------------------------------------------------------------------------ reading a page
const ROOT = /(<div id="root">)([\s\S]*)(<\/div>\s*<script)/;
export const rootOf = (h: string) => ROOT.exec(h)?.[2] ?? "";
export const setRoot = (h: string, inner: string) => h.replace(ROOT, (_m, a: string, _b: string, c: string) => a + inner + c);
const headOf = (h: string) => h.slice(0, Math.max(0, h.indexOf("</head>")));
const LD = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
export const ldOf = (h: string): any[] => { const out: any[] = []; for (const m of h.matchAll(LD)) { try { out.push(JSON.parse(m[1])); } catch { out.push(null); } } return out; };
const ldTag = (o: unknown) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`;
/** Rewrites every JSON-LD block: `fn` returns the object to keep, or null to drop the block. */
export const mapLd = (h: string, fn: (o: any) => any) => h.replace(LD, (m, j: string) => { let o: any; try { o = JSON.parse(j); } catch { return m; } const r = fn(o); return r === null ? "" : r === o ? m : ldTag(r); });
const addHead = (h: string, tags: string) => h.replace("</head>", () => tags + "</head>");
const ALT = /<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"\s*\/?>/g;
const setTitle = (h: string, t: string) => h.replace(/<title>[^<]*<\/title>/, () => `<title>${esc(t)}</title>`);
const setDesc = (h: string, d: string) => h.replace(/<meta name="description" content="[^"]*"\s*\/?>/, () => `<meta name="description" content="${esc(d)}" />`);
const setRobots = (h: string, noindex: boolean) => h.replace(/<meta name="robots" content="[^"]*"\s*\/?>/, () => `<meta name="robots" content="${noindex ? "noindex, follow" : "index, follow"}" />`);
const setCanon = (h: string, u: string) => h.replace(/<link rel="canonical" href="[^"]*"\s*\/?>/, () => `<link rel="canonical" href="${esc(u)}" />`);
/** The static content of a page: every <main class="rh-static ..."> inside #root. */
const mains = (root: string) => root.match(/<main\b[^>]*class="[^"]*\brh-static\b[^"]*"[^>]*>[\s\S]*?<\/main>/g) || [];
const hrefs = (root: string) => { const s = new Set<string>(); for (const m of root.matchAll(/<a\b[^>]*?\shref="(\/[^"]*)"/g)) if (m[1][1] !== "/") s.add(toPath(m[1])); return s; };

export function classify(en: string): { kind: Kind; cc: string } {
  const s = en.split("/").filter(Boolean);
  if (!s.length) return { kind: "home", cc: "" };
  const [a, b, c] = s;
  if (a === "deal" && b) return { kind: "deal", cc: "" };
  if (a === "homes" && b) {
    if (!c) return { kind: "country", cc: b };
    if (s.length > 3) return { kind: "place", cc: b };
    if (/^under-\d+$/.test(c)) return { kind: "band", cc: b };
    // a setting, a kind of home or a number of bedrooms (seo/listings/facets.ts); anything else is a region
    return { kind: c in HOME_TYPES || /^(\d-bedroom|apartments|houses|with-[a-z-]+|near-[a-z-]+)$/.test(c) ? "type" : "region", cc: b };
  }
  if (a === "costs" && b) return { kind: "costs", cc: b };
  if (a === "guide" && b) return { kind: "guide", cc: b };
  if (a === "buying-costs" && b) return { kind: "calc", cc: b };
  if (a === "can-i-buy" && b) return { kind: "canbuy", cc: b.split("-in-")[1] || "" };
  if (a === "countries" && b) return { kind: "pair", cc: "" };
  if (a === "cheap-houses" && b) return { kind: "cheap", cc: b.split("-in-")[1] || "" };
  if ((a === "blog" || a === "research") && b) return { kind: "blog", cc: "" };
  if (a === "sources" && b) return { kind: "source", cc: "" };
  if (a === "top" && b && b !== "how-we-rank") return { kind: c ? "project" : "topdest", cc: "" };
  return { kind: s.length === 1 ? "hub" : "page", cc: "" };
}

const SKIP_DIRS = new Set(["assets", "data", "finds", "og", "i18n", "images", "t", "videos", "badge", "fonts", "seo-report"]);
function walk(dir: string, out: string[], top = true) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!(top && SKIP_DIRS.has(e.name))) walk(path.join(dir, e.name), out, false); }
    else if (e.name === "index.html") out.push(path.join(dir, e.name));
  }
}
export function readPage(p: string, file: string, html: string): Pg {
  const head = headOf(html), root = rootOf(html);
  const get = (re: RegExp) => { const m = re.exec(head); return m ? unesc(m[1]).trim() : ""; };
  const en = stripEs(p);
  const body = mains(root).join(" ");
  const words = body ? text(body).split(" ").filter(Boolean).length : 0;
  const robots = get(/<meta name="robots" content="([^"]*)"/);
  const title = get(/<title>([^<]*)<\/title>/);
  return {
    path: p, en, lang: /<html[^>]*\slang="es"/.test(html) ? "es" : "en", file, html, title, title0: title,
    desc: get(/<meta name="description" content="([^"]*)"/), canon: toPath(get(/<link rel="canonical" href="([^"]*)"/) || abs(p)),
    noindex: /noindex/.test(robots), noindex0: /noindex/.test(robots),
    h1: [...root.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)].map((m) => text(m[1])),
    alt: Object.fromEntries([...head.matchAll(ALT)].map((m) => [m[1], toPath(unesc(m[2]))])),
    // the text a visitor reads, without dates, so a page that only says "updated today" does not count as changed
    words, hash: crypto.createHash("sha1").update(text((body || root).replace(/<nav\b[\s\S]*?<\/nav>/g, " ")).replace(/\b20\d\d-\d\d(-\d\d)?\b/g, "")).digest("hex").slice(0, 12),
    ...classify(en), trail: [], label: "", links: new Set(),
  };
}

// ------------------------------------------------------------------------------------------ state of the last build
export type State = { v: 1; built: string; pages: Record<string, [string, string, string?]>; redirects: Redirect[]; titles?: TitleState };
export type Redirect = { from: string; to: string | null; status: 301 | 410 };
/** The state file of the build that is live now (hashes and dates per page, redirects so far). Without it (first
 * build, no network) pages keep the dates the data gives them and no page is stamped with today's date. */
export function fetchState(): State | null {
  try {
    if (process.env.RH_SEO_STATE === "off") return null;
    const local = process.env.RH_SEO_STATE;
    const raw = local ? fs.readFileSync(local, "utf8") : spawnSync("curl", ["-fsS", "--max-time", "8", `${SITE}/seo-state.json`], { encoding: "utf8", timeout: 10000 }).stdout;
    const s = JSON.parse(raw || "null");
    return s && s.v === 1 && s.pages ? s : null;
  } catch { return null; }
}

// ------------------------------------------------------------------------------------------ the pass
export type PolishOpts = { cwd?: string; today?: string; state?: State | null; write?: boolean };
export function polish(root: string, opts: PolishOpts = {}): Audit {
  const cwd = opts.cwd || process.cwd();
  const today = opts.today || new Date().toISOString().slice(0, 10);
  const prev = opts.state === undefined ? fetchState() : opts.state;
  const readJson = (f: string, d: any) => { const p = path.resolve(cwd, f); try { return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : d; } catch { return d; } };

  const files: string[] = []; walk(root, files);
  const pages = new Map<string, Pg>();
  // "This page has moved" files that seo/listings writes for old addresses (noindex, canonical and refresh to the new
  // page): not pages of the site. They are left as they are; a link to one is pointed at the page it moved to.
  const stubs = new Map<string, string>();
  for (const f of files) {
    const rel = path.relative(root, path.dirname(f)).split(path.sep).join("/");
    const p = rel ? "/" + rel : "/";
    const raw = fs.readFileSync(f, "utf8");
    const moved = /<main\b[^>]*\sdata-rh-moved="([^"]+)"/.exec(raw);
    if (moved) { stubs.set(p, toPath(unesc(moved[1]))); continue; }
    // a second pass over the same folder starts from the page without the block of the first
    pages.set(p, readPage(p, f, raw.replace(/<aside class="rh-rel[\s\S]*?<\/aside><script>[\s\S]*?<\/script>/g, "")));
  }
  const get = (p: string) => pages.get(p);
  const live = (p: string) => { const g = pages.get(p); return !!g && !g.noindex && !g.dupOf; };

  // ---- homes: data, duplicates
  const rows: any[] = (readJson("public/data/rh-static.json", { rows: [] }).rows || []).filter((r: any) => r?.slug);
  const bySlug = new Map<string, any>(rows.map((r) => [String(r.slug), r]));
  const slugCountry = (c: string) => String(c || "").toLowerCase().trim().replace(/\s+/g, "-");
  const seen = new Map<string, any>();
  const born = (r: any) => String(r.publish_at || r.approved_at || "9");
  for (const r of rows.slice().sort((a, b) => born(a).localeCompare(born(b)) || String(a.slug).localeCompare(String(b.slug)))) {
    const key = [String(r.title || "").trim().toLowerCase(), r.price_eur, String(r.location_name || "").trim().toLowerCase()].join("|");
    const first = seen.get(key);
    if (!first) { seen.set(key, r); continue; }
    for (const pre of ["", "/es"]) { const d = get(`${pre}/deal/${r.slug}`); if (d && get(`${pre}/deal/${first.slug}`)) d.dupOf = `${pre}/deal/${first.slug}`; }
  }
  for (const pg of pages.values()) if (pg.kind === "deal") pg.cc = slugCountry(bySlug.get(pg.en.slice(6))?.country);

  // ---- 1. index or not
  for (const pg of pages.values()) {
    if (pg.noindex || HAS_IMPRESSIONS.has(pg.en)) continue;
    for (const [re, min, why] of NOINDEX_RULES) if (re.test(pg.en) && pg.words < min) { pg.noindex = true; pg.why = why; break; }
  }
  // a Spanish page follows its English page, and the other way round
  for (const pg of pages.values()) { const twin = get(pg.lang === "es" ? pg.en : withEs(pg.en)); if (twin?.noindex && !pg.noindex && twin.why) { pg.noindex = true; pg.why = twin.why; } }

  // ---- 3. body: links to pages that are gone, one h1
  const appRoute = appRoutes(cwd);
  const healed: Record<string, number> = {};
  for (const pg of pages.values()) {
    let r = rootOf(pg.html), touched = false;
    r = r.replace(/<a\b[^>]*?\shref="(\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/g, (m, h: string, inner: string) => {
      const p = toPath(h), t = get(p);
      if (!t && stubs.has(p) && get(stubs.get(p)!)) { touched = true; return m.replace(`href="${h}"`, `href="${stubs.get(p)}"`); }
      if (t?.dupOf) { touched = true; return m.replace(`href="${h}"`, `href="${t.dupOf}"`); }
      // a home that was sold or withdrawn: its pages go with every data update, the texts that mention it stay
      if (!t && /^\/(es\/)?deal\/[^/]+$/.test(p)) { touched = true; healed[p] = (healed[p] || 0) + 1; return inner; }
      return m;
    });
    if (!pg.noindex && !pg.dupOf && pg.h1.length === 0) {
      const h1 = stripBrand(pg.title);
      const ms = mains(r);
      const m0 = ms[0];
      if (m0) r = r.replace(m0, () => m0.replace(/^(<main\b[^>]*>(?:\s*<article\b[^>]*>)?(?:\s*<nav\b[\s\S]*?<\/nav>)?)/, (x) => `${x}<h1>${esc(h1)}</h1>`));
      else r += `<main class="rh-static"${pg.lang === "es" ? ' lang="es"' : ""}><h1>${esc(h1)}</h1><p>${esc(pg.desc)}</p></main>`;
      pg.h1 = [h1]; touched = true;
    }
    if (touched) pg.html = setRoot(pg.html, r);
  }

  // ---- names of countries, in both languages
  const guides: Record<string, any> = readJson("src/data/guides.json", {});
  const ccName: Record<Lang, Record<string, string>> = { en: {}, es: {} };
  for (const [k, g] of Object.entries(guides)) if (g?.name) ccName.en[k] = g.name;
  for (const r of rows) { const k = slugCountry(r.country); if (k) ccName.en[k] = r.country; }
  for (const [k, n] of Object.entries(ccName.en)) ccName.es[k] = esPlace(n);
  for (const pg of pages.values()) { if (pg.lang === "es" && pg.kind === "country") { const m = /: (.+)$/.exec(pg.h1[0] || ""); if (m) ccName.es[pg.cc] = m[1]; } }
  const nameOf = (cc: string, lang: Lang) => ccName[lang][cc] || cc.replace(/-/g, " ").replace(/\b\w/g, (x) => x.toUpperCase());
  const inThe = (cc: string, lang: Lang) => (lang === "es" ? theEs(nameOf(cc, "es")) : theEn(nameOf(cc, "en")));

  // ---- 4a. breadcrumbs: one trail per page, in the JSON-LD and on the page
  const S = (lang: Lang) => STR[lang];
  const home = (lang: Lang) => (lang === "es" ? "/es" : "/");
  const eur = (n: number) => "€" + Math.round(n).toLocaleString("en");
  const euro = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " €";
  const dealLabel = (pg: Pg) => { const r = bySlug.get(pg.en.slice(6)); return r ? (pg.lang === "es" ? `${euro(r.price_eur)} · ${r.title_es || r.title}` : `${eur(r.price_eur)} · ${r.title}`) : ""; };
  const ownLabel = (pg: Pg) =>
    pg.kind === "deal" ? dealLabel(pg) || pg.h1[0] || stripBrand(pg.title)
      : pg.kind === "country" && pg.lang === "es" ? `${S("es").homesIn} ${inThe(pg.cc, "es")}`
      : pg.h1[0] || stripBrand(pg.title);
  // first the trails the templates wrote, so their last item names the page everywhere else
  for (const pg of pages.values()) {
    const bc = ldOf(headOf(pg.html)).find((o) => o && o["@type"] === "BreadcrumbList");
    const items: [string, string][] = (bc?.itemListElement || []).filter((x: any) => x?.name && x?.item).map((x: any) => [String(x.name), toPath(String(x.item))]);
    pg.trail = items.length >= 2 && items[items.length - 1][1] === pg.path ? items : [];
    pg.label = pg.trail.length ? pg.trail[pg.trail.length - 1][0] : ownLabel(pg);
    if (pg.kind === "deal") pg.label = dealLabel(pg) || pg.label;
  }
  const ancestors = (pg: Pg): string[] => {
    const pre = pg.lang === "es" ? "/es" : "";
    if (pg.kind === "deal") {
      const r = bySlug.get(pg.en.slice(6)); const out: string[] = [];
      if (r && pg.cc) { out.push(`${pre}/homes/${pg.cc}`); const rg = slugify(regionOf(r)); if (rg) out.push(`${pre}/homes/${pg.cc}/${rg}`); }
      return out;
    }
    const s = pg.en.split("/").filter(Boolean); const out: string[] = [];
    for (let i = 1; i < s.length; i++) out.push(pre + "/" + s.slice(0, i).join("/"));
    if (s[0] === "research" && s.length === 2) out.push(pre + "/blog");
    return out;
  };
  const setTrail = (pg: Pg) => {
    const h = home(pg.lang);
    if (pg.path === h) { pg.trail = []; return; }
    let mid: [string, string][];
    if (pg.trail.length) {
      // a template's trail: the steps in between must be pages of the same language that exist
      mid = pg.trail.slice(1, -1).map(([n, p]): [string, string] => { const t = get(p); return t && t.lang === pg.lang ? [n, p] : pg.lang === "es" && get(withEs(stripEs(p))) ? [get(withEs(stripEs(p)))!.label, withEs(stripEs(p))] : ["", ""]; }).filter(([n]) => n);
    } else mid = ancestors(pg).filter((p) => get(p) && get(p)!.lang === pg.lang).map((p) => [get(p)!.label, p]);
    pg.trail = [["RealHunt", h], ...mid, [pg.label, pg.path]];
  };
  const writeTrail = (pg: Pg) => {
    if (!pg.trail.length) return;
    const ld = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: pg.trail.map(([name, p], i) => ({ "@type": "ListItem", position: i + 1, name, item: abs(p) })) };
    let had = false;
    pg.html = mapLd(pg.html, (o) => (o && o["@type"] === "BreadcrumbList" ? (had ? null : ((had = true), ld)) : o));
    if (!had) pg.html = addHead(pg.html, ldTag(ld));
    const nav = `<nav class="rh-bc" aria-label="${S(pg.lang).breadcrumb}">${pg.trail.map(([n, p], i) => (i === pg.trail.length - 1 ? `<span aria-current="page">${esc(n)}</span>` : `<a href="${esc(p)}">${esc(n)}</a>`)).join(" › ")}</nav>`;
    const r = rootOf(pg.html); const m0 = mains(r)[0];
    if (!m0) return;
    // a listing page (seo/listings) draws its own trail further down, after its styles: that one is rewritten in
    // place. Before 15-nov-2026 a second trail was added above it and the page showed two.
    const own = /<nav class="ls-crumbs"[^>]*>[\s\S]*?<\/nav>/.exec(m0);
    if (own) { pg.html = setRoot(pg.html, r.replace(m0, () => m0.replace(own[0], () => nav.replace('class="rh-bc"', 'class="ls-crumbs"')))); return; }
    const open = /^<main\b[^>]*>(?:\s*<article\b[^>]*>)?/.exec(m0)![0];
    const rest = m0.slice(open.length);
    const old = /^\s*<nav\b[^>]*>[\s\S]*?<\/nav>/.exec(rest);
    const isCrumb = old && (/aria-label="(Breadcrumb|Ruta)"/.test(old[0]) || / › /.test(old[0]));
    pg.html = setRoot(pg.html, r.replace(m0, () => open + nav + (isCrumb ? rest.slice(old![0].length) : rest)));
  };
  for (const pg of pages.values()) setTrail(pg);

  // ---- 4b. HTML site map: /sitemap and one page per group, English and Spanish
  const ctx: RelCtx = { pages, get, live, nameOf, inThe, bySlug, slugCountry };
  for (const sp of sitemapPages(ctx)) {
    const base = get(sp.path) || get(sp.lang === "es" ? "/es/about" : "/sitemap") || [...pages.values()].find((x) => x.lang === sp.lang && x.kind !== "deal" && !x.noindex);
    if (!base) continue;
    let h = base.html;
    h = h.replace(ALT, "").replace(/<link rel="preload" as="image"[^>]*>/g, "");
    h = mapLd(h, (o) => (o && (o["@type"] === "Organization" || o["@type"] === "WebSite") ? o : null));
    for (const k of ["og:title", "twitter:title"]) h = h.replace(new RegExp(`(<meta (?:property|name)="${k}" content=")[^"]*"`), (_m, a: string) => `${a}${esc(sp.title)}"`);
    for (const k of ["og:description", "twitter:description"]) h = h.replace(new RegExp(`(<meta (?:property|name)="${k}" content=")[^"]*"`), (_m, a: string) => `${a}${esc(sp.desc)}"`);
    h = h.replace(/(<meta property="og:url" content=")[^"]*"/, (_m, a: string) => `${a}${abs(sp.path)}"`);
    h = setRoot(setRobots(setCanon(setDesc(setTitle(h, sp.title), sp.desc), abs(sp.path)), false), sp.body);
    const file = path.join(root, sp.path.slice(1), "index.html");
    const pg = readPage(sp.path, file, h);
    pg.made = true; pg.label = sp.label; pg.trail = []; pg.alt = {};
    pages.set(sp.path, pg);
  }
  for (const pg of pages.values()) if (pg.made) { const twin = get(pg.lang === "es" ? pg.en : withEs(pg.en)); if (twin?.made) pg.alt = { en: pg.en, es: withEs(pg.en), "x-default": pg.en }; setTrail(pg); }
  for (const pg of pages.values()) writeTrail(pg);

  // ---- 2. titles and descriptions (indexable pages; the fullest wording that no other page has)
  const taken = new Set<string>();
  const order = [...pages.values()].filter((p) => !p.noindex && !p.dupOf).sort((a, b) => a.title.length - b.title.length || a.path.localeCompare(b.path));
  for (const pg of order) {
    const t = pickTitle(pg.title, pg.lang, pg.kind, taken);
    taken.add(t);
    let facts: string[] | undefined;
    if (pg.kind === "deal") {
      const r = bySlug.get(pg.en.slice(6));
      if (r) facts = pg.lang === "es"
        ? [r.nota != null ? `Nota RealHunt: ${r.nota} de 98` : "", [r.sqm ? `${r.sqm} m²` : "", r.bedrooms ? `${r.bedrooms} ${r.bedrooms === 1 ? "dormitorio" : "dormitorios"}` : ""].filter(Boolean).join(", ")].filter(Boolean).map((x) => x + ".")
        : [r.nota != null ? `RealHunt score ${r.nota} of 98` : "", [r.sqm ? `${r.sqm} m²` : "", r.bedrooms ? `${r.bedrooms} ${r.bedrooms === 1 ? "bedroom" : "bedrooms"}` : ""].filter(Boolean).join(", ")].filter(Boolean).map((x) => x + ".");
    }
    const d = polishDesc(pg.desc, { lang: pg.lang, kind: pg.kind, title: pg.title0, facts });
    if (t !== pg.title) { pg.html = setTitle(pg.html, t); pg.title = t; }
    if (d !== pg.desc) { pg.html = setDesc(pg.html, d); pg.desc = d; }
  }

  // ---- 1b. robots, canonical and hreflang after the decisions above
  for (const pg of pages.values()) {
    if (pg.noindex !== pg.noindex0) pg.html = setRobots(pg.html, pg.noindex);
    if (pg.dupOf) { pg.html = setCanon(pg.html, abs(pg.dupOf)); pg.canon = pg.dupOf; }
    const en = get(pg.alt.en || ""), es = get(pg.alt.es || "");
    const ok = en && es && live(en.path) && live(es.path) && (pg === en || pg === es);
    const had = Object.keys(pg.alt).length > 0 && !pg.made;
    if (had && !ok) { pg.html = pg.html.replace(ALT, ""); pg.alt = {}; }
    if (pg.made && ok) pg.html = addHead(pg.html.replace(ALT, ""), hreflangTags(en!.path, (p) => live(p), SITE));
    if (pg.made && !ok) pg.alt = {};
  }

  // ---- 7. structured data: what each page type needs, fixed where the page itself has the answer
  const ldNotes: Record<string, number> = {};
  const note = (k: string) => { ldNotes[k] = (ldNotes[k] || 0) + 1; };
  for (const pg of pages.values()) {
    if (pg.noindex) continue;
    const before = pg.html;
    pg.html = mapLd(pg.html, (o) => {
      if (!o || typeof o !== "object") return o;
      const t = o["@type"];
      if (t === "ItemList" && Array.isArray(o.itemListElement)) {
        // a list never points at a page that is gone, and its positions run 1..n
        const items = o.itemListElement.filter((x: any) => { const u = x?.url ? toPath(String(x.url)) : ""; return !u || !/^\/(es\/)?deal\//.test(u) || !!get(u); })
          .map((x: any) => { const t2 = x?.url ? get(toPath(String(x.url))) : undefined; return t2?.dupOf ? { ...x, url: abs(t2.dupOf) } : x; });
        const uniq = items.filter((x: any, i: number) => !x.url || items.findIndex((y: any) => y.url === x.url) === i);
        if (uniq.length !== o.itemListElement.length || uniq.some((x: any, i: number) => x.position !== i + 1)) { note("ItemList: items removed or renumbered"); o = { ...o, itemListElement: uniq.map((x: any, i: number) => ({ ...x, position: i + 1 })) }; }
        if (!uniq.length) { note("ItemList: empty, removed"); return null; }
        if (pg.lang === "es" && !o.inLanguage) o = { ...o, inLanguage: "es" };
        return o;
      }
      if (t === "FAQPage") {
        const qa = (o.mainEntity || []).filter((q: any) => q?.name && q?.acceptedAnswer?.text);
        if (!qa.length) { note("FAQPage: no questions, removed"); return null; }
        if (qa.length !== (o.mainEntity || []).length) { note("FAQPage: empty question removed"); return { ...o, mainEntity: qa }; }
        return o;
      }
      if (t === "RealEstateListing") {
        const r = bySlug.get(pg.en.slice(6));
        const fix: any = { ...o };
        if (!fix.datePosted && r && /^\d{4}-\d{2}-\d{2}/.test(String(r.publish_at || r.approved_at || ""))) { fix.datePosted = String(r.publish_at || r.approved_at).slice(0, 10); note("RealEstateListing: datePosted added"); }
        if (pg.lang === "es" && !fix.inLanguage) fix.inLanguage = "es";
        if (!fix.mainEntityOfPage) fix.mainEntityOfPage = abs(pg.path);
        if (!fix.offers?.price || !fix.offers?.priceCurrency) note("RealEstateListing: offer without price or currency");
        else if (!fix.offers?.availability) note("RealEstateListing: availability left out (advert not confirmed)");
        if (!fix.image || (Array.isArray(fix.image) && !fix.image.length)) note("RealEstateListing: no image");
        return fix;
      }
      if (t === "Article") {
        const fix: any = { ...o };
        if (pg.lang === "es" && !fix.inLanguage) fix.inLanguage = "es";
        if (typeof fix.mainEntityOfPage === "string" && toPath(fix.mainEntityOfPage) !== pg.path) fix.mainEntityOfPage = abs(pg.path);
        if (!fix.author?.name || !fix.datePublished || !fix.headline || !fix.image) note("Article: author, date, headline or image missing");
        if (String(fix.headline || "").length > 110) note("Article: headline over 110 characters");
        return fix;
      }
      if (t === "WebSite" && o.potentialAction) {
        // the search box: only the home page declares it, in its own language
        if (pg.path !== "/" && pg.path !== "/es") { const { potentialAction: _drop, ...restSite } = o; return restSite; }
      }
      return o;
    });
    if (pg.html !== before) note("pages with JSON-LD changed");
  }

  // ---- 4c. related block at the end of every page, then who links to whom
  const blocks = new Map<string, string>();
  for (const pg of pages.values()) {
    if (pg.dupOf || /^\/(es\/)?sitemap(\/|$)/.test(pg.path)) continue;
    const rows2 = relatedRows(pg, ctx);
    if (rows2.length) blocks.set(pg.path, renderRelated(pg, rows2));
  }
  for (const pg of pages.values()) {
    const b = blocks.get(pg.path);
    if (b) { pg.html = setRoot(pg.html, rootOf(pg.html) + b); if (!pg.html.includes('id="rh-rel-css"')) pg.html = addHead(pg.html, REL_HEAD); }
    pg.links = hrefs(rootOf(pg.html));
  }

  // ---- 5. sitemaps
  const old = oldSitemaps(root);
  const state: State = { v: 1, built: today, pages: {}, redirects: [] };
  const lastmod = new Map<string, string>();
  for (const pg of pages.values()) {
    if (!live(pg.path)) continue;
    const was = prev?.pages[pg.path]; const data = old.get(pg.path)?.lastmod || "";
    const d = was ? (was[0] === pg.hash ? was[1] || data : today) : data;
    if (d) lastmod.set(pg.path, d);
    const target = pg.kind === "deal" && pg.cc ? `/homes/${pg.cc}` : undefined;
    state.pages[pg.path] = target ? [pg.hash, d, target] : [pg.hash, d];
  }
  const maps = new Map<string, Pg[]>();
  for (const pg of pages.values()) if (live(pg.path) && pg.canon === pg.path) { const g = (pg.lang === "es" ? "es-" : "") + groupOf(pg); (maps.get(g) || maps.set(g, []).get(g)!).push(pg); }
  const names = [...GROUPS.map((g) => g.key), ...GROUPS.map((g) => "es-" + g.key)].filter((g) => maps.has(g));
  const sm: Record<string, number> = {};

  // ---- 6. redirects for old and removed URLs
  const own = buildRedirects({ pages, live, prev, cwd, slugCountry, rows });
  state.redirects = own;
  // dist/redirects.json is one flat object { "/old": "/new" } shared with seo/listings, which writes its entries
  // first: ours are added, never in place of one that is there. "410" as the value means the address is gone.
  let redirects: Record<string, string> = {};
  try { const had = JSON.parse(fs.readFileSync(path.join(root, "redirects.json"), "utf8")); if (had && typeof had === "object" && !Array.isArray(had)) redirects = had; } catch { /* none yet */ }
  for (const r of own) if (!(r.from in redirects)) redirects[r.from] = r.to ?? "410";
  // no chains: an address goes straight to where its target went
  for (const [from, to] of Object.entries(redirects)) { let t = to, n = 0; while (t !== "410" && redirects[t] && redirects[t] !== t && n++ < 5) t = redirects[t]; if (t !== to) redirects[from] = t; }
  for (const from of Object.keys(redirects)) if (pages.has(from) && !pages.get(from)!.dupOf) delete redirects[from]; // the address is a page

  // ---- 6b. what code can fix by itself (seo/tech/audit.ts), then the first paint of the pages the app takes over
  const techFixed = techHeal(pages, redirects);
  for (const pg of pages.values()) { pg.html = withSiteHead(pg); pg.links = hrefs(rootOf(pg.html)); }
  // titles: when each one last changed, so a title that changes again within four weeks is seen (idea 1000)
  const tHash = (t: string) => crypto.createHash("sha1").update(t).digest("hex").slice(0, 8);
  const days = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
  state.titles = {};
  for (const pg of pages.values()) {
    if (!live(pg.path)) continue;
    const h = tHash(pg.title), was = prev?.titles?.[pg.path];
    state.titles[pg.path] = !was ? [h, ""] : was[0] === h ? was : [h, today, was[1] && days(was[1], today) < 28 ? (was[2] || 0) + 1 : 0];
  }
  const tech = techAudit({ pages, live, redirects, rows, titles: state.titles, prevTitles: prev?.titles, placeNames: [...new Set([...Object.values(ccName.en), ...Object.values(ccName.es), ...rows.flatMap((r) => String(r.location_name || "").split(",").map((x: string) => x.trim()))])].filter(Boolean) });
  tech.summary.fixed_here = Object.values(techFixed).reduce((x, y) => x + y, 0);
  for (const [k, v] of Object.entries(techFixed)) tech.summary[k] = v;

  // ---- 8. audit
  const rep = audit({ pages, live, appRoute, healed, ldNotes, lastmod, redirects: Object.keys(redirects).length, stubs, es: (() => { try { return JSON.parse(fs.readFileSync(path.join(root, "es-coverage.json"), "utf8")); } catch { return null; } })() });

  rep.tech = tech;
  for (const f of tech.failures) rep.failures.push("tech: " + f);

  if (opts.write !== false) {
    for (const pg of pages.values()) { fs.mkdirSync(path.dirname(pg.file), { recursive: true }); fs.writeFileSync(pg.file, pg.html); }
    for (const f of fs.readdirSync(root)) if (/^sitemap(-[a-z0-9-]+)?\.xml$/.test(f)) fs.unlinkSync(path.join(root, f));
    const parts: string[] = [];
    for (const g of names) {
      const list = maps.get(g)!.sort((a, b) => a.path.localeCompare(b.path));
      const img = (p: Pg) => old.get(p.path)?.images || [];
      const alts = (p: Pg) => (p.alt.en && p.alt.es ? sitemapAlternates(p.alt.en, (x) => live(x), SITE) : "");
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${list.some((p) => img(p).length) ? ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"' : ""}${list.some((p) => alts(p)) ? ' xmlns:xhtml="http://www.w3.org/1999/xhtml"' : ""}>\n`
        + list.map((p) => `  <url><loc>${esc(abs(p.path))}</loc>${lastmod.get(p.path) ? `<lastmod>${lastmod.get(p.path)}</lastmod>` : ""}${alts(p)}${img(p).map((i) => `<image:image><image:loc>${esc(i)}</image:loc></image:image>`).join("")}</url>\n`).join("") + "</urlset>\n";
      fs.writeFileSync(path.join(root, `sitemap-${g}.xml`), xml);
      sm[`sitemap-${g}.xml`] = list.length;
      const last = list.map((p) => lastmod.get(p.path) || "").sort().pop();
      parts.push(`  <sitemap><loc>${SITE}/sitemap-${g}.xml</loc>${last ? `<lastmod>${last}</lastmod>` : ""}</sitemap>\n`);
    }
    fs.writeFileSync(path.join(root, "sitemap.xml"), '<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + parts.join("") + "</sitemapindex>\n");
    fs.writeFileSync(path.join(root, "redirects.json"), JSON.stringify(redirects, null, 1) + "\n");
    fs.writeFileSync(path.join(root, "seo-state.json"), JSON.stringify(state) + "\n");
    rep.sitemaps = sm;
    fs.writeFileSync(path.join(root, "seo-audit.json"), JSON.stringify(rep, null, 1) + "\n");
    // build.json: the number of indexable pages after this pass
    // idea 101: the pages worth asking Google for by hand, the three countries that already get impressions first
    const perCc = new Map<string, number>(); for (const r of rows) { const k = slugCountry(r.country); perCc.set(k, (perCc.get(k) || 0) + 1); }
    const enLive = [...pages.values()].filter((p) => p.lang === "en" && live(p.path));
    const first3 = ["bulgaria", "italy", "france"];
    const capOf = (p: Pg) => Number(/under-(\d+)$/.exec(p.en)?.[1] || 0);
    const toIndex = [...new Set([
      ...first3.flatMap((c) => [...enLive.filter((p) => p.kind === "band" && p.cc === c).sort((x, y) => capOf(x) - capOf(y)).slice(0, 3), ...enLive.filter((p) => p.kind === "country" && p.cc === c)]),
      ...enLive.filter((p) => p.kind === "country" && !first3.includes(p.cc)).sort((x, y) => (perCc.get(y.cc) || 0) - (perCc.get(x.cc) || 0)),
    ].map((p) => p.path))].slice(0, 20);
    writeReport(root, rep, { today, rows: rows.length, toIndex });
    try { const bf = path.join(root, "build.json"); const b = JSON.parse(fs.readFileSync(bf, "utf8")); b.indexable_pages = rep.summary.indexable; fs.writeFileSync(bf, JSON.stringify(b) + "\n"); } catch { /* no build.json */ }
  }
  return rep;
}

/** lastmod and images per URL, as seo/prerender.ts wrote them (from the dates of the homes and the posts). */
function oldSitemaps(root: string) {
  const out = new Map<string, { lastmod: string; images: string[] }>();
  for (const f of fs.readdirSync(root)) {
    if (!/^sitemap-[a-z0-9-]+\.xml$/.test(f)) continue;
    for (const m of fs.readFileSync(path.join(root, f), "utf8").matchAll(/<url><loc>([^<]+)<\/loc>([\s\S]*?)<\/url>/g))
      out.set(toPath(unesc(m[1])), { lastmod: /<lastmod>([^<]+)</.exec(m[2])?.[1] || "", images: [...m[2].matchAll(/<image:loc>([^<]+)</g)].map((x) => unesc(x[1])) });
  }
  return out;
}

/** The routes of the app (src/App.tsx): a link to one of them is not broken even though it has no HTML file. */
export function appRoutes(cwd: string): (p: string) => boolean {
  let src = "";
  try { src = fs.readFileSync(path.resolve(cwd, "src/App.tsx"), "utf8"); } catch { /* tests */ }
  const res = [...src.matchAll(/<Route\s+path="([^"]+)"/g)].map((m) => m[1]).filter((p) => p !== "*" && p !== "/es/*")
    .map((p) => new RegExp("^" + p.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/:[A-Za-z]+/g, "[^/]+").replace(/\/\*$/, "(/.*)?") + "$"));
  return (p: string) => res.some((re) => re.test(stripEs(p)));
}

function buildRedirects({ pages, live, prev, cwd, slugCountry, rows }: { pages: Map<string, Pg>; live: (p: string) => boolean; prev: State | null; cwd: string; slugCountry: (c: string) => string; rows: any[] }): Redirect[] {
  const out = new Map<string, Redirect>();
  const exists = (p: string) => pages.has(p) && !pages.get(p)!.dupOf;
  // where a page that is gone should send its visitors: its closest page above it that is indexable
  const up = (p: string): string | null => { const s = p.split("/").filter(Boolean); for (let i = s.length - 1; i >= 1; i--) { const a = "/" + s.slice(0, i).join("/"); if (a !== "/es" && live(a)) return a; } return null; };
  const put = (from: string, to: string | null) => {
    if (exists(from)) return; // the address is a page again
    const t = to && exists(to) ? to : up(from);
    out.set(from, t ? { from, to: t, status: 301 } : { from, to: null, status: 410 });
  };
  // 1. what earlier builds already redirected, and the list kept in the repo (router history, homes removed before this file existed)
  let seed: Redirect[] = [];
  try { seed = JSON.parse(fs.readFileSync(path.resolve(cwd, "seo/redirects-seed.json"), "utf8")).redirects || []; } catch { /* none */ }
  for (const r of [...seed, ...(prev?.redirects || [])]) put(r.from, r.to);
  // 2. the old country address of the app: /country/<x> -> /homes/<x>
  for (const c of new Set(rows.map((r) => slugCountry(r.country)).filter(Boolean))) for (const pre of ["", "/es"]) if (exists(`${pre}/homes/${c}`)) put(`${pre}/country/${c}`, `${pre}/homes/${c}`);
  // 2b. a home whose address has capital letters (/deal/Dc2FknAIzJt): the all-lowercase spelling goes to it (idea 106)
  const slugs = new Set(rows.map((r) => String(r.slug)));
  for (const r of rows) { const s = String(r.slug), low = s.toLowerCase(); if (low !== s && !slugs.has(low)) for (const pre of ["", "/es"]) if (exists(`${pre}/deal/${s}`)) put(`${pre}/deal/${low}`, `${pre}/deal/${s}`); }
  // 3. a home listed twice: the second address goes to the first
  for (const pg of pages.values()) if (pg.dupOf) out.set(pg.path, { from: pg.path, to: pg.dupOf, status: 301 });
  // 4. pages of the last build that are gone now (a home that was sold: to its country)
  for (const [p, v] of Object.entries(prev?.pages || {})) if (!pages.has(p)) put(p, v[2] ? (p.startsWith("/es/") && exists("/es" + v[2]) ? "/es" + v[2] : v[2]) : null);
  return [...out.values()].sort((a, b) => a.from.localeCompare(b.from));
}

/** Vite plugin, right after prerenderPages(). A failed check stops the build (RH_SEO_SOFT=1 only reports). */
export function polishPages() {
  let outDir = "dist";
  return {
    name: "rh-seo-polish",
    apply: "build" as const,
    configResolved(c: { build: { outDir: string } }) { outDir = c.build.outDir; },
    closeBundle() {
      const root = path.resolve(process.cwd(), outDir);
      if (!fs.existsSync(path.join(root, "index.html")) || !fs.existsSync(path.join(root, "sitemap.xml"))) return; // nothing was prerendered
      const rep = polish(root);
      const s = rep.summary;
      console.log(`[rh-seo-polish] ${s.pages} pages, ${s.indexable} indexable (${s.noindex_by_polish} set to noindex here); titles over 60: ${s.title_over_60}; descriptions outside 120-155: ${s.desc_out_of_range}; fewer than 3 links in: ${s.inlinks_under_3}; redirects: ${s.redirects}. Report: dist/seo-audit.json`);
      if (rep.failures.length) {
        const msg = `[rh-seo-polish] ${rep.failures.length} check(s) failed:\n` + rep.failures.map((f) => "  - " + f).join("\n");
        if (process.env.RH_SEO_SOFT === "1") console.warn(msg); else throw new Error(msg);
      }
    },
  };
}
