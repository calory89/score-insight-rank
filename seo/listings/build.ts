// Listing pages: /homes/<country>[/<budget | region | setting | type | bedrooms>[/<town | budget>]] and
// /cheap-houses[/<search>] (14-nov-2026). Called by seo/prerender.ts in its English run and again in its Spanish
// run; seo/listings/facets.ts decides which pages exist, facts.ts what is true about each, pack.<lang>.ts how to
// say it and page.ts the HTML. Before this file the family came from two generators (the loops in prerender.ts and
// scripts/search_pages.py) with different rules, no shared template and no Spanish for /cheap-houses.
//
// The pages are the page: the app shows this same HTML (src/community/listingRoute.tsx), so what a crawler reads,
// what paints first and what the visitor sees after the app loads are the same homes in the same order.
import fs from "fs";
import path from "path";
import { localizeRows, costCountries } from "../../src/community/seo2data";
import { buildFacets, nearestLive, countrySlug, type Facet, type Home } from "./facets";
import { factsFor, dayOf, type Ctx } from "./facts";
import { compose, renderBody, renderLd, pagerHtml, SITE, WAIT, CARDS, type Site, type Text } from "./page";
import { siteCounts, type SiteCounts } from "./counts";
import { median } from "./facts";
import { thumb, cardSrcSet, CARD_SIZES } from "../../src/lib/thumbs";
import { toMedia } from "../../src/lib/media";
import type { Pack, Lang } from "./pack";
import { isNewLang, destFor } from "./packkit";
import { en } from "./pack.en";
import { es } from "./pack.es";
import { loadFx } from "./fx";
import { season } from "./traits";
import { notesFor } from "./notes";

export type PageFn = (url: string, title: string, desc: string, image: string, body?: string, ld?: object[], o?: Record<string, any>) => void;
const read = (f: string, d: any = {}) => { const p = path.resolve(process.cwd(), f); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : d; };
const minify = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ").replace(/\s*([{}:;,>])\s*/g, "$1").replace(/;}/g, "}").trim();
let cssCache = "";
export const listingCss = () => (cssCache ||= minify(fs.readFileSync(path.resolve(process.cwd(), "seo/listings/listing.css"), "utf8")));

/** The plan for this build: pages, redirects and the lookups the rest of the prerender needs to link only to pages
 * that exist. */
export function listingPlan(rows: Home[]) {
  const plan = buildFacets(rows);
  const live = new Set(plan.pages.filter((p) => !p.thin).map((p) => p.path));
  return {
    ...plan, live,
    /** The tightest budget page of a country that holds this price, or "". */
    bandFor(cc: string, price: number): { cap: number; path: string } | null {
      const b = plan.pages.filter((p) => p.kind === "band" && p.cc === cc && p.cap! >= price).sort((a, c) => a.cap! - c.cap!)[0];
      return b ? { cap: b.cap!, path: b.path } : null;
    },
  };
}
export type ListingPlan = ReturnType<typeof listingPlan>;
/** The homes as they are in the snapshot (English texts and their Spanish side by side), whatever run this is. */
// 15-nov-2026: a home whose original advert is no longer online (same rule as isGone() in src/community/n9/status.ts:
// at least one "sold" report and more of them than "still available" reports) keeps its own page with a notice,
// but is not offered on listing pages, their counts or their lowest prices.
const advertGone = (r: any): boolean => { const sold = Number(r?.sold_reports) || 0; return sold >= 1 && sold > (Number(r?.available_reports) || 0); };
// 26-nov-2026 (idea 93): a home with no photo is not offered on a listing page (a card with a hole helps nobody); it
// keeps its own page.
const hasPhoto = (r: any) => Array.isArray(r?.image_urls) && typeof r.image_urls[0] === "string" && r.image_urls[0].trim().length > 0;
export const listingRows = (): Home[] => (read("public/data/rh-static.json", { rows: [] }).rows || []).filter((r: Home) => r?.slug && !advertGone(r) && hasPhoto(r));
/** The count of the whole site (seo/listings/counts.ts): every home of the snapshot, like llms.txt and the home page. */
export const siteCountsNow = (): SiteCounts => siteCounts(read("public/data/rh-static.json", { rows: [] }).rows || []);
const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

