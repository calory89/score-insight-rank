// The dated exchange rates behind the budgets in pounds and dollars (seo/listings/fx.json, ECB reference rates).
import fs from "fs";
import path from "path";

export type Fx = { date: string; source: string; rates: Record<string, number> };
export const ECB_XML = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml";
const FILE = "seo/listings/fx.json";

export function loadFx(root = process.cwd()): Fx {
  try {
    const j = JSON.parse(fs.readFileSync(path.resolve(root, FILE), "utf8"));
    const rates: Record<string, number> = {};
    for (const [k, v] of Object.entries(j.rates || {})) if (typeof v === "number" && v > 0) rates[k] = v;
    return { date: String(j.date || ""), source: String(j.source || ""), rates };
  } catch { return { date: "", source: "", rates: {} }; }
}

/** The ECB daily file -> { date, rates } for the currencies we use, or null when it does not parse. */
export function parseEcb(xml: string, want = ["USD", "GBP"]): { date: string; rates: Record<string, number> } | null {
  const date = /<Cube\s+time=['"](\d{4}-\d{2}-\d{2})['"]/.exec(xml)?.[1];
  if (!date) return null;
  const rates: Record<string, number> = {};
  for (const c of want) { const m = new RegExp(`currency=['"]${c}['"]\\s+rate=['"]([0-9.]+)['"]`).exec(xml); const v = m ? Number(m[1]) : 0; if (!(v > 0)) return null; rates[c] = v; }
  return { date, rates };
}

/** Daily job: refresh fx.json from the ECB. Never fails the job: on any problem the old rates stay. */
export async function refreshFx(root = process.cwd()): Promise<string> {
  try {
    const r = await fetch(ECB_XML, { signal: AbortSignal.timeout(15000) });
    if (!r.ok) return `kept (HTTP ${r.status})`;
    const got = parseEcb(await r.text());
    if (!got) return "kept (could not read the ECB file)";
    const file = path.resolve(root, FILE);
    const old = JSON.parse(fs.readFileSync(file, "utf8"));
    // a rate that moved more than 15% in one refresh is a parsing problem, not the market
    for (const [k, v] of Object.entries(got.rates)) { const o = Number(old.rates?.[k]); if (o > 0 && Math.abs(v / o - 1) > 0.15) return `kept (${k} moved too far: ${o} -> ${v})`; }
    if (old.date === got.date) return `already at ${got.date}`;
    fs.writeFileSync(file, JSON.stringify({ ...old, date: got.date, rates: got.rates }, null, 1) + "\n");
    return `updated to ${got.date}`;
  } catch (e) { return `kept (${(e as Error).message})`; }
}

const MONTHS_ES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
/** A euro price in US dollars at the dated ECB rate, rounded to 100, with the day of the rate in Spanish; null without a rate. */
export function usdApprox(eur: number, fx: Fx): { usd: number; day: string } | null {
  const rate = fx.rates.USD; const d = fx.date;
  if (!(rate > 0) || !(eur > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  return { usd: Math.round((eur * rate) / 100) * 100, day: `${Number(d.slice(8, 10))} de ${MONTHS_ES[Number(d.slice(5, 7)) - 1]} de ${d.slice(0, 4)}` };
}
