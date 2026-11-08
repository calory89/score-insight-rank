import { describe, expect, it } from "vitest";
import { thumb, isThumb, onThumbError, THUMB_PREFIX } from "@/lib/thumbs";
import { MEDIA } from "@/lib/media";

const SB = "https://oykcsmextclpdnugixqz.supabase.co/storage/v1/object/public/realhunt-finds/us-hollywood-140-501-290k-0.webp";

describe("card thumbnails", () => {
  it("maps repo photos (site path or media host) to the 480 px copy", () => {
    expect(thumb("/finds/lake-como-peglio-85000-0.webp")).toBe(`${MEDIA}/t/finds/lake-como-peglio-85000-0.webp`);
    expect(thumb(`${MEDIA}/finds/C-lmL-0xtAx-0.webp`)).toBe(`${MEDIA}/t/finds/C-lmL-0xtAx-0.webp`);
    expect(thumb("https://realhunt.co/finds/x_1.jpg")).toBe(`${MEDIA}/t/finds/x_1.webp`);
  });
  it("maps Supabase bucket photos and always outputs webp", () => {
    expect(thumb(SB)).toBe(`${MEDIA}/t/sb/us-hollywood-140-501-290k-0.webp`);
    expect(thumb(SB.replace(".webp", ".jpg"))).toBe(`${MEDIA}/t/sb/us-hollywood-140-501-290k-0.webp`);
  });
  it("leaves every other URL alone", () => {
    for (const u of ["https://cdn.thinkwebcontent.com/property/1/x.jpg", "/top/a.webp", "/finds/../x.webp", "/finds/a/b.webp", "/favicon.png", ""]) expect(thumb(u)).toBe(u);
    expect(thumb(undefined)).toBe("");
    expect(thumb(`${SB}?width=10`)).toBe(`${SB}?width=10`);
  });
  it("falls back to the original once when the thumbnail fails", () => {
    const img = document.createElement("img");
    img.src = thumb("/finds/a.webp");
    expect(isThumb(img.src)).toBe(true);
    expect(onThumbError(img, "/finds/a.webp")).toBe(true);
    expect(img.src).toContain("/finds/a.webp");
    expect(img.src.startsWith(THUMB_PREFIX)).toBe(false);
    expect(onThumbError(img, "/finds/a.webp")).toBe(false);
  });
});

import { isThumb as isThumb2 } from "@/lib/thumbs";
import { describe as d2, it as i2, expect as e2 } from "vitest";
d2("isThumb after the media fallback", () => {
  i2("treats a realhunt.co thumbnail as a thumbnail so the card falls back to the original photo", () => {
    e2(isThumb2("https://realhunt.co/t/sb/us-tampa-8105-325k-0.webp")).toBe(true);
    e2(isThumb2("https://realhunt.co/finds/x.webp")).toBe(false);
  });
});
