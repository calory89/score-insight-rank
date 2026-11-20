// /seo-report and seo-audit.json: how many home pages the bundles serve and how many are still single files
// (20-nov-2026, idea 73). Runs right after seo/pack.ts, which comes after seo/polish.ts wrote the report, so it adds
// its own section to the finished report. Counts only what is in dist: the bundles, the single files left and the
// home addresses in the sitemaps. The clean-text copies in the bundles ("<path>.md") are not pages and are not counted.
import fs from "fs";
import path from "path";
import { PACK_DIR, PACK_ROOTS } from "../pack";

export type PackCount = { bundles: number; in_bundles: { en: number; es: number }; single_files: { en: number; es: number }; in_sitemaps: number; in_sitemaps_not_served: string[] };

export function countPack(root: string): PackCount {
  const keys = new Set<string>();
  const dir = path.join(root, PACK_DIR);
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^\d+\.json$/.test(f)) : [];
  for (const f of files) { try { for (const k of Object.keys(JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")))) if (!k.endsWith(".md")) keys.add(k); } catch { /* unreadable bundle: its pages count as not served */ } }
  const singles = new Set<string>();
  for (const r of PACK_ROOTS) { const d = path.join(root, r); if (!fs.existsSync(d)) continue; for (const s of fs.readdirSync(d)) if (fs.existsSync(path.join(d, s, "index.html"))) singles.add(`/${r}/${s}`); }
  const inMaps = new Set<string>();
  for (const f of fs.existsSync(root) ? fs.readdirSync(root) : []) {
    if (!/^sitemap-[a-z0-9-]+\.xml$/.test(f)) continue;
    for (const m of fs.readFileSync(path.join(root, f), "utf8").matchAll(/<loc>https:\/\/realhunt\.co(\/(?:es\/)?deal\/[^<]+)<\/loc>/g)) inMaps.add(m[1]);
  }
  const es = (k: string) => k.startsWith("/es/");
  return {
    bundles: files.length,
    in_bundles: { en: [...keys].filter((k) => !es(k)).length, es: [...keys].filter(es).length },
    single_files: { en: [...singles].filter((k) => !es(k)).length, es: [...singles].filter(es).length },
    in_sitemaps: inMaps.size,
    in_sitemaps_not_served: [...inMaps].filter((k) => !keys.has(k) && !singles.has(k)).sort(),
  };
}

const num = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

/** Adds the counts to dist/seo-audit.json (key "pack") and a section to dist/seo-report/index.html. */
export function reportPack(root: string): PackCount {
  const c = countPack(root);
  const audit = path.join(root, "seo-audit.json");
  if (fs.existsSync(audit)) { try { const a = JSON.parse(fs.readFileSync(audit, "utf8")); a.pack = c; fs.writeFileSync(audit, JSON.stringify(a, null, 1) + "\n"); } catch { /* report left as it is */ } }
  const rep = path.join(root, "seo-report", "index.html");
  if (fs.existsSync(rep)) {
    const h = fs.readFileSync(rep, "utf8");
    if (!h.includes("data-pack-report")) {
      const miss = c.in_sitemaps_not_served;
      const sec = `<h2 data-pack-report>Fichas: paquetes y ficheros sueltos</h2><p>El programa que atiende cada visita sirve las fichas de casa desde ${num(c.bundles)} paquetes. Si una ficha no está en un paquete, sirve el fichero suelto de siempre.</p>`
        + `<ul><li>Fichas en los paquetes: ${num(c.in_bundles.en)} en inglés y ${num(c.in_bundles.es)} en español.</li><li>Fichas que siguen en un fichero suelto: ${num(c.single_files.en)} en inglés y ${num(c.single_files.es)} en español.</li>`
        + `<li>Fichas en los mapas del sitio: ${num(c.in_sitemaps)}. Sin paquete ni fichero: ${num(miss.length)}${miss.length ? ` (${miss.slice(0, 10).map(esc).join(", ")}${miss.length > 10 ? ", ..." : ""})` : ""}.</li></ul>`;
      const at = h.lastIndexOf('<p class="sub">Datos completos');
      fs.writeFileSync(rep, at > 0 ? h.slice(0, at) + sec + "\n" + h.slice(at) : h.replace("</main>", () => sec + "</main>"));
    }
  }
  return c;
}
