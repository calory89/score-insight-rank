// Internal links (14-nov-2026): the "related" block at the end of every prerendered page and the HTML site map.
//
// The block is plain HTML written into the page by seo/polish.ts, so crawlers read it, and the app shows the same
// HTML above its footer (src/community/related.tsx), so a visitor sees what a crawler sees. A page links only to
// indexable pages of its own language: an English page to English pages, a Spanish page to Spanish pages.
//
// What links where:
//  - a country page: its price lists, types, regions, guide, costs, calculator, "can I buy" pages, cheap-house searches
//    and comparisons; every other page of that country: a shorter version of the same rows
//  - a home: its country, region, price list, and 4 homes like it (same region or country, closest in price). The 4
//    are the next ones in a ring sorted by price, so every home is linked from 4 other homes
//  - guides, costs, calculators, comparisons, posts, portals: the next pages of their kind, in a ring too
//  - every page: the main sections and the site map
import type { Pg } from "./polish";
import type { Kind, Lang } from "./polishMeta";
import { slugify, locationParts } from "../src/community/regions";

export type RelCtx = {
  pages: Map<string, Pg>; get: (p: string) => Pg | undefined; live: (p: string) => boolean;
  nameOf: (cc: string, lang: Lang) => string; inThe: (cc: string, lang: Lang) => string;
  bySlug: Map<string, any>; slugCountry: (c: string) => string;
};
export type Link = { href: string; label: string };
export type Row = { title: string; list?: boolean; site?: boolean; links: Link[] };

export const STR = {
  en: {
    breadcrumb: "Breadcrumb", title: "Keep exploring", homesIn: "Homes in", allHomes: "All homes", regionsOf: "Regions of", inRegions: "Inside the regions", buyingIn: "Buying in",
    guide: "How to buy, step by step", costs: "Costs and taxes", calc: "Buying-cost calculator", cheapIn: "Cheap houses in", compare: "Compare countries",
    similar: "Similar homes", homesNow: "Homes for sale now in", countries: "Homes by country", otherCountries: "Other countries", sameSearch: "The same search in other countries", moreResearch: "More research",
    moreSources: "Other portals", otherDest: "Other destinations", newBuilds: "New builds", explore: "RealHunt", more: "More",
    siteMap: "Site map", smDesc: "Every page on RealHunt in one place: countries, regions, price lists, guides, cost pages, comparisons, research and homes.",
    smAll: (name: string, n: number) => `${name}: all ${n} pages`, smGroupTitle: (name: string) => `${name}: site map`,
    smGroupDesc: (name: string, n: number) => `The ${n} pages of RealHunt under "${name}", by country where that helps. Part of the site map, rebuilt every time the site is updated.`,
    smIntro: (n: number) => `${n} pages.`, other: "General",
    smByCountry: "By country", smCountryTitle: (inThe: string) => `Every page and home in ${inThe}`,
    smCountryDesc: (inThe: string, homes: number, pages: number) => `The ${homes} homes we list in ${inThe} and the ${pages} other pages about the country on RealHunt: lists by price and region, guides and costs. Part of the site map, rebuilt every time the site is updated.`,
    smCountryLink: (inThe: string, n: number) => `${inThe} (${n} pages)`,
  },
  es: {
    breadcrumb: "Ruta", title: "Sigue explorando", homesIn: "Casas en", allHomes: "Todas las casas", regionsOf: "Regiones de", inRegions: "Dentro de las regiones", buyingIn: "Comprar en",
    guide: "Cómo comprar, paso a paso", costs: "Gastos e impuestos", calc: "Calculadora de gastos de compra", cheapIn: "Casas baratas en", compare: "Comparar países",
    similar: "Casas parecidas", homesNow: "Casas en venta ahora en", countries: "Casas por país", otherCountries: "Otros países", sameSearch: "La misma búsqueda en otros países", moreResearch: "Más artículos",
    moreSources: "Otros portales", otherDest: "Otros destinos", newBuilds: "Obra nueva", explore: "RealHunt", more: "Más",
    siteMap: "Mapa del sitio", smDesc: "Todas las páginas de RealHunt en un solo lugar: países, regiones, listas por precio, guías, gastos, comparaciones, artículos y casas.",
    smAll: (name: string, n: number) => `${name}: las ${n} páginas`, smGroupTitle: (name: string) => `${name}: mapa del sitio`,
    smGroupDesc: (name: string, n: number) => `Las ${n} páginas de RealHunt de «${name}», por país cuando ayuda. Forma parte del mapa del sitio y se rehace cada vez que se actualiza la web.`,
    smIntro: (n: number) => `${n} páginas.`, other: "General",
    smByCountry: "Por país", smCountryTitle: (inThe: string) => `Todas las páginas y casas en ${inThe}`,
    smCountryDesc: (inThe: string, homes: number, pages: number) => `Las ${homes} casas que tenemos en ${inThe} y las otras ${pages} páginas de RealHunt sobre el país: listas por precio y región, guías y gastos. Forma parte del mapa del sitio y se rehace cada vez que se actualiza la web.`,
    smCountryLink: (inThe: string, n: number) => `${inThe} (${n} páginas)`,
  },
} as const;

