// House rules that code can check (15-nov-2026; ideas 971 to 1000 of the organic-traffic list, "things to stop doing").
// Pure functions over a text, a title or a piece of HTML. seo/tech/audit.ts runs them over every published page,
// src/test/tech-rules.test.ts runs them over the texts kept in the repo.
//
// Two levels. "fail" is for what only code can cause (a link with no address, a review nobody wrote in the
// structured data, a test page left indexable): it stops the build. "warn" is for what can also arrive inside the
// description of a home (an em dash, "limited time offer" copied from a portal): it is listed in dist/seo-audit.json
// and on /seo-report, and it does not stop the nightly publication of new homes.

export type Level = "fail" | "warn";
export type Hit = { rule: string; level: Level; what: string };
export type Lang = "en" | "es";

const around = (s: string, i: number, n: number) => s.slice(Math.max(0, i - 30), i + n + 30).replace(/\s+/g, " ").trim();

/** Phrases that push the visitor with a scarcity or a hurry we cannot prove (idea 977). */
export const URGENCY = /\b(only \d+ (left|remaining)|last (units?|chance|few (units|homes))|hurry( up)?\b|selling fast|won['’]?t last|act now|limited[- ]time( offer)?|\d+ people (are )?(viewing|looking)|don['’]?t miss (out|it|this)|últimas unidades|quedan solo \d+|solo quedan \d+|date prisa|no te lo pierdas|\d+ personas (están )?(mirando|viendo)|(oferta )?por tiempo limitado|se agotan)\b/i;
/** A return or a rise in value stated as certain (idea 978). "Rental yield" with its estimate and source is fine. */
export const RETURNS = /\b(guaranteed (returns?|yields?|income|profits?|rent(al income)?|appreciation)|risk[- ]free (investment|return)|will (double|triple|appreciate|rise in value)|sure[- ]fire (profit|investment)|can['’]?t lose|rentabilidad(es)? garantizadas?|rentas? garantizadas?|inversión sin riesgo|se revalorizará|beneficios? asegurados?|ganancias? seguras?|ganancia garantizada)\b/i;
/** The sentence says the opposite ("no guaranteed returns", "sin rentabilidad garantizada"): not a promise. */
const NEGATED = /\b(no|not|never|nor|without|isn['’]?t|aren['’]?t|nothing|ni|sin|nunca|ninguna?|tampoco|jamás)\b[^.!?]{0,60}$/i;
// 21-nov-2026 (idea 92 of the second list): the same two rules in the other languages of the site (seo/langs: de, fr,
// nl, pl, ru), so a translated title or a new text cannot bring a hurry or a promise back in. Letters of any alphabet
// count as word letters here (\b does not know Cyrillic).
const W0 = "(?<![\\p{L}\\p{N}])", W1 = "(?![\\p{L}\\p{N}])";
export const URGENCY_LANGS = new RegExp(W0 + "(nur noch \\d+ (übrig|frei|verfügbar)|seien sie schnell|greifen sie (schnell )?zu|nicht verpassen|zeitlich begrenzt(es angebot)?|letzte chance|solange der vorrat reicht"
  + "|plus que \\d+ (disponibles?|restants?)|dépêchez-vous|ne (le |la |les )?manquez pas|offre limitée|durée limitée|dernière chance|derniers lots"
  + "|nog maar \\d+ (beschikbaar|over)|wees er snel bij|op is op|mis (het|dit) niet|beperkte tijd|laatste kans"
  + "|został[oay]? tylko \\d+|ostatnie (sztuki|mieszkania|domy)|spiesz się|nie przegap|ograniczon[ay] czasowo|ostatnia szansa"
  + "|осталось (всего|только) \\d+|спешите|не упустите|ограниченное предложение|последний шанс)" + W1, "iu");
export const RETURNS_LANGS = new RegExp(W0 + "(garantierte (rendite|mieteinnahmen|miete|mieten|wertsteigerung|erträge)|risikolose (anlage|investition|rendite)|sichere rendite|wertsteigerung garantiert"
  + "|rendements? garantis?|loyers? garantis?|revenus? garantis?|placement sans risque|plus-value (assurée|garantie)"
  + "|gegarandeerde? (rendement|huurinkomsten|huur|opbrengst|waardestijging)|risicoloze (belegging|investering)"
  + "|gwarantowan[aeyi]+ (zwrot|zysk|dochód|czynsz|stop[aęy] zwrotu)|inwestycja bez ryzyka|pewny zysk"
  + "|гарантированн(ый|ая|ое|ые) (доход|доходность|прибыль|аренда|рост)|безрисков(ая|ые) (инвестиция|вложения)|беспроигрышн(ая|ое|ые))" + W1, "iu");
const NEGATED_LANGS = new RegExp(W0 + "(kein(e|en)?|nicht|ohne|pas|sans|aucune?|ni|geen|niet|zonder|nooit|nie|bez|żadn[eya]|не|без|нет|ни)" + W1 + "[^.!?]{0,60}$", "iu");

/** More homes than there are (idea 998). `homes` is the real number in the snapshot. */
export const INFLATED = /\b(thousands|tens of thousands|millions|miles|decenas de miles|millones) (of|de) (checked |scored |ranked )?(homes|houses|properties|listings|casas|viviendas|propiedades|anuncios)( for sale| on realhunt| scored| checked| en venta| en realhunt| con nota| revisad[ao]s)\b/i;
/** A phone number (idea 981): the contact is the company email. Prices, areas, coordinates and ids are not phones. */
export const PHONE = /(?:\+|(?<![\d.,])\b00)[1-9]\d{0,2}[ .\-]?\(?\d{2,4}\)?(?:[ .\-]?\d{2,4}){2,4}\b|\(\d{3}\) ?\d{3}[ .\-]\d{4}\b/;
export const PHONE_LINK = /href="(?:tel:|sms:|https?:\/\/(?:wa\.me|api\.whatsapp\.com\/send\?phone=)\/?\+?\d)/i;
const PLACEHOLDER = /[Ll]orem ipsum|\b(TODO|FIXME|TBD)\b:?|\bfoo ?bar\b|\[placeholder\]/;

/** Rules for a visible text (a page without its tags, a template sentence, a description). */
export function textHits(text: string, o: { homes?: number } = {}): Hit[] {
  const out: Hit[] = [];
  const t = String(text || "");
  let m: RegExpExecArray | null;
  const i = t.indexOf("—");
  if (i >= 0) out.push({ rule: "em_dash", level: "warn", what: around(t, i, 1) });
  if ((m = URGENCY.exec(t))) out.push({ rule: "fake_urgency", level: "warn", what: around(t, m.index, m[0].length) });
  if ((m = RETURNS.exec(t)) && !NEGATED.test(t.slice(Math.max(0, m.index - 80), m.index))) out.push({ rule: "promised_return", level: "warn", what: around(t, m.index, m[0].length) });
  if (!/fake_urgency/.test(out.map((h) => h.rule).join()) && (m = URGENCY_LANGS.exec(t))) out.push({ rule: "fake_urgency", level: "warn", what: around(t, m.index, m[0].length) });
  if (!/promised_return/.test(out.map((h) => h.rule).join()) && (m = RETURNS_LANGS.exec(t)) && !NEGATED_LANGS.test(t.slice(Math.max(0, m.index - 80), m.index))) out.push({ rule: "promised_return", level: "warn", what: around(t, m.index, m[0].length) });
  if ((m = INFLATED.exec(t))) {
    const big = /^(tens|millions|decenas|millones)/i.test(m[1]) ? 10000 : 2000;
    if ((o.homes ?? 0) < big) out.push({ rule: "inflated_figure", level: "warn", what: around(t, m.index, m[0].length) });
  }
  if ((m = PHONE.exec(t))) out.push({ rule: "phone_number", level: "warn", what: around(t, m.index, m[0].length) });
  if ((m = PLACEHOLDER.exec(t))) out.push({ rule: "placeholder_text", level: "warn", what: around(t, m.index, m[0].length) });
  return out;
}

/** Page types whose title may carry a year: a home (the year is a fact of the house, "roof from 2021") and a dated
 * article. Every other page is rebuilt daily and nobody reviews it once a year (idea 992). */
export const YEAR_OK = new Set(["deal", "blog"]);
export function titleHits(title: string, kind: string): Hit[] {
  const m = /\b(?:19|20)\d\d\b/.exec(title);
  // a warning, not a stop: a calculator of this year's tax table carries its year on purpose, and somebody has to
  // look at the list every January
  return m && !YEAR_OK.has(kind) ? [{ rule: "year_in_title", level: "warn", what: title }] : [];
}

/** An address that looks like a test, a draft or a demo (idea 999). Only matters when the page is indexable. */
export const TEST_PATH = /(^|[/-])(test|tests|testing|draft|drafts|borrador|borradores|prueba|pruebas|demo|staging|tmp|temp|wip|sandbox|example|sample|lorem|untitled|new-page|page-\d+)([/-]|$)/i;
/** The address of a home is its id in the database (letters, digits and hyphens at random): not read as words. */
export const pathHits = (path: string): Hit[] => (!/^\/(es\/)?deal\//.test(path) && TEST_PATH.test(path) ? [{ rule: "test_page_indexable", level: "fail", what: path }] : []);

const TRACK = /[?&](utm_[a-z]+|ref|fbclid|gclid|msclkid|mc_cid|mc_eid|igshid)=/i;
const GENERIC = /^(see more|read more|learn more|more|more info|click here|here|this page|link|ver más|leer más|saber más|más información|más|aquí|pulsa aquí|haz clic aquí|clic aquí|este enlace|enlace)$/i;
const strip = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

/** Rules for the HTML of a page's body (what is inside #root). */
export function htmlHits(root: string): Hit[] {
  const out: Hit[] = [];
  const seen = new Set<string>();
  const add = (rule: string, level: Level, what: string) => { if (!seen.has(rule)) { seen.add(rule); out.push({ rule, level, what: what.slice(0, 160) }); } };
  for (const m of root.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)) {
    const attrs = m[1], href = /\shref="([^"]*)"/.exec(attrs)?.[1];
    // idea 995: a link that only works with JavaScript is a link a crawler cannot follow
    if (href === undefined || href === "" || href === "#" || /^javascript:/i.test(href)) { add("link_without_href", "fail", m[0]); continue; }
    if (href.startsWith("/") && !href.startsWith("//")) {
      if (TRACK.test(href)) add("tracking_param_in_internal_link", "fail", href); // idea 105
      const label = strip(m[2]) || /\saria-label="([^"]*)"/.exec(attrs)?.[1] || /<img\b[^>]*\salt="([^"]+)"/.exec(m[2])?.[1] || "";
      if (!label) add("link_without_text", "warn", m[0]);
      else if (GENERIC.test(label)) add("generic_link_text", "warn", `${label} -> ${href}`); // idea 119
    }
  }
  if (/<[a-z]+\b(?![^>]*\shref=)[^>]*\s(onclick|data-href)="/i.test(root.replace(/<(script|style)\b[\s\S]*?<\/\1>/g, ""))) add("click_handler_instead_of_link", "warn", /<[a-z]+\b(?![^>]*\shref=)[^>]*\s(onclick|data-href)="[^>]*>/i.exec(root)?.[0] || "");
  if (PHONE_LINK.test(root)) add("phone_link", "fail", PHONE_LINK.exec(root)![0]);
  for (const m of root.matchAll(/<img\b[^>]*>/g)) {
    if (!/\salt="/.test(m[0])) add("image_without_alt", "fail", m[0]);
    // idea 148: the browser must know the box of a photo before it arrives (width and height, or a sized frame)
    if (!/\s(width|height)="/.test(m[0]) && !/aspect-ratio/.test(m[0]) && !/\sdata-rh-sized\b/.test(m[0])) add("image_without_size", "warn", m[0]);
  }
  return out;
}

/** Structured data that claims an opinion: a review, a rating, a testimonial. We publish none (idea 976). */
export function ldHits(lds: unknown[]): Hit[] {
  const bad = new Set<string>();
  const walk = (o: any) => {
    if (Array.isArray(o)) return o.forEach(walk);
    if (!o || typeof o !== "object") return;
    const t = o["@type"];
    for (const x of Array.isArray(t) ? t : [t]) if (x === "Review" || x === "AggregateRating" || x === "Rating" || x === "EndorsementRating") bad.add(String(x));
    for (const k of ["review", "reviews", "aggregateRating"]) if (k in o) bad.add(k);
    Object.values(o).forEach(walk);
  };
  walk(lds);
  return bad.size ? [{ rule: "review_or_rating_markup", level: "fail", what: [...bad].join(", ") }] : [];
}

/** Things that are not a country and were used as one (idea 991). */
export const NOT_A_COUNTRY = new Set(["scandinavia", "europe", "balkans", "caribbean", "nordics", "benelux", "iberia", "asia", "africa", "latin america", "south america", "north america", "middle east", "baltics", "alps", "mediterranean", "escandinavia", "europa"]);
export const countryHits = (rows: { slug?: string; country?: string | null }[]): Hit[] =>
  rows.filter((r) => NOT_A_COUNTRY.has(String(r.country || "").trim().toLowerCase())).map((r) => ({ rule: "region_used_as_country", level: "warn" as Level, what: `${r.slug}: ${r.country}` }));

/** Keyword stuffing (idea 984): one phrase of two or three words that makes up too much of a page. */
const STOP = new Set("the a an of in to for and or on at by with from is are was it this that as be we you your our not no can will has have more than per all each one two its into about how what which who there their they them these those he she his her if but so do does did up out over under el la los las un una de en y o a para por con sin del al es son que se su sus lo le les como más menos muy ya no sí hay este esta estos estas ese esa cada entre sobre desde hasta también pero si qué cuál".split(" "));
export function stuffing(text: string): { phrase: string; count: number; share: number } | null {
  const w = text.toLowerCase().replace(/[^a-záéíóúüñç0-9€ ]+/gi, " ").split(/\s+/).filter(Boolean);
  if (w.length < 250) return null;
  const count = new Map<string, number>();
  for (let n = 2; n <= 3; n++) for (let i = 0; i + n <= w.length; i++) {
    const g = w.slice(i, i + n);
    if (STOP.has(g[0]) || STOP.has(g[n - 1]) || g.some((x) => /^\d/.test(x) || x.length < 3)) continue;
    const k = g.join(" "); count.set(k, (count.get(k) || 0) + 1);
  }
  let best: [string, number] = ["", 0];
  for (const e of count) if (e[1] * e[0].split(" ").length > best[1] * (best[0].split(" ").length || 1)) best = e;
  const share = (best[1] * best[0].split(" ").length) / w.length;
  // a list of 60 homes repeats "bedroom" and the country; ten times and 6% of all the words is a text written for a robot
  return best[1] >= 10 && share >= 0.06 ? { phrase: best[0], count: best[1], share: +share.toFixed(3) } : null;
}

/** 64 min-hashes of the 4-word shingles of a text, with numbers and the given names blanked: two pages that differ
 * only in a place name and a few figures get the same signature (idea 983). */
export function signature(text: string, blank: RegExp | null): Uint32Array {
  let t = text.toLowerCase();
  if (blank) t = t.replace(blank, " _ ");
  const w = t.replace(/[0-9][0-9.,]*/g, " # ").replace(/[^a-záéíóúüñç#_ ]+/gi, " ").split(/\s+/).filter(Boolean);
  const sig = new Uint32Array(64).fill(0xffffffff);
  for (let i = 0; i + 4 <= w.length; i++) {
    let h = 2166136261;
    const s = w[i] + " " + w[i + 1] + " " + w[i + 2] + " " + w[i + 3];
    for (let k = 0; k < s.length; k++) { h ^= s.charCodeAt(k); h = Math.imul(h, 16777619); }
    for (let k = 0; k < 64; k++) { const x = (Math.imul(h ^ (k * 0x9e3779b1), 2654435761) >>> 0); if (x < sig[k]) sig[k] = x; }
  }
  return sig;
}
export const similarity = (a: Uint32Array, b: Uint32Array) => { let n = 0; for (let i = 0; i < 64; i++) if (a[i] === b[i]) n++; return n / 64; };
