// Spanish URLs (/es/...): path handling in the app, and the build-time rules that decide which pages get a Spanish
// twin, what they link to and which alternate links they carry.
import { describe, it, expect } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { isEsPath, stripEs, withEs, withEsUrl, switchTarget, dropStaleAlternates } from "@/lib/esPath";
import { englishLeft, passes, translateHtml, translateLd, pageTranslator, placesEs, esUrl, hreflangTags, measureHtml, writeEsTwins, createEsPass, SITE, type PageRec } from "../../seo/es";
import { checkBudget, publishedFiles, MAX_PUBLISHED_FILES } from "../../seo/budget";

describe("Spanish URL prefix", () => {
  it("knows a Spanish URL from a page that only starts with the same letters", () => {
    expect(isEsPath("/es")).toBe(true);
    expect(isEsPath("/es/")).toBe(true);
    expect(isEsPath("/es/deal/x")).toBe(true);
    expect(isEsPath("/estonia")).toBe(false);
    expect(isEsPath("/")).toBe(false);
    expect(isEsPath("/homes/es")).toBe(false);
  });
  it("strips the prefix and nothing else", () => {
    expect(stripEs("/es")).toBe("/");
    expect(stripEs("/es/")).toBe("/");
    expect(stripEs("/es/homes/spain")).toBe("/homes/spain");
    expect(stripEs("/homes/spain")).toBe("/homes/spain");
    expect(stripEs("/essay")).toBe("/essay");
  });
  it("adds the prefix to app paths, keeping query and hash", () => {
    expect(withEs("/")).toBe("/es");
    expect(withEs("/deal/x")).toBe("/es/deal/x");
    expect(withEs("/?q=sea")).toBe("/es?q=sea");
    expect(withEs("/costs/spain#tax")).toBe("/es/costs/spain#tax");
    expect(withEs("/es/deal/x")).toBe("/es/deal/x"); // never twice
    expect(withEs("/es")).toBe("/es");
  });
  it("leaves files, service paths and other sites alone", () => {
    for (const p of ["/assets/a.js", "/data/rh-static.json", "/i18n/es-core.json", "/feed.xml", "/og-home.jpg", "/t/x.webp", "/__sb/realhunt/rest", "/cdn-cgi/trace", "//evil.example/x", "https://example.com/x", "#top", "mailto:a@b.co", ""]) expect(withEs(p)).toBe(p);
  });
  it("rewrites absolute URLs of this site only", () => {
    expect(withEsUrl("https://realhunt.co/deal/x")).toBe("https://realhunt.co/es/deal/x");
    expect(withEsUrl("https://realhunt.co/")).toBe("https://realhunt.co/es");
    expect(withEsUrl("https://realhunt.co/es/deal/x")).toBe("https://realhunt.co/es/deal/x");
    expect(withEsUrl("https://realhunt.company/x")).toBe("https://realhunt.company/x");
    expect(withEsUrl("https://other.site/deal/x")).toBe("https://other.site/deal/x");
  });
  it("language switch: from /es/x English goes to /x; elsewhere the old behaviour stays", () => {
    expect(switchTarget("https://realhunt.co/es/deal/x?lang=es&a=1#f", "en")).toBe("https://realhunt.co/deal/x?a=1#f");
    expect(switchTarget("https://realhunt.co/es", "en")).toBe("https://realhunt.co/");
    expect(switchTarget("https://realhunt.co/es/deal/x", "es")).toBeNull();
    expect(switchTarget("https://realhunt.co/deal/x", "es")).toBeNull();
    expect(switchTarget("https://realhunt.co/deal/x", "en")).toBeNull();
  });
});

describe("hreflang of the app shell", () => {
  const head = (en: string) => { document.head.querySelectorAll("link[hreflang]").forEach((e) => e.remove()); document.head.insertAdjacentHTML("beforeend", `<link rel="alternate" hreflang="en" href="https://realhunt.co${en}"><link rel="alternate" hreflang="es" href="https://realhunt.co/es${en === "/" ? "" : en}"><link rel="alternate" hreflang="x-default" href="https://realhunt.co${en}">`); };
  const count = () => document.head.querySelectorAll("link[hreflang]").length;
  it("keeps the alternates on the page they belong to and drops them anywhere else", () => {
    window.history.replaceState({}, "", "/homes/spain"); head("/homes/spain"); dropStaleAlternates(); expect(count()).toBe(3);
    window.history.replaceState({}, "", "/es/homes/spain"); head("/homes/spain"); dropStaleAlternates(); expect(count()).toBe(3);
    window.history.replaceState({}, "", "/es"); head("/"); dropStaleAlternates(); expect(count()).toBe(3);
    window.history.replaceState({}, "", "/saved"); head("/"); dropStaleAlternates(); expect(count()).toBe(0);      // shell = front page HTML
    window.history.replaceState({}, "", "/es/saved"); head("/"); dropStaleAlternates(); expect(count()).toBe(0);
    window.history.replaceState({}, "", "/");
  });
});

