import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Star, Flame, Eye, GitCompare, MessageSquare, Briefcase, Target, Zap } from "lucide-react";
import confetti from "canvas-confetti";

export interface Achievement {
  key: string;
  title: string;
  description: string;
  icon: React.ElementType;
  check: (stats: AchievementStats) => boolean;
}

interface AchievementStats {
  analysisCount: number;
  favoriteCount: number;
  reviewCount: number;
  streakDays: number;
  watchlistCount: number;
  portfolioCount: number;
  compareCount: number;
}

export const ACHIEVEMENTS: Achievement[] = [
  { key: "first_analysis", title: "First Hunt", description: "Analyze your first property", icon: Target, check: s => s.analysisCount >= 1 },
  { key: "5_analyses", title: "Getting Serious", description: "Analyze 5 properties", icon: Eye, check: s => s.analysisCount >= 5 },
  { key: "10_analyses", title: "Property Hawk", description: "Analyze 10 properties", icon: Star, check: s => s.analysisCount >= 10 },
  { key: "25_analyses", title: "Market Expert", description: "Analyze 25 properties", icon: Zap, check: s => s.analysisCount >= 25 },
  { key: "50_analyses", title: "Deal Machine", description: "Analyze 50 properties", icon: Trophy, check: s => s.analysisCount >= 50 },
  { key: "first_favorite", title: "Bookmarked", description: "Save your first favorite", icon: Star, check: s => s.favoriteCount >= 1 },
  { key: "first_review", title: "Critic", description: "Write your first review", icon: MessageSquare, check: s => s.reviewCount >= 1 },
  { key: "3_day_streak", title: "On Fire", description: "3-day analysis streak", icon: Flame, check: s => s.streakDays >= 3 },
  { key: "7_day_streak", title: "Unstoppable", description: "7-day analysis streak", icon: Flame, check: s => s.streakDays >= 7 },
  { key: "first_portfolio", title: "Investor", description: "Add a property to your portfolio", icon: Briefcase, check: s => s.portfolioCount >= 1 },
  { key: "first_watchlist", title: "Watchful Eye", description: "Add a property to your watchlist", icon: Eye, check: s => s.watchlistCount >= 1 },
];

export function useAchievements() {
  const { user } = useAuth();
  const [unlocked, setUnlocked] = useState<string[]>([]);
  const [newlyUnlocked, setNewlyUnlocked] = useState<Achievement | null>(null);

  const loadUnlocked = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_achievements" as any)
      .select("achievement_key")
      .eq("user_id", user.id);
    if (data) setUnlocked(data.map((d: any) => d.achievement_key));
  }, [user]);

  useEffect(() => { loadUnlocked(); }, [loadUnlocked]);

  const checkAndUnlock = useCallback(async (stats: AchievementStats) => {
    if (!user) return;
    for (const ach of ACHIEVEMENTS) {
      if (unlocked.includes(ach.key)) continue;
      if (ach.check(stats)) {
        const { error } = await supabase
          .from("user_achievements" as any)
          .insert({ user_id: user.id, achievement_key: ach.key } as any);
        if (!error) {
          setUnlocked(prev => [...prev, ach.key]);
          setNewlyUnlocked(ach);
          confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
          setTimeout(() => setNewlyUnlocked(null), 4000);
        }
      }
    }
  }, [user, unlocked]);

  return { unlocked, checkAndUnlock, newlyUnlocked, dismissNew: () => setNewlyUnlocked(null) };
}

export function AchievementToast({ achievement, onDismiss }: { achievement: Achievement | null; onDismiss: () => void }) {
  if (!achievement) return null;
  const Icon = achievement.icon;
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.9 }}
        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] bg-card border border-primary/30 rounded-2xl px-6 py-4 shadow-xl flex items-center gap-4 max-w-sm"
        onClick={onDismiss}
      >
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-primary font-semibold">Achievement Unlocked!</p>
          <p className="text-sm font-bold text-foreground">{achievement.title}</p>
          <p className="text-xs text-muted-foreground">{achievement.description}</p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export function AchievementGrid({ unlocked }: { unlocked: string[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {ACHIEVEMENTS.map(ach => {
        const isUnlocked = unlocked.includes(ach.key);
        const Icon = ach.icon;
        return (
          <motion.div
            key={ach.key}
            whileHover={isUnlocked ? { scale: 1.03 } : undefined}
            className={`rounded-xl border p-4 text-center transition-all ${
              isUnlocked
                ? "bg-primary/5 border-primary/20"
                : "bg-muted/50 border-border opacity-40 grayscale"
            }`}
          >
            <div className={`h-10 w-10 rounded-full mx-auto mb-2 flex items-center justify-center ${
              isUnlocked ? "bg-primary/10" : "bg-muted"
            }`}>
              <Icon className={`h-5 w-5 ${isUnlocked ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <p className="text-xs font-semibold text-foreground">{ach.title}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{ach.description}</p>
          </motion.div>
        );
      })}
    </div>
  );
}
