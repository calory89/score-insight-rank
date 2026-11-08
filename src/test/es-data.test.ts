import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { build } from "../../scripts/build-es-data.mjs";

describe("public/i18n/es-data.json (Spanish of the site's data texts)", () => {
  it("is up to date with src/data/*-es.json (run node scripts/build-es-data.mjs)", () => {
    const file = JSON.parse(fs.readFileSync("public/i18n/es-data.json", "utf8"));
    expect(file).toEqual(build());
    expect(Object.keys(file).length).toBeGreaterThan(400);
  });
  it("covers every guide step and every 'can foreigners buy' answer", () => {
    const file = JSON.parse(fs.readFileSync("public/i18n/es-data.json", "utf8"));
    const g = JSON.parse(fs.readFileSync("src/data/guides.json", "utf8"));
    const d = JSON.parse(fs.readFileSync("src/data/destinations.json", "utf8"));
    for (const v of Object.values<any>(g)) for (const [h, t] of v.steps) { expect(file[h], h).toBeTruthy(); expect(file[t], t).toBeTruthy(); }
    for (const [k, v] of Object.entries<any>(d)) if (v && typeof v === "object" && v.can_foreigners_buy) expect(file[v.can_foreigners_buy], k).toBeTruthy();
  });
});
