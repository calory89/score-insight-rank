import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import RHNav from "@/components/realhunt/RHNav";
import { Waves, Check } from "lucide-react";

type IG = { id: string; source_account: string; shortcode: string; caption: string | null; image_urls: string[] | null; posted_at: string | null; location_name: string | null; country_guess: string | null; price_eur: number | null; price_raw: string | null; is_beach: boolean | null; price_in_image?: boolean };
const db = supabase as any;
const eur = (n: number) => "€" + Math.round(n).toLocaleString("en-GB");
const MAX = 200000;
const FLAG: Record<string, string> = { Italy: "🇮🇹", Spain: "🇪🇸", Portugal: "🇵🇹", France: "🇫🇷", Greece: "🇬🇷", Croatia: "🇭🇷", Bulgaria: "🇧🇬", Romania: "🇷🇴", Japan: "🇯🇵", Sweden: "🇸🇪", Norway: "🇳🇴", Denmark: "🇩🇰", Finland: "🇫🇮", Germany: "🇩🇪", Turkey: "🇹🇷", Albania: "🇦🇱", Indonesia: "🇮🇩", Nordics: "❄️", Asia: "🌏", Other: "🌍" };
const norm = (c: string | null) => { if (!c) return "Other"; if (c === "Scandinavia") return "Nordics"; if (c === "International" || c === "Europe") return "Other"; return c; };

const EBC: IG = { id: "ebc", source_account: "ecobeachcity", shortcode: "ecobeachcity", caption: "Beachfront cabin in a new eco village. 80-year lease that extends. Payable in instalments.", image_urls: ["/images/ebc/ebc-card.jpg"], posted_at: null, location_name: "Mamboro, Sumba", country_guess: "Indonesia", price_eur: 11500, price_raw: null, is_beach: true };

