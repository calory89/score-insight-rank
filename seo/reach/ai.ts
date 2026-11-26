// Files for AI assistants and open data, part 2 (26-nov-2026, list of 1,000, batch 13: ideas 601 to 650).
// Everything here runs after seo/polish.ts (from reachPost in seo/reach/index.ts), when it is known which pages are
// indexable, and only reads what the build already wrote or the public data files. Nothing is invented: every figure
// comes from public/data/rh-static.json (the same rows as the pages) or from files of src/data.
//   llms.txt          one count of homes and countries (seo/listings/counts.ts), the real score range, the time of
//                     the build, sections by what the reader wants (homes, costs, rules, data), a check of every URL
//   /llms/<country>.txt  the country's pages and homes in one text file (seo/llmsFull.ts writes it)
//   /answers/<slug>.md, /es/answers/<slug>.md   the short answer of each guide by subject, with its official sources
//   /data/countries.json, costs.json, can-i-buy.json, glossary.json, homes.csv, README.md   open data, CC BY 4.0
//   /humans.txt, /.well-known/security.txt, /data/changed-today.txt
import fs from "fs";
import path from "path";
import zlib from "zlib";
import { LICENSE, PRESS_EMAIL, SITE } from "../assetsKit";
import { toCsv } from "../assetsStats";
import { siteCounts } from "../listings/counts";
import { GLOSSARIES, TOPICS, glossaryPath, topicPath } from "../knowledge/build";
import { SOURCES } from "../knowledge/sources";
import type { Row } from "./data";
import { makePdf, type Line } from "./pdf";

/** The one public contact address of the site (the same constant as the press kit). */
export const CONTACT = PRESS_EMAIL;
const ATTR = "RealHunt (realhunt.co)";
const write = (root: string, rel: string, text: string | Buffer) => { const f = path.join(root, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); };
const readJson = (f: string, d: any = null) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return d; } };
const clean = (s: unknown) => String(s ?? "").replace(/\s+/g, " ").trim();

/** Lowest and highest score of the homes, as the site shows them. */
export function scoreRange(rows: Row[]): [number, number] | null {
  const n = rows.map((r) => Number(r.nota)).filter((x) => Number.isFinite(x) && x > 0);
  return n.length ? [Math.min(...n), Math.max(...n)] : null;
}

/** The time of the build in UTC, to the minute: "2026-11-26 16:20 UTC". */
export const builtAt = (d = new Date()) => d.toISOString().slice(0, 16).replace("T", " ") + " UTC";

/** Idea 601 and 638: the head of the English llms.txt says the site's one count, the real score range and the time. */
export function fixLlmsHead(txt: string, rows: Row[], when: string): string {
  const c = siteCounts(rows as any[]), sr = scoreRange(rows);
  let out = txt.replace(/Today: \d+ homes in \d+ countries\. Updated [^\n]*?\.(?=\n)/, () => `Today: ${c.homes} homes in ${c.countries} countries (a country counts from 3 homes). Updated ${when}.`);
  if (sr) out = out.replace(/graded from \d+ to \d+/g, `graded from ${sr[0]} to ${sr[1]}`);
  return out;
}

const titleOf = (root: string, p: string): string => {
  const f = path.join(root, p.replace(/^\/+/, ""), "index.html");
  if (!fs.existsSync(f)) return "";
  const h = fs.readFileSync(f, "utf8").slice(0, 20000);
  const t = /<title>([^<]*)<\/title>/.exec(h)?.[1] || /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(h)?.[1] || "";
  return clean(t.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s*[|·–-]\s*RealHunt\s*$/i, ""));
};

type Intent = { h: string; fixed: string[]; prefix?: string };
/** Countries with most homes first, as page keys ("spain"). */
export function countryOrder(rows: Row[]): string[] {
  const per = new Map<string, number>();
  for (const r of rows) { const k = String(r.country || "").toLowerCase().trim().replace(/\s+/g, "-"); if (k && k !== "scandinavia") per.set(k, (per.get(k) || 0) + 1); }
  return [...per].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([k]) => k);
}

