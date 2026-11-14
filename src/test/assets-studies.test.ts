// The numbers of the studies added on 15-nov-2026 (seo/assetsStats.ts, second half).
import { describe, it, expect } from "vitest";
import { MIN_STUDY, airportByCountry, airportStats, cheapRegions, cheapStats, floodStats, mergeSeries, newBuildStats, projectPpsqm, salaryStats, seriesPoint, type Home } from "../../seo/assetsStats";
import { isToolPath } from "../tools/paths";

const h = (country: string, price: number, extra: Record<string, unknown> = {}): Home => ({ slug: `${country}-${price}-${Math.random()}`, country, price_eur: price, location_name: `Town, Region A, ${country}`, ...extra } as Home);
const many = (country: string, prices: number[], extra: Record<string, unknown> = {}) => prices.map((p) => h(country, p, extra));

describe("cheapStats and cheapRegions", () => {
  const rows = [...many("Italy", [10000, 20000, 45000, 50000, 50001, 90000]), ...many("Spain", [40000, 45000, 200000]), ...many("France", [30000, 60000, 70000])];
  it("counts homes at or under the cap and leaves out countries with fewer than 3", () => {
    const cs = cheapStats(rows);
    expect(cs.map((c) => c.k)).toEqual(["italy"]);
    expect(cs[0]).toMatchObject({ under: 4, n: 6, share: 67, under30: 2, cheapest: 10000 });
  });
  it("regions need 3 homes at or under the cap", () => {
    expect(cheapRegions(rows).map((r) => [r.k, r.n])).toEqual([["italy/region-a", 4]]);
  });
});

describe("floodStats", () => {
  const f = (level: string, source = "rough") => ({ risks: { flood: { level, source } } });
  const rows = [...many("United States", [1, 2, 3, 4, 5, 6], f("low", "FEMA NFHL")), ...many("United States", [7, 8], f("high", "FEMA NFHL")), ...many("Spain", [1, 2, 3, 4], f("low")), h("Spain", 5, f("medium")), ...many("Italy", [1, 2, 3, 4], f("low")), ...many("Italy", [5, 6, 7])];
  it("shares by country, only with enough homes that have the indicator", () => {
    const st = floodStats(rows as any);
    expect(st.map((x) => x.k)).toEqual(["united-states", "spain"]);
    expect(st[0]).toMatchObject({ n: 8, low: 6, high: 2, share: 25, official: 8 });
    expect(st[1]).toMatchObject({ n: 5, medium: 1, share: 20, official: 0 });
    expect(st.every((x) => x.n >= MIN_STUDY)).toBe(true);
  });
});

describe("airport distance", () => {
  const rows = [...many("Spain", [100000, 120000, 140000, 160000, 180000], { airport_km: 10, sqm: 100 }), ...many("Spain", [50000, 60000, 70000], { airport_km: 30, sqm: 100 }), h("Spain", 99, {})];
  it("bands include their lower bound and hide €/m² on tiny samples", () => {
    const bs = airportStats(rows as any);
    expect(bs.map((b) => b.n)).toEqual([5, 3, 0, 0]);
    expect(bs[0]).toMatchObject({ medPrice: 140000, medPpsqm: 1400 });
    expect(bs[1].medPpsqm).toBe(0);
  });
  it("median distance by country", () => {
    expect(airportByCountry(rows as any)).toEqual([{ k: "spain", name: "Spain", n: 8, medKm: 10, within60: 100 }]);
  });
});

describe("salaryStats", () => {
  it("divides the median price by net earnings and skips countries without data or homes", () => {
    const rows = [...many("Spain", [50000, 60000, 70000, 80000, 90000]), ...many("Japan", [1, 2, 3, 4, 5]), ...many("Italy", [10000, 20000])];
    const st = salaryStats(rows, { _meta: { year: 2025 }, spain: 28000, italy: 27000 });
    expect(st).toEqual([{ k: "spain", name: "Spain", n: 5, medPrice: 70000, earnings: 28000, years: 2.5, small: true }]);
  });
});

describe("new builds", () => {
  it("reads the price per m² from the project text", () => {
    expect(projectPpsqm({ slug: "a", blurb: "From €38,664, about €1,111 per m². Units from 33 m²." })).toBe(1111);
    expect(projectPpsqm({ slug: "a", blurb: "Completion date not published." })).toBe(0);
  });
  it("medians per destination, cheapest €/m² first", () => {
    const mk = (pp: number[], price = 100000) => pp.map((x, i) => ({ slug: `p${i}`, price_eur: price + i, blurb: x ? `about €${x.toLocaleString("en")} per m².` : "" }));
    const st = newBuildStats({ a: mk([3000, 3100, 3200, 3300, 3400]), b: mk([1000, 1100, 1200, 1300, 1400, 0]), c: mk([1, 2]) });
    expect(st.map((x) => [x.k, x.n, x.nPp, x.medPpsqm])).toEqual([["b", 6, 5, 1200], ["a", 5, 5, 3200]]);
  });
});

describe("monthly series", () => {
  const rows = [...many("Spain", Array.from({ length: 10 }, (_x, i) => 50000 + i * 1000), { sqm: 100 }), ...many("Italy", [1000, 2000, 3000])];
  it("one point per month; the current month replaces itself and later months are ignored", () => {
    const p = seriesPoint(rows, "2026-12-03");
    expect(p).toMatchObject({ month: "2026-12", homes: 13, countries: 2 });
    expect(Object.keys(p.by_country)).toEqual(["spain"]);
    const old = { month: "2026-11", date: "2026-11-14", homes: 591, countries: 18, median_price_eur: 85000, median_eur_per_sqm: 1133, by_country: {} };
    const s = mergeSeries(p, [old], [old, { month: "2026-12", homes: 1, median_price_eur: 1 }, { month: "2027-01", homes: 5, median_price_eur: 5 }, { month: "bad" }, null], "not a list");
    expect(s.map((x) => x.month)).toEqual(["2026-11", "2026-12"]);
    expect(s[1]).toBe(p);
  });
});

describe("tool paths", () => {
  it("only the calculator addresses", () => {
    expect(["/tools", "/tools/portugal-imt", "/buying-costs", "/buying-costs/spain"].every(isToolPath)).toBe(true);
    expect(["/toolsx", "/costs/spain", "/", "/embed"].some(isToolPath)).toBe(false);
  });
});
