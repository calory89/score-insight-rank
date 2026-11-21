// Dutch and Polish listing pages (seo/listings/pack.nl.ts, pack.pl.ts, titles.<lang>.json, dest.<lang>.json).
import { describe, it, expect } from "vitest";
import fs from "fs";
import { englishIn, titlesOf, destTexts, titleIn } from "../../seo/listings/packkit";
import { listingRows } from "../../seo/listings/build";
import { planLangs } from "../../seo/langs/build";
import { UI } from "../../seo/langs/strings";
import { CONFIG } from "../../seo/langs/config";
import { nl } from "../../seo/listings/pack.nl";
import { pl, plPL } from "../../seo/listings/pack.pl";

const rows = listingRows();
const { langs } = planLangs(rows, () => true);
const of = (lang: string) => langs.find((l) => l.lang === lang)!;
const NB = " ";

describe("Polish numbers", () => {
  const f = (n: number) => plPL(n, "dom", "domy", "domów");
  it("1 takes the singular, 2 to 4 the plural, 5 and more the genitive plural", () => {
    expect([1, 2, 3, 4, 5, 6, 10].map(f)).toEqual(["dom", "domy", "domy", "domy", "domów", "domów", "domów"]);
  });
  it("12 to 14 take the genitive plural, 22 to 24 the plural again, 21 and 25 the genitive plural", () => {
    expect([11, 12, 13, 14, 15, 19, 20].map(f)).toEqual(Array(7).fill("domów"));
    expect([21, 22, 23, 24, 25].map(f)).toEqual(["domów", "domy", "domy", "domy", "domów"]);
    expect([100, 101, 102, 104, 105, 111, 112, 114, 122, 182, 211].map(f)).toEqual(["domów", "domów", "domy", "domy", "domów", "domów", "domów", "domów", "domy", "domy", "domów"]);
  });
  it("the pack counts offers, homes and bedrooms with the right form", () => {
    expect(pl.title("Tanie domy na sprzedaż w Hiszpanii", 1, `38${NB}000${NB}€`)).toContain(": 1 oferta od");
    expect(pl.title("Tanie domy na sprzedaż w Hiszpanii", 3, "x")).toContain(": 3 oferty od");
    expect(pl.title("Tanie domy na sprzedaż w Hiszpanii", 5, "x")).toContain(": 5 ofert od");
    expect(pl.title("Tanie domy na sprzedaż w Hiszpanii", 12, "x")).toContain(": 12 ofert od");
    expect(pl.title("Tanie domy na sprzedaż w Hiszpanii", 22, "x")).toContain(": 22 oferty od");
    expect(pl.fType(1, 12)).toBe("Rodzaj: 1 mieszkanie i 12 domów.");
    expect(pl.fType(3, 2)).toBe("Rodzaj: 3 mieszkania i 2 domy.");
    expect(pl.fType(5, 1)).toBe("Rodzaj: 5 mieszkań i 1 dom.");
    expect(pl.label({ kind: "beds", beds: 1 })).toBe("1 sypialnia");
    expect(pl.label({ kind: "beds", beds: 2 })).toBe("2 sypialnie");
    expect(pl.label({ kind: "beds", beds: 4 })).toBe("4 lub więcej sypialni");
    expect(pl.fNext("x", 1)).toContain("dochodzi jeszcze 1 oferta");
    expect(pl.fNext("x", 4)).toContain("dochodzą jeszcze 4 oferty");
    expect(pl.fNext("x", 6)).toContain("dochodzi jeszcze 6 ofert");
    expect(pl.gridMore(30, 182)).toContain("30 ofert z najwyższą oceną");
    expect(pl.gridMore(3, 9)).toContain("3 oferty z najwyższą oceną");
  });
  it("every Polish page says how many homes it has with the verb and the noun that number takes", () => {
    const first = (n: number, w: RegExp) => new RegExp(`^Na RealHunt (jest|są) dziś ${n} (${w.source})`);
    let seen = 0;
    for (const { f, T } of of("pl").pages) {
      if (f.ranked) continue;
      const n = f.homes.length, lede = T.lede[0];
      const few = plPL(n, "one", "few", "many") === "few";
      expect(lede.startsWith(`Na RealHunt ${few ? "są" : "jest"} dziś ${n} `), `${f.path}: ${lede}`).toBe(true);
      // the noun right after the number
      const m = first(n, /\S+/).exec(lede)!; const noun = m[2];
      if (/^dom/.test(noun) && !/^domk/.test(noun)) expect(noun, f.path).toBe(plPL(n, "dom", "domy", "domów"));
      if (/^mieszka/.test(noun)) expect(noun, f.path).toBe(plPL(n, "mieszkanie", "mieszkania", "mieszkań"));
      if (/^nieruchomo/.test(noun)) expect(noun, f.path).toBe(plPL(n, "nieruchomość", "nieruchomości", "nieruchomości"));
      seen++;
    }
    expect(seen).toBeGreaterThan(300);
  });
  it("asks about the cheapest home in the gender of its noun", () => {
    expect(pl.qCheapest("najtańszy dom na sprzedaż w Hiszpanii")).toBe("Jaki jest najtańszy dom na sprzedaż w Hiszpanii?");
    expect(pl.qCheapest("najtańsze mieszkanie na sprzedaż w Polsce")).toBe("Jakie jest najtańsze mieszkanie na sprzedaż w Polsce?");
    expect(pl.qCheapest("najtańsza nieruchomość na sprzedaż we Włoszech")).toBe("Jaka jest najtańsza nieruchomość na sprzedaż we Włoszech?");
  });
});

