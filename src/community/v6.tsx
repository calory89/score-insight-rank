import {feed} from "./extras";
import {PropertyImage} from "./BuyerTools";
import {storage, safeFacts, userRent} from "./buyer-state";
import {t} from "./i18n";
// RealHunt v6 (23-sep-2026): the visual pass. Weekly podium hero, vibe chips with photos, rent
// comparison, Airbnb-style gallery with zoom, mini map with what is nearby, amenity icons, video
// tour, confetti and haptics, search suggestions with photos, friendly empty states.
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, Search, X, Plane, Waves, ShoppingBasket, TrainFront, Trees, Play, Download, BedDouble, Ruler, Sun, Flower2, Flame, Car, Sofa, KeyRound, Mountain, Droplets, Bath, Grid2x2, Share2, MapPin, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { FLAG, bumpIx } from "@/lib/rh";
import { money, type Deal } from "./api";
import { feedAll, niceTitle, Lightbox, type Row } from "./extras";
import { useVote, SaveHeart, ShareButton, remember, rowCache, preloadImages } from "./v4";
import COLORS from "@/data/card-colors.json";

const MiniMap = lazy(() => import("./minimap"));
const num = (v: number = 0) => new Intl.NumberFormat("en").format(v);
export const cardColor = (slug: string) => (COLORS as Record<string, string>)[slug] || "#E9E4D8";

// ---------------------------------------------------------------- 12: confetti and haptics
export function buzz(ms = 12) { try { navigator.vibrate?.(ms); } catch { /* ignore */ } }
export function confetti(n = 70) {
  if (typeof document === "undefined" || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  const box = document.createElement("div");
  box.className = "hv-confetti";
  const colors = ["#FF5C7A", "#0EA5E9", "#FACC15", "#16A34A", "#F97316", "#A855F7"];
  for (let i = 0; i < n; i++) {
    const s = document.createElement("i");
    s.style.left = Math.random() * 100 + "vw";
    s.style.background = colors[i % colors.length];
    s.style.animationDelay = Math.random() * 0.35 + "s";
    s.style.animationDuration = 1.6 + Math.random() * 1.2 + "s";
    s.style.transform = `rotate(${Math.random() * 360}deg)`;
    box.appendChild(s);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 3400);
}
// Called after every vote: confetti on the first vote and on streak milestones.
export function celebrate(days: number, votes: number) {
  buzz(18);
  if (votes === 1 || [3, 7, 14, 30].includes(days)) confetti(days >= 7 ? 110 : 70);
}

// ---------------------------------------------------------------- 5: rent comparison
const RENT: [RegExp, string, number][] = [
  [/Madrid/, "Madrid", 1150], [/Barcelona/, "Barcelona", 1250], [/Atlantic\/Canary/, "Las Palmas", 850], [/Lisbon/, "Lisbon", 1300],
  [/London/, "London", 2300], [/Dublin/, "Dublin", 2100], [/Paris/, "Paris", 1400], [/Brussels/, "Brussels", 1100], [/Amsterdam/, "Amsterdam", 1900],
  [/Berlin/, "Berlin", 1250], [/Zurich/, "Zurich", 2400], [/Vienna/, "Vienna", 1050], [/Rome/, "Rome", 1100], [/Copenhagen/, "Copenhagen", 1500],
  [/Stockholm/, "Stockholm", 1300], [/Oslo/, "Oslo", 1450], [/Helsinki/, "Helsinki", 1100], [/Warsaw/, "Warsaw", 850], [/Prague/, "Prague", 900],
  [/New_York|Detroit|Indiana|Kentucky/, "New York", 3600], [/Chicago/, "Chicago", 1900], [/Los_Angeles/, "Los Angeles", 2700], [/Denver|Phoenix/, "Denver", 1750],
  [/Toronto/, "Toronto", 1900], [/Vancouver/, "Vancouver", 2100], [/Mexico_City|Monterrey/, "Mexico City", 850], [/Sydney|Melbourne/, "Sydney", 2100],
  [/Tokyo/, "Tokyo", 1100], [/Dubai/, "Dubai", 2000], [/Singapore/, "Singapore", 2600],
];
export function rentCity(): { city: string; rent: number } | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    const hit = RENT.find(([re]) => re.test(tz));
    return hit ? { city: hit[1], rent: hit[2] } : null;
  } catch { return null; }
}
export function RentLine({ price, big = false }: { price: number | null | undefined; big?: boolean }) {
 const [rent,setRent]=useState(userRent); useEffect(()=>{const h=()=>setRent(userRent());window.addEventListener('rh-rent',h);return()=>window.removeEventListener('rh-rent',h);},[]);
 if(!price || !rent)return null;
 return <span className={"hv-rent"+(big?" is-big":"")} title={t('Asking price only; purchase and running costs are additional.')}>≈ {Math.round(price/rent)} {t('months of your rent')}</span>;
}