type World = { ctx: Ctx; site: Site; colors: Record<string, string> };
function world(plan: ListingPlan, rows: Home[], lang: Lang): World {
  const snap = read("public/data/rh-static.json", {});
  let dest: Record<string, any> = read("src/data/destinations.json");
  if (lang === "es") dest = localizeRows(dest, read("src/data/destinations-es.json"));
  // German, Russian, French, Dutch, Polish: only the texts translated for that language (seo/listings/dest.<lang>.json)
  if (isNewLang(lang)) dest = destFor(dest, lang);
  const guides: Record<string, { name: string }> = read("src/data/guides.json");
  const byCountry = new Map<string, Home[]>();
  for (const r of rows) { const cc = countrySlug(r.country); if (cc) (byCountry.get(cc) || byCountry.set(cc, []).get(cc)!).push(r); }
  const days = rows.map((r) => dayOf(r.approved_at) || dayOf(r.publish_at)).filter(Boolean).sort();
  const updated = dayOf(snap.generated) || days[days.length - 1] || new Date().toISOString().slice(0, 10);
  const rules: Record<string, Record<string, { s?: string }>> = read("src/data/buyrules.json");
  const restricted = (cc: string) => ["eu", "uk", "na", "other"].some((g) => { const s = rules[cc]?.[g]?.s; return !!s && s !== "green"; });
  const calc = new Set(costCountries(read("src/data/destinations.json"), guides));
  const names: Record<string, string> = { bali: "Bali", lombok: "Lombok", albania: "Albania", mexico: "Mexico", spain: "Spain", montenegro: "Montenegro", georgia: "Georgia", "northern-cyprus": "Northern Cyprus", vietnam: "Vietnam", italy: "Italy", portugal: "Portugal", bulgaria: "Bulgaria" };
  const events = (read("seo/reach/removed-seed.json", { events: [] }).events || []).filter((e: any) => e && typeof e.date === "string" && typeof e.slug === "string");
  return {
    ctx: { all: rowsByScore(rows), byCountry, pages: plan.pages, dest, updated, fx: loadFx(), site: siteCounts(snap.rows || []), events },
    site: { pages: plan.pages, live: plan.live, hasGuide: (cc) => !!guides[cc], hasCalc: (cc) => calc.has(cc), hasCosts: (cc) => !!dest[cc] && !!(names[cc] || guides[cc]?.name), restricted, notes: isNewLang(lang) ? () => [] : notesFor,
      buyRule: (cc) => (rules[cc] && ["eu", "uk", "na", "other"].some((g) => rules[cc]?.[g]?.s) ? (restricted(cc) ? "limits" : "free") : null) },
    colors: read("src/data/card-colors.json"),
  };
}
const rowsByScore = (rows: Home[]) => rows.filter((r) => r?.slug && r.price_eur > 0).slice().sort((a, b) => (b.nota ?? 0) - (a.nota ?? 0) || (a.rank ?? 1e9) - (b.rank ?? 1e9) || String(a.slug).localeCompare(String(b.slug)));

/** The words of every page of the plan in one language (null where the language cannot name something). */
export function composeAll(plan: ListingPlan, rows: Home[], P: Pack): { W: World; texts: Map<string, Text | null> } {
  const W = world(plan, rows, P.lang);
  const texts = new Map<string, Text | null>();
  for (const f of plan.pages) texts.set(f.path, compose(factsFor(f, W.ctx), P, W.site));
  return { W, texts };
}

/** Writes the listing pages through the prerender's own `page` (so the sitemap, the Spanish pass and the title
 * pass treat them like any other page). `lang` is the run: "es" when called from the Spanish pass. */
