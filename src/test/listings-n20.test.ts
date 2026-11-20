// Listing families, site map, sitemaps and language links of 20-nov-2026 (ideas 26-40, 61-70, 79, 80).
import { describe, it, expect } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { buildFacets, MIN, REGION_CCY } from "../../seo/listings/facets";
import { listingRows, composeAll, listingPlan, listingCss } from "../../seo/listings/build";
import { TRAITS } from "../../seo/listings/traits";
import { NEIGHBOURS, AREAS, regionName } from "../../seo/listings/places";
import { renderBody } from "../../seo/listings/page";
import { en } from "../../seo/listings/pack.en";
import { es } from "../../seo/listings/pack.es";
import { englishIn, NEW_LANGS } from "../../seo/listings/packkit";
import { planLangs, visible, linkDeals, dealLangLabel, localize } from "../../seo/langs/build";
import { PACKS, EN_ES_ONLY } from "../../seo/langs/config";
import { usdApprox } from "../../seo/listings/fx";
import { dealHash } from "../../seo/polish";

const day = (d: number) => `2026-11-${String(d).padStart(2, "0")}`;
let id = 0;
const home = (o: Record<string, any>) => ({ slug: `h${++id}`, title: "Stone house with a garden", country: "Spain", location_name: "Lucainena, Almería", price_eur: 60000, sqm: 90, nota: 85, approved_at: day(1), ...o });
const fx = { date: "2026-11-19", source: "", rates: { USD: 1.1, GBP: 0.85 } };

describe("new listing families", () => {
  const live = listingRows();
  const livePlan = buildFacets(live);
  const at = (p: string) => livePlan.pages.find((x) => x.path === p);
  it("lists a town and a budget inside a region from 3 homes", () => {
    const more = [61000, 75000, 90000].map((p) => home({ location_name: "Zzzvilla, Granada", price_eur: p, approved_at: "2026-10-01" }));
    const plan = buildFacets([...live, ...more]);
    expect(plan.pages.find((p) => p.path === "/homes/spain/granada/zzzvilla")?.homes.length).toBe(3);
    expect(livePlan.pages.some((p) => p.kind === "regionBand" && p.homes.length < 5)).toBe(true);
  });

  it("has the week, sizes and the top 10 by score of today's homes", () => {
    const top = at("/cheap-houses/best-rated-in-spain")!;
    expect(top.ranked).toBe(true);
    expect(top.homes.length).toBe(10);
    const notas = top.homes.map((h) => Number(h.nota));
    expect(notas).toEqual(notas.slice().sort((a, b) => b - a));
    const spain = live.filter((r) => r.country === "Spain").map((r) => Number(r.nota) || 0).sort((a, b) => b - a);
    expect(notas[9]).toBe(spain[9]);
    for (const p of livePlan.pages.filter((x) => x.key === "over-120-sqm")) for (const h of p.homes) expect(h.sqm, p.path).toBeGreaterThan(120);
    for (const p of livePlan.pages.filter((x) => x.key === "over-80-sqm" || x.key === "over-120-sqm" || x.key === "new-this-week")) expect(p.homes.length, p.path).toBeGreaterThanOrEqual(MIN);
    expect(TRAITS.find((t) => t.key === "new-this-week")!.top).toBe(12);
  });

  it("only gives the week list to the 12 countries with most homes", () => {
    const rows: any[] = [];
    for (let c = 0; c < 13; c++) for (let i = 0, n = 8 + (13 - c); i < n; i++)
      rows.push(home({ country: `Land${String.fromCharCode(97 + c)}`, location_name: `Town${i}, Region${i % 3}`, price_eur: 30000 + i * 7000, approved_at: i >= n - 3 ? day(19) : i >= n - 5 ? day(5) : "2026-09-01" }));
    const plan = buildFacets(rows, { fx, today: day(20) });
    const week = plan.pages.filter((p) => p.kind === "feature" && p.key === "new-this-week");
    expect(week.length).toBe(12);
    expect(week.some((p) => p.cc === "landm")).toBe(false);
    expect(week[0].homes.length).toBe(3);
  });

  it("groups the provinces of Spain into autonomous communities and names the towns of South Florida", () => {
    const sp = AREAS.filter((a) => a.cc === "spain").map((a) => a.slug);
    for (const k of ["andalusia", "valencian-community", "catalonia", "galicia"]) expect(sp).toContain(k);
    const us = AREAS.filter((a) => a.cc === "united-states").map((a) => a.slug);
    expect(us).toEqual(expect.arrayContaining(["boca-raton", "hollywood", "doral"]));
    expect(at("/homes/united-states/florida/aventura")?.kind).toBe("town");
    expect(at("/homes/spain/andalusia")!.homes.map((h) => regionName(h)).every((r) => ["Almería", "Cádiz", "Granada", "Huelva", "Málaga", "Sevilla", "Córdoba", "Jaén"].includes(r))).toBe(true);
    expect(at("/homes/united-states/boca-raton")!.homes.every((h) => /Boca Raton/.test(h.location_name))).toBe(true);
  });

  it("budgets in dollars inside a region of the United States, unless they copy a euro budget", () => {
    expect(REGION_CCY["united-states"]).toBe("USD");
    const rows = [
      ...[70000, 80000, 85000, 170000, 175000, 190000, 300000, 320000].map((p, i) => home({ country: "United States", location_name: `T${i}, Florida`, price_eur: p })),
      ...[0, 1, 2, 3].map((i) => home({ country: "United States", location_name: `Farm${i}, Maine`, price_eur: 90000 + i })),
    ];
    const plan = buildFacets(rows, { fx, today: day(20) });
    // $100,000 = €90,909: the 3 cheapest, the same homes as /florida/under-100000 (a near-copy, so it redirects there)
    expect(plan.redirects["/homes/united-states/florida/under-100000-dollars"]).toBe("/homes/united-states/florida/under-100000");
    // $200,000 = €181,818: 5 homes, which no euro budget lists
    expect(plan.pages.find((p) => p.path === "/homes/united-states/florida/under-200000-dollars")?.homes.length).toBe(5);
  });

  it("keeps the sea-view budgets of a country beyond the cap on trait + budget pages", () => {
    const sea = livePlan.pages.filter((p) => p.kind === "combo" && p.key === "with-sea-view" && p.cc);
    expect(sea.length).toBeGreaterThan(3);
    for (const p of sea) for (const h of p.homes) expect(h.price_eur).toBeLessThanOrEqual(p.cap!);
  });

  it("knows the neighbours of the countries we list", () => {
    expect(NEIGHBOURS.spain).toContain("portugal");
    for (const [cc, list] of Object.entries(NEIGHBOURS)) for (const n of list) expect(n, cc).toMatch(/^[a-z-]+$/);
  });
});

