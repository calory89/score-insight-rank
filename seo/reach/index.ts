// Reach (15-nov-2026): what makes the site easy to read, quote and find outside Google's ten blue links.
// AI assistants and answer engines, feeds and aggregators, Google Discover/News/Images, Bing and the engines that use
// its index. Ideas 691-780 and 911-940 of the organic list. What the owner has to do by hand: docs/seo/owner-steps.md.
//
// Three entry points, in the order the build runs them:
//   writeReach()   from seo/prerender.ts (English run), before the Spanish twins: the five pages under /research
//                  (seo/reach/pages.ts), the data files (seo/reach/data.ts) and the feeds (seo/reach/feeds.ts).
//   finishReach()  from the end of seo/prerender.ts, when every page is on disk and before seo/polish.ts: links to
//                  the new pages from /research and /for-ai, the company address on /contact.
//   reachAfter()   a Vite plugin placed after seo/polish.ts, when it is known which pages are indexable: llms.txt in
//                  each language, machine-readable dates, the news and video sitemaps, robots.txt, releases.json.
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { localizeRows } from "../../src/community/seo2data";
import { LICENSE, ORG, SITE, type Lang, type PageFn } from "../assetsKit";
import { countryFacts, writeDataFiles, type Row } from "./data";
import { videoLd, withVideo, writeFeeds, writeSpecialSitemaps, type Post } from "./feeds";
import { REACH_PAGES, writeReachPages } from "./pages";
import { portalDirectory } from "./portals";

export type ReachCtx = { root: string; page: PageFn; rows: Row[]; dest: Record<string, any>; guides: Record<string, any>; today: string; image: string };
const readJson = (f: string, d: any = {}) => { const p = path.resolve(process.cwd(), f); try { return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : d; } catch { return d; } };
/** The company behind the site, as printed on its legal pages (src/lib/rh.ts COMPANY). */
export const COMPANY = { legalName: "Equinox Investment Group LLC", street: "30 N Gould St Ste N", city: "Sheridan", region: "WY", postalCode: "82801", country: "US", countryName: "United States" };

export function writeReach(c: ReachCtx): { pages: number; files: number } {
  const rows = c.rows.filter((r) => r?.slug && r.price_eur > 0);
  const has = (p: string) => fs.existsSync(path.join(c.root, p.replace(/^\/+/, ""), "index.html"));
  const destEs = localizeRows(c.dest, readJson("src/data/destinations-es.json")), guidesEs = localizeRows(c.guides, readJson("src/data/guides-es.json"));
  const facts: Record<Lang, ReturnType<typeof countryFacts>> = { en: countryFacts(rows, c.dest, c.guides, has), es: countryFacts(rows, destEs, guidesEs, has) };
  const files = writeDataFiles(c.root, facts, rows, c.today);
  const pages = writeReachPages({ root: c.root, page: c.page, rows, facts, portals: portalDirectory(), today: c.today, image: c.image, has });
  return { pages, files };
}

const edit = (root: string, rel: string, fn: (h: string) => string): boolean => { const f = path.join(root, rel); if (!fs.existsSync(f)) return false; const a = fs.readFileSync(f, "utf8"); const b = fn(a); if (b !== a) fs.writeFileSync(f, b); return b !== a; };

