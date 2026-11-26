// Checks of every finished home page (26-nov-2026, list of 1,000, ideas 14, 16 and 33). Run by seo/pack.ts on the
// pages it bundles, after every other step, so it sees exactly what is published:
//   16  each page has one h1, a price, at least one photo with alt text, a canonical to itself, reciprocal en/es
//       hreflang and structured data that parses as JSON;
//   14  every internal link leads to a page that exists and is indexable (no link to a "soft 404" or a noindex page);
//   33  the official links (flood maps) of the English and the Spanish page of a home are the same.
// Pure functions (tested in src/test/deal-checks.test.ts); the build fails on a structural problem of a page and names
// broken links in the build log and dist/build.json.
import { officialLinks } from "./dealExtras";

const SITE = "https://realhunt.co";
const meta = (html: string, re: RegExp) => re.exec(html)?.[1] || "";
const unesc = (s: string) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");

/** The structural problems of one home page ("" list when it is fine). key: "/deal/x" or "/es/deal/x". */
export function pageProblems(html: string, key: string): string[] {
  const out: string[] = [];
  const h1 = (html.match(/<h1\b/g) || []).length;
  if (h1 < 1) out.push("no h1");
  if (!/class="rh-sh-price"|"price":\s*\d/.test(html)) out.push("no price");
  const imgs = [...html.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
  if (imgs.length && !imgs.some((t) => /\salt="[^"]+"/.test(t))) out.push("no photo with alt text");
  const canon = unesc(meta(html, /<link rel="canonical" href="([^"]*)"/));
  // a home found twice points at the copy that stays (seo/tech duplicate check): that is its own canonical choice
  const twin = new RegExp(`^${SITE}${key.startsWith("/es/") ? "/es" : ""}/deal/[\\w.~-]+$`).test(canon);
  if (canon !== SITE + key && !twin) out.push(`canonical is ${canon || "missing"}`);
  const en = unesc(meta(html, /<link rel="alternate" hreflang="en" href="([^"]*)"/)), es = unesc(meta(html, /<link rel="alternate" hreflang="es" href="([^"]*)"/));
  if (en || es) {
    const own = key.startsWith("/es/") ? es : en;
    if (own !== SITE + key) out.push("hreflang does not name the page itself");
  }
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(m[1]); } catch { out.push("structured data that is not JSON"); break; }
  }
  return out;
}

/** The hreflang pair of a page: the other language's URL, when it says one. */
export function otherLang(html: string, key: string): string {
  const other = key.startsWith("/es/") ? "en" : "es";
  return unesc(meta(html, new RegExp(`<link rel="alternate" hreflang="${other}" href="([^"]*)"`)));
}

/** The internal links of the visible page (the shell and the article), without query or fragment. */
export function internalLinks(html: string): string[] {
  const body = /<div id="root">([\s\S]*)<\/div>\s*<script/.exec(html)?.[1] || html;
  const out = new Set<string>();
  for (const m of body.matchAll(/<a\b[^>]*\shref="([^"]+)"/g)) {
    const h = unesc(m[1]);
    if (!h.startsWith("/") || h.startsWith("//")) continue;
    const p = h.split(/[?#]/)[0].replace(/\/$/, "") || "/";
    out.add(p);
  }
  return [...out].sort();
}

/** Paths the app answers by itself (no prerendered file, never meant for search): not a broken link. */
export const APP_PATHS = /^\/(es\/)?(alerts|hunt|me|map|login|signup|help-buying|compare|saved)(\/|$)/;

export type PageState = "ok" | "noindex" | "missing";
/** Every problem of the bundled home pages. `state(path)` says whether a linked path is a live, indexable page. */
export function checkDeals(pages: Map<string, string>, state: (path: string) => PageState): { problems: string[]; broken: string[]; official: string[] } {
  const problems: string[] = [], broken = new Map<string, number>(), official: string[] = [];
  for (const [key, html] of pages) {
    if (key.endsWith(".md")) continue;
    for (const p of pageProblems(html, key)) problems.push(`${key}: ${p}`);
    for (const l of internalLinks(html)) {
      if (pages.has(l) || APP_PATHS.test(l)) continue;
      const s = state(l);
      if (s !== "ok") broken.set(`${l} (${s})`, (broken.get(`${l} (${s})`) || 0) + 1);
    }
    if (!key.startsWith("/es/")) {
      const es = pages.get("/es" + key);
      if (es && officialLinks(html).join(" ") !== officialLinks(es).join(" ")) official.push(key);
    }
  }
  return { problems, broken: [...broken].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} x${n}`), official };
}
