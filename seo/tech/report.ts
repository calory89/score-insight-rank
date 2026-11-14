// /seo-report: the result of the last publication in plain Spanish, for the owner (idea 140). One file, no
// application, "noindex": it is a working page, not a page of the site. Written by seo/polish.ts from the same
// numbers as dist/seo-audit.json, so it can never say something the build did not measure.
import fs from "fs";
import path from "path";
import type { Audit } from "../polishAudit";

const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const num = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

/** What each check means, for someone who does not write code: [name, why it matters]. */
export const PLAIN: Record<string, [string, string]> = {
  em_dash: ["Rayas largas en el texto", "La norma de la casa es no usarlas. Suelen venir en la descripción de una casa; en la web publicada se cambian solas por una coma, pero conviene corregir el texto de origen."],
  em_dash_in_home_data: ["Casas con raya larga en sus textos", "El texto guardado de estas casas lleva rayas largas. La web publicada las cambia por comas; lo limpio es corregirlas en la base de datos."],
  fake_urgency: ["Frases de urgencia", "«Últimas unidades», «oferta por tiempo limitado» y parecidas. Casi siempre vienen copiadas del anuncio original: hay que reescribir esa descripción."],
  promised_return: ["Rentabilidades prometidas", "Ningún texto puede dar por segura una rentabilidad o una subida de precio."],
  inflated_figure: ["Cifras infladas", "El texto habla de «miles de casas» y hay menos. Decir las que hay."],
  phone_number: ["Números de teléfono", "El contacto es el correo de la empresa; no se publica ningún teléfono."],
  phone_link: ["Enlaces a un teléfono o a WhatsApp", "Igual que el anterior, pero en un enlace."],
  placeholder_text: ["Texto de relleno o notas internas", "«Lorem ipsum», «TODO» y similares a la vista de Google."],
  year_in_title: ["Año en el título", "Solo llevan año las casas (el año es un dato de la casa) y los artículos con fecha. Un año en otra página la hace vieja en enero."],
  test_page_indexable: ["Páginas de prueba al alcance de Google", "Una dirección con «test», «demo», «borrador» o parecido que Google puede indexar."],
  link_without_href: ["Enlaces sin dirección", "Enlaces que solo funcionan con JavaScript. Google no los sigue."],
  link_without_text: ["Enlaces sin texto", "Google usa el texto del enlace para entender la página de destino."],
  generic_link_text: ["Enlaces que dicen «ver más» o «aquí»", "Mejor que el enlace diga a dónde lleva: «casas en Bulgaria por menos de 30.000 €»."],
  click_handler_instead_of_link: ["Botones que hacen de enlace", "Elementos que llevan a otra página sin ser un enlace de verdad."],
  tracking_param_in_internal_link: ["Enlaces internos con parámetros de seguimiento", "Crean dos direcciones para la misma página. Se quitan solos al publicar."],
  image_without_alt: ["Fotos sin texto alternativo", "El texto alternativo es lo que Google Imágenes lee de una foto."],
  image_without_size: ["Fotos sin tamaño reservado", "Si el navegador no sabe el tamaño de la foto, la página da un salto cuando llega."],
  review_or_rating_markup: ["Reseñas o valoraciones en los datos para buscadores", "No publicamos reseñas ni estrellas: nadie real las ha escrito."],
  region_used_as_country: ["Casas con una región como país", "«Scandinavia» no es un país. Cada casa tiene que ir a su país real (se corrige en la base de datos)."],
  keyword_stuffing: ["Páginas que repiten demasiado una frase", "La misma frase muchas veces en una página parece escrita para un robot."],
  near_identical_pages: ["Páginas casi iguales entre sí", "Dos páginas que solo cambian el nombre del lugar compiten entre ellas y Google puede ignorar ambas."],
  place_name_changed_in_spanish: ["Nombres de pueblos cambiados en la página española", "El nombre de un pueblo va en su idioma original; la página española de la casa tiene que nombrarlo igual que los datos."],
  legal_page_without_disclaimer: ["Guías o costes sin el aviso de «información general»", "Las páginas de leyes, impuestos y costes informan con fuentes; no son asesoramiento."],
  html_over_300kb: ["Páginas muy pesadas", "Más de 300 KB de HTML. Tardan en un móvil lento."],
  redirect_chain: ["Redirecciones en cadena", "Una dirección antigua tiene que llegar a la nueva en un solo salto."],
  redirect_to_missing_page: ["Redirecciones a una página que no existe", "La dirección antigua acabaría en un error."],
  redirect_from_a_page: ["Redirecciones que pisan una página viva", "Una página que existe no puede estar además redirigida."],
  link_through_redirect: ["Enlaces internos que pasan por una redirección", "El enlace tiene que ir directo a la página final."],
  canonical_with_parameters: ["Dirección oficial con parámetros", "La dirección oficial de una página es siempre la limpia, sin filtros ni orden."],
  no_text_without_javascript: ["Páginas sin texto si no hay JavaScript", "Google lee primero el HTML. Si el texto solo aparece con JavaScript, la página tarda mucho más en entrar al índice."],
  not_reachable_from_front_page: ["Páginas a las que no se llega desde la portada", "Ningún camino de enlaces lleva hasta ellas."],
  more_than_4_clicks_deep: ["Páginas a más de cuatro clics de la portada", "Cuanto más lejos de la portada, menos las visita Google."],
  home_without_link_to_its_guide_or_costs: ["Casas sin enlace a la guía o a los costes de su país", "Cada casa enlaza a la guía y a los costes de su país."],
  home_without_link_to_its_country: ["Casas sin enlace al listado de su país", ""],
  guide_without_listings_or_homes: ["Guías sin enlaces a listados y a casas", "Cada guía enlaza a tres listados de su país y a cinco casas actuales."],
  post_without_link_to_a_listing: ["Artículos sin enlace a un listado", "Un listado se actualiza solo; así el artículo no envejece cuando se venden las casas."],
  spanish_indexable_english_noindex: ["Página española indexable con la inglesa fuera del índice", "La gemela española sigue siempre a la inglesa."],
  title_changed_twice_in_28_days: ["Títulos cambiados dos veces en cuatro semanas", "Cada cambio de título necesita cuatro semanas para poder medirse."],
  script_from_unknown_host: ["Programas cargados desde un sitio desconocido", "Solo se cargan programas de los sitios de la lista (seo/tech/audit.ts). Uno nuevo puede ser un descuido o un ataque."],
  frame_from_unknown_host: ["Marcos de un sitio desconocido", "Igual que el anterior, para contenidos incrustados."],
};
const WHY_ES: Record<string, string> = {
  "new-build project page": "Fichas de obra nueva con muy poco texto", "home finder, city copy": "Copias por ciudad del buscador de casa", "new builds, country copy": "Copias por país de obra nueva",
  "app screen": "Pantallas de la aplicación sin texto", "form, contract or demo": "Formularios, contratos y demostraciones", "portal list": "Listas de un portal con pocas casas", "legal page": "Páginas legales",
  "set by its template": "Fuera del índice desde su plantilla", "comparison without searches yet": "Comparativas sin búsquedas todavía", "nationality page without searches yet": "Páginas por nacionalidad sin búsquedas todavía", other: "Otras",
};

