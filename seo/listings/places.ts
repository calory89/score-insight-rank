// Places for the listing pages (15-nov-2026): one name per region, named areas (coasts, island groups, the usual
// groupings of regions), islands and big cities. Geography only: nothing here is a legal or tax fact.
//
// Why regions need a name of their own: a home's place is free text ("Alicante (about 25 min from Elche)",
// "Crete (Greece)", "Puglia" next to "Apulia"), and the region pages used to take the last part as it came. Five
// homes of Alicante were five "regions" of one home each and never reached a page.
import { regionOf, slugify } from "../../src/community/regions";

type Home = Record<string, any>;

// The same region under two names. Keys are slugs of what the listing says; values are the name the page uses.
const SAME: Record<string, Record<string, string>> = {
  italy: { puglia: "Apulia", "como-area": "Lake Como", sicilia: "Sicily", sardegna: "Sardinia", toscana: "Tuscany", piemonte: "Piedmont", lombardia: "Lombardy", cosenza: "Calabria", palermo: "Sicily", messina: "Sicily", rieti: "Lazio" },
  spain: { seville: "Sevilla", denia: "Alicante", javea: "Alicante", "vejer-de-la-frontera": "Cádiz", "alhama-de-murcia": "Murcia" },
  portugal: { mogadouro: "Bragança" },
};
// A note in brackets that is not a place: "(about 25 min from Elche)", "(near Portaria)", "(12 min to Billund)".
const NOTE = /^\s*(about|around|near|approx|\d+\s*(min|km|h)\b)/i;

/** The region as the listing gives it, without the notes: "Alicante (about 25 min from Elche)" -> "Alicante",
 * "Crete (Greece)" -> "Crete", "Puglia" -> "Apulia". "Baix Maestrat (Castellón)" stays as it is here; regionIndex()
 * moves it to Castellón when other homes of the country use that name. */
export function cleanRegion(row: Home): string {
  const cc = String(row.country || "").toLowerCase().trim().replace(/\s+/g, "-");
  let r = regionOf(row);
  if (!r || r === "undefined") return "";
  const m = /^(.*?)\s*\(([^)]*)\)\s*$/.exec(r);
  if (m && m[1] && (NOTE.test(m[2]) || slugify(m[2]) === slugify(String(row.country || "")))) r = m[1].trim();
  return SAME[cc]?.[slugify(r)] || r;
}

const index = new WeakMap<Home, string>();
/** Gives every home its region for this build. "Town (Province)" joins the province when the province is a region
 * other homes of that country already use (or the town is one of them): "Alpujarra (Granada)" -> "Granada". */
export function regionIndex(rows: Home[]): void {
  const names = new Map<string, Map<string, string>>(); // country -> slug -> name
  const cOf = (h: Home) => String(h.country || "").toLowerCase().trim();
  for (const h of rows) { const r = cleanRegion(h); if (r && !/\(/.test(r)) { const m = names.get(cOf(h)) || names.set(cOf(h), new Map()).get(cOf(h))!; m.set(slugify(r), r); } }
  for (const h of rows) {
    let r = cleanRegion(h);
    const m = /^(.*?)\s*\(([^)]*)\)\s*$/.exec(r);
    if (m) { const known = names.get(cOf(h)); const cc = cOf(h).replace(/\s+/g, "-"); const inner = SAME[cc]?.[slugify(m[2])] || known?.get(slugify(m[2])); const outer = known?.get(slugify(m[1])); r = inner || outer || r; }
    index.set(h, r);
  }
}
/** The region of a home in this build (after regionIndex), or its cleaned name when the build has not indexed it. */
export const regionName = (h: Home): string => index.get(h) ?? cleanRegion(h);

// ------------------------------------------------------------------------------------------------ islands
// Islands people search by name. Mainland-sized islands (Great Britain, Honshu, Zealand with Copenhagen) are left out:
// nobody looking for "a house on an island" means those.
const ISLANDS = ["Tenerife", "Gran Canaria", "Fuerteventura", "Lanzarote", "La Palma", "La Gomera", "El Hierro", "Mallorca", "Majorca", "Menorca", "Ibiza", "Formentera",
  "Sicily", "Sardinia", "Elba", "Ischia", "Crete", "Corfu", "Rhodes", "Evia", "North Evia", "Euboea", "Lesbos", "Samos", "Skopelos", "Kefalonia", "Zakynthos", "Lefkada", "Naxos", "Paros", "Kos", "Chios", "Thassos", "Andros", "Tinos", "Syros",
  "Madeira", "Azores", "Gotland", "Öland", "Funen", "Fyn", "Lolland", "Falster", "Mors", "Bornholm", "Langeland", "Møn", "Ærø", "Samsø", "Fanø", "Als", "Corsica", "Cyprus", "Malta", "Gozo",
  "Cape Breton", "Prince Edward Island", "Newfoundland", "Sado", "Awaji", "Okinawa", "Brač", "Hvar", "Krk", "Korčula"];
