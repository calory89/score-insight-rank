// The edge function realhunt-live-search imports this same file (Deno), so these tests cover its pure helpers.
import { describe, expect, it } from "vitest";
import {
  parseLiveQuery, liveKey, cbSearchUrls, parseCbMatch, pickCb, cbPhotos, liveScore, parseClaudeListings, slugFor, toEur, jobCost, fits, median, SHOW_MIN, type CbRow,
  pickMedian, parseReview, parseTranslations, translatePrompt, gateDecision, orderPhotos, textFlags, inconsistent, reviewPrompt, TITLE_EXAMPLES, parseCbFacts, niceArea,
} from "../../supabase/functions/realhunt-live-search/core";

describe("parseLiveQuery", () => {
  it("reads the owner's example in Spanish", () => {
    const p = parseLiveQuery("casas en Miami por menos de 300.000 € de 3 habitaciones con buena puntuación");
    expect(p.ok).toBe(true);
    expect(p).toMatchObject({ kind: "buy", city: "miami", state: "fl", country: "United States", min_beds: 3, max_price: 300000, currency: "EUR", max_eur: 300000, good_score: true, ptype: "house" });
  });
  it("reads dollars and k", () => {
    const p = parseLiveQuery("3 bedroom house in Miami under $300k");
    expect(p).toMatchObject({ ok: true, min_beds: 3, max_price: 300000, currency: "USD", ptype: "house", city: "miami" });
    expect(p.max_eur).toBe(268800);
  });
  it("reads a dollar sign after the amount and two-word cities", () => {
    const p = parseLiveQuery("casas en Boca Raton por menos de 500.000 $");
    expect(p).toMatchObject({ ok: true, city: "boca raton", state: "fl", max_price: 500000, currency: "USD" });
  });
  it("knows rentals and small monthly budgets", () => {
    const p = parseLiveQuery("piso en alquiler en Madrid hasta 1.200 € al mes");
    expect(p).toMatchObject({ ok: true, kind: "rent", ptype: "apartment", max_price: 1200, place: "Madrid" });
  });
  it("finds a country and a free-text place", () => {
    expect(parseLiveQuery("2 bed flat in Lisbon with a garden")).toMatchObject({ ok: true, place: "Lisbon", min_beds: 2, ptype: "apartment" });
    expect(parseLiveQuery("cheap house in Italy")).toMatchObject({ ok: true, country: "Italy" });
    expect(parseLiveQuery("condo in Some Town, FL under 200k")).toMatchObject({ ok: true, state: "fl", city: "some town", country: "United States" });
  });
  it("treats style and condition words as features, never as part of the place (owner's screenshot, 8-nov)", () => {
    const p = parseLiveQuery("Casas en madrid moderna 3 habitaciones por menos de 200.000");
    expect(p).toMatchObject({ ok: true, place: "Madrid", min_beds: 3, max_price: 200000, currency: "EUR" });
    expect(p.features).toContain("moderna");
    expect(parseLiveQuery("piso reformado en Sevilla con vistas").place).toBe("Sevilla");
    expect(parseLiveQuery("casas en Valencia bonita y barata").place).toBe("Valencia");
    expect(parseLiveQuery("casa de lujo en Marbella").place).toBe("Marbella");
    expect(parseLiveQuery("casas en Malaga nuevas reformadas").place).toBe("Malaga");
    expect(parseLiveQuery("flat in central London under £300k").place).toBe("London");
    expect(parseLiveQuery("homes in Porto modern renovated").place).toBe("Porto");
    // "new" that starts a place name stays
    expect(parseLiveQuery("modern house in New York under $500k")).toMatchObject({ city: "new york", features: ["modern"] });
    expect(parseLiveQuery("casa en Nueva York").place).toBe("Nueva York");
    expect(parseLiveQuery("homes in Bonita Springs, FL").place).toBe("Bonita Springs");
  });
  it("refuses anything that is not about homes", () => {
    expect(parseLiveQuery("best pizza in Miami").reason).toBe("not_homes");
    expect(parseLiveQuery("hotel in Paris tonight").reason).toBe("not_homes");
    expect(parseLiveQuery("write me a poem").reason).toBe("not_homes");
    expect(parseLiveQuery("hi").reason).toBe("empty");
    expect(parseLiveQuery("house ".repeat(50)).reason).toBe("too_long");
    expect(parseLiveQuery("3 bedroom house").reason).toBe("no_place");
  });
});

