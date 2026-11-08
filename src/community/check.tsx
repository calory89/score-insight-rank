// CHECK layer UI (7-nov-2026), the "check" in "find, check and buy". Logic lives in ./checkLogic (tested).
//  - CardCheck: one compact all-in line on every card, plus a tiny chip for a buying restriction (amber/red for the
//    visitor's nationality group) and the 1-2 most serious red flags.
//  - CheckLayer: on the home page, "Total cost to buy" next to the existing RunningCosts block, "Can I buy here?",
//    "Things to check" and "Questions to ask before you visit" with a copyable email to the agent.
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Check, ChevronDown, Copy, Mail, ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";
import GUIDES from "@/data/guides.json";
import { t } from "./i18n";
import { isEs } from "@/lib/lang";
import { RunningCosts } from "./costs";
import {
  GROUPS, agentEmail, allIn, allInParts, buyRule, countryKey, detectGroup, emailLang, eur, monthEs, questionUi, questions, redFlags, roundNice,
  type CheckRow, type Group, type QId, type RulesEs,
} from "./checkLogic";
import "./check.css";

// ------------------------------------------------------------------------------------- visitor group store
const KEY = "rh_buyer_group";
const subs = new Set<() => void>();
let cached: Group | null = null;
function readGroup(): Group {
  if (cached) return cached;
  let v: string | null = null;
  try { v = localStorage.getItem(KEY); } catch { /* private mode */ }
  if (v === "eu" || v === "uk" || v === "na" || v === "other") return (cached = v);
  let tz = "";
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch { /* old browser */ }
  return (cached = detectGroup(typeof navigator !== "undefined" ? navigator.language : "", tz));
}
function setGroup(g: Group) {
  cached = g;
  try { localStorage.setItem(KEY, g); } catch { /* ignore */ }
  subs.forEach((f) => f());
}
export function useBuyerGroup(): [Group, (g: Group) => void] {
  const g = useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, readGroup, () => "other" as Group);
  return [g, setGroup];
}
const GROUP_LABEL: Record<Group, string> = { eu: "EU / EEA citizen", uk: "UK citizen", na: "US / Canadian citizen", other: "Other nationality" };

// Spanish rule texts (8-nov-2026): src/data/buyrules-es.json is fetched only on the Spanish site, so the English
// entry bundle does not carry it. Until it arrives the English note shows (the same moment the dictionary loads).
const ES = isEs();
let rulesEs: RulesEs | null = null;
const esSubs = new Set<() => void>();
if (ES) import("@/data/buyrules-es.json").then((m) => { rulesEs = ((m as any).default || m) as RulesEs; esSubs.forEach((f) => f()); }).catch(() => { /* stay in English */ });
function useRulesEs(): RulesEs | null {
  return useSyncExternalStore((f) => { esSubs.add(f); return () => { esSubs.delete(f); }; }, () => rulesEs, () => null);
}
/** 1.5 -> "1,5" on the Spanish site. */
const dec = (v: number) => (ES ? String(v).replace(".", ",") : String(v));
const LANG_ES: Record<string, string> = { en: "inglés", es: "español", it: "italiano", fr: "francés", de: "alemán", pt: "portugués", nl: "neerlandés", da: "danés", sv: "sueco" };

// ------------------------------------------------------------------------------------------------- cards
/** Compact line under the price on cards. Works inside a link (no interactive children). */
export function CardCheck({ d }: { d: CheckRow }) {
  const [g] = useBuyerGroup();
  const es = useRulesEs();
  const parts = useMemo(() => allInParts(d), [d.price_eur, d.country, d.hoa_monthly, d.tax_annual]);
  const flags = useMemo(() => redFlags(d).filter((f) => f.id !== "hoa_unknown" && f.sev >= 2).slice(0, 2), [d.title, d.why_great, d.costs_note]);
  const rule = buyRule(d.country, g, es);
  const warn = rule && rule.s !== "green" ? rule : null;
  if (!parts.length && !flags.length && !warn) return null;
  return (
    <span className="rh-chk-card">
      {parts.length > 0 && <span className="rh-chk-line" title={t("Estimate: price plus typical buying costs, and monthly fee plus property tax")}>{parts.map((x, i) => <span key={x.unit} className="rh-chk-part">{i ? " · " : ""}{x.v}{x.unit === "/mo" ? "" : " "}<span>{t(x.unit)}</span></span>)}</span>}
      {(warn || flags.length > 0) && <span className="rh-chk-chips">
        {warn && <span className={"rh-chk-chip is-" + warn.s} title={warn.note}>{warn.s === "red" ? <ShieldX size={12} aria-hidden="true" /> : <ShieldAlert size={12} aria-hidden="true" />}{t(warn.badge || "Check rules")}</span>}
        {flags.map((f) => <span key={f.id} className="rh-chk-chip is-flag" title={f.ask}><AlertTriangle size={12} aria-hidden="true" />{t(f.label)}</span>)}
      </span>}
    </span>
  );
}

