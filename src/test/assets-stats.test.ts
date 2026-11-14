// Figures the site publishes for others to quote (seo/assetsStats.ts) and the files it hands out (seo/assetsTrust.ts).
import { describe, it, expect } from "vitest";
import { BANDS, MIN_RANK, budgetStats, costStats, countryStats, median, regionStats, ruleStats, scoreFit, toCsv, type Home } from "../../seo/assetsStats";
import { countryCardSvg, scoreBadgeSvg } from "../../seo/assetsTrust";
import { bars, kit, mdTable, table } from "../../seo/assetsKit";
import { isAssetPath } from "../community/assetRoutes";

const home = (i: number, country: string, price: number, sqm: number | null, region = "Granada", nota = 80): Home => ({ slug: `h${i}`, title: `Home ${i}`, country, location_name: `Town ${i}, ${region}, ${country}`, price_eur: price, sqm, bedrooms: 2, nota, dims: { price: 50, value: 50, space: 50, condition: 50, extras: 50, water: 50, weather: 50, access: 50 } });
const spain = Array.from({ length: 12 }, (_, i) => home(i, "Spain", 40000 + i * 10000, 50 + i * 10, i < 6 ? "Granada" : "Murcia", 80 + i));
const italy = Array.from({ length: 4 }, (_, i) => home(100 + i, "Italy", 20000 + i * 10000, i < 2 ? null : 80, "Calabria", 90));
const rows = [...spain, ...italy, home(200, "Norway", 90000, 100), home(201, "Scandinavia", 50000, 60)];

describe("median", () => {
  it("is the middle value, the upper one of two, and ignores zeros", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(3);
    expect(median([0, 5])).toBe(5);
    expect(median([])).toBe(0);
  });
});

describe("countryStats", () => {
  const cs = countryStats(rows);
  it("leaves out countries with fewer than 3 homes and tags that are not countries", () => {
    expect(cs.map((c) => c.k).sort()).toEqual(["italy", "spain"]);
  });
  it("marks small samples and counts regions", () => {
    const es = cs.find((c) => c.k === "spain")!, it_ = cs.find((c) => c.k === "italy")!;
    expect(es.small).toBe(false); expect(es.n).toBe(12); expect(es.regions).toEqual(["Granada", "Murcia"]);
    expect(it_.small).toBe(true); expect(it_.n).toBeLessThan(MIN_RANK);
  });
  it("gives no price per m² when fewer than 3 homes state their size", () => {
    const it_ = cs.find((c) => c.k === "italy")!;
    expect(it_.nSqm).toBe(2); expect(it_.medPpsqm).toBe(0); expect(it_.medSqm).toBe(0);
  });
  it("computes the median price and price per m² from the homes", () => {
    const es = cs.find((c) => c.k === "spain")!;
    expect(es.medPrice).toBe(100000); expect(es.min).toBe(40000); expect(es.max).toBe(150000);
    expect(es.medPpsqm).toBe(Math.round(median(spain.map((h) => h.price_eur / (h.sqm as number)))));
  });
});

describe("budgetStats", () => {
  it("counts every home in exactly one price band", () => {
    const es = budgetStats(rows).find((r) => r.k === "spain")!;
    expect(BANDS.reduce((a, b) => a + es.cells[b.id].n, 0)).toBe(12);
    expect(es.cells["50k"].n).toBe(2);  // 40,000 and 50,000
    expect(es.cells["100k"].n).toBe(5); // 60,000 to 100,000
    expect(es.cells["200k"].n).toBe(5);
    expect(es.cells["100k"].best?.nota).toBe(86);
  });
  it("hides the size when too few homes in the band state it", () => {
    expect(budgetStats(rows).find((r) => r.k === "spain")!.cells["50k"].medSqm).toBe(0);
  });
});

describe("regionStats", () => {
  it("keeps regions with at least 5 homes, best median score first", () => {
    const rg = regionStats(rows, 5);
    expect(rg.map((r) => r.k)).toEqual(["spain/murcia", "spain/granada"]);
    expect(rg[0].medScore).toBeGreaterThan(rg[1].medScore);
  });
});

