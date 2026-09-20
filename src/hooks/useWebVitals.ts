import { useEffect } from "react";
import { track } from "@/lib/rh";
let started = false;
export function useWebVitals() {
  useEffect(() => {
    const start = async () => {
      try { if (started || localStorage.getItem("rh_consent") !== "all") return; } catch { return; }
      started = true;
      const path = location.pathname;
      const device = innerWidth < 768 ? "mobile" : innerWidth < 1024 ? "tablet" : "desktop";
      try {
        const { onLCP, onINP, onCLS } = await import("web-vitals");
        const report = ({ name, value, rating, id }: { name: string; value: number; rating: string; id: string }) => {
          if (Number.isFinite(value)) track("web_vital", { path, meta: { name, value, rating, metric_id: id, device } });
        };
        onLCP(report, { reportAllChanges: true }); onINP(report, { reportAllChanges: true }); onCLS(report, { reportAllChanges: true });
      } catch { started = false; }
    };
    const timer = setTimeout(start, 3000);
    window.addEventListener("rh:consent", start);
    return () => { clearTimeout(timer); window.removeEventListener("rh:consent", start); };
  }, []);
}
