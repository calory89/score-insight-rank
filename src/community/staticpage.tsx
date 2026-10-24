// Pages that only exist as prerendered HTML (seo/prerender.ts): /new, /research/prices, /sitemap.
// On a first visit the HTML is already in the page (marked data-rh-keep); on in-app navigation it is fetched
// from the same URL. Either way the content shown is exactly what search engines read.
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const first = (() => {
  try { const el = document.querySelector("#root [data-rh-keep][data-rh-static]"); return el ? { path: location.pathname, html: el.outerHTML } : null; } catch { return null; }
})();

export function StaticPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [html, setHtml] = useState<string | null>(first && first.path === pathname ? first.html : null);
  useEffect(() => {
    if (first && first.path === pathname) return;
    let live = true; setHtml(null);
    fetch(pathname, { headers: { accept: "text/html" } }).then((r) => r.text()).then((t) => {
      const doc = new DOMParser().parseFromString(t, "text/html");
      const el = doc.querySelector("#root [data-rh-static]");
      if (live) setHtml(el ? el.outerHTML : "<main class='rh-static'><p>This page could not load. <a href='/'>See the best homes</a>.</p></main>");
      if (live && el) document.title = doc.title;
    }).catch(() => { if (live) setHtml("<main class='rh-static'><p>This page could not load. <a href='/'>See the best homes</a>.</p></main>"); });
    return () => { live = false; };
  }, [pathname]);
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  if (!html) return <div className="hunt-wrap"><div className="hunt-skeleton-list" /></div>;
  // Internal links inside the static HTML navigate in-app instead of reloading the page.
  return <div className="hunt-wrap hunt-page rh-staticwrap" onClick={(e) => {
    const a = (e.target as HTMLElement).closest("a"); const href = a?.getAttribute("href") || "";
    if (a && href.startsWith("/") && !a.target && !e.metaKey && !e.ctrlKey) { e.preventDefault(); navigate(href); }
  }} dangerouslySetInnerHTML={{ __html: html }} />;
}