export function listingPages(plan: ListingPlan, rows: Home[], page: PageFn, lang: "en" | "es"): number {
  const P = lang === "es" ? es : en;
  const { W, texts } = composeAll(plan, rows, P);
  const css = listingCss();
  let n = 0;
  for (const f of plan.pages) {
    const T = texts.get(f.path); if (!T) continue;
    const url = SITE + f.path;
    const pager = T.t2?.pager;
    page(url, T.title, T.desc, T.image, renderBody(T, P, { css, colors: W.colors, updated: W.ctx.updated }), renderLd(T, P, (p) => SITE + p),
      { noindex: !!f.thin, lastmod: T.lastmod, group: "places", images: T.cards.slice(0, 5).map(abs).filter(Boolean), ...(pager ? { head: `<link rel="next" href="${esc(SITE + pager.base)}/page/2" />` } : {}) });
    n++;
    // idea 66: the numbered pages of a big country, so every home of it has a link from a list
    if (pager) n += numberedPages(f, T, P, W, page, css, pager.of);
  }
  // idea 53: every country on one page
  if (P.t2) { const hubH = homesHub(plan, P, W, css); page(`${SITE}/homes`, hubH.title, hubH.desc, hubH.image, hubH.body, hubH.ld, { group: "places", lastmod: W.ctx.updated }); n++; }
  // The hub: every search, grouped, with its count.
  const hubT = hub(plan, P, W.ctx.updated);
  page(`${SITE}/cheap-houses`, hubT.title, hubT.desc, `${SITE}/og-home.jpg`, hubT.body(css), hubT.ld, { group: "places" });
  return n + 1;
}

function hub(plan: ListingPlan, P: Pack, updated: string) {
  const esL = P.lang === "es";
  const t = esL
    ? { h1: "Casas baratas en venta, por lo que buscas", title: "Casas baratas en venta por país, precio y tipo", lede: (n: number, c: number, s: number) => `${n} viviendas en ${c} países, repartidas en ${s} búsquedas: por presupuesto, junto al mar, de pueblo, con jardín o piscina y por país. Cada página lista viviendas reales con foto, precio, tamaño y nota.`, all: "En todos los países", by: "Por país", homes: "viviendas" }
    : { h1: "Cheap houses for sale, by what you are looking for", title: "Cheap houses for sale by country, price and type", lede: (n: number, c: number, s: number) => `${n} homes in ${c} countries, split into ${s} searches: by budget, by the sea, in villages, with a garden or a pool, and by country. Every page lists real homes with photo, price, size and score.`, all: "In every country", by: "By country", homes: "homes" };
  const global = plan.pages.filter((p) => !p.cc);
  const hubs = plan.pages.filter((p) => p.kind === "country" && !p.thin).sort((a, b) => b.homes.length - a.homes.length);
  const total = new Set(plan.pages.flatMap((p) => p.homes.map((h) => h.slug))).size;
  const a = (p: Facet, label = P.label(p)) => `<a class="ls-chip" href="${p.path}">${esc(label)} <small>${p.homes.length}</small></a>`;
  const country = (c: Facet) => {
    const order = ["band", "ccyBand", "setting", "area", "ptype", "beds", "bedsBand", "feature", "combo"];
    const kids = plan.pages.filter((p) => p.cc === c.cc && p !== c && !p.thin && order.includes(p.kind));
    kids.sort((x, y) => order.indexOf(x.kind) - order.indexOf(y.kind) || (x.cap || 0) - (y.cap || 0) || (x.beds || 0) - (y.beds || 0));
    return `<h3><a href="${c.path}">${esc(P.country(c.country!))}</a> · ${c.homes.length} ${t.homes}</h3><p>${kids.map((p) => a(p)).join(" ")}</p>`;
  };
  // idea 52: the count of the whole site, from the same rule as llms.txt and the home page
  const sc = siteCountsNow();
  const lede = t.lede(sc.homes || total, sc.countries || hubs.length, plan.pages.filter((p) => !p.thin).length);
  // what is in season: the families of the coming season, two months ahead (seo/listings/traits.ts)
  const sn = season(Number(updated.slice(5, 7)));
  const inSeason = sn ? sn.keys.map((k) => global.find((p) => p.kind === "gfeature" && p.key === k)).filter((p): p is Facet => !!p) : [];
  const chips = (label: string, list: Facet[]) => (list.length ? `<p><b>${esc(label)}</b> ${list.map((p) => a(p)).join(" ")}</p>` : "");
  return {
    title: t.title, desc: lede.slice(0, 300),
    body: (css: string) => `<main class="rh-static" data-rh-keep data-rh-static data-ls><nav class="ls-crumbs" aria-label="Breadcrumb"><a href="/">${P.crumbRoot}</a> › <span>${P.crumbCheap}</span></nav><style>${css}</style>${WAIT}<h1>${t.h1}</h1><p class="ls-lede">${lede}</p>`
      + (sn && inSeason.length ? `<h2>${esc(P.season.title)}</h2><div class="ls-more ls-season">${chips(P.season[sn.name], inSeason)}</div>` : "")
      + `<h2>${t.all}</h2><div class="ls-more">${chips(P.more.budget, global.filter((p) => p.kind === "gband"))}${chips(P.more.ccy, global.filter((p) => p.kind === "ccyBand"))}${chips(P.more.feature, global.filter((p) => p.kind === "gfeature" && !p.ranked))}`
      + `${chips(P.more.combo, global.filter((p) => p.kind === "combo"))}${chips(P.more.ranked, global.filter((p) => p.kind === "gfeature" && p.ranked))}${chips(P.more.near, global.filter((p) => p.kind === "near"))}</div>`
      + `<h2>${t.by}</h2><div class="ls-more">${hubs.map(country).join("")}</div></main>`,
    ld: [{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: P.crumbRoot, item: SITE + "/" }, { "@type": "ListItem", position: 2, name: P.crumbCheap, item: SITE + "/cheap-houses" }] }] as object[],
  };
}

