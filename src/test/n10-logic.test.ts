import { describe, expect, it } from "vitest";
import {
  byCar, cleanNotes, confirmedRecently, costPlan, eventsFor, importIssues, isGroupHome, listHref, logByHome, matchCosts,
  offerHintDays, parseAmount, parseList, portalStats, priceSteps, probeAlarms, setNote, shownCurrency, similarBy, unconfirmedQueue, unknowns,
} from "@/community/n10/logic";
import { alertOf } from "@/community/n9/listing";
import { mailtoHref } from "@/community/check";

const NOW = Date.parse("2026-11-21T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW - n * 86400000).toISOString();

describe("feed filters (30, 32)", () => {
  it("running costs", () => {
    expect(matchCosts({ hoa_monthly: 120 }, "known")).toBe(true);
    expect(matchCosts({ tax_annual: "900" }, "known")).toBe(true);
    expect(matchCosts({ hoa_unknown: true }, "known")).toBe(false);
    expect(matchCosts({}, "nofee")).toBe(true);
    expect(matchCosts({ hoa_unknown: true }, "nofee")).toBe(false);
    expect(matchCosts({ hoa_monthly: 50 }, "nofee")).toBe(false);
    expect(matchCosts({ hoa_monthly: 50 }, "")).toBe(true);
  });
  it("confirmed in the last 30 days", () => {
    expect(confirmedRecently({ src_ok_at: daysAgo(3), src_last: "ok" }, NOW)).toBe(true);
    expect(confirmedRecently({ src_ok_at: daysAgo(3), src_last: "blocked" }, NOW)).toBe(true);
    expect(confirmedRecently({ src_ok_at: daysAgo(31), src_last: "ok" }, NOW)).toBe(false);
    expect(confirmedRecently({ src_ok_at: daysAgo(2), src_last: "gone" }, NOW)).toBe(false);
    expect(confirmedRecently({ src_ok_at: daysAgo(2), sold_reports: 2, available_reports: 0 }, NOW)).toBe(false);
    expect(confirmedRecently({}, NOW)).toBe(false);
  });
});

describe("cost calculator (26)", () => {
  it("uses the asking price, or an offer", () => {
    const d = { country: "Italy", price_eur: 100000, hoa_monthly: 50, tax_annual: 600 };
    const a = costPlan(d)!;
    expect(a.price).toBe(100000);
    expect(a.monthly).toBe(100);
    expect(a.yearly).toBe(1200);
    expect(a.totalLow).toBeGreaterThan(100000);
    expect(a.firstYearLow).toBe(a.totalLow! + 1200);
    const b = costPlan(d, 80000)!;
    expect(b.price).toBe(80000);
    expect(b.costsLow! / 80000).toBeCloseTo(a.costsLow! / 100000, 6);
    expect(costPlan({ country: "Italy", price_eur: null })).toBeNull();
    expect(costPlan({ country: "Italy" }, 50000)!.price).toBe(50000);
  });
  it("reads typed amounts", () => {
    expect(parseAmount("85000")).toBe(85000);
    expect(parseAmount("85.000")).toBe(85000);
    expect(parseAmount("85,000 €")).toBe(85000);
    expect(parseAmount("85k")).toBe(85000);
    expect(parseAmount("1.250.000")).toBe(1250000);
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("abc")).toBeNull();
  });
});

describe("what we do not know (48)", () => {
  it("lists missing facts", () => {
    expect(unknowns({ title: "Flat in Rome", sqm: null, bedrooms: null, hoa_unknown: true })).toEqual(["year", "size", "beds", "fee", "tax", "energy"]);
    const full = unknowns({ title: "House built in 1972, energy class C", sqm: 80, bedrooms: 2, tax_annual: 500, category: "village" });
    expect(full).toEqual([]);
    expect(unknowns({ title: "Village house", sqm: 90, bedrooms: 3 })).toEqual(["year", "tax", "energy"]);
  });
});

describe("offer reminder (45)", () => {
  it("only after 90 days and never for gone homes", () => {
    expect(offerHintDays({ publish_at: daysAgo(120) }, NOW)).toBe(120);
    expect(offerHintDays({ publish_at: daysAgo(30) }, NOW)).toBeNull();
    expect(offerHintDays({ publish_at: daysAgo(120), sold_reports: 1 }, NOW)).toBeNull();
    expect(offerHintDays({}, NOW)).toBeNull();
  });
});

