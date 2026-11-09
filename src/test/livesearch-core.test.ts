// The edge function realhunt-live-search imports this same file (Deno), so these tests cover its pure helpers.
import { describe, expect, it } from "vitest";
import {
  parseLiveQuery, liveKey, cbSearchUrls, parseCbMatch, pickCb, cbPhotos, liveScore, parseClaudeListings, slugFor, toEur, jobCost, fits, median, SHOW_MIN, type CbRow,
  pickMedian, parseReview, parseTranslations, translatePrompt, gateDecision, orderPhotos, textFlags, inconsistent, reviewPrompt, TITLE_EXAMPLES, parseCbFacts, niceArea,
  resolveLive, placeOptions,
} from "../../supabase/functions/realhunt-live-search/core";
import { fixBedWords, bedWord, osa } from "../../supabase/functions/realhunt-live-search/words";
import { tzCountry } from "../../supabase/functions/realhunt-live-search/places";

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

describe("parseLiveQuery v3: typos, the centre, places in several countries", () => {
  it("reads the owner's Seville search with a typo (8-nov)", () => {
    const p = parseLiveQuery("casa en sevilla de 3 habtiacioens en el centro por menos de 200k");
    expect(p).toMatchObject({ ok: true, place: "Sevilla", min_beds: 3, max_price: 200000, max_eur: 200000, central: true, ptype_soft: true });
    expect(p.country).toBe(null); // Spain, Colombia or Ohio: resolveLive decides or asks
  });
  it("tolerates misspelt bedroom words after a number", () => {
    expect(parseLiveQuery("piso en Madrid de 2 habitacines").min_beds).toBe(2);
    expect(parseLiveQuery("casa en Malaga tres dormitoros").min_beds).toBe(3);
    expect(parseLiveQuery("4 bedromms house in Tampa").min_beds).toBe(4);
    expect(parseLiveQuery("2 bedroms flat in Lisbon").min_beds).toBe(2);
    expect(fixBedWords(" 3 habtiacioens ")).toBe(" 3 habitaciones ");
    expect(fixBedWords(" casa en sevila ")).toBe(" casa en sevila "); // places are never "corrected"
    expect(bedWord("bedford")).toBe(null);
    expect(osa("habtiacioens", "habitaciones")).toBe(2);
  });
  it("reads the centre as a preference, never as the place", () => {
    for (const q of ["flat in Madrid city centre", "piso en el centro de Madrid", "apartment downtown Madrid", "piso en el casco antiguo de Madrid", "homes in the old town of Madrid", "piso centrico en Madrid"]) {
      const p = parseLiveQuery(q);
      expect(p.place, q).toBe("Madrid");
      expect(p.central, q).toBe(true);
    }
    expect(parseLiveQuery("flat in Madrid").central).toBeFalsy();
    expect(liveKey(parseLiveQuery("piso en Madrid en el centro"))).not.toBe(liveKey(parseLiveQuery("piso en Madrid")));
  });
  it("knows the country of big cities without asking", () => {
    expect(parseLiveQuery("piso en Madrid hasta 200k")).toMatchObject({ country: "Spain", geo: "gazetteer" });
    expect(parseLiveQuery("2 bed flat in Lisboa")).toMatchObject({ country: "Portugal" });
    expect(parseLiveQuery("casa en Roma")).toMatchObject({ country: "Italy" });
    expect(parseLiveQuery("piso Malaga 2 habitaciones")).toMatchObject({ ok: true, place: "Malaga", country: "Spain" });
  });
  it("takes a bare place name as a search to buy there", () => {
    const p = parseLiveQuery("Sevilla");
    expect(p).toMatchObject({ ok: true, kind: "buy", place: "Sevilla", bare: true, country: null });
    expect(parseLiveQuery("Madrid")).toMatchObject({ ok: true, bare: true, country: "Spain" });
    expect(parseLiveQuery("hotel in Paris tonight").reason).toBe("not_homes");
    expect(parseLiveQuery("nice house in Spain").place).toBe(null); // "nice" is a word here, not the city
  });
  it("asks which Sevilla, unless the visitor's context makes it clear", () => {
    const q = parseLiveQuery("casa en sevilla de 3 habtiacioens en el centro por menos de 200k");
    const es = resolveLive(q, { tz: "Europe/Madrid" });
    expect(es.ask).toBe(null);
    expect(es.p).toMatchObject({ country: "Spain", place: "Sevilla", currency: "EUR" });
    const us = resolveLive(q, { tz: "America/New_York" });
    expect(us.ask?.map((o) => o.id)).toEqual(["es", "co", "us-oh"]);
    expect(resolveLive(q, { tz: "UTC" }).ask).toHaveLength(3);
    // a bare name always asks
    expect(resolveLive(parseLiveQuery("Sevilla"), { tz: "Europe/Madrid" }).ask).toHaveLength(3);
    // the choice goes into the search
    const oh = resolveLive(q, { choice: "us-oh" }).p;
    expect(oh).toMatchObject({ country: "United States", state: "oh", city: "seville", currency: "USD", geo: "chosen" });
    expect(oh.max_eur).toBe(179200);
    expect(resolveLive(q, { choice: "co" }).p).toMatchObject({ country: "Colombia", place: "Sevilla" });
    // the person said the country
    expect(resolveLive(parseLiveQuery("piso en Sevilla, España"), {}).ask).toBe(null);
    expect(parseLiveQuery("piso en Sevilla, España")).toMatchObject({ country: "Spain", place: "Sevilla" });
    expect(parseLiveQuery("Seville, Ohio 3 bedroom house")).toMatchObject({ state: "oh", country: "United States" });
  });
  it("resolves Valencia, Córdoba, Mérida and Naples by the visitor's country", () => {
    const v = parseLiveQuery("piso en Valencia 2 habitaciones hasta 180.000");
    expect(v).toMatchObject({ ok: true, place: "Valencia", min_beds: 2, max_price: 180000, ptype: "apartment" });
    expect(resolveLive(v, { tz: "Europe/Madrid" }).p.country).toBe("Spain");
    expect(resolveLive(v, { tz: "America/Caracas" }).p.country).toBe("Venezuela");
    expect(resolveLive(v, { tz: "Europe/Copenhagen" }).ask?.map((o) => o.country)).toEqual(["Spain", "Venezuela"]);
    expect(resolveLive(parseLiveQuery("casa en Córdoba"), { tz: "America/Argentina/Cordoba" }).p.country).toBe("Argentina");
    expect(resolveLive(parseLiveQuery("casa en Mérida 3 recamaras"), { tz: "America/Merida" }).p.country).toBe("Mexico");
    const n = parseLiveQuery("3 bedroom house in Naples under $500k");
    expect(resolveLive(n, { tz: "America/New_York" }).p).toMatchObject({ city: "naples", state: "fl", country: "United States" });
    expect(resolveLive(n, { tz: "Europe/Berlin" }).ask?.map((o) => o.id)).toEqual(["it", "us-fl"]);
    expect(resolveLive(parseLiveQuery("homes in Naples, FL"), { tz: "Europe/Berlin" }).ask).toBe(null);
    // Seville, Ohio is small: a US visitor's "Seville" still asks
    expect(resolveLive(parseLiveQuery("house in Seville"), { tz: "America/Chicago" }).ask).toHaveLength(3);
    // US cities that exist only once keep working as before
    expect(resolveLive(parseLiveQuery("3 bedroom house in Tampa under 350k"), { tz: "Europe/Madrid" })).toMatchObject({ ask: null, p: { city: "tampa", state: "fl" } });
  });
  it("knows the visitor's country from the time zone", () => {
    expect(tzCountry("Europe/Madrid")).toBe("Spain");
    expect(tzCountry("Atlantic/Canary")).toBe("Spain");
    expect(tzCountry("America/Los_Angeles")).toBe("United States");
    expect(tzCountry("Asia/Tokyo")).toBe(null);
    expect(placeOptions("Sévilla").length).toBe(3); expect(placeOptions("Atlantis")).toEqual([]);
    expect(placeOptions("SEVILLE").map((o) => o.id)).toEqual(["es", "co", "us-oh"]);
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
    // v3: a flat search does not answer with chalets (Valencia, 8-nov)
    const flat = parseLiveQuery("piso en Valencia 2 habitaciones hasta 180.000");
    const v = { kind: "buy" as const, country: "Spain", place: "Turís, Valencia, Spain", price_eur: 155000, beds: 3 };
    expect(fits({ ...v, title: "Chalet on a 1,526 m² plot with pool" }, flat)).toBe(false);
    expect(fits({ ...v, title: "Bright two-bed flat near the market" }, flat)).toBe(true);
    expect(fits({ ...v, title: "Renovated home with terrace" }, flat)).toBe(true);
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

describe("pisos.com, the free Spanish source (v3)", async () => {
  const P = await import("../../supabase/functions/realhunt-live-search/pisos");
  const fx = (await import("./fixtures/pisos-sevilla.json")).default as { cards: string[]; facts: string[]; images: string[] };
  const { resolveLive: rl } = await import("../../supabase/functions/realhunt-live-search/core");
  const sevilla = rl(parseLiveQuery("casa en sevilla de 3 habtiacioens en el centro por menos de 200k"), { tz: "Europe/Madrid" }).p;
  it("builds search pages: centre first, bedrooms and budget in the URL, dearest first", () => {
    const u = P.pisosSearchUrls(sevilla, 2).map((x) => x.url);
    // v4: a "centre" search reads the centre's own pages and the districts next to it, never the whole city
    expect(u).toEqual([
      "https://www.pisos.com/venta/pisos-sevilla_capital_casco_antiguo/con-3-habitaciones/hasta-181000/precio-desc/",
      "https://www.pisos.com/venta/pisos-sevilla_capital_casco_antiguo/con-3-habitaciones/hasta-181000/precio-desc/2/",
      "https://www.pisos.com/venta/pisos-sevilla_capital_triana/con-3-habitaciones/hasta-181000/precio-desc/",
      "https://www.pisos.com/venta/pisos-sevilla_capital_los_remedios/con-3-habitaciones/hasta-181000/precio-desc/",
      "https://www.pisos.com/venta/pisos-sevilla_capital_macarena/con-3-habitaciones/hasta-181000/precio-desc/",
      "https://www.pisos.com/venta/pisos-sevilla_capital_casco_antiguo/con-3-habitaciones/", // v5: comparables only
    ]);
    expect(P.pisosSearchUrls(sevilla, 2).filter((x) => x.comps).length).toBe(1);
    const plain = rl(parseLiveQuery("casa en sevilla de 3 habitaciones por menos de 200k"), { tz: "Europe/Madrid" }).p;
    expect(P.pisosSearchUrls(plain, 2).map((x) => x.url)).toEqual([
      "https://www.pisos.com/venta/pisos-sevilla_capital/con-3-habitaciones/hasta-181000/precio-desc/",
      "https://www.pisos.com/venta/pisos-sevilla_capital/con-3-habitaciones/hasta-181000/precio-desc/2/",
    ]);
    expect(P.pisosLoc("Marbella")).toBe("marbella");
    expect(P.pisosLoc("Seville")).toBe("sevilla_capital");
    expect(P.pisosSearchUrls(parseLiveQuery("3 bedroom house in Miami"), 2)).toEqual([]);
    expect(P.pisosSearchUrls(parseLiveQuery("chalet en Marbella"), 1)[0].url).toBe("https://www.pisos.com/venta/casas-marbella/");
    expect(P.pisosSearchUrls(parseLiveQuery("piso en Madrid hasta 300.000"), 1)[0].url).toBe("https://www.pisos.com/venta/piso-madrid_capital/hasta-272000/precio-desc/");
  });
  it("reads result cards", () => {
    const rows = fx.cards.map((c) => P.parsePisosCard(c)).filter(Boolean) as any[];
    expect(rows.length).toBe(fx.cards.length);
    expect(rows[0]).toMatchObject({ id: "67568763724_108900", price: 410000, beds: 3, baths: 2, sqm: 88, type: "piso", title: "Piso en calle de Afrodita", photos: 42 });
    expect(rows[0].url).toBe("https://www.pisos.com/comprar/piso-bellavista_la_palmera_bellavista41014-67568763724_108900/");
    expect(rows[0].photo).toMatch(/^https:\/\/fotos\.imghs\.net\/apps-wp\//);
    expect(rows[0].desc).toMatch(/terraza/);
    expect(P.pisosArea(rows[0].area, "Sevilla")).toBe("Bellavista, Sevilla");
    expect(P.parsePisosCard("<div>nothing</div>")).toBe(null);
    // central by the card's own district, never by the page it came from
    expect(rows[0].central).toBe(false);
    const old = fx.cards[0].replace(/ad-preview__subtitle">[^<]+/, 'ad-preview__subtitle">San Vicente (Distrito Casco Antiguo. Sevilla Capital)');
    expect(P.parsePisosCard(old)!.central).toBe(true);
  });
  it("keeps cards that fit, inside the budget, without squatters", () => {
    const rows = fx.cards.map((c) => P.parsePisosCard(c)).filter(Boolean) as any[];
    const picked = P.pickPisos(rows, sevilla);
    expect(picked.length).toBeGreaterThan(0);
    for (const r of picked) { expect(r.price).toBeLessThanOrEqual(200000); expect(r.beds).toBeGreaterThanOrEqual(3); }
    const squat = { ...rows[0], id: "x", price: 150000, desc: "Vivienda ocupada, sin posesión" };
    expect(P.pickPisos([squat], sevilla)).toEqual([]);
    expect(P.pisosBadText("Nuda propiedad")).toBe(true);
  });
  it("keeps only this listing's photos, biggest size, once each", () => {
    const first = "https://fotos.imghs.net/mm-wp/1089/012/1089_XA963-2421012_1_2026093016061031250.jpg";
    const ph = P.pisosPhotos(fx.images, first);
    expect(ph[0]).toBe("https://fotos.imghs.net/apps-wp/1089/012/1089_XA963-2421012_1_2026093016061031250.jpg");
    expect(ph.length).toBeGreaterThan(8);
    expect(new Set(ph).size).toBe(ph.length);
    expect(ph.every((u) => u.includes("1089_XA963-2421012_") && u.includes("/apps-wp/"))).toBe(true);
    // agencies that name photos by a uuid: told apart by their folder
    const u = (v: string, f: string, id: string) => `https://fotos.imghs.net/${v}/1005/${f}/${id}.jpg`;
    const other = P.pisosPhotos([u("xl-wp", "3230", "a1"), u("fchm-wp", "3230", "b2"), u("fchm-wp", "9999", "c3"), u("appswm-wp", "3230", "a1")], u("mm-wp", "3230", "a1"));
    expect(other).toEqual([u("apps-wp", "3230", "a1"), u("apps-wp", "3230", "b2")]);
  });
  it("reads a listing page's facts", () => {
    const f = P.parsePisosFacts(fx.facts);
    expect(f).toMatchObject({ lat: 37.3312538, lng: -5.9674503, fee: 92, condition: "En buen estado", baths: 2 });
    expect(f.age).toMatch(/20 y 30/);
    expect(P.decode("Ba&#xF1;os 88 m&#xB2;")).toBe("Baños 88 m²");
  });
});

describe("daily spending caps (v3)", async () => {
  const { dayBudget, CAPS } = await import("../../supabase/functions/realhunt-live-search/core");
  it("gives a person US$2 a day", () => {
    expect(CAPS.USER).toBe(2);
    expect(dayBudget({ admin: false, user: 0, ip: 0, net: 0, all: 0 }).budget).toBe(2);
    expect(dayBudget({ admin: false, user: 1.5, ip: 1.5, net: 1.5, all: 3 })).toMatchObject({ budget: 0.5, why: "user_budget" });
  });
  it("sums an IP address over all its accounts, so a new account does not start over", () => {
    // a fresh account (user 0) on an address that already spent US$2
    expect(dayBudget({ admin: false, user: 0, ip: 2, net: 2, all: 5 })).toMatchObject({ budget: 0, why: "user_budget" });
    expect(dayBudget({ admin: false, user: 0, ip: 1.9, net: 1.9, all: 5 }).budget).toBeCloseTo(0.1);
  });
  it("lets a shared network a little more, then stops it", () => {
    expect(dayBudget({ admin: false, user: 0, ip: 0, net: 5, all: 5 }).budget).toBe(1);
    expect(dayBudget({ admin: false, user: 0, ip: 0, net: 6.2, all: 7 })).toMatchObject({ budget: 0, why: "user_budget" });
  });
  it("says when it is everyone's cap", () => {
    expect(dayBudget({ admin: false, user: 0, ip: 0, net: 0, all: 29.9 })).toMatchObject({ why: "global_budget" });
    expect(dayBudget({ admin: false, user: 0, ip: 0, net: 0, all: 31 }).budget).toBe(0);
  });
  it("gives admins their own budget, with no address caps", () => {
    expect(dayBudget({ admin: true, user: 0.67, ip: 9, net: 9, all: 0.67 }).budget).toBeCloseTo(14.33);
    expect(dayBudget({ admin: true, user: 15, ip: 0, net: 0, all: 15 })).toMatchObject({ budget: 0, why: "user_budget" });
    expect(dayBudget({ admin: true, user: 1, ip: 0, net: 0, all: 30 })).toMatchObject({ budget: 0, why: "global_budget" });
  });
});

describe("closest misses (v3)", async () => {
  const { closestMisses } = await import("../../supabase/functions/realhunt-live-search/core");
  it("lists checked listings that missed only on photos or score, best first", () => {
    const base = { source: "web", show: false, url: "https://x", title: "t", price: 1, currency: "EUR", image: null, location: "" };
    const out = closestMisses([
      { ...base, id: "a", score: 81, photo_quality: 5, reasons: ["photos"] },
      { ...base, id: "b", score: 60, photo_quality: 5, reasons: ["score", "photos", "flag:inconsistent_data"] },
      { ...base, id: "c", score: 73, photo_quality: null, reasons: ["skip:review_cap", "not_reviewed"] },
      { ...base, id: "d", score: 75, photo_quality: 6, reasons: ["score", "photos"] },
      { ...base, id: "e", score: 90, photo_quality: 9, reasons: [], show: true },
      { ...base, id: "f", score: 50, photo_quality: 8, reasons: ["score"] },
    ]);
    expect(out.map((x) => x.id)).toEqual(["a", "d"]);
    expect(out[1].why).toEqual(["score", "photos"]);
  });
});

describe("the centre as real geography (v4, 8-nov-2026)", async () => {
  const CT = await import("../../supabase/functions/realhunt-live-search/centre");
  const P = await import("../../supabase/functions/realhunt-live-search/pisos");
  const fx = (await import("./fixtures/pisos-sevilla.json")).default as { cards: string[] };
  const sev = CT.centreFor("Seville", "Spain")!;
  it("knows the centre of the cities in the gazetteer", () => {
    expect(sev).toMatchObject({ name: "Sevilla", lat: 37.3891, lng: -5.9845, src: "table" });
    expect(CT.centreFor("sevilla")).toBe(sev);
    expect(CT.centreFor("Madrid", "Spain")!.label).toBe("Puerta del Sol");
    expect(CT.centreFor("Lisboa")!.country).toBe("Portugal");
    expect(CT.centreFor("miami", "United States")!.r_km).toBe(2.5);
    expect(CT.centreFor("Valencia", "Venezuela")).toBe(null); // the Spanish Valencia's centre is not Venezuela's
    expect(CT.centreFor("Nowhereville")).toBe(null);
  });
  it("measures the distance and keeps only listings within the radius", () => {
    expect(CT.km({ lat: 37.3891, lng: -5.9845 }, { lat: 37.3891, lng: -5.9845 })).toBe(0);
    // Plaza Nueva to Calle Sierpes (300 m), Triana's Calle Betis (about 1 km), Doctor Fedriani and Palmete (far)
    const sierpes = CT.centreFit(sev, { lat: 37.3925, lng: -5.9940 });
    expect(sierpes).toMatchObject({ status: "central", by: "coords" });
    expect(sierpes.km!).toBeLessThan(1.5);
    expect(CT.centreFit(sev, { lat: 37.3837, lng: -5.9998 }).status).toBe("central");
    const fedriani = CT.centreFit(sev, { lat: 37.4089451, lng: -5.9868636, text: "Doctor Fedriani (Distrito Macarena. Sevilla Capital)" });
    expect(fedriani).toMatchObject({ status: "outside", by: "coords", km: 2.2 });
    const palmete = CT.centreFit(sev, { lat: 37.3790, lng: -5.9330 });
    expect(palmete.status).toBe("outside");
    expect(palmete.km!).toBeGreaterThan(4);
    // the map position wins over the text, and nonsense coordinates are ignored
    expect(CT.centreFit(sev, { lat: 37.379, lng: -5.933, text: "Casco Antiguo" }).status).toBe("outside");
    expect(CT.centreFit(sev, { lat: 0, lng: 0, text: "Arenal (Distrito Casco Antiguo. Sevilla Capital)" })).toMatchObject({ status: "central", by: "district" });
    expect(CT.centreFit(sev, { lat: 40.4, lng: -3.7, text: "" }).status).toBe("unknown");
  });
  it("falls back to the listing's own district when it has no map position", () => {
    expect(CT.centreFit(sev, { text: "San Vicente (Distrito Casco Antiguo. Sevilla Capital)" })).toMatchObject({ status: "central", district: "casco antiguo" });
    expect(CT.centreFit(sev, { text: "Santa Cruz, Sevilla" }).status).toBe("central");
    expect(CT.centreFit(sev, { text: "Barrio León-El Tardón (Distrito Triana. Sevilla Capital)" })).toMatchObject({ status: "near", district: "triana" });
    expect(CT.centreFit(sev, { text: "Palmete (Distrito Cerro Amate. Sevilla Capital)" }).status).toBe("unknown");
    expect(CT.centreFit(sev, { text: "Sevilla Capital" }).status).toBe("unknown");
    // another town is never the centre of Sevilla
    expect(CT.cardPlaceText("Camas", "Sevilla")).toBe("");
    expect(CT.cardPlaceText("Arenal (Distrito Casco Antiguo. Sevilla Capital)", "Sevilla")).toMatch(/casco antiguo/);
    expect(CT.inCentre(CT.centreFit(sev, { text: "Triana, Sevilla" }))).toBe(true);
    expect(CT.inCentre(CT.centreFit(sev, { text: "Pino Montano, Sevilla" }))).toBe(false);
    // Barcelona: the Dreta de l'Eixample is central, the rest of the Eixample next to it
    const bcn = CT.centreFor("Barcelona")!;
    expect(CT.centreFit(bcn, { text: "Dreta de l'Eixample (Distrito Eixample. Barcelona Capital)" }).status).toBe("central");
    expect(CT.centreFit(bcn, { text: "Sant Antoni (Distrito Eixample. Barcelona Capital)" }).status).toBe("near");
  });
  it("geocodes other cities with a radius by size", () => {
    const town = CT.centreFromGeocode("Ronda", "Spain", { lat: "36.7423", lon: "-5.1671", boundingbox: ["36.73", "36.76", "-5.18", "-5.15"] })!;
    expect(town).toMatchObject({ lat: 36.7423, lng: -5.1671, r_km: 1.2, src: "geocoded" });
    const big = CT.centreFromGeocode("Big", "Spain", { lat: "40", lon: "-3", boundingbox: ["39.8", "40.2", "-3.3", "-2.7"] })!;
    expect(big.r_km).toBe(3);
    expect(CT.centreFromGeocode("X", "Spain", null)).toBe(null);
    // a geocoded city has no district lists: the generic words decide without a map position
    expect(CT.centreFit(town, { text: "Casco antiguo, Ronda" }).status).toBe("central");
  });
  it("writes the card's fact and the honest note", () => {
    expect(CT.centreFact({ status: "central", km: 1.2, by: "coords" })).toEqual({ en: "1.2 km from the centre", es: "A 1,2 km del centro" });
    expect(CT.centreFact({ status: "central", km: 0.1, by: "coords" })!.en).toBe("In the city centre");
    expect(CT.centreFact({ status: "near", km: null, by: "district" })!.en).toBe("Near the centre");
    expect(CT.centreFact({ status: "unknown", km: null, by: null })).toBe(null);
    expect(CT.centreNote({ place: "Sevilla", max_price: 200000, currency: "EUR", min_beds: 3, kind: "buy", closest_km: 2.14 }))
      .toBe("No home in central Sevilla under €200,000 with 3+ bedrooms passed our checks today. Closest checked: 2.1 km from the centre.");
    expect(CT.centreNote({ place: "Sevilla", max_price: 200000, currency: "EUR", min_beds: 3, closest_km: 2.14 }, "es"))
      .toBe("Hoy ninguna vivienda en el centro de Sevilla por menos de 200.000 € con 3 o más habitaciones ha pasado nuestras comprobaciones. La más cercana que revisamos está a 2,1 km del centro.");
    expect(CT.centreNote({ place: "Madrid", max_price: null, min_beds: null, closest_km: null })).toBe("No home in central Madrid passed our checks today.");
    // central listings were checked but missed the bar: say how many, and the nearest one outside the centre
    const tally = CT.centreTally([
      { source: "web", centre_status: "central", distance_to_centre_km: 0.6 }, { source: "web", centre_status: "near", distance_to_centre_km: null },
      { source: "web", centre_status: "outside", distance_to_centre_km: 2.8 }, { source: "realhunt", centre_status: "outside", distance_to_centre_km: 1.9 }, { source: "realhunt", centre_status: "central", distance_to_centre_km: 1 },
    ]);
    expect(tally).toEqual({ checked_central: 2, closest_km: 2.8 });
    expect(CT.centreNote({ place: "Madrid", max_price: 350000, currency: "EUR", min_beds: 2, ...tally }))
      .toBe("2 central homes checked (Madrid, under €350,000, 2+ bedrooms); none passed our photo and value checks today. Closest checked outside the centre: 2.8 km away.");
    expect(CT.centreNote({ place: "Madrid", ...tally }, "es")).toBe("Revisamos 2 viviendas del centro de Madrid; ninguna ha pasado hoy nuestras comprobaciones de fotos y precio. La más cercana fuera del centro está a 2,8 km.");
    expect(CT.centreNote({ place: "Madrid", max_price: 350000, currency: "EUR", min_beds: 2, checked_central: 12, closest_km: null }))
      .toBe("12 central homes checked (Madrid, under €350,000, 2+ bedrooms); none passed our photo and value checks today.");
    expect(CT.centreNote({ place: "Madrid", checked_central: 1 })).toBe("1 central home checked (Madrid); it did not pass our photo and value checks today.");
    expect(CT.centreNote({ place: "Madrid", max_price: 350000, currency: "EUR", min_beds: 2, checked_central: 12 }, "es"))
      .toBe("Revisamos 12 viviendas del centro de Madrid (por menos de 350.000 €, con 2 o más habitaciones); ninguna ha pasado hoy nuestras comprobaciones de fotos y precio.");
    expect(CT.centreNote({ place: "Miami", max_price: 350000, currency: "USD" })).toMatch(/under \$350,000/);
  });
  it("picks central pisos.com cards first and leaves other towns out", async () => {
    const { resolveLive: rl } = await import("../../supabase/functions/realhunt-live-search/core");
    const p = rl(parseLiveQuery("casa en sevilla de 3 habitaciones en el centro por menos de 500k"), { tz: "Europe/Madrid" }).p;
    const base = fx.cards.map((c) => P.parsePisosCard(c)).filter(Boolean) as any[];
    const card = (id: string, area: string) => ({ ...base[0], id, url: "https://www.pisos.com/comprar/x-" + id, area, price: 300000, beds: 3, photos: 30 });
    const rows = [card("1", "Palmete (Distrito Cerro Amate. Sevilla Capital)"), card("2", "Camas"), card("3", "Arenal (Distrito Casco Antiguo. Sevilla Capital)"),
      card("4", "Triana Casco Antiguo (Distrito Triana. Sevilla Capital)"), card("5", "Sevilla Capital"), card("6", "Pino Montano (Distrito Norte. Sevilla Capital)")];
    const ids = P.pickPisos(rows, p, 20, CT.centreFor("Sevilla")).map((r) => r.id);
    expect(ids.slice(0, 3)).toEqual(["3", "4", "5"]);
    expect(ids).not.toContain("2");
    expect(ids.slice(3).sort()).toEqual(["1", "6"]); // other districts only after, for the honest "closest" list
    // without the centre asked for, nothing is left out
    expect(P.pickPisos(rows, { ...p, central: false }, 20, null).length).toBe(6);
  });
  it("does not reuse answers to 'centre' searches made before the centre was real", () => {
    expect(liveKey(parseLiveQuery("piso en Madrid en el centro")).endsWith("|c3")).toBe(true);
  });
});

describe("value against the centre (v5, 8-nov-2026)", async () => {
  const CT = await import("../../supabase/functions/realhunt-live-search/centre");
  const P = await import("../../supabase/functions/realhunt-live-search/pisos");
  const flats = (v: number[]) => v.map((ppm, i) => ({ ppm, group: "flat" as const, id: "f" + i }));
  it("uses central comparables of the same kind, then any central, then the city x a premium", () => {
    const m = CT.centreMedians([...flats([5000, 5200, 5400, 5600, 5800, 6000]), { ppm: 3000, group: "house", id: "h" }], 3500);
    expect(m.flat).toEqual({ ppm: 5500, from: "centre_type", n: 6 });
    expect(m.house).toMatchObject({ from: "centre", ppm: 5400, n: 7 }); // one house: all central homes
    const few = CT.centreMedians(flats([5000, 5200, 5400]), 3500);
    expect(few.flat).toEqual({ ppm: 4375, from: "city_premium", n: 3 }); // 3,500 x 1.25
    expect(CT.centreMedians([], null).all).toEqual({ ppm: null, from: null, n: 0 });
    // the same listing seen twice (scan and an earlier find) counts once; nonsense is dropped
    const dup = CT.centreMedians([...flats([5000, 5000, 5000, 5000, 5000]), { ppm: 9000, group: "flat", id: "f0" }, { ppm: -1, group: "flat" }], 4000);
    expect(dup.flat.from).toBe("city_premium");
    // six odd cheap "houses" next to many central flats do not set the bar for houses
    const odd = CT.centreMedians([...flats([5000, 5200, 5400, 5600, 5800, 6000, 6200]), ...[900, 950, 1000, 1000, 1050, 1100].map((ppm, i) => ({ ppm, group: "house" as const, id: "h" + i }))], 3500);
    expect(odd.house.from).toBe("centre");
    expect(odd.flat.from).toBe("centre_type");
    expect(P.pisosGroup("chalet_adosado")).toBe("house");
    expect(P.pisosGroup("atico")).toBe("flat");
  });
  it("lets the best-value central homes reach 80 and keeps overpriced ones below", () => {
    const m = CT.centreMedians(flats([5000, 5200, 5400, 5600, 5800, 6000, 6200]), 3500).flat.ppm!;
    const home = (ppm: number) => liveScore({ price_eur: ppm * 70, sqm: 70, photos: 20, beds: 2, lat: 40.41, lng: -3.70, desc_len: 400, kind: "buy", photo_quality: 8, flags: [] }, { median_ppm: m, min_beds: 2 });
    expect(home(4600).score).toBeGreaterThanOrEqual(80); // 20 % under the centre's median
    expect(home(5600).score).toBeLessThan(80); // at the centre's median
    expect(home(7000).score).toBeLessThan(70); // overpriced for the centre
    // against the whole city (3,500 a m²) the same good-value central flat could never pass
    expect(liveScore({ price_eur: 4600 * 70, sqm: 70, photos: 20, beds: 2, lat: 40.41, lng: -3.70, desc_len: 400, kind: "buy", photo_quality: 8, flags: [] }, { median_ppm: 3500, min_beds: 2 }).score).toBeLessThan(80);
  });
});

describe("centre table and geocoder backup (8-nov-2026, Almería)", async () => {
  const CT = await import("../../supabase/functions/realhunt-live-search/centre");
  it("knows Almería and other provincial capitals", () => {
    const a = CT.centreFor("Almeria", "Spain")!;
    expect(a).toBeTruthy();
    expect(CT.centreFor("almería")).toBe(a);
    expect(CT.centreFor("A Coruña", "Spain")).toBeTruthy();
    // Benizalón (Almería province, about 40 km away) is not the centre of Almería
    expect(CT.centreFit(a, { lat: 37.213, lng: -2.2407, text: "Benizalón, Almería, Spain" }).status).toBe("outside");
  });
  it("builds a centre from Open-Meteo", () => {
    const c = CT.centreFromOpenMeteo("Almeria", "Spain", { latitude: 36.84, longitude: -2.46, population: 190000 })!;
    expect(c.r_km).toBe(1.6);
    expect(CT.centreFromOpenMeteo("X", "Spain", null)).toBeNull();
  });
});

describe("any town in the world (9-nov-2026)", async () => {
  const C = await import("../../supabase/functions/realhunt-live-search/core");
  it("asks for help when the rules cut a name or miss the country", () => {
    expect(C.needsUnderstanding(C.parseLiveQuery("casa en Vejer de la Frontera"), "casa en Vejer de la Frontera")).toBe(true);
    expect(C.needsUnderstanding(C.parseLiveQuery("appartamento a Lecce"), "appartamento a Lecce")).toBe(true);
    expect(C.needsUnderstanding(C.parseLiveQuery("3 bed house in Odense"), "3 bed house in Odense")).toBe(false);
  });
  it("keeps the geocoder to the same name and country", () => {
    const res = [{ name: "Sumbar", country: "Indonesia", country_code: "ID", admin1: "Central Java", latitude: -7, longitude: 110, population: 5000 }];
    expect(C.pickGeo(res, { place: "Sumba", country_code: "ID", region: null })).toBeNull();
    const ok = C.pickGeo([{ name: "Cuenca", country: "Spain", country_code: "ES", latitude: 40, longitude: -2, population: 50000 }, { name: "Cuenca", country: "Ecuador", country_code: "EC", admin1: "Azuay", latitude: -2.9, longitude: -79, population: 300000 }], { place: "Cuenca", country_code: "EC", region: null });
    expect(ok?.country).toBe("Ecuador");
  });
  it("merges: model's place and country, rule numbers win, local currency", () => {
    const p0 = C.parseLiveQuery("2 habitaciones en Vejer de la Frontera por menos de 200.000 euros");
    const u = C.parseUnderstood('{"home":true,"kind":"buy","place":"Vejer de la Frontera","region":"Andalusia","country":"Spain","country_code":"ES","central":false,"min_beds":2,"max_price":200000,"currency":"EUR","ptype":"any"}')!;
    const p = C.mergeUnderstood(p0, u, null);
    expect(p.ok).toBe(true); expect(p.place).toBe("Vejer de la Frontera"); expect(p.country).toBe("Spain"); expect(p.max_eur).toBe(200000);
    const q = C.mergeUnderstood(C.parseLiveQuery("condo in Playa del Carmen"), C.parseUnderstood('{"home":true,"place":"Playa del Carmen","country":"Mexico","country_code":"MX"}')!, null);
    expect(q.currency).toBe("MXN");
    expect(C.mergeUnderstood(q, C.parseUnderstood('{"home":false}')!, null).ok).toBe(false);
  });
});

describe("same home from two agencies (9-nov-2026)", async () => {
  const C = await import("../../supabase/functions/realhunt-live-search/core");
  it("keeps one", () => {
    const a = { id: "a", price: 290000, beds: 5, sqm: 160, location: "Vejer de la Frontera", score: 81 };
    const b = { ...a, id: "b" };
    const c = { ...a, id: "c", price: 250000 };
    expect(C.sameHomeOnce([a, b, c]).map((x) => x.id)).toEqual(["a", "c"]);
  });
});

describe("portal map (9-nov-2026)", async () => {
  const PT = await import("../../supabase/functions/realhunt-live-search/portals");
  it("knows each country's portals and which block robots", () => {
    expect(PT.portalsFor("Spain")[0].d).toBe("idealista.com");
    expect(PT.isBlocked("https://www.idealista.com/inmueble/123/")).toBe(true);
    expect(PT.isBlocked("https://www.pisos.com/comprar/piso-x-1/")).toBe(false);
    expect(PT.isBlocked("https://www.zillow.com/homedetails/1")).toBe(true);
    const h = PT.searchHint("Spain");
    expect(h).toContain("pisos.com"); expect(h).toContain("Never return");
    expect(PT.searchHint("Atlantis")).toContain("estate agents");
    expect(PT.PORTALS.length).toBeGreaterThan(45);
  });
});
