#!/usr/bin/env node
// Which homes still need a title in German, Russian, French, Dutch or Polish (15-nov-2026).
//
// A listing page in one of these languages is only published when every home on it has a title in that language
// (seo/listings/titles.<lang>.json; rule in seo/listings/packkit.ts). A new home, or a home whose English title was
// edited, takes its pages out of the language until somebody translates it. This script lists the work:
//   node scripts/missing_titles.mjs                 summary per language and country
//   node scripts/missing_titles.mjs --lang de       the homes to translate, one per line: slug <tab> country <tab> English title
//   node scripts/missing_titles.mjs --lang de --json   the same as { slug: { en, t: "" } }, ready to fill in and merge
//   node scripts/missing_titles.mjs --check         exit code 1 when a language that has titles is missing any (for a workflow)
// Translations are written by a person: place names, laws and procedures stay in their own language.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LANGS = ["de", "ru", "fr", "nl", "pl"];
const arg = (k) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] || true : null; };
const norm = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const rows = (JSON.parse(fs.readFileSync(path.join(root, "public/data/rh-static.json"), "utf8")).rows || []).filter((r) => r?.slug && r.price_eur > 0);
const titles = (lang) => { try { return JSON.parse(fs.readFileSync(path.join(root, `seo/listings/titles.${lang}.json`), "utf8")); } catch { return {}; } };

export function missing(lang) {
  const t = titles(lang); const out = [];
  for (const r of rows) {
    const e = t[r.slug];
    if (!e || !e.t) out.push({ slug: r.slug, country: r.country, en: norm(r.title), why: "new" });
    else if (norm(e.en) !== norm(r.title)) out.push({ slug: r.slug, country: r.country, en: norm(r.title), why: "English title changed", was: e.t });
  }
  const live = new Set(rows.map((r) => r.slug));
  return { lang, total: rows.length, have: rows.length - out.length, missing: out, gone: Object.keys(t).filter((s) => !live.has(s)).length };
}

const only = arg("--lang");
const list = (typeof only === "string" ? [only] : LANGS).map(missing);
if (typeof only === "string") {
  const m = list[0].missing;
  if (arg("--json")) console.log(JSON.stringify(Object.fromEntries(m.map((x) => [x.slug, { en: x.en, t: "" }])), null, 1));
  else for (const x of m) console.log([x.slug, x.country, x.en, x.why === "new" ? "" : `(${x.why}; was: ${x.was})`].join("\t"));
} else {
  for (const r of list) {
    if (!r.have && !r.gone) { console.log(`${r.lang}: no titles yet`); continue; }
    const by = {}; for (const x of r.missing) by[x.country] = (by[x.country] || 0) + 1;
    console.log(`${r.lang}: ${r.have}/${r.total} homes have a title; missing ${r.missing.length}${r.missing.length ? " (" + Object.entries(by).sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c} ${n}`).join(", ") + ")" : ""}; ${r.gone} titles of homes that are gone`);
  }
}
if (arg("--check")) {
  // only the countries a language already covers count: Russian has Bulgaria, Greece and Cyprus, not Spain
  const bad = list.filter((r) => { const t = titles(r.lang); const cc = new Set(rows.filter((x) => t[x.slug]).map((x) => x.country)); return r.missing.some((x) => cc.has(x.country)); });
  if (bad.length) { console.error(`missing titles in countries already covered: ${bad.map((r) => r.lang).join(", ")}`); process.exit(1); }
}
