import { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import useDocumentMeta from "@/hooks/useDocumentMeta";
import { motion } from "framer-motion";
import { Map, Filter, TrendingUp, Shield, Zap, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { scoreColor } from "@/lib/score-utils";
import { useNavigate } from "react-router-dom";
import "leaflet/dist/leaflet.css";

// Known city coordinates for fast lookup (no external API needed)
const CITY_COORDS: Record<string, [number, number]> = {
  "madrid": [40.4168, -3.7038], "barcelona": [41.3874, 2.1686], "malaga": [36.7213, -4.4214],
  "valencia": [39.4699, -0.3763], "seville": [37.3891, -5.9845], "alicante": [38.3452, -0.4810],
  "marbella": [36.5105, -4.8820], "palma": [39.5696, 2.6502], "lisbon": [38.7223, -9.1393],
  "porto": [41.1579, -8.6291], "faro": [37.0194, -7.9322], "paris": [48.8566, 2.3522],
  "nice": [43.7102, 7.2620], "lyon": [45.7640, 4.8357], "london": [51.5074, -0.1278],
  "manchester": [53.4808, -2.2426], "edinburgh": [55.9533, -3.1883], "rome": [41.9028, 12.4964],
  "milan": [45.4642, 9.1900], "florence": [43.7696, 11.2558], "naples": [40.8518, 14.2681],
  "berlin": [52.5200, 13.4050], "munich": [48.1351, 11.5820], "amsterdam": [52.3676, 4.9041],
  "dubai": [25.2048, 55.2708], "abu dhabi": [24.4539, 54.3773], "istanbul": [41.0082, 28.9784],
  "athens": [37.9838, 23.7275], "zurich": [47.3769, 8.5417], "geneva": [46.2044, 6.1432],
  "vienna": [48.2082, 16.3738], "prague": [50.0755, 14.4378], "budapest": [47.4979, 19.0402],
  "warsaw": [52.2297, 21.0122], "copenhagen": [55.6761, 12.5683], "stockholm": [59.3293, 18.0686],
  "oslo": [59.9139, 10.7522], "helsinki": [60.1699, 24.9384], "dublin": [53.3498, -6.2603],
  "brussels": [50.8503, 4.3517], "new york": [40.7128, -74.0060], "miami": [25.7617, -80.1918],
  "los angeles": [34.0522, -118.2437], "bangkok": [13.7563, 100.5018], "singapore": [1.3521, 103.8198],
  "tokyo": [35.6762, 139.6503], "sydney": [-33.8688, 151.2093], "melbourne": [-37.8136, 144.9631],
  "toronto": [43.6532, -79.3832], "mexico city": [19.4326, -99.1332], "bogota": [4.7110, -74.0721],
  "buenos aires": [-34.6037, -58.3816], "santiago": [-33.4489, -70.6693], "lima": [-12.0464, -77.0428],
  "cape town": [-33.9249, 18.4241], "nairobi": [-1.2921, 36.8219], "cairo": [30.0444, 31.2357],
  "marrakech": [31.6295, -7.9811], "tenerife": [28.2916, -16.6291], "ibiza": [38.9067, 1.4206],
  "gran canaria": [27.9202, -15.5474], "torrevieja": [37.9786, -0.6822], "benidorm": [38.5341, -0.1312],
  "estepona": [36.4263, -5.1458], "fuengirola": [36.5440, -4.6249], "nerja": [36.7440, -3.8766],
  "cadiz": [36.5298, -6.2926], "granada": [37.1773, -3.5986], "bilbao": [43.2630, -2.9350],
  "san sebastian": [43.3183, -1.9812], "zaragoza": [41.6488, -0.8891], "cordoba": [37.8882, -4.7794],
  "murcia": [37.9922, -1.1307], "the hague": [52.0705, 4.3007], "rotterdam": [51.9244, 4.4777],
  "tel aviv": [32.0853, 34.7818], "kuala lumpur": [3.1390, 101.6869], "ho chi minh city": [10.8231, 106.6297],
  "bali": [-8.3405, 115.0920], "phuket": [7.8804, 98.3923], "chiang mai": [18.7883, 98.9853],
};

// Country center fallbacks
const COUNTRY_COORDS: Record<string, [number, number]> = {
  "spain": [40.4637, -3.7492], "portugal": [39.3999, -8.2245], "france": [46.2276, 2.2137],
  "uk": [55.3781, -3.4360], "italy": [41.8719, 12.5674], "germany": [51.1657, 10.4515],
  "netherlands": [52.1326, 5.2913], "uae": [23.4241, 53.8478], "turkey": [38.9637, 35.2433],
  "greece": [39.0742, 21.8243], "switzerland": [46.8182, 8.2275], "austria": [47.5162, 14.5501],
  "czech republic": [49.8175, 15.4730], "hungary": [47.1625, 19.5033], "poland": [51.9194, 19.1451],
  "denmark": [56.2639, 9.5018], "sweden": [60.1282, 18.6435], "norway": [60.4720, 8.4689],
  "finland": [61.9241, 25.7482], "ireland": [53.4129, -8.2439], "belgium": [50.5039, 4.4699],
  "usa": [37.0902, -95.7129], "thailand": [15.8700, 100.9925], "japan": [36.2048, 138.2529],
  "australia": [-25.2744, 133.7751], "canada": [56.1304, -106.3468], "mexico": [23.6345, -102.5528],
  "colombia": [4.5709, -74.2973], "argentina": [-38.4161, -63.6167], "chile": [-35.6751, -71.5430],
  "morocco": [31.7917, -7.0926], "south africa": [-30.5595, 22.9375], "kenya": [-0.0236, 37.9062],
  "egypt": [26.8206, 30.8025], "israel": [31.0461, 34.8516], "malaysia": [4.2105, 101.9758],
  "vietnam": [14.0583, 108.2772], "indonesia": [-0.7893, 113.9213], "singapore": [1.3521, 103.8198],
};

type MetricKey = "score" | "roi" | "risk";

interface CityCluster {
  city: string;
  country: string;
  lat: number;
  lng: number;
  count: number;
  avgScore: number;
  avgRoi: number;
  avgRisk: number;
  topProperty: { id: string; address: string; score: number; price: string | null };
}

function getCoords(city: string, country: string): [number, number] | null {
  const cityKey = city.toLowerCase().trim();
  if (CITY_COORDS[cityKey]) return CITY_COORDS[cityKey];
  const countryKey = country.toLowerCase().trim();
  if (COUNTRY_COORDS[countryKey]) {
    // Add small random offset so multiple cities in same country don't overlap
    const [lat, lng] = COUNTRY_COORDS[countryKey];
    return [lat + (Math.random() - 0.5) * 2, lng + (Math.random() - 0.5) * 2];
  }
  return null;
}

function metricColor(value: number, metric: MetricKey): string {
  if (metric === "risk") {
    if (value >= 70) return "#22c55e";
    if (value >= 40) return "#eab308";
    return "#ef4444";
  }
  if (value >= 75) return "#22c55e";
  if (value >= 50) return "#eab308";
  return "#ef4444";
}

function FitBounds({ clusters }: { clusters: CityCluster[] }) {
  const map = useMap();
  useEffect(() => {
    if (clusters.length === 0) return;
    const bounds = clusters.map(c => [c.lat, c.lng] as [number, number]);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 6 });
  }, [clusters, map]);
  return null;
}

