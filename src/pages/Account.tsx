import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import ListingInfo from "@/components/realhunt/ListingInfo";
import RHNav from "@/components/realhunt/RHNav";
import AuthModal from "@/components/realhunt/AuthModal";
import { Heart, Bell, MessageSquare, User, LogOut, Check, Trash2, Share2, Gift, Columns, LayoutDashboard, Sparkles, Clock, ChevronRight, Map } from "lucide-react";
import { db, eur, FLAG, norm, IG, srcSet, track, MAX_PRICE } from "@/lib/rh";

const TABS = [["home", "Overview", LayoutDashboard], ["saved", "Saved homes", Heart], ["alerts", "Alerts", Bell], ["requests", "My requests", MessageSquare], ["profile", "Profile", User]] as const;
const COUNTRIES = ["Any", "Italy", "Spain", "Portugal", "France", "Greece", "Japan", "Sweden", "Norway", "Denmark", "Finland", "Indonesia"];

// small photo card reused across the overview
const Card = ({ f, badge }: { f: IG; badge?: string }) => { const c = norm(f.country_guess); return (
  <Link to={`/find/${f.shortcode}`} className="group block rounded-2xl overflow-hidden bg-white border border-hairline hover:shadow-md transition-shadow">
    <div className="relative aspect-[4/3]"><img src={f.image_urls![0]} srcSet={srcSet(f.image_urls![0])} sizes="(min-width:768px) 22vw, 50vw" alt={f.location_name || c} loading="lazy" className="w-full h-full object-cover" />{badge && <span className="absolute top-3 left-3 px-2 py-1 rounded-full bg-white/95 text-ink text-[11px]">{badge}</span>}</div>
    <ListingInfo home={f} />
  </Link>); };

