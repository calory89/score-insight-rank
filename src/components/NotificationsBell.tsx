import { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Notification {
  id: string;
  title: string;
  body: string | null;
  type: string;
  read: boolean;
  created_at: string;
  metadata: any;
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("notifications" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      setNotifications((data as any[] || []) as Notification[]);
    };
    load();

    // Also check localStorage for legacy notifications
    try {
      const legacy = JSON.parse(localStorage.getItem("rh_notifications") || "[]");
      if (legacy.length > 0) {
        // Migrate legacy to DB
        const toInsert = legacy.map((n: any) => ({
          user_id: user.id,
          type: "system",
          title: n.title,
          body: n.body,
          read: n.read,
        }));
        supabase.from("notifications" as any).insert(toInsert as any).then(() => {
          localStorage.removeItem("rh_notifications");
          load();
        });
      }
    } catch {}
  }, [user]);

  const push = async (title: string, body: string) => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications" as any)
      .insert({ user_id: user.id, type: "system", title, body } as any)
      .select()
      .single();
    if (data) setNotifications(prev => [data as any as Notification, ...prev].slice(0, 20));
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications" as any).update({ read: true } as any).eq("user_id", user.id).eq("read", false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clear = async () => {
    if (!user) return;
    await supabase.from("notifications" as any).delete().eq("user_id", user.id);
    setNotifications([]);
  };

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

  const timeAgo = (ts: string) => {
    const mins = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
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
                    {n.body && <p className="text-[10px] text-muted-foreground mt-0.5">{n.body}</p>}
                    <p className="text-[9px] text-muted-foreground/60 mt-1">{timeAgo(n.created_at)}</p>
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
