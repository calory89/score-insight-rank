// Polish wording of the listing pages (15-nov-2026), written in Polish: seo/listings/pack.ts says what each entry is
// for. What Polish needs that German and Dutch do not:
//  - a number decides the form of its noun: 1 dom, 2-4 domy, 5+ domów (and 12-14 domów, 22 domy): pl() below, and the
//    verb follows (1 oferta dochodzi, 3 oferty dochodzą, 5 ofert dochodzi);
//  - the search of a page is kept in five forms (after a number of 5 or more, one home, the heading, "cheap ...",
//    "the cheapest ..."), and every trait is worded as a phrase that never changes ("z ogrodem", "do remontu",
//    "na jednym poziomie"), so no adjective has to agree;
//  - names of towns are never declined: they follow a comma, a colon or "w miejscowości". Regions and countries
//    that have pages carry their own vetted "w ..." form (w Toskanii, na Sycylii, w prowincji Alicante).
// Amounts are written "50 000 €" (no space in four-digit numbers: "9500 €"), dates "13 listopada 2026".
import type { Pack, Facts, Form, Named } from "./pack";
import { areaBySlug, cityBySlug, NEAR_KM } from "./places";
import { titleIn, placeIn, grouped, NB, type PlaceWords } from "./packkit";

const num = (n: number) => (Math.abs(n) < 10000 ? String(Math.round(n)) : grouped(n, NB));
const money = (n: number) => `${num(n)}${NB}€`;
const MONTHS = ["stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca", "sierpnia", "września", "października", "listopada", "grudnia"];
const SHORT = ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"];
/** 1 dom, 2 domy, 5 domów, 12 domów, 22 domy, 25 domów */
export const plPL = <T,>(n: number, one: T, few: T, many: T): T => { const a = Math.abs(n) % 100, b = a % 10; return Math.abs(n) === 1 ? one : b >= 2 && b <= 4 && !(a >= 12 && a <= 14) ? few : many; };
const pl = plPL;
/** The verb after a counted noun: 1 oferta ma, 3 oferty mają, 5 ofert ma. */
const verb = (n: number, sg: string, plural: string) => pl(n, sg, plural, sg);

// [name, "w ..."]
const COUNTRY: Record<string, [string, string]> = {
  Spain: ["Hiszpania", "w Hiszpanii"], Italy: ["Włochy", "we Włoszech"], "United States": ["Stany Zjednoczone", "w Stanach Zjednoczonych"], Denmark: ["Dania", "w Danii"], France: ["Francja", "we Francji"],
  Sweden: ["Szwecja", "w Szwecji"], Japan: ["Japonia", "w Japonii"], Poland: ["Polska", "w Polsce"], Germany: ["Niemcy", "w Niemczech"], Netherlands: ["Holandia", "w Holandii"],
  Greece: ["Grecja", "w Grecji"], Portugal: ["Portugalia", "w Portugalii"], Switzerland: ["Szwajcaria", "w Szwajcarii"], Mexico: ["Meksyk", "w Meksyku"], Canada: ["Kanada", "w Kanadzie"],
  Bulgaria: ["Bułgaria", "w Bułgarii"], "Dominican Republic": ["Dominikana", "na Dominikanie"], Cyprus: ["Cypr", "na Cyprze"], "United Kingdom": ["Wielka Brytania", "w Wielkiej Brytanii"],
  Scandinavia: ["Skandynawia", "w Skandynawii"], Norway: ["Norwegia", "w Norwegii"], Ireland: ["Irlandia", "w Irlandii"], Colombia: ["Kolumbia", "w Kolumbii"], Uruguay: ["Urugwaj", "w Urugwaju"], Hungary: ["Węgry", "na Węgrzech"], "Czech Republic": ["Czechy", "w Czechach"], Slovenia: ["Słowenia", "w Słowenii"],
};
const country = (c: string) => COUNTRY[c]?.[0] || c;
const inC = (c: string) => COUNTRY[c]?.[1] || `w kraju ${c}`;
const IN_BY_NAME: Record<string, string> = Object.fromEntries(Object.values(COUNTRY));

export const PLACES: PlaceWords = {
  map: {
    Abruzzo: "Abruzja", Apulia: "Apulia", Calabria: "Kalabria", "Lake Como": "jezioro Como", Lazio: "Lacjum", Lombardy: "Lombardia", Marche: "Marche", Piedmont: "Piemont", Sardinia: "Sardynia", Sicily: "Sycylia", Tuscany: "Toskania", Umbria: "Umbria",
    "Northern Ireland": "Irlandia Północna", "County Down": "hrabstwo Down", "County Fermanagh": "hrabstwo Fermanagh", "County Mayo": "hrabstwo Mayo", "County Galway": "hrabstwo Galway", "County Waterford": "hrabstwo Waterford", "West Mani": "zachodnie Mani", "Lake Balaton": "Balaton", "Karlovy Vary region": "kraj karlowarski", "Vysočina region": "kraj Wysoczyna", "Ústí nad Labem region": "kraj ustecki", "Lower Austria": "Dolna Austria", "County Leitrim": "hrabstwo Leitrim", "County Durham": "hrabstwo Durham", "Central Jutland": "Jutlandia Środkowa", "East Jutland": "Jutlandia Wschodnia", "North Jutland": "Jutlandia Północna", "West Jutland": "Jutlandia Zachodnia", "South Jutland": "Jutlandia Południowa", Funen: "Fionia", "West Zealand": "Zelandia Zachodnia",
    "Black Sea": "Morze Czarne", "Allegheny Mountains": "góry Allegheny", "Lake Superior region": "okolice Jeziora Górnego", "North Carolina": "Karolina Północna", "South Carolina": "Karolina Południowa", "West Virginia": "Wirginia Zachodnia",
    "Central Sweden": "środkowa Szwecja", "Northern Sweden": "północna Szwecja", Crete: "Kreta", "North Evia": "północna Eubea", Evia: "Eubea", Rhodes: "Rodos", Corfu: "Korfu", Sporades: "Sporady", Halkidiki: "Chalkidiki", Messinia: "Mesenia", Peloponnese: "Peloponez",
    "Greater Poland": "Wielkopolska", "Kuyavia-Pomerania": "Kujawsko-Pomorskie", "Lower Silesia": "Dolny Śląsk", Lubusz: "Lubuskie", Masovia: "Mazowsze", Podlaskie: "Podlaskie", Pomerania: "Pomorze", Silesia: "Śląsk", Subcarpathia: "Podkarpacie",
    "Warmia-Masuria": "Warmia i Mazury", "West Pomerania": "Pomorze Zachodnie", "Świętokrzyskie": "Świętokrzyskie", Newfoundland: "Nowa Fundlandia", "New Brunswick": "Nowy Brunszwik", "Nova Scotia": "Nowa Szkocja", Valais: "Valais", Tenerife: "Teneryfa",
    Saxony: "Saksonia", Thuringia: "Turyngia", "Saxony-Anhalt": "Saksonia-Anhalt", "Prince Edward Island": "Wyspa Księcia Edwarda", "Big Wolf Lake": "Big Wolf Lake", "Canadohta Lake": "Canadohta Lake", "French Island": "French Island", "East Palestine": "East Palestine",
    Florida: "Floryda", Pennsylvania: "Pensylwania", Asturias: "Asturia", Cantabria: "Kantabria", "Skåne": "Skania", "Småland": "Smalandia", Sevilla: "Sewilla", Granada: "Grenada", Valencia: "Walencja", Madrid: "Madryt", Murcia: "Murcja", "Málaga": "Malaga", "Cádiz": "Kadyks",
  },
  near: (n) => `okolice miejscowości ${n}`,
  central: (n) => `${n}, centrum`,
  area: (n) => `${n} i okolice`,
};
const place = (n: string, _cc?: string, where?: "card") => placeIn(PLACES, n, where);
// idea 84 of the second list (21 Nov 2026): the description names where the cheapest home is, as the English and Spanish ones do
const cheapIn = (F: { cheapest: { town: string } }) => { const t = F.cheapest?.town ? place(F.cheapest.town, undefined, "card") : ""; return t ? ` (${t})` : ""; };
/** A region after its preposition, by its Polish name: only the names somebody checked. */
const IN_R: Record<string, string> = {
  Toskania: "w Toskanii", Kalabria: "w Kalabrii", Lacjum: "w Lacjum", Sycylia: "na Sycylii", "jezioro Como": "nad jeziorem Como", Sardynia: "na Sardynii", Apulia: "w Apulii", Umbria: "w Umbrii", Lombardia: "w Lombardii", Abruzja: "w Abruzji", Piemont: "w Piemoncie",
  "Jutlandia Północna": "w Jutlandii Północnej", "Jutlandia Zachodnia": "w Jutlandii Zachodniej", "Jutlandia Wschodnia": "w Jutlandii Wschodniej", "Jutlandia Środkowa": "w Jutlandii Środkowej", "Jutlandia Południowa": "w Jutlandii Południowej", Fionia: "na Fionii", Falster: "na wyspie Falster", Mors: "na wyspie Mors",
  Podlaskie: "w województwie podlaskim", "Łódź": "w Łodzi", Floryda: "na Florydzie", Pensylwania: "w Pensylwanii", Maine: "w stanie Maine", "Kavarna (Morze Czarne)": "w miejscowości Kavarna (Morze Czarne)",
  Teneryfa: "na Teneryfie", Fuerteventura: "na Fuerteventurze", Asturia: "w Asturii", Kantabria: "w Kantabrii", Madryt: "w regionie Madrytu", Murcja: "w regionie Murcji",
  "Nowy Brunszwik": "w Nowym Brunszwiku", Kreta: "na Krecie", Skania: "w Skanii", Smalandia: "w Smalandii", "Saint-Étienne": "w Saint-Étienne", Valais: "w kantonie Valais", Chemnitz: "w Chemnitz",
};
/** What a region is called in each country, for the names without an entry above: "w prowincji Alicante". */
const UNIT: Record<string, string> = { spain: "w prowincji", japan: "w prefekturze", "united-states": "w stanie", canada: "w prowincji", france: "w departamencie", portugal: "w dystrykcie", "dominican-republic": "w prowincji", switzerland: "w kantonie" };
const inR = (n: string, cc?: string) => IN_R[n] || `${UNIT[cc || ""] || "w regionie"} ${n}`;