const abs = (h: Home) => (h.image_urls?.[0] ? (String(h.image_urls[0]).startsWith("http") ? String(h.image_urls[0]) : SITE + h.image_urls[0]) : "");

/** Pages 2.. of a country page: the next CARDS homes by score each, with the same cards and links back. */
function numberedPages(f: Facet, T: Text, P: Pack, W: World, page: PageFn, css: string, of: number): number {
  const W2 = P.t2!; let n = 0;
  for (let i = 2; i <= of; i++) {
    const homes = f.homes.slice((i - 1) * CARDS, i * CARDS); if (!homes.length) break;
    const path = `${f.path}/page/${i}`;
    // the page's own cards, through the same renderer: a Text that only has the crumbs, the title and the cards
    const P2: Text = { ...T, path, h1: W2.pageH1(T.h1, i), crumbs: [...T.crumbs.slice(0, -1), [T.crumbs[T.crumbs.length - 1][0], f.path], [W2.page(i, of), path]],
      lede: [W2.pageLede((i - 1) * CARDS + 1, (i - 1) * CARDS + homes.length, f.homes.length)], kpi: [], chips: [], gridTitle: W2.pageH1(T.h1, i), gridMore: "", cards: homes, rows: [], costsTitle: "",
      facts: [], costs: [], costLinks: [], costNote: "", costTable: [], watch: [], faq: [], more: [], foot: [], footLinks: [[W2.pageFirst, f.path]], first: "", how: "", notes: [], regionTable: [], regionsTitle: "",
      t2: T.t2 ? { ...T.t2, top: [], order: "", money: "", towns: [], near: [], removed: "", sea: null, pager: null } : null };
    let body = renderBody(P2, P, { css, colors: W.colors, updated: W.ctx.updated });
    // a numbered page is a list of homes: no table, no costs, and its own pager instead of the first page's
    body = body.replace(/<h2 id="compare">[\s\S]*?<\/table><\/div>/, "").replace(/<p class="ls-upd">[\s\S]*?<\/p>/, "")
      .replace(/<\/ol>(<p class="ls-note">[^<]*<\/p>)?/, (m) => m + pagerHtml(W2, i, of, f.path, (x) => x));
    const head = `<link rel="prev" href="${esc(SITE + (i === 2 ? f.path : `${f.path}/page/${i - 1}`))}" />` + (i < of ? `<link rel="next" href="${esc(SITE + f.path)}/page/${i + 1}" />` : "");
    page(SITE + path, P.t2!.pageH1(T.title, i), `${W2.pageLede((i - 1) * CARDS + 1, (i - 1) * CARDS + homes.length, f.homes.length)} ${T.desc}`.slice(0, 300), abs(homes[0]) || T.image, body, renderLd(P2, P, (p) => SITE + p).filter((x: any) => x["@type"] !== "FAQPage"),
      { lastmod: T.lastmod, group: "places", head, images: homes.slice(0, 5).map(abs).filter(Boolean) });
    n++;
  }
  return n;
}

