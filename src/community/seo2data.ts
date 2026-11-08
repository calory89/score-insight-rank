// Shared logic for the growth pages (src/community/seo2.tsx in the app, seo/prerender.ts for crawlers), so both
// say exactly the same thing:
//   /can-i-buy and /can-i-buy/<nationality>-in-<country>: who can buy where (rules in src/data/canbuy.json,
//     costs and taxes in src/data/destinations.json, steps in src/data/guides.json)
//   /buying-costs and /buying-costs/<country>: what you pay on top of the price
// Pure functions only: the data comes in as arguments (the prerender reads the JSON from disk, the app imports it).

// Spanish (8-nov-2026): the same pages in Spanish when the site is in Spanish. The texts live next to the English
// data in src/data/*-es.json (canbuy-es, destinations-es, guides-es); localize*() swaps them in and every function
// that builds a sentence takes a lang argument (English by default, so the prerender stays English).

type Row = Record<string, any>;
export type Lang = "en" | "es";
export type Status = "yes" | "conditions" | "restricted";
export type Rule = { s: Status; a: string };
/** adj / adj_pl: Spanish adjective ("estadounidense", "estadounidenses"), only in the Spanish data. */
export type Nationality = { label: string; noun: string; plural: string; home: string | null; bloc: "eu" | "eea" | "ch" | "other"; notes: string[]; adj?: string; adj_pl?: string };
export type CanBuyData = {
  _meta: { updated: string; note: string };
  nationalities: Record<string, Nationality>;
  schengen: string[];
  eu: string[];
  countries: Record<string, Partial<Record<string, Rule>> & { residency_other?: string }>;
};

export const UPDATED = "November 2026";
export const UPDATED_ES = "noviembre de 2026";
export const STATUS_LABEL: Record<Status, string> = { yes: "Yes", conditions: "Yes, with conditions", restricted: "Restricted" };
export const STATUS_LABEL_ES: Record<Status, string> = { yes: "Sí", conditions: "Sí, con condiciones", restricted: "Restringido" };
export const statusLabel = (s: Status, lang: Lang = "en") => (lang === "es" ? STATUS_LABEL_ES : STATUS_LABEL)[s];

// Names of the destinations that have cost data but no buying guide (the guides carry their own names).
export const EXTRA_NAMES: Record<string, string> = { bali: "Bali", lombok: "Lombok", albania: "Albania", montenegro: "Montenegro", georgia: "Georgia", "northern-cyprus": "Northern Cyprus", vietnam: "Vietnam" };
export const EXTRA_NAMES_ES: Record<string, string> = { bali: "Bali", lombok: "Lombok", albania: "Albania", montenegro: "Montenegro", georgia: "Georgia", "northern-cyprus": "Norte de Chipre", vietnam: "Vietnam" };
export const the = (n: string) => (/^(United |Netherlands$|Dominican Republic$|Czech Republic$|Philippines$)/.test(n) ? "the " + n : n);
/** Spanish country name as written after "en": "los Países Bajos", "el Reino Unido", "la República Dominicana". */
export const theEs = (n: string) => (/^(Países Bajos)$/.test(n) ? "los " + n : /^Reino Unido$/.test(n) ? "el " + n : n === "Norte de Chipre" ? "el norte de Chipre" : /^(República )/.test(n) ? "la " + n : n);
export const theL = (n: string, lang: Lang = "en") => (lang === "es" ? theEs(n) : the(n));
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** Spanish number with dots for thousands (always grouped, like the rest of the Spanish site) and a comma for decimals. */
export const numEs = (n: number | string) => { const [i, d] = String(n).split("."); return i.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + (d ? "," + d : ""); };
/** "7.5-14" -> "7,5-14" for Spanish. */
export const pctL = (p: unknown, lang: Lang = "en") => (lang === "es" ? String(p ?? "").replace(/(\d)\.(\d)/g, "$1,$2") : String(p ?? ""));
export const countryKey = (c?: string | null) => String(c || "").toLowerCase().trim().replace(/\s+/g, "-");
export const nameOf = (k: string, guides: Record<string, { name: string }>, lang: Lang = "en") => guides[k]?.name || (lang === "es" ? EXTRA_NAMES_ES : EXTRA_NAMES)[k] || "";

