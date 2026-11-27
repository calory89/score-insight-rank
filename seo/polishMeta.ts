// Titles and descriptions for search results (14-nov-2026). Pure functions, used by seo/polish.ts on every page
// after seo/prerender.ts and seo/es.ts have written it, so they also apply to pages added later.
//
// Title: what and where first, the number or price next, the brand last and only when it fits; 60 characters where
// the words allow it. Description: 120 to 155 characters, whole sentences, different on every page.
// Only <title> and <meta name="description"> change: the share-card texts (og:, twitter:) keep the long versions.
export type Lang = "en" | "es";
export type Kind = "home" | "deal" | "country" | "band" | "type" | "region" | "place" | "costs" | "guide" | "calc" | "canbuy" | "pair" | "cheap" | "blog" | "source" | "topdest" | "project" | "hub" | "page";

export const TITLE_MAX = 60;
export const DESC_MIN = 120;
export const DESC_MAX = 155;
const BRAND = " · RealHunt";

export const stripBrand = (t: string) => t.replace(/\s*[·|]\s*RealHunt\s*$/, "").trim();

// Shorter wordings of the templates in seo/prerender.ts (and their Spanish in seo/es-templates.json), longest first.
// A title that matches no rule still gets the generic steps: brand dropped, trailing segments dropped.
const TITLE_RULES: Record<Lang, [RegExp, string[]][]> = {
  en: [
    [/^Buying costs calculator for (.+): taxes and fees on top of the price$/, ["Buying costs in $1: taxes and fees calculator", "Buying costs in $1: calculator"]],
    [/^Buying costs calculator: taxes and fees in (\d+) countries$/, ["Buying costs calculator: taxes and fees in $1 countries"]],
    [/^Buying a home in (.+): real costs, taxes and rental yield$/, ["Buying a home in $1: costs, taxes and rental yield", "Buying a home in $1: costs and taxes"]],
    [/^(.+) vs (.+): cheap homes, prices and buying costs compared$/, ["$1 vs $2: home prices and buying costs compared", "$1 vs $2: home prices and buying costs", "$1 vs $2: home prices compared"]],
    [/^How to buy a home in (.+) as a foreigner: steps, taxes and costs$/, ["How to buy a home in $1 as a foreigner: steps and costs", "How to buy a home in $1 as a foreigner"]],
    [/^Can I buy property abroad\? Rules by nationality for (\d+) countries(?: \(.+\))?$/, ["Can I buy property abroad? Rules by nationality"]],
    [/^Best places to live with good weather all year, and good homes there$/, ["Best places to live with good weather all year, with homes"]],
    [/^RealHunt Score: see the real score of any home · Free Chrome extension$/, ["RealHunt Score: free Chrome extension that scores any home"]],
    [/^Top 100 new builds by destination: (.+)$/, ["Top 100 new builds in $1"]],
  ],
  es: [
    [/^Calculadora de gastos de compra para (.+): impuestos y tasas además del precio$/, ["Gastos de compra en $1: calculadora de impuestos y tasas", "Gastos de compra en $1: calculadora"]],
    [/^Calculadora de gastos de compra: impuestos y tasas en (\d+) países$/, ["Gastos de compra: calculadora de impuestos en $1 países"]],
    [/^Comprar casa en (.+): costes reales, impuestos y rentabilidad del alquiler$/, ["Comprar casa en $1: costes, impuestos y rentabilidad", "Comprar casa en $1: costes e impuestos"]],
    [/^(.+) frente a (.+): casas baratas, precios y gastos de compra comparados$/, ["$1 frente a $2: precios y gastos de compra comparados", "$1 frente a $2: precios y gastos de compra", "$1 frente a $2: precios comparados"]],
    [/^Cómo comprar una casa en (.+) siendo extranjero: pasos, impuestos y gastos$/, ["Cómo comprar casa en $1 siendo extranjero: pasos y gastos", "Cómo comprar casa en $1 siendo extranjero"]],
    [/^¿Puedo comprar una vivienda en el extranjero\? Normas por nacionalidad para (\d+) países(?: \(.+\))?$/, ["¿Puedo comprar casa en el extranjero? Normas en $1 países"]],
    [/^(¿Puede .+?) comprar una vivienda en (.+)$/, ["$1 comprar casa en $2"]],
    [/^Lo que cuesta de verdad comprar una casa barata en el extranjero$/, ["Lo que cuesta de verdad comprar una casa en el extranjero"]],
    [/^De dónde vienen las casas de RealHunt: (\d+) portales inmobiliarios$/, ["De dónde vienen las casas de RealHunt: $1 portales"]],
    [/^Cómo funciona la nota de RealHunt: 11 subnotas, de 70 a 98$/, ["Cómo funciona la nota de RealHunt: 11 subnotas, de 70 a 98"]],
  ],
};

