// "In the centre" as real geography (8-nov-2026). Carlos: "I said in the centre of Seville and they show me towns or
// the outskirts of Seville." The parser already reads "en el centro", "city centre", "downtown"... (words.ts
// CENTRAL_RE); this file decides whether a listing IS in the centre. Pure: the edge function (Deno) and vitest load it.
//   centreFor(place, country)   the city-centre point of a city we know (built-in table below), with its radius and
//                               the names of its central and next-to-the-centre districts
//   centreFromGeocode(...)      the same from a Nominatim answer, for cities not in the table (index.ts geocodes once
//                               and keeps the answer in the job, so a city is looked up at most once per search)
//   centreFit(centre, x)        where a listing stands: "central" (within the radius by its map position, or no map
//                               position but a central district named), "near" (no map position, a district next to
//                               the centre, e.g. Triana), "outside" (map position beyond the radius) or "unknown"
//   centreFact / centreNote     "1.2 km from the centre" for the card, and the honest note when nothing central passed
//
// Rules (decided 8-nov-2026, see the PR):
//  - The map position wins. A listing with coordinates counts as central only within the city's radius of the centre
//    point: about 1.5 km in small and medium cities, 1.8 km in Sevilla and Valencia (a compact old town: Doctor
//    Fedriani or León XIII, 2 km north, are not "the centre" to anyone there), 2.5 km in Madrid, Barcelona and Miami,
//    3 km in huge cities (London, Paris, Rome, New York...). Coordinates more than 60 km away are a portal error: ignored.
//  - Without coordinates, only a district named in the listing's own place text decides: the city's central districts
//    (Sevilla: Casco Antiguo and its barrios Arenal, Santa Cruz, Alfalfa, Encarnación, San Vicente, San Lorenzo, Feria,
//    Museo, San Julián, San Gil...) count as central; the districts right next to it (Sevilla: Triana, Los Remedios,
//    San Bernardo, Nervión) count as "near the centre" and are shown with that label. Anything else is unknown and is
//    never shown as central. Generic words ("centro", "casco antiguo", "downtown") count only for cities without a list.
//  - Another town is never the centre: "Camas Centro Urbano" is the centre of Camas, not of Sevilla (the coordinates say so).

const norm = (s: string) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

export type Centre = {
  /** the city's name as shown ("Sevilla") */
  name: string;
  country: string;
  lat: number;
  lng: number;
  /** a listing within this many km of the centre point is central */
  r_km: number;
  /** what the centre point is ("Plaza Nueva") */
  label?: string;
  /** districts / barrios that are the centre (accents removed, lower case) */
  central: string[];
  /** districts right next to the centre: shown as "near the centre" when a listing has no map position */
  near: string[];
  src: "table" | "geocoded";
};

