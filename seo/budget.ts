// Build-time guard. History: on 10 Nov 2026 this was set to 9,000 because the account was then on the Cloudflare
// Pages free plan (20,000 files per deployment; the publish stopped at 19,355 on 24 Oct) and about 9,900 files were
// already there. The account is now on the paid plan: 100,000 files per deployment (Cloudflare docs, "Pages limits"),
// and the publish job (.github/workflows/rh-auto-publish.yml) stops at 95,000 files on the whole deploy branch, which
// held about 36,400 on 20 Nov 2026. Home pages are no longer one file each (seo/pack.ts). 40,000 non-image files
// from this build still leaves the branch far below 95,000. Check the real numbers before changing it again.
import fs from "fs";
import path from "path";

export const MAX_PUBLISHED_FILES = 40000;
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
