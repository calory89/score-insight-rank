import { describe, it, expect } from "vitest";
import { regionGroups } from "../../seo/listings/build";

const h = (slug: string, price = 50000) => ({ slug, price_eur: price } as any);
const pages: any[] = [
  { path: "/homes/spain", kind: "country", cc: "spain", country: "Spain", homes: [h("a"), h("b"), h("c"), h("d")] },
  { path: "/homes/spain/granada", kind: "region", cc: "spain", country: "Spain", region: "Granada", regionSlug: "granada", homes: [h("a"), h("b"), h("c")] },
  { path: "/homes/spain/jaen", kind: "region", cc: "spain", country: "Spain", region: "Jaén", regionSlug: "jaen", homes: [h("d")], thin: true },
  { path: "/homes/italy", kind: "country", cc: "italy", country: "Italy", homes: [h("e")], thin: true },
  { path: "/homes/italy/liguria", kind: "region", cc: "italy", country: "Italy", region: "Liguria", regionSlug: "liguria", homes: [h("e"), h("f"), h("g")] },
];

describe("/regions hub (idea 101)", () => {
  it("lists only live region pages of live country pages", () => {
    const g = regionGroups({ pages } as any);
    expect(g.map((x) => x.c.path)).toEqual(["/homes/spain"]);
    expect(g[0].regions.map((r) => r.path)).toEqual(["/homes/spain/granada"]);
  });
  it("is empty when no region has a page", () => {
    expect(regionGroups({ pages: pages.filter((p) => p.kind !== "region") } as any)).toEqual([]);
  });
});
