// Place names -> country (8-nov-2026, v3). A compact built-in gazetteer of the cities people search most, plus the
// names that exist in more than one country ("Sevilla": Spain, Colombia, Ohio). Pure: used by core.ts (edge function
// and vitest) and by the live search page, so the page can ask "Which Sevilla do you mean?" before anything is spent.
//   placeOptions(name)   every place we know by that name (accents and case ignored, English and Spanish names)
//   tzCountry(tz)        the visitor's country from the browser time zone ("Europe/Madrid" -> Spain)
//   pickPlace(...)       one option, or null when we should ask

export type PlaceOpt = {
  /** stable id used in the URL (?in=es, ?in=us-oh) */
  id: string;
  /** the place's own name as people there write it */
  name: string;
  country: string;
  /** a region shown to tell options apart (state, department, province) */
  region?: string;
  /** two-letter US state, for US places */
  state?: string;
  /** a big, well-known place: the one most people mean */
  major: boolean;
};

const n = (s: string) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

// Names found in several countries. Format per line: "alias|alias = id:Name:Country:Region:major(1/0)[:state]; ..."
const AMBIGUOUS = `
sevilla|seville = es:Sevilla:Spain:Andalusia:1; co:Sevilla:Colombia:Valle del Cauca:0; us-oh:Seville:United States:Ohio:0:oh
valencia = es:Valencia:Spain:Valencian Community:1; ve:Valencia:Venezuela:Carabobo:1
cordoba = es:Córdoba:Spain:Andalusia:1; ar:Córdoba:Argentina:Córdoba Province:1
granada = es:Granada:Spain:Andalusia:1; ni:Granada:Nicaragua:Granada:1
merida = es:Mérida:Spain:Extremadura:1; mx:Mérida:Mexico:Yucatán:1
santiago = es:Santiago de Compostela:Spain:Galicia:1; cl:Santiago:Chile:Santiago Metropolitan:1; do:Santiago de los Caballeros:Dominican Republic:Santiago:0
san jose = cr:San José:Costa Rica:San José:1; us-ca:San Jose:United States:California:1:ca
toledo = es:Toledo:Spain:Castilla-La Mancha:1; us-oh:Toledo:United States:Ohio:1:oh
paris = fr:Paris:France:Île-de-France:1; us-tx:Paris:United States:Texas:0:tx
naples|napoles|napoli = it:Napoli:Italy:Campania:1; us-fl:Naples:United States:Florida:1:fl
florence|florencia|firenze = it:Firenze:Italy:Tuscany:1; us-sc:Florence:United States:South Carolina:0:sc; co:Florencia:Colombia:Caquetá:0
cartagena = es:Cartagena:Spain:Murcia:1; co:Cartagena:Colombia:Bolívar:1
leon = es:León:Spain:Castilla y León:1; mx:León:Mexico:Guanajuato:1; ni:León:Nicaragua:León:0
guadalajara = es:Guadalajara:Spain:Castilla-La Mancha:1; mx:Guadalajara:Mexico:Jalisco:1
salamanca = es:Salamanca:Spain:Castilla y León:1; mx:Salamanca:Mexico:Guanajuato:0
santa cruz = es:Santa Cruz de Tenerife:Spain:Canary Islands:1; bo:Santa Cruz de la Sierra:Bolivia:Santa Cruz:1; us-ca:Santa Cruz:United States:California:1:ca
alicante = es:Alicante:Spain:Valencian Community:1
barcelona = es:Barcelona:Spain:Catalonia:1; ve:Barcelona:Venezuela:Anzoátegui:0
la paz = bo:La Paz:Bolivia:La Paz:1; mx:La Paz:Mexico:Baja California Sur:1
san juan = pr:San Juan:Puerto Rico:Puerto Rico:1; ar:San Juan:Argentina:San Juan:1
`;

