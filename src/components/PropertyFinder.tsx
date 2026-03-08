import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Star, MapPin, ArrowRight, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { scoreColor } from "@/lib/score-utils";

const AMENITIES = [
  { id: "beach", label: "Beach Access", icon: "🏖️" },
  { id: "pool", label: "Pool", icon: "🏊" },
  { id: "gym", label: "Gym", icon: "🏋️" },
  { id: "coworking", label: "Coworking", icon: "💻" },
  { id: "rooftop", label: "Rooftop Terrace", icon: "🌇" },
  { id: "restaurant", label: "Restaurant", icon: "🍽️" },
  { id: "spa", label: "Spa", icon: "💆" },
  { id: "security", label: "24h Security", icon: "🔒" },
  { id: "parking", label: "Parking", icon: "🅿️" },
  { id: "garden", label: "Garden", icon: "🌿" },
  { id: "kids", label: "Kids Area", icon: "🧒" },
  { id: "pets", label: "Pet Friendly", icon: "🐾" },
  { id: "smart", label: "Smart Home", icon: "🏠" },
  { id: "concierge", label: "Concierge", icon: "🛎️" },
  { id: "ev", label: "EV Charging", icon: "⚡" },
  { id: "yoga", label: "Yoga Studio", icon: "🧘" },
];

const ECO_BEACH_CITY = {
  id: "eco-beach-city",
  address: "Eco Beach City — Luxury Beachfront Living",
  city: "Costa del Sol, Spain",
  price: "From €185,000",
  image_url: "/images/ecobeachcity-villas.png",
  global_score: 92,
  verdict: "Premium beachfront development with world-class amenities. Ideal for investors seeking high ROI in Southern Spain's booming coastal market.",
  amenities: AMENITIES.map((a) => a.id),
  url: "https://ecobeachcity.com",
};

const formatPrice = (val: number) => {
  if (val >= 1_000_000) return `€${(val / 1_000_000).toFixed(1)}M`;
  return `€${(val / 1_000).toFixed(0)}K`;
};

interface AnalysisResult {
  id: string;
  address: string | null;
  city: string | null;
  price: string | null;
  image_url: string | null;
  global_score: number | null;
  verdict: string | null;
  ai_summary: string | null;
  pros: any;
  slug: string | null;
}

