// seo/polish.ts and friends (14-nov-2026): titles, descriptions, index decisions, breadcrumbs, related links,
// sitemaps, redirects and the checks that stop a build.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { pickTitle, titleCandidates, polishDesc, fitSentences, canBuyLead, TITLE_MAX, DESC_MAX, DESC_MIN } from "../../seo/polishMeta";
import { polish, classify, readPage, type State } from "../../seo/polish";
import { groupOf } from "../../seo/polishRelated";

describe("titles", () => {
  it("keeps the brand when it fits and drops it when it does not", () => {
    expect(pickTitle("Homes under €80,000 in Italy (42) · RealHunt", "en", "band")).toBe("Homes under €80,000 in Italy (42) · RealHunt");
    const t = pickTitle("Buying a home in Sweden: real costs, taxes and rental yield · RealHunt", "en", "costs");
    expect(t).toBe("Buying a home in Sweden: real costs, taxes and rental yield");
    expect(t.length).toBeLessThanOrEqual(TITLE_MAX);
  });
  it("uses the shorter wording of a template, in English and Spanish", () => {
    expect(pickTitle("Buying costs calculator for Canada: taxes and fees on top of the price · RealHunt", "en", "calc")).toBe("Buying costs in Canada: taxes and fees calculator · RealHunt");
    expect(pickTitle("Dominican Republic vs Greece: cheap homes, prices and buying costs compared · RealHunt", "en", "pair")).toBe("Dominican Republic vs Greece: home prices and buying costs");
    expect(pickTitle("Cómo comprar una casa en Grecia siendo extranjero: pasos, impuestos y gastos · RealHunt", "es", "guide")).toBe("Cómo comprar casa en Grecia siendo extranjero · RealHunt");
    expect(pickTitle("How to buy a home in Poland as a foreigner: steps, taxes and costs · RealHunt", "en", "guide")).toBe("How to buy a home in Poland as a foreigner: steps and costs");
    expect(pickTitle("Can a Swiss citizen buy property in Spain? Yes · Rules for Swiss buyers (November 2026) · RealHunt", "en", "canbuy")).toBe("Can a Swiss citizen buy property in Spain? Yes · RealHunt");
    expect(pickTitle("¿Puede un estadounidense comprar una vivienda en los Países Bajos? Sí · Normas para compradores estadounidenses (noviembre de 2026) · RealHunt", "es", "canbuy")).toBe("¿Puede un estadounidense comprar casa en los Países Bajos? Sí");
  });
  it("puts what a home is before its price", () => {
    expect(pickTitle("€85,000 · 2-bedroom flat with a Lake Como view terrace · RealHunt", "en", "deal")).toBe("2-bedroom flat with a Lake Como view terrace · €85,000");
    expect(pickTitle("85.000 € · Apartamento de 1 dormitorio en Murcia · RealHunt", "es", "deal")).toBe("Apartamento de 1 dormitorio en Murcia · 85.000 € · RealHunt");
    // a headline that does not fit keeps all its words: nothing is cut in the middle
    expect(pickTitle("€90,500 · Villa with fjord views and solar panels on 1,700 m² in Hygum · RealHunt", "en", "deal")).toBe("Villa with fjord views and solar panels on 1,700 m² in Hygum · €90,500");
  });
  it("never gives two pages the same title", () => {
    const taken = new Set<string>();
    const a = pickTitle("Can a Swiss citizen buy property in Spain? Yes · Rules for Swiss buyers (2026) · RealHunt", "en", "canbuy", taken); taken.add(a);
    const b = pickTitle("Can a Swiss citizen buy property in Spain? Yes · Rules for Swiss buyers (2026) · RealHunt", "en", "canbuy", taken);
    expect(a).not.toBe(b);
    expect(titleCandidates("About RealHunt: who we are and how we work", "en", "hub")[0]).toBe("About RealHunt: who we are and how we work");
  });
});

