// Live web search, client logic (8-nov-2026). Pure functions only, tested in src/test/livesearch-ui.test.ts.
// The search itself runs in the edge function realhunt-live-search; its parser lives in core.ts there and is
// imported here so the page shows the same understanding of the sentence before the server answers.
import { parseLiveQuery, type LiveQuery } from "../../supabase/functions/realhunt-live-search/core";
import { FILTER_KEYS } from "./smartsearch";

export { parseLiveQuery, type LiveQuery };
export const SHOW_MIN = 80;
export const LIVE_FREE_KEY = "rh.live.used";

export type LiveResult = {
  id: string; source: "realhunt" | "earlier" | "web"; provider: string; url: string; deal_slug: string | null; title: string; price: number | null; currency: string;
  price_eur: number | null; beds: number | null; sqm: number | null; location: string; country: string | null; kind: "buy" | "rent"; image: string | null; photos: number | null;
  score: number; parts?: Record<string, number>; found_at: string;
};
export type LiveStatus = { job_id?: string; status: string; progress?: number; stage?: { k: string; n?: number; of?: number } | null; results?: LiveResult[]; found?: number; hidden?: number; note?: string | null; parsed?: LiveQuery; reason?: string };

type HomeRow = { slug: string; title?: string; price_eur?: number | null; country?: string | null; location_name?: string | null; bedrooms?: number | null; nota?: number | null; [k: string]: any };
const n = (s: unknown) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * The homes we already have that are closest to the search, best first: same place (+4), same country (+2),
 * within the budget (+2, or +1 up to 25 % over), enough bedrooms (+1). Ties go to the higher RealHunt score.
 * With no place or country match it falls back to the same price band, then to the best homes overall.
 */
export function similarHomes<T extends HomeRow>(rows: T[], p: LiveQuery, limit = 6, minScore = 0): T[] {
  const place = n(p.city || p.place || "");
  const pool = rows.filter((r) => (Number(r.nota) || 0) >= minScore);
  const scored = pool.map((r) => {
    let s = 0;
    const where = n(`${r.location_name || ""} ${r.title || ""}`);
    if (place && where.includes(place)) s += 4;
    if (p.country && n(r.country) === n(p.country)) s += 2;
    const price = Number(r.price_eur) || 0;
    if (p.max_eur && price) s += price <= p.max_eur ? 2 : price <= p.max_eur * 1.25 ? 1 : 0;
    if (p.min_beds && (Number(r.bedrooms) || 0) >= p.min_beds) s += 1;
    return { r, s, geo: (place && where.includes(place)) || (p.country && n(r.country) === n(p.country)) };
  });
  const anyGeo = scored.some((x) => x.geo);
  const list = anyGeo ? scored.filter((x) => x.geo) : scored.filter((x) => x.s > 0).length ? scored.filter((x) => x.s > 0) : scored;
  return list.sort((a, b) => b.s - a.s || (Number(b.r.nota) || 0) - (Number(a.r.nota) || 0)).slice(0, limit).map((x) => x.r);
}

const money = (v: number, cur: string) => {
  try { return new Intl.NumberFormat("en-IE", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(v); } catch { return `${Math.round(v).toLocaleString("en")} ${cur}`; }
};
export const fmtMoney = money;

/** Human chips for what the search understood (each is a static English string for t(), plus a value). */
export function liveChips(p: LiveQuery): { k: string; label: string; value?: string }[] {
  const out: { k: string; label: string; value?: string }[] = [];
  out.push({ k: "kind", label: p.kind === "rent" ? "To rent" : "To buy" });
  const where = [p.place || p.city, p.state && p.country === "United States" ? p.state.toUpperCase() : null, p.country && !(p.place || p.city) ? p.country : p.country && p.country !== "United States" ? p.country : null].filter(Boolean).join(", ");
  if (where) out.push({ k: "where", label: "", value: where });
  if (p.ptype !== "any") out.push({ k: "type", label: p.ptype === "apartment" ? "Apartments" : "Houses" });
  if (p.min_beds) out.push({ k: "beds", label: p.min_beds === 1 ? "bedroom or more" : "bedrooms or more", value: String(p.min_beds) });
  if (p.max_price) out.push({ k: "max", label: p.kind === "rent" ? "a month at most" : "at most", value: money(p.max_price, p.currency) });
  if (p.min_price) out.push({ k: "min", label: "at least", value: money(p.min_price, p.currency) });
  out.push({ k: "score", label: "score 80 or more" });
  return out;
}

/** A sentence for the live search made from the feed's URL filters (used by the "Search the whole web" card). */
export function liveQueryFromParams(sp: URLSearchParams): string {
  const get = (k: (typeof FILTER_KEYS)[number]) => (sp.get(k) || "").trim();
  const parts: string[] = [];
  const beds = Number(get("beds")) || 0;
  parts.push(beds ? `${beds} bedroom homes` : "homes");
  const where = [get("q"), get("country").split(",")[0]].filter(Boolean).join(", ");
  if (where) parts.push("in " + where);
  const max = Number(get("price")) || 0, min = Number(get("min")) || 0;
  if (max) parts.push(`under €${max.toLocaleString("en")}`);
  if (min) parts.push(`over €${min.toLocaleString("en")}`);
  return where ? parts.join(" ") : "";
}

/** Progress text for a stage: static English strings (for t()) and the numbers to put around them. */
export function stageParts(st: LiveStatus["stage"]): { text: string; n?: number; of?: number } {
  switch (st?.k) {
    case "start": case "parsed": return { text: "Reading your search" };
    case "ours": return { text: "Looking at the homes we already have" };
    case "ours_some": return { text: "Good homes already in RealHunt:", n: st.n };
    case "searching": return { text: "Searching estate agents and portals" };
    case "searching_cb": return { text: "Searching more listings in this city" };
    case "found": return { text: "Listings found:", n: st.n };
    case "checking": return { text: "Checking listing", n: st.n, of: st.of };
    case "done": return { text: "Done" };
    default: return { text: "Starting" };
  }
}

export const isFinal = (s: string | undefined) => !!s && ["done", "error", "rejected", "capped", "need_login"].includes(s);

/** Merges a poll's results into what is on screen, keeping the order they arrived in (new ones at the end). */
export function mergeResults(prev: LiveResult[], next: LiveResult[]): LiveResult[] {
  const seen = new Set(prev.map((r) => r.id));
  const byId = new Map(next.map((r) => [r.id, r]));
  return [...prev.filter((r) => byId.has(r.id)).map((r) => byId.get(r.id)!), ...next.filter((r) => !seen.has(r.id))];
}
