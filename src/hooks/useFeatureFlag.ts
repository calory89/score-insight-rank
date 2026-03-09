import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface FeatureFlag {
  key: string;
  enabled: boolean;
  description: string | null;
}

/**
 * Hook to check if a feature flag is enabled
 * Uses React Query for caching with 5-minute staleTime
 */
export const useFeatureFlag = (key: string): { enabled: boolean; isLoading: boolean } => {
  const { data, isLoading } = useQuery({
    queryKey: ["feature-flag", key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feature_flags")
        .select("enabled")
        .eq("key", key)
        .single();
      
      if (error) {
        console.warn(`Feature flag "${key}" not found, defaulting to false`);
        return false;
      }
      return data?.enabled ?? false;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return { enabled: data ?? false, isLoading };
};

/**
 * Hook to fetch all feature flags (for admin panel)
 */
export const useFeatureFlags = () => {
  return useQuery({
    queryKey: ["feature-flags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feature_flags")
        .select("*")
        .order("key");
      
      if (error) throw error;
      return data as FeatureFlag[];
    },
    staleTime: 30 * 1000, // 30 seconds for admin
  });
};
