// First paint of a home page (10-nov-2026, speed on slow phones).
//
// Before: the HTML showed a plain article, React wiped it, the screen stayed blank while about 450 KB of scripts and
// the snapshot loaded, and only then the home appeared; the main photo (the largest element, LCP) was painted
// 6 to 7 s in on a slow phone. Now the HTML itself draws the top of the home page exactly where the app will draw
// it: header, main photo, title and price. The app keeps it on screen while it boots (data-rh-keep, see
// SuspenseFallback in src/App.tsx) and then renders the real page from the row embedded here
// (window.__rhHome, read by src/community/bootrow.ts), so nothing waits for the 200 KB snapshot.
//
// The CSS below is a hand copy of the few rules that place those elements in the app (src/community/ds.css,
// community.css, minimal.css: .hunt-header, .hunt-brand, .hv-detail, .hv-gallery, .hv-mosaic, .hv-carousel,
// .hunt-eyebrow, .hunt-detail h1, .hunt-price). If the app's top of the home page changes, change it here too;
// a mismatch only means a small jump when the app takes over and a later LCP, nothing breaks.
// Check by comparing a screenshot with JavaScript off and one with it on, at 390, 768 and 1280 px.
//
// Language: the texts here are the photo, the home's title, its price and "RealHunt", plus the country/region
// line. Spanish visitors get the Spanish title and the price in Spanish format, and the country line stays hidden until the
// app shows it translated; the English article below the shell is not shown to them at all.

const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Same rule as cleanTitle() in src/community/Community.tsx: the app's <h1>. */
export function shellTitle(d: { title?: string | null; location_name?: string | null; country?: string | null; sqm?: number | null }): string {
  let t = (d.title || "").replace(/^\s*€\s?[\d.,]+\s*(k\b)?\s*[·\-–:|]\s*/i, "").trim();
  if (!t || /^property\s*[-–]\s*\w+$/i.test(t) || /^property$/i.test(t)) {
    const where = d.location_name || d.country || "somewhere worth a look";
    t = d.sqm ? `${d.sqm} m² home in ${where}` : `Home in ${where}`;
  }
  return t;
}

/** Same as money() in src/community/api.ts. */
/** The same price as the app shows it to Spanish visitors (src/lib/lang.ts turns "€100,000" into "100.000 €"). */
export const shellMoneyEs = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "\u00A0€";
export const shellMoney = (n: number) => new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

// Same list as `categories` in src/community/api.ts (that file imports the Supabase client, so it cannot be imported here).
const CATEGORY: Record<string, string> = { beach: "Beach & coast", village: "Village homes", city: "City living", land: "Land", renovation: "Renovation", new_build: "New builds", other: "Other discoveries" };