/** "7.5-14" → [7.5, 14]; "3" → [3, 3]; nothing usable → null. */
export function costRange(s?: string | number | null): [number, number] | null {
  const t = String(s ?? "");
  const m = t.match(/([\d.]+)\s*[-–]\s*([\d.]+)/) || t.match(/([\d.]+)/);
  if (!m) return null;
  const lo = Number(m[1]), hi = Number(m[2] || m[1]);
  return Number.isFinite(lo) && Number.isFinite(hi) && lo >= 0 ? [Math.min(lo, hi), Math.max(lo, hi)] : null;
}
/** Taxes and fees on top of the price, and the total, for a price and a cost range in %. */
export function buyingCosts(price: number, r: [number, number]) {
  const p = Math.max(0, Number(price) || 0);
  const lo = Math.round(p * r[0] / 100), hi = Math.round(p * r[1] / 100);
  return { lo, hi, totalLo: p + lo, totalHi: p + hi };
}
export const fmtMoney = (n: number, ccy = "EUR", lang: Lang = "en") => {
  const sym: Record<string, string> = { EUR: "€", USD: "US$", GBP: "£" };
  if (lang === "es") return `${numEs(Math.round(n))}\u00a0${sym[ccy] ?? ccy}`;
  return (sym[ccy] ?? ccy + " ") + Math.round(n).toLocaleString("en");
};

// ------------------------------------------------------------------------------------------- Spanish data
type CanBuyEs = { nationalities: Record<string, Partial<Nationality>>; countries: Record<string, Record<string, { a: string } | string>> };
/** The rules with the Spanish texts swapped in (status, blocs and lists stay the English data's). */
export function localizeCanBuy(cb: CanBuyData, es: CanBuyEs): CanBuyData {
  const nationalities: Record<string, Nationality> = {};
  for (const [k, n] of Object.entries(cb.nationalities)) { const e = es.nationalities?.[k] || {}; nationalities[k] = { ...n, ...e, home: n.home, bloc: n.bloc, notes: e.notes || n.notes }; }
  const countries: CanBuyData["countries"] = {};
  for (const [k, c] of Object.entries(cb.countries)) {
    const e = es.countries?.[k] || {}; const o: Record<string, unknown> = {};
    for (const [g, r] of Object.entries(c)) {
      const x = e[g];
      o[g] = typeof r === "string" ? (typeof x === "string" ? x : r) : r ? { ...r, a: (x && typeof x === "object" && x.a) || r.a } : r;
    }
    countries[k] = o as CanBuyData["countries"][string];
  }
  return { ...cb, nationalities, countries };
}
/** destinations.json / guides.json with the Spanish legal and tax sentences (and names, step titles) swapped in. */
export function localizeRows<T extends Row>(rows: Record<string, T>, es: Record<string, Row>): Record<string, T> {
  const out: Record<string, T> = {};
  for (const [k, v] of Object.entries(rows)) {
    const e = es?.[k];
    if (!e || k === "_meta" || !v || typeof v !== "object") { out[k] = v; continue; }
    const o: Row = { ...v };
    for (const [f, x] of Object.entries(e)) {
      if (f === "steps" && Array.isArray(x) && Array.isArray(v.steps)) o.steps = v.steps.map((st: [string, string], i: number) => [x[i] ?? st[0], (e.step_texts as string[] | undefined)?.[i] ?? st[1]]);
      else if (f === "step_texts") continue; // folded into steps above (8-nov-2026)
      else if (x != null && x !== "") o[f] = x;
    }
    out[k] = o as T;
  }
  return out;
}