describe("change log (33, 79)", () => {
  const ev = [
    { date: "2026-11-14", kind: "price", slug: "a", old_price_eur: 48000, price_eur: 43500, title: "A" },
    { date: "2026-10-30", kind: "price", slug: "a", old_price_eur: 50000, price_eur: 48000 },
    { date: "2026-11-01", kind: "gone", slug: "b", title: "B" },
    { date: "2026-11-02", kind: "price", slug: "c", old_price_eur: null, price_eur: 1 },
  ];
  it("price steps oldest first", () => {
    const s = priceSteps(ev, "a");
    expect(s.map((x) => x.date)).toEqual(["2026-10-30", "2026-11-14"]);
    expect(s[1].diff).toBe(-4500);
    expect(s[1].pct).toBe(-9.4);
    expect(priceSteps(ev, "c")).toEqual([]);
    expect(eventsFor(null, "a")).toEqual([]);
  });
  it("groups by home, newest first, with search", () => {
    const h = logByHome(ev);
    expect(h[0].slug).toBe("a");
    expect(h[0].events[0].date).toBe("2026-11-14");
    expect(logByHome(ev, "b").map((x) => x.slug)).toEqual(["b"]);
  });
});

describe("similar homes (34)", () => {
  const img = ["x.jpg"];
  const d = { slug: "me", country: "Italy", price_eur: 80000, sqm: 70, nota: 85, image_urls: img, nearby: { sea_km: 10 } };
  const rows = [
    d,
    { slug: "cheap", country: "Italy", price_eur: 50000, sqm: 60, nota: 80, image_urls: img, nearby: { sea_km: 30 } },
    { slug: "cheap2", country: "Italy", price_eur: 70000, sqm: 60, nota: 90, image_urls: img },
    { slug: "big", country: "Italy", price_eur: 120000, sqm: 140, nota: 88, image_urls: img, nearby: { sea_km: 2 } },
    { slug: "fr", country: "France", price_eur: 10000, sqm: 300, nota: 99, image_urls: img, nearby: { sea_km: 0.2 } },
    { slug: "gone", country: "Italy", price_eur: 1000, sqm: 300, image_urls: img, sold_reports: 2 },
    { slug: "nophoto", country: "Italy", price_eur: 1000, image_urls: [] },
  ];
  it("same country, right direction", () => {
    expect(similarBy(rows, d, "cheaper", 6, NOW).map((r) => r.slug)).toEqual(["cheap2", "cheap"]);
    expect(similarBy(rows, d, "bigger", 6, NOW).map((r) => r.slug)).toEqual(["big"]);
    expect(similarBy(rows, d, "sea", 6, NOW).map((r) => r.slug)).toEqual(["big"]);
    expect(similarBy(rows, { ...d, sqm: null }, "bigger", 6, NOW)).toEqual([]);
  });
});