export function reportHtml(rep: Audit, o: { today: string; rows: number; toIndex?: string[] }): string {
  const s = rep.summary, t = rep.tech;
  const es = (rep.spanish as any)?.twins;
  const item = (k: string, list: string[], bad: boolean) => {
    const [name, why] = PLAIN[k] || [k.replace(/_/g, " "), ""];
    const total = t?.summary[k] ?? list.length;
    return `<details${bad ? " open" : ""}><summary><span class="${bad ? "bad" : "warn"}">${num(total)}</span> ${esc(name)}</summary>${why ? `<p>${esc(why)}</p>` : ""}<ul>${list.slice(0, 15).map((x) => `<li>${esc(x)}</li>`).join("")}</ul></details>`;
  };
  const failKeys = new Set((t?.failures || []).map((f) => f.split(":")[0].replace(/ /g, "_")));
  const techLists = Object.entries(t?.lists || {});
  const bad = techLists.filter(([k]) => failKeys.has(k)), warn = techLists.filter(([k]) => !failKeys.has(k)).sort((a, b) => (t!.summary[b[0]] || 0) - (t!.summary[a[0]] || 0));
  const row = (a: string, b: string | number, c = "") => `<tr><th scope="row">${esc(a)}</th><td>${typeof b === "number" ? num(b) : esc(b)}</td><td>${esc(c)}</td></tr>`;
  const depth = Object.entries(t?.depth || {}).sort((a, b) => a[0].localeCompare(b[0], "es", { numeric: true }));
  const ok = rep.failures.length === 0;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>Informe SEO de la última publicación · RealHunt</title>
<style>:root{color-scheme:light dark;--ink:#111214;--ink2:#62666E;--bg:#fff;--fill:#F2F3F5;--line:#E4E5E8;--acc:#B8370A;--ok:#17713c;--bad:#b3261e;--warn:#8a5a00}@media (prefers-color-scheme:dark){:root{--ink:#ECEDEE;--ink2:#A2A6AD;--bg:#0C0D0E;--fill:#1A1B1D;--line:#292B2E;--acc:#FF8A5C;--ok:#5fd08a;--bad:#ff8a80;--warn:#f0c060}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}main{max-width:860px;margin:0 auto;padding:24px 16px 64px}h1{font-size:clamp(26px,5vw,36px);line-height:1.1;letter-spacing:-.02em;margin:0 0 6px}h2{font-size:21px;margin:36px 0 10px}p{margin:0 0 12px}a{color:var(--acc)}.sub{color:var(--ink2);margin-bottom:18px}
.state{display:inline-block;padding:6px 14px;border-radius:999px;font-weight:700;background:var(--fill)}.state.ok{color:var(--ok)}.state.no{color:var(--bad)}
.kpi{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:16px 0}.kpi div{background:var(--fill);border-radius:14px;padding:12px 14px}.kpi b{display:block;font-size:24px;font-variant-numeric:tabular-nums}.kpi span{font-size:13px;color:var(--ink2)}
table{width:100%;border-collapse:collapse;font-size:15px}th,td{text-align:left;padding:8px 10px 8px 0;border-bottom:1px solid var(--line);vertical-align:top}td:nth-child(2){font-variant-numeric:tabular-nums;white-space:nowrap;font-weight:600}td:nth-child(3){color:var(--ink2);font-size:14px}th{font-weight:500}
details{border:1px solid var(--line);border-radius:12px;padding:0 14px;margin:8px 0}summary{cursor:pointer;padding:12px 0;min-height:44px;font-weight:600}details p{color:var(--ink2);font-size:15px}details ul{padding-left:18px;font-size:13.5px;color:var(--ink2);overflow-wrap:anywhere}
.bad,.warn{display:inline-block;min-width:2.2em;text-align:center;border-radius:8px;padding:0 6px;margin-right:6px;background:var(--fill);font-variant-numeric:tabular-nums}.bad{color:var(--bad)}.warn{color:var(--warn)}ol{padding-left:22px}li{margin:3px 0;overflow-wrap:anywhere}</style></head>
<body><main><h1>Informe SEO de la última publicación</h1><p class="sub">Hecho el ${esc(o.today)} con las páginas tal como se publican. Se rehace solo en cada publicación.</p>
<p><span class="state ${ok ? "ok" : "no"}">${ok ? "Todo lo que frena la publicación está bien" : `${rep.failures.length} comprobaciones han fallado`}</span></p>
${ok ? "" : `<ul>${rep.failures.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>`}
<div class="kpi"><div><b>${num(o.rows)}</b><span>casas publicadas</span></div><div><b>${num(s.indexable)}</b><span>páginas que Google puede indexar</span></div><div><b>${num(s.pages)}</b><span>páginas en total</span></div><div><b>${es != null ? num(es) : "?"}</b><span>páginas con gemela en español</span></div></div>
<p>Publicar páginas no es avanzar: lo que cuenta son las páginas <strong>indexadas</strong> y los <strong>clics</strong>, y eso solo se ve en Search Console. Este informe dice si lo publicado está sano.</p>

<h2>Lo básico</h2><table>
${row("Enlaces internos rotos", s.broken_links, "Tiene que ser 0")}${row("Páginas a las que nadie enlaza", s.orphans, "Tiene que ser 0")}${row("Títulos repetidos", s.duplicate_titles, "Tiene que ser 0")}${row("Descripciones repetidas", s.duplicate_descriptions, "Tiene que ser 0")}
${row("Problemas de idioma (hreflang)", s.hreflang_problems, "Tiene que ser 0")}${row("Títulos de más de 60 letras", s.title_over_60, "Google los corta; casi todos son casas con nombre largo")}${row("Descripciones fuera de 120 a 155 letras", s.desc_out_of_range)}
${row("Páginas con menos de 150 palabras", s.thin_under_150_words)}${row("Redirecciones de direcciones antiguas", s.redirects, "En un solo salto")}${row("Arreglado solo al publicar", t?.summary.fixed_here ?? 0, "Rayas largas, enlaces con seguimiento, enlaces a direcciones movidas")}
${row("Títulos cambiados desde la publicación anterior", t?.summary.titles_changed_since_last_build ?? 0, "Cada cambio tarda cuatro semanas en poder medirse")}</table>

<h2>A cuántos clics de la portada está cada página</h2><table>${depth.map(([d, n]) => row(d === "unreachable" ? "Sin camino desde la portada" : d === "0" ? "La portada" : `${d} ${d === "1" ? "clic" : "clics"}`, n, Number(d) > 4 ? "Demasiado lejos" : "")).join("")}</table>

<h2>Lo que frena la publicación</h2>${bad.length ? bad.map(([k, l]) => item(k, l, true)).join("") : "<p>Nada.</p>"}
<h2>Avisos: no frenan, hay que mirarlos</h2>${warn.length ? warn.map(([k, l]) => item(k, l, false)).join("") : "<p>Ninguno.</p>"}

<h2>Páginas fuera del índice, y por qué</h2><p>${num(s.noindex)} páginas llevan «no indexar». Si Search Console enseña alguna que no esté en estos grupos, es un error.</p><table>${Object.entries(t?.noindex || {}).sort((a, b) => b[1] - a[1]).map(([k, n]) => row(WHY_ES[k] || k, n)).join("")}</table>

${o.toIndex?.length ? `<h2>Las ${o.toIndex.length} páginas que pedir a mano en Search Console</h2><p>«Inspección de URL», pegar la dirección, «Solicitar indexación». Google admite unas 10 al día.</p><ol>${o.toIndex.map((u) => `<li><a href="${esc(u)}">https://realhunt.co${esc(u)}</a></li>`).join("")}</ol>` : ""}

<h2>Programas de otros sitios</h2><p>Cada uno tiene que justificar su peso. Los que carga la web: ${esc((t?.external.scripts || []).filter((h) => h !== "realhunt.co").join(", ") || "ninguno")}. Google Analytics lo añade el servidor, fuera de este informe.</p>
<p class="sub">Datos completos para quien programa: <a href="/seo-audit.json">/seo-audit.json</a>.</p></main></body></html>
`;
}

export function writeReport(root: string, rep: Audit, o: { today: string; rows: number; toIndex?: string[] }) {
  const dir = path.join(root, "seo-report");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), reportHtml(rep, o));
}
