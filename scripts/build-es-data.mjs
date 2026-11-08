#!/usr/bin/env node
// Builds public/i18n/es-data.json (8-nov-2026): the dictionary entries (English -> Spanish) of the site's own data texts,
// taken from each src/data/<name>.json and its Spanish twin src/data/<name>-es.json (same keys). Pages that print the
// English data directly (home page costs, guides, costs pages, the check layer) then show it in Spanish on the Spanish
// site, like every other string. src/lib/lang.ts loads it next to es-extra.json. Run after editing a *-es.json file:
//   node scripts/build-es-data.mjs        (src/test/es-data.test.ts fails while the file is out of date)
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const read = (f) => JSON.parse(fs.readFileSync(path.join(root, "src/data", f), "utf8"));

/** English/Spanish pairs of the string leaves found at the same path in both objects. */
export function pairs(en, es, out = {}) {
  if (typeof en === "string" && typeof es === "string") {
    const a = en.trim(), b = es.trim();
    if (a && b && a !== b && /[A-Za-z]{3}/.test(a)) out[a] = b;
    return out;
  }
  if (!en || !es || typeof en !== "object" || typeof es !== "object") return out;
  for (const k of Object.keys(en)) if (k !== "_meta" && k in es) pairs(en[k], es[k], out);
  return out;
}

export function build() {
  const out = {};
  for (const name of ["destinations", "buyrules", "canbuy"]) pairs(read(name + ".json"), read(name + "-es.json"), out);
  // guides: steps are [title, text] in English; the Spanish file has the titles in steps and the texts in step_texts
  const g = read("guides.json"), ge = read("guides-es.json");
  for (const [k, v] of Object.entries(g)) {
    const e = ge[k]; if (!e) continue;
    pairs({ name: v.name, yearly: v.yearly }, { name: e.name, yearly: e.yearly }, out);
    (v.steps || []).forEach(([h, t], i) => pairs({ h, t }, { h: e.steps?.[i], t: e.step_texts?.[i] }, out));
  }
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => (a < b ? -1 : 1)));
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const d = build();
  fs.writeFileSync(path.join(root, "public/i18n/es-data.json"), JSON.stringify(d));
  console.log("public/i18n/es-data.json:", Object.keys(d).length, "entries");
}
