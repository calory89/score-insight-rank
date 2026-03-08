import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, MapPin } from "lucide-react";
import { scoreColor } from "@/lib/score-utils";

const PropertyOfTheDay = () => {
  const navigate = useNavigate();
  const [property, setProperty] = useState<any>(null);

  useEffect(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    supabase
      .from("analyses")
      .select("id, city, country, global_score, price, currency, image_url, address, slug")
      .not("global_score", "is", null)
      .gte("created_at", yesterday.toISOString())
      .order("global_score", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0 && data[0].global_score >= 60) {
          setProperty(data[0]);
        }
      });
  }, []);

  if (!property) return null;

  const curr = property.currency === "GBP" ? "£" : property.currency === "USD" ? "$" : "€";

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 rounded-xl border border-primary/30 bg-primary/5 p-4 cursor-pointer hover:bg-primary/10 transition-colors"
      onClick={() => navigate(property.slug ? `/r/${property.slug}` : `/analysis/${property.id}`)}
    >
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-primary font-semibold">🏆 Today's Top Deal</p>
          <p className="text-sm font-semibold text-foreground truncate flex items-center gap-1">
            <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            {property.city || property.address}{property.country ? `, ${property.country}` : ""}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className={`text-xl font-bold font-mono ${scoreColor(property.global_score)}`}>{property.global_score}</p>
          <p className="text-[10px] text-muted-foreground">score</p>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      </div>
    </motion.div>
  );
};

export default PropertyOfTheDay;
