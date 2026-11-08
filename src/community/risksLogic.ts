// Noise and flood risk of a home (8-nov-2026). Data: community_deals.risks, filled by scripts/risks.py.
// Pure helpers (tested in src/test/risks-logic.test.ts); the UI is in ./risks.tsx.
export type Level = "high" | "medium" | "low";
export type Noise = {
  level?: Level | null; motorway_m?: number | null; rail_m?: number | null; airport_km?: number | null;
  airport?: string | null; roads_checked?: boolean; source?: string;
};
export type Flood = {
  level?: Level | null; source?: string; zone?: string | null; note?: string; map?: string; map_name?: string;
  elev_m?: number | null; coast_km?: number | null; river_km?: number | null;
};
export type Risks = { noise?: Noise | null; flood?: Flood | null; updated?: string };
export type RiskRow = { risks?: Risks | string | null };

const LEVELS = new Set(["high", "medium", "low"]);
const lv = (v: unknown): Level | null => (typeof v === "string" && LEVELS.has(v) ? (v as Level) : null);

/** risks as an object, whether it arrived as JSON text or already parsed; null when missing or broken. */
export function risksOf(d: RiskRow | null | undefined): Risks | null {
  const r = d?.risks;
  if (!r) return null;
  if (typeof r === "string") { try { const o = JSON.parse(r); return o && typeof o === "object" ? o : null; } catch { return null; } }
  return typeof r === "object" ? r : null;
}

/** Same thresholds as scripts/risks.py: high < 150 m motorway/railway or < 2 km runway; medium < 400 m / < 5 km.
 *  null when roads were not checked and the airport alone does not make it medium or high. */
export function noiseLevel(n: Noise | null | undefined): Level | null {
  if (!n) return null;
  const lt = (v: number | null | undefined, lim: number) => typeof v === "number" && v < lim;
  if (lt(n.motorway_m, 150) || lt(n.rail_m, 150) || lt(n.airport_km, 2)) return "high";
  if (lt(n.motorway_m, 400) || lt(n.rail_m, 400) || lt(n.airport_km, 5)) return "medium";
  return n.roads_checked ? "low" : null;
}

/** FEMA flood zone code to level: A* and V* high, shaded X (0.2% a year, or behind a levee) medium, X low. */
export function femaLevel(zone: string | null | undefined): Level | null {
  const z = String(zone || "").trim().toUpperCase();
  if (!z) return null;
  if (/^[AV]/.test(z)) return "high";
  if (/^X\b/.test(z)) return /0\.2|LEVEE|SHADED/.test(z) ? "medium" : "low";
  return null;
}

export const floodLevel = (f: Flood | null | undefined): Level | null => lv(f?.level);
export const isOfficial = (f: Flood | null | undefined) => !!f && f.source !== "rough" && !!f.source;

/** True when noise or flood is high: shown as a chip on cards and hidden by the map toggle. */
export function isHighRisk(d: RiskRow | null | undefined): boolean {
  const r = risksOf(d);
  return !!r && (noiseLevel(r.noise) === "high" || floodLevel(r.flood) === "high");
}

/** Chips for cards: only high risks. */
export function cardRiskChips(d: RiskRow | null | undefined): { id: "noise" | "flood"; label: string; tip: string }[] {
  const r = risksOf(d);
  if (!r) return [];
  const out: { id: "noise" | "flood"; label: string; tip: string }[] = [];
  if (noiseLevel(r.noise) === "high") out.push({ id: "noise", label: "Noisy spot", tip: "Close to a motorway, railway or airport runway" });
  if (floodLevel(r.flood) === "high") out.push({ id: "flood", label: "Flood zone", tip: "In a high-risk flood zone on the official map" });
  return out;
}

/** "80 m", "1.2 km", "12 km". */
export function dist(m: number | null | undefined): string {
  if (typeof m !== "number" || !Number.isFinite(m)) return "";
  if (m < 1000) return `${Math.max(10, Math.round(m / 10) * 10)} m`;
  const km = m / 1000;
  return `${km < 10 ? km.toFixed(1).replace(/\.0$/, "") : Math.round(km)} km`;
}

/** The noise facts as [label, value] pairs, close ones first (nearest first), then the far ones. Roads/rail beyond 2 km read "over 2 km". */
export function noiseFacts(n: Noise | null | undefined): { k: "motorway" | "rail" | "airport"; label: string; value: string; far?: boolean }[] {
  if (!n) return [];
  const out: { k: "motorway" | "rail" | "airport"; label: string; value: string; far?: boolean; d: number }[] = [];
  if (n.roads_checked) {
    out.push(n.motorway_m != null ? { k: "motorway", label: "Motorway or main road", value: dist(n.motorway_m), d: n.motorway_m } : { k: "motorway", label: "Motorway or main road", value: "over 2 km", far: true, d: 2001 });
    out.push(n.rail_m != null ? { k: "rail", label: "Railway", value: dist(n.rail_m), d: n.rail_m } : { k: "rail", label: "Railway", value: "over 2 km", far: true, d: 2001 });
  }
  if (n.airport_km != null) out.push({ k: "airport", label: "Airport runway", value: dist(n.airport_km * 1000), d: n.airport_km * 1000, far: n.airport_km >= 5 });
  return out.sort((a, b) => Number(!!a.far) - Number(!!b.far) || a.d - b.d).map(({ d: _d, ...x }) => x);
}

/** Short reason the flood level was given, in plain English (translated through the es-extra dictionary). */
export function floodSummary(f: Flood | null | undefined): string {
  if (!f) return "";
  const l = floodLevel(f);
  if (isOfficial(f)) return l === "high" ? "High-risk flood zone" : l === "medium" ? "Moderate flood risk" : l === "low" ? "Minimal flood risk" : "Flood risk not mapped here";
  return l === "medium" ? "Low-lying, near water: check the official flood map" : l === "low" ? "Not low-lying near the sea or a big river" : "Not checked";
}
