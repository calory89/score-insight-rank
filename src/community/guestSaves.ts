// Saves for visitors without an account (2-oct-2026). Kept in this browser only; moved into the
// account automatically the moment the person signs in.
import { isGone, isUnconfirmed, type StatusRow } from "./n9/status";
export type GuestSave = { id: string; slug: string; title: string; price_eur: number | null; image: string | null; at: number };
const K = "rh_guest_saves";
/** How many homes one browser keeps without an account (26-nov-2026, list 869: said on the saved page). */
export const GUEST_MAX = 200;
export function guestSaves(): GuestSave[] {
  try { const v = JSON.parse(localStorage.getItem(K) || "[]"); return Array.isArray(v) ? v.filter((x) => x && typeof x.id === "string" && typeof x.slug === "string") : []; } catch { return []; }
}
function write(list: GuestSave[]) {
  try { localStorage.setItem(K, JSON.stringify(list.slice(0, GUEST_MAX))); } catch { /* storage blocked */ }
  try { window.dispatchEvent(new Event("rh-guest-saves")); } catch { /* ignore */ }
}
export const isGuestSaved = (id: string) => guestSaves().some((x) => x.id === id);
/** True when one more save would push the oldest one out of this browser. */
export const guestSavesFull = () => guestSaves().length >= GUEST_MAX;
/** Returns true when the home is now saved. */
export function toggleGuestSave(d: { id: string; slug: string; title?: string | null; price_eur?: number | null; image_urls?: string[] | null }): boolean {
  const list = guestSaves();
  if (list.some((x) => x.id === d.id)) { write(list.filter((x) => x.id !== d.id)); return false; }
  write([{ id: d.id, slug: d.slug, title: d.title || "", price_eur: d.price_eur ?? null, image: d.image_urls?.[0] || null, at: Date.now() }, ...list]);
  return true;
}
export function clearGuestSaves() { write([]); }

/** Moves the homes saved on this device into the account (26-nov-2026, list 851). Only the saves the server
 * accepted (or that the account already had) leave this browser; one that failed (network, rate limit) stays here and
 * is tried again at the next sign-in, so nothing is lost. `save` throws when the server refuses. Homes that no longer
 * exist on RealHunt come back as `gone` when the server says so (an error whose message mentions "not found"): those
 * are dropped too, since they can never be saved. */
export async function mergeGuestSaves(
  list: GuestSave[], already: string[], save: (id: string) => Promise<unknown>,
): Promise<{ moved: string[]; failed: GuestSave[]; gone: string[] }> {
  const moved: string[] = []; const failed: GuestSave[] = []; const gone: string[] = [];
  const seen = new Set<string>();
  for (const x of list) {
    if (!x || seen.has(x.id)) continue; seen.add(x.id);
    if (already.includes(x.id)) { moved.push(x.id); continue; }
    try { await save(x.id); moved.push(x.id); }
    catch (e) { if (/not.?found|no such|gone|does not exist/i.test(String((e as Error)?.message || e))) gone.push(x.id); else failed.push(x); }
  }
  return { moved, failed, gone };
}
/** Keeps on this device only the given saves (the ones that could not be moved yet). */
export function keepGuestSaves(list: GuestSave[]) { write(list); }

/** The message after a save (26-nov-2026, list 899): a home whose advert is gone or could not be confirmed says so
 * right away, so nobody plans around it without asking the agent first. */
export function savedNotice(deal: StatusRow, guest: boolean): string {
  if (isGone(deal)) return "Saved. Careful: the original advert is no longer online, it may have sold.";
  if (isUnconfirmed(deal)) return "Saved. We could not confirm lately that this home is still for sale: ask the agent first.";
  return guest ? "Saved on this device. Create a free account to keep it everywhere." : "Saved ✓ Add it to a board from its page.";
}
