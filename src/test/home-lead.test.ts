import { describe, it, expect } from "vitest";
import { homeLead, homeTitle, homeKind, homeWhat } from "@/community/homeLead";
import { dealAvailability, dealStatusHtml } from "../../seo/dealStatus";
import { homeBasics } from "../../seo/tech/audit";
import { dealShell } from "../../seo/dealShell";
import { homeArticle } from "@/community/homeArticle";
import { homeArticleEs } from "@/community/homeArticleEs";

const home = (slug: string, price: number, sqm: number, loc = "Bajardo, Liguria, Italy") => ({ slug, price_eur: price, sqm, country: "Italy", location_name: loc });
const others = [home("a", 50000, 100), home("b", 80000, 60), home("c", 120000, 80), home("d", 90000, 90), home("e", 70000, 50)];
const EN = /\b(the|and|for|with|home|homes|price|median|cheaper)\b/i;

describe("home page lead and title (ideas 11, 12, 15, 25)", () => {
  const r = { ...home("x", 85000, 100), title: "Stone house with a garden and sea view", bedrooms: 3, nota: 86 };
  const ctx = { countryHomes: [r, ...others], regionHomes: [r, others[0], others[1], others[2]], regionName: "Liguria" };

  it("titles say what, where and the price, in each language", () => {
    expect(homeTitle(r, "en")).toBe("3-bedroom house in Bajardo, Italy for €85,000");
    expect(homeTitle(r, "es")).toBe("Casa de 3 dormitorios en Bajardo, Italia por 85.000 €");
    expect(homeTitle({ ...r, title: "Bright flat near the beach", bedrooms: 1 }, "es")).toBe("Piso de 1 dormitorio en Bajardo, Italia por 85.000 €");
    expect(homeTitle({ ...r, title: "Studio by the sea", bedrooms: 1 }, "en")).toBe("Studio in Bajardo, Italy for €85,000");
    // the United States: the state, which is what people search
    expect(homeTitle({ ...r, country: "United States", location_name: "Boca Raton, Florida", title: "Condo with a pool", bedrooms: 2 }, "en")).toBe("2-bedroom flat in Boca Raton, Florida for €85,000");
    // too long: the town alone
    expect(homeTitle({ ...r, location_name: "Saint-Martin-de-Belleville, Savoie" }, "en", 50)).toBe("3-bedroom house in Saint-Martin-de-Belleville for €85,000");
    expect(homeTitle({ ...r, location_name: "near Saint-Vaury, Creuse", country: "France" }, "es")).toBe("Casa de 3 dormitorios cerca de Saint-Vaury por 85.000 €");
    expect(homeLead({ ...r, location_name: "near Saint-Vaury, Creuse", country: "France" }, { countryHomes: [] }, "en")[0]).toContain("for sale near Saint-Vaury, Creuse, France at €85,000");
    expect(homeKind({ title: "2-bedroom flat with a terrace" }).ld).toBe("Apartment");
    expect(homeKind({ title: "Farmhouse with land" }).en).toBe("farmhouse");
    expect(homeWhat({ title: "Something nice" }, "en")).toBe("Home");
  });

  it("the answer paragraph gives price, size, price per m², score and the medians", () => {
    const [p, area] = homeLead(r, ctx, "en");
    expect(p).toBe("3-bedroom house for sale in Bajardo, Liguria, Italy at €85,000: 100 m², about €850 per m². RealHunt score: 86 of 98. Per square metre it is 36% below the median for Italy on RealHunt (€1,333 per m², 6 homes).");
    expect(area).toContain("Price against the area:");
    expect(area).toContain("the median for Liguria on RealHunt");
    const es = homeLead(r, ctx, "es").join(" ");
    expect(es).toContain("Casa de 3 dormitorios en venta en Bajardo, Liguria, Italia por 85.000 €");
    expect(es).toContain("Nota RealHunt: 86 de 98.");
    expect(es).toContain("Precio frente a la zona: cuesta un");
    expect(es.replace(/RealHunt/g, "")).not.toMatch(EN);
    expect(es + p).not.toContain("—");
  });

  it("with little data it still answers, without inventing a comparison", () => {
    const lead = homeLead({ slug: "y", price_eur: 40000, country: "Netherlands", title: "Cabin" }, { countryHomes: [] }, "en");
    expect(lead).toEqual(["Cabin for sale in Netherlands at €40,000."]);
  });

  it("asks the yearly-cost question with the country's rule, in both languages (idea 14)", () => {
    const dest = { annual_property_tax: "IMU on second homes.", purchase_costs_pct: "4-15" };
    expect(homeArticle(r, { ...ctx, dest }).faq.map(([q]) => q)).toContain("What does this home cost every year?");
    expect(homeArticleEs(r, { ...ctx, dest: { ...dest, annual_property_tax: "IMU en segundas viviendas." } }).faq.map(([q]) => q)).toContain("¿Cuánto cuesta esta casa cada año?");
  });
});

