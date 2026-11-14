// seo/reach: the directory of portals, the country files, the feeds, llms.txt per language and the measurement helpers.
import { describe, it, expect } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { makePdf, pdfPages, winAnsi, wrap } from "../../seo/reach/pdf";
import { portalDirectory, portalCount, portalNameEs, countryEs } from "../../seo/reach/portals";
import { countryFacts, keyFacts, openApi, sentences, writeDataFiles, type Row } from "../../seo/reach/data";
import { atomFeed, jsonFeed, newest, newsSitemap, recentPosts, videoLd, videoSitemap, withVideo } from "../../seo/reach/feeds";
import { addDates, finishRobots, mergeReleases, readSitemaps, writeLlms } from "../../seo/reach";
import { chartSvg, REACH_PAGES } from "../../seo/reach/pages";
import { kit } from "../../seo/assetsKit";
import { englishLeft } from "../../seo/es";
import { isAssetPath } from "../community/assetRoutes";
import { classifySource, emptySearchKind, familyOf, langOf, VALUE_EVENTS } from "../measure/core";

const home = (i: number, country: string, price: number, extra: Partial<Row> = {}): Row => ({ slug: `h${i}`, title: `Home ${i}`, title_es: `Casa ${i}`, country, location_name: `Town ${i}, Granada`, price_eur: price, sqm: 60 + i, bedrooms: 2, nota: 80 + (i % 10), source_domain: "fotocasa.es", approved_at: `2026-11-${String(1 + (i % 9)).padStart(2, "0")}T10:00:00Z`, lat: 37 + i / 100, lng: -3, why_great: "A good home.", why_great_es: "Una buena casa.", ...extra });
const rows: Row[] = [...Array.from({ length: 12 }, (_, i) => home(i, "Spain", 30000 + i * 5000)), ...Array.from({ length: 4 }, (_, i) => home(50 + i, "Dominican Republic", 90000 + i * 1000)), home(99, "Norway", 50000)];
const dest = { spain: { purchase_costs_pct: "7.5-14", as_of: "2026", can_foreigners_buy: "Yes.", annual_property_tax: "IBI 0.4-1.1%.", sources: ["https://example.org/a", "not a link"] } };
const guides = { spain: { name: "Spain", steps: [["Get an NIE", "Your number."]], yearly: "IBI." } };
const facts = countryFacts(rows, dest, guides, (p) => p !== "/homes/norway");

describe("portal directory", () => {
  const dir = portalDirectory();
  it("publishes name, country and link only, never our own test results", () => {
    expect(dir.length).toBeGreaterThan(40);
    expect(portalCount(dir)).toBeGreaterThan(150);
    for (const c of dir) for (const p of c.portals) { expect(Object.keys(p).sort()).toEqual(["domain", "name", "url"]); expect(p.url).toMatch(/^https:\/\/[a-z0-9.-]+\/$/); expect(p.url).toContain(p.domain); }
    expect(JSON.stringify(dir)).not.toMatch(/"read"|"probe"|blocked/);
  });
  it("has a Spanish name for every country and never shows English words as Spanish", () => {
    for (const c of dir) { expect(englishLeft(`Casas en ${countryEs(c.country)}`).english, c.country).toBe(0); for (const p of c.portals) expect(englishLeft(portalNameEs(p)).english, p.name).toBe(0); }
  });
});

