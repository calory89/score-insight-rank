// German wording of the listing pages (15-nov-2026), written in German, not translated string by string:
// seo/listings/pack.ts says what each entry is for. The reader is addressed with "Sie", amounts are written
// "50.000 €" and the generic word is "Immobilie", so a sentence agrees whatever the page lists.
import type { Pack, Facts, Form, Named } from "./pack";
import { areaBySlug, cityBySlug, NEAR_KM } from "./places";
import { titleIn, placeIn, grouped, NB, type PlaceWords } from "./packkit";

const num = (n: number) => grouped(n, ".");
const money = (n: number) => `${num(n)}${NB}€`;
const MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const SHORT = ["Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sept.", "Okt.", "Nov.", "Dez."];

// [name, "in ..."]
const COUNTRY: Record<string, [string, string]> = {
  Spain: ["Spanien", "in Spanien"], Italy: ["Italien", "in Italien"], "United States": ["USA", "in den USA"], Denmark: ["Dänemark", "in Dänemark"], France: ["Frankreich", "in Frankreich"],
  Sweden: ["Schweden", "in Schweden"], Japan: ["Japan", "in Japan"], Poland: ["Polen", "in Polen"], Germany: ["Deutschland", "in Deutschland"], Netherlands: ["Niederlande", "in den Niederlanden"],
  Greece: ["Griechenland", "in Griechenland"], Portugal: ["Portugal", "in Portugal"], Switzerland: ["Schweiz", "in der Schweiz"], Mexico: ["Mexiko", "in Mexiko"], Canada: ["Kanada", "in Kanada"],
  Bulgaria: ["Bulgarien", "in Bulgarien"], "Dominican Republic": ["Dominikanische Republik", "in der Dominikanischen Republik"], Cyprus: ["Zypern", "auf Zypern"], "United Kingdom": ["Großbritannien", "in Großbritannien"],
  Scandinavia: ["Skandinavien", "in Skandinavien"], Norway: ["Norwegen", "in Norwegen"],
};
const country = (c: string) => COUNTRY[c]?.[0] || c;
const inC = (c: string) => COUNTRY[c]?.[1] || `in ${c}`;
const IN_BY_NAME: Record<string, string> = Object.fromEntries(Object.values(COUNTRY));

export const PLACES: PlaceWords = {
  map: {
    Abruzzo: "Abruzzen", Apulia: "Apulien", Calabria: "Kalabrien", "Lake Como": "Comer See", Lazio: "Latium", Lombardy: "Lombardei", Marche: "Marken", Piedmont: "Piemont", Sardinia: "Sardinien", Sicily: "Sizilien", Tuscany: "Toskana", Umbria: "Umbrien",
    "Northern Ireland": "Nordirland", "County Down": "County Down", "County Fermanagh": "County Fermanagh", "County Leitrim": "County Leitrim", "County Durham": "County Durham", "Central Jutland": "Mitteljütland", "East Jutland": "Ostjütland", "North Jutland": "Nordjütland", "West Jutland": "Westjütland", "South Jutland": "Südjütland", Funen: "Fünen", "West Zealand": "Westseeland",
    "Black Sea": "Schwarzes Meer", "Allegheny Mountains": "Allegheny Mountains", "Lake Superior region": "Region am Oberen See", "North Carolina": "North Carolina", "South Carolina": "South Carolina", "West Virginia": "West Virginia",
    "Central Sweden": "Mittelschweden", "Northern Sweden": "Nordschweden", Crete: "Kreta", "North Evia": "Nord-Euböa", Evia: "Euböa", Rhodes: "Rhodos", Corfu: "Korfu", Sporades: "Sporaden", Halkidiki: "Chalkidiki", Messinia: "Messenien", Peloponnese: "Peloponnes",
    "Greater Poland": "Großpolen", "Kuyavia-Pomerania": "Kujawien-Pommern", "Lower Silesia": "Niederschlesien", Lubusz: "Lebus", Masovia: "Masowien", Podlaskie: "Podlachien", Pomerania: "Pommern", Silesia: "Schlesien", Subcarpathia: "Karpatenvorland",
    "Warmia-Masuria": "Ermland-Masuren", "West Pomerania": "Westpommern", "Świętokrzyskie": "Heiligkreuz", Newfoundland: "Neufundland", "New Brunswick": "New Brunswick", "Nova Scotia": "Nova Scotia", Valais: "Wallis", Tenerife: "Teneriffa",
    Saxony: "Sachsen", Thuringia: "Thüringen", "Saxony-Anhalt": "Sachsen-Anhalt", "Prince Edward Island": "Prince Edward Island", "Big Wolf Lake": "Big Wolf Lake", "Canadohta Lake": "Canadohta Lake", "French Island": "French Island", "East Palestine": "East Palestine",
  },
  near: (n, card) => (card ? `bei ${n}` : `Umgebung von ${n}`),
  central: (n) => `Zentrum von ${n}`,
  area: (n) => `Raum ${n}`,
};
const place = (n: string, _cc?: string, where?: "card") => placeIn(PLACES, n, where);
/** "in der Toskana", "auf Sizilien", "am Comer See", "im Raum Como": a German place name after its preposition. */
const IN_R: Record<string, string> = { Toskana: "in der Toskana", Lombardei: "in der Lombardei", Piemont: "im Piemont", Abruzzen: "in den Abruzzen", Marken: "in den Marken", "Comer See": "am Comer See", Wallis: "im Wallis", Pelion: "auf dem Pelion", Peloponnes: "auf dem Peloponnes" };
const ISLANDS = new Set(["Sardinien", "Sizilien", "Kreta", "Rhodos", "Lesbos", "Samos", "Fünen", "Falster", "Lolland", "Mors", "Teneriffa", "Gran Canaria", "Fuerteventura", "La Palma", "Nord-Euböa", "Euböa", "Neufundland", "Korfu", "Mallorca", "Menorca", "Ibiza", "Lanzarote", "Chalkidiki", "Skopelos (Sporaden)"]);
const inR = (n: string) => IN_BY_NAME[n] || IN_R[n] || (ISLANDS.has(n) ? `auf ${n}` : /^Umgebung /.test(n) ? `in der ${n}` : /^(Zentrum|Raum) /.test(n) ? `im ${n}` : /^bei /.test(n) ? n : `in ${n}`);

