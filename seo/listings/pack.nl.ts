// Dutch wording of the listing pages (15-nov-2026), written in Dutch, not translated string by string:
// seo/listings/pack.ts says what each entry is for. The reader is addressed with "u", amounts are written
// "€ 50.000" (euro sign, space, dots for thousands), dates "13 november 2026", and the generic word is "woning",
// so a sentence agrees whatever the page lists (de woning, het huis, het appartement).
import type { Pack, Facts, Form, Named } from "./pack";
import { areaBySlug, cityBySlug, NEAR_KM } from "./places";
import { titleIn, placeIn, grouped, NB, type PlaceWords } from "./packkit";

const num = (n: number) => grouped(n, ".");
const money = (n: number) => `€${NB}${num(n)}`;
const MONTHS = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
const SHORT = ["jan.", "feb.", "mrt.", "apr.", "mei", "jun.", "jul.", "aug.", "sep.", "okt.", "nov.", "dec."];

// [name, "in ..."]
const COUNTRY: Record<string, [string, string]> = {
  Spain: ["Spanje", "in Spanje"], Italy: ["Italië", "in Italië"], "United States": ["Verenigde Staten", "in de Verenigde Staten"], Denmark: ["Denemarken", "in Denemarken"], France: ["Frankrijk", "in Frankrijk"],
  Sweden: ["Zweden", "in Zweden"], Japan: ["Japan", "in Japan"], Poland: ["Polen", "in Polen"], Germany: ["Duitsland", "in Duitsland"], Netherlands: ["Nederland", "in Nederland"],
  Greece: ["Griekenland", "in Griekenland"], Portugal: ["Portugal", "in Portugal"], Switzerland: ["Zwitserland", "in Zwitserland"], Mexico: ["Mexico", "in Mexico"], Canada: ["Canada", "in Canada"],
  Bulgaria: ["Bulgarije", "in Bulgarije"], "Dominican Republic": ["Dominicaanse Republiek", "in de Dominicaanse Republiek"], Cyprus: ["Cyprus", "op Cyprus"], "United Kingdom": ["Verenigd Koninkrijk", "in het Verenigd Koninkrijk"],
  Scandinavia: ["Scandinavië", "in Scandinavië"], Norway: ["Noorwegen", "in Noorwegen"],
};
const country = (c: string) => COUNTRY[c]?.[0] || c;
const inC = (c: string) => COUNTRY[c]?.[1] || `in ${c}`;
const IN_BY_NAME: Record<string, string> = Object.fromEntries(Object.values(COUNTRY));

export const PLACES: PlaceWords = {
  map: {
    Abruzzo: "Abruzzen", Apulia: "Apulië", Calabria: "Calabrië", "Lake Como": "Comomeer", Lazio: "Lazio", Lombardy: "Lombardije", Marche: "Marche", Piedmont: "Piëmont", Sardinia: "Sardinië", Sicily: "Sicilië", Tuscany: "Toscane", Umbria: "Umbrië",
    "Northern Ireland": "Noord-Ierland", "County Down": "graafschap Down", "County Fermanagh": "graafschap Fermanagh", "County Leitrim": "graafschap Leitrim", "County Durham": "County Durham", "Central Jutland": "Midden-Jutland", "East Jutland": "Oost-Jutland", "North Jutland": "Noord-Jutland", "West Jutland": "West-Jutland", "South Jutland": "Zuid-Jutland", Funen: "Funen", "West Zealand": "West-Seeland",
    "Black Sea": "Zwarte Zee", "Allegheny Mountains": "Allegheny Mountains", "Lake Superior region": "omgeving van het Bovenmeer", "North Carolina": "North Carolina", "South Carolina": "South Carolina", "West Virginia": "West Virginia",
    "Central Sweden": "Midden-Zweden", "Northern Sweden": "Noord-Zweden", Crete: "Kreta", "North Evia": "Noord-Evia", Evia: "Evia", Rhodes: "Rhodos", Corfu: "Corfu", Sporades: "Sporaden", Halkidiki: "Chalkidiki", Messinia: "Messenië", Peloponnese: "Peloponnesos", Pelion: "Pilion",
    "Greater Poland": "Groot-Polen", "Kuyavia-Pomerania": "Koejavië-Pommeren", "Lower Silesia": "Neder-Silezië", Lubusz: "Lubusz", Masovia: "Mazovië", Podlaskie: "Podlachië", Pomerania: "Pommeren", Silesia: "Silezië", Subcarpathia: "Subkarpaten",
    "Warmia-Masuria": "Ermland-Mazurië", "West Pomerania": "West-Pommeren", "Świętokrzyskie": "Świętokrzyskie", Newfoundland: "Newfoundland", "New Brunswick": "New Brunswick", "Nova Scotia": "Nova Scotia", Valais: "Wallis", Tenerife: "Tenerife", Asturias: "Asturië", Cantabria: "Cantabrië",
    Saxony: "Saksen", Thuringia: "Thüringen", "Saxony-Anhalt": "Saksen-Anhalt", "Prince Edward Island": "Prince Edward Island", "Big Wolf Lake": "Big Wolf Lake", "Canadohta Lake": "Canadohta Lake", "French Island": "French Island", "East Palestine": "East Palestine",
  },
  near: (n, card) => (card ? `bij ${n}` : `omgeving van ${n}`),
  central: (n) => `centrum van ${n}`,
  area: (n) => `regio ${n}`,
};
const place = (n: string, _cc?: string, where?: "card") => placeIn(PLACES, n, where);
/** "in Toscane", "op Sicilië", "aan het Comomeer", "in de regio Como": a Dutch place name after its preposition. */
const IN_R: Record<string, string> = { Abruzzen: "in de Abruzzen", Comomeer: "aan het Comomeer", Peloponnesos: "op de Peloponnesos", Pilion: "op de Pilion", Sporaden: "op de Sporaden", "omgeving van het Bovenmeer": "in de omgeving van het Bovenmeer" };
const ISLANDS = new Set(["Sardinië", "Sicilië", "Kreta", "Rhodos", "Lesbos", "Samos", "Funen", "Falster", "Lolland", "Mors", "Tenerife", "Gran Canaria", "Fuerteventura", "La Palma", "Noord-Evia", "Evia", "Newfoundland", "Corfu", "Mallorca", "Menorca", "Ibiza", "Lanzarote", "Chalkidiki", "Skopelos (Sporaden)", "Strynø", "Prince Edward Island", "French Island"]);
const inR = (n: string) => IN_BY_NAME[n] || IN_R[n] || (ISLANDS.has(n) ? `op ${n}` : /^omgeving /.test(n) ? `in de ${n}` : /^centrum /.test(n) ? `in het ${n}` : /^regio /.test(n) ? `in de ${n}` : /^bij /.test(n) ? n : `in ${n}`);

