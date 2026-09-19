import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import ListingInfo from "@/components/realhunt/ListingInfo";
import DecisionSummary from "@/components/realhunt/DecisionSummary";
import { readSession } from "@/lib/catalog";
import { safeReturnPath } from "@/lib/auth-return";
import PhotoGallery from "@/components/realhunt/PhotoGallery";
import RHNav from "@/components/realhunt/RHNav";
import AuthModal from "@/components/realhunt/AuthModal";
import CaptureInline from "@/components/realhunt/CaptureInline";
import { Heart, Share2, ExternalLink, Lock, ArrowLeft, Check, MapPin, Calendar, Eye, MessageCircle, Phone } from "lucide-react";
import { db, eur, FLAG, norm, cleanCap, IG, track, srcSet, EBC, COSTS, totalCost, slug } from "@/lib/rh";

const loadLeaflet = () => new Promise<any>((res) => {
  if ((window as any).L) return res((window as any).L);
  const css = document.createElement("link"); css.rel = "stylesheet"; css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"; document.head.appendChild(css);
  const s = document.createElement("script"); s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"; s.onload = () => res((window as any).L); document.head.appendChild(s);
});

const FindDetail = () => {
  const { shortcode } = useParams();
  const route = useLocation();
  const backTo = safeReturnPath(route.state?.catalogUrl || readSession("rh_catalog_url", "/"));
  const { user } = useAuth();
  const [f, setF] = useState<IG | null | undefined>(undefined);
  const [fav, setFav] = useState(false);
  const [copied, setCopied] = useState(false);
  const [auth, setAuth] = useState(false);
  const [views, setViews] = useState<number | null>(null);
  const [social, setSocial] = useState<{ saves: number; asks: number } | null>(null);
  const [hist, setHist] = useState<{ price_eur: number; created_at: string }[]>([]);
  const [similar, setSimilar] = useState<IG[]>([]);
  const [want, setWant] = useState(false);
  const [wantF, setWantF] = useState({ name: "", email: "", phone: "", message: "" });
  const [wantSent, setWantSent] = useState(false);
  const [phone, setPhone] = useState<string | null | undefined>(undefined);
  const [phoneIn, setPhoneIn] = useState("");
  const mapRef = useRef<HTMLDivElement>(null);
  const next = `/find/${shortcode}#original-listing`;
  useEffect(() => { if (user && f && route.hash === "#original-listing") requestAnimationFrame(() => document.getElementById("original-listing")?.scrollIntoView({ block: "center" })); }, [user, f, route.hash]);

  useEffect(() => {
    let active = true;
    setF(undefined); setFav(false); setHist([]); setSimilar([]); setWant(false); setWantSent(false); setViews(null); setSocial(null); window.scrollTo(0, 0);
    db.from("ig_finds").select("*").eq("shortcode", shortcode).maybeSingle().then(({ data }: any) => {
      if (!active) return;
      setF(data || null);
      document.title = data ? `${data.price_eur ? eur(data.price_eur) + " · " : ""}${data.location_name || data.country_guess || "Cheap home"} · RealHunt` : "Not found · RealHunt";
      if (!data) return;
      track("find_view", { find: shortcode });
      db.rpc("find_view_counts", { codes: [shortcode] }).then(({ data: v }: any) => setViews(v && v[0] ? Number(v[0].views) : 0));
      db.rpc("find_social", { codes: [shortcode] }).then(({ data: v }: any) => v && v[0] && setSocial({ saves: Number(v[0].saves), asks: Number(v[0].asks) }));
      db.from("price_history").select("price_eur,created_at").eq("find_id", data.id).order("created_at", { ascending: true }).then(({ data: h }: any) => setHist(h || []));
      const c = data.country_guess;
      db.from("ig_finds").select("id,shortcode,image_urls,price_eur,price_in_image,location_name,country_guess,is_beach,sqm,bedrooms,caption,posted_at,likes,source_account").neq("status", "hidden").neq("id", data.id).eq("country_guess", c).order("rank_score", { ascending: false }).limit(60).then(({ data: s }: any) => {
        let l: IG[] = (s || []).filter((x: IG) => x.image_urls?.length && (x.price_eur == null || x.price_eur <= 100000));
        if (data.price_eur) { const near = l.filter((x) => x.price_eur && Math.abs(x.price_eur - data.price_eur) / data.price_eur <= 0.3); if (near.length >= 3) l = near; }
        setSimilar([...l.slice(0, 3), EBC]);
      });
    });
    return () => { active = false; };
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
    const url = `https://go.realhunt.co/find/${shortcode}`; const text = `${f.price_eur ? eur(f.price_eur) + " · " : ""}${f.location_name || f.country_guess || ""}`;
    if (navigator.share) { navigator.share({ title: "RealHunt", text, url }).catch(() => {}); return; }
    navigator.clipboard?.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); });
  };
  const open = () => {
    if (!f) return; if (!user) { track("open_gate", { find: shortcode }); setAuth(true); return; }
    db.from("find_events").insert({ user_id: user.id, find_id: f.id, event: "click" }).then(() => {}); track("open_post", { find: shortcode });
    if (f.post_url && /^https?:\/\//i.test(f.post_url)) window.open(f.post_url, "_blank", "noopener,noreferrer");
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
  const sourceName = f.source_account === "idealista" ? "Idealista" : `@${f.source_account}`;
  const when = f.posted_at ? new Date(f.posted_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "";
  const Gate = () => <button onClick={() => { track("gate_click", { find: shortcode }); setAuth(true); }} className="rh-btn-primary inline-flex items-center justify-center gap-2"><Lock size={15} /> Sign in, get all the info free</button>;

  return (
    <div className="min-h-screen bg-paper text-ink pb-10">
      <RHNav />
      <div className="max-w-[1140px] mx-auto md:px-6 md:pt-6">
        <Link to={backTo} className="inline-flex items-center gap-2 text-[13px] text-ink-muted hover:text-ink my-4 mx-4 md:mx-0 md:mt-0"><ArrowLeft size={14} /> Back to results</Link>

        <PhotoGallery key={f.shortcode} images={imgs} title={f.location_name || c} rememberKey={f.shortcode} eager />

        <div className="px-4 md:px-0 grid md:grid-cols-[minmax(0,1fr)_300px] gap-8 lg:gap-12 mt-8">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-ink-muted">{f.source_account === "idealista" ? "A RealHunt find" : <>Spotted by <Link to={`/from/${f.source_account}`} className="underline">{sourceName}</Link></>}{when ? " · " + when : ""}</p>
            <h1 className="font-display text-[clamp(38px,7vw,64px)] leading-none tracking-tight mt-3 tabular-nums">{f.price_eur ? eur(f.price_eur) : "Price in the listing"}</h1>
            <p className="text-[20px] md:text-[24px] font-medium mt-3 leading-snug">{user ? (f.location_name || c) : c}</p>
            {f.hook && <p className="text-[15px] mt-2 text-ink-muted">{f.hook}</p>}
            {f.price_raw && f.price_eur && f.price_raw !== "seen in image" && <p className="text-[13px] text-ink-muted mt-1">Listed as {f.price_raw}, converted approximately.</p>}
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[14px] text-ink-muted">
              {!user && <button onClick={() => setAuth(true)} className="inline-flex items-center gap-1.5 underline underline-offset-4"><MapPin size={14} /><Lock size={12} /> Sign in for the exact location</button>}
              {f.sqm && <span>{f.sqm} m²</span>}{f.bedrooms && <span>{f.bedrooms} {f.bedrooms === 1 ? "bedroom" : "bedrooms"}</span>}
              {when && <span className="inline-flex items-center gap-1.5"><Calendar size={14} /> {when}</span>}
              {views != null && views > 0 && <span className="inline-flex items-center gap-1.5"><Eye size={14} /> {views.toLocaleString("en-GB")} viewed this week</span>}
              {social && social.saves > 0 && <span className="inline-flex items-center gap-1.5"><Heart size={14} /> {social.saves} saved it</span>}
              {social && social.asks > 0 && <span className="inline-flex items-center gap-1.5"><MessageCircle size={14} /> {social.asks} asked about it</span>}
              {(f as any).verified && <span className="inline-flex items-center gap-1.5 text-ink font-medium">✓ Verified by RealHunt</span>}
              {((f as any).status === "sold" || (f as any).status === "reserved") && <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[12px] uppercase">{(f as any).status}</span>}
            </div>

            <DecisionSummary home={f} />

            <section className="mt-8 border-t border-hairline pt-7">
              <h2 className="font-display text-[20px] tracking-tight mb-3">About this home</h2>
              {user ? (
                <>
                  <p className="text-[16px] leading-relaxed whitespace-pre-line">{f.caption_en || cap || "The original post has no text. Open it to see the details."}</p>
                  {f.lat && <div ref={mapRef} className="mt-5 h-[260px] rounded-2xl overflow-hidden border border-hairline z-0" />}
                  {f.lat && <p className="text-[12px] text-ink-muted mt-2">Approximate area. The exact address is in the original listing.</p>}
                </>
              ) : (
                <div className="border border-hairline rounded-2xl bg-white p-6 flex flex-col gap-3">
                  <p className="font-display text-[20px] tracking-tight inline-flex items-center gap-2"><Lock size={18} /> See the full details, free</p>
                  <p className="text-[14px] text-ink-muted">Sign in for the exact location, full description and original listing.</p>
                  <div><Gate /></div>
                </div>
              )}
            </section>



            <section id="original-listing" className="mt-7 rounded-2xl border border-hairline bg-white p-5 scroll-mt-24">
              <h2 className="text-lg font-medium mb-2">See the source listing</h2>
              <p className="text-sm text-ink-muted mb-4">Check the latest details and contact the advertiser.</p>
              {user ? <button onClick={open} disabled={!f.post_url} className="rh-btn-primary inline-flex items-center gap-2 disabled:opacity-50">{f.post_url ? "Open original listing" : "Source link not available"}<ExternalLink size={15} /></button> : <Gate />}
            </section>
            <section id="contact-home" className="mt-8 border-t border-hairline pt-7 scroll-mt-24">
              <h2 className="font-display text-[22px] mb-4">Interested in this home?</h2>
              <div className="md:hidden mb-5">{user ? <button onClick={open} className="rh-btn-primary inline-flex items-center gap-2">Open listing <ExternalLink size={15} /></button> : <button onClick={() => setAuth(true)} className="rh-btn-primary inline-flex items-center gap-2"><Lock size={15} /> Get all the info, free</button>}<div className="flex gap-4 mt-4"><button onClick={toggleFav} className="text-[14px] inline-flex items-center gap-1.5"><Heart size={16} fill={fav ? "currentColor" : "none"} />{fav ? "Saved" : "Save"}</button><button onClick={share} className="text-[14px] inline-flex items-center gap-1.5"><Share2 size={16} />{copied ? "Copied" : "Share"}</button></div></div>
              {wantSent ? <p className="inline-flex items-center gap-2 text-[15px]"><Check size={18} /> Got it. A person replies within 24 hours with the next step.</p> : !want ? (
                <div className="flex items-center justify-between gap-4 flex-wrap"><div><p className="font-display text-[18px] tracking-tight">I want this one</p><p className="text-[13px] text-ink-muted">We check it is still available, contact the seller and tell you what it really costs to buy as a foreigner.</p></div><button onClick={() => { setWant(true); track("want_open", { find: shortcode }); }} className="rh-btn-tertiary !px-5 !py-2.5 !text-[14px]">Ask about this home</button></div>
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
            </section>

            <details className="mt-7 border-t border-hairline pt-5">
              <summary className="cursor-pointer text-[15px] font-medium">Buying costs & affordability</summary>
            {hist.length > 1 && <div className="mt-6 text-[13px] text-ink-muted">Price history: {hist.map((h, i) => <span key={i}>{i > 0 && " → "}{eur(h.price_eur)} <span className="opacity-70">({new Date(h.created_at).toLocaleDateString("en-GB", { month: "short", year: "2-digit" })})</span></span>)}{hist[hist.length - 1].price_eur < Math.max(...hist.map((h) => h.price_eur)) && <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">Price drop</span>}</div>}

            {f.price_eur && COSTS[c] && (
              <div className="mt-6 border border-hairline rounded-2xl bg-white p-5">
                <div className="flex items-baseline justify-between gap-4 flex-wrap"><p className="font-display text-[17px] tracking-tight">What it really costs to buy</p><p className="font-display text-[26px] tabular-nums">~{eur(totalCost(f.price_eur, c)!)}</p></div>
                <p className="text-[13px] text-ink-muted mt-1">Price {eur(f.price_eur)} + about {COSTS[c].pct}% taxes and fees{COSTS[c].fixed ? ` + ${eur(COSTS[c].fixed)} notary and registry` : ""}. {COSTS[c].note} Estimate for a foreign buyer, before any renovation. <Link to={`/guide/${slug(c)}`} className="underline text-ink">How to buy in {c} as a foreigner</Link></p>
              </div>
            )}

            {f.price_eur && (
              <div className="mt-6 border border-hairline rounded-2xl bg-white p-5 flex items-center justify-between gap-4 flex-wrap">
                <div><p className="font-display text-[17px] tracking-tight">Could you actually pay for this?</p><p className="text-[13px] text-ink-muted">Run it against your deposit and monthly budget.</p></div>
                <Link to={`/fit?d=${Math.round(f.price_eur * 0.2)}&m=800&t=36`} className="rh-btn-primary !px-5 !py-2.5 !text-[14px]">Check the fit</Link>
              </div>
            )}

            </details>
            <details className="mt-5 border-t border-hairline pt-5">
              <summary className="cursor-pointer text-[15px] font-medium">Get updates about homes like this</summary>
            {user && phone === null && (
              <form onSubmit={savePhone} className="mt-6 border border-hairline rounded-2xl bg-white p-5 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1"><p className="font-display text-[17px] tracking-tight inline-flex items-center gap-2"><MessageCircle size={16} /> Get a WhatsApp when this drops in price or a similar one appears</p><p className="text-[13px] text-ink-muted">Optional. We do not call unless you ask us to.</p></div>
                <div className="flex gap-2"><input type="tel" value={phoneIn} onChange={(e) => setPhoneIn(e.target.value)} placeholder="+34 6…" className="w-40 border border-hairline rounded-full px-4 py-2.5 text-[14px] bg-paper outline-none focus:border-ink" /><button className="rh-btn-primary !px-4 !py-2.5 !text-[14px]">Add</button></div>
              </form>
            )}
              <div className="mt-4"><CaptureInline source="find_page" title="More like this one" subtitle="Get the best homes we find in your inbox." cta="Send me the top 10" /></div>
            </details>

            <p className="mt-6 text-[12px] text-ink-muted leading-relaxed">{f.source_account !== "idealista" && <>Published by {sourceName}{when ? ` on ${when}` : ""}. </>}Price as shown in the source listing; it may have changed or sold. RealHunt links to listings, it does not sell them. Verify ownership, taxes and condition before paying anyone.</p>
          </div>

          <aside className="hidden md:block">
            <div className="sticky top-24 border border-hairline rounded-2xl bg-white p-6 flex flex-col gap-3">
              <p className="text-[13px] text-ink-muted">Take the next step</p>
              {user ? <button onClick={open} className="rh-btn-primary inline-flex items-center justify-center gap-2">Open original listing <ExternalLink size={15} /></button> : <Gate />}
              <a href="#contact-home" className="text-center text-[13px] underline underline-offset-4 py-2">Ask about this home</a>
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {similar.map((s) => { const sc = norm(s.country_guess); return (
                <Link key={s.id} to={s.id === "ebc" ? "/ecobeachcity" : `/find/${s.shortcode}`} onClick={() => track("similar_click", { find: s.shortcode })} className="group block rounded-2xl overflow-hidden bg-white border border-hairline hover:shadow-md transition-shadow">
                  <img src={s.image_urls![0]} srcSet={srcSet(s.image_urls![0])} sizes="(min-width:768px) 25vw, 50vw" alt={s.location_name || sc} loading="lazy" className="w-full aspect-[4/3] object-cover" />
                  <ListingInfo home={s} />
                </Link>); })}
            </div>
          </div>
        )}
      </div>

      <AuthModal open={auth} onClose={() => setAuth(false)} redirect={next} find={shortcode} />
    </div>
  );
};
export default FindDetail;
