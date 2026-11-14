// Shared pieces of the pages built to be quoted and linked (14-nov-2026): the data hub (seo/assets.ts) and the
// press, method, editorial, embed and for-AI pages (seo/assetsTrust.ts). Every page is written twice, in English and
// in Spanish, by hand (no machine pass), so the Spanish reads as written by a native speaker.
import { esPlace } from "../src/lib/lang";
import { the as theEn, theEs } from "../src/community/seo2data";

export const SITE = "https://realhunt.co";
export const PRESS_EMAIL = "carlos@equinoxinvestmentgroup.com";
export const LICENSE = "https://creativecommons.org/licenses/by/4.0/";
export type Lang = "en" | "es";
export type PageOpts = { noindex?: boolean; lastmod?: string | null; group?: "pages" | "homes" | "places" | "content" | "top" | "es"; head?: string; lang?: "es"; alt?: { en: string; es: string } };
export type PageFn = (url: string, title: string, desc: string, image: string, body?: string, ld?: object[], o?: PageOpts) => void;

export const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Everything a page needs to say the same thing in either language. */
export function kit(lang: Lang) {
  const es = lang === "es";
  const t = (en: string, sp: string) => (es ? sp : en);
  const num = (n: number) => { const s = String(Math.round(n)); return s.replace(/\B(?=(\d{3})+(?!\d))/g, es ? "." : ","); };
  const dec = (n: number) => { const s = String(Math.round(n * 100) / 100); return es ? s.replace(".", ",") : s; };
  const eur = (n: number) => (es ? `${num(n)} €` : `€${num(n)}`);
  const pct = (lo: number, hi: number) => (lo === hi ? `${dec(lo)}%` : `${dec(lo)}–${dec(hi)}%`);
  const country = (name: string) => (es ? esPlace(name) : name);
  const inThe = (name: string) => (es ? theEs(esPlace(name)) : theEn(name));
  const list = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} ${es ? (/^(i|hi)/i.test(xs[xs.length - 1]) ? "e" : "y") : "and"} ${xs[xs.length - 1]}`);
  const date = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); const M = es ? ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"] : ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]; return es ? `${d} de ${M[m - 1]} de ${y}` : `${d} ${M[m - 1]} ${y}`; };
  const url = (p: string) => SITE + (es ? "/es" : "") + p;
  return { lang, es, t, num, dec, eur, pct, country, inThe, list, date, url };
}
export type Kit = ReturnType<typeof kit>;

// One small stylesheet, inside every page, so these pages need nothing from the app bundle and look the same before
// and after the app loads. Colours come from the design tokens (src/community/ds.css) with the light values as fallback.
export const CSS = `<style>
.rhx{max-width:900px;--rhx-bar:#2F6DA8}.hunt .rhx{color:var(--c-ink,#111214)}.rhx h1,.rhx h2,.rhx h3{color:inherit}.hunt.is-dark .rhx{--rhx-bar:#7FB0E0}
.rhx h1{text-wrap:balance}.rhx h2{margin-top:32px}.rhx p,.rhx li{line-height:1.6}
.rhx-eyebrow{font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--c-ink-3,#62666E);margin:0 0 6px}
.rhx-answer{border:1px solid var(--c-line,#E4E5E8);border-left:4px solid var(--c-ink,#111214);border-radius:12px;padding:14px 16px;margin:16px 0;background:var(--c-surface-2,#F4F5F6);font-size:17px;line-height:1.5}
.rhx-answer p{margin:0}.rhx-answer p+p{margin-top:8px;font-size:14px;color:var(--c-ink-2,#3D4047)}
.rhx-meta{font-size:13.5px;color:var(--c-ink-3,#62666E)}
.rhx-fig{margin:24px 0;padding:16px;border:1px solid var(--c-line,#E4E5E8);border-radius:16px;background:var(--c-surface,#fff)}
.rhx-fig figcaption{font-weight:700;font-size:16px;margin-bottom:2px}.rhx-fig figcaption small{display:block;font-weight:400;font-size:13px;color:var(--c-ink-3,#62666E);margin:2px 0 14px}
.rhx-bars{list-style:none!important;padding:0!important;margin:0;display:grid;gap:7px}
.rhx-bars li{display:grid;grid-template-columns:minmax(96px,170px) 1fr minmax(58px,auto);gap:10px;align-items:center;margin:0!important;font-size:14px;line-height:1.2}
.rhx-bars .l small{display:block;color:var(--c-ink-3,#62666E);font-size:12px}
.rhx-bars .t{height:18px;border-left:1px solid var(--c-line-2,#D3D5D9)}
.rhx-bars i{display:block;height:100%;min-width:2px;border-radius:0 4px 4px 0;background:var(--rhx-bar)}
.rhx-bars .weak i{background:repeating-linear-gradient(135deg,var(--rhx-bar) 0 3px,transparent 3px 7px);box-shadow:inset 0 0 0 1px var(--rhx-bar)}
.rhx-bars .v{font-variant-numeric:tabular-nums;font-weight:600;text-align:right;white-space:nowrap}
.rhx-key{font-size:12.5px;color:var(--c-ink-3,#62666E);margin:12px 0 0}.rhx-key b{display:inline-block;width:22px;height:10px;vertical-align:-1px;margin-right:6px;border-radius:0 3px 3px 0;background:repeating-linear-gradient(135deg,var(--rhx-bar) 0 3px,transparent 3px 7px);box-shadow:inset 0 0 0 1px var(--rhx-bar)}
.rhx-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;border:1px solid var(--c-line,#E4E5E8);border-radius:12px;margin:12px 0}
.rhx-scroll table{border-collapse:collapse;width:100%;font-size:14px;font-variant-numeric:tabular-nums}
.rhx-scroll th,.rhx-scroll td{text-align:left;padding:9px 12px;border-bottom:1px solid var(--c-line,#E4E5E8);white-space:nowrap;vertical-align:top}
.rhx-scroll tr:last-child td{border-bottom:0}
.rhx-scroll thead th{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--c-ink-3,#62666E);background:var(--c-surface-2,#F4F5F6)}
.rhx-scroll th:first-child,.rhx-scroll td:first-child{position:sticky;left:0;background:var(--c-bg,#fff);font-weight:600}
.rhx-scroll thead th:first-child{background:var(--c-surface-2,#F4F5F6)}
.rhx-scroll tbody th{font-size:14px;text-transform:none;letter-spacing:0;color:var(--c-ink,#111214)}.rhx-scroll tbody th small{font-weight:400}
.rhx-scroll td.w{white-space:normal;min-width:320px;max-width:460px;line-height:1.45}
.rhx-fit table{table-layout:auto}.rhx-fit th,.rhx-fit td{white-space:normal;overflow-wrap:break-word}.rhx-fit tbody th{min-width:84px}.rhx-fit td a{word-break:break-all}.rhx-fit td.w{min-width:0;max-width:none;width:58%}.rhx-fit th:first-child,.rhx-fit td:first-child{position:static}.rhx-fit td.n,.rhx-fit th.n{white-space:nowrap}
.rhx-rules{list-style:none!important;padding:0!important;margin:12px 0;display:grid;gap:10px}.rhx-rules li{margin:0!important;border:1px solid var(--c-line,#E4E5E8);border-radius:14px;padding:14px 16px;background:var(--c-surface,#fff)}.rhx-rules h3{margin:0 0 8px;font-size:17px}.rhx-rules dl{display:flex;flex-wrap:wrap;gap:6px 18px;margin:0 0 8px;font-size:13px}.rhx-rules dl div{display:flex;gap:6px;align-items:center}.rhx-rules dt{color:var(--c-ink-3,#62666E)}.rhx-rules dd{margin:0}.rhx-rules p{margin:0;font-size:14.5px;line-height:1.5}.rhx-rules p+p{margin-top:6px;font-size:13.5px}
.rhx-scroll td.n,.rhx-scroll th.n{text-align:right}
.rhx-scroll small{color:var(--c-ink-3,#62666E)}
.rhx-st{display:inline-flex;gap:5px;align-items:center;font-weight:600;font-size:13px;padding:2px 9px;border-radius:999px;white-space:nowrap}
.rhx-st.yes{background:var(--c-good-soft,#EAF6EF);color:var(--c-good,#1E7A4C)}.rhx-st.conditions{background:var(--c-warn-soft,#FFF6E5);color:var(--c-warn,#9A5B00)}.rhx-st.restricted{background:var(--c-accent-soft,#FFF1EB);color:var(--c-bad,#B42318)}.rhx-st.home{color:var(--c-ink-3,#62666E)}
.rhx-cite{border:1px solid var(--c-line,#E4E5E8);border-radius:12px;padding:14px 16px;margin:12px 0;background:var(--c-surface,#fff)}
.rhx-cite p{margin:0 0 10px}.rhx-cite label{display:block;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--c-ink-3,#62666E);margin:12px 0 4px}
.rhx-code{display:block;width:100%;box-sizing:border-box;font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;padding:10px 12px;border:1px solid var(--c-line-2,#D3D5D9);border-radius:10px;background:var(--c-surface-2,#F4F5F6);color:var(--c-ink,#111214);resize:vertical;white-space:pre-wrap;word-break:break-word;field-sizing:content;min-height:44px}
.rhx-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:44px;padding:0 16px;margin:8px 8px 0 0;border-radius:12px;border:1px solid var(--c-line-2,#D3D5D9);background:var(--c-surface,#fff);color:var(--c-ink,#111214)!important;font:600 14px Inter,system-ui,sans-serif;text-decoration:none!important;cursor:pointer}
.rhx-btn:hover{border-color:var(--c-ink,#111214)}.rhx-btn.is-main{background:var(--c-accent,#D4420C);border-color:var(--c-accent,#D4420C);color:#fff!important}.rhx-btn.is-done{border-color:var(--c-good,#1E7A4C);color:var(--c-good,#1E7A4C)!important}
.rhx-cards{list-style:none!important;padding:0!important;display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px;margin:16px 0}
.rhx-cards li{margin:0!important;border:1px solid var(--c-line,#E4E5E8);border-radius:16px;padding:16px;background:var(--c-surface,#fff)}
.rhx-cards strong{display:block;font-size:16px;line-height:1.3;margin-bottom:6px}.rhx-cards span{display:block;font-size:14px;color:var(--c-ink-2,#3D4047);line-height:1.45}.rhx-cards em{display:block;font-style:normal;font-size:13px;color:var(--c-ink-3,#62666E);margin-top:8px}
.rhx-stats{list-style:none!important;padding:0!important;display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:16px 0}
.rhx-stats li{margin:0!important;border:1px solid var(--c-line,#E4E5E8);border-radius:14px;padding:14px;background:var(--c-surface,#fff)}
.rhx-stats b{display:block;font:800 26px/1.1 "Bricolage Grotesque",Inter,system-ui,sans-serif;font-variant-numeric:tabular-nums}.rhx-stats span{display:block;font-size:13px;color:var(--c-ink-3,#62666E);margin-top:4px;line-height:1.35}
.rhx-prev{border:1px dashed var(--c-line-2,#D3D5D9);border-radius:14px;padding:16px;margin:12px 0;background:var(--c-surface-2,#F4F5F6);overflow:auto}
.rhx-prev img{max-width:100%;height:auto;display:block}
.rhx-field{display:block;margin:12px 0}.rhx-field span{display:block;font-size:13px;font-weight:600;margin-bottom:4px}
.rhx-field select,.rhx-field input{width:100%;max-width:420px;min-height:44px;padding:0 12px;border:1px solid var(--c-line-2,#D3D5D9);border-radius:12px;background:var(--c-surface,#fff);color:var(--c-ink,#111214);font:16px Inter,system-ui,sans-serif;box-sizing:border-box}
.rhx-note{font-size:13.5px;color:var(--c-ink-3,#62666E)}
.rhx-by{border-top:1px solid var(--c-line,#E4E5E8);margin-top:32px;padding-top:14px;font-size:14px;color:var(--c-ink-2,#3D4047)}
.rhx-logos{list-style:none!important;padding:0!important;display:flex;flex-wrap:wrap;gap:14px;margin:12px 0}.rhx-logos li{margin:0!important;border:1px solid var(--c-line,#E4E5E8);border-radius:14px;padding:14px;text-align:center;font-size:13px;background:var(--c-surface,#fff)}.rhx-logos img{display:block;width:72px;height:72px;margin:0 auto 8px;border-radius:14px}
@media(max-width:520px){.rhx-bars li{grid-template-columns:minmax(84px,112px) 1fr minmax(52px,auto);gap:8px;font-size:13px}.rhx-answer{font-size:16px}.rhx-btn{width:100%;margin-right:0}}
</style>`;

/** Breadcrumb as HTML and as JSON-LD. Items are [name, path]; the last one is the page itself. */
export const crumbNav = (k: Kit, items: [string, string][]) =>
  `<nav aria-label="${k.t("Breadcrumb", "Ruta")}">${items.map(([n, p], i) => (i === items.length - 1 ? esc(n) : `<a href="${esc(p)}">${esc(n)}</a>`)).join(" › ")}</nav>`;
export const crumbLd = (k: Kit, items: [string, string][]) => ({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map(([name, p], i) => ({ "@type": "ListItem", position: i + 1, name, item: k.url(p === "/" ? "" : p) || SITE + "/" })) });

export type Bar = { label: string; sub?: string; value: number; from?: number; text: string; weak?: boolean };
/** A horizontal bar chart in plain HTML (no script, no image): readable on a phone, in both themes, by a screen
 * reader and by a crawler. `from` draws a range (from..value) instead of a bar from zero. Weak = small sample. */
export function bars(k: Kit, title: string, sub: string, items: Bar[], weakKey?: string): string {
  const max = Math.max(...items.map((b) => b.value), 1);
  const w = (n: number) => Math.round((n / max) * 1000) / 10;
  return `<figure class="rhx-fig"><figcaption>${esc(title)}<small>${esc(sub)}</small></figcaption><ol class="rhx-bars">`
    + items.map((b) => `<li${b.weak ? ' class="weak"' : ""} title="${esc(`${b.label}: ${b.text}${b.sub ? ` (${b.sub})` : ""}`)}"><span class="l">${esc(b.label)}${b.sub ? ` <small>${esc(b.sub)}</small>` : ""}</span> <span class="t"><i style="${b.from != null ? `margin-left:${w(b.from)}%;width:${Math.max(0.6, w(b.value) - w(b.from))}%;border-radius:4px` : `width:${w(b.value)}%`}"></i></span> <span class="v">${esc(b.text)}</span></li>`).join("")
    + `</ol>${weakKey && items.some((b) => b.weak) ? `<p class="rhx-key"><b></b>${esc(weakKey)}</p>` : ""}</figure>`;
}

export type Col = { h: string; cls?: string };
/** A table inside a horizontal scroller with the first column pinned. Cells are HTML already. */
export const table = (cols: Col[], rows: string[][], caption?: string, fit = false) =>
  `<div class="rhx-scroll${fit ? " rhx-fit" : ""}" tabindex="0" role="region"${caption ? ` aria-label="${esc(caption)}"` : ""}><table><thead><tr>${cols.map((c) => `<th scope="col"${c.cls === "n" ? ' class="n"' : ""}>${esc(c.h)}</th>`).join("")}</tr></thead><tbody>`
  + rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<th scope="row">${c}</th>` : `<td${cols[i]?.cls ? ` class="${cols[i].cls}"` : ""}>${c}</td>`)).join("")}</tr>`).join("") + `</tbody></table></div>`;

let uid = 0;
/** A read-only box with text to copy and its button (public/rh-assets.js does the copying). */
export function copyBox(k: Kit, label: string, text: string, rows = Math.min(12, Math.ceil(text.length / 34) + 1), id = `rhx-c${++uid}`): string {
  return `<label for="${id}">${esc(label)}</label><textarea class="rhx-code" id="${id}" readonly rows="${rows}" spellcheck="false">${esc(text)}</textarea>`
    + `<button type="button" class="rhx-btn" data-rhx-copy="${id}" data-done="${esc(k.t("Copied", "Copiado"))}">${esc(k.t("Copy", "Copiar"))}</button>`;
}

/** "How to cite" block: a plain citation and an HTML link, each with its copy button. */
export function citeBlock(k: Kit, title: string, path: string, today: string): string {
  const u = k.url(path);
  const plain = k.t(`RealHunt (${today.slice(0, 4)}). ${title}. Updated ${k.date(today)}. ${u}`, `RealHunt (${today.slice(0, 4)}). ${title}. Actualizado el ${k.date(today)}. ${u}`);
  const html = `<a href="${u}">${title}</a> (RealHunt, ${k.date(today)})`;
  return `<h2 id="cite">${esc(k.t("How to cite this page", "Cómo citar esta página"))}</h2><div class="rhx-cite"><p>${esc(k.t("You can quote these figures, the chart and the table, in full or in part, if you name RealHunt and link to this page (Creative Commons BY 4.0). No need to ask.", "Puedes citar estas cifras, el gráfico y la tabla, enteros o en parte, si nombras a RealHunt y enlazas esta página (Creative Commons BY 4.0). No hace falta pedir permiso."))}</p>`
    + copyBox(k, k.t("Citation", "Cita"), plain) + copyBox(k, k.t("Link for a web page", "Enlace para una página web"), html)
    + `<p class="rhx-note" style="margin-top:12px">${k.t(`Press and data questions: <a href="mailto:${PRESS_EMAIL}">${PRESS_EMAIL}</a>. See also the <a href="/press">press page</a> and <a href="/method">how the score works</a>.`, `Prensa y dudas sobre los datos: <a href="mailto:${PRESS_EMAIL}">${PRESS_EMAIL}</a>. Mira también la <a href="/press">página de prensa</a> y <a href="/method">cómo funciona la nota</a>.`)}</p></div>`;
}

/** The frame of every page: styles, breadcrumb, eyebrow, heading and the script that makes the buttons work. */
export function frame(k: Kit, o: { crumbs: [string, string][]; eyebrow: string; h1: string; body: string }): string {
  return `<main class="rh-static rhx" data-rh-keep data-rh-static data-rhx-js${k.es ? ' lang="es"' : ""}>${CSS}${crumbNav(k, o.crumbs)}<p class="rhx-eyebrow">${esc(o.eyebrow)}</p><h1>${esc(o.h1)}</h1>${o.body}<script src="/rh-assets.js" defer></script></main>`;
}

export const ORG = { "@type": "Organization", name: "RealHunt", url: SITE + "/", logo: SITE + "/apple-touch-icon.png" };
export const FOUNDER = { "@type": "Person", name: "Carlos de Ory Gordillo", jobTitle: "Founder", url: SITE + "/about", worksFor: { "@type": "Organization", name: "Equinox Investment Group LLC" } };

/** Markdown table from header and plain-text rows. */
export const mdTable = (head: string[], rows: (string | number)[][]) =>
  `| ${head.join(" | ")} |\n| ${head.map(() => "---").join(" | ")} |\n` + rows.map((r) => `| ${r.map((c) => String(c).replace(/\|/g, "/").replace(/\n/g, " ")).join(" | ")} |`).join("\n") + "\n";
