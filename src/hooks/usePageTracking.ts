import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const getSessionId = () => {
  let sid = sessionStorage.getItem("rh_session_id");
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem("rh_session_id", sid);
  }
  return sid;
};

export const usePageTracking = () => {
  const location = useLocation();
  const visitIdRef = useRef<string | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const isFirstLoadRef = useRef<boolean>(true);

  useEffect(() => {
    const sessionId = getSessionId();
    startTimeRef.current = Date.now();

    // Meta Pixel: fire PageView on SPA route changes. Skip the very first
    // load because the base pixel in index.html already fired one.
    if (isFirstLoadRef.current) {
      isFirstLoadRef.current = false;
    } else if (typeof window !== "undefined" && window.fbq) {
      try { window.fbq("track", "PageView"); } catch { /* noop */ }
    }


    // Insert visit record
    const trackVisit = async () => {
      try {
        const { data } = await (supabase.from("page_visits" as any).insert({
          session_id: sessionId,
          path: location.pathname,
          referrer: document.referrer || null,
          user_agent: navigator.userAgent,
        }).select("id").single() as any);
        if (data) {
          visitIdRef.current = data.id;
          // Try to detect country via edge function
          supabase.functions.invoke("track-visit", { body: { visit_id: data.id } }).catch(() => {});
        }
      } catch { /* silent */ }
    };
    trackVisit();

    // Update time_on_page and is_bounce on leave
    return () => {
      const timeOnPage = Date.now() - startTimeRef.current;
      if (visitIdRef.current) {
        (supabase.from("page_visits" as any).update({
          time_on_page_ms: timeOnPage,
          is_bounce: timeOnPage < 10000, // < 10s = bounce
        }).eq("id", visitIdRef.current) as any).then(() => {});
      }
    };
  }, [location.pathname]);
};
