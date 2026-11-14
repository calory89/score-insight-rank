// One table for the languages of the site (idea 125): every hreflang tag, in the pages and in the XML sitemaps, is
// written from it, so a third language is one line here and not a search through the templates.
//
// A language that is not `live` has no pages yet: it is in the table so its prefix is reserved and tested, and
// nothing is written for it. Rules that Google asks for and checkLocales() enforces: one prefix per language, one
// x-default, every page of a set names every other page of the set and itself.
export type Locale = { code: string; hreflang: string; prefix: string; name: string; live: boolean; xDefault?: boolean };

export const LOCALES: Locale[] = [
  { code: "en", hreflang: "en", prefix: "", name: "English", live: true, xDefault: true },
  { code: "es", hreflang: "es", prefix: "/es", name: "Español", live: true },
  { code: "de", hreflang: "de", prefix: "/de", name: "Deutsch", live: false },
  { code: "ru", hreflang: "ru", prefix: "/ru", name: "Русский", live: false },
];

const prefixed = (ls: Locale[]) => ls.filter((l) => l.prefix).sort((a, b) => b.prefix.length - a.prefix.length);
/** The language of an address, by its prefix. */
export const localeOf = (path: string, ls: Locale[] = LOCALES): Locale => prefixed(ls).find((l) => path === l.prefix || path.startsWith(l.prefix + "/")) || ls.find((l) => !l.prefix)!;
/** The address without its language prefix: "/es/homes/spain" -> "/homes/spain", "/es" -> "/". */
export const basePath = (path: string, ls: Locale[] = LOCALES): string => { const l = localeOf(path, ls); return l.prefix ? path.slice(l.prefix.length) || "/" : path; };
/** The address of a page in a language: ("/homes/spain", es) -> "/es/homes/spain"; ("/", es) -> "/es". */
export const inLocale = (base: string, l: Locale): string => (l.prefix ? (base === "/" ? l.prefix : l.prefix + base) : base);

/** [hreflang, address] for every live language in which the page exists, then x-default. Empty when the page
 * exists in one language only: a page with no translation carries no hreflang. */
export function alternates(base: string, exists: (path: string) => boolean, ls: Locale[] = LOCALES): [string, string][] {
  const have = ls.filter((l) => l.live && exists(inLocale(base, l)));
  if (have.length < 2) return [];
  const def = have.find((l) => l.xDefault) || have[0];
  return [...have.map((l): [string, string] => [l.hreflang, inLocale(base, l)]), ["x-default", inLocale(base, def)]];
}
const abs = (site: string, p: string) => site + (p === "/" ? "/" : p);
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
/** <link rel="alternate"> tags for the <head> of a page. */
export const hreflangTags = (base: string, exists: (p: string) => boolean, site: string, ls: Locale[] = LOCALES) =>
  alternates(base, exists, ls).map(([h, p]) => `<link rel="alternate" hreflang="${h}" href="${esc(abs(site, p))}" />`).join("");
/** <xhtml:link> elements for a <url> of an XML sitemap. */
export const sitemapAlternates = (base: string, exists: (p: string) => boolean, site: string, ls: Locale[] = LOCALES) =>
  alternates(base, exists, ls).map(([h, p]) => `<xhtml:link rel="alternate" hreflang="${h}" href="${esc(abs(site, p))}"/>`).join("");

/** What is wrong with a table of languages; empty when it is sound. */
export function checkLocales(ls: Locale[] = LOCALES): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const l of ls) {
    for (const k of [`code ${l.code}`, `hreflang ${l.hreflang}`, `prefix ${l.prefix || "(none)"}`]) { if (seen.has(k)) out.push(`two languages share ${k}`); seen.add(k); }
    if (l.prefix && !/^\/[a-z]{2}(-[a-z]{2})?$/.test(l.prefix)) out.push(`prefix ${l.prefix} is not /xx or /xx-yy`);
    if (!/^[a-z]{2}(-[A-Z]{2})?$/.test(l.hreflang)) out.push(`hreflang ${l.hreflang} is not a language code`);
  }
  if (ls.filter((l) => l.xDefault).length !== 1) out.push("exactly one language must be x-default");
  if (ls.some((l) => l.xDefault && !l.live)) out.push("x-default must be a live language");
  return out;
}
