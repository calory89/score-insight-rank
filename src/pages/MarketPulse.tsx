import { useEffect, useState } from "react";
import useDocumentMeta from "@/hooks/useDocumentMeta";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { MapPin, BarChart3, TrendingUp, ArrowLeft, Search, Home, Shield, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, PieChart, Pie } from "recharts";
import { scoreColor as getScoreColor } from "@/lib/score-utils";

const MarketPulse = () => {
  const { country, city } = useParams();
  const navigate = useNavigate();
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const cityName = decodeURIComponent(city || "");
  const countryName = decodeURIComponent(country || "");
  const displayCity = cityName.charAt(0).toUpperCase() + cityName.slice(1);
  const displayCountry = countryName.charAt(0).toUpperCase() + countryName.slice(1);

  useDocumentMeta({
    title: `${displayCity} Real Estate Intelligence | RealHunt`,
    description: `Market intelligence for ${displayCity}, ${displayCountry}. Average scores, price analysis, top properties, and investment insights based on AI-powered analysis.`,
    canonicalUrl: `https://score-insight-rank.lovable.app/market/${country}/${city}`,
  });

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("analyses")
        .select("id, address, city, country, global_score, price, currency, verdict, property_type, roi_potential, market_stability, demand_strength, risk_level, liquidity_outlook, image_url, slug, created_at")
        .ilike("city", cityName)
        .ilike("country", countryName)
        .not("global_score", "is", null)
        .order("global_score", { ascending: false });
      setAnalyses(data || []);
      setLoading(false);
    };
    fetch();
  }, [cityName, countryName]);

  const avgScore = analyses.length > 0 ? Math.round(analyses.reduce((s, a) => s + (a.global_score || 0), 0) / analyses.length) : 0;
  const avgROI = analyses.filter(a => a.roi_potential).length > 0
    ? Math.round(analyses.filter(a => a.roi_potential).reduce((s, a) => s + a.roi_potential, 0) / analyses.filter(a => a.roi_potential).length)
    : null;

  // Score distribution
  const scoreBuckets = [
    { range: "0-30", min: 0, max: 30, count: 0, fill: "hsl(var(--score-bad))" },
    { range: "31-50", min: 31, max: 50, count: 0, fill: "hsl(var(--score-poor))" },
    { range: "51-65", min: 51, max: 65, count: 0, fill: "hsl(var(--score-average))" },
    { range: "66-80", min: 66, max: 80, count: 0, fill: "hsl(var(--score-good))" },
    { range: "81-100", min: 81, max: 100, count: 0, fill: "hsl(var(--primary))" },
  ];
  analyses.forEach(a => {
    const bucket = scoreBuckets.find(b => a.global_score >= b.min && a.global_score <= b.max);
    if (bucket) bucket.count++;
  });

  // Verdict distribution
  const verdicts: Record<string, number> = {};
  analyses.forEach(a => { if (a.verdict) verdicts[a.verdict] = (verdicts[a.verdict] || 0) + 1; });
  const verdictData = Object.entries(verdicts).map(([name, value]) => ({ name, value }));
  const verdictColors = ["hsl(var(--primary))", "hsl(var(--score-good))", "hsl(var(--score-average))", "hsl(var(--score-poor))", "hsl(var(--score-bad))"];

  const top5 = analyses.slice(0, 5);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-32">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto">
          <button onClick={() => navigate("/market")} className="text-xs text-muted-foreground hover:text-foreground transition-colors mb-4 flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> All Markets
          </button>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-1">{displayCity}, {displayCountry}</h1>
            <p className="text-muted-foreground text-sm">
              Real estate market intelligence based on {analyses.length} AI-powered analyses.
            </p>
          </div>

          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-32 rounded-xl bg-secondary animate-pulse" />)}
            </div>
          ) : analyses.length === 0 ? (
            <div className="text-center py-20">
              <MapPin className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">No analyses found for {displayCity}.</p>
              <Button variant="hero" className="mt-4" onClick={() => navigate("/")}>
                Analyze a property <Search className="ml-2 h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              {/* Stats cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                {[
                  { label: "Avg Score", value: avgScore, icon: BarChart3, color: getScoreColor(avgScore) },
                  { label: "Total Analyses", value: analyses.length, icon: Home, color: "text-foreground" },
                  { label: "Avg ROI Potential", value: avgROI ? `${avgROI}/100` : "N/A", icon: DollarSign, color: avgROI ? getScoreColor(avgROI) : "text-muted-foreground" },
                  { label: "Top Score", value: analyses[0]?.global_score || "—", icon: TrendingUp, color: "text-primary" },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <stat.icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{stat.label}</span>
                    </div>
                    <p className={`text-2xl font-bold font-mono ${stat.color}`}>{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Score Distribution */}
              <div className="rounded-xl border border-border bg-card p-5 mb-6">
                <h2 className="text-sm font-semibold text-foreground mb-4">Score Distribution</h2>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={scoreBuckets}>
                    <XAxis dataKey="range" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {scoreBuckets.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Verdict breakdown */}
              {verdictData.length > 0 && (
                <div className="rounded-xl border border-border bg-card p-5 mb-6">
                  <h2 className="text-sm font-semibold text-foreground mb-4">Verdict Breakdown</h2>
                  <div className="flex items-center gap-6">
                    <ResponsiveContainer width={140} height={140}>
                      <PieChart>
                        <Pie data={verdictData} dataKey="value" cx="50%" cy="50%" outerRadius={60} innerRadius={35}>
                          {verdictData.map((_, i) => (
                            <Cell key={i} fill={verdictColors[i % verdictColors.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2">
                      {verdictData.map((v, i) => (
                        <div key={v.name} className="flex items-center gap-2 text-xs">
                          <div className="h-2.5 w-2.5 rounded-full" style={{ background: verdictColors[i % verdictColors.length] }} />
                          <span className="text-muted-foreground">{v.name}</span>
                          <span className="font-mono font-semibold text-foreground">{v.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Top properties */}
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-foreground mb-4">Top Rated Properties</h2>
                <div className="space-y-3">
                  {top5.map((a, i) => (
                    <motion.button
                      key={a.id}
                      whileHover={{ scale: 1.01 }}
                      onClick={() => navigate(a.slug ? `/r/${a.slug}` : `/analysis/${a.id}`)}
                      className="w-full text-left rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-all flex items-center gap-4 group"
                    >
                      <div className={`text-lg font-bold font-mono ${getScoreColor(a.global_score)}`}>
                        {a.global_score}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{a.address || `Property #${i + 1}`}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.property_type && `${a.property_type} · `}{a.price && `${a.currency || "€"}${a.price}`}
                        </p>
                      </div>
                      {a.verdict && (
                        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{a.verdict}</span>
                      )}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
                <h3 className="text-lg font-semibold text-foreground mb-2">Analyze a property in {displayCity}</h3>
                <p className="text-sm text-muted-foreground mb-4">Get an AI-powered investment score in 30 seconds.</p>
                <Button variant="hero" onClick={() => navigate("/")}>
                  <Search className="h-4 w-4 mr-2" /> Start Analysis
                </Button>
              </div>
            </>
          )}
        </motion.div>

        {/* JSON-LD */}
        {analyses.length > 0 && (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Place",
            name: `${displayCity}, ${displayCountry}`,
            description: `Real estate market intelligence for ${displayCity}. Average investment score: ${avgScore}/100 based on ${analyses.length} analyses.`,
            geo: { "@type": "GeoCoordinates" },
            additionalProperty: [
              { "@type": "PropertyValue", name: "Average Investment Score", value: avgScore },
              { "@type": "PropertyValue", name: "Total Analyses", value: analyses.length },
            ],
          }) }} />
        )}
      </div>
      <Footer />
      <BottomNav />
    </div>
  );
};

export default MarketPulse;
