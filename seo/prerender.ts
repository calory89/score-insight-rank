// Share previews and SEO for a single-page app.
//
// WhatsApp, X, Facebook, LinkedIn, search engines and AI crawlers do not run JavaScript, so every public page
// gets its own copy of index.html with its title, description, canonical, share card, structured data and a
// plain-HTML version of the content already in it. React replaces that content when it loads.
//
// The same list of pages builds the sitemap (dist/sitemap.xml and its parts), so a URL is in the sitemap only
// if it was prerendered and is worth indexing. Thin pages (a price band with fewer than MIN_LIST homes) still
// get a file, so the link works and shares well, but carry noindex and stay out of the sitemap.
//
// Spanish (10-nov-2026): every page that is fully Spanish also exists as /es/<same path>, with hreflang in both
// versions and its own sitemap part. How those pages are made, measured and decided: seo/es.ts.
//
// Data: src/data/deal-meta.json and public/data/rh-static.json (refreshed daily by rh-og-cards.yml and
// scripts/build_static.py), plus the blog, search, top and destination JSON files in src/data.
import path from "path";
import fs from "fs";
import { weatherShell } from "../src/pages/wx/shell";
import { DIMS, AMEN } from "../src/community/dims";
import { regionOf, slugify, HOME_TYPES } from "../src/community/regions";
import { homeArticle } from "../src/community/homeArticle";
import { toMedia } from "../src/lib/media";
import { writeLlmsFull } from "./llmsFull";
import { thumb, learnThumbs } from "../src/lib/thumbs";
import { dealShell, DEAL_SHELL_HEAD } from "./dealShell";
import { dealStatusHtml, dealAvailability } from "./dealStatus";
import { glossaryLine, scoreLine, sourceNotes } from "./dealNotes";
import { type CanBuyData, statusLabel, UPDATED, UPDATED_ES, canBuyPairs, canBuyCountries, canBuySlug, ruleFor, residencyFor, canBuyFaq, canBuyMeta, fill, costLines, costCountries, nameOf, fmtMoney } from "../src/community/seo2data";
import { homeArticleEs } from "../src/community/homeArticleEs";
import { homeLead, homeTitle as shortTitle, homeKind } from "../src/community/homeLead";
import { isGone } from "../src/community/n9/status";
import { localizeRows, theEs } from "../src/community/seo2data";
import { esPlace } from "../src/lib/lang";
import { type EsPass, type PageRec, type Twin, createEsPass, writeEsTwins, coverageSummary, placesEs } from "./es";
import { writeAssets, finishAssets } from "./assets";
import { writeTools } from "./tools";
import { listingPlan, listingRows, listingPages, finishListings } from "./listings/build";
import { loadFx, usdApprox } from "./listings/fx";
import { writeKnowledge, finishKnowledge } from "./knowledge/build";
import { writeReach, finishReach } from "./reach";

const SITE = "https://realhunt.co";
// Country names for the Spanish copies (/es/...). A country not listed keeps its English name.
const ES_COUNTRY: Record<string, string> = { Bulgaria: "Bulgaria", Canada: "Canadá", Cyprus: "Chipre", Denmark: "Dinamarca", "Dominican Republic": "República Dominicana", France: "Francia", Germany: "Alemania", Greece: "Grecia", Italy: "Italia", Japan: "Japón", Mexico: "México", Netherlands: "Países Bajos", Norway: "Noruega", Poland: "Polonia", Portugal: "Portugal", Spain: "España", Sweden: "Suecia", Switzerland: "Suiza", "United Kingdom": "Reino Unido", "United States": "Estados Unidos", Albania: "Albania", Croatia: "Croacia", Turkey: "Turquía", Romania: "Rumanía", Hungary: "Hungría", Ireland: "Irlanda", Finland: "Finlandia", Austria: "Austria", Belgium: "Bélgica", Montenegro: "Montenegro", Georgia: "Georgia", Thailand: "Tailandia", Indonesia: "Indonesia" };
const esC = (n: string) => ES_COUNTRY[n] || n;
const DEF = `${SITE}/og-home.jpg`;
const MIN_LIST = 3;
const PRICE_BANDS = [20000, 40000, 60000, 80000, 100000, 150000];

type Opts = { noindex?: boolean; lastmod?: string | null; group?: "pages" | "homes" | "places" | "content" | "top" | "es"; head?: string; images?: string[]; lang?: "es"; alt?: { en: string; es: string } };
type Entry = { url: string; lastmod: string | null; group: string; images?: string[] };

