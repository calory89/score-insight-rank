// The pages of German, French, Dutch, Polish and Russian in bundles, like the home pages (26-nov-2026, round 3 of
// "RealHunt 100/100", idea 728 of the list of 1,000). About 2,900 pages were one file each, and realhunt.co's Pages
// project (realhunt-media) takes at most 20,000 files per deploy. This step runs after seo/pack.ts and writes every
// /<lang>/.../index.html into LANG_SHARDS bundle files dist/_pk/l1/<n>.json ({ "/de/homes/spain": html }), keyed by
// the decoded path without a trailing slash, with the same FNV-1a hash as the home pages (packShard).
//   "move" (since 26 Nov 2026): the single files are left out of dist. The realhunt.co worker (rh-pack-3) serves the
//     bundles; a page that is not in its bundle falls back to its own file. /__pk/de/... answers from the bundles only.
//   "copy": the single files stay as well (a parallel test; costs 512 files more in the deploy).
// The sitemaps, feed.xml and llms.txt of each language stay single files: only index.html pages are bundled.
import fs from "fs";
import path from "path";
import { packShard } from "../pack";

export const LANG_PACK_MODE: "copy" | "move" = "move";
export const LANG_PACK_DIR = "_pk/l1";
export const LANG_SHARDS = 512;
export const LANG_ROOTS = ["de", "fr", "nl", "pl", "ru"];

/** Every index.html under the language folders, as [public path, file]. "/de" for dist/de/index.html. */
export function langPages(root: string): [string, string][] {
  const out: [string, string][] = [];
  const walk = (dir: string, key: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const f = path.join(dir, e.name);
      if (e.isDirectory()) walk(f, key + "/" + e.name);
      else if (e.name === "index.html") out.push([key, f]);
    }
  };
  for (const l of LANG_ROOTS) { const d = path.join(root, l); if (fs.existsSync(d)) walk(d, "/" + l); }
  return out.sort((a, b) => a[0].localeCompare(b[0]));
}

export function writeLangPack(root: string, mode = LANG_PACK_MODE): { pages: number; shards: number; kb: number } {
  const pages = langPages(root);
  const shards = new Map<number, Record<string, string>>();
  for (const [k, f] of pages) { const n = packShard(k, LANG_SHARDS); if (!shards.has(n)) shards.set(n, {}); shards.get(n)![k] = fs.readFileSync(f, "utf8"); }
  const out = path.join(root, LANG_PACK_DIR);
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  let bytes = 0;
  for (const [n, m] of shards) { const s = JSON.stringify(m); bytes += Buffer.byteLength(s); fs.writeFileSync(path.join(out, n + ".json"), s); }
  if (mode === "move") for (const [, f] of pages) { fs.rmSync(f); try { fs.rmdirSync(path.dirname(f)); } catch { /* other files left */ } }
  try { const bf = path.join(root, "build.json"); const b = JSON.parse(fs.readFileSync(bf, "utf8")); b.lang_pages = { pages: pages.length, bundles: shards.size, mode }; fs.writeFileSync(bf, JSON.stringify(b) + "\n"); } catch { /* no build.json */ }
  return { pages: pages.length, shards: shards.size, kb: Math.round(bytes / 1024) };
}

/** Vite plugin, after rh-pack-pages (which checks links against the files) and before the file budget. */
export function langPack() {
  let outDir = "dist";
  return {
    name: "rh-lang-pack",
    apply: "build" as const,
    configResolved(c: { build: { outDir: string } }) { outDir = c.build.outDir; },
    closeBundle() {
      const root = path.resolve(process.cwd(), outDir);
      if (!fs.existsSync(path.join(root, "index.html"))) return;
      const r = writeLangPack(root);
      console.log(`[rh-lang-pack] ${r.pages} pages of de/fr/nl/pl/ru in ${r.shards} bundles of ${LANG_PACK_DIR} (${LANG_PACK_MODE}, ${r.kb} KB)`);
    },
  };
}