/** Runs when every page and every Spanish twin is on disk, before seo/polish.ts reads them. */
export function finishReach(root: string, rows: Row[], today: string) {
  const out = { linked: 0, feeds: 0, contact: 0, dated_posts: 0 };
  const has = (p: string) => fs.existsSync(path.join(root, p.replace(/^\/+/, ""), "index.html"));
  // feeds are written here because the Spanish ones only carry homes and posts whose Spanish page exists
  out.feeds = writeFeeds({ root, rows: rows.filter((r) => r?.slug && r.price_eur > 0), posts: readJson("src/data/blog.json", []), postsEs: readJson("src/data/blog-es.json", []), today, has }).length;

  // the data hub lists the new pages, so they are two clicks from the front page in both languages
  const names: Record<Lang, [string, string, string][]> = {
    en: [["property-portals", "Property portals by country", "a directory with a link to each one"], ["country-facts", "Key facts for buying a home, country by country", "dated sentences and a fact sheet per country"], ["open-data", "Open data", "the files, their licence and how to read them"], ["data-changelog", "What changed in the data", "homes added day by day"], ["find-homes", "Find homes by country and price", "a search with an address you can share"]],
    es: [["property-portals", "Portales inmobiliarios por país", "un directorio con el enlace de cada uno"], ["country-facts", "Datos clave para comprar casa, país por país", "frases con fecha y una hoja de datos por país"], ["open-data", "Datos abiertos", "los archivos, su licencia y cómo leerlos"], ["data-changelog", "Novedades en los datos", "las casas añadidas día a día"], ["find-homes", "Buscar casas por país y precio", "una búsqueda con una dirección que se puede compartir"]],
  };
  for (const [lang, base] of [["en", ""], ["es", "es/"]] as [Lang, string][]) {
    const pre = lang === "es" ? "/es" : "";
    const list = names[lang].filter(([s]) => has(`${base}research/${s}`));
    if (!list.length) continue;
    const block = `<section data-reach-more><h2>${lang === "es" ? "Directorios, archivos y registro de datos" : "Directories, files and the data log"}</h2><ul>${list.map(([s, n, d]) => `<li><a href="${pre}/research/${s}">${n}</a>: ${d}</li>`).join("")}</ul></section>`;
    if (edit(root, `${base}research/index.html`, (h) => (h.includes("data-reach-more") ? h : h.replace(/(<script src="\/rh-assets\.js" defer><\/script><\/main>)/, () => block + `<script src="/rh-assets.js" defer></script></main>`)))) out.linked++;
    const ai = `<p data-reach-ai>${lang === "es"
      ? `Además: un archivo por país con sus datos clave y todas sus casas (<a href="/data/countries/index.json">/data/countries/index.json</a>), la descripción de todos los archivos en <a href="/openapi.json">/openapi.json</a>, el <a href="${pre}/research/property-portals">directorio de portales por país</a>, las <a href="${pre}/research/country-facts">frases con fecha de cada país</a> y la guía de <a href="${pre}/research/open-data">datos abiertos</a>. El índice en español está en <a href="/es/llms.txt">/es/llms.txt</a>.`
      : `Also: one file per country with its key facts and every home (<a href="/data/countries/index.json">/data/countries/index.json</a>), a description of every file at <a href="/openapi.json">/openapi.json</a>, the <a href="/research/property-portals">directory of property portals by country</a>, <a href="/research/country-facts">dated sentences for each country</a> and the <a href="/research/open-data">open data guide</a>. The index in Spanish is at <a href="/es/llms.txt">/es/llms.txt</a>.`}</p>`;
    if (edit(root, `${base}for-ai/index.html`, (h) => (h.includes("data-reach-ai") ? h : h.replace(/<h2>(Crawlers|Rastreadores)<\/h2>/, (m) => ai + m)))) out.linked++;
  }
  // blog posts revised after they were published: both dates in the text, the way the Article data already has them (idea 749)
  for (const [file, base, word] of [["src/data/blog.json", "", "Updated"], ["src/data/blog-es.json", "es/", "Actualizado el"]] as const) {
    for (const p of readJson(file, []) as Post[]) {
      const up = String(p.updated || "").slice(0, 10), d = String(p.date || "").slice(0, 10);
      if (!/^[a-z0-9-]+$/.test(String(p.slug)) || !/^\d{4}-\d{2}-\d{2}$/.test(up) || up <= d) continue;
      if (edit(root, `${base}blog/${p.slug}/index.html`, (h) => (h.includes("data-reach-upd") ? h : h.replace(`<time datetime="${d}">${d}</time>`, () => `<time datetime="${d}">${d}</time> · <span data-reach-upd>${word} <time datetime="${up}">${up}</time></span>`)))) out.dated_posts++;
    }
  }
  // /contact: the legal name and postal address of the company, in the text and as structured data (idea 756)
  const addr = `${COMPANY.street}, ${COMPANY.city}, ${COMPANY.region} ${COMPANY.postalCode}, ${COMPANY.countryName}`;
  const ld = { "@context": "https://schema.org", "@type": "Organization", name: "RealHunt", legalName: COMPANY.legalName, url: SITE + "/", email: "hello@realhunt.co",
    address: { "@type": "PostalAddress", streetAddress: COMPANY.street, addressLocality: COMPANY.city, addressRegion: COMPANY.region, postalCode: COMPANY.postalCode, addressCountry: COMPANY.country },
    contactPoint: { "@type": "ContactPoint", contactType: "customer support", email: "hello@realhunt.co", availableLanguage: ["en", "es"] } };
  if (edit(root, "contact/index.html", (h) => (h.includes("data-reach-addr") ? h : h
    .replace(/(RealHunt is run by Equinox Investment Group LLC\.)/, () => `RealHunt is run by Equinox Investment Group LLC. <span data-reach-addr>Postal address: ${addr}.</span>`)
    .replace("</head>", () => `<script type="application/ld+json">${JSON.stringify(ld)}</script></head>`)))) out.contact++;
  return out;
}

