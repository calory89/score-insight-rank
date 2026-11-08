// The edge function realhunt-live-search imports this same file (Deno), so these tests cover its pure helpers.
import { describe, expect, it } from "vitest";
import {
  parseLiveQuery, liveKey, cbSearchUrls, parseCbMatch, pickCb, cbPhotos, liveScore, parseClaudeListings, slugFor, toEur, jobCost, fits, median, SHOW_MIN, type CbRow,
} from "../../supabase/functions/realhunt-live-search/core";

describe("parseLiveQuery", () => {
  it("reads the owner's example in Spanish", () => {
    const p = parseLiveQuery("casas en Miami por menos de 300.000 € de 3 habitaciones con buena puntuación");
    expect(p.ok).toBe(true);
    expect(p).toMatchObject({ kind: "buy", city: "miami", state: "fl", country: "United States", min_beds: 3, max_price: 300000, currency: "EUR", max_eur: 300000, good_score: true, ptype: "any" });
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
    expect(liveKey(parseLiveQuery("homes in Miami under €300,000 with 3 bedrooms"))).toBe(liveKey(parseLiveQuery("casas en Miami por menos de 300.000 € de 3 habitaciones")));
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
    // 1400 €/m² is the median: value 24.5 (rounded in parts), photos 15, beds 15, complete 25
    expect(liveScore(x, ctx).score).toBe(80);
    expect(liveScore({ ...x, price_eur: 105000 }, ctx).parts.value).toBe(45);
    expect(liveScore({ ...x, price_eur: 400000 }, ctx).parts.value).toBe(0);
  });
  it("is neutral when it cannot compare or could not see the photos", () => {
    expect(liveScore({ ...x, sqm: null }, ctx).parts.value).toBe(22.5);
    expect(liveScore(x, { median_ppm: null, min_beds: null }).parts).toMatchObject({ value: 22.5, beds: 10 });
    expect(liveScore({ ...x, photos: null }, ctx).parts.photos).toBe(7.5);
    expect(liveScore({ ...x, beds: 2 }, ctx).parts.beds).toBe(0);
    const s = liveScore({ price_eur: null, sqm: null, photos: 0, beds: null, lat: null, lng: null, desc_len: 0, kind: "buy" }, ctx).score;
    expect(s).toBeGreaterThanOrEqual(0); expect(s).toBeLessThanOrEqual(100);
  });
  it("only lets complete, good-value homes reach the bar", () => {
    expect(SHOW_MIN).toBe(80);
    expect(liveScore({ ...x, price_eur: 180000 }, ctx).score).toBeGreaterThanOrEqual(SHOW_MIN); // below the median
    expect(liveScore({ ...x, price_eur: 260000 }, ctx).score).toBeLessThan(SHOW_MIN); // above the median
    expect(liveScore({ ...x, photos: 3 }, ctx).score).toBeLessThan(SHOW_MIN); // few photos
    expect(liveScore({ ...x, sqm: null }, ctx).score).toBeLessThan(SHOW_MIN); // size unknown
  });
  it("takes a median", () => {
    expect(median([3, 1, 2])).toBe(2); expect(median([4, 1, 2, 3])).toBe(2.5); expect(median([])).toBeNull();
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
    const x = { price_eur: 20000, sqm: 150, photos: 12, beds: 3, lat: 1, lng: 1, desc_len: 300, kind: "buy" as const };
    expect(liveScore(x, { median_ppm: 1400, min_beds: 3 }).parts.value).toBe(22.5);
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
    const m = '"subdivisionName":"DORSET AT CENTURY VILLAGE CONDO"'.match(new RegExp(CB_FACTS_RX));
    expect(m?.[1]).toContain("CENTURY VILLAGE");
  });
});