const PropertyFinder = () => {
  const [maxPrice, setMaxPrice] = useState([500_000]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const toggleAmenity = (id: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const matchesAmenities = (item: AnalysisResult) => {
    if (selectedAmenities.length === 0) return true;
    const text = [
      item.ai_summary || "",
      item.verdict || "",
      JSON.stringify(item.pros || []),
      item.address || "",
    ]
      .join(" ")
      .toLowerCase();
    return selectedAmenities.some((amenityId) => {
      const amenity = AMENITIES.find((a) => a.id === amenityId);
      if (!amenity) return false;
      const keywords = amenity.label.toLowerCase().split(" ");
      return keywords.some((kw) => text.includes(kw));
    });
  };

  const handleSearch = async () => {
    setLoading(true);
    setSearched(true);
    try {
      const { data } = await supabase
        .from("analyses")
        .select("id, address, city, price, image_url, global_score, verdict, ai_summary, pros, slug")
        .order("global_score", { ascending: false, nullsFirst: false })
        .limit(50);

      const filtered = (data || []).filter((item) => {
        const priceNum = parseFloat((item.price || "0").replace(/[^0-9.]/g, ""));
        if (priceNum > maxPrice[0] || priceNum === 0) return false;
        return matchesAmenities(item);
      });

      setResults(filtered.slice(0, 20));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const ecoMatchesFilters =
    selectedAmenities.length === 0 ||
    selectedAmenities.every((a) => ECO_BEACH_CITY.amenities.includes(a));

  return (
    <section className="py-16 md:py-20" id="property-finder">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="text-center mb-10">
          <span className="text-3xl mb-3 block">🔍</span>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Find Your Dream Property
          </h2>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            Set your budget and desired amenities — we'll show you the best matches from our database of analyzed properties.
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-8 border-primary/20">
          <CardContent className="p-6 space-y-6">
            {/* Price slider */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-foreground">Max Budget</label>
                <span className="text-lg font-bold text-primary">{formatPrice(maxPrice[0])}</span>
              </div>
              <Slider
                value={maxPrice}
                onValueChange={setMaxPrice}
                min={50_000}
                max={5_000_000}
                step={25_000}
              />
              <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                <span>€50K</span>
                <span>€5M</span>
              </div>
            </div>

            {/* Amenities */}
            <div>
              <label className="text-sm font-medium text-foreground mb-3 block">Amenities</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {AMENITIES.map((amenity) => (
                  <label
                    key={amenity.id}
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all text-xs ${
                      selectedAmenities.includes(amenity.id)
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border hover:border-primary/40 text-muted-foreground"
                    }`}
                  >
                    <Checkbox
                      checked={selectedAmenities.includes(amenity.id)}
                      onCheckedChange={() => toggleAmenity(amenity.id)}
                      className="h-3.5 w-3.5"
                    />
                    <span>{amenity.icon}</span>
                    <span className="truncate">{amenity.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {selectedAmenities.length > 0 && (
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => setSelectedAmenities([])}>
                  <X className="h-3 w-3 mr-1" /> Clear filters
                </Button>
              )}
              <Button variant="hero" size="lg" className="flex-1" onClick={handleSearch} disabled={loading}>
                {loading ? (
                  <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Search Properties
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <AnimatePresence>
          {searched && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-muted-foreground">
                {ecoMatchesFilters ? 1 + results.length : results.length} properties found
              </motion.p>

              {/* Eco Beach City — always first */}
              {ecoMatchesFilters && (
                <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
                  <Card className="overflow-hidden border-2 border-yellow-500/50 bg-gradient-to-r from-yellow-500/5 to-primary/5 relative">
                    <div className="absolute top-3 left-3 z-10">
                      <Badge className="bg-yellow-500 text-yellow-950 font-bold text-[10px] gap-1">
                        <Star className="h-3 w-3 fill-current" /> TOP PICK
                      </Badge>
                    </div>
                    <div className="flex flex-col md:flex-row">
                      <div className="md:w-72 h-48 md:h-auto">
                        <img
                          src={ECO_BEACH_CITY.image_url}
                          alt="Eco Beach City"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <CardContent className="flex-1 p-5">
                        <div className="flex items-start justify-between mb-2 mt-4 md:mt-0">
                          <div>
                            <h3 className="font-bold text-foreground text-lg">{ECO_BEACH_CITY.address}</h3>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {ECO_BEACH_CITY.city}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-primary">{ECO_BEACH_CITY.global_score}</div>
                            <div className="text-[10px] text-muted-foreground">Score</div>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{ECO_BEACH_CITY.verdict}</p>
                        <div className="flex flex-wrap gap-1 mb-4">
                          {AMENITIES.slice(0, 8).map((a) => (
                            <span key={a.id} className="text-[10px] bg-secondary px-2 py-0.5 rounded-full">
                              {a.icon} {a.label}
                            </span>
                          ))}
                          <span className="text-[10px] bg-secondary px-2 py-0.5 rounded-full">+{AMENITIES.length - 8} more</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-foreground">{ECO_BEACH_CITY.price}</span>
                          <Button
                            variant="hero"
                            size="sm"
                            onClick={() => window.open(ECO_BEACH_CITY.url, "_blank")}
                          >
                            View Project <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                </motion.div>
              )}

              {/* DB results */}
              {results.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card
                    className="overflow-hidden hover:border-primary/30 transition-colors cursor-pointer"
                    onClick={() => navigate(item.slug ? `/r/${item.slug}` : `/analysis/${item.id}`)}
                  >
                    <div className="flex flex-col sm:flex-row">
                      {item.image_url && (
                        <div className="sm:w-40 h-32 sm:h-auto">
                          <img src={item.image_url} alt={item.address || ""} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <CardContent className="flex-1 p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-foreground text-sm">{item.address || "Property"}</h3>
                            {item.city && (
                              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> {item.city}
                              </p>
                            )}
                          </div>
                          {item.global_score && (
                            <div className="text-right">
                              <div className={`text-xl font-bold ${scoreColor(item.global_score)}`}>{item.global_score}</div>
                              <div className="text-[10px] text-muted-foreground">Score</div>
                            </div>
                          )}
                        </div>
                        {item.verdict && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{item.verdict}</p>
                        )}
                        {item.price && (
                          <p className="text-sm font-bold text-foreground mt-2">{item.price}</p>
                        )}
                      </CardContent>
                    </div>
                  </Card>
                </motion.div>
              ))}

              {results.length === 0 && !ecoMatchesFilters && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16 rounded-2xl border border-dashed border-border bg-secondary/20">
                  <Search className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-sm font-medium text-foreground mb-1">No properties match your filters</p>
                  <p className="text-xs text-muted-foreground mb-4">Try increasing your budget or removing some amenity filters.</p>
                  <Button variant="ghost" size="sm" onClick={() => { setSelectedAmenities([]); setMaxPrice([2_000_000]); }}>
                    Reset Filters
                  </Button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};

export default PropertyFinder;
