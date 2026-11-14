// Shared pieces of the calculator pages (/tools/..., /buying-costs/...) and of their iframe copies
// (/embed/calculator/...). The form and the result are printed here with the functions the browser uses
// (src/tools/defs.ts), so the page a crawler reads already shows a worked result.
import { TOOLS, fmt, formHtml, type State, type ToolData } from "../../src/tools/defs";
import { SITE, citeBlock, copyBox, esc, type Kit } from "../assetsKit";

/** The worker in front of the site blocks every page of realhunt.co inside an <iframe> on another site, except the
 * path prefixes it exempts. The iframe snippet is only offered when this is true; the coordinator opens
 * EMBED_PREFIX in the worker (see the pull request). */
export const EMBED_PREFIX = "/embed/calculator/";
export const EMBED_READY = true;

export const TOOL_CSS = `<style>
.rht{border:1px solid var(--c-line,#E4E5E8);border-radius:16px;padding:16px;margin:20px 0;background:var(--c-surface,#fff)}
.rht-form{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px 14px;align-items:end}
.rht-group{grid-column:1/-1;display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px 14px;align-items:end}
.rht-f{display:block;min-width:0}.rht-f span{display:block;font-size:13px;font-weight:600;margin-bottom:4px;line-height:1.3}
.rht-f input,.rht-f select{display:block;width:100%;min-height:46px;padding:0 12px;border:1px solid var(--c-line-2,#D3D5D9);border-radius:12px;background:var(--c-surface,#fff);color:var(--c-ink,#111214);font:16px Inter,system-ui,sans-serif;box-sizing:border-box;min-width:0}
.rht-f input:focus-visible,.rht-f select:focus-visible,.rht-check input:focus-visible{outline:2px solid var(--c-accent,#D4420C);outline-offset:2px}
.rht-f small{display:block;font-size:12.5px;color:var(--c-ink-3,#62666E);margin-top:4px;line-height:1.35}
.rht-check{grid-column:1/-1;display:flex;gap:10px;align-items:center;min-height:44px;font-size:15px;line-height:1.35;cursor:pointer}
.rht-check input{flex:0 0 auto;width:22px;height:22px;margin:0;accent-color:var(--c-accent,#D4420C)}
.rht-out{margin-top:16px}
.rht-boxes{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px}
.rht-box{border:1px solid var(--c-line,#E4E5E8);border-radius:14px;padding:12px 14px;background:var(--c-surface-2,#F4F5F6);min-width:0}
.rht-box small{display:block;font-size:12.5px;color:var(--c-ink-3,#62666E);line-height:1.3}
.rht-box b{display:block;margin-top:4px;font:800 21px/1.15 "Bricolage Grotesque",Inter,system-ui,sans-serif;font-variant-numeric:tabular-nums;overflow-wrap:anywhere;color:var(--c-ink,#111214)}
.rht-box.is-total{border-color:var(--c-ink,#111214);background:var(--c-surface,#fff)}
.rht-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;margin-top:12px;border:1px solid var(--c-line,#E4E5E8);border-radius:12px}
.rht-t{border-collapse:collapse;width:100%;font-size:14px;font-variant-numeric:tabular-nums}
.rht-t th,.rht-t td{text-align:left;padding:9px 12px;border-bottom:1px solid var(--c-line,#E4E5E8);vertical-align:top;font-weight:400;line-height:1.35}
.rht-t thead th{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--c-ink-3,#62666E);background:var(--c-surface-2,#F4F5F6)}
.rht-t thead th,.rht-t thead th.n{white-space:normal;vertical-align:bottom}.rht-t tbody th{font-weight:600;font-size:14px;text-transform:none;letter-spacing:0;color:var(--c-ink,#111214);background:transparent}.rht-t tr:last-child th,.rht-t tr:last-child td{border-bottom:0}
.rht-t .n{text-align:right;white-space:nowrap}.rht-t3 .n{white-space:normal}.rht-t small{color:var(--c-ink-3,#62666E)}
.rht-note{font-size:13px;line-height:1.5;color:var(--c-ink-3,#62666E);margin:10px 0 0}.rht-note b{color:var(--c-ink-2,#3D4047)}
.rht-verdict{font-weight:600;font-size:15px;line-height:1.45;border-left:4px solid var(--c-ink,#111214);padding:10px 12px;margin:0 0 12px;background:var(--c-surface-2,#F4F5F6);border-radius:8px}
.rht-verdict.is-bad{border-left-color:var(--c-bad,#B42318);margin:12px 0 0}
.rht-share{display:flex;flex-wrap:wrap;gap:0;margin-top:14px;padding-top:6px;border-top:1px solid var(--c-line,#E4E5E8)}
.rht-embed{margin-top:12px;font-size:14px}.rht-embed summary{cursor:pointer;font-weight:600;min-height:44px;display:flex;align-items:center}
.rht-embed label{display:block;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--c-ink-3,#62666E);margin:8px 0 4px}
.rht-src{font-size:14px}.rht-src li{overflow-wrap:anywhere}
.rht-faq h3{font-size:17px;margin:20px 0 6px}
@media(max-width:520px){.rht{padding:14px}.rht-t{font-size:13px}.rht-t thead th{font-size:10.5px;letter-spacing:.02em}.rht-box b{font-size:19px}.rht-t th,.rht-t td{padding:8px 9px}.rht-form{grid-template-columns:1fr}}
</style>`;

