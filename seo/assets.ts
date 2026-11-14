// The data hub (14-nov-2026): pages a journalist, a blogger or an AI assistant can quote and link.
//   /research                                  index of the datasets
//   /research/prices                           median asking price and price per m² by country
//   /research/what-your-budget-buys            what up to €50,000, €100,000 and €200,000 buy in each country
//   /research/buying-costs-by-country          taxes and fees on top of the price, ranked
//   /research/where-foreigners-can-buy         who can buy where, by nationality
//   /research/best-scored-regions              regions ranked by the median score of their homes
// Each page: a short answer first, a chart, the table, the method and its limits, the date, a CSV (/research/<x>.csv,
// Spanish headers in <x>.es.csv), a Markdown copy (/research/<x>.md) and a ready citation. All figures are computed
// here from public/data/rh-static.json and src/data/*.json at build time (seo/assetsStats.ts), never typed by hand.
// Called once from seo/prerender.ts (English run); it writes both languages. The other linkable pages (press, method,
// editorial policy, embeds, for AI) are in seo/assetsTrust.ts.
import fs from "fs";
import path from "path";
import { type CanBuyData, localizeRows, localizeCanBuy, nameOf, statusLabel, UPDATED, UPDATED_ES, type Status } from "../src/community/seo2data";
import { BANDS, MIN_RANK, MIN_SHOW, budgetStats, costStats, countryStats, regionStats, ruleStats, toCsv, type Home } from "./assetsStats";
import { LICENSE, ORG, PRESS_EMAIL, SITE, bars, citeBlock, crumbLd, esc, frame, kit, mdTable, table, type Kit, type Lang, type PageFn } from "./assetsKit";
import { writeTrust } from "./assetsTrust";

export type AssetCtx = { root: string; page: PageFn; rows: Home[]; dest: Record<string, any>; guides: Record<string, any>; cb: CanBuyData; today: string; image: string };
type Dataset = { slug: string; title: string; h1: string; desc: string; card: string; answer: string[]; fig: string; body: string; limits: string[]; csv: { head: string[]; rows: (string | number)[][] }; md: string; vars: string[] };

const readJson = (f: string, d: any = {}) => { const p = path.resolve(process.cwd(), f); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : d; };
const write = (root: string, rel: string, text: string) => { const f = path.join(root, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); };
const STATUS_ICON: Record<string, string> = { yes: "✓", conditions: "!", restricted: "✕", home: "·" };