// [label, "aan de ..."]
const AREA: Record<string, [string, string]> = {
  "costa-del-sol": ["Costa del Sol", "aan de Costa del Sol"], "costa-blanca": ["Costa Blanca", "aan de Costa Blanca"], "costa-calida": ["Costa Cálida", "aan de Costa Cálida"], "costa-de-almeria": ["Costa de Almería", "aan de Costa de Almería"],
  "canary-islands": ["Canarische Eilanden", "op de Canarische Eilanden"], "balearic-islands": ["Balearen", "op de Balearen"], "green-spain": ["Groen Spanje", "in Groen Spanje"], algarve: ["Algarve", "in de Algarve"],
  "southern-italy": ["Zuid-Italië", "in Zuid-Italië"], "abruzzo-and-marche": ["Abruzzen en Marche", "in de Abruzzen en Marche"], lunigiana: ["Lunigiana", "in de Lunigiana"], "lake-maggiore": ["Lago Maggiore", "aan het Lago Maggiore"], "lake-garda": ["Gardameer", "aan het Gardameer"],
  limousin: ["Limousin", "in de Limousin"], hokkaido: ["Hokkaido", "op Hokkaido"], tohoku: ["Tohoku", "in Tohoku"], kanto: ["Kanto", "in Kanto"], chubu: ["Chubu", "in Chubu"], kansai: ["Kansai", "in Kansai"], chugoku: ["Chugoku", "in Chugoku"],
  shikoku: ["Shikoku", "op Shikoku"], kyushu: ["Kyushu", "op Kyushu"], norrland: ["Norrland", "in Norrland"], jutland: ["Jutland", "in Jutland"], "lolland-falster": ["Lolland en Falster", "op Lolland en Falster"],
  "amsterdam-zuidoost": ["Amsterdam-Zuidoost", "in Amsterdam-Zuidoost"], "eastern-germany": ["Saksen, Saksen-Anhalt en Thüringen", "in Saksen, Saksen-Anhalt en Thüringen"], masuria: ["Mazurië", "in Mazurië"],
  peloponnese: ["Peloponnesos", "op de Peloponnesos"], "black-sea-coast": ["Zwarte Zeekust", "aan de Zwarte Zeekust"], "atlantic-canada": ["Atlantisch Canada", "in de Atlantische provincies van Canada"],
};
const areaL = (f: { area?: string }) => AREA[f.area || ""]?.[0] || String(f.area || "");
const areaIn = (f: { area?: string }) => AREA[f.area || ""]?.[1] || `in ${f.area}`;
for (const [l, i] of Object.values(AREA)) IN_R[l] = i;
const CITY: Record<string, string> = { seville: "Sevilla", milan: "Milaan", rome: "Rome", florence: "Florence", naples: "Napels", copenhagen: "Kopenhagen", gothenburg: "Göteborg", lisbon: "Lissabon", athens: "Athene", warsaw: "Warschau", geneva: "Genève", zurich: "Zürich", tokyo: "Tokio", paris: "Parijs", berlin: "Berlijn" };
const city = (slug: string) => CITY[slug] || cityBySlug(slug)?.[1] || slug;

const s = (n: number, one: string, many: string) => (n === 1 ? one : many);
const list = (l: Named[]) => l.map((x) => `${x.name} (${x.n})`).join(", ");
const upper = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
const pc = (x: string) => x.replace(/(\d)\.(\d)/g, "$1,$2").replace(/\s*[-–]\s*/g, " tot ");
const dot = (x: string) => (x ? (/[.!?]$/.test(x.trim()) ? `: ${x.trim()}` : `: ${x.trim()}.`) : ".");
const range = (lo: string, hi: string) => (lo === hi ? `circa ${lo}` : `${lo} tot ${hi}`);
const bedsW = (n: number) => (n === 4 ? "4 of meer slaapkamers" : `${n} ${s(n, "slaapkamer", "slaapkamers")}`);
/** " in Torrevieja" after a title, unless the title already names the place. */
const at = (title: string, town: string) => (town && title.includes(town.replace(/^(bij|omgeving van|centrum van|regio) /, "")) ? "" : ` ${inR(town)}`);
const woningen = (n: number) => `${n} ${s(n, "woning", "woningen")}`;

// [plural, singular, "cheap" plural, "cheapest" singular (after the article)]
const NOUN = {
  house: ["huizen", "huis", "goedkope huizen", "goedkoopste huis"],
  apartment: ["appartementen", "appartement", "goedkope appartementen", "goedkoopste appartement"],
  mixed: ["woningen", "woning", "goedkope woningen", "goedkoopste woning"],
} as const;
const FORM = { many: 0, one: 1, cheap: 2, cheapest: 3 } as const;
/** de or het: read from the first noun of the phrase (de woning, de trullo; het huis, het appartement, het gebouw). */
const art = (x: string) => (/^(\S+ ){0,3}\S*(woning|trullo)\b/i.test(x) ? "de" : "het");
const fixed = (forms: [string, string, string, string]) => (_b: string, f: Form) => forms[FORM[f]];
/** An adjective in front of the noun: "instapklare huizen", "instapklaar huis" (after "een"), "instapklare woning",
 * "goedkoopste instapklare huis" (after the article). */
