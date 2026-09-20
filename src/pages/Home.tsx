import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import ListingInfo from "@/components/realhunt/ListingInfo";
import QuickView from "@/components/realhunt/QuickView";
import { catalogPosition, useCatalogPosition } from "@/hooks/useCatalogPosition";
import { CatalogFilters, COMO, EMPTY_FILTERS, comparisonCodes, filtersFromUrl, filterSearch, homePath, matchesHome, readSession, writeSession } from "@/lib/catalog";
import PhotoGallery from "@/components/realhunt/PhotoGallery";
import RHNav from "@/components/realhunt/RHNav";
import AuthModal from "@/components/realhunt/AuthModal";
import CaptureInline from "@/components/realhunt/CaptureInline";
const Onboarding = lazy(() => import("@/components/realhunt/Onboarding"));
import { Waves, Check, Heart, Search, Bell, BadgeCheck, TrendingDown, Map as MapIcon, Layers, Sparkles, ArrowRight, Lock, MessageCircle, Share2, X, ArrowDownWideNarrow, Eye, GitCompareArrows } from "lucide-react";
import { db, eur, FLAG, norm, slug, unslug, isNew, cleanCap, IG, EBC, MAX_PRICE, HOME_MAX_PRICE, track, srcSet, score, subscribeEmail, lastEmail } from "@/lib/rh";
import { useExperiment } from "@/lib/experiments";

const PRICE_CHIPS: [string, number][] = [["< €10k", 10000], ["< €25k", 25000], ["< €50k", 50000], ["< €60k", 60000]];
const PAGE = 40;
const FEED_KEY = "rh_feed_v3";
const DROPS_KEY = "rh_drops_v1";
const FEED_COLS = "id,source_account,shortcode,image_urls,posted_at,location_name,country_guess,price_eur,is_beach,price_in_image,sqm,bedrooms,hook,rank_score,verified,status";
const VALID_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function cachedFeed(): IG[] {
  try {
    const cache = JSON.parse(localStorage.getItem(FEED_KEY) || "null");
    if (cache && Array.isArray(cache.rows) && Date.now() - cache.t < 7 * 86400e3) return cache.rows;
  } catch { /* Storage may be disabled or full. The live feed remains available. */ }
  return [];
}

// A promoted listing that lives on idealista, not on RealHunt. It is always the last card in the
// feed, and like every other home it opens its own page first (/lake-como); the outbound link to the
// original listing is there. We never pretend to host it.


// Existing editorial home, pinned after EBC on the default feed.
const GATED: IG = { id: "gated-1", source_account: "", shortcode: "DcndWlcGwtG", caption: null, image_urls: ["/finds/DcndWlcGwtG-0.webp"], posted_at: null, location_name: "Sellano, Umbria, Italy", country_guess: "Italy", price_eur: 46000, price_raw: null, likes: 1572, is_beach: false };