/** Idea 602: up to 10 indexable pages for each thing a reader comes for. `pre` is "" or "/es". */
export function intentSections(root: string, indexable: (url: string) => boolean, rows: Row[], lang: "en" | "es"): string {
  const pre = lang === "es" ? "/es" : "";
  const cs = countryOrder(rows);
  const I: Intent[] = lang === "es" ? [
    { h: "Para buscar casas", fixed: ["/homes", "/new", "/price-drops", "/best", "/what-100k-buys"], prefix: "/homes/" },
    { h: "Para los gastos de compra", fixed: ["/costs", "/buying-costs", "/tools", "/research/buying-costs-by-country"], prefix: "/costs/" },
    { h: "Para las normas", fixed: ["/can-i-buy", "/guide", "/guide/questions", "/guide/buying", "/guide/glossary"], prefix: "/guide/" },
    { h: "Para los datos", fixed: ["/research", "/research/prices", "/research/open-data", "/research/country-facts", "/research/data-changelog", "/research/removed-homes", "/research/what-your-budget-buys", "/research/cheapest-per-sqm-europe", "/research/best-scored-regions", "/research/flood-indicator"] },
  ] : [
    { h: "To find homes", fixed: ["/homes", "/new", "/price-drops", "/best", "/what-100k-buys"], prefix: "/homes/" },
    { h: "For buying costs", fixed: ["/costs", "/buying-costs", "/tools", "/research/buying-costs-by-country"], prefix: "/costs/" },
    { h: "For buying rules", fixed: ["/can-i-buy", "/guide", "/guide/questions", "/guide/buying", "/guide/glossary"], prefix: "/guide/" },
    { h: "For data", fixed: ["/research", "/research/prices", "/research/open-data", "/research/country-facts", "/research/data-changelog", "/research/removed-homes", "/research/what-your-budget-buys", "/research/cheapest-per-sqm-europe", "/research/best-scored-regions", "/research/flood-indicator"] },
  ];
  const parts: string[] = [];
  for (const it of I) {
    const cand = [...it.fixed, ...(it.prefix ? cs.map((k) => it.prefix + k) : [])].map((p) => pre + p);
    const pick = [...new Set(cand)].filter((p) => indexable(SITE + p)).slice(0, 10);
    if (pick.length < 2) continue;
    parts.push(`### ${it.h}\n\n` + pick.map((p) => `- [${titleOf(root, p) || p}](${SITE}${p})`).join("\n"));
  }
  return parts.length ? `## ${lang === "es" ? "Las mejores páginas según lo que buscas" : "The best pages for what you came for"}\n\n${parts.join("\n\n")}\n\n` : "";
}

/** Puts a block before a heading of llms.txt, or at the end; once. */
export function insertBefore(txt: string, heading: string, block: string, marker: string): string {
  if (!block || txt.includes(marker)) return txt;
  const at = txt.indexOf(heading);
  return at >= 0 ? txt.slice(0, at) + block + txt.slice(at) : txt.replace(/\n*$/, "\n\n") + block;
}

/** Ideas 624 and 643: every address of llms.txt checked against the indexable pages and the files on disk. */
export function checkLlmsUrls(root: string, txt: string, indexable: (url: string) => boolean, families: [string, string][]) {
  const urls = [...new Set([...txt.matchAll(/https:\/\/realhunt\.co[^\s)\]>,]*/g)].map((m) => m[0].replace(/[.:;]+$/, "")))];
  const missing: string[] = [];
  const fam: Record<string, number> = {};
  let files = 0, pages = 0;
  for (const u of urls) {
    const p = u.replace(SITE, "") || "/";
    if (/[<{]/.test(p) || /^\/(es\/)?deal\/[^/]+\.md$/.test(p)) continue; // patterns, and home texts kept in the page bundles
    if (/\.[a-z0-9]{2,8}$/i.test(p)) { files++; if (!fs.existsSync(path.join(root, p.replace(/^\/+/, "")))) missing.push(p); continue; }
    pages++;
    if (!indexable(u)) missing.push(p);
    const bare = p.replace(/^\/es(?=\/|$)/, "") || "/";
    const f = families.find(([, re]) => new RegExp(re).test(bare))?.[0] || "app";
    fam[f] = (fam[f] || 0) + 1;
  }
  const absent = families.map(([f]) => f).filter((f) => f !== "app" && !fam[f]);
  return { urls: urls.length, pages, files, missing, families: fam, families_absent: absent };
}

