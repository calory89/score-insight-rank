// /live-search?q=... (v2, 8-nov-2026): searches the web for homes to buy or rent while the person waits. A job runs
// in the edge function realhunt-live-search (it may take a few minutes: every find is checked by Claude vision and
// the good ones become real RealHunt homes); this page polls it, shows honest progress by stage and meanwhile the
// closest homes RealHunt already has. Results use the home page's own card (HomeCard) and open the full home page.
// The main search box sends home searches with a place here (findui.tsx), so nobody has to press a button.
// Leaving and coming back resumes the same job (localStorage, and the server reuses a search of the last 24 h).
// Without an account the first search is free; after that our own homes still show, with a gentle sign-in nudge.
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowRight, Clock, ExternalLink, Info, LogIn, MapPin, RotateCcw, Search, Sparkles, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCommunity } from "./ctx";
import { feedAll, type Row } from "./extras";
import { HomeCard, HomeCardSkeleton } from "./homecards";
import { getLang, t } from "./i18n";
import { learnTexts } from "@/lib/lang";
import {
  parseLiveQuery, similarHomes, liveChips, isFinal, mergeResults, fmtMoney, SHOW_MIN, LIVE_FREE_KEY, passes, resultToDeal,
  LIVE_JOBS_KEY, rememberJob, recallJob, queryKey, type LiveQuery, type LiveResult, type LiveStatus,
  understand, visitorTz, limitKind, resetTime, optionParts, type PlaceOpt, type Miss,
} from "./livelogic";
import { shortStage, doneLine, centreKm, outsideCentre } from "./liveui";
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
const ls = {
  get(k: string) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k: string, v: string) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
  jobs(): Record<string, { id: string; at: number }> { try { return JSON.parse(localStorage.getItem(LIVE_JOBS_KEY) || "{}") || {}; } catch { return {}; } },
};

type Phase = "idle" | "starting" | "running" | "done" | "error" | "capped" | "rejected" | "login" | "ask";

let rowsP: Promise<Row[]> | null = null;
const loadRows = () => (rowsP ||= feedAll({ scope: "all", sort: "score" } as any).then((f: any) => (f.rows || []) as Row[]).catch(() => { rowsP = null; return [] as Row[]; }));