describe("costStats and ruleStats", () => {
  it("reads ranges and sorts by the middle of the range", () => {
    const st = costStats({ _meta: {}, a: { purchase_costs_pct: "7.5-14" }, b: { purchase_costs_pct: "3" }, c: { purchase_costs_pct: null } });
    expect(st.map((x) => [x.k, x.lo, x.hi])).toEqual([["b", 3, 3], ["a", 7.5, 14]]);
  });
  it("falls back from the bloc rule to the rule for everybody and lists the home country", () => {
    const cb: any = { _meta: {}, eu: [], schengen: [], nationalities: { american: { label: "American", noun: "an American", plural: "Americans", home: "us", bloc: "other", notes: [] }, german: { label: "German", noun: "a German", plural: "Germans", home: "de", bloc: "eu", notes: [] } },
      countries: { x: { eu: { s: "yes", a: "Yes." }, other: { s: "conditions", a: "With a permit." } }, y: { all: { s: "restricted", a: "No." }, german: { s: "yes", a: "Treaty." } }, us: { all: { s: "yes", a: "Yes." } } } };
    const rs = ruleStats(cb, ["x", "y", "us", "missing"]);
    expect(rs.map((r) => r.k)).toEqual(["x", "y", "us"]);
    expect([rs[0].eu, rs[0].other]).toEqual(["yes", "conditions"]);
    expect([rs[1].eu, rs[1].other, rs[1].byNat.german, rs[1].byNat.american]).toEqual(["restricted", "restricted", "yes", "restricted"]);
    expect(rs[1].exceptions).toEqual(["german"]);
    expect(rs[2].byNat.american).toBe("home");
  });
});

describe("scoreFit", () => {
  it("recovers a straight line between the average of the sub-scores and the grade", () => {
    const hs: Home[] = Array.from({ length: 40 }, (_, i) => { const avg = 45 + i; return { slug: `s${i}`, price_eur: 1, nota: Math.round(43 + 0.66 * avg), dims: Object.fromEntries(["a", "b", "c", "d", "e", "f", "g", "h"].map((k) => [k, avg])) }; });
    const f = scoreFit([...hs, { slug: "few", price_eur: 1, nota: 91, dims: { interest: 71 } }]);
    expect(f.n).toBe(40); expect(f.fewer).toBe(1);
    expect(f.slope).toBeCloseTo(0.66, 1); expect(f.intercept).toBeCloseTo(43, 0); expect(f.within1).toBe(1);
    expect(f.bands.reduce((a, [, n]) => a + n, 0)).toBe(41);
  });
});

describe("files handed out", () => {
  it("quotes CSV cells that need it", () => {
    expect(toCsv(["a", "b"], [["x, y", 'say "hi"'], [1, null]])).toBe('a,b\n"x, y","say ""hi"""\n1,\n');
  });
  it("draws a score badge and a country card that are valid, escaped SVG", () => {
    expect(scoreBadgeSvg(87)).toContain(">87<");
    const svg = countryCardSvg(kit("en"), "Spain", 12, [{ ...spain[0], title: 'A & B <house> "x"' }, spain[1], spain[2]], "2026-11-14");
    expect(svg).toContain("Best homes in Spain"); expect(svg).toContain("A &amp; B &lt;house&gt;"); expect(svg).not.toContain("<house>");
    expect(countryCardSvg(kit("es"), "United States", 5, spain, "2026-11-14")).toContain("Las mejores casas en Estados Unidos");
  });
  it("builds charts and tables with no script and no em dash", () => {
    const k = kit("es");
    const html = bars(k, "Título", "Sub", [{ label: "España", value: 10, text: "10" }, { label: "Italia", value: 5, from: 2, text: "2–5", weak: true }], "Barra rayada") + table([{ h: "País" }, { h: "N", cls: "n" }], [["España", "1"]]);
    expect(html).not.toMatch(/<script|—/); expect(html).toContain('width:100%'); expect(html).toContain('class="weak"'); expect(html).toContain('<th scope="row">España</th>');
    expect(mdTable(["a", "b"], [["x|y", 1]])).toBe("| a | b |\n| --- | --- |\n| x/y | 1 |\n");
  });
  it("formats money, lists and dates in each language", () => {
    const en = kit("en"), es = kit("es");
    expect(en.eur(85000)).toBe("€85,000"); expect(es.eur(85000)).toBe("85.000 €");
    expect(en.pct(7.5, 14)).toBe("7.5–14%"); expect(es.pct(7.5, 14)).toBe("7,5–14%");
    expect(es.list(["España", "Francia", "Italia"])).toBe("España, Francia e Italia"); expect(en.list(["a", "b"])).toBe("a and b");
    expect(es.date("2026-11-14")).toBe("14 de noviembre de 2026"); expect(en.date("2026-11-14")).toBe("14 November 2026");
    expect(es.inThe("Netherlands")).toBe("los Países Bajos"); expect(en.inThe("United States")).toBe("the United States");
    expect(es.url("/press")).toBe("https://realhunt.co/es/press");
  });
});

describe("isAssetPath", () => {
  it("covers the static pages and leaves the app's own research page alone", () => {
    for (const p of ["/research", "/research/prices", "/research/where-foreigners-can-buy", "/method", "/press", "/embed", "/for-ai", "/editorial-policy"]) expect(isAssetPath(p)).toBe(true);
    for (const p of ["/research/new-builds", "/", "/methods", "/blog", "/embed/homes/spain"]) expect(isAssetPath(p)).toBe(false);
  });
});
