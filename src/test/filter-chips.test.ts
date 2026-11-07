import { describe, expect, it } from "vitest";
import { activeChips, clearedFilters } from "@/community/filterChips";

describe("active filter chips", () => {
  it("is empty with no filters", () => {
    expect(activeChips({ scope: "all", country: "", sort: "score" })).toEqual([]);
  });
  it("gives one chip per country and removes only that one", () => {
    const chips = activeChips({ country: "Italy,Spain" });
    expect(chips.map((c) => c.label)).toEqual(["Italy", "Spain"]);
    expect(chips[0].next.country).toBe("Spain");
  });
  it("labels a price range and clears both ends at once", () => {
    const [c] = activeChips({ min_price: 50000, max_price: 100000 });
    expect(c.label).toContain("to");
    expect(c.next.min_price).toBeNull();
    expect(c.next.max_price).toBeNull();
    expect(activeChips({ max_price: 80000 })[0].label).toMatch(/^up to/);
  });
  it("covers beds, size, type, price drop, quick filters and sort", () => {
    const v = { min_beds: 2, min_sqm: 80, category: "beach", price_drop: true, min_score: 85, need: ["garden"], dim_min: { water: 70 }, sort: "price_asc" };
    const chips = activeChips(v);
    expect(chips.map((c) => c.key)).toEqual(["category", "beds", "sqm", "drop", "q:s85", "q:water", "q:garden", "sort"]);
    expect(chips.find((c) => c.key === "q:garden")!.next.need).toEqual([]);
    expect(chips.find((c) => c.key === "q:water")!.next.dim_min).toEqual({});
    expect(chips.find((c) => c.key === "sort")!.next.sort).toBe("score");
  });
  it("does not show the airport sort twice when 'Near an airport' is on", () => {
    const chips = activeChips({ dim_min: { access: 70 }, sort: "airport" });
    expect(chips.map((c) => c.key)).toEqual(["q:air"]);
    expect(chips[0].next.sort).toBe("score");
  });
  it("clears everything but keeps scope and search text", () => {
    const c = clearedFilters({ scope: "all", q: "lake", country: "Italy", max_price: 1, need: ["pool"] });
    expect(c.scope).toBe("all");
    expect(c.q).toBe("lake");
    expect(activeChips(c)).toEqual([]);
  });
});
