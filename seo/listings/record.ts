// Remembers every listing address ever published (seo/listings/known-urls.json), so an address that later has no
// page (its search dropped under the minimum of homes, or a home sold) can redirect to its parent instead of
// leaving a hole. Run by the daily data job right after the homes are refreshed:  npx tsx seo/listings/record.ts
import fs from "fs";
import path from "path";
import { buildFacets } from "./facets";
import { refreshFx } from "./fx";

const root = process.cwd();
// the budgets in pounds and dollars use the ECB rate of the day; the plan below is built with the refreshed rate
console.log(`[listings] exchange rates: ${await refreshFx(root)}`);
const file = path.join(root, "seo/listings/known-urls.json");
const rows = JSON.parse(fs.readFileSync(path.join(root, "public/data/rh-static.json"), "utf8")).rows || [];
const before: string[] = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")).urls || [] : [];
const now = buildFacets(rows).pages.filter((p) => !p.thin).map((p) => p.path);
const urls = [...new Set([...before, ...now])].sort();
if (urls.length !== before.length) fs.writeFileSync(file, JSON.stringify({ _note: "Every listing address ever published. Written by seo/listings/record.ts; read by seo/listings/build.ts to redirect the ones that no longer have a page.", urls }, null, 1) + "\n");
console.log(`[listings] ${now.length} pages today, ${urls.length} addresses remembered (${urls.length - before.length} new)`);