/** Every acceptable wording of a title, the fullest first. */
export function titleCandidates(title: string, lang: Lang, kind: Kind): string[] {
  let core = stripBrand(title);
  // A home: "€85,000 · 2-bedroom flat with a Lake Como view terrace" -> what first, price after it.
  if (kind === "deal") {
    const m = lang === "es" ? /^([\d.]+ €) · (.+)$/.exec(core) : /^(€[\d,]+) · (.+)$/.exec(core);
    if (m) core = `${m[2]} · ${m[1]}`;
  }
  // the wordings of the title itself, fullest first...
  const base = [core];
  if (kind !== "deal") {
    // "... (2026)" / "(November 2026)": a date in brackets at the end goes before any word does
    const noDate = core.replace(/\s*\((?:[A-Za-zé]+ (?:de )?)?20\d\d(?:-\d\d)?\)$/, "");
    if (noDate !== core && noDate.length >= 20) base.push(noDate);
    // "Homes under €80,000 in Italy (42, from €12,000)": first the price goes, then the count
    const cnt = /^(.+?)\s*\((\d+)(?:,\s*[^)]+)?\)$/.exec(core);
    if (cnt) { if (`${cnt[1]} (${cnt[2]})` !== core) base.push(`${cnt[1]} (${cnt[2]})`); if (cnt[1].length >= 20) base.push(cnt[1]); }
    // "Can a Swiss citizen buy property in Spain? Yes · Rules for Swiss buyers (November 2026)" -> first segment
    const segs = core.split(" · ");
    for (let n = segs.length - 1; n >= 1; n--) { const x = segs.slice(0, n).join(" · "); if (x.length >= 20) base.push(x); }
  }
  // ...then the shorter wording of each one that a rule knows
  const out = [...base];
  for (const x of base) for (const [re, alts] of TITLE_RULES[lang]) if (re.test(x)) for (const alt of alts) out.push(x.replace(re, alt));
  // ...and last, the same title with filler words taken out one step at a time (each step keeps the earlier ones):
  // "Viviendas baratas con jardín en venta en Italia por menos de 100.000 €" -> "Casas con jardín en Italia por menos de 100.000 €"
  for (const x of [...out]) { let y = x; for (const [re, to] of SQUEEZE[lang]) { const z = y.replace(re, to as any); if (z !== y) { y = z; out.push(y); } } }
  return [...new Set(out)];
}

