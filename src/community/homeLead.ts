// The first lines of every home page (20-nov-2026, ideas 11, 12, 15 and 25 of the list of 100): what the home is,
// where, its price, size, price per m² and score in one answer paragraph, then how its price per m² compares with the
// median of its country and of its region on RealHunt. Also the short title of the page ("3-bedroom house in Bajardo,
// Italy for €85,000") and the kind of home for the structured data. English and Spanish are written here by hand,
// from the same numbers, so the two pages say the same thing and never mix languages.
// Used by seo/prerender.ts (both home pages) and seo/dealMd.ts (the .md version reads the finished HTML).
import { esPlace } from "../lib/lang";
import { theEs } from "./seo2data";
import { perSqm } from "./sqmLogic";

type Row = Record<string, any>;
export type LeadCtx = { countryHomes: Row[]; regionHomes?: Row[]; regionName?: string };

/** The kind of home, read from its English title. `ld` is the schema.org type of the residence. */
export type HomeKind = { en: string; es: string; ld: "Apartment" | "House" | "SingleFamilyResidence"; noBeds?: boolean };
const KINDS: [RegExp, HomeKind][] = [
  [/\bstudio\b/i, { en: "studio", es: "estudio", ld: "Apartment", noBeds: true }],
  [/\bpenthouse\b/i, { en: "penthouse", es: "ático", ld: "Apartment" }],
  [/\bduplex\b/i, { en: "duplex", es: "dúplex", ld: "Apartment" }],
  [/\b(flat|apartment|condo)\b/i, { en: "flat", es: "piso", ld: "Apartment" }],
  [/\bloft\b/i, { en: "loft", es: "loft", ld: "Apartment" }],
  [/\b(town ?house|row ?house|end[ -]terrace)\b/i, { en: "townhouse", es: "casa adosada", ld: "House" }],
  [/\bvilla\b/i, { en: "villa", es: "villa", ld: "SingleFamilyResidence" }],
  [/\bbungalow\b/i, { en: "bungalow", es: "bungaló", ld: "SingleFamilyResidence" }],
  [/\bfarm ?house\b/i, { en: "farmhouse", es: "casa de campo", ld: "SingleFamilyResidence" }],
  [/\bcottage\b/i, { en: "cottage", es: "casa de campo", ld: "SingleFamilyResidence" }],
  [/\bchalet\b/i, { en: "chalet", es: "chalé", ld: "SingleFamilyResidence" }],
  [/\bcabin\b/i, { en: "cabin", es: "cabaña", ld: "SingleFamilyResidence" }],
  [/\b(house|home)\b/i, { en: "house", es: "casa", ld: "SingleFamilyResidence" }],
];
const FLAT = KINDS.find(([re]) => re.test("flat"))![1];
const OTHER: HomeKind = { en: "home", es: "casa", ld: "SingleFamilyResidence" };
/** The kinds by their stored name (realhunt.community_deals.property_type, migration 20261121150000). */
export const KIND_BY_NAME: Record<string, HomeKind> = Object.fromEntries([...KINDS.map(([, k]) => [k.en, k] as const), ["home", OTHER] as const]);
export function homeKind(r: Row): HomeKind {
  // 21-nov-2026 (list 2 idea 70): the kind stored in the database comes first; reading the title is the fallback.
  const stored = KIND_BY_NAME[String(r.property_type || "").trim().toLowerCase()];
  if (stored) return stored;
  return kindFromTitle(r);
}
/** The kind read from the English title (what homeKind did before the column existed; also fills the column). */
export function kindFromTitle(r: Row): HomeKind {
  // The kind named first wins: "House with sauna and a guest studio" is a house, not a studio (fix of 20 Nov 2026).
  const t = String(r.title || "");
  let best: HomeKind | null = null, at = Infinity;
  // "Cottage-style house", "loft-style studio": a word followed by -style, -like or -sized describes, it does not name
  // the home (21 Nov 2026, checked on all 713 homes in src/test/home-kind.test.ts).
  for (const [re, k] of KINDS) {
    const g = new RegExp(re.source, "gi");
    for (let m = g.exec(t); m; m = g.exec(t)) {
      if (/^-(style|like|sized)\b/i.test(t.slice(m.index + m[0].length))) continue;
      if (m.index < at) { at = m.index; best = k; }
      break;
    }
  }
  // ...except "townhouse flat", "house apartment": the word after it names the home.
  if (best && best.ld !== "Apartment" && /^\S+\s+(flat|apartment|condo)\b/i.test(t.slice(at))) return FLAT;
  return best || OTHER;
}

const median = (xs: number[]) => { const a = xs.filter((x) => x > 0).sort((p, q) => p - q); return a.length ? a[Math.floor(a.length / 2)] : 0; };
const ppsqm = (r: Row) => perSqm(r); // only a living area (idea 74, ./sqmLogic)
const eurEn = (n: number) => "€" + Math.round(n).toLocaleString("en");
const eurEs = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " €";
const theEn = (n: string) => (/^(United |Netherlands$|Dominican Republic$|Czech Republic$|Philippines$)/.test(n) ? "the " + n : n);
const parts = (r: Row) => String(r.location_name || "").split(",").map((x) => x.trim()).filter((x) => x && x.toLowerCase() !== String(r.country || "").toLowerCase());
const placeEs = (s: string) => String(s).split(", ").map((x) => esPlace(x.trim())).join(", ");

