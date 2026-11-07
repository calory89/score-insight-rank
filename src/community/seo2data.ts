// Shared logic for the growth pages (src/community/seo2.tsx in the app, seo/prerender.ts for crawlers), so both
// say exactly the same thing:
//   /can-i-buy and /can-i-buy/<nationality>-in-<country>: who can buy where (rules in src/data/canbuy.json,
//     costs and taxes in src/data/destinations.json, steps in src/data/guides.json)
//   /buying-costs and /buying-costs/<country>: what you pay on top of the price
// Pure functions only: the data comes in as arguments (the prerender reads the JSON from disk, the app imports it).

type Row = Record<string, any>;
export type Status = "yes" | "conditions" | "restricted";
export type Rule = { s: Status; a: string };
export type Nationality = { label: string; noun: string; plural: string; home: string | null; bloc: "eu" | "eea" | "ch" | "other"; notes: string[] };
export type CanBuyData = {
  _meta: { updated: string; note: string };
  nationalities: Record<string, Nationality>;
  schengen: string[];
  eu: string[];
  countries: Record<string, Partial<Record<string, Rule>> & { residency_other?: string }>;
};

export const UPDATED = "November 2026";
export const STATUS_LABEL: Record<Status, string> = { yes: "Yes", conditions: "Yes, with conditions", restricted: "Restricted" };

// Names of the destinations that have cost data but no buying guide (the guides carry their own names).
export const EXTRA_NAMES: Record<string, string> = { bali: "Bali", lombok: "Lombok", albania: "Albania", montenegro: "Montenegro", georgia: "Georgia", "northern-cyprus": "Northern Cyprus", vietnam: "Vietnam" };
export const the = (n: string) => (/^(United |Netherlands$|Dominican Republic$|Czech Republic$|Philippines$)/.test(n) ? "the " + n : n);
export const countryKey = (c?: string | null) => String(c || "").toLowerCase().trim().replace(/\s+/g, "-");
export const nameOf = (k: string, guides: Record<string, { name: string }>) => guides[k]?.name || EXTRA_NAMES[k] || "";

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
export const fmtMoney = (n: number, ccy = "EUR") => {
  const sym: Record<string, string> = { EUR: "€", USD: "US$", GBP: "£" };
  return (sym[ccy] ?? ccy + " ") + Math.round(n).toLocaleString("en");
};

/** Countries that get buying-cost pages: cost data with a percentage and a name. */
export const costCountries = (dest: Record<string, Row>, guides: Record<string, { name: string }>) =>
  Object.keys(dest).filter((k) => k !== "_meta" && nameOf(k, guides) && costRange(dest[k]?.purchase_costs_pct)).sort((a, b) => nameOf(a, guides).localeCompare(nameOf(b, guides)));

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
export function residencyFor(cb: CanBuyData, nat: string, country: string, countryName: string): string[] {
  const n = cb.nationalities[nat]; const c = cb.countries[country];
  if (!n || !c) return [];
  const free = n.bloc !== "other";
  const inEu = cb.eu.includes(country);
  const efta = country === "norway" || country === "switzerland";
  const out: string[] = [];
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
export function canBuyFaq(cb: CanBuyData, nat: string, country: string, d: { dest: Row | null; guide: Row | null; name: string; homes: Row[] }): [string, string][] {
  const n = cb.nationalities[nat]; const r = ruleFor(cb, nat, country);
  if (!n || !r) return [];
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
export const fill = (s: string, n: Nationality) => s.replace(/\{plural\}/g, n.plural);

/** Page title and description, shared by the app and the prerender. */
export function canBuyMeta(cb: CanBuyData, nat: string, country: string, name: string) {
  const n = cb.nationalities[nat]; const r = ruleFor(cb, nat, country)!;
  const q = `Can ${n.noun} buy property in ${the(name)}?`;
  return {
    h1: q,
    title: `${q} ${STATUS_LABEL[r.s]} · Rules for ${n.label} buyers (${UPDATED}) · RealHunt`,
    desc: fill(r.a, n).replace(/\s+/g, " ").slice(0, 300),
  };
}

/** Costs on top of the price, as lines for the calculator and the worked examples. */
export function costLines(price: number, dest: Row, ccy = "EUR") {
  const r = costRange(dest?.purchase_costs_pct);
  if (!r) return null;
  const c = buyingCosts(price, r);
  const same = c.lo === c.hi;
  return {
    ...c, r,
    fees: same ? fmtMoney(c.lo, ccy) : `${fmtMoney(c.lo, ccy)} to ${fmtMoney(c.hi, ccy)}`,
    total: same ? fmtMoney(c.totalLo, ccy) : `${fmtMoney(c.totalLo, ccy)} to ${fmtMoney(c.totalHi, ccy)}`,
    pct: same ? `${r[0]}%` : `${r[0]}% to ${r[1]}%`,
  };
}