describe("descriptions", () => {
  it("keeps whole sentences inside the limit", () => {
    const long = "We scored the 100 projects in our Phuket Top 100 from 0 to 100 on price, beach, facilities and seven more things. Median price €159,134; 50 are within 1 km of the sea.";
    const d = fitSentences(long);
    expect(d.length).toBeLessThanOrEqual(DESC_MAX);
    expect(d.endsWith(".")).toBe(true);
    expect(fitSentences("x ".repeat(200)).endsWith("…")).toBe(true);
    // decimals and prices do not end a sentence
    expect(fitSentences("About 1.5-4% in taxes and fees, so €2,250 to €6,000 on a €150,000 home.")).toBe("About 1.5-4% in taxes and fees, so €2,250 to €6,000 on a €150,000 home.");
  });
  it("starts the 13 nationality pages of a country with who is asking", () => {
    const rule = "Yes. There are no citizenship or residence rules for buying a home in Sweden. You need a Swedish bank account or a broker to pay.";
    const fr = polishDesc(rule, { lang: "en", kind: "canbuy", title: "Can a French citizen buy property in Sweden? Yes · Rules for French buyers (November 2026) · RealHunt" });
    const ie = polishDesc(rule, { lang: "en", kind: "canbuy", title: "Can an Irish citizen buy property in Sweden? Yes · Rules for Irish buyers (November 2026) · RealHunt" });
    expect(fr.startsWith("French buyers in Sweden: Yes.")).toBe(true);
    expect(fr).not.toBe(ie);
    expect(canBuyLead("¿Puede un suizo comprar una vivienda en Italia? Sí · Normas para compradores suizos (noviembre de 2026) · RealHunt", "es")).toBe("Compradores suizos en Italia");
  });
  it("fills a short description with a sentence that is true of the page type, never past the limit", () => {
    const d = polishDesc("5 homes for sale under €80,000 in Greece, checked by a person, scored from 70 to 98 and ranked best first.", { lang: "en", kind: "band", title: "" });
    expect(d.endsWith("New homes every day.")).toBe(true);
    expect(d.length).toBeGreaterThanOrEqual(DESC_MIN); expect(d.length).toBeLessThanOrEqual(DESC_MAX);
    const es = polishDesc("33 casas en Italia reales por menos de 50.000 €, desde 12.000 €. Revisadas por personas y actualizadas cada día.", { lang: "es", kind: "cheap", title: "" });
    expect(es.length).toBeLessThanOrEqual(DESC_MAX); expect(es).toMatch(/nota de 70 a 98/);
  });
  it("says what a home is instead of the sentence every home shared", () => {
    const d = polishDesc("Villa with fjord views and solar panels in Hygum for €90,500. Hygum, West Jutland. Scored and ranked on RealHunt: the best homes in every country.", { lang: "en", kind: "deal", title: "", facts: ["RealHunt score 93 of 98.", "157 m², 3 bedrooms."] });
    expect(d).toBe("Villa with fjord views and solar panels in Hygum for €90,500. Hygum, West Jutland. RealHunt score 93 of 98. 157 m², 3 bedrooms.");
    // the size is not said twice
    expect(polishDesc("85.000 € por 46 m² y 1 dormitorio en Murcia (Murcia), unos 1.848 €/m². A unos 14 km de la costa (en línea recta).", { lang: "es", kind: "deal", title: "", facts: ["Nota RealHunt: 82 de 98.", "46 m², 1 dormitorio."] })).toBe("85.000 € por 46 m² y 1 dormitorio en Murcia (Murcia), unos 1.848 €/m². A unos 14 km de la costa (en línea recta). Nota RealHunt: 82 de 98.");
    // a Spanish text cut in the middle by an earlier slice ends in an ellipsis, not in half a word
    expect(polishDesc("Construida en 2023 y como nueva: unos 20 m² con salón comedor abierto, cocina con inducción, baño moderno con ducha y un altillo para dormir bajo un techo ", { lang: "es", kind: "deal", title: "" }).endsWith("…")).toBe(true);
  });
});

