// Active filters of the main feed as removable chips (mobile filter bar and bottom sheet, 7-nov-2026).
// Pure: takes the feed params, returns one chip per active filter with the params to apply when it is removed.
import type { FeedParams } from "./extras";
import { QUICK } from "./scores";
import { DIMS } from "./dims";
import { categories, money } from "./api";
import { readExtra, extraLabels, fill } from "./findFilters";

export type Chip = { key: string; label: string; next: FeedParams };
type T = (s: string) => string;

const SORTS: Record<string, string> = { new: "Newest", price_asc: "Cheapest", ppsqm: "Lowest price per m²", airport: "Nearest airport", sqm: "Biggest", drop: "Biggest price drop", sea: "Closest to the sea" };

export function activeChips(v: FeedParams, t: T = (s) => s): Chip[] {
  const out: Chip[] = [];
  const countries = String(v.country || "").split(",").filter(Boolean);
  for (const c of countries) out.push({ key: "country:" + c, label: c === "Scandinavia" ? t("Scandinavia · region") : c, next: { ...v, country: countries.filter((x) => x !== c).join(",") } });
  if (v.min_price || v.max_price) {
    const label = v.min_price && v.max_price ? `${money(v.min_price)} ${t("to")} ${money(v.max_price)}` : v.max_price ? `${t("up to")} ${money(v.max_price)}` : `${t("from")} ${money(v.min_price)}`;
    out.push({ key: "price", label, next: { ...v, min_price: null, max_price: null } });
  }
  if (v.category) out.push({ key: "category", label: t(categories.find((c) => c[0] === v.category)?.[1] || v.category), next: { ...v, category: "" } });
  if (v.min_beds) out.push({ key: "beds", label: `${v.min_beds}+ ${t("bedrooms")}`, next: { ...v, min_beds: null } });
  if (v.min_sqm) out.push({ key: "sqm", label: `${v.min_sqm} m²+`, next: { ...v, min_sqm: null } });
  if (v.price_drop) out.push({ key: "drop", label: t("Price dropped"), next: { ...v, price_drop: false } });
  if (v.costs === "known") out.push({ key: "costs", label: t("Fee or property tax stated"), next: { ...v, costs: "" } });
  if (v.costs === "nofee") out.push({ key: "costs", label: t("No community fee"), next: { ...v, costs: "" } });
  if (v.fresh) out.push({ key: "fresh", label: t("Confirmed in the last 30 days"), next: { ...v, fresh: false } });
  // 26-nov-2026 (batch 12, idea 564): fee, distance, quiet and type filters as removable chips too
  for (const x of extraLabels(readExtra(v as any))) out.push({ key: x.key, label: fill(t(x.label), x.vars), next: { ...v, [x.key]: x.key === "quiet" ? false : x.key === "ptype" ? "" : null } as FeedParams });
  for (const q of QUICK) {
    if (q.min && (v.min_score || 0) >= q.min) out.push({ key: "q:" + q.k, label: t(q.label), next: { ...v, min_score: null } });
    if (q.need && (v.need || []).includes(q.need)) out.push({ key: "q:" + q.k, label: t(q.label), next: { ...v, need: (v.need || []).filter((x) => x !== q.need) } });
    if (q.dim && (v.dim_min || {})[q.dim[0]] === q.dim[1]) {
      const d = { ...(v.dim_min || {}) }; delete d[q.dim[0]];
      out.push({ key: "q:" + q.k, label: t(q.label), next: { ...v, dim_min: d, sort: q.k === "air" && v.sort === "airport" ? "score" : v.sort } });
    }
  }
  if (v.sort && v.sort !== "score" && !(v.sort === "airport" && out.some((c) => c.key === "q:air"))) {
    const dim = v.sort.startsWith("dim:") ? DIMS.find(([k]) => k === v.sort!.slice(4))?.[1] : "";
    const label = SORTS[v.sort] ? t(SORTS[v.sort]) : dim ? `${t("Best")}: ${t(dim)}` : t("Sort");
    out.push({ key: "sort", label, next: { ...v, sort: "score" } });
  }
  return out;
}

/** Params with every filter cleared (scope and search text kept). */
export function clearedFilters(v: FeedParams): FeedParams {
  return { scope: v.scope, q: v.q, country: "", category: "", max_price: null, min_price: null, min_beds: null, price_drop: false, min_sqm: null, sort: "score", min_score: null, need: [], dim_min: {}, costs: "", fresh: false, fee: null, sea: null, air: null, quiet: false, ptype: "" };
}
