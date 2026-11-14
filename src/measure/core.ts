// Pure helpers of the measurement module (no window, no storage), so they can be tested and reused.
import families from "../../seo/reach/families.json";

const RULES: [string, RegExp][] = (families.families as string[][]).map(([name, re]) => [name, new RegExp(re)]);
export const stripEs = (path: string) => (path === "/es" ? "/" : path.startsWith("/es/") ? path.slice(3) : path) || "/";
export const langOf = (path: string) => (path === "/es" || path.startsWith("/es/") ? "es" : "en");
/** The family of a page (front, home, country, listing, guide...): the unit every report is grouped by. */
export function familyOf(path: string): string {
  const p = stripEs(String(path || "/").replace(/[?#].*$/, "").replace(/\/+$/, "") || "/");
  for (const [name, re] of RULES) if (re.test(p)) return name;
  return "app";
}

export type Source = { kind: "ai" | "search" | "social" | "direct" | "internal" | "other"; source: string };
// Hosts are matched on their end, so chat.openai.com and www.perplexity.ai both count.
const AI: [RegExp, string][] = [
  [/(^|\.)chatgpt\.com$|(^|\.)chat\.openai\.com$|(^|\.)openai\.com$/, "chatgpt"], [/(^|\.)perplexity\.ai$/, "perplexity"], [/(^|\.)claude\.ai$/, "claude"],
  [/^gemini\.google\.com$|^bard\.google\.com$/, "gemini"], [/^copilot\.microsoft\.com$|(^|\.)copilot\.com$/, "copilot"], [/(^|\.)you\.com$/, "you"], [/(^|\.)phind\.com$/, "phind"],
  [/^chat\.mistral\.ai$/, "mistral"], [/(^|\.)meta\.ai$/, "meta-ai"], [/(^|\.)deepseek\.com$/, "deepseek"], [/(^|\.)grok\.com$/, "grok"],
];
const SEARCH: [RegExp, string][] = [
  [/(^|\.)google\.[a-z.]{2,6}$/, "google"], [/(^|\.)bing\.com$/, "bing"], [/(^|\.)duckduckgo\.com$/, "duckduckgo"], [/(^|\.)yandex\.[a-z.]{2,6}$|^ya\.ru$/, "yandex"], [/(^|\.)ecosia\.org$/, "ecosia"],
  [/^search\.brave\.com$/, "brave"], [/(^|\.)qwant\.com$/, "qwant"], [/(^|\.)startpage\.com$/, "startpage"], [/(^|\.)baidu\.com$/, "baidu"], [/(^|\.)naver\.com$/, "naver"], [/(^|\.)seznam\.cz$/, "seznam"],
  [/(^|\.)yahoo\.[a-z.]{2,6}$/, "yahoo"], [/(^|\.)kagi\.com$/, "kagi"], [/(^|\.)mojeek\.com$/, "mojeek"], [/(^|\.)yep\.com$/, "yep"],
];
const SOCIAL: [RegExp, string][] = [
  [/(^|\.)x\.com$|(^|\.)twitter\.com$|^t\.co$/, "x"], [/(^|\.)facebook\.com$|^fb\.me$/, "facebook"], [/(^|\.)instagram\.com$/, "instagram"], [/(^|\.)linkedin\.com$|^lnkd\.in$/, "linkedin"],
  [/(^|\.)reddit\.com$/, "reddit"], [/(^|\.)youtube\.com$|^youtu\.be$/, "youtube"], [/(^|\.)pinterest\.[a-z.]{2,6}$/, "pinterest"], [/(^|\.)tiktok\.com$/, "tiktok"], [/^t\.me$|(^|\.)telegram\.org$/, "telegram"], [/(^|\.)whatsapp\.com$|^wa\.me$/, "whatsapp"],
];
const find = (host: string, list: [RegExp, string][]) => { for (const [re, name] of list) if (name && re.test(host)) return name; return ""; };

/** Where a visit came from, as a kind and a short fixed name. Never the address of the page it came from. */
export function classifySource(referrer: string, search: string, ownHost = "realhunt.co"): Source {
  let utm = "";
  try { utm = (new URLSearchParams(search || "").get("utm_source") || "").toLowerCase().replace(/^www\./, ""); } catch { utm = ""; }
  // ChatGPT and others add utm_source=<their host> to the links they show, and often send no referrer
  if (utm) { const ai = find(utm, AI); if (ai) return { kind: "ai", source: ai }; }
  let host = "";
  try { host = referrer ? new URL(referrer).hostname.toLowerCase().replace(/^www\./, "") : ""; } catch { host = ""; }
  if (!host) return { kind: "direct", source: utm && /^[a-z0-9_.-]{1,30}$/.test(utm) ? "utm" : "none" };
  if (host === ownHost || host.endsWith("." + ownHost)) return { kind: "internal", source: "self" };
  const ai = find(host, AI); if (ai) return { kind: "ai", source: ai };
  const se = find(host, SEARCH); if (se) return { kind: "search", source: se };
  const so = find(host, SOCIAL); if (so) return { kind: "social", source: so };
  return { kind: "other", source: "other" };
}

/** What a search with no results was about, without sending what the person typed: the country it names, if it
 * names one of ours, and nothing else. (src/lib/rh.ts: search strings are never sent.) */
export function emptySearchKind(q: string, countries: string[]): string {
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z ]+/g, " ").replace(/\s+/g, " ").trim();
  const text = ` ${norm(String(q || ""))} `;
  if (text.trim().length < 2) return "empty";
  for (const c of countries) { const n = norm(c); if (n.length >= 4 && text.includes(` ${n} `)) return "country:" + n.replace(/ /g, "-"); }
  return "other";
}

/** Events of the app (src/lib/rh.ts track) that say a visit was worth something, and their name in the reports. */
export const VALUE_EVENTS: Record<string, string> = { original_listing_opened: "listing_click", open_post: "listing_click", alert: "alert_created", newsletter: "newsletter_signup", community_save: "home_saved", favorite: "home_saved", want_this: "wants_home", share: "share", auth_confirmed: "account_created" };
