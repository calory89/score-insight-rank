import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import useDocumentMeta from "@/hooks/useDocumentMeta";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import { GameLeaderboard } from "@/components/GameLeaderboard";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown, Share2, RotateCcw, Trophy, MapPin, ArrowLeft, Flame } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";

interface GameProperty {
  id: string;
  address: string | null;
  city: string | null;
  country: string | null;
  price: string | null;
  currency: string | null;
  global_score: number;
  image_url: string | null;
  property_type: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
}

const ROUNDS = 10;
const GOOD_THRESHOLD = 70;

const Game = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  useDocumentMeta({
    title: "Deal or No Deal — RealHunt Property Game",
    description: "Can you spot a good real estate deal? Swipe through properties and test your instincts in this addictive property game.",
  });
  const [properties, setProperties] = useState<GameProperty[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<{ correct: boolean; score: number; guessed: string }[]>([]);
  const [phase, setPhase] = useState<"loading" | "playing" | "reveal" | "finished">("loading");
  const [revealScore, setRevealScore] = useState<number | null>(null);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const goodOpacity = useTransform(x, [0, 100], [0, 1]);
  const badOpacity = useTransform(x, [-100, 0], [1, 0]);

  useEffect(() => {
    loadProperties();
  }, []);

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    const { data } = await supabase
      .from("analyses")
      .select("id, address, city, country, price, currency, global_score, image_url, property_type, bedrooms, bathrooms")
      .not("global_score", "is", null)
      .gt("global_score", 0)
      .limit(100);

    if (!data || data.length < ROUNDS) {
      setPhase("finished");
      return;
    }

    // Shuffle and pick ROUNDS properties
    const shuffled = data.sort(() => Math.random() - 0.5).slice(0, ROUNDS);
    setProperties(shuffled as GameProperty[]);
    setPhase("playing");
  };

  const handleSwipe = useCallback((direction: "left" | "right") => {
    if (phase !== "playing" || currentIndex >= properties.length) return;

    const property = properties[currentIndex];
    const isGoodDeal = property.global_score >= GOOD_THRESHOLD;
    const guessed = direction === "right" ? "good" : "bad";
    const correct = (direction === "right" && isGoodDeal) || (direction === "left" && !isGoodDeal);

    setRevealScore(property.global_score);
    setLastCorrect(correct);
    setPhase("reveal");

    if (correct) {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 }, colors: ["#22c55e", "#10b981", "#34d399"] });
    }

    setResults(prev => [...prev, { correct, score: property.global_score, guessed }]);

    setTimeout(() => {
      if (currentIndex + 1 >= ROUNDS) {
        setPhase("finished");
      } else {
        setCurrentIndex(prev => prev + 1);
        setPhase("playing");
        setRevealScore(null);
        setLastCorrect(null);
        x.set(0);
      }
    }, 1500);
  }, [phase, currentIndex, properties, x]);

  // Keyboard shortcuts for arrow keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase !== "playing") return;
      if (e.key === "ArrowRight") handleSwipe("right");
      else if (e.key === "ArrowLeft") handleSwipe("left");
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phase, handleSwipe]);

  // Save score to DB when game finishes
  useEffect(() => {
    if (phase === "finished" && results.length === ROUNDS && user) {
      const finalScore = results.filter(r => r.correct).length;
      supabase.from("game_scores").insert({
        user_id: user.id,
        score: finalScore,
        total_rounds: ROUNDS,
      });
    }
  }, [phase, results, user]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 80) {
      handleSwipe(info.offset.x > 0 ? "right" : "left");
    }
  };

  const handleShare = async () => {
    const correctCount = results.filter(r => r.correct).length;
    const text = `🏠 I spotted ${correctCount}/${ROUNDS} deals correctly on RealHunt!\n\nCan you beat my score? 👉`;
    const url = `${window.location.origin}/game`;

    if (navigator.share) {
      try {
        await navigator.share({ title: "RealHunt Deal or No Deal", text, url });
      } catch {}
    } else {
      await navigator.clipboard.writeText(`${text} ${url}`);
      toast({ title: "Copied!", description: "Score link copied to clipboard." });
    }
  };

  const restart = () => {
    setResults([]);
    setCurrentIndex(0);
    setRevealScore(null);
    setLastCorrect(null);
    setPhase("loading");
    loadProperties();
  };

  const correctCount = results.filter(r => r.correct).length;
  const current = properties[currentIndex];

  return (
    <div className="min-h-screen bg-background pb-16 sm:pb-0">
      <Navbar />
      <div className="container mx-auto px-4 pt-20 pb-8 max-w-md">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-3 w-3" /> Back
        </button>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-foreground flex items-center justify-center gap-2">
            <Flame className="h-6 w-6 text-orange-500" /> Deal or No Deal
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Swipe right for Good Deal, left for Bad Deal</p>
        </div>

        {/* Progress */}
        {phase !== "finished" && phase !== "loading" && (
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-mono text-muted-foreground">{currentIndex + 1}/{ROUNDS}</span>
            <div className="flex gap-1">
              {results.map((r, i) => (
                <div key={i} className={`h-2 w-2 rounded-full ${r.correct ? "bg-green-500" : "bg-red-500"}`} />
              ))}
              {Array.from({ length: ROUNDS - results.length }).map((_, i) => (
                <div key={`e-${i}`} className="h-2 w-2 rounded-full bg-muted" />
              ))}
            </div>
            <span className="text-xs font-mono text-green-500">{correctCount}✓</span>
          </div>
        )}

        {/* Loading */}
        {phase === "loading" && (
          <div className="flex items-center justify-center h-96">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Card */}
        {(phase === "playing" || phase === "reveal") && current && (
          <div className="relative h-[420px] flex items-center justify-center">
            <AnimatePresence>
              <motion.div
                key={current.id}
                className="absolute w-full cursor-grab active:cursor-grabbing"
                style={{ x, rotate }}
                drag={phase === "playing" ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={handleDragEnd}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
              >
                <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xl">
                  {/* Image */}
                  <div className="relative h-48 bg-muted">
                    {current.image_url ? (
                      <img src={current.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <MapPin className="h-12 w-12 text-muted-foreground/30" />
                      </div>
                    )}
                    {/* Swipe labels */}
                    <motion.div style={{ opacity: goodOpacity }} className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-lg font-bold text-sm rotate-12 border-2 border-green-300">
                      GOOD DEAL ✓
                    </motion.div>
                    <motion.div style={{ opacity: badOpacity }} className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-lg font-bold text-sm -rotate-12 border-2 border-red-300">
                      BAD DEAL ✗
                    </motion.div>
                  </div>

                  {/* Info */}
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-foreground text-lg">
                          {current.city || "Unknown City"}{current.country ? `, ${current.country}` : ""}
                        </h3>
                        <p className="text-xs text-muted-foreground">{current.property_type || "Property"}</p>
                      </div>
                      {current.price && (
                        <span className="text-lg font-bold text-primary">{current.currency}{current.price}</span>
                      )}
                    </div>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      {current.bedrooms && <span>{current.bedrooms} bed</span>}
                      {current.bathrooms && <span>{current.bathrooms} bath</span>}
                    </div>

                    {/* Reveal overlay */}
                    {phase === "reveal" && revealScore !== null && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`mt-4 p-3 rounded-xl text-center ${lastCorrect ? "bg-green-500/10 border border-green-500/20" : "bg-red-500/10 border border-red-500/20"}`}
                      >
                        <p className={`text-2xl font-bold ${lastCorrect ? "text-green-500" : "text-red-500"}`}>
                          {lastCorrect ? "✓ Correct!" : "✗ Wrong!"}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Score: <span className="font-bold text-foreground">{revealScore}/100</span>
                          {" · "}
                          {revealScore >= GOOD_THRESHOLD ? "Good Deal" : "Bad Deal"}
                        </p>
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        {/* Button controls */}
        {phase === "playing" && (
          <div className="flex items-center justify-center gap-6 mt-4">
            <button
              onClick={() => handleSwipe("left")}
              className="h-14 w-14 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center hover:bg-red-500/20 transition-colors"
            >
              <ThumbsDown className="h-6 w-6 text-red-500" />
            </button>
            <button
              onClick={() => handleSwipe("right")}
              className="h-14 w-14 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center hover:bg-green-500/20 transition-colors"
            >
              <ThumbsUp className="h-6 w-6 text-green-500" />
            </button>
          </div>
        )}

        {/* Finished */}
        {phase === "finished" && results.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-6">
            <div className="rounded-2xl border border-border bg-card p-8">
              <Trophy className={`h-12 w-12 mx-auto mb-3 ${correctCount >= 8 ? "text-yellow-500" : correctCount >= 5 ? "text-primary" : "text-muted-foreground"}`} />
              <h2 className="text-3xl font-bold text-foreground">{correctCount}/{ROUNDS}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {correctCount >= 9 ? "🔥 Deal Hunter Legend!" : correctCount >= 7 ? "Great eye for deals!" : correctCount >= 5 ? "Not bad! Keep practicing." : "Room for improvement!"}
              </p>

              <div className="grid grid-cols-5 gap-2 mt-6">
                {results.map((r, i) => (
                  <div key={i} className={`rounded-lg p-2 text-center ${r.correct ? "bg-green-500/10" : "bg-red-500/10"}`}>
                    <p className="text-xs font-mono text-foreground">{r.score}</p>
                    <p className="text-[10px] text-muted-foreground">{r.correct ? "✓" : "✗"}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={restart}>
                <RotateCcw className="h-4 w-4 mr-1" /> Play Again
              </Button>
              <Button variant="hero" className="flex-1" onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-1" /> Share Score
              </Button>
            </div>

            {!user && (
              <Button variant="ghost" className="w-full text-sm" onClick={() => navigate("/")}>
                Sign up to analyze your own properties →
              </Button>
            )}

            <GameLeaderboard currentUserId={user?.id} currentScore={correctCount} />
          </motion.div>
        )}

        {phase === "finished" && results.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground">Not enough properties in the database yet. Come back later!</p>
            <Button variant="ghost" className="mt-4" onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default Game;
