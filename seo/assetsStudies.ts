// Five more datasets of the data hub (15-nov-2026), in the same shape as the first five (seo/assets.ts): a short
// answer, a chart, the table, method and limits, CSV, Markdown and a citation.
//   /research/homes-under-50000          where the homes at or under €50,000 are: countries and regions
//   /research/years-of-salary            years of average net pay that the median home costs (prices: RealHunt; pay: Eurostat)
//   /research/flood-indicator            share of homes with a medium or high flood indicator, by country
//   /research/price-by-airport-distance  price and price per m² by distance to the nearest airport
//   /research/new-build-prices           starting price and price per m² in the five new-build rankings
// Every figure is computed in seo/assetsStats.ts from public/data/rh-static.json or src/data, with its sample size.
import fs from "fs";
import path from "path";
import { MIN_RANK, MIN_SHOW, MIN_STUDY, airportByCountry, airportStats, cheapRegions, cheapStats, floodStats, newBuildStats, salaryStats, type Home, type Project } from "./assetsStats";
import { bars, esc, mdTable, table, type Kit } from "./assetsKit";
import type { AssetCtx, Dataset } from "./assets";

export type StudyKit = { k: Kit; c: AssetCtx; rows: Home[]; sample: (n: number) => string; cLink: (key: string, name: string) => string; na: string; weakKey: string; selection: string; asking: string; medianNote: string };
const readJson = (f: string, d: any = {}) => { const p = path.resolve(process.cwd(), f); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : d; };
const TOPS: [string, string, string][] = [["bali", "Bali", "Bali"], ["phuket", "Phuket", "Phuket"], ["samui", "Koh Samui", "Koh Samui"], ["tulum", "Tulum", "Tulum"], ["batumi", "Batumi", "Batumi"]];

