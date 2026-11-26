// Phone width check of home pages (26-nov-2026, list of 1,000 idea 1): no page may be wider than the screen and the
// action bar's listing button must be on screen. Usage: NODE_PATH=$(npm root -g) node scripts/check-mobile-fit.cjs <base url> <slug>...
// Checks /deal/<slug> and /es/deal/<slug> at 320, 390 (iPhone 13) and 1366 px; exits 1 on a failure.
const { chromium, devices } = require('playwright');
(async () => {
  const [base, ...slugs] = process.argv.slice(2);
  const b = await chromium.launch(); const bad = [];
  for (const slug of slugs) for (const p of ['/deal/', '/es/deal/']) for (const w of [320, 390, 1366]) {
    const ctx = w === 1366 ? await b.newContext({ viewport: { width: 1366, height: 900 } }) : await b.newContext({ ...devices['iPhone 13'], viewport: { width: w, height: 844 } });
    const pg = await ctx.newPage();
    await pg.goto(base + p + slug, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
    await pg.waitForTimeout(800);
    const r = await pg.evaluate(() => { const bt = document.querySelector('.hv-detailbar .hunt-primary'); return { sw: document.documentElement.scrollWidth, iw: innerWidth, btn: bt ? Math.round(bt.getBoundingClientRect().right) : null, h1: !!document.querySelector('h1'), title: document.title }; });
    const ok = r.sw === w && r.iw === w && (r.btn == null || r.btn <= w);
    console.log(ok ? 'OK ' : 'BAD', w, p + slug, JSON.stringify(r));
    if (!ok) bad.push(p + slug + '@' + w);
    await ctx.close();
  }
  console.log("bad:", bad.length, bad.join(" ")); process.exitCode = bad.length ? 1 : 0;
  await b.close();
})();
