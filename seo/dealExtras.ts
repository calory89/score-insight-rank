// More blocks for the prerendered home pages (26-nov-2026, list of 1,000, batch 1). Pure functions of the snapshot
// row and the other homes, in English and Spanish written by hand (the Spanish home pages do not go through
// seo/es-templates.json), so the two pages say the same thing and never mix languages. Used by seo/prerender.ts;
// the clean-text version (seo/dealMd.ts) reads the finished HTML, so everything here is in the .md too.
//   featuresHtml / nearbyHtml   ideas 2 and 26: features and what is nearby (with the airport's IATA code) on both pages
//   risksHtml                   idea 35: noise and flood, with the official flood map, as the app shows them
//   priceHistoryHtml            idea 10: date listed, any price drop and the price today
//   scoreRank                   idea 8: "in the top 5% of 726 homes" instead of a bare "94 / 98"
//   calcLink                    idea 12: the country's calculator with this price already filled in
//   sameTown / bySimilarRule     ideas 40 and 15: other homes in the same town, and similar homes with the rule said
//   siblings                    idea 32: previous and next home of the region by score, as plain links
//   correctionHtml / sourceHtml ideas 31 and 28
//   placeOnce                   idea 18: a description that names the same place twice says it once
import { AMEN } from "../src/community/dims";
import { dayLabel, listedAt, isGone } from "../src/community/n9/status";
import { floodLevel, isOfficial, noiseFacts, noiseLevel, risksOf, type Level } from "../src/community/risksLogic";
import { locationParts } from "../src/community/regions";
import { perSqm } from "../src/community/sqmLogic";

type Row = Record<string, any>;
type Lang = "en" | "es";
const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const eurEn = (n: number) => "€" + Math.round(n).toLocaleString("en");
const eurEs = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " €";
const eur = (n: number, lang: Lang) => (lang === "es" ? eurEs(n) : eurEn(n));
const isoDay = (iso: string) => { const t = Date.parse(iso); return Number.isFinite(t) ? new Date(t).toISOString().slice(0, 10) : ""; };

// ---------------------------------------------------------------------------------------------------- features
const AMEN_ES: Record<string, string> = { garden: "Jardín", terrace: "Terraza", pool: "Piscina", sauna: "Sauna", fireplace: "Chimenea", views: "Vistas", land: "Terreno", garage: "Garaje", outbuildings: "Anexos", cellar: "Bodega o desván", water: "Junto al agua" };
/** The features the listing gives, as labels in the language of the page. */
export function amenLabels(r: Row, lang: Lang): string[] {
  const have = new Set<string>(Array.isArray(r.amen) ? r.amen : []);
  return AMEN.filter(([k]) => have.has(k)).map(([k, en]) => (lang === "es" ? AMEN_ES[k] || "" : en)).filter(Boolean);
}
export function featuresHtml(r: Row, lang: Lang): string {
  const l = amenLabels(r, lang);
  if (!l.length) return "";
  return lang === "es" ? `<h2>Características</h2><p>${esc(l.join(", "))}</p>` : `<h2>Features</h2><p>${esc(l.join(", "))}</p>`;
}

