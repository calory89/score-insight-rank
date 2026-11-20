// Spanish wording of the listing pages, written in Spanish (not translated string by string): seo/listings/pack.ts
// says what each entry is for. The generic word is "vivienda", so the sentences agree whatever the page lists.
import { esPlace } from "../../src/lib/lang";
import { theEs } from "../../src/community/seo2data";
import type { Pack, Facts, Form, Named } from "./pack";
import { areaBySlug, cityBySlug, NEAR_KM } from "./places";

const NB = " ";
const num = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const money = (n: number) => `${num(n)}${NB}€`;
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];
// "Lundby, near Skælskør": the notes some homes carry in their place
// names the listing pages use that the site's own map (src/lib/lang.ts) does not carry
const LOCAL: Record<string, string> = { Crete: "Creta", Rhodes: "Rodas", Corfu: "Corfú", Evia: "Eubea", Newfoundland: "Terranova", "Prince Edward Island": "Isla del Príncipe Eduardo", "Skåne": "Escania", "Northern Sweden": "Norte de Suecia", "Central Sweden": "Centro de Suecia",
  "West Zealand": "Selandia Occidental", "South Jutland": "Jutlandia Meridional", Peloponnese: "Peloponeso", Saxony: "Sajonia", Thuringia: "Turingia", "Saxony-Anhalt": "Sajonia-Anhalt", "Greater Poland": "Gran Polonia", "Lower Silesia": "Baja Silesia", Silesia: "Silesia", Masovia: "Mazovia",
  Pomerania: "Pomerania", "West Pomerania": "Pomerania Occidental", "Warmia-Masuria": "Varmia y Masuria", Subcarpathia: "Subcarpacia", "Kuyavia-Pomerania": "Cuyavia y Pomerania", Sicily: "Sicilia", Sardinia: "Cerdeña", Apulia: "Apulia", Cyprus: "Chipre" };
const place = (n: string, _cc?: string, where?: "card") => (/^near /.test(n) ? (where === "card" ? `cerca de ${n.slice(5)}` : `la zona de ${n.slice(5)}`) : LOCAL[n] && esPlace(n) === n ? LOCAL[n] : esPlace(n));
const s = (n: number, one: string, many: string) => (n === 1 ? one : many);
const list = (l: Named[]) => l.map((x) => `${x.name} (${x.n})`).join(", ");
const upper = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
const pc = (x: string) => x.replace(/(\d)\.(\d)/g, "$1,$2").replace(/\s*[-–]\s*/g, " a ");
const dot = (x: string) => (x ? (/[.!?]$/.test(x.trim()) ? `: ${x.trim()}` : `: ${x.trim()}.`) : ".");
const range = (lo: string, hi: string) => (lo === hi ? `unos ${lo}` : `de ${lo} a ${hi}`);
const inC = (c: string) => `en ${theEs(esPlace(c))}`;

