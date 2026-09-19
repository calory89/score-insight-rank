// Public social proof in the nav: how many people are on the site right now, and how many have
// come through today. The numbers are real — they come from our own rh_events tracking through the
// rh_live_stats() RPC, which is security definer so a visitor gets the two aggregates without being
// able to read raw events. Our own browsing (the rh_internal flag) is excluded server-side.
//
// Lovable's analytics cannot be used here: those live behind the Lovable API, not in the browser.
// rh_events counts the same visits anyway, since track() fires on every page view.
//
// If the call fails, or nobody is around, the component renders nothing at all. An empty nav slot
// is better than advertising "0 online".
import { useEffect, useRef, useState } from "react";
import { db } from "@/lib/rh";

const CSS = `
@keyframes rhLiveRing{0%{transform:scale(1);opacity:.7}70%{transform:scale(2.6);opacity:0}100%{transform:scale(2.6);opacity:0}}
.rh-live-dot{position:relative;display:inline-block;height:7px;width:7px;border-radius:9999px;background:#10b981;flex:none}
.rh-live-dot:before{content:"";position:absolute;inset:0;border-radius:9999px;background:#10b981;animation:rhLiveRing 2.2s cubic-bezier(.2,.8,.2,1) infinite}
@media (prefers-reduced-motion:reduce){.rh-live-dot:before{animation:none}}
`;

const POLL_MS = 90000;
const TTL_MS = 60000;
const CACHE_KEY = "rh_live_cache";
const nf = (n: number) => n.toLocaleString("en-GB");

type Stats = { live: number; today: number };

// The nav renders two LiveStats (desktop and the compact mobile one), so a naive implementation
// fired the RPC twice per page view. Everything below is shared at module level: one in-flight
// request at a time, and the result cached in localStorage for a minute so extra tabs and quick
// navigations reuse it instead of hitting the database again.
let inflight: Promise<Stats | null> | null = null;
const subs = new Set<(s: Stats) => void>();

const readCache = (): Stats | null => {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    if (c && typeof c.live === "number" && Date.now() - c.t < TTL_MS) return { live: c.live, today: c.today };
  } catch {}
  return null;
};

// PAUSED 19-sep-2026. rh_live_stats() recomputed by scanning rh_events (114,000 rows) whenever its
// cache was more than 30 seconds old, and every visitor asked for it every 90 seconds. Under real
// traffic that is a permanent aggregate scan of the largest table in the project, and it exhausted
// the connection pool: the site served its shell and no home ever loaded. The counter is the least
// important thing on the page, so it is off until the RPC only ever reads its cache.
const LIVE_STATS_ON = false;

const fetchStats = (): Promise<Stats | null> => {
  if (!LIVE_STATS_ON) return Promise.resolve(null);
  const cached = readCache();
  if (cached) return Promise.resolve(cached);
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const { data, error } = await db.rpc("rh_live_stats");
      if (error) return null;
      const r = Array.isArray(data) ? data[0] : data;
      if (!r || typeof r.live !== "number" || typeof r.today !== "number") return null;
      const s: Stats = { live: r.live, today: r.today };
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ...s, t: Date.now() })); } catch {}
      subs.forEach((fn) => fn(s));
      return s;
    } catch { return null; } finally { inflight = null; }
  })();
  return inflight;
};

export const useLiveStats = () => {
  const [s, setS] = useState<Stats | null>(readCache);
  const timer = useRef<any>(null);

  useEffect(() => {
    let dead = false;
    const apply = (v: Stats) => { if (!dead) setS(v); };
    subs.add(apply);
    const load = () => {
      if (document.visibilityState !== "visible") return;
      fetchStats().then((v) => { if (v) apply(v); });
    };
    load();
    if (LIVE_STATS_ON) timer.current = setInterval(load, POLL_MS);
    const onVis = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { dead = true; subs.delete(apply); clearInterval(timer.current); document.removeEventListener("visibilitychange", onVis); };
  }, []);

  return s;
};

const LiveStats = ({ compact }: { compact?: boolean }) => {
  const s = useLiveStats();
  if (!s || s.today < 1) return null;

  if (compact) {
    return (
      <>
        <style>{CSS}</style>
        <span title={`${nf(s.live)} online now · ${nf(s.today)} today`}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-hairline bg-white text-[12px] font-medium tabular-nums text-ink">
          <span className="rh-live-dot" />{nf(s.live)}
        </span>
      </>
    );
  }

  return (
    <>
      <style>{CSS}</style>
      <div aria-live="polite"
        className="inline-flex items-center gap-2.5 pl-3 pr-3.5 py-1.5 rounded-full border border-hairline bg-white shadow-[0_1px_3px_rgba(20,18,10,.06)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="rh-live-dot" />
          <span className="text-[13px] font-semibold tabular-nums text-ink">{nf(s.live)}</span>
          <span className="text-[12.5px] text-ink-muted">online</span>
        </span>
        <span className="h-3.5 w-px bg-hairline" />
        <span className="inline-flex items-center gap-1.5">
          <span className="text-[13px] font-semibold tabular-nums text-ink">{nf(s.today)}</span>
          <span className="text-[12.5px] text-ink-muted">today</span>
        </span>
      </div>
    </>
  );
};

export default LiveStats;
