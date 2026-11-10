import "./lib/static-db";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initLang, startLang } from "./lib/lang";
import { installEsUrls, dropStaleAlternates } from "./lib/esPath";

dropStaleAlternates(); // the app shell served for a path with no file of its own carries the front page's hreflang
installEsUrls(); // Spanish URLs (/es/...): links, history and canonical keep the prefix

initLang().finally(() => {
  startLang();
  createRoot(document.getElementById("root")!).render(<App />);
});
