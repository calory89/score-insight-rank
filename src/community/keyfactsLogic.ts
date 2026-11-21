// The row of key facts under the price on a home page (21-nov-2026, list 2 idea 11). Pure, tested in
// src/test/keyfacts.test.ts. Only numbers the listing gives: a tile is left out when its number is missing.
export type KeyFact = { k: "sqm" | "per" | "beds" | "score"; label: string; value: string };

const eur = (n: number) => new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

export function keyFacts(d: { price_eur?: number | null; sqm?: number | null; bedrooms?: number | null }, score?: number | null): KeyFact[] {
  const out: KeyFact[] = [];
  const sqm = d.sqm != null && d.sqm > 0 ? Math.round(d.sqm) : null;
  if (sqm) out.push({ k: "sqm", label: "Size", value: `${sqm} m²` });
  if (sqm && d.price_eur && d.price_eur > 0) out.push({ k: "per", label: "Price per m²", value: eur(Math.round(d.price_eur / sqm)) });
  if (d.bedrooms != null && d.bedrooms >= 0) out.push({ k: "beds", label: "Bedrooms", value: String(d.bedrooms) });
  if (score != null && score > 0) out.push({ k: "score", label: "Score", value: String(Math.round(score)) });
  return out;
}

/** Town and country for the action bar ("Balatonlelle, Hungary"): short enough to read whole, never "Balatonlelle, S...". */
export function barPlace(d: { location_name?: string | null; country?: string | null }): string {
  const town = (d.location_name || "").split(",")[0].replace(/\s*\(.*?\)\s*/g, " ").trim();
  const country = (d.country || "").trim();
  if (!town) return country;
  if (!country || town.toLowerCase() === country.toLowerCase()) return town;
  return `${town}, ${country}`;
}
