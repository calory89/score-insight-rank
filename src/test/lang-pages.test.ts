// Listing pages in the languages that have no app (seo/langs, seo/listings/pack.<lang>.ts, packkit.ts).
import { describe, it, expect } from "vitest";
import fs from "fs";
import { placeIn, englishIn, titleIn, destFor, titlesOf, destTexts, NEW_LANGS } from "../../seo/listings/packkit";
import { listingRows } from "../../seo/listings/build";
import { planLangs, visible } from "../../seo/langs/build";
import { markEnglish, renderDoc } from "../../seo/langs/shell";
import { UI } from "../../seo/langs/strings";
import { PACKS, CONFIG, MAX_TOTAL } from "../../seo/langs/config";
import { de } from "../../seo/listings/pack.de";
import { ru } from "../../seo/listings/pack.ru";

const rows = listingRows();
const W = { map: { Tuscany: "Toskana", "Black Sea": "Schwarzes Meer" }, near: (n: string, card: boolean) => (card ? `bei ${n}` : `Umgebung von ${n}`), central: (n: string) => `Zentrum von ${n}`, area: (n: string) => `Raum ${n}` };

describe("place names", () => {
  it("keeps a town as the country writes it and uses the language's own name for a region", () => {
    expect(placeIn(W, "Alhama de Granada")).toBe("Alhama de Granada");
    expect(placeIn(W, "Tuscany")).toBe("Toskana");
    expect(placeIn(W, "Kavarna (Black Sea)")).toBe("Kavarna (Schwarzes Meer)");
    expect(placeIn(W, "near Ringsted")).toBe("Umgebung von Ringsted");
    expect(placeIn(W, "near Ringsted", "card")).toBe("bei Ringsted");
    expect(placeIn(W, "Central Eslöv")).toBe("Zentrum von Eslöv");
  });
  it("answers null for a name with an English word that nobody vetted, so the page is not published", () => {
    expect(placeIn(W, "Northern Sweden")).toBeNull();
    expect(placeIn(W, "Wisconsin (Lake Superior region)")).toBeNull();
  });
  it("every region and town of today's homes has a German name", () => {
    const { langs } = planLangs(rows, () => true);
    const g = langs.find((l) => l.lang === "de")!;
    expect(g.dropped.filter((d) => /title|place/.test(d.why))).toEqual([]);
  });
});

describe("the gate against English", () => {
  it("finds English words and leaves names and the language's own words alone", () => {
    expect(englishIn("de", "Haus mit Garten in Sunny Beach")).toEqual([]);
    expect(englishIn("de", "Was kostet ein Haus? Die Wohnung hat einen Pool und liegt am See.")).toEqual([]);
    expect(englishIn("de", "2-bedroom house with garden")).toEqual(["bedroom", "house", "with", "garden"]);
    expect(englishIn("ru", "Квартира в комплексе Kavarna Hills, 300 м от пляжа")).toEqual([]);
    expect(englishIn("ru", "Квартира near the beach")).toEqual(["near", "the", "beach"]);
    expect(englishIn("de", "Die Abschlusskosten (closing costs) liegen bei 2-5 %")).toEqual([]);
  });
  it("a title only counts while the English title it was translated from is the one in the data", () => {
    const slug = Object.keys(titlesOf("de"))[0]; const e = titlesOf("de")[slug];
    expect(titleIn("de", { slug, title: e.en })).toBe(e.t);
    expect(titleIn("de", { slug, title: e.en + " with a new roof" })).toBeNull();
    expect(titleIn("de", { slug: "not-a-home", title: "x" })).toBeNull();
  });
  it("no translated title has an em dash or English left, and none is empty", () => {
    for (const lang of ["de", "ru"] as const) for (const [slug, e] of Object.entries(titlesOf(lang))) {
      expect(e.t.length, slug).toBeGreaterThan(5);
      expect(e.t, slug).not.toMatch(/—/);
      expect(englishIn(lang, e.t), `${lang} ${slug}: ${e.t}`).toEqual([]);
    }
  });
  it("buying rules: only translated texts reach the page, and the numbers are the ones of the English file", () => {
    const en = JSON.parse(fs.readFileSync("src/data/destinations.json", "utf8"));
    const d = destFor(en, "ru");
    expect(d.bulgaria.can_foreigners_buy).toMatch(/[а-я]/);
    expect(d.spain.can_foreigners_buy).toBeUndefined();          // not translated: left out, never shown in English
    expect(d.spain.purchase_costs_pct).toBe(en.spain.purchase_costs_pct);
    const pcts = (x: string) => (String(x).match(/\d+[.,]\d+(?=\s?%)/g) || []).map((n) => n.replace(",", ".")).sort();
    for (const lang of ["de", "ru"]) for (const [cc, t] of Object.entries(destTexts(lang))) {
      if (cc === "_note") continue;
      for (const k of ["purchase_costs_breakdown", "annual_property_tax"]) if ((t as any)[k]) for (const n of pcts(en[cc][k])) expect(pcts((t as any)[k]), `${lang} ${cc} ${k} ${n}`).toContain(n);
    }
  });
});

