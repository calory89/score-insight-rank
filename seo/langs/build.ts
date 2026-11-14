// Listing pages in German, Russian, French, Dutch and Polish (15-nov-2026): /de/homes/spain/under-50000,
// /ru/homes/bulgaria... One pass over dist/ after seo/prerender.ts and seo/polish.ts, so the English and Spanish
// pages are final when their language links are added.
//
// What decides whether a page exists in a language:
//  1. the language has a pack (seo/listings/pack.<lang>.ts) and the page's family is in its list (seo/langs/config.ts);
//  2. every home on the page has a title in that language (seo/listings/titles.<lang>.json) and every place on it
//     has a vetted name: seo/listings/page.ts compose() answers null otherwise;
//  3. for a page of one country, the buying rules of that country are translated (seo/listings/dest.<lang>.json):
//     a page that lists homes in Denmark must be able to say who may buy there;
//  4. the English page is in dist and indexable;
//  5. no English is left in the finished page (seo/listings/packkit.ts englishIn).
// A page that fails any of these has no address in that language. Nothing is redirected by country or browser.
//
// The pages are plain documents (seo/langs/shell.ts): the app has no strings for these languages and never loads on
// them. Homes link to their English page, and the page says so.
import fs from "fs";
import path from "path";
import { listingPlan, listingRows, composeAll, listingCss } from "../listings/build";
import { renderBody, renderLd, type Text, type Link } from "../listings/page";
import type { Facet } from "../listings/facets";
import type { Pack } from "../listings/pack";
import { englishIn, hasDest, titleIn, NEW_LANGS, type NewLang } from "../listings/packkit";
import { renderDoc, markEnglish, SITE, type Alt } from "./shell";
import { UI, LANG_NAME, OTHER, type Ui } from "./strings";
import { PACKS, CONFIG, MAX_TOTAL } from "./config";