// ------------------------------------------------------------------------------------------------ answers
const srcLine = (id: string, lang: "en" | "es"): string => {
  if (id.startsWith("data:")) { const k = id.slice(5); return `- ${lang === "es" ? "Datos de RealHunt del país" : "RealHunt country data"}: ${SITE}/data/countries/${k}.json`; }
  const s = SOURCES[id as keyof typeof SOURCES];
  if (!s) return "";
  const org = lang === "es" ? s.orgEs || s.org : s.org;
  return `- [${org}: ${s.title[lang]}](${s.url}) (${lang === "es" ? "leído el" : "read"} ${s.read})`;
};

/** Ideas 606 and 628: the short answer of each guide by subject as a small Markdown file, with its sources. */
export function writeAnswers(root: string, indexable: (url: string) => boolean): { en: number; es: number } {
  const out = { en: 0, es: 0 };
  for (const lang of ["en", "es"] as const) {
    const pre = lang === "es" ? "/es" : "";
    const done: [string, string][] = [];
    for (const t of TOPICS) {
      const url = `${SITE}${pre}${topicPath(t)}`;
      if (!indexable(url) || !clean(t.answer?.[lang])) continue;
      const ids = [...new Set(t.secs.flatMap((s) => s.src || []))];
      const src = ids.map((id) => srcLine(id, lang)).filter(Boolean);
      const head = lang === "es"
        ? `Página: ${url}\nRevisado: ${t.reviewed}\nLicencia: CC BY 4.0 (${LICENSE}), se puede citar con un enlace a la página.\nInformación general, no asesoramiento jurídico ni fiscal.`
        : `Page: ${url}\nReviewed: ${t.reviewed}\nLicence: CC BY 4.0 (${LICENSE}), quote it with a link to the page.\nGeneral information, not legal or tax advice.`;
      const md = `# ${clean(t.title[lang])}\n\n${head}\n\n## ${lang === "es" ? "Respuesta corta" : "Short answer"}\n\n${clean(t.answer[lang])}\n\n`
        + (src.length ? `## ${lang === "es" ? "Fuentes oficiales" : "Official sources"}\n\n${src.join("\n")}\n\n` : "")
        + `${lang === "es" ? "Respuesta completa" : "Full answer"}: ${url}\n`;
      write(root, `${pre.slice(1)}${pre ? "/" : ""}answers/${t.slug}.md`, md);
      done.push([t.slug, clean(t.title[lang])]);
    }
    if (done.length) write(root, `${pre.slice(1)}${pre ? "/" : ""}answers/index.md`, `# ${lang === "es" ? "Respuestas cortas de RealHunt" : "RealHunt short answers"}\n\n${lang === "es" ? "Una respuesta corta por pregunta, con sus fuentes oficiales y la página completa. CC BY 4.0." : "One short answer per question, with its official sources and the full page. CC BY 4.0."}\n\n${done.map(([s, n]) => `- [${n}](${SITE}${pre}/answers/${s}.md)`).join("\n")}\n`);
    out[lang] = done.length;
  }
  return out;
}

// ------------------------------------------------------------------------------------------------ open data
const wrap = (what: string, source: string, today: string, body: Record<string, unknown>) => ({ _about: what, updated: today, license: LICENSE, attribution: ATTR, source, docs: `${SITE}/data/README.md`, ...body });