/** Countries that get buying-cost pages: cost data with a percentage and a name. */
export const costCountries = (dest: Record<string, Row>, guides: Record<string, { name: string }>, lang: Lang = "en") =>
  Object.keys(dest).filter((k) => k !== "_meta" && nameOf(k, guides, lang) && costRange(dest[k]?.purchase_costs_pct)).sort((a, b) => nameOf(a, guides, lang).localeCompare(nameOf(b, guides, lang), lang));

/** Countries that get can-I-buy pages: a buying guide, a destinations entry and a rule in canbuy.json. */
export const canBuyCountries = (cb: CanBuyData, dest: Record<string, Row>, guides: Record<string, { name: string }>) =>
  Object.keys(guides).filter((k) => dest[k] && cb.countries[k]).sort((a, b) => guides[a].name.localeCompare(guides[b].name));

export const canBuySlug = (nat: string, country: string) => `${nat}-in-${country}`;
/** Every nationality × country page, without a nationality's own country. */
export function canBuyPairs(cb: CanBuyData, dest: Record<string, Row>, guides: Record<string, { name: string }>) {
  const cs = canBuyCountries(cb, dest, guides);
  const out: { nat: string; country: string; slug: string }[] = [];
  for (const nat of Object.keys(cb.nationalities)) for (const c of cs) if (cb.nationalities[nat].home !== c) out.push({ nat, country: c, slug: canBuySlug(nat, c) });
  return out;
}
export function parseCanBuySlug(slug: string, cb: CanBuyData): { nat: string; country: string } | null {
  const m = String(slug || "").toLowerCase().match(/^([a-z]+)-in-([a-z-]+)$/);
  if (!m || !cb.nationalities[m[1]] || !cb.countries[m[2]] || cb.nationalities[m[1]].home === m[2]) return null;
  return { nat: m[1], country: m[2] };
}

/** The rule that applies: nationality override, then the bloc (EEA falls back to EU, Swiss to non-EU), then "all". */
export function ruleFor(cb: CanBuyData, nat: string, country: string): Rule | null {
  const c = cb.countries[country]; const n = cb.nationalities[nat];
  if (!c || !n) return null;
  const pick = (k: string) => (c as Record<string, unknown>)[k] as Rule | undefined;
  const chain = [nat, n.bloc, n.bloc === "eea" ? "eu" : n.bloc === "ch" ? "other" : "", "all"].filter(Boolean);
  for (const k of chain) { const r = pick(k); if (r && r.s && r.a) return r; }
  return null;
}

/** Can this nationality live in the country (free movement), and what the visitor rules are otherwise. */
export function residencyFor(cb: CanBuyData, nat: string, country: string, countryName: string, lang: Lang = "en"): string[] {
  const n = cb.nationalities[nat]; const c = cb.countries[country];
  if (!n || !c) return [];
  const free = n.bloc !== "other";
  const inEu = cb.eu.includes(country);
  const efta = country === "norway" || country === "switzerland";
  const out: string[] = [];
  if (lang === "es") {
    const inC = theEs(countryName);
    if (free && (inEu || efta)) {
      out.push(n.bloc === "ch" && inEu
        ? `Gracias al acuerdo de libre circulación entre Suiza y la UE puedes vivir en ${inC}; para estancias de más de tres meses normalmente tienes que registrarte ante las autoridades locales.`
        : `Como ciudadano ${n.bloc === "eu" ? "de la UE" : n.bloc === "eea" ? "del EEE" : "suizo"} tienes derecho a vivir en ${inC}; para estancias de más de tres meses normalmente tienes que registrarte ante las autoridades locales. Para eso no hace falta comprar una vivienda, y comprarla no cambia nada.`);
    } else if (nat === "irish" && country === "united-kingdom") {
      out.push("Como ciudadano irlandés puedes vivir y trabajar en el Reino Unido gracias a la Zona Común de Viaje.");
    } else {
      if (c.residency_other) out.push(c.residency_other);
      if (cb.schengen.includes(country)) out.push(`${cap(inC)} ${/^los /.test(inC) ? "están" : "está"} en el espacio Schengen: con pasaporte ${n.adj || n.label.toLowerCase()} normalmente puedes estar hasta 90 días de cada 180 en toda la zona sin visado.`);
    }
    return out;
  }
  if (free && (inEu || efta)) {
    out.push(n.bloc === "ch" && inEu
      ? `Under the Swiss-EU free movement agreement you can live in ${the(countryName)}; stays over three months usually need registration with the local authorities.`
      : `As ${n.bloc === "eu" ? "an EU" : n.bloc === "eea" ? "an EEA" : "a Swiss"} citizen you have the right to live in ${the(countryName)}; stays over three months usually need registration with the local authorities. Buying a home is not needed for that, and does not change it.`);
  } else if (nat === "irish" && country === "united-kingdom") {
    out.push("As an Irish citizen you can live and work in the UK under the Common Travel Area.");
  } else {
    if (c.residency_other) out.push(c.residency_other);
    if (cb.schengen.includes(country)) out.push(`${the(countryName).replace(/^the/, "The")} is in the Schengen area: with ${/^[AEIOU]/.test(n.label) ? "an" : "a"} ${n.label} passport you can usually stay up to 90 days in any 180 days across the whole area without a visa.`);
  }
  return out;
}