describe("is the page Spanish?", () => {
  it("counts English words and lets Spanish through", () => {
    expect(englishLeft("172 casas en venta en España, desde 38.000 €. Cada una revisada por una persona.").english).toBe(0);
    expect(englishLeft("Homes for sale in Spain").english).toBeGreaterThan(2);
    expect(englishLeft("Compradores estadounidenses in España").hits).toEqual(["in"]);
    expect(englishLeft("Casas en Spain").hits).toEqual(["Spain"]); // an English country name is English
  });
  it("does not take names, web addresses or kept foreign terms for English", () => {
    for (const s of ["Anunciada en gate-away.com.", "A unos 12 km: Region of Murcia International Airport.", "Montecatini in Val di Cecina, Toscana", "Little River, Carolina del Sur", "Los gastos de cierre (closing costs) varían según el estado.", "Tiny house de madera con dos altillos", "El anuncio la describe como reformada.", "Escríbenos a carlos@equinoxinvestmentgroup.com"]) expect(englishLeft(s).english, s).toBe(0);
  });
  it("publishes only pages with no English left", () => {
    expect(passes({ words: 500, english: 0, hits: [] })).toBe(true);
    expect(passes({ words: 5000, english: 1, hits: ["the"] })).toBe(false);
    expect(passes({ words: 0, english: 0, hits: [] })).toBe(false);
  });
});

describe("translating a prerendered page", () => {
  const dict: Record<string, string> = { Price: "Precio", Guides: "Guías" };
  const tr = pageTranslator((s) => dict[s] || s.replace(/^Homes in (.+)$/, "Casas en $1").replace(/^about (.+)% on top of the price$/, "alrededor de un $1% además del precio"));
  it("handles breadcrumbs, labels with a colon, text after a link and decimals before %", () => {
    expect(tr("RealHunt › Guides")).toBe("RealHunt › Guías");
    expect(tr("Price: ")).toBe("Precio: ");
    expect(tr(": about 7.5-14% on top of the price")).toBe(": alrededor de un 7,5-14% además del precio");
    expect(tr("Homes in Italy (6)")).toBe("Casas en Italia (6)");
  });
  it("writes place names in Spanish wherever they stand", () => {
    expect(placesEs("Jarocin, Greater Poland · nota 91")).toBe("Jarocin, Gran Polonia · nota 91");
    expect(placesEs("Hinnum, Grindsted (35 min to Billund)")).toBe("Hinnum, Grindsted (a 35 min de Billund)");
    expect(placesEs("Sweden-based")).toBe("Sweden-based");
  });
  it("translates text and alt, never scripts, styles or tag names", () => {
    const seen: string[] = [];
    const out = translateHtml('<style>.a{color:red}</style><h1 class="Price">Price</h1><img alt="Price" src="/x.jpg"><script>var Price=1</script><p>A &amp; B</p>', (s) => (s === "Price" ? "Precio" : s), (s) => seen.push(s));
    expect(out).toBe('<style>.a{color:red}</style><h1 class="Price">Precio</h1><img alt="Precio" src="/x.jpg"><script>var Price=1</script><p>A &amp; B</p>');
    expect(seen).toContain("Precio");
  });
  it("JSON-LD: texts translated, links moved, organisation names kept", () => {
    const o = translateLd({ "@type": "BreadcrumbList", itemListElement: [{ name: "Price", item: SITE + "/costs" }], publisher: { "@type": "Organization", name: "Price", url: SITE + "/" } }, (s) => (s === "Price" ? "Precio" : s), (u) => (u === SITE + "/costs" ? SITE + "/es/costs" : u)) as any;
    expect(o.itemListElement[0]).toEqual({ name: "Precio", item: SITE + "/es/costs" });
    expect(o.publisher.name).toBe("Price");
  });
});

