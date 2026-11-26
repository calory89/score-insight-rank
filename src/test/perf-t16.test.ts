// Tanda 16 (26-nov-2026): HTML size report by family and JSON-LD weight (seo/tech/perfBudget.ts, ideas 767 and 776).
import { describe, it, expect } from "vitest";
import { sizeReport, jsonLdKb } from "../../seo/tech/perfBudget";

describe("speed checks of Tanda 16", () => {
  it("groups pages by family and counts the ones over the warning limit", () => {
    const big = "x".repeat(130 * 1024), small = "x".repeat(10 * 1024);
    const r = sizeReport([["/homes/spain", big], ["/es/homes/italy", small], ["/deal/a", big], ["/about", small]], { deal: 120, listing: 100, other: 100 });
    expect(r.listing).toMatchObject({ pages: 2, over: 1, limit_kb: 100 });
    expect(r.listing.biggest[0].path).toBe("/homes/spain");
    expect(r.deal).toMatchObject({ pages: 1, over: 1 });
    expect(r.other).toMatchObject({ pages: 1, over: 0 });
  });
  it("measures the JSON-LD of a page", () => {
    const ld = JSON.stringify({ a: "y".repeat(2048) });
    expect(jsonLdKb(`<head><script type="application/ld+json">${ld}</script></head>`)).toBeCloseTo(2, 0);
    expect(jsonLdKb("<head></head>")).toBe(0);
  });
});