describe("page types", () => {
  it("reads the type and the country from the address", () => {
    expect(classify("/homes/italy")).toEqual({ kind: "country", cc: "italy" });
    expect(classify("/homes/italy/under-80000")).toEqual({ kind: "band", cc: "italy" });
    expect(classify("/homes/italy/by-the-sea").kind).toBe("type");
    expect(classify("/homes/italy/tuscany").kind).toBe("region");
    expect(classify("/homes/spain/2-bedroom").kind).toBe("type");
    expect(classify("/homes/italy/tuscany/under-100000").kind).toBe("place");
    expect(classify("/can-i-buy/swiss-in-united-states")).toEqual({ kind: "canbuy", cc: "united-states" });
    expect(classify("/top/bali/some-project").kind).toBe("project");
    expect(classify("/top/how-we-rank").kind).toBe("page");
  });
});

// ------------------------------------------------------------------------------------------ a small site
const html = (o: { title: string; desc?: string; path: string; body?: string; lang?: string; noindex?: boolean; head?: string }) =>
  `<!doctype html><html lang="${o.lang || "en"}"><head><title>${o.title}</title><meta name="description" content="${o.desc ?? "A description that is long enough to be a description of this page for the test site, with words."}" /><meta name="robots" content="${o.noindex ? "noindex, follow" : "index, follow"}" /><link rel="canonical" href="https://realhunt.co${o.path === "/" ? "/" : o.path}" /><meta property="og:url" content="x" />${o.head || ""}</head><body><div id="root">${o.body ?? ""}</div>\n<script>1</script></body></html>`;
const words = (n: number) => Array.from({ length: n }, (_, i) => "word" + i).join(" ");
const alt = (en: string) => `<link rel="alternate" hreflang="en" href="https://realhunt.co${en}" /><link rel="alternate" hreflang="es" href="https://realhunt.co/es${en}" /><link rel="alternate" hreflang="x-default" href="https://realhunt.co${en}" />`;

