// Technical checks over the pages exactly as they will be published (15-nov-2026). Called by seo/polish.ts once every
// page has its final HTML; the result goes into dist/seo-audit.json under "tech" and on /seo-report.
//
// Ideas of the organic-traffic list covered here: 103 (redirects in one hop, build side), 105 (tracking parameters in
// internal links), 108 (every noindex page with its reason), 109 (links that go through a redirect), 110 (the text is
// in the HTML without JavaScript), 118 (clicks from the front page), 119 (link texts), 122 to 124 (homes, guides and
// posts link where they should), 126 (a Spanish page follows its English page out of the index), 144 (canonical
// without parameters), 145 and 173 (scripts from other sites), 148 (photo sizes), 976 to 999 (seo/tech/rules.ts).
import type { Pg } from "../polish";
import { htmlHits, ldHits, pathHits, textHits, titleHits, countryHits, stuffing, signature, similarity, type Hit } from "./rules";

export type TechAudit = {
  summary: Record<string, number>;
  failures: string[];
  lists: Record<string, string[]>;
  depth: Record<string, number>;
  noindex: Record<string, number>;
  external: { scripts: string[]; frames: string[]; link_hosts: number };
};

/** Hosts a page may load a script or a frame from. The hosting worker adds Google Analytics on its side. */
export const KNOWN_SCRIPT_HOSTS = ["realhunt.co", "www.clarity.ms", "connect.facebook.net", "www.googletagmanager.com"];
export const KNOWN_FRAME_HOSTS = ["realhunt.co", "www.youtube-nocookie.com", "www.youtube.com", "www.openstreetmap.org"];
/** Fewer words than this in the HTML of an indexable page means its content only exists after JavaScript runs. */
export const MIN_WORDS_NO_JS = 40;
export const MAX_DEPTH = 4;
const LEGAL_KINDS = new Set(["guide", "costs", "calc", "canbuy"]);
const DISCLAIMER = /general information|\bnot\b[^.]{0,40}\badvice\b|información general|\bno\b[^.]{0,50}\b(asesoramiento|consejo)\b/i;

