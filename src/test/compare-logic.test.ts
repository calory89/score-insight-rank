import { beforeEach, describe, expect, it } from "vitest";
import { bestIndexes, compareHref, facts, isLegacyIds, parseIds, priceChange, rememberSavedPrice, savedPrices, yearBuilt } from "@/community/compareLogic";

describe("compare ids", () => {
  it("keeps order, drops duplicates and junk, caps at four", () => {
    expect(parseIds("a,b,a,,c")).toEqual(["a", "b", "c"]);
    expect(parseIds(" lake-como-1 , <script> ,x y,ok_2")).toEqual(["lake-como-1", "ok_2"]);
    expect(parseIds("a,b,c,d,e,f")).toEqual(["a", "b", "c", "d"]);
    expect(parseIds(null)).toEqual([]);
    expect(parseIds("es-casa%2D1")).toEqual(["es-casa-1"]);
  });
  it("builds a shareable link", () => {
    expect(compareHref(["a", "b-c"])).toBe("/compare?ids=a,b-c");
  });
  it("sends UUID ids to the older analysis comparison only", () => {
    expect(isLegacyIds("4f0c1c4e-7f7e-4a35-9f0b-2c1d8b7a6e55,1ce2a768-fb96-44f5-8476-e542b13f6870")).toBe(true);
    expect(isLegacyIds("lake-como-peglio-85000")).toBe(false);
    expect(isLegacyIds("")).toBe(false);
  });
});

describe("best value per row", () => {
  it("picks the lowest or highest known value", () => {
    expect(bestIndexes([300, 200, 250], "min")).toEqual([1]);
    expect(bestIndexes([60, 90, 75], "max")).toEqual([1]);
  });
  it("marks every tie for the best value", () => {
    expect(bestIndexes([2, 3, 3], "max")).toEqual([1, 2]);
  });
  it("ignores unknown values and never crowns a lone value", () => {
    expect(bestIndexes([null, 100, undefined], "min")).toEqual([]);
    expect(bestIndexes([null, 100, 80], "min")).toEqual([2]);
    expect(bestIndexes([NaN, 5, 9], "min")).toEqual([1]);
  });
  it("marks nothing when all known values are equal", () => {
    expect(bestIndexes([4, 4, null], "max")).toEqual([]);
  });
  it("counts zero as a real value", () => {
    expect(bestIndexes([0, 2], "min")).toEqual([0]);
  });
});

describe("facts for one home", () => {
  const home = {
    slug: "it-1", title: "Stone house, built in 1972", why_great: "Sold as is.", country: "Italy", price_eur: 100000, sqm: 80, bedrooms: 2,
    hoa_monthly: 50, tax_annual: 600, nota: 84, dims: { price: 70 },
    nearby: { airport: { km: 34, code: "LUG", name: "Lugano Airport" }, shop: { km: 0.6, name: "Coop" }, sea_km: 12 },
  };
  it("computes price per m², all-in, monthly and distances", () => {
    const f = facts(home, "eu");
    expect(f.perSqm).toBe(1250);
    expect(f.allInLow).toBeGreaterThan(100000);
    expect(f.monthly).toBe(100);
    expect(f.airport).toEqual({ km: 34, name: "Lugano Airport" });
    expect(f.shop?.km).toBe(0.6);
    expect(f.sea?.km).toBe(12);
    expect(f.hospital).toBeNull();
    expect(f.year).toBe(1972);
    expect(f.flags.map((x) => x.id)).toContain("as_is");
    expect(f.ruleRank).not.toBeNull();
  });
  it("leaves unknown things unknown", () => {
    const f = facts({ slug: "x", title: "Flat", country: "Atlantis" }, "other");
    expect([f.price, f.perSqm, f.allInLow, f.monthly, f.sqm, f.year, f.airport, f.rule]).toEqual([null, null, null, null, null, null, null, null]);
  });
});

describe("year built", () => {
  it("reads common phrasings and rejects nonsense", () => {
    expect(yearBuilt({ why_great: "Baujahr 1998, renoviert 2015" })).toBe(1998);
    expect(yearBuilt({ why_great: "Construido en 2005." })).toBe(2005);
    expect(yearBuilt({ why_great: "Year built: 1925" })).toBe(1925);
    expect(yearBuilt({ why_great: "3 bedrooms, 1972 m² plot" })).toBeNull();
    expect(yearBuilt({ why_great: "built in 2999" })).toBeNull();
    expect(yearBuilt({ year_built: 1960 })).toBe(1960);
  });
});

describe("price since saved", () => {
  beforeEach(() => localStorage.clear());
  it("keeps the first price unless forced", () => {
    rememberSavedPrice("a", 100000);
    rememberSavedPrice("a", 90000);
    expect(savedPrices().a.p).toBe(100000);
    rememberSavedPrice("a", 95000, true);
    expect(savedPrices().a.p).toBe(95000);
    rememberSavedPrice("b", null);
    expect(savedPrices().b).toBeUndefined();
  });
  it("survives broken storage", () => {
    localStorage.setItem("rh_saved_prices", "not json");
    expect(savedPrices()).toEqual({});
  });
  it("reports drops and rises, not equal prices", () => {
    expect(priceChange(100000, 90000)).toEqual({ diff: -10000, pct: -10 });
    expect(priceChange(80000, 84000)).toEqual({ diff: 4000, pct: 5 });
    expect(priceChange(80000, 80000)).toBeNull();
    expect(priceChange(null, 80000)).toBeNull();
  });
});
