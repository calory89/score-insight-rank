// Batch 13 of the list of 1,000 (26-nov-2026): files for AI assistants and open data (seo/reach/ai.ts, more.ts, llmsFull.ts).
import { describe, it, expect } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { changedToday, checkLlmsUrls, costsFile, fixLlmsHead, glossaryFile, homesCsv, insertBefore, intentSections, round3, scoreRange, securityTxt, writeAnswers } from "../../seo/reach/ai";
import { eventFeed, extras, homesJsonl, removedByMonth } from "../../seo/reach/more";
import { openApi, type Row } from "../../seo/reach/data";
import { htmlToText, wrongLanguageLines } from "../../seo/llmsFull";
import { TOPICS, topicPath } from "../../seo/knowledge/build";
import type { RemovedEvent } from "../../seo/reach/removed";

const home = (i: number, country: string, extra: Record<string, unknown> = {}): Row => ({ slug: `h${i}`, title: `Home ${i}`, country, location_name: `Town ${i}`, price_eur: 40000 + i * 1000, sqm: 70, bedrooms: 2, nota: 72 + i, lat: 37.123456, lng: -3.987654, approved_at: "2026-11-02T10:00:00Z", ...extra } as Row);
const rows: Row[] = [...Array.from({ length: 5 }, (_, i) => home(i, "Spain")), ...Array.from({ length: 3 }, (_, i) => home(10 + i, "Italy")), home(20, "Norway"), home(21, "Scandinavia")];

describe("llms.txt says what the rest of the site says", () => {
  it("one count of homes and countries, the real score range and the time of the build", () => {
    const txt = "# RealHunt\n\n> graded from 70 to 98 against every other home.\n\nToday: 10 homes in 4 countries. Updated 2026-11-26.\n\n## Key pages\n";
    const out = fixLlmsHead(txt, rows, "2026-11-26 16:20 UTC");
    expect(out).toContain("Today: 10 homes in 2 countries (a country counts from 3 homes). Updated 2026-11-26 16:20 UTC.");
    expect(out).toContain("graded from 72 to 93");
    expect(scoreRange([])).toBeNull();
  });
  it("lists the best pages by intent, only indexable ones, countries with most homes first", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "t13-"));
    for (const p of ["homes", "homes/spain", "homes/italy", "costs", "costs/spain"]) { fs.mkdirSync(path.join(root, p), { recursive: true }); fs.writeFileSync(path.join(root, p, "index.html"), `<title>Page ${p} | RealHunt</title>`); }
    const ok = new Set(["/homes", "/homes/spain", "/homes/italy", "/costs", "/costs/spain"].map((p) => "https://realhunt.co" + p));
    const md = intentSections(root, (u) => ok.has(u), rows, "en");
    expect(md).toContain("### To find homes\n\n- [Page homes](https://realhunt.co/homes)\n- [Page homes/spain](https://realhunt.co/homes/spain)\n- [Page homes/italy]");
    expect(md).toContain("### For buying costs");
    expect(md).not.toContain("### For buying rules"); // fewer than 2 pages
    expect(intentSections(root, (u) => ok.has(u), rows, "es")).toBe(""); // no Spanish page is indexable here
    expect(insertBefore("a\n## B\n", "## B", "X\n", "X")).toBe("a\nX\n## B\n");
    expect(insertBefore("a\nX\n## B\n", "## B", "X\n", "X")).toBe("a\nX\n## B\n");
  });
  it("finds the addresses that are neither indexable pages nor files, and the families it never names", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "t13b-"));
    fs.writeFileSync(path.join(root, "openapi.json"), "{}");
    const txt = "- [a](https://realhunt.co/homes/spain)\n- [b](https://realhunt.co/guide/atlantis)\n- https://realhunt.co/openapi.json, https://realhunt.co/data/none.json\n- https://realhunt.co/deal/<slug>.md\n- https://realhunt.co/deal/x.md";
    const r = checkLlmsUrls(root, txt, (u) => u.endsWith("/homes/spain"), [["country", "^/homes/[^/]+$"], ["guide", "^/guide(/|$)"], ["tools", "^/tools"], ["app", "."]]);
    expect(r.missing).toEqual(["/guide/atlantis", "/data/none.json"]);
    expect(r.families).toEqual({ country: 1, guide: 1 });
    expect(r.families_absent).toEqual(["tools"]);
  });
});

