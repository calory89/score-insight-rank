// The HTML document of a page in German, Russian, French, Dutch or Polish (15-nov-2026).
//
// These pages are plain static pages: the React app has no strings for these languages, so it must never take them
// over. They do not load the app bundle at all. Header, footer, language switcher and every link work without
// JavaScript; the only script reads the saved light/dark choice of the app (localStorage rh_theme) so the page does
// not flash white for a visitor who uses the site in dark mode.
import type { Ui } from "./strings";

export const SITE = "https://realhunt.co";
const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export type Alt = { lang: string; href: string };
export type Doc = {
  lang: string; ui: Ui; path: string; title: string; desc: string; image: string;
  /** Every language version of this page (this one included) and x-default. */
  alts: Alt[];
  /** Language switcher: [language code, name in that language, path]. */
  versions: [string, string, string][];
  main: string; ld: object[]; noindex?: boolean;
};

// Design tokens of the app (src/community/ds.css) for the values the listing styles read, light and dark.
const CSS = `
html{background:#fff;-webkit-text-size-adjust:100%}body{margin:0}
.hunt{--c-bg:#FFFFFF;--c-surface-3:#ECEDEF;--c-fill:#F4F5F6;--c-fill-hover:#ECEDEF;--c-ink:#111214;--c-ink-2:#3D4047;--c-ink-3:#62666E;--c-line:#E4E5E8;--c-accent:#D4420C;--c-accent-ink:#B8370A;--c-warn-soft:#FFF6E5;
--f-display:"Bricolage Grotesque",Inter,system-ui,sans-serif;--f-body:Inter,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
background:var(--c-bg);color:var(--c-ink);font-family:var(--f-body);min-height:100vh;text-rendering:optimizeLegibility}
.hunt.is-dark{--c-bg:#0C0D0E;--c-surface-3:#26282B;--c-fill:#1D1E21;--c-fill-hover:#26282B;--c-ink:#ECEDEE;--c-ink-2:#CDCFD3;--c-ink-3:#A2A6AD;--c-line:#2A2C30;--c-accent:#FF8F62;--c-accent-ink:#FF8F62;--c-warn-soft:#2B1F10}
.rh-static{max-width:760px;margin:0 auto;padding:24px 16px;font:16px/1.55 var(--f-body)}
.rh-static ul,.rh-static ol{padding-left:20px}.rh-static li{margin:4px 0}
.lx-skip{position:absolute;left:-9999px}.lx-skip:focus{left:12px;top:12px;z-index:9;background:var(--c-bg);color:var(--c-ink);padding:10px 14px;border-radius:10px}
.lx-top{position:sticky;top:0;z-index:5;background:var(--c-bg);border-bottom:1px solid var(--c-line)}
.lx-bar{max-width:1176px;margin:0 auto;padding:0 16px;min-height:56px;display:flex;align-items:center;gap:6px 14px;flex-wrap:wrap}
.lx-logo{display:inline-flex;align-items:center;gap:8px;min-height:44px;font:800 19px/1 var(--f-display);letter-spacing:-.02em;color:var(--c-ink);text-decoration:none;margin-right:auto}
.lx-logo img{border-radius:7px}
.lx-nav{display:flex;gap:2px;align-items:center}
.lx-nav a,.lx-lang summary{display:inline-flex;align-items:center;min-height:44px;padding:0 10px;border-radius:10px;font-size:14.5px;font-weight:600;color:var(--c-ink-2);text-decoration:none;cursor:pointer;white-space:nowrap}
.lx-nav a:hover,.lx-lang summary:hover{background:var(--c-fill)}
.lx-lang{position:relative}.lx-lang summary{list-style:none;border:1px solid var(--c-line);gap:6px}.lx-lang summary::-webkit-details-marker{display:none}
.lx-lang summary::after{content:"";width:7px;height:7px;border-right:2px solid currentColor;border-bottom:2px solid currentColor;transform:rotate(45deg) translateY(-2px)}
.lx-lang ul{position:absolute;right:0;top:48px;margin:0;padding:6px;list-style:none;min-width:190px;background:var(--c-bg);border:1px solid var(--c-line);border-radius:14px;box-shadow:0 8px 24px rgba(0,0,0,.14)}
.lx-lang li{margin:0}.lx-lang li a{display:flex;align-items:center;min-height:44px;padding:0 12px;border-radius:10px;color:var(--c-ink);text-decoration:none;font-size:15px}
.lx-lang li a:hover{background:var(--c-fill)}.lx-lang li a[aria-current]{font-weight:700;color:var(--c-accent-ink)}
.lx-notice{max-width:1176px;margin:0 auto;padding:10px 16px 0;font-size:13.5px;line-height:1.5;color:var(--c-ink-3)}
.lx-notice p{margin:0;max-width:86ch}
#main>.rh-static{padding-top:22px}
.rh-static[data-ls] .lx-en{font-size:13.5px;color:var(--c-ink-3);margin:-6px 0 14px}
.rh-static[data-ls] .lx-m{display:inline-block;font:700 10px/1 var(--f-body);letter-spacing:.04em;padding:2px 4px;margin-left:4px;border:1px solid currentColor;border-radius:4px;vertical-align:1px;opacity:.75;text-decoration:none}
.rh-static[data-ls] a:focus-visible,.lx-top a:focus-visible,.lx-lang summary:focus-visible,.lx-foot a:focus-visible{outline:2px solid var(--c-accent);outline-offset:2px;border-radius:6px}
.lx-foot{border-top:1px solid var(--c-line);margin-top:8px}
.lx-foot div{max-width:1176px;margin:0 auto;padding:22px 16px 40px;font-size:14px;line-height:1.6;color:var(--c-ink-3)}
.lx-foot p{margin:0 0 10px;max-width:86ch}.lx-foot a{color:var(--c-ink-2);display:inline-block;padding:6px 0;margin-right:16px}
@media (max-width:560px){.lx-nav{display:none}.lx-logo{font-size:18px}.lx-bar{flex-wrap:nowrap}}
`.replace(/\n/g, "");

