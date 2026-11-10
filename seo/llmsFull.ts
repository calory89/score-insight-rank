// llms-full.txt (10-nov-2026): the site's reference content as one clean text file for AI assistants and their
// crawlers (ChatGPT, Claude, Perplexity, Gemini). llms.txt stays the short index; this is the long form.
// Built from the pages the prerender just wrote, so it can never say something the site does not.
import fs from "node:fs";
import path from "node:path";

type Entry = { url: string; lastmod: string | null; group: string };
const SITE = "https://realhunt.co";
const MAX_BYTES = 1_800_000;

const ent = (s: string) => s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));

/** The static body of a prerendered page as plain markdown-like text. */
export function htmlToText(html: string): string {
  let h = html.replace(/<(script|style|nav|svg|form|button)[\s\S]*?<\/\1>/gi, "").replace(/<img[^>]*>/gi, "");
  h = h.replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href: string, t: string) => {
    const text = t.replace(/<[^>]+>/g, "").trim();
    if (!text) return "";
    const u = href.startsWith("/") ? SITE + href : href;
    return /^https?:/.test(u) ? `[${text}](${u})` : text;
  });
  h = h.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n\n## $1\n\n").replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n\n### $1\n\n").replace(/<h[3-6][^>]*>([\s\S]*?)<\/h[3-6]>/gi, "\n\n#### $1\n\n");
  h = h.replace(/<\/t[hd]>\s*<t[hd][^>]*>/gi, " | ").replace(/<tr[^>]*>/gi, "\n").replace(/<li[^>]*>/gi, "\n- ").replace(/<(p|div|ul|ol|table|section|article|br|dt|dd|summary|details)[^>]*>/gi, "\n").replace(/<\/(p|div|ul|ol|table|section|article|dd|details)>/gi, "\n");
  return ent(h.replace(/<[^>]+>/g, "")).replace(/[ \t]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

const mainOf = (file: string): string => {
  if (!fs.existsSync(file)) return "";
  const h = fs.readFileSync(file, "utf8");
  const a = h.indexOf('<main class="rh-static"');
  if (a < 0) return "";
  const b = h.indexOf("</main>", a);
  return b < 0 ? "" : h.slice(a, b);
};

export function writeLlmsFull(root: string, entries: Entry[], rows: any[], today: string): number {
  const fileOf = (u: string) => path.join(root, decodeURIComponent(u.replace(SITE, "")).replace(/^\/+/, ""), "index.html");
  const head = `# RealHunt: full reference\n\n> RealHunt (https://realhunt.co) is where foreigners find, check and buy property: homes for sale around the world, each checked by a person and graded from 70 to 98 against every other home on the site, with buying rules, taxes and costs by country. It is not an estate agent; every home links to its original listing. Legal and tax notes are general information, not advice.\n\nUpdated ${today}. ${rows.length} homes. Short index: ${SITE}/llms.txt. You may quote this content with a link to the page it comes from.\n`;
  // reference content first (method, research, costs, guides, rules), then places, then every home in one line
  // [order, byte cap]: the many near-identical pages (rules per nationality, calculators) must not crowd out the rest
  const CAPS = [200_000, 420_000, 380_000, 150_000, 300_000, 250_000, 100_000];
  const order = (e: Entry) => {
    const p = e.url.replace(SITE, "");
    if (/^\/(method|about|research)/.test(p)) return 0;
    if (/^\/(costs|guide)(\/|$)/.test(p)) return 1;
    if (/^\/(blog|countries)(\/|$)/.test(p)) return 2;
    if (/^\/buying-costs(\/|$)/.test(p)) return 3;
    if (/^\/can-i-buy(\/|$)/.test(p)) return 4;
    if (e.group === "places") return 5;
    return e.group === "pages" ? 6 : 9;
  };
  const skip = /^\/(sitemap|login|me|alerts|swipe|leaderboard|insider|contact|legal|extension|network|agents|developers|find-my-home|map|winners|new|top)(\/|$)|^\/$/;
  const parts: string[] = [head];
  let size = Buffer.byteLength(head);
  const homesBlock = "\n\n## Every home on RealHunt (title | country | price | size | score | page)\n\n" + rows.slice().sort((a, b) => (b.nota || 0) - (a.nota || 0)).map((r) =>
    `- ${String(r.title || "").replace(/\s+/g, " ").trim()} | ${r.country || ""} | €${Math.round(r.price_eur || 0).toLocaleString("en")} | ${r.sqm ? r.sqm + " m²" : "size n/a"} | ${r.nota ?? "n/a"} | ${SITE}/deal/${r.slug}`).join("\n") + "\n";
  const budget = MAX_BYTES - Buffer.byteLength(homesBlock);
  let pages = 0;
  const used: Record<number, number> = {};
  for (const e of entries.filter((x) => order(x) < 9 && !skip.test(x.url.replace(SITE, "") || "/")).sort((a, b) => order(a) - order(b) || a.url.localeCompare(b.url))) {
    const text = htmlToText(mainOf(fileOf(e.url)));
    if (text.length < 200) continue;
    const block = `\n\n---\nSource: ${e.url}${e.lastmod ? ` (updated ${e.lastmod})` : ""}\n\n${text}\n`;
    const n = Buffer.byteLength(block);
    const g = order(e);
    if (size + n > budget || (used[g] || 0) + n > CAPS[g]) continue;
    parts.push(block); size += n; used[g] = (used[g] || 0) + n; pages++;
  }
  parts.push(homesBlock);
  fs.writeFileSync(path.join(root, "llms-full.txt"), parts.join(""));
  return pages;
}
