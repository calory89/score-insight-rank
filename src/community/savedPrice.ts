// Price a home had when it was saved on this device (8-nov-2026), for "price dropped since you saved".
// Tiny on purpose: SaveHeart (src/community/v4.tsx) imports it on every page.
const SAVED = "rh_saved_prices";
type SavedMap = Record<string, { p: number; at: number }>;
export function savedPrices(): SavedMap {
  try { const v = JSON.parse(localStorage.getItem(SAVED) || "{}"); return v && typeof v === "object" && !Array.isArray(v) ? v : {}; } catch { return {}; }
}
/** Remembers the price a home had when saved. Keeps the first price seen unless `force`. */
export function rememberSavedPrice(slug: string | undefined, price: number | null | undefined, force = false) {
  if (!slug || !price || !(price > 0)) return;
  const m = savedPrices();
  if (m[slug] && !force) return;
  m[slug] = { p: Math.round(price), at: Date.now() };
  const keys = Object.keys(m);
  if (keys.length > 400) keys.sort((a, b) => m[a].at - m[b].at).slice(0, keys.length - 400).forEach((k) => delete m[k]);
  try { localStorage.setItem(SAVED, JSON.stringify(m)); } catch { /* storage blocked */ }
}
/** Change since saved: negative = cheaper now. Null when unknown or unchanged. */
export function priceChange(then: number | null | undefined, now: number | null | undefined): { diff: number; pct: number } | null {
  if (!then || !now || then <= 0 || now <= 0 || Math.round(then) === Math.round(now)) return null;
  const diff = Math.round(now - then);
  return { diff, pct: Math.round((diff / then) * 1000) / 10 };
}
