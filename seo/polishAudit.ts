// Build-time SEO report (14-nov-2026): dist/seo-audit.json, written by seo/polish.ts from the pages as they will be
// published. `failures` stops the build (and CI): broken internal links, an indexable page without title, description
// or exactly one h1, two indexable pages with the same title, hreflang that points at a noindex or missing page, an
// indexable page nothing links to. Everything else is a number to watch.
import type { Pg } from "./polish";
import { ldOf, rootOf } from "./polish";
import { TITLE_MAX, DESC_MIN, DESC_MAX } from "./polishMeta";

export type Audit = {
  summary: Record<string, number>;
  failures: string[];
  groups: Record<string, { pages: number; indexable: number; noindex: number; median_words: number; title_over_60: number; desc_out_of_range: number; inlinks_under_3: number }>;
  noindex_by_polish: Record<string, number>;
  healed_links: Record<string, number>;
  json_ld: { notes: Record<string, number>; missing: Record<string, number> };
  lists: Record<string, string[]>;
  sitemaps?: Record<string, number>;
  spanish?: unknown;
  /** seo/tech/audit.ts: house rules, clicks from the front page, redirects, scripts from other sites */
  tech?: import("./tech/audit").TechAudit;
};

// Paths that are files or services, not pages.
const NOT_PAGE = /^\/(assets|data|finds|t|og|i18n|images|videos|badge|__sb|__k|api|cdn-cgi)(\/|$)|\.[a-z0-9]{2,5}$/i;
const groupKey = (pg: Pg) => { const s = pg.en.split("/").filter(Boolean); return (pg.lang === "es" ? "/es" : "") + "/" + (s[0] || "") + (s.length > 1 ? "/*" : "") + (s.length > 2 ? "/*" : ""); };
const median = (xs: number[]) => { const a = xs.slice().sort((p, q) => p - q); return a.length ? a[Math.floor(a.length / 2)] : 0; };
// The JSON-LD each page type should carry (Google: breadcrumbs everywhere; lists on listings; an offer with price and
// availability on a home; author and dates on an article).
const NEEDS: Record<string, string[]> = { deal: ["RealEstateListing"], country: ["ItemList"], band: ["ItemList"], type: ["ItemList"], region: ["ItemList"], cheap: ["ItemList"], source: ["ItemList"], topdest: ["ItemList"], home: ["ItemList", "WebSite", "Organization"] };

