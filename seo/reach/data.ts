// Country facts and the files made for machines (15-nov-2026), all computed at build time from the snapshot
// (public/data/rh-static.json) and src/data/*.json. Nothing here is typed by hand, so a file can never say something
// the site does not:
//   /data/countries/index.json            the countries, their key figures and the address of every file
//   /data/countries/<country>.json        key facts, buying rules and every home (public fields, no photos)
//   /data/countries/<country>.md, .es.md  the same as clean text, each home with its description
//   /data/countries/<country>.pdf, .es.pdf  a one-page fact sheet with its sources
//   /data/realhunt-homes.geojson          every home with coordinates
//   /data/realhunt-best-homes.kml         the best-scored homes of each country, for Google Earth or My Maps
//   /openapi.json                         what each file is and how to read it (OpenAPI 3.1)
import fs from "fs";
import path from "path";
import { regionOf } from "../../src/community/regions";
import { costRange } from "../../src/community/seo2data";
import { MIN_RANK, MIN_SHOW, cKey, countryStats, type CountryStat, type Home } from "../assetsStats";
import { LICENSE, PRESS_EMAIL, SITE, kit, mdTable, type Kit, type Lang } from "../assetsKit";
import { makePdf, pdfPages, type Line } from "./pdf";
import { countryEs } from "./portals";

export type Row = Home & { lat?: number | null; lng?: number | null; why_great?: string; why_great_es?: string; category?: string; publish_at?: string | null; approved_at?: string | null; video_url?: string | null; image_urls?: string[] };
export type Fact = CountryStat & {
  costs: [number, number] | null; asOf: string; rule: string; breakdown: string; tax: string; rental: string; sources: string[];
  steps: [string, string][]; yearly: string; homes: Row[]; pages: { homes: boolean; costs: boolean; guide: boolean; canBuy: boolean };
};