describe("liveKey", () => {
  it("gives the same key to the same search in two languages", () => {
    expect(liveKey(parseLiveQuery("houses in Miami under €300,000 with 3 bedrooms"))).toBe(liveKey(parseLiveQuery("casas en Miami por menos de 300.000 € de 3 habitaciones")));
    expect(liveKey(parseLiveQuery("homes in Miami under €300,000"))).not.toBe(liveKey(parseLiveQuery("homes in Miami under €400,000")));
    expect(liveKey(parseLiveQuery("rent a home in Miami"))).not.toBe(liveKey(parseLiveQuery("buy a home in Miami")));
  });
});

const MATCH = 'listingMasterId":"P008ABC","photos":[{"indexNum":0,"mediaUrl":"https://images-listings.coldwellbanker.com/SEFMLS/A1/_P/A12118056_P00.jpg","isPortrait":false}],"propertyAddress":"11020 SW 60th St #4B, Miami, FL 33173","price":"$285,000","markerPrice":285000,"beds":3,"baths":2,"squareFeet":"1,075","propertyTypeValue":"Single Family","standardStatus":"ACTIVE","gis":{"latitude":25.71152,"longitude":-80.37285},"propertyDetailsRoutePath":"/fl/miami/11020-sw-60th-st/lid-P008ABC","hidePrice":fals';
describe("Coldwell Banker fallback", () => {
  it("builds search pages with the budget in dollars", () => {
    const u = cbSearchUrls(parseLiveQuery("3 bedroom house in Miami under €300k"), 2);
    expect(u[0]).toBe("https://www.coldwellbanker.com/city/fl/miami?maxPrice=334821&minBedrooms=3");
    expect(u[1]).toContain("page=2");
    expect(cbSearchUrls(parseLiveQuery("house in Madrid"))).toEqual([]);
  });
  it("parses a search result", () => {
    const r = parseCbMatch(MATCH)!;
    expect(r).toMatchObject({ id: "P008ABC", price: 285000, beds: 3, baths: 2, sqft: 1075, type: "Single Family", status: "ACTIVE", lat: 25.71152, lng: -80.37285 });
    expect(r.url).toBe("https://www.coldwellbanker.com/fl/miami/11020-sw-60th-st/lid-P008ABC");
    expect(r.photo).toBe("https://images-listings.coldwellbanker.com/SEFMLS/A1/_P/A12118056_P00.jpg?width=1280");
    expect(parseCbMatch("garbage")).toBeNull();
  });
  it("keeps active homes that fit, cheapest per sq ft first", () => {
    const base = parseCbMatch(MATCH)!;
    const rows: CbRow[] = [
      { ...base, id: "a", price: 280000, sqft: 2000 },
      { ...base, id: "b", price: 250000, sqft: 1000 },
      { ...base, id: "c", status: "PENDING" },
      { ...base, id: "d", beds: 2 },
      { ...base, id: "e", price: 5000 }, // a rental
      { ...base, id: "f", type: "Land" },
      { ...base, id: "g", price: 400000 },
      { ...base, id: "a", price: 1 }, // duplicate
    ];
    const p = parseLiveQuery("3 bed home in Miami under $300k");
    expect(pickCb(rows, p).map((r) => r.id)).toEqual(["a", "b"]);
    expect(pickCb(rows, parseLiveQuery("3 bed home for rent in Miami")).map((r) => r.id)).toEqual(["e"]);
    expect(pickCb(rows, parseLiveQuery("3 bed condo in Miami under $300k"))).toEqual([]);
  });
  it("keeps only this listing's photos", () => {
    const first = "https://images-listings.coldwellbanker.com/X/_P/A1_P00.jpg?width=1280";
    expect(cbPhotos(["https://images-listings.coldwellbanker.com/X/_P/A1_P01.jpg?width=390", "https://images-listings.coldwellbanker.com/Y/_P/B9_P00.jpg", "https://cdn.x.com/logo.jpg"], first))
      .toEqual([first, "https://images-listings.coldwellbanker.com/X/_P/A1_P01.jpg?width=1280"]);
  });
});

