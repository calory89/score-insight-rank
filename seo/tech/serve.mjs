// Local server for a built dist/ that answers like the hosting worker does for pages (3,346 folders with an
// index.html, no SPA fallback for a path that has its own page, gzip, a year of cache for /assets). `vite preview`
// serves the app shell for /homes/spain (no trailing slash), so speed checks against it measure the wrong page.
//   node seo/tech/serve.mjs dist 4210
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".xml": "application/xml", ".txt": "text/plain; charset=utf-8", ".md": "text/markdown; charset=utf-8", ".svg": "image/svg+xml", ".webp": "image/webp", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".ico": "image/x-icon", ".woff2": "font/woff2", ".webmanifest": "application/manifest+json", ".csv": "text/csv; charset=utf-8" };
const TEXT = /\.(html|js|mjs|css|json|xml|txt|md|svg|webmanifest|csv)$/;

export function serve(root, port = 4210, host = "127.0.0.1") {
  const zipped = new Map();
  const server = http.createServer((req, res) => {
    let p;
    try { p = decodeURIComponent(new URL(req.url, "http://x").pathname); } catch { res.writeHead(400); return res.end(); }
    let f = path.join(root, path.normalize(p));
    if (!f.startsWith(root)) { res.writeHead(403); return res.end(); }
    let status = 200;
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, "index.html");
    if (!fs.existsSync(f)) {
      if (path.extname(p)) { res.writeHead(404); return res.end("not found"); }
      f = path.join(root, "index.html"); // an app-only route: the shell
    }
    const ext = path.extname(f);
    const head = { "content-type": TYPES[ext] || "application/octet-stream", "cache-control": p.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "public, max-age=0, must-revalidate" };
    if (TEXT.test(f) && /\bgzip\b/.test(String(req.headers["accept-encoding"] || ""))) {
      const st = fs.statSync(f); const key = f + ":" + st.mtimeMs;
      let z = zipped.get(key);
      if (!z) { z = zlib.gzipSync(fs.readFileSync(f), { level: 9 }); zipped.set(key, z); }
      res.writeHead(status, { ...head, "content-encoding": "gzip", "content-length": z.length, vary: "accept-encoding" });
      return res.end(z);
    }
    res.writeHead(status, { ...head, "content-length": fs.statSync(f).size });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise((ok) => server.listen(port, host, () => ok(server)));
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const root = path.resolve(process.argv[2] || "dist"); const port = +(process.argv[3] || 4210);
  serve(root, port).then(() => console.log(`serving ${root} on http://127.0.0.1:${port}`));
}
