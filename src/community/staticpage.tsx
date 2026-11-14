// Pages that only exist as prerendered HTML (seo/prerender.ts): /new, /research/prices, /sitemap.
// On a first visit the HTML is already in the page (marked data-rh-keep); on in-app navigation it is fetched
// from the same URL. Either way the content shown is exactly what search engines read.
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ES_BOOT, stripEs, withEs } from "@/lib/esPath";

const first = (() => {
  try { const el = document.querySelector("#root [data-rh-keep][data-rh-static]"); return el ? { path: stripEs(location.pathname), html: el.outerHTML } : null; } catch { return null; }
})();

export function StaticPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [html, setHtml] = useState<string | null>(first && first.path === pathname ? first.html : null);
  useEffect(() => {
    if (first && first.path === pathname) return;
    let live = true; setHtml(null);
    const fail = "<main class='rh-static'><p>This page could not load. <a href='/'>See the best homes</a>.</p></main>";
    const get = (u: string) => fetch(u, { headers: { accept: "text/html" } }).then((r) => r.text()).then((t) => { const doc = new DOMParser().parseFromString(t, "text/html"); return { doc, el: doc.querySelector("#root [data-rh-static]") }; });
    // Under /es/ the Spanish copy of the page is used; a page that has none falls back to the English HTML.
    (ES_BOOT ? get(withEs(pathname)).then((x) => (x.el ? x : get(pathname))) : get(pathname)).then(({ doc, el }) => {
      if (live) setHtml(el ? el.outerHTML : fail);
      if (live && el) document.title = doc.title;
    }).catch(() => { if (live) setHtml(fail); });
    return () => { live = false; };
  }, [pathname]);
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  // Pages with copy buttons and pickers (seo/assets*.ts) bring a small script; HTML set by React does not run it.
  useEffect(() => { if (html && html.includes("data-rhx-js") && !(window as any).__rhAssets && !document.getElementById("rh-assets-js")) { const s = document.createElement("script"); s.id = "rh-assets-js"; s.src = "/rh-assets.js"; document.head.appendChild(s); } }, [html]);
  if (!html) return <div className="hunt-wrap"><div className="hunt-skeleton-list" /></div>;
  // Internal links inside the static HTML navigate in-app instead of reloading the page.
  return <div className="hunt-wrap hunt-page rh-staticwrap" onClick={(e) => {
    const a = (e.target as HTMLElement).closest("a"); const href = a?.getAttribute("href") || "";
    // files (a CSV, a feed, an image) and downloads are left to the browser
    if (a && href.startsWith("/") && !a.target && !e.metaKey && !e.ctrlKey && !a.hasAttribute("download") && !/\.[a-z0-9]{2,5}$/i.test(href.split(/[?#]/)[0])) { e.preventDefault(); navigate(ES_BOOT ? stripEs(href) : href); }
  }} dangerouslySetInnerHTML={{ __html: html }} />;
}
