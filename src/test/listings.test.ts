// Listing pages (seo/listings): which pages exist, that no two list the same homes, that a sold home leaves no hole,
// and that the English and Spanish pages say the same facts.
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { buildFacets, jaccard, nearestLive, ptypeOf, bySea, MIN, MIN_NEW, DUP } from "../../seo/listings/facets";
import { listingPlan, composeAll, movedAddresses } from "../../seo/listings/build";
import { renderBody, renderLd, plain } from "../../seo/listings/page";
import { en } from "../../seo/listings/pack.en";
import { es } from "../../seo/listings/pack.es";

const rows: any[] = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "public/data/rh-static.json"), "utf8")).rows;
const plan = listingPlan(rows);
const byPath = new Map(plan.pages.map((p) => [p.path, p]));

describe("which listing pages exist", () => {
  it("every page has its minimum of homes", () => {
    for (const p of plan.pages) {
      if (p.thin) { expect(p.kind).toBe("country"); continue; }
      // towns and budgets inside a region: from 3 homes since 20-nov-2026
      const isNew = ["ptype", "beds"].includes(p.kind) || p.key === "with-pool" && p.kind === "feature";
      expect(p.homes.length, p.path).toBeGreaterThanOrEqual(isNew ? MIN_NEW : MIN);
    }
  });
  it("no two pages of a country list (nearly) the same homes, except one budget next to its country", () => {
    const by = new Map<string, typeof plan.pages>();
    for (const p of plan.pages) if (!p.thin) (by.get(p.cc || "") || by.set(p.cc || "", []).get(p.cc || "")!).push(p);
    for (const [, list] of by) {
      let exceptions = 0;
      for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
        const a = new Set(list[i].homes.map((h) => h.slug)), b = new Set(list[j].homes.map((h) => h.slug));
        if (jaccard(a, b) >= DUP) { expect([list[i].kind, list[j].kind].sort(), `${list[i].path} = ${list[j].path}`).toEqual(["band", "country"]); exceptions++; }
      }
      expect(exceptions).toBeLessThanOrEqual(1);
    }
  });
  it("redirects point straight at a page that exists, never at themselves or another redirect", () => {
    for (const [from, to] of Object.entries(plan.redirects)) {
      expect(byPath.has(from), from).toBe(false);
      expect(byPath.has(to) || to === "/cheap-houses", `${from} -> ${to}`).toBe(true);
    }
  });
  it("every address published before has a page or a place to go", () => {
    const known: string[] = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "seo/listings/known-urls.json"), "utf8")).urls;
    const moved = movedAddresses(plan);
    for (const u of known) expect(byPath.has(u) || !!moved[u], u).toBe(true);
    for (const to of Object.values(moved)) expect(byPath.has(to) || to === "/cheap-houses" || to === "/", to).toBe(true);
  });
  it("a home that is sold leaves no hole: the page under its minimum is gone and its address goes to the parent", () => {
    // the data changes every day, so the page is picked from today's plan: the smallest region page
    const kav = plan.pages.filter((p) => p.kind === "region").sort((x, y) => x.homes.length - y.homes.length)[0];
    const gone = new Set(kav.homes.slice(0, kav.homes.length - MIN + 1).map((h) => h.slug));
    const after = buildFacets(rows.filter((r) => !gone.has(r.slug)));
    const live = new Set(after.pages.map((p) => p.path));
    expect(live.has(kav.path)).toBe(false);
    expect(live.has(nearestLive(kav.path, live, after.redirects))).toBe(true);
    expect(nearestLive(kav.path, live, after.redirects).startsWith(`/homes/${kav.cc}`)).toBe(true);
    for (const p of after.pages) for (const h of p.homes) expect(gone.has(h.slug)).toBe(false);
    expect(nearestLive("/cheap-houses/with-sauna-in-united-states", new Set(["/homes/united-states"]))).toBe("/homes/united-states");
    expect(nearestLive("/homes/italy/tuscany/under-999", new Set(["/homes/italy", "/homes/italy/tuscany"]))).toBe("/homes/italy/tuscany");
    expect(nearestLive("/homes/italy/tuscany/x", new Set(["/homes/italy"]), { "/homes/italy/tuscany/x": "/homes/italy/tuscany" })).toBe("/homes/italy");
  });
  it("reads the kind of home from its title and the sea from the measured distance", () => {
    expect(ptypeOf({ title: "2-bedroom flat in a townhouse" })).toBe("apartment");
    expect(ptypeOf({ title: "Stone house with a studio" })).toBe("house");
    expect(ptypeOf({ title: "Home with a garden" })).toBe("");
    expect(bySea({ category: "beach", nearby: { sea_km: 12 } })).toBe(false);
    expect(bySea({ category: "city", nearby: { sea_km: 0.3 } })).toBe(true);
    expect(bySea({ category: "beach" })).toBe(true);
  });
});

