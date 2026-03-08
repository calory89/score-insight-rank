import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MessageSquare, Star, User, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

type FeedItem = {
  id: string;
  comment: string;
  rating: number;
  created_at: string;
  city?: string;
  country?: string;
  email?: string;
};

const CommunityFeedPreview = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<FeedItem[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: reviews } = await (supabase as any)
        .from("property_reviews")
        .select("id, comment, rating, created_at, analysis_id")
        .order("created_at", { ascending: false })
        .limit(6);

      if (!reviews?.length) return;

      const analysisIds = [...new Set(reviews.map((r: any) => r.analysis_id))];
      const { data: analyses } = await supabase
        .from("analyses")
        .select("id, city, country")
        .in("id", analysisIds as string[]);

      const aMap = new Map(analyses?.map((a) => [a.id, a]) || []);

      setItems(
        reviews.map((r: any) => ({
          id: r.id,
          comment: r.comment,
          rating: r.rating || 5,
          created_at: r.created_at,
          city: aMap.get(r.analysis_id)?.city || "",
          country: aMap.get(r.analysis_id)?.country || "",
        }))
      );
    };
    load();
  }, []);

  const timeAgo = (d: string) => {
    const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  if (items.length === 0) return null;

  return (
    <section className="py-20 md:py-28">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 mb-3">
            <MessageSquare className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-primary uppercase tracking-wider">Live Community</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            What Hunters Are Saying
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Real conversations from real investors. See what the community thinks before you buy.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {items.slice(0, 3).map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rounded-2xl border border-border bg-card p-5 flex flex-col"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-3.5 w-3.5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground">Hunter</p>
                  <p className="text-[10px] text-muted-foreground">{item.city}{item.country ? `, ${item.country}` : ""}</p>
                </div>
                <span className="ml-auto text-[10px] text-muted-foreground">{timeAgo(item.created_at)}</span>
              </div>
              <div className="flex items-center gap-0.5 mb-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className={`h-3 w-3 ${s <= item.rating ? "fill-primary text-primary" : "text-muted-foreground/20"}`} />
                ))}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed flex-1 line-clamp-3">
                "{item.comment}"
              </p>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-8">
          <Button variant="hero-outline" size="sm" onClick={() => navigate("/discover")}>
            Join the conversation <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default CommunityFeedPreview;