// --------------------------------------------------------------------------------------------- home page
const GUIDE_KEYS = GUIDES as unknown as Record<string, unknown>;

function TotalCost({ d }: { d: CheckRow }) {
  const a = allIn(d);
  if (a.price == null) return null;
  const k = countryKey(d.country);
  const range = (lo: number, hi: number) => (Math.round(lo) === Math.round(hi) ? eur(roundNice(lo)) : `${eur(roundNice(lo))} – ${eur(roundNice(hi))}`);
  if (a.costsLow == null && a.monthly == null) return null;
  return (
    <section className="rh-chk rh-chk-total" aria-labelledby="rh-chk-total-h">
      <h2 id="rh-chk-total-h">{t("Total cost to buy")}</h2>
      <dl>
        <div><dt>{t("Price")}</dt><dd>{eur(a.price)}</dd></div>
        {a.costsLow != null && a.costsHigh != null && a.pct && <div><dt>{t("Buying costs")} <small>({a.pct[0] === a.pct[1] ? `${dec(a.pct[0])}%` : `${dec(a.pct[0])}–${dec(a.pct[1])}%`})</small></dt><dd>{range(a.costsLow, a.costsHigh)}</dd></div>}
        {a.totalLow != null && a.totalHigh != null && <div className="rh-chk-sum"><dt>{t("Total to buy")}</dt><dd>{range(a.totalLow, a.totalHigh)}</dd></div>}
        <div className="rh-chk-month"><dt>{t("Then every month")}</dt><dd>{a.monthly != null && a.monthly > 0 ? <>≈ {eur(Math.round(a.monthly))} <small>{t("fee and property tax")}</small></> : d.hoa_unknown ? t("Fee not stated") : t("Not stated in the listing")}</dd></div>
      </dl>
      <p className="rh-chk-src">
        {t("Buying costs are the usual range of taxes, notary and legal fees for this country; US dollars converted at 0.896. General information, not advice.")}{" "}
        {a.costsLow != null && <Link className="hunt-link" to={`/costs/${k}`}>{t("See the breakdown")}</Link>}
      </p>
    </section>
  );
}

function CanIBuy({ d }: { d: CheckRow }) {
  const [g, set] = useBuyerGroup();
  const es = useRulesEs();
  const rule = buyRule(d.country, g, es);
  if (!rule) return null;
  const k = countryKey(d.country);
  const Icon = rule.s === "green" ? ShieldCheck : rule.s === "amber" ? ShieldAlert : ShieldX;
  const verdict = rule.s === "green" ? "Yes, you can buy freely" : rule.s === "amber" ? "Yes, with conditions" : "Not directly";
  return (
    <section className={"rh-chk rh-chk-buy is-" + rule.s} aria-labelledby="rh-chk-buy-h">
      <div className="rh-chk-head">
        <h2 id="rh-chk-buy-h">{t("Can I buy here?")}</h2>
        <label className="rh-chk-select">
          <select value={g} onChange={(e) => set(e.target.value as Group)} aria-label={t("Your nationality")}>
            {GROUPS.map(([v]) => <option key={v} value={v}>{t(GROUP_LABEL[v])}</option>)}
          </select>
          <ChevronDown size={15} aria-hidden="true" />
        </label>
      </div>
      <div className="rh-chk-light" role="status">
        <span className="rh-chk-dot" aria-hidden="true"><Icon size={20} /></span>
        <div>
          <strong>{t(verdict)}</strong>
          <p>{es ? rule.note : t(rule.note)}</p>
        </div>
      </div>
      {es ? <p className="rh-chk-src">
        Normas generales para compradores en {rule.name}, actualizadas en {monthEs(rule.updated)}. Información general, no asesoramiento legal.{" "}
        {GUIDE_KEYS[k] ? <Link className="hunt-link" to={`/guide/${k}`}>Cómo comprar en {rule.name}</Link> : null}
      </p> : <p className="rh-chk-src">
        {t("General rules for buyers in")} {rule.name}, {t("updated")} {rule.updated}. {t("General information, not legal advice.")}{" "}
        {GUIDE_KEYS[k] ? <Link className="hunt-link" to={`/guide/${k}`}>{t("How to buy in")} {String(d.country)}</Link> : null}
      </p>}
    </section>
  );
}