describe("country facts", () => {
  it("keeps countries with 3 or more homes that have a page, most homes first", () => {
    expect(facts.map((f) => f.k)).toEqual(["spain", "dominican-republic"]);
    expect(facts[0].costs).toEqual([7.5, 14]); expect(facts[0].sources).toEqual(["https://example.org/a"]); expect(facts[1].costs).toBeNull();
  });
  it("writes dated sentences that stand on their own, in both languages", () => {
    const en = sentences(kit("en"), facts[0], "2026-11-15"), es = sentences(kit("es"), facts[1], "2026-11-15");
    expect(en[0]).toBe("On 15 November 2026, RealHunt lists 12 homes for sale in Spain, each one checked by a person.");
    expect(en[1]).toContain("In Spain, the median asking price of those 12 homes is €");
    expect(en[2]).toContain("7.5–14%"); expect(en.join(" ")).not.toContain("\u2014");
    expect(es[0]).toContain("en la República Dominicana"); expect(es.join(" ")).toContain("muestra es pequeña");
    expect(englishLeft(es.join(" ")).english).toBe(0);
  });
  it("lists only the facts the data has", () => {
    const labels = keyFacts(kit("en"), facts[1], "2026-11-15").map(([a]) => a);
    expect(labels).not.toContain("Taxes and fees to buy"); expect(labels).toContain("Median asking price");
  });
  it("writes the country files, the map files and a valid OpenAPI description", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "reach-"));
    const n = writeDataFiles(root, { en: facts, es: facts }, rows, "2026-11-15");
    expect(n).toBe(facts.length * 5 + 4);
    const j = JSON.parse(fs.readFileSync(path.join(root, "data/countries/spain.json"), "utf8"));
    expect(j.homes).toHaveLength(12); expect(j.summary.homes).toBe(12); expect(j.license).toContain("creativecommons.org/licenses/by/4.0");
    expect(Object.keys(j.homes[0])).not.toContain("image_urls"); expect(JSON.stringify(j)).not.toContain("source_url");
    expect(fs.readFileSync(path.join(root, "data/countries/spain.es.md"), "utf8")).toContain("### Casa ");
    const pdf = fs.readFileSync(path.join(root, "data/countries/spain.pdf"));
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-"); expect(pdfPages(pdf)).toBe(1);
    const kml = fs.readFileSync(path.join(root, "data/realhunt-best-homes.kml"), "utf8");
    expect(kml.match(/<Placemark>/g)!.length).toBe(10 + 4); expect(kml).toContain("<Folder><name>Spain</name>");
    const api = openApi(facts, "2026-11-15");
    expect(api.openapi).toBe("3.1.0"); expect(api.paths["/data/countries/{country}.json"].get.parameters[0].schema.enum).toEqual(["spain", "dominican-republic"]);
    for (const p of Object.values(api.paths) as any[]) expect(p.get.operationId).toMatch(/^[a-zA-Z]+$/);
    fs.rmSync(root, { recursive: true });
  });
});

describe("pdf", () => {
  it("encodes the euro sign and accents, and never drops a letter", () => {
    expect(winAnsi("€ñ")).toEqual([0x80, 0xf1]); expect(winAnsi("Łódź")).toEqual([..."L"].map((c) => c.charCodeAt(0)).concat([0xf3, 0x64, 0x7a]));
  });
  it("wraps long text and long words inside the width", () => {
    const lines = wrap("word ".repeat(60) + "https://example.org/" + "a".repeat(200), 10, 300);
    expect(lines.length).toBeGreaterThan(5); for (const l of lines) expect(l.length).toBeLessThan(80);
  });
  it("starts a new page when one is full and keeps the cross-reference table right", () => {
    const pdf = makePdf(Array.from({ length: 60 }, (_, i) => ({ text: `Line ${i}` })), { title: "T (x)" });
    expect(pdfPages(pdf)).toBe(2);
    const s = pdf.toString("latin1"), at = Number(/startxref\n(\d+)/.exec(s)![1]);
    expect(s.slice(at, at + 4)).toBe("xref");
    const first = Number(/\n(\d{10}) 00000 n/.exec(s)![1]); expect(s.slice(first, first + 7)).toBe("1 0 obj");
  });
});

describe("feeds and special sitemaps", () => {
  const item = { url: "https://realhunt.co/deal/a", title: "€10 · A & B", text: "x < y", date: "2026-11-14T10:00:00.000Z" };
  it("writes well-formed Atom and JSON Feed", () => {
    const a = atomFeed({ title: "T", sub: "S", self: "https://realhunt.co/feed.atom", page: "https://realhunt.co/new", lang: "en", items: [item] });
    expect(a).toContain("<title>€10 · A &amp; B</title>"); expect(a).toContain("<updated>2026-11-14T10:00:00.000Z</updated>");
    expect(new DOMParser().parseFromString(a, "application/xml").querySelector("parsererror")).toBeNull();
    const j = JSON.parse(jsonFeed({ title: "T", sub: "S", self: "s", page: "p", lang: "en", items: [item] }));
    expect(j.version).toBe("https://jsonfeed.org/version/1.1"); expect(j.items[0].id).toBe(item.url);
  });
  it("orders the newest homes and keeps only posts of the last two days for the news sitemap", () => {
    expect(newest(rows, 3).map((r) => r.slug)).toEqual(["h8", "h53", "h7"]);
    const posts = [{ slug: "a", title: "A", desc: "", date: "2026-11-14" }, { slug: "b", title: "B", desc: "", date: "2026-11-10" }, { slug: "Bad Slug", title: "C", desc: "", date: "2026-11-15" }, { slug: "d", title: "D", desc: "", date: "2026-11-20" }];
    expect(recentPosts(posts, "2026-11-15").map((p) => p.slug)).toEqual(["a"]);
    const xml = newsSitemap([{ url: "https://realhunt.co/blog/a", title: "A & B", date: "2026-11-14", lang: "en" }]);
    expect(xml).toContain("<news:title>A &amp; B</news:title>"); expect(newsSitemap([])).toContain("</urlset>");
  });
  it("describes a video only for a home that has one", () => {
    expect(withVideo(rows)).toHaveLength(0);
    const v = home(7, "Spain", 1, { video_url: "https://cdn.example/v.mp4", image_urls: ["/i.webp"] });
    expect(withVideo([v, home(8, "Spain", 1, { video_url: "javascript:alert(1)" })])).toHaveLength(1);
    expect(videoLd(v)).toMatchObject({ "@type": "VideoObject", contentUrl: "https://cdn.example/v.mp4", thumbnailUrl: ["https://realhunt.co/i.webp"] });
    expect(videoSitemap([v])).toContain("<video:content_loc>https://cdn.example/v.mp4</video:content_loc>");
  });
});