// ---------------------------------------------------------------------------------------------------- nearby
const NEAR: [string, string, string][] = [["sea", "Sea", "Mar"], ["lake", "Lake", "Lago"], ["shop", "Shop", "Tienda"], ["train", "Train", "Tren"], ["airport", "Airport", "Aeropuerto"], ["hospital", "Hospital", "Hospital"]];
const kmText = (km: number, lang: Lang) => (km < 10 ? (Math.round(km * 10) / 10).toString().replace(".", lang === "es" ? "," : ".") : String(Math.round(km))) + " km";
/** "F.G.L. Airport Granada-Jaén Airport (GRX)": the code is added when the data has it and the name does not say it. */
export function airportName(a: Row | null | undefined): string {
  if (!a?.name) return "";
  const code = /^[A-Z]{3}$/.test(String(a.code || "")) ? String(a.code) : "";
  return code && !String(a.name).includes(code) ? `${a.name} (${code})` : String(a.name);
}
export function nearbyHtml(r: Row, lang: Lang): string {
  const near = r.nearby || {};
  const items = NEAR.filter(([k]) => near[k]?.km != null && Number.isFinite(Number(near[k].km))).map(([k, en, es]) => {
    const name = k === "airport" ? airportName(near[k]) : String(near[k].name || "");
    return `<li>${esc(lang === "es" ? es : en)}: ${name ? esc(name) + " · " : ""}${esc(kmText(Number(near[k].km), lang))}</li>`;
  });
  if (!items.length) return "";
  return lang === "es"
    ? `<h2>Qué hay cerca</h2><ul>${items.join("")}</ul><p>Distancias en línea recta desde el punto del mapa.</p>`
    : `<h2>What is nearby</h2><ul>${items.join("")}</ul><p>Distances in a straight line from the map pin.</p>`;
}
/** LocationFeatureSpecification for the structured data of both pages (idea 2). */
export function amenLd(r: Row, lang: Lang): { "@type": string; name: string; value: boolean }[] {
  return amenLabels(r, lang).map((name) => ({ "@type": "LocationFeatureSpecification", name, value: true }));
}

// ---------------------------------------------------------------------------------------------------- noise and flood
const LV: Record<Lang, Record<Level, string>> = { en: { high: "high", medium: "moderate", low: "low" }, es: { high: "alto", medium: "moderado", low: "bajo" } };
const NOISE_LABEL: Record<string, [string, string]> = { motorway: ["motorway or main road", "autovía o carretera principal"], rail: ["railway", "vía de tren"], airport: ["airport runway", "pista de aeropuerto"] };
function floodSentence(f: Row, lang: Lang): string {
  const l = floodLevel(f); const es = lang === "es";
  if (isOfficial(f)) {
    const zone = f.zone ? String(f.zone).split(" (")[0] : "";
    const what = l === "high" ? (es ? "zona de riesgo alto de inundación" : "high-risk flood zone") : l === "medium" ? (es ? "riesgo moderado de inundación" : "moderate flood risk") : l === "low" ? (es ? "riesgo mínimo de inundación" : "minimal flood risk") : (es ? "riesgo de inundación sin cartografiar aquí" : "flood risk not mapped here");
    return es ? `Inundación: ${what}${zone ? ` (zona FEMA ${esc(zone)})` : ""}, según el mapa oficial.` : `Flood: ${what}${zone ? ` (FEMA zone ${esc(zone)})` : ""}, from the official map.`;
  }
  const facts: string[] = [];
  if (f.elev_m != null) facts.push(es ? `terreno a ${Math.round(f.elev_m)} m de altura` : `ground ${Math.round(f.elev_m)} m above sea level`);
  if (f.coast_km != null && f.coast_km <= 50) facts.push(es ? `mar a ${kmText(f.coast_km, lang)}` : `sea ${kmText(f.coast_km, lang)} away`);
  if (f.river_km != null && f.river_km <= 10) facts.push(es ? `río grande a ${kmText(f.river_km, lang)}` : `big river ${kmText(f.river_km, lang)} away`);
  const what = l === "medium" ? (es ? "zona baja cerca del agua: mira el mapa oficial" : "low-lying, near water: check the official map") : l === "low" ? (es ? "no es una zona baja cerca del mar o de un río grande" : "not low-lying near the sea or a big river") : (es ? "sin comprobar" : "not checked");
  return (es ? `Inundación: ${what}` : `Flood: ${what}`) + (facts.length ? ` (${facts.join(", ")})` : "") + (es ? ". Indicador aproximado, no es un mapa oficial." : ". A rough indicator, not an official map.");
}
export function risksHtml(r: Row, lang: Lang): string {
  const rk = risksOf(r);
  if (!rk || (!rk.noise && !rk.flood)) return "";
  const es = lang === "es";
  const li: string[] = [];
  if (rk.noise) {
    const l = noiseLevel(rk.noise);
    const facts = noiseFacts(rk.noise).filter((x) => !x.far).map((x) => `${NOISE_LABEL[x.k][es ? 1 : 0]} ${es ? "a" : "at"} ${x.value.replace(".", es ? "," : ".")}`);
    li.push(es
      ? `<li>Ruido: ${l ? LV.es[l] : "sin comprobar del todo"}${facts.length ? ` (${esc(facts.join(", "))})` : rk.noise.roads_checked ? " (ninguna autovía, vía de tren ni pista a menos de 2 km)" : ""}. Fuente: OpenStreetMap y OurAirports, en línea recta.</li>`
      : `<li>Noise: ${l ? LV.en[l] : "not fully checked"}${facts.length ? ` (${esc(facts.join(", "))})` : rk.noise.roads_checked ? " (no motorway, railway or runway within 2 km)" : ""}. Source: OpenStreetMap and OurAirports, in a straight line.</li>`);
  }
  if (rk.flood) {
    const f = rk.flood as Row;
    const map = /^https:\/\//.test(String(f.map || "")) ? ` <a href="${esc(f.map)}" rel="noopener">${esc(es ? "Mapa oficial de inundaciones" : "Official flood map")}${f.map_name ? `: ${esc(f.map_name)}` : ""}</a>` : "";
    li.push(`<li>${floodSentence(f, lang)}${map}</li>`);
  }
  return es
    ? `<h2>Ruido e inundación</h2><ul>${li.join("")}</ul><p>Información general de mapas públicos. No es una peritación ni un consejo: mira los mapas oficiales y pregunta a la agencia antes de comprar.</p>`
    : `<h2>Noise and flood</h2><ul>${li.join("")}</ul><p>General information from public maps. Not a survey or advice: check the official maps and ask the agent before you buy.</p>`;
}
/** The official links of the risks block (flood map), the same on both pages (idea 33). */
export const officialLinks = (html: string): string[] => [...html.matchAll(/<a href="(https:\/\/[^"]+)" rel="noopener">/g)].map((m) => m[1]).sort();