// [plural, singular, "cheap" plural, "cheapest" singular]
const NOUN = {
  house: ["casas", "casa", "casas baratas", "casa más barata"],
  apartment: ["pisos", "piso", "pisos baratos", "piso más barato"],
  mixed: ["viviendas", "vivienda", "viviendas baratas", "vivienda más barata"],
} as const;
const FORM = { many: 0, one: 1, cheap: 2, cheapest: 3 } as const;
const fem = (b: string) => !/^(\d+ )?(piso|trull|castillo|edificio)/.test(b);
const one = (f: Form) => f === "one" || f === "cheapest";
/** "añadidas", "añadido": the participle that agrees with the noun and the form. */
const agree = (b: string, f: Form, stem: string) => `${stem}${fem(b) ? "a" : "o"}${one(f) ? "" : "s"}`;
const KEYED: Record<string, (b: string, form: Form) => string> = {
  "by-the-sea": (b) => `${b} junto al mar`,
  "village-houses": (_b, f) => ["casas de pueblo", "casa de pueblo", "casas de pueblo baratas", "casa de pueblo más barata"][FORM[f]],
  "in-town": (b) => `${b} en ciudad`,
  "near-a-lake": (b) => `${b} cerca de un lago`,
  "with-garden": (b) => `${b} con jardín`,
  "with-pool": (b) => `${b} con piscina`,
  "with-sauna": (b) => `${b} con sauna`,
  "stone-houses": (_b, f) => ["casas de piedra", "casa de piedra", "casas de piedra baratas", "casa de piedra más barata"][FORM[f]],
  "cabins-and-cottages": (_b, f) => ["cabañas y casas de campo", "cabaña o casa de campo", "cabañas y casas de campo baratas", "cabaña o casa de campo más barata"][FORM[f]],
  "with-a-terrace": (b) => `${b} con terraza o balcón`,
  // 15-nov-2026
  "turnkey": (b) => `${b} para entrar a vivir`,
  "to-renovate": (b) => `${b} para reformar`,
  "with-sea-view": (b) => `${b} con vistas al mar`,
  "near-the-beach": (b) => `${b} a menos de 500 m del mar`,
  "with-land": (b) => `${b} con terreno de 1.000 m² o más`,
  "with-fireplace": (b) => `${b} con chimenea`,
  "with-garage": (b) => `${b} con garaje`,
  "on-an-island": (b) => `${b} en una isla`,
  "in-the-mountains": (b) => `${b} de montaña`,
  "with-olive-trees-or-vines": (b) => `${b} con olivos, viñas o frutales`,
  "near-an-airport": (b) => `${b} a menos de 30 km de un aeropuerto`,
  "under-500-per-sqm": (b) => `${b} por menos de 500${NB}€/m²`,
  "over-100-sqm-under-50000": (b) => `${b} de más de 100 m² por menos de 50.000${NB}€`,
  "score-90-plus": (b) => `${b} con nota de 90 o más`,
  "editors-picks": (b, f) => `${b} ${agree(b, f, "elegid")} a mano`,
  "new-this-month": (b, f) => `${b} ${agree(b, f, "añadid")} en los últimos 30 días`,
  "price-drops": (b) => `${b} con rebaja de precio`,
  "single-storey": (b) => `${b} de una sola planta`,
  "with-period-features": (b) => `${b} con elementos de época`,
  "good-weather": (b) => `${b} con 150 o más días de buen tiempo al año`,
  "quiet-location": (b) => `${b} lejos de autopistas y vías de tren`,
  "low-community-fee": (b) => `${b} con cuota de comunidad baja`,
  "cave-houses": (_b, f) => ["casas cueva", "casa cueva", "casas cueva baratas", "casa cueva más barata"][FORM[f]],
  trulli: (_b, f) => ["trulli", "trullo", "trulli baratos", "trullo más barato"][FORM[f]],
  "unusual-buildings": (_b, f) => ["castillos, molinos, iglesias y otros edificios singulares", "edificio singular", "castillos, molinos, iglesias y otros edificios singulares baratos", "edificio singular más barato"][FORM[f]],
  "with-business-premises": (b) => `${b} con local comercial`,
  "with-fibre-internet": (b) => `${b} con fibra óptica`,
  "with-tourist-licence": (b) => `${b} con licencia de alquiler turístico`,
  "new-this-week": (b, f) => `${b} ${agree(b, f, "añadid")} en los últimos 7 días`,
  "over-80-sqm": (b) => `${b} de más de 80 m²`,
  "over-120-sqm": (b) => `${b} de más de 120 m²`,
};
const ccy = (n: number, c: string) => `${num(n)} ${c === "GBP" ? "libras" : c === "USD" ? "dólares" : "euros"}`;
const areaOf = (f: { cc?: string; area?: string }) => areaBySlug(f.cc || "", f.area || "");
const cityOf = (f: { city?: string }) => cityBySlug(f.city || "")?.[2] || "";
const AMEN: Record<string, string> = { garden: "jardín", terrace: "terraza", garage: "garaje", pool: "piscina", fireplace: "chimenea", sauna: "sauna" };
const LABEL: Record<string, string> = { "by-the-sea": "Junto al mar", "village-houses": "Casas de pueblo", "in-town": "En ciudad", "near-a-lake": "Cerca de un lago", "with-garden": "Con jardín", "with-pool": "Con piscina", "with-sauna": "Con sauna", "stone-houses": "Casas de piedra", "cabins-and-cottages": "Cabañas y casas de campo", "with-a-terrace": "Con terraza", apartments: "Pisos", houses: "Casas",
  "turnkey": "Para entrar a vivir", "to-renovate": "Para reformar", "with-sea-view": "Vistas al mar", "near-the-beach": "A 500 m del mar", "with-land": "Con terreno", "with-fireplace": "Con chimenea", "with-garage": "Con garaje",
  "on-an-island": "En una isla", "in-the-mountains": "De montaña", "with-olive-trees-or-vines": "Olivos o viñas", "near-an-airport": "Cerca de un aeropuerto", "under-500-per-sqm": `Menos de 500${NB}€/m²`, "over-100-sqm-under-50000": `Más de 100 m² por menos de 50.000${NB}€`,
  "score-90-plus": "Nota 90 o más", "editors-picks": "Elegidas a mano", "new-this-month": "Nuevas este mes", "price-drops": "Rebajadas", "single-storey": "De una planta", "with-period-features": "Elementos de época", "good-weather": "Buen tiempo",
  "quiet-location": "Zona tranquila", "low-community-fee": "Comunidad baja", "cave-houses": "Casas cueva", trulli: "Trulli", "unusual-buildings": "Edificios singulares", "with-business-premises": "Con local comercial", "with-fibre-internet": "Fibra óptica", "new-this-week": "Nuevas esta semana", "over-80-sqm": "Más de 80 m²", "over-120-sqm": "Más de 120 m²", "best-rated": "Las 10 con mejor nota", "with-tourist-licence": "Licencia turística",
  cheapest: "Las más baratas", "most-space-for-the-money": "Más metros por euro" };

