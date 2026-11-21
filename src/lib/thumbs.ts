// Card thumbnails (7-nov-2026). Home photos are 100 to 200 KB each; a card on a phone is ~360 px wide, so cards
// and mini-cards load a 480 px WebP copy (~30 KB) and the home page gallery keeps the full photo.
//
// The copies are made by scripts/make_thumbs.py during rh-auto-publish and written next to the photos in
// webs-estaticas pub/_lovable (_s/realhunt.co/t/...), so realhunt-media serves them like any other photo:
//   /finds/<name>.<ext>                                  -> MEDIA/t/finds/<name>.webp
//   supabase .../object/public/realhunt-finds/<name>.<ext> -> MEDIA/t/sb/<name>.webp
// Keep these two rules in sync with thumb_key() in scripts/make_thumbs.py.
// Any other URL is returned unchanged. A copy that does not exist yet fails to load and the <img> falls back
// to the original (see onThumbError), so a missing thumbnail never shows a broken photo.
import { MEDIA } from "./media";

const FINDS = /^(?:https:\/\/realhunt-media\.pages\.dev|https:\/\/realhunt\.co)?\/finds\/([A-Za-z0-9][A-Za-z0-9._-]{0,180})\.(?:webp|jpe?g|png)$/i;
const SUPA = /^https:\/\/oykcsmextclpdnugixqz\.supabase\.co\/storage\/v1\/object\/public\/realhunt-finds\/([A-Za-z0-9][A-Za-z0-9._-]{0,180})\.(?:webp|jpe?g|png)$/i;
export const THUMB_PREFIX = MEDIA + "/t/";

/** "finds/<name>.webp" or "sb/<name>.webp": where the copies of a photo live under /t/, or "" when it has none. */
export function thumbKey(url?: string | null): string {
  const u = String(url || "");
  let m = FINDS.exec(u);
  if (m) return `finds/${m[1]}.webp`;
  m = SUPA.exec(u);
  if (m) return `sb/${m[1]}.webp`;
  return "";
}

// ---- which copies exist (21-nov-2026) ----
// Cards asked for the copy of every photo, so a home newer than its thumbnails (the snapshot goes live before the
// publish job makes them) or a copy that failed gave a 404 and a console error before the fallback. Now
// scripts/make_thumbs.py writes MEDIA/t/index.txt (every copy on realhunt-media) and scripts/build_static.py marks each
// row of the snapshot: th = 1 when every photo of the home has its 480 px copy, tm = 1 when its main photo has the
// 800 px one, and "thumbs": 1 on the snapshot. Once a snapshot with that mark is seen (learnThumbs), only copies it
// names are asked for; anything else (a home from the live database, a new home) shows the original photo.
// Before the first marked snapshot nothing changes (every copy is asked for, as before).
// Photos written in the code (VIBE_FALLBACK in src/community/v6.tsx); keep in step with EXTRA in scripts/make_thumbs.py.
const ALWAYS = ["DdOGB56ABXI-0", "lake-como-peglio-85000-0", "lake-como-plesio-89000-0", "DcAr2EbIAqx-1", "Dc56aI-icMP-1", "DdPBLT2CLlb-1", "acquappesa-sea-view-39000", "grotte-santo-stefano-13000"].map((n) => `finds/${n}.webp`);
let known: Set<string> | null = null;
const knownMid = new Set<string>();
type SnapLike = { thumbs?: unknown; rows?: unknown } | null | undefined;
/** Learns which copies exist from a snapshot ({thumbs: 1, rows}) or from single rows that carry th/tm. */
export function learnThumbs(snap: SnapLike, rows?: unknown[]): void {
  const list = (rows || (snap && Array.isArray(snap.rows) ? snap.rows : [])) as Array<Record<string, any>>;
  const marked = !!(snap && snap.thumbs) || list.some((r) => r && ("th" in r || "tm" in r));
  if (!marked) return;
  if (!known) known = new Set(ALWAYS);
  for (const r of list) {
    if (!r || !Array.isArray(r.image_urls)) continue;
    if (r.th) for (const u of r.image_urls) { const k = thumbKey(u); if (k) known.add(k); }
    if (r.tm) { const k = thumbKey(r.image_urls[0]); if (k) knownMid.add(k); }
  }
}
/** Forget what was learned (tests). */
export function resetThumbs(): void { known = null; knownMid.clear(); }
/** True when the 480 px copy of this photo may be asked for. */
export const hasThumb = (url?: string | null): boolean => { const k = thumbKey(url); return !!k && (!known || known.has(k)); };
/** True when the snapshot says the 800 px copy of this main photo exists. */
export const hasMid = (url?: string | null): boolean => { const k = thumbKey(url); return !!k && knownMid.has(k); };

