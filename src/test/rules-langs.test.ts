// Idea 92 of the second list (21 Nov 2026): no promised returns and no false hurry in any language of the site,
// titles included. The rules (seo/tech/rules.ts) run over every published page in the build audit; this test runs them
// over the texts kept in the repo: the translated home titles, the buying rules per language, the language packs, and
// the English and Spanish titles of every home in the snapshot.
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { textHits } from "../../seo/tech/rules";

const root = path.resolve(__dirname, "../..");
const strings = (v: unknown, out: string[] = []): string[] => {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => strings(x, out));
  return out;
};
const bad = (texts: string[]) => texts.flatMap((t) => textHits(t).filter((h) => h.rule === "fake_urgency" || h.rule === "promised_return").map((h) => `${h.rule}: ${h.what}`));

describe("no promised returns or false hurry in any language (idea 92)", () => {
  it("catches them in every language", () => {
    for (const t of ["Garantierte Rendite von 8 %", "Rendement garanti chaque année", "Gegarandeerd rendement", "Gwarantowany zysk z najmu", "Гарантированный доход от аренды",
      "Nur noch 2 übrig", "Dépêchez-vous", "Wees er snel bij", "Spiesz się", "Спешите, осталось всего 3"]) expect(bad([t]).length, t).toBe(1);
  });
  it("lets the opposite through", () => {
    for (const t of ["Keine garantierte Rendite: Mieten sind Schätzungen", "Pas de rendement garanti", "Geen gegarandeerd rendement", "Nie ma gwarantowanego zysku", "Мы не обещаем гарантированный доход"]) expect(bad([t]), t).toEqual([]);
  });
  for (const lang of ["de", "fr", "nl", "pl", "ru"]) {
    it(`finds none in the ${lang} titles, buying rules and pack`, () => {
      const texts = [
        ...strings(JSON.parse(fs.readFileSync(path.join(root, `seo/listings/titles.${lang}.json`), "utf8"))),
        ...strings(JSON.parse(fs.readFileSync(path.join(root, `seo/listings/dest.${lang}.json`), "utf8"))),
        ...[...fs.readFileSync(path.join(root, `seo/listings/pack.${lang}.ts`), "utf8").matchAll(/(["`])((?:(?!\1)[^\\]|\\.)*)\1/g)].map((m) => m[2]),
      ];
      expect(texts.length).toBeGreaterThan(50);
      expect(bad(texts)).toEqual([]);
    });
  }
  it("finds none in the interface words of the language pages (seo/langs/strings.ts)", () => {
    const src = fs.readFileSync(path.join(root, "seo/langs/strings.ts"), "utf8");
    const texts = [...src.matchAll(/(["`])((?:(?!\1)[^\\]|\\.)*)\1/g)].map((m) => m[2]);
    expect(texts.length).toBeGreaterThan(50);
    expect(bad(texts)).toEqual([]);
  });
  it("finds none in the titles and texts of the homes (English and Spanish)", () => {
    const rows: any[] = JSON.parse(fs.readFileSync(path.join(root, "public/data/rh-static.json"), "utf8")).rows || [];
    expect(bad(rows.flatMap((r) => [r.title, r.title_es, r.why_great, r.why_great_es, r.pick_note].filter(Boolean)))).toEqual([]);
  });
});