const ROOT = /(<div id="root">)([\s\S]*)(<\/div>\s*<script)/;
const rootOf = (h: string) => ROOT.exec(h)?.[2] ?? "";
const unesc = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
export const visible = (h: string) => unesc(h.replace(/<(script|style)\b[\s\S]*?<\/\1>/g, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const ldOf = (h: string): any[] => { const out: any[] = []; for (const m of h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) { try { out.push(JSON.parse(m[1])); } catch { /* seo/polishAudit.ts reports it */ } } return out; };
const hostOf = (u: string) => { try { return new URL(u, "https://realhunt.co").host; } catch { return ""; } };

export type TechInput = {
  pages: Map<string, Pg>; live: (p: string) => boolean; redirects: Record<string, string>; rows: any[];
  /** [title hash, day it last changed, how many times it changed in the 28 days before that] per page, from the build that is live */
  prevTitles?: Record<string, [string, string, number?]>; titles?: Record<string, [string, string, number?]>;
  placeNames?: string[];
};

export function techAudit(a: TechInput): TechAudit {
  const all = [...a.pages.values()];
  const idx = all.filter((p) => a.live(p.path));
  const lists: Record<string, string[]> = {};
  const level: Record<string, "fail" | "warn"> = {};
  const list = (k: string, v: string, lv: "fail" | "warn" = "warn") => { (lists[k] ||= []).push(v); if (lv === "fail" || !level[k]) level[k] = lv; };
  const hit = (pg: Pg, h: Hit) => list(h.rule, `${pg.path}: ${h.what}`, h.level);

  // ---- rules per page
  const homes = a.rows.length;
  const scripts = new Set<string>(), frames = new Set<string>(), linkHosts = new Set<string>();
  const sigs = new Map<string, { pg: Pg; sig: Uint32Array }[]>();
  const blank = a.placeNames?.length ? new RegExp("\\b(" + a.placeNames.filter((n) => n.length > 2).sort((x, y) => y.length - x.length).map((n) => n.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")\\b", "g") : null;
  for (const pg of all) {
    const root = rootOf(pg.html);
    for (const m of pg.html.matchAll(/<script\b[^>]*\ssrc="([^"]+)"/g)) { const h = hostOf(m[1]); scripts.add(h); if (!KNOWN_SCRIPT_HOSTS.includes(h)) list("script_from_unknown_host", `${pg.path}: ${m[1]}`, "fail"); }
    for (const m of pg.html.matchAll(/<iframe\b[^>]*\ssrc="([^"]+)"/g)) { const h = hostOf(m[1]); frames.add(h); if (!KNOWN_FRAME_HOSTS.includes(h)) list("frame_from_unknown_host", `${pg.path}: ${m[1]}`, "fail"); }
    for (const m of root.matchAll(/<a\b[^>]*\shref="(https?:\/\/[^"]+)"/g)) linkHosts.add(hostOf(m[1]));
    for (const h of htmlHits(root)) hit(pg, h);
    if (!a.live(pg.path)) continue;
    const body = visible(root);
    for (const h of [...textHits(`${pg.title} ${pg.desc} ${body}`, { homes }), ...titleHits(pg.title, pg.kind), ...pathHits(pg.en), ...ldHits(ldOf(pg.html))]) hit(pg, h);
    if (/[?#]/.test(/<link rel="canonical" href="([^"]*)"/.exec(pg.html)?.[1] || "")) list("canonical_with_parameters", pg.path, "fail");
    const own = visible(root.replace(/<aside class="rh-rel[\s\S]*?<\/aside>/g, " ").replace(/<nav\b[\s\S]*?<\/nav>/g, " "));
    const ownWords = own ? own.split(" ").length : 0;
    if (ownWords < MIN_WORDS_NO_JS) list("no_text_without_javascript", `${pg.path} (${ownWords} words)`);
    if (LEGAL_KINDS.has(pg.kind) && pg.en.split("/").length > 2 && !DISCLAIMER.test(body)) list("legal_page_without_disclaimer", pg.path);
    // prose only (paragraphs and headings): a list of 269 links that all start "Can a ... buy property in" is an index, not stuffing
    const prose = visible([...root.matchAll(/<(p|h[1-3])\b[^>]*>[\s\S]*?<\/\1>/g)].map((m) => m[0]).join(" "));
    const st = stuffing(blank ? prose.toLowerCase().replace(blank, " ") : prose);
    if (st) list("keyword_stuffing", `${pg.path}: "${st.phrase}" ${st.count} times, ${Math.round(st.share * 100)}% of the words`);
    if (pg.html.length > 300_000) list("html_over_300kb", `${pg.path} (${Math.round(pg.html.length / 1024)} KB)`);
    // near-identical pages: compared inside the same kind and language, on the page's own text (not the shared blocks)
    if (pg.kind !== "deal" && ownWords >= 120) { const k = `${pg.lang}:${pg.kind}`; (sigs.get(k) || sigs.set(k, []).get(k)!).push({ pg, sig: signature(own, blank) }); }
  }
  for (const group of sigs.values()) {
    for (let i = 0; i < group.length; i++) for (let j = i + 1; j < group.length; j++) {
      const s = similarity(group[i].sig, group[j].sig);
      if (s >= 0.92) list("near_identical_pages", `${group[i].pg.path} ~ ${group[j].pg.path} (${Math.round(s * 100)}%)`);
    }
  }
  for (const h of countryHits(a.rows)) list(h.rule, h.what);
  // texts kept with the home: an em dash there is replaced on the published pages, the source still has it
  for (const r of a.rows) if ([r.title, r.why_great, r.why_cheap, r.title_es, r.why_great_es, r.why_cheap_es, r.costs_note].some((x) => typeof x === "string" && x.includes("\u2014"))) list("em_dash_in_home_data", String(r.slug));
  // idea 985: the name of a village is not translated. The Spanish page of a home must still name its town as the data has it.
  const bySlug = new Map<string, any>(a.rows.map((r) => [String(r.slug), r]));
  for (const pg of idx) {
    if (pg.lang !== "es" || pg.kind !== "deal") continue;
    const town = String(bySlug.get(pg.en.slice(6))?.location_name || "").split(",")[0].trim();
    if (town.length > 2 && !unesc(pg.html).includes(town)) list("place_name_changed_in_spanish", `${pg.path}: ${town}`);
  }

  // ---- redirects: one hop, to a page that exists, never from a page
  for (const [from, to] of Object.entries(a.redirects)) {
    if (to === "410") continue;
    if (a.redirects[to] !== undefined) list("redirect_chain", `${from} -> ${to} -> ${a.redirects[to]}`, "fail");
    else if (!a.pages.has(to)) list("redirect_to_missing_page", `${from} -> ${to}`, "fail");
    if (a.pages.has(from) && !a.pages.get(from)!.dupOf) list("redirect_from_a_page", from, "fail");
  }
  for (const pg of all) for (const l of pg.links) if (a.redirects[l] !== undefined && !a.pages.has(l)) list("link_through_redirect", `${pg.path} -> ${l}`, "fail");

  // ---- clicks from the front page (English from /, Spanish from /es)
  const depthOf = new Map<string, number>();
  for (const start of ["/", "/es"]) {
    if (!a.pages.has(start)) continue;
    let frontier = [start]; depthOf.set(start, 0);
    for (let d = 1; frontier.length; d++) {
      const next: string[] = [];
      for (const p of frontier) for (const l of a.pages.get(p)!.links) if (a.pages.has(l) && !depthOf.has(l)) { depthOf.set(l, d); next.push(l); }
      frontier = next;
    }
  }
  const depth: Record<string, number> = {};
  for (const pg of idx) {
    const d = depthOf.get(pg.path);
    depth[d === undefined ? "unreachable" : String(d)] = (depth[d === undefined ? "unreachable" : String(d)] || 0) + 1;
    if (d === undefined) list("not_reachable_from_front_page", pg.path); else if (d > MAX_DEPTH) list("more_than_4_clicks_deep", `${pg.path} (${d})`);
  }

  // ---- links each page type owes its reader
  const cc = (pg: Pg) => pg.cc; const pre = (pg: Pg) => (pg.lang === "es" ? "/es" : "");
  for (const pg of idx) {
    const has = (p: string) => pg.links.has(p);
    const n = (re: RegExp) => [...pg.links].filter((l) => re.test(l) && a.live(l)).length;
    if (pg.kind === "deal" && cc(pg)) {
      for (const k of ["guide", "costs"]) if (a.live(`${pre(pg)}/${k}/${cc(pg)}`) && !has(`${pre(pg)}/${k}/${cc(pg)}`)) list("home_without_link_to_its_guide_or_costs", `${pg.path} -> ${pre(pg)}/${k}/${cc(pg)}`);
      if ([...a.pages.keys()].length && a.live(`${pre(pg)}/homes/${cc(pg)}`) && !has(`${pre(pg)}/homes/${cc(pg)}`)) list("home_without_link_to_its_country", pg.path);
    }
    if (pg.kind === "guide" && cc(pg) && a.live(`${pre(pg)}/homes/${cc(pg)}`)) {
      const listings = n(new RegExp(`^${pre(pg)}/homes/${cc(pg)}(/|$)`)), deals = n(new RegExp(`^${pre(pg)}/deal/`));
      const there = idx.filter((p) => p.kind === "deal" && p.lang === pg.lang && p.cc === cc(pg)).length;
      if (listings < Math.min(3, 1 + idx.filter((p) => p.lang === pg.lang && p.cc === cc(pg) && (p.kind === "band" || p.kind === "type" || p.kind === "region")).length) || deals < Math.min(5, there)) list("guide_without_listings_or_homes", `${pg.path} (${listings} lists, ${deals} homes)`);
    }
    if (pg.kind === "blog" && pg.en.startsWith("/blog/") && !n(new RegExp(`^${pre(pg)}/(homes|cheap-houses|new|price-drops|top)(/|$)`))) list("post_without_link_to_a_listing", pg.path);
  }
  // ---- every home page, in both languages (20-nov-2026, ideas 71, 72 and 76): title, description, one h1, its own
  // canonical, the main photo with its alt text and its preload, and at least 3 indexable pages that link to it.
  const inl = new Map<string, number>();
  for (const pg of idx) for (const l of pg.links) if (l !== pg.path) inl.set(l, (inl.get(l) || 0) + 1);
  const rowOf = new Map<string, any>(a.rows.map((r) => [String(r.slug), r]));
  for (const pg of idx) {
    if (pg.kind !== "deal") continue;
    const miss = homeBasics(pg.html, pg.path, (rowOf.get(pg.en.slice(6))?.image_urls || []).length > 0);
    if (miss.length) list("home_page_missing_basics", `${pg.path}: ${miss.join(", ")}`, "fail");
    const n = inl.get(pg.path) || 0;
    if (n < 3) list("home_linked_from_under_3_pages", `${pg.path} (${n})`, "fail");
  }

  // ---- a Spanish page follows its English page out of the index, and back
  for (const pg of all) if (pg.lang === "es") { const en = a.pages.get(pg.en); if (en && en.noindex && a.live(pg.path)) list("spanish_indexable_english_noindex", pg.path, "fail"); }

  // ---- titles that changed again within four weeks (idea 1000)
  let changed = 0;
  for (const [p, t] of Object.entries(a.titles || {})) {
    const was = a.prevTitles?.[p]; if (!was || was[0] === t[0]) continue;
    changed++;
    if ((t[2] || 0) >= 1) list("title_changed_twice_in_28_days", `${p}: ${a.pages.get(p)?.title || ""}`);
  }

  // ---- what is out of the index, and why
  const noindex: Record<string, number> = {};
  for (const pg of all) if (pg.noindex) { const k = pg.why || (pg.noindex0 ? "set by its template" : "other"); noindex[k] = (noindex[k] || 0) + 1; }

  const failures: string[] = [];
  for (const k of Object.keys(lists).sort()) if (level[k] === "fail") failures.push(`${k.replace(/_/g, " ")}: ${lists[k].length} (${lists[k].slice(0, 4).join("; ").slice(0, 400)}${lists[k].length > 4 ? "; ..." : ""})`);
  const summary: Record<string, number> = { checked: all.length, indexable: idx.length, max_depth: Math.max(0, ...idx.map((p) => depthOf.get(p.path) ?? 0)), titles_changed_since_last_build: changed, external_link_hosts: linkHosts.size };
  for (const k of Object.keys(lists)) summary[k] = lists[k].length;
  for (const k of Object.keys(lists)) if (lists[k].length > 40) lists[k] = [...lists[k].slice(0, 40), `... ${lists[k].length - 40} more`];
  return { summary, failures, lists, depth, noindex, external: { scripts: [...scripts].sort(), frames: [...frames].sort(), link_hosts: linkHosts.size } };
}

/** What a published home page lacks of the basics: title, description, exactly one h1, a canonical that is its own
 * address, and (when the home has photos) the main photo with alt text and its preload in the head. */
export function homeBasics(html: string, path: string, hasPhoto: boolean): string[] {
  const miss: string[] = [];
  if (!/<title>[^<]+<\/title>/.test(html)) miss.push("title");
  if (!/<meta name="description" content="[^"]+"/.test(html)) miss.push("description");
  if ([...rootOf(html).matchAll(/<h1\b/g)].length !== 1) miss.push("one h1");
  if ((/<link rel="canonical" href="([^"]*)"/.exec(html)?.[1] || "") !== "https://realhunt.co" + path) miss.push("own canonical");
  if (hasPhoto) {
    if (!/<img src="[^"]+" alt="[^"]+" fetchpriority="high"/.test(rootOf(html))) miss.push("main photo with alt text");
    if (!/<link rel="preload" as="image" href="[^"]+"/.test(html.slice(0, html.indexOf("</head>")))) miss.push("photo preload");
  }
  return miss;
}

// ------------------------------------------------------------------------------------------ fixes before the checks
const TRACK = /([?&])(utm_[a-z]+|ref|fbclid|gclid|msclkid|mc_cid|mc_eid|igshid)=[^&#"]*/gi;
/** An internal address without tracking parameters: "/homes/spain?utm_source=x&sort=price" -> "/homes/spain?sort=price". */
export const cleanHref = (href: string) => href.replace(TRACK, "$1").replace(/([?&])&+/g, "$1").replace(/[?&](#|$)/, "$1");
/** Em dashes are never published (house rule): the sentence keeps its pause with a comma. */
export const noEmDash = (s: string) => s.replace(/\s*—\s*/g, ", ");

/** Rewrites what can be fixed without a person: internal links with tracking parameters, internal links that point
 * at an address that now redirects, em dashes in texts that came with the data. Returns what it changed. */
export function techHeal(pages: Map<string, Pg>, redirects: Record<string, string>): Record<string, number> {
  const n: Record<string, number> = {};
  const bump = (k: string) => { n[k] = (n[k] || 0) + 1; };
  for (const pg of pages.values()) {
    let h = pg.html;
    if (h.includes("—")) { h = noEmDash(h); bump("pages_with_em_dash_replaced"); }
    h = h.replace(/(<a\b[^>]*?\shref=")(\/[^"]*)(")/g, (m, a: string, href: string, z: string) => {
      if (href.startsWith("//")) return m;
      let to = href;
      if (TRACK.test(to)) { TRACK.lastIndex = 0; to = cleanHref(to); bump("tracking_parameters_removed"); }
      TRACK.lastIndex = 0;
      const p = to.replace(/[?#].*$/, "").replace(/\/+$/, "") || "/";
      const t = redirects[p];
      if (t !== undefined && t !== "410" && !pages.has(p) && pages.has(t)) { to = t + to.slice(to.search(/[?#]|$/)); bump("links_pointed_past_a_redirect"); }
      return to === href ? m : a + to + z;
    });
    if (h !== pg.html) pg.html = h;
  }
  return n;
}
