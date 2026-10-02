import {PropertyImage, ComparePick} from "./BuyerTools";
import {storage, usePreference} from "./buyer-state";
import {t} from "./i18n";
// RealHunt v4 UX (23-sep-2026): visual cards with the price on the photo, double tap to vote,
// one-tap story sharing, a mobile tab bar, a sticky action bar on the home page and instant
// navigation (cached rows, prefetched detail, preloaded photos).
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Heart, Share2, Bookmark, Home as HomeIcon, Layers, MapPin, User, Bell, Trophy, ArrowUpRight, TrendingDown, BadgeCheck, Flame } from "lucide-react";
import { FLAG, bumpIx, track } from "@/lib/rh";
import { money, votePreview, type Deal, type Session } from "./api";
import { useCommunity } from "./ctx";
import { bumpStreak, niceTitle, dealUrl, shareText, type Row } from "./extras";
import { celebrate, cardColor, CardMeta } from "./v6";

const num = (v: number = 0) => new Intl.NumberFormat("en").format(v);
// Local activity counters for the profile badges (votes, saves, shares, homes opened).
export function stats(): Record<string, number> { try { return JSON.parse(localStorage.getItem("rh_stats") || "{}") || {}; } catch { return {}; } }
export function bumpStat(k: string) { try { const s = stats(); s[k] = (s[k] || 0) + 1; localStorage.setItem("rh_stats", JSON.stringify(s)); } catch { /* ignore */ } }

// ---------------------------------------------------------------- instant navigation
// Every row the feed has shown is kept here, so opening a home paints at once from memory while
// the full record (comments, availability) loads behind it.
export const rowCache = new Map<string, Row>();
export const remember = (rows: Row[] | undefined) => (rows || []).forEach((r) => rowCache.set(r.slug, r));
const detailCache = new Map<string, Promise<any>>();
export function prefetchDetail(slug: string, call: ((a: string, p?: Record<string, unknown>) => Promise<any>) | undefined) {
  if (!call || detailCache.has(slug)) return;
  const p = call("detail", { slug }).catch(() => { detailCache.delete(slug); return null; });
  detailCache.set(slug, p);
}
export function takeDetail(slug: string) {
  const p = detailCache.get(slug);
  detailCache.delete(slug);
  return p;
}
const preloaded = new Set<string>();
export function preloadImages(urls: (string | undefined)[]) {
  if ((navigator as any).connection?.saveData || /2g/.test((navigator as any).connection?.effectiveType || "")) return;
  for (const u of urls.slice(0,2)) {
    if (!u || preloaded.has(u)) continue;
    preloaded.add(u);
    const img = new Image();
    img.decoding = "async";
    img.src = u;
  }
}

// ---------------------------------------------------------------- voting
export function useVote(deal: Deal, scope = "all", onChange?: () => void) {
  const { session, setSession, call, setNotice } = useCommunity();
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Deal | null>(null);
  const selected = session?.votes?.[deal.id];
  const d = preview || deal;
  useEffect(() => setPreview(null), [deal.week_up, deal.week_down]);
  async function vote(value = 1) {
    if (busy || !session) return;
    if (selected === value) return;
    setBusy(true);
    setPreview(votePreview(deal, selected, value));
    try {
      await call("vote", { id: deal.id, value });
      setSession((s: Session) => ({ ...s, votes: { ...s.votes, [deal.id]: value } }));
      const days = bumpStreak();
      const others = Math.max(0, (scope === "all" ? deal.life_up : deal.week_up) || 0);
      const crowd = others > 0 ? `You and ${num(others)} ${others === 1 ? "other" : "others"} love this` : "You are the first to love this";
      const place = deal.rank ? ` · #${deal.rank} ${scope === "all" ? "all time" : "this week"}` : "";
      setNotice(`❤ ${crowd}${place}.${days > 1 ? ` ${days}-day streak 🔥` : " Share it to push it up."}`);
      bumpStat("votes");track("community_vote",{find:deal.slug});
      celebrate(days, stats().votes || 0);
      bumpIx();
      window.dispatchEvent(new CustomEvent("rh-voted", { detail: { id: deal.id, country: deal.country } }));
      onChange?.();
    } catch (e) {
      setPreview(null);
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const total = scope === "all" ? d.life_net : d.week_net;
  return { vote, selected: selected === 1, total: total || 0, busy, ready: !!session };
}
export function HeartVote({ deal, scope = "all", onChange, big = false }: { deal: Deal; scope?: string; onChange?: () => void; big?: boolean }) {
  const v = useVote(deal, scope, onChange);
  const [pop, setPop] = useState(0);
  return (
    <button className={"hv-heart" + (v.selected ? " is-on" : "") + (big ? " is-big" : "")} disabled={!v.ready || v.busy}
      aria-pressed={v.selected} aria-label={v.selected ? "You voted for this home" : "Vote for this home"}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (!v.selected) { setPop((n) => n + 1); v.vote(1); } }}>
      <Heart key={pop} size={big ? 22 : 19} fill={v.selected ? "currentColor" : "none"} className={pop ? "hv-beat" : ""} />
      <strong>{num(v.total)}</strong>
    </button>
  );
}

