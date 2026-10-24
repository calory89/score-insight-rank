import { describe, expect, it } from "vitest";
import { homeArticle } from "@/community/homeArticle";

const home = (slug: string, price: number, sqm: number) => ({ slug, price_eur: price, sqm, country: "Greece", location_name: "Glossa, Skopelos" });
const others = [home("a", 50000, 100), home("b", 80000, 60), home("c", 120000, 80), home("d", 90000, 90), home("e", 70000, 50)];

describe("homeArticle", () => {
  it("compares the price with the country, computes buying costs and writes questions", () => {
    const r = { ...home("x", 100000, 100), nearby: { airport: { km: 20, name: "Skiathos" } }, source_domain: "green-acres.gr" };
    const a = homeArticle(r, { countryHomes: [r, ...others], dest: { purchase_costs_pct: "5.5-7", can_foreigners_buy: "Yes." } });
    const text = JSON.stringify(a);
    expect(a.sections.map((s) => s.h)).toContain("Is €100,000 a good price for this home?");
    expect(text).toContain("€5,500 to €7,000");
    expect(text).toContain("nearest airport is about 20 km away (Skiathos)");
    expect(a.faq.map(([q]) => q)).toContain("Can foreigners buy a home in Greece?");
    expect(text).not.toContain("—");
  });
  it("still writes a location section and questions with little data", () => {
    const r = { slug: "y", price_eur: 40000, country: "Netherlands" };
    const a = homeArticle(r, { countryHomes: [r] });
    expect(a.sections[0].p[0]).toContain("Netherlands");
    expect(a.faq[0][1]).toContain("€40,000");
  });
});