// ------------------------------------------------------------------------------------------------ after seo/polish.ts
type Indexed = Map<string, string | null>; // url -> lastmod
/** Every URL of the sitemaps written by seo/polish.ts (the indexable, canonical pages) and its lastmod. */
export function readSitemaps(root: string): Indexed {
  const m: Indexed = new Map();
  for (const f of fs.existsSync(root) ? fs.readdirSync(root) : []) {
    if (!/^sitemap-[a-z0-9-]+\.xml$/.test(f) || f === "sitemap-news.xml" || f === "sitemap-video.xml") continue;
    for (const u of fs.readFileSync(path.join(root, f), "utf8").matchAll(/<url><loc>([^<]+)<\/loc>(?:<lastmod>([^<]+)<\/lastmod>)?/g)) m.set(u[1].replace(/&amp;/g, "&"), u[2] || null);
  }
  return m;
}
const fileOf = (root: string, url: string) => path.join(root, decodeURIComponent(url.replace(SITE, "")).replace(/^\/+/, ""), "index.html");

/** A WebPage node with the day the text last changed, its author and its licence, for pages that say none of it. */
export function addDates(html: string, url: string, lastmod: string, lang: string): string {
  if (/"dateModified"/.test(html) || !/^\d{4}-\d{2}-\d{2}/.test(lastmod)) return html;
  const node = { "@context": "https://schema.org", "@type": "WebPage", url, inLanguage: lang, dateModified: lastmod.slice(0, 10), isAccessibleForFree: true, author: ORG, publisher: ORG };
  return html.replace("</head>", () => `<script type="application/ld+json">${JSON.stringify(node)}</script></head>`);
}

