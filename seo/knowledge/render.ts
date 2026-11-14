// HTML pieces of the knowledge pages (seo/knowledge/build.ts). No script: everything works as plain HTML, in both
// themes, on a phone and on paper (the glossaries are laid out to be printed and taken to the notary).
import { CSS, PRESS_EMAIL, crumbNav, esc, type Kit } from "../assetsKit";
import { SOURCES } from "./sources";
import type { L, Lang } from "./types";

export const KCSS = `<style>
.kn{max-width:820px}.kn h2{scroll-margin-top:80px}.kn h3{margin:0 0 4px;font-size:19px;line-height:1.3}
.kn-lede{font-size:17px;line-height:1.55;color:var(--c-ink-2,#3D4047)}
.kn-chips{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0 6px;padding:0!important;list-style:none!important}
.kn-chips li{margin:0!important}
.kn-chips a{display:inline-flex;align-items:center;min-height:44px;padding:0 14px;border:1px solid var(--c-line-2,#D3D5D9);border-radius:999px;background:var(--c-surface,#fff);color:var(--c-ink,#111214)!important;font-size:14.5px;font-weight:600;text-decoration:none!important}
.kn-chips a:hover{border-color:var(--c-ink,#111214)}
.kn-status{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:6px 16px}.kn-status li{display:flex;align-items:center;gap:8px;min-height:44px;border-bottom:1px solid var(--c-line,#E4E5E8)}.kn-status a{display:inline;min-height:0;padding:0;border:0;border-radius:0;background:none;font-weight:600;text-decoration:underline!important}
.kn-term{border:1px solid var(--c-line,#E4E5E8);border-radius:16px;padding:16px 18px;margin:14px 0;background:var(--c-surface,#fff);scroll-margin-top:80px;break-inside:avoid}
.kn-term h3 i{font-style:normal;font-weight:800}.kn-term h3 span{display:block;font-size:14px;font-weight:600;color:var(--c-ink-3,#62666E);margin-top:2px}
.kn-aka{font-size:13.5px;color:var(--c-ink-3,#62666E);margin:2px 0 0}
.kn-def{font-size:16.5px;font-weight:600;line-height:1.45;margin:10px 0 6px}
.kn-term p{margin:6px 0}.kn i[lang]{font-style:italic}
.kn-cite{font-size:13px;color:var(--c-ink-3,#62666E);margin-top:10px!important}.kn-cite a{color:inherit}
.kn-src{font-size:14px;padding-left:20px}.kn-src li{margin:8px 0;overflow-wrap:anywhere}.kn-src small{display:block;color:var(--c-ink-3,#62666E)}
.kn-note{border-left:4px solid var(--c-warn,#9A5B00);background:var(--c-warn-soft,#FFF6E5);border-radius:10px;padding:12px 14px;margin:16px 0;font-size:14.5px;line-height:1.5;color:var(--c-ink,#111214)}
.hunt.is-dark .kn-note{background:rgba(255,196,94,.12)}
.kn-cards{list-style:none!important;padding:0!important;display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;margin:14px 0}
.kn-cards li{margin:0!important;border:1px solid var(--c-line,#E4E5E8);border-radius:16px;padding:14px 16px;background:var(--c-surface,#fff)}
.kn-cards a{font-weight:700;font-size:16px}.kn-cards span{display:block;font-size:14px;line-height:1.45;color:var(--c-ink-2,#3D4047);margin-top:4px}
.kn-qa{margin:0}.kn-qa dt{font-weight:700;margin-top:14px}.kn-qa dd{margin:4px 0 0;line-height:1.55}
.kn-homes{list-style:none!important;padding:0!important}.kn-homes li{margin:0!important;padding:10px 0;border-bottom:1px solid var(--c-line,#E4E5E8);line-height:1.45}.kn-homes li:last-child{border-bottom:0}
.kn-quiz details{border:1px solid var(--c-line,#E4E5E8);border-radius:14px;padding:0 16px;margin:10px 0;background:var(--c-surface,#fff)}
.kn-quiz summary{min-height:48px;display:flex;align-items:center;cursor:pointer;font-weight:600}.kn-quiz details p{margin:0 0 14px}
.kn-ad{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:14px;line-height:1.6;border:1px dashed var(--c-line-2,#D3D5D9);border-radius:12px;padding:14px 16px;background:var(--c-surface-2,#F4F5F6);margin:12px 0}
@media print{.kn nav,.kn-chips,.kn-noprint,.rh-related,.hunt-top,.hunt-footer,header,footer{display:none!important}.kn{max-width:none}.kn-term{border:0;border-bottom:1px solid #999;border-radius:0;padding:8px 0;margin:0}.kn a{color:#000!important;text-decoration:none!important}.kn-src a::after{content:""}}
</style>`;

