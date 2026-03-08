import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Briefcase, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onClose: () => void;
  analysisId: string;
  suggestedPrice?: string;
  currency?: string;
}

export default function AddToPortfolioModal({ open, onClose, analysisId, suggestedPrice, currency = "€" }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [price, setPrice] = useState(suggestedPrice?.replace(/[^0-9.]/g, "") || "");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const handleSave = async () => {
    if (!user || !price) return;
    setSaving(true);
    const { error } = await supabase.from("portfolio_properties" as any).insert({
      user_id: user.id,
      analysis_id: analysisId,
      purchase_price: parseFloat(price),
      purchase_date: date,
      currency,
    } as any);
    setSaving(false);
    if (error?.code === "23505") {
      toast({ title: "Already in portfolio", description: "This property is already in your portfolio." });
    } else if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Added to Portfolio! 🎉", description: "Track it in your Portfolio page." });
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9 }} animate={{ scale: 1 }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Add to Portfolio</h3>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Purchase Price ({currency})</label>
              <Input
                type="number"
                placeholder="250000"
                value={price}
                onChange={e => setPrice(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Purchase Date</label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <Button variant="hero" className="w-full" onClick={handleSave} disabled={saving || !price}>
              {saving ? "Saving…" : "Add to Portfolio"}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