// The main sections, linked from every page. [English path, English label, Spanish label]
const EXPLORE: [string, string, string][] = [
  ["/", "Best homes", "Las mejores casas"], ["/new", "New homes", "Casas nuevas"], ["/cheap-houses", "Cheap houses", "Casas baratas"],
  ["/what-100k-buys", "What €100,000 buys", "Qué se compra con 100.000 €"], ["/guide", "Buying guides", "Guías de compra"],
  ["/costs", "Real costs by country", "Costes reales por país"], ["/buying-costs", "Buying-cost calculator", "Calculadora de gastos de compra"], ["/tools", "Free calculators", "Calculadoras gratuitas"],
  ["/can-i-buy", "Can I buy there?", "¿Puedo comprar allí?"], ["/countries", "Compare countries", "Comparar países"],
  ["/blog", "Research", "Artículos y datos"], ["/top", "New builds Top 100", "Top 100 de obra nueva"], ["/method", "How the score works", "Cómo funciona la nota"],
  ["/sitemap", "Site map", "Mapa del sitio"],
];

// The pages a footer carries. The app's footer has them; the HTML a crawler reads has no footer, so the top-level
// pages (not every home and list) link to them here.
const MORE: [string, string, string][] = [
  ["/best", "Best homes by country", "Las mejores casas por país"], ["/map", "Map of homes", "Mapa de casas"], ["/price-drops", "Price drops", "Bajadas de precio"],
  ["/research/prices", "Prices by country", "Precios por país"], ["/alerts", "Email alerts", "Alertas por correo"], ["/find-my-home", "Home finder", "Te buscamos casa"],
  ["/weather", "Good weather all year", "Buen tiempo todo el año"], ["/new-builds", "New builds under €100,000", "Obra nueva por menos de 100.000 €"],
  ["/sources", "Where the homes come from", "De dónde vienen las casas"], ["/extension", "Chrome extension", "Extensión de Chrome"], ["/ecobeachcity", "Eco Beach City, Sumba", "Eco Beach City, Sumba"],
  ["/help-buying", "Help buying abroad", "Ayuda para comprar fuera"], ["/agents", "For agents", "Para agentes"], ["/network", "For developers", "Para promotores"],
  ["/network/reservation-contract", "Reservation contract template", "Modelo de contrato de reserva"], ["/about", "About RealHunt", "Sobre RealHunt"], ["/contact", "Contact", "Contacto"],
  ["/legal/terms", "Terms of use", "Condiciones de uso"], ["/legal/privacy", "Privacy", "Privacidad"], ["/legal/cookies", "Cookies", "Cookies"], ["/legal/takedown", "Takedown requests", "Retirada de anuncios"],
];