describe("open data", () => {
  it("homes.jsonl carries costs, risks and the last check, and rounds coordinates to 3 decimals", () => {
    const r = home(1, "Spain", { hoa_monthly: 120, hoa_currency: "USD", tax_annual: "2400", hoa_unknown: false, risks: { flood: { level: "medium" }, noise: { level: "low" } }, airport_km: 34, src_ok_at: "2026-11-20T01:27:30Z" });
    expect(extras(r)).toEqual({ monthly_fee: 120, yearly_tax: 2400, costs_currency: "USD", fee_unknown: false, flood_indicator: "medium", noise_indicator: "low", airport_km: 34, last_confirmed: "2026-11-20" });
    expect(extras(home(2, "Spain", { hoa_unknown: true }))).toMatchObject({ monthly_fee: null, yearly_tax: null, costs_currency: null, fee_unknown: true, last_confirmed: null });
    const lines = homesJsonl([r], "2026-11-26").trim().split("\n").map((l) => JSON.parse(l));
    expect(lines[1]).toMatchObject({ lat: 37.123, lng: -3.988, monthly_fee: 120, last_confirmed: "2026-11-20" });
    expect(round3(null)).toBeNull(); expect(round3("")).toBeNull(); expect(round3(1.23456)).toBe(1.235);
    const csv = homesCsv(homesJsonl([r], "2026-11-26"));
    expect(csv.split("\n")[0]).toContain("url,title,country"); expect(csv.split("\n")[1]).toContain("USD"); expect(csv.trim().split("\n")).toHaveLength(2);
  });
  it("openapi.json describes every new file and the line schema of homes.jsonl", () => {
    const o: any = openApi([{ k: "spain" } as any], "2026-11-26");
    for (const p of ["/data/homes.jsonl", "/data/homes.csv", "/data/countries.json", "/data/costs.json", "/data/can-i-buy.json", "/data/glossary.json", "/feeds/price-drops.json", "/llms/{country}.txt", "/answers/{slug}.md"]) expect(o.paths[p], p).toBeTruthy();
    expect(o.components.schemas.HomeLine.properties.last_confirmed).toBeTruthy();
    // a minimal OpenAPI 3.1 shape check (idea 648): every operation has an id and a 200 answer; every $ref resolves
    const ids = new Set<string>();
    for (const [p, v] of Object.entries<any>(o.paths)) { expect(p.startsWith("/")).toBe(true); const op = v.get; expect(op.operationId).toBeTruthy(); expect(ids.has(op.operationId)).toBe(false); ids.add(op.operationId); expect(op.responses["200"]).toBeTruthy();
      for (const prm of op.parameters || []) if (prm.in === "path") expect(p.includes(`{${prm.name}}`), `${p} ${prm.name}`).toBe(true); }
    for (const m of JSON.stringify(o).matchAll(/"\$ref":"#\/components\/schemas\/([A-Za-z]+)"/g)) expect(o.components.schemas[m[1]], m[1]).toBeTruthy();
    expect(o.openapi).toBe("3.1.0");
  });
  it("costs keep only the public fields; the glossary is a DefinedTermSet per indexable glossary", () => {
    const c: any = costsFile("2026-11-26", { _meta: { x: 1 }, spain: { purchase_costs_pct: "7-14", secret: "no", sources: ["https://x"] } });
    expect(c.countries).toEqual({ spain: { purchase_costs_pct: "7-14", sources: ["https://x"] } }); expect(c.license).toContain("by/4.0");
    const g: any = glossaryFile("2026-11-26", (u) => u.endsWith("/guide/glossary/spain"));
    expect(g["@graph"]).toHaveLength(1); expect(g["@graph"][0]["@type"]).toBe("DefinedTermSet"); expect(g["@graph"][0].hasDefinedTerm[0]["@type"]).toBe("DefinedTerm");
  });
  it("counts the log by month and writes the price-drop feed only with homes still on the site", () => {
    const ev: RemovedEvent[] = [{ date: "2026-10-30", kind: "removed", slug: "a", title: "A" }, { date: "2026-11-02", kind: "price", slug: "b", title: "B", price_eur: 90000, old_price_eur: 100000 }, { date: "2026-11-03", kind: "price", slug: "c", price_eur: 110000, old_price_eur: 100000 }, { date: "2026-11-04", kind: "price", slug: "gone", price_eur: 1, old_price_eur: 2 }];
    expect(removedByMonth(ev)).toEqual([{ month: "2026-10", gone: 0, removed: 1, back: 0, price_down: 0, price_up: 0 }, { month: "2026-11", gone: 0, removed: 0, back: 0, price_down: 2, price_up: 1 }]);
    const f = JSON.parse(eventFeed("drops", ev, new Set(["b", "c"])));
    expect(f.version).toContain("jsonfeed.org"); expect(f.items).toHaveLength(1); expect(f.items[0].title).toBe("€100,000 to €90,000 · B"); expect(f.items[0].content_text).toContain("(10%)");
    expect(JSON.parse(eventFeed("removed", ev, new Set())).items[0].url).toBe("https://realhunt.co/research/removed-homes");
  });
  it("security.txt expires in the future and names the public address; changed-today falls back to today's dates", () => {
    const s = securityTxt(new Date("2026-11-26T00:00:00Z"));
    expect(s).toMatch(/^Contact: mailto:\S+@\S+\nExpires: 2027-05-25T00:00:00.000Z/);
    const idx = new Map<string, string | null>([["https://realhunt.co/a", "2026-11-26"], ["https://realhunt.co/b", "2026-11-01"]]);
    expect(changedToday(idx, "2026-11-26")).toEqual(["https://realhunt.co/a"]);
    expect(changedToday(idx, "2026-11-26", { added: ["https://realhunt.co/z"], changed: [] })).toEqual(["https://realhunt.co/z"]);
  });
});