// [label, "an der ..."]
const AREA: Record<string, [string, string]> = {
  "costa-del-sol": ["Costa del Sol", "an der Costa del Sol"], "costa-blanca": ["Costa Blanca", "an der Costa Blanca"], "costa-calida": ["Costa Cálida", "an der Costa Cálida"], "costa-de-almeria": ["Costa de Almería", "an der Costa de Almería"],
  "canary-islands": ["Kanarische Inseln", "auf den Kanarischen Inseln"], "balearic-islands": ["Balearen", "auf den Balearen"], "green-spain": ["Grünes Spanien", "im Grünen Spanien"], algarve: ["Algarve", "an der Algarve"],
  "southern-italy": ["Süditalien", "in Süditalien"], "abruzzo-and-marche": ["Abruzzen und Marken", "in den Abruzzen und den Marken"], lunigiana: ["Lunigiana", "in der Lunigiana"], "lake-maggiore": ["Lago Maggiore", "am Lago Maggiore"], "lake-garda": ["Gardasee", "am Gardasee"],
  limousin: ["Limousin", "im Limousin"], hokkaido: ["Hokkaido", "auf Hokkaido"], tohoku: ["Tohoku", "in Tohoku"], kanto: ["Kanto", "in Kanto"], chubu: ["Chubu", "in Chubu"], kansai: ["Kansai", "in Kansai"], chugoku: ["Chugoku", "in Chugoku"],
  shikoku: ["Shikoku", "auf Shikoku"], kyushu: ["Kyushu", "auf Kyushu"], norrland: ["Norrland", "in Norrland"], jutland: ["Jütland", "in Jütland"], "lolland-falster": ["Lolland und Falster", "auf Lolland und Falster"],
  "andalusia": ["Andalusien", "in Andalusien"],
  "valencian-community": ["Valencianische Gemeinschaft", "in der Valencianischen Gemeinschaft"],
  "catalonia": ["Katalonien", "in Katalonien"],
  "galicia": ["Galicien", "in Galicien"],
  "castile-and-leon": ["Kastilien und León", "in Kastilien und León"],
  "aragon": ["Aragonien", "in Aragonien"],
  "castilla-la-mancha": ["Kastilien-La Mancha", "in Kastilien-La Mancha"],
  "basque-country": ["Baskenland", "im Baskenland"],
  "boca-raton": ["Boca Raton", "in Boca Raton"],
  "hollywood": ["Hollywood (Florida)", "in Hollywood (Florida)"],
  "doral": ["Doral", "in Doral"],
  "amsterdam-zuidoost": ["Amsterdam-Zuidoost", "in Amsterdam-Zuidoost"], "eastern-germany": ["Sachsen, Sachsen-Anhalt und Thüringen", "in Sachsen, Sachsen-Anhalt und Thüringen"], masuria: ["Masuren", "in Masuren"],
  peloponnese: ["Peloponnes", "auf dem Peloponnes"], "black-sea-coast": ["Schwarzmeerküste", "an der Schwarzmeerküste"], "atlantic-canada": ["Atlantisches Kanada", "in den atlantischen Provinzen Kanadas"],
};
const areaL = (f: { area?: string }) => AREA[f.area || ""]?.[0] || String(f.area || "");
const areaIn = (f: { area?: string }) => AREA[f.area || ""]?.[1] || `in ${f.area}`;
for (const [l, i] of Object.values(AREA)) IN_R[l] = i;
const CITY: Record<string, string> = { seville: "Sevilla", milan: "Mailand", rome: "Rom", florence: "Florenz", naples: "Neapel", copenhagen: "Kopenhagen", gothenburg: "Göteborg", lisbon: "Lissabon", athens: "Athen", warsaw: "Warschau", geneva: "Genf", zurich: "Zürich", tokyo: "Tokio" };
const city = (slug: string) => CITY[slug] || cityBySlug(slug)?.[1] || slug;

const s = (n: number, one: string, many: string) => (n === 1 ? one : many);
const list = (l: Named[]) => l.map((x) => `${x.name} (${x.n})`).join(", ");
const upper = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
const pc = (x: string) => x.replace(/(\d)\.(\d)/g, "$1,$2").replace(/\s*[-–]\s*/g, " bis ");
const dot = (x: string) => (x ? (/[.!?]$/.test(x.trim()) ? `: ${x.trim()}` : `: ${x.trim()}.`) : ".");
const range = (lo: string, hi: string) => (lo === hi ? `rund ${lo}` : `${lo} bis ${hi}`);
const bedsW = (n: number) => (n === 4 ? "4 oder mehr Schlafzimmern" : `${n} ${s(n, "Schlafzimmer", "Schlafzimmern")}`);