// [label, "na ..."]
const AREA: Record<string, [string, string]> = {
  "costa-del-sol": ["Costa del Sol", "na Costa del Sol"], "costa-blanca": ["Costa Blanca", "na Costa Blanca"], "costa-calida": ["Costa Cálida", "na Costa Cálida"], "costa-de-almeria": ["Costa de Almería", "na Costa de Almería"],
  "canary-islands": ["Wyspy Kanaryjskie", "na Wyspach Kanaryjskich"], "balearic-islands": ["Baleary", "na Balearach"], "green-spain": ["Zielona Hiszpania", "w Zielonej Hiszpanii"], algarve: ["Algarve", "w Algarve"],
  "southern-italy": ["Południowe Włochy", "na południu Włoch"], "abruzzo-and-marche": ["Abruzja i Marche", "w Abruzji i Marche"], lunigiana: ["Lunigiana", "w regionie Lunigiana"], "lake-maggiore": ["Lago Maggiore", "nad Lago Maggiore"], "lake-garda": ["Jezioro Garda", "nad jeziorem Garda"],
  limousin: ["Limousin", "w regionie Limousin"], hokkaido: ["Hokkaido", "na Hokkaido"], tohoku: ["Tohoku", "w regionie Tohoku"], kanto: ["Kanto", "w regionie Kanto"], chubu: ["Chubu", "w regionie Chubu"], kansai: ["Kansai", "w regionie Kansai"], chugoku: ["Chugoku", "w regionie Chugoku"],
  shikoku: ["Sikoku", "na Sikoku"], kyushu: ["Kiusiu", "na Kiusiu"], norrland: ["Norrland", "w Norrlandii"], jutland: ["Jutlandia", "w Jutlandii"], "lolland-falster": ["Lolland i Falster", "na wyspach Lolland i Falster"],
  "andalusia": ["Andaluzja", "w Andaluzji"],
  "valencian-community": ["Wspólnota Walencka", "we Wspólnocie Walenckiej"],
  "catalonia": ["Katalonia", "w Katalonii"],
  "galicia": ["Galicja", "w Galicji"],
  "castile-and-leon": ["Kastylia i León", "w Kastylii i León"],
  "aragon": ["Aragonia", "w Aragonii"],
  "castilla-la-mancha": ["Kastylia-La Mancha", "w Kastylii-La Mancha"],
  "basque-country": ["Kraj Basków", "w Kraju Basków"],
  "boca-raton": ["Boca Raton", "w Boca Raton"],
  "hollywood": ["Hollywood (Floryda)", "w Hollywood (Floryda)"],
  "doral": ["Doral", "w Doral"],
  "amsterdam-zuidoost": ["Amsterdam-Zuidoost", "w dzielnicy Amsterdam-Zuidoost"], "eastern-germany": ["Saksonia, Saksonia-Anhalt i Turyngia", "w Saksonii, Saksonii-Anhalt i Turyngii"], masuria: ["Mazury", "na Mazurach"],
  peloponnese: ["Peloponez", "na Peloponezie"], "black-sea-coast": ["Wybrzeże Morza Czarnego", "na wybrzeżu Morza Czarnego"], "atlantic-canada": ["Kanada atlantycka", "w atlantyckich prowincjach Kanady"],
};
const areaL = (f: { area?: string }) => AREA[f.area || ""]?.[0] || String(f.area || "");
const areaIn = (f: { area?: string }) => AREA[f.area || ""]?.[1] || `w regionie ${f.area}`;
const IN_BY_LABEL: Record<string, string> = Object.fromEntries(Object.values(AREA));
// [name, "of ..." after "od", "okolice"]
const CITY: Record<string, [string, string]> = {
  barcelona: ["Barcelona", "Barcelony"], madrid: ["Madryt", "Madrytu"], valencia: ["Walencja", "Walencji"], alicante: ["Alicante", "Alicante"], malaga: ["Malaga", "Malagi"], seville: ["Sewilla", "Sewilli"],
  milan: ["Mediolan", "Mediolanu"], rome: ["Rzym", "Rzymu"], florence: ["Florencja", "Florencji"], naples: ["Neapol", "Neapolu"], paris: ["Paryż", "Paryża"], lyon: ["Lyon", "Lyonu"], toulouse: ["Tuluza", "Tuluzy"],
  berlin: ["Berlin", "Berlina"], leipzig: ["Lipsk", "Lipska"], amsterdam: ["Amsterdam", "Amsterdamu"], copenhagen: ["Kopenhaga", "Kopenhagi"], aarhus: ["Aarhus", "Aarhus"], stockholm: ["Sztokholm", "Sztokholmu"], gothenburg: ["Göteborg", "Göteborga"],
  lisbon: ["Lizbona", "Lizbony"], porto: ["Porto", "Porto"], athens: ["Ateny", "Aten"], warsaw: ["Warszawa", "Warszawy"], geneva: ["Genewa", "Genewy"], zurich: ["Zurych", "Zurychu"],
  tokyo: ["Tokio", "Tokio"], osaka: ["Osaka", "Osaki"], miami: ["Miami", "Miami"], orlando: ["Orlando", "Orlando"], tampa: ["Tampa", "Tampy"],
};
const city = (slug: string) => CITY[slug]?.[0] || cityBySlug(slug)?.[1] || slug;
/** "Madrytu" after "od" and "okolice"; a city nobody declined yet goes after "miasta". */
const cityGen = (slug: string) => CITY[slug]?.[1] || `miasta ${city(slug)}`;

