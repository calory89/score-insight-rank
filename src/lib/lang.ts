// RealHunt language layer (1-oct-2026).
// Visitors from Spain or a Spanish-speaking country (browser language or time zone) see the site in
// Spanish, everyone else in English. The choice can be changed with the EN/ES switch and is remembered.
// Components keep writing English; this module swaps the rendered text in place (text nodes and a few
// attributes) from a dictionary built from the source code, so no page can be left half translated.
export type Lang = "en" | "es";

const ES_TZ = /^(Europe\/Madrid|Africa\/Ceuta|Atlantic\/Canary|Africa\/Malabo|America\/(Mexico_City|Cancun|Merida|Monterrey|Matamoros|Chihuahua|Ciudad_Juarez|Ojinaga|Mazatlan|Bahia_Banderas|Hermosillo|Tijuana|Bogota|Lima|Santiago|Punta_Arenas|Argentina\/.+|Buenos_Aires|Cordoba|Mendoza|Caracas|Montevideo|Asuncion|La_Paz|Guayaquil|Guatemala|El_Salvador|Tegucigalpa|Managua|Costa_Rica|Panama|Havana|Santo_Domingo|Puerto_Rico)|Pacific\/(Easter|Galapagos))$/;

export function detectLang(): Lang {
  try {
    const q = new URLSearchParams(location.search).get("lang");
    if (q === "es" || q === "en") return q;
    const saved = localStorage.getItem("rh_lang");
    if (saved === "es" || saved === "en") return saved;
  } catch { /* storage blocked */ }
  try {
    const langs = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || "en"]).map((l) => String(l).toLowerCase());
    if (langs[0]?.startsWith("es")) return "es";
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (ES_TZ.test(tz)) return "es";
  } catch { /* ignore */ }
  return "en";
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
  cache.clear();
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
  o = o.replace(/\b(\d{1,3}(?:,\d{3})+)\b/g, (m) => m.replace(/,/g, "."));
  o = o.replace(/(\d) €/g, "$1\u00A0€");
  o = o.replace(/\b(\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept?|Oct|Nov|Dec|January|February|March|April|June|July|August|September|October|November|December)\b/g, (_m, d, mo) => `${d} ${MONTHS[mo] || mo}`);
  o = o.replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept?|Oct|Nov|Dec|January|February|March|April|June|July|August|September|October|November|December) (\d{1,2}), (\d{4})\b/g, (_m, mo, d, y) => `${d} ${MONTHS[mo] || mo} ${y}`);
  return o;
}

const COUNTRIES: Record<string, string> = { Spain: "España", Italy: "Italia", "St. Gallen": "San Galo", Bern: "Berna", Geneva: "Ginebra", Lucerne: "Lucerna", Grisons: "Grisones", Ticino: "Tesino", Sweden: "Suecia", Japan: "Japón", "United States": "Estados Unidos", USA: "EE. UU.", Mexico: "México", Canada: "Canadá", France: "Francia", Portugal: "Portugal", Germany: "Alemania", Greece: "Grecia", Croatia: "Croacia", Bulgaria: "Bulgaria", Romania: "Rumanía", Hungary: "Hungría", Finland: "Finlandia", Norway: "Noruega", Denmark: "Dinamarca", Scandinavia: "Escandinavia", Ireland: "Irlanda", "United Kingdom": "Reino Unido", Thailand: "Tailandia", Indonesia: "Indonesia", Georgia: "Georgia", Turkey: "Turquía", Morocco: "Marruecos", Brazil: "Brasil", Argentina: "Argentina", Panama: "Panamá", "Costa Rica": "Costa Rica", Philippines: "Filipinas", Vietnam: "Vietnam", Malaysia: "Malasia", Albania: "Albania", Montenegro: "Montenegro", Serbia: "Serbia", Slovakia: "Eslovaquia", Slovenia: "Eslovenia", Poland: "Polonia", Czechia: "Chequia", "Czech Republic": "República Checa", Austria: "Austria", Switzerland: "Suiza", Belgium: "Bélgica", Netherlands: "Países Bajos", Latvia: "Letonia", Lithuania: "Lituania", Estonia: "Estonia", Cyprus: "Chipre", Malta: "Malta", Tuscany: "Toscana", Lazio: "Lacio", Sicily: "Sicilia", Sardinia: "Cerdeña", Piedmont: "Piamonte", Lombardy: "Lombardía", Apulia: "Apulia", Puglia: "Apulia", Calabria: "Calabria", Abruzzo: "Abruzos", Liguria: "Liguria", Umbria: "Umbría", "Lake Como": "Lago de Como", Brittany: "Bretaña", Normandy: "Normandía", Andalusia: "Andalucía", Catalonia: "Cataluña" };
const PLACE_RE = new RegExp(`(^|, |· |\\()(${Object.keys(COUNTRIES).sort((a, b) => b.length - a.length).map(esc).join("|")})(?=$|,|\\s·|\\)|\\s\\d)`, "g");
function places(s: string): string { return /[A-Z]/.test(s) ? s.replace(PLACE_RE, (_m, pre, c) => pre + (COUNTRIES[c] || c)) : s; }

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
  if (cache.size > 5000) cache.clear();
  cache.set(core, out);
  return out;
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
const mine = new WeakMap<Node, string>();

function skipEl(el: Element | null): boolean {
  for (let e = el, i = 0; e && i < 40; e = e.parentElement, i++) {
    if (SKIP.has(e.tagName)) return true;
    if (e.getAttribute && (e.getAttribute("translate") === "no" || e.classList?.contains("notranslate") || e.getAttribute("contenteditable") === "true")) return true;
  }
  return false;
}
function doText(n: Text) {
  const v = n.nodeValue || "";
  if (mine.get(n) === v) return;
  if (!/[A-Za-z€\d]/.test(v) || skipEl(n.parentElement)) return;
  const t = tr(v);
  mine.set(n, t);
  if (t !== v) n.nodeValue = t;
}
function doAttrs(el: Element) {
  for (const a of ATTRS) {
    const v = el.getAttribute(a);
    if (!v || !/[A-Za-z]/.test(v)) continue;
    const key = "a:" + a;
    if ((el as any)[key] === v) continue;
    const t = tr(v);
    (el as any)[key] = t;
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
  try { document.documentElement.lang = current; document.documentElement.setAttribute("data-lang", current); } catch { /* ignore */ }
  if (current !== "es") { reveal(); return; }
  const safety = setTimeout(reveal, 2500);
  const legal = /^\/(legal|network|privacy|terms)/.test(location.pathname);
  try {
    const core = load("/i18n/es-core.json?v=1");
    const homes = load("/i18n/es-listings.json?v=1").catch(() => ({}));
    const extra = load("/i18n/es-extra.json?v=1");
    addDict(await core); addDict(await homes);
    if (legal) addDict(await extra.catch(() => ({})));
    else extra.then((d) => { addDict(d); if (started) walk(document.body); }).catch(() => {});
  } catch { /* stay in English if the dictionary cannot load */ }
  clearTimeout(safety);
}
export function startLang() {
  if (current !== "es") return;
  const go = () => { start(); requestAnimationFrame(reveal); };
  if (document.body) go(); else addEventListener("DOMContentLoaded", go);
}
