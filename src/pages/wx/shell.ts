// Static first paint for /weather, written into the prerendered HTML by vite.config.ts. It is the same
// markup and styles the page renders while its data loads, in both languages (the inline language script
// in index.html picks one before the first paint), so opening the link never shows a different page first.
import { WX_CSS } from "./css";
import { WX_TEXT, FILTER_KEYS, REGION_KEYS, SORT_KEYS } from "./text";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const both = (f: (t: typeof WX_TEXT.en) => string) => `<span class="wx-en">${esc(f(WX_TEXT.en))}</span><span class="wx-es">${esc(f(WX_TEXT.es))}</span>`;

export function weatherShell(): string {
  const E = WX_TEXT.en;
  return `<link rel="preload" href="/weather/places.json" as="fetch" crossorigin="anonymous"><style>${WX_CSS}</style>`
    + `<main class="wx wx-shell" data-rh-keep translate="no" aria-busy="true">`
    + `<header class="wx-hero"><nav class="wx-crumb"><a href="/">RealHunt</a> › ${both((t) => t.crumb)}</nav>`
    + `<h1>${both((t) => t.h1)}</h1><p>${both((t) => t.lead("295"))}</p>`
    + `<div class="wx-search"><input readonly class="wx-en" aria-label="${esc(E.search)}" placeholder="${esc(E.search)}"><input readonly class="wx-es" aria-label="${esc(WX_TEXT.es.search)}" placeholder="${esc(WX_TEXT.es.search)}">`
    + `<div class="wx-seg"><button class="on">▦ ${both((t) => t.places)}</button><button>🗺 ${both((t) => t.map)}</button></div></div></header>`
    + `<div class="wx-tools"><div class="wx-chips">${FILTER_KEYS.map((k) => `<button class="wx-chip${k === "sunny" ? " on" : ""}">${both((t) => t.filters[k][0])}<small></small></button>`).join("")}</div>`
    + `<div class="wx-row2"><div class="wx-regions">${REGION_KEYS.map((k) => `<button class="${k === "all" ? "on" : ""}">${both((t) => t.regions[k])}</button>`).join("")}</div>`
    + `<label class="wx-sort">${both((t) => t.sort)} <select disabled class="wx-en"><option>${esc(E.sorts[SORT_KEYS[0]])}</option></select><select disabled class="wx-es"><option>${esc(WX_TEXT.es.sorts[SORT_KEYS[0]])}</option></select></label></div>`
    + `<div class="wx-count loading">${both((t) => t.loading)}</div></div>`
    + `<section class="wx-grid">${'<div class="wx-card skel"></div>'.repeat(8)}</section></main>`;
}
