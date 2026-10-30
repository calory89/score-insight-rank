import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Compass, Users, Trophy, ArrowRight, HelpCircle, MessageCircle, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import LoginGateModal from "@/components/LoginGateModal";

const questions = [
  "Is Bali still a good investment in 2026?",
  "Best areas for rental yield in Portugal?",
  "Red flags in off-plan projects?",
];

const DiscoverPromo = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showLoginGate, setShowLoginGate] = useState(false);

  const handleClick = () => {
    if (user) {
      navigate("/discover");
    } else {
      setShowLoginGate(true);
    }
  };

  return (
    <section className="py-24 md:py-32 relative">
      <div className="absolute inset-0 bg-gradient-hero opacity-20" />
      <div className="container relative mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto"
        >
          {/* Top: Discover feature */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 mb-4">
              <Compass className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-primary uppercase tracking-wider">Discover & Community</span>
            </div>

            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              Discover What Top Hunters Are Finding
            </h2>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto mb-8 leading-relaxed">
              Follow the smartest investors worldwide. See the highest scoring properties before everyone else. Build your reputation as a Hunter.
            </p>

            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-10">
              <div className="rounded-xl border border-border bg-card p-4 text-center hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                <Users className="h-5 w-5 text-primary mx-auto mb-2" />
                <p className="text-xs font-medium text-foreground">Follow</p>
                <p className="text-[10px] text-muted-foreground">Top investors</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4 text-center hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                <Compass className="h-5 w-5 text-primary mx-auto mb-2" />
                <p className="text-xs font-medium text-foreground">Discover</p>
                <p className="text-[10px] text-muted-foreground">Best finds</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4 text-center hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                <Trophy className="h-5 w-5 text-primary mx-auto mb-2" />
                <p className="text-xs font-medium text-foreground">Compete</p>
                <p className="text-[10px] text-muted-foreground">Hunter ranks</p>
              </div>
            </div>
          </div>

          {/* Bottom: Ask the Hunters (merged from CommunityAskCTA) */}
          <div className="max-w-3xl mx-auto grid md:grid-cols-2 gap-10 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="inline-flex items-center gap-2 mb-3">
                <HelpCircle className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-primary uppercase tracking-wider">Ask the Hunters</span>
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                Not Sure Where to Invest?
              </h3>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                Ask thousands of active investors who've already done the research. Get real answers from people who bought, lived it, and can tell you what the data can't.
              </p>
              <Button variant="hero" onClick={handleClick}>
                {user ? "Open Discover" : "Get Started: Free"} <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-3"
            >
              {questions.map((q, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-border bg-card p-4 flex items-start gap-3 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
                >
                  <MessageCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-foreground">{q}</p>
                    <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" /> {12 + i * 7} answers · trending
                    </p>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </div>

      <LoginGateModal open={showLoginGate} onClose={() => setShowLoginGate(false)} />
    </section>
  );
};

export default DiscoverPromo;
