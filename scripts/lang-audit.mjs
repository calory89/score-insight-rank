#!/usr/bin/env node
// Language audit (8-nov-2026). Owner's rule: "Spanish only for people connecting from Spanish-speaking countries, the
// rest in English, but never mixed: everything properly translated, the cards, everything."
//
// Visits the key routes in Spanish and in English, opens the sign-in modal, the filters sheet and the search dropdown,
// collects every visible text plus aria-label / placeholder / title / alt, and flags the strings written in the other
// language (word-list heuristic: English function words on the Spanish site, Spanish ones on the English site; proper
// nouns, place names, brands and currencies are allowed). The live search page never starts a paid job: its POST and
// polls are answered from scripts/fixtures/lang-audit-live-job.json.
//
//   node scripts/lang-audit.mjs --base http://127.0.0.1:4237 [--lang es|en|both] [--out /tmp/lang-audit] [--only /live-search]
//   node scripts/lang-audit.mjs --base https://realhunt.co
//
// Prints a summary and writes <out>/lang-audit-<lang>.json with every finding (route, kind, text). Exit code 1 when
// anything is flagged. Text inside translate="no" / .notranslate (brand names, original listing text the visitor
// asked to see) is reported as an exception, never flagged.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const BASE = String(arg("base", "http://127.0.0.1:4237")).replace(/\/$/, "");
const LANGS = arg("lang", "both") === "both" ? ["es", "en"] : [arg("lang")];
const OUT = arg("out", "/tmp/lang-audit");
const ONLY = arg("only", "");
const here = path.dirname(new URL(import.meta.url).pathname);
const JOB = JSON.parse(fs.readFileSync(path.join(here, "fixtures", "lang-audit-live-job.json"), "utf8"));

// ---------------------------------------------------------------- routes
const ROUTES = [
  "/", "/?q=" + encodeURIComponent("casa con jardin en Portugal"), "/?country=Spain", "/?q=" + encodeURIComponent("3 bedroom house near the sea under 200k"),
  "/deal/us-tampa-8105-325k", "/deal/us-fort-lauderdale-2455-e102-150k", "/deal/es-archez-75k-ni4va0", "/deal/lake-como-peglio-85000",
  "/deal/dk-ranum-79k-6d9fbd", "/deal/jp-fuji-66k-852751", "/deal/fr-durban-corbieres-80k-ke4gw6", "/deal/pt-tavira-183k-300012", "/deal/us-freeport-83k-605154",
  "/map", "/top", "/new", "/homes/spain", "/homes/italy", "/homes/united-states", "/guide/spain", "/guide/japan", "/costs/spain", "/costs/italy",
  "/can-i-buy", "/can-i-buy/british-in-spain", "/can-i-buy/american-in-japan", "/buying-costs/portugal", "/buying-costs/united-states",
  "/compare?ids=1ce2a768-fb96-44f5-8476-e542b13f6870,1d6e45f5-5584-4396-8f8b-44d39130ae49,366a4c01-1d7e-4f89-9ace-20728826c1e7",
  "/live-search", "/live-search?q=" + encodeURIComponent(JOB.parsed ? "3 bedroom house in Tampa under $350k" : "x"),
  "/live-search?q=" + encodeURIComponent("Casas en madrid moderna 3 habitaciones por menos de 200.000"),
  "/hunt/saved", "/alerts", "/blog", "/blog/cheap-houses-japan-move-in-ready", "/about", "/method", "/find-my-home", "/best", "/no-such-page-xyz",
];

