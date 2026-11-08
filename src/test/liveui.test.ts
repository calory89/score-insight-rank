import { describe, expect, it } from "vitest";
import { shortStage, doneLine, centreKm, outsideCentre } from "@/community/liveui";

describe("shortStage", () => {
  it("gives one short status per stage", () => {
    expect(shortStage({ k: "reviewing", n: 12, of: 20 })).toBe("Checking listing 12 of 20");
    expect(shortStage({ k: "reading", n: 3, of: 8 })).toBe("Reading listing 3 of 8");
    expect(shortStage({ k: "reviewing" })).toBe("Checking listing");
    expect(shortStage({ k: "found", n: 14 })).toBe("Found 14 listings");
    expect(shortStage({ k: "searching_cb" })).toBe("Searching agents and portals");
    expect(shortStage(null)).toBe("Starting");
  });
});

describe("doneLine", () => {
  it("counts what passed and what was left out", () => {
    expect(doneLine(3, 11)).toBe("3 homes passed the AI check · 11 left out");
    expect(doneLine(1, 0)).toBe("1 home passed the AI check");
  });
});

describe("centre distance and the outside-the-centre list", () => {
  it("reads distance_to_centre_km only when present", () => {
    expect(centreKm({ distance_to_centre_km: 1.2 })).toBe(1.2);
    expect(centreKm({ distance_to_centre_km: 0 })).toBe(0);
    expect(centreKm({})).toBeNull();
    expect(centreKm({ distance_to_centre_km: null })).toBeNull();
  });
  it("drops homes already shown above", () => {
    const shown = [{ id: "a", deal_slug: "x" }] as any;
    const st = { status: "done", outside_centre: [{ id: "a" }, { id: "b", deal_slug: "x" }, { id: "c" }] } as any;
    expect(outsideCentre(st, shown).map((r) => r.id)).toEqual(["c"]);
    expect(outsideCentre({ status: "done" } as any, shown)).toEqual([]);
  });
});