/** Questions and answers for one page, all from the data (FAQPage JSON-LD and the visible FAQ use the same list). */
export function canBuyFaq(cb: CanBuyData, nat: string, country: string, d: { dest: Row | null; guide: Row | null; name: string; homes: Row[] }, lang: Lang = "en"): [string, string][] {
  const n = cb.nationalities[nat]; const r = ruleFor(cb, nat, country);
  if (!n || !r) return [];
  if (lang === "es") return canBuyFaqEs(cb, nat, country, d);
  const inC = the(d.name);
  const out: [string, string][] = [[`Can ${n.noun} buy property in ${inC}?`, fill(r.a, n)]];
  const dest = d.dest || {};
  const rg = costRange(dest.purchase_costs_pct);
  if (rg) {
    const ex = buyingCosts(150000, rg);
    out.push([`How much are the buying costs in ${inC}?`, `About ${dest.purchase_costs_pct}% on top of the price, so ${fmtMoney(ex.lo)}${ex.hi !== ex.lo ? ` to ${fmtMoney(ex.hi)}` : ""} on a €150,000 home${dest.purchase_costs_breakdown ? `. ${String(dest.purchase_costs_breakdown).replace(/\.$/, "")}.` : "."}`]);
  }
  if (dest.annual_property_tax) out.push([`Is there a yearly property tax in ${inC}?`, String(dest.annual_property_tax)]);
  if (dest.rental_income_tax) out.push([`What tax do I pay on rent in ${inC} if I live abroad?`, String(dest.rental_income_tax)]);
  const res = residencyFor(cb, nat, country, d.name);
  if (res.length) out.push([`Does buying a home in ${inC} let me live there as ${n.noun}?`, res.join(" ")]);
  if (d.homes.length) {
    const pr = d.homes.map((h) => Number(h.price_eur) || 0).filter((x) => x > 0);
    if (pr.length) out.push([`How much does a home in ${inC} cost on RealHunt?`, `The ${d.homes.length} homes in ${inC} on RealHunt start at ${fmtMoney(Math.min(...pr))}, each checked by a person and scored from 70 to 98.`]);
  }
  return out;
}
function canBuyFaqEs(cb: CanBuyData, nat: string, country: string, d: { dest: Row | null; guide: Row | null; name: string; homes: Row[] }): [string, string][] {
  const n = cb.nationalities[nat]; const r = ruleFor(cb, nat, country)!;
  const inC = theEs(d.name);
  const out: [string, string][] = [[`¿Puede ${n.noun} comprar una vivienda en ${inC}?`, fill(r.a, n)]];
  const dest = d.dest || {};
  const rg = costRange(dest.purchase_costs_pct);
  if (rg) {
    const ex = buyingCosts(150000, rg);
    out.push([`¿Cuánto cuestan los gastos de compra en ${inC}?`, `Alrededor de un ${pctL(dest.purchase_costs_pct, "es")}% además del precio, es decir, ${fmtMoney(ex.lo, "EUR", "es")}${ex.hi !== ex.lo ? ` a ${fmtMoney(ex.hi, "EUR", "es")}` : ""} en una vivienda de 150.000\u00a0€${dest.purchase_costs_breakdown ? `. ${String(dest.purchase_costs_breakdown).replace(/\.$/, "")}.` : "."}`]);
  }
  if (dest.annual_property_tax) out.push([`¿Hay un impuesto anual sobre la propiedad en ${inC}?`, String(dest.annual_property_tax)]);
  if (dest.rental_income_tax) out.push([`¿Qué impuesto pago por el alquiler en ${inC} si vivo fuera?`, String(dest.rental_income_tax)]);
  const res = residencyFor(cb, nat, country, d.name, "es");
  if (res.length) out.push([`¿Comprar una vivienda en ${inC} me permite vivir allí siendo ${n.adj || n.label.toLowerCase()}?`, res.join(" ")]);
  if (d.homes.length) {
    const pr = d.homes.map((h) => Number(h.price_eur) || 0).filter((x) => x > 0);
    if (pr.length) out.push([`¿Cuánto cuesta una vivienda en ${inC} en RealHunt?`, d.homes.length === 1
      ? `La única vivienda en ${inC} en RealHunt cuesta ${fmtMoney(Math.min(...pr), "EUR", "es")}; como todas, la ha revisado una persona y tiene una nota de 70 a 98.`
      : `Las ${d.homes.length} viviendas en ${inC} en RealHunt empiezan en ${fmtMoney(Math.min(...pr), "EUR", "es")}; cada una la ha revisado una persona y tiene una nota de 70 a 98.`]);
  }
  return out;
}
/** Fills {plural}; a placeholder that starts a sentence gets a capital ("Los estadounidenses"; English is already capitalised). */
export const fill = (s: string, n: Nationality) => s.replace(/([.!?]\s+|)\{plural\}/g, (_m, pre: string, at: number) => (pre || at === 0 ? pre + cap(n.plural) : n.plural));

