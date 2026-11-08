// /live-search?q=... (v2, 8-nov-2026): searches the web for homes to buy or rent while the person waits. A job runs
// in the edge function realhunt-live-search (it may take a few minutes: every find is checked by Claude vision and
// the good ones become real RealHunt homes); this page polls it, shows honest progress by stage and meanwhile the
// closest homes RealHunt already has. Results use the home page's own card (HomeCard) and open the full home page.
// The main search box sends home searches with a place here (findui.tsx), so nobody has to press a button.
// Leaving and coming back resumes the same job (localStorage, and the server reuses a search of the last 24 h).
// Without an account the first search is free; after that our own homes still show, with a gentle sign-in nudge.
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Globe, Info, LogIn, RotateCcw, Search, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCommunity } from "./ctx";
import { feedAll, type Row } from "./extras";
import { HomeCard, HomeCardSkeleton } from "./homecards";
import { getLang, t } from "./i18n";
import {
  parseLiveQuery, similarHomes, liveChips, stageParts, isFinal, mergeResults, fmtMoney, SHOW_MIN, LIVE_FREE_KEY, passes, resultToDeal,
  LIVE_JOBS_KEY, rememberJob, recallJob, queryKey, type LiveQuery, type LiveResult, type LiveStatus,
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
const ls = {
  get(k: string) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k: string, v: string) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
  jobs(): Record<string, { id: string; at: number }> { try { return JSON.parse(localStorage.getItem(LIVE_JOBS_KEY) || "{}") || {}; } catch { return {}; } },
};

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

  // resume or start the job, then poll it until it is finished (stops when the page closes or the search changes)
  useEffect(() => {
    const me = ++run.current;
    const alive = () => run.current === me;
    setResults([]); setSt(null);
    const local = q ? parseLiveQuery(q) : null;
    setParsed(local);
    if (!q) { setPhase("idle"); return; }
    if (local && !local.ok) { setPhase("rejected"); setSt({ status: "rejected", reason: local.reason }); return; }
    let timer: ReturnType<typeof setTimeout> | undefined;
    (async () => {
      setPhase("starting");
      let jobId = attempt === 0 ? recallJob(ls.jobs(), q) : null;
      if (!jobId) {
        const session = (await supabase.auth.getSession().catch(() => null))?.data?.session;
        const headers = { "Content-Type": "application/json", apikey: ENV.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${session?.access_token || ENV.VITE_SUPABASE_PUBLISHABLE_KEY}` };
        let first: LiveStatus;
        try { first = await api("", { method: "POST", headers, body: JSON.stringify({ q, lang: getLang() === "es" ? "es" : "en" }) }); }
        catch { if (alive()) setPhase("error"); return; }
        if (!alive()) return;
        if (first.parsed) setParsed(first.parsed);
        if (first.status === "need_login") { setPhase("login"); return; }
        if (first.status === "capped") { setPhase("capped"); setSt(first); return; }
        if (first.status === "rejected") { setPhase("rejected"); setSt(first); return; }
        if (!first.job_id) { setPhase("error"); return; }
        if (!session && !(first as any).cached) ls.set(LIVE_FREE_KEY, new Date().toISOString());
        jobId = first.job_id;
        ls.set(LIVE_JOBS_KEY, JSON.stringify(rememberJob(ls.jobs(), q, jobId)));
      }
      setPhase("running");
      let fails = 0;
      const poll = async () => {
        if (!alive()) return;
        try {
          const s: LiveStatus = await api(`?job=${encodeURIComponent(jobId!)}`, { headers: { apikey: ENV.VITE_SUPABASE_PUBLISHABLE_KEY } });
          if (!alive()) return;
          if ((s as any).error === "not found") { const j = ls.jobs(); delete j[queryKey(q)]; ls.set(LIVE_JOBS_KEY, JSON.stringify(j)); setAttempt((a) => a + 1); return; }
          fails = 0;
          setSt(s);
          if (s.parsed) setParsed(s.parsed);
          setResults((prev) => mergeResults(prev, (s.results || []).filter(passes)));
          if (isFinal(s.status)) { setPhase(s.status === "done" ? "done" : "error"); return; }
        } catch { if (++fails > 5) { if (alive()) setPhase("error"); return; } }
        timer = setTimeout(poll, 2500);
      };
      poll();
    })();
    return () => { run.current++; if (timer) clearTimeout(timer); };
  }, [q, user?.id, attempt]);

  const p = parsed;
  const chips = p?.ok ? liveChips(p) : [];
  const shownSlugs = useMemo(() => new Set(results.map((r) => r.deal_slug).filter(Boolean)), [results]);
  const similar = useMemo(() => (p?.ok && rows.length ? similarHomes(rows as any[], p, 9).filter((d) => !shownSlugs.has(d.slug)).slice(0, 6) : []), [rows, p, shownSlugs]);
  const best80 = useMemo(() => (p?.ok && rows.length ? similarHomes(rows as any[], p, 9, SHOW_MIN).filter((d) => !shownSlugs.has(d.slug)).slice(0, 6) : []), [rows, p, shownSlugs]);
  const progress = phase === "done" ? 100 : Math.max(2, Math.min(99, st?.progress ?? (phase === "starting" ? 2 : 0)));
  const stage = stageParts(st?.stage);
  const busy = phase === "starting" || phase === "running";
  const note = st?.note || "";
  const fresh = results.filter((r) => r.source === "web").length;
  const ours = phase === "done" && !results.length ? best80 : similar;
  const bySlug = useMemo(() => new Map(rows.map((r: any) => [r.slug, r])), [rows]);

  const submit = (e: React.FormEvent) => { e.preventDefault(); const v = text.trim(); if (!v) return; if (v === q) setAttempt((a) => a + 1); else setSp({ q: v }); };

  return (
    <div className="hunt-wrap lv-page">
      <header className="lv-head">
        <span className="lv-eyebrow"><Globe size={14} aria-hidden="true" /> {t("Live search")}</span>
        <h1>{t("Search the whole web for homes")}</h1>
        <p className="lv-sub">{t("Homes to buy or rent from estate agents and portals. Our AI checks every photo and detail and shows only the best ones, each with a full RealHunt page.")}</p>
        <form className="lv-form" role="search" onSubmit={submit}>
          <Search size={18} aria-hidden="true" />
          <input type="search" value={text} onChange={(e) => setText(e.target.value)} aria-label={t("Search homes")} placeholder={t("Try: 3 bedroom house in Miami under $300k")} enterKeyHint="search" maxLength={200} />
          <button type="submit" className="lv-go" disabled={busy && text.trim() === q}>{t("Search")}</button>
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
        <section className="lv-card lv-msg lv-nudge" role="status">
          <LogIn size={20} aria-hidden="true" />
          <div>
            <strong>{t("Here are the best homes we already have for your search.")}</strong>
            <p>{t("You used your free live search. Sign in (it is free) and we will also search estate agents and portals for this.")}</p>
            <button type="button" className="hunt-secondary lv-btn" onClick={() => requireUser?.()}>{t("Sign in to search the web")}</button>
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
          {busy && <p className="lv-wait">{t("This will take a few minutes: we are filtering the best homes for you. Meanwhile, look at these:")}</p>}
          {busy && <p className="lv-fine">{t("You can leave this page: come back to the same search and it carries on.")}</p>}
          {phase === "error" && <button type="button" className="hunt-secondary lv-btn" onClick={() => setAttempt((a) => a + 1)}><RotateCcw size={16} aria-hidden="true" /> {t("Try again")}</button>}
          {phase === "done" && (
            <div className="lv-summary">
              {note === "from_earlier" ? <p>{t("These come from homes already on RealHunt and earlier searches, so the answer was instant.")}</p>
                : results.length ? <p><b>{results.length}</b> {results.length === 1 ? t("home passed our AI check.") : t("homes passed our AI check.")}{st?.hidden ? <> {t("Listings we checked and left out:")} {st.hidden}</> : null}</p>
                : <p>{t("None of the listings we found today passed our AI check (good photos, good value, no surprises), so we do not show them. These RealHunt homes for your search do:")}</p>}
              {/budget/.test(note) && <p className="lv-fine">{t("You have used today's live web searches, so these results come from our own data.")}</p>}
              {fresh > 0 && <p className="lv-fine">{t("New homes found today now have their own RealHunt page. A person will check them too.")}</p>}
            </div>
          )}
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

      {p?.ok && ours.length > 0 && (
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
  return <HomeCard deal={deal} pos={pos} href={ext} origPrice={orig} rent={r.kind === "rent"} />;
}
