import { motion } from "framer-motion";
import { Code2, Building2, Users, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";

const useCases = [
  { icon: Landmark, label: "For Banks" },
  { icon: Users, label: "For Agents" },
  { icon: Building2, label: "For Funds" },
  { icon: Code2, label: "For Developers" },
];

const APISection = () => {
  return (
    <section className="py-24 md:py-32 relative">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            RealHunt API
          </h2>
          <p className="text-muted-foreground mb-10">
            Real estate intelligence infrastructure for banks, agents, and investment platforms.
          </p>

          <div className="flex items-center justify-center gap-3 flex-wrap mb-8">
            {useCases.map((uc) => (
              <div
                key={uc.label}
                className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2"
              >
                <uc.icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{uc.label}</span>
              </div>
            ))}
          </div>

          <Button variant="hero-outline">Join the Waitlist</Button>
        </motion.div>
      </div>
    </section>
  );
};

export default APISection;
