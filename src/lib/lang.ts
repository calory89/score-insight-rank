// RealHunt language layer (1-oct-2026, rule changed 8-nov-2026).
// Owner's rule: Spanish only for people connecting from a Spanish-speaking country, English for everyone else,
// whatever the browser language. The country comes from the time zone (instant, no request), refined by the
// Cloudflare country of a previous visit (/cdn-cgi/trace, same origin, free; saved as rh_geo). An explicit
// choice (?lang=, the EN/ES switch, saved rh_lang) always wins and is remembered. index.html mirrors this.
// Components keep writing English; this module swaps the rendered text in place (text nodes and a few
// attributes) from a dictionary built from the source code, so no page can be left half translated.
export type Lang = "en" | "es";

/** ISO codes of the Spanish-speaking countries (Cloudflare loc / cf-ipcountry values). */
export const ES_COUNTRIES = new Set(["ES", "MX", "AR", "CO", "CL", "PE", "VE", "EC", "GT", "CU", "BO", "DO", "HN", "PY", "SV", "NI", "CR", "PA", "UY", "PR", "GQ"]);
/** IANA time zones of those countries. */
export const ES_TZ = /^(Europe\/Madrid|Africa\/Ceuta|Atlantic\/Canary|Africa\/Malabo|America\/(Mexico_City|Cancun|Merida|Monterrey|Matamoros|Chihuahua|Ciudad_Juarez|Ojinaga|Mazatlan|Bahia_Banderas|Hermosillo|Tijuana|Ensenada|Santa_Isabel|Bogota|Lima|Santiago|Punta_Arenas|Argentina\/.+|Buenos_Aires|Cordoba|Mendoza|Catamarca|Jujuy|Rosario|Caracas|Montevideo|Asuncion|La_Paz|Guayaquil|Guatemala|El_Salvador|Tegucigalpa|Managua|Costa_Rica|Panama|Havana|Santo_Domingo|Puerto_Rico)|Pacific\/(Easter|Galapagos)|Chile\/.+|Mexico\/.+|Cuba)$/;

/** Pure rule, tested: explicit choice > saved choice > Cloudflare country (from an earlier visit) > time zone. */
export function pickLang(o: { q?: string | null; saved?: string | null; geo?: string | null; tz?: string | null }): Lang {
  if (o.q === "es" || o.q === "en") return o.q;
  if (o.saved === "es" || o.saved === "en") return o.saved;
  const g = (o.geo || "").toUpperCase();
  if (/^[A-Z]{2}$/.test(g) && g !== "XX" && g !== "T1") return ES_COUNTRIES.has(g) ? "es" : "en";
  return ES_TZ.test(o.tz || "") ? "es" : "en";
}

export function detectLang(): Lang {
  let q: string | null = null, saved: string | null = null, geo: string | null = null, tz = "";
  try { q = new URLSearchParams(location.search).get("lang"); } catch { /* ignore */ }
  try { saved = localStorage.getItem("rh_lang"); geo = localStorage.getItem("rh_geo"); } catch { /* storage blocked */ }
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch { /* ignore */ }
  return pickLang({ q, saved, geo, tz });
}

/** After the first paint: remember the visitor's Cloudflare country for the next visit (no extra service, no cost). */
export function refineGeo() {
  try {
    if (localStorage.getItem("rh_geo")) return;
    const go = () => fetch("/cdn-cgi/trace", { cache: "no-store" }).then((r) => (r.ok ? r.text() : "")).then((t) => {
      const m = /(?:^|\n)loc=([A-Z]{2})/.exec(t);
      if (m) localStorage.setItem("rh_geo", m[1]);
    }).catch(() => {});
    const w = window as any;
    if (w.requestIdleCallback) w.requestIdleCallback(go, { timeout: 5000 }); else setTimeout(go, 3000);
  } catch { /* ignore */ }
}

const fromHtml = typeof document !== "undefined" ? document.documentElement.getAttribute("data-lang") : null;
let current: Lang = typeof window === "undefined" ? "en" : fromHtml === "es" || fromHtml === "en" ? fromHtml : detectLang();
export const getLang = () => current;
export const isEs = () => current === "es";