export type Source = { label: string; url: string };
export type ToolPage = {
  tool: string; path: string; embed: string; base?: State; navBase?: string; urlTpl?: string; now?: boolean; data: ToolData;
  title: string; h1: string; desc: string; card: string; lead: string; example: string; how: string[]; sources: Source[]; read: string; faq: [string, string][]; more?: string;
  /** Printed instead of "Rates read on <date>" when the figures carry a year, not a day (the country cost ranges). */
  asOf?: string; exampleTitle?: string; noindex?: boolean;
};

const json = (d: unknown) => JSON.stringify(d).replace(/</g, "\\u003c");
export const NOTE = (k: Kit) => k.t("General information, not advice", "Información general, no asesoramiento");

/** The calculator itself: form, result for the page's default state, share buttons and (optionally) the embed code. */
export function toolSection(k: Kit, p: ToolPage, o: { embed?: boolean; idp?: string } = {}): string {
  const tool = TOOLS[p.tool], f = fmt(k.lang);
  const state = { ...tool.defaults(p.data), ...(p.base || {}) };
  const canon = SITE + (k.es ? "/es" : "") + (p.urlTpl || p.path);
  const embedUrl = `${SITE}${EMBED_PREFIX}${k.es ? "es/" : ""}${p.embed}`;
  const first = p.urlTpl ? canon.replace("{c}", state.c) : canon;
  const snippet = `<iframe src="${embedUrl}{q}" title="${esc(p.h1)}" width="100%" height="640" style="border:0;max-width:640px" loading="lazy"></iframe>\n<p><a href="${first}">${esc(p.h1)}</a>, ${k.t("by", "de")} RealHunt</p>`;
  const q0 = p.urlTpl && p.base?.c ? `?c=${p.base.c}` : "";
  const id = `${o.idp || "rht"}-${p.tool}-emb`;
  const share = o.embed ? "" : `<div class="rht-share"><button type="button" class="rhx-btn" data-tool-copy data-done="${esc(k.t("Link copied", "Enlace copiado"))}">${esc(k.t("Copy the link to this result", "Copiar el enlace de este resultado"))}</button>`
    + `<button type="button" class="rhx-btn" data-tool-img data-done="${esc(k.t("Image saved", "Imagen guardada"))}">${esc(k.t("Save the result as an image", "Guardar el resultado como imagen"))}</button>`
    + `<button type="button" class="rhx-btn" data-tool-share data-done="${esc(k.t("Link copied", "Enlace copiado"))}">${esc(k.t("Share", "Compartir"))}</button></div>`
    + (EMBED_READY ? `<details class="rht-embed"><summary>${esc(k.t("Put this calculator on your website", "Pon esta calculadora en tu web"))}</summary><p>${esc(k.t("Paste this code where you want it to appear. It is free; the link to RealHunt under it is the only condition.", "Pega este código donde quieras que aparezca. Es gratis; la única condición es el enlace a RealHunt que lleva debajo."))}</p>`
      + `<label for="${id}">${esc(k.t("Code to paste", "Código para pegar"))}</label><textarea class="rhx-code" id="${id}" readonly rows="6" spellcheck="false" data-tool-embed data-tpl="${esc(snippet)}">${esc(snippet.replace("{q}", q0))}</textarea>`
      + `<button type="button" class="rhx-btn" data-rhx-copy="${id}" data-done="${esc(k.t("Copied", "Copiado"))}">${esc(k.t("Copy", "Copiar"))}</button></details>` : "");
  return `<section class="rht" data-tool="${p.tool}" data-lang="${k.lang}" data-url="${esc(canon)}" data-note="${esc(NOTE(k))}"${p.base ? ` data-base="${esc(JSON.stringify(p.base))}"` : ""}${p.navBase && !o.embed ? ` data-nav-base="${esc(p.navBase)}"` : ""}${p.now ? " data-now=\"1\"" : ""}>`
    + `<script type="application/json" data-tool-data>${json(p.data)}</script>`
    + formHtml(tool, p.data, f, state, o.idp || "rht")
    + `<div class="rht-out" data-tool-out aria-live="polite">${tool.render(state, p.data, f).html}</div>${share}</section>`;
}

