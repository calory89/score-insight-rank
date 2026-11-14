// Speed budget, checked on every build without a browser (ideas 146, 165 and 166 of the organic-traffic list).
//
// A browser test (Lighthouse) needs a download the build machine does not have, so the build guards the things that
// decide the first seconds and that a commit can break without anybody noticing: the weight of the HTML, of the
// styles that block the first paint and of the scripts a page starts, how many files the HTML asks for at once, and
// that the photo that will be the largest element is asked for first. Limits: seo/tech/perf-budget.json.
// The real timings are taken with seo/tech/measure.cjs against seo/tech/serve.mjs.
import fs from "fs";
import path from "path";
import zlib from "zlib";

export type Budget = { goal: string; max: { html_kb: number; blocking_css_kb: number; entry_js_kb: number; route_js_kb: number; requests_in_html: number; high_priority_images: number } };
export type PagePerf = { path: string; html_kb: number; blocking_css_kb: number; entry_js_kb: number; route_js_kb: number; requests_in_html: number; high_priority_images: number; eager_images: number; lazy_images: number; problems: string[] };

const gz = (b: Buffer | string) => +(zlib.gzipSync(b, { level: 9 }).length / 1024).toFixed(1);

/** The numbers of one page. `read(file)` returns a file of the build ("/assets/x.js"), or null when it is not there. */
export function pagePerf(p: string, html: string, read: (file: string) => Buffer | null, max: Budget["max"]): PagePerf {
  const head = html.slice(0, html.indexOf("</head>"));
  const size = (f: string) => { const b = read(f); return b ? gz(b) : 0; };
  const css = [...head.matchAll(/<link rel="stylesheet"[^>]*href="(\/[^"]+)"/g)].map((m) => m[1]);
  const entry = /<script type="module"[^>]*src="(\/assets\/[^"]+)"/.exec(html)?.[1] || "";
  const staticPre = [...head.matchAll(/<link rel="modulepreload"[^>]*href="(\/[^"]+)"/g)].map((m) => m[1]);
  // the scripts the page starts by itself: seo of vite.config.ts preloadPublicRoute, same test as the inline script
  let route: string[] = [];
  const inline = /\(\(\)=>\{const p=location\.pathname[\s\S]*?r=(\{[\s\S]*?\}),k=/.exec(html);
  if (inline) {
    try {
      const r = JSON.parse(inline[1]) as Record<string, string[]>;
      const q = p.replace(/^\/es(?=\/|$)/, "") || "/";
      const k = q === "/" || /^\/(deal|map|top|live-search|homes|hunt|compare|score|blog|guide|costs|can-i-buy|buying-costs)(\/|$)/.test(q) ? "Community" : /^\/from\//.test(q) ? "Home" : /^\/find\//.test(q) ? "FindDetail" : /^\/weather\/?$/.test(q) ? "Weather" : "";
      route = [...(r[k] || []), ...(q === "/map" ? r.Map || [] : [])];
    } catch { /* the script changed shape: counted as no preloads */ }
  }
  const js = [...new Set([entry, ...staticPre, ...route].filter(Boolean))];
  const root = /<div id="root">([\s\S]*)<\/div>\s*<script/.exec(html)?.[1] ?? "";
  const imgs = [...root.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
  const lazy = imgs.filter((i) => /\sloading="lazy"/.test(i)).length;
  const high = imgs.filter((i) => /\sfetchpriority="high"/.test(i)).length;
  const preImg = [...head.matchAll(/<link rel="preload" as="image"/g)].length;
  const out: PagePerf = {
    path: p, html_kb: gz(html), blocking_css_kb: +css.reduce((a, f) => a + size(f), 0).toFixed(1), entry_js_kb: size(entry), route_js_kb: +js.reduce((a, f) => a + size(f), 0).toFixed(1),
    requests_in_html: css.length + js.length + (imgs.length - lazy) + [...head.matchAll(/<link rel="preload" as="(?:fetch|font)"/g)].length, high_priority_images: high, eager_images: imgs.length - lazy, lazy_images: lazy, problems: [],
  };
  for (const k of Object.keys(max) as (keyof Budget["max"])[]) if (out[k] > max[k]) out.problems.push(`${k.replace(/_/g, " ")}: ${out[k]} (limit ${max[k]})`);
  if (/^\/(es\/)?deal\//.test(p) && imgs.length && !(high >= 1 && preImg >= 1)) out.problems.push("the main photo is not asked for first (preload and fetchpriority)");
  if (imgs.some((i) => !/\s(width|height)="/.test(i) && !/\sdata-rh-sized\b/.test(i))) out.problems.push("a photo without a reserved size");
  return out;
}

/** The five page types of the budget, read from a build. */
export function perfBudget(root: string, cwd = process.cwd()): { goal: string; pages: Record<string, PagePerf>; failures: string[] } {
  const budget: Budget = JSON.parse(fs.readFileSync(path.resolve(cwd, "seo/tech/perf-budget.json"), "utf8"));
  const read = (f: string) => { const x = path.join(root, f.split("?")[0]); return fs.existsSync(x) ? fs.readFileSync(x) : null; };
  const firstDeal = fs.existsSync(path.join(root, "deal")) ? fs.readdirSync(path.join(root, "deal")).sort()[0] : "";
  const want: Record<string, string> = { home: "/", deal: firstDeal ? `/deal/${firstDeal}` : "", country: "/homes/spain", band: "/homes/bulgaria/under-80000", map: "/map" };
  const pages: Record<string, PagePerf> = {}; const failures: string[] = [];
  for (const [name, p] of Object.entries(want)) {
    const f = p && path.join(root, p === "/" ? "" : p.slice(1), "index.html");
    if (!f || !fs.existsSync(f)) continue; // a build without that page (tests, no data)
    pages[name] = pagePerf(p, fs.readFileSync(f, "utf8"), read, budget.max);
    for (const x of pages[name].problems) failures.push(`${p}: ${x}`);
  }
  return { goal: budget.goal, pages, failures };
}
