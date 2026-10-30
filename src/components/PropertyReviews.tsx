import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Star, Send, User, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

type Review = {
  id: string;
  user_id: string;
  rating: number;
  comment: string;
  is_verified_owner: boolean;
  created_at: string;
  profile_email?: string;
};

const StarRating = ({ value, onChange, readonly = false }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((s) => (
      <button
        key={s}
        type="button"
        disabled={readonly}
        onClick={() => onChange?.(s)}
        className={`${readonly ? "cursor-default" : "cursor-pointer hover:scale-110"} transition-transform`}
      >
        <Star className={`h-4 w-4 ${s <= value ? "fill-primary text-primary" : "text-muted-foreground/30"}`} />
      </button>
    ))}
  </div>
);

const PropertyReviews = ({ analysisId }: { analysisId: string }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    loadReviews();
  }, [analysisId]);

  const loadReviews = async () => {
    const { data } = await (supabase as any)
      .from("property_reviews")
      .select("*")
      .eq("analysis_id", analysisId)
      .order("created_at", { ascending: false });

    if (data) {
      // Fetch profile emails for display
      const userIds = [...new Set(data.map((r: any) => r.user_id))] as string[];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, email")
        .in("user_id", userIds);

      const emailMap = new Map(profiles?.map((p) => [p.user_id, p.email]) || []);
      setReviews(data.map((r: any) => ({ ...r, profile_email: emailMap.get(r.user_id) || "Anonymous" })));
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!user || !comment.trim() || rating === 0) return;
    setSubmitting(true);
    try {
      const { error } = await (supabase as any)
        .from("property_reviews")
        .insert({ analysis_id: analysisId, user_id: user.id, rating, comment: comment.trim() });
      if (error) throw error;
      toast({ title: "Review posted!", description: "Thanks for contributing to the community." });
      setComment("");
      setRating(0);
      setShowForm(false);
      loadReviews();
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Could not post review", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null;

  const maskEmail = (email: string) => {
    if (!email || email === "Anonymous") return "Anonymous";
    const [name, domain] = email.split("@");
    return name.substring(0, 2) + "***@" + (domain || "");
  };

  const timeAgo = (date: string) => {
    const d = new Date(date);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // Hide the section entirely when no real reviews exist
  if (!loading && reviews.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <button onClick={() => setExpanded(!expanded)} className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Community Reviews</h3>
          {avgRating && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Star className="h-3 w-3 fill-primary text-primary" /> {avgRating} · {reviews.length} review{reviews.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mt-4 space-y-4">
              {/* Write review */}
              {user ? (
                showForm ? (
                  <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">Your rating:</span>
                      <StarRating value={rating} onChange={setRating} />
                    </div>
                    <Textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Share your opinion about this property or project…"
                      rows={3}
                      className="bg-background text-sm"
                    />
                    <div className="flex items-center justify-between">
                      <button onClick={() => setShowForm(false)} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
                      <Button variant="hero" size="sm" disabled={submitting || !comment.trim() || rating === 0} onClick={handleSubmit}>
                        {submitting ? "Posting…" : "Post Review"} <Send className="ml-1 h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowForm(true)}
                    className="w-full rounded-xl border border-dashed border-border bg-secondary/20 p-3 text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
                  >
                    + Write a review or ask a question about this property
                  </button>
                )
              ) : (
                <p className="text-xs text-muted-foreground text-center py-2">Sign in to write a review.</p>
              )}

              {/* Reviews list */}
              {loading ? (
                <div className="flex justify-center py-6">
                  <div className="h-5 w-5 rounded-full border-2 border-t-primary border-border animate-spin" />
                </div>
              ) : reviews.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No reviews yet. Be the first to share your opinion!</p>
              ) : (
                <div className="space-y-3">
                  {reviews.map((review) => (
                    <div key={review.id} className="rounded-xl border border-border/50 bg-secondary/20 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-3 w-3 text-primary" />
                          </div>
                          <span className="text-xs font-medium text-foreground">{maskEmail(review.profile_email || "")}</span>
                          {review.is_verified_owner && (
                            <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">✓ Verified Owner</span>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground">{timeAgo(review.created_at)}</span>
                      </div>
                      <StarRating value={review.rating} readonly />
                      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{review.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PropertyReviews;