const ISLAND = new Map(ISLANDS.map((n) => [slugify(n), n === "Majorca" ? "Mallorca" : n === "Fyn" ? "Funen" : n === "Euboea" || n === "North Evia" ? "Evia" : n]));
/** The island a home is on, from the parts of its place ("Skopelos (Sporades)", "Frøslev on Mors"), or "". */
export function islandOf(h: Home): string {
  if (String(h.country || "") === "Cyprus") return "Cyprus";
  for (const part of String(h.location_name || "").split(",")) {
    const p = part.replace(/\([^)]*\)/g, " ").trim();
    const hit = ISLAND.get(slugify(p)); if (hit) return hit;
    const on = /\bon (?:the island of )?([A-ZÆØÅÖ][\wæøåöé-]+)$/.exec(p); if (on && ISLAND.get(slugify(on[1]))) return ISLAND.get(slugify(on[1]))!;
    const inner = /\(([^)]*)\)/.exec(part); if (inner && ISLAND.get(slugify(inner[1]))) return ISLAND.get(slugify(inner[1]))!;
  }
  const r = regionName(h); return ISLAND.get(slugify(r)) || "";
}

// ------------------------------------------------------------------------------------------------ named areas
/** An area with a name of its own: a set of regions of one country, optionally only the homes by the sea, or the
 * homes whose place names it. `vs` is the better-known and dearer area people compare it with. */
