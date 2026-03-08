import { useEffect, useState } from "react";
import useDocumentMeta from "@/hooks/useDocumentMeta";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { MapPin, BarChart3, TrendingUp, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CityData {
  city: string;
  country: string;
  count: number;
  avg_score: number;
}

const MarketDirectory = () => {
  useDocumentMeta({
    title: "Market Intelligence Directory | RealHunt",
    description: "Explore real estate market intelligence for cities worldwide. Compare average scores, prices, and investment opportunities across global markets.",
    canonicalUrl: "https://score-insight-rank.lovable.app/market",
  });

  const [cities, setCities] = useState<CityData[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCities = async () => {
      const { data } = await supabase
        .from("analyses")
        .select("city, country, global_score")
        .not("city", "is", null)
        .not("country", "is", null)
        .not("global_score", "is", null);

      if (data) {
        const grouped: Record<string, CityData> = {};
        data.forEach((a: any) => {
          const key = `${a.city?.toLowerCase()}-${a.country?.toLowerCase()}`;
          if (!grouped[key]) {
            grouped[key] = { city: a.city, country: a.country, count: 0, avg_score: 0 };
          }
          grouped[key].count++;
          grouped[key].avg_score += a.global_score || 0;
        });
        const result = Object.values(grouped)
          .map(g => ({ ...g, avg_score: Math.round(g.avg_score / g.count) }))
          .filter(g => g.count >= 1)
          .sort((a, b) => b.count - a.count);
        setCities(result);
      }
      setLoading(false);
    };
    fetchCities();
  }, []);

  const byCountry = cities.reduce<Record<string, CityData[]>>((acc, c) => {
    const country = c.country || "Other";
    if (!acc[country]) acc[country] = [];
    acc[country].push(c);
    return acc;
  }, {});

  const scoreColor = (s: number) =>
    s >= 75 ? "text-primary" : s >= 60 ? "text-score-good" : s >= 45 ? "text-score-average" : "text-score-poor";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-32">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto">
          <div className="mb-10">
            <h1 className="text-3xl font-bold text-foreground mb-2">Market Intelligence</h1>
            <p className="text-muted-foreground">
              Aggregated real estate intelligence across {cities.length} cities worldwide, powered by {cities.reduce((s, c) => s + c.count, 0)}+ analyses.
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                    <div className="h-3 w-3 bg-muted animate-pulse rounded" />
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="h-3 w-20 bg-muted animate-pulse rounded" />
                    <div className="h-3 w-16 bg-muted animate-pulse rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            Object.entries(byCountry)
              .sort(([, a], [, b]) => b.reduce((s, c) => s + c.count, 0) - a.reduce((s, c) => s + c.count, 0))
              .map(([country, countryCities]) => (
                <div key={country} className="mb-10">
                  <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" /> {country}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {countryCities.map((c) => (
                      <motion.button
                        key={`${c.city}-${c.country}`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => navigate(`/market/${encodeURIComponent(c.country.toLowerCase())}/${encodeURIComponent(c.city.toLowerCase())}`)}
                        className="text-left rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-all group"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-semibold text-foreground">{c.city}</h3>
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <BarChart3 className="h-3 w-3" /> {c.count} analyses
                          </span>
                          <span className={`flex items-center gap-1 font-mono font-semibold ${scoreColor(c.avg_score)}`}>
                            <TrendingUp className="h-3 w-3" /> {c.avg_score} avg
                          </span>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              ))
          )}
        </motion.div>

        {/* JSON-LD */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Real Estate Market Intelligence Directory",
          description: "Aggregated real estate intelligence across global cities",
          numberOfItems: cities.length,
          itemListElement: cities.slice(0, 20).map((c, i) => ({
            "@type": "ListItem",
            position: i + 1,
            item: {
              "@type": "Place",
              name: `${c.city}, ${c.country}`,
              url: `https://score-insight-rank.lovable.app/market/${encodeURIComponent(c.country.toLowerCase())}/${encodeURIComponent(c.city.toLowerCase())}`,
            },
          })),
        }) }} />
      </div>
      <Footer />
      <BottomNav />
    </div>
  );
};

export default MarketDirectory;
