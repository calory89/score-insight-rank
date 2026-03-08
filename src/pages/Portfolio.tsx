import { useEffect, useState, useMemo } from "react";
import useDocumentMeta from "@/hooks/useDocumentMeta";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase, TrendingUp, MapPin, Calendar, DollarSign, PieChart,
  ArrowUpRight, ArrowDownRight, Plus, Trash2, Building2,
} from "lucide-react";
import {
  PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

const COLORS = [
  "hsl(160, 84%, 39%)", "hsl(200, 80%, 40%)", "hsl(48, 96%, 53%)",
  "hsl(280, 60%, 50%)", "hsl(25, 95%, 53%)", "hsl(340, 70%, 50%)",
];

interface PortfolioItem {
  id: string;
  analysis_id: string;
  purchase_price: number;
  purchase_date: string;
  currency: string;
  status: string;
  notes: string;
  created_at: string;
  analysis?: {
    address: string | null;
    city: string | null;
    country: string | null;
    price: string | null;
    global_score: number | null;
    image_url: string | null;
    property_type: string | null;
  };
}

const Portfolio = () => {
  useDocumentMeta({
    title: "Portfolio | RealHunt",
    description: "Track your real estate investment portfolio with ROI, distribution charts, and acquisition timeline.",
  });

  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) { navigate("/"); return; }
    if (user) loadPortfolio();
  }, [user, authLoading]);

  const loadPortfolio = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("portfolio_properties" as any)
      .select("*, analyses(address, city, country, price, global_score, image_url, property_type)")
      .eq("user_id", user!.id)
      .order("purchase_date", { ascending: false });

    if (data) {
      setItems(data.map((d: any) => ({
        ...d,
        analysis: d.analyses,
      })));
    }
    setLoading(false);
  };

  const removeItem = async (id: string) => {
    await supabase.from("portfolio_properties" as any).delete().eq("id", id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const totalValue = useMemo(() =>
    items.reduce((sum, i) => sum + (i.purchase_price || 0), 0), [items]
  );

  const countryData = useMemo(() => {
    const map: Record<string, number> = {};
    items.forEach(i => {
      const country = i.analysis?.country || "Unknown";
      map[country] = (map[country] || 0) + i.purchase_price;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [items]);

  const cityData = useMemo(() => {
    const map: Record<string, number> = {};
    items.forEach(i => {
      const city = i.analysis?.city || "Unknown";
      map[city] = (map[city] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [items]);

  const avgScore = useMemo(() => {
    const scores = items.map(i => i.analysis?.global_score).filter(Boolean) as number[];
    return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  }, [items]);

  const formatCurrency = (val: number, cur = "€") =>
    `${cur}${val >= 1000000 ? (val / 1000000).toFixed(1) + "M" : val >= 1000 ? (val / 1000).toFixed(0) + "K" : val}`;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 pt-24 pb-24">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Briefcase className="h-6 w-6 text-primary" /> My Portfolio
              </h1>
              <p className="text-sm text-muted-foreground mt-1">Track your real estate investments</p>
            </div>
            <Button variant="hero" size="sm" onClick={() => navigate("/dashboard")}>
              <Plus className="h-4 w-4" /> Add Property
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-4 text-center">
                <DollarSign className="h-5 w-5 text-primary mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Total Value</p>
                <p className="text-lg font-bold text-foreground">{formatCurrency(totalValue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Building2 className="h-5 w-5 text-primary mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Properties</p>
                <p className="text-lg font-bold text-foreground">{items.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <MapPin className="h-5 w-5 text-primary mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Countries</p>
                <p className="text-lg font-bold text-foreground">{countryData.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <TrendingUp className="h-5 w-5 text-primary mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Avg Score</p>
                <p className="text-lg font-bold text-foreground">{avgScore}/100</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          {items.length > 0 && (
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {/* Country Distribution */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <PieChart className="h-4 w-4 text-primary" /> Distribution by Country
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie
                          data={countryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          paddingAngle={3}
                          dataKey="value"
                          nameKey="name"
                          label={({ name }) => name}
                        >
                          {countryData.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* City Bar Chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" /> Properties by City
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={cityData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip />
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Property List */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Briefcase className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <h3 className="font-semibold text-foreground mb-1">No properties yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Mark properties as "purchased" from any analysis page to start tracking your portfolio.
                </p>
                <Button variant="hero" size="sm" onClick={() => navigate("/dashboard")}>
                  Go to Dashboard
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {items.map((item, idx) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/analysis/${item.analysis_id}`)}>
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="h-14 w-14 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                        {item.analysis?.image_url ? (
                          <img src={item.analysis.image_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Building2 className="h-6 w-6 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {item.analysis?.address || "Property"}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {item.analysis?.city}{item.analysis?.country ? `, ${item.analysis.country}` : ""}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px]">
                            <Calendar className="h-2.5 w-2.5 mr-1" />
                            {new Date(item.purchase_date).toLocaleDateString()}
                          </Badge>
                          {item.analysis?.global_score && (
                            <Badge className="text-[10px] bg-primary/10 text-primary border-0">
                              Score {item.analysis.global_score}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-foreground">
                          {item.currency}{item.purchase_price.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{item.analysis?.property_type || "Property"}</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                        className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Portfolio;
