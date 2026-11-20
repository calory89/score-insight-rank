// The listing families of 15-nov-2026 (seo/listings): traits read from the data or stated in the listing, ranked
// lists, budgets in pounds and dollars, trait + budget, named areas, homes near a city, one name per region, the
// sourced notes. What is tested: nothing is guessed, a family appears by itself the day it has 3 homes, no page is
// an orphan or a copy, and the English and Spanish pages say the same.
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { buildFacets, nearestLive, jaccard, eurCap, MIN, DUP, type Facet } from "../../seo/listings/facets";
import { bedsOf, ptypeOf, plotOf, feeOf, dropPct, season, TRAITS, COMBOS, COMBO_MAX, RANK_N, PLOT_MIN } from "../../seo/listings/traits";
import { cleanRegion, regionIndex, regionName, islandOf, km, AREAS, CITIES, NEAR_KM } from "../../seo/listings/places";
import { parseEcb, loadFx } from "../../seo/listings/fx";
import { listingPlan, listingPages, composeAll, movedAddresses } from "../../seo/listings/build";
import { renderBody, renderLd, plain } from "../../seo/listings/page";
import { NOTES } from "../../seo/listings/notes";
import { measureHtml, passes } from "../../seo/es";
import { en } from "../../seo/listings/pack.en";
import { es } from "../../seo/listings/pack.es";

const rows: any[] = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "public/data/rh-static.json"), "utf8")).rows;
const plan = listingPlan(rows);
const byPath = new Map(plan.pages.map((p) => [p.path, p]));
const NEW_KINDS = ["combo", "ccyBand", "area", "near"];
const traitKeys = new Set(TRAITS.map((t) => t.key));
const isNew = (p: Facet) => NEW_KINDS.includes(p.kind) || ((p.kind === "feature" || p.kind === "gfeature") && traitKeys.has(p.key || ""));
const test = (key: string) => (r: any) => TRAITS.find((t) => t.key === key)!.test(r, { today: "2026-11-14" });
const home = (o: Record<string, any>) => ({ slug: `t-${Math.random().toString(36).slice(2)}`, price_eur: 40000, country: "Italy", location_name: "Lecce, Apulia, Italy", title: "House", why_great: "", nota: 80, amen: [], ...o });