// ---------------------------------------------------------------- the heuristic
// Words that are only English (never Spanish), and only Spanish (never English). Short, frequent and unambiguous.
const EN = new Set(("the and with for your you is are this that these those from of to on by at or our we it its how what why which who can will " +
  "not all see show more less than about after before per month year home homes house houses search find buy sell near under over check checked " +
  "price prices bedroom bedrooms bed beds score new save saved sign open close back next view listing listings cheap here there when where " +
  "has have was were be been been only also just any each every other into out up down off get got they them their there's don't it's you're " +
  "like most best good great free today now yet still very much many some such then so if do does did done one two three four five six " +
  "agents agent portals web estate searching found homes, to buy to rent bedrooms filter filters sort clear apply reset share copy loading " +
  "ai-checked checked week weekly daily ago tax taxes costs fees buyers buyer foreign foreigners guide guides map list grid").split(/\s+/).filter((w) => w && !w.includes(" ")));
const ES = new Set(("el los las del con para por una unos unas que más casa casas buscar precio precios comprar vender dormitorio dormitorios habitaciones " +
  "ver todo todos todas nuestro nuestra nuestros tu tus sus esta este estos estas desde hasta cerca también solo sólo cada otro otra muy mucho " +
  "puntuación nota barata baratas barato vivienda viviendas inmobiliarias portales guardar guardadas cerrar abrir siguiente anterior aquí hoy " +
  "semana impuestos gastos compradores extranjeros guía mapa lista buscando encontradas encontrado alquilar como cuando donde pero sin sobre entre hay es son está están").split(/\s+/).filter(Boolean));
// Words both languages share or that are names: never counted.
const ALLOW = new Set(("realhunt hunt ok ai? email e-mail wifi online pdf url iban swift hoa cdd mls usd eur gbp chf sek dkk nok jpy mxn cad aud m² m2 km " +
  "instagram facebook tiktok youtube x whatsapp telegram google apple stripe coldwell banker idealista fotocasa immoscout24 rightmove zillow " +
  "airbnb booking linkedin github cookies spam no a e o y u de la en san santa del").split(/\s+/));
// Common place-name words that look like English/Spanish function words (Lake Como, Puerto Naos, Costa del Sol...)
const PLACE_LIKE = /\b(Lake Como|Lago de Como|Lake|Beach|Bay|Island|Islands|Springs|Park|Heights|Estates|Mansions|North|South|East|West|New|Fort|Port|Saint|St\.?|Mount|Puerto|Playa|Costa|Sierra|Villa|Casa|Torre|Cala|Monte|Río|Rio|Nueva|Nuevo|Las|Los|La|El|Del|De)\b/g;

