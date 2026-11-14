// The pages of seo/reach (15-nov-2026), each written by hand in English and in Spanish:
//   /research/property-portals   the directory of property portals by country (ideas 691 and 715)
//   /research/country-facts      key facts and dated, quotable sentences per country, and ranked lists (692, 693, 705, 730)
//   /research/open-data          what the public files are, their licence and how to read them (694, 695, 708)
//   /research/data-changelog     what changed in the data, day by day (707)
//   /research/find-homes         search by address: ?country=bulgaria&max=30000 (710)
// They live under /research so the app shows them as static pages without a new route (src/community/assetRoutes.ts).
import { LICENSE, ORG, PRESS_EMAIL, SITE, citeBlock, crumbLd, esc, frame, kit, mdTable, table, type Kit, type Lang, type PageFn } from "../assetsKit";
import { MIN_RANK, toCsv } from "../assetsStats";
import { METHOD_VERSION, registerEsPage } from "../assetsTrust";
import { added, keyFacts, sentences, write, type Fact, type Row } from "./data";
import { PORTALS_DATE, countryEs, portalCount, portalNameEs, type PortalCountry } from "./portals";

export type ReachCtx = { root: string; page: PageFn; rows: Row[]; facts: Record<Lang, Fact[]>; portals: PortalCountry[]; today: string; image: string; has: (p: string) => boolean };
export const REACH_PAGES = ["property-portals", "country-facts", "open-data", "data-changelog", "find-homes"];

const CSS = `<style>
.rhr-toc{display:flex;flex-wrap:wrap;gap:6px 8px;margin:12px 0;padding:0!important;list-style:none!important}.rhr-toc li{margin:0!important}
.rhr-toc a{display:inline-flex;align-items:center;min-height:44px;padding:0 12px;border:1px solid var(--c-line,#E4E5E8);border-radius:999px;font-size:14px;text-decoration:none!important;color:var(--c-ink,#111214)!important;background:var(--c-surface,#fff)}
.rhr-toc a small{margin-left:6px;color:var(--c-ink-3,#62666E)}
.rhr-portals{list-style:none!important;padding:0!important;display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:14px;margin:16px 0}
.rhr-portals>li{margin:0!important;border:1px solid var(--c-line,#E4E5E8);border-radius:16px;padding:16px;background:var(--c-surface,#fff);scroll-margin-top:80px}
.rhr-portals h3{margin:0 0 8px;font-size:17px}.rhr-portals ol{margin:0;padding-left:20px}.rhr-portals ol li{margin:0;line-height:1.3;padding:5px 0}.rhr-portals ol a{display:inline-block;padding:4px 0}.rhr-portals ol small{display:block;color:var(--c-ink-3,#62666E);font-size:12.5px}
.rhr-portals p{margin:10px 0 0;font-size:13.5px;line-height:1.45;color:var(--c-ink-2,#3D4047)}
.rhx h3.rhr-rank{margin:26px 0 4px;font-size:18px}.rhr-country{scroll-margin-top:80px}.rhr-links{font-size:14px}
.rhr-chart{margin:20px 0}.rhr-chart img{display:block;width:100%;height:auto;border:1px solid var(--c-line,#E4E5E8);border-radius:16px;background:#fff}.rhr-chart figcaption{font-size:13.5px;color:var(--c-ink-3,#62666E);margin-top:8px;line-height:1.45}
.rhr-form{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;align-items:end;margin:16px 0;padding:16px;border:1px solid var(--c-line,#E4E5E8);border-radius:16px;background:var(--c-surface,#fff)}
.rhr-form label{display:block;font-size:13px;font-weight:600}.rhr-form select,.rhr-form input{display:block;width:100%;min-height:44px;margin-top:4px;padding:0 12px;border:1px solid var(--c-line-2,#D3D5D9);border-radius:12px;background:var(--c-surface,#fff);color:var(--c-ink,#111214);font:16px Inter,system-ui,sans-serif;box-sizing:border-box}
.rhr-form .rhx-btn{margin:0;width:100%}
.rhr-res{list-style:none!important;padding:0!important;margin:12px 0;display:grid;gap:8px}.rhr-res li{margin:0!important;border:1px solid var(--c-line,#E4E5E8);border-radius:12px;padding:12px 14px;background:var(--c-surface,#fff);line-height:1.4}.rhr-res small{display:block;color:var(--c-ink-3,#62666E);font-size:13.5px}
.rhr-log{list-style:none!important;padding:0!important;margin:12px 0}.rhr-log li{margin:0!important;padding:10px 0;border-bottom:1px solid var(--c-line,#E4E5E8);line-height:1.5}.rhr-log time{font-weight:700;display:inline-block;min-width:11.5em}
</style>`;

const cn = (k: Kit, name: string) => (k.es ? countryEs(name) : name);
const updated = (k: Kit, iso: string) => `<p class="rhx-meta">${k.t("Updated", "Actualizado el")} <time datetime="${iso}">${esc(k.date(iso))}</time></p>`;
const xml = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** A horizontal bar chart as an SVG file with its title, date and source inside the image, so it can be shared or
 * indexed on its own (Google Images) and still say where it comes from. Light background on purpose: it is an image. */
export function chartSvg(title: string, sub: string, source: string, items: { label: string; value: number; text: string }[]): string {
  const W = 1200, row = 44, top = 150, left = 300, right = 150, H = top + items.length * row + 90;
  const max = Math.max(...items.map((i) => i.value), 1), bw = W - left - right;
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${xml(title)}" font-family="Inter,Helvetica,Arial,sans-serif"><title>${xml(title)}</title><desc>${xml(sub)} ${xml(items.map((i) => `${i.label}: ${i.text}`).join("; "))}. ${xml(source)}</desc>`
    + `<rect width="${W}" height="${H}" fill="#fff"/><text x="48" y="68" font-size="38" font-weight="800" fill="#111214">${xml(title)}</text><text x="48" y="108" font-size="22" fill="#62666E">${xml(sub)}</text>`
    + items.map((it, i) => { const y = top + i * row; const w = Math.max(3, Math.round((it.value / max) * bw)); return `<text x="${left - 16}" y="${y + 24}" font-size="22" text-anchor="end" fill="#111214">${xml(it.label)}</text><rect x="${left}" y="${y + 4}" width="${w}" height="28" rx="4" fill="#2F6DA8"/><text x="${left + w + 12}" y="${y + 25}" font-size="22" font-weight="700" fill="#111214">${xml(it.text)}</text>`; }).join("")
    + `<text x="48" y="${H - 34}" font-size="20" fill="#62666E">${xml(source)}</text></svg>\n`;
}