export const write = (root: string, rel: string, data: string | Buffer) => { const f = path.join(root, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, data); };
const str = (v: unknown) => (v == null || v === "None" ? "" : String(v).trim());
export const added = (r: Row) => String(r.approved_at || r.publish_at || "").slice(0, 10);
const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The facts of every country with at least MIN_SHOW homes, most homes first. `has` says whether a page exists. */
export function countryFacts(rows: Row[], dest: Record<string, any>, guides: Record<string, any>, has: (p: string) => boolean): Fact[] {
  const ranked = rows.slice().sort((a, b) => (Number(b.nota) || 0) - (Number(a.nota) || 0) || a.price_eur - b.price_eur);
  return countryStats(rows).filter((c) => c.n >= MIN_SHOW && has(`/homes/${c.k}`)).sort((a, b) => b.n - a.n || a.name.localeCompare(b.name)).map((c) => {
    const d = dest[c.k] || {}, g = guides[c.k] || {};
    return {
      ...c, costs: costRange(d.purchase_costs_pct), asOf: str(d.as_of), rule: str(d.can_foreigners_buy), breakdown: str(d.purchase_costs_breakdown), tax: str(d.annual_property_tax),
      rental: str(d.rental_income_tax), sources: Array.isArray(d.sources) ? d.sources.filter((s: unknown) => /^https?:\/\//.test(String(s))) : [],
      steps: Array.isArray(g.steps) ? g.steps : [], yearly: str(g.yearly), homes: ranked.filter((r) => cKey(r.country) === c.k),
      pages: { homes: true, costs: has(`/costs/${c.k}`), guide: has(`/guide/${c.k}`), canBuy: has("/can-i-buy") },
    };
  });
}

/** The name of the country in the language of the page. */
export const cName = (k: Kit, f: { name: string }) => (k.es ? countryEs(f.name) : f.name);

/** Full sentences with their date, each one quotable on its own. */
export function sentences(k: Kit, f: Fact, today: string): string[] {
  const { t } = k, inN = k.inThe(cName(k, f));
  const out = [
    t(`On ${k.date(today)}, RealHunt lists ${k.num(f.n)} homes for sale in ${inN}, each one checked by a person.`, `A ${k.date(today)}, RealHunt publica ${k.num(f.n)} casas en venta en ${inN}, revisadas una a una por una persona.`),
    t(`In ${inN}, the median asking price of those ${k.num(f.n)} homes is ${k.eur(f.medPrice)}${f.medPpsqm ? ` (${k.eur(f.medPpsqm)} per m², from the ${k.num(f.nSqm)} homes with a known size)` : ""}; the cheapest costs ${k.eur(f.min)} and the most expensive ${k.eur(f.max)}.`,
      `En ${inN}, el precio de salida mediano de esas ${k.num(f.n)} casas es de ${k.eur(f.medPrice)}${f.medPpsqm ? ` (${k.eur(f.medPpsqm)} por m², calculado con las ${k.num(f.nSqm)} casas de superficie conocida)` : ""}; la más barata cuesta ${k.eur(f.min)} y la más cara, ${k.eur(f.max)}.`),
  ];
  if (f.costs) out.push(t(`Taxes and fees add about ${k.pct(f.costs[0], f.costs[1])} to the price of a home in ${inN}${f.asOf ? ` (figures as of ${f.asOf})` : ""}.`, `Los impuestos y gastos de compra suman alrededor del ${k.pct(f.costs[0], f.costs[1])} del precio de una casa en ${inN}${f.asOf ? ` (cifras de ${f.asOf})` : ""}.`));
  if (f.small) out.push(t(`With ${k.num(f.n)} homes this is a small sample, so the median for ${inN} is a rough guide.`, `Con ${k.num(f.n)} casas la muestra es pequeña, así que la mediana de ${inN} es solo orientativa.`));
  return out;
}

/** The rows of the "key facts" table of a country: [label, value]. Only what the data has. */
export function keyFacts(k: Kit, f: Fact, today: string): [string, string][] {
  const { t } = k;
  const rows: [string, string][] = [
    [t("Homes on RealHunt", "Casas en RealHunt"), k.num(f.n) + (f.small ? ` (${t("small sample", "muestra pequeña")})` : "")],
    [t("Median asking price", "Precio de salida mediano"), k.eur(f.medPrice)],
  ];
  if (f.medPpsqm) rows.push([t("Median price per m²", "Precio mediano por m²"), `${k.eur(f.medPpsqm)} (${t(`${k.num(f.nSqm)} homes with a known size`, `${k.num(f.nSqm)} casas de superficie conocida`)})`]);
  if (f.medSqm) rows.push([t("Median size", "Superficie mediana"), `${k.num(f.medSqm)} m²`]);
  rows.push([t("Cheapest and most expensive", "La más barata y la más cara"), `${k.eur(f.min)} · ${k.eur(f.max)}`]);
  if (f.medScore) rows.push([t("Median RealHunt score (70 to 98)", "Nota RealHunt mediana (de 70 a 98)"), String(f.medScore)]);
  if (f.costs) rows.push([t("Taxes and fees to buy", "Impuestos y gastos de compra"), `${k.pct(f.costs[0], f.costs[1])} ${t("of the price", "del precio")}${f.asOf ? ` (${t("as of", "cifras de")} ${f.asOf})` : ""}`]);
  if (f.rule) rows.push([t("Can foreigners buy?", "¿Puede comprar un extranjero?"), f.rule]);
  if (f.tax) rows.push([t("Yearly property tax", "Impuesto anual sobre la vivienda"), f.tax]);
  rows.push([t("Date of these figures", "Fecha de estas cifras"), k.date(today)]);
  return rows;
}

const homeTitle = (k: Kit, r: Row) => String((k.es && r.title_es) || r.title || "").replace(/\s+/g, " ").trim();
const homeText = (k: Kit, r: Row) => String((k.es && r.why_great_es) || r.why_great || "").replace(/\s+/g, " ").trim();

function countryMd(k: Kit, f: Fact, today: string): string {
  const { t } = k, name = cName(k, f), p = `/data/countries/${f.k}`;
  const head = `# ${t(`Cheap homes in ${k.inThe(name)}: key facts and every home on RealHunt`, `Casas baratas en ${k.inThe(name)}: datos clave y todas las casas de RealHunt`)}\n\n${sentences(k, f, today).join(" ")}\n\n`
    + `${t("Source", "Fuente")}: RealHunt, ${k.url(`/homes/${f.k}`)} · ${t("Updated", "Actualizado el")} ${k.date(today)} · ${t("Licence", "Licencia")}: CC BY 4.0 (${t("text and figures; the photos belong to the original listings", "textos y cifras; las fotos pertenecen a los anuncios originales")}).\n${t("Also as", "También en")} JSON: ${SITE}${p}.json · PDF: ${SITE}${p}${k.es ? ".es" : ""}.pdf\n\n`;
  const facts = `## ${t("Key facts", "Datos clave")}\n\n${mdTable([t("Fact", "Dato"), t("Value", "Valor")], keyFacts(k, f, today))}\n`;
  const buy = (f.breakdown || f.rental || f.yearly) ? `## ${t("Costs and taxes", "Gastos e impuestos")}\n\n${[f.breakdown && `${t("What the buying costs are made of", "De qué se componen los gastos de compra")}: ${f.breakdown}`, f.yearly && `${t("Every year", "Cada año")}: ${f.yearly}`, f.rental && `${t("Tax on rental income", "Impuesto sobre los alquileres")}: ${f.rental}`].filter(Boolean).map((x) => `- ${x}`).join("\n")}\n\n${t("General information, not legal or tax advice.", "Información general, no asesoramiento jurídico ni fiscal.")}${f.sources.length ? `\n\n${t("Sources", "Fuentes")}:\n${f.sources.map((s) => `- ${s}`).join("\n")}` : ""}\n\n` : "";
  const steps = f.steps.length ? `## ${t(`How to buy in ${k.inThe(name)}, step by step`, `Cómo se compra en ${k.inThe(name)}, paso a paso`)}\n\n${f.steps.map(([h, x], i) => `${i + 1}. **${h}.** ${x}`).join("\n")}\n\n${t("Full guide", "Guía completa")}: ${k.url(`/guide/${f.k}`)}\n\n` : "";
  const homes = `## ${t(`The ${k.num(f.homes.length)} homes, best score first`, `Las ${k.num(f.homes.length)} casas, de mejor a peor nota`)}\n\n` + f.homes.map((r) =>
    `### ${homeTitle(k, r)}\n\n${[k.eur(r.price_eur), r.location_name, r.sqm ? `${r.sqm} m²` : "", r.bedrooms ? t(`${r.bedrooms} bedrooms`, `${r.bedrooms} dormitorios`) : "", r.nota != null ? t(`RealHunt score ${r.nota}`, `nota RealHunt ${r.nota}`) : "", added(r) ? t(`added ${added(r)}`, `añadida el ${added(r)}`) : ""].filter(Boolean).join(" · ")}\n\n${homeText(k, r)}\n\n${k.url(`/deal/${r.slug}`)}\n`).join("\n");
  return head + facts + buy + steps + homes;
}

/** The lines of the fact sheet. `level` trims it until it fits on one page: 1 sources as one line, 2 one home,
 * 3 no homes, 4 and 5 smaller type. Nothing is cut silently: what is left out is one click away on the page named. */
function sheetLines(k: Kit, f: Fact, today: string, level: number): Line[] {
  const { t } = k, name = cName(k, f), z = level >= 5 ? 0.84 : level >= 4 ? 0.92 : 1;
  const L: Line[] = [
    { text: "RealHunt · realhunt.co", size: 9, color: 0.4 },
    { text: t(`Buying a cheap home in ${k.inThe(name)}: key facts`, `Comprar una casa barata en ${k.inThe(name)}: datos clave`), size: 19, bold: true, gap: 4 },
    { text: t(`Figures of ${k.date(today)}. Source: RealHunt, ${k.url(`/homes/${f.k}`)}`, `Cifras a ${k.date(today)}. Fuente: RealHunt, ${k.url(`/homes/${f.k}`)}`), size: 9, color: 0.4, gap: 2 },
    { text: sentences(k, f, today).join(" "), size: 10.5, gap: 10 },
    { text: t("Key facts", "Datos clave"), size: 13, bold: true, gap: 10 },
  ];
  for (const [a, b] of keyFacts(k, f, today)) L.push({ label: a, text: b, size: 9.5, gap: 4 });
  if (f.breakdown) L.push({ label: t("What the buying costs are made of", "De qué se componen los gastos de compra"), text: f.breakdown, size: 9.5, gap: 4 });
  if (f.rental) L.push({ label: t("Tax on rental income", "Impuesto sobre los alquileres"), text: f.rental, size: 9.5, gap: 4 });
  if (f.steps.length) {
    L.push({ text: t("The steps to buy", "Los pasos de la compra"), size: 13, bold: true, gap: 10 });
    L.push({ text: f.steps.map(([h], i) => `${i + 1}. ${h}`).join("   "), size: 9.5, gap: 2 });
  }
  const best = f.homes.slice(0, level >= 3 ? 0 : level >= 2 ? 1 : 3);
  if (best.length) {
    L.push({ text: t("The best-scored homes today", "Las casas con mejor nota hoy"), size: 13, bold: true, gap: 10 });
    for (const r of best) L.push({ text: `${k.eur(r.price_eur)} · ${homeTitle(k, r)} · ${t("score", "nota")} ${r.nota ?? "-"} · ${SITE.replace("https://", "")}${k.es ? "/es" : ""}/deal/${r.slug}`, size: 9, gap: 3 });
  }
  if (f.sources.length) {
    L.push({ text: t("Sources of the rules and costs", "Fuentes de las normas y los gastos"), size: 13, bold: true, gap: 10 });
    if (level >= 1 && f.pages.costs) L.push({ text: t(`${f.sources.length} sources, listed with their links on ${k.url(`/costs/${f.k}`)}`, `${f.sources.length} fuentes, con sus enlaces en ${k.url(`/costs/${f.k}`)}`), size: 8.5, gap: 1, color: 0.25 });
    else for (const s of f.sources.slice(0, level >= 1 ? 2 : 4)) L.push({ text: s, size: 8, gap: 1, color: 0.25 });
  }
  L.push({ text: t(`Prices are asking prices in euros from the original listings; medians describe the homes RealHunt lists, not the whole market. General information, not legal or tax advice. Free to quote with a link (CC BY 4.0). Questions: ${PRESS_EMAIL}`,
    `Los precios son los de salida de los anuncios originales, en euros; las medianas describen las casas que publica RealHunt, no todo el mercado. Información general, no asesoramiento jurídico ni fiscal. Se puede citar con un enlace (CC BY 4.0). Dudas: ${PRESS_EMAIL}`), size: 8, color: 0.4, gap: 12 });
  return z === 1 ? L : L.map((l) => ({ ...l, size: Math.round((l.size ?? 10) * z * 10) / 10, gap: l.gap ? Math.round(l.gap * z) : l.gap }));
}

function countryPdf(k: Kit, f: Fact, today: string): Buffer {
  const { t } = k, name = cName(k, f);
  const meta = { title: t(`Buying a cheap home in ${k.inThe(name)}: key facts`, `Comprar una casa barata en ${k.inThe(name)}: datos clave`), subject: `${SITE}/data/countries/${f.k}.json`, lang: k.lang };
  let pdf = makePdf(sheetLines(k, f, today, 0), meta);
  for (let level = 1; level <= 5 && pdfPages(pdf) > 1; level++) pdf = makePdf(sheetLines(k, f, today, level), meta);
  return pdf;
}

const publicHome = (r: Row) => ({
  url: `${SITE}/deal/${r.slug}`, title: String(r.title || "").replace(/\s+/g, " ").trim(), title_es: r.title_es ? String(r.title_es).replace(/\s+/g, " ").trim() : null, country: r.country || null, region: regionOf(r as any) || null, place: r.location_name || null,
  price_eur: r.price_eur, size_sqm: r.sqm ?? null, bedrooms: r.bedrooms ?? null, score: r.nota ?? null, added: added(r) || null,
  lat: r.lat ?? null, lng: r.lng ?? null, listed_on: r.source_domain || null, summary: String(r.why_great || "").replace(/\s+/g, " ").trim() || null,
});

/** Writes every file of /data and /openapi.json. Returns how many files it wrote. */
export function writeDataFiles(root: string, both: Record<Lang, Fact[]>, rows: Row[], today: string): number {
  const facts = both.en, esOf = new Map(both.es.map((f) => [f.k, f]));
  let n = 0;
  const put = (rel: string, data: string | Buffer) => { write(root, rel, data); n++; };
  const en = kit("en");
  const note = "Asking prices in euros from the original listing on the day each home was added. Medians describe the homes RealHunt lists (cheap for their country, checked by a person), not a country's whole market. Rules, taxes and costs are general information, not legal or tax advice.";
  for (const f of facts) {
    const base = `data/countries/${f.k}`;
    put(`${base}.json`, JSON.stringify({
      country: f.name, key: f.k, updated: today, source: `${SITE}/homes/${f.k}`, license: LICENSE, attribution: "RealHunt (realhunt.co)", note,
      sentences: sentences(en, f, today),
      summary: { homes: f.n, small_sample: f.small, median_price_eur: f.medPrice, median_eur_per_sqm: f.medPpsqm || null, homes_with_size: f.nSqm, median_size_sqm: f.medSqm || null, cheapest_eur: f.min, most_expensive_eur: f.max, median_score: f.medScore || null, regions: f.regions },
      buying: { costs_pct_low: f.costs?.[0] ?? null, costs_pct_high: f.costs?.[1] ?? null, costs_breakdown: f.breakdown || null, can_foreigners_buy: f.rule || null, annual_property_tax: f.tax || null, rental_income_tax: f.rental || null, as_of: f.asOf || null, sources: f.sources },
      pages: { homes: `${SITE}/homes/${f.k}`, costs: f.pages.costs ? `${SITE}/costs/${f.k}` : null, guide: f.pages.guide ? `${SITE}/guide/${f.k}` : null, markdown: `${SITE}/${base}.md`, pdf: `${SITE}/${base}.pdf` },
      homes: f.homes.map(publicHome),
    }) + "\n");
    for (const lang of ["en", "es"] as Lang[]) {
      const k = kit(lang), x = lang === "es" ? ".es" : "";
      const fl = lang === "es" ? esOf.get(f.k) || f : f;
      put(`${base}${x}.md`, countryMd(k, fl, today));
      put(`${base}${x}.pdf`, countryPdf(k, fl, today));
    }
  }
  put("data/countries/index.json", JSON.stringify({
    updated: today, license: LICENSE, attribution: "RealHunt (realhunt.co)", note, docs: `${SITE}/research/open-data`, openapi: `${SITE}/openapi.json`,
    countries: facts.map((f) => ({ country: f.name, key: f.k, homes: f.n, small_sample: f.small, median_price_eur: f.medPrice, median_eur_per_sqm: f.medPpsqm || null, costs_pct_low: f.costs?.[0] ?? null, costs_pct_high: f.costs?.[1] ?? null,
      json: `${SITE}/data/countries/${f.k}.json`, markdown: `${SITE}/data/countries/${f.k}.md`, pdf: `${SITE}/data/countries/${f.k}.pdf`, page: `${SITE}/homes/${f.k}` })),
  }) + "\n");

  const geo = rows.filter((r) => typeof r.lat === "number" && typeof r.lng === "number" && r.price_eur > 0);
  put("data/realhunt-homes.geojson", JSON.stringify({ type: "FeatureCollection", name: "RealHunt homes", updated: today, license: LICENSE, attribution: "RealHunt (realhunt.co)",
    features: geo.map((r) => ({ type: "Feature", geometry: { type: "Point", coordinates: [Math.round(r.lng! * 1e5) / 1e5, Math.round(r.lat! * 1e5) / 1e5] }, properties: { url: `${SITE}/deal/${r.slug}`, title: String(r.title || "").trim(), country: r.country || null, price_eur: r.price_eur, size_sqm: r.sqm ?? null, score: r.nota ?? null } })) }) + "\n");
  // the ten best-scored homes of each country, a folder per country: opens in Google Earth, imports into Google My Maps
  put("data/realhunt-best-homes.kml", `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>RealHunt: the best-scored cheap homes by country</name><description>${esc(`The ten best-scored homes of each country on RealHunt, ${en.date(today)}. Each point links to the home. ${SITE}`)}</description>\n`
    + facts.map((f) => { const hs = f.homes.filter((r) => typeof r.lat === "number" && typeof r.lng === "number").slice(0, 10); return hs.length ? `<Folder><name>${esc(f.name)}</name>` + hs.map((r) =>
      `<Placemark><name>${esc(`${en.eur(r.price_eur)} · ${String(r.title || "").trim()}`)}</name><description>${esc(`${r.location_name || f.name}. ${r.sqm ? r.sqm + " m². " : ""}RealHunt score ${r.nota ?? "n/a"}. ${SITE}/deal/${r.slug}`)}</description><Point><coordinates>${Math.round(r.lng! * 1e5) / 1e5},${Math.round(r.lat! * 1e5) / 1e5},0</coordinates></Point></Placemark>`).join("") + `</Folder>\n` : ""; }).join("")
    + `</Document></kml>\n`);

  put("openapi.json", JSON.stringify(openApi(facts, today), null, 1) + "\n");
  return n;
}

/** OpenAPI 3.1 description of the public, read-only files. Everything is a static file: no key, no rate limit of ours. */
export function openApi(facts: Fact[], today: string) {
  const keys = facts.map((f) => f.k);
  const cParam = { name: "country", in: "path", required: true, description: "Country key: lower case, words joined with a hyphen.", schema: { type: "string", enum: keys } };
  const ok = (description: string, type: string, schema?: object) => ({ "200": { description, content: { [type]: schema ? { schema } : {} } } });
  const home = { type: "object", properties: { url: { type: "string", format: "uri" }, title: { type: "string" }, title_es: { type: ["string", "null"], description: "The title in Spanish, when there is one." }, country: { type: ["string", "null"] }, region: { type: ["string", "null"] }, place: { type: ["string", "null"] }, price_eur: { type: "number", description: "Asking price in euros from the original listing." }, size_sqm: { type: ["number", "null"] }, bedrooms: { type: ["number", "null"] }, score: { type: ["number", "null"], description: "RealHunt score, 70 to 98. RealHunt's own grade, not a valuation." }, added: { type: ["string", "null"], format: "date" }, lat: { type: ["number", "null"] }, lng: { type: ["number", "null"] }, listed_on: { type: ["string", "null"], description: "Domain of the original listing." }, summary: { type: ["string", "null"] } } };
  return {
    openapi: "3.1.0",
    info: { title: "RealHunt open data", version: today, summary: "Cheap homes for sale around the world, each checked by a person and scored, with buying rules and costs by country.",
      description: "Read-only static files, rebuilt with every update of the site (at least daily). No key is needed. Text and figures are licensed CC BY 4.0: quote them with a link to the page they come from. Photos belong to the original listings and are not part of these files. Rules, taxes and costs are general information, not legal or tax advice. Human-readable documentation: https://realhunt.co/research/open-data",
      license: { name: "CC BY 4.0", url: LICENSE }, contact: { name: "RealHunt", email: PRESS_EMAIL, url: `${SITE}/research/open-data` } },
    servers: [{ url: SITE }],
    externalDocs: { description: "For AI assistants: what to quote and how to attribute", url: `${SITE}/for-ai` },
    paths: {
      "/data/countries/index.json": { get: { operationId: "listCountries", summary: "Countries with homes, their key figures and the address of each country file", responses: ok("The index", "application/json") } },
      "/data/countries/{country}.json": { get: { operationId: "getCountry", summary: "Key facts, buying rules and every home of one country", description: "To search, read this file and filter `homes` by price_eur, size_sqm, bedrooms or score. Example: homes in Bulgaria up to 30,000 euros = getCountry(bulgaria), then price_eur <= 30000.", parameters: [cParam],
        responses: ok("The country", "application/json", { type: "object", properties: { country: { type: "string" }, updated: { type: "string", format: "date" }, sentences: { type: "array", items: { type: "string" }, description: "Dated sentences that can be quoted on their own." }, summary: { type: "object" }, buying: { type: "object" }, pages: { type: "object" }, homes: { type: "array", items: { $ref: "#/components/schemas/Home" } } } }) } },
      "/data/countries/{country}.md": { get: { operationId: "getCountryText", summary: "The same country as clean text (Markdown), each home with its description. Spanish: {country}.es.md", parameters: [cParam], responses: ok("Markdown", "text/markdown") } },
      "/data/countries/{country}.pdf": { get: { operationId: "getCountrySheet", summary: "One-page fact sheet of the country with its sources. Spanish: {country}.es.pdf", parameters: [cParam], responses: ok("PDF", "application/pdf") } },
      "/research/homes.csv": { get: { operationId: "getHomesCsv", summary: "Every home, one row each: url, country, region, price_eur, size_sqm, bedrooms, score, added, airport_km, flood_indicator", responses: ok("CSV (UTF-8 with BOM)", "text/csv") } },
      "/research/monthly-series.json": { get: { operationId: "getMonthlySeries", summary: "One reading per month: homes, countries, median price and median price per m²", responses: ok("The series", "application/json") } },
      "/research/property-portals.json": { get: { operationId: "getPropertyPortals", summary: "Property portals by country: name, domain and link", responses: ok("The directory", "application/json") } },
      "/data/realhunt-homes.geojson": { get: { operationId: "getHomesGeoJson", summary: "Every home with coordinates, as GeoJSON points", responses: ok("GeoJSON", "application/geo+json") } },
      "/data/realhunt-best-homes.kml": { get: { operationId: "getBestHomesKml", summary: "The ten best-scored homes of each country, as KML", responses: ok("KML", "application/vnd.google-earth.kml+xml") } },
      "/llms.txt": { get: { operationId: "getIndexForAssistants", summary: "Short index of the site for AI assistants. Spanish: /es/llms.txt", responses: ok("Text", "text/plain") } },
      "/llms-full.txt": { get: { operationId: "getFullText", summary: "Method, data, costs, guides and every home in one text file", responses: ok("Text", "text/plain") } },
      "/feed.json": { get: { operationId: "getNewHomesFeed", summary: "The newest homes (JSON Feed 1.1). Also /feed.xml (RSS) and /feed.atom (Atom)", responses: ok("JSON Feed", "application/feed+json") } },
      "/homes/{country}": { get: { operationId: "getCountryPage", summary: "The page of a country: every home, prices, rules and questions (HTML, readable without JavaScript)", parameters: [cParam], responses: ok("HTML", "text/html") } },
      "/research/find-homes": { get: { operationId: "findHomes", summary: "Search page for people and agents with a browser: filters the homes of a country by price, size and bedrooms",
        description: "Needs JavaScript. Without it, use getCountry and filter the list yourself; the page says so and links the files.",
        parameters: [{ name: "country", in: "query", schema: { type: "string", enum: keys } }, { name: "max", in: "query", description: "Highest price in euros", schema: { type: "integer" } }, { name: "min", in: "query", description: "Lowest price in euros", schema: { type: "integer" } }, { name: "beds", in: "query", description: "Fewest bedrooms", schema: { type: "integer" } }, { name: "sqm", in: "query", description: "Smallest size in m²", schema: { type: "integer" } }],
        responses: ok("HTML", "text/html") } },
    },
    components: { schemas: { Home: home } },
  };
}

export { MIN_RANK, MIN_SHOW };