// An in-grid "leave your email, get the top 10" card. Same size/shape as a listing card so it sits
// naturally in the feed instead of looking like an ad. Uses the shared subscribeEmail() write (collection
// only, no auto-send) and reads the input straight from the DOM on submit so autofill never gets
// flagged as an invalid email (see EmailCapture.tsx for the same fix).
const CaptureCard = () => {
  const { user } = useAuth();
  const [mode, setMode] = useState<"idle" | "sending" | "done" | "error" | "failed">("idle");
  const [seen, setSeen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const head = useExperiment("capture_card_headline", [{ id: "A", text: "Get the top 10 homes. Free, by email." }]);

  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver((e) => { if (e[0].isIntersecting && !seen) { setSeen(true); track("capture_show", { meta: { kind: "grid_card" } }); } }, { threshold: 0.5 });
    io.observe(el); return () => io.disconnect();
  }, [seen]);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const el = e.currentTarget.querySelector<HTMLInputElement>("input[type=email]");
    const v = (el?.value ?? "").trim();
    if (!VALID_EMAIL.test(v)) { setMode("error"); return; }
    setMode("sending");
    const { ok } = await subscribeEmail(v, "grid_card", user?.id);
    setMode(ok ? "done" : "failed");
  };

  return (
    // The dark background is set inline on purpose. It used to be `bg-gradient-to-br from-ink ...`,
    // but `ink` is not a Tailwind theme colour in this project (only the hand-written .text-ink /
    // .bg-paper utilities in index.css), so `from-ink` produced no CSS, the whole gradient was
    // invalid, and the card rendered transparent — white text on cream paper, i.e. invisible.
    // tailwind.config.ts now declares ink/paper/hairline, but this stays inline so the card can
    // never silently disappear again.
    <div ref={ref} style={{ background: "linear-gradient(140deg,#16150F 0%,#232220 55%,#141414 100%)" }}
      className="col-span-2 sm:col-span-1 relative rounded-2xl overflow-hidden min-h-[300px] sm:min-h-[360px] h-full text-white p-5 md:p-6 flex flex-col justify-between shadow-sm [content-visibility:auto]">
      <div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 text-[11px] font-medium"><Sparkles size={11} /> Free</span>
        <p className="mt-3 font-display text-[19px] md:text-[21px] leading-[1.15] tracking-tight">{head.text || "Get the top 10 homes. Free, by email."}</p>
        <p className="mt-1.5 text-[12.5px] text-white/70">Real listings under €60k, picked by hand.</p>
      </div>
      {mode === "done" ? (
        <div className="flex items-start gap-2.5">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white"><Check size={16} strokeWidth={3} /></span>
          <div>
            <p className="text-[14px] font-medium">Received.</p>
            <p className="text-[12.5px] text-white/70">Your top 10 lands in your inbox by the end of this week.</p>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-2">
          <input type="email" inputMode="email" autoComplete="email" name="email" placeholder="you@email.com" aria-invalid={mode === "error"}
            className={`w-full rounded-full px-3.5 py-2.5 text-[13.5px] text-ink bg-white outline-none border ${mode === "error" ? "border-red-400 ring-2 ring-red-400/30" : "border-transparent focus:ring-2 focus:ring-white/40"}`} />
          <button type="submit" disabled={mode === "sending"} className="rh-btn-primary !py-2.5 !text-[13px] inline-flex items-center justify-center gap-1.5 disabled:opacity-70">
            {mode === "sending" ? "Sending…" : "Send me the top 10"} {mode !== "sending" && <ArrowRight size={14} />}
          </button>
          {mode === "error" && <span className="text-[11.5px] text-red-300">That email does not look right.</span>}
          {mode === "failed" && <span className="text-[11.5px] text-amber-300">We could not save that just now. Try once more.</span>}
        </form>
      )}
    </div>
  );
};

