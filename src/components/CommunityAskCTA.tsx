import { motion } from "framer-motion";
import { HelpCircle, ArrowRight, MessageCircle, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const CommunityAskCTA = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const questions = [
    "Is Bali still a good investment in 2026?",
    "Best areas for rental yield in Portugal?",
    "Red flags in off-plan projects?",
  ];

  return (
    <section className="py-20 md:py-28 relative">
      <div className="absolute inset-0 bg-gradient-hero opacity-30" />
      <div className="container relative mx-auto px-4">
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
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
              Not Sure Where to Invest?
            </h2>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              Ask thousands of active investors who've already done the research. Get real answers from people who bought, lived it, and can tell you what the data can't.
            </p>
            <Button
              variant="hero"
              onClick={() => navigate(user ? "/discover" : "/#pricing")}
            >
              {user ? "Ask the Community" : "Join Free"} <ArrowRight className="ml-1 h-4 w-4" />
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
                className="rounded-xl border border-border bg-card p-4 flex items-start gap-3"
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
      </div>
    </section>
  );
};

export default CommunityAskCTA;
