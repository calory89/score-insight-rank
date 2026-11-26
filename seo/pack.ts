// Home pages in a few files (20 Nov 2026). Every home has two prerendered pages (/deal/<slug> and /es/deal/<slug>), so
// the site gained two files per home and the deploy keeps growing with the catalogue. This step, run after all other
// HTML steps, also writes those pages into SHARDS bundle files (dist/_pk/v1/<n>.json, each a { "/deal/slug": html }
// map). The realhunt.co worker (_worker.js, rh-pack-1) picks the bundle by the same hash and serves the page from it,
// falling back to the single file. The pages are byte for byte the ones of the single files.
//   PACK_MODE "copy": the single files stay too (parallel test).
//   PACK_MODE "move": the single files are left out of dist, so the deploy no longer grows with every new home.
//   20 Nov 2026: each page also gets its clean-text version (seo/dealMd.ts) under the key "<path>.md" in the bundle that
//   packShard("<path>.md") names; the worker serves those keys as text/markdown. No file is added to dist.
//   The size of every page is measured: a page over PAGE_WARN_KB is named in the build log and in dist/build.json.
import fs from "fs";
import path from "path";
import { dealMarkdown } from "./dealMd";
import { reportPack } from "./tech/packReport";
import { checkDeals, type PageState } from "./dealChecks";

export const PACK_MODE: "copy" | "move" = "move"; // 20 Nov 2026: all 1,366 pages compared equal live
export const PACK_DIR = "_pk/v1";
export const SHARDS = 256;
/** dist folders whose <slug>/index.html pages go into the bundles */
export const PACK_ROOTS = ["deal", "es/deal"];
/** A home page heavier than this is named in the build log (idea 77). The biggest were about 40 KB on 20 Nov 2026. */
export const PAGE_WARN_KB = 120;

/** FNV-1a 32 bit, the same function as packShard() in the worker */
export function packShard(key: string, shards = SHARDS): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h % shards;
}

export interface Packed { shards: Map<number, Record<string, string>>; files: string[]; sizes: [string, number][] }

/** Reads the pages under PACK_ROOTS of a dist folder. Keys are the public paths without the trailing slash. */
export function collect(root: string): Packed {
  const shards = new Map<number, Record<string, string>>(), files: string[] = [], sizes: [string, number][] = [];
  const put = (key: string, v: string) => { const n = packShard(key); if (!shards.has(n)) shards.set(n, {}); shards.get(n)![key] = v; };
  for (const r of PACK_ROOTS) {
    const dir = path.join(root, r);
    if (!fs.existsSync(dir)) continue;
    for (const slug of fs.readdirSync(dir).sort()) {
      const f = path.join(dir, slug, "index.html");
      if (!/^[\w.~-]+$/.test(slug) || !fs.existsSync(f)) continue;
      const key = "/" + r + "/" + slug, html = fs.readFileSync(f, "utf8");
      put(key, html);
      put(key + ".md", dealMarkdown(html, key));
      sizes.push([key, Buffer.byteLength(html)]);
      files.push(f);
    }
  }
  return { shards, files, sizes };
}

/** Whether a path of the site is a live, indexable page in this dist folder (for the link check of the home pages). */
export function pageState(root: string, p: string): PageState {
  const rel = decodeURIComponent(p).replace(/^\/+/, "");
  for (const f of [path.join(root, rel, "index.html"), path.join(root, rel)]) {
    if (!fs.existsSync(f) || !fs.statSync(f).isFile()) continue;
    if (!f.endsWith(".html")) return "ok";
    return /<meta name="robots" content="[^"]*noindex/.test(fs.readFileSync(f, "utf8")) ? "noindex" : "ok";
  }
  return "missing";
}

/** 26-nov-2026 (list of 1,000, ideas 14, 16, 33): every bundled home page checked (seo/dealChecks.ts). A structural
 * problem or EN/ES official links that differ stop the build; links to missing or noindex pages are named in the log
 * and in dist/build.json (home_checks). */