describe("which pages a language gets", () => {
  const { langs } = planLangs(rows, () => true);
  it("stays inside the budget of the round and of each language", () => {
    expect(langs.reduce((a, l) => a + l.pages.length + 1, 0)).toBeLessThanOrEqual(MAX_TOTAL);
    for (const l of langs) expect(l.pages.length).toBeLessThanOrEqual(CONFIG[l.lang]!.max);
  });
  it("German covers every country with homes; Russian only the countries whose homes and rules are translated", () => {
    const cc = (lang: string) => new Set(langs.find((l) => l.lang === lang)!.pages.map((p) => p.f.cc).filter(Boolean));
    for (const c of ["spain", "italy", "sweden", "denmark", "france", "greece", "bulgaria"]) expect(cc("de").has(c), c).toBe(true);
    expect([...cc("ru")].sort()).toEqual(["bulgaria", "cyprus", "greece"]);
  });
  it("a home without a title takes its pages out of the language", () => {
    const one = rows.find((r) => r.country === "Bulgaria")!;
    const changed = rows.map((r) => (r === one ? { ...r, title: r.title + " (new text)" } : r));
    const before = langs.find((l) => l.lang === "ru")!.pages.filter((p) => p.f.cc === "bulgaria").length;
    const after = planLangs(changed, () => true).langs.find((l) => l.lang === "ru")!.pages.filter((p) => p.f.cc === "bulgaria");
    expect(before).toBeGreaterThan(0); expect(after.length).toBeLessThan(before);
    expect(after.filter((p) => p.f.homes.some((h) => h.slug === one.slug))).toEqual([]);
  });
  it("every language with a pack has its interface words and nothing else is published", () => {
    for (const l of NEW_LANGS) expect(!!PACKS[l]).toBe(!!UI[l] && !!CONFIG[l]);
    expect(langs.map((l) => l.lang)).toEqual(["de", "ru"]);
  });
});

describe("wording", () => {
  it("German writes amounts and dates the German way and agrees article and noun", () => {
    expect(de.money(50000)).toBe("50.000 €");
    expect(de.date("2026-11-13")).toBe("13. November 2026");
    expect(de.qCheapest("günstigste Wohnung zum Kauf in Spanien")).toBe("Welches ist die günstigste Wohnung zum Kauf in Spanien?");
    expect(de.qPrice("Haus zum Kauf in Italien")).toBe("Was kostet ein Haus zum Kauf in Italien?");
    expect(de.inC("Switzerland")).toBe("in der Schweiz");
  });
  it("Russian numbers agree with their noun", () => {
    expect(ru.title("Недорогие квартиры", 6, "58 900 €")).toContain("6 предложений");
    expect(ru.title("Недорогие квартиры", 21, "58 900 €")).toContain("21 предложение");
    expect(ru.title("Недорогие квартиры", 3, "58 900 €")).toContain("3 предложения");
    expect(ru.fType(1, 12)).toBe("Тип: 1 квартира и 12 домов.");
    expect(ru.inC("Cyprus")).toBe("на Кипре");
  });
});

describe("the document", () => {
  it("does not load the app, declares its language and links every version", () => {
    const h = renderDoc({ lang: "de", ui: UI.de!, path: "/de/homes/spain", title: "T", desc: "D", image: "https://realhunt.co/og-home.jpg", main: "<main>x</main>", ld: [],
      alts: [{ lang: "en", href: "https://realhunt.co/homes/spain" }, { lang: "de", href: "https://realhunt.co/de/homes/spain" }, { lang: "x-default", href: "https://realhunt.co/homes/spain" }],
      versions: [["en", "English", "/homes/spain"], ["de", "Deutsch", "/de/homes/spain"]] });
    expect(h).toMatch(/^<!doctype html><html lang="de">/);
    expect(h).not.toMatch(/type="module"|id="root"|\/assets\//);
    expect(h).toContain('<link rel="canonical" href="https://realhunt.co/de/homes/spain" />');
    expect(h).toContain('hreflang="x-default" href="https://realhunt.co/homes/spain"');
    expect(h).toContain('<a href="/homes/spain" hreflang="en" lang="en">English</a>');
  });
  it("marks the links that leave the language, except inside the cards and the table", () => {
    const html = `<a href="/de/homes/spain">A</a><a href="/guide/spain">B</a><a class="ls-card" href="/deal/x">C</a><table><tbody><tr><th><a href="/deal/y">D</a></th></tr></tbody></table>`;
    const out = markEnglish(html, "de", "auf Englisch").replace(/ data-lx/g, "");
    expect(out).toContain('<a href="/de/homes/spain">A</a>');
    expect(out).toContain('<a href="/guide/spain" hreflang="en">B <span class="lx-m" title="auf Englisch">EN</span></a>');
    expect(out).toContain('<a class="ls-card" href="/deal/x" hreflang="en">C</a>');
    expect(out).toContain('<a href="/deal/y" hreflang="en">D</a>');
    expect(visible(out)).not.toContain("EN");
  });
});