describe("home status in the HTML (ideas 23, 24, 94)", () => {
  const now = Date.now();
  const iso = (d: number) => new Date(now - d * 86400000).toISOString();
  it("availability: in stock, sold out, or left out when unconfirmed", () => {
    expect(dealAvailability({ src_last: "ok", src_ok_at: iso(1), publish_at: iso(40) })).toBe("https://schema.org/InStock");
    expect(dealAvailability({ sold_reports: 2, available_reports: 0 })).toBe("https://schema.org/SoldOut");
    expect(dealAvailability({ src_last: "blocked", src_ok_at: null, publish_at: iso(40) })).toBe("");
  });
  it("a home confirmed by the nightly check shows the day, in each language", () => {
    const row = { src_last: "ok", src_ok_at: "2026-11-19T03:00:00Z", publish_at: "2026-09-29T10:00:00Z" };
    expect(dealStatusHtml(row, "en")).toContain('Checked on <time datetime="2026-11-19">19 Nov 2026</time>: our nightly check found the original advert online.');
    expect(dealStatusHtml(row, "es")).toContain('Comprobada el <time datetime="2026-11-19">19 nov 2026</time>');
    // a check by a person wins, and is not said twice
    expect(dealStatusHtml({ ...row, verified_at: "2026-11-18T10:00:00Z" }, "en")).not.toContain("nightly check found");
  });
});

describe("home page basics (ideas 21, 71, 76)", () => {
  const row = { slug: "x", title: "Stone house", price_eur: 99000, location_name: "Árchez, Málaga", country: "Spain" };
  const shell = dealShell({ row, photos: ["https://m/x.webp"], crumbs: [], caption: "Árchez, Málaga, €99,000" });
  const page = (head: string, root: string) => `<html><head>${head}</head><body><div id="root">${root}</div>\n<script></script></body></html>`;
  const head = `<title>Stone house · RealHunt</title><meta name="description" content="A stone house." /><link rel="canonical" href="https://realhunt.co/deal/x" /><link rel="preload" as="image" href="https://m/t/x.webp" fetchpriority="high" />`;
  it("the main photo has a caption with place and price", () => {
    expect(shell).toContain('<figcaption class="rh-sh-cap">Árchez, Málaga, €99,000</figcaption></figure>');
  });
  it("a complete page passes, and what is missing is named", () => {
    expect(homeBasics(page(head, shell), "/deal/x", true)).toEqual([]);
    expect(homeBasics(page(head.replace(/<link rel="preload"[^>]*>/, ""), shell), "/deal/x", true)).toEqual(["photo preload"]);
    expect(homeBasics(page(head, shell.replace(/alt="[^"]*"/, 'alt=""')), "/deal/x", true)).toEqual(["main photo with alt text"]);
    expect(homeBasics(page(head.replace("/deal/x", "/deal/y"), shell + "<h1>two</h1>"), "/deal/x", true)).toEqual(["one h1", "own canonical"]);
  });
});

describe("homeKind picks the kind named first (20 Nov 2026)", () => {
  it("house with a guest studio is a house; townhouse flat is a flat; studio flat is a studio", async () => {
    const { homeKind } = await import("../community/homeLead");
    expect(homeKind({ title: "Renovated house with sauna, plunge pool and guest studio 800 m from Lake Balaton" }).en).toBe("house");
    expect(homeKind({ title: "Spacious 89 m² townhouse flat with wood floors in Wałbrzych" }).en).toBe("flat");
    expect(homeKind({ title: "New 2025 detached house on a 1,500 m² flat plot" }).en).toBe("house");
    expect(homeKind({ title: "Bright studio flat near the beach" }).en).toBe("studio");
  });
});