describe("how each language writes amounts, dates and places", () => {
  it("Dutch: € 50.000, 13 november 2026, de or het by the noun, u and never je", () => {
    expect(nl.money(50000)).toBe(`€${NB}50.000`);
    expect(nl.perSqm(1193)).toBe(`€${NB}1.193/m²`);
    expect(nl.date("2026-11-13")).toBe("13 november 2026");
    expect(nl.dateShort("2026-03-01")).toBe("1 mrt. 2026");
    expect(nl.ccy(50000, "GBP")).toBe("50.000 pond");
    expect(nl.inC("Cyprus")).toBe("op Cyprus");
    expect(nl.inC("United States")).toBe("in de Verenigde Staten");
    expect(nl.qCheapest("goedkoopste huis te koop in Spanje")).toBe("Wat is het goedkoopste huis te koop in Spanje?");
    expect(nl.qCheapest("goedkoopste dorpswoning te koop in Italië")).toBe("Wat is de goedkoopste dorpswoning te koop in Italië?");
    expect(nl.qPrice("instapklaar huis te koop in Spanje")).toBe("Wat kost een instapklaar huis in Spanje?");
    expect(nl.qCount("woningen met 2 slaapkamers te koop in Spanje")).toBe("Hoeveel woningen met 2 slaapkamers staan er te koop in Spanje?");
    expect(nl.fType(1, 12)).toBe("Type: 1 appartement en 12 huizen.");
    for (const { f, T } of of("nl").pages) expect(JSON.stringify(T), f.path).not.toMatch(/\b(je|jij|jou|jouw|jullie)\b/i);
    expect(JSON.stringify(UI.nl!.hub.faq) + UI.nl!.enHomes + UI.nl!.footAbout).not.toMatch(/\b(je|jij|jou|jouw|jullie)\b/i);
  });
  it("Polish: 50 000 €, no space in a four-digit amount, 13 listopada 2026, countries after their preposition", () => {
    expect(pl.money(50000)).toBe(`50${NB}000${NB}€`);
    expect(pl.money(9500)).toBe(`9500${NB}€`);
    expect(pl.money(1250000)).toBe(`1${NB}250${NB}000${NB}€`);
    expect(pl.date("2026-11-13")).toBe("13 listopada 2026");
    expect(pl.dateShort("2026-11-13")).toBe("13 lis 2026");
    expect(pl.ccy(50000, "GBP")).toBe(`50${NB}000 funtów`);
    expect(pl.inC("Italy")).toBe("we Włoszech");
    expect(pl.inC("Cyprus")).toBe("na Cyprze");
    expect(pl.inC("Germany")).toBe("w Niemczech");
    expect(pl.cCosts("7.5-14", "", "x", "a", "b", "c", "d")).toContain("to dodatkowo od 7,5 do 14% ceny");
    expect(pl.cCosts("10", "", "x", "a", "a", "c", "c")).toContain("to dodatkowo około 10% ceny");
  });
  it("names a region the way its language does, and leaves a town as the country writes it", () => {
    expect(nl.place("Tuscany")).toBe("Toscane");
    expect(nl.place("Lake Como")).toBe("Comomeer");
    expect(nl.place("near Ringsted", "denmark", "card")).toBe("bij Ringsted");
    expect(pl.place("Tuscany")).toBe("Toskania");
    expect(pl.place("Kavarna (Black Sea)")).toBe("Kavarna (Morze Czarne)");
    expect(pl.place("Alhama de Granada")).toBe("Alhama de Granada");
    const tuscany = of("pl").pages.find((p) => p.f.path === "/homes/italy/tuscany");
    // the noun follows the homes of the day (houses once 60% of them are houses, 22 Nov 2026); the place is what is tested here
    if (tuscany) expect(tuscany.T.h1).toMatch(/^(Nieruchomości|Domy|Mieszkania) na sprzedaż w Toskanii \(Włochy\)$/);
    const alicante = of("pl").pages.find((p) => p.f.path === "/homes/spain/alicante");
    if (alicante) expect(alicante.T.h1).toContain("w prowincji Alicante (Hiszpania)");
  });
});