// ---------------------------------------------------------------------------------------------------- price history
export function priceHistoryHtml(r: Row, lang: Lang): string {
  const at = listedAt(r);
  if (!at || !(r.price_eur > 0)) return "";
  const es = lang === "es";
  const day = esc(dayLabel(at, lang)), iso = esc(isoDay(at));
  const t = `<time datetime="${iso}">${day}</time>`;
  const drop = Number(r.price_drop) > 0 ? Number(r.price_drop) : 0;
  const now = eur(r.price_eur, lang), before = eur(r.price_eur + drop, lang);
  const gone = isGone(r);
  const p = drop
    ? (es ? `En RealHunt desde el ${t}, a ${esc(before)}. Después el precio bajó ${esc(eur(drop, lang))}, hasta ${esc(now)}${gone ? ", el último precio antes de que se retirara el anuncio" : ""}.`
      : `On RealHunt since ${t} at ${esc(before)}. The price was then lowered by ${esc(eur(drop, lang))} to ${esc(now)}${gone ? ", the last price before the advert was taken down" : ""}.`)
    : (es ? `Mismo precio desde el ${t}: ${esc(now)}${gone ? " (último precio antes de que se retirara el anuncio)" : ""}.`
      : `Same price since ${t}: ${esc(now)}${gone ? " (the last price before the advert was taken down)" : ""}.`);
  return (es ? "<h2>Historial de precio</h2>" : "<h2>Price history</h2>") + `<p data-rh-pricehist>${p}</p>`;
}
/** The price before the drop, for the structured data (idea 6); null when the price never changed. */
export const priceBefore = (r: Row): number | null => (Number(r.price_drop) > 0 && r.price_eur > 0 ? r.price_eur + Number(r.price_drop) : null);