/** "in Peglio" / "en Peglio"; a place given as "near Saint-Vaury" is "near Saint-Vaury" / "cerca de Saint-Vaury". */
export const inWhere = (where: string, lang: "en" | "es") => (/^near /.test(where) ? (lang === "es" ? "cerca de " + where.slice(5) : where) : (lang === "es" ? "en " : "in ") + where);

/** "2-bedroom flat" / "Piso de 2 dormitorios" */
export function homeWhat(r: Row, lang: "en" | "es"): string {
  const k = homeKind(r); const b = !k.noBeds && Number(r.bedrooms) > 0 ? Number(r.bedrooms) : 0;
  if (lang === "es") { const w = k.es[0].toUpperCase() + k.es.slice(1); return b ? `${w} de ${b} ${b > 1 ? "dormitorios" : "dormitorio"}` : w; }
  const w = b ? `${b}-bedroom ${k.en}` : k.en;
  return w[0].toUpperCase() + w.slice(1);
}

/** Where, for a title: the town and the country (in the United States the state, which is what people search). */
export function homeWhere(r: Row, lang: "en" | "es", short = false): string {
  const p = parts(r); const country = String(r.country || "");
  const town = p[0] || "";
  const second = country === "United States" && p.length > 1 ? p[p.length - 1] : country;
  const tr = (x: string) => (lang === "es" ? esPlace(x) : x);
  if (!town) return tr(country);
  return short || !second || second === town ? tr(town) : `${tr(town)}, ${tr(second)}`;
}

/** The title of the page, before seo/polish.ts adds the brand when it fits: what, where, price. */
export function homeTitle(r: Row, lang: "en" | "es", max = 60): string {
  const price = lang === "es" ? eurEs(r.price_eur) : eurEn(r.price_eur);
  const make = (short: boolean) => lang === "es" ? `${homeWhat(r, "es")} ${inWhere(homeWhere(r, "es", short), "es")} por ${price}` : `${homeWhat(r, "en")} ${inWhere(homeWhere(r, "en", short), "en")} for ${price}`;
  const t = make(false);
  return t.length <= max ? t : make(true);
}

/** The answer paragraph and the line on the price against the area. Every figure comes from the data. */
export function homeLead(r: Row, ctx: LeadCtx, lang: "en" | "es"): string[] {
  const es = lang === "es";
  const eur = es ? eurEs : eurEn;
  const own = ppsqm(r);
  const country = String(r.country || "");
  const where = es ? placeEs([...parts(r), country].join(", ")) : [...parts(r), country].join(", ");
  const out: string[] = [];
  const facts: string[] = [];
  if (r.sqm > 0) facts.push(`${r.sqm} m²`);
  if (own) facts.push(es ? `unos ${eur(own)} por m²` : `about ${eur(own)} per m²`);
  const what = homeWhat(r, lang);
  let p = es
    ? `${what} en venta ${inWhere(where, "es")} por ${eur(r.price_eur)}${facts.length ? `: ${facts.join(", ")}` : ""}.`
    : `${what} for sale ${inWhere(where, "en")} at ${eur(r.price_eur)}${facts.length ? `: ${facts.join(", ")}` : ""}.`;
  if (r.nota != null) p += es ? ` Nota RealHunt: ${r.nota} de 98.` : ` RealHunt score: ${r.nota} of 98.`;
  const cHomes = ctx.countryHomes.filter((x) => ppsqm(x) > 0);
  const cMed = median(cHomes.map(ppsqm));
  const inC = es ? theEs(esPlace(country)) : theEn(country);
  if (own && cMed && cHomes.length >= 5) {
    const d = Math.round(((own - cMed) / cMed) * 100);
    p += es
      ? ` Por metro cuadrado, ${Math.abs(d) < 3 ? "está en línea con" : `está un ${Math.abs(d)}% ${d < 0 ? "por debajo de" : "por encima de"}`} la mediana de ${inC} en RealHunt (${eur(cMed)} por m², ${cHomes.length} casas).`
      : ` Per square metre it is ${Math.abs(d) < 3 ? "in line with" : `${Math.abs(d)}% ${d < 0 ? "below" : "above"}`} the median for ${inC} on RealHunt (${eur(cMed)} per m², ${cHomes.length} homes).`;
  }
  out.push(p);
  // the price against the area (idea 12): the region of the home when it has at least 3 homes with a size
  const rHomes = (ctx.regionHomes || []).filter((x) => ppsqm(x) > 0);
  const rMed = rHomes.length >= 3 ? median(rHomes.map(ppsqm)) : 0;
  if (own && rMed && ctx.regionName) {
    const d = Math.round(((own - rMed) / rMed) * 100);
    const rn = es ? esPlace(ctx.regionName) : ctx.regionName;
    out.push(es
      ? `Precio frente a la zona: ${Math.abs(d) < 3 ? "cuesta lo mismo por m² que" : `cuesta un ${Math.abs(d)}% ${d < 0 ? "menos" : "más"} por m² que`} la mediana de ${rn} en RealHunt, ${eur(rMed)} por m² en ${rHomes.length} casas.`
      : `Price against the area: ${Math.abs(d) < 3 ? "about the same per m² as" : `${Math.abs(d)}% ${d < 0 ? "cheaper" : "dearer"} per m² than`} the median for ${rn} on RealHunt, ${eur(rMed)} per m² across ${rHomes.length} homes.`);
  }
  return out;
}
