import { motion } from "framer-motion";
import { ShieldCheck, BarChart3, Database, Eye } from "lucide-react";

const trustPoints = [
  {
    icon: ShieldCheck,
    title: "Transparent Scoring",
    description: "Our methodology is fully documented. Every factor and weight is explained.",
  },
  {
    icon: BarChart3,
    title: "No Paid Placements",
    description: "Rankings are purely data-driven. No property pays to rank higher.",
  },
  {
    icon: Database,
    title: "Data Sources Displayed",
    description: "Every analysis shows its data sources so you can verify independently.",
  },
  {
    icon: Eye,
    title: "No Affiliate Bias",
    description: "We don't earn commissions from referrals. Our only product is insight.",
  },
];

const TrustSection = () => {
  return (
    <section id="trust" className="py-24 md:py-32 relative">
      <div className="absolute inset-0 bg-gradient-hero opacity-30" />
      <div className="container relative mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Built on Trust
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Independence is our product. Transparency is our method.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {trustPoints.map((point, i) => (
            <motion.div
              key={point.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rounded-xl border border-border bg-card p-6 hover:border-primary/20 transition-colors"
            >
              <point.icon className="h-5 w-5 text-primary mb-3" />
              <h3 className="text-sm font-semibold text-foreground mb-1">{point.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{point.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustSection;
