// French wording of the listing pages (15-nov-2026), written in French, not translated string by string:
// seo/listings/pack.ts says what each entry is for. The reader is addressed with "vous", amounts are written
// "50 000 €", dates "13 novembre 2026", and a non-breaking space goes before : ; ? ! % (typo(), at the end).
// A page that lists houses and flats says "maisons et appartements"; a single one of them is "un bien".
import type { Pack, Facts, Form, Named } from "./pack";
import { areaBySlug, cityBySlug, NEAR_KM } from "./places";
import { titleIn, placeIn, grouped, NB, type PlaceWords } from "./packkit";

const num = (n: number) => grouped(n, NB);
const money = (n: number) => `${num(n)}${NB}€`;
const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const SHORT = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const dayN = (d: string) => { const n = Number(d.slice(8, 10)); return n === 1 ? "1er" : String(n); };

// [name, "en ..."]
const COUNTRY: Record<string, [string, string]> = {
  Spain: ["Espagne", "en Espagne"], Italy: ["Italie", "en Italie"], "United States": ["États-Unis", "aux États-Unis"], Denmark: ["Danemark", "au Danemark"], France: ["France", "en France"],
  Sweden: ["Suède", "en Suède"], Japan: ["Japon", "au Japon"], Poland: ["Pologne", "en Pologne"], Germany: ["Allemagne", "en Allemagne"], Netherlands: ["Pays-Bas", "aux Pays-Bas"],
  Greece: ["Grèce", "en Grèce"], Portugal: ["Portugal", "au Portugal"], Switzerland: ["Suisse", "en Suisse"], Mexico: ["Mexique", "au Mexique"], Canada: ["Canada", "au Canada"],
  Bulgaria: ["Bulgarie", "en Bulgarie"], "Dominican Republic": ["République dominicaine", "en République dominicaine"], Cyprus: ["Chypre", "à Chypre"], "United Kingdom": ["Royaume-Uni", "au Royaume-Uni"],
  Scandinavia: ["Scandinavie", "en Scandinavie"], Norway: ["Norvège", "en Norvège"], Ireland: ["Irlande", "en Irlande"], Colombia: ["Colombie", "en Colombie"], Uruguay: ["Uruguay", "en Uruguay"], Hungary: ["Hongrie", "en Hongrie"], "Czech Republic": ["Tchéquie", "en Tchéquie"], Slovenia: ["Slovénie", "en Slovénie"],
};
const country = (c: string) => COUNTRY[c]?.[0] || c;
const inC = (c: string) => COUNTRY[c]?.[1] || `dans ce pays (${c})`;

