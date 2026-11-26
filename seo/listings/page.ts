// One listing page: which sentences it gets (from the facts) and its HTML and structured data (14-nov-2026).
// The language pack only words things; this file is the same for every language, so the English page, its Spanish
// twin and the German and Russian versions always say the same facts about the same homes in the same order.
import { thumb, cardSrcSet, CARD_SIZES } from "../../src/lib/thumbs";
import { toMedia } from "../../src/lib/media";
import { type Facet, type Home, eurCap, bySea } from "./facets";
import { regionName, NEIGHBOURS } from "./places";
import { type Facts, type Ref, ref } from "./facts";
import type { Pack, Named } from "./pack";

export const SITE = "https://realhunt.co";
export const CARDS = 30;   // homes shown as cards (best score first)
export const ROWS = 60;    // homes in the comparison table (cheapest first)
/** 26-nov-2026 (idea 98): lists of BIG homes or more carry half the table in the HTML (the rest is on the narrower
 * pages and, for a country, on its numbered pages). */
export const BIG = 100, ROWS_BIG = 30;
/** Country pages with more homes than this get numbered pages, /homes/<country>/page/2... (idea 66). */
export const PAGED = ROWS;
const NEW_DAYS = 14;

const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/** A link inside a sentence: lk("/deal/x", "Title") -> "[[/deal/x|Title]]", turned into <a> by rich() and into plain text by plain(). */
export const lk = (path: string, text: string) => `[[${path}|${text.replace(/[\[\]|]/g, " ")}]]`;
const LINK = /\[\[([^|\]]+)\|([^\]]+)\]\]/g;
export const plain = (s: string) => s.replace(LINK, "$2");

export type Link = [text: string, path: string, count?: number];
export type Text = {
  path: string; h1: string; title: string; desc: string; crumbs: [string, string][];
  updated: string; lede: string[]; kpi: [string, string][]; chips: Link[];
  gridTitle: string; gridMore: string; cards: Home[];
  tableTitle: string; rows: Home[];
  factsTitle: string; facts: string[];
  costsTitle: string; costs: string[]; costLinks: Link[]; costNote: string; costTable: Facts["countries"];
  watch: string[]; faq: [string, string][];
  moreTitle: string; more: [string, Link[]][];
  foot: string[]; footLinks: Link[];
  image: string; lastmod: string | null;
  /** Country pages where not everybody can buy freely: the rule, above the homes. */
  first: string;
  /** How a home gets on this list (families of 15-nov-2026); "" when the name says it all. */
  how: string;
  /** Budgets in pounds or dollars: the cards and the table add the approximate amount in that currency. */
  fx: { ccy: string; rate: number } | null;
  /** Sourced notes for this page (seo/listings/notes.ts). */
  notes: Note[];
  /** Country pages: the median price of every region, in a table (20-nov-2026). Empty when a region has no name in this language. */
  regionsTitle: string; regionTable: [name: string, path: string, n: number, median: string][];
  /** 26-nov-2026 (list 1000, ideas 51 to 100): only with a pack that has the words (English, Spanish). */
  t2: T2Text | null;
};
export type T2Text = {
  top: [label: string, home: Home][]; order: string; money: string;
  townsTitle: string; towns: [name: string, path: string, n: number, median: string][];
  near: Link[]; checked: string; removed: string; howChosen: string; ppsqmRef: string;
  sea: { n: number; page: string } | null; map: string; csvName: string;
  /** slug -> town page, for the place column of the table (idea 87) */
  townLink: Record<string, string>;
  /** country pages with numbered pages */
  pager: { of: number; base: string } | null;
  total: number;
};
export type Note = { id: string; h: string; p: string[]; sources: [string, string][]; asOf: string };

export type Site = { pages: Facet[]; live: Set<string>; hasGuide(cc: string): boolean; hasCalc(cc: string): boolean; hasCosts(cc: string): boolean; restricted?(cc: string): boolean; notes?(F: Facts, lang: string): Note[];
  /** Whether the buying rules of a country are known (src/data/buyrules.json): "free" when no group of buyers has a limit. */
  buyRule?(cc: string): "free" | "limits" | null };

const firstSentence = (s: string) => {
  const one = String(s || "").replace(/\s+/g, " ").trim().split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑÄÖÜА-Я¿¡0-9€])/)[0] || "";
  if (one.length <= 150) return one;
  const cut = one.slice(0, 147); return cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:(]$/, "") + "…";
};

/** The words of one page. null when the language cannot name something on it (then the page is not published in
 * that language: a page that is half in another language is worse than no page). */
