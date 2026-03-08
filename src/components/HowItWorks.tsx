import { motion } from "framer-motion";
import { Link2, BarChart3, Target, ArrowLeftRight } from "lucide-react";

const steps = [
  {
    icon: Link2,
    title: "Paste the Link",
    description: "Drop any public listing URL from 50+ supported platforms.",
  },
  {
    icon: BarChart3,
    title: "We Analyze Everything",
    description: "Price, demand, growth, risk, and comparable performance — in seconds.",
  },
  {
    icon: Target,
    title: "Get Your Score",
    description: "RealHunt Global Score™ (0–100) with subscores and AI insights.",
  },
  {
    icon: ArrowLeftRight,
    title: "Compare Alternatives",
    description: "Discover higher-performing properties with better ROI and lower risk.",
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-24 md:py-32 relative">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Simple. Fast. Data-backed.
          </h2>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            From URL to investment intelligence in under 30 seconds.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-5xl mx-auto">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative group"
            >
              <div className="rounded-xl border border-border bg-card p-4 sm:p-6 h-full hover:border-primary/20 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <step.icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
                </div>
                <h3 className="text-sm sm:text-base font-semibold text-foreground mb-1 sm:mb-2">{step.title}</h3>
                <p className="text-[11px] sm:text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