describe("what is read from a listing, and what is not", () => {
  it("bedrooms: the field, else the one number the text states; never a guess", () => {
    expect(bedsOf({ bedrooms: 3, title: "2-bed flat" })).toBe(3);
    expect(bedsOf({ title: "Three-bedroom house with a garden" })).toBe(3);
    expect(bedsOf({ title: "House", why_great: "2 bedrooms · 1 bathroom · 76 m2" })).toBe(2);
    expect(bedsOf({ title: "5-bed house with a terrace" })).toBe(5);
    expect(bedsOf({ title: "House with a two-bedroom annexe", why_great: "The main house has 3 bedrooms." })).toBe(0); // two numbers: we do not pick one
    expect(bedsOf({ title: "Studio with a balcony" })).toBe(0);                // a studio has no bedroom
    expect(bedsOf({ title: "Large family home", why_great: "Sleeps six." })).toBe(0);
  });
  it("kind of home: the title first, then only the sentence that says what is for sale", () => {
    expect(ptypeOf({ title: "Home near the lakes", why_great: "Built in 1926, this house has kept its character. A flat is next door." })).toBe("house");
    expect(ptypeOf({ title: "Two-bedroom with city views", why_great: "A move-in-ready two-bedroom flat high up in Commodore Plaza." })).toBe("apartment");
    expect(ptypeOf({ title: "Three bedrooms near Manufaktura", why_great: "47 m² on the 3rd floor of a revitalised townhouse." })).toBe(""); // a flat in a building called a townhouse
    expect(ptypeOf({ title: "Dual-unit investment property", why_great: "The main residence has a new roof. The detached 1-bedroom apartment brings rent." })).toBe("");
    expect(ptypeOf({ title: "Home with a garden" })).toBe("");
  });
  it("plot size: only a figure the text gives for land", () => {
    expect(plotOf({ title: "Villa on a 1,424 m² plot" })).toBe(1424);
    expect(plotOf({ title: "House", why_great: "With 2,850 m² of nature around it." })).toBe(2850);
    expect(plotOf({ title: "A-frame on 2.5 acres" })).toBe(Math.round(2.5 * 4047));
    expect(plotOf({ title: "Farm on 1.1 hectares" })).toBe(11000);
    expect(plotOf({ title: "186 m² villa with a 60 m² living room" })).toBe(0);   // floor areas are not land
    expect(plotOf({ title: "House with a big garden" })).toBe(0);
    expect(test("with-land")({ title: "House on a 776 m² plot" })).toBe(false);
    expect(test("with-land")({ title: `House on a ${PLOT_MIN.toLocaleString("en")} m² plot` })).toBe(true);
  });
  it("traits stated in words", () => {
    expect(test("turnkey")({ title: "Fully renovated flat, ready to move in" })).toBe(true);
    expect(test("turnkey")({ title: "Renovated kitchen, the rest needs work" })).toBe(false);
    expect(test("to-renovate")({ title: "Stone barn to renovate" })).toBe(true);
    expect(test("to-renovate")({ title: "Renovated stone barn" })).toBe(false);
    expect(test("with-sea-view")({ title: "Flat", why_great: "A terrace with views over the sea." })).toBe(true);
    expect(test("with-sea-view")({ title: "Flat 300 m from the sea" })).toBe(false);          // near is not a view
    expect(test("single-storey")({ title: "Single-storey villa" })).toBe(true);
    expect(test("single-storey")({ title: "Three-storey town house" })).toBe(false);
    expect(test("with-period-features")({ title: "House", why_great: "A 19th-century longère with exposed beams." })).toBe(true);
    expect(test("with-period-features")({ title: "Modern flat built in 2019" })).toBe(false);
    expect(test("cave-houses")({ title: "A white cave house above Galera" })).toBe(true);
    expect(test("cave-houses")({ title: "House with a wine cave" })).toBe(false);
    expect(test("with-fibre-internet")({ title: "Flat with fibre internet" })).toBe(true);
    expect(test("with-fibre-internet")({ title: "Roof in fibre cement" })).toBe(false);
    expect(test("unusual-buildings")({ title: "Former school with a garden" })).toBe(true);
    expect(test("unusual-buildings")({ title: "House opposite the church" })).toBe(false);
    expect(test("with-business-premises")({ title: "171 m² house with a former shop in the centre" })).toBe(true);
    expect(test("with-business-premises")({ title: "Chalet with mountain views, plus a guest house" })).toBe(false); // an annexe is not a business
    expect(test("with-business-premises")({ title: "Flat above the shops" })).toBe(false);
  });
  it("traits measured in the data", () => {
    expect(test("near-the-beach")({ nearby: { sea_km: 0.4 } })).toBe(true);
    expect(test("near-the-beach")({ nearby: { sea_km: 0.6 } })).toBe(false);
    expect(test("near-the-beach")({ category: "beach" })).toBe(false);                         // no measurement, no claim
    expect(test("near-an-airport")({ nearby: { airport: { km: 30 } } })).toBe(true);
    expect(test("near-an-airport")({ nearby: { airport: { km: 31 } } })).toBe(false);
    expect(test("under-500-per-sqm")({ price_eur: 40000, sqm: 100 })).toBe(true);
    expect(test("under-500-per-sqm")({ price_eur: 40000 })).toBe(false);
    expect(test("score-90-plus")({ nota: 90 })).toBe(true);
    expect(test("quiet-location")({ risks: { noise: { level: "low", roads_checked: true, rail_m: null, motorway_m: null } } })).toBe(true);
    expect(test("quiet-location")({ risks: { noise: { level: "low", roads_checked: true, rail_m: 166, motorway_m: null } } })).toBe(false);
    expect(test("quiet-location")({})).toBe(false);
    expect(feeOf({ hoa_monthly: 124, hoa_currency: "USD" })).toEqual({ amount: 124, ccy: "USD" });
    expect(feeOf({ hoa_monthly: 900, hoa_currency: "SEK" })).toBeNull();
    expect(test("low-community-fee")({ hoa_monthly: 750, hoa_currency: "USD" })).toBe(false);
    expect(test("low-community-fee")({ hoa_unknown: false })).toBe(false);                     // an unstated fee is not a low fee
    expect(dropPct({ price_eur: 90000, price_drop: 10000 })).toBe(10);
    expect(test("new-this-month")({ approved_at: "2026-10-20T10:00:00Z" })).toBe(true);
    expect(test("new-this-month")({ approved_at: "2026-09-20T10:00:00Z" })).toBe(false);
  });
  it("one name per region, islands and distances", () => {
    expect(cleanRegion({ country: "Spain", location_name: "Aspe, Alicante (about 25 min from Elche)" })).toBe("Alicante");
    expect(cleanRegion({ country: "Greece", location_name: "Viannos, Crete (Greece)" })).toBe("Crete");
    expect(cleanRegion({ country: "Italy", location_name: "Ostuni, Puglia, Italy" })).toBe("Apulia");
    const a = { country: "Spain", location_name: "Órgiva, Alpujarra (Granada)" }, b = { country: "Spain", location_name: "Guadix, Granada" }, c = { country: "Spain", location_name: "Glossa, Sierra (Sur)" };
    regionIndex([a, b, c]);
    expect(regionName(a)).toBe("Granada");           // "Town (Province)" joins a province other homes use
    expect(regionName(c)).toBe("Sierra (Sur)");      // an unknown bracket is left as the listing wrote it
    expect(islandOf({ country: "Greece", location_name: "Glossa, Skopelos (Sporades)" })).toBe("Skopelos");
    expect(islandOf({ country: "Denmark", location_name: "Flade, Mors" })).toBe("Mors");
    expect(islandOf({ country: "Japan", location_name: "Kushimoto, Wakayama" })).toBe("");
    expect(Math.round(km(41.3874, 2.1686, 40.4168, -3.7038))).toBeGreaterThan(495);            // Barcelona to Madrid, about 505 km
    expect(Math.round(km(41.3874, 2.1686, 40.4168, -3.7038))).toBeLessThan(515);
  });
});