// Words a search result can do without, in the order they go. Only wording: the place, the price and the answer stay.
const SQUEEZE: Record<Lang, [RegExp, string | ((m: string, w: string) => string)][]> = {
  en: [
    [/ for sale(?= in | under |$| \()/, ""],
    [/ citizen buy property in /, " citizen buy a home in "],
    [/ citizen buy a home in /, " citizen buy in "],
    [/^Cheap ([a-z])/, "$1"],
    [/^Cheap (\d)/, "$1"],
    [/^(houses|homes|flats|apartments|villas|cottages|farmhouses) /, (_m: string, w: string) => w[0].toUpperCase() + w.slice(1) + " "],
  ],
  es: [
    [/ en venta(?= en | por |$| \()/, ""],
    [/^Viviendas /, "Casas "],
    [/ comprar casa en /, " comprar en "],
    [/, con condiciones$/, " con condiciones"],
    [/^(Casas|Pisos)( de pueblo| de piedra)? (baratas|baratos) /, "$1$2 "],
  ],
};

/** The title to use: the fullest wording that fits in TITLE_MAX and no other page has, with the brand when it fits. */
export function pickTitle(title: string, lang: Lang, kind: Kind, taken: Set<string> = new Set()): string {
  const cands = titleCandidates(title, lang, kind);
  for (const c of cands) {
    if (!/RealHunt/.test(c) && (c + BRAND).length <= TITLE_MAX && !taken.has(c + BRAND)) return c + BRAND;
    if (c.length <= TITLE_MAX && !taken.has(c)) return c;
  }
  // Nothing fits: the shortest wording that is still unique, without the brand. For a home that is its full title
  // and price, which says more than a title cut in the middle.
  const free = cands.filter((c) => !taken.has(c)).sort((a, b) => a.length - b.length);
  return free[0] ?? title;
}

// ------------------------------------------------------------------------------------------ descriptions
const SENT = /(?<=[.!?…])\s+(?=[A-ZÀ-Ý¿¡0-9€])/;
const ends = (s: string) => /[.!?…)]$/.test(s);

/** Whole sentences up to `max` characters; when even the first is longer, a cut at a word with an ellipsis. */
export function fitSentences(text: string, max = DESC_MAX): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max && ends(t)) return t;
  const parts = t.split(SENT);
  // a text cut off in the middle of a sentence (an earlier slice): its last piece is not a sentence
  if (!ends(parts[parts.length - 1])) parts.pop();
  let out = "";
  for (const p of parts) { const next = out ? out + " " + p : p; if (next.length > max) break; out = next; }
  if (out && out.length >= Math.min(DESC_MIN - 30, t.length * 0.6)) return out;
  const cut = t.length <= max - 1 ? t : t.slice(0, max - 1);
  const at = cut.lastIndexOf(" ");
  return (t.length > max - 1 && at > max * 0.6 ? cut.slice(0, at) : cut).replace(/[\s,;:·(]+$/, "") + "…";
}

const DESC_RULES: Record<Lang, [RegExp, string][]> = {
  en: [
    [/^What you pay on top of the price when you buy a home in (.+?): about /, "Buying costs in $1: about "],
    [/^On RealHunt, homes in /, "Homes in "],
  ],
  es: [
    [/^Lo que pagas además del precio al comprar una casa en (.+?): alrededor de /, "Gastos de compra en $1: alrededor de "],
    [/^En RealHunt, las casas en /, "Las casas en "],
  ],
};
// A closing sentence for descriptions that end up short. Each one is true of every page of its kind.
const PADS: Record<Lang, Partial<Record<Kind, string[]>>> = {
  en: {
    band: ["New homes every day."], region: ["New homes every day."], type: ["New homes every day."], place: ["New homes every day."],
    cheap: ["Each one scored from 70 to 98 and ranked best first.", "Scored from 70 to 98."],
    source: ["Each one links to its original listing.", "Each links to its original listing."],
    costs: ["General information, not tax advice.", "Not tax advice."],
    pair: ["Prices, taxes and rules for foreign buyers, compared.", "Taxes and rules compared."],
    canbuy: ["Plus buying costs, yearly taxes and the steps to buy.", "Plus costs, taxes and steps."],
    guide: ["General information, not legal advice."],
    deal: ["Checked by a person, with photos and a link to the original listing.", "Checked by a person."],
    blog: ["From RealHunt, where every home is checked by a person.", "By RealHunt."],
    country: ["Each one checked by a person, with photos and a link to the original listing.", "Each one checked by a person, with photos.", "Checked by a person."],
    hub: ["RealHunt ranks cheap homes around the world, each one checked by a person.", "Cheap homes worldwide, each checked by a person.", "Every home checked by a person."],
    page: ["RealHunt ranks cheap homes around the world, each one checked by a person.", "Cheap homes worldwide, each checked by a person.", "Every home checked by a person."],
  },
  es: {
    band: ["Casas nuevas cada día."], region: ["Casas nuevas cada día."], type: ["Casas nuevas cada día."], place: ["Casas nuevas cada día."],
    cheap: ["Cada una con nota de 70 a 98, ordenadas de mejor a peor.", "Con nota de 70 a 98."],
    source: ["Cada una enlaza con su anuncio original.", "Con enlace al anuncio original."],
    costs: ["Información general, no asesoramiento fiscal.", "No es asesoramiento fiscal."],
    pair: ["Precios, impuestos y normas para extranjeros, comparados.", "Impuestos y normas, comparados."],
    canbuy: ["Además, gastos de compra, impuestos anuales y pasos para comprar.", "Con gastos, impuestos y pasos."],
    guide: ["Información general, no asesoramiento jurídico."],
    deal: ["Revisada por una persona, con fotos y enlace al anuncio original.", "Revisada por una persona."],
    blog: ["De RealHunt, donde cada casa la revisa una persona.", "Por RealHunt."],
    country: ["Cada una revisada por una persona, con fotos y enlace al anuncio original.", "Cada una revisada por una persona, con fotos.", "Revisadas por una persona."],
    hub: ["RealHunt clasifica casas baratas de todo el mundo, cada una revisada por una persona.", "Casas baratas de todo el mundo, revisadas por una persona.", "Cada casa, revisada por una persona."],
    page: ["RealHunt clasifica casas baratas de todo el mundo, cada una revisada por una persona.", "Casas baratas de todo el mundo, revisadas por una persona.", "Cada casa, revisada por una persona."],
  },
};

