// Free calculators and tools (15-nov-2026), every page in English and Spanish, written by hand:
//   /tools                                   the index
//   /tools/<slug>                            11 calculators (seo/tools/pages.ts) and the residency table
//   /buying-costs, /buying-costs/<country>   the buying-cost calculator, one page per country with three worked examples
//   /embed/calculator/<slug>                 each calculator as a page for an <iframe> (English), .../es/<slug> (Spanish)
//   /embed/calculator/embed.js               the script of those iframe pages (src/tools/embedEntry.ts, bundled here)
// The form and a worked result are in the HTML, so the page can be read and indexed without JavaScript. In the browser
// src/tools/client.ts redraws the result, keeps the state in the address (a result is a link) and makes the share image.
// Called from seo/prerender.ts in both runs: the Spanish run only records the English pages, so they are counted as
// pages with a Spanish copy written by hand (seo/es.ts).
import fs from "fs";
import path from "path";
import { buildSync } from "esbuild";
import { costRange, localizeCanBuy, localizeRows, nameOf, type CanBuyData } from "../../src/community/seo2data";
import { fmt, type CountryData } from "../../src/tools/defs";
import { fees } from "../../src/tools/logic";
import { cKey, median, type Home } from "../assetsStats";
import { LICENSE, ORG, SITE, crumbLd, esc, frame, kit, table, type Kit, type Lang, type PageFn } from "../assetsKit";
import { registerEsPage } from "../assetsTrust";
import { EMBED_PREFIX, NOTE, TOOL_CSS, appLd, embedPage, faqLd, toolBody, type ToolPage } from "./kit";
import { toolPages, type Ctx } from "./pages";

export type ToolsCtx = { root: string; page: PageFn; rows: Home[]; today: string; image: string; record?: boolean };
const readJson = (f: string, d: any = {}) => { const p = path.resolve(process.cwd(), f); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : d; };
const write = (root: string, rel: string, text: string) => { const f = path.join(root, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); };
/** The day the cost ranges and the pages' own words were last changed by hand (not the build day). */
const TOOLS_DATE = "2026-11-15";

