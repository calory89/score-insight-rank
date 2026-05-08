import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Search, Globe, Eye, Scale, ShieldCheck, Ban, Plus, Loader2, Sparkles } from "lucide-react";
import useDocumentMeta from "@/hooks/useDocumentMeta";
import { supabase } from "@/integrations/supabase/client";
import RHNav from "@/components/realhunt/RHNav";
import RHFooter from "@/components/realhunt/RHFooter";
import ScoreRing from "@/components/realhunt/ScoreRing";
import LoginGateModal from "@/components/LoginGateModal";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface ProjectRow {
  slug: string;
  name: string;
  city: string | null;
  hero_image_url: string | null;
  is_owned_by_realhunt: boolean | null;
  developer: { name: string } | null;
  country: { name: string; slug: string; flag_emoji: string | null };
  score: {
    weighted_score: number | null;
    rank_global: number | null;
    dim_developer_reputation: number | null;
    dim_delivery_certainty: number | null;
    dim_legal_protection: number | null;
    dim_location_fundamentals: number | null;
    dim_investment_economics: number | null;
  } | null;
  ticket_min_eur: number | null;
}

const fmtEur = (v: number | null) => {
  if (!v) return "—";
  if (v >= 1_000_000) return `€${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `€${Math.round(v / 1_000)}k`;
  return `€${v}`;
};

const IndexNew = () => {
  useDocumentMeta({
    title: "RealHunt — The Global Off-Plan Real Estate Index",
    description:
      "Every off-plan project on Earth, ranked on five public dimensions. Independent, transparent, free for verified agents.",
  });

  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [country, setCountry] = useState<string>("all");
  const [search, setSearch] = useState("");

  // Submit URL section
  const [submitUrl, setSubmitUrl] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("projects")
        .select(
          "slug,name,city,ticket_min_eur,hero_image_url,is_owned_by_realhunt,developer:developers(name),country:countries(name,slug,flag_emoji),score:project_scores(weighted_score,rank_global,dim_developer_reputation,dim_delivery_certainty,dim_legal_protection,dim_location_fundamentals,dim_investment_economics)"
        )
        .eq("active", true)
        .limit(1200);
      const rows = (data || []).map((p: any) => ({
        ...p,
        score: Array.isArray(p.score) ? p.score[0] : p.score,
      })) as ProjectRow[];
      rows.sort((a, b) => (b.score?.weighted_score || 0) - (a.score?.weighted_score || 0));
      setProjects(rows);
      setLoading(false);
    })();
  }, []);

  const countries = useMemo(() => {
    const m = new Map<string, { slug: string; name: string; flag: string | null }>();
    projects.forEach((p) =>
      m.set(p.country.slug, { slug: p.country.slug, name: p.country.name, flag: p.country.flag_emoji })
    );
    return Array.from(m.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [projects]);

  const filtered = useMemo(() => {
    let r = projects;
    if (country !== "all") r = r.filter((p) => p.country.slug === country);
    if (search.trim()) {
      const s = search.toLowerCase();
      r = r.filter(
        (p) =>
          p.name.toLowerCase().includes(s) ||
          p.developer?.name.toLowerCase().includes(s) ||
          p.city?.toLowerCase().includes(s)
      );
    }
    return r;
  }, [projects, country, search]);

  const handleSubmitUrl = async () => {
    const url = submitUrl.trim();
    if (!url.startsWith("http")) {
      toast({ title: "Invalid URL", description: "Paste a full https:// link to a development website.", variant: "destructive" });
      return;
    }
    if (!user) {
      setLoginOpen(true);
      return;
    }
    setSubmitLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-property", { body: { url } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const id = data?.data?.id;
      toast({ title: "Score generated", description: "We added it to the global index." });
      if (id) navigate(`/analysis/${id}`);
    } catch (e: any) {
      toast({ title: "Could not score this URL", description: e.message || "Try a different link.", variant: "destructive" });
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased">
      <RHNav />

      {/* Hero */}
      <section className="border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-7xl mx-auto px-6 pt-14 pb-10">
          <p className="text-[11px] tracking-[0.25em] uppercase text-amber-600 font-semibold mb-4">
            The Global Off-Plan Index
          </p>
          <h1 className="font-serif text-4xl md:text-6xl leading-[1.05] tracking-tight max-w-4xl">
            Every off-plan project on Earth, <span className="italic text-amber-600">scored & ranked.</span>
          </h1>
          <p className="mt-5 text-base md:text-lg text-slate-600 max-w-2xl leading-relaxed">
            Five public dimensions. Live commission terms. Real delivery data. Independent and free for verified agents.
          </p>

          {/* Filter bar */}
          <div className="mt-8 flex flex-col md:flex-row gap-3 items-stretch">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search project, developer or city…"
                className="w-full h-11 pl-10 pr-3 rounded-md border border-slate-300 bg-white text-sm focus:border-slate-900 focus:ring-0 outline-none"
              />
            </div>
            <div className="relative md:w-64">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full h-11 pl-10 pr-3 rounded-md border border-slate-300 bg-white text-sm appearance-none focus:border-slate-900 outline-none"
              >
                <option value="all">All countries ({projects.length})</option>
                {countries.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.flag} {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Screener table */}
      <section className="border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-10">
          <div className="flex items-end justify-between mb-4 px-2">
            <div>
              <h2 className="font-serif text-2xl text-slate-900">Live Ranking</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {filtered.length} projects · sorted by RealHunt weighted score · always high to low
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-100 text-slate-700">
                  <th className="text-left font-semibold px-4 py-3 w-14">Rank</th>
                  <th className="px-2 py-3 w-16"></th>
                  <th className="text-left font-semibold px-3 py-3">Project</th>
                  <th className="text-left font-semibold px-3 py-3 w-20">Country</th>
                  <th className="text-center font-semibold px-3 py-3 w-20">RH Score</th>
                  <th className="text-center font-semibold px-3 py-3 w-20 hidden md:table-cell">Developer</th>
                  <th className="text-center font-semibold px-3 py-3 w-20 hidden md:table-cell">Delivery</th>
                  <th className="text-center font-semibold px-3 py-3 w-20 hidden lg:table-cell">Legal</th>
                  <th className="text-center font-semibold px-3 py-3 w-20 hidden lg:table-cell">Location</th>
                  <th className="text-center font-semibold px-3 py-3 w-20 hidden lg:table-cell">Economics</th>
                  <th className="text-right font-semibold px-3 py-3 hidden md:table-cell">From</th>
                  <th className="text-center font-semibold px-3 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td colSpan={12} className="px-4 py-4">
                        <div className="h-5 bg-slate-100 rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-12 text-center text-slate-500 text-sm">
                      No projects match these filters yet.
                    </td>
                  </tr>
                ) : (
                  filtered.map((p, i) => {
                    const s = p.score;
                    return (
                      <tr key={p.slug} className="border-t border-slate-100 hover:bg-slate-50 transition">
                        <td className="px-4 py-3 font-mono tabular-nums text-slate-500">{i + 1}</td>
                        <td className="px-3 py-3">
                          <Link to={`/projects/${p.slug}`} className="font-semibold text-slate-900 hover:text-amber-700">
                            {p.name}
                          </Link>
                          <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                            <span>{p.developer?.name}</span>
                            {p.city && <span>· {p.city}</span>}
                            {p.is_owned_by_realhunt && (
                              <span className="text-[9px] tracking-widest uppercase px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                                Owned by RH
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span className="text-xl leading-none mr-1">{p.country.flag_emoji}</span>
                          <span className="text-xs text-slate-600 hidden xl:inline">{p.country.name}</span>
                        </td>
                        <td className="px-3 py-3"><div className="flex justify-center"><ScoreRing score={Number(s?.weighted_score || 0)} /></div></td>
                        <td className="px-3 py-3 hidden md:table-cell"><div className="flex justify-center"><ScoreRing size="sm" score={Number(s?.dim_developer_reputation || 0)} /></div></td>
                        <td className="px-3 py-3 hidden md:table-cell"><div className="flex justify-center"><ScoreRing size="sm" score={Number(s?.dim_delivery_certainty || 0)} /></div></td>
                        <td className="px-3 py-3 hidden lg:table-cell"><div className="flex justify-center"><ScoreRing size="sm" score={Number(s?.dim_legal_protection || 0)} /></div></td>
                        <td className="px-3 py-3 hidden lg:table-cell"><div className="flex justify-center"><ScoreRing size="sm" score={Number(s?.dim_location_fundamentals || 0)} /></div></td>
                        <td className="px-3 py-3 hidden lg:table-cell"><div className="flex justify-center"><ScoreRing size="sm" score={Number(s?.dim_investment_economics || 0)} /></div></td>
                        <td className="px-3 py-3 text-right text-slate-700 font-mono tabular-nums hidden md:table-cell">{fmtEur(p.ticket_min_eur)}</td>
                        <td className="px-3 py-3 text-center">
                          <Link
                            to={`/projects/${p.slug}`}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 text-slate-500 hover:border-slate-900 hover:text-slate-900"
                            aria-label="View"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Submit any URL section — viral acquisition */}
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 md:p-10 shadow-sm">
            <div className="flex items-center gap-2 text-amber-600 text-[11px] tracking-[0.25em] uppercase font-semibold mb-3">
              <Sparkles className="h-3.5 w-3.5" /> Score any development
            </div>
            <h2 className="font-serif text-3xl md:text-4xl text-slate-900 leading-tight max-w-3xl">
              Paste a link to any off-plan project website. We'll score it and add it to the index.
            </h2>
            <p className="text-slate-600 mt-4 max-w-2xl">
              Brokers and analysts use this to instantly evaluate any new launch. The scoring is independent — based only on what's public on the developer's website. Free for everyone.
            </p>
            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <input
                value={submitUrl}
                onChange={(e) => setSubmitUrl(e.target.value)}
                placeholder="https://developer-website.com/project-name"
                className="flex-1 h-12 px-4 rounded-md border border-slate-300 bg-white text-sm focus:border-slate-900 outline-none"
                onKeyDown={(e) => e.key === "Enter" && handleSubmitUrl()}
              />
              <button
                onClick={handleSubmitUrl}
                disabled={submitLoading}
                className="h-12 px-6 rounded-md bg-slate-900 text-white font-semibold hover:bg-slate-800 transition inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {submitLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Scoring…</> : <>Generate score <ArrowRight className="h-4 w-4" /></>}
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              We auto-detect if the URL is an off-plan development. Scoring takes ~30 seconds.
            </p>
          </div>
        </div>
      </section>

      {/* Methodology */}
      <section className="border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <p className="text-[11px] tracking-[0.25em] uppercase text-amber-600 font-semibold mb-3">
            The methodology
          </p>
          <h2 className="font-serif text-3xl md:text-5xl text-slate-900 max-w-3xl leading-tight">
            Five dimensions. One score. Public weights.
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-12">
            {[
              { d: "Developer reputation", w: "20%", desc: "Track record, delivered units, default history." },
              { d: "Delivery certainty", w: "25%", desc: "Construction progress, escrow, regulator status." },
              { d: "Legal protection", w: "15%", desc: "Title, jurisdiction, escrow law, buyer recourse." },
              { d: "Location fundamentals", w: "20%", desc: "Demand, infrastructure, supply pipeline." },
              { d: "Investment economics", w: "20%", desc: "Yield, exit liquidity, payment plan, ticket fit." },
            ].map((d, i) => (
              <div key={d.d} className="rounded-lg border border-slate-200 bg-white p-5">
                <div className="text-[10px] tracking-widest uppercase text-slate-400">Dim. {i + 1}</div>
                <div className="font-mono text-2xl text-amber-600 mt-2">{d.w}</div>
                <h4 className="font-serif text-lg text-slate-900 mt-3">{d.d}</h4>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">{d.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <h2 className="font-serif text-3xl md:text-4xl text-slate-900 max-w-3xl">Four principles. No exceptions.</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
            {[
              { icon: Eye, title: "Public methodology", body: "Five dimensions. Documented weights. Reproducible by anyone." },
              { icon: Scale, title: "Independent ranking", body: "Developers cannot pay for placement. Owned-by-RH projects flagged." },
              { icon: ShieldCheck, title: "Real commission data", body: "Live percentages, milestones. Sourced from signed agreements." },
              { icon: Ban, title: "Free for agents", body: "Verified agents access everything for free. We monetize developers." },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-lg border border-slate-200 bg-white p-6">
                <Icon className="h-5 w-5 text-amber-600 mb-4" />
                <h3 className="font-serif text-lg text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Home Score callout */}
      <section className="border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-16 grid md:grid-cols-[1.2fr_1fr] gap-10 items-center">
          <div>
            <p className="text-[11px] tracking-[0.25em] uppercase text-amber-600 font-semibold mb-3">
              Individual property tool
            </p>
            <h2 className="font-serif text-3xl md:text-4xl text-slate-900 leading-tight">
              Want to score a single home, not a whole development?
            </h2>
            <p className="text-slate-600 mt-4 text-lg">
              Use <span className="font-semibold text-slate-900">Home Score</span> — our forensic tool for individual listings on Zillow, Idealista, Rightmove and 100+ portals.
            </p>
            <Link
              to="/homescoring"
              className="inline-flex items-center gap-2 mt-6 px-5 py-3 rounded-md border border-slate-900 text-slate-900 font-semibold hover:bg-slate-900 hover:text-white transition"
            >
              Open Home Score <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
            <div className="flex items-center gap-4">
              <ScoreRing score={8.7} size="lg" />
              <div>
                <div className="font-mono text-xs text-slate-500">SAMPLE</div>
                <div className="font-serif text-lg text-slate-900">Penthouse · Marbella</div>
                <div className="text-xs text-slate-500">€1.2M · Verdict: Exceptional</div>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-2 mt-5">
              {[8.6, 9.1, 8.4, 8.8, 8.5].map((v, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <ScoreRing size="sm" score={v} />
                  <span className="text-[9px] uppercase tracking-wider text-slate-400">D{i + 1}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA strip */}
      <section className="bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-6 py-14 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h3 className="font-serif text-2xl md:text-3xl">Free forever for verified agents.</h3>
            <p className="text-white/60 mt-1 text-sm">Save favorites, contact developers, reserve allocation slots.</p>
          </div>
          <Link
            to="/apply"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-amber-500 text-slate-900 font-semibold hover:bg-amber-400"
          >
            Apply as agent <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <RHFooter />
      <LoginGateModal open={loginOpen} onClose={() => setLoginOpen(false)} onSuccess={() => setLoginOpen(false)} />
    </div>
  );
};

export default IndexNew;
