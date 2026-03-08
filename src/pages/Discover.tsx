import { useEffect, useState } from "react";
import useDocumentMeta from "@/hooks/useDocumentMeta";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Compass, TrendingUp, Shield, Bookmark, ArrowRight, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const scoreColor = (v: number) => {
  if (v >= 80) return "text-score-excellent";
  if (v >= 65) return "text-score-good";
  if (v >= 50) return "text-score-average";
  return "text-score-poor";
};

const scoreBg = (v: number) => {
  if (v >= 80) return "bg-score-excellent/10 text-score-excellent";
  if (v >= 65) return "bg-score-good/10 text-score-good";
  if (v >= 50) return "bg-score-average/10 text-score-average";
  return "bg-score-poor/10 text-score-poor";
};

const riskLabel = (v: number) => {
  if (v >= 80) return "Very Safe";
  if (v >= 60) return "Safe";
  return "Caution";
};

type DiscoveryCard = {
  id: string;
  analysis_id: string;
  user_id: string;
  created_at: string;
  address: string | null;
  city: string | null;
  country: string | null;
  global_score: number | null;
  roi_potential: number | null;
  risk_level: number | null;
  price: string | null;
  image_url: string | null;
  verdict: string | null;
  username: string | null;
};

const Discover = () => {
  useDocumentMeta({ title: "Discover Properties | RealHunt", description: "Explore curated property discoveries shared by the RealHunt community." });
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [discoveries, setDiscoveries] = useState<DiscoveryCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/");
      return;
    }
    if (!user) return;
    loadDiscoveries();
  }, [user, authLoading]);

  const loadDiscoveries = async () => {
    const { data: shared } = await (supabase as any)
      .from("shared_discoveries")
      .select("id, analysis_id, user_id, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (!shared || shared.length === 0) {
      setLoading(false);
      return;
    }

    const analysisIds = shared.map((s: any) => s.analysis_id);
    const { data: analyses } = await supabase
      .from("analyses")
      .select("id, address, city, country, global_score, roi_potential, risk_level, price, image_url, verdict")
      .in("id", analysisIds);

    const userIds = [...new Set(shared.map((s: any) => s.user_id))] as string[];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, email")
      .in("user_id", userIds);

    const { data: saved } = await (supabase as any)
      .from("saved_discoveries")
      .select("discovery_id")
      .eq("user_id", user!.id);

    setSavedIds(new Set((saved || []).map((s: any) => s.discovery_id)));

    const analysisMap = new Map((analyses || []).map((a: any) => [a.id, a]));
    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

    const cards: DiscoveryCard[] = shared
      .map((s: any) => {
        const a = analysisMap.get(s.analysis_id);
        const p = profileMap.get(s.user_id) as any;
        if (!a) return null;
        return {
          id: s.id,
          analysis_id: s.analysis_id,
          user_id: s.user_id,
          created_at: s.created_at,
          address: a.address,
          city: a.city,
          country: a.country,
          global_score: a.global_score,
          roi_potential: a.roi_potential,
          risk_level: a.risk_level,
          price: a.price,
          image_url: a.image_url,
          verdict: a.verdict,
          username: p?.username || p?.email?.split("@")[0] || "Hunter",
        };
      })
      .filter(Boolean) as DiscoveryCard[];

    setDiscoveries(cards);
    setLoading(false);
  };

  const toggleSave = async (discoveryId: string) => {
    if (!user) return;
    const isSaved = savedIds.has(discoveryId);
    if (isSaved) {
      await (supabase as any).from("saved_discoveries").delete().eq("user_id", user.id).eq("discovery_id", discoveryId);
      setSavedIds((prev) => { const n = new Set(prev); n.delete(discoveryId); return n; });
    } else {
      await (supabase as any).from("saved_discoveries").insert({ user_id: user.id, discovery_id: discoveryId });
      setSavedIds((prev) => new Set(prev).add(discoveryId));
      toast({ title: "Saved", description: "Property saved to your collection." });
    }
  };

  if (authLoading || !user) return null;

  return (
    <div className="min-h-screen bg-background pb-16 sm:pb-0">
      <Navbar />
      <div className="container mx-auto px-4 pt-20 pb-8 max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <Compass className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-primary uppercase tracking-wider">Intelligent Discovery</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Discover what Top Hunters are finding today
          </h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Follow the smartest investors. See the highest scoring properties before everyone else.
          </p>
        </div>

        <div className="rounded-xl border border-primary/15 bg-primary/5 p-4 mb-8 text-center">
          <p className="text-xs text-primary font-medium">
            The smartest investors don't search alone. They learn from the best Hunters.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-6 w-6 rounded-full border-2 border-t-primary border-border animate-spin" />
          </div>
        ) : discoveries.length === 0 ? (
          <div className="text-center py-16">
            <Compass className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-sm text-muted-foreground mb-2">No discoveries shared yet.</p>
            <p className="text-xs text-muted-foreground">
              Analyze a property with a score above 70 and share it with the community!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {discoveries.map((d, i) => (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-border bg-card overflow-hidden hover:border-primary/20 transition-all group"
              >
                {d.image_url && (
                  <div className="h-40 bg-secondary overflow-hidden cursor-pointer" onClick={() => navigate(`/analysis/${d.analysis_id}`)}>
                    <img src={d.image_url} alt={d.address || "Property"} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm font-medium text-foreground truncate">
                          {d.address || `${d.city}, ${d.country}`}
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground">{d.city}, {d.country}</span>
                    </div>
                    <div className={`h-12 w-14 rounded-lg flex flex-col items-center justify-center ${scoreBg(d.global_score || 0)}`}>
                      <span className="font-mono text-lg font-bold">{d.global_score}</span>
                      <span className="text-[7px] uppercase tracking-wider opacity-70">score</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mb-3 text-xs">
                    {d.roi_potential != null && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <TrendingUp className="h-3 w-3 text-primary" />
                        <span className="font-mono font-medium text-foreground">{d.roi_potential}%</span> ROI
                      </span>
                    )}
                    {d.risk_level != null && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Shield className="h-3 w-3" /> {riskLabel(d.risk_level)}
                      </span>
                    )}
                    {d.price && <span className="font-mono text-foreground">{d.price}</span>}
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-border/50">
                    <button onClick={() => navigate(`/profile/${d.user_id}`)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                      Found by <span className="text-primary font-medium">@{d.username}</span>
                    </button>
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleSave(d.id)}
                        className={`p-1.5 rounded-lg transition-colors ${savedIds.has(d.id) ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>
                        <Bookmark className={`h-4 w-4 ${savedIds.has(d.id) ? "fill-current" : ""}`} />
                      </button>
                      <Button variant="ghost" size="sm" className="text-xs h-8 gap-1" onClick={() => navigate(`/analysis/${d.analysis_id}`)}>
                        Analyze <ArrowRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
      <div className="hidden sm:block"><Footer /></div>
      <BottomNav />
    </div>
  );
};

export default Discover;
