// /live-search?q=... (8-nov-2026): searches the web for homes to buy or rent while the person waits. A job runs
// in the edge function realhunt-live-search; this page polls it, shows real progress, and meanwhile shows the
// closest homes RealHunt already has. Only listings with a provisional score of 80+ are shown.
// The first search is free without an account; after that the app's own sign-in modal opens (requireUser).
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowUpRight, Globe, Info, Lock, RotateCcw, Search, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCommunity } from "./ctx";
import { feedAll, type Row } from "./extras";
import { HomeCard } from "./homecards";
import { getLang, t } from "./i18n";
import { money } from "./api";
import {
  parseLiveQuery, similarHomes, liveChips, stageParts, isFinal, mergeResults, fmtMoney, SHOW_MIN, LIVE_FREE_KEY,
  type LiveQuery, type LiveResult, type LiveStatus,
} from "./livelogic";
import "./livesearch.css";

const ENV = import.meta.env as any;
const DIRECT = ENV.VITE_SUPABASE_PROJECT_ID ? `https://${ENV.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/realhunt-live-search` : "";
const PROXY = `${ENV.VITE_SUPABASE_URL}/functions/v1/realhunt-live-search`;
// Direct first: there the function sees the visitor's own address (one free search each). The site's proxy is
// the fallback for networks that block supabase.co.
async function api(path: string, init: RequestInit): Promise<any> {
  for (const base of [DIRECT, PROXY].filter(Boolean)) {
    try { const r = await fetch(base + path, init); return await r.json(); } catch { /* try the next one */ }
  }
  throw new Error("network");
}
const ls = { get(k: string) { try { return localStorage.getItem(k); } catch { return null; } }, set(k: string, v: string) { try { localStorage.setItem(k, v); } catch { /* private mode */ } } };

type Phase = "idle" | "starting" | "running" | "done" | "error" | "capped" | "rejected" | "login";

let rowsP: Promise<Row[]> | null = null;
const loadRows = () => (rowsP ||= feedAll({ scope: "all", sort: "score" } as any).then((f: any) => (f.rows || []) as Row[]).catch(() => { rowsP = null; return [] as Row[]; }));

