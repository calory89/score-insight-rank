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
        // 9-nov-2026 security: the id is made here, so nothing has to be read back (visitors can no longer read or
        // edit each other's visit rows); the time on page is written through the visit_done RPC, tied to the session
        const id = crypto.randomUUID();
        const { error } = await (supabase.from("page_visits" as any).insert({
          id,
          session_id: sessionId,
          path: location.pathname,
          referrer: document.referrer || null,
          user_agent: navigator.userAgent,
        }).abortSignal(controller.signal) as any);
        if (!error && active) {
          visitIdRef.current = id;
          // Try to detect country via edge function
          supabase.functions.invoke("track-visit", { body: { visit_id: id } }).catch(() => {});
        }
      } catch { /* silent */ } finally { clearTimeout(timer); }
    };
    trackVisit();

    // Update time_on_page and is_bounce on leave
    return () => {
      active = false; clearTimeout(timer); controller.abort();
      const timeOnPage = Date.now() - startTimeRef.current;
      if (visitIdRef.current) {
        (supabase.rpc("visit_done" as any, { p_id: visitIdRef.current, p_session: sessionId, p_ms: timeOnPage } as any) as any).then(() => {}, () => {});
      }
    };
  }, [location.pathname, consentVersion]);
};

