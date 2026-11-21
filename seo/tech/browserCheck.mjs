#!/usr/bin/env node
// The live site in a real browser, after every publication (21-nov-2026, ideas 5, 65, 81 and 87 of the second list).
//   node seo/tech/browserCheck.mjs [https://realhunt.co] [--pages 30] [--report-only]
//
// The other checks read pages as text. This one opens them in headless Chromium, as a visitor's phone does:
//   1. 30 pages (the main page types plus pages at random from the sitemaps), one after the other in the SAME browser,
//      scrolled to the bottom so lazy photos load. A second visit makes the browser revalidate what it already has,
//      which is how the 404s of 21-nov-2026 were found (realhunt-media answered 404 to a conditional request for a
//      card thumbnail). Fails on: errors in the console that come from our own pages or hosts, script errors,
//      requests to our hosts that answer 404 or worse, and photos on the page that did not load (idea 5).
//      On home pages the main photo must have loaded (idea 87).
//   2. Five page types (home, a home page, a country, a price band, the map), each in a fresh browser: kilobytes
//      transferred and number of requests, against the "live" limits in seo/tech/perf-budget.json (idea 65).
//   3. 20 home pages at random: the page served from the bundles (/__pk/<path>, seo/pack.ts) answers 200 with the same
//      title as the public page, and the public page has a title and a canonical that is the page itself (idea 81).
// Needs Playwright (playwright-core is enough) and a Chromium or Chrome: RH_CHROME=<path> uses that browser.
// Exit code 1 when something failed, unless --report-only. Results also go to the GitHub step summary.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const SITE = (process.argv.find((a) => /^https?:\/\//.test(a)) || "https://realhunt.co").replace(/\/+$/, "");
const arg = (name, d) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : d; };
const N_PAGES = Number(arg("--pages", 30));
const REPORT_ONLY = process.argv.includes("--report-only");