export function moreStudies(h: StudyKit): Dataset[] {
  const { k, c, rows, sample, cLink, na, weakKey, selection, asking, medianNote } = h, { t, es } = k;
  const nHomes = rows.length, day = k.date(c.today);
  const yes = es ? "si" : "yes";
  const out: Dataset[] = [];

  // ------------------------------------------------------------------ homes at or under €50,000
  {
    const cs = cheapStats(rows), rg = cheapRegions(rows);
    const total = rows.filter((r) => r.price_eur <= 50000).length, u30 = rows.filter((r) => r.price_eur <= 30000).length, u25 = rows.filter((r) => r.price_eur <= 25000).length;
    if (cs.length >= 2) {
      const top = cs.slice(0, 3);
      const answer = [
        t(`${k.num(total)} of the ${k.num(nHomes)} homes on RealHunt cost €50,000 or less, and ${k.num(u30)} cost €30,000 or less. Most are in ${top.map((x) => `${k.inThe(x.name)} (${x.under})`).join(", ")}. ${rg.length ? `The region with the most is ${rg[0].name}, ${rg[0].country}, with ${rg[0].n}.` : ""}`,
          `${k.num(total)} de las ${k.num(nHomes)} casas de RealHunt cuestan 50.000 € o menos, y ${k.num(u30)} cuestan 30.000 € o menos. La mayoría están en ${k.list(top.map((x) => `${k.inThe(x.name)} (${x.under})`))}. ${rg.length ? `La región con más es ${rg[0].name}, ${k.country(rg[0].country)}, con ${rg[0].n}.` : ""}`),
        t(`Homes checked by a person and ready to live in, at their asking price on ${day}. Countries and regions with fewer than ${MIN_SHOW} such homes are not listed.`, `Casas revisadas por una persona y listas para entrar a vivir, a su precio de salida a ${day}. No aparecen los países ni las regiones con menos de ${MIN_SHOW} casas así.`)];
      const fig = bars(k, t("Homes at or under €50,000, by country", "Casas de 50.000 € o menos, por país"), t(`Number of homes on RealHunt, ${day}. In brackets, the share of that country's homes.`, `Número de casas en RealHunt, a ${day}. Entre paréntesis, la parte de las casas de ese país.`),
        cs.map((x) => ({ label: k.country(x.name), sub: t(`${x.share}% of ${x.n} homes`, `${x.share} % de ${x.n} casas`), value: x.under, text: String(x.under), weak: x.under < MIN_STUDY })), t(`Hatched bar: fewer than ${MIN_STUDY} homes.`, `Barra rayada: menos de ${MIN_STUDY} casas.`));
      const head = es ? ["País", "Casas de 50.000 € o menos", "Parte de las casas del país", "De 30.000 € o menos", "La más barata", "Superficie mediana"] : ["Country", "Homes at or under €50,000", "Share of the country's homes", "At or under €30,000", "Cheapest", "Median size"];
      const head2 = es ? ["Región", "País", "Casas de 50.000 € o menos", "Precio mediano", "Mediana €/m²"] : ["Region", "Country", "Homes at or under €50,000", "Median price", "Median €/m²"];
      const body = `<h2>${esc(t("Homes at or under €50,000 by country: the table", "Casas de 50.000 € o menos por país: la tabla"))}</h2>`
        + table(head.map((x, i) => ({ h: x, cls: i ? "n" : undefined })), cs.map((x) => [`<a href="/homes/${esc(x.k)}/under-50000">${esc(k.country(x.name))}</a>`, k.num(x.under), `${x.share}%`, k.num(x.under30), k.eur(x.cheapest), x.medSqm ? `${k.num(x.medSqm)} m²` : na]), head.join(", "))
        + (rg.length ? `<h2>${esc(t("Regions with the most homes at or under €50,000", "Regiones con más casas de 50.000 € o menos"))}</h2>` + table(head2.map((x, i) => ({ h: x, cls: i > 1 ? "n" : undefined })), rg.map((r) => [`<a href="/homes/${esc(r.cc)}/${esc(r.slug)}">${esc(r.name)}</a>`, cLink(r.cc, r.country), k.num(r.n), k.eur(r.medPrice), r.medPpsqm ? k.eur(r.medPpsqm) : na]), head2.join(", ")) : "")
        + `<p>${esc(t(`Below €25,000 there are ${k.num(u25)} homes. A single town rarely has more than one or two, which is why the table groups them by region.`, `Por debajo de 25.000 € hay ${k.num(u25)} casas. Un mismo pueblo rara vez tiene más de una o dos, por eso la tabla las agrupa por región.`))}</p>`;
      out.push({ slug: "homes-under-50000", title: t("Where homes under €50,000 are: countries and regions", "Dónde hay casas por menos de 50.000 €: países y regiones"), h1: t("Where the homes under €50,000 are: countries and regions (2026)", "Dónde están las casas de menos de 50.000 €: países y regiones (2026)"),
        desc: t(`${k.num(total)} homes at or under €50,000, checked by a person: how many each country and region has, the cheapest and the median size. Chart, tables and CSV.`, `${k.num(total)} casas de 50.000 € o menos, revisadas por una persona: cuántas tiene cada país y región, la más barata y la superficie mediana. Gráfico, tablas y CSV.`),
        card: t(`${k.num(total)} homes at or under €50,000; most in ${k.inThe(top[0].name)} (${top[0].under}).`, `${k.num(total)} casas de 50.000 € o menos; la mayoría en ${k.inThe(top[0].name)} (${top[0].under}).`),
        answer, fig, body, vars: ["homes at or under EUR 50,000", "share of the country's homes (%)", "homes at or under EUR 30,000", "cheapest asking price (EUR)"],
        limits: [selection, asking, t("A region is the last part of each home's location before the country (a province, a state, a county or a city).", "Una región es la última parte de la ubicación de cada casa antes del país (una provincia, un estado, un condado o una ciudad)."), t("The count describes what RealHunt lists today. A country that is missing may have such homes that have not been added yet.", "El recuento describe lo que RealHunt publica hoy. Un país que no aparece puede tener casas así que aún no se han añadido."), medianNote],
        csv: { head: es ? ["tipo", "pais", "region", "casas_hasta_50000", "parte_del_pais_pct", "casas_hasta_30000", "mas_barata_eur", "precio_mediano_eur", "pagina"] : ["level", "country", "region", "homes_at_or_under_50000", "share_of_country_pct", "homes_at_or_under_30000", "cheapest_eur", "median_price_eur", "page"],
          rows: [...cs.map((x) => [es ? "pais" : "country", k.country(x.name), "", x.under, x.share, x.under30, x.cheapest, "", `https://realhunt.co/homes/${x.k}/under-50000`]), ...rg.map((r) => ["region", k.country(r.country), r.name, r.n, "", "", "", r.medPrice, `https://realhunt.co/homes/${r.cc}/${r.slug}`])] },
        md: mdTable(head, cs.map((x) => [k.country(x.name), x.under, `${x.share}%`, x.under30, k.eur(x.cheapest), x.medSqm ? `${x.medSqm} m²` : na])) + (rg.length ? "\n" + mdTable(head2, rg.map((r) => [r.name, k.country(r.country), r.n, k.eur(r.medPrice), r.medPpsqm ? k.eur(r.medPpsqm) : na])) : "") });
    }
  }

  // ------------------------------------------------------------------ years of average net pay
  {
    const earn = readJson("src/data/earnings.json"), meta = earn._meta || {};
    const st = salaryStats(rows, earn);
    if (st.length >= 3 && meta.year) {
      const solid = st.filter((x) => !x.small), lo = solid[0], hi = solid[solid.length - 1];
      const answer = [
        t(`The median home on RealHunt costs ${k.dec(lo.years)} years of average net pay in ${k.inThe(lo.name)} and ${k.dec(hi.years)} in ${k.inThe(hi.name)}, among the ${solid.length} countries with at least ${MIN_RANK} homes and Eurostat earnings data. In ${k.inThe(lo.name)} that is a median asking price of ${k.eur(lo.medPrice)} against net earnings of ${k.eur(lo.earnings)} a year.`,
          `La casa mediana de RealHunt cuesta ${k.dec(lo.years)} años de sueldo neto medio en ${k.inThe(lo.name)} y ${k.dec(hi.years)} en ${k.inThe(hi.name)}, entre los ${solid.length} países con al menos ${MIN_RANK} casas y datos de salarios de Eurostat. En ${k.inThe(lo.name)} es un precio de salida mediano de ${k.eur(lo.medPrice)} frente a un sueldo neto de ${k.eur(lo.earnings)} al año.`),
        t(`Prices: ${k.num(st.reduce((a, x) => a + x.n, 0))} homes on RealHunt, ${day}. Pay: Eurostat, annual net earnings of a single person without children on the average wage, ${meta.year}. These are cheap homes chosen by a person, not each country's average home.`,
          `Precios: ${k.num(st.reduce((a, x) => a + x.n, 0))} casas de RealHunt, a ${day}. Sueldos: Eurostat, ganancia neta anual de una persona sola sin hijos con el salario medio, ${meta.year}. Son casas baratas elegidas por una persona, no la vivienda media de cada país.`)];
      const fig = bars(k, t("Years of average net pay that the median home on RealHunt costs", "Años de sueldo neto medio que cuesta la casa mediana de RealHunt"), t(`Median asking price divided by yearly net earnings (Eurostat ${meta.year}), fewest years first. ${day}.`, `Precio de salida mediano dividido entre el sueldo neto anual (Eurostat ${meta.year}), de menos a más años. A ${day}.`),
        st.map((x) => ({ label: k.country(x.name), sub: sample(x.n), value: x.years, text: k.dec(x.years), weak: x.small })), weakKey);
      const head = es ? ["País", "Años de sueldo neto", "Precio de salida mediano", `Sueldo neto anual (${meta.year})`, "Casas"] : ["Country", "Years of net pay", "Median asking price", `Net earnings a year (${meta.year})`, "Homes"];
      const body = `<h2>${esc(t("Years of pay to buy the median home, by country: the table", "Años de sueldo para comprar la casa mediana, por país: la tabla"))}</h2>`
        + table(head.map((x, i) => ({ h: x, cls: i ? "n" : undefined })), st.map((x) => [cLink(x.k, x.name) + (x.small ? ` <small>(${esc(t("small sample", "muestra pequeña"))})</small>` : ""), k.dec(x.years), k.eur(x.medPrice), k.eur(x.earnings), k.num(x.n)]), head.join(", "))
        + `<p>${t(`Earnings source: <a href="${esc(meta.url)}" rel="noopener nofollow">Eurostat, annual net earnings (earn_nt_net)</a>, single person without children earning 100% of the average wage, ${esc(meta.year)}; table updated by Eurostat on ${esc(k.date(String(meta.dataset_updated)))}, read on ${esc(k.date(String(meta.read)))}.`, `Fuente de los sueldos: <a href="${esc(meta.url)}" rel="noopener nofollow">Eurostat, ganancias netas anuales (earn_nt_net)</a>, persona sola sin hijos con el 100 % del salario medio, ${esc(meta.year)}; tabla actualizada por Eurostat el ${esc(k.date(String(meta.dataset_updated)))}, consultada el ${esc(k.date(String(meta.read)))}.`)}</p>`;
      out.push({ slug: "years-of-salary", title: t("Years of average pay to buy a cheap home, by country", "Años de sueldo para comprar una casa barata, por país"), h1: t("How many years of average net pay a cheap home costs, by country (2026)", "Cuántos años de sueldo neto medio cuesta una casa barata, país por país (2026)"),
        desc: t(`The median asking price of the homes on RealHunt divided by Eurostat's average net earnings, in ${st.length} European countries: from ${k.dec(lo.years)} to ${k.dec(hi.years)} years. Chart and CSV.`, `El precio de salida mediano de las casas de RealHunt dividido entre el sueldo neto medio de Eurostat, en ${st.length} países europeos: de ${k.dec(lo.years)} a ${k.dec(hi.years)} años. Gráfico y CSV.`),
        card: t(`${k.dec(lo.years)} years of net pay in ${k.inThe(lo.name)}, ${k.dec(hi.years)} in ${k.inThe(hi.name)}.`, `${k.dec(lo.years)} años de sueldo neto en ${k.inThe(lo.name)}, ${k.dec(hi.years)} en ${k.inThe(hi.name)}.`),
        answer, fig, body, vars: ["years of average net earnings", "median asking price (EUR)", "annual net earnings (EUR, Eurostat)", "homes"],
        limits: [selection, asking,
          t(`Years = median asking price ÷ annual net earnings. It ignores taxes and fees of the purchase, interest and living costs: it is a yardstick to compare countries, not the time needed to save for a home.`, `Años = precio de salida mediano ÷ sueldo neto anual. No tiene en cuenta los impuestos y gastos de la compra, los intereses ni el coste de vida: es una vara para comparar países, no el tiempo que hace falta para ahorrar una casa.`),
          t(`Earnings are national averages for ${meta.year}; homes are where RealHunt has found them, often in cheaper regions than the national average. Countries Eurostat does not publish for that year (Norway, Switzerland, the United Kingdom, the United States, Japan and others) are left out.`, `Los sueldos son medias nacionales de ${meta.year}; las casas están donde RealHunt las ha encontrado, a menudo en regiones más baratas que la media del país. No aparecen los países que Eurostat no publica para ese año (Noruega, Suiza, Reino Unido, Estados Unidos, Japón y otros).`),
          t(`Countries with fewer than ${MIN_STUDY} homes are left out; with fewer than ${MIN_RANK} they are marked as a small sample.`, `Los países con menos de ${MIN_STUDY} casas no aparecen; con menos de ${MIN_RANK} van marcados como muestra pequeña.`), medianNote],
        csv: { head: es ? ["pais", "anos_de_sueldo_neto", "precio_mediano_eur", "sueldo_neto_anual_eur", "ano_del_sueldo", "casas", "muestra_pequena"] : ["country", "years_of_net_earnings", "median_price_eur", "annual_net_earnings_eur", "earnings_year", "homes", "small_sample"], rows: st.map((x) => [k.country(x.name), x.years, x.medPrice, x.earnings, meta.year, x.n, x.small ? yes : "no"]) },
        md: mdTable(head, st.map((x) => [k.country(x.name) + (x.small ? ` (${t("small sample", "muestra pequeña")})` : ""), k.dec(x.years), k.eur(x.medPrice), k.eur(x.earnings), x.n])) });
    }
  }

  // ------------------------------------------------------------------ flood indicator
  {
    const st = floodStats(rows as any);
    const all = (rows as any[]).filter((r) => r.risks?.flood?.level);
    if (st.length >= 3 && all.length >= 50) {
      const mh = all.filter((r) => r.risks.flood.level !== "low").length, high = all.filter((r) => r.risks.flood.level === "high").length, off = all.filter((r) => r.risks.flood.source && r.risks.flood.source !== "rough").length;
      const top = st.filter((x) => x.share > 0).slice(0, 3), zero = st.filter((x) => x.share === 0);
      const answer = [
        t(`${k.num(mh)} of ${k.num(all.length)} homes on RealHunt with a flood indicator (${Math.round((mh / all.length) * 100)}%) are marked medium or high, and ${k.num(high)} are marked high. The share is largest in ${top.map((x) => `${k.inThe(x.name)} (${x.share}% of ${x.n})`).join(", ")}.${zero.length ? ` No home is marked medium or high in ${k.list(zero.map((x) => k.inThe(x.name)))}.` : ""}`,
          `${k.num(mh)} de las ${k.num(all.length)} casas de RealHunt con indicador de inundación (el ${Math.round((mh / all.length) * 100)} %) están marcadas como riesgo medio o alto, y ${k.num(high)} como alto. La proporción es mayor en ${k.list(top.map((x) => `${k.inThe(x.name)} (${x.share} % de ${x.n})`))}.${zero.length ? ` Ninguna casa está marcada como riesgo medio o alto en ${k.list(zero.map((x) => k.inThe(x.name)))}.` : ""}`),
        t(`The indicator is RealHunt's own first check, ${day}: an official flood zone where one is open to query (${k.num(off)} homes, United States), and otherwise a rough reading of height above sea level and distance to the sea and to a large river. It is not an official flood map.`,
          `El indicador es una primera comprobación propia de RealHunt, a ${day}: la zona oficial de inundación donde puede consultarse (${k.num(off)} casas, Estados Unidos) y, en el resto, una lectura aproximada de la altitud y de la distancia al mar y a un río grande. No es un mapa oficial de inundaciones.`)];
      const fig = bars(k, t("Homes with a medium or high flood indicator, by country", "Casas con indicador de inundación medio o alto, por país"), t(`Share of the homes of each country that have the indicator, ${day}. Countries with at least ${MIN_STUDY} such homes.`, `Parte de las casas de cada país que tienen el indicador, a ${day}. Países con al menos ${MIN_STUDY} casas así.`),
        st.map((x) => ({ label: k.country(x.name), sub: sample(x.n), value: x.share, text: `${x.share}%`, weak: x.n < MIN_RANK })), weakKey);
      const head = es ? ["País", "Casas con indicador", "Bajo", "Medio", "Alto", "Medio o alto", "Con zona oficial"] : ["Country", "Homes with the indicator", "Low", "Medium", "High", "Medium or high", "With an official zone"];
      const body = `<h2>${esc(t("Flood indicator by country: the table", "Indicador de inundación por país: la tabla"))}</h2>`
        + table(head.map((x, i) => ({ h: x, cls: i ? "n" : undefined })), st.map((x) => [cLink(x.k, x.name) + (x.n < MIN_RANK ? ` <small>(${esc(t("small sample", "muestra pequeña"))})</small>` : ""), k.num(x.n), k.num(x.low), k.num(x.medium), k.num(x.high), `${x.share}%`, k.num(x.official)]), head.join(", "))
        + `<p>${esc(t("Every home page shows its own indicator with a link to the official flood map of its country, where the exact address can be checked.", "La página de cada casa enseña su indicador con un enlace al mapa oficial de inundaciones de su país, donde se puede comprobar la dirección exacta."))}</p>`;
      out.push({ slug: "flood-indicator", title: t("Cheap homes and flood risk: a first check by country", "Casas baratas y riesgo de inundación, por país"), h1: t("Cheap homes and flood risk: share with a medium or high indicator, by country (2026)", "Casas baratas y riesgo de inundación: parte con indicador medio o alto, por país (2026)"),
        desc: t(`${Math.round((mh / all.length) * 100)}% of ${k.num(all.length)} cheap homes carry a medium or high flood indicator. The share in each country, what the indicator is and what it is not. Chart and CSV.`, `El ${Math.round((mh / all.length) * 100)} % de ${k.num(all.length)} casas baratas tiene un indicador de inundación medio o alto. La proporción en cada país, qué es el indicador y qué no es. Gráfico y CSV.`),
        card: t(`${Math.round((mh / all.length) * 100)}% of ${k.num(all.length)} homes are marked medium or high; ${k.num(high)} are marked high.`, `El ${Math.round((mh / all.length) * 100)} % de ${k.num(all.length)} casas está marcado como medio o alto; ${k.num(high)}, como alto.`),
        answer, fig, body, vars: ["homes with a flood indicator", "low", "medium", "high", "share medium or high (%)"],
        limits: [
          t("The indicator is a first filter, not a flood-risk assessment. Outside the United States it is a rough reading of the terrain: a home marked low can still flood, and a home marked medium may be perfectly safe behind a defence.", "El indicador es un primer filtro, no una evaluación del riesgo de inundación. Fuera de Estados Unidos es una lectura aproximada del terreno: una casa marcada como riesgo bajo puede inundarse, y una marcada como medio puede estar perfectamente protegida por una defensa."),
          t("Countries are not measured with the same ruler: the United States figure uses official flood zones for most homes, the others do not. Compare countries with care.", "Los países no se miden con la misma regla: la cifra de Estados Unidos usa zonas oficiales de inundación en la mayoría de las casas, y los demás no. Compara países con cuidado."),
          t(`${k.num(nHomes - all.length)} homes have no indicator yet and are not counted. Countries with fewer than ${MIN_STUDY} homes with the indicator are left out; with fewer than ${MIN_RANK} they are marked as a small sample.`, `${k.num(nHomes - all.length)} casas aún no tienen indicador y no se cuentan. No aparecen los países con menos de ${MIN_STUDY} casas con indicador; con menos de ${MIN_RANK} van marcados como muestra pequeña.`),
          selection,
          t("Before buying, check the address on the official flood map of the country and ask the seller and the insurer about past floods.", "Antes de comprar, comprueba la dirección en el mapa oficial de inundaciones del país y pregunta al vendedor y a la aseguradora por inundaciones anteriores.")],
        csv: { head: es ? ["pais", "casas_con_indicador", "bajo", "medio", "alto", "medio_o_alto_pct", "con_zona_oficial", "muestra_pequena"] : ["country", "homes_with_indicator", "low", "medium", "high", "medium_or_high_pct", "with_official_zone", "small_sample"], rows: st.map((x) => [k.country(x.name), x.n, x.low, x.medium, x.high, x.share, x.official, x.n < MIN_RANK ? yes : "no"]) },
        md: mdTable(head, st.map((x) => [k.country(x.name), x.n, x.low, x.medium, x.high, `${x.share}%`, x.official])) });
    }
  }

  // ------------------------------------------------------------------ price by distance to the airport
  {
    const bs = airportStats(rows as any), cs = airportByCountry(rows as any);
    const nAll = bs.reduce((a, b) => a + b.n, 0);
    if (nAll >= 50 && bs[0].medPpsqm && bs[1].medPpsqm) {
      const name = (b: { lo: number; hi: number }) => (b.hi === Infinity ? t(`${b.lo} km or more`, `${b.lo} km o más`) : b.lo === 0 ? t(`under ${b.hi} km`, `menos de ${b.hi} km`) : t(`${b.lo} to ${b.hi} km`, `de ${b.lo} a ${b.hi} km`));
      const near = bs[0], mid = bs[1], far = bs[2];
      const drop = Math.round((1 - mid.medPpsqm / near.medPpsqm) * 100);
      const answer = [
        t(`Homes on RealHunt less than 30 km from an airport have a median asking price of ${k.eur(near.medPpsqm)}/m² (${k.num(near.nSqm)} homes); between 30 and 60 km it is ${k.eur(mid.medPpsqm)}/m² (${k.num(mid.nSqm)} homes), ${Math.abs(drop)}% ${drop >= 0 ? "less" : "more"}${far.medPpsqm ? `, and between 60 and 100 km ${k.eur(far.medPpsqm)}/m² (${k.num(far.nSqm)} homes)` : ""}. The median price of a whole home goes from ${k.eur(near.medPrice)} to ${k.eur(mid.medPrice)}${far.n >= MIN_STUDY ? ` and ${k.eur(far.medPrice)}` : ""}.`,
          `Las casas de RealHunt a menos de 30 km de un aeropuerto tienen un precio de salida mediano de ${k.eur(near.medPpsqm)}/m² (${k.num(near.nSqm)} casas); entre 30 y 60 km es de ${k.eur(mid.medPpsqm)}/m² (${k.num(mid.nSqm)} casas), un ${Math.abs(drop)} % ${drop >= 0 ? "menos" : "más"}${far.medPpsqm ? `, y entre 60 y 100 km, de ${k.eur(far.medPpsqm)}/m² (${k.num(far.nSqm)} casas)` : ""}. El precio mediano de la casa entera pasa de ${k.eur(near.medPrice)} a ${k.eur(mid.medPrice)}${far.n >= MIN_STUDY ? ` y ${k.eur(far.medPrice)}` : ""}.`),
        t(`${k.num(nAll)} homes with a known distance, ${day}. Distance in a straight line to the nearest airport with passenger flights. The bands mix countries, so part of the gap is that homes far from an airport are in cheaper countries and regions.`,
          `${k.num(nAll)} casas con distancia conocida, a ${day}. Distancia en línea recta al aeropuerto con vuelos de pasajeros más cercano. Los tramos mezclan países, así que parte de la diferencia se debe a que las casas lejos de un aeropuerto están en países y regiones más baratos.`)];
      const fig = bars(k, t("Median asking price per m², by distance to the nearest airport", "Precio de salida mediano por m², según la distancia al aeropuerto más cercano"), t(`Euros per square metre; homes on RealHunt with a known size and distance, ${day}.`, `Euros por metro cuadrado; casas de RealHunt con superficie y distancia conocidas, a ${day}.`),
        bs.filter((b) => b.medPpsqm > 0).map((b) => ({ label: name(b), sub: sample(b.nSqm), value: b.medPpsqm, text: k.eur(b.medPpsqm), weak: b.nSqm < MIN_RANK })), weakKey);
      const head = es ? ["Distancia al aeropuerto", "Casas", "Precio mediano", "Mediana €/m²", "Casas con superficie", "Nota mediana"] : ["Distance to the airport", "Homes", "Median price", "Median €/m²", "Homes with size", "Median score"];
      const head2 = es ? ["País", "Distancia mediana al aeropuerto", "A menos de 60 km", "Casas"] : ["Country", "Median distance to the airport", "Under 60 km", "Homes"];
      const body = `<h2>${esc(t("Price by distance to the airport: the table", "Precio según la distancia al aeropuerto: la tabla"))}</h2>`
        + table(head.map((x, i) => ({ h: x, cls: i ? "n" : undefined })), bs.map((b) => [esc(name(b)), k.num(b.n), b.n >= MIN_SHOW ? k.eur(b.medPrice) : na, b.medPpsqm ? k.eur(b.medPpsqm) : na, k.num(b.nSqm), b.n >= MIN_SHOW ? String(b.medScore) : na]), head.join(", "))
        + `<h2>${esc(t("How far the homes are from an airport, by country", "A qué distancia de un aeropuerto están las casas, por país"))}</h2>`
        + table(head2.map((x, i) => ({ h: x, cls: i ? "n" : undefined })), cs.map((x) => [cLink(x.k, x.name) + (x.n < MIN_RANK ? ` <small>(${esc(t("small sample", "muestra pequeña"))})</small>` : ""), `${k.num(x.medKm)} km`, `${x.within60}%`, k.num(x.n)]), head2.join(", "));
      out.push({ slug: "price-by-airport-distance", title: t("Home prices by distance to the nearest airport", "Precio de la vivienda según la distancia al aeropuerto"), h1: t("How the price of a cheap home changes with the distance to the airport (2026)", "Cómo cambia el precio de una casa barata con la distancia al aeropuerto (2026)"),
        desc: t(`Median price and price per m² of ${k.num(nAll)} cheap homes by distance to the nearest airport: under 30 km, 30 to 60, 60 to 100 and beyond. Chart, tables and CSV.`, `Precio mediano y precio por m² de ${k.num(nAll)} casas baratas según la distancia al aeropuerto más cercano: menos de 30 km, de 30 a 60, de 60 a 100 y más. Gráfico, tablas y CSV.`),
        card: t(`${k.eur(near.medPpsqm)}/m² under 30 km from an airport, ${k.eur(mid.medPpsqm)}/m² between 30 and 60 km.`, `${k.eur(near.medPpsqm)}/m² a menos de 30 km de un aeropuerto, ${k.eur(mid.medPpsqm)}/m² entre 30 y 60 km.`),
        answer, fig, body, vars: ["distance to the nearest airport (km, straight line)", "median asking price (EUR)", "median asking price per m² (EUR)", "homes"],
        limits: [
          t("This is a description of the homes listed, not proof that distance causes the price: country, region, size and condition change at the same time.", "Es una descripción de las casas publicadas, no una prueba de que la distancia cause el precio: el país, la región, el tamaño y el estado cambian a la vez."),
          t("Distance is measured in a straight line, in kilometres, to the nearest airport with passenger flights; driving time is longer and depends on the roads. Bands include their lower bound.", "La distancia se mide en línea recta, en kilómetros, hasta el aeropuerto con vuelos de pasajeros más cercano; el tiempo en coche es mayor y depende de las carreteras. Cada tramo incluye su límite inferior."),
          t(`Price per m² uses only homes that state their size and is shown from ${MIN_STUDY} homes. Bands or countries with fewer than ${MIN_RANK} homes are marked as a small sample.`, `El precio por m² solo usa las casas que indican su superficie y se muestra a partir de ${MIN_STUDY} casas. Los tramos o países con menos de ${MIN_RANK} casas van marcados como muestra pequeña.`),
          selection, asking, medianNote],
        csv: { head: es ? ["tipo", "nombre", "desde_km", "hasta_km", "casas", "precio_mediano_eur", "mediana_eur_m2", "casas_con_superficie", "nota_mediana", "distancia_mediana_km", "a_menos_de_60_km_pct"] : ["level", "name", "from_km", "to_km", "homes", "median_price_eur", "median_eur_per_sqm", "homes_with_size", "median_score", "median_distance_km", "under_60_km_pct"],
          rows: [...bs.map((b) => [es ? "tramo" : "band", name(b), b.lo, b.hi === Infinity ? "" : b.hi, b.n, b.n >= MIN_SHOW ? b.medPrice : "", b.medPpsqm || "", b.nSqm, b.n >= MIN_SHOW ? b.medScore : "", "", ""]), ...cs.map((x) => [es ? "pais" : "country", k.country(x.name), "", "", x.n, "", "", "", "", x.medKm, x.within60])] },
        md: mdTable(head, bs.map((b) => [name(b), b.n, b.n >= MIN_SHOW ? k.eur(b.medPrice) : na, b.medPpsqm ? k.eur(b.medPpsqm) : na, b.nSqm, b.n >= MIN_SHOW ? b.medScore : na])) + "\n" + mdTable(head2, cs.map((x) => [k.country(x.name), `${x.medKm} km`, `${x.within60}%`, x.n])) });
    }
  }

  // ------------------------------------------------------------------ new builds: price per m² in the five rankings
  {
    const lists: Record<string, Project[]> = Object.fromEntries(TOPS.map(([key]) => [key, readJson(`src/data/top-${key}.json`, []) as Project[]]));
    const st = newBuildStats(lists).filter((x) => x.medPpsqm > 0);
    if (st.length >= 3) {
      const nm = (key: string) => { const x = TOPS.find((y) => y[0] === key)!; return es ? x[2] : x[1]; };
      const total = st.reduce((a, x) => a + x.n, 0), lo = st[0], hi = st[st.length - 1];
      const answer = [
        t(`In RealHunt's new-build rankings the median starting price per square metre is lowest in ${nm(lo.k)} (${k.eur(lo.medPpsqm)}/m², ${lo.nPp} projects) and highest in ${nm(hi.k)} (${k.eur(hi.medPpsqm)}/m², ${hi.nPp} projects). ${st.slice(1, -1).map((x) => `${nm(x.k)}: ${k.eur(x.medPpsqm)}/m²`).join("; ")}.`,
          `En las clasificaciones de obra nueva de RealHunt, el precio de salida mediano por metro cuadrado más bajo está en ${nm(lo.k)} (${k.eur(lo.medPpsqm)}/m², ${lo.nPp} proyectos) y el más alto en ${nm(hi.k)} (${k.eur(hi.medPpsqm)}/m², ${hi.nPp} proyectos). ${st.slice(1, -1).map((x) => `${nm(x.k)}: ${k.eur(x.medPpsqm)}/m²`).join("; ")}.`),
        t(`${k.num(total)} projects in ${st.length} destinations, from the developers' published "from" prices, ${day}. Some are leasehold and some are sold before they are built: a price per m² is not comparable with a finished freehold home without reading each project.`,
          `${k.num(total)} proyectos en ${st.length} destinos, a partir de los precios «desde» publicados por los promotores, a ${day}. Algunos se venden en régimen de arrendamiento a largo plazo y otros antes de construirse: un precio por m² no es comparable con una vivienda terminada en plena propiedad sin leer cada proyecto.`)];
      const fig = bars(k, t("Median starting price per m² of new-build projects, by destination", "Precio de salida mediano por m² de los proyectos de obra nueva, por destino"), t(`Euros per square metre; projects that publish it, ${day}.`, `Euros por metro cuadrado; proyectos que lo publican, a ${day}.`),
        st.map((x) => ({ label: nm(x.k), sub: t(`${x.nPp} projects`, `${x.nPp} proyectos`), value: x.medPpsqm, text: k.eur(x.medPpsqm), weak: x.nPp < MIN_RANK })), t(`Hatched bar: fewer than ${MIN_RANK} projects.`, `Barra rayada: menos de ${MIN_RANK} proyectos.`));
      const head = es ? ["Destino", "Proyectos", "Con precio por m²", "Mediana €/m²", "€/m² más bajo", "€/m² más alto", "Precio «desde» mediano", "El más barato"] : ["Destination", "Projects", "With a price per m²", "Median €/m²", "Lowest €/m²", "Highest €/m²", "Median \"from\" price", "Cheapest"];
      const body = `<h2>${esc(t("New-build prices by destination: the table", "Precios de obra nueva por destino: la tabla"))}</h2>`
        + table(head.map((x, i) => ({ h: x, cls: i ? "n" : undefined })), st.map((x) => [`<a href="/top/${esc(x.k)}">${esc(nm(x.k))}</a>`, k.num(x.n), k.num(x.nPp), k.eur(x.medPpsqm), k.eur(x.minPpsqm), k.eur(x.maxPpsqm), k.eur(x.medPrice), k.eur(x.cheapest)]), head.join(", "))
        + `<p>${t(`Each destination has its ranking with every project: ${st.map((x) => `<a href="/top/${esc(x.k)}">${esc(nm(x.k))}</a>`).join(", ")}. How projects are ranked is explained in <a href="/top/how-we-rank">how we rank</a>.`, `Cada destino tiene su clasificación con todos los proyectos: ${st.map((x) => `<a href="/top/${esc(x.k)}">${esc(nm(x.k))}</a>`).join(", ")}. Cómo se ordenan los proyectos se explica en <a href="/top/how-we-rank">cómo clasificamos</a>.`)}</p>`;
      out.push({ slug: "new-build-prices", title: t("New-build price per m²: Bali, Phuket, Tulum, Batumi, Samui", "Obra nueva: precio por m² en Bali, Phuket, Tulum y Batumi"), h1: t("New-build prices per m² in Bali, Phuket, Koh Samui, Tulum and Batumi (2026)", "Precio por m² de la obra nueva en Bali, Phuket, Koh Samui, Tulum y Batumi (2026)"),
        desc: t(`Median starting price per m² of ${k.num(total)} new-build projects in ${st.length} destinations, from ${k.eur(lo.medPpsqm)} in ${nm(lo.k)} to ${k.eur(hi.medPpsqm)} in ${nm(hi.k)}. Chart, table and CSV.`, `Precio de salida mediano por m² de ${k.num(total)} proyectos de obra nueva en ${st.length} destinos, de ${k.eur(lo.medPpsqm)} en ${nm(lo.k)} a ${k.eur(hi.medPpsqm)} en ${nm(hi.k)}. Gráfico, tabla y CSV.`),
        card: t(`From ${k.eur(lo.medPpsqm)}/m² in ${nm(lo.k)} to ${k.eur(hi.medPpsqm)}/m² in ${nm(hi.k)}.`, `De ${k.eur(lo.medPpsqm)}/m² en ${nm(lo.k)} a ${k.eur(hi.medPpsqm)}/m² en ${nm(hi.k)}.`),
        answer, fig, body, vars: ["median starting price per m² (EUR)", "projects", "median starting price (EUR)"],
        limits: [
          t("Prices are the developers' \"from\" prices for the cheapest unit, converted to euros when the ranking was last updated. The unit you want may cost more.", "Los precios son los precios «desde» del promotor para la unidad más barata, convertidos a euros en la última actualización de la clasificación. La unidad que te interese puede costar más."),
          t("Price per m² is the one stated for each project; projects that do not publish it count in the number of projects but not in the median.", "El precio por m² es el indicado en cada proyecto; los que no lo publican cuentan en el número de proyectos, pero no en la mediana."),
          t("Ownership differs: freehold, leasehold or a structure for foreign buyers, depending on the country. Read each project and the country's rules before comparing.", "La forma de propiedad varía: plena propiedad, arrendamiento a largo plazo o una estructura para compradores extranjeros, según el país. Lee cada proyecto y las normas del país antes de comparar."),
          t("This is one reading on one day. It is not a forecast of prices or of rental income.", "Es una lectura de un solo día. No es una previsión de precios ni de ingresos por alquiler."), medianNote],
        csv: { head: es ? ["destino", "proyectos", "con_precio_m2", "mediana_eur_m2", "min_eur_m2", "max_eur_m2", "precio_desde_mediano_eur", "mas_barato_eur", "pagina"] : ["destination", "projects", "with_price_per_sqm", "median_eur_per_sqm", "lowest_eur_per_sqm", "highest_eur_per_sqm", "median_from_price_eur", "cheapest_eur", "page"], rows: st.map((x) => [nm(x.k), x.n, x.nPp, x.medPpsqm, x.minPpsqm, x.maxPpsqm, x.medPrice, x.cheapest, `https://realhunt.co/top/${x.k}`]) },
        md: mdTable(head, st.map((x) => [nm(x.k), x.n, x.nPp, k.eur(x.medPpsqm), k.eur(x.minPpsqm), k.eur(x.maxPpsqm), k.eur(x.medPrice), k.eur(x.cheapest)])) });
    }
  }
  return out;
}