describe("after the index decisions", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "reach2-"));
  const urls = ["/es", "/es/method", "/es/new", "/es/research", "/es/costs", "/es/guide", "/es/homes/spain", "/research/open-data"];
  fs.writeFileSync(path.join(root, "sitemap-main.xml"), `<urlset>${urls.map((u, i) => `<url><loc>https://realhunt.co${u}</loc>${i ? "<lastmod>2026-11-10</lastmod>" : ""}</url>`).join("\n")}</urlset>`);
  fs.writeFileSync(path.join(root, "llms.txt"), "# RealHunt\n\n## Countries\n\n- x\n");
  fs.writeFileSync(path.join(root, "robots.txt"), "User-agent: *\nAllow: /\n\nSitemap: https://realhunt.co/sitemap.xml\n");
  fs.writeFileSync(path.join(root, "sitemap-news.xml"), "<urlset/>");
  const idx = readSitemaps(root);
  it("reads the indexable pages and their dates from the sitemaps, not from the news sitemap", () => {
    expect(idx.size).toBe(urls.length); expect(idx.get("https://realhunt.co/es")).toBeNull(); expect(idx.get("https://realhunt.co/es/method")).toBe("2026-11-10");
  });
  it("adds the files for machines to llms.txt once and writes the Spanish index from pages that exist", () => {
    expect(writeLlms(root, idx, rows, "2026-11-15")).toEqual({ en: true, es: 6 });
    expect(writeLlms(root, idx, rows, "2026-11-15").en).toBe(false);
    const en = fs.readFileSync(path.join(root, "llms.txt"), "utf8"), es = fs.readFileSync(path.join(root, "es/llms.txt"), "utf8");
    expect(en.indexOf("## Files for machines")).toBeLessThan(en.indexOf("## Countries")); expect(en).toContain("https://realhunt.co/research/open-data"); expect(en).not.toContain("research/find-homes");
    expect(es).toContain("[Cómo funciona la nota](https://realhunt.co/es/method)"); expect(es).not.toContain("/es/tools"); expect(es).toContain("(https://realhunt.co/es/homes/spain): 12 casas");
    expect(englishLeft(es.replace(/https?:\S+/g, "")).english).toBe(0);
  });
  it("declares the extra sitemaps in robots.txt once", () => {
    expect(finishRobots(root)).toBe(1); expect(finishRobots(root)).toBe(0);
    expect(fs.readFileSync(path.join(root, "robots.txt"), "utf8").trim().split("\n").pop()).toBe("Sitemap: https://realhunt.co/sitemap-news.xml");
  });
  it("gives a page a machine-readable date only when it has a real one and none yet", () => {
    const h = "<html><head><title>x</title></head><body></body></html>";
    const out = addDates(h, "https://realhunt.co/costs/spain", "2026-11-10", "en");
    expect(JSON.parse(/<script type="application\/ld\+json">(.*?)<\/script>/.exec(out)![1])).toMatchObject({ "@type": "WebPage", dateModified: "2026-11-10", author: { name: "RealHunt" } });
    expect(addDates(out, "u", "2026-11-12", "en")).toBe(out); expect(addDates(h, "u", "", "en")).toBe(h);
  });
  it("keeps one line per published build", () => {
    const a = { date: "2026-11-14", built_at: "2026-11-14T10:00:00Z", commit: "aaaaaaa", homes: 1, indexable_pages: 2 };
    const now = { date: "2026-11-15", built_at: "2026-11-15T10:00:00Z", commit: "bbbbbbb", homes: 3, indexable_pages: 4 };
    expect(mergeReleases(now, [a, { ...a, commit: "local" }, { bad: 1 }], "not a list").map((r) => r.commit)).toEqual(["aaaaaaa", "bbbbbbb"]);
    expect(mergeReleases(now, [now, a])).toHaveLength(2);
  });
});

