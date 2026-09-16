import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import RHNav from "@/components/realhunt/RHNav";
import { ArrowRight, Share2, Check } from "lucide-react";

type P = {
  id: string; name: string; slug: string; city: string | null; country_id: string | null;
  ticket_min_eur: number | null; delivery_quarter: string | null; construction_pct: number | null;
  hero_image_url: string | null; asset_tags: string[] | null; deposit_pct: number | null;
  plan_months: number | null; why_cheap: string | null; caveats: string | null;
  is_owned_by_realhunt: boolean | null; is_deal_of_week: boolean | null; created_at: string;
};
type IG = { id: string; shortcode: string; source_account: string; caption: string | null; image_urls: string[] | null; posted_at: string | null; location_name: string | null; country_guess: string | null; price_eur: number | null };
type Rej = { id: string; name: string; city: string | null; country_id: string | null; rejection_reason: string | null };

const eur = (n: number) => "€" + Math.round(n).toLocaleString("en-GB");
const db = supabase as any;

const CHIPS: { k: string; l: string; f: (p: P) => boolean }[] = [
  { k: "all", l: "All", f: () => true },
  { k: "150", l: "Under €150k", f: (p) => (p.ticket_min_eur || 0) < 150000 },
  { k: "200", l: "Under €200k", f: (p) => (p.ticket_min_eur || 0) < 200000 },
  { k: "beach", l: "Beach", f: (p) => (p.asset_tags || []).some((t) => /beach|sea|ocean|coast/i.test(t)) },
  { k: "plan", l: "Payment plan", f: (p) => p.deposit_pct != null && p.plan_months != null },
];

const EBC: IG = { id: "ebc", shortcode: "ebc", source_account: "ecobeachcity", caption: null, image_urls: null, posted_at: null, location_name: "Sumba", country_guess: "Indonesia", price_eur: 21500 };