// Regions: English name of the data -> [name in French, the name after its preposition]. Towns are not here: they
// keep the name the country gives them and take "à".
const R: Record<string, [string, string]> = {
  // Italy
  Abruzzo: ["Abruzzes", "dans les Abruzzes"], Apulia: ["Pouilles", "dans les Pouilles"], Calabria: ["Calabre", "en Calabre"], "Lake Como": ["lac de Côme", "au bord du lac de Côme"], Como: ["Côme", "à Côme"],
  Lazio: ["Latium", "dans le Latium"], Lombardy: ["Lombardie", "en Lombardie"], Marche: ["Marches", "dans les Marches"], Piedmont: ["Piémont", "dans le Piémont"], Sardinia: ["Sardaigne", "en Sardaigne"],
  Sicily: ["Sicile", "en Sicile"], Tuscany: ["Toscane", "en Toscane"], Umbria: ["Ombrie", "en Ombrie"],
  // United Kingdom
  "Northern Ireland": ["Irlande du Nord", "en Irlande du Nord"], "County Down": ["comté de Down", "dans le comté de Down"], "County Fermanagh": ["comté de Fermanagh", "dans le comté de Fermanagh"], "County Mayo": ["comté de Mayo", "dans le comté de Mayo"], "County Galway": ["comté de Galway", "dans le comté de Galway"], "County Waterford": ["comté de Waterford", "dans le comté de Waterford"], "West Mani": ["Magne occidental", "dans le Magne occidental"], "Lake Balaton": ["lac Balaton", "au bord du lac Balaton"], "Karlovy Vary region": ["région de Karlovy Vary", "dans la région de Karlovy Vary"], "County Leitrim": ["comté de Leitrim", "dans le comté de Leitrim"], "County Durham": ["comté de Durham", "dans le comté de Durham"], Northumberland: ["Northumberland", "dans le Northumberland"],
  // France
  Aude: ["Aude", "dans l'Aude"], Aveyron: ["Aveyron", "dans l'Aveyron"], Charente: ["Charente", "en Charente"], "Corrèze": ["Corrèze", "en Corrèze"], Creuse: ["Creuse", "dans la Creuse"], Dordogne: ["Dordogne", "en Dordogne"],
  "Haute-Garonne": ["Haute-Garonne", "en Haute-Garonne"], "Haute-Marne": ["Haute-Marne", "en Haute-Marne"], "Haute-Vienne": ["Haute-Vienne", "en Haute-Vienne"], "Le Havre": ["Le Havre", "au Havre"], "Le Mans": ["Le Mans", "au Mans"],
  "Loir-et-Cher": ["Loir-et-Cher", "dans le Loir-et-Cher"], Nord: ["Nord", "dans le Nord"], "Nouvelle-Aquitaine": ["Nouvelle-Aquitaine", "en Nouvelle-Aquitaine"], Occitanie: ["Occitanie", "en Occitanie"], Orne: ["Orne", "dans l'Orne"],
  "Puy-de-Dôme": ["Puy-de-Dôme", "dans le Puy-de-Dôme"], Vienne: ["Vienne", "dans la Vienne"], Yonne: ["Yonne", "dans l'Yonne"],
  // Spain: provinces keep their Spanish name
  "A Coruña": ["A Coruña", "dans la province d'A Coruña"], Albacete: ["Albacete", "dans la province d'Albacete"], Alicante: ["Alicante", "dans la province d'Alicante"], "Almería": ["Almería", "dans la province d'Almería"],
  Asturias: ["Asturies", "dans les Asturies"], Barcelona: ["Barcelona", "dans la province de Barcelone"], Cantabria: ["Cantabrie", "en Cantabrie"], "Castellón": ["Castellón", "dans la province de Castellón"],
  "Cádiz": ["Cádiz", "dans la province de Cadix"], Fuerteventura: ["Fuerteventura", "à Fuerteventura"], Gipuzkoa: ["Gipuzkoa", "au Guipuscoa"], Girona: ["Girona", "dans la province de Gérone"],
  "Gran Canaria": ["Grande Canarie", "à la Grande Canarie"], Granada: ["Granada", "dans la province de Grenade"], Huelva: ["Huelva", "dans la province de Huelva"], "La Palma": ["La Palma", "à La Palma"],
  "Las Palmas": ["Las Palmas", "dans la province de Las Palmas"], Lugo: ["Lugo", "dans la province de Lugo"], Madrid: ["Madrid", "dans la région de Madrid"], Murcia: ["Murcia", "dans la région de Murcie"],
  "Málaga": ["Málaga", "dans la province de Málaga"], Salamanca: ["Salamanca", "dans la province de Salamanque"], Sevilla: ["Sevilla", "dans la province de Séville"], Tarragona: ["Tarragona", "dans la province de Tarragone"],
  Tenerife: ["Tenerife", "à Tenerife"], Teruel: ["Teruel", "dans la province de Teruel"], Valencia: ["Valencia", "dans la province de Valence (Valencia)"], Valladolid: ["Valladolid", "dans la province de Valladolid"],
  // Denmark
  "Central Jutland": ["Jutland central", "dans le Jutland central"], "East Jutland": ["Jutland de l'Est", "dans l'est du Jutland"], "North Jutland": ["Jutland du Nord", "dans le nord du Jutland"],
  "West Jutland": ["Jutland de l'Ouest", "dans l'ouest du Jutland"], "South Jutland": ["Jutland du Sud", "dans le sud du Jutland"], "Sønderjylland": ["Sønderjylland", "dans le Sønderjylland (sud du Jutland)"],
  Falster: ["Falster", "sur l'île de Falster"], Funen: ["Fionie", "en Fionie"], Lolland: ["Lolland", "sur l'île de Lolland"], Mors: ["Mors", "sur l'île de Mors"], Thy: ["Thy", "dans le Thy"],
  "West Zealand": ["ouest du Seeland", "dans l'ouest du Seeland"],
  // Japan: prefectures
  Fukui: ["Fukui", "dans la préfecture de Fukui"], Gifu: ["Gifu", "dans la préfecture de Gifu"], Gunma: ["Gunma", "dans la préfecture de Gunma"], Hyogo: ["Hyogo", "dans la préfecture de Hyogo"],
  Kagawa: ["Kagawa", "dans la préfecture de Kagawa"], Kanagawa: ["Kanagawa", "dans la préfecture de Kanagawa"], Kyoto: ["Kyoto", "dans la préfecture de Kyoto"], Nagano: ["Nagano", "dans la préfecture de Nagano"],
  Niigata: ["Niigata", "dans la préfecture de Niigata"], Oita: ["Oita", "dans la préfecture d'Oita"], Okayama: ["Okayama", "dans la préfecture d'Okayama"], Shiga: ["Shiga", "dans la préfecture de Shiga"],
  Shizuoka: ["Shizuoka", "dans la préfecture de Shizuoka"], Tochigi: ["Tochigi", "dans la préfecture de Tochigi"], Wakayama: ["Wakayama", "dans la préfecture de Wakayama"], Yamanashi: ["Yamanashi", "dans la préfecture de Yamanashi"],
  // Portugal: districts
  Beja: ["Beja", "dans le district de Beja"], "Bragança": ["Bragança", "dans le district de Bragance"], "Castelo Branco": ["Castelo Branco", "dans le district de Castelo Branco"], Portalegre: ["Portalegre", "dans le district de Portalegre"],
  "Santarém": ["Santarém", "dans le district de Santarém"], Viseu: ["Viseu", "dans le district de Viseu"], "Évora": ["Évora", "dans le district d'Évora"],
  // Bulgaria, Cyprus, Greece
  "Black Sea": ["mer Noire", "au bord de la mer Noire"], Famagusta: ["Famagouste", "dans le district de Famagouste"], Paphos: ["Paphos", "dans le district de Paphos"],
  Crete: ["Crète", "en Crète"], Halkidiki: ["Chalcidique", "en Chalcidique"], Lesbos: ["Lesbos", "à Lesbos"], Messinia: ["Messénie", "en Messénie"], "North Evia": ["nord de l'Eubée", "dans le nord de l'Eubée"], Evia: ["Eubée", "en Eubée"],
  Pelion: ["Pélion", "dans le Pélion"], Rhodes: ["Rhodes", "à Rhodes"], Samos: ["Samos", "à Samos"], Sporades: ["Sporades", "dans les Sporades"], Corfu: ["Corfou", "à Corfou"], Peloponnese: ["Péloponnèse", "dans le Péloponnèse"],
  // United States and Canada
  Arkansas: ["Arkansas", "en Arkansas"], Florida: ["Floride", "en Floride"], Illinois: ["Illinois", "dans l'Illinois"], Indiana: ["Indiana", "dans l'Indiana"], Kentucky: ["Kentucky", "dans le Kentucky"], Maine: ["Maine", "dans le Maine"],
  Maryland: ["Maryland", "dans le Maryland"], "Allegheny Mountains": ["monts Allegheny", "dans les monts Allegheny"], Michigan: ["Michigan", "dans le Michigan"], Missouri: ["Missouri", "dans le Missouri"],
  "New York": ["État de New York", "dans l'État de New York"], "North Carolina": ["Caroline du Nord", "en Caroline du Nord"], Ohio: ["Ohio", "dans l'Ohio"], Oklahoma: ["Oklahoma", "en Oklahoma"],
  Pennsylvania: ["Pennsylvanie", "en Pennsylvanie"], "South Carolina": ["Caroline du Sud", "en Caroline du Sud"], Texas: ["Texas", "au Texas"], "West Virginia": ["Virginie-Occidentale", "en Virginie-Occidentale"],
  Wisconsin: ["Wisconsin", "dans le Wisconsin"], "Lake Superior region": ["région du lac Supérieur", "dans la région du lac Supérieur"],
  "New Brunswick": ["Nouveau-Brunswick", "au Nouveau-Brunswick"], Newfoundland: ["Terre-Neuve", "à Terre-Neuve"], "Nova Scotia": ["Nouvelle-Écosse", "en Nouvelle-Écosse"], Saskatchewan: ["Saskatchewan", "en Saskatchewan"],
  "Prince Edward Island": ["Île-du-Prince-Édouard", "à l'Île-du-Prince-Édouard"],
  "Big Wolf Lake": ["Big Wolf Lake", "à Big Wolf Lake"], "Canadohta Lake": ["Canadohta Lake", "à Canadohta Lake"], "French Island": ["French Island", "à French Island"], "East Palestine": ["East Palestine", "à East Palestine"],
  // Switzerland, Mexico, Dominican Republic
  Bern: ["canton de Berne", "dans le canton de Berne"], "Neuchâtel": ["canton de Neuchâtel", "dans le canton de Neuchâtel"], "St. Gallen": ["canton de Saint-Gall", "dans le canton de Saint-Gall"], Valais: ["Valais", "en Valais"],
  Jalisco: ["Jalisco", "dans l'État de Jalisco"], Puebla: ["Puebla", "dans l'État de Puebla"], Sinaloa: ["Sinaloa", "dans l'État de Sinaloa"],
  "Samaná": ["Samaná", "dans la province de Samaná"], "San Pedro de Macorís": ["San Pedro de Macorís", "dans la province de San Pedro de Macorís"],
  // Sweden and Norway
  Blekinge: ["Blekinge", "dans le Blekinge"], "Central Sweden": ["centre de la Suède", "dans le centre de la Suède"], "Northern Sweden": ["nord de la Suède", "dans le nord de la Suède"], Dalsland: ["Dalsland", "dans le Dalsland"],
  "Gävleborg": ["Gävleborg", "dans le comté de Gävleborg"], "Jämtland": ["Jämtland", "dans le Jämtland"], "Jönköping": ["Jönköping", "dans le comté de Jönköping"], Kronoberg: ["Kronoberg", "dans le comté de Kronoberg"],
  Medelpad: ["Medelpad", "dans le Medelpad"], Norrbotten: ["Norrbotten", "dans le Norrbotten"], "Skåne": ["Scanie", "en Scanie"], "Småland": ["Småland", "dans le Småland"], "Värmland": ["Värmland", "dans le Värmland"],
  "Västerbotten": ["Västerbotten", "dans le Västerbotten"], "Västernorrland": ["Västernorrland", "dans le Västernorrland"], "Västra Götaland": ["Västra Götaland", "dans le Västra Götaland"], Telemark: ["Telemark", "dans le Telemark"],
  // Germany and Poland
  Bremen: ["Brême", "à Brême"], Saxony: ["Saxe", "en Saxe"], Thuringia: ["Thuringe", "en Thuringe"], "Saxony-Anhalt": ["Saxe-Anhalt", "en Saxe-Anhalt"],
  "Greater Poland": ["Grande-Pologne", "en Grande-Pologne"], "Kuyavia-Pomerania": ["Couïavie-Poméranie", "en Couïavie-Poméranie"], "Lower Silesia": ["Basse-Silésie", "en Basse-Silésie"], Lubusz: ["Lubusz", "dans la voïvodie de Lubusz"],
  Masovia: ["Mazovie", "en Mazovie"], Opole: ["Opole", "dans la voïvodie d'Opole"], Podlaskie: ["Podlachie", "en Podlachie"], Pomerania: ["Poméranie", "en Poméranie"], Silesia: ["Silésie", "en Silésie"],
  Subcarpathia: ["Basses-Carpates", "dans les Basses-Carpates"], "Warmia-Masuria": ["Varmie-Mazurie", "en Varmie-Mazurie"], "West Pomerania": ["Poméranie occidentale", "en Poméranie occidentale"],
  "Świętokrzyskie": ["Sainte-Croix", "dans la voïvodie de Sainte-Croix"],
};
const IN: Record<string, string> = {};
for (const [fr, at] of Object.values(R)) IN[fr] = at;
for (const [en, [fr, at]] of Object.entries(COUNTRY)) { IN[fr] = at; IN[en] = at; }
const IN_COUNTRY: Record<string, string> = Object.fromEntries(Object.values(COUNTRY));