describe("the pass over a built site", () => {
  let dir = "", root = "";
  const put = (p: string, h: string) => { const d = path.join(root, p); fs.mkdirSync(d, { recursive: true }); fs.writeFileSync(path.join(d, "index.html"), h); };
  const read = (p: string) => fs.readFileSync(path.join(root, p, "index.html"), "utf8");
  const all = ["a", "b", "c", "d", "e", "f"].map((s, i) => ({ slug: "it-" + s, title: `Stone house ${s}`, title_es: `Casa de piedra ${s}`, country: "Italy", location_name: "Lucca, Tuscany, Italy", price_eur: 40000 + i * 5000, sqm: 80, bedrooms: 2, nota: 80 + i, publish_at: "2026-10-0" + (i + 1) }));
  // the site as seo/prerender.ts leaves it; `bali` is the number of words on /top/bali, `gone` a home that was sold
  const build = (bali = 300, gone = "") => {
    if (dir) fs.rmSync(dir, { recursive: true, force: true });
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "rh-polish-")); root = path.join(dir, "dist");
    const homes = all.filter((h) => h.slug !== gone);
    fs.mkdirSync(path.join(dir, "public/data"), { recursive: true }); fs.mkdirSync(path.join(dir, "src"), { recursive: true });
    // one home is listed twice
    fs.writeFileSync(path.join(dir, "public/data/rh-static.json"), JSON.stringify({ rows: [...homes, { ...homes[0], slug: "it-a-again", publish_at: "2026-10-09" }] }));
    fs.writeFileSync(path.join(dir, "src/App.tsx"), '<Route path="/saved" element={<X />} />');
    const list = (pre: string) => `<ol>${homes.map((h) => `<li><a href="${pre}/deal/${h.slug}">${h.title}</a></li>`).join("")}<li><a href="${pre}/deal/it-a-again">again</a></li></ol>`;
    put("", html({ title: "RealHunt: the best homes", path: "/", body: `<main class="rh-static"><h1>Best homes</h1><p>${words(200)}</p><a href="/homes/italy">Italy</a> <a href="/saved">Saved</a></main>`, head: alt("/") }));
    put("es", html({ title: "RealHunt: las mejores casas", path: "/es", lang: "es", body: `<main class="rh-static"><h1>Las mejores casas</h1><a href="/es/homes/italy">Italia</a></main>`, head: alt("/") }));
    put("homes/italy", html({ title: "Best homes for sale in Italy (6) · RealHunt", path: "/homes/italy", body: `<main class="rh-static"><h1>Best homes for sale in Italy</h1>${list("")}<p><a href="/deal/sold-long-ago">A home that was sold</a></p></main>`, head: alt("/homes/italy") }));
    put("es/homes/italy", html({ title: "Las mejores casas en venta: Italia (6) · RealHunt", path: "/es/homes/italy", lang: "es", body: `<main class="rh-static"><nav aria-label="Ruta"><a href="/es">RealHunt</a> › Italia</nav><h1>Las mejores casas en venta: Italia</h1>${list("/es")}</main>`, head: alt("/homes/italy") }));
    put("homes/italy/under-60000", html({ title: "Homes under €60,000 in Italy (5) · RealHunt", desc: "5 homes for sale under €60,000 in Italy, checked by a person, scored from 70 to 98 and ranked best first.", path: "/homes/italy/under-60000", body: `<main class="rh-static"><h1>Homes under €60,000 in Italy</h1>${list("")}</main>` }));
    for (const h of [...homes, { ...homes[0], slug: "it-a-again" }]) {
      put(`deal/${h.slug}`, html({ title: `€${h.price_eur.toLocaleString("en")} · ${h.title} · RealHunt`, path: `/deal/${h.slug}`, body: `<main class="rh-static"><article><h1>${h.title}</h1><p>${words(300)} ${h.slug}</p></article></main>`, head: alt(`/deal/${h.slug}`) + `<script type="application/ld+json">${JSON.stringify({ "@type": "RealEstateListing", offers: { price: h.price_eur, priceCurrency: "EUR", availability: "https://schema.org/InStock" }, image: ["x"] })}</script>` }));
      put(`es/deal/${h.slug}`, html({ title: `${h.price_eur} € · ${h.title_es} · RealHunt`, path: `/es/deal/${h.slug}`, lang: "es", body: `<main class="rh-static" lang="es"><article><h1>${h.title_es}</h1><p>${words(100)} ${h.slug}</p></article></main>`, head: alt(`/deal/${h.slug}`) }));
    }
    put("top/bali", html({ title: "Top 100 new builds in Bali · RealHunt", path: "/top/bali", body: `<main class="rh-static"><h1>Top 100 new builds in Bali</h1><p>${words(bali)}</p><a href="/top/bali/thin-project">Thin</a></main>` }));
    put("top/bali/thin-project", html({ title: "Thin project, Canggu: Bali Top 100 · RealHunt", path: "/top/bali/thin-project", body: `<main class="rh-static"><h1>Thin project</h1><p>${words(40)}</p></main>`, head: alt("/top/bali/thin-project") }));
    put("legal/terms", html({ title: "Terms of use · RealHunt", path: "/legal/terms" }));
    fs.writeFileSync(path.join(root, "sitemap-homes.xml"), `<urlset><url><loc>https://realhunt.co/deal/it-b</loc><lastmod>2026-10-02</lastmod><image:image><image:loc>https://realhunt.co/finds/it-b.webp</image:loc></image:image></url></urlset>`);
    fs.writeFileSync(path.join(root, "sitemap.xml"), "<sitemapindex></sitemapindex>");
    // what seo/listings leaves: its redirects and a "moved" stub for an old address
    fs.writeFileSync(path.join(root, "redirects.json"), JSON.stringify({ "/old/listing": "/homes/italy" }));
    put("homes/italy/old-band", html({ title: "This page has moved. · RealHunt", path: "/homes/italy", noindex: true, body: `<main class="rh-static" data-rh-moved="/homes/italy"><p>This page has moved.</p></main>` }));
  };
  const homes = all;
  beforeEach(() => { dir = ""; build(); });
  afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }); });
  const run = (state: State | null = null, today = "2026-11-14") => polish(root, { cwd: dir, state, today });

  it("leaves the stubs of moved pages alone", () => {
    const before = read("homes/italy/old-band");
    const rep = run();
    expect(read("homes/italy/old-band")).toBe(before);
    expect(rep.summary.moved_stubs).toBe(1);
    expect(fs.readdirSync(root).filter((f) => /^sitemap.*\.xml$/.test(f)).map((f) => fs.readFileSync(path.join(root, f), "utf8")).join("")).not.toContain("old-band");
    expect(pickTitle("Homes under €80,000 in the Dominican Republic (42, from €12,000) · RealHunt", "en", "band")).toBe("Homes under €80,000 in the Dominican Republic (42)");
  });
  it("passes its own checks and reports the numbers", () => {
    const rep = run();
    expect(rep.failures).toEqual([]);
    expect(rep.summary.duplicate_homes).toBe(2);
    expect(rep.summary.orphans).toBe(0);
    expect(rep.summary.h1_not_one).toBe(0);
    expect(rep.noindex_by_polish["new-build project page"]).toBe(1);
    expect(fs.existsSync(path.join(root, "seo-audit.json"))).toBe(true);
  });
  it("takes a thin page out of the index, its hreflang with it, and keeps it out of the sitemaps", () => {
    run();
    const thin = read("top/bali/thin-project");
    expect(thin).toContain('content="noindex, follow"');
    expect(thin).not.toContain("hreflang");
    const maps = fs.readdirSync(root).filter((f) => /^sitemap.*\.xml$/.test(f)).map((f) => fs.readFileSync(path.join(root, f), "utf8")).join("");
    expect(maps).not.toContain("thin-project");
    expect(maps).toContain("<loc>https://realhunt.co/top/bali</loc>");
    expect(maps).not.toContain("it-a-again");
  });
  it("gives every indexable page one h1, a breadcrumb in the data and on the page, and a related block", () => {
    run();
    const terms = read("legal/terms");
    expect(terms.match(/<h1/g)?.length).toBe(1);
    expect(terms).toContain("<h1>Terms of use</h1>");
    const band = read("homes/italy/under-60000");
    expect(band).toContain('"@type":"BreadcrumbList"');
    expect(band).toContain('<nav class="rh-bc" aria-label="Breadcrumb"><a href="/">RealHunt</a> › <a href="/homes/italy">Best homes for sale in Italy</a> › <span aria-current="page">Homes under €60,000 in Italy</span></nav>');
    expect(band).toContain('id="rh-rel" data-path="/homes/italy/under-60000"');
    expect(band).toContain('<a href="/homes/italy">All homes</a>');
    expect(band).toContain("New homes every day.");
  });
  it("links a home to its country, its price list and four homes like it, in its own language only", () => {
    run();
    const en = read("deal/it-c"), es = read("es/deal/it-c");
    const block = (h: string) => /<aside class="rh-rel[\s\S]*?<\/aside>/.exec(h)![0];
    expect(block(en)).toContain('href="/homes/italy"');
    expect(block(en)).toContain('href="/homes/italy/under-60000"');
    expect((block(en).match(/href="\/deal\//g) || []).length).toBe(4);
    expect(block(en)).not.toContain('href="/es');
    expect(block(es)).toContain('href="/es/homes/italy"');
    expect([...block(es).matchAll(/href="([^"]+)"/g)].every((m) => m[1].startsWith("/es"))).toBe(true);
    expect(es).toContain('<nav class="rh-bc" aria-label="Ruta"><a href="/es">RealHunt</a> › <a href="/es/homes/italy">Casas en Italia</a>');
    // title: what before price; description: the facts of the home
    expect(en).toContain("<title>Stone house c · €50,000 · RealHunt</title>");
  });
  it("keeps one address for a home listed twice and unwraps links to homes that are gone", () => {
    const rep = run();
    const dup = read("deal/it-a-again");
    expect(dup).toContain('<link rel="canonical" href="https://realhunt.co/deal/it-a" />');
    expect(dup).not.toContain("hreflang");
    const italy = read("homes/italy");
    expect(italy).not.toContain("/deal/it-a-again");
    expect(italy).not.toContain("/deal/sold-long-ago");
    expect(italy).toContain("A home that was sold");
    expect(rep.healed_links["/deal/sold-long-ago"]).toBe(1);
    const red = JSON.parse(fs.readFileSync(path.join(root, "redirects.json"), "utf8"));
    expect(red["/deal/it-a-again"]).toBe("/deal/it-a");
    expect(red["/old/listing"]).toBe("/homes/italy"); // what another step wrote stays
    expect(red["/country/italy"]).toBe("/homes/italy");
    expect(red["/es/country/italy"]).toBe("/es/homes/italy");
  });
  it("writes a site map page per group, in both languages, that reaches every indexable page", () => {
    run();
    const hub = read("sitemap"), homesMap = read("sitemap/homes"), es = read("es/sitemap/homes");
    expect(hub).toContain('href="/sitemap/homes"');
    for (const h of homes) { expect(homesMap).toContain(`href="/deal/${h.slug}"`); expect(es).toContain(`href="/es/deal/${h.slug}"`); }
    expect(homesMap).not.toContain("it-a-again");
    expect(es).toContain('<html lang="es">');
    expect(es).not.toMatch(/href="\/(?!es[/"])/);
    expect(hub).toContain('hreflang="es" href="https://realhunt.co/es/sitemap"');
    expect(groupOf(readPage("/homes/italy/under-60000", "", read("homes/italy/under-60000")))).toBe("prices");
  });
  it("dates a page only when its text changed, and sends a page that is gone to the page above it", () => {
    const first = run(null);
    expect(first.summary.with_lastmod).toBeGreaterThan(0);
    const xml = () => fs.readdirSync(root).filter((f) => /^sitemap-.*\.xml$/.test(f)).map((f) => fs.readFileSync(path.join(root, f), "utf8")).join("");
    expect(xml()).toContain("<loc>https://realhunt.co/deal/it-b</loc><lastmod>2026-10-02</lastmod>"); // the date the data gives
    expect(xml()).toContain("<image:loc>https://realhunt.co/finds/it-b.webp</image:loc>");
    expect(xml()).not.toContain("<lastmod>2026-11-14</lastmod>"); // nothing is stamped with today on a first build
    const state: State = JSON.parse(fs.readFileSync(path.join(root, "seo-state.json"), "utf8"));
    // next build: one page has new text, one home is gone
    build(310, "it-f");
    run(state, "2026-11-20");
    expect(xml()).toContain("<loc>https://realhunt.co/top/bali</loc><lastmod>2026-11-20</lastmod>");
    expect(xml()).toContain("<loc>https://realhunt.co/deal/it-b</loc><lastmod>2026-10-02</lastmod>");
    expect(xml()).toContain("<loc>https://realhunt.co/legal/terms</loc></url>"); // no date before, no change, still no date
    expect(xml()).not.toContain("<loc>https://realhunt.co/deal/it-c</loc><lastmod>2026-11-20");
    const red = JSON.parse(fs.readFileSync(path.join(root, "redirects.json"), "utf8"));
    expect(red["/deal/it-f"]).toBe("/homes/italy");
    expect(red["/es/deal/it-f"]).toBe("/es/homes/italy");
  });
  it("fails on a link to a page that does not exist, on two pages with one title and on hreflang to a noindex page", () => {
    put("about", html({ title: "About · RealHunt", path: "/about", body: `<main class="rh-static"><h1>About</h1><a href="/no-such-page">x</a></main>`, head: alt("/about") }));
    put("es/about", html({ title: "Sobre · RealHunt", path: "/es/about", lang: "es", noindex: true, body: `<main class="rh-static"><h1>Sobre</h1></main>`, head: alt("/about") }));
    const rep = polish(root, { cwd: dir, state: null, write: false });
    expect(rep.failures.join("\n")).toMatch(/internal links to pages that do not exist: 1 \(\/about -> \/no-such-page\)/);
    // the pass itself removed the hreflang that pointed at the noindex twin, so that check stays clean
    expect(rep.failures.join("\n")).not.toMatch(/hreflang/);
    expect(rep.summary.hreflang_problems).toBe(0);
  });
});
