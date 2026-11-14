import { describe, expect, it } from "vitest";
import { affordable, convertArea, fees, imt, irnrImputed, monthlyPayment, mortgageOrCash, notaireFr, progressive, runningCosts, schengen, sdlt } from "@/tools/logic";
import { FR, TOOLS, fmt, formHtml, readState, writeQuery } from "@/tools/defs";

describe("calculator sums", () => {
  it("UK stamp duty matches the GOV.UK examples", () => {
    expect(sdlt(295000).tax).toBe(4750);                                  // residential rates page, April 2025 example
    expect(sdlt(700000, { nonResident: true }).tax).toBe(39000);          // non-resident guidance, "Fifi"
    expect(sdlt(100000).tax).toBe(0);
    expect(sdlt(100000, { nonResident: true }).tax).toBe(2000);
    expect(sdlt(250000, { nonResident: true, additional: true }).tax).toBe(2500 + 250000 * 0.07);
    expect(sdlt(0).effective).toBe(0);
  });
  it("progressive bands only tax the slice inside each band", () => {
    const r = progressive(300, [[100, 0], [200, 10], [null, 20]]);
    expect(r.tax).toBe(30);
    expect(r.lines.map((l) => l.tax)).toEqual([0, 10, 20]);
    expect(progressive(-5, [[null, 10]]).tax).toBe(0);
  });
  it("Portugal IMT follows the 2026 official tables", () => {
    expect(imt(200000, "mainland", "other").tax).toBe(4605.5);
    expect(imt(200000, "mainland", "own").tax).toBe(3542.04);
    expect(imt(100000, "mainland", "own").tax).toBe(0);
    expect(imt(100000, "mainland", "other").tax).toBe(1000);
    expect(imt(106346, "mainland", "other").tax).toBeCloseTo(1063.46, 2);  // the table is continuous at a band edge
    expect(imt(106347, "mainland", "other").tax).toBeCloseTo(1063.48, 2);
    expect(imt(700000, "mainland", "other")).toMatchObject({ tax: 42000, flat: true });
    expect(imt(2000000, "islands", "own").tax).toBe(150000);
    expect(imt(150000, "islands", "other").tax).toBeCloseTo(150000 * 0.02 - 1329.33, 2);
  });
  it("French notary fee matches the Service-Public example", () => {
    const r = notaireFr(200000, { duties: 5.8, csi: FR.csi, debours: FR.debours });
    expect(r.emol).toBe(1995.25);
    expect(r.vat).toBe(399.05);
    expect(r.duties).toBe(11600);
    expect(r.csi).toBe(200);
    expect(r.lo).toBe(Math.round(1995.25 + 399.05 + 11600 + 200 + 800));
    expect(notaireFr(0, { duties: 5.8, csi: 0.1, debours: [800, 1200] }).hi).toBe(0);
  });
  it("Spanish imputed income", () => {
    expect(irnrImputed({ cadastral: 40000, revised: true, eea: true }).tax).toBe(83.6);
    expect(irnrImputed({ cadastral: 40000, revised: true, eea: false }).tax).toBe(105.6);
    expect(irnrImputed({ cadastral: 40000, revised: false, eea: false }).tax).toBe(192);
    expect(irnrImputed({ cadastral: 0, revised: false, eea: true, price: 100000 })).toMatchObject({ value: 50000, pct: 1.1, base: 550, tax: 104.5, noCad: true });
    expect(irnrImputed({ cadastral: 36500, revised: true, eea: true, days: 100 }).base).toBe(110);
  });
  it("Schengen 90/180 counts back from each day", () => {
    const stays: [string, string][] = [["2026-03-01", "2026-04-30"], ["2026-07-01", "2026-07-20"]];
    const r = schengen(stays, "2026-08-01");
    expect(r).toMatchObject({ ok: true, used: 81, left: 9, can: 9, lastDay: "2026-08-09", from: "2026-02-03", overstay: null, total: 81 });
    const later = schengen(stays, "2026-09-01");
    expect(later.ok && later.used).toBe(76);
    expect(schengen([], "2026-01-01")).toMatchObject({ used: 0, left: 90, can: 90, lastDay: "2026-03-31" });
    const over = schengen([["2026-01-01", "2026-04-15"]], "2026-04-15");
    expect(over).toMatchObject({ used: 105, left: 0, can: 0, overstay: "2026-04-01", peak: 105 });
    expect(schengen([["2026-05-10", "2026-05-01"], ["2026-01-01", ""]], "2026-06-01")).toMatchObject({ bad: 2, used: 0 });
    expect(schengen([["2026-01-01", "2026-01-10"], ["2026-01-05", "2026-01-12"]], "2026-02-01").total).toBe(12); // overlapping stays count once
    expect(schengen([], "nonsense").ok).toBe(false);
  });
  it("area units", () => {
    const c = convertArea(100, "sqm");
    expect(c.sqft).toBeCloseTo(1076.39, 2);
    expect(c.tsubo).toBeCloseTo(30.25, 2);
    expect(c.jo).toBeCloseTo(61.73, 2);
    expect(convertArea(1, "tsubo").sqm).toBeCloseTo(3.3058, 4);
    expect(convertArea(1, "acre").ha).toBeCloseTo(0.40469, 5);
  });
  it("mortgage, running costs and budget", () => {
    expect(monthlyPayment(56000, 4, 20)).toBeCloseTo(339.35, 2);
    expect(monthlyPayment(12000, 0, 1)).toBe(1000);
    const m = mortgageOrCash({ price: 80000, down: 30, rate: 4, years: 20 });
    expect(m.loan).toBe(56000);
    expect(m.totalMortgage).toBeCloseTo(24000 + m.monthly * 240, 6);
    expect(m.interest).toBeGreaterThan(25000);
    const r = runningCosts({ price: 30000, fees: 55 });
    expect(r.year).toBe(660);
    expect(r.yearsToPrice).toBeCloseTo(45.45, 2);
    expect(runningCosts({ oneoff: 5000, years: 5, trips: 4, trip: 250 }).year).toBe(2000);
    expect(runningCosts({}).yearsToPrice).toBe(0);
    expect(affordable(100000, [7.5, 14])).toEqual({ safe: 87719, best: 93023 });
    expect(fees(150000, [7.5, 14])).toEqual({ lo: 11250, hi: 21000, totalLo: 161250, totalHi: 171000 });
  });
});