/** The 480 px WebP copy of a home photo, or the URL itself when there is no copy for it. */
export function thumb(url?: string | null): string {
  const u = String(url || "");
  return hasThumb(u) ? THUMB_PREFIX + thumbKey(u) : u;
}
// ---- mid-size copy of a home's MAIN photo (15-nov-2026): 800 px wide, made by scripts/make_thumbs.py next to the
// thumbnails (MEDIA/t/m/finds/<name>.webp). A full photo is up to 1,440 px wide and 335 KB; a phone shows it about
// 390 px wide, and the 800 px copy weighs a quarter (55 to 90 KB). The top of a home page offers both and the
// browser takes the small one on a phone and the full one on a large or dense screen.
//
// 21-nov-2026: the publish job makes the copy for EVERY main photo (a photo narrower than 800 px is re-encoded at its
// own size), and it is offered only for homes the snapshot marks with tm = 1 (see learnThumbs above), so the page
// never asks for a copy that is not there. If one is missing anyway the <img> drops the offer and loads the full photo.
export const MID_PHOTOS: boolean = true;
/** The 800 px copy of a main photo, or the URL itself when there is none for it. */
export function mid(url?: string | null): string {
  const k = thumbKey(url);
  return k ? THUMB_PREFIX + "m/" + k : String(url || "");
}
/** srcset for the main photo of a home page, or undefined when the photo has no mid-size copy.
 *  `on`: true offers it whatever the snapshot says (tests), false never; left out, only when the snapshot names it. */
export function midSrcSet(url?: string | null, on?: boolean): string | undefined {
  const m = mid(url);
  const ok = on === undefined ? MID_PHOTOS && hasMid(url) : on;
  return ok && url && m !== url ? `${m} 800w, ${url} 1600w` : undefined;
}
/** Cards in two sizes (idea 57): the 480 px copy on a phone, the 800 px copy of the main photo on a wide or dense
 *  screen, when the snapshot says both exist. Undefined otherwise (the card keeps its single thumbnail). */
export function cardSrcSet(url?: string | null): string | undefined {
  return hasMid(url) && hasThumb(url) && known ? `${thumb(url)} 480w, ${mid(url)} 800w` : undefined;
}
/** How wide a card photo is drawn, said short on phones on purpose (like MID_SIZES) so a phone keeps the 480 px copy
 *  and a dense desktop screen (a card of about 300 px at 2x) takes the 800 px one. */
export const CARD_SIZES = "(max-width: 640px) 40vw, 300px";
/** How wide the main photo is drawn, said a little short on phones so a dense screen still takes the 800 px copy
 * (390 px x 3 = 1,170 px would ask for the full photo; 800 px on that screen is still twice its width in dots). */
export const MID_SIZES = "(max-width: 700px) 62vw, (max-width: 1240px) 64vw, 784px";

// Any host: the media fallback can move a failed copy from realhunt-media to realhunt.co before this runs (8-nov-2026).
export const isThumb = (u: string) => u.startsWith(THUMB_PREFIX) || /^https:\/\/realhunt\.co\/t\/(finds|sb)\//.test(u);

/** onError for an <img src={thumb(original)}>: swap to the original once, then leave it to the caller. Returns true when it swapped. */
// Structural type (not HTMLImageElement): seo/prerender.ts imports thumb() from this file and is type-checked
// without the DOM library (tsconfig.node.json), which broke the build on 10-nov-2026.
type ImgLike = { currentSrc?: string; src: string; dataset: Record<string, string | undefined>; removeAttribute(name: string): void };
export function onThumbError(img: ImgLike, original?: string | null): boolean {
  if (original && isThumb(img.currentSrc || img.src) && img.dataset.thumbFailed !== "1") {
    img.dataset.thumbFailed = "1";
    img.removeAttribute("srcset");
    img.src = original;
    return true;
  }
  return false;
}
