// Round 3 of "RealHunt 100/100" (26-nov-2026): the de/fr/nl/pl/ru pages go into bundles served by the worker (rh-pack-3).
import { describe, it, expect } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { langPages, writeLangPack, LANG_SHARDS } from "../../seo/langs/pack";
import { packShard } from "../../seo/pack";

describe("language page bundles", () => {
  it("bundles every index.html under the language folders and leaves other files alone", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "lp-"));
    const put = (rel: string, s: string) => { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), s); };
    put("index.html", "<html>en</html>"); put("de/index.html", "<p>de</p>"); put("de/homes/spain/index.html", "<p>Spanien</p>");
    put("ru/homes/italy/index.html", "<p>Италия</p>"); put("de/feed.xml", "<rss/>"); put("fr/llms.txt", "x");
    expect(langPages(root).map(([k]) => k)).toEqual(["/de", "/de/homes/spain", "/ru/homes/italy"]);
    const r = writeLangPack(root, "move");
    expect(r.pages).toBe(3);
    const n = packShard("/de/homes/spain", LANG_SHARDS);
    expect(JSON.parse(fs.readFileSync(path.join(root, "_pk/l1", n + ".json"), "utf8"))["/de/homes/spain"]).toBe("<p>Spanien</p>");
    expect(fs.existsSync(path.join(root, "de/homes/spain/index.html"))).toBe(false);
    expect(fs.existsSync(path.join(root, "de/feed.xml"))).toBe(true);
    expect(fs.existsSync(path.join(root, "fr/llms.txt"))).toBe(true);
    expect(fs.existsSync(path.join(root, "index.html"))).toBe(true);
  });
});
