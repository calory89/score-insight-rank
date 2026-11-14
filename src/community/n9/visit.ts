// "New since your last visit" (15-nov-2026). Two timestamps in this browser only, nothing is sent anywhere:
// rh_visit_now = start of the current visit, rh_visit_prev = start of the one before. A visit ends after
// 30 minutes without opening the site.
const NOW = "rh_visit_now", PREV = "rh_visit_prev";
export const VISIT_GAP = 30 * 60 * 1000;

/** Pure rule: what to store and which earlier visit to compare with. */
export function nextVisit(stored: { now: number | null; prev: number | null }, t: number): { now: number; prev: number | null } {
  if (stored.now == null || stored.now > t) return { now: t, prev: null };
  if (t - stored.now < VISIT_GAP) return { now: stored.now, prev: stored.prev };
  return { now: t, prev: stored.now };
}

let memo: number | null | undefined;
/** Start of the previous visit (ms), or null on a first visit. Safe to call on every render. */
export function previousVisit(): number | null {
  if (memo !== undefined) return memo;
  try {
    const num = (k: string) => { const n = Number(localStorage.getItem(k)); return Number.isFinite(n) && n > 0 ? n : null; };
    const v = nextVisit({ now: num(NOW), prev: num(PREV) }, Date.now());
    localStorage.setItem(NOW, String(v.now));
    if (v.prev != null) localStorage.setItem(PREV, String(v.prev)); else localStorage.removeItem(PREV);
    memo = v.prev;
  } catch { memo = null; }
  return memo;
}

/** The earlier visit worth comparing with: at least six hours old, so a second look the same morning shows no strip. */
export function returningSince(now: number = Date.now()): number | null {
  const p = previousVisit();
  return p != null && now - p >= 6 * 3600 * 1000 ? p : null;
}

/** Homes published after `since`, newest first. */
export function newSince<T extends { publish_at?: string | null; approved_at?: string | null }>(rows: T[], since: number): T[] {
  const at = (r: T) => Date.parse(String(r.publish_at || r.approved_at || "")) || 0;
  return rows.filter((r) => at(r) > since).sort((a, b) => at(b) - at(a));
}
