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

/** The 480 px WebP copy of a home photo, or the URL itself when there is no copy for it. */
export function thumb(url?: string | null): string {
  const u = String(url || "");
  let m = FINDS.exec(u);
  if (m) return `${THUMB_PREFIX}finds/${m[1]}.webp`;
  m = SUPA.exec(u);
  if (m) return `${THUMB_PREFIX}sb/${m[1]}.webp`;
  return u;
}
// ---- mid-size copy of a home's MAIN photo (15-nov-2026): 800 px wide, made by scripts/make_thumbs.py next to the
// thumbnails (MEDIA/t/m/finds/<name>.webp). A full photo is up to 1,440 px wide and 335 KB; a phone shows it about
// 390 px wide, and the 800 px copy weighs a quarter (55 to 90 KB). The top of a home page offers both and the
// browser takes the small one on a phone and the full one on a large or dense screen.
//
// OFF until the copies exist on realhunt-media: the first publication after this change makes them (one per home).
// To switch on: open https://realhunt-media.pages.dev/t/m/finds/<any main photo>.webp, see it answer 200, set this
// to true. If a copy is missing the <img> drops the offer and loads the full photo (one wasted request).
export const MID_PHOTOS: boolean = false;
/** The 800 px copy of a main photo, or the URL itself when there is none for it. */
export function mid(url?: string | null): string {
  const t = thumb(url);
  return t.startsWith(THUMB_PREFIX) ? THUMB_PREFIX + "m/" + t.slice(THUMB_PREFIX.length) : String(url || "");
}
/** srcset for the main photo of a home page, or undefined when mid-size copies are off or the photo has none. */
export function midSrcSet(url?: string | null, on: boolean = MID_PHOTOS): string | undefined {
  const m = mid(url);
  return on && url && m !== url ? `${m} 800w, ${url} 1600w` : undefined;
}
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
