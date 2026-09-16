import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";

const KEY = "rh_consent";
const enableTracking = () => { try { (window as any).rhEnablePixel?.(); } catch {} };

const CookieBanner = () => {
  const [show, setShow] = useState(false);
  useEffect(() => { try { const v = localStorage.getItem(KEY); if (v === "all") enableTracking(); if (!v) setShow(true); } catch { setShow(true); } }, []);
  const set = (v: "all" | "essential") => { try { localStorage.setItem(KEY, v); } catch {} if (v === "all") enableTracking(); setShow(false); };
  if (!show) return null;
  return createPortal(
    <div className="fixed bottom-0 inset-x-0 z-[70] p-3 md:p-4">
      <div className="max-w-[720px] mx-auto bg-white border border-hairline rounded-2xl shadow-2xl p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-3">
        <p className="text-[13px] leading-relaxed text-ink-muted flex-1">We use essential cookies to keep you signed in, and, only if you agree, analytics and advertising cookies (Meta Pixel) to understand what works. <Link to="/legal/cookies" className="underline text-ink">Cookie policy</Link> · <Link to="/legal/privacy" className="underline text-ink">Privacy</Link></p>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => set("essential")} className="px-4 py-2.5 rounded-full border border-hairline text-[13px] hover:border-ink">Essential only</button>
          <button onClick={() => set("all")} className="px-4 py-2.5 rounded-full bg-ink text-paper text-[13px]">Accept all</button>
        </div>
      </div>
    </div>,
    document.body
  );
};
export default CookieBanner;