const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const unesc = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
const ALT = /<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"\s*\/?>/g;
const file = (root: string, p: string) => path.join(root, p.replace(/^\//, ""), "index.html");
const HUB = "/cheap-houses";

/** The visible text of a page, one unit per text node, for the English check. */
export const visible = (html: string) => unesc(html.replace(/<(script|style)\b[\s\S]*?<\/\1>/g, "\n").replace(/<span class="lx-m"[^>]*>EN<\/span>/g, "").replace(/<[^>]+>/g, "\n"));

export type Dropped = { path: string; why: string };
export type LangPlan = { lang: NewLang; P: Pack; ui: Ui; pages: { f: Facet; T: Text }[]; dropped: Dropped[] };

/** Which pages each language gets (rules 1 to 4 above; rule 5 is checked on the finished HTML). */
export function planLangs(rows: Record<string, any>[], enLive: (p: string) => boolean): { plan: ReturnType<typeof listingPlan>; langs: LangPlan[] } {
  const plan = listingPlan(rows);
  const langs: LangPlan[] = [];
  for (const lang of NEW_LANGS) {
    const P = PACKS[lang], ui = UI[lang], cfg = CONFIG[lang];
    if (!P || !ui || !cfg) continue;
    const { texts } = composeAll(plan, rows, P);
    const dropped: Dropped[] = []; const ok: { f: Facet; T: Text }[] = [];
    for (const f of plan.pages) {
      if (f.thin || !cfg.kinds.includes(f.kind)) continue;
      const T = texts.get(f.path);
      if (!T) { dropped.push({ path: f.path, why: "a home without a title in this language, or a place without a vetted name" }); continue; }
      if (f.cc && !hasDest(lang, f.cc)) { dropped.push({ path: f.path, why: `buying rules of ${f.cc} not translated` }); continue; }
      if (!enLive(f.path)) { dropped.push({ path: f.path, why: "the English page is missing or noindex" }); continue; }
      ok.push({ f, T });
    }
    // the budget of the language: countries first, then the pages with most homes
    ok.sort((a, b) => Number(b.f.kind === "country") - Number(a.f.kind === "country") || b.f.homes.length - a.f.homes.length || a.f.path.localeCompare(b.f.path));
    for (const x of ok.splice(cfg.max)) dropped.push({ path: x.f.path, why: `over the page budget of the language (${cfg.max})` });
    langs.push({ lang, P, ui, pages: ok, dropped });
  }
  return { plan, langs };
}

/** The page as this language can show it: links only to pages that exist in the language. */
function localize(T: Text, has: (p: string) => boolean): Text {
  const keep = (l: Link) => has(l[1]) || !/^\/(homes|cheap-houses)(\/|$)/.test(l[1]);
  return {
    ...T,
    chips: T.chips.filter(keep),
    more: T.more.map(([label, links]): [string, Link[]] => [label, links.filter(keep)]).filter(([, links]) => links.length > 0),
    footLinks: T.footLinks.filter(keep),
    costTable: T.costTable.map((c) => (c.path && !has(c.path) ? { ...c, path: "" } : c)),
    crumbs: T.crumbs.filter(([, p], i) => i === 0 || i === T.crumbs.length - 1 || has(p)),
  };
}

function hubPage(L: LangPlan, has: (p: string) => boolean, href: (p: string) => string, css: string, rows: Record<string, any>[]) {
  const { P, ui } = L; const t = ui.hub;
  const pages = L.pages.map((x) => x.f);
  const a = (p: Facet, label = P.label(p)) => `<a class="ls-chip" href="${esc(href(p.path))}">${esc(label)} <small>${p.homes.length}</small></a>`;
  const global = pages.filter((p) => !p.cc);
  const hubs = pages.filter((p) => p.kind === "country").sort((x, y) => y.homes.length - x.homes.length);
  const order = ["band", "setting", "area", "ptype", "beds", "region", "feature", "combo", "ccyBand"];
  const country = (c: Facet) => {
    const kids = pages.filter((p) => p.cc === c.cc && p !== c && order.includes(p.kind));
    kids.sort((x, y) => order.indexOf(x.kind) - order.indexOf(y.kind) || (x.cap || 0) - (y.cap || 0) || (x.beds || 0) - (y.beds || 0) || y.homes.length - x.homes.length);
    return `<h3><a href="${esc(href(c.path))}">${esc(P.country(c.country!))}</a> · ${c.homes.length} ${esc(typeof t.homes === "function" ? t.homes(c.homes.length) : t.homes)}</h3><p>${kids.map((p) => a(p)).join(" ")}</p>`;
  };
  const slugs = new Set(pages.flatMap((p) => p.homes.map((h) => String(h.slug))));
  const prices = rows.filter((r) => slugs.has(String(r.slug))).map((r) => Number(r.price_eur)).filter((x) => x > 0);
  const chips = (label: string, list: Facet[]) => (list.length ? `<p><b>${esc(label)}</b> ${list.map((p) => a(p)).join(" ")}</p>` : "");
  const lede = t.lede(slugs.size, hubs.length, pages.length);
  const about = prices.length ? t.about(slugs.size, P.money(Math.min(...prices)), P.money(Math.max(...prices))) : [];
  const g = (kind: string, f: (p: Facet) => boolean = () => true) => global.filter((p) => p.kind === kind && f(p));
  const globals = chips(t.budgets, g("gband")) + chips(t.features, g("gfeature", (p) => !p.ranked)) + chips(t.combo, g("combo")) + chips(t.ranked, g("gfeature", (p) => !!p.ranked)) + chips(t.near, g("near")) + chips(t.ccy, g("ccyBand"));
  const main = `<main class="rh-static" data-ls lang="${L.lang}"><style>${css}</style><h1>${esc(t.h1)}</h1><p class="ls-lede">${esc(lede)}</p>${about.map((x) => `<p>${esc(x)}</p>`).join("")}`
    + (globals ? `<h2>${esc(t.all)}</h2><div class="ls-more">${globals}</div>` : "")
    + `<h2 id="countries">${esc(t.by)}</h2><div class="ls-more">${hubs.map(country).join("")}</div>`
    + `<h2 id="faq">${esc(t.faqTitle)}</h2><div class="ls-faq">${t.faq.map(([q, x]) => `<h3>${esc(q)}</h3><p>${esc(x)}</p>`).join("")}</div></main>`;
  const ld: object[] = [{ "@context": "https://schema.org", "@type": "FAQPage", inLanguage: L.lang, mainEntity: t.faq.map(([q, x]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: x } })) }];
  return { title: t.title, desc: t.desc, main, ld };
}

