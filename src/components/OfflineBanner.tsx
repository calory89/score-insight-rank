import { useState, useEffect } from "react";
import { WifiOff, Wifi } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const OfflineBanner = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => {
      setIsOffline(false);
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 3000);
    };

    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ y: -48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -48, opacity: 0 }}
          className="fixed top-0 inset-x-0 z-[100] bg-destructive text-destructive-foreground text-center text-sm font-medium py-2 px-4 flex items-center justify-center gap-2"
        >
          <WifiOff className="h-4 w-4" />
          You're offline — some features may not work
        </motion.div>
      )}
      {showReconnected && !isOffline && (
        <motion.div
          initial={{ y: -48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -48, opacity: 0 }}
          className="fixed top-0 inset-x-0 z-[100] bg-primary text-primary-foreground text-center text-sm font-medium py-2 px-4 flex items-center justify-center gap-2"
        >
          <Wifi className="h-4 w-4" />
          Back online
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OfflineBanner;
