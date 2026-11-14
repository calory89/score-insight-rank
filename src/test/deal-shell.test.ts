// First paint of a home page: the prerendered shell (seo/dealShell.ts) and the row the app starts from (bootrow.ts).
import { describe, it, expect } from "vitest";
import { dealShell, shellTitle, shellMoney, shellMoneyEs, DEAL_SHELL_HEAD } from "../../seo/dealShell";
import { bootRow, seedBootRow, openedHere } from "@/community/bootrow";
import { money } from "@/community/api";
import { MEDIA } from "@/lib/media";

const row = {
  id: "11111111-1111-1111-1111-111111111111", slug: "es-test-99k", title: "Stone house with a garden", title_es: "Casa de piedra con jardín",
  price_eur: 99000, country: "Spain", location_name: "Árchez, Málaga", category: "village", sqm: 80,
  image_urls: ["/finds/es-test-99k-0.webp", "/finds/es-test-99k-1.webp"], source_url: "https://example.com/x", hunter_handle: "someone",
};
const photos = row.image_urls.map((u) => MEDIA + u);

describe("dealShell", () => {
  const html = dealShell({ row, photos, lowRes: MEDIA + "/t/finds/es-test-99k-0.webp", color: "#abcdef", crumbs: [["Spain", "/homes/spain"], ["Málaga", ""]] });
  it("draws the main photo first, at high priority, over its small copy", () => {
    expect(html).toContain(`<img src="${MEDIA}/finds/es-test-99k-0.webp" alt="Stone house with a garden, Árchez, Málaga, €99,000" fetchpriority="high"`);
    expect(html).toContain(`background:url(&quot;${MEDIA}/t/finds/es-test-99k-0.webp&quot;)`);
    expect(html).toContain('class="rh-sh-gal n2" style="background-color:#abcdef"');
    expect(html.match(/loading="lazy"/g)?.length).toBe(1);
    expect(html).toContain("1 / 2");
  });
  it("has the title once as the h1, the price as the app formats it, and stays on screen while the app boots", () => {
    expect(html.match(/<h1>/g)?.length).toBe(1);
    expect(html).toContain("<h1>Stone house with a garden</h1>");
    expect(html).toContain(`<div class="rh-sh-price">${money(99000)}</div>`);
    expect(html).toContain("data-rh-keep");
    expect(shellMoney(447600)).toBe(money(447600));
  });
  it("links the country, and a region only when it has a page", () => {
    expect(html).toContain('<a href="/homes/spain">Spain</a> · <span>Málaga</span> · Village homes');
  });
  it("embeds the row for the app without breaking out of the script", () => {
    const evil = dealShell({ row: { ...row, title: "A </script><b>x" }, photos, crumbs: [] });
    expect(evil).not.toContain("</script><b>x");
    expect(evil).toContain("window.__rhHome=");
  });
  it("Spanish: the title is swapped before paint, or hidden when there is no Spanish title; price in Spanish format", () => {
    expect(html).toContain('"Casa de piedra con jardín"');
    expect(html).toContain(JSON.stringify(shellMoneyEs(99000)));
    expect(shellMoneyEs(447600)).toBe("447.600 €");
    expect(shellMoneyEs(9500)).toBe("9.500 €");
    const es = dealShell({ row, photos, crumbs: [], lang: "es" });
    expect(es).toContain("<h1>Casa de piedra con jardín</h1>");
    expect(es).toContain('<div class="rh-sh-eye"></div>'); // no English words in the Spanish page; the line keeps its height
    expect(es).toContain("99.000 €</div>");
  });
  it("uses the app's title rule", () => {
    expect(shellTitle({ title: "€35,000 · Your own home" })).toBe("Your own home");
    expect(shellTitle({ title: "Property - Japan", location_name: "Kyoto", sqm: 70 })).toBe("70 m² home in Kyoto");
  });
  it("the head block never shows the English article or country line to Spanish visitors, and has no em dash", () => {
    expect(DEAL_SHELL_HEAD).toContain('html[data-lang="es"] .rh-shell~.rh-static:not([lang="es"]){display:none}');
    expect(DEAL_SHELL_HEAD).toContain('html[data-lang="es"] .rh-sh-eye{visibility:hidden}');
    expect(DEAL_SHELL_HEAD + html).not.toContain("—");
  });
});

describe("bootRow", () => {
  it("gives the row for its own page only, with photos on the media host and no listing link", () => {
    const r = bootRow(row, "/deal/es-test-99k")!;
    expect(r.image_urls[0]).toBe(MEDIA + "/finds/es-test-99k-0.webp");
    expect(r.has_source).toBe(true);
    expect(r.source_url).toBeUndefined();
    expect(bootRow(row, "/deal/es-test-99k/")).not.toBeNull();
    expect(bootRow(row, "/es/deal/es-test-99k")).not.toBeNull();
    expect(bootRow(row, "/deal/another")).toBeNull();
    expect(bootRow(row, "/")).toBeNull();
    expect(bootRow(null, "/deal/es-test-99k")).toBeNull();
    expect(bootRow({ slug: "es-test-99k" }, "/deal/es-test-99k")).toBeNull();
  });
  it("skips a home that is not published yet", () => {
    expect(bootRow({ ...row, publish_at: "2999-01-01T00:00:00Z" }, "/deal/es-test-99k")).toBeNull();
    expect(bootRow({ ...row, publish_at: "2020-01-01T00:00:00Z" }, "/deal/es-test-99k")).not.toBeNull();
  });
  it("seeds the cache once and never replaces a row that is already there", () => {
    const cache = new Map<string, any>();
    (window as any).__rhHome = row;
    history.replaceState(null, "", "/deal/es-test-99k");
    seedBootRow(cache);
    expect(cache.get("es-test-99k")?.id).toBe(row.id);
    expect((window as any).__rhHome).toBeUndefined();
    expect(openedHere("another")).toBe(false);
    expect(openedHere("es-test-99k")).toBe(true); // the page it was opened on: keep the reader's scroll position
    expect(openedHere("es-test-99k")).toBe(false); // only once; later visits start at the top
    const kept = { id: "kept" };
    const c2 = new Map<string, any>([["es-test-99k", kept]]);
    (window as any).__rhHome = row;
    seedBootRow(c2);
    expect(c2.get("es-test-99k")).toBe(kept);
    history.replaceState(null, "", "/");
  });
});