export function writeTools(c: ToolsCtx): { pages: number; embeds: number } {
  const rows = c.rows.filter((r) => r?.slug && r.price_eur > 0);
  const dest0 = readJson("src/data/destinations.json"), guides0 = readJson("src/data/guides.json"), cb0: CanBuyData = readJson("src/data/canbuy.json", { nationalities: {}, countries: {} });
  const destEs = localizeRows(dest0, readJson("src/data/destinations-es.json")), guidesEs = localizeRows(guides0, readJson("src/data/guides-es.json"));
  const cbEs = localizeCanBuy(cb0, readJson("src/data/canbuy-es.json", { nationalities: {}, countries: {} }));
  const prices: Record<string, number[]> = {};
  for (const r of rows) { const key = cKey(r.country); if (dest0[key]) (prices[key] ||= []).push(r.price_eur); }
  for (const key of Object.keys(prices)) prices[key].sort((a, b) => a - b);
  // Property tax bills stated on United States listings, in US dollars as listed (no conversion).
  const usBills = rows.filter((r: any) => Number(r.tax_annual) > 0 && cKey(r.country) === "united-states" && String(r.hoa_currency || "").toUpperCase() === "USD").map((r: any) => Number(r.tax_annual));
  const usTax = usBills.length >= 5 ? { n: usBills.length, medTax: median(usBills), min: Math.min(...usBills), max: Math.max(...usBills) } : null;
  let nPages = 0, nEmbeds = 0;

  for (const lang of ["en", "es"] as Lang[]) {
    const k = kit(lang), { t, es } = k, f = fmt(lang);
    const dest = es ? destEs : dest0, guides = es ? guidesEs : guides0, cb = es ? cbEs : cb0;
    const keys = Object.keys(dest).filter((x) => x !== "_meta" && costRange(dest[x]?.purchase_costs_pct) && nameOf(x, guides, lang)).sort((a, b) => nameOf(a, guides, lang).localeCompare(nameOf(b, guides, lang), lang));
    const C: Record<string, CountryData> = Object.fromEntries(keys.map((x) => [x, { n: nameOf(x, guides, lang), r: costRange(dest[x].purchase_costs_pct)!, y: String(dest[x].as_of ?? ""), tax: String(dest[x].annual_property_tax || "") }]));
    const ctx: Ctx = { k, today: c.today, c: C, prices, nHomes: rows.length, usTax };
    const pages = toolPages(ctx);
    const hub: [string, string] = [t("Tools", "Herramientas"), "/tools"];
    const put = (p: ToolPage, crumbs: [string, string][], others: [string, string][], group = "content") => {
      const body = toolBody(k, p, c.today, others);
      c.page(k.url(p.path), `${p.title} · RealHunt`, p.desc, c.image, frame(k, { crumbs, eyebrow: t("Free calculator", "Calculadora gratuita"), h1: p.h1, body }), [crumbLd(k, crumbs), appLd(k, p, TOOLS_DATE), faqLd(p.faq)],
        { group: es ? "es" : (group as "content"), lastmod: TOOLS_DATE, lang: es ? "es" : undefined, alt: { en: SITE + p.path, es: `${SITE}/es${p.path}` }, noindex: p.noindex });
      if (es) registerEsPage(`es${p.path}/index.html`);
      nPages++;
    };
    const ring = (i: number, n = 4): [string, string][] => Array.from({ length: Math.min(n, pages.length - 1) }, (_x, j) => pages[(i + 1 + j) % pages.length]).map((p) => [p.h1, p.path]);

    // ---------------------------------------------------------- the calculators of seo/tools/pages.ts
    pages.forEach((p, i) => {
      put(p, [["RealHunt", "/"], hub, [p.h1, p.path]], [[t("Buying costs calculator, by country", "Calculadora de gastos de compra, por país"), "/buying-costs"], ...ring(i, 3), [t("Does buying a home give you residency? The rule in each country", "¿Comprar una casa da derecho a residencia? La norma de cada país"), "/tools/residency-by-buying-a-home"]]);
      if (!c.record) { write(c.root, `${EMBED_PREFIX.slice(1)}${es ? "es/" : ""}${p.embed}/index.html`, embedPage(k, p)); nEmbeds++; }
    });

    // ---------------------------------------------------------- buying costs: the index and one page per country
    const dataC = { c: Object.fromEntries(keys.map((x) => [x, { n: C[x].n, r: C[x].r, y: C[x].y }])) };
    const calcCrumb: [string, string] = [t("Buying costs", "Gastos de compra"), "/buying-costs"];
    const EX = [100000, 150000, 300000];
    const eur = (n: number) => f.money(n);
    const costPage = (key: string): ToolPage => {
      const d = dest[key], v = C[key], n = v.n, inN = k.inThe(n), e100 = fees(100000, v.r), e150 = fees(150000, v.r);
      const asOf = t(`Figures as of ${v.y}`, `Cifras de ${v.y}`);
      const exRows = EX.map((p) => { const x = fees(p, v.r); return [`<a href="/buying-costs/${key}?p=${p}" id="p${p}">${esc(eur(p))}</a>`, esc(f.range(x.lo, x.hi)), esc(f.range(x.totalLo, x.totalHi))]; });
      const srcs = (d.sources || []) as string[];
      const faq: [string, string][] = [
        [t(`How much are the taxes and fees on a €100,000 home in ${inN}?`, `¿Cuánto son los impuestos y gastos de una casa de 100.000 € en ${inN}?`), esc(t(`About ${f.pctRange(v.r)} of the price: ${f.range(e100.lo, e100.hi)}, so ${f.range(e100.totalLo, e100.totalHi)} in total. On €150,000 it is ${f.range(e150.lo, e150.hi)}.`, `Alrededor del ${f.pctRange(v.r)} del precio: de ${f.range(e100.lo, e100.hi)}, así que de ${f.range(e100.totalLo, e100.totalHi)} en total. Con 150.000 € son de ${f.range(e150.lo, e150.hi)}.`))],
        ...(d.annual_property_tax ? [[t(`What do I pay every year after buying in ${inN}?`, `¿Qué se paga cada año después de comprar en ${inN}?`), esc(String(d.annual_property_tax)) + " " + t(`Add up your own bills with the <a href="/tools/home-running-costs">running costs calculator</a>.`, `Suma tus propias facturas con la <a href="/tools/home-running-costs">calculadora de gastos anuales</a>.`)] as [string, string]] : []),
        ...(d.can_foreigners_buy ? [[t(`Can a foreigner buy a home in ${inN}?`, `¿Puede un extranjero comprar una casa en ${inN}?`), esc(String(d.can_foreigners_buy)) + " " + t(`See the rule for your nationality in <a href="/can-i-buy">can I buy there?</a>`, `Mira la norma para tu nacionalidad en <a href="/can-i-buy">¿puedo comprar allí?</a>`)] as [string, string]] : []),
      ];
      return {
        tool: "costs", path: `/buying-costs/${key}`, embed: "buying-costs", base: { c: key }, navBase: "/buying-costs/", urlTpl: "/buying-costs/{c}", data: dataC, read: TOOLS_DATE, asOf,
        title: t(`Buying costs calculator for ${inN}: taxes and fees on top of the price`, `Calculadora de gastos de compra para ${inN}: impuestos y tasas además del precio`),
        h1: t(`Buying costs in ${inN}: calculator and worked examples`, `Gastos de compra en ${inN}: calculadora y ejemplos resueltos`),
        desc: t(`What you pay on top of the price when you buy a home in ${inN}: about ${f.pctRange(v.r)} in taxes and fees, so ${f.range(e150.lo, e150.hi)} on a €150,000 home. Calculator and three worked examples.`, `Lo que pagas además del precio al comprar una casa en ${inN}: alrededor del ${f.pctRange(v.r)} en impuestos y gastos, de ${f.range(e150.lo, e150.hi)} en una casa de 150.000 €. Calculadora y tres ejemplos.`),
        card: "",
        lead: esc(t(`Buying a home in ${inN} costs about ${f.pctRange(v.r)} of the price in taxes and fees. On a ${eur(100000)} home that is ${f.range(e100.lo, e100.hi)}, so ${f.range(e100.totalLo, e100.totalHi)} in total. Type your own price: the result has its own link, to send to whoever is buying with you.`,
          `Comprar una casa en ${inN} cuesta alrededor del ${f.pctRange(v.r)} del precio en impuestos y gastos. En una casa de ${eur(100000)} son de ${f.range(e100.lo, e100.hi)}, así que de ${f.range(e100.totalLo, e100.totalHi)} en total. Escribe tu precio: el resultado tiene su propio enlace, para enviárselo a quien compre contigo.`)),
        exampleTitle: t(`Three worked examples for ${inN}`, `Tres ejemplos resueltos para ${inN}`),
        example: table([{ h: t("Price", "Precio") }, { h: t("Taxes and fees", "Impuestos y gastos"), cls: "n" }, { h: t("Total", "Total"), cls: "n" }], exRows, t("Worked examples", "Ejemplos resueltos"), true)
          + `<p>${esc(t(`Each price opens the calculator with that figure. The low end of each range is ${f.trim(v.r[0])}% of the price and the high end ${f.trim(v.r[1])}%.`, `Cada precio abre la calculadora con esa cifra. El extremo bajo de cada rango es el ${f.trim(v.r[0])} % del precio y el alto, el ${f.trim(v.r[1])} %.`))}</p>`,
        how: [
          ...(d.purchase_costs_breakdown ? [`<strong>${esc(t("Where the money goes", "Adónde va el dinero"))}:</strong> ${esc(d.purchase_costs_breakdown)}`] : []),
          esc(t("Taxes and fees = price × the range above. They are a share of the price, so the sum works in any currency; the currency box only changes the symbol.", "Impuestos y gastos = precio × el rango de arriba. Son un porcentaje del precio, así que la cuenta vale en cualquier moneda; la casilla de moneda solo cambia el símbolo.")),
          esc(t("The range covers new and resale homes and different regions. A cheap home is usually nearer the high end, because several fees have a minimum.", "El rango cubre obra nueva y segunda mano y distintas regiones. Una casa barata suele quedar más cerca del extremo alto, porque varios gastos tienen un mínimo.")),
          t(`Comparing with another country? Put two homes side by side in <a href="/tools/compare-buying-costs">compare the total cost of two homes</a>.`, `¿Comparas con otro país? Pon dos casas frente a frente en <a href="/tools/compare-buying-costs">compara el coste total de dos casas</a>.`),
        ],
        more: (d.annual_property_tax || d.rental_income_tax ? `<h2>${esc(t("Every year after you buy", "Cada año, después de comprar"))}</h2>${d.annual_property_tax ? `<p><strong>${esc(t("Yearly property tax", "Impuesto anual sobre la propiedad"))}:</strong> ${esc(d.annual_property_tax)}</p>` : ""}${d.rental_income_tax ? `<p><strong>${esc(t("Tax on rental income", "Impuesto sobre los ingresos por alquiler"))}:</strong> ${esc(d.rental_income_tax)}</p>` : ""}` : "")
          + `<p>${guides[key] ? `<a href="/guide/${key}">${esc(t(`How to buy in ${inN}`, `Cómo comprar en ${inN}`))}</a> · ` : ""}<a href="/costs/${key}">${esc(t("Costs, taxes and sources", "Gastos, impuestos y fuentes"))}</a>${prices[key]?.length ? ` · <a href="/homes/${key}">${esc(t(`Homes in ${inN}`, `Casas en ${inN}`))}</a>` : ""} · <a href="/buying-costs">${esc(t("Other countries", "Otros países"))}</a></p>`,
        sources: [{ label: t(`Costs, taxes and sources for ${inN} (RealHunt)`, `Gastos, impuestos y fuentes de ${inN} (RealHunt)`), url: k.url(`/costs/${key}`) }, ...srcs.map((u, i) => ({ label: t(`Source ${i + 1}`, `Fuente ${i + 1}`), url: u }))],
        faq,
      };
    };
    keys.forEach((key, i) => {
      const next = [1, 2, 3].map((j) => keys[(i + j) % keys.length]);
      put(costPage(key), [["RealHunt", "/"], calcCrumb, [C[key].n, `/buying-costs/${key}`]], [...next.map((x) => [t(`Buying costs in ${k.inThe(C[x].n)}`, `Gastos de compra en ${k.inThe(C[x].n)}`), `/buying-costs/${x}`] as [string, string]), [pages[0].h1, pages[0].path], [pages[1].h1, pages[1].path]]);
    });
    {
      const lo = keys.slice().sort((a, b) => (C[a].r[0] + C[a].r[1]) - (C[b].r[0] + C[b].r[1]))[0], hi = keys.slice().sort((a, b) => (C[b].r[0] + C[b].r[1]) - (C[a].r[0] + C[a].r[1]))[0];
      const idx: ToolPage = {
        tool: "costs", path: "/buying-costs", embed: "buying-costs", base: { c: "spain" }, navBase: "/buying-costs/", urlTpl: "/buying-costs/{c}", data: dataC, read: TOOLS_DATE, asOf: t("Figures as of 2026", "Cifras de 2026"),
        title: t(`Buying costs calculator: taxes and fees in ${keys.length} countries`, `Calculadora de gastos de compra: impuestos y tasas en ${keys.length} países`),
        h1: t("What does it cost to buy a home abroad? Buying costs calculator", "¿Cuánto cuesta comprar una casa en el extranjero? Calculadora de gastos de compra"),
        desc: t(`Enter a price and see what you pay on top in taxes and fees when you buy a home in ${keys.length} countries, from Spain and Italy to Japan and Mexico. Each result has its own link.`, `Escribe un precio y mira lo que pagas además en impuestos y gastos al comprar una casa en ${keys.length} países, de España e Italia a Japón y México. Cada resultado tiene su enlace.`),
        card: "",
        lead: esc(t(`On top of the price you pay transfer tax or VAT, the notary, the land registry and a lawyer: from ${f.pctRange(C[lo].r)} of the price in ${k.inThe(C[lo].n)} to ${f.pctRange(C[hi].r)} in ${k.inThe(C[hi].n)}, among ${keys.length} countries and destinations. Choose a country and type a price.`,
          `Además del precio se pagan el impuesto de transmisiones o el IVA, la notaría, el registro y un abogado: desde el ${f.pctRange(C[lo].r)} del precio en ${k.inThe(C[lo].n)} hasta el ${f.pctRange(C[hi].r)} en ${k.inThe(C[hi].n)}, entre ${keys.length} países y destinos. Elige un país y escribe un precio.`)),
        exampleTitle: t("A €150,000 home in each country", "Una casa de 150.000 € en cada país"),
        example: table([{ h: t("Country", "País") }, { h: t("On top of the price", "Además del precio"), cls: "n" }, { h: t("On €150,000", "En 150.000 €"), cls: "n" }, { h: t("Total", "Total"), cls: "n" }], keys.map((x) => { const e = fees(150000, C[x].r); return [`<a href="/buying-costs/${x}">${esc(C[x].n)}</a>`, esc(f.pctRange(C[x].r)), esc(f.range(e.lo, e.hi)), esc(f.range(e.totalLo, e.totalHi))]; }), t("Buying costs by country", "Gastos de compra por país")),
        how: [
          esc(t("Taxes and fees = price × the country's range. Both ends are shown, because the bill depends on the region, on whether the home is new or resale and on the lawyer.", "Impuestos y gastos = precio × el rango del país. Se muestran los dos extremos, porque la factura depende de la región, de si la vivienda es nueva o de segunda mano y del abogado.")),
          esc(t("Each country page has three worked examples, what the costs are made of, the yearly taxes and the sources that were read.", "La página de cada país trae tres ejemplos resueltos, de qué se componen los gastos, los impuestos anuales y las fuentes consultadas.")),
          t(`The same figures as a ranked table, with a CSV to download, are in <a href="/research/buying-costs-by-country">buying costs by country</a>.`, `Las mismas cifras en una tabla ordenada, con CSV para descargar, están en <a href="/research/buying-costs-by-country">gastos de compra por país</a>.`),
        ],
        sources: [{ label: t("Buying costs by country, with the sources of each one (RealHunt)", "Gastos de compra por país, con las fuentes de cada uno (RealHunt)"), url: k.url("/research/buying-costs-by-country") }],
        faq: [
          [t("Which country has the lowest buying costs?", "¿Qué país tiene los gastos de compra más bajos?"), esc(t(`By the middle of the range, ${k.inThe(C[lo].n)}: ${f.pctRange(C[lo].r)} of the price. The highest is ${k.inThe(C[hi].n)}, with ${f.pctRange(C[hi].r)}.`, `Por el punto medio del rango, ${k.inThe(C[lo].n)}: el ${f.pctRange(C[lo].r)} del precio. El más alto es ${k.inThe(C[hi].n)}, con el ${f.pctRange(C[hi].r)}.`))],
          [t("Are buying costs paid in cash?", "¿Los gastos de compra se pagan al contado?"), esc(t("Almost always. Banks lend against the value of the home, not the taxes, so the buyer needs the costs in savings even with a mortgage.", "Casi siempre. Los bancos prestan sobre el valor de la vivienda, no sobre los impuestos, así que el comprador necesita tener ahorrados los gastos aunque pida hipoteca."))],
          [t("What is not included?", "¿Qué no está incluido?"), t(`Mortgage costs, currency exchange, furniture and repairs, and the costs of every year. For those, use the <a href="/tools/home-running-costs">running costs calculator</a>.`, `Los gastos de hipoteca, el cambio de divisa, los muebles y las reformas, y los gastos de cada año. Para estos últimos, usa la <a href="/tools/home-running-costs">calculadora de gastos anuales</a>.`)],
        ],
      };
      put(idx, [["RealHunt", "/"], calcCrumb], pages.slice(0, 4).map((p) => [p.h1, p.path]));
      if (!c.record) { write(c.root, `${EMBED_PREFIX.slice(1)}${es ? "es/" : ""}buying-costs/index.html`, embedPage(k, { ...idx, h1: t("Buying costs calculator", "Calculadora de gastos de compra"), base: undefined })); nEmbeds++; }
    }

    // ---------------------------------------------------------- does buying a home give residency? (a table, no sums)
    {
      const p = "/tools/residency-by-buying-a-home";
      const list = Object.keys(cb.countries).filter((x) => typeof (cb.countries[x] as any).residency_other === "string" && nameOf(x, guides, lang)).sort((a, b) => nameOf(a, guides, lang).localeCompare(nameOf(b, guides, lang), lang));
      // The verdict is read from the English sentence of the data, so it cannot drift from the text shown next to it.
      const verdict = (x: string) => { const s = String((cb0.countries[x] as any).residency_other || ""); return /golden visa for non-EU buyers|can apply for permanent residency/i.test(s) ? "min" : /\bno (right|visa|residency)\b|does not\b|no longer\b/i.test(s) ? "no" : "see"; };
      const lab = { no: t("No", "No"), min: t("Only above a minimum price", "Solo a partir de un precio mínimo"), see: t("See the rule", "Mira la norma") };
      const cls = { no: "restricted", min: "conditions", see: "home" };
      const nNo = list.filter((x) => verdict(x) === "no").length, mins = list.filter((x) => verdict(x) === "min");
      const sch = new Set<string>((cb0 as any).schengen || []);
      const h1 = t("Does buying a home give you residency? The rule in each country", "¿Comprar una casa da derecho a residencia? La norma de cada país");
      const desc = t(`In ${nNo} of ${list.length} countries, buying a home gives a buyer from outside the EU no right to live there. Where a route exists it has a minimum price. Country by country.`, `En ${nNo} de ${list.length} países, comprar una casa no da a un comprador de fuera de la UE ningún derecho a vivir allí. Donde existe una vía, tiene un precio mínimo. País por país.`);
      const crumbs: [string, string][] = [["RealHunt", "/"], hub, [h1, p]];
      const faq: [string, string][] = [
        [t("Which countries give residency for buying a home?", "¿Qué países dan la residencia por comprar una vivienda?"), esc(t(`Of the ${list.length} countries RealHunt covers, only ${k.list(mins.map((x) => nameOf(x, guides, lang)))} keep a route for buyers from outside the EU, and with a minimum price far above a cheap home. In the other ${nNo}, owning a home gives no right to stay.`, `De los ${list.length} países que cubre RealHunt, solo ${k.list(mins.map((x) => nameOf(x, guides, lang)))} mantienen una vía para compradores de fuera de la UE, y con un precio mínimo muy por encima de una casa barata. En los otros ${nNo}, tener una casa no da derecho a quedarse.`))],
        [t("How long can I stay at my home without a residence permit?", "¿Cuánto tiempo puedo estar en mi casa sin permiso de residencia?"), t(`In the Schengen area, 90 days in any 180 for most visitors from outside the EU. Count your days with the <a href="/tools/schengen-90-180">Schengen 90/180 calculator</a>.`, `En el espacio Schengen, 90 días de cada 180 para la mayoría de visitantes de fuera de la UE. Cuenta tus días con la <a href="/tools/schengen-90-180">calculadora Schengen 90/180</a>.`)],
        [t("Does this apply to EU citizens?", "¿Se aplica a los ciudadanos de la UE?"), esc(t("No. Citizens of the EU, Iceland, Liechtenstein, Norway and Switzerland can live in another country of that area under the free movement rules; the list is about buyers from elsewhere.", "No. Los ciudadanos de la UE, Islandia, Liechtenstein, Noruega y Suiza pueden vivir en otro país de esa zona por las normas de libre circulación; la lista trata de los compradores de otros lugares."))],
      ];
      const body = TOOL_CSS + `<div class="rhx-answer"><p>${esc(t(`Buying a home does not give a buyer from outside the EU the right to live in ${nNo} of the ${list.length} countries on this page. ${mins.length ? `${k.list(mins.map((x) => nameOf(x, guides, lang)))} still ${mins.length > 1 ? "have" : "has"} a route linked to property, with a minimum price.` : ""} The sentence for each country is below.`, `Comprar una casa no da a un comprador de fuera de la UE derecho a vivir en ${nNo} de los ${list.length} países de esta página. ${mins.length ? `${k.list(mins.map((x) => nameOf(x, guides, lang)))} ${mins.length > 1 ? "conservan" : "conserva"} una vía ligada a la vivienda, con un precio mínimo.` : ""} Abajo está la frase de cada país.`))}</p></div>`
        + `<p class="rhx-meta">${esc(NOTE(k))} · ${t("Rules as of", "Normas a")} ${esc(String(cb._meta?.updated ? (es ? "noviembre de 2026" : cb._meta.updated) : c.today.slice(0, 7)))} · <a href="/research/where-foreigners-can-buy">${esc(t("Who can buy where", "Quién puede comprar dónde"))}</a></p>`
        + `<ul class="rhx-rules">${list.map((x) => `<li><h3><a href="/guide/${x}">${esc(nameOf(x, guides, lang))}</a></h3><dl><div><dt>${esc(t("Does buying give residency?", "¿Comprar da la residencia?"))}</dt><dd><span class="rhx-st ${cls[verdict(x)]}">${esc(lab[verdict(x)])}</span></dd></div><div><dt>${esc(t("In the Schengen area", "En el espacio Schengen"))}</dt><dd>${esc(sch.has(x) ? t("Yes", "Sí") : t("No", "No"))}</dd></div></dl><p>${esc(String((cb.countries[x] as any).residency_other))}</p></li>`).join("")}</ul>`
        + `<h2>${esc(t("How to read the list", "Cómo leer la lista"))}</h2><ul><li>${esc(t("\"No\" means that owning the home, at any price, does not by itself let you live in the country. You visit under the normal rules for your passport and need a visa or a permit to stay longer.", "«No» significa que tener la vivienda, cueste lo que cueste, no permite por sí solo vivir en el país. Se visita con las normas habituales de cada pasaporte y hace falta un visado o un permiso para quedarse más tiempo."))}</li><li>${esc(t("\"Only above a minimum price\" means a residence route for property buyers exists, with the threshold given in the sentence. A cheap home does not reach it.", "«Solo a partir de un precio mínimo» significa que existe una vía de residencia para compradores de vivienda, con el umbral que indica la frase. Una casa barata no llega."))}</li><li>${t(`In a Schengen country, the days at your home count towards the 90 in any 180: use the <a href="/tools/schengen-90-180">Schengen calculator</a>.`, `En un país Schengen, los días en tu casa cuentan para los 90 de cada 180: usa la <a href="/tools/schengen-90-180">calculadora Schengen</a>.`)}</li><li>${t(`The rule for each nationality, with the conditions to buy, is in <a href="/can-i-buy">can I buy there?</a>`, `La norma para cada nacionalidad, con las condiciones para comprar, está en <a href="/can-i-buy">¿puedo comprar allí?</a>`)}</li></ul>`
        + `<p class="rhx-note">${esc(t("Compiled from public government sources and the sources listed on each country's cost page. Visa rules change often: general information, not legal or immigration advice.", "Recopilado de fuentes públicas oficiales y de las fuentes citadas en la página de gastos de cada país. Las normas de visados cambian a menudo: información general, no asesoramiento jurídico ni migratorio."))}</p>`
        + `<div class="rht-faq"><h2>${esc(t("Questions people ask", "Preguntas frecuentes"))}</h2>${faq.map(([q, a]) => `<h3>${esc(q)}</h3><p>${a}</p>`).join("")}</div>`
        + `<h2>${esc(t("More free tools", "Más herramientas gratuitas"))}</h2><ul>${pages.slice(0, 3).map((x) => `<li><a href="${x.path}">${esc(x.h1)}</a></li>`).join("")}<li><a href="/tools">${esc(t("All tools", "Todas las herramientas"))}</a></li></ul>`;
      c.page(k.url(p), `${t("Does buying a home give residency? By country", "¿Comprar casa da la residencia? País por país")} · RealHunt`, desc, c.image, frame(k, { crumbs, eyebrow: t("Free tool", "Herramienta gratuita"), h1, body }), [crumbLd(k, crumbs), faqLd(faq)],
        { group: es ? "es" : "content", lastmod: TOOLS_DATE, lang: es ? "es" : undefined, alt: { en: SITE + p, es: `${SITE}/es${p}` } });
      if (es) registerEsPage(`es${p}/index.html`);
      nPages++;
    }

    // ---------------------------------------------------------- the index of tools
    {
      const crumbs: [string, string][] = [["RealHunt", "/"], hub];
      const h1 = t("Free calculators and tools for buying a home abroad", "Calculadoras y herramientas gratuitas para comprar casa en el extranjero");
      const desc = t(`${pages.length + 2} free tools for buying a home abroad: buying costs in ${keys.length} countries, purchase taxes in the UK, Portugal, France, Germany and Spain, Schengen days and more.`, `${pages.length + 2} herramientas gratuitas para comprar casa fuera: gastos de compra en ${keys.length} países, impuestos del Reino Unido, Portugal, Francia, Alemania y España, días Schengen y más.`);
      const cards: [string, string, string][] = [
        ["/buying-costs", t("Buying costs calculator, by country", "Calculadora de gastos de compra, por país"), t(`Taxes and fees on top of the price in ${keys.length} countries, with three worked examples for each.`, `Impuestos y gastos además del precio en ${keys.length} países, con tres ejemplos resueltos de cada uno.`)],
        ...pages.map((p) => [p.path, p.h1, p.card] as [string, string, string]),
        ["/tools/residency-by-buying-a-home", t("Does buying a home give you residency?", "¿Comprar una casa da derecho a residencia?"), t("The rule in each country for buyers from outside the EU, in one list.", "La norma de cada país para compradores de fuera de la UE, en una lista.")],
      ];
      const also: [string, string, string][] = [
        ["/compare", t("Compare homes", "Comparar casas"), t("Two or more listings side by side: price, size, score and costs.", "Dos o más anuncios frente a frente: precio, superficie, nota y gastos.")],
        ["/countries", t("Two countries side by side", "Dos países frente a frente"), t("Prices, rules for foreign buyers and costs of any two countries.", "Precios, normas para extranjeros y gastos de dos países cualesquiera.")],
        ["/can-i-buy", t("Can I buy there?", "¿Puedo comprar allí?"), t("The rule for your nationality in each country.", "La norma para tu nacionalidad en cada país.")],
        ["/research", t("RealHunt data", "Datos de RealHunt"), t("Prices, buying costs and rules by country, with CSV.", "Precios, gastos de compra y normas por país, con CSV.")],
      ];
      const body = `<div class="rhx-answer"><p>${esc(t(`${cards.length} free tools to work out what a home abroad really costs: the taxes and fees of the purchase, the bills of every year and the days you can spend there. No sign-up. Every result has its own link and can be saved as an image.`, `${cards.length} herramientas gratuitas para calcular lo que cuesta de verdad una casa en el extranjero: los impuestos y gastos de la compra, las facturas de cada año y los días que puedes pasar allí. Sin registro. Cada resultado tiene su propio enlace y se puede guardar como imagen.`))}</p></div>`
        + `<p class="rhx-meta">${esc(NOTE(k))} · ${t("Updated", "Actualizado el")} <time datetime="${TOOLS_DATE}">${esc(k.date(TOOLS_DATE))}</time></p>`
        + `<ul class="rhx-cards">${cards.map(([u, n, d]) => `<li><a href="${u}"><strong>${esc(n)}</strong></a><span>${esc(d)}</span></li>`).join("")}</ul>`
        + `<h2>${esc(t("How the tools work", "Cómo funcionan las herramientas"))}</h2><ul><li>${esc(t("Every rate comes from an official page that was opened and read, or from the country figures of RealHunt, which list their sources. The page of each tool names the source and the day it was read.", "Cada tipo sale de una página oficial que se abrió y se leyó, o de las cifras por país de RealHunt, que enumeran sus fuentes. La página de cada herramienta indica la fuente y el día en que se consultó."))}</li><li>${esc(t("Each page explains the sum and shows a worked example, so you can check it by hand.", "Cada página explica la cuenta y enseña un ejemplo resuelto, para que puedas comprobarla a mano."))}</li><li>${esc(t("What you type stays in your browser and in the address of the page. Nothing is stored on a server.", "Lo que escribes se queda en tu navegador y en la dirección de la página. No se guarda nada en un servidor."))}</li><li>${esc(t("Any site may embed a calculator for free with the code under each one; the link to RealHunt is the only condition.", "Cualquier web puede incrustar gratis una calculadora con el código que hay debajo de cada una; la única condición es el enlace a RealHunt."))}</li><li>${esc(t("They give general information, not legal, tax or financial advice.", "Dan información general, no asesoramiento jurídico, fiscal ni financiero."))}</li></ul>`
        + `<h2>${esc(t("Also on RealHunt", "También en RealHunt"))}</h2><ul class="rhx-cards">${also.map(([u, n, d]) => `<li><a href="${u}"><strong>${esc(n)}</strong></a><span>${esc(d)}</span></li>`).join("")}</ul>`;
      c.page(k.url("/tools"), `${t("Free calculators for buying a home abroad", "Calculadoras gratis para comprar casa fuera")} · RealHunt`, desc, c.image, frame(k, { crumbs, eyebrow: t("Free tools", "Herramientas gratuitas"), h1, body }),
        [crumbLd(k, crumbs), { "@context": "https://schema.org", "@type": "ItemList", name: h1, itemListElement: cards.map(([u, n], i) => ({ "@type": "ListItem", position: i + 1, name: n, url: k.url(u) })) }, { "@context": "https://schema.org", "@type": "CollectionPage", name: h1, description: desc, url: k.url("/tools"), inLanguage: lang, license: LICENSE, publisher: ORG, dateModified: TOOLS_DATE }],
        { group: es ? "es" : "content", lastmod: TOOLS_DATE, lang: es ? "es" : undefined, alt: { en: `${SITE}/tools`, es: `${SITE}/es/tools` } });
      if (es) registerEsPage("es/tools/index.html");
      nPages++;
    }
  }

  // the script of the iframe pages: the same code as the app's, bundled on its own (about 30 KB, loaded only there)
  if (!c.record) {
    const outfile = path.join(c.root, EMBED_PREFIX.slice(1), "embed.js");
    fs.mkdirSync(path.dirname(outfile), { recursive: true });
    buildSync({ entryPoints: [path.resolve(process.cwd(), "src/tools/embedEntry.ts")], bundle: true, minify: true, format: "iife", target: "es2019", outfile, logLevel: "silent", legalComments: "none" });
  }
  return { pages: nPages, embeds: nEmbeds };
}