describe("Spanish twins", () => {
  it("builds the Spanish address and the three alternates", () => {
    expect(esUrl(SITE + "/")).toBe(SITE + "/es");
    expect(esUrl(SITE + "/homes/spain")).toBe(SITE + "/es/homes/spain");
    const t = hreflangTags(SITE + "/homes/spain");
    expect(t).toContain(`hreflang="en" href="${SITE}/homes/spain"`);
    expect(t).toContain(`hreflang="es" href="${SITE}/es/homes/spain"`);
    expect(t).toContain(`hreflang="x-default" href="${SITE}/homes/spain"`);
  });

  it("writes a twin only for a fully Spanish, indexable page with content, and links both versions", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "rh-es-"));
    const shell = (r: PageRec) => `<html lang="${r.o.lang || "en"}"><head><title>${r.title}</title><meta name="description" content="${r.desc}" /><link rel="canonical" href="${r.url}" />${r.o.alt ? hreflangTags(r.o.alt.en) : ""}</head><body><div id="root">${r.body || ""}</div><script></script></body></html>`;
    const en = (p: string, body: string) => { const d = path.join(root, p); fs.mkdirSync(d, { recursive: true }); fs.writeFileSync(path.join(d, "index.html"), `<html lang="en"><head><title>x</title></head><body><div id="root">${body}</div><script></script></body></html>`); };
    const pass = createEsPass();
    const ok = '<main><h1>Best homes for sale in Spain</h1><p><a href="/homes/italy">Italy (3)</a> · <a href="/alerts">Alerts</a> · <a href="/deal/abc">Casa</a></p></main>';
    for (const p of ["homes/spain", "homes/italy", "half", "thin", "nobody", "deal/abc"]) en(p, ok);
    pass.add(SITE + "/homes/spain", "Best homes for sale in Spain (172) · RealHunt", "Homes for sale in Spain, scored and ranked best first. New homes every day.", "", ok, [{ "@type": "BreadcrumbList", itemListElement: [{ name: "Homes in Italy", item: SITE + "/homes/italy" }] }], { group: "places" });
    pass.add(SITE + "/homes/italy", "Best homes for sale in Italy", "Homes for sale in Italy, scored and ranked best first. New homes every day.", "", "<main><h1>Best homes for sale in Italy</h1></main>", [], { group: "places" });
    pass.add(SITE + "/half", "Best homes for sale in Spain", "Homes for sale in Spain, scored and ranked best first. New homes every day.", "", "<main><h1>Best homes for sale in Spain</h1><p>This sentence has no Spanish yet and stays as it is.</p></main>", [], {});
    pass.add(SITE + "/thin", "Best homes for sale in Spain", "Best homes for sale in Spain", "", "<main><h1>Best homes for sale in Spain</h1></main>", [], { noindex: true });
    pass.add(SITE + "/nobody", "Best homes for sale in Spain", "Best homes for sale in Spain", "", undefined, [], {});
    pass.add(SITE + "/deal/abc", "Best homes for sale in Spain", "Best homes for sale in Spain", "", ok, [], { group: "homes" });
    const cwd = process.cwd();
    const rep = writeEsTwins(root, pass, shell, new Map([[SITE + "/deal/abc", SITE + "/es/deal/abc"]]));
    expect(process.cwd()).toBe(cwd);
    expect(rep.twins.map((t) => t.es).sort()).toEqual([SITE + "/es/homes/italy", SITE + "/es/homes/spain"]);
    for (const p of ["half", "nobody", "deal/abc"]) expect(fs.existsSync(path.join(root, "es", p, "index.html")), p).toBe(false);
    // a thin (noindex) page that is fully Spanish gets a copy, so links stay in Spanish, but no hreflang and no sitemap entry
    expect(fs.readFileSync(path.join(root, "es/thin/index.html"), "utf8")).not.toContain("hreflang");
    expect(fs.readFileSync(path.join(root, "thin/index.html"), "utf8")).not.toContain("hreflang");
    expect(rep.thin).toBe(1);
    expect(rep.failed.find((f) => f.url === SITE + "/half")!.english).toBeGreaterThan(0);

    const es = fs.readFileSync(path.join(root, "es/homes/spain/index.html"), "utf8");
    expect(es).toContain('<html lang="es">');
    expect(es).toContain(`<link rel="canonical" href="${SITE}/es/homes/spain" />`);
    expect(es).toContain("<h1>Las mejores casas en venta en España</h1>");
    expect(es).toContain('href="/es/homes/italy"');   // a page with a twin: Spanish link
    expect(es).toContain('href="/es/deal/abc"');      // a Spanish page written by hand counts too
    expect(es).toContain('href="/alerts"');           // no twin: the English page stays linked, never a dead /es/ link
    expect(es).toContain(`hreflang="es" href="${SITE}/es/homes/spain"`);
    expect(es).toContain(`hreflang="x-default" href="${SITE}/homes/spain"`);
    expect(measureHtml(es).english).toBe(0);
    // the English version of a page with a twin gets the same three links; pages without a twin get none
    const enSpain = fs.readFileSync(path.join(root, "homes/spain/index.html"), "utf8");
    expect(enSpain).toContain(`hreflang="es" href="${SITE}/es/homes/spain"`);
    expect(enSpain).toContain(`hreflang="en" href="${SITE}/homes/spain"`);
    expect(fs.readFileSync(path.join(root, "half/index.html"), "utf8")).not.toContain("hreflang");
    fs.rmSync(root, { recursive: true, force: true });
  });
});

describe("file budget", () => {
  it("counts what the publish job copies and stops over the limit", () => {
    expect(publishedFiles(["a/index.html", "finds/x.webp", "og/y.JPG", "data/z.json", "v.mp4"])).toEqual(["a/index.html", "data/z.json"]);
    expect(checkBudget(["a.html", "b.webp"])).toBe(1);
    const many = Array.from({ length: MAX_PUBLISHED_FILES + 1 }, (_, i) => `p${i}/index.html`);
    expect(() => checkBudget(many)).toThrow(/over the limit/);
    expect(() => checkBudget(many.slice(1))).not.toThrow();
  });
});
