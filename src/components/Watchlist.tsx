import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, TrendingUp, TrendingDown, Minus, ArrowRight, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { scoreColor } from "@/lib/score-utils";
import { useNavigate } from "react-router-dom";

type WatchlistItem = {
  id: string;
  analysis_id: string;
  url: string;
  initial_price: string | null;
  initial_score: number | null;
  latest_price: string | null;
  latest_score: number | null;
  price_delta: string | null;
  score_delta: number | null;
  created_at: string;
  // Joined from analyses
  address?: string;
  city?: string;
  country?: string;
  image_url?: string;
  verdict?: string;
  global_score?: number;
};

export const WatchButton = ({ analysisId, url, price, score }: { analysisId: string; url: string; price?: string | null; score?: number | null }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isWatching, setIsWatching] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    (supabase as any).from("watchlist")
      .select("id")
      .eq("user_id", user.id)
      .eq("analysis_id", analysisId)
      .then(({ data }: any) => {
        if (data && data.length > 0) setIsWatching(true);
      });
  }, [user, analysisId]);

  const toggle = async () => {
    if (!user) return;
    setLoading(true);
    if (isWatching) {
      await (supabase as any).from("watchlist").delete().eq("user_id", user.id).eq("analysis_id", analysisId);
      setIsWatching(false);
      toast({ title: "Removed from Watchlist" });
    } else {
      await (supabase as any).from("watchlist").insert({
        user_id: user.id,
        analysis_id: analysisId,
        url: url || "",
        initial_price: price || null,
        initial_score: score || null,
        latest_price: price || null,
        latest_score: score || null,
      });
      setIsWatching(true);
      toast({ title: "Added to Watchlist", description: "You'll see price & score changes here." });
    }
    setLoading(false);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className={`text-xs ${isWatching ? "text-primary border-primary/30 bg-primary/10" : ""}`}
      onClick={toggle}
      disabled={loading}
    >
      {isWatching ? <EyeOff className="h-3.5 w-3.5 sm:mr-1" /> : <Eye className="h-3.5 w-3.5 sm:mr-1" />}
      <span className="hidden sm:inline">{isWatching ? "Watching" : "Watch"}</span>
    </Button>
  );
};

export const WatchlistSection = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadWatchlist();
  }, [user]);

  const loadWatchlist = async () => {
    const { data: watchlist } = await (supabase as any)
      .from("watchlist")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });

    if (!watchlist || watchlist.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    const analysisIds = watchlist.map((w: any) => w.analysis_id);
    const { data: analyses } = await supabase
      .from("analyses")
      .select("id, address, city, country, image_url, verdict, global_score, price")
      .in("id", analysisIds);

    const analysisMap = new Map((analyses || []).map(a => [a.id, a]));
    const enriched: WatchlistItem[] = watchlist.map((w: any) => {
      const a = analysisMap.get(w.analysis_id);
      return {
        ...w,
        address: a?.address,
        city: a?.city,
        country: a?.country,
        image_url: a?.image_url,
        verdict: a?.verdict,
        global_score: a?.global_score,
        // Update latest from current analysis data
        latest_score: a?.global_score ?? w.latest_score,
        score_delta: a?.global_score && w.initial_score ? a.global_score - w.initial_score : w.score_delta,
      };
    });

    setItems(enriched);
    setLoading(false);
  };

  if (loading || items.length === 0) return null;

  return (
    <div className="mb-8">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 mb-3 group"
      >
        <Bell className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">Watchlist</h2>
        <span className="text-[10px] text-muted-foreground">({items.length})</span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 overflow-hidden"
          >
            {items.map((item) => {
              const scoreDelta = item.score_delta || 0;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-border bg-card p-4 hover:border-primary/20 transition-all cursor-pointer group"
                  onClick={() => navigate(`/analysis/${item.analysis_id}`)}
                >
                  <div className="flex items-start gap-3">
                    {item.image_url && (
                      <img src={item.image_url} alt="" className="h-12 w-16 rounded-lg object-cover flex-shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {item.address || `${item.city}, ${item.country}`}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-sm font-mono font-bold ${scoreColor(item.global_score || 0)}`}>
                          {item.global_score || "—"}
                        </span>
                        {scoreDelta !== 0 && (
                          <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${scoreDelta > 0 ? "text-primary" : "text-score-poor"}`}>
                            {scoreDelta > 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                            {scoreDelta > 0 ? "+" : ""}{scoreDelta}
                          </span>
                        )}
                        {scoreDelta === 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                            <Minus className="h-2.5 w-2.5" /> No change
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