// ------------------------------------------------------------------------------------------ groups (site map, sitemaps)
export const GROUPS: { key: string; en: string; es: string }[] = [
  { key: "main", en: "Main pages", es: "Páginas principales" },
  { key: "countries", en: "Countries and regions", es: "Países y regiones" },
  { key: "prices", en: "Homes by price", es: "Casas por precio" },
  { key: "cheap-houses", en: "Cheap houses", es: "Casas baratas" },
  { key: "guides", en: "Buying guides", es: "Guías de compra" },
  { key: "costs", en: "Costs and taxes", es: "Gastos e impuestos" },
  { key: "blog", en: "Research", es: "Artículos y datos" },
  { key: "can-i-buy", en: "Can I buy there?", es: "¿Puedo comprar allí?" },
  { key: "compare", en: "Country comparisons", es: "Comparaciones de países" },
  { key: "homes", en: "Homes", es: "Casas" },
  { key: "new-builds", en: "New builds", es: "Obra nueva" },
  { key: "more", en: "More pages", es: "Más páginas" },
];
const BY_KIND: Partial<Record<Kind, string>> = { home: "main", deal: "homes", country: "countries", region: "countries", type: "countries", place: "countries", band: "prices", cheap: "cheap-houses", guide: "guides", costs: "costs", calc: "costs", blog: "blog", canbuy: "can-i-buy", pair: "compare", topdest: "new-builds", project: "new-builds", source: "more" };
const BY_FIRST: Record<string, string> = { "cheap-houses": "cheap-houses", guide: "guides", costs: "costs", "buying-costs": "costs", blog: "blog", research: "blog", "can-i-buy": "can-i-buy", countries: "compare", top: "new-builds", "new-builds": "new-builds", developers: "new-builds", sources: "more", sitemap: "more", extension: "more", agents: "more", network: "more", legal: "more", ecobeachcity: "more", homes: "countries" };
/** The group of a page: one sitemap file and one page of the HTML site map each. A page type added later lands in
 * "main" when it is a top-level page and in "more" otherwise, until it gets a line here. */
export function groupOf(pg: Pg): string {
  const first = pg.en.split("/")[1] || "";
  return BY_KIND[pg.kind] || BY_FIRST[first] || (pg.kind === "hub" ? "main" : "more");
}

// ------------------------------------------------------------------------------------------ indexes
type Index = { kind: Map<string, Pg[]>; ring: Map<string, Pg[]> };
const cache = new WeakMap<Map<string, Pg>, Index>();
const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
/** `n` items after position `i`, going round. */
const after = <T>(list: T[], i: number, n: number): T[] => { const out: T[] = []; for (let k = 1; k < list.length && out.length < n; k++) out.push(list[(i + k) % list.length]); return out; };
/** `n` items starting at a place that depends on `seed`, so the pages of a kind do not all link to the same few. */
const some = <T>(list: T[], n: number, seed: string): T[] => (list.length <= n ? list : after(list, hash(seed) % list.length, n));