function words(s) {
  return s.replace(/https?:\S+/g, " ").replace(/\b[\w-]+(\.[\w-]+)+(\/\S*)?/g, " ").replace(/[\d€$£%.,:;!?¡¿()\[\]{}"“”'’·|/+=*#@&<>…–-]+/g, " ").split(/\s+/).filter(Boolean);
}
/** Counts the words of each language. Capitalised words after the first are treated as names and skipped. */
export function score(text) {
  if (text === text.toUpperCase()) text = text.toLowerCase(); // "¿HAS VISTO UNA...?" (CSS or written in capitals)
  const ws = words(text.replace(PLACE_LIKE, " "));
  let en = 0, es = 0, n = 0; const enW = [], esW = [];
  ws.forEach((w, i) => {
    const lw = w.toLowerCase();
    if (ALLOW.has(lw)) return;
    if (i > 0 && /^[A-ZÁÉÍÓÚÑ]/.test(w) && !/^(AI|I)$/.test(w)) return; // a name ("Buffalo Estates", "Tampa")
    n++;
    if (w === "AI" || EN.has(lw)) { en++; enW.push(lw); }
    if (ES.has(lw)) { es++; esW.push(lw); }
  });
  return { en, es, n, enW, esW };
}
/** Is this string in the wrong language for the page? */
export function wrong(text, lang, query = "") {
  let t = text.replace(/\s+/g, " ").trim();
  // the visitor's own search words are theirs, in whatever language they typed them
  if (query) t = t.split(query).join(" ").replace(/[“”"]\s*[“”"]/g, " ").trim();
  if (t.length < 2 || !/[A-Za-zÀ-ÿ]/.test(t)) return false;
  if (/\p{Regional_Indicator}/u.test(t) && t.split(" ").length <= 3) return false; // the EN / ES switch ("🇪🇸 ES")
  const s = score(t);
  if (lang === "es") return s.en >= 2 ? s.en > s.es : s.en === 1 && s.es === 0 && s.n <= 6;
  return s.es >= 2 ? s.es > s.en : s.es === 1 && s.en === 0 && s.n <= 4 && !/^(de|la|el|del|con|y)$/.test(s.esW[0]);
}

// ---------------------------------------------------------------- collecting
function collectInPage() {
  const out = []; const ex = [];
  const vis = (el) => {
    if (!el || !(el instanceof Element)) return false;
    if (el.closest("[aria-hidden=true],[hidden],template,script,style,noscript")) return false;
    const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false;
    const cs = getComputedStyle(el); if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) === 0) return false;
    return true;
  };
  const skip = (el) => el.closest('[translate="no"],.notranslate,[contenteditable="true"],code,pre,textarea,svg');
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = tw.nextNode())) {
    const v = (n.nodeValue || "").replace(/\s+/g, " ").trim();
    if (!v || !/[A-Za-zÀ-ÿ]/.test(v)) continue;
    const el = n.parentElement; if (!vis(el)) continue;
    // a whole sentence split over inline elements (<b>3</b> homes found) is judged as one string
    const block = el.closest("p,li,h1,h2,h3,h4,button,a,label,summary,figcaption,td,th,dt,dd,span,div") || el;
    const full = (block.innerText || v).replace(/\s+/g, " ").trim().slice(0, 400);
    (skip(el) ? ex : out).push({ kind: "text", text: full.length < 400 && full.split(" ").length <= 60 ? full : v, tag: el.tagName.toLowerCase(), cls: String(el.className || "").slice(0, 60) });
  }
  for (const el of document.querySelectorAll("[aria-label],[placeholder],[title],img[alt]")) {
    if (!vis(el) && !(el.tagName === "INPUT" || el.tagName === "BUTTON")) continue;
    for (const a of ["aria-label", "placeholder", "title", "alt"]) {
      const v = el.getAttribute(a); if (!v || !/[A-Za-z]/.test(v)) continue;
      (skip(el) ? ex : out).push({ kind: a, text: v.trim(), tag: el.tagName.toLowerCase(), cls: String(el.className || "").slice(0, 60) });
    }
  }
  out.push({ kind: "title", text: document.title, tag: "title", cls: "" });
  return { out, ex };
}

async function mockLive(page) {
  let polls = 0;
  await page.route(/functions\/v1\/realhunt-live-search/, async (route) => {
    const req = route.request();
    if (req.method() === "OPTIONS") return route.fulfill({ status: 200, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*" }, body: "ok" });
    const body = req.method() === "POST" ? { job_id: "00000000-0000-4000-8000-000000000001", status: "queued", parsed: JOB.parsed, cached: true }
      : ++polls < 3 ? { ...JOB, status: "running", progress: 40, stage: { k: "agents" }, results: JOB.results.slice(0, 1), found: 1, hidden: 0 }
      : JOB;
    return route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(body) });
  });
}