export function setLang(l: Lang) {
  try { localStorage.setItem("rh_lang", l); } catch { /* ignore */ }
  if (l === current) return;
  // A reload is the cleanest switch: every page, title and dialog renders again in the new language.
  const u = new URL(location.href); u.searchParams.delete("lang");
  location.replace(u.toString());
}

// ---------------------------------------------------------------- dictionary
let dict: Record<string, string> = {};
type Pat = { re: RegExp; out: string; n: number };
let pats: Pat[] = [];
const cache = new Map<string, string | null>();

const MONTHS: Record<string, string> = { Jan: "ene", Feb: "feb", Mar: "mar", Apr: "abr", May: "may", Jun: "jun", Jul: "jul", Aug: "ago", Sep: "sept", Sept: "sept", Oct: "oct", Nov: "nov", Dec: "dic",
  January: "enero", February: "febrero", March: "marzo", April: "abril", June: "junio", July: "julio", August: "agosto", September: "septiembre", October: "octubre", November: "noviembre", December: "diciembre" };
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function addDict(d: Record<string, string>) {
  for (const k in d) {
    const v = d[k];
    if (/\{\d\}/.test(k)) {
      const parts = k.split(/(\{\d\})/);
      let src = "^"; let n = 0;
      for (const p of parts) { if (/^\{\d\}$/.test(p)) { src += "((?:(?![.!?] [A-Z€¿])[\\s\\S])+?)"; n++; } else src += esc(p); }
      if (k.replace(/\{\d\}/g, "").trim().length < 3) continue; // too generic to match safely
      pats.push({ re: new RegExp(src + "$"), out: v, n });
    } else dict[k] = v;
  }
  // longest literal first so specific templates win
  pats.sort((a, b) => b.re.source.length - a.re.source.length);
  cache.clear(); gen++;
}

// € amounts and thousands in Spanish format: €100,000 -> 100.000 €, €30k -> 30.000 €
function money(s: string): string {
  if (!/\d/.test(s)) return s;
  let o = s.replace(/€\s?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d+))?(?:([kKmM])(?![a-zA-Z]))?(?![\w])/g, (_m, int: string, dec: string | undefined, suf: string | undefined) => {
    let n = Number(int.replace(/,/g, "") + (dec ? "." + dec : ""));
    if (suf && /k/i.test(suf)) n *= 1000;
    if (suf && /m/i.test(suf)) return `${String(Number(int.replace(/,/g, "") + (dec ? "." + dec : ""))).replace(".", ",")} M€`;
    const [ip, dp] = String(Math.round(n * 100) / 100).split(".");
    return `${ip.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}${dp ? "," + dp : ""} €`;
  });
  // Not "0,896" or "0,799%": a leading 0 is a Spanish decimal (from the Spanish legal texts), not thousands.
  o = o.replace(/\b([1-9]\d{0,2}(?:,\d{3})+)\b/g, (m) => m.replace(/,/g, "."));
  o = o.replace(/(\d) €/g, "$1\u00A0€");
  o = o.replace(/\b(\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept?|Oct|Nov|Dec|January|February|March|April|June|July|August|September|October|November|December)\b/g, (_m, d, mo) => `${d} ${MONTHS[mo] || mo}`);
  o = o.replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept?|Oct|Nov|Dec|January|February|March|April|June|July|August|September|October|November|December) (\d{1,2}), (\d{4})\b/g, (_m, mo, d, y) => `${d} ${MONTHS[mo] || mo} ${y}`);
  return o;
}