/** Escapes a text and turns its two inline marks into HTML: [label](/path) and *local word*. */
export const md = (s: string) => esc(s).replace(/\[([^\]]+)\]\((\/[^)\s]*)\)/g, '<a href="$2">$1</a>').replace(/\*([^*]+)\*/g, "<i>$1</i>");
/** The same text without marks, for descriptions and structured data. */
export const plain = (s: string) => s.replace(/\[([^\]]+)\]\((\/[^)\s]*)\)/g, "$1").replace(/\*([^*]+)\*/g, "$1");

const MONTHS = { en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"], es: ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"] };
/** "November 2026" / "noviembre de 2026" from an ISO day. */
export const monthOf = (iso: string, lang: Lang) => { const [y, m] = iso.split("-").map(Number); return lang === "es" ? `${MONTHS.es[m - 1]} de ${y}` : `${MONTHS.en[m - 1]} ${y}`; };
export const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
/** A page that nobody has reviewed for this many days says so (ideas 320 and 410 of the list). */
export const STALE_DAYS = 183;

export type Names = (key: string) => string;

/** One source as a link: an official page, or one of our country files ("data:spain"). */
export function sourceLink(id: string, k: Kit, names: Names): string {
  if (id.startsWith("data:")) {
    const key = id.slice(5);
    if (key === "canbuy") return `<a href="/can-i-buy">${esc(k.t("RealHunt rules by nationality", "normas por nacionalidad de RealHunt"))}</a>`;
    return `<a href="/costs/${esc(key)}">${esc(k.t(`RealHunt country file: ${names(key)}`, `ficha de país de RealHunt: ${names(key)}`))}</a>`;
  }
  const s = SOURCES[id];
  if (!s) throw new Error(`knowledge: unknown source "${id}"`);
  return `<a href="${esc(s.url)}" rel="noopener">${esc((k.es && s.orgEs) || s.org)}</a>`;
}
export const cite = (ids: string[] | undefined, k: Kit, names: Names) =>
  ids?.length ? `<p class="kn-cite">${esc(k.t(ids.length > 1 ? "Sources" : "Source", ids.length > 1 ? "Fuentes" : "Fuente"))}: ${ids.map((id) => sourceLink(id, k, names)).join(" · ")}</p>` : "";

/** The list of sources at the end of a page: who, what, the address and the day it was read. */
export function sourceList(ids: string[], k: Kit, names: Names): string {
  const uniq = [...new Set(ids)];
  const official = uniq.filter((id) => !id.startsWith("data:")), ours = uniq.filter((id) => id.startsWith("data:"));
  const li = official.map((id) => { const s = SOURCES[id]; if (!s) throw new Error(`knowledge: unknown source "${id}"`);
    return `<li><strong>${esc((k.es && s.orgEs) || s.org)}</strong>: ${esc(s.title[k.lang])}<small><a href="${esc(s.url)}" rel="noopener">${esc(s.url)}</a> · ${esc(k.t(`read on ${k.date(s.read)}`, `consultada el ${k.date(s.read)}`))}</small></li>`; });
  const mine = ours.map((id) => { const key = id.slice(5);
    return key === "canbuy"
      ? `<li><strong>RealHunt</strong>: <a href="/can-i-buy">${esc(k.t("who can buy where, by nationality", "quién puede comprar dónde, por nacionalidad"))}</a><small>${esc(k.t("Our own file, compiled from public government sources.", "Ficha propia, elaborada con fuentes públicas oficiales."))}</small></li>`
      : `<li><strong>RealHunt</strong>: ${esc(k.t(`country file for ${names(key)}`, `ficha de ${names(key)}`))}<small><a href="/costs/${esc(key)}">${esc(k.t("Costs, taxes and the sources behind them", "Gastos, impuestos y las fuentes de las que salen"))}</a></small></li>`; });
  return `<h2 id="sources">${esc(k.t("Sources", "Fuentes"))}</h2><ol class="kn-src">${li.join("")}${mine.join("")}</ol>`;
}

