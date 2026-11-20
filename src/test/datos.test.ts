// 20-nov-2026, list of 100 (agent "datos"): score line and glossary words on home pages, the log of homes taken off
// the site, /data/homes.jsonl, the trust pages, the new studies, the IndexNow changes and robots.txt.
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { glossaryLine, scoreLine, sourceNotes } from "../../seo/dealNotes";
import { currentState, diffSnapshots, mergeEvents, buildRemovedLog } from "../../seo/reach/removed";
import { homesJsonl, homeState } from "../../seo/reach/more";
import { indexNowChanges, llmsCountries } from "../../seo/reach";
import { checkStats } from "../../seo/trustMore";
import { TRUST_PAGES } from "../../seo/trustPages";
import { cheapestPerSqm, monthStats, seaHomes } from "../../seo/assetsStudies2";
import { removedBlock } from "../../seo/reach/pages";
import { kit } from "../../seo/assetsKit";
import { englishLeft } from "../../seo/es";
import { TRUST_PATHS, isAssetPath } from "../community/assetRoutes";

const dims = { price: 90, value: 85, space: 30, condition: 72, extras: 60, water: 10, weather: 50, access: 35, costs: 55, photos: 100, interest: 99 };

describe("scoreLine", () => {
  it("names the two strongest sub-scores and the weakest, never buyer interest", () => {
    expect(scoreLine({ nota: 86, dims })).toBe("Score 86/98: strong on price and price per m², weak on nearness to the sea or a lake.");
    expect(scoreLine({ nota: 86, dims }, "es")).toBe("Nota 86/98: destaca en precio y precio por m²; flojea en cercanía al mar o a un lago.");
  });
  it("says so when nothing stands out, and stays short without sub-scores", () => {
    expect(scoreLine({ nota: 75, dims: { price: 50, space: 45, extras: 60 } })).toBe("Score 75/98: no sub-score stands out.");
    expect(scoreLine({ nota: 80, dims: null })).toBe("Score 80/98.");
    expect(scoreLine({ nota: null, dims })).toBe("");
  });
  it("uses Spanish words only in Spanish", () => { expect(englishLeft(scoreLine({ nota: 86, dims }, "es")).english).toBeFalsy(); });
});

describe("glossaryLine", () => {
  it("links the local words of the country to its glossary, with their language", () => {
    const h = glossaryLine("italy");
    expect(h).toContain('href="/guide/glossary/italy#');
    expect(h).toMatch(/lang="it"/);
    expect(glossaryLine("italy", "es")).toContain('href="/es/guide/glossary/italy#');
    expect(glossaryLine("denmark")).toContain("/guide/glossary/sweden-denmark");
    expect(glossaryLine("narnia")).toBe("");
  });
  it("names no English word on a Spanish page", () => { expect(glossaryLine("united-states", "es")).not.toMatch(/lang="en"/); });
});

describe("sourceNotes", () => {
  it("says what our check gets from the portal, with the counts", () => {
    const h = sourceNotes("hemnet.se", [{ country: "Sweden", src_last: "blocked", sqm: 80 }, { country: "Sweden", src_last: "blocked" }, { country: "Sweden", src_last: "ok", bedrooms: 2 }]);
    expect(h).toContain("How to read hemnet.se adverts");
    expect(h).toContain("2 of these 3 adverts was blocked or unanswered");
    expect(h).toContain("/guide/glossary/sweden-denmark");
    expect(sourceNotes("x.com", [])).toBe("");
  });
});