async function interactions(page, route) {
  const extra = [];
  const grab = async (label) => { await page.waitForTimeout(500); const r = await page.evaluate(collectInPage); extra.push(...r.out.map((x) => ({ ...x, via: label }))); };
  const tryClick = async (loc) => { try { if (await loc.count()) { await loc.first().click({ timeout: 2500 }); return true; } } catch { /* ignore */ } return false; };
  const close = async () => { await page.keyboard.press("Escape").catch(() => {}); await page.waitForTimeout(250); };
  if (route === "/") {
    if (await tryClick(page.locator(".hunt-signin, button:has-text('Sign in'), button:has-text('Entrar'), button:has-text('Iniciar sesión')"))) { await grab("sign-in"); await close(); }
    if (await tryClick(page.locator("button:has-text('Filters'), button:has-text('Filtros'), [aria-label='Filters'], [aria-label='Filtros']"))) { await grab("filters"); await close(); }
    const box = page.locator("input[type=search], input[role=combobox]").first();
    if (await box.count()) { try { await box.click({ timeout: 2000 }); await box.fill("mal"); await grab("search-dropdown"); await box.fill(""); } catch { /* ignore */ } await close(); }
  }
  if (route.startsWith("/live-search?q=")) { await page.waitForTimeout(6500); await grab("live-done"); }
  return extra;
}

async function auditLang(browser, lang) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: lang === "es" ? "es-ES" : "en-US", timezoneId: lang === "es" ? "Europe/Madrid" : "America/New_York" });
  await ctx.addInitScript((l) => { try { localStorage.setItem("rh_lang", l); } catch { /* ignore */ } }, lang);
  const findings = []; const exceptions = []; const errors = [];
  const routes = ONLY ? ROUTES.filter((r) => r.startsWith(ONLY)) : ROUTES;
  for (const route of routes) {
    const page = await ctx.newPage();
    const query = (() => { try { return new URL(BASE + route).searchParams.get("q") || ""; } catch { return ""; } })();
    page.on("pageerror", (e) => errors.push({ route, error: String(e).slice(0, 200) }));
    await mockLive(page);
    try {
      await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 45000 });
      await page.waitForLoadState("networkidle", { timeout: 12000 }).catch(() => {});
      await page.waitForTimeout(1200);
      // scroll so lazy sections render
      for (let y = 0; y < 6; y++) { await page.mouse.wheel(0, 1400); await page.waitForTimeout(250); }
      await page.waitForTimeout(500);
      const r = await page.evaluate(collectInPage);
      const all = [...r.out, ...(await interactions(page, route))];
      const seen = new Set();
      for (const x of all) {
        const key = x.kind + "|" + x.text;
        if (seen.has(key)) continue; seen.add(key);
        if (wrong(x.text, lang, query)) findings.push({ route, ...x });
        else if (query && x.text.includes(query) && wrong(x.text, lang)) exceptions.push({ route, why: "the visitor's own search", ...x });
      }
      for (const x of r.ex) if (wrong(x.text, lang)) exceptions.push({ route, ...x });
    } catch (e) { errors.push({ route, error: String(e).slice(0, 200) }); }
    await page.close();
  }
  await ctx.close();
  return { findings, exceptions, errors };
}

const browser = await chromium.launch();
fs.mkdirSync(OUT, { recursive: true });
let total = 0;
for (const lang of LANGS) {
  const res = await auditLang(browser, lang);
  const uniq = new Map();
  for (const f of res.findings) { const k = f.kind + "|" + f.text; const e = uniq.get(k) || { ...f, routes: [] }; e.routes.push(f.route); uniq.set(k, e); }
  fs.writeFileSync(path.join(OUT, `lang-audit-${lang}.json`), JSON.stringify({ lang, base: BASE, findings: [...uniq.values()], exceptions: res.exceptions, errors: res.errors }, null, 1));
  console.log(`\n== ${lang.toUpperCase()}: ${uniq.size} wrong-language strings (${res.findings.length} occurrences), ${res.exceptions.length} exceptions, ${res.errors.length} errors`);
  for (const f of [...uniq.values()].slice(0, Number(arg("show", 400)))) console.log(`  [${f.kind}] ${f.text.slice(0, 160)}  <- ${f.routes.slice(0, 3).join(" ")}${f.routes.length > 3 ? " +" + (f.routes.length - 3) : ""}`);
  for (const e of res.errors.slice(0, 10)) console.log("  ERROR", e.route, e.error);
  total += uniq.size;
}
await browser.close();
process.exit(total ? 1 : 0);