function ThingsToCheck({ d }: { d: CheckRow }) {
  const flags = useMemo(() => redFlags(d), [d.title, d.why_great, d.costs_note, d.hoa_unknown]);
  if (!flags.length) return null;
  return (
    <section className="rh-chk rh-chk-flags" aria-labelledby="rh-chk-flags-h">
      <h2 id="rh-chk-flags-h"><AlertTriangle size={18} aria-hidden="true" /> {t("Things to check")}</h2>
      <p className="rh-chk-sub">{t("Found in the listing text. Not a problem by itself, but ask before you go further.")}</p>
      <ul>
        {flags.map((f) => (
          <li key={f.id}>
            <span className="rh-chk-chip is-flag is-big">{t(f.label)}</span>
            <span className="rh-chk-ask">{t(f.ask)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

async function copyText(s: string): Promise<boolean> {
  try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(s); return true; } } catch { /* fall back */ }
  try {
    const ta = document.createElement("textarea");
    ta.value = s; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0"; ta.style.top = "0";
    document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, s.length);
    const ok = document.execCommand("copy"); ta.remove(); return ok;
  } catch { return false; }
}
const LANG_NAME: Record<string, string> = { en: "English", es: "Spanish", it: "Italian", fr: "French", de: "German", pt: "Portuguese", nl: "Dutch", da: "Danish", sv: "Swedish" };

function AgentQuestions({ d }: { d: CheckRow }) {
  const ids: QId[] = useMemo(() => questions(d), [d.title, d.why_great, d.costs_note, d.hoa_unknown, d.hoa_monthly, d.tax_annual, d.category, d.country]);
  const [state, setState] = useState<"idle" | "ok" | "fail">("idle");
  useEffect(() => { if (state === "idle") return; const id = setTimeout(() => setState("idle"), 2500); return () => clearTimeout(id); }, [state]);
  const lang = emailLang(d);
  const mail = useMemo(() => agentEmail(d, ids, lang), [ids, lang, d.title, d.location_name, d.price_eur]);
  const copy = async () => setState((await copyText(`${mail.subject}\n\n${mail.body}`)) ? "ok" : "fail");
  return (
    <section className="rh-chk rh-chk-q">
      <details>
        <summary>
          <span><strong>{t("Questions to ask before you visit")}</strong><small>{ids.length} {t("questions for this home")}</small></span>
          <ChevronDown size={18} aria-hidden="true" className="rh-chk-caret" />
        </summary>
        <ol>{ids.map((id) => <li key={id}>{questionUi(id, d, ES ? "es" : "en")}</li>)}</ol>
      </details>
      <div className="rh-chk-mail">
        <button type="button" className={"rh-chk-copy" + (state === "ok" ? " is-done" : "")} onClick={copy} aria-live="polite">
          {state === "ok" ? <><Check size={17} aria-hidden="true" /> {t("Copied")}</> : <><Copy size={17} aria-hidden="true" /> {t("Copy email to the agent")}</>}
        </button>
        <span className="rh-chk-mailnote"><Mail size={14} aria-hidden="true" /> {ES ? `Correo educado en ${LANG_ES[lang] || "inglés"} con estas preguntas, en el idioma del anuncio.` : lang === "en" ? t("Polite email in English with these questions.") : <>{t("Polite email in")} {t(LANG_NAME[lang])} {t("with these questions.")}</>}</span>
        {state === "fail" && <span className="rh-chk-fail" role="alert">{t("Could not copy. Open the list and copy it by hand.")}</span>}
      </div>
    </section>
  );
}

/** Everything the CHECK layer adds to the home page; replaces the bare RunningCosts call there. */
export function CheckLayer({ d }: { d: CheckRow }) {
  return (
    <div className="rh-chk-layer">
      <TotalCost d={d} />
      <RunningCosts d={d as any} />
      <CanIBuy d={d} />
      <ThingsToCheck d={d} />
      <AgentQuestions d={d} />
    </div>
  );
}
