#!/usr/bin/env node
// Idea 404 of the organic list: collect, once a month, what people type after phrases like "buying a house in
// Italy as..." in each language, so the repeated ones can become question pages (seo/knowledge/data/topics2.ts).
// It reads the public autocomplete of a search engine: no account and no key. Nothing here publishes anything; a
// person reads the output and decides. Run by hand:
//   node scripts/suggest_questions.mjs            -> prints JSON
//   node scripts/suggest_questions.mjs out.json   -> writes the file
// The seeds come from the countries of src/data/guides.json. Be gentle: one request every 400 ms.
import fs from "fs";

const guides = JSON.parse(fs.readFileSync(new URL("../src/data/guides.json", import.meta.url), "utf8"));
const ES = { Spain: "España", Italy: "Italia", France: "Francia", Germany: "Alemania", Portugal: "Portugal", Greece: "Grecia", Japan: "Japón", Sweden: "Suecia", Denmark: "Dinamarca", Netherlands: "Países Bajos", Bulgaria: "Bulgaria", Mexico: "México", "United States": "Estados Unidos" };
const SEEDS = {
  en: (c) => [`buying a house in ${c} as a`, `can i buy a house in ${c}`, `why are houses so cheap in ${c}`, `is it safe to buy property in ${c}`, `buying property in ${c} tax`],
  es: (c) => [`comprar casa en ${c} siendo`, `puedo comprar una casa en ${c}`, `por qué son tan baratas las casas en ${c}`, `es seguro comprar casa en ${c}`, `impuestos por comprar casa en ${c}`],
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function suggest(q, hl) {
  const u = `https://suggestqueries.google.com/complete/search?client=firefox&hl=${hl}&q=${encodeURIComponent(q)}`;
  const r = await fetch(u, { headers: { "user-agent": "Mozilla/5.0 (question research, monthly)" } });
  if (!r.ok) throw new Error(`${r.status} for ${q}`);
  const j = JSON.parse(new TextDecoder("latin1").decode(await r.arrayBuffer()));
  return Array.isArray(j?.[1]) ? j[1] : [];
}

const out = { collected: new Date().toISOString().slice(0, 10), note: "Autocomplete suggestions, as typed by people. Raw material for question pages; not facts.", en: {}, es: {} };
const count = new Map();
for (const g of Object.values(guides)) {
  for (const hl of ["en", "es"]) {
    const name = hl === "es" ? ES[g.name] : g.name; if (!name) continue;
    for (const seed of SEEDS[hl](name)) {
      try { const xs = await suggest(seed, hl); out[hl][seed] = xs; for (const x of xs) count.set(x, (count.get(x) || 0) + 1); }
      catch (e) { out[hl][seed] = { error: String(e.message || e) }; }
      await sleep(400);
    }
  }
}
out.repeated = [...count.entries()].filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1]).map(([q, n]) => ({ q, n }));
const text = JSON.stringify(out, null, 1) + "\n";
if (process.argv[2]) fs.writeFileSync(process.argv[2], text); else process.stdout.write(text);