describe("calculator pages", () => {
  const data = { c: { spain: { n: "Spain", r: [7.5, 14] as [number, number], y: "2026" }, italy: { n: "Italy", r: [9, 15] as [number, number], y: "2026" } }, prices: { spain: [40000, 90000, 200000], italy: [20000] }, today: "2026-11-14" };
  it("every tool renders its defaults in both languages, with a share card", () => {
    for (const lang of ["en", "es"] as const) for (const tool of Object.values(TOOLS)) {
      const k = fmt(lang), s = tool.defaults(data), out = tool.render(s, data, k);
      expect(out.html.length, tool.id).toBeGreaterThan(40);
      expect(out.html, tool.id).not.toMatch(/NaN|undefined|Infinity/);
      expect(out.card.title, tool.id).toBeTruthy();
      expect(formHtml(tool, data, k, s)).toContain('name="');
      expect(out.html).not.toContain("—");
    }
  });
  it("the state travels in the address and plain addresses mean the defaults", () => {
    const tool = TOOLS.costs, k = fmt("en");
    const s = readState(tool, data, k, "?p=90000&ccy=GBP&zzz=1", { c: "italy" });
    expect(s).toEqual({ c: "italy", p: "90000", ccy: "GBP" });
    const base = { ...tool.defaults(data), c: "italy" };
    expect(writeQuery(s, base, ["c"])).toBe("?p=90000&ccy=GBP");
    expect(writeQuery(base, base)).toBe("");
    expect(tool.render(s, data, k).html).toContain("£8,100 to £13,500");
    expect(readState(TOOLS.sdlt, {}, k, "?nr=0&add=1").add).toBe("1");
  });
  it("garbage in the address never breaks a result", () => {
    const k = fmt("es");
    for (const tool of Object.values(TOOLS)) {
      const s = readState(tool, data, k, "?" + tool.fields(k, data).map((f) => `${f.n}=%3Cscript%3E`).join("&"));
      const out = tool.render(s, data, k);
      expect(out.html).not.toContain("<script>");
      expect(out.html).not.toMatch(/NaN|undefined/);
    }
  });
  it("Spanish numbers use Spanish separators", () => {
    const k = fmt("es");
    expect(k.money(161250)).toBe("161.250 €");
    expect(k.pctRange([7.5, 14])).toBe("7,5-14 %");
    expect(k.date("2026-08-01")).toBe("1 de agosto de 2026");
  });
});
