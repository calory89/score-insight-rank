// Two short lines for every home page (20-nov-2026, ideas 48 and 57 of the list of 100):
//   scoreLine()     the grade in one sentence, from the home's own sub-scores: where it is strong and where it is weak.
//   glossaryLine()  the local words a buyer meets in listings from the home's country, linked to the glossary
//                   (seo/knowledge), each with its language so a reader and a crawler know it is not English.
// Pure functions of the snapshot row: the page (seo/prerender.ts) and /data/homes.jsonl (seo/reach/more.ts) agree.
import { glossaryOf, glossaryPath } from "./knowledge/build";

const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Each sub-score as a noun phrase, in English and Spanish. "interest" (views and saves) and "photos" (how complete the
 * advert is) are left out: they describe the advert and its visitors, not the home. */
const NOUN: Record<string, [string, string]> = {
  price: ["price", "precio"],
  value: ["price per m²", "precio por m²"],
  space: ["size", "tamaño"],
  condition: ["move-in condition", "estado para entrar a vivir"],
  extras: ["extras", "extras"],
  water: ["nearness to the sea or a lake", "cercanía al mar o a un lago"],
  weather: ["weather", "clima"],
  access: ["airport access", "acceso al aeropuerto"],
  costs: ["buying costs", "gastos de compra"],
};
export const STRONG = 70, WEAK = 40;

/** "Score 86/98: strong on price and size, weak on airport access." Empty when the home has no grade. */
export function scoreLine(r: { nota?: number | null; dims?: Record<string, number | null> | null }, lang: "en" | "es" = "en"): string {
  if (r?.nota == null) return "";
  const es = lang === "es";
  const ds = Object.entries(r.dims || {}).filter(([k, v]) => NOUN[k] && typeof v === "number" && Number.isFinite(v)) as [string, number][];
  const head = es ? `Nota ${r.nota}/98` : `Score ${r.nota}/98`;
  if (ds.length < 3) return head + ".";
  const byHigh = ds.slice().sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const strong = byHigh.filter(([, v]) => v >= STRONG).slice(0, 2);
  const low = byHigh[byHigh.length - 1];
  const weak = low && low[1] < WEAK && !strong.some(([k]) => k === low[0]) ? low : null;
  const n = (k: string) => NOUN[k][es ? 1 : 0];
  const and = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs[0]} ${es ? (/^(i|hi)/i.test(xs[1]) ? "e" : "y") : "and"} ${xs[1]}`);
  const parts: string[] = [];
  if (strong.length) parts.push(es ? `destaca en ${and(strong.map(([k]) => n(k)))}` : `strong on ${and(strong.map(([k]) => n(k)))}`);
  else parts.push(es ? "ninguna nota parcial destaca" : "no sub-score stands out");
  if (weak) parts.push(es ? `flojea en ${n(weak[0])}` : `weak on ${n(weak[0])}`);
  return `${head}: ${parts.join(es ? "; " : ", ")}.`;
}

/** The glossary words for the home's country, as one paragraph with links; "" when the country has no glossary. */
export function glossaryLine(cc: string, lang: "en" | "es" = "en", max = 5, noEnglishTerms = false): string {
  const g = cc ? glossaryOf(cc) : undefined;
  if (!g) return "";
  const es = lang === "es";
  // a Spanish page names no English word (language gate); an English page may name every local word
  const terms = g.terms.filter((x) => !(es || noEnglishTerms) || (x.tl || g.tl) !== "en").slice(0, max);
  if (!terms.length) return "";
  const base = (es ? "/es" : "") + glossaryPath(g.slug);
  const links = terms.map((x) => `<a href="${base}#${esc(x.id)}" lang="${esc(x.tl || g.tl)}">${esc(x.term)}</a>`).join(", ");
  return es
    ? `<p data-rh-gloss>Palabras que verás en los anuncios de ${esc(g.name.es)}: ${links}. <a href="${base}">Glosario de ${esc(g.name.es)}, explicado</a>.</p>`
    : `<p data-rh-gloss>Words you will meet in listings from ${esc(g.name.en)}: ${links}. <a href="${base}">The glossary for ${esc(g.name.en)}, explained</a>.</p>`;
}

/** /sources/<portal>: how to read that portal's adverts, from what we hold (idea 60): the local words of its main
 * country (glossary) and what our nightly check gets when it opens its adverts. Plain English (the page is English). */
export function sourceNotes(dom: string, homes: { country?: string | null; src_last?: string | null; price_eur?: number; sqm?: number | null; bedrooms?: number | null }[]): string {
  if (!homes.length) return "";
  const cnt = new Map<string, number>(); for (const h of homes) if (h.country) cnt.set(h.country, (cnt.get(h.country) || 0) + 1);
  const main = [...cnt].sort((a, b) => b[1] - a[1])[0]?.[0] || "";
  const cc = main.toLowerCase().trim().replace(/\s+/g, " ").replace(/ /g, "-");
  const read = { ok: 0, gone: 0, blocked: 0, error: 0 } as Record<string, number>;
  let none = 0; for (const h of homes) { const v = String(h.src_last || ""); if (v in read) read[v]++; else none++; }
  const n = homes.length, sized = homes.filter((h) => Number(h.sqm) > 0).length, beds = homes.filter((h) => Number(h.bedrooms) > 0).length;
  const check = read.blocked + read.error > read.ok
    ? `${esc(dom)} often stops our nightly check: the last reading of ${read.blocked + read.error} of these ${n} adverts was blocked or unanswered, so a person checks them by hand and some carry a notice that we could not confirm them. Ask the agent if the home is still for sale before you plan a visit.`
    : `Our nightly check reads ${esc(dom)} adverts: the last reading of ${read.ok} of these ${n} adverts found them online${read.gone ? `, and ${read.gone} found the advert removed` : ""}.`;
  // English glossary words (Mexico and the United States) are left out: the Spanish twin of this page reads it too
  const g = glossaryLine(cc, "en", 5, true);
  return `<h2>How to read ${esc(dom)} adverts</h2><ul>`
    + `<li>Prices on RealHunt are the asking price of the advert, converted to euros when the advert is in another currency. Taxes and fees come on top: see the <a href="/costs">buying costs by country</a>.</li>`
    + `<li>${sized} of these ${n} adverts give the size and ${beds} the number of bedrooms. Sizes are the ones the advert states; how floor area is measured differs from country to country.</li>`
    + `<li>${check} <a href="/how-we-check-homes">How we check</a>.</li></ul>`
    + (g || "");
}
