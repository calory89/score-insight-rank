// The house rules over the texts kept in the repo (15-nov-2026): the app's code, the page templates, the
// translations and the data files that are published as they are. seo/tech/audit.ts checks the built pages; this
// catches the same things one step earlier, in the pull request.
//
// The repo was not clean when the check arrived (old screens of the app carry em dashes), so it works as a ratchet:
// seo/tech/source-baseline.json holds how many times each file broke each rule on 15-nov-2026, and the test
// (src/test/tech-rules.test.ts) fails when a file has MORE than its number, or a new file has any. Fixing a file
// lowers its number: run `npx tsx seo/tech/sourceScan.ts --write` and commit the smaller baseline.
import fs from "fs";
import path from "path";
import { URGENCY, RETURNS, INFLATED } from "./rules";

export type Counts = Record<string, number>;
const DIRS = ["src", "seo", "public/i18n"];
const FILES = ["index.html", "public/robots.txt", "public/manifest.webmanifest"];
const EXT = /\.(ts|tsx|json|html|css|md|txt)$/;
const SKIP = /(^|\/)(test|tests|fixtures|__tests__|node_modules)(\/|$)|\.test\.tsx?$|^seo\/tech\/(rules|sourceScan|report)\.ts$|^seo\/tech\/source-baseline\.json$|^seo\/listings\/known-urls\.json$|^seo\/redirects-seed\.json$/;
const all = (re: RegExp, s: string) => (s.match(new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g")) || []).length;
// a phone the way it would be published: a tel: link, a WhatsApp link with a number, an international number in a text
const PHONE_SRC = /tel:\+?\d|wa\.me\/\+?\d|api\.whatsapp\.com\/send\?phone=\+?\d|["'>\s]\+[1-9]\d{0,2}[ .-]\d{2,4}[ .-]\d{2,4}[ .-]\d{2,4}/;

export function countFile(text: string): Counts {
  const c: Counts = {};
  const put = (k: string, n: number) => { if (n) c[k] = n; };
  put("em_dash", all(/—/, text));
  put("fake_urgency", all(URGENCY, text));
  put("promised_return", [...text.matchAll(new RegExp(RETURNS.source, "gi"))].filter((m) => !/\b(no|not|never|nor|without|ni|sin|nunca)\b[^.!?]{0,60}$/i.test(text.slice(Math.max(0, m.index! - 80), m.index!))).length);
  put("inflated_figure", all(INFLATED, text));
  put("phone_number", all(PHONE_SRC, text));
  return c;
}

export function scan(cwd = process.cwd()): Record<string, Counts> {
  const out: Record<string, Counts> = {};
  const one = (rel: string) => { if (SKIP.test(rel) || !EXT.test(rel)) return; const c = countFile(fs.readFileSync(path.join(cwd, rel), "utf8")); if (Object.keys(c).length) out[rel] = c; };
  const walk = (rel: string) => { for (const e of fs.readdirSync(path.join(cwd, rel), { withFileTypes: true })) { const r = rel + "/" + e.name; if (SKIP.test(r)) continue; if (e.isDirectory()) walk(r); else one(r); } };
  for (const d of DIRS) if (fs.existsSync(path.join(cwd, d))) walk(d);
  for (const f of FILES) if (fs.existsSync(path.join(cwd, f))) one(f);
  return Object.fromEntries(Object.entries(out).sort((a, b) => a[0].localeCompare(b[0])));
}

/** What got worse against the baseline: "file: rule 3 (was 1)". */
export function worse(now: Record<string, Counts>, base: Record<string, Counts>): string[] {
  const out: string[] = [];
  for (const [f, c] of Object.entries(now)) for (const [k, n] of Object.entries(c)) { const was = base[f]?.[k] || 0; if (n > was) out.push(`${f}: ${k.replace(/_/g, " ")} ${n} (was ${was})`); }
  return out;
}

if (process.argv[1] && /sourceScan\.ts$/.test(process.argv[1])) {
  const now = scan();
  const file = path.resolve("seo/tech/source-baseline.json");
  if (process.argv.includes("--write")) { fs.writeFileSync(file, JSON.stringify(now, null, 1) + "\n"); console.log(`baseline written: ${Object.keys(now).length} files`); }
  else { const w = worse(now, JSON.parse(fs.readFileSync(file, "utf8"))); console.log(w.length ? w.join("\n") : "nothing got worse"); process.exit(w.length ? 1 : 0); }
}