// [plural, singular, "cheap" plural, "cheapest" singular (after the article)]
const NOUN = {
  house: ["Häuser", "Haus", "günstige Häuser", "günstigste Haus"],
  apartment: ["Wohnungen", "Wohnung", "günstige Wohnungen", "günstigste Wohnung"],
  mixed: ["Immobilien", "Immobilie", "günstige Immobilien", "günstigste Immobilie"],
} as const;
const FORM = { many: 0, one: 1, cheap: 2, cheapest: 3 } as const;
/** der, die or das: read from the first noun of the phrase. */
const art = (x: string) => (/^(\S+ ){0,3}(Wohnung|Immobilie)\b/.test(x) ? "die" : /^(\S+ ){0,3}Trullo\b/.test(x) ? "der" : "das");
const ein = (x: string) => (art(x) === "die" ? "eine" : "ein");
const fixed = (forms: [string, string, string, string]) => (_b: string, f: Form) => forms[FORM[f]];
/** An adjective in front of the noun: "bezugsfertige Häuser", "bezugsfertiges Haus", "günstigste bezugsfertige Haus". */
const adj = (stem: string) => (b: string, f: Form) => (f === "one" ? `${stem}${art(b) === "das" ? "es" : "e"} ${b}` : f === "many" ? `${stem}e ${b}` : b.replace(/^(günstigste|günstige) /, `$1 ${stem}e `));
const KEYED: Record<string, (b: string, form: Form) => string> = {
  "by-the-sea": (b) => `${b} am Meer`,
  "village-houses": fixed(["Dorfhäuser", "Dorfhaus", "günstige Dorfhäuser", "günstigste Dorfhaus"]),
  "in-town": (b) => `${b} in der Stadt`,
  "near-a-lake": (b) => `${b} am See`,
  "with-garden": (b) => `${b} mit Garten`,
  "with-pool": (b) => `${b} mit Pool`,
  "with-sauna": (b) => `${b} mit Sauna`,
  "stone-houses": fixed(["Steinhäuser", "Steinhaus", "günstige Steinhäuser", "günstigste Steinhaus"]),
  "cabins-and-cottages": fixed(["Ferienhäuser und Hütten", "Ferienhaus", "günstige Ferienhäuser und Hütten", "günstigste Ferienhaus"]),
  "with-a-terrace": (b) => `${b} mit Terrasse oder Balkon`,
  turnkey: adj("bezugsfertig"),
  "to-renovate": (b) => `${b} zum Renovieren`,
  "with-sea-view": (b) => `${b} mit Meerblick`,
  "near-the-beach": (b) => `${b} höchstens 500 m vom Meer`,
  "with-land": (b) => `${b} mit 1.000 m² Grundstück oder mehr`,
  "with-fireplace": (b) => `${b} mit Kamin`,
  "with-garage": (b) => `${b} mit Garage`,
  "on-an-island": (b) => `${b} auf einer Insel`,
  "in-the-mountains": (b) => `${b} in den Bergen`,
  "with-olive-trees-or-vines": (b) => `${b} mit Olivenbäumen, Reben oder Obstbäumen`,
  "near-an-airport": (b) => `${b} höchstens 30 km von einem Flughafen`,
  "under-500-per-sqm": (b) => `${b} unter 500${NB}€/m²`,
  "over-100-sqm-under-50000": (b) => `${b} mit über 100 m² unter 50.000${NB}€`,
  "score-90-plus": (b) => `${b} mit Note 90 oder mehr`,
  "editors-picks": (b) => `${b} aus der Auswahl der Redaktion`,
  "new-this-month": adj("neu hinzugekommen"),
  "price-drops": (b) => `${b} mit Preissenkung`,
  "single-storey": (b) => `${b} auf einer Ebene`,
  "with-period-features": (b) => `${b} mit historischen Elementen`,
  "good-weather": (b) => `${b} mit 150 oder mehr Schönwettertagen im Jahr`,
  "quiet-location": (b) => `${b} abseits von Autobahn und Bahnstrecke`,
  "low-community-fee": (b) => `${b} mit niedrigem Hausgeld`,
  "cave-houses": fixed(["Höhlenhäuser", "Höhlenhaus", "günstige Höhlenhäuser", "günstigste Höhlenhaus"]),
  trulli: fixed(["Trulli", "Trullo", "günstige Trulli", "günstigste Trullo"]),
  "unusual-buildings": fixed(["Schlösser, Mühlen, Kirchen und andere besondere Gebäude", "besonderes Gebäude", "günstige Schlösser, Mühlen, Kirchen und andere besondere Gebäude", "günstigste besondere Gebäude"]),
  "with-business-premises": (b) => `${b} mit Gewerberäumen`,
  "with-fibre-internet": (b) => `${b} mit Glasfaseranschluss`,
  "with-tourist-licence": (b) => `${b} mit Lizenz zur Ferienvermietung`,
  "new-this-week": adj("in den letzten 7 Tagen hinzugekommen"),
  "over-80-sqm": (b) => `${b} mit über 80 m²`,
  "over-120-sqm": (b) => `${b} mit über 120 m²`,
};
const ccy = (n: number, c: string) => `${num(n)} ${c === "GBP" ? "Pfund" : c === "USD" ? "US-Dollar" : "Euro"}`;
const cityOf = (f: { city?: string }) => city(f.city || "");
const AMEN: Record<string, string> = { garden: "Garten", terrace: "Terrasse", garage: "Garage", pool: "Pool", fireplace: "Kamin", sauna: "Sauna" };
const LABEL: Record<string, string> = { "by-the-sea": "Am Meer", "village-houses": "Dorfhäuser", "in-town": "In der Stadt", "near-a-lake": "Am See", "with-garden": "Mit Garten", "with-pool": "Mit Pool", "with-sauna": "Mit Sauna", "stone-houses": "Steinhäuser", "cabins-and-cottages": "Ferienhäuser und Hütten", "with-a-terrace": "Mit Terrasse", apartments: "Wohnungen", houses: "Häuser",
  turnkey: "Bezugsfertig", "to-renovate": "Zum Renovieren", "with-sea-view": "Meerblick", "near-the-beach": "500 m zum Meer", "with-land": "Mit Grundstück", "with-fireplace": "Mit Kamin", "with-garage": "Mit Garage",
  "on-an-island": "Auf einer Insel", "in-the-mountains": "In den Bergen", "with-olive-trees-or-vines": "Oliven oder Reben", "near-an-airport": "Nahe einem Flughafen", "under-500-per-sqm": `Unter 500${NB}€/m²`, "over-100-sqm-under-50000": `Über 100 m² unter 50.000${NB}€`,
  "score-90-plus": "Note 90 oder mehr", "editors-picks": "Auswahl der Redaktion", "new-this-month": "Neu in diesem Monat", "price-drops": "Preis gesenkt", "single-storey": "Auf einer Ebene", "with-period-features": "Historische Elemente", "good-weather": "Gutes Wetter",
  "quiet-location": "Ruhige Lage", "low-community-fee": "Niedriges Hausgeld", "cave-houses": "Höhlenhäuser", trulli: "Trulli", "unusual-buildings": "Besondere Gebäude", "with-business-premises": "Mit Gewerberäumen", "with-fibre-internet": "Glasfaser", "best-rated": "Top 10 nach Note", "new-this-week": "Neu in dieser Woche", "over-80-sqm": "Über 80 m²", "over-120-sqm": "Über 120 m²", "with-tourist-licence": "Ferienvermietung erlaubt",
  cheapest: "Die günstigsten", "most-space-for-the-money": "Am meisten Fläche fürs Geld" };