const REACH_TITLES: Record<string, string> = { "property-portals": "Property portals by country: a directory with a link to each one", "country-facts": "Key facts by country, in dated sentences that can be quoted", "open-data": "Open data: the files, the licence and how to read them", "data-changelog": "What changed in the data, day by day", "find-homes": "Find homes by country and price: ?country=bulgaria&max=30000" };
const LLMS_ES: [string, string, string][] = [
  ["/es", "Las mejores casas", "todas las casas, de mejor a peor nota, con filtros"],
  ["/es/method", "Cómo funciona la nota", "las 11 notas parciales y qué significa la calificación"],
  ["/es/new", "Casas nuevas", "las últimas casas revisadas"],
  ["/es/research", "Datos para citar", "precios, gastos y normas por país, con CSV"],
  ["/es/research/prices", "Precios por país", "precio mediano y precio por m²"],
  ["/es/research/country-facts", "Datos clave por país", "frases con fecha que se pueden citar"],
  ["/es/research/property-portals", "Portales inmobiliarios por país", "directorio con el enlace de cada uno"],
  ["/es/research/open-data", "Datos abiertos", "archivos, licencia y cómo leerlos"],
  ["/es/costs", "Cuánto cuesta comprar fuera", "impuestos y gastos por país, con fuentes"],
  ["/es/guide", "Guías de compra por país", "los pasos, uno a uno"],
  ["/es/can-i-buy", "¿Puedo comprar allí?", "la norma según la nacionalidad"],
  ["/es/buying-costs", "Calculadora de gastos de compra", "por país y precio"],
  ["/es/tools", "Calculadoras gratuitas", "información general, no asesoramiento"],
  ["/es/countries", "Comparar dos países", "precios, gastos y normas frente a frente"],
  ["/es/blog", "Estudios y guías", "datos propios, en español"],
  ["/es/for-ai", "Para asistentes de IA", "qué se puede citar y cómo atribuirlo"],
  ["/es/editorial-policy", "Política editorial y correcciones", "cómo se revisa lo que se publica"],
  ["/es/press", "Página de prensa", "datos, cifras y contacto"],
];

/** llms.txt: the machine-readable files in the English index, and the index in Spanish at /es/llms.txt. */
export function writeLlms(root: string, idx: Indexed, rows: Row[], today: string): { en: boolean; es: number } {
  const has = (rel: string) => fs.existsSync(path.join(root, rel));
  const out = { en: false, es: 0 };
  const llms = path.join(root, "llms.txt");
  if (fs.existsSync(llms)) {
    const txt = fs.readFileSync(llms, "utf8");
    if (!txt.includes("## Files for machines")) {
      const block = `## Files for machines (no account, no key)\n\n`
        + (has("openapi.json") ? `- [OpenAPI description of every file](${SITE}/openapi.json)\n` : "")
        + (has("data/countries/index.json") ? `- [Countries: key figures and the address of each country file](${SITE}/data/countries/index.json)\n- Per country: ${SITE}/data/countries/<country>.json (key facts, rules, every home), .md (clean text), .pdf (one-page fact sheet)\n` : "")
        + REACH_PAGES.filter((s) => idx.has(`${SITE}/research/${s}`)).map((s) => `- [${REACH_TITLES[s] || s}](${SITE}/research/${s})`).join("\n") + "\n"
        + (has("research/property-portals.json") ? `- [Property portals by country](${SITE}/research/property-portals.json) ([CSV](${SITE}/research/property-portals.csv))\n` : "")
        + (has("data/realhunt-homes.geojson") ? `- [Every home with coordinates (GeoJSON)](${SITE}/data/realhunt-homes.geojson); [best homes by country (KML)](${SITE}/data/realhunt-best-homes.kml)\n` : "")
        + `- Feeds: ${SITE}/feed.xml (RSS), ${SITE}/feed.atom, ${SITE}/feed.json; research: ${SITE}/blog/rss.xml, ${SITE}/blog/atom.xml, ${SITE}/blog/feed.json\n`
        + `- Licence of text and figures: CC BY 4.0 (${LICENSE}); photos belong to the original listings\n\n`
        + (has("es/llms.txt") || idx.has(`${SITE}/es`) ? `## Other languages\n\n- [Índice en español](${SITE}/es/llms.txt)\n\n` : "");
      fs.writeFileSync(llms, txt.includes("## Countries") ? txt.replace("## Countries", () => block + "## Countries") : txt.replace(/\n*$/, "\n\n") + block);
      out.en = true;
    }
  }
  // Spanish index: only pages that exist and are indexable
  const pages = LLMS_ES.filter(([p]) => idx.has(SITE + p));
  if (pages.length >= 5) {
    const byCountry = new Map<string, number>();
    for (const r of rows) { const k = String(r.country || "").toLowerCase().trim().replace(/\s+/g, "-"); if (k) byCountry.set(k, (byCountry.get(k) || 0) + 1); }
    const countries = [...byCountry].filter(([k]) => idx.has(`${SITE}/es/homes/${k}`)).sort((a, b) => b[1] - a[1]);
    const nameOf = (k: string) => { const f = path.join(root, "es", "homes", k, "index.html"); const h1 = fs.existsSync(f) ? /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(fs.readFileSync(f, "utf8"))?.[1].replace(/<[^>]+>/g, "").trim() : ""; return h1 || k; };
    const txt = `# RealHunt\n\n> RealHunt publica casas baratas en venta en todo el mundo (la mayoría por menos de 100.000 €), revisadas una a una por una persona y calificadas de 70 a 98 frente a todas las demás casas de la web. No es una inmobiliaria: cada casa enlaza con su anuncio original.\n\n`
      + `Hoy: ${rows.length} casas en ${byCountry.size} países. Actualizado el ${today}. Índice en inglés, con todas las páginas: ${SITE}/llms.txt. Los textos y las cifras se pueden citar con un enlace a la página de origen (CC BY 4.0); las normas, los impuestos y los gastos son información general, no asesoramiento jurídico ni fiscal.\n\n`
      + `## Páginas principales\n\n${pages.map(([p, n, d]) => `- [${n}](${SITE}${p}): ${d}`).join("\n")}\n\n`
      + `## Archivos para máquinas\n\n- [Descripción OpenAPI de todos los archivos](${SITE}/openapi.json)\n- [Países: cifras clave y dirección de cada archivo](${SITE}/data/countries/index.json)\n- Por país, en español: ${SITE}/data/countries/<país>.es.md (texto limpio) y ${SITE}/data/countries/<país>.es.pdf (hoja de datos de una página)\n`
      + (has("es/feed.xml") ? `- Casas nuevas en español: ${SITE}/es/feed.xml (RSS)\n` : "") + (has("es/blog/rss.xml") ? `- Estudios en español: ${SITE}/es/blog/rss.xml (RSS)\n` : "")
      + (has("es/method.md") ? `- Método en Markdown: ${SITE}/es/method.md\n` : "")
      + (countries.length ? `\n## Países\n\n${countries.map(([k, n]) => `- [${nameOf(k)}](${SITE}/es/homes/${k}): ${n} casas`).join("\n")}\n` : "");
    fs.mkdirSync(path.join(root, "es"), { recursive: true });
    fs.writeFileSync(path.join(root, "es", "llms.txt"), txt);
    out.es = pages.length;
  }
  return out;
}