describe("liveScore", () => {
  const ctx = { median_ppm: 1400, min_beds: 3 };
  const x = { price_eur: 210000, sqm: 150, photos: 12, beds: 3, lat: 1, lng: 1, desc_len: 300, kind: "buy" as const };
  it("adds value, photos, bedrooms and completeness", () => {
    // 1400 €/m² is the median: value 21.8, photos 5 + 7.5 (quality not checked yet), beds 15, complete 25
    expect(liveScore(x, ctx).score).toBe(74);
    expect(liveScore({ ...x, photo_quality: 9 }, ctx).score).toBe(80);
    expect(liveScore({ ...x, price_eur: 105000 }, ctx).parts.value).toBe(40);
    expect(liveScore({ ...x, price_eur: 400000 }, ctx).parts.value).toBe(0);
  });
  it("is neutral when it cannot compare or could not see the photos", () => {
    expect(liveScore({ ...x, sqm: null }, ctx).parts.value).toBe(20);
    expect(liveScore(x, { median_ppm: null, min_beds: null }).parts).toMatchObject({ value: 20, beds: 10 });
    expect(liveScore({ ...x, photos: null }, ctx).parts.photos).toBe(10);
    expect(liveScore({ ...x, beds: 2 }, ctx).parts.beds).toBe(0);
    const s = liveScore({ price_eur: null, sqm: null, photos: 0, beds: null, lat: null, lng: null, desc_len: 0, kind: "buy" }, ctx).score;
    expect(s).toBeGreaterThanOrEqual(0); expect(s).toBeLessThanOrEqual(100);
  });
  it("only lets complete, good-value, well-photographed homes reach the bar", () => {
    expect(SHOW_MIN).toBe(80);
    const good = { ...x, photo_quality: 8 };
    expect(liveScore({ ...good, price_eur: 180000 }, ctx).score).toBeGreaterThanOrEqual(SHOW_MIN); // below the median
    expect(liveScore({ ...good, price_eur: 260000 }, ctx).score).toBeLessThan(SHOW_MIN); // above the median
    expect(liveScore({ ...good, price_eur: 180000, photo_quality: 4 }, ctx).score).toBeLessThan(SHOW_MIN); // ugly photos
    expect(liveScore({ ...good, sqm: null }, ctx).score).toBeLessThan(SHOW_MIN); // size unknown
  });
  it("takes points off for caveats and caps blocking flags", () => {
    const good = { ...x, price_eur: 150000, photo_quality: 9 };
    const a = liveScore(good, ctx).score;
    expect(liveScore({ ...good, flags: ["age_restricted"] }, ctx).score).toBe(a - 6);
    expect(liveScore({ ...good, flags: ["needs_renovation"] }, ctx).score).toBe(a - 10);
    const m = liveScore({ ...good, flags: ["manufactured_home"] }, ctx);
    expect(m.score).toBeLessThanOrEqual(60); expect(m.caps).toContain("blocking_flag");
  });
  it("does not let a price that looks too good reach 80 unless the check explains it", () => {
    const cheap = { ...x, price_eur: 90000, photo_quality: 10 }; // 600 €/m², 43 % of the median
    const s = liveScore(cheap, ctx);
    expect(s.score).toBe(SHOW_MIN - 1); expect(s.caps).toContain("cheap_unexplained");
    expect(liveScore({ ...cheap, why_cheap: "Small 1960s building far from the beach." }, ctx).score).toBeGreaterThanOrEqual(SHOW_MIN);
    expect(liveScore({ ...x, price_eur: 20000, photo_quality: 10, why_cheap: "x" }, ctx).parts.value).toBe(30); // under 0.3 x
  });
  it("takes a median and picks the closest comparables", () => {
    expect(median([3, 1, 2])).toBe(2); expect(median([4, 1, 2, 3])).toBe(2.5); expect(median([])).toBeNull();
    expect(pickMedian([1, 2, 3, 4, 5, 6, 7, 8], [100], 50)).toEqual({ ppm: 4.5, from: "scan" });
    expect(pickMedian([10], [20, 30, 40], 50)).toEqual({ ppm: 25, from: "local" });
    expect(pickMedian([], [20], 50)).toEqual({ ppm: 50, from: "country" });
    expect(pickMedian([], [], null)).toEqual({ ppm: null, from: null });
  });
});

