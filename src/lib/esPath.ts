// Spanish URLs (10-nov-2026): https://realhunt.co/es/<same path> is the Spanish version of every page, with its own
// prerendered HTML (seo/es.ts) so search engines and AI crawlers can index it. A visit under /es/ always runs the app
// in Spanish (whatever the country or the saved choice) and every link and navigation stays under /es/. URLs without
// the prefix keep working exactly as before (language picked per visitor, src/lib/lang.ts).
//
// How: the router gets basename "/es" when the page was opened under /es (decided once, at boot), so <Link>, navigate()
// and useLocation() need no change. This file covers what the router does not see: plain <a href="/x"> written by
// hand or inside HTML strings, history.pushState/replaceState calls with an app path, and the canonical / og:url
// that pages set to the English address while they run.
export const ES_BASE = "/es";

/** "/es", "/es/" and "/es/anything" are Spanish URLs; "/essay" or "/estonia" are not. */
export const isEsPath = (p: string) => p === ES_BASE || p.startsWith(ES_BASE + "/");
/** "/es/deal/x" -> "/deal/x", "/es" -> "/". Any other path comes back as it is. */
export const stripEs = (p: string) => (isEsPath(p) ? p.slice(ES_BASE.length) || "/" : p);

// Files and service paths have no Spanish copy: /assets/x.js, /data/rh-static.json, /og-home.jpg, /feed.xml...
const NOT_PAGE = /^\/(assets|data|i18n|cdn-cgi|__sb|__k|api)(\/|$)|\.[a-z0-9]{2,5}$/i;
/** Same-site app path -> its Spanish URL. Leaves alone what is already Spanish, files, and anything not a path. */
export function withEs(href: string): string {
  if (!href || href[0] !== "/" || href[1] === "/") return href;
  const m = /^([^?#]*)([\s\S]*)$/.exec(href)!;
  const path = m[1];
  if (isEsPath(path) || NOT_PAGE.test(path)) return href;
  return ES_BASE + (path === "/" ? "" : path) + m[2] || ES_BASE;
}
/** Absolute URL of this site (https://realhunt.co/x) -> its Spanish URL; other URLs untouched. */
export function withEsUrl(url: string, origin = "https://realhunt.co"): string {
  if (!url.startsWith(origin)) return url;
  const rest = url.slice(origin.length);
  if (rest && rest[0] !== "/") return url; // https://realhunt.company
  const out = withEs(rest || "/");
  return origin + (out === "/" ? "/" : out);
}

/** True when this page load is a Spanish URL. Fixed for the life of the page (a language switch reloads). */
export const ES_BOOT = typeof location !== "undefined" && isEsPath(location.pathname);
export const routerBase = () => (ES_BOOT ? ES_BASE : undefined);
/** The path the app sees (without the prefix), for code that reads window.location instead of the router. */
export const appPath = () => (typeof location === "undefined" ? "/" : stripEs(location.pathname));

/** Where the EN/ES switch goes from a Spanish URL: the same page without the prefix. */
export function switchTarget(href: string, to: "en" | "es"): string | null {
  const u = new URL(href);
  u.searchParams.delete("lang");
  if (!isEsPath(u.pathname)) return null; // not a Spanish URL: the caller keeps today's behaviour
  if (to === "es") return null;
  u.pathname = stripEs(u.pathname);
  return u.toString();
}

function fixLinks(root: ParentNode) {
  const list = root.querySelectorAll ? root.querySelectorAll('a[href^="/"]') : [];
  for (const a of Array.from(list)) fixLink(a as Element);
}
function fixLink(a: Element) {
  const h = a.getAttribute("href");
  if (!h) return;
  const want = withEs(h);
  if (want !== h) a.setAttribute("href", want);
}
function fixHead() {
  const site = "https://realhunt.co";
  const c = document.querySelector('link[rel="canonical"]');
  const ch = c?.getAttribute("href");
  if (c && ch) { const w = withEsUrl(ch, site); if (w !== ch) c.setAttribute("href", w); }
  const o = document.querySelector('meta[property="og:url"]');
  const oh = o?.getAttribute("content");
  if (o && oh) { const w = withEsUrl(oh, site); if (w !== oh) o.setAttribute("content", w); }
}

/** The hreflang links belong to the prerendered page they came with. Paths that have no file of their own are served
 * the front page's HTML (the worker's app shell), which carries the front page's alternates: drop them there, so a
 * page without a Spanish twin never claims one. Runs on every URL, with or without the prefix. */
export function dropStaleAlternates(): void {
  if (typeof document === "undefined") return;
  const norm = (p: string) => (p.length > 1 ? p.replace(/\/+$/, "") : p);
  const here = norm(location.pathname);
  const mine = document.querySelector(`link[rel="alternate"][hreflang="${isEsPath(here) ? "es" : "en"}"]`);
  if (!mine) return;
  let path = "";
  try { path = norm(new URL(mine.getAttribute("href") || "", location.href).pathname); } catch { /* ignore */ }
  if (path !== here) document.querySelectorAll('link[rel="alternate"][hreflang]').forEach((e) => e.remove());
}

let installed = false;
/** Called once from main.tsx. Does nothing on URLs without the /es prefix. */
export function installEsUrls(): void {
  if (!ES_BOOT || installed || typeof document === "undefined") return;
  installed = true;
  // 1. history calls made by hand with an app path ("/top/bali?x=1") keep the prefix. The router's own calls
  //    already carry it, so they pass through unchanged.
  for (const k of ["pushState", "replaceState"] as const) {
    const orig = history[k].bind(history);
    history[k] = (state: unknown, unused: string, url?: string | URL | null) => {
      let u = url;
      try {
        if (typeof u === "string" && u[0] === "/") u = withEs(u);
        else if (u != null) { const x = new URL(String(u), location.href); if (x.origin === location.origin) u = withEs(x.pathname + x.search + x.hash); }
      } catch { /* leave it as given */ }
      return orig(state, unused, u);
    };
  }
  // 2. hand-written links and the canonical. The hreflang links of the prerendered page describe that page only:
  //    after the first in-app navigation they are removed (crawlers load every URL fresh and never see this).
  const first = location.pathname;
  const head = () => {
    fixHead();
    if (location.pathname !== first) document.querySelectorAll('link[rel="alternate"][hreflang]').forEach((e) => e.remove());
  };
  const start = () => {
    fixLinks(document.body); head();
    new MutationObserver((list) => {
      for (const r of list) {
        if (r.type === "attributes") { const el = r.target as Element; if (el.tagName === "A") fixLink(el); }
        else r.addedNodes.forEach((n) => { if (n.nodeType === 1) { const el = n as Element; if (el.tagName === "A") fixLink(el); fixLinks(el); } });
      }
    }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["href"] });
    new MutationObserver(head).observe(document.head, { subtree: true, childList: true, attributes: true, attributeFilter: ["href", "content"] });
  };
  if (document.body) start(); else addEventListener("DOMContentLoaded", start);
}
