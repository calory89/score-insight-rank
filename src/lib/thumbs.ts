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
// Any host: the media fallback can move a failed copy from realhunt-media to realhunt.co before this runs (8-nov-2026).
export const isThumb = (u: string) => u.startsWith(THUMB_PREFIX) || /^https:\/\/realhunt\.co\/t\/(finds|sb)\//.test(u);

/** onError for an <img src={thumb(original)}>: swap to the original once, then leave it to the caller. Returns true when it swapped. */
export function onThumbError(img: HTMLImageElement, original?: string | null): boolean {
  if (original && isThumb(img.currentSrc || img.src) && img.dataset.thumbFailed !== "1") {
    img.dataset.thumbFailed = "1";
    img.removeAttribute("srcset");
    img.src = original;
    return true;
  }
  return false;
}