// name|alias = lat,lng,radius km,country,label ; central districts ; near districts
const TABLE = `
sevilla|seville = 37.3891,-5.9845,1.8,Spain,Plaza Nueva ; casco antiguo, arenal, santa cruz, alfalfa, encarnacion, regina, san vicente, san lorenzo, feria, alameda, museo, san julian, san gil, san bartolome, juderia, centro ; triana, los remedios, san bernardo, nervion
madrid = 40.4169,-3.7035,2.5,Spain,Puerta del Sol ; centro, sol, palacio, embajadores, lavapies, cortes, huertas, justicia, chueca, universidad, malasana, opera, la latina ; salamanca, recoletos, retiro, jeronimos, chamberi, arguelles, trafalgar, almagro
barcelona = 41.3870,2.1701,2.5,Spain,Plaça de Catalunya ; ciutat vella, gotic, gothic, raval, born, sant pere, barceloneta, dreta de l eixample ; eixample, sant antoni, gracia, poble sec, fort pienc, antiga esquerra
valencia = 39.4699,-0.3763,1.8,Spain,Plaza del Ayuntamiento ; ciutat vella, el carme, la seu, la xerea, el pilar, el mercat, sant francesc, carmen ; eixample, ruzafa, russafa, extramurs, pla del remei, gran via
malaga = 36.7213,-4.4214,1.5,Spain,Plaza de la Constitución ; centro, centro historico, soho, la merced, el perchel, ensanche centro ; la malagueta, el ejido, lagunillas, la trinidad, la goleta
cordoba = 37.8847,-4.7792,1.5,Spain,Plaza de las Tendillas ; centro, juderia, san pedro, san lorenzo, santa marina, la magdalena, san andres ; ciudad jardin, vista alegre
zaragoza = 41.6560,-0.8773,1.5,Spain,Plaza del Pilar ; centro, casco historico, el tubo, san pablo ; universidad, delicias
granada = 37.1755,-3.5986,1.5,Spain,Plaza Isabel la Católica ; centro, albaicin, realejo, sagrario, san matias ; figares, ronda, la chana
alicante = 38.3452,-0.4810,1.5,Spain,Ayuntamiento ; centro, casco antiguo, santa cruz, ensanche diputacion, mercado ; benalua, san blas
bilbao = 43.2590,-2.9240,1.5,Spain,Teatro Arriaga ; casco viejo, abando, indautxu ; deusto, bilbao la vieja
palma|palma de mallorca = 39.5713,2.6502,1.5,Spain,Plaza Mayor ; centre, centro, casc antic, la lonja, sa gerreria, el terreno ; santa catalina, son espanyolet
murcia = 37.9838,-1.1280,1.5,Spain,Catedral ; centro, san bartolome, santa eulalia, san nicolas ; vista alegre, el carmen
cadiz = 36.5297,-6.2925,1.2,Spain,Plaza de San Juan de Dios ; casco antiguo, centro, la vina, santa maria, el populo ; extramuros
marbella = 36.5101,-4.8826,1.2,Spain,Plaza de los Naranjos ; casco antiguo, centro ; milla de oro
san sebastian|donostia = 43.3236,-1.9840,1.5,Spain,Parte Vieja ; parte vieja, centro, alde zaharra ; gros, amara
lisbon|lisboa = 38.7107,-9.1365,2,Portugal,Baixa ; baixa, chiado, alfama, bairro alto, mouraria, castelo, rossio, santa maria maior, misericordia ; avenida da liberdade, principe real, santo antonio, graca, cais do sodre, estrela, arroios
porto|oporto = 41.1488,-8.6110,1.5,Portugal,Avenida dos Aliados ; baixa, ribeira, aliados, se, vitoria, cedofeita, bolhao, sao nicolau, santo ildefonso ; bonfim, massarelos, miragaia
faro = 37.0163,-7.9351,1.2,Portugal,Jardim Manuel Bivar ; centro, se, cidade velha ; sao pedro
rome|roma = 41.8960,12.4823,3,Italy,Piazza Venezia ; centro storico, trevi, monti, trastevere, campo marzio, pigna, parione, regola ; prati, esquilino, testaccio
milan|milano = 45.4642,9.1900,2.5,Italy,Duomo ; centro storico, brera, duomo, magenta ; porta romana, navigli, porta venezia, isola
firenze|florence = 43.7731,11.2560,1.5,Italy,Duomo ; centro storico, santa croce, san lorenzo, santo spirito, oltrarno ; campo di marte
napoli|naples = 40.8359,14.2488,2,Italy,Piazza del Plebiscito ; centro storico, chiaia, san ferdinando, toledo ; vomero
venice|venezia = 45.4380,12.3358,1.5,Italy,Rialto ; san marco, san polo, cannaregio, castello, dorsoduro, santa croce ; giudecca
paris = 48.8584,2.3470,3,France,Châtelet ; 1er, 2e, 3e, 4e, marais, ile de la cite, saint germain, louvre ; 5e, 6e, 7e, 9e, 10e, 11e
nice|niza = 43.6975,7.2700,1.5,France,Place Masséna ; vieux nice, carre d or, centre ville ; port, cimiez
lyon = 45.7578,4.8320,2,France,Place Bellecour ; presqu ile, vieux lyon, 1er, 2e ; croix rousse
marseille|marsella = 43.2951,5.3740,2,France,Vieux-Port ; vieux port, le panier, 1er ; 6e, 7e
bordeaux|burdeos = 44.8412,-0.5800,1.8,France,Place de la Comédie ; centre, saint pierre, chartrons ; bastide
athens|atenas = 37.9755,23.7348,2.5,Greece,Syntagma ; plaka, syntagma, kolonaki, monastiraki, psyrri ; koukaki, exarchia
london|londres = 51.5074,-0.1278,3,United Kingdom,Charing Cross ; westminster, soho, covent garden, mayfair, city of london, holborn, fitzrovia ; marylebone, bloomsbury, southwark
dublin = 53.3473,-6.2591,2,Ireland,O'Connell Bridge ; dublin 1, dublin 2, temple bar ; dublin 8, dublin 7
berlin = 52.5200,13.4050,3,Germany,Alexanderplatz ; mitte ; prenzlauer berg, kreuzberg, friedrichshain
amsterdam = 52.3731,4.8926,2,Netherlands,Dam ; centrum, jordaan, grachtengordel ; de pijp, oud west
prague|praga = 50.0875,14.4213,2,Czech Republic,Old Town Square ; stare mesto, nove mesto, mala strana, praha 1 ; vinohrady, praha 2
budapest = 47.4979,19.0540,2.5,Hungary,Deák tér ; district v, district vi, district vii, belvaros ; district viii, district ix
vienna|viena = 48.2085,16.3731,2,Austria,Stephansplatz ; innere stadt, 1st district ; leopoldstadt, wieden, neubau
miami = 25.7743,-80.1937,2.5,United States,Downtown Miami ; downtown, brickell, park west, omni, arts entertainment district ; edgewater, little havana, wynwood
miami beach = 25.7907,-80.1300,2,United States,Lincoln Road ; south beach, flamingo, lummus, west avenue ; mid beach
fort lauderdale = 26.1224,-80.1373,2,United States,Las Olas ; downtown, las olas, flagler village ; victoria park
orlando = 28.5384,-81.3789,2,United States,Downtown Orlando ; downtown, thornton park, lake eola ; college park
tampa = 27.9506,-82.4572,2,United States,Downtown Tampa ; downtown, channel district, channelside, harbour island ; hyde park, ybor city
new york = 40.7580,-73.9855,3,United States,Midtown Manhattan ; midtown, manhattan ; chelsea, upper east side, upper west side
los angeles = 34.0522,-118.2437,3,United States,Downtown LA ; downtown ; echo park, koreatown
chicago = 41.8818,-87.6231,3,United States,The Loop ; loop, river north, streeterville, south loop ; gold coast, west loop
boston = 42.3601,-71.0589,2.5,United States,Downtown Boston ; downtown, back bay, beacon hill, north end ; south end
mexico city|ciudad de mexico|cdmx = 19.4326,-99.1332,3,Mexico,Zócalo ; centro historico, centro ; roma, condesa, juarez
buenos aires = -34.6037,-58.3816,3,Argentina,Obelisco ; microcentro, san nicolas, monserrat, retiro ; recoleta, san telmo, balvanera
bogota = 4.5981,-74.0760,2.5,Colombia,La Candelaria ; la candelaria, centro ; chapinero, teusaquillo
medellin = 6.2476,-75.5658,2.5,Colombia,Parque Berrío ; centro, la candelaria ; laureles, el poblado
almería|almeria = 36.8686,-2.3120,1.5,Spain,Puerta de Purchena
huelva = 37.2576,-6.9485,1.5,Spain,Plaza de las Monjas
jaén|jaen = 37.7729,-3.7883,1.5,Spain,Plaza de Santa María
castellón|castellon|castellon de la plana = 39.9860,-0.0377,1.5,Spain,Plaza Mayor
tarragona = 41.1172,1.2546,1.5,Spain,Rambla Nova
girona|gerona = 41.9793,2.8199,1.5,Spain,Plaça de la Independència
lleida|lerida = 41.6148,0.6268,1.5,Spain,Plaça Paeria
valladolid = 41.6200,-4.7260,1.5,Spain,Plaza Mayor
salamanca = 40.9652,-5.6640,1.5,Spain,Plaza Mayor
burgos = 42.3448,-3.6812,1.5,Spain,Plaza Mayor
león|leon = 42.6341,-5.9714,1.5,Spain,Plaza de Santo Domingo
oviedo = 43.3533,-5.8795,1.5,Spain,Plaza de la Escandalera
gijón|gijon = 43.5449,-5.6627,1.5,Spain,Plaza Mayor
santander = 43.4619,-3.8100,1.5,Spain,Plaza del Ayuntamiento
coruña|a coruna|la coruna|a coruña = 43.3455,-8.4139,1.5,Spain,Plaza de María Pita
vigo = 42.1986,-8.7280,1.5,Spain,Porta do Sol
santiago de compostela = 42.9065,-8.5193,1.5,Spain,Praza do Obradoiro
pamplona|iruna = 42.8157,-1.6522,1.5,Spain,Plaza del Castillo
vitoria|vitoria gasteiz = 42.8506,-2.6614,1.5,Spain,Plaza de la Virgen Blanca
logroño|logrono = 42.4661,-2.4397,1.5,Spain,Calle Portales
toledo = 39.8559,-4.0243,1.5,Spain,Plaza de Zocodover
cáceres|caceres = 39.4745,-6.3717,1.5,Spain,Plaza Mayor
badajoz = 38.8782,-6.9701,1.5,Spain,Plaza de España
mérida|merida = 38.9543,-6.3505,1.5,Spain,Plaza de España
albacete = 38.9951,-1.8559,1.5,Spain,Plaza del Altozano
cartagena = 37.6155,-0.9875,1.5,Spain,Plaza del Ayuntamiento
elche|elx = 38.2653,-0.6988,1.5,Spain,Plaça de Baix
benidorm = 38.5406,-0.1291,1.5,Spain,Plaza de la Constitución
torrevieja = 37.9775,-0.6828,1.5,Spain,Plaza de la Constitución
jerez|jerez de la frontera = 36.6817,-6.1377,1.5,Spain,Plaza del Arenal
algeciras = 36.1312,-5.4474,1.5,Spain,Plaza Alta
estepona = 36.4268,-5.1468,1.5,Spain,Plaza de las Flores
fuengirola = 36.5388,-4.6234,1.5,Spain,Plaza de la Constitución
torremolinos = 36.6243,-4.4995,1.5,Spain,Plaza de la Nogalera
nerja = 36.7469,-3.8790,1.5,Spain,Balcón de Europa
motril = 36.7451,-3.5208,1.5,Spain,Plaza de España
ronda = 36.7421,-5.1666,1.5,Spain,Plaza de España
las palmas|las palmas de gran canaria = 28.1289,-15.4349,1.5,Spain,Triana
santa cruz de tenerife = 28.4672,-16.2508,1.5,Spain,Plaza de España
ibiza|eivissa = 38.9744,1.4197,1.5,Spain,Vara de Rey
segovia = 40.9481,-4.1172,1.5,Spain,Plaza Mayor
ávila|avila = 40.6572,-4.6627,1.5,Spain,Plaza del Mercado Chico
cuenca = 40.0661,-2.1314,1.5,Spain,Plaza Mayor
guadalajara = 40.7400,-2.5059,1.5,Spain,Plaza Mayor
huesca = 42.1361,-0.0298,1.5,Spain,Coso
teruel = 40.6005,-0.9229,1.5,Spain,Plaza del Torico
zamora = 41.6858,-5.9423,1.5,Spain,Plaza Mayor
palencia = 42.4096,-4.6161,1.5,Spain,Plaza Mayor
soria = 41.6013,-2.7219,1.5,Spain,Plaza Mayor
lugo = 43.0395,-7.4568,1.5,Spain,Plaza Mayor
ourense|orense = 42.1940,-7.5371,1.5,Spain,Praza Maior
pontevedra = 42.4281,-8.6041,1.5,Spain,Praza da Ferrería
ciudad real = 38.9597,-3.8829,1.5,Spain,Plaza Mayor
coimbra = 40.2112,-8.4291,1.5,Portugal,Praça 8 de Maio
braga = 41.5511,-8.4280,1.5,Portugal,Praça da República
lagos = 37.1028,-8.6729,1.5,Portugal,Praça Gil Eanes
albufeira = 37.0882,-8.2526,1.5,Portugal,Largo Engenheiro Duarte Pacheco
`;

