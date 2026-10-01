import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initLang, startLang } from "./lib/lang";

initLang().finally(() => {
  startLang();
  createRoot(document.getElementById("root")!).render(<App />);
});