export type Area = {
  slug: string; cc: string; en: string; es: string; inEn: string; inEs: string;
  regions?: string[]; sea?: boolean; text?: RegExp; vs?: string;
  /** The area is made of neighbourhoods of one city: the page names them instead of regions. */
  hoods?: boolean;
};
const A = (slug: string, cc: string, en: string, es: string, inEn: string, inEs: string, rest: Partial<Area>): Area => ({ slug, cc, en, es, inEn, inEs, ...rest });
export const AREAS: Area[] = [
  // Spain: the tourist-board names of four provinces' coasts, the island groups and the green north
  A("costa-del-sol", "spain", "Costa del Sol", "Costa del Sol", "on the Costa del Sol", "en la Costa del Sol", { regions: ["Málaga"], sea: true }),
  A("costa-blanca", "spain", "Costa Blanca", "Costa Blanca", "on the Costa Blanca", "en la Costa Blanca", { regions: ["Alicante"], sea: true }),
  A("costa-calida", "spain", "Costa Cálida", "Costa Cálida", "on the Costa Cálida", "en la Costa Cálida", { regions: ["Murcia"], sea: true, vs: "costa-del-sol" }),
  A("costa-de-almeria", "spain", "Costa de Almería", "Costa de Almería", "on the Costa de Almería", "en la Costa de Almería", { regions: ["Almería"], sea: true, vs: "costa-del-sol" }),
  A("canary-islands", "spain", "Canary Islands", "Canarias", "in the Canary Islands", "en Canarias", { regions: ["Tenerife", "Gran Canaria", "Fuerteventura", "Lanzarote", "La Palma", "La Gomera", "El Hierro", "Las Palmas", "Santa Cruz de Tenerife"] }),
  A("balearic-islands", "spain", "Balearic Islands", "Baleares", "in the Balearic Islands", "en Baleares", { regions: ["Mallorca", "Menorca", "Ibiza", "Formentera", "Balearic Islands", "Illes Balears"] }),
  A("green-spain", "spain", "Green Spain", "España Verde", "in Green Spain", "en la España Verde", { regions: ["A Coruña", "Lugo", "Ourense", "Pontevedra", "Galicia", "Asturias", "Cantabria", "Gipuzkoa", "Bizkaia", "Álava", "Basque Country"] }),
  // Portugal
  A("algarve", "portugal", "Algarve", "Algarve", "in the Algarve", "en el Algarve", { regions: ["Faro", "Algarve"], text: /\bAlgarve\b/i }),
  // Italy
  A("southern-italy", "italy", "Southern Italy", "Sur de Italia", "in southern Italy", "en el sur de Italia", { regions: ["Abruzzo", "Molise", "Campania", "Apulia", "Basilicata", "Calabria", "Sicily", "Sardinia", "Cosenza", "Palermo", "Messina"], vs: "tuscany" }),
  A("abruzzo-and-marche", "italy", "Abruzzo and Marche", "Abruzos y Las Marcas", "in Abruzzo and Marche", "en Abruzos y Las Marcas", { regions: ["Abruzzo", "Marche"], vs: "tuscany" }),
  A("lunigiana", "italy", "Lunigiana", "Lunigiana", "in Lunigiana", "en Lunigiana", { text: /\bLunigiana\b/i }),
  A("lake-maggiore", "italy", "Lake Maggiore", "Lago Mayor", "around Lake Maggiore", "en el entorno del lago Mayor", { text: /\b(Lake Maggiore|Lago Maggiore)\b/i }),
  A("lake-garda", "italy", "Lake Garda", "Lago de Garda", "around Lake Garda", "en el entorno del lago de Garda", { text: /\b(Lake Garda|Lago di Garda)\b/i }),
  // France
  A("limousin", "france", "Limousin", "Lemosín", "in Limousin", "en el Lemosín", { regions: ["Creuse", "Haute-Vienne", "Corrèze", "Limousin"] }),
  // Japan: the eight regions
  A("hokkaido", "japan", "Hokkaido", "Hokkaido", "in Hokkaido", "en Hokkaido", { regions: ["Hokkaido"] }),
  A("tohoku", "japan", "Tohoku", "Tohoku", "in Tohoku", "en Tohoku", { regions: ["Aomori", "Iwate", "Miyagi", "Akita", "Yamagata", "Fukushima"] }),
  A("kanto", "japan", "Kanto", "Kanto", "in Kanto", "en Kanto", { regions: ["Tokyo", "Kanagawa", "Saitama", "Chiba", "Ibaraki", "Tochigi", "Gunma"] }),
  A("chubu", "japan", "Chubu", "Chubu", "in Chubu", "en Chubu", { regions: ["Niigata", "Toyama", "Ishikawa", "Fukui", "Yamanashi", "Nagano", "Gifu", "Shizuoka", "Aichi"] }),
  A("kansai", "japan", "Kansai", "Kansai", "in Kansai", "en Kansai", { regions: ["Kyoto", "Osaka", "Hyogo", "Nara", "Wakayama", "Shiga", "Mie"] }),
  A("chugoku", "japan", "Chugoku", "Chugoku", "in Chugoku", "en Chugoku", { regions: ["Tottori", "Shimane", "Okayama", "Hiroshima", "Yamaguchi"] }),
  A("shikoku", "japan", "Shikoku", "Shikoku", "on Shikoku", "en Shikoku", { regions: ["Kagawa", "Ehime", "Tokushima", "Kochi"] }),
  A("kyushu", "japan", "Kyushu", "Kyushu", "on Kyushu", "en Kyushu", { regions: ["Fukuoka", "Saga", "Nagasaki", "Kumamoto", "Oita", "Miyazaki", "Kagoshima"] }),
  // Nordics
  A("norrland", "sweden", "Norrland", "Norrland", "in Norrland", "en Norrland", { regions: ["Gävleborg", "Medelpad", "Västerbotten", "Jämtland", "Norrbotten", "Västernorrland", "Northern Sweden", "Ångermanland", "Hälsingland", "Härjedalen", "Lappland"] }),
  A("jutland", "denmark", "Jutland", "Jutlandia", "in Jutland", "en Jutlandia", { regions: ["North Jutland", "West Jutland", "East Jutland", "Central Jutland", "South Jutland", "Sønderjylland", "Thy", "Mors", "Vejen", "Grindsted"] }),
  A("lolland-falster", "denmark", "Lolland and Falster", "Lolland y Falster", "on Lolland and Falster", "en Lolland y Falster", { regions: ["Lolland", "Falster"] }),
  // Netherlands: the Zuidoost district of Amsterdam, by the neighbourhoods the listings name
  A("amsterdam-zuidoost", "netherlands", "Amsterdam-Zuidoost", "Ámsterdam Sudeste", "in Amsterdam-Zuidoost", "en Ámsterdam Sudeste", { text: /\b(Zuidoost|Reigersbos|Gein|Venserpolder|Nellestein|Ganzenhoef|Bijlmer\w*|Holendrecht|Gaasperdam|Kraaiennest|Bullewijk|Driemond)\b/i, hoods: true }),
  // Germany, Poland, Greece, Bulgaria, Canada
  A("eastern-germany", "germany", "Saxony, Saxony-Anhalt and Thuringia", "Sajonia, Sajonia-Anhalt y Turingia", "in Saxony, Saxony-Anhalt and Thuringia", "en Sajonia, Sajonia-Anhalt y Turingia", { regions: ["Saxony", "Saxony-Anhalt", "Thuringia", "Chemnitz", "Görlitz", "Gera", "Magdeburg", "Leipzig", "Dresden", "Zwickau", "Plauen", "Halle", "Erfurt", "Dessau"] }),
  A("masuria", "poland", "Masuria", "Masuria", "in Masuria", "en Masuria", { regions: ["Warmia-Masuria", "Masuria", "Mazury"] }),
  A("peloponnese", "greece", "Peloponnese", "Peloponeso", "in the Peloponnese", "en el Peloponeso", { regions: ["Messinia", "Laconia", "Arcadia", "Argolis", "Corinthia", "Achaea", "Elis", "Ilia", "Peloponnese"] }),
  A("black-sea-coast", "bulgaria", "Black Sea coast", "Costa del mar Negro", "on the Black Sea coast", "en la costa del mar Negro", { regions: ["Varna", "Burgas", "Dobrich"], text: /\bBlack Sea\b/i }),
  A("atlantic-canada", "canada", "Atlantic Canada", "Canadá atlántico", "in Atlantic Canada", "en el Canadá atlántico", { regions: ["New Brunswick", "Nova Scotia", "Newfoundland", "Newfoundland and Labrador", "Prince Edward Island"] }),
];
export const areaBySlug = (cc: string, slug: string) => AREAS.find((a) => a.cc === cc && a.slug === slug);
/** Is this home in the area? `sea` is the page's own "by the sea" test (passed in so this file stays free of it). */
export function inArea(a: Area, h: Home, sea: (h: Home) => boolean): boolean {
  const byRegion = !!a.regions && a.regions.some((r) => slugify(r) === slugify(regionName(h)));
  const byText = !!a.text && a.text.test(String(h.location_name || ""));
  return (byRegion || byText) && (!a.sea || sea(h));
}