const adj = (stem: string, e = `${stem}e`) => (b: string, f: Form) => (f === "one" ? `${art(b) === "het" ? stem : e} ${b}` : f === "many" ? `${e} ${b}` : b.replace(/^(goedkoopste|goedkope) /, `$1 ${e} `));
const KEYED: Record<string, (b: string, form: Form) => string> = {
  "by-the-sea": (b) => `${b} aan zee`,
  "village-houses": fixed(["dorpswoningen", "dorpswoning", "goedkope dorpswoningen", "goedkoopste dorpswoning"]),
  "in-town": (b) => `${b} in de stad`,
  "near-a-lake": (b) => `${b} aan een meer`,
  "with-garden": (b) => `${b} met tuin`,
  "with-pool": (b) => `${b} met zwembad`,
  "with-sauna": (b) => `${b} met sauna`,
  "stone-houses": fixed(["stenen huizen", "stenen huis", "goedkope stenen huizen", "goedkoopste stenen huis"]),
  "cabins-and-cottages": fixed(["vakantiehuisjes en blokhutten", "vakantiehuisje", "goedkope vakantiehuisjes en blokhutten", "goedkoopste vakantiehuisje"]),
  "with-a-terrace": (b) => `${b} met terras of balkon`,
  turnkey: adj("instapklaar", "instapklare"),
  "to-renovate": (b) => `${b} om op te knappen`,
  "with-sea-view": (b) => `${b} met zeezicht`,
  "near-the-beach": (b) => `${b} op hooguit 500 m van de zee`,
  "with-land": (b) => `${b} met 1.000 m² grond of meer`,
  "with-fireplace": (b) => `${b} met open haard`,
  "with-garage": (b) => `${b} met garage`,
  "on-an-island": (b) => `${b} op een eiland`,
  "in-the-mountains": (b) => `${b} in de bergen`,
  "with-olive-trees-or-vines": (b) => `${b} met olijfbomen, wijnranken of fruitbomen`,
  "near-an-airport": (b) => `${b} op hooguit 30 km van een luchthaven`,
  "under-500-per-sqm": (b) => `${b} onder ${money(500)}/m²`,
  "over-100-sqm-under-50000": (b) => `${b} van meer dan 100 m² onder ${money(50000)}`,
  "score-90-plus": (b) => `${b} met een score van 90 of hoger`,
  "editors-picks": (b) => `${b} uit de keuze van de redactie`,
  "new-this-month": adj("pas toegevoegd", "pas toegevoegde"),
  "price-drops": (b) => `${b} met een prijsverlaging`,
  "single-storey": adj("gelijkvloers", "gelijkvloerse"),
  "with-period-features": (b) => `${b} met historische details`,
  "good-weather": (b) => `${b} met 150 of meer dagen mooi weer per jaar`,
  "quiet-location": (b) => `${b} op afstand van snelweg en spoor`,
  "low-community-fee": (b) => `${b} met lage servicekosten`,
  "cave-houses": fixed(["grotwoningen", "grotwoning", "goedkope grotwoningen", "goedkoopste grotwoning"]),
  trulli: fixed(["trulli", "trullo", "goedkope trulli", "goedkoopste trullo"]),
  "unusual-buildings": fixed(["kastelen, molens, kerken en andere bijzondere gebouwen", "bijzonder gebouw", "goedkope kastelen, molens, kerken en andere bijzondere gebouwen", "goedkoopste bijzondere gebouw"]),
  "with-business-premises": (b) => `${b} met bedrijfsruimte`,
  "with-fibre-internet": (b) => `${b} met glasvezel`,
  "with-tourist-licence": (b) => `${b} met een vergunning voor vakantieverhuur`,
};
const ccy = (n: number, c: string) => `${num(n)} ${c === "GBP" ? "pond" : c === "USD" ? "dollar" : "euro"}`;
const cityOf = (f: { city?: string }) => city(f.city || "");
const AMEN: Record<string, string> = { garden: "tuin", terrace: "terras", garage: "garage", pool: "zwembad", fireplace: "open haard", sauna: "sauna" };
const LABEL: Record<string, string> = { "by-the-sea": "Aan zee", "village-houses": "Dorpswoningen", "in-town": "In de stad", "near-a-lake": "Aan een meer", "with-garden": "Met tuin", "with-pool": "Met zwembad", "with-sauna": "Met sauna", "stone-houses": "Stenen huizen", "cabins-and-cottages": "Vakantiehuisjes en blokhutten", "with-a-terrace": "Met terras", apartments: "Appartementen", houses: "Huizen",
  turnkey: "Instapklaar", "to-renovate": "Om op te knappen", "with-sea-view": "Zeezicht", "near-the-beach": "500 m van de zee", "with-land": "Met grond", "with-fireplace": "Met open haard", "with-garage": "Met garage",
  "on-an-island": "Op een eiland", "in-the-mountains": "In de bergen", "with-olive-trees-or-vines": "Olijfbomen of wijnranken", "near-an-airport": "Dicht bij een luchthaven", "under-500-per-sqm": `Onder ${money(500)}/m²`, "over-100-sqm-under-50000": `Meer dan 100 m² onder ${money(50000)}`,
  "score-90-plus": "Score 90 of hoger", "editors-picks": "Keuze van de redactie", "new-this-month": "Nieuw deze maand", "price-drops": "In prijs verlaagd", "single-storey": "Gelijkvloers", "with-period-features": "Historische details", "good-weather": "Mooi weer",
  "quiet-location": "Rustige ligging", "low-community-fee": "Lage servicekosten", "cave-houses": "Grotwoningen", trulli: "Trulli", "unusual-buildings": "Bijzondere gebouwen", "with-business-premises": "Met bedrijfsruimte", "with-fibre-internet": "Glasvezel", "with-tourist-licence": "Vakantieverhuur toegestaan",
  cheapest: "De goedkoopste", "most-space-for-the-money": "De meeste ruimte voor uw geld" };

