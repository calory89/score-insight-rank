// Measurement helpers (15-nov-2026, ideas 702, 916, 924 and 936 of the organic list). Loaded when the browser is idle
// from src/main.tsx, never in the entry bundle. It adds nothing new to the page: it only sends a few extra events to
// the Google Analytics tag that is already there (injected by the hosting worker), and only when
//   - the visitor accepted analytics in the cookie banner (localStorage rh_consent === "all"), and
//   - window.gtag exists.
// No personal data: a page family, a language, a fixed source name ("chatgpt", "bing") and the name of an action.
// Never an address, a search string or an identifier.
//   rh_landing            once per session: landing_family, source_kind (ai, search, social, direct, other), source
//   rh_ai_referral        once per session, when the visit came from an AI assistant: source, landing_family
//   rh_family_view        on every page: page_family, page_lang
//   rh_value              a saved home, an alert, a click to the original listing...: action, landing_family, source_kind
//   rh_search_no_results  a search of the site that found nothing: term_kind ("country:croatia" or "other")
// To read them in GA4 the owner registers page_family, landing_family, source_kind and action as custom dimensions
// (docs/seo/owner-steps.md).
import { VALUE_EVENTS, classifySource, emptySearchKind, familyOf, langOf, type Source } from "./core";

type Landing = Source & { family: string };
const consent = () => { try { return localStorage.getItem("rh_consent") === "all"; } catch { return false; } };
const queue: [string, Record<string, string>][] = [];
let timer: ReturnType<typeof setInterval> | null = null, tries = 0;

function flush() {
  const g = (window as any).gtag;
  if (typeof g !== "function" || !consent()) return false;
  while (queue.length) { const [name, params] = queue.shift()!; try { g("event", name, params); } catch { /* analytics must never break the page */ } }
  return true;
}
/** Sends an event, or keeps it for a few seconds while the analytics tag loads. Dropped without consent. */
export function send(name: string, params: Record<string, string>) {
  if (!consent()) return;
  if (queue.length < 30) queue.push([name, params]);
  if (flush() || timer) return;
  tries = 0;
  timer = setInterval(() => { if (flush() || ++tries > 20) { clearInterval(timer!); timer = null; queue.length = 0; } }, 1000);
}

function landing(): Landing {
  try { const had = JSON.parse(sessionStorage.getItem("rh_land") || "null"); if (had && typeof had.family === "string") return had; } catch { /* storage blocked */ }
  const l: Landing = { ...classifySource(document.referrer, location.search, location.hostname), family: familyOf(location.pathname) };
  try { sessionStorage.setItem("rh_land", JSON.stringify(l)); sessionStorage.setItem("rh_land_new", "1"); } catch { /* storage blocked */ }
  return l;
}

let lastPath = "";
function view() {
  const path = location.pathname;
  if (path === lastPath) return;
  lastPath = path;
  const land = landing();
  let fresh = false; try { fresh = sessionStorage.getItem("rh_land_new") === "1"; if (fresh && consent()) sessionStorage.removeItem("rh_land_new"); } catch { fresh = false; }
  if (fresh) {
    send("rh_landing", { landing_family: land.family, source_kind: land.kind, source: land.source, page_lang: langOf(path) });
    if (land.kind === "ai") send("rh_ai_referral", { source: land.source, landing_family: land.family });
  }
  send("rh_family_view", { page_family: familyOf(path), page_lang: langOf(path) });
  // a search of the site that found nothing (the "no homes for ... yet" box of src/community/scores.tsx)
  const q = new URLSearchParams(location.search).get("q");
  if (q) setTimeout(() => {
    if (location.pathname !== path || !document.querySelector(".rk-near-head")) return;
    const names = Array.from(document.querySelectorAll('a[href^="/homes/"]')).map((a) => (a.getAttribute("href") || "").split("/")[2] || "").filter(Boolean).map((s) => s.replace(/-/g, " "));
    send("rh_search_no_results", { term_kind: emptySearchKind(q, [...new Set([...names, ...COUNTRIES])]), page_lang: langOf(path) });
  }, 3500);
  // /research/find-homes reached from inside the app: its script is not run by React, so it is loaded here
  setTimeout(() => { if (document.querySelector("form[data-rh-find]") && !(window as any).__rhFind && !document.getElementById("rh-find-js")) { const s = document.createElement("script"); s.id = "rh-find-js"; s.src = "/rh-find.js"; document.head.appendChild(s); } }, 400);
}
// Countries people ask for; used only to say which one a search with no results named.
const COUNTRIES = ["spain", "italy", "france", "portugal", "greece", "croatia", "bulgaria", "romania", "germany", "poland", "sweden", "denmark", "norway", "finland", "netherlands", "belgium", "ireland", "united kingdom", "switzerland", "austria", "hungary", "turkey", "cyprus", "malta", "japan", "thailand", "indonesia", "mexico", "canada", "united states", "brazil", "argentina", "colombia", "morocco", "albania", "montenegro", "georgia", "espana", "italia", "francia", "grecia", "croacia", "alemania", "polonia", "suecia", "dinamarca", "japon"];

let started = false;
export function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  for (const m of ["pushState", "replaceState"] as const) {
    const orig = history[m];
    history[m] = function (this: History, ...args: Parameters<History["pushState"]>) { const r = orig.apply(this, args); setTimeout(view, 0); return r; } as History["pushState"];
  }
  window.addEventListener("popstate", () => setTimeout(view, 0));
  // the visitor answers the cookie banner after the page loaded: the landing is sent then
  window.addEventListener("rh:consent", () => { lastPath = ""; view(); });
  window.addEventListener("rh:track", (e) => {
    const action = VALUE_EVENTS[String((e as CustomEvent).detail || "")];
    if (!action) return;
    const land = landing();
    send("rh_value", { action, landing_family: land.family, source_kind: land.kind, source: land.source, page_family: familyOf(location.pathname) });
  });
  view();
}