/** "de" in front of a name: "d'Alicante", "de Bicorp", "du Havre". Never elided before an h. */
const VOWEL = /^[AEIOUÀÁÂÄÅÆÉÈÊËÍÎÏÓÔÖØÚÛÜaeiouàáâäåæéèêëíîïóôöøúûü]|^[Yy](?![aeiouAEIOU])/;
const DU: Record<string, string> = { "Le Havre": "du Havre", "Le Mans": "du Mans" };
const de = (n: string) => DU[n] || (VOWEL.test(n) ? `d'${n}` : `de ${n}`);

export const PLACES: PlaceWords = {
  map: Object.fromEntries(Object.entries(R).map(([en, [fr]]) => [en, fr])),
  near: (n, card) => (card ? `près ${de(n)}` : `environs ${de(n)}`),
  central: (n) => `centre ${de(n)}`,
  area: (n) => `secteur ${de(n)}`,
};
const place = (n: string, _cc?: string, where?: "card") => placeIn(PLACES, n, where);
// idea 84 of the second list (21 Nov 2026): the description names where the cheapest home is, as the English and Spanish ones do
const cheapIn = (F: { cheapest: { town: string } }) => { const t = F.cheapest?.town ? place(F.cheapest.town, undefined, "card") : ""; return t ? ` (${t})` : ""; };
/** "en Toscane", "dans les Pouilles", "à Bicorp", "dans les environs de Ringsted": a place after its preposition. */
function inR(n: string): string {
  if (IN[n]) return IN[n];
  const m = /^(.+?) \(([^()]+)\)$/.exec(n);
  if (m) return `${inR(m[1])} (${m[2]})`;
  if (/^environs /.test(n)) return `dans les ${n}`;
  if (/^(centre|secteur) /.test(n)) return `dans le ${n}`;
  if (/^près /.test(n)) return n;
  return `à ${n}`;
}

// [label, "sur la ..."]
const AREA: Record<string, [string, string]> = {
  "costa-del-sol": ["Costa del Sol", "sur la Costa del Sol"], "costa-blanca": ["Costa Blanca", "sur la Costa Blanca"], "costa-calida": ["Costa Cálida", "sur la Costa Cálida"], "costa-de-almeria": ["Costa de Almería", "sur la Costa de Almería"],
  "canary-islands": ["Canaries", "aux Canaries"], "balearic-islands": ["Baléares", "aux Baléares"], "green-spain": ["Espagne verte", "dans l'Espagne verte"], algarve: ["Algarve", "en Algarve"],
  "southern-italy": ["Italie du Sud", "en Italie du Sud"], "abruzzo-and-marche": ["Abruzzes et Marches", "dans les Abruzzes et les Marches"], lunigiana: ["Lunigiana", "en Lunigiana"], "lake-maggiore": ["Lac Majeur", "autour du lac Majeur"], "lake-garda": ["Lac de Garde", "autour du lac de Garde"],
  limousin: ["Limousin", "dans le Limousin"], hokkaido: ["Hokkaido", "à Hokkaido"], tohoku: ["Tohoku", "dans le Tohoku"], kanto: ["Kanto", "dans le Kanto"], chubu: ["Chubu", "dans le Chubu"], kansai: ["Kansai", "dans le Kansai"], chugoku: ["Chugoku", "dans le Chugoku"],
  shikoku: ["Shikoku", "à Shikoku"], kyushu: ["Kyushu", "à Kyushu"], norrland: ["Norrland", "dans le Norrland"], jutland: ["Jutland", "dans le Jutland"], "lolland-falster": ["Lolland et Falster", "sur les îles de Lolland et de Falster"],
  "andalusia": ["Andalousie", "en Andalousie"],
  "valencian-community": ["Communauté valencienne", "dans la Communauté valencienne"],
  "catalonia": ["Catalogne", "en Catalogne"],
  "galicia": ["Galice", "en Galice"],
  "castile-and-leon": ["Castille-et-León", "en Castille-et-León"],
  "aragon": ["Aragon", "en Aragon"],
  "castilla-la-mancha": ["Castille-La Manche", "en Castille-La Manche"],
  "basque-country": ["Pays basque", "au Pays basque"],
  "boca-raton": ["Boca Raton", "à Boca Raton"],
  "hollywood": ["Hollywood (Floride)", "à Hollywood (Floride)"],
  "doral": ["Doral", "à Doral"],
  "amsterdam-zuidoost": ["Amsterdam-Zuidoost", "à Amsterdam-Zuidoost"], "eastern-germany": ["Saxe, Saxe-Anhalt et Thuringe", "en Saxe, en Saxe-Anhalt et en Thuringe"], masuria: ["Mazurie", "en Mazurie"],
  peloponnese: ["Péloponnèse", "dans le Péloponnèse"], "black-sea-coast": ["Côte de la mer Noire", "sur la côte de la mer Noire"], "atlantic-canada": ["Canada atlantique", "dans les provinces atlantiques du Canada"],
};
const areaL = (f: { area?: string }) => AREA[f.area || ""]?.[0] || String(f.area || "");
const areaIn = (f: { area?: string }) => AREA[f.area || ""]?.[1] || `dans le secteur ${de(String(f.area))}`;
for (const [l, i] of Object.values(AREA)) IN[l] = i;
// Valencia keeps its Spanish name: "Valence" is also a French town.
const CITY: Record<string, string> = { barcelona: "Barcelone", seville: "Séville", milan: "Milan", rome: "Rome", florence: "Florence", naples: "Naples", copenhagen: "Copenhague", gothenburg: "Göteborg", lisbon: "Lisbonne", athens: "Athènes", warsaw: "Varsovie",
  geneva: "Genève", zurich: "Zurich", tokyo: "Tokyo", london: "Londres", berlin: "Berlin", vienna: "Vienne (Autriche)", prague: "Prague", krakow: "Cracovie", venice: "Venise", turin: "Turin", genoa: "Gênes", munich: "Munich", cologne: "Cologne", hamburg: "Hambourg" };
const city = (slug: string) => CITY[slug] || cityBySlug(slug)?.[1] || slug;

const s = (n: number, one: string, many: string) => (n === 1 ? one : many);
const list = (l: Named[]) => l.map((x) => `${x.name} (${x.n})`).join(", ");
const upper = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
const pc = (x: string) => x.replace(/(\d)\.(\d)/g, "$1,$2").replace(/\s*[-–]\s*/g, " à ");
const dot = (x: string) => (x ? (/[.!?]$/.test(x.trim()) ? `. Détail : ${x.trim()}` : `. Détail : ${x.trim()}.`) : ".");
const range = (lo: string, hi: string) => (lo === hi ? `environ ${lo}` : `de ${lo} à ${hi}`);
const bedsN = (n: number) => (n === 4 ? "4 chambres ou plus" : n === 1 ? "1 chambre" : `${n} chambres`);
const bedsW = (n: number) => (n === 4 ? "de 4 chambres ou plus" : n === 1 ? "d'une chambre" : `de ${n} chambres`);
const biens = (n: number) => `${n} ${s(n, "bien", "biens")}`;

