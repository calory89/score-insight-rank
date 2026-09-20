import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, Building2, Calendar, Euro, AlertCircle, ExternalLink, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import RHNav from "@/components/realhunt/RHNav";
import RHFooter from "@/components/realhunt/RHFooter";
import ScoreRing from "@/components/realhunt/ScoreRing";
import useDocumentMeta from "@/hooks/useDocumentMeta";

const ProjectDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const [p, setP] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useDocumentMeta({
    title: p ? `${p.name} — RealHunt Score` : "Project — RealHunt",
    description: p?.description || "Independent off-plan property scoring.",
    ogType: "product",
    jsonLd: p
      ? {
          "@context": "https://schema.org",
          "@type": "Product",
          name: p.name,
          ...(p.description ? { description: p.description } : {}),
          ...(p.developer?.name ? { brand: { "@type": "Brand", name: p.developer.name } } : {}),
          url: `https://realhunt.co/projects/${p.slug || slug}`,
        }
      : null,
  });

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("projects")
        .select(
          "*,developer:developers(name,slug,website,founded_year,projects_delivered),country:countries(name,slug,flag_emoji,golden_visa_eligible),score:project_scores(*),commission:commission_terms(*)"
        )
        .eq("slug", slug)
        .maybeSingle();
      const row = data ? { ...data, score: Array.isArray(data.score) ? data.score[0] : data.score, commission: Array.isArray(data.commission) ? data.commission[0] : data.commission } : null;
      setP(row);
      setLoading(false);
    })();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white"><RHNav />
        <div className="max-w-5xl mx-auto px-6 py-20 text-slate-400 text-sm">Loading project…</div>
        <RHFooter />
      </div>
    );
  }

  if (!p) {
    return (
      <div className="min-h-screen bg-white"><RHNav />
        <div className="max-w-5xl mx-auto px-6 py-20">
          <h1 className="font-serif text-3xl text-slate-900">Project not found</h1>
          <Link to="/" className="inline-flex items-center gap-2 mt-4 text-amber-700 hover:underline">
            <ArrowLeft className="h-4 w-4" /> Back to index
          </Link>
        </div>
        <RHFooter />
      </div>
    );
  }

  const s = p.score || {};
  const dims = [
    { k: "Developer reputation", v: s.dim_developer_reputation },
    { k: "Delivery certainty", v: s.dim_delivery_certainty },
    { k: "Legal protection", v: s.dim_legal_protection },
    { k: "Location fundamentals", v: s.dim_location_fundamentals },
    { k: "Investment economics", v: s.dim_investment_economics },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <RHNav />

      {/* Hero */}
      <section className="border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-10 grid md:grid-cols-[1.4fr_1fr] gap-10">
          <div>
            <Link to="/" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 mb-4">
              <ArrowLeft className="h-3.5 w-3.5" /> All projects
            </Link>
            <div className="text-[11px] tracking-[0.25em] uppercase text-amber-600 font-semibold mb-2">
              {p.country?.flag_emoji} {p.country?.name} · Rank #{s.rank_global ?? "—"}
            </div>
            <h1 className="font-serif text-4xl md:text-5xl text-slate-900 leading-[1.05]">{p.name}</h1>
            <div className="mt-3 text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="inline-flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> {p.developer?.name}</span>
              {p.city && <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {p.city}</span>}
              {p.delivery_quarter && <span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {p.delivery_quarter}</span>}
              {p.ticket_min_eur && <span className="inline-flex items-center gap-1.5"><Euro className="h-3.5 w-3.5" /> from €{(p.ticket_min_eur / 1000).toFixed(0)}k</span>}
            </div>
            {p.is_owned_by_realhunt && (
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-800 ring-1 ring-amber-200 rounded text-xs">
                <AlertCircle className="h-3.5 w-3.5" /> Owned by RealHunt — conflict disclosed
              </div>
            )}
            <p className="mt-6 text-slate-700 leading-relaxed max-w-2xl">
              {p.description || "Independent RealHunt evaluation across five public dimensions. Methodology and weights are open. Scores are calibrated against the global catalog so most projects fall between 4.5 and 7.5 — only truly exceptional projects exceed 8.5."}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 flex flex-col items-center">
            <div className="text-[10px] tracking-widest uppercase text-slate-500 mb-3">RealHunt weighted score</div>
            <ScoreRing score={Number(s.weighted_score || 0)} size="lg" />
            <div className="mt-4 text-xs text-slate-500 text-center max-w-xs">
              {Number(s.weighted_score || 0) >= 8.5
                ? "Exceptional — top decile globally."
                : Number(s.weighted_score || 0) >= 7
                ? "Strong — above average across most dimensions."
                : Number(s.weighted_score || 0) >= 5
                ? "Moderate — mixed picture, reviewers should dig in."
                : "Risky — clear weaknesses in at least one dimension."}
            </div>
          </div>
        </div>
        {p.hero_image_url && (
          <div className="border-t border-slate-200 bg-slate-50">
            <img src={p.hero_image_url} alt={p.name} className="w-full max-h-[420px] object-cover" />
          </div>
        )}
      </section>

      {/* Dimensions */}
      <section className="border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <h2 className="font-serif text-2xl text-slate-900 mb-6">Five-dimension breakdown</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {dims.map((d) => (
              <div key={d.k} className="rounded-lg border border-slate-200 bg-white p-5 flex flex-col items-center">
                <ScoreRing score={Number(d.v || 0)} />
                <div className="mt-3 text-xs text-slate-600 text-center">{d.k}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Developer + Country */}
      <section className="border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-12 grid md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-slate-200 p-6">
            <div className="text-[10px] tracking-widest uppercase text-slate-500 mb-2">Developer</div>
            <h3 className="font-serif text-xl text-slate-900">{p.developer?.name}</h3>
            <div className="mt-3 text-sm text-slate-600 space-y-1">
              {p.developer?.founded_year && <div>Founded {p.developer.founded_year}</div>}
              {typeof p.developer?.projects_delivered === "number" && <div>{p.developer.projects_delivered} projects delivered</div>}
              {p.developer?.website && (
                <a href={p.developer.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-amber-700 hover:underline">
                  Visit developer <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 p-6">
            <div className="text-[10px] tracking-widest uppercase text-slate-500 mb-2">Market context</div>
            <h3 className="font-serif text-xl text-slate-900">{p.country?.flag_emoji} {p.country?.name}</h3>
            <div className="mt-3 text-sm text-slate-600 space-y-1">
              {p.country?.golden_visa_eligible && <div className="inline-flex items-center gap-1 text-emerald-700"><ShieldCheck className="h-3.5 w-3.5" /> Golden Visa eligible</div>}
              {p.status && <div>Status: {p.status}</div>}
              {p.construction_pct !== null && p.construction_pct !== undefined && <div>Construction: {p.construction_pct}%</div>}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h3 className="font-serif text-2xl">Want commission terms or to reserve a slot?</h3>
            <p className="text-white/60 text-sm mt-1">Free for verified agents.</p>
          </div>
          <Link to="/apply" className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-amber-500 text-slate-900 font-semibold hover:bg-amber-400">
            Apply as agent
          </Link>
        </div>
      </section>

      <RHFooter />
    </div>
  );
};

export default ProjectDetail;