const list = (l: Named[]) => l.map((x) => `${x.name} (${x.n})`).join(", ");
const upper = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
const pc = (x: string) => { const y = x.replace(/(\d)\.(\d)/g, "$1,$2"); const m = /^([\d,]+)\s*[-–]\s*([\d,]+)$/.exec(y.trim()); return m ? `od ${m[1]} do ${m[2]}` : y; };
/** "około 10%" or "od 7,5 do 14%": a range needs no "about". */
const about = (x: string) => (/^od /.test(pc(x)) ? pc(x) : `około ${pc(x)}`);
const dot = (x: string) => (x ? (/[.!?]$/.test(x.trim()) ? `: ${x.trim()}` : `: ${x.trim()}.`) : ".");
const range = (lo: string, hi: string) => (lo === hi ? `około ${lo}` : `od ${lo} do ${hi}`);
const bedsWith = (n: number) => (n === 4 ? "z 4 lub więcej sypialniami" : n === 1 ? "z 1 sypialnią" : `z ${n} sypialniami`);
const bedsN = (n: number) => `${n} ${pl(n, "sypialnia", "sypialnie", "sypialni")}`;
/** The town after a title, unless the title already names it. */
const named = (title: string, town: string) => !!town && title.includes(town.replace(/^okolice miejscowości /, "").replace(/ i okolice$|, centrum$/, ""));
const oferty = (n: number) => `${n} ${pl(n, "oferta", "oferty", "ofert")}`;

// [after 5 or more, one, several (the heading), "cheap" several, "the cheapest" one]
type Forms = readonly [string, string, string, string, string];
const NOUN: Record<"house" | "apartment" | "mixed", Forms> = {
  house: ["domów", "dom", "domy", "tanie domy", "najtańszy dom"],
  apartment: ["mieszkań", "mieszkanie", "mieszkania", "tanie mieszkania", "najtańsze mieszkanie"],
  mixed: ["nieruchomości", "nieruchomość", "nieruchomości", "tanie nieruchomości", "najtańsza nieruchomość"],
};
// "the N cheapest": [one, 2-4, 5 or more]
const RANKED: Record<"house" | "apartment" | "mixed", [string, string, string]> = {
  house: ["najtańszy dom", "najtańsze domy", "najtańszych domów"],
  apartment: ["najtańsze mieszkanie", "najtańsze mieszkania", "najtańszych mieszkań"],
  mixed: ["najtańsza nieruchomość", "najtańsze nieruchomości", "najtańszych nieruchomości"],
};
type Case = 0 | 1 | 2 | 3 | 4;
const CASE: Record<Form, Case> = { many: 0, one: 1, cheap: 3, cheapest: 4 };
const tail = (t: string) => (b: Forms): Forms => [`${b[0]} ${t}`, `${b[1]} ${t}`, `${b[2]} ${t}`, `${b[3]} ${t}`, `${b[4]} ${t}`];
const fixed = (f: Forms) => (): Forms => f;
const HOUSE = NOUN.house;
const KEYED: Record<string, (b: Forms) => Forms> = {
  "by-the-sea": tail("nad morzem"),
  "village-houses": () => tail("na wsi")(HOUSE),
  "in-town": tail("w mieście"),
  "near-a-lake": tail("nad jeziorem"),
  "with-garden": tail("z ogrodem"),
  "with-pool": tail("z basenem"),
  "with-sauna": tail("z sauną"),
  "stone-houses": () => tail("z kamienia")(HOUSE),
  "cabins-and-cottages": fixed(["domków letniskowych i chat", "domek letniskowy lub chata", "domki letniskowe i chaty", "tanie domki letniskowe i chaty", "najtańszy domek letniskowy"]),
  "with-a-terrace": tail("z tarasem lub balkonem"),
  turnkey: tail("do zamieszkania od zaraz"),
  "to-renovate": tail("do remontu"),
  "with-sea-view": tail("z widokiem na morze"),
  "near-the-beach": tail("do 500 m od morza"),
  "with-land": tail("z działką od 1000 m²"),
  "with-fireplace": tail("z kominkiem"),
  "with-garage": tail("z garażem"),
  "on-an-island": tail("na wyspie"),
  "in-the-mountains": tail("w górach"),
  "with-olive-trees-or-vines": tail("z drzewami oliwnymi, winoroślą lub drzewami owocowymi"),
  "near-an-airport": tail("do 30 km od lotniska"),
  "under-500-per-sqm": tail(`poniżej ${money(500)}/m²`),
  "over-100-sqm-under-50000": tail(`powyżej 100 m² do ${money(50000)}`),
  "score-90-plus": tail("z oceną 90 lub wyższą"),
  "editors-picks": tail("z wyboru redakcji"),
  "new-this-month": tail("z ostatnich 30 dni"),
  "price-drops": tail("po obniżce ceny"),
  "single-storey": tail("na jednym poziomie"),
  "with-period-features": tail("z zabytkowymi detalami"),
  "good-weather": tail("z co najmniej 150 dniami ładnej pogody w roku"),
  "quiet-location": tail("z dala od autostrady i kolei"),
  "low-community-fee": tail("z niskim czynszem administracyjnym"),
  "cave-houses": fixed(["domów jaskiniowych", "dom jaskiniowy", "domy jaskiniowe", "tanie domy jaskiniowe", "najtańszy dom jaskiniowy"]),
  trulli: fixed(["trulli", "trullo", "trulli", "tanie trulli", "najtańsze trullo"]),
  "unusual-buildings": fixed(["zamków, młynów, kościołów i innych nietypowych budynków", "nietypowy budynek", "zamki, młyny, kościoły i inne nietypowe budynki", "tanie zamki, młyny, kościoły i inne nietypowe budynki", "najtańszy nietypowy budynek"]),
  "with-business-premises": tail("z lokalem użytkowym"),
  "with-fibre-internet": tail("ze światłowodem"),
  "with-tourist-licence": tail("z licencją na najem turystyczny"),
  "new-this-week": tail("z ostatnich 7 dni"),
  "over-80-sqm": tail("powyżej 80 m²"),
  "over-120-sqm": tail("powyżej 120 m²"),
};
const ccy = (n: number, c: string) => `${num(n)} ${c === "GBP" ? "funtów" : c === "USD" ? "dolarów" : "euro"}`;
const AMEN: Record<string, string> = { garden: "ogród", terrace: "taras", garage: "garaż", pool: "basen", fireplace: "kominek", sauna: "sauna" };
const LABEL: Record<string, string> = { "by-the-sea": "Nad morzem", "village-houses": "Domy na wsi", "in-town": "W mieście", "near-a-lake": "Nad jeziorem", "with-garden": "Z ogrodem", "with-pool": "Z basenem", "with-sauna": "Z sauną", "stone-houses": "Domy z kamienia", "cabins-and-cottages": "Domki i chaty", "with-a-terrace": "Z tarasem", apartments: "Mieszkania", houses: "Domy",
  turnkey: "Do zamieszkania od zaraz", "to-renovate": "Do remontu", "with-sea-view": "Widok na morze", "near-the-beach": "500 m od morza", "with-land": "Z działką", "with-fireplace": "Z kominkiem", "with-garage": "Z garażem",
  "on-an-island": "Na wyspie", "in-the-mountains": "W górach", "with-olive-trees-or-vines": "Drzewa oliwne lub winorośl", "near-an-airport": "Blisko lotniska", "under-500-per-sqm": `Poniżej ${money(500)}/m²`, "over-100-sqm-under-50000": `Ponad 100 m² do ${money(50000)}`,
  "score-90-plus": "Ocena 90 lub wyższa", "editors-picks": "Wybór redakcji", "new-this-month": "Nowe w tym miesiącu", "price-drops": "Obniżka ceny", "single-storey": "Na jednym poziomie", "with-period-features": "Zabytkowe detale", "good-weather": "Ładna pogoda",
  "quiet-location": "Cicha okolica", "low-community-fee": "Niski czynsz", "cave-houses": "Domy jaskiniowe", trulli: "Trulli", "unusual-buildings": "Nietypowe budynki", "with-business-premises": "Z lokalem użytkowym", "with-fibre-internet": "Światłowód", "best-rated": "Top 10 według oceny", "new-this-week": "Nowe w tym tygodniu", "over-80-sqm": "Ponad 80 m²", "over-120-sqm": "Ponad 120 m²", "with-tourist-licence": "Najem turystyczny dozwolony",
  cheapest: "Najtańsze", "most-space-for-the-money": "Najniższa cena za m²" };

