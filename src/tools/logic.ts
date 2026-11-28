// The sums behind the free calculators (/tools/..., /buying-costs/...). Pure functions, no DOM, tested in
// src/test/tools-logic.test.ts. Every rate here was read on the official page named next to it, on the date given;
// rates that come from src/data (destinations.json) are passed in by the caller, never typed here.

export type Band = [number | null, number];
export type BandLine = { from: number; to: number; rate: number; tax: number };

/** A tax charged by slices: each band's rate applies only to the part of the amount inside it. `add` is a surcharge
 * in points on every band. */
export function progressive(amount: number, bands: Band[], add = 0): { tax: number; lines: BandLine[] } {
  const a = Math.max(0, Number(amount) || 0);
  let prev = 0, tax = 0; const lines: BandLine[] = [];
  for (const [to, rate] of bands) {
    const top = to == null ? a : Math.min(a, to);
    if (top > prev) { const part = (top - prev) * (rate + add) / 100; lines.push({ from: prev, to: top, rate: rate + add, tax: part }); tax += part; }
    if (to == null || a <= to) break;
    prev = to;
  }
  return { tax: Math.round(tax * 100) / 100, lines };
}

// ---------------------------------------------------------------- United Kingdom: Stamp Duty Land Tax
// GOV.UK, "Stamp Duty Land Tax: residential property rates" and "Rates of Stamp Duty Land Tax for non-UK residents",
// read 14 Nov 2026 (rates in force since 1 April 2025). England and Northern Ireland only.
export const SDLT = {
  bands: [[125000, 0], [250000, 2], [925000, 5], [1500000, 10], [null, 12]] as Band[],
  nonResident: 2, additional: 5, since: "2025-04-01", read: "2026-11-14",
  sources: ["https://www.gov.uk/stamp-duty-land-tax/residential-property-rates", "https://www.gov.uk/guidance/rates-of-stamp-duty-land-tax-for-non-uk-residents"],
};
export function sdlt(price: number, o: { nonResident?: boolean; additional?: boolean } = {}) {
  const add = (o.nonResident ? SDLT.nonResident : 0) + (o.additional ? SDLT.additional : 0);
  const r = progressive(price, SDLT.bands, add);
  return { ...r, add, effective: price > 0 ? (r.tax / price) * 100 : 0 };
}

// ---------------------------------------------------------------- Portugal: IMT (property transfer tax)
// Autoridade Tributária e Aduaneira, Ofício Circulado 40129/2026 of 6 Jan 2026, "IMT - tabelas práticas em vigor a
// partir de 01 de janeiro de 2026" (read 14 Nov 2026). Row: [up to, marginal rate %, amount to subtract]; a row with
// null as the amount is a single rate on the whole value.
export type ImtRow = [number | null, number, number | null];
export const IMT = {
  year: 2026, read: "2026-11-14",
  source: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/legislacao/instrucoes_administrativas/Documents/Oficio_circulado_40129_2026.pdf",
  tables: {
    mainland: {
      own: [[106346, 0, 0], [145470, 2, 2126.92], [198347, 5, 6491.02], [330539, 7, 10457.96], [660982, 8, 13763.35], [1150853, 6, null], [null, 7.5, null]] as ImtRow[],
      other: [[106346, 1, 0], [145470, 2, 1063.46], [198347, 5, 5427.56], [330539, 7, 9394.5], [633931, 8, 12699.89], [1150853, 6, null], [null, 7.5, null]] as ImtRow[],
    },
    islands: {
      own: [[132933, 0, 0], [181838, 2, 2658.66], [247934, 5, 8113.8], [413174, 7, 13072.48], [826228, 8, 17204.22], [1438566, 6, null], [null, 7.5, null]] as ImtRow[],
      other: [[132933, 1, 0], [181838, 2, 1329.33], [247934, 5, 6784.47], [413174, 7, 11743.15], [792414, 8, 15874.89], [1438566, 6, null], [null, 7.5, null]] as ImtRow[],
    },
  },
};
export function imt(value: number, region: "mainland" | "islands" = "mainland", use: "own" | "other" = "other") {
  const v = Math.max(0, Number(value) || 0);
  const table = IMT.tables[region]?.[use] || IMT.tables.mainland.other;
  const row = table.find(([to]) => to == null || v <= to)!;
  const flat = row[2] == null;
  const tax = Math.max(0, Math.round((v * row[1] / 100 - (row[2] || 0)) * 100) / 100);
  return { tax, rate: row[1], deduct: row[2] || 0, flat, effective: v > 0 ? (tax / v) * 100 : 0 };
}

