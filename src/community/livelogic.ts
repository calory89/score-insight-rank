// Live web search, client logic (8-nov-2026). Pure functions only, tested in src/test/livesearch-ui.test.ts.
// The search itself runs in the edge function realhunt-live-search; its parser lives in core.ts there and is
// imported here so the page shows the same understanding of the sentence before the server answers.
import { parseLiveQuery, resolveLive, type LiveQuery, type PlaceOpt, type Miss } from "../../supabase/functions/realhunt-live-search/core";
import { FILTER_KEYS } from "./smartsearch";

export { parseLiveQuery, resolveLive, type LiveQuery, type PlaceOpt, type Miss };
export const SHOW_MIN = 80;
export const LIVE_FREE_KEY = "rh.live.used";

export type LiveResult = {
  id: string; source: "realhunt" | "earlier" | "web"; provider: string; url: string; deal_slug: string | null; title: string; price: number | null; currency: string;
  price_eur: number | null; beds: number | null; sqm: number | null; location: string; country: string | null; kind: "buy" | "rent"; image: string | null; photos: number | null;
  score: number; parts?: Record<string, unknown>; found_at: string;
  // v2 (8-nov-2026): the AI check
  show?: boolean; deal_id?: string | null; image_urls?: string[]; photo_quality?: number | null; flags?: string[]; why_cheap?: string | null; ai_checked_at?: string | null;
  hoa_monthly?: number | null; hoa_currency?: string | null; tax_annual?: number | null; hoa_unknown?: boolean;
  /** Spanish versions (8-nov-2026), shown on the Spanish site through learnTexts in src/lib/lang.ts */
  why_great?: string | null; title_es?: string | null; why_great_es?: string | null; why_cheap_es?: string | null;
};
export type LiveStatus = { options?: PlaceOpt[]; closest?: Miss[]; job_id?: string; status: string; progress?: number; stage?: { k: string; n?: number; of?: number } | null; results?: LiveResult[]; found?: number; hidden?: number; note?: string | null; parsed?: LiveQuery; reason?: string };

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
  if (p.ptype !== "any" && !p.ptype_soft) out.push({ k: "type", label: p.ptype === "apartment" ? "Apartments" : "Houses" });
  if (p.central) out.push({ k: "central", label: "In the centre" });
  if (p.min_beds) out.push({ k: "beds", label: p.min_beds === 1 ? "bedroom or more" : "bedrooms or more", value: String(p.min_beds) });
  if (p.max_price) out.push({ k: "max", label: p.kind === "rent" ? "a month at most" : "at most", value: money(p.max_price, p.currency) });
  if (p.min_price) out.push({ k: "min", label: "at least", value: money(p.min_price, p.currency) });
  out.push({ k: "score", label: "score 80 or more" });
  return out;
}

/** A sentence for the live search made from the feed's URL filters (used by the "Search the whole web" card). */
export { liveQueryFromParams } from "./livequery";