// ---- pure helpers (tested in src/test/browser-check.test.ts) ----
export const OWN_HOSTS = ["realhunt.co", "www.realhunt.co", "go.realhunt.co", "realhunt-media.pages.dev", "realhunt-top.pages.dev"];
export const isOwn = (u) => { try { return OWN_HOSTS.includes(new URL(u).hostname); } catch { return false; } };
/** A console message that is ours: from a script or page on our hosts, or about a request to them. */
export function ownConsoleError(text, sourceUrl) {
  const t = String(text || "");
  const m = /https?:\/\/[^\s"')]+/.exec(t);
  if (m) return isOwn(m[0]);
  if (sourceUrl) return isOwn(sourceUrl);
  return true; // no place given: count it, it came from the page itself
}
/** The pages to open: the main page types first, then pages at random from the sitemaps, `n` in all, no repeats. */
export function choosePages(urls, n, rnd = Math.random) {
  const pick = (re) => urls.find((u) => re.test(u));
  const fixed = ["/", "/es", "/map", pick(/^\/deal\//), pick(/^\/es\/deal\//), "/homes/spain", pick(/^\/homes\/[\w-]+\/under-\d+$/), pick(/^\/guide\/[\w-]+$/), pick(/^\/es\/[\w-]+\/[\w-]+$/), pick(/^\/(de|fr|nl|pl|ru)\//)].filter(Boolean);
  const out = [...new Set(fixed)];
  const rest = urls.filter((u) => !out.includes(u));
  for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
  for (const u of rest) { if (out.length >= n) break; out.push(u); }
  return out.slice(0, n);
}
/** What is wrong with a home page served from the bundles, given the public page and the /__pk/ answer. */
export function packProblems(p, pub, pk) {
  const out = [];
  const title = (h) => /<title>([^<]*)<\/title>/.exec(h || "")?.[1]?.trim() || "";
  const canon = /<link rel="canonical" href="([^"]*)"/.exec(pub.text || "")?.[1] || "";
  if (pub.status !== 200) return [`${p}: status ${pub.status}`];
  if (pk.status !== 200) out.push(`${p}: not in the bundles (/__pk answers ${pk.status})`);
  if (title(pub.text).length < 5) out.push(`${p}: no title`);
  let cp = ""; try { cp = new URL(canon).pathname.replace(/\/+$/, "") || "/"; } catch { /* none */ }
  if (cp !== p) out.push(`${p}: canonical is "${canon}"`);
  if (pk.status === 200 && title(pk.text) !== title(pub.text)) out.push(`${p}: the bundle says "${title(pk.text)}", the page "${title(pub.text)}"`);
  return out;
}
/** Over-limit lines for one page type, given the measured numbers and the limits ({ kb, requests }). */
export function weightProblems(type, p, m, max) {
  const out = [];
  if (max?.kb && m.kb > max.kb) out.push(`${type} (${p}): ${m.kb} KB transferred, the limit is ${max.kb} KB`);
  if (max?.requests && m.requests > max.requests) out.push(`${type} (${p}): ${m.requests} requests, the limit is ${max.requests}`);
  return out;
}

// ---- the run ----
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function text(u, headers = {}) {
  for (let i = 0; i < 3; i++) {
    try { const r = await fetch(u, { headers: { "user-agent": "realhunt-browser-check/1.0", ...headers }, redirect: "manual", signal: AbortSignal.timeout(30000) }); if ((r.status === 429 || r.status >= 500) && i < 2) { await sleep(3000 * (i + 1)); continue; } return { status: r.status, text: await r.text() }; }
    catch (e) { if (i === 2) return { status: 0, text: "", error: String(e) }; await sleep(2000); }
  }
}
const pathOf = (u) => { try { return new URL(u, SITE).pathname.replace(/\/+$/, "") || "/"; } catch { return u; } };

function loadPlaywright() {
  const req = createRequire(import.meta.url);
  for (const name of ["playwright-core", "playwright"]) { try { return req(name); } catch { /* next */ } }
  for (const dir of (process.env.NODE_PATH || "").split(":").filter(Boolean)) for (const name of ["playwright-core", "playwright"]) { try { return req(path.join(dir, name)); } catch { /* next */ } }
  return null;
}

async function scrollDown(page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight && y < 30000; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 90)); }
    window.scrollTo(0, 0);
  }).catch(() => {});
}

