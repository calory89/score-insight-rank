import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Globe, TrendingUp, MapPin, Filter, ArrowRight, Search } from "lucide-react";
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

const scoreBg = (v: number) => {
  if (v >= 80) return "bg-score-excellent/10";
  if (v >= 65) return "bg-score-good/10";
  if (v >= 50) return "bg-score-average/10";
  return "bg-score-poor/10";
};

const RankingSearchBar = () => {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");

  const handleAnalyze = () => {
    if (!url.trim()) return;
    navigate(`/analysis/loading?url=${encodeURIComponent(url.trim())}`);
  };

  return (
    <div className="space-y-2">
      <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center bg-card rounded-xl border border-border p-2">
        <div className="flex items-center flex-1 min-w-0">
          <Search className="ml-3 h-4 w-4 text-muted-foreground flex-shrink-0" />
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
            placeholder="Paste any property URL to get its score…"
            className="flex-1 bg-transparent px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none min-w-0"
          />
        </div>
        <Button variant="hero" size="sm" className="rounded-lg px-4 flex-shrink-0" onClick={handleAnalyze}>
          Analyze <ArrowRight className="ml-1 h-3 w-3" />
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground text-center">
        No sponsors. No ads. Every ranking is created by real user searches. Paste any URL and contribute.
      </p>
    </div>
  );
};

const GlobalRanking = () => {
  const navigate = useNavigate();
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
    <section id="rankings" className="py-10 md:py-16 relative">
      <div className="absolute inset-0 bg-gradient-hero opacity-30" />
      <div className="container relative mx-auto px-4">
        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-6">
          <RankingSearchBar />
        </div>

        <div className="text-center mb-4">
          <h2 className="text-xl md:text-2xl font-bold text-foreground mb-1">
            Top Properties Worldwide
          </h2>
          <p className="text-[11px] text-muted-foreground">
            Real-time rankings. No sponsors. Data-driven.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center justify-center gap-2 mb-4 flex-wrap">
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
            <div className="hidden sm:grid grid-cols-12 gap-2 px-4 py-2 border-b border-border text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
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
              filtered.slice(0, 30).map((prop, i) => (
                <div
                  key={prop.id}
                  onClick={() => navigate(`/analysis/${prop.id}`)}
                  className="grid grid-cols-[1.5rem_1fr_auto_auto_auto] sm:grid-cols-12 gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 border-b border-border/50 last:border-0 hover:bg-secondary/30 transition-colors items-center cursor-pointer group"
                >
                  <div className="font-mono text-[11px] text-muted-foreground">{i + 1}</div>
                  <div className="flex items-center gap-1.5 min-w-0 sm:col-span-5">
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-medium text-foreground truncate block">
                        {prop.address || `${prop.city}, ${prop.country}`}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{prop.city}, {prop.country}</span>
                    </div>
                  </div>
                  <div className="sm:col-span-2 text-center">
                    <span className={`inline-flex items-center justify-center h-6 w-10 rounded font-mono text-xs font-semibold ${scoreBg(prop.global_score || 0)} ${scoreColor(prop.global_score || 0)}`}>
                      {prop.global_score}
                    </span>
                  </div>
                  <div className="sm:col-span-2 text-center font-mono text-[10px] sm:text-xs text-muted-foreground sm:text-foreground truncate max-w-[4.5rem] sm:max-w-none">{prop.price || "—"}</div>
                  <div className="sm:col-span-2 text-right flex items-center justify-end gap-1.5">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                      prop.verdict === "Exceptional" ? "text-score-excellent bg-score-excellent/10" :
                      prop.verdict === "Strong" ? "text-score-good bg-score-good/10" :
                      prop.verdict === "Moderate" ? "text-score-average bg-score-average/10" :
                      "text-score-poor bg-score-poor/10"
                    }`}>
                      {prop.verdict || "—"}
                    </span>
                    <ArrowRight className="h-2.5 w-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block" />
                  </div>
                </div>
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