describe("the quality gate", () => {
  const review = (o: Record<string, unknown> = {}) => JSON.stringify({ photo_quality: 8, order: [2, 0, 1, 3], flags: [], title: "Bright corner condo", why_great: "Big balcony.", why_cheap: null, ...o });
  it("reads the AI review defensively", () => {
    const r = parseReview("Here you go:\n```json\n" + review({ order: [2, 2, 9, -1, "1"], flags: ["Age_Restricted", "made_up"], title: "Corner condo — big balcony", why_cheap: "null", hoa_monthly: "450" }) + "\n```", 4)!;
    expect(r.order).toEqual([2, 1]);
    expect(r.flags).toEqual(["age_restricted"]);
    expect(r.title).toBe("Corner condo, big balcony");
    expect(r.why_cheap).toBeNull();
    expect(r.hoa_monthly).toBe(450);
    expect(parseReview("no json", 3)).toBeNull();
    expect(parseReview('{"photo_quality":"high"}', 3)).toBeNull();
    expect(parseReview('{"photo_quality":14}', 3)!.photo_quality).toBe(10);
  });
  it("keeps the Spanish texts of the review (no English on the Spanish site)", () => {
    const r = parseReview(review({ why_cheap: "Mobile home on rented land.", title_es: "Piso esquinero luminoso — gran balcón", why_great_es: "Gran balcón.", why_cheap_es: "Casa móvil en terreno alquilado." }), 4)!;
    expect(r.title_es).toBe("Piso esquinero luminoso, gran balcón");
    expect(r.why_great_es).toBe("Gran balcón.");
    expect(r.why_cheap_es).toBe("Casa móvil en terreno alquilado.");
    const n = parseReview(review({ why_cheap: null, why_cheap_es: "Algo" }), 4)!;
    expect(n.why_cheap_es).toBeNull();
    expect(parseReview(review(), 4)!.title_es).toBeNull();
  });
  it("reads batch translations of older homes defensively", () => {
    expect(translatePrompt([{ id: "a", title: "House", why_great: "Nice." }])).toContain('"id":"a"');
    const out = parseTranslations('ok [{"id":"a","title_es":"Casa — bonita","why_great_es":"Bonita.","why_cheap_es":null},{"id":"zzz","title_es":"x"},{"id":"b","title_es":""}]', ["a", "b"]);
    expect(out).toEqual([{ id: "a", title_es: "Casa, bonita", why_great_es: "Bonita.", why_cheap_es: null }]);
    expect(parseTranslations("nothing", ["a"])).toEqual([]);
  });
  it("shows only good, complete, unflagged homes", () => {
    const r = parseReview(review(), 4)!;
    expect(gateDecision(85, r, 6)).toEqual({ show: true, reasons: [] });
    expect(gateDecision(79, r, 6).reasons).toContain("score");
    expect(gateDecision(90, { ...r, photo_quality: 6 }, 6).reasons).toContain("photos");
    expect(gateDecision(90, r, 3).reasons).toContain("few_photos");
    expect(gateDecision(90, { ...r, flags: ["manufactured_home"] }, 6).reasons).toContain("flag:manufactured_home");
    expect(gateDecision(90, { ...r, flags: ["age_restricted"] }, 6).show).toBe(true); // a caveat, shown with a label
    expect(gateDecision(99, null, 9)).toEqual({ show: false, reasons: ["not_reviewed"] });
  });
  it("keeps why_cheap to the reason", async () => {
    const { cleanCheap } = await import("../../supabase/functions/realhunt-live-search/core");
    expect(cleanCheap("1964 home in suburban Tampa location; 60% of area median suggests home still needs updates; older systems may need work.")).toBe("1964 home in suburban Tampa location; older systems may need work.");
    expect(cleanCheap("Priced 38% below median comparable homes in the area, suggesting strong buyer value.")).toBeNull();
    expect(cleanCheap("Mobile home on rented land: you pay a monthly lot fee.")).toBe("Mobile home on rented land: you pay a monthly lot fee.");
    expect(cleanCheap(null)).toBeNull();
  });
  it("orders photos best first and drops the rejected ones", () => {
    const ph = ["a", "b", "c", "d", "e", "f", "g", "h"];
    expect(orderPhotos(ph, { order: [3, 0] }, 6)).toEqual(["d", "a", "g", "h"]);
    expect(orderPhotos(ph, null, 0, 3)).toEqual(["a", "b", "c"]);
  });
  it("finds flags in the listing text", () => {
    expect(textFlags("Lovely double wide mobile home, lot rent $850")).toEqual(expect.arrayContaining(["manufactured_home", "land_lease"]));
    expect(textFlags("Condo in a 55+ community, sold as-is")).toEqual(expect.arrayContaining(["age_restricted", "needs_renovation"]));
    expect(textFlags("Tenant occupied until June. Cash only.")).toEqual(expect.arrayContaining(["tenant_occupied", "cash_only"]));
    expect(textFlags("Renovated 3 bed house with a pool, built 1955")).toEqual([]);
    // the owner's example: 5 bedrooms and 4 bathrooms in 93 m²
    expect(textFlags("", { beds: 5, baths: 4, sqm: 93 })).toEqual(["inconsistent_data"]);
    expect(inconsistent({ beds: 3, baths: 2, sqm: 120 })).toBe(false);
  });
  it("writes a prompt with the area comparison and RealHunt's title style", () => {
    const t = reviewPrompt({ kind: "buy", price: 90000, currency: "USD", price_eur: 80640, beds: 1, sqm: 82, ptype: "Condo", location: "Miami, Florida", country: "United States", ratio: 0.42, text: "Nice", facts: "", nPhotos: 6 });
    expect(t).toContain("42% of the median");
    expect(t).toContain("numbered 0 to 5");
    expect(t).toContain(TITLE_EXAMPLES[0]);
    expect(t).not.toMatch(/—/);
  });
  it("reads Coldwell Banker facts", () => {
    const f = parseCbFacts(['publicRemarks":"GREAT HOME.\\r\\nPOOL, TENNIS."', 'seniorCommunity":true', 'associationFee":1350', 'associationFeeFrequency":"Quarterly"', 'taxAnnualAmount":248', 'subdivisionName":"DORSET AT CENTURY VILLAGE CONDO SEC 2"']);
    expect(f.remarks).toBe("GREAT HOME. POOL, TENNIS.");
    expect(f.senior).toBe(true);
    expect(f.hoa).toBe(450);
    expect(f.tax).toBe(248);
    expect(f.subdivision).toBe("Dorset at Century Village");
    expect(niceArea("MAR-LEN GARDENS")).toBe("Mar-Len Gardens");
    expect(niceArea("NONE")).toBe("");
  });
});

