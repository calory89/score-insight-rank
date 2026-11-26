// Route-level accessibility (26-nov-2026, list of 1,000, batch 17).
// - 840: after an in-app navigation, focus moves to the new page's H1 (screen readers start reading there,
//   keyboard users do not tab through the header again). First load and Back/Forward are left alone.
// - One main landmark. #main-content wraps every route, header and footer included, so it carries no role.
//   A prerendered page brings its own <main class="rh-static">; otherwise the page body (.hunt-main, or the
//   wrapper itself on other layouts) gets role="main" (axe: landmark-no-duplicate-main, *-is-top-level).
import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { focusMainHeading } from "@/lib/a11y";

export function syncMainLandmark(doc: Document = document) {
  const wrap = doc.getElementById("main-content");
  if (!wrap) return;
  const want = wrap.querySelector("main") ? null : wrap.querySelector<HTMLElement>(".hunt-main") || wrap;
  doc.querySelectorAll("[data-rh-main]").forEach(e => { if (e !== want) { e.removeAttribute("role"); e.removeAttribute("data-rh-main"); } });
  if (want && !want.hasAttribute("data-rh-main")) { want.setAttribute("role", "main"); want.setAttribute("data-rh-main", ""); }
}

let seen = false;
export default function RouteA11y() {
  const { pathname } = useLocation();
  const pop = useNavigationType() === "POP";
  useEffect(() => {
    const wrap = document.getElementById("main-content");
    const mo = wrap && new MutationObserver(() => syncMainLandmark());
    mo?.observe(wrap!, { childList: true, subtree: true });
    syncMainLandmark();
    return () => mo?.disconnect();
  }, []);
  useEffect(() => {
    if (!seen || pop) { seen = true; return; }
    let n = 0, t = 0; // the new page may still be loading its chunk: try for about 2 s
    const tick = () => { if (!focusMainHeading() && ++n < 20) t = window.setTimeout(tick, 100); };
    t = window.setTimeout(tick, 60);
    return () => clearTimeout(t);
  }, [pathname, pop]);
  return null;
}
