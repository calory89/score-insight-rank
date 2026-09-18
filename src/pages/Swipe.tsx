import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import RHNav from "@/components/realhunt/RHNav";
import AuthModal from "@/components/realhunt/AuthModal";
import { Heart, X, Info } from "lucide-react";
import { db, eur, FLAG, norm, IG, track, srcSet, score } from "@/lib/rh";

const Swipe = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<IG[]>([]);
  const [i, setI] = useState(0);
  const [dx, setDx] = useState(0);
  const [auth, setAuth] = useState(false);
  const start = useRef<number | null>(null);
  useEffect(() => {
    document.title = "Swipe homes under €60,000 · RealHunt"; track("swipe_view");
    db.from("ig_finds").select("id,shortcode,image_urls,price_eur,price_in_image,location_name,country_guess,hook,posted_at,likes,rank_score,is_beach").neq("status", "hidden").lte("price_eur", 100000).limit(300).then(({ data }: any) => setItems(((data || []) as IG[]).filter((f) => f.image_urls?.length).sort((a, b) => score(b) - score(a))));
  }, []);
  const f = items[i];
  const decide = async (like: boolean) => {
    if (!f) return; track(like ? "swipe_like" : "swipe_pass", { find: f.shortcode });
    if (like) { if (!user) { setAuth(true); return; } await db.from("find_events").insert({ user_id: user.id, find_id: f.id, event: "favorite" }); }
    setDx(0); setI((n) => n + 1);
  };
  const onDown = (e: React.PointerEvent) => { start.current = e.clientX; };
  const onMove = (e: React.PointerEvent) => { if (start.current != null) setDx(e.clientX - start.current); };
  const onUp = () => { if (Math.abs(dx) > 90) decide(dx > 0); else setDx(0); start.current = null; };
  const c = f ? norm(f.country_guess) : "";
  return (
    <div className="min-h-screen bg-paper text-ink">
      <RHNav />
      <div className="max-w-[480px] mx-auto px-4 pt-4 pb-10 select-none">
        {!f ? <div className="py-20 text-center"><p className="font-display text-[26px]">That is everything for now.</p><Link to="/" className="underline text-ink-muted">Back to the deals</Link></div> : (
          <>
            <div onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} className="relative aspect-[4/5] rounded-3xl overflow-hidden bg-hairline/30 shadow-xl touch-pan-y" style={{ transform: `translateX(${dx}px) rotate(${dx / 25}deg)`, transition: start.current == null ? "transform .25s" : "none" }}>
              <img src={f.image_urls![0]} srcSet={srcSet(f.image_urls![0])} sizes="480px" alt="" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />
              <span className="absolute top-3 right-3 px-2 py-1 rounded-full bg-white/90 text-ink text-[12px] font-medium shadow">{FLAG[c] || "🌍"} {c}</span>
              {dx > 40 && <span className="absolute top-6 left-6 px-3 py-1.5 rounded-lg border-4 border-emerald-400 text-emerald-400 font-display text-[28px] -rotate-12">SAVE</span>}
              {dx < -40 && <span className="absolute top-6 right-6 px-3 py-1.5 rounded-lg border-4 border-red-400 text-red-400 font-display text-[28px] rotate-12">PASS</span>}
              <div className="absolute inset-x-0 bottom-0 p-5 text-white"><p className="font-display text-[36px] leading-none tabular-nums">{f.price_eur ? eur(f.price_eur) : ""}</p><p className="mt-1 text-[15px] opacity-95">{f.location_name || c}</p><p className="text-[13px] opacity-80 line-clamp-2">{f.hook}</p></div>
            </div>
            <div className="mt-5 flex items-center justify-center gap-5">
              <button onClick={() => decide(false)} aria-label="Pass" className="h-16 w-16 rounded-full bg-white border border-hairline shadow inline-flex items-center justify-center text-red-500"><X size={28} /></button>
              <Link to={`/find/${f.shortcode}`} aria-label="Details" className="h-12 w-12 rounded-full bg-white border border-hairline shadow inline-flex items-center justify-center text-ink"><Info size={20} /></Link>
              <button onClick={() => decide(true)} aria-label="Save" className="h-16 w-16 rounded-full bg-ink text-paper shadow inline-flex items-center justify-center"><Heart size={26} /></button>
            </div>
            <p className="mt-3 text-center text-[12px] text-ink-muted">{i + 1} of {items.length} · swipe right to save, left to pass</p>
          </>
        )}
      </div>
      <AuthModal open={auth} onClose={() => setAuth(false)} title="Save this home" subtitle="Sign in to keep the homes you swipe right." redirect="/swipe" />
    </div>
  );
};
export default Swipe;