export function compose(F: Facts, P: Pack, site: Site): Text | null {
  const f = F.f;
  let ok = true;
  const pl = (name: string) => { const x = P.place(name, f.cc); if (x == null) { ok = false; return name; } return x; };
  const tt = (h: Home) => { const x = P.homeTitle(h); if (x == null) { ok = false; return String(h.title || ""); } return x; };
  const home = (r: Ref) => lk(`/deal/${r.slug}`, tt(r.home));
  const named = (l: { name: string; n: number }[]) => l.map((x) => ({ name: pl(x.name), n: x.n }));
  const inC = f.country ? P.inC(f.country) : "";
  const what = P.what(F), one = P.what(F, "one");
  const h1 = P.h1(F);
  const money = P.money;

  // ---- top
  const lede = [f.ranked ? P.l1rank(what, money(F.min), money(F.max)) : P.l1(F.n, what, money(F.min), money(F.max)), P.l2(home(F.cheapest), pl(F.cheapest.town), money(F.cheapest.price), F.cheapest.sqm, F.cheapest.beds)];
  const areaLabel = f.area ? P.label({ kind: "area", area: f.area, cc: f.cc }) : "";
  const parent = P.parent(F.parent.kind, F.parent.n, F.parent.kind === "region" ? (f.regionSlug ? pl(F.parent.name) : areaLabel) : F.parent.name ? P.inC(F.parent.name) : "", F.parent.countries);
  lede.push(F.isAll && F.parent.kind !== "site"
    ? P.l3all(money(F.median), F.ppsqm ? P.perSqm(F.ppsqm) : "", money(F.max), parent)
    : P.l3(money(F.median), F.ppsqm ? P.perSqm(F.ppsqm) : "", money(F.parent.median), F.parent.ppsqm && F.ppsqm ? P.perSqm(F.parent.ppsqm) : "", parent));
  const kpi: [string, string][] = [[P.kpi.homes, String(F.n)], [P.kpi.from, money(F.min)], [P.kpi.median, money(F.median)]];
  if (F.ppsqm) kpi.push([P.kpi.ppsqm, P.perSqm(F.ppsqm)]);
  if (F.sqmMedian) kpi.push([P.kpi.size, `${F.sqmMedian} m²`]);
  if (F.scoreMax) kpi.push([P.kpi.score, String(F.scoreMax)]);
  // country pages: what a buyer asks first, in the same box (20-nov-2026, idea 27)
  if (f.kind === "country" && f.cc) {
    if (F.dest?.purchase_costs_pct) kpi.push([P.n20.costs, `${String(F.dest.purchase_costs_pct).replace(/\s*[-–]\s*/g, "–")}%`]);
    const rule = site.buyRule?.(f.cc); if (rule) kpi.push([P.n20.foreign, rule === "free" ? P.n20.free : P.n20.limits]);
    kpi.push([P.n20.asOf, P.dateShort(F.updated)]);
  }

  // ---- sibling pages (same country, or all countries)
  const sib = (kind: Facet["kind"], extra: (p: Facet) => boolean = () => true) => site.pages.filter((p) => !p.thin && p.kind === kind && p.cc === f.cc && extra(p));
  const link = (p: Facet): Link => [P.label(p), p.path, p.homes.length];
  const bands = (f.regionSlug || f.area ? sib("regionBand", (p) => p.regionSlug === f.regionSlug && p.area === f.area) : []).concat(sib(f.cc ? "band" : "gband")).sort((a, b) => (a.kind === b.kind ? a.cap! - b.cap! : a.kind === "regionBand" ? -1 : 1));
  const chips: Link[] = bands.filter((p) => p.kind === (f.kind === "regionBand" ? "regionBand" : f.cc ? "band" : "gband")).map(link);

  // ---- how a home gets on this list, and the numbers only this family has
  const x = F.x;
  const how = P.how(F, {
    regions: (x.areaRegions || []).map((r) => `${pl(r.name)} (${r.n})`).join(", "), total: x.rank?.of || 0, parent,
    cap: x.fx ? P.ccy(x.fx.cap, x.fx.ccy) : "", eur: x.fx ? money(x.fx.capEur) : "", rate: x.fx ? x.fx.rate.toFixed(4) : "", date: x.fx?.date ? P.date(x.fx.date) : "",
  });
  const own: string[] = [];
  if (x.rank) own.push(P.x.rank(f.key!, F.n, home(x.rank.last), f.key === "cheapest" ? money(x.rank.v) : f.key === "best-rated" ? String(x.rank.v) : P.perSqm(x.rank.v), x.rank.of));
  if (x.dist) own.push(P.x.dist(P.city(f.city || ""), x.dist.med, home(x.dist.near), x.dist.km, x.dist.far));
  if (x.vs) own.push(P.x.vs(lk(x.vs.path, P.label(x.vs.label)), money(F.median), F.n, money(x.vs.med), x.vs.n, x.vs.pct));
  if (x.islands) own.push(P.x.islands(named(x.islands)));
  if (x.sea) own.push(P.x.sea(x.sea.n, x.sea.med, home(x.sea.near), x.sea.m));
  if (x.airport) own.push(P.x.airport(x.airport.med, home(x.airport.near), x.airport.km, x.airport.name, x.airport.list, x.airport.code, x.airport.codes));
  if (x.plot) own.push(P.x.plot(x.plot.med, home(x.plot.max), x.plot.m2));
  if (x.ppsqm) own.push(P.x.ppsqm(home(x.ppsqm.low), P.perSqm(x.ppsqm.v), P.perSqm(x.ppsqm.high)));
  if (x.score) own.push(P.x.score(F.n, x.score.pct, parent, x.score.n95));
  if (x.fee) own.push(P.x.fee(x.fee.n, P.ccy(x.fee.min, x.fee.ccy), P.ccy(x.fee.max, x.fee.ccy), P.ccy(x.fee.min * 12, x.fee.ccy), P.ccy(x.fee.max * 12, x.fee.ccy)));
  if (x.drop) own.push(P.x.drop(home(x.drop.max), x.drop.pct, money(x.drop.amount), x.drop.med));
  if (x.days) own.push(P.x.days(x.days.med, home(x.days.max), x.days.v));
  if (x.elev) own.push(P.x.elev(x.elev.n, x.elev.med, home(x.elev.max), x.elev.v));

  // ---- facts
  const facts: string[] = [...own];
  if (F.step) facts.push(P.fStep(money(F.step.from), money(f.cap!), F.step.n, home(F.step.best), F.step.best.nota, money(F.step.best.price)));
  if (F.next && F.next.n > F.n) facts.push(P.fNext(money(F.next.cap), F.next.n - F.n));
  if (F.sqmMedian && F.sqmMax) facts.push(P.fSize(F.sqmMedian, F.sqmMax.sqm, home(F.sqmMax)));
  const bedsKnown = F.beds.reduce((a, [, n]) => a + n, 0);
  if (f.kind !== "beds" && F.beds.length) facts.push(P.fBeds(F.beds, F.n - bedsKnown));
  if (f.kind !== "ptype" && F.types.apartment + F.types.house > 0) facts.push(P.fType(F.types.apartment, F.types.house));
  if (f.kind !== "setting" && !(f.kind === "gfeature" && (f.key === "by-the-sea" || f.key === "village-houses")) && F.settings.sea + F.settings.village + F.settings.town > 0) facts.push(P.fSetting(F.settings.sea, F.settings.village, F.settings.town));
  if (!f.cc && F.countries.length) facts.push(P.fCountries(F.countries.slice(0, 6).map((c) => ({ name: P.country(c.name), n: c.n })), Math.max(0, F.countries.length - 6)));
  else if (f.kind === "region" || f.kind === "regionBand") { if (F.towns.length >= 2) facts.push(P.fTowns(named(F.towns.slice(0, 8)))); }
  else if (f.kind !== "town" && F.regions.length >= 2) facts.push(P.fWhere(named(F.regions.slice(0, 6))));
  const regs3 = F.regions.filter((r) => r.n >= 3).sort((a, b) => a.median - b.median);
  const low = regs3[0], high = regs3[regs3.length - 1];
  const lowHigh = f.kind === "country" && regs3.length >= 2 && low.median < high.median
    ? [{ name: pl(low.name), n: low.n, median: money(low.median) }, { name: pl(high.name), n: high.n, median: money(high.median) }] as const : null;
  if (lowHigh) facts.push(P.fRegions(lowHigh[0], lowHigh[1]));
  if (x.amen.length >= 2) facts.push(P.x.amen(x.amen));
  if (F.scoreMax) facts.push(P.fScore(F.scoreMin, F.scoreMax, home(F.best)));
  if (F.newest?.day) facts.push(P.fNew(F.new30, home(F.newest), P.date(F.newest.day)));
  if (P.t2 && f.kind === "beds" && F.t2.sqmPerBed) facts.push(P.t2.sqmPerBed(F.t2.sqmPerBed, F.t2.sqmPerBedN));

  // ---- costs
  const first = f.kind === "country" && !f.thin && F.dest?.can_foreigners_buy && site.restricted?.(f.cc!) ? String(F.dest.can_foreigners_buy) : "";
  const costs: string[] = []; const costLinks: Link[] = []; let costNote = "";
  const d = F.dest;
  if (d && f.cc) {
    if (d.can_foreigners_buy && !first) costs.push(P.cForeign(String(d.can_foreigners_buy)));
    if (F.cost) {
      costs.push(P.cCosts(F.cost.pct, String(d.purchase_costs_breakdown || ""), money(F.median), money(F.cost.lo), money(F.cost.hi), money(F.cost.totalLo), money(F.cost.totalHi)));
      if (f.kind === "country") costs.push(P.cExamples(F.cost.examples.map(([p, lo, hi]) => [money(p), money(lo), money(hi)])));
      if (f.cap && F.cost.maxAsk) costs.push(P.cAllIn(money(f.cap), money(F.cost.maxAsk), F.cost.fit, F.n));
    }
    if (d.annual_property_tax && f.kind === "country") costs.push(P.cTax(String(d.annual_property_tax)));
    if (site.hasCalc(f.cc)) costLinks.push([P.cLinks.calc(inC), `/buying-costs/${f.cc}`]);
    if (site.hasCosts(f.cc)) costLinks.push([P.cLinks.detail, `/costs/${f.cc}`]);
    if (site.hasGuide(f.cc)) costLinks.push([P.cLinks.guide, `/guide/${f.cc}`]);
    costLinks.push([P.cLinks.nat, "/can-i-buy"]);
    // idea 74: the calculator made for this country, and what a home costs to keep
    if (P.t2) { const tool = COUNTRY_TOOL[f.cc]; if (tool && P.t2.tools[tool]) costLinks.push([P.t2.tools[tool], `/tools/${tool}`]); if (P.t2.tools["home-running-costs"]) costLinks.push([P.t2.tools["home-running-costs"], "/tools/home-running-costs"]); }
    costNote = P.cNote(String(d.as_of || ""));
  }
  const costTable = !f.cc ? F.countries.filter((c) => c.pct).slice(0, 10) : [];

  // ---- what to watch out for (only what the data of these homes shows)
  const w = F.watch; const watch: string[] = [];
  if (w.whyCheap) watch.push(P.wWhyCheap(home(w.whyCheap.ref), P.lang === "en" ? w.whyCheap.text : P.lang === "es" && w.whyCheap.ref.home.why_cheap_es ? String(w.whyCheap.ref.home.why_cheap_es) : ""));
  if (w.noSqm) watch.push(P.wNoSqm(w.noSqm, F.n));
  if (w.hoa) watch.push(P.wHoa(w.hoa.n, `${w.hoa.min} ${w.hoa.ccy}`, `${w.hoa.max} ${w.hoa.ccy}`));
  if (w.hoaUnknown) watch.push(P.wHoaUnknown(w.hoaUnknown));
  if (w.flood) watch.push(P.wFlood(w.flood, F.n));
  if (w.noise) watch.push(P.wNoise(w.noise, F.n));
  if (w.old) watch.push(P.wOld(w.old, F.n));
  if (w.sold) watch.push(P.wSold(w.sold));
  if (w.approx) watch.push(P.wApprox(w.approx, F.n));
  if (w.weak && w.strong && w.weak[0] !== w.strong[0]) watch.push(P.wDims(P.dim(w.weak[0]), w.weak[1], P.dim(w.strong[0]), w.strong[1]));
  if (d?.holiday_rental_rules && (f.kind === "country" || (f.kind === "setting" && f.key === "by-the-sea"))) watch.push(P.wRental(String(d.holiday_rental_rules)));
  const watchOut = watch.filter((x) => x).slice(0, 7);

  // ---- questions, each answered with this page's numbers
  const faq: [string, string][] = [];
  const qCheapest = (): [string, string] => [P.qCheapest(P.what(F, "cheapest")), P.aCheapest(tt(F.cheapest.home), pl(F.cheapest.town), money(F.cheapest.price), F.cheapest.sqm, F.cheapest.beds, F.cheapest.nota)];
  const qPrice = (): [string, string] => [P.qPrice(one), P.aPrice(money(F.min), money(F.median), F.ppsqm ? P.perSqm(F.ppsqm) : "", money(F.max), F.n)];
  const qCount = (): [string, string] => [P.qCount(what), P.aCount(F.n, P.date(F.updated), F.isAll ? "" : parent, F.new30)];
  const bedsMode = F.beds.slice().sort((a, b) => b[1] - a[1])[0]?.[0] || 0;
  const qSize = (): [string, string] | null => (F.sqmMedian && F.sqmMax ? [P.qSize(what), P.aSize(F.sqmMedian, bedsMode, F.sqmMax.sqm, pl(F.sqmMax.town))] : null);
  const qWhere = (): [string, string] | null => (F.regions.length >= 2 ? [P.qWhere(what), P.aWhere(named(F.regions.slice(0, 5)))] : null);
  const push = (x: [string, string] | null) => { if (x) faq.push(x); };
  if (f.kind === "country") {
    push(qPrice()); push(qCheapest());
    if (d?.can_foreigners_buy) faq.push([P.qForeign(inC), String(d.can_foreigners_buy)]);
    if (F.cost) faq.push([P.qCosts(inC), P.aCosts(F.cost.pct, String(d!.purchase_costs_breakdown || ""), money(F.median), money(F.cost.lo), money(F.cost.hi))]);
    if (lowHigh) faq.push([P.qRegion(inC), P.aRegion(lowHigh[0], lowHigh[1])]);
  } else if (f.kind === "band" || f.kind === "regionBand" || f.kind === "bedsBand") {
    push(qCheapest()); push(qCount()); push(qSize());
    if (F.cost && F.cost.maxAsk) faq.push([P.qAllIn(money(f.cap!), inC), P.aAllIn(money(f.cap!), F.cost.pct, money(F.cost.capLo), money(F.cost.capHi), money(F.cost.maxAsk), F.cost.fit)]);
    if (f.kind === "band") push(qWhere());
  } else if (f.ranked) {
    if (f.key === "cheapest") push(qCheapest());
    push(qWhere()); push(qSize());
    if (!f.cc && F.countries.length >= 2) faq.push([P.qCountries(what), P.aCountries(F.countries.slice(0, 6).map((c) => ({ name: P.country(c.name), n: c.n })))]);
  } else if (f.kind === "region" || f.kind === "town") {
    push(qCheapest());
    const here = pl(f.kind === "town" ? f.town! : f.region!), wider = f.kind === "town" && F.parent.kind === "region" ? pl(f.region!) : P.country(f.country!);
    if (!F.isAll && F.parent.median) faq.push([P.qVs(here, wider), P.aVs(here, wider, money(F.median), money(F.parent.median), Math.round((F.median / F.parent.median - 1) * 100), F.n, F.parent.n)]);
    push(qSize()); push(qCount());
  } else if (f.cc) {
    push(qPrice()); push(qCheapest()); push(qWhere()); push(qSize());
  } else {
    if (F.countries.length >= 2) faq.push([P.qCountries(what), P.aCountries(F.countries.slice(0, 6).map((c) => ({ name: P.country(c.name), n: c.n })))]);
    push(qCheapest()); push(qSize()); push(qCount());
  }

  // ---- other searches
  const more: [string, Link[]][] = [];
  const group = (label: string, links: Link[]) => { const l = links.filter(([, p]) => p !== f.path); if (l.length) more.push([label, l]); };
  if (f.cc) {
    group(P.more.budget, bands.map(link));
    group(P.more.setting, sib("setting").map(link));
    group(P.more.type, sib("ptype").map(link));
    group(P.more.beds, sib("beds").sort((a, b) => a.beds! - b.beds!).map(link));
    if (f.kind === "beds" || f.kind === "bedsBand") group(P.label({ kind: "beds", beds: f.beds }), sib("bedsBand", (p) => p.beds === f.beds).sort((a, b) => a.cap! - b.cap!).map(link));
    if (f.regionSlug) group(P.more.town, sib("town", (p) => p.regionSlug === f.regionSlug).map(link));
    group(P.more.region, sib("region").slice(0, 24).map(link));
    group(P.more.area, sib("area").map(link));
    group(P.more.feature, sib("feature", (p) => !p.ranked).map(link));
    group(P.more.ranked, sib("feature", (p) => !!p.ranked).map(link));
    // trait + budget: on a trait or a budget page the ones that share it, elsewhere the biggest
    const combos = sib("combo");
    const mine = combos.filter((p) => (f.key && p.key === f.key) || (f.cap && f.kind !== "ccyBand" && p.cap === f.cap));
    group(P.more.combo, (mine.length ? mine : combos).slice(0, 12).map(link));
    group(P.more.ccy, sib("ccyBand", (p) => p.regionSlug === f.regionSlug).sort((a, b) => String(a.ccy).localeCompare(String(b.ccy)) || a.cap! - b.cap!).map(link));
    const here = new Set(f.homes.map((h) => h.slug));
    group(P.more.near, site.pages.filter((p) => p.kind === "near" && p.homes.some((h) => here.has(h.slug))).map(link));
    // the same search in other countries
    const same = site.pages.filter((p) => !p.thin && p.cc && p.cc !== f.cc && p.kind === f.kind && !(p.kind === "ccyBand" && p.regionSlug) && (f.kind === "band" ? p.cap === f.cap : f.kind === "beds" ? p.beds === f.beds : ["setting", "ptype", "feature"].includes(f.kind) ? p.key === f.key : f.kind === "combo" ? p.key === f.key && p.cap === f.cap : f.kind === "ccyBand" ? p.ccy === f.ccy && p.cap === f.cap : false))
      .sort((a, b) => b.homes.length - a.homes.length).slice(0, 10);
    if (same.length) group(P.more.elsewhere(P.label(f)), same.map((p): Link => [P.country(p.country!), p.path, p.homes.length]));
    if (f.kind === "country") group(P.n20.neighbours, (NEIGHBOURS[f.cc!] || []).map((c) => site.pages.find((p) => p.kind === "country" && p.cc === c && !p.thin)).filter((p): p is Facet => !!p).map((p): Link => [P.country(p.country!), p.path, p.homes.length]));
    if (f.kind === "country") group(P.more.countries, site.pages.filter((p) => p.kind === "country" && !p.thin).sort((a, b) => b.homes.length - a.homes.length).map((p): Link => [P.country(p.country!), p.path, p.homes.length]));
  } else {
    group(P.more.budget, bands.map(link));
    group(P.more.feature, site.pages.filter((p) => p.kind === "gfeature" && !p.ranked).map(link));
    group(P.more.ranked, site.pages.filter((p) => p.kind === "gfeature" && p.ranked).map(link));
    group(P.more.combo, site.pages.filter((p) => p.kind === "combo" && !p.cc).map(link));
    group(P.more.ccy, site.pages.filter((p) => p.kind === "ccyBand" && !p.cc).map(link));
    group(P.more.near, site.pages.filter((p) => p.kind === "near").map(link));
    group(P.more.countries, F.countries.filter((c) => c.path).slice(0, 14).map((c): Link => [P.country(c.name), c.path, c.n]));
  }

  // ---- foot
  const foot = [F.sources.length ? P.sources(F.sources) : "", P.notAgent].filter(Boolean);
  const footLinks: Link[] = [];
  if (f.cc && f.kind !== "country" && site.live.has(`/homes/${f.cc}`)) footLinks.push([P.allIn(inC, F.parent.kind === "country" ? F.parent.n : site.pages.find((p) => p.path === `/homes/${f.cc}`)!.homes.length), `/homes/${f.cc}`]);
  if (f.country) footLinks.push([P.alert(inC), `/alerts?country=${encodeURIComponent(f.country)}${eurCap(f) ? `&max=${eurCap(f)}` : ""}`], [P.filter, `/?${new URLSearchParams({ country: f.country, ...(eurCap(f) ? { price: String(eurCap(f)) } : {}) })}#filters`]);
  footLinks.push([P.more.all, "/cheap-houses"], [P.method, "/method"]);
  // every page and every home of the country on one page (seo/polishRelated.ts sitemapPages), English and Spanish only
  if (f.kind === "country" && !f.thin && P.n20.siteMap(inC)) footLinks.push([P.n20.siteMap(inC), `${P.lang === "es" ? "/es" : ""}/sitemap/${f.cc}`]);

  // ---- breadcrumb
  const crumbs: [string, string][] = [[P.crumbRoot, "/"]];
  if (f.cc) {
    if (f.kind !== "country") crumbs.push([P.crumbCountry(P.country(f.country!)), `/homes/${f.cc}`]);
    if ((f.kind === "town" || f.kind === "regionBand" || f.kind === "ccyBand") && f.regionSlug) crumbs.push([pl(f.region!), `/homes/${f.cc}/${f.regionSlug}`]);
    if (f.kind === "regionBand" && f.area) crumbs.push([areaLabel, `/homes/${f.cc}/${f.area}`]);
    if (f.kind === "bedsBand" && site.live.has(f.parent) && f.parent !== `/homes/${f.cc}`) crumbs.push([P.label({ kind: "beds", beds: f.beds }), f.parent]);
    crumbs.push([f.kind === "country" ? P.crumbCountry(P.country(f.country!)) : P.label(f), f.path]);
  } else crumbs.push([P.crumbCheap, "/cheap-houses"], [P.label(f), f.path]);

  const cards = f.homes.slice(0, CARDS);
  const rows = f.homes.slice().sort((a, b) => a.price_eur - b.price_eur || String(a.slug).localeCompare(String(b.slug))).slice(0, P.t2 && f.homes.length >= BIG ? ROWS_BIG : ROWS);
  for (const h of new Set([...cards, ...rows])) { tt(h); pl(ref(h).town); const rg = regionName(h); if (rg) pl(rg); }
  if (!ok) return null;
  // the median of every region of a country, cheapest first; left out when a region has no name in this language
  let regionTable: Text["regionTable"] = [];
  if (f.kind === "country" && F.regions.length >= 2) {
    const named = F.regions.slice().sort((a, b) => a.median - b.median || b.n - a.n || a.name.localeCompare(b.name)).map((r) => [P.place(r.name, f.cc), r] as const);
    if (named.every(([n]) => n != null)) regionTable = named.map(([n, r]): Text["regionTable"][number] => [n!, r.path && site.live.has(r.path) ? r.path : "", r.n, money(r.median)]);
  }
  const img = f.homes.find((h) => h.image_urls?.[0])?.image_urls?.[0];
  let t2: T2Text | null = null;
  if (P.t2) {
    const W = P.t2; const t = F.t2;
    const topLabel = { best: W.top.best, cheapest: W.top.cheapest, space: W.top.space };
    const towns = t.towns.map(({ name, path, n, median }) => [P.place(name, f.cc), path, n, money(median)] as const);
    const townLink: Record<string, string> = {};
    if (f.cc) { const tp = site.pages.filter((p) => p.kind === "town" && p.cc === f.cc && !p.thin); for (const h of new Set([...cards, ...rows])) { const x = tp.find((p) => p.town === ref(h).town && p.homes.some((y) => y.slug === h.slug)); if (x && x.path !== f.path) townLink[String(h.slug)] = x.path; } }
    // the filter by the sea inside the page: only where it splits the list, and never on a page that is about the sea
    const seaN = f.homes.filter(bySea).length;
    const seaish = f.kind === "setting" && f.key === "by-the-sea" || ["by-the-sea", "near-the-beach", "with-sea-view"].includes(String(f.key)) || !!(f.area && /coast|costa|riviera|island/.test(String(f.area)));
    const seaPage = [f.cc ? `/homes/${f.cc}/by-the-sea` : "", "/cheap-houses/by-the-sea"].find((p) => p && site.live.has(p)) || "";
    const mapQ = new URLSearchParams({ ...(f.country ? { country: String(f.country) } : {}), ...(eurCap(f) ? { price: String(eurCap(f)) } : {}) }).toString();
    t2 = {
      top: t.top3.map((x) => [topLabel[x.key], x.ref.home] as [string, Home]),
      order: W.order(P.th.price),
      money: t.money3.length === 3 ? W.money3(t.money3.map((r) => ({ lo: money(r.lo), hi: money(r.hi), n: r.n, sqm: r.sqm, beds: r.beds }))) : "",
      townsTitle: towns.length && towns.every(([n]) => n != null) ? W.townsTitle(pl(f.region || "")) : "", towns: towns.every(([n]) => n != null) ? towns.map(([n, p, k, m]) => [n!, p, k, m]) : [],
      near: t.nearRegions.map((r): Link => [P.place(r.name, f.cc) || "", r.path, r.n]).filter(([n]) => !!n),
      checked: W.checked(t.checked30, F.n),
      removed: t.removed30 && f.cc && site.live.has(`/homes/${f.cc}`) ? W.removed(t.removed30, inC) : "",
      howChosen: W.howChosen,
      ppsqmRef: F.ppsqm ? W.ppsqmRef(P.perSqm(F.ppsqm)) : "",
      sea: !seaish && seaN >= MIN_SEA && seaN < f.homes.length && seaPage !== f.path ? { n: seaN, page: seaPage } : null,
      map: `/map${mapQ ? `?${mapQ}` : ""}`,
      csvName: `realhunt-${f.path.split("/").filter(Boolean).join("-")}.csv`,
      townLink,
      pager: f.kind === "country" && !f.thin && f.homes.length > PAGED ? { of: Math.ceil(f.homes.length / CARDS), base: f.path } : null,
      total: F.n,
    };
  }
  return {
    path: f.path, h1, title: P.title(h1, F.n, money(F.min)), desc: P.desc(F, what), crumbs,
    // idea 72: the day this list last changed, not the day of the build
    updated: P.t2 && F.t2.lastChange ? P.t2.lastChange(P.date(F.t2.lastChange)) : P.updated(P.date(F.updated), F.newest?.day ? P.date(F.newest.day) : null), lede, kpi, chips,
    gridTitle: f.ranked ? P.gridTitleRank(f.key!, F.n) : P.gridTitle(F.n, cards.length), gridMore: F.n > cards.length ? P.gridMore(cards.length, F.n) : "", cards,
    tableTitle: P.tableTitle(F.n, rows.length), rows,
    factsTitle: P.factsTitle(F), facts,
    costsTitle: costs.length || costTable.length ? (f.cc ? P.costsTitle(inC) : P.costTableTitle) : "", costs, costLinks, costNote, costTable,
    watch: watchOut, faq,
    moreTitle: P.moreTitle(F), more, foot, footLinks,
    image: img ? (String(img).startsWith("http") ? String(img) : SITE + img) : `${SITE}/og-home.jpg`,
    lastmod: (P.t2 && F.t2.lastChange) || F.newest?.day || null,
    first, how, fx: x.fx ? { ccy: x.fx.ccy, rate: x.fx.rate } : null, notes: site.notes ? site.notes(F, P.lang) : [],
    regionsTitle: regionTable.length ? P.n20.regionsTitle(inC) : "", regionTable,
    t2,
  };
}
const MIN_SEA = 3;
/** The calculator of /tools made for one country (seo/tools/pages.ts). */
export const COUNTRY_TOOL: Record<string, string> = { portugal: "portugal-imt", france: "france-notary-fees", germany: "germany-property-transfer-tax", spain: "spain-non-resident-tax", "united-kingdom": "uk-stamp-duty-non-resident" };