const COUNTRIES: Record<string, string> = { Spain: "España", Italy: "Italia", "St. Gallen": "San Galo", Bern: "Berna", Geneva: "Ginebra", Lucerne: "Lucerna", Grisons: "Grisones", Ticino: "Tesino", "North Jutland": "Jutlandia Septentrional", "West Jutland": "Jutlandia Occidental", "East Jutland": "Jutlandia Oriental", "Central Jutland": "Jutlandia Central", Funen: "Fionia", "Nova Scotia": "Nueva Escocia", "New Brunswick": "Nuevo Brunswick", Pennsylvania: "Pensilvania", Sweden: "Suecia", Japan: "Japón", "United States": "Estados Unidos", USA: "EE. UU.", Mexico: "México", Canada: "Canadá", France: "Francia", Portugal: "Portugal", Germany: "Alemania", Greece: "Grecia", Croatia: "Croacia", Bulgaria: "Bulgaria", Romania: "Rumanía", Hungary: "Hungría", Finland: "Finlandia", Norway: "Noruega", Denmark: "Dinamarca", Scandinavia: "Escandinavia", Ireland: "Irlanda", "United Kingdom": "Reino Unido", Thailand: "Tailandia", Indonesia: "Indonesia", Georgia: "Georgia", Turkey: "Turquía", Morocco: "Marruecos", Brazil: "Brasil", Argentina: "Argentina", Panama: "Panamá", "Costa Rica": "Costa Rica", Philippines: "Filipinas", Vietnam: "Vietnam", Malaysia: "Malasia", Albania: "Albania", Montenegro: "Montenegro", Serbia: "Serbia", Slovakia: "Eslovaquia", Slovenia: "Eslovenia", Poland: "Polonia", Czechia: "Chequia", "Czech Republic": "República Checa", Austria: "Austria", Switzerland: "Suiza", Belgium: "Bélgica", Netherlands: "Países Bajos", Latvia: "Letonia", Lithuania: "Lituania", Estonia: "Estonia", Cyprus: "Chipre", Malta: "Malta", Tuscany: "Toscana", Lazio: "Lacio", Sicily: "Sicilia", Sardinia: "Cerdeña", Piedmont: "Piamonte", Lombardy: "Lombardía", Apulia: "Apulia", Puglia: "Apulia", Calabria: "Calabria", Abruzzo: "Abruzos", Liguria: "Liguria", Umbria: "Umbría", "Lake Como": "Lago de Como", Brittany: "Bretaña", Normandy: "Normandía", Andalusia: "Andalucía", Catalonia: "Cataluña" };
const PLACE_RE = new RegExp(`(^|, |· |\\()(${Object.keys(COUNTRIES).sort((a, b) => b.length - a.length).map(esc).join("|")})(?=$|,|\\s·|\\)|\\s\\d)`, "g");
/** Spanish name of a country or region the site knows ("Spain" -> "España"), else the name itself. */
export const esPlace = (n: string) => COUNTRIES[n] || n;
function places(s: string): string {
  if (!/[A-Z]/.test(s)) return s;
  // location notes in the data: "Skåne (about 60 min from Copenhagen)"
  return s.replace(PLACE_RE, (_m, pre, c) => pre + (COUNTRIES[c] || c)).replace(/\(about (\d+) min from ([^)]+)\)/g, "(a unos $1 min de $2)");
}

// counts built in code ("242 homes", "1 home in Spain") that the source templates can't express safely
const COUNTS: [RegExp, (m: RegExpExecArray) => string][] = [
  [/^([\d.,]+) homes? in (.+)$/, (m) => `${m[1]} ${m[1] === "1" ? "casa" : "casas"} en ${lookup(m[2], 1) ?? places(m[2])}`],
  [/^([\d.,]+) homes?$/, (m) => `${m[1]} ${m[1] === "1" ? "casa" : "casas"}`],
  [/^(\d+) ?(min|m|h|d) ago$/, (m) => `hace ${m[1]} ${m[2] === "m" ? "min" : m[2]}`],
  [/^(\d+) (minute|hour|day|week|month|year)s? ago$/, (m) => { const one = m[1] === "1"; const w: Record<string, [string, string]> = { minute: ["minuto", "minutos"], hour: ["hora", "horas"], day: ["día", "días"], week: ["semana", "semanas"], month: ["mes", "meses"], year: ["año", "años"] }; return `hace ${m[1]} ${w[m[2]][one ? 0 : 1]}`; }],
  [/^(\d+) of (\d+)$/, (m) => `${m[1]} de ${m[2]}`],
  [/^(Updated|Last updated) (\d+ ?\w+ ago)$/, (m) => `Actualizada ${lookup(m[2], 1) ?? m[2]}`],
  [/^([\d.,]+) (votes?|points?|photos?|bedrooms?|beds?|days?|hours?|minutes?|projects?|reviews?|questions?|answers?|developers?|buyers?|people|views?|saves?|new)$/, (m) => {
    const one = m[1] === "1"; const w: Record<string, [string, string]> = { vote: ["voto", "votos"], point: ["punto", "puntos"], photo: ["foto", "fotos"], bedroom: ["dormitorio", "dormitorios"], bed: ["dorm.", "dorm."], day: ["día", "días"], hour: ["hora", "horas"], minute: ["minuto", "minutos"], project: ["proyecto", "proyectos"], review: ["opinión", "opiniones"], question: ["pregunta", "preguntas"], answer: ["respuesta", "respuestas"], developer: ["promotora", "promotoras"], buyer: ["comprador", "compradores"], people: ["personas", "personas"], view: ["visita", "visitas"], save: ["guardado", "guardados"], new: ["nueva", "nuevas"] };
    const k = m[2].replace(/s$/, "") in w ? m[2].replace(/s$/, "") : m[2]; const x = w[k]; return x ? `${m[1]} ${one ? x[0] : x[1]}` : m[0]; }],
];