describe("answers and text files", () => {
  it("writes one short answer per indexable guide by subject, in both languages, with its sources", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "t13c-"));
    const t = TOPICS[0];
    const ok = new Set([`https://realhunt.co${topicPath(t)}`, `https://realhunt.co/es${topicPath(t)}`]);
    expect(writeAnswers(root, (u) => ok.has(u))).toEqual({ en: 1, es: 1 });
    const en = fs.readFileSync(path.join(root, "answers", `${t.slug}.md`), "utf8"), es = fs.readFileSync(path.join(root, "es/answers", `${t.slug}.md`), "utf8");
    expect(en).toContain(`Page: https://realhunt.co${topicPath(t)}`); expect(en).toContain("## Official sources"); expect(en).toContain("CC BY 4.0");
    expect(es).toContain("## Respuesta corta"); expect(es).not.toContain("Official sources");
    expect(fs.readFileSync(path.join(root, "answers/index.md"), "utf8")).toContain(`/answers/${t.slug}.md`);
  });
  it("clean text never keeps a relative link (idea 641) and the language check catches mixed lines (idea 614)", () => {
    const t = htmlToText('<p>See <a href="/guide/spain">the guide</a>, <a href="#x">here</a> and <a href="es/x">that</a>.</p>');
    expect(t).toContain("[the guide](https://realhunt.co/guide/spain)"); expect(t).not.toMatch(/\]\((?!https?:)/);
    expect(wrongLanguageLines("The median price is €50,000.\nLas casas están cerca del mar.", "en")).toEqual(["Las casas están cerca del mar."]);
    expect(wrongLanguageLines("El precio es 50.000 €.\nThe homes are near the sea.", "es")).toEqual(["The homes are near the sea."]);
    expect(wrongLanguageLines("- Casa de pueblo en Terque | Spain | €79,500 | 90 m² | 85 | https://realhunt.co/deal/x", "en")).toEqual([]);
  });
});
