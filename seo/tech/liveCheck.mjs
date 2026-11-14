#!/usr/bin/env node
// What a search engine gets from the LIVE site (15-nov-2026). Run after a publication; never blocks one.
//   node seo/tech/liveCheck.mjs [https://realhunt.co] [--strict]
//
// The build checks the files; this checks the server in front of them, which is another repository:
//   1. 30 old addresses at random from /redirects.json answer 301 straight to their page, or 410 (idea 103).
//   2. 50 pages at random from the sitemaps, asked for as Google's phone crawler and read WITHOUT running scripts:
//      200, a title, one h1, text, a canonical that is the page itself, no "noindex" (idea 110).
//   3. Googlebot, Bingbot and YandexBot are not shown a challenge or a block (idea 115).
//   4. HTML, data, styles and scripts travel compressed (idea 154); files with a hash in their name can be cached
//      for a year (idea 153); an unchanged file answers 304 to a conditional request (idea 113).
//   5. The sitemap, llms.txt and the feeds are the ones of the current build (idea 142).
// Exit code: 0, unless --strict is given and something failed. Results also go to the GitHub step summary.
import fs from "node:fs";

const SITE = (process.argv.find((a) => /^https?:\/\//.test(a)) || "https://realhunt.co").replace(/\/+$/, "");
const STRICT = process.argv.includes("--strict");
const BOTS = {
  googlebot: "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  bingbot: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm) Chrome/116.0.1938.76 Safari/537.36",
  yandexbot: "Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)",
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sample = (list, n) => { const a = list.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n); };

async function get(path, { ua = BOTS.googlebot, headers = {}, redirect = "manual" } = {}) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(SITE + path, { redirect, headers: { "user-agent": ua, "accept-encoding": "br, gzip", accept: "text/html,*/*", ...headers }, signal: AbortSignal.timeout(30000) });
      if ((r.status === 429 || r.status >= 500) && i < 2) { await sleep(4000 * (i + 1)); continue; }
      return { status: r.status, headers: r.headers, text: r.status === 304 ? "" : await r.text() };
    } catch (e) { if (i === 2) return { status: 0, headers: new Headers(), text: "", error: String(e) }; await sleep(2000); }
  }
}
const pathOf = (u) => { try { const x = new URL(u, SITE); return x.pathname.replace(/\/+$/, "") || "/"; } catch { return u; } };
const visible = (h) => h.replace(/<(script|style|noscript)\b[\s\S]*?<\/\1>/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

/** What is wrong with a page as a crawler that runs no scripts reads it. Exported for the tests. */
export function pageProblems(path, status, html) {
  const out = [];
  if (status !== 200) return [`status ${status}`];
  if (/<title>\s*(Just a moment|Attention Required)/i.test(html) || /cf-challenge|cf_chl_opt/.test(html)) return ["a challenge page instead of the page"];
  const root = /<div id="root">([\s\S]*)<\/div>\s*<script/.exec(html)?.[1] ?? html;
  if (!/<title>[^<]{5,}<\/title>/.test(html)) out.push("no title");
  const h1 = (root.match(/<h1\b/g) || []).length;
  if (h1 !== 1) out.push(`${h1} h1`);
  const words = visible(root).split(" ").filter(Boolean).length;
  if (words < 40) out.push(`only ${words} words without scripts`);
  if (/<meta name="robots" content="[^"]*noindex/.test(html)) out.push("noindex on a page of the sitemap");
  const canon = /<link rel="canonical" href="([^"]*)"/.exec(html)?.[1];
  if (!canon) out.push("no canonical"); else if (pathOf(canon) !== path) out.push(`canonical is ${canon}`);
  return out;
}

/** What is wrong with the answer for an old address. `to` is the page it must reach, or "410". */
export function redirectProblems(from, to, status, location) {
  if (to === "410") return status === 410 ? [] : [`${from}: expected 410, got ${status}`];
  if (status !== 301 && status !== 308) return [`${from}: expected 301, got ${status}`];
  return pathOf(location || "") === to ? [] : [`${from}: goes to ${location}, not ${to}`];
}

