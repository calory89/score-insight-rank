// English wording of the listing pages (seo/listings/pack.ts says what each entry is for).
import { the } from "../../src/community/seo2data";
import type { Pack, Facts, Form, Named } from "./pack";
import { areaBySlug, cityBySlug, NEAR_KM } from "./places";

const money = (n: number) => "€" + Math.round(n).toLocaleString("en");
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const pc = (x: string) => x.replace(/\s*[-–]\s*/g, " to ");
const s = (n: number, one: string, many = one + "s") => (n === 1 ? one : many);
const list = (l: Named[]) => l.map((x) => `${x.name} (${x.n})`).join(", ");
const upper = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
const dot = (x: string) => (x ? (/[.!?]$/.test(x.trim()) ? `: ${x.trim()}` : `: ${x.trim()}.`) : ".");
const range = (lo: string, hi: string) => (lo === hi ? `about ${lo}` : `${lo} to ${hi}`);

const NOUN = { house: ["houses", "house"], apartment: ["apartments", "apartment"], mixed: ["homes", "home"] } as const;
const KEYED: Record<string, (b: string, one: boolean) => string> = {
  "by-the-sea": (b) => `${b} by the sea`,
  "village-houses": (_b, one) => (one ? "village house" : "village houses"),
  "in-town": (b) => `${b} in town`,
  "near-a-lake": (b) => `${b} near a lake`,
  "with-garden": (b) => `${b} with a garden`,
  "with-pool": (b) => `${b} with a pool`,
  "with-sauna": (b) => `${b} with a sauna`,
  "stone-houses": (_b, one) => (one ? "stone house" : "stone houses"),
  "cabins-and-cottages": (_b, one) => (one ? "cabin or cottage" : "cabins and cottages"),
  "with-a-terrace": (b) => `${b} with a terrace or balcony`,
  // 15-nov-2026
  "turnkey": (b) => `move-in ready ${b}`,
  "to-renovate": (b) => `${b} to renovate`,
  "with-sea-view": (b) => `${b} with a sea view`,
  "near-the-beach": (b) => `${b} within 500 m of the sea`,
  "with-land": (b) => `${b} with 1,000 m² of land or more`,
  "with-fireplace": (b) => `${b} with a fireplace`,
  "with-garage": (b) => `${b} with a garage`,
  "on-an-island": (b) => `${b} on an island`,
  "in-the-mountains": (b) => `${b} in the mountains`,
  "with-olive-trees-or-vines": (b) => `${b} with olive trees, vines or fruit trees`,
  "near-an-airport": (b) => `${b} within 30 km of an airport`,
  "under-500-per-sqm": (b) => `${b} under €500 per m²`,
  "over-100-sqm-under-50000": (b) => `${b} over 100 m² under €50,000`,
  "score-90-plus": (b) => `${b} scoring 90 or more`,
  "editors-picks": (b) => `hand-picked ${b}`,
  "new-this-month": (b) => `${b} added in the last 30 days`,
  "price-drops": (b) => `${b} with a price cut`,
  "single-storey": (b) => `single-storey ${b}`,
  "with-period-features": (b) => `${b} with period features`,
  "good-weather": (b) => `${b} with 150 or more good-weather days a year`,
  "quiet-location": (b) => `${b} away from motorways and railways`,
  "low-community-fee": (b) => `${b} with a low community fee`,
  "cave-houses": (_b, one) => (one ? "cave house" : "cave houses"),
  trulli: (_b, one) => (one ? "trullo" : "trulli"),
  "unusual-buildings": (_b, one) => (one ? "castle, mill, church or other unusual building" : "castles, mills, churches and other unusual buildings"),
  "with-business-premises": (b) => `${b} with business premises`,
  "with-fibre-internet": (b) => `${b} with fibre internet`,
  "with-tourist-licence": (b) => `${b} with a tourist rental licence`,
};
const SYM: Record<string, string> = { GBP: "£", USD: "$", EUR: "€" };
const ccy = (n: number, c: string) => (SYM[c] || `${c} `) + Math.round(n).toLocaleString("en");
const areaOf = (f: { cc?: string; area?: string }) => areaBySlug(f.cc || "", f.area || "");
const cityOf = (f: { city?: string }) => cityBySlug(f.city || "")?.[1] || "";
// "Lundby, near Skælskør": some homes carry a note instead of a region; in a sentence it reads "the Skælskør area"
const place = (n: string, _cc?: string, where?: "card") => (/^near /.test(n) && where !== "card" ? `the ${n.slice(5)} area` : n);
const LABEL: Record<string, string> = { "by-the-sea": "By the sea", "village-houses": "Village houses", "in-town": "In town", "near-a-lake": "Near a lake", "with-garden": "With a garden", "with-pool": "With a pool", "with-sauna": "With a sauna", "stone-houses": "Stone houses", "cabins-and-cottages": "Cabins and cottages", "with-a-terrace": "With a terrace", apartments: "Apartments", houses: "Houses",
  "turnkey": "Move-in ready", "to-renovate": "To renovate", "with-sea-view": "Sea view", "near-the-beach": "500 m from the sea", "with-land": "With land", "with-fireplace": "With a fireplace", "with-garage": "With a garage",
  "on-an-island": "On an island", "in-the-mountains": "In the mountains", "with-olive-trees-or-vines": "Olive trees or vines", "near-an-airport": "Near an airport", "under-500-per-sqm": "Under €500/m²", "over-100-sqm-under-50000": "Over 100 m² under €50,000",
  "score-90-plus": "Score 90+", "editors-picks": "Hand-picked", "new-this-month": "New this month", "price-drops": "Price cuts", "single-storey": "Single-storey", "with-period-features": "Period features", "good-weather": "Good weather",
  "quiet-location": "Quiet location", "low-community-fee": "Low community fee", "cave-houses": "Cave houses", trulli: "Trulli", "unusual-buildings": "Unusual buildings", "with-business-premises": "Business premises", "with-fibre-internet": "Fibre internet", "with-tourist-licence": "Tourist licence",
  cheapest: "The cheapest", "most-space-for-the-money": "Most space for the money" };

