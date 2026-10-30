import { useEffect, useRef, useState } from "react";
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
  const [consentVersion, setConsentVersion] = useState(0);
  useEffect(() => { const changed = () => setConsentVersion(n => n + 1); window.addEventListener("rh:consent", changed); return () => window.removeEventListener("rh:consent", changed); }, []);
  const visitIdRef = useRef<string | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const isFirstLoadRef = useRef<boolean>(true);

  useEffect(() => {
    try { if (localStorage.getItem("rh_consent") !== "all") return; } catch { return; }
    const sessionId = getSessionId();
    visitIdRef.current = null;
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
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
        }).select("id").abortSignal(controller.signal).single() as any);
        if (data && active) {
          visitIdRef.current = data.id;
          // Try to detect country via edge function
          supabase.functions.invoke("track-visit", { body: { visit_id: data.id } }).catch(() => {});
        }
      } catch { /* silent */ } finally { clearTimeout(timer); }
    };
    trackVisit();

    // Update time_on_page and is_bounce on leave
    return () => {
      active = false; clearTimeout(timer); controller.abort();
      const timeOnPage = Date.now() - startTimeRef.current;
      if (visitIdRef.current) {
        (supabase.from("page_visits" as any).update({
          time_on_page_ms: timeOnPage,
          is_bounce: timeOnPage < 10000, // < 10s = bounce
        }).eq("id", visitIdRef.current) as any).then(() => {});
      }
    };
  }, [location.pathname, consentVersion]);
};

