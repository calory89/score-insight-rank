// Three more studies of the data hub (20-nov-2026, ideas 51, 53 and 54 of the list of 100), in the shape of the
// others (seo/assets.ts, seo/assetsStudies.ts): answer, chart, tables, method and limits, CSV, Markdown, citation.
//   /research/cheapest-per-sqm-europe     the homes with the lowest asking price per m² in Europe, and the medians
//   /research/sea-homes-under-100000      homes by the sea at or under €100,000: which countries and regions have them
//   /research/new-homes-this-month        the homes added this month, by country, with the months before
// Every figure is computed from public/data/rh-static.json at build time, with its sample size.
import { regionOf } from "../src/community/regions";
import { listedAt } from "../src/community/n9/status";
import { bySea } from "./listings/facets";
import { MIN_RANK, MIN_SHOW, cKey, median, type Home } from "./assetsStats";
import { bars, esc, mdTable, table } from "./assetsKit";
import type { Dataset } from "./assets";
import type { StudyKit } from "./assetsStudies";

/** Countries counted as Europe in these studies (keys of cKey). Cyprus is counted, as in the EU. */
export const EUROPE = new Set(["spain", "italy", "france", "portugal", "greece", "germany", "netherlands", "belgium", "denmark", "sweden", "norway", "finland", "poland", "bulgaria", "croatia", "cyprus", "switzerland", "austria", "ireland", "united-kingdom", "montenegro", "czech-republic", "hungary", "romania", "slovenia", "slovakia", "estonia", "latvia", "lithuania", "malta", "albania", "serbia", "north-macedonia", "bosnia-and-herzegovina", "luxembourg", "iceland"]);
const SEA_CAP = 100000;

const ppsqm = (h: Home) => (Number(h.sqm) > 0 ? Math.round(h.price_eur / Number(h.sqm)) : 0);

export function cheapestPerSqm(rows: Home[]) {
  const eu = rows.filter((r) => EUROPE.has(cKey(r.country)) && r.price_eur > 0 && Number(r.sqm) >= 20);
  const homes = eu.slice().sort((a, b) => ppsqm(a) - ppsqm(b) || a.price_eur - b.price_eur || a.slug.localeCompare(b.slug));
  const by = new Map<string, Home[]>();
  for (const r of eu) (by.get(cKey(r.country)) || by.set(cKey(r.country), []).get(cKey(r.country))!).push(r);
  const countries = [...by.entries()].filter(([, hs]) => hs.length >= MIN_SHOW).map(([k, hs]) => ({ k, name: String(hs[0].country), n: hs.length, med: median(hs.map(ppsqm)), min: Math.min(...hs.map(ppsqm)), cheapest: hs.slice().sort((a, b) => ppsqm(a) - ppsqm(b))[0] }))
    .sort((a, b) => a.med - b.med || b.n - a.n);
  return { homes, countries, n: eu.length };
}

export function seaHomes(rows: Home[]) {
  const sea = rows.filter((r) => r.price_eur > 0 && r.price_eur <= SEA_CAP && bySea(r as any));
  const by = new Map<string, Home[]>();
  for (const r of sea) { const k = cKey(r.country); if (!k || k === "scandinavia") continue; (by.get(k) || by.set(k, []).get(k)!).push(r); }
  const countries = [...by.entries()].map(([k, hs]) => {
    const sized = hs.filter((h) => Number(h.sqm) > 0);
    const regions = new Map<string, number>(); for (const h of hs) { const rg = regionOf(h as any); if (rg) regions.set(rg, (regions.get(rg) || 0) + 1); }
    return { k, name: String(hs[0].country), n: hs.length, min: Math.min(...hs.map((h) => h.price_eur)), med: median(hs.map((h) => h.price_eur)), medSqm: sized.length >= MIN_SHOW ? median(sized.map((h) => Number(h.sqm))) : 0,
      best: hs.slice().sort((a, b) => (Number(b.nota) || 0) - (Number(a.nota) || 0))[0], regions: [...regions].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])) };
  }).sort((a, b) => b.n - a.n || a.med - b.med);
  return { sea, countries };
}

