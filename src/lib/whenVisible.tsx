// Mounts its children only when the spot comes near the screen (Tanda 16, idea 760, 26-nov-2026).
// The map of a home page sits far below the first screen, but it used to start Leaflet (42 KB), its styles and four
// map tiles (about 75 KB) as soon as the page opened, on every visit, even when nobody scrolls down to it.
// Without IntersectionObserver (very old browsers, the prerender) the children are mounted at once, as before.
import { useEffect, useRef, useState, type ReactNode } from "react";

export function WhenVisible({ children, fallback = null, margin = "400px" }: { children: ReactNode; fallback?: ReactNode; margin?: string }) {
  const [on, setOn] = useState(() => typeof window === "undefined" || !("IntersectionObserver" in window));
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (on || !ref.current) return;
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setOn(true); io.disconnect(); } }, { rootMargin: margin });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [on, margin]);
  return on ? <>{children}</> : <div ref={ref}>{fallback}</div>;
}