// [plural, singular, "cheap" plural, "cheapest" singular (after the article)]
const NOUN = {
  house: ["maisons", "maison", "maisons pas chères", "maison la moins chère"],
  apartment: ["appartements", "appartement", "appartements pas chers", "appartement le moins cher"],
  mixed: ["maisons et appartements", "bien", "maisons et appartements pas chers", "bien le moins cher"],
} as const;
const FORM = { many: 0, one: 1, cheap: 2, cheapest: 3 } as const;
const fem = (x: string) => /^maison(?!s? et appartements)/.test(x);
/** "la maison...", "l'appartement...", "le bien...": the article of the first noun of the phrase. */
const le = (x: string) => (fem(x) ? `la ${x}` : /^appartement/.test(x) ? `l'${x}` : `le ${x}`);
const un = (x: string) => (fem(x) ? `une ${x}` : `un ${x}`);
const fixed = (forms: [string, string, string, string]) => (_b: string, f: Form) => forms[FORM[f]];
/** An adjective that agrees with the noun: "maisons prêtes à emménager", "appartement prêt à emménager". */
const adj = (m: string, f: string, rest: string) => (b: string, form: Form) => `${b} ${fem(b) ? f : m}${form === "many" || form === "cheap" ? "s" : ""}${rest}`;
const KEYED: Record<string, (b: string, form: Form) => string> = {
  "village-houses": fixed(["maisons de village", "maison de village", "maisons de village pas chères", "maison de village la moins chère"]),
  "with-garden": (b) => `${b} avec jardin`,
  "with-pool": (b) => `${b} avec piscine`,
  "with-sauna": (b) => `${b} avec sauna`,
  "stone-houses": fixed(["maisons en pierre", "maison en pierre", "maisons en pierre pas chères", "maison en pierre la moins chère"]),
  "cabins-and-cottages": fixed(["chalets et cabanes", "chalet", "chalets et cabanes pas chers", "chalet le moins cher"]),
  "with-a-terrace": (b) => `${b} avec terrasse ou balcon`,
  turnkey: adj("prêt", "prête", " à emménager"),
  "to-renovate": (b) => `${b} à rénover`,
  "with-sea-view": (b) => `${b} avec vue sur la mer`,
  "with-land": (b) => `${b} avec 1${NB}000 m² de terrain ou plus`,
  "with-fireplace": (b) => `${b} avec cheminée`,
  "with-garage": (b) => `${b} avec garage`,
  "with-olive-trees-or-vines": (b) => `${b} avec oliviers, vignes ou arbres fruitiers`,
  "under-500-per-sqm": (b) => `${b} à moins de 500${NB}€/m²`,
  "over-100-sqm-under-50000": (b) => `${b} de plus de 100 m² à moins de 50${NB}000${NB}€`,
  "score-90-plus": (b) => `${b} avec une note de 90 ou plus`,
  "editors-picks": (b) => `${b} de la sélection de la rédaction`,
  "new-this-month": adj("ajouté", "ajoutée", " depuis 30 jours"),
  "price-drops": (b) => `${b} dont le prix a baissé`,
  "single-storey": (b) => `${b} de plain-pied`,
  "with-period-features": (b) => `${b} avec éléments d'époque`,
  "good-weather": (b) => `${b} avec 150 jours de beau temps ou plus par an`,
  "low-community-fee": (b) => `${b} avec de faibles charges de copropriété`,
  "cave-houses": fixed(["maisons troglodytes", "maison troglodyte", "maisons troglodytes pas chères", "maison troglodyte la moins chère"]),
  trulli: fixed(["trulli", "trullo", "trulli pas chers", "trullo le moins cher"]),
  "unusual-buildings": fixed(["châteaux, moulins, églises et autres bâtiments insolites", "bâtiment insolite", "châteaux, moulins, églises et autres bâtiments insolites pas chers", "bâtiment insolite le moins cher"]),
  "with-business-premises": (b) => `${b} avec local commercial`,
  "with-fibre-internet": (b) => `${b} avec la fibre optique`,
  "with-tourist-licence": (b) => `${b} avec licence de location touristique`,
  "new-this-week": adj("ajouté", "ajoutée", " depuis 7 jours"),
  "over-80-sqm": (b) => `${b} de plus de 80 m²`,
  "over-120-sqm": (b) => `${b} de plus de 120 m²`,
};
// Where a home is goes after "à vendre": "maisons à vendre en bord de mer en Espagne".
const AFTER: Record<string, string> = { "by-the-sea": " en bord de mer", "in-town": " en ville", "near-a-lake": " près d'un lac", "on-an-island": " sur une île", "in-the-mountains": " à la montagne", "near-the-beach": " à 500 m de la mer au plus",
  "near-an-airport": " à 30 km d'un aéroport au plus", "quiet-location": " loin de l'autoroute et de la voie ferrée" };
const ccy = (n: number, c: string) => `${num(n)} ${c === "GBP" ? "livres sterling" : c === "USD" ? "dollars américains" : "euros"}`;
const cityOf = (f: { city?: string }) => city(f.city || "");
const AMEN: Record<string, string> = { garden: "jardin", terrace: "terrasse", garage: "garage", pool: "piscine", fireplace: "cheminée", sauna: "sauna" };
const LABEL: Record<string, string> = { "by-the-sea": "En bord de mer", "village-houses": "Maisons de village", "in-town": "En ville", "near-a-lake": "Près d'un lac", "with-garden": "Avec jardin", "with-pool": "Avec piscine", "with-sauna": "Avec sauna", "stone-houses": "Maisons en pierre",
  "cabins-and-cottages": "Chalets et cabanes", "with-a-terrace": "Avec terrasse", apartments: "Appartements", houses: "Maisons",
  turnkey: "Prêt à emménager", "to-renovate": "À rénover", "with-sea-view": "Vue sur la mer", "near-the-beach": "À 500 m de la mer", "with-land": "Avec terrain", "with-fireplace": "Avec cheminée", "with-garage": "Avec garage",
  "on-an-island": "Sur une île", "in-the-mountains": "À la montagne", "with-olive-trees-or-vines": "Oliviers ou vignes", "near-an-airport": "Près d'un aéroport", "under-500-per-sqm": `Moins de 500${NB}€/m²`, "over-100-sqm-under-50000": `Plus de 100 m² à moins de 50${NB}000${NB}€`,
  "score-90-plus": "Note de 90 ou plus", "editors-picks": "Sélection de la rédaction", "new-this-month": "Nouveautés du mois", "price-drops": "Prix en baisse", "single-storey": "De plain-pied", "with-period-features": "Éléments d'époque", "good-weather": "Beau temps",
  "quiet-location": "Au calme", "low-community-fee": "Faibles charges", "cave-houses": "Maisons troglodytes", trulli: "Trulli", "unusual-buildings": "Bâtiments insolites", "with-business-premises": "Avec local commercial", "with-fibre-internet": "Fibre optique", "best-rated": "Top 10 par note", "new-this-week": "Nouveautés de la semaine", "over-80-sqm": "Plus de 80 m²", "over-120-sqm": "Plus de 120 m²", "with-tourist-licence": "Location touristique autorisée",
  cheapest: "Les moins chers", "most-space-for-the-money": "Le plus de surface pour le prix" };

