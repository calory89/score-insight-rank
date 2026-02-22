import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Compass, Users, Trophy, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const DiscoverPromo = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <section className="py-24 md:py-32 relative">
      <div className="absolute inset-0 bg-gradient-hero opacity-20" />
      <div className="container relative mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center"
        >
          <div className="inline-flex items-center gap-2 mb-4">
            <Compass className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-primary uppercase tracking-wider">New Feature</span>
          </div>

          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Discover What Top Hunters Are Finding
          </h2>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto mb-8 leading-relaxed">
            Follow the smartest investors worldwide. See the highest scoring properties before everyone else. Build your reputation as a Hunter.
          </p>

          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-8">
            <div className="rounded-xl border border-border bg-card p-4 text-center">
              <Users className="h-5 w-5 text-primary mx-auto mb-2" />
              <p className="text-xs font-medium text-foreground">Follow</p>
              <p className="text-[10px] text-muted-foreground">Top investors</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 text-center">
              <Compass className="h-5 w-5 text-primary mx-auto mb-2" />
              <p className="text-xs font-medium text-foreground">Discover</p>
              <p className="text-[10px] text-muted-foreground">Best finds</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 text-center">
              <Trophy className="h-5 w-5 text-primary mx-auto mb-2" />
              <p className="text-xs font-medium text-foreground">Compete</p>
              <p className="text-[10px] text-muted-foreground">Hunter ranks</p>
            </div>
          </div>

          <Button
            variant="hero"
            size="lg"
            onClick={() => {
              if (user) navigate("/discover");
              else navigate("/#pricing");
            }}
          >
            {user ? "Open Discover" : "Get Started — Free"} <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default DiscoverPromo;
