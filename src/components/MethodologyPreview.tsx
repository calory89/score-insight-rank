import { motion } from "framer-motion";
import { TrendingUp, Shield, Users, Droplets, BarChart3, Target, ShieldCheck, Database, Eye } from "lucide-react";

const pillars = [
  { label: "ROI Potential", value: 85, icon: TrendingUp, description: "Projected returns vs. market average" },
  { label: "Market Stability", value: 72, icon: Shield, description: "Price volatility & economic resilience" },
  { label: "Demand Strength", value: 90, icon: Users, description: "Buyer/renter demand indicators" },
  { label: "Safety Score", value: 68, icon: Target, description: "Regulatory, environmental & market risks" },
  { label: "Liquidity Outlook", value: 78, icon: Droplets, description: "How quickly you can sell if needed" },
  { label: "Overall Value", value: 82, icon: BarChart3, description: "Price vs. comparable properties" },
];

const MethodologyPreview = () => {
  return (
    <section className="py-20 bg-secondary/30">
      <div className="container mx-auto px-4 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <span className="text-xs font-semibold tracking-widest uppercase text-primary mb-3 block">
            Full Transparency
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            How We Score Every Property
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            No black boxes. Our Global Score is built from 6 independent dimensions, each powered by real market data and AI analysis.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {pillars.map((pillar, i) => (
            <motion.div
              key={pillar.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="bg-card border border-border rounded-xl p-5 hover:shadow-lg hover:border-primary/20 hover:-translate-y-0.5 transition-all duration-300"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <pillar.icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{pillar.label}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-3">{pillar.description}</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    initial={{ width: 0 }}
                    whileInView={{ width: `${pillar.value}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: 0.3 + i * 0.08 }}
                  />
                </div>
                <span className="text-xs font-mono font-semibold text-foreground w-8 text-right">
                  {pillar.value}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="text-center text-xs text-muted-foreground mt-8 mb-14"
        >
          Example scores shown. Each property gets unique scores based on real-time data analysis.
        </motion.p>

        {/* Trust badges — merged from TrustSection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <h3 className="text-xl md:text-2xl font-bold text-foreground">
            Independence is our product.
          </h3>
        </motion.div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-3xl mx-auto">
          {[
            { icon: ShieldCheck, title: "Transparent Scoring", description: "Every factor and weight is documented." },
            { icon: BarChart3, title: "No Paid Placements", description: "Rankings are purely data-driven." },
            { icon: Database, title: "Data Sources Displayed", description: "Verify every analysis independently." },
            { icon: Eye, title: "No Affiliate Bias", description: "Our only product is insight." },
          ].map((point, i) => (
            <motion.div
              key={point.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="rounded-xl border border-border bg-card p-4 sm:p-5 text-center hover:border-primary/20 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
            >
              <point.icon className="h-5 w-5 text-muted-foreground mx-auto mb-3" />
              <h4 className="text-xs font-semibold text-foreground mb-1">{point.title}</h4>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{point.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MethodologyPreview;
