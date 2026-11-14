import "./lib/static-db";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./lib/perf.css";
import { initLang, startLang } from "./lib/lang";
import { installEsUrls, dropStaleAlternates } from "./lib/esPath";

dropStaleAlternates(); // the app shell served for a path with no file of its own carries the front page's hreflang
installEsUrls(); // Spanish URLs (/es/...): links, history and canonical keep the prefix

initLang().finally(() => {
  startLang();
  createRoot(document.getElementById("root")!).render(<App />);
  // 15-nov-2026: measurement helpers (src/measure) load when the browser is idle, in their own chunk
  ((window as any).requestIdleCallback || ((cb: () => void) => setTimeout(cb, 3000)))(() => { import("./measure").then((m) => m.start()).catch(() => {}); });
});