const BY: Map<string, Centre> = new Map();
for (const line of TABLE.split("\n").map((s) => s.trim()).filter(Boolean)) {
  const [names, rest] = line.split("=").map((s) => s.trim());
  const [head, cen = "", near = ""] = rest.split(";").map((s) => s.trim());
  const [lat, lng, r, country, label] = head.split(",").map((s) => s.trim());
  const list = (s: string) => s.split(",").map((x) => norm(x)).filter(Boolean);
  const all = names.split("|");
  const c: Centre = { name: all[0].replace(/\b[a-z]/g, (m) => m.toUpperCase()), country, lat: Number(lat), lng: Number(lng), r_km: Number(r), label, central: list(cen), near: list(near), src: "table" };
  for (const a of all) BY.set(norm(a), c);
}

/** The centre of a city we know (null when it is not in the table, or when the country does not match: Valencia, Venezuela). */
export function centreFor(place: string | null | undefined, country?: string | null): Centre | null {
  const c = BY.get(norm(place || ""));
  if (!c) return null;
  if (country && norm(country) !== norm(c.country)) return null;
  return c;
}

/** Distance in km between two points (haversine). */
export function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * A city centre from Nominatim's first result (lat, lon, boundingbox as strings). The radius grows with the size of
 * the place: about an eighth of its bounding box diagonal, between 1.2 km (a town) and 3 km (a metropolis).
 */