const snap = (slug: string, o: Record<string, unknown> = {}) => ({ slug, title: `T ${slug}`, country: "Spain", price_eur: 50000, sold_reports: 0, available_reports: 0, ...o });
describe("removed log", () => {
  it("finds homes taken off, newly gone, back and repriced", () => {
    const prev = [snap("a"), snap("b"), snap("c", { sold_reports: 1 }), snap("d")];
    const cur = [snap("b", { sold_reports: 2, available_reports: 1 }), snap("c", { sold_reports: 1, available_reports: 1 }), snap("d", { price_eur: 45000 }), snap("e")];
    const ev = diffSnapshots("2026-11-20", prev, cur, new Set(["e"]));
    const k = (s: string) => ev.filter((e) => e.slug === s).map((e) => e.kind).sort();
    expect(k("a")).toEqual(["removed"]); expect(k("b")).toEqual(["gone"]); expect(k("c")).toEqual(["back"]); expect(k("d")).toEqual(["price"]); expect(k("e")).toEqual(["back"]);
    expect(ev.find((e) => e.slug === "d")!.old_price_eur).toBe(50000);
  });
  it("merges without repeats and drops bad entries", () => {
    const e = { date: "2026-11-01", kind: "gone", slug: "a" };
    expect(mergeEvents([e, e], [{ ...e, slug: "bad slug" }, { date: "x", kind: "gone", slug: "z" }], null)).toHaveLength(1);
  });
  it("a home that came back is no longer counted as taken off", () => {
    const s = currentState(mergeEvents([{ date: "2026-11-01", kind: "removed", slug: "a" }, { date: "2026-11-03", kind: "back", slug: "a" }, { date: "2026-11-02", kind: "gone", slug: "b" }, { date: "2026-11-02", kind: "price", slug: "c" }]));
    expect([...s.keys()]).toEqual(["b"]);
  });
  it("adds today's difference only against a snapshot of an earlier day", () => {
    const prevEnv = process.env.RH_SEO_STATE; delete process.env.RH_SEO_STATE;
    try {
      const fetcher = (day: string) => (u: string) => (u.endsWith("removed-homes.json") ? { events: [] } : { generated: `${day}T01:00:00Z`, rows: [snap("zz-old")] });
      expect(buildRemovedLog([snap("new")], "2026-11-20", fetcher("2026-11-19")).some((e) => e.slug === "zz-old" && e.date === "2026-11-20" && e.kind === "removed")).toBe(true);
      expect(buildRemovedLog([snap("new")], "2026-11-20", fetcher("2026-11-20")).some((e) => e.slug === "zz-old")).toBe(false);
    } finally { if (prevEnv === undefined) delete process.env.RH_SEO_STATE; else process.env.RH_SEO_STATE = prevEnv; }
  });
  it("the seed rebuilt from git is valid", () => {
    const seed = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../seo/reach/removed-seed.json"), "utf8"));
    expect(mergeEvents(seed.events).length).toBe(seed.events.length);
  });
  it("the data log lists the last 60 days, linking only homes still on the site", () => {
    const h = removedBlock(kit("en"), [{ date: "2026-11-19", kind: "removed", slug: "a", title: "Flat A" }, { date: "2026-11-19", kind: "gone", slug: "b", title: "Flat B" }, { date: "2026-08-01", kind: "gone", slug: "c", title: "Old" }], new Set(["b"]), "2026-11-20");
    expect(h).toContain("1 no longer for sale (advert offline), 1 taken off the site");
    expect(h).toContain('<a href="/deal/b">Flat B</a>'); expect(h).not.toContain('href="/deal/a"'); expect(h).not.toContain("Old");
  });
});

describe("/data/homes.jsonl", () => {
  const rows: any[] = [
    { slug: "x1", title: "Flat  one", country: "Spain", location_name: "Rossell, Castellón", price_eur: 55000, sqm: 110, bedrooms: 3, nota: 90, dims, publish_at: "2026-11-01T10:00:00Z", src_last: "ok", src_ok_at: "2026-11-19T01:00:00Z", source_domain: "fotocasa.es", lat: 40.6, lng: 0.2 },
    { slug: "x2", title: "Gone flat", country: "Italy", price_eur: 40000, sqm: null, nota: 80, sold_reports: 1, available_reports: 0, publish_at: "2026-10-01T10:00:00Z" },
    { slug: "x3", title: "Blocked flat", country: "Italy", price_eur: 45000, nota: 85, src_last: "blocked", src_ok_at: null, publish_at: "2026-10-01T10:00:00Z" },
    { slug: "x4", title: "No price", country: "Italy", price_eur: 0 },
  ];
  const lines = homesJsonl(rows, "2026-11-20").trim().split("\n").map((l) => JSON.parse(l));
  it("has a header line, then one home per line, best score first", () => {
    expect(lines[0]._about).toBeTruthy(); expect(lines[0].license).toContain("creativecommons");
    expect(lines.slice(1).map((l) => l.slug)).toEqual(["x1", "x3", "x2"]);
    expect(lines[1]).toMatchObject({ url: "https://realhunt.co/deal/x1", title: "Flat one", price_eur: 55000, size_sqm: 110, eur_per_sqm: 500, score: 90, added: "2026-11-01", state: "listed", listed_on: "fotocasa.es" });
    expect(lines[1].score_summary).toMatch(/^Score 90\/98: strong on/);
  });
  it("gives the state of each home with the rules of its page", () => {
    const now = Date.parse("2026-11-20T12:00:00Z");
    expect(homeState(rows[1], now)).toBe("advert_offline"); expect(homeState(rows[2], now)).toBe("unconfirmed"); expect(homeState(rows[0], now)).toBe("listed");
  });
});

describe("trust pages", () => {
  it("the app shows every trust page as a static page", () => {
    expect(TRUST_PAGES.map(([p]) => p).filter((p) => !p.startsWith("/research/"))).toEqual(TRUST_PATHS);
    for (const [p] of TRUST_PAGES) expect(isAssetPath(p), p).toBe(true);
  });
  it("counts the readings of the nightly check from the snapshot", () => {
    const now = Date.parse("2026-11-20T12:00:00Z");
    const st = checkStats([
      { slug: "a", price_eur: 1, src_last: "ok", src_ok_at: "2026-11-19T00:00:00Z", verified_at: "2026-11-01T00:00:00Z" },
      { slug: "b", price_eur: 1, src_last: "blocked", src_ok_at: "2026-09-01T00:00:00Z", publish_at: "2026-09-01T00:00:00Z" },
      { slug: "c", price_eur: 1, src_last: "gone", sold_reports: 1 },
      { slug: "d", price_eur: 1, src_last: null, source_domain: "instagram.com" },
    ] as any, now);
    expect(st).toMatchObject({ n: 4, ok: 1, removedReading: 1, blocked: 1, none: 1, social: 1, recent: 1, person: 1, gone: 1, unconfirmed: 2 });
  });
});

