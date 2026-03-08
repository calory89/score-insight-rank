import { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Notification {
  id: string;
  title: string;
  body: string;
  timestamp: number;
  read: boolean;
}

const STORAGE_KEY = "rh_notifications";

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch { return []; }
  });

  const save = (items: Notification[]) => {
    setNotifications(items);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  };

  const push = (title: string, body: string) => {
    const n: Notification = { id: crypto.randomUUID(), title, body, timestamp: Date.now(), read: false };
    save([n, ...notifications].slice(0, 20));
  };

  const markAllRead = () => save(notifications.map(n => ({ ...n, read: true })));
  const clear = () => save([]);
  const unreadCount = notifications.filter(n => !n.read).length;

  return { notifications, push, markAllRead, clear, unreadCount };
}

export default function NotificationsBell() {
  const { notifications, markAllRead, clear, unreadCount } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = () => {
    setOpen(o => !o);
    if (!open && unreadCount > 0) markAllRead();
  };

  const timeAgo = (ts: number) => {
    const mins = Math.floor((Date.now() - ts) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={toggle} className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" title="Notifications">
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-72 rounded-xl border border-border bg-card shadow-xl z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-xs font-semibold text-foreground">Notifications</span>
              {notifications.length > 0 && (
                <button onClick={clear} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">Clear all</button>
              )}
            </div>
            <div className="max-h-64 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Bell className="h-5 w-5 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No notifications yet</p>
                </div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className={`px-4 py-3 border-b border-border/50 last:border-b-0 ${!n.read ? "bg-primary/5" : ""}`}>
                    <p className="text-xs font-medium text-foreground">{n.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{n.body}</p>
                    <p className="text-[9px] text-muted-foreground/60 mt-1">{timeAgo(n.timestamp)}</p>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
