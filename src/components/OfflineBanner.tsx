import { useState, useEffect, useRef, type ReactNode } from "react";
import { WifiOff, Wifi } from "lucide-react";

// A normally invisible connection notice must not make every page download an
// animation engine. CSS preserves its entrance/exit and reduced-motion behavior.
function StatusNotice({ active, className, children }: { active: boolean; className: string; children: ReactNode }) {
  const [mounted, setMounted] = useState(active);
  useEffect(() => {
    if (active) { setMounted(true); return; }
    const timer = window.setTimeout(() => setMounted(false), 200);
    return () => clearTimeout(timer);
  }, [active]);
  if (!active && !mounted) return null;
  return <div role="status" data-visible={active} className={`rh-connection-notice fixed top-0 inset-x-0 z-[100] text-center text-sm font-medium py-2 px-4 flex items-center justify-center gap-2 ${className}`}>{children}</div>;
}

const OfflineBanner = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    const goOffline = () => { clearTimeout(timer.current); setShowReconnected(false); setIsOffline(true); };
    const goOnline = () => {
      setIsOffline(false); setShowReconnected(true); clearTimeout(timer.current);
      timer.current = setTimeout(() => setShowReconnected(false), 3000);
    };
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => { window.removeEventListener("offline", goOffline); window.removeEventListener("online", goOnline); clearTimeout(timer.current); };
  }, []);
  return <>
    <StatusNotice active={isOffline} className="bg-destructive text-destructive-foreground"><WifiOff className="h-4 w-4" />You're offline, some features may not work</StatusNotice>
    <StatusNotice active={showReconnected && !isOffline} className="bg-primary text-primary-foreground"><Wifi className="h-4 w-4" />Back online</StatusNotice>
  </>;
};
export default OfflineBanner;