// One country each: the big cities and the places foreign buyers look at. "country: name, name|alias, ..."
const SINGLE = `
Spain: madrid, malaga, marbella, bilbao, zaragoza, murcia, palma|palma de mallorca, las palmas, cadiz, huelva, almeria, jaen, jerez, estepona, fuengirola, benalmadena, torremolinos, nerja, mijas, benidorm, torrevieja, javea|xabia, denia, altea, calpe, gandia, castellon, tarragona, girona, lleida, san sebastian|donostia, vitoria, pamplona, santander, oviedo, gijon, a coruna|la coruna, vigo, pontevedra, lugo, ourense, valladolid, burgos, segovia, avila, soria, cuenca, albacete, ciudad real, badajoz, caceres, ibiza, menorca, mallorca, tenerife, gran canaria, lanzarote, fuerteventura, sitges, ronda, antequera, motril, almunecar, dos hermanas, alcala de guadaira, utrera, carmona, ecija, osuna, logrono, teruel, huesca, zamora, palencia
Portugal: lisbon|lisboa, porto|oporto, faro, lagos, albufeira, portimao, tavira, cascais, sintra, coimbra, braga, aveiro, setubal, funchal, madeira, algarve, evora, viseu, ericeira, comporta
Italy: rome|roma, milan|milano, turin|torino, venice|venezia, bologna, genoa|genova, palermo, catania, bari, lecce, pisa, siena, lucca, verona, padua|padova, trieste, cagliari, sardinia|cerdena, sicily|sicilia, puglia|apulia, tuscany|toscana, umbria, calabria, abruzzo, liguria, como, sanremo, taormina, sorrento, amalfi, perugia, ancona
France: lyon, marseille|marsella, nice|niza, bordeaux|burdeos, toulouse, nantes, montpellier, strasbourg, lille, cannes, antibes, biarritz, perpignan, avignon, aix en provence, provence, dordogne, brittany|bretana, normandy|normandia, corsica|corcega
Greece: athens|atenas, thessaloniki|tesalonica, crete|creta, rhodes|rodas, corfu, chania, heraklion, kalamata, patras, mykonos, santorini, peloponnese
Croatia: zagreb, split, dubrovnik, zadar, pula, rijeka, istria, hvar
Bulgaria: sofia, varna, burgas, plovdiv, bansko, sunny beach
Mexico: mexico city|ciudad de mexico|cdmx, cancun, playa del carmen, tulum, puerto vallarta, monterrey, puebla, queretaro, oaxaca, san miguel de allende, los cabos, cabo san lucas, mazatlan, acapulco, tijuana, ensenada
Colombia: bogota, medellin, cali, barranquilla, santa marta, pereira, manizales, bucaramanga
Argentina: buenos aires, rosario, mendoza, bariloche, mar del plata, salta, ushuaia
Chile: valparaiso, vina del mar, concepcion, la serena, puerto montt
Costa Rica: tamarindo, jaco, puerto viejo, nosara, santa teresa, guanacaste
Panama: panama city|ciudad de panama, boquete, bocas del toro, coronado
Dominican Republic: santo domingo, punta cana, puerto plata, las terrenas, sosua, cabarete
Brazil: rio de janeiro|rio, sao paulo, salvador, florianopolis, fortaleza, recife, natal
United Kingdom: london|londres, manchester, liverpool, birmingham, edinburgh|edimburgo, glasgow, bristol, leeds, cardiff
Ireland: dublin, cork, galway, limerick
Germany: berlin, munich|munchen|munich, hamburg|hamburgo, frankfurt|francfort, cologne|colonia|koln, dusseldorf, stuttgart, leipzig, dresden
Netherlands: amsterdam, rotterdam, the hague|la haya, utrecht, eindhoven
Belgium: brussels|bruselas, antwerp|amberes, ghent|gante, bruges|brujas
Switzerland: zurich, geneva|ginebra, basel|basilea, lausanne, lugano
Austria: vienna|viena, salzburg|salzburgo, innsbruck, graz
Denmark: copenhagen|copenhague, aarhus, odense
Sweden: stockholm|estocolmo, gothenburg|gotemburgo, malmo
Norway: oslo, bergen
Poland: warsaw|varsovia, krakow|cracovia, gdansk, wroclaw
Hungary: budapest
Czech Republic: prague|praga, brno
Turkey: istanbul|estambul, antalya, alanya, bodrum, izmir, fethiye
Cyprus: limassol, paphos|pafos, larnaca, nicosia
Malta: valletta|la valeta, sliema, gozo
Montenegro: kotor, budva, podgorica
Albania: tirana, durres, saranda|sarande
Morocco: marrakech|marrakesh, tangier|tanger, casablanca, agadir, essaouira, rabat, fez
Thailand: bangkok, phuket, chiang mai, pattaya, koh samui, hua hin
Indonesia: bali, jakarta, lombok, sumba, ubud, canggu, seminyak
Japan: tokyo, kyoto, osaka, sapporo, fukuoka, okinawa, niseko
Canada: toronto, vancouver, montreal, calgary, ottawa, quebec city
Venezuela: caracas, maracaibo
Nicaragua: managua, san juan del sur
Bolivia: cochabamba, sucre
Puerto Rico: rincon, dorado, ponce
`;

