import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Pause, Play } from "lucide-react";
import { listingVideo } from "@/lib/listing-media";

type Props = { shortcode: string; title: string; compact?: boolean; href?: string; linkState?: unknown; onOpen?: () => void };

export default function ListingVideo({ shortcode, title, compact = false, href, linkState, onOpen }: Props) {
  const media = listingVideo(shortcode);
  const video = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false);
  const [visible, setVisible] = useState(false);
  const [manualPause, setManualPause] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const el = video.current; if (!el) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(preference.matches);
    update(); preference.addEventListener("change", update);
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(entries => {
      const onscreen = entries.some(entry => entry.isIntersecting);
      if (onscreen) setNear(true);
      setVisible(onscreen);
    }, { threshold: 0.15 });
    if (observer) observer.observe(el); else { setNear(true); setVisible(true); }
    return () => { observer?.disconnect(); preference.removeEventListener("change", update); };
  }, []);

  useEffect(() => {
    const el = video.current; if (!el) return;
    const sync = () => {
      if (document.hidden || !visible || manualPause || (compact && reduced)) el.pause();
      else if (compact) void el.play().catch(() => setPlaying(false));
    };
    sync(); document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, [visible, near, manualPause, reduced, compact]);

  if (!media) return null;
  const toggle = () => {
    const el = video.current; if (!el) return;
    if (playing) { setManualPause(true); el.pause(); }
    else { setManualPause(false); setNear(true); void el.play().catch(() => setPlaying(false)); }
  };
  const player = failed ? <img src={media.poster} alt={title} className="h-full w-full object-contain" /> : <video
    ref={video} src={near ? (compact ? media.preview : media.src) : undefined}
    poster={media.poster} muted={compact} loop={compact} playsInline controls={!compact}
    preload="none" aria-label={`${title}, property video`}
    onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onError={() => setFailed(true)}
    className={compact ? "w-full h-full object-contain" : "w-full max-h-[75dvh] aspect-[9/16] object-contain"}
  />;
  return <div className={compact ? "absolute inset-0 bg-[#181818]" : "relative bg-[#181818] overflow-hidden md:rounded-2xl"}>
    {href ? <Link to={href} state={linkState} onClick={onOpen} aria-label={`View ${title}`} className="block h-full w-full">{player}</Link> : player}
    {compact && !failed && <button type="button" onClick={toggle} aria-label={playing ? "Pause property video" : "Play property video"} className="absolute bottom-2 right-2 z-10 h-11 w-11 grid place-items-center rounded-full bg-black/65 text-white">{playing ? <Pause size={18} /> : <Play size={18} />}</button>}
    {compact && <span className="absolute bottom-3 left-3 pointer-events-none rounded-full bg-black/65 px-2 py-1 text-[11px] text-white">Video tour</span>}
  </div>;
}