const Account = () => {
  const { tab = "home" } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [auth, setAuth] = useState(false);
  const [p, setP] = useState<any>(null);
  const [saved, setSaved] = useState<IG[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [reqs, setReqs] = useState<any[]>([]);
  const [fresh, setFresh] = useState<IG[]>([]);
  const [recent, setRecent] = useState<IG[]>([]);
  const [ok, setOk] = useState(false);
  const [na, setNa] = useState({ country: "Any", max: 50000, beach: false });
  const [sel, setSel] = useState<string[]>([]);
  const [copied, setCopied] = useState("");
  const copy = (t: string, k: string) => { navigator.clipboard?.writeText(t).then(() => { setCopied(k); setTimeout(() => setCopied(""), 1600); }); };

  useEffect(() => { document.title = "Your account · RealHunt"; }, []);
  useEffect(() => {
    if (!user) { setAuth(true); return; }
    setAuth(false);
    db.from("profiles").select("email,username,phone,interest_country,budget_max,referral_code,saved_public").eq("user_id", user.id).maybeSingle().then(({ data }: any) => {
      const prof = data || { email: user.email }; setP(prof);
      // new this week, matching what they told us
      let q = db.from("ig_finds").select("id,shortcode,image_urls,price_eur,price_in_image,location_name,country_guess,sqm,bedrooms,is_beach,hook,posted_at,created_at").eq("status", "new").not("image_urls", "is", null).gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()).order("created_at", { ascending: false }).limit(8);
      if (prof.interest_country && prof.interest_country !== "Any") q = q.eq("country_guess", prof.interest_country);
      if (prof.budget_max) q = q.or(`price_eur.lte.${prof.budget_max},price_eur.is.null`);
      q.then(({ data }: any) => setFresh(data || []));
    });
    db.from("find_events").select("created_at, ig_finds(id,shortcode,image_urls,price_eur,price_in_image,location_name,country_guess,sqm,bedrooms,is_beach,hook)").eq("user_id", user.id).eq("event", "favorite").order("created_at", { ascending: false }).then(({ data }: any) => setSaved((data || []).map((r: any) => r.ig_finds).filter(Boolean)));
    db.from("find_events").select("created_at, find_id, ig_finds(id,shortcode,image_urls,price_eur,price_in_image,location_name,country_guess,sqm,bedrooms,is_beach,hook)").eq("user_id", user.id).in("event", ["click", "view"]).order("created_at", { ascending: false }).limit(30).then(({ data }: any) => { const seen = new Set<string>(); const out: IG[] = []; (data || []).forEach((r: any) => { if (r.ig_finds && !seen.has(r.ig_finds.id)) { seen.add(r.ig_finds.id); out.push(r.ig_finds); } }); setRecent(out.slice(0, 8)); });
    db.from("alerts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).then(({ data }: any) => setAlerts(data || []));
    db.from("home_requests").select("id,created_at,message,find_shortcode,ig_finds(location_name,country_guess,price_eur,hook)").eq("user_id", user.id).order("created_at", { ascending: false }).then(({ data }: any) => setReqs(data || []));
  }, [user]);

  const save = async (e: React.FormEvent) => { e.preventDefault(); if (!user) return; await db.from("profiles").update({ username: p.username, phone: p.phone, interest_country: p.interest_country, budget_max: p.budget_max, onboarded: true }).eq("user_id", user.id); setOk(true); setTimeout(() => setOk(false), 1800); track("profile_saved"); };
  const signOut = async () => { track("sign_out"); await supabase.auth.signOut(); nav("/"); };
  const addAlert = async (e: React.FormEvent) => { e.preventDefault(); if (!user) return; const row = { email: p?.email || user.email, country: na.country === "Any" ? null : na.country, max_price: na.max, beach: na.beach, user_id: user.id }; const { data } = await db.from("alerts").insert(row).select().single(); setAlerts([data, ...alerts]); track("alert"); };
  const delAlert = async (id: string) => { setAlerts(alerts.filter((a) => a.id !== id)); await db.from("alerts").delete().eq("id", id); };
  const unsave = async (f: IG) => { if (!user) return; setSaved(saved.filter((x) => x.id !== f.id)); await db.from("find_events").delete().eq("user_id", user.id).eq("find_id", f.id).eq("event", "favorite"); };
  const inp = "border border-hairline rounded-full px-4 py-3 text-[15px] bg-paper outline-none focus:border-ink";
  const savedIds = new Set(saved.map((s) => s.id));
  const cheapestSaved = saved.filter((s) => s.price_eur).sort((a, b) => a.price_eur! - b.price_eur!)[0];

  return (
    <div className="min-h-screen bg-paper text-ink">
      <RHNav />
      <section className="max-w-[1140px] mx-auto px-4 md:px-6 pt-8 md:pt-12 pb-16 grid md:grid-cols-[220px_1fr] gap-8">
        <aside>
          <div className="flex items-center gap-3 mb-6"><span className="h-11 w-11 rounded-full bg-ink text-paper inline-flex items-center justify-center font-display text-[18px]">{(p?.username || user?.email || "?").slice(0, 1).toUpperCase()}</span><div className="min-w-0"><p className="font-medium truncate">{p?.username || "Your account"}</p><p className="text-[12px] text-ink-muted truncate">{user?.email}</p></div></div>
          <nav className="flex md:flex-col gap-1 overflow-x-auto scrollbar-none">
            {TABS.map(([k, l, I]) => <Link key={k} to={`/account/${k}`} className={`shrink-0 inline-flex items-center gap-2 px-3 py-2.5 rounded-xl text-[14px] ${tab === k ? "bg-white border border-hairline" : "text-ink-muted hover:text-ink"}`}><I size={15} /> {l}{k === "saved" && saved.length > 0 && <span className="ml-auto text-[11px] text-ink-muted tabular-nums">{saved.length}</span>}</Link>)}
            <button onClick={signOut} className="shrink-0 inline-flex items-center gap-2 px-3 py-2.5 rounded-xl text-[14px] text-ink-muted hover:text-ink text-left"><LogOut size={15} /> Sign out</button>
          </nav>
        </aside>

        <div>
          {!user && <p className="text-ink-muted">Sign in to see your account. <button onClick={() => setAuth(true)} className="underline text-ink">Sign in</button></p>}

          {user && tab === "home" && (
            <div className="flex flex-col gap-8">
              <div>
                <h1 className="font-display text-[30px] tracking-tight">{p?.username ? `Hi ${p.username.split(" ")[0]}.` : "Your homes."}</h1>
                <p className="text-[14px] text-ink-muted mt-1">{p?.interest_country && p.interest_country !== "Any" ? `Watching ${p.interest_country} under ${eur(p.budget_max || MAX_PRICE)}.` : `Watching everywhere under ${eur(p?.budget_max || MAX_PRICE)}.`} <Link to="/account/profile" className="underline">Change</Link></p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[[saved.length, "saved", "/account/saved"], [alerts.length, alerts.length === 1 ? "alert" : "alerts", "/account/alerts"], [reqs.length, reqs.length === 1 ? "request" : "requests", "/account/requests"]].map(([n, t, to]: any) => <Link key={t} to={to} className="border border-hairline rounded-2xl bg-white p-4 hover:border-ink"><p className="font-display text-[28px] leading-none tabular-nums">{n}</p><p className="text-[12px] text-ink-muted mt-1.5">{t}</p></Link>)}
              </div>

              <div>
                <div className="flex items-center justify-between mb-3"><h2 className="font-display text-[20px] tracking-tight inline-flex items-center gap-2"><Sparkles size={17} /> New this week for you</h2><Link to="/" className="text-[13px] underline text-ink-muted hover:text-ink">All homes</Link></div>
                {fresh.length === 0 ? <div className="border border-hairline rounded-2xl bg-white p-6 text-[14px] text-ink-muted">Nothing new in your filter this week. <Link to="/account/alerts" className="underline text-ink">Set an alert</Link> and we email you the moment one lands.</div> : <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">{fresh.slice(0, 8).map((f) => <Card key={f.id} f={f} badge={savedIds.has(f.id) ? "saved" : undefined} />)}</div>}
              </div>

              {saved.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3"><h2 className="font-display text-[20px] tracking-tight inline-flex items-center gap-2"><Heart size={17} /> Your saved homes</h2><Link to="/account/saved" className="text-[13px] underline text-ink-muted hover:text-ink inline-flex items-center gap-1">All {saved.length} <ChevronRight size={13} /></Link></div>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">{saved.slice(0, 4).map((f) => <Card key={f.id} f={f} />)}</div>
                  {cheapestSaved && <p className="text-[13px] text-ink-muted mt-3">Cheapest on your list: <Link to={`/find/${cheapestSaved.shortcode}`} className="underline text-ink">{eur(cheapestSaved.price_eur!)} in {norm(cheapestSaved.country_guess)}</Link>. {saved.length >= 2 && <Link to="/account/saved" className="underline">Compare them side by side.</Link>}</p>}
                </div>
              )}

              {recent.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3"><h2 className="font-display text-[20px] tracking-tight inline-flex items-center gap-2"><Clock size={17} /> Recently viewed</h2></div>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">{recent.slice(0, 4).map((f) => <Card key={f.id} f={f} badge={savedIds.has(f.id) ? "saved" : undefined} />)}</div>
                </div>
              )}

              <div className="grid sm:grid-cols-3 gap-3">
                <Link to="/map" className="border border-hairline rounded-2xl bg-white p-5 hover:border-ink flex items-center justify-between"><span className="inline-flex items-center gap-3"><Map size={18} /> <span><b>Map</b><br /><span className="text-[13px] text-ink-muted">every home by place</span></span></span><ChevronRight size={16} /></Link>
                <Link to="/swipe" className="border border-hairline rounded-2xl bg-white p-5 hover:border-ink flex items-center justify-between"><span className="inline-flex items-center gap-3"><Heart size={18} /> <span><b>Swipe</b><br /><span className="text-[13px] text-ink-muted">save fast, one by one</span></span></span><ChevronRight size={16} /></Link>
                <Link to="/fit" className="border border-hairline rounded-2xl bg-white p-5 hover:border-ink flex items-center justify-between"><span className="inline-flex items-center gap-3"><Columns size={18} /> <span><b>Can I afford it?</b><br /><span className="text-[13px] text-ink-muted">real cost by country</span></span></span><ChevronRight size={16} /></Link>
              </div>
            </div>
          )}

          {user && tab === "profile" && p && (
            <form onSubmit={save} className="flex flex-col gap-3 max-w-[520px]">
              <h1 className="font-display text-[30px] tracking-tight">Profile</h1>
              <p className="text-[14px] text-ink-muted -mt-1">Tell us what you are looking for and we send you only that.</p>
              <label className="text-[12px] text-ink-muted">Name<input value={p.username || ""} onChange={(e) => setP({ ...p, username: e.target.value })} className={inp + " w-full mt-1"} placeholder="Your name" /></label>
              <label className="text-[12px] text-ink-muted">Email<input value={p.email || user.email || ""} disabled className={inp + " w-full mt-1 opacity-60"} /></label>
              <label className="text-[12px] text-ink-muted">WhatsApp, optional<input value={p.phone || ""} onChange={(e) => setP({ ...p, phone: e.target.value })} className={inp + " w-full mt-1"} placeholder="+34 6…" /></label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-[12px] text-ink-muted">Country I want<select value={p.interest_country || "Any"} onChange={(e) => setP({ ...p, interest_country: e.target.value })} className={inp + " w-full mt-1"}>{COUNTRIES.map((c) => <option key={c}>{c}</option>)}</select></label>
                <label className="text-[12px] text-ink-muted">Max budget<select value={p.budget_max || 50000} onChange={(e) => setP({ ...p, budget_max: Number(e.target.value) })} className={inp + " w-full mt-1"}>{[10000, 25000, 50000, 100000].map((v) => <option key={v} value={v}>{eur(v)}</option>)}</select></label>
              </div>
              <button className="rh-btn-primary self-start inline-flex items-center gap-2 mt-2">{ok ? <><Check size={15} /> Saved</> : "Save"}</button>
              {p.referral_code && <div className="mt-6 border border-hairline rounded-2xl bg-white p-5"><p className="font-display text-[18px] inline-flex items-center gap-2"><Gift size={16} /> Invite a friend</p><p className="text-[13px] text-ink-muted mt-1">Both of you get new homes 24 hours before everyone else.</p><div className="mt-3 flex gap-2"><input readOnly value={`https://realhunt.co/?ref=${p.referral_code}`} className={inp + " flex-1 text-[13px]"} /><button type="button" onClick={() => copy(`https://realhunt.co/?ref=${p.referral_code}`, "ref")} className="rh-btn-primary !px-4 !py-2.5 !text-[13px]">{copied === "ref" ? "Copied" : "Copy"}</button></div></div>}
            </form>
          )}

          {user && tab === "saved" && (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4"><h1 className="font-display text-[30px] tracking-tight">Saved homes</h1><div className="flex gap-2">{sel.length >= 2 && <Link to={`/compare-homes?ids=${sel.join(",")}`} className="rh-btn-primary !px-4 !py-2 !text-[13px] inline-flex items-center gap-1.5"><Columns size={14} /> Compare {sel.length}</Link>}{p?.username && <button onClick={async () => { const v = !p.saved_public; setP({ ...p, saved_public: v }); await db.from("profiles").update({ saved_public: v }).eq("user_id", user!.id); if (v) copy(`https://realhunt.co/c/${p.username}`, "col"); track("share_list", { meta: { v } }); }} className="px-4 py-2 rounded-full border border-hairline text-[13px] hover:border-ink inline-flex items-center gap-1.5"><Share2 size={14} /> {p.saved_public ? (copied === "col" ? "Link copied" : "Public, copy link") : "Share my list"}</button>}</div></div>
              {saved.length > 1 && <p className="text-[12px] text-ink-muted mb-3">Tick 2 or 3 homes to compare them side by side.{!p?.username && " Add a name in your profile to share your list."}</p>}
              {saved.length === 0 && <p className="text-ink-muted">Nothing saved yet. Tap the heart on any home. <Link to="/" className="underline text-ink">Browse deals</Link></p>}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {saved.map((f) => { const c = norm(f.country_guess); return (
                  <article key={f.id} className="relative rounded-2xl overflow-hidden bg-white border border-hairline">
                    <Link to={`/find/${f.shortcode}`} className="block"><img src={f.image_urls![0]} srcSet={srcSet(f.image_urls![0])} sizes="(min-width:768px) 30vw, 50vw" alt={f.location_name || c} loading="lazy" className="w-full aspect-[4/3] object-cover" /><ListingInfo home={f} /></Link>
                    <div className="flex items-center justify-between gap-1 border-t border-hairline px-3 sm:px-4 py-3">
                      <label className="inline-flex items-center gap-1.5 text-[11px] sm:text-[12px] cursor-pointer"><input type="checkbox" checked={sel.includes(f.shortcode)} onChange={(e) => setSel(e.target.checked ? [...sel, f.shortcode].slice(-3) : sel.filter((x) => x !== f.shortcode))} />Compare</label>
                      <button onClick={() => unsave(f)} aria-label="Remove" className="h-9 w-9 rounded-full inline-flex items-center justify-center text-red-500 hover:bg-paper"><Heart size={16} fill="currentColor" /></button>
                    </div>
                  </article>); })}
              </div>
            </div>
          )}

          {user && tab === "alerts" && (
            <div className="max-w-[620px]">
              <h1 className="font-display text-[30px] tracking-tight mb-1">Alerts</h1>
              <p className="text-[14px] text-ink-muted mb-4">We email you only when a home matches. No digests, no spam.</p>
              <form onSubmit={addAlert} className="border border-hairline rounded-2xl bg-white p-4 flex flex-wrap gap-2 items-center">
                <select value={na.country} onChange={(e) => setNa({ ...na, country: e.target.value })} className={inp}>{COUNTRIES.map((c) => <option key={c}>{c}</option>)}</select>
                <select value={na.max} onChange={(e) => setNa({ ...na, max: Number(e.target.value) })} className={inp}>{[10000, 25000, 50000, 100000].map((v) => <option key={v} value={v}>under {eur(v)}</option>)}</select>
                <label className="inline-flex items-center gap-2 text-[14px] px-2"><input type="checkbox" checked={na.beach} onChange={(e) => setNa({ ...na, beach: e.target.checked })} /> Beach only</label>
                <button className="rh-btn-primary !px-4 !py-2.5 !text-[14px]">Add alert</button>
              </form>
              <ul className="mt-4 flex flex-col gap-2">
                {alerts.map((a) => <li key={a.id} className="flex items-center justify-between border border-hairline rounded-xl bg-white px-4 py-3 text-[14px]"><span><Bell size={14} className="inline mr-2 text-ink-muted" />{a.country || "Any country"} · under {eur(a.max_price || 100000)}{a.beach ? " · beach" : ""}</span><button onClick={() => delAlert(a.id)} aria-label="Delete" className="text-ink-muted hover:text-red-500"><Trash2 size={15} /></button></li>)}
                {alerts.length === 0 && <li className="text-ink-muted text-[14px]">No alerts yet.</li>}
              </ul>
            </div>
          )}

          {user && tab === "requests" && (
            <div className="max-w-[680px]">
              <h1 className="font-display text-[30px] tracking-tight mb-4">My requests</h1>
              {reqs.length === 0 && <p className="text-ink-muted text-[14px]">You have not asked about any home yet. Open one and tap "Ask about this home".</p>}
              <ul className="flex flex-col gap-2">
                {reqs.map((r) => <li key={r.id} className="border border-hairline rounded-xl bg-white px-4 py-3 text-[14px]"><div className="flex justify-between gap-3"><Link to={`/find/${r.find_shortcode}`} className="font-medium underline">{r.ig_finds?.hook || r.ig_finds?.location_name || r.find_shortcode}</Link><span className="text-ink-muted shrink-0">{new Date(r.created_at).toLocaleDateString("en-GB")}</span></div>{r.ig_finds?.price_eur && <p className="text-ink-muted">{eur(r.ig_finds.price_eur)} · {r.ig_finds.country_guess}</p>}{r.message && <p className="mt-1">{r.message}</p>}<p className="text-[12px] text-ink-muted mt-1">A person replies by email within 24 hours.</p></li>)}
              </ul>
            </div>
          )}
        </div>
      </section>
      <AuthModal open={auth} onClose={() => setAuth(false)} title="Your account" subtitle="Sign in to see your saved homes, alerts and requests." redirect={`/account/${tab}`} />
    </div>
  );
};
export default Account;