/** Idea 608: one file with every country: homes, median, cheapest, buying costs and the rule for foreigners. */
export function countriesFile(root: string, today: string): object | null {
  const idx = readJson(path.join(root, "data/countries/index.json"));
  if (!idx?.countries?.length) return null;
  const countries = idx.countries.map((c: any) => {
    const f = readJson(path.join(root, `data/countries/${c.key}.json`), {});
    const b = f.buying || {}, s = f.summary || {};
    return { country: c.country, key: c.key, homes: c.homes, small_sample: !!c.small_sample, median_price_eur: c.median_price_eur, median_eur_per_sqm: c.median_eur_per_sqm, cheapest_eur: s.cheapest_eur ?? null, median_score: s.median_score ?? null,
      buying_costs_pct_low: b.costs_pct_low ?? null, buying_costs_pct_high: b.costs_pct_high ?? null, can_foreigners_buy: b.can_foreigners_buy ?? null, annual_property_tax: b.annual_property_tax ?? null, rules_as_of: b.as_of ?? null, sources: b.sources || [],
      page: c.page, data: c.json };
  });
  return wrap("Every country with homes on RealHunt: key figures, buying costs and the rule for foreign buyers", `${SITE}/homes`, today, { note: idx.note, countries });
}

/** Idea 631: the glossaries as schema.org DefinedTermSet, one set per country glossary. */
export function glossaryFile(today: string, indexable: (u: string) => boolean): object {
  const sets = GLOSSARIES.filter((g) => indexable(SITE + glossaryPath(g.slug))).map((g) => ({ "@type": "DefinedTermSet", "@id": `${SITE}${glossaryPath(g.slug)}`, name: `${g.name.en}: words of a home purchase`, url: `${SITE}${glossaryPath(g.slug)}`, inLanguage: "en", dateModified: g.reviewed,
    hasDefinedTerm: g.terms.map((t) => ({ "@type": "DefinedTerm", name: t.term, termCode: t.id, inLanguage: t.tl || g.tl, alternateName: t.plain.en, description: clean(t.def.en), description_es: clean(t.def.es), url: `${SITE}${glossaryPath(g.slug)}#${t.id}` })) }));
  return { "@context": "https://schema.org", ...wrap("Glossaries of buying a home abroad, as schema.org DefinedTermSet", `${SITE}/guide/glossary`, today, {}), "@graph": sets };
}

/** Ideas 632 and 633: the rules by nationality and the costs by country, as they are behind the pages. */
export function rulesFile(today: string, cb: any): object | null {
  if (!cb?.countries) return null;
  return wrap("Who can buy a home where, by nationality group (the data behind /can-i-buy)", `${SITE}/can-i-buy`, today, { meta: cb._meta || null, nationalities: cb.nationalities || null, groups: { schengen: cb.schengen || null, eu: cb.eu || null }, countries: cb.countries });
}
export function costsFile(today: string, dest: any): object | null {
  if (!dest || typeof dest !== "object") return null;
  const keys = ["can_foreigners_buy", "purchase_costs_pct", "purchase_costs_breakdown", "annual_property_tax", "rental_income_tax", "as_of", "sources"];
  const countries: Record<string, any> = {};
  for (const [k, v] of Object.entries(dest)) if (k !== "_meta" && v && typeof v === "object") { const o: any = {}; for (const f of keys) if ((v as any)[f] != null) o[f] = (v as any)[f]; if (Object.keys(o).length) countries[k] = o; }
  return wrap("Buying costs, yearly taxes and the rule for foreigners, country by country (the data behind /costs)", `${SITE}/costs`, today, { note: "General information, not legal or tax advice. Each country carries its sources and the date it was checked.", countries });
}

/** Idea 634: coordinates in public files rounded to 3 decimals (about 100 m), so no file points at a front door. */
export const round3 = (v: unknown) => { const n = Number(v); return v != null && v !== "" && Number.isFinite(n) ? Math.round(n * 1000) / 1000 : null; };

