import { describe, expect, it } from "vitest";
import { homeArticle } from "@/community/homeArticle";
import { homeArticleEs } from "@/community/homeArticleEs";

const home = (slug: string, price: number, sqm: number) => ({ slug, price_eur: price, sqm, country: "Greece", location_name: "Glossa, Skopelos" });
const others = [home("a", 50000, 100), home("b", 80000, 60), home("c", 120000, 80), home("d", 90000, 90), home("e", 70000, 50)];
// English words that must never appear in the Spanish article (place and portal names aside)
const EN = /\b(the|and|this|home|homes|price|about|with|from|nearest|buying|costs|seller)\b/i;

describe("homeArticleEs (the home page article in Spanish)", () => {
  it("has the same sections and questions as the English one, all in Spanish", () => {
    const r = { ...home("x", 100000, 100), bedrooms: 2, nearby: { airport: { km: 20, name: "Skiathos" }, sea: { km: 0.4 } }, source_domain: "green-acres.gr" };
    const ctx = { countryHomes: [r, ...others], dest: { purchase_costs_pct: "5.5-7", can_foreigners_buy: "Sí.", purchase_costs_breakdown: "Impuesto 3%.", annual_property_tax: "ENFIA." } };
    const es = homeArticleEs(r, ctx), en = homeArticle(r, ctx);
    expect(es.sections.length).toBe(en.sections.length);
    expect(es.faq.length).toBe(en.faq.length);
    const text = JSON.stringify(es).replace(/green-acres\.gr|Skiathos|Skopelos|Glossa|RealHunt/g, "");
    expect(text).not.toMatch(EN);
    expect(es.sections.map((s) => s.h)).toContain("¿Es 100.000 € un buen precio para esta casa?");
    expect(text).toContain("5.500 € a 7.000 €");
    expect(text).toContain("5,5-7%");
    expect(text).toContain("en Grecia");
    expect(text).toContain("El mar está a menos de un kilómetro");
    expect(text).not.toContain("—");
  });
  it("handles a monthly fee in dollars and countries with an article", () => {
    const r = { slug: "y", price_eur: 250000, country: "United States", location_name: "Doral, Miami-Dade, Florida", hoa_monthly: 1200, hoa_currency: "USD", tax_annual: 4800 };
    const a = homeArticleEs(r, { countryHomes: [r] });
    const t = JSON.stringify(a);
    expect(t).toContain("1.200 $ al mes");
    expect(t).toContain("Estados Unidos");
    expect(t).not.toMatch(EN);
  });
});
