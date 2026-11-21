// List 2 ideas 70, 73, 74, 75 and 85 (21 Nov 2026).
import { describe, it, expect } from "vitest";
import fs from "fs";
import { livingSqm, perSqm, sqmIsPlot } from "@/community/sqmLogic";
import { keyFacts } from "@/community/keyfactsLogic";
import { costsNotStated, NOT_STATED_LABEL } from "@/community/priceLogic";
import { homeKind, kindFromTitle, KIND_BY_NAME, homeWhat } from "@/community/homeLead";
import { findDupes, sourceKey } from "../../seo/tech/dupes";

const snap = JSON.parse(fs.readFileSync("public/data/rh-static.json", "utf8"));
const rows: any[] = snap.rows;

describe("€/m² only for a living area (idea 74)", () => {
  it("keeps an ordinary floor area", () => {
    expect(livingSqm({ sqm: 85, title: "Bright 85 m² flat with a balcony" })).toBe(85);
    expect(perSqm({ sqm: 100, price_eur: 150000, title: "House" })).toBe(1500);
  });
  it("drops 1,000 m² and more", () => {
    expect(livingSqm({ sqm: 1000, title: "House" })).toBeNull();
    expect(perSqm({ sqm: 2400, price_eur: 90000 })).toBe(0);
  });
  it("drops a figure the advert calls a plot", () => {
    expect(sqmIsPlot(850, "Stone house on a 850 m² plot near the sea")).toBe(true);
    expect(sqmIsPlot(900, "Cottage with a plot of about 900 m²")).toBe(true);
    expect(sqmIsPlot(1200, "Farmhouse, 1,200 m² of land")).toBe(true);
    expect(livingSqm({ sqm: 640, title: "Ruin to restore", why_great: "The 640 m² plot has olive trees." })).toBeNull();
  });
  it("keeps the house size when only another number is the plot", () => {
    expect(livingSqm({ sqm: 186, title: "A modernised villa of 186 m² on a 1,424 m² plot" })).toBe(186);
    expect(livingSqm({ sqm: 106, title: "Three-bedroom house of about 106 m² on a hillside plot" })).toBe(106);
  });
  it("the key facts row leaves out €/m² for a plot size but keeps the size", () => {
    const k = keyFacts({ price_eur: 60000, sqm: 700, title: "Plot with a cabin", why_great: "A 700 m² plot by the lake." });
    expect(k.map((x) => x.k)).toEqual(["sqm"]);
  });
  it("on the live snapshot, most homes with a size keep their €/m²", () => {
    const sized = rows.filter((r) => r.sqm > 0 && r.price_eur > 0);
    const kept = sized.filter((r) => perSqm(r) > 0);
    expect(kept.length / sized.length).toBeGreaterThan(0.97);
  });
});

describe("bathrooms in the key facts row only when given (idea 85)", () => {
  it("adds a tile for a whole number above 0", () => {
    expect(keyFacts({ price_eur: 100000, sqm: 80, bedrooms: 2, bathrooms: 1 }).map((x) => x.k)).toEqual(["sqm", "per", "beds", "baths"]);
  });
  it("nothing when missing, zero or not a whole number", () => {
    for (const b of [null, undefined, 0, 1.5]) expect(keyFacts({ price_eur: 100000, sqm: 80, bathrooms: b as any }).some((x) => x.k === "baths")).toBe(false);
  });
});

describe("fees and yearly tax 'not stated' (idea 75)", () => {
  it("says which figure the advert leaves out", () => {
    expect(costsNotStated({})).toBe("both");
    expect(costsNotStated({ hoa_monthly: 0, tax_annual: null })).toBe("both");
    expect(costsNotStated({ hoa_monthly: 120 })).toBe("tax");
    expect(costsNotStated({ tax_annual: 900 })).toBe("fee");
    expect(costsNotStated({ hoa_monthly: "80", tax_annual: "600" })).toBeNull();
  });
  it("every label has its Spanish text in the dictionary", () => {
    const es = JSON.parse(fs.readFileSync("public/i18n/es-extra.json", "utf8"));
    for (const k of [...Object.values(NOT_STATED_LABEL), "Not stated in the advert", "Not stated in the listing"]) expect(es[k], k).toMatch(/no indicad/i);
  });
});

describe("kind of home stored in the database first (idea 70)", () => {
  it("a stored kind wins over the title", () => {
    expect(homeKind({ title: "Stone house with a garden", property_type: "cottage" }).en).toBe("cottage");
    expect(homeWhat({ title: "Bright home", property_type: "flat", bedrooms: 2 }, "en")).toBe("2-bedroom flat");
  });
  it("an unknown or empty stored value falls back to the title", () => {
    expect(homeKind({ title: "2-bedroom flat with a terrace", property_type: "spaceship" }).en).toBe("flat");
    expect(homeKind({ title: "Villa with pool", property_type: null }).en).toBe("villa");
  });
  it("the one-off fill matches the title reading for every home in the snapshot", () => {
    const sql = fs.readFileSync("supabase/oneoff/20261121_fill_property_type.sql", "utf8");
    const set = new Map([...sql.matchAll(/set property_type = '(\w+)' where slug = '([^']+)'/g)].map((m) => [m[2], m[1]]));
    for (const r of rows) {
      const k = kindFromTitle(r).en;
      if (k === "home") expect(set.has(r.slug)).toBe(false);
      else if (set.has(r.slug)) expect(set.get(r.slug)).toBe(k);
      if (set.has(r.slug)) expect(KIND_BY_NAME[set.get(r.slug)!]).toBeTruthy();
    }
    expect(set.size).toBeGreaterThan(600);
  });
  it("the migration allows every kind the site knows", () => {
    const mig = fs.readFileSync("supabase/migrations/20261121150000_property_type.sql", "utf8");
    for (const k of Object.keys(KIND_BY_NAME)) expect(mig).toContain(`'${k}'`);
  });
});

describe("homes published twice (idea 73)", () => {
  const base = { price_eur: 90000, sqm: 80, location_name: "Teruel", country: "Spain" };
  it("lists the same photo, the same advert and the same price, size and place", () => {
    const g = findDupes([
      { slug: "a", ...base, image_urls: ["x.jpg"], source_url: "https://www.idealista.com/inmueble/1/" },
      { slug: "b", ...base, sqm: 82, image_urls: ["x.jpg"], source_url: "http://idealista.com/inmueble/1#fotos" },
      { slug: "c", price_eur: 50000, sqm: 60, location_name: "Ávila", image_urls: ["y.jpg"] },
    ]);
    expect(g.groups.map((x) => x.why).sort()).toEqual(["photo", "price_size_place", "source"]);
    expect(g.failures).toHaveLength(1);
  });
  it("only the same advert fails, the rest is a list for a person", () => {
    const g = findDupes([{ slug: "a", ...base, image_urls: ["x.jpg"] }, { slug: "b", ...base, image_urls: ["x.jpg"] }]);
    expect(g.groups.length).toBe(2);
    expect(g.failures).toEqual([]);
  });
  it("normalises the advert URL", () => expect(sourceKey("https://www.Example.com/a/b/#x")).toBe("example.com/a/b"));
  it("the live snapshot has no advert published twice", () => expect(findDupes(rows).failures).toEqual([]));
});
