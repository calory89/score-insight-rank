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
      <div className="absolute inset-0 bg-gradient-hero opacity-30" />
      <div className="container relative mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-6"
        >
          <div className="inline-flex items-center gap-2 mb-4">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Live Global Rankings</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Top Performing Properties Worldwide
          </h2>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto mb-1">
            Based on 14,000+ analyses generated worldwide. Updated daily.
          </p>
          <p className="text-xs text-muted-foreground">
            No sponsored placements. Rankings are purely data-driven.
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
            {/* Header - hidden on very small screens */}
            <div className="hidden sm:grid grid-cols-12 gap-4 px-5 py-3 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wider">
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
                className="flex sm:grid sm:grid-cols-12 gap-3 sm:gap-4 px-4 sm:px-5 py-3 sm:py-4 border-b border-border/50 last:border-0 hover:bg-secondary/30 transition-colors cursor-pointer items-center"
              >
                <div className="hidden sm:block sm:col-span-1 font-mono text-sm text-muted-foreground">{prop.rank}</div>
                <div className="flex-1 sm:col-span-5 flex items-center gap-2 min-w-0">
                  <span className="sm:hidden font-mono text-xs text-muted-foreground">{prop.rank}.</span>
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 hidden sm:block" />
                  <span className="text-sm font-medium text-foreground truncate">{prop.location}</span>
                </div>
                <div className="sm:col-span-2 text-center">
                  <span className="inline-flex items-center justify-center h-7 w-12 rounded-md bg-primary/10 font-mono text-sm font-semibold text-primary">
                    {prop.score}
                  </span>
                </div>
                <div className="hidden sm:block sm:col-span-2 text-center font-mono text-sm text-foreground">{prop.yield}</div>
                <div className="sm:col-span-2 text-right flex items-center justify-end gap-1 text-primary">
                  <TrendingUp className="h-3 w-3" />
                  <span className="font-mono text-sm">{prop.trend}</span>
                </div>
              </motion.div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground text-center mt-3">
            Real-time performance ranking across global markets.
          </p>
        </div>
      </div>
    </section>
  );
};

export default GlobalRanking;