function index(c: RelCtx): Index {
  const had = cache.get(c.pages); if (had) return had;
  const kind = new Map<string, Pg[]>();
  for (const pg of c.pages.values()) {
    if (!c.live(pg.path)) continue;
    for (const k of [`${pg.lang}:${pg.kind}`, `${pg.lang}:${pg.kind}:${pg.cc}`]) (kind.get(k) || kind.set(k, []).get(k)!).push(pg);
  }
  for (const l of kind.values()) l.sort((a, b) => a.path.localeCompare(b.path));
  // Homes like this one: a ring by price inside the region when it has 5 homes, else the rest of the country, else
  // the homes of small countries together. Every home links to the next 4, so every home has 4 homes linking to it.
  const ring = new Map<string, Pg[]>();
  for (const lang of ["en", "es"] as Lang[]) {
    const deals = kind.get(`${lang}:deal`) || [];
    const price = (p: Pg) => Number(c.bySlug.get(p.en.slice(6))?.price_eur) || 0;
    const key = (p: Pg, level: number) => { const r = c.bySlug.get(p.en.slice(6)); const loc = locationParts(r?.location_name).filter((x) => x.toLowerCase() !== String(r?.country || "").toLowerCase()); return level === 0 ? `${p.cc}/${loc[loc.length - 1] || ""}` : p.cc; };
    let rest = deals; const groups: Pg[][] = [];
    for (const level of [0, 1]) {
      const by = new Map<string, Pg[]>();
      for (const p of rest) { const k = key(p, level); (by.get(k) || by.set(k, []).get(k)!).push(p); }
      rest = [];
      for (const g of by.values()) { if (g.length >= 5) groups.push(g); else rest.push(...g); }
    }
    if (rest.length >= 5 || !groups.length) groups.push(rest); else groups.sort((a, b) => b.length - a.length)[0].push(...rest);
    for (const g of groups) { g.sort((a, b) => price(a) - price(b) || a.path.localeCompare(b.path)); g.forEach((p, i) => ring.set(p.path, after(g, i, 4))); }
  }
  const ix = { kind, ring }; cache.set(c.pages, ix); return ix;
}