/** The page's search as a phrase, in the form the sentence needs. */
function phrase(F: Facts, c: Case): string {
  const f = F.f;
  const kind = f.kind === "ptype" ? (f.key === "apartments" ? "apartment" : "house") : F.noun;
  const b = NOUN[kind];
  const where = f.country ? ` ${inC(f.country)}` : "";
  const under = f.cap ? ` do ${f.kind === "ccyBand" ? ccy(f.cap, f.ccy!) : money(f.cap)}` : "";
  const sale = " na sprzedaż";
  if (f.ranked) {
    const single = c === 1 || c === 4;
    if (f.key === "cheapest") return single ? `${NOUN[F.noun][4]}${sale}${where}` : `${F.n} ${pl(F.n, ...RANKED[F.noun])}${sale}${where}`;
    const n = NOUN[F.noun];
    return single ? `${n[1]} z najniższą ceną za m²${sale}${where}` : `${F.n} ${pl(F.n, n[1], n[2], n[0])} z najniższą ceną za m²${sale}${where}`;
  }
  const keyed = (k: string) => KEYED[k](b)[c];
  const region = () => inR(place(f.region!) || f.region!, f.cc);
  switch (f.kind) {
    case "combo": return f.key === "apartments" || f.key === "houses" ? `${NOUN[f.key === "apartments" ? "apartment" : "house"][c]}${sale}${where}${under}` : `${keyed(f.key!)}${sale}${where}${under}`;
    case "area": return `${b[c]}${sale} ${areaIn(f)}`;
    case "near": return `${b[c]}${sale} w promieniu ${NEAR_KM} km od ${cityGen(f.city || "")}`;
    case "region": return `${b[c]}${sale} ${region()} (${country(f.country!)})`;
    case "town": return `${b[c]}${sale} w miejscowości ${f.town} (${place(f.region!) || f.region})`;
    case "regionBand": return f.area ? `${b[c]}${sale} ${areaIn(f)}${under}` : `${b[c]}${sale} ${region()} (${country(f.country!)})${under}`;
    case "setting": case "feature": case "gfeature": return `${keyed(f.key!)}${sale}${where}`;
    case "beds": return `${b[c]} ${bedsWith(f.beds!)}${sale}${where}`;
    default: return `${b[c]}${sale}${where}${under}`;
  }
}
/** The phrase after its own number: "1 dom na sprzedaż", "3 domy na sprzedaż", "41 domów na sprzedaż". */
const counted = (F: Facts) => (F.f.ranked ? phrase(F, 0) : `${F.n} ${phrase(F, pl<Case>(F.n, 1, 2, 0))}`);
// l1() is handed the phrase as text, not the facts: the forms that follow 1 and 2-4 are kept by the phrase they belong to
const FORMS = new Map<string, [one: string, few: string]>();
function what(F: Facts, form: Form = "many"): string {
  const w = phrase(F, CASE[form]);
  if (form === "many" && !F.f.ranked) FORMS.set(w, [phrase(F, 1), phrase(F, 2)]);
  return w;
}
const isList = (w: string) => /^\d/.test(w); // "20 najtańszych domów ...": a ranked list