const Home = () => {
  const [finds, setFinds] = useState<IG[]>([]);
  const [country, setCountry] = useState("All");
  const [beach, setBeach] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    document.title = "RealHunt · Real homes under €200,000";
    db.from("ig_finds").select("id,source_account,shortcode,caption,image_urls,posted_at,location_name,country_guess,price_eur,price_raw,is_beach,price_in_image").neq("status", "hidden").order("posted_at", { ascending: false }).limit(150).then(({ data }: any) => setFinds((data || []).filter((f: IG) => f.image_urls && f.image_urls.length && (f.price_eur == null || f.price_eur <= MAX))));
  }, []);

  const countries = useMemo(() => { const m: Record<string, number> = {}; finds.forEach((f) => { const c = norm(f.country_guess); m[c] = (m[c] || 0) + 1; }); m.Indonesia = (m.Indonesia || 0) + 1; return Object.entries(m).sort((a, b) => b[1] - a[1]); }, [finds]);
  const shown = useMemo(() => {
    let l = finds.filter((f) => (country === "All" || norm(f.country_guess) === country) && (!beach || f.is_beach));
    if (country === "All" || country === "Indonesia") l = [EBC, ...l];
    return l;
  }, [finds, country, beach]);
  const min = useMemo(() => finds.reduce((a, f) => (f.price_eur && f.price_eur < a ? f.price_eur : a), Infinity), [finds]);

  const subscribe = async (e: React.FormEvent) => { e.preventDefault(); if (!/.+@.+\..+/.test(email)) return; setSent(true); try { await db.from("newsletter_subscribers").insert({ email, source: "home_tuesday" }); } catch {} };

  return (
    <div className="min-h-screen bg-paper text-ink">
      <RHNav />

      <section className="max-w-[1240px] mx-auto px-4 md:px-6 pt-8 md:pt-12 pb-4">
        <h1 className="font-display text-[clamp(30px,5vw,54px)] leading-[1.02] tracking-tight max-w-[22ch]">Real homes under €200,000.</h1>
        <p className="mt-3 text-[15px] md:text-[17px] text-ink-muted">{finds.length + 1} homes right now{isFinite(min) && <> · cheapest <b className="text-ink">{eur(Math.min(min, EBC.price_eur!))}</b></>}</p>
      </section>

      <section className="sticky top-16 z-30 bg-paper/90 backdrop-blur border-b border-hairline">
        <div className="max-w-[1240px] mx-auto px-4 md:px-6 py-3 flex gap-2 overflow-x-auto scrollbar-none">
          <button onClick={() => setBeach((v) => !v)} aria-pressed={beach} className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-[13px] ${beach ? "bg-sky-500 text-white border-sky-500" : "border-hairline hover:border-ink"}`}><Waves size={14} /> Beach</button>
          <span className="w-px bg-hairline shrink-0 my-1" />
          {[["All", "All"], ...countries.map(([c]) => [c, c])].map(([k, l]) => (
            <button key={k} onClick={() => setCountry(k)} aria-pressed={country === k} className={`shrink-0 px-3.5 py-2 rounded-full border text-[13px] ${country === k ? "bg-sky-500 text-white border-sky-500" : "border-hairline hover:border-ink"}`}>{k !== "All" && <span className="mr-1">{FLAG[k] || "🌍"}</span>}{l}</button>
          ))}
        </div>
      </section>

      <section className="max-w-[1240px] mx-auto px-4 md:px-6 py-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
          {shown.map((f) => {
            const c = norm(f.country_guess);
            const to = f.id === "ebc" ? "/ecobeachcity" : `/find/${f.shortcode}`;
            return (
              <Link key={f.id} to={to} className="group relative block rounded-2xl overflow-hidden bg-hairline/30 aspect-[4/5] shadow-sm hover:shadow-xl transition-shadow">
                <img src={f.image_urls![0]} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                <div className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent ${f.price_in_image ? "h-1/4" : "h-1/2"}`} />
                <span className="absolute top-2.5 right-2.5 px-2 py-1 rounded-full bg-white/90 text-ink text-[11px] font-medium shadow">{FLAG[c] || "🌍"} {c}</span>
                {f.is_beach && <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-sky-500/90 text-white text-[11px] font-medium shadow"><Waves size={11} /> Beach</span>}
                <div className="absolute inset-x-0 bottom-0 p-3 md:p-4 text-white">
                  {f.price_eur && !f.price_in_image && <p className="font-display text-[22px] md:text-[28px] leading-none tabular-nums drop-shadow">{eur(f.price_eur)}</p>}
                  <p className="text-[12px] md:text-[13px] mt-1 opacity-90 truncate">{f.location_name || (f.caption || "").replace(/#\w+/g, "").slice(0, 48) || c}</p>
                </div>
              </Link>
            );
          })}
        </div>
        {finds.length === 0 && <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[...Array(8)].map((_, i) => <div key={i} className="aspect-[4/5] rounded-2xl bg-hairline/50 animate-pulse" />)}</div>}
      </section>

      <section className="max-w-[1240px] mx-auto px-4 md:px-6 pb-16">
        <div className="border border-hairline rounded-2xl bg-white p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1"><p className="font-display text-[22px] tracking-tight">Get the best deals we find, in your inbox.</p><p className="text-[14px] text-ink-muted">Free. Only homes under €200k worth talking about.</p></div>
          {sent ? <p className="inline-flex items-center gap-2 text-[15px]"><Check size={18} /> Done. First deals coming your way.</p> : (
            <form onSubmit={subscribe} className="flex gap-2 w-full md:w-auto"><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" aria-label="Email" className="flex-1 md:w-64 border border-hairline rounded-full px-4 py-3 text-[15px] bg-paper outline-none focus:border-ink" /><button type="submit" className="rh-btn-primary !px-5">Send</button></form>
          )}
        </div>
      </section>

      <footer className="border-t border-hairline"><div className="max-w-[1240px] mx-auto px-4 md:px-6 py-8 flex flex-wrap gap-x-8 gap-y-3 text-[13px] text-ink-muted"><Link to="/network" className="hover:text-ink">For developers</Link><Link to="/fit" className="hover:text-ink">Can I afford it?</Link><Link to="/score" className="hover:text-ink">Score a listing</Link><Link to="/method" className="hover:text-ink">Method</Link><Link to="/legal/terms" className="hover:text-ink">Terms</Link><span className="ml-auto">Listings belong to their original posters. We link, we do not sell.</span></div></footer>
    </div>
  );
};
export default Home;