const BY_NAME = new Map<string, PlaceOpt[]>();
const add = (alias: string, o: PlaceOpt) => { const k = n(alias); if (!k) return; const l = BY_NAME.get(k) || []; if (!l.some((x) => x.id === o.id)) l.push(o); BY_NAME.set(k, l); };
for (const line of AMBIGUOUS.split("\n").map((s) => s.trim()).filter(Boolean)) {
  const [names, opts] = line.split("=").map((s) => s.trim());
  const list = opts.split(";").map((s) => s.trim()).filter(Boolean).map((s) => {
    const [id, name, country, region, major, state] = s.split(":");
    return { id, name, country, region: region || undefined, state: state || undefined, major: major === "1" } as PlaceOpt;
  });
  for (const a of names.split("|")) for (const o of list) add(a, o);
}
const CC: Record<string, string> = {
  Spain: "es", Portugal: "pt", Italy: "it", France: "fr", Greece: "gr", Croatia: "hr", Bulgaria: "bg", Mexico: "mx", Colombia: "co", Argentina: "ar", Chile: "cl",
  "Costa Rica": "cr", Panama: "pa", "Dominican Republic": "do", Brazil: "br", "United Kingdom": "gb", Ireland: "ie", Germany: "de", Netherlands: "nl", Belgium: "be",
  Switzerland: "ch", Austria: "at", Denmark: "dk", Sweden: "se", Norway: "no", Poland: "pl", Hungary: "hu", "Czech Republic": "cz", Turkey: "tr", Cyprus: "cy",
  Malta: "mt", Montenegro: "me", Albania: "al", Morocco: "ma", Thailand: "th", Indonesia: "id", Japan: "jp", Canada: "ca", Venezuela: "ve", Nicaragua: "ni",
  Bolivia: "bo", "Puerto Rico": "pr", "United States": "us",
};
const title = (s: string) => s.replace(/\b[a-z]/g, (c) => c.toUpperCase());
for (const line of SINGLE.split("\n").map((s) => s.trim()).filter(Boolean)) {
  const i = line.indexOf(":");
  const country = line.slice(0, i).trim();
  for (const item of line.slice(i + 1).split(",").map((s) => s.trim()).filter(Boolean)) {
    const aliases = item.split("|");
    const o: PlaceOpt = { id: CC[country] || "xx", name: title(aliases[0]), country, major: true };
    for (const a of aliases) if (!BY_NAME.has(n(a))) add(a, o);
  }
}

/** Every place we know by this name (empty when we do not know it). */
export function placeOptions(name: string | null | undefined): PlaceOpt[] {
  return BY_NAME.get(n(name || "")) || [];
}
/** Is this exactly a place name we know (the whole text)? */
export const isKnownPlace = (s: string) => BY_NAME.has(n(s));
/** The longest known place name inside a text (lower case, no accents), for sentences without "in" / "en". */
// place names that are also common words ("nice house", "split level", "casa como nueva", "lagos" = lakes)
const FIND_SKIP = new Set(["nice", "split", "como", "lagos", "rincon", "dorado", "natal", "salvador", "sucre", "rio", "la paz", "santa cruz", "san juan"]);
export function findKnownPlace(text: string): string | null {
  const t = " " + n(text) + " ";
  let best: string | null = null;
  for (const k of BY_NAME.keys()) if (k.length >= 4 && !FIND_SKIP.has(k) && t.includes(" " + k + " ") && (!best || k.length > best.length)) best = k;
  return best;
}

// The visitor's country from the browser's time zone (only the ones that matter for the names above).
const TZ: [RegExp, string][] = [
  [/^(Europe\/Madrid|Africa\/Ceuta|Atlantic\/Canary)$/, "Spain"], [/^(Europe\/Lisbon|Atlantic\/Madeira|Atlantic\/Azores)$/, "Portugal"], [/^Europe\/Rome$/, "Italy"],
  [/^Europe\/Paris$/, "France"], [/^America\/Bogota$/, "Colombia"], [/^America\/Caracas$/, "Venezuela"], [/^America\/(Argentina\/|Buenos_Aires|Cordoba)/, "Argentina"],
  [/^America\/(Mexico_City|Merida|Cancun|Monterrey|Chihuahua|Hermosillo|Mazatlan|Tijuana|Bahia_Banderas|Matamoros|Ojinaga|Ciudad_Juarez)$/, "Mexico"],
  [/^America\/Managua$/, "Nicaragua"], [/^America\/Costa_Rica$/, "Costa Rica"], [/^America\/(Santiago|Punta_Arenas)$/, "Chile"], [/^America\/Santo_Domingo$/, "Dominican Republic"],
  [/^America\/La_Paz$/, "Bolivia"], [/^America\/Puerto_Rico$/, "Puerto Rico"],
  [/^(America\/(New_York|Chicago|Denver|Los_Angeles|Phoenix|Anchorage|Detroit|Boise|Juneau|Indiana\/.*|Kentucky\/.*|North_Dakota\/.*)|Pacific\/Honolulu|US\/.*)$/, "United States"],
];
export function tzCountry(tz: string | null | undefined): string | null {
  const z = String(tz || "");
  for (const [re, c] of TZ) if (re.test(z)) return c;
  return null;
}

/**
 * Which of several places with the same name the person means, or null to ask. Taken without asking only when
 *  - the person already said the country or the US state, or
 *  - the sentence is a home search (not just the bare name) and the visitor's own country (from the time zone) is the
 *    country of exactly one of the big, well-known options (a Spanish visitor's "piso en Valencia" is Valencia, Spain).
 * Otherwise null: the page asks "Which Sevilla do you mean?".
 */
export function pickPlace(opts: PlaceOpt[], said: { country?: string | null; state?: string | null }, ctx: { tz?: string | null; bare?: boolean } = {}): PlaceOpt | null {
  if (!opts.length) return null;
  if (opts.length === 1) return opts[0];
  if (said.state) { const o = opts.filter((x) => x.state === said.state); if (o.length === 1) return o[0]; }
  if (said.country) { const o = opts.filter((x) => x.country === said.country); if (o.length === 1) return o[0]; }
  if (ctx.bare) return null;
  const vc = tzCountry(ctx.tz);
  if (vc) { const o = opts.filter((x) => x.major && x.country === vc); if (o.length === 1) return o[0]; }
  return null;
}