// ------------------------------------------------------------------------------------------------ HTML
const rich = (s: string, href: (p: string) => string) => esc(s).replace(LINK, (_m, p: string, t: string) => `<a href="${href(p)}">${t}</a>`);

/** A visitor who reads the site in Spanish on an address without /es/ gets the Spanish twin from the app
 * (src/community/listingRoute.tsx); until then the English page stays hidden instead of flashing. */
export const WAIT = `<script>try{if(document.documentElement.getAttribute("data-lang")==="es"&&!/^\\/es(\\/|$)/.test(location.pathname))document.currentScript.parentNode.setAttribute("data-ls-wait","")}catch(e){}</script>`;

export type RenderOpts = { css: string; colors?: Record<string, string>; updated: string; href?: (p: string) => string; lang?: string };

export function renderBody(T: Text, P: Pack, o: RenderOpts): string {
  const href = (p: string) => esc((o.href || ((x: string) => x))(p));
  const R = (s: string) => rich(s, href);
  const a = ([text, path, n]: Link, cur = false, cls = "") => `<a${cls ? ` class="${cls}"` : ""} href="${href(path)}"${cur ? ' aria-current="page"' : ""}>${esc(text)}${n != null ? ` <small>${n}</small>` : ""}</a>`;
  const isNew = (h: Home) => { const d = ref(h).day; return !!d && (Date.parse(o.updated) - Date.parse(d)) / 86400000 <= NEW_DAYS; };
  const placeOf = (h: Home) => { const t = P.place(ref(h).town, undefined, "card") || ref(h).town; const rg = regionName(h); const r = rg ? P.place(rg, undefined, "card") || rg : ""; return r && r !== t ? `${t}, ${r}` : t; };
  // the rounded amount in pounds or dollars next to the euro price, on the pages whose budget is in that currency
  const approx = (h: Home) => (T.fx ? ` <small class="ls-fx">≈ ${esc(P.ccy(Math.round((h.price_eur * T.fx.rate) / 100) * 100, T.fx.ccy))}</small>` : "");
  // idea 22: how long the home has been on RealHunt, counted to the day of the data, as on the home page
  const daysOn = (h: Home) => { const d = ref(h).day; const n = d ? Math.floor((Date.parse(o.updated) - Date.parse(d)) / 86400000) : NaN; return Number.isFinite(n) && n >= 0 ? P.card.days(n) : ""; };
  const meta = (h: Home) => [h.sqm > 0 ? `${h.sqm} m²` : "", ref(h).beds > 0 ? P.card.beds(ref(h).beds) : "", h.sqm > 0 ? P.perSqm(Math.round(h.price_eur / h.sqm)) : "", daysOn(h)].filter(Boolean).join(" · ");
  const W = P.t2; const t2 = W ? T.t2 : null;
  // idea 70: the monthly community fee as the listing states it, or that it does not (homes in a shared building)
  const fee = (h: Home) => (!W ? "" : Number(h.hoa_monthly) > 0 ? W.fee(P.ccy(Number(h.hoa_monthly), String(h.hoa_currency || "EUR").toUpperCase())) : h.hoa_unknown === true ? W.feeUnknown : "");
  const card = (h: Home, i: number, badge = "", eager = false) => {
    const full = h.image_urls?.[0] ? toMedia(String(h.image_urls[0])) : ""; const small = full ? thumb(full) : ""; const set = full ? cardSrcSet(full) : undefined;
    const title = P.homeTitle(h) || ""; const why = firstSentence(P.homeWhy(h));
    const drop = Number(h.price_drop) > 0 && h.price_eur > 0 ? Math.round((Number(h.price_drop) / (h.price_eur + Number(h.price_drop))) * 100) : 0;
    const img = full
      // ideas 57 and 64 of the second list (21 Nov 2026): two sizes when the snapshot says both copies exist (the 480 px one
      // on a phone, the 800 px one on a dense wide screen); only the first card is asked for first, the next two load
      // at once, the rest when scrolled to
      // idea 79: the alt says what, where and for how much ("Village house in Terque, Almería, €79,500")
      ? `<img src="${esc(small)}"${set ? ` srcset="${esc(set)}" sizes="${esc(CARD_SIZES)}"` : ""} alt="${esc(`${title}${title.includes(ref(h).town) ? "" : `, ${placeOf(h)}`}, ${P.money(h.price_eur)}`)}" width="480" height="360" ${eager ? (i === 0 ? 'fetchpriority="high"' : "") : i === 0 && !t2?.top.length ? 'fetchpriority="high"' : i < 3 && !t2?.top.length ? "" : 'loading="lazy"'} decoding="async"${small !== full ? ` onerror="this.onerror=null;this.removeAttribute('srcset');this.src='${esc(full)}'"` : ""} />`
      : `<span class="ls-noph">${esc(P.card.noPhoto)}</span>`;
    // idea 97: the title of each home is an H3 under the section's H2 (H1 > H2 sections > H3 homes)
    return `<li${t2 && bySea(h) ? " data-sea" : ""}><a class="ls-card" href="${href(`/deal/${h.slug}`)}"><span class="ls-ph"${o.colors?.[h.slug] ? ` style="background:${esc(o.colors[h.slug])}"` : ""}>${img}`
      + (badge ? `<b class="ls-score ls-pick">${esc(badge)}</b>` : h.nota != null ? `<b class="ls-score">${esc(P.card.score)} ${esc(h.nota)}</b>` : "")
      + (drop >= 1 ? `<i class="ls-tag ls-drop">${esc(P.card.drop(drop))}</i>` : isNew(h) ? `<i class="ls-tag">${esc(P.card.isNew)}</i>` : "")
      + `</span><span class="ls-b"><strong>${esc(P.money(h.price_eur))}${approx(h)}</strong><h3 class="ls-t">${esc(title)}</h3><small>${esc(placeOf(h))}</small>`
      + (meta(h) ? `<small class="ls-m">${esc(meta(h))}</small>` : "") + (fee(h) ? `<small class="ls-fee">${esc(fee(h))}</small>` : "") + (why && !badge ? `<em>${esc(why)}</em>` : "") + `</span></a></li>`;
  };
  const townA = (h: Home) => { const p = t2?.townLink[String(h.slug)]; return p ? `<a href="${href(p)}">${esc(placeOf(h))}</a>` : esc(placeOf(h)); };
  const row = (h: Home) => `<tr><th scope="row"><a href="${href(`/deal/${h.slug}`)}">${esc(P.homeTitle(h) || "")}</a></th><td class="ls-c-place">${townA(h)}</td><td class="ls-n">${esc(P.money(h.price_eur))}${approx(h)}</td>`
    + `<td class="ls-n">${h.sqm > 0 ? `${esc(h.sqm)} m²` : "·"}</td><td class="ls-n ls-c-pp">${h.sqm > 0 ? esc(P.perSqm(Math.round(h.price_eur / h.sqm))) : "·"}</td><td class="ls-n ls-c-beds">${ref(h).beds > 0 ? ref(h).beds : "·"}</td>`
    + `<td class="ls-n">${h.nota != null ? esc(h.nota) : "·"}</td><td class="ls-n ls-c-added">${ref(h).day ? `<time datetime="${ref(h).day}">${esc(P.dateShort(ref(h).day!))}</time>` : "·"}</td></tr>`;
  const th = P.th;
  const notes = T.notes.map((n) => `<section class="ls-notebox" id="note-${esc(n.id)}"><h2>${esc(n.h)}</h2>${n.p.map((x) => `<p>${R(x)}</p>`).join("")}`
    + `<p class="ls-note">${esc(P.noteSource)}: ${n.sources.map(([name, u]) => `<a href="${esc(u)}" rel="noopener nofollow">${esc(name)}</a>`).join(", ")}. ${esc(P.noteAsOf(n.asOf))}</p></section>`).join("");
  // The breadcrumb is the first thing in <main>: the site-wide pass (seo/polish.ts) puts its own breadcrumb there and
  // only takes this one out when it finds it first. With the styles in front, every listing page showed two.
  return `<main class="rh-static" data-rh-keep data-rh-static data-ls${o.lang ? ` lang="${o.lang}"` : ""}>`
    + `<nav class="ls-crumbs" aria-label="Breadcrumb">${T.crumbs.map(([n, p], i) => (i === T.crumbs.length - 1 ? `<span>${esc(n)}</span>` : `<a href="${href(p)}">${esc(n)}</a>`)).join(" › ")}</nav>`
    + `<style>${o.css}</style>${WAIT}`
    + `<h1>${esc(T.h1)}</h1><p class="ls-upd">${esc(T.updated)}${t2 ? ` <a class="ls-skip" href="#homes">${esc(W!.skip)}</a>` : ""}</p>`
    // ideas 51 and 58: on a phone the first photo is in the first screen: three picks before any paragraph
    + (t2 && t2.top.length ? `<section class="ls-top" aria-labelledby="ls-top-h"><h2 id="ls-top-h" class="ls-vh">${esc(W!.topTitle)}</h2><ol class="ls-grid ls-top3">${t2.top.map(([l, h], i) => card(h, i, l, true)).join("")}</ol></section>` : "")
    + `<p class="ls-lede">${T.lede.map(R).join(" ")}</p>`
    + (T.first ? `<aside class="ls-first"><b>${esc(P.firstTitle)}</b><p>${esc(T.first)}</p><p class="ls-links"><a href="${href("/can-i-buy")}">${esc(P.cLinks.nat)}</a> · <a href="#costs">${esc(T.costsTitle)}</a></p></aside>` : "")
    + (T.how ? `<p class="ls-how">${R(T.how)}</p>` : "")
    + `<dl class="ls-kpi">${T.kpi.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>`
    + (T.chips.length > 1 ? `<nav class="ls-chips" aria-label="${esc(P.more.budget)}">${T.chips.map((c) => a(c, c[1] === T.path, "ls-chip")).join("")}</nav>` : "")
    + `<h2 id="homes">${esc(T.gridTitle)}</h2>`
    + (t2 ? `<p class="ls-order">${t2.order ? R(t2.order) : ""}${t2.sea ? ` <button type="button" class="ls-seabtn" aria-pressed="false" data-on="${esc(W!.seaAll)}" data-off="${esc(W!.seaOnly(t2.sea.n))}" onclick="${esc(SEA_JS)}">${esc(W!.seaOnly(t2.sea.n))}</button>${t2.sea.page ? ` <a href="${href(t2.sea.page)}">${esc(W!.seaPage)}</a>` : ""}` : ""} <a href="${href(t2.map)}">${esc(W!.map)}</a></p>` : "")
    + `<ol class="ls-grid">${T.cards.map((h, i) => card(h, i)).join("")}</ol>` + (T.gridMore ? `<p class="ls-note">${esc(T.gridMore)}</p>` : "")
    + (t2?.pager ? pagerHtml(W!, 1, t2.pager.of, t2.pager.base, href) : "")
    + `<h2 id="compare">${esc(T.tableTitle)}</h2>`
    + (t2 ? `<p class="ls-note">${t2.ppsqmRef ? `${esc(t2.ppsqmRef)} ` : ""}<button type="button" class="ls-csv" data-file="${esc(t2.csvName)}" onclick="${esc(CSV_JS)}">${esc(W!.csv)}</button></p>` : "")
    + `<div class="ls-tw" tabindex="0" role="region" aria-label="${esc(T.tableTitle)}"><table><thead><tr><th scope="col">${esc(th.home)}</th><th scope="col" class="ls-c-place">${esc(th.place)}</th><th scope="col" class="ls-n">${esc(th.price)}</th><th scope="col" class="ls-n">${esc(th.size)}</th><th scope="col" class="ls-n ls-c-pp">${esc(th.ppsqm)}</th><th scope="col" class="ls-n ls-c-beds">${esc(th.beds)}</th><th scope="col" class="ls-n">${esc(th.score)}</th><th scope="col" class="ls-n ls-c-added">${esc(th.added)}</th></tr></thead><tbody>${T.rows.map(row).join("")}</tbody></table></div>`
    + (T.facts.length ? `<h2 id="facts">${esc(T.factsTitle)}</h2><ul class="ls-facts">${T.facts.map((x) => `<li>${R(x)}</li>`).join("")}</ul>` : "")
    + (t2?.money ? `<h2 id="money">${esc(W!.moneyTitle)}</h2><p>${R(t2.money)}</p>` : "")
    + (t2 && t2.towns.length ? `<h2 id="towns">${esc(t2.townsTitle)}</h2><div class="ls-tw"><table class="ls-ct"><thead><tr><th scope="col">${esc(W!.town)}</th><th scope="col" class="ls-n">${esc(P.kpi.homes)}</th><th scope="col" class="ls-n">${esc(P.kpi.median)}</th></tr></thead><tbody>`
      + t2.towns.map(([n, p, k, m]) => `<tr><th scope="row">${p ? `<a href="${href(p)}">${esc(n)}</a>` : esc(n)}</th><td class="ls-n">${k}</td><td class="ls-n">${esc(m)}</td></tr>`).join("") + `</tbody></table></div>` : "")
    + (T.regionTable.length ? `<h2 id="regions">${esc(T.regionsTitle)}</h2><div class="ls-tw"><table class="ls-ct"><thead><tr><th scope="col">${esc(P.n20.region)}</th><th scope="col" class="ls-n">${esc(P.kpi.homes)}</th><th scope="col" class="ls-n">${esc(P.kpi.median)}</th></tr></thead><tbody>`
      + T.regionTable.map(([n, p, k, m]) => `<tr><th scope="row">${p ? `<a href="${href(p)}">${esc(n)}</a>` : esc(n)}</th><td class="ls-n">${k}</td><td class="ls-n">${esc(m)}</td></tr>`).join("") + `</tbody></table></div>` : "")
    + (T.costsTitle ? `<h2 id="costs">${esc(T.costsTitle)}</h2>` + T.costs.map((x) => `<p>${R(x)}</p>`).join("")
      + (T.costTable.length ? `<div class="ls-tw"><table class="ls-ct"><thead><tr><th scope="col">${esc(P.costTh.country)}</th><th scope="col" class="ls-n">${esc(P.costTh.homes)}</th><th scope="col" class="ls-n">${esc(P.costTh.from)}</th><th scope="col" class="ls-n">${esc(P.costTh.costs)}</th></tr></thead><tbody>${T.costTable.map((c) => `<tr><th scope="row">${c.path ? `<a href="${href(c.path)}">${esc(P.country(c.name))}</a>` : esc(P.country(c.name))}</th><td class="ls-n">${c.n}</td><td class="ls-n">${esc(P.money(c.min))}</td><td class="ls-n">${esc(c.pct.replace(/-/g, "–"))}%</td></tr>`).join("")}</tbody></table></div>` : "")
      + (T.costLinks.length ? `<p class="ls-links">${T.costLinks.map((l) => a(l)).join(" · ")}</p>` : "") + (T.costNote ? `<p class="ls-note">${esc(T.costNote)}</p>` : "") : "")
    + notes
    + (T.watch.length ? `<h2 id="watch">${esc(P.watchTitle)}</h2><ul class="ls-facts ls-watch">${T.watch.map((x) => `<li>${R(x)}</li>`).join("")}</ul>` : "")
    + (T.faq.length ? `<h2 id="faq">${esc(P.faqTitle)}</h2><div class="ls-faq">${T.faq.map(([q, x]) => `<h3>${esc(q)}</h3><p>${esc(plain(x))}</p>`).join("")}</div>` : "")
    + (t2 && t2.near.length ? `<h2 id="near">${esc(W!.nearTitle)}</h2><div class="ls-more"><p>${t2.near.map((x) => a(x, false, "ls-chip")).join(" ")}</p></div>` : "")
    + (T.more.length ? `<h2 id="more">${esc(T.moreTitle)}</h2><div class="ls-more">${T.more.map(([l, links]) => `<p><b>${esc(l)}</b> ${links.map((x) => a(x, false, "ls-chip")).join(" ")}</p>`).join("")}</div>` : "")
    + (t2 ? `<p class="ls-foot ls-chosen">${esc(W!.howChosen)} <a href="${href("/how-we-check-homes")}">${esc(W!.howChosenLink)}</a> ${esc(t2.checked)}${t2.removed ? ` ${esc(t2.removed)} <a href="${href("/research/removed-homes")}">${esc(W!.removedLink)}</a>` : ""}</p>` : "")
    + `<p class="ls-foot">${T.foot.map(esc).join(" ")}</p><p class="ls-links">${T.footLinks.map((l) => a(l)).join(" · ")}</p></main>`;
}

