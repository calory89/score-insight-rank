// Capture ?ref=CODE on first visit and stash in localStorage until sign-up.
// Then redeem (call apply-referral) once the user is authenticated.
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

const KEY = "rh_ref_code";
const REDEEMED_KEY = "rh_ref_redeemed";

export const useReferralCapture = () => {
  const location = useLocation();
  const { user } = useAuth();

  // Capture from URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ref = params.get("ref");
    if (ref && /^[A-Za-z0-9]{4,16}$/.test(ref)) {
      try { localStorage.setItem(KEY, ref.toUpperCase()); } catch {}
    }
  }, [location.search]);

  // Redeem after sign-in
  useEffect(() => {
    if (!user) return;
    let code: string | null = null;
    try { code = localStorage.getItem(KEY); } catch {}
    if (!code) return;
    const already = (() => { try { return localStorage.getItem(REDEEMED_KEY); } catch { return null; } })();
    if (already === user.id) return;

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("apply-referral", { body: { code } });
        if (!error && (data as any)?.ok) {
          toast({
            title: "🎁 Referral bonus unlocked",
            description: "You and your friend each got +5 free analyses.",
          });
        }
      } catch {}
      try {
        localStorage.removeItem(KEY);
        localStorage.setItem(REDEEMED_KEY, user.id);
      } catch {}
    })();
  }, [user]);
};
