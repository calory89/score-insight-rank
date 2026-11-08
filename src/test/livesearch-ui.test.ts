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
    expect(stageParts({ k: "checking", n: 3, of: 8 })).toEqual({ text: "Reading listing", n: 3, of: 8 });
    expect(stageParts(null).text).toBe("Starting");
    expect(isFinal("done")).toBe(true); expect(isFinal("running")).toBe(false); expect(isFinal("need_login")).toBe(true);
  });
  it("adds new results at the end without moving the ones on screen", () => {
    const r = (id: string, score = 85) => ({ id, score } as LiveResult);
    expect(mergeResults([r("a"), r("b")], [r("c", 99), r("a", 90), r("b")]).map((x) => x.id)).toEqual(["a", "b", "c"]);
    expect(mergeResults([r("a")], [r("a", 90)])[0].score).toBe(90);
  });
});

describe("live search v2 helpers", () => {
  it("sends home searches with a place to the live search, features and countries to the feed", async () => {
    const { wantsLive } = await import("../community/livelogic");
    expect(wantsLive("3 bedroom house in Tampa under $350k")).toBe(true);
    expect(wantsLive("casa con jardín en Málaga por menos de 300.000 €")).toBe(true);
    expect(wantsLive("2 bedroom apartment to rent in Lisbon")).toBe(true);
    expect(wantsLive("3 bedroom house near the sea under 200k in Spain")).toBe(false);
    expect(wantsLive("2 bed apartment in Spain")).toBe(false);
    expect(wantsLive("Miami")).toBe(false);
    expect(wantsLive("pizza in Rome")).toBe(false);
  });
  it("shows only results that passed the AI check", async () => {
    const { passes } = await import("../community/livelogic");
    const r: any = { id: "x", source: "web", score: 85, show: true };
    expect(passes(r)).toBe(true);
    expect(passes({ ...r, show: false })).toBe(false);
    expect(passes({ ...r, show: undefined })).toBe(false); // v1 results were never checked
    expect(passes({ ...r, source: "realhunt", show: undefined })).toBe(true);
    expect(passes({ ...r, score: 79 })).toBe(false);
  });
  it("turns a result into the home page card's row", async () => {
    const { resultToDeal } = await import("../community/livelogic");
    const d = resultToDeal({ id: "web-1", source: "web", provider: "coldwellbanker", url: "https://x", deal_slug: "us-tampa-1-300k", deal_id: "uuid", title: "Corner house", price: 300000, currency: "USD", price_eur: 268800,
      beds: 3, sqm: 140, location: "Seminole Heights, Tampa, Florida", country: "United States", kind: "buy", image: "a.jpg", image_urls: ["a.jpg", "b.jpg"], photos: 20, score: 86, found_at: "", show: true,
      ai_checked_at: "2026-11-08T10:00:00Z", why_cheap: null, flags: ["age_restricted"] });
    expect(d).toMatchObject({ id: "uuid", slug: "us-tampa-1-300k", bedrooms: 3, location_name: "Seminole Heights, Tampa, Florida", image_urls: ["a.jpg", "b.jpg"], ai_checked: true, ai_flags: ["age_restricted"], nota: 86 });
  });
  it("remembers jobs for a day so a visitor can come back", async () => {
    const { rememberJob, recallJob } = await import("../community/livelogic");
    const id = "9f4f9e5f-7c81-478b-93a8-cea2345d702e";
    const now = 1_800_000_000_000;
    const store = rememberJob({ old: { id, at: now - 25 * 3600_000 } }, "3 Bedroom House in Tampa", id, now);
    expect(Object.keys(store)).toEqual(["3 bedroom house in tampa"]);
    expect(recallJob(store, "3 bedroom  house in TAMPA", now + 1000)).toBe(id);
    expect(recallJob(store, "3 bedroom house in Tampa", now + 25 * 3600_000)).toBeNull();
    expect(recallJob(null, "x")).toBeNull();
  });
});
