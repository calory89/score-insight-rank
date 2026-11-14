// The "related" block above the footer (14-nov-2026): the links to the pages around the one on screen, and its
// breadcrumb when the page has none of its own.
//
// The block is written into the HTML of every prerendered page by seo/polish.ts (seo/polishRelated.ts decides the
// links), so this component draws nothing of its own: on a first visit it shows the block that came with the page
// (window.__rhRel, set by the page before the app starts), and after an in-app navigation it reads it from the HTML
// of the new address when the reader gets near the end of the page. A visitor sees exactly what a crawler reads.
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ES_BOOT, isEsPath, stripEs, withEs } from "@/lib/esPath";
import { isEs } from "@/lib/lang";
import "./related.css";

type Crumb = [string, string];
type Found = { html: string; crumbs: Crumb[] };
const norm = (p: string) => p.replace(/\/+$/, "") || "/";
/** App screens that have no HTML page of their own: nothing to read, so nothing is fetched. */
const NO_PAGE = /^\/(submit|hunt|me|saved|inbox|account|invite|compare|claim|auth|admin|live-search|find)(\/|$)|^\/(c|b|vs|hunter|dev|s|r)\//;
const OWN_CRUMBS = ".hunt-main .hv-crumbs, .hunt-main .rh-crumbs, .hunt-main .bx-crumb, .hunt-main .rh-bc, .hunt-main nav[aria-label='Breadcrumb'], .hunt-main nav[aria-label='Ruta'], .hunt-main .rh-sh-crumbs";

/** The trail in the page's BreadcrumbList, as [name, path]. The same data the search engines read. */
export function crumbsOf(doc: Document): Crumb[] {
  for (const s of Array.from(doc.querySelectorAll('script[type="application/ld+json"]'))) {
    try {
      const o = JSON.parse(s.textContent || "null");
      if (o && o["@type"] === "BreadcrumbList" && Array.isArray(o.itemListElement))
        return o.itemListElement.filter((x: any) => x && x.name && x.item).map((x: any): Crumb => [String(x.name), String(x.item).replace(/^https?:\/\/[^/]+/, "") || "/"]);
    } catch { /* not JSON */ }
  }
  return [];
}
/** The block of a page, if the document is the page for `path` (an address without a file gets the front page). */
export function blockOf(doc: Document, path: string): Found | null {
  const el = doc.getElementById("rh-rel");
  return el && el.getAttribute("data-path") === path ? { html: el.outerHTML, crumbs: crumbsOf(doc) } : null;
}

const first = (() => {
  try {
    const b = (window as any).__rhRel as { p: string; h: string } | undefined;
    return b && b.p === norm(location.pathname) ? { path: b.p, found: { html: b.h, crumbs: crumbsOf(document) } as Found } : null;
  } catch { return null; }
})();
const cache = new Map<string, Promise<Found | null>>();
const load = (path: string) => {
  if (!cache.has(path)) cache.set(path, fetch(path, { headers: { accept: "text/html" } }).then((r) => (r.ok ? r.text() : "")).then((t) => (t ? blockOf(new DOMParser().parseFromString(t, "text/html"), path) : null)).catch(() => null));
  return cache.get(path)!;
};

export function RelatedBlock() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const box = useRef<HTMLElement>(null);
  // The address of the HTML to show: the Spanish page for a reader in Spanish, even when the address has no /es/.
  const spanish = ES_BOOT || isEs();
  const page = norm(spanish ? withEs(pathname) : pathname);
  const [found, setFound] = useState<Found | null>(first && first.path === page ? first.found : null);
  const [own, setOwn] = useState(true);
  useEffect(() => {
    if (first && first.path === page) { setFound(first.found); return; }
    setFound(null);
    if (NO_PAGE.test(pathname) || !box.current) return;
    let live = true;
    const go = () => { load(page).then((f) => { if (live) setFound(f); }); };
    if (typeof IntersectionObserver === "undefined") { go(); return () => { live = false; }; }
    const io = new IntersectionObserver((e) => { if (e.some((x) => x.isIntersecting)) { io.disconnect(); go(); } }, { rootMargin: "900px 0px" });
    io.observe(box.current);
    return () => { live = false; io.disconnect(); };
  }, [page, pathname]);
  // The page's own breadcrumb, when it draws one, is enough.
  useEffect(() => {
    if (!found) return;
    const check = () => { try { setOwn(!!document.querySelector(OWN_CRUMBS)); } catch { setOwn(true); } };
    check(); const t = setTimeout(check, 1500);
    return () => clearTimeout(t);
  }, [found, page]);

  const trail = found && !own && found.crumbs.length > 1 ? found.crumbs : null;
  return (
    <section ref={box} className="rh-relwrap" onClick={(e) => {
      const a = (e.target as HTMLElement).closest("a"); const href = a?.getAttribute("href") || "";
      if (!a || !href.startsWith("/") || a.target || e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault(); navigate(isEsPath(href) ? stripEs(href) : href); window.scrollTo(0, 0);
    }}>
      {trail && (
        <nav className="rh-rel-bc" aria-label={spanish ? "Ruta" : "Breadcrumb"}>
          {trail.map(([name, to], i) => (i === trail.length - 1
            ? <span key={to} aria-current="page">{name}</span>
            : <span key={to}><a href={to}>{name}</a><i aria-hidden="true">›</i></span>))}
        </nav>
      )}
      {found && <div dangerouslySetInnerHTML={{ __html: found.html }} />}
    </section>
  );
}