export function checkPack(root: string, shards: Map<number, Record<string, string>>) {
  const pages = new Map<string, string>();
  for (const m of shards.values()) for (const [k, v] of Object.entries(m)) pages.set(k, v);
  const memo = new Map<string, PageState>();
  const r = checkDeals(pages, (p) => { if (!memo.has(p)) memo.set(p, pageState(root, p)); return memo.get(p)!; });
  try { const bf = path.join(root, "build.json"); const b = JSON.parse(fs.readFileSync(bf, "utf8")); b.home_checks = { problems: r.problems.slice(0, 50), broken_links: r.broken.slice(0, 50), official_links_differ: r.official.slice(0, 50) }; fs.writeFileSync(bf, JSON.stringify(b) + "\n"); } catch { /* no build.json */ }
  return r;
}

export function writePack(root: string, mode = PACK_MODE): { pages: number; shards: number; maxKb: number; over: string[]; checks: ReturnType<typeof checkPack> } {
  const { shards, files, sizes } = collect(root);
  const checks = checkPack(root, shards);
  const out = path.join(root, PACK_DIR);
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  for (const [n, map] of shards) fs.writeFileSync(path.join(out, n + ".json"), JSON.stringify(map));
  if (mode === "move") for (const f of files) { fs.rmSync(f); try { fs.rmdirSync(path.dirname(f)); } catch { /* other files left */ } }
  const over = sizes.filter(([, b]) => b > PAGE_WARN_KB * 1024).map(([k, b]) => `${k} (${Math.round(b / 1024)} KB)`);
  const maxKb = Math.round(Math.max(0, ...sizes.map(([, b]) => b)) / 1024);
  try { const bf = path.join(root, "build.json"); const b = JSON.parse(fs.readFileSync(bf, "utf8")); b.home_pages = { pages: files.length, max_kb: maxKb, over_kb: PAGE_WARN_KB, over: over.slice(0, 50) }; fs.writeFileSync(bf, JSON.stringify(b) + "\n"); } catch { /* no build.json */ }
  return { pages: files.length, shards: shards.size, maxKb, over, checks };
}

/** Vite plugin, after every step that writes or reads the home pages and before the file budget. */
export function packPages() {
  let outDir = "dist";
  return {
    name: "rh-pack-pages",
    apply: "build" as const,
    configResolved(c: { build: { outDir: string } }) { outDir = c.build.outDir; },
    closeBundle() {
      const root = path.resolve(process.cwd(), outDir);
      if (!fs.existsSync(path.join(root, "index.html"))) return;
      const r = writePack(root);
      console.log(`[rh-pack-pages] ${r.pages} home pages (and their .md) in ${r.shards} bundles (${PACK_MODE}); largest page ${r.maxKb} KB`);
      if (r.over.length) console.warn(`[rh-pack-pages] ${r.over.length} home page(s) over ${PAGE_WARN_KB} KB: ${r.over.slice(0, 10).join(", ")}`);
      const c = r.checks;
      console.log(`[rh-pack-pages] home page checks: ${c.problems.length} problems, ${c.broken.length} links to a missing or noindex page, ${c.official.length} with EN/ES official links that differ`);
      if (c.broken.length) console.warn(`[rh-pack-pages] links to fix: ${c.broken.slice(0, 15).join(", ")}`);
      if (c.problems.length || c.official.length) throw new Error(`[rh-pack-pages] home pages failed their checks: ${[...c.problems, ...c.official.map((k) => k + ": official links differ between EN and ES")].slice(0, 15).join("; ")}`);
      try { const c = reportPack(root); console.log(`[rh-pack-pages] report: ${c.in_bundles.en + c.in_bundles.es} in bundles, ${c.single_files.en + c.single_files.es} single files, ${c.in_sitemaps_not_served.length} in the sitemaps without a page`); } catch (e) { console.warn("[rh-pack-pages] report skipped:", (e as Error).message); }
    },
  };
}
