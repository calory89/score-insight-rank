// Dates in the language of the page (21-nov-2026, list 2 idea 54): Spanish on Spanish pages (20 nov 2026), English
// everywhere else (20 Nov 2026), never the browser's own format (11/20/2026 for a US browser on a Spanish page).
import { getLang } from "./lang";

export const dateLocale = (lang: "en" | "es" = getLang()) => (lang === "es" ? "es-ES" : "en-GB");

/** "20 Nov 2026" / "20 nov 2026". `long` writes the month in full. Bad input gives "". */
export function fmtDay(v: string | number | Date | null | undefined, o: { long?: boolean; lang?: "en" | "es" } = {}): string {
  if (v == null || v === "") return "";
  const d = v instanceof Date ? v : new Date(typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v + "T12:00:00" : v);
  if (isNaN(d.getTime())) return "";
  try { return d.toLocaleDateString(dateLocale(o.lang), { day: "numeric", month: o.long ? "long" : "short", year: "numeric" }).replace(/\.(?= \d{4}$)/, ""); } catch { return d.toISOString().slice(0, 10); }
}
