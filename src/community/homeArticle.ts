// The written article on every home page: is the price good, what it really costs to buy, where it is, and
// questions people ask. Built from the home's own numbers, the other homes on RealHunt and the buying rules in
// src/data/destinations.json, so every page says something specific and it stays true after each update.
// Used by seo/prerender.ts (HTML + FAQPage JSON-LD) and by the app's home page (HomeArticle), so both match.

type Row = Record<string, any>;
export type ArticleCtx = {
  countryHomes: Row[];            // published homes in the same country (this one included)
  regionHomes?: Row[];            // same region, when it has its own page
  regionName?: string;
  dest?: Row | null;              // destinations.json entry for the country
  hasGuide?: boolean;
};
export type Article = { sections: { h: string; p: string[] }[]; faq: [string, string][] };

const eur = (n: number) => "€" + Math.round(n).toLocaleString("en");
const median = (xs: number[]) => { const a = xs.filter((x) => x > 0).sort((p, q) => p - q); return a.length ? a[Math.floor(a.length / 2)] : 0; };
const ppsqm = (r: Row) => (r.sqm > 0 && r.price_eur > 0 ? r.price_eur / r.sqm : 0);
const range = (s?: string | null): [number, number] | null => { const m = String(s || "").match(/([\d.]+)\s*[-–]\s*([\d.]+)/) || String(s || "").match(/([\d.]+)/); return m ? [Number(m[1]), Number(m[2] || m[1])] : null; };
const the = (n: string) => (/^(United |Netherlands$|Dominican Republic$|Czech Republic$|Philippines$)/.test(n) ? "the " + n : n);
const town = (r: Row) => String(r.location_name || r.country || "").split(",")[0].trim();