describe("studies", () => {
  const h = (slug: string, country: string, price: number, sqm: number | null, o: Record<string, unknown> = {}) => ({ slug, country, price_eur: price, sqm, nota: 80, title: slug, ...o });
  it("price per m² in Europe leaves out other continents and tiny or unknown sizes", () => {
    const s = cheapestPerSqm([h("a", "Spain", 30000, 100), h("b", "Spain", 30000, 60), h("c", "Japan", 10000, 100), h("d", "Spain", 10000, 10), h("e", "Spain", 10000, null), h("f", "Spain", 50000, 100)] as any);
    expect(s.homes.map((x) => x.slug)).toEqual(["a", "b", "f"]);
    expect(s.countries).toEqual([expect.objectContaining({ k: "spain", n: 3, med: 500, min: 300 })]);
  });
  it("homes by the sea at or under €100,000", () => {
    const s = seaHomes([h("a", "Spain", 90000, 80, { category: "beach" }), h("b", "Spain", 120000, 80, { category: "beach" }), h("c", "Spain", 50000, 80, { category: "village" })] as any);
    expect(s.sea.map((x) => x.slug)).toEqual(["a"]);
  });
  it("homes added in a month, by the day they went up", () => {
    const m = monthStats([h("a", "Spain", 1, 1, { publish_at: "2026-11-02T00:00:00Z" }), h("b", "Italy", 1, 1, { approved_at: "2026-11-05T00:00:00Z" }), h("c", "Italy", 1, 1, { publish_at: "2026-10-30T00:00:00Z" })] as any, "2026-11");
    expect(m.homes.map((x) => x.slug).sort()).toEqual(["a", "b"]); expect(m.countries.length).toBe(2);
  });
});

describe("IndexNow changes", () => {
  it("lists added, changed and removed pages, homes first", () => {
    const prev = { "/": ["1", ""], "/deal/a": ["1", ""], "/deal/b": ["1", ""], "/homes/spain": ["1", ""] } as any;
    const cur = { "/": ["2", ""], "/deal/a": ["1", ""], "/deal/c": ["1", ""], "/homes/spain": ["2", ""] } as any;
    expect(indexNowChanges(prev, cur)).toEqual({ added: ["https://realhunt.co/deal/c"], changed: ["https://realhunt.co/", "https://realhunt.co/homes/spain"], removed: ["https://realhunt.co/deal/b"] });
    expect(indexNowChanges(null, cur)).toEqual({ added: [], changed: [], removed: [] });
  });
});

describe("robots.txt", () => {
  const txt = fs.readFileSync(path.resolve(__dirname, "../../public/robots.txt"), "utf8");
  it("closes the private areas to every group without closing /method", () => {
    for (const g of txt.split(/\n\n+/).filter((b) => b.includes("User-agent:") && !b.includes("Twitterbot"))) { expect(g).toContain("Disallow: /me$"); expect(g).toContain("Disallow: /account"); expect(g).toContain("Disallow: /api/"); }
    expect(txt).not.toMatch(/^Disallow: \/me$/m); expect(txt).not.toMatch(/^Disallow: \/m$/m);
  });
  it("opens homes, listings and data to AI assistants by name", () => {
    const ai = txt.split(/\n\n+/).find((b) => b.includes("User-agent: GPTBot"))!;
    for (const p of ["/deal/", "/homes/", "/data/", "/llms.txt"]) expect(ai).toContain(`Allow: ${p}`);
  });
});

describe("llms.txt countries", () => {
  it("gives the figures of the day and the clean-text and data copies", () => {
    const root = fs.mkdtempSync(path.join(require("os").tmpdir(), "rh-llms-"));
    fs.mkdirSync(path.join(root, "data/countries"), { recursive: true });
    fs.writeFileSync(path.join(root, "data/countries/index.json"), JSON.stringify({ updated: "2026-11-20", countries: [{ country: "Bulgaria", key: "bulgaria", homes: 7, median_price_eur: 69000, median_eur_per_sqm: 759, costs_pct_low: 3, costs_pct_high: 4, json: "https://realhunt.co/data/countries/bulgaria.json", markdown: "https://realhunt.co/data/countries/bulgaria.md", page: "https://realhunt.co/homes/bulgaria", small_sample: true }] }));
    fs.writeFileSync(path.join(root, "data/countries/bulgaria.json"), JSON.stringify({ summary: { cheapest_eur: 58900 } }));
    expect(llmsCountries(root, new Set(["/homes/bulgaria.md"]))).toBe("## Countries (figures of 2026-11-20)\n\n- [Bulgaria](https://realhunt.co/homes/bulgaria): 7 homes from €58,900, median €69,000 (€759/m²); buying costs about 3 to 4% on top of the price (small sample). Text: https://realhunt.co/homes/bulgaria.md. Data: https://realhunt.co/data/countries/bulgaria.json, https://realhunt.co/data/countries/bulgaria.md\n");
  });
});
