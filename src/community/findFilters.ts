// Extra feed filters (26-nov-2026, list of 1,000, batch 12: ideas 552, 553, 554, 556, 566).
// Pure and shared by the in-browser feed (src/lib/static-db.ts), the filter panel (extras.tsx), the chips
// (filterChips.ts) and the address bar (Community.tsx). Every rule only uses data the snapshot already has:
//   fee   max monthly community fee in €: keeps homes whose fee is stated and at most this, or that have no fee
//         (a stated "no fee": hoa_unknown false and no amount). Homes whose fee is unknown are left out.
//   sea   max km to the sea, from nearby.sea_km or risks.flood.coast_km (straight line). Unknown = left out.
//   air   max km to an airport (airport_km or nearby.airport.km, straight line). Unknown = left out.
//   quiet no motorway or railway close by: risks.noise.level "low". Unknown = left out.
//   ptype property type (house, flat, villa...), the normalised list below.
type Row = Record<string, any>;

const num = (v: unknown): number | null => { if (v == null || v === "") return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
export const USD_EUR = 0.896; // same rate as src/community/checkLogic.ts

/** Property types the filter offers, in this order. Rare raw values are folded into the closest one. */
export const PTYPES: [string, string][] = [["house", "House"], ["flat", "Flat"], ["villa", "Villa"], ["townhouse", "Townhouse"], ["cottage", "Cottage or cabin"], ["farmhouse", "Farmhouse"], ["studio", "Studio"]];
const PTYPE_OF: Record<string, string> = {
  house: "house", bungalow: "house", chalet: "house", duplex: "flat", flat: "flat", apartment: "flat", penthouse: "flat", loft: "flat",
  villa: "villa", townhouse: "townhouse", cottage: "cottage", cabin: "cottage", farmhouse: "farmhouse", studio: "studio",
};
export const ptypeOf = (r: Row): string => PTYPE_OF[String(r.property_type || "").toLowerCase()] || "";

/** Straight-line km to the sea, or null when we do not know it. */
export function seaKm(r: Row): number | null {
  return num(r.nearby?.sea_km) ?? num(r.risks?.flood?.coast_km);
}
export function airKm(r: Row): number | null {
  return num(r.airport_km) ?? num(r.nearby?.airport?.km);
}
/** Monthly community fee in €: a number, 0 when the listing says there is none, null when unknown. */
export function feeEur(r: Row): number | null {
  const n = num(r.hoa_monthly);
  if (n != null && n > 0) { const c = String(r.hoa_currency || "EUR").toUpperCase(); return c === "USD" ? n * USD_EUR : c === "EUR" ? n : null; }
  return r.hoa_unknown ? null : 0;
}
export const isQuiet = (r: Row) => String(r.risks?.noise?.level || "") === "low";

export type ExtraParams = { fee?: number | null; sea?: number | null; air?: number | null; quiet?: boolean; ptype?: string };
export const EXTRA_KEYS = ["fee", "sea", "air", "quiet", "ptype"] as const;

export function readExtra(p: Row = {}): ExtraParams {
  const pos = (v: unknown) => { const n = num(v); return n != null && n > 0 ? n : null; };
  const ptype = String(p.ptype || "");
  const fee = num(p.fee);
  return { fee: fee != null && fee >= 0 ? fee : null, sea: pos(p.sea), air: pos(p.air), quiet: p.quiet === true || p.quiet === "1", ptype: PTYPES.some(([k]) => k === ptype) ? ptype : "" };
}

export function extraMatch(r: Row, x: ExtraParams): boolean {
  if (x.fee != null) { const f = feeEur(r); if (f == null || f > x.fee) return false; }
  if (x.sea != null) { const k = seaKm(r); if (k == null || k > x.sea) return false; }
  if (x.air != null) { const k = airKm(r); if (k == null || k > x.air) return false; }
  if (x.quiet && !isQuiet(r)) return false;
  if (x.ptype && ptypeOf(r) !== x.ptype) return false;
  return true;
}

/** Sort keys added here (the feed already has score, new, price_asc, ppsqm, airport, sqm). */
export function extraSort(sort: string, a: Row, b: Row): number | null {
  if (sort === "drop") return (num(b.price_drop) || 0) - (num(a.price_drop) || 0);
  if (sort === "sea") return (seaKm(a) ?? 1e6) - (seaKm(b) ?? 1e6);
  return null;
}

/** URL value <-> feed value. Empty strings mean "off". */
export function extraToUrl(x: ExtraParams): Record<string, string> {
  return { fee: x.fee != null ? String(x.fee) : "", sea: x.sea ? String(x.sea) : "", air: x.air ? String(x.air) : "", quiet: x.quiet ? "1" : "", ptype: x.ptype || "" };
}
export function extraFromUrl(sp: URLSearchParams): ExtraParams {
  return readExtra({ fee: sp.get("fee"), sea: sp.get("sea"), air: sp.get("air"), quiet: sp.get("quiet"), ptype: sp.get("ptype") });
}

export const FEE_STEPS = [0, 50, 100, 200, 300];
export const SEA_STEPS = [1, 5, 10, 25];
export const AIR_STEPS = [30, 60, 100];

/** Labels of the active extra filters, in English (callers translate with t()). */
export function extraLabels(x: ExtraParams): { key: keyof ExtraParams; label: string; vars?: Record<string, string> }[] {
  const out: { key: keyof ExtraParams; label: string; vars?: Record<string, string> }[] = [];
  if (x.fee != null) out.push(x.fee === 0 ? { key: "fee", label: "No community fee" } : { key: "fee", label: "Fee up to €{n}/month", vars: { n: String(x.fee) } });
  if (x.sea) out.push({ key: "sea", label: "Up to {n} km from the sea", vars: { n: String(x.sea) } });
  if (x.air) out.push({ key: "air", label: "Up to {n} km from an airport", vars: { n: String(x.air) } });
  if (x.quiet) out.push({ key: "quiet", label: "No motorway or railway nearby" });
  if (x.ptype) out.push({ key: "ptype", label: PTYPES.find(([k]) => k === x.ptype)?.[1] || x.ptype });
  return out;
}
export const fill = (s: string, vars?: Record<string, string>) => (vars ? s.replace(/\{(\w+)\}/g, (_m, k) => vars[k] ?? "") : s);