const HOW: Record<string, string> = {
  turnkey: "Na tej liście są nieruchomości, których ogłoszenie wyraźnie mówi, że są gotowe do zamieszkania albo całkowicie wyremontowane. Nie oglądaliśmy ich na miejscu: poproś o datę prac i o faktury.",
  "to-renovate": "Na tej liście są nieruchomości, których ogłoszenie mówi, że wymagają remontu albo są sprzedawane jako projekt. Ogłoszenia prawie nigdy nie podają kosztu prac: przed złożeniem oferty poproś miejscowego wykonawcę o pisemny kosztorys.",
  "with-sea-view": "Na tej liście są nieruchomości, których ogłoszenie wspomina o widoku na morze. Czasem jest to tylko skrawek morza między dachami: obejrzyj zdjęcia i mapę.",
  "near-the-beach": "Na tej liście są nieruchomości, których zmierzona odległość od brzegu wynosi najwyżej 500 m w linii prostej. Pieszo może być dalej.",
  "with-land": "Na tej liście są nieruchomości, których ogłoszenie podaje działkę o powierzchni 1000 m² lub większej, w m², hektarach albo akrach. Przed zakupem sprawdź tę liczbę w księdze wieczystej albo katastrze.",
  "with-fireplace": "Na tej liście są nieruchomości, których ogłoszenie pokazuje kominek albo o nim wspomina. Zapytaj, czy komin był czyszczony i sprawdzany.",
  "with-garage": "Na tej liście są nieruchomości, których ogłoszenie wspomina o garażu.",
  "on-an-island": "Na tej liście są nieruchomości na wyspach, których szuka się po nazwie, od Teneryfy i Sycylii po Kretę i Fionię. Wyspy wielkości kraju się nie liczą.",
  "in-the-mountains": "Na tej liście są nieruchomości, które według ogłoszenia leżą w górach, mają widok na góry albo znajdują się blisko ośrodka narciarskiego.",
  "with-olive-trees-or-vines": "Na tej liście są nieruchomości, których ogłoszenie wspomina o drzewach oliwnych, winorośli, sadzie albo drzewach owocowych.",
  "near-an-airport": "Na tej liście są nieruchomości, od których do najbliższego lotniska jest najwyżej 30 km w linii prostej. Drogą jest dalej.",
  "under-500-per-sqm": `Na tej liście są nieruchomości, których cena ofertowa podzielona przez powierzchnię mieszkalną z ogłoszenia daje mniej niż ${money(500)} za m². Ogłoszenie bez podanej powierzchni nie może się tu znaleźć.`,
  "over-100-sqm-under-50000": `Na tej liście są nieruchomości o powierzchni 100 m² lub większej i cenie ofertowej najwyżej ${money(50000)}.`,
  "score-90-plus": "Na tej liście są nieruchomości z oceną RealHunt 90 lub wyższą, na 98 możliwych. Ocena porównuje cenę, powierzchnię, stan, położenie i koszty zakupu ze wszystkimi pozostałymi nieruchomościami w serwisie.",
  "editors-picks": "Na tej liście są nieruchomości, które ktoś z zespołu RealHunt wyróżnił po sprawdzeniu ogłoszenia. Nikt nie płaci za to, żeby się tu znaleźć.",
  "new-this-month": "Na tej liście są nieruchomości dodane do RealHunt w ciągu ostatnich 30 dni.",
  "price-drops": "Na tej liście są nieruchomości, których cena ofertowa spadła, odkąd je opublikowaliśmy. Obniżka to różnica między pierwszą ceną, którą widzieliśmy, a ceną dzisiejszą.",
  "single-storey": "Na tej liście są nieruchomości, które według ogłoszenia mieszczą się na jednym poziomie, bez schodów między pomieszczeniami.",
  "with-period-features": "Na tej liście są nieruchomości, których ogłoszenie podaje ich wiek albo zabytkowe detale: stulecie, oryginalne belki lub podłogi, sklepione sufity, mur pruski albo wpis do rejestru zabytków. Roku budowy nie znamy dla wszystkich nieruchomości.",
  "good-weather": "Na tej liście są nieruchomości w miejscach, gdzie według średnich klimatycznych jest co najmniej 150 dni ładnej pogody w roku: temperatura maksymalna od 18 do 33 °C, bez deszczu i przy słabym wietrze.",
  "quiet-location": "Na tej liście są nieruchomości, w pobliżu których OpenStreetMap nie pokazuje autostrady ani linii kolejowej, a nasze sprawdzenie dróg, kolei i lotnisk wskazuje niski poziom hałasu. To sprawdzenie na mapie, a nie pomiar hałasu.",
  "low-community-fee": "Na tej liście są nieruchomości, których ogłoszenie podaje miesięczny czynsz administracyjny nie wyższy niż 250 w swojej walucie (euro, dolary albo funty). Większość ogłoszeń nie podaje tej opłaty, więc nie może się tu znaleźć.",
  "cave-houses": "Na tej liście są nieruchomości, które ogłoszenie opisuje jako dom jaskiniowy.",
  trulli: "Na tej liście są nieruchomości, które ogłoszenie opisuje jako trullo.",
  "unusual-buildings": "Na tej liście są nieruchomości, których tytuł wymienia zamek, dwór, młyn, wieżę mieszkalną albo dawny kościół, dawną szkołę lub dawny dworzec.",
  "with-business-premises": "Na tej liście są nieruchomości, których tytuł wymienia sklep, bar, restaurację, obiekt noclegowy albo inny lokal użytkowy sprzedawany razem z nieruchomością. O tym, czy działalność może zostać wznowiona, decydują zezwolenia gminy: zapytaj w urzędzie gminy.",
  "with-fibre-internet": "Na tej liście są nieruchomości, których ogłoszenie wspomina o światłowodzie albo szybkim internecie. Nie testujemy łączy: poproś sprzedającego o aktualny test prędkości.",
  "with-tourist-licence": "Na tej liście są nieruchomości, których ogłoszenie wspomina o licencji na najem turystyczny. Licencja może wygasnąć przy sprzedaży: zapytaj w urzędzie gminy, zanim zaczniesz na nią liczyć.",
  "new-this-week": "Na tej liście są nieruchomości dodane do RealHunt w ciągu ostatnich 7 dni. Lista jest odświeżana codziennie.",
  "over-80-sqm": "Na tej liście są nieruchomości, których ogłoszenie podaje powierzchnię większą niż 80 m². Ogłoszenie bez powierzchni nie może się na niej znaleźć.",
  "over-120-sqm": "Na tej liście są nieruchomości, których ogłoszenie podaje powierzchnię większą niż 120 m². Ogłoszenie bez powierzchni nie może się na niej znaleźć.",
};

