// The home page article in Spanish (8-nov-2026, owner: "nunca mezclados, todo bien traducido"). Same facts and the
// same order as src/community/homeArticle.ts (which crawlers read in English), written as Spanish sentences instead of
// being stitched together by the dictionary. `dest` must be the Spanish destinations entry (localizeRows with
// src/data/destinations-es.json); the costs note, yearly tax and "can foreigners buy" then come in Spanish too.
import { priceVerdict, type Article, type ArticleCtx } from "./homeArticle";
import { esPlace } from "../lib/lang"; // relative: seo/prerender.ts (no "@" alias at build time) uses this file too
import { theEs } from "./seo2data";
import { perSqm } from "./sqmLogic";

type Row = Record<string, any>;
const num = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const eur = (n: number) => num(n) + " €";
const pct = (s: string) => String(s).replace(/(\d)\.(\d)/g, "$1,$2");
const median = (xs: number[]) => { const a = xs.filter((x) => x > 0).sort((p, q) => p - q); return a.length ? a[Math.floor(a.length / 2)] : 0; };
const ppsqm = (r: Row) => perSqm(r); // only a living area (idea 74, ./sqmLogic)
const range = (s?: string | null): [number, number] | null => { const m = String(s || "").match(/([\d.]+)\s*[-–]\s*([\d.]+)/) || String(s || "").match(/([\d.]+)/); return m ? [Number(m[1]), Number(m[2] || m[1])] : null; };
const town = (r: Row) => String(r.location_name || r.country || "").split(",")[0].trim().replace(/^near /, "");
/** "Spain, Málaga" style location with the Spanish names of the country and regions the site knows. */
const placeEs = (s: string) => String(s).split(", ").map((x) => esPlace(x.trim())).join(", ");