const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const cap = (s: string) => s.replace(/-/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
const eur = (n: number) => "€" + Math.round(n).toLocaleString("en");
const day = (s?: string | null) => (s && /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null);
const maxDay = (xs: (string | null | undefined)[]) => xs.map(day).filter(Boolean).sort().pop() || null;
// "in the Netherlands", "in the United States"
const theEn = (n: string) => (/^(United |Netherlands$|Dominican Republic$|Czech Republic$|Philippines$)/.test(n) ? "the " + n : n);
const slugCountry = (c: string) => String(c || "").toLowerCase().trim().replace(/\s+/g, "-");
const crumbs = (items: [string, string][]) => ({
  "@context": "https://schema.org", "@type": "BreadcrumbList",
  itemListElement: items.map(([name, item], i) => ({ "@type": "ListItem", position: i + 1, name, item })),
});
const navHtml = (items: [string, string][]) =>
  `<nav aria-label="Breadcrumb">${items.map(([n, u], i) => (i === items.length - 1 ? esc(n) : `<a href="${esc(u.replace(SITE, "") || "/")}">${esc(n)}</a>`)).join(" › ")}</nav>`;

/** index.html with one page's title, description, canonical, share card, structured data and static content. */
export function renderHtml(html: string, { url, title, desc, image, body, ld, o }: PageRec): string {
  let h = html;
  if (body) h = h.replace('<div id="root"></div>', () => `<div id="root">${body}</div>`);
  if (o.head) h = h.replace("</head>", () => o.head + "</head>");
  // 10-nov-2026: Spanish copies live under /es/. Both versions carry the three alternate links.
  if (o.alt) h = h.replace("</head>", () => `<link rel="alternate" hreflang="en" href="${esc(o.alt!.en)}" /><link rel="alternate" hreflang="es" href="${esc(o.alt!.es)}" /><link rel="alternate" hreflang="x-default" href="${esc(o.alt!.en)}" /></head>`);
  if (o.lang === "es") h = h.replace('<html lang="en">', '<html lang="es">').replace('<meta property="og:locale" content="en_US" />', '<meta property="og:locale" content="es_ES" />');
  if (ld?.length) h = h.replace("</head>", () => ld.map((x) => `<script type="application/ld+json">${JSON.stringify(x).replace(/</g, "\\u003c")}</script>`).join("") + "</head>");
  const rep = (re: RegExp, val: string) => { h = h.replace(re, () => val); };
  rep(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`);
  rep(/<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${esc(desc)}" />`);
  rep(/<link rel="canonical" href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${esc(url)}" />`);
  rep(/<meta property="og:title" content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${esc(title)}" />`);
  rep(/<meta property="og:description" content="[^"]*"\s*\/?>/, `<meta property="og:description" content="${esc(desc)}" />`);
  rep(/<meta property="og:image" content="[^"]*"\s*\/?>/, `<meta property="og:image" content="${esc(image)}" />`);
  rep(/<meta property="og:url" content="[^"]*"\s*\/?>/, `<meta property="og:url" content="${esc(url)}" />`);
  rep(/<meta name="twitter:title" content="[^"]*"\s*\/?>/, `<meta name="twitter:title" content="${esc(title)}" />`);
  rep(/<meta name="twitter:description" content="[^"]*"\s*\/?>/, `<meta name="twitter:description" content="${esc(desc)}" />`);
  rep(/<meta name="twitter:image" content="[^"]*"\s*\/?>/, `<meta name="twitter:image" content="${esc(image)}" />`);
  if (o.noindex) rep(/<meta name="robots" content="[^"]*"\s*\/?>/, `<meta name="robots" content="noindex, follow" />`);
  return h;
}

export function prerenderPages() {
  let outDir = "dist";
  return {
    name: "rh-prerender-pages",
    apply: "build" as const,
    configResolved(c: { build: { outDir: string } }) { outDir = c.build.outDir; },
    closeBundle() {
      try { build(path.resolve(process.cwd(), outDir)); }
      catch (e) { console.warn("[rh-prerender-pages] skipped:", (e as Error).message); }
    },
  };
}

// Runs twice: in English (writes the pages, feeds and sitemap) and, called from the end of that run, in Spanish
// (`es` set): the same templates with the Spanish data, recorded and turned into /es/ pages by seo/es.ts.
function build(root: string, es?: EsPass) {
  const the = es ? es.the : theEn;
  const lg = es ? "es" as const : "en" as const;
  const out: typeof fs.writeFileSync = es ? () => {} : fs.writeFileSync; // feeds, llms.txt and build.json: English run only
  const indexFile = path.join(root, "index.html");
  if (!fs.existsSync(indexFile)) return;
  const html = fs.readFileSync(indexFile, "utf8");
  const entries: Entry[] = [{ url: `${SITE}/`, lastmod: null, group: "pages" }];
  const altOf = new Map<string, string>(); // English URL -> Spanish URL, for every page that has a Spanish copy
  const readJson = (f: string, d: any) => { const p = path.resolve(process.cwd(), f); const v = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : d; return es ? es.data(f, v) : v; };
  const abs = (u: string) => (String(u || "").startsWith("http") ? u : SITE + u);

  const page = (url: string, title: string, desc: string, image: string, body?: string, ld?: object[], o: Opts = {}) => {
    if (es) { if (o.lang !== "es") es.add(url, title, desc, image, body, ld, o); return; } // Spanish run: recorded, decided at the end (seo/es.ts)
    if (o.alt && o.lang !== "es") altOf.set(o.alt.en, o.alt.es); // an English page whose Spanish copy is written by hand below
    const h = renderHtml(html, { url, title, desc, image, body, ld, o });
    const rel = url.replace(/^https:\/\/realhunt\.co\/?/, "");
    const dir = path.join(root, rel);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "index.html"), h);
    if (!o.noindex) {
      const had = entries.find((e) => e.url === url);
      if (had) { if (o.lastmod) had.lastmod = o.lastmod; if (o.images?.length) had.images = o.images; }
      else entries.push({ url, lastmod: o.lastmod ?? null, group: o.group || "pages", images: o.images });
    }
  };

  // ---------- Homes ----------
  const deals: any[] = readJson("src/data/deal-meta.json", []);
  const snap: any = readJson("public/data/rh-static.json", { rows: [] });
  // the HTML only names photo copies the snapshot says exist (src/lib/thumbs.ts); the listing and study pages built
  // later in this process use the same list
  learnThumbs(snap);
  const rows: any[] = (snap.rows || []).filter((r: any) => r?.slug);
  const bySlug = new Map<string, any>(rows.map((r) => [r.slug, r]));
  const metaBySlug = new Map<string, any>(deals.map((d) => [d.slug, d]));
  const homeDay = (r: any) => maxDay([r?.verified_at, r?.approved_at, r?.publish_at]);
  const homeTitle = (r: any) => metaBySlug.get(r.slug)?.title || `${eur(r.price_eur)} · ${r.title}`;
  const homeImg = (r: any) => metaBySlug.get(r.slug)?.image || (r.image_urls?.[0] ? abs(r.image_urls[0]) : DEF);
  // Countries that are a real country. A few imports were tagged with a region ("Scandinavia"); they keep their
  // home pages but get no country page of their own.
  const REGIONS = new Set(["scandinavia"]);
  const ranked = rows.slice().sort((a, b) => (b.nota ?? 0) - (a.nota ?? 0) || (a.rank ?? 1e9) - (b.rank ?? 1e9));
  const homeLi = (r: any) =>
    `<li><a href="/deal/${esc(r.slug)}"><strong>${esc(eur(r.price_eur))}</strong> · ${esc(r.title)}</a> · ${esc(r.location_name || r.country)}${r.nota != null ? ` · score ${esc(r.nota)}` : ""}${r.sqm ? ` · ${esc(r.sqm)} m²` : ""}${r.bedrooms ? ` · ${esc(r.bedrooms)} bed` : ""}</li>`;

  // Regions with enough homes for their own page: key "spain/granada".
  const regionHomes = new Map<string, { country: string; cc: string; name: string; slug: string; homes: any[] }>();
  for (const r of ranked) {
    const rg = regionOf(r); const cc = slugCountry(r.country);
    if (!rg || !cc || REGIONS.has(cc)) continue;
    const key = `${cc}/${slugify(rg)}`;
    if (!regionHomes.has(key)) regionHomes.set(key, { country: r.country, cc, name: rg, slug: slugify(rg), homes: [] });
    regionHomes.get(key)!.homes.push(r);
  }
  // 14-nov-2026: which listing pages exist is decided in one place (seo/listings), so links only go to pages that do.
  const plan = listingPlan(listingRows());
  const regionPage = (r: any) => { const k = `${slugCountry(r?.country || "")}/${slugify(regionOf(r || {}))}`; const g = regionHomes.get(k); return g && plan.live.has(`/homes/${k}`) ? g : null; };

  // For the article on each home page (src/community/homeArticle.ts).
  const byCountry = new Map<string, any[]>();
  for (const r of ranked) { const k = slugCountry(r.country); if (k) (byCountry.get(k) || byCountry.set(k, []).get(k)!).push(r); }
  const destForArticle: Record<string, any> = readJson("src/data/destinations.json", {});
  const guidesForArticle: Record<string, any> = readJson("src/data/guides.json", {});
  const cardColors: Record<string, string> = readJson("src/data/card-colors.json", {});
  const fxDeal = loadFx();
  const lowRes = (r: any) => { const u = toMedia(String(r?.image_urls?.[0] || "")); const t = u ? thumb(u) : ""; return t && t !== u ? t : ""; };
  // 20-nov-2026 (ideas 13, 14, 25): the Spanish home page carries the Spanish article, with the Spanish buying rules.
  const destEsForArticle: Record<string, any> = es ? destForArticle : localizeRows(destForArticle, (() => { try { return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "src/data/destinations-es.json"), "utf8")); } catch { return {}; } })());
  // 20-nov-2026 (ideas 15, 23, 25): short titles, what and where first, then the price. A home whose advert is gone says
  // so first. Two homes that would get the same short title keep their descriptive title instead.
  const pageTitle = (r: any, lang: "en" | "es") => (isGone(r) ? (lang === "es" ? "Vendida o retirada: " : "Sold or withdrawn: ") : "") + shortTitle(r, lang, isGone(r) ? 40 : 60);
  const titleCount = new Map<string, number>();
  for (const d of deals) { const r = bySlug.get(d.slug); if (!r) continue; for (const lg2 of ["en", "es"] as const) { const t = lg2 + ":" + pageTitle(r, lg2); titleCount.set(t, (titleCount.get(t) || 0) + 1); } }
  const titleOf = (r: any, lang: "en" | "es", fallback: string) => { const t = pageTitle(r, lang); return (titleCount.get(lang + ":" + t) || 0) > 1 ? (isGone(r) ? (lang === "es" ? "Vendida o retirada: " : "Sold or withdrawn: ") : "") + fallback : t; };
  // ideas 17 and 18: homes of the same country at the nearest asking price
  const nearPrice = (r: any, list: any[], n: number, skip: Set<string>) => list.filter((x) => x.slug !== r.slug && !skip.has(x.slug) && x.price_eur > 0)
    .sort((a, b) => Math.abs(Math.log(a.price_eur / r.price_eur)) - Math.abs(Math.log(b.price_eur / r.price_eur)) || String(a.slug).localeCompare(String(b.slug))).slice(0, n);
  const mdHead = (u: string, lang: "en" | "es" = "en") => `<link rel="alternate" type="text/markdown" title="${lang === "es" ? "Texto limpio" : "Clean text"}" href="${esc(u)}.md" />`;
  for (const d of deals) {
    if (!d?.slug || !/^[A-Za-z0-9_-]+$/.test(d.slug)) continue;
    const r = bySlug.get(d.slug);
    const url = `${SITE}/deal/${d.slug}`;
    const cc = slugCountry(d.country || r?.country || "");
    const cName = d.country || r?.country || "";
    const trail: [string, string][] = [["RealHunt", SITE + "/"]];
    if (cc && !REGIONS.has(cc)) trail.push([`Homes in ${cName}`, `${SITE}/homes/${cc}`]);
    const rp = r ? regionPage(r) : null;
    if (rp) trail.push([rp.name, `${SITE}/homes/${rp.cc}/${rp.slug}`]);
    trail.push([d.title, url]);
    let body: string | undefined;
    const ld: object[] = [crumbs(trail)];
    if (r) {
      const dims = DIMS.filter(([k]) => r.dims?.[k] != null);
      const amen = AMEN.filter(([k]) => (r.amen || []).includes(k)).map(([, l]) => l);
      const near = r.nearby || {};
      const nearList = [["sea", "Sea"], ["lake", "Lake"], ["shop", "Shop"], ["train", "Train"], ["airport", "Airport"], ["hospital", "Hospital"]]
        .filter(([k]) => near[k]?.km != null).map(([k, l]) => `<li>${esc(l)}: ${esc(near[k].name || "")} · ${esc(near[k].km)} km</li>`).join("");
      const art = (es ? homeArticleEs : homeArticle)(r, { countryHomes: byCountry.get(cc) || [r], regionHomes: rp?.homes, regionName: rp?.name, dest: destForArticle[cc] || null, hasGuide: !!guidesForArticle[cc], areaInLead: true });
      const sameRegion = rp ? rp.homes.filter((x) => x.slug !== r.slug).slice(0, 6) : [];
      const similar = (sameRegion.length >= 3 ? sameRegion : ranked.filter((x) => x.slug !== r.slug && x.country === r.country).slice(0, 6));
      const band = plan.bandFor(cc, r.price_eur);
      const lead = homeLead(r, { countryHomes: byCountry.get(cc) || [r], regionHomes: rp?.homes, regionName: rp?.name }, es ? "es" : "en");
      const samePrice = nearPrice(r, byCountry.get(cc) || [], 6, new Set(similar.map((x) => x.slug)));
      // 10-nov-2026 speed: the top of the home page (header, main photo, title, price) is drawn by the HTML where the
      // app will draw it, and the row is embedded so the app shows the home without waiting for the snapshot.
      const rg = regionOf(r);
      const shell = dealShell({
        row: r, lowRes: lowRes(r), photos: (r.image_urls || []).filter(Boolean).map((u: string) => toMedia(String(u))), color: cardColors[r.slug],
        caption: `${r.location_name || cName}, ${eur(r.price_eur)}`,
        crumbs: [[r.country || "", cc ? `/homes/${cc}` : ""], ...(rg ? [[rg, rp ? `/homes/${rp.cc}/${rp.slug}` : ""] as [string, string]] : [])].filter(([l]) => l) as [string, string][],
      });
      body = shell + `<main class="rh-static"><article>${navHtml(trail)}`
        + lead.map((t, i) => `<p class="rh-lead"${i ? "" : ' id="answer"'}>${esc(t)}</p>`).join("")
        + dealStatusHtml(r, "en")
        + (r.nota != null ? `<h2>RealHunt score: ${esc(r.nota)} / 98</h2><p data-rh-scoreline><strong>${esc(scoreLine(r))}</strong></p><p>Every home on RealHunt passed a hand check first, so the grade starts at 70. The rest compares this home with every other home on the site. <a href="/method">How the score works</a>.</p><ul>${dims.map(([k, l, help]) => `<li>${esc(l)}: <strong>${esc(r.dims[k])}</strong>/100 · ${esc(help)}</li>`).join("")}</ul>` : "")
        + (r.why_great ? `<h2>Why it made the list</h2><p>${esc(r.why_great)}</p>` : "")
        + art.sections.map((x) => `<h2>${esc(x.h)}</h2>${x.p.map((t) => `<p>${esc(t)}</p>`).join("")}`).join("")
        + (guidesForArticle[cc] ? `<p><a href="/guide/${esc(cc)}">How to buy a home in ${esc(the(cName))}, step by step</a>${destForArticle[cc] ? ` · <a href="/costs/${esc(cc)}">Costs and taxes in ${esc(the(cName))}</a>` : ""}</p>` : "")
        + glossaryLine(cc)
        + (amen.length ? `<h2>Features</h2><p>${esc(amen.join(", "))}</p>` : "")
        + (nearList ? `<h2>What is nearby</h2><ul>${nearList}</ul>` : "")
        + (art.faq.length ? `<h2>Questions about this home</h2>${art.faq.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join("")}` : "")
        + (r.source_domain ? `<p>Listed on ${esc(r.source_domain)}. RealHunt is not an estate agent and does not sell this home; sign in to open the original listing and contact the seller.</p>` : "")
        + (similar.length ? `<h2>More homes in ${esc(sameRegion.length >= 3 && rp ? rp.name : cName)}</h2><ul>${similar.map(homeLi).join("")}</ul>` : "")
        + (samePrice.length ? `<h2>Homes in ${esc(the(cName))} at a similar price</h2><ul>${samePrice.map(homeLi).join("")}</ul>` : "")
        + (cc && !REGIONS.has(cc) ? `<p><a href="/homes/${esc(cc)}">All homes in ${esc(cName)}</a>${rp ? ` · <a href="/homes/${esc(rp.cc)}/${esc(rp.slug)}">All homes in ${esc(rp.name)}</a>` : ""}${band ? ` · <a href="${esc(band.path)}">Homes under ${esc(eur(band.cap))} in ${esc(cName)}</a>` : ""} · <a href="/costs">What it costs to buy abroad</a></p>` : "")
        + `</article></main>`;
      const images = (r.image_urls || []).slice(0, 6).map((u: string) => abs(u));
      if (art.faq.length) ld.push({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: art.faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) });
      ld.push({
        "@context": "https://schema.org", "@type": "RealEstateListing", url, name: r.title, description: r.why_great || d.desc,
        image: images, datePosted: day(r.publish_at || r.approved_at) || undefined,
        offers: { "@type": "Offer", price: r.price_eur, priceCurrency: "EUR", ...(dealAvailability(r) ? { availability: dealAvailability(r) } : {}), url },
        about: {
          "@type": homeKind(r).ld, name: r.title, accommodationCategory: homeKind(r).en,
          address: { "@type": "PostalAddress", addressLocality: r.location_name || undefined, addressRegion: rg || undefined, addressCountry: cName || undefined },
          ...(r.lat != null && r.lng != null ? { geo: { "@type": "GeoCoordinates", latitude: r.lat, longitude: r.lng } } : {}),
          ...(r.sqm ? { floorSize: { "@type": "QuantitativeValue", value: r.sqm, unitCode: "MTK" } } : {}),
          ...(r.bedrooms ? { numberOfBedrooms: r.bedrooms } : {}),
          ...(Number(r.bathrooms) > 0 ? { numberOfBathroomsTotal: Number(r.bathrooms) } : {}), // idea 85: only when the advert gives it
          ...(amen.length ? { amenityFeature: amen.map((a) => ({ "@type": "LocationFeatureSpecification", name: a, value: true })) } : {}),
        },
      });
    }
    // 9-nov-2026 speed: the main photo starts downloading with the HTML, not after the app and the data (LCP).
    // 10-nov-2026: its small card copy when there is one (painted first, the full photo sharpens over it), else the photo.
    const hero = r?.image_urls?.[0] ? lowRes(r) || toMedia(String(r.image_urls[0])) : "";
    const enTitle = r ? titleOf(r, es ? "es" : "en", d.title) : d.title;
    const enDesc = r && isGone(r) ? (es ? "El anuncio original ya no está publicado. " : "The original advert is no longer online. ") + d.desc : d.desc;
    page(url, `${enTitle} · RealHunt`, enDesc, d.image || DEF, body, ld, { lastmod: homeDay(r), group: "homes", head: (hero ? `<link rel="preload" as="image" href="${esc(hero)}" fetchpriority="high" />` : "") + (r ? DEAL_SHELL_HEAD + mdHead(url) : "") || undefined,
      // 10-nov-2026: the home's photos in the sitemap (Google Images), up to 5 per home
      images: (r?.image_urls || []).slice(0, 5).map((u: string) => abs(String(u))),
      alt: r?.title_es ? { en: url, es: `${SITE}/es/deal/${d.slug}` } : undefined });
    // The same home in Spanish (title and texts already translated in the data; the article has its own Spanish writer).
    if (r?.title_es) {
      const esUrl = `${SITE}/es/deal/${d.slug}`;
      // the price in dollars next to the euros, for buyers in the Americas (idea 68): ECB rate of the day, rounded to 100
      const usdEs = (eurAmount: number) => { const t = usdApprox(eurAmount, fxDeal); return t ? ` <small class="rh-usd">(unos ${esc(t.usd.toLocaleString("es-ES"))} dólares al cambio del BCE del ${esc(t.day)})</small>` : ""; };
      const euro = (n: number) => Math.round(n).toLocaleString("es-ES") + " €";
      const simEs = (rp && rp.homes.length > 3 ? rp.homes : byCountry.get(cc) || []).filter((x) => x.slug !== r.slug && x.title_es).slice(0, 6);
      const priceEs = nearPrice(r, (byCountry.get(cc) || []).filter((x) => x.title_es), 6, new Set(simEs.map((x) => x.slug)));
      const placeEsOf = (x: any) => placesEs(String(x.location_name || x.country || "").split(", ").map((y) => esPlace(y.trim())).join(", "));
      // texts outside the page body (title, description, structured data) do not go through the body's place
      // dictionary in seo/es.ts, so the same dictionary is applied here: "near X", "(about 25 min from X)", regions
      const deepEs = (o: any): any => (typeof o === "string" ? (/^https?:\/\//.test(o) ? o : placesEs(o)) : Array.isArray(o) ? o.map(deepEs) : o && typeof o === "object" ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, k.startsWith("@") ? v : deepEs(v)])) : o);
      // ideas 16 and 25: the Spanish description is written for this page (what, price, where), and seo/polish.ts adds
      // the score and the size, as on the English page. Before, it was the first 155 characters of the long text.
      const whereEs = ((p: string) => (p.includes(esC(cName)) ? p : `${p}, ${esC(cName)}`))(placeEsOf(r));
      const descEs = (isGone(r) ? "El anuncio original ya no está publicado. " : "") + `${r.title_es} por ${euro(r.price_eur)}. ${whereEs[0].toUpperCase() + whereEs.slice(1)}.`;
      const ctxA = { countryHomes: byCountry.get(cc) || [r], regionHomes: rp?.homes, regionName: rp?.name };
      const leadEs = homeLead(r, ctxA, "es");
      const artEs = homeArticleEs(r, { ...ctxA, dest: destEsForArticle[cc] || null, hasGuide: !!guidesForArticle[cc], areaInLead: true });
      const liEs = (x: any) => `<li><a href="/es/deal/${esc(x.slug)}"><strong>${esc(euro(x.price_eur))}</strong> · ${esc(x.title_es)}</a> · ${esc(placeEsOf(x))}${x.nota != null ? ` · nota ${esc(x.nota)}` : ""}${x.sqm ? ` · ${esc(x.sqm)} m²` : ""}</li>`;
      // same first paint as the English page (seo/dealShell.ts), with the Spanish title in the HTML
      const bodyEs = dealShell({ row: r, lang: "es", lowRes: lowRes(r), photos: (r.image_urls || []).filter(Boolean).map((u: string) => toMedia(String(u))), color: cardColors[r.slug], crumbs: [], caption: `${placeEsOf(r)}, ${euro(r.price_eur)}` })
        + `<main class="rh-static" lang="es"><article><nav aria-label="Ruta"><a href="/es">RealHunt</a> › ${esc(r.title_es)}</nav>`
        + leadEs.map((t, i) => `<p class="rh-lead"${i ? "" : ' id="answer"'}>${esc(t)}</p>`).join("")
        + (usdEs(r.price_eur) ? `<p class="rh-usd-line"><strong>${esc(euro(r.price_eur))}</strong>${usdEs(r.price_eur)}</p>` : "")
        + dealStatusHtml(r, "es")
        + (r.nota != null ? `<h2>Nota RealHunt: ${esc(r.nota)} / 98</h2><p data-rh-scoreline><strong>${esc(scoreLine(r, "es"))}</strong></p><p>Todas las casas de RealHunt pasan antes una revisión hecha por una persona, por eso la nota empieza en 70. El resto compara esta casa con todas las demás de la web.</p>` : "")
        + (r.why_great_es ? `<h2>Por qué está en la lista</h2><p>${esc(r.why_great_es)}</p>` : "")
        + (r.why_cheap_es ? `<h2>Por qué es tan barata</h2><p>${esc(r.why_cheap_es)}</p>` : "")
        + artEs.sections.map((x) => `<h2>${esc(x.h)}</h2>${x.p.map((t) => `<p>${esc(t)}</p>`).join("")}`).join("")
        + (artEs.faq.length ? `<h2>Preguntas sobre esta casa</h2>${artEs.faq.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join("")}` : "")
        + (r.source_domain ? `<p>Anunciada en ${esc(r.source_domain)}. RealHunt no es una inmobiliaria y no vende esta casa: el anuncio original te pone en contacto con el vendedor.</p>` : "")
        + glossaryLine(cc, "es")
        + (simEs.length ? `<h2>Más casas parecidas</h2><ul>${simEs.map(liEs).join("")}</ul>` : "")
        + (priceEs.length ? `<h2>Casas en ${esc(theEs(esC(cName)))} por un precio parecido</h2><ul>${priceEs.map(liEs).join("")}</ul>` : "")
        + `<p><a href="/es">Las mejores casas</a> · <a href="/deal/${esc(d.slug)}">English</a></p></article></main>`;
      const kind = homeKind(r);
      const ldEs: object[] = [{ "@context": "https://schema.org", "@type": "RealEstateListing", url: esUrl, name: r.title_es, description: r.why_great_es || descEs, inLanguage: "es", image: (r.image_urls || []).slice(0, 5).map((u: string) => abs(String(u))),
        datePosted: day(r.publish_at || r.approved_at) || undefined,
        offers: { "@type": "Offer", price: r.price_eur, priceCurrency: "EUR", ...(dealAvailability(r) ? { availability: dealAvailability(r) } : {}), url: esUrl },
        about: {
          "@type": kind.ld, name: r.title_es, accommodationCategory: kind.es,
          address: { "@type": "PostalAddress", addressLocality: r.location_name ? placeEsOf(r) : undefined, addressRegion: rp?.name ? esPlace(rp.name) : undefined, addressCountry: esC(cName) || undefined },
          ...(r.lat != null && r.lng != null ? { geo: { "@type": "GeoCoordinates", latitude: r.lat, longitude: r.lng } } : {}),
          ...(r.sqm ? { floorSize: { "@type": "QuantitativeValue", value: r.sqm, unitCode: "MTK" } } : {}),
          ...(r.bedrooms ? { numberOfBedrooms: r.bedrooms } : {}),
          ...(Number(r.bathrooms) > 0 ? { numberOfBathroomsTotal: Number(r.bathrooms) } : {}), // idea 85: only when the advert gives it
        } }];
      if (artEs.faq.length) ldEs.push({ "@context": "https://schema.org", "@type": "FAQPage", inLanguage: "es", mainEntity: artEs.faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) });
      page(esUrl, `${placesEs(titleOf(r, "es", `${euro(r.price_eur)} · ${r.title_es}`))} · RealHunt`, placesEs(descEs), d.image || DEF, bodyEs, ldEs.map(deepEs),
        { lastmod: homeDay(r), group: "es", lang: "es", alt: { en: url, es: esUrl }, head: (hero ? `<link rel="preload" as="image" href="${esc(hero)}" fetchpriority="high" />` : "") + DEAL_SHELL_HEAD + mdHead(esUrl, "es") });
    }
  }

  // Answers computed from the homes on the site and src/data/destinations.json, so they stay true after every update.
  const destAll: Record<string, any> = readJson("src/data/destinations.json", {});
  const median = (xs: number[]) => { const a = xs.filter((x) => x > 0).sort((p, q) => p - q); return a.length ? a[Math.floor(a.length / 2)] : 0; };
  // Country pages and price bands. Built from the homes themselves, with the real count in the copy.
  const countries = new Map<string, { name: string; homes: any[] }>();
  for (const r of ranked) {
    const k = slugCountry(r.country);
    if (!k) continue;
    if (!countries.has(k)) countries.set(k, { name: r.country, homes: [] });
    countries.get(k)!.homes.push(r);
  }
  // Countries that only exist in deal-meta (home not in the snapshot) still get their page, empty and noindex.
  for (const d of deals) { const k = slugCountry(d.country); if (k && !countries.has(k)) countries.set(k, { name: d.country, homes: [] }); }
  const countryLinks = [...countries.entries()].filter(([k, v]) => !REGIONS.has(k) && v.homes.length >= MIN_LIST)
    .sort((a, b) => b[1].homes.length - a[1].homes.length);
  // ---------- Listing pages: countries, budgets, regions, settings, types, bedrooms, towns and /cheap-houses ----------
  // (seo/listings/build.ts; the Spanish run writes the same pages in Spanish, which become the /es/ twins)
  listingPages(plan, listingRows(), page, lg);

  // ---------- Home page (10-nov-2026): the best homes and the country links in the HTML itself ----------
  // Before, "/" reached crawlers (and the first paint) as an empty page. The block removes itself on any other
  // path, because the worker serves this same file for app pages that have no file of their own (/saved, /account).
  {
    const top = ranked.slice(0, 24);
    const cardImg = (r: any, i: number) => {
      const u = r.image_urls?.[0] ? thumb(toMedia(String(r.image_urls[0]))) : "";
      return u ? `<img src="${esc(u)}" alt="${esc(`${r.title}, ${r.location_name || r.country}`)}" width="480" height="360" ${i < 2 ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" onerror="this.style.visibility='hidden'" />` : "";
    };
    const card = (r: any, i: number) =>
      `<li><a href="/deal/${esc(r.slug)}">${cardImg(r, i)}<strong>${esc(eur(r.price_eur))}</strong><span>${esc(r.title)}</span><small>${esc(r.location_name || r.country)}${r.nota != null ? ` · score ${esc(r.nota)}` : ""}${r.sqm ? ` · ${esc(r.sqm)} m²` : ""}</small></a></li>`;
    const css = `<style>.rh-hs{max-width:1180px}.rh-hs ol{list-style:none;padding:0;margin:20px 0;display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:18px}.rh-hs li a{display:block;color:inherit;text-decoration:none}.rh-hs img{display:block;width:100%;height:auto;aspect-ratio:4/3;object-fit:cover;border-radius:14px;background:#eceef1}.rh-hs strong{display:block;font-size:19px;margin-top:8px}.rh-hs span{display:block;font-weight:600;line-height:1.3}.rh-hs small{color:#5b6470}</style>`;
    const homeDesc = `${rows.length} homes for sale in ${countryLinks.length} countries, each one checked by a person, scored from 70 to 98 and ranked best first. New homes every day.`;
    page(`${SITE}/`, "RealHunt: the best homes in every country, ranked by score",
      "The best homes in Europe, the US, Canada, Mexico and beyond, each one scored from 70 to 98 and ranked best first. New homes every day.", DEF,
      `${css}<main class="rh-static rh-hs" id="rh-home-static"><h1>The best homes abroad, checked and scored</h1><p>${esc(homeDesc)}</p>`
      + `<ol>${top.map(card).join("")}</ol>`
      + `<h2>Homes by country</h2><p>${countryLinks.map(([k, v]) => `<a href="/homes/${esc(k)}">${esc(v.name)} (${v.homes.length})</a>`).join(" · ")}</p>`
      + `<p><a href="/new">New homes</a> · <a href="/price-drops">Price drops</a> · <a href="/what-100k-buys">What €100,000 buys</a> · <a href="/cheap-houses">Cheap houses by country and price</a> · <a href="/can-i-buy">Can I buy there?</a> · <a href="/buying-costs">Buying costs</a> · <a href="/map">Map</a> · <a href="/blog">Guides and research</a> · <a href="/method">How the score works</a></p></main>`
      + `<script>if(location.pathname!=="/"){var e=document.getElementById("rh-home-static");if(e)e.parentNode.removeChild(e)}</script>`,
      [{ "@context": "https://schema.org", "@type": "ItemList", name: "The best homes on RealHunt", numberOfItems: rows.length,
        itemListElement: top.map((h, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}/deal/${h.slug}`, name: h.title })) }],
      { lastmod: maxDay(rows.map(homeDay)), group: "pages", alt: { en: `${SITE}/`, es: `${SITE}/es` } });
    const topEs = ranked.filter((r) => r.title_es).slice(0, 24);
    const euro = (n: number) => Math.round(n).toLocaleString("es-ES") + " €";
    const cardEs = (r: any, i: number) =>
      `<li><a href="/es/deal/${esc(r.slug)}">${cardImg(r, i).replace(/alt="[^"]*"/, `alt="${esc(`${r.title_es}, ${r.location_name || r.country}`)}"`)}<strong>${esc(euro(r.price_eur))}</strong><span>${esc(r.title_es)}</span><small>${esc(r.location_name || r.country)}${r.nota != null ? ` · nota ${esc(r.nota)}` : ""}${r.sqm ? ` · ${esc(r.sqm)} m²` : ""}</small></a></li>`;
    const descEs = `${rows.length} casas en venta en ${countryLinks.length} países, revisadas una a una por una persona, puntuadas de 70 a 98 y ordenadas de mejor a peor. Casas nuevas cada día.`;
    page(`${SITE}/es`, "RealHunt: las mejores casas de cada país, ordenadas por nota", descEs, DEF,
      `${css}<main class="rh-static rh-hs" id="rh-home-static"><h1>Las mejores casas en el extranjero, revisadas y con nota</h1><p>${esc(descEs)}</p>`
      + `<ol>${topEs.map(cardEs).join("")}</ol><h2>Casas por país</h2><p>${countryLinks.filter(([, x]) => x.homes.filter((h) => h.title_es).length >= MIN_LIST).map(([k, x]) => `<a href="/es/homes/${esc(k)}">${esc(esC(x.name))} (${x.homes.length})</a>`).join(" · ")}</p><p><a href="/">English</a></p></main>`
      + `<script>if(!/^\\/es\\/?$/.test(location.pathname)){var e=document.getElementById("rh-home-static");if(e)e.parentNode.removeChild(e)}</script>`,
      [{ "@context": "https://schema.org", "@type": "ItemList", name: "Las mejores casas en RealHunt", inLanguage: "es", numberOfItems: rows.length,
        itemListElement: topEs.map((h, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}/es/deal/${h.slug}`, name: h.title_es })) }],
      { lastmod: maxDay(rows.map(homeDay)), group: "es", lang: "es", alt: { en: `${SITE}/`, es: `${SITE}/es` } });
  }

  // ---------- What €100,000 buys (/what-100k-buys): the best-scored home at or under €100,000 in each country ----------
  {
    const picks = countryLinks.map(([k, v]) => ({ k, name: v.name, h: v.homes.find((h) => h.price_eur <= 100000) })).filter((x) => x.h)
      .sort((a, b) => (b.h.sqm || 0) - (a.h.sqm || 0));
    const u = `${SITE}/what-100k-buys`; const trail: [string, string][] = [["RealHunt", SITE + "/"], ["What €100,000 buys", u]];
    const sized = picks.filter((x) => x.h.sqm > 0);
    const big = sized[0], small = sized[sized.length - 1];
    const d100 = `The best-scored home you can buy for €100,000 or less in each of ${picks.length} countries, side by side: price, size, place and score. Updated every day.`;
    page(u, `What €100,000 buys in ${picks.length} countries · RealHunt`, d100, picks[0] ? homeImg(picks[0].h) : DEF,
      `<main class="rh-static" data-rh-keep data-rh-static>${navHtml(trail)}<h1>What €100,000 buys in ${picks.length} countries</h1><p>${esc(d100)}</p>`
      + (big && small && big !== small ? `<p>The most space for the money is in ${esc(big.name)}: ${esc(big.h.sqm)} m² for ${esc(eur(big.h.price_eur))}. The least is in ${esc(small.name)}: ${esc(small.h.sqm)} m² for ${esc(eur(small.h.price_eur))}.</p>` : "")
      + `<table><thead><tr><th>Country</th><th>Best home under €100,000</th><th>Price</th><th>Size</th><th>€/m²</th><th>Score</th></tr></thead><tbody>`
      + picks.map(({ k, name, h }) => `<tr><td><a href="/homes/${esc(k)}/under-100000">${esc(name)}</a></td><td><a href="/deal/${esc(h.slug)}">${esc(h.title)}</a><br><small>${esc(h.location_name || name)}</small></td><td>${esc(eur(h.price_eur))}</td><td>${h.sqm ? esc(h.sqm) + " m²" : "–"}</td><td>${h.sqm ? esc(eur(h.price_eur / h.sqm)) : "–"}</td><td>${esc(h.nota ?? "–")}</td></tr>`).join("")
      + `</tbody></table><p>Each row is the home with the highest RealHunt score at or under €100,000 in that country today. Buying costs are extra: see <a href="/buying-costs">buying costs by country</a> and <a href="/can-i-buy">whether you can buy there</a>.</p></main>`,
      [crumbs(trail), { "@context": "https://schema.org", "@type": "ItemList", name: "What €100,000 buys, by country", numberOfItems: picks.length,
        itemListElement: picks.map((x, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}/deal/${x.h.slug}`, name: `${x.name}: ${x.h.title}` })) }],
      { noindex: picks.length < MIN_LIST, lastmod: maxDay(picks.map((x) => homeDay(x.h))), group: "content" });
  }

  // ---------- Price drops (/price-drops): homes whose asking price went down since we listed them ----------
  {
    const drops = ranked.filter((r) => Number(r.price_drop) > 0).sort((a, b) => Number(b.price_drop) / (b.price_eur + Number(b.price_drop)) - Number(a.price_drop) / (a.price_eur + Number(a.price_drop)));
    const u = `${SITE}/price-drops`; const trail: [string, string][] = [["RealHunt", SITE + "/"], ["Price drops", u]];
    const dd = drops.length ? `${drops.length} homes on RealHunt whose asking price has gone down since we listed them, biggest cut first.` : "Homes on RealHunt whose asking price has gone down since we listed them. None right now: save a home to be told when its price drops.";
    page(u, "Price drops: homes that just got cheaper · RealHunt", dd, drops[0] ? homeImg(drops[0]) : DEF,
      `<main class="rh-static" data-rh-keep data-rh-static>${navHtml(trail)}<h1>Price drops</h1><p>${esc(dd)}</p>`
      + (drops.length ? `<ol>${drops.slice(0, 100).map((r) => homeLi(r).replace("</li>", ` · was ${esc(eur(r.price_eur + Number(r.price_drop)))} (−${Math.round((Number(r.price_drop) / (r.price_eur + Number(r.price_drop))) * 100)}%)</li>`)).join("")}</ol>` : "")
      + `<p><a href="/new">New homes</a> · <a href="/alerts">Get new homes by email</a> · <a href="/">The best homes</a></p></main>`,
      [crumbs(trail)], { noindex: drops.length < MIN_LIST, lastmod: maxDay(drops.map(homeDay)), group: "content" });
  }

  // ---------- Where the homes come from (/sources and /sources/<portal>) ----------
  {
    const bySrc = new Map<string, any[]>();
    for (const r of ranked) { const dom = String(r.source_domain || "").toLowerCase().replace(/^www\./, ""); if (!dom || /instagram|facebook|tiktok/.test(dom)) continue; (bySrc.get(dom) || bySrc.set(dom, []).get(dom)!).push(r); }
    const srcs = [...bySrc.entries()].sort((a, b) => b[1].length - a[1].length);
    const sSlug = (dom: string) => dom.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const u = `${SITE}/sources`; const trail: [string, string][] = [["RealHunt", SITE + "/"], ["Sources", u]];
    page(u, `Where RealHunt homes come from: ${srcs.length} property portals`, `Every home on RealHunt links to its original listing. These are the ${srcs.length} portals and agencies behind the ${ranked.length} homes on the site today.`, DEF,
      `<main class="rh-static" data-rh-keep data-rh-static>${navHtml(trail)}<h1>Where the homes come from</h1><p>Every home on RealHunt links to its original listing, so you deal directly with the seller or the agent. RealHunt is not an estate agent and takes no commission. These are the portals and agencies behind the homes on the site today.</p>`
      + `<ul>${srcs.map(([dom, l]) => `<li>${l.length >= MIN_LIST ? `<a href="/sources/${esc(sSlug(dom))}">${esc(dom)}</a>` : esc(dom)}: ${l.length} ${l.length === 1 ? "home" : "homes"} (${esc([...new Set(l.map((h) => h.country))].slice(0, 4).join(", "))})</li>`).join("")}</ul></main>`,
      [crumbs(trail)], { noindex: srcs.length < MIN_LIST, group: "content" });
    for (const [dom, l] of srcs) {
      if (l.length < MIN_LIST) continue;
      const su = `${SITE}/sources/${sSlug(dom)}`; const st: [string, string][] = [...trail, [dom, su]];
      const sd = `${l.length} homes from ${dom} that passed the RealHunt check, scored from 70 to 98 and ranked best first, from ${eur(Math.min(...l.map((h) => h.price_eur)))}.`;
      page(su, `Best homes from ${dom} (${l.length}) · RealHunt`, sd, homeImg(l[0]),
        `<main class="rh-static" data-rh-keep data-rh-static>${navHtml(st)}<h1>Best homes from ${esc(dom)}</h1><p>${esc(sd)} Each one opens its original listing on ${esc(dom)}.</p><ol>${l.slice(0, 100).map(homeLi).join("")}</ol>${sourceNotes(dom, l)}<p><a href="/sources">All sources</a></p></main>`,
        [crumbs(st), { "@context": "https://schema.org", "@type": "ItemList", name: `Best homes from ${dom}`, numberOfItems: l.length,
          itemListElement: l.slice(0, 50).map((h, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}/deal/${h.slug}`, name: h.title })) }],
        { lastmod: maxDay(l.map(homeDay)), group: "content" });
    }
  }

  // ---------- New homes (/new) and RSS feed (/feed.xml): the newest 40 homes, refreshed on every build ----------
  const newest = rows.filter((r) => r.publish_at || r.approved_at).slice().sort((a, b) => String(b.publish_at || b.approved_at).localeCompare(String(a.publish_at || a.approved_at))).slice(0, 40);
  page(`${SITE}/new`, "New homes on RealHunt, newest first", `The ${newest.length} newest homes to pass our check, newest first, with price, size and score. Also as an RSS feed.`, newest[0] ? homeImg(newest[0]) : DEF,
    `<main class="rh-static" data-rh-keep data-rh-static>${navHtml([["RealHunt", SITE + "/"], ["New homes", SITE + "/new"]])}<h1>New homes, newest first</h1><p>The newest homes to pass our check. Follow them in any feed reader: <a href="/feed.xml">RSS feed</a>, or <a href="/alerts">get them by email</a>.</p>`
    + `<ol>${newest.map((r) => homeLi(r).replace("</li>", ` · added ${esc(day(r.publish_at || r.approved_at) || "")}</li>`)).join("")}</ol></main>`,
    [crumbs([["RealHunt", SITE + "/"], ["New homes", SITE + "/new"]])], { lastmod: maxDay(newest.map(homeDay)), group: "pages", head: `<link rel="alternate" type="application/rss+xml" title="RealHunt: new homes" href="${SITE}/new.xml" />` });
  const rssDate = (s: string) => new Date(s).toUTCString();
  out(path.join(root, "feed.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>RealHunt: new homes</title><link>${SITE}/new</link><atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml"/><description>New homes on RealHunt, checked by a person and scored from 70 to 98.</description><language>en</language>`
    + newest.map((r) => { const u = `${SITE}/deal/${r.slug}`; const img = r.image_urls?.[0] ? abs(r.image_urls[0]) : ""; return `<item><title>${esc(`${eur(r.price_eur)} · ${r.title}`)}</title><link>${u}</link><guid isPermaLink="true">${u}</guid><pubDate>${rssDate(r.publish_at || r.approved_at)}</pubDate><description>${esc(`${r.location_name || r.country}. ${r.sqm ? r.sqm + " m². " : ""}RealHunt score ${r.nota ?? ""}. ${r.why_great || ""}`)}</description>${img ? `<enclosure url="${esc(img)}" type="image/${img.endsWith(".webp") ? "webp" : "jpeg"}" length="0"/>` : ""}</item>`; }).join("")
    + `</channel></rss>\n`);

  // /new.xml: the 50 newest homes as RSS (same items as /feed.xml, which keeps its 40 for existing subscribers).
  const newest50 = rows.filter((r) => r.publish_at || r.approved_at).slice().sort((a, b) => String(b.publish_at || b.approved_at).localeCompare(String(a.publish_at || a.approved_at))).slice(0, 50);
  out(path.join(root, "new.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>RealHunt: the 50 newest homes</title><link>${SITE}/new</link><atom:link href="${SITE}/new.xml" rel="self" type="application/rss+xml"/><description>The 50 newest homes on RealHunt, each checked by a person and scored from 70 to 98.</description><language>en</language>`
    + newest50.map((r) => { const u = `${SITE}/deal/${r.slug}`; const img = r.image_urls?.[0] ? abs(r.image_urls[0]) : ""; return `<item><title>${esc(`${eur(r.price_eur)} · ${r.title}`)}</title><link>${u}</link><guid isPermaLink="true">${u}</guid><pubDate>${rssDate(r.publish_at || r.approved_at)}</pubDate><category>${esc(r.country)}</category><description>${esc(`${r.location_name || r.country}. ${r.sqm ? r.sqm + " m². " : ""}${r.bedrooms ? r.bedrooms + " bedrooms. " : ""}RealHunt score ${r.nota ?? ""}. ${r.why_great || ""}`)}</description>${img ? `<enclosure url="${esc(img)}" type="image/${img.endsWith(".webp") ? "webp" : "jpeg"}" length="0"/>` : ""}</item>`; }).join("")
    + `</channel></rss>\n`);

  // ---------- Price report (/research/prices): by country, from the homes on the site ----------
  const priceRows = countryLinks.map(([k, v]) => {
    const pr = v.homes.map((h) => h.price_eur); const pm = v.homes.filter((h) => h.sqm > 0).map((h) => h.price_eur / h.sqm);
    return { k, name: v.name, n: v.homes.length, min: Math.min(...pr), med: median(pr), ppsqm: median(pm), score: median(v.homes.map((h) => h.nota || 0)) };
  }).sort((a, b) => a.ppsqm - b.ppsqm);
  const today = new Date().toISOString().slice(0, 10);
  page(`${SITE}/research/prices`, `What a cheap home costs, country by country (${today.slice(0, 7)}) · RealHunt`, `Median price, price per m² and cheapest home in ${priceRows.length} countries, from ${rows.length} homes checked by a person. Updated with every new home. Free to quote with a link.`, DEF,
    `<main class="rh-static" data-rh-keep data-rh-static>${navHtml([["RealHunt", SITE + "/"], ["Research", SITE + "/blog"], ["Prices by country", SITE + "/research/prices"]])}<h1>What a cheap home costs, country by country</h1>`
    + `<p>From the ${rows.length} homes on RealHunt, each checked by a person. Sorted by median price per square metre, cheapest first. Updated ${today}. Free to quote with a link to this page.</p>`
    + `<div style="overflow-x:auto"><table><thead><tr><th>Country</th><th>Homes</th><th>Median €/m²</th><th>Median price</th><th>Cheapest</th><th>Median score</th></tr></thead><tbody>`
    + priceRows.map((x) => `<tr><td><a href="/homes/${esc(x.k)}">${esc(x.name)}</a></td><td>${x.n}</td><td>${x.ppsqm ? esc(eur(x.ppsqm)) : "n/a"}</td><td>${esc(eur(x.med))}</td><td>${esc(eur(x.min))}</td><td>${x.score}</td></tr>`).join("")
    + `</tbody></table></div><p>Prices are asking prices in euros on the day each home was added. They describe the homes on RealHunt, not every home in each country. <a href="/method">How homes are chosen and scored</a>.</p></main>`,
    [crumbs([["RealHunt", SITE + "/"], ["Research", SITE + "/blog"], ["Prices by country", SITE + "/research/prices"]]),
     { "@context": "https://schema.org", "@type": "Dataset", name: "Cheap home prices by country on RealHunt", description: "Median asking price, median price per m² and cheapest home per country, from homes checked by a person.", url: `${SITE}/research/prices`, dateModified: today, creator: { "@type": "Organization", name: "RealHunt", url: SITE + "/" }, license: "https://creativecommons.org/licenses/by/4.0/", variableMeasured: ["median price (EUR)", "median price per m² (EUR)", "cheapest price (EUR)"] }],
    { lastmod: today, group: "content" });

  // ---------- Score method (the 70–98 home score) ----------
  page(`${SITE}/method`, "How the RealHunt score works: 11 sub-scores, graded 70 to 98 · RealHunt",
    "Every home is checked by a person, then graded from 70 to 98 against every other home on RealHunt using 11 sub-scores: price, price per m², space, condition, extras, water, weather, airport, buying costs, listing detail and buyer interest.",
    DEF,
    `<main class="rh-static">${navHtml([["RealHunt", SITE + "/"], ["How the score works", SITE + "/method"]])}<h1>How the RealHunt score works</h1>`
    + `<p>A person looks at every home before it goes up. Homes that need major work, ruins, bare land and listings with one photo are turned down. That is why the grade starts at 70: a home on RealHunt has already passed.</p>`
    + `<p>The grade then compares the home with every other home on the site, from 70 to 98. The home pages, the country pages and the front page are all ordered by this grade, best first. Votes and saves only move the buyer-interest sub-score; nobody pays to rank higher.</p>`
    + `<h2>The 11 sub-scores (0 to 100)</h2><ul>${DIMS.map(([, l, h]) => `<li><strong>${esc(l)}</strong>: ${esc(h)}</li>`).join("")}</ul>`
    + `<h2>What the score is not</h2><p>It is not a survey or a valuation. Photos can flatter and listings go out of date. Before you buy anything, get an independent inspection and a local lawyer or notary. If a home is sold or wrong, use the report button on its page.</p>`
    + `<p><a href="/blog/how-we-choose-homes">Why we say no to most cheap houses</a> · <a href="/top/how-we-rank">How the new-build Top 100 is ranked</a> · <a href="/about">Who runs RealHunt</a></p></main>`,
    [crumbs([["RealHunt", SITE + "/"], ["How the score works", SITE + "/method"]])]);

  // ---------- Guides, tools and info pages ----------
  // (Buying guides are built further down, with the cost pages and the country comparisons.)
  page(`${SITE}/extension`, "RealHunt Score: see the real score of any home · Free Chrome extension", "Free Chrome extension. Every home on idealista, Zillow and Rightmove gets a 0–100 score: price against the area, listing quality and red flags, with the reason for every point.", DEF);
  page(`${SITE}/extension/privacy`, "RealHunt Score · Privacy policy", "What the RealHunt Score extension collects, why, and how to delete it.", DEF);
  page(`${SITE}/find-my-home`, "We find your home, where you want, at your price · RealHunt", "Free home finder. Tell us where and how much, and we send you the best real homes, checked by a person. Skip the queue by inviting friends.", DEF);
  for (const c of ["madrid", "barcelona", "valencia", "malaga", "sevilla", "lisbon", "porto", "paris", "london", "rome", "milan", "berlin"]) page(`${SITE}/find-my-home/${c}`, `We find you a home in ${cap(c)} · RealHunt`, `Tell us your budget and we find you a real home in or near ${cap(c)}, checked by a person. Free.`, DEF);
  page(`${SITE}/map`, "Map of the best homes · RealHunt", `Every home on RealHunt on one map: ${rows.length} homes in ${countryLinks.length} countries, each with its score.`, DEF,
    `<main class="rh-static"><h1>Map of the best homes</h1><p>${rows.length} homes by country:</p><ul>${countryLinks.map(([k, v]) => `<li><a href="/homes/${esc(k)}">${esc(v.name)}</a> (${v.homes.length})</li>`).join("")}</ul></main>`);
  page(`${SITE}/swipe`, "Swipe the best homes · RealHunt", "Swipe through the best-scored homes and save the ones you love.", DEF);
  page(`${SITE}/leaderboard`, "Top hunters · RealHunt", "The people who find the best homes.", DEF);
  page(`${SITE}/alerts`, "New-home alerts by email · RealHunt", "Pick a country and a budget and get the best new homes by email as soon as they pass our check. Free, one-click unsubscribe.", DEF,
    `<main class="rh-static"><h1>Get the best new homes by email</h1><p>Pick a country and a budget. When a home passes our check and fits, you get it by email. Free, and every email has a one-click unsubscribe.</p><p>Popular: ${countryLinks.slice(0, 8).map(([k, v]) => `<a href="/homes/${esc(k)}">${esc(v.name)}</a>`).join(" · ")}</p></main>`,
    [crumbs([["RealHunt", SITE + "/"], ["Alerts", SITE + "/alerts"]])]);
  page(`${SITE}/winners`, "Winners: the best homes each week · RealHunt", "The homes that topped RealHunt each week, with their price and score.", DEF);
  page(`${SITE}/best`, "The best homes on RealHunt, by country · RealHunt", "The top-scored homes in each country on RealHunt, checked by a person and ranked best first.", DEF,
    `<main class="rh-static"><h1>The best homes, by country</h1><ul>${countryLinks.map(([k, v]) => `<li><a href="/homes/${esc(k)}">Best homes in ${esc(v.name)}</a>: ${v.homes[0] ? `${esc(v.homes[0].title)}, ${esc(eur(v.homes[0].price_eur))}` : ""}</li>`).join("")}</ul></main>`);
  page(`${SITE}/help-buying`, "Help buying a home abroad · RealHunt", "Local lawyers, translators, surveys and tax numbers for buying a house in another country.", DEF);
  page(`${SITE}/insider`, "RealHunt Insider · The secret Top 5 of the week", "Invite 3 friends and unlock the secret weekly Top 5: the homes furthest below their country's typical price. Free.", DEF);
  page(`${SITE}/contact`, "Contact RealHunt", "Write to the RealHunt team about a home, a listing, a partnership or press.", DEF,
    `<main class="rh-static"><h1>Contact RealHunt</h1><p>Email: <!--email_off-->carlos@equinoxinvestmentgroup.com<!--/email_off--></p><p>RealHunt is run by Equinox Investment Group LLC. <a href="/about">About us</a>.</p></main>`);
  for (const [k, n] of [["privacy", "Privacy policy"], ["terms", "Terms of use"], ["cookies", "Cookie policy"], ["takedown", "Listing and photo takedown requests"]] as const)
    page(`${SITE}/legal/${k}`, `${n} · RealHunt`, `${n} for RealHunt (realhunt.co), run by Equinox Investment Group LLC.`, DEF, undefined, [crumbs([["RealHunt", SITE + "/"], [n, `${SITE}/legal/${k}`]])]);

  // ---------- Research blog ----------
  const posts: any[] = readJson("src/data/blog.json", []);
  const blogRss = `<link rel="alternate" type="application/rss+xml" title="RealHunt Research" href="${SITE}/blog/rss.xml" />`;
  const card = (p: any) => `<li><a href="/blog/${esc(p.slug)}"><strong>${esc(p.title)}</strong></a> <span>${esc(p.desc)}</span></li>`;
  page(`${SITE}/blog`, "RealHunt Research · Data on cheap homes around the world", "Original data and plain-English guides on affordable homes: prices by country, buying rules, rent vs buy.", posts[0] ? abs(posts[0].image) : DEF,
    `<main class="rh-static"><h1>RealHunt Research</h1><p>Studies and guides built from the homes on RealHunt.</p><ul>${posts.map(card).join("")}</ul></main>`,
    [crumbs([["RealHunt", SITE + "/"], ["Research", SITE + "/blog"]])], { lastmod: maxDay(posts.map((p) => p.date)), group: "content", head: blogRss });
  for (const p of posts) {
    if (!/^[a-z0-9-]+$/.test(p.slug)) continue;
    const url = `${SITE}/blog/${p.slug}`;
    page(url, `${p.title} · RealHunt`, p.desc, abs(p.image),
      `<main class="rh-static"><article><nav><a href="/">RealHunt</a> › <a href="/blog">Research</a></nav><h1>${esc(p.title)}</h1><p>${esc(p.desc)}</p><p>${esc(p.author)} · <time datetime="${esc(p.date)}">${esc(p.date)}</time></p>${p.html}</article><h2>More</h2><ul>${posts.filter((x) => x.slug !== p.slug).map(card).join("")}</ul></main>`,
      [{ "@context": "https://schema.org", "@type": "Article", headline: p.title, description: p.desc, image: [abs(p.image)], datePublished: p.date, dateModified: p.updated || p.date, mainEntityOfPage: url,
         author: { "@type": "Organization", name: p.author, url: SITE + "/blog" }, publisher: { "@type": "Organization", "@id": SITE + "/#organization", name: "RealHunt", logo: { "@type": "ImageObject", url: SITE + "/favicon.png", width: 512, height: 512 } } },
       crumbs([["RealHunt", SITE + "/"], ["Research", SITE + "/blog"], [p.title, url]])],
      { lastmod: day(p.updated || p.date), group: "content", head: blogRss });
  }
  // RSS of the latest 30 posts (/blog/rss.xml), linked from the head of every blog page.
  const byDate = posts.filter((p) => /^[a-z0-9-]+$/.test(p.slug)).slice().sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 30);
  fs.mkdirSync(path.join(root, "blog"), { recursive: true });
  out(path.join(root, "blog", "rss.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>RealHunt Research</title><link>${SITE}/blog</link><atom:link href="${SITE}/blog/rss.xml" rel="self" type="application/rss+xml"/><description>Data and plain-English guides on cheap homes around the world, from the homes on RealHunt.</description><language>en</language>`
    + (byDate[0] ? `<lastBuildDate>${new Date(byDate[0].updated || byDate[0].date).toUTCString()}</lastBuildDate>` : "")
    + byDate.map((p) => { const u = `${SITE}/blog/${p.slug}`; const img = p.image ? abs(p.image) : ""; return `<item><title>${esc(p.title)}</title><link>${u}</link><guid isPermaLink="true">${u}</guid><pubDate>${new Date(p.date).toUTCString()}</pubDate><description>${esc(p.desc)}</description>${(p.tags || []).map((t: string) => `<category>${esc(t)}</category>`).join("")}${img ? `<enclosure url="${esc(img)}" type="image/${img.endsWith(".webp") ? "webp" : img.endsWith(".png") ? "png" : "jpeg"}" length="0"/>` : ""}</item>`; }).join("")
    + `</channel></rss>\n`);

  // ---------- New builds: Top 100 by destination ----------
  const TOPS: [string, string, number][] = [["bali", "Bali", 502], ["phuket", "Phuket", 468], ["tulum", "Tulum", 425], ["batumi", "Batumi", 563], ["samui", "Koh Samui", 89]];
  {
    const med = (a: number[]) => { const s = a.slice().sort((x, y) => x - y); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : 0; };
    const eur = (v: number) => "€" + Math.round(v).toLocaleString("en");
    const rows = TOPS.map(([k, n, checked]) => {
      const list: any[] = readJson(`src/data/top-${k}.json`, []);
      const prices = list.map((t) => Number(t.price_eur)).filter((v) => v > 0);
      const areas: Record<string, number> = {};
      for (const t of list) { const a = String(t.locality || "").split(",").pop()!.trim(); if (a) areas[a] = (areas[a] || 0) + 1; }
      const topAreas = Object.entries(areas).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([a]) => a);
      const villas = list.filter((t) => /villa|house|town/i.test(String(t.ptype || ""))).length;
      return { k, n, checked, list, from: prices.length ? Math.min(...prices) : 0, median: med(prices), topAreas, villas };
    }).filter((r) => r.list.length);
    const total = rows.reduce((s, r) => s + r.checked, 0);
    const cheapest = rows.slice().sort((a, b) => a.median - b.median)[0];
    const body = `<main class="rh-static"><h1>Top 100 new property developments by destination</h1>`
      + `<p>We checked ${total.toLocaleString("en")} new-build projects in ${rows.length} destinations and ranked the best of each on price, price per m², location, build stage and developer, then on what buyers vote, save and ask about. Nobody pays to be listed or to rank higher. ${cheapest ? `Of the five, ${esc(cheapest.n)} has the lowest median starting price today (${eur(cheapest.median)}).` : ""}</p>`
      + `<h2>The rankings at a glance</h2><table><thead><tr><th>Destination</th><th>Projects checked</th><th>Ranked</th><th>From</th><th>Median start price</th><th>Villas or houses</th><th>Main areas</th></tr></thead><tbody>`
      + rows.map((r) => `<tr><td><a href="/top/${r.k}">${esc(r.n)}</a></td><td>${r.checked}</td><td>${r.list.length}</td><td>${eur(r.from)}</td><td>${eur(r.median)}</td><td>${r.villas}</td><td>${esc(r.topAreas.join(", "))}</td></tr>`).join("")
      + `</tbody></table>`
      + rows.map((r) => `<h2>New developments in ${esc(r.n)}</h2><p>${r.list.length} ranked projects from ${eur(r.from)}, median start price ${eur(r.median)}, mostly in ${esc(r.topAreas.join(", "))}. The three highest ranked today:</p><ol>${r.list.slice(0, 3).map((t) => `<li><a href="/top/${r.k}/${esc(t.slug)}">${esc(t.name)}</a>, ${esc(t.locality)}, from ${eur(Number(t.price_eur))} (${esc(t.developer)})</li>`).join("")}</ol><p><a href="/top/${r.k}">See the full ${esc(r.n)} ranking</a></p>`).join("")
      + `<h2>Before you buy off-plan</h2><p>Prices are starting prices published by each developer and can change. Check the developer's track record, who holds the land title, the payment schedule and what happens if delivery is late, and read the local rules for foreign buyers. See <a href="/top/how-we-rank">how we rank</a> and our <a href="/guide">buying guides</a>.</p></main>`;
    page(`${SITE}/top`, "Top 100 new builds by destination: Bali, Phuket, Tulum, Batumi, Koh Samui · RealHunt", `New property developments ranked in ${rows.map((r) => r.n).join(", ")}: ${total.toLocaleString("en")} projects checked, starting prices, main areas and the best of each.`, `${SITE}/top/bali/og.jpg`,
      body, [crumbs([["RealHunt", SITE + "/"], ["Top 100 rankings", SITE + "/top"]])], { group: "top" });
  }
  page(`${SITE}/top/how-we-rank`, "How we rank the Top 100 · RealHunt", "The exact formula behind the RealHunt Top 100 rankings, our sources and review dates, and how we make money. Nobody pays to be listed or to rank higher.", `${SITE}/top/bali/og.jpg`,
    `<main class="rh-static"><h1>How we rank</h1><p>Nobody pays to be listed or to rank higher.</p><p>Every project gets 10 scores from 0 to 100: price, value per m², location, beach, facilities, delivery, developer, space, visitor interest and listing detail. The grade is the plain average of the 10, and the ranking orders projects by it. Votes, saves and questions raise visitor interest. A verified developer gets 100 in listing detail.</p><p>Buyers pay nothing. Developers pay nothing to be listed, verify or rank. RealHunt earns 5% from the developer only if a buyer it introduced buys.</p><p>Resale homes use a different score: <a href="/method">how the home score works</a>.</p></main>`,
    [crumbs([["RealHunt", SITE + "/"], ["Top 100 rankings", SITE + "/top"], ["How we rank", SITE + "/top/how-we-rank"]])], { group: "top" });
  const KM: Record<string, [string, string]> = { bali: ["https://kolaboro.com/m/bali/", "Bali"], phuket: ["https://kolaboro.com/m/phuket/", "Phuket"], samui: ["https://kolaboro.com/m/koh-samui/", "Koh Samui"], tulum: ["https://kolaboro.com/m/riviera-maya/", "Riviera Maya (Tulum included)"], batumi: ["https://kolaboro.com/m/georgia/", "Georgia (Batumi included)"] };   // same map as KOLABORO_MARKET in src/community/top.tsx
  for (const [k, n, checked] of TOPS) {
    const list: any[] = readJson(`src/data/top-${k}.json`, []);
    if (!list.length) continue;
    const tUrl = `${SITE}/top/${k}`;
    const TN = list.length < 100 ? `Top ${list.length}` : "Top 100";
    page(tUrl, `${TN} new property developments in ${n} · RealHunt`, `The ${list.length} best new villa and apartment developments in ${n}, from ${checked} projects checked. Ranked by price, area and build stage, then by what buyers vote, save and ask about.`, `${tUrl}/og.jpg`,
      `<main class="rh-static"><h1>${TN} new property developments in ${esc(n)}</h1><p>Ranked by demand: base score from price, price per m², area and build stage, then buyer votes, saves and questions.</p><ol>${list.map((t) => `<li><a href="/top/${k}/${esc(t.slug)}">${esc(t.name)}</a>, ${esc(t.locality)}, from €${Number(t.price_eur).toLocaleString("en")} (${esc(t.developer)})</li>`).join("")}</ol>${KM[k] ? `<p>Before you pay a deposit, check what the developer publishes. Permits, handover dates and the sources behind them for off-plan projects in this area are in <a href="${KM[k][0]}">the ${esc(KM[k][1])} market file on Kolaboro</a>.</p>` : ""}</main>`,
      [crumbs([["RealHunt", SITE + "/"], ["Top 100 rankings", SITE + "/top"], [`${n} ${TN}`, tUrl]]),
       { "@context": "https://schema.org", "@type": "ItemList", name: `${TN} new builds in ${n}`, numberOfItems: list.length, itemListElement: list.map((t, i) => ({ "@type": "ListItem", position: i + 1, url: `${tUrl}/${t.slug}`, name: t.name })) }],
      { group: "top" });
    for (const t of list) {
      if (!/^[a-z0-9-]+$/.test(t.slug)) continue;
      const u = `${tUrl}/${t.slug}`;
      page(u, `${t.name}, ${t.locality}: ${n} ${TN} · RealHunt`, `${t.blurb} Ranked in the ${n} ${TN} new builds by RealHunt buyers.`, `${u}-og.jpg`,
        `<main class="rh-static"><nav><a href="/">RealHunt</a> › <a href="/top/${k}">${esc(n)} ${TN}</a></nav><h1>${esc(t.name)}</h1><p>${esc(t.locality)} · from €${Number(t.price_eur).toLocaleString("en")} · ${esc(t.developer)}</p><p>${esc(t.blurb)}</p><p><a href="/top/${k}">See the full ${esc(n)} ${TN}</a> · <a href="/top/how-we-rank">How we rank</a></p></main>`,
        [crumbs([["RealHunt", SITE + "/"], [`${n} ${TN}`, tUrl], [t.name, u]])], { group: "top" });
    }
  }
  page(`${SITE}/about`, "About RealHunt: who we are and how we work", "Who runs RealHunt, the company behind it, how we make money and what you should know about our founder before you trust us.", DEF,
    `<main class="rh-static"><h1>Who we are</h1><p>RealHunt is run by Equinox Investment Group LLC, 30 N Gould St Ste N, Sheridan, WY 82801, United States. Founder: Carlos de Ory Gordillo. Contact: <!--email_off-->carlos@equinoxinvestmentgroup.com<!--/email_off-->.</p><h2>How RealHunt makes money</h2><p>Buyers pay nothing. Resale homes are not for sale through RealHunt: we link to the original listing. On new builds, RealHunt earns a fee from the developer only if a buyer it introduced buys. Nobody pays to be listed or to rank higher, and sponsored cards are marked as sponsored.</p><p><a href="/method">How the score works</a> · <a href="/contact">Contact</a></p></main>`,
    [crumbs([["RealHunt", SITE + "/"], ["About", SITE + "/about"]]),
     { "@context": "https://schema.org", "@type": "Organization", "@id": SITE + "/#organization", name: "RealHunt", url: SITE + "/", logo: SITE + "/favicon.png", email: "carlos@equinoxinvestmentgroup.com",
       parentOrganization: { "@type": "Organization", name: "Equinox Investment Group LLC", address: { "@type": "PostalAddress", streetAddress: "30 N Gould St Ste N", addressLocality: "Sheridan", addressRegion: "WY", postalCode: "82801", addressCountry: "US" } } }]);
  // 30-oct-2026: the Eco Beach City card is shared too; give its page its own title and picture.
  page(`${SITE}/ecobeachcity`, "€36,500 furnished cabin and plot · Sumba, Indonesia · RealHunt", "A furnished cabin on your own plot in Eco Beach City, a new beachfront eco village in Sumba, one hour from Bali. Cabin, plot and furniture for €36,500, payable in instalments.", `${SITE}/images/ebc/ebc-card.jpg`);
  page(`${SITE}/weather`, "Best places to live with good weather all year, and good homes there · RealHunt", "Compare places by good-weather days, mild winters, clean air, safety, the sea and the airport, then see the homes that score 80+ there. Mediterranean, Canaries, Mexico, Bali, Sumba and more.", `${SITE}/weather/og.jpg`,
    weatherShell(), [crumbs([["RealHunt", SITE + "/"], ["Weather", SITE + "/weather"]])]);
  page(`${SITE}/new-builds`, "New-build homes under €100,000 · RealHunt", "New-build projects with units under €100,000, payment plans and verified developers. Ask the developer directly.", DEF, undefined, undefined, { group: "top" });
  for (const [c, n] of [["indonesia", "Indonesia"], ["mexico", "Mexico"], ["albania", "Albania"], ["spain", "Spain"], ["portugal", "Portugal"], ["thailand", "Thailand"], ["turkey", "Turkey"], ["montenegro", "Montenegro"]]) page(`${SITE}/new-builds/${c}`, `New builds under €100,000 in ${n} · RealHunt`, `New-build projects in ${n} with units under €100,000, payment plans and verified developers. Ask the developer directly.`, DEF, undefined, undefined, { group: "top" });
  page(`${SITE}/developers`, "Developer ranking · RealHunt", "Developers ranked by sales, buyer ratings and how fast they answer buyers on RealHunt.", DEF, undefined, undefined, { group: "top" });

  // ---------- For developers and agents ----------
  page(`${SITE}/network`, "RealHunt Network · Free buyers for your new-build project", "List a new-build project on RealHunt for free and get qualified buyers. You pay 5% only if a buyer we introduced buys.", DEF,
    `<main class="rh-static"><h1>Free buyers for your new-build project</h1><p>List your project for free. Buyers ask you directly through RealHunt. You pay 5% only if a buyer we introduced buys.</p><p><a href="/network/start">List your project</a> · <a href="/network/example">See an example listing</a> · <a href="/network/reservation-contract">Free reservation contract</a> · <a href="/agents">For local agents</a></p></main>`,
    [crumbs([["RealHunt", SITE + "/"], ["Network", SITE + "/network"]])]);
  page(`${SITE}/network/start`, "List your project free · RealHunt Network", "Paste your project link and we build your listing in seconds. Buyers for your project, 5% only if one buys. Earn 3% from leads you could not sell to.", DEF);
  page(`${SITE}/network/agreement`, "Network agreement · RealHunt", "The agreement between RealHunt and developers listing on the RealHunt Network: fees, leads and payment.", DEF);

  // ---------- Buying guides, real costs and country comparisons ----------
  // Steps per country: src/data/guides.json. Money side (costs, taxes, rules, sources): src/data/destinations.json.
  // The app shows the same pages (src/community/extras.tsx GuidePage, v10.tsx CostsPage, countries.tsx).
  const dest: Record<string, any> = readJson("src/data/destinations.json", {});
  const guides: Record<string, { name: string; steps: [string, string][]; yearly: string }> = readJson("src/data/guides.json", {});
  const DN: Record<string, string> = { bali: "Bali", lombok: "Lombok", albania: "Albania", mexico: "Mexico", spain: "Spain", montenegro: "Montenegro", georgia: "Georgia", "northern-cyprus": "Northern Cyprus", vietnam: "Vietnam", italy: "Italy", portugal: "Portugal", bulgaria: "Bulgaria" };
  for (const k of Object.keys(guides)) DN[k] ||= guides[k].name;
  const costKeys = Object.keys(dest).filter((k) => k !== "_meta" && DN[k]).sort((a, b) => DN[a].localeCompare(DN[b]));
  const dl = (d: any) => [["Can foreigners buy?", d.can_foreigners_buy], ["Costs on top of the price", d.purchase_costs_pct ? `${d.purchase_costs_pct}% · ${d.purchase_costs_breakdown || ""}` : null], ["Yearly property tax", d.annual_property_tax], ["Tax on rental income", d.rental_income_tax], ["Holiday-rental yield", d.holiday_rental_gross_yield_pct ? `${d.holiday_rental_gross_yield_pct}% gross` : null], ["What holiday rentals earn", d.holiday_rental_yield_note], ["Long-term rent yield", d.long_term_gross_yield_pct ? `${d.long_term_gross_yield_pct}% gross` : null], ["Holiday-rental rules", d.holiday_rental_rules]].filter((r) => r[1]).map((r) => `<dt>${esc(r[0])}</dt><dd>${esc(r[1])}</dd>`).join("");
  const srcList = (d: any) => (d?.sources || []).map((u: string) => `<li><a href="${esc(u)}" rel="nofollow noopener">${esc(u.replace(/^https?:\/\/(www\.)?/, ""))}</a></li>`).join("");
  const homesOf = (k: string) => countries.get(k)?.homes || [];
  const cmpKeys = Object.keys(guides).filter((k) => dest[k] && homesOf(k).length >= MIN_LIST).sort((a, b) => homesOf(b).length - homesOf(a).length);
  const pairUrl = (a: string, b: string) => `/countries/${[a, b].sort().join("-vs-")}`;
  const faqLd = (qa: [string, string][]) => ({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: qa.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) });

  page(`${SITE}/costs`, "What it really costs to buy a cheap home abroad · RealHunt", `Buying costs, property tax and tax on rent in ${costKeys.length} countries, from Spain and Italy to Denmark, Japan and Mexico. With sources.`, DEF,
    `<main class="rh-static"><nav><a href="/">RealHunt</a> › Real costs</nav><h1>What it really costs to buy abroad</h1><ul>${costKeys.map((k) => `<li><a href="/costs/${k}">${esc(DN[k])}</a>: ${esc(dest[k].purchase_costs_pct || "?")}% on top of the price</li>`).join("")}</ul><p><a href="/guide">Buying guides by country</a> · <a href="/countries">Compare two countries</a></p><p>Not legal or tax advice. Check with a local lawyer before you buy.</p></main>`,
    [crumbs([["RealHunt", SITE + "/"], ["Real costs", SITE + "/costs"]])], { group: "content" });
  for (const k of costKeys) {
    const homesHere = homesOf(k);
    page(`${SITE}/costs/${k}`, `Buying a home in ${the(DN[k])}: real costs, taxes and rental yield · RealHunt`, `What you pay on top of the price in ${the(DN[k])}${dest[k].purchase_costs_pct ? ` (about ${dest[k].purchase_costs_pct}%)` : ""}, yearly property tax and tax on rental income. With sources.`, DEF,
      `<main class="rh-static"><nav><a href="/">RealHunt</a> › <a href="/costs">Real costs</a></nav><h1>Buying a home in ${esc(the(DN[k]))}: what it really costs</h1><dl>${dl(dest[k])}</dl>`
      + `<h2>Sources</h2><ul>${srcList(dest[k])}</ul>`
      + (homesHere.length >= MIN_LIST ? `<h2>Homes in ${esc(the(DN[k]))}</h2><ol>${homesHere.slice(0, 10).map(homeLi).join("")}</ol><p><a href="/homes/${esc(k)}">All ${homesHere.length} homes in ${esc(the(DN[k]))}</a></p>` : "")
      + (guides[k] ? `<p><a href="/guide/${k}">How to buy a home in ${esc(the(DN[k]))}, step by step</a></p>` : "")
      + `<p>Not legal or tax advice. Check with a local lawyer before you buy.</p></main>`,
      [crumbs([["RealHunt", SITE + "/"], ["Real costs", SITE + "/costs"], [DN[k], `${SITE}/costs/${k}`]])], { lastmod: day(dest[k].updated_at || dest[k].checked_at), group: "content" });
  }

  const guideKeys = Object.keys(guides).sort((a, b) => guides[a].name.localeCompare(guides[b].name));
  page(`${SITE}/guide`, "Guides to buying a home abroad as a foreigner · RealHunt", `How to buy a house as a foreigner in ${guideKeys.length} countries: steps, papers, taxes and costs on top of the price, in plain words.`, DEF,
    `<main class="rh-static"><nav><a href="/">RealHunt</a> › Guides</nav><h1>Guides to buying a home abroad</h1><p>The steps, papers and taxes to buy a house as a foreigner, country by country, in plain words.</p><ul>${guideKeys.map((k) => `<li><a href="/guide/${k}">${esc(guides[k].name)}</a>${dest[k]?.purchase_costs_pct ? `: about ${esc(dest[k].purchase_costs_pct)}% on top of the price` : ""}</li>`).join("")}</ul><p><a href="/countries">Compare two countries</a> · <a href="/costs">Real buying costs by country</a></p></main>`,
    [crumbs([["RealHunt", SITE + "/"], ["Guides", SITE + "/guide"]])], { group: "content" });
  for (const k of guideKeys) {
    const g = guides[k], c = dest[k] || {}, n = g.name, hs = homesOf(k);
    const qa: [string, string][] = [];
    if (c.can_foreigners_buy) qa.push([`Can foreigners buy a home in ${the(n)}?`, c.can_foreigners_buy]);
    if (c.purchase_costs_pct) qa.push([`How much are the buying costs in ${the(n)}?`, `About ${c.purchase_costs_pct}% on top of the price${c.purchase_costs_breakdown ? `: ${c.purchase_costs_breakdown}` : "."}`]);
    qa.push([`What does owning a home in ${the(n)} cost every year?`, g.yearly]);
    const others = cmpKeys.filter((x) => x !== k).slice(0, 8);
    page(`${SITE}/guide/${k}`, `How to buy a home in ${the(n)} as a foreigner: steps, taxes and costs · RealHunt`, `The steps, papers and taxes to buy a house in ${the(n)} from abroad${c.purchase_costs_pct ? `, and the ${c.purchase_costs_pct}% you pay on top of the price` : ""}. In plain words, with sources.`, DEF,
      `<main class="rh-static"><nav><a href="/">RealHunt</a> › <a href="/guide">Guides</a></nav><h1>How to buy a home in ${esc(the(n))} as a foreigner</h1><p>The steps, papers and taxes, in plain words. General information, not legal advice: use a local lawyer before you sign.</p>`
      + (c.can_foreigners_buy ? `<h2>Can foreigners buy?</h2><p>${esc(c.can_foreigners_buy)}</p>` : "")
      + `<h2>The steps</h2><ol>${g.steps.map(([h, b]) => `<li><strong>${esc(h)}</strong>: ${esc(b)}</li>`).join("")}</ol>`
      + (c.purchase_costs_pct ? `<h2>Costs on top of the price</h2><p>About ${esc(c.purchase_costs_pct)}%${c.purchase_costs_breakdown ? `: ${esc(c.purchase_costs_breakdown)}` : ""}</p>` : "")
      + `<h2>Every year</h2><p>${esc(g.yearly)}</p>` + (c.annual_property_tax ? `<p>Yearly property tax: ${esc(c.annual_property_tax)}</p>` : "") + (c.rental_income_tax ? `<p>Tax on rental income: ${esc(c.rental_income_tax)}</p>` : "")
      + (hs.length >= MIN_LIST ? `<h2>Best homes in ${esc(the(n))}</h2><ol>${hs.slice(0, 6).map(homeLi).join("")}</ol><p><a href="/homes/${k}">All ${hs.length} homes in ${esc(the(n))}</a></p>` : "")
      + (dest[k] ? `<p><a href="/costs/${k}">Costs, taxes and sources for ${esc(n)}</a>${c.purchase_costs_pct ? ` · <a href="/buying-costs/${k}">Buying-cost calculator for ${esc(n)}</a>` : ""} · <a href="/can-i-buy">Can I buy there? Rules by nationality</a></p>` : "")
      + (others.length && cmpKeys.includes(k) ? `<h2>Compare ${esc(n)}</h2><ul>${others.map((x) => `<li><a href="${pairUrl(k, x)}">${esc(n)} vs ${esc(guides[x].name)}</a></li>`).join("")}</ul>` : "")
      + (c.sources?.length ? `<h2>Sources</h2><ul>${srcList(c)}</ul>` : "") + `</main>`,
      [crumbs([["RealHunt", SITE + "/"], ["Guides", SITE + "/guide"], [n, `${SITE}/guide/${k}`]]), faqLd(qa)], { group: "content" });
  }

  const cstat = (k: string) => { const hs = homesOf(k); const pr = hs.map((h) => h.price_eur); return { k, name: guides[k].name, n: hs.length, med: median(pr), ppsqm: median(hs.filter((h) => h.sqm > 0).map((h) => h.price_eur / h.sqm)), min: Math.min(...pr), score: median(hs.map((h) => h.nota || 0)), top: hs.slice(0, 3) }; };
  const pairs: [string, string][] = [];
  for (let i = 0; i < cmpKeys.length; i++) for (let j = i + 1; j < cmpKeys.length; j++) pairs.push([cmpKeys[i], cmpKeys[j]].sort() as [string, string]);
  page(`${SITE}/countries`, "Compare countries for a cheap home abroad · RealHunt", `${pairs.length} side-by-side comparisons: home prices on RealHunt, price per m², buying costs, property tax and the rules for foreign buyers.`, DEF,
    `<main class="rh-static"><nav><a href="/">RealHunt</a> › Compare countries</nav><h1>Compare two countries for a cheap home</h1><p>Prices from the homes on RealHunt, side by side with the buying rules, taxes and costs on top of the price.</p>`
    + cmpKeys.map((a) => `<h2>${esc(guides[a].name)}</h2><ul>${cmpKeys.filter((b) => b !== a).map((b) => `<li><a href="${pairUrl(a, b)}">${esc(guides[a].name)} vs ${esc(guides[b].name)}</a></li>`).join("")}</ul>`).join("") + `</main>`,
    [crumbs([["RealHunt", SITE + "/"], ["Compare countries", SITE + "/countries"]])], { group: "content" });
  for (const [ka, kb] of pairs) {
    const A = cstat(ka), B = cstat(kb), da = dest[ka], db = dest[kb];
    const ch = A.ppsqm && B.ppsqm ? (A.ppsqm < B.ppsqm ? [A, B] : [B, A]) : null;
    const gap = ch ? Math.round((ch[1].ppsqm - ch[0].ppsqm) / ch[1].ppsqm * 100) : 0;
    const lead = ch ? (gap < 3 ? `On RealHunt, homes in ${the(A.name)} and ${B.name} cost about the same per m² (${eur(A.ppsqm)} and ${eur(B.ppsqm)}), with median prices of ${eur(A.med)} and ${eur(B.med)}.` : `On RealHunt, homes in ${the(ch[0].name)} cost a median ${eur(ch[0].ppsqm)} per m², ${gap}% less than in ${the(ch[1].name)} (${eur(ch[1].ppsqm)} per m²).`)
      + (da.purchase_costs_pct && db.purchase_costs_pct ? ` Buying costs start at about ${String(da.purchase_costs_pct).split(/[-–]/)[0]}% in ${the(A.name)} and ${String(db.purchase_costs_pct).split(/[-–]/)[0]}% in ${the(B.name)}.` : "") : "";
    const tr = (l: string, a: string, b: string) => `<tr><th scope="row">${esc(l)}</th><td>${esc(a)}</td><td>${esc(b)}</td></tr>`;
    page(`${SITE}${pairUrl(ka, kb)}`, `${A.name} vs ${B.name}: cheap homes, prices and buying costs compared · RealHunt`, (lead || `${A.name} and ${B.name} side by side: home prices, buying costs, taxes and rules for foreign buyers.`).slice(0, 300), DEF,
      `<main class="rh-static"><nav><a href="/">RealHunt</a> › <a href="/countries">Compare countries</a></nav><h1>${esc(A.name)} vs ${esc(B.name)}: where is a cheap home better value?</h1>${lead ? `<p>${esc(lead)}</p>` : ""}`
      + `<div style="overflow-x:auto"><table><thead><tr><th></th><th>${esc(A.name)}</th><th>${esc(B.name)}</th></tr></thead><tbody>`
      + tr("Homes on RealHunt", String(A.n), String(B.n)) + tr("Median price", eur(A.med), eur(B.med)) + tr("Median price per m²", A.ppsqm ? eur(A.ppsqm) : "n/a", B.ppsqm ? eur(B.ppsqm) : "n/a")
      + tr("Cheapest home", eur(A.min), eur(B.min)) + tr("Median score", String(A.score), String(B.score))
      + tr("Costs on top of the price", da.purchase_costs_pct ? `${da.purchase_costs_pct}%` : "n/a", db.purchase_costs_pct ? `${db.purchase_costs_pct}%` : "n/a")
      + tr("Can foreigners buy?", da.can_foreigners_buy || "n/a", db.can_foreigners_buy || "n/a") + tr("Yearly property tax", da.annual_property_tax || "n/a", db.annual_property_tax || "n/a")
      + tr("Tax on rental income", da.rental_income_tax || "n/a", db.rental_income_tax || "n/a") + `</tbody></table></div>`
      + `<p>Prices describe the homes on RealHunt, each checked by a person, not every home in each country. Rules and taxes: general information, not legal or tax advice.</p>`
      + [A, B].map((c) => `<h2>Best homes in ${esc(the(c.name))}</h2><ol>${c.top.map(homeLi).join("")}</ol><p><a href="/homes/${c.k}">All ${c.n} homes in ${esc(the(c.name))}</a> · <a href="/guide/${c.k}">How to buy in ${esc(the(c.name))}</a> · <a href="/costs/${c.k}">Costs and sources</a></p>`).join("")
      + `</main>`,
      [crumbs([["RealHunt", SITE + "/"], ["Compare countries", SITE + "/countries"], [`${A.name} vs ${B.name}`, `${SITE}${pairUrl(ka, kb)}`]])], { group: "content" });
  }
  // ---------- Can I buy there? /can-i-buy and /can-i-buy/<nationality>-in-<country> (src/community/seo2.tsx) ----------
  // Rules: src/data/canbuy.json; costs and taxes: destinations.json; steps: guides.json. Logic shared in seo2data.ts.
  const cb: CanBuyData = readJson("src/data/canbuy.json", { nationalities: {}, countries: {}, eu: [], schengen: [], _meta: {} });
  const upd = es ? UPDATED_ES : UPDATED;
  const cbCountries = canBuyCountries(cb, dest, guides);
  const cbPairs = canBuyPairs(cb, dest, guides);
  const pill = (st: string) => `<strong>${esc(statusLabel(st as "yes", lg))}</strong>`;
  const buyersOf = (nv: { label: string; adj_pl?: string }) => (es ? `Compradores ${nv.adj_pl || nv.label.toLowerCase()}` : `${nv.label} buyers`);
  const cbTrail: [string, string][] = [["RealHunt", SITE + "/"], ["Can I buy there?", SITE + "/can-i-buy"]];
  if (cbPairs.length) {
    page(`${SITE}/can-i-buy`, `Can I buy property abroad? Rules by nationality for ${cbCountries.length} countries (${upd}) · RealHunt`,
      "Can Americans, British, Canadians, Australians and Europeans buy a home in Spain, Italy, Denmark, Switzerland, Mexico and more? The short answer for each nationality, with costs and taxes.", DEF,
      `<main class="rh-static">${navHtml(cbTrail)}<h1>Can I buy property there? Rules by nationality</h1><p>Whether you can buy a home, on what conditions, and what it costs on top of the price, for ${Object.keys(cb.nationalities).length} nationalities in ${cbCountries.length} countries. General information, not legal advice. Updated ${upd}.</p>`
      + Object.entries(cb.nationalities).map(([nk, nv]) => `<h2>${esc(buyersOf(nv))}</h2><ul>${cbCountries.filter((c) => nv.home !== c).map((c) => { const r = ruleFor(cb, nk, c)!; return `<li><a href="/can-i-buy/${canBuySlug(nk, c)}">Can ${esc(nv.noun)} buy property in ${esc(the(guides[c].name))}?</a> ${pill(r.s)}</li>`; }).join("")}</ul>`).join("")
      + `<p><a href="/buying-costs">Buying-cost calculator</a> · <a href="/guide">Buying guides by country</a> · <a href="/countries">Compare two countries</a></p></main>`,
      [crumbs(cbTrail)], { group: "content" });
  }
  for (const { nat, country, slug } of cbPairs) {
    const nv = cb.nationalities[nat]; const r = ruleFor(cb, nat, country)!; const name = guides[country].name; const d = dest[country] || {}; const g = guides[country];
    const url = `${SITE}/can-i-buy/${slug}`;
    const m = canBuyMeta(cb, nat, country, name, lg);
    const hs = homesOf(country);
    const faq = canBuyFaq(cb, nat, country, { dest: d, guide: g, name, homes: hs }, lg);
    const ex = costLines(150000, d, "EUR", lg);
    const res = residencyFor(cb, nat, country, name, lg);
    const trail: [string, string][] = [...cbTrail, [es ? `${buyersOf(nv)} en ${the(name)}` : `${nv.label} buyers in ${name}`, url]];
    const top = hs.slice(0, 6);
    page(url, m.title, m.desc, top[0] ? homeImg(top[0]) : DEF,
      `<main class="rh-static"><article>${navHtml(trail)}<h1>${esc(m.h1)}</h1>`
      + `<p>Short answer: ${pill(r.s)}.</p><p>${esc(fill(r.a, nv))}</p><p>General information, not legal advice. Updated ${upd}.</p>`
      + (ex ? `<h2>What it costs to buy</h2><p>About ${esc(d.purchase_costs_pct)}% on top of the price. On a €150,000 home that is ${esc(ex.fees)}, so ${esc(ex.total)} in total.</p>${d.purchase_costs_breakdown ? `<p>${esc(d.purchase_costs_breakdown)}</p>` : ""}<p><a href="/buying-costs/${country}">Work it out for your price</a></p>` : "")
      + `<h2>Every year</h2>${d.annual_property_tax ? `<p>Yearly property tax: ${esc(d.annual_property_tax)}</p>` : ""}${g.yearly ? `<p>${esc(g.yearly)}</p>` : ""}${d.rental_income_tax ? `<p>Tax on rental income: ${esc(d.rental_income_tax)}</p>` : ""}`
      + (res.length ? `<h2>Living there</h2>${res.map((x) => `<p>${esc(x)}</p>`).join("")}` : "")
      + (nv.notes.length ? `<h2>Good to know as ${esc(es ? nv.adj || nv.noun : nv.noun)}</h2><ul>${nv.notes.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : "")
      + (g.steps?.length ? `<h2>The steps to buy in ${esc(the(name))}</h2><ol>${g.steps.map(([h]) => `<li>${esc(h)}</li>`).join("")}</ol><p><a href="/guide/${country}">The full guide, step by step</a></p>` : "")
      + (top.length ? `<h2>Best homes in ${esc(name)}</h2><ol>${top.map(homeLi).join("")}</ol>${hs.length > top.length ? `<p><a href="/homes/${country}">All ${hs.length} homes in ${esc(the(name))}</a></p>` : ""}` : "")
      + `<h2>Questions</h2>${faq.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join("")}`
      + `<p><a href="/guide/${country}">How to buy in ${esc(the(name))}</a> · <a href="/costs/${country}">Costs, taxes and sources</a></p>`
      + `<h2>Other nationalities in ${esc(name)}</h2><p>${Object.keys(cb.nationalities).filter((k) => k !== nat && cb.nationalities[k].home !== country).map((k) => `<a href="/can-i-buy/${canBuySlug(k, country)}">${esc(cb.nationalities[k].label)}</a>`).join(" · ")}</p>`
      + `<h2>${esc(buyersOf(nv))} ${es ? "en otros países" : "in other countries"}</h2><p>${cbCountries.filter((c) => c !== country && c !== nv.home).map((c) => `<a href="/can-i-buy/${canBuySlug(nat, c)}">${esc(guides[c].name)}</a>`).join(" · ")}</p>`
      + `</article></main>`,
      [crumbs(trail), faqLd(faq)], { group: "content", lastmod: "2026-11-07" });
  }

  // ---------- Free calculators: /tools/..., /buying-costs and /buying-costs/<country>, in both languages (seo/tools/) ----------
  try { const n = writeTools({ root, page, rows, today, image: DEF, record: !!es }); if (!es) console.log(`[rh-prerender-pages] tools: ${n.pages} pages, ${n.embeds} iframe pages`); } catch (e) { console.warn("[rh-prerender-pages] tools failed", e); }

  page(`${SITE}/research/new-builds`, "State of cheap new builds · RealHunt monthly report", "Every month: how many new-build homes under €100,000 we track, the cheapest countries and median prices. Free to quote with a link.", DEF, undefined, undefined, { group: "content" });
  page(`${SITE}/agents`, "RealHunt Agents · Earn from buyers you bring", "Local agents introduce buyers to new-build developers on RealHunt and earn 30% of RealHunt's fee when they buy.", DEF);
  page(`${SITE}/network/example`, "Example listing · RealHunt Network", "See how a new-build project looks on RealHunt and what the developer receives: qualified buyers, chat, rank and a 30-second video.", DEF);
  page(`${SITE}/network/reservation-contract`, "Free reservation contract template · RealHunt Network", "A plain-English reservation agreement for new-build units. Fill it in and print it; have a local lawyer check it.", DEF);

  // ---------- Pages built to be quoted and linked: data hub, press, method document, embeds, for AI (seo/assets.ts) ----------
  if (!es) try { writeAssets({ root, page, rows, dest, guides, cb, today, image: DEF }); } catch (e) { console.warn("[rh-prerender-pages] linkable pages failed", e); }
  // ---------- Glossaries, guides by subject and questions with sources (seo/knowledge) ----------
  if (!es) try { console.log(`[rh-prerender-pages] knowledge pages: ${writeKnowledge({ root, page, rows, dest, guides, cb, today, image: DEF })}`); } catch (e) { console.warn("[rh-prerender-pages] knowledge pages failed", e); }

  // ---------- Directories, country facts, open data files and search by address (seo/reach) ----------
  if (!es) try { console.log("[rh-prerender-pages] reach:", JSON.stringify(writeReach({ root, page, rows, dest, guides, today, image: DEF }))); } catch (e) { console.warn("[rh-prerender-pages] reach pages failed", e); }

  // ---------- HTML sitemap (/sitemap) and llms.txt, from the pages generated above ----------
  const label = (u: string) => decodeURIComponent(u.replace(SITE, "") || "/");
  const groupNames: Record<string, string> = { pages: "Main pages", places: "Countries, regions and prices", content: "Guides, costs and research", top: "New builds: Top 100", homes: "Homes" };
  const byGroup = (g: string) => entries.filter((e) => e.group === g);
  page(`${SITE}/sitemap`, "Site map · RealHunt", "Every page on RealHunt: countries, regions, price lists, guides, cost pages, rankings and homes.", DEF,
    `<main class="rh-static" data-rh-keep data-rh-static>${navHtml([["RealHunt", SITE + "/"], ["Site map", SITE + "/sitemap"]])}<h1>Site map</h1>`
    + ["pages", "places", "content", "top", "homes"].map((g) => `<h2>${esc(groupNames[g])} (${byGroup(g).length})</h2><ul>${byGroup(g).map((e) => `<li><a href="${esc(label(e.url))}">${esc(label(e.url))}</a></li>`).join("")}</ul>`).join("")
    + `</main>`, undefined, { group: "pages" });
  out(path.join(root, "llms.txt"), `# RealHunt\n\n> RealHunt lists cheap homes for sale around the world (mostly under €100,000), each checked by a person and graded from 70 to 98 against every other home on the site. It is not an estate agent: every home links to its original listing.\n\nToday: ${rows.length} homes in ${countryLinks.length} countries. Updated ${today}.\n\n## Key pages\n\n- [Best homes](${SITE}/): all homes, best score first, with filters.\n- [How the score works](${SITE}/method): the 11 sub-scores and what the grade means.\n- [New homes](${SITE}/new) and [RSS](${SITE}/feed.xml)\n- [Prices by country](${SITE}/research/prices): median price and price per m² by country.\n- [Buying costs abroad](${SITE}/costs)\n- [Buying guides by country](${SITE}/guide)\n- [Can I buy there? Rules by nationality](${SITE}/can-i-buy)\n- [Buying-cost calculator](${SITE}/buying-costs)\n- [Compare two countries](${SITE}/countries)\n- [New builds Top 100](${SITE}/top): Bali, Phuket, Tulum, Batumi, Koh Samui.\n- [Research and guides](${SITE}/blog) and [RSS](${SITE}/blog/rss.xml)\n- [Site map](${SITE}/sitemap)\n- [Full reference text](${SITE}/llms-full.txt): method, costs, guides and every home in one file.\n\n## Countries\n\n${countryLinks.map(([k, v]) => `- [${v.name}](${SITE}/homes/${k}): ${v.homes.length} homes`).join("\n")}\n`);

  // llms-full.txt: the reference content of the pages above as one text file for AI assistants (seo/llmsFull.ts)
  if (!es) try { console.log(`[rh-prerender-pages] llms-full.txt: ${writeLlmsFull(root, entries, rows, today)} pages`); } catch (e) { console.warn("[rh-prerender-pages] llms-full.txt failed", e); }

  // build.json: which commit is live and when it was built (check with curl https://realhunt.co/build.json).
  out(path.join(root, "build.json"), JSON.stringify({ commit: (process.env.RH_COMMIT || process.env.GITHUB_SHA || "local").slice(0, 7), built_at: new Date().toISOString(), homes: rows.length, indexable_pages: entries.length }) + "\n");

  if (es) return;
  // ---------- Spanish twins (/es/...): the same run in Spanish, then the pages that are fully Spanish are written,
  // linked with hreflang in both versions and listed in sitemap-es.xml (seo/es.ts) ----------
  let twins: Twin[] = [];
  try {
    const pass = createEsPass();
    build(root, pass);
    const rep = writeEsTwins(root, pass, (r) => renderHtml(html, r), altOf);
    twins = rep.twins;
    const sum = coverageSummary(rep);
    fs.writeFileSync(path.join(root, "es-coverage.json"), JSON.stringify(sum, null, 1) + "\n");
    console.log(`[rh-prerender-pages] Spanish: ${twins.length} twins written by seo/es.ts + ${rep.byHand?.pages || 0} written by hand above (${rep.byHand?.failed.length || 0} of those with English left) + ${rep.thin || 0} noindex copies; ${rep.failed.length} pages not fully Spanish, left out. Twins by group: ` + Object.entries(sum.groups).map(([g, v]) => `${g} ${v.twins}/${v.pages}`).join(", "));
  } catch (e) { console.warn("[rh-prerender-pages] Spanish pages skipped:", (e as Error).message); twins = []; }
  try { console.log("[rh-prerender-pages] linkable pages:", JSON.stringify(finishAssets(root, today))); } catch (e) { console.warn("[rh-prerender-pages] linkable pages (finish) failed", e); }
  try { console.log("[rh-prerender-pages] knowledge:", JSON.stringify(finishKnowledge(root))); } catch (e) { console.warn("[rh-prerender-pages] knowledge (finish) failed", e); }
  try { console.log("[rh-prerender-pages] reach:", JSON.stringify(finishReach(root, rows, today))); } catch (e) { console.warn("[rh-prerender-pages] reach (finish) failed", e); }
  for (const t of twins) altOf.set(t.en, t.es);
  // Older listing addresses that no longer have a page of their own, and dist/redirects.json (seo/listings/build.ts)
  try { const m = finishListings(root, plan, (r) => renderHtml(html, r as PageRec), (u) => altOf.has(u)); console.log(`[rh-prerender-pages] listings: ${plan.live.size} pages, ${m.redirects} redirects, ${m.moved} moved-page files`); } catch (e) { console.warn("[rh-prerender-pages] listing redirects skipped:", (e as Error).message); }
  writeSitemaps(root, entries, twins, altOf);
  console.log(`[rh-prerender-pages] ${entries.length} indexable pages in the sitemap`);
}

// The sitemap is an index of parts, so Search Console shows indexing per type of page. Pages with a Spanish twin
// carry their alternates (xhtml:link) in both the English part and sitemap-es.xml, which lists the /es/ URLs.
function writeSitemaps(root: string, entries: Entry[], twins: Twin[] = [], altOf = new Map<string, string>()) {
  const enOf = new Map([...altOf].map(([en, es]) => [es, en]));
  const alts = (u: string) => { const en = enOf.get(u) || u, es = altOf.get(en); return es ? `<xhtml:link rel="alternate" hreflang="en" href="${esc(en)}"/><xhtml:link rel="alternate" hreflang="es" href="${esc(es)}"/><xhtml:link rel="alternate" hreflang="x-default" href="${esc(en)}"/>` : ""; };
  const groups = new Map<string, Entry[]>();
  for (const e of entries) { if (!groups.has(e.group)) groups.set(e.group, []); groups.get(e.group)!.push(e); }
  // sitemap-es.xml: the Spanish pages written by hand above plus the twins of seo/es.ts
  if (twins.length) groups.set("es", [...(groups.get("es") || []), ...twins.map((t) => ({ url: t.es, lastmod: t.lastmod, group: "es", images: t.images }))]);
  const parts: string[] = [];
  for (const [g, list] of groups) {
    const name = `sitemap-${g}.xml`;
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${list.some((e) => e.images?.length) ? ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"' : ""}${list.some((e) => alts(e.url)) ? ' xmlns:xhtml="http://www.w3.org/1999/xhtml"' : ""}>\n`
      + list.map((e) => `  <url><loc>${esc(e.url)}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ""}${alts(e.url)}${(e.images || []).map((i) => `<image:image><image:loc>${esc(i)}</image:loc></image:image>`).join("")}</url>\n`).join("") + "</urlset>\n";
    fs.writeFileSync(path.join(root, name), xml);
    const last = list.map((e) => e.lastmod).filter(Boolean).sort().pop();
    parts.push(`  <sitemap><loc>${SITE}/${name}</loc>${last ? `<lastmod>${last}</lastmod>` : ""}</sitemap>\n`);
  }
  fs.writeFileSync(path.join(root, "sitemap.xml"), '<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + parts.join("") + "</sitemapindex>\n");
}
