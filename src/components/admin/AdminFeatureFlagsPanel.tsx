import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useFeatureFlags } from "@/hooks/useFeatureFlag";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Flag, ToggleLeft, ToggleRight, Clock, Info
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const AdminFeatureFlagsPanel = () => {
  const { data: flags, isLoading, error } = useFeatureFlags();
  const queryClient = useQueryClient();
  const [updating, setUpdating] = useState<string | null>(null);

  const handleToggle = async (key: string, currentValue: boolean) => {
    setUpdating(key);
    try {
      const { error } = await supabase
        .from("feature_flags" as any)
        .update({ enabled: !currentValue, updated_at: new Date().toISOString() })
        .eq("key", key);

      if (error) throw error;

      // Invalidate cache
      await queryClient.invalidateQueries({ queryKey: ["feature-flags"] });
      await queryClient.invalidateQueries({ queryKey: ["feature-flag", key] });

      toast.success(`Feature "${key}" ${!currentValue ? "enabled" : "disabled"}`);
    } catch (err: any) {
      toast.error(`Failed to update flag: ${err.message}`);
    } finally {
      setUpdating(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center">
        <p className="text-sm text-destructive">Failed to load feature flags</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Flag className="h-5 w-5 text-primary" />
            Feature Flags
          </h3>
          <p className="text-sm text-muted-foreground">
            Toggle features without deployments
          </p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Info className="h-4 w-4 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs max-w-xs">
                Feature flags allow you to enable or disable features in real-time 
                without deploying new code. Changes take effect within 5 minutes.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Flags List */}
      <div className="space-y-3">
        {flags?.map((flag, i) => (
          <motion.div
            key={flag.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/20 ${
              updating === flag.key ? "opacity-70" : ""
            }`}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {flag.enabled ? (
                    <ToggleRight className="h-4 w-4 text-primary flex-shrink-0" />
                  ) : (
                    <ToggleLeft className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <span className="text-sm font-medium text-foreground font-mono">
                    {flag.key}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                    flag.enabled 
                      ? "bg-primary/10 text-primary" 
                      : "bg-secondary text-muted-foreground"
                  }`}>
                    {flag.enabled ? "ON" : "OFF"}
                  </span>
                </div>
                {flag.description && (
                  <p className="text-xs text-muted-foreground mt-1 ml-6">
                    {flag.description}
                  </p>
                )}
              </div>
              
              <Switch
                checked={flag.enabled}
                onCheckedChange={() => handleToggle(flag.key, flag.enabled)}
                disabled={updating === flag.key}
                className="flex-shrink-0"
              />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {(!flags || flags.length === 0) && (
        <div className="rounded-xl border border-dashed border-border bg-secondary/20 p-12 text-center">
          <Flag className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No feature flags configured</p>
          <p className="text-xs text-muted-foreground mt-1">
            Add flags via database migration
          </p>
        </div>
      )}

      {/* Info Footer */}
      <div className="rounded-lg bg-secondary/30 px-4 py-3 flex items-center gap-2">
        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">
          Changes propagate to all users within 5 minutes (client cache)
        </span>
      </div>
    </div>
  );
};

export default AdminFeatureFlagsPanel;
