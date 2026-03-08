import { useEffect, useState } from "react";
import { Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const StreakBadge = () => {
  const { user } = useAuth();
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (!user) return;

    const updateStreak = async () => {
      const today = new Date().toISOString().split("T")[0];

      // Try to get existing streak
      const { data } = await (supabase as any)
        .from("user_streaks")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!data) {
        // Create new streak
        await (supabase as any).from("user_streaks").insert({
          user_id: user.id,
          current_streak: 1,
          longest_streak: 1,
          last_active_date: today,
        });
        setStreak(1);
        return;
      }

      const lastActive = data.last_active_date;
      if (lastActive === today) {
        setStreak(data.current_streak);
        return;
      }

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      let newStreak: number;
      if (lastActive === yesterdayStr) {
        newStreak = (data.current_streak || 0) + 1;
      } else {
        newStreak = 1;
      }

      const longestStreak = Math.max(newStreak, data.longest_streak || 0);

      await (supabase as any)
        .from("user_streaks")
        .update({ current_streak: newStreak, longest_streak: longestStreak, last_active_date: today })
        .eq("user_id", user.id);

      setStreak(newStreak);
    };

    updateStreak();
  }, [user]);

  if (!streak || streak < 1) return null;

  return (
    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20">
      <Flame className="h-3 w-3 text-orange-500" />
      <span className="text-xs font-bold text-orange-500">{streak}</span>
    </div>
  );
};

export default StreakBadge;