// ------------------------------------------------------------------------------------------ rows of a page
export function relatedRows(pg: Pg, c: RelCtx): Row[] {
  const ix = index(c), lang = pg.lang, s = STR[lang];
  const pre = lang === "es" ? "/es" : "";
  const at = (en: string) => { const p = en === "/" ? pre || "/" : pre + en; return c.live(p) ? c.get(p)! : undefined; };
  const K = (kind: Kind, cc?: string) => ix.kind.get(cc === undefined ? `${lang}:${kind}` : `${lang}:${kind}:${cc}`) || [];
  const link = (p: Pg | undefined, label?: string): Link[] => (p && p.path !== pg.path ? [{ href: p.path, label: label || p.label }] : []);
  const rows: Row[] = [];
  const add = (title: string, links: Link[], list = false, site = false) => { const seen = new Set<string>(); const l = links.filter((x) => x.label && !seen.has(x.href) && !!seen.add(x.href)); if (l.length) rows.push({ title, links: l, list, site }); };
  const num = (p: Pg) => Number(/under-(\d+)$/.exec(p.en)?.[1] || 0);
  const buying = (cc: string, canbuy: number) => [
    ...link(at(`/guide/${cc}`), s.guide), ...link(at(`/costs/${cc}`), s.costs), ...link(at(`/buying-costs/${cc}`), s.calc),
    ...some(K("canbuy", cc).filter((p) => p.path !== pg.path), canbuy, pg.path).flatMap((p) => link(p)),
  ];
  const pairsOf = (cc: string) => K("pair").filter((p) => p.en.slice(11).split("-vs-").includes(cc) && p.path !== pg.path);

  const country = (cc: string, full: boolean) => {
    const where = c.inThe(cc, lang);
    add(`${s.homesIn} ${where}`, [...link(at(`/homes/${cc}`), s.allHomes), ...K("band", cc).slice().sort((a, b) => num(a) - num(b)).flatMap((p) => link(p)), ...K("type", cc).flatMap((p) => link(p))]);
    // inside a region: its towns and budgets (pages one level below it)
    const region = pg.kind === "region" ? pg : pg.kind === "place" ? c.get(pg.path.split("/").slice(0, -1).join("/")) : undefined;
    if (region && c.live(region.path)) add(region.label, [...link(region, s.allHomes), ...K("place", cc).filter((p) => p.path.startsWith(region.path + "/")).sort((a, b) => num(a) - num(b)).flatMap((p) => link(p))]);
    const regions = K("region", cc);
    const i = regions.indexOf(pg);
    add(`${s.regionsOf} ${where}`, (i >= 0 ? after(regions, i, 12) : full ? regions.slice(0, 30) : some(regions, 8, pg.path)).flatMap((p) => link(p)));
    // the country page also reaches the pages inside its regions (towns, a budget in a region), by their full name
    if (full) add(s.inRegions, K("place", cc).slice(0, 40).flatMap((p) => link(p, p.h1[0] || p.label)));
    add(`${s.buyingIn} ${where}`, buying(cc, full || pg.kind === "guide" || pg.kind === "costs" || pg.kind === "calc" ? 20 : 3));
    add(`${s.cheapIn} ${where}`, some(K("cheap", cc).filter((p) => p.path !== pg.path), full ? 12 : 4, pg.path).flatMap((p) => link(p)));
    add(s.compare, some(pairsOf(cc), full ? 8 : 3, pg.path).flatMap((p) => link(p)));
  };

  if (pg.kind === "deal") {
    const r = c.bySlug.get(pg.en.slice(6)); const cc = pg.cc;
    if (r && cc) {
      const loc = locationParts(r.location_name).filter((x: string) => x.toLowerCase() !== String(r.country || "").toLowerCase());
      const region = loc.length ? K("region", cc).find((p) => p.en.endsWith("/" + slugify(loc[loc.length - 1]))) : undefined;
      const band = K("band", cc).slice().sort((a, b) => num(a) - num(b)).find((p) => num(p) >= Number(r.price_eur));
      const type = K("type", cc).find((p) => TYPE_OF[p.en.split("/")[3]] === r.category);
      add(`${s.homesIn} ${c.inThe(cc, lang)}`, [...link(at(`/homes/${cc}`), s.allHomes), ...link(region), ...link(band), ...link(type)]);
    }
    add(s.similar, (ix.ring.get(pg.path) || []).flatMap((p) => link(p)), true);
    if (cc) add(`${s.buyingIn} ${c.inThe(cc, lang)}`, buying(cc, 2));
  } else if (pg.kind === "country") country(pg.cc, true);
  else if (pg.kind === "band" || pg.kind === "type" || pg.kind === "region" || pg.kind === "place" || pg.kind === "canbuy") country(pg.cc, false);
  else if (pg.kind === "guide" || pg.kind === "costs" || pg.kind === "calc") {
    country(pg.cc, false);
    // a guide also shows what is for sale today: the five best-scored homes of its country (idea 123)
    if (pg.kind === "guide") add(`${s.homesNow} ${c.inThe(pg.cc, lang)}`, K("deal", pg.cc).slice().sort((x, y) => (Number(c.bySlug.get(y.en.slice(6))?.nota) || 0) - (Number(c.bySlug.get(x.en.slice(6))?.nota) || 0) || x.path.localeCompare(y.path)).slice(0, 5).flatMap((p) => link(p)), true);
    const all = K(pg.kind); const i = all.indexOf(pg);
    add(s.otherCountries, after(all, Math.max(i, 0), 6).flatMap((p) => link(p, c.nameOf(p.cc, lang))));
  } else if (pg.kind === "pair") {
    const [a, b] = pg.en.slice(11).split("-vs-");
    for (const cc of [a, b]) add(`${s.buyingIn} ${c.inThe(cc, lang)}`, [...link(at(`/homes/${cc}`), `${s.homesIn} ${c.inThe(cc, lang)}`), ...buying(cc, 0)]);
    add(s.compare, some([...pairsOf(a), ...pairsOf(b)], 6, pg.path).flatMap((p) => link(p)));
  } else if (pg.kind === "cheap") {
    const theme = pg.en.slice(14).split("-in-")[0];
    if (pg.cc) country(pg.cc, false);
    const same = K("cheap").filter((p) => p.path !== pg.path && p.cc && p.cc !== pg.cc && p.en.slice(14).split("-in-")[0] === theme);
    add(s.sameSearch, some(same, 10, pg.path).flatMap((p) => link(p, c.nameOf(p.cc, lang))));
  } else if (pg.kind === "blog") {
    // a post links to lists that update themselves, so it does not age when its homes are sold (idea 124): the
    // countries it names (most homes first), or the main lists when it names none
    const body = (/<div id="root">([\s\S]*)<\/div>\s*<script/.exec(pg.html)?.[1] ?? pg.html).replace(/<(script|style)\b[\s\S]*?<\/\1>/g, " ").toLowerCase();
    const head = `${pg.title} ${pg.h1[0] || ""}`.toLowerCase();
    // the country in the headline first, then the others it names, most homes first
    const rank = (p: Pg) => (head.includes(c.nameOf(p.cc, lang).toLowerCase()) ? 100000 : 0) + K("deal", p.cc).length;
    const named = K("country").filter((p) => p.cc && body.includes(c.nameOf(p.cc, lang).toLowerCase())).sort((x, y) => rank(y) - rank(x) || x.path.localeCompare(y.path)).slice(0, 6);
    add(s.countries, named.length ? named.flatMap((p) => link(p, `${s.homesIn} ${c.inThe(p.cc, lang)}`)) : [...link(at("/cheap-houses")), ...link(at("/new")), ...link(at("/price-drops"))]);
    const all = K("blog"); add(s.moreResearch, after(all, Math.max(all.indexOf(pg), 0), 4).flatMap((p) => link(p)), true); }
  else if (pg.kind === "source") { const all = K("source"); add(s.moreSources, after(all, Math.max(all.indexOf(pg), 0), 6).flatMap((p) => link(p))); }
  else if (pg.kind === "topdest") add(s.otherDest, [...K("topdest").flatMap((p) => link(p)), ...link(at("/top/how-we-rank"))]);
  else if (pg.kind === "project") add(s.newBuilds, [...link(at("/" + pg.en.split("/").slice(1, 3).join("/"))), ...link(at("/top/how-we-rank"))]);

  // The two rows below are the site's footer for the HTML a crawler reads. Inside the app the real footer has these
  // links, so the app hides the rows (src/community/related.css) and shows only what belongs to this page.
  // the menu of countries, written in the HTML of the front page and the section pages (idea 121)
  if (pg.kind === "home" || pg.kind === "hub") add(s.countries, K("country").slice().sort((x, y) => K("deal", y.cc).length - K("deal", x.cc).length || x.path.localeCompare(y.path)).flatMap((p) => link(p, c.nameOf(p.cc, lang))), false, true);
  add(s.explore, EXPLORE.flatMap(([en, l, es]) => link(at(en), lang === "es" ? es : l)), false, true);
  if (pg.kind === "home" || pg.kind === "hub" || pg.kind === "page") add(s.more, MORE.flatMap(([en, l, es]) => link(at(en), lang === "es" ? es : l)), false, true);
  return rows;
}
const TYPE_OF: Record<string, string> = { "by-the-sea": "beach", "village-houses": "village", "in-town": "city" };