async function main() {
  const fails = [], notes = [];
  const fail = (s) => { fails.push(s); };

  // 1. redirects
  const red = await get("/redirects.json");
  let redirects = {};
  try { redirects = JSON.parse(red.text); } catch { fail("redirects.json is not there or is not JSON"); }
  const some = sample(Object.entries(redirects), 30);
  let okRed = 0;
  for (const [from, to] of some) {
    const r = await get(from);
    const p = redirectProblems(from, to, r.status, r.headers.get("location"));
    if (!p.length && to !== "410") { const t = await get(to); if (t.status !== 200) p.push(`${from} -> ${to}: the page answers ${t.status} (a second hop or an error)`); }
    if (p.length) p.forEach(fail); else okRed++;
    await sleep(150);
  }
  notes.push(`old addresses: ${okRed} of ${some.length} arrive in one hop (${Object.keys(redirects).length} in redirects.json)`);

  // 2. pages, as Google's phone crawler, without scripts
  const idx = await get("/sitemap.xml");
  const maps = [...idx.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => pathOf(m[1]));
  const urls = [];
  for (const m of maps) { const x = await get(m); for (const u of x.text.matchAll(/<url><loc>([^<]+)<\/loc>/g)) urls.push(pathOf(u[1].replace(/&amp;/g, "&"))); await sleep(100); }
  if (urls.length < 1000) fail(`the sitemaps list ${urls.length} pages`);
  const pages = sample(urls, 50);
  let okPages = 0, noEtag = 0, not304 = 0, notZip = 0;
  for (const p of pages) {
    const r = await get(p);
    const probs = pageProblems(p, r.status, r.text);
    if (probs.length) fail(`${p}: ${probs.join(", ")}`); else okPages++;
    if (!/^(br|gzip|zstd)$/.test(r.headers.get("content-encoding") || "")) notZip++;
    const etag = r.headers.get("etag"), lm = r.headers.get("last-modified");
    if (!etag && !lm) noEtag++;
    else { const c = await get(p, { headers: etag ? { "if-none-match": etag } : { "if-modified-since": lm } }); if (c.status !== 304) not304++; }
    await sleep(200);
  }
  notes.push(`pages read without scripts as Googlebot: ${okPages} of ${pages.length} fine (${urls.length} in the sitemaps)`);
  if (notZip) fail(`${notZip} of ${pages.length} pages were sent without compression`);
  notes.push(noEtag ? `304 "not changed": ${noEtag} of ${pages.length} pages carry no ETag or Last-Modified, so a crawler downloads them again every time (needs the hosting worker)` : `304 "not changed": ${pages.length - not304} of ${pages.length} pages answer it`);

  // 3. the three crawlers are let in
  for (const [name, ua] of Object.entries(BOTS)) for (const p of ["/", "/homes/spain", pages[0] || "/guide"]) {
    const r = await get(p, { ua });
    if (r.status !== 200 || r.headers.get("cf-mitigated") || /Just a moment|Attention Required/i.test(r.text.slice(0, 2000))) fail(`${name} gets ${r.status}${r.headers.get("cf-mitigated") ? " (challenge)" : ""} on ${p}`);
    await sleep(200);
  }

  // 4. compression and cache of the files a page needs
  const home = await get("/");
  const assets = [...new Set([...home.text.matchAll(/(?:src|href)="(\/assets\/[^"]+\.(?:js|css))"/g)].map((m) => m[1]))].slice(0, 4);
  for (const a of [...assets, "/data/rh-static.json"]) {
    const r = await get(a);
    if (r.status !== 200) { fail(`${a}: status ${r.status}`); continue; }
    if (!/^(br|gzip|zstd)$/.test(r.headers.get("content-encoding") || "")) fail(`${a} is sent without compression`);
    if (a.startsWith("/assets/") && !/max-age=31536000/.test(r.headers.get("cache-control") || "")) fail(`${a}: cache-control is "${r.headers.get("cache-control")}", not a year`);
  }
  const photo = /https:\/\/realhunt-media\.pages\.dev\/[^"' )]+\.webp/.exec(home.text)?.[0];
  if (photo) { try { const r = await fetch(photo, { method: "HEAD" }); const cc = r.headers.get("cache-control") || ""; const age = Number(/max-age=(\d+)/.exec(cc)?.[1] || 0); notes.push(`photos (realhunt-media): cache-control "${cc}"${age < 86400 ? ": every visit asks the server again for every photo; a day or more would be right (photo names never change content)" : ""}`); } catch { /* host not reachable from here */ } }

  // 5. the files that say what is new are the ones of this build
  let built = "";
  try { built = JSON.parse((await get("/build.json")).text).built_at || ""; } catch { /* no build.json */ }
  const state = await get("/seo-state.json");
  try { const s = JSON.parse(state.text); if (built && s.built && s.built < built.slice(0, 10)) fail(`seo-state.json is from ${s.built}, the build from ${built.slice(0, 10)}: a cached copy is being served`); } catch { fail("seo-state.json is not there"); }
  for (const f of ["/sitemap.xml", "/llms.txt", "/feed.xml", "/robots.txt"]) { const r = await get(f); if (r.status !== 200) fail(`${f}: status ${r.status}`); else if (Number(r.headers.get("age") || 0) > 3600) notes.push(`${f} came from a cache ${r.headers.get("age")} s old`); }

  const lines = [`Live check of ${SITE}: ${fails.length ? fails.length + " problem(s)" : "all fine"}`, ...notes.map((n) => "- " + n), ...fails.map((f) => "- PROBLEM: " + f)];
  console.log(lines.join("\n"));
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join("\n") + "\n");
  process.exit(STRICT && fails.length ? 1 : 0);
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop())) main();
