// Knowledge pages (15-nov-2026), sections 5 and 8 of the organic-traffic list:
//   /guide/glossary                      the glossaries, the table of equivalents between countries and every word A to Z
//   /guide/glossary/<country>            the local words of buying a home in one country (11 pages)
//   /guide/glossary/italy/quiz           a short test made from the Italian glossary (noindex: it repeats the glossary)
//   /guide/buying                        guides by subject
//   /guide/buying/<subject>              papers, surveys, power of attorney, bank and payment, tax residency, ...
//   /guide/questions                     the question hub: every question with its short answer, by subject and by country
//   /guide/questions/<question>          one question, answered first in two sentences and then country by country
// Texts: seo/knowledge/data/*.ts, by hand in English and Spanish. Sources: seo/knowledge/sources.ts. Figures about our
// homes and the tables by country are computed here from public/data/rh-static.json and src/data/*.json at build time.
// Called once from seo/prerender.ts (English run); writes both languages. finishKnowledge runs after the Spanish twins.
import fs from "fs";
import path from "path";
import { type CanBuyData, canBuyPairs, canBuySlug, costCountries, costRange, countryKey, fill, localizeCanBuy, localizeRows, nameOf, ruleFor, statusLabel, theEs } from "../../src/community/seo2data";
import { regionOf } from "../../src/community/regions";
import { placesEs } from "../es";
import { ORG, SITE, crumbLd, esc, kit, table, type Kit, type Lang, type PageFn } from "../assetsKit";
import { byline, cite, fitDesc, fitTitle, frame, md, metaLine, paragraphs, plain, sourceList, type Names } from "./render";
import { GLOSSARIES_1 } from "./data/glossary1";
import { GLOSSARIES_2 } from "./data/glossary2";
import { TOPICS_1 } from "./data/topics1";
import { TOPICS_2 } from "./data/topics2";
import type { Concept, Glossary, L, Term, Topic } from "./types";

export const GLOSSARIES: Glossary[] = [...GLOSSARIES_1, ...GLOSSARIES_2];
export const TOPICS: Topic[] = [...TOPICS_1, ...TOPICS_2];
export const QUIZ_OF = "italy";

export type Home = { slug: string; title: string; title_es?: string; country: string; location_name?: string; price_eur: number; sqm?: number; nota?: number; rank?: number };
export type KnowCtx = { root: string; page: PageFn; rows: Home[]; dest: Record<string, any>; guides: Record<string, any>; cb: CanBuyData; today: string; image: string };

export const glossaryPath = (slug?: string) => "/guide/glossary" + (slug ? "/" + slug : "");
export const topicPath = (t: Pick<Topic, "kind" | "slug">) => `/guide/${t.kind}/${t.slug}`;
/** Country key -> the glossary that covers it. */
export const glossaryOf = (cc: string) => GLOSSARIES.find((g) => g.cc.includes(cc));