function what(F: Facts, form: Form = "many"): string {
  const f = F.f;
  const b = NOUN[f.kind === "ptype" ? (f.key === "apartments" ? "apartment" : "house") : F.noun][FORM[form]];
  const where = f.country ? ` ${inC(f.country)}` : "";
  const under = f.cap ? ` onder ${f.kind === "ccyBand" ? ccy(f.cap, f.ccy!) : money(f.cap)}` : "";
  const sale = " te koop";
  if (f.ranked) {
    const pl = NOUN[F.noun][0], sg = NOUN[F.noun][1];
    const single = form === "one" || form === "cheapest";
    if (f.key === "cheapest") return single ? `${NOUN[F.noun][3]}${sale}${where}` : `${F.n} goedkoopste ${pl}${sale}${where}`;
    return single ? `${sg} met de meeste ruimte voor het geld${sale}${where}` : `${F.n} ${pl} met de meeste ruimte voor het geld${sale}${where}`;
  }
  const keyed = (k: string) => KEYED[k](b, form);
  switch (f.kind) {
    case "combo": return f.key === "apartments" || f.key === "houses" ? `${NOUN[f.key === "apartments" ? "apartment" : "house"][FORM[form]]}${sale}${where}${under}` : `${keyed(f.key!)}${sale}${where}${under}`;
    case "area": return `${b}${sale} ${areaIn(f)}`;
    case "near": return `${b}${sale} binnen ${NEAR_KM} km van ${cityOf(f)}`;
    case "region": return `${b}${sale} ${inR(place(f.region!) || f.region!)} (${country(f.country!)})`;
    case "town": return `${b}${sale} in ${f.town} (${place(f.region!) || f.region})`;
    case "regionBand": return f.area ? `${b}${sale} ${areaIn(f)}${under}` : `${b}${sale} ${inR(place(f.region!) || f.region!)} (${country(f.country!)})${under}`;
    case "setting": case "feature": case "gfeature": return `${keyed(f.key!)}${sale}${where}`;
    case "beds": return `${b} met ${bedsW(f.beds!)}${sale}${where}`;
    default: return `${b}${sale}${where}${under}`;
  }
}

const HOW: Record<string, string> = {
  turnkey: "Op deze lijst staan woningen waarvan de advertentie uitdrukkelijk zegt dat ze instapklaar of volledig gerenoveerd zijn. Wij hebben ze niet bezichtigd: vraag naar de datum van de werkzaamheden en naar de facturen.",
  "to-renovate": "Op deze lijst staan woningen waarvan de advertentie zegt dat ze gerenoveerd moeten worden of als project worden verkocht. Wat de werkzaamheden kosten, staat bijna nooit in de advertentie: vraag een schriftelijke offerte aan bij een aannemer ter plaatse voordat u een bod doet.",
  "with-sea-view": "Op deze lijst staan woningen waarvan de advertentietekst zeezicht noemt. Soms is dat niet meer dan een streepje zee tussen de daken: bekijk de foto's en de kaart.",
  "near-the-beach": "Op deze lijst staan woningen waarvan de gemeten afstand tot de kust hooguit 500 m in vogelvlucht is. Te voet kan het verder zijn.",
  "with-land": "Op deze lijst staan woningen waarvan de advertentie een perceel van 1.000 m² of meer noemt, in m², hectare of acres. Controleer dat getal vóór de aankoop in het kadaster.",
  "with-fireplace": "Op deze lijst staan woningen waarvan de advertentie een open haard toont of noemt. Vraag of de schoorsteen is geveegd en gekeurd.",
  "with-garage": "Op deze lijst staan woningen waarvan de advertentie een garage noemt.",
  "on-an-island": "Op deze lijst staan woningen op eilanden waarnaar mensen op naam zoeken, van Tenerife en Sicilië tot Kreta en Funen. Eilanden zo groot als een land tellen niet mee.",
  "in-the-mountains": "Op deze lijst staan woningen die volgens de advertentie in de bergen liggen, uitzicht op de bergen hebben of dicht bij een skigebied liggen.",
  "with-olive-trees-or-vines": "Op deze lijst staan woningen waarvan de advertentie olijfbomen, wijnranken, een boomgaard of fruitbomen noemt.",
  "near-an-airport": "Op deze lijst staan woningen waarvan de dichtstbijzijnde luchthaven hooguit 30 km in vogelvlucht ligt. Over de weg is het verder.",
  "under-500-per-sqm": `Op deze lijst staan woningen waarvan de vraagprijs, gedeeld door het woonoppervlak uit de advertentie, onder ${money(500)} per m² uitkomt. Een advertentie zonder oppervlakte kan er niet op staan.`,
  "over-100-sqm-under-50000": `Op deze lijst staan woningen van 100 m² of meer met een vraagprijs van hooguit ${money(50000)}.`,
  "score-90-plus": "Op deze lijst staan woningen met een RealHunt-score van 90 of hoger, op een maximum van 98. De score vergelijkt prijs, oppervlakte, staat, ligging en aankoopkosten met alle andere woningen op de website.",
  "editors-picks": "Op deze lijst staan woningen die iemand van het team van RealHunt eruit heeft gelicht na het controleren van de advertentie. Niemand betaalt om hier te staan.",
  "new-this-month": "Op deze lijst staan woningen die in de afgelopen 30 dagen aan RealHunt zijn toegevoegd.",
  "price-drops": "Op deze lijst staan woningen waarvan de vraagprijs is gedaald sinds wij ze hebben gepubliceerd. De verlaging is het verschil tussen de eerste prijs die wij zagen en de prijs van vandaag.",
  "single-storey": "Op deze lijst staan woningen die volgens de advertentie gelijkvloers zijn, zonder trappen tussen de kamers.",
  "with-period-features": "Op deze lijst staan woningen waarvan de advertentie de ouderdom of historische details noemt: de eeuw, originele balken of vloeren, gewelfde plafonds, vakwerk of een monumentenstatus. Het bouwjaar kennen wij niet van alle woningen.",
  "good-weather": "Op deze lijst staan woningen op plaatsen met 150 of meer dagen mooi weer per jaar volgens de klimaatgemiddelden: een maximumtemperatuur van 18 tot 33 °C, geen regen en weinig wind.",
  "quiet-location": "Op deze lijst staan woningen waarbij OpenStreetMap geen snelweg of spoorlijn in de buurt toont en waarbij onze controle van wegen, spoor en luchthavens weinig geluid aangeeft. Het is een controle op de kaart, geen geluidsmeting.",
  "low-community-fee": "Op deze lijst staan woningen waarvan de advertentie maandelijkse servicekosten van hooguit 250 in de eigen valuta noemt (euro, dollar of pond). De meeste advertenties noemen de servicekosten niet en kunnen er dus niet op staan.",
  "cave-houses": "Op deze lijst staan woningen die de advertentie als grotwoning omschrijft.",
  trulli: "Op deze lijst staan woningen die de advertentie als trullo omschrijft.",
  "unusual-buildings": "Op deze lijst staan woningen waarvan de titel een kasteel, een landhuis, een molen, een torenhuis of een voormalige kerk, school of een voormalig station noemt.",
  "with-business-premises": "Op deze lijst staan woningen waarvan de titel een winkel, een bar, een restaurant, een logiesbedrijf of andere bedrijfsruimte noemt die wordt meeverkocht. Of het bedrijf weer open mag, hangt af van de vergunningen van de gemeente: vraag het na op het gemeentehuis.",
  "with-fibre-internet": "Op deze lijst staan woningen waarvan de advertentie glasvezel of snel internet noemt. Wij testen de aansluitingen niet: vraag de verkoper om een recente snelheidstest.",
  "with-tourist-licence": "Op deze lijst staan woningen waarvan de advertentie een vergunning voor vakantieverhuur noemt. De vergunning kan bij verkoop vervallen: vraag het na op het gemeentehuis voordat u erop rekent.",
};