export function centreFromGeocode(name: string, country: string, g: { lat?: string | number; lon?: string | number; boundingbox?: (string | number)[] } | null | undefined): Centre | null {
  const lat = Number(g?.lat), lng = Number(g?.lon);
  if (!g || !Number.isFinite(lat) || !Number.isFinite(lng) || (!lat && !lng)) return null;
  const bb = (g.boundingbox || []).map(Number);
  let r = 1.5;
  if (bb.length === 4 && bb.every(Number.isFinite)) {
    const diag = km({ lat: bb[0], lng: bb[2] }, { lat: bb[1], lng: bb[3] });
    r = Math.max(1.2, Math.min(3, Math.round((diag / 8) * 10) / 10));
  }
  return { name, country, lat, lng, r_km: r, central: [], near: [], src: "geocoded" };
}

export type CentreFit = {
  status: "central" | "near" | "outside" | "unknown";
  /** km from the centre point, when the listing has a map position */
  km: number | null;
  by: "coords" | "district" | null;
  /** the district that decided, when it was the text */
  district?: string | null;
};
const GENERIC = ["centro", "centro historico", "casco antiguo", "casco historico", "casco viejo", "downtown", "city centre", "city center", "old town", "centre ville", "centro storico", "baixa"];
const has = (t: string, w: string) => (" " + t + " ").includes(" " + w + " ");

