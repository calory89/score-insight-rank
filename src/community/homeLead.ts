// The first lines of every home page (20-nov-2026, ideas 11, 12, 15 and 25 of the list of 100): what the home is,
// where, its price, size, price per m² and score in one answer paragraph, then how its price per m² compares with the
// median of its country and of its region on RealHunt. Also the short title of the page ("3-bedroom house in Bajardo,
// Italy for €85,000") and the kind of home for the structured data. English and Spanish are written here by hand,
// from the same numbers, so the two pages say the same thing and never mix languages.
// Used by seo/prerender.ts (both home pages) and seo/dealMd.ts (the .md version reads the finished HTML).
import { esPlace } from "../lib/lang";
import { theEs } from "./seo2data";
import { perSqm } from "./sqmLogic";
import { locationParts } from "./regions";

import { homeWhat, inWhere } from "./homeTitle";
export { homeKind, kindFromTitle, KIND_BY_NAME, homeWhat, homeWhere, inWhere, homeTitle, titleFlag, dealTitle, dealDocTitle, type HomeKind } from "./homeTitle";

type Row = Record<string, any>;
export type LeadCtx = { countryHomes: Row[]; regionHomes?: Row[]; regionName?: string };

const median = (xs: number[]) => { const a = xs.filter((x) => x > 0).sort((p, q) => p - q); return a.length ? a[Math.floor(a.length / 2)] : 0; };
const ppsqm = (r: Row) => perSqm(r); // only a living area (idea 74, ./sqmLogic)
const eurEn = (n: number) => "€" + Math.round(n).toLocaleString("en");
const eurEs = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " €";
const theEn = (n: string) => (/^(United |Netherlands$|Dominican Republic$|Czech Republic$|Philippines$)/.test(n) ? "the " + n : n);
const parts = (r: Row) => locationParts(r.location_name).filter((x) => x.toLowerCase() !== String(r.country || "").toLowerCase());
const placeEs = (s: string) => String(s).split(", ").map((x) => esPlace(x.trim())).join(", ");

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