export default function LiveSearchPage() {
  const [sp, setSp] = useSearchParams();
  const q = (sp.get("q") || "").trim();
  const { user } = useAuth();
  const { requireUser } = useCommunity() || {};
  const [text, setText] = useState(q);
  const [phase, setPhase] = useState<Phase>("idle");
  const [st, setSt] = useState<LiveStatus | null>(null);
  const [results, setResults] = useState<LiveResult[]>([]);
  const [parsed, setParsed] = useState<LiveQuery | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [attempt, setAttempt] = useState(0);
  const run = useRef(0);

  useEffect(() => { setText(q); }, [q]);
  useEffect(() => { document.title = q ? `${t("Live search")}: ${q} | RealHunt` : `${t("Live search")} | RealHunt`; }, [q]);
  useEffect(() => { let live = true; loadRows().then((r) => live && setRows(r)); return () => { live = false; }; }, []);

  // start the job, then poll it until it is finished (stops when the page closes or the search changes)
  useEffect(() => {
    const me = ++run.current;
    const alive = () => run.current === me;
    setResults([]); setSt(null);
    const local = q ? parseLiveQuery(q) : null;
    setParsed(local);
    if (!q) { setPhase("idle"); return; }
    if (!user && ls.get(LIVE_FREE_KEY)) { setPhase("login"); return; }
    let timer: ReturnType<typeof setTimeout> | undefined;
    (async () => {
      setPhase("starting");
      const session = (await supabase.auth.getSession().catch(() => null))?.data?.session;
      const headers = { "Content-Type": "application/json", apikey: ENV.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${session?.access_token || ENV.VITE_SUPABASE_PUBLISHABLE_KEY}` };
      let first: LiveStatus;
      try { first = await api("", { method: "POST", headers, body: JSON.stringify({ q, lang: getLang() === "es" ? "es" : "en" }) }); }
      catch { if (alive()) setPhase("error"); return; }
      if (!alive()) return;
      if (first.parsed) setParsed(first.parsed);
      if (!session && first.status !== "rejected") ls.set(LIVE_FREE_KEY, new Date().toISOString());
      if (first.status === "need_login") { setPhase("login"); return; }
      if (first.status === "capped") { setPhase("capped"); setSt(first); return; }
      if (first.status === "rejected") { setPhase("rejected"); setSt(first); return; }
      if (!first.job_id) { setPhase("error"); return; }
      setPhase("running");
      let fails = 0;
      const poll = async () => {
        if (!alive()) return;
        try {
          const s: LiveStatus = await api(`?job=${encodeURIComponent(first.job_id!)}`, { headers: { apikey: ENV.VITE_SUPABASE_PUBLISHABLE_KEY } });
          if (!alive()) return;
          fails = 0;
          setSt(s);
          if (s.parsed) setParsed(s.parsed);
          setResults((prev) => mergeResults(prev, (s.results || []).filter((r) => r.score >= SHOW_MIN)));
          if (isFinal(s.status)) { setPhase(s.status === "done" ? "done" : "error"); return; }
        } catch { if (++fails > 5) { if (alive()) setPhase("error"); return; } }
        timer = setTimeout(poll, 2000);
      };
      poll();
    })();
    return () => { run.current++; if (timer) clearTimeout(timer); };
  }, [q, user?.id, attempt]);

  const p = parsed;
  const chips = p?.ok ? liveChips(p) : [];
  const similar = useMemo(() => (p?.ok && rows.length ? similarHomes(rows as any[], p, 6) : []), [rows, p]);
  const best80 = useMemo(() => (p?.ok && rows.length ? similarHomes(rows as any[], p, 6, SHOW_MIN) : []), [rows, p]);
  const progress = phase === "done" ? 100 : Math.max(2, Math.min(99, st?.progress ?? (phase === "starting" ? 2 : 0)));
  const stage = stageParts(st?.stage);
  const busy = phase === "starting" || phase === "running";
  const note = st?.note || "";
  const web = results.filter((r) => r.source === "web");
  const queued = web.some((r) => r.kind === "buy" && r.deal_slug);

  const submit = (e: React.FormEvent) => { e.preventDefault(); const v = text.trim(); if (!v) return; if (v === q) setAttempt((a) => a + 1); else setSp({ q: v }); };

  return (
    <div className="hunt-wrap lv-page">
      <header className="lv-head">
        <span className="lv-eyebrow"><Globe size={14} aria-hidden="true" /> {t("Live search")}</span>
        <h1>{t("Search the whole web for homes")}</h1>
        <p className="lv-sub">{t("Homes to buy or rent from estate agents and portals, filtered for you. Only homes with a score of 80 or more are shown.")}</p>
        <form className="lv-form" role="search" onSubmit={submit}>
          <Search size={18} aria-hidden="true" />
          <input type="search" value={text} onChange={(e) => setText(e.target.value)} aria-label={t("Search homes")} placeholder={t("Try: 3 bedroom house in Miami under $300k")} enterKeyHint="search" maxLength={200} />
          <button type="submit" className="lv-go" disabled={busy && text.trim() === q}>{t("Search the web")}</button>
        </form>
        {chips.length > 0 && (
          <ul className="lv-chips" aria-label={t("What we understood")}>
            {chips.map((c) => <li key={c.k}>{c.k === "beds" || c.k === "where" ? <>{c.value} {c.label && t(c.label)}</> : c.k === "max" || c.k === "min" ? <>{t(c.label)} {c.value}</> : t(c.label)}</li>)}
          </ul>
        )}
      </header>

      {phase === "rejected" && (
        <section className="lv-card lv-msg" role="status">
          <Info size={20} aria-hidden="true" />
          <div>
            <strong>{st?.reason === "no_place" ? t("Tell us where: a city or a country.") : t("Live search only looks for homes to buy or rent.")}</strong>
            <p>{t("For example:")} <button type="button" className="hunt-link" onClick={() => setSp({ q: "3 bedroom house in Miami under $300k" })}>3 bedroom house in Miami under $300k</button></p>
          </div>
        </section>
      )}

      {phase === "login" && (
        <section className="lv-card lv-msg lv-login">
          <Lock size={20} aria-hidden="true" />
          <div>
            <strong>{t("Your first live search was free. Sign in to keep searching.")}</strong>
            <p>{t("An account is free. It keeps live searches fair for everyone.")}</p>
            <button type="button" className="hunt-primary lv-btn" onClick={() => requireUser?.()}>{t("Sign in to search")}</button>
          </div>
        </section>
      )}

      {phase === "capped" && (
        <section className="lv-card lv-msg" role="status">
          <Info size={20} aria-hidden="true" />
          <div><strong>{t("Live search has reached today's limit. Please try again tomorrow.")}</strong><p>{t("Meanwhile, these are the closest homes we already have.")}</p></div>
        </section>
      )}

      {(busy || phase === "done" || phase === "error") && (
        <section className="lv-card lv-progress" aria-live="polite">
          <div className="lv-progress-top">
            <span className="lv-stage">
              {phase === "error" ? t("The live search stopped early.") : phase === "done" ? t("Search finished") : <>{t(stage.text)}{stage.n != null && <> {stage.n}</>}{stage.of ? <> / {stage.of}</> : null}</>}
            </span>
            <b className="lv-pct">{progress}%</b>
          </div>
          <div className="lv-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label={t("Live search progress")}>
            <span style={{ width: progress + "%" }} className={busy ? "is-busy" : ""} />
          </div>
          {busy && <p className="lv-wait">{t("This will take a minute: we are filtering the best homes for you. Meanwhile, look at these:")}</p>}
          {phase === "error" && <button type="button" className="hunt-secondary lv-btn" onClick={() => setAttempt((a) => a + 1)}><RotateCcw size={16} aria-hidden="true" /> {t("Try again")}</button>}
          {phase === "done" && (
            <div className="lv-summary">
              {note === "from_earlier" ? <p>{t("These come from homes already on RealHunt and earlier searches, so the answer was instant.")}</p>
                : results.length ? <p><b>{results.length}</b> {results.length === 1 ? t("home reaches a score of 80 or more.") : t("homes reach a score of 80 or more.")}{st?.hidden ? <> {t("Listings checked below 80 are not shown:")} {st.hidden}</> : null}</p>
                : <p>{t("None of the listings we found today reaches a score of 80, so we do not show them. These RealHunt homes for your search do:")}</p>}
              {/budget/.test(note) && <p className="lv-fine">{t("You have used today's live web searches, so these results come from our own data.")}</p>}
              {queued && <p className="lv-fine">{t("These homes are now in our review queue; checked ones appear on RealHunt with a full score.")}</p>}
            </div>
          )}
        </section>
      )}

      {(results.length > 0 || busy) && (
        <section className="lv-results" aria-label={t("Found for you")} aria-busy={busy}>
          {results.length > 0 && <h2>{t("Found for you")}</h2>}
          <div className="lv-grid">
            {results.map((r) => <LiveCard key={r.id} r={r} />)}
            {busy && results.length < 3 && [0, 1].slice(0, 2 - Math.min(results.length, 1)).map((i) => <div key={"sk" + i} className="lv-res lv-skel" aria-hidden="true"><span /><i /><i /></div>)}
          </div>
        </section>
      )}

      {p?.ok && (phase !== "done" || results.length === 0) && (phase === "done" && !results.length ? best80 : similar).length > 0 && (
        <section className="lv-similar">
          <h2>{busy ? t("Meanwhile, the closest homes we have") : phase === "done" ? t("Best RealHunt homes for this search") : t("The closest homes we have")}</h2>
          <div className="hx-grid">{(phase === "done" && !results.length ? best80 : similar).map((d, i) => <HomeCard key={d.slug} deal={d} pos={i + 1} />)}</div>
        </section>
      )}

      <details className="lv-how">
        <summary><Sparkles size={15} aria-hidden="true" /> {t("How the AI estimate works")}</summary>
        <p>{t("It is a first score before a person checks the home: price per m² against similar homes (45 points), photos (15), the bedrooms you asked for (15) and how complete the listing is (25). We only show homes with 80 or more. A person checks every home before it gets a full RealHunt score.")}</p>
        <p className="lv-fine">{t("Prices in euros are approximate. General information, not advice.")}</p>
      </details>
    </div>
  );
}

function LiveCard({ r }: { r: LiveResult }) {
  const [bad, setBad] = useState(false);
  const eur = r.price_eur && r.currency !== "EUR" ? money(r.price_eur) : null;
  const own = r.source === "realhunt";
  return (
    <article className="lv-res">
      <div className="lv-img">
        {r.image && !bad ? <img src={r.image} alt={r.title} loading="lazy" referrerPolicy="no-referrer" width={480} height={360} onError={() => setBad(true)} /> : <span className="lv-noimg" aria-hidden="true"><Globe size={28} /></span>}
        <span className="lv-score" title={own ? t("RealHunt score") : t("AI estimate")}><small>{own ? t("Score") : t("AI estimate")}</small>{r.score}</span>
        {r.kind === "rent" && <span className="lv-rent">{t("For rent")}</span>}
      </div>
      <div className="lv-body">
        <p className="lv-price">
          <b>{r.price != null ? fmtMoney(r.price, r.currency || "EUR") : t("Price on request")}</b>{r.kind === "rent" && r.price != null && <span> {t("a month")}</span>}
          {eur && <small> ≈ {eur}</small>}
        </p>
        <p className="lv-facts">{[r.beds ? `${r.beds} ${r.beds === 1 ? t("bedroom") : t("bedrooms")}` : "", r.sqm ? `${r.sqm} m²` : ""].filter(Boolean).join(" · ")}</p>
        <h3>{r.title}</h3>
        {r.location && <p className="lv-loc">{r.location}</p>}
        <p className={"lv-badge" + (own ? " is-checked" : "")}>{own ? t("On RealHunt · checked by a person") : r.source === "earlier" ? t("Found in an earlier search · not yet checked by a person") : t("Found just now · not yet checked by a person")}</p>
        {own && r.deal_slug
          ? <Link className="lv-open" to={`/deal/${encodeURIComponent(r.deal_slug)}`}>{t("See the home")}</Link>
          : <a className="lv-open" href={r.url} target="_blank" rel="noopener nofollow">{t("View original listing")} <ArrowUpRight size={15} aria-hidden="true" /><span className="sr-only"> ({t("opens in a new tab")})</span></a>}
      </div>
    </article>
  );
}