/** Where a listing stands against the centre. `text` is its own place text (district, neighbourhood, title). */
export function centreFit(c: Centre, x: { lat?: number | null; lng?: number | null; text?: string | null }): CentreFit {
  const lat = Number(x.lat), lng = Number(x.lng);
  if (x.lat != null && x.lng != null && Number.isFinite(lat) && Number.isFinite(lng) && (lat || lng)) {
    const d = km(c, { lat, lng });
    if (d <= 60) { const r = Math.round(d * 10) / 10; return { status: d <= c.r_km ? "central" : "outside", km: r, by: "coords" }; }
  }
  const t = norm(x.text || "");
  if (!t) return { status: "unknown", km: null, by: null };
  // another town: the text must not name a different place first ("Camas Centro Urbano", "Dos Hermanas centro")
  const central = c.central.length ? c.central : GENERIC;
  // longest names first, so "dreta de l eixample" wins over "eixample"
  const hit = (list: string[]) => [...list].sort((a, b) => b.length - a.length).find((w) => has(t, w)) || null;
  const cen = hit(central);
  if (cen) return { status: "central", km: null, by: "district", district: cen };
  const nr = hit(c.near);
  if (nr) return { status: "near", km: null, by: "district", district: nr };
  return { status: "unknown", km: null, by: null };
}

