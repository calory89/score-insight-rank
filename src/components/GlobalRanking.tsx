import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Globe, TrendingUp, MapPin, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type RankedProperty = {
  id: string;
  city: string | null;
  country: string | null;
  address: string | null;
  global_score: number | null;
  roi_potential: number | null;
  verdict: string | null;
  price: string | null;
};

const scoreColor = (v: number) => {
  if (v >= 80) return "text-score-excellent";
  if (v >= 65) return "text-score-good";
  if (v >= 50) return "text-score-average";
  return "text-score-poor";
};

const GlobalRanking = () => {
  const [rankings, setRankings] = useState<RankedProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [countries, setCountries] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>("All");
  const [selectedCity, setSelectedCity] = useState<string>("All");

  useEffect(() => {
    loadRankings();
  }, []);

  const loadRankings = async () => {
    const { data } = await supabase
      .from("analyses")
      .select("id, city, country, address, global_score, roi_potential, verdict, price")
      .not("global_score", "is", null)
      .order("global_score", { ascending: false })
      .limit(100);

    if (data) {
      setRankings(data);
      const uniqueCountries = [...new Set(data.map((d) => d.country).filter(Boolean))] as string[];
      setCountries(uniqueCountries.sort());
      const uniqueCities = [...new Set(data.map((d) => d.city).filter(Boolean))] as string[];
      setCities(uniqueCities.sort());
    }
    setLoading(false);
  };

  const filtered = rankings.filter((r) => {
    if (selectedCountry !== "All" && r.country !== selectedCountry) return false;
    if (selectedCity !== "All" && r.city !== selectedCity) return false;
    return true;
  });

  const availableCities = selectedCountry === "All"
    ? cities
    : [...new Set(rankings.filter((r) => r.country === selectedCountry).map((r) => r.city).filter(Boolean))] as string[];

  return (
    <section id="rankings" className="py-24 md:py-32 relative">
      <div className="absolute inset-0 bg-gradient-hero opacity-30" />
      <div className="container relative mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-6"
        >
          <div className="inline-flex items-center gap-2 mb-4">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Live Global Rankings</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Top Performing Properties Worldwide
          </h2>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto mb-1">
            Based on {rankings.length > 0 ? `${rankings.length}+` : "all"} analyses generated worldwide. Updated in real-time.
          </p>
          <p className="text-xs text-muted-foreground">
            No sponsored placements. Rankings are purely data-driven.
          </p>
        </motion.div>

        {/* Filters */}
        <div className="flex items-center justify-center gap-2 mb-10 flex-wrap">
          <select
            value={selectedCountry}
            onChange={(e) => {
              setSelectedCountry(e.target.value);
              setSelectedCity("All");
            }}
            className="rounded-full text-xs px-3 py-1.5 bg-secondary text-foreground border border-border focus:outline-none focus:border-primary/40"
          >
            <option value="All">🌍 All Countries</option>
            {countries.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="rounded-full text-xs px-3 py-1.5 bg-secondary text-foreground border border-border focus:outline-none focus:border-primary/40"
          >
            <option value="All">All Cities</option>
            {availableCities.map((c) => (
              <option key={c} value={c!}>{c}</option>
            ))}
          </select>
        </div>

        {/* Rankings Table */}
        <div className="max-w-3xl mx-auto">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="hidden sm:grid grid-cols-12 gap-4 px-5 py-3 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <div className="col-span-1">#</div>
              <div className="col-span-5">Location</div>
              <div className="col-span-2 text-center">Score</div>
              <div className="col-span-2 text-center">Price</div>
              <div className="col-span-2 text-right">Verdict</div>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="h-5 w-5 rounded-full border-2 border-t-primary border-border animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">
                No analyses found{selectedCountry !== "All" ? ` in ${selectedCountry}` : ""}. Be the first!
              </div>
            ) : (
              filtered.slice(0, 20).map((prop, i) => (
                <motion.div
                  key={prop.id}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="flex sm:grid sm:grid-cols-12 gap-3 sm:gap-4 px-4 sm:px-5 py-3 sm:py-4 border-b border-border/50 last:border-0 hover:bg-secondary/30 transition-colors items-center"
                >
                  <div className="hidden sm:block sm:col-span-1 font-mono text-sm text-muted-foreground">{i + 1}</div>
                  <div className="flex-1 sm:col-span-5 flex items-center gap-2 min-w-0">
                    <span className="sm:hidden font-mono text-xs text-muted-foreground">{i + 1}.</span>
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 hidden sm:block" />
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-foreground truncate block">
                        {prop.address || `${prop.city}, ${prop.country}`}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{prop.city}, {prop.country}</span>
                    </div>
                  </div>
                  <div className="sm:col-span-2 text-center">
                    <span className={`inline-flex items-center justify-center h-7 w-12 rounded-md bg-primary/10 font-mono text-sm font-semibold ${scoreColor(prop.global_score || 0)}`}>
                      {prop.global_score}
                    </span>
                  </div>
                  <div className="hidden sm:block sm:col-span-2 text-center font-mono text-sm text-foreground truncate">{prop.price || "—"}</div>
                  <div className="sm:col-span-2 text-right">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      prop.verdict === "Strong" ? "text-score-excellent bg-score-excellent/10" :
                      prop.verdict === "Moderate" ? "text-score-average bg-score-average/10" :
                      "text-score-poor bg-score-poor/10"
                    }`}>
                      {prop.verdict || "—"}
                    </span>
                  </div>
                </motion.div>
              ))
            )}
          </div>
          <p className="text-[11px] text-muted-foreground text-center mt-3">
            Real-time performance ranking across global markets. Powered by community analyses.
          </p>
        </div>
      </div>
    </section>
  );
};

export default GlobalRanking;