const readJson = (f: string, d: any = {}) => { const p = path.resolve(process.cwd(), f); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : d; };
const median = (xs: number[]) => { const s = xs.slice().sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const CONCEPTS: [Concept, L][] = [
  ["tax-id", { en: "Tax or identity number", es: "Número fiscal o de identidad" }],
  ["extract", { en: "Extract that shows owner and debts", es: "Extracto con el dueño y las deudas" }],
  ["registry", { en: "Land registry", es: "Registro de la propiedad" }],
  ["preliminary", { en: "Preliminary contract", es: "Contrato preliminar" }],
  ["deposit", { en: "Deposit", es: "Señal" }],
  ["cooling-off", { en: "Right to withdraw", es: "Derecho a desistir" }],
  ["notary", { en: "Notary", es: "Notario" }],
  ["deed", { en: "Deed of sale", es: "Escritura" }],
  ["transfer-tax", { en: "Tax on the purchase", es: "Impuesto de la compra" }],
  ["yearly-tax", { en: "Yearly property tax", es: "Impuesto anual" }],
  ["energy", { en: "Energy certificate", es: "Certificado energético" }],
  ["community", { en: "Owners' association", es: "Comunidad de propietarios" }],
];
const SHELVES: [Topic["shelf"], L][] = [
  ["papers", { en: "Papers, checks and who signs", es: "Papeles, comprobaciones y quién firma" }],
  ["money", { en: "Money: paying, running costs and rent", es: "Dinero: pagos, gastos y alquiler" }],
  ["tax", { en: "Tax", es: "Impuestos" }],
  ["living", { en: "Living there: residency, visits and pets", es: "Vivir allí: residencia, estancias y mascotas" }],
  ["risk", { en: "Risks and what can go wrong", es: "Riesgos y lo que puede salir mal" }],
  ["words", { en: "Words and language", es: "Palabras e idioma" }],
];

const mineEs: string[] = [];
let written = 0;

/** How a term is shown: the word itself, in its language; on the Spanish page an English word goes after its Spanish
 * name, in brackets, so the page stays in one language. */
const enInEs = (t: Term, g: Glossary, lang: Lang) => lang === "es" && (t.tl || g.tl) === "en";
/** The English word, with its longer form when the two together stay short (a bracket of up to four words reads as
 * an aside on a Spanish page; a longer one would be English text in the middle of it). */
const enWords = (t: Term) => (t.aka && `${t.term}, ${t.aka}`.split(/\s+/).length <= 4 ? `${t.term}, ${t.aka}` : t.term);
const termHead = (t: Term, g: Glossary, lang: Lang) => {
  const tl = t.tl || g.tl;
  return enInEs(t, g, lang)
    ? esc(`${t.plain.es.charAt(0).toUpperCase() + t.plain.es.slice(1)} (${enWords(t)})`) // no tag inside: the bracket must stay one piece of text
    : `<i lang="${esc(tl)}">${esc(t.term)}</i>${t.plain[lang].toLowerCase() === t.term.toLowerCase() ? "" : ` <span>${esc(t.plain[lang])}</span>`}`;
};
const termText = (t: Term, g: Glossary, lang: Lang) => (enInEs(t, g, lang) ? `${t.plain.es} (${t.term})` : t.term);
/** The word as a link label, in its language. */
const termLabel = (t: Term, g: Glossary, lang: Lang) => (enInEs(t, g, lang) ? esc(`${t.plain.es} (${t.term})`) : `<i lang="${esc(t.tl || g.tl)}">${esc(t.term)}</i>`);

export function writeKnowledge(c: KnowCtx): number {
  written = 0; mineEs.length = 0;
  const rows = c.rows.filter((r) => r?.slug && r.price_eur > 0).slice().sort((a, b) => (b.nota ?? 0) - (a.nota ?? 0) || (a.rank ?? 1e9) - (b.rank ?? 1e9) || a.slug.localeCompare(b.slug));
  const destEs = localizeRows(c.dest, readJson("src/data/destinations-es.json"));
  const guidesEs = localizeRows(c.guides, readJson("src/data/guides-es.json"));
  const cbEs = localizeCanBuy(c.cb, readJson("src/data/canbuy-es.json", { nationalities: {}, countries: {} }));
  const calc = new Set(costCountries(c.dest, c.guides));
  const pairs = new Set(canBuyPairs(c.cb, c.dest, c.guides).map((p: any) => canBuySlug(p.nat, p.country)));
  const byCc = new Map<string, Home[]>();
  for (const r of rows) { const k = countryKey(r.country); (byCc.get(k) || byCc.set(k, []).get(k)!).push(r); }
  const live = (cc: string) => (byCc.get(cc)?.length || 0) >= 3;

  for (const lang of ["en", "es"] as Lang[]) {
    const k = kit(lang); const { t, es } = k;
    const dest = es ? destEs : c.dest, guides = es ? guidesEs : c.guides, cb = es ? cbEs : c.cb;
    const names: Names = (key) => (es ? (c.guides[key] ? placesEs(k.country(c.guides[key].name)) : nameOf(key, {}, "es")) : nameOf(key, c.guides)) || key;
    const inC = (key: string) => (es ? theEs(names(key)) : names(key).replace(/^(United |Netherlands$|Dominican Republic$)/, "the $1"));
    const dec = (s: unknown) => (es ? String(s ?? "").replace(/(\d)\.(\d)/g, "$1,$2") : String(s ?? ""));
    const homeLi = (r: Home) => `<li><a href="/deal/${esc(r.slug)}"><strong>${esc(k.eur(r.price_eur))}</strong> · ${esc((es && r.title_es) || r.title)}</a><br><small>${esc(es ? placesEs(String(r.location_name || r.country)) : r.location_name || r.country)}${r.sqm ? ` · ${k.num(r.sqm)} m²` : ""}${r.nota != null ? ` · ${t("score", "nota")} ${r.nota}` : ""}</small></li>`;
    const put = (p: string, title: string, desc: string, body: string, ld: object[], o: { reviewed: string; noindex?: boolean }) => {
      const full = (title + " · RealHunt").length <= 60 ? title + " · RealHunt" : title;
      c.page(k.url(p), full, fitDesc(desc), c.image, body, ld, { group: es ? "es" : "content", lastmod: o.reviewed, lang: es ? "es" : undefined, alt: o.noindex ? undefined : { en: SITE + p, es: `${SITE}/es${p}` }, noindex: o.noindex });
      if (es) mineEs.push(`es${p}/index.html`);
      written++;
    };
    const guideCrumb: [string, string] = [t("Guides", "Guías"), "/guide"];
    const eyebrowG = t("Glossary", "Glosario"), eyebrowB = t("Buying guide", "Guía de compra"), eyebrowQ = t("Question", "Pregunta");
    const countryLinks = (ccs: string[]) => ccs.filter((cc) => c.guides[cc]).map((cc) =>
      `<li><strong>${esc(names(cc))}</strong>: <a href="/guide/${cc}">${esc(t("how to buy, step by step", "cómo comprar, paso a paso"))}</a> · <a href="/costs/${cc}">${esc(t("costs, taxes and sources", "gastos, impuestos y fuentes"))}</a>${calc.has(cc) ? ` · <a href="/buying-costs/${cc}">${esc(t("cost calculator", "calculadora de gastos"))}</a>` : ""}${live(cc) ? ` · <a href="/homes/${cc}">${esc(t(`${byCc.get(cc)!.length} homes`, `${byCc.get(cc)!.length} casas`))}</a>` : ""}</li>`).join("");

    // ------------------------------------------------------------------ blocks computed from our data
    const block = (id: string): string => {
      const [name, arg] = id.split(":");
      if (name === "rentTable") {
        const keys = Object.keys(dest).filter((x) => x !== "_meta" && names(x) && (dest[x].rental_income_tax || dest[x].holiday_rental_rules)).sort((a, b) => names(a).localeCompare(names(b)));
        return table([{ h: t("Country", "País") }, { h: t("Tax on rent for an owner from abroad", "Impuesto sobre el alquiler para un propietario de fuera"), cls: "w" }, { h: t("Holiday-let rules", "Normas del alquiler turístico"), cls: "w" }],
          keys.map((x) => [`<a href="/costs/${x}">${esc(names(x))}</a>`, esc(dest[x].rental_income_tax || t("No sourced figure", "Sin dato contrastado")), esc(dest[x].holiday_rental_rules || t("No sourced summary", "Sin resumen contrastado"))]), t("Tax on rent and holiday-let rules by country", "Impuesto sobre el alquiler y normas del alquiler turístico por país"), true);
      }
      if (name === "yearlyTable") {
        const keys = Object.keys(guides).filter((x) => dest[x]?.annual_property_tax).sort((a, b) => names(a).localeCompare(names(b)));
        return table([{ h: t("Country", "País") }, { h: t("Yearly property tax", "Impuesto anual sobre la vivienda"), cls: "w" }, { h: t("Also every year", "Además, cada año"), cls: "w" }],
          keys.map((x) => [`<a href="/costs/${x}">${esc(names(x))}</a>`, esc(dest[x].annual_property_tax), esc(guides[x].yearly || "")]), t("Yearly costs of owning a home, by country", "Gastos anuales de tener una casa, por país"), true);
      }
      if (name === "canbuy") {
        const nv = cb.nationalities[arg]; if (!nv) return "";
        const keys = Object.keys(cb.countries).filter((x) => x !== nv.home && pairs.has(canBuySlug(arg, x)) && ruleFor(cb, arg, x)).sort((a, b) => names(a).localeCompare(names(b)));
        // the full answer lives on each can-I-buy page; here the status, and the condition only where there is one
        const item = (x: string) => { const r = ruleFor(cb, arg, x)!; return `<li><a href="/can-i-buy/${canBuySlug(arg, x)}">${esc(names(x))}</a> <span class="rhx-st ${r.s}">${esc(statusLabel(r.s, lang))}</span></li>`; };
        return `<ul class="kn-chips kn-status">${keys.map(item).join("")}</ul>`;
      }
      if (name === "residency") {
        const keys = Object.keys(cb.countries).filter((x) => (cb.countries[x] as any).residency_other && names(x)).sort((a, b) => names(a).localeCompare(names(b)));
        return `<dl class="kn-qa">${keys.map((x) => `<dt>${esc(names(x))}</dt><dd>${esc((cb.countries[x] as any).residency_other)}</dd>`).join("")}</dl>`;
      }
      if (name === "spainPrices") {
        const hs = byCc.get("spain") || []; if (hs.length < 3) return "";
        const pr = hs.map((h) => h.price_eur), max = Math.max(...pr), med = median(pr);
        return `<p>${esc(t(
          `Today RealHunt lists ${hs.length} homes in Spain. Their median asking price is ${k.eur(med)} and the most expensive costs ${k.eur(max)}, which is ${Math.round((max / 700000) * 100)}% of the €700,000 exempt minimum. A non-resident whose only asset in Spain is one of these homes is below the threshold of the state rule.`,
          `RealHunt publica hoy ${hs.length} casas en España. Su precio de salida mediano es de ${k.eur(med)} y la más cara cuesta ${k.eur(max)}, el ${Math.round((max / 700000) * 100)}% del mínimo exento de 700.000 €. Un no residente cuyo único bien en España sea una de estas casas queda por debajo del umbral de la norma estatal.`))}</p><p><a href="/homes/spain">${esc(t(`All ${hs.length} homes in Spain`, `Las ${hs.length} casas de España`))}</a></p>`;
      }
      if (name === "homes") {
        const hs = byCc.get(arg) || []; if (hs.length < 3) return `<p>${esc(t(`We list fewer than three homes in ${names(arg)} today, so we give no figures.`, `Hoy publicamos menos de tres casas en ${inC(arg)}, así que no damos cifras.`))}</p>`;
        const pr = hs.map((h) => h.price_eur), pp = hs.filter((h) => (h.sqm || 0) > 0).map((h) => h.price_eur / h.sqm!);
        const reg = new Map<string, number>();
        for (const h of hs) { const r = regionOf(h); if (r) reg.set(r, (reg.get(r) || 0) + 1); }
        const top = [...reg.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 5);
        return `<ul><li>${esc(t(`Homes checked and listed today: ${hs.length}`, `Casas revisadas y publicadas hoy: ${hs.length}`))}</li><li>${esc(t(`Median asking price: ${k.eur(median(pr))}`, `Precio de salida mediano: ${k.eur(median(pr))}`))}</li><li>${esc(t(`Cheapest: ${k.eur(Math.min(...pr))}`, `La más barata: ${k.eur(Math.min(...pr))}`))}</li>`
          + (pp.length >= 3 ? `<li>${esc(t(`Median price per m², from the ${pp.length} homes whose listing gives a size: ${k.eur(median(pp))}`, `Precio mediano por m², con las ${pp.length} casas cuyo anuncio indica la superficie: ${k.eur(median(pp))}`))}</li>` : "")
          + (top.length ? `<li>${esc(t("Where they are", "Dónde están"))}: ${top.map(([r, n]) => `${esc(es ? placesEs(k.country(r)) : r)} (${n})`).join(", ")}</li>` : "") + `</ul>`
          + `<ol class="kn-homes">${hs.slice(0, 5).map(homeLi).join("")}</ol><p><a href="/homes/${arg}">${esc(t(`All ${hs.length} homes in ${inC(arg)}`, `Las ${hs.length} casas en ${inC(arg)}`))}</a> · <a href="/method">${esc(t("How homes are chosen and scored", "Cómo se eligen y se puntúan las casas"))}</a></p>`;
      }
      if (name === "myth" && arg === "canbuy") {
        const line = (nat: string) => { const nv = cb.nationalities[nat]; if (!nv) return "";
          const keys = Object.keys(cb.countries).filter((x) => x !== nv.home && ruleFor(cb, nat, x));
          const n = (s: string) => keys.filter((x) => ruleFor(cb, nat, x)!.s === s).length;
          return `<li>${esc(t(`${fill("{plural}", nv)}: yes in ${n("yes")} of ${keys.length} countries, with conditions in ${n("conditions")}, restricted in ${n("restricted")}.`, `${fill("{plural}", nv)}: sí en ${n("yes")} de ${keys.length} países, con condiciones en ${n("conditions")}, restringido en ${n("restricted")}.`))}</li>`; };
        return `<p><strong>${esc(t("The figure", "El dato"))}:</strong></p><ul>${["american", "british", "german"].map(line).join("")}</ul><p><a href="/can-i-buy">${esc(t("Who can buy where, by nationality", "Quién puede comprar dónde, por nacionalidad"))}</a></p>`;
      }
      if (name === "myth" && arg === "costs") {
        const rs = Object.keys(c.guides).map((x) => ({ x, r: costRange(c.dest[x]?.purchase_costs_pct) })).filter((v) => v.r) as { x: string; r: [number, number] }[];
        if (rs.length < 2) return "";
        const lo = rs.slice().sort((a, b) => a.r[0] - b.r[0])[0], hi = rs.slice().sort((a, b) => b.r[1] - a.r[1])[0];
        return `<p><strong>${esc(t("The figure", "El dato"))}:</strong> ${esc(t(
          `in the ${rs.length} countries of our buying-cost calculator, the costs on top of the price run from about ${k.dec(lo.r[0])}% in ${inC(lo.x)} to as much as ${k.dec(hi.r[1])}% in ${inC(hi.x)}. On a €60,000 house that is the difference between ${k.eur(60000 * lo.r[0] / 100)} and ${k.eur(60000 * hi.r[1] / 100)}.`,
          `en los ${rs.length} países de nuestra calculadora de gastos, lo que se paga además del precio va de alrededor del ${k.dec(lo.r[0])}% en ${inC(lo.x)} hasta el ${k.dec(hi.r[1])}% en ${inC(hi.x)}. En una casa de 60.000 € es la diferencia entre ${k.eur(60000 * lo.r[0] / 100)} y ${k.eur(60000 * hi.r[1] / 100)}.`))}</p><p><a href="/buying-costs">${esc(t("Buying-cost calculator by country", "Calculadora de gastos de compra por país"))}</a></p>`;
      }
      if (name === "myth" && arg === "homes") {
        const n = rows.length; if (!n) return "";
        const u50 = rows.filter((r) => r.price_eur <= 50000).length, u100 = rows.filter((r) => r.price_eur <= 100000).length;
        return `<p><strong>${esc(t("The figure", "El dato"))}:</strong> ${esc(t(
          `of the ${k.num(n)} homes on RealHunt today, in ${byCc.size} countries, ${k.num(u100)} cost €100,000 or less and ${k.num(u50)} cost €50,000 or less. Each one was checked by a person before it was listed.`,
          `de las ${k.num(n)} casas que hay hoy en RealHunt, en ${byCc.size} países, ${k.num(u100)} cuestan 100.000 € o menos y ${k.num(u50)} cuestan 50.000 € o menos. Cada una la revisó una persona antes de publicarla.`))}</p><p><a href="/method">${esc(t("How homes are chosen and scored", "Cómo se eligen y se puntúan las casas"))}</a> · <a href="/blog/how-we-choose-homes">${esc(t("How we choose homes", "Cómo elegimos las casas"))}</a></p>`;
      }
      throw new Error(`knowledge: unknown block "${id}"`);
    };

    // ------------------------------------------------------------------ one page per glossary
    for (const g of GLOSSARIES) {
      const p = glossaryPath(g.slug);
      const gname = g.name[lang], inG = es ? theEs(gname) : gname;
      const words = g.terms.filter((x) => !enInEs(x, g, lang)).map((x) => x.term);
      // as many words as fit next to the brand, shortest reading first
      const head = es ? `Glosario inmobiliario de ${gname}` : `${gname.replace(/^the /, "")} property glossary`;
      let title = head;
      for (const w of words) { const next = title === head ? `${head}: ${w}` : `${title}, ${w}`; if (next.length <= 49) title = next; }
      const h1 = t(`Buying a home in ${inG}: the local words, explained`, `Comprar casa en ${inG}: las palabras locales, explicadas`);
      const descOf = (n: number) => t(`What ${words.slice(0, n).join(", ")} and ${g.terms.length - n} more ${g.tongue.en} words mean when you buy a home in ${inG}. Plain English, with sources.`, `Qué significan ${words.slice(0, n).join(", ")} y otras ${g.terms.length - n} palabras al comprar casa en ${inG}. En español claro y con fuentes.`);
      const desc = [5, 4, 3, 2].map(descOf).find((d) => d.length <= 155) || fitDesc(descOf(2));
      const crumbs: [string, string][] = [["RealHunt", "/"], guideCrumb, [eyebrowG, glossaryPath()], [gname.charAt(0).toUpperCase() + gname.slice(1), p]];
      const ids = g.terms.flatMap((x) => x.src);
      const homes = g.cc.filter(live).map((cc) => `<h2>${esc(t(`Homes in ${inC(cc)}, best score first`, `Casas en ${inC(cc)}, de mejor a peor nota`))}</h2><ol class="kn-homes">${byCc.get(cc)!.slice(0, 3).map(homeLi).join("")}</ol><p><a href="/homes/${cc}">${esc(t(`All ${byCc.get(cc)!.length} homes in ${inC(cc)}`, `Las ${byCc.get(cc)!.length} casas en ${inC(cc)}`))}</a></p>`).join("");
      const topics = TOPICS.filter((x) => x.cc?.some((cc) => g.cc.includes(cc)));
      const body = `<p class="kn-lede">${md(g.lede[lang])}</p>${metaLine(k, g.reviewed, c.today)}`
        + `<ul class="kn-chips" aria-label="${esc(t("Words on this page", "Palabras de esta página"))}">${g.terms.map((x) => `<li><a href="#${x.id}">${esc(termText(x, g, lang))}</a></li>`).join("")}</ul>`
        + g.terms.map((x) => `<section class="kn-term" id="${x.id}"><h3>${termHead(x, g, lang)}</h3>${x.aka && !enInEs(x, g, lang) ? `<p class="kn-aka">${esc(t("Also", "También"))}: <i lang="${esc((x.tl || g.tl).replace(/-Latn$/, ""))}">${esc(x.aka)}</i></p>` : ""}<p class="kn-def">${md(x.def[lang])}</p><p>${md(x.more[lang])}</p>${cite(x.src, k, names)}</section>`).join("")
        + `<h2 class="kn-noprint">${esc(t("Take it with you", "Llévatelo"))}</h2><p class="kn-noprint">${esc(t("This page is laid out for paper: print it from your browser, or save it as a PDF, and take it to the notary's office. The words keep their original spelling so you can point at them.", "Esta página está preparada para papel: imprímela desde el navegador, o guárdala como PDF, y llévala a la notaría. Las palabras conservan su grafía original para que puedas señalarlas."))}${g.slug === QUIZ_OF ? ` <a href="${glossaryPath(g.slug)}/quiz">${esc(t("Test yourself: eight questions on these words", "Ponte a prueba: ocho preguntas sobre estas palabras"))}</a>.` : ""}</p>`
        + `<h2>${esc(t(`Buying in ${inG}: the rest of the picture`, `Comprar en ${inG}: el resto del cuadro`))}</h2><ul>${countryLinks(g.cc)}${topics.slice(0, 8).map((x) => `<li><a href="${topicPath(x)}">${esc(x.h1[lang])}</a></li>`).join("")}</ul>`
        + homes
        + `<h2>${esc(t("Glossaries of other countries", "Glosarios de otros países"))}</h2><ul class="kn-chips">${GLOSSARIES.filter((x) => x !== g).map((x) => `<li><a href="${glossaryPath(x.slug)}">${esc(x.name[lang].replace(/^the /, ""))}</a></li>`).join("")}<li><a href="${glossaryPath()}">${esc(t("All words, A to Z", "Todas las palabras, de la A a la Z"))}</a></li></ul>`
        + sourceList(ids, k, names) + byline(k);
      const ld = [crumbLd(k, crumbs), { "@context": "https://schema.org", "@type": "DefinedTermSet", name: h1, description: desc, url: k.url(p), inLanguage: lang, dateModified: g.reviewed, publisher: ORG,
        hasDefinedTerm: g.terms.map((x) => ({ "@type": "DefinedTerm", ...(enInEs(x, g, lang) ? { name: x.plain.es, termCode: x.term } : { name: x.term, ...(x.aka ? { alternateName: x.aka } : {}) }), description: plain(x.def[lang]), url: `${k.url(p)}#${x.id}` })) }];
      put(p, title, desc, frame(k, { crumbs, eyebrow: `${eyebrowG} · ${g.tongue[lang]}`, h1, body }), ld, { reviewed: g.reviewed });
    }

    // ------------------------------------------------------------------ the quiz (noindex)
    {
      const g = GLOSSARIES.find((x) => x.slug === QUIZ_OF)!; const p = `${glossaryPath(g.slug)}/quiz`;
      const qs = g.terms.slice(0, 8);
      const h1 = t("Do you understand the papers of an Italian house purchase? Eight questions", "¿Entiendes los papeles de una compra en Italia? Ocho preguntas");
      const crumbs: [string, string][] = [["RealHunt", "/"], guideCrumb, [eyebrowG, glossaryPath()], [g.name[lang], glossaryPath(g.slug)], [t("Quiz", "Prueba"), p]];
      const body = `<p class="kn-lede">${esc(t("Eight words you will hear at an Italian estate agent and notary. Choose an answer in your head, then open the question to check it. No sign-up, no score kept.", "Ocho palabras que vas a oír en una inmobiliaria y en una notaría de Italia. Elige mentalmente una respuesta y abre la pregunta para comprobarla. Sin registro y sin guardar ninguna puntuación."))}</p>`
        + `<div class="kn-quiz">${qs.map((x, i) => { const others = [g.terms[(i + 3) % g.terms.length], g.terms[(i + 6) % g.terms.length]]; const opts = [x, ...others]; const order = [i % 3, (i + 1) % 3, (i + 2) % 3]; const shown = order.map((j) => opts[j]);
          return `<h2>${i + 1}. ${esc(t("What is", "¿Qué es"))} <i lang="it">${esc(x.term)}</i>${t("?", "?")}</h2><ol type="a">${shown.map((o) => `<li>${md(o.def[lang])}</li>`).join("")}</ol><details><summary>${esc(t("Show the answer", "Ver la respuesta"))}</summary><p><strong>${"abc"[shown.indexOf(x)]})</strong> ${md(x.def[lang])} ${md(x.more[lang])} <a href="${glossaryPath(g.slug)}#${x.id}">${esc(t("In the glossary", "En el glosario"))}</a></p></details>`; }).join("")}</div>`
        + `<p><a href="${glossaryPath(g.slug)}">${esc(t("The whole Italian glossary, with sources", "El glosario italiano completo, con fuentes"))}</a> · <a href="/guide/italy">${esc(t("How to buy a home in Italy, step by step", "Cómo comprar una casa en Italia, paso a paso"))}</a></p>` + byline(k);
      put(p, t("Quiz: the words of an Italian house purchase", "Prueba: las palabras de una compra en Italia"), t("Eight questions on the words of an Italian house purchase: rogito, compromesso, visura catastale and more. Answers with their explanation.", "Ocho preguntas sobre las palabras de una compra en Italia: rogito, compromesso, visura catastale y más. Respuestas con su explicación."),
        frame(k, { crumbs, eyebrow: eyebrowG, h1, body, cls: "kn-quizpage" }), [crumbLd(k, crumbs)], { reviewed: g.reviewed, noindex: true });
    }

    // ------------------------------------------------------------------ the glossary index: countries, equivalents, A to Z
    {
      const p = glossaryPath(); const crumbs: [string, string][] = [["RealHunt", "/"], guideCrumb, [eyebrowG, p]];
      const all = GLOSSARIES.flatMap((g) => g.terms.map((x) => ({ g, x }))).sort((a, b) => a.x.term.localeCompare(b.x.term, "en", { sensitivity: "base" }));
      const h1 = t("Property glossary by country: the local words of buying a home abroad", "Glosario inmobiliario por países: las palabras locales para comprar casa fuera");
      const desc = t(`${all.length} local words from ${GLOSSARIES.length} glossaries, from nota simple to Grundbuch and akiya, each explained in one line and then in full, with its source.`, `${all.length} palabras locales de ${GLOSSARIES.length} glosarios, de la nota simple al Grundbuch y el akiya, cada una explicada en una línea y después a fondo, con su fuente.`);
      const cell = (g: Glossary, cn: Concept) => g.terms.filter((x) => x.concept === cn).map((x) => `<a href="${glossaryPath(g.slug)}#${x.id}">${termLabel(x, g, lang)}</a>`).join("<br>") || "·";
      const body = `<p class="kn-lede">${esc(t("Every country names the same steps differently: the paper that shows who owns the house, the contract before the contract, the tax on the purchase. These glossaries keep each word as it is written where you will hear it and explain it in plain English.", "Cada país llama de otra manera a los mismos pasos: el papel que dice de quién es la casa, el contrato anterior al contrato, el impuesto de la compra. Estos glosarios conservan cada palabra tal como se escribe donde la vas a oír y la explican en español claro."))}</p>${metaLine(k, GLOSSARIES.map((g) => g.reviewed).sort()[0], c.today)}`
        + `<h2>${esc(t("By country", "Por países"))}</h2><ul class="kn-cards">${GLOSSARIES.map((g) => `<li><a href="${glossaryPath(g.slug)}">${esc(g.name[lang].charAt(0).toUpperCase() + g.name[lang].slice(1))}</a><span>${esc(t(`${g.terms.length} words`, `${g.terms.length} palabras`))}: ${g.terms.slice(0, 4).map((x) => termLabel(x, g, lang)).join(", ")}…</span></li>`).join("")}</ul>`
        + `<h2 id="equivalents">${esc(t("The same step in each country", "El mismo paso en cada país"))}</h2><p>${esc(t("Read across to find the word another country uses for the thing you already know. An empty cell means our glossary has no sourced word for it yet.", "Lee cada fila para encontrar la palabra que usa otro país para lo que ya conoces. Una celda vacía significa que nuestro glosario aún no tiene una palabra contrastada."))}</p>`
        + table([{ h: t("Step", "Paso") }, ...GLOSSARIES.map((g) => ({ h: g.name[lang].replace(/^the /, "") }))], CONCEPTS.filter(([cn]) => GLOSSARIES.some((g) => g.terms.some((x) => x.concept === cn))).map(([cn, label]) => [esc(label[lang]), ...GLOSSARIES.map((g) => cell(g, cn))]), t("Equivalent words by country", "Palabras equivalentes por país"))
        + `<h2 id="a-z">${esc(t(`All ${all.length} words, A to Z`, `Las ${all.length} palabras, de la A a la Z`))}</h2><dl class="kn-qa">${all.map(({ g, x }) => `<dt><a href="${glossaryPath(g.slug)}#${x.id}">${termLabel(x, g, lang)}</a> · ${esc(g.name[lang].replace(/^the /, ""))}</dt><dd>${md(x.def[lang])}</dd>`).join("")}</dl>`
        + `<h2>${esc(t("Next", "Siguiente"))}</h2><ul><li><a href="/guide/questions/words-people-mix-up">${esc(t("Six pairs of words that buyers mix up", "Seis pares de palabras que se confunden"))}</a></li><li><a href="/guide/questions">${esc(t("Questions buyers ask, with short answers", "Preguntas de compradores, con respuesta corta"))}</a></li><li><a href="/guide/buying">${esc(t("Buying guides by subject", "Guías de compra por temas"))}</a></li><li><a href="/guide">${esc(t("Buying guides by country", "Guías de compra por países"))}</a></li></ul>` + byline(k);
      put(p, t("Property glossary by country: local words explained", "Glosario inmobiliario por países"), desc, frame(k, { crumbs, eyebrow: eyebrowG, h1, body }),
        [crumbLd(k, crumbs), { "@context": "https://schema.org", "@type": "CollectionPage", name: h1, description: desc, url: k.url(p), inLanguage: lang, hasPart: GLOSSARIES.map((g) => ({ "@type": "DefinedTermSet", name: g.name[lang], url: k.url(glossaryPath(g.slug)) })) }], { reviewed: GLOSSARIES.map((g) => g.reviewed).sort().pop()! });
    }

    // ------------------------------------------------------------------ one page per subject or question
    for (const tp of TOPICS) {
      const p = topicPath(tp); const hub: [string, string] = tp.kind === "buying" ? [t("By subject", "Por temas"), "/guide/buying"] : [t("Questions", "Preguntas"), "/guide/questions"];
      const crumbs: [string, string][] = [["RealHunt", "/"], guideCrumb, hub, [tp.title[lang], p]];
      const ids = tp.secs.flatMap((s) => s.src || []);
      const seeLabel = (path0: string) => { const x = TOPICS.find((y) => topicPath(y) === path0); if (x) return x.h1[lang];
        const g = GLOSSARIES.find((y) => glossaryPath(y.slug) === path0); if (g) return t(`Glossary: ${g.name.en}`, `Glosario: ${g.name.es}`);
        const cc = /^\/(guide|costs)\/([a-z-]+)$/.exec(path0);
        if (path0 === "/guide/glossary") return t("Property glossary by country", "Glosario inmobiliario por países");
        if (cc && c.guides[cc[2]]) return cc[1] === "guide" ? t(`How to buy a home in ${inC(cc[2])}, step by step`, `Cómo comprar una casa en ${inC(cc[2])}, paso a paso`) : t(`Costs, taxes and sources for ${names(cc[2])}`, `Gastos, impuestos y fuentes de ${names(cc[2])}`);
        return ({ "/buying-costs": t("Buying-cost calculator by country", "Calculadora de gastos de compra por país"), "/can-i-buy": t("Can I buy there? Rules by nationality", "¿Puedo comprar allí? Normas por nacionalidad"), "/costs": t("Real buying costs by country", "Gastos reales de compra por país"), "/method": t("How homes are chosen and scored", "Cómo se eligen y se puntúan las casas") } as Record<string, string>)[path0] || path0; };
      const body = `<div class="rhx-answer"><p>${md(tp.answer[lang])}</p></div>${metaLine(k, tp.reviewed, c.today)}`
        + tp.secs.map((s) => `<h2${s.id ? ` id="${s.id}"` : ""}>${esc(s.h[lang])}</h2>${paragraphs(s.p, lang)}${s.block ? block(s.block) : ""}${cite(s.src, k, names)}`).join("")
        + (tp.see?.length ? `<h2>${esc(t("Read next", "Sigue leyendo"))}</h2><ul>${tp.see.map((x) => `<li><a href="${x}">${esc(seeLabel(x))}</a></li>`).join("")}</ul>` : "")
        + (tp.cc?.length ? `<h2>${esc(t("Country by country", "País por país"))}</h2><ul>${countryLinks(tp.cc)}</ul>` : "")
        + (ids.length ? sourceList(ids, k, names) : "") + byline(k);
      const ld: object[] = [crumbLd(k, crumbs), { "@context": "https://schema.org", "@type": "Article", headline: tp.h1[lang], description: tp.desc[lang], url: k.url(p), inLanguage: lang, datePublished: "2026-11-15", dateModified: tp.reviewed, author: { ...ORG, name: "RealHunt" }, publisher: { ...ORG, publishingPrinciples: `${SITE}/editorial-policy` }, mainEntityOfPage: k.url(p) }];
      if (tp.kind === "questions") ld.push({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: [{ "@type": "Question", name: tp.h1[lang], acceptedAnswer: { "@type": "Answer", text: plain(tp.answer[lang]) } }] });
      put(p, tp.title[lang], tp.desc[lang], frame(k, { crumbs, eyebrow: tp.kind === "buying" ? eyebrowB : eyebrowQ, h1: tp.h1[lang], body }), ld, { reviewed: tp.reviewed });
    }

    // ------------------------------------------------------------------ hub: guides by subject
    {
      const p = "/guide/buying"; const crumbs: [string, string][] = [["RealHunt", "/"], guideCrumb, [t("By subject", "Por temas"), p]];
      const list = TOPICS.filter((x) => x.kind === "buying");
      const h1 = t("Buying a home abroad, subject by subject", "Comprar casa en el extranjero, tema por tema");
      const desc = t(`${list.length} guides on what comes around the purchase: papers, surveys, powers of attorney, payment, tax residency, renting out and living there. With official sources.`, `${list.length} guías sobre lo que rodea a la compra: papeles, inspecciones, poderes, pagos, residencia fiscal, alquiler y vivir allí. Con fuentes oficiales.`);
      const body = `<p class="kn-lede">${esc(t("The country guides tell you the steps to buy in one place. These guides go across countries, one subject at a time, and say where each rule comes from. Where we could not find an official source, the page says so instead of guessing.", "Las guías por países cuentan los pasos para comprar en un lugar. Estas guías recorren varios países, tema por tema, y dicen de dónde sale cada norma. Donde no encontramos una fuente oficial, la página lo dice en lugar de suponer."))}</p>`
        + SHELVES.map(([sh, label]) => { const xs = list.filter((x) => x.shelf === sh); return xs.length ? `<h2>${esc(label[lang])}</h2><ul class="kn-cards">${xs.map((x) => `<li><a href="${topicPath(x)}">${esc(x.h1[lang])}</a><span>${esc(x.desc[lang])}</span></li>`).join("")}</ul>` : ""; }).join("")
        + `<h2>${esc(t("Also", "Además"))}</h2><ul><li><a href="/guide/questions">${esc(t("Questions buyers ask, with short answers", "Preguntas de compradores, con respuesta corta"))}</a></li><li><a href="/guide/glossary">${esc(t("Property glossary by country", "Glosario inmobiliario por países"))}</a></li><li><a href="/guide">${esc(t("Buying guides by country", "Guías de compra por países"))}</a></li><li><a href="/can-i-buy">${esc(t("Can I buy there? Rules by nationality", "¿Puedo comprar allí? Normas por nacionalidad"))}</a></li><li><a href="/countries">${esc(t("Two countries side by side", "Dos países frente a frente"))}</a></li></ul>` + byline(k);
      put(p, t("Buying a home abroad: guides by subject", "Comprar casa fuera: guías por temas"), desc, frame(k, { crumbs, eyebrow: eyebrowB, h1, body }), [crumbLd(k, crumbs)], { reviewed: list.map((x) => x.reviewed).sort().pop()! });
    }

    // ------------------------------------------------------------------ hub: questions, by subject and by country
    {
      const p = "/guide/questions"; const crumbs: [string, string][] = [["RealHunt", "/"], guideCrumb, [t("Questions", "Preguntas"), p]];
      const keys = Object.keys(guides).filter((x) => dest[x]).sort((a, b) => names(a).localeCompare(names(b)));
      const h1 = t("Questions about buying a home abroad, with short answers", "Preguntas sobre comprar casa en el extranjero, con respuesta corta");
      const desc = t(`${TOPICS.length} questions answered in two sentences and then in full, plus the three basics for each of ${keys.length} countries: can I buy, what it costs, what it costs every year.`, `${TOPICS.length} preguntas respondidas en dos frases y después a fondo, más lo básico de ${keys.length} países: si puedo comprar, cuánto cuesta y cuánto cuesta cada año.`);
      const firstSentence = (s: string) => { const m = /^(.*?[.!?])(\s|$)/.exec(s); return m && m[1].length >= 40 ? m[1] : s; };
      const body = `<p class="kn-lede">${esc(t("Every answer is visible without clicking. The link under each one opens the full page, with the rule in each country and its source.", "Todas las respuestas se ven sin pulsar. El enlace de cada una abre la página completa, con la norma de cada país y su fuente."))}</p>`
        + `<ul class="kn-chips">${SHELVES.map(([sh, label]) => `<li><a href="#${sh}">${esc(label[lang])}</a></li>`).join("")}<li><a href="#by-country">${esc(t("By country", "Por países"))}</a></li></ul>`
        + SHELVES.map(([sh, label]) => { const xs = TOPICS.filter((x) => x.shelf === sh); return xs.length ? `<h2 id="${sh}">${esc(label[lang])}</h2><dl class="kn-qa">${xs.map((x) => `<dt><a href="${topicPath(x)}">${esc(x.h1[lang])}</a></dt><dd>${md(x.answer[lang])}</dd>`).join("")}</dl>` : ""; }).join("")
        + `<h2 id="by-country">${esc(t("By country: the three basics", "Por países: lo básico"))}</h2><ul class="kn-chips">${keys.map((x) => `<li><a href="#c-${x}">${esc(names(x))}</a></li>`).join("")}</ul>`
        + keys.map((x) => { const d = dest[x]; const g = glossaryOf(x);
          return `<h3 id="c-${x}">${esc(names(x))}</h3><dl class="kn-qa"><dt>${esc(t(`Can foreigners buy a home in ${inC(x)}?`, `¿Pueden comprar los extranjeros en ${inC(x)}?`))}</dt><dd>${esc(d.can_foreigners_buy || "")}</dd>`
            + (d.purchase_costs_pct ? `<dt>${esc(t("How much do you pay on top of the price?", "¿Cuánto se paga además del precio?"))}</dt><dd>${esc(t(`About ${dec(d.purchase_costs_pct)}%.`, `Alrededor de un ${dec(d.purchase_costs_pct)}%.`))} ${calc.has(x) ? `<a href="/buying-costs/${x}">${esc(t("Work it out for your price", "Calcúlalo para tu precio"))}</a>` : ""}</dd>` : "")
            + (d.annual_property_tax ? `<dt>${esc(t("What is the yearly property tax?", "¿Cuál es el impuesto anual?"))}</dt><dd>${esc(firstSentence(d.annual_property_tax))}</dd>` : "") + `</dl>`
            + `<p><a href="/guide/${x}">${esc(t("The steps to buy", "Los pasos para comprar"))}</a> · <a href="/costs/${x}">${esc(t("Costs and sources", "Gastos y fuentes"))}</a>${g ? ` · <a href="${glossaryPath(g.slug)}">${esc(t("Glossary", "Glosario"))}</a>` : ""}${live(x) ? ` · <a href="/homes/${x}">${esc(t(`${byCc.get(x)!.length} homes`, `${byCc.get(x)!.length} casas`))}</a>` : ""}</p>`; }).join("")
        + `<h2>${esc(t("Did not find your question?", "¿No encuentras tu pregunta?"))}</h2><p>${t(`Write to <a href="mailto:carlos@equinoxinvestmentgroup.com">carlos@equinoxinvestmentgroup.com</a>. We only publish an answer when we can point to its source.`, `Escribe a <a href="mailto:carlos@equinoxinvestmentgroup.com">carlos@equinoxinvestmentgroup.com</a>. Solo publicamos una respuesta cuando podemos señalar su fuente.`)} <a href="/guide/glossary">${esc(t("Property glossary by country", "Glosario inmobiliario por países"))}</a> · <a href="/can-i-buy">${esc(t("Rules by nationality", "Normas por nacionalidad"))}</a></p>` + byline(k);
      put(p, t("Buying a home abroad: questions and short answers", "Comprar casa fuera: preguntas y respuestas"), desc, frame(k, { crumbs, eyebrow: eyebrowQ, h1, body }), [crumbLd(k, crumbs)], { reviewed: TOPICS.map((x) => x.reviewed).sort().pop()! });
    }
  }
  return written;
}

