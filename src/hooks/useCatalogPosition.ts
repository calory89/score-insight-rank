import { useEffect, useLayoutEffect, useRef } from "react";
import { readSession, writeSession } from "@/lib/catalog";

type Position = { y: number; limit: number; at: number; anchor?: string; offset?: number };
const storageKey = (url: string) => `rh_catalog_position:${url}`;
export function catalogPosition(url: string): Position | null {
  const p = readSession<Position | null>(storageKey(url), null);
  return p && Number.isFinite(p.y) && Number.isFinite(p.limit) && Date.now() - p.at < 86400000 ? p : null;
}
export function useCatalogPosition(url: string, ready: boolean, limit: number) {
  const limitRef = useRef(limit); limitRef.current = limit;
  const restoring = useRef(false);
  useLayoutEffect(() => {
    if (!ready) return;
    const pos = catalogPosition(url);
    if (!pos) { window.scrollTo(0, 0); return; }
    restoring.current = true;
    let frame = 0;
    const restore = () => {
      const anchor = pos.anchor ? [...document.querySelectorAll<HTMLElement>("[data-home-code]")].find(el => el.dataset.homeCode === pos.anchor) : null;
      const y = anchor ? window.scrollY + anchor.getBoundingClientRect().top - (pos.offset || 0) : pos.y;
      window.scrollTo({ top: Math.max(0, y), behavior: "instant" as ScrollBehavior });
    };
    frame = requestAnimationFrame(() => { restore(); frame = requestAnimationFrame(restore); });
    // Images reserve their aspect ratio; this also covers the feed's asynchronous first render.
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(restore) : null;
    observer?.observe(document.body);
    const stop = () => { restoring.current = false; observer?.disconnect(); };
    const timer = window.setTimeout(stop, 1200);
    window.addEventListener("pointerdown", stop, { once: true });
    window.addEventListener("wheel", stop, { once: true });
    window.addEventListener("keydown", stop, { once: true });
    return () => { cancelAnimationFrame(frame); clearTimeout(timer); stop(); window.removeEventListener("pointerdown", stop); window.removeEventListener("wheel", stop); window.removeEventListener("keydown", stop); };
  }, [url, ready]);
  useEffect(() => {
    if (!ready) return;
    const save = () => {
      if (restoring.current) return;
      const anchor = [...document.querySelectorAll<HTMLElement>("[data-home-code]")].find(el => el.getBoundingClientRect().bottom > 100);
      writeSession(storageKey(url), { y: window.scrollY, limit: limitRef.current, at: Date.now(), anchor: anchor?.dataset.homeCode, offset: anchor?.getBoundingClientRect().top });
    };
    window.addEventListener("scroll", save, { passive: true });
    window.addEventListener("pagehide", save);
    document.addEventListener("click", save, true);
    return () => { window.removeEventListener("scroll", save); window.removeEventListener("pagehide", save); document.removeEventListener("click", save, true); };
  }, [url, ready]);
}
