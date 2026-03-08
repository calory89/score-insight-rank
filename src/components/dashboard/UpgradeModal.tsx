import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Crown, Zap, Shield, TrendingUp, GitCompare } from "lucide-react";

const FREE_LIMIT = 5;

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
}

const UpgradeModal = ({ open, onClose }: UpgradeModalProps) => {
  const navigate = useNavigate();
  if (!open) return null;
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={onClose}>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md rounded-2xl border border-primary/30 bg-card p-8 shadow-xl text-center">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Crown className="h-7 w-7 text-primary" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">You've hit your free limit</h3>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            You've used all <strong>{FREE_LIMIT} free analyses</strong> this month. Upgrade to Pro to unlock <strong>300 analyses/month</strong>, advanced ROI breakdowns, risk classification, PDF exports, and more.
          </p>
          <div className="space-y-3 text-left mb-6">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Zap className="h-3.5 w-3.5 text-primary" /> Save time — analyze 300 properties/month</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Shield className="h-3.5 w-3.5 text-primary" /> Never miss a deal — risk classification & red flags</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><TrendingUp className="h-3.5 w-3.5 text-primary" /> Make money — advanced ROI & financial breakdowns</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><GitCompare className="h-3.5 w-3.5 text-primary" /> Compare up to 4 properties side-by-side</div>
          </div>
          <Button variant="hero" className="w-full mb-3" onClick={() => { onClose(); navigate("/#pricing"); }}>
            Upgrade to Pro — $29/mo
          </Button>
          <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Maybe later</button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default UpgradeModal;
