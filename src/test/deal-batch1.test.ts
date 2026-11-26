// List of 1,000, batch 1 (26-nov-2026): the home pages. seo/dealExtras.ts, seo/dealChecks.ts, the shared title.
import { describe, expect, it } from "vitest";
import { regionCompare, regionCompareHtml, distancesLine, linkFirst, featuresHtml, nearbyHtml, amenLd, risksHtml, priceHistoryHtml, priceBefore, scoreRankText, calcLink, sameTown, bySimilarRule, siblings, correctionHtml, placeOnce, repeatsPlace, airportName, officialLinks } from "../../seo/dealExtras";
import { pageProblems, internalLinks, checkDeals } from "../../seo/dealChecks";
import { dealTitle, dealDocTitle } from "@/community/homeLead";
import { pickTitle } from "../../seo/polishMeta";
import { priceVerdict } from "@/community/homeArticle";
import snap from "../../public/data/rh-static.json";

const rows = (snap as any).rows as any[];
const home = { slug: "es-x", price_eur: 38000, sqm: 150, bedrooms: 2, nota: 94, country: "Spain", location_name: "Alpujarra de la Sierra, Granada, Spain", title: "2-bedroom house with terrace in Alpujarra de la Sierra", title_es: "Casa de 2 dormitorios con terraza en Alpujarra de la Sierra",
  amen: ["terrace", "fireplace"], nearby: { airport: { km: 60, code: "GRX", name: "Granada-Jaén Airport" }, sea: { km: 25.9, name: "Mediterranean" } }, publish_at: "2026-10-01T15:02:16Z", price_drop: 0,
  risks: { flood: { map: "https://sig.miteco.gob.es/snczi/", map_name: "SNCZI", level: "low", source: "rough", elev_m: 1170, coast_km: 25.9 }, noise: { level: "low", roads_checked: true, airport_km: 58.7 } } };
const words = (h: string) => h.replace(/<[^>]+>/g, " ");

describe("features, nearby and risks on both pages (ideas 2, 26, 35)", () => {
  it("writes the features in the language of the page", () => {
    expect(featuresHtml(home, "en")).toBe("<h2>Features</h2><p>Terrace, Fireplace</p>");
    expect(featuresHtml(home, "es")).toBe("<h2>Características</h2><p>Terraza, Chimenea</p>");
    expect(amenLd(home, "es")[0]).toEqual({ "@type": "LocationFeatureSpecification", name: "Terraza", value: true });
    expect(featuresHtml({ amen: [] }, "en")).toBe("");
  });
  it("names the airport with its code and the distances in a straight line", () => {
    expect(airportName(home.nearby.airport)).toBe("Granada-Jaén Airport (GRX)");
    expect(airportName({ name: "Faro (FAO)", code: "FAO" })).toBe("Faro (FAO)");
    const es = nearbyHtml(home, "es");
    expect(es).toContain("<h2>Qué hay cerca</h2>");
    expect(es).toContain("Mar: Mediterranean · 26 km");
    expect(es).toContain("línea recta");
    expect(nearbyHtml(home, "en")).toContain("Airport: Granada-Jaén Airport (GRX) · 60 km");
  });
  it("gives the same official flood map on the English and the Spanish page", () => {
    const en = risksHtml(home, "en"), es = risksHtml(home, "es");
    expect(en).toContain("<h2>Noise and flood</h2>");
    expect(es).toContain("<h2>Ruido e inundación</h2>");
    expect(officialLinks(en)).toEqual(["https://sig.miteco.gob.es/snczi/"]);
    expect(officialLinks(es)).toEqual(officialLinks(en));
    expect(words(es)).not.toMatch(/\b(the|and|not|flood|noise)\b/i);
    expect(risksHtml({}, "en")).toBe("");
  });
});