/** Page title and description, shared by the app and the prerender. */
export function canBuyMeta(cb: CanBuyData, nat: string, country: string, name: string, lang: Lang = "en") {
  const n = cb.nationalities[nat]; const r = ruleFor(cb, nat, country)!;
  if (lang === "es") {
    const qe = `¿Puede ${n.noun} comprar una vivienda en ${theEs(name)}?`;
    return { h1: qe, title: `${qe} ${STATUS_LABEL_ES[r.s]} · Normas para compradores ${n.adj_pl || n.label} (${UPDATED_ES}) · RealHunt`, desc: fill(r.a, n).replace(/\s+/g, " ").slice(0, 300) };
  }
  const q = `Can ${n.noun} buy property in ${the(name)}?`;
  return {
    h1: q,
    title: `${q} ${STATUS_LABEL[r.s]} · Rules for ${n.label} buyers (${UPDATED}) · RealHunt`,
    desc: fill(r.a, n).replace(/\s+/g, " ").slice(0, 300),
  };
}

/** Costs on top of the price, as lines for the calculator and the worked examples. */
export function costLines(price: number, dest: Row, ccy = "EUR", lang: Lang = "en") {
  const r = costRange(dest?.purchase_costs_pct);
  if (!r) return null;
  const c = buyingCosts(price, r);
  const same = c.lo === c.hi;
  const to = lang === "es" ? " a " : " to ";
  const m = (v: number) => fmtMoney(v, ccy, lang);
  const p = (v: number) => (lang === "es" ? numEs(v) : String(v)) + "%";
  return {
    ...c, r,
    fees: same ? m(c.lo) : `${m(c.lo)}${to}${m(c.hi)}`,
    total: same ? m(c.totalLo) : `${m(c.totalLo)}${to}${m(c.totalHi)}`,
    pct: same ? p(r[0]) : `${p(r[0])}${to}${p(r[1])}`,
  };
}
