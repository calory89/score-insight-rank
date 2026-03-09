import { useEffect, useState, useMemo } from "react";
import useDocumentMeta from "@/hooks/useDocumentMeta";
import EmptyState from "@/components/EmptyState";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Briefcase, TrendingUp, MapPin, Calendar, DollarSign, PieChart,
  ArrowUpRight, ArrowDownRight, Plus, Trash2, Building2, Target,
  BarChart3, Shield, Zap, Eye, ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PortfolioCardSkeleton } from "@/components/SkeletonCards";
import {
  PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area, LineChart, Line,
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
    roi_potential: number | null;
    risk_level: number | null;
    market_stability: number | null;
    projected_roi_high: number | null;
    projected_roi_low: number | null;
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
      .select("*, analyses(address, city, country, price, global_score, image_url, property_type, roi_potential, risk_level, market_stability, projected_roi_high, projected_roi_low)")
      .eq("user_id", user!.id)
      .order("purchase_date", { ascending: false });

    if (data) {
      setItems(data.map((d: any) => ({ ...d, analysis: d.analyses })));
    }
    setLoading(false);
  };

  const { toast } = useToast();

  const removeItem = async (id: string) => {
    const removed = items.find(i => i.id === id);
    await supabase.from("portfolio_properties" as any).delete().eq("id", id);
    setItems(prev => prev.filter(i => i.id !== id));
    toast({
      title: "Property removed",
      description: removed?.analysis?.address || "Removed from portfolio.",
    });
  };

  // --- Computed Metrics ---
  const totalValue = useMemo(() =>
    items.reduce((sum, i) => sum + (i.purchase_price || 0), 0), [items]
  );

  const projectedReturn = useMemo(() => {
    return items.reduce((sum, i) => {
      const roiHigh = i.analysis?.projected_roi_high ?? (i.analysis?.roi_potential ? i.analysis.roi_potential * 0.12 : 8);
      return sum + (i.purchase_price * roiHigh / 100);
    }, 0);
  }, [items]);

  const projectedReturnLow = useMemo(() => {
    return items.reduce((sum, i) => {
      const roiLow = i.analysis?.projected_roi_low ?? (i.analysis?.roi_potential ? i.analysis.roi_potential * 0.05 : 3);
      return sum + (i.purchase_price * roiLow / 100);
    }, 0);
  }, [items]);

  const avgScore = useMemo(() => {
    const scores = items.map(i => i.analysis?.global_score).filter(Boolean) as number[];
    return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  }, [items]);

  const avgRisk = useMemo(() => {
    const risks = items.map(i => i.analysis?.risk_level).filter(Boolean) as number[];
    return risks.length ? Math.round(risks.reduce((a, b) => a + b, 0) / risks.length) : 0;
  }, [items]);

  const countryData = useMemo(() => {
    const map: Record<string, number> = {};
    items.forEach(i => {
      const country = i.analysis?.country || "Unknown";
      map[country] = (map[country] || 0) + i.purchase_price;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [items]);

  const typeData = useMemo(() => {
    const map: Record<string, number> = {};
    items.forEach(i => {
      const type = i.analysis?.property_type || "Other";
      map[type] = (map[type] || 0) + i.purchase_price;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [items]);

  const timelineData = useMemo(() => {
    const sorted = [...items].sort((a, b) => new Date(a.purchase_date).getTime() - new Date(b.purchase_date).getTime());
    let cumulative = 0;
    return sorted.map(i => {
      cumulative += i.purchase_price;
      return {
        date: new Date(i.purchase_date).toLocaleDateString("en", { month: "short", year: "2-digit" }),
        value: cumulative,
        property: i.analysis?.address?.split(",")[0] || "Property",
      };
    });
  }, [items]);

  // Simulated growth projection (2% annual appreciation)
  const growthProjection = useMemo(() => {
    if (totalValue === 0) return [];
    const months = 24;
    const monthlyRate = 0.02 / 12;
    return Array.from({ length: months + 1 }, (_, i) => ({
      month: `M${i}`,
      conservative: Math.round(totalValue * Math.pow(1 + monthlyRate * 0.5, i)),
      base: Math.round(totalValue * Math.pow(1 + monthlyRate, i)),
      optimistic: Math.round(totalValue * Math.pow(1 + monthlyRate * 2, i)),
    }));
  }, [totalValue]);

  const formatCurrency = (val: number, cur = "€") =>
    `${cur}${val >= 1000000 ? (val / 1000000).toFixed(1) + "M" : val >= 1000 ? (val / 1000).toFixed(0) + "K" : val.toLocaleString()}`;

  const riskLabel = (risk: number) => {
    if (risk <= 30) return { label: "Low", color: "text-emerald-500" };
    if (risk <= 60) return { label: "Medium", color: "text-amber-500" };
    return { label: "High", color: "text-red-500" };
  };

  const portfolioHealth = useMemo(() => {
    if (items.length === 0) return 0;
    const diversificationScore = Math.min(countryData.length * 15, 30);
    const scoreBonus = Math.min(avgScore * 0.4, 40);
    const riskPenalty = Math.max(0, avgRisk - 50) * 0.3;
    return Math.min(100, Math.round(diversificationScore + scoreBonus + 30 - riskPenalty));
  }, [items, countryData, avgScore, avgRisk]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 pt-24 pb-24">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Briefcase className="h-6 w-6 text-primary" /> Portfolio
              </h1>
              <p className="text-sm text-muted-foreground mt-1">Investment performance & analytics</p>
            </div>
            <Button variant="hero" size="sm" onClick={() => navigate("/dashboard")}>
              <Plus className="h-4 w-4" /> Add Property
            </Button>
          </div>

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[1, 2, 3, 4].map(i => (
                <PortfolioCardSkeleton key={i} />
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="Start tracking your first investment"
              description="Mark properties as 'purchased' from any analysis page to build your portfolio and track ROI over time."
              actionLabel="Go to Dashboard"
              onAction={() => navigate("/dashboard")}
            />
          ) : (
            <>
              {/* Hero Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Total Value - Large Card */}
                <Card className="md:col-span-1 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                  <CardContent className="p-5">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <DollarSign className="h-3 w-3" /> Total Portfolio Value
                    </p>
                    <p className="text-3xl font-bold text-foreground tracking-tight">{formatCurrency(totalValue)}</p>
                    <div className="flex items-center gap-1 mt-2">
                      <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-xs text-emerald-500 font-medium">
                        +{formatCurrency(projectedReturnLow)} – {formatCurrency(projectedReturn)} projected
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-3">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Building2 className="h-4 w-4 text-primary mx-auto mb-1" />
                      <p className="text-lg font-bold text-foreground">{items.length}</p>
                      <p className="text-[10px] text-muted-foreground">Properties</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <MapPin className="h-4 w-4 text-primary mx-auto mb-1" />
                      <p className="text-lg font-bold text-foreground">{countryData.length}</p>
                      <p className="text-[10px] text-muted-foreground">Countries</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Target className="h-4 w-4 text-primary mx-auto mb-1" />
                      <p className="text-lg font-bold text-foreground">{avgScore}<span className="text-xs text-muted-foreground">/100</span></p>
                      <p className="text-[10px] text-muted-foreground">Avg Score</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Shield className={`h-4 w-4 mx-auto mb-1 ${riskLabel(avgRisk).color}`} />
                      <p className={`text-lg font-bold ${riskLabel(avgRisk).color}`}>{riskLabel(avgRisk).label}</p>
                      <p className="text-[10px] text-muted-foreground">Risk Level</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Portfolio Health */}
                <Card>
                  <CardContent className="p-5 flex flex-col justify-center">
                    <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                      <Zap className="h-3 w-3" /> Portfolio Health Score
                    </p>
                    <div className="relative h-3 bg-muted rounded-full overflow-hidden mb-2">
                      <motion.div
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{
                          background: portfolioHealth >= 70 ? "hsl(160, 84%, 39%)" : portfolioHealth >= 40 ? "hsl(48, 96%, 53%)" : "hsl(0, 72%, 51%)",
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${portfolioHealth}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-2xl font-bold text-foreground">{portfolioHealth}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {portfolioHealth >= 70 ? "Well diversified" : portfolioHealth >= 40 ? "Add more markets" : "Needs diversification"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Tabs Section */}
              <Tabs defaultValue="overview" className="mb-6">
                <TabsList className="mb-4">
                  <TabsTrigger value="overview"><BarChart3 className="h-3.5 w-3.5 mr-1" />Overview</TabsTrigger>
                  <TabsTrigger value="growth"><TrendingUp className="h-3.5 w-3.5 mr-1" />Growth</TabsTrigger>
                  <TabsTrigger value="holdings"><Building2 className="h-3.5 w-3.5 mr-1" />Holdings</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview">
                  <div className="grid md:grid-cols-3 gap-6">
                    {/* Country Distribution */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <PieChart className="h-4 w-4 text-primary" /> By Country
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

                    {/* Property Type Distribution */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-primary" /> By Type
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-48">
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsPie>
                              <Pie
                                data={typeData}
                                cx="50%"
                                cy="50%"
                                innerRadius={40}
                                outerRadius={70}
                                paddingAngle={3}
                                dataKey="value"
                                nameKey="name"
                                label={({ name }) => name}
                              >
                                {typeData.map((_, i) => (
                                  <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(v: number) => formatCurrency(v)} />
                            </RechartsPie>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Acquisition Timeline */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-primary" /> Acquisition Timeline
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-48">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={timelineData}>
                              <defs>
                                <linearGradient id="timelineGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                              <YAxis tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                              <Tooltip formatter={(v: number) => formatCurrency(v)} />
                              <Area type="stepAfter" dataKey="value" stroke="hsl(var(--primary))" fill="url(#timelineGrad)" strokeWidth={2} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Growth Projection Tab */}
                <TabsContent value="growth">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" /> 24-Month Value Projection
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">Based on 2% annual appreciation baseline</p>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={growthProjection}>
                            <defs>
                              <linearGradient id="optGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.15} />
                                <stop offset="95%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" interval={3} />
                            <YAxis tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                            <Tooltip formatter={(v: number) => formatCurrency(v)} />
                            <Area type="monotone" dataKey="conservative" stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" fill="none" strokeWidth={1} name="Conservative" />
                            <Area type="monotone" dataKey="base" stroke="hsl(var(--primary))" fill="none" strokeWidth={2} name="Base (2%)" />
                            <Area type="monotone" dataKey="optimistic" stroke="hsl(160, 84%, 39%)" fill="url(#optGrad)" strokeWidth={2} name="Optimistic (4%)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex justify-center gap-6 mt-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <div className="w-3 h-0.5 border-t-2 border-dashed border-muted-foreground" /> Conservative
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-primary">
                          <div className="w-3 h-0.5 bg-primary rounded" /> Base
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-emerald-500">
                          <div className="w-3 h-0.5 bg-emerald-500 rounded" /> Optimistic
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Holdings Tab */}
                <TabsContent value="holdings">
                  <div className="space-y-3">
                    <AnimatePresence>
                      {items.map((item, idx) => {
                        const roiEst = item.analysis?.roi_potential ?? 0;
                        const annualReturn = item.purchase_price * roiEst / 100;
                        return (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ delay: idx * 0.04 }}
                          >
                            <Card className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => navigate(`/analysis/${item.analysis_id}`)}>
                              <CardContent className="p-4 flex items-center gap-4">
                                <div className="h-16 w-16 rounded-xl bg-muted overflow-hidden flex-shrink-0">
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
                                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                    <Badge variant="outline" className="text-[10px]">
                                      <Calendar className="h-2.5 w-2.5 mr-1" />
                                      {new Date(item.purchase_date).toLocaleDateString()}
                                    </Badge>
                                    {item.analysis?.global_score && (
                                      <Badge className="text-[10px] bg-primary/10 text-primary border-0">
                                        Score {item.analysis.global_score}
                                      </Badge>
                                    )}
                                    {roiEst > 0 && (
                                      <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 border-0">
                                        <ArrowUpRight className="h-2.5 w-2.5 mr-0.5" />
                                        {roiEst}% ROI
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right flex-shrink-0 space-y-1">
                                  <p className="text-sm font-bold text-foreground">
                                    {item.currency}{item.purchase_price.toLocaleString()}
                                  </p>
                                  {annualReturn > 0 && (
                                    <p className="text-[10px] text-emerald-500 flex items-center justify-end gap-0.5">
                                      <ArrowUpRight className="h-2.5 w-2.5" />
                                      {formatCurrency(annualReturn)}/yr
                                    </p>
                                  )}
                                  <p className="text-[10px] text-muted-foreground">{item.analysis?.property_type || "Property"}</p>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                                    className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                  <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </motion.div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Portfolio;
