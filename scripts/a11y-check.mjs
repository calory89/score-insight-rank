// Accessibility check of 20 key pages (26-nov-2026, list of 1,000, batch 17: 801, 821, 850).
// Runs axe-core (WCAG 2.1 A/AA + best practice) in Chromium on phone (390 px) and desktop, plus three checks
// axe does not make: text under 12 px on phones, tap targets under 24 px, and sideways scroll at 320 px
// (what a 640 px window shows at 200 % zoom). Fails (exit 1) on any "serious" or "critical" axe result.
//
//   node scripts/a11y-check.mjs https://realhunt.co            (live)
//   node seo/tech/serve.mjs dist 4210 & node scripts/a11y-check.mjs http://127.0.0.1:4210   (a local build)
//
// axe-core is not a dependency of the site: install it next to the script run (npm i --no-save axe-core) or
// point AXE_PATH at axe.min.js. The report goes to a11y-report.json (A11Y_OUT to change it); /seo-report can read it.
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const base = (process.argv[2] || "https://realhunt.co").replace(/\/$/, "");
const out = process.env.A11Y_OUT || "a11y-report.json";
// Playwright: the repo's own copy, a global one (NODE_PATH) or playwright-core, like seo/tech/browserCheck.mjs
function loadPlaywright() {
  for (const n of ["playwright", "playwright-core"]) { try { return require(n); } catch { /* next */ } }
  for (const dir of (process.env.NODE_PATH || "").split(":").filter(Boolean)) for (const n of ["playwright", "playwright-core"]) { try { return require(`${dir}/${n}`); } catch { /* next */ } }
  return null;
}
const pw = loadPlaywright();
if (!pw) { console.error("Playwright not found: npm i --no-save playwright-core"); process.exit(2); }
const { chromium, devices } = pw;
let axePath = process.env.AXE_PATH;
if (!axePath) { try { axePath = require.resolve("axe-core/axe.min.js"); } catch { console.error("axe-core not found: npm i --no-save axe-core, or set AXE_PATH"); process.exit(2); } }

export const PAGES = ["/", "/es", "/homes/spain", "/es/homes/spain", "/deal/es-alpujarra-de-la-sierra-38k-35809", "/es/deal/es-alpujarra-de-la-sierra-38k-35809",
  "/guide/italy", "/es/guide/italy", "/tools/portugal-imt", "/es/tools/portugal-imt", "/research", "/es/research", "/map", "/blog", "/es/blog",
  "/costs/spain", "/method", "/new", "/homes", "/top"];
const BLOCKING = new Set(["serious", "critical"]);

async function scan(ctx, path, mobile) {
  const page = await ctx.newPage(); const errors = [];
  page.on("pageerror", e => errors.push(String(e).slice(0, 200)));
  const r = await page.goto(base + path + (base.includes("realhunt.co") ? `${path.includes("?") ? "&" : "?"}a11y=${Date.now() % 1e6}` : ""), { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1000);
  await page.addScriptTag({ path: axePath });
  const axe = await page.evaluate(async () => {
    const res = await window.axe.run(document, { resultTypes: ["violations"], runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] } });
    return res.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help, targets: v.nodes.slice(0, 5).map(n => n.target.join(" ")) }));
  });
  const extra = await page.evaluate((mobile) => {
    const shown = e => { const s = getComputedStyle(e), b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && s.visibility !== "hidden" && s.display !== "none"; };
    let small = 0, tiny = 0; const smallEx = [], tinyEx = [];
    if (mobile) document.querySelectorAll("body *").forEach(e => {
      if (![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) || !shown(e) || e.closest(".leaflet-container")) return;
      if (parseFloat(getComputedStyle(e).fontSize) < 12) { small++; if (smallEx.length < 5) smallEx.push(e.tagName + " " + getComputedStyle(e).fontSize + " " + e.textContent.trim().slice(0, 30)); }
    });
    document.querySelectorAll("a[href], button, [role=button], input:not([type=hidden]), select, summary").forEach(e => {
      if (!shown(e) || e.closest(".leaflet-container") || (e.tagName === "A" && e.closest("p, li, td, dd") && !e.closest("nav"))) return;
      const b = e.getBoundingClientRect(); if (b.width < 2 && b.height < 2) return; // screen-reader-only (the skip link)
      if (b.width < 24 || b.height < 24) { tiny++; if (tinyEx.length < 5) tinyEx.push(e.tagName + " " + Math.round(b.width) + "x" + Math.round(b.height) + " " + (e.getAttribute("aria-label") || e.textContent || "").trim().slice(0, 30)); }
    });
    return { title: document.title, lang: document.documentElement.lang, h1: document.querySelectorAll("h1").length, mains: document.querySelectorAll('main, [role="main"]').length, small, smallEx, tiny, tinyEx };
  }, mobile);
  await page.setViewportSize({ width: 320, height: 640 }); await page.waitForTimeout(300);
  const sideways = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  await page.close();
  return { status: r?.status(), errors, axe, sideways, ...extra };
}

const browser = await chromium.launch();
const report = { base, at: new Date().toISOString(), pages: {} };
let blocking = 0;
for (const [mode, opts] of [["phone", { ...devices["iPhone 13"], deviceScaleFactor: 1 }], ["desktop", { viewport: { width: 1366, height: 900 } }]]) {
  const ctx = await browser.newContext(opts);
  await ctx.addInitScript(() => { try { localStorage.setItem("rh_consent", "essential"); } catch { /* private mode */ } });
  for (const p of PAGES) {
    let r; try { r = await scan(ctx, p, mode === "phone"); } catch (e) { r = { fail: String(e).slice(0, 200) }; }
    report.pages[`${mode} ${p}`] = r;
    const bad = (r.axe || []).filter(v => BLOCKING.has(v.impact));
    blocking += bad.length + (r.fail ? 1 : 0);
    console.log(`${mode.padEnd(7)} ${p.padEnd(48)} ${r.status ?? "fail"} axe ${(r.axe || []).map(v => `${v.id}:${v.nodes}${BLOCKING.has(v.impact) ? "!" : ""}`).join(" ") || "0"} · <12px ${r.small ?? "-"} · <24px ${r.tiny ?? "-"} · 320px +${r.sideways ?? "-"} · main ${r.mains ?? "-"}`);
  }
  await ctx.close();
}
await browser.close();
report.blocking = blocking;
writeFileSync(out, JSON.stringify(report, null, 1));
console.log(`${blocking} serious or critical results · report ${out}`);
process.exit(blocking ? 1 : 0);
