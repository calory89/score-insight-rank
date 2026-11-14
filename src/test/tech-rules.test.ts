// seo/tech (15-nov-2026): the house rules that code can check, the checks over the built pages, the speed budget,
// the table of languages, the first paint of listing pages and the checks of the live site.
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { textHits, titleHits, pathHits, htmlHits, ldHits, countryHits, stuffing, signature, similarity } from "../../seo/tech/rules";
import { cleanHref, noEmDash, techHeal, techAudit, KNOWN_SCRIPT_HOSTS } from "../../seo/tech/audit";
import { LOCALES, alternates, hreflangTags, sitemapAlternates, checkLocales, localeOf, basePath, inLocale, type Locale } from "../../seo/tech/locales";
import { extraNoindex, EXTRA_NOINDEX } from "../../seo/tech/indexPolicy";
import { pagePerf } from "../../seo/tech/perfBudget";
import { withSiteHead } from "../../seo/tech/siteHead";
import { reportHtml, PLAIN } from "../../seo/tech/report";
import { scan, worse, countFile } from "../../seo/tech/sourceScan";
import { dealShell, shellAlt } from "../../seo/dealShell";
import { mid, midSrcSet, isThumb, MID_PHOTOS, onThumbError } from "@/lib/thumbs";
import { MEDIA } from "@/lib/media";
import { pageProblems, redirectProblems } from "../../seo/tech/liveCheck.mjs";

const rules = (hits: { rule: string }[]) => hits.map((h) => h.rule).sort();

describe("house rules over a text (ideas 977, 978, 981, 998)", () => {
  it("finds fake urgency in English and Spanish, and leaves honest sentences alone", () => {
    expect(rules(textHits("Only 3 left at this price, act now!"))).toContain("fake_urgency");
    expect(rules(textHits("Anunciado como oferta por tiempo limitado."))).toContain("fake_urgency");
    expect(rules(textHits("Three people are viewing this home"))).toEqual([]); // no number, no claim we could check; kept simple
    expect(rules(textHits("12 people are viewing this home"))).toContain("fake_urgency");
    expect(textHits("New homes every day. The last owner renovated the roof in 2021. Limited parking in the street.")).toEqual([]);
  });
  it("finds a promised return, not a sentence that denies one or an estimate", () => {
    expect(rules(textHits("A guaranteed return of 8% a year."))).toContain("promised_return");
    expect(rules(textHits("Rentabilidad garantizada del 7 %."))).toContain("promised_return");
    expect(textHits("We never promise guaranteed returns.")).toEqual([]);
    expect(textHits("Sin rentabilidad garantizada: es una estimación.")).toEqual([]);
    expect(textHits("Estimated gross rental yield: 5.2% (source: Global Property Guide).")).toEqual([]);
  });
  it("finds a phone number, not a price, an area or a date", () => {
    expect(rules(textHits("Call +34 600 123 456 today"))).toContain("phone_number");
    expect(rules(textHits("Call (305) 555-0199"))).toContain("phone_number");
    expect(textHits("€100,000 for 198 m², 84 min from Copenhagen, built 1870, 2026-11-14, 1.4% above 9.2 million DKK, +12% in a year")).toEqual([]);
    expect(textHits("215 €83,700 €1,008 190 85 60 to 100 km 147 €76,000")).toEqual([]); // a table of figures
    expect(rules(textHits("Llama al 0034 600 123 456"))).toContain("phone_number");
  });
  it("finds an inflated number of homes only when there are fewer", () => {
    expect(rules(textHits("Thousands of homes for sale", { homes: 591 }))).toContain("inflated_figure");
    expect(textHits("Thousands of homes for sale", { homes: 4200 })).toEqual([]);
    expect(textHits("Japan has millions of empty houses", { homes: 591 })).toEqual([]); // a fact about a country, not about us
    expect(rules(textHits("Miles de casas en venta", { homes: 591 }))).toContain("inflated_figure");
  });
  it("finds em dashes and filler text", () => {
    expect(rules(textHits("A cottage — the Forest Cottage"))).toEqual(["em_dash"]);
    expect(rules(textHits("Lorem ipsum dolor sit amet"))).toEqual(["placeholder_text"]);
    expect(textHits("A cottage - the Forest Cottage, 2–3 bedrooms")).toEqual([]);
  });
});