/** /homes: every country with homes, its photo, count, cheapest and median price and its guide (idea 53). */
function homesHub(plan: ListingPlan, P: Pack, W: World, css: string) {
  const H = P.t2!.hub; const sc = W.ctx.site || siteCountsNow();
  const list = plan.pages.filter((p) => p.kind === "country" && !p.thin).sort((a, b) => b.homes.length - a.homes.length || a.path.localeCompare(b.path));
  const date = P.date(W.ctx.updated);
  const card = (c: Facet, i: number) => {
    const h = c.homes.find((x) => x.image_urls?.[0]);
    const full = h ? toMedia(String(h.image_urls[0])) : ""; const small = full ? thumb(full) : ""; const set = full ? cardSrcSet(full) : undefined;
    const name = P.country(String(c.country));
    const prices = c.homes.map((x) => x.price_eur);
    const img = full ? `<img src="${esc(small)}"${set ? ` srcset="${esc(set)}" sizes="${esc(CARD_SIZES)}"` : ""} alt="${esc(`${P.homeTitle(h!) || ""}, ${name}`)}" width="480" height="360" ${i === 0 ? 'fetchpriority="high"' : i < 3 ? "" : 'loading="lazy"'} decoding="async" />` : "";
    return `<li><a class="ls-card" href="${esc(c.path)}"><span class="ls-ph"${h && W.colors[h.slug] ? ` style="background:${esc(W.colors[h.slug])}"` : ""}>${img}</span><span class="ls-b"><h3 class="ls-t">${esc(name)}</h3>`
      + `<small>${c.homes.length} · ${esc(P.kpi.from)} ${esc(P.money(Math.min(...prices)))} · ${esc(P.kpi.median)} ${esc(P.money(median(prices)))}</small></span></a></li>`;
  };
  const guides: Record<string, unknown> = read("src/data/guides.json");
  const rows = list.map((c) => { const prices = c.homes.map((x) => x.price_eur);
    return `<tr><th scope="row"><a href="${esc(c.path)}">${esc(P.country(String(c.country)))}</a></th><td class="ls-n">${c.homes.length}</td><td class="ls-n">${esc(P.money(Math.min(...prices)))}</td><td class="ls-n">${esc(P.money(median(prices)))}</td><td>${guides[c.cc!] ? `<a href="/guide/${esc(c.cc)}">${esc(H.guide)}</a>` : "·"}</td></tr>`; }).join("");
  const body = `<main class="rh-static" data-rh-keep data-rh-static data-ls><nav class="ls-crumbs" aria-label="Breadcrumb"><a href="/">${esc(P.crumbRoot)}</a> › <span>${esc(H.crumb)}</span></nav><style>${css}</style>${WAIT}`
    + `<h1>${esc(H.h1)}</h1><p class="ls-lede">${esc(H.lede(sc.homes, sc.countries, date))}</p>`
    + `<ol class="ls-grid ls-hub" id="homes">${list.map(card).join("")}</ol>`
    + `<h2 id="compare">${esc(H.title(sc.homes, sc.countries))}</h2><div class="ls-tw" tabindex="0" role="region" aria-label="${esc(H.h1)}"><table><thead><tr><th scope="col">${esc(H.th.country)}</th><th scope="col" class="ls-n">${esc(H.th.homes)}</th><th scope="col" class="ls-n">${esc(H.th.from)}</th><th scope="col" class="ls-n">${esc(H.th.median)}</th><th scope="col">${esc(H.th.guide)}</th></tr></thead><tbody>${rows}</tbody></table></div>`
    + `<p class="ls-foot">${esc(P.notAgent)}</p><p class="ls-links"><a href="/cheap-houses">${esc(P.more.all)}</a> · <a href="/method">${esc(P.method)}</a></p></main>`;
  const first = list.map((c) => c.homes.find((x) => x.image_urls?.[0])).find(Boolean);
  return {
    title: H.title(sc.homes, sc.countries), desc: H.desc(sc.homes, sc.countries), image: first ? abs(first) : `${SITE}/og-home.jpg`, body,
    ld: [{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: P.crumbRoot, item: SITE + "/" }, { "@type": "ListItem", position: 2, name: H.crumb, item: SITE + "/homes" }] },
      { "@context": "https://schema.org", "@type": "ItemList", name: H.h1, numberOfItems: list.length, itemListElement: list.map((c, i) => ({ "@type": "ListItem", position: i + 1, url: SITE + c.path, name: P.country(String(c.country)) })) }] as object[],
  };
}