export function writeAssets(c: AssetCtx) {
  const rows = c.rows.filter((r) => r?.slug && r.price_eur > 0);
  const destEs = localizeRows(c.dest, readJson("src/data/destinations-es.json"));
  const guidesEs = localizeRows(c.guides, readJson("src/data/guides-es.json"));
  const cbEs = localizeCanBuy(c.cb, readJson("src/data/canbuy-es.json", { nationalities: {}, countries: {} }));
  const perLang: Record<Lang, Dataset[]> = { en: [], es: [] };

  for (const lang of ["en", "es"] as Lang[]) {
    const k = kit(lang); const { t, es } = k;
    const dest = es ? destEs : c.dest, guides = es ? guidesEs : c.guides, cb = es ? cbEs : c.cb;
    const cs = countryStats(rows);
    const nHomes = rows.length, nCountries = cs.length;
    const under100 = Math.round((rows.filter((r) => r.price_eur <= 100000).length / nHomes) * 100);
    const sample = (n: number) => (n < MIN_RANK ? t(`small sample: ${n} homes`, `muestra pequeña: ${k.num(n)} casas`) : t(`${n} homes`, `${k.num(n)} casas`));
    const cLink = (key: string, name: string) => `<a href="/homes/${esc(key)}">${esc(k.country(name))}</a>`;
    const na = t("n/a", "s. d.");
    const weakKey = t(`Hatched bar: fewer than ${MIN_RANK} homes, read with care.`, `Barra rayada: menos de ${MIN_RANK} casas, cifra orientativa.`);
    const selection = t(
      `RealHunt is not a census of the market. A person picks homes that are cheap for their country and ready to live in, so these are medians of ${k.num(nHomes)} chosen listings (${under100}% of them at or under €100,000), not national averages.`,
      `RealHunt no es un censo del mercado. Una persona elige casas baratas para su país y listas para entrar a vivir, así que estas cifras son medianas de ${k.num(nHomes)} anuncios escogidos (el ${under100}% cuesta 100.000 € o menos), no medias nacionales.`);
    const asking = t("Prices are asking prices in euros, as listed on the day each home was added. A sale can close lower.", "Los precios son los de salida de cada anuncio, en euros, el día en que se añadió la casa. La venta puede cerrarse por menos.");
    const medianNote = t("Median: the middle home when they are sorted (with an even number, the upper of the two in the middle).", "Mediana: la casa que queda en el centro al ordenarlas (si el número es par, la más alta de las dos centrales).");
    const smallNote = t(`Countries with fewer than ${MIN_RANK} homes are shown and marked as a small sample; with fewer than ${MIN_SHOW} they are left out.`, `Los países con menos de ${MIN_RANK} casas aparecen marcados como muestra pequeña; con menos de ${MIN_SHOW} no se publican.`);

    // ------------------------------------------------------------------ 1. prices by country
    const prices: Dataset = (() => {
      const byPp = cs.filter((x) => x.medPpsqm > 0).sort((a, b) => a.medPpsqm - b.medPpsqm);
      const solid = byPp.filter((x) => !x.small && x.nSqm >= MIN_RANK);
      const byPrice = cs.filter((x) => !x.small).sort((a, b) => a.medPrice - b.medPrice);
      const one = cs.filter((x) => !x.small && x.regions.length === 1);
      const lo = solid.slice(0, 3), hi = solid[solid.length - 1];
      const answer = [
        t(`Among the ${solid.length} countries with at least ${MIN_RANK} homes with a known size on RealHunt, the lowest median asking price per square metre is in ${lo.map((x) => `${k.inThe(x.name)} (${k.eur(x.medPpsqm)}/m²)`).join(", ")}, and the highest in ${k.inThe(hi.name)} (${k.eur(hi.medPpsqm)}/m²). The lowest median asking price is in ${k.inThe(byPrice[0].name)} (${k.eur(byPrice[0].medPrice)}) and ${k.inThe(byPrice[1].name)} (${k.eur(byPrice[1].medPrice)}).`,
          `Entre los ${solid.length} países con al menos ${MIN_RANK} casas de superficie conocida en RealHunt, el precio de salida mediano por metro cuadrado más bajo está en ${k.list(lo.map((x) => `${k.inThe(x.name)} (${k.eur(x.medPpsqm)}/m²)`))}, y el más alto en ${k.inThe(hi.name)} (${k.eur(hi.medPpsqm)}/m²). El precio de salida mediano más bajo está en ${k.inThe(byPrice[0].name)} (${k.eur(byPrice[0].medPrice)}) y ${k.inThe(byPrice[1].name)} (${k.eur(byPrice[1].medPrice)}).`),
        t(`Medians of ${k.num(nHomes)} listings in ${nCountries} countries, each checked by a person, on ${k.date(c.today)}. They describe the cheap, move-in-ready homes RealHunt lists, not each country's whole market.`,
          `Medianas de ${k.num(nHomes)} anuncios en ${nCountries} países, revisados uno a uno por una persona, a ${k.date(c.today)}. Describen las casas baratas y listas para vivir que publica RealHunt, no todo el mercado de cada país.`)];
      const fig = bars(k, t("Median asking price per m², by country", "Precio de salida mediano por m², por país"), t(`Euros per square metre, cheapest first. Homes on RealHunt with a known size, ${k.date(c.today)}.`, `Euros por metro cuadrado, de más barato a más caro. Casas de RealHunt con superficie conocida, ${k.date(c.today)}.`),
        byPp.map((x) => ({ label: k.country(x.name), sub: sample(x.nSqm), value: x.medPpsqm, text: `${k.eur(x.medPpsqm)}`, weak: x.nSqm < MIN_RANK })), weakKey);
      const sorted = cs.slice().sort((a, b) => (a.medPpsqm || 1e9) - (b.medPpsqm || 1e9));
      const head = es ? ["País", "Casas", "Precio mediano", "Mediana €/m²", "Casas con superficie", "Superficie mediana", "La más barata", "La más cara", "Regiones", "Nota mediana"] : ["Country", "Homes", "Median price", "Median €/m²", "Homes with size", "Median size", "Cheapest", "Most expensive", "Regions", "Median score"];
      const body = `<h2>${esc(t("Median price and price per m² by country: the table", "Precio mediano y precio por m² por país: la tabla"))}</h2>`
        + table(head.map((h, i) => ({ h, cls: i ? "n" : undefined })), sorted.map((x) => [cLink(x.k, x.name) + (x.small ? ` <small>(${esc(t("small sample", "muestra pequeña"))})</small>` : ""), k.num(x.n), k.eur(x.medPrice), x.medPpsqm ? k.eur(x.medPpsqm) : na, k.num(x.nSqm), x.medSqm ? `${k.num(x.medSqm)} m²` : na, k.eur(x.min), k.eur(x.max), String(x.regions.length), String(x.medScore)]), head.join(", "));
      const limits = [selection, asking, medianNote, smallNote,
        t("Price per m² uses only the homes whose listing gives a size; the column \"Homes with size\" says how many.", "El precio por m² solo usa las casas cuyo anuncio indica la superficie; la columna «Casas con superficie» dice cuántas."),
        ...(one.length ? [t(`In some countries every home is in one region, so the figure describes that region: ${one.map((x) => `${x.name} (${x.regions[0]})`).join(", ")}.`, `En algunos países todas las casas están en una sola región, y la cifra describe esa región: ${one.map((x) => `${k.country(x.name)} (${x.regions[0]})`).join(", ")}.`)] : []),
        t("The score is RealHunt's own grade from 70 to 98; it is explained in the method.", "La nota es la calificación propia de RealHunt, de 70 a 98; se explica en el método.")];
      return { slug: "prices", title: t("Home prices by country 2026: median price and €/m²", "Precio de la vivienda por país (2026): mediana y €/m²"), h1: t("Median asking price of a cheap home, by country (2026)", "Precio de salida mediano de una casa barata, por país (2026)"),
        desc: t(`Median asking price, price per m² and cheapest home in ${nCountries} countries, from ${k.num(nHomes)} homes checked by a person. Chart, table, CSV and method. Free to quote with a link.`, `Precio de salida mediano, precio por m² y casa más barata en ${nCountries} países, a partir de ${k.num(nHomes)} casas revisadas por una persona. Gráfico, tabla, CSV y método.`),
        card: t(`Lowest median price per m²: ${k.inThe(lo[0].name)}, ${k.eur(lo[0].medPpsqm)}.`, `Precio mediano por m² más bajo: ${k.inThe(lo[0].name)}, ${k.eur(lo[0].medPpsqm)}.`),
        answer, fig, body, limits, vars: ["median asking price (EUR)", "median asking price per m² (EUR)", "homes", "median size (m²)"],
        csv: { head: es ? ["pais", "casas", "precio_mediano_eur", "mediana_eur_m2", "casas_con_superficie", "superficie_mediana_m2", "mas_barata_eur", "mas_cara_eur", "regiones", "nota_mediana", "muestra_pequena"] : ["country", "homes", "median_price_eur", "median_eur_per_sqm", "homes_with_size", "median_size_sqm", "cheapest_eur", "most_expensive_eur", "regions", "median_score", "small_sample"],
          rows: sorted.map((x) => [k.country(x.name), x.n, x.medPrice, x.medPpsqm || "", x.nSqm, x.medSqm || "", x.min, x.max, x.regions.length, x.medScore, x.small ? (es ? "si" : "yes") : "no"]) },
        md: mdTable(head, sorted.map((x) => [k.country(x.name) + (x.small ? ` (${t("small sample", "muestra pequeña")})` : ""), x.n, k.eur(x.medPrice), x.medPpsqm ? k.eur(x.medPpsqm) : na, x.nSqm, x.medSqm ? `${x.medSqm} m²` : na, k.eur(x.min), k.eur(x.max), x.regions.length, x.medScore])) };
    })();

    // ------------------------------------------------------------------ 2. what a budget buys
    const budget: Dataset = (() => {
      const bs = budgetStats(rows);
      const bandName = (b: { lo: number; hi: number }) => (b.lo ? t(`€${k.num(b.lo + 1)} to €${k.num(b.hi)}`, `de ${k.num(b.lo + 1)} a ${k.num(b.hi)} €`) : t(`up to €${k.num(b.hi)}`, `hasta ${k.num(b.hi)} €`));
      const mid = BANDS[1];
      const m = bs.filter((r) => r.cells[mid.id].medSqm > 0 && r.cells[mid.id].nSqm >= 5).sort((a, b) => b.cells[mid.id].medSqm - a.cells[mid.id].medSqm);
      const low = bs.filter((r) => r.cells[BANDS[0].id].n >= MIN_SHOW).sort((a, b) => b.cells[BANDS[0].id].n - a.cells[BANDS[0].id].n);
      const top = m.slice(0, 3), last = m[m.length - 1];
      const answer = [
        t(`Between €50,001 and €100,000, the homes on RealHunt are largest in ${top.map((r) => `${k.inThe(r.name)} (median ${k.num(r.cells[mid.id].medSqm)} m²)`).join(", ")} and smallest in ${k.inThe(last.name)} (${k.num(last.cells[mid.id].medSqm)} m²). Up to €50,000 there are homes in ${low.length} countries, most of them in ${low.slice(0, 3).map((r) => `${k.inThe(r.name)} (${r.cells[BANDS[0].id].n})`).join(", ")}.`,
          `Entre 50.001 y 100.000 €, las casas de RealHunt son más grandes en ${k.list(top.map((r) => `${k.inThe(r.name)} (mediana de ${k.num(r.cells[mid.id].medSqm)} m²)`))} y más pequeñas en ${k.inThe(last.name)} (${k.num(last.cells[mid.id].medSqm)} m²). Hasta 50.000 € hay casas en ${low.length} países, sobre todo en ${k.list(low.slice(0, 3).map((r) => `${k.inThe(r.name)} (${r.cells[BANDS[0].id].n})`))}.`),
        t(`From ${k.num(nHomes)} listings checked by a person, ${k.date(c.today)}. A home counts in one price band only.`, `A partir de ${k.num(nHomes)} anuncios revisados por una persona, a ${k.date(c.today)}. Cada casa cuenta en un solo tramo de precio.`)];
      const fig = bars(k, t("Median size of a home priced €50,001 to €100,000", "Superficie mediana de una casa de 50.001 a 100.000 €"), t(`Square metres, largest first. Countries with at least 5 homes with a known size in this band, ${k.date(c.today)}.`, `Metros cuadrados, de mayor a menor. Países con al menos 5 casas de superficie conocida en este tramo, ${k.date(c.today)}.`),
        m.map((r) => ({ label: k.country(r.name), sub: sample(r.cells[mid.id].nSqm), value: r.cells[mid.id].medSqm, text: `${k.num(r.cells[mid.id].medSqm)} m²`, weak: r.cells[mid.id].nSqm < MIN_RANK })), weakKey);
      const head = es ? ["País", "Casas en el tramo", "Superficie mediana", "Mediana €/m²", "Dormitorios (mediana)", "Casa con mejor nota"] : ["Country", "Homes in band", "Median size", "Median €/m²", "Bedrooms (median)", "Best-scored home"];
      const title = (h: Home) => (es && h.title_es ? h.title_es : h.title) || "";
      let body = "", md = "";
      const csvRows: (string | number)[][] = [];
      for (const b of BANDS) {
        const list = bs.filter((r) => r.cells[b.id].n > 0).sort((x, y) => y.cells[b.id].n - x.cells[b.id].n);
        const h2 = t(`What ${bandName(b)} buys, by country`, `Qué se compra con ${bandName(b)}, por país`);
        body += `<h2 id="b${b.id}">${esc(h2)}</h2>` + table(head.map((h, i) => ({ h, cls: i && i < 5 ? "n" : undefined })), list.map((r) => { const x = r.cells[b.id]; return [cLink(r.k, r.name), k.num(x.n), x.medSqm ? `${k.num(x.medSqm)} m²` : na, x.medPpsqm ? k.eur(x.medPpsqm) : na, x.medBeds ? String(x.medBeds) : na, x.best ? `<a href="/deal/${esc(x.best.slug)}">${esc(title(x.best))}</a><br><small>${esc(k.eur(x.best.price_eur))}${x.best.sqm ? ` · ${esc(x.best.sqm)} m²` : ""} · ${esc(t("score", "nota"))} ${esc(x.best.nota)}</small>` : na]; }), h2);
        md += `\n### ${h2}\n\n` + mdTable(head, list.map((r) => { const x = r.cells[b.id]; return [k.country(r.name), x.n, x.medSqm ? `${x.medSqm} m²` : na, x.medPpsqm ? k.eur(x.medPpsqm) : na, x.medBeds || na, x.best ? `[${title(x.best)}](${k.url("/deal/" + x.best.slug)}), ${k.eur(x.best.price_eur)}, ${t("score", "nota")} ${x.best.nota}` : na]; }));
        for (const r of list) { const x = r.cells[b.id]; csvRows.push([k.country(r.name), b.lo ? b.lo + 1 : 0, b.hi, x.n, x.nSqm, x.medSqm || "", x.medPpsqm || "", x.medBeds || "", x.best ? SITE + "/deal/" + x.best.slug : "", x.best ? x.best.price_eur : "", x.best?.nota ?? ""]); }
      }
      return { slug: "what-your-budget-buys", title: t("What €50,000, €100,000 and €200,000 buy, by country", "Qué se compra con 50.000, 100.000 y 200.000 € por país"), h1: t("What €50,000, €100,000 and €200,000 buy, country by country (2026)", "Qué casa se compra con 50.000, 100.000 y 200.000 €, país por país (2026)"),
        desc: t(`How many homes, how big and at what price per m² you find for up to €50,000, €100,000 and €200,000 in ${nCountries} countries. Chart, tables and CSV.`, `Cuántas casas hay, de qué tamaño y a qué precio por m² con hasta 50.000, 100.000 y 200.000 € en ${nCountries} países. Gráfico, tablas y CSV.`),
        card: t(`€50,001 to €100,000 buys a median ${k.num(top[0].cells[mid.id].medSqm)} m² in ${k.inThe(top[0].name)} and ${k.num(last.cells[mid.id].medSqm)} m² in ${k.inThe(last.name)}.`, `Con 50.001 a 100.000 € se compra una mediana de ${k.num(top[0].cells[mid.id].medSqm)} m² en ${k.inThe(top[0].name)} y de ${k.num(last.cells[mid.id].medSqm)} m² en ${k.inThe(last.name)}.`),
        answer, fig, body, vars: ["homes per price band", "median size (m²)", "median asking price per m² (EUR)"],
        limits: [selection, asking, t("Price bands do not overlap: up to €50,000; €50,001 to €100,000; €100,001 to €200,000.", "Los tramos no se solapan: hasta 50.000 €; de 50.001 a 100.000 €; de 100.001 a 200.000 €."), t(`Size and price per m² are shown when at least ${MIN_SHOW} homes in the band give their size. An empty band means RealHunt lists no home there today, not that none exists in the country.`, `La superficie y el precio por m² se muestran cuando al menos ${MIN_SHOW} casas del tramo indican su superficie. Un tramo vacío significa que RealHunt no tiene hoy ninguna casa ahí, no que no exista en el país.`), medianNote],
        csv: { head: es ? ["pais", "tramo_desde_eur", "tramo_hasta_eur", "casas", "casas_con_superficie", "superficie_mediana_m2", "mediana_eur_m2", "dormitorios_mediana", "mejor_casa_url", "mejor_casa_precio_eur", "mejor_casa_nota"] : ["country", "band_from_eur", "band_to_eur", "homes", "homes_with_size", "median_size_sqm", "median_eur_per_sqm", "median_bedrooms", "best_home_url", "best_home_price_eur", "best_home_score"], rows: csvRows }, md };
    })();

    // ------------------------------------------------------------------ 3. buying costs
    const costs: Dataset = (() => {
      const st = costStats(dest).map((x) => ({ ...x, name: nameOf(x.k, guides, lang) || x.k })).filter((x) => x.name);
      const lo = st.slice(0, 3), hi = st.slice(-3).reverse();
      const on = (p: number) => k.eur(100000 * p / 100);
      const answer = [
        t(`Of ${st.length} countries and destinations, the taxes and fees you pay on top of the price are lowest in ${lo.map((x) => `${k.inThe(x.name)} (${k.pct(x.lo, x.hi)})`).join(", ")} and highest in ${hi.map((x) => `${k.inThe(x.name)} (${k.pct(x.lo, x.hi)})`).join(", ")}. On a €100,000 home that is from ${on(st[0].lo)} to ${on(Math.max(...st.map((x) => x.hi)))}.`,
          `De ${st.length} países y destinos, los impuestos y gastos que se pagan además del precio son más bajos en ${k.list(lo.map((x) => `${k.inThe(x.name)} (${k.pct(x.lo, x.hi)})`))} y más altos en ${k.list(hi.map((x) => `${k.inThe(x.name)} (${k.pct(x.lo, x.hi)})`))}. En una casa de 100.000 € eso va de ${on(st[0].lo)} a ${on(Math.max(...st.map((x) => x.hi)))}.`),
        t("Transfer tax or VAT, stamp duty, notary, land registry and lawyer, as a share of the price. Compiled from the sources linked for each country; general information, not tax advice.", "Impuesto de transmisiones o IVA, actos jurídicos, notaría, registro y abogado, como porcentaje del precio. Recopilado de las fuentes enlazadas en cada país; información general, no asesoramiento fiscal.")];
      const fig = bars(k, t("Taxes and fees on top of the price, by country", "Impuestos y gastos además del precio, por país"), t("Range in % of the purchase price, lowest first. The bar runs from the low to the high end of the range.", "Rango en % del precio de compra, de menor a mayor. La barra va del extremo bajo al extremo alto del rango."),
        st.map((x) => ({ label: k.country(x.name), value: x.hi, from: x.lo, text: k.pct(x.lo, x.hi) })));
      const head = es ? ["País", "Además del precio", "En 100.000 €", "De qué se compone", "Impuesto anual sobre la propiedad", "Datos de", "Fuentes"] : ["Country", "On top of the price", "On €100,000", "What it is made of", "Yearly property tax", "As of", "Sources"];
      const body = `<h2>${esc(t("Buying costs by country: the table", "Gastos de compra por país: la tabla"))}</h2>`
        + table([head[0], head[1], head[2], head[5], head[6]].map((h, i) => ({ h, cls: i === 1 || i === 2 ? "n" : undefined })), st.map((x) => [`<a href="/buying-costs/${esc(x.k)}">${esc(k.country(x.name))}</a>`, k.pct(x.lo, x.hi), x.lo === x.hi ? on(x.lo) : `${on(x.lo)} – ${on(x.hi)}`, esc(x.asOf) || na, `<a href="/costs/${esc(x.k)}">${x.sources.length} ${esc(t(x.sources.length === 1 ? "source" : "sources", x.sources.length === 1 ? "fuente" : "fuentes"))}</a>`]), head.join(", "))
        + `<h2>${esc(t("What the costs are made of, and the yearly tax, country by country", "De qué se componen los gastos, y el impuesto anual, país por país"))}</h2><ul class="rhx-rules">${st.map((x) => `<li><h3>${esc(k.country(x.name))}: ${esc(k.pct(x.lo, x.hi))}</h3>${x.breakdown ? `<p>${esc(x.breakdown)}</p>` : ""}${x.tax ? `<p><strong>${esc(head[4])}:</strong> ${esc(x.tax)}</p>` : ""}<p><a href="/buying-costs/${esc(x.k)}">${esc(t("Work it out for your price", "Calcúlalo para tu precio"))}</a> · <a href="/costs/${esc(x.k)}">${esc(t("Sources", "Fuentes"))}</a></p></li>`).join("")}</ul>`;
      return { slug: "buying-costs-by-country", title: t("Buying costs by country 2026: taxes and fees ranked", "Gastos de compra por país en 2026: impuestos y gastos"), h1: t("Buying costs by country: taxes and fees on top of the price (2026)", "Gastos de compra de una vivienda por país: impuestos y gastos además del precio (2026)"),
        desc: t(`What you pay on top of the price when you buy a home in ${st.length} countries, ranked from ${k.pct(st[0].lo, st[0].hi)} to ${k.pct(st[st.length - 1].lo, st[st.length - 1].hi)}, with yearly property tax and sources. Chart, table and CSV.`, `Lo que se paga además del precio al comprar una casa en ${st.length} países, ordenado del ${k.pct(st[0].lo, st[0].hi)} al ${k.pct(st[st.length - 1].lo, st[st.length - 1].hi)}, con el impuesto anual y las fuentes. Gráfico, tabla y CSV.`),
        card: t(`From ${k.pct(st[0].lo, st[0].hi)} in ${k.inThe(st[0].name)} to ${k.pct(st[st.length - 1].lo, st[st.length - 1].hi)} in ${k.inThe(st[st.length - 1].name)}.`, `Del ${k.pct(st[0].lo, st[0].hi)} en ${k.inThe(st[0].name)} al ${k.pct(st[st.length - 1].lo, st[st.length - 1].hi)} en ${k.inThe(st[st.length - 1].name)}.`),
        answer, fig, body, vars: ["purchase costs low (% of price)", "purchase costs high (% of price)", "annual property tax"],
        limits: [t("Ranges cover new and resale homes and different regions; where sources disagree, the range is wider. The order uses the middle of each range.", "Los rangos cubren obra nueva y segunda mano y distintas regiones; donde las fuentes no coinciden, el rango es más amplio. El orden usa el punto medio de cada rango."),
          t("Each country page lists the sources that were opened and read, and the year of the figures.", "La página de cada país enumera las fuentes que se abrieron y leyeron, y el año de las cifras."),
          t("Rules and rates change. This is general information, not tax or legal advice: check with a local lawyer or notary before you sign.", "Las normas y los tipos cambian. Es información general, no asesoramiento fiscal ni jurídico: consúltalo con un abogado o notario del país antes de firmar."),
          t("Agent fees paid by the seller, mortgage costs and currency exchange are not included.", "No se incluyen los honorarios de agencia que paga el vendedor, los gastos de hipoteca ni el cambio de divisa.")],
        csv: { head: es ? ["pais", "gastos_min_pct", "gastos_max_pct", "en_100000_min_eur", "en_100000_max_eur", "composicion", "impuesto_anual", "datos_de", "pagina"] : ["country", "costs_low_pct", "costs_high_pct", "on_100000_low_eur", "on_100000_high_eur", "breakdown", "annual_property_tax", "as_of", "page"], rows: st.map((x) => [k.country(x.name), x.lo, x.hi, 1000 * x.lo, 1000 * x.hi, x.breakdown, x.tax, x.asOf, SITE + "/costs/" + x.k]) },
        md: mdTable(head.slice(0, 6), st.map((x) => [k.country(x.name), k.pct(x.lo, x.hi), x.lo === x.hi ? on(x.lo) : `${on(x.lo)} – ${on(x.hi)}`, x.breakdown || na, x.tax || na, x.asOf || na])) };
    })();

    // ------------------------------------------------------------------ 4. who can buy where
    const rules: Dataset = (() => {
      const keys = Object.keys(guides).filter((x) => dest[x] && cb.countries[x]).sort((a, b) => guides[a].name.localeCompare(guides[b].name, lang));
      const rs = ruleStats(cb, keys);
      const nm = (x: string) => guides[x].name as string;
      const of = (s: Status, bloc: "eu" | "other") => rs.filter((r) => r[bloc] === s).map((r) => nm(r.k));
      const label = (s: string) => (s === "home" ? t("home country", "su país") : statusLabel(s as Status, lang));
      const pill = (s: string) => `<span class="rhx-st ${s}"><span aria-hidden="true">${STATUS_ICON[s]}</span> ${esc(label(s))}</span>`;
      const nats = Object.entries(cb.nationalities);
      const answer = [
        t(`Of ${rs.length} countries, ${of("yes", "other").length} let a buyer of any nationality buy a home on the same terms as locals (${of("yes", "other").join(", ")}), ${of("conditions", "other").length} allow it with conditions such as a permit, a trust or a limit on land, and ${of("restricted", "other").length} restrict it for most people who do not live there (${of("restricted", "other").join(", ")}). EU citizens buy without conditions in ${of("yes", "eu").length} of them.`,
          `De ${rs.length} países, ${of("yes", "other").length} dejan comprar una casa a cualquier nacionalidad en las mismas condiciones que a sus ciudadanos (${k.list(of("yes", "other"))}), ${of("conditions", "other").length} lo permiten con condiciones como un permiso, un fideicomiso o un límite sobre el suelo, y ${of("restricted", "other").length} lo restringen para la mayoría de quienes no viven allí (${k.list(of("restricted", "other"))}). Los ciudadanos de la UE compran sin condiciones en ${of("yes", "eu").length} de ellos.`),
        t(`Rules as of ${UPDATED}, for ${nats.length} nationalities. General information, not legal advice.`, `Normas a ${UPDATED_ES}, para ${nats.length} nacionalidades. Información general, no asesoramiento jurídico.`)];
      const cnt = (s: Status) => rs.filter((r) => r.other === s).length;
      const fig = bars(k, t("Can a buyer from outside the EU buy a home there?", "¿Puede comprar una casa alguien de fuera de la UE?"), t(`Number of countries, out of ${rs.length}, by the rule for buyers who are not EU citizens.`, `Número de países, de ${rs.length}, según la norma para compradores que no son ciudadanos de la UE.`),
        (["yes", "conditions", "restricted"] as Status[]).map((s) => ({ label: statusLabel(s, lang), value: cnt(s), text: String(cnt(s)) })));
      const head = es ? ["País", "Ciudadanos de la UE", "Otras nacionalidades", "La norma en una frase", "Por nacionalidad"] : ["Country", "EU citizens", "Other nationalities", "The rule in one line", "By nationality"];
      const first = (nk: string, ck: string) => `/can-i-buy/${nk}-in-${ck}`;
      const natFor = (ck: string) => nats.find(([, nv]) => nv.home !== ck && nv.bloc === "other")?.[0] || nats[0][0];
      let body = `<h2>${esc(t("Who can buy a home where: the rule in each country", "Quién puede comprar una casa y dónde: la norma de cada país"))}</h2>`
        + `<ul class="rhx-rules">${rs.map((r) => `<li><h3>${esc(nm(r.k))}</h3><dl><div><dt>${esc(head[1])}</dt><dd>${pill(r.eu)}</dd></div><div><dt>${esc(head[2])}</dt><dd>${pill(r.other)}</dd></div></dl><p>${esc(dest[r.k]?.can_foreigners_buy || na)}</p><p><a href="/can-i-buy">${esc(t("By nationality", "Por nacionalidad"))}</a> · <a href="/guide/${esc(r.k)}">${esc(t(`How to buy in ${k.inThe(nm(r.k))}`, `Cómo comprar en ${k.inThe(nm(r.k))}`))}</a></p></li>`).join("")}</ul>`
        + `<h2>${esc(t("By nationality: the full grid", "Por nacionalidad: la tabla completa"))}</h2><p class="rhx-note">${(["yes", "conditions", "restricted"] as string[]).map(pill).join(" ")} ${pill("home")}</p>`
        + table([{ h: t("Country", "País") }, ...nats.map(([, nv]) => ({ h: nv.label }))], rs.map((r) => [esc(nm(r.k)), ...nats.map(([nk]) => { const s = r.byNat[nk]; return s === "home" ? `<span title="${esc(label(s))}">·</span>` : `<a href="${first(nk, r.k)}" title="${esc(label(s))}" aria-label="${esc(label(s))}" style="text-decoration:none"><span class="rhx-st ${s}" style="padding:2px 7px">${STATUS_ICON[s]}</span></a>`; })]), t("Rules by nationality", "Normas por nacionalidad"));
      body += `<p class="rhx-note">${esc(cb._meta?.note ? t("Yes: same terms as locals or no permit needed. With conditions: possible with a permit, a trust, a company or a limit. Restricted: not possible for most buyers who do not live there.", "Sí: mismas condiciones que los ciudadanos del país o sin permiso. Con condiciones: posible con un permiso, un fideicomiso, una sociedad o un límite. Restringido: no es posible para la mayoría de compradores que no viven allí.") : "")}</p>`;
      return { slug: "where-foreigners-can-buy", title: t(`Where foreigners can buy property: ${rs.length} countries (2026)`, `Dónde puede comprar casa un extranjero: ${rs.length} países`), h1: t(`Where foreigners can and cannot buy a home: the rules in ${rs.length} countries (2026)`, `Dónde puede y dónde no puede comprar casa un extranjero: las normas de ${rs.length} países (2026)`),
        desc: t(`Which of ${rs.length} countries let foreigners buy a home freely, which set conditions and which restrict it, for EU citizens, non-EU buyers and ${nats.length} nationalities.`, `Cuáles de ${rs.length} países dejan comprar casa libremente a un extranjero, cuáles ponen condiciones y cuáles lo restringen, por nacionalidad. Tabla y CSV.`),
        card: t(`Free for any nationality in ${of("yes", "other").length} of ${rs.length} countries; restricted in ${k.list(of("restricted", "other"))}.`, `Libre para cualquier nacionalidad en ${of("yes", "other").length} de ${rs.length} países; restringido en ${k.list(of("restricted", "other"))}.`),
        answer, fig, body, vars: ["rule for EU citizens", "rule for other nationalities", "rule by nationality"],
        limits: [t("The status is a summary. The page of each nationality and country explains the condition (permit, trust, company, land limit) and the residency rules.", "El estado es un resumen. La página de cada nacionalidad y país explica la condición (permiso, fideicomiso, sociedad, límite sobre el suelo) y las normas de residencia."),
          t("Owning a home does not by itself give the right to live in a country.", "Tener una casa no da por sí solo derecho a vivir en un país."),
          t("Compiled from the sources listed on each country's cost page and public government sources. Rules change: general information, not legal advice.", "Recopilado de las fuentes citadas en la página de gastos de cada país y de fuentes públicas oficiales. Las normas cambian: información general, no asesoramiento jurídico."),
          t("EU citizens here also covers Norway, Iceland and Liechtenstein unless the detail page says otherwise; Swiss buyers follow the rule for other nationalities unless a country treats them differently.", "«Ciudadanos de la UE» incluye aquí a Noruega, Islandia y Liechtenstein salvo que la página de detalle diga otra cosa; los compradores suizos siguen la norma de otras nacionalidades salvo que un país los trate distinto.")],
        csv: { head: [es ? "pais" : "country", es ? "ciudadanos_ue" : "eu_citizens", es ? "otras_nacionalidades" : "other_nationalities", ...nats.map(([nk]) => nk), es ? "norma" : "rule"], rows: rs.map((r) => [nm(r.k), label(r.eu), label(r.other), ...nats.map(([nk]) => label(r.byNat[nk])), String(dest[r.k]?.can_foreigners_buy || "")]) },
        md: mdTable(head.slice(0, 4), rs.map((r) => [nm(r.k), label(r.eu), label(r.other), String(dest[r.k]?.can_foreigners_buy || na)])) };
    })();

    // ------------------------------------------------------------------ 5. best-scored regions
    const regions: Dataset = (() => {
      const rg = regionStats(rows, 5);
      const top = rg.slice(0, 3);
      const answer = [
        t(`Among the ${rg.length} regions with at least 5 homes on RealHunt, the highest median score is in ${top.map((r) => `${r.name}, ${r.country} (${r.medScore}, median price ${k.eur(r.medPrice)})`).join("; ")}.`,
          `Entre las ${rg.length} regiones con al menos 5 casas en RealHunt, la nota mediana más alta está en ${top.map((r) => `${r.name}, ${k.country(r.country)} (${r.medScore}, precio mediano de ${k.eur(r.medPrice)})`).join("; ")}.`),
        t(`The score is RealHunt's own grade from 70 to 98, built from 11 sub-scores such as price, space, condition, water, weather and airport. ${k.date(c.today)}.`, `La nota es la calificación propia de RealHunt, de 70 a 98, hecha con 11 notas parciales como precio, espacio, estado, agua, clima y aeropuerto. ${k.date(c.today)}.`)];
      const fig = bars(k, t("Median RealHunt score, the 15 best regions", "Nota RealHunt mediana, las 15 mejores regiones"), t(`Score from 70 to 98; regions with at least 5 homes, ${k.date(c.today)}.`, `Nota de 70 a 98; regiones con al menos 5 casas, ${k.date(c.today)}.`),
        rg.slice(0, 15).map((r) => ({ label: r.name, sub: `${k.country(r.country)} · ${sample(r.n)}`, value: r.medScore, text: String(r.medScore), weak: r.n < MIN_RANK })), weakKey);
      const head = es ? ["Región", "País", "Casas", "Nota mediana", "Mejor nota", "Precio mediano", "Mediana €/m²"] : ["Region", "Country", "Homes", "Median score", "Best score", "Median price", "Median €/m²"];
      const body = `<h2>${esc(t("Regions ranked by median score: the table", "Regiones ordenadas por nota mediana: la tabla"))}</h2>`
        + table(head.map((h, i) => ({ h, cls: i > 1 ? "n" : undefined })), rg.map((r) => [`<a href="/homes/${esc(r.cc)}/${esc(r.slug)}">${esc(r.name)}</a>`, cLink(r.cc, r.country), k.num(r.n), String(r.medScore), String(r.top), k.eur(r.medPrice), r.medPpsqm ? k.eur(r.medPpsqm) : na]), head.join(", "));
      return { slug: "best-scored-regions", title: t("Best-scored regions for a cheap home (2026)", "Regiones con mejor nota para una casa barata (2026)"), h1: t("Best-scored regions for a cheap home, ranked (2026)", "Las regiones con mejor nota para comprar una casa barata (2026)"),
        desc: t(`${rg.length} regions ranked by the median RealHunt score of their homes, with the number of homes, median price and price per m². Chart, table and CSV.`, `${rg.length} regiones ordenadas por la nota RealHunt mediana de sus casas, con el número de casas, el precio mediano y el precio por m². Gráfico, tabla y CSV.`),
        card: t(`Highest median score: ${top[0].name}, ${top[0].country} (${top[0].medScore}).`, `Nota mediana más alta: ${top[0].name}, ${k.country(top[0].country)} (${top[0].medScore}).`),
        answer, fig, body, vars: ["median RealHunt score", "homes", "median asking price (EUR)", "median asking price per m² (EUR)"],
        limits: [t("The score compares the homes on RealHunt with each other. It is not a rating of the region as a place to live, nor a valuation.", "La nota compara entre sí las casas de RealHunt. No es una valoración de la región como lugar para vivir ni una tasación."),
          t("A region is the last part of each home's location before the country (a province, a state, a county or a city).", "Una región es la última parte de la ubicación de cada casa antes del país (una provincia, un estado, un condado o una ciudad)."),
          t(`Regions with fewer than 5 homes are left out; those with fewer than ${MIN_RANK} are marked as a small sample.`, `Las regiones con menos de 5 casas no aparecen; las que tienen menos de ${MIN_RANK} van marcadas como muestra pequeña.`), selection, medianNote],
        csv: { head: es ? ["region", "pais", "casas", "nota_mediana", "mejor_nota", "precio_mediano_eur", "mediana_eur_m2", "pagina"] : ["region", "country", "homes", "median_score", "best_score", "median_price_eur", "median_eur_per_sqm", "page"], rows: rg.map((r) => [r.name, k.country(r.country), r.n, r.medScore, r.top, r.medPrice, r.medPpsqm || "", `${SITE}/homes/${r.cc}/${r.slug}`]) },
        md: mdTable(head, rg.map((r) => [r.name, k.country(r.country), r.n, r.medScore, r.top, k.eur(r.medPrice), r.medPpsqm ? k.eur(r.medPpsqm) : na])) };
    })();

    const sets = [prices, budget, costs, rules, regions];
    perLang[lang] = sets;
    const hubCrumb: [string, string] = [t("Data", "Datos"), "/research"];

    // ------------------------------------------------------------------ one page, one CSV and one Markdown file per dataset
    for (const d of sets) {
      const p = `/research/${d.slug}`;
      const csvPath = `/research/${d.slug}${es ? ".es" : ""}.csv`, mdPath = `/research/${d.slug}${es ? ".es" : ""}.md`;
      const crumbs: [string, string][] = [["RealHunt", "/"], hubCrumb, [d.h1, p]];
      const others = sets.filter((x) => x.slug !== d.slug);
      const meta = `${t("Updated", "Actualizado el")} <time datetime="${c.today}">${esc(k.date(c.today))}</time> · ${t("Source: RealHunt", "Fuente: RealHunt")} · <a href="${csvPath}" download>${t("Download the CSV", "Descargar el CSV")}</a> · <a href="${mdPath}">${t("Markdown version", "Versión en Markdown")}</a> · <a href="#cite">${t("How to cite", "Cómo citar")}</a>`;
      const body = `<div class="rhx-answer">${d.answer.map((a) => `<p>${esc(a)}</p>`).join("")}</div><p class="rhx-meta">${meta}</p>${d.fig}${d.body}`
        + `<h2>${esc(t("Method and limits", "Método y límites"))}</h2><ul>${d.limits.map((x) => `<li>${esc(x)}</li>`).join("")}</ul><p><a href="/method">${esc(t("How homes are chosen and scored", "Cómo se eligen y se puntúan las casas"))}</a> · <a href="/editorial-policy">${esc(t("Editorial policy and corrections", "Política editorial y correcciones"))}</a></p>`
        + citeBlock(k, d.h1, p, c.today)
        + `<h2>${esc(t("More data from RealHunt", "Más datos de RealHunt"))}</h2><ul>${others.map((x) => `<li><a href="/research/${x.slug}">${esc(x.h1)}</a></li>`).join("")}<li><a href="/research">${esc(t("All datasets", "Todos los datos"))}</a></li></ul>`;
      const ld = [crumbLd(k, crumbs), { "@context": "https://schema.org", "@type": "Dataset", name: d.h1, description: d.desc, url: k.url(p), inLanguage: lang, dateModified: c.today, datePublished: c.today, isAccessibleForFree: true, license: LICENSE, creator: ORG, publisher: ORG, variableMeasured: d.vars, keywords: es ? ["vivienda", "precio de la vivienda", "comprar casa en el extranjero"] : ["housing", "home prices", "buying property abroad"],
        distribution: [{ "@type": "DataDownload", encodingFormat: "text/csv", contentUrl: SITE + csvPath }, { "@type": "DataDownload", encodingFormat: "text/markdown", contentUrl: SITE + mdPath }] }];
      const alt = { en: `${SITE}${p}`, es: `${SITE}/es${p}` };
      const head = `<link rel="alternate" type="text/markdown" href="${SITE}${mdPath}" /><link rel="alternate" type="text/csv" href="${SITE}${csvPath}" />`;
      c.page(k.url(p), `${d.title} · RealHunt`, d.desc, c.image, frame(k, { crumbs, eyebrow: t("RealHunt data", "Datos de RealHunt"), h1: d.h1, body }), ld, { group: es ? "es" : "content", lastmod: c.today, lang: es ? "es" : undefined, alt, head });
      write(c.root, csvPath, "﻿" + toCsv(d.csv.head, d.csv.rows));
      write(c.root, mdPath, `# ${d.h1}\n\n${d.answer.join("\n\n")}\n\n${t("Updated", "Actualizado el")} ${k.date(c.today)}. ${t("Source", "Fuente")}: RealHunt, ${k.url(p)} (CC BY 4.0). CSV: ${SITE}${csvPath}\n\n## ${t("The table", "La tabla")}\n\n${d.md}\n## ${t("Method and limits", "Método y límites")}\n\n${d.limits.map((x) => `- ${x}`).join("\n")}\n\n## ${t("How to cite", "Cómo citar")}\n\nRealHunt (${c.today.slice(0, 4)}). ${d.h1}. ${k.url(p)}\n`);
    }

    // ------------------------------------------------------------------ the index
    {
      const crumbs: [string, string][] = [["RealHunt", "/"], hubCrumb];
      const h1 = t("RealHunt data: home prices, buying costs and rules for foreign buyers, by country", "Datos de RealHunt: precios de la vivienda, gastos de compra y normas para extranjeros, por país");
      const desc = t(`Five datasets on buying a cheap home abroad, computed from ${k.num(nHomes)} homes checked by a person and the rules of ${Object.keys(c.guides).length} countries. Chart, table, CSV and method for each.`, `Cinco conjuntos de datos sobre comprar casa barata en el extranjero, calculados con ${k.num(nHomes)} casas revisadas por una persona y las normas de ${Object.keys(c.guides).length} países. Con gráfico, tabla y CSV.`);
      const body = `<div class="rhx-answer"><p>${esc(t(`RealHunt publishes five datasets, recomputed on every update from the ${k.num(nHomes)} homes on the site and the buying rules of ${Object.keys(c.guides).length} countries. Anyone may quote them with a link.`, `RealHunt publica cinco conjuntos de datos, recalculados en cada actualización con las ${k.num(nHomes)} casas de la web y las normas de compra de ${Object.keys(c.guides).length} países. Cualquiera puede citarlos con un enlace.`))}</p></div>`
        + `<p class="rhx-meta">${t("Updated", "Actualizado el")} <time datetime="${c.today}">${esc(k.date(c.today))}</time> · Creative Commons BY 4.0</p>`
        + `<ul class="rhx-cards">${sets.map((d) => `<li><a href="/research/${d.slug}"><strong>${esc(d.h1)}</strong></a><span>${esc(d.card)}</span><em><a href="/research/${d.slug}${es ? ".es" : ""}.csv" download>CSV</a> · <a href="/research/${d.slug}${es ? ".es" : ""}.md">Markdown</a></em></li>`).join("")}</ul>`
        + `<h2>${esc(t("What the data is", "Qué son estos datos"))}</h2><ul><li>${esc(selection)}</li><li>${esc(asking)}</li><li>${esc(t("Every figure carries its date and the number of homes behind it. Small samples are marked, never hidden.", "Cada cifra lleva su fecha y el número de casas que hay detrás. Las muestras pequeñas se marcan, nunca se esconden."))}</li><li>${esc(t("Buying costs and rules for foreign buyers are compiled from the sources linked on each country page. General information, not legal or tax advice.", "Los gastos de compra y las normas para extranjeros se recopilan de las fuentes enlazadas en la página de cada país. Información general, no asesoramiento jurídico ni fiscal."))}</li></ul>`
        + `<h2>${esc(t("More research", "Más estudios"))}</h2><ul><li><a href="/what-100k-buys">${esc(t("What €100,000 buys: the best-scored home in each country", "Qué se compra con 100.000 €: la casa de mejor nota de cada país"))}</a></li><li><a href="/research/new-builds">${esc(t("State of cheap new builds, monthly", "Estado de la obra nueva barata, cada mes"))}</a></li><li><a href="/countries">${esc(t("Two countries side by side", "Dos países frente a frente"))}</a></li><li><a href="/blog">${esc(t("Studies and guides", "Estudios y guías"))}</a></li></ul>`
        + `<h2>${esc(t("Use it", "Cómo usarlos"))}</h2><p>${t(`Quote any figure with a link to its page. For a custom cut of the data, a comment or an interview, write to <a href="mailto:${PRESS_EMAIL}">${PRESS_EMAIL}</a>.`, `Cita cualquier cifra con un enlace a su página. Para un corte de datos a medida, una declaración o una entrevista, escribe a <a href="mailto:${PRESS_EMAIL}">${PRESS_EMAIL}</a>.`)}</p>`
        + `<p><a class="rhx-btn" href="/press">${esc(t("Press page", "Página de prensa"))}</a><a class="rhx-btn" href="/embed">${esc(t("Badges and widgets", "Insignias y widgets"))}</a><a class="rhx-btn" href="/method">${esc(t("How the score works", "Cómo funciona la nota"))}</a><a class="rhx-btn" href="/for-ai">${esc(t("For AI assistants", "Para asistentes de IA"))}</a></p>`;
      c.page(k.url("/research"), `${t("RealHunt data: home prices, costs and rules by country", "Datos de RealHunt: precios, gastos y normas por país")} · RealHunt`, desc, c.image, frame(k, { crumbs, eyebrow: t("RealHunt data", "Datos de RealHunt"), h1, body }),
        [crumbLd(k, crumbs), { "@context": "https://schema.org", "@type": "DataCatalog", name: h1, description: desc, url: k.url("/research"), inLanguage: lang, license: LICENSE, creator: ORG, dateModified: c.today, dataset: sets.map((d) => ({ "@type": "Dataset", name: d.h1, url: k.url(`/research/${d.slug}`) })) }],
        { group: es ? "es" : "content", lastmod: c.today, lang: es ? "es" : undefined, alt: { en: `${SITE}/research`, es: `${SITE}/es/research` } });
    }
  }

  writeTrust(c, rows, perLang);
}
export { finishAssets } from "./assetsTrust";