// ------------------------------------------------------------------------------------------------ cities
export const NEAR_KM = 100;
/** Cities people start a search from: [slug, English, Spanish, lat, lng]. A page lists the homes within NEAR_KM in a
 * straight line (we have no travel times, so the pages never say "one hour from"). */
export const CITIES: [string, string, string, number, number][] = [
  ["barcelona", "Barcelona", "Barcelona", 41.3874, 2.1686], ["madrid", "Madrid", "Madrid", 40.4168, -3.7038], ["valencia", "Valencia", "Valencia", 39.4699, -0.3763],
  ["alicante", "Alicante", "Alicante", 38.3452, -0.481], ["malaga", "Málaga", "Málaga", 36.7213, -4.4214], ["seville", "Seville", "Sevilla", 37.3891, -5.9845],
  ["milan", "Milan", "Milán", 45.4642, 9.19], ["rome", "Rome", "Roma", 41.9028, 12.4964], ["florence", "Florence", "Florencia", 43.7696, 11.2558], ["naples", "Naples", "Nápoles", 40.8518, 14.2681],
  ["paris", "Paris", "París", 48.8566, 2.3522], ["lyon", "Lyon", "Lyon", 45.764, 4.8357], ["toulouse", "Toulouse", "Toulouse", 43.6047, 1.4442],
  ["berlin", "Berlin", "Berlín", 52.52, 13.405], ["leipzig", "Leipzig", "Leipzig", 51.3397, 12.3731], ["amsterdam", "Amsterdam", "Ámsterdam", 52.3676, 4.9041],
  ["copenhagen", "Copenhagen", "Copenhague", 55.6761, 12.5683], ["aarhus", "Aarhus", "Aarhus", 56.1629, 10.2039], ["stockholm", "Stockholm", "Estocolmo", 59.3293, 18.0686], ["gothenburg", "Gothenburg", "Gotemburgo", 57.7089, 11.9746],
  ["lisbon", "Lisbon", "Lisboa", 38.7223, -9.1393], ["porto", "Porto", "Oporto", 41.1579, -8.6291], ["athens", "Athens", "Atenas", 37.9838, 23.7275],
  ["warsaw", "Warsaw", "Varsovia", 52.2297, 21.0122], ["geneva", "Geneva", "Ginebra", 46.2044, 6.1432], ["zurich", "Zurich", "Zúrich", 47.3769, 8.5417],
  ["tokyo", "Tokyo", "Tokio", 35.6762, 139.6503], ["osaka", "Osaka", "Osaka", 34.6937, 135.5023], ["miami", "Miami", "Miami", 25.7617, -80.1918], ["orlando", "Orlando", "Orlando", 28.5383, -81.3792], ["tampa", "Tampa", "Tampa", 27.9506, -82.4572],
];
export const cityBySlug = (slug: string) => CITIES.find((c) => c[0] === slug);
/** Great-circle distance in km. */
export function km(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371, d = Math.PI / 180;
  const a = Math.sin(((lat2 - lat1) * d) / 2) ** 2 + Math.cos(lat1 * d) * Math.cos(lat2 * d) * Math.sin(((lng2 - lng1) * d) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
export const kmTo = (h: Home, lat: number, lng: number): number | null => (typeof h.lat === "number" && typeof h.lng === "number" ? km(h.lat, h.lng, lat, lng) : null);