function what(F: Facts, form: Form = "many"): string {
  const f = F.f;
  const b = NOUN[f.kind === "ptype" ? (f.key === "apartments" ? "apartment" : "house") : F.noun][FORM[form]];
  const where = f.country ? ` ${inC(f.country)}` : "";
  const under = f.cap ? ` unter ${f.kind === "ccyBand" ? ccy(f.cap, f.ccy!) : money(f.cap)}` : "";
  const sale = " zum Kauf";
  if (f.ranked) {
    const pl = NOUN[F.noun][0], sg = NOUN[F.noun][1];
    const single = form === "one" || form === "cheapest";
    if (f.key === "cheapest") return single ? `${NOUN[F.noun][3]}${sale}${where}` : `${F.n} günstigsten ${pl}${sale}${where}`;
    return single ? `${sg} mit der meisten Fläche fürs Geld${sale}${where}` : `${F.n} ${pl} mit der meisten Fläche fürs Geld${sale}${where}`;
  }
  const keyed = (k: string) => KEYED[k](b, form);
  switch (f.kind) {
    case "combo": return f.key === "apartments" || f.key === "houses" ? `${NOUN[f.key === "apartments" ? "apartment" : "house"][FORM[form]]}${sale}${where}${under}` : `${keyed(f.key!)}${sale}${where}${under}`;
    case "area": return `${b}${sale} ${areaIn(f)}`;
    case "near": return `${b}${sale} im Umkreis von ${NEAR_KM} km um ${cityOf(f)}`;
    case "region": return `${b}${sale} ${inR(place(f.region!) || f.region!)} (${country(f.country!)})`;
    case "town": return `${b}${sale} in ${f.town} (${place(f.region!) || f.region})`;
    case "regionBand": return f.area ? `${b}${sale} ${areaIn(f)}${under}` : `${b}${sale} ${inR(place(f.region!) || f.region!)} (${country(f.country!)})${under}`;
    case "setting": case "feature": case "gfeature": return `${keyed(f.key!)}${sale}${where}`;
    case "beds": return `${b} mit ${bedsW(f.beds!)}${sale}${where}`;
    default: return `${b}${sale}${where}${under}`;
  }
}

const HOW: Record<string, string> = {
  turnkey: "Auf dieser Liste: Immobilien, deren Anzeige ausdrücklich sagt, dass sie bezugsfertig oder vollständig renoviert sind. Wir haben sie nicht besichtigt: Lassen Sie sich das Datum der Arbeiten und die Rechnungen zeigen.",
  "to-renovate": "Auf dieser Liste: Immobilien, deren Anzeige sagt, dass sie renoviert werden müssen oder als Projekt verkauft werden. Die Kosten der Arbeiten nennen Anzeigen fast nie: Holen Sie vor einem Angebot einen schriftlichen Kostenvoranschlag eines Handwerkers vor Ort ein.",
  "with-sea-view": "Auf dieser Liste: Immobilien, deren Anzeigentext einen Meerblick nennt. Manchmal ist das nur ein Streifen Meer zwischen Dächern: Sehen Sie sich Fotos und Karte an.",
  "near-the-beach": "Auf dieser Liste: Immobilien, deren gemessene Entfernung zum Ufer höchstens 500 m Luftlinie beträgt. Zu Fuß kann es weiter sein.",
  "with-land": "Auf dieser Liste: Immobilien, deren Anzeige ein Grundstück von 1.000 m² oder mehr nennt, in m², Hektar oder Acres. Prüfen Sie die Zahl vor dem Kauf im Grundbuch oder Kataster.",
  "with-fireplace": "Auf dieser Liste: Immobilien, deren Anzeige einen Kamin zeigt oder nennt. Fragen Sie, ob der Schornstein gereinigt und geprüft ist.",
  "with-garage": "Auf dieser Liste: Immobilien, deren Anzeige eine Garage nennt.",
  "on-an-island": "Auf dieser Liste: Immobilien auf Inseln, nach denen man mit Namen sucht, von Teneriffa und Sizilien bis Kreta und Fünen. Inseln von der Größe eines Landes zählen nicht dazu.",
  "in-the-mountains": "Auf dieser Liste: Immobilien, die laut Anzeige in den Bergen liegen, Bergblick haben oder nahe an einem Skigebiet sind.",
  "with-olive-trees-or-vines": "Auf dieser Liste: Immobilien, deren Anzeige Olivenbäume, Reben, einen Obstgarten oder Obstbäume nennt.",
  "near-an-airport": "Auf dieser Liste: Immobilien, deren nächster Flughafen höchstens 30 km Luftlinie entfernt ist. Auf der Straße ist es weiter.",
  "under-500-per-sqm": `Auf dieser Liste: Immobilien, deren Angebotspreis geteilt durch die Wohnfläche der Anzeige weniger als 500${NB}€ pro m² ergibt. Eine Anzeige ohne Flächenangabe kann nicht darauf stehen.`,
  "over-100-sqm-under-50000": `Auf dieser Liste: Immobilien mit 100 m² oder mehr und einem Angebotspreis von höchstens 50.000${NB}€.`,
  "score-90-plus": "Auf dieser Liste: Immobilien mit einer RealHunt-Note von 90 oder mehr von 98. Die Note vergleicht Preis, Fläche, Zustand, Lage und Kaufnebenkosten mit allen anderen Immobilien der Website.",
  "editors-picks": "Auf dieser Liste: Immobilien, die jemand aus dem RealHunt-Team nach Prüfung der Anzeige hervorgehoben hat. Niemand bezahlt dafür, hier zu stehen.",
  "new-this-month": "Auf dieser Liste: Immobilien, die in den letzten 30 Tagen zu RealHunt hinzugekommen sind.",
  "price-drops": "Auf dieser Liste: Immobilien, deren Angebotspreis gesunken ist, seit wir sie veröffentlicht haben. Die Senkung ist die Differenz zwischen dem ersten Preis, den wir gesehen haben, und dem heutigen.",
  "single-storey": "Auf dieser Liste: Immobilien, die laut Anzeige auf einer Ebene liegen, ohne Treppen zwischen den Räumen.",
  "with-period-features": "Auf dieser Liste: Immobilien, deren Anzeige ihr Alter oder historische Elemente nennt: das Jahrhundert, originale Balken oder Böden, Gewölbedecken, Fachwerk oder Denkmalschutz. Das Baujahr kennen wir nicht bei allen Immobilien.",
  "good-weather": "Auf dieser Liste: Immobilien an Orten mit 150 oder mehr Schönwettertagen im Jahr nach den Klimamittelwerten: Höchsttemperatur von 18 bis 33 °C, kein Regen und wenig Wind.",
  "quiet-location": "Auf dieser Liste: Immobilien, bei denen OpenStreetMap keine Autobahn und keine Bahnstrecke in der Nähe zeigt und unsere Prüfung von Straßen, Bahn und Flughäfen wenig Lärm ergibt. Das ist eine Prüfung auf der Karte, keine Schallmessung.",
  "low-community-fee": "Auf dieser Liste: Immobilien, deren Anzeige ein monatliches Hausgeld von höchstens 250 in ihrer Währung nennt (Euro, Dollar oder Pfund). Die meisten Anzeigen nennen das Hausgeld nicht und können daher nicht darauf stehen.",
  "cave-houses": "Auf dieser Liste: Immobilien, die die Anzeige als Höhlenhaus beschreibt.",
  trulli: "Auf dieser Liste: Immobilien, die die Anzeige als Trullo beschreibt.",
  "unusual-buildings": "Auf dieser Liste: Immobilien, deren Titel ein Schloss, ein Herrenhaus, eine Mühle, ein Turmhaus oder eine ehemalige Kirche, Schule oder einen ehemaligen Bahnhof nennt.",
  "with-business-premises": "Auf dieser Liste: Immobilien, deren Titel einen Laden, eine Bar, ein Restaurant, eine Unterkunft oder andere Gewerberäume nennt, die mitverkauft werden. Ob der Betrieb wieder öffnen darf, hängt von den Genehmigungen der Gemeinde ab: Fragen Sie im Rathaus nach.",
  "with-fibre-internet": "Auf dieser Liste: Immobilien, deren Anzeige Glasfaser oder schnelles Internet nennt. Wir testen die Anschlüsse nicht: Bitten Sie den Verkäufer um einen aktuellen Geschwindigkeitstest.",
  "with-tourist-licence": "Auf dieser Liste: Immobilien, deren Anzeige eine Lizenz zur Ferienvermietung nennt. Die Lizenz kann mit dem Verkauf erlöschen: Fragen Sie im Rathaus nach, bevor Sie damit rechnen.",
  "new-this-week": "Auf dieser Liste: Immobilien, die in den letzten 7 Tagen zu RealHunt hinzugekommen sind. Die Liste wird jeden Tag neu erstellt.",
  "over-80-sqm": "Auf dieser Liste: Immobilien, deren Anzeige mehr als 80 m² Wohnfläche nennt. Eine Anzeige ohne Flächenangabe kann nicht darauf stehen.",
  "over-120-sqm": "Auf dieser Liste: Immobilien, deren Anzeige mehr als 120 m² Wohnfläche nennt. Eine Anzeige ohne Flächenangabe kann nicht darauf stehen.",
};