const esc = (x: unknown) => String(x ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/** First paint of the block, before the app's stylesheet (src/community/related.css) takes over inside the app. */
export const REL_HEAD = `<style id="rh-rel-css">#root>.rh-rel{max-width:760px;margin:0 auto;padding:8px 16px 40px;font:15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#14181c}#root>.rh-rel h2{font:800 20px system-ui,sans-serif;margin:24px 0 4px;padding-top:24px;border-top:1px solid #e4e5e8}#root>.rh-rel h3{font:600 13px system-ui,sans-serif;color:#62666e;margin:16px 0 8px}#root>.rh-rel ul{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:8px}#root>.rh-rel a{color:#14181c;text-decoration:none}#root>.rh-rel .rh-rel-chips a{display:inline-block;padding:7px 14px;border-radius:999px;background:#f2f3f5}#root>.rh-rel .rh-rel-list{display:block}#root>.rh-rel .rh-rel-list li{margin:6px 0}#root>.rh-rel .rh-rel-list a{text-decoration:underline;text-underline-offset:3px}</style>`;
/** The block and the two lines that hand it to the app (or remove it when this file is served for another address,
 * which is what happens with the front page: the worker sends it for every app screen that has no file). */
export function renderRelated(pg: Pg, rows: Row[]): string {
  const s = STR[pg.lang];
  return `<aside class="rh-rel${rows.every((r) => r.site) ? " rh-rel-siteonly" : ""}" id="rh-rel" data-path="${esc(pg.path)}"${pg.lang === "es" ? ' lang="es"' : ""} aria-label="${esc(s.title)}"><h2>${esc(s.title)}</h2>`
    + rows.map((r) => `<div class="rh-rel-row${r.site ? " rh-rel-site" : ""}"><h3>${esc(r.title)}</h3><ul class="${r.list ? "rh-rel-list" : "rh-rel-chips"}">${r.links.map((l) => `<li><a href="${esc(l.href)}">${esc(l.label)}</a></li>`).join("")}</ul></div>`).join("")
    + `</aside><script>(function(){var e=document.getElementById("rh-rel");if(!e)return;var p=location.pathname.replace(/\\/+$/,"")||"/";if(p!==e.getAttribute("data-path")){e.parentNode.removeChild(e);return}window.__rhRel={p:p,h:e.outerHTML}})()</script>`;
}

// ------------------------------------------------------------------------------------------ HTML site map
export type SitemapPage = { path: string; lang: Lang; title: string; desc: string; label: string; body: string };
/** /sitemap (the groups, and the main pages in full) and /sitemap/<group> (every indexable page of the group), in
 * English and in Spanish. Every indexable page is two clicks from /sitemap, which every page links to. */
export function sitemapPages(c: RelCtx): SitemapPage[] {
  const out: SitemapPage[] = [];
  for (const lang of ["en", "es"] as Lang[]) {
    const s = STR[lang], pre = lang === "es" ? "/es" : "";
    const by = new Map<string, Pg[]>();
    for (const pg of c.pages.values()) if (pg.lang === lang && c.live(pg.path) && !/^\/(es\/)?sitemap(\/|$)/.test(pg.path)) (by.get(groupOf(pg)) || by.set(groupOf(pg), []).get(groupOf(pg))!).push(pg);
    if (lang === "es" && !by.size) continue;
    const name = (g: { en: string; es: string }) => (lang === "es" ? g.es : g.en);
    const text = (pg: Pg) => (pg.kind === "deal" ? pg.label : pg.h1[0] || pg.label);
    const li = (pg: Pg) => `<li><a href="${esc(pg.path)}">${esc(text(pg))}</a></li>`;
    const sorted = (l: Pg[]) => l.slice().sort((a, b) => a.en.split("/").length - b.en.split("/").length || text(a).localeCompare(text(b), lang));
    const groups = GROUPS.filter((g) => by.has(g.key));
    const attrs = `class="rh-static" data-rh-keep data-rh-static${lang === "es" ? ' lang="es"' : ""}`;
    // 20-nov-2026 (idea 26): one page per country with an indexable country page, with every page and home of it
    const all = [...by.values()].flat();
    const ccs = [...new Set(all.filter((pg) => pg.kind === "country" && pg.cc && pg.en === `/homes/${pg.cc}`).map((pg) => pg.cc))]
      .filter((cc) => !GROUPS.some((g) => g.key === cc)).sort((a, b) => c.nameOf(a, lang).localeCompare(c.nameOf(b, lang), lang));
    const ofCc = new Map(ccs.map((cc) => [cc, all.filter((pg) => pg.cc === cc)]));
    out.push({
      path: `${pre}/sitemap`, lang, title: `${s.siteMap} · RealHunt`, desc: s.smDesc, label: s.siteMap,
      body: `<main ${attrs}><h1>${esc(s.siteMap)}</h1><p>${esc(s.smDesc)}</p>`
        + groups.map((g) => g.key === "main"
          ? `<h2>${esc(name(g))}</h2><ul>${sorted(by.get(g.key)!).map(li).join("")}</ul>`
          : `<h2>${esc(name(g))}</h2><p><a href="${pre}/sitemap/${g.key}">${esc(s.smAll(name(g), by.get(g.key)!.length))}</a></p>`).join("")
        + (ccs.length ? `<h2>${esc(s.smByCountry)}</h2><ul>${ccs.map((cc) => `<li><a href="${pre}/sitemap/${cc}">${esc(s.smCountryLink(c.nameOf(cc, lang), ofCc.get(cc)!.length))}</a></li>`).join("")}</ul>` : "") + `</main>`,
    });
    for (const cc of ccs) {
      const list = ofCc.get(cc)!;
      const homes = list.filter((pg) => pg.kind === "deal").length;
      const inner = groups.filter((g) => g.key !== "main").map((g) => { const l = list.filter((pg) => groupOf(pg) === g.key); return l.length ? `<h2>${esc(name(g))}</h2><ul>${sorted(l).map(li).join("")}</ul>` : ""; }).join("");
      out.push({
        path: `${pre}/sitemap/${cc}`, lang, title: `${s.smCountryTitle(c.inThe(cc, lang))} · RealHunt`, desc: s.smCountryDesc(c.inThe(cc, lang), homes, list.length - homes), label: c.nameOf(cc, lang),
        body: `<main ${attrs}><h1>${esc(s.smCountryTitle(c.inThe(cc, lang)))}</h1><p>${esc(s.smIntro(list.length))}</p>${inner}<h2>${esc(s.siteMap)}</h2><p><a href="${pre}/sitemap">${esc(s.siteMap)}</a> · <a href="${pre}/sitemap/${groups.some((g) => g.key === "homes") ? "homes" : "countries"}">${esc(name(GROUPS.find((g) => g.key === (groups.some((x) => x.key === "homes") ? "homes" : "countries"))!))}</a></p></main>`,
      });
    }
    const others = (key: string) => `<p>${[`<a href="${pre}/sitemap">${esc(s.siteMap)}</a>`, ...groups.filter((g) => g.key !== "main" && g.key !== key).map((g) => `<a href="${pre}/sitemap/${g.key}">${esc(name(g))}</a>`)].join(" · ")}</p>`;
    for (const g of groups) {
      if (g.key === "main") continue;
      const list = by.get(g.key)!;
      const withCc = list.filter((p) => p.cc).length;
      let inner: string;
      if (withCc >= list.length * 0.6 && list.length > 20) {
        const ccs = [...new Set(list.map((p) => p.cc))].sort((a, b) => (a ? c.nameOf(a, lang) : "").localeCompare(b ? c.nameOf(b, lang) : "", lang));
        inner = ccs.map((cc) => `<h2>${esc(cc ? c.nameOf(cc, lang) : s.other)}</h2><ul>${sorted(list.filter((p) => p.cc === cc)).map(li).join("")}</ul>`).join("");
      } else inner = `<ul>${sorted(list).map(li).join("")}</ul>`;
      out.push({
        path: `${pre}/sitemap/${g.key}`, lang, title: `${s.smGroupTitle(name(g))} · RealHunt`, desc: s.smGroupDesc(name(g), list.length), label: name(g),
        body: `<main ${attrs}><h1>${esc(s.smGroupTitle(name(g)))}</h1><p>${esc(s.smIntro(list.length))}</p>${inner}<h2>${esc(s.siteMap)}</h2>${others(g.key)}</main>`,
      });
    }
  }
  return out;
}
