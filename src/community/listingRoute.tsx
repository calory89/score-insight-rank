// Listing pages in the app: /homes/<country>/... and /cheap-houses/... (14-nov-2026).
//
// These pages are written at build time (seo/listings/build.ts) and that HTML is the page: the app shows it as it
// is instead of drawing its own version, so a visitor sees exactly the homes, order and numbers that Google read,
// with no swap of content when the app takes over. On a first visit the HTML is already in the document; on a
// navigation inside the app it is fetched from the same address.
//
// Language: under /es/ the document already is the Spanish page. A visitor who gets the app in Spanish on an
// address without the prefix gets the Spanish twin fetched before anything is shown (the English HTML stays hidden,
// see the small script at the top of each page), so there is no flash of English.
//
// An address that is no longer a page (a search that fell under its minimum of homes) answers with a small file that
// names where it moved; an address with no file at all falls back to `fallback` (the older app page).
import { type ReactNode, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ES_BOOT, stripEs, withEs } from "@/lib/esPath";
import { isEs } from "@/lib/lang";

type Got = { html?: string; title?: string; desc?: string; spanish?: boolean; moved?: string } | null;
const SEL = "#root [data-rh-static][data-ls]";

const first = (() => {
  try {
    const el = document.querySelector(SEL);
    // data-ls-wait: this is the English page and the visitor reads Spanish; it is replaced, never shown
    return el && !el.hasAttribute("data-ls-wait") ? { path: stripEs(location.pathname), html: el.outerHTML, spanish: ES_BOOT } : null;
  } catch { return null; }
})();

async function get(url: string, spanish: boolean): Promise<Got> {
  const r = await fetch(url, { headers: { accept: "text/html" } });
  if (!r.ok) return null;
  const doc = new DOMParser().parseFromString(await r.text(), "text/html");
  const moved = doc.querySelector("#root [data-rh-moved]")?.getAttribute("data-rh-moved");
  if (moved) return { moved };
  const el = doc.querySelector(SEL);
  if (!el) return null;
  el.removeAttribute("data-ls-wait");
  return { html: el.outerHTML, title: doc.title, desc: doc.querySelector('meta[name="description"]')?.getAttribute("content") || "", spanish };
}

/** The page for this address in the visitor's language: the Spanish twin when they read Spanish and it exists. */
export async function loadListing(pathname: string, spanish: boolean): Promise<Got> {
  if (spanish) { const es = await get(withEs(pathname), true).catch(() => null); if (es) return es; }
  return get(pathname, false).catch(() => null);
}

export function ListingRoute({ fallback }: { fallback: ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const spanish = ES_BOOT || isEs();
  const boot = first && first.path === pathname ? first : null;
  const [page, setPage] = useState<{ path: string; html: string; spanish: boolean } | "none" | null>(boot ? { path: pathname, html: boot.html, spanish: boot.spanish } : null);
  useEffect(() => {
    if (boot) { setPage({ path: pathname, html: boot.html, spanish: boot.spanish }); return; }
    let live = true; setPage(null);
    loadListing(pathname, spanish).then((got) => {
      if (!live) return;
      if (!got) { setPage("none"); return; }
      if (got.moved) { navigate(stripEs(got.moved), { replace: true }); return; }
      if (!got.html) { setPage("none"); return; }
      setPage({ path: pathname, html: got.html, spanish: !!got.spanish });
      if (got.title) document.title = got.title;
      if (got.desc) document.querySelector('meta[name="description"]')?.setAttribute("content", got.desc);
    });
    return () => { live = false; };
  }, [pathname]);
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  if (page === "none") return <>{fallback}</>;
  if (!page || page.path !== pathname) return <div className="hunt-wrap hunt-page"><div className="hunt-skeleton-list" /></div>;
  // Links inside the page move inside the app. Spanish pages link to /es/...; the router adds or drops that prefix itself.
  return <div className="hunt-wrap hunt-page rh-staticwrap" translate={page.spanish ? "no" : undefined} onClick={(e) => {
    const a = (e.target as HTMLElement).closest("a"); const href = a?.getAttribute("href") || "";
    if (a && href.startsWith("/") && !a.target && !e.metaKey && !e.ctrlKey && !e.shiftKey) { e.preventDefault(); navigate(stripEs(href)); }
  }} dangerouslySetInnerHTML={{ __html: page.html }} />;
}

/** /cheap-houses/<search> with no page: say so and offer the list of searches. */
export function ListingMissing() {
  const es = ES_BOOT || isEs();
  return <div className="hunt-wrap hunt-page" translate="no">
    <h1>{es ? "Esta búsqueda no tiene viviendas ahora mismo" : "No homes for this search right now"}</h1>
    <p><a className="hunt-link" href={ES_BOOT ? "/es/cheap-houses" : "/cheap-houses"}>{es ? "Ver todas las búsquedas" : "See all searches"}</a></p>
  </div>;
}
