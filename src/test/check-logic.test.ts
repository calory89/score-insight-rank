import { describe, expect, it } from "vitest";
import { agentEmail, allIn, allInLine, buyRule, countryKey, detectGroup, emailLang, pctRange, questions, redFlags, toEur } from "@/community/checkLogic";
import RULES from "@/data/buyrules.json";

const ids = (s: string, extra: Record<string, unknown> = {}) => redFlags({ title: "Home", why_great: s, ...extra }).map((f) => f.id);

describe("red flag detector", () => {
  it("finds the basic risk phrases in English", () => {
    expect(ids("Sold as is, cash only.")).toEqual(expect.arrayContaining(["as_is", "cash_only"]));
    expect(ids("Tenant occupied until 2027.")).toContain("tenant");
    expect(ids("A special assessment of $12,000 was approved.")).toContain("assessment");
    expect(ids("Short sale, subject to bank approval.")).toContain("short_sale");
    expect(ids("Bank-owned home sold at auction.")).toContain("auction");
    expect(ids("In a 55+ community with pool.")).toContain("senior");
    expect(ids("Stone house that needs renovation.")).toContain("renovation");
    expect(ids("Some photos are virtual staging.")).toContain("staging");
    expect(ids("The lot is in flood zone AE.")).toContain("flood");
  });
  it("finds Spanish, Italian, French, German and Portuguese basics", () => {
    expect(ids("Casa a reformar en suelo rústico, con derrama aprobada.")).toEqual(expect.arrayContaining(["renovation", "rustic", "assessment"]));
    expect(ids("Vivienda en subasta, actualmente alquilada.")).toEqual(expect.arrayContaining(["auction", "tenant"]));
    expect(ids("Casale da ristrutturare, vendita all'asta.")).toEqual(expect.arrayContaining(["renovation", "auction"]));
    expect(ids("Maison à rénover, vendue louée.")).toEqual(expect.arrayContaining(["renovation", "tenant"]));
    expect(ids("Renovierungsbedürftiges Haus, vermietet, Zwangsversteigerung.")).toEqual(expect.arrayContaining(["renovation", "tenant", "auction"]));
    expect(ids("Moradia para recuperar, venda em leilão.")).toEqual(expect.arrayContaining(["renovation", "auction"]));
  });
  it("ignores negated, hedged and harmless mentions", () => {
    expect(ids("Ready to move in: listed as renovated, and not marked as occupied, rented or at auction.")).toEqual([]);
    expect(ids("Ask whether a special assessment is planned.")).toEqual([]);
    expect(ids("Owner-occupied and well kept, in flood zone X.")).toEqual([]);
    expect(ids("Full of rustic charm, fully renovated in 2020, no renovation needed.")).toEqual([]);
    expect(ids("Last rented at €400 a month. Works as a home or a holiday let.")).toEqual([]);
  });
  it("adds the unstated community fee and sorts by severity", () => {
    const f = redFlags({ title: "Condo", why_great: "Needs updating. Sold at auction.", hoa_unknown: true });
    expect(f.map((x) => x.id)).toEqual(["auction", "renovation", "hoa_unknown"]);
    expect(f.every((x) => x.ask.endsWith("?"))).toBe(true);
  });
});

describe("all-in price", () => {
  it("parses ranges", () => {
    expect(pctRange("7.5-14")).toEqual([7.5, 14]);
    expect(pctRange("3")).toEqual([3, 3]);
    expect(pctRange(undefined)).toBeNull();
    expect(countryKey("United States")).toBe("united-states");
  });
  it("converts USD at 0.896 and leaves EUR alone", () => {
    expect(toEur(1000, "USD")).toBeCloseTo(896);
    expect(toEur(1000, null)).toBe(1000);
    expect(toEur(1000, "GBP")).toBeNull();
  });
  it("uses the low end of the country's buying costs and the monthly running costs", () => {
    const a = allIn({ price_eur: 100000, country: "Spain" });
    expect(a.costsLow).toBe(7500);
    expect(a.costsHigh).toBe(14000);
    expect(a.totalLow).toBe(107500);
    expect(a.monthly).toBeNull();
    expect(allInLine({ price_eur: 100000, country: "Spain" })).toEqual(["≈\u00a0€108,000 to buy"]);
    const us = allIn({ price_eur: 500000, country: "United States", hoa_monthly: 124, hoa_currency: "USD", tax_annual: 9000 });
    expect(us.totalLow).toBe(510000);
    expect(Math.round(us.monthly!)).toBe(Math.round(124 * 0.896 + 750 * 0.896));
  });
  it("omits what it cannot compute", () => {
    expect(allInLine({ price_eur: 100000, country: "Atlantis" })).toEqual([]);
    expect(allInLine({ price_eur: null, country: "Spain", hoa_monthly: 50 })).toEqual(["≈\u00a0€50/mo"]);
  });
});