const Home = () => {
  const { country: cParam, account: aParam } = useParams();
  const { user } = useAuth();
  const [finds, setFinds] = useState<IG[]>(cachedFeed);
  const route = useLocation();
  const routeCountry = cParam ? cParam.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") : undefined;
  const applied = useMemo(() => filtersFromUrl(route.search, routeCountry), [route.search, routeCountry]);
  const { country, beach, maxP, q } = applied;
  const [draft, setDraft] = useState<CatalogFilters>(applied);
  const catalogUrl = route.pathname + route.search;
  const [selected, setSelected] = useState<string[]>(() => comparisonCodes(readSession("rh_compare", [])));
  const [quickCode, setQuickCode] = useState<string | null>(null);
  const quickTrigger = useRef<HTMLElement | null>(null);
  const [authRedirect, setAuthRedirect] = useState<string | undefined>();
  const navigate = useNavigate();
  const [limit, setLimit] = useState(() => Math.max(PAGE, catalogPosition(catalogUrl)?.limit || PAGE));
  const sortParam = new URLSearchParams(route.search).get("sort");
  const sort: "best" | "cheap" | "new" = sortParam === "cheap" || sortParam === "new" ? sortParam : "best";
  const applyFilters = (filters: CatalogFilters, ordering = sort) => {
    const path = aParam ? route.pathname : "/";
    navigate(path + filterSearch(filters, ordering, route.search));
  };
  const setSort = (value: typeof sort) => applyFilters(applied, value);
  const [favs, setFavs] = useState<Set<string>>(new Set());
  const [auth, setAuth] = useState(false);
  const [alert, setAlert] = useState({ email: "", country: "Any", max: 50000 });
  const [alertSent, setAlertSent] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const [pref, setPref] = useState<{ country?: string | null; budget?: number | null }>({});
  const [drops, setDrops] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(() => finds.length > 0);
  const headline = useExperiment("home_headline", [{ id: "A", text: "Real homes under €60,000." }]);

  useEffect(() => {
    // 1. Instant paint from the last feed we saw (stale-while-revalidate), then refresh from the DB.
    db.from("ig_finds").select(FEED_COLS).neq("status", "hidden").lte("price_eur", HOME_MAX_PRICE).order("rank_score", { ascending: false, nullsFirst: false }).limit(400)
      .then(({ data, error }: any) => {
        if (error && !data) { setLoaded(true); return; }
        const rows = (data || []).filter((f: IG) => f.image_urls && f.image_urls.length).sort((a: IG, b: IG) => score(b) - score(a));
        setFinds(rows); setLoaded(true);
        try { localStorage.setItem(FEED_KEY, JSON.stringify({ t: Date.now(), rows })); } catch {}
      });
    track("home_view");
    try { const ref = new URLSearchParams(location.search).get("ref"); if (ref) localStorage.setItem("rh_ref", ref); } catch {}
    // 2. Non-critical data after first paint.
    // "Price drop" badges used to pull 2,000 price_history rows on EVERY page view — by far the
    // heaviest request on the page, for a handful of badges that barely change day to day. Now it is
    // cached per browser for 6 hours, so a visitor fetches it once instead of on every visit.
    const idle = (window as any).requestIdleCallback || ((cb: () => void) => setTimeout(cb, 1200));
    idle(() => {
      try {
        const c = JSON.parse(localStorage.getItem(DROPS_KEY) || "null");
        if (c && Array.isArray(c.ids) && Date.now() - c.t < 6 * 3600e3) { setDrops(new Set(c.ids)); return; }
      } catch {}
      db.from("price_history").select("find_id,price_eur,created_at").order("created_at", { ascending: false }).limit(2000).then(({ data }: any) => {
        const by: Record<string, number[]> = {};
        (data || []).forEach((r: any) => { (by[r.find_id] = by[r.find_id] || []).push(r.price_eur); });
        const ids = Object.entries(by).filter(([, v]) => v.length > 1 && v[0] < Math.max(...v)).map(([k]) => k);
        setDrops(new Set(ids));
        try { localStorage.setItem(DROPS_KEY, JSON.stringify({ t: Date.now(), ids })); } catch {}
      });
    });
  }, []);
  useEffect(() => {
    if (!user) { setFavs(new Set()); setPref({}); return; }
    db.from("profiles").select("interest_country,budget_max,referred_by").eq("user_id", user.id).maybeSingle().then(({ data }: any) => { if (!data) return; setPref({ country: data.interest_country, budget: data.budget_max }); try { const ref = localStorage.getItem("rh_ref"); if (ref && !data.referred_by) db.from("profiles").update({ referred_by: ref }).eq("user_id", user.id).then(() => {}); } catch {} });
    db.from("find_events").select("find_id").eq("user_id", user.id).eq("event", "favorite").then(({ data }: any) => setFavs(new Set((data || []).map((r: any) => r.find_id))));
  }, [user]);

  const allCountries = useMemo(() => { const m: Record<string, number> = { Indonesia: 1 }; finds.forEach((f) => { const c = norm(f.country_guess); m[c] = (m[c] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([c]) => c); }, [finds]);

  useEffect(() => {
    const t = aParam ? `Cheap homes spotted by @${aParam}` : country !== "All" ? `Cheap houses in ${country} under €60,000` : "Real homes under €60,000";
    document.title = `${t} · RealHunt`;
    const m = document.querySelector('meta[name="description"]'); if (m) m.setAttribute("content", `${t}. Real listings under €60k, ranked by how cheap they are for where they are. Beach, countryside, villages.`);
  }, [country, aParam]);

  const selectHomes = useCallback((filters: CatalogFilters) => {
    const { country, beach, maxP, q } = filters;
    const qq = q.trim().toLowerCase();
    const boost = (f: IG) => (pref.country && pref.country !== "Any" && norm(f.country_guess) === pref.country ? 1 : 0) + (pref.budget && f.price_eur && f.price_eur <= pref.budget ? 0.5 : 0);
    let l = finds.filter(f => matchesHome(f, filters, aParam));
    const ebcOk = !aParam && matchesHome(EBC, filters);
    // Explicit ordering always wins over the personalised one: if someone asked for "cheapest",
    // showing them our idea of "best" instead is just ignoring them.
    if (sort === "cheap") l = [...l].sort((a, b) => (a.price_eur ?? Infinity) - (b.price_eur ?? Infinity));
    else if (sort === "new") l = [...l].sort((a, b) => new Date(b.posted_at || 0).getTime() - new Date(a.posted_at || 0).getTime());
    else if (pref.country || pref.budget) l = [...l].sort((a, b) => boost(b) - boost(a) || score(b) - score(a));
    if (!loaded) return [];
    // EBC and the gated card are pinned to the top ONLY on the default ordering. The moment someone
    // asks for "cheapest" or "newest", pinning a €46,000 card above cheaper homes makes the sort look
    // broken — which is exactly what it looked like. Under an explicit sort they take their honest
    // place in the order like any other home.
    const gatedOk = !aParam && matchesHome(GATED, filters);
    if (ebcOk || gatedOk) {
      const pinned = [...(ebcOk ? [{ ...EBC, id: "ebc-1" } as IG] : []), ...(gatedOk ? [finds.find(f => f.shortcode === GATED.shortcode) || GATED] : [])];
      if (sort === "best") l = [...pinned, ...l];
      else if (sort === "cheap") l = [...pinned, ...l].sort((a, b) => (a.price_eur ?? Infinity) - (b.price_eur ?? Infinity));
      else l = [...pinned, ...l].sort((a, b) => new Date(b.posted_at || 0).getTime() - new Date(a.posted_at || 0).getTime());
    }
    const seen = new Set<string>();
    l = l.filter((f) => (seen.has(f.shortcode) ? false : (seen.add(f.shortcode), true)));
    // Editorial placement in the unfiltered Best feed. Keep explicit sorts and filters intact.
    if (sort === "best" && country === "All" && !beach && !maxP && !qq && !aParam) {
      const featured = l.findIndex((f) => f.shortcode === "acquappesa-sea-view-39000");
      if (featured !== -1) {
        const [home] = l.splice(featured, 1);
        l.splice(Math.min(3, l.length), 0, home);
      }
    }
    // One "leave your email" card woven into the grid, wherever there is enough of a feed for it to feel earned.
    const capture = { id: "capture" } as unknown as IG;
    if (l.length > 0) l = l.length > 7 ? [...l.slice(0, 7), capture, ...l.slice(7)] : [...l, capture];
    // Keep the promoted card last, and only when it matches the active filters.
    if (!aParam && matchesHome(COMO, filters)) l = [...l, { ...COMO } as IG];
    return l;
  }, [finds, aParam, pref, loaded, sort]);
  const shown = useMemo(() => selectHomes(applied), [selectHomes, applied]);
  const previewCount = useMemo(() => selectHomes(draft).filter(f => f.id !== "capture").length, [selectHomes, draft]);
  const pendingFilters = (Object.keys(EMPTY_FILTERS) as (keyof CatalogFilters)[]).some(key => draft[key] !== applied[key]);
  const homes = useMemo(() => shown.filter(f => f.id !== "capture"), [shown]);
  const quickIndex = homes.findIndex(f => f.shortcode === quickCode);
  const quickHome = homes[quickIndex] || null;
  const closeQuick = () => { setQuickCode(null); requestAnimationFrame(() => quickTrigger.current?.focus({ preventScroll: true })); };
  const toggleCompare = (f: IG) => setSelected(codes => codes.includes(f.shortcode) ? codes.filter(c => c !== f.shortcode) : codes.length < 3 ? [...codes, f.shortcode] : codes);
  useEffect(() => { writeSession("rh_compare", selected); }, [selected]);
  useEffect(() => {
    setDraft(applied); setLimit(Math.max(PAGE, catalogPosition(catalogUrl)?.limit || PAGE)); setQuickCode(null);
    writeSession("rh_catalog_url", catalogUrl);
  }, [catalogUrl, applied]);
  useCatalogPosition(catalogUrl, loaded, limit);
  const alternatives = useMemo(() => {
    if (!loaded || homes.length) return [];
    const candidates: { label: string; filters: CatalogFilters; count: number }[] = [];
    const add = (label: string, filters: CatalogFilters) => {
      const count = selectHomes(filters).filter(f => f.id !== "capture").length;
      if (count) candidates.push({ label, filters, count });
    };
    if (maxP && maxP < HOME_MAX_PRICE) {
      const higher = [10000, 25000, 50000, 60000].filter(n => n > maxP);
      for (const n of higher) { add(`Budget up to ${eur(n)}`, { ...applied, maxP: n }); if (candidates.length) break; }
    }
    if (q) add("Remove search text", { ...applied, q: "" });
    if (beach) add("Include homes away from the beach", { ...applied, beach: false });
    if (country !== "All") add("Explore all countries", { ...applied, country: "All" });
    return candidates.slice(0, 3);
  }, [loaded, homes.length, selectHomes, applied]);

  useEffect(() => {
    // The loading skeleton can put the sentinel near the viewport. Wait for the
    // real cards before extending the feed, otherwise the first page doubles.
    if (!loaded || limit >= shown.length) return;
    const el = sentinel.current; if (!el) return;
    const io = new IntersectionObserver((e) => { if (e[0].isIntersecting) setLimit((n) => n + PAGE); }, { rootMargin: "600px" });
    io.observe(el); return () => io.disconnect();
  }, [loaded, limit, shown.length]);
  const min = useMemo(() => shown.reduce((a, f) => (f.price_eur && f.price_eur > 0 && f.price_eur < a ? f.price_eur : a), Infinity), [shown]);

  const toggleFav = async (e: React.MouseEvent, f: IG) => {
    e.preventDefault(); e.stopPropagation();
    if (!user) { track("fav_gate", { find: f.shortcode }); setAuthRedirect(homePath(f)); closeQuick(); setAuth(true); return; }
    if (f.id.startsWith("ebc")) return;
    const on = favs.has(f.id); const n = new Set(favs); on ? n.delete(f.id) : n.add(f.id); setFavs(n);
    if (on) await db.from("find_events").delete().eq("user_id", user.id).eq("find_id", f.id).eq("event", "favorite");
    else { await db.from("find_events").insert({ user_id: user.id, find_id: f.id, event: "favorite" }); track("favorite", { find: f.shortcode }); }
  };
  const saveAlert = async (e: React.FormEvent) => { e.preventDefault(); if (!/.+@.+\..+/.test(alert.email)) return; setAlertSent(true); track("alert", { meta: alert }); try { await db.from("alerts").insert({ email: alert.email, country: alert.country === "Any" ? null : alert.country, max_price: alert.max, beach, user_id: user?.id || null }); } catch {} };

  // Suggestions come from the feed that is already in memory, so typing costs nothing and never
  // proposes a place with no homes behind it.
  const suggestions = useMemo(() => {
    const qq = draft.q.trim().toLowerCase();
    if (qq.length < 2) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const f of finds) {
      for (const cand of [f.location_name, norm(f.country_guess)]) {
        if (!cand) continue;
        const k = cand.toLowerCase();
        if (k.includes(qq) && !seen.has(k)) { seen.add(k); out.push(cand); }
        if (out.length >= 6) return out;
      }
    }
    return out;
  }, [draft.q, finds]);

  const chip = (on: boolean) => `shrink-0 inline-flex items-center gap-1.5 px-2.5 md:px-3.5 py-2 rounded-full border text-[12px] md:text-[13px] transition-colors ${on ? "bg-sky-500 text-white border-sky-500" : "border-hairline hover:border-ink bg-white"}`;

  return (
    <div className={`min-h-screen bg-paper text-ink ${selected.length ? "pb-36" : ""}`}>
      <RHNav />

      <section className="max-w-[1240px] mx-auto px-4 md:px-6 pt-6 md:pt-10 pb-3">
        <h1 className="font-display text-[clamp(30px,5vw,54px)] leading-[1.02] tracking-tight max-w-[22ch]">{aParam ? <>Spotted by <span className="text-ink-muted">@{aParam}</span></> : country !== "All" ? <>Cheap homes in {country}.</> : <>{headline.text || "Real homes under €60,000."}</>}</h1>
        <p className="mt-3 text-[15px] md:text-[17px] text-ink-muted">{loaded ? shown.filter((f) => f.id !== "capture").length : "…"} homes{isFinite(min) && <> · cheapest <b className="text-ink">{eur(min)}</b></>}{aParam && <> · <a href={`https://instagram.com/${aParam}`} target="_blank" rel="noreferrer" className="underline">follow them on Instagram</a></>}</p>
      </section>

      <section aria-label="Find a home" className="max-w-[1240px] mx-auto px-4 md:px-6 pt-2 pb-5">
        <form onSubmit={e => { e.preventDefault(); applyFilters(draft); }} className="rounded-2xl border border-hairline bg-white p-3 md:p-5 shadow-sm">
          <div className="relative">
            <Search size={19} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
            <input type="search" aria-label="Search homes" value={draft.q} onChange={(e) => setDraft({ ...draft, q: e.target.value })} placeholder="Country, city or type of home" className="w-full rounded-xl border border-hairline bg-paper py-3 pl-11 pr-8 text-[16px] outline-none focus:border-ink focus:ring-2 focus:ring-ink/10" />
            {draft.q && <button type="button" onClick={() => setDraft({ ...draft, q: "" })} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-hairline/40"><X size={16} /></button>}
          </div>
          {suggestions.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{suggestions.map((sg) => <button type="button" key={sg} onClick={() => setDraft({ ...draft, q: sg })} className="px-3 py-1.5 rounded-full border border-hairline text-[12px] hover:border-ink">{sg}</button>)}</div>}
          <div className="mt-3 md:mt-4 grid gap-3 md:gap-4 grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[200px_1fr_auto]">
            <label className="col-start-1 row-start-1 flex flex-col gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-ink-muted">Country
              <select aria-label="Country" value={draft.country} onChange={(e) => setDraft({ ...draft, country: e.target.value })} className="w-full h-10 rounded-xl border border-hairline bg-white px-3 text-[14px] normal-case tracking-normal text-ink outline-none focus:border-ink">
                {["All", ...allCountries].map((k) => <option key={k} value={k}>{k === "All" ? "All countries" : `${FLAG[k] || ""} ${k}`}</option>)}
              </select>
            </label>
            <fieldset className="col-span-2 row-start-2 lg:col-span-1 lg:col-start-2 lg:row-start-1 min-w-0"><legend className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-ink-muted">Budget</legend><div className="flex flex-wrap gap-1.5 md:gap-2">{PRICE_CHIPS.map(([l, v]) => <button type="button" key={v} onClick={() => setDraft({ ...draft, maxP: draft.maxP === v ? 0 : v })} aria-pressed={draft.maxP === v} className={chip(draft.maxP === v)}>{l}</button>)}</div></fieldset>
            <fieldset className="col-start-2 row-start-1 lg:col-start-3"><legend className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-ink-muted">Features</legend><button type="button" onClick={() => setDraft({ ...draft, beach: !draft.beach })} aria-pressed={draft.beach} className={chip(draft.beach)}><Waves size={14} /> Beach</button></fieldset>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-4">
            <p aria-live="polite" className="text-sm text-ink-muted">{loaded ? `${previewCount} matching ${previewCount === 1 ? "home" : "homes"}${pendingFilters ? " · filters not applied yet" : ""}` : "Loading homes…"}</p>
            <button type="submit" disabled={!loaded} className="rh-btn-primary !py-2.5 !px-5">{loaded ? `Show ${previewCount} ${previewCount === 1 ? "home" : "homes"}` : "Loading…"}</button>
          </div>
        </form>
        {(q || maxP || beach || country !== "All") && <div aria-label="Active filters" className="flex flex-wrap gap-2 mt-3">
          {country !== "All" && <button aria-label="Remove country filter" onClick={() => applyFilters({ ...applied, country: "All" })} className={chip(true)}>{country}<X size={14} /></button>}
          {!!maxP && <button aria-label="Remove budget filter" onClick={() => applyFilters({ ...applied, maxP: 0 })} className={chip(true)}>Up to {eur(maxP)}<X size={14} /></button>}
          {beach && <button aria-label="Remove beach filter" onClick={() => applyFilters({ ...applied, beach: false })} className={chip(true)}>Beach<X size={14} /></button>}
          {q && <button aria-label="Remove search filter" onClick={() => applyFilters({ ...applied, q: "" })} className={chip(true)}>{q}<X size={14} /></button>}
          <button className="text-[13px] underline px-2" onClick={() => applyFilters(EMPTY_FILTERS)}>Reset filters</button>
        </div>}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div role="group" aria-label="Sort homes" className="flex flex-wrap items-center gap-1 rounded-xl border border-hairline bg-white p-1">
            {([["best", "Best"], ["cheap", "Cheapest"], ["new", "Newest"]] as [typeof sort, string][]).map(([k, label]) => <button key={k} onClick={() => setSort(k)} aria-pressed={sort === k} className={`px-3.5 py-2 rounded-lg text-[13px] font-medium transition-colors ${sort === k ? "bg-ink text-white" : "text-ink-muted hover:bg-paper"}`}>{label}</button>)}
          </div>
          <div className="hidden sm:flex gap-2"><Link to="/map" className={chip(false)}><MapIcon size={14} /> Map view</Link><Link to="/swipe" className={chip(false)}><Layers size={14} /> Swipe</Link></div>
        </div>
      </section>

      <section className="max-w-[1240px] mx-auto px-4 md:px-6 pt-1 pb-6">
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5 items-start">
          {shown.slice(0, limit).map((f, i) => {
            if (f.id === "capture") return <CaptureCard key="capture" />;
            const c = norm(f.country_guess);
            const to = homePath(f);
            return (
              <article key={f.id} data-listing-href={to} data-home-code={f.shortcode} className="group relative rounded-2xl overflow-hidden bg-white border border-hairline shadow-sm hover:shadow-lg transition-shadow">
                <div className="relative aspect-[4/3] overflow-hidden bg-hairline/30">
                  <PhotoGallery images={f.image_urls!} title={f.location_name || c} compact href={to} rememberKey={f.shortcode} linkState={{ catalogUrl }} eager={i < 4} onOpen={() => track("card_click", { find: f.shortcode })} />
                  {((f as any).status === "sold" || (f as any).status === "reserved") ? <span className="absolute pointer-events-none top-3 left-3 rounded-full bg-red-600 text-white px-2.5 py-1 text-[11px] uppercase">{(f as any).status}</span> : drops.has(f.id) ? <span className="absolute pointer-events-none top-3 left-3 rounded-full bg-amber-100 text-amber-900 px-2.5 py-1 text-[11px]">Price drop</span> : isNew(f.posted_at) ? <span className="absolute pointer-events-none top-3 left-3 rounded-full bg-white/95 text-ink px-2.5 py-1 text-[11px]">New</span> : null}
                  {!f.id.startsWith("ebc") && f.id !== "como-1" && <button onClick={(e) => toggleFav(e, f)} aria-label="Save" aria-pressed={favs.has(f.id)} className={`absolute top-2 right-2 sm:top-3 sm:right-3 z-10 h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-white/95 shadow inline-flex items-center justify-center hover:scale-105 transition-transform ${favs.has(f.id) ? "text-red-500" : "text-ink"}`}><Heart size={17} fill={favs.has(f.id) ? "currentColor" : "none"} /></button>}
                </div>
                <Link to={to} state={{ catalogUrl }} onClick={() => track("card_click", { find: f.shortcode })} className="block hover:bg-paper/40"><ListingInfo home={f} /></Link>
                <div className="grid grid-cols-2 gap-1 border-t border-hairline p-1.5">
                  <button onClick={e => { quickTrigger.current = e.currentTarget; setQuickCode(f.shortcode); }} aria-label={`Quick view ${f.location_name || c}`} className="min-h-11 rounded-lg hover:bg-paper text-[11px] sm:text-[12px] flex items-center justify-center gap-1"><Eye size={14} /> Quick view</button>
                  <button aria-label={`Compare ${f.location_name || c}`} aria-pressed={selected.includes(f.shortcode)} disabled={selected.length === 3 && !selected.includes(f.shortcode)} onClick={() => toggleCompare(f)} className={`min-h-11 rounded-lg text-[11px] sm:text-[12px] flex items-center justify-center gap-1 disabled:opacity-35 ${selected.includes(f.shortcode) ? "bg-ink text-white" : "hover:bg-paper"}`}><GitCompareArrows size={14} />{selected.includes(f.shortcode) ? "Selected" : "Compare"}</button>
                </div>
              </article>
            );
          })}
        </div>
        {!loaded && <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5 items-start">{[...Array(8)].map((_, i) => <div key={i} className="h-[370px] rounded-2xl bg-hairline/50 animate-pulse" />)}</div>}
        {loaded && homes.length === 0 && <div className="py-12 text-center max-w-lg mx-auto"><h2 className="font-display text-2xl">No homes match these filters yet.</h2><p className="mt-2 text-sm text-ink-muted">Try one of these changes. Your other filters will stay in place.</p><div className="flex flex-col gap-2 mt-5">{alternatives.map(a => <button key={a.label} onClick={() => applyFilters(a.filters)} className="rounded-xl bg-white border border-hairline p-4 flex justify-between items-center gap-3 text-left text-sm"><span>{a.label}</span><b className="whitespace-nowrap">{a.count} {a.count === 1 ? "home" : "homes"} →</b></button>)}</div><button onClick={() => applyFilters(EMPTY_FILTERS)} className="mt-5 underline text-sm">Clear all filters</button></div>}
        <div ref={sentinel} className="h-2" />
      </section>

      <section className="max-w-[1240px] mx-auto px-4 md:px-6 pb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-hairline rounded-2xl bg-white p-6 md:p-8 flex flex-col gap-3">
          <p className="font-display text-[22px] tracking-tight inline-flex items-center gap-2"><Bell size={18} /> Tell me when a home like this appears</p>
          {alertSent ? <p className="inline-flex items-center gap-2 text-[15px]"><Check size={18} /> Alert on. We only email when there is a match.</p> : (
            <form onSubmit={saveAlert} className="flex flex-col gap-2">
              <div className="flex gap-2">
                <select value={alert.country} onChange={(e) => setAlert({ ...alert, country: e.target.value })} className="min-w-0 flex-1 border border-hairline rounded-full px-4 py-3 text-[14px] bg-paper">{["Any", ...allCountries].map((c) => <option key={c}>{c}</option>)}</select>
                <select value={alert.max} onChange={(e) => setAlert({ ...alert, max: Number(e.target.value) })} className="min-w-0 flex-1 border border-hairline rounded-full px-4 py-3 text-[14px] bg-paper">{PRICE_CHIPS.map(([l, v]) => <option key={v} value={v}>{l}</option>)}</select>
              </div>
              <div className="flex gap-2"><input required type="email" value={alert.email} onChange={(e) => setAlert({ ...alert, email: e.target.value })} placeholder="you@email.com" className="min-w-0 flex-1 border border-hairline rounded-full px-4 py-3 text-[15px] bg-paper outline-none focus:border-ink" /><button className="rh-btn-primary !px-5">Alert me</button></div>
            </form>
          )}
        </div>
        <CaptureInline source="home_bottom" title="Get the best deals we find, in your inbox" subtitle="Free. Only homes under €60k worth talking about — with the address and the original link." />
      </section>

      <section className="max-w-[1240px] mx-auto px-4 md:px-6 pb-10 text-[13px] text-ink-muted flex flex-wrap gap-x-4 gap-y-1">
        <span>Browse by country:</span>{allCountries.map((c) => <Link key={c} to={`/country/${slug(c)}`} className="underline hover:text-ink">{c}</Link>)}
      </section>

      <footer className="border-t border-hairline"><div className="max-w-[1240px] mx-auto px-4 md:px-6 py-8 flex flex-wrap gap-x-8 gap-y-3 text-[13px] text-ink-muted"><Link to="/sell" className="hover:text-ink">Sell your home here</Link><Link to="/map" className="hover:text-ink">Map</Link><Link to="/network" className="hover:text-ink">For developers</Link><Link to="/fit" className="hover:text-ink">Can I afford it?</Link><Link to="/score" className="hover:text-ink">Score a listing</Link><Link to="/method" className="hover:text-ink">Method</Link><Link to="/legal/terms" className="hover:text-ink">Terms</Link><Link to="/legal/privacy" className="hover:text-ink">Privacy</Link><Link to="/legal/cookies" className="hover:text-ink">Cookies</Link><Link to="/legal/takedown" className="hover:text-ink">Content removal</Link><span className="ml-auto">© Equinox Investment Group LLC. Listings belong to their original posters. We link, we do not sell.</span></div></footer>
      {user && <Suspense fallback={null}><Onboarding /></Suspense>}
      <QuickView home={quickHome} position={quickIndex} total={homes.length} saved={!!quickHome && favs.has(quickHome.id)} compared={!!quickHome && selected.includes(quickHome.shortcode)} compareFull={selected.length >= 3} catalogUrl={catalogUrl} onClose={closeQuick} onMove={delta => setQuickCode(homes[quickIndex + delta]?.shortcode || quickCode)} onSave={toggleFav} onCompare={toggleCompare} />
      {selected.length > 0 && <div role="region" aria-label="Selected homes to compare" className="fixed z-40 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] md:bottom-5 left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] max-w-2xl bg-white border border-hairline rounded-2xl shadow-xl p-3">
        <div className="flex items-center justify-between gap-2"><p className="text-sm font-medium">Compare {selected.length}/3 homes</p><div className="flex items-center gap-3"><button onClick={() => setSelected([])} className="text-xs underline">Clear</button>{selected.length >= 2 ? <Link to={`/compare-homes?ids=${selected.map(encodeURIComponent).join(",")}`} state={{ catalogUrl }} className="rh-btn-primary !px-4 !py-2 !text-sm">Compare homes</Link> : <span className="text-xs text-ink-muted">Choose one more</span>}</div></div>
        <div className="mt-2 flex gap-2">{selected.map(code => { const home = [...finds, EBC, COMO, GATED].find(f => f.shortcode === code); return <button key={code} onClick={() => setSelected(codes => codes.filter(c => c !== code))} aria-label={`Remove ${home?.location_name || code} from comparison`} className="min-w-0 flex-1 flex gap-1.5 items-center bg-paper rounded-lg p-2 text-[11px]">{home?.image_urls?.[0] && <img src={home.image_urls[0]} alt="" className="w-8 h-8 rounded object-cover" />}<span className="truncate flex-1 text-left">{home?.location_name || code}</span><X size={14} className="shrink-0" /></button>; })}</div>
      </div>}
      <AuthModal redirect={authRedirect} open={auth} onClose={() => setAuth(false)} title="Save this home" subtitle="Free. Sign in and we email you everything about the homes you save." />
    </div>
  );
};
export default Home;
