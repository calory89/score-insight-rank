// CHECK layer logic (7-nov-2026), the "check" in "find, check and buy". Pure functions only, so they can be
// unit-tested (src/test/check-logic.test.ts) and reused by the cards and the home page (src/community/check.tsx):
//  - allIn(): price + buying costs (low end of destinations.json purchase_costs_pct) and monthly running costs
//  - buy rules per nationality group (src/data/buyrules.json) and a default group from language / time zone
//  - redFlags(): risk phrases in the listing text (EN/ES/FR/IT/DE/PT basics), with negation and "ask whether" skips
//  - questions() and agentEmail(): what to ask the agent, and a short polite email in the listing's language
import DEST_JSON from "@/data/destinations.json";
import RULES_JSON from "@/data/buyrules.json";

export type CheckRow = {
  title?: string | null; why_great?: string | null; costs_note?: string | null; country?: string | null; location_name?: string | null;
  price_eur?: number | null; hoa_monthly?: number | string | null; hoa_currency?: string | null; hoa_unknown?: boolean | null;
  tax_annual?: number | string | null; category?: string | null; slug?: string | null;
};

export const USD_EUR = 0.896;
const DESTS = DEST_JSON as Record<string, any>;
export const countryKey = (c?: string | null) => String(c || "").toLowerCase().trim().replace(/\s+/g, "-");
const num = (v: unknown) => (v == null || v === "" || !isFinite(Number(v)) ? null : Number(v));

/** "7.5-14" -> [7.5, 14]; "3" -> [3, 3]; anything else -> null. */
export function pctRange(s: unknown): [number, number] | null {
  const m = /^\s*(\d+(?:\.\d+)?)\s*(?:[-–]\s*(\d+(?:\.\d+)?))?\s*$/.exec(String(s ?? ""));
  if (!m) return null;
  const lo = Number(m[1]), hi = m[2] ? Number(m[2]) : lo;
  return [Math.min(lo, hi), Math.max(lo, hi)];
}
/** Amount in EUR. Listings state fees in EUR (no currency) or USD. Other currencies are not converted. */
export function toEur(v: unknown, cur?: string | null): number | null {
  const n = num(v);
  if (n == null) return null;
  const c = String(cur || "EUR").toUpperCase();
  if (c === "EUR") return n;
  if (c === "USD") return n * USD_EUR;
  return null;
}

export type AllIn = {
  price: number | null; pct: [number, number] | null; costsLow: number | null; costsHigh: number | null;
  totalLow: number | null; totalHigh: number | null; hoaEur: number | null; taxMonthEur: number | null; monthly: number | null;
};
export function allIn(d: CheckRow): AllIn {
  const price = num(d.price_eur) && Number(d.price_eur) > 0 ? Number(d.price_eur) : null;
  const pct = pctRange(DESTS[countryKey(d.country)]?.purchase_costs_pct);
  const costsLow = price && pct ? price * pct[0] / 100 : null;
  const costsHigh = price && pct ? price * pct[1] / 100 : null;
  const hoa = num(d.hoa_monthly) && Number(d.hoa_monthly) > 0 ? toEur(d.hoa_monthly, d.hoa_currency) : null;
  const tax = num(d.tax_annual) && Number(d.tax_annual) > 0 ? toEur(d.tax_annual, d.hoa_currency) : null;
  const taxMonthEur = tax != null ? tax / 12 : null;
  const monthly = hoa != null || taxMonthEur != null ? (hoa || 0) + (taxMonthEur || 0) : null;
  return { price, pct, costsLow, costsHigh, totalLow: price && costsLow != null ? price + costsLow : null, totalHigh: price && costsHigh != null ? price + costsHigh : null, hoaEur: hoa, taxMonthEur, monthly };
}
/** Round for display: nearest 100 below 100k, nearest 1,000 above. */
export const roundNice = (v: number) => (v >= 100000 ? Math.round(v / 1000) * 1000 : v >= 1000 ? Math.round(v / 100) * 100 : Math.round(v));
export const eur = (v: number, locale = "en") => new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
/** Card line parts: ["≈ €93,800 to buy", "≈ €450/mo"]. Empty when nothing is known. */
export function allInParts(d: CheckRow): { v: string; unit: "to buy" | "/mo" }[] {
  const a = allIn(d), out: { v: string; unit: "to buy" | "/mo" }[] = [];
  if (a.totalLow != null) out.push({ v: `≈\u00a0${eur(roundNice(a.totalLow))}`, unit: "to buy" });
  if (a.monthly != null && a.monthly > 0) out.push({ v: `≈\u00a0${eur(Math.round(a.monthly))}`, unit: "/mo" });
  return out;
}
export const allInLine = (d: CheckRow): string[] => allInParts(d).map((p) => (p.unit === "/mo" ? `${p.v}/mo` : `${p.v} ${p.unit}`));

// ------------------------------------------------------------------------------------------- can I buy here?
export type Group = "eu" | "uk" | "na" | "other";
export type Light = "green" | "amber" | "red";
export const GROUPS: [Group, string][] = [["eu", "EU / EEA"], ["uk", "UK"], ["na", "US / Canada"], ["other", "Other"]];
type Rule = { s: Light; note: string; badge?: string };
const RULES = RULES_JSON as unknown as Record<string, { name: string; updated: string } & Record<Group, Rule>>;
export const BUY_UPDATED = (RULES_JSON as any)._meta?.updated || "";
/** Spanish texts for the rules (src/data/buyrules-es.json, loaded only on the Spanish site): same keys, no status. */
export type RulesEs = Record<string, { name?: string } & Partial<Record<Group, { note?: string; badge?: string }>>>;
/** The rule for a country and group; with `es`, the note, badge and country name are the Spanish ones. */
export function buyRule(country: string | null | undefined, g: Group, es?: RulesEs | null): (Rule & { name: string; updated: string }) | null {
  const k = countryKey(country);
  const r = RULES[k];
  if (!r || !r[g]) return null;
  const e = es?.[k]; const eg = e?.[g];
  if (!e || !eg?.note) return { ...r[g], name: r.name, updated: r.updated };
  return { ...r[g], note: eg.note, badge: r[g].badge ? eg.badge || r[g].badge : undefined, name: e.name || r.name, updated: r.updated };
}
const MONTHS_ES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
/** "2026-11" -> "noviembre de 2026". */
export const monthEs = (ym: string) => { const m = /^(\d{4})-(\d{2})$/.exec(ym || ""); return m && MONTHS_ES[Number(m[2]) - 1] ? `${MONTHS_ES[Number(m[2]) - 1]} de ${m[1]}` : ym; };

