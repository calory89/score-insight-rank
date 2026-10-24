import { describe, expect, it } from "vitest";
import guides from "@/data/guides.json";
import dest from "@/data/destinations.json";

const G = guides as Record<string, { name: string; steps: string[][]; yearly: string }>;
const D = dest as Record<string, any>;

describe("buying guides and cost data", () => {
  it("every guide has a name, 4 to 7 steps and yearly costs", () => {
    for (const [k, g] of Object.entries(G)) {
      expect(g.name, k).toBeTruthy();
      expect(g.steps.length, k).toBeGreaterThanOrEqual(4);
      expect(g.steps.length, k).toBeLessThanOrEqual(7);
      for (const s of g.steps) { expect(s.length, k).toBe(2); expect(s[0] && s[1], k).toBeTruthy(); }
      expect(g.yearly, k).toBeTruthy();
    }
  });
  it("cost entries for guide countries have sources and a cost range", () => {
    for (const k of Object.keys(G)) if (D[k]) {
      expect(D[k].sources?.length, k).toBeGreaterThan(0);
      expect(String(D[k].purchase_costs_pct || ""), k).toMatch(/^\d/);
    }
  });
  it("no em dashes in the texts", () => {
    expect(JSON.stringify(G)).not.toContain("—");
    for (const k of Object.keys(G)) if (D[k]) expect(JSON.stringify(D[k]), k).not.toContain("—");
  });
});
