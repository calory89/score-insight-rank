import { readFileSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
const html = readFileSync('dist/index.html', 'utf8');
const script = html.match(/<script[^>]+src="([^"]+)"/);
if (!script) throw new Error('Built HTML is missing the entry bundle');
const bytes = statSync('dist' + script[1]).size;
if (bytes > 250000) throw new Error(`Entry JavaScript is ${bytes} bytes; budget is 250000.`);
console.log(`Entry bundle: ${bytes} bytes (budget 250000).`);

// Tanda 16, idea 800 (26-nov-2026): no single script of the public route (home page, lists, home pages) over
// chunk_max_kb gzip (seo/tech/perf-budget.json, 120 KB). These are the files vite.config.ts preloadPublicRoute starts
// with the HTML; one that grows past the limit holds up the first paint of every home page on a phone.
const budget = JSON.parse(readFileSync('seo/tech/perf-budget.json', 'utf8'));
const max = budget.chunk_max_kb || 120;
const routes = /r=(\{"[\s\S]*?\}),k=/.exec(html);
if (!routes) throw new Error('Built HTML is missing the route preload list (vite.config.ts preloadPublicRoute)');
const files = JSON.parse(routes[1]).Community || [];
if (!files.length) throw new Error('No preloaded scripts for the public route');
const sizes = files.map((f) => [f, +(gzipSync(readFileSync('dist' + f), { level: 9 }).length / 1024).toFixed(1)]);
const over = sizes.filter(([, kb]) => kb > max);
console.log(`Public route: ${sizes.length} preloaded scripts, ${sizes.reduce((a, [, kb]) => a + kb, 0).toFixed(1)} KB gzip; biggest ${sizes.sort((a, b) => b[1] - a[1])[0].join(' ')} KB (limit ${max} KB each).`);
if (over.length) throw new Error(`Scripts over ${max} KB gzip on the public route: ${over.map(([f, kb]) => `${f} ${kb} KB`).join(', ')}`);