const Heatmap = () => {
  useDocumentMeta({
    title: "Market Heatmap — Discover Investment Hotspots | RealHunt",
    description: "Interactive map showing analyzed properties worldwide, color-coded by score, ROI, and risk level. Discover real estate investment hotspots at a glance.",
  });

  const navigate = useNavigate();
  const [metric, setMetric] = useState<MetricKey>("score");

  const { data: clusters = [], isLoading } = useQuery({
    queryKey: ["heatmap-clusters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analyses")
        .select("id, city, country, global_score, roi_potential, risk_level, address, price")
        .not("city", "is", null)
        .not("global_score", "is", null);

      if (error) throw error;
      if (!data) return [];

      // Group by city+country
      const groups: Record<string, typeof data> = {};
      for (const row of data) {
        const key = `${(row.city || "").toLowerCase()}_${(row.country || "").toLowerCase()}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(row);
      }

      const result: CityCluster[] = [];
      for (const [, items] of Object.entries(groups)) {
        const first = items[0];
        const coords = getCoords(first.city || "", first.country || "");
        if (!coords) continue;

        const avgScore = Math.round(items.reduce((s, i) => s + (i.global_score || 0), 0) / items.length);
        const avgRoi = Math.round(items.reduce((s, i) => s + (i.roi_potential || 0), 0) / items.length);
        const avgRisk = Math.round(items.reduce((s, i) => s + (i.risk_level || 50), 0) / items.length);
        const top = items.sort((a, b) => (b.global_score || 0) - (a.global_score || 0))[0];

        result.push({
          city: first.city || "",
          country: first.country || "",
          lat: coords[0],
          lng: coords[1],
          count: items.length,
          avgScore,
          avgRoi,
          avgRisk,
          topProperty: { id: top.id, address: top.address || top.city || "", score: top.global_score || 0, price: top.price },
        });
      }
      return result;
    },
    staleTime: 5 * 60 * 1000,
  });

  const metricValue = (c: CityCluster) => {
    if (metric === "roi") return c.avgRoi;
    if (metric === "risk") return c.avgRisk;
    return c.avgScore;
  };

  const stats = useMemo(() => {
    if (!clusters.length) return { cities: 0, properties: 0, avgScore: 0 };
    return {
      cities: clusters.length,
      properties: clusters.reduce((s, c) => s + c.count, 0),
      avgScore: Math.round(clusters.reduce((s, c) => s + c.avgScore, 0) / clusters.length),
    };
  }, [clusters]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-20 pb-16 max-w-7xl">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Map className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Market Heatmap</h1>
          </div>
          <p className="text-sm text-muted-foreground">Explore analyzed properties worldwide. Color-coded by investment potential.</p>
        </motion.div>

        {/* Stats + Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-xs">
              {stats.cities} cities
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {stats.properties} properties
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Avg score: {stats.avgScore}/100
            </Badge>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground mr-1">Color by:</span>
            {([
              { key: "score" as MetricKey, label: "Score", icon: BarChart3 },
              { key: "roi" as MetricKey, label: "ROI", icon: TrendingUp },
              { key: "risk" as MetricKey, label: "Safety", icon: Shield },
            ]).map(m => (
              <Button
                key={m.key}
                variant={metric === m.key ? "default" : "outline"}
                size="sm"
                className="text-xs h-7"
                onClick={() => setMetric(m.key)}
              >
                <m.icon className="h-3 w-3 mr-1" /> {m.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mb-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-[#ef4444]" />
            <span>{metric === "risk" ? "High Risk" : "Low"} (&lt;50)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-[#eab308]" />
            <span>Medium (50-74)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-[#22c55e]" />
            <span>{metric === "risk" ? "Safe" : "High"} (75+)</span>
          </div>
          <div className="flex items-center gap-1.5 ml-2">
            <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
            <span>Size = # analyses</span>
          </div>
        </div>

        {/* Map */}
        {isLoading ? (
          <div className="h-[500px] rounded-2xl bg-secondary animate-pulse flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Loading map data…</p>
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden border border-border shadow-lg">
            <MapContainer
              center={[40, 0]}
              zoom={3}
              style={{ height: "520px", width: "100%" }}
              scrollWheelZoom={true}
              className="z-0"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              />
              <FitBounds clusters={clusters} />
              {clusters.map(c => {
                const val = metricValue(c);
                const color = metricColor(val, metric);
                const radius = Math.max(8, Math.min(25, 8 + c.count * 2));
                return (
                  <CircleMarker
                    key={`${c.city}-${c.country}`}
                    center={[c.lat, c.lng]}
                    radius={radius}
                    pathOptions={{
                      fillColor: color,
                      fillOpacity: 0.7,
                      color: color,
                      weight: 2,
                      opacity: 0.9,
                    }}
                  >
                    <Popup>
                      <div className="min-w-[180px] p-1">
                        <h3 className="font-semibold text-sm mb-0.5">{c.city}, {c.country}</h3>
                        <div className="text-xs text-gray-500 mb-2">{c.count} {c.count === 1 ? "analysis" : "analyses"}</div>
                        <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                          <div className="text-center">
                            <div className="font-semibold" style={{ color: metricColor(c.avgScore, "score") }}>{c.avgScore}</div>
                            <div className="text-gray-400">Score</div>
                          </div>
                          <div className="text-center">
                            <div className="font-semibold" style={{ color: metricColor(c.avgRoi, "roi") }}>{c.avgRoi}</div>
                            <div className="text-gray-400">ROI</div>
                          </div>
                          <div className="text-center">
                            <div className="font-semibold" style={{ color: metricColor(c.avgRisk, "risk") }}>{c.avgRisk}</div>
                            <div className="text-gray-400">Safety</div>
                          </div>
                        </div>
                        <div className="border-t pt-1.5 mt-1">
                          <div className="text-[10px] text-gray-400 mb-0.5">Top property:</div>
                          <button
                            onClick={() => navigate(`/analysis/${c.topProperty.id}`)}
                            className="text-xs text-blue-600 hover:underline font-medium block truncate max-w-[170px]"
                          >
                            {c.topProperty.address} ({c.topProperty.score}/100)
                          </button>
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          </div>
        )}

        {/* City list below map */}
        {!isLoading && clusters.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-6">
            <h2 className="text-sm font-semibold text-foreground mb-3">All Markets ({clusters.length})</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {clusters
                .sort((a, b) => metricValue(b) - metricValue(a))
                .map(c => (
                  <button
                    key={`${c.city}-${c.country}-card`}
                    onClick={() => navigate(`/analysis/${c.topProperty.id}`)}
                    className="text-left rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">{c.city}, {c.country}</h3>
                      <Badge
                        className="text-[10px] shrink-0"
                        style={{
                          backgroundColor: metricColor(metricValue(c), metric) + "20",
                          color: metricColor(metricValue(c), metric),
                          border: `1px solid ${metricColor(metricValue(c), metric)}40`,
                        }}
                      >
                        {metricValue(c)}/100
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{c.count} {c.count === 1 ? "analysis" : "analyses"}</span>
                      <span>·</span>
                      <span>Score {c.avgScore}</span>
                      <span>·</span>
                      <span>ROI {c.avgRoi}</span>
                    </div>
                  </button>
                ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Heatmap;