/** Progress text for a stage: static English strings (for t()) and the numbers to put around them. */
export function stageParts(st: LiveStatus["stage"]): { text: string; n?: number; of?: number } {
  switch (st?.k) {
    case "start": case "parsed": return { text: "Reading your search" };
    case "ours": return { text: "Looking at the homes we already have" };
    case "ours_some": return { text: "Good homes already in RealHunt:", n: st.n };
    case "searching": return { text: "Searching estate agents and portals" };
    case "searching_cb": return { text: "Searching more listings in this city" };
    case "found": return { text: "Listings found:", n: st.n };
    case "checking": case "reading": return { text: "Reading listing", n: st.n, of: st.of };
    case "reviewing": return { text: "AI is checking the photos and details of listing", n: st.n, of: st.of };
    case "publishing": return { text: "Creating the home page for listing", n: st.n, of: st.of };
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

/** v2: only results that passed the AI check (or are RealHunt homes) are shown. */
export const passes = (r: LiveResult) => r.show !== false && r.score >= SHOW_MIN && (r.source !== "web" || r.show === true);

/** A live result as the row HomeCard expects (the same card as the home page). */
export function resultToDeal(r: LiveResult): Record<string, any> {
  const imgs = r.image_urls?.length ? r.image_urls : r.image ? [r.image] : [];
  return {
    id: r.deal_id || r.id, slug: r.deal_slug || r.id, title: r.title, price_eur: r.price_eur, sqm: r.sqm, bedrooms: r.beds, location_name: r.location, country: r.country,
    image_urls: imgs, ai_checked: !!r.ai_checked_at, ai_checked_at: r.ai_checked_at || null,
    why_cheap: r.why_cheap || null, ai_flags: r.flags || [], hoa_monthly: r.hoa_monthly ?? null, hoa_currency: r.hoa_currency ?? null, tax_annual: r.tax_annual ?? null, hoa_unknown: !!r.hoa_unknown,
    nota: r.score,
  };
}

/** Should the main search box send this sentence to the live search? Only a home search with a place. */
export function wantsLive(q: string): boolean {
  const p = parseLiveQuery(q);
  if (!p.ok) return false;
  if (p.city) return true;
  // "near the sea", "in the mountains" are features, not places: those stay on the feed's filters
  const place = n(p.place || "");
  return !!place && !/^(the|a|an|el|la|los|las)\b/.test(place) && !/\b(sea|beach|coast|ocean|lake|river|mountains?|city|centre|center|countryside|town|village|airport|park|mar|playa|costa|montana|campo|ciudad|centro)\b/.test(place);
}

// Coming back to the page resumes the same job (the server also reuses a search made in the last 24 h).
export const LIVE_JOBS_KEY = "rh.live.jobs";
export const queryKey = (q: string) => n(q).replace(/[^a-z0-9€$£]+/g, " ").trim();
export function rememberJob(store: Record<string, { id: string; at: number }>, q: string, id: string, now = Date.now()) {
  const next: Record<string, { id: string; at: number }> = {};
  for (const [k, v] of Object.entries(store || {})) if (v && now - v.at < 24 * 3600_000) next[k] = v;
  next[queryKey(q)] = { id, at: now };
  const keys = Object.keys(next).sort((a, b) => next[b].at - next[a].at).slice(0, 20);
  return Object.fromEntries(keys.map((k) => [k, next[k]]));
}
export function recallJob(store: Record<string, { id: string; at: number }> | null, q: string, now = Date.now()): string | null {
  const v = store?.[queryKey(q)];
  return v && now - v.at < 24 * 3600_000 && /^[0-9a-f-]{36}$/.test(v.id) ? v.id : null;
}

// ---------------------------------------------------------------- v3 (8-nov-2026)
/** The browser's time zone ("Europe/Madrid"), so "Sevilla" means Spain for a visitor in Spain. */
export function visitorTz(): string | null {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || null; } catch { return null; }
}
/** The search as the server will understand it, and whether to ask "Which Sevilla do you mean?" first. */
export function understand(q: string, tz: string | null, choice: string | null) {
  return resolveLive(parseLiveQuery(q), { tz, choice });
}
/** Why live web search is not available right now, from a job's note or a "capped" answer, or null. */
export function limitKind(note: string | null | undefined, status?: string | null): "mine" | "everyone" | null {
  const s = String(note || "");
  if (/global_budget|global_cap/.test(s)) return "everyone";
  if (/user_budget|ip_cap/.test(s) || (status === "capped" && !s)) return "mine";
  return null;
}
/** When the daily limits reset (00:00 UTC), as a local time like "01:00" or "7:00 PM". */
export function resetTime(lang: string, now = new Date()): string {
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  try { return next.toLocaleTimeString(lang === "es" ? "es-ES" : "en-GB", { hour: "2-digit", minute: "2-digit" }); } catch { return "00:00 UTC"; }
}
/** A place option as people read it: "Sevilla, Valle del Cauca, Colombia" (country names go through t()). */
export function optionParts(o: PlaceOpt): { name: string; region: string | null; country: string } {
  return { name: o.name, region: o.region && o.region !== o.name ? o.region : null, country: o.country };
}