function what(F: Facts, form: Form = "many"): string {
  const f = F.f;
  const b = NOUN[f.kind === "ptype" ? (f.key === "apartments" ? "apartment" : "house") : F.noun][FORM[form]];
  const where = f.country ? ` ${inC(f.country)}` : "";
  const under = f.cap ? ` por menos de ${f.kind === "ccyBand" ? ccy(f.cap, f.ccy!) : money(f.cap)}` : "";
  if (f.ranked) {
    const pl = NOUN[F.noun][0], sg = NOUN[F.noun][1];
    if (f.key === "cheapest") return one(form) ? `${NOUN[F.noun][3]} en venta${where}` : `${F.n} ${pl} más ${fem(pl) ? "baratas" : "baratos"} en venta${where}`;
    if (f.key === "best-rated") return one(form) ? `${sg} con mejor nota en venta${where}` : `${F.n} ${pl} con mejor nota en venta${where}`;
    return one(form) ? `${sg} con más metros por euro en venta${where}` : `${F.n} ${pl} con más metros por euro en venta${where}`;
  }
  switch (f.kind) {
    case "combo": return f.key === "apartments" || f.key === "houses" ? `${NOUN[f.key === "apartments" ? "apartment" : "house"][FORM[form]]} en venta${where}${under}` : `${KEYED[f.key!](b, form)} en venta${where}${under}`;
    case "area": return `${b} en venta ${areaOf(f)?.inEs || ""}`;
    case "near": return `${b} en venta a menos de ${NEAR_KM} km de ${cityOf(f)}`;
    case "region": return `${b} en venta en ${place(f.region!)} (${esPlace(f.country!)})`;
    case "town": return `${b} en venta en ${f.town} (${place(f.region!)})`;
    case "regionBand": return f.area ? `${b} en venta ${areaOf(f)?.inEs || ""}${under}` : `${b} en venta en ${place(f.region!)} (${esPlace(f.country!)})${under}`;
    case "setting": case "feature": case "gfeature": return `${KEYED[f.key!](b, form)} en venta${where}`;
    case "beds": return `${b} de ${f.beds === 4 ? "4 o más dormitorios" : `${f.beds} ${s(f.beds!, "dormitorio", "dormitorios")}`} en venta${where}`;
    case "ccyBand": if (f.region) return `${b} en venta en ${place(f.region)} (${esPlace(f.country!)})${under}`; return `${b} en venta${where}${under}`;
    default: return `${b} en venta${where}${under}`;
  }
}

