// A home page opened directly (10-nov-2026 speed): the prerendered HTML carries the home's own row
// (window.__rhHome, written by seo/dealShell.ts), so the page is drawn as soon as the app code is in, without
// waiting for the snapshot of all homes. It goes through the same cache the feed uses for instant navigation
// (rowCache in ./v4); the full record from the snapshot replaces it a moment later, exactly as when a home is
// opened from the feed.
import { mediaDeep } from "@/lib/media";
import { learnTexts } from "@/lib/lang";
import { stripEs } from "@/lib/esPath";
import { learnThumbs } from "@/lib/thumbs";

type Row = Record<string, any>;

/** The embedded row as the app's data layer would hand it over, or null when it is not for this page. */
export function bootRow(raw: unknown, pathname: string, now = Date.now()): Row | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Row;
  if (typeof r.slug !== "string" || !r.slug || typeof r.id !== "string") return null;
  let path = pathname;
  try { path = decodeURIComponent(pathname); } catch { /* keep as is */ }
  // /es/deal/<slug> is the same home in Spanish (src/lib/esPath.ts)
  if (stripEs(path).replace(/\/+$/, "") !== "/deal/" + r.slug) return null;
  // same visibility rule as src/lib/static-db.ts
  const pub = Date.parse(r.publish_at || r.approved_at || 0) || 0;
  if (r.publish_at && pub > now) return null;
  const row: Row = { ...mediaDeep(r), has_source: true };
  // which photo copies exist for this home (th/tm from the snapshot), before the gallery asks for one
  learnThumbs(null, [row]);
  // the public snapshot answer never carries the listing link for these (static-db "detail"); the full record adds it
  if (!["fotocasa", "immoscout24"].includes(row.hunter_handle || "")) delete row.source_url;
  return row;
}

let booted = "";
/** True once, for the home this page was opened on: its first paint came from the HTML, and whoever has already
 *  started reading or scrolling must not be thrown back to the top when the app takes over. */
export function openedHere(slug?: string): boolean {
  if (!slug || slug !== booted) return false;
  booted = "";
  return true;
}

/** Reads window.__rhHome once and puts the row where the home page looks first. */
export function seedBootRow(cache: Map<string, any>): void {
  try {
    const w = window as any;
    const raw = w.__rhHome;
    if (!raw) return;
    w.__rhHome = undefined;
    const row = bootRow(raw, location.pathname);
    if (!row || cache.has(row.slug)) return;
    learnTexts([raw]); // Spanish title and description of this home, before it is shown
    cache.set(row.slug, row);
    booted = row.slug;
  } catch { /* the page loads from the snapshot as before */ }
}