async function main() {
  const pw = loadPlaywright();
  if (!pw) { console.log("browser check skipped: Playwright is not installed (npm i --no-save playwright-core)"); process.exit(REPORT_ONLY ? 0 : 2); }
  const { chromium, devices } = pw;
  const browser = await chromium.launch(process.env.RH_CHROME ? { executablePath: process.env.RH_CHROME } : {});
  const fails = [], notes = [];

  const idx = await text(SITE + "/sitemap.xml");
  const maps = [...idx.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const urls = [];
  for (const m of maps) { const x = await text(m); for (const u of x.text.matchAll(/<url><loc>([^<]+)<\/loc>/g)) urls.push(pathOf(u[1].replace(/&amp;/g, "&"))); }
  if (urls.length < 100) fails.push(`the sitemaps list ${urls.length} pages`);

  // 1. 30 pages in one browser
  const pages = choosePages(urls, N_PAGES);
  const ctx = await browser.newContext({ ...devices["iPhone 13"] });
  let clean = 0;
  for (const p of pages) {
    const page = await ctx.newPage();
    const bad = [];
    page.on("console", (m) => { if (m.type() === "error" && ownConsoleError(m.text(), m.location()?.url)) bad.push("console: " + m.text().slice(0, 160)); });
    page.on("pageerror", (e) => bad.push("script error: " + String(e.message || e).slice(0, 160)));
    page.on("response", (r) => { if (r.status() >= 400 && isOwn(r.url())) bad.push(`${r.status()} ${r.url()}`); });
    page.on("requestfailed", (r) => { const f = r.failure()?.errorText || ""; if (isOwn(r.url()) && !/ERR_ABORTED/.test(f)) bad.push(`failed (${f}) ${r.url()}`); });
    try { await page.goto(SITE + p, { waitUntil: "networkidle", timeout: 45000 }); }
    catch (e) { bad.push("did not finish loading: " + String(e.message).slice(0, 80)); }
    await scrollDown(page);
    await page.waitForTimeout(1200);
    const img = await page.evaluate(() => {
      const own = (s) => /realhunt(-media)?\.(co|pages\.dev)|^\//.test(s);
      const broken = [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.currentSrc && own(i.currentSrc)).map((i) => i.currentSrc);
      const hero = document.querySelector(".hv-gallery img, .rh-shell img");
      return { broken, hero: hero ? { ok: hero.complete && hero.naturalWidth > 0, src: hero.currentSrc || hero.getAttribute("src") } : null };
    }).catch(() => ({ broken: [], hero: null }));
    img.broken.forEach((s) => bad.push("photo did not load: " + s));
    if (/^\/(es\/)?deal\//.test(p) && img.hero && !img.hero.ok) bad.push("main photo did not load: " + img.hero.src);
    if (/^\/(es\/)?deal\//.test(p) && !img.hero) bad.push("no main photo on the home page");
    const uniq = [...new Set(bad)];
    if (uniq.length) fails.push(`${p}: ${uniq.length} problem(s): ${uniq.slice(0, 6).join(" | ")}${uniq.length > 6 ? " | ..." : ""}`); else clean++;
    await page.close();
  }
  await ctx.close();
  notes.push(`pages in a browser: ${clean} of ${pages.length} without own console errors, 404s or broken photos`);

  // 2. weight of the five page types
  let budget = {};
  try { budget = JSON.parse(fs.readFileSync(new URL("./perf-budget.json", import.meta.url), "utf8")).live || {}; } catch { /* no limits */ }
  const types = { home: "/", deal: pages.find((p) => /^\/deal\//.test(p)) || "/", country: "/homes/spain", band: pages.find((p) => /^\/homes\/[\w-]+\/under-\d+$/.test(p)) || "/homes/bulgaria/under-80000", map: "/map" };
  const weights = [];
  for (const [type, p] of Object.entries(types)) {
    const c = await browser.newContext({ ...devices["Pixel 7"], serviceWorkers: "block" });
    const page = await c.newPage();
    const cdp = await c.newCDPSession(page);
    await cdp.send("Network.enable");
    let bytes = 0, requests = 0;
    cdp.on("Network.loadingFinished", (e) => { bytes += e.encodedDataLength || 0; });
    cdp.on("Network.requestWillBeSent", () => { requests++; });
    try { await page.goto(SITE + p, { waitUntil: "networkidle", timeout: 60000 }); } catch { /* measured anyway */ }
    await page.waitForTimeout(1500);
    const m = { kb: Math.round(bytes / 1024), requests };
    weights.push(`${type} ${m.kb} KB / ${m.requests} req`);
    fails.push(...weightProblems(type, p, m, budget[type]));
    await c.close();
  }
  notes.push("weight on first visit (no cache, no service worker): " + weights.join(", "));

  // 3. home pages from the bundles
  const homes = urls.filter((u) => /^\/(es\/)?deal\/[\w.~-]+$/.test(u));
  const some = choosePages(homes, 20).filter((u) => homes.includes(u));
  let okPk = 0;
  for (const p of some) {
    const pub = await text(SITE + p), pk = await text(SITE + "/__pk" + p);
    const probs = packProblems(p, pub, pk);
    if (probs.length) fails.push(...probs); else okPk++;
    await sleep(150);
  }
  notes.push(`home pages from the bundles: ${okPk} of ${some.length} fine (${homes.length} in the sitemaps)`);

  await browser.close();
  const lines = [`Browser check of ${SITE}: ${fails.length ? fails.length + " problem(s)" : "all fine"}`, ...notes.map((n) => "- " + n), ...fails.map((f) => "- PROBLEM: " + f)];
  console.log(lines.join("\n"));
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join("\n") + "\n");
  process.exit(!REPORT_ONLY && fails.length ? 1 : 0);
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop())) main().catch((e) => { console.error(e); process.exit(REPORT_ONLY ? 0 : 1); });
