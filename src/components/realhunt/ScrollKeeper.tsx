// 7-nov-2026 (Carlos: "meto una propiedad a través del mapa, le doy atrás y se ve el pie de página"). The browser's own
// scroll restore runs before the SPA has drawn the page it goes back to, so on iPhone it kept the old page's scroll
// and left you at the footer. Now the app does it: a new page opens at the top, and Back returns to the exact
// scroll you left, retrying while the page fills in (data, images, lazy chunks) until you touch the screen.
import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

const KEY = "rh-scroll";
const load = (): Record<string, number> => { try { return JSON.parse(sessionStorage.getItem(KEY) || "{}"); } catch { return {}; } };

export default function ScrollKeeper() {
  const loc = useLocation();
  const nav = useNavigationType();
  const pos = useRef<Record<string, number>>(load());
  const cur = useRef(loc.key);

  useEffect(() => {
    try { if ("scrollRestoration" in history) history.scrollRestoration = "manual"; } catch {}
    let f = 0;
    const save = () => { if (f) return; f = requestAnimationFrame(() => { f = 0; pos.current[cur.current] = Math.round(window.scrollY); }); };
    const persist = () => { try { const e = Object.entries(pos.current).slice(-60); sessionStorage.setItem(KEY, JSON.stringify(Object.fromEntries(e))); } catch {} };
    window.addEventListener("scroll", save, { passive: true });
    window.addEventListener("pagehide", persist);
    return () => { window.removeEventListener("scroll", save); window.removeEventListener("pagehide", persist); };
  }, []);

  useLayoutEffect(() => {
    cur.current = loc.key;
    if (loc.hash) return;
    const target = nav === "POP" ? pos.current[loc.key] ?? 0 : 0;
    try { sessionStorage.setItem(KEY, JSON.stringify(pos.current)); } catch {}
    const go = () => { if (Math.abs(window.scrollY - target) > 2) window.scrollTo({ top: target, behavior: "instant" as ScrollBehavior }); };
    go();
    if (nav !== "POP") return; // a new page: just start at the top; pages with their own restore keep it
    let done = false, raf = requestAnimationFrame(go);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => !done && go()) : null;
    ro?.observe(document.body);
    const stop = () => { done = true; ro?.disconnect(); cancelAnimationFrame(raf); };
    const timer = window.setTimeout(stop, 2500);
    const evs = ["pointerdown", "wheel", "keydown", "touchstart"];
    evs.forEach((e) => window.addEventListener(e, stop, { once: true, passive: true }));
    return () => { stop(); clearTimeout(timer); evs.forEach((e) => window.removeEventListener(e, stop)); };
  }, [loc.key]);
  return null;
}