// ---------------------------------------------------------------- France: the notary's regulated fee (émoluments)
// Service-Public.fr, "Frais de notaire" (F17701), checked by the site on 5 Aug 2026, read 14 Nov 2026: scale in force
// since 1 Jan 2021 for mainland France, plus 20% VAT. Transfer duties and the 0.10% land-registry contribution come
// from src/data/destinations.json and are passed in.
export const NOTAIRE = { bands: [[6500, 3.87], [17000, 1.596], [60000, 1.064], [null, 0.799]] as Band[], vat: 20, read: "2026-11-14", source: "https://www.service-public.fr/particuliers/vosdroits/F17701" };
export function notaireFr(price: number, o: { duties: number; csi: number; debours: [number, number] }) {
  const p = Math.max(0, Number(price) || 0);
  const emol = progressive(p, NOTAIRE.bands);
  const vat = Math.round(emol.tax * NOTAIRE.vat) / 100;
  const duties = Math.round(p * o.duties) / 100, csi = Math.round(p * o.csi) / 100;
  const fixed = emol.tax + vat + duties + csi;
  const deb: [number, number] = p > 0 ? o.debours : [0, 0];
  return { emol: emol.tax, lines: emol.lines, vat, duties, csi, lo: Math.round(fixed + deb[0]), hi: Math.round(fixed + deb[1]), pctLo: p ? ((fixed + deb[0]) / p) * 100 : 0, pctHi: p ? ((fixed + deb[1]) / p) * 100 : 0 };
}

// ---------------------------------------------------------------- Spain: imputed income of a non-resident owner
// Agencia Tributaria, "Imputed rental income from an urban property for own use" (IRNR without permanent
// establishment), read 14 Nov 2026: 1.1% of the cadastral value where it was revised in the tax period or the ten
// before it, 2% otherwise; taxed at 19% (residents of the EU, Iceland, Norway, Liechtenstein) or 24% (others); in
// proportion to the days owned and not let. Without a cadastral value: 1.1% of half the purchase price.
export const IRNR = { revised: 1.1, other: 2, eea: 19, rest: 24, read: "2026-11-14",
  source: "https://sede.agenciatributaria.gob.es/Sede/en_gb/no-residentes/irnr-sin-establecimiento-permanente/cuestiones-especificas-sobre-tributacion-inmuebles/renta-imputada-inmueble-urbano-uso-propio.html" };
export function irnrImputed(o: { cadastral: number; revised: boolean; eea: boolean; days?: number; price?: number }) {
  const days = Math.min(365, Math.max(0, o.days == null ? 365 : Number(o.days) || 0));
  const noCad = !(o.cadastral > 0);
  const value = noCad ? Math.max(0, Number(o.price) || 0) / 2 : o.cadastral;
  const pct = noCad || o.revised ? IRNR.revised : IRNR.other;
  const base = Math.round(value * pct * (days / 365)) / 100;
  const rate = o.eea ? IRNR.eea : IRNR.rest;
  return { value, pct, base, rate, tax: Math.round(base * rate) / 100, days, noCad };
}

// ---------------------------------------------------------------- Schengen: 90 days in any 180
// European Commission, DG Migration and Home Affairs, "Short-stay calculator" (page dated 13 Nov 2025, read 14 Nov
// 2026): "You must count back 180 days from each day of your stay and ensure the total number does not exceed 90."
// This tool counts the day of entry and the day of exit as days of stay.
export const SCHENGEN = { max: 90, window: 180, read: "2026-11-14", source: "https://home-affairs.ec.europa.eu/policies/schengen/border-crossing/short-stay-calculator_en" };
export const dayNum = (iso: string): number => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || "")); return m ? Math.round(Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86400000) : NaN; };
export const dayIso = (n: number): string => new Date(n * 86400000).toISOString().slice(0, 10);
export function schengen(stays: [string, string][], check: string) {
  const days = new Set<number>(); let bad = 0;
  for (const [a, b] of stays) { const x = dayNum(a), y = dayNum(b); if (!Number.isFinite(x) || !Number.isFinite(y) || y < x || y - x > 3660) { if (a || b) bad++; continue; } for (let d = x; d <= y; d++) days.add(d); }
  const used = (d: number, extra?: Set<number>) => { let n = 0; for (let i = d - SCHENGEN.window + 1; i <= d; i++) if (days.has(i) || extra?.has(i)) n++; return n; };
  const c = dayNum(check);
  const sorted = [...days].sort((p, q) => p - q);
  let overstay: number | null = null, peak = 0;
  for (const d of sorted) { const u = used(d); if (u > peak) peak = u; if (overstay == null && u > SCHENGEN.max) overstay = d; }
  if (!Number.isFinite(c)) return { ok: false as const, bad, total: days.size, overstay: overstay == null ? null : dayIso(overstay), peak };
  // how many days in a row, starting on the check date, stay inside the rule
  const extra = new Set<number>(); let can = 0;
  for (let d = c; can < SCHENGEN.max; d++) { extra.add(d); if (used(d, extra) > SCHENGEN.max) { extra.delete(d); break; } can++; }
  const u = used(c);
  return { ok: true as const, bad, total: days.size, used: u, left: Math.max(0, SCHENGEN.max - u), from: dayIso(c - SCHENGEN.window + 1), can, lastDay: can ? dayIso(c + can - 1) : null, overstay: overstay == null ? null : dayIso(overstay), peak };
}