const pack: Pack = {
  lang: "pl",
  money,
  perSqm: (n) => `${num(n)}${NB}€/m²`,
  date: (d) => `${Number(d.slice(8, 10))} ${MONTHS[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`,
  dateShort: (d) => `${Number(d.slice(8, 10))} ${SHORT[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`,
  country,
  inC,
  place,
  homeTitle: (h) => titleIn("pl", h),
  homeWhy: () => "",
  what,
  h1: (F) => (F.f.ranked ? `${upper(phrase(F, 2))}${F.f.country ? "" : " na RealHunt"}`
    : upper(phrase(F, (F.f.cap && F.f.cap <= 100000) || (["gfeature", "feature", "area", "near"].includes(F.f.kind) && F.median <= 100000) ? 3 : 2))),
  title: (h1, n, min) => (isList(h1) ? `${h1}, ceny od ${min}` : `${h1}: ${oferty(n)} od ${min}`),
  desc: (F) => `${upper(counted(F))}, w cenach od ${money(F.min)}${cheapIn(F)} do ${money(F.max)}. Mediana ceny: ${money(F.median)}${F.scoreAvg ? `, średnia ocena ${F.scoreAvg} na 98` : ""}. Zdjęcia, powierzchnie, oceny, koszty zakupu i na co zwrócić uwagę.`,
  crumbRoot: "RealHunt", crumbCheap: "Tanie domy",
  crumbCountry: (c) => `Domy ${IN_BY_NAME[c] || `w kraju ${c}`}`,
  label: (f) => (f.kind === "combo" ? `${LABEL[f.key!] || f.key}, do ${money(f.cap!)}` : f.kind === "ccyBand" ? `Do ${ccy(f.cap!, f.ccy!)}` : f.kind === "area" ? areaL(f) : f.kind === "near" ? `Okolice ${cityGen(f.city || "")}`
    : f.cap ? `Do ${money(f.cap)}` : f.kind === "region" ? place(String(f.region)) || String(f.region) : f.kind === "town" ? String(f.town) : f.kind === "beds" ? (f.beds === 4 ? "4 lub więcej sypialni" : bedsN(f.beds!)) : f.kind === "country" ? country(String(f.country)) : LABEL[f.key!] || String(f.key)),
  updated: (d, newest) => `Zaktualizowano ${d}.${newest ? ` Ostatnią ofertę dodano ${newest}.` : ""}`,
  l1: (n, w, min, max) => {
    const [one, few] = FORMS.get(w) || ["", ""];
    const prices = min === max ? (n === 1 ? `w cenie ${min}` : `wszystkie w tej samej cenie: ${min}`) : `w cenach od ${min} do ${max}`;
    if (!one) return `Liczba ofert na RealHunt dziś (${w}): ${n}, ${prices}.`;
    return `Na RealHunt ${verb(n, "jest", "są")} dziś ${n} ${pl(n, one, few, w)}, ${prices}.`;
  },
  l2: (title, town, price, sqm, beds) => `Najtańsza oferta kosztuje ${price}: ${title}${named(title, town) ? "" : `, ${town}`}${sqm || beds ? ` (${[sqm ? `${sqm} m²` : "", beds ? bedsN(beds) : ""].filter(Boolean).join(", ")})` : ""}.`,
  l3: (med, pp, pMed, pPp, parent) => `Mediana ceny to ${med}${pp ? ` (${pp})` : ""}. Dla porównania mediana ${parent} to ${pMed}${pPp ? ` (${pPp})` : ""}.`,
  l3all: (med, pp, max, parent) => `Mediana ceny to ${med}${pp ? ` (${pp})` : ""}. Na tej stronie są wszystkie: spośród ${parent} żadna nie kosztuje więcej niż ${max}.`,
  // always after "mediana", "spośród" or a percentage: "wszystkich 41 ofert RealHunt w Hiszpanii"
  parent: (kind, n, name, countries) => (kind === "site" ? `wszystkich ${n} ofert RealHunt w ${countries} krajach` : kind === "country" ? `wszystkich ${n} ofert RealHunt ${name}` : `wszystkich ${n} ofert RealHunt ${IN_R[name] || IN_BY_LABEL[name] || `w regionie ${name}`}`),
  kpi: { homes: "Oferty", from: "Od", median: "Mediana ceny", ppsqm: "Mediana za m²", size: "Mediana powierzchni", score: "Najwyższa ocena" },
  n20: { costs: "Koszty zakupu", foreign: "Kupujący z zagranicy", free: "Zakup bez ograniczeń", limits: "Z ograniczeniami", asOf: "Stan na", regionsTitle: (inC) => `Mediana cen według regionów ${inC}`, region: "Region", neighbours: "Kraje sąsiednie", siteMap: () => "" },
  gridTitle: (n, shown) => (n === shown ? `Wszystkie oferty (${n}), od najwyższej oceny` : `${shown} ${pl(shown, "najlepsza", "najlepsze", "najlepszych")} z ${n}, według oceny`),
  gridMore: (shown, n) => `Widać tu ${shown} ${pl(shown, "ofertę", "oferty", "ofert")} z najwyższą oceną spośród ${n}. Pozostałe są w tabeli i w węższych wyszukiwaniach poniżej.`,
  card: { isNew: "Nowość", drop: (p) => `Cena niższa o ${p}%`, score: "Ocena", beds: (n) => `${n} syp.`, noPhoto: "Zdjęcia w ogłoszeniu", days: (n) => (n === 0 ? "Dodano dziś" : n === 1 ? "1 dzień w RealHunt" : `${n} dni w RealHunt`) },
  tableTitle: (n, shown) => (n === shown ? `Porównanie wszystkich ofert (${n}), od najtańszej` : `Porównanie: ${shown} ${pl(shown, "najtańsza", "najtańsze", "najtańszych")} z ${n}`),
  th: { home: "Nieruchomość", place: "Miejsce", price: "Cena", size: "Powierzchnia", ppsqm: "Za m²", beds: "Sypialnie", score: "Ocena", added: "Dodano" },
  factsTitle: (F) => (F.f.kind === "ccyBand" ? `Co można kupić za ${ccy(F.f.cap!, F.f.ccy!)}${F.f.country ? ` ${inC(F.f.country)}` : ""}`
    : F.f.cap && F.f.kind !== "combo" ? `Co można kupić za ${money(F.f.cap)}${F.f.area ? ` ${areaIn(F.f)}` : F.f.region ? ` ${inR(place(F.f.region) || F.f.region, F.f.cc)}` : F.f.country ? ` ${inC(F.f.country)}` : ""}` : `Oferty w liczbach (${F.n})`),
  fSize: (med, max, title) => `Powierzchnia: połowa ma ${med} m² lub więcej. Największa nieruchomość, ${max} m²: ${title}.`,
  fBeds: (b, unknown) => `Sypialnie: ${b.map(([k, n]) => `${k === 4 ? "4 lub więcej" : k}: ${oferty(n)}`).join("; ")}${unknown ? `; brak informacji w ogłoszeniu: ${unknown}` : ""}.`,
  fType: (a, h) => `Rodzaj: ${[a ? `${a} ${pl(a, "mieszkanie", "mieszkania", "mieszkań")}` : "", h ? `${h} ${pl(h, "dom", "domy", "domów")}` : ""].filter(Boolean).join(" i ")}.`,
  fSetting: (sea, v, t) => `Położenie: ${[sea ? `nad morzem: ${sea}` : "", v ? `na wsi: ${v}` : "", t ? `w mieście: ${t}` : ""].filter(Boolean).join("; ")}.`,
  fWhere: (l) => `Gdzie: ${list(l)}.`,
  fTowns: (l) => `Miejscowości: ${list(l)}.`,
  fCountries: (l, more) => `Kraje: ${list(l)}${more ? ` i ${more} ${pl(more, "inny", "inne", "innych")}` : ""}.`,
  fStep: (from, to, n, title, nota, price) => `Od ${from} do ${to}: ${oferty(n)}. Najwyższa ocena wśród nich (${nota}, cena ${price}): ${title}.`,
  fNext: (next, add) => `Przy budżecie ${next} ${verb(add, "dochodzi", "dochodzą")} jeszcze ${oferty(add)}.`,
  fRegions: (low, high) => `Najniższa mediana ceny: ${low.name}, ${low.median} (${oferty(low.n)}). Najwyższa: ${high.name}, ${high.median} (${oferty(high.n)}).`,
  fScore: (min, max, title) => (min === max ? `Oceny: wszystkie mają ${max} na 98 możliwych. Pierwsza na liście: ${title}.` : `Oceny: od ${min} do ${max} na 98 możliwych. Najwyższą ocenę ma: ${title}.`),
  fNew: (n30, title, date) => `Ostatnio dodana oferta, ${date}: ${title}.${n30 ? ` W ciągu ostatnich 30 dni dodano: ${n30}.` : ""}`,
  costsTitle: (c) => `Koszty zakupu i zasady dla cudzoziemców ${c}`,
  cForeign: (t) => `Czy cudzoziemcy mogą kupować? ${t}`,
  cCosts: (pct, br, med, lo, hi, tLo, tHi) => `Podatki i opłaty to dodatkowo ${about(pct)}% ceny${dot(br)} Dla nieruchomości o medianowej cenie z tej strony (${med}) oznacza to ${range(lo, hi)}, czyli łącznie ${range(tLo, tHi)}.`,
  cAllIn: (cap, maxAsk, fit, n) => `Żeby cały zakup zmieścił się w kwocie ${cap}, cena ofertowa nie powinna przekraczać około ${maxAsk}. Ofert na tej stronie, które spełniają ten warunek: ${fit} z ${n}.`,
  cTax: (t) => `Roczny podatek od nieruchomości: ${t}`,
  cExamples: (rows) => `Przy tych samych stawkach: ${rows.map(([p, lo, hi]) => `przy cenie ${p} to ${range(lo, hi)}`).join("; ")}.`,
  firstTitle: "Czy możesz tu kupić? Najpierw przeczytaj to",
  cNote: (asOf) => `Informacje ogólne, nie porada podatkowa ani prawna.${asOf ? ` Stan danych: ${asOf}.` : ""}`,
  cLinks: { calc: (c) => `Kalkulator kosztów zakupu nieruchomości ${c}`, detail: "Wszystkie koszty i podatki", guide: "Jak przebiega zakup, krok po kroku", nat: "Zasady według obywatelstwa" },
  costTableTitle: "Koszty zakupu w krajach z tej strony", costTh: { country: "Kraj", homes: "Oferty tutaj", from: "Od", costs: "Podatki i opłaty" },
  watchTitle: "Na co zwrócić uwagę przed zakupem",
  wNoSqm: (k, n) => `Ogłoszenia bez podanej powierzchni: ${k} z ${n}. Ich ceny za m² nie da się porównać.`,
  wHoa: (k, min, max) => `Miesięczny czynsz administracyjny podany w ogłoszeniach (${k}): ${min === max ? min : `od ${min} do ${max}`}. Dolicz go do rocznych kosztów.`,
  wHoaUnknown: (k) => `Nieruchomości w budynku lub kompleksie z opłatami wspólnymi, których kwoty ogłoszenie nie podaje: ${k}. Poproś o nią na piśmie.`,
  wWhyCheap: (title, t) => (t ? `Niska cena ma swój powód. ${title}: ${t}` : `Niska cena zawsze ma swój powód. W przypadku oferty „${title}” jest on opisany na jej stronie.`),
  wFlood: (k, n) => `Nasze orientacyjne sprawdzenie wskazuje średnie lub wysokie ryzyko powodzi: ${k} z ${n}. Strona każdej nieruchomości prowadzi do urzędowej mapy.`,
  wNoise: (k, n) => `Blisko autostrady, linii kolejowej lub lotniska (wysoki poziom hałasu według naszego sprawdzenia): ${k} z ${n}.`,
  wOld: (k, n) => `Dodane ponad 60 dni temu: ${k} z ${n}. Zanim zaplanujesz wyjazd, zapytaj pośrednika, czy oferta jest nadal aktualna.`,
  wSold: (k) => `Zgłoszone przez odwiedzających jako prawdopodobnie sprzedane, w trakcie sprawdzania: ${k}.`,
  wApprox: (k, n) => `Położenie na mapie jest przybliżone (ogłoszenie podaje miejscowość, a nie ulicę): ${k} z ${n}.`,
  wDims: (weak, wa, strong, sa) => `Najsłabszy składnik oceny tych nieruchomości, średnio: ${weak} (${wa}/100). Najmocniejszy: ${strong} (${sa}/100).`,
  wRental: (t) => `Planujesz wynajem? ${t}`,
  dim: (k) => ({ price: "cena", value: "cena za m²", space: "powierzchnia", condition: "gotowość do zamieszkania", extras: "udogodnienia", water: "bliskość morza lub jeziora", weather: "dni z ładną pogodą", access: "bliskość lotniska", costs: "koszty zakupu" } as Record<string, string>)[k] || k,
  faqTitle: "Pytania kupujących",
  qCheapest: (x) => `${/^najtańsza\b/.test(x) ? "Jaka" : /^najtańsze\b/.test(x) ? "Jakie" : "Jaki"} jest ${x}?`,
  aCheapest: (title, town, price, sqm, beds, nota) => `${title}${named(title, town) ? "" : ` (${town})`}, cena ofertowa ${price}${sqm ? `, ${sqm} m²` : ""}${beds ? `, ${bedsN(beds)}` : ""}.${nota ? ` Ocena RealHunt: ${nota}.` : ""}`,
  qCount: (w) => (isList(w) ? "Ile ofert jest na tej liście?" : `Ile jest ${w}?`),
  aCount: (n, date, parent, n30) => `${n}, stan na ${date}${parent ? `, spośród ${parent}` : ""}.${n30 ? ` W ciągu ostatnich 30 dni dodano: ${n30}.` : ""}`,
  qSize: (w) => (isList(w) ? "Jaką powierzchnię mają oferty z tej listy?" : `Jaka jest powierzchnia ${w}?`),
  aSize: (med, beds, max, town) => `Mediana to ${med} m²${beds ? `, najczęściej ${beds === 4 ? "4 lub więcej sypialni" : bedsN(beds)}` : ""}. Największa nieruchomość ma ${max} m² (${town}).`,
  qAllIn: (cap, c) => `Czy ${cap} wystarczy, żeby kupić nieruchomość ${c} razem z podatkami i opłatami?`,
  aAllIn: (cap, pct, lo, hi, maxAsk, fit) => `Nie, jeśli cena ofertowa wynosi ${cap}: z podatkami i opłatami (${about(pct)}%) zakup kosztuje łącznie ${range(lo, hi)}. Żeby zmieścić się w kwocie ${cap}, cena ofertowa nie powinna przekraczać około ${maxAsk}. Takich ofert na tej stronie: ${fit}.`,
  qWhere: (w) => (isList(w) ? "Gdzie znajdują się oferty z tej listy?" : `Gdzie jest najwięcej ${w}?`),
  aWhere: (l) => `Głównie tutaj: ${list(l)}.`,
  qPrice: (one) => `Ile kosztuje ${one.replace(" na sprzedaż", "")}?`,
  aPrice: (min, med, pp, max, n) => `Ceny ofertowe (${oferty(n)}): od ${min} do ${max}. Mediana: ${med}${pp ? ` (${pp})` : ""}.`,
  qForeign: (c) => `Czy cudzoziemcy mogą kupić dom ${c}?`,
  qCosts: (c) => `Jakie są koszty zakupu ${c}?`,
  aCosts: (pct, br, med, lo, hi) => `${upper(about(pct))}% ponad cenę${dot(br)} Dla nieruchomości o medianowej cenie z tej strony (${med}) to ${range(lo, hi)}. Informacje ogólne, nie porada podatkowa.`,
  qRegion: (c) => `Który region jest najtańszy ${c}?`,
  aRegion: (low, high) => `Wśród regionów, w których RealHunt ma co najmniej 3 oferty, najniższą medianę ceny ma ${low.name}: ${low.median} (${oferty(low.n)}). Najwyższą ma ${high.name}: ${high.median}.`,
  qVs: (p, wider) => `Czy tutaj (${p}) jest taniej niż średnio w kraju lub regionie (${wider})?`,
  aVs: (p, wider, med, pMed, pct, n, pn) => `Mediana ceny tutaj (${p}) to ${med} (${oferty(n)}): ${pct < 0 ? `o ${-pct}% mniej niż` : pct > 0 ? `o ${pct}% więcej niż` : "tyle samo co"} mediana ${pMed} dla wszystkich ${pn} ofert w kraju lub regionie (${wider}).`,
  qCountries: (w) => (isList(w) ? "W jakich krajach są oferty z tej listy?" : `W jakich krajach szukać ${w}?`),
  aCountries: (l) => `Dziś na RealHunt: ${list(l)}.`,
  moreTitle: (F) => (F.f.country ? `Inne wyszukiwania ${inC(F.f.country)}` : "Inne wyszukiwania"),
  more: { budget: "Według budżetu", region: "Według regionu", setting: "Według położenia", type: "Według rodzaju", beds: "Według liczby sypialni", feature: "Według cech", town: "Według miejscowości", elsewhere: (l) => `${l}: inne kraje`, countries: "Według kraju", all: "Wszystkie wyszukiwania tanich domów",
    area: "Według obszaru", combo: "Według cech i budżetu", ccy: "W funtach i dolarach", near: "W pobliżu miasta", ranked: "Rankingi" },
  ccy,
  city,
  how: (F, v) => {
    const f = F.f;
    if (f.ranked) return f.key === "cheapest"
      ? `To ${F.n} ${pl(F.n, "najniższa cena ofertowa", "najniższe ceny ofertowe", "najniższych cen ofertowych")} spośród ${v.parent}, od najniższej. Lista zmienia się, gdy dochodzi nowa oferta, gdy coś zostaje sprzedane albo gdy spada cena.`
      : `To ${F.n} ${pl(F.n, "najniższa cena", "najniższe ceny", "najniższych cen")} za m² spośród ${v.total} ofert, w których ogłoszenie podaje powierzchnię mieszkalną. Niska cena za m² zwykle oznacza duży dom w miejscu, gdzie szuka niewielu kupujących.`;
    if (f.kind === "ccyBand") return `${v.cap} to ${v.eur} według kursu referencyjnego Europejskiego Banku Centralnego z dnia ${v.date} (${money(1)} = ${v.rate.replace(".", ",")} ${f.ccy === "GBP" ? "funta" : "dolara"}). Sprzedaż odbywa się w euro albo w walucie danego kraju: kwoty w ${f.ccy === "GBP" ? "funtach" : "dolarach"} na tej stronie są przybliżone i zmieniają się wraz z kursem.`;
    if (f.kind === "near") return `Na tej liście są nieruchomości w promieniu ${NEAR_KM} km w linii prostej od centrum ${cityGen(f.city || "")}. Drogą jest dalej: sprawdź czas dojazdu, zanim zaczniesz liczyć na codzienne dojazdy.`;
    if (f.kind === "area") { const a = areaBySlug(f.cc || "", f.area || ""); return a ? `Do obszaru „${areaL(f)}” zaliczamy tu nieruchomości z ${a.hoods ? "tych dzielnic" : "tych regionów"}: ${v.regions}${a.sea ? ", położone nad morzem (najwyżej 5 km od wybrzeża albo opisane w ogłoszeniu jako nieruchomość przy plaży)" : ""}.` : ""; }
    return (f.kind === "feature" || f.kind === "gfeature") && f.key ? HOW[f.key] || "" : "";
  },
  l1rank: (w, min, max) => `${upper(w)}: dziś w cenach od ${min} do ${max}.`,
  gridTitleRank: (key, n) => (key === "cheapest" ? `Oferty (${n}), od najtańszej do najdroższej` : `Oferty (${n}), od najniższej ceny za m²`),
  x: {
    amen: (l) => `Udogodnienia według ogłoszeń: ${l.map(([k, n]) => `${AMEN[k] || k}: ${n}`).join("; ")}.`,
    airport: (med, title, km, _name, _l, code, codes) => `Lotniska: mediana odległości to ${med} km. Najbliżej lotniska${code ? ` ${code}` : ""}: ${title}, ${km < 1 ? "mniej niż 1" : km} km.${codes.some((c) => c.name) ? ` Najbliższe lotniska według kodu: ${list(codes.filter((c) => c.name))}.` : ""}`,
    sea: (n, med, title, m) => `Odległość od morza (zmierzona dla ${n}): najbliżej jest ${num(m)} m (${title}), mediana ${num(med)} m.`,
    plot: (med, title, m2) => `Działka: mediana ${num(med)} m². Największa, ${num(m2)} m²: ${title}.`,
    ppsqm: (title, low, high) => `Cena za m²: od ${low} (${title}) do ${high}.`,
    score: (n, pct, parent, n95) => `Ocenę 90 lub wyższą ${verb(n, "ma", "mają")} ${oferty(n)}${parent ? `: to ${pct}% ${parent}` : ""}.${n95 ? ` Ocenę 95 lub wyższą: ${n95}.` : ""}`,
    fee: (n, min, max, yMin, yMax) => `Czynsz administracyjny podany w ogłoszeniach (${n}): ${min === max ? min : `od ${min} do ${max}`} miesięcznie, czyli ${yMin === yMax ? yMin : `od ${yMin} do ${yMax}`} rocznie.`,
    drop: (title, pct, amount, med) => `Największa obniżka ceny: ${pct}% (${amount}), ${title}. Mediana obniżek na tej stronie: ${med}%.`,
    days: (med, title, v) => `Dni z ładną pogodą: mediana ${med} w roku. Najwięcej, ${v}: ${title}.`,
    elev: (n, med, title, v) => `Wysokość nad poziomem morza (znana dla ${n}): mediana ${num(med)} m. Najwyżej, ${num(v)} m: ${title}.`,
    islands: (l) => `Wyspy: ${list(l)}.`,
    dist: (c, med, title, km, far) => `Odległość w linii prostej (${c}): od ${km < 1 ? "mniej niż 1" : km} km (${title}) do ${far} km, mediana ${med} km.`,
    rank: (key, n, title, v, of) => (key === "cheapest" ? `Granica to dziś ${v}: ${title}, numer ${n} z ${of}.` : `Granica to dziś ${v}: ${title}, numer ${n} spośród ${of} ofert z podaną powierzchnią.`),
    vs: (other, med, n, oMed, on, pct) => `Dla porównania, ${other}: tutaj mediana to ${med} (${oferty(n)}), o ${pct}% mniej niż tam: ${oMed} (${oferty(on)}).`,
  },
  noteSource: "Źródło", noteAsOf: (asOf) => `Stan na: ${asOf}. Informacje ogólne, nie porada prawna ani podatkowa.`,
  season: { title: "Na ten sezon", winter: "Na zimę", summer: "Na lato" },
  allIn: (c, n) => `Wszystkie oferty ${c} (${n})`,
  sources: (l) => `Źródła ogłoszeń: ${l.map(([d, n]) => `${d} (${n})`).join(", ")}.`,
  notAgent: "RealHunt nie jest biurem nieruchomości i nie sprzedaje tych nieruchomości: każda oferta prowadzi do oryginalnego ogłoszenia i przed publikacją została sprawdzona przez człowieka.",
  alert: (c) => `Powiadomienia e-mail o nowych ofertach ${c}`,
  filter: "Filtruj i sortuj te oferty",
  method: "Jak powstaje ocena",
  moved: "Ta strona została przeniesiona.",
};
export { pack as pl };