/** Body of a calculator page, between the heading and the end of <main>. */
export function toolBody(k: Kit, p: ToolPage, today: string, others: [string, string][]): string {
  const { t } = k;
  return TOOL_CSS
    + `<div class="rhx-answer"><p>${p.lead}</p></div>`
    + `<p class="rhx-meta">${t("Free calculator", "Calculadora gratuita")} · ${esc(NOTE(k))} · ${p.asOf ? esc(p.asOf) : `${t("Rates read on", "Tipos consultados el")} <time datetime="${p.read}">${esc(k.date(p.read))}</time>`} · <a href="#sources">${t("Sources", "Fuentes")}</a></p>`
    + toolSection(k, p)
    + `<h2>${esc(p.exampleTitle || t("A worked example", "Un ejemplo resuelto"))}</h2>${p.example}`
    + `<h2>${esc(t("How it is worked out", "Cómo se calcula"))}</h2><ul>${p.how.map((x) => `<li>${x}</li>`).join("")}</ul>`
    + (p.more || "")
    + `<h2 id="sources">${esc(t("Sources", "Fuentes"))}</h2><ul class="rht-src">${p.sources.map((s) => `<li>${esc(s.label)}: <a href="${esc(s.url)}" rel="noopener nofollow">${esc(s.url)}</a></li>`).join("")}</ul>`
    + `<p class="rhx-note">${esc(t(`${p.asOf || `Read on ${k.date(p.read)}`}. Rates and rules change: this is general information, not legal, tax or financial advice. Check with a local professional before you sign.`, `${p.asOf || `Consultado el ${k.date(p.read)}`}. Los tipos y las normas cambian: es información general, no asesoramiento jurídico, fiscal ni financiero. Consúltalo con un profesional del país antes de firmar.`))}</p>`
    + `<div class="rht-faq"><h2>${esc(t("Questions people ask", "Preguntas frecuentes"))}</h2>${p.faq.map(([q, a]) => `<h3>${esc(q)}</h3><p>${a}</p>`).join("")}</div>`
    + citeBlock(k, p.h1, p.path, today)
    + `<h2>${esc(t("More free tools", "Más herramientas gratuitas"))}</h2><ul>${others.map(([n, u]) => `<li><a href="${esc(u)}">${esc(n)}</a></li>`).join("")}<li><a href="/tools">${esc(t("All tools", "Todas las herramientas"))}</a></li></ul>`;
}

const strip = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
export const faqLd = (faq: [string, string][]) => ({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: strip(a) } })) });
export const appLd = (k: Kit, p: ToolPage, today: string) => ({ "@context": "https://schema.org", "@type": "WebApplication", name: p.h1, description: p.desc, url: k.url(p.path), applicationCategory: "FinanceApplication", operatingSystem: "Any", browserRequirements: "Requires JavaScript", inLanguage: k.lang, isAccessibleForFree: true, offers: { "@type": "Offer", price: 0, priceCurrency: "EUR" }, dateModified: today, publisher: { "@type": "Organization", name: "RealHunt", url: SITE + "/" } });

/** The same calculator as a page of its own for an <iframe>: no app, one small script, a link back. */
export function embedPage(k: Kit, p: ToolPage): string {
  const canon = SITE + (k.es ? "/es" : "") + (p.urlTpl ? p.urlTpl.replace("{c}", p.base?.c || "spain") : p.path);
  const css = TOOL_CSS.replace(/<\/?style>/g, "");
  return `<!doctype html><html lang="${k.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,follow"><link rel="canonical" href="${canon}"><title>${esc(p.h1)} · RealHunt</title>`
    + `<style>*{box-sizing:border-box}:root{--c-ink:#111214;--c-ink-2:#3D4047;--c-ink-3:#62666E;--c-line:#E4E5E8;--c-line-2:#D3D5D9;--c-surface:#fff;--c-surface-2:#F4F5F6;--c-accent:#D4420C;--c-bad:#B42318}body{margin:0;padding:10px;font:15px/1.45 Inter,system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#111214;background:#fff}h1{font-size:18px;line-height:1.25;margin:0 0 12px}a{color:#111214}.w{max-width:620px}.rht{margin:0}.by{font-size:13px;color:#62666E;margin:10px 2px 0}.by a{font-weight:600}${css}</style></head>`
    + `<body><div class="w">${toolSection(k, { ...p, h1: p.h1 }, { embed: true, idp: "e" }).replace(/(<section class="rht"[^>]*>)/, `$1<h1>${esc(p.h1)}</h1>`)}`
    + `<p class="by">${esc(NOTE(k))}. <a href="${canon}" target="_blank" rel="noopener" data-tool-full>${esc(k.t("Full calculator, sources and worked example on RealHunt", "Calculadora completa, fuentes y ejemplo resuelto en RealHunt"))}</a></p></div>`
    + `<script src="${EMBED_PREFIX}embed.js" defer></script></body></html>\n`;
}
export { copyBox };