describe("jobCost", () => {
  it("prices tokens and web searches", () => {
    // 40k in at $1/M + 2k out at $5/M + 5 searches at $0.01 = 0.04 + 0.01 + 0.05
    expect(jobCost("claude-haiku-4-5", { input_tokens: 40000, output_tokens: 2000, server_tool_use: { web_search_requests: 5 } })).toBe(0.1);
    expect(jobCost("claude-sonnet-4-5-20250929", { input_tokens: 1e6 })).toBe(3);
    expect(jobCost("claude-haiku-4-5", { cache_read_input_tokens: 1e6, cache_creation_input_tokens: 1e6 })).toBe(1.35);
    expect(jobCost("mystery", { output_tokens: 1e6 })).toBe(15);
    expect(jobCost("claude-haiku-4-5", null)).toBe(0);
  });
});

describe("fits", () => {
  const p = parseLiveQuery("3 bed homes in Miami under €300k");
  const h = { kind: "buy" as const, country: "United States", place: "Kendall, Miami, Florida", price_eur: 250000, beds: 3 };
  it("matches homes we already have", () => {
    expect(fits(h, p)).toBe(true);
    expect(fits({ ...h, price_eur: 320000 }, p)).toBe(false);
    expect(fits({ ...h, beds: 2 }, p)).toBe(false);
    expect(fits({ ...h, place: "Orlando, Florida" }, p)).toBe(false);
    expect(fits({ ...h, kind: "rent" }, p)).toBe(false);
    expect(fits({ ...h, country: "Spain", place: "Madrid" }, parseLiveQuery("homes in Spain"))).toBe(true);
  });
});