describe("country pages of today's snapshot", () => {
  const rows = listingRows();
  const plan = listingPlan(rows);
  it("start with buying costs, the rule for foreigners and the date, and carry a table of regions and the neighbours", () => {
    const { W, texts } = composeAll(plan, rows, en);
    const T = texts.get("/homes/spain")!;
    const keys = T.kpi.map(([k]) => k);
    expect(keys).toEqual(expect.arrayContaining(["Homes", "Median price", "Buying costs", "Foreign buyers", "Data of"]));
    expect(T.regionTable.length).toBeGreaterThan(5);
    const meds = T.regionTable.map((r) => Number(r[3].replace(/\D/g, "")));
    expect(meds).toEqual(meds.slice().sort((a, b) => a - b));
    expect(T.more.find(([l]) => l === "Neighbouring countries")?.[1].map(([, p]) => p)).toContain("/homes/portugal");
    expect(T.footLinks.map(([, p]) => p)).toContain("/sitemap/spain");
    expect(T.desc).toMatch(/average score \d+ of 98/);
    const html = renderBody(T, en, { css: listingCss(), colors: W.colors, updated: W.ctx.updated });
    expect(html).toContain('<h2 id="regions">Median price by region in Spain</h2>');
  });
  it("the Spanish twin links to the Spanish site map of the country", () => {
    const { texts } = composeAll(plan, rows, es);
    const T = texts.get("/homes/spain")!;
    expect(T.footLinks.map(([, p]) => p)).toContain("/es/sitemap/spain");
    expect(T.kpi.map(([k]) => k)).toContain("Gastos de compra");
  });
  it("names the new families in English and Spanish", () => {
    for (const P of [en, es]) {
      const { texts } = composeAll(plan, rows, P);
      for (const f of plan.pages.filter((p) => !p.thin && ["new-this-week", "over-80-sqm", "over-120-sqm", "best-rated"].includes(p.key || ""))) {
        const T = texts.get(f.path); if (!T) continue;
        expect(T.h1, f.path).not.toMatch(/undefined|best-rated-|over-\d+-sqm|new-this-week/);
        if (f.key === "best-rated") expect(T.cards.length, f.path).toBeLessThanOrEqual(10);
      }
    }
  });
});