export type LangReport = {
  total: number; max_total: number;
  langs: Record<string, { pages: number; by_kind: Record<string, number>; by_country: Record<string, number>; homes_with_title: number; homes: number; not_published: number; not_published_sample: Dropped[]; sitemap: string }>;
  hreflang: { english_pages_linked: number; spanish_pages_linked: number };
  failures: string[];
};

/** Writes every page, the language links of the English and Spanish pages, the sitemaps and dist/lang-coverage.json. */
export function writeLangs(root: string, rows: Record<string, any>[] = listingRows()): LangReport {
  const read = (p: string) => { const f = file(root, p); return fs.existsSync(f) ? fs.readFileSync(f, "utf8") : ""; };
  const indexable = (h: string) => !!h && !/<meta name="robots" content="[^"]*noindex/.test(h) && !/data-rh-moved=/.test(h);
  const enCache = new Map<string, boolean>();
  const enLive = (p: string) => { if (!enCache.has(p)) enCache.set(p, indexable(read(p))); return enCache.get(p)!; };
  const { langs } = planLangs(rows, enLive);
  const css = listingCss();
  const updated = String(JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "public/data/rh-static.json"), "utf8")).generated || "").slice(0, 10) || new Date().toISOString().slice(0, 10);
  const colors: Record<string, string> = (() => { try { return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "src/data/card-colors.json"), "utf8")); } catch { return {}; } })();
  const failures: string[] = [];

  // ---- render, check for English, and settle the set of pages of each language (a page that goes takes its links with it)
  type Out = { f: Facet | null; path: string; enPath: string; title: string; desc: string; image: string; main: string; ld: object[]; lastmod: string | null };
  const outs = new Map<NewLang, Out[]>();
  for (const L of langs) {
    const { lang, P, ui } = L;
    let list: Out[] = [];
    for (let round = 0; round < 4; round++) {
      const set = new Set(L.pages.map((x) => x.f.path));
      const has = (p: string) => set.has(p);
      const href = (p: string) => (p === "/" || p === HUB ? `/${lang}` : has(p) ? `/${lang}${p}` : p);
      list = []; const bad = new Set<string>();
      for (const { f, T } of L.pages) {
        const t = localize(T, has);
        let main = renderBody(t, P, { css, colors, updated, href, lang }).replace(/<script>try\{if\(document\.documentElement\.getAttribute\("data-lang"\)[\s\S]*?<\/script>/, "").replace(" data-rh-keep data-rh-static", "");
        const note = `<p class="lx-en">${esc(ui.enHomes)}</p>`;
        main = main.replace(/(<h2 id="homes">[\s\S]*?<\/h2>)/, (m) => m + note);
        main = markEnglish(main, lang, ui.enTitle).replace(/ data-lx/g, "");
        if (ui.sqm) main = main.replace(/(\d) m²/g, `$1 ${ui.sqm}`); // the template writes the unit in Latin letters
        const hits = englishIn(lang, visible(main) + "\n" + t.title + "\n" + t.desc);
        if (hits.length) { bad.add(f.path); L.dropped.push({ path: f.path, why: `English left: ${[...new Set(hits)].slice(0, 8).join(", ")}` }); continue; }
        const ld = renderLd(t, P, (p) => SITE + href(p)).map((x: any) => (x["@type"] === "ItemList" || x["@type"] === "FAQPage" ? { ...x, inLanguage: lang } : x));
        list.push({ f, path: `/${lang}${f.path}`, enPath: f.path, title: t.title, desc: t.desc, image: t.image, main, ld, lastmod: t.lastmod });
      }
      if (!bad.size) break;
      L.pages = L.pages.filter((x) => !bad.has(x.f.path));
    }
    if (list.length) {
      const set = new Set(L.pages.map((x) => x.f.path));
      const href = (p: string) => (p === "/" || p === HUB ? `/${lang}` : set.has(p) ? `/${lang}${p}` : p);
      const h = hubPage(L, (p) => set.has(p), href, css, rows);
      const hits = englishIn(lang, visible(h.main) + "\n" + h.title + "\n" + h.desc);
      if (hits.length) failures.push(`${lang}: English left on the page of all searches: ${[...new Set(hits)].slice(0, 8).join(", ")}`);
      list.unshift({ f: null, path: `/${lang}`, enPath: HUB, title: h.title, desc: h.desc, image: `${SITE}/og-home.jpg`, main: markEnglish(h.main, lang, ui.enTitle), ld: h.ld, lastmod: null });
    }
    outs.set(lang, list);
  }
  const total = [...outs.values()].reduce((a, l) => a + l.length, 0);
  if (total > MAX_TOTAL) failures.push(`${total} pages in the new languages, over the limit of ${MAX_TOTAL} (seo/langs/config.ts)`);

  // ---- every language version of an English page
  const versions = new Map<string, Record<string, string>>(); // English path -> { lang: path }
  for (const [lang, list] of outs) for (const o of list) (versions.get(o.enPath) || versions.set(o.enPath, {}).get(o.enPath)!)[lang] = o.path;
  const altsOf = (enPath: string): { alts: Alt[]; list: [string, string, string][] } => {
    const v = versions.get(enPath) || {};
    const en = read(enPath);
    const es = Object.fromEntries([...en.matchAll(ALT)].map((m) => [m[1], unesc(m[2])])).es;
    const esPath = es && es.startsWith(SITE) && fs.existsSync(file(root, es.slice(SITE.length))) ? es.slice(SITE.length) : "";
    const list: [string, string, string][] = [["en", LANG_NAME.en, enPath]];
    if (esPath) list.push(["es", LANG_NAME.es, esPath]);
    for (const l of NEW_LANGS) if (v[l]) list.push([l, LANG_NAME[l], v[l]]);
    return { alts: [...list.map(([l, , p]): Alt => ({ lang: l, href: SITE + p })), { lang: "x-default", href: SITE + enPath }], list };
  };

  // ---- write the pages
  for (const lang of NEW_LANGS) { const dir = path.join(root, lang); if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true }); }
  for (const [lang, list] of outs) {
    const ui = UI[lang]!;
    for (const o of list) {
      const { alts, list: vs } = altsOf(o.enPath);
      const f = file(root, o.path);
      fs.mkdirSync(path.dirname(f), { recursive: true });
      fs.writeFileSync(f, renderDoc({ lang, ui, path: o.path, title: o.title, desc: o.desc, image: o.image, alts, versions: vs, main: o.main, ld: o.ld }));
    }
    // an index of the language for AI assistants, next to its sitemap
    if (list.length) fs.writeFileSync(path.join(root, lang, "llms.txt"), `# RealHunt (${LANG_NAME[lang]})\n\n> ${ui.hub.desc}\n\n` + list.map((o) => `- [${o.title}](${SITE}${o.path}): ${o.desc}`).join("\n") + "\n");
  }

  // ---- the English and Spanish pages: hreflang for every version, and visible links to the other languages
  let enLinked = 0, esLinked = 0;
  const patch = (p: string, which: "en" | "es", alts: Alt[], vs: [string, string, string][]) => {
    const f = file(root, p); if (!fs.existsSync(f)) return false;
    let h = fs.readFileSync(f, "utf8");
    if (!indexable(h)) return false;
    h = h.replace(ALT, "").replace("</head>", () => alts.map((a) => `<link rel="alternate" hreflang="${esc(a.lang)}" href="${esc(a.href)}" />`).join("") + "</head>");
    // target="_self": the app's router handles plain links inside this block of HTML, and these addresses are not the app's
    const nav = `<nav class="ls-langs" aria-label="${esc(OTHER[which])}"><span>${esc(OTHER[which])}:</span> ${vs.filter(([l]) => l !== "en" && l !== "es").map(([l, name, vp]) => `<a href="${esc(vp)}" hreflang="${l}" lang="${l}" target="_self">${esc(name)}</a>`).join(" ")}</nav>`;
    h = h.replace(/<nav class="ls-langs"[\s\S]*?<\/nav>/g, "");
    const at = h.indexOf("data-ls"); const end = at >= 0 ? h.indexOf("</main>", at) : -1;
    if (end >= 0) h = h.slice(0, end) + nav + h.slice(end);
    fs.writeFileSync(f, h);
    return true;
  };
  for (const enPath of versions.keys()) {
    const { alts, list: vs } = altsOf(enPath);
    if (patch(enPath, "en", alts, vs)) enLinked++;
    const es = vs.find(([l]) => l === "es");
    if (es && patch(es[2], "es", alts, vs)) esLinked++;
  }

  // ---- sitemaps: one per language, and the alternates of the English and Spanish entries
  const xlinks = (alts: Alt[]) => alts.map((a) => `<xhtml:link rel="alternate" hreflang="${esc(a.lang)}" href="${esc(a.href)}"/>`).join("");
  const byUrl = new Map<string, string>();
  for (const enPath of versions.keys()) { const { alts } = altsOf(enPath); const x = xlinks(alts); for (const a of alts) if (a.lang !== "x-default") byUrl.set(a.href, x); }
  const parts: string[] = [];
  for (const [lang, list] of outs) {
    if (!list.length) continue;
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n`
      + list.map((o) => `  <url><loc>${esc(SITE + o.path)}</loc>${o.lastmod ? `<lastmod>${o.lastmod}</lastmod>` : ""}${byUrl.get(SITE + o.path) || ""}</url>\n`).join("") + "</urlset>\n";
    fs.writeFileSync(path.join(root, `sitemap-${lang}.xml`), xml);
    const last = list.map((o) => o.lastmod || "").sort().pop();
    parts.push(`  <sitemap><loc>${SITE}/sitemap-${lang}.xml</loc>${last ? `<lastmod>${last}</lastmod>` : ""}</sitemap>\n`);
  }
  const names = new Set(NEW_LANGS.map((l) => `sitemap-${l}.xml`));
  for (const f of fs.readdirSync(root)) {
    if (!/^sitemap-[a-z0-9-]+\.xml$/.test(f) || names.has(f)) continue;
    const xml = fs.readFileSync(path.join(root, f), "utf8"); let touched = false;
    let out = xml.replace(/<url><loc>([^<]+)<\/loc>([\s\S]*?)<\/url>/g, (m, loc: string, rest: string) => {
      const x = byUrl.get(unesc(loc)); if (!x) return m;
      touched = true;
      const lm = /<lastmod>[^<]*<\/lastmod>/.exec(rest)?.[0] || "";
      return `<url><loc>${loc}</loc>${lm}${x}${rest.replace(/<lastmod>[^<]*<\/lastmod>/, "").replace(/<xhtml:link\b[^>]*\/>/g, "")}</url>`;
    });
    if (touched && !/xmlns:xhtml=/.test(out)) out = out.replace("<urlset ", '<urlset xmlns:xhtml="http://www.w3.org/1999/xhtml" ');
    if (touched) fs.writeFileSync(path.join(root, f), out);
  }
  const index = path.join(root, "sitemap.xml");
  if (fs.existsSync(index) && parts.length) {
    const xml = fs.readFileSync(index, "utf8").replace(new RegExp(`\\s*<sitemap><loc>${SITE}/sitemap-(${NEW_LANGS.join("|")})\\.xml</loc>[\\s\\S]*?</sitemap>\\n?`, "g"), "\n");
    fs.writeFileSync(index, xml.replace("</sitemapindex>", parts.join("") + "</sitemapindex>"));
  }

  // ---- checks on what was written: reciprocal hreflang, links that stay inside dist, one title per page
  const titles = new Map<string, string>();
  for (const [lang, list] of outs) for (const o of list) {
    const k = `${lang}|${o.title}`; if (titles.has(k)) failures.push(`${lang}: same title on ${titles.get(k)} and ${o.path}`); titles.set(k, o.path);
    const h = fs.readFileSync(file(root, o.path), "utf8");
    for (const m of h.matchAll(ALT)) {
      if (m[1] === "x-default") continue;
      const back = read(unesc(m[2]).slice(SITE.length));
      if (!back.includes(`hreflang="${lang}" href="${SITE}${o.path}"`)) failures.push(`${o.path}: ${m[1]} version does not link back`);
    }
    for (const m of o.main.matchAll(/<a\b[^>]*?\shref="(\/[^"#?]*)/g)) { const p = m[1]; if (/^\/(alerts)?$/.test(p)) continue; if (!fs.existsSync(file(root, p))) failures.push(`${o.path}: link to ${p}, which is not a page`); }
  }

  const rep: LangReport = { total, max_total: MAX_TOTAL, langs: {}, hreflang: { english_pages_linked: enLinked, spanish_pages_linked: esLinked }, failures: [...new Set(failures)].slice(0, 200) };
  for (const L of langs) {
    const list = outs.get(L.lang) || [];
    const by = (k: (f: Facet) => string) => { const o: Record<string, number> = {}; for (const x of list) if (x.f) o[k(x.f)] = (o[k(x.f)] || 0) + 1; return o; };
    rep.langs[L.lang] = { pages: list.length, by_kind: by((f) => f.kind), by_country: by((f) => f.cc || "all countries"), homes: rows.length, homes_with_title: rows.filter((r) => titleIn(L.lang, r)).length,
      not_published: L.dropped.length, not_published_sample: L.dropped.slice(0, 60), sitemap: list.length ? `sitemap-${L.lang}.xml` : "" };
  }
  fs.writeFileSync(path.join(root, "lang-coverage.json"), JSON.stringify(rep, null, 1) + "\n");
  return rep;
}

/** Vite plugin, after polishPages() and before fileBudget(). A failed check stops the build (RH_SEO_SOFT=1 only reports). */
export function langPages() {
  let outDir = "dist";
  return {
    name: "rh-lang-pages",
    apply: "build" as const,
    configResolved(c: { build: { outDir: string } }) { outDir = c.build.outDir; },
    closeBundle() {
      const root = path.resolve(process.cwd(), outDir);
      if (!fs.existsSync(path.join(root, "index.html")) || !fs.existsSync(path.join(root, "sitemap.xml"))) return;
      const rep = writeLangs(root);
      console.log(`[rh-lang-pages] ${rep.total} pages: ` + Object.entries(rep.langs).map(([l, v]) => `${l} ${v.pages} (${v.homes_with_title}/${v.homes} homes with a title, ${v.not_published} pages left out)`).join(", ") + `. Report: dist/lang-coverage.json`);
      if (rep.failures.length) {
        const msg = `[rh-lang-pages] ${rep.failures.length} check(s) failed:\n` + rep.failures.slice(0, 30).map((f) => "  - " + f).join("\n");
        if (process.env.RH_SEO_SOFT === "1") console.warn(msg); else throw new Error(msg);
      }
    },
  };
}
