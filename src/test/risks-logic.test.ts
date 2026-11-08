import { describe, expect, it } from "vitest";
import { cardRiskChips, dist, femaLevel, floodSummary, isHighRisk, noiseFacts, noiseLevel, risksOf } from "@/community/risksLogic";

describe("noiseLevel", () => {
  it("is high next to a motorway, railway or runway", () => {
    expect(noiseLevel({ motorway_m: 120, rail_m: null, airport_km: 30, roads_checked: true })).toBe("high");
    expect(noiseLevel({ motorway_m: null, rail_m: 149, airport_km: 30, roads_checked: true })).toBe("high");
    expect(noiseLevel({ airport_km: 1.8, roads_checked: false })).toBe("high");
  });
  it("is medium within 400 m or 5 km", () => {
    expect(noiseLevel({ motorway_m: 150, rail_m: null, airport_km: 30, roads_checked: true })).toBe("medium");
    expect(noiseLevel({ motorway_m: null, rail_m: 399, airport_km: 9, roads_checked: true })).toBe("medium");
    expect(noiseLevel({ airport_km: 4.9, roads_checked: false })).toBe("medium");
  });
  it("is low only when roads were checked, otherwise unknown", () => {
    expect(noiseLevel({ motorway_m: 400, rail_m: 1500, airport_km: 5, roads_checked: true })).toBe("low");
    expect(noiseLevel({ motorway_m: null, rail_m: null, airport_km: 20, roads_checked: false })).toBeNull();
    expect(noiseLevel(null)).toBeNull();
  });
});

describe("femaLevel", () => {
  it("maps FEMA zones", () => {
    expect(femaLevel("AE")).toBe("high");
    expect(femaLevel("VE")).toBe("high");
    expect(femaLevel("A")).toBe("high");
    expect(femaLevel("X (0.2 pct annual chance flood hazard)")).toBe("medium");
    expect(femaLevel("X (area with reduced flood risk due to levee)")).toBe("medium");
    expect(femaLevel("X (area of minimal flood hazard)")).toBe("low");
    expect(femaLevel("D")).toBeNull();
    expect(femaLevel("")).toBeNull();
  });
});

describe("rows", () => {
  const high = { risks: { noise: { airport_km: 0.3, roads_checked: false }, flood: { level: "low", source: "rough" } } } as any;
  const flood = { risks: JSON.stringify({ noise: { roads_checked: true, motorway_m: null, rail_m: null, airport_km: 40 }, flood: { level: "high", source: "FEMA NFHL", zone: "AE" } }) };
  it("parses risks from JSON text and ignores junk", () => {
    expect(risksOf(flood)?.flood?.zone).toBe("AE");
    expect(risksOf({ risks: "{bad" })).toBeNull();
    expect(risksOf({})).toBeNull();
  });
  it("flags only high risks", () => {
    expect(isHighRisk(high)).toBe(true);
    expect(isHighRisk(flood)).toBe(true);
    expect(isHighRisk({ risks: { noise: { motorway_m: 300, roads_checked: true }, flood: { level: "medium" } } } as any)).toBe(false);
    expect(cardRiskChips(high).map((c) => c.id)).toEqual(["noise"]);
    expect(cardRiskChips(flood).map((c) => c.id)).toEqual(["flood"]);
    expect(cardRiskChips(null)).toEqual([]);
  });
});

describe("formatting", () => {
  it("formats distances", () => {
    expect(dist(84)).toBe("80 m");
    expect(dist(3)).toBe("10 m");
    expect(dist(1200)).toBe("1.2 km");
    expect(dist(2000)).toBe("2 km");
    expect(dist(12400)).toBe("12 km");
    expect(dist(null)).toBe("");
  });
  it("lists noise facts nearest first, and only the airport when roads were not checked", () => {
    expect(noiseFacts({ motorway_m: 900, rail_m: 140, airport_km: 12, roads_checked: true }).map((x) => x.k)).toEqual(["rail", "motorway", "airport"]);
    expect(noiseFacts({ motorway_m: null, rail_m: null, airport_km: 3, roads_checked: true }).map((x) => x.value)).toEqual(["3 km", "over 2 km", "over 2 km"]);
    expect(noiseFacts({ airport_km: 30, roads_checked: false }).map((x) => x.k)).toEqual(["airport"]);
  });
  it("summarises flood", () => {
    expect(floodSummary({ level: "high", source: "FEMA NFHL" })).toBe("High-risk flood zone");
    expect(floodSummary({ level: "medium", source: "rough" })).toBe("Low-lying, near water: check the official flood map");
    expect(floodSummary({ level: "low", source: "rough" })).toBe("Not low-lying near the sea or a big river");
  });
});