describe("no page mixes languages (idea 70)", () => {
  const rows = listingRows();
  it("every page each new language would publish today, with the families of 20 November, has no English left", () => {
    const { langs } = planLangs(rows, () => true);
    const css = listingCss();
    for (const L of langs) {
      const set = new Set(L.pages.map((x) => x.f.path));
      for (const { f, T: T0 } of L.pages) {
        const T = localize(T0, (p) => set.has(p));
        expect(f.key && EN_ES_ONLY.has(f.key), f.path).toBeFalsy();
        if (!(["new-this-week", "over-80-sqm", "over-120-sqm"].includes(f.key || "") || f.kind === "area" || f.kind === "country")) continue;
        const html = renderBody(T, L.P, { css, updated: "2026-11-20", lang: L.lang });
        const text = visible(html.replace(/<a [^>]*href="\/deal\/[^"]*"[\s\S]*?<\/a>/g, " ")) + "\n" + T.title + "\n" + T.desc;
        expect(englishIn(L.lang, text), `${L.lang} ${f.path}`).toEqual([]);
      }
    }
  }, 60000);
  it("every new language has a pack", () => { for (const l of NEW_LANGS) expect(PACKS[l], l).toBeTruthy(); });
});

describe("home pages", () => {
  it("link to the listing of their country in the other languages", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "rh-deal-"));
    for (const p of ["deal/a", "es/deal/a"]) { fs.mkdirSync(path.join(root, p), { recursive: true }); fs.writeFileSync(path.join(root, p, "index.html"), `<html><body><div id="root"><main class="rh-static"><article><h1>A</h1></article></main></div></body></html>`); }
    const n = linkDeals(root, [{ slug: "a", country: "Bulgaria" }], (p) => (p === "/homes/bulgaria" ? { de: "/de/homes/bulgaria", ru: "/ru/homes/bulgaria" } : {}));
    expect(n).toBe(2);
    const h = fs.readFileSync(path.join(root, "deal/a/index.html"), "utf8");
    expect(h).toContain('<p class="ls-langs-deal">Homes in Bulgaria in other languages: <a href="/de/homes/bulgaria" hreflang="de" lang="de" target="_self">Deutsch</a>');
    expect(h.indexOf("ls-langs-deal")).toBeLessThan(h.indexOf("</article>"));
    expect(fs.readFileSync(path.join(root, "es/deal/a/index.html"), "utf8")).toContain("Casas en Bulgaria en otros idiomas");
    // twice is the same as once
    linkDeals(root, [{ slug: "a", country: "Bulgaria" }], () => ({ de: "/de/homes/bulgaria" }));
    expect(fs.readFileSync(path.join(root, "deal/a/index.html"), "utf8").match(/ls-langs-deal/g)!.length).toBe(1);
    expect(dealLangLabel("es", "United States")).toBe("Casas en Estados Unidos en otros idiomas");
  });
  it("show the price in dollars on the Spanish page at the dated rate", () => {
    expect(usdApprox(60000, fx)).toEqual({ usd: 66000, day: "19 de noviembre de 2026" });
    expect(usdApprox(60000, { ...fx, rates: {} })).toBeNull();
  });
  it("change their date only when the home changes, not when the homes around it do", () => {
    const r = home({ price_eur: 50000 });
    expect(dealHash(r)).toMatch(/^f:/);
    expect(dealHash({ ...r })).toBe(dealHash(r));
    expect(dealHash({ ...r, price_eur: 49000 })).not.toBe(dealHash(r));
    expect(dealHash({ ...r, sold_reports: 2 })).not.toBe(dealHash(r));
    expect(dealHash({ ...r, views: 99 })).toBe(dealHash(r));
  });
});

it("MIN is still 3", () => expect(MIN).toBe(3));