const INK = "#111214", INK_D = "#ECEDEE", BG_D = "#0C0D0E";
const CSS = [
  `html.rh-dark,html.rh-dark body{background:${BG_D}}`,
  `html{--rh-sg:16px}`,
  `.rh-shell{font:400 15px/1.5 Inter,system-ui,-apple-system,"Segoe UI",sans-serif;color:${INK};background:#fff;-webkit-text-size-adjust:100%}`,
  `.rh-shell *{box-sizing:border-box}`,
  `.rh-sh-head{height:56px;display:flex;align-items:center;padding:0 max(var(--rh-sg),calc((100% - 1176px)/2));border-bottom:1px solid #E4E5E8}`,
  `.rh-sh-brand{display:flex;align-items:center;gap:9px;min-height:44px;font:800 27px/1.5 "Bricolage Grotesque",Inter,system-ui,sans-serif;letter-spacing:-.04em;color:inherit;text-decoration:none}`,
  `.rh-sh-brand svg{display:block;flex:none;width:30px;height:30px}`,
  `.rh-sh-wrap{max-width:calc(1176px + 2*var(--rh-sg));margin:0 auto;padding:0 var(--rh-sg)}`,
  `.rh-sh-back{display:none}`,
  `.rh-sh-gal{position:relative;overflow:hidden;width:100vw;margin-left:calc(50% - 50vw);height:min(75vw,52vh);max-height:460px}`,
  // each photo sits in a <b> as it sits in a <button> in the app, so tall photos are cropped the same way
  `.rh-sh-gal>b{display:none}.rh-sh-gal img{display:block;width:100%;height:100%;object-fit:cover}`,
  `@media (max-width:700px){.rh-sh-gal>b:first-child{display:block;height:100%}}`,
  `.rh-sh-count{position:absolute;right:14px;bottom:14px;background:rgba(0,0,0,.55);color:#fff;font-size:12.5px;font-weight:650;padding:4px 10px;border-radius:99px}`,
  `.rh-sh-text{max-width:780px;margin-top:16px;padding-top:4px}`,
  `.rh-sh-eye{display:flex;align-items:center;gap:6px;min-height:32px;font-size:13.5px;font-weight:600;line-height:1.35;color:#62666E}`,
  `.rh-sh-eye a{display:inline-flex;align-items:center;min-height:32px;color:#B8370A;text-decoration:none}`,
  `.rh-shell h1{margin:8px 0 12px;font:800 clamp(26px,3vw,36px)/1.12 "Bricolage Grotesque",Inter,system-ui,sans-serif;letter-spacing:-.03em;text-wrap:balance;color:inherit}`,
  `.rh-sh-price{margin:0 0 8px;font:800 29px/1.5 "Bricolage Grotesque",Inter,system-ui,sans-serif;letter-spacing:-.02em}`,
  `@media (min-width:375px){html{--rh-sg:20px}}`,
  `@media (min-width:600px){html{--rh-sg:24px}.rh-sh-head{height:64px}.rh-sh-brand svg{width:32px;height:32px}}`,
  `@media (min-width:701px){.rh-sh-back{display:block;height:60px}`
    + `.rh-sh-gal{width:auto;margin-left:0;max-height:none;height:min(56vh,520px);border-radius:22px;display:grid;gap:6px;grid-template-columns:2fr 1fr 1fr;grid-template-rows:1fr 1fr}`
    + `.rh-sh-gal>b{display:block}.rh-sh-gal>b:first-child{grid-row:1/3}`
    + `.rh-sh-gal.n1{grid-template-columns:1fr}.rh-sh-gal.n1>b:first-child{grid-row:auto}`
    + `.rh-sh-gal.n2{grid-template-columns:2fr 1fr;grid-template-rows:1fr}.rh-sh-gal.n2>b:first-child{grid-row:auto}`
    + `.rh-sh-gal.n3{grid-template-columns:2fr 1fr}.rh-sh-gal.n4>b:nth-child(4){grid-column:2/4}`
    + `.rh-sh-count{display:none}.rh-sh-text{margin-top:22px}}`,
  `@media (min-width:1024px){html{--rh-sg:32px}}`,
  // dark (same test as useTheme in src/community/v5.tsx; the class is set by the script below before first paint)
  `html.rh-dark .rh-shell{background:${BG_D};color:${INK_D}}html.rh-dark .rh-sh-head{border-bottom-color:#292B2E}`,
  `html.rh-dark .rh-sh-eye,html.rh-dark .rh-sh-eye a{color:#A2A6AD}`,
  `html.rh-dark .rh-static{color:${INK_D}}html.rh-dark .rh-static nav{color:#A2A6AD}`,
  // the article under the shell lines up with it
  `.rh-shell~.rh-static{max-width:calc(1176px + 2*var(--rh-sg));padding:4px var(--rh-sg) 24px}.rh-shell~.rh-static>article{max-width:780px}`,
  // Spanish visitors: never the English article or the English country line; the shell shows while the dictionary loads
  `html[data-lang="es"] .rh-shell~.rh-static:not([lang="es"]){display:none}html[data-lang="es"] .rh-sh-eye{visibility:hidden}`,
  `html.rh-i18n-wait #root .rh-shell{visibility:visible}`,
].join("");

const DARK_JS = `(function(){try{var v=localStorage.getItem("rh_theme"),d=v?v==="dark":matchMedia("(prefers-color-scheme: dark)").matches;if(d)document.documentElement.classList.add("rh-dark")}catch(e){}})()`;

/** Goes in the <head> of every home page: the shell's styles and the dark-mode class. */
export const DEAL_SHELL_HEAD = `<style>${CSS}</style><script>${DARK_JS}</script>`;

