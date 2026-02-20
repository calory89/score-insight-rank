import { motion } from "framer-motion";
import { Globe, TrendingUp, MapPin, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";

const topProperties = [
  { rank: 1, location: "Dubai Marina, UAE", score: 94, yield: "9.8%", trend: "+18%" },
  { rank: 2, location: "Lisbon Centro, PT", score: 91, yield: "8.4%", trend: "+14%" },
  { rank: 3, location: "Medellín, Colombia", score: 89, yield: "11.2%", trend: "+22%" },
  { rank: 4, location: "Tbilisi, Georgia", score: 87, yield: "12.1%", trend: "+28%" },
  { rank: 5, location: "Valencia, Spain", score: 86, yield: "7.9%", trend: "+9%" },
];

const filters = ["All Budgets", "< €100K", "€100K–€300K", "€300K+"];

const GlobalRanking = () => {
  return (
    <section id="rankings" className="py-24 md:py-32 relative">
      <div className="absolute inset-0 bg-gradient-hero opacity-50" />
      <div className="container relative mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 mb-4">
            <Globe className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-primary uppercase tracking-wider">Live Global Rankings</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Top Performing Properties Worldwide
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Objective. Data-driven. Independent. No sponsored positions.
          </p>
        </motion.div>

        {/* Filters */}
        <div className="flex items-center justify-center gap-2 mb-10 flex-wrap">
          {filters.map((f, i) => (
            <Button
              key={f}
              variant={i === 0 ? "default" : "secondary"}
              size="sm"
              className="rounded-full text-xs"
            >
              {f}
            </Button>
          ))}
          <Button variant="secondary" size="sm" className="rounded-full text-xs">
            <Filter className="h-3 w-3 mr-1" /> More Filters
          </Button>
        </div>

        {/* Rankings Table */}
        <div className="max-w-3xl mx-auto">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <div className="col-span-1">#</div>
              <div className="col-span-5">Location</div>
              <div className="col-span-2 text-center">Score</div>
              <div className="col-span-2 text-center">Yield</div>
              <div className="col-span-2 text-right">Trend</div>
            </div>

            {topProperties.map((prop, i) => (
              <motion.div
                key={prop.rank}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="grid grid-cols-12 gap-4 px-5 py-4 border-b border-border/50 last:border-0 hover:bg-secondary/30 transition-colors cursor-pointer items-center"
              >
                <div className="col-span-1 font-mono text-sm text-muted-foreground">{prop.rank}</div>
                <div className="col-span-5 flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm font-medium text-foreground truncate">{prop.location}</span>
                </div>
                <div className="col-span-2 text-center">
                  <span className="inline-flex items-center justify-center h-7 w-12 rounded-md bg-primary/10 font-mono text-sm font-semibold text-primary">
                    {prop.score}
                  </span>
                </div>
                <div className="col-span-2 text-center font-mono text-sm text-foreground">{prop.yield}</div>
                <div className="col-span-2 text-right flex items-center justify-end gap-1 text-primary">
                  <TrendingUp className="h-3 w-3" />
                  <span className="font-mono text-sm">{prop.trend}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default GlobalRanking;
