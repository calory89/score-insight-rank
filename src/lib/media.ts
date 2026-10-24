// Home and Top 100 photos are requested from realhunt-media.pages.dev instead of realhunt.co.
// realhunt.co has a rate limit (150 requests in 10 s per visitor); a page of homes asks for 60 to 100
// photos, so a visitor opening a few pages in a row was blocked (Error 1015): no photos, and sometimes
// "Something went wrong" when a script was refused too. Photos on the media host do not count.
// The same files are served on both hosts (realhunt.co proxies /finds, /top and /og to realhunt-media).
export const MEDIA = "https://realhunt-media.pages.dev";
const PHOTO = /^\/(finds|top|og)\/[^?#\s]+\.(webp|jpe?g|png|gif)$/i;

export const toMedia = (s: string): string => (PHOTO.test(s) ? MEDIA + s : s);
/** "/finds/x.webp" for a media URL, so lookups keyed by the site path keep working. */
export const fromMedia = (s: string): string => (s.startsWith(MEDIA + "/") ? s.slice(MEDIA.length) : s);

/** Rewrites every photo path inside a JSON value (rows, lists, projects). */
export function mediaDeep<T>(v: T): T {
  if (typeof v === "string") return toMedia(v) as unknown as T;
  if (Array.isArray(v)) return v.map(mediaDeep) as unknown as T;
  if (v && typeof v === "object") {
    const o: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) o[k] = mediaDeep(x);
    return o as T;
  }
  return v;
}