export function homeArticleEs(r: Row, ctx: ArticleCtx): Article {
  const country = esPlace(String(r.country || ""));
  const inC = theEs(country);
  const place = town(r) || country;
  const sections: Article["sections"] = [];
  const faq: [string, string][] = [];
  const own = ppsqm(r);
  const region = ctx.regionName ? esPlace(ctx.regionName) : "";

  // 1. El precio, frente a las otras casas de RealHunt.
  const cMed = median(ctx.countryHomes.map(ppsqm));
  const cN = ctx.countryHomes.filter((x) => ppsqm(x) > 0).length;
  const priceP: string[] = [];
  if (own && cMed && cN >= 5) {
    const diff = Math.round(((own - cMed) / cMed) * 100);
    const pricier = ctx.countryHomes.filter((x) => ppsqm(x) > own).length;
    const vs = Math.abs(diff) < 3 ? "en línea con" : `un ${Math.abs(diff)}% ${diff < 0 ? "por debajo de" : "por encima de"}`;
    priceP.push(`A unos ${eur(own)} por m², esta casa está ${vs} la mediana de ${inC} en RealHunt (${eur(cMed)} por m², entre ${cN} casas revisadas por una persona). ${pricier} de esas casas cuestan más por m².`);
    const rMed = !ctx.areaInLead && ctx.regionHomes && ctx.regionHomes.length >= 3 ? median(ctx.regionHomes.map(ppsqm)) : 0;
    if (rMed && region) {
      const rd = Math.round(((own - rMed) / rMed) * 100);
      const cmp = Math.abs(rd) < 3 ? "cuesta más o menos lo mismo que" : `es un ${Math.abs(rd)}% ${rd < 0 ? "más barata que" : "más cara que"}`;
      priceP.push(`En ${region} la mediana es de ${eur(rMed)} por m², así que esta casa ${cmp} las casas cercanas en RealHunt.`);
    }
  } else if (r.price_eur) {
    const cheaper = ctx.countryHomes.filter((x) => x.price_eur < r.price_eur).length;
    if (ctx.countryHomes.length >= 3) priceP.push(`${cheaper} de las ${ctx.countryHomes.length} casas de ${inC} en RealHunt tienen un precio de venta más bajo.`);
  }
  // idea 22 (26-nov-2026): la respuesta primero, en una frase con la cifra
  const verdict = priceVerdict(r, ctx, "es", esPlace);
  if (verdict) priceP.unshift(verdict);
  if (priceP.length) {
    priceP.push("El precio de venta es lo que pide el vendedor, no lo que se paga al final. Compáralo con ventas recientes en el mismo pueblo antes de hacer una oferta.");
    sections.push({ h: `¿Es ${eur(r.price_eur)} un buen precio para esta casa?`, p: priceP });
  }

  // 2. Lo que cuesta de verdad comprarla.
  const rg = range(ctx.dest?.purchase_costs_pct);
  if (rg && r.price_eur) {
    const lo = (r.price_eur * rg[0]) / 100, hi = (r.price_eur * rg[1]) / 100;
    const two = rg[1] !== rg[0];
    const p = pct(ctx.dest!.purchase_costs_pct);
    const costP = [`Comprar en ${inC} suma alrededor de un ${p}% en impuestos y gastos sobre el precio: aquí, unos ${eur(lo)}${two ? ` a ${eur(hi)}` : ""}, así que calcula unos ${eur(r.price_eur + lo)}${two ? ` a ${eur(r.price_eur + hi)}` : ""} en total.`];
    if (ctx.dest!.purchase_costs_breakdown) costP.push(String(ctx.dest!.purchase_costs_breakdown));
    if (ctx.dest!.annual_property_tax) costP.push(`Cada año: ${ctx.dest!.annual_property_tax}`);
    costP.push("Información general, no asesoramiento fiscal: pide la cifra exacta a un abogado o notario local.");
    sections.push({ h: "Lo que cuesta comprar esta casa", p: costP });
    faq.push(["¿Cuánto cuestan los gastos de compra de esta casa?", `Unos ${eur(lo)}${two ? ` a ${eur(hi)}` : ""} además de los ${eur(r.price_eur)} del precio de venta (${p}% en ${inC}), así que unos ${eur(r.price_eur + lo)}${two ? ` a ${eur(r.price_eur + hi)}` : ""} en total.`]);
  }

  // 2b. Gastos de cada mes: cuota de comunidad (HOA) e impuesto sobre la propiedad.
  const cur = r.hoa_currency || "EUR";
  const fmtC = (v: number) => num(v) + "\u00A0" + (cur === "EUR" ? "€" : cur === "USD" ? "$" : cur === "GBP" ? "£" : cur);
  const hoa = Number(r.hoa_monthly) || 0, tax = Number(r.tax_annual) || 0;
  const note = r.costs_note_es || null; // the English costs note is not shown on the Spanish page
  let notStated: { h: string; p: string[] } | null = null;
  if (hoa || tax || r.hoa_unknown) {
    const p: string[] = [];
    if (hoa) p.push(`La cuota de comunidad (HOA) es de ${fmtC(hoa)} al mes${tax ? ` y el impuesto sobre la propiedad de ${fmtC(tax)} al año (${fmtC(tax / 12)} al mes), así que unos ${fmtC(hoa + tax / 12)} al mes antes de seguro y suministros` : ""}.`);
    else if (r.hoa_unknown) p.push(`El anuncio no indica la cuota de comunidad (HOA). Los pisos de esta zona suelen pagar una cada mes, a veces de más de 1.000 $, y puede haber derramas por obras: pide al agente la cuota exacta antes de hacer una oferta.${tax ? ` El impuesto sobre la propiedad es de ${fmtC(tax)} al año (${fmtC(tax / 12)} al mes).` : ""}`);
    else if (tax) p.push(`El impuesto sobre la propiedad es de ${fmtC(tax)} al año (${fmtC(tax / 12)} al mes).`);
    if (r.costs_note && /property tax is an estimate/i.test(r.costs_note)) p.push("El impuesto sobre la propiedad es una estimación para un nuevo propietario (en torno al 1,8% del precio al año); el último recibo del vendedor puede incluir una bonificación por vivienda habitual.");
    else if (r.costs_note && /last tax bill/i.test(r.costs_note)) p.push("Impuesto sobre la propiedad: dato del último recibo del impuesto.");
    else if (note) p.push(note);
    sections.push({ h: "Lo que cuesta cada mes", p });
    faq.push(["¿Hay cuota de comunidad (HOA)?", hoa ? `Sí: ${fmtC(hoa)} al mes.` : r.hoa_unknown ? "El anuncio no lo dice. Pide al agente la cuota mensual y si hay alguna derrama pendiente." : "El anuncio no indica cuota de comunidad."]);
  } else {
    // idea 75 (21-nov-2026): dicho claro, para que un dato que falta no parezca que no hay nada que pagar
    notStated = { h: "Lo que cuesta cada mes", p: ["No indicado: el anuncio no da ni la cuota de comunidad ni el impuesto anual sobre la propiedad. Pide al agente las dos cifras antes de hacer una oferta."] };
  }

  // 2c. Gastos de cada año como pregunta propia (idea 14).
  const yearly: string[] = [];
  if (hoa) yearly.push(`una cuota de comunidad (HOA) de ${fmtC(hoa)} al mes`);
  if (tax) yearly.push(`un impuesto sobre la propiedad de ${fmtC(tax)} al año`);
  if (yearly.length || ctx.dest?.annual_property_tax) faq.push(["¿Cuánto cuesta esta casa cada año?", [yearly.length ? `El anuncio indica ${yearly.join(" y ")}.` : "El anuncio no indica cuota de comunidad ni impuesto anual sobre la propiedad.", ctx.dest?.annual_property_tax ? `En ${inC}: ${ctx.dest.annual_property_tax}` : ""].filter(Boolean).join(" ") + " El seguro y los suministros van aparte."]);

  // 3. Dónde está.
  const near = r.nearby || {};
  const bits: string[] = [];
  const km = (k: string) => (near[k]?.km != null ? Number(near[k].km) : k === "airport" && r.airport_km != null ? Number(r.airport_km) : k === "sea" && r.sea_km != null ? Number(r.sea_km) : null);
  const name = (k: string) => (near[k]?.name ? ` (${near[k].name})` : "");
  if (km("sea") != null) bits.push(km("sea")! < 1 ? `el mar está a menos de un kilómetro${name("sea")}` : `el mar está a unos ${Math.round(km("sea")!)} km${name("sea")}`);
  if (km("lake") != null && km("lake")! < 15) bits.push(`hay un lago a ${Math.round(km("lake")!)} km${name("lake")}`);
  if (km("airport") != null) bits.push(`el aeropuerto más cercano está a unos ${Math.round(km("airport")!)} km${name("airport")}`);
  if (km("shop") != null) bits.push(`la tienda más cercana está ${km("shop")! < 1 ? "a menos de un kilómetro" : `a unos ${Math.round(km("shop")!)} km`}`);
  if (km("train") != null) bits.push(`la estación de tren más cercana está a unos ${Math.round(km("train")!)} km${name("train")}`);
  if (km("hospital") != null) bits.push(`el hospital más cercano está a unos ${Math.round(km("hospital")!)} km`);
  const loc = placeEs(r.location_name || place);
  const isNear = /^near /.test(loc);
  const locP = [`La casa está ${isNear ? "cerca de " : "en "}${isNear ? loc.slice(5) : loc}${region && !loc.includes(region) ? `, ${region}` : ""}${loc.endsWith(country) ? "" : `, ${country}`}.`];
  if (bits.length) locP.push(bits.map((b, i) => (i ? b : b[0].toUpperCase() + b.slice(1))).join("; ") + ". Las distancias son en línea recta.");
  sections.push({ h: `Dónde está: ${place}`, p: locP });
  if (km("airport") != null) faq.push(["¿A qué distancia está el aeropuerto más cercano?", `A unos ${Math.round(km("airport")!)} km en línea recta${near.airport?.name ? `: ${near.airport.name}` : ""}.`]);
  if (km("sea") != null) faq.push(["¿A qué distancia del mar está esta casa?", `A ${km("sea")! < 1 ? "menos de 1" : `unos ${Math.round(km("sea")!)}`} km en línea recta.`]);

  // 4. Preguntas frecuentes.
  const beds = r.bedrooms ? ` y ${r.bedrooms} ${r.bedrooms > 1 ? "dormitorios" : "dormitorio"}` : "";
  faq.unshift([`¿Cuánto cuesta esta casa en ${place}?`, `El precio de venta es de ${eur(r.price_eur)}${r.sqm ? ` por ${r.sqm} m²${own ? ` (unos ${eur(own)} por m²)` : ""}` : ""}${beds}.`]);
  if (ctx.dest?.can_foreigners_buy) faq.push([`¿Pueden los extranjeros comprar una casa en ${inC}?`, String(ctx.dest.can_foreigners_buy)]);
  faq.push(["¿Vende RealHunt esta casa?", `No. RealHunt no es una inmobiliaria: revisa y puntúa casas y enlaza al anuncio original${r.source_domain ? ` en ${r.source_domain}` : ""}, así que tratas directamente con el vendedor o su agente.`]);
  if (notStated) sections.push(notStated);
  return { sections, faq };
}
