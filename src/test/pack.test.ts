import { describe, it, expect } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { packShard, writePack, PACK_DIR, SHARDS } from "../../seo/pack";
import { dealMarkdown } from "../../seo/dealMd";

// The worker (realhunt.co _worker.js, rh-pack-1) computes the bundle with the same FNV-1a hash: these values pin it.
describe("home page bundles", () => {
  it("hash is stable and in range", () => {
    expect(packShard("")).toBe(0x811c9dc5 % SHARDS);
    expect(packShard("/deal/a")).toBe(packShard("/deal/a"));
    for (const k of ["/deal/x", "/es/deal/x", "/deal/us-tampa-8105-325k"]) { const n = packShard(k); expect(n).toBeGreaterThanOrEqual(0); expect(n).toBeLessThan(SHARDS); }
    expect(packShard("/deal/abc", 1 << 30)).toBe(1004019135);
  });

  it("packs every home page byte for byte and keeps or drops the files", () => {
    for (const mode of ["copy", "move"] as const) {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), "pk-"));
      const pages: Record<string, string> = { "/deal/casa-1": "<html>uno ñ</html>", "/es/deal/casa-1": "<html>es</html>", "/deal/b2": "<p>b</p>" };
      for (const [k, v] of Object.entries(pages)) { fs.mkdirSync(path.join(root, k), { recursive: true }); fs.writeFileSync(path.join(root, k, "index.html"), v); }
      fs.mkdirSync(path.join(root, "deal/no-page"), { recursive: true });
      const r = writePack(root, mode);
      expect(r.pages).toBe(3);
      const got: Record<string, string> = {};
      for (const f of fs.readdirSync(path.join(root, PACK_DIR))) {
        const m = JSON.parse(fs.readFileSync(path.join(root, PACK_DIR, f), "utf8"));
        for (const k of Object.keys(m)) expect(f).toBe(packShard(k) + ".json");
        Object.assign(got, m);
      }
      // each page and its clean-text version (seo/dealMd.ts) under "<path>.md", in the bundle its own key names
      const html = Object.fromEntries(Object.entries(got).filter(([k]) => !k.endsWith(".md")));
      expect(html).toEqual(pages);
      for (const k of Object.keys(pages)) expect(typeof got[k + ".md"]).toBe("string");
      expect(r.maxKb).toBe(0);
      expect(r.over).toEqual([]);
      expect(fs.existsSync(path.join(root, "deal/casa-1/index.html"))).toBe(mode === "copy");
      expect(fs.existsSync(path.join(root, "deal/no-page"))).toBe(true);
    }
  });

  it("writes the clean text of a home page from its HTML", () => {
    const html = `<html lang="en"><head><title>2-bedroom flat in Peglio, Italy for €85,000 · RealHunt</title><meta name="description" content="A flat &amp; a view." /><link rel="canonical" href="https://realhunt.co/deal/x" /><link rel="alternate" hreflang="es" href="https://realhunt.co/es/deal/x" /></head><body><div id="root"><div class="rh-shell"><figure class="rh-sh-gal n1"><b><img src="https://m.example/x.webp" alt="Flat, Peglio, €85,000" fetchpriority="high"></b></figure><div class="rh-sh-text"><h1>2-bedroom flat with a view</h1><div class="rh-sh-price">€85,000</div></div></div><script>window.__rhHome={}</script><main class="rh-static"><article><nav class="rh-bc"><a href="/">RealHunt</a> › <span>Flat</span></nav><p class="rh-lead">2-bedroom flat for sale at <strong>€85,000</strong>.</p><h2>Questions</h2><h3>Can I buy?</h3><p>Yes, see <a href="/guide/italy">the guide</a>.</p><ul><li><a href="/deal/y">Other</a></li><li>Third</li></ul></article></main><aside class="rh-rel"><a href="/z">not here</a></aside></div></body></html>`;
    const md = dealMarkdown(html, "/deal/x");
    expect(md).toContain('title: "2-bedroom flat in Peglio, Italy for €85,000 · RealHunt"');
    expect(md).toContain('url: "https://realhunt.co/deal/x"');
    expect(md).toContain('spanish: "https://realhunt.co/es/deal/x"');
    expect(md).toContain("# 2-bedroom flat with a view\n\n**€85,000**");
    expect(md).toContain("![Flat, Peglio, €85,000](https://m.example/x.webp)");
    expect(md).toContain("2-bedroom flat for sale at **€85,000**.");
    expect(md).toContain("### Can I buy?\n\nYes, see [the guide](https://realhunt.co/guide/italy).");
    expect(md).toContain("- [Other](https://realhunt.co/deal/y)\n- Third");
    expect(md).not.toContain("not here");
    expect(md).not.toContain("<");
    expect(dealMarkdown(html.replace('lang="en"', 'lang="es"'), "/es/deal/x")).toContain("language: es");
  });
});
