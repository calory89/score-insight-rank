// Accessibility helpers (26-nov-2026, list of 1,000, batch 17). Components write English; src/lib/lang.ts
// swaps these strings to Spanish with the "{0}" patterns in public/i18n/es-core.json.

/** 802: what a screen reader hears when a gallery photo changes (the visible counter is "3 / 8"). */
export const photoOf = (n: number, total: number) => `Photo ${n} of ${total}`;

/** 804: what a screen reader says for a RealHunt score badge. The score is out of 100 on the whole site. */
export const scoreLabel = (n: number) => `RealHunt score ${Math.round(n)} out of 100`;

/** 838: a euro price read as words ("38,000 euros"), so "€38k" is not read as "euro thirty-eight k". */
export function spokenEur(n: number, lang: "en" | "es" = "en"): string {
  if (!Number.isFinite(n)) return "";
  return `${Math.round(n).toLocaleString(lang === "es" ? "es-ES" : "en-GB")} euros`;
}

/** 840: after an in-app navigation, move focus to the new page's main heading so screen readers start there.
 *  Leaves focus alone when the visitor is typing in a field (search as you type changes the URL). */
export function focusMainHeading(doc: Document = document): boolean {
  const active = doc.activeElement as HTMLElement | null;
  if (active && active !== doc.body && doc.contains(active) && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName)) return false;
  if (active && active.closest?.('[role="dialog"]')) return false;
  const root = doc.getElementById("main-content") || doc.body;
  const h = root.querySelector<HTMLElement>("h1") || root.querySelector<HTMLElement>("h2");
  if (!h) return false;
  if (!h.hasAttribute("tabindex")) h.setAttribute("tabindex", "-1");
  h.focus({ preventScroll: true });
  return doc.activeElement === h;
}