describe("parseClaudeListings", () => {
  const results = ["https://www.idealista.com/inmueble/123/", "https://www.zillow.com/homedetails/1-Main-St/1_zpid/"];
  it("reads JSON inside prose and keeps only search-result URLs", () => {
    const text = 'Here you go:\n```json\n[{"url":"https://idealista.com/inmueble/123","title":"Piso","price":"250.000","currency":"eur","beds":3,"sqm":90,"location":"Madrid","kind":"buy"},' +
      '{"url":"https://made-up.example/x","title":"Fake","price":1},{"url":"https://www.zillow.com/homedetails/1-Main-St/1_zpid/","price":2500,"currency":"USD","kind":"rent","image_url":"javascript:x"}]\n```';
    const out = parseClaudeListings(text, results);
    expect(out.map((o) => o.url)).toEqual(["https://idealista.com/inmueble/123", "https://www.zillow.com/homedetails/1-Main-St/1_zpid/"]);
    expect(out[0]).toMatchObject({ price: 250000, currency: "EUR", beds: 3, sqm: 90, kind: "buy" });
    expect(out[1]).toMatchObject({ kind: "rent", image_url: null, currency: "USD" });
  });
  it("survives bad answers", () => {
    expect(parseClaudeListings("no listings found", results)).toEqual([]);
    expect(parseClaudeListings("[not json", results)).toEqual([]);
    expect(parseClaudeListings('{"a":1}', results)).toEqual([]);
  });
});

describe("slugs and money", () => {
  it("makes review-queue slugs", () => {
    expect(slugFor("https://x", { city: "boca raton", address: "123 Main St #4B", price: 450000 })).toBe("us-boca-raton-123-4b-450k");
    expect(slugFor("https://www.idealista.com/inmueble/1/")).toMatch(/^live-idealista-[a-z0-9]+$/);
  });
  it("converts to euros", () => {
    expect(toEur(100000, "USD")).toBe(89600);
    expect(toEur(100, "XXX")).toBeNull();
    expect(toEur(null, "EUR")).toBeNull();
  });
});