describe("what the pages say", () => {
  const E = composeAll(plan, rows, en), S = composeAll(plan, rows, es);
  it("every page has English and Spanish words, with the same homes in the same order", () => {
    for (const p of plan.pages) {
      const a = E.texts.get(p.path)!, b = S.texts.get(p.path)!;
      expect(a && b, p.path).toBeTruthy();
      expect(a.cards.map((h) => h.slug)).toEqual(b.cards.map((h) => h.slug));
      expect(a.cards.map((h) => h.slug)).toEqual(p.homes.slice(0, 30).map((h) => h.slug));
      expect(a.faq.length).toBe(b.faq.length); expect(a.facts.length).toBe(b.facts.length); expect(a.watch.length).toBe(b.watch.length);
    }
  });
  it("no em dashes, no empty slots, and every sentence written by the templates carries a number", () => {
    for (const lang of [E, S]) for (const [u, T] of lang.texts) {
      if (!T) continue;
      const own = [...T.lede, ...T.facts, ...T.faq.map(([, a]) => a)].map(plain);
      for (const s of [T.h1, T.title, T.desc, T.updated, ...own, ...T.costs, ...T.watch, ...T.faq.map(([q]) => q)]) { expect(s, u).not.toMatch(/—|undefined|NaN|\bnull\b|\[object/); }
      for (const s of [...T.lede.slice(0, 1), ...T.facts]) expect(s, u).toMatch(/\d/);
    }
  });
  it("two budgets of the same country are different pages", () => {
    const bands = plan.pages.filter((p) => p.kind === "band").sort((x, y) => String(x.cc).localeCompare(String(y.cc)) || x.cap! - y.cap!);
    const i = bands.findIndex((p, k) => bands[k + 1]?.cc === p.cc && bands[k + 1].homes.length >= p.homes.length + 5);
    if (i < 0) return;
    const a = E.texts.get(bands[i].path)!, b = E.texts.get(bands[i + 1].path)!;
    expect(a.lede.join(" ")).not.toBe(b.lede.join(" "));
    const same = a.facts.filter((x) => b.facts.includes(x)).length + a.faq.filter(([, x]) => b.faq.some(([, y]) => y === x)).length;
    expect(same).toBeLessThanOrEqual(3); // the cheapest and the best-rated home can be the same under both budgets
  });
  it("a budget page answers with its own numbers, as cards, a table, questions and structured data", () => {
    const f = plan.pages.find((p) => p.kind === "band")!;
    const T = E.texts.get(f.path)!;
    expect(T.h1).toContain(en.money(f.cap!));
    expect(plain(T.lede[0])).toContain(String(f.homes.length));
    const html = renderBody(T, en, { css: "", updated: E.W.ctx.updated });
    // the grid has every card; the three picks above the text (26-nov-2026) are counted apart
    expect((html.replace(/<section class="ls-top"[\s\S]*?<\/section>/, "").match(/<li[^>]*><a class="ls-card"/g) || []).length).toBe(Math.min(30, f.homes.length));
    expect((html.match(/<h2/g) || []).length).toBeGreaterThanOrEqual(5);
    const ld = renderLd(T, en, (p) => "https://realhunt.co" + p) as any[];
    expect(ld.map((x) => x["@type"])).toEqual(["BreadcrumbList", "ItemList", "FAQPage"]);
    expect(ld[2].mainEntity.length).toBe(T.faq.length);
    expect(S.texts.get(f.path)!.h1).toMatch(/ por menos de [\d.]+\u00a0€$/);
  });
});