/** Idea 609: every home as CSV, the same fields as /data/homes.jsonl. */
export function homesCsv(jsonl: string): string {
  const lines = jsonl.trim().split("\n").slice(1).map((l) => JSON.parse(l));
  const cols = ["url", "title", "country", "region", "place", "lat", "lng", "price_eur", "size_sqm", "eur_per_sqm", "bedrooms", "score", "added", "state", "last_confirmed", "listed_on", "monthly_fee", "yearly_tax", "costs_currency", "fee_unknown", "flood_indicator", "noise_indicator", "airport_km"];
  return "﻿" + toCsv(cols, lines.map((o) => cols.map((c) => (o[c] == null ? "" : typeof o[c] === "boolean" ? String(o[c]) : o[c]))));
}

/** Idea 621, 626 and 649: what each file is and what each field means, and how to credit it. */
export function dataReadme(today: string, files: [string, number][]): string {
  const size = (b: number) => (b > 1e6 ? (b / 1e6).toFixed(1) + " MB" : Math.max(1, Math.round(b / 1e3)) + " KB");
  return `# RealHunt open data

Updated ${today}. Licence: CC BY 4.0 (${LICENSE}). Photos belong to the original listings and are not part of these files.
Suggested credit: "Source: RealHunt (realhunt.co), CC BY 4.0", with a link to the page or file you used.
Rules, taxes and costs are general information, not legal or tax advice. Description of every file for programs: ${SITE}/openapi.json

## Files

| File | Size | What it is |
|---|---|---|
${files.map(([f, b]) => `| ${SITE}/${f} | ${size(b)} | ${FILE_NOTES[f] || ""} |`).join("\n")}

## Fields of a home (homes.jsonl, homes.csv)

| Field | Meaning |
|---|---|
| url, slug | The page of the home on RealHunt |
| title, title_es | Short title in English and in Spanish |
| country, region, place | Where it is, as the listing gives it |
| lat, lng | Rounded to 3 decimals (about 100 m): an area, not the door |
| price_eur | Asking price in euros, from the original listing |
| size_sqm, eur_per_sqm, bedrooms | As the listing gives them; empty when it does not |
| score, score_summary | RealHunt's own grade against every other home on the site (not a valuation) |
| added | Day the home was added |
| state | listed, unconfirmed (our nightly check could not confirm the advert for 30 days) or advert_offline |
| last_confirmed | Last day our nightly check read the advert as still for sale |
| listed_on | Domain of the original listing |
| monthly_fee, yearly_tax, costs_currency | Community fee (HOA) per month and property tax per year as the listing states them, in costs_currency; empty when not stated |
| fee_unknown | true for a flat whose listing does not state its community fee |
| flood_indicator, noise_indicator | low, medium or high: our rough indicators (height, distance to sea and rivers, motorways and railways), not official maps |
| airport_km | Straight-line distance to the nearest airport |

Sources of the indicators: OpenStreetMap and OurAirports (open data). The full method: ${SITE}/method and ${SITE}/how-we-check-homes
`;
}
const FILE_NOTES: Record<string, string> = {
  "data/homes.jsonl": "Every home, one JSON object per line (the first line describes the file)",
  "data/homes.csv": "Every home, one row each, for spreadsheets",
  "data/countries.json": "Every country: homes, median, cheapest, buying costs, rule for foreigners",
  "data/countries/index.json": "Countries and the address of each country file",
  "data/costs.json": "Buying costs and yearly taxes by country, with sources",
  "data/can-i-buy.json": "Who can buy where, by nationality group",
  "data/glossary.json": "Words of a home purchase by country (schema.org DefinedTermSet)",
  "data/realhunt-homes.geojson": "Every home with coordinates, as GeoJSON points",
  "data/realhunt-best-homes.kml": "The ten best-scored homes of each country (KML)",
  "data/changed-today.txt": "Pages added or changed in today's build, one address per line",
  "research/homes.csv": "Every home with airport distance and flood indicator",
  "research/removed-homes.json": "Homes taken off the site and price changes, with dates",
  "research/removed-by-month.json": "How many homes left the site or changed price, month by month",
  "research/monthly-series.json": "One reading per month: homes, countries, median price",
  "research/property-portals.csv": "Property portals by country",
  "feeds/price-drops.json": "Price drops, newest first (JSON Feed)",
  "feeds/removed.json": "Homes taken off the site, newest first (JSON Feed)",
  "press/realhunt-in-figures.pdf": "RealHunt in figures: one page for the press, this month (the same file is kept as realhunt-in-figures-YYYY-MM.pdf)",
  "llms.txt": "Short index for AI assistants",
  "llms-full.txt": "The reference text of the site in one file",
};

