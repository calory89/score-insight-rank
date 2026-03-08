import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

const EmptyState = ({ icon: Icon, title, description, actionLabel, onAction, className = "" }: EmptyStateProps) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    className={`text-center py-16 rounded-2xl border border-dashed border-border bg-secondary/10 ${className}`}
  >
    <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
      <Icon className="h-7 w-7 text-primary" />
    </div>
    <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
    <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-5">{description}</p>
    {actionLabel && onAction && (
      <Button variant="hero" size="sm" onClick={onAction}>
        {actionLabel}
      </Button>
    )}
  </motion.div>
);

export default EmptyState;