const day = (h: Home) => String(listedAt(h as any) || "").slice(0, 10);
export function monthStats(rows: Home[], month: string) {
  const hs = rows.filter((r) => day(r).startsWith(month));
  const by = new Map<string, Home[]>();
  for (const r of hs) { const k = cKey(r.country); if (!k || k === "scandinavia") continue; (by.get(k) || by.set(k, []).get(k)!).push(r); }
  const countries = [...by.entries()].map(([k, l]) => ({ k, name: String(l[0].country), n: l.length, min: Math.min(...l.map((h) => h.price_eur)), med: median(l.map((h) => h.price_eur)), best: l.slice().sort((a, b) => (Number(b.nota) || 0) - (Number(a.nota) || 0))[0] }))
    .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
  return { homes: hs, countries };
}

export function studiesSet2(h: StudyKit): Dataset[] {
  const { k, c, rows, sample, cLink, na, weakKey, selection, asking, medianNote } = h, { t, es } = k;
  const dayTxt = k.date(c.today);
  const title = (x: Home) => (es && x.title_es ? x.title_es : x.title) || "";
  const homeLink = (x: Home) => `<a href="/deal/${esc(x.slug)}">${esc(title(x))}</a>`;
  const place = (x: Home) => String(x.location_name || k.country(String(x.country || "")));
  const out: Dataset[] = [];

  // ------------------------------------------------------------------ 51. cheapest per m² in Europe
  {
    const s = cheapestPerSqm(rows);
    const top = s.homes.slice(0, 25);
    if (top.length >= 10 && s.countries.length >= 3) {
      const a = top[0], lo = s.countries.slice(0, 3), hi = s.countries[s.countries.length - 1];
      const answer = [
        t(`The home with the lowest asking price per square metre in Europe on RealHunt is ${title(a)} in ${place(a)}: ${k.eur(a.price_eur)} for ${k.num(Number(a.sqm))} m², ${k.eur(ppsqm(a))}/m². By country, the lowest median price per m² is in ${lo.map((x) => `${k.inThe(x.name)} (${k.eur(x.med)}/m²)`).join(", ")}, and the highest in ${k.inThe(hi.name)} (${k.eur(hi.med)}/m²).`,
          `La casa con el precio de salida por metro cuadrado más bajo de Europa en RealHunt es ${title(a)}, en ${place(a)}: ${k.eur(a.price_eur)} por ${k.num(Number(a.sqm))} m², ${k.eur(ppsqm(a))}/m². Por países, el precio mediano por m² más bajo está en ${k.list(lo.map((x) => `${k.inThe(x.name)} (${k.eur(x.med)}/m²)`))}, y el más alto en ${k.inThe(hi.name)} (${k.eur(hi.med)}/m²).`),
        t(`From ${k.num(s.n)} homes in ${s.countries.length} European countries whose listing gives a size of at least 20 m², each checked by a person, ${dayTxt}.`, `A partir de ${k.num(s.n)} casas de ${s.countries.length} países europeos cuyo anuncio indica una superficie de al menos 20 m², revisadas una a una por una persona, a ${dayTxt}.`)];
      const fig = bars(k, t("Median asking price per m² in Europe, by country", "Precio de salida mediano por m² en Europa, por país"), t(`Euros per square metre, cheapest first. Homes on RealHunt with a known size, ${dayTxt}.`, `Euros por metro cuadrado, de menor a mayor. Casas de RealHunt con superficie conocida, a ${dayTxt}.`),
        s.countries.map((x) => ({ label: k.country(x.name), sub: sample(x.n), value: x.med, text: k.eur(x.med), weak: x.n < MIN_RANK })), weakKey);
      const head = es ? ["Puesto", "Casa", "Lugar", "Precio", "Superficie", "€/m²", "Nota"] : ["Rank", "Home", "Place", "Price", "Size", "€/m²", "Score"];
      const head2 = es ? ["País", "Casas con superficie", "Mediana €/m²", "La más barata por m²"] : ["Country", "Homes with size", "Median €/m²", "Cheapest per m²"];
      const body = `<h2>${esc(t("The 25 homes with the lowest price per m² in Europe", "Las 25 casas con el precio por m² más bajo de Europa"))}</h2>`
        + table(head.map((x, i) => ({ h: x, cls: i > 2 ? "n" : i === 1 ? "w" : undefined })), top.map((x, i) => [String(i + 1), homeLink(x), esc(place(x)), k.eur(x.price_eur), `${k.num(Number(x.sqm))} m²`, k.eur(ppsqm(x)), esc(x.nota ?? na)]), head.join(", "), true)
        + `<h2>${esc(t("By country", "Por país"))}</h2>`
        + table(head2.map((x, i) => ({ h: x, cls: i ? "n" : undefined })), s.countries.map((x) => [cLink(x.k, x.name), k.num(x.n), k.eur(x.med), `${k.eur(x.min)} <small>(${homeLink(x.cheapest)})</small>`]), head2.join(", "));
      out.push({ slug: "cheapest-per-sqm-europe", title: t("The cheapest homes per square metre in Europe", "Las casas más baratas por metro cuadrado de Europa"), h1: t("The cheapest homes per square metre in Europe (2026)", "Las casas más baratas por metro cuadrado de Europa (2026)"),
        desc: t(`The 25 homes with the lowest asking price per m² in Europe on RealHunt, and the median per country, from ${k.num(s.n)} real listings checked by a person. Chart, tables and CSV.`, `Las 25 casas con el precio de salida por m² más bajo de Europa en RealHunt, y la mediana por país, a partir de ${k.num(s.n)} anuncios reales revisados por una persona. Gráfico, tablas y CSV.`),
        card: t(`Lowest in Europe: ${k.eur(ppsqm(a))}/m² in ${place(a)}; lowest median: ${k.inThe(lo[0].name)}, ${k.eur(lo[0].med)}/m².`, `La más baja de Europa: ${k.eur(ppsqm(a))}/m² en ${place(a)}; mediana más baja: ${k.inThe(lo[0].name)}, ${k.eur(lo[0].med)}/m².`),
        answer, fig, body, vars: ["asking price per m² (EUR)", "asking price (EUR)", "size (m²)", "score"],
        limits: [selection, asking, t("Price per m² is the asking price divided by the size the listing gives. Homes under 20 m² and homes without a size are left out. Sizes are those of the listing and can be measured in different ways from one country to another.", "El precio por m² es el precio de salida dividido por la superficie que da el anuncio. Se dejan fuera las casas de menos de 20 m² y las que no indican superficie. Las superficies son las del anuncio y pueden medirse de forma distinta según el país."),
          t(`Europe here means the countries of Europe, Cyprus included. Countries with fewer than ${MIN_SHOW} homes with a size are left out of the country table.`, `Europa son aquí los países de Europa, Chipre incluido. Los países con menos de ${MIN_SHOW} casas con superficie no aparecen en la tabla por país.`), medianNote],
        csv: { head: es ? ["puesto", "url", "titulo", "pais", "lugar", "precio_eur", "superficie_m2", "eur_m2", "nota"] : ["rank", "url", "title", "country", "place", "price_eur", "size_sqm", "eur_per_sqm", "score"],
          rows: s.homes.map((x, i) => [i + 1, `https://realhunt.co/deal/${x.slug}`, title(x), k.country(String(x.country || "")), place(x), x.price_eur, Number(x.sqm), ppsqm(x), x.nota ?? ""]) },
        md: mdTable(head, top.map((x, i) => [i + 1, `[${title(x)}](${k.url("/deal/" + x.slug)})`, place(x), k.eur(x.price_eur), `${x.sqm} m²`, k.eur(ppsqm(x)), x.nota ?? na])) + "\n" + mdTable(head2, s.countries.map((x) => [k.country(x.name), x.n, k.eur(x.med), k.eur(x.min)])) });
    }
  }

  // ------------------------------------------------------------------ 53. by the sea, at or under €100,000
  {
    const s = seaHomes(rows);
    const shown = s.countries.filter((x) => x.n >= MIN_SHOW);
    if (s.sea.length >= 10 && shown.length >= 3) {
      const top = shown.slice(0, 3), cheapest = s.sea.slice().sort((a, b) => a.price_eur - b.price_eur)[0];
      const answer = [
        t(`RealHunt lists ${k.num(s.sea.length)} homes by the sea at or under €100,000, in ${s.countries.length} countries. Most are in ${top.map((x) => `${k.inThe(x.name)} (${x.n})`).join(", ")}. The cheapest is ${title(cheapest)} in ${place(cheapest)}, at ${k.eur(cheapest.price_eur)}.`,
          `RealHunt publica ${k.num(s.sea.length)} casas junto al mar de 100.000 € o menos, en ${s.countries.length} países. La mayoría están en ${k.list(top.map((x) => `${k.inThe(x.name)} (${x.n})`))}. La más barata es ${title(cheapest)}, en ${place(cheapest)}, por ${k.eur(cheapest.price_eur)}.`),
        t(`Homes checked by a person, at their asking price on ${dayTxt}. Countries with fewer than ${MIN_SHOW} such homes are counted but not charted.`, `Casas revisadas por una persona, a su precio de salida a ${dayTxt}. Los países con menos de ${MIN_SHOW} casas así se cuentan, pero no salen en el gráfico.`)];
      const fig = bars(k, t("Homes by the sea at or under €100,000, by country", "Casas junto al mar de 100.000 € o menos, por país"), t(`Number of homes on RealHunt, ${dayTxt}. In brackets, the median price.`, `Número de casas en RealHunt, a ${dayTxt}. Entre paréntesis, el precio mediano.`),
        shown.map((x) => ({ label: k.country(x.name), sub: t(`median ${k.eur(x.med)}`, `mediana ${k.eur(x.med)}`), value: x.n, text: String(x.n), weak: x.n < 5 })), t("Hatched bar: fewer than 5 homes.", "Barra rayada: menos de 5 casas."));
      const head = es ? ["País", "Casas", "Desde", "Precio mediano", "Superficie mediana", "Dónde están", "Casa con mejor nota"] : ["Country", "Homes", "From", "Median price", "Median size", "Where they are", "Best-scored home"];
      const body = `<h2>${esc(t("Homes by the sea at or under €100,000: where they are", "Casas junto al mar de 100.000 € o menos: dónde están"))}</h2>`
        + table(head.map((x, i) => ({ h: x, cls: i && i < 5 ? "n" : i >= 5 ? "w" : undefined })), s.countries.map((x) => [cLink(x.k, x.name), k.num(x.n), k.eur(x.min), k.eur(x.med), x.medSqm ? `${k.num(x.medSqm)} m²` : na, esc(x.regions.slice(0, 4).map(([r, n]) => `${r} (${n})`).join(", ") || na), `${homeLink(x.best)}<br><small>${esc(k.eur(x.best.price_eur))} · ${esc(t("score", "nota"))} ${esc(x.best.nota ?? na)}</small>`]), head.join(", "), true)
        + `<p>${t(`Every home by the sea, at any price, is in the lists by country, for example <a href="/cheap-houses">cheap houses by what you are looking for</a>.`, `Todas las casas junto al mar, a cualquier precio, están en las listas por país, por ejemplo en <a href="/cheap-houses">casas baratas según lo que buscas</a>.`)}</p>`;
      out.push({ slug: "sea-homes-under-100000", title: t("Homes by the sea under €100,000: where they are", "Casas junto al mar por menos de 100.000 €: dónde están"), h1: t("Homes by the sea under €100,000: where they are, country by country (2026)", "Casas junto al mar por menos de 100.000 €: dónde están, país por país (2026)"),
        desc: t(`${k.num(s.sea.length)} real homes by the sea at or under €100,000, checked by a person: how many each country has, the cheapest, the median price and where they are. Chart, table and CSV.`, `${k.num(s.sea.length)} casas reales junto al mar de 100.000 € o menos, revisadas por una persona: cuántas tiene cada país, la más barata, el precio mediano y dónde están. Gráfico, tabla y CSV.`),
        card: t(`${k.num(s.sea.length)} homes by the sea at or under €100,000; most in ${k.inThe(top[0].name)} (${top[0].n}).`, `${k.num(s.sea.length)} casas junto al mar de 100.000 € o menos; la mayoría en ${k.inThe(top[0].name)} (${top[0].n}).`),
        answer, fig, body, vars: ["homes by the sea at or under EUR 100,000", "cheapest asking price (EUR)", "median asking price (EUR)", "median size (m²)"],
        limits: [selection, asking, t("By the sea: within 5 km of the coast when the distance is known, otherwise homes filed by a person under beach and coast.", "Junto al mar: a 5 km o menos de la costa cuando se conoce la distancia; si no, casas que una persona clasificó como playa y costa."),
          t("The count describes what RealHunt lists today. A country that is missing may have such homes that have not been added yet.", "El recuento describe lo que RealHunt publica hoy. Un país que no aparece puede tener casas así que aún no se han añadido."), medianNote],
        csv: { head: es ? ["url", "titulo", "pais", "region", "lugar", "precio_eur", "superficie_m2", "nota"] : ["url", "title", "country", "region", "place", "price_eur", "size_sqm", "score"],
          rows: s.sea.slice().sort((a, b) => cKey(a.country).localeCompare(cKey(b.country)) || a.price_eur - b.price_eur).map((x) => [`https://realhunt.co/deal/${x.slug}`, title(x), k.country(String(x.country || "")), regionOf(x as any) || "", place(x), x.price_eur, x.sqm ?? "", x.nota ?? ""]) },
        md: mdTable(head.slice(0, 6), s.countries.map((x) => [k.country(x.name), x.n, k.eur(x.min), k.eur(x.med), x.medSqm ? `${x.medSqm} m²` : na, x.regions.slice(0, 4).map(([r, n]) => `${r} (${n})`).join(", ") || na])) });
    }
  }

  // ------------------------------------------------------------------ 54. new homes this month
  {
    const month = c.today.slice(0, 7);
    const m = monthStats(rows, month);
    const months = [...new Set(rows.map(day).filter((d) => /^\d{4}-\d{2}/.test(d)).map((d) => d.slice(0, 7)))].sort().reverse();
    if (m.homes.length >= MIN_SHOW && m.countries.length >= 2) {
      const mName = (x: string) => { const s = k.date(`${x}-01`); return es ? s.replace(/^1 de /, "") : s.replace(/^1 /, ""); };
      const top = m.countries.slice(0, 3), cheapest = m.homes.slice().sort((a, b) => a.price_eur - b.price_eur)[0], best = m.homes.slice().sort((a, b) => (Number(b.nota) || 0) - (Number(a.nota) || 0))[0];
      const answer = [
        t(`${k.num(m.homes.length)} homes were added to RealHunt in ${mName(month)} up to ${dayTxt}, in ${m.countries.length} countries. Most are in ${top.map((x) => `${k.inThe(x.name)} (${x.n})`).join(", ")}. The cheapest is ${title(cheapest)} in ${place(cheapest)} (${k.eur(cheapest.price_eur)}) and the best scored is ${title(best)} in ${place(best)} (score ${best.nota}).`,
          `En ${mName(month)}, hasta el ${dayTxt}, se añadieron ${k.num(m.homes.length)} casas a RealHunt, en ${m.countries.length} países. La mayoría están en ${k.list(top.map((x) => `${k.inThe(x.name)} (${x.n})`))}. La más barata es ${title(cheapest)}, en ${place(cheapest)} (${k.eur(cheapest.price_eur)}), y la de mejor nota es ${title(best)}, en ${place(best)} (nota ${best.nota}).`),
        t("Counted on the day each home went up on RealHunt. Homes that have already left the site are not counted. The page is rebuilt with every update.", "Contadas por el día en que cada casa entró en RealHunt. No se cuentan las casas que ya salieron de la web. La página se regenera con cada actualización.")];
      const fig = bars(k, t(`Homes added in ${mName(month)}, by country`, `Casas añadidas en ${mName(month)}, por país`), t(`Number of homes, up to ${dayTxt}. In brackets, the median price.`, `Número de casas, hasta el ${dayTxt}. Entre paréntesis, el precio mediano.`),
        m.countries.map((x) => ({ label: k.country(x.name), sub: t(`median ${k.eur(x.med)}`, `mediana ${k.eur(x.med)}`), value: x.n, text: String(x.n) })));
      const head = es ? ["País", "Casas añadidas", "Desde", "Precio mediano", "Casa con mejor nota"] : ["Country", "Homes added", "From", "Median price", "Best-scored home"];
      const head2 = es ? ["Mes", "Casas añadidas", "Países", "Precio mediano"] : ["Month", "Homes added", "Countries", "Median price"];
      const hist = months.map((x) => { const s = monthStats(rows, x); return [x, s.homes.length, s.countries.length, median(s.homes.map((h) => h.price_eur))] as [string, number, number, number]; });
      const body = `<h2>${esc(t(`Homes added in ${mName(month)}, by country`, `Casas añadidas en ${mName(month)}, por país`))}</h2>`
        + table(head.map((x, i) => ({ h: x, cls: i && i < 4 ? "n" : i === 4 ? "w" : undefined })), m.countries.map((x) => [cLink(x.k, x.name), k.num(x.n), k.eur(x.min), k.eur(x.med), `${homeLink(x.best)}<br><small>${esc(k.eur(x.best.price_eur))} · ${esc(t("score", "nota"))} ${esc(x.best.nota ?? na)}</small>`]), head.join(", "), true)
        + `<h2>${esc(t("The months before", "Los meses anteriores"))}</h2>` + table(head2.map((x, i) => ({ h: x, cls: i ? "n" : undefined })), hist.map(([x, n, cc, med]) => [esc(mName(x)), k.num(n), String(cc), med ? k.eur(med) : na]), head2.join(", "))
        + `<p>${t(`The newest homes one by one are in <a href="/new">new homes</a>; every day with its homes is in <a href="/research/data-changelog">what changed in the data</a>, and the homes that left the site in <a href="/research/removed-homes">homes taken off the site</a>.`, `Las casas más nuevas, una a una, están en <a href="/new">casas nuevas</a>; cada día con sus casas, en <a href="/research/data-changelog">novedades en los datos</a>, y las casas que salieron de la web, en <a href="/research/removed-homes">casas retiradas de la web</a>.`)}</p>`;
      out.push({ slug: "new-homes-this-month", title: t("New homes on RealHunt this month, by country", "Casas nuevas en RealHunt este mes, por país"), h1: t(`New homes on RealHunt in ${mName(month)}, by country`, `Casas nuevas en RealHunt en ${mName(month)}, por país`),
        desc: t(`${k.num(m.homes.length)} homes added to RealHunt in ${mName(month)}, in ${m.countries.length} countries: how many per country, the cheapest, the median price and the best scored. With the months before. Chart, tables and CSV.`, `${k.num(m.homes.length)} casas añadidas a RealHunt en ${mName(month)}, en ${m.countries.length} países: cuántas por país, la más barata, el precio mediano y la de mejor nota. Con los meses anteriores. Gráfico, tablas y CSV.`),
        card: t(`${k.num(m.homes.length)} homes added in ${mName(month)}; most in ${k.inThe(top[0].name)} (${top[0].n}).`, `${k.num(m.homes.length)} casas añadidas en ${mName(month)}; la mayoría en ${k.inThe(top[0].name)} (${top[0].n}).`),
        answer, fig, body, vars: ["homes added in the month", "cheapest asking price (EUR)", "median asking price (EUR)"],
        limits: [selection, asking, t("A home counts in the month it went up on RealHunt. A home that has since left the site is not counted, so the months before can only go down when homes leave.", "Una casa cuenta en el mes en que entró en RealHunt. Una casa que ya salió de la web no cuenta, así que los meses anteriores solo pueden bajar cuando salen casas."), medianNote],
        csv: { head: es ? ["mes", "pais", "casas_anadidas", "mas_barata_eur", "precio_mediano_eur", "mejor_casa_url", "mejor_casa_nota"] : ["month", "country", "homes_added", "cheapest_eur", "median_price_eur", "best_home_url", "best_home_score"],
          rows: months.flatMap((x) => monthStats(rows, x).countries.map((y) => [x, k.country(y.name), y.n, y.min, y.med, `https://realhunt.co/deal/${y.best.slug}`, y.best.nota ?? ""])) },
        md: mdTable(head.slice(0, 4), m.countries.map((x) => [k.country(x.name), x.n, k.eur(x.min), k.eur(x.med)])) + "\n" + mdTable(head2, hist.map(([x, n, cc, med]) => [mName(x), n, cc, med ? k.eur(med) : na])) });
    }
  }
  return out;
}
