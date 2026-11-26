// Listing pages, list of 26-nov-2026 (ideas 51 to 100): one count for the whole site, the hub of every country,
// bedrooms with a budget, numbered pages, the picks above the text and the blocks that only English and Spanish have.
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { listingPlan, listingRows, listingPages, composeAll } from "../../seo/listings/build";
import { siteCounts, COUNT_MIN } from "../../seo/listings/counts";
import { bedsOf, jaccard, DUP } from "../../seo/listings/facets";
import { renderBody, renderLd, plain, CARDS } from "../../seo/listings/page";
import { en } from "../../seo/listings/pack.en";
import { es } from "../../seo/listings/pack.es";
import { PACKS } from "../../seo/langs/config";

const snap = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "public/data/rh-static.json"), "utf8"));
const rows = listingRows();
const plan = listingPlan(rows);
const live = plan.pages.filter((p) => !p.thin);
const E = composeAll(plan, rows, en), S = composeAll(plan, rows, es);
const out = new Map<string, { title: string; desc: string; body: string; ld: any[]; o: any }>();
listingPages(plan, rows, (url, title, desc, _i, body, ld, o) => { out.set(url.replace("https://realhunt.co", ""), { title, desc, body: body || "", ld: (ld || []) as any[], o: o || {} }); }, "en");
const outEs = new Map<string, string>();
listingPages(plan, rows, (url, _t, _d, _i, body) => { outEs.set(url.replace("https://realhunt.co", ""), body || ""); }, "es");
const text = (h: string) => h.replace(/<style>[\s\S]*?<\/style>|<script>[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ");

describe("one count for the whole site (idea 52)", () => {
  // the rule of llms.txt and the home page in seo/prerender.ts: every home of the snapshot, countries with MIN_LIST homes
  const all = snap.rows.filter((r: any) => r?.slug);
  const per = new Map<string, number>();
  for (const r of all) { const k = String(r.country || "").toLowerCase().trim().replace(/\s+/g, "-"); if (k) per.set(k, (per.get(k) || 0) + 1); }
  const want = { homes: all.length, countries: [...per.entries()].filter(([k, n]) => k !== "scandinavia" && n >= COUNT_MIN).length };
  const prerender = fs.readFileSync(path.resolve(process.cwd(), "seo/prerender.ts"), "utf8");
  it("is the same rule as llms.txt and the home page", () => {
    expect(prerender).toMatch(/const MIN_LIST = 3;/);
    expect(prerender).toContain("Today: ${rows.length} homes in ${countryLinks.length} countries.");
    const sc = siteCounts(snap.rows);
    expect({ homes: sc.homes, countries: sc.countries }).toEqual(want);
  });
  it("the listing pages and both hubs say it", () => {
    const words = `${want.homes} homes on RealHunt in ${want.countries} countries`;
    const site = live.filter((p) => !p.cc && !p.ranked).map((p) => E.texts.get(p.path)!).filter((T) => T.lede.some((x) => plain(x).includes("homes on RealHunt in")));
    expect(site.length).toBeGreaterThan(0);
    for (const T of site) expect(T.lede.map(plain).join(" "), T.path).toContain(words);
    expect(text(out.get("/cheap-houses")!.body)).toContain(`${want.homes} homes in ${want.countries} countries`);
    expect(out.get("/homes")!.title).toBe(`Homes for sale by country: ${want.homes} homes in ${want.countries} countries`);
    expect(text(outEs.get("/homes")!)).toContain(`${want.homes} viviendas en ${want.countries} países`);
  });
});

describe("the hub of every country (idea 53)", () => {
  it("lists every country page with its photo, count, prices and guide, and is indexable", () => {
    const h = out.get("/homes")!;
    expect(h.o.noindex).toBeFalsy();
    for (const p of live.filter((x) => x.kind === "country")) expect(h.body, p.path).toContain(`href="${p.path}"`);
    expect((h.body.match(/<li><a class="ls-card"/g) || []).length).toBe(live.filter((x) => x.kind === "country").length);
    expect(h.body).toContain('fetchpriority="high"');
    expect(h.ld.map((x) => x["@type"])).toEqual(["BreadcrumbList", "ItemList"]);
    expect(text(outEs.get("/homes")!)).not.toMatch(/Dominican Republic|\bHomes\b/);
  });
});

describe("bedrooms with a budget (idea 61)", () => {
  const bb = live.filter((p) => p.kind === "bedsBand");
  it("exist only with 3 real homes that have those bedrooms and fit the budget, and copy no other page", () => {
    expect(bb.length).toBeGreaterThan(0);
    for (const p of bb) {
      expect(p.homes.length, p.path).toBeGreaterThanOrEqual(3);
      expect(p.path).toBe(`/homes/${p.cc}/${p.beds}-bedroom/under-${p.cap}`);
      for (const h of p.homes) { expect(p.beds === 4 ? bedsOf(h) >= 4 : bedsOf(h) === p.beds, p.path).toBe(true); expect(h.price_eur).toBeLessThanOrEqual(p.cap!); }
      const set = new Set(p.homes.map((h) => h.slug));
      for (const q of live) if (q !== p) expect(jaccard(set, new Set(q.homes.map((h) => h.slug))), `${p.path} ~ ${q.path}`).toBeLessThan(DUP);
    }
  });
  it("are named in English and Spanish and linked from the hub", () => {
    const hub = out.get("/cheap-houses")!.body;
    for (const p of bb) {
      const a = E.texts.get(p.path)!, b = S.texts.get(p.path)!;
      expect(a.h1, p.path).toContain(`${p.beds === 4 ? "4 or more bedrooms" : `${p.beds}-bedroom`}`);
      expect(a.h1).toContain(en.money(p.cap!)); expect(b.h1).toContain(es.money(p.cap!));
      expect(hub).toContain(`href="${p.path}"`);
    }
  });
  it("do not reach the other languages, whose packs have no words for them", async () => {
    const { CONFIG } = await import("../../seo/langs/config");
    for (const c of Object.values(CONFIG)) expect(c!.kinds).not.toContain("bedsBand");
    for (const P of Object.values(PACKS)) expect(P!.t2).toBeUndefined();
  });
});

describe("numbered pages of a big country (idea 66)", () => {
  const big = live.filter((p) => p.kind === "country" && p.homes.length > 60);
  it("every home of the country is a card on one of its pages, with prev and next", () => {
    expect(big.length).toBeGreaterThan(0);
    for (const c of big) {
      const of = Math.ceil(c.homes.length / CARDS);
      const seen = new Set<string>();
      for (let i = 1; i <= of; i++) {
        const pg = out.get(i === 1 ? c.path : `${c.path}/page/${i}`)!;
        expect(pg, `${c.path} page ${i}`).toBeTruthy();
        for (const m of pg.body.replace(/<section class="ls-top"[\s\S]*?<\/section>/, "").matchAll(/<a class="ls-card" href="\/deal\/([^"]+)"/g)) seen.add(m[1]);
        if (i < of) expect(pg.o.head || "", `${c.path} ${i}`).toContain(`rel="next" href="https://realhunt.co${c.path}/page/${i + 1}"`);
        if (i > 1) { expect(pg.o.head).toContain('rel="prev"'); expect(pg.o.noindex).toBeFalsy(); expect(pg.body).not.toContain('id="compare"'); expect(pg.body).toContain('aria-current="page">' + i + "<"); }
      }
      expect(seen.size, c.path).toBe(c.homes.length);
      expect(out.has(`${c.path}/page/${of + 1}`)).toBe(false);
    }
  });
});

describe("the blocks of 26-nov-2026", () => {
  const T = (p: string) => E.texts.get(p)!;
  it("three different homes above the text, the first photo asked for first (ideas 51, 58)", () => {
    for (const p of live) {
      const t = T(p.path); if (!t?.t2) continue;
      const top = t.t2.top.map(([, h]) => h.slug);
      expect(new Set(top).size, p.path).toBe(top.length);
      if (p.homes.length >= 4) expect(top.length, p.path).toBeGreaterThanOrEqual(2);
    }
    const body = out.get("/homes/spain")!.body;
    const iTop = body.indexOf('class="ls-top"'), iLede = body.indexOf('class="ls-lede"');
    expect(iTop).toBeGreaterThan(0); expect(iTop).toBeLessThan(iLede);
    expect(body.indexOf('fetchpriority="high"')).toBeGreaterThan(iTop);
    expect(body.match(/fetchpriority="high"/g)!.length).toBe(1);
  });
  it("cards: H3 titles, alt with the price, fee where the listing names one (ideas 70, 79, 97)", () => {
    const body = out.get("/homes/spain")!.body;
    expect(body).toMatch(/<h3 class="ls-t">/);
    for (const m of body.matchAll(/<img [^>]*alt="([^"]*)"/g)) expect(m[1]).toMatch(/€[\d,]+$/);
    const withFee = rows.find((r) => Number(r.hoa_monthly) > 0 && live.some((p) => p.homes.slice(0, 30).some((h) => h.slug === r.slug)));
    if (withFee) { const p = live.find((x) => x.homes.slice(0, 30).some((h) => h.slug === withFee.slug))!; expect(out.get(p.path)!.body).toContain("Community fee "); }
  });
  it("what your money buys: three groups that add up to the list (idea 64)", () => {
    for (const p of live) { const f = E.texts.get(p.path); if (!f?.t2?.money) continue; expect(f.t2.money).toMatch(/^Split into three groups/); }
    const F = live.find((p) => p.kind === "country" && p.homes.length >= 9)!;
    const m = E.texts.get(F.path)!.t2!.money;
    const ns = [...m.matchAll(/, (\d+) homes/g)].map((x) => Number(x[1]));
    expect(ns.reduce((a, b) => a + b, 0)).toBe(F.homes.length);
  });
  it("region pages: towns with their median and the four closest regions (ideas 55, 68)", () => {
    const regs = live.filter((p) => p.kind === "region");
    const withNear = regs.filter((p) => T(p.path).t2!.near.length);
    expect(withNear.length).toBeGreaterThan(regs.length / 2);
    for (const p of withNear) { const near = T(p.path).t2!.near; expect(near.length).toBeLessThanOrEqual(4); for (const [, q] of near) { expect(q).not.toBe(p.path); expect(q.startsWith(`/homes/${p.cc}/`)).toBe(true); } }
    for (const p of regs) for (const [, , n] of T(p.path).t2!.towns) expect(n).toBeGreaterThanOrEqual(2);
  });
  it("the list says how it is ordered, links only to anchors and the map, and its date is the last change (ideas 57, 67, 72)", () => {
    const b = out.get("/homes/spain")!.body;
    expect(b).toContain('href="#compare"');
    expect(b).toContain('href="/map?country=Spain"');
    const t = T("/homes/spain");
    expect(t.updated).toMatch(/^List last changed \d+ [A-Z][a-z]+ 20\d\d\.$/);
    expect(t.lastmod! <= E.W.ctx.updated).toBe(true);
  });
  it("checked, removed, how we choose (ideas 85, 86, 96)", () => {
    const b = text(out.get("/homes/spain")!.body);
    expect(b).toMatch(/\d+ of these \d+ homes were checked against the original listing in the last 30 days/);
    expect(out.get("/homes/spain")!.body).toContain('href="/how-we-check-homes"');
    const s = text(outEs.get("/homes/spain")!);
    expect(s).toMatch(/de estas \d+ viviendas se comprob/);
  });
  it("the sea filter and the CSV need no address and only show where they split the list (ideas 83, 95)", () => {
    for (const p of live) {
      const t = T(p.path).t2!; if (!t.sea) continue;
      expect(t.sea.n).toBeGreaterThanOrEqual(3); expect(t.sea.n).toBeLessThan(p.homes.length);
      expect(p.key).not.toBe("by-the-sea");
    }
    const b = out.get("/homes/spain")!.body;
    expect(b).toMatch(/<button type="button" class="ls-csv" data-file="realhunt-homes-spain.csv" onclick="/);
    // the handlers are plain attribute JavaScript that parses
    for (const m of b.matchAll(/onclick="([^"]+)"/g)) expect(() => new Function(m[1].replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"))).not.toThrow();
  });
  it("big lists carry half the table; ItemList names only the cards, once each (ideas 65, 98)", () => {
    for (const p of live) {
      const t = T(p.path);
      expect(t.rows.length, p.path).toBe(Math.min(p.homes.length, p.homes.length >= 100 ? 30 : 60));
      const ld = renderLd(t, en, (x) => "https://realhunt.co" + x) as any[];
      const urls = ld[1].itemListElement.map((x: any) => x.url);
      expect(new Set(urls).size).toBe(urls.length); expect(urls.length).toBe(t.cards.length);
    }
  });
  it("every description is different (idea 89) and no listing home lacks a photo (idea 93)", () => {
    for (const X of [E, S]) { const seen = new Map<string, string>(); for (const p of live) { const t = X.texts.get(p.path); if (!t) continue; expect(seen.get(t.desc), `${p.path} = ${seen.get(t.desc)}`).toBeUndefined(); seen.set(t.desc, p.path); } }
    for (const p of plan.pages) for (const h of p.homes) expect(String(h.image_urls?.[0] || "").length, h.slug).toBeGreaterThan(0);
  });
  it("Spanish pages carry the same blocks in Spanish", () => {
    const b = text(outEs.get("/homes/spain")!);
    for (const w of ["Ir a las viviendas", "Tres de esta lista", "Qué compra tu dinero aquí", "Descargar esta tabla (CSV)", "Cómo elegimos estas viviendas"]) expect(b).toContain(w);
    for (const w of ["Jump to the homes", "Three picks", "What your money buys", "Download this table", "List last changed"]) expect(b).not.toContain(w);
  });
  it("the other languages render without the new blocks", () => {
    for (const P of Object.values(PACKS)) {
      const X = composeAll(plan, rows, P!);
      const t = [...X.texts.values()].find(Boolean)!;
      expect(t.t2).toBeNull();
      const h = renderBody(t, P!, { css: "", updated: X.W.ctx.updated });
      expect(h).not.toMatch(/ls-top|ls-csv|ls-order|ls-chosen/);
    }
  }, 60000);
});