/** "Can a Swiss citizen buy property in Spain? Yes · Rules for Swiss buyers (...)" -> "Swiss buyers in Spain". The 13
 * nationality pages of a country share the country's rule as their description; this puts who is asking first. */
export function canBuyLead(title: string, lang: Lang): string | null {
  if (lang === "es") {
    const who = /Normas para (compradores [^(·]+?)\s*(?:\(|·|$)/.exec(title), where = /comprar una vivienda en (.+?)\?/.exec(title);
    return who && where ? `${who[1][0].toUpperCase()}${who[1].slice(1)} en ${where[1]}` : null;
  }
  const who = /Rules for (.+? buyers)\s*(?:\(|·|$)/.exec(title), where = /buy property in (.+?)\?/.exec(title);
  return who && where ? `${who[1]} in ${where[1]}` : null;
}

export type DescCtx = { lang: Lang; kind: Kind; title: string; facts?: string[] };
/** The description to use for a page. `facts`: for a home, short sentences from its data (size, bedrooms, score). */
export function polishDesc(desc: string, { lang, kind, title, facts }: DescCtx): string {
  let d = String(desc || "").replace(/\s+/g, " ").trim();
  if (!d) return d;
  for (const [re, to] of DESC_RULES[lang]) d = d.replace(re, to);
  if (kind === "canbuy") { const lead = canBuyLead(title, lang); if (lead && !d.startsWith(lead)) d = `${lead}: ${d}`; }
  if (kind === "deal" && facts?.length) {
    // the closing sentence every home shares gives way to what this home is
    d = d.replace(/\s*Scored and ranked on RealHunt: the best homes in every country\.$/, "").replace(/\s*Con nota y puesto en RealHunt: las mejores casas de cada país\.$/, "");
  }
  // a short text from the data that simply has no full stop is not a text that was cut
  if (!ends(d) && d.length < DESC_MAX - 3) d += ".";
  d = fitSentences(d);
  // a home: its facts first (score, then size when the text does not give it already), then the closing sentence
  const own = kind === "deal" ? (facts || []).filter((f) => !d.includes(f.replace(/\.$/, "").split(", ")[0])) : [];
  for (const p of own) if (!d.endsWith("…") && (d + " " + p).length <= DESC_MAX) d = d + " " + p;
  for (const p of PADS[lang][kind] || []) {
    if (d.length >= DESC_MIN) break;
    if (d.endsWith("…") || d.includes(p)) continue;
    if ((d + " " + p).length <= DESC_MAX) d = d + " " + p;
  }
  return d;
}