describe("which pages the new families get", () => {
  it("every new page has at least 3 homes and is no near-copy of another page", () => {
    const fresh = plan.pages.filter(isNew);
    expect(fresh.length).toBeGreaterThan(100);
    for (const p of fresh) expect(p.homes.length, p.path).toBeGreaterThanOrEqual(MIN);
    // a page that crosses countries must not copy a page of a country either
    for (const p of plan.pages.filter((x) => !x.cc && isNew(x))) {
      const a = new Set(p.homes.map((h) => String(h.slug)));
      for (const q of plan.pages) if (q !== p && !q.thin) expect(jaccard(a, new Set(q.homes.map((h) => String(h.slug)))), `${p.path} = ${q.path}`).toBeLessThan(DUP);
    }
  });
  it("a family with no page today appears by itself the day it has 3 homes, and not with 2", () => {
    const bg = rows.filter((r) => r.country === "Bulgaria").map((r) => r.slug);
    const withDrops = (n: number) => buildFacets(rows.map((r) => (bg.indexOf(r.slug) >= 0 && bg.indexOf(r.slug) < n ? { ...r, price_drop: 4000 } : r)));
    expect(byPath.has("/cheap-houses/price-drops-in-bulgaria")).toBe(false);
    expect(withDrops(2).pages.some((p) => p.path === "/cheap-houses/price-drops-in-bulgaria")).toBe(false);
    expect(withDrops(3).pages.find((p) => p.path === "/cheap-houses/price-drops-in-bulgaria")?.homes.length).toBe(3);
    // a region the same way: no list of regions to keep by hand
    const burgas = (n: number) => buildFacets([...rows, ...Array.from({ length: n }, (_, i) => home({ slug: `bg-${i}`, country: "Bulgaria", location_name: `Town ${i}, Vidin`, title: "Home", price_eur: [59000, 66500, 71000][i] }))]); // a region with no homes yet; prices among the existing ones, so no budget lists just these
    expect(burgas(2).pages.some((p) => p.path === "/homes/bulgaria/vidin")).toBe(false);
    expect(burgas(3).pages.find((p) => p.path === "/homes/bulgaria/vidin")?.kind).toBe("region");
    // a budget under €10,000 (the studios of the Bulgarian coast) is a page the day three homes cost that little
    const dearer = [0, 1].map((i) => home({ slug: `st2-${i}`, country: "Bulgaria", location_name: `Sunny Beach, Burgas`, title: "Studio", price_eur: 24000 + i * 900 })); // so "under 30,000" is not the same list
    const studios = (n: number) => buildFacets([...rows, ...dearer, ...Array.from({ length: n }, (_, i) => home({ slug: `st-${i}`, country: "Bulgaria", location_name: `Sunny Beach ${i}, Burgas`, title: "Studio", price_eur: 7000 + i * 900 }))]);
    expect(byPath.has("/homes/bulgaria/under-10000")).toBe(false);
    expect(studios(2).pages.some((p) => p.path === "/homes/bulgaria/under-10000")).toBe(false);
    expect(studios(3).pages.find((p) => p.path === "/homes/bulgaria/under-10000")?.cap).toBe(10000);
    // text traits and areas the same way
    const trulli = buildFacets([...rows, ...[0, 1, 2].map((i) => home({ slug: `tr-${i}`, title: `Restored trullo with a garden ${i}`, price_eur: 60000 + i }))]);
    expect(byPath.has("/cheap-houses/trulli-in-italy")).toBe(false);
    expect(trulli.pages.find((p) => p.path === "/cheap-houses/trulli-in-italy")?.homes.length).toBe(3);
    const garda = buildFacets([...rows, ...[0, 1, 2].map((i) => home({ slug: `g-${i}`, location_name: `Salò ${i}, Lake Garda, Italy`, price_eur: 90000 + i }))]);
    expect(garda.pages.some((p) => p.path === "/homes/italy/lake-garda")).toBe(true);
    // a new country with enough homes gets its pages without a line of code
    const croatia = buildFacets([...rows, ...Array.from({ length: 6 }, (_, i) => home({ slug: `hr-${i}`, country: "Croatia", location_name: `Village ${i}, Slavonia`, title: "Stone house, fully renovated", price_eur: 30000 + i * 5000, amen: i < 4 ? ["fireplace"] : [] }))]);
    for (const p of ["/homes/croatia", "/homes/croatia/under-50000", "/cheap-houses/with-fireplace-in-croatia"]) expect(croatia.pages.some((x) => x.path === p), p).toBe(true);
  });
  it("homes near a city: 5 homes within 100 km, measured from the coordinates", () => {
    const berlin = CITIES.find((c) => c[0] === "berlin")!;
    expect(byPath.has("/cheap-houses/near-berlin")).toBe(false);
    const near = (n: number) => buildFacets([...rows, ...Array.from({ length: n }, (_, i) => home({ slug: `b-${i}`, country: "Germany", location_name: `Dorf ${i}, ${i < 3 ? "Brandenburg" : "Saxony-Anhalt"}`, lat: berlin[3] + 0.1 * (i + 1), lng: berlin[4], title: "Home", price_eur: 50000 + i }))]); // two regions and no kind of home: nothing else lists just these five
    expect(near(4).pages.some((p) => p.path === "/cheap-houses/near-berlin")).toBe(false);
    expect(near(5).pages.find((p) => p.path === "/cheap-houses/near-berlin")?.homes.length).toBe(5);
    for (const p of plan.pages.filter((x) => x.kind === "near")) {
      const c = CITIES.find((x) => x[0] === p.city)!;
      for (const h of p.homes) expect(km(h.lat, h.lng, c[3], c[4]), `${p.path} ${h.slug}`).toBeLessThanOrEqual(NEAR_KM);
    }
  });
  it("ranked lists hold the first 20 of their order and nothing else", () => {
    const g = byPath.get("/cheap-houses/cheapest")!;
    expect(g.ranked).toBe(true); expect(g.homes.length).toBe(RANK_N);
    const prices = g.homes.map((h) => h.price_eur);
    expect(prices).toEqual(prices.slice().sort((a, b) => a - b));
    const cheapest = Math.min(...rows.filter((r) => r.price_eur > 0).map((r) => r.price_eur));
    expect(prices[0]).toBe(cheapest);
    const space = byPath.get("/cheap-houses/most-space-for-the-money")!;
    const pp = space.homes.map((h) => h.price_eur / h.sqm);
    expect(pp).toEqual(pp.slice().sort((a, b) => a - b));
  });
  it("budgets in pounds and dollars use the dated ECB rate, and move with it", () => {
    const fx = loadFx();
    expect(fx.date).toMatch(/^\d{4}-\d{2}-\d{2}$/); expect(fx.rates.GBP).toBeGreaterThan(0.5); expect(fx.rates.USD).toBeGreaterThan(0.8);
    for (const p of plan.pages.filter((x) => x.kind === "ccyBand")) {
      expect(p.capEur).toBeCloseTo(p.cap! / fx.rates[p.ccy!], 4);
      for (const h of p.homes) expect(h.price_eur).toBeLessThanOrEqual(p.capEur!);
      expect(eurCap(p)).toBe(Math.floor(p.capEur!));
    }
    const weak = buildFacets(rows, { fx: { ...fx, rates: { GBP: fx.rates.GBP * 2, USD: fx.rates.USD } } });   // a pound worth half as much
    const now = byPath.get("/cheap-houses/under-50000-pounds")!, then = weak.pages.find((p) => p.path === "/cheap-houses/under-50000-pounds");
    expect((then?.homes.length ?? 0)).toBeLessThan(now.homes.length);
    expect(buildFacets(rows, { fx: { date: "", source: "", rates: {} } }).pages.some((p) => p.kind === "ccyBand")).toBe(false); // no rate, no page
    expect(parseEcb(`<Cube><Cube time='2026-11-13'><Cube currency='USD' rate='1.1052'/><Cube currency='GBP' rate='0.83559'/></Cube></Cube>`)).toEqual({ date: "2026-11-13", rates: { USD: 1.1052, GBP: 0.83559 } });
    expect(parseEcb("<html>error</html>")).toBeNull();
  });
  it("trait + budget: only the listed pairs, at most COMBO_MAX, each inside its trait", () => {
    const combos = plan.pages.filter((p) => p.kind === "combo");
    expect(combos.length).toBeGreaterThan(10); expect(combos.length).toBeLessThanOrEqual(COMBO_MAX);
    for (const p of combos) {
      expect(COMBOS.some(([k, c]) => k === p.key && c === p.cap), p.path).toBe(true);
      for (const h of p.homes) expect(h.price_eur).toBeLessThanOrEqual(p.cap!);
    }
    const live = new Set(["/homes/italy", "/cheap-houses/stone-houses-in-italy"]);
    expect(nearestLive("/cheap-houses/stone-houses-under-50000-in-italy", live)).toBe("/cheap-houses/stone-houses-in-italy");
    expect(nearestLive("/cheap-houses/with-pool-under-100000-in-italy", live)).toBe("/homes/italy");
    expect(nearestLive("/cheap-houses/near-berlin", live)).toBe("/cheap-houses");
  });
  it("an area with enough homes gets its own budgets, inside the area", () => {
    const bands = plan.pages.filter((p) => p.kind === "regionBand" && p.area);
    expect(bands.length).toBeGreaterThan(3);
    for (const b of bands) {
      const area = byPath.get(b.parent)!;
      expect(area.kind).toBe("area"); expect(area.homes.length).toBeGreaterThanOrEqual(10);
      const inside = new Set(area.homes.map((h) => h.slug));
      for (const h of b.homes) { expect(inside.has(h.slug)).toBe(true); expect(h.price_eur).toBeLessThanOrEqual(b.cap!); }
    }
  });
  it("named areas are made of real regions of their country", () => {
    for (const p of plan.pages.filter((x) => x.kind === "area")) {
      const a = AREAS.find((x) => x.cc === p.cc && x.slug === p.area)!;
      expect(a, p.path).toBeTruthy();
      for (const h of p.homes) expect(String(h.country).toLowerCase().replace(/\s+/g, "-")).toBe(a.cc);
    }
    // every country with 20 homes or more has region pages
    const big = plan.pages.filter((p) => p.kind === "country" && p.homes.length >= 20);
    for (const c of big) expect(plan.pages.some((p) => p.cc === c.cc && (p.kind === "region" || p.kind === "area")), c.path).toBe(true);
  });
  it("every address published before still has a page or a place to go", () => {
    const known: string[] = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "seo/listings/known-urls.json"), "utf8")).urls;
    const moved = movedAddresses(plan);
    for (const u of known) expect(byPath.has(u) || !!moved[u], u).toBe(true);
  });
  it("a trait's address reads <trait>-in-<country>: no trait name contains -in- itself", () => {
    // seo/polish.ts takes the country of /cheap-houses/<x>-in-<country> from the first "-in-"
    for (const t of TRAITS) { expect(t.key, t.key).not.toMatch(/-in-|-in$/); expect(t.key).toMatch(/^[a-z0-9-]+$/); }
    for (const p of plan.pages.filter((x) => x.path.startsWith("/cheap-houses/") && x.cc)) expect(p.path.slice(14).split("-in-")[1], p.path).toBe(p.cc);
  });
  it("the season's families go up two months before the season", () => {
    expect(season(10)?.name).toBe("winter"); expect(season(12)?.name).toBe("winter"); expect(season(2)?.name).toBe("winter");
    expect(season(4)?.name).toBe("summer"); expect(season(8)?.name).toBe("summer");
    expect(season(3)).toBeNull(); expect(season(9)).toBeNull();
  });
});