export const nl: Pack = {
  lang: "nl",
  money,
  perSqm: (n) => `${money(n)}/m²`,
  date: (d) => `${Number(d.slice(8, 10))} ${MONTHS[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`,
  dateShort: (d) => `${Number(d.slice(8, 10))} ${SHORT[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`,
  country,
  inC,
  place,
  homeTitle: (h) => titleIn("nl", h),
  homeWhy: () => "",
  what,
  h1: (F) => (F.f.ranked ? `De ${what(F)}${F.f.country ? "" : " op RealHunt"}`
    : upper(what(F, (F.f.cap && F.f.cap <= 100000) || (["gfeature", "feature", "area", "near"].includes(F.f.kind) && F.median <= 100000) ? "cheap" : "many"))),
  title: (h1, n, min) => (/^De \d/.test(h1) ? `${h1} (vanaf ${min})` : `${h1} (${n}, vanaf ${min})`),
  desc: (F, w) => `${F.f.ranked ? `De ${w}` : `${F.n} ${w}`}, van ${money(F.min)} tot ${money(F.max)}. Mediaanprijs: ${money(F.median)}. Foto's, oppervlaktes, scores, aankoopkosten en waar u op moet letten.`,
  crumbRoot: "RealHunt", crumbCheap: "Goedkope huizen",
  crumbCountry: (c) => `Huizen ${IN_BY_NAME[c] || `in ${c}`}`,
  label: (f) => (f.kind === "combo" ? `${LABEL[f.key!] || f.key}, onder ${money(f.cap!)}` : f.kind === "ccyBand" ? `Onder ${ccy(f.cap!, f.ccy!)}` : f.kind === "area" ? areaL(f) : f.kind === "near" ? `Bij ${cityOf(f)}`
    : f.cap ? `Onder ${money(f.cap)}` : f.kind === "region" ? place(String(f.region)) || String(f.region) : f.kind === "town" ? String(f.town) : f.kind === "beds" ? (f.beds === 4 ? "4 of meer slaapkamers" : bedsW(f.beds!)) : f.kind === "country" ? country(String(f.country)) : LABEL[f.key!] || String(f.key)),
  updated: (d, newest) => `Bijgewerkt op ${d}.${newest ? ` Laatste woning toegevoegd op ${newest}.` : ""}`,
  l1: (n, w, min, max) => (min === max ? `RealHunt heeft vandaag ${n} ${w}, allemaal voor dezelfde prijs: ${min}.` : `RealHunt heeft vandaag ${n} ${w}, met prijzen van ${min} tot ${max}.`),
  l2: (title, town, price, sqm, beds) => `De goedkoopste kost ${price}: ${title}${at(title, town)}${sqm || beds ? ` (${[sqm ? `${sqm} m²` : "", beds ? bedsW(beds) : ""].filter(Boolean).join(", ")})` : ""}.`,
  l3: (med, pp, pMed, pPp, parent) => `De mediaanprijs is ${med}${pp ? ` (${pp})` : ""}, tegenover ${pMed}${pPp ? ` (${pPp})` : ""} voor ${parent}.`,
  l3all: (med, pp, max, parent) => `De mediaanprijs is ${med}${pp ? ` (${pp})` : ""}. Op deze pagina staan ze allemaal: van ${parent} kost er geen meer dan ${max}.`,
  parent: (kind, n, name, countries) => (kind === "site" ? `de ${n} woningen die RealHunt in ${countries} landen heeft` : kind === "country" ? `de ${n} woningen die wij ${name} hebben` : `de ${n} woningen die wij ${inR(name)} hebben`),
  kpi: { homes: "Woningen", from: "Vanaf", median: "Mediaanprijs", ppsqm: "Mediaan per m²", size: "Mediane oppervlakte", score: "Hoogste score" },
  gridTitle: (n, shown) => (n === shown ? `Alle ${n} woningen, hoogste score eerst` : `De ${shown} beste van ${n}, op score`),
  gridMore: (shown, n) => `U ziet de ${shown} woningen met de hoogste score van de ${n}. De overige staan in de tabel en in de nauwkeurigere zoekopdrachten verderop.`,
  card: { isNew: "Nieuw", drop: (p) => `${p}% verlaagd`, score: "Score", beds: (n) => `${n} slpk.`, noPhoto: "Foto's in de advertentie" },
  tableTitle: (n, shown) => (n === shown ? `Alle ${n} woningen vergeleken, goedkoopste eerst` : `De ${shown} goedkoopste van ${n} vergeleken`),
  th: { home: "Woning", place: "Plaats", price: "Prijs", size: "Oppervlakte", ppsqm: "Per m²", beds: "Slpk.", score: "Score", added: "Toegevoegd" },
  factsTitle: (F) => (F.f.kind === "ccyBand" ? `Wat u voor ${ccy(F.f.cap!, F.f.ccy!)}${F.f.country ? ` ${inC(F.f.country)}` : ""} krijgt` : F.f.cap && F.f.kind !== "combo" ? `Wat u voor ${money(F.f.cap)}${F.f.area ? ` ${areaIn(F.f)}` : F.f.region ? ` ${inR(place(F.f.region) || F.f.region)}` : F.f.country ? ` ${inC(F.f.country)}` : ""} krijgt` : `De ${F.n} woningen in cijfers`),
  fSize: (med, max, title) => `Oppervlakte: de helft heeft ${med} m² of meer. De grootste heeft ${max} m²: ${title}.`,
  fBeds: (b, unknown) => `Slaapkamers: ${b.map(([k, n], i) => `${n} met ${k === 4 ? "4 of meer" : k}${i === 0 ? ` ${k === 1 ? "slaapkamer" : "slaapkamers"}` : ""}`).join(", ")}${unknown ? `; bij ${unknown} ${s(unknown, "advertentie", "advertenties")} ontbreekt het aantal` : ""}.`,
  fType: (a, h) => `Type: ${[a ? `${a} ${s(a, "appartement", "appartementen")}` : "", h ? `${h} ${s(h, "huis", "huizen")}` : ""].filter(Boolean).join(" en ")}.`,
  fSetting: (sea, v, t) => `Ligging: ${[sea ? `${sea} aan zee` : "", v ? `${v} in dorpen` : "", t ? `${t} in de stad` : ""].filter(Boolean).join(", ")}.`,
  fWhere: (l) => `Waar: ${list(l)}.`,
  fTowns: (l) => `Plaatsen: ${list(l)}.`,
  fCountries: (l, more) => `Landen: ${list(l)}${more ? ` en nog ${more}` : ""}.`,
  fStep: (from, to, n, title, nota, price) => `Tussen ${from} en ${to}: ${woningen(n)}. Die met de hoogste score daarvan (score ${nota}, ${price}): ${title}.`,
  fNext: (next, add) => `Met een budget van ${next} ${s(add, "komt", "komen")} er nog ${woningen(add)} bij.`,
  fRegions: (low, high) => `Laagste mediaanprijs: ${low.name}, ${low.median} bij ${woningen(low.n)}. Hoogste: ${high.name}, ${high.median} bij ${high.n}.`,
  fScore: (min, max, title) => (min === max ? `Scores: allemaal ${max} van de 98. De eerste van de lijst: ${title}.` : `Scores: van ${min} tot ${max}, op een maximum van 98. De hoogste score heeft: ${title}.`),
  fNew: (n30, title, date) => `Laatst toegevoegd, op ${date}: ${title}.${n30 ? ` ${n30} van deze woningen ${s(n30, "is", "zijn")} in de afgelopen 30 dagen toegevoegd.` : ""}`,
  costsTitle: (c) => `Aankoopkosten en regels voor buitenlanders ${c}`,
  cForeign: (t) => `Mogen buitenlanders kopen? ${t}`,
  cCosts: (pct, br, med, lo, hi, tLo, tHi) => `Belastingen en kosten komen met circa ${pc(pct)}% boven op de koopprijs${dot(br)} Voor de mediane woning van deze pagina (${med}) is dat ${range(lo, hi)}, in totaal dus ${range(tLo, tHi)}.`,
  cAllIn: (cap, maxAsk, fit, n) => `Om met de hele aankoop binnen ${cap} te blijven, mag de vraagprijs hooguit circa ${maxAsk} zijn: ${fit === n ? `dat geldt voor alle ${n} woningen op deze pagina` : fit ? `dat geldt voor ${fit} van de ${n} woningen op deze pagina` : `dat geldt voor geen van de ${n} woningen op deze pagina`}.`,
  cTax: (t) => `Jaarlijkse belasting op de woning: ${t}`,
  cExamples: (rows) => `Met dezelfde percentages: ${rows.map(([p, lo, hi]) => `bij ${p} is het ${range(lo, hi)}`).join("; ")}.`,
  firstTitle: "Mag u hier kopen? Lees dit eerst",
  cNote: (asOf) => `Algemene informatie, geen fiscaal of juridisch advies.${asOf ? ` Stand van de gegevens: ${asOf}.` : ""}`,
  cLinks: { calc: (c) => `Aankoopkosten berekenen voor een woning ${c}`, detail: "Alle kosten en belastingen", guide: "Zo verloopt de aankoop, stap voor stap", nat: "Regels per nationaliteit" },
  costTableTitle: "Aankoopkosten in de landen van deze pagina", costTh: { country: "Land", homes: "Woningen hier", from: "Vanaf", costs: "Belastingen en kosten" },
  watchTitle: "Waar u vóór de aankoop op moet letten",
  wNoSqm: (k, n) => `${k} van de ${n} advertenties ${s(k, "noemt", "noemen")} geen woonoppervlak; de prijs per m² is daar dus niet te vergelijken.`,
  wHoa: (k, min, max) => `${k} ${s(k, "advertentie noemt", "advertenties noemen")} de maandelijkse servicekosten: ${min === max ? min : `${min} tot ${max}`}. Tel ze op bij uw jaarlijkse kosten.`,
  wHoaUnknown: (k) => `${k} ${s(k, "ligt", "liggen")} in een gebouw of complex met gemeenschappelijke kosten, maar de advertentie noemt het bedrag niet: vraag het schriftelijk op.`,
  wWhyCheap: (title, t) => (t ? `Een lage prijs heeft een reden. ${title}: ${t}` : `Een lage prijs heeft altijd een reden: bij ${title} staat die op de detailpagina.`),
  wFlood: (k, n) => `${k} van de ${n} ${s(k, "ligt", "liggen")} op een plek waar onze globale overstromingscontrole een gemiddeld of hoog risico aangeeft. De detailpagina van elke woning verwijst naar de officiële kaart.`,
  wNoise: (k, n) => `${k} van de ${n} ${s(k, "ligt", "liggen")} dicht bij een snelweg, een spoorlijn of een luchthaven (veel geluid volgens onze controle).`,
  wOld: (k, n) => `${k} van de ${n} ${s(k, "is", "zijn")} meer dan 60 dagen geleden toegevoegd. Vraag de makelaar of ${s(k, "de woning nog te koop is", "ze nog te koop zijn")} voordat u een reis plant.`,
  wSold: (k) => `${k} ${s(k, "is door een bezoeker gemeld als mogelijk verkocht en wordt gecontroleerd", "zijn door bezoekers gemeld als mogelijk verkocht en worden gecontroleerd")}.`,
  wApprox: (k, n) => `${k} van de ${n} ${s(k, "staat", "staan")} maar bij benadering op de kaart: de advertentie noemt de plaats, niet de straat.`,
  wDims: (weak, wa, strong, sa) => `Zwakste deelscore van deze woningen, gemiddeld: ${weak} (${wa}/100). Sterkste: ${strong} (${sa}/100).`,
  wRental: (t) => `Wilt u verhuren? ${t}`,
  dim: (k) => ({ price: "prijs", value: "prijs per m²", space: "oppervlakte", condition: "instapklare staat", extras: "voorzieningen", water: "afstand tot zee of meer", weather: "dagen met mooi weer", access: "afstand tot de luchthaven", costs: "aankoopkosten" } as Record<string, string>)[k] || k,
  faqTitle: "Vragen van kopers",
  qCheapest: (x) => `Wat is ${art(x)} ${x}?`,
  aCheapest: (title, town, price, sqm, beds, nota) => `${title}${at(title, town)}, te koop voor ${price}${sqm ? `, met ${sqm} m²` : ""}${beds ? `${sqm ? " en" : ", met"} ${bedsW(beds)}` : ""}.${nota ? ` De RealHunt-score is ${nota}.` : ""}`,
  qCount: (w) => (w.includes(" te koop") ? `Hoeveel ${w.replace(" te koop", " staan er te koop")}?` : `Hoeveel ${w} zijn er?`),
  aCount: (n, date, parent, n30) => `${n}, op ${date}${parent ? `, van ${parent}` : ""}.${n30 ? ` ${n30} ${s(n30, "is", "zijn")} er in de afgelopen 30 dagen bij gekomen.` : ""}`,
  qSize: (w) => `Hoe groot zijn de ${w}?`,
  aSize: (med, beds, max, town) => `De mediaan is ${med} m²${beds ? `; ${beds === 4 ? "4 of meer slaapkamers" : bedsW(beds)} komt het meest voor` : ""}. De grootste heeft ${max} m² en ligt ${inR(town)}.`,
  qAllIn: (cap, c) => `Is ${cap} genoeg om ${c} een woning te kopen, inclusief belastingen en kosten?`,
  aAllIn: (cap, pct, lo, hi, maxAsk, fit) => `Niet bij een vraagprijs van ${cap}: met circa ${pc(pct)}% aan belastingen en kosten komt de aankoop in totaal op ${range(lo, hi)}. Om in totaal onder ${cap} te blijven, mag de vraagprijs hooguit circa ${maxAsk} zijn; ${fit ? `dat geldt voor ${woningen(fit)} op deze pagina` : "dat geldt voor geen enkele woning op deze pagina"}.`,
  qWhere: (w) => `Waar liggen de ${w}?`,
  aWhere: (l) => `Vooral hier: ${list(l)}.`,
  qPrice: (one) => `Wat kost een ${one.replace(" te koop", "")}?`,
  aPrice: (min, med, pp, max, n) => `De vraagprijzen van de ${n} woningen lopen van ${min} tot ${max}. De mediaan is ${med}${pp ? ` (${pp})` : ""}.`,
  qForeign: (c) => `Mogen buitenlanders ${c} een huis kopen?`,
  qCosts: (c) => `Hoe hoog zijn de aankoopkosten ${c}?`,
  aCosts: (pct, br, med, lo, hi) => `Circa ${pc(pct)}% boven op de koopprijs${dot(br)} Voor de mediane woning van deze pagina (${med}) is dat ${range(lo, hi)}. Algemene informatie, geen fiscaal advies.`,
  qRegion: (c) => `Welke regio is ${c} het goedkoopst?`,
  aRegion: (low, high) => `Van de regio's met minstens 3 woningen op RealHunt heeft ${low.name} de laagste mediaanprijs, ${low.median} bij ${woningen(low.n)}, en ${high.name} de hoogste, ${high.median}.`,
  qVs: (p, wider) => `Zijn woningen ${inR(p)} goedkoper dan elders ${inR(wider)}?`,
  aVs: (p, wider, med, pMed, pct, n, pn) => `De mediaanprijs ${inR(p)} is ${med} (${woningen(n)}), ${pct < 0 ? `${-pct}% onder` : pct > 0 ? `${pct}% boven` : "gelijk aan"} de mediaan van ${pMed} van de ${pn} woningen die wij ${inR(wider)} hebben.`,
  qCountries: (w) => (/^\d/.test(w) ? "In welke landen liggen de woningen van deze lijst?" : `In welke landen zijn er ${w}?`),
  aCountries: (l) => `Vandaag op RealHunt: ${list(l)}.`,
  moreTitle: (F) => (F.f.country ? `Meer zoekopdrachten ${inC(F.f.country)}` : "Meer zoekopdrachten"),
  more: { budget: "Op budget", region: "Op regio", setting: "Op ligging", type: "Op type", beds: "Op slaapkamers", feature: "Op kenmerk", town: "Op plaats", elsewhere: (l) => `${l} in andere landen`, countries: "Op land", all: "Alle zoekopdrachten naar goedkope huizen",
    area: "Op gebied", combo: "Op kenmerk en budget", ccy: "In pond en dollar", near: "In de buurt van een stad", ranked: "Ranglijsten" },
  ccy,
  city,
  how: (F, v) => {
    const f = F.f;
    if (f.ranked) return f.key === "cheapest"
      ? `Dit zijn de ${F.n} laagste vraagprijzen van ${v.parent}, oplopend gesorteerd. De lijst verandert zodra er een woning bij komt, wordt verkocht of in prijs wordt verlaagd.`
      : `Dit zijn de ${F.n} laagste prijzen per m² van de ${v.total} woningen waarvan de advertentie het woonoppervlak noemt. Een lage prijs per m² hoort meestal bij een groot huis op een plek waar weinig mensen zoeken.`;
    if (f.kind === "ccyBand") return `${v.cap} is ${v.eur} tegen de referentiekoers van de Europese Centrale Bank van ${v.date} (${money(1)} = ${v.rate.replace(".", ",")} ${f.ccy === "GBP" ? "pond" : "dollar"}). Verkocht wordt in euro of in de valuta van het land: de bedragen in ${f.ccy === "GBP" ? "pond" : "dollar"} op deze pagina zijn een benadering en veranderen met de wisselkoers.`;
    if (f.kind === "near") return `Op deze lijst staan woningen binnen ${NEAR_KM} km in vogelvlucht van het centrum van ${cityOf(f)}. Over de weg is het verder: controleer de reistijd voordat u op dagelijks pendelen rekent.`;
    if (f.kind === "area") { const a = areaBySlug(f.cc || "", f.area || ""); return a ? `Tot het gebied ‘${areaL(f)}’ rekenen wij hier de woningen uit ${a.hoods ? "deze wijken: " : ""}${v.regions}${a.sea ? ", voor zover ze aan zee liggen (hooguit 5 km van de kust of aangeboden als strandwoning)" : ""}.` : ""; }
    return (f.kind === "feature" || f.kind === "gfeature") && f.key ? HOW[f.key] || "" : "";
  },
  l1rank: (w, min, max) => `De ${w} op RealHunt kosten vandaag tussen ${min} en ${max}.`,
  gridTitleRank: (key, n) => (key === "cheapest" ? `De ${n} woningen, van goedkoop naar duur` : `De ${n} woningen, oplopend op prijs per m²`),
  x: {
    amen: (l) => `Voorzieningen volgens de advertenties: ${l.map(([k, n]) => `${n} met ${AMEN[k] || k}`).join(", ")}.`,
    airport: (med, title, km, _name, _l, code, codes) => `Luchthavens: de mediane afstand is ${med} km. Het dichtstbij ligt ${title}, op ${km < 1 ? "minder dan 1" : km} km van de luchthaven${code ? ` ${code}` : ""}.${codes.some((c) => c.name) ? ` Dichtstbijzijnde luchthavens op code: ${list(codes.filter((c) => c.name))}.` : ""}`,
    sea: (n, med, title, m) => `Afstand tot de zee, gemeten bij ${n} van deze woningen: ${num(m)} m bij de dichtstbijzijnde (${title}), mediaan ${num(med)} m.`,
    plot: (med, title, m2) => `Perceel: mediaan ${num(med)} m². Het grootste heeft ${num(m2)} m²: ${title}.`,
    ppsqm: (title, low, high) => `Prijs per m²: van ${low} (${title}) tot ${high}.`,
    score: (n, pct, parent, n95) => `${woningen(n)} ${s(n, "heeft", "hebben")} een score van 90 of hoger: ${pct}% van ${parent}.${n95 ? ` ${n95} daarvan ${s(n95, "heeft", "hebben")} 95 of hoger.` : ""}`,
    fee: (n, min, max, yMin, yMax) => `Servicekosten volgens ${n} ${s(n, "advertentie", "advertenties")}: ${min === max ? min : `${min} tot ${max}`} per maand, dus ${yMin === yMax ? yMin : `${yMin} tot ${yMax}`} per jaar.`,
    drop: (title, pct, amount, med) => `De grootste prijsverlaging: ${pct}% (${amount}) bij ${title}. De mediaan op deze pagina is ${med}%.`,
    days: (med, title, v) => `Dagen met mooi weer: mediaan ${med} per jaar. De meeste, ${v}, heeft: ${title}.`,
    elev: (n, med, title, v) => `Hoogte, bekend bij ${n} van deze woningen: mediaan ${num(med)} m. Het hoogst, op ${num(v)} m, ligt: ${title}.`,
    islands: (l) => `Eilanden: ${list(l)}.`,
    dist: (c, med, title, km, far) => `Afstand in vogelvlucht tot ${c}: van ${km < 1 ? "minder dan 1" : km} km (${title}) tot ${far} km, mediaan ${med} km.`,
    rank: (key, n, title, v, of) => (key === "cheapest" ? `De grens ligt vandaag bij ${v}: ${title} is nummer ${n} van de ${of}.` : `De grens ligt vandaag bij ${v}: ${title} is nummer ${n} van de ${of} woningen met een opgegeven woonoppervlak.`),
    vs: (other, med, n, oMed, on, pct) => `Vergeleken met ${other}: de mediaan is hier ${med} (${woningen(n)}), ${pct}% onder de mediaan van ${oMed} van de ${on} woningen die wij daar hebben.`,
  },
  noteSource: "Bron", noteAsOf: (asOf) => `Stand: ${asOf}. Algemene informatie, geen juridisch of fiscaal advies.`,
  season: { title: "Passend bij het seizoen", winter: "Voor de winter", summer: "Voor de zomer" },
  allIn: (c, n) => `Alle ${n} woningen ${c}`,
  sources: (l) => `Deze advertenties komen van ${l.map(([d, n]) => `${d} (${n})`).join(", ")}.`,
  notAgent: "RealHunt is geen makelaar en verkoopt deze woningen niet: elke woning verwijst naar de oorspronkelijke advertentie en is vóór publicatie door een mens gecontroleerd.",
  alert: (c) => `E-mail ontvangen bij nieuwe woningen ${c}`,
  filter: "Deze woningen filteren en sorteren",
  method: "Zo komt de score tot stand",
  moved: "Deze pagina is verhuisd.",
};