// ---------------------------------------------------------------- 3: vibe chips with photos
const VIBES: { k: string; label: string; q?: string; country?: string; type?: string; price?: number }[] = [
  { k: "sea", label: "By the sea", type: "beach" },
  { k: "lake", label: "Lake life", q: "lake" },
  { k: "stone", label: "Stone village", q: "stone" },
  { k: "nordic", label: "Nordic cabin", country: "Sweden" },
  { k: "japan", label: "Japanese house", country: "Japan" },
  { k: "sauna", label: "With a sauna", q: "sauna" },
  { k: "terrace", label: "Big terrace", q: "terrace" },
  { k: "cheap", label: "Under €30k", price: 30000 },
];
export function Vibes({ active, onPick, rows=[] }: { rows?: Row[]; active: string; onPick: (v: { q?: string; country?: string; type?: string; price?: number; k: string } | null) => void }) {
  const all=rows.length ? rows : Array.from(rowCache.values());
  const used = new Set<string>();
  const pick = (v: (typeof VIBES)[number]) => {
    const hit = all.find((r) => {
      if (used.has(r.id)) return false;
      const txt = `${r.title} ${r.location_name} ${r.why_great || ""}`.toLowerCase();
      return (!v.q || txt.includes(v.q)) && (!v.country || r.country === v.country) && (!v.type || r.category === v.type) && (!v.price || (r.price_eur || 0) <= v.price);
    });
    if (hit) used.add(hit.id);
    return hit?.image_urls?.[0];
  };
  return (
    <nav className="hv-vibes" aria-label="Browse by vibe">
      {VIBES.map((v) => {
        const img = pick(v);
        const on = active === v.k;
        return (
          <button key={v.k} aria-pressed={on} onClick={() => onPick(on ? null : v)} className={on ? "is-on" : ""}>
            <span className="hv-vibe-img" style={{ backgroundColor: "#E9E4D8" }}>{img && <img src={img} alt="" loading="lazy" />}</span>
            <span>{v.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

// ---------------------------------------------------------------- 2 + 9: weekly podium hero
function useCountdown(to?: string) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  if (!to) return "";
  const ms = Math.max(0, new Date(to).getTime() - now);
  const d = Math.floor(ms / 864e5), h = Math.floor((ms % 864e5) / 36e5), m = Math.floor((ms % 36e5) / 6e4), s = Math.floor((ms % 6e4) / 1e3);
  return `${d}d ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}
function HeroVote({ deal, scope }: { deal: Row; scope: string }) {
  const v = useVote(deal, scope);
  return (
    <button className={"hv-heart is-big" + (v.selected ? " is-on" : "")} disabled={!v.ready || v.busy} aria-pressed={v.selected}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); v.vote(1); }}>
      <Heart size={20} fill={v.selected ? "currentColor" : "none"} /><strong>{num(v.total)}</strong>
    </button>
  );
}
export function PodiumHero({ rows, scope, endsAt }: { rows: Row[]; scope: string; endsAt?: string }) {
  const left = useCountdown(endsAt);
  const [a, b, c] = rows;
  if (!a || !b || !c) return null;
  const medal = ["🥇", "🥈", "🥉"];
  const Small = ({ d, n }: { d: Row; n: number }) => (
    <Link to={`/deal/${encodeURIComponent(d.slug)}`} className="hv-pod-small" style={{ backgroundColor: cardColor(d.slug) }}>
      <img src={d.image_urls?.[0]} alt="" />
      <span className="hv-pod-medal">{medal[n]} #{n + 1}</span>
      <span className="hv-pod-copy"><strong>{money(d.price_eur)}</strong><em>{FLAG[d.country] || "📍"} {d.location_name || d.country}</em></span>
    </Link>
  );
  return (
    <section className="hv-podium" aria-label="This week's podium">
      <div className="hv-podium-head">
        <span className="hv-live"><i />{scope === "all" ? "All-time top 3" : "This week's top 3"}</span>
        {scope !== "all" && left && <span className="hv-countdown">Voting closes in <b>{left}</b></span>}
      </div>
      <div className="hv-podium-grid">
        <Link to={`/deal/${encodeURIComponent(a.slug)}`} className="hv-pod-big" style={{ backgroundColor: cardColor(a.slug) }}>
          <img src={a.image_urls?.[0]} alt={niceTitle(a)} />
          <span className="hv-pod-medal is-gold">{medal[0]} #1 {scope === "all" ? "all time" : "this week"}</span>
          <div className="hv-pod-copy">
            <strong className="hv-pod-price">{money(a.price_eur)}</strong>
            <span className="hv-pod-title">{niceTitle(a)}</span>
            <em>{FLAG[a.country] || "📍"} {a.location_name || a.country}</em>
            <RentLine price={a.price_eur} />
          </div>
          <div className="hv-pod-actions"><HeroVote deal={a} scope={scope} /><ShareButton deal={a} scope={scope} /></div>
        </Link>
        <div className="hv-pod-side"><Small d={b} n={1} /><Small d={c} n={2} /></div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- 6: Airbnb-style gallery with zoom
export function DetailGallery({ deal }: { deal: Deal }) {
  const imgs = (deal.image_urls || []).filter(Boolean);
  const [lb, setLb] = useState<number | null>(null);
  const [i, setI] = useState(()=>Math.min(storage.get<number>("rh.photo."+deal.slug,0),Math.max(0,imgs.length-1)));
  useEffect(()=>storage.set("rh.photo."+deal.slug,i),[deal.slug,i]);
  const track = useRef<HTMLDivElement>(null);
  useEffect(() => {if(track.current)track.current.scrollLeft=track.current.clientWidth*i;}, [deal.id]);
  useEffect(() => { preloadImages(imgs.slice(i+1,i+2)); }, [deal.id,i]);
  if (!imgs.length) return null;
  const open = (n: number) => { setLb(n); bumpIx(); };
  return (
    <div className="hv-gallery" style={{ backgroundColor: cardColor(deal.slug) }}>
      <div className={"hv-mosaic n" + Math.min(imgs.length, 5)}>
        {imgs.slice(0, 5).map((u, n) => <button key={u + n} onClick={() => open(n)} aria-label={`Open photo ${n + 1}`}><PropertyImage sizes="100vw" src={u} fallback={imgs.find(x=>x!==u)} alt={`${niceTitle(deal)}, ${n+1}`} loading={n===0?"eager":"lazy"} /></button>)}
        {imgs.length > 1 && <button className="hv-mosaic-all" onClick={() => open(0)}><Grid2x2 size={16} /> Show all {imgs.length} photos</button>}
      </div>
      <div className="hv-carousel" ref={track} onScroll={(e) => setI(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
        {imgs.map((u, n) => <button key={u + n} onClick={() => open(n)} aria-label={`Open photo ${n + 1}`}><PropertyImage sizes="100vw" src={u} fallback={imgs.find(x=>x!==u)} alt={`${niceTitle(deal)}, ${n+1}`} loading={n===0?"eager":"lazy"} /></button>)}
      </div>
      {imgs.length > 1 && <span className="hv-carousel-count">{i + 1} / {imgs.length}</span>}
      {lb !== null && <Lightbox images={imgs} start={lb} title={niceTitle(deal)} onClose={() => setLb(null)} />}
    </div>
  );
}

// ---------------------------------------------------------------- 8: amenity icons from the listing text
const AMENITIES: [RegExp, string, ReactNode][] = [
  [/sea[ -]?view|ocean view|views? (of|over|towards) the sea|sea views/i, "Sea view", <Waves size={18} />],
  [/beach|seafront|beachfront|by the sea|to the sea|from the sea/i, "Near the sea", <Sun size={18} />],
  [/lake|lakeside|lakefront|river/i, "Water nearby", <Droplets size={18} />],
  [/terrace|rooftop|solarium/i, "Terrace", <Sun size={18} />],
  [/balcon/i, "Balcony", <Sun size={18} />],
  [/garden|orchard|lawn|fruit trees/i, "Garden", <Flower2 size={18} />],
  [/pool/i, "Pool", <Droplets size={18} />],
  [/sauna|hot tub|spa\b|cold plunge|onsen|hot spring/i, "Sauna or spa", <Bath size={18} />],
  [/fireplace|wood[- ]?(burning|fired)? stove|tiled stove/i, "Fireplace", <Flame size={18} />],
  [/garage|parking/i, "Parking", <Car size={18} />],
  [/furnished/i, "Furnished", <Sofa size={18} />],
  [/renovated|updated|move-in|ready to move|remodeled|refreshed/i, "Move-in ready", <KeyRound size={18} />],
  [/mountain|panoramic|valley views|hill/i, "Views", <Mountain size={18} />],
  [/forest|woodland|nature|countryside/i, "Nature", <Trees size={18} />],
];
export function Amenities({ deal }: { deal: Deal }) {
  const txt = safeFacts(deal);
  const list = AMENITIES.filter(([re]) => re.test(txt)).slice(0, 8);
  const facts: [string, ReactNode][] = [];
  if (deal.bedrooms != null) facts.push([`${deal.bedrooms} ${deal.bedrooms === 1 ? "bedroom" : "bedrooms"}`, <BedDouble size={18} />]);
  if (deal.sqm) facts.push([`${deal.sqm} m²`, <Ruler size={18} />]);
  if (!list.length && !facts.length) return null;
  return (
    <ul className="hv-amenities" aria-label="What this home has">
      {facts.map(([t, i]) => <li key={t}>{i}<span>{t}</span></li>)}
      {list.map(([, t, i]) => <li key={t}>{i}<span>{t}</span></li>)}
    </ul>
  );
}

// ---------------------------------------------------------------- 7: mini map and what is nearby
export function Nearby({ deal }: { deal: Deal }) {
  const [n, setN] = useState<any>(null);
  useEffect(() => {
    setN(null);
    (supabase.rpc as any)("community_nearby", { p_slug: deal.slug }).then(({ data }: any) => setN(data || false)).catch(() => setN(false));
  }, [deal.slug]);
  if (!n || !n.lat) return null;
  const regionOnly = n.approx && (deal.location_name || "").split(",").length <= 2;
  const items: [ReactNode, string, string][] = [];
  if (!regionOnly) {
    if (n.sea_km != null) items.push([<Waves size={18} />, "Sea", n.sea_km < 1 ? "under 1 km" : `${Math.round(n.sea_km)} km`]);
    if (n.lake) items.push([<Droplets size={18} />, n.lake.name, `${n.lake.km < 1 ? "under 1" : Math.round(n.lake.km)} km`]);
    if (n.shop) items.push([<ShoppingBasket size={18} />, `Shop · ${n.shop.name}`, `${n.shop.km < 1 ? "under 1" : Math.round(n.shop.km)} km`]);
    if (n.train) items.push([<TrainFront size={18} />, `Train · ${n.train.name}`, `${Math.round(n.train.km)} km`]);
  }
  if (n.airport) items.push([<Plane size={18} />, `${n.airport.code} · ${n.airport.name.replace(/ (International )?Airport$/, "")}`, `${regionOnly ? "~" : ""}${n.airport.km} km`]);
  return (
    <section className="hv-nearby">
      <h2>Where it is</h2>
      <Suspense fallback={<div className="hv-minimap" />}><MiniMap lat={n.lat} lng={n.lng} zoom={regionOnly ? 7 : 11} /></Suspense>
      <p className="hunt-fine"><MapPin size={13} /> {deal.location_name}{regionOnly ? " · the seller only gives the region" : " · approximate area, not the exact house"}</p>
      {items.length > 0 && <ul>{items.map(([i, a, b]) => <li key={a}>{i}<span>{a}</span><b>{b}</b></li>)}</ul>}
      <p className="hunt-fine">Distances are straight lines, measured from the town.</p>
    </section>
  );
}

// ---------------------------------------------------------------- 10: video tour made from the photos
function loadImg(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
}
export function VideoTour({ deal }: { deal: Deal }) {
  const [open, setOpen] = useState(false);
  const imgs = (deal.image_urls || []).filter(Boolean).slice(0, 6);
  if (imgs.length < 2) return null;
  return (
    <>
      <button className="hv-share has-label" onClick={() => { setOpen(true); bumpIx(); }}><Play size={17} /><span>{t("Photo slideshow")}</span></button>
      {open && <TourPlayer deal={deal} imgs={imgs} onClose={() => setOpen(false)} />}
    </>
  );
}
function TourPlayer({ deal, imgs, onClose }: { deal: Deal; imgs: string[]; onClose: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<"" | "recording" | "done" | "error">("");
  const [pics, setPics] = useState<HTMLImageElement[]>([]);
  useEffect(() => { Promise.all(imgs.map((u) => loadImg(u).catch(() => null))).then((l) => setPics(l.filter(Boolean) as HTMLImageElement[])); }, []);
  const PER = 2600;
  const draw = (t: number) => {
    const c = canvas.current; if (!c || !pics.length) return;
    const x = c.getContext("2d")!; const W = c.width, H = c.height;
    const total = PER * pics.length;
    const tt = t % total; const n = Math.floor(tt / PER); const p = (tt % PER) / PER;
    const paint = (img: HTMLImageElement, prog: number, alpha: number, k: number) => {
      const zoom = 1.08 + 0.12 * prog; const s = Math.max(W / img.width, H / img.height) * zoom;
      const w = img.width * s, h = img.height * s;
      const dx = (k % 2 ? -1 : 1) * (w - W) * 0.35 * (prog - 0.5);
      x.globalAlpha = alpha; x.drawImage(img, (W - w) / 2 + dx, (H - h) / 2, w, h); x.globalAlpha = 1;
    };
    x.fillStyle = "#000"; x.fillRect(0, 0, W, H);
    paint(pics[n], p, 1, n);
    if (p > 0.82) paint(pics[(n + 1) % pics.length], 0, (p - 0.82) / 0.18, n + 1);
    const g = x.createLinearGradient(0, H * 0.55, 0, H); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,.8)");
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.fillStyle = "#fff"; x.font = "800 64px system-ui, sans-serif"; x.fillText(money(deal.price_eur), 44, H - 150);
    x.font = "600 30px system-ui, sans-serif"; x.fillText(`${FLAG[deal.country] || ""} ${(deal.location_name || deal.country || "").slice(0, 34)}`, 44, H - 100);
    x.font = "700 26px system-ui, sans-serif"; x.globalAlpha = 0.85; x.fillText("realhunt.co", 44, H - 52); x.globalAlpha = 1;
  };
  useEffect(() => {
    if (!pics.length) return;
    let raf = 0; const t0 = performance.now();
    const loop = (now: number) => { draw(now - t0); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [pics.length]);
  async function record() {
    const c = canvas.current; if (!c || !(window as any).MediaRecorder) { setState("error"); return; }
    try {
      const type = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"].find((t) => (window as any).MediaRecorder.isTypeSupported?.(t)) || "video/webm";
      const rec = new MediaRecorder((c as any).captureStream(30), { mimeType: type, videoBitsPerSecond: 5_000_000 });
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = async () => {
        const blob = new Blob(chunks, { type: type.split(";")[0] });
        const ext = type.includes("mp4") ? "mp4" : "webm";
        const file = new File([blob], `realhunt-${deal.slug}.${ext}`, { type: blob.type });
        const nav: any = navigator;
        try {
          if (nav.canShare?.({ files: [file] })) await nav.share({ files: [file], title: niceTitle(deal) });
          else { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = file.name; a.click(); }
        } catch { /* user closed the share sheet */ }
        setState("done");
      };
      setState("recording"); rec.start(); setTimeout(() => rec.stop(), Math.min(pics.length, 5) * PER);
    } catch { setState("error"); }
  }
  return (
    <div className="hv-sheet-veil hv-tour" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="hv-tour-box" role="dialog" aria-modal="true" aria-label="Video tour">
        <button className="hv-tour-x" aria-label="Close" onClick={onClose}><X size={20} /></button>
        <canvas ref={canvas} width={720} height={1280} />
        <div className="hv-tour-actions">
          <button className="hunt-primary" onClick={record} disabled={state === "recording" || !pics.length}>
            {state === "recording" ? "Making your video…" : <><Download size={16} /> Save video for Reels / TikTok</>}
          </button>
          {state === "error" && <p className="hunt-fine">This browser cannot record video. Try Chrome or Safari on your phone.</p>}
          {state === "done" && <p className="hunt-fine">Saved. Add your own music in the app when you post it.</p>}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- 19: search with suggestions
export function SmartSearch({ value, onSearch, inputRef }: { value: string; onSearch: (q: string) => void; inputRef?: React.RefObject<HTMLInputElement> }) {
  const [text, setText] = useState(value);
  const [all, setAll] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [active,setActive]=useState(-1);
  const navigate = useNavigate();
  useEffect(() => setText(value), [value]);
  useEffect(()=>{let alive=true;if(text.trim().length<2){setAll([]);return;}const timer=setTimeout(()=>feed({scope:"all",q:text.trim(),limit:8}).then(f=>{if(alive){remember(f.rows);setAll(f.rows);}}).catch(()=>{if(alive)setAll([]);}),180);return()=>{alive=false;clearTimeout(timer);};},[text]);
  const q = text.trim().toLowerCase();
  const sugg = useMemo(() => {
    if (q.length < 2) return { places: [] as { label: string; img?: string; n: number }[], homes: [] as Row[] };
    const places = new Map<string, { label: string; img?: string; n: number }>();
    const homes: Row[] = [];
    for (const r of all) {
      const parts = [r.country, ...(r.location_name || "").split(",").map((s) => s.trim())].filter(Boolean);
      for (const p of parts) if (p.toLowerCase().includes(q)) { const e = places.get(p) || { label: p, img: r.image_urls?.[0], n: 0 }; e.n++; places.set(p, e); }
      if (`${r.title} ${r.why_great || ""}`.toLowerCase().includes(q)) homes.push(r);
    }
    return { places: Array.from(places.values()).sort((a, b) => b.n - a.n).slice(0, 4), homes: homes.slice(0, 4) };
  }, [q, all]);
  const go = (s: string) => { setText(s); setOpen(false); onSearch(s); };
  return (
    <div className="hv-smart">
      <form className="hv-search" role="search" onSubmit={(e) => { e.preventDefault(); go(text); }}>
        <Search size={18} aria-hidden="true" />
        <input ref={inputRef} type="search" value={text} onFocus={() => { setOpen(true); }} onBlur={() => setTimeout(() => setOpen(false), 180)}
          onKeyDown={(e)=>{ const items=[...sugg.places.map(p=>({label:p.label})),...sugg.homes.map(r=>({slug:r.slug}))] as any[]; if(e.key==='Escape'){setOpen(false);setActive(-1);} if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();setOpen(true);setActive(n=>Math.max(0,Math.min(items.length-1,n+(e.key==='ArrowDown'?1:-1))));} if(e.key==='Enter'&&open&&active>=0&&items[active]){e.preventDefault();const x=items[active];x.slug?navigate('/deal/'+encodeURIComponent(x.slug)):go(x.label);setOpen(false);} }} role="combobox" aria-activedescendant={active>=0?`rh-suggestion-${active}`:undefined} aria-expanded={open} aria-controls="rh-search-options" aria-autocomplete="list" onChange={(e) => { setText(e.target.value); setOpen(true);setActive(-1); }} placeholder="Search a country, town or lake, sea, cabin…" aria-label="Search homes" enterKeyHint="search" autoComplete="off" />
        {text && <button type="button" aria-label="Clear search" onClick={() => go("")}><X size={16} /></button>}
      </form>
      {open && (q.length < 2 ? (
        <div className="hv-sugg" id="rh-search-options"><small>Try</small><div className="hv-sugg-pills">{["sea view", "lake", "sauna", "Italy", "Japan", "Sweden", "terrace", "stone"].map((s) => <button key={s} onClick={() => go(s)}>{s}</button>)}</div></div>
      ) : (sugg.places.length + sugg.homes.length > 0) && (
        <div className="hv-sugg" id="rh-search-options" role="listbox">
          {sugg.places.map((p,index) => <button role="option" aria-selected={active===index} id={`rh-suggestion-${index}`} key={p.label} className={"hv-sugg-row"+(active===index?" rh-search-active":"")} onClick={() => go(p.label)}><span className="hv-sugg-img">{p.img ? <img src={p.img} alt="" /> : <MapPin size={16} />}</span><span><strong>{p.label}</strong><small>{p.n} matching {p.n === 1 ? "suggestion" : "suggestions"}</small></span></button>)}
          {sugg.homes.map((r,index) => <button role="option" aria-selected={active===index+sugg.places.length} id={`rh-suggestion-${index+sugg.places.length}`} key={r.id} className={"hv-sugg-row"+(active===index+sugg.places.length?" rh-search-active":"")} onClick={() => { setOpen(false); navigate(`/deal/${encodeURIComponent(r.slug)}`); }}><span className="hv-sugg-img"><img src={r.image_urls?.[0]} alt="" /></span><span><strong>{money(r.price_eur)} · {niceTitle(r)}</strong><small>{r.location_name}</small></span></button>)}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- 20: friendly empty states
export function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="hv-empty">
      <svg viewBox="0 0 220 140" aria-hidden="true" className="hv-empty-art">
        <circle cx="170" cy="36" r="18" fill="#FACC15" opacity=".85" />
        <path d="M0 118 Q55 92 110 112 T220 104 V140 H0Z" fill="#CFE8D8" />
        <path d="M60 116 V76 L92 50 L124 76 V116Z" fill="#fff" stroke="#16150F" strokeWidth="3" strokeLinejoin="round" />
        <path d="M52 80 L92 44 L132 80" fill="none" stroke="#16150F" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="84" y="90" width="16" height="26" rx="2" fill="#0EA5E9" />
        <circle cx="150" cy="100" r="11" fill="none" stroke="#16150F" strokeWidth="3" /><path d="M158 108 L168 118" stroke="#16150F" strokeWidth="4" strokeLinecap="round" />
      </svg>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}

// ---------------------------------------------------------------- 4: the clean card's bottom line
export function CardMeta({ deal }: { deal: Row }) {
  const where = deal.location_name && deal.country && !deal.location_name.includes(deal.country) ? `${deal.location_name}, ${deal.country}` : deal.location_name || deal.country;
  return (
    <>
      <span className="hv-where">{FLAG[deal.country] || "📍"} {where}</span>
      <span className="rh-card-facts">{deal.sqm!=null?`${deal.sqm} m²`:t("Size unknown")} · {deal.bedrooms!=null?`${deal.bedrooms} ${t("beds")}`:t("Beds unknown")}</span><RentLine price={deal.price_eur} />
    </>
  );
}
export { SaveHeart, Share2, Sparkles };