/** Ideas 635 and 636. */
export function humansTxt(today: string): string {
  return `/* TEAM */\nSite: RealHunt\nRun by: Equinox Investment Group LLC (Sheridan, Wyoming, United States)\nContact: ${CONTACT}\n\n/* THANKS */\nOpen data used: OpenStreetMap contributors (ODbL), OurAirports (public domain), Open-Meteo (CC BY 4.0)\nOfficial sources of each rule and tax: ${SITE}/guide and ${SITE}/costs\n\n/* SITE */\nLast update: ${today}\nLanguage: English, Spanish (and German, French, Dutch, Polish, Russian listings)\nStandards: HTML, schema.org, JSON Feed, OpenAPI 3.1\nData licence: CC BY 4.0, ${SITE}/data/README.md\n`;
}
export function securityTxt(now = new Date()): string {
  const exp = new Date(now.getTime() + 180 * 864e5).toISOString().slice(0, 10) + "T00:00:00.000Z";
  return `Contact: mailto:${CONTACT}\nExpires: ${exp}\nPreferred-Languages: en, es\nCanonical: ${SITE}/.well-known/security.txt\n`;
}

/** Idea 637: pages new or changed since the live build, else the pages whose lastmod is today. */
export function changedToday(idx: Map<string, string | null>, today: string, changes?: { added: string[]; changed: string[] } | null): string[] {
  const list = changes && (changes.added.length || changes.changed.length) ? [...changes.added, ...changes.changed] : [...idx].filter(([, d]) => String(d || "").slice(0, 10) === today).map(([u]) => u);
  return [...new Set(list)].sort();
}

/** Idea 615: llms-full.txt kept under 2 MB, with a gzip copy next to it. */
export function llmsFullSize(root: string): { bytes: number; gz: number; over: boolean } | null {
  const f = path.join(root, "llms-full.txt");
  if (!fs.existsSync(f)) return null;
  const buf = fs.readFileSync(f), gz = zlib.gzipSync(buf, { level: 9 });
  fs.writeFileSync(f + ".gz", gz);
  const over = buf.length > 2_000_000;
  if (over) console.warn(`[rh-reach] llms-full.txt is ${buf.length} bytes, over 2 MB`);
  return { bytes: buf.length, gz: gz.length, over };
}

/** Idea 630: size and date of each data file, for reach.json. */
export function fileReport(root: string, rels: string[]): [string, number][] {
  return rels.filter((r) => fs.existsSync(path.join(root, r))).map((r) => [r, fs.statSync(path.join(root, r)).size]);
}

export function writeOpenData(root: string, today: string, indexable: (u: string) => boolean): string[] {
  const done: string[] = [];
  const put = (rel: string, o: object | null) => { if (!o) return; write(root, rel, JSON.stringify(o) + "\n"); done.push(rel); };
  put("data/countries.json", countriesFile(root, today));
  put("data/glossary.json", glossaryFile(today, indexable));
  put("data/can-i-buy.json", rulesFile(today, readJson(path.resolve(process.cwd(), "src/data/canbuy.json"))));
  put("data/costs.json", costsFile(today, readJson(path.resolve(process.cwd(), "src/data/destinations.json"))));
  const jl = path.join(root, "data/homes.jsonl");
  if (fs.existsSync(jl)) { write(root, "data/homes.csv", homesCsv(fs.readFileSync(jl, "utf8"))); done.push("data/homes.csv"); }
  write(root, "humans.txt", humansTxt(today)); done.push("humans.txt");
  write(root, ".well-known/security.txt", securityTxt()); done.push(".well-known/security.txt");
  return done;
}