describe("pages", () => {
  it("live under /research, where the app shows static pages", () => { for (const s of REACH_PAGES) expect(isAssetPath(`/research/${s}`), s).toBe(true); });
  it("draws a chart that carries its title and source inside the image", () => {
    const svg = chartSvg("Median & price", "Euros", "Source: RealHunt", [{ label: "Spain", value: 10, text: "€10" }, { label: "Italy", value: 5, text: "€5" }]);
    expect(svg).toContain("Median &amp; price"); expect(svg).toContain("Source: RealHunt");
    expect(new DOMParser().parseFromString(svg, "image/svg+xml").querySelector("parsererror")).toBeNull();
  });
});

describe("measurement helpers", () => {
  it("groups pages into families, the same in both languages", () => {
    const cases: [string, string][] = [["/", "front"], ["/es", "front"], ["/deal/x", "home"], ["/es/deal/x", "home"], ["/homes/spain", "country"], ["/homes/spain/under-50000", "listing"], ["/homes", "listing"], ["/guide/spain", "guide"], ["/guide/questions/x", "knowledge"],
      ["/costs/spain", "costs"], ["/can-i-buy/us-in-spain", "can-i-buy"], ["/tools/x", "tools"], ["/buying-costs/spain?p=1", "tools"], ["/research/prices", "research"], ["/blog/x/", "blog"], ["/top/bali", "new-builds"], ["/method", "trust"], ["/me", "app"]];
    for (const [p, f] of cases) expect(familyOf(p), p).toBe(f);
    expect(langOf("/es/deal/x")).toBe("es"); expect(langOf("/essay")).toBe("en"); expect(langOf("/de/homes/spain")).toBe("de"); expect(familyOf("/ru/homes/bulgaria")).toBe("country"); expect(familyOf("/de")).toBe("front");
  });
  it("names where a visit came from without keeping the address", () => {
    expect(classifySource("https://chatgpt.com/c/123", "")).toEqual({ kind: "ai", source: "chatgpt" });
    expect(classifySource("", "?utm_source=chatgpt.com")).toEqual({ kind: "ai", source: "chatgpt" });
    expect(classifySource("https://www.perplexity.ai/search?q=secret", "")).toEqual({ kind: "ai", source: "perplexity" });
    expect(classifySource("https://gemini.google.com/app", "")).toEqual({ kind: "ai", source: "gemini" });
    expect(classifySource("https://www.google.es/", "")).toEqual({ kind: "search", source: "google" });
    expect(classifySource("https://www.bing.com/search?q=x", "")).toEqual({ kind: "search", source: "bing" });
    expect(classifySource("https://yandex.ru/", "")).toEqual({ kind: "search", source: "yandex" });
    expect(classifySource("https://duckduckgo.com/", "")).toEqual({ kind: "search", source: "duckduckgo" });
    expect(classifySource("https://t.co/abc", "")).toEqual({ kind: "social", source: "x" });
    expect(classifySource("https://realhunt.co/deal/x", "")).toEqual({ kind: "internal", source: "self" });
    expect(classifySource("https://some-blog.example/post?email=a@b.c", "")).toEqual({ kind: "other", source: "other" });
    expect(classifySource("", "")).toEqual({ kind: "direct", source: "none" });
    expect(classifySource("not a url", "?utm_source=newsletter")).toEqual({ kind: "direct", source: "utm" });
  });
  it("never passes on what was typed in a search, only the country it names", () => {
    expect(emptySearchKind("house in Croatia near the sea", ["croatia", "united states"])).toBe("country:croatia");
    expect(emptySearchKind("Estados Unidos", ["united states"])).toBe("other");
    expect(emptySearchKind("john@example.com 600123123", ["spain"])).toBe("other");
    expect(emptySearchKind(" ", ["spain"])).toBe("empty");
  });
  it("maps the app's own events to a short list of actions", () => { expect(VALUE_EVENTS.original_listing_opened).toBe("listing_click"); expect(VALUE_EVENTS.alert).toBe("alert_created"); expect(VALUE_EVENTS.web_vital).toBeUndefined(); });
});