/** Date, scope and the reminder that this is not advice. Adds the out-of-date warning when the review is old. */
export function metaLine(k: Kit, reviewed: string, today: string): string {
  const old = daysBetween(reviewed, today) > STALE_DAYS;
  return `<p class="rhx-meta">${k.t("Reviewed on", "Revisada el")} <time datetime="${reviewed}">${esc(k.date(reviewed))}</time> · ${esc(k.t(`Rules and figures as of ${monthOf(reviewed, "en")}`, `Normas y cifras a ${monthOf(reviewed, "es")}`))} · ${esc(k.t("General information, not legal or tax advice", "Información general, no asesoramiento jurídico ni fiscal"))}</p>`
    + (old ? `<p class="kn-note" data-kn-stale>${esc(k.t(`This page was last reviewed on ${k.date(reviewed)}. Rules and rates may have changed since then: check the sources below before you rely on it.`, `Esta página se revisó por última vez el ${k.date(reviewed)}. Las normas y los tipos pueden haber cambiado desde entonces: comprueba las fuentes de abajo antes de fiarte.`))}</p>` : "");
}

export const byline = (k: Kit) =>
  `<p class="rhx-by" data-rhx-by>${k.t(
    `Written and checked against its sources by the RealHunt team. Laws change and every purchase is different: before you sign or pay, ask a lawyer or a notary in the country. <a href="/editorial-policy">Editorial policy and corrections</a> · Found a mistake? <a href="mailto:${PRESS_EMAIL}">${PRESS_EMAIL}</a>`,
    `Escrita y contrastada con sus fuentes por el equipo de RealHunt. Las leyes cambian y cada compra es distinta: antes de firmar o pagar, consulta a un abogado o a un notario del país. <a href="/editorial-policy">Política editorial y correcciones</a> · ¿Has visto un error? <a href="mailto:${PRESS_EMAIL}">${PRESS_EMAIL}</a>`)}</p>`;

/** The frame every knowledge page shares. */
export function frame(k: Kit, o: { crumbs: [string, string][]; eyebrow: string; h1: string; body: string; cls?: string }): string {
  return `<main class="rh-static rhx kn${o.cls ? " " + o.cls : ""}" data-rh-keep data-rh-static data-kn${k.es ? ' lang="es"' : ""}>${crumbNav(k, o.crumbs)}${CSS}${KCSS}<p class="rhx-eyebrow">${esc(o.eyebrow)}</p><h1>${esc(o.h1)}</h1>${o.body}</main>`;
}

/** Paragraphs of a section: a run of lines that start with "- " becomes a list. */
export function paragraphs(ps: L[], lang: Lang): string {
  let html = "", open = false;
  for (const p of ps) {
    const s = p[lang];
    if (s.startsWith("- ")) { if (!open) { html += "<ul>"; open = true; } html += `<li>${md(s.slice(2))}</li>`; }
    else { if (open) { html += "</ul>"; open = false; } html += `<p>${md(s)}</p>`; }
  }
  return html + (open ? "</ul>" : "");
}

/** A title that fits: the first candidate short enough to take the brand. */
export const fitTitle = (candidates: string[], max = 49) => candidates.find((c) => c.length <= max) || candidates[candidates.length - 1];
/** A description cut at a sentence or a word, never above `max`. */
export function fitDesc(s: string, max = 155): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const dot = cut.lastIndexOf(". ");
  if (dot > max * 0.6) return cut.slice(0, dot + 1);
  return cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:]$/, "") + ".";
}
