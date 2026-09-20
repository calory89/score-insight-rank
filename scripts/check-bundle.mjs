import { readFileSync, statSync } from 'node:fs';
const html = readFileSync('dist/index.html', 'utf8');
const script = html.match(/<script[^>]+src="([^"]+)"/);
if (!script) throw new Error('Built HTML is missing the entry bundle');
const bytes = statSync('dist' + script[1]).size;
if (bytes > 250000) throw new Error(`Entry JavaScript is ${bytes} bytes; budget is 250000.`);
console.log(`Entry bundle: ${bytes} bytes (budget 250000).`);