// ---------------------------------------------------------------------------------------------------- score
/** Where the score stands among all homes: { top: 5, of: 726 } means in the best 5 %. higher = homes that score more. */
export function scoreRank(r: Row, all: Row[]): { top: number; higher: number; of: number } | null {
  if (r?.nota == null) return null;
  const scored = all.filter((x) => typeof x?.nota === "number");
  if (scored.length < 20) return null;
  const higher = scored.filter((x) => x.nota > r.nota).length;
  return { top: Math.max(1, Math.ceil(((higher + 1) / scored.length) * 100)), higher, of: scored.length };
}
/** "94: in the top 5% of 726 homes on RealHunt" (or "... 120 of the 726 homes score higher" in the lower half). */
export function scoreRankText(r: Row, all: Row[], lang: Lang): string {
  const k = scoreRank(r, all);
  if (!k) return "";
  const n = k.of.toLocaleString(lang === "es" ? "es-ES" : "en");
  if (lang === "es") return k.top <= 50 ? `${r.nota}: entre el ${k.top} % mejor de ${n} casas de RealHunt` : `${r.nota}: ${k.higher} de las ${n} casas de RealHunt tienen más nota`;
  return k.top <= 50 ? `${r.nota}: in the top ${k.top}% of ${n} homes on RealHunt` : `${r.nota}: ${k.higher} of the ${n} homes on RealHunt score higher`;
}

// ---------------------------------------------------------------------------------------------------- calculator
/** The country's own calculator, or the buying-costs calculator of the country, with this price filled in. */
export function calcLink(r: Row, cc: string, lang: Lang, hasCostsPage: boolean): [string, string] | null {
  const p = Math.round(Number(r.price_eur) || 0);
  if (!(p > 0)) return null;
  const es = lang === "es", pre = es ? "/es" : "";
  const own: Record<string, [string, string, string]> = {
    portugal: [`/tools/portugal-imt?p=${p}`, "Work out the IMT and stamp duty on this price", "Calcula el IMT y el impuesto del sello de este precio"],
    spain: [`/tools/spain-non-resident-tax?price=${p}`, "Work out the yearly non-resident tax on this home", "Calcula el impuesto anual de no residentes de esta casa"],
    france: [`/tools/france-notary-fees?p=${p}`, "Work out the notary fees on this price", "Calcula los gastos de notaría de este precio"],
    germany: [`/tools/germany-property-transfer-tax?p=${p}`, "Work out the transfer tax on this price", "Calcula el impuesto de transmisión de este precio"],
  };
  if (own[cc]) return [pre + own[cc][0], es ? own[cc][2] : own[cc][1]];
  if (hasCostsPage) return [`${pre}/buying-costs/${cc}?p=${p}`, es ? "Calcula los gastos de compra de este precio" : "Work out the buying costs on this price"];
  return null;
}

// ---------------------------------------------------------------------------------------------------- related homes
const town = (r: Row) => (locationParts(r.location_name)[0] || "").replace(/^near /i, "").trim().toLowerCase();
/** Other homes in the same town (at least 2 there, this one included), best score first. */
export function sameTown(r: Row, countryHomes: Row[], n = 6): Row[] {
  const t = town(r);
  if (!t) return [];
  const xs = countryHomes.filter((x) => x.slug !== r.slug && town(x) === t);
  return xs.slice().sort((a, b) => (b.nota ?? 0) - (a.nota ?? 0) || String(a.slug).localeCompare(String(b.slug))).slice(0, n);
}
/** Similar homes by a rule said in the text: same country, price within 25 %, same bedrooms; then any bedrooms. */
export function bySimilarRule(r: Row, countryHomes: Row[], n = 6, skip: Set<string> = new Set()): { rows: Row[]; sameBeds: boolean } {
  const ok = (x: Row) => x.slug !== r.slug && !skip.has(x.slug) && x.price_eur > 0 && r.price_eur > 0 && Math.abs(x.price_eur - r.price_eur) <= 0.25 * r.price_eur;
  const near = (a: Row, b: Row) => Math.abs(a.price_eur - r.price_eur) - Math.abs(b.price_eur - r.price_eur) || String(a.slug).localeCompare(String(b.slug));
  const beds = Number(r.bedrooms) > 0 ? Number(r.bedrooms) : 0;
  const same = beds ? countryHomes.filter((x) => ok(x) && Number(x.bedrooms) === beds).sort(near) : [];
  if (same.length >= 3) return { rows: same.slice(0, n), sameBeds: true };
  return { rows: countryHomes.filter(ok).sort(near).slice(0, n), sameBeds: false };
}
/** Previous and next home of the same region by score (the region's own order), for plain links (idea 32). */
export function siblings(r: Row, regionHomes: Row[]): { prev: Row | null; next: Row | null } {
  const xs = regionHomes.slice().sort((a, b) => (b.nota ?? 0) - (a.nota ?? 0) || String(a.slug).localeCompare(String(b.slug)));
  const i = xs.findIndex((x) => x.slug === r.slug);
  if (i < 0 || xs.length < 2) return { prev: null, next: null };
  return { prev: i > 0 ? xs[i - 1] : null, next: i < xs.length - 1 ? xs[i + 1] : null };
}

