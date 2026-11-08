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
 * The honest note when nothing central passed: "No home in central Sevilla under €200,000 with 3+ bedrooms passed our
 * checks today. Closest checked: 2.1 km from the centre." When central listings were checked and all missed the bar,
 * it says how many; closest_km is the nearest listing checked OUTSIDE the centre.
 */
export function centreNote(x: { place: string; max_eur?: number | null; max_price?: number | null; currency?: string; min_beds?: number | null; kind?: "buy" | "rent"; closest_km?: number | null; checked_central?: number }, lang: "en" | "es" = "en"): string {
  const cur = x.currency || "EUR";
  const amt = x.max_price ?? x.max_eur ?? null;
  const sym = cur === "EUR" ? "€" : cur === "USD" ? "$" : cur === "GBP" ? "£" : "";
  const en = (n: number) => (sym ? sym + n.toLocaleString("en-US") : n.toLocaleString("en-US") + " " + cur);
  const es = (n: number) => n.toLocaleString("de-DE") + " " + (sym || cur);
  const near = x.closest_km != null ? x.closest_km.toFixed(1) : null;
  const rent = x.kind === "rent";
  const n = x.checked_central || 0;
  if (lang === "es") {
    return [`Hoy ninguna vivienda ${rent ? "en alquiler " : ""}en el centro de ${x.place}`, amt ? `por menos de ${es(amt)}${rent ? " al mes" : ""}` : "", x.min_beds ? `con ${x.min_beds} o más habitaciones` : "", "ha pasado nuestras comprobaciones."].filter(Boolean).join(" ")
      + (n ? ` Revisamos ${n === 1 ? "una" : n} en el centro y ${n === 1 ? "no alcanzó" : "ninguna alcanzó"} nuestro nivel.` : "")
      + (near ? (n ? ` La más cercana fuera del centro está a ${near.replace(".", ",")} km.` : ` La más cercana que revisamos está a ${near.replace(".", ",")} km del centro.`) : "");
  }
  return [`No home ${rent ? "to rent " : ""}in central ${x.place}`, amt ? `under ${en(amt)}${rent ? " a month" : ""}` : "", x.min_beds ? `with ${x.min_beds}+ bedrooms` : "", "passed our checks today."].filter(Boolean).join(" ")
    + (n ? (n === 1 ? " We checked 1 in the centre and it did not meet our bar." : ` We checked ${n} in the centre and none met our bar.`) : "")
    + (near ? (n ? ` Closest checked outside the centre: ${near} km away.` : ` Closest checked: ${near} km from the centre.`) : "");
}

/** For the note: how many central listings were read today (from the web, not homes we already had) and the nearest one read outside. */
export function centreTally(all: { source?: string; centre_status?: string | null; distance_to_centre_km?: number | null }[]): { checked_central: number; closest_km: number | null } {
  const web = (all || []).filter((r) => r && r.source === "web");
  const kms = web.filter((r) => r.centre_status === "outside" && typeof r.distance_to_centre_km === "number").map((r) => r.distance_to_centre_km as number);
  return { checked_central: web.filter((r) => r.centre_status === "central" || r.centre_status === "near").length, closest_km: kms.length ? Math.min(...kms) : null };
}