describe("guards", () => {
  it("drops web results that do not match the ask", async () => {
    const { withinAsk } = await import("../../supabase/functions/realhunt-live-search/core");
    const p = parseLiveQuery("3 bedroom house in Miami under $300k");
    expect(withinAsk({ kind: "buy", price: 299000, currency: "USD", beds: 3 }, p)).toBe(true);
    expect(withinAsk({ kind: "buy", price: 320000, currency: "USD", beds: 3 }, p)).toBe(false);
    expect(withinAsk({ kind: "buy", price: 250000, currency: "USD", beds: 2 }, p)).toBe(false);
    expect(withinAsk({ kind: "rent", price: 2500, currency: "USD", beds: 3 }, p)).toBe(false);
    expect(withinAsk({ kind: "buy", price: null, currency: "USD", beds: null }, p)).toBe(true);
  });
  it("does not reward prices that look too good to be true", () => {
    const x = { price_eur: 20000, sqm: 150, photos: 12, beds: 3, lat: 1, lng: 1, desc_len: 300, kind: "buy" as const, photo_quality: 10 };
    expect(liveScore(x, { median_ppm: 1400, min_beds: 3 }).score).toBe(SHOW_MIN - 1);
  });
  it("leaves out listings under half the city's median per sq ft", () => {
    const base = parseCbMatch(MATCH)!;
    const rows: CbRow[] = Array.from({ length: 9 }, (_, i) => ({ ...base, id: "n" + i, price: 200000 + i * 1000, sqft: 1000 }));
    rows.push({ ...base, id: "odd", price: 60000, sqft: 1000 });
    const ids = pickCb(rows, parseLiveQuery("3 bed home in Miami under $300k")).map((r) => r.id);
    expect(ids).not.toContain("odd"); expect(ids[0]).toBe("n0");
  });
  it("compares townhouses with townhouses", async () => {
    const { cbGroup, cbGroupMedians } = await import("../../supabase/functions/realhunt-live-search/core");
    const base = parseCbMatch(MATCH)!;
    const houses: CbRow[] = Array.from({ length: 8 }, (_, i) => ({ ...base, id: "h" + i, type: "Single Family", price: 300000, sqft: 1000 }));
    const towns: CbRow[] = Array.from({ length: 8 }, (_, i) => ({ ...base, id: "t" + i, type: "Townhouse", price: 200000 + i * 5000, sqft: 1000 }));
    expect(cbGroup("Townhouse")).toBe("townhouse"); expect(cbGroup("Condo")).toBe("condo"); expect(cbGroup("Single Family")).toBe("house");
    const m = cbGroupMedians([...houses, ...towns]);
    expect(m.townhouse! < m.house!).toBe(true);
    // the cheapest townhouse is 0.92 x the townhouse median, every house is 1.0 x the house median: the townhouse first,
    // but not all the townhouses before the houses just because they are cheaper per sq ft
    const ids = pickCb([...houses, ...towns], parseLiveQuery("3 bed home in Miami under $400k"), 16).map((r) => r.id);
    expect(ids[0]).toBe("t0"); expect(ids.indexOf("h0")).toBeLessThan(ids.indexOf("t7"));
  });
  it("leaves out manufactured homes", () => {
    const base = parseCbMatch(MATCH)!;
    expect(pickCb([{ ...base, type: "Manufactured" }, { ...base, id: "z", type: "Mobile Home" }], parseLiveQuery("3 bed home in Miami"))).toEqual([]);
  });
});

describe("age-restricted communities", () => {
  it("are recognised in descriptions", async () => {
    const { AGE_RESTRICTED } = await import("../../supabase/functions/realhunt-live-search/core");
    expect(AGE_RESTRICTED.test("Lovely condo in a 55+ community")).toBe(true);
    expect(AGE_RESTRICTED.test("Century Village, 55 and over")).toBe(true);
    expect(AGE_RESTRICTED.test("Age-restricted building")).toBe(true);
    expect(AGE_RESTRICTED.test("Built in 1955, 3 bedrooms")).toBe(false);
  });
});

describe("55+ communities by name and MLS flag", () => {
  it("are recognised", async () => {
    const { AGE_RESTRICTED, CB_FACTS_RX } = await import("../../supabase/functions/realhunt-live-search/core");
    expect(AGE_RESTRICTED.test('subdivisionName":"DORSET AT CENTURY VILLAGE CONDO"')).toBe(true);
    expect(AGE_RESTRICTED.test('seniorCommunityYN": true')).toBe(true);
    expect(AGE_RESTRICTED.test('seniorCommunityYN":false')).toBe(false);
    expect(AGE_RESTRICTED.test('seniorCommunity":true')).toBe(true);
    const m = '"subdivisionName":"DORSET AT CENTURY VILLAGE CONDO"'.match(new RegExp(CB_FACTS_RX));
    expect(m?.[1]).toContain("CENTURY VILLAGE");
  });
});