describe("price history and the score explained (ideas 6, 8, 10)", () => {
  it("says since when the price is the same, or how much it dropped", () => {
    expect(priceHistoryHtml(home, "en")).toContain("Same price since <time datetime=\"2026-10-01\">1 Oct 2026</time>: €38,000.");
    expect(priceHistoryHtml(home, "es")).toContain("Mismo precio desde el <time datetime=\"2026-10-01\">1 oct 2026</time>: 38.000 €.");
    const d = { ...home, price_drop: 2000 };
    expect(priceHistoryHtml(d, "en")).toContain("at €40,000. The price was then lowered by €2,000 to €38,000.");
    expect(priceBefore(d)).toBe(40000);
    expect(priceBefore(home)).toBeNull();
    expect(priceHistoryHtml({ price_eur: 1000 }, "en")).toBe("");
  });
  it("places the score among all the homes", () => {
    const all = Array.from({ length: 100 }, (_x, i) => ({ nota: 70 + (i % 29) }));
    const t = scoreRankText({ nota: 98 }, all, "en");
    expect(t).toMatch(/^98: in the top \d+% of 100 homes on RealHunt$/);
    expect(scoreRankText({ nota: 70 }, all, "es")).toMatch(/^70: \d+ de las 100 casas de RealHunt tienen más nota$/);
    expect(scoreRankText({ nota: null }, all, "en")).toBe("");
  });
});

describe("links of a home page (ideas 12, 31, 32, 40, 15)", () => {
  it("fills the price into the country's calculator", () => {
    expect(calcLink(home, "spain", "en", true)).toEqual(["/tools/spain-non-resident-tax?price=38000", "Work out the yearly non-resident tax on this home"]);
    expect(calcLink({ price_eur: 90000 }, "portugal", "es", true)![0]).toBe("/es/tools/portugal-imt?p=90000");
    expect(calcLink({ price_eur: 90000 }, "italy", "en", true)![0]).toBe("/buying-costs/italy?p=90000");
    expect(calcLink({ price_eur: 90000 }, "italy", "en", false)).toBeNull();
  });
  it("finds homes of the same town, similar homes by its rule, and the neighbours by score", () => {
    const xs = [home, { ...home, slug: "b", nota: 80, price_eur: 40000 }, { ...home, slug: "c", nota: 90, location_name: "Other, Granada", price_eur: 30000 }, { ...home, slug: "d", price_eur: 90000, location_name: "Far, Granada" }, { ...home, slug: "e", price_eur: 45000, bedrooms: 2, location_name: "Y" }];
    expect(sameTown(home, xs).map((x) => x.slug)).toEqual(["b"]);
    const rule = bySimilarRule(home, xs);
    expect(rule.rows.map((x) => x.slug)).toEqual(["b", "e", "c"]);
    expect(rule.rows.every((x) => Math.abs(x.price_eur - 38000) <= 9500)).toBe(true);
    expect(siblings(home, xs)).toMatchObject({ prev: { slug: "e" }, next: { slug: "c" } });
  });
  it("opens an email about an error with the page already written", () => {
    const h = correctionHtml("es-x", "es");
    expect(h).toContain("mailto:carlos@equinoxinvestmentgroup.com?subject=");
    expect(h).toContain(encodeURIComponent("https://realhunt.co/es/deal/es-x"));
    expect(h).toContain('href="/es/corrections"');
  });
});

describe("description and title (ideas 3, 18, 44)", () => {
  it("does not say the place twice", () => {
    const d = "2-bedroom house with terrace in Alpujarra de la Sierra for €38,000. Alpujarra de la Sierra, Granada, Spain. Scored and ranked on RealHunt.";
    expect(placeOnce(d)).toBe("2-bedroom house with terrace in Alpujarra de la Sierra for €38,000. Granada, Spain. Scored and ranked on RealHunt.");
    expect(repeatsPlace(d, "Alpujarra de la Sierra, Granada")).toBe(true);
    expect(repeatsPlace(placeOnce(d), "Alpujarra de la Sierra, Granada")).toBe(false);
    expect(placeOnce("Casa en Rossell por 38.000 €. Castellón, España.")).toBe("Casa en Rossell por 38.000 €. Castellón, España.");
  });
  it("the app sets the same title as the prerendered page after seo/polish.ts, on every home", () => {
    for (const r of rows.slice(0, 400)) for (const lg of ["en", "es"] as const) {
      expect(dealDocTitle(r, lg)).toBe(pickTitle(dealTitle(r, lg) + " · RealHunt", lg, "deal"));
    }
  });
  it("says it in the title when the advert is gone or not confirmed", () => {
    expect(dealTitle({ ...home, sold_reports: 2, available_reports: 0 }, "en")).toMatch(/^Sold or withdrawn: /);
    expect(dealTitle({ ...home, src_last: "blocked", src_ok_at: null, publish_at: "2026-01-01T00:00:00Z" }, "es")).toMatch(/^Sin confirmar: /);
    expect(dealTitle(home, "en")).not.toMatch(/:/);
  });
  it("answers 'is it a good price' with the figure first (idea 22)", () => {
    const region = [{ sqm: 100, price_eur: 60000 }, { sqm: 100, price_eur: 50000 }, { sqm: 100, price_eur: 40000 }];
    expect(priceVerdict(home, { countryHomes: [], regionHomes: region, regionName: "Granada" }, "en")).toBe("In short: 49% below the median price per m² for Granada on RealHunt.");
    expect(priceVerdict(home, { countryHomes: [], regionHomes: region, regionName: "Granada" }, "es")).toBe("En resumen: un 49 % por debajo de la mediana del precio por m² de Granada en RealHunt.");
    expect(priceVerdict({ ...home, sqm: null }, { countryHomes: region, regionHomes: region, regionName: "Granada" }, "en")).toBe("");
  });
});

