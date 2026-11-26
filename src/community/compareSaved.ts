// Saved homes and compare, pure helpers (26-nov-2026, batch 18 of the list of 1,000). No React, so they are unit
// tested in src/test/compare-saved.test.ts.
//  - savedState(): what happened to a saved home since it was saved (removed from RealHunt, advert gone, not confirmed)
//  - sortSaved(): saved page order (date saved, price, score)
//  - toCsv(): a small RFC 4180 CSV writer for the saved list and the comparison (Excel opens it with the BOM)
//  - areaMedian(): median price per m² of the region (or country) of a home, from the public snapshot
//  - visitIcs(): a calendar file for a planned visit, made in the browser (no service involved)
import { isGone, isUnconfirmed, type StatusRow } from "./n9/status";

export type SavedState = "ok" | "removed" | "gone" | "unconfirmed";
/** `row` is the home in today's snapshot, or undefined when it is no longer there. `loaded` is false while the
 * snapshot has not arrived yet (nothing is claimed then). */
export function savedState(row: StatusRow | null | undefined, loaded: boolean, now = Date.now()): SavedState {
  if (!loaded) return "ok";
  if (!row) return "removed";
  if (isGone(row)) return "gone";
  if (isUnconfirmed(row, now)) return "unconfirmed";
  return "ok";
}

export type SortKey = "saved" | "price" | "price-desc" | "score";
export const SORTS: [SortKey, string][] = [["saved", "Recently saved"], ["price", "Price: low to high"], ["price-desc", "Price: high to low"], ["score", "Best score"]];
/** Items keep their saved order for "saved"; unknown prices and scores go last; ties keep the saved order. */
export function sortSaved<T>(items: T[], by: SortKey, price: (x: T) => number | null | undefined, score: (x: T) => number | null | undefined): T[] {
  if (by === "saved") return items.slice();
  const val = (x: T) => { const v = by === "score" ? score(x) : price(x); return v != null && Number.isFinite(v) && v > 0 ? v : null; };
  const dir = by === "price" ? 1 : -1;
  return items.map((x, i) => [x, i] as const).sort((a, b) => {
    const va = val(a[0]), vb = val(b[0]);
    if (va == null && vb == null) return a[1] - b[1];
    if (va == null) return 1;
    if (vb == null) return -1;
    return va === vb ? a[1] - b[1] : (va - vb) * dir;
  }).map(([x]) => x);
}

const cell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  // a leading = + - @ would be run as a formula by a spreadsheet
  const safe = /^[=+\-@]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s) ? "'" + s : s;
  return /[",\n\r;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};
export function toCsv(head: string[], rows: unknown[][]): string {
  return "﻿" + [head, ...rows].map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}
/** Starts a download of a text file in the browser. */
export function download(name: string, text: string, type = "text/csv;charset=utf-8") {
  try {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  } catch { /* old browser: nothing happens */ }
}

/** "Peglio, Lake Como, Italy" -> "Lake Como". Null when the location has no middle part. */
export function regionOf(location: string | null | undefined): string | null {
  const parts = String(location || "").split(",").map((s) => s.trim()).filter(Boolean);
  return parts.length >= 3 ? parts[parts.length - 2] : null;
}
const median = (xs: number[]) => { const s = xs.slice().sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2); };
type AreaRow = { slug?: string; country?: string | null; location_name?: string | null; price_eur?: number | null; sqm?: number | null };
export const MIN_AREA = 5;
/** Median €/m² of the homes in the same region (5+ homes with both numbers) or else the same country. */
export function areaMedian(d: AreaRow, rows: AreaRow[]): { scope: string; median: number; n: number } | null {
  const per = (r: AreaRow) => (r.price_eur && r.sqm && r.sqm >= 15 ? r.price_eur / r.sqm : null);
  const reg = regionOf(d.location_name);
  const pick = (f: (r: AreaRow) => boolean) => rows.filter(f).map(per).filter((v): v is number => v != null);
  if (reg && d.country) {
    const xs = pick((r) => r.country === d.country && regionOf(r.location_name) === reg);
    if (xs.length >= MIN_AREA) return { scope: reg, median: Math.round(median(xs)), n: xs.length };
  }
  if (!d.country) return null;
  const xs = pick((r) => r.country === d.country);
  return xs.length >= MIN_AREA ? { scope: d.country, median: Math.round(median(xs)), n: xs.length } : null;
}
/** Percent difference of a home's €/m² from the median: -38 means 38 % below. */
export function vsMedian(perSqm: number | null | undefined, med: number | null | undefined): number | null {
  if (!perSqm || !med) return null;
  return Math.round(((perSqm - med) / med) * 100);
}

const icsText = (s: string) => s.replace(/[\\;,]/g, (m) => "\\" + m).replace(/\r?\n/g, "\\n");
/** An all-day calendar event on `day` (YYYY-MM-DD) for visiting a home. */
export function visitIcs(o: { slug: string; title: string; url: string; day: string; where?: string | null; stamp?: Date }): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(o.day)) return null;
  const d0 = o.day.replace(/-/g, "");
  const next = new Date(Date.UTC(+o.day.slice(0, 4), +o.day.slice(5, 7) - 1, +o.day.slice(8, 10) + 1));
  if (Number.isNaN(next.getTime())) return null;
  const d1 = next.toISOString().slice(0, 10).replace(/-/g, "");
  const stamp = (o.stamp || new Date()).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//RealHunt//Visit//EN", "CALSCALE:GREGORIAN", "BEGIN:VEVENT",
    `UID:visit-${o.slug}-${d0}@realhunt.co`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${d0}`, `DTEND;VALUE=DATE:${d1}`,
    `SUMMARY:${icsText("Visit: " + o.title)}`, ...(o.where ? [`LOCATION:${icsText(o.where)}`] : []),
    `DESCRIPTION:${icsText(o.url)}`, `URL:${o.url}`, "END:VEVENT", "END:VCALENDAR", "",
  ].join("\r\n");
}
