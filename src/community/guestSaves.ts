// Saves for visitors without an account (2-oct-2026). Kept in this browser only; moved into the
// account automatically the moment the person signs in.
export type GuestSave = { id: string; slug: string; title: string; price_eur: number | null; image: string | null; at: number };
const K = "rh_guest_saves";
export function guestSaves(): GuestSave[] {
  try { const v = JSON.parse(localStorage.getItem(K) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
}
function write(list: GuestSave[]) {
  try { localStorage.setItem(K, JSON.stringify(list.slice(0, 200))); } catch { /* storage blocked */ }
  try { window.dispatchEvent(new Event("rh-guest-saves")); } catch { /* ignore */ }
}
export const isGuestSaved = (id: string) => guestSaves().some((x) => x.id === id);
/** Returns true when the home is now saved. */
export function toggleGuestSave(d: { id: string; slug: string; title?: string | null; price_eur?: number | null; image_urls?: string[] | null }): boolean {
  const list = guestSaves();
  if (list.some((x) => x.id === d.id)) { write(list.filter((x) => x.id !== d.id)); return false; }
  write([{ id: d.id, slug: d.slug, title: d.title || "", price_eur: d.price_eur ?? null, image: d.image_urls?.[0] || null, at: Date.now() }, ...list]);
  return true;
}
export function clearGuestSaves() { write([]); }
