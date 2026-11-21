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

import { learnThumbs, resetThumbs, hasMid, midSrcSet, cardSrcSet, thumb as thumb3 } from "@/lib/thumbs";
import { dealShell } from "../../seo/dealShell";
import { afterEach, describe as d3, expect as e3, it as i3 } from "vitest";
d3("only copies the snapshot names are asked for (21 Nov 2026)", () => {
  afterEach(() => resetThumbs());
  const rows = [
    { slug: "a", image_urls: ["/finds/a-0.webp", "/finds/a-1.webp"], th: 1, tm: 1 },
    { slug: "b", image_urls: ["/finds/b-0.webp"], th: 0, tm: 0 },
  ];
  i3("asks for every copy before a marked snapshot is seen (as before)", () => {
    learnThumbs({ rows: rows.map(({ th, tm, ...r }) => r) });
    e3(thumb3("/finds/b-0.webp")).toBe(`${MEDIA}/t/finds/b-0.webp`);
    e3(midSrcSet("/finds/a-0.webp")).toBeUndefined();
  });
  i3("after a marked snapshot, a home without copies shows its own photo", () => {
    learnThumbs({ thumbs: 1, rows });
    e3(thumb3("/finds/a-1.webp")).toBe(`${MEDIA}/t/finds/a-1.webp`);
    e3(thumb3("/finds/b-0.webp")).toBe("/finds/b-0.webp");
    e3(thumb3("/finds/new-home-0.webp")).toBe("/finds/new-home-0.webp");
    e3(thumb3("/finds/lake-como-peglio-85000-0.webp")).toBe(`${MEDIA}/t/finds/lake-como-peglio-85000-0.webp`); // written in the code
    e3(hasMid("/finds/a-0.webp")).toBe(true);
    e3(hasMid("/finds/b-0.webp")).toBe(false);
    e3(midSrcSet(MEDIA + "/finds/a-0.webp")).toBe(`${MEDIA}/t/m/finds/a-0.webp 800w, ${MEDIA}/finds/a-0.webp 1600w`);
    e3(cardSrcSet("/finds/a-0.webp")).toBe(`${MEDIA}/t/finds/a-0.webp 480w, ${MEDIA}/t/m/finds/a-0.webp 800w`);
    e3(cardSrcSet("/finds/b-0.webp")).toBeUndefined();
  });
  i3("learns from the row embedded in a home page", () => {
    learnThumbs(null, [{ image_urls: ["/finds/c-0.webp"], th: 0, tm: 1 }]);
    e3(thumb3("/finds/c-0.webp")).toBe("/finds/c-0.webp");
    e3(hasMid("/finds/c-0.webp")).toBe(true);
  });
  i3("the home page shell offers the copy it knows and the next photo when the main one fails", () => {
    learnThumbs({ thumbs: 1, rows });
    const photos = rows[0].image_urls.map((u) => MEDIA + u);
    const html = dealShell({ row: { ...rows[0], title: "House", price_eur: 1 }, photos, crumbs: [] });
    e3(html).toContain(`srcset="${MEDIA}/t/m/finds/a-0.webp 800w`);
    e3(html).toContain(`data-next="${MEDIA}/finds/a-1.webp"`);
    const b = dealShell({ row: { ...rows[1], title: "House", price_eur: 1 }, photos: [MEDIA + "/finds/b-0.webp"], crumbs: [] });
    e3(b).not.toContain("srcset");
    e3(b).not.toContain("onerror");
  });
});