// ------------------------------------------------------------------------------------------------ after the twins
const main = (h: string) => { const a = h.indexOf('<main class="rh-static'); const b = a < 0 ? -1 : h.lastIndexOf("</main>"); return a < 0 || b < 0 ? null : { a, b }; };
/** Links the first time each word appears in the running text of an HTML fragment (not in headings, links or
 * navigation). Returns the new HTML and how many words were linked. */
export function linkTerms(html: string, terms: { word: string; href: string }[]): { html: string; linked: number } {
  const left = terms.slice().sort((x, y) => y.word.length - x.word.length);
  let skip = 0, linked = 0;
  const out = html.split(/(<[^>]+>)/).map((part, i) => {
    if (i % 2) {
      if (/^<(a|h1|h2|h3|nav|script|style|title)\b/i.test(part)) skip++;
      else if (/^<\/(a|h1|h2|h3|nav|script|style|title)>/i.test(part)) skip = Math.max(0, skip - 1);
      return part;
    }
    if (skip || !part.trim()) return part;
    let text = part;
    for (let j = 0; j < left.length; j++) {
      const w = left[j]; if (!w) continue;
      const re = new RegExp(`(^|[^\\p{L}\\p{N}>])(${w.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})(?![\\p{L}\\p{N}])`, "iu");
      const m = re.exec(text);
      if (!m || /<a\b[^>]*>[^<]*$/.test(text.slice(0, m.index + m[1].length))) continue;
      text = text.slice(0, m.index) + m[1] + `<a href="${w.href}">${m[2]}</a>` + text.slice(m.index + m[0].length);
      left[j] = null as any; linked++;
    }
    return text;
  }).join("");
  return { html: out, linked };
}