/** robots.txt: every sitemap that exists is declared (the main index is already there). */
export function finishRobots(root: string): number {
  const f = path.join(root, "robots.txt");
  if (!fs.existsSync(f)) return 0;
  let txt = fs.readFileSync(f, "utf8"), n = 0;
  for (const s of ["sitemap-news.xml", "sitemap-video.xml"]) if (fs.existsSync(path.join(root, s)) && !txt.includes(`${SITE}/${s}`)) { txt = txt.replace(/\n*$/, "\n") + `Sitemap: ${SITE}/${s}\n`; n++; }
  if (n) fs.writeFileSync(f, txt);
  return n;
}

export type Release = { date: string; built_at: string; commit: string; homes: number; indexable_pages: number };
/** releases.json: one line per published build, to mark publications on any chart (idea 919). Earlier builds are read
 * from the copy already published, the way seo/polish.ts keeps seo-state.json. */
export function mergeReleases(now: Release, ...earlier: unknown[]): Release[] {
  const all: Release[] = [];
  for (const list of earlier) if (Array.isArray(list)) for (const r of list) if (r && typeof r === "object" && /^\d{4}-\d{2}-\d{2}$/.test(String((r as Release).date)) && typeof (r as Release).commit === "string" && (r as Release).commit !== "local") all.push(r as Release);
  const by = new Map<string, Release>();
  for (const r of all) by.set(r.commit, r);
  by.set(now.commit, now);
  return [...by.values()].sort((a, b) => String(a.built_at).localeCompare(String(b.built_at))).slice(-400);
}

