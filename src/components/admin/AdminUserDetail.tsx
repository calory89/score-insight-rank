import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { scoreColor } from "@/lib/score-utils";
import { Mail, Hash, Clock, Globe, Search, Eye, BarChart3, Briefcase, Trophy, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UserData {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  login_count: number;
  detected_country: string | null;
  provider: string;
  analyses_count: number;
  analyses: any[];
  plan: string;
}

interface AdminUserDetailProps {
  user: UserData | null;
  onClose: () => void;
}

const AdminUserDetail = ({ user, onClose }: AdminUserDetailProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notifTitle, setNotifTitle] = useState("");
  const [notifBody, setNotifBody] = useState("");
  const [sending, setSending] = useState(false);

  if (!user) return null;

  const sendNotification = async () => {
    if (!notifTitle.trim()) return;
    setSending(true);
    await supabase.from("notifications").insert({
      user_id: user.id,
      title: notifTitle.trim(),
      body: notifBody.trim() || null,
      type: "admin_message",
    });
    toast({ title: "Notification sent", description: `Sent to ${user.email}` });
    setNotifTitle("");
    setNotifBody("");
    setSending(false);
  };

  return (
    <Dialog open={!!user} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">{user.email}</DialogTitle>
          <DialogDescription className="text-xs">
            Joined {new Date(user.created_at).toLocaleDateString()} · {user.provider} · {user.detected_country || "Unknown country"}
          </DialogDescription>
        </DialogHeader>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: BarChart3, label: "Analyses", value: user.analyses_count },
            { icon: Hash, label: "Logins", value: user.login_count },
            { icon: Clock, label: "Last Active", value: user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : "Never" },
            { icon: Globe, label: "Country", value: user.detected_country || "—" },
          ].map((s, i) => (
            <div key={i} className="rounded-xl border border-border bg-secondary/30 p-3 text-center">
              <s.icon className="h-3.5 w-3.5 text-primary mx-auto mb-1.5" />
              <p className="text-sm font-bold font-mono text-foreground">{s.value}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Analyses */}
        {user.analyses.length > 0 ? (
          <div>
            <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1">
              <Search className="h-3 w-3 text-primary" /> Recent Analyses ({user.analyses_count})
            </h4>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {user.analyses.map((a: any) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between rounded-lg bg-card border border-border px-3 py-2 text-xs hover:border-primary/20 cursor-pointer transition-colors"
                  onClick={() => { onClose(); navigate(`/analysis/${a.id}`); }}
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-foreground font-medium truncate block">{a.address || a.url}</span>
                    <span className="text-muted-foreground">{a.city}{a.city && a.country ? ", " : ""}{a.country} · {a.price || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    <span className={`font-mono font-bold ${scoreColor(a.global_score)}`}>{a.global_score}</span>
                    <span className="text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</span>
                    <Eye className="h-3 w-3 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-4">No analyses yet.</p>
        )}

        {/* Send Notification */}
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
            <Send className="h-3.5 w-3.5 text-primary" /> Send Notification
          </h4>
          <input
            type="text"
            value={notifTitle}
            onChange={(e) => setNotifTitle(e.target.value)}
            placeholder="Notification title…"
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/30 mb-2"
          />
          <textarea
            value={notifBody}
            onChange={(e) => setNotifBody(e.target.value)}
            placeholder="Optional message body…"
            rows={2}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/30 resize-none mb-2"
          />
          <Button variant="hero" size="sm" onClick={sendNotification} disabled={sending || !notifTitle.trim()}>
            <Send className="h-3.5 w-3.5" /> {sending ? "Sending…" : "Send"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminUserDetail;