const LOGO = `<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="16" fill="#FF5A1F"/><path d="M32 12 L53 31 Q55 33 52.5 33 L49 33 L49 50 Q49 53 46 53 L18 53 Q15 53 15 50 L15 33 L11.5 33 Q9 33 11 31 Z" fill="#fff"/><path d="M32 24 L41 34 L35.5 34 L35.5 45 L28.5 45 L28.5 34 L23 34 Z" fill="#FF5A1F"/></svg>`;

const json = (v: unknown) => JSON.stringify(v).replace(/</g, "\\u003c").replace(/[\u2028\u2029]/g, (c) => "\\u" + c.charCodeAt(0).toString(16));

export type ShellInput = {
  /** the snapshot row, as in public/data/rh-static.json (with title_es and friends when there are any) */
  row: Record<string, any>;
  /** photo URLs exactly as the app will request them (toMedia applied) */
  photos: string[];
  /** the small card copy of the main photo (src/lib/thumbs.ts), painted first under it; "" when there is none */
  lowRes?: string;
  /** placeholder colour behind the photo (src/data/card-colors.json), as cardColor() in the app */
  color?: string;
  /** country and region links of the app's line above the title: [label, href] */
  crumbs: [string, string][];
  /** "es" for the Spanish copy of the page (/es/deal/<slug>): the Spanish title is written in the HTML */
  lang?: "es";
};

/** The shell and the embedded row. Put it first inside #root, before the article. */
export function dealShell({ row, photos, color, crumbs, lang, lowRes }: ShellInput): string {
  const title = shellTitle(row);
  const esTitle = title === String(row.title || "").trim() && typeof row.title_es === "string" && row.title_es.trim() ? row.title_es.trim() : "";
  const n = Math.min(photos.length, 5);
  const cat = CATEGORY[row.category] || row.category || "";
  const eye = lang === "es" ? "" : [...crumbs.map(([l, h]) => `<a${h ? ` href="${esc(h)}"` : ""}>${esc(l)}</a>`), cat ? esc(cat) : ""].filter(Boolean).join(" · ");
  const imgs = photos.slice(0, 5).map((u, i) => i === 0
    ? `<b${lowRes ? ` style="background:url(&quot;${esc(lowRes)}&quot;) center/cover no-repeat"` : ""}><img src="${esc(u)}" alt="${esc(lang === "es" && esTitle ? esTitle : title)}" fetchpriority="high" decoding="async"></b>`
    : `<b><img src="${esc(u)}" alt="" loading="lazy" decoding="async"></b>`).join("");
  // The row for the app, and the Spanish title for Spanish visitors (the title is the only text that needs it).
  const js = `window.__rhHome=${json(row)};(function(){try{if(document.documentElement.getAttribute("data-lang")!=="es")return;var h=document.querySelector(".rh-shell h1");if(!h)return;var t=${json(esTitle)};if(t)h.textContent=t;else h.style.visibility="hidden";var p=document.querySelector(".rh-sh-price");if(p)p.textContent=${json(row.price_eur != null ? shellMoneyEs(row.price_eur) : "")}}catch(e){}})()`;
  return `<div class="rh-shell" data-rh-keep data-rh-shell="${esc(row.slug)}">`
    + `<div class="rh-sh-head"><a class="rh-sh-brand" href="/">${LOGO}RealHunt</a></div>`
    + `<div class="rh-sh-wrap"><div class="rh-sh-back"></div>`
    + (n ? `<div class="rh-sh-gal n${n}" style="background-color:${esc(color || "#DFE0E2")}">${imgs}${photos.length > 1 ? `<span class="rh-sh-count">1 / ${photos.length}</span>` : ""}</div>` : "")
    + `<div class="rh-sh-text"><div class="rh-sh-eye">${eye}</div><h1>${esc(lang === "es" && esTitle ? esTitle : title)}</h1>`
    + (row.price_eur != null ? `<div class="rh-sh-price">${esc(lang === "es" ? shellMoneyEs(row.price_eur) : shellMoney(row.price_eur))}</div>` : "")
    + `</div></div></div><script>${js}</script>`;
}