function what(F: Facts, form: Form = "many"): string {
  const f = F.f; const one = form === "one" || form === "cheapest";
  const adj = form === "cheap" ? "cheap " : form === "cheapest" ? "cheapest " : "";
  const b = NOUN[f.kind === "ptype" ? (f.key === "apartments" ? "apartment" : "house") : F.noun][one ? 1 : 0];
  const inC = f.country ? ` in ${the(f.country)}` : "";
  const under = f.cap ? ` under ${f.kind === "ccyBand" ? ccy(f.cap, f.ccy!) : money(f.cap)}` : "";
  if (f.ranked) {
    if (f.key === "cheapest") return one ? `cheapest ${NOUN[F.noun][1]} for sale${inC}` : `${F.n} cheapest ${NOUN[F.noun][0]} for sale${inC}`;
    return one ? `${NOUN[F.noun][1]} with the most space for the money${inC}` : `${F.n} ${NOUN[F.noun][0]} with the most space for the money${inC}`;
  }
  switch (f.kind) {
    case "combo": return f.key === "apartments" || f.key === "houses" ? `${adj}${NOUN[f.key === "apartments" ? "apartment" : "house"][one ? 1 : 0]} for sale${inC}${under}` : `${adj}${KEYED[f.key!](b, one)}${inC}${under}`;
    case "area": return `${adj}${b} for sale ${areaOf(f)?.inEn || ""}`;
    case "near": return `${adj}${b} for sale within ${NEAR_KM} km of ${cityOf(f)}`;
    case "region": return `${adj}${b} for sale in ${place(f.region!)}, ${f.country}`;
    case "town": return `${adj}${b} for sale in ${f.town}, ${place(f.region!)}`;
    case "regionBand": return f.area ? `${adj}${b} for sale ${areaOf(f)?.inEn || ""}${under}` : `${adj}${b} for sale in ${place(f.region!)}, ${f.country}${under}`;
    case "setting": case "feature": case "gfeature": return `${adj}${KEYED[f.key!](b, one)}${inC}`;
    case "beds": return f.beds === 4 ? `${adj}${b} with 4 or more bedrooms for sale${inC}` : `${adj}${f.beds}-bedroom ${b} for sale${inC}`;
    default: return `${adj}${b} for sale${inC}${under}`;
  }
}