describe("what the new pages say", () => {
  const E = composeAll(plan, rows, en), S = composeAll(plan, rows, es);
  const out = new Map<string, { title: string; desc: string; body: string; ld: any[]; o: any }>();
  listingPages(plan, rows, (url, title, desc, _img, body, ld, o) => { out.set(url.replace("https://realhunt.co", ""), { title, desc, body: body || "", ld: (ld || []) as any[], o }); }, "en");
  const outEs = new Map<string, string>();
  listingPages(plan, rows, (url, _t, _d, _i, body) => { outEs.set(url.replace("https://realhunt.co", ""), body || ""); }, "es");

  it("no page is an orphan: each is linked from the hub and from at least one other listing page", () => {
    const hub = out.get("/cheap-houses")!.body;
    const linked = new Map<string, number>();
    for (const [from, pg] of out) for (const m of pg.body.matchAll(/href="(\/[^"#?]*)"/g)) if (m[1] !== from) linked.set(m[1], (linked.get(m[1]) || 0) + 1);
    for (const p of plan.pages.filter((x) => !x.thin)) {
      expect(linked.get(p.path) || 0, `${p.path} has no link in`).toBeGreaterThanOrEqual(1);
      if (isNew(p) && (!p.cc || p.kind !== "area")) expect(hub.includes(`href="${p.path}"`), `${p.path} is not on the hub`).toBe(true);
      // and it links up to its parent
      const parent = p.cc ? `/homes/${p.cc}` : "/cheap-houses";
      if (p.path !== parent) expect(out.get(p.path)!.body.includes(`href="${parent}"`), `${p.path} does not link to ${parent}`).toBe(true);
    }
  });
  it("each has its own numbers, an ItemList of its homes, and the same content in Spanish", () => {
    for (const p of plan.pages.filter(isNew)) {
      const a = E.texts.get(p.path)!, b = S.texts.get(p.path)!;
      expect(a && b, p.path).toBeTruthy();
      expect(a.cards.map((h) => h.slug)).toEqual(p.homes.slice(0, 30).map((h) => h.slug));
      expect(a.facts.length, p.path).toBeGreaterThanOrEqual(4); expect(a.facts.length).toBe(b.facts.length);
      expect(!!a.how).toBe(!!b.how); expect(a.notes.length).toBe(b.notes.length);
      for (const s of [a.h1, a.title, a.desc, a.how, b.h1, b.title, b.desc, b.how, ...a.facts.map(plain), ...b.facts.map(plain)]) expect(s, p.path).not.toMatch(/—|undefined|NaN|\bnull\b|\[object|  /);
      // Spanish with no English left in the sentences the templates write (home titles and place names aside)
      expect(`${b.h1} ${b.how}`, p.path).not.toMatch(/\b(the|with|homes?|houses?|under|within|listing|cheap(est)?|near|of)\b/i);
      const ld = renderLd(a, en, (x) => "https://realhunt.co" + x) as any[];
      const list = ld.find((x) => x["@type"] === "ItemList");
      expect(list.numberOfItems).toBe(Math.min(30, p.homes.length));
      expect(list.itemListElement[0].url).toBe(`https://realhunt.co/deal/${p.homes[0].slug}`);
      const words = out.get(p.path)!.body.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
      expect(words, p.path).toBeGreaterThan(250);
    }
  });
  it("every Spanish listing page passes the site's no-English check, so none loses its Spanish address", () => {
    const failed: string[] = [];
    for (const [u, body] of outEs) { if (byPath.get(u)?.thin) continue; const c = measureHtml(`<div id="root">${body.replace(/Dominican Republic/g, "República Dominicana")}</div><script>`) /* the Spanish pass of the build renames that one */; if (!passes(c)) failed.push(`${u}: ${c.hits.join(" ")}`); }
    expect(failed).toEqual([]);
  });
  it("titles and descriptions are unique across every listing page, in both languages", () => {
    for (const texts of [E.texts, S.texts]) {
      const t = new Map<string, string>(), d = new Map<string, string>();
      for (const [u, T] of texts) { if (!T) continue; expect(t.get(T.title), `${u} = ${t.get(T.title)}`).toBeUndefined(); t.set(T.title, u); expect(d.get(T.desc), `${u} = ${d.get(T.desc)}`).toBeUndefined(); d.set(T.desc, u); }
    }
  });
  it("a family says how a home got on its list, and its own figure", () => {
    const air = E.texts.get([...byPath.keys()].find((k) => /^\/cheap-houses\/near-an-airport-in-/.test(k))!)!;
    expect(air.how).toMatch(/30 km/); expect(plain(air.facts[0])).toMatch(/^Airports: the median distance is \d+ km/);
    const gbp = plan.pages.find((p) => p.kind === "ccyBand" && p.ccy === "GBP" && p.cc)!;
    const T = E.texts.get(gbp.path)!, Ts = S.texts.get(gbp.path)!;
    expect(T.h1).toContain("under £"); expect(T.how).toContain("European Central Bank reference rate"); expect(T.how).toContain(loadFx().rates.GBP.toFixed(4));
    expect(Ts.h1).toMatch(/por menos de [\d.]+ libras$/); expect(Ts.how).toContain("Banco Central Europeo");
    expect(renderBody(T, en, { css: "", updated: E.W.ctx.updated })).toMatch(/<small class="ls-fx">≈ £[\d,]+<\/small>/);
    const near = plan.pages.find((p) => p.kind === "near")!;
    expect(plain(E.texts.get(near.path)!.facts[0])).toMatch(/^Distance to .+ in a straight line: from/);
    const rank = E.texts.get("/cheap-houses/cheapest")!;
    expect(rank.h1).toBe("The 20 cheapest homes for sale on RealHunt"); expect(rank.gridTitle).toMatch(/cheapest first/);
    expect(S.texts.get("/cheap-houses/cheapest")!.h1).toBe("Las 20 viviendas más baratas en venta en RealHunt");
    const area = plan.pages.find((p) => p.kind === "area")!;
    expect(E.texts.get(area.path)!.how).toMatch(/here means the homes we list in .+\(\d+\)/);
  });
  it("countries where not everybody can buy freely say so above the homes, once", () => {
    const dk = out.get("/homes/denmark")!.body;
    expect(dk).toMatch(/<aside class="ls-first"><b>Can you buy here\? Read this first<\/b>/);
    expect(dk.indexOf('<aside class="ls-first"')).toBeLessThan(dk.indexOf('id="homes"'));
    expect(E.texts.get("/homes/denmark")!.costs.some((c) => c.startsWith("Can foreigners buy?"))).toBe(false);
    expect(out.get("/homes/france")!.body).not.toContain('<aside class="ls-first"');
    expect(E.texts.get("/homes/france")!.costs.some((c) => c.startsWith("Can foreigners buy?"))).toBe(true);
    expect(E.texts.get("/homes/france")!.costs.some((c) => /^At the same percentages: on €40,000, .+; on €80,000, .+; on €150,000, /.test(c))).toBe(true);
    expect(outEs.get("/homes/denmark")!).toContain("¿Puedes comprar aquí? Lee esto primero");
  });
  it("sourced notes: an official address, a month, both languages, and only on the page they are about", () => {
    expect(NOTES.length).toBeGreaterThanOrEqual(8);
    for (const n of NOTES) {
      expect(n.sources.length, n.id).toBeGreaterThanOrEqual(1);
      for (const [name, url, nameEs] of n.sources) { expect(name.length).toBeGreaterThan(10); expect(nameEs.length).toBeGreaterThan(10); expect(url).toMatch(/^https:\/\/[a-z0-9.-]+\.(europa\.eu|gob\.es|gov|gov\.uk|se|gr|gov\.cy)\//); }
      expect(n.asOf).toMatch(/^20\d\d-\d\d$/);
      expect(n.en.p.length).toBe(n.es.p.length); expect(n.en.h && n.es.h).toBeTruthy();
      for (const s of [n.en.h, n.es.h, ...n.en.p, ...n.es.p]) expect(s).not.toMatch(/—|guarantee|will rise|best investment/i);
      const on = plan.pages.filter((p) => E.texts.get(p.path)?.notes.some((x) => x.id === n.id));
      expect(on.length, n.id).toBeLessThanOrEqual(1);
    }
    const bg = out.get("/homes/bulgaria")!.body;
    expect(bg).toContain('id="note-bulgaria-euro"'); expect(bg).toContain("https://www.ecb.europa.eu/euro/changeover/bulgaria/html/index.en.html"); expect(bg).toContain("Checked November 2026. General information, not legal or tax advice.");
    expect(outEs.get("/homes/bulgaria")!).toContain("Revisado en noviembre de 2026. Información general, no asesoramiento legal ni fiscal.");
    expect(out.get("/homes/bulgaria/under-80000")?.body || "").not.toContain("note-bulgaria-euro");
  });
  it("the breadcrumb opens <main>, so the site-wide pass replaces it instead of adding a second one", () => {
    for (const [u, pg] of out) expect(pg.body, u).toMatch(/^<main [^>]*><nav class="ls-crumbs" aria-label="Breadcrumb">/);
  });
  it("the hub shows what is in season and every family", () => {
    const hub = out.get("/cheap-houses")!.body;
    expect(hub).toContain("<h2>In season</h2>"); expect(hub).toMatch(/For the winter<\/b> <a class="ls-chip" href="\/cheap-houses\/with-fireplace"/);
    for (const label of ["In pounds and dollars", "Rankings", "Near a city"]) expect(hub).toContain(`<b>${label}</b>`);
  });
});
