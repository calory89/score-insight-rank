// Last step of the build (15-nov-2026): what has to run on the finished dist/, after the data file was split.
//  - em dashes leave the published data (the app draws the homes from dist/data/rh-static.json; the pages were
//    cleaned by seo/polish.ts). The committed public/data file is not touched.
//  - the speed budget (seo/tech/perfBudget.ts), added to dist/seo-audit.json under tech.perf. Over budget stops the
//    build; RH_SEO_SOFT=1 only reports, like the other checks.
//  - homes that look published twice (seo/tech/dupes.ts, idea 73 of list 2): listed; an exact duplicate advert URL stops
//    the build.
import fs from "fs";
import path from "path";
import { noEmDash } from "./audit";
import { perfBudget } from "./perfBudget";
import { findDupes } from "./dupes";

export function techChecks() {
  let outDir = "dist";
  return {
    name: "rh-tech-checks",
    apply: "build" as const,
    configResolved(c: { build: { outDir: string } }) { outDir = c.build.outDir; },
    closeBundle() {
      const root = path.resolve(process.cwd(), outDir);
      if (!fs.existsSync(path.join(root, "index.html"))) return;
      let cleaned = 0;
      for (const f of ["data/rh-static.json", "data/rh-static-es.json"]) {
        const file = path.join(root, f);
        if (!fs.existsSync(file)) continue;
        const raw = fs.readFileSync(file, "utf8");
        if (raw.includes("—")) { fs.writeFileSync(file, noEmDash(raw)); cleaned++; }
      }
      const perf = perfBudget(root);
      let dupes: ReturnType<typeof findDupes> = { groups: [], failures: [] };
      // the committed snapshot: the full rows (the copy in dist/ may be split or trimmed)
      try { dupes = findDupes(JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "public/data/rh-static.json"), "utf8")).rows || []); } catch { /* no snapshot in this build */ }
      if (dupes.groups.length) console.log(`[rh-tech-checks] homes that may be the same home twice:\n` + dupes.groups.map((g) => `  - ${g.why}: ${g.slugs.join(", ")}`).join("\n"));
      const auditFile = path.join(root, "seo-audit.json");
      if (fs.existsSync(auditFile)) {
        try { const a = JSON.parse(fs.readFileSync(auditFile, "utf8")); (a.tech ||= {}).perf = { goal: perf.goal, pages: perf.pages, sizes: perf.sizes }; a.tech.dupes = dupes.groups; for (const f of dupes.failures) (a.failures ||= []).push("duplicate home: " + f); for (const f of perf.failures) (a.failures ||= []).push("speed budget: " + f); fs.writeFileSync(auditFile, JSON.stringify(a, null, 1) + "\n"); } catch { /* the audit keeps what it had */ }
      }
      const line = Object.entries(perf.pages).map(([k, p]) => `${k} ${p.html_kb}+${p.blocking_css_kb}+${p.route_js_kb} KB, ${p.requests_in_html} files`).join("; ");
      console.log(`[rh-tech-checks] speed budget (HTML + blocking CSS + scripts, gzip): ${line}${cleaned ? `; em dashes removed from ${cleaned} data file(s)` : ""}`);
      const big = Object.entries(perf.sizes).filter(([, r]) => r.over).map(([f, r]) => `${f} ${r.over} of ${r.pages} over ${r.limit_kb} KB (biggest ${r.biggest[0]?.path} ${r.biggest[0]?.kb} KB)`);
      if (big.length) console.log(`[rh-tech-checks] HTML size warning (uncompressed, Tanda 16 idea 767): ${big.join("; ")}`);
      if (dupes.failures.length) {
        const msg = `[rh-tech-checks] a home is published twice:\n` + dupes.failures.map((f) => "  - " + f).join("\n");
        if (process.env.RH_SEO_SOFT === "1") console.warn(msg); else throw new Error(msg);
      }
      if (perf.failures.length) {
        const msg = `[rh-tech-checks] over the speed budget (seo/tech/perf-budget.json):\n` + perf.failures.map((f) => "  - " + f).join("\n");
        if (process.env.RH_SEO_SOFT === "1") console.warn(msg); else throw new Error(msg);
      }
    },
  };
}