const EU_LANG = /^(de|fr|it|es|pt|nl|da|sv|fi|pl|cs|sk|sl|hu|ro|bg|hr|el|et|lv|lt|ga|mt|is|nb|nn|no|lb)$/;
const EU_REGION = /^(AT|BE|BG|HR|CY|CZ|DK|EE|FI|FR|DE|GR|HU|IE|IT|LV|LT|LU|MT|NL|PL|PT|RO|SK|SI|ES|SE|IS|LI|NO|CH)$/;
const EU_TZ = /^Europe\/(Vienna|Brussels|Sofia|Zagreb|Nicosia|Prague|Copenhagen|Tallinn|Helsinki|Paris|Berlin|Busingen|Athens|Budapest|Dublin|Rome|Riga|Vilnius|Luxembourg|Malta|Amsterdam|Warsaw|Lisbon|Bucharest|Bratislava|Ljubljana|Madrid|Stockholm|Oslo|Zurich|Vaduz|Monaco|San_Marino|Andorra|Mariehamn)$|^Atlantic\/(Canary|Madeira|Azores|Reykjavik)$|^Africa\/Ceuta$|^Arctic\/Longyearbyen$/;
const NA_TZ = /^America\/(New_York|Chicago|Denver|Phoenix|Los_Angeles|Anchorage|Detroit|Boise|Indiana|Kentucky|North_Dakota|Juneau|Sitka|Nome|Menominee|Adak|Toronto|Vancouver|Edmonton|Winnipeg|Halifax|St_Johns|Regina|Moncton|Glace_Bay|Whitehorse|Yellowknife|Iqaluit|Montreal)|^Pacific\/Honolulu$/;
/** Best guess of the visitor's group from navigator.language and the time zone. */
export function detectGroup(lang?: string | null, tz?: string | null): Group {
  const L = String(lang || "").replace("_", "-");
  const [base, region] = [L.split("-")[0].toLowerCase(), (L.split("-")[1] || "").toUpperCase()];
  const z = String(tz || "");
  if (z === "Europe/London" || z === "Europe/Belfast" || z === "Europe/Guernsey" || z === "Europe/Jersey" || z === "Europe/Isle_of_Man") return "uk";
  if (EU_TZ.test(z)) return "eu";
  if (NA_TZ.test(z)) return "na";
  if (z) return region === "GB" ? "uk" : "other";
  if (region === "GB") return "uk";
  if (region === "US" || region === "CA") return "na";
  if (EU_REGION.test(region) || (!region && EU_LANG.test(base))) return "eu";
  return "other";
}