function what(F: Facts, form: Form = "many"): string {
  const f = F.f;
  const b = NOUN[f.kind === "ptype" ? (f.key === "apartments" ? "apartment" : "house") : F.noun][FORM[form]];
  const where = f.country ? ` ${inC(f.country)}` : "";
  const under = f.cap ? ` à moins de ${f.kind === "ccyBand" ? ccy(f.cap, f.ccy!) : money(f.cap)}` : "";
  const sale = " à vendre";
  if (f.ranked) {
    const pl = NOUN[F.noun][0], sg = NOUN[F.noun][1];
    const single = form === "one" || form === "cheapest";
    if (f.key === "cheapest") return single ? `${NOUN[F.noun][3]}${sale}${where}` : `${F.n} ${pl} les moins ${fem(pl) ? "chères" : "chers"}${sale}${where}`;
    return single ? `${sg}${sale}${where} avec le plus de surface pour le prix` : `${F.n} ${pl}${sale}${where} avec le plus de surface pour le prix`;
  }
  const keyed = (k: string) => (AFTER[k] ? `${b}${sale}${AFTER[k]}` : `${KEYED[k](b, form)}${sale}`);
  switch (f.kind) {
    case "combo": return f.key === "apartments" || f.key === "houses" ? `${NOUN[f.key === "apartments" ? "apartment" : "house"][FORM[form]]}${sale}${where}${under}` : `${keyed(f.key!)}${where}${under}`;
    case "area": return `${b}${sale} ${areaIn(f)}`;
    case "near": return `${b}${sale} à moins de ${NEAR_KM} km ${de(cityOf(f))}`;
    case "region": return `${b}${sale} ${inR(place(f.region!) || f.region!)} (${country(f.country!)})`;
    case "town": return `${b}${sale} ${inR(String(f.town))} (${place(f.region!) || f.region})`;
    case "regionBand": return f.area ? `${b}${sale} ${areaIn(f)}${under}` : `${b}${sale} ${inR(place(f.region!) || f.region!)} (${country(f.country!)})${under}`;
    case "setting": case "feature": case "gfeature": return `${keyed(f.key!)}${where}`;
    case "beds": return `${b} ${bedsW(f.beds!)}${sale}${where}`;
    default: return `${b}${sale}${where}${under}`;
  }
}

const HOW: Record<string, string> = {
  turnkey: "Sur cette liste : les biens dont l'annonce précise qu'ils sont prêts à emménager ou entièrement rénovés. Nous ne les avons pas visités : demandez la date des travaux et les factures.",
  "to-renovate": "Sur cette liste : les biens dont l'annonce indique qu'ils sont à rénover ou vendus comme projet. Les annonces ne chiffrent presque jamais les travaux : demandez un devis écrit à un artisan local avant de faire une offre.",
  "with-sea-view": "Sur cette liste : les biens dont l'annonce mentionne une vue sur la mer. Il s'agit parfois d'une simple bande de mer entre deux toits : regardez les photos et la carte.",
  "near-the-beach": "Sur cette liste : les biens situés à 500 m du rivage au plus, distance mesurée à vol d'oiseau. À pied, le trajet peut être plus long.",
  "with-land": `Sur cette liste : les biens dont l'annonce indique un terrain de 1${NB}000 m² ou plus, en m², en hectares ou en acres. Vérifiez ce chiffre au cadastre ou au registre foncier avant d'acheter.`,
  "with-fireplace": "Sur cette liste : les biens dont l'annonce montre ou mentionne une cheminée. Demandez si le conduit a été ramoné et contrôlé.",
  "with-garage": "Sur cette liste : les biens dont l'annonce mentionne un garage.",
  "on-an-island": "Sur cette liste : les biens situés sur des îles que l'on cherche par leur nom, de Tenerife et de la Sicile à la Crète et à la Fionie. Les îles de la taille d'un pays n'en font pas partie.",
  "in-the-mountains": "Sur cette liste : les biens qui, d'après l'annonce, se trouvent à la montagne, ont vue sur la montagne ou sont proches d'une station de ski.",
  "with-olive-trees-or-vines": "Sur cette liste : les biens dont l'annonce mentionne des oliviers, des vignes, un verger ou des arbres fruitiers.",
  "near-an-airport": "Sur cette liste : les biens dont l'aéroport le plus proche se trouve à 30 km au plus à vol d'oiseau. Par la route, c'est plus long.",
  "under-500-per-sqm": `Sur cette liste : les biens dont le prix affiché, divisé par la surface habitable de l'annonce, donne moins de 500${NB}€ par m². Une annonce sans surface ne peut pas y figurer.`,
  "over-100-sqm-under-50000": `Sur cette liste : les biens de 100 m² ou plus dont le prix affiché ne dépasse pas 50${NB}000${NB}€.`,
  "score-90-plus": "Sur cette liste : les biens dont la note RealHunt est de 90 ou plus, sur un maximum de 98. La note compare le prix, la surface, l'état, la situation et les frais d'achat avec ceux de tous les autres biens du site.",
  "editors-picks": "Sur cette liste : les biens qu'un membre de l'équipe RealHunt a mis en avant après avoir examiné l'annonce. Personne ne paie pour y figurer.",
  "new-this-month": "Sur cette liste : les biens ajoutés à RealHunt au cours des 30 derniers jours.",
  "price-drops": "Sur cette liste : les biens dont le prix affiché a baissé depuis que nous les avons publiés. La baisse est l'écart entre le premier prix que nous avons vu et le prix actuel.",
  "single-storey": "Sur cette liste : les biens qui, d'après l'annonce, sont de plain-pied, sans escalier entre les pièces.",
  "with-period-features": "Sur cette liste : les biens dont l'annonce mentionne l'âge ou des éléments d'époque : le siècle, des poutres ou des sols d'origine, des plafonds voûtés, des colombages ou une protection au titre du patrimoine. Nous ne connaissons pas l'année de construction de tous les biens.",
  "good-weather": "Sur cette liste : les biens situés dans des lieux qui comptent 150 jours de beau temps ou plus par an d'après les moyennes climatiques : température maximale de 18 à 33 °C, pas de pluie et peu de vent.",
  "quiet-location": "Sur cette liste : les biens près desquels OpenStreetMap ne montre ni autoroute ni voie ferrée et pour lesquels notre vérification des routes, du rail et des aéroports indique peu de bruit. C'est une vérification sur carte, pas une mesure acoustique.",
  "low-community-fee": "Sur cette liste : les biens dont l'annonce indique des charges mensuelles de 250 au plus dans leur monnaie (euros, dollars ou livres). La plupart des annonces n'indiquent pas les charges et ne peuvent donc pas y figurer.",
  "cave-houses": "Sur cette liste : les biens que l'annonce décrit comme une maison troglodyte.",
  trulli: "Sur cette liste : les biens que l'annonce décrit comme un trullo.",
  "unusual-buildings": "Sur cette liste : les biens dont le titre mentionne un château, un manoir, un moulin, une maison-tour ou une ancienne église, école ou gare.",
  "with-business-premises": "Sur cette liste : les biens dont le titre mentionne un commerce, un bar, un restaurant, un hébergement ou d'autres locaux professionnels vendus avec le bien. La réouverture de l'activité dépend des autorisations de la commune : renseignez-vous à la mairie.",
  "with-fibre-internet": "Sur cette liste : les biens dont l'annonce mentionne la fibre optique ou une connexion rapide. Nous ne testons pas les connexions : demandez au vendeur un test de débit récent.",
  "with-tourist-licence": "Sur cette liste : les biens dont l'annonce mentionne une licence de location touristique. La licence peut s'éteindre avec la vente : renseignez-vous à la mairie avant d'y compter.",
  "new-this-week": "Sur cette liste : les biens ajoutés à RealHunt au cours des 7 derniers jours. La liste est refaite chaque jour.",
  "over-80-sqm": "Sur cette liste : les biens dont l'annonce indique plus de 80 m² habitables. Une annonce sans surface ne peut pas y figurer.",
  "over-120-sqm": "Sur cette liste : les biens dont l'annonce indique plus de 120 m² habitables. Une annonce sans surface ne peut pas y figurer.",
};