describe("house rules over a page (ideas 105, 119, 976, 991, 992, 995, 999)", () => {
  it("a year in a title is fine on a home and a dated article, listed elsewhere", () => {
    expect(titleHits("Villa with a roof from 2021 · €80,200", "deal")).toEqual([]);
    expect(titleHits("What €50,000 buys in 2026", "blog")).toEqual([]);
    expect(titleHits("Buying a home in Spain in 2026: costs", "costs")[0]).toMatchObject({ rule: "year_in_title", level: "warn" });
    expect(titleHits("Homes under €80,000 in Italy (42)", "band")).toEqual([]);
  });
  it("an address that looks like a test or a draft", () => {
    for (const p of ["/test", "/blog/draft-post-2", "/demo", "/homes/prueba", "/es/borrador/x", "/page-3"]) expect(pathHits(p).length, p).toBe(1);
    for (const p of ["/homes/spain", "/deal/contest-winner-80k", "/blog/latest-homes", "/guide/attestation", "/homes/italy/testaccio"]) expect(pathHits(p), p).toEqual([]);
  });
  it("links: no address, tracking parameters, texts that say nothing", () => {
    expect(rules(htmlHits('<a>Málaga</a>'))).toEqual(["link_without_href"]);
    expect(rules(htmlHits('<a href="#">x</a><a href="javascript:void(0)">y</a>'))).toEqual(["link_without_href"]);
    expect(rules(htmlHits('<a href="/homes/spain?utm_source=x">Homes in Spain</a>'))).toEqual(["tracking_param_in_internal_link"]);
    expect(rules(htmlHits('<a href="/homes/spain">See more</a>'))).toEqual(["generic_link_text"]);
    expect(rules(htmlHits('<a href="/homes/spain">Ver más</a>'))).toEqual(["generic_link_text"]);
    expect(htmlHits('<a href="/homes/spain">Homes in Spain</a><a href="https://x.com/?ref=1">x</a><a href="/deal/a"><img src="a.webp" alt="Stone house" width="4" height="3"></a>')).toEqual([]);
    expect(rules(htmlHits('<div onclick="go()">Homes</div>'))).toEqual(["click_handler_instead_of_link"]);
    expect(rules(htmlHits('<a href="tel:+34600123456">Call</a>'))).toEqual(["phone_link"]);
    expect(rules(htmlHits('<a href="https://wa.me/34600123456">WhatsApp</a>'))).toEqual(["phone_link"]);
    expect(htmlHits('<a href="https://wa.me/?text=Look">Share</a>')).toEqual([]);
  });
  it("photos: alt text and a reserved size", () => {
    expect(rules(htmlHits('<img src="a.webp">'))).toEqual(["image_without_alt", "image_without_size"]);
    expect(htmlHits('<img src="a.webp" alt="" width="480" height="360"><img src="b.webp" alt="x" data-rh-sized>')).toEqual([]);
  });
  it("no reviews or ratings in the structured data", () => {
    expect(ldHits([{ "@type": "RealEstateListing", offers: { "@type": "Offer", price: 1 } }])).toEqual([]);
    expect(ldHits([{ "@type": "Product", aggregateRating: { "@type": "AggregateRating", ratingValue: 5 } }])[0]).toMatchObject({ rule: "review_or_rating_markup", level: "fail" });
    expect(ldHits([{ "@graph": [{ "@type": "Review" }] }]).length).toBe(1);
  });
  it("a region is not a country", () => {
    expect(countryHits([{ slug: "a", country: "Scandinavia" }, { slug: "b", country: "Sweden" }, { slug: "c", country: "Dominican Republic" }]).map((h) => h.what)).toEqual(["a: Scandinavia"]);
  });
  it("keyword stuffing and near-identical pages", () => {
    const natural = "This stone house sits above the valley and has a garden with fruit trees. ".repeat(4) + Array.from({ length: 260 }, (_, i) => "word" + i).join(" ");
    expect(stuffing(natural)).toBeNull();
    const stuffed = Array.from({ length: 30 }, (_, i) => `cheap houses spain are great value number${i} for buyers like item${i} and more${i}`).join(" ");
    expect(stuffing(stuffed)?.phrase).toContain("cheap houses");
    const page = (place: string, n: number) => `Homes for sale in ${place}. There are ${n} homes here, each one checked by a person and scored from 70 to 98. The cheapest costs ${n * 1000} euros and the list is updated every day with new homes from local portals and agents in the area.`;
    const blank = /\b(lucca|pisa)\b/g;
    expect(similarity(signature(page("Lucca", 12), blank), signature(page("Pisa", 31), blank))).toBe(1);
    expect(similarity(signature(page("Lucca", 12), blank), signature("A guide to buying in Italy: the notary, the codice fiscale, the preliminary contract and the taxes you pay on a second home, step by step, with the offices where each paper is filed.", blank))).toBeLessThan(0.3);
  });
});