const THEME = `<script>try{var t=localStorage.getItem("rh_theme");if(t?t==="dark":matchMedia("(prefers-color-scheme: dark)").matches){document.getElementById("lx").className+=" is-dark";document.documentElement.style.background="#0C0D0E"}}catch(e){}</script>`;

/** One complete document. Nothing of the app is loaded. */
export function renderDoc(d: Doc): string {
  const url = SITE + d.path;
  const ui = d.ui;
  const head = [
    `<meta charset="UTF-8" />`, `<meta name="viewport" content="width=device-width, initial-scale=1.0" />`,
    `<link rel="icon" href="/favicon.png" type="image/png" sizes="512x512" />`, `<link rel="icon" href="/favicon-32.png" type="image/png" sizes="32x32" />`, `<link rel="apple-touch-icon" href="/apple-touch-icon.png" />`,
    `<meta name="theme-color" content="#FFFFFF" />`,
    `<title>${esc(d.title)}</title>`, `<meta name="description" content="${esc(d.desc)}" />`,
    `<meta name="robots" content="${d.noindex ? "noindex, follow" : "index, follow"}" />`,
    `<link rel="canonical" href="${esc(url)}" />`,
    ...(d.noindex ? [] : d.alts.map((a) => `<link rel="alternate" hreflang="${esc(a.lang)}" href="${esc(a.href)}" />`)),
    `<meta property="og:locale" content="${esc(ui.locale)}" />`, `<meta property="og:type" content="website" />`, `<meta property="og:site_name" content="RealHunt" />`,
    `<meta property="og:title" content="${esc(d.title)}" />`, `<meta property="og:description" content="${esc(d.desc)}" />`, `<meta property="og:image" content="${esc(d.image)}" />`, `<meta property="og:url" content="${esc(url)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`, `<meta name="twitter:title" content="${esc(d.title)}" />`, `<meta name="twitter:description" content="${esc(d.desc)}" />`, `<meta name="twitter:image" content="${esc(d.image)}" />`,
    ...d.ld.map((x) => `<script type="application/ld+json">${JSON.stringify(x).replace(/</g, "\\u003c")}</script>`),
    `<style>${CSS}</style>`,
  ].join("");
  const langs = `<details class="lx-lang"><summary aria-label="${esc(ui.langLabel)}">${esc(ui.name)}</summary><ul>`
    + d.versions.map(([l, name, p]) => `<li><a href="${esc(p)}" hreflang="${esc(l)}" lang="${esc(l)}"${l === d.lang ? ' aria-current="page"' : ""}>${esc(name)}</a></li>`).join("") + `</ul></details>`;
  const header = `<header class="lx-top"><div class="lx-bar"><a class="lx-logo" href="/${d.lang}"><img src="/favicon-32.png" alt="" width="28" height="28" />RealHunt</a>`
    + `<nav class="lx-nav" aria-label="${esc(ui.navLabel)}"><a href="/${d.lang}">${esc(ui.navAll)}</a><a class="lx-opt" href="/${d.lang}#countries">${esc(ui.navCountries)}</a></nav>${langs}</div></header>`;
  const notice = ui.notice ? `<div class="lx-notice"><p>${esc(ui.notice)}</p></div>` : "";
  const footer = `<footer class="lx-foot"><div><p>${esc(ui.footAbout)}</p><p>${esc(ui.footEnglish)}</p>`
    + `<p><a href="/${d.lang}">${esc(ui.navAll)}</a>${d.versions.filter(([l]) => l !== d.lang).map(([l, name, p]) => `<a href="${esc(p)}" hreflang="${esc(l)}" lang="${esc(l)}">${esc(name)}</a>`).join("")}</p>`
    + `<p>${[["/method", ui.footMethod], ["/about", ui.footWho], ["/contact", ui.footContact], ["/legal/privacy", ui.footPrivacy], ["/legal/terms", ui.footTerms]].map(([p, t]) => `<a href="${p}" hreflang="en">${esc(t)} <span class="lx-m" title="${esc(ui.enTitle)}">EN</span></a>`).join("")}</p></div></footer>`;
  return `<!doctype html><html lang="${esc(d.lang)}"><head>${head}</head><body><div class="hunt" id="lx">${THEME}<a class="lx-skip" href="#main">${esc(ui.skip)}</a>${header}${notice}<div id="main">${d.main}</div>${footer}</div></body></html>`;
}

/** Marks every link that leaves the language: <a href="/guide/spain">Text</a> -> ... <span class="lx-m">EN</span>.
 * Links to homes inside the cards and the table are covered by the sentence under their heading instead. */
export function markEnglish(html: string, lang: string, enTitle: string): string {
  const src = html.replace(/<tbody>[\s\S]*?<\/tbody>/g, (tb) => tb.replace(/<a href="/g, '<a data-lx href="'));
  return src.replace(/<a\b([^>]*?)\shref="(\/[^"]*)"([^>]*)>([\s\S]*?)<\/a>/g, (m, a: string, h: string, b: string, inner: string) => {
    if (h === `/${lang}` || h.startsWith(`/${lang}/`) || h.startsWith(`/${lang}#`)) return m;
    if (/data-lx/.test(a)) return `<a href="${h}"${b} hreflang="en">${inner}</a>`;
    if (/class="ls-card"/.test(a + b)) return `<a${a} href="${h}"${b} hreflang="en">${inner}</a>`;
    return `<a${a} href="${h}"${b} hreflang="en">${inner} <span class="lx-m" title="${esc(enTitle)}">EN</span></a>`;
  });
}