/** After every page exists: Spanish links on the Spanish pages, and the country guides and their index get links
 * to the glossary, the subject guides and the first mention of each local word (idea 395). */
export function finishKnowledge(root: string) {
  const has = (rel: string) => fs.existsSync(path.join(root, rel));
  const out = { pages: written, es_links: 0, guides_linked: 0, words_linked: 0 };
  const esHref = (h: string) => h.replace(/(<a\b[^>]*?\shref=")(\/[^"#?]*)([^"]*")/g, (m, a: string, p: string, z: string) => {
    if (p.startsWith("/es/") || p === "/es" || /\.[a-z0-9]{2,5}$/i.test(p)) return m;
    if (!has(p === "/" ? "es/index.html" : `es${p}/index.html`)) return m;
    out.es_links++; return `${a}/es${p === "/" ? "" : p}${z}`;
  });
  for (const rel of new Set(mineEs)) { const f = path.join(root, rel); if (fs.existsSync(f)) fs.writeFileSync(f, esHref(fs.readFileSync(f, "utf8"))); }

  for (const [lang, base] of [["en", ""], ["es", "es/"]] as [Lang, string][]) {
    const es = lang === "es"; const t = (a: string, b: string) => (es ? b : a);
    const pre = (p: string) => (es && has(`es${p}/index.html`) ? `/es${p}` : p);
    const inject = (rel: string, block: string, terms?: { word: string; href: string }[]) => {
      const f = path.join(root, rel); if (!fs.existsSync(f)) return;
      let h = fs.readFileSync(f, "utf8"); if (h.includes("data-kn-links")) return;
      const m = main(h); if (!m) return;
      let body = h.slice(m.a, m.b);
      if (terms?.length) { const r = linkTerms(body, terms); body = r.html; out.words_linked += r.linked; }
      const by = body.lastIndexOf('<p class="rhx-by"');
      body = by > 0 ? body.slice(0, by) + block + body.slice(by) : body + block;
      fs.writeFileSync(f, h.slice(0, m.a) + body + h.slice(m.b)); out.guides_linked++;
    };
    // the index of the country guides
    if (!es || has("es/guide/glossary/index.html"))
      inject(`${base}guide/index.html`, `<h2 data-kn-links>${t("Beyond the country guides", "Más allá de las guías por países")}</h2><ul><li><a href="${pre("/guide/buying")}">${t("Guides by subject: papers, surveys, payment, tax residency, renting out", "Guías por temas: papeles, inspecciones, pagos, residencia fiscal, alquiler")}</a></li><li><a href="${pre("/guide/questions")}">${t("Questions buyers ask, with short answers", "Preguntas de compradores, con respuesta corta")}</a></li><li><a href="${pre("/guide/glossary")}">${t("Property glossary by country: the local words, explained", "Glosario inmobiliario por países: las palabras locales, explicadas")}</a></li></ul>`);
    // each country guide
    const ccs = new Set([...GLOSSARIES.flatMap((g) => g.cc), ...TOPICS.flatMap((x) => x.cc || [])]);
    for (const cc of ccs) {
      const g = glossaryOf(cc); const topics = TOPICS.filter((x) => x.cc?.includes(cc)).slice(0, 6);
      if (es && !has(`es/guide/${cc}/index.html`)) continue;
      const block = `<h2 data-kn-links>${t("Words and questions for this country", "Palabras y preguntas de este país")}</h2><ul>`
        + (g ? `<li><a href="${pre(glossaryPath(g.slug))}">${es ? `Glosario: las palabras locales de ${g.name.es}, explicadas` : `Glossary: the local words of ${g.name.en}, explained`}</a></li>` : "")
        + topics.map((x) => `<li><a href="${pre(topicPath(x))}">${esc(x.h1[lang])}</a></li>`).join("") + `</ul>`;
      const terms = g ? g.terms.filter((x) => (x.tl || g.tl) !== "en" || !es).map((x) => ({ word: x.term, href: `${pre(glossaryPath(g.slug))}#${x.id}` })) : [];
      inject(`${base}guide/${cc}/index.html`, block, terms);
    }
  }
  return out;
}
