import { describe, it, expect } from "vitest";
import { locationParts, regionOf } from "@/community/regions";

describe("locationParts (22 Nov 2026: a bracket that holds a comma)", () => {
  it("reads a bracket with a comma as more parts of the place", () => {
    expect(locationParts("Rocchetta di Fazio, Semproniano (Grosseto, Tuscany)")).toEqual(["Rocchetta di Fazio", "Semproniano", "Grosseto", "Tuscany"]);
    expect(regionOf({ location_name: "Pairola, San Bartolomeo al Mare (Imperia, Liguria)", country: "Italy" })).toBe("Liguria");
  });
  it("leaves brackets without a comma as they are", () => {
    expect(locationParts("Ingelstads Nöbbele, Växjö (Kronoberg)")).toEqual(["Ingelstads Nöbbele", "Växjö (Kronoberg)"]);
    expect(regionOf({ location_name: "Árchez, Málaga, Spain", country: "Spain" })).toBe("Málaga");
    expect(locationParts("")).toEqual([]);
  });
});