/** Pisos.com card subtitle "San Vicente (Distrito Casco Antiguo. Sevilla Capital)": the text to read, or "" for another town. */
export function cardPlaceText(area: string, city: string): string {
  const a = norm(area);
  const cty = norm(city);
  // a card from another municipality has no "<city> capital" and no "(distrito ...)"
  if (cty && !a.includes(cty) && !/\bdistrito\b/.test(a)) return "";
  return a;
}

/** The fact shown on a card: "1.2 km from the centre" (English and Spanish). */
export function centreFact(f: CentreFit | null | undefined): { en: string; es: string } | null {
  if (!f) return null;
  if (f.km != null) {
    if (f.km < 0.3) return { en: "In the city centre", es: "En pleno centro" };
    const v = f.km.toFixed(1);
    return { en: `${v} km from the centre`, es: `A ${v.replace(".", ",")} km del centro` };
  }
  if (f.status === "central") return { en: "In the city centre", es: "En el centro" };
  if (f.status === "near") return { en: "Near the centre", es: "Cerca del centro" };
  return null;
}

/** Shown in the main results of a "centre" search: within the radius, or a central / next-to-centre district without coordinates. */
export const inCentre = (f: CentreFit | null | undefined) => !!f && (f.status === "central" || f.status === "near");

/**
 * The honest note when nothing central passed. Nothing central was read: "No home in central Sevilla under €200,000
 * with 3+ bedrooms passed our checks today. Closest checked: 2.1 km from the centre." Central homes were read and all
 * missed: "12 central homes checked (Madrid, under €350,000, 2+ bedrooms); none passed our photo and value checks
 * today." closest_km is the nearest listing read OUTSIDE the centre.
 */
export function centreNote(x: { place: string; max_eur?: number | null; max_price?: number | null; currency?: string; min_beds?: number | null; kind?: "buy" | "rent"; closest_km?: number | null; checked_central?: number }, lang: "en" | "es" = "en"): string {
  const cur = x.currency || "EUR";
  const amt = x.max_price ?? x.max_eur ?? null;
  const sym = cur === "EUR" ? "€" : cur === "USD" ? "$" : cur === "GBP" ? "£" : "";
  const en = (v: number) => (sym ? sym + v.toLocaleString("en-US") : v.toLocaleString("en-US") + " " + cur);
  const es = (v: number) => v.toLocaleString("de-DE") + " " + (sym || cur);
  const near = x.closest_km != null ? x.closest_km.toFixed(1) : null;
  const rent = x.kind === "rent";
  const n = x.checked_central || 0;
  if (lang === "es") {
    const what = [amt ? `por menos de ${es(amt)}${rent ? " al mes" : ""}` : "", x.min_beds ? `con ${x.min_beds} o más habitaciones` : ""].filter(Boolean).join(", ");
    const head = n
      ? `${n === 1 ? "Revisamos 1 vivienda" : `Revisamos ${n} viviendas`} ${rent ? "en alquiler " : ""}del centro de ${x.place}${what ? ` (${what})` : ""}; ${n === 1 ? "no ha pasado" : "ninguna ha pasado"} hoy nuestras comprobaciones de fotos y precio.`
      : [`Hoy ninguna vivienda ${rent ? "en alquiler " : ""}en el centro de ${x.place}`, what.replace(", con", " con"), "ha pasado nuestras comprobaciones."].filter(Boolean).join(" ");
    return head + (near ? (n ? ` La más cercana fuera del centro está a ${near.replace(".", ",")} km.` : ` La más cercana que revisamos está a ${near.replace(".", ",")} km del centro.`) : "");
  }
  const what = [amt ? `under ${en(amt)}${rent ? " a month" : ""}` : "", x.min_beds ? `${x.min_beds}+ bedrooms` : ""].filter(Boolean).join(", ");
  const head = n
    ? `${n} central ${n === 1 ? "home" : "homes"} ${rent ? "to rent " : ""}checked (${[x.place, what].filter(Boolean).join(", ")}); ${n === 1 ? "it did not pass" : "none passed"} our photo and value checks today.`
    : [`No home ${rent ? "to rent " : ""}in central ${x.place}`, amt ? `under ${en(amt)}${rent ? " a month" : ""}` : "", x.min_beds ? `with ${x.min_beds}+ bedrooms` : "", "passed our checks today."].filter(Boolean).join(" ");
  return head + (near ? (n ? ` Closest checked outside the centre: ${near} km away.` : ` Closest checked: ${near} km from the centre.`) : "");
}