describe("build checks of the home pages (ideas 14, 16, 33)", () => {
  const page = (key: string, extra = "") => `<html><head><link rel="canonical" href="https://realhunt.co${key}" /><link rel="alternate" hreflang="en" href="https://realhunt.co${key.replace("/es", "")}" /><link rel="alternate" hreflang="es" href="https://realhunt.co/es${key.replace("/es", "")}" /><script type="application/ld+json">{"a":1}</script></head><body><div id="root"><h1>T</h1><div class="rh-sh-price">€1</div><img src="a.webp" alt="A home"><a href="/homes/spain?x=1">x</a><a href="https://other.example/">o</a>${extra}</div>\n<script></script></body></html>`;
  it("passes a complete page and names what is missing", () => {
    expect(pageProblems(page("/deal/a"), "/deal/a")).toEqual([]);
    expect(pageProblems(page("/es/deal/a"), "/es/deal/a")).toEqual([]);
    expect(pageProblems("<html></html>", "/deal/a")).toEqual(["no h1", "no price", "canonical is missing"]);
    expect(pageProblems(page("/deal/a").replace('{"a":1}', "{a:1}"), "/deal/a")).toContain("structured data that is not JSON");
    expect(pageProblems(page("/deal/a").replace('alt="A home"', 'alt=""'), "/deal/a")).toContain("no photo with alt text");
  });
  it("lists internal links and flags links to missing or noindex pages", () => {
    expect(internalLinks(page("/deal/a", '<a href="/guide/ireland#x">g</a>'))).toEqual(["/guide/ireland", "/homes/spain"]);
    const pages = new Map([["/deal/a", page("/deal/a", '<a href="/guide/ireland">g</a><a href="/deal/b">b</a>')], ["/deal/b", page("/deal/b")]]);
    const r = checkDeals(pages, (p) => (p === "/guide/ireland" ? "noindex" : "ok"));
    expect(r.problems).toEqual([]);
    expect(r.broken).toEqual(["/guide/ireland (noindex) x1"]);
  });
});

describe("against the region, distances and the region link (ideas 9, 20, 41)", () => {
  it("compares the home with at least 4 other homes of its region", () => {
    const reg = [home, ...[30000, 50000, 60000, 90000].map((p, i) => ({ slug: "r" + i, price_eur: p, sqm: 100, nota: 80 + i }))];
    expect(regionCompare(home, reg)).toEqual({ n: 5, price: 75, ppsqm: 100, score: 100 });
    expect(regionCompare(home, reg.slice(0, 3))).toBeNull();
    const h = regionCompareHtml(home, reg, "Granada", "es");
    expect(h).toContain("<h2>Esta casa frente a Granada</h2>");
    expect(h).toContain("<svg");
    expect(h).toContain("Más barata que el 75 % de las demás");
  });
  it("puts the sea and the airport in one line", () => {
    expect(distancesLine(home, "en")).toBe("<p data-rh-dist>Sea 26 km · Airport 60 km (GRX) in a straight line.</p>");
    expect(distancesLine({}, "es")).toBe("");
  });
  it("links the first mention of the region", () => {
    expect(linkFirst("House in Alpujarra, Granada, Spain. Granada again.", "Granada", "/homes/spain/granada")).toBe('House in Alpujarra, <a href="/homes/spain/granada">Granada</a>, Spain. Granada again.');
    expect(linkFirst("No region here", "Granada", "/x")).toBe("No region here");
  });
});