// ------------------------------------------------------------------------------------------------ after the twins
export type Render = (r: { url: string; title: string; desc: string; image: string; body?: string; ld?: object[]; o: Record<string, any> }) => string;

/** Addresses that used to be listing pages and are not generated today: seo/listings/known-urls.json remembers every
 * address ever published (seo/listings/record.ts adds to it in the daily data job). */
export function movedAddresses(plan: ListingPlan): Record<string, string> {
  const known: string[] = read("seo/listings/known-urls.json", { urls: [] }).urls || [];
  const all = new Set([...plan.pages.map((p) => p.path), "/cheap-houses"]);
  const out: Record<string, string> = {};
  for (const u of known) if (!all.has(u)) { const to = nearestLive(u, all, plan.redirects); if (to !== u) out[u] = to; }
  return out;
}

/** After the Spanish twins are on disk: the pages that redirect from older addresses (English, and Spanish when the
 * target has a Spanish page) and dist/redirects.json for the worker. */
export function finishListings(root: string, plan: ListingPlan, render: Render, hasEs: (enUrl: string) => boolean): { moved: number; redirects: number } {
  const moved = movedAddresses(plan);
  const redirects: Record<string, string> = { ...plan.redirects, ...moved };
  let n = 0;
  const write = (from: string, to: string, P: Pack, prefix: string) => {
    const dir = path.join(root, (prefix + from).replace(/^\//, ""));
    if (fs.existsSync(path.join(dir, "index.html"))) return; // a real page lives here
    const target = SITE + prefix + to;
    let h = render({ url: target, title: `${P.moved} · RealHunt`, desc: P.moved, image: `${SITE}/og-home.jpg`,
      body: `<main class="rh-static" data-rh-moved="${prefix + to}"><p>${P.moved} <a href="${prefix + to}">${target.replace("https://", "")}</a></p></main>`,
      o: { noindex: true, head: `<meta http-equiv="refresh" content="0;url=${prefix + to}" />`, lang: P.lang === "es" ? "es" : undefined } });
    // the canonical is the page it moved to and the file is noindex: nothing on it is for search engines
    h = h.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, "");
    fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, "index.html"), h); n++;
  };
  for (const [from, to] of Object.entries(moved)) {
    write(from, to, en, "");
    if (hasEs(SITE + to)) write(from, to, es, "/es");
  }
  // dist/redirects.json: every address of this family that should answer 301. Merged with what another step wrote.
  const file = path.join(root, "redirects.json");
  let prev: Record<string, string> = {};
  try { if (fs.existsSync(file)) prev = JSON.parse(fs.readFileSync(file, "utf8")); } catch { prev = {}; }
  const merged: Record<string, string> = { ...prev };
  for (const [from, to] of Object.entries(redirects)) { merged[from] = to; if (hasEs(SITE + to)) merged["/es" + from] = "/es" + to; }
  fs.writeFileSync(file, JSON.stringify(merged, null, 1) + "\n");
  return { moved: n, redirects: Object.keys(redirects).length };
}