function lookup(core: string, depth = 0): string | null {
  if (cache.has(core)) return cache.get(core)!;
  let out: string | null = dict[core] ?? null;
  if (out == null) for (const [re, f] of COUNTS) { const m = re.exec(core); if (m) { out = f(m); break; } }
  if (out == null && depth < 2 && /[A-Za-z]/.test(core) && core.length < 400) {
    for (const p of pats) {
      const m = p.re.exec(core);
      if (!m) continue;
      out = p.out.replace(/\{(\d)\}/g, (_x, i) => { const g = m[Number(i) + 1] ?? ""; return lookup(g.trim(), depth + 1) ?? money(places(g)); });
      break;
    }
  }
  if (out == null && depth < 3 && core.length < 600) out = composite(core, depth);
  if (cache.size > 5000) cache.clear();
  cache.set(core, out);
  return out;
}

// 8-nov-2026: labels built around a home title ("3. <title>, €79,800, RealHunt score 98", "<title>, Ranum, Denmark",
// "<title>, 4" for photo 4) are translated from the title's own entry plus each remaining comma-separated piece.
function composite(core: string, depth: number): string | null {
  const num = /^(\d+\. )([\s\S]+)$/.exec(core);
  if (num) { const r = lookup(num[2], depth + 1); return r == null ? null : num[1] + r; }
  if (!core.includes(", ")) return null;
  const segs = core.split(", ");
  for (let i = segs.length - 1; i >= 1; i--) {
    const hit = dict[segs.slice(0, i).join(", ")];
    if (hit == null) continue;
    return [hit, ...segs.slice(i).map((x) => lookup(x, depth + 1) ?? places(x))].join(", ");
  }
  return null;
}

// Long generated texts ("Villas in Ubud, Bali, by X. From €95,000. Ready to move in.") and titles
// joined with " · " are translated piece by piece when the whole string has no entry.
function pieces(core: string): string | null {
  for (const sep of [" · ", " | "]) {
    if (!core.includes(sep)) continue;
    const segs = core.split(sep);
    const out = segs.map((x) => lookup(x.trim()) ?? pieces(x.trim()) ?? places(x));
    return out.some((x, i) => x !== segs[i]) ? out.join(sep) : null;
  }
  const sents = core.replace(/([.!?]) (?=[A-Z0-9€¿¡“"])/g, "$1\u0001").split("\u0001"); // no lookbehind: older Safari
  if (sents.length < 2) return null;
  const out = sents.map((x) => lookup(x) ?? places(x));
  return out.some((x, i) => x !== sents[i]) ? out.join(" ") : null;
}

/** 8-nov-2026: homes carry their own Spanish (title_es, why_great_es, why_cheap_es; the live search writes them for
 * every home it publishes). Registered as dictionary entries, so every card, page and list that shows the English text
 * shows the Spanish one instead, with no change to the components. */
export function learnTexts(rows: unknown): void {
  if (current !== "es" || !Array.isArray(rows)) return;
  const d: Record<string, string> = {};
  for (const r of rows as Record<string, unknown>[]) {
    if (!r || typeof r !== "object") continue;
    for (const k of ["title", "why_great", "why_cheap"]) {
      const en = typeof r[k] === "string" ? (r[k] as string).trim() : "";
      const es = typeof r[k + "_es"] === "string" ? (r[k + "_es"] as string).trim() : "";
      if (en && es && en !== es && dict[en] !== es) d[en] = es;
    }
  }
  if (!Object.keys(d).length) return;
  Object.assign(dict, d); cache.clear(); gen++;
  if (started) { walk(document.body); titleLast = ""; doTitle(); }
}

/** Translate one visible string. Returns the input when no translation exists. */
export function tr(s: string): string {
  if (current !== "es" || !s) return s;
  const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s)!;
  const core = m[2];
  if (!core || !/[A-Za-z€\d]/.test(core)) return s;
  let hit = lookup(core);
  if (hit == null && core.length < 1500) hit = pieces(core);
  return m[1] + money(hit ?? places(core)) + m[3];
}

// ---------------------------------------------------------------- DOM pass
const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "CODE", "PRE", "svg", "SVG"]);
const ATTRS = ["placeholder", "title", "aria-label", "alt"];
// What each node was last translated to, and with which dictionary generation: a node seen before the home
// titles (or a home's own Spanish) arrived is translated again when the dictionary grows.
const mine = new WeakMap<Node, [string, number]>();
let gen = 0;