// ---------------------------------------------------------------- story card (9:16) and sharing
function loadImg(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    if (/^https?:/i.test(src) && !src.startsWith(location.origin)) i.crossOrigin = "anonymous";
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
}
function wrap(ctx: CanvasRenderingContext2D, text: string, max: number, lines: number) {
  const words = text.split(/\s+/);
  const out: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? cur + " " + w : w;
    if (ctx.measureText(next).width > max && cur) { out.push(cur); cur = w; } else cur = next;
    if (out.length === lines) break;
  }
  if (out.length < lines && cur) out.push(cur);
  if (out.length === lines && words.join(" ").length > out.join(" ").length) out[lines - 1] = out[lines - 1].replace(/\s*\S*$/, "") + "…";
  return out;
}
export async function storyCard(d: Row, scope = "all"): Promise<Blob | null> {
  try {
    await (document as any).fonts?.ready;
    const W = 1080, H = 1920;
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const x = c.getContext("2d")!;
    x.fillStyle = "#0f0f0f"; x.fillRect(0, 0, W, H);
    const src = d.image_urls?.[0];
    if (src) {
      const img = await loadImg(src);
      const s = Math.max(W / img.width, (H * 0.78) / img.height);
      const w = img.width * s, h = img.height * s;
      x.drawImage(img, (W - w) / 2, (H * 0.78 - h) / 2, w, h);
    }
    const g = x.createLinearGradient(0, H * 0.38, 0, H);
    g.addColorStop(0, "rgba(15,15,15,0)"); g.addColorStop(0.45, "rgba(15,15,15,.82)"); g.addColorStop(1, "rgba(15,15,15,1)");
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    // brand
    x.fillStyle = "rgba(255,255,255,.95)";
    x.beginPath(); (x as any).roundRect ? (x as any).roundRect(64, 72, 250, 64, 32) : x.rect(64, 72, 250, 64); x.fill();
    x.fillStyle = "#111"; x.font = "700 34px system-ui, -apple-system, Segoe UI, sans-serif"; x.fillText("RealHunt", 92, 116);
    if (d.rank && d.rank <= 10) {
      x.fillStyle = "#D4420C";
      x.beginPath(); (x as any).roundRect ? (x as any).roundRect(W - 64 - 260, 72, 260, 64, 32) : x.rect(W - 324, 72, 260, 64); x.fill();
      x.fillStyle = "#fff"; x.font = "700 32px system-ui, -apple-system, Segoe UI, sans-serif";
      const label = `#${d.rank} ${scope === "all" ? "all time" : "this week"}`;
      x.fillText(label, W - 64 - 130 - x.measureText(label).width / 2, 116);
    }
    x.fillStyle="#fff";x.font="400 28px system-ui";x.fillText(d.verified_at?`Team check: ${new Date(d.verified_at).toLocaleDateString("en-GB")}`:"Availability not independently confirmed",64,H-70);
    let y = H - 560;
    x.fillStyle = "#fff";
    x.font = "800 150px system-ui, -apple-system, Segoe UI, sans-serif";
    x.fillText(money(d.price_eur), 64, y); y += 96;
    x.font = "600 56px system-ui, -apple-system, Segoe UI, sans-serif";
    for (const line of wrap(x, niceTitle(d), W - 128, 3)) { x.fillText(line, 64, y); y += 70; }
    x.fillStyle = "rgba(255,255,255,.72)";
    x.font = "500 40px system-ui, -apple-system, Segoe UI, sans-serif";
    x.fillText(`${FLAG[d.country] || "📍"} ${[d.location_name, d.country].filter(Boolean).filter((v, i, a) => i === 0 || !String(a[0]).includes(String(v))).join(", ")}`.slice(0, 60), 64, y + 20);
    x.fillStyle = "#fff"; x.font = "700 44px system-ui, -apple-system, Segoe UI, sans-serif";
    x.fillText("Vote it up at realhunt.co", 64, H - 110);
    return await new Promise((res) => c.toBlob((b) => res(b), "image/jpeg", 0.9));
  } catch {
    return null; // a photo from another site can block the canvas; plain link sharing still works
  }
}
export async function shareStory(d: Row, scope = "all"): Promise<"shared" | "copied" | "downloaded"> {
  bumpIx();
  bumpStat("shares");
  const url = dealUrl(d.slug);
  const text = shareText(d, scope);
  const blob = await storyCard(d, scope);
  const nav: any = navigator;
  if (blob) {
    const file = new File([blob], `realhunt-${d.slug}.jpg`, { type: "image/jpeg" });
    if (nav.canShare?.({ files: [file] })) {
      await nav.share({ files: [file], title: niceTitle(d), text: `${text}\n${url}` });
      return "shared";
    }
  }
  if (nav.share) { await nav.share({ title: niceTitle(d), text, url }); return "shared"; }
  if (blob) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `realhunt-${d.slug}.jpg`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  try { await navigator.clipboard.writeText(`${text}\n${url}`); } catch { /* ignore */ }
  return blob ? "downloaded" : "copied";
}
export function ShareButton({ deal, scope = "all", label = false }: { deal: Row; scope?: string; label?: boolean }) {
  const { setNotice } = useCommunity();
  const [busy, setBusy] = useState(false);
  return (
    <button className={"hv-share" + (label ? " has-label" : "")} aria-label="Share this home as a story" disabled={busy}
      onClick={async (e) => {
        e.preventDefault(); e.stopPropagation(); setBusy(true);
        try {
          const r = await shareStory(deal, scope);
          if (r === "downloaded") setNotice("Story image saved and link copied. Post it anywhere.");
          else if (r === "copied") setNotice("Link copied. Paste it anywhere.");
        } catch (err: any) {
          if (err?.name !== "AbortError") setNotice("Sharing did not work here. Copy the page address instead.");
        } finally { setBusy(false); }
      }}>
      <Share2 size={18} />{label && <span>Share</span>}
    </button>
  );
}

