// Real timings of a built site on a slow phone (the method behind seo/tech/perf-budget.json).
//   node seo/tech/serve.mjs dist 4210 &            the build, served like the live site serves it
//   node seo/tech/measure.cjs http://127.0.0.1:4210 [/,/deal/<slug>,/homes/spain,...]
// Needs Playwright with Chromium. It is not a dependency of the site: install it globally and point NODE_PATH at it.
// Profile: Pixel 7, 1.6 Mbit/s down, 750 kbit/s up, 150 ms latency, processor 4 times slower. The service worker is
// blocked: once it takes over, its requests are not slowed down and the numbers look better than a phone's.
// Prints per page: FCP, LCP and its element, CLS, kilobytes by kind and the number of requests.
let pw;
try { pw = require("playwright"); } catch { console.error("Playwright is not installed (npm i -g playwright, then NODE_PATH=$(npm root -g))"); process.exit(2); }
const { chromium, devices } = pw;
const base = process.argv[2] || "http://127.0.0.1:4210";
const paths = (process.argv[3] || "/,/homes/spain,/homes/bulgaria/under-80000,/map").split(",");
(async () => {
  const b = await chromium.launch();
  for (const p of paths) {
    const c = await b.newContext({ ...devices["Pixel 7"], serviceWorkers: "block" });
    const m = await c.newPage();
    const cdp = await c.newCDPSession(m);
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", { offline: false, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8, latency: 150 });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    const errs = [];
    m.on("pageerror", (e) => errs.push(e.message.slice(0, 80)));
    await m.addInitScript(() => {
      window.__lcp = 0; window.__lcpEl = ""; window.__cls = 0;
      new PerformanceObserver((l) => { for (const e of l.getEntries()) { window.__lcp = e.startTime; window.__lcpEl = e.element ? e.element.tagName + "." + (e.element.className || "") + " " + (e.url || "").slice(-50) : ""; } }).observe({ type: "largest-contentful-paint", buffered: true });
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: "layout-shift", buffered: true });
    });
    await m.goto(base + p, { waitUntil: "load", timeout: 90000 }).catch((e) => console.log("NAV", e.message.slice(0, 60)));
    await m.waitForTimeout(5000);
    const r = await m.evaluate(() => {
      const n = performance.getEntriesByType("navigation")[0], fcp = performance.getEntriesByName("first-contentful-paint")[0], res = performance.getEntriesByType("resource");
      const kb = (f) => Math.round(res.filter(f).reduce((a, e) => a + e.transferSize, 0) / 1024);
      return { fcp: Math.round(fcp ? fcp.startTime : 0), lcp: Math.round(window.__lcp), cls: +window.__cls.toFixed(3), load: Math.round(n.loadEventEnd), js_kb: kb((e) => /\.js(\?|$)/.test(e.name)), css_kb: kb((e) => e.name.includes(".css")), data_kb: kb((e) => /\.json/.test(e.name)), requests: res.length, other_sites: res.filter((e) => !e.name.startsWith(location.origin)).length, lcp_element: window.__lcpEl };
    });
    console.log(p, JSON.stringify(r), errs.length ? "ERRORS " + errs.join(" | ") : "");
    await c.close();
  }
  await b.close();
})();
