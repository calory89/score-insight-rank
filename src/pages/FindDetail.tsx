import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import RHNav from "@/components/realhunt/RHNav";
import { Heart, Share2, ExternalLink, Lock, ArrowLeft, Check, MapPin, Calendar } from "lucide-react";

type F = { id: string; source_account: string; post_url: string; shortcode: string; caption: string | null; image_urls: string[] | null; posted_at: string | null; location_name: string | null; country_guess: string | null; price_eur: number | null; price_raw: string | null; likes: number | null };
const db = supabase as any;
const eur = (n: number) => "€" + Math.round(n).toLocaleString("en-GB");

const FindDetail = () => {
  const { shortcode } = useParams();
  const { user } = useAuth();
  const [f, setF] = useState<F | null | undefined>(undefined);
  const [fav, setFav] = useState(false);
  const [copied, setCopied] = useState(false);
  const [idx, setIdx] = useState(0);
  const next = `/find/${shortcode}`;

  useEffect(() => {
    db.from("ig_finds").select("*").eq("shortcode", shortcode).maybeSingle().then(({ data }: any) => {
      setF(data || null);
      document.title = data ? `${data.price_eur ? eur(data.price_eur) + " · " : ""}${data.location_name || data.country_guess || "Cheap home"} · RealHunt` : "Not found · RealHunt";
    });
  }, [shortcode]);
  useEffect(() => {
    if (!user || !f) return;
    db.from("find_events").insert({ user_id: user.id, find_id: f.id, event: "view" }).then(() => {});
    db.from("find_events").select("id").eq("user_id", user.id).eq("find_id", f.id).eq("event", "favorite").limit(1).then(({ data }: any) => setFav(!!(data && data.length)));
  }, [user, f]);

  const toggleFav = async () => {
    if (!user || !f) return;
    if (fav) { setFav(false); await db.from("find_events").delete().eq("user_id", user.id).eq("find_id", f.id).eq("event", "favorite"); }
    else { setFav(true); await db.from("find_events").insert({ user_id: user.id, find_id: f.id, event: "favorite" }); }
  };
  const share = () => {
    if (!f) return;
    const url = `${location.origin}${next}`;
    const text = `${f.price_eur ? eur(f.price_eur) + " · " : ""}${f.location_name || f.country_guess || ""}\n${url}`;
    if (navigator.share) { navigator.share({ title: "RealHunt", text, url }).catch(() => {}); return; }
    navigator.clipboard?.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); });
  };
  const open = () => {
    if (!user || !f) return;
    db.from("find_events").insert({ user_id: user.id, find_id: f.id, event: "click" }).then(() => {});
    window.open(f.post_url, "_blank", "noopener");
  };

  if (f === undefined) return <div className="min-h-screen bg-paper"><RHNav /><div className="max-w-[1140px] mx-auto px-6 py-10"><div className="aspect-[4/3] md:aspect-[21/9] rounded-2xl bg-hairline/50 animate-pulse" /></div></div>;
  if (f === null) return <div className="min-h-screen bg-paper text-ink"><RHNav /><div className="max-w-[720px] mx-auto px-6 py-20"><p className="font-display text-[26px]">This one is gone.</p><Link to="/" className="underline text-ink-muted">Back to the deals</Link></div></div>;

  const imgs = f.image_urls || [];
  const cap = (f.caption || "").replace(/#\w+/g, "").trim();
  const where = [f.location_name, f.country_guess].filter(Boolean).join(", ");
  const when = f.posted_at ? new Date(f.posted_at).toLocaleDateString("en-GB", { day: "numeric", month: "long" }) : "";
  const signIn = `/auth/sign-in?redirect=${encodeURIComponent(next)}`;

  return (
    <div className="min-h-screen bg-paper text-ink pb-24 md:pb-0">
      <RHNav />
      <div className="max-w-[1140px] mx-auto md:px-6 md:pt-6">
        <Link to="/" className="hidden md:inline-flex items-center gap-2 text-[13px] text-ink-muted hover:text-ink mb-4"><ArrowLeft size={14} /> All deals</Link>

        {/* Gallery: swipe on mobile, grid on desktop */}
        <div className="md:rounded-2xl md:overflow-hidden bg-hairline/30">
          <div className="flex md:hidden overflow-x-auto snap-x snap-mandatory scrollbar-none" onScroll={(e) => { const el = e.currentTarget; setIdx(Math.round(el.scrollLeft / el.clientWidth)); }}>
            {imgs.map((u, i) => <img key={i} src={u} alt="" className="w-full aspect-[4/5] object-cover snap-start shrink-0" loading={i ? "lazy" : "eager"} />)}
          </div>
          {imgs.length > 1 && <div className="md:hidden flex justify-center gap-1.5 py-2">{imgs.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i === idx ? "w-4 bg-ink" : "w-1.5 bg-ink/30"}`} />)}</div>}
          <div className={`hidden md:grid gap-2 ${imgs.length > 1 ? "grid-cols-[2fr_1fr]" : "grid-cols-1"} max-h-[560px]`}>
            {imgs[0] && <img src={imgs[0]} alt="" className="w-full h-full object-cover max-h-[560px]" />}
            {imgs.length > 1 && <div className="grid gap-2 grid-rows-2">{imgs.slice(1, 3).map((u, i) => <img key={i} src={u} alt="" className="w-full h-full object-cover" />)}</div>}
          </div>
        </div>

        <div className="px-6 md:px-0 grid md:grid-cols-[1.4fr_1fr] gap-10 mt-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-ink-muted">Spotted by @{f.source_account}{when ? " · " + when : ""}</p>
            <h1 className="font-display text-[clamp(38px,7vw,64px)] leading-none tracking-tight mt-3 tabular-nums">{f.price_eur ? eur(f.price_eur) : f.price_raw || "Price on request"}</h1>
            {f.price_raw && f.price_eur && <p className="text-[13px] text-ink-muted mt-1">Listed as {f.price_raw}, converted approximately.</p>}
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[14px] text-ink-muted">
              {where && <span className="inline-flex items-center gap-1.5"><MapPin size={14} /> {where}</span>}
              {when && <span className="inline-flex items-center gap-1.5"><Calendar size={14} /> {when}</span>}
              {f.likes != null && <span>{f.likes.toLocaleString("en-GB")} people liked this</span>}
            </div>

            <div className="mt-8">
              <h2 className="font-display text-[20px] tracking-tight mb-3">About this home</h2>
              {user ? (
                <p className="text-[16px] leading-relaxed whitespace-pre-line">{cap || "The original post has no text. Open it to see the details."}</p>
              ) : (
                <div className="relative">
                  <p className="text-[16px] leading-relaxed">{cap.slice(0, 160)}{cap.length > 160 ? "…" : ""}</p>
                  <div className="mt-5 border border-hairline rounded-2xl bg-white p-6 flex flex-col gap-3">
                    <p className="font-display text-[20px] tracking-tight inline-flex items-center gap-2"><Lock size={18} /> Sign in to see the full listing</p>
                    <p className="text-[14px] text-ink-muted">Free account. You get the full description, the link to the original post, and you can save it. Ten seconds with Google.</p>
                    <div className="flex flex-wrap gap-3 mt-1">
                      <Link to={signIn} className="rh-btn-primary">Sign in</Link>
                      <Link to={`/auth/sign-up?redirect=${encodeURIComponent(next)}`} className="px-5 py-2.5 rounded-full border border-hairline text-[14px] hover:border-ink">Create account</Link>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {f.price_eur && (
              <div className="mt-8 border border-hairline rounded-2xl bg-white p-5 flex items-center justify-between gap-4 flex-wrap">
                <div><p className="font-display text-[17px] tracking-tight">Could you actually pay for this?</p><p className="text-[13px] text-ink-muted">Run it against your deposit and monthly budget.</p></div>
                <Link to={`/fit?d=${Math.round(f.price_eur * 0.2)}&m=800&t=36`} className="rh-btn-primary !px-5 !py-2.5 !text-[14px]">Check the fit</Link>
              </div>
            )}
          </div>

          <aside className="hidden md:block">
            <div className="sticky top-24 border border-hairline rounded-2xl bg-white p-6 flex flex-col gap-3">
              {user ? <button onClick={open} className="rh-btn-primary inline-flex items-center justify-center gap-2">Open original post <ExternalLink size={15} /></button>
                    : <Link to={signIn} className="rh-btn-primary inline-flex items-center justify-center gap-2"><Lock size={15} /> Sign in to open</Link>}
              <div className="grid grid-cols-2 gap-2">
                <button onClick={user ? toggleFav : undefined} disabled={!user} className={`h-11 rounded-xl border inline-flex items-center justify-center gap-2 text-[14px] ${fav ? "border-red-500 text-red-500" : "border-hairline hover:border-ink"} disabled:opacity-50`}><Heart size={15} fill={fav ? "currentColor" : "none"} /> {fav ? "Saved" : "Save"}</button>
                <button onClick={share} className="h-11 rounded-xl border border-hairline hover:border-ink inline-flex items-center justify-center gap-2 text-[14px]">{copied ? <Check size={15} /> : <Share2 size={15} />} {copied ? "Copied" : "Share"}</button>
              </div>
              <p className="text-[12px] text-ink-muted leading-relaxed">This listing belongs to its original poster. We link, we do not sell. Verify ownership, taxes and condition before paying anyone.</p>
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile sticky bar */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-hairline px-4 py-3 flex items-center gap-3">
        <button onClick={user ? toggleFav : undefined} disabled={!user} aria-label="Save" className={`h-11 w-11 rounded-full border inline-flex items-center justify-center ${fav ? "border-red-500 text-red-500" : "border-hairline"} disabled:opacity-50`}><Heart size={16} fill={fav ? "currentColor" : "none"} /></button>
        <button onClick={share} aria-label="Share" className="h-11 w-11 rounded-full border border-hairline inline-flex items-center justify-center">{copied ? <Check size={16} /> : <Share2 size={16} />}</button>
        {user ? <button onClick={open} className="rh-btn-primary flex-1 !py-3 inline-flex items-center justify-center gap-2">Open post <ExternalLink size={15} /></button>
              : <Link to={signIn} className="rh-btn-primary flex-1 !py-3 inline-flex items-center justify-center gap-2"><Lock size={15} /> Sign in to open</Link>}
      </div>
    </div>
  );
};
export default FindDetail;
