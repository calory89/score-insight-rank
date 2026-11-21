import { track } from "@/lib/rh";
import { isEs } from "@/lib/lang";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import "./cookie-banner.css";

const KEY = "rh_consent";
const enableTracking = () => { try { (window as any).rhEnablePixel?.(); } catch {} };

// 21-nov-2026: one slim row on phones (it covered half the screen): a short sentence, a link to the policy and the
// two equal choices side by side. The Spanish text is written here, not left to the dictionary, so it is right on
// the first paint. The full detail stays on /legal/cookies.
const TXT = {
  en: { msg: "Analytics and ad cookies (Meta) only if you accept.", more: "Cookie policy", no: "Essential only", yes: "Accept all", label: "Cookie choice" },
  es: { msg: "Cookies de analítica y anuncios (Meta) solo si aceptas.", more: "Política de cookies", no: "Solo esenciales", yes: "Aceptar todas", label: "Elección de cookies" },
};

const CookieBanner = () => {
  const [show, setShow] = useState(false);
  useEffect(() => { try { const v = localStorage.getItem(KEY); if (v === "all") enableTracking(); if (!v) setShow(true); } catch { setShow(true); } }, []);
  const set = (v: "all" | "essential") => { try { localStorage.setItem(KEY, v); } catch {} if (v === "all") { enableTracking(); window.dispatchEvent(new Event("rh:consent")); track(location.pathname === "/" ? "home_view" : "page_view"); } setShow(false); window.dispatchEvent(new Event("rh:consent")); };
  if (!show) return null;
  const x = isEs() ? TXT.es : TXT.en;
  return createPortal(
    <div className="rh-cookie-banner fixed bottom-0 inset-x-0 z-[70] p-3 md:p-4" role="region" aria-label={x.label}>
      <div className="max-w-[720px] mx-auto bg-white border border-hairline rounded-2xl shadow-2xl p-3.5 md:p-5 flex flex-row items-center gap-2.5 md:gap-3">
        <p className="text-[12.5px] md:text-[13px] leading-snug md:leading-relaxed text-ink-muted flex-1">{x.msg} <Link to="/legal/cookies" className="underline text-ink">{x.more}</Link></p>
        <div className="rh-cb-btns flex gap-2 shrink-0">
          <button onClick={() => set("essential")} className="rh-cb-essential px-4 rounded-xl border border-hairline text-[14px] font-semibold hover:border-ink">{x.no}</button>
          <button onClick={() => set("all")} className="rh-cb-accept px-4 rounded-xl bg-ink text-paper text-[14px] font-semibold">{x.yes}</button>
        </div>
      </div>
    </div>,
    document.body
  );
};
export default CookieBanner;