export const en: Pack = {
  lang: "en",
  money,
  perSqm: (n) => `${money(n)}/m²`,
  date: (d) => `${Number(d.slice(8, 10))} ${MONTHS[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`,
  dateShort: (d) => `${Number(d.slice(8, 10))} ${MONTHS[Number(d.slice(5, 7)) - 1].slice(0, 3)} ${d.slice(0, 4)}`,
  country: (c) => c,
  inC: (c) => `in ${the(c)}`,
  place,
  homeTitle: (h) => String(h.title || "") || null,
  homeWhy: (h) => String(h.why_great || ""),
  what,
  h1: (F) => (F.f.ranked ? `The ${what(F)}${F.f.country ? "" : " on RealHunt"}`
    : upper(what(F, (F.f.cap && F.f.cap <= 100000) || (["gfeature", "feature", "area", "near"].includes(F.f.kind) && F.median <= 100000) ? "cheap" : "many"))),
  title: (h1, n, min) => `${h1} (${n}, from ${min})`,
  desc: (F, w) => `${F.f.ranked ? `The ${w}` : `${F.n} ${w}`}, from ${money(F.min)} to ${money(F.max)}. Median ${money(F.median)}. Photos, sizes, scores, buying costs and what to watch out for.`,
  crumbRoot: "RealHunt", crumbCheap: "Cheap houses",
  crumbCountry: (c) => `Homes in ${c}`,
  label: (f) => (f.kind === "combo" ? `${LABEL[f.key!] || f.key} under ${money(f.cap!)}` : f.kind === "ccyBand" ? `Under ${ccy(f.cap!, f.ccy!)}` : f.kind === "area" ? areaOf(f)?.en || String(f.area) : f.kind === "near" ? `Near ${cityOf(f)}`
    : f.cap ? `Under ${money(f.cap)}` : f.kind === "region" ? upper(place(String(f.region)).replace(/^the /, "")) : f.kind === "town" ? String(f.town) : f.kind === "beds" ? (f.beds === 4 ? "4+ bedrooms" : `${f.beds} ${s(f.beds!, "bedroom")}`) : f.kind === "country" ? String(f.country) : LABEL[f.key!] || String(f.key)),
  updated: (d, newest) => `Updated ${d}.${newest ? ` Newest home added ${newest}.` : ""}`,
  l1: (n, w, min, max) => (min === max ? `RealHunt lists ${n} ${w} today, all priced at ${min}.` : `RealHunt lists ${n} ${w} today, priced from ${min} to ${max}.`),
  l2: (title, town, price, sqm, beds) => `The cheapest costs ${price}: ${title}, in ${town}${sqm || beds ? ` (${[sqm ? `${sqm} m²` : "", beds ? `${beds} ${s(beds, "bedroom")}` : ""].filter(Boolean).join(", ")})` : ""}.`,
  l3: (med, pp, pMed, pPp, parent) => `The median price is ${med}${pp ? ` (${pp})` : ""}, against ${pMed}${pPp ? ` (${pPp})` : ""} for ${parent}.`,
  l3all: (med, pp, max, parent) => `The median price is ${med}${pp ? ` (${pp})` : ""}. That is every one of ${parent}: none is priced above ${max}.`,
  parent: (kind, n, name, countries) => (kind === "site" ? `the ${n} homes on RealHunt in ${countries} countries` : kind === "country" ? `the ${n} homes we list ${name}` : `the ${n} homes we list in ${name}`),
  kpi: { homes: "Homes", from: "From", median: "Median price", ppsqm: "Median per m²", size: "Median size", score: "Top score" },
  gridTitle: (n, shown) => (n === shown ? `The ${n} homes, best score first` : `The ${shown} best of ${n}, by score`),
  gridMore: (shown, n) => `Showing the ${shown} best-scored of ${n} homes. The table and the narrower searches below cover the rest.`,
  card: { isNew: "New", drop: (p) => `Price cut ${p}%`, score: "Score", beds: (n) => `${n} bed`, noPhoto: "Photos on the listing" },
  tableTitle: (n, shown) => (n === shown ? `Compare the ${n} homes, cheapest first` : `Compare the ${shown} cheapest of ${n}`),
  th: { home: "Home", place: "Place", price: "Price", size: "Size", ppsqm: "Per m²", beds: "Beds", score: "Score", added: "Added" },
  factsTitle: (F) => (F.f.kind === "ccyBand" ? `What ${ccy(F.f.cap!, F.f.ccy!)} buys${F.f.country ? ` in ${the(F.f.country)}` : ""}` : F.f.cap && F.f.kind !== "combo" ? `What ${money(F.f.cap)} buys${F.f.area ? ` ${areaOf(F.f)?.inEn || ""}` : F.f.region ? ` in ${place(F.f.region)}` : F.f.country ? ` in ${the(F.f.country)}` : ""}` : `The ${F.n} homes in numbers`),
  fSize: (med, max, title) => `Size: half of them have ${med} m² or more. The largest has ${max} m²: ${title}.`,
  fBeds: (b, unknown) => `Bedrooms: ${b.map(([k, n], i) => `${n} with ${k === 4 ? "4 or more" : k}${i === 0 ? ` ${k === 1 ? "bedroom" : "bedrooms"}` : ""}`).join(", ")}${unknown ? `; ${unknown} ${s(unknown, "listing does", "listings do")} not say` : ""}.`,
  fType: (a, h) => `Type: ${[a ? `${a} ${s(a, "apartment")}` : "", h ? `${h} ${s(h, "house")}` : ""].filter(Boolean).join(" and ")}.`,
  fSetting: (sea, v, t) => `Setting: ${[sea ? `${sea} by the sea` : "", v ? `${v} in villages` : "", t ? `${t} in towns` : ""].filter(Boolean).join(", ")}.`,
  fWhere: (l) => `Where: ${list(l)}.`,
  fTowns: (l) => `Towns: ${list(l)}.`,
  fCountries: (l, more) => `Countries: ${list(l)}${more ? ` and ${more} more` : ""}.`,
  fStep: (from, to, n, title, nota, price) => `Between ${from} and ${to}: ${n} ${s(n, "home")}. The best rated of them (score ${nota}, ${price}): ${title}.`,
  fNext: (next, add) => `Raising the budget to ${next} adds ${add} more ${s(add, "home")}.`,
  fRegions: (low, high) => `Lowest median price: ${low.name}, ${low.median} across ${low.n} homes. Highest: ${high.name}, ${high.median} across ${high.n}.`,
  fScore: (min, max, title) => (min === max ? `Scores: all ${max} out of 98. First on the list: ${title}.` : `Scores: ${min} to ${max} out of 98. The best rated: ${title}.`),
  fNew: (n30, title, date) => `Newest, added ${date}: ${title}.${n30 ? ` ${n30} of these homes ${s(n30, "was", "were")} added in the last 30 days.` : ""}`,
  costsTitle: (inC) => `Buying costs and rules for foreigners ${inC}`,
  cForeign: (t) => `Can foreigners buy? ${t}`,
  cCosts: (pct, br, med, lo, hi, tLo, tHi) => `Taxes and fees add about ${pc(pct)}% to the price${dot(br)} On the median home on this page (${med}) that is ${range(lo, hi)}, so ${range(tLo, tHi)} in all.`,
  cAllIn: (cap, maxAsk, fit, n) => `To keep the whole purchase within ${cap}, look at asking prices up to about ${maxAsk}: ${fit === n ? `all ${n} homes on this page fit` : fit ? `${fit} of these ${n} homes ${s(fit, "fits", "fit")}` : `none of these ${n} homes fits`}.`,
  cTax: (t) => `Yearly property tax: ${t}`,
  cExamples: (rows) => `At the same percentages: ${rows.map(([p, lo, hi]) => `on ${p}, ${range(lo, hi)}`).join("; ")}.`,
  firstTitle: "Can you buy here? Read this first",
  cNote: (asOf) => `General information, not tax or legal advice.${asOf ? ` Figures checked in ${asOf}.` : ""}`,
  cLinks: { calc: (inC) => `Buying-cost calculator for a home ${inC}`, detail: "All costs and taxes", guide: "How to buy, step by step", nat: "Rules by nationality" },
  costTableTitle: "Buying costs in the countries on this page", costTh: { country: "Country", homes: "Homes here", from: "From", costs: "Taxes and fees" },
  watchTitle: "What to watch out for",
  wNoSqm: (k, n) => `${k} of the ${n} listings ${s(k, "gives", "give")} no floor area, so ${s(k, "its", "their")} price per m² cannot be compared.`,
  wHoa: (k, min, max) => `${k} ${s(k, "listing states", "listings state")} a monthly community fee, ${min === max ? `of ${min}` : `from ${min} to ${max}`}. Add it to your yearly costs.`,
  wHoaUnknown: (k) => `${k} ${s(k, "is", "are")} in a shared building or complex but the listing does not state the community fee: ask for it in writing.`,
  wWhyCheap: (title, t) => (t ? `A low price has a reason. ${title}: ${t}` : `A low price has a reason, and ${title} states its own on its page.`),
  wFlood: (k, n) => `${k} of ${n} ${s(k, "sits", "sit")} where our rough flood check reads medium or high. Each home page links the official flood map.`,
  wNoise: (k, n) => `${k} of ${n} ${s(k, "is", "are")} close to a motorway, a railway or an airport (high on our noise check).`,
  wOld: (k, n) => `${k} of ${n} ${s(k, "was", "were")} added more than 60 days ago. Ask the agent whether ${s(k, "it is", "they are")} still for sale before you plan a trip.`,
  wSold: (k) => `${k} ${s(k, "has", "have")} been reported by a visitor as possibly sold and ${s(k, "is", "are")} being rechecked.`,
  wApprox: (k, n) => `${k} of ${n} ${s(k, "shows", "show")} an approximate map position: the listing names the town, not the street.`,
  wDims: (weak, wa, strong, sa) => `As a group these homes score lowest on ${weak} (${wa}/100 on average) and highest on ${strong} (${sa}/100).`,
  wRental: (t) => `Planning to rent it out? ${t}`,
  dim: (k) => ({ price: "price", value: "price per m²", space: "space", condition: "move-in condition", extras: "extras", water: "distance to the sea or a lake", weather: "good-weather days", access: "distance to an airport", costs: "buying costs" } as Record<string, string>)[k] || k,
  faqTitle: "Questions buyers ask",
  qCheapest: (x) => `What is the ${x}?`,
  aCheapest: (title, town, price, sqm, beds, nota) => `${title} in ${town}, listed at ${price}${sqm ? `, ${sqm} m²` : ""}${beds ? `, ${beds} ${s(beds, "bedroom")}` : ""}.${nota ? ` Its RealHunt score is ${nota}.` : ""}`,
  qCount: (w) => `How many ${w} are there?`,
  aCount: (n, date, parent, n30) => `${n}, as of ${date}${parent ? `, out of ${parent}` : ""}.${n30 ? ` ${n30} ${s(n30, "was", "were")} added in the last 30 days.` : ""}`,
  qSize: (w) => `How big are the ${w}?`,
  aSize: (med, beds, max, town) => `The median is ${med} m²${beds ? `, and ${beds === 4 ? "4 or more bedrooms" : `${beds} ${s(beds, "bedroom")}`} is the most common layout` : ""}. The largest has ${max} m², in ${town}.`,
  qAllIn: (cap, inC) => `Is ${cap} enough to buy a home ${inC} once taxes and fees are added?`,
  aAllIn: (cap, pct, lo, hi, maxAsk, fit) => `Not if the asking price is ${cap}: with about ${pc(pct)}% in taxes and fees the total comes to ${range(lo, hi)}. To stay within ${cap} all in, look at asking prices up to about ${maxAsk}; ${fit ? `${fit} ${s(fit, "home")} on this page ${s(fit, "fits", "fit")}` : "no home on this page fits"}.`,
  qWhere: (w) => `Where are the ${w}?`,
  aWhere: (l) => `Mostly in ${list(l)}.`,
  qPrice: (one) => `How much does ${/^[aeiou]/i.test(one) ? "an" : "a"} ${one} cost?`,
  aPrice: (min, med, pp, max, n) => `Asking prices run from ${min} to ${max} across ${n} homes. The median is ${med}${pp ? `, or ${pp}` : ""}.`,
  qForeign: (inC) => `Can foreigners buy a house ${inC}?`,
  qCosts: (inC) => `What are the buying costs ${inC}?`,
  aCosts: (pct, br, med, lo, hi) => `About ${pc(pct)}% on top of the price${dot(br)} On the median home on this page (${med}) that is ${range(lo, hi)}. General information, not tax advice.`,
  qRegion: (inC) => `Which region is cheapest ${inC}?`,
  aRegion: (low, high) => `Among regions with at least 3 homes on RealHunt, ${low.name} has the lowest median price, ${low.median} across ${low.n} homes, and ${high.name} the highest, ${high.median}.`,
  qVs: (place, wider) => `Are homes in ${place} cheaper than in the rest of ${the(wider)}?`,
  aVs: (place, wider, med, pMed, pct, n, pn) => `The median asking price in ${place} is ${med} across ${n} homes, ${pct < 0 ? `${-pct}% below` : pct > 0 ? `${pct}% above` : "the same as"} the ${pMed} median of the ${pn} homes we list in ${the(wider)}.`,
  qCountries: (w) => `Which countries have ${w}?`,
  aCountries: (l) => `On RealHunt today: ${list(l)}.`,
  moreTitle: (F) => (F.f.country ? `More searches in ${the(F.f.country)}` : "More searches"),
  more: { budget: "By budget", region: "By region", setting: "By setting", type: "By type", beds: "By bedrooms", feature: "By feature", town: "By town", elsewhere: (l) => `${l} in other countries`, countries: "By country", all: "All cheap-house searches",
    area: "By area", combo: "By feature and budget", ccy: "In pounds and dollars", near: "Near a city", ranked: "Rankings" },
  ccy,
  city: (slug) => cityBySlug(slug)?.[1] || slug,
  how: (F, v) => {
    const f = F.f;
    if (f.ranked) return f.key === "cheapest"
      ? `These are the ${F.n} lowest asking prices among ${v.parent}, cheapest first. The list changes whenever a home is added, sold or repriced.`
      : `These are the ${F.n} lowest prices per m² among the ${v.total} homes with a floor area in the listing, out of ${v.parent}. A low price per m² often means a large house in a place few people are looking at.`;
    if (f.kind === "ccyBand") return `${v.cap} is ${v.eur} at the European Central Bank reference rate of ${v.date} (1 € = ${SYM[f.ccy!]}${v.rate}). The homes are for sale in euros or in their local currency: the amounts in ${f.ccy === "GBP" ? "pounds" : "dollars"} on this page are approximate and move with the rate.`;
    if (f.kind === "near") return `On this list: homes within ${NEAR_KM} km of the centre of ${cityOf(f)} in a straight line. The road is longer than the line, so check the journey before you count on a commute.`;
    if (f.kind === "area") { const a = areaOf(f); return a ? `${a.en} here means the homes we list in ${a.hoods ? "these neighbourhoods: " : ""}${v.regions}${a.sea ? " that are by the sea (5 km or less from the shore, or listed as a beach home)" : ""}.` : ""; }
    const HOW: Record<string, string> = {
      "turnkey": "On this list: homes whose listing says in words that they are ready to move into, turnkey or fully renovated. We have not inspected them: ask for the date of the work and the invoices.",
      "to-renovate": "On this list: homes whose listing says they need renovation or are sold as a project. Listings rarely price the work: get a written quote from a local builder before you make an offer.",
      "with-sea-view": "On this list: homes whose listing states a sea view in its text. A view can be a glimpse between roofs, so check the photos and the map.",
      "near-the-beach": "On this list: homes whose measured distance to the shore is 500 m or less in a straight line. The walk can be longer than the line.",
      "with-land": "On this list: homes whose listing states a plot of 1,000 m² or more, in m², hectares or acres. Check the figure against the land registry before you buy.",
      "with-fireplace": "On this list: homes whose listing shows or names a fireplace. Ask whether the chimney has been swept and inspected.",
      "with-garage": "On this list: homes whose listing names a garage.",
      "on-an-island": "On this list: homes on islands that people look for by name, from Tenerife and Sicily to Crete and Funen. Islands the size of a mainland are left out.",
      "in-the-mountains": "On this list: homes whose listing places them in the mountains, with mountain views or near a ski area.",
      "with-olive-trees-or-vines": "On this list: homes whose listing names olive trees, vines, an orchard or fruit trees.",
      "near-an-airport": "On this list: homes whose nearest airport is 30 km away or less in a straight line. The drive is longer than the line.",
      "under-500-per-sqm": "On this list: homes whose asking price divided by the floor area in the listing comes to less than €500 per m². A listing with no floor area cannot be on it.",
      "over-100-sqm-under-50000": "On this list: homes with 100 m² or more of floor area and an asking price of €50,000 or less.",
      "score-90-plus": "On this list: homes with a RealHunt score of 90 or more out of 98. The score compares price, space, condition, setting and buying costs with every other home on the site.",
      "editors-picks": "On this list: homes that a person on the RealHunt team marked as a pick after checking the listing. Nobody pays to be picked.",
      "new-this-month": "On this list: homes added to RealHunt in the last 30 days.",
      "price-drops": "On this list: homes whose asking price has gone down since we first listed them. The cut is the difference between the first price we saw and today's.",
      "single-storey": "On this list: homes whose listing says they are on one level: single-storey, a bungalow or all on one floor.",
      "with-period-features": "On this list: homes whose listing names their age or their period features: a century, original beams or floors, vaulted ceilings, a half-timbered or listed building. We do not hold the year of construction of every home.",
      "good-weather": "On this list: homes in places with 150 or more good-weather days a year, counted from climate normals: a high of 18 to 33 °C, dry and with light wind.",
      "quiet-location": "On this list: homes with no motorway or railway line found nearby on OpenStreetMap and a low reading on our noise check of roads, rail and airports. It is a map check, not a sound measurement.",
      "low-community-fee": "On this list: homes whose listing states a monthly community fee of 250 or less in its own currency (euros, dollars or pounds). Most listings do not state the fee, so they cannot be on it.",
      "cave-houses": "On this list: homes that the listing describes as a cave house or a cave home.",
      trulli: "On this list: homes that the listing describes as a trullo.",
      "unusual-buildings": "On this list: homes whose title names a castle, a manor, a mill, a tower house or a former church, school or station.",
      "with-business-premises": "On this list: homes whose title names a shop, a bar, a restaurant, a guest business or other commercial premises sold with the home. Whether the business can be reopened depends on local licences: ask the town hall.",
      "with-fibre-internet": "On this list: homes whose listing states fibre or high-speed internet. We do not test connections: ask the seller for a recent speed test.",
      "with-tourist-licence": "On this list: homes whose listing states a tourist rental licence. A licence can lapse when the home is sold: ask the town hall before you rely on it.",
    };
    return (f.kind === "feature" || f.kind === "gfeature") && f.key ? HOW[f.key] || "" : "";
  },
  l1rank: (w, min, max) => `The ${w} that RealHunt lists today cost from ${min} to ${max}.`,
  gridTitleRank: (key, n) => (key === "cheapest" ? `The ${n} homes, cheapest first` : `The ${n} homes, lowest price per m² first`),
  x: {
    amen: (l) => `Extras named in the listings: ${l.map(([k, n]) => `${n} with a ${k}`).join(", ")}.`,
    airport: (med, title, km, name, l) => `Airports: the median distance is ${med} km. The closest home is ${title}, ${km < 1 ? "under 1" : km} km from ${name}. Nearest airports: ${list(l)}.`,
    sea: (n, med, title, m) => `Distance to the sea, measured for ${n} of these homes: ${m} m for the closest (${title}) and a median of ${med.toLocaleString("en")} m.`,
    plot: (med, title, m2) => `Land: the median plot is ${med.toLocaleString("en")} m². The largest is ${m2.toLocaleString("en")} m²: ${title}.`,
    ppsqm: (title, low, high) => `Price per m²: from ${low} (${title}) to ${high}.`,
    score: (n, pct, parent, n95) => `${n} homes score 90 or more: ${pct}% of ${parent}.${n95 ? ` ${n95} of them ${s(n95, "scores", "score")} 95 or more.` : ""}`,
    fee: (n, min, max, yMin, yMax) => `Community fees stated in ${n} listings: ${min === max ? min : `${min} to ${max}`} a month, which is ${yMin === yMax ? yMin : `${yMin} to ${yMax}`} a year.`,
    drop: (title, pct, amount, med) => `Biggest cut: ${pct}% (${amount}) on ${title}. The median cut on this page is ${med}%.`,
    days: (med, title, v) => `Good-weather days: a median of ${med} a year. The most, ${v}: ${title}.`,
    elev: (n, med, title, v) => `Altitude, known for ${n} of these homes: a median of ${med.toLocaleString("en")} m. The highest, at ${v.toLocaleString("en")} m: ${title}.`,
    islands: (l) => `Islands: ${list(l)}.`,
    dist: (city, med, title, km, far) => `Distance to ${city} in a straight line: from ${km < 1 ? "under 1" : km} km (${title}) to ${far} km, with a median of ${med} km.`,
    rank: (key, n, title, v, of) => (key === "cheapest" ? `The cut-off today is ${v}: ${title} is number ${n} of ${of}.` : `The cut-off today is ${v}: ${title} is number ${n} of the ${of} homes with a floor area.`),
    vs: (other, med, n, oMed, on, pct) => `Against ${other}: the median here is ${med} across ${n} homes, ${pct}% below the ${oMed} median of the ${on} homes we list there.`,
  },
  noteSource: "Source", noteAsOf: (asOf) => `Checked ${asOf}. General information, not legal or tax advice.`,
  season: { title: "In season", winter: "For the winter", summer: "For the summer" },
  allIn: (inC, n) => `All ${n} homes ${inC}`,
  sources: (l) => `These listings come from ${l.map(([d, n]) => `${d} (${n})`).join(", ")}.`,
  notAgent: "RealHunt is not an estate agent and does not sell these homes: each one links to its original listing, and a person checked it before it went up.",
  alert: (inC) => `Email me new homes ${inC}`,
  filter: "Filter and sort these homes",
  method: "How the score works",
  moved: "This page has moved.",
};