// ------------------------------------------------------------------------------------------------ red flags
export type FlagId = "auction" | "rustic" | "flood" | "assessment" | "short_sale" | "tenant" | "cash_only" | "as_is" | "renovation" | "senior" | "hoa_unknown" | "staging";
export type Flag = { id: FlagId; label: string; ask: string; sev: number };
export const FLAGS: Record<FlagId, Omit<Flag, "id">> = {
  auction: { sev: 5, label: "Auction or foreclosure", ask: "What are the auction rules and deposit, and do any debts pass to the buyer?" },
  rustic: { sev: 5, label: "Rustic or agricultural land", ask: "Is the house legal and registered, and what may you build or rent out on this land?" },
  flood: { sev: 4, label: "Flood zone", ask: "Which flood zone is it in, what does flood insurance cost, and has it ever flooded?" },
  assessment: { sev: 4, label: "Special assessment (derrama)", ask: "How much is the special assessment, what does it pay for, and who pays it at closing?" },
  short_sale: { sev: 4, label: "Short sale", ask: "Has the lender approved the price, and how long will approval take?" },
  tenant: { sev: 3, label: "Tenant in place", ask: "Can you share the lease, rent and end date, and will the home be handed over empty?" },
  cash_only: { sev: 3, label: "Cash buyers only", ask: "Why is it cash only, and has a bank refused a mortgage on it?" },
  as_is: { sev: 3, label: "Sold as is", ask: "Is there a recent inspection or survey, and what does the seller know needs repair?" },
  renovation: { sev: 2, label: "Needs renovation", ask: "Which works are needed, and do you have a builder's quote or permits for them?" },
  senior: { sev: 2, label: "55+ community", ask: "What are the age rules: who must be 55 or older, and can family or tenants stay?" },
  hoa_unknown: { sev: 2, label: "Community fee not stated", ask: "What is the monthly community fee (HOA), and what does it include?" },
  staging: { sev: 1, label: "Virtually staged photos", ask: "Can you send real, unedited photos or show the home on a video call?" },
};
const RX: [FlagId, RegExp][] = [
  ["auction", /\bauctions?\b|\bsubastas?\b|\ball['’]asta\b|\basta (giudiziaria|immobiliare|pubblica)\b|\bvente aux ench[eè]res\b|\bench[eè]res? (publiques?|judiciaires?)\b|\b(zwangs)?versteigerung\b|\bleil[aã]o\b|\bforeclosures?\b|\bbank[- ]owned\b/i],
  ["rustic", /\brustic (land|plot|zone|zoning)\b|\b(suelo|terreno|solo) r[uú]stico\b|\bfinca r[uú]stica\b|\bsuelo no urbanizable\b|\bno edificable\b|\bagricultural land\b|\bterreno agricolo\b|\bterrain agricole\b|\bzona agricola\b|\bnon[- ]buildable\b|\bnot buildable\b/i],
  ["flood", /\bflood[- ]?(zone|plain|risk|area)\b(?!\s*x\b)|\bfloodplain\b|\bflood[- ]prone\b|\bzona inundable\b|\bzona inondabile\b|\bzone inondable\b|[uü]berschwemmungsgebiet|\bhochwassergebiet\b|\bzona de cheias\b/i],
  ["assessment", /\bspecial assessments?\b|\bderramas?\b|\bspese straordinarie\b|\bquote straordinarie\b|\bappels? de fonds\b|\bsonderumlagen?\b|\bquotas? extra(ordin[aá]rias?)?\b/i],
  ["short_sale", /\bshort sale\b/i],
  ["tenant", /\btenant[- ]occupied\b|\b(with|has) (a |the )?(current |sitting |long[- ]term )?tenants?\b|\bsitting tenants?\b|\blet to (a |an )?(tenants?|students?|renters?)\b|\b(is|it's) (currently )?let until\b|\bcurrently (let|rented|leased)\b|\bis (rented|let|leased) (out )?(to|until)\b|\boccupied by (a )?tenants?\b|\b(con|com) inquilinos?\b|\bactualmente alquilad[oa]\b|\balquilad[oa] (hasta|con contrato)\b|\battualmente affittat[oa]\b|\baffittat[oa] (fino|con contratto)\b|\bvendue? lou[ée]|\boccup[ée]e? par (un |des )?locataires?\b|\b(ist )?vermietet\b|\bactualmente arrendad[oa]\b/i],
  ["cash_only", /\bcash (buyers? )?only\b|\bonly cash\b|\bsolo (al )?contado\b|\bsolo efectivo\b|\bsolo contanti\b|\bnur (gegen )?bar(zahlung|zahler)?\b|\bcomptant uniquement\b|\bnon[- ]mortgageable\b|\bnot mortgageable\b/i],
  ["as_is", /\bsold\s+["“']?as[\s-]is\b|["“']as[\s-]is["”']|\bas[\s-]is[\s,]+(where[\s-]is|condition|sale|basis)\b|\bvendu en l['’][ée]tat\b|\bnello stato di fatto\b|\bwie besehen\b|\bno estado em que se encontra\b|\ben el estado en que se encuentra\b/i],
  ["renovation", /\bneeds? (a |full |complete |total |some |major |extensive )?(renovation|refurbishment|modernisation|modernization|restoration|work|works|updating|repairs?)\b|\bin need of (a |full |complete |some )?(renovation|repairs?|refurbishment|modernisation|modernization|restoration|work)\b|\bto (be )?renovate[d]?\b|\bto (be )?refurbish(ed)?\b|\bto (be )?restored?\b|\brenovation project\b|\bfixer[- ]upper\b|\bhandyman special\b|\bfor renovation\b|\b(a|para) reformar\b|\bnecesita (una )?reforma\b|\bpara rehabilitar\b|\bda ristrutturare\b|(?:^|\s)[àa] r[ée]nover|\btravaux [àa] pr[ée]voir\b|\b(renovierungs|sanierungs|modernisierungs)bed[uü]rftig|\bpara (recuperar|remodelar)\b|\bprecisa de obras\b|\bpara restaurar\b/i],
  ["senior", /(^|[^\d])55\s?\+|\b55 and (over|older)\b|\bage[- ]restricted\b|\bseniors?[- ]only\b|\b(over|older)[- ]55s?\b/i],
  ["staging", /\bvirtual(ly)?[- ]stag(ing|ed)\b|\bvirtually furnished\b|\bdigitally (staged|furnished)\b|\bamueblad[oa] virtual|\bstaging virtuale\b|\bhome staging virtuel\b|\bvirtuell (eingerichtet|m[öo]bliert)\b/i],
];
// A match is skipped when, earlier in the same sentence, the text negates it ("not marked as occupied, rented or
// at auction") or only says to ask about it ("ask whether a special assessment is planned").
const SKIP = /\b(not|no|never|without|sin|non|nicht|kein\w*|sem|pas|ikke|inte|niet|ask|asks|whether|if|any|check|pregunte|chiedi|demandez|fragen)\b/i;
function negated(text: string, at: number): boolean {
  const start = Math.max(0, at - 50);
  let before = text.slice(start, at);
  const cut = Math.max(before.lastIndexOf("."), before.lastIndexOf(";"), before.lastIndexOf("!"), before.lastIndexOf("?"), before.lastIndexOf("\n"));
  if (cut >= 0) before = before.slice(cut + 1);
  return SKIP.test(before);
}
/** Risk phrases found in title + description + costs note, most serious first. */
export function redFlags(d: CheckRow): Flag[] {
  const text = [d.title, d.why_great, d.costs_note].filter(Boolean).join(". ");
  const out: Flag[] = [];
  for (const [id, re] of RX) {
    const g = new RegExp(re.source, "gi");
    let m: RegExpExecArray | null, hit = false;
    while (!hit && (m = g.exec(text))) { if (!negated(text, m.index + (m[1] && id === "senior" ? m[1].length : 0))) hit = true; if (m[0] === "") g.lastIndex++; }
    if (hit) out.push({ id, ...FLAGS[id] });
  }
  if (d.hoa_unknown) out.push({ id: "hoa_unknown", ...FLAGS.hoa_unknown });
  return out.sort((a, b) => b.sev - a.sev);
}

// --------------------------------------------------------------------------------------- questions + email
export type QId = "available" | "hoa_known" | "hoa" | "assessments" | "tax" | "tax_reset" | "year_built" | "rental_licence" | "legal" | "docs" | "docs_us" | FlagId;
const FLAT = /\b(flat|apartment|condo|condominium|studio|penthouse|duplex|piso|apartamento|ático|appartamento|attico|bilocale|trilocale|monolocale|appartement|wohnung|lejlighed|lägenhet|appartement|flat)\b/i;
const HOUSE_RURAL = /\b(farmhouse|cottage|country house|finca|cortijo|masia|masía|casale|rustico|cascina|farm|smallholding|ferme|longère|bauernhaus|landhuis|hytte|landsted|torp|quinta|casa de campo|cabin|rural)\b/i;
/** A flat / condo: from the title, or a listing that leaves out a community fee it clearly has. Houses can have an HOA too. */
export const isFlat = (d: CheckRow) => FLAT.test(d.title || "") || !!d.hoa_unknown;
export const isRural = (d: CheckRow) => (d.category === "village" && !isFlat(d)) || HOUSE_RURAL.test(d.title || "");
export const isHolidayArea = (d: CheckRow) => d.category === "beach" || (!!DESTS[countryKey(d.country)]?.holiday_rental_rules && /\b(beach|sea|coast|island|resort|ski|lake|playa|mare|mer|strand|praia)\b/i.test([d.title, d.location_name].join(" ")));

export function questions(d: CheckRow, flags: Flag[] = redFlags(d)): QId[] {
  const q: QId[] = ["available"];
  const flat = isFlat(d), hoa = Number(d.hoa_monthly) > 0;
  if (hoa) q.push("hoa_known"); else if (flat) q.push("hoa");
  if (flat || hoa) q.push("assessments");
  if (Number(d.tax_annual) > 0 && countryKey(d.country) === "united-states") q.push("tax_reset"); else q.push("tax");
  if (flat) q.push("year_built");
  if (isHolidayArea(d)) q.push("rental_licence");
  if (isRural(d) && !flags.some((f) => f.id === "rustic")) q.push("legal");
  for (const f of flags) if (!(f.id === "hoa_unknown" && q.includes("hoa")) && !(f.id === "assessment" && q.includes("assessments"))) q.push(f.id);
  q.push(countryKey(d.country) === "united-states" ? "docs_us" : "docs");
  return Array.from(new Set(q));
}

type Lang = "en" | "es" | "it" | "fr" | "de" | "pt" | "nl" | "da" | "sv";
export const COUNTRY_LANG: Record<string, Lang> = { spain: "es", mexico: "es", "dominican-republic": "es", italy: "it", france: "fr", germany: "de", portugal: "pt", netherlands: "nl", denmark: "da", sweden: "sv" };
/** Language for the email to the agent: the listing country's, when we have a template, else English. */
export function emailLang(d: CheckRow): Lang {
  const k = countryKey(d.country);
  if (k === "switzerland") {
    const l = String(d.location_name || "");
    if (/Ticino|Lugano|Locarno/i.test(l)) return "it";
    if (/Neuch[aâ]tel|Vaud|Gen[eè]v|Geneva|Jura|Fribourg|Lausanne|Sion|Martigny|Sierre|Monthey/i.test(l)) return "fr";
    return "de";
  }
  if (k === "belgium") return "nl";
  return COUNTRY_LANG[k] || "en";
}

// One line per question and language. {fee} is replaced by the stated monthly fee.
const Q: Record<QId, Record<Lang, string>> = {
  available: { en: "Is the home still available, and is the price negotiable?", es: "¿Sigue disponible la vivienda y el precio es negociable?", it: "L'immobile è ancora disponibile e il prezzo è trattabile?", fr: "Le bien est-il toujours disponible et le prix est-il négociable ?", de: "Ist die Immobilie noch verfügbar und ist der Preis verhandelbar?", pt: "O imóvel ainda está disponível e o preço é negociável?", nl: "Is de woning nog beschikbaar en is de prijs bespreekbaar?", da: "Er boligen stadig til salg, og er prisen til forhandling?", sv: "Är bostaden fortfarande till salu, och går priset att förhandla?" },
  hoa_known: { en: "What does the {fee} monthly community fee include, and has it risen in recent years?", es: "¿Qué incluye la cuota de comunidad de {fee} al mes y ha subido en los últimos años?", it: "Cosa comprendono le spese condominiali di {fee} al mese e sono aumentate negli ultimi anni?", fr: "Que comprennent les charges de {fee} par mois et ont-elles augmenté ces dernières années ?", de: "Was ist im Hausgeld von {fee} im Monat enthalten, und ist es in den letzten Jahren gestiegen?", pt: "O que inclui o condomínio de {fee} por mês e aumentou nos últimos anos?", nl: "Wat valt onder de VvE-bijdrage van {fee} per maand, en is die de laatste jaren gestegen?", da: "Hvad dækker fællesudgiften på {fee} om måneden, og er den steget de seneste år?", sv: "Vad ingår i månadsavgiften på {fee}, och har den höjts de senaste åren?" },
  hoa: { en: "What is the monthly community fee (HOA), and what does it include?", es: "¿Cuál es la cuota mensual de comunidad y qué incluye?", it: "A quanto ammontano le spese condominiali mensili e cosa comprendono?", fr: "Quel est le montant mensuel des charges de copropriété et que comprennent-elles ?", de: "Wie hoch ist das monatliche Hausgeld und was ist darin enthalten?", pt: "Qual é o valor mensal do condomínio e o que inclui?", nl: "Hoe hoog is de maandelijkse VvE-bijdrage en wat valt eronder?", da: "Hvor stor er den månedlige fællesudgift, og hvad dækker den?", sv: "Hur hög är månadsavgiften och vad ingår i den?" },
  assessments: { en: "Are any special assessments or building works planned or already approved?", es: "¿Hay alguna derrama u obra en el edificio prevista o ya aprobada?", it: "Sono previsti o già deliberati lavori o spese straordinarie nel condominio?", fr: "Des travaux ou appels de fonds exceptionnels sont-ils prévus ou déjà votés ?", de: "Sind Sonderumlagen oder Bauarbeiten am Gebäude geplant oder bereits beschlossen?", pt: "Há obras ou quotas extraordinárias previstas ou já aprovadas no prédio?", nl: "Zijn er extra bijdragen of werkzaamheden aan het gebouw gepland of al besloten?", da: "Er der planlagt eller vedtaget ekstraordinære opkrævninger eller byggearbejder?", sv: "Finns det planerade eller beslutade extra avgifter eller renoveringar i huset?" },
  tax: { en: "How much is the yearly property tax, and are there other local taxes or fees?", es: "¿Cuánto es el impuesto anual sobre la propiedad (IBI o predial) y hay otras tasas locales?", it: "A quanto ammonta l'IMU annuale e ci sono altre tasse locali?", fr: "Quel est le montant de la taxe foncière annuelle et y a-t-il d'autres taxes locales ?", de: "Wie hoch ist die jährliche Grundsteuer, und gibt es weitere lokale Abgaben?", pt: "Qual é o valor anual do IMI e há outras taxas locais?", nl: "Hoe hoog is de jaarlijkse OZB en zijn er andere lokale heffingen?", da: "Hvor meget er ejendomsskatten om året, og er der andre lokale afgifter?", sv: "Hur hög är den årliga fastighetsavgiften, och finns det andra lokala avgifter?" },
  tax_reset: { en: "What property tax will a new owner pay after the sale, since the current bill may reset?", es: "¿Qué impuesto sobre la propiedad pagará el nuevo dueño tras la venta?", it: "Quali tasse sulla proprietà pagherà il nuovo proprietario dopo la vendita?", fr: "Quelle taxe foncière paiera le nouveau propriétaire après la vente ?", de: "Welche Grundsteuer zahlt der neue Eigentümer nach dem Kauf?", pt: "Que imposto sobre o imóvel pagará o novo proprietário após a venda?", nl: "Welke onroerendezaakbelasting betaalt de nieuwe eigenaar na de verkoop?", da: "Hvilken ejendomsskat skal en ny ejer betale efter salget?", sv: "Vilken fastighetsskatt betalar en ny ägare efter köpet?" },
  year_built: { en: "When was the building built, and when were the roof, lifts and facade last renewed?", es: "¿De qué año es el edificio y cuándo se renovaron por última vez la cubierta, el ascensor y la fachada?", it: "Di che anno è l'edificio e quando sono stati rifatti l'ultima volta tetto, ascensore e facciata?", fr: "De quelle année date l'immeuble et quand la toiture, l'ascenseur et la façade ont-ils été rénovés ?", de: "Aus welchem Jahr ist das Gebäude, und wann wurden Dach, Aufzug und Fassade zuletzt erneuert?", pt: "De que ano é o prédio e quando foram renovados pela última vez o telhado, o elevador e a fachada?", nl: "Uit welk jaar is het gebouw en wanneer zijn dak, lift en gevel voor het laatst vernieuwd?", da: "Hvornår er bygningen opført, og hvornår blev tag, elevator og facade sidst renoveret?", sv: "När byggdes huset, och när renoverades tak, hiss och fasad senast?" },
  rental_licence: { en: "Does the home have a holiday rental licence, or can one be obtained?", es: "¿Tiene licencia de alquiler turístico o se puede obtener?", it: "L'immobile ha il codice per gli affitti brevi (CIN) o si può ottenere?", fr: "Le logement a-t-il une autorisation de location saisonnière, ou peut-on l'obtenir ?", de: "Gibt es eine Genehmigung für die Ferienvermietung, oder kann man sie bekommen?", pt: "O imóvel tem licença de alojamento local ou é possível obtê-la?", nl: "Heeft de woning een vergunning voor vakantieverhuur, of is die te krijgen?", da: "Må boligen udlejes til ferieformål, og kræver det en tilladelse?", sv: "Får bostaden hyras ut till turister, och krävs det tillstånd?" },
  legal: { en: "Is the house fully legal and registered, with building permits and a habitation certificate?", es: "¿La casa está totalmente legalizada e inscrita en el Registro, con licencias y cédula de habitabilidad?", it: "La casa è conforme e accatastata, con titoli edilizi e agibilità?", fr: "La maison est-elle entièrement régulière, avec permis de construire et conformité ?", de: "Ist das Haus vollständig genehmigt und im Grundbuch eingetragen?", pt: "A casa está legalizada e registada, com licença de utilização?", nl: "Is het huis volledig legaal en ingeschreven, met de nodige vergunningen?", da: "Er huset fuldt lovligt og tinglyst, med byggetilladelser og ibrugtagningstilladelse?", sv: "Är huset lagligt och registrerat, med bygglov och slutbesked?" },
  docs: { en: "Could you send the land registry extract, the energy certificate and recent utility bills?", es: "¿Podría enviarme el extracto del registro de la propiedad, el certificado energético y facturas recientes de suministros?", it: "Potrebbe inviarmi la visura catastale, l'APE e le ultime bollette?", fr: "Pourriez-vous m'envoyer le titre de propriété, le DPE et des factures récentes ?", de: "Könnten Sie mir den Grundbuchauszug, den Energieausweis und aktuelle Nebenkostenabrechnungen schicken?", pt: "Poderia enviar a certidão do registo predial, o certificado energético e faturas recentes?", nl: "Kunt u het kadasteruittreksel, het energielabel en recente energierekeningen sturen?", da: "Kan du sende tingbogsudskrift, energimærke og de seneste forbrugsregninger?", sv: "Kan du skicka utdrag ur fastighetsregistret, energideklarationen och senaste driftkostnader?" },
  docs_us: { en: "Could you send the seller's disclosure, the HOA documents if any, and recent utility bills?", es: "¿Podría enviarme la declaración del vendedor (seller's disclosure), los documentos de la HOA si los hay y facturas recientes?", it: "Potrebbe inviarmi la dichiarazione del venditore (seller's disclosure), i documenti della HOA se presenti e le ultime bollette?", fr: "Pourriez-vous m'envoyer la déclaration du vendeur (seller's disclosure), les documents de la HOA le cas échéant et des factures récentes ?", de: "Könnten Sie mir die Verkäufererklärung (seller's disclosure), die HOA-Unterlagen und aktuelle Nebenkostenabrechnungen schicken?", pt: "Poderia enviar a declaração do vendedor (seller's disclosure), os documentos da HOA, se houver, e faturas recentes?", nl: "Kunt u de verklaring van de verkoper (seller's disclosure), eventuele HOA-documenten en recente energierekeningen sturen?", da: "Kan du sende sælgers oplysningsskema (seller's disclosure), eventuelle HOA-dokumenter og de seneste forbrugsregninger?", sv: "Kan du skicka säljarens upplysningar (seller's disclosure), eventuella HOA-dokument och senaste driftkostnader?" },
  auction: { en: "What are the auction rules and deposit, and do any debts pass to the buyer?", es: "¿Cuáles son las condiciones y el depósito de la subasta, y pasa alguna deuda al comprador?", it: "Quali sono le regole e la cauzione dell'asta, e passano debiti all'acquirente?", fr: "Quelles sont les règles et la caution de la vente aux enchères, et des dettes passent-elles à l'acheteur ?", de: "Wie laufen die Versteigerung und die Sicherheitsleistung ab, und gehen Schulden auf den Käufer über?", pt: "Quais são as regras e a caução do leilão, e passam dívidas para o comprador?", nl: "Wat zijn de veilingvoorwaarden en de waarborgsom, en gaan er schulden over op de koper?", da: "Hvad er auktionsvilkårene og depositum, og overtager køberen gæld?", sv: "Vilka är villkoren och depositionen för auktionen, och följer några skulder med?" },
  rustic: { en: "Is the house legal on this land, and what may be built or rented out?", es: "¿La casa es legal en este suelo y qué se puede construir o alquilar?", it: "La casa è regolare su questo terreno e cosa si può costruire o affittare?", fr: "La maison est-elle régulière sur ce terrain et que peut-on construire ou louer ?", de: "Ist das Haus auf diesem Grundstück genehmigt, und was darf gebaut oder vermietet werden?", pt: "A casa é legal neste terreno e o que se pode construir ou arrendar?", nl: "Is het huis legaal op deze grond, en wat mag er gebouwd of verhuurd worden?", da: "Er huset lovligt på denne grund, og hvad må der bygges eller udlejes?", sv: "Är huset lagligt på denna mark, och vad får byggas eller hyras ut?" },
  flood: { en: "Which flood zone is it in, what does flood insurance cost, and has it ever flooded?", es: "¿En qué zona inundable está, cuánto cuesta el seguro y se ha inundado alguna vez?", it: "In quale zona a rischio alluvione si trova, quanto costa l'assicurazione e si è mai allagata?", fr: "Dans quelle zone inondable se trouve-t-il, combien coûte l'assurance et a-t-il déjà été inondé ?", de: "In welcher Hochwasserzone liegt es, was kostet die Versicherung und gab es schon Überschwemmungen?", pt: "Em que zona de cheias está, quanto custa o seguro e já inundou alguma vez?", nl: "In welke overstromingszone ligt het, wat kost de verzekering en is het ooit overstroomd?", da: "Hvilken oversvømmelseszone ligger det i, hvad koster forsikringen, og har det været oversvømmet?", sv: "Vilken översvämningszon ligger det i, vad kostar försäkringen och har det översvämmats?" },
  assessment: { en: "How much is the special assessment, what does it pay for, and who pays it at closing?", es: "¿De cuánto es la derrama, para qué es y quién la paga en la compraventa?", it: "A quanto ammontano le spese straordinarie, per cosa sono e chi le paga al rogito?", fr: "Quel est le montant de l'appel de fonds, à quoi sert-il et qui le paie à la vente ?", de: "Wie hoch ist die Sonderumlage, wofür ist sie, und wer zahlt sie beim Kauf?", pt: "De quanto é a quota extraordinária, para que serve e quem a paga na escritura?", nl: "Hoe hoog is de extra bijdrage, waarvoor is die, en wie betaalt die bij de overdracht?", da: "Hvor stor er den ekstraordinære opkrævning, hvad dækker den, og hvem betaler den ved salget?", sv: "Hur stor är extraavgiften, vad gäller den och vem betalar den vid köpet?" },
  short_sale: { en: "Has the lender approved the price, and how long will approval take?", es: "¿Ha aprobado el banco el precio y cuánto tardará la aprobación?", it: "La banca ha approvato il prezzo e quanto tempo richiede l'approvazione?", fr: "La banque a-t-elle approuvé le prix et combien de temps prendra l'accord ?", de: "Hat die Bank den Preis genehmigt, und wie lange dauert die Freigabe?", pt: "O banco aprovou o preço e quanto tempo demora a aprovação?", nl: "Heeft de bank de prijs goedgekeurd en hoe lang duurt de goedkeuring?", da: "Har banken godkendt prisen, og hvor lang tid tager godkendelsen?", sv: "Har banken godkänt priset, och hur lång tid tar godkännandet?" },
  tenant: { en: "Could you share the lease, rent and end date, and will the home be handed over empty?", es: "¿Puede enviarme el contrato de alquiler, la renta y la fecha de fin, y se entrega vacía?", it: "Può inviarmi il contratto d'affitto, il canone e la scadenza, e l'immobile sarà consegnato libero?", fr: "Pouvez-vous m'envoyer le bail, le loyer et la date de fin, et le bien sera-t-il livré libre ?", de: "Können Sie mir Mietvertrag, Miete und Laufzeit schicken, und wird die Wohnung leer übergeben?", pt: "Pode enviar o contrato de arrendamento, a renda e a data de fim, e o imóvel é entregue vazio?", nl: "Kunt u het huurcontract, de huur en de einddatum sturen, en wordt de woning leeg opgeleverd?", da: "Kan du sende lejekontrakt, husleje og slutdato, og overdrages boligen tom?", sv: "Kan du skicka hyresavtal, hyra och slutdatum, och lämnas bostaden tom?" },
  cash_only: { en: "Why is it cash only, and has a bank refused a mortgage on it?", es: "¿Por qué es solo al contado y algún banco ha denegado una hipoteca?", it: "Perché solo in contanti, e una banca ha rifiutato un mutuo?", fr: "Pourquoi uniquement au comptant, et une banque a-t-elle refusé un prêt ?", de: "Warum nur gegen Barzahlung, und hat eine Bank eine Finanzierung abgelehnt?", pt: "Porque só a pronto pagamento e algum banco recusou crédito?", nl: "Waarom alleen contant, en heeft een bank een hypotheek geweigerd?", da: "Hvorfor kun kontant, og har en bank afvist at give lån?", sv: "Varför bara kontant, och har en bank nekat lån?" },
  as_is: { en: "Is there a recent inspection or survey, and what does the seller know needs repair?", es: "¿Hay una inspección técnica reciente y qué sabe el vendedor que hay que reparar?", it: "C'è una perizia recente e cosa sa il venditore che va riparato?", fr: "Existe-t-il une expertise récente et que sait le vendeur des réparations nécessaires ?", de: "Gibt es ein aktuelles Gutachten, und welche Mängel sind dem Verkäufer bekannt?", pt: "Há uma vistoria recente e o que sabe o vendedor que precisa de reparação?", nl: "Is er een recente bouwkundige keuring, en welke gebreken kent de verkoper?", da: "Findes der en nylig tilstandsrapport, og hvilke fejl kender sælger til?", sv: "Finns det en färsk besiktning, och vilka fel känner säljaren till?" },
  renovation: { en: "Which works are needed, and is there a builder's quote or permit for them?", es: "¿Qué obras hacen falta y hay presupuesto o licencia para ellas?", it: "Quali lavori servono e c'è un preventivo o un titolo edilizio?", fr: "Quels travaux sont nécessaires et existe-t-il un devis ou un permis ?", de: "Welche Arbeiten sind nötig, und gibt es einen Kostenvoranschlag oder eine Genehmigung?", pt: "Que obras são necessárias e há orçamento ou licença para elas?", nl: "Welke werkzaamheden zijn nodig, en is er een offerte of vergunning?", da: "Hvilke arbejder er nødvendige, og findes der tilbud eller tilladelse?", sv: "Vilka arbeten behövs, och finns det offert eller bygglov?" },
  senior: { en: "What are the age rules: who must be 55 or older, and can family or tenants stay?", es: "¿Cuáles son las normas de edad: quién debe tener 55 años o más y pueden quedarse familiares o inquilinos?", it: "Quali sono le regole di età: chi deve avere almeno 55 anni e possono restare familiari o inquilini?", fr: "Quelles sont les règles d'âge : qui doit avoir 55 ans ou plus, et la famille ou des locataires peuvent-ils rester ?", de: "Welche Altersregeln gelten: wer muss 55 oder älter sein, und dürfen Familie oder Mieter wohnen?", pt: "Quais são as regras de idade: quem tem de ter 55 anos ou mais, e podem ficar familiares ou inquilinos?", nl: "Wat zijn de leeftijdsregels: wie moet 55 of ouder zijn, en mogen familie of huurders er wonen?", da: "Hvilke aldersregler gælder: hvem skal være 55 eller ældre, og må familie eller lejere bo der?", sv: "Vilka åldersregler gäller: vem måste vara 55 eller äldre, och får familj eller hyresgäster bo där?" },
  hoa_unknown: { en: "What is the monthly community fee (HOA), and what does it include?", es: "¿Cuál es la cuota mensual de comunidad y qué incluye?", it: "A quanto ammontano le spese condominiali mensili e cosa comprendono?", fr: "Quel est le montant mensuel des charges de copropriété et que comprennent-elles ?", de: "Wie hoch ist das monatliche Hausgeld und was ist darin enthalten?", pt: "Qual é o valor mensal do condomínio e o que inclui?", nl: "Hoe hoog is de maandelijkse VvE-bijdrage en wat valt eronder?", da: "Hvor stor er den månedlige fællesudgift, og hvad dækker den?", sv: "Hur hög är månadsavgiften och vad ingår i den?" },
  staging: { en: "Could you send real, unedited photos or show the home on a video call?", es: "¿Podría enviarme fotos reales sin retocar o enseñarme la vivienda por videollamada?", it: "Potrebbe inviarmi foto reali non modificate o mostrarmi la casa in videochiamata?", fr: "Pourriez-vous m'envoyer de vraies photos non retouchées ou me faire visiter en visio ?", de: "Könnten Sie echte, unbearbeitete Fotos schicken oder die Immobilie per Videoanruf zeigen?", pt: "Poderia enviar fotos reais sem edição ou mostrar o imóvel por videochamada?", nl: "Kunt u echte, onbewerkte foto's sturen of de woning via een videogesprek laten zien?", da: "Kan du sende rigtige, uredigerede billeder eller vise boligen over video?", sv: "Kan du skicka riktiga, oredigerade bilder eller visa bostaden via videosamtal?" },
};
const MAIL: Record<Lang, { subj: string; hi: string; intro: string; ask: string; bye: string }> = {
  en: { subj: "Question about your listing", hi: "Hello,", intro: "I am interested in your property: {home}.", ask: "Before arranging a visit, could you please tell me:", bye: "Thank you in advance.\nKind regards," },
  es: { subj: "Consulta sobre su anuncio", hi: "Hola:", intro: "Estoy interesado en su inmueble: {home}.", ask: "Antes de concertar una visita, ¿podría indicarme lo siguiente?", bye: "Muchas gracias de antemano.\nUn saludo," },
  it: { subj: "Richiesta di informazioni sul suo annuncio", hi: "Buongiorno,", intro: "sono interessato al suo immobile: {home}.", ask: "Prima di fissare una visita, potrebbe indicarmi:", bye: "Grazie in anticipo.\nCordiali saluti," },
  fr: { subj: "Question sur votre annonce", hi: "Bonjour,", intro: "Je suis intéressé par votre bien : {home}.", ask: "Avant d'organiser une visite, pourriez-vous m'indiquer :", bye: "Merci d'avance.\nCordialement," },
  de: { subj: "Anfrage zu Ihrem Inserat", hi: "Guten Tag,", intro: "ich interessiere mich für Ihre Immobilie: {home}.", ask: "Bevor wir eine Besichtigung vereinbaren, könnten Sie mir bitte Folgendes beantworten:", bye: "Vielen Dank im Voraus.\nMit freundlichen Grüßen," },
  pt: { subj: "Pedido de informação sobre o seu anúncio", hi: "Olá,", intro: "Tenho interesse no seu imóvel: {home}.", ask: "Antes de marcar uma visita, poderia indicar-me:", bye: "Obrigado desde já.\nCom os melhores cumprimentos," },
  nl: { subj: "Vraag over uw advertentie", hi: "Goedendag,", intro: "Ik ben geïnteresseerd in uw woning: {home}.", ask: "Voordat we een bezichtiging plannen, kunt u mij het volgende laten weten?", bye: "Alvast bedankt.\nMet vriendelijke groet," },
  da: { subj: "Spørgsmål om din annonce", hi: "Hej,", intro: "Jeg er interesseret i din bolig: {home}.", ask: "Inden vi aftaler en fremvisning, vil du så venligst svare på følgende:", bye: "På forhånd tak.\nVenlig hilsen," },
  sv: { subj: "Fråga om din annons", hi: "Hej,", intro: "Jag är intresserad av din bostad: {home}.", ask: "Innan vi bokar en visning, kan du vänligen svara på följande:", bye: "Tack på förhand.\nVänliga hälsningar," },
};
export const questionText = (id: QId, lang: Lang = "en", fee?: string) => Q[id][lang].replace("{fee}", fee || "");
// The Spanish lines above are written for an agent in Spain or Latin America (IBI, predial, cédula). On the Spanish
// site the visitor also sees them for homes elsewhere, so these say the same thing without local names.
const Q_ES_ANYWHERE: Partial<Record<QId, string>> = {
  tax: "¿Cuánto es el impuesto anual sobre la propiedad y hay otros impuestos o tasas locales?",
  legal: "¿La casa es totalmente legal y está inscrita en el registro, con licencias de obra y certificado de habitabilidad?",
};
/** The question as the visitor reads it on the page, in the site's language ("en" or "es"), with the fee in that language's format. */
export function questionUi(id: QId, d: CheckRow, ui: "en" | "es" = "en"): string {
  if (ui === "en") return questionText(id, "en", feeText(d));
  const local = emailLang(d) === "es";
  return (local ? Q[id].es : Q_ES_ANYWHERE[id] ?? Q[id].es).replace("{fee}", feeText(d, "es"));
}
/** Monthly fee as stated in the listing, in its currency, written for a language ("$124" in English, "124 US$" in Spanish). */
export const feeText = (d: CheckRow, locale = "en") => (Number(d.hoa_monthly) > 0 ? new Intl.NumberFormat(locale === "es" ? "es-ES" : locale, { style: "currency", currency: d.hoa_currency || "EUR", maximumFractionDigits: 0 }).format(Number(d.hoa_monthly)) : "");
export function agentEmail(d: CheckRow, ids: QId[] = questions(d), lang: Lang = emailLang(d)): { lang: Lang; subject: string; body: string } {
  const m = MAIL[lang];
  const place = String(d.location_name || "").split(",")[0].trim();
  const loc = lang === "es" ? "es-ES" : lang;
  const home = [d.title, place && (d.title || "").includes(place) ? null : d.location_name, d.price_eur ? eur(Number(d.price_eur), loc) : null].filter(Boolean).join(", ");
  const lines = ids.map((id, i) => `${i + 1}. ${questionText(id, lang, feeText(d, loc))}`);
  const body = [m.hi, "", m.intro.replace("{home}", home), m.ask, "", ...lines, "", m.bye].join("\n");
  return { lang, subject: `${m.subj}: ${d.title || d.location_name || ""}`.trim(), body };
}
