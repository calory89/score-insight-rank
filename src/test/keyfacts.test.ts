import { describe, expect, it } from "vitest";
import { keyFacts, barPlace } from "@/community/keyfactsLogic";
import { fmtDay, dateLocale } from "@/lib/dates";

describe("key facts row on a home page", () => {
  it("shows size, price per m², bedrooms and score when all are known", () => {
    const f = keyFacts({ price_eur: 249000, sqm: 108, bedrooms: 2 }, 84);
    expect(f.map((x) => x.k)).toEqual(["sqm", "per", "beds", "score"]);
    expect(f[0].value).toBe("108 m²");
    expect(f[1].value).toBe("€2,306");
    expect(f[2].value).toBe("2");
    expect(f[3].value).toBe("84");
  });
  it("leaves out a tile whose number is missing, never invents one", () => {
    expect(keyFacts({ price_eur: 90000, sqm: null, bedrooms: null }, null)).toEqual([]);
    expect(keyFacts({ price_eur: null, sqm: 80, bedrooms: 0 }).map((x) => x.k)).toEqual(["sqm", "beds"]);
    expect(keyFacts({ price_eur: 90000, sqm: 0, bedrooms: 3 }, 0).map((x) => x.k)).toEqual(["beds"]);
  });
});

describe("place in the phone action bar", () => {
  it("is the town and the country, not the cut full location", () => {
    expect(barPlace({ location_name: "Balatonlelle, Somogy (Lake Balaton)", country: "Hungary" })).toBe("Balatonlelle, Hungary");
    expect(barPlace({ location_name: "Arcidosso (Grosseto), Tuscany", country: "Italy" })).toBe("Arcidosso, Italy");
  });
  it("falls back sensibly", () => {
    expect(barPlace({ location_name: "", country: "Spain" })).toBe("Spain");
    expect(barPlace({ location_name: "Malta", country: "Malta" })).toBe("Malta");
    expect(barPlace({ location_name: "Peglio", country: null })).toBe("Peglio");
  });
});

describe("dates in the language of the page", () => {
  it("uses Spanish on Spanish pages and English elsewhere", () => {
    expect(dateLocale("es")).toBe("es-ES");
    expect(dateLocale("en")).toBe("en-GB");
    expect(fmtDay("2026-11-20", { lang: "en" })).toBe("20 Nov 2026");
    expect(fmtDay("2026-11-20", { lang: "es" })).toBe("20 nov 2026");
    expect(fmtDay("2026-11-20", { lang: "es", long: true })).toBe("20 de noviembre de 2026");
    expect(fmtDay("2026-11-20", { lang: "en", long: true })).toBe("20 November 2026");
  });
  it("gives nothing for bad input", () => {
    expect(fmtDay(null)).toBe("");
    expect(fmtDay("not a date")).toBe("");
  });
});

describe("square feet for US and UK homes (list of 1,000, idea 45)", () => {
  it("adds the size in square feet only where buyers read it", () => {
    expect(keyFacts({ price_eur: 200000, sqm: 150, bedrooms: 3, country: "United States" })[0]).toMatchObject({ k: "sqm", value: "150 m²", sqft: 1615 });
    expect(keyFacts({ price_eur: 200000, sqm: 90, country: "United Kingdom" })[0].sqft).toBe(969);
    expect(keyFacts({ price_eur: 200000, sqm: 150, country: "Spain" })[0].sqft).toBeUndefined();
  });
});