export function writeDataReadme(root: string, today: string): number {
  const files = fileReport(root, Object.keys(FILE_NOTES));
  write(root, "data/README.md", dataReadme(today, files));
  return files.length;
}

/** Idea 620 and 645: "RealHunt in figures", a one-page PDF for the press, at a stable address and one per month. */
export function figuresPdf(root: string, rows: Row[], today: string): string[] {
  const idx = readJson(path.join(root, "data/countries/index.json"));
  const by = readJson(path.join(root, "research/removed-by-month.json"));
  if (!idx?.countries?.length) return [];
  const c = siteCounts(rows as any[]), sr = scoreRange(rows);
  const eur = (n: number) => "€" + Math.round(n).toLocaleString("en");
  const month = today.slice(0, 7), m = (by?.months || []).find((x: any) => x.month === month);
  const L: Line[] = [
    { text: "RealHunt · realhunt.co", size: 9, color: 0.4 },
    { text: `RealHunt in figures, ${new Date(today + "T12:00:00Z").toLocaleString("en", { month: "long", year: "numeric", timeZone: "UTC" })}`, size: 19, bold: true, gap: 4 },
    { text: `Figures of ${today}, from the homes on the site that day. Source: RealHunt, ${SITE}/research. Free to quote with a link (CC BY 4.0).`, size: 9, color: 0.4, gap: 8 },
    { label: "Homes on the site", text: `${c.homes}, each checked by a person`, size: 10, gap: 4 },
    { label: "Countries", text: `${c.countries} with at least 3 homes`, size: 10, gap: 4 },
    { label: "Median asking price", text: `${eur(c.median)}${c.ppsqm ? `, ${eur(c.ppsqm)} per m²` : ""}`, size: 10, gap: 4 },
    ...(sr ? [{ label: "Scores", text: `${sr[0]} to ${sr[1]}, against every other home on the site`, size: 10, gap: 4 }] : []),
    ...(m ? [{ label: "This month so far", text: `${m.gone + m.removed} homes left the site or their advert went offline; ${m.price_down} price drops`, size: 10, gap: 4 }] : []),
    { text: "Countries with most homes", size: 13, bold: true, gap: 10 },
    ...idx.countries.slice().sort((a: any, b: any) => b.homes - a.homes).slice(0, 12).map((x: any) => ({ label: String(x.country), text: `${x.homes} homes, median ${eur(x.median_price_eur)}${x.costs_pct_low != null ? `, buying costs about ${x.costs_pct_low}${x.costs_pct_high != null && x.costs_pct_high !== x.costs_pct_low ? ` to ${x.costs_pct_high}` : ""}%` : ""}${x.small_sample ? " (small sample)" : ""}`, size: 9.5, gap: 3 })),
    { text: "Asking prices in euros from the original listings; medians describe the homes RealHunt lists, not a whole market. Every country file: " + SITE + "/data/countries.json. Press: " + CONTACT, size: 8.5, color: 0.35, gap: 12 },
  ];
  const pdf = makePdf(L, { title: `RealHunt in figures ${month}`, author: "RealHunt", subject: "Key figures of the homes on RealHunt", lang: "en" });
  write(root, "press/realhunt-in-figures.pdf", pdf);
  write(root, `press/realhunt-in-figures-${month}.pdf`, pdf);
  return ["press/realhunt-in-figures.pdf", `press/realhunt-in-figures-${month}.pdf`];
}

export { FILE_NOTES };
