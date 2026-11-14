// Prints what the build found (dist/seo-audit.json) into the log and the GitHub step summary, so a reviewer sees
// the warnings too. The build itself already stopped on a failure; this never fails.
import fs from "node:fs";
let a;
try { a = JSON.parse(fs.readFileSync("dist/seo-audit.json", "utf8")); } catch { console.log("no dist/seo-audit.json (the build did not get that far)"); process.exit(0); }
const t = a.tech || {};
const out = ["### SEO and speed checks", "", `Pages: ${a.summary.pages}, indexable: ${a.summary.indexable}, failures: ${a.failures.length}`, ""];
for (const f of a.failures) out.push("- FAILED: " + f);
for (const [k, n] of Object.entries(t.summary || {})) if (t.lists && t.lists[k]) out.push(`- warning, ${k.replace(/_/g, " ")}: ${n}`);
for (const [k, p] of Object.entries(t.perf?.pages || {})) out.push(`- speed, ${k}: HTML ${p.html_kb} KB, blocking CSS ${p.blocking_css_kb} KB, scripts ${p.route_js_kb} KB, ${p.requests_in_html} files asked for by the HTML`);
console.log(out.join("\n"));
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, out.join("\n") + "\n");
