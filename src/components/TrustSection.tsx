import { motion } from "framer-motion";
import { ShieldCheck, BarChart3, Database, Eye } from "lucide-react";

const trustPoints = [
  {
    icon: ShieldCheck,
    title: "Transparent Scoring",
    description: "Every factor and weight is documented.",
  },
  {
    icon: BarChart3,
    title: "No Paid Placements",
    description: "Rankings are purely data-driven.",
  },
  {
    icon: Database,
    title: "Data Sources Displayed",
    description: "Verify every analysis independently.",
  },
  {
    icon: Eye,
    title: "No Affiliate Bias",
    description: "Our only product is insight.",
  },
];

const TrustSection = () => {
  return (
    <section id="trust" className="py-24 md:py-32 relative">
      <div className="absolute inset-0 bg-gradient-hero opacity-15" />
      <div className="container relative mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            Independence is our product.
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-3xl mx-auto">
          {trustPoints.map((point, i) => (
            <motion.div
              key={point.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="rounded-xl border border-border bg-card p-4 sm:p-5 text-center hover:border-primary/15 transition-colors"
            >
              <point.icon className="h-5 w-5 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-xs font-semibold text-foreground mb-1">{point.title}</h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{point.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustSection;