describe("the translated titles and buying rules", () => {
  it("every home of today has a Dutch and a Polish title, with no English, no em dash and no empty text", () => {
    for (const lang of ["nl", "pl"] as const) {
      const t = titlesOf(lang);
      expect(rows.filter((r) => !titleIn(lang, r)).map((r) => r.slug), lang).toEqual([]);
      for (const [slug, e] of Object.entries(t)) {
        expect(e.t.length, slug).toBeGreaterThan(5);
        expect(e.t, slug).not.toMatch(/[—–]/);
        expect(englishIn(lang, e.t), `${lang} ${slug}: ${e.t}`).toEqual([]);
      }
    }
  });
  it("amounts inside the titles follow the language: € 60.000 in Dutch, 60 000 € in Polish, a comma for decimals", () => {
    for (const e of Object.values(titlesOf("nl"))) { expect(e.t).not.toMatch(/€\d|\d,\d{3}\b|\d\.\d m²|\d\.\d\s?%/); }
    for (const e of Object.values(titlesOf("pl"))) { expect(e.t).not.toMatch(/€\s?\d|\d[,.]\d{3}\b|\d\.\d m²|\d\.\d\s?%/); }
    const nlPrice = Object.values(titlesOf("nl")).filter((e) => /€/.test(e.t));
    expect(nlPrice.length).toBeGreaterThan(5);
    for (const e of nlPrice) expect(e.t).toMatch(/€ \d{1,3}\.\d{3}/);
    for (const e of Object.values(titlesOf("pl")).filter((x) => /€/.test(x.t))) expect(e.t).toMatch(/\d{2,3} 000 €/);
  });
  it("the buying rules of every country with homes are translated, with the numbers of the English file", () => {
    const en = JSON.parse(fs.readFileSync("src/data/destinations.json", "utf8"));
    const de = Object.keys(destTexts("de")).filter((k) => k !== "_note");
    const pcts = (x: string) => (String(x).match(/\d+[.,]\d+(?=\s?%)/g) || []).map((n) => n.replace(",", ".")).sort();
    const whole = (x: string) => [...new Set((String(x).match(/\b\d+(?=\s?%)/g) || []))].sort();
    for (const lang of ["nl", "pl"]) {
      const t = destTexts(lang);
      expect(Object.keys(t).filter((k) => k !== "_note").sort(), lang).toEqual([...de].sort());
      for (const cc of de) {
        expect(Object.keys(t[cc]).sort(), `${lang} ${cc}`).toEqual(Object.keys(destTexts("de")[cc]).sort());
        for (const k of ["purchase_costs_breakdown", "annual_property_tax"]) {
          for (const n of pcts(en[cc][k])) expect(pcts(t[cc][k]), `${lang} ${cc} ${k} ${n}`).toContain(n);
          for (const n of whole(en[cc][k])) expect(whole(t[cc][k]), `${lang} ${cc} ${k} ${n}%`).toContain(n);
        }
        for (const k of Object.keys(t[cc])) { expect(englishIn(lang as "nl" | "pl", t[cc][k]), `${lang} ${cc} ${k}`).toEqual([]); expect(t[cc][k]).not.toMatch(/[—–]/); }
      }
    }
  });
});

describe("which pages Dutch and Polish get", () => {
  it("no page is left out for a missing title or place name, and every country with homes has its page", () => {
    for (const lang of ["nl", "pl"]) {
      expect(of(lang).dropped.filter((d) => /title|place|buying rules/.test(d.why)), lang).toEqual([]);
      const cc = new Set(of(lang).pages.map((p) => p.f.cc).filter(Boolean));
      for (const c of ["spain", "italy", "sweden", "denmark", "france", "greece", "bulgaria", "poland", "germany", "portugal"]) expect(cc.has(c), `${lang} ${c}`).toBe(true);
    }
  });
  it("together they add at most 1,250 files to the deployment (pages, the page of all searches, llms.txt and the sitemap of each)", () => {
    const files = ["nl", "pl"].reduce((a, l) => a + Math.min(of(l).pages.length, CONFIG[l as "nl" | "pl"]!.max) + 3, 0);
    // 20-nov-2026: 1,050 before; raised so the families of 20 November do not push older Dutch and Polish pages out
    // (the file guard of seo/budget.ts still counts every file of the deployment)
    expect(files).toBeLessThanOrEqual(1250);
    expect((CONFIG.nl!.max + 3) + (CONFIG.pl!.max + 3)).toBeLessThanOrEqual(1250);
  });
  it("no title of a page repeats inside a language", () => {
    for (const lang of ["nl", "pl"]) { const t = of(lang).pages.map((p) => p.T.title); expect(new Set(t).size, lang).toBe(t.length); }
  });
});