// Two small handlers written into the page, so they work on the first paint and inside the app (which shows this
// same HTML): no address changes, nothing is stored, nothing is sent.
/** idea 83: show only the homes by the sea (cards marked data-sea) and back. */
const SEA_JS = "var m=this.closest('[data-ls]');var on=!m.hasAttribute('data-ls-sea');if(on)m.setAttribute('data-ls-sea','');else m.removeAttribute('data-ls-sea');this.setAttribute('aria-pressed',on?'true':'false');this.textContent=this.getAttribute(on?'data-on':'data-off')";
/** idea 95: the comparison table as a CSV file, built from the table itself. */
const CSV_JS = String.raw`var t=this.closest('[data-ls]').querySelector('#compare ~ .ls-tw table');if(!t)return;var q=function(x){return '"'+String(x).replace(/\s+/g,' ').trim().replace(/"/g,'""')+'"'};var c=[];for(var i=0;i<t.rows.length;i++){var r=t.rows[i],l=[];for(var j=0;j<r.cells.length;j++)l.push(q(r.cells[j].textContent));c.push(l.join(','))}var a=document.createElement('a');a.href=window.URL.createObjectURL(new window.Blob(['﻿'+c.join('\r\n')],{type:'text/csv;charset=utf-8'}));a.download=this.getAttribute('data-file')||'realhunt.csv';document.body.appendChild(a);a.click();a.remove()`;