export const de: Pack = {
  lang: "de",
  money,
  perSqm: (n) => `${num(n)}${NB}€/m²`,
  date: (d) => `${Number(d.slice(8, 10))}. ${MONTHS[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`,
  dateShort: (d) => `${Number(d.slice(8, 10))}. ${SHORT[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`,
  country,
  inC,
  place,
  homeTitle: (h) => titleIn("de", h),
  homeWhy: () => "",
  what,
  h1: (F) => (F.f.ranked ? `Die ${what(F)}${F.f.country ? "" : " bei RealHunt"}`
    : upper(what(F, (F.f.cap && F.f.cap <= 100000) || (["gfeature", "feature", "area", "near"].includes(F.f.kind) && F.median <= 100000) ? "cheap" : "many"))),
  title: (h1, n, min) => `${h1} (${n}, ab ${min})`,
  desc: (F, w) => `${F.f.ranked ? `Die ${w}` : `${F.n} ${w}`}, von ${money(F.min)} bis ${money(F.max)}. Medianpreis: ${money(F.median)}. Fotos, Größen, Noten, Kaufnebenkosten und worauf Sie achten sollten.`,
  crumbRoot: "RealHunt", crumbCheap: "Günstige Häuser",
  crumbCountry: (c) => `Häuser ${IN_BY_NAME[c] || `in ${c}`}`,
  label: (f) => (f.kind === "combo" ? `${LABEL[f.key!] || f.key}, unter ${money(f.cap!)}` : f.kind === "ccyBand" ? `Unter ${ccy(f.cap!, f.ccy!)}` : f.kind === "area" ? areaL(f) : f.kind === "near" ? `Nahe ${cityOf(f)}`
    : f.cap ? `Unter ${money(f.cap)}` : f.kind === "region" ? place(String(f.region)) || String(f.region) : f.kind === "town" ? String(f.town) : f.kind === "beds" ? (f.beds === 4 ? "4 oder mehr Schlafzimmer" : `${f.beds} Schlafzimmer`) : f.kind === "country" ? country(String(f.country)) : LABEL[f.key!] || String(f.key)),
  updated: (d, newest) => `Aktualisiert am ${d}.${newest ? ` Letzte Immobilie hinzugefügt am ${newest}.` : ""}`,
  l1: (n, w, min, max) => (min === max ? `RealHunt hat heute ${n} ${w}, alle zum selben Preis: ${min}.` : `RealHunt hat heute ${n} ${w}, zu Preisen von ${min} bis ${max}.`),
  l2: (title, town, price, sqm, beds) => `Das günstigste Angebot kostet ${price}: ${title} ${inR(town)}${sqm || beds ? ` (${[sqm ? `${sqm} m²` : "", beds ? `${beds} Schlafzimmer` : ""].filter(Boolean).join(", ")})` : ""}.`,
  l3: (med, pp, pMed, pPp, parent) => `Der Medianpreis liegt bei ${med}${pp ? ` (${pp})` : ""}, gegenüber ${pMed}${pPp ? ` (${pPp})` : ""} bei ${parent}.`,
  l3all: (med, pp, max, parent) => `Der Medianpreis liegt bei ${med}${pp ? ` (${pp})` : ""}. Auf dieser Seite stehen alle: Unter ${parent}, kostet keine mehr als ${max}.`,
  parent: (kind, n, name, countries) => (kind === "site" ? `den ${n} Immobilien, die RealHunt in ${countries} Ländern führt` : kind === "country" ? `den ${n} Immobilien, die wir ${name} führen` : `den ${n} Immobilien, die wir ${inR(name)} führen`),
  kpi: { homes: "Immobilien", from: "Ab", median: "Medianpreis", ppsqm: "Median pro m²", size: "Mittlere Größe", score: "Beste Note" },
  n20: { costs: "Kaufnebenkosten", foreign: "Käufer aus dem Ausland", free: "Freier Kauf", limits: "Mit Auflagen", asOf: "Stand", regionsTitle: (inC) => `Medianpreis nach Region ${inC}`, region: "Region", neighbours: "Nachbarländer", siteMap: () => "" },
  gridTitle: (n, shown) => (n === shown ? `Alle ${n} Immobilien, beste Note zuerst` : `Die ${shown} besten von ${n}, nach Note`),
  gridMore: (shown, n) => `Zu sehen sind die ${shown} mit der besten Note von ${n} Immobilien. Die übrigen stehen in der Tabelle und in den genaueren Suchen weiter unten.`,
  card: { isNew: "Neu", drop: (p) => `${p}${NB}% reduziert`, score: "Note", beds: (n) => `${n} Schlafz.`, noPhoto: "Fotos in der Anzeige" },
  tableTitle: (n, shown) => (n === shown ? `Alle ${n} Immobilien im Vergleich, günstigste zuerst` : `Die ${shown} günstigsten von ${n} im Vergleich`),
  th: { home: "Immobilie", place: "Ort", price: "Preis", size: "Größe", ppsqm: "Pro m²", beds: "Schlafz.", score: "Note", added: "Hinzugefügt" },
  factsTitle: (F) => (F.f.kind === "ccyBand" ? `Was man für ${ccy(F.f.cap!, F.f.ccy!)}${F.f.country ? ` ${inC(F.f.country)}` : ""} bekommt` : F.f.cap && F.f.kind !== "combo" ? `Was man für ${money(F.f.cap)}${F.f.area ? ` ${areaIn(F.f)}` : F.f.region ? ` ${inR(place(F.f.region) || F.f.region)}` : F.f.country ? ` ${inC(F.f.country)}` : ""} bekommt` : `Die ${F.n} Immobilien in Zahlen`),
  fSize: (med, max, title) => `Größe: Die Hälfte hat ${med} m² oder mehr. Die größte hat ${max} m²: ${title}.`,
  fBeds: (b, unknown) => `Schlafzimmer: ${b.map(([k, n], i) => `${n} mit ${k === 4 ? "4 oder mehr" : k}${i === 0 ? ` ${k === 1 ? "Schlafzimmer" : "Schlafzimmern"}` : ""}`).join(", ")}${unknown ? `; bei ${unknown} ${s(unknown, "Anzeige", "Anzeigen")} fehlt die Angabe` : ""}.`,
  fType: (a, h) => `Art: ${[a ? `${a} ${s(a, "Wohnung", "Wohnungen")}` : "", h ? `${h} ${s(h, "Haus", "Häuser")}` : ""].filter(Boolean).join(" und ")}.`,
  fSetting: (sea, v, t) => `Lage: ${[sea ? `${sea} am Meer` : "", v ? `${v} in Dörfern` : "", t ? `${t} in der Stadt` : ""].filter(Boolean).join(", ")}.`,
  fWhere: (l) => `Wo: ${list(l)}.`,
  fTowns: (l) => `Orte: ${list(l)}.`,
  fCountries: (l, more) => `Länder: ${list(l)}${more ? ` und ${more} weitere` : ""}.`,
  fStep: (from, to, n, title, nota, price) => `Zwischen ${from} und ${to}: ${n} ${s(n, "Immobilie", "Immobilien")}. Die mit der besten Note darunter (Note ${nota}, ${price}): ${title}.`,
  fNext: (next, add) => `Mit einem Budget von ${next} ${s(add, "kommt", "kommen")} ${add} weitere ${s(add, "Immobilie", "Immobilien")} hinzu.`,
  fRegions: (low, high) => `Niedrigster Medianpreis: ${low.name}, ${low.median} bei ${low.n} Immobilien. Höchster: ${high.name}, ${high.median} bei ${high.n}.`,
  fScore: (min, max, title) => (min === max ? `Noten: Alle haben ${max} von 98. Die erste der Liste: ${title}.` : `Noten: von ${min} bis ${max} von 98. Die beste Note hat: ${title}.`),
  fNew: (n30, title, date) => `Zuletzt hinzugefügt, am ${date}: ${title}.${n30 ? ` ${n30} dieser Immobilien ${s(n30, "kam", "kamen")} in den letzten 30 Tagen hinzu.` : ""}`,
  costsTitle: (c) => `Kaufnebenkosten und Regeln für Ausländer ${c}`,
  cForeign: (t) => `Dürfen Ausländer kaufen? ${t}`,
  cCosts: (pct, br, med, lo, hi, tLo, tHi) => `Steuern und Gebühren kommen mit rund ${pc(pct)}${NB}% zum Kaufpreis hinzu${dot(br)} Bei der Median-Immobilie dieser Seite (${med}) sind das ${range(lo, hi)}, insgesamt also ${range(tLo, tHi)}.`,
  cAllIn: (cap, maxAsk, fit, n) => `Damit der gesamte Kauf in ${cap} passt, sollte der Angebotspreis bei höchstens rund ${maxAsk} liegen: ${fit === n ? `Das trifft auf alle ${n} Immobilien dieser Seite zu` : fit ? `Das trifft auf ${fit} dieser ${n} Immobilien zu` : `Das trifft auf keine dieser ${n} Immobilien zu`}.`,
  cTax: (t) => `Jährliche Grundsteuer: ${t}`,
  cExamples: (rows) => `Mit denselben Prozentsätzen: ${rows.map(([p, lo, hi]) => `bei ${p} sind es ${range(lo, hi)}`).join("; ")}.`,
  firstTitle: "Dürfen Sie hier kaufen? Lesen Sie das zuerst",
  cNote: (asOf) => `Allgemeine Information, keine Steuer- oder Rechtsberatung.${asOf ? ` Stand der Daten: ${asOf}.` : ""}`,
  cLinks: { calc: (c) => `Kaufnebenkostenrechner für Immobilien ${c}`, detail: "Alle Kosten und Steuern", guide: "So läuft der Kauf ab, Schritt für Schritt", nat: "Regeln nach Staatsangehörigkeit" },
  costTableTitle: "Kaufnebenkosten in den Ländern dieser Seite", costTh: { country: "Land", homes: "Immobilien hier", from: "Ab", costs: "Steuern und Gebühren" },
  watchTitle: "Worauf Sie vor dem Kauf achten sollten",
  wNoSqm: (k, n) => `${k} der ${n} Anzeigen ${s(k, "nennt", "nennen")} keine Wohnfläche; ihr Preis pro m² lässt sich daher nicht vergleichen.`,
  wHoa: (k, min, max) => `${k} ${s(k, "Anzeige nennt", "Anzeigen nennen")} das monatliche Hausgeld: ${min === max ? min : `${min} bis ${max}`}. Rechnen Sie es zu Ihren jährlichen Kosten.`,
  wHoaUnknown: (k) => `${k} ${s(k, "liegt", "liegen")} in einem Gebäude oder einer Anlage mit Gemeinschaftskosten, aber die Anzeige nennt den Betrag nicht: Lassen Sie ihn sich schriftlich geben.`,
  wWhyCheap: (title, t) => (t ? `Ein niedriger Preis hat einen Grund. ${title}: ${t}` : `Ein niedriger Preis hat immer einen Grund: Bei ${title} steht er auf der Detailseite.`),
  wFlood: (k, n) => `${k} von ${n} ${s(k, "liegt", "liegen")} dort, wo unsere grobe Hochwasserprüfung ein mittleres oder hohes Risiko ergibt. Die Detailseite jeder Immobilie verlinkt die amtliche Karte.`,
  wNoise: (k, n) => `${k} von ${n} ${s(k, "liegt", "liegen")} nahe an einer Autobahn, einer Bahnstrecke oder einem Flughafen (hoher Lärm in unserer Prüfung).`,
  wOld: (k, n) => `${k} von ${n} ${s(k, "wurde", "wurden")} vor mehr als 60 Tagen hinzugefügt. Fragen Sie beim Makler nach, ob ${s(k, "sie noch zu haben ist", "sie noch zu haben sind")}, bevor Sie eine Reise planen.`,
  wSold: (k) => `${k} ${s(k, "wurde von einem Besucher als möglicherweise verkauft gemeldet und wird geprüft", "wurden von Besuchern als möglicherweise verkauft gemeldet und werden geprüft")}.`,
  wApprox: (k, n) => `${k} von ${n} ${s(k, "zeigt", "zeigen")} auf der Karte nur eine ungefähre Lage: Die Anzeige nennt den Ort, nicht die Straße.`,
  wDims: (weak, wa, strong, sa) => `Schwächste Teilnote dieser Immobilien im Schnitt: ${weak} (${wa}/100). Stärkste: ${strong} (${sa}/100).`,
  wRental: (t) => `Sie möchten vermieten? ${t}`,
  dim: (k) => ({ price: "Preis", value: "Preis pro m²", space: "Fläche", condition: "bezugsfertiger Zustand", extras: "Ausstattung", water: "Nähe zu Meer oder See", weather: "Tage mit gutem Wetter", access: "Nähe zum Flughafen", costs: "Kaufnebenkosten" } as Record<string, string>)[k] || k,
  faqTitle: "Fragen von Käufern",
  qCheapest: (x) => `Welches ist ${art(x)} ${x}?`,
  aCheapest: (title, town, price, sqm, beds, nota) => `${title} ${inR(town)}, angeboten für ${price}${sqm ? `, mit ${sqm} m²` : ""}${beds ? `${sqm ? " und" : ", mit"} ${bedsW(beds)}` : ""}.${nota ? ` Die RealHunt-Note ist ${nota}.` : ""}`,
  qCount: (w) => `Wie viele ${w} gibt es?`,
  aCount: (n, date, parent, n30) => `${n}, Stand ${date}${parent ? `, von ${parent}` : ""}.${n30 ? ` ${n30} ${s(n30, "kam", "kamen")} in den letzten 30 Tagen hinzu.` : ""}`,
  qSize: (w) => `Wie groß sind die ${w}?`,
  aSize: (med, beds, max, town) => `Der Median liegt bei ${med} m²${beds ? `, am häufigsten sind ${beds === 4 ? "4 oder mehr" : beds} Schlafzimmer` : ""}. Die größte hat ${max} m² und liegt ${inR(town)}.`,
  qAllIn: (cap, c) => `Reichen ${cap}, um ${c} eine Immobilie samt Steuern und Gebühren zu kaufen?`,
  aAllIn: (cap, pct, lo, hi, maxAsk, fit) => `Nicht bei einem Angebotspreis von ${cap}: Mit rund ${pc(pct)}${NB}% Steuern und Gebühren kostet der Kauf insgesamt ${range(lo, hi)}. Um insgesamt unter ${cap} zu bleiben, sollte der Angebotspreis bei höchstens rund ${maxAsk} liegen; ${fit ? `das trifft auf ${fit} ${s(fit, "Immobilie", "Immobilien")} dieser Seite zu` : "das trifft auf keine Immobilie dieser Seite zu"}.`,
  qWhere: (w) => `Wo liegen die ${w}?`,
  aWhere: (l) => `Vor allem hier: ${list(l)}.`,
  qPrice: (one) => `Was kostet ${ein(one)} ${one}?`,
  aPrice: (min, med, pp, max, n) => `Die Angebotspreise reichen bei ${n} Immobilien von ${min} bis ${max}. Der Median liegt bei ${med}${pp ? ` (${pp})` : ""}.`,
  qForeign: (c) => `Dürfen Ausländer ${c} ein Haus kaufen?`,
  qCosts: (c) => `Wie hoch sind die Kaufnebenkosten ${c}?`,
  aCosts: (pct, br, med, lo, hi) => `Rund ${pc(pct)}${NB}% zusätzlich zum Kaufpreis${dot(br)} Bei der Median-Immobilie dieser Seite (${med}) sind das ${range(lo, hi)}. Allgemeine Information, keine Steuerberatung.`,
  qRegion: (c) => `Welche Region ist ${c} am günstigsten?`,
  aRegion: (low, high) => `Unter den Regionen mit mindestens 3 Immobilien bei RealHunt hat ${low.name} den niedrigsten Medianpreis, ${low.median} bei ${low.n} Immobilien, und ${high.name} den höchsten, ${high.median}.`,
  qVs: (p, wider) => `Sind Immobilien ${inR(p)} günstiger als anderswo ${inR(wider)}?`,
  aVs: (p, wider, med, pMed, pct, n, pn) => `Der Medianpreis ${inR(p)} liegt bei ${med} (${n} Immobilien), ${pct < 0 ? `${-pct}${NB}% unter` : pct > 0 ? `${pct}${NB}% über` : "gleichauf mit"} dem Median von ${pMed} der ${pn} Immobilien, die wir ${inR(wider)} führen.`,
  qCountries: (w) => `In welchen Ländern gibt es ${w}?`,
  aCountries: (l) => `Heute bei RealHunt: ${list(l)}.`,
  moreTitle: (F) => (F.f.country ? `Weitere Suchen ${inC(F.f.country)}` : "Weitere Suchen"),
  more: { budget: "Nach Budget", region: "Nach Region", setting: "Nach Lage", type: "Nach Art", beds: "Nach Schlafzimmern", feature: "Nach Merkmal", town: "Nach Ort", elsewhere: (l) => `${l} in anderen Ländern`, countries: "Nach Land", all: "Alle Suchen nach günstigen Häusern",
    area: "Nach Gebiet", combo: "Nach Merkmal und Budget", ccy: "In Pfund und Dollar", near: "In der Nähe einer Stadt", ranked: "Ranglisten" },
  ccy,
  city,
  how: (F, v) => {
    const f = F.f;
    if (f.ranked) return f.key === "cheapest"
      ? `Das sind die ${F.n} niedrigsten Angebotspreise unter ${v.parent}, aufsteigend sortiert. Die Liste ändert sich, sobald eine Immobilie hinzukommt, verkauft oder im Preis gesenkt wird.`
      : `Das sind die ${F.n} niedrigsten Preise pro m² unter den ${v.total} Immobilien, deren Anzeige die Wohnfläche nennt. Ein niedriger Preis pro m² gehört meist zu einem großen Haus an einem Ort, an dem wenige suchen.`;
    if (f.kind === "ccyBand") return `${v.cap} sind ${v.eur} zum Referenzkurs der Europäischen Zentralbank vom ${v.date} (1${NB}€ = ${v.rate.replace(".", ",")} ${f.ccy === "GBP" ? "Pfund" : "US-Dollar"}). Verkauft wird in Euro oder in der Landeswährung: Die Beträge in ${f.ccy === "GBP" ? "Pfund" : "Dollar"} auf dieser Seite sind Näherungswerte und ändern sich mit dem Wechselkurs.`;
    if (f.kind === "near") return `Auf dieser Liste: Immobilien im Umkreis von ${NEAR_KM} km Luftlinie um das Zentrum von ${cityOf(f)}. Auf der Straße ist es weiter: Prüfen Sie die Fahrzeit, bevor Sie mit täglichem Pendeln rechnen.`;
    if (f.kind === "area") { const a = areaBySlug(f.cc || "", f.area || ""); return a ? `Zum Gebiet „${areaL(f)}“ zählen hier die Immobilien aus ${a.hoods ? "diesen Vierteln: " : ""}${v.regions}${a.sea ? ", die am Meer liegen (höchstens 5 km von der Küste oder als Strandimmobilie angeboten)" : ""}.` : ""; }
    return (f.kind === "feature" || f.kind === "gfeature") && f.key ? HOW[f.key] || "" : "";
  },
  l1rank: (w, min, max) => `Die ${w} bei RealHunt kosten heute zwischen ${min} und ${max}.`,
  gridTitleRank: (key, n) => (key === "cheapest" ? `Die ${n} Immobilien, von der günstigsten zur teuersten` : `Die ${n} Immobilien, nach Preis pro m² aufsteigend`),
  x: {
    amen: (l) => `Ausstattung laut Anzeigen: ${l.map(([k, n]) => `${n} mit ${AMEN[k] || k}`).join(", ")}.`,
    airport: (med, title, km, _name, _l, code, codes) => `Flughäfen: Die mittlere Entfernung beträgt ${med} km. Am nächsten liegt ${title}, ${km < 1 ? "weniger als 1" : km} km vom Flughafen${code ? ` ${code}` : ""}.${codes.some((c) => c.name) ? ` Nächstgelegene Flughäfen nach Code: ${list(codes.filter((c) => c.name))}.` : ""}`,
    sea: (n, med, title, m) => `Entfernung zum Meer, gemessen bei ${n} dieser Immobilien: ${num(m)} m bei der nächstgelegenen (${title}), im Median ${num(med)} m.`,
    plot: (med, title, m2) => `Grundstück: im Median ${num(med)} m². Das größte hat ${num(m2)} m²: ${title}.`,
    ppsqm: (title, low, high) => `Preis pro m²: von ${low} (${title}) bis ${high}.`,
    score: (n, pct, parent, n95) => `${n} Immobilien haben eine Note von 90 oder mehr: ${pct}${NB}% von ${parent}.${n95 ? ` ${n95} davon ${s(n95, "hat", "haben")} 95 oder mehr.` : ""}`,
    fee: (n, min, max, yMin, yMax) => `Hausgeld laut ${n} Anzeigen: ${min === max ? min : `${min} bis ${max}`} im Monat, also ${yMin === yMax ? yMin : `${yMin} bis ${yMax}`} im Jahr.`,
    drop: (title, pct, amount, med) => `Die größte Preissenkung: ${pct}${NB}% (${amount}) bei ${title}. Im Median dieser Seite sind es ${med}${NB}%.`,
    days: (med, title, v) => `Tage mit gutem Wetter: im Median ${med} pro Jahr. Die meisten, ${v}, hat: ${title}.`,
    elev: (n, med, title, v) => `Höhenlage, bekannt bei ${n} dieser Immobilien: im Median ${num(med)} m. Am höchsten, auf ${num(v)} m, liegt: ${title}.`,
    islands: (l) => `Inseln: ${list(l)}.`,
    dist: (c, med, title, km, far) => `Luftlinie bis ${c}: von ${km < 1 ? "weniger als 1" : km} km (${title}) bis ${far} km, im Median ${med} km.`,
    rank: (key, n, title, v, of) => (key === "cheapest" ? `Die Grenze liegt heute bei ${v}: ${title} ist Nummer ${n} von ${of}.` : `Die Grenze liegt heute bei ${v}: ${title} ist Nummer ${n} der ${of} Immobilien mit angegebener Wohnfläche.`),
    vs: (other, med, n, oMed, on, pct) => `Im Vergleich zu ${other}: Der Median liegt hier bei ${med} (${n} Immobilien), ${pct}${NB}% unter dem Median von ${oMed} der ${on} Immobilien, die wir dort führen.`,
  },
  noteSource: "Quelle", noteAsOf: (asOf) => `Stand: ${asOf}. Allgemeine Information, keine Rechts- oder Steuerberatung.`,
  season: { title: "Passend zur Jahreszeit", winter: "Für den Winter", summer: "Für den Sommer" },
  allIn: (c, n) => `Alle ${n} Immobilien ${c}`,
  sources: (l) => `Diese Anzeigen stammen von ${l.map(([d, n]) => `${d} (${n})`).join(", ")}.`,
  notAgent: "RealHunt ist kein Makler und verkauft diese Immobilien nicht: Jede verlinkt auf ihre Originalanzeige und wurde vor der Veröffentlichung von einem Menschen geprüft.",
  alert: (c) => `Per E-Mail über neue Immobilien ${c} informieren`,
  filter: "Diese Immobilien filtern und sortieren",
  method: "So entsteht die Note",
  moved: "Diese Seite ist umgezogen.",
};
