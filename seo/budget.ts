// Build-time guard (10-nov-2026): realhunt.co is a Cloudflare Pages project and Pages has a hard limit of files per
// deployment. The publish job (.github/workflows/rh-auto-publish.yml) copies everything in dist/ except images and
// videos (photos live only in the publish repo, about 7,000 of them) next to the ~9,900 files already there. The
// Spanish pages added about 1,300 HTML files in one day, so the build now stops, loudly, before the total can get
// near the limit instead of failing later in the deploy.
import fs from "fs";
import path from "path";

export const MAX_PUBLISHED_FILES = 9000;
const NOT_PUBLISHED = /\.(webp|jpe?g|png|gif|mp4)$/i; // same list as the publish job

/** Files of a build that the publish job copies to the site (everything but images and videos). */
export const publishedFiles = (files: string[]) => files.filter((f) => !NOT_PUBLISHED.test(f));

export function checkBudget(files: string[], max = MAX_PUBLISHED_FILES): number {
  const n = publishedFiles(files).length;
  if (n > max) throw new Error(`[rh-file-budget] dist has ${n} files to publish, over the limit of ${max}. Cloudflare Pages caps files per deployment: remove pages or raise MAX_PUBLISHED_FILES in seo/budget.ts only after checking the real number of files in the Pages project.`);
  return n;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}

/** Vite plugin, last in the list: fails the build when dist/ would publish more than MAX_PUBLISHED_FILES files. */
export function fileBudget() {
  let outDir = "dist";
  return {
    name: "rh-file-budget",
    apply: "build" as const,
    configResolved(c: { build: { outDir: string } }) { outDir = c.build.outDir; },
    closeBundle() {
      const root = path.resolve(process.cwd(), outDir);
      if (!fs.existsSync(root)) return;
      const n = checkBudget(walk(root));
      console.log(`[rh-file-budget] ${n} files to publish (limit ${MAX_PUBLISHED_FILES})`);
    },
  };
}
