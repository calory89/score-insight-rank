import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";

interface ActivityItem {
  city: string;
  country: string;
  score: number;
}

const LiveActivityToast = () => {
  const [activity, setActivity] = useState<ActivityItem | null>(null);
  const [show, setShow] = useState(false);
  const isMobile = useIsMobile();
  const cacheRef = useRef<ActivityItem[]>([]);
  const indexRef = useRef(0);

  // Fetch once, cache, then rotate
  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .from("analyses")
        .select("city, country, global_score")
        .not("city", "is", null)
        .not("country", "is", null)
        .not("global_score", "is", null)
        .order("created_at", { ascending: false })
        .limit(20);

      if (data && data.length > 0) {
        cacheRef.current = data.map((pick) => ({
          city: pick.city!,
          country: pick.country!,
          score: pick.global_score!,
        }));
      }
    };
    fetchData();
  }, []);

  const showNext = useCallback(() => {
    if (cacheRef.current.length === 0) return;
    const idx = indexRef.current % cacheRef.current.length;
    setActivity(cacheRef.current[idx]);
    indexRef.current = idx + 1;
    setShow(true);
    setTimeout(() => setShow(false), 4000);
  }, []);

  useEffect(() => {
    const initialDelay = setTimeout(showNext, 8000);
    const interval = setInterval(showNext, 25000);
    return () => {
      clearTimeout(initialDelay);
      clearInterval(interval);
    };
  }, [showNext]);

  if (isMobile) return null;

  return (
    <AnimatePresence>
      {show && activity && (
        <motion.div
          key={`toast-${indexRef.current}`}
          initial={{ opacity: 0, x: -80 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -80 }}
          transition={{ type: "spring", damping: 20 }}
          className="fixed bottom-6 left-6 z-50 bg-card border border-border rounded-xl px-4 py-3 shadow-lg flex items-center gap-3 max-w-xs"
        >
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <MapPin className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground truncate">
              Property analyzed in {activity.city}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <TrendingUp className="w-3 h-3 text-primary" />
              <span className="text-xs text-muted-foreground">
                Score: {activity.score}/100 · {activity.country}
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LiveActivityToast;
