// First paint of the listing pages (/homes/..., /cheap-houses/...), 15-nov-2026.
//
// The app shows these pages with the very HTML that was prerendered (src/community/listingRoute.tsx), under its own
// header and inside its own gutters. Before this file the HTML had no header and other gutters, so when the app took
// over (about 4 s in on a slow phone) everything moved down 64 px and the text was laid out again 8 px narrower;
// Chrome then counted the opening paragraph as painted at 4.2 s instead of 1.2 s (the page's LCP).
// Now the HTML carries the same header strip as a home page (seo/dealShell.ts) and the app's gutters, so the takeover
// moves nothing: same boxes before and after. Measured at 390, 768 and 1280 px with seo/tech/serve.mjs.
//
// The numbers mirror src/community/ds.css (.hunt-header: 56 px, 64 px from 600 px; .hunt-wrap: gutter 16/20/24/32 px,
// content up to 1176 px; 8 px between the header and the page). If the app's header changes, change them here.
import { LOGO } from "../dealShell";

const CSS = `html{--rh-sg:16px}@media (min-width:375px){html{--rh-sg:20px}}@media (min-width:600px){html{--rh-sg:24px}}@media (min-width:1024px){html{--rh-sg:32px}}`
  + `.rh-sitehead{height:56px;display:flex;align-items:center;padding:0 max(var(--rh-sg),calc((100% - 1176px)/2));border-bottom:1px solid #E4E5E8;background:#fff;box-sizing:border-box}`
  + `.rh-sitehead a{display:flex;align-items:center;gap:9px;min-height:44px;font:800 27px/1.5 "Bricolage Grotesque",Inter,system-ui,sans-serif;letter-spacing:-.04em;color:#111214;text-decoration:none}`
  + `.rh-sitehead svg{display:block;flex:none;width:30px;height:30px}`
  + `@media (min-width:600px){.rh-sitehead{height:64px}.rh-sitehead svg{width:32px;height:32px}}`
  + `.rh-sitehead+.rh-static[data-ls]{max-width:calc(1176px + 2*var(--rh-sg));padding:28px var(--rh-sg) 40px;box-sizing:border-box;text-rendering:optimizeLegibility}`
  // the app breaks lines with "pretty" (src/community/ds.css); the same here, or the opening paragraph is laid out
  // twice with different line ends and counted as painted when the app arrives
  + `.rh-sitehead+.rh-static[data-ls] :is(p,li,blockquote){text-wrap:pretty}`;
export const SITE_HEAD_CSS = `<style id="rh-sitehead-css">${CSS}</style>`;
export const siteHead = (lang: "en" | "es") => `<div class="rh-sitehead" data-rh-sitehead><a href="${lang === "es" ? "/es" : "/"}">${LOGO}RealHunt</a></div>`;

const MAIN = /(<div id="root">)(\s*)(<main\b[^>]*\sdata-rh-keep\b[^>]*\sdata-ls\b[^>]*>)/;
/** The page's HTML with the header strip in front of its listing, or unchanged when it is not a listing page. */
export function withSiteHead(pg: { html: string; lang: "en" | "es" }): string {
  if (!MAIN.test(pg.html) || pg.html.includes("data-rh-sitehead")) return pg.html;
  return pg.html.replace(MAIN, (_m, a: string, _ws: string, main: string) => a + siteHead(pg.lang) + main).replace("</head>", () => SITE_HEAD_CSS + "</head>");
}
