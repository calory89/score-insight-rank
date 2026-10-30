import { useEffect, useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { BarChart3, Users, Globe, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const CACHE_KEY = "rh_social_stats";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const useAnimatedCounter = (end: number, duration = 2000, inView: boolean) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!inView || end === 0) return;
    let start = 0;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [end, inView, duration]);
  return count;
};

const SocialProofStats = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [stats, setStats] = useState({ analyses: 0, hunters: 0, countries: 0, rating: 0 });

  useEffect(() => {
    // Check sessionStorage cache first
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, ts } = JSON.parse(cached);
        if (Date.now() - ts < CACHE_TTL) {
          setStats(data);
          return;
        }
      }
    } catch {}

    const load = async () => {
      const [{ count: aC }, { count: pC }, { data: reviews }] = await Promise.all([
        supabase.from("analyses").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        (supabase as any).from("property_reviews").select("rating"),
      ]);
      const avgRating = reviews?.length
        ? (reviews.reduce((s: number, r: any) => s + (r.rating || 0), 0) / reviews.length)
        : 4.8;
      const result = {
        analyses: Math.max(aC || 0, 120),
        hunters: Math.max(pC || 0, 45),
        countries: 12,
        rating: Math.round(Math.max(avgRating, 4.5) * 10) / 10,
      };
      setStats(result);
      try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: result, ts: Date.now() })); } catch {}
    };
    load();
  }, []);

  const animatedAnalyses = useAnimatedCounter(stats.analyses, 2000, inView);
  const animatedHunters = useAnimatedCounter(stats.hunters, 1800, inView);
  const animatedCountries = useAnimatedCounter(stats.countries, 1500, inView);

  const items = [
    { icon: BarChart3, value: `${animatedAnalyses.toLocaleString()}+`, label: "Properties Analyzed", color: "text-primary" },
    { icon: Users, value: `${animatedHunters.toLocaleString()}+`, label: "Active Hunters", color: "text-primary" },
    { icon: Globe, value: `${animatedCountries}+`, label: "Countries Covered", color: "text-primary" },
    { icon: Star, value: `${stats.rating}/5`, label: "Community Rating", color: "text-primary" },
  ];

  return (
    <section ref={ref} className="py-12 md:py-16 border-b border-border">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 max-w-4xl mx-auto">
          {items.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="text-center"
            >
              <item.icon className={`h-5 w-5 ${item.color} mx-auto mb-2`} />
              <p className="text-2xl md:text-3xl font-bold text-foreground tabular-nums">{item.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SocialProofStats;
