import { describe, it, expect } from "vitest";
import { readExtra, extraMatch, feeEur, seaKm, ptypeOf, extraFromUrl, extraToUrl, extraSort } from "@/community/findFilters";
import { activeChips, clearedFilters } from "@/community/filterChips";

const sea = { nearby: { sea_km: 3 }, airport_km: 40, risks: { noise: { level: "low" }, flood: { coast_km: 9 } }, property_type: "cabin", hoa_unknown: false };
const flat = { airport_km: 120, risks: { noise: { level: "high" } }, property_type: "apartment", hoa_monthly: 150, hoa_currency: "USD" };
const unknown = { hoa_unknown: true };

describe("batch 12 filters", () => {
  it("reads fee, distances and type", () => {
    expect(feeEur(sea)).toBe(0); expect(feeEur(flat)).toBeCloseTo(134.4); expect(feeEur(unknown)).toBeNull();
    expect(seaKm(sea)).toBe(3); expect(seaKm({ risks: { flood: { coast_km: 9 } } })).toBe(9); expect(seaKm(flat)).toBeNull();
    expect(ptypeOf(sea)).toBe("cottage"); expect(ptypeOf(flat)).toBe("flat");
  });
  it("filters out homes whose value is unknown", () => {
    expect(extraMatch(sea, readExtra({ fee: 0, sea: 5, air: 60, quiet: true, ptype: "cottage" }))).toBe(true);
    expect(extraMatch(flat, readExtra({ fee: 100 }))).toBe(false);
    expect(extraMatch(flat, readExtra({ fee: 200 }))).toBe(true);
    expect(extraMatch(unknown, readExtra({ fee: 300 }))).toBe(false);
    expect(extraMatch(flat, readExtra({ sea: 25 }))).toBe(false);
    expect(extraMatch(flat, readExtra({ quiet: "1" }))).toBe(false);
    expect(extraMatch(flat, readExtra({}))).toBe(true);
  });
  it("round-trips through the address bar and ignores bad values", () => {
    const x = readExtra({ fee: 0, sea: 10, air: "", quiet: true, ptype: "villa" });
    const sp = new URLSearchParams(Object.entries(extraToUrl(x)).filter(([, v]) => v));
    expect(extraFromUrl(sp)).toEqual(x);
    expect(readExtra({ sea: -3, ptype: "castle", fee: "abc" })).toEqual({ fee: null, sea: null, air: null, quiet: false, ptype: "" });
  });
  it("sorts by price drop and sea distance", () => {
    expect(extraSort("drop", { price_drop: 0 }, { price_drop: 2000 })!).toBeGreaterThan(0);
    expect(extraSort("sea", sea, flat)!).toBeLessThan(0);
    expect(extraSort("score", sea, flat)).toBeNull();
  });
  it("shows removable chips and clears them", () => {
    const v: any = { scope: "all", fee: 0, sea: 5, quiet: true, ptype: "flat" };
    const chips = activeChips(v);
    expect(chips.map((c) => c.key)).toEqual(expect.arrayContaining(["fee", "sea", "quiet", "ptype"]));
    expect(chips.find((c) => c.key === "sea")!.label).toBe("Up to 5 km from the sea");
    expect((chips.find((c) => c.key === "quiet")!.next as any).quiet).toBe(false);
    const c: any = clearedFilters(v); expect([c.fee, c.sea, c.quiet, c.ptype]).toEqual([null, null, false, ""]);
  });
});