/** Links to the numbered pages of a country (idea 66). */
export function pagerHtml(W: NonNullable<Pack["t2"]>, cur: number, of: number, base: string, href: (p: string) => string): string {
  const url = (n: number) => (n === 1 ? base : `${base}/page/${n}`);
  const items: string[] = [];
  if (cur > 1) items.push(`<a rel="prev" href="${href(url(cur - 1))}">${esc(W.prev)}</a>`);
  for (let n = 1; n <= of; n++) items.push(n === cur ? `<span aria-current="page">${n}</span>` : `<a href="${href(url(n))}">${n}</a>`);
  if (cur < of) items.push(`<a rel="next" href="${href(url(cur + 1))}">${esc(W.next)}</a>`);
  return `<nav class="ls-pager" aria-label="${esc(W.pager)}">${items.join(" ")}</nav>`;
}

export function renderLd(T: Text, P: Pack, url: (path: string) => string): object[] {
  const ld: object[] = [
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: T.crumbs.map(([name, p], i) => ({ "@type": "ListItem", position: i + 1, name, item: url(p) })) },
    { "@context": "https://schema.org", "@type": "ItemList", name: T.h1, numberOfItems: T.cards.length, itemListOrder: "https://schema.org/ItemListOrderDescending",
      itemListElement: T.cards.map((h, i) => ({ "@type": "ListItem", position: i + 1, url: url(`/deal/${h.slug}`), name: P.homeTitle(h) || String(h.title) })) },
  ];
  if (T.faq.length) ld.push({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: T.faq.map(([q, x]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: plain(x) } })) });
  return ld;
}
