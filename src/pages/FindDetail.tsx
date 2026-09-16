import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import RHNav from "@/components/realhunt/RHNav";
import AuthModal from "@/components/realhunt/AuthModal";
import { Heart, Share2, ExternalLink, Lock, ArrowLeft, Check, MapPin, Calendar, Eye, MessageCircle, Phone } from "lucide-react";
import { db, eur, FLAG, norm, cleanCap, IG, track, srcSet, EBC } from "@/lib/rh";

const loadLeaflet = () => new Promise<any>((res) => {
  if ((window as any).L) return res((window as any).L);
  const css = document.createElement("link"); css.rel = "stylesheet"; css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"; document.head.appendChild(css);
  const s = document.createElement("script"); s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"; s.onload = () => res((window as any).L); document.head.appendChild(s);
});

const FindDetail = () => {
  const { shortcode } = useParams();
  const { user } = useAuth();
  const [f, setF] = useState<IG | null | undefined>(undefined);
  const [fav, setFav] = useState(false);
  const [copied, setCopied] = useState(false);
  const [idx, setIdx] = useState(0);
  const [auth, setAuth] = useState(false);
  const [views, setViews] = useState<number | null>(null);
  const [similar, setSimilar] = useState<IG[]>([]);
  const [want, setWant] = useState(false);
  const [wantF, setWantF] = useState({ name: "", email: "", phone: "", message: "" });
  const [wantSent, setWantSent] = useState(false);
  const [phone, setPhone] = useState<string | null | undefined>(undefined);
  const [phoneIn, setPhoneIn] = useState("");
  const mapRef = useRef<HTMLDivElement>(null);
  const next = `/find/${shortcode}`;

  useEffect(() => {
    setF(undefined); setIdx(0); window.scrollTo(0, 0);
    db.from("ig_finds").select("*").eq("shortcode", shortcode).maybeSingle().then(({ data }: any) => {
      setF(data || null);
      document.title = data ? `${data.price_eur ? eur(data.price_eur) + " · " : ""}${data.location_name || data.country_guess || "Cheap home"} · RealHunt` : "Not found · RealHunt";
      if (!data) return;
      track("find_view", { find: shortcode });
      db.rpc("find_view_counts", { codes: [shortcode] }).then(({ data: v }: any) => setViews(v && v[0] ? Number(v[0].views) : 0));
      const c = data.country_guess;
      db.from("ig_finds").select("id,shortcode,image_urls,price_eur,price_in_image,location_name,country_guess,is_beach,caption,posted_at,likes,source_account").neq("status", "hidden").neq("id", data.id).eq("country_guess", c).order("rank_score", { ascending: false }).limit(60).then(({ data: s }: any) => {
        let l: IG[] = (s || []).filter((x: IG) => x.image_urls?.length && (x.price_eur == null || x.price_eur <= 100000));
        if (data.price_eur) { const near = l.filter((x) => x.price_eur && Math.abs(x.price_eur - data.price_eur) / data.price_eur <= 0.3); if (near.length >= 3) l = near; }
        setSimilar([...l.slice(0, 3), EBC]);
      });
    });
  }, [shortcode]);
  useEffect(() => {
    if (!user || !f) return;
    db.from("find_events").insert({ user_id: user.id, find_id: f.id, event: "view" }).then(() => {});
    db.from("find_events").select("id").eq("user_id", user.id).eq("find_id", f.id).eq("event", "favorite").limit(1).then(({ data }: any) => setFav(!!(data && data.length)));
    db.from("profiles").select("phone").eq("user_id", user.id).maybeSingle().then(({ data }: any) => setPhone(data?.phone ?? null));
  }, [user, f]);
  useEffect(() => {
    if (!user || !f || !f.lat || !mapRef.current) return;
    let map: any;
    loadLeaflet().then((L) => { if (!mapRef.current) return; map = L.map(mapRef.current, { scrollWheelZoom: false }).setView([f.lat, f.lng], 9); L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap" }).addTo(map); L.circle([f.lat, f.lng], { radius: 3000, color: "#0ea5e9", fillOpacity: 0.2 }).addTo(map); });
    return () => { try { map && map.remove(); } catch {} };
  }, [user, f]);

  const toggleFav = async () => {
    if (!f) return; if (!user) { setAuth(true); return; }
    if (fav) { setFav(false); await db.from("find_events").delete().eq("user_id", user.id).eq("find_id", f.id).eq("event", "favorite"); }
    else { setFav(true); await db.from("find_events").insert({ user_id: user.id, find_id: f.id, event: "favorite" }); track("favorite", { find: shortcode }); }
  };
  const share = () => {
    if (!f) return; track("share", { find: shortcode });
    const url = `${location.origin}${next}`; const text = `${f.price_eur ? eur(f.price_eur) + " · " : ""}${f.location_name || f.country_guess || ""}\n${url}`;
    if (navigator.share) { navigator.share({ title: "RealHunt", text, url }).catch(() => {}); return; }
    navigator.clipboard?.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); });
  };
  const open = () => {
    if (!f) return; if (!user) { track("open_gate", { find: shortcode }); setAuth(true); return; }
    db.from("find_events").insert({ user_id: user.id, find_id: f.id, event: "click" }).then(() => {}); track("open_post", { find: shortcode });
    window.open(f.post_url, "_blank", "noopener");
  };
  const sendWant = async (e: React.FormEvent) => {
    e.preventDefault(); if (!f) return; const em = user?.email || wantF.email; if (!/.+@.+\..+/.test(em)) return;
    setWantSent(true); track("want_this", { find: shortcode });
    try { await db.from("home_requests").insert({ user_id: user?.id || null, find_id: f.id, find_shortcode: f.shortcode, name: wantF.name, email: em, phone: wantF.phone, message: wantF.message }); } catch {}
  };
  const savePhone = async (e: React.FormEvent) => { e.preventDefault(); if (!user || !phoneIn) return; setPhone(phoneIn); track("phone_added"); try { await db.from("profiles").update({ phone: phoneIn }).eq("user_id", user.id); } catch {} };

  if (f === undefined) return <div className="min-h-screen bg-paper"><RHNav /><div className="max-w-[1140px] mx-auto px-6 py-10"><div className="aspect-[4/3] md:aspect-[21/9] rounded-2xl bg-hairline/50 animate-pulse" /></div></div>;
  if (f === null) return <div className="min-h-screen bg-paper text-ink"><RHNav /><div className="max-w-[720px] mx-auto px-6 py-20"><p className="font-display text-[26px]">This one is gone.</p><Link to="/" className="underline text-ink-muted">Back to the deals</Link></div></div>;

  const imgs = f.image_urls || [];
  const cap = cleanCap(f.caption);
  const c = norm(f.country_guess);
  const when = f.posted_at ? new Date(f.posted_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "";
  const Gate = () => <button onClick={() => { track("gate_click", { find: shortcode }); setAuth(true); }} className="rh-btn-primary inline-flex items-center justify-center gap-2"><Lock size={15} /> Sign in, get all the info free</button>;

  return (
    <div className="min-h-screen bg-paper text-ink pb-24 md:pb-0">
      <RHNav />
      <div className="max-w-[1140px] mx-auto md:px-6 md:pt-6">
        <Link to="/" className="hidden md:inline-flex items-center gap-2 text-[13px] text-ink-muted hover:text-ink mb-4"><ArrowLeft size={14} /> All deals</Link>

        <div className="md:rounded-2xl md:overflow-hidden bg-hairline/30">
          <div className="flex md:hidden overflow-x-auto snap-x snap-mandatory scrollbar-none" onScroll={(e) => { const el = e.currentTarget; setIdx(Math.round(el.scrollLeft / el.clientWidth)); }}>
            {imgs.map((u, i) => <img key={i} src={u} srcSet={srcSet(u)} sizes="100vw" alt="" className="w-full aspect-[4/5] object-cover snap-start shrink-0" loading={i ? "lazy" : "eager"} />)}
          </div>
          {imgs.length > 1 && <div className="md:hidden flex justify-center gap-1.5 py-2">{imgs.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i === idx ? "w-4 bg-ink" : "w-1.5 bg-ink/30"}`} />)}</div>}
          <div className={`hidden md:grid gap-2 ${imgs.length > 1 ? "grid-cols-[2fr_1fr]" : "grid-cols-1"} max-h-[560px]`}>
            {imgs[0] && <img src={imgs[0]} alt="" className="w-full h-full object-cover max-h-[560px]" />}
            {imgs.length > 1 && <div className="grid gap-2 grid-rows-2">{imgs.slice(1, 3).map((u, i) => <img key={i} src={u} alt="" className="w-full h-full object-cover" />)}</div>}
          </div>
        </div>

        <div className="px-4 md:px-0 grid md:grid-cols-[1.4fr_1fr] gap-10 mt-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-ink-muted">Spotted by <Link to={`/from/${f.source_account}`} className="underline">@{f.source_account}</Link>{when ? " · " + when : ""}</p>
            <h1 className="font-display text-[clamp(38px,7vw,64px)] leading-none tracking-tight mt-3 tabular-nums">{f.price_eur ? eur(f.price_eur) : "Price in the listing"}</h1>
            {f.hook && <p className="text-[17px] mt-3 text-ink">{f.hook}</p>}
            {f.price_raw && f.price_eur && f.price_raw !== "seen in image" && <p className="text-[13px] text-ink-muted mt-1">Listed as {f.price_raw}, converted approximately.</p>}
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[14px] text-ink-muted">
              <span className="inline-flex items-center gap-1.5"><MapPin size={14} /> {FLAG[c]} {user ? (f.location_name || c) : c}{!user && <Lock size={12} className="ml-1" />}</span>
              {f.sqm && <span>{f.sqm} m²</span>}{f.bedrooms && <span>{f.bedrooms} bedrooms</span>}
              {when && <span className="inline-flex items-center gap-1.5"><Calendar size={14} /> {when}</span>}
              {views != null && views > 0 && <span className="inline-flex items-center gap-1.5"><Eye size={14} /> {views.toLocaleString("en-GB")} viewed this week</span>}
            </div>

            <div className="mt-8">
              <h2 className="font-display text-[20px] tracking-tight mb-3">About this home</h2>
              {user ? (
                <>
                  <p className="text-[16px] leading-relaxed whitespace-pre-line">{f.caption_en || cap || "The original post has no text. Open it to see the details."}</p>
                  {f.lat && <div ref={mapRef} className="mt-5 h-[260px] rounded-2xl overflow-hidden border border-hairline z-0" />}
                  {f.lat && <p className="text-[12px] text-ink-muted mt-2">Approximate area. The exact address is in the original listing.</p>}
                </>
              ) : (
                <div className="border border-hairline rounded-2xl bg-white p-6 flex flex-col gap-3">
                  <p className="font-display text-[20px] tracking-tight inline-flex items-center gap-2"><Lock size={18} /> Sign in and we send you everything about this home, free, to your email</p>
                  <p className="text-[14px] text-ink-muted">Exact location, map, full description, the original listing and what it really costs to buy as a foreigner. Ten seconds with Google or an email link.</p>
                  <div><Gate /></div>
                </div>
              )}
            </div>

            {user && phone === null && (
              <form onSubmit={savePhone} className="mt-6 border border-hairline rounded-2xl bg-white p-5 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1"><p className="font-display text-[17px] tracking-tight inline-flex items-center gap-2"><MessageCircle size={16} /> Get a WhatsApp when this drops in price or a similar one appears</p><p className="text-[13px] text-ink-muted">Optional. We do not call unless you ask us to.</p></div>
                <div className="flex gap-2"><input type="tel" value={phoneIn} onChange={(e) => setPhoneIn(e.target.value)} placeholder="+34 6…" className="w-40 border border-hairline rounded-full px-4 py-2.5 text-[14px] bg-paper outline-none focus:border-ink" /><button className="rh-btn-primary !px-4 !py-2.5 !text-[14px]">Add</button></div>
              </form>
            )}

            <div className="mt-8 border border-hairline rounded-2xl bg-white p-5">
              {wantSent ? <p className="inline-flex items-center gap-2 text-[15px]"><Check size={18} /> Got it. A person replies within 24 hours with the next step.</p> : !want ? (
                <div className="flex items-center justify-between gap-4 flex-wrap"><div><p className="font-display text-[18px] tracking-tight">I want this one</p><p className="text-[13px] text-ink-muted">We check it is still available, contact the seller and tell you what it really costs to buy as a foreigner.</p></div><button onClick={() => { setWant(true); track("want_open", { find: shortcode }); }} className="rh-btn-primary !px-5 !py-2.5 !text-[14px]">Ask about this home</button></div>
              ) : (
                <form onSubmit={sendWant} className="flex flex-col gap-2">
                  <p className="font-display text-[18px] tracking-tight">Tell us how to reach you</p>
                  <div className="grid sm:grid-cols-2 gap-2">
                    <input required value={wantF.name} onChange={(e) => setWantF({ ...wantF, name: e.target.value })} placeholder="Name" className="border border-hairline rounded-full px-4 py-3 text-[15px] bg-paper outline-none focus:border-ink" />
                    {!user && <input required type="email" value={wantF.email} onChange={(e) => setWantF({ ...wantF, email: e.target.value })} placeholder="Email" className="border border-hairline rounded-full px-4 py-3 text-[15px] bg-paper outline-none focus:border-ink" />}
                    <input type="tel" value={wantF.phone} onChange={(e) => setWantF({ ...wantF, phone: e.target.value })} placeholder="WhatsApp, optional but faster" className="border border-hairline rounded-full px-4 py-3 text-[15px] bg-paper outline-none focus:border-ink" />
                  </div>
                  <textarea value={wantF.message} onChange={(e) => setWantF({ ...wantF, message: e.target.value })} rows={2} placeholder="Budget, timing, anything we should know" className="border border-hairline rounded-2xl px-4 py-3 text-[15px] bg-paper outline-none focus:border-ink resize-none" />
                  <button className="rh-btn-primary self-start inline-flex items-center gap-2"><Phone size={15} /> Send</button>
                </form>
              )}
            </div>

            {f.price_eur && (
              <div className="mt-6 border border-hairline rounded-2xl bg-white p-5 flex items-center justify-between gap-4 flex-wrap">
                <div><p className="font-display text-[17px] tracking-tight">Could you actually pay for this?</p><p className="text-[13px] text-ink-muted">Run it against your deposit and monthly budget.</p></div>
                <Link to={`/fit?d=${Math.round(f.price_eur * 0.2)}&m=800&t=36`} className="rh-btn-primary !px-5 !py-2.5 !text-[14px]">Check the fit</Link>
              </div>
            )}

            <p className="mt-6 text-[12px] text-ink-muted leading-relaxed">Published by @{f.source_account}{when ? ` on ${when}` : ""}. Price as shown that day, it may have changed or sold. RealHunt links to listings, it does not sell them. Verify ownership, taxes and condition before paying anyone.</p>
          </div>

          <aside className="hidden md:block">
            <div className="sticky top-24 border border-hairline rounded-2xl bg-white p-6 flex flex-col gap-3">
              {user ? <button onClick={open} className="rh-btn-primary inline-flex items-center justify-center gap-2">Open original listing <ExternalLink size={15} /></button> : <Gate />}
              <div className="grid grid-cols-2 gap-2">
                <button onClick={toggleFav} className={`h-11 rounded-xl border inline-flex items-center justify-center gap-2 text-[14px] ${fav ? "border-red-500 text-red-500" : "border-hairline hover:border-ink"}`}><Heart size={15} fill={fav ? "currentColor" : "none"} /> {fav ? "Saved" : "Save"}</button>
                <button onClick={share} className="h-11 rounded-xl border border-hairline hover:border-ink inline-flex items-center justify-center gap-2 text-[14px]">{copied ? <Check size={15} /> : <Share2 size={15} />} {copied ? "Copied" : "Share"}</button>
              </div>
            </div>
          </aside>
        </div>

        {similar.length > 0 && (
          <div className="px-4 md:px-0 mt-12 mb-10">
            <h2 className="font-display text-[22px] tracking-tight mb-4">Similar homes</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
              {similar.map((s) => { const sc = norm(s.country_guess); return (
                <Link key={s.id} to={s.id === "ebc" ? "/ecobeachcity" : `/find/${s.shortcode}`} onClick={() => track("similar_click", { find: s.shortcode })} className="group relative block rounded-2xl overflow-hidden bg-hairline/30 aspect-[4/5]">
                  <img src={s.image_urls![0]} srcSet={srcSet(s.image_urls![0])} sizes="(min-width:768px) 25vw, 50vw" alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500" />
                  <div className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent ${s.price_in_image ? "h-1/4" : "h-1/2"}`} />
                  <span className="absolute top-2.5 right-2.5 px-2 py-1 rounded-full bg-white/90 text-ink text-[11px] font-medium shadow">{FLAG[sc] || "🌍"} {sc}</span>
                  <div className="absolute inset-x-0 bottom-0 p-3 text-white">{s.price_eur && !s.price_in_image && <p className="font-display text-[22px] leading-none tabular-nums">{eur(s.price_eur)}</p>}<p className="text-[12px] mt-1 opacity-90 truncate">{s.location_name || sc}</p></div>
                </Link>); })}
            </div>
          </div>
        )}
      </div>

      <div className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-hairline px-4 py-3 flex items-center gap-3">
        <button onClick={toggleFav} aria-label="Save" className={`h-11 w-11 rounded-full border inline-flex items-center justify-center ${fav ? "border-red-500 text-red-500" : "border-hairline"}`}><Heart size={16} fill={fav ? "currentColor" : "none"} /></button>
        <button onClick={share} aria-label="Share" className="h-11 w-11 rounded-full border border-hairline inline-flex items-center justify-center">{copied ? <Check size={16} /> : <Share2 size={16} />}</button>
        {user ? <button onClick={open} className="rh-btn-primary flex-1 !py-3 inline-flex items-center justify-center gap-2">Open listing <ExternalLink size={15} /></button> : <button onClick={() => setAuth(true)} className="rh-btn-primary flex-1 !py-3 inline-flex items-center justify-center gap-2"><Lock size={15} /> Get all the info, free</button>}
      </div>
      <AuthModal open={auth} onClose={() => setAuth(false)} redirect={next} find={shortcode} />
    </div>
  );
};
export default FindDetail;
