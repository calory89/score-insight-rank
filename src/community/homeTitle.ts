// The title of a home page and the kind of home (26-nov-2026: moved out of ./homeLead so the app can set the same
// title as the prerendered page without loading the article writers). Pure; tested in src/test/home-kind.test.ts,
// home-lead.test.ts and deal-batch1.test.ts.
import { esPlace } from "../lib/lang"; // relative: seo/prerender.ts (no "@" alias at build time) uses this file too
import { locationParts } from "./regions";
import { pickTitle } from "../../seo/polishMeta"; // the same wording the prerendered page gets from seo/polish.ts
import { isGone, isUnconfirmed } from "./n9/status";

type Row = Record<string, any>;
const eurEn = (n: number) => "€" + Math.round(n).toLocaleString("en");
const eurEs = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " €";
const parts = (r: Row) => locationParts(r.location_name).filter((x) => x.toLowerCase() !== String(r.country || "").toLowerCase());

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

/** "Sold or withdrawn: " / "Not confirmed: " in front of the title of a home whose advert is gone or could not be
 * confirmed (idea 44 of the list of 1,000: nobody shares it as a safe find). "" for the others. */
export function titleFlag(r: Row, lang: "en" | "es"): string {
  if (isGone(r)) return lang === "es" ? "Vendida o retirada: " : "Sold or withdrawn: ";
  if (isUnconfirmed(r)) return lang === "es" ? "Sin confirmar: " : "Not confirmed: ";
  return "";
}
/** The title of a home page, the same in the prerendered HTML (seo/prerender.ts, before seo/polish.ts) and in the app
 * (idea 3): the flag, then what, where and price. */
export const dealTitle = (r: Row, lang: "en" | "es") => titleFlag(r, lang) + homeTitle(r, lang, titleFlag(r, lang) ? 40 : 60);
/** The browser title the app sets: dealTitle with " · RealHunt" when it fits in 60 characters, the rule of
 * pickTitle() in seo/polishMeta.ts for a home page (compared in src/test/deal-title.test.ts). */
export const dealDocTitle = (r: Row, lang: "en" | "es") => pickTitle(dealTitle(r, lang) + " · RealHunt", lang, "deal");