describe("what the build fixes by itself", () => {
  it("drops tracking parameters and keeps the rest of the address", () => {
    expect(cleanHref("/homes/spain?utm_source=x&utm_medium=y")).toBe("/homes/spain");
    expect(cleanHref("/homes/spain?sort=price&utm_source=x")).toBe("/homes/spain?sort=price");
    expect(cleanHref("/homes/spain?utm_source=x&sort=price#list")).toBe("/homes/spain?sort=price#list");
    expect(cleanHref("/deal/a?ref=tw")).toBe("/deal/a");
    expect(cleanHref("/deal/a?tab=all")).toBe("/deal/a?tab=all");
  });
  it("turns an em dash into a comma", () => {
    expect(noEmDash("called Skogshyttan — the Forest Cottage — with a forest")).toBe("called Skogshyttan, the Forest Cottage, with a forest");
  });
  it("points a link past a redirect and cleans the page", () => {
    const pg = (p: string, html: string) => ({ path: p, html }) as any;
    const pages = new Map<string, any>([["/", pg("/", '<div id="root"><a href="/old?utm_source=a">Old — name</a> <a href="/gone">gone</a> <a href="/homes/italy">ok</a></div><script>')], ["/homes/italy", pg("/homes/italy", "")]]);
    const n = techHeal(pages, { "/old": "/homes/italy", "/gone": "410" });
    expect(pages.get("/")!.html).toContain('<a href="/homes/italy">Old, name</a>');
    expect(pages.get("/")!.html).toContain('href="/gone"');
    expect(n).toMatchObject({ pages_with_em_dash_replaced: 1, tracking_parameters_removed: 1, links_pointed_past_a_redirect: 1 });
  });
});

