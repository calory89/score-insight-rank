import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Crown } from "lucide-react";
import { motion } from "framer-motion";

interface LeaderboardEntry {
  user_id: string;
  score: number;
  username: string | null;
  played_at: string;
}

export const GameLeaderboard = ({ currentUserId, currentScore }: { currentUserId?: string; currentScore?: number }) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [totalPlayers, setTotalPlayers] = useState(0);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Get top 10 this week
    const { data: scores } = await supabase
      .from("game_scores")
      .select("user_id, score, played_at")
      .gte("played_at", weekAgo.toISOString())
      .order("score", { ascending: false })
      .limit(10);

    if (!scores || scores.length === 0) return;

    // Get usernames for the top players
    const userIds = [...new Set(scores.map(s => s.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, username")
      .in("user_id", userIds);

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p.username]));

    setEntries(scores.map(s => ({
      ...s,
      username: profileMap.get(s.user_id) || null,
    })));

    // Get total players this week
    const { count } = await supabase
      .from("game_scores")
      .select("id", { count: "exact", head: true })
      .gte("played_at", weekAgo.toISOString());

    setTotalPlayers(count || 0);

    // Get current user's rank
    if (currentUserId && currentScore != null) {
      const { count: betterCount } = await supabase
        .from("game_scores")
        .select("id", { count: "exact", head: true })
        .gte("played_at", weekAgo.toISOString())
        .gt("score", currentScore);

      setUserRank((betterCount || 0) + 1);
    }
  };

  if (entries.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-2xl border border-border bg-card p-5 mt-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="h-5 w-5 text-yellow-500" />
        <h3 className="font-semibold text-foreground text-sm">Top 10 This Week</h3>
      </div>

      {userRank && totalPlayers > 0 && (
        <p className="text-xs text-muted-foreground mb-3">
          You're <span className="font-bold text-primary">#{userRank}</span> out of {totalPlayers} players this week
        </p>
      )}

      <div className="space-y-1.5">
        {entries.map((entry, i) => (
          <div
            key={`${entry.user_id}-${i}`}
            className={`flex items-center gap-3 py-1.5 px-2 rounded-lg text-xs ${
              entry.user_id === currentUserId ? "bg-primary/10 border border-primary/20" : ""
            }`}
          >
            <span className="w-5 text-center font-mono font-bold text-muted-foreground">
              {i === 0 ? <Crown className="h-3.5 w-3.5 text-yellow-500 inline" /> : `#${i + 1}`}
            </span>
            <span className="flex-1 text-foreground truncate">
              {entry.username || `Player ${entry.user_id.slice(0, 4)}`}
              {entry.user_id === currentUserId && <span className="text-primary ml-1">(you)</span>}
            </span>
            <span className="font-mono font-bold text-foreground">{entry.score}/{10}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};