function skipEl(el: Element | null): boolean {
  for (let e = el, i = 0; e && i < 40; e = e.parentElement, i++) {
    if (SKIP.has(e.tagName)) return true;
    if (e.getAttribute && (e.getAttribute("translate") === "no" || e.classList?.contains("notranslate") || e.getAttribute("contenteditable") === "true")) return true;
  }
  return false;
}
function doText(n: Text) {
  const v = n.nodeValue || "";
  const seen = mine.get(n);
  if (seen && seen[0] === v && seen[1] === gen) return;
  if (!/[A-Za-z€\d]/.test(v) || skipEl(n.parentElement)) return;
  const t = tr(v);
  mine.set(n, [t, gen]);
  if (t !== v) n.nodeValue = t;
}
function doAttrs(el: Element) {
  for (const a of ATTRS) {
    const v = el.getAttribute(a);
    if (!v || !/[A-Za-z]/.test(v)) continue;
    const key = "a:" + a;
    if ((el as any)[key] === v && (el as any)[key + "g"] === gen) continue;
    const t = tr(v);
    (el as any)[key] = t; (el as any)[key + "g"] = gen;
    if (t !== v) el.setAttribute(a, t);
  }
  if (el.tagName === "INPUT" && /^(button|submit)$/i.test((el as HTMLInputElement).type)) {
    const v = (el as HTMLInputElement).value; const t = tr(v); if (t !== v) (el as HTMLInputElement).value = t;
  }
}
function walk(root: Node) {
  if (root.nodeType === 3) { doText(root as Text); return; }
  if (root.nodeType !== 1 && root.nodeType !== 11) return;
  if (root.nodeType === 1) { if (skipEl(root as Element)) return; doAttrs(root as Element); }
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let n: Node | null = tw.nextNode();
  while (n) { if (n.nodeType === 3) doText(n as Text); else doAttrs(n as Element); n = tw.nextNode(); }
}
let titleLast = "";
function doTitle() {
  const v = document.title;
  if (v && v !== titleLast) { const t = tr(v); titleLast = t; if (t !== v) document.title = t; }
  const md = document.querySelector('meta[name="description"]');
  const c = md?.getAttribute("content");
  if (md && c && (md as any).__t !== c) { const t = tr(c); (md as any).__t = t; md.setAttribute("content", t); }
}

let started = false;
function start() {
  if (started) return; started = true;
  walk(document.body); doTitle();
  const mo = new MutationObserver((list) => {
    for (const r of list) {
      if (r.type === "characterData") doText(r.target as Text);
      else if (r.type === "attributes") doAttrs(r.target as Element);
      else r.addedNodes.forEach((n) => walk(n));
    }
    doTitle();
  });
  mo.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  const head = document.querySelector("head > title");
  if (head) new MutationObserver(doTitle).observe(head, { childList: true, characterData: true, subtree: true });
}
function reveal() { document.documentElement.classList.remove("rh-i18n-wait"); }

async function load(file: string) {
  const r = await fetch(file);
  if (!r.ok) throw new Error(String(r.status));
  return (await r.json()) as Record<string, string>;
}