export const es: Pack = {
  lang: "es",
  money,
  perSqm: (n) => `${num(n)}${NB}€/m²`,
  date: (d) => `${Number(d.slice(8, 10))} de ${MONTHS[Number(d.slice(5, 7)) - 1]} de ${d.slice(0, 4)}`,
  dateShort: (d) => `${Number(d.slice(8, 10))} ${SHORT[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`,
  country: (c) => esPlace(c),
  inC,
  place,
  homeTitle: (h) => String(h.title_es || "") || null,
  homeWhy: (h) => String(h.why_great_es || ""),
  what,
  h1: (F) => (F.f.ranked ? `${fem(what(F)) ? "Las" : "Los"} ${what(F)}${F.f.country ? "" : " en RealHunt"}`
    : upper(what(F, (F.f.cap && F.f.cap <= 100000) || (["gfeature", "feature", "area", "near"].includes(F.f.kind) && F.median <= 100000) ? "cheap" : "many"))),
  title: (h1, n, min) => `${h1} (${n}, desde ${min})`,
  desc: (F, w) => `${F.f.ranked ? `${fem(w) ? "Las" : "Los"} ${w}` : `${F.n} ${w}`}, de ${money(F.min)} (${/^near /.test(F.cheapest.town) ? place(F.cheapest.town, undefined, "card") : `en ${place(F.cheapest.town, undefined, "card")}`}) a ${money(F.max)}. Precio mediano: ${money(F.median)}${F.scoreAvg ? `; nota media, ${F.scoreAvg} de 98` : ""}. Fotos, tamaños, gastos de compra y en qué fijarse.`,
  crumbRoot: "RealHunt", crumbCheap: "Casas baratas",
  crumbCountry: (c) => `Casas en ${theEs(c)}`,
  label: (f) => (f.kind === "combo" ? `${LABEL[f.key!] || f.key}, menos de ${money(f.cap!)}` : f.kind === "ccyBand" ? `Menos de ${ccy(f.cap!, f.ccy!)}` : f.kind === "area" ? areaOf(f)?.es || String(f.area) : f.kind === "near" ? `Cerca de ${cityOf(f)}`
    : f.cap ? `Menos de ${money(f.cap)}` : f.kind === "region" ? upper(place(String(f.region)).replace(/^la /, "")) : f.kind === "town" ? String(f.town) : f.kind === "beds" ? (f.beds === 4 ? "4 o más dormitorios" : `${f.beds} ${s(f.beds!, "dormitorio", "dormitorios")}`) : f.kind === "country" ? esPlace(String(f.country)) : LABEL[f.key!] || String(f.key)),
  updated: (d, newest) => `Actualizado el ${d}.${newest ? ` Última vivienda añadida el ${newest}.` : ""}`,
  l1: (n, w, min, max) => (min === max ? `RealHunt tiene hoy ${n} ${w}, al mismo precio: ${min}.` : `RealHunt tiene hoy ${n} ${w}, con precios de ${min} a ${max}.`),
  l2: (title, town, price, sqm, beds) => `La más barata cuesta ${price}: ${title}, en ${town}${sqm || beds ? ` (${[sqm ? `${sqm} m²` : "", beds ? `${beds} ${s(beds, "dormitorio", "dormitorios")}` : ""].filter(Boolean).join(", ")})` : ""}.`,
  l3: (med, pp, pMed, pPp, parent) => `El precio mediano es de ${med}${pp ? ` (${pp})` : ""}, frente a ${pMed}${pPp ? ` (${pPp})` : ""} de ${parent}.`,
  l3all: (med, pp, max, parent) => `El precio mediano es de ${med}${pp ? ` (${pp})` : ""}. Son todas ${parent}: ninguna supera los ${max}.`,
  parent: (kind, n, name, countries) => (kind === "site" ? `las ${n} viviendas de RealHunt en ${countries} países` : kind === "country" ? `las ${n} viviendas que tenemos ${name}` : `las ${n} viviendas que tenemos en ${name}`),
  kpi: { homes: "Viviendas", from: "Desde", median: "Precio mediano", ppsqm: "Mediana por m²", size: "Tamaño mediano", score: "Mejor nota" },
  n20: { costs: "Gastos de compra", foreign: "Compradores extranjeros", free: "Compra libre", limits: "Con límites", asOf: "Datos del", regionsTitle: (inC) => `Precio mediano por región ${inC}`, region: "Región", neighbours: "Países vecinos", siteMap: (inC) => `Mapa del sitio: todas las páginas y casas ${inC}` },
  gridTitle: (n, shown) => (n === shown ? `Las ${n} viviendas, de mejor a peor nota` : `Las ${shown} mejores de ${n}, por nota`),
  gridMore: (shown, n) => `Se muestran las ${shown} con mejor nota de ${n} viviendas. La tabla y las búsquedas más concretas de abajo recogen el resto.`,
  card: { isNew: "Nueva", drop: (p) => `Rebajada un ${p}${NB}%`, score: "Nota", beds: (n) => `${n} dorm.`, noPhoto: "Fotos en el anuncio" },
  tableTitle: (n, shown) => (n === shown ? `Compara las ${n} viviendas, de más barata a más cara` : `Compara las ${shown} más baratas de ${n}`),
  th: { home: "Vivienda", place: "Lugar", price: "Precio", size: "Tamaño", ppsqm: "Por m²", beds: "Dorm.", score: "Nota", added: "Añadida" },
  factsTitle: (F) => (F.f.kind === "ccyBand" ? `Qué se compra con ${ccy(F.f.cap!, F.f.ccy!)}${F.f.region ? ` en ${place(F.f.region)}` : F.f.country ? ` ${inC(F.f.country)}` : ""}` : F.f.cap && F.f.kind !== "combo" ? `Qué se compra con ${money(F.f.cap)}${F.f.area ? ` ${areaOf(F.f)?.inEs || ""}` : F.f.region ? ` en ${place(F.f.region)}` : F.f.country ? ` ${inC(F.f.country)}` : ""}` : `Las ${F.n} viviendas en cifras`),
  fSize: (med, max, title) => `Tamaño: la mitad tiene ${med} m² o más. La más grande tiene ${max} m²: ${title}.`,
  fBeds: (b, unknown) => `Dormitorios: ${b.map(([k, n], i) => `${n} con ${k === 4 ? "4 o más" : k}${i === 0 ? ` ${k === 1 ? "dormitorio" : "dormitorios"}` : ""}`).join(", ")}${unknown ? `; ${unknown} ${s(unknown, "anuncio no lo indica", "anuncios no lo indican")}` : ""}.`,
  fType: (a, h) => `Tipo: ${[a ? `${a} ${s(a, "piso", "pisos")}` : "", h ? `${h} ${s(h, "casa", "casas")}` : ""].filter(Boolean).join(" y ")}.`,
  fSetting: (sea, v, t) => `Entorno: ${[sea ? `${sea} junto al mar` : "", v ? `${v} en pueblos` : "", t ? `${t} en ciudad` : ""].filter(Boolean).join(", ")}.`,
  fWhere: (l) => `Dónde: ${list(l)}.`,
  fTowns: (l) => `Localidades: ${list(l)}.`,
  fCountries: (l, more) => `Países: ${list(l)}${more ? ` y ${more} más` : ""}.`,
  fStep: (from, to, n, title, nota, price) => `Entre ${from} y ${to}: ${n} ${s(n, "vivienda", "viviendas")}. La de mejor nota entre ellas (nota ${nota}, ${price}): ${title}.`,
  fNext: (next, add) => `Subir el presupuesto a ${next} añade ${add} ${s(add, "vivienda", "viviendas")} más.`,
  fRegions: (low, high) => `Precio mediano más bajo: ${low.name}, ${low.median} entre ${low.n} viviendas. El más alto: ${high.name}, ${high.median} entre ${high.n}.`,
  fScore: (min, max, title) => (min === max ? `Notas: todas tienen un ${max} sobre 98. La primera de la lista: ${title}.` : `Notas: de ${min} a ${max} sobre 98. La de mejor nota: ${title}.`),
  fNew: (n30, title, date) => `La más reciente, añadida el ${date}: ${title}.${n30 ? ` ${n30} de estas viviendas ${s(n30, "se añadió", "se añadieron")} en los últimos 30 días.` : ""}`,
  costsTitle: (c) => `Gastos de compra y normas para extranjeros ${c}`,
  cForeign: (t) => `¿Pueden comprar los extranjeros? ${t}`,
  cCosts: (pct, br, med, lo, hi, tLo, tHi) => `Los impuestos y gastos añaden alrededor de un ${pc(pct)}${NB}% al precio${dot(br)} En la vivienda mediana de esta página (${med}) son ${range(lo, hi)}, es decir, ${range(tLo, tHi)} en total.`,
  cAllIn: (cap, maxAsk, fit, n) => `Para que toda la compra quepa en ${cap}, busca precios de venta de hasta unos ${maxAsk}: ${fit === n ? `las ${n} viviendas de esta página cumplen` : fit ? `${fit} de estas ${n} viviendas ${s(fit, "cumple", "cumplen")}` : `ninguna de estas ${n} viviendas cumple`}.`,
  cTax: (t) => `Impuesto anual sobre la propiedad: ${t}`,
  cExamples: (rows) => `Con los mismos porcentajes: ${rows.map(([p, lo, hi]) => `sobre ${p}, ${range(lo, hi)}`).join("; ")}.`,
  firstTitle: "¿Puedes comprar aquí? Lee esto primero",
  cNote: (asOf) => `Información general, no asesoramiento fiscal ni legal.${asOf ? ` Datos revisados en ${asOf}.` : ""}`,
  cLinks: { calc: (c) => `Calculadora de gastos de compra ${c}`, detail: "Todos los gastos e impuestos", guide: "Cómo comprar, paso a paso", nat: "Normas según tu nacionalidad" },
  costTableTitle: "Gastos de compra en los países de esta página", costTh: { country: "País", homes: "Viviendas aquí", from: "Desde", costs: "Impuestos y gastos" },
  watchTitle: "En qué fijarse antes de comprar",
  wNoSqm: (k, n) => `${k} de los ${n} anuncios ${s(k, "no indica", "no indican")} la superficie, así que su precio por m² no se puede comparar.`,
  wHoa: (k, min, max) => `${k} ${s(k, "anuncio indica", "anuncios indican")} la cuota mensual de comunidad, ${min === max ? `de ${min}` : `de ${min} a ${max}`}. Súmala a tus gastos anuales.`,
  wHoaUnknown: (k) => `${k} ${s(k, "está", "están")} en un edificio o una urbanización con gastos comunes, pero el anuncio no dice la cuota: pídela por escrito.`,
  wWhyCheap: (title, t) => (t ? `Un precio bajo tiene un motivo. ${title}: ${t}` : `Un precio bajo tiene un motivo, y ${title} explica el suyo en su ficha.`),
  wFlood: (k, n) => `${k} de ${n} ${s(k, "está", "están")} donde nuestra comprobación orientativa de inundación da riesgo medio o alto. La ficha de cada vivienda enlaza el mapa oficial.`,
  wNoise: (k, n) => `${k} de ${n} ${s(k, "está", "están")} cerca de una autopista, una vía de tren o un aeropuerto (ruido alto en nuestra comprobación).`,
  wOld: (k, n) => `${k} de ${n} ${s(k, "se añadió", "se añadieron")} hace más de 60 días. Pregunta a la agencia si ${s(k, "sigue", "siguen")} en venta antes de organizar un viaje.`,
  wSold: (k) => `${k} ${s(k, "ha sido señalada por un visitante como posiblemente vendida y se está revisando", "han sido señaladas por un visitante como posiblemente vendidas y se están revisando")}.`,
  wApprox: (k, n) => `${k} de ${n} ${s(k, "muestra", "muestran")} una posición aproximada en el mapa: el anuncio da la localidad, no la calle.`,
  wDims: (weak, wa, strong, sa) => `En conjunto, estas viviendas puntúan más bajo en ${weak} (${wa}/100 de media) y más alto en ${strong} (${sa}/100).`,
  wRental: (t) => `¿Piensas alquilarla? ${t}`,
  dim: (k) => ({ price: "precio", value: "precio por m²", space: "espacio", condition: "estado para entrar a vivir", extras: "extras", water: "cercanía al mar o a un lago", weather: "días de buen tiempo", access: "cercanía a un aeropuerto", costs: "gastos de compra" } as Record<string, string>)[k] || k,
  faqTitle: "Preguntas de quienes compran",
  qCheapest: (x) => `¿Cuál es ${fem(x) ? "la" : "el"} ${x}?`,
  aCheapest: (title, town, price, sqm, beds, nota) => `${title}, en ${town}, anunciada por ${price}${sqm ? `, con ${sqm} m²` : ""}${beds ? `${sqm ? " y" : ", con"} ${beds} ${s(beds, "dormitorio", "dormitorios")}` : ""}.${nota ? ` Su nota en RealHunt es ${nota}.` : ""}`,
  qCount: (w) => `¿${fem(w) ? "Cuántas" : "Cuántos"} ${w} hay?`,
  aCount: (n, date, parent, n30) => `${n}, a fecha de ${date}${parent ? `, de ${parent}` : ""}.${n30 ? ` ${n30} ${s(n30, "se añadió", "se añadieron")} en los últimos 30 días.` : ""}`,
  qSize: (w) => `¿Qué tamaño tienen ${fem(w) ? "las" : "los"} ${w}?`,
  aSize: (med, beds, max, town) => `La mediana es de ${med} m²${beds ? ` y lo más habitual son ${beds === 4 ? "4 o más dormitorios" : `${beds} ${s(beds, "dormitorio", "dormitorios")}`}` : ""}. La más grande tiene ${max} m², en ${town}.`,
  qAllIn: (cap, c) => `¿Bastan ${cap} para comprar una vivienda ${c} con impuestos y gastos incluidos?`,
  aAllIn: (cap, pct, lo, hi, maxAsk, fit) => `No si el precio de venta es de ${cap}: con alrededor de un ${pc(pct)}${NB}% de impuestos y gastos, el total es ${range(lo, hi)}. Para no pasar de ${cap} en total, busca precios de hasta unos ${maxAsk}; ${fit ? `${fit} ${s(fit, "vivienda de esta página cumple", "viviendas de esta página cumplen")}` : "ninguna vivienda de esta página cumple"}.`,
  qWhere: (w) => `¿Dónde están ${fem(w) ? "las" : "los"} ${w}?`,
  aWhere: (l) => `Sobre todo en ${list(l)}.`,
  qPrice: (one) => `¿Cuánto cuesta ${fem(one) ? "una" : "un"} ${one}?`,
  aPrice: (min, med, pp, max, n) => `Los precios de venta van de ${min} a ${max} entre ${n} viviendas. La mediana es de ${med}${pp ? ` (${pp})` : ""}.`,
  qForeign: (c) => `¿Pueden los extranjeros comprar una casa ${c}?`,
  qCosts: (c) => `¿Cuáles son los gastos de compra ${c}?`,
  aCosts: (pct, br, med, lo, hi) => `Alrededor de un ${pc(pct)}${NB}% además del precio${dot(br)} En la vivienda mediana de esta página (${med}) son ${range(lo, hi)}. Información general, no asesoramiento fiscal.`,
  qRegion: (c) => `¿Cuál es la región más barata ${c}?`,
  aRegion: (low, high) => `Entre las regiones con al menos 3 viviendas en RealHunt, ${low.name} tiene el precio mediano más bajo, ${low.median} entre ${low.n} viviendas, y ${high.name} el más alto, ${high.median}.`,
  qVs: (place, wider) => `¿Son más baratas las viviendas en ${place} que en el resto de ${theEs(wider)}?`,
  aVs: (place, wider, med, pMed, pct, n, pn) => `El precio mediano en ${place} es de ${med} entre ${n} viviendas, ${pct < 0 ? `un ${-pct}${NB}% por debajo de` : pct > 0 ? `un ${pct}${NB}% por encima de` : "igual que"} la mediana de ${pMed} de las ${pn} viviendas que tenemos en ${theEs(wider)}.`,
  qCountries: (w) => `¿En qué países hay ${w}?`,
  aCountries: (l) => `Hoy en RealHunt: ${list(l)}.`,
  moreTitle: (F) => (F.f.country ? `Más búsquedas ${inC(F.f.country)}` : "Más búsquedas"),
  more: { budget: "Por presupuesto", region: "Por región", setting: "Por entorno", type: "Por tipo", beds: "Por dormitorios", feature: "Por característica", town: "Por localidad", elsewhere: (l) => `${l} en otros países`, countries: "Por país", all: "Todas las búsquedas de casas baratas",
    area: "Por zona", combo: "Por característica y presupuesto", ccy: "En libras y en dólares", near: "Cerca de una ciudad", ranked: "Clasificaciones" },
  ccy,
  city: (slug) => cityBySlug(slug)?.[2] || slug,
  how: (F, v) => {
    const f = F.f;
    if (f.ranked && f.key === "best-rated") return `Son las ${F.n} notas más altas de RealHunt entre ${v.parent}, de mayor a menor. Cada tarjeta dice en una línea por qué la vivienda está en RealHunt. La lista cambia cuando se añade, se vende o se vuelve a puntuar una vivienda.`;
    if (f.ranked) return f.key === "cheapest"
      ? `Son los ${F.n} precios de venta más bajos entre ${v.parent}, de menor a mayor. La lista cambia cada vez que se añade, se vende o se rebaja una vivienda.`
      : `Son los ${F.n} precios por m² más bajos entre las ${v.total} viviendas cuyo anuncio indica la superficie, de ${v.parent}. Un precio por m² bajo suele corresponder a una casa grande en un lugar donde busca poca gente.`;
    if (f.kind === "ccyBand") return `${upper(v.cap)} son ${v.eur} al tipo de referencia del Banco Central Europeo del ${v.date} (1${NB}€ = ${v.rate.replace(".", ",")} ${f.ccy === "GBP" ? "libras" : "dólares"}). Las viviendas se venden en euros o en su moneda local: los importes en ${f.ccy === "GBP" ? "libras" : "dólares"} de esta página son aproximados y cambian con el tipo de cambio.`;
    if (f.kind === "near") return `En esta lista: viviendas a menos de ${NEAR_KM} km del centro de ${cityOf(f)} en línea recta. Por carretera la distancia es mayor, así que comprueba el trayecto antes de contar con ir y volver a diario.`;
    if (f.kind === "area") { const a = areaOf(f); return a ? `Aquí ${a.es} son las viviendas que tenemos en ${a.hoods ? "estos barrios: " : ""}${v.regions}${a.sea ? " y que están junto al mar (a 5 km o menos de la orilla, o anunciadas como vivienda de playa)" : ""}.` : ""; }
    const HOW: Record<string, string> = {
      "turnkey": "En esta lista: viviendas cuyo anuncio dice con palabras que están listas para entrar a vivir o reformadas por completo. No las hemos inspeccionado: pide la fecha de la obra y las facturas.",
      "to-renovate": "En esta lista: viviendas cuyo anuncio dice que necesitan reforma o que se venden como proyecto. Los anuncios casi nunca dan el coste de la obra: pide un presupuesto por escrito a un constructor de la zona antes de hacer una oferta.",
      "with-sea-view": "En esta lista: viviendas cuyo anuncio indica en el texto que tienen vistas al mar. A veces la vista es un trozo de mar entre tejados, así que mira las fotos y el mapa.",
      "near-the-beach": "En esta lista: viviendas cuya distancia medida a la orilla es de 500 m o menos en línea recta. Andando puede ser más.",
      "with-land": "En esta lista: viviendas cuyo anuncio indica un terreno de 1.000 m² o más, en m², hectáreas o acres. Comprueba la cifra en el registro o el catastro antes de comprar.",
      "with-fireplace": "En esta lista: viviendas cuyo anuncio muestra o menciona una chimenea. Pregunta si el tiro está limpio y revisado.",
      "with-garage": "En esta lista: viviendas cuyo anuncio menciona un garaje.",
      "on-an-island": "En esta lista: viviendas en islas que la gente busca por su nombre, de Tenerife y Sicilia a Creta y Fionia. Quedan fuera las islas del tamaño de un país.",
      "in-the-mountains": "En esta lista: viviendas cuyo anuncio las sitúa en la montaña, con vistas a la sierra o cerca de una estación de esquí.",
      "with-olive-trees-or-vines": "En esta lista: viviendas cuyo anuncio menciona olivos, viñas, un huerto de frutales o árboles frutales.",
      "near-an-airport": "En esta lista: viviendas cuyo aeropuerto más cercano está a 30 km o menos en línea recta. Por carretera la distancia es mayor.",
      "under-500-per-sqm": `En esta lista: viviendas cuyo precio de venta dividido entre la superficie del anuncio da menos de 500${NB}€ por m². Un anuncio que no indica la superficie no puede estar en ella.`,
      "over-100-sqm-under-50000": `En esta lista: viviendas de 100 m² o más con un precio de venta de 50.000${NB}€ o menos.`,
      "score-90-plus": "En esta lista: viviendas con una nota de RealHunt de 90 o más sobre 98. La nota compara precio, espacio, estado, entorno y gastos de compra con todas las demás viviendas de la web.",
      "editors-picks": "En esta lista: viviendas que una persona del equipo de RealHunt marcó como destacadas después de revisar el anuncio. Nadie paga por aparecer aquí.",
      "new-this-month": "En esta lista: viviendas añadidas a RealHunt en los últimos 30 días.",
      "price-drops": "En esta lista: viviendas cuyo precio de venta ha bajado desde que las publicamos. La rebaja es la diferencia entre el primer precio que vimos y el de hoy.",
      "single-storey": "En esta lista: viviendas cuyo anuncio dice que están en una sola planta, sin escaleras entre las estancias.",
      "with-period-features": "En esta lista: viviendas cuyo anuncio indica su antigüedad o sus elementos de época: el siglo, vigas o suelos originales, techos abovedados, entramado de madera o edificio protegido. No tenemos el año de construcción de todas las viviendas.",
      "good-weather": "En esta lista: viviendas en lugares con 150 o más días de buen tiempo al año según las medias climáticas: máxima de 18 a 33 °C, sin lluvia y con poco viento.",
      "quiet-location": "En esta lista: viviendas sin autopista ni vía de tren cerca según OpenStreetMap y con ruido bajo en nuestra comprobación de carreteras, trenes y aeropuertos. Es una comprobación sobre el mapa, no una medición de sonido.",
      "low-community-fee": "En esta lista: viviendas cuyo anuncio indica una cuota mensual de comunidad de 250 o menos en su moneda (euros, dólares o libras). La mayoría de los anuncios no indica la cuota, así que no pueden estar en ella.",
      "cave-houses": "En esta lista: viviendas que el anuncio describe como casa cueva.",
      trulli: "En esta lista: viviendas que el anuncio describe como trullo.",
      "unusual-buildings": "En esta lista: viviendas cuyo título nombra un castillo, una casa señorial, un molino, una casa torre o una antigua iglesia, escuela o estación.",
      "with-business-premises": "En esta lista: viviendas cuyo título nombra una tienda, un bar, un restaurante, un alojamiento u otro local comercial que se vende con la vivienda. Que el negocio se pueda reabrir depende de las licencias municipales: pregunta en el ayuntamiento.",
      "with-fibre-internet": "En esta lista: viviendas cuyo anuncio indica fibra óptica o internet de alta velocidad. No probamos las conexiones: pide al vendedor una prueba de velocidad reciente.",
      "with-tourist-licence": "En esta lista: viviendas cuyo anuncio indica una licencia de alquiler turístico. La licencia puede caducar con la venta: pregunta en el ayuntamiento antes de contar con ella.",
      "new-this-week": "En esta lista: viviendas añadidas a RealHunt en los últimos 7 días. La lista se rehace cada día.",
      "over-80-sqm": "En esta lista: viviendas cuyo anuncio indica más de 80 m² construidos. Un anuncio sin superficie no puede estar en ella.",
      "over-120-sqm": "En esta lista: viviendas cuyo anuncio indica más de 120 m² construidos. Un anuncio sin superficie no puede estar en ella.",
    };
    return (f.kind === "feature" || f.kind === "gfeature") && f.key ? HOW[f.key] || "" : "";
  },
  l1rank: (w, min, max) => `${fem(w) ? "Las" : "Los"} ${w} que RealHunt tiene hoy cuestan de ${min} a ${max}.`,
  gridTitleRank: (key, n) => (key === "best-rated" ? `Las ${n} viviendas, de mayor a menor nota` : key === "cheapest" ? `Las ${n} viviendas, de más barata a más cara` : `Las ${n} viviendas, de menor a mayor precio por m²`),
  x: {
    amen: (l) => `Extras que mencionan los anuncios: ${l.map(([k, n]) => `${n} con ${AMEN[k] || k}`).join(", ")}.`,
    airport: (med, title, km, _name, _l, code, codes) => `Aeropuertos: la distancia mediana es de ${med} km. La vivienda más cercana es ${title}, a ${km < 1 ? "menos de 1" : km} km del aeropuerto${code ? ` ${code}` : ""}.${codes.some((c) => c.name) ? ` Aeropuertos más cercanos, por su código: ${list(codes.filter((c) => c.name))}.` : ""}`,
    sea: (n, med, title, m) => `Distancia al mar, medida en ${n} de estas viviendas: ${num(m)} m la más cercana (${title}) y una mediana de ${num(med)} m.`,
    plot: (med, title, m2) => `Terreno: la parcela mediana tiene ${num(med)} m². La mayor tiene ${num(m2)} m²: ${title}.`,
    ppsqm: (title, low, high) => `Precio por m²: de ${low} (${title}) a ${high}.`,
    score: (n, pct, parent, n95) => `${n} viviendas tienen una nota de 90 o más: el ${pct}${NB}% de ${parent}.${n95 ? ` ${n95} de ellas ${s(n95, "tiene", "tienen")} 95 o más.` : ""}`,
    fee: (n, min, max, yMin, yMax) => `Cuotas de comunidad indicadas en ${n} anuncios: ${min === max ? min : `de ${min} a ${max}`} al mes, es decir, ${yMin === yMax ? yMin : `de ${yMin} a ${yMax}`} al año.`,
    drop: (title, pct, amount, med) => `La mayor rebaja: un ${pct}${NB}% (${amount}) en ${title}. La rebaja mediana de esta página es del ${med}${NB}%.`,
    days: (med, title, v) => `Días de buen tiempo: una mediana de ${med} al año. La que más tiene, ${v}: ${title}.`,
    elev: (n, med, title, v) => `Altitud, conocida en ${n} de estas viviendas: una mediana de ${num(med)} m. La más alta, a ${num(v)} m: ${title}.`,
    islands: (l) => `Islas: ${list(l)}.`,
    dist: (city, med, title, km, far) => `Distancia a ${city} en línea recta: de ${km < 1 ? "menos de 1" : km} km (${title}) a ${far} km, con una mediana de ${med} km.`,
    rank: (key, n, title, v, of) => (key === "best-rated" ? `El corte de hoy está en una nota de ${v}: ${title} es la número ${n} de ${of}.` : key === "cheapest" ? `El corte de hoy está en ${v}: ${title} es la número ${n} de ${of}.` : `El corte de hoy está en ${v}: ${title} es la número ${n} de las ${of} viviendas con superficie indicada.`),
    vs: (other, med, n, oMed, on, pct) => `Frente a ${other}: la mediana aquí es de ${med} entre ${n} viviendas, un ${pct}${NB}% por debajo de la mediana de ${oMed} de las ${on} viviendas que tenemos allí.`,
  },
  noteSource: "Fuente", noteAsOf: (asOf) => `Revisado en ${asOf}. Información general, no asesoramiento legal ni fiscal.`,
  season: { title: "De temporada", winter: "Para el invierno", summer: "Para el verano" },
  allIn: (c, n) => `Las ${n} viviendas ${c}`,
  sources: (l) => `Estos anuncios proceden de ${l.map(([d, n]) => `${d} (${n})`).join(", ")}.`,
  notAgent: "RealHunt no es una inmobiliaria y no vende estas viviendas: cada una enlaza a su anuncio original y una persona la revisó antes de publicarla.",
  alert: (c) => `Avísame por correo de viviendas nuevas ${c}`,
  filter: "Filtrar y ordenar estas viviendas",
  method: "Cómo funciona la nota",
  moved: "Esta página se ha movido.",
};
