// English wording of the listing pages (seo/listings/pack.ts says what each entry is for).
import { the } from "../../src/community/seo2data";
import type { Pack, Facts, Form, Named } from "./pack";

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
};
// "Lundby, near Skælskør": some homes carry a note instead of a region; in a sentence it reads "the Skælskør area"
const place = (n: string, _cc?: string, where?: "card") => (/^near /.test(n) && where !== "card" ? `the ${n.slice(5)} area` : n);
const LABEL: Record<string, string> = { "by-the-sea": "By the sea", "village-houses": "Village houses", "in-town": "In town", "near-a-lake": "Near a lake", "with-garden": "With a garden", "with-pool": "With a pool", "with-sauna": "With a sauna", "stone-houses": "Stone houses", "cabins-and-cottages": "Cabins and cottages", "with-a-terrace": "With a terrace", apartments: "Apartments", houses: "Houses" };

function what(F: Facts, form: Form = "many"): string {
  const f = F.f; const one = form === "one" || form === "cheapest";
  const adj = form === "cheap" ? "cheap " : form === "cheapest" ? "cheapest " : "";
  const b = NOUN[f.kind === "ptype" ? (f.key === "apartments" ? "apartment" : "house") : F.noun][one ? 1 : 0];
  const inC = f.country ? ` in ${the(f.country)}` : "";
  const under = f.cap ? ` under ${money(f.cap)}` : "";
  switch (f.kind) {
    case "region": return `${adj}${b} for sale in ${place(f.region!)}, ${f.country}`;
    case "town": return `${adj}${b} for sale in ${f.town}, ${place(f.region!)}`;
    case "regionBand": return `${adj}${b} for sale in ${place(f.region!)}, ${f.country}${under}`;
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
  h1: (F) => upper(what(F, (F.f.cap && F.f.cap <= 100000) || (["gfeature", "feature"].includes(F.f.kind) && F.median <= 100000) ? "cheap" : "many")),
  title: (h1, n, min) => `${h1} (${n}, from ${min})`,
  desc: (F, w) => `${F.n} ${w}, from ${money(F.min)} to ${money(F.max)}. Median ${money(F.median)}. Photos, sizes, scores, buying costs and what to watch out for.`,
  crumbRoot: "RealHunt", crumbCheap: "Cheap houses",
  crumbCountry: (c) => `Homes in ${c}`,
  label: (f) => (f.cap ? `Under ${money(f.cap)}` : f.kind === "region" ? upper(place(String(f.region)).replace(/^the /, "")) : f.kind === "town" ? String(f.town) : f.kind === "beds" ? (f.beds === 4 ? "4+ bedrooms" : `${f.beds} ${s(f.beds!, "bedroom")}`) : f.kind === "country" ? String(f.country) : LABEL[f.key!] || String(f.key)),
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
  factsTitle: (F) => (F.f.cap ? `What ${money(F.f.cap)} buys${F.f.region ? ` in ${place(F.f.region)}` : F.f.country ? ` in ${the(F.f.country)}` : ""}` : `The ${F.n} homes in numbers`),
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
  qPrice: (one) => `How much does a ${one} cost?`,
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
  more: { budget: "By budget", region: "By region", setting: "By setting", type: "By type", beds: "By bedrooms", feature: "By feature", town: "By town", elsewhere: (l) => `${l} in other countries`, countries: "By country", all: "All cheap-house searches" },
  allIn: (inC, n) => `All ${n} homes ${inC}`,
  sources: (l) => `These listings come from ${l.map(([d, n]) => `${d} (${n})`).join(", ")}.`,
  notAgent: "RealHunt is not an estate agent and does not sell these homes: each one links to its original listing, and a person checked it before it went up.",
  alert: (inC) => `Email me new homes ${inC}`,
  filter: "Filter and sort these homes",
  method: "How the score works",
  moved: "This page has moved.",
};
