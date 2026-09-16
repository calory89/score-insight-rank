import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import RHNav from "@/components/realhunt/RHNav";
import AuthModal from "@/components/realhunt/AuthModal";
import { Waves, Check, Heart, Search, Bell } from "lucide-react";
import { db, eur, FLAG, norm, slug, unslug, isNew, cleanCap, IG, EBC, MAX_PRICE, track, srcSet, score } from "@/lib/rh";

const PRICE_CHIPS: [string, number][] = [["< €25k", 25000], ["< €50k", 50000], ["< €100k", 100000], ["< €200k", 200000]];
const PAGE = 40;

const Home = () => {
  const { country: cParam, account: aParam } = useParams();
  const { user } = useAuth();
  const [finds, setFinds] = useState<IG[]>([]);
  const [country, setCountry] = useState("All");
  const [beach, setBeach] = useState(false);
  const [maxP, setMaxP] = useState<number>(0);
  const [q, setQ] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const [favs, setFavs] = useState<Set<string>>(new Set());
  const [auth, setAuth] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [alert, setAlert] = useState({ email: "", country: "Any", max: 50000 });
  const [alertSent, setAlertSent] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    db.from("ig_finds").select("id,source_account,shortcode,caption,image_urls,posted_at,location_name,country_guess,price_eur,price_raw,likes,is_beach,price_in_image,sqm,bedrooms").neq("status", "hidden").order("posted_at", { ascending: false }).limit(600)
      .then(({ data }: any) => setFinds((data || []).filter((f: IG) => f.image_urls && f.image_urls.length && (f.price_eur == null || f.price_eur <= MAX_PRICE)).sort((a: IG, b: IG) => score(b) - score(a))));
    track("home_view");
  }, []);
  useEffect(() => {
    if (!user) { setFavs(new Set()); return; }
    db.from("find_events").select("find_id").eq("user_id", user.id).eq("event", "favorite").then(({ data }: any) => setFavs(new Set((data || []).map((r: any) => r.find_id))));
  }, [user]);

  const allCountries = useMemo(() => { const m: Record<string, number> = { Indonesia: 1 }; finds.forEach((f) => { const c = norm(f.country_guess); m[c] = (m[c] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([c]) => c); }, [finds]);
  useEffect(() => { if (cParam) setCountry(unslug(cParam, allCountries)); }, [cParam, allCountries]);
  useEffect(() => {
    const t = aParam ? `Cheap homes spotted by @${aParam}` : country !== "All" ? `Cheap houses in ${country} under €200,000` : "Real homes under €200,000";
    document.title = `${t} · RealHunt`;
    const m = document.querySelector('meta[name="description"]'); if (m) m.setAttribute("content", `${t}. Real listings under €200k, checked and updated. Beach, countryside, villages.`);
  }, [country, aParam]);

  const shown = useMemo(() => {
    const qq = q.trim().toLowerCase();
    let l = finds.filter((f) => (country === "All" || norm(f.country_guess) === country) && (!beach || f.is_beach) && (!maxP || (f.price_eur != null && f.price_eur <= maxP)) && (!aParam || f.source_account === aParam) && (!qq || `${f.caption || ""} ${f.location_name || ""} ${f.country_guess || ""}`.toLowerCase().includes(qq)));
    const ebcOk = !aParam && (country === "All" || country === "Indonesia") && (!maxP || EBC.price_eur! <= maxP) && (!qq || "sumba indonesia beach cabin ecobeachcity".includes(qq));
    if (ebcOk) l = [EBC, ...l];
    return l;
  }, [finds, country, beach, maxP, q, aParam]);
  useEffect(() => { setLimit(PAGE); }, [country, beach, maxP, q, aParam]);
  useEffect(() => {
    const el = sentinel.current; if (!el) return;
    const io = new IntersectionObserver((e) => { if (e[0].isIntersecting) setLimit((n) => n + PAGE); }, { rootMargin: "600px" });
    io.observe(el); return () => io.disconnect();
  }, []);
  const min = useMemo(() => finds.reduce((a, f) => (f.price_eur && f.price_eur < a ? f.price_eur : a), EBC.price_eur!), [finds]);

  const toggleFav = async (e: React.MouseEvent, f: IG) => {
    e.preventDefault(); e.stopPropagation();
    if (!user) { track("fav_gate", { find: f.shortcode }); setAuth(true); return; }
    if (f.id === "ebc") return;
    const on = favs.has(f.id); const n = new Set(favs); on ? n.delete(f.id) : n.add(f.id); setFavs(n);
    if (on) await db.from("find_events").delete().eq("user_id", user.id).eq("find_id", f.id).eq("event", "favorite");
    else { await db.from("find_events").insert({ user_id: user.id, find_id: f.id, event: "favorite" }); track("favorite", { find: f.shortcode }); }
  };
  const subscribe = async (e: React.FormEvent) => { e.preventDefault(); if (!/.+@.+\..+/.test(email)) return; setSent(true); track("newsletter"); try { await db.from("newsletter_subscribers").insert({ email, source: "home_bottom" }); } catch {} };
  const saveAlert = async (e: React.FormEvent) => { e.preventDefault(); if (!/.+@.+\..+/.test(alert.email)) return; setAlertSent(true); track("alert", { meta: alert }); try { await db.from("alerts").insert({ email: alert.email, country: alert.country === "Any" ? null : alert.country, max_price: alert.max, beach, user_id: user?.id || null }); } catch {} };

  const chip = (on: boolean) => `shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-[13px] transition-colors ${on ? "bg-sky-500 text-white border-sky-500" : "border-hairline hover:border-ink bg-white"}`;

  return (
    <div className="min-h-screen bg-paper text-ink">
      <RHNav />

      <section className="max-w-[1240px] mx-auto px-4 md:px-6 pt-8 md:pt-12 pb-4">
        <h1 className="font-display text-[clamp(30px,5vw,54px)] leading-[1.02] tracking-tight max-w-[22ch]">{aParam ? <>Spotted by <span className="text-ink-muted">@{aParam}</span></> : country !== "All" ? <>Cheap homes in {country}.</> : <>Real homes under €200,000.</>}</h1>
        <p className="mt-3 text-[15px] md:text-[17px] text-ink-muted">{shown.length} homes{isFinite(min) && <> · cheapest <b className="text-ink">{eur(min)}</b></>}{aParam && <> · <a href={`https://instagram.com/${aParam}`} target="_blank" rel="noreferrer" className="underline">follow them on Instagram</a></>}</p>
      </section>

      <section className="sticky top-16 z-30 bg-paper/90 backdrop-blur border-b border-hairline">
        <div className="max-w-[1240px] mx-auto px-4 md:px-6 py-3 flex gap-2 overflow-x-auto scrollbar-none items-center">
          <button onClick={() => setShowSearch((v) => !v)} aria-label="Search" className={chip(showSearch || !!q)}><Search size={14} />{q ? q : ""}</button>
          <button onClick={() => setBeach((v) => !v)} aria-pressed={beach} className={chip(beach)}><Waves size={14} /> Beach</button>
          {PRICE_CHIPS.map(([l, v]) => <button key={v} onClick={() => setMaxP(maxP === v ? 0 : v)} aria-pressed={maxP === v} className={chip(maxP === v)}>{l}</button>)}
          <span className="w-px bg-hairline shrink-0 self-stretch my-1" />
          {["All", ...allCountries].map((k) => (
            <Link key={k} to={k === "All" ? "/" : `/country/${slug(k)}`} onClick={() => setCountry(k)} aria-pressed={country === k} className={chip(country === k)}>{k !== "All" && <span>{FLAG[k] || "🌍"}</span>}{k}</Link>
          ))}
        </div>
        {showSearch && <div className="max-w-[1240px] mx-auto px-4 md:px-6 pb-3"><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="castle, lake, ocean, Tuscany, land…" className="w-full md:w-96 border border-hairline rounded-full px-4 py-2.5 text-[14px] bg-white outline-none focus:border-ink" /></div>}
      </section>

      <section className="max-w-[1240px] mx-auto px-4 md:px-6 py-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
          {shown.slice(0, limit).map((f) => {
            const c = norm(f.country_guess);
            const to = f.id === "ebc" ? "/ecobeachcity" : `/find/${f.shortcode}`;
            const u = f.image_urls![0];
            return (
              <Link key={f.id} to={to} onClick={() => track("card_click", { find: f.shortcode })} className="group relative block rounded-2xl overflow-hidden bg-hairline/30 aspect-[4/5] shadow-sm hover:shadow-xl transition-shadow">
                <img src={u} srcSet={srcSet(u)} sizes="(min-width:1024px) 300px, (min-width:768px) 33vw, 50vw" alt="" loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                <div className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent ${f.price_in_image ? "h-1/4" : "h-1/2"}`} />
                <span className="absolute top-2.5 right-2.5 px-2 py-1 rounded-full bg-white/90 text-ink text-[11px] font-medium shadow">{FLAG[c] || "🌍"} {c}</span>
                <div className="absolute top-2.5 left-2.5 flex gap-1">
                  {f.is_beach && <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-sky-500/90 text-white text-[11px] font-medium shadow"><Waves size={11} /> Beach</span>}
                  {isNew(f.posted_at) && <span className="px-2 py-1 rounded-full bg-emerald-500/90 text-white text-[11px] font-medium shadow">New</span>}
                </div>
                {f.id !== "ebc" && <button onClick={(e) => toggleFav(e, f)} aria-label="Save" className={`absolute bottom-3 right-3 h-9 w-9 rounded-full bg-white/90 shadow inline-flex items-center justify-center ${favs.has(f.id) ? "text-red-500" : "text-ink"}`}><Heart size={16} fill={favs.has(f.id) ? "currentColor" : "none"} /></button>}
                <div className="absolute inset-x-0 bottom-0 p-3 md:p-4 pr-14 text-white">
                  {f.price_eur && !f.price_in_image && <p className="font-display text-[22px] md:text-[28px] leading-none tabular-nums drop-shadow">{eur(f.price_eur)}</p>}
                  <p className="text-[12px] md:text-[13px] mt-1 opacity-90 truncate">{f.location_name || cleanCap(f.caption).slice(0, 48) || c}{f.sqm ? ` · ${f.sqm} m²` : ""}{f.bedrooms ? ` · ${f.bedrooms} bed` : ""}</p>
                </div>
              </Link>
            );
          })}
        </div>
        {finds.length === 0 && <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[...Array(8)].map((_, i) => <div key={i} className="aspect-[4/5] rounded-2xl bg-hairline/50 animate-pulse" />)}</div>}
        {finds.length > 0 && shown.length === 0 && <p className="text-ink-muted py-10 text-center">Nothing matches. Try another filter.</p>}
        <div ref={sentinel} className="h-2" />
      </section>

      <section className="max-w-[1240px] mx-auto px-4 md:px-6 pb-6 grid md:grid-cols-2 gap-4">
        <div className="border border-hairline rounded-2xl bg-white p-6 md:p-8 flex flex-col gap-3">
          <p className="font-display text-[22px] tracking-tight inline-flex items-center gap-2"><Bell size={18} /> Tell me when a home like this appears</p>
          {alertSent ? <p className="inline-flex items-center gap-2 text-[15px]"><Check size={18} /> Alert on. We only email when there is a match.</p> : (
            <form onSubmit={saveAlert} className="flex flex-col gap-2">
              <div className="flex gap-2">
                <select value={alert.country} onChange={(e) => setAlert({ ...alert, country: e.target.value })} className="flex-1 border border-hairline rounded-full px-4 py-3 text-[14px] bg-paper">{["Any", ...allCountries].map((c) => <option key={c}>{c}</option>)}</select>
                <select value={alert.max} onChange={(e) => setAlert({ ...alert, max: Number(e.target.value) })} className="flex-1 border border-hairline rounded-full px-4 py-3 text-[14px] bg-paper">{PRICE_CHIPS.map(([l, v]) => <option key={v} value={v}>{l}</option>)}</select>
              </div>
              <div className="flex gap-2"><input required type="email" value={alert.email} onChange={(e) => setAlert({ ...alert, email: e.target.value })} placeholder="you@email.com" className="flex-1 border border-hairline rounded-full px-4 py-3 text-[15px] bg-paper outline-none focus:border-ink" /><button className="rh-btn-primary !px-5">Alert me</button></div>
            </form>
          )}
        </div>
        <div className="border border-hairline rounded-2xl bg-white p-6 md:p-8 flex flex-col gap-3">
          <p className="font-display text-[22px] tracking-tight">Get the best deals we find, in your inbox.</p>
          <p className="text-[14px] text-ink-muted -mt-2">Free. Only homes under €200k worth talking about.</p>
          {sent ? <p className="inline-flex items-center gap-2 text-[15px]"><Check size={18} /> Done. First deals coming your way.</p> : (
            <form onSubmit={subscribe} className="flex gap-2"><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" aria-label="Email" className="flex-1 border border-hairline rounded-full px-4 py-3 text-[15px] bg-paper outline-none focus:border-ink" /><button type="submit" className="rh-btn-primary !px-5">Send</button></form>
          )}
        </div>
      </section>

      <section className="max-w-[1240px] mx-auto px-4 md:px-6 pb-10 text-[13px] text-ink-muted flex flex-wrap gap-x-4 gap-y-1">
        <span>Browse by country:</span>{allCountries.map((c) => <Link key={c} to={`/country/${slug(c)}`} className="underline hover:text-ink">{c}</Link>)}
      </section>

      <footer className="border-t border-hairline"><div className="max-w-[1240px] mx-auto px-4 md:px-6 py-8 flex flex-wrap gap-x-8 gap-y-3 text-[13px] text-ink-muted"><Link to="/network" className="hover:text-ink">For developers</Link><Link to="/fit" className="hover:text-ink">Can I afford it?</Link><Link to="/score" className="hover:text-ink">Score a listing</Link><Link to="/method" className="hover:text-ink">Method</Link><Link to="/legal/terms" className="hover:text-ink">Terms</Link><span className="ml-auto">Listings belong to their original posters. We link, we do not sell.</span></div></footer>
      <AuthModal open={auth} onClose={() => setAuth(false)} title="Save this home" subtitle="Free. Heart the homes you like, we tell you when similar ones appear." />
    </div>
  );
};
export default Home;
