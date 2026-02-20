import { motion } from "framer-motion";
import { ArrowUpRight, TrendingUp } from "lucide-react";

const alternatives = [
  { city: "Lisbon, Portugal", score: 88, roi: "8.2%", risk: "Low", price: "€215,000", change: "+12%" },
  { city: "Valencia, Spain", score: 85, roi: "7.9%", risk: "Low", price: "€178,000", change: "+9%" },
  { city: "Kraków, Poland", score: 83, roi: "9.1%", risk: "Medium", price: "€142,000", change: "+15%" },
  { city: "Porto, Portugal", score: 82, roi: "7.5%", risk: "Low", price: "€195,000", change: "+11%" },
];

const AlternativesSection = () => {
  return (
    <section className="py-24 md:py-32 relative">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-4"
        >
          <span className="text-xs font-medium text-primary uppercase tracking-wider">Intelligent Cross-Analysis</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            You Might Be Overpaying.<br />
            <span className="text-gradient-primary">Here's What Performs Better.</span>
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Better alternatives found by RealHunt users — higher score, better ROI, lower risk.
          </p>
        </motion.div>

        <div className="max-w-3xl mx-auto space-y-3">
          {alternatives.map((alt, i) => (
            <motion.div
              key={alt.city}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group rounded-xl border border-border bg-card p-4 md:p-5 hover:border-primary/30 transition-all duration-300 cursor-pointer"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="font-mono text-lg font-bold text-primary">{alt.score}</span>
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-foreground truncate">{alt.city}</h4>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-muted-foreground">{alt.price}</span>
                      <span className="text-xs text-muted-foreground">ROI {alt.roi}</span>
                      <span className="text-xs text-primary">{alt.risk} Risk</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="flex items-center gap-1 text-primary">
                    <TrendingUp className="h-3 w-3" />
                    <span className="text-xs font-mono font-medium">{alt.change}</span>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AlternativesSection;