export function homeArticle(r: Row, ctx: ArticleCtx): Article {
  const country = String(r.country || "");
  const inC = the(country);
  const place = town(r) || country;
  const sections: Article["sections"] = [];
  const faq: [string, string][] = [];
  const own = ppsqm(r);

  // 1. The price, against the other homes on RealHunt.
  const cMed = median(ctx.countryHomes.map(ppsqm));
  const cN = ctx.countryHomes.filter((x) => ppsqm(x) > 0).length;
  const priceP: string[] = [];
  if (own && cMed && cN >= 5) {
    const diff = Math.round(((own - cMed) / cMed) * 100);
    const pricier = ctx.countryHomes.filter((x) => ppsqm(x) > own).length;
    priceP.push(`At about ${eur(own)} per m², this home is ${Math.abs(diff) < 3 ? "in line with" : `${Math.abs(diff)}% ${diff < 0 ? "below" : "above"}`} the median for ${inC} on RealHunt (${eur(cMed)} per m², across ${cN} homes checked by a person). ${pricier} of those homes cost more per m².`);
    const rMed = ctx.regionHomes && ctx.regionHomes.length >= 3 ? median(ctx.regionHomes.map(ppsqm)) : 0;
    if (rMed && ctx.regionName) {
      const rd = Math.round(((own - rMed) / rMed) * 100);
      priceP.push(`In ${ctx.regionName} the median is ${eur(rMed)} per m², so this home is ${Math.abs(rd) < 3 ? "about the same as" : `${Math.abs(rd)}% ${rd < 0 ? "cheaper than" : "dearer than"}`} homes nearby on RealHunt.`);
    }
  } else if (r.price_eur) {
    const cheaper = ctx.countryHomes.filter((x) => x.price_eur < r.price_eur).length;
    if (ctx.countryHomes.length >= 3) priceP.push(`${cheaper} of the ${ctx.countryHomes.length} homes in ${inC} on RealHunt have a lower asking price.`);
  }
  if (priceP.length) {
    priceP.push("Asking prices are what the seller asks, not what homes sell for. Compare with recent sales in the same village before you make an offer.");
    sections.push({ h: `Is ${eur(r.price_eur)} a good price for this home?`, p: priceP });
  }

  // 2. What it really costs to buy.
  const rg = range(ctx.dest?.purchase_costs_pct);
  if (rg && r.price_eur) {
    const lo = (r.price_eur * rg[0]) / 100, hi = (r.price_eur * rg[1]) / 100;
    const costP = [`Buying in ${inC} adds about ${ctx.dest!.purchase_costs_pct}% in taxes and fees on top of the price: roughly ${eur(lo)}${rg[1] !== rg[0] ? ` to ${eur(hi)}` : ""} here, so plan for about ${eur(r.price_eur + lo)}${rg[1] !== rg[0] ? ` to ${eur(r.price_eur + hi)}` : ""} in total.`];
    if (ctx.dest!.purchase_costs_breakdown) costP.push(String(ctx.dest!.purchase_costs_breakdown));
    if (ctx.dest!.annual_property_tax) costP.push(`Every year: ${ctx.dest!.annual_property_tax}`);
    costP.push("General information, not tax advice: ask a local lawyer or notary for the exact figure.");
    sections.push({ h: `What it costs to buy this home`, p: costP });
    faq.push([`How much are the buying costs for this home?`, `About ${eur(lo)}${rg[1] !== rg[0] ? ` to ${eur(hi)}` : ""} on top of the ${eur(r.price_eur)} asking price (${ctx.dest!.purchase_costs_pct}% in ${inC}), so about ${eur(r.price_eur + lo)}${rg[1] !== rg[0] ? ` to ${eur(r.price_eur + hi)}` : ""} in total.`]);
  }

  // 2b. Running costs: community fee (HOA) and property tax, when the listing gives them.
  const cur = r.hoa_currency || "EUR";
  const fmtC = (v: number) => new Intl.NumberFormat("en", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(v);
  const hoa = Number(r.hoa_monthly) || 0, tax = Number(r.tax_annual) || 0;
  if (hoa || tax || r.hoa_unknown) {
    const p: string[] = [];
    if (hoa) p.push(`The community fee (HOA) is ${fmtC(hoa)} a month${tax ? ` and the property tax ${fmtC(tax)} a year (${fmtC(tax / 12)} a month), so about ${fmtC(hoa + tax / 12)} a month before insurance and utilities` : ""}.`);
    else if (r.hoa_unknown) p.push(`The listing does not state the community fee (HOA). Flats in this area usually pay one every month, sometimes over $1,000, plus possible special assessments for building works: ask the agent for the exact fee before you make an offer.${tax ? ` The property tax is ${fmtC(tax)} a year (${fmtC(tax / 12)} a month).` : ""}`);
    else if (tax) p.push(`The property tax is ${fmtC(tax)} a year (${fmtC(tax / 12)} a month).`);
    if (r.costs_note) p.push(String(r.costs_note));
    sections.push({ h: "What it costs every month", p });
    faq.push(["Is there a community fee (HOA)?", hoa ? `Yes: ${fmtC(hoa)} a month${r.costs_note ? `. ${r.costs_note}` : "."}` : r.hoa_unknown ? "The listing does not say. Ask the agent for the monthly fee and any pending special assessment." : "No community fee is listed."]);
  }

  // 3. Where it is.
  const near = r.nearby || {};
  const bits: string[] = [];
  const km = (k: string) => (near[k]?.km != null ? Number(near[k].km) : k === "airport" && r.airport_km != null ? Number(r.airport_km) : k === "sea" && r.sea_km != null ? Number(r.sea_km) : null);
  const name = (k: string) => (near[k]?.name ? ` (${near[k].name})` : "");
  if (km("sea") != null) bits.push(km("sea")! < 1 ? `the sea is less than a kilometre away${name("sea")}` : `the sea is about ${Math.round(km("sea")!)} km away${name("sea")}`);
  if (km("lake") != null && km("lake")! < 15) bits.push(`there is a lake ${Math.round(km("lake")!)} km away${name("lake")}`);
  if (km("airport") != null) bits.push(`the nearest airport is about ${Math.round(km("airport")!)} km away${name("airport")}`);
  if (km("shop") != null) bits.push(`the nearest shop is ${km("shop")! < 1 ? "within a kilometre" : `about ${Math.round(km("shop")!)} km away`}`);
  if (km("train") != null) bits.push(`the nearest train station is about ${Math.round(km("train")!)} km away${name("train")}`);
  if (km("hospital") != null) bits.push(`the nearest hospital is about ${Math.round(km("hospital")!)} km away`);
  const locP = [`The home is in ${r.location_name || place}${ctx.regionName && !String(r.location_name || "").includes(ctx.regionName) ? `, ${ctx.regionName}` : ""}, ${country}.`];
  if (bits.length) locP.push(bits.map((b, i) => (i ? b : b[0].toUpperCase() + b.slice(1))).join("; ") + ". Distances are in a straight line.");
  sections.push({ h: `Where it is: ${place}`, p: locP });
  if (km("airport") != null) faq.push([`How far is the nearest airport from this home?`, `About ${Math.round(km("airport")!)} km in a straight line${near.airport?.name ? `: ${near.airport.name}` : ""}.`]);
  if (km("sea") != null) faq.push([`How far is this home from the sea?`, `About ${km("sea")! < 1 ? "less than 1" : Math.round(km("sea")!)} km in a straight line.`]);

  // 4. Questions people ask.
  faq.unshift([`How much does this home in ${place} cost?`, `The asking price is ${eur(r.price_eur)}${r.sqm ? ` for ${r.sqm} m²${own ? ` (about ${eur(own)} per m²)` : ""}` : ""}${r.bedrooms ? ` with ${r.bedrooms} bedroom${r.bedrooms > 1 ? "s" : ""}` : ""}.`]);
  if (ctx.dest?.can_foreigners_buy) faq.push([`Can foreigners buy a home in ${inC}?`, String(ctx.dest.can_foreigners_buy)]);
  faq.push([`Does RealHunt sell this home?`, `No. RealHunt is not an estate agent: it checks and scores homes and links to the original listing${r.source_domain ? ` on ${r.source_domain}` : ""}, so you deal directly with the seller or their agent.`]);
  return { sections, faq };
}
