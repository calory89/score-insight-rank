import { describe, it, expect } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { packShard, writePack, PACK_DIR, SHARDS } from "../../seo/pack";

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
      expect(got).toEqual(pages);
      expect(fs.existsSync(path.join(root, "deal/casa-1/index.html"))).toBe(mode === "copy");
      expect(fs.existsSync(path.join(root, "deal/no-page"))).toBe(true);
    }
  });
});