const Home = () => {
  const [rows, setRows] = useState<P[] | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [ctry, setCtry] = useState<Record<string, { name: string; flag: string }>>({});
  const [rej, setRej] = useState<Rej[]>([]);
  const [ig, setIg] = useState<IG[] | null>(null);
  const [igAll, setIgAll] = useState(false);
  const [chip, setChip] = useState("all");
  const [email, setEmail] = useState("");
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => { document.title = "RealHunt · Homes under €200k worth talking about, worldwide"; }, []);

  useEffect(() => {
    (async () => {
      db.from("ig_finds").select("id,shortcode,source_account,caption,image_urls,posted_at,location_name,country_guess,price_eur").order("posted_at", { ascending: false }).limit(120).then(({ data }: any) => setIg(data || []));
      const [{ data: p }, { data: s }, { data: c }, { data: r }] = await Promise.all([
        db.from("projects").select("id,name,slug,city,country_id,ticket_min_eur,delivery_quarter,construction_pct,hero_image_url,asset_tags,deposit_pct,plan_months,why_cheap,caveats,is_owned_by_realhunt,is_deal_of_week,created_at")
          .eq("active", true).not("ticket_min_eur", "is", null).not("hero_image_url", "is", null)
          .order("ticket_min_eur", { ascending: true }).limit(80),
        db.from("project_scores").select("project_id,weighted_score").limit(2000),
        db.from("countries").select("id,name,flag_emoji"),
        db.from("projects").select("id,name,city,country_id,rejection_reason").eq("active", false).not("rejection_reason", "is", null).order("updated_at", { ascending: false }).limit(3),
      ]);
      const sm: Record<string, number> = {}; (s || []).forEach((x: any) => { if (x.weighted_score != null) sm[x.project_id] = Number(x.weighted_score); });
      const cm: Record<string, { name: string; flag: string }> = {}; (c || []).forEach((x: any) => { cm[x.id] = { name: x.name, flag: x.flag_emoji || "" }; });
      setScores(sm); setCtry(cm); setRej((r || []) as Rej[]); setRows((p || []) as P[]);
    })();
  }, []);

  const igShown = useMemo(() => (ig || []).filter((f) => f.price_eur == null || f.price_eur <= 200000), [ig]);
  const igMin = useMemo(() => { const v = igShown.filter((f) => f.price_eur).map((f) => f.price_eur as number); return v.length ? Math.min(...v) : 0; }, [igShown]);
  const list = useMemo(() => (rows || []).filter(CHIPS.find((c) => c.k === chip)!.f), [rows, chip]);
  const deal = useMemo(() => {
    if (!rows?.length) return null;
    const flagged = rows.find((p) => p.is_deal_of_week);
    if (flagged) return flagged;
    return [...rows.slice(0, 40)].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0))[0];
  }, [rows, scores]);
  const cheapest = rows?.[0]?.ticket_min_eur || 0;
  const weekAgo = Date.now() - 7 * 864e5;

  const share = (p: P) => {
    const url = `${location.origin}/projects/${p.slug}`;
    const text = `${p.name} · ${eur(p.ticket_min_eur || 0)} · ${ctry[p.country_id || ""]?.name || ""}\n${url}`;
    if (navigator.share) { navigator.share({ title: p.name, text, url }).catch(() => {}); return; }
    navigator.clipboard?.writeText(text).then(() => { setCopied(p.id); setTimeout(() => setCopied(null), 1800); });
  };
  const sub = async (e: React.FormEvent) => {
    e.preventDefault(); if (!/.+@.+\..+/.test(email)) return; setSaved(true);
    try { await db.from("newsletter_subscribers").insert({ email, source: "home_tuesday" }); } catch {}
  };

  const Card = ({ p, big }: { p: P; big?: boolean }) => {
    const c = ctry[p.country_id || ""]; const sc = scores[p.id];
    const isNew = new Date(p.created_at).getTime() > weekAgo;
    return (
      <article className={`group border border-hairline rounded-2xl bg-white overflow-hidden flex flex-col ${big ? "md:grid md:grid-cols-2" : ""}`}>
        <Link to={`/projects/${p.slug}`} className={`block relative ${big ? "aspect-[4/3] md:aspect-auto md:min-h-[360px]" : "aspect-[4/3]"} bg-hairline/40 overflow-hidden`}>
          <img src={p.hero_image_url!} alt={p.name} loading={big ? "eager" : "lazy"} className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500" />
          <div className="absolute top-3 left-3 flex gap-2">
            {isNew && <span className="text-[10px] uppercase tracking-[0.12em] bg-ink text-paper px-2 py-1 rounded-full">New</span>}
            {p.is_owned_by_realhunt && <span className="text-[10px] uppercase tracking-[0.12em] bg-red-600 text-white px-2 py-1 rounded-full">Our project</span>}
          </div>
          {sc != null && <span className="absolute top-3 right-3 font-display text-[13px] bg-white/95 text-ink px-2.5 py-1 rounded-full">{sc.toFixed(1)}</span>}
        </Link>
        <div className="p-5 flex flex-col gap-3 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-display text-[30px] leading-none tracking-tight tabular-nums">{eur(p.ticket_min_eur || 0)}</p>
              <p className="text-[13px] text-ink-muted mt-1.5 truncate">{c?.flag} {[p.city, c?.name].filter(Boolean).join(", ")}</p>
            </div>
            <button onClick={() => share(p)} aria-label="Share" className="shrink-0 h-9 w-9 rounded-full border border-hairline inline-flex items-center justify-center text-ink-muted hover:text-ink hover:border-ink">
              {copied === p.id ? <Check size={15} /> : <Share2 size={15} />}
            </button>
          </div>
          <h3 className="font-display text-[17px] leading-snug tracking-tight">{p.name}</h3>
          <p className="text-[14px] text-ink leading-relaxed">
            {p.why_cheap || [p.delivery_quarter ? `Off-plan, handover ${p.delivery_quarter}` : null, p.construction_pct != null ? `${p.construction_pct}% built` : null, p.deposit_pct != null ? `${p.deposit_pct}% down` : null].filter(Boolean).join(" · ")}
          </p>
          {p.caveats && <p className="text-[13px] text-ink-muted border-l-2 border-hairline pl-3">What you will not like: {p.caveats}</p>}
          <div className="mt-auto pt-2 flex items-center justify-between text-[13px]">
            <span className="text-ink-muted">Down today ≈ <b className="text-ink tabular-nums">{eur((p.ticket_min_eur || 0) * ((p.deposit_pct ?? 20) / 100))}</b></span>
            <Link to={`/fit?d=${Math.round((p.ticket_min_eur || 0) * 0.2)}&m=1800&t=36`} className="inline-flex items-center gap-1 text-ink hover:underline">Does it fit me? <ArrowRight size={14} /></Link>
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="min-h-screen bg-paper text-ink">
      <RHNav />

      <section className="max-w-[1140px] mx-auto px-6 pt-12 pb-8">
        <p className="text-[11px] uppercase tracking-[0.16em] text-ink-muted mb-4">New deals every Tuesday · 10:00 CET</p>
        <h1 className="font-display text-[clamp(34px,6vw,64px)] leading-[1.0] tracking-tight max-w-[18ch] text-balance">
          Homes that look too cheap to be real. We check whether they are.
        </h1>
        <p className="mt-5 text-[17px] text-ink-muted max-w-[56ch] leading-relaxed">
          Zillow and Idealista show you everything. We show you only homes under €200,000 worth talking about, spotted across Europe, Japan and Asia, and we tell you what you will not like about each one.
        </p>
        <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2 text-[14px]">
          <span><b className="font-display text-[22px] tabular-nums">{igShown ? igShown.length : "—"}</b> <span className="text-ink-muted">homes under €200k this month</span></span>
          <span><b className="font-display text-[22px] tabular-nums">{igMin ? eur(igMin) : "—"}</b> <span className="text-ink-muted">cheapest right now</span></span>
        </div>
        <div className="mt-8 flex flex-wrap gap-2">
          <Link to="/fit" className="px-4 py-2 text-[14px] rounded-full border border-hairline text-ink-muted hover:border-ink hover:text-ink">What can I afford?</Link>
        </div>
      </section>

      {ig && igShown.length > 0 && (
        <section className="max-w-[1140px] mx-auto px-6 pb-14">
          <div className="flex items-baseline justify-between gap-4 mb-5 flex-wrap">
            <div><h2 className="font-display text-[22px] tracking-tight">Spotted this month</h2><p className="text-[13px] text-ink-muted mt-1">Cheap homes the internet is talking about right now. Curated from the best cheap-house accounts in Europe and Japan.</p></div>
            <p className="text-[13px] text-ink-muted">{igShown.length} homes · last 30 days · nothing over €200k</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {(igAll ? igShown : igShown.slice(0, 12)).flatMap((f, i) => i === 1 ? [EBC, f] : [f]).map((f) => {
              if (f.id === "ebc") return (
                <a key="ebc" href="https://ecobeachcity.com" target="_blank" rel="noreferrer" className="group block border border-hairline rounded-2xl bg-white overflow-hidden">
                  <div className="relative aspect-[4/5] bg-hairline/40 overflow-hidden">
                    <img src="/images/ecobeachcity-hero.png" alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
                    <span className="absolute top-2.5 left-2.5 text-[10px] uppercase tracking-[0.12em] bg-red-600 text-white px-2 py-1 rounded-full">Our project</span>
                    <span className="absolute bottom-2.5 left-2.5 font-display text-[17px] md:text-[20px] bg-white/95 px-2.5 py-1 rounded-full tabular-nums">€21,500</span>
                  </div>
                  <div className="p-3 md:p-4">
                    <p className="text-[12px] text-ink-muted truncate">Sumba, Indonesia · beachfront</p>
                    <p className="text-[13px] md:text-[14px] leading-snug mt-1 line-clamp-2">Beachfront cabin on an 80-year lease, in a new eco village. Payable in instalments.</p>
                  </div>
                </a>
              );
              const cap = (f.caption || "").replace(/#\w+/g, "").trim();
              return (
                <Link key={f.id} to={`/find/${f.shortcode}`} className="group block border border-hairline rounded-2xl bg-white overflow-hidden">
                  <div className="relative aspect-[4/5] bg-hairline/40 overflow-hidden">
                    {f.image_urls?.[0] && <img src={f.image_urls[0]} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />}
                    {f.price_eur != null && <span className="absolute bottom-2.5 left-2.5 font-display text-[17px] md:text-[20px] bg-white/95 px-2.5 py-1 rounded-full tabular-nums">{eur(f.price_eur)}</span>}
                  </div>
                  <div className="p-3 md:p-4">
                    <p className="text-[12px] text-ink-muted truncate">{f.location_name || f.country_guess || "@" + f.source_account}</p>
                    <p className="text-[13px] md:text-[14px] leading-snug mt-1 line-clamp-2">{cap || "Open to see the details"}</p>
                  </div>
                </Link>
              );
            })}
          </div>
          {!igAll && igShown.length > 12 && <button onClick={() => setIgAll(true)} className="mt-6 border border-hairline rounded-lg px-6 py-3 text-[14px] hover:border-ink">Show all {igShown.length}</button>}
        </section>
      )}



      <section className="max-w-[1140px] mx-auto px-6 pb-20">
        <div className="border border-hairline rounded-2xl bg-white p-8 grid md:grid-cols-[1.2fr_1fr] gap-8 items-center">
          <div>
            <h2 className="font-display text-[26px] tracking-tight">The five best deals. One email. Tuesdays.</h2>
            <p className="mt-2 text-[15px] text-ink-muted">No newsletter, no drip sequence. If nothing good came in, you get nothing.</p>
          </div>
          {saved ? <p className="inline-flex items-center gap-2 text-[15px]"><Check size={18} /> You are on the Tuesday list.</p> : (
            <form onSubmit={sub} className="flex flex-col sm:flex-row gap-2">
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" aria-label="Email" className="flex-1 border border-hairline rounded-lg px-4 py-3 text-[15px] bg-paper outline-none focus:border-ink" />
              <button type="submit" className="rh-btn-primary">Send me Tuesdays</button>
            </form>
          )}
        </div>
      </section>

      <footer className="border-t border-hairline">
        <div className="max-w-[1140px] mx-auto px-6 py-10 flex flex-wrap gap-x-8 gap-y-3 text-[13px] text-ink-muted">
          <Link to="/score" className="hover:text-ink">Score any listing</Link>
          <Link to="/fit" className="hover:text-ink">What can I afford?</Link>
          <Link to="/method" className="hover:text-ink">How we check</Link>
          <Link to="/network" className="hover:text-ink">For developers</Link>
          <Link to="/legal/terms" className="hover:text-ink">Terms</Link>
          <span className="ml-auto">Prices are developer starting prices. Not an offer, not advice.</span>
        </div>
      </footer>
    </div>
  );
};

export default Home;
