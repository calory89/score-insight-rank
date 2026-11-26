import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, Expand, X, ZoomIn, ZoomOut } from "lucide-react";
import { srcSet } from "@/lib/rh";
import { readSession, writeSession } from "@/lib/catalog";
import { photoOf } from "@/lib/a11y";

type Props = { images: string[]; title: string; compact?: boolean; href?: string; eager?: boolean; onOpen?: () => void; rememberKey?: string; linkState?: unknown };
const PHOTO_EVENT = "rh-photo-change";
export { photoOf };

export default function PhotoGallery({ images, title, compact = false, href, eager = false, onOpen, rememberKey, linkState }: Props) {
  const photos = images.filter(Boolean);
  const count = photos.length;
  const rail = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const storageKey = rememberKey ? `rh_photo:${rememberKey}` : "";
  const source = useId();
  const [index, setIndex] = useState(() => Math.max(0, Math.min(count - 1, readSession<number>(storageKey, 0) || 0)));
  const current = useRef(index); current.current = index;
  const [expanded, setExpanded] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [visible, setVisible] = useState(eager || !compact);
  const [visited, setVisited] = useState<Set<number>>(() => new Set([index]));
  const [failed, setFailed] = useState<Set<string>>(() => new Set());
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const scroll = (i: number, smooth = false) => rail.current?.scrollTo({ left: i * rail.current.clientWidth, behavior: smooth && !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "smooth" : "instant" as ScrollBehavior });
  const remember = (i: number) => {
    current.current = i; setIndex(i);
    setVisited(previous => previous.has(i) ? previous : new Set([...previous, i]));
    if (storageKey) { writeSession(storageKey, i); window.dispatchEvent(new CustomEvent(PHOTO_EVENT, { detail: { key: storageKey, index: i, source } })); }
  };
  const go = (i: number) => { if (!count) return; const next = (i + count) % count; remember(next); scroll(next, true); setZoom(false); };
  useLayoutEffect(() => {
    const next = Math.max(0, Math.min(count - 1, readSession<number>(storageKey, 0) || 0));
    current.current = next; setIndex(next); setVisited(new Set([next])); scroll(next);
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => scroll(current.current)) : null;
    if (rail.current) observer?.observe(rail.current);
    return () => { observer?.disconnect(); clearTimeout(timer.current); };
  }, [storageKey, count]);
  useEffect(() => {
    const sync = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (d.key !== storageKey || d.source === source) return;
      const next = Math.max(0, Math.min(count - 1, d.index));
      current.current = next; setIndex(next); scroll(next);
    };
    window.addEventListener(PHOTO_EVENT, sync);
    return () => window.removeEventListener(PHOTO_EVENT, sync);
  }, [storageKey, count, source]);
  useEffect(() => {
    if (!compact || eager || !rail.current) return;
    if (typeof IntersectionObserver === "undefined") { setVisible(true); return; }
    // Latch once near the viewport: native lazy loading fetches several offscreen rows and
    // horizontal slides. Do not attach image URLs until this card is actually approaching.
    const observer = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: "300px" });
    observer.observe(rail.current); return () => observer.disconnect();
  }, [compact, eager]);
  if (!count) return <div className={`${compact ? "absolute inset-0" : "aspect-[4/3] rounded-2xl"} grid place-items-center bg-hairline/40 text-ink-muted text-sm`}>Photos not available</div>;
  const markFailed = (url: string) => setFailed(previous => previous.has(url) ? previous : new Set([...previous, url]));
  const unavailable = (label = "Photo unavailable") => <div role="img" aria-label={label} className="w-full h-full grid place-items-center bg-[#e4e5e7] text-ink-muted text-sm">Photo unavailable</div>;
  const image = (url: string, i: number) => {
    // Keep every slide's geometry and controls. Only the current/next/previously viewed
    // photos get a URL. The next slide itself preloads the correct responsive candidate,
    // avoiding the old new Image() request for an additional full-size copy.
    const load = visible && (visited.has(i) || i === index || i === (index + 1) % count || i === index - 1);
    if (failed.has(url)) return unavailable(`${title}, photo ${i + 1} unavailable`);
    return <img src={load ? url : undefined} srcSet={load ? srcSet(url) : undefined} sizes={compact ? "(min-width:1280px) 283px, (min-width:1024px) calc((100vw - 88px) / 3), (min-width:768px) calc((100vw - 68px) / 2), (min-width:640px) calc((100vw - 52px) / 2), calc((100vw - 44px) / 2)" : "(min-width:1140px) 1092px, 100vw"} alt={`${title}, photo ${i + 1} of ${count}`} loading={load ? "eager" : "lazy"} fetchPriority={eager && i === index ? "high" : i === index ? "auto" : "low"} decoding="async" draggable={false} onError={() => markFailed(url)} className={`w-full h-full ${compact ? "object-cover" : "object-contain"}`} />;
  };
  return <>
    <div role="region" aria-label={`${title} photos`} aria-roledescription="carousel" className={`rh-gal ${compact ? "absolute inset-0" : "overflow-hidden md:rounded-2xl bg-hairline/30"}`}>
      <div className={compact ? "relative h-full" : "relative aspect-[4/3] md:aspect-[16/9] bg-[#e4e5e7]"}>
        <div ref={rail} tabIndex={0} aria-label="Photo gallery. Swipe or use arrow keys."
          onKeyDown={e => { if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); go(index + (e.key === "ArrowRight" ? 1 : -1)); } else if (e.key === "Home" || e.key === "End") { e.preventDefault(); go(e.key === "Home" ? 0 : count - 1); } else if (e.key === "Enter" && !href && e.target === e.currentTarget) { e.preventDefault(); setExpanded(true); } }}
          onPointerDown={e => { gesture.current = { x: e.clientX, y: e.clientY, moved: false }; }}
          onPointerMove={e => { const g = gesture.current; if (g && (Math.abs(e.clientX - g.x) > 8 || Math.abs(e.clientY - g.y) > 8)) g.moved = true; }}
          onClickCapture={e => { if (gesture.current?.moved) { e.preventDefault(); e.stopPropagation(); } gesture.current = null; }}
          onScroll={e => { const el = e.currentTarget; clearTimeout(timer.current); timer.current = setTimeout(() => { if (el.clientWidth) remember(Math.max(0, Math.min(count - 1, Math.round(el.scrollLeft / el.clientWidth)))); }, 100); }}
          className="flex h-full w-full overflow-x-auto snap-x snap-mandatory overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-white">
          {photos.map((url, i) => <div key={`${url}-${i}`} role="group" aria-roledescription="slide" aria-label={photoOf(i + 1, count)} className="w-full h-full shrink-0 snap-start snap-always">
            {href ? <Link to={href} state={linkState} tabIndex={i === index ? 0 : -1} onClick={onOpen} className="block w-full h-full">{image(url, i)}</Link> : <button type="button" tabIndex={i === index ? 0 : -1} onClick={() => setExpanded(true)} aria-label={`Enlarge photo ${i + 1}`} className="block w-full h-full cursor-zoom-in">{image(url, i)}</button>}
          </div>)}
        </div>
        {count > 1 && <>
          <button type="button" aria-label="Previous photo" onClick={() => go(index - 1)} className={`rh-gal-nav ${compact ? "hidden sm:flex" : "flex"} absolute z-10 left-2 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-white/95 shadow items-center justify-center text-ink`}><ChevronLeft size={20} aria-hidden="true" /></button>
          <button type="button" aria-label="Next photo" onClick={() => go(index + 1)} className={`rh-gal-nav ${compact ? "hidden sm:flex" : "flex"} absolute z-10 right-2 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-white/95 shadow items-center justify-center text-ink`}><ChevronRight size={20} aria-hidden="true" /></button>
        </>}
        <span aria-hidden="true" className={`rh-gal-count absolute pointer-events-none rounded-full bg-black/75 text-white text-[12px] px-2.5 py-1 tabular-nums ${compact ? "bottom-2 left-1/2 -translate-x-1/2" : "bottom-3 left-3"}`}>{index + 1} / {count}</span>
        <span className="sr-only" aria-live="polite" aria-atomic="true">{photoOf(index + 1, count)}</span>
        {!compact && <button type="button" onClick={() => setExpanded(true)} className="absolute bottom-2 right-2 rounded-full bg-white/95 h-11 px-4 flex items-center gap-2 text-sm text-ink"><Expand size={16} aria-hidden="true" /> Enlarge</button>}
      </div>
      {!compact && count > 1 && <div role="group" className="flex gap-2 overflow-x-auto p-3 bg-white" aria-label="Choose a photo">{photos.map((url, i) => <button type="button" key={`${url}-${i}`} aria-label={`Show photo ${i + 1}`} aria-current={i === index ? "true" : undefined} onClick={() => go(i)} className={`shrink-0 w-20 md:w-28 aspect-[4/3] rounded-lg overflow-hidden border-2 ${i === index ? "border-ink opacity-100" : "border-transparent opacity-60"}`}>{failed.has(url) ? unavailable(`Photo ${i + 1} unavailable`) : <img src={url} srcSet={srcSet(url)} sizes="112px" alt="" loading="lazy" onError={() => markFailed(url)} className="w-full h-full object-cover" />}</button>)}</div>}
    </div>
    <Dialog.Root open={expanded} onOpenChange={value => { setExpanded(value); setZoom(false); }}>
      <Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-[85] bg-black/95" /><Dialog.Content aria-describedby={undefined} className="fixed inset-0 z-[90] text-white flex flex-col" onKeyDown={e => { if (!zoom && ["ArrowLeft", "ArrowRight"].includes(e.key)) { e.preventDefault(); go(index + (e.key === "ArrowRight" ? 1 : -1)); } }}>
        <div className="flex items-center justify-between gap-3 p-4 shrink-0"><Dialog.Title className="text-sm line-clamp-1">{title} · {index + 1} / {count}</Dialog.Title><div className="flex gap-2"><button type="button" aria-label={zoom ? "Zoom out" : "Zoom in"} aria-pressed={zoom} onClick={() => setZoom(v => !v)} className="h-11 w-11 flex items-center justify-center rounded-full bg-white/15">{zoom ? <ZoomOut size={20} aria-hidden="true" /> : <ZoomIn size={20} aria-hidden="true" />}</button><Dialog.Close aria-label="Close enlarged photo" className="h-11 w-11 flex items-center justify-center rounded-full bg-white/15"><X size={22} aria-hidden="true" /></Dialog.Close></div></div>
        <div className="flex-1 min-h-0 overflow-auto" onTouchStart={e => { if (!zoom && e.touches.length === 1) gesture.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, moved: false }; else gesture.current = null; }} onTouchEnd={e => { const g = gesture.current; if (!zoom && g && e.changedTouches[0]) { const dx = e.changedTouches[0].clientX - g.x; const dy = e.changedTouches[0].clientY - g.y; if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) go(index + (dx < 0 ? 1 : -1)); } gesture.current = null; }}>
          {failed.has(photos[index]) ? unavailable(`${title}, photo ${index + 1} unavailable`) : <img src={photos[index]} alt={`${title}, photo ${index + 1} of ${count}`} draggable={false} onError={() => markFailed(photos[index])} onDoubleClick={() => setZoom(v => !v)} className={zoom ? "w-[200%] max-w-none h-[200%] object-contain" : "w-full h-full object-contain"} />}
        </div>
        <div className="flex items-center justify-center gap-6 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shrink-0"><button type="button" disabled={count < 2} onClick={() => go(index - 1)} aria-label="Previous enlarged photo" className="h-12 w-12 grid place-items-center rounded-full bg-white/15"><ChevronLeft aria-hidden="true" /></button><span className="text-sm tabular-nums" aria-hidden="true">{index + 1} / {count}</span><span className="sr-only" aria-live="polite" aria-atomic="true">{expanded ? photoOf(index + 1, count) : ""}</span><button type="button" disabled={count < 2} onClick={() => go(index + 1)} aria-label="Next enlarged photo" className="h-12 w-12 grid place-items-center rounded-full bg-white/15"><ChevronRight aria-hidden="true" /></button></div>
      </Dialog.Content></Dialog.Portal>
    </Dialog.Root>
  </>;
}