describe("can I buy here", () => {
  it("detects a default group", () => {
    expect(detectGroup("de-DE", "Europe/Berlin")).toBe("eu");
    expect(detectGroup("en-GB", "Europe/London")).toBe("uk");
    expect(detectGroup("en-US", "America/New_York")).toBe("na");
    expect(detectGroup("en-CA", "America/Toronto")).toBe("na");
    expect(detectGroup("es-MX", "America/Mexico_City")).toBe("other");
    expect(detectGroup("fr-FR", "")).toBe("eu");
    expect(detectGroup("", "")).toBe("other");
  });
  it("has a complete rule for every group in every country", () => {
    for (const [k, r] of Object.entries(RULES as Record<string, any>)) {
      if (k === "_meta") continue;
      for (const g of ["eu", "uk", "na", "other"]) {
        expect(["green", "amber", "red"]).toContain(r[g].s);
        expect(r[g].note.length).toBeGreaterThan(10);
        expect(r[g].note).not.toMatch(/—/);
        if (r[g].s !== "green") expect(r[g].badge).toBeTruthy();
      }
      expect(r.updated).toBe("2026-11");
    }
  });
  it("knows the well-known restrictions", () => {
    expect(buyRule("Spain", "eu")?.s).toBe("green");
    expect(buyRule("Denmark", "uk")?.s).toBe("red");
    expect(buyRule("Switzerland", "na")?.s).toBe("amber");
    expect(buyRule("Indonesia", "eu")?.s).toBe("red");
    expect(buyRule("Canada", "uk")?.note).toMatch(/check current status/i);
    expect(buyRule("Scandinavia", "eu")).toBeNull();
  });
});

describe("questions and email", () => {
  const condo = { title: "2-bed condo in Boca Raton", location_name: "Boca Raton, Florida", country: "United States", price_eur: 450000, hoa_monthly: 124, hoa_currency: "USD", tax_annual: 9000, category: "city", why_great: "55+ community." };
  it("builds questions from the home", () => {
    const q = questions(condo);
    expect(q).toEqual(expect.arrayContaining(["available", "hoa_known", "assessments", "tax_reset", "year_built", "senior", "docs_us"]));
    expect(questions({ ...condo, title: "Lakefront house" })).not.toContain("year_built");
    expect(new Set(q).size).toBe(q.length);
    const rural = questions({ title: "Stone farmhouse", country: "Italy", category: "village" });
    expect(rural).toContain("legal");
    expect(rural).not.toContain("hoa");
  });
  it("writes the email in the listing's language", () => {
    expect(emailLang({ country: "Spain" })).toBe("es");
    expect(emailLang({ country: "Denmark" })).toBe("da");
    expect(emailLang({ country: "Japan" })).toBe("en");
    expect(emailLang({ country: "Switzerland", location_name: "Lignières, Neuchâtel" })).toBe("fr");
    const en = agentEmail(condo);
    expect(en.lang).toBe("en");
    expect(en.body).toMatch(/^Hello,/);
    expect(en.body).toContain("$124");
    const es = agentEmail({ title: "Piso con terraza", country: "Spain", price_eur: 90000, hoa_unknown: true });
    expect(es.body).toMatch(/^Hola:/);
    expect(es.body).toContain("cuota mensual de comunidad");
    expect(es.body).not.toMatch(/—/);
  });
});