export default function LiveSearchPage() {
  const [sp, setSp] = useSearchParams();
  const q = (sp.get("q") || "").trim();
  // v3: the place the person picked when a name exists in several countries (?in=es, ?in=us-oh)
  const where = (sp.get("in") || "").trim().slice(0, 12) || null;
  const tz = useMemo(() => visitorTz(), []);
  const [ask, setAsk] = useState<PlaceOpt[] | null>(null);
  const [closest, setClosest] = useState<Miss[]>([]);
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

  // resume or start the job, then poll it until it is finished (stops when the page closes or the search changes)
  useEffect(() => {
    const me = ++run.current;
    const alive = () => run.current === me;
    setResults([]); setSt(null); setAsk(null); setClosest([]);
    const und = q ? understand(q, tz, where) : null;
    const local = und ? und.p : null;
    setParsed(local);
    if (!q) { setPhase("idle"); return; }
    if (local && !local.ok) { setPhase("rejected"); setSt({ status: "rejected", reason: local.reason }); return; }
    // "Which Sevilla do you mean?": nothing is searched (or spent) until the person picks one
    if (und?.ask) { setAsk(und.ask); setPhase("ask"); return; }
    let timer: ReturnType<typeof setTimeout> | undefined;
    (async () => {
      setPhase("starting");
      const jobQ = where ? q + " @" + where : q;
      let jobId = attempt === 0 ? recallJob(ls.jobs(), jobQ) : null;
      if (!jobId) {
        const session = (await supabase.auth.getSession().catch(() => null))?.data?.session;
        const headers = { "Content-Type": "application/json", apikey: ENV.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${session?.access_token || ENV.VITE_SUPABASE_PUBLISHABLE_KEY}` };
        let first: LiveStatus;
        try { first = await api("", { method: "POST", headers, body: JSON.stringify({ q, lang: getLang() === "es" ? "es" : "en", tz, where }) }); }
        catch { if (alive()) setPhase("error"); return; }
        if (!alive()) return;
        if (first.parsed) setParsed(first.parsed);
        if (first.status === "need_login") { setPhase("login"); return; }
        if (first.status === "ask" && first.options?.length) { setAsk(first.options); setPhase("ask"); return; }
        if (first.status === "capped") { setPhase("capped"); setSt(first); return; }
        if (first.status === "rejected") { setPhase("rejected"); setSt(first); return; }
        if (!first.job_id) { setPhase("error"); return; }
        if (!session && !(first as any).cached) ls.set(LIVE_FREE_KEY, new Date().toISOString());
        jobId = first.job_id;
        ls.set(LIVE_JOBS_KEY, JSON.stringify(rememberJob(ls.jobs(), jobQ, jobId)));
      }
      setPhase("running");
      let fails = 0;
      const poll = async () => {
        if (!alive()) return;
        try {
          const s: LiveStatus = await api(`?job=${encodeURIComponent(jobId!)}`, { headers: { apikey: ENV.VITE_SUPABASE_PUBLISHABLE_KEY } });
          if (!alive()) return;
          if ((s as any).error === "not found") { const j = ls.jobs(); delete j[queryKey(jobQ)]; ls.set(LIVE_JOBS_KEY, JSON.stringify(j)); setAttempt((a) => a + 1); return; }
          fails = 0;
          setSt(s);
          if (s.parsed) setParsed(s.parsed);
          learnTexts(s.results); // each found home's own Spanish title and texts (8-nov-2026)
          setResults((prev) => mergeResults(prev, (s.results || []).filter(passes)));
          setClosest(Array.isArray(s.closest) ? s.closest : []);
          if (isFinal(s.status)) { setPhase(s.status === "done" ? "done" : "error"); return; }
        } catch { if (++fails > 5) { if (alive()) setPhase("error"); return; } }
        timer = setTimeout(poll, 2500);
      };
      poll();
    })();
    return () => { run.current++; if (timer) clearTimeout(timer); };
  }, [q, where, user?.id, attempt]);

  const p = parsed;
  const chips = p?.ok ? liveChips(p) : [];
  const shownSlugs = useMemo(() => new Set(results.map((r) => r.deal_slug).filter(Boolean)), [results]);
  const similar = useMemo(() => (p?.ok && rows.length ? similarHomes(rows as any[], p, 9).filter((d) => !shownSlugs.has(d.slug)).slice(0, 6) : []), [rows, p, shownSlugs]);
  const best80 = useMemo(() => (p?.ok && rows.length ? similarHomes(rows as any[], p, 9, SHOW_MIN).filter((d) => !shownSlugs.has(d.slug)).slice(0, 6) : []), [rows, p, shownSlugs]);
  const progress = phase === "done" ? 100 : Math.max(2, Math.min(99, st?.progress ?? (phase === "starting" ? 2 : 0)));
  const busy = phase === "starting" || phase === "running";
  const note = st?.note || "";
  const ours = phase === "done" && !results.length ? best80 : similar;
  const bySlug = useMemo(() => new Map(rows.map((r: any) => [r.slug, r])), [rows]);

  const limit = phase === "capped" ? limitKind(st?.note, "capped") : limitKind(note);
  const usedFree = !user && !!ls.get(LIVE_FREE_KEY);
  const askName = ask?.[0] ? (p?.place || ask[0].name) : "";
  const centralMissing = phase === "done" && !!p?.central && results.some((r) => r.source === "web") && !results.some((r: any) => r.central);
  const submit = (e: React.FormEvent) => { e.preventDefault(); const v = text.trim(); if (!v) return; if (v === q) setAttempt((a) => a + 1); else setSp({ q: v }); };

  const shownChips = chips.filter((c) => c.k !== "score"); // "score 80 or more" is our rule, not something we understood
  const dirty = !!text.trim() && text.trim() !== q;
  const outside = useMemo(() => outsideCentre(st, results).filter(passes), [st, results]);

  return (
    <div className="hunt-wrap lv-page lv-min">
      <header className="lv-head">
        <h1>{t("Live search")}</h1>
        <form className={"lv-form" + (dirty || !q ? " is-dirty" : "")} role="search" onSubmit={submit}>
          <Search size={18} aria-hidden="true" />
          <input type="search" value={text} onChange={(e) => setText(e.target.value)} aria-label={t("Search homes")} placeholder={t("Try: 3 bedroom house in Miami under $300k")} enterKeyHint="search" maxLength={200} />
          {(dirty || (!q && !!text.trim())) && <button type="submit" className="lv-go" aria-label={t("Search")}><ArrowRight size={18} aria-hidden="true" /><span>{t("Search")}</span></button>}
        </form>
        {!q && <p className="lv-sub">{t("We search agents and portals now and show only homes that score 80 or more.")}</p>}
        {shownChips.length > 0 && (
          <ul className="lv-chips" aria-label={t("What we understood")}>
            {shownChips.map((c) => <li key={c.k}>{c.k === "beds" || c.k === "where" ? <>{c.value} {c.label && t(c.label)}</> : c.k === "max" || c.k === "min" ? <>{t(c.label)} {c.value}</> : t(c.label)}</li>)}
          </ul>
        )}
        {!user && (
          <p className="lv-free">
            {usedFree || phase === "login" ? t("Your free live search is used.") : t("1 free live search.")}{" "}
            <button type="button" className="hunt-link" onClick={() => requireUser?.("up")}>{t("Sign up for more")}</button>
          </p>
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

      {phase === "ask" && ask && (
        <section className="lv-ask" aria-live="polite">
          <div className="lv-ask-bubble">
            <strong>{t("Which one do you mean?")} <span translate="no" className="notranslate">{askName}</span></strong>
            <ul className="lv-ask-opts">
              {ask.map((o) => {
                const op = optionParts(o);
                return (
                  <li key={o.id}>
                    <button type="button" className="lv-ask-chip" onClick={() => setSp({ q, in: o.id })}>
                      <MapPin size={14} aria-hidden="true" />
                      <span><b translate="no" className="notranslate">{op.name}</b>{op.region && <>, {t(op.region)}</>}, {t(op.country)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      {phase === "login" && (
        <section className="lv-card lv-msg lv-login" role="status">
          <LogIn size={20} aria-hidden="true" />
          <div>
            <strong>{t("Create a free account to keep searching agents and portals live.")}</strong>
            <p>{t("Your first live search was free. Below are the homes we already have for this search.")}</p>
            <div className="lv-actions">
              <button type="button" className="hunt-primary lv-btn" onClick={() => requireUser?.("up")}><UserPlus size={16} aria-hidden="true" /> {t("Sign up free")}</button>
              <button type="button" className="hunt-secondary lv-btn" onClick={() => requireUser?.("in")}><LogIn size={16} aria-hidden="true" /> {t("Log in")}</button>
            </div>
          </div>
        </section>
      )}

      {limit && (
        <section className="lv-card lv-msg lv-limit" role="status">
          <Clock size={20} aria-hidden="true" />
          <div>
            <strong>{limit === "everyone" ? t("Live search has reached today's limit for everyone.") : t("You've reached today's live search limit.")}</strong>
            <p>{t("You can search again tomorrow, from")} {resetTime(getLang())}. {t("Meanwhile, here are the homes we already have for your search.")}</p>
          </div>
        </section>
      )}

      {(busy || phase === "done" || phase === "error") && (
        <section className={"lv-progress" + (phase === "done" ? " is-done" : phase === "error" ? " is-error" : "")} aria-live="polite">
          <div className="lv-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label={t("Live search progress")}>
            <span style={{ width: progress + "%" }} className={busy ? "is-busy" : ""} />
          </div>
          <p className="lv-status">
            {phase === "error" ? <span>{t("The live search stopped early.")}</span>
              : phase === "done" ? <span>{note === "from_earlier" ? t("Instant: from homes we already had.")
                : results.length ? doneLine(results.length, st?.hidden)
                : limit ? t("Today's limit is reached: these are homes we already have.")
                : t("No new listing passed our check today. These homes do:")}</span>
              : <><span>{shortStage(st?.stage)}</span><b>{`${progress}%`}</b></>}
          </p>
          {busy && <p className="lv-fine">{t("Takes a few minutes. You can leave and come back.")}</p>}
          {centralMissing && <p className="lv-fine">{t("Few homes in the centre fit this budget.")}</p>}
          {phase === "error" && <button type="button" className="hunt-secondary lv-btn" onClick={() => setAttempt((a) => a + 1)}><RotateCcw size={16} aria-hidden="true" /> {t("Try again")}</button>}
        </section>
      )}

      {(results.length > 0 || busy) && (
        <section className="lv-results" aria-label={t("Found for you")} aria-busy={busy}>
          {results.length > 0 && <h2>{t("Found for you")}</h2>}
          {busy && !results.length && <h2 className="lv-h-muted">{t("Checking the first listings")}</h2>}
          <div className="hx-grid">
            {results.map((r, i) => <LiveHome key={r.id} r={r} pos={i + 1} own={r.deal_slug ? bySlug.get(r.deal_slug) : undefined} />)}
            {busy && results.length < 3 && [0, 1].slice(0, results.length ? 1 : 2).map((i) => <HomeCardSkeleton key={"sk" + i} />)}
          </div>
        </section>
      )}

      {outside.length > 0 && (
        <section className="lv-results lv-outside" aria-label={t("Outside the centre")}>
          <h2>{t("Outside the centre")}</h2>
          <div className="hx-grid">
            {outside.map((r, i) => <LiveHome key={r.id} r={r} pos={results.length + i + 1} own={r.deal_slug ? bySlug.get(r.deal_slug) : undefined} />)}
          </div>
        </section>
      )}

      {phase === "done" && closest.length > 0 && (
        <section className="lv-closest" aria-label={t("Closest listings we checked")}>
          <h2>{t("Closest listings we checked")}</h2>
          <p className="lv-fine">{t("They did not pass our check, so they open on the portal.")}</p>
          <ul>
            {closest.map((m) => (
              <li key={m.id}>
                <a href={m.url} target="_blank" rel="noopener noreferrer nofollow" className="lv-miss">
                  {m.image ? <img src={m.image} alt="" loading="lazy" width={96} height={72} /> : <span className="lv-miss-noimg" aria-hidden="true" />}
                  <span className="lv-miss-body">
                    <b>{m.price != null ? fmtMoney(m.price, m.currency || "EUR") : ""}</b>
                    <span className="lv-miss-title">{getLang() === "es" && m.title_es ? m.title_es : m.title}</span>
                    <span className="lv-miss-meta">
                      {[m.beds ? `${m.beds} ${t("bed")}` : "", m.sqm ? `${m.sqm} m²` : "", m.location].filter(Boolean).join(" · ")}
                    </span>
                    <span className="lv-miss-why">
                      {t("AI estimate")} {m.score}/100{m.photo_quality != null && <> · {t("Photos")} {m.photo_quality}/10</>}
                    </span>
                  </span>
                  <ExternalLink size={16} aria-hidden="true" className="lv-miss-ext" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {p?.ok && phase !== "ask" && ours.length > 0 && (
        <section className="lv-similar">
          <h2>{busy ? t("Meanwhile, the closest homes we have") : phase === "done" && !results.length ? t("Best RealHunt homes for this search") : t("More RealHunt homes for this search")}</h2>
          <div className="hx-grid">{ours.map((d, i) => <HomeCard key={d.slug} deal={d} pos={i + 1} />)}</div>
        </section>
      )}

      <details className="lv-how">
        <summary><Sparkles size={15} aria-hidden="true" /> {t("How the AI estimate works")}</summary>
        <p>{t("It is a first score before a person checks the home: price per m² against comparable homes in the same city or area (40 points), how many photos there are and how good they look (20), the bedrooms you asked for (15) and how complete the listing is (25). Caveats such as a 55+ community or a needed renovation take points off.")}</p>
        <p>{t("Our AI looks at the photos and reads the listing. We show a home only if it scores 80 or more, its photos are good, and it is not a mobile home, on rented land, an auction, a timeshare or a share of a property. A price far below the area needs a reason, and we tell you that reason.")}</p>
        <p>{t("Homes to buy that pass get a full RealHunt page, marked as checked by AI and not yet by a person, until a person checks them.")}</p>
        <p className="lv-fine">{t("Prices in euros are approximate. General information, not advice.")}</p>
      </details>
    </div>
  );
}

/** A live result on the home page's own card: a real RealHunt page for homes to buy, the portal for rentals. */
function LiveHome({ r, pos, own }: { r: LiveResult; pos: number; own?: any }) {
  // a home already in the site's snapshot: exactly the row the home page uses
  const deal = own || resultToDeal(r);
  const orig = r.price != null && r.currency && r.currency !== "EUR" ? fmtMoney(r.price, r.currency) : undefined;
  const ext = r.deal_slug ? undefined : r.url;
  return <HomeCard deal={deal} pos={pos} href={ext} origPrice={orig} rent={r.kind === "rent"} dist={centreKm(r)} />;
}