export function writeReachPages(c: ReachCtx): number {
  let n = 0;
  const nPortals = portalCount(c.portals), nPC = c.portals.length;
  const homesIn = new Map(c.facts.en.map((f) => [f.k, f]));
  const srcOf = (key: string) => { const m = new Map<string, number>(); for (const r of homesIn.get(key)?.homes || []) { const d = String(r.source_domain || "").toLowerCase().replace(/^www\./, ""); if (d && !/instagram|facebook|tiktok/.test(d)) m.set(d, (m.get(d) || 0) + 1); } return [...m].sort((a, b) => b[1] - a[1]).slice(0, 4); };

  // ---- data behind the changelog: homes added per day and per month (only homes still on the site are known)
  const byDay = new Map<string, Row[]>();
  for (const r of c.rows) { const d = added(r); if (/^\d{4}-\d{2}-\d{2}$/.test(d)) (byDay.get(d) || byDay.set(d, []).get(d)!).push(r); }
  const days = [...byDay.keys()].sort().reverse();
  const months = [...new Set(days.map((d) => d.slice(0, 7)))];

  // ---- files next to the pages (written once)
  write(c.root, "research/property-portals.csv", "﻿" + toCsv(["country", "country_code", "portal", "domain", "url", "order_in_country"], c.portals.flatMap((pc) => pc.portals.map((p, i) => [pc.country, pc.cc, p.name, p.domain, p.url, i + 1]))));
  write(c.root, "research/property-portals.json", JSON.stringify({ updated: PORTALS_DATE, license: LICENSE, attribution: "RealHunt (realhunt.co)", source: `${SITE}/research/property-portals`, note: "A directory, not a ranking or a recommendation. Order inside a country is the order RealHunt checks them.",
    countries: c.portals.map((pc) => ({ country: pc.country, code: pc.cc, realhunt_homes: homesIn.get(pc.key)?.n ?? 0, realhunt_page: homesIn.has(pc.key) ? `${SITE}/homes/${pc.key}` : null, portals: pc.portals.map((p) => ({ name: p.name, domain: p.domain, url: p.url })) })) }) + "\n");

  for (const lang of ["en", "es"] as Lang[]) {
    const k = kit(lang); const { t, es } = k;
    const facts = c.facts[lang];
    const hub: [string, string] = [t("Data", "Datos"), "/research"];
    const put = (slug: string, title: string, desc: string, o: { h1: string; eyebrow: string; body: string; ld: object[]; lastmod?: string; head?: string }) => {
      const p = `/research/${slug}`;
      const crumbs: [string, string][] = [["RealHunt", "/"], hub, [o.h1, p]];
      const more = `<h2>${esc(t("More data from RealHunt", "Más datos de RealHunt"))}</h2><ul>${MORE.filter(([s]) => s !== slug).map(([s, en2, es2]) => `<li><a href="/research/${s}">${esc(t(en2, es2))}</a></li>`).join("")}<li><a href="/research">${esc(t("All datasets and studies", "Todos los datos y estudios"))}</a></li><li><a href="/for-ai">${esc(t("For AI assistants: what you can quote", "Para asistentes de IA: qué se puede citar"))}</a></li></ul>`;
      c.page(k.url(p), `${title} · RealHunt`, desc, c.image, frame(k, { crumbs, eyebrow: o.eyebrow, h1: o.h1, body: CSS + o.body + more }), [crumbLd(k, crumbs), ...o.ld],
        { group: es ? "es" : "content", lastmod: o.lastmod || c.today, lang: es ? "es" : undefined, alt: { en: SITE + p, es: `${SITE}/es${p}` }, head: o.head });
      if (es) registerEsPage(`es${p}/index.html`);
      n++;
    };
    const MORE: [string, string, string][] = [
      ["property-portals", "Property portals by country", "Portales inmobiliarios por país"],
      ["country-facts", "Key facts for buying a home, country by country", "Datos clave para comprar casa, país por país"],
      ["open-data", "Open data: files, licence and how to read them", "Datos abiertos: archivos, licencia y cómo leerlos"],
      ["data-changelog", "What changed in the data, day by day", "Novedades en los datos, día a día"],
      ["find-homes", "Find homes by country and price, with a link you can share", "Buscar casas por país y precio, con un enlace para compartir"],
    ];
    const license = `<p class="rhx-note">${t(`Text and figures on this page are free to quote with a link (<a href="${LICENSE}" rel="license noopener">Creative Commons BY 4.0</a>). Photos of the homes belong to the original listings.`, `Los textos y las cifras de esta página se pueden citar con un enlace (<a href="${LICENSE}" rel="license noopener">Creative Commons BY 4.0</a>). Las fotos de las casas pertenecen a los anuncios originales.`)}</p>`;

    // ================================================================== 1. property portals by country
    {
      const withHomes = c.portals.filter((pc) => homesIn.has(pc.key)).length;
      const h1 = t(`Property portals by country: where homes are listed for sale in ${nPC} countries`, `Portales inmobiliarios por país: dónde se anuncian las casas en venta en ${nPC} países`);
      const answer = t(`This is a directory of ${nPortals} property portals in ${nPC} countries: the national portals, the large classified sites and the portals made for foreign buyers, each with its web address. They are in the order RealHunt checks them when it looks for homes in that country. Being listed here is not a recommendation or a rating.`,
        `Este es un directorio de ${nPortals} portales inmobiliarios de ${nPC} países: los portales nacionales, las grandes webs de anuncios clasificados y los portales pensados para compradores extranjeros, cada uno con su dirección. Aparecen en el orden en que RealHunt los consulta cuando busca casas en ese país. Estar en la lista no es una recomendación ni una valoración.`);
      const card = (pc: PortalCountry) => {
        const f = homesIn.get(pc.key), name = cn(k, pc.country), src = srcOf(pc.key);
        const rh = f ? t(`RealHunt lists <a href="/homes/${pc.key}">${k.num(f.n)} checked homes in ${esc(k.es ? k.inThe(name) : k.inThe(pc.country))}</a>, median asking price ${k.eur(f.medPrice)}.${src.length ? ` Their original listings are on ${src.map(([d, x]) => `${esc(d)} (${x})`).join(", ")}.` : ""}`,
          `RealHunt publica <a href="/homes/${pc.key}">${k.num(f.n)} casas revisadas en ${esc(k.inThe(name))}</a>, con un precio de salida mediano de ${k.eur(f.medPrice)}.${src.length ? ` Sus anuncios originales están en ${k.list(src.map(([d, x]) => `${esc(d)} (${x})`))}.` : ""}`) : "";
        const guide = f?.pages.guide ? ` <a href="/guide/${pc.key}">${esc(t("How to buy there", "Cómo se compra allí"))}</a>${f.pages.costs ? ` · <a href="/costs/${pc.key}">${esc(t("Costs and taxes", "Gastos e impuestos"))}</a>` : ""}` : "";
        return `<li id="${esc(pc.key)}"><h3>${esc(name)}</h3><ol>${pc.portals.map((p) => `<li><a href="${esc(p.url)}" rel="noopener">${esc(es ? portalNameEs(p) : p.name)}</a><small>${esc(p.domain)}</small></li>`).join("")}</ol>${rh || guide ? `<p>${rh}${guide}</p>` : ""}</li>`;
      };
      const body = `<div class="rhx-answer"><p>${esc(answer)}</p><p>${esc(t(`List compiled on ${k.date(PORTALS_DATE)}. RealHunt has homes in ${withHomes} of these countries; the counts are of ${k.date(c.today)}.`, `Lista elaborada el ${k.date(PORTALS_DATE)}. RealHunt tiene casas en ${withHomes} de estos países; los recuentos son de ${k.date(c.today)}.`))}</p></div>`
        + updated(k, c.today)
        + `<h2>${esc(t("How to use this list", "Cómo usar esta lista"))}</h2><ul>${[
          t("Start with the first two or three portals of a country: they are the ones we check first.", "Empieza por los dos o tres primeros portales de cada país: son los que consultamos primero."),
          t("The same home is often on more than one portal, and the price is not always the same. Compare before you call.", "La misma casa suele estar en más de un portal, y no siempre al mismo precio. Compara antes de llamar."),
          t(`Prices on a portal are asking prices. Taxes and fees come on top: see <a href="/costs">what it costs to buy in each country</a>.`, `Los precios de un portal son precios de salida. Los impuestos y gastos van aparte: mira <a href="/costs">cuánto cuesta comprar en cada país</a>.`),
          t(`RealHunt is not a portal and not an estate agent. A person checks each home before it is listed, it gets a score from 70 to 98, and the page links to the original listing. <a href="/method">How the score works</a>.`, `RealHunt no es un portal ni una inmobiliaria. Una persona revisa cada casa antes de publicarla, le pone una nota de 70 a 98 y la página enlaza con el anuncio original. <a href="/method">Cómo funciona la nota</a>.`),
        ].map((x) => `<li>${x}</li>`).join("")}</ul>`
        + `<h2>${esc(t("Countries", "Países"))}</h2><ul class="rhr-toc">${c.portals.slice().sort((a, b) => cn(k, a.country).localeCompare(cn(k, b.country), lang)).map((pc) => `<li><a href="#${esc(pc.key)}">${esc(cn(k, pc.country))}<small>${pc.portals.length}</small></a></li>`).join("")}</ul>`
        + `<h2>${esc(t(`The ${nPortals} portals, country by country`, `Los ${nPortals} portales, país por país`))}</h2><ul class="rhr-portals">${c.portals.map(card).join("")}</ul>`
        + `<h2>${esc(t("What is in the list and what is not", "Qué incluye la lista y qué no"))}</h2><ul>${[
          t("Each entry has the name of the portal, its country and its web address. The link goes to the portal's front page.", "Cada entrada tiene el nombre del portal, su país y su dirección. El enlace lleva a la portada del portal."),
          t("Two portals work in more than one country and appear once in each.", "Dos portales trabajan en más de un país y aparecen una vez en cada uno."),
          t("We do not rate the portals, we do not count their listings and we do not say which one is best: that changes by region and by type of home.", "No puntuamos los portales, no contamos sus anuncios ni decimos cuál es mejor: eso cambia según la región y el tipo de casa."),
          t(`A portal is missing, has closed or has changed its address? Write to <a href="mailto:${PRESS_EMAIL}">${PRESS_EMAIL}</a> and we will correct the list.`, `¿Falta un portal, ha cerrado o ha cambiado de dirección? Escribe a <a href="mailto:${PRESS_EMAIL}">${PRESS_EMAIL}</a> y corregimos la lista.`),
        ].map((x) => `<li>${x}</li>`).join("")}</ul>`
        + `<h2>${esc(t("Download", "Descargar"))}</h2><p><a class="rhx-btn" href="/research/property-portals.csv" download>CSV</a> <a class="rhx-btn" href="/research/property-portals.json">JSON</a> <a class="rhx-btn" href="/research/property-portals${es ? ".es" : ""}.md">Markdown</a></p>`
        + license + citeBlock(k, h1, "/research/property-portals", c.today);
      put("property-portals", t(`Property portals by country: ${nPortals} sites in ${nPC} countries`, `Portales inmobiliarios por país: ${nPortals} webs de ${nPC} países`),
        t(`A directory of ${nPortals} property portals in ${nPC} countries, each with its link, and where RealHunt has checked homes. Free to quote, with CSV and JSON.`, `Directorio de ${nPortals} portales inmobiliarios de ${nPC} países, cada uno con su enlace, y dónde tiene RealHunt casas revisadas. Con CSV y JSON, libre de citar.`),
        { h1, eyebrow: t("Directory", "Directorio"), body, lastmod: c.today,
          ld: [{ "@context": "https://schema.org", "@type": "Dataset", name: h1, description: answer, url: k.url("/research/property-portals"), inLanguage: lang, dateModified: c.today, datePublished: PORTALS_DATE, isAccessibleForFree: true, license: LICENSE, creator: ORG, publisher: ORG,
            keywords: es ? ["portales inmobiliarios", "comprar casa en el extranjero", "dónde buscar casas"] : ["property portals", "real estate websites by country", "buying property abroad"],
            distribution: [{ "@type": "DataDownload", encodingFormat: "text/csv", contentUrl: `${SITE}/research/property-portals.csv` }, { "@type": "DataDownload", encodingFormat: "application/json", contentUrl: `${SITE}/research/property-portals.json` }] }] });
      write(c.root, `research/property-portals${es ? ".es" : ""}.md`, `# ${h1}\n\n${answer}\n\n${t("Updated", "Actualizado el")} ${k.date(c.today)}. ${t("Source", "Fuente")}: RealHunt, ${k.url("/research/property-portals")} (CC BY 4.0).\n\n`
        + c.portals.map((pc) => `## ${cn(k, pc.country)}\n\n${pc.portals.map((p, i) => `${i + 1}. [${es ? portalNameEs(p) : p.name}](${p.url})`).join("\n")}\n${homesIn.has(pc.key) ? `\n${t(`RealHunt: ${homesIn.get(pc.key)!.n} checked homes`, `RealHunt: ${homesIn.get(pc.key)!.n} casas revisadas`)}, ${k.url(`/homes/${pc.key}`)}\n` : ""}`).join("\n"));
    }

    // ================================================================== 2. key facts per country
    {
      const solid = facts.filter((f) => !f.small && f.n >= MIN_RANK);
      const byPrice = solid.slice().sort((a, b) => a.medPrice - b.medPrice).slice(0, 10);
      const byCost = facts.filter((f) => f.costs).slice().sort((a, b) => (a.costs![0] + a.costs![1]) - (b.costs![0] + b.costs![1])).slice(0, 10);
      const byPp = solid.filter((f) => f.medPpsqm && f.nSqm >= MIN_RANK).sort((a, b) => a.medPpsqm - b.medPpsqm).slice(0, 10);
      const h1 = t(`Key facts for buying a cheap home, country by country`, `Datos clave para comprar una casa barata, país por país`);
      const answer = t(`For each of the ${facts.length} countries where RealHunt lists at least 3 homes: how many homes, the median asking price, the price per m², the taxes and fees to buy and the rule for foreign buyers, in full sentences with their date so each one can be quoted on its own. Figures of ${k.date(c.today)}, from ${k.num(c.rows.length)} homes checked by a person.`,
        `Para cada uno de los ${facts.length} países donde RealHunt publica al menos 3 casas: cuántas casas hay, el precio de salida mediano, el precio por m², los impuestos y gastos de compra y la norma para compradores extranjeros, en frases completas y con su fecha para que cada una se pueda citar por separado. Cifras de ${k.date(c.today)}, a partir de ${k.num(c.rows.length)} casas revisadas por una persona.`);
      const svgName = `research/img/median-price-by-country${es ? ".es" : ""}.svg`;
      const chartTitle = t("Median asking price of a cheap home, by country", "Precio de salida mediano de una casa barata, por país");
      const chartSub = t(`Euros. Countries with at least ${MIN_RANK} homes on RealHunt, ${k.date(c.today)}`, `En euros. Países con al menos ${MIN_RANK} casas en RealHunt, ${k.date(c.today)}`);
      const chartItems = solid.slice().sort((a, b) => a.medPrice - b.medPrice).map((f) => ({ label: cn(k, f.name), value: f.medPrice, text: k.eur(f.medPrice) }));
      write(c.root, svgName, chartSvg(chartTitle, chartSub, t("Source: RealHunt, realhunt.co/research/country-facts (CC BY 4.0)", "Fuente: RealHunt, realhunt.co/es/research/country-facts (CC BY 4.0)"), chartItems));
      const rank = (title: string, why: string, items: Fact[], val: (f: Fact) => string) => `<h3 class="rhr-rank">${esc(title)}</h3><p class="rhx-note">${esc(why)}</p><ol>${items.map((f) => `<li><a href="#${f.k}">${esc(cn(k, f.name))}</a>: ${esc(val(f))}</li>`).join("")}</ol>`;
      const section = (f: Fact) => {
        const name = cn(k, f.name), base = `/data/countries/${f.k}`;
        const links = [`<a href="/homes/${f.k}">${esc(t(`All ${k.num(f.n)} homes in ${k.inThe(f.name)}`, `Las ${k.num(f.n)} casas de ${k.inThe(name)}`))}</a>`,
          f.pages.costs ? `<a href="/costs/${f.k}">${esc(t("Costs and taxes, with sources", "Gastos e impuestos, con fuentes"))}</a>` : "", f.pages.guide ? `<a href="/guide/${f.k}">${esc(t("Buying guide, step by step", "Guía de compra, paso a paso"))}</a>` : "",
          `<a href="${base}${es ? ".es" : ""}.pdf">${esc(t("Fact sheet (PDF)", "Hoja de datos (PDF)"))}</a>`, `<a href="${base}.json">JSON</a>`, `<a href="${base}${es ? ".es" : ""}.md">Markdown</a>`].filter(Boolean).join(" · ");
        return `<section class="rhr-country" id="${f.k}"><h2>${esc(name)}</h2><p>${esc(sentences(k, f, c.today).join(" "))}</p>`
          + table([{ h: t("Fact", "Dato") }, { h: t("Value", "Valor"), cls: "w" }], keyFacts(k, f, c.today).map(([a, b]) => [esc(a), esc(b)]), t(`Key facts: ${name}`, `Datos clave: ${name}`), true)
          + `<p class="rhr-links">${links}</p></section>`;
      };
      const body = `<div class="rhx-answer"><p>${esc(answer)}</p></div>` + updated(k, c.today)
        + `<ul class="rhr-toc">${facts.slice().sort((a, b) => cn(k, a.name).localeCompare(cn(k, b.name), lang)).map((f) => `<li><a href="#${f.k}">${esc(cn(k, f.name))}<small>${k.num(f.n)}</small></a></li>`).join("")}</ul>`
        + `<h2>${esc(t("Ranked lists, with the rule behind each one", "Listas ordenadas, con el criterio de cada una"))}</h2>`
        + rank(t(`The ${byPrice.length} countries with the lowest median asking price`, `Los ${byPrice.length} países con el precio de salida mediano más bajo`), t(`Rule: countries with at least ${MIN_RANK} homes on RealHunt, sorted by the median asking price of those homes, lowest first.`, `Criterio: países con al menos ${MIN_RANK} casas en RealHunt, ordenados por el precio de salida mediano de esas casas, de menor a mayor.`), byPrice, (f) => `${k.eur(f.medPrice)} (${t(`${k.num(f.n)} homes`, `${k.num(f.n)} casas`)})`)
        + (byPp.length >= 3 ? rank(t(`The ${byPp.length} countries with the lowest median price per m²`, `Los ${byPp.length} países con el precio mediano por m² más bajo`), t(`Rule: countries with at least ${MIN_RANK} homes with a known size, sorted by median asking price per square metre, lowest first.`, `Criterio: países con al menos ${MIN_RANK} casas de superficie conocida, ordenados por el precio de salida mediano por metro cuadrado, de menor a mayor.`), byPp, (f) => `${k.eur(f.medPpsqm)}/m² (${t(`${k.num(f.nSqm)} homes`, `${k.num(f.nSqm)} casas`)})`) : "")
        + (byCost.length >= 3 ? rank(t(`The ${byCost.length} countries with the lowest taxes and fees to buy`, `Los ${byCost.length} países con menos impuestos y gastos de compra`), t("Rule: the middle of the range of taxes and fees on top of the price, lowest first. General information, not tax advice.", "Criterio: el punto medio del rango de impuestos y gastos que se suman al precio, de menor a mayor. Información general, no asesoramiento fiscal."), byCost, (f) => `${k.pct(f.costs![0], f.costs![1])}${f.asOf ? ` (${t("as of", "cifras de")} ${f.asOf})` : ""}`) : "")
        + `<figure class="rhr-chart"><img src="/${svgName}" width="1200" height="${150 + chartItems.length * 44 + 90}" loading="lazy" alt="${esc(`${chartTitle}. ${chartItems.map((i) => `${i.label}: ${i.text}`).join("; ")}.`)}"><figcaption>${esc(`${chartTitle}. ${chartSub}.`)} ${t(`You can use this chart with a link to this page (CC BY 4.0). The full table is in <a href="/research/prices">prices by country</a>.`, `Puedes usar este gráfico con un enlace a esta página (CC BY 4.0). La tabla completa está en <a href="/research/prices">precios por país</a>.`)}</figcaption></figure>`
        + facts.map(section).join("")
        + `<h2>${esc(t("How to read these figures", "Cómo leer estas cifras"))}</h2><ul>${[
          t("RealHunt is not a census of the market. A person picks homes that are cheap for their country and ready to live in, so a median here describes those homes, not the country's whole market.", "RealHunt no es un censo del mercado. Una persona elige casas baratas para su país y listas para entrar a vivir, así que una mediana describe esas casas, no todo el mercado del país."),
          t("Prices are asking prices in euros from the original listing on the day the home was added. A sale can close lower.", "Los precios son los de salida del anuncio original, en euros, el día en que se añadió la casa. La venta puede cerrarse por menos."),
          t(`A country with fewer than ${MIN_RANK} homes is marked as a small sample and left out of the ranked lists.`, `Un país con menos de ${MIN_RANK} casas aparece marcado como muestra pequeña y queda fuera de las listas ordenadas.`),
          t(`Rules, taxes and costs are general information with their sources on each country's <a href="/costs">cost page</a>, not legal or tax advice.`, `Las normas, los impuestos y los gastos son información general, con sus fuentes en la <a href="/costs">página de gastos</a> de cada país, no asesoramiento jurídico ni fiscal.`),
        ].map((x) => `<li>${x}</li>`).join("")}</ul>` + license + citeBlock(k, h1, "/research/country-facts", c.today);
      put("country-facts", t(`Buying a cheap home abroad: key facts for ${facts.length} countries`, `Comprar una casa barata fuera: datos clave de ${facts.length} países`),
        t(`Median price, price per m², buying costs and the rule for foreigners in ${facts.length} countries, in dated sentences you can quote. With a fact sheet per country.`, `Precio mediano, precio por m², gastos de compra y norma para extranjeros en ${facts.length} países, en frases con fecha que se pueden citar. Con una hoja de datos por país.`),
        { h1, eyebrow: t("RealHunt data", "Datos de RealHunt"), body,
          ld: [{ "@context": "https://schema.org", "@type": "Dataset", name: h1, description: answer, url: k.url("/research/country-facts"), inLanguage: lang, dateModified: c.today, datePublished: c.today, isAccessibleForFree: true, license: LICENSE, creator: ORG, publisher: ORG,
            variableMeasured: es ? ["precio de salida mediano (EUR)", "precio de salida mediano por m² (EUR)", "impuestos y gastos de compra (% del precio)", "casas"] : ["median asking price (EUR)", "median asking price per m² (EUR)", "taxes and fees to buy (% of price)", "homes"], spatialCoverage: facts.map((f) => cn(k, f.name)),
            distribution: [{ "@type": "DataDownload", encodingFormat: "application/json", contentUrl: `${SITE}/data/countries/index.json` }] },
          { "@context": "https://schema.org", "@type": "ItemList", name: t(`Countries with the lowest median asking price on RealHunt, ${k.date(c.today)}`, `Países con el precio de salida mediano más bajo en RealHunt, ${k.date(c.today)}`), itemListOrder: "https://schema.org/ItemListOrderAscending", numberOfItems: byPrice.length,
            itemListElement: byPrice.map((f, i) => ({ "@type": "ListItem", position: i + 1, name: `${cn(k, f.name)}: ${k.eur(f.medPrice)}`, url: k.url(`/homes/${f.k}`) })) }] });
    }

    // ================================================================== 3. open data
    {
      const h1 = t("RealHunt open data: the files, the licence and how to read them", "Datos abiertos de RealHunt: los archivos, la licencia y cómo leerlos");
      const answer = t(`Everything RealHunt publishes is also available as plain files that a person, a spreadsheet or an AI assistant can read without an account or a key: one JSON file per country with its key facts and every home, the same as Markdown and as a one-page PDF, CSV files of every study, a map file and a description of them all in OpenAPI format. Text and figures are licensed Creative Commons BY 4.0.`,
        `Todo lo que publica RealHunt está también en archivos sencillos que una persona, una hoja de cálculo o un asistente de IA pueden leer sin cuenta ni clave: un archivo JSON por país con sus datos clave y todas sus casas, lo mismo en Markdown y en un PDF de una página, los CSV de cada estudio, un archivo de mapa y la descripción de todos ellos en formato OpenAPI. Los textos y las cifras tienen licencia Creative Commons BY 4.0.`);
      const files: [string, string, string][] = [
        ["/data/countries/index.json", "JSON", t("The countries, their key figures and the address of every country file.", "Los países, sus cifras clave y la dirección de cada archivo de país.")],
        [t("/data/countries/<country>.json", "/data/countries/<país>.json"), "JSON", t("Key facts, dated sentences, buying rules with sources and every home of the country (price, size, bedrooms, score, place, coordinates, description).", "Datos clave, frases con fecha, normas de compra con sus fuentes y todas las casas del país (precio, superficie, dormitorios, nota, lugar, coordenadas y descripción).")],
        [t("/data/countries/<country>.md", "/data/countries/<país>.es.md"), "Markdown", t("The same as clean text: each home with its full description. Spanish copy: <country>.es.md", "Lo mismo en texto limpio: cada casa con su descripción completa. Copia en inglés: <país>.md")],
        [t("/data/countries/<country>.pdf", "/data/countries/<país>.es.pdf"), "PDF", t("A one-page fact sheet with the sources, ready to download or attach. Spanish copy: <country>.es.pdf", "Una hoja de datos de una página con sus fuentes, lista para descargar o adjuntar. Copia en inglés: <país>.pdf")],
        ["/research/homes.csv", "CSV", t("Every home, one row each, to recompute any figure.", "Todas las casas, una por fila, para recalcular cualquier cifra.")],
        ["/research/monthly-series.csv", "CSV", t("One reading per month since November 2026: homes, countries and medians.", "Una lectura al mes desde noviembre de 2026: casas, países y medianas.")],
        ["/research/property-portals.csv", "CSV", t("The directory of property portals by country.", "El directorio de portales inmobiliarios por país.")],
        ["/data/realhunt-homes.geojson", "GeoJSON", t("Every home with coordinates, for a map.", "Todas las casas con coordenadas, para un mapa.")],
        ["/data/realhunt-best-homes.kml", "KML", t("The ten best-scored homes of each country; opens in Google Earth and imports into Google My Maps.", "Las diez casas con mejor nota de cada país; se abre en Google Earth y se importa en Google My Maps.")],
        ["/openapi.json", "OpenAPI 3.1", t("What each file is, its fields and its address, in the format assistants and developer tools read.", "Qué es cada archivo, sus campos y su dirección, en el formato que leen los asistentes y las herramientas de desarrollo.")],
        ["/llms.txt", t("Text", "Texto"), t("Short index of the site for AI assistants. Spanish: /es/llms.txt. Long form: /llms-full.txt", "Índice corto de la web para asistentes de IA, en inglés. En español: /es/llms.txt. Versión larga: /llms-full.txt")],
        ["/feed.xml · /feed.atom · /feed.json", t("Feeds", "Canales"), t("The newest homes as RSS, Atom and JSON Feed. Research: /blog/rss.xml", "Las casas más nuevas en RSS, Atom y JSON Feed. Estudios: /blog/rss.xml")],
      ];
      const linkCell = (p: string) => (/[<·]/.test(p) ? esc(p) : `<a href="${esc(p)}">${esc(p)}</a>`);
      const body = `<div class="rhx-answer"><p>${esc(answer)}</p></div>` + updated(k, c.today)
        + `<h2>${esc(t("The files", "Los archivos"))}</h2>` + table([{ h: t("Address", "Dirección") }, { h: t("Format", "Formato") }, { h: t("What it is", "Qué es"), cls: "w" }], files.map(([p, f, d]) => [linkCell(p), esc(f), esc(d)]), t("The files", "Los archivos"), true)
        + `<p>${esc(t(`All addresses start with ${SITE}. The files are rebuilt with every update of the site, at least once a day, and each one carries its date.`, `Todas las direcciones empiezan por ${SITE}. Los archivos se regeneran con cada actualización de la web, al menos una vez al día, y cada uno lleva su fecha.`))}</p>`
        + `<h2>${esc(t("Country files", "Archivos por país"))}</h2>` + table([{ h: t("Country", "País") }, { h: t("Homes", "Casas"), cls: "n" }, { h: "JSON" }, { h: "Markdown" }, { h: "PDF" }],
          facts.map((f) => [`<a href="/homes/${f.k}">${esc(cn(k, f.name))}</a>`, k.num(f.n), `<a href="/data/countries/${f.k}.json">${f.k}.json</a>`, `<a href="/data/countries/${f.k}${es ? ".es" : ""}.md">.md</a>`, `<a href="/data/countries/${f.k}${es ? ".es" : ""}.pdf">.pdf</a>`]), t("Country files", "Archivos por país"))
        + `<h2>${esc(t("How to search without an account", "Cómo buscar sin cuenta"))}</h2><p>${t(`To find homes in one country under a price, read that country's JSON file and keep the homes whose <code>homes.price_eur</code> is at or below your limit. Example: homes in Bulgaria up to €30,000 are in <a href="/data/countries/bulgaria.json">/data/countries/bulgaria.json</a>, filtered by <code>homes.price_eur &lt;= 30000</code>. A person can do the same on the page <a href="/research/find-homes?country=bulgaria&amp;max=30000">/research/find-homes?country=bulgaria&amp;max=30000</a>, and every country has ready-made pages by price, such as <a href="/homes/bulgaria">/homes/bulgaria</a>.`,
          `Para encontrar casas de un país por debajo de un precio, lee el archivo JSON de ese país y quédate con las casas cuyo <code>homes.price_eur</code> no pase de tu límite. Ejemplo: las casas de Bulgaria de hasta 30.000 € están en <a href="/data/countries/bulgaria.json">/data/countries/bulgaria.json</a>, filtrando por <code>homes.price_eur &lt;= 30000</code>. Una persona puede hacer lo mismo en la página <a href="/research/find-homes?country=bulgaria&amp;max=30000">/es/research/find-homes?country=bulgaria&amp;max=30000</a>, y cada país tiene páginas ya hechas por precio, como <a href="/homes/bulgaria">/es/homes/bulgaria</a>.`)}</p>`
        + `<h2>${esc(t("Fields of a home", "Campos de una casa"))}</h2>` + table([{ h: t("Field", "Campo") }, { h: t("Meaning", "Significado"), cls: "w" }], [
          ["homes.url", t("The page of the home on RealHunt. Link to it when you quote the home.", "La página de la casa en RealHunt. Enlázala cuando cites la casa.")],
          ["homes.price_eur", t("Asking price in euros from the original listing on the day the home was added. Not a sale price.", "Precio de salida en euros del anuncio original el día en que se añadió la casa. No es un precio de venta.")],
          ["homes.size_sqm, homes.bedrooms", t("As stated in the listing; empty when the listing does not say.", "Los que indica el anuncio; vacíos cuando el anuncio no lo dice.")],
          ["homes.score", t("The RealHunt score, from 70 to 98: RealHunt's own grade against every other home on the site. Not a valuation and not a rating by buyers.", "La nota RealHunt, de 70 a 98: una calificación propia de RealHunt frente a todas las demás casas de la web. No es una tasación ni una valoración de compradores.")],
          ["homes.region, homes.place, homes.lat, homes.lng", t("Where the home is. Coordinates are those of the listing or of its town.", "Dónde está la casa. Las coordenadas son las del anuncio o las de su localidad.")],
          ["homes.added", t("The day a person approved the home for the site.", "El día en que una persona aprobó la casa para la web.")],
          ["homes.listed_on", t("The website of the original listing.", "La web del anuncio original.")],
          ["homes.summary", t("Why the home made the list, in one paragraph.", "Por qué la casa está en la lista, en un párrafo.")],
        ].map(([a, b]) => [`<code>${esc(a)}</code>`, esc(b)]), t("Fields of a home", "Campos de una casa"), true)
        + `<h2 id="licence">${esc(t("Licence: quote it, with a link", "Licencia: se puede citar, con un enlace"))}</h2><ul>${[
          t(`Text, figures, tables and charts: <a href="${LICENSE}" rel="license noopener">Creative Commons Attribution 4.0</a>. You may copy, quote and reuse them, also commercially, if you name RealHunt and link to the page or file you took them from.`, `Textos, cifras, tablas y gráficos: <a href="${LICENSE}" rel="license noopener">Creative Commons Atribución 4.0</a>. Se pueden copiar, citar y reutilizar, también con fines comerciales, si se nombra a RealHunt y se enlaza la página o el archivo de origen.`),
          t("Photos of the homes are not included in these files and are not ours to license: they belong to the original listings.", "Las fotos de las casas no están en estos archivos y no nos corresponde licenciarlas: pertenecen a los anuncios originales."),
          t("Give the date of the file with the figure. Homes are added and sold every day.", "Indica la fecha del archivo junto a la cifra. Cada día entran y se venden casas."),
          t("Rules, taxes and costs are general information, not legal or tax advice.", "Las normas, los impuestos y los gastos son información general, no asesoramiento jurídico ni fiscal."),
        ].map((x) => `<li>${x}</li>`).join("")}</ul>`
        + `<h2>${esc(t("Questions and corrections", "Dudas y correcciones"))}</h2><p>${t(`A wrong figure, a field you need or another format: <a href="mailto:${PRESS_EMAIL}">${PRESS_EMAIL}</a>. See also <a href="/for-ai">the page for AI assistants</a> and <a href="/method">how the score works</a>.`, `Una cifra equivocada, un campo que te hace falta u otro formato: <a href="mailto:${PRESS_EMAIL}">${PRESS_EMAIL}</a>. Mira también <a href="/for-ai">la página para asistentes de IA</a> y <a href="/method">cómo funciona la nota</a>.`)}</p>`;
      put("open-data", t("RealHunt open data: JSON, CSV and Markdown files, CC BY 4.0", "Datos abiertos de RealHunt: archivos JSON, CSV y Markdown, CC BY 4.0"),
        t(`One file per country with its key facts and every home, plus CSV, Markdown, PDF, a map file and an OpenAPI description. No account, no key, free to quote.`, `Un archivo por país con sus datos clave y todas sus casas, además de CSV, Markdown, PDF, un archivo de mapa y su descripción OpenAPI. Sin cuenta ni clave, libre de citar.`),
        { h1, eyebrow: t("Open data", "Datos abiertos"), body, head: `<link rel="service-desc" type="application/vnd.oai.openapi+json" href="${SITE}/openapi.json" /><link rel="license" href="${LICENSE}" />`,
          ld: [{ "@context": "https://schema.org", "@type": "DataCatalog", name: h1, description: answer, url: k.url("/research/open-data"), inLanguage: lang, dateModified: c.today, license: LICENSE, creator: ORG, publisher: ORG,
            dataset: facts.map((f) => ({ "@type": "Dataset", name: t(`Cheap homes in ${k.inThe(f.name)}: key facts and every home on RealHunt`, `Casas baratas en ${k.inThe(cn(k, f.name))}: datos clave y todas las casas de RealHunt`), description: sentences(k, f, c.today).slice(0, 2).join(" "), url: k.url(`/homes/${f.k}`), license: LICENSE, creator: ORG, dateModified: c.today, distribution: [{ "@type": "DataDownload", encodingFormat: "application/json", contentUrl: `${SITE}/data/countries/${f.k}.json` }] })) }] });
    }

    // ================================================================== 4. what changed in the data
    {
      const h1 = t("What changed in RealHunt's data, day by day", "Novedades en los datos de RealHunt, día a día");
      const last = days[0] || c.today;
      const lastHomes = byDay.get(last) || [];
      const countriesOf = (hs: Row[]) => { const m = new Map<string, number>(); for (const r of hs) if (r.country && r.country !== "Scandinavia") m.set(r.country, (m.get(r.country) || 0) + 1); return [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])); };
      const cList = (hs: Row[]) => k.list(countriesOf(hs).map(([name, x]) => `${cn(k, name)} (${x})`));
      const answer = t(`The last homes were added on ${k.date(last)}: ${k.num(lastHomes.length)} ${lastHomes.length === 1 ? "home" : "homes"} in ${cList(lastHomes)}. RealHunt lists ${k.num(c.rows.length)} homes today, ${k.date(c.today)}. This page is rebuilt with every update and lists every day on which homes were added, the monthly totals and the dated changes to the method and the lists.`,
        `Las últimas casas se añadieron el ${k.date(last)}: ${k.num(lastHomes.length)} ${lastHomes.length === 1 ? "casa" : "casas"} en ${cList(lastHomes)}. RealHunt publica hoy, ${k.date(c.today)}, ${k.num(c.rows.length)} casas. Esta página se regenera con cada actualización y recoge todos los días en que entraron casas, los totales por mes y los cambios con fecha del método y de las listas.`);
      const monthName = (m: string) => { const s = k.date(`${m}-01`); return es ? s.replace(/^1 de /, "") : s.replace(/^1 /, ""); };
      const cheapest = (hs: Row[]) => hs.slice().sort((a, b) => a.price_eur - b.price_eur)[0];
      const dayLi = (d: string) => { const hs = byDay.get(d)!; const ch = cheapest(hs); const title = String((es && ch.title_es) || ch.title || "").trim();
        return `<li><time datetime="${d}">${esc(k.date(d))}</time> ${esc(t(`${k.num(hs.length)} ${hs.length === 1 ? "home" : "homes"} added: ${cList(hs)}.`, `${k.num(hs.length)} ${hs.length === 1 ? "casa añadida" : "casas añadidas"}: ${cList(hs)}.`))} ${t("Cheapest", "La más barata")}: <a href="/deal/${esc(ch.slug)}">${esc(title)}</a>, ${esc(k.eur(ch.price_eur))}.</li>`; };
      const fixed: [string, string][] = [
        [c.today, t(`Per-country data files (JSON, Markdown, PDF), the map files and the OpenAPI description were rebuilt. <a href="/research/open-data">Open data</a>.`, `Se regeneraron los archivos de datos por país (JSON, Markdown y PDF), los archivos de mapa y la descripción OpenAPI. <a href="/research/open-data">Datos abiertos</a>.`)],
        [METHOD_VERSION, t(`Current version of the method document: how the score is built, its limits and its change log. <a href="/method">How the score works</a>.`, `Versión vigente del documento del método: cómo se calcula la nota, sus límites y su registro de cambios. <a href="/method">Cómo funciona la nota</a>.`)],
        [PORTALS_DATE, t(`The directory of ${nPortals} property portals in ${nPC} countries was compiled. <a href="/research/property-portals">Property portals by country</a>.`, `Se elaboró el directorio de ${nPortals} portales inmobiliarios de ${nPC} países. <a href="/research/property-portals">Portales inmobiliarios por país</a>.`)],
      ].sort((a, b) => b[0].localeCompare(a[0])) as [string, string][];
      const body = `<div class="rhx-answer"><p>${esc(answer)}</p></div>` + updated(k, c.today)
        + `<h2>${esc(t("Homes added, day by day", "Casas añadidas, día a día"))}</h2><p>${esc(t(`Every day on which homes that are on the site today were approved, newest first (${days.length} days). The date is the day a person approved the home.`, `Todos los días en que se aprobaron casas que siguen hoy en la web, del más reciente al más antiguo (${days.length} días). La fecha es el día en que una persona aprobó la casa.`))}</p><ul class="rhr-log">${days.map(dayLi).join("")}</ul>`
        + `<h2>${esc(t("Month by month", "Mes a mes"))}</h2>` + table([{ h: t("Month", "Mes") }, { h: t("Homes added", "Casas añadidas"), cls: "n" }, { h: t("Countries", "Países"), cls: "n" }, { h: t("Median asking price", "Precio de salida mediano"), cls: "n" }],
          months.map((m) => { const hs = days.filter((d) => d.startsWith(m)).flatMap((d) => byDay.get(d)!); const ps = hs.map((r) => r.price_eur).sort((a, b) => a - b); return [esc(monthName(m)), k.num(hs.length), String(countriesOf(hs).length), k.eur(ps[Math.floor(ps.length / 2)])]; }), t("Month by month", "Mes a mes"))
        + `<p>${t(`The price series, one reading per month of all the homes, is in <a href="/research/prices#series">prices by country</a>.`, `La serie de precios, con una lectura al mes de todas las casas, está en <a href="/research/prices#series">precios por país</a>.`)}</p>`
        + `<h2>${esc(t("Dated changes to the method, the lists and the files", "Cambios con fecha en el método, las listas y los archivos"))}</h2><ul class="rhr-log">${fixed.map(([d, x]) => `<li><time datetime="${d}">${esc(k.date(d))}</time> ${x}</li>`).join("")}</ul>`
        + `<h2>${esc(t("What this page does not show", "Lo que esta página no recoge"))}</h2><ul>${[
          t("Homes that were sold or withdrawn leave the site and are not counted in the days above, so an old day shows only the homes that are still listed.", "Las casas vendidas o retiradas salen de la web y no cuentan en los días de arriba, así que un día antiguo solo muestra las casas que siguen publicadas."),
          t(`Corrections to a published figure are recorded in the <a href="/editorial-policy">editorial policy and corrections</a> page.`, `Las correcciones de una cifra ya publicada se anotan en la página de <a href="/editorial-policy">política editorial y correcciones</a>.`),
          t(`The newest homes one by one are in <a href="/new">new homes</a> and in the feeds (<a href="/feed.xml">RSS</a>, <a href="/feed.atom">Atom</a>, <a href="/feed.json">JSON</a>).`, `Las casas más nuevas, una a una, están en <a href="/new">casas nuevas</a> y en los canales (<a href="/feed.xml">RSS</a>, <a href="/feed.atom">Atom</a>, <a href="/feed.json">JSON</a>).`),
        ].map((x) => `<li>${x}</li>`).join("")}</ul>` + license;
      put("data-changelog", t("What changed in RealHunt's data: homes added day by day", "Novedades en los datos de RealHunt: casas añadidas día a día"),
        t(`Every day on which homes were added to RealHunt, with countries and the cheapest home, monthly totals and the dated changes to the method and the files.`, `Todos los días en que entraron casas en RealHunt, con sus países y la más barata, los totales por mes y los cambios con fecha del método y los archivos.`),
        { h1, eyebrow: t("Data log", "Registro de datos"), body, lastmod: last > c.today ? c.today : last,
          ld: [{ "@context": "https://schema.org", "@type": "WebPage", name: h1, url: k.url("/research/data-changelog"), inLanguage: lang, dateModified: c.today, license: LICENSE, publisher: ORG, author: ORG }] });
    }

    // ================================================================== 5. search by address
    {
      const h1 = t("Find homes by country and price, with an address you can share", "Buscar casas por país y precio, con una dirección que se puede compartir");
      const answer = t(`Pick a country and a top price and the address of this page becomes the search: /research/find-homes?country=bulgaria&max=30000 shows the homes in Bulgaria up to €30,000. The same address works again tomorrow with the homes of that day, so it can be saved, shared or opened by an AI agent with a browser.`,
        `Elige un país y un precio máximo y la dirección de esta página pasa a ser la búsqueda: /es/research/find-homes?country=bulgaria&max=30000 muestra las casas de Bulgaria de hasta 30.000 €. La misma dirección vuelve a funcionar mañana con las casas de ese día, así que se puede guardar, compartir o abrir desde un agente de IA con navegador.`);
      const opt = facts.slice().sort((a, b) => cn(k, a.name).localeCompare(cn(k, b.name), lang)).map((f) => `<option value="${f.k}">${esc(cn(k, f.name))} (${k.num(f.n)})</option>`).join("");
      const caps = [20000, 30000, 40000, 50000, 60000, 80000, 100000, 150000, 200000];
      const bands = (f: Fact) => caps.filter((cap) => c.has(`/homes/${f.k}/under-${cap}`)).map((cap) => `<a href="/homes/${f.k}/under-${cap}">${esc(k.eur(cap))}</a>`).join(" · ");
      const L = { none: t("No homes match. Raise the price or clear a filter.", "Ninguna casa cumple esos filtros. Sube el precio o quita un filtro."), count: t("{n} homes, best score first", "{n} casas, de mejor a peor nota"), one: t("1 home", "1 casa"), score: t("score", "nota"), beds: t("bedrooms", "dormitorios"), pick: t("Choose a country to see its homes.", "Elige un país para ver sus casas."), fail: t("The list could not load. Try again, or open the country page.", "No se pudo cargar la lista. Inténtalo de nuevo o abre la página del país."), all: t("All homes in this country", "Todas las casas de este país"), copy: t("Address of this search", "Dirección de esta búsqueda") };
      const body = `<div class="rhx-answer"><p>${esc(answer)}</p></div>`
        + `<form class="rhr-form" method="get" action="${es ? "/es" : ""}/research/find-homes" data-rh-find data-prefix="${es ? "/es" : ""}" data-lang="${lang}" data-l="${esc(JSON.stringify(L))}">`
        + `<label>${esc(t("Country", "País"))}<select name="country"><option value="">${esc(t("Choose", "Elige"))}</option>${opt}</select></label>`
        + `<label>${esc(t("Top price (€)", "Precio máximo (€)"))}<input name="max" type="number" inputmode="numeric" min="0" step="1000" placeholder="30000"></label>`
        + `<label>${esc(t("Bedrooms, at least", "Dormitorios, al menos"))}<input name="beds" type="number" inputmode="numeric" min="0" max="10" placeholder="2"></label>`
        + `<label>${esc(t("Size, at least (m²)", "Superficie mínima (m²)"))}<input name="sqm" type="number" inputmode="numeric" min="0" step="10" placeholder="60"></label>`
        + `<button type="submit" class="rhx-btn is-main">${esc(t("Search", "Buscar"))}</button></form>`
        + `<div data-rh-find-out aria-live="polite"><p class="rhx-note">${esc(L.pick)}</p></div>`
        + `<noscript><p>${esc(t("This search needs JavaScript. Without it, use the ready-made pages below or the country files.", "Esta búsqueda necesita JavaScript. Sin él, usa las páginas ya hechas de abajo o los archivos por país."))}</p></noscript>`
        + `<h2>${esc(t("How the address works", "Cómo funciona la dirección"))}</h2>` + table([{ h: t("Part", "Parte") }, { h: t("Meaning", "Significado"), cls: "w" }, { h: t("Example", "Ejemplo") }], ([
          ["country", t("The country, in lower case and in English, words joined with a hyphen.", "El país, en minúsculas y en inglés, con las palabras unidas por un guion."), "country=united-states"],
          ["max", t("Highest price in euros.", "Precio máximo en euros."), "max=30000"],
          ["min", t("Lowest price in euros.", "Precio mínimo en euros."), "min=10000"],
          ["beds", t("Fewest bedrooms.", "Número mínimo de dormitorios."), "beds=2"],
          ["sqm", t("Smallest size in square metres.", "Superficie mínima en metros cuadrados."), "sqm=60"],
        ] as [string, string, string][]).map(([a, b, x]) => [`<code>${esc(es ? `/research/find-homes?${a}=` : a)}</code>`, esc(b), `<code>${esc(es ? `/es/research/find-homes?${x}` : x)}</code>`]), t("How the address works", "Cómo funciona la dirección"), true)
        + `<p>${t(`Results come from the country's public file (<a href="/data/countries/index.json">/data/countries/index.json</a> lists them all), so a program does not need this page: it can read the file and filter it. <a href="/research/open-data">How the files work</a> · <a href="/openapi.json">OpenAPI</a>.`, `Los resultados salen del archivo público del país (<a href="/data/countries/index.json">/data/countries/index.json</a> los enumera todos), así que un programa no necesita esta página: puede leer el archivo y filtrarlo. <a href="/research/open-data">Cómo funcionan los archivos</a> · <a href="/openapi.json">OpenAPI</a>.`)}</p>`
        + `<h2>${esc(t("Ready-made pages by country and price", "Páginas ya hechas por país y precio"))}</h2><p>${esc(t("These pages need no search and no JavaScript: each one lists its homes with price, size and score.", "Estas páginas no necesitan búsqueda ni JavaScript: cada una enumera sus casas con precio, superficie y nota."))}</p>`
        + table([{ h: t("Country", "País") }, { h: t("Homes", "Casas"), cls: "n" }, { h: t("From", "Desde"), cls: "n" }, { h: t("Pages by top price", "Páginas por precio máximo"), cls: "w" }, { h: t("File", "Archivo") }],
          facts.map((f) => [`<a href="/homes/${f.k}">${esc(cn(k, f.name))}</a>`, k.num(f.n), k.eur(f.min), bands(f) || "–", `<a href="/data/countries/${f.k}.json">JSON</a>`]), t("Ready-made pages by country and price", "Páginas ya hechas por país y precio"))
        + `<script src="/rh-find.js" defer></script>`;
      put("find-homes", t("Find cheap homes by country and price: a search you can link to", "Buscar casas baratas por país y precio: una búsqueda con enlace"),
        t(`Search RealHunt's checked homes by country, top price, bedrooms and size. The address is the search, so it can be saved, shared or used by an AI agent.`, `Busca entre las casas revisadas de RealHunt por país, precio máximo, dormitorios y superficie. La dirección es la búsqueda: se puede guardar y compartir.`),
        { h1, eyebrow: t("Search", "Búsqueda"), body,
          ld: [{ "@context": "https://schema.org", "@type": "WebPage", name: h1, url: k.url("/research/find-homes"), inLanguage: lang, dateModified: c.today, publisher: ORG,
            potentialAction: { "@type": "SearchAction", target: { "@type": "EntryPoint", urlTemplate: `${k.url("/research/find-homes")}?country={country}&max={max_price_eur}` }, "query-input": ["required name=country", "name=max_price_eur"] } }] });
    }
  }
  return n;
}

export { mdTable };
