import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Cache hygiene: unregister any legacy service workers and clear their caches
// so returning visitors always receive the latest build. The Lovable proxy
// already serves index.html with no-cache headers; this only cleans up SWs
// that may have been registered by an older deploy.
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then((regs) => {
      if (regs.length === 0) return;
      Promise.all(regs.map((r) => r.unregister())).then(() => {
        if (typeof caches !== "undefined") {
          caches.keys().then((names) => names.forEach((n) => caches.delete(n)));
        }
      });
    })
    .catch(() => {});
}

createRoot(document.getElementById("root")!).render(<App />);