// ---------------------------------------------------------------- area units
// Square foot: the international foot is 0.3048 m exactly. Tsubo: 6 x 6 shaku with the shaku fixed at 10/33 m, so
// 400/121 m². Tatami (jo) in Japanese property advertising: at least 1.62 m² per mat (Fair Competition Code on
// Real Estate Representations, enforcement rules, as published by the Real Estate Fair Trade Council, read 14 Nov 2026).
export const AREA: Record<string, number> = { sqm: 1, sqft: 0.09290304, tsubo: 400 / 121, jo: 1.62, acre: 4046.8564224, ha: 10000 };
export const AREA_SOURCE = "https://www.sfkoutori.or.jp/webkanri/kanri/wp-content/uploads/2019/01/h_sekoukisoku.pdf";
export function convertArea(value: number, from: string): Record<string, number> {
  const sqm = Math.max(0, Number(value) || 0) * (AREA[from] || 1);
  return Object.fromEntries(Object.entries(AREA).map(([k, f]) => [k, sqm / f]));
}

// ---------------------------------------------------------------- money sums with the visitor's own numbers
/** Monthly payment of a loan with a fixed rate (the same formula as the mortgage box on each home page). */
export function monthlyPayment(loan: number, ratePct: number, years: number) {
  const n = Math.max(1, Math.round(years * 12)), r = ratePct / 100 / 12;
  return loan <= 0 ? 0 : r === 0 ? loan / n : (loan * r) / (1 - Math.pow(1 + r, -n));
}
export function mortgageOrCash(o: { price: number; down: number; rate: number; years: number; setup?: number }) {
  const price = Math.max(0, o.price), downPct = Math.min(100, Math.max(0, o.down));
  const deposit = price * downPct / 100, loan = price - deposit;
  const monthly = monthlyPayment(loan, o.rate, o.years), n = Math.max(1, Math.round(o.years * 12));
  const paid = monthly * n, interest = Math.max(0, paid - loan), setup = Math.max(0, o.setup || 0);
  return { deposit, loan, monthly, interest, setup, extra: interest + setup, totalMortgage: deposit + paid + setup, totalCash: price, kept: loan };
}
/** Years of the visitor's own rent that add up to the price of a home with its buying costs. */
export function rentYears(o: { price: number; rent: number; costsPct?: number }) {
  const price = Math.max(0, o.price), rent = Math.max(0, o.rent), pct = Math.min(60, Math.max(0, o.costsPct ?? 0));
  const total = price * (1 + pct / 100), year = rent * 12;
  const months = rent > 0 ? Math.ceil(total / rent) : 0;
  return { total, costs: total - price, year, months, years: rent > 0 ? total / year : 0 };
}
/** What is left after selling the home the visitor owns and buying a cheaper one with its buying costs. */
export function sellAndMove(o: { value: number; debt?: number; sellPct?: number; price: number; buyPct?: number }) {
  const value = Math.max(0, o.value), debt = Math.max(0, o.debt || 0);
  const sellPct = Math.min(60, Math.max(0, o.sellPct ?? 0)), buyPct = Math.min(60, Math.max(0, o.buyPct ?? 0));
  const sellCosts = value * sellPct / 100, cash = value - sellCosts - debt;
  const price = Math.max(0, o.price), buyCosts = price * buyPct / 100, total = price + buyCosts;
  return { sellCosts, cash, buyCosts, total, left: cash - total, enough: cash >= total, homes: total > 0 ? Math.max(0, Math.floor(cash / total)) : 0 };
}
/** What a home costs to keep each year, from the owner's own figures, and how many years of those costs add up to
 * the price paid. */
export function runningCosts(o: { price?: number; tax?: number; fees?: number; insurance?: number; utilities?: number; upkeep?: number; trips?: number; trip?: number; oneoff?: number; years?: number }) {
  const v = (x?: number) => Math.max(0, Number(x) || 0);
  const lines = { tax: v(o.tax), fees: v(o.fees) * 12, insurance: v(o.insurance), utilities: v(o.utilities) * 12, upkeep: v(o.upkeep), travel: v(o.trips) * v(o.trip), oneoff: v(o.oneoff) / Math.max(1, v(o.years) || 1) };
  const year = Object.values(lines).reduce((a, b) => a + b, 0);
  const price = v(o.price);
  return { lines, year, month: year / 12, pct: price ? (year / price) * 100 : 0, yearsToPrice: year > 0 && price > 0 ? price / year : 0 };
}
/** The highest price that still fits a total budget once the buying costs (a range in % of the price) are added. */
export function affordable(budget: number, r: [number, number]) {
  const b = Math.max(0, Number(budget) || 0);
  return { safe: Math.floor(b / (1 + r[1] / 100)), best: Math.floor(b / (1 + r[0] / 100)) };
}
/** Buying costs for a price and a range in %: the same sum as src/community/seo2data.ts buyingCosts. */
export function fees(price: number, r: [number, number]) {
  const p = Math.max(0, Number(price) || 0);
  const lo = Math.round(p * r[0] / 100), hi = Math.round(p * r[1] / 100);
  return { lo, hi, totalLo: p + lo, totalHi: p + hi };
}