// ---------------------------------------------------------------- saving
export function SaveHeart({ deal, className = "hv-save" }: { deal: Deal; className?: string }) {
  const { session, setSession, call, requireUser, setNotice } = useCommunity();
  const [busy, setBusy] = useState(false);
  const saved = !!session?.saved.includes(deal.id);
  return (
    <button className={className + (saved ? " is-on" : "")} disabled={busy} aria-pressed={saved} aria-label={saved ? "Remove from saved" : "Save this home"}
      onClick={async (e) => {
        e.preventDefault(); e.stopPropagation();
        if (!requireUser()) return;
        setBusy(true);
        try {
          await call("save", { id: deal.id, saved: !saved });
          setSession((s: Session) => ({ ...s, saved: saved ? s.saved.filter((x) => x !== deal.id) : [...s.saved, deal.id] }));
          setNotice(saved ? "Removed from saved." : "Saved ✓ Add it to a board from its page.");
          if (!saved) {bumpStat("saves");track("community_save",{find:deal.slug});}
          bumpIx();
        } catch (err) { setNotice((err as Error).message); } finally { setBusy(false); }
      }}>
      <Bookmark size={18} fill={saved ? "currentColor" : "none"} />
    </button>
  );
}

// ---------------------------------------------------------------- the card
function Photos({ deal, href, onDouble }: { deal: Row; href: string; onDouble: () => void }) {
  const imgs = (deal.image_urls || []).filter(Boolean);
  // Instagram covers carry the poster's own price and captions printed on the photo; the second
  // photo is the house itself, so the feed opens on that one.
  const [i, setI] = useState(()=>storage.get<number>("rh.photo."+deal.slug,0));
  const [paused] = usePreference("rh.motion.paused",false);
  useEffect(()=>storage.set("rh.photo."+deal.slug,i),[i,deal.slug]);
  const [burst, setBurst] = useState(0);
  const navigate = useNavigate();
  const tap = useRef<{ t: number; timer?: any; x?: number }>({ t: 0 });
  const go = (n: number) => setI((n + imgs.length) % imgs.length);
  useEffect(() => { if (imgs[i + 1]) preloadImages([imgs[i + 1]]); }, [i]);
  // Like a Reel: while a card sits in the middle of the screen, its photos play on their own.
  // Any touch or click by the visitor stops it for that card.
  const box = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  const [held, setHeld] = useState(false);
  useEffect(() => {
    const el = box.current;
    if (!el || imgs.length < 2 || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(([e]) => setSeen(e.intersectionRatio >= 0.75), { threshold: [0, 0.75, 1] });
    io.observe(el);
    return () => io.disconnect();
  }, [imgs.length]);
  useEffect(() => {
    if (!seen || held || paused || document.hidden || imgs.length < 2) return;
    const t = setTimeout(() => go(i + 1), i === 0 ? 1400 : 2400);
    return () => clearTimeout(t);
  }, [seen, held, paused, i, imgs.length]);
  return (
    <div className={"hv-photos" + (seen && !held && imgs.length > 1 ? " is-playing" : "")} ref={box}
      onMouseDown={() => setHeld(true)}
      onTouchStart={(e) => { setHeld(true); tap.current.x = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - (tap.current.x ?? e.changedTouches[0].clientX);
        if (Math.abs(dx) > 40 && imgs.length > 1) { tap.current.t = 0; go(i + (dx < 0 ? 1 : -1)); e.preventDefault(); }
      }}
      onClick={(e) => {
        e.preventDefault();
        const now = Date.now();
        if (now - tap.current.t < 280) {
          clearTimeout(tap.current.timer); tap.current.t = 0;
          setBurst((b) => b + 1); onDouble();
          return;
        }
        tap.current.t = now;
        tap.current.timer = setTimeout(() => { tap.current.t = 0; navigate(href); }, 280);
      }}>
      <a href={href} onClick={(e) => e.preventDefault()} aria-label={niceTitle(deal)} tabIndex={-1}>
        <PropertyImage key={i} fallback={imgs.find((_,n)=>n!==i)} className="hv-fade is-in" onLoad={(e) => e.currentTarget.classList.add("is-in")} src={imgs[i]} alt={niceTitle(deal)} loading="lazy" decoding="async"
          onError={(e) => { if (!e.currentTarget.src.endsWith("/favicon.png")) e.currentTarget.src = "/favicon.png"; }} />
      </a>
      {burst > 0 && <span key={burst} className="hv-burst" aria-hidden="true"><Heart size={96} fill="currentColor" /></span>}
      {imgs.length > 1 && <>
        <button className="hv-arrow is-prev" aria-label="Previous photo" onClick={(e) => { e.stopPropagation(); e.preventDefault(); go(i - 1); }}>‹</button>
        <button className="hv-arrow is-next" aria-label="Next photo" onClick={(e) => { e.stopPropagation(); e.preventDefault(); go(i + 1); }}>›</button>
        <span className="hv-dots" aria-hidden="true">{imgs.slice(0, 8).map((_, n) => <i key={n} className={n === i ? "on" : ""} />)}</span>
      </>}
    </div>
  );
}
function Chip({ deal, scope }: { deal: Row; scope: string }) {
  if ((deal.price_drop || 0) > 0) return <span className="hv-chip is-drop"><TrendingDown size={12} /> −{money(deal.price_drop!)}</span>;
  if (deal.verified_at) return <span className="hv-chip is-ok" title={`Price and availability checked ${new Date(deal.verified_at).toLocaleDateString()}`}><BadgeCheck size={12} /> Checked</span>;
  if (deal.votes_24h >= 3 && (scope === "all" ? deal.life_net : deal.week_net) > 0) return <span className="hv-chip is-hot"><Flame size={12} /> Trending</span>;
  return null;
}
function useRankMove(rank?: number) {
  const prev = useRef(rank);
  const [move, setMove] = useState(0);
  useEffect(() => {
    if (prev.current && rank && rank < prev.current) {
      setMove(prev.current - rank);
      const t = setTimeout(() => setMove(0), 4000);
      prev.current = rank;
      return () => clearTimeout(t);
    }
    prev.current = rank;
  }, [rank]);
  return move;
}
export function Card4({ deal, scope = "all", onChange, onQuick }: { deal: Row; scope?: string; onChange?: () => void; onQuick?:()=>void }) {
  const { call } = useCommunity();
  const v = useVote(deal, scope, onChange);
  const move = useRankMove(deal.rank);
  const href = `/deal/${encodeURIComponent(deal.slug)}${scope === "all" ? "?tab=all" : ""}`;
  const where = deal.location_name && deal.country && !deal.location_name.includes(deal.country) ? `${deal.location_name}, ${deal.country}` : deal.location_name || deal.country;
  const warm = () => { prefetchDetail(deal.slug, call); preloadImages((deal.image_urls || []).slice(0, 1)); };
  return (
    <article className="hv-card" onMouseEnter={warm} onTouchStart={warm}>
      <div className="hv-frame" style={{ backgroundColor: cardColor(deal.slug) }}>
        <Photos deal={deal} href={href} onDouble={() => { if (!v.selected) v.vote(1); }} />
        <div className="hv-top">
          {deal.rank && deal.rank <= 3 ? <span className={"hv-rank" + (deal.rank <= 3 ? " is-podium" : "") + (move ? " is-up" : "")}>#{deal.rank}{move ? <em> ▲{move}</em> : null}</span> : null}
          <Chip deal={deal} scope={scope} />
          {(deal as any).developer ? <span className="hv-newbuild">New build</span> : null}
          <SaveHeart deal={deal} />
        </div>

      </div>
      <Link to={href} className="hv-info" aria-label={niceTitle(deal)}>
        <strong className="rh-card-price">{money(deal.price_eur)}</strong><span className="rh-card-title">{niceTitle(deal)}</span><CardMeta deal={deal} />
      </Link>
      <div className="hv-actions">
        <button className={"hv-heart" + (v.selected ? " is-on" : "")} disabled={!v.ready || v.busy} aria-pressed={v.selected}
          title={(deal.launch_points||0)>0?`${scope==="all"?deal.launch_points:deal.launch_week_points||0} initial points + ${scope==="all"?deal.life_up:deal.week_up} real votes`:undefined} aria-label={v.selected ? "You voted for this home" : "Vote for this home"} onClick={() => v.vote(1)}>
          <Heart size={19} fill={v.selected ? "currentColor" : "none"} /><strong key={v.total} className="hv-count">{num(v.total)}</strong>
        </button>
        <ComparePick deal={deal}/>{onQuick && <button className="rh-card-tool rh-quick-btn" onClick={onQuick}>{t("Quick view")}</button>}
        <ShareButton deal={deal} scope={scope} />
      </div>
    </article>
  );
}
export function CardSkeleton() {
  return <div className="hv-card hv-skel" aria-hidden="true"><div className="hv-frame" /><div className="hv-actions"><i /><i /></div></div>;
}

// ---------------------------------------------------------------- freshness line (replaces small counters)
export function ago(iso?: string | null) {
  if (!iso) return "";
  const m = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const dd = Math.round(h / 24);
  return `${dd} day${dd > 1 ? "s" : ""} ago`;
}
export function Freshness({ feed, visitors }: { feed: any; visitors?: number }) {
  if (!feed) return <div className="hv-fresh is-loading" aria-hidden="true" />;
  const parts: ReactNode[] = [];
  if (feed.new_today > 0) parts.push(<span key="n" className="hv-live"><i />{num(feed.new_today)} new today</span>);
  if (feed.last_added) parts.push(<span key="u">Updated {ago(feed.last_added)}</span>);
  if (feed.global_deals >= 100) parts.push(<span key="t">{num(feed.global_deals)} homes under €100k</span>);
  if (visitors && visitors >= 100) parts.push(<span key="v">{num(visitors)} people browsing today</span>);
  if (!parts.length) return null;
  return <div className="hv-fresh">{parts}</div>;
}

// ---------------------------------------------------------------- mobile tab bar
export function TabBar() {
  const { pathname } = useLocation();
  if (pathname.startsWith("/deal/")) return null; // the home page has its own action bar
  const is = (p: string) => (p === "/" ? pathname === "/" : pathname.startsWith(p));
  return (
    <nav className="hv-tabbar" aria-label="App navigation">
      <Link to="/" aria-current={is("/") ? "page" : undefined} onClick={() => { if (pathname === "/") window.scrollTo({ top: 0, behavior: "smooth" }); }}><HomeIcon size={21} /><span>Explore</span></Link>
      <Link to="/top" aria-current={is("/top") ? "page" : undefined}><Trophy size={21} /><span>Top 100</span></Link>
      <Link to="/map" aria-current={is("/map") ? "page" : undefined}><MapPin size={21} /><span>Map</span></Link>
      <Link to="/hunt/saved" aria-current={is("/hunt/saved") ? "page" : undefined}><Bookmark size={21} /><span>Saved</span></Link>
      <Link to="/me" aria-current={is("/me") || is("/hunt/mine") ? "page" : undefined}><User size={21} /><span>Profile</span></Link>
    </nav>
  );
}

// ---------------------------------------------------------------- mobile action bar on a home page
export function DetailBar({ deal, scope = "all", onChange, listing }: { deal: Row; scope?: string; onChange?: () => void; listing: ReactNode }) {
  return (
    <div className="hv-detailbar" role="region" aria-label="Actions for this home">
      <div className="hv-detailbar-price"><strong>{money(deal.price_eur)}</strong><span>{deal.location_name || deal.country}</span></div>
      <HeartVote deal={deal} scope={scope} onChange={onChange} />
      <ShareButton deal={deal} scope={scope} />
      {listing}
    </div>
  );
}
export { ArrowUpRight };
