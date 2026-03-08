import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface SubscriptionContextType {
  plan: string;
  creditsUsed: number;
  creditsTotal: number;
  isPro: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  plan: "free",
  creditsUsed: 0,
  creditsTotal: 5,
  isPro: false,
  loading: true,
  refresh: async () => {},
});

export const useSubscription = () => useContext(SubscriptionContext);

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [plan, setPlan] = useState("free");
  const [creditsUsed, setCreditsUsed] = useState(0);
  const [creditsTotal, setCreditsTotal] = useState(5);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setPlan("free");
      setCreditsUsed(0);
      setCreditsTotal(5);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("subscriptions")
      .select("plan, credits_used, credits_total")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) {
      setPlan(data.plan);
      setCreditsUsed(data.credits_used);
      setCreditsTotal(data.credits_total);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    setLoading(true);
    fetchSubscription();
  }, [fetchSubscription]);

  const isPro = plan === "pro" || plan === "super_pro" || plan === "enterprise" || user?.email === "rrppspain@gmail.com";

  return (
    <SubscriptionContext.Provider value={{ plan, creditsUsed, creditsTotal, isPro, loading, refresh: fetchSubscription }}>
      {children}
    </SubscriptionContext.Provider>
  );
};
