import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import RHNav from "@/components/realhunt/RHNav";
import AuthModal from "@/components/realhunt/AuthModal";
import { Heart, Bell, MessageSquare, User, LogOut, Check, Trash2 } from "lucide-react";
import { db, eur, FLAG, norm, IG, srcSet, track } from "@/lib/rh";

const TABS = [["profile", "Profile", User], ["saved", "Saved homes", Heart], ["alerts", "Alerts", Bell], ["requests", "My requests", MessageSquare]] as const;
const COUNTRIES = ["Any", "Italy", "Spain", "Portugal", "France", "Greece", "Japan", "Sweden", "Norway", "Denmark", "Finland", "Indonesia"];

const Account = () => {
  const { tab = "profile" } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [auth, setAuth] = useState(false);
  const [p, setP] = useState<any>(null);
  const [saved, setSaved] = useState<IG[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [reqs, setReqs] = useState<any[]>([]);
  const [ok, setOk] = useState(false);
  const [na, setNa] = useState({ country: "Any", max: 50000, beach: false });

  useEffect(() => { document.title = "Your account · RealHunt"; }, []);
  useEffect(() => {
    if (!user) { setAuth(true); return; }
    setAuth(false);
    db.from("profiles").select("email,username,phone,interest_country,budget_max").eq("user_id", user.id).maybeSingle().then(({ data }: any) => setP(data || { email: user.email }));
    db.from("find_events").select("created_at, ig_finds(id,shortcode,image_urls,price_eur,price_in_image,location_name,country_guess,hook)").eq("user_id", user.id).eq("event", "favorite").order("created_at", { ascending: false }).then(({ data }: any) => setSaved((data || []).map((r: any) => r.ig_finds).filter(Boolean)));
    db.from("alerts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).then(({ data }: any) => setAlerts(data || []));
    db.from("home_requests").select("id,created_at,message,find_shortcode,ig_finds(location_name,country_guess,price_eur,hook)").eq("user_id", user.id).order("created_at", { ascending: false }).then(({ data }: any) => setReqs(data || []));
  }, [user]);

  const save = async (e: React.FormEvent) => { e.preventDefault(); if (!user) return; await db.from("profiles").update({ username: p.username, phone: p.phone, interest_country: p.interest_country, budget_max: p.budget_max }).eq("user_id", user.id); setOk(true); setTimeout(() => setOk(false), 1800); track("profile_saved"); };
  const signOut = async () => { track("sign_out"); await supabase.auth.signOut(); nav("/"); };
  const addAlert = async (e: React.FormEvent) => { e.preventDefault(); if (!user) return; const row = { email: p?.email || user.email, country: na.country === "Any" ? null : na.country, max_price: na.max, beach: na.beach, user_id: user.id }; const { data } = await db.from("alerts").insert(row).select().single(); setAlerts([data, ...alerts]); track("alert"); };
  const delAlert = async (id: string) => { setAlerts(alerts.filter((a) => a.id !== id)); await db.from("alerts").delete().eq("id", id); };
  const unsave = async (f: IG) => { if (!user) return; setSaved(saved.filter((x) => x.id !== f.id)); await db.from("find_events").delete().eq("user_id", user.id).eq("find_id", f.id).eq("event", "favorite"); };
  const inp = "border border-hairline rounded-full px-4 py-3 text-[15px] bg-paper outline-none focus:border-ink";

  return (
    <div className="min-h-screen bg-paper text-ink">
      <RHNav />
      <section className="max-w-[1140px] mx-auto px-4 md:px-6 pt-8 md:pt-12 pb-16 grid md:grid-cols-[220px_1fr] gap-8">
        <aside>
          <div className="flex items-center gap-3 mb-6"><span className="h-11 w-11 rounded-full bg-ink text-paper inline-flex items-center justify-center font-display text-[18px]">{(p?.username || user?.email || "?").slice(0, 1).toUpperCase()}</span><div className="min-w-0"><p className="font-medium truncate">{p?.username || "Your account"}</p><p className="text-[12px] text-ink-muted truncate">{user?.email}</p></div></div>
          <nav className="flex md:flex-col gap-1 overflow-x-auto scrollbar-none">
            {TABS.map(([k, l, I]) => <Link key={k} to={`/account/${k}`} className={`shrink-0 inline-flex items-center gap-2 px-3 py-2.5 rounded-xl text-[14px] ${tab === k ? "bg-white border border-hairline" : "text-ink-muted hover:text-ink"}`}><I size={15} /> {l}</Link>)}
            <button onClick={signOut} className="shrink-0 inline-flex items-center gap-2 px-3 py-2.5 rounded-xl text-[14px] text-ink-muted hover:text-ink text-left"><LogOut size={15} /> Sign out</button>
          </nav>
        </aside>

        <div>
          {!user && <p className="text-ink-muted">Sign in to see your account. <button onClick={() => setAuth(true)} className="underline text-ink">Sign in</button></p>}

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
            </form>
          )}

          {user && tab === "saved" && (
            <div>
              <h1 className="font-display text-[30px] tracking-tight mb-4">Saved homes</h1>
              {saved.length === 0 && <p className="text-ink-muted">Nothing saved yet. Tap the heart on any home. <Link to="/" className="underline text-ink">Browse deals</Link></p>}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5">
                {saved.map((f) => { const c = norm(f.country_guess); return (
                  <Link key={f.id} to={`/find/${f.shortcode}`} className="group relative block rounded-2xl overflow-hidden bg-hairline/30 aspect-[4/5]">
                    <img src={f.image_urls![0]} srcSet={srcSet(f.image_urls![0])} sizes="(min-width:768px) 30vw, 50vw" alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 to-transparent" />
                    <span className="absolute top-2.5 right-2.5 px-2 py-1 rounded-full bg-white/90 text-ink text-[11px] font-medium shadow">{FLAG[c] || "🌍"} {c}</span>
                    {f.price_eur && <span className="absolute top-2.5 left-2.5 px-2 py-1 rounded-full bg-white text-ink text-[12px] font-semibold tabular-nums shadow">{eur(f.price_eur)}</span>}
                    <button onClick={(e) => { e.preventDefault(); unsave(f); }} aria-label="Remove" className="absolute bottom-3 right-3 h-9 w-9 rounded-full bg-white/90 shadow inline-flex items-center justify-center text-red-500"><Heart size={16} fill="currentColor" /></button>
                    <div className="absolute inset-x-0 bottom-0 p-3 pr-14 text-white"><p className="text-[12px] line-clamp-2">{f.hook || f.location_name || c}</p></div>
                  </Link>); })}
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