export function reachPost(root: string, opts: { live?: boolean } = {}) {
  const today = new Date().toISOString().slice(0, 10);
  const idx = readSitemaps(root);
  const snap = readJson("public/data/rh-static.json", { rows: [] });
  const rows: Row[] = (snap.rows || []).filter((r: Row) => r?.slug);
  const rep: Record<string, unknown> = { built: today, indexable: idx.size };

  // machine-readable date, author and publisher on every indexable page that has a real lastmod and no date yet
  let dated = 0;
  for (const [url, lastmod] of idx) {
    if (!lastmod) continue;
    const f = fileOf(root, url);
    if (!fs.existsSync(f)) continue;
    const h = fs.readFileSync(f, "utf8"), b = addDates(h, url, lastmod, /^https:\/\/realhunt\.co\/es(\/|$)/.test(url) ? "es" : "en");
    if (b !== h) { fs.writeFileSync(f, b); dated++; }
  }
  rep.pages_given_a_date = dated;

  // VideoObject on the pages of homes that have a video (none today)
  let videos = 0;
  for (const r of withVideo(rows)) {
    const f = fileOf(root, `${SITE}/deal/${r.slug}`);
    if (!idx.has(`${SITE}/deal/${r.slug}`) || !fs.existsSync(f)) continue;
    const h = fs.readFileSync(f, "utf8");
    if (h.includes('"VideoObject"')) continue;
    fs.writeFileSync(f, h.replace("</head>", () => `<script type="application/ld+json">${JSON.stringify(videoLd(r))}</script></head>`)); videos++;
  }
  rep.video_pages = videos;

  rep.llms = writeLlms(root, idx, rows, today);
  rep.sitemaps = writeSpecialSitemaps(root, { rows, posts: readJson("src/data/blog.json", []) as Post[], postsEs: readJson("src/data/blog-es.json", []) as Post[], today, indexable: (u) => idx.has(u) });
  rep.robots_lines_added = finishRobots(root);

  let build: any = {}; try { build = JSON.parse(fs.readFileSync(path.join(root, "build.json"), "utf8")); } catch { /* no build.json */ }
  let live: unknown = [];
  if (opts.live !== false && process.env.RH_SEO_STATE !== "off") try { live = JSON.parse(spawnSync("curl", ["-fsS", "--max-time", "8", `${SITE}/releases.json`], { encoding: "utf8", timeout: 10000 }).stdout || "[]"); } catch { live = []; }
  const releases = mergeReleases({ date: today, built_at: build.built_at || new Date().toISOString(), commit: String(build.commit || "local"), homes: rows.length, indexable_pages: idx.size }, live);
  fs.writeFileSync(path.join(root, "releases.json"), JSON.stringify(releases) + "\n");
  rep.releases = releases.length;

  rep.files = ["openapi.json", "data/countries/index.json", "feed.atom", "feed.json", "blog/atom.xml", "blog/feed.json", "es/feed.xml", "es/blog/rss.xml", "es/llms.txt", "sitemap-news.xml", "data/realhunt-best-homes.kml", "data/realhunt-homes.geojson", "research/property-portals.csv"].filter((f) => fs.existsSync(path.join(root, f)));
  fs.writeFileSync(path.join(root, "reach.json"), JSON.stringify(rep, null, 1) + "\n");
  return rep;
}

/** Vite plugin, after seo/polish.ts. */
export function reachAfter() {
  let outDir = "dist";
  return {
    name: "rh-reach",
    apply: "build" as const,
    configResolved(c: { build: { outDir: string } }) { outDir = c.build.outDir; },
    closeBundle() {
      const root = path.resolve(process.cwd(), outDir);
      if (!fs.existsSync(path.join(root, "sitemap.xml"))) return;
      try { console.log("[rh-reach]", JSON.stringify(reachPost(root))); } catch (e) { console.warn("[rh-reach] skipped:", (e as Error).message); }
    },
  };
}