// ---------------------------------------------------------------------------------------------------- source and errors
/** "Listed on fotocasa.es", linked to /sources/<portal> when that page exists (idea 28). */
export const sourcePath = (dom: string) => "/sources/" + String(dom || "").toLowerCase().replace(/^www\./, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export function correctionHtml(slug: string, lang: Lang): string {
  const es = lang === "es";
  const url = `https://realhunt.co${es ? "/es" : ""}/deal/${slug}`;
  const subject = encodeURIComponent((es ? "Error en " : "Error on ") + url);
  const body = encodeURIComponent(es ? `Casa: ${url}\nQué está mal:\nDónde lo has visto (enlace o foto):\n` : `Home: ${url}\nWhat is wrong:\nWhere you saw it (a link or a photo):\n`);
  const mail = `mailto:carlos@equinoxinvestmentgroup.com?subject=${subject}&amp;body=${body}`;
  return es
    ? `<p data-rh-fix>¿Ves un error en esta casa? <a href="${mail}">Escríbenos con la ficha ya rellenada</a>: lo corregimos y lo anotamos en las <a href="/es/corrections">correcciones</a>.</p>`
    : `<p data-rh-fix>See an error on this home? <a href="${mail}">Write to us, the page is already filled in</a>: we fix it and note it in the <a href="/corrections">corrections</a>.</p>`;
}

// ---------------------------------------------------------------------------------------------------- description
/** "... in Alpujarra de la Sierra for €38,000. Alpujarra de la Sierra, Granada, Spain." -> the place line keeps only
 * what the sentence before it does not already name ("Granada, Spain."). Idea 18. */
export function placeOnce(desc: string): string {
  const m = /^(.*?[.!?])\s+([^.!?]+)\.(.*)$/s.exec(desc);
  if (!m) return desc;
  const [, first, place, rest] = m;
  const parts = place.split(",").map((x) => x.trim()).filter(Boolean);
  if (parts.length < 2 && !first.toLowerCase().includes(place.trim().toLowerCase())) return desc;
  const low = first.toLowerCase();
  const kept = parts.filter((x) => !low.includes(x.toLowerCase()));
  if (kept.length === parts.length) return desc;
  return kept.length ? `${first} ${kept.join(", ")}.${rest}` : `${first}${rest}`;
}
/** True when a place word of 2+ words or 6+ letters appears twice in the text (the test of idea 18). */
export function repeatsPlace(text: string, place: string): boolean {
  const first = String(place || "").split(",")[0].trim();
  if (first.length < 6) return false;
  const re = new RegExp(first.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
  return (text.match(re) || []).length > 1;
}

// ---------------------------------------------------------------------------------------------------- against the region
/** Idea 9: the home against the other homes of its region on RealHunt (at least 5 of them): the share of them that cost
 * more, that cost more per m², and that score lower, with a three-line bar chart drawn here (no script, no tiles). */
export function regionCompare(r: Row, regionHomes: Row[]): { n: number; price: number; ppsqm: number | null; score: number | null } | null {
  const others = regionHomes.filter((x) => x.slug !== r.slug && x.price_eur > 0);
  if (others.length < 4 || !(r.price_eur > 0)) return null;
  const share = (xs: Row[], f: (x: Row) => boolean) => Math.round((xs.filter(f).length / xs.length) * 100);
  const own = perSqm(r);
  const withSize = others.filter((x) => perSqm(x) > 0);
  return {
    n: others.length + 1,
    price: share(others, (x) => x.price_eur > r.price_eur),
    ppsqm: own && withSize.length >= 4 ? share(withSize, (x) => perSqm(x) > own) : null,
    score: r.nota != null ? share(others.filter((x) => x.nota != null), (x) => x.nota < r.nota) : null,
  };
}
export function regionCompareHtml(r: Row, regionHomes: Row[], regionName: string, lang: Lang): string {
  const c = regionCompare(r, regionHomes);
  if (!c) return "";
  const es = lang === "es";
  const lines: [string, number][] = [
    [es ? `Más barata que el ${c.price} % de las demás` : `Cheaper than ${c.price}% of the others`, c.price],
    ...(c.ppsqm != null ? [[es ? `Precio por m² más bajo que el ${c.ppsqm} %` : `Lower price per m² than ${c.ppsqm}%`, c.ppsqm] as [string, number]] : []),
    ...(c.score != null ? [[es ? `Más nota que el ${c.score} %` : `Higher score than ${c.score}%`, c.score] as [string, number]] : []),
  ];
  const W = 320, rowH = 30;
  const bars = lines.map(([label, v], i) => `<text x="0" y="${i * rowH + 11}" font-size="12" fill="currentColor">${esc(label)}</text><rect x="0" y="${i * rowH + 16}" width="${W}" height="8" rx="4" fill="#E4E5E8"/><rect x="0" y="${i * rowH + 16}" width="${Math.max(2, Math.round((W * v) / 100))}" height="8" rx="4" fill="#1B7D43"/>`).join("");
  const svg = `<svg viewBox="0 0 ${W} ${lines.length * rowH}" width="${W}" height="${lines.length * rowH}" role="img" aria-label="${esc(es ? `Esta casa frente a las otras ${c.n - 1} casas de ${regionName} en RealHunt` : `This home against the other ${c.n - 1} homes in ${regionName} on RealHunt`)}" style="max-width:100%;height:auto">${bars}</svg>`;
  return (es ? `<h2>Esta casa frente a ${esc(regionName)}</h2>` : `<h2>This home against ${esc(regionName)}</h2>`)
    + `<p>${esc(es ? `Comparada con las otras ${c.n - 1} casas de ${regionName} en RealHunt (precio de venta del anuncio):` : `Compared with the other ${c.n - 1} homes in ${regionName} on RealHunt (asking prices):`)}</p>`
    // the figures as a sentence too (read by the .md version and by screen readers that skip the drawing)
    + `<div data-rh-vsregion>${svg}<p>${esc(lines.map(([l]) => l).join(". "))}.</p></div>`;
}

/** Idea 41: the key distances in one line at the top: sea and airport (with its code), in a straight line. */
export function distancesLine(r: Row, lang: Lang): string {
  const near = r.nearby || {}; const es = lang === "es";
  const sea = near.sea?.km ?? r.sea_km ?? near.sea_km, air = near.airport?.km ?? r.airport_km;
  const bits: string[] = [];
  if (sea != null && Number.isFinite(Number(sea))) bits.push(`${es ? "Mar" : "Sea"} ${kmText(Number(sea), lang)}`);
  if (air != null && Number.isFinite(Number(air))) { const code = /^[A-Z]{3}$/.test(String(near.airport?.code || "")) ? ` (${near.airport.code})` : ""; bits.push(`${es ? "Aeropuerto" : "Airport"} ${kmText(Number(air), lang)}${code}`); }
  if (!bits.length) return "";
  return `<p data-rh-dist>${esc(bits.join(" · "))} ${esc(es ? "en línea recta" : "in a straight line")}.</p>`;
}

/** Idea 20: the region named in the answer paragraph becomes a link to its page (first mention only). */
export function linkFirst(textHtml: string, name: string, href: string): string {
  if (!name || !href) return textHtml;
  const i = textHtml.indexOf(esc(name));
  if (i < 0) return textHtml;
  return textHtml.slice(0, i) + `<a href="${esc(href)}">${esc(name)}</a>` + textHtml.slice(i + esc(name).length);
}
