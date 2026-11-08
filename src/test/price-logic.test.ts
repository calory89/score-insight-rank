import { describe, expect, it } from "vitest";
import { priceSummary, vsMedian, MONTHLY_LABEL } from "@/community/priceLogic";
import { kmFromCentre } from "@/community/homecards";
import { accountInitial } from "@/community/accountmenu";

describe("priceSummary (home page lines under the asking price)", () => {
  it("adds Spain's buying costs (midpoint of 7.5-14%) and labels a community fee", () => {
    const s = priceSummary({ price_eur: 197000, country: "Spain", hoa_monthly: 90, hoa_currency: "EUR" });
    expect(s.total).toBe(Math.round((197000 * (1 + 0.1075)) / 1000) * 1000);
    expect(s.monthly).toBe(90);
    expect(s.monthlyWhat).toBe("fee");
    expect(MONTHLY_LABEL[s.monthlyWhat!]).toBe("(community fee)");
  });
  it("converts a US fee to euros and names fee and tax together", () => {
    const s = priceSummary({ price_eur: 134400, country: "United States", hoa_monthly: 750, hoa_currency: "USD", tax_annual: 1200 });
    expect(s.monthlyWhat).toBe("fee_tax");
    expect(s.monthly).toBe(Math.round(750 * 0.896 + (1200 * 0.896) / 12));
    expect(s.monthlyLocal).toEqual({ amount: 850, currency: "USD" });
  });
  it("says nothing it does not know", () => {
    const s = priceSummary({ price_eur: 100000, country: "Atlantis" });
    expect(s).toEqual({ total: null, monthly: null, monthlyWhat: null, feeUnknown: false, monthlyLocal: null });
  });
  it("flags an unstated fee only when no fee is known", () => {
    expect(priceSummary({ price_eur: 100000, country: "Spain", hoa_unknown: true }).feeUnknown).toBe(true);
    expect(priceSummary({ price_eur: 100000, country: "Spain", hoa_unknown: true, hoa_monthly: 50 }).feeUnknown).toBe(false);
  });
});

describe("vsMedian", () => {
  it("compares the price per m² with the country median", () => {
    expect(vsMedian(130000, 100, 1000, "Spain")).toBe("30% above the median in Spain");
    expect(vsMedian(70000, 100, 1000, "Spain")).toBe("30% below the median in Spain");
  });
  it("stays quiet within 3% or without data", () => {
    expect(vsMedian(101000, 100, 1000, "Spain")).toBeNull();
    expect(vsMedian(100000, null, 1000, "Spain")).toBeNull();
  });
});

describe("kmFromCentre", () => {
  it("rounds to one decimal under 10 km and to whole km above", () => {
    expect(kmFromCentre(1.24, "en")).toBe("1.2 km");
    expect(kmFromCentre(1.24, "es")).toBe("1,2 km");
    expect(kmFromCentre(12.6, "en")).toBe("13 km");
  });
});

describe("accountInitial", () => {
  it("uses the chosen name, never an automatic handle", () => {
    expect(accountInitial("carlos", "Carlos", "x@y.z")).toBe("C");
    expect(accountInitial("hunter_ab12cd34", null, "maria@y.z")).toBe("M");
    expect(accountInitial(null, null, null)).toBe("");
  });
});
