// Spanish wording of the listing pages, written in Spanish (not translated string by string): seo/listings/pack.ts
// says what each entry is for. The generic word is "vivienda", so the sentences agree whatever the page lists.
import { esPlace } from "../../src/lib/lang";
import { theEs } from "../../src/community/seo2data";
import type { Pack, Facts, Form, Named } from "./pack";

const NB = " ";
const num = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const money = (n: number) => `${num(n)}${NB}€`;
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];
// "Lundby, near Skælskør": the notes some homes carry in their place
const place = (n: string, _cc?: string, where?: "card") => (/^near /.test(n) ? (where === "card" ? `cerca de ${n.slice(5)}` : `la zona de ${n.slice(5)}`) : esPlace(n));
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
const fem = (b: string) => !/^piso/.test(b);
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
};
const LABEL: Record<string, string> = { "by-the-sea": "Junto al mar", "village-houses": "Casas de pueblo", "in-town": "En ciudad", "near-a-lake": "Cerca de un lago", "with-garden": "Con jardín", "with-pool": "Con piscina", "with-sauna": "Con sauna", "stone-houses": "Casas de piedra", "cabins-and-cottages": "Cabañas y casas de campo", "with-a-terrace": "Con terraza", apartments: "Pisos", houses: "Casas" };

function what(F: Facts, form: Form = "many"): string {
  const f = F.f;
  const b = NOUN[f.kind === "ptype" ? (f.key === "apartments" ? "apartment" : "house") : F.noun][FORM[form]];
  const where = f.country ? ` ${inC(f.country)}` : "";
  const under = f.cap ? ` por menos de ${money(f.cap)}` : "";
  switch (f.kind) {
    case "region": return `${b} en venta en ${place(f.region!)} (${esPlace(f.country!)})`;
    case "town": return `${b} en venta en ${f.town} (${place(f.region!)})`;
    case "regionBand": return `${b} en venta en ${place(f.region!)} (${esPlace(f.country!)})${under}`;
    case "setting": case "feature": case "gfeature": return `${KEYED[f.key!](b, form)} en venta${where}`;
    case "beds": return `${b} de ${f.beds === 4 ? "4 o más dormitorios" : `${f.beds} ${s(f.beds!, "dormitorio", "dormitorios")}`} en venta${where}`;
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
  h1: (F) => upper(what(F, (F.f.cap && F.f.cap <= 100000) || (["gfeature", "feature"].includes(F.f.kind) && F.median <= 100000) ? "cheap" : "many")),
  title: (h1, n, min) => `${h1} (${n}, desde ${min})`,
  desc: (F, w) => `${F.n} ${w}, de ${money(F.min)} a ${money(F.max)}. Precio mediano: ${money(F.median)}. Fotos, tamaños, notas, gastos de compra y en qué fijarse.`,
  crumbRoot: "RealHunt", crumbCheap: "Casas baratas",
  crumbCountry: (c) => `Casas en ${theEs(c)}`,
  label: (f) => (f.cap ? `Menos de ${money(f.cap)}` : f.kind === "region" ? upper(place(String(f.region)).replace(/^la /, "")) : f.kind === "town" ? String(f.town) : f.kind === "beds" ? (f.beds === 4 ? "4 o más dormitorios" : `${f.beds} ${s(f.beds!, "dormitorio", "dormitorios")}`) : f.kind === "country" ? esPlace(String(f.country)) : LABEL[f.key!] || String(f.key)),
  updated: (d, newest) => `Actualizado el ${d}.${newest ? ` Última vivienda añadida el ${newest}.` : ""}`,
  l1: (n, w, min, max) => (min === max ? `RealHunt tiene hoy ${n} ${w}, al mismo precio: ${min}.` : `RealHunt tiene hoy ${n} ${w}, con precios de ${min} a ${max}.`),
  l2: (title, town, price, sqm, beds) => `La más barata cuesta ${price}: ${title}, en ${town}${sqm || beds ? ` (${[sqm ? `${sqm} m²` : "", beds ? `${beds} ${s(beds, "dormitorio", "dormitorios")}` : ""].filter(Boolean).join(", ")})` : ""}.`,
  l3: (med, pp, pMed, pPp, parent) => `El precio mediano es de ${med}${pp ? ` (${pp})` : ""}, frente a ${pMed}${pPp ? ` (${pPp})` : ""} de ${parent}.`,
  l3all: (med, pp, max, parent) => `El precio mediano es de ${med}${pp ? ` (${pp})` : ""}. Son todas ${parent}: ninguna supera los ${max}.`,
  parent: (kind, n, name, countries) => (kind === "site" ? `las ${n} viviendas de RealHunt en ${countries} países` : kind === "country" ? `las ${n} viviendas que tenemos ${name}` : `las ${n} viviendas que tenemos en ${name}`),
  kpi: { homes: "Viviendas", from: "Desde", median: "Precio mediano", ppsqm: "Mediana por m²", size: "Tamaño mediano", score: "Mejor nota" },
  gridTitle: (n, shown) => (n === shown ? `Las ${n} viviendas, de mejor a peor nota` : `Las ${shown} mejores de ${n}, por nota`),
  gridMore: (shown, n) => `Se muestran las ${shown} con mejor nota de ${n} viviendas. La tabla y las búsquedas más concretas de abajo recogen el resto.`,
  card: { isNew: "Nueva", drop: (p) => `Rebajada un ${p}${NB}%`, score: "Nota", beds: (n) => `${n} dorm.`, noPhoto: "Fotos en el anuncio" },
  tableTitle: (n, shown) => (n === shown ? `Compara las ${n} viviendas, de más barata a más cara` : `Compara las ${shown} más baratas de ${n}`),
  th: { home: "Vivienda", place: "Lugar", price: "Precio", size: "Tamaño", ppsqm: "Por m²", beds: "Dorm.", score: "Nota", added: "Añadida" },
  factsTitle: (F) => (F.f.cap ? `Qué se compra con ${money(F.f.cap)}${F.f.region ? ` en ${place(F.f.region)}` : F.f.country ? ` ${inC(F.f.country)}` : ""}` : `Las ${F.n} viviendas en cifras`),
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
  more: { budget: "Por presupuesto", region: "Por región", setting: "Por entorno", type: "Por tipo", beds: "Por dormitorios", feature: "Por característica", town: "Por localidad", elsewhere: (l) => `${l} en otros países`, countries: "Por país", all: "Todas las búsquedas de casas baratas" },
  allIn: (c, n) => `Las ${n} viviendas ${c}`,
  sources: (l) => `Estos anuncios proceden de ${l.map(([d, n]) => `${d} (${n})`).join(", ")}.`,
  notAgent: "RealHunt no es una inmobiliaria y no vende estas viviendas: cada una enlaza a su anuncio original y una persona la revisó antes de publicarla.",
  alert: (c) => `Avísame por correo de viviendas nuevas ${c}`,
  filter: "Filtrar y ordenar estas viviendas",
  method: "Cómo funciona la nota",
  moved: "Esta página se ha movido.",
};
