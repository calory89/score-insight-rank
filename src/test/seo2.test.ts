import { describe, it, expect } from "vitest";
import CB_JSON from "@/data/canbuy.json";
import GUIDES from "@/data/guides.json";
import DEST from "@/data/destinations.json";
import {
  type CanBuyData, costRange, buyingCosts, costLines, ruleFor, canBuyPairs, canBuyCountries, parseCanBuySlug, residencyFor,
  canBuyFaq, canBuyMeta, costCountries, fill,
} from "@/community/seo2data";

const CB = CB_JSON as unknown as CanBuyData;
const D = DEST as Record<string, any>;
const G = GUIDES as Record<string, any>;

describe("buying costs", () => {
  it("parses cost ranges", () => {
    expect(costRange("7.5-14")).toEqual([7.5, 14]);
    expect(costRange("3")).toEqual([3, 3]);
    expect(costRange("2–9")).toEqual([2, 9]);
    expect(costRange(null)).toBeNull();
    expect(costRange("n/a")).toBeNull();
  });
  it("computes fees and totals", () => {
    expect(buyingCosts(150000, [7.5, 14])).toEqual({ lo: 11250, hi: 21000, totalLo: 161250, totalHi: 171000 });
    expect(buyingCosts(-5, [1, 2]).lo).toBe(0);
    const l = costLines(300000, { purchase_costs_pct: "3" }, "GBP")!;
    expect(l.fees).toBe("£9,000");
    expect(l.total).toBe("£309,000");
    expect(costLines(1, {})).toBeNull();
  });
  it("has a calculator page for every destination with a percentage", () => {
    const keys = costCountries(D, G);
    expect(keys).toContain("spain");
    expect(keys).toContain("bali");
    expect(keys.every((k) => costRange(D[k].purchase_costs_pct))).toBe(true);
  });
});

describe("can I buy", () => {
  it("covers every guide country that has cost data", () => {
    const cs = canBuyCountries(CB, D, G);
    expect(cs.length).toBe(Object.keys(G).filter((k) => D[k]).length);
    for (const c of cs) for (const n of Object.keys(CB.nationalities)) {
      if (CB.nationalities[n].home === c) continue;
      const r = ruleFor(CB, n, c);
      expect(r, `${n} in ${c}`).not.toBeNull();
      expect(["yes", "conditions", "restricted"]).toContain(r!.s);
    }
  });
  it("skips a nationality's own country", () => {
    const pairs = canBuyPairs(CB, D, G);
    expect(pairs.find((p) => p.slug === "american-in-united-states")).toBeUndefined();
    expect(pairs.find((p) => p.slug === "american-in-spain")).toBeDefined();
    expect(parseCanBuySlug("american-in-united-states", CB)).toBeNull();
    expect(parseCanBuySlug("british-in-dominican-republic", CB)).toEqual({ nat: "british", country: "dominican-republic" });
    expect(parseCanBuySlug("martian-in-spain", CB)).toBeNull();
  });
  it("applies bloc rules and fallbacks", () => {
    expect(ruleFor(CB, "german", "denmark")!.s).toBe("conditions");
    expect(ruleFor(CB, "american", "denmark")!.s).toBe("restricted");
    expect(ruleFor(CB, "norwegian", "bulgaria")!.s).toBe("yes"); // EEA falls back to the EU rule
    expect(ruleFor(CB, "swiss", "bulgaria")!.s).toBe("conditions"); // Swiss fall back to the non-EU rule
    expect(ruleFor(CB, "swiss", "poland")!.s).toBe("yes"); // unless the country names them
    expect(ruleFor(CB, "british", "cyprus")!.s).toBe("conditions");
    expect(ruleFor(CB, "irish", "united-kingdom")!.a).toMatch(/Common Travel Area/);
    expect(ruleFor(CB, "german", "switzerland")!.s).toBe("restricted");
    expect(ruleFor(CB, "french", "canada")!.s).toBe("restricted");
  });
  it("explains residency by bloc", () => {
    expect(residencyFor(CB, "german", "spain", "Spain")[0]).toMatch(/EU citizen/);
    const us = residencyFor(CB, "american", "spain", "Spain").join(" ");
    expect(us).toMatch(/golden visa/);
    expect(us).toMatch(/90 days in any 180/);
    expect(residencyFor(CB, "british", "cyprus", "Cyprus").join(" ")).not.toMatch(/Schengen/);
  });
  it("builds FAQ and meta from the data, with no em dashes", () => {
    const faq = canBuyFaq(CB, "american", "spain", { dest: D.spain, guide: G.spain, name: "Spain", homes: [{ price_eur: 50000 }, { price_eur: 90000 }] });
    expect(faq[0][0]).toBe("Can an American buy property in Spain?");
    expect(faq.some(([q, a]) => /buying costs/.test(q) && a.includes("€11,250 to €21,000"))).toBe(true);
    expect(faq.some(([, a]) => a.includes("€50,000"))).toBe(true);
    const m = canBuyMeta(CB, "british", "united-states", "United States");
    expect(m.h1).toBe("Can a British citizen buy property in the United States?");
    const all = JSON.stringify(CB) + JSON.stringify(canBuyPairs(CB, D, G).map((p) => canBuyFaq(CB, p.nat, p.country, { dest: D[p.country], guide: G[p.country], name: G[p.country].name, homes: [] })));
    expect(all).not.toMatch(/—/);
    expect(fill("{plural} can", CB.nationalities.dutch)).toBe("Dutch buyers can");
  });
});