describe("checks over the built pages", () => {
  const html = (root: string, head = "") => `<html lang="en"><head><title>t</title><link rel="canonical" href="https://realhunt.co/x" />${head}</head><body><div id="root">${root}</div><script type="module" src="/assets/a.js"></script></body></html>`;
  const words = (n: number) => Array.from({ length: n }, (_, i) => "w" + i).join(" ");
  const pg = (p: string, root: string, o: Record<string, unknown> = {}) => ({ path: p, en: p.replace(/^\/es(?=\/|$)/, "") || "/", lang: p.startsWith("/es") ? "es" : "en", html: html(root, String(o.head || "")), title: "Title of the page", desc: "d", kind: "page", cc: "", noindex: false, noindex0: false, words: 200, links: new Set<string>([...root.matchAll(/href="(\/[^"]*)"/g)].map((m) => m[1])), ...o }) as any;
  const run = (list: any[], extra: Record<string, unknown> = {}) => { const pages = new Map<string, any>(list.map((p) => [p.path, p])); return techAudit({ pages, live: (p) => !!pages.get(p) && !pages.get(p).noindex, redirects: {}, rows: [], ...extra }); };

  it("counts the clicks from the front page and names what is too far or cut off", () => {
    const chain = ["/", "/a", "/b", "/c", "/d", "/e"];
    const list = chain.map((p, i) => pg(p, `<main><p>${words(60)}</p>${chain[i + 1] ? `<a href="${chain[i + 1]}">next page ${i}</a>` : ""}</main>`));
    list.push(pg("/island", `<main><p>${words(60)}</p></main>`));
    const t = run(list);
    expect(t.depth).toMatchObject({ "0": 1, "1": 1, "5": 1, unreachable: 1 });
    expect(t.lists.more_than_4_clicks_deep).toEqual(["/e (5)"]);
    expect(t.lists.not_reachable_from_front_page).toEqual(["/island"]);
    expect(t.failures).toEqual([]);
  });
  it("stops the build for a script from an unknown site, a link through a redirect and a Spanish page that outlives its English page", () => {
    const t = run([
      pg("/", `<main><p>${words(60)}</p><a href="/old">Old page name</a><a href="/es">Español</a></main>`, { head: '<script src="https://evil.example/x.js"></script>' }),
      pg("/es", `<main><p>${words(60)}</p></main>`),
      pg("/x", `<main><p>${words(60)}</p></main>`, { noindex: true, why: "app screen" }), pg("/es/x", `<main><p>${words(60)}</p></main>`),
    ], { redirects: { "/old": "/x" } });
    const f = t.failures.join("\n");
    expect(f).toContain("script from unknown host");
    expect(f).toContain("link through redirect");
    expect(f).toContain("spanish indexable english noindex");
    expect(t.noindex).toEqual({ "app screen": 1 });
    expect(KNOWN_SCRIPT_HOSTS).toContain("realhunt.co");
  });
  it("lists, without stopping the build, what arrives with the data: urgency in a description, a page with no text without scripts, a guide with no homes", () => {
    const t = run([
      pg("/", `<main><p>${words(60)}</p><a href="/deal/a">Home a</a><a href="/guide/italy">Guide</a><a href="/homes/italy">Italy</a><a href="/thin">Thin page</a></main>`),
      pg("/deal/a", `<main><p>${words(60)} Selling fast, hurry.</p></main>`, { kind: "deal", cc: "italy" }),
      pg("/homes/italy", `<main><p>${words(60)}</p></main>`, { kind: "country", cc: "italy" }),
      pg("/guide/italy", `<main><p>${words(60)} General information, not legal advice.</p></main>`, { kind: "guide", cc: "italy" }),
      pg("/thin", `<main><p>${words(8)}</p></main>`),
    ]);
    expect(t.failures).toEqual([]);
    expect(t.lists.fake_urgency?.[0]).toContain("/deal/a");
    expect(t.lists.no_text_without_javascript).toEqual(["/thin (8 words)"]);
    expect(t.lists.guide_without_listings_or_homes?.[0]).toContain("/guide/italy");
    expect(t.lists.home_without_link_to_its_guide_or_costs).toEqual(["/deal/a -> /guide/italy"]);
    expect(t.lists.legal_page_without_disclaimer).toBeUndefined();
  });
  it("sees a title that changed again inside four weeks, a redirect chain and a home filed under a region", () => {
    const t = run([pg("/", `<main><p>${words(60)}</p></main>`)], { titles: { "/": ["bbbb", "2026-11-15", 1] }, prevTitles: { "/": ["aaaa", "2026-11-01"] }, redirects: { "/a": "/b", "/b": "/" }, rows: [{ slug: "x", country: "Scandinavia", title: "A — B" }] });
    expect(t.lists.title_changed_twice_in_28_days?.length).toBe(1);
    expect(t.summary.titles_changed_since_last_build).toBe(1);
    expect(t.failures.join()).toContain("redirect chain");
    expect(t.lists.region_used_as_country).toEqual(["x: Scandinavia"]);
    expect(t.lists.em_dash_in_home_data).toEqual(["x"]);
  });
});

describe("languages in one table (idea 125)", () => {
  const all = (p: string) => true;
  it("the table is sound and only live languages are written", () => {
    expect(checkLocales()).toEqual([]);
    expect(alternates("/homes/spain", all)).toEqual([["en", "/homes/spain"], ["es", "/es/homes/spain"], ["x-default", "/homes/spain"]]);
    expect(alternates("/", all)).toEqual([["en", "/"], ["es", "/es"], ["x-default", "/"]]);
    expect(alternates("/homes/spain", (p) => !p.startsWith("/es"))).toEqual([]); // one language only: no hreflang
    expect(hreflangTags("/", all, "https://realhunt.co")).toBe('<link rel="alternate" hreflang="en" href="https://realhunt.co/" /><link rel="alternate" hreflang="es" href="https://realhunt.co/es" /><link rel="alternate" hreflang="x-default" href="https://realhunt.co/" />');
    expect(sitemapAlternates("/a", all, "https://realhunt.co")).toContain('<xhtml:link rel="alternate" hreflang="es" href="https://realhunt.co/es/a"/>');
  });
  it("a third language is one line: every page of the set names every other", () => {
    const three: Locale[] = LOCALES.map((l) => (l.code === "de" ? { ...l, live: true } : l));
    expect(alternates("/homes/spain", all, three).map((x) => x[0])).toEqual(["en", "es", "de", "x-default"]);
    expect(localeOf("/de/homes/spain", three).code).toBe("de");
    expect(basePath("/es/homes/spain")).toBe("/homes/spain");
    expect(basePath("/es")).toBe("/");
    expect(basePath("/estonia")).toBe("/estonia");
    expect(inLocale("/", LOCALES[1])).toBe("/es");
  });
  it("catches a broken table", () => {
    expect(checkLocales([...LOCALES, { code: "fr", hreflang: "fr", prefix: "/es", name: "Français", live: false }]).join()).toContain("share prefix /es");
    expect(checkLocales(LOCALES.map((l) => ({ ...l, xDefault: false }))).join()).toContain("x-default");
  });
});

describe("index policy for the owner (ideas 127, 128)", () => {
  it("does nothing until a list is filled", () => { expect(EXTRA_NOINDEX).toEqual([]); });
  it("keeps the listed pages and sets the rest of the family to noindex", () => {
    const [pairs, nat] = extraNoindex(["spain-vs-portugal"], ["american", "british"]);
    expect(pairs[0].test("/countries/italy-vs-greece")).toBe(true);
    expect(pairs[0].test("/countries/spain-vs-portugal")).toBe(false);
    expect(pairs[0].test("/countries")).toBe(false);
    expect(nat[0].test("/can-i-buy/swiss-in-spain")).toBe(true);
    expect(nat[0].test("/can-i-buy/american-in-spain")).toBe(false);
    expect(nat[0].test("/can-i-buy")).toBe(false);
  });
});

describe("speed budget (ideas 146, 165, 166)", () => {
  const max = { html_kb: 30, blocking_css_kb: 28, entry_js_kb: 86, route_js_kb: 460, requests_in_html: 40, high_priority_images: 3 };
  const files: Record<string, number> = { "/assets/index.css": 3000, "/assets/index.js": 9000, "/assets/c.js": 5000 };
  const read = (f: string) => (files[f] ? Buffer.from(Array.from({ length: files[f] }, (_, i) => String.fromCharCode(33 + ((i * 7919) % 90))).join("")) : null);
  const head = `<link rel="stylesheet" href="/assets/index.css"><script>(()=>{const p=location.pathname.replace(/^\\/es(?=\\/|$)/,'')||'/',r={"Community":["/assets/c.js"]},k=1})()</script>`;
  const page = (imgs: string, extra = "") => `<html><head>${head}${extra}</head><body><div id="root">${imgs}</div><script type="module" src="/assets/index.js"></script></body></html>`;
  it("counts what a page asks for at once", () => {
    const p = pagePerf("/homes/spain", page('<img src="a" alt="" width="4" height="3" fetchpriority="high"><img src="b" alt="" width="4" height="3" loading="lazy">'), read, max);
    expect(p.requests_in_html).toBe(4); // one stylesheet, the entry script, the page's script, one photo that is not lazy
    expect(p.high_priority_images).toBe(1);
    expect(p.lazy_images).toBe(1);
    expect(p.route_js_kb).toBeGreaterThan(p.entry_js_kb);
    expect(p.problems).toEqual([]);
  });
  it("fails a page over a limit, a photo without a size and a home whose main photo is not asked for first", () => {
    const many = Array.from({ length: 45 }, (_, i) => `<img src="${i}" alt="" width="4" height="3" fetchpriority="high">`).join("");
    expect(pagePerf("/", page(many), read, max).problems.join()).toMatch(/requests in html: 4\d \(limit 40\).*high priority images/);
    expect(pagePerf("/", page('<img src="a" alt="">'), read, max).problems).toEqual(["a photo without a reserved size"]);
    expect(pagePerf("/deal/x", page('<img src="a" alt="" data-rh-sized>'), read, max).problems).toEqual(["the main photo is not asked for first (preload and fetchpriority)"]);
    expect(pagePerf("/deal/x", page('<img src="a" alt="" data-rh-sized fetchpriority="high">', '<link rel="preload" as="image" href="a">'), read, max).problems).toEqual([]);
  });
});

describe("first paint of a listing page", () => {
  const html = (main: string) => `<html><head></head><body><div id="root">${main}</div><script></script></body></html>`;
  it("puts the header strip before the listing, once, in the page's language", () => {
    const out = withSiteHead({ html: html('<main class="rh-static" data-rh-keep data-rh-static data-ls><h1>x</h1></main>'), lang: "es" });
    expect(out).toContain('<div id="root"><div class="rh-sitehead" data-rh-sitehead><a href="/es">');
    expect(out).toContain('id="rh-sitehead-css"');
    expect(withSiteHead({ html: out, lang: "es" })).toBe(out);
  });
  it("leaves other pages alone, and its styles hold when the app wraps the kept HTML in a div", () => {
    const other = html('<main class="rh-static" data-rh-keep data-rh-static><h1>x</h1></main>');
    expect(withSiteHead({ html: other, lang: "en" })).toBe(other);
    const out = withSiteHead({ html: html('<main class="rh-static" data-rh-keep data-rh-static data-ls></main>'), lang: "en" });
    expect(out).not.toContain("#root>"); // src/App.tsx re-renders the kept HTML inside a <div>: a "#root>" selector would stop matching
  });
});

describe("the report for the owner (idea 140)", () => {
  it("is Spanish, noindex, says what failed and has no em dash", () => {
    const rep: any = { summary: { pages: 10, indexable: 8, noindex: 2, broken_links: 0, orphans: 0, duplicate_titles: 0, duplicate_descriptions: 0, hreflang_problems: 0, title_over_60: 1, desc_out_of_range: 0, thin_under_150_words: 0, redirects: 3 }, failures: ["tech: link without href: 1 (/x: <a>)"], spanish: { twins: 4 },
      tech: { summary: { link_without_href: 1, fake_urgency: 2, fixed_here: 5, titles_changed_since_last_build: 0 }, failures: ["link without href: 1 (/x: <a>)"], lists: { link_without_href: ["/x: <a>"], fake_urgency: ["/deal/a: hurry", "/es/deal/a: date prisa"] }, depth: { "0": 1, "1": 5, "5": 2 }, noindex: { "legal page": 2 }, external: { scripts: ["realhunt.co", "www.clarity.ms"], frames: [], link_hosts: 3 } } };
    const h = reportHtml(rep, { today: "2026-11-15", rows: 591, toIndex: ["/homes/bulgaria/under-80000"] });
    expect(h).toContain('<html lang="es">');
    expect(h).toContain('content="noindex, nofollow"');
    expect(h).toContain("1 comprobaciones han fallado");
    expect(h).toContain("Enlaces sin dirección");
    expect(h).toContain("Frases de urgencia");
    expect(h).toContain("Páginas legales");
    expect(h).toContain("Demasiado lejos");
    expect(h).toContain("https://realhunt.co/homes/bulgaria/under-80000");
    expect(h).not.toContain("—");
    expect(h).not.toMatch(/<script/);
  });
  it("has a plain name for every rule it can show", () => {
    for (const k of ["em_dash", "fake_urgency", "promised_return", "inflated_figure", "phone_number", "year_in_title", "test_page_indexable", "link_without_href", "region_used_as_country", "near_identical_pages", "keyword_stuffing", "review_or_rating_markup", "title_changed_twice_in_28_days", "more_than_4_clicks_deep", "no_text_without_javascript", "script_from_unknown_host"]) expect(PLAIN[k]?.[0], k).toBeTruthy();
    for (const [k, v] of Object.entries(PLAIN)) expect(textHits(v.join(" ")).filter((h) => h.rule === "em_dash"), k).toEqual([]);
  });
});

describe("the live site, as a crawler without scripts reads it (ideas 103, 110)", () => {
  const page = (o: { h1?: number; words?: number; canon?: string; robots?: string } = {}) => `<html><head><title>Homes in Spain</title><meta name="robots" content="${o.robots || "index, follow"}" /><link rel="canonical" href="${o.canon ?? "https://realhunt.co/homes/spain"}" /></head><body><div id="root"><main>${"<h1>Homes</h1>".repeat(o.h1 ?? 1)}<p>${Array.from({ length: o.words ?? 80 }, (_, i) => "w" + i).join(" ")}</p></main></div><script src="/a.js"></script></body></html>`;
  it("accepts a real page and names what is wrong with a bad one", () => {
    expect(pageProblems("/homes/spain", 200, page())).toEqual([]);
    expect(pageProblems("/homes/spain", 404, "")).toEqual(["status 404"]);
    expect(pageProblems("/homes/spain", 200, page({ words: 5 }))).toEqual(["only 6 words without scripts"]);
    expect(pageProblems("/homes/spain", 200, page({ h1: 0 }))).toContain("0 h1");
    expect(pageProblems("/homes/spain", 200, page({ canon: "https://realhunt.co/" }))).toEqual(["canonical is https://realhunt.co/"]);
    expect(pageProblems("/homes/spain", 200, page({ robots: "noindex, follow" }))).toEqual(["noindex on a page of the sitemap"]);
    expect(pageProblems("/", 200, "<html><head><title>Just a moment...</title></head></html>")).toEqual(["a challenge page instead of the page"]);
  });
  it("an old address must arrive in one hop, or say it is gone", () => {
    expect(redirectProblems("/country/spain", "/homes/spain", 301, "https://realhunt.co/homes/spain")).toEqual([]);
    expect(redirectProblems("/country/spain", "/homes/spain", 301, "/homes/spain/")).toEqual([]);
    expect(redirectProblems("/country/spain", "/homes/spain", 200, null).length).toBe(1);
    expect(redirectProblems("/country/spain", "/homes/spain", 301, "/homes").length).toBe(1);
    expect(redirectProblems("/deal/x", "410", 410, null)).toEqual([]);
    expect(redirectProblems("/deal/x", "410", 404, null).length).toBe(1);
  });
});

describe("photos: alt text and the mid-size copy (ideas 135, 152)", () => {
  const row = { slug: "es-test-99k", title: "Stone house with a garden", title_es: "Casa de piedra con jardín", price_eur: 99000, country: "Spain", location_name: "Árchez, Málaga", image_urls: ["/finds/es-test-99k-0.webp"] };
  const photos = [MEDIA + "/finds/es-test-99k-0.webp"];
  it("says what the home is, where and for how much, in the page's language, without repeating the place", () => {
    expect(shellAlt(row, row.title)).toBe("Stone house with a garden, Árchez, Málaga, €99,000");
    expect(shellAlt(row, row.title_es, "es")).toBe("Casa de piedra con jardín, Árchez, Málaga, 99.000 €");
    expect(shellAlt({ ...row, location_name: "Rossell, Castellón" }, "Village house in Rossell, Castellón")).toBe("Village house in Rossell, Castellón, €99,000");
    expect(dealShell({ row, photos, crumbs: [], lang: "es" })).toContain('alt="Casa de piedra con jardín, Árchez, Málaga, 99.000 €"');
  });
  it("names the 800 px copy next to the thumbnail, only for our own photos", () => {
    expect(mid("/finds/a-0.webp")).toBe(MEDIA + "/t/m/finds/a-0.webp");
    expect(mid(MEDIA + "/finds/a-0.jpg")).toBe(MEDIA + "/t/m/finds/a-0.webp");
    expect(mid("https://cdn.example.com/x.jpg")).toBe("https://cdn.example.com/x.jpg");
    expect(isThumb(mid("/finds/a-0.webp"))).toBe(true);
    expect(midSrcSet(photos[0], true)).toBe(`${MEDIA}/t/m/finds/es-test-99k-0.webp 800w, ${photos[0]} 1600w`);
    expect(midSrcSet("https://cdn.example.com/x.jpg", true)).toBeUndefined();
  });
  it("is off until the copies exist, and falls back to the full photo when one is missing", () => {
    expect(MID_PHOTOS).toBe(false);
    expect(dealShell({ row, photos, crumbs: [] })).not.toContain("srcset");
    const on = dealShell({ row, photos, crumbs: [], midPhotos: true });
    expect(on).toContain(`srcset="${MEDIA}/t/m/finds/es-test-99k-0.webp 800w, ${photos[0]} 1600w"`);
    expect(on).toContain("this.removeAttribute('srcset')");
    expect(on).toContain(`<img src="${photos[0]}"`);
    const img = { currentSrc: mid(photos[0]), src: photos[0], dataset: {} as Record<string, string | undefined>, removed: [] as string[], removeAttribute(n: string) { this.removed.push(n); } };
    expect(onThumbError(img, photos[0])).toBe(true);
    expect(img.removed).toContain("srcset");
  });
});

describe("files a crawler reads first", () => {
  const root = path.resolve(__dirname, "../..");
  const robots = fs.readFileSync(path.join(root, "public/robots.txt"), "utf8");
  it("robots.txt keeps site searches out for every group that names its crawlers (idea 143)", () => {
    const groups = robots.split(/\n(?=User-agent:)/).reduce<string[]>((acc, g) => { if (acc.length && /^User-agent:[^\n]*\n?$/.test(acc[acc.length - 1].trim() + "\n") ) acc[acc.length - 1] += "\n" + g; else acc.push(g); return acc; }, []);
    const blocks = robots.split(/\n\s*\n/).filter((b) => /User-agent:/.test(b));
    for (const b of blocks) if (/Googlebot|GPTBot|User-agent: \*/.test(b)) expect(b, b.slice(0, 40)).toContain("Disallow: /*?q=");
    expect(groups.length).toBeGreaterThan(0);
    expect(robots).toContain("Sitemap: https://realhunt.co/sitemap.xml");
    expect(robots).not.toMatch(/Disallow: \/\s*$/m); // never the whole site
  });
  it("the home page declares the site name the way Google asks (idea 139) and loads no font from another site", () => {
    const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
    expect(index).toContain('"@type":"WebSite","name":"RealHunt","alternateName":["Real Hunt","realhunt.co"],"url":"https://realhunt.co"');
    expect(index).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);
    expect(fs.readFileSync(path.join(root, "src/index.css"), "utf8")).not.toMatch(/@import url\(/);
  });
  it("the language script never sends the visitor to another address by country (idea 993)", () => {
    const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
    const lang = /<script>\s*\/\* Language[\s\S]*?<\/script>/.exec(index)![0];
    expect(lang).not.toMatch(/location\.(href|replace|assign)\s*[=(]|location\s*=/);
  });
  it("the service worker parses, never keeps pages or data, and only stores good answers (idea 162)", () => {
    const sw = fs.readFileSync(path.join(root, "public/sw.js"), "utf8");
    expect(() => new Function("self", "caches", "location", sw)).not.toThrow();
    const handlers: Record<string, (e: any) => void> = {};
    new Function("self", "caches", "location", "fetch", sw)({ addEventListener: (k: string, f: (e: any) => void) => { handlers[k] = f; }, skipWaiting() {} }, {}, { origin: "https://realhunt.co" }, () => {});
    const asked = (url: string) => { let took = false; handlers.fetch({ request: { url, method: "GET", headers: { has: () => false } }, respondWith: () => { took = true; }, waitUntil() {} }); return took; };
    expect(asked("https://realhunt.co/homes/spain")).toBe(false);
    expect(asked("https://realhunt.co/data/rh-static.json")).toBe(false);
    expect(asked("https://realhunt.co/sw.js")).toBe(false);
    expect(asked("https://realhunt.co/seo-audit.json")).toBe(false);
    expect(sw).toContain('r.type === "basic"');
  });
});

describe("the texts kept in the repo (ideas 977, 978, 981, 998 and the em dash rule), as a ratchet", () => {
  const root = path.resolve(__dirname, "../..");
  it("counts what a file breaks", () => {
    expect(countFile('const a = "Last units — hurry"; // tel:+34600123456')).toEqual({ em_dash: 1, fake_urgency: 2, phone_number: 1 });
    expect(countFile('t("No guaranteed returns"); share("https://wa.me/?text=x")')).toEqual({});
  });
  it("no file is worse than on 15-nov-2026, and a new file is clean", () => {
    const base = JSON.parse(fs.readFileSync(path.join(root, "seo/tech/source-baseline.json"), "utf8"));
    expect(worse(scan(root), base)).toEqual([]);
    expect(worse({ "src/new.tsx": { em_dash: 1 } }, base)).toEqual(["src/new.tsx: em dash 1 (was 0)"]);
  });
});
