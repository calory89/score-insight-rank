import { describe, expect, it } from "vitest";
import { similarHomes, liveChips, liveQueryFromParams, stageParts, isFinal, mergeResults, parseLiveQuery, type LiveResult } from "@/community/livelogic";

const rows = [
  { slug: "a", title: "House", country: "United States", location_name: "Kendall, Miami, Florida", price_eur: 250000, bedrooms: 3, nota: 84 },
  { slug: "b", title: "Condo", country: "United States", location_name: "Miami Beach, Florida", price_eur: 320000, bedrooms: 2, nota: 91 },
  { slug: "c", title: "Villa", country: "United States", location_name: "Orlando, Florida", price_eur: 200000, bedrooms: 3, nota: 79 },
  { slug: "d", title: "Piso", country: "Spain", location_name: "Valencia", price_eur: 150000, bedrooms: 2, nota: 88 },
];

describe("similarHomes", () => {
  it("puts the same place first, then the same country", () => {
    const p = parseLiveQuery("3 bedroom homes in Miami under €300k");
    expect(similarHomes(rows, p).map((r) => r.slug)).toEqual(["a", "b", "c"]);
  });
  it("can keep only homes scoring 80+", () => {
    const p = parseLiveQuery("3 bedroom homes in Miami under €300k");
    expect(similarHomes(rows, p, 6, 80).map((r) => r.slug)).toEqual(["a", "b"]);
  });
  it("falls back to the price band, then to the best homes", () => {
    expect(similarHomes(rows, parseLiveQuery("homes in Tokyo under €160k")).map((r) => r.slug)).toEqual(["d", "c"]);
    expect(similarHomes(rows, parseLiveQuery("homes in Tokyo"))[0].slug).toBe("b");
  });
});

describe("liveChips", () => {
  it("lists what was understood", () => {
    const c = liveChips(parseLiveQuery("3 bedroom house in Miami under $300k"));
    expect(c.map((x) => x.k)).toEqual(["kind", "where", "type", "beds", "max", "score"]);
    expect(c.find((x) => x.k === "where")!.value).toBe("Miami, FL");
    expect(c.find((x) => x.k === "max")!.value).toBe("US$300,000");
    expect(liveChips(parseLiveQuery("flat to rent in Lisbon, Portugal"))[0].label).toBe("To rent");
  });
});

describe("liveQueryFromParams", () => {
  it("turns feed filters into a sentence the live search understands", () => {
    const s = liveQueryFromParams(new URLSearchParams("q=Miami&country=United%20States&beds=3&price=268800"));
    expect(s).toBe("3 bedroom homes in Miami, United States under €268,800");
    const p = parseLiveQuery(s);
    expect(p).toMatchObject({ ok: true, city: "miami", min_beds: 3, max_eur: 268800 });
    expect(liveQueryFromParams(new URLSearchParams("price=100000"))).toBe("");
  });
});

describe("progress helpers", () => {
  it("names each stage", () => {
    expect(stageParts({ k: "checking", n: 3, of: 8 })).toEqual({ text: "Checking listing", n: 3, of: 8 });
    expect(stageParts(null).text).toBe("Starting");
    expect(isFinal("done")).toBe(true); expect(isFinal("running")).toBe(false); expect(isFinal("need_login")).toBe(true);
  });
  it("adds new results at the end without moving the ones on screen", () => {
    const r = (id: string, score = 85) => ({ id, score } as LiveResult);
    expect(mergeResults([r("a"), r("b")], [r("c", 99), r("a", 90), r("b")]).map((x) => x.id)).toEqual(["a", "b", "c"]);
    expect(mergeResults([r("a")], [r("a", 90)])[0].score).toBe(90);
  });
});
