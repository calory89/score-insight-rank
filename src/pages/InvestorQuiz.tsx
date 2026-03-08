import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import useDocumentMeta from "@/hooks/useDocumentMeta";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import {
  Target, DollarSign, Clock, Shield, TrendingUp, MapPin,
  ArrowRight, ArrowLeft, Loader2, Sparkles, ChevronRight,
} from "lucide-react";

const questions = [
  {
    id: "budget",
    icon: DollarSign,
    title: "What's your investment budget?",
    subtitle: "Total capital you're ready to deploy",
    options: [
      { value: "under-100k", label: "Under €100K", desc: "First-time investor" },
      { value: "100k-300k", label: "€100K – €300K", desc: "Moderate investment" },
      { value: "300k-1m", label: "€300K – €1M", desc: "Serious capital" },
      { value: "over-1m", label: "Over €1M", desc: "High-net-worth" },
    ],
  },
  {
    id: "timeHorizon",
    icon: Clock,
    title: "What's your investment horizon?",
    subtitle: "How long before you plan to exit",
    options: [
      { value: "1-3-years", label: "1–3 years", desc: "Short-term flip" },
      { value: "3-7-years", label: "3–7 years", desc: "Medium-term growth" },
      { value: "7-15-years", label: "7–15 years", desc: "Long-term hold" },
      { value: "15-plus", label: "15+ years", desc: "Generational wealth" },
    ],
  },
  {
    id: "riskTolerance",
    icon: Shield,
    title: "What's your risk tolerance?",
    subtitle: "How much volatility can you stomach",
    options: [
      { value: "conservative", label: "Conservative", desc: "Capital preservation first" },
      { value: "moderate", label: "Moderate", desc: "Balanced risk/reward" },
      { value: "aggressive", label: "Aggressive", desc: "Max returns, higher risk" },
      { value: "speculative", label: "Speculative", desc: "Emerging markets, high upside" },
    ],
  },
  {
    id: "goal",
    icon: TrendingUp,
    title: "What's your primary goal?",
    subtitle: "What matters most to you",
    options: [
      { value: "rental-yield", label: "Rental Yield", desc: "Monthly cash flow" },
      { value: "appreciation", label: "Capital Appreciation", desc: "Long-term value growth" },
      { value: "diversification", label: "Portfolio Diversification", desc: "Geographic spread" },
      { value: "lifestyle", label: "Lifestyle + Investment", desc: "Personal use + returns" },
    ],
  },
  {
    id: "location",
    icon: MapPin,
    title: "Preferred investment location?",
    subtitle: "Where do you want to invest",
    options: [
      { value: "western-europe", label: "Western Europe", desc: "Spain, France, Portugal, Italy" },
      { value: "eastern-europe", label: "Eastern Europe", desc: "Poland, Hungary, Balkans" },
      { value: "americas", label: "Americas", desc: "USA, Mexico, Colombia" },
      { value: "global", label: "Open to Anywhere", desc: "Best opportunity globally" },
    ],
  },
];

interface QuizResult {
  profile: { type: string; emoji: string; description: string };
  strategy: { primary: string; tips: string[] };
  recommendedMarkets: { city: string; country: string; reason: string }[];
  keyMetrics: { targetROI: string; maxRisk: string; idealPropertyType: string; holdPeriod: string };
}

const InvestorQuiz = () => {
  useDocumentMeta({ title: "Investment Strategy Quiz | RealHunt", description: "Discover your investor profile and get AI-powered market recommendations tailored to your goals." });
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState("");

  const selectAnswer = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    if (step < questions.length - 1) {
      setTimeout(() => setStep(step + 1), 300);
    }
  };

  const submitQuiz = async () => {
    setLoading(true);
    setError("");
    try {
      const { data, error: fnError } = await supabase.functions.invoke("investment-quiz", {
        body: { answers },
      }) as { data: any; error: any };
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setResult(data);
    } catch (e: any) {
      setError(e.message || "Failed to generate profile");
    } finally {
      setLoading(false);
    }
  };

  const q = questions[step];
  const progress = ((step + 1) / questions.length) * 100;
  const allAnswered = questions.every(q => answers[q.id]);

  return (
    <>
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-20 pb-24 max-w-2xl">
          {!result ? (
            <>
              {/* Progress */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Question {step + 1} of {questions.length}</span>
                  <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>

              {/* Question */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <q.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">{q.title}</h2>
                      <p className="text-xs text-muted-foreground">{q.subtitle}</p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    {q.options.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => selectAnswer(q.id, opt.value)}
                        className={`w-full text-left rounded-xl border p-4 transition-all duration-200 ${
                          answers[q.id] === opt.value
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border bg-card hover:border-primary/30 hover:bg-secondary/30"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-foreground">{opt.label}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                          </div>
                          <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                            answers[q.id] === opt.value ? "border-primary bg-primary" : "border-border"
                          }`}>
                            {answers[q.id] === opt.value && (
                              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="h-2 w-2 rounded-full bg-primary-foreground" />
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-8">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep(Math.max(0, step - 1))}
                  disabled={step === 0}
                  className="text-muted-foreground"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>

                {step === questions.length - 1 && allAnswered ? (
                  <Button variant="hero" size="lg" onClick={submitQuiz} disabled={loading}>
                    {loading ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analyzing…</>
                    ) : (
                      <><Sparkles className="h-4 w-4 mr-2" /> Get My Profile</>
                    )}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStep(Math.min(questions.length - 1, step + 1))}
                    disabled={!answers[q.id]}
                  >
                    Next <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </div>

              {error && (
                <p className="text-sm text-destructive text-center mt-4">{error}</p>
              )}
            </>
          ) : (
            /* Results */
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Profile Card */}
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center">
                <span className="text-5xl mb-3 block">{result.profile.emoji}</span>
                <h2 className="text-xl font-bold text-foreground mb-1">{result.profile.type}</h2>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">{result.profile.description}</p>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Target ROI", value: result.keyMetrics.targetROI, icon: TrendingUp },
                  { label: "Risk Level", value: result.keyMetrics.maxRisk, icon: Shield },
                  { label: "Property Type", value: result.keyMetrics.idealPropertyType, icon: Target },
                  { label: "Hold Period", value: result.keyMetrics.holdPeriod, icon: Clock },
                ].map(m => (
                  <div key={m.label} className="rounded-xl border border-border bg-card p-4">
                    <m.icon className="h-4 w-4 text-primary mb-1.5" />
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{m.label}</p>
                    <p className="text-sm font-semibold text-foreground capitalize">{m.value}</p>
                  </div>
                ))}
              </div>

              {/* Strategy */}
              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" /> Your Strategy
                </h3>
                <p className="text-sm text-muted-foreground mb-3">{result.strategy.primary}</p>
                <ul className="space-y-2">
                  {result.strategy.tips.map((tip, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                      <ChevronRight className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Recommended Markets */}
              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" /> Recommended Markets
                </h3>
                <div className="space-y-3">
                  {result.recommendedMarkets.map((m, i) => (
                    <div key={i} className="rounded-xl bg-secondary/50 border border-border p-4">
                      <p className="text-sm font-medium text-foreground">{m.city}, {m.country}</p>
                      <p className="text-xs text-muted-foreground mt-1">{m.reason}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="hero" className="flex-1" onClick={() => navigate("/")}>
                  <Target className="h-4 w-4 mr-2" /> Analyze a Property
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => { setResult(null); setStep(0); setAnswers({}); }}>
                  Retake Quiz
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
      <BottomNav />
    </>
  );
};

export default InvestorQuiz;
