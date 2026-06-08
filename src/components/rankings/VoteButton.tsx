import { Flame } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getVoterFingerprint, markVotedLocally } from "@/lib/voteFingerprint";
import { useToast } from "@/hooks/use-toast";

interface VoteButtonProps {
  analysisId: string;
  count: number;
  voted: boolean;
  size?: "sm" | "md" | "lg";
  onVoted: (id: string) => void;
}

const VoteButton = ({ analysisId, count, voted, size = "sm", onVoted }: VoteButtonProps) => {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const handle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (voted || busy) return;
    setBusy(true);
    // Optimistic
    onVoted(analysisId);
    markVotedLocally(analysisId);

    const fp = getVoterFingerprint();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await (supabase as any)
      .from("votes")
      .insert({ analysis_id: analysisId, voter_fingerprint: fp, user_id: user?.id ?? null });

    if (error && !/duplicate|unique/i.test(error.message || "")) {
      toast({ title: "Vote not saved", description: error.message });
    }
    setBusy(false);
  };

  const padding = size === "lg" ? "px-3.5 py-2 text-[14px]" : size === "md" ? "px-3 py-1.5 text-[13px]" : "px-2.5 py-1 text-[12px]";
  const iconSize = size === "lg" ? "h-4 w-4" : size === "md" ? "h-3.5 w-3.5" : "h-3 w-3";

  return (
    <button
      onClick={handle}
      disabled={voted || busy}
      aria-label={voted ? "You voted" : "Upvote this project"}
      title={voted ? "You voted" : "Upvote — one per visitor"}
      className={`inline-flex items-center gap-1.5 rounded-full border tabular-nums font-mono transition-colors ${padding} ${
        voted
          ? "bg-accent-gold/15 text-accent-gold border-accent-gold/40"
          : "bg-paper text-ink-muted border-hairline hover:border-accent-gold/60 hover:text-accent-gold"
      } ${busy ? "opacity-60" : ""}`}
    >
      <Flame className={`${iconSize} ${voted ? "fill-current" : ""}`} />
      <span>{count.toLocaleString()}</span>
    </button>
  );
};

export default VoteButton;