/** Called once from main.tsx before React renders. Never blocks for long. */
export async function initLang(): Promise<void> {
  try { const q = new URLSearchParams(location.search).get("lang"); if (q === "es" || q === "en") localStorage.setItem("rh_lang", q); } catch { /* ignore */ }
  try { document.documentElement.lang = current; document.documentElement.setAttribute("data-lang", current); } catch { /* ignore */ }
  if (current !== "es") { reveal(); return; }
  const safety = setTimeout(reveal, 1500);
  const legal = /^\/(legal|network|privacy|terms)/.test(location.pathname);
  try {
    const core = load("/i18n/es-core.json?v=3");
    const homes = load("/i18n/es-listings.json?v=3").catch(() => ({}));
    const extra = load("/i18n/es-extra.json?v=13");
    const data = load("/i18n/es-data.json?v=1").catch(() => ({})); // buying rules, guides... (scripts/build-es-data.mjs)
    // 7-nov-2026 (Carlos: "que cargue todo mucho más rápido"): the page used to stay hidden until the core AND the
    // listings dictionaries (~250 KB compressed) had loaded. Now only the core one holds the first paint; home titles
    // and the extra strings are applied as soon as they arrive.
    addDict(await core);
    const later = (p: Promise<Record<string, string>>) => p.then((d) => { addDict(d); if (started) { walk(document.body); titleLast = ""; doTitle(); } }).catch(() => {});
    if (legal) { addDict(await homes); addDict(await extra.catch(() => ({}))); addDict(await data); }
    else { later(homes); later(extra); later(data); }
  } catch { /* stay in English if the dictionary cannot load */ }
  clearTimeout(safety);
}
export function startLang() {
  if (typeof window !== "undefined" && !/^(localhost|127\.)/.test(location.hostname)) refineGeo();
  if (current !== "es") return;
  const go = () => { start(); requestAnimationFrame(reveal); };
  if (document.body) go(); else addEventListener("DOMContentLoaded", go);
}

// Search in Spanish (4-oct-2026): listings are stored in English, so Spanish words in the search box
// are turned into the English words the data uses. Generic words ("casa", "barata") are dropped so
// "casa en la playa" finds beach homes instead of nothing.
const ES_DROP = new Set(["casa","casas","vivienda","viviendas","inmueble","propiedad","barata","baratas","barato","baratos","en","la","el","los","las","de","del","con","y","a","al","por","para","un","una","cerca","junto","venta","comprar","menos","euros","€"]);
const ES_WORDS: Record<string, string> = { playa: "beach", mar: "sea", costa: "coast", pueblo: "village", aldea: "village", ciudad: "city", piscina: "pool", jardín: "garden", jardin: "garden", terraza: "terrace", montaña: "mountain", montana: "mountain", montañas: "mountain", lago: "lake", río: "river", rio: "river", campo: "countryside", rural: "rural", reformar: "renovat", reforma: "renovat", ruina: "ruin", piso: "apartment", apartamento: "apartment", estudio: "studio", chalet: "chalet", finca: "farm", granja: "farm", isla: "island", castillo: "castle", cabaña: "cabin", cabana: "cabin", bosque: "forest", vistas: "view", vista: "view", nieve: "ski", esquí: "ski", esqui: "ski", nueva: "new", nuevo: "new", obra: "build", madera: "wood", piedra: "stone", molino: "mill", iglesia: "church", japonesa: "Japan", japón: "Japan", japon: "Japan", italia: "Italy", francia: "France", españa: "Spain", espana: "Spain", suiza: "Switzerland", suecia: "Sweden", grecia: "Greece", alemania: "Germany", portugal: "Portugal" };
export function searchQuery(q: string): string {
  const raw = (q || "").trim();
  if (!raw) return "";
  const rev: Record<string, string> = {};
  for (const [en, es] of Object.entries(COUNTRIES)) rev[es.toLowerCase()] = en;
  let s = raw.toLowerCase();
  // multi-word Spanish place names first (Estados Unidos, Lago de Como, Reino Unido…)
  for (const es of Object.keys(rev).filter((k) => k.includes(" ")).sort((a, b) => b.length - a.length)) if (s.includes(es)) s = s.replace(es, " " + rev[es].toLowerCase() + " ");
  const out = s.split(/[\s,]+/).filter(Boolean).map((w) => rev[w] ? rev[w].toLowerCase() : ES_WORDS[w] ? ES_WORDS[w].toLowerCase() : ES_DROP.has(w) ? "" : w).filter(Boolean);
  return out.join(" ") || (ES_DROP.has(s.trim()) ? "" : raw);
}