// ---------------------------------------------------------------- value against the centre (v5, 8-nov-2026)
/**
 * A centre search compares a central home with other central homes, not with the whole city (Carlos: Madrid had 20
 * central candidates and none could reach 80, because central flats cost more per m² than the city's). Comparables:
 * the central listings scanned in this job plus central live finds of the last 60 days, by kind (flat / house).
 *  - 6 or more of the same kind: their median ("centre_type"), if it is within half to twice the all-central one
 *  - else 6 or more central of any kind: their median ("centre")
 *  - else the city median x CENTRE_PREMIUM ("city_premium"), or null without a city median
 * The score formula and the photo gate are unchanged: a central home at the centre's median scores about 78, so
 * only the better-value central homes (with good photos) reach 80; overpriced ones still do not.
 */
export const CENTRE_PREMIUM = 1.25;
export const CENTRE_MIN_COMPS = 6;
export type Group = "flat" | "house";
export type CentreMedian = { ppm: number | null; from: "centre_type" | "centre" | "city_premium" | null; n: number };
export function centreMedians(comps: { ppm: number; group: Group | null; id?: string }[], cityMedian: number | null, premium = CENTRE_PREMIUM, min = CENTRE_MIN_COMPS): Record<Group | "all", CentreMedian> {
  const seen = new Set<string>();
  const ok = (comps || []).filter((c) => c && Number.isFinite(c.ppm) && c.ppm > 0 && (!c.id || (!seen.has(c.id) && seen.add(c.id))));
  const med = (v: number[]) => { const a = [...v].sort((x, y) => x - y); const m = Math.floor(a.length / 2); return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };
  const fallback: CentreMedian = cityMedian && cityMedian > 0 ? { ppm: Math.round(cityMedian * premium), from: "city_premium", n: ok.length } : { ppm: null, from: null, n: ok.length };
  const all: CentreMedian = ok.length >= min ? { ppm: Math.round(med(ok.map((c) => c.ppm))), from: "centre", n: ok.length } : fallback;
  // a kind's own median only when it is plausible next to all central homes (half to twice it): a handful of odd
  // "houses" in a city centre (a farmhouse of the province, a typo) must not set the bar
  const of = (g: Group): CentreMedian => {
    const v = ok.filter((c) => c.group === g).map((c) => c.ppm);
    if (v.length < min) return all;
    const x = Math.round(med(v));
    return all.from === "centre" && all.ppm && (x < all.ppm * 0.5 || x > all.ppm * 2) ? all : { ppm: x, from: "centre_type", n: v.length };
  };
  return { flat: of("flat"), house: of("house"), all };
}

/** For the note: how many central listings were read today (from the web, not homes we already had) and the nearest one read outside. */
export function centreTally(all: { source?: string; centre_status?: string | null; distance_to_centre_km?: number | null }[]): { checked_central: number; closest_km: number | null } {
  const web = (all || []).filter((r) => r && r.source === "web");
  const kms = web.filter((r) => r.centre_status === "outside" && typeof r.distance_to_centre_km === "number").map((r) => r.distance_to_centre_km as number);
  return { checked_central: web.filter((r) => r.centre_status === "central" || r.centre_status === "near").length, closest_km: kms.length ? Math.min(...kms) : null };
}

/** A city centre from Open-Meteo's free geocoder (backup when Nominatim does not answer): its first result's point. */
export function centreFromOpenMeteo(name: string, country: string, g: { latitude?: number; longitude?: number; population?: number } | null | undefined): Centre | null {
  const lat = Number(g?.latitude), lng = Number(g?.longitude);
  if (!g || !Number.isFinite(lat) || !Number.isFinite(lng) || (!lat && !lng)) return null;
  const pop = Number(g.population) || 0;
  const r = pop > 2_000_000 ? 3 : pop > 600_000 ? 2.2 : pop > 150_000 ? 1.6 : 1.3;
  return { name, country, lat, lng, r_km: r, central: [], near: [], src: "geocoded" };
}
