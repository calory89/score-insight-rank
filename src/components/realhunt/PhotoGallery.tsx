import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { srcSet } from "@/lib/rh";

type Props = {
  images: string[];
  title: string;
  compact?: boolean;
  href?: string;
  eager?: boolean;
  onOpen?: () => void;
};

export default function PhotoGallery({ images, title, compact = false, href, eager = false, onOpen }: Props) {
  const rail = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const [index, setIndex] = useState(0);
  const go = (next: number) => {
    const target = (next + images.length) % images.length;
    setIndex(target);
    rail.current?.scrollTo({ left: target * rail.current.clientWidth, behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  return (
    <div role="region" aria-label={`${title} photos`} aria-roledescription="carousel" className={compact ? "absolute inset-0" : "overflow-hidden md:rounded-2xl bg-hairline/30"}>
      <div className={compact ? "relative h-full" : "relative aspect-[4/3] md:aspect-[16/9] bg-[#e9e7e2]"}>
        <div ref={rail} tabIndex={0} aria-label="Photo gallery. Swipe or use arrow keys."
          onKeyDown={(e) => { if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); go(index + (e.key === "ArrowRight" ? 1 : -1)); } }}
          onPointerDown={(e) => { gesture.current = { x: e.clientX, y: e.clientY, moved: false }; }}
          onPointerMove={(e) => { const g = gesture.current; if (g && (Math.abs(e.clientX - g.x) > 8 || Math.abs(e.clientY - g.y) > 8)) g.moved = true; }}
          onClickCapture={(e) => { if (gesture.current?.moved) { e.preventDefault(); e.stopPropagation(); } gesture.current = null; }}
          onScroll={(e) => { const el = e.currentTarget; if (el.clientWidth) setIndex(Math.round(el.scrollLeft / el.clientWidth)); }}
          className="flex h-full w-full overflow-x-auto snap-x snap-mandatory overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-white">
          {images.map((url, i) => {
            const photo = <img src={url} srcSet={srcSet(url)} sizes={compact ? "(min-width:1280px) 300px, (min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw" : "(min-width:1140px) 1092px, 100vw"} alt={`${title} — photo ${i + 1} of ${images.length}`} loading={i === 0 && eager ? "eager" : "lazy"} decoding="async" draggable={false} className={`w-full h-full ${compact ? "object-cover" : "object-contain"}`} />;
            return <div key={url} role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${images.length}`} className="w-full h-full shrink-0 snap-start snap-always">{href ? <Link to={href} tabIndex={i === index ? 0 : -1} onClick={onOpen} className="block w-full h-full">{photo}</Link> : photo}</div>;
          })}
        </div>
        {images.length > 1 && <>
          <button type="button" aria-label="Previous photo" onClick={() => go(index - 1)} className="absolute z-10 left-1.5 md:left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/95 shadow flex items-center justify-center text-ink hover:bg-white focus-visible:outline-2 focus-visible:outline-ink"><ChevronLeft size={19} /></button>
          <button type="button" aria-label="Next photo" onClick={() => go(index + 1)} className="absolute z-10 right-1.5 md:right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/95 shadow flex items-center justify-center text-ink hover:bg-white focus-visible:outline-2 focus-visible:outline-ink"><ChevronRight size={19} /></button>
          <span aria-live="polite" aria-atomic="true" className={`absolute pointer-events-none rounded-full bg-black/55 backdrop-blur-sm text-white text-[11px] px-2.5 py-1 tabular-nums ${compact ? "bottom-3 left-1/2 -translate-x-1/2" : "bottom-3 right-3"}`}>{index + 1} / {images.length}</span>
        </>}
      </div>
      {!compact && images.length > 1 && <div className="flex gap-2 overflow-x-auto p-3 bg-white" aria-label="Choose a photo">
        {images.map((url, i) => <button type="button" key={url} aria-label={`Show photo ${i + 1}`} aria-pressed={i === index} onClick={() => go(i)} className={`shrink-0 w-20 md:w-28 aspect-[4/3] rounded-lg overflow-hidden border-2 transition-opacity ${i === index ? "border-ink opacity-100" : "border-transparent opacity-60 hover:opacity-100"}`}><img src={url} srcSet={srcSet(url)} sizes="112px" alt="" loading="lazy" className="w-full h-full object-cover" /></button>)}
      </div>}
    </div>
  );
}
