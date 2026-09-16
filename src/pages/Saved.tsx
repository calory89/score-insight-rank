import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import RHNav from "@/components/realhunt/RHNav";
import AuthModal from "@/components/realhunt/AuthModal";
import { Heart } from "lucide-react";
import { db, eur, FLAG, norm, IG, srcSet } from "@/lib/rh";

const Saved = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<IG[] | null>(null);
  const [auth, setAuth] = useState(!user);
  useEffect(() => { document.title = "Saved homes · RealHunt"; }, []);
  useEffect(() => {
    if (!user) { setItems(null); setAuth(true); return; }
    setAuth(false);
    db.from("find_events").select("created_at, ig_finds(id,shortcode,image_urls,price_eur,price_in_image,location_name,country_guess,is_beach,caption,posted_at,likes,source_account)").eq("user_id", user.id).eq("event", "favorite").order("created_at", { ascending: false }).then(({ data }: any) => setItems((data || []).map((r: any) => r.ig_finds).filter(Boolean)));
  }, [user]);
  const remove = async (f: IG) => { if (!user) return; setItems((l) => (l || []).filter((x) => x.id !== f.id)); await db.from("find_events").delete().eq("user_id", user.id).eq("find_id", f.id).eq("event", "favorite"); };

  return (
    <div className="min-h-screen bg-paper text-ink">
      <RHNav />
      <section className="max-w-[1240px] mx-auto px-4 md:px-6 pt-8 md:pt-12 pb-10">
        <h1 className="font-display text-[clamp(30px,5vw,54px)] leading-[1.02] tracking-tight">Saved homes</h1>
        {!user && <p className="mt-3 text-ink-muted">Sign in to see the homes you saved. <button onClick={() => setAuth(true)} className="underline text-ink">Sign in</button></p>}
        {user && items && items.length === 0 && <p className="mt-3 text-ink-muted">Nothing saved yet. Tap the heart on any home. <Link to="/" className="underline text-ink">Browse deals</Link></p>}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
          {(items || []).map((f) => { const c = norm(f.country_guess); return (
            <Link key={f.id} to={`/find/${f.shortcode}`} className="group relative block rounded-2xl overflow-hidden bg-hairline/30 aspect-[4/5] shadow-sm">
              <img src={f.image_urls![0]} srcSet={srcSet(f.image_urls![0])} sizes="(min-width:1024px) 300px, 50vw" alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
              <div className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent ${f.price_in_image ? "h-1/4" : "h-1/2"}`} />
              <span className="absolute top-2.5 right-2.5 px-2 py-1 rounded-full bg-white/90 text-ink text-[11px] font-medium shadow">{FLAG[c] || "🌍"} {c}</span>
              {f.price_eur && <span className="absolute top-2.5 left-2.5 px-2 py-1 rounded-full bg-white text-ink text-[12px] font-semibold tabular-nums shadow">{eur(f.price_eur)}</span>}
              <button onClick={(e) => { e.preventDefault(); remove(f); }} aria-label="Remove" className="absolute bottom-3 right-3 h-9 w-9 rounded-full bg-white/90 shadow inline-flex items-center justify-center text-red-500"><Heart size={16} fill="currentColor" /></button>
              <div className="absolute inset-x-0 bottom-0 p-3 pr-14 text-white"><p className="text-[12px] opacity-90 truncate">{f.location_name || c}</p></div>
            </Link>); })}
        </div>
      </section>
      <AuthModal open={auth} onClose={() => setAuth(false)} title="Your saved homes" subtitle="Sign in to see them on any device." redirect="/saved" />
    </div>
  );
};
export default Saved;
