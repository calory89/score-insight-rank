// Home pages in a few files (20 Nov 2026). Every home has two prerendered pages (/deal/<slug> and /es/deal/<slug>), so
// the site gained two files per home and the deploy keeps growing with the catalogue. This step, run after all other
// HTML steps, also writes those pages into SHARDS bundle files (dist/_pk/v1/<n>.json, each a { "/deal/slug": html }
// map). The realhunt.co worker (_worker.js, rh-pack-1) picks the bundle by the same hash and serves the page from it,
// falling back to the single file. The pages are byte for byte the ones of the single files.
//   PACK_MODE "copy": the single files stay too (parallel test).
//   PACK_MODE "move": the single files are left out of dist, so the deploy no longer grows with every new home.
import fs from "fs";
import path from "path";

export const PACK_MODE: "copy" | "move" = "move"; // 20 Nov 2026: all 1,366 pages compared equal live
export const PACK_DIR = "_pk/v1";
export const SHARDS = 256;
/** dist folders whose <slug>/index.html pages go into the bundles */
export const PACK_ROOTS = ["deal", "es/deal"];

/** FNV-1a 32 bit, the same function as packShard() in the worker */
export function packShard(key: string, shards = SHARDS): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h % shards;
}

export interface Packed { shards: Map<number, Record<string, string>>; files: string[] }

/** Reads the pages under PACK_ROOTS of a dist folder. Keys are the public paths without the trailing slash. */
export function collect(root: string): Packed {
  const shards = new Map<number, Record<string, string>>(), files: string[] = [];
  for (const r of PACK_ROOTS) {
    const dir = path.join(root, r);
    if (!fs.existsSync(dir)) continue;
    for (const slug of fs.readdirSync(dir).sort()) {
      const f = path.join(dir, slug, "index.html");
      if (!/^[\w.~-]+$/.test(slug) || !fs.existsSync(f)) continue;
      const key = "/" + r + "/" + slug, n = packShard(key);
      if (!shards.has(n)) shards.set(n, {});
      shards.get(n)![key] = fs.readFileSync(f, "utf8");
      files.push(f);
    }
  }
  return { shards, files };
}

export function writePack(root: string, mode = PACK_MODE): { pages: number; shards: number } {
  const { shards, files } = collect(root);
  const out = path.join(root, PACK_DIR);
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  for (const [n, map] of shards) fs.writeFileSync(path.join(out, n + ".json"), JSON.stringify(map));
  if (mode === "move") for (const f of files) { fs.rmSync(f); try { fs.rmdirSync(path.dirname(f)); } catch { /* other files left */ } }
  return { pages: files.length, shards: shards.size };
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
      console.log(`[rh-pack-pages] ${r.pages} home pages in ${r.shards} bundles (${PACK_MODE})`);
    },
  };
}