export function audit(a: { pages: Map<string, Pg>; live: (p: string) => boolean; appRoute: (p: string) => boolean; healed: Record<string, number>; ldNotes: Record<string, number>; lastmod: Map<string, string>; redirects: number; stubs?: Map<string, string>; es?: any }): Audit {
  const all = [...a.pages.values()];
  const idx = all.filter((p) => a.live(p.path));
  const failures: string[] = [];
  const lists: Record<string, string[]> = {};
  const list = (k: string, v: string) => { (lists[k] ||= []).push(v); };
  const fail = (k: string, what: string) => { const n = lists[k]?.length || 0; if (n) failures.push(`${what}: ${n} (${lists[k].slice(0, 5).join(", ")}${n > 5 ? ", ..." : ""})`); };

  // ---- internal links
  const inl = new Map<string, Set<string>>();
  for (const pg of all) {
    for (const l of pg.links) {
      const t = a.pages.get(l);
      if (t) { if (a.live(pg.path) && l !== pg.path) (inl.get(l) || inl.set(l, new Set()).get(l)!).add(pg.path); if (t.dupOf) list("links_to_duplicate", `${pg.path} -> ${l}`); }
      else if (!NOT_PAGE.test(l) && !a.appRoute(l) && !a.stubs?.has(l)) list("broken_links", `${pg.path} -> ${l}`);
    }
  }
  const inlinks = (p: string) => inl.get(p)?.size || 0;
  for (const pg of idx) { const n = inlinks(pg.path); if (pg.path !== "/" && n === 0) list("orphans", pg.path); else if (pg.path !== "/" && n < 3) list("inlinks_under_3", `${pg.path} (${n})`); }

  // ---- head and h1
  const titles = new Map<string, string[]>(), descs = new Map<string, string[]>();
  for (const pg of idx) {
    const h1 = [...rootOf(pg.html).matchAll(/<h1\b/g)].length;
    if (!pg.title) list("no_title", pg.path);
    if (!pg.desc) list("no_description", pg.path);
    if (h1 !== 1) list("h1_not_one", `${pg.path} (${h1})`);
    if (!/<html[^>]*\slang="(en|es)"/.test(pg.html)) list("no_lang", pg.path);
    if (/<(?:img|script|link|iframe|source|video)\b[^>]*\s(?:src|href)="http:\/\//.test(pg.html)) list("mixed_content", pg.path);
    (titles.get(pg.title) || titles.set(pg.title, []).get(pg.title)!).push(pg.path);
    (descs.get(pg.desc) || descs.set(pg.desc, []).get(pg.desc)!).push(pg.path);
    if (pg.title.length > TITLE_MAX) list("title_over_60", pg.path);
    if (pg.title.length < 20) list("title_under_20", pg.path);
    if (pg.desc.length > DESC_MAX) list("desc_over_155", pg.path);
    if (pg.desc.length < DESC_MIN) list("desc_under_120", pg.path);
    if (pg.words < 150) list("thin_under_150_words", pg.path);
  }
  for (const [t, ps] of titles) if (t && ps.length > 1) list("duplicate_titles", ps.join(" = "));
  for (const [, ps] of descs) if (ps.length > 1) list("duplicate_descriptions", ps.slice(0, 4).join(" = ") + (ps.length > 4 ? ` (+${ps.length - 4})` : ""));

  // ---- hreflang: both pages indexable, each naming the other; a noindex page carries none
  for (const pg of all) {
    const alt = pg.alt; if (!Object.keys(alt).length) continue;
    if (!a.live(pg.path)) { list("hreflang_problems", `${pg.path} is noindex and has hreflang`); continue; }
    for (const k of ["en", "es"]) {
      const t = a.pages.get(alt[k] || "");
      if (!t || !a.live(t.path)) list("hreflang_problems", `${pg.path} -> ${k} ${alt[k] || "(none)"} is missing or noindex`);
      else if (t.alt.en !== alt.en || t.alt.es !== alt.es) list("hreflang_problems", `${pg.path} and ${t.path} do not name each other`);
    }
    if (alt.en !== pg.path && alt.es !== pg.path) list("hreflang_problems", `${pg.path} is not in its own hreflang`);
  }

  // ---- JSON-LD by page type
  const missing: Record<string, number> = {};
  for (const pg of idx) {
    const lds = ldOf(pg.html);
    if (lds.some((o) => o === null)) list("json_ld_not_json", pg.path);
    const types = new Set<string>(); const walk = (o: any) => { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === "object") { if (typeof o["@type"] === "string") types.add(o["@type"]); Object.values(o).forEach(walk); } };
    lds.forEach(walk);
    const need = [...(NEEDS[pg.kind] || []), ...(pg.path === "/" || pg.path === "/es" ? [] : ["BreadcrumbList"]), ...(pg.kind === "blog" && pg.en.startsWith("/blog/") ? ["Article"] : [])];
    for (const t of need) if (!types.has(t)) { const k = `${pg.kind}: no ${t}`; missing[k] = (missing[k] || 0) + 1; }
  }

  // ---- by group
  const groups: Audit["groups"] = {};
  const tooLong = new Set(lists.title_over_60 || []), dOut = new Set([...(lists.desc_over_155 || []), ...(lists.desc_under_120 || [])]);
  const byGroup = new Map<string, Pg[]>(); for (const pg of all) (byGroup.get(groupKey(pg)) || byGroup.set(groupKey(pg), []).get(groupKey(pg))!).push(pg);
  for (const [g, ps] of [...byGroup].sort((x, y) => x[0].localeCompare(y[0]))) {
    const ix = ps.filter((p) => a.live(p.path));
    groups[g] = { pages: ps.length, indexable: ix.length, noindex: ps.length - ix.length, median_words: median(ix.map((p) => p.words)), title_over_60: ix.filter((p) => tooLong.has(p.path)).length, desc_out_of_range: ix.filter((p) => dOut.has(p.path)).length, inlinks_under_3: ix.filter((p) => p.path !== "/" && inlinks(p.path) < 3).length };
  }
  const byWhy: Record<string, number> = {};
  for (const pg of all) if (pg.noindex && !pg.noindex0) byWhy[pg.why || "other"] = (byWhy[pg.why || "other"] || 0) + 1;

  fail("broken_links", "internal links to pages that do not exist");
  fail("no_title", "indexable pages without a title");
  fail("no_description", "indexable pages without a description");
  fail("h1_not_one", "indexable pages without exactly one h1");
  fail("duplicate_titles", "titles shared by two or more indexable pages");
  fail("hreflang_problems", "hreflang problems");
  fail("orphans", "indexable pages that no page links to");
  fail("json_ld_not_json", "pages with JSON-LD that does not parse");

  const n = (k: string) => lists[k]?.length || 0;
  const summary = {
    pages: all.length, indexable: idx.length, noindex: all.length - idx.length, noindex_by_polish: Object.values(byWhy).reduce((x, y) => x + y, 0),
    duplicate_homes: all.filter((p) => p.dupOf).length,
    title_over_60: n("title_over_60"), desc_over_155: n("desc_over_155"), desc_under_120: n("desc_under_120"), desc_out_of_range: n("desc_over_155") + n("desc_under_120"),
    duplicate_titles: n("duplicate_titles"), duplicate_descriptions: n("duplicate_descriptions"), h1_not_one: n("h1_not_one"),
    broken_links: n("broken_links"), healed_links: Object.keys(a.healed).length, orphans: n("orphans"), inlinks_under_3: n("inlinks_under_3"),
    hreflang_problems: n("hreflang_problems"), pages_with_hreflang: idx.filter((p) => p.alt.en).length, thin_under_150_words: n("thin_under_150_words"),
    mixed_content: n("mixed_content"), no_lang: n("no_lang"), with_lastmod: a.lastmod.size, redirects: a.redirects, moved_stubs: a.stubs?.size || 0,
  };
  for (const k of Object.keys(lists)) if (lists[k].length > 60) lists[k] = [...lists[k].slice(0, 60), `... ${lists[k].length - 60} more`];
  return { summary, failures, groups, noindex_by_polish: byWhy, healed_links: a.healed, json_ld: { notes: a.ldNotes, missing }, lists, spanish: a.es ? { twins: a.es.twins, groups: a.es.groups } : undefined };
}