describe("small helpers", () => {
  it("airport by car is an estimate", () => {
    expect(byCar(34)).toEqual({ km: 44, min: 40 });
    expect(byCar(2)!.min).toBe(5);
    expect(byCar(null)).toBeNull();
  });
  it("currency choice", () => {
    expect(shownCurrency("USD", "SEK")).toBe("USD");
    expect(shownCurrency("", "GBP")).toBe("GBP");
    expect(shownCurrency(null, "SEK")).toBeNull();
    expect(shownCurrency("EUR", "USD")).toBe("EUR");
  });
  it("shared list links", () => {
    expect(parseList("a,b,,a,<x>,c%2Dd")).toEqual(["a", "b", "c-d"]);
    expect(listHref(["a", "b"])).toBe("/hunt/saved?homes=a,b");
    expect(parseList(Array.from({ length: 60 }, (_, i) => "h" + i).join(",")).length).toBe(40);
  });
  it("notes", () => {
    const n = setNote({}, "home-1", "visit in May", 5);
    expect(n).toEqual({ "home-1": { text: "visit in May", at: 5 } });
    expect(setNote(n, "home-1", "  ")).toEqual({});
    expect(cleanNotes({ "bad slug!": { text: "x" }, ok: { text: "y", at: 1 }, empty: { text: " " } })).toEqual({ ok: { text: "y", at: 1 } });
    expect(cleanNotes(null)).toEqual({});
  });
  it("group homes", () => {
    expect(isGroupHome({ hunter_handle: "ecobeachcity" })).toBe(true);
    expect(isGroupHome({ source_url: "https://equinoxinvestmentgroup.com/x" })).toBe(true);
    expect(isGroupHome({ hunter_handle: "fotocasa", source_domain: "fotocasa.es" })).toBe(false);
  });
  it("listing alert link", () => {
    expect(alertOf(["/deal/x", "/alerts?country=Italy&max=60000"])).toEqual({ href: "/alerts?country=Italy&max=60000", country: "Italy", max: 60000 });
    expect(alertOf(["/es/alerts?country=Spain"])!.country).toBe("Spain");
    expect(alertOf(["/alertsx"])).toBeNull();
  });
  it("mailto is short and encoded", () => {
    const h = mailtoHref("Question about Casa & co", "Hello\n" + "word ".repeat(600));
    expect(h.startsWith("mailto:?subject=Question%20about%20Casa%20%26%20co&body=Hello%0A")).toBe(true);
    expect(decodeURIComponent(h.split("&body=")[1]).length).toBeLessThan(1700);
  });
});

describe("admin (76, 77, 80)", () => {
  it("unconfirmed queue, longest first", () => {
    const q = unconfirmedQueue([
      { slug: "a", src_last: "blocked", src_ok_at: daysAgo(40), publish_at: daysAgo(60) },
      { slug: "b", src_last: "blocked", publish_at: daysAgo(90) },
      { slug: "c", src_last: "ok", src_ok_at: daysAgo(1), publish_at: daysAgo(90) },
      { slug: "d", src_last: "blocked", publish_at: daysAgo(2) },
    ], NOW);
    expect(q.map((r) => [r.slug, r.days, r.never])).toEqual([["b", 90, true], ["a", 40, false]]);
  });
  it("portal stats warn on missing prices and photos", () => {
    const s = portalStats([
      { source_domain: "x.com", price_eur: 0, image_urls: [], src_last: "blocked" },
      { source_domain: "x.com", price_eur: 0, image_urls: [], src_last: "blocked" },
      { source_domain: "x.com", price_eur: 10, image_urls: ["a"], src_last: "ok", src_ok_at: daysAgo(1) },
      { source_domain: "y.com", price_eur: 10, image_urls: ["a"], src_last: "ok" },
    ]);
    expect(s[0].domain).toBe("x.com");
    expect(s[0].warn).toEqual(["price", "photos", "check"]);
    expect(s[1].warn).toEqual([]);
  });
  it("probe alarms", () => {
    const base = { domain: "p", probes: 0, gone: 0, error: 0, last_ok: null, last_price: null };
    expect(probeAlarms({ ...base, ok: 20, ok_price: 1, blocked: 0, prev_ok: 20, prev_ok_price: 18, prev_blocked: 0 })).toEqual(["price_stopped"]);
    expect(probeAlarms({ ...base, ok: 2, ok_price: 0, blocked: 18, prev_ok: 20, prev_ok_price: 0, prev_blocked: 1 })).toEqual(["now_blocked"]);
    expect(probeAlarms({ ...base, ok: 20, ok_price: 0, blocked: 0, prev_ok: 20, prev_ok_price: 0, prev_blocked: 0 })).toEqual([]);
  });
  it("import issues", () => {
    expect(importIssues({ price_eur: 50000, sqm: 80, bedrooms: 2, location_name: "Peglio", country: "Italy", image_urls: ["a", "b", "c", "d"], source_url: "https://x.it/1" })).toEqual([]);
    expect(importIssues({ price_eur: 5000, sqm: 800, image_urls: ["a"], source_url: "https://instagram.com/p/1" })).toEqual(["No bedrooms", "No town", "No country", "Only 1 photo", "Advert link is a social post", "Price per m² under €150: check it is not land or a plot size"]);
  });
});