const words: Pack = {
  lang: "fr",
  money,
  perSqm: (n) => `${num(n)}${NB}€/m²`,
  date: (d) => `${dayN(d)} ${MONTHS[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`,
  dateShort: (d) => `${dayN(d)} ${SHORT[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`,
  country,
  inC,
  place,
  homeTitle: (h) => titleIn("fr", h),
  homeWhy: () => "",
  what,
  h1: (F) => (F.f.ranked ? `Les ${what(F)}${F.f.country ? "" : " sur RealHunt"}`
    : upper(what(F, (F.f.cap && F.f.cap <= 100000) || (["gfeature", "feature", "area", "near"].includes(F.f.kind) && F.median <= 100000) ? "cheap" : "many"))),
  title: (h1, n, min) => (/^Les \d/.test(h1) ? `${h1}, dès ${min}` : `${h1} : ${n} annonces dès ${min}`),
  desc: (F, w) => `${F.f.ranked ? `Les ${w}` : `${F.n} ${w}`}, de ${money(F.min)}${cheapIn(F)} à ${money(F.max)}. Prix médian : ${money(F.median)}${F.scoreAvg ? `, note moyenne ${F.scoreAvg} sur 98` : ""}. Photos, surfaces, notes, frais d'achat et points à vérifier.`,
  crumbRoot: "RealHunt", crumbCheap: "Maisons pas chères",
  crumbCountry: (c) => `Maisons ${IN_COUNTRY[c] || IN[c] || `: ${c}`}`,
  label: (f) => (f.kind === "combo" ? `${LABEL[f.key!] || f.key}, moins de ${money(f.cap!)}` : f.kind === "ccyBand" ? `Moins de ${ccy(f.cap!, f.ccy!)}` : f.kind === "area" ? areaL(f) : f.kind === "near" ? `Près ${de(cityOf(f))}`
    : f.cap ? `Moins de ${money(f.cap)}` : f.kind === "region" ? upper(place(String(f.region)) || String(f.region)) : f.kind === "town" ? String(f.town) : f.kind === "beds" ? bedsN(f.beds!) : f.kind === "country" ? country(String(f.country)) : LABEL[f.key!] || String(f.key)),
  updated: (d, newest) => `Mis à jour le ${d}.${newest ? ` Dernier bien ajouté le ${newest}.` : ""}`,
  l1: (n, w, min, max) => (min === max ? `RealHunt compte aujourd'hui ${n} ${w}, tous au même prix : ${min}.` : `RealHunt compte aujourd'hui ${n} ${w}, de ${min} à ${max}.`),
  l2: (title, town, price, sqm, beds) => `L'annonce la moins chère est à ${price} : ${title}, ${inR(town)}${sqm || beds ? ` (${[sqm ? `${sqm} m²` : "", beds ? bedsN(beds) : ""].filter(Boolean).join(", ")})` : ""}.`,
  l3: (med, pp, pMed, pPp, parent) => `Le prix médian est de ${med}${pp ? ` (${pp})` : ""}, contre ${pMed}${pPp ? ` (${pPp})` : ""} pour ${parent}.`,
  l3all: (med, pp, max, parent) => `Le prix médian est de ${med}${pp ? ` (${pp})` : ""}. Cette page les réunit tous : parmi ${parent}, aucun ne dépasse ${max}.`,
  parent: (kind, n, name, countries) => (kind === "site" ? `les ${n} biens que RealHunt recense dans ${countries} pays` : kind === "country" ? `les ${n} biens que nous recensons ${name}` : `les ${n} biens que nous recensons ${inR(name)}`),
  kpi: { homes: "Biens", from: "À partir de", median: "Prix médian", ppsqm: "Médiane au m²", size: "Surface médiane", score: "Meilleure note" },
  n20: { costs: "Frais d'achat", foreign: "Acheteurs étrangers", free: "Achat libre", limits: "Avec restrictions", asOf: "Données du", regionsTitle: (inC) => `Prix médian par région ${inC}`, region: "Région", neighbours: "Pays voisins", siteMap: () => "" },
  gridTitle: (n, shown) => (n === shown ? `Les ${n} biens, la meilleure note en premier` : `Les ${shown} mieux notés sur ${n}`),
  gridMore: (shown, n) => `Vous voyez ici les ${shown} biens les mieux notés sur ${n}. Les autres figurent dans le tableau et dans les recherches plus précises ci-dessous.`,
  card: { isNew: "Nouveau", drop: (p) => `Baisse de ${p} %`, score: "Note", beds: (n) => `${n} ch.`, noPhoto: "Photos dans l'annonce", days: (n) => (n === 0 ? "Ajoutée aujourd’hui" : n === 1 ? "1 jour sur RealHunt" : `${n} jours sur RealHunt`) },
  tableTitle: (n, shown) => (n === shown ? `Comparatif des ${n} biens, du moins cher au plus cher` : `Comparatif des ${shown} biens les moins chers sur ${n}`),
  th: { home: "Bien", place: "Lieu", price: "Prix", size: "Surface", ppsqm: "Prix au m²", beds: "Chambres", score: "Note", added: "Ajouté le" },
  factsTitle: (F) => (F.f.kind === "ccyBand" ? `Ce que l'on trouve pour ${ccy(F.f.cap!, F.f.ccy!)}${F.f.country ? ` ${inC(F.f.country)}` : ""}` : F.f.cap && F.f.kind !== "combo" ? `Ce que l'on trouve pour ${money(F.f.cap)}${F.f.area ? ` ${areaIn(F.f)}` : F.f.region ? ` ${inR(place(F.f.region) || F.f.region)}` : F.f.country ? ` ${inC(F.f.country)}` : ""}` : `Les ${F.n} biens en chiffres`),
  fSize: (med, max, title) => `Surface : la moitié des biens fait ${med} m² ou plus. Le plus grand fait ${max} m² : ${title}.`,
  fBeds: (b, unknown) => `Chambres : ${b.map(([k, n]) => `${n} avec ${bedsN(k)}`).join(", ")}${unknown ? ` ; ${unknown} ${s(unknown, "annonce ne le précise pas", "annonces ne le précisent pas")}` : ""}.`,
  fType: (a, h) => `Type : ${[a ? `${a} ${s(a, "appartement", "appartements")}` : "", h ? `${h} ${s(h, "maison", "maisons")}` : ""].filter(Boolean).join(" et ")}.`,
  fSetting: (sea, v, t) => `Situation : ${[sea ? `${sea} en bord de mer` : "", v ? `${v} dans un village` : "", t ? `${t} en ville` : ""].filter(Boolean).join(", ")}.`,
  fWhere: (l) => `Où : ${list(l)}.`,
  fTowns: (l) => `Communes : ${list(l)}.`,
  fCountries: (l, more) => `Pays : ${list(l)}${more ? ` et ${more} ${s(more, "autre", "autres")}` : ""}.`,
  fStep: (from, to, n, title, nota, price) => `Entre ${from} et ${to} : ${biens(n)}. Le mieux noté d'entre eux (note ${nota}, ${price}) : ${title}.`,
  fNext: (next, add) => `Avec un budget de ${next}, ${add} ${s(add, "bien de plus entre", "biens de plus entrent")} dans la liste.`,
  fRegions: (low, high) => `Prix médian le plus bas : ${low.name}, ${low.median} pour ${biens(low.n)}. Le plus élevé : ${high.name}, ${high.median} pour ${high.n}.`,
  fScore: (min, max, title) => (min === max ? `Notes : tous ont ${max} sur 98. Le premier de la liste : ${title}.` : `Notes : de ${min} à ${max} sur 98. La meilleure note revient à : ${title}.`),
  fNew: (n30, title, date) => `Dernier ajout, le ${date} : ${title}.${n30 ? ` ${n30} de ces biens ${s(n30, "a été ajouté", "ont été ajoutés")} au cours des 30 derniers jours.` : ""}`,
  costsTitle: (c) => `Frais d'achat et règles pour les étrangers ${c}`,
  cForeign: (t) => `Les étrangers peuvent-ils acheter ? ${t}`,
  cCosts: (pct, br, med, lo, hi, tLo, tHi) => `Les taxes et les frais ajoutent environ ${pc(pct)} % au prix${dot(br)} Pour le bien au prix médian de cette page (${med}), cela représente ${range(lo, hi)}, soit ${range(tLo, tHi)} au total.`,
  cAllIn: (cap, maxAsk, fit, n) => `Pour que l'achat complet tienne dans ${cap}, le prix affiché ne devrait pas dépasser ${maxAsk} environ : ${fit === n ? `c'est le cas des ${n} biens de cette page` : fit ? `c'est le cas de ${fit} des ${n} biens de cette page` : `aucun des ${n} biens de cette page n'est dans ce cas`}.`,
  cTax: (t) => `Impôt foncier annuel : ${t}`,
  cExamples: (rows) => `Avec les mêmes pourcentages : ${rows.map(([p, lo, hi]) => `pour ${p}, comptez ${range(lo, hi)}`).join(" ; ")}.`,
  firstTitle: "Pouvez-vous acheter ici ? À lire avant tout",
  cNote: (asOf) => `Information générale, qui ne constitue pas un conseil fiscal ou juridique.${asOf ? ` Données vérifiées : ${asOf}.` : ""}`,
  cLinks: { calc: (c) => `Calculateur de frais d'achat ${c}`, detail: "Tous les frais et taxes", guide: "Les étapes de l'achat, une à une", nat: "Règles selon votre nationalité" },
  costTableTitle: "Frais d'achat dans les pays de cette page", costTh: { country: "Pays", homes: "Biens ici", from: "À partir de", costs: "Taxes et frais" },
  watchTitle: "Points à vérifier avant d'acheter",
  wNoSqm: (k, n) => `${k} des ${n} annonces ${s(k, "n'indique", "n'indiquent")} pas la surface habitable ; leur prix au m² ne peut donc pas être comparé.`,
  wHoa: (k, min, max) => `${k} ${s(k, "annonce indique", "annonces indiquent")} les charges mensuelles de copropriété : ${min === max ? min : `de ${min} à ${max}`}. Ajoutez-les à vos dépenses annuelles.`,
  wHoaUnknown: (k) => `${k} ${s(k, "bien se trouve", "biens se trouvent")} dans un immeuble ou une résidence avec des charges communes, mais l'annonce n'en donne pas le montant : demandez-le par écrit.`,
  wWhyCheap: (title, t) => (t ? `Un prix bas a une raison. ${title} : ${t}` : `Un prix bas a toujours une raison. Pour ce bien, elle figure sur sa fiche : ${title}.`),
  wFlood: (k, n) => `${k} sur ${n} ${s(k, "se trouve", "se trouvent")} là où notre vérification sommaire indique un risque d'inondation moyen ou élevé. La fiche de chaque bien renvoie vers la carte officielle.`,
  wNoise: (k, n) => `${k} sur ${n} ${s(k, "se trouve", "se trouvent")} près d'une autoroute, d'une voie ferrée ou d'un aéroport (bruit élevé selon notre vérification).`,
  wOld: (k, n) => `${k} sur ${n} ${s(k, "a été ajouté", "ont été ajoutés")} il y a plus de 60 jours. Demandez à l'agence ${s(k, "s'il est toujours en vente", "s'ils sont toujours en vente")} avant d'organiser un déplacement.`,
  wSold: (k) => `${k} ${s(k, "bien a été signalé par un visiteur comme peut-être vendu et est en cours de vérification", "biens ont été signalés par des visiteurs comme peut-être vendus et sont en cours de vérification")}.`,
  wApprox: (k, n) => `${k} sur ${n} ${s(k, "n'apparaît", "n'apparaissent")} sur la carte qu'à un emplacement approximatif : l'annonce donne la commune, pas la rue.`,
  wDims: (weak, wa, strong, sa) => `Critère le plus faible de ces biens en moyenne : ${weak} (${wa}/100). Le plus fort : ${strong} (${sa}/100).`,
  wRental: (t) => `Vous souhaitez louer le bien ? ${t}`,
  dim: (k) => ({ price: "prix", value: "prix au m²", space: "surface", condition: "état prêt à emménager", extras: "équipements", water: "proximité de la mer ou d'un lac", weather: "jours de beau temps", access: "proximité d'un aéroport", costs: "frais d'achat" } as Record<string, string>)[k] || k,
  faqTitle: "Questions d'acheteurs",
  qCheapest: (x) => `${fem(x) ? "Quelle" : "Quel"} est ${le(x)} ?`,
  aCheapest: (title, town, price, sqm, beds, nota) => `${title}, ${inR(town)}, au prix affiché de ${price}${sqm ? `, ${sqm} m²` : ""}${beds ? `, ${bedsN(beds)}` : ""}.${nota ? ` Sa note RealHunt est de ${nota}.` : ""}`,
  qCount: (w) => `Combien y a-t-il ${de(w)} ?`,
  aCount: (n, date, parent, n30) => `${n}, au ${date}${parent ? `, sur ${parent}` : ""}.${n30 ? ` ${n30} ${s(n30, "a été ajouté", "ont été ajoutés")} au cours des 30 derniers jours.` : ""}`,
  qSize: (w) => `Quelle est la surface des ${w} ?`,
  aSize: (med, beds, max, town) => `La surface médiane est de ${med} m²${beds ? ` et le cas le plus courant est ${bedsN(beds)}` : ""}. Le plus grand bien fait ${max} m² et se trouve ${inR(town)}.`,
  qAllIn: (cap, c) => `${cap} suffisent-ils pour acheter un bien ${c}, taxes et frais compris ?`,
  aAllIn: (cap, pct, lo, hi, maxAsk, fit) => `Pas avec un prix affiché de ${cap} : avec environ ${pc(pct)} % de taxes et de frais, l'achat coûte au total ${range(lo, hi)}. Pour rester sous ${cap} au total, le prix affiché ne devrait pas dépasser ${maxAsk} environ ; ${fit ? `c'est le cas de ${biens(fit)} de cette page` : "aucun bien de cette page n'est dans ce cas"}.`,
  qWhere: (w) => `Où se trouvent les ${w} ?`,
  aWhere: (l) => `Surtout ici : ${list(l)}.`,
  qPrice: (one) => `Combien coûte ${un(one)} ?`,
  aPrice: (min, med, pp, max, n) => `Les prix affichés vont de ${min} à ${max} pour ${n} biens. Le prix médian est de ${med}${pp ? ` (${pp})` : ""}.`,
  qForeign: (c) => `Un étranger peut-il acheter une maison ${c} ?`,
  qCosts: (c) => `Quels sont les frais d'achat ${c} ?`,
  aCosts: (pct, br, med, lo, hi) => `Environ ${pc(pct)} % en plus du prix${dot(br)} Pour le bien au prix médian de cette page (${med}), cela représente ${range(lo, hi)}. Information générale, qui ne constitue pas un conseil fiscal.`,
  qRegion: (c) => `Quelle est la région la moins chère ${c} ?`,
  aRegion: (low, high) => `Parmi les régions qui comptent au moins 3 biens sur RealHunt, le prix médian le plus bas est celui-ci : ${low.name}, ${low.median} pour ${low.n} biens. Le plus élevé : ${high.name}, ${high.median}.`,
  qVs: (p, wider) => `Les biens sont-ils moins chers ${inR(p)} qu'ailleurs ${inR(wider)} ?`,
  aVs: (p, wider, med, pMed, pct, n, pn) => `Le prix médian ${inR(p)} est de ${med} (${n} biens), soit ${pct < 0 ? `${-pct} % de moins que` : pct > 0 ? `${pct} % de plus que` : "autant que"} la médiane de ${pMed} des ${pn} biens que nous recensons ${inR(wider)}.`,
  qCountries: (w) => (/^\d/.test(w) ? `Dans quels pays se trouvent les ${w} ?` : `Dans quels pays trouve-t-on des ${w} ?`),
  aCountries: (l) => `Aujourd'hui sur RealHunt : ${list(l)}.`,
  moreTitle: (F) => (F.f.country ? `Autres recherches ${inC(F.f.country)}` : "Autres recherches"),
  more: { budget: "Par budget", region: "Par région", setting: "Par situation", type: "Par type", beds: "Par nombre de chambres", feature: "Par caractéristique", town: "Par commune", elsewhere: (l) => `${l} dans d'autres pays`, countries: "Par pays", all: "Toutes les recherches de maisons pas chères",
    area: "Par secteur", combo: "Par caractéristique et budget", ccy: "En livres et en dollars", near: "Près d'une ville", ranked: "Classements" },
  ccy,
  city,
  how: (F, v) => {
    const f = F.f;
    if (f.ranked) return f.key === "cheapest"
      ? `Ce sont les ${F.n} prix affichés les plus bas parmi ${v.parent}, du moins cher au plus cher. La liste change dès qu'un bien est ajouté, vendu ou baisse de prix.`
      : `Ce sont les ${F.n} prix au m² les plus bas parmi les ${v.total} biens dont l'annonce indique la surface habitable. Un prix au m² bas correspond le plus souvent à une grande maison dans un lieu peu recherché.`;
    if (f.kind === "ccyBand") return `${v.cap} correspondent à ${v.eur} au cours de référence de la Banque centrale européenne du ${v.date} (1${NB}€ = ${v.rate.replace(".", ",")} ${f.ccy === "GBP" ? "livre sterling" : "dollar américain"}). La vente se fait en euros ou dans la monnaie du pays : les montants en ${f.ccy === "GBP" ? "livres" : "dollars"} de cette page sont approximatifs et varient avec le taux de change.`;
    if (f.kind === "near") return `Sur cette liste : les biens situés à moins de ${NEAR_KM} km à vol d'oiseau du centre ${de(cityOf(f))}. Par la route, c'est plus long : vérifiez le temps de trajet avant de compter sur un aller-retour quotidien.`;
    if (f.kind === "area") { const a = areaBySlug(f.cc || "", f.area || ""); return a ? `Le secteur « ${areaL(f)} » regroupe ici les biens ${a.hoods ? "de ces quartiers" : "de ces régions"} : ${v.regions}${a.sea ? ". Seuls comptent ceux qui sont en bord de mer (à 5 km de la côte au plus, ou présentés comme biens de plage)" : ""}.` : ""; }
    return (f.kind === "feature" || f.kind === "gfeature") && f.key ? HOW[f.key] || "" : "";
  },
  l1rank: (w, min, max) => `Les ${w} sur RealHunt coûtent aujourd'hui entre ${min} et ${max}.`,
  gridTitleRank: (key, n) => (key === "cheapest" ? `Les ${n} biens, du moins cher au plus cher` : `Les ${n} biens, par prix au m² croissant`),
  x: {
    amen: (l) => `Équipements cités dans les annonces : ${l.map(([k, n]) => `${n} avec ${AMEN[k] || k}`).join(", ")}.`,
    airport: (med, title, km, _name, _l, code, codes) => `Aéroports : la distance médiane est de ${med} km. Le bien le plus proche d'un aéroport : ${title}, à ${km < 1 ? "moins de 1" : km} km de l'aéroport${code ? ` ${code}` : ""}.${codes.some((c) => c.name) ? ` Aéroports les plus proches, par code : ${list(codes.filter((c) => c.name))}.` : ""}`,
    sea: (n, med, title, m) => `Distance de la mer, mesurée pour ${n} de ces biens : ${num(m)} m pour le plus proche (${title}), ${num(med)} m en médiane.`,
    plot: (med, title, m2) => `Terrain : ${num(med)} m² en médiane. Le plus grand fait ${num(m2)} m² : ${title}.`,
    ppsqm: (title, low, high) => `Prix au m² : de ${low} (${title}) à ${high}.`,
    score: (n, pct, parent, n95) => `Sur ${parent}, ${n} ont une note de 90 ou plus, soit ${pct} %.${n95 ? ` ${n95} d'entre eux ${s(n95, "a", "ont")} 95 ou plus.` : ""}`,
    fee: (n, min, max, yMin, yMax) => `Charges de copropriété d'après ${n} ${s(n, "annonce", "annonces")} : ${min === max ? min : `de ${min} à ${max}`} par mois, soit ${yMin === yMax ? yMin : `de ${yMin} à ${yMax}`} par an.`,
    drop: (title, pct, amount, med) => `La plus forte baisse de prix : ${pct} % (${amount}) pour ${title}. La baisse médiane de cette page est de ${med} %.`,
    days: (med, title, v) => `Jours de beau temps : ${med} par an en médiane. Le maximum, ${v}, revient à : ${title}.`,
    elev: (n, med, title, v) => `Altitude, connue pour ${n} de ces biens : ${num(med)} m en médiane. Le plus haut, à ${num(v)} m : ${title}.`,
    islands: (l) => `Îles : ${list(l)}.`,
    dist: (c, med, title, km, far) => `Distance à vol d'oiseau jusqu'au centre ${de(c)} : de ${km < 1 ? "moins de 1" : km} km (${title}) à ${far} km, ${med} km en médiane.`,
    rank: (key, n, title, v, of) => (key === "cheapest" ? `La limite est aujourd'hui de ${v} : ${title} est le numéro ${n} sur ${of}.` : `La limite est aujourd'hui de ${v} : ${title} est le numéro ${n} des ${of} biens dont la surface est indiquée.`),
    vs: (other, med, n, oMed, on, pct) => `Par rapport à cette autre recherche, ${other} : la médiane est ici de ${med} (${n} biens), soit ${pct} % de moins que la médiane de ${oMed} des ${on} biens que nous y recensons.`,
  },
  noteSource: "Source", noteAsOf: (asOf) => `Vérifié : ${asOf}. Information générale, qui ne constitue pas un conseil juridique ou fiscal.`,
  season: { title: "Selon la saison", winter: "Pour l'hiver", summer: "Pour l'été" },
  allIn: (c, n) => `Les ${n} biens ${c}`,
  sources: (l) => `Ces annonces proviennent de ${l.map(([d, n]) => `${d} (${n})`).join(", ")}.`,
  notAgent: "RealHunt n'est pas une agence immobilière et ne vend pas ces biens : chacun renvoie vers son annonce d'origine et a été vérifié par une personne avant sa publication.",
  alert: (c) => `Recevoir par e-mail les nouveaux biens ${c}`,
  filter: "Filtrer et trier ces biens",
  method: "Comment la note est calculée",
  moved: "Cette page a changé d'adresse.",
};

/** French typography: a non-breaking space before : ; ? ! % and inside « ». Applied to everything the pack answers. */
export const typo = (x: string) => x.replace(/ ([:;?!%»])/g, `${NB}$1`).replace(/« /g, `«${NB}`);
function spaced<T>(o: T): T {
  if (typeof o === "string") return typo(o) as unknown as T;
  if (typeof o === "function") return ((...a: unknown[]) => spaced((o as unknown as (...a: unknown[]) => unknown)(...a))) as unknown as T;
  if (o && typeof o === "object" && !Array.isArray(o)) return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, spaced(v)])) as T;
  return o;
}
export const fr: Pack = spaced(words);
